import {
  Box,
  CheckCircle2,
  Construction,
  Eye,
  EyeOff,
  Flame,
  Info,
  Lock,
  RotateCw,
  Snowflake,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
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
  const [showFogOfWar, setShowFogOfWar] = useState<boolean>(false);

  const topRacks = map.racks.filter((r) => r.section === 'top_shelf');
  const loopRacks = map.racks.filter((r) => r.section === 'loop_track');

  const topBoxes = map.boxes.filter((b) => b.section === 'top_shelf');
  const loopBoxes = map.boxes.filter((b) => b.section === 'loop_track');

  // Split loop track into top row (up to 4) and bottom row
  const loopTopRacks = loopRacks.slice(0, 4);
  const loopBottomRacks = loopRacks.slice(4);

  // Check if any top rack has rope tied
  const hasTopRope = topRacks.some((r) => r.ropeTiedTo) || topRacks.length >= 5;

  const renderRackCart = (rack: Rack) => {
    const isFrom = activeStep?.fromRackId === rack.id;
    const isTo = activeStep?.toTargetId === rack.id;
    const isIceLocked = Boolean(rack.iceLockedBy);
    const isRopeTied = Boolean(rack.ropeTiedTo);

    const cap = rack.capacity || 4;
    const blocks = rack.blocks;

    return (
      <div
        key={rack.id}
        className={`relative flex flex-col items-center select-none transition-all duration-200 ${
          isFrom
            ? 'scale-105 z-20 -translate-y-1'
            : isTo
              ? 'scale-105 z-20 -translate-y-1'
              : ''
        }`}
      >
        {/* Cart Chassis */}
        <div
          className={`w-[60px] sm:w-[68px] rounded-2xl p-1.5 pb-2.5 flex flex-col items-center transition-all shadow-lg ${
            isFrom
              ? 'bg-gradient-to-b from-cyan-600 to-indigo-900 ring-4 ring-brutalist-cyan shadow-cyan-500/50'
              : isTo
                ? 'bg-gradient-to-b from-pink-600 to-purple-950 ring-4 ring-brutalist-pink shadow-pink-500/50'
                : isIceLocked
                  ? 'bg-gradient-to-b from-sky-700 to-slate-900 ring-2 ring-sky-400/80 shadow-sky-500/30'
                  : 'bg-gradient-to-b from-[#5c4a9c] to-[#362768] border-2 border-[#7e69c8]/40 shadow-purple-950/80'
          }`}
        >
          {/* Rack ID Label */}
          <div className="flex items-center justify-between w-full px-1 mb-1">
            <span className="font-mono font-black text-[10px] text-purple-200 tracking-wider">
              {rack.id}
            </span>
            {isIceLocked && (
              <Snowflake
                className="w-3 h-3 text-sky-300 animate-pulse"
                title={`Frozen until ${rack.iceLockedBy} is empty`}
              />
            )}
            {isRopeTied && (
              <Lock
                className="w-3 h-3 text-amber-300"
                title={`Rope-tied until ${rack.ropeTiedTo} is solved`}
              />
            )}
            {rack.isConstruction && (
              <Construction
                className="w-3 h-3 text-yellow-300"
                title="Under Construction"
              />
            )}
          </div>

          {/* Tray Cavity */}
          <div className="w-full bg-[#1b1535] rounded-xl p-1 flex flex-col-reverse gap-1 border border-purple-950/80 shadow-inner min-h-[120px] justify-start relative overflow-hidden">
            {Array.from({ length: cap }).map((_, slotIdx) => {
              const rawColor = blocks[slotIdx];

              if (!rawColor) {
                return (
                  <div
                    key={slotIdx}
                    className="h-6 sm:h-7 w-full rounded-lg bg-[#271f4b]/30 border border-dashed border-purple-800/40 flex items-center justify-center"
                  >
                    <span className="text-[8px] font-mono text-purple-700/60">
                      •
                    </span>
                  </div>
                );
              }

              // Handle fog-of-war obscuring sub-surface blocks
              const isTopBlock = slotIdx === blocks.length - 1;
              const isHiddenByFog = showFogOfWar && !isTopBlock;
              const displayColor = isHiddenByFog ? '?' : rawColor;
              const isMystery = displayColor === '?';
              const style = getColorStyle(displayColor);

              return (
                <div
                  key={slotIdx}
                  className={`h-6 sm:h-7 w-full rounded-lg flex items-center justify-center font-mono font-bold text-[10px] uppercase shadow-md transition-all relative overflow-hidden ${
                    isMystery
                      ? 'bg-gradient-to-b from-slate-700 to-slate-900 border-2 border-dashed border-slate-500 text-slate-300'
                      : `${style.bg} border-t border-white/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.5)] ${style.text}`
                  }`}
                  title={rawColor}
                >
                  {/* Gloss highlight */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-lg pointer-events-none" />

                  {isMystery ? (
                    <span className="font-extrabold text-amber-300 drop-shadow">
                      ?
                    </span>
                  ) : (
                    <span className="drop-shadow-sm truncate px-0.5">
                      {rawColor.slice(0, 3)}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Ice Overlay */}
            {isIceLocked && (
              <div className="absolute inset-0 bg-sky-400/25 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center border-2 border-sky-300/60 z-10">
                <Snowflake className="w-5 h-5 text-sky-200 drop-shadow-md animate-pulse" />
                <span className="text-[8px] font-mono font-bold text-sky-100 uppercase bg-sky-950/90 px-1 py-0.5 rounded border border-sky-400/80 mt-1">
                  EMPTY {rack.iceLockedBy}
                </span>
              </div>
            )}
          </div>

          {/* Cart Wheels / Lights at Bottom */}
          <div className="flex items-center justify-between w-full px-2 pt-1.5">
            <div className="w-2 h-1 rounded-full bg-amber-400/80 shadow-[0_0_4px_#fbbf24]" />
            <div className="w-4 h-1 rounded-sm bg-purple-950/60" />
            <div className="w-2 h-1 rounded-full bg-amber-400/80 shadow-[0_0_4px_#fbbf24]" />
          </div>
        </div>

        {/* Color Filter Badge if present */}
        {rack.allowedColors && rack.allowedColors.length > 0 && (
          <div className="mt-1 px-1 py-0.5 rounded bg-purple-900/90 border border-purple-400/50 text-[8px] font-mono font-bold text-purple-200 uppercase tracking-tighter truncate max-w-[68px]">
            {rack.allowedColors.join('/')}
          </div>
        )}
      </div>
    );
  };

  const renderTargetTruck = (box: TargetBox) => {
    const isTo = activeStep?.toTargetId === box.id;
    const isCompleted = box.filled >= box.capacity;
    const colorStyle = getColorStyle(box.color);

    return (
      <div
        key={box.id}
        className={`relative flex flex-col items-center select-none transition-all duration-200 ${
          isTo ? 'scale-105 z-20 -translate-y-1' : ''
        }`}
      >
        {/* Truck Capsule Container */}
        <div
          className={`w-[64px] sm:w-[72px] h-[150px] rounded-3xl p-2 flex flex-col justify-between items-center relative overflow-hidden transition-all shadow-xl ${
            isTo
              ? 'ring-4 ring-brutalist-pink shadow-pink-500/60'
              : isCompleted
                ? 'ring-2 ring-yellow-400 shadow-yellow-500/30'
                : 'border border-white/20 shadow-black/80'
          } ${
            box.isConstruction
              ? 'bg-gradient-to-b from-amber-800 to-amber-950'
              : `${colorStyle.bg} bg-gradient-to-b shadow-[inset_0_2px_6px_rgba(255,255,255,0.4),0_6px_12px_rgba(0,0,0,0.6)]`
          }`}
        >
          {/* Top Truck Roof Highlight */}
          <div className="absolute top-0 left-2 right-2 h-4 bg-white/25 rounded-b-2xl pointer-events-none" />

          {/* Truck Header ID */}
          <span className="font-mono font-black text-[9px] text-white/90 uppercase tracking-wider drop-shadow z-10">
            {box.id}
          </span>

          {/* Center Isometric Cube Badge */}
          <div className="my-auto flex flex-col items-center justify-center z-10">
            <div className="w-10 h-10 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-inner">
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md animate-bounce" />
              ) : box.isConstruction ? (
                <Construction className="w-5 h-5 text-amber-200 drop-shadow" />
              ) : (
                <Box className="w-6 h-6 text-white/90 drop-shadow-md stroke-[2.2]" />
              )}
            </div>

            {/* Fill Progress Counter */}
            <div className="mt-1.5 font-mono font-black text-xs text-white drop-shadow flex items-center gap-0.5">
              <span>{box.filled}</span>
              <span className="text-white/60 text-[10px]">/{box.capacity}</span>
            </div>
          </div>

          {/* Bottom Fill Level Indicator Bar */}
          <div className="w-full bg-black/40 rounded-full p-0.5 border border-white/30 z-10">
            <div
              className="h-1.5 rounded-full bg-white transition-all duration-300 shadow-sm"
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
      {/* Visualizer Mode Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border-2 border-zinc-700 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-brutalist-cyan animate-spin-slow" />
          <span className="font-display font-bold text-sm text-white uppercase tracking-wider">
            [ GAME_ACCURATE_CANVAS ]
          </span>
        </div>

        {/* View Mode Toggle: In-Game vs Oracle View */}
        <button
          onClick={() => setShowFogOfWar(!showFogOfWar)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs font-bold uppercase transition-all border-2 ${
            showFogOfWar
              ? 'bg-amber-500 text-black border-amber-300 shadow-amber-500/40 shadow-md'
              : 'bg-zinc-800 text-zinc-300 border-zinc-600 hover:text-white hover:border-zinc-400'
          }`}
          title="Toggle between In-Game presentation (mystery ? blocks) and Oracle View (fully exposed)"
        >
          {showFogOfWar ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>In-Game View (Fog of War: ON)</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Oracle View (Fully Exposed)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Game Board Canvas Container (Dark Navy Blue Aesthetic matching original screenshot) */}
      <div className="p-4 sm:p-8 rounded-3xl bg-gradient-to-b from-[#1a1836] via-[#15122e] to-[#0f0c24] border-4 border-[#2c2459] shadow-2xl space-y-8 select-none">
        {/* 1. Upper Shelf Section with Wrapped Rope */}
        <div className="relative">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="font-mono font-bold text-xs text-purple-300/80 uppercase tracking-widest flex items-center gap-1.5">
              <span>UPPER STAGING SHELF</span>
              {hasTopRope && (
                <span className="text-[10px] text-amber-300 font-black bg-amber-950/80 border border-amber-500/60 px-1.5 py-0.5 rounded">
                  BOUND BY ROPE
                </span>
              )}
            </span>
            <span className="font-mono text-xs text-purple-400">
              LEVEL {map.level || 259}
            </span>
          </div>

          {/* Rope Wrapped Border Container */}
          <div
            className={`relative p-3 sm:p-4 rounded-3xl bg-[#231b46]/70 border-4 ${
              hasTopRope
                ? 'border-[#c28e46] shadow-[0_0_15px_rgba(194,142,70,0.4)]'
                : 'border-[#433678]'
            } flex flex-wrap items-center justify-center gap-3 sm:gap-4`}
          >
            {/* Visual Rope Knots / Twine Effect */}
            {hasTopRope && (
              <>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 bg-[#8b5a2b] border-2 border-[#e6b168] rounded-full text-[9px] font-mono font-extrabold text-amber-100 shadow-md uppercase tracking-wider z-20 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>ROPE BOUND SHELF</span>
                </div>
                {/* Rope border stripes */}
                <div className="absolute inset-0 rounded-[22px] pointer-events-none border-4 border-dashed border-[#ffd28a]/40" />
              </>
            )}

            {/* Top Shelf Racks */}
            {topRacks.map(renderRackCart)}

            {/* Top Shelf Target Boxes / Goal Truck */}
            {topBoxes.map(renderTargetTruck)}
          </div>
        </div>

        {/* 2. Continuous Conveyor Loop Circuit Track */}
        <div className="relative p-4 sm:p-6 rounded-[36px] bg-[#231a4c]/90 border-[6px] border-[#3f317b] shadow-[inset_0_4px_16px_rgba(0,0,0,0.6)]">
          {/* Conveyor Track Perimeter with Directional Arrows */}
          <div className="rounded-[28px] border-4 border-dashed border-[#614eac]/60 p-4 sm:p-6 bg-[#161033] relative space-y-6">
            {/* Conveyor Belt Direction Chevrons Top & Left & Right */}
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#8670d8] px-2">
              <span className="flex items-center gap-1">
                ◄ ◄ ◄ TRACK INBOUND
              </span>
              <span className="text-[10px] text-purple-400/60 uppercase">
                CONVEYOR CIRCUIT
              </span>
              <span className="flex items-center gap-1">
                TRACK OUTBOUND ► ► ►
              </span>
            </div>

            {/* Upper Row inside Loop Track (4 Carts side-by-side) */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {loopTopRacks.map(renderRackCart)}
            </div>

            {/* Track Middle Divider */}
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#4d3d8f] to-transparent" />

            {/* Bottom Row inside Loop Track (1 Cart + 3 Target Trucks) */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {loopBottomRacks.map(renderRackCart)}
              {loopBoxes.map(renderTargetTruck)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
