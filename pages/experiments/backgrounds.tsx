import type { GetServerSideProps } from 'next';

/**
 * Retired: the backgrounds lab, now `/gallery/backgrounds`.
 *
 * `/experiments` is a workbench — things there are allowed to be half-built and
 * allowed to be deleted. This one had stopped being either: forty-one
 * generators behind a tested contract, a rendering budget and a legibility
 * standard is not an experiment, and a stable URL people can link a tuned
 * configuration to is the opposite of what an experiment promises.
 *
 * So it moved to a gallery, and split in two on the way: a contact sheet at
 * `/gallery/backgrounds`, and a page per generator with room for the controls.
 * The query-string contract in `lib/graphicsUrl.ts` is unchanged, so links and
 * the visual-regression fixtures keep working — they just resolve one level
 * deeper.
 *
 * A redirect rather than a deletion, because this path is in the experiments
 * index, in `docs/talks-graphics.md`, in the visual suite, and by now in at
 * least one preview deployment someone may have bookmarked.
 */
export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const qs = new URLSearchParams(
    Object.entries(query).flatMap(([k, v]) =>
      v === undefined
        ? []
        : [[k, Array.isArray(v) ? v[0] : v] as [string, string]],
    ),
  ).toString();
  // A single generator resolves to its own page; anything else to the gallery.
  const only = typeof query.only === 'string' ? query.only.split(',') : [];
  const base =
    only.length === 1
      ? `/gallery/backgrounds/${only[0]}`
      : '/gallery/backgrounds';
  return {
    redirect: { destination: qs ? `${base}?${qs}` : base, permanent: true },
  };
};

export default function BackgroundsLabRetired() {
  return null;
}
