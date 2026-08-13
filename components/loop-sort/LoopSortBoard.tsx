import {
  Box,
  CheckCircle2,
  Construction,
  Flame,
  Lock,
  ShieldAlert,
  Snowflake,
} from 'lucide-react';
import type React from 'react';
import type {
  LoopSortMap,
  MoveStep,
  Rack,
  TargetBox,
} from '../../lib/loop-sort/types';
import { getColorStyle } from './colorMap';

interface LoopSortBoardProps {
  map: LoopSortMap;
  activeStep?: MoveStep;
}

export const LoopSortBoard: React.FC<LoopSortBoardProps> = ({
  map,
  activeStep,
}) => {
  const topRacks = map.racks.filter((r) => r.section === 'top_shelf');
  const loopRacks = map.racks.filter((r) => r.section === 'loop_track');

  const topBoxes = map.boxes.filter((b) => b.section === 'top_shelf');
  const loopBoxes = map.boxes.filter((b) => b.section === 'loop_track');

  // Racks inside loop track layout: top row (first 4 or top ones), bottom row (remaining)
  const loopTopRacks = loopRacks.slice(0, 4);
  const loopBottomRacks = loopRacks.slice(4);

  const renderRack = (rack: Rack) => {
    const isFrom = activeStep?.fromRackId === rack.id;
    const isTo = activeStep?.toTargetId === rack.id;

    // Check lock conditions
    const isIceLocked = Boolean(
      rack.iceLockedBy && rack.iceLockedBy.length > 0,
    );
    const isRopeTied = Boolean(rack.ropeTiedTo && rack.ropeTiedTo.length > 0);

    // Fill array up to capacity
    const slots: (string | null)[] = [];
    const cap = rack.capacity || 4;
    for (let i = 0; i < cap; i++) {
      slots.push(rack.blocks[i] || null);
    }

    return (
      <div
        key={rack.id}
        className={`relative flex flex-col items-center p-2 border-2 bg-black transition-all ${
          isFrom
            ? 'border-brutalist-cyan shadow-[0_0_12px_rgba(34,211,238,0.8)] scale-105 z-10'
            : isTo
              ? 'border-brutalist-pink shadow-[0_0_12px_rgba(236,72,153,0.8)] scale-105 z-10'
              : isIceLocked
                ? 'border-sky-400 bg-sky-950/20'
                : isRopeTied
                  ? 'border-amber-500 bg-amber-950/20'
                  : rack.isConstruction
                    ? 'border-yellow-400 bg-yellow-950/20'
                    : 'border-white'
        }`}
      >
        {/* Header Badges */}
        <div className="flex items-center gap-1 mb-1 font-mono text-xs font-bold text-zinc-400">
          <span>{rack.id}</span>
          {isIceLocked && (
            <Snowflake
              className="w-3 h-3 text-sky-400 animate-pulse"
              title={`Frozen until ${rack.iceLockedBy} is empty`}
            />
          )}
          {isRopeTied && (
            <Lock
              className="w-3 h-3 text-amber-400"
              title={`Rope-tied until ${rack.ropeTiedTo} is solved`}
            />
          )}
          {rack.isConstruction && (
            <Construction
              className="w-3 h-3 text-yellow-400"
              title="Under Construction"
            />
          )}
        </div>

        {/* Color Filter Indicator if restricted */}
        {rack.allowedColors && rack.allowedColors.length > 0 && (
          <div className="w-full text-center text-[9px] font-mono text-brutalist-yellow uppercase bg-zinc-800 border border-zinc-700 px-1 py-0.5 mb-1 truncate max-w-[70px]">
            {rack.allowedColors.join('/')}
          </div>
        )}

        {/* Stack Container (top element on top, bottom element on bottom) */}
        <div className="w-14 flex flex-col-reverse gap-1 border-2 border-zinc-700 bg-zinc-900 p-1 min-h-[140px] justify-start relative">
          {slots.map((color, idx) => {
            if (!color) {
              return (
                <div
                  key={idx}
                  className="h-7 w-full border border-dashed border-zinc-700 bg-black/40 flex items-center justify-center text-[9px] font-mono text-zinc-700"
                >
                  —
                </div>
              );
            }

            const isMystery = color === '?';
            const style = getColorStyle(color);
            return (
              <div
                key={idx}
                className={`h-7 w-full border-2 ${style.border} ${style.bg} ${style.text} flex items-center justify-center font-mono font-bold text-[10px] uppercase shadow-sm transition-transform`}
                title={isMystery ? 'Mystery Hidden Block' : color}
              >
                {isMystery ? '?' : color.slice(0, 3)}
              </div>
            );
          })}

          {/* Ice / Rope / Construction Overlay */}
          {isIceLocked && (
            <div className="absolute inset-0 bg-sky-500/20 border border-sky-400/50 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none">
              <Snowflake className="w-6 h-6 text-sky-300 drop-shadow" />
              <span className="text-[9px] font-mono font-bold text-sky-200 uppercase bg-black/80 px-1 mt-1 border border-sky-400">
                EMPTY {rack.iceLockedBy}
              </span>
            </div>
          )}

          {isRopeTied && (
            <div className="absolute inset-0 bg-amber-500/20 border border-amber-400/50 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none">
              <Lock className="w-5 h-5 text-amber-300 drop-shadow" />
              <span className="text-[9px] font-mono font-bold text-amber-200 uppercase bg-black/80 px-1 mt-1 border border-amber-400">
                SOLVE {rack.ropeTiedTo}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTargetBox = (box: TargetBox) => {
    const isTo = activeStep?.toTargetId === box.id;
    const isCompleted = box.filled >= box.capacity;
    const colorStyle = getColorStyle(box.color);

    return (
      <div
        key={box.id}
        className={`flex flex-col items-center p-2 border-2 bg-black transition-all ${
          isTo
            ? 'border-brutalist-pink shadow-[0_0_12px_rgba(236,72,153,0.8)] scale-105 z-10'
            : isCompleted
              ? 'border-brutalist-yellow'
              : box.isConstruction
                ? 'border-amber-400 bg-amber-950/20'
                : 'border-white'
        }`}
      >
        <span className="font-mono text-xs font-bold text-zinc-400 mb-1 flex items-center gap-1">
          {box.isConstruction ? (
            <Construction className="w-3 h-3 text-amber-400" />
          ) : (
            <Box className="w-3 h-3 text-brutalist-pink" />
          )}
          {box.id}
        </span>

        <div
          className={`w-16 h-36 border-2 border-white p-2 flex flex-col justify-between items-center ${
            isCompleted ? 'bg-zinc-800' : 'bg-zinc-900'
          }`}
        >
          {/* Header Color Tag */}
          <div
            className={`w-full py-1 border border-white ${
              box.isConstruction
                ? 'bg-amber-900/60 border-amber-400 text-amber-300 font-mono'
                : `${colorStyle.bg} ${colorStyle.text}`
            } text-center font-mono font-bold text-[10px] uppercase truncate`}
          >
            {box.isConstruction ? 'HIDDEN' : box.color}
          </div>

          {/* Fill Visualizer */}
          <div className="flex flex-col items-center justify-center my-auto">
            {isCompleted ? (
              <CheckCircle2 className="w-8 h-8 text-brutalist-yellow animate-bounce" />
            ) : (
              <div className="text-center font-mono font-bold text-xl text-white">
                {box.filled}
                <span className="text-zinc-500 text-sm">/{box.capacity}</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-black border border-white h-3">
            <div
              className={`h-full ${
                box.isConstruction ? 'bg-amber-400' : colorStyle.bg
              } transition-all duration-300`}
              style={{
                width: `${Math.min(100, (box.filled / box.capacity) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upper Shelf Area */}
      <div className="border-2 border-white bg-zinc-900 p-4">
        <div className="flex items-center justify-between border-b-2 border-zinc-700 pb-2 mb-4">
          <h3 className="font-display font-bold text-lg text-white uppercase flex items-center gap-2">
            <span className="text-brutalist-cyan">[ SHELF_QUEUE ]</span>
            <span className="text-xs font-mono text-zinc-400">
              ({topRacks.length} RACKS)
            </span>
          </h3>
          {topBoxes.length > 0 && (
            <span className="font-mono text-xs text-brutalist-yellow">
              TOP TARGET:{' '}
              {topBoxes[0].isConstruction
                ? 'HIDDEN'
                : topBoxes[0].color.toUpperCase()}{' '}
              ({topBoxes[0].filled}/{topBoxes[0].capacity})
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {topRacks.map(renderRack)}
          {topBoxes.map(renderTargetBox)}
        </div>
      </div>

      {/* Conveyor Loop Area */}
      <div className="border-2 border-brutalist-cyan bg-zinc-900 p-4 relative">
        <div className="flex items-center justify-between border-b-2 border-zinc-700 pb-2 mb-4">
          <h3 className="font-display font-bold text-lg text-brutalist-cyan uppercase flex items-center gap-2">
            <span>[ CONVEYOR_LOOP_CIRCUIT ]</span>
            <span className="text-xs font-mono text-zinc-400">
              (CONTINUOUS TRACK)
            </span>
          </h3>
          <span className="font-mono text-xs text-zinc-400 animate-pulse">
            ↺ COUNTER-CLOCKWISE TRACK ↻
          </span>
        </div>

        {/* Outer Loop Frame Representation */}
        <div className="border-4 border-dashed border-zinc-700 p-4 bg-black/60 space-y-6">
          {/* Loop Track Top Racks */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {loopTopRacks.map(renderRack)}
          </div>

          {/* Conveyor Direction Divider */}
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500 px-4">
            <span>◄ TRACK INBOUND</span>
            <div className="h-0.5 flex-1 mx-4 bg-zinc-800 border-t border-dashed border-zinc-600" />
            <span>TRACK OUTBOUND ►</span>
          </div>

          {/* Loop Track Bottom Racks & Target Boxes */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {loopBottomRacks.map(renderRack)}
            {loopBoxes.map(renderTargetBox)}
          </div>
        </div>
      </div>
    </div>
  );
};
