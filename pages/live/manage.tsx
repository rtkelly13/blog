import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { PageSEO } from '@/components/SEO';
import { api } from '@/convex/_generated/api';
import { TALK_PRESETS, type TalkConfig } from '@/convex/talkConfig';
import siteMetadata from '@/data/siteMetadata';
import { isConvexConfigured } from '@/lib/convexClient';

const FEATURE_TOGGLES: { key: keyof TalkConfig; label: string }[] = [
  { key: 'presence', label: 'Live head-count' },
  { key: 'reactions', label: 'Emoji reactions' },
  { key: 'follow', label: 'Follow-the-presenter' },
  { key: 'closingChart', label: 'Closing stats chart' },
];

function SignIn() {
  const { signIn } = useAuthActions();
  return (
    <div className="border-2 border-white bg-zinc-900 p-6 font-mono">
      <p className="text-sm text-zinc-300">
        Presenter controls are restricted. Sign in with the allowed GitHub
        account to start and drive a talk.
      </p>
      <button
        type="button"
        onClick={() => void signIn('github')}
        className="mt-4 border-2 border-white bg-brutalist-cyan px-5 py-2 font-bold uppercase text-black shadow-hard-md"
      >
        Sign in with GitHub
      </button>
    </div>
  );
}

function NotAllowed() {
  const { signOut } = useAuthActions();
  return (
    <div className="border-2 border-brutalist-pink bg-zinc-900 p-6 font-mono">
      <p className="text-sm text-brutalist-pink">
        Signed in, but this GitHub account isn't on the admin allowlist.
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-4 border-2 border-white bg-black px-4 py-2 text-sm font-bold uppercase text-white"
      >
        Sign out
      </button>
    </div>
  );
}

function Manage() {
  const current = useQuery(api.talks.current);
  const start = useMutation(api.talks.start);
  const end = useMutation(api.talks.end);
  const { signOut } = useAuthActions();

  const [slug, setSlug] = useState('so-you-want-to-build-software');
  const [title, setTitle] = useState('So You Want To Build Software?');
  const [presetId, setPresetId] = useState(TALK_PRESETS[0].id);
  const [config, setConfig] = useState<TalkConfig>(TALK_PRESETS[0].config);
  const [error, setError] = useState<string | null>(null);

  // Picking a preset seeds the toggles; the presenter can then override any of
  // them before starting.
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

  return (
    <div className="border-2 border-white bg-zinc-900 p-6 font-mono">
      <div className="flex items-center justify-between">
        <p className="text-sm uppercase text-brutalist-cyan">
          {current ? `● Live: ${current.title}` : 'Nothing live'}
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-xs uppercase text-zinc-400 underline"
        >
          Sign out
        </button>
      </div>

      <div className="mt-4 space-y-3">
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

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => run(() => start({ slug, title, config }))}
            className="border-2 border-white bg-brutalist-cyan px-5 py-2 font-bold uppercase text-black shadow-hard-md"
          >
            Start talk
          </button>
          <button
            type="button"
            disabled={!current}
            onClick={() => run(() => end({}))}
            className="border-2 border-white bg-brutalist-pink px-5 py-2 font-bold uppercase text-black shadow-hard-md disabled:opacity-50"
          >
            End talk
          </button>
        </div>

        <a
          href={`/talks/${current?.slug ?? slug}/present`}
          target="_blank"
          rel="noreferrer"
          className="block border-2 border-white bg-brutalist-yellow px-5 py-2 text-center font-bold uppercase text-black shadow-hard-md"
        >
          Present deck → (flip Broadcast there to drive follow)
        </a>
      </div>

      {error && <p className="mt-4 text-sm text-brutalist-pink">{error}</p>}
    </div>
  );
}

function Gate() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const isAdmin = useQuery(api.talks.isAdmin);

  if (isLoading) {
    return <p className="font-mono text-zinc-400">Connecting…</p>;
  }
  if (!isAuthenticated) return <SignIn />;
  if (isAdmin === undefined) {
    return <p className="font-mono text-zinc-400">Checking access…</p>;
  }
  if (!isAdmin) return <NotAllowed />;
  return <Manage />;
}

export default function LiveManagePage() {
  return (
    <>
      <PageSEO title={`Manage live - ${siteMetadata.author}`} description="" />
      <article className="mx-auto max-w-2xl py-10">
        <h1 className="mb-6 font-display text-3xl font-bold uppercase text-white">
          [ Presenter ]
        </h1>
        {isConvexConfigured ? (
          <Gate />
        ) : (
          <p className="font-mono text-brutalist-pink">
            Convex not configured.
          </p>
        )}
      </article>
    </>
  );
}
