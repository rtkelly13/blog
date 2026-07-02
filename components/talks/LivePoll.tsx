import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { api } from '@/convex/_generated/api';
import { getMachineId } from '@/lib/machineId';
import { useDeckMode } from './DeckModeContext';
import { ResolvedRoom } from './ResolvedRoom';

const CLOUD_COLORS = [
  'text-brutalist-cyan',
  'text-brutalist-yellow',
  'text-brutalist-pink',
  'text-white',
];

/** Scale a word's font size between 1 and 3rem by its share of the top count. */
function sizeFor(count: number, max: number): string {
  const ratio = max > 0 ? count / max : 0;
  return `${(1 + ratio * 2).toFixed(2)}rem`;
}

function Poll({
  room,
  display,
  title,
  info,
  prompt,
}: {
  room: string;
  display?: boolean;
  title?: string;
  info?: string;
  prompt?: string;
}) {
  const mode = useDeckMode();
  const poll = useQuery(api.polls.active, { room });
  const submit = useMutation(api.polls.submit);
  const start = useMutation(api.polls.start);
  const isAdmin = useQuery(api.talks.isAdmin) === true;
  const [word, setWord] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  // No open poll yet. An admin on a slide that declares a prompt can start it in
  // one click (the poll question lives with the slide).
  if (!poll) {
    if (!isAdmin || !prompt) return null;
    return (
      <div className="border-2 border-dashed border-brutalist-pink bg-zinc-900 p-5">
        <p className="mb-1 font-mono text-sm uppercase text-brutalist-pink">
          ● {title ?? 'Live poll'}
        </p>
        <p className="mb-3 font-mono text-sm text-zinc-300">{prompt}</p>
        <button
          type="button"
          onClick={() => start({ room, prompt }).catch(() => {})}
          className="border-2 border-white bg-brutalist-pink px-5 py-2 font-mono font-bold uppercase text-black shadow-hard-md"
        >
          ▶ Start poll
        </button>
      </div>
    );
  }

  // Only the interactive audience surface gets the input; projected/console
  // decks and any `display` embed show the cloud only.
  const showForm = !display && mode === 'attendee';
  const max = Math.max(1, ...poll.words.map((w) => w.count));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = word.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await submit({
        pollId: poll._id,
        word: trimmed,
        machineId: getMachineId(),
      });
      setWord('');
      setDone(true);
    } catch {
      // One answer per person: an "already answered" (or transient) failure
      // still lands us in the submitted state so we stop offering the form.
      setDone(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-2 border-white bg-zinc-900 p-5">
      <p className="mb-1 font-mono text-sm uppercase text-brutalist-pink">
        ● {title ?? 'Live poll'}
      </p>
      <h3 className="mb-1 font-display text-2xl font-bold uppercase text-white">
        {poll.prompt}
      </h3>
      {info && <p className="mb-4 font-mono text-xs text-zinc-500">{info}</p>}
      {!info && <div className="mb-3" />}

      {/* On the projected deck (display) we show the cloud only — no dead input
          box on a big screen. Students still submit from /live. One answer per
          person, so once submitted we confirm instead of re-offering the form. */}
      {showForm &&
        (done ? (
          <p className="border-2 border-brutalist-pink bg-black p-3 font-mono text-sm text-brutalist-pink">
            ✓ Your answer's in — watch the cloud below.
          </p>
        ) : (
          <form onSubmit={send} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              maxLength={32}
              placeholder="One word…"
              className="min-w-0 flex-1 border-2 border-white bg-black px-3 py-3 font-mono text-base text-white placeholder:text-zinc-600 focus:border-brutalist-pink focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !word.trim()}
              className="border-2 border-white bg-brutalist-pink px-5 py-3 font-mono font-bold uppercase text-black shadow-hard-md disabled:opacity-40"
            >
              Send
            </button>
          </form>
        ))}

      <div className="mt-5 flex min-h-[4rem] flex-wrap items-center gap-x-4 gap-y-1">
        {poll.words.length === 0 ? (
          <p className="font-mono text-sm text-zinc-500">
            Answers appear here as they come in…
          </p>
        ) : (
          poll.words.map((w, i) => (
            <span
              key={w.word}
              className={`font-display font-bold uppercase leading-tight ${
                CLOUD_COLORS[i % CLOUD_COLORS.length]
              }`}
              style={{ fontSize: sizeFor(w.count, max) }}
              title={`${w.count}`}
            >
              {w.word}
            </span>
          ))
        )}
      </div>

      <div className="mt-4 font-mono text-xs text-zinc-500">
        <span>{poll.total} answers</span>
      </div>
    </div>
  );
}

/**
 * Embedded live poll / word cloud. The presenter opens a prompt from the console;
 * the audience submits single words that grow in the cloud by frequency. Renders
 * nothing when no poll is open. Resolves the live room automatically or takes one.
 * `display` (projected deck) shows the cloud only, hiding the submission form.
 */
export default function LivePoll({
  room,
  display,
  title,
  info,
  prompt,
}: {
  room?: string;
  display?: boolean;
  title?: string;
  info?: string;
  /** Slide-declared question — an admin can start the poll in one click. */
  prompt?: string;
}) {
  return (
    <ResolvedRoom room={room}>
      {(r) => (
        <Poll
          room={r}
          display={display}
          title={title}
          info={info}
          prompt={prompt}
        />
      )}
    </ResolvedRoom>
  );
}
