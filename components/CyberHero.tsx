import { useEffect, useState } from 'react';

const CyberHero = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="relative w-full h-screen -mt-[6rem] overflow-hidden bg-brutalist-darkBg"
      style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}
    >
      {/* Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundSize: '50px 50px',
          backgroundImage: `
            linear-gradient(to right, var(--hero-grid, rgba(57, 255, 20, 0.1)) 1px, transparent 1px),
            linear-gradient(to bottom, var(--hero-grid, rgba(57, 255, 20, 0.1)) 1px, transparent 1px)
          `,
          transform:
            'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
          transformOrigin: 'top center',
          opacity: 0.6,
        }}
      />
      <div
        className="absolute inset-0 bottom-0 top-auto h-1/2 pointer-events-none"
        style={{
          backgroundSize: '50px 50px',
          backgroundImage: `
            linear-gradient(to right, var(--hero-grid-strong, rgba(57, 255, 20, 0.2)) 1px, transparent 1px),
            linear-gradient(to bottom, var(--hero-grid-strong, rgba(57, 255, 20, 0.2)) 1px, transparent 1px)
          `,
          transform:
            'perspective(500px) rotateX(60deg) translateY(100px) translateZ(50px)',
          transformOrigin: 'bottom center',
          opacity: 0.8,
        }}
      />

      {/* Glowing Circle — soft pastel-green ring (themeable via --hero-ring*). */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96">
        <div
          className="absolute inset-0 rounded-full border-[6px]"
          style={{
            borderColor: 'var(--hero-ring, #86efac)',
            boxShadow:
              'var(--hero-ring-glow, 0 0 28px rgba(134, 239, 172, 0.5), 0 0 64px rgba(134, 239, 172, 0.28))',
          }}
        />
        <div
          className="absolute inset-0 rounded-full border-2 blur-[2px]"
          style={{
            borderColor: 'var(--hero-ring-soft, rgba(187, 247, 208, 0.55))',
          }}
        />
      </div>

      {/* Cyberpunk lines/circuits connecting to circle */}
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30 pointer-events-none"
        style={{ stroke: 'var(--hero-ring, #86efac)' }}
        viewBox="0 0 1000 1000"
      >
        <path
          d="M 0 450 L 200 450 L 250 400 L 350 400"
          fill="none"
          strokeWidth="2"
        />
        <path
          d="M 0 550 L 150 550 L 200 600 L 350 600"
          fill="none"
          strokeWidth="2"
        />
        <path
          d="M 1000 450 L 800 450 L 750 400 L 650 400"
          fill="none"
          strokeWidth="2"
        />
        <path
          d="M 1000 550 L 850 550 L 800 600 L 650 600"
          fill="none"
          strokeWidth="2"
        />
      </svg>

      {/* Center Text */}
      <div
        className="absolute top-1/2 left-0 right-0 -translate-y-1/2 text-center z-10 pointer-events-none flex flex-col items-center justify-center"
        style={{
          transform: `translateY(calc(-50% + ${scrollY * 0.2}px))`,
        }}
      >
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-display text-white mb-2 tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
          RYAN KELLY
        </h1>
        <p className="text-lg md:text-2xl font-mono text-brutalist-neonGreen bg-black/50 px-4 py-1 drop-shadow-[0_0_8px_rgba(57,255,20,1)]">
          {'>'} FULL_STACK_ENGINEER.exe
        </p>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-brutalist-neonGreen transition-opacity duration-300 drop-shadow-[0_0_8px_rgba(57,255,20,1)]"
        style={{
          opacity: scrollY > 100 ? 0 : 1,
        }}
      >
        <div className="text-xl md:text-2xl font-pixel uppercase tracking-widest animate-pulse flex items-center gap-4 border border-brutalist-neonGreen px-4 py-2 bg-black/40">
          <span>↓</span>
          <span>SCROLL</span>
          <span>↓</span>
        </div>
      </div>
    </div>
  );
};

export default CyberHero;
