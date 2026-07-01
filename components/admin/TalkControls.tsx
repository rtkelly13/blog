import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { api } from '@/convex/_generated/api';
import { TALK_PRESETS, type TalkConfig } from '@/convex/talkConfig';

const FEATURE_TOGGLES: { key: keyof TalkConfig; label: string }[] = [
  { key: 'presence', label: 'Live head-count' },
  { key: 'reactions', label: 'Emoji reactions' },
  { key: 'follow', label: 'Follow-the-presenter' },
  { key: 'closingChart', label: 'Closing stats chart' },
];

/**
 * Start / end a talk and choose its profile + feature toggles. Assumes it's
 * rendered inside an admin gate — the mutations are identity-gated server-side.
 */
export default function TalkControls() {
  const current = useQuery(api.talks.current);
  const start = useMutation(api.talks.start);
  const end = useMutation(api.talks.end);

  const [slug, setSlug] = useState('so-you-want-to-build-software');
  const [title, setTitle] = useState('So You Want To Build Software?');
  const [presetId, setPresetId] = useState(TALK_PRESETS[0].id);
  const [config, setConfig] = useState<TalkConfig>(TALK_PRESETS[0].config);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (id: string) => {
    setPresetId(id);
    const preset = TALK_PRESETS.find((p) => p.id === id);
    if (preset) setConfig(preset.config);
  };
  const setFlag = (key: keyof TalkConfig, value: boolean | number) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  if (current === undefined) {
    return <p className="font-mono text-zinc-400">Connecting…</p>;
  }

  // While a talk is live, hide the start form entirely — the only action is to
  // stop it.
  if (current) {
    return (
      <div className="space-y-3 font-mono">
        <p className="text-sm text-zinc-300">
          A talk is running. Starting a new one isn't available until this ends.
        </p>
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
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="talk slug"
        className="w-full border-2 border-white bg-black px-3 py-2 text-white"
      />
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
