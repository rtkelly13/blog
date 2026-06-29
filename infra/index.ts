import * as pulumi from '@pulumi/pulumi';
import * as vercel from '@pulumiverse/vercel';

/**
 * Pulumi program managing the blog's Vercel resources.
 *
 * Scope is intentionally small: it attaches the Convex deployment URL (and any
 * other managed vars) to the EXISTING Vercel project rather than recreating it,
 * so running this can't destroy the live project. The Convex backend (schema +
 * functions + the MODERATION_KEY secret) is managed by the Convex CLI, not here.
 *
 * Auth: set the Vercel token via `pulumi config set vercel:apiToken <tok> --secret`
 * or the VERCEL_API_TOKEN env var.
 */
const config = new pulumi.Config();

// Name of the existing Vercel project (created via the dashboard / git import).
const projectName = config.get('projectName') ?? 'blog';

// The Convex deployment URL produced by `npx convex deploy`.
const convexUrl = config.require('convexUrl');

// Look up the existing project instead of declaring (and potentially replacing) it.
const project = vercel.getProjectOutput({ name: projectName });

// Expose NEXT_PUBLIC_CONVEX_URL to all environments so previews work too.
const convexUrlEnv = new vercel.ProjectEnvironmentVariable('convex-url', {
  projectId: project.id,
  key: 'NEXT_PUBLIC_CONVEX_URL',
  value: convexUrl,
  targets: ['production', 'preview', 'development'],
});

export const vercelProjectId = project.id;
export const managedEnvVar = convexUrlEnv.key;
