import type { GetServerSideProps } from 'next';

/**
 * Retired: the still gallery, replaced by `/experiments/backgrounds`.
 *
 * The two pages had drifted into near-duplicates — same registry, same accent
 * picker, same seed and density controls — differing only in that this one drew
 * a single frame and the other animated. Keeping both meant every new control
 * had to be built twice, and they had already fallen out of step: this page knew
 * nothing about ramps, contrast, origin, speed, the sketch palette or the
 * element budget.
 *
 * The one thing it did better was hand you a talk's frontmatter, and that moved
 * across rather than being lost.
 *
 * A redirect rather than a deletion, because the path is in the experiments
 * index, in old notes, and quite possibly in a bookmark. Permanent, so it is
 * cached and search engines follow it.
 */
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/experiments/backgrounds', permanent: true },
});

export default function GraphicsGalleryRetired() {
  return null;
}
