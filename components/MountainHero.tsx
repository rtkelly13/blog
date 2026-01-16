import React, { useEffect, useState } from 'react';

const MountainHero = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper to calculate transform based on speed
  // speed: higher number = faster movement
  const getTransform = (speed) => {
    return `translate3d(0, ${scrollY * speed}px, 0)`;
  };

  return (
    <div
      className="relative w-full h-screen -mt-[6rem] overflow-hidden bg-gradient-to-b from-sky-300 to-sky-50 dark:from-slate-950 dark:to-slate-900 transition-colors duration-500"
      style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}
    >
      {/* Sun Element - Speed: 0.035 */}
      <div
        className="absolute top-[15%] right-[20%] w-32 h-32 rounded-full bg-amber-400 dark:bg-amber-500 shadow-[0_0_60px_20px_rgba(255,179,71,0.6)] dark:shadow-[0_0_60px_20px_rgba(245,158,11,0.4)] z-0 transition-transform will-change-transform"
        style={{ transform: getTransform(0.035) }}
      />

      {/* MOUNTAIN LAYERS
        Using 'text-color' for fill to allow easy dark mode switching via Tailwind classes.
        drop-shadow-lg applies the shadow to the clip-path shape, not the box.
      */}

      {/* Layer 1 - Furthest - Speed: 0.065 */}
      <div
        className="absolute left-0 w-full h-[70vh] text-slate-400 dark:text-slate-950 z-10 transition-transform will-change-transform drop-shadow-md"
        style={{
          bottom: '10vh',
          transform: getTransform(0.065),
          clipPath:
            'polygon(0% 100%, 0% 40%, 15% 65%, 35% 25%, 55% 55%, 70% 30%, 85% 60%, 100% 20%, 100% 100%)',
          backgroundColor: 'currentColor',
        }}
      />

      {/* Layer 2 - Speed: 0.125 */}
      <div
        className="absolute left-0 w-full h-[60vh] text-slate-500 dark:text-slate-900 z-20 transition-transform will-change-transform drop-shadow-md"
        style={{
          bottom: '5vh',
          transform: getTransform(0.125),
          clipPath:
            'polygon(0% 100%, 0% 70%, 10% 55%, 25% 80%, 45% 45%, 65% 75%, 80% 50%, 100% 80%, 100% 100%)',
          backgroundColor: 'currentColor',
        }}
      />

      {/* Layer 3 - Speed: 0.21 */}
      <div
        className="absolute left-0 w-full h-[50vh] text-slate-600 dark:text-slate-800 z-30 transition-transform will-change-transform drop-shadow-lg"
        style={{
          bottom: '0',
          transform: getTransform(0.21),
          clipPath:
            'polygon(0% 100%, 0% 80%, 15% 50%, 30% 70%, 50% 40%, 70% 65%, 85% 55%, 100% 75%, 100% 100%)',
          backgroundColor: 'currentColor',
        }}
      />

      {/* Layer 4 - Speed: 0.295 */}
      <div
        className="absolute left-0 w-full h-[40vh] text-slate-700 dark:text-slate-700 z-40 transition-transform will-change-transform drop-shadow-xl"
        style={{
          bottom: '-5vh',
          transform: getTransform(0.295),
          clipPath:
            'polygon(0% 100%, 0% 60%, 20% 40%, 40% 65%, 60% 35%, 80% 60%, 100% 50%, 100% 100%)',
          backgroundColor: 'currentColor',
        }}
      />

      {/* Layer 5 - Closest - Speed: 0.46 */}
      <div
        className="absolute left-0 w-full h-[25vh] text-slate-800 dark:text-slate-600 z-50 transition-transform will-change-transform drop-shadow-2xl"
        style={{
          bottom: '-10vh',
          transform: getTransform(0.46),
          clipPath:
            'polygon(0% 100%, 0% 20%, 15% 0%, 35% 25%, 55% 5%, 75% 30%, 100% 10%, 100% 100%)',
          backgroundColor: 'currentColor',
        }}
      />

      {/* Text Content - Positioned absolutely to stay centered initially but scroll away */}
      <div
        className="absolute top-1/3 left-0 right-0 text-center z-[45] pointer-events-none will-change-transform"
        style={{ transform: getTransform(0.24) }}
      >
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-800 dark:text-slate-100 mb-2 drop-shadow-sm">
          RYAN KELLY
        </h1>
        <p className="text-xl md:text-2xl font-light text-slate-700 dark:text-slate-300 tracking-wide">
          Full Stack Engineer & Creative Coder
        </p>
      </div>

      {/* Scroll Indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300 transition-opacity duration-300"
        style={{ opacity: scrollY > 100 ? 0 : 1 }}
      >
        <div className="w-[30px] h-[50px] border-2 border-current rounded-full relative">
          <div className="w-1 h-2 bg-current rounded-full absolute top-2 left-1/2 -translate-x-1/2 animate-bounce" />
        </div>
        <span className="text-sm font-medium uppercase tracking-widest">
          Scroll
        </span>
      </div>
    </div>
  );
};

export default MountainHero;
