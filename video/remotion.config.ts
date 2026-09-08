import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

/**
 * Remotion downloads its own Chrome Headless Shell on first render, pinned to a
 * build it chooses. Environments with an egress allowlist block that, and CI
 * images often already carry a headless shell — so allow one to be supplied.
 *
 * Deliberately an env var rather than a committed path: the binary lives
 * somewhere different in every image, and hardcoding one makes the project
 * un-runnable everywhere else. Unset, Remotion downloads as normal.
 *
 * Note this is NOT the browser the design system's Playwright baselines render
 * in. Two Chromium builds under `maxDiffPixels: 0` diverge (design-system
 * AGENTS.md §9), so a video frame is a strong indication a scene renders as
 * expected, never a guarantee it matches a baseline byte for byte.
 */
const browser = process.env.REMOTION_BROWSER_EXECUTABLE;
if (browser) Config.setBrowserExecutable(browser);
