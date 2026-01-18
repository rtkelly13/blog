import { useState } from 'react';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

const buttonVariations = [
  {
    name: 'Primary Cyan',
    component: (
      <button className="bg-brutalist-cyan text-black px-6 py-3 font-mono font-bold border-2 border-brutalist-cyan hover:bg-black hover:text-brutalist-cyan transition-colors active:translate-x-1 active:translate-y-1">
        CLICK_ME
      </button>
    ),
    code: `bg-brutalist-cyan text-black border-2 border-brutalist-cyan
hover:bg-black hover:text-brutalist-cyan
active:translate-x-1 active:translate-y-1`,
  },
  {
    name: 'Primary Pink',
    component: (
      <button className="bg-brutalist-pink text-black px-6 py-3 font-mono font-bold border-2 border-brutalist-pink hover:bg-black hover:text-brutalist-pink transition-colors active:translate-x-1 active:translate-y-1">
        EXECUTE
      </button>
    ),
    code: `bg-brutalist-pink text-black border-2 border-brutalist-pink
hover:bg-black hover:text-brutalist-pink`,
  },
  {
    name: 'Primary Yellow',
    component: (
      <button className="bg-brutalist-yellow text-black px-6 py-3 font-mono font-bold border-2 border-brutalist-yellow hover:bg-black hover:text-brutalist-yellow transition-colors active:translate-x-1 active:translate-y-1">
        SUBMIT
      </button>
    ),
    code: `bg-brutalist-yellow text-black border-2 border-brutalist-yellow
hover:bg-black hover:text-brutalist-yellow`,
  },
  {
    name: 'Outline White',
    component: (
      <button className="bg-black text-white px-6 py-3 font-mono font-bold border-2 border-white hover:bg-white hover:text-black transition-colors active:translate-x-1 active:translate-y-1">
        OUTLINE
      </button>
    ),
    code: `bg-black text-white border-2 border-white
hover:bg-white hover:text-black`,
  },
  {
    name: 'Shadow Cyan',
    component: (
      <button className="bg-black text-brutalist-cyan px-6 py-3 font-mono font-bold border-2 border-brutalist-cyan shadow-[4px_4px_0px_0px_rgba(34,211,238,1)] hover:shadow-[8px_8px_0px_0px_rgba(34,211,238,1)] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(34,211,238,1)] transition-all">
        SHADOW_BTN
      </button>
    ),
    code: `shadow-[4px_4px_0px_0px_rgba(34,211,238,1)]
hover:shadow-[8px_8px_0px_0px_rgba(34,211,238,1)]
active:shadow-[2px_2px_0px_0px_rgba(34,211,238,1)]`,
  },
  {
    name: 'Shadow Pink',
    component: (
      <button className="bg-black text-brutalist-pink px-6 py-3 font-mono font-bold border-2 border-brutalist-pink shadow-[4px_4px_0px_0px_rgba(236,72,153,1)] hover:shadow-[8px_8px_0px_0px_rgba(236,72,153,1)] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(236,72,153,1)] transition-all">
        SHADOW_PINK
      </button>
    ),
    code: `shadow-[4px_4px_0px_0px_rgba(236,72,153,1)]
hover:shadow-[8px_8px_0px_0px_rgba(236,72,153,1)]`,
  },
  {
    name: 'Small',
    component: (
      <button className="bg-brutalist-cyan text-black px-3 py-1 font-mono text-sm font-bold border border-brutalist-cyan hover:bg-black hover:text-brutalist-cyan transition-colors">
        SMALL_BTN
      </button>
    ),
    code: `px-3 py-1 text-sm border (instead of border-2)`,
  },
  {
    name: 'Large',
    component: (
      <button className="bg-brutalist-pink text-black px-8 py-4 font-mono text-lg font-bold border-2 border-brutalist-pink hover:bg-black hover:text-brutalist-pink transition-colors active:translate-x-1 active:translate-y-1">
        LARGE_BUTTON
      </button>
    ),
    code: `px-8 py-4 text-lg border-2`,
  },
  {
    name: 'Icon Left',
    component: (
      <button className="bg-black text-white px-6 py-3 font-mono font-bold border-2 border-white hover:bg-white hover:text-black transition-colors active:translate-x-1 active:translate-y-1 flex items-center gap-2">
        <span>→</span> NEXT_PAGE
      </button>
    ),
    code: `flex items-center gap-2`,
  },
  {
    name: 'Icon Right',
    component: (
      <button className="bg-brutalist-cyan text-black px-6 py-3 font-mono font-bold border-2 border-brutalist-cyan hover:bg-black hover:text-brutalist-cyan transition-colors active:translate-x-1 active:translate-y-1 flex items-center gap-2">
        DOWNLOAD <span>↓</span>
      </button>
    ),
    code: `flex items-center gap-2`,
  },
  {
    name: 'Full Width',
    component: (
      <button className="w-full bg-black text-brutalist-yellow px-6 py-3 font-mono font-bold border-2 border-brutalist-yellow hover:bg-brutalist-yellow hover:text-black transition-colors active:translate-x-1 active:translate-y-1">
        FULL_WIDTH_BUTTON
      </button>
    ),
    code: `w-full`,
  },
  {
    name: 'Disabled',
    component: (
      <button
        disabled
        className="bg-zinc-800 text-zinc-600 px-6 py-3 font-mono font-bold border-2 border-zinc-700 cursor-not-allowed opacity-50"
      >
        DISABLED
      </button>
    ),
    code: `disabled bg-zinc-800 text-zinc-600 border-zinc-700
cursor-not-allowed opacity-50`,
  },
];

