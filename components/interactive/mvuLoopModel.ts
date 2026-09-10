/**
 * The MVU animation model — pure, and a function of continuous time.
 *
 * Separated from `MvuLoop.tsx` so that reaching `mvuFrameAt` does not also pull
 * in React, `lucide-react` and `motion/react`. The component's rAF loop does
 * nothing but advance `t` and hand it here, so this is the whole animation and
 * the shell is a driver.
 *
 * `t` is seconds, unbounded: the loop is periodic, so any `t` is valid and
 * `mvuFrameAt(t)` never depends on having been called for anything before it.
 * That is what makes it addressable by frame number as well as by wall clock.
 */
export type MvuNode = 'model' | 'view' | 'update';

export interface MvuFrame {
  /** Edge the token is traversing. */
  edge: 'model->view' | 'view->update' | 'update->model';
  /** 0..1 along the current edge. */
  progress: number;
  active: MvuNode;
  /** Model state value; increments once per lap. */
  modelValue: number;
  /** The message currently in flight, shown on view->update. */
  message: string | null;
}

/** Seconds the token spends traversing one edge of the triangle. */
export const EDGE_DUR = 1.1;
/** Seconds for a full Model -> View -> Update -> Model lap. */
export const LAP = EDGE_DUR * 3;

export function mvuFrameAt(t: number): MvuFrame {
  const lap = Math.floor(t / LAP);
  const within = t - lap * LAP;
  const edgeIdx = Math.min(Math.floor(within / EDGE_DUR), 2);
  const progress = (within - edgeIdx * EDGE_DUR) / EDGE_DUR;
  const edges = ['model->view', 'view->update', 'update->model'] as const;
  const active: MvuNode[] = ['view', 'update', 'model'];
  return {
    edge: edges[edgeIdx],
    progress,
    active: active[edgeIdx],
    // The model updates as the token arrives back at Model (edge 2 done).
    modelValue: lap + (edgeIdx === 2 ? 1 : 0),
    message: edgeIdx === 1 ? 'Increment' : null,
  };
}
