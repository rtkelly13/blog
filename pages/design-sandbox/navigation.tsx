import { ArrowUp, FileText, Menu, MessageSquare, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

const ActionButtons = ({ visible }: { visible: boolean }) => (
  <div
    className={`flex flex-col gap-3 transition-all duration-300 ${
      visible
        ? 'opacity-100 translate-y-0'
        : 'opacity-0 translate-y-4 pointer-events-none'
    }`}
  >
    <button
      className="border-2 border-white bg-brutalist-cyan text-black p-3 transition-all hover:shadow-[4px_4px_0px_0px_#ffffff] active:translate-x-1 active:translate-y-1"
      aria-label="Table of Contents"
    >
      <FileText className="w-5 h-5" />
    </button>
    <button
      className="border-2 border-white bg-black p-3 text-white transition-all hover:bg-brutalist-cyan hover:text-black active:translate-x-1 active:translate-y-1"
      aria-label="Scroll To Comment"
    >
      <MessageSquare className="w-5 h-5" />
    </button>
    <button
      className="border-2 border-white bg-black p-3 text-white transition-all hover:bg-brutalist-cyan hover:text-black active:translate-x-1 active:translate-y-1"
      aria-label="Scroll To Top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  </div>
);

const MainFab = ({
  isActive = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onTouchStart,
  onTouchEnd,
  customClass = '',
}: any) => (
  <button
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onMouseDown={onMouseDown}
    onMouseUp={onMouseUp}
    onTouchStart={onTouchStart}
    onTouchEnd={onTouchEnd}
    className={`border-2 border-white bg-black p-3 text-white transition-all hover:bg-brutalist-cyan hover:text-black hover:shadow-[4px_4px_0px_0px_#ffffff] active:translate-x-1 active:translate-y-1 ${customClass}`}
    aria-label={isActive ? 'Close actions menu' : 'Open actions menu'}
  >
    {isActive ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
  </button>
);

const DemoContainer = ({
  title,
  description,
  code,
  children,
}: {
  title: string;
  description: string;
  code: string;
  children: React.ReactNode;
}) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border-2 border-white p-6 flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-mono font-bold text-lg text-white uppercase">
            {title}
          </h3>
          <p className="text-zinc-400 text-sm font-mono mt-1">{description}</p>
        </div>
        <button
          onClick={copyCode}
          className="bg-black text-brutalist-cyan px-3 py-1 font-mono text-xs border border-brutalist-cyan hover:bg-brutalist-cyan hover:text-black transition-colors shrink-0 ml-4"
        >
          {copied ? '✓ COPIED' : 'COPY'}
        </button>
      </div>

      <div className="bg-zinc-800 border border-white relative h-[300px] w-full overflow-hidden mb-4 rounded-sm shadow-inner group">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        {children}
      </div>

      <div className="bg-black border border-zinc-700 p-3 mt-auto">
        <pre className="font-mono text-xs text-zinc-400 whitespace-pre-wrap">
          {code}
        </pre>
      </div>
    </div>
  );
};

const HoverReveal = () => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div className="w-full h-full relative flex flex-col items-end justify-end p-6 gap-3">
      <ActionButtons visible={isHovered} />
      <MainFab
        isActive={isHovered}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
    </div>
  );
};

const ProximityReveal = () => {
  const [isNearby, setIsNearby] = useState(false);
  return (
    <div className="w-full h-full relative flex flex-col items-end justify-end p-6 gap-3">
      <div
        className="absolute bottom-0 right-0 w-48 h-48 bg-brutalist-cyan/10"
        onMouseEnter={() => setIsNearby(true)}
        onMouseLeave={() => setIsNearby(false)}
      />
      <ActionButtons visible={isNearby} />
      <MainFab isActive={isNearby} customClass="pointer-events-none" />
    </div>
  );
};

const LongPressReveal = () => {
  const [isActive, setIsActive] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      setIsActive(true);
      setIsPressing(false);
    }, 500);
  };

  const cancelPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPressing(false);
  };

  const handleMouseLeave = () => {
    cancelPress();
    setIsActive(false);
  };

  return (
    <div
      className="w-full h-full relative flex flex-col items-end justify-end p-6 gap-3"
      onMouseLeave={handleMouseLeave}
    >
      {isPressing && !isActive && (
        <div className="absolute bottom-6 right-6 border-4 border-brutalist-pink p-3 animate-ping z-0" />
      )}
      <ActionButtons visible={isActive} />
      <MainFab
        isActive={isActive}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        customClass="active:scale-95 transition-transform"
      />
      {isActive && (
        <div className="absolute bottom-20 right-12 text-xs font-mono text-brutalist-pink bg-black px-2 py-1 border border-brutalist-pink">
          RELEASED!
        </div>
      )}
    </div>
  );
};

