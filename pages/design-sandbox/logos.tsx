import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

const logos = [
  {
    id: 1,
    name: 'Block Letters',
    art: `
██████╗ ██╗  ██╗
██╔══██╗██║ ██╔╝
██████╔╝█████╔╝ 
██╔══██╗██╔═██╗ 
██║  ██║██║  ██╗
╚═╝  ╚═╝╚═╝  ╚═╝
    `,
  },
  {
    id: 2,
    name: 'Circuit Board',
    art: `
╔═══╗─╔╗╔═══╗
║╔═╗║─║║║╔═╗║
║╚═╝║╔╝╚╝║─║║
║╔╗╔╝╚╗╔╗║─║║
║║║╚╗─║║║╚═╝║
╚╝╚═╝─╚╝╚═══╝
    `,
  },
  {
    id: 3,
    name: 'Terminal UI',
    art: `
┌─────────────┐
│ RYAN_KELLY │
│   ▄▄▄▄▄▄▄  │
│   █ R_K █  │
│   ▀▀▀▀▀▀▀  │
└─────────────┘
    `,
  },
  {
    id: 4,
    name: 'ASCII Art - Standard',
    art: `
 ____  _  __
|  _ \\| |/ /
| |_) | ' / 
|  _ <| . \\ 
|_| \\_\\_|\\_\\
    `,
  },
  {
    id: 5,
    name: 'Pixelated',
    art: `
▓▓▓▓▓▓▓ ▓▓  ▓▓
▓▓   ▓▓ ▓▓ ▓▓ 
▓▓▓▓▓▓  ▓▓▓▓  
▓▓  ▓▓  ▓▓ ▓▓ 
▓▓   ▓▓ ▓▓  ▓▓
    `,
  },
  {
    id: 6,
    name: 'Neon Sign',
    art: `
╦═╗╦ ╦╔═╗╔╗╔
╠╦╝╚╦╝╠═╣║║║
╩╚═ ╩ ╩ ╩╝╚╝
╦╔═╔═╗╦  ╦  ╦ ╦
╠╩╗║╣ ║  ║  ╚╦╝
╩ ╩╚═╝╩═╝╩═╝ ╩ 
    `,
  },
  {
    id: 7,
    name: 'Double Strike',
    art: `
ℝ 𝕐 𝔸 ℕ
𝕂 𝔼 𝕃 𝕃 𝕐
────────────
[RYAN_KELLY]
    `,
  },
  {
    id: 8,
    name: 'Morse Code',
    art: `
·-·  -·--  ·-  -·
-·-  ·  ·-··  ·-··  -·--
━━━━━━━━━━━━━━━━━━━
R_K
    `,
  },
  {
    id: 9,
    name: 'Matrix Style',
    art: `
█▀█ ▀▄▀ ▄▀█ █▄░█
█▀▄ █░█ █▀█ █░▀█
█▄▀ █▀▀ █░░ █░░ █▄█
█░█ ██▄ █▄▄ █▄▄ ░█░
    `,
  },
  {
    id: 10,
    name: 'Minimalist',
    art: `
╭───────────╮
│   R . K   │
│     •     │
│  ENGINEER │
╰───────────╯
    `,
  },
];

export default function Logos() {
  return (
    <>
      <PageSEO
        title={`Logo Variations - ${siteMetadata.author}`}
        description="10 ASCII art variations of RYAN KELLY branding"
      />
      <div className="divide-y divide-white">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-white sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 font-mono uppercase border-2 border-white inline-block px-4 py-2">
            [ LOGO_VARIATIONS ]
          </h1>
          <p className="text-lg leading-7 text-zinc-400 font-mono">
            {'>'} 10 ASCII art variations of the RYAN KELLY brand
          </p>
        </div>
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {logos.map((logo) => (
              <div
                key={logo.id}
                className="bg-zinc-900 border-2 border-white p-6 hover:border-brutalist-cyan transition-all shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:shadow-[12px_12px_0px_0px_rgba(34,211,238,1)] active:translate-x-1 active:translate-y-1"
              >
                <div className="border-b-2 border-dashed border-white/20 pb-2 mb-4">
                  <h3 className="font-mono font-bold text-lg text-white">
                    {`0${logo.id}`.slice(-2)}. {logo.name.toUpperCase()}
                  </h3>
                </div>
                <pre className="text-brutalist-cyan font-mono text-xs sm:text-sm overflow-x-auto whitespace-pre">
                  {logo.art}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
