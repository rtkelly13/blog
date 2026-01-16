import { execSync } from 'node:child_process';
import process from 'node:process';

function run(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_e) {
    return null;
  }
}

async function verify() {
  console.log('--- Verifying Deployment Health ---');

  // 1. Get current branch
  const branch = run('git branch --show-current');
  if (!branch) {
    console.error('❌ Could not determine current branch.');
    process.exit(1);
  }
  console.log(`Branch: \x1b[36m${branch}\x1b[0m`);

  // 2. Check Vercel Deployment via GitHub Status API
  // We check the commits status for the context "Vercel"
  console.log('Checking Vercel Status...');
  const statusJson = run(
    `gh api repos/:owner/:repo/commits/${branch}/status --jq '.statuses[] | select(.context | startswith("Vercel"))'`,
  );

  let vercelStatus = 'UNKNOWN';
  if (statusJson) {
    // It might return multiple lines if there are multiple contexts matching "Vercel"
    // We take the first one usually, or check if any are success
    if (statusJson.includes('"state":"success"')) {
      vercelStatus = 'SUCCESS';
    } else if (statusJson.includes('"state":"pending"')) {
      vercelStatus = 'PENDING';
    } else if (statusJson.includes('"state":"failure"')) {
      vercelStatus = 'FAILURE';
    }
  }

  if (vercelStatus === 'SUCCESS') {
    console.log('Vercel: \x1b[32m✅ Deployed\x1b[0m');
  } else if (vercelStatus === 'PENDING') {
    console.log('Vercel: \x1b[33m⏳ Building...\x1b[0m');
  } else if (vercelStatus === 'FAILURE') {
    console.log('Vercel: \x1b[31m❌ Failed\x1b[0m');
  } else {
    console.log('Vercel: \x1b[30m❓ Not found or unknown\x1b[0m');
  }

  // 3. Check GitHub Actions (Playwright)
  console.log('Checking CI (Playwright) Status...');
  // limit 1, for this branch, workflow playwright.yml
  const runJson = run(
    `gh run list --workflow=playwright.yml --branch "${branch}" --limit 1 --json status,conclusion,url`,
  );

  if (!runJson || runJson === '[]') {
    console.log('CI: \x1b[30m❓ No runs found for this branch\x1b[0m');
  } else {
    const lastRun = JSON.parse(runJson)[0];
    const { status, conclusion, url } = lastRun;

    if (status === 'completed' && conclusion === 'success') {
      console.log(`CI: \x1b[32m✅ Passed\x1b[0m (${url})`);
    } else if (status === 'in_progress' || status === 'queued') {
      console.log(`CI: \x1b[33m⏳ Running...\x1b[0m (${url})`);
    } else {
      console.log(`CI: \x1b[31m❌ ${conclusion || status}\x1b[0m (${url})`);
    }
  }
}

verify();
