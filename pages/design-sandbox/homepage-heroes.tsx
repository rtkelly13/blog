import { useEffect, useState } from 'react';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

const heroTextVariations = [
  {
    name: 'RYAN KELLY',
    subtitle: 'FULL_STACK_ENGINEER.exe',
  },
  {
    name: 'R.K.',
    subtitle: 'BUILDING_SYSTEMS.sh',
  },
  {
    name: 'RYAN_KELLY',
    subtitle: 'CODE_CRAFT_DEPLOY',
  },
  {
    name: 'RK',
    subtitle: 'SOFTWARE_ENGINEER',
  },
  {
    name: 'RYAN.K',
    subtitle: 'CLOUD_ARCHITECT.js',
  },
];

const fontOptions = [
  { name: 'Mono', class: 'font-mono' },
  { name: 'Sans', class: 'font-sans' },
  { name: 'Serif', class: 'font-serif' },
  { name: 'System', class: 'font-sans tracking-tight' },
  { name: 'Wide Sans', class: 'font-sans tracking-widest' },
  { name: 'Condensed', class: 'font-sans tracking-tighter' },
];

const sizeOptions = [
  { name: 'Small', class: 'text-2xl md:text-4xl' },
  { name: 'Medium', class: 'text-3xl md:text-5xl' },
  { name: 'Large', class: 'text-4xl md:text-6xl' },
  { name: 'XL', class: 'text-5xl md:text-7xl' },
];

const Hero80sWaves = ({ textVariation = 0 }) => {
  const [_scrollY, setScrollY] = useState(0);
  const [time, setTime] = useState(0);
  const currentText = heroTextVariations[textVariation];

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTime((t) => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  const getWaveOffset = (waveIndex: number) =>
    Math.sin((time + waveIndex * 20) / 10) * 10;
  const getSunY = () => Math.sin(time / 20) * 5;

  return (
    <div className="relative w-full h-[60vh] overflow-hidden bg-gradient-to-b from-[#1a0033] via-[#330066] to-[#000033]">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #ff00ff 0px, transparent 1px, transparent 2px, #ff00ff 3px)',
          backgroundSize: '4px 4px',
        }}
      />

      <div
        className="absolute top-[15%] left-1/2 -translate-x-1/2 transition-transform duration-100"
        style={{ transform: `translate(-50%, ${getSunY()}px)` }}
      >
        <div className="relative">
          <div className="absolute inset-0 blur-2xl opacity-60">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ff6b35] via-[#ffaa00] to-[#ff1493]" />
          </div>
          <pre className="font-mono text-[8px] leading-none text-[#ffaa00] relative z-10">
            {`  ═══════  
 ═════════ 
═══════════
═══════════
 ═════════ 
  ═══════  `}
          </pre>
        </div>
      </div>

      <div className="absolute bottom-0 w-full">
        {[...Array(6)].map((_, i) => {
          const colors = ['#00ffff', '#ff00ff', '#ffff00'];
          const color = colors[i % colors.length];
          return (
            <div
              key={`wave-line-${i}`}
              className="absolute w-full h-[3px] transition-all duration-100"
              style={{
                bottom: `${i * 20 + getWaveOffset(i)}px`,
                opacity: 0.4 + i * 0.1,
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                boxShadow: `0 0 8px ${color}`,
              }}
            />
          );
        })}
      </div>

      <div
        className="absolute top-1/2 left-0 right-0 text-center z-10 -translate-y-1/2"
        style={{ textShadow: '0 0 20px #ff00ff, 0 0 40px #00ffff' }}
      >
        <h1 className="text-3xl md:text-5xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#00ffff] via-[#ff00ff] to-[#ffff00] mb-3">
          {currentText.name}
        </h1>
        <p
          className="text-lg md:text-xl font-mono text-[#00ffff]"
          style={{ textShadow: '0 0 10px #00ffff' }}
        >
          {'>'} {currentText.subtitle}
        </p>
      </div>
    </div>
  );
};

