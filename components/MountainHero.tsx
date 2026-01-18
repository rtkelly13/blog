import { useEffect, useState } from 'react';

const MountainHero = () => {
  const [scrollY, setScrollY] = useState(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => t + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const getWaveOffset = (waveIndex: number) => {
    return Math.sin((time + waveIndex * 20) / 10) * 10;
  };

  return (
    <div
      className="relative w-full h-screen -mt-[6rem] overflow-hidden bg-gradient-to-b from-[#ff1493] via-[#ff6b35] to-[#1a0033]"
      style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}
    >
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
              key={`line-${i}`}
              className="absolute w-full h-[4px] transition-all duration-100"
              style={{
                bottom: `${30 + i * 30 + getWaveOffset(i)}px`,
                opacity: 0.6 + i * 0.08,
                transform: `translateY(${scrollY * (0.05 + i * 0.02)}px)`,
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                boxShadow: `0 0 12px ${color}`,
              }}
            />
          );
        })}
      </div>

      <div
        className="absolute top-[55%] left-0 right-0 text-center z-10 pointer-events-none"
        style={{
          transform: `translateY(${scrollY * 0.3}px)`,
          textShadow: '0 0 20px #000, 0 0 40px #ff1493',
        }}
      >
        <h1 className="text-2xl md:text-4xl font-bold font-sans text-white mb-4 tracking-wider">
          RYAN KELLY
        </h1>
        <p
          className="text-lg md:text-xl font-mono text-[#ffaa00]"
          style={{
            textShadow: '0 0 10px #ff6b35',
          }}
        >
          {'>'} FULL_STACK_ENGINEER.exe
        </p>
      </div>

      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-[#ffaa00] transition-opacity duration-300"
        style={{ opacity: scrollY > 100 ? 0 : 1 }}
      >
        <div className="text-sm font-mono uppercase tracking-widest animate-bounce">
          {'▼ SCROLL ▼'}
        </div>
      </div>
    </div>
  );
};

export default MountainHero;
