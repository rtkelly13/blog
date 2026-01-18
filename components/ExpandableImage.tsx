'use client';

import { ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { useState } from 'react';

interface ExpandableImageProps {
  src: string;
  alt: string;
  collapsedHeight?: number;
  width?: number;
  height?: number;
}

export default function ExpandableImage({
  src,
  alt,
  collapsedHeight = 400,
}: ExpandableImageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className="my-8 border-2 border-white bg-zinc-900">
        <div className="relative overflow-hidden">
          <div
            className={`relative transition-all duration-500 ease-in-out ${
              isExpanded ? 'max-h-none' : `max-h-[${collapsedHeight}px]`
            }`}
            style={isExpanded ? {} : { maxHeight: `${collapsedHeight}px` }}
          >
            <img
              src={src}
              alt={alt}
              className="w-full h-auto"
              loading="eager"
            />

            {!isExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none" />
            )}
          </div>

          <div className="border-t-2 border-white bg-black p-4 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-1 flex items-center justify-center gap-2 bg-brutalist-cyan text-black px-4 py-2 border-2 border-white font-mono text-sm font-bold uppercase shadow-[4px_4px_0px_0px_#ffffff] hover:shadow-[6px_6px_0px_0px_#ffffff] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Expand Full Image
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="flex items-center justify-center gap-2 bg-brutalist-pink text-black px-4 py-2 border-2 border-white font-mono text-sm font-bold uppercase shadow-[4px_4px_0px_0px_#ffffff] hover:shadow-[6px_6px_0px_0px_#ffffff] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
              aria-label="View fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          </div>
        </div>

        <div className="border-t-2 border-white bg-zinc-950 px-4 py-2">
          <p className="font-mono text-xs text-zinc-500">{alt}</p>
        </div>
      </div>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsFullscreen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 bg-brutalist-cyan text-black px-4 py-2 border-2 border-white font-mono text-sm font-bold uppercase shadow-[4px_4px_0px_0px_#ffffff] hover:shadow-[6px_6px_0px_0px_#ffffff] z-10"
          >
            Close [ESC]
          </button>

          <div className="max-h-full overflow-y-auto border-2 border-white">
            <img src={src} alt={alt} className="max-w-full h-auto" />
          </div>
        </div>
      )}
    </>
  );
}
