import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

function run(command, ignoreError = false) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    if (!ignoreError) {
      console.error(`Error running command: ${command}`);
      console.error(e.stderr || e.message);
      process.exit(1);
    }
    return null;
  }
}

async function updateSnapshots() {
  console.log('\x1b[36m--- Automated Visual Snapshot Updater ---\x1b[0m');

  // 1. Get Branch
  const branch = run('git branch --show-current');
  console.log(`Branch: ${branch}`);

  // 2. Trigger Workflow
  console.log('Triggering "playwright.yml" with update_snapshots=true...');
  run(
    `gh workflow run playwright.yml --ref "${branch}" -f update_snapshots=true`,
  );

  // 3. Find the run ID
  console.log('Waiting for run to start...');
  let runId = null;
  let attempts = 0;

  // Poll for the new run. We look for a run created in the last minute that is either queued or in_progress.
  while (!runId && attempts < 10) {
    await new Promise((r) => setTimeout(r, 2000));
    const json = run(
      `gh run list --workflow=playwright.yml --branch "${branch}" --limit 1 --json databaseId,status,createdAt,event`,
    );
    if (json && json !== '[]') {
      const latest = JSON.parse(json)[0];
      // Check if it's recent (sanity check) or just assume the top one is the one we triggered
      // Since we just triggered it, it should be top.
      if (latest.event === 'workflow_dispatch') {
        runId = latest.databaseId;
      }
    }
    attempts++;
  }

  if (!runId) {
    console.error('❌ Could not find the triggered workflow run.');
    process.exit(1);
  }

  console.log(`Tracking Run ID: ${runId}`);
  console.log('Waiting for completion (this may take a few minutes)...');

  // 4. Poll for completion
  let status = 'queued';
  let conclusion = '';

  while (status !== 'completed') {
    await new Promise((r) => setTimeout(r, 5000));
    const json = run(`gh run view ${runId} --json status,conclusion`);
    const data = JSON.parse(json);
    status = data.status;
    conclusion = data.conclusion;
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  if (conclusion !== 'success') {
    console.error(`❌ Workflow failed with conclusion: ${conclusion}`);
    console.error(`View logs: gh run view ${runId} --log-failed`);
    process.exit(1);
  }

  console.log('✅ Workflow finished successfully.');

  // 5. Download Artifacts
  console.log('Downloading snapshots...');
  const tempDir = path.join(root, '.temp_snapshots');
  if (fs.existsSync(tempDir))
    fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir);

  try {
    run(`gh run download ${runId} -n playwright-snapshots -D "${tempDir}"`);
  } catch (_e) {
    console.error(
      '❌ Failed to download artifacts. Did the run generate them?',
    );
    process.exit(1);
  }

  // 6. Move files
  // The artifact usually contains the folder structure.
  // playwright-snapshots/tests/__snapshots__/visual.spec.ts/

  // We need to copy from tempDir to tests/__snapshots__
  // Let's explore the tempDir structure
  // It usually unzips directly.

  console.log('Applying snapshots to local project...');

  // We use cp -r to merge.
  // Assuming the artifact structure mimics the repo structure or just contains the snapshot files.
  // Based on workflow: path: tests/__snapshots__/
  // So it might dump the CONTENTS of tests/__snapshots__/ into tempDir.

  const targetDir = path.join(root, 'tests', '__snapshots__');

  // Copy everything from tempDir to targetDir
  // recursive copy
  fs.cpSync(tempDir, targetDir, { recursive: true, force: true });

  console.log('✅ Snapshots updated locally.');

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log(
    '\x1b[32mDone! Review changes with "git diff" and commit.\x1b[0m',
  );
}

updateSnapshots();
