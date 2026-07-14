import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { api } from '@/convex/_generated/api';
import { TALK_PRESETS, type TalkConfig } from '@/convex/talkConfig';
import { useRunAction } from './useRunAction';

const FEATURE_TOGGLES: { key: keyof TalkConfig; label: string }[] = [
  { key: 'presence', label: 'Live head-count' },
  { key: 'reactions', label: 'Emoji reactions' },
  { key: 'follow', label: 'Follow-the-presenter' },
  { key: 'closingChart', label: 'Closing stats chart' },
  { key: 'qa', label: 'Q&A queue' },
  { key: 'poll', label: 'Poll / word cloud' },
  { key: 'activities', label: 'Ordering activities' },
];

/**
 * Start / end a talk and choose its profile + feature toggles. Assumes it's
 * rendered inside an admin gate — the mutations are identity-gated server-side.
 * `talkOptions` (real deck slugs from frontmatter) drives a picker so the
 * Session can only target a deck that exists — a typo'd slug silently makes a
 * room the deck never drives. Free-text only as a fallback when no options
 * were baked in.
 */
export default function TalkControls({
  talkOptions,
}: {
  talkOptions?: { slug: string; title: string }[];
}) {
  const current = useQuery(api.talks.current);
  const start = useMutation(api.talks.start);
  const end = useMutation(api.talks.end);
  const updateConfig = useMutation(api.talks.updateConfig);

  const options = talkOptions ?? [];
  const [slug, setSlug] = useState(
    options[0]?.slug ?? 'so-you-want-to-build-software',
  );
  const [title, setTitle] = useState(
    options[0]?.title ?? 'So You Want To Build Software?',
  );
  const [presetId, setPresetId] = useState(TALK_PRESETS[0].id);
  const [config, setConfig] = useState<TalkConfig>(TALK_PRESETS[0].config);
  const { run, error } = useRunAction();

  const pickTalk = (nextSlug: string) => {
    setSlug(nextSlug);
    const picked = options.find((o) => o.slug === nextSlug);
    // Title follows the picked deck but stays editable (it's the Session's
    // display name, e.g. "… — dry run").
    if (picked) setTitle(picked.title);
  };

  const applyPreset = (id: string) => {
    setPresetId(id);
    const preset = TALK_PRESETS.find((p) => p.id === id);
    if (preset) setConfig(preset.config);
  };
  const setFlag = (key: keyof TalkConfig, value: boolean | number) =>
    setConfig((c) => ({ ...c, [key]: value }));

  if (current === undefined) {
    return <p className="font-mono text-zinc-400">Connecting…</p>;
  }

  // While a talk is live, hide the start form — but keep the feature toggles
  // available so flags (e.g. reactions) can be flipped mid-talk without ending
  // the session. Toggles write through talks.updateConfig; every audience
  // mutation re-checks the config server-side, so flips apply immediately.
  if (current) {
    const liveConfig = current.config;
    const setLiveFlag = (key: keyof TalkConfig, value: boolean) =>
      run(() =>
        updateConfig({
          room: current.room,
          config: { ...liveConfig, [key]: value },
        }),
      );
    return (
      <div className="space-y-3 font-mono">
        <p className="text-sm text-zinc-300">
          A talk is running. Starting a new one isn't available until this ends.
        </p>
        <fieldset className="border-2 border-zinc-700 p-3">
          <legend className="px-1 text-xs uppercase text-zinc-400">
            Live features (apply instantly)
          </legend>
          <div className="space-y-2">
            {FEATURE_TOGGLES.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm text-white"
              >
                <input
                  type="checkbox"
                  checked={liveConfig[key] as boolean}
                  onChange={(e) => setLiveFlag(key, e.target.checked)}
                  className="h-4 w-4 accent-brutalist-cyan"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={() => run(() => end({}))}
          className="border-2 border-white bg-brutalist-pink px-5 py-2 font-bold uppercase text-black shadow-hard-md"
        >
          End talk
        </button>
        {error && <p className="text-sm text-brutalist-pink">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono">
      {options.length > 0 ? (
        <label className="block text-xs uppercase text-zinc-400">
          Talk
          <select
            value={slug}
            onChange={(e) => pickTalk(e.target.value)}
            className="mt-1 w-full border-2 border-white bg-black px-3 py-2 text-white"
          >
            {options.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.title} ({o.slug})
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="talk slug"
          className="w-full border-2 border-white bg-black px-3 py-2 text-white"
        />
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="talk title"
        className="w-full border-2 border-white bg-black px-3 py-2 text-white"
      />

      <label className="block text-xs uppercase text-zinc-400">
        Profile
        <select
          value={presetId}
          onChange={(e) => applyPreset(e.target.value)}
          className="mt-1 w-full border-2 border-white bg-black px-3 py-2 text-white"
        >
          {TALK_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="border-2 border-zinc-700 p-3">
        <legend className="px-1 text-xs uppercase text-zinc-400">
          Features
        </legend>
        <div className="space-y-2">
          {FEATURE_TOGGLES.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 text-sm text-white"
            >
              <input
                type="checkbox"
                checked={config[key] as boolean}
                onChange={(e) => setFlag(key, e.target.checked)}
                className="h-4 w-4 accent-brutalist-cyan"
              />
              {label}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            Chart reveals at
            <input
              type="number"
              min={0}
              value={config.chartThreshold}
              onChange={(e) =>
                setFlag('chartThreshold', Number(e.target.value) || 0)
              }
              className="w-16 border-2 border-white bg-black px-2 py-1 text-white"
              disabled={!config.closingChart}
            />
            reactions
          </label>
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => run(() => start({ slug, title, config }))}
        className="border-2 border-white bg-brutalist-cyan px-5 py-2 font-bold uppercase text-black shadow-hard-md"
      >
        Start talk
      </button>

      {error && <p className="text-sm text-brutalist-pink">{error}</p>}
    </div>
  );
}