export default function Buttons() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <>
      <PageSEO
        title={`Button Variations - ${siteMetadata.author}`}
        description="Button component variations and styles"
      />
      <div className="divide-y divide-white">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <Link
            href="/design-sandbox"
            className="text-brutalist-cyan hover:text-brutalist-pink font-mono text-sm mb-4 inline-block"
          >
            {'<'} BACK_TO_SANDBOX
          </Link>
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-white sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 font-mono uppercase border-2 border-white inline-block px-4 py-2">
            [ BUTTON_VARIATIONS ]
          </h1>
          <p className="text-lg leading-7 text-zinc-400 font-mono">
            {'>'} All button styles with code examples
          </p>
        </div>

        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {buttonVariations.map((variant, index) => (
              <div
                key={variant.name}
                className="bg-zinc-900 border-2 border-white p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-mono font-bold text-lg text-white uppercase">
                    {String(index + 1).padStart(2, '0')}. {variant.name}
                  </h3>
                  <button
                    onClick={() => copyCode(variant.code, index)}
                    className="bg-black text-brutalist-cyan px-3 py-1 font-mono text-xs border border-brutalist-cyan hover:bg-brutalist-cyan hover:text-black transition-colors"
                  >
                    {copiedIndex === index ? '✓ COPIED' : 'COPY'}
                  </button>
                </div>

                <div className="bg-black border border-white p-6 mb-4 flex items-center justify-center min-h-[100px]">
                  {variant.component}
                </div>

                <div className="bg-black border border-zinc-700 p-3">
                  <pre className="font-mono text-xs text-zinc-400 whitespace-pre-wrap">
                    {variant.code}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 border-2 border-brutalist-yellow bg-zinc-900 p-6">
            <h2 className="font-mono font-bold text-xl text-brutalist-yellow mb-4 uppercase">
              [ USAGE_NOTES ]
            </h2>
            <ul className="text-white font-mono text-sm space-y-2">
              <li>{'>'} All buttons use `font-mono` and `font-bold`</li>
              <li>{'>'} Standard padding: `px-6 py-3`</li>
              <li>
                {'>'} Active state: `active:translate-x-1 active:translate-y-1`
              </li>
              <li>{'>'} Always use `transition-colors` or `transition-all`</li>
              <li>
                {'>'} Border width: `border-2` for emphasis, `border` for subtle
              </li>
              <li className="text-brutalist-cyan">
                {'>'} Hard shadows create brutalist aesthetic
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
