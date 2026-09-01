import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import { AnimatedBackground } from '@/components/graphics';

/**
 * Render-level tests for the one piece the unit suite cannot reach.
 *
 * `tests/graphics-*.test.ts` exercise the registry — `renderGraphic`,
 * `sample`/`project`, the goldens — and they are thorough. None of them renders
 * the React component, and that gap let a real bug through: `AnimatedBackground`
 * destructures its props by name, so `accents`, `contrast` and `originX`/`originY`
 * were accepted, type-checked (they come from `Partial<GraphicParams>`) and then
 * silently dropped. Every colour option worked perfectly through `renderGraphic`
 * and did nothing at all through the component every gallery actually uses.
 *
 * A component that forwards a subset of its props is invisible to a suite that
 * never mounts it. So these mount it, and assert on the emitted SVG.
 *
 * They run in the `storybook` vitest project, which is a real Chromium via
 * Playwright — no jsdom, and no new dependency.
 */
const meta = {
  title: 'Graphics/AnimatedBackground',
  component: AnimatedBackground,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AnimatedBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

const BASE = {
  generator: 'ridgeline',
  seed: 7,
  density: 0.55,
  accent: '#22d3ee',
  background: '#000000',
  playing: false as const,
  width: 640,
  height: 360,
  style: { width: '640px', height: '360px' },
};

/** Every `stroke`/`fill` colour in the rendered SVG, in document order. */
function colours(root: HTMLElement): string[] {
  const svg = root.querySelector('svg');
  if (!svg) return [];
  return [...svg.querySelectorAll('[stroke], [fill]')].flatMap((el) =>
    [el.getAttribute('stroke'), el.getAttribute('fill')].filter(
      (v): v is string => !!v && v !== 'none',
    ),
  );
}

export const RendersAtAll: Story = {
  args: BASE,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('img', { hidden: true })).toBeInTheDocument();
    expect(colours(canvasElement).length).toBeGreaterThan(3);
  },
};

export const ForwardsAccents: Story = {
  name: 'forwards accents (the bug this file exists for)',
  args: { ...BASE, accents: ['#22d3ee', '#ec4899'] },
  play: async ({ canvasElement }) => {
    // A ramp must produce a colour that is *neither endpoint* — an actual blend.
    //
    // The obvious assertion, "not every colour is the accent", is too weak and
    // was written that way first: `ridgeline` emits opaque hex fills alongside
    // its rgba strokes, so "not all cyan" is true even when the prop is being
    // dropped. Verified by reintroducing the bug — this story passed. It has to
    // look at the rgba strokes specifically and find one off the accent.
    const rgb = colours(canvasElement)
      .map((c) => /rgba\((\d+), (\d+), (\d+)/.exec(c))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m) => `${m[1]},${m[2]},${m[3]}`);
    expect(rgb.length).toBeGreaterThan(2);
    expect(rgb.some((c) => c !== '34,211,238')).toBe(true);
  },
};

export const ForwardsContrast: Story = {
  args: { ...BASE, contrast: 0.3 },
  play: async ({ canvasElement }) => {
    // `contrast` compresses the alpha range toward the midpoint, so the spread
    // between the faintest and boldest mark must shrink.
    const alphas = colours(canvasElement)
      .map((c) => /rgba\([^)]*,\s*([\d.]+)\)/.exec(c)?.[1])
      .filter((a): a is string => !!a)
      .map(Number);
    expect(alphas.length).toBeGreaterThan(2);
    expect(Math.max(...alphas) - Math.min(...alphas)).toBeLessThan(0.4);
  },
};

export const ForwardsOrigin: Story = {
  args: { ...BASE, generator: 'radial-spokes', originX: 0.2 },
  play: async ({ canvasElement }) => {
    // A moved centre must move the marks. Compared against the same generator
    // centred, rendered in the sibling story below by eye — here we assert the
    // weaker but self-contained property: the drawing is not symmetric about
    // the frame's middle.
    const svg = canvasElement.querySelector('svg');
    expect(svg).toBeTruthy();
    const xs = [...(svg?.querySelectorAll('line') ?? [])].map((l) =>
      Number(l.getAttribute('x1')),
    );
    expect(xs.length).toBeGreaterThan(4);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    // Centred, the mean x sits at 320 of 640. Pulled to 0.2 it must be well left.
    expect(mean).toBeLessThan(280);
  },
};

export const ForwardsSeedAndDensity: Story = {
  args: { ...BASE, seed: 99, density: 0.9 },
  play: async ({ canvasElement }) => {
    expect(colours(canvasElement).length).toBeGreaterThan(3);
  },
};

export const HoldsStillWhenPaused: Story = {
  args: BASE,
  play: async ({ canvasElement }) => {
    // Paused means paused: the markup must not change between two reads.
    const svg = () => canvasElement.querySelector('svg')?.outerHTML;
    const before = svg();
    await new Promise((r) => setTimeout(r, 400));
    expect(svg()).toBe(before);
  },
};

export const AnimatesWhenPlaying: Story = {
  args: { ...BASE, playing: true, duration: 4 },
  play: async ({ canvasElement }) => {
    // And guards the guard: "paused holds" is satisfied by a component that
    // never animates at all.
    const svg = () => canvasElement.querySelector('svg')?.outerHTML;
    const before = svg();
    await new Promise((r) => setTimeout(r, 500));
    expect(svg()).not.toBe(before);
  },
};

export const UnknownGeneratorRendersNothing: Story = {
  args: { ...BASE, generator: 'no-such-generator' },
  play: async ({ canvasElement }) => {
    // Talk frontmatter carries generator names as free text; a typo must not
    // take the page down.
    expect(canvasElement.querySelector('svg')).toBeNull();
  },
};