const Hero80sCompact = ({ textVariation = 0 }) => {
  const [time, setTime] = useState(0);
  const currentText = heroTextVariations[textVariation];

  useEffect(() => {
    const interval = setInterval(() => setTime((t) => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  const getWaveOffset = (waveIndex: number) =>
    Math.sin((time + waveIndex * 20) / 10) * 10;
  const getSunY = () => Math.sin(time / 20) * 3;

  return (
    <div className="relative w-full h-[60vh] overflow-hidden bg-gradient-to-b from-[#1a0033] via-[#1a0033] to-[#000033]">
      <div
        className="absolute top-[20%] left-1/2 -translate-x-1/2 transition-transform duration-100"
        style={{ transform: `translate(-50%, ${getSunY()}px)` }}
      >
        <div className="relative">
          <div className="absolute inset-0 blur-xl opacity-70">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ff6b35] via-[#ffaa00] to-[#ff1493]" />
          </div>
          <pre className="font-mono text-[6px] leading-none text-[#ffaa00] relative z-10">
            {` ═══════ 
 ═══════ 
═════════
═════════
 ═══════ 
 ═══════ `}
          </pre>
        </div>
      </div>

      <div className="absolute bottom-0 w-full">
        {[...Array(4)].map((_, i) => {
          const colors = ['#00ffff', '#ff00ff'];
          const color = colors[i % colors.length];
          return (
            <div
              key={`compact-line-${i}`}
              className="absolute w-full h-[3px] transition-all duration-100"
              style={{
                bottom: `${40 + i * 25 + getWaveOffset(i)}px`,
                opacity: 0.5 + i * 0.15,
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                boxShadow: `0 0 10px ${color}`,
              }}
            />
          );
        })}
      </div>

      <div
        className="absolute top-1/2 left-0 right-0 text-center z-10 -translate-y-1/2"
        style={{ textShadow: '0 0 20px #ff00ff, 0 0 40px #00ffff' }}
      >
        <h1 className="text-4xl md:text-6xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#00ffff] via-[#ff00ff] to-[#ffff00] mb-3">
          {currentText.name}
        </h1>
        <p
          className="text-lg md:text-xl font-mono text-[#00ffff]"
          style={{ textShadow: '0 0 10px #00ffff' }}
        >
          {'>'} {currentText.subtitle}
        </p>
      </div>
    </div>
  );
};

const Hero80sSunset = ({
  textVariation = 0,
  fontOption = 1,
  sizeOption = 0,
}) => {
  const [time, setTime] = useState(0);
  const currentText = heroTextVariations[textVariation];
  const currentFont = fontOptions[fontOption];
  const currentSize = sizeOptions[sizeOption];

  useEffect(() => {
    const interval = setInterval(() => setTime((t) => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  const getWaveOffset = (waveIndex: number) =>
    Math.sin((time + waveIndex * 20) / 10) * 10;

  return (
    <div className="relative w-full h-[60vh] overflow-hidden bg-gradient-to-b from-[#ff1493] via-[#ff6b35] to-[#1a0033]">
      <div className="absolute top-[25%] left-1/2 -translate-x-1/2">
        <div className="relative">
          <div className="absolute inset-0 blur-2xl opacity-80">
            <div className="w-32 h-32 rounded-full bg-[#ffaa00]" />
          </div>
          <div className="w-24 h-24 rounded-full bg-[#ff6b35] border-4 border-[#ffaa00] relative z-10" />
        </div>
      </div>

      <div className="absolute bottom-0 w-full">
        {[...Array(5)].map((_, i) => {
          const colors = ['#ffaa00', '#ff6b35', '#ff1493'];
          const color = colors[i % colors.length];
          return (
            <div
              key={`sunset-line-${i}`}
              className="absolute w-full h-[4px] transition-all duration-100"
              style={{
                bottom: `${30 + i * 30 + getWaveOffset(i)}px`,
                opacity: 0.6 + i * 0.08,
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                boxShadow: `0 0 12px ${color}`,
              }}
            />
          );
        })}
      </div>

      <div
        className="absolute top-[55%] left-0 right-0 text-center z-10"
        style={{ textShadow: '0 0 20px #000, 0 0 40px #ff1493' }}
      >
        <h1
          className={`${currentSize.class} font-bold ${currentFont.class} text-white mb-3 tracking-wider`}
        >
          {currentText.name}
        </h1>
        <p
          className="text-lg md:text-xl font-mono text-[#ffaa00]"
          style={{ textShadow: '0 0 10px #ff6b35' }}
        >
          {'>'} {currentText.subtitle}
        </p>
      </div>
    </div>
  );
};

const Hero80sMinimal = ({ textVariation = 0 }) => {
  const [time, setTime] = useState(0);
  const currentText = heroTextVariations[textVariation];

  useEffect(() => {
    const interval = setInterval(() => setTime((t) => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  const getWaveOffset = (waveIndex: number) =>
    Math.sin((time + waveIndex * 20) / 10) * 8;

  return (
    <div className="relative w-full h-[60vh] overflow-hidden bg-black">
      <div className="absolute top-[18%] left-1/2 -translate-x-1/2">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00ffff] to-[#ff00ff] border-2 border-white" />
      </div>

      <div className="absolute bottom-0 w-full">
        {[...Array(3)].map((_, i) => {
          const colors = ['#00ffff', '#ff00ff', '#ffff00'];
          const color = colors[i];
          return (
            <div
              key={`minimal-line-${i}`}
              className="absolute w-full h-[2px] transition-all duration-100"
              style={{
                bottom: `${50 + i * 40 + getWaveOffset(i)}px`,
                opacity: 0.8,
                background: color,
                boxShadow: `0 0 8px ${color}`,
              }}
            />
          );
        })}
      </div>

      <div
        className="absolute top-1/2 left-0 right-0 text-center z-10 -translate-y-1/2"
        style={{ textShadow: '0 0 20px #00ffff' }}
      >
        <h1 className="text-5xl md:text-7xl font-bold font-mono text-white mb-4 tracking-widest">
          {currentText.name}
        </h1>
        <p className="text-xl md:text-2xl font-mono text-[#00ffff]">
          {'>'} {currentText.subtitle}
        </p>
      </div>
    </div>
  );
};

export default function HomepageHeroes() {
  const [currentVariation, setCurrentVariation] = useState(0);
  const [currentFont, setCurrentFont] = useState(1);
  const [currentSize, setCurrentSize] = useState(0);

  const nextVariation = () => {
    setCurrentVariation((prev) => (prev + 1) % heroTextVariations.length);
  };

  const prevVariation = () => {
    setCurrentVariation(
      (prev) =>
        (prev - 1 + heroTextVariations.length) % heroTextVariations.length,
    );
  };

  const nextFont = () => {
    setCurrentFont((prev) => (prev + 1) % fontOptions.length);
  };

  const nextSize = () => {
    setCurrentSize((prev) => (prev + 1) % sizeOptions.length);
  };

  return (
    <>
      <PageSEO
        title={`Homepage Heroes - ${siteMetadata.author}`}
        description="Synth wave hero sections for homepage landing pages"
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
            [ HOMEPAGE_HEROES ]
          </h1>
          <p className="text-lg leading-7 text-zinc-400 font-mono">
            {'>'} Synth wave aesthetic for landing pages
          </p>
        </div>

        <div className="py-12 space-y-16">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-mono font-bold text-2xl text-white mb-2 uppercase">
                  01. 80S_RETRO_WAVES
                </h2>
                <p className="text-zinc-400 font-mono text-sm">
                  Cool neon palette, 6 grid lines, ASCII sun
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={prevVariation}
                  className="bg-black text-white border-2 border-white px-4 py-2 font-mono hover:bg-brutalist-cyan hover:text-black hover:border-brutalist-cyan transition-colors"
                >
                  {'<'}
                </button>
                <button
                  onClick={nextVariation}
                  className="bg-black text-white border-2 border-white px-4 py-2 font-mono hover:bg-brutalist-cyan hover:text-black hover:border-brutalist-cyan transition-colors"
                >
                  {'>'}
                </button>
              </div>
            </div>
            <div className="border-2 border-brutalist-cyan">
              <Hero80sWaves textVariation={currentVariation} />
            </div>
            <div className="mt-4 bg-zinc-900 border-2 border-white p-4">
              <p className="text-brutalist-yellow font-mono text-sm mb-2">
                [ TEXT_VARIATION_{currentVariation + 1}_OF_
                {heroTextVariations.length} ]
              </p>
              <p className="text-white font-mono text-lg">
                {heroTextVariations[currentVariation].name}
              </p>
              <p className="text-zinc-400 font-mono text-sm">
                {heroTextVariations[currentVariation].subtitle}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-mono font-bold text-2xl text-white mb-2 uppercase">
                  02. 80S_COMPACT
                </h2>
                <p className="text-zinc-400 font-mono text-sm">
                  Fewer grid lines (4), higher placement, smaller sun
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={prevVariation}
                  className="bg-black text-white border-2 border-white px-4 py-2 font-mono hover:bg-brutalist-cyan hover:text-black hover:border-brutalist-cyan transition-colors"
                >
                  {'<'}
                </button>
                <button
                  onClick={nextVariation}
                  className="bg-black text-white border-2 border-white px-4 py-2 font-mono hover:bg-brutalist-cyan hover:text-black hover:border-brutalist-cyan transition-colors"
                >
                  {'>'}
                </button>
              </div>
            </div>
            <div className="border-2 border-brutalist-pink">
              <Hero80sCompact textVariation={currentVariation} />
            </div>
          </div>

          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <div>
                <h2 className="font-mono font-bold text-2xl text-white mb-2 uppercase">
                  03. 80S_SUNSET (PRODUCTION)
                </h2>
                <p className="text-zinc-400 font-mono text-sm">
                  Warm gradient, solid sun disc, 5 sunset lines
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={prevVariation}
                  className="bg-black text-white border-2 border-white px-4 py-2 font-mono hover:bg-brutalist-cyan hover:text-black transition-colors"
                >
                  {'< TEXT'}
                </button>
                <button
                  onClick={nextVariation}
                  className="bg-black text-white border-2 border-white px-4 py-2 font-mono hover:bg-brutalist-cyan hover:text-black transition-colors"
                >
                  {'TEXT >'}
                </button>
                <button
                  onClick={nextFont}
                  className="bg-black text-brutalist-pink border-2 border-brutalist-pink px-4 py-2 font-mono hover:bg-brutalist-pink hover:text-black transition-colors"
                >
                  FONT: {fontOptions[currentFont].name}
                </button>
                <button
                  onClick={nextSize}
                  className="bg-black text-brutalist-yellow border-2 border-brutalist-yellow px-4 py-2 font-mono hover:bg-brutalist-yellow hover:text-black transition-colors"
                >
                  SIZE: {sizeOptions[currentSize].name}
                </button>
              </div>
            </div>
            <div className="border-2 border-brutalist-yellow">
              <Hero80sSunset
                textVariation={currentVariation}
                fontOption={currentFont}
                sizeOption={currentSize}
              />
            </div>
            <div className="mt-4 bg-zinc-900 border-2 border-white p-4 grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-brutalist-yellow font-mono text-sm mb-1">
                  TEXT
                </p>
                <p className="text-white font-mono text-base">
                  {heroTextVariations[currentVariation].name}
                </p>
                <p className="text-zinc-400 font-mono text-xs">
                  {heroTextVariations[currentVariation].subtitle}
                </p>
              </div>
              <div>
                <p className="text-brutalist-pink font-mono text-sm mb-1">
                  FONT
                </p>
                <p className="text-white font-mono text-base">
                  {fontOptions[currentFont].name}
                </p>
                <p className="text-zinc-400 font-mono text-xs">
                  {fontOptions[currentFont].class}
                </p>
              </div>
              <div>
                <p className="text-brutalist-cyan font-mono text-sm mb-1">
                  SIZE
                </p>
                <p className="text-white font-mono text-base">
                  {sizeOptions[currentSize].name}
                </p>
                <p className="text-zinc-400 font-mono text-xs">
                  {sizeOptions[currentSize].class}
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-mono font-bold text-2xl text-white mb-2 uppercase">
                  04. 80S_MINIMAL
                </h2>
                <p className="text-zinc-400 font-mono text-sm">
                  Ultra clean with 3 lines, simple gradient sun, larger text
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={prevVariation}
                  className="bg-black text-white border-2 border-white px-4 py-2 font-mono hover:bg-brutalist-cyan hover:text-black hover:border-brutalist-cyan transition-colors"
                >
                  {'<'}
                </button>
                <button
                  onClick={nextVariation}
                  className="bg-black text-white border-2 border-white px-4 py-2 font-mono hover:bg-brutalist-cyan hover:text-black hover:border-brutalist-cyan transition-colors"
                >
                  {'>'}
                </button>
              </div>
            </div>
            <div className="border-2 border-white">
              <Hero80sMinimal textVariation={currentVariation} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