const ScrollReveal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = () => {
    setIsVisible(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  return (
    <div
      className="w-full h-full overflow-y-auto relative scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-900"
      onScroll={handleScroll}
    >
      <div className="p-4 min-h-[600px] text-zinc-500 font-mono text-sm space-y-4">
        <p>Scroll inside this container...</p>
        <p>Keep scrolling...</p>
        <p>Buttons appear while active...</p>
        <p>And hide after 2s of stillness.</p>
        <div className="h-20 bg-zinc-800/50 w-full" />
        <p>More content...</p>
        <div className="h-20 bg-zinc-800/50 w-full" />
        <p>End of content.</p>
      </div>

      <div className="sticky bottom-6 float-right mr-6 flex flex-col items-end gap-3">
        <ActionButtons visible={isVisible} />
        <MainFab isActive={isVisible} />
      </div>
    </div>
  );
};

const ToggleClick = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="w-full h-full relative flex flex-col items-end justify-end p-6 gap-3">
      <ActionButtons visible={isOpen} />
      <MainFab isActive={isOpen} onClick={() => setIsOpen(!isOpen)} />
    </div>
  );
};

const AlwaysVisible = () => {
  return (
    <div className="w-full h-full relative flex flex-col items-end justify-end p-6 gap-3">
      <ActionButtons visible={true} />
      <MainFab isActive={true} />
    </div>
  );
};

export default function NavigationSandbox() {
  return (
    <>
      <PageSEO
        title={`Navigation FAB Patterns - ${siteMetadata.author}`}
        description="Exploring interaction models for Floating Action Buttons"
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
            [ NAVIGATION_FAB ]
          </h1>
          <p className="text-lg leading-7 text-zinc-400 font-mono">
            {'>'} Exploration of FAB trigger mechanics & interaction states
          </p>
        </div>

        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <DemoContainer
              title="1. Hover Reveal"
              description="Standard hover trigger. Good for desktop, bad for mobile."
              code={`const [isOpen, setIsOpen] = useState(false);

<MainFab 
  onMouseEnter={() => setIsOpen(true)}
  onMouseLeave={() => setIsOpen(false)} 
/>`}
            >
              <HoverReveal />
            </DemoContainer>

            <DemoContainer
              title="2. Proximity Reveal"
              description="Expands hit area for anticipated intent."
              code={`<div className="w-48 h-48 absolute"
  onMouseEnter={() => setIsOpen(true)}
  onMouseLeave={() => setIsOpen(false)} 
/>`}
            >
              <ProximityReveal />
            </DemoContainer>

            <DemoContainer
              title="3. Long Press"
              description="Hold 500ms to unlock. Prevents accidental clicks."
              code={`const timer = setTimeout(() => {
  setIsOpen(true);
}, 500);
// Clear on mouseUp/mouseLeave`}
            >
              <LongPressReveal />
            </DemoContainer>

            <DemoContainer
              title="4. Scroll Reveal"
              description="Shows during activity, hides after 2s stillness."
              code={`onScroll={() => {
  setVisible(true);
  clearTimeout(timer);
  timer = setTimeout(() => {
    setVisible(false);
  }, 2000);
}}`}
            >
              <ScrollReveal />
            </DemoContainer>

            <DemoContainer
              title="5. Current (Click)"
              description="Explicit toggle state. Safest for touch. CURRENT IMPLEMENTATION."
              code={`onClick={() => setIsOpen(!isOpen)}

// In BlogActions.tsx:
// - Menu/X icon toggle
// - Square buttons, not circular
// - Border-2 with white borders`}
            >
              <ToggleClick />
            </DemoContainer>

            <DemoContainer
              title="6. Always Visible"
              description="Zero friction, high visual noise."
              code={`// Always render actions
<ActionButtons visible={true} />`}
            >
              <AlwaysVisible />
            </DemoContainer>
          </div>

          <div className="mt-12 border-2 border-brutalist-yellow bg-zinc-900 p-6">
            <h2 className="font-mono font-bold text-xl text-brutalist-yellow mb-4 uppercase">
              [ DESIGN_NOTES ]
            </h2>
            <ul className="text-white font-mono text-sm space-y-2">
              <li>
                {'>'} Shape: Square buttons with border-2 border-white (no
                rounded corners)
              </li>
              <li>{'>'} Toggle Icon: Menu → X (not rotating Plus icon)</li>
              <li>
                {'>'} Hover Shadow: `hover:shadow-[4px_4px_0px_0px_#ffffff]`
              </li>
              <li>
                {'>'} Active State: `active:translate-x-1 active:translate-y-1`
              </li>
              <li>
                {'>'} Animation: `transition-all duration-300` for reveals
              </li>
              <li>
                {'>'} Colors: ToC button uses `bg-brutalist-cyan`, others
                `bg-black` with cyan hover
              </li>
              <li>
                {'>'} Mobile Consideration: Click toggle works on all devices
                (Proximity/Hover fail on touch)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
