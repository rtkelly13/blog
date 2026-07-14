import type { IdeaKind, IdeaStatus } from 'types/IdeaFrontMatter';

const STATUS_CLASSES: Record<IdeaStatus, string> = {
  spark: 'bg-zinc-800 text-white',
  developing: 'bg-brutalist-yellow text-black',
  drafting: 'bg-brutalist-cyan text-black',
  published: 'bg-white text-black',
  parked: 'bg-brutalist-pink text-black',
};

export function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  return (
    <span
      className={`font-mono text-xs font-bold uppercase px-3 py-1 border-2 border-white ${
        STATUS_CLASSES[status] ?? STATUS_CLASSES.spark
      }`}
    >
      {status}
    </span>
  );
}

export function IdeaKindBadge({ kind }: { kind: IdeaKind }) {
  return (
    <span className="font-mono text-xs font-bold uppercase px-3 py-1 border-2 border-zinc-500 text-zinc-300">
      {kind}
    </span>
  );
}
