import {
  AlertCircle,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  Construction,
  Copy,
  Download,
  Eye,
  EyeOff,
  Flame,
  HelpCircle,
  Info,
  Lock,
  Play,
  RotateCw,
  Share2,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import {
  analyzeColorDeficit,
  autoFillBestGuess,
} from '../../lib/loop-sort/deduction';
import { stringifyMap } from '../../lib/loop-sort/parser';
import type {
  LoopSortMap,
  MoveStep,
  Rack,
  TargetBox,
} from '../../lib/loop-sort/types';
import { COLOR_STYLES, getColorStyle } from './colorMap';

const AVAILABLE_PALETTE = [
  'pink',
  'red',
  'yellow',
  'orange',
  'blue',
  'green',
  'purple',
  'magenta',
  'brown',
  'grey',
  '?',
];

interface LoopSortBoardProps {
  map: LoopSortMap;
  activeStep?: MoveStep;
  onMapUpdate?: (updatedMap: LoopSortMap) => void;
}

export const LoopSortBoard: React.FC<LoopSortBoardProps> = ({
  map,
  activeStep,
  onMapUpdate,
}) => {
  const [showFogOfWar, setShowFogOfWar] = useState<boolean>(false);
  const [showDeductionPanel, setShowDeductionPanel] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(
    null,
  );
  const [editingSlot, setEditingSlot] = useState<{
    rackId: string;
    slotIdx: number;
  } | null>(null);

  const topRacks = map.racks.filter((r) => r.section === 'top_shelf');
  const loopRacks = map.racks.filter((r) => r.section === 'loop_track');

  const topBoxes = map.boxes.filter((b) => b.section === 'top_shelf');
  const loopBoxes = map.boxes.filter((b) => b.section === 'loop_track');

  // Split loop track into top row (up to 4) and bottom row
  const loopTopRacks = loopRacks.slice(0, 4);
  const loopBottomRacks = loopRacks.slice(4);

  const hasTopRope = topRacks.some((r) => r.ropeTiedTo) || topRacks.length >= 5;

  const analysis = analyzeColorDeficit(map);

  const handleBlockClick = (rackId: string, slotIdx: number) => {
    if (!onMapUpdate) return;
    setEditingSlot({ rackId, slotIdx });
  };

  const handleSelectColorForSlot = (color: string) => {
    if (!editingSlot || !onMapUpdate) return;
    const { rackId, slotIdx } = editingSlot;

    const newRacks = map.racks.map((r) => {
      if (r.id !== rackId) return r;
      const newBlocks = [...r.blocks];
      newBlocks[slotIdx] = color;
      return {
        ...r,
        blocks: newBlocks,
      };
    });

    onMapUpdate({
      ...map,
      racks: newRacks,
    });
    setEditingSlot(null);
  };

  const handleBestGuessFill = () => {
    if (!onMapUpdate) return;
    const filled = autoFillBestGuess(map);
    onMapUpdate(filled);
  };

  const handleCopyText = () => {
    const text = stringifyMap(map);
    navigator.clipboard.writeText(text);
    setCopiedNotification('Map text copied to clipboard!');
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  const handleDownloadFile = (format: 'txt' | 'json') => {
    let content = '';
    let filename = `${map.name.toLowerCase().replace(/\s+/g, '-')}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(map, null, 2);
    } else {
      content = stringifyMap(map);
      filename = `${map.name.toLowerCase().replace(/\s+/g, '-')}.loop`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderRackCart = (rack: Rack) => {
    const isFrom = activeStep?.fromRackId === rack.id;
    const isTo = activeStep?.toTargetId === rack.id;
    const isIceLocked = Boolean(rack.iceLockedBy);
    const isRopeTied = Boolean(rack.ropeTiedTo);
    const isCovered = Boolean(rack.coveredUntilColorStacked);

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
                  <button
                    key={slotIdx}
                    onClick={() => handleBlockClick(rack.id, slotIdx)}
                    className="h-6 sm:h-7 w-full rounded-lg bg-[#271f4b]/30 border border-dashed border-purple-800/40 flex items-center justify-center hover:bg-purple-800/40 transition-colors cursor-pointer"
                    title="Click to place block color"
                  >
                    <span className="text-[8px] font-mono text-purple-700/60">
                      +
                    </span>
                  </button>
                );
              }

              // Handle fog-of-war obscuring sub-surface blocks
              const isTopBlock = slotIdx === blocks.length - 1;
              const isHiddenByFog = showFogOfWar && !isTopBlock;
              const displayColor = isHiddenByFog ? '?' : rawColor;
              const isMystery = displayColor === '?';
              const style = getColorStyle(displayColor);

              return (
                <button
                  key={slotIdx}
                  onClick={() => handleBlockClick(rack.id, slotIdx)}
                  className={`h-6 sm:h-7 w-full rounded-lg flex items-center justify-center font-mono font-bold text-[10px] uppercase shadow-md transition-all relative overflow-hidden cursor-pointer hover:opacity-90 ${
                    isMystery
                      ? 'bg-gradient-to-b from-slate-700 to-slate-900 border-2 border-dashed border-slate-500 text-slate-300 hover:border-amber-400'
                      : `${style.bg} border-t border-white/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.5)] ${style.text}`
                  }`}
                  title={
                    isMystery
                      ? 'Mystery Slot (Click to reveal/set color)'
                      : `${rawColor} (Click to change)`
                  }
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
                </button>
              );
            })}

            {/* Ice Overlay */}
            {isIceLocked && (
              <div className="absolute inset-0 bg-sky-400/25 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center border-2 border-sky-300/60 z-10 pointer-events-none">
                <Snowflake className="w-5 h-5 text-sky-200 drop-shadow-md animate-pulse" />
                <span className="text-[8px] font-mono font-bold text-sky-100 uppercase bg-sky-950/90 px-1 py-0.5 rounded border border-sky-400/80 mt-1">
                  EMPTY {rack.iceLockedBy}
                </span>
              </div>
            )}

            {/* Covered Shroud Overlay */}
            {isCovered && (
              <div className="absolute inset-0 bg-purple-900/90 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center border-2 border-pink-400/60 z-10 p-1 text-center pointer-events-none">
                <Lock className="w-4 h-4 text-pink-300 mb-1" />
                <span className="text-[7px] font-mono font-bold text-pink-200 uppercase leading-tight">
                  UNTIL {rack.coveredUntilColorStacked?.toUpperCase()} STACKED
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
    const isCovered = Boolean(box.coveredUntilColorStacked);
    const colorStyle = getColorStyle(box.color);
    const coveredStyle = box.coveredUntilColorStacked
      ? getColorStyle(box.coveredUntilColorStacked)
      : colorStyle;

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

          {/* Shroud Cover Overlay (Locked until that color is stacked) */}
          {isCovered && (
            <div
              className={`absolute inset-0 ${coveredStyle.bg} bg-opacity-95 rounded-3xl flex flex-col items-center justify-center p-2 text-center z-20 border-2 border-white/40 shadow-inner`}
            >
              <div className="w-9 h-9 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center mb-2 shadow-md">
                <Box className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <span className="text-[8px] font-mono font-extrabold text-white uppercase leading-tight bg-black/50 px-1 py-0.5 rounded border border-white/30">
                UNTIL {box.coveredUntilColorStacked?.toUpperCase()} STACKED
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar: View Controls, Deduction & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border-2 border-zinc-700 p-3 rounded-lg">
        {/* Left: Mode / Title */}
        <div className="flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-brutalist-cyan" />
          <span className="font-display font-bold text-sm text-white uppercase tracking-wider">
            [ INTERACTIVE_BOARD_STUDIO ]
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Fog-of-War Toggle */}
          <button
            onClick={() => setShowFogOfWar(!showFogOfWar)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold uppercase transition-all border-2 ${
              showFogOfWar
                ? 'bg-amber-500 text-black border-amber-300 shadow-sm'
                : 'bg-zinc-800 text-zinc-300 border-zinc-600 hover:text-white'
            }`}
            title="Toggle between In-Game presentation (mystery ? blocks) and Oracle View"
          >
            {showFogOfWar ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Fog-of-War: ON</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Exposed View</span>
              </>
            )}
          </button>

          {/* Color Deficit Inspector Toggle */}
          <button
            onClick={() => setShowDeductionPanel(!showDeductionPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold uppercase transition-all border-2 ${
              showDeductionPanel
                ? 'bg-brutalist-cyan text-black border-cyan-300'
                : 'bg-zinc-800 text-zinc-300 border-zinc-600 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deduction Engine ({analysis.totalMysterySlots} ?)</span>
          </button>

          {/* Best Guess Auto-Fill Button */}
          {analysis.totalMysterySlots > 0 && onMapUpdate && (
            <button
              onClick={handleBestGuessFill}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold uppercase transition-all bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-400 shadow-sm"
              title="Automatically populate mystery ? slots based on target box deficit"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Best Guess Auto-Fill</span>
            </button>
          )}

          {/* Export State Actions */}
          <div className="flex items-center gap-1 border-l border-zinc-700 pl-2">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded font-mono text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
              title="Copy current state as structured text"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>

            <button
              onClick={() => handleDownloadFile('txt')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded font-mono text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
              title="Download .loop map file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.loop</span>
            </button>

            <button
              onClick={() => handleDownloadFile('json')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded font-mono text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
              title="Download JSON map file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Copy Notification Banner */}
      {copiedNotification && (
        <div className="p-2 bg-emerald-900/90 border-2 border-emerald-400 text-emerald-200 font-mono text-xs text-center rounded flex items-center justify-center gap-2 animate-fade-in">
          <Check className="w-4 h-4" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Deduction & Mystery Breakdown Panel */}
      {showDeductionPanel && (
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-brutalist-cyan space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-zinc-700 pb-2">
            <span className="font-bold text-sm text-brutalist-cyan uppercase flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>[ FOG_OF_WAR_COLOR_DEDUCTION_INSPECTOR ]</span>
            </span>
            <span className="text-xs text-zinc-400">
              {analysis.totalMysterySlots} Mystery Slots Remaining
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* 1. Demand */}
            <div className="p-3 bg-black border border-zinc-700 rounded">
              <span className="font-bold text-zinc-300 block mb-1">
                Target Box Demand:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(analysis.demanded).map(([color, count]) => (
                  <span
                    key={color}
                    className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-[11px]"
                  >
                    {color}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* 2. Exposed */}
            <div className="p-3 bg-black border border-zinc-700 rounded">
              <span className="font-bold text-zinc-300 block mb-1">
                Visible/Exposed on Board:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(analysis.exposed).map(([color, count]) => (
                  <span
                    key={color}
                    className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-[11px]"
                  >
                    {color}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* 3. Inferred Deficit */}
            <div className="p-3 bg-black border-2 border-emerald-500 rounded">
              <span className="font-bold text-emerald-400 block mb-1">
                Inferred Missing Deficit:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(analysis.deficit).length === 0 ? (
                  <span className="text-zinc-500">No color deficits!</span>
                ) : (
                  Object.entries(analysis.deficit).map(([color, count]) => (
                    <span
                      key={color}
                      className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-400 text-emerald-200 text-[11px]"
                    >
                      {color}: <strong>+{count}</strong>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Slot Color Picker Modal */}
      {editingSlot && (
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-brutalist-pink space-y-3 font-mono animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-brutalist-pink uppercase">
              SELECT COLOR FOR {editingSlot.rackId} (SLOT{' '}
              {editingSlot.slotIdx + 1})
            </span>
            <button
              onClick={() => setEditingSlot(null)}
              className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 border border-zinc-600 rounded"
            >
              Cancel
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {AVAILABLE_PALETTE.map((c) => {
              const style = getColorStyle(c);
              return (
                <button
                  key={c}
                  onClick={() => handleSelectColorForSlot(c)}
                  className={`px-3 py-1.5 rounded font-mono font-bold text-xs uppercase border-2 shadow-sm transition-transform hover:scale-105 ${style.bg} ${style.border} ${style.text}`}
                >
                  {c === '?' ? 'MYSTERY (?)' : c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Game Board Canvas Container */}
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
