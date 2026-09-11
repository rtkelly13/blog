import type { LicenceTier } from './packs';
import { PACKS } from './packs';

const TIERS: {
  id: LicenceTier;
  title: string;
  cost: string;
  accent: string;
  border: string;
  detail: string;
}[] = [
  {
    id: 'clear',
    title: 'CLEAR',
    cost: 'nothing propagates',
    accent: 'text-brutalist-cyan',
    border: 'border-brutalist-cyan',
    detail:
      'A public-domain dedication. No notice to keep, no credit to display, nothing that reaches the people who install the package. The only remaining question is trademark, which copyright never covered anyway.',
  },
  {
    id: 'notice',
    title: 'NOTICE',
    cost: 'keep the licence with the copy',
    accent: 'text-white',
    border: 'border-white',
    detail:
      'MIT, ISC and Apache-2.0 all ask that the licence text travels with the code. As an npm dependency that is automatic — the licence sits in node_modules and nobody has to do anything. Copy the paths into a .tsx file instead and the obligation becomes yours to honour by hand.',
  },
  {
    id: 'attribution',
    title: 'ATTRIBUTION',
    cost: 'visible credit, forever, downstream',
    accent: 'text-brutalist-pink',
    border: 'border-brutalist-pink',
    detail:
      'CC BY 4.0 wants credit in a form end users can see, plus a licence link and a note of any changes. Re-export that from a published design system and every consumer inherits the duty. Fine for a site you control; wrong for a package other people install.',
  },
  {
    id: 'bespoke',
    title: 'BESPOKE',
    cost: 'read it before you ship it',
    accent: 'text-brutalist-yellow',
    border: 'border-brutalist-yellow',
    detail:
      'A licence written by the icon vendor rather than drawn from the standard set. It may well permit exactly what you want — but the reader has to establish that, and reviewers of your package have to establish it again.',
  },
];

const RULES = [
  {
    rule: 'Depend, never vendor',
    body: 'An npm dependency carries its own licence file and version-tracks the art. A hand-copied path carries neither, and nothing tells you when upstream changed.',
  },
  {
    rule: 'If art must be vendored, declare it inline',
    body: 'Pack, licence and upstream URL in a comment beside the path, plus a THIRD-PARTY-NOTICES entry. Cheap to write once, impossible to reconstruct later.',
  },
  {
    rule: 'The design system re-exports only CLEAR or NOTICE',
    body: 'CC0, MIT and ISC. Anything the package hands to a consumer must not hand them an obligation with it.',
  },
  {
    rule: 'Brand marks are a trademark question, not a copyright one',
    body: 'CC0 waives Simple Icons’ copyright; it grants nothing over the marks themselves. Use them to link to the entity they identify, never restyled as your own identity.',
  },
  {
    rule: 'Never mix a free tier with its paid tier',
    body: 'Pixelarticons ships 816 icons under MIT and the rest under a commercial licence. Two licences, one npm name — keep the boundary explicit at the import site.',
  },
];

/**
 * The licence view of the same field: packs grouped by what the licence
 * actually costs a package that gets published to npm, rather than by
 * whether the licence is "open".
 */
export default function LicenceLedger() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {TIERS.map((tier) => {
          const packs = PACKS.filter((p) => p.tier === tier.id);
          return (
            <div
              key={tier.id}
              className={`border-2 ${tier.border} bg-zinc-900`}
            >
              <div
                className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 ${tier.border} px-4 py-2`}
              >
                <span
                  className={`font-display text-lg font-bold uppercase ${tier.accent}`}
                >
                  [ {tier.title} ]
                </span>
                <span className="font-mono text-[11px] uppercase text-zinc-400">
                  {tier.cost}
                </span>
              </div>

              <div className="space-y-3 p-4">
                <p className="max-w-3xl font-mono text-xs leading-relaxed text-zinc-400">
                  {tier.detail}
                </p>
                <div className="flex flex-wrap gap-2">
                  {packs.map((pack) => (
                    <span
                      key={pack.id}
                      className={`border-2 ${tier.border} px-2 py-1 font-mono text-[11px] ${tier.accent}`}
                    >
                      {pack.name}
                      <span className="ml-2 text-zinc-400">{pack.licence}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-2 border-brutalist-yellow bg-zinc-900 p-5">
        <h3 className="mb-4 font-display text-xl font-bold uppercase text-brutalist-yellow">
          [ LICENCE_RULES ]
        </h3>
        <ol className="space-y-3">
          {RULES.map((r, i) => (
            <li key={r.rule} className="flex gap-3">
              <span className="font-mono text-xs text-brutalist-yellow tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="space-y-1">
                <span className="block font-mono text-sm font-bold text-white">
                  {r.rule}
                </span>
                <span className="block max-w-3xl font-mono text-xs leading-relaxed text-zinc-400">
                  {r.body}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="overflow-x-auto border-2 border-white">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead>
            <tr className="bg-zinc-900">
              <th className="border-b-2 border-white px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                Pack
              </th>
              <th className="border-b-2 border-white px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                Licence
              </th>
              <th className="border-b-2 border-white px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                What it asks of a published package
              </th>
            </tr>
          </thead>
          <tbody>
            {PACKS.map((pack) => (
              <tr key={pack.id} className="align-top">
                <td className="border-b border-zinc-700 px-3 py-2 font-display text-sm font-bold whitespace-nowrap text-white">
                  {pack.name}
                </td>
                <td className="border-b border-zinc-700 px-3 py-2 font-mono text-xs whitespace-nowrap text-brutalist-cyan">
                  {pack.licence}
                </td>
                <td className="border-b border-zinc-700 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-400">
                  {pack.obligation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
