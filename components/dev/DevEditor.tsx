import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Local-authoring slide-over: edit a post's raw MDX in place and see the
 * rendered result refresh on save (dev re-runs getStaticProps per request).
 * Mount it gated on `process.env.NODE_ENV === 'development'` so production
 * bundles tree-shake it entirely; the backing API route 404s outside dev.
 */
export default function DevEditor({
  type = 'blog',
  slug,
}: {
  type?: 'blog' | 'ideas';
  slug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('');
  const [savedSource, setSavedSource] = useState('');
  const [file, setFile] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dirty = source !== savedSource;

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/dev/post-source?type=${type}&slug=${encodeURIComponent(slug)}`,
    );
    if (!res.ok) {
      setStatus('error');
      return;
    }
    const data = await res.json();
    setSource(data.source);
    setSavedSource(data.source);
    setFile(data.file);
    setStatus('idle');
  }, [type, slug]);

  const save = useCallback(async () => {
    setStatus('saving');
    const res = await fetch(
      `/api/dev/post-source?type=${type}&slug=${encodeURIComponent(slug)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      },
    );
    if (!res.ok) {
      setStatus('error');
      return;
    }
    setSavedSource(source);
    setStatus('idle');
    // Dev re-runs getStaticProps on request, so a shallow replace re-renders
    // the page with the freshly written file.
    router.replace(router.asPath, undefined, { scroll: false });
  }, [type, slug, source, router]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, save]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full border border-gray-400 bg-white px-4 py-2 font-mono text-sm shadow-lg hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
        title="Edit this post's MDX source (dev only)"
      >
        ✎ edit
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-gray-300 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-3 border-b border-gray-300 px-4 py-2 dark:border-gray-700">
        <span className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
          {file || `${type}/${slug}`}
        </span>
        <span className="ml-auto font-mono text-xs">
          {status === 'saving' && 'saving…'}
          {status === 'error' && (
            <span className="text-red-600 dark:text-red-400">error</span>
          )}
          {status === 'idle' && dirty && (
            <span className="text-amber-600 dark:text-amber-400">
              unsaved changes
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || status === 'saving'}
          className="rounded border border-gray-400 px-3 py-1 font-mono text-xs hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          save ⌘S
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-gray-400 px-3 py-1 font-mono text-xs hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          title="Close (Esc)"
        >
          ✕
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-gray-900 outline-none dark:text-gray-100"
      />
    </div>
  );
}
