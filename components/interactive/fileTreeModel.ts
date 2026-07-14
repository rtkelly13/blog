/**
 * Pure model behind the <FileTree> component: the ~/code layout of a virtual
 * monorepo and the rules for how each node renders given (a) whether the
 * `projects` symlink has been wired and (b) whose view we're showing — git's
 * (body ignored) or the agent's (body traversable). No React; unit-tested in
 * tests/file-tree-model.test.ts.
 */

export type Trust = 'brain' | 'trusted' | 'untrusted';
export type NodeKind = 'dir' | 'repo' | 'file' | 'symlink';
export type View = 'git' | 'agent';

export interface TreeNode {
  id: string;
  label: string;
  depth: number;
  kind: NodeKind;
  trust?: Trust;
  /** Short trailing annotation (e.g. a trust tag or comment). */
  note?: string;
  /** This node exists only once the `projects` symlink is wired. */
  linkedOnly?: boolean;
  /** This node is the body mirrored under `projects/` (view rules apply). */
  body?: boolean;
}

/**
 * The declarative tree. `company/` is the real body (its own git repos);
 * `workspace/` is the brain, whose `projects` symlink mirrors the body in once
 * wired. Names are abstracted to match the article (`../company`).
 */
export const WORKSPACE_TREE: TreeNode[] = [
  { id: 'root', label: '~/code/', depth: 0, kind: 'dir' },

  {
    id: 'company',
    label: 'company/',
    depth: 1,
    kind: 'dir',
    trust: 'trusted',
    note: 'BODY · work repos (trusted)',
  },
  {
    id: 'company/backend',
    label: 'backend-service/',
    depth: 2,
    kind: 'repo',
    trust: 'trusted',
  },
  {
    id: 'company/web',
    label: 'web-frontend/',
    depth: 2,
    kind: 'repo',
    trust: 'trusted',
  },
  {
    id: 'company/data',
    label: 'data-pipelines/',
    depth: 2,
    kind: 'repo',
    trust: 'trusted',
  },

  {
    id: 'personal',
    label: 'personal/',
    depth: 1,
    kind: 'dir',
    trust: 'trusted',
    note: 'your own repos (trusted)',
  },
  {
    id: 'external',
    label: 'external/',
    depth: 1,
    kind: 'dir',
    trust: 'untrusted',
    note: 'third-party · UNTRUSTED',
  },

  {
    id: 'workspace',
    label: 'workspace/',
    depth: 1,
    kind: 'dir',
    trust: 'brain',
    note: 'BRAIN · config + docs + tooling',
  },
  {
    id: 'workspace/agents',
    label: 'AGENTS.md',
    depth: 2,
    kind: 'file',
    trust: 'brain',
  },
  {
    id: 'workspace/src',
    label: 'src/  docs/  mcp/',
    depth: 2,
    kind: 'file',
    trust: 'brain',
  },
  {
    id: 'workspace/projects',
    label: 'projects  →  ../company',
    depth: 2,
    kind: 'symlink',
    trust: 'brain',
  },
  // Body mirrored in through the symlink — present only once wired.
  {
    id: 'workspace/projects/backend',
    label: 'backend-service/',
    depth: 3,
    kind: 'repo',
    trust: 'trusted',
    linkedOnly: true,
    body: true,
  },
  {
    id: 'workspace/projects/web',
    label: 'web-frontend/',
    depth: 3,
    kind: 'repo',
    trust: 'trusted',
    linkedOnly: true,
    body: true,
  },
  {
    id: 'workspace/projects/data',
    label: 'data-pipelines/',
    depth: 3,
    kind: 'repo',
    trust: 'trusted',
    linkedOnly: true,
    body: true,
  },
];

export interface RenderNode extends TreeNode {
  /** Rendered at all this frame. */
  visible: boolean;
  /** Dimmed (present but de-emphasised) — e.g. body under git's view. */
  dimmed: boolean;
  /** Emphasised (accent) — e.g. body under the agent's view. */
  lit: boolean;
  /** View-specific tag shown after the symlink row. */
  tag?: string;
}

export interface FileTreeState {
  /** The `projects → ../company` symlink has been created. */
  linked: boolean;
  view: View;
}

/**
 * Project the tree to render state for a given (linked, view). Pure: same
 * inputs → same output, so animation frames and reduced-motion final states
 * are consistent.
 *
 * - Before wiring, the `linkedOnly` body mirror is hidden.
 * - The symlink row gains a view tag once wired: git ignores it, the agent
 *   is explicitly allowed through it.
 * - Body-mirror nodes are dimmed under git's view and lit under the agent's.
 */
export function fileTreeRows(state: FileTreeState): RenderNode[] {
  const { linked, view } = state;
  return WORKSPACE_TREE.filter((n) => linked || !n.linkedOnly).map((n) => {
    let tag: string | undefined;
    if (n.kind === 'symlink' && linked) {
      tag =
        view === 'git' ? 'ignored by git' : '!projects/ — agent may traverse';
    }
    const bodyLit = Boolean(n.body) && linked && view === 'agent';
    const bodyDim = Boolean(n.body) && linked && view === 'git';
    return {
      ...n,
      visible: true,
      dimmed: bodyDim,
      lit: bodyLit,
      tag,
    };
  });
}

/** The ignore-file line that matters for the current view — the "opposite
 * views of the same path" punchline shown beside the tree. */
export function ignoreRule(view: View): {
  file: string;
  rule: string;
  sense: 'block' | 'allow';
} {
  return view === 'git'
    ? { file: '.gitignore', rule: 'projects/', sense: 'block' }
    : { file: '.agentignore', rule: '!projects/', sense: 'allow' };
}
