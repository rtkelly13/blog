import { describe, expect, it } from 'vitest';
import {
  fileTreeRows,
  ignoreRule,
  WORKSPACE_TREE,
} from '../components/interactive/fileTreeModel';

describe('fileTreeRows — linking', () => {
  it('hides the body mirror before the symlink is wired', () => {
    const rows = fileTreeRows({ linked: false, view: 'git' });
    expect(rows.some((r) => r.body)).toBe(false);
    // the symlink row itself is still shown (it's the dangling link)
    expect(rows.some((r) => r.kind === 'symlink')).toBe(true);
  });

  it('reveals the body mirror once wired', () => {
    const rows = fileTreeRows({ linked: true, view: 'git' });
    const body = rows.filter((r) => r.body);
    expect(body).toHaveLength(3);
    expect(body.map((r) => r.label)).toEqual([
      'backend-service/',
      'web-frontend/',
      'data-pipelines/',
    ]);
  });

  it('does not tag the symlink until it is wired', () => {
    const before = fileTreeRows({ linked: false, view: 'git' }).find(
      (r) => r.kind === 'symlink',
    );
    expect(before?.tag).toBeUndefined();
  });
});

describe('fileTreeRows — opposite views of one path', () => {
  it("git's view dims the body and ignores the symlink", () => {
    const rows = fileTreeRows({ linked: true, view: 'git' });
    expect(rows.filter((r) => r.body).every((r) => r.dimmed && !r.lit)).toBe(
      true,
    );
    const link = rows.find((r) => r.kind === 'symlink');
    expect(link?.tag).toBe('ignored by git');
  });

  it("the agent's view lights the body and admits the symlink", () => {
    const rows = fileTreeRows({ linked: true, view: 'agent' });
    expect(rows.filter((r) => r.body).every((r) => r.lit && !r.dimmed)).toBe(
      true,
    );
    const link = rows.find((r) => r.kind === 'symlink');
    expect(link?.tag).toBe('!projects/ — agent may traverse');
  });

  it('is a pure projection — same inputs, same rows', () => {
    const a = fileTreeRows({ linked: true, view: 'agent' });
    const b = fileTreeRows({ linked: true, view: 'agent' });
    expect(a).toEqual(b);
  });
});

describe('trust tiers', () => {
  it('marks external as the only untrusted root', () => {
    const untrusted = WORKSPACE_TREE.filter((n) => n.trust === 'untrusted');
    expect(untrusted.map((n) => n.id)).toEqual(['external']);
  });

  it('marks the workspace root as the brain', () => {
    expect(WORKSPACE_TREE.find((n) => n.id === 'workspace')?.trust).toBe(
      'brain',
    );
  });
});

describe('ignoreRule', () => {
  it('blocks under git, allows under agent', () => {
    expect(ignoreRule('git')).toMatchObject({
      file: '.gitignore',
      rule: 'projects/',
      sense: 'block',
    });
    expect(ignoreRule('agent')).toMatchObject({
      rule: '!projects/',
      sense: 'allow',
    });
  });
});
