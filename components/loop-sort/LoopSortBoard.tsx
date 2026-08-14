import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  Construction,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  Flame,
  HelpCircle,
  Info,
  Lock,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Share2,
  ShieldAlert,
  SkipBack,
  SkipForward,
  Snowflake,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import {
  analyzeColorDeficit,
  autoFillBestGuess,
} from '../../lib/loop-sort/deduction';
import { stringifyMap } from '../../lib/loop-sort/parser';
import { solveLoopSort } from '../../lib/loop-sort/solver';
import type {
  LoopSortMap,
  MoveStep,
  Rack,
  SolverResult,
  TargetBox,
} from '../../lib/loop-sort/types';
import { AVAILABLE_PALETTE, COLOR_STYLES, getColorStyle } from './colorMap';

interface LoopSortBoardProps {
  map: LoopSortMap;
  activeStep?: MoveStep;
  solverResult: SolverResult | null;
  currentStepIndex: number;
  onStepChange: (stepIndex: number) => void;
  onSolveRequest: () => void;
  isSolving: boolean;
  onMapUpdate?: (updatedMap: LoopSortMap) => void;
}

export const LoopSortBoard: React.FC<LoopSortBoardProps> = ({
  map,
  activeStep,
  solverResult,
  currentStepIndex,
  onStepChange,
  onSolveRequest,
  isSolving,
  onMapUpdate,
}) => {
  const [showFogOfWar, setShowFogOfWar] = useState<boolean>(false);
  const [showDeductionPanel, setShowDeductionPanel] = useState<boolean>(false);
  const [isPlayingSolution, setIsPlayingSolution] = useState<boolean>(false);
  const [stepSpeedMs, setStepSpeedMs] = useState<number>(1800); // Generous 1.8s gap
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

  // Split loop track into top row (4 carts) and bottom row (1 cart + trucks)
  const loopTopRacks = loopRacks.slice(0, 4);
  const loopBottomRacks = loopRacks.slice(4);

  const hasTopRope = topRacks.some((r) => r.ropeTiedTo) || topRacks.length >= 5;

  const analysis = analyzeColorDeficit(map);
  const totalSteps = solverResult?.steps.length || 0;

  // Auto-play timer with generous gap between steps
  useEffect(() => {
    if (!isPlayingSolution || !solverResult || totalSteps === 0) return;

    if (currentStepIndex >= totalSteps) {
      setIsPlayingSolution(false);
      return;
    }

    const timer = setTimeout(() => {
      onStepChange(currentStepIndex + 1);
    }, stepSpeedMs);

    return () => clearTimeout(timer);
  }, [
    isPlayingSolution,
    currentStepIndex,
    totalSteps,
    solverResult,
    stepSpeedMs,
    onStepChange,
  ]);

  // Find any top-of-stack mystery block currently exposed and needing human revelation
  const exposedMysteryRacks = map.racks.filter((rack) => {
    if (rack.blocks.length === 0) return false;
    const topBlock = rack.blocks[rack.blocks.length - 1];
    return topBlock === '?' || topBlock === 'hidden' || topBlock === 'mystery';
  });

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

    const updated = {
      ...map,
      racks: newRacks,
    };

    onMapUpdate(updated);
    setEditingSlot(null);
  };

  const handleQuickRevealMystery = (rackId: string, color: string) => {
    if (!onMapUpdate) return;
    const targetRack = map.racks.find((r) => r.id === rackId);
    if (!targetRack || targetRack.blocks.length === 0) return;

    const topIdx = targetRack.blocks.length - 1;
    const newRacks = map.racks.map((r) => {
      if (r.id !== rackId) return r;
      const newBlocks = [...r.blocks];
      newBlocks[topIdx] = color;
      return {
        ...r,
        blocks: newBlocks,
      };
    });

    const updated = {
      ...map,
      racks: newRacks,
    };

    onMapUpdate(updated);
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

  const renderRackCart = (rack: Rack, isOrientationInverted = false) => {
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
        className="relative flex flex-col items-center select-none transition-transform duration-200"
        style={{
          transform: isFrom || isTo ? 'scale(1.06) translateY(-4px)' : 'none',
          zIndex: isFrom || isTo ? 30 : 1,
        }}
      >
        {/* Cart Chassis Container */}
        <div
          className="w-[58px] sm:w-[68px] p-1.5 pb-2 flex flex-col items-center shadow-2xl relative"
          style={{
            borderRadius: '18px',
            background: isFrom
              ? 'linear-gradient(180deg, #0284c7 0%, #1e1b4b 100%)'
              : isTo
                ? 'linear-gradient(180deg, #ec4899 0%, #3b0764 100%)'
                : isIceLocked
                  ? 'linear-gradient(180deg, #0369a1 0%, #0f172a 100%)'
                  : 'linear-gradient(180deg, #604d9c 0%, #322368 100%)',
            border: isFrom
              ? '3px solid #22d3ee'
              : isTo
                ? '3px solid #ec4899'
                : isIceLocked
                  ? '3px solid #38bdf8'
                  : '2px solid #7c68ba',
            boxShadow: isFrom
              ? '0 0 18px rgba(34, 211, 238, 0.9)'
              : isTo
                ? '0 0 18px rgba(236, 72, 153, 0.9)'
                : '0 8px 16px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Header ID Label & Badges */}
          <div className="flex items-center justify-between w-full px-1 mb-1">
            <span
              className="font-mono font-black text-[10px] tracking-wider"
              style={{ color: '#e9d5ff' }}
            >
              {rack.id}
            </span>
            {isIceLocked && (
              <span title={`Frozen until ${rack.iceLockedBy} is empty`}>
                <Snowflake
                  className="w-3 h-3 animate-pulse"
                  style={{ color: '#7dd3fc' }}
                />
              </span>
            )}
            {isRopeTied && (
              <span title={`Rope-tied until ${rack.ropeTiedTo} is solved`}>
                <Lock className="w-3 h-3" style={{ color: '#fde047' }} />
              </span>
            )}
            {rack.isConstruction && (
              <span title="Under Construction">
                <Construction
                  className="w-3 h-3"
                  style={{ color: '#facc15' }}
                />
              </span>
            )}
          </div>

          {/* Cart Well Cavity */}
          <div
            className="w-full p-1 flex flex-col-reverse gap-1 min-h-[120px] justify-start relative overflow-hidden"
            style={{
              borderRadius: '12px',
              backgroundColor: '#16122d',
              border: '1px solid rgba(124, 104, 186, 0.3)',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8)',
            }}
          >
            {Array.from({ length: cap }).map((_, slotIdx) => {
              const rawColor = blocks[slotIdx];

              if (!rawColor) {
                return (
                  <button
                    key={slotIdx}
                    onClick={() => handleBlockClick(rack.id, slotIdx)}
                    className="h-6 sm:h-7 w-full flex items-center justify-center transition-colors cursor-pointer"
                    style={{
                      borderRadius: '8px',
                      backgroundColor: 'rgba(39, 31, 75, 0.4)',
                      border: '1px dashed rgba(147, 112, 219, 0.3)',
                    }}
                    title="Click to place block color"
                  >
                    <span
                      className="text-[8px] font-mono"
                      style={{ color: '#7c68ba' }}
                    >
                      +
                    </span>
                  </button>
                );
              }

              const isTopBlock = slotIdx === blocks.length - 1;
              const isHiddenByFog = showFogOfWar && !isTopBlock;
              const displayColor = isHiddenByFog ? '?' : rawColor;
              const isMystery = displayColor === '?';
              const style = getColorStyle(displayColor);

              return (
                <button
                  key={slotIdx}
                  onClick={() => handleBlockClick(rack.id, slotIdx)}
                  className="h-6 sm:h-7 w-full flex items-center justify-center font-mono font-black text-[10px] uppercase transition-transform relative overflow-hidden cursor-pointer hover:opacity-90"
                  style={{
                    borderRadius: '8px',
                    background: style.gradient,
                    border: `1px solid ${style.borderHex}`,
                    color: style.textHex,
                    boxShadow: isMystery
                      ? 'none'
                      : 'inset 0 1px 2px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.5)',
                  }}
                  title={
                    isMystery
                      ? 'Mystery Slot (Click to reveal/set color)'
                      : `${rawColor} (Click to change)`
                  }
                >
                  {/* Gloss highlight stripe */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none"
                    style={{
                      borderRadius: '7px 7px 0 0',
                      backgroundColor: 'rgba(255, 255, 255, 0.22)',
                    }}
                  />

                  {isMystery ? (
                    <span
                      className="font-black drop-shadow animate-pulse"
                      style={{ color: '#fde047' }}
                    >
                      ?
                    </span>
                  ) : (
                    <span className="drop-shadow-sm truncate px-0.5 z-10">
                      {rawColor.slice(0, 3)}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Ice Overlay */}
            {isIceLocked && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
                style={{
                  borderRadius: '12px',
                  backgroundColor: 'rgba(56, 189, 248, 0.28)',
                  backdropFilter: 'blur(1px)',
                  border: '2px solid rgba(125, 211, 252, 0.7)',
                }}
              >
                <Snowflake
                  className="w-5 h-5 drop-shadow animate-pulse"
                  style={{ color: '#e0f2fe' }}
                />
                <span
                  className="text-[8px] font-mono font-bold uppercase px-1 py-0.5 mt-1"
                  style={{
                    borderRadius: '4px',
                    backgroundColor: 'rgba(3, 105, 161, 0.95)',
                    color: '#ffffff',
                    border: '1px solid #38bdf8',
                  }}
                >
                  EMPTY {rack.iceLockedBy}
                </span>
              </div>
            )}

            {/* Covered Shroud Overlay */}
            {isCovered && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center pointer-events-none z-10"
                style={{
                  borderRadius: '12px',
                  backgroundColor: 'rgba(88, 28, 135, 0.92)',
                  border: '2px solid #ec4899',
                }}
              >
                <Lock className="w-4 h-4 mb-1" style={{ color: '#f472b6' }} />
                <span
                  className="text-[7px] font-mono font-bold uppercase leading-tight"
                  style={{ color: '#fbcfe8' }}
                >
                  UNTIL {rack.coveredUntilColorStacked?.toUpperCase()} STACKED
                </span>
              </div>
            )}
          </div>

          {/* Cart Wheels / Headlights at Bottom (Facing direction) */}
          <div className="flex items-center justify-between w-full px-2 pt-1.5">
            <div
              className="w-2 h-1.5 shadow-sm"
              style={{
                borderRadius: '9999px',
                backgroundColor: '#fbbf24',
                boxShadow: '0 0 5px #fbbf24',
              }}
            />
            <div
              className="w-4 h-1"
              style={{
                borderRadius: '2px',
                backgroundColor: '#1b1535',
              }}
            />
            <div
              className="w-2 h-1.5 shadow-sm"
              style={{
                borderRadius: '9999px',
                backgroundColor: '#fbbf24',
                boxShadow: '0 0 5px #fbbf24',
              }}
            />
          </div>
        </div>

        {/* Color Filter Badge if present */}
        {rack.allowedColors && rack.allowedColors.length > 0 && (
          <div
            className="mt-1 px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-tighter truncate max-w-[68px] text-center"
            style={{
              borderRadius: '4px',
              backgroundColor: '#4c1d95',
              border: '1px solid #a855f7',
              color: '#f3e8ff',
            }}
          >
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
        className="relative flex flex-col items-center select-none transition-transform duration-200"
        style={{
          transform: isTo ? 'scale(1.06) translateY(-4px)' : 'none',
          zIndex: isTo ? 30 : 1,
        }}
      >
        {/* Truck Capsule Container */}
        <div
          className="w-[60px] sm:w-[70px] h-[150px] p-2 flex flex-col justify-between items-center relative overflow-hidden shadow-2xl"
          style={{
            borderRadius: '24px',
            background: box.isConstruction
              ? 'linear-gradient(180deg, #92400e 0%, #451a03 100%)'
              : colorStyle.gradient,
            border: isTo
              ? '3px solid #ec4899'
              : isCompleted
                ? '3px solid #facc15'
                : `2px solid ${colorStyle.borderHex}`,
            boxShadow: isTo
              ? '0 0 18px rgba(236, 72, 153, 0.9)'
              : '0 8px 16px rgba(0, 0, 0, 0.6), inset 0 2px 6px rgba(255,255,255,0.4)',
          }}
        >
          {/* Top Capsule Roof Highlight */}
          <div
            className="absolute top-0 left-2 right-2 h-4 pointer-events-none"
            style={{
              borderRadius: '0 0 16px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            }}
          />

          {/* Truck Header ID */}
          <span
            className="font-mono font-black text-[9px] uppercase tracking-wider drop-shadow z-10"
            style={{ color: '#ffffff' }}
          >
            {box.id}
          </span>

          {/* Center Isometric Cube Badge */}
          <div className="my-auto flex flex-col items-center justify-center z-10">
            <div
              className="w-10 h-10 flex items-center justify-center shadow-inner"
              style={{
                borderRadius: '14px',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
              }}
            >
              {isCompleted ? (
                <CheckCircle2
                  className="w-6 h-6 animate-bounce"
                  style={{ color: '#ffffff' }}
                />
              ) : box.isConstruction ? (
                <Construction
                  className="w-5 h-5"
                  style={{ color: '#fef08a' }}
                />
              ) : (
                <Box
                  className="w-6 h-6 stroke-[2.4]"
                  style={{ color: '#ffffff' }}
                />
              )}
            </div>

            {/* Fill Progress Counter */}
            <div
              className="mt-1 font-mono font-black text-xs drop-shadow flex items-center gap-0.5"
              style={{ color: '#ffffff' }}
            >
              <span>{box.filled}</span>
              <span style={{ opacity: 0.7, fontSize: '10px' }}>
                /{box.capacity}
              </span>
            </div>
          </div>

          {/* Bottom Fill Level Indicator Bar */}
          <div
            className="w-full p-0.5 z-10"
            style={{
              borderRadius: '9999px',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <div
              className="h-1.5 transition-all duration-300 shadow-sm"
              style={{
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
                width: `${Math.min(100, (box.filled / box.capacity) * 100)}%`,
              }}
            />
          </div>

          {/* Shroud Cover Overlay (Locked until that color is stacked) */}
          {isCovered && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center z-20 shadow-inner"
              style={{
                borderRadius: '24px',
                background: coveredStyle.gradient,
                border: '2px solid rgba(255, 255, 255, 0.5)',
              }}
            >
              <div
                className="w-9 h-9 flex items-center justify-center mb-1.5 shadow-md"
                style={{
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
              >
                <Box
                  className="w-5 h-5 stroke-[2.6]"
                  style={{ color: '#ffffff' }}
                />
              </div>
              <span
                className="text-[8px] font-mono font-black uppercase leading-tight px-1 py-0.5"
                style={{
                  borderRadius: '4px',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
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
      {/* 1. TOP INTERACTIVE SOLVER HUD */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-2 border-brutalist-cyan p-4 rounded-2xl shadow-xl space-y-3 font-mono">
        {/* HUD Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSolveRequest}
              disabled={isSolving}
              className="px-5 py-2.5 bg-brutalist-pink text-white font-bold text-xs uppercase border-2 border-white hover:bg-pink-600 active:scale-95 disabled:opacity-50 flex items-center gap-2 rounded shadow-md cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              <span>{isSolving ? 'Solving Level...' : 'Run Auto-Solver'}</span>
            </button>

            {solverResult?.solved && (
              <span className="text-xs text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/60 px-2.5 py-1 rounded">
                Solved ({totalSteps} steps)
              </span>
            )}
          </div>

          {/* Stepping Controls */}
          {solverResult?.solved && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPlayingSolution(false);
                  onStepChange(0);
                }}
                disabled={currentStepIndex === 0}
                className="p-2 bg-black border border-zinc-600 text-white hover:border-brutalist-cyan disabled:opacity-30 rounded cursor-pointer"
                title="Reset to initial state"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlayingSolution(false);
                  onStepChange(Math.max(0, currentStepIndex - 1));
                }}
                disabled={currentStepIndex === 0}
                className="p-2 bg-black border border-zinc-600 text-white hover:border-brutalist-cyan disabled:opacity-30 rounded cursor-pointer"
                title="Step Back"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsPlayingSolution(!isPlayingSolution)}
                className="px-4 py-2 bg-brutalist-cyan text-black font-bold text-xs uppercase flex items-center gap-1.5 border border-white hover:bg-cyan-300 rounded cursor-pointer shadow-sm"
              >
                {isPlayingSolution ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Auto-Step</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlayingSolution(false);
                  onStepChange(Math.min(totalSteps, currentStepIndex + 1));
                }}
                disabled={currentStepIndex >= totalSteps}
                className="px-3.5 py-2 bg-emerald-600 text-white font-bold text-xs uppercase flex items-center gap-1 border border-emerald-400 hover:bg-emerald-500 disabled:opacity-30 rounded cursor-pointer shadow-sm"
                title="Execute Next Step"
              >
                <span>Next Move</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Step Gap Selector */}
              <div className="flex items-center gap-1 pl-2 border-l border-zinc-700 text-[11px] text-zinc-400">
                <span className="text-[10px]">GAP:</span>
                {[
                  { label: '1.2s', ms: 1200 },
                  { label: '1.8s', ms: 1800 },
                  { label: '3s', ms: 3000 },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setStepSpeedMs(s.ms)}
                    className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${
                      stepSpeedMs === s.ms
                        ? 'bg-brutalist-yellow text-black font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Exporters */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyText}
              className="px-2.5 py-1.5 rounded text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 cursor-pointer"
              title="Copy map to clipboard"
            >
              <Copy className="w-3.5 h-3.5 inline mr-1" />
              <span>Copy</span>
            </button>
            <button
              onClick={() => handleDownloadFile('txt')}
              className="px-2.5 py-1.5 rounded text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 cursor-pointer"
              title="Download .loop file"
            >
              <Download className="w-3.5 h-3.5 inline mr-1" />
              <span>.loop</span>
            </button>
          </div>
        </div>

        {/* HUD Middle: Active Step Guidance Banner */}
        {solverResult?.solved ? (
          <div className="p-3 bg-black border border-brutalist-cyan/60 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-white">
              <span className="text-brutalist-cyan font-black bg-cyan-950 border border-cyan-500/50 px-2 py-0.5 rounded">
                STEP {currentStepIndex}/{totalSteps}
              </span>
              <p className="font-bold">
                {currentStepIndex === 0
                  ? 'Initial board state. Click "Next Move" or "Auto-Step" to progress.'
                  : activeStep?.description}
              </p>
            </div>
            {activeStep && (
              <span className="text-[10px] text-zinc-400 uppercase bg-zinc-800 px-2 py-0.5 rounded">
                {activeStep.type}
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-brutalist-yellow" />
            <span>
              Click <strong>"Run Auto-Solver"</strong> to compute the optimal
              move path, or fill in mystery slots to assist the solver.
            </span>
          </div>
        )}

        {/* HUD In-Flight Mystery Reveal Prompt */}
        {exposedMysteryRacks.length > 0 && onMapUpdate && (
          <div className="p-3 bg-amber-950/90 border-2 border-amber-400 rounded-xl space-y-2 animate-fade-in shadow-lg">
            <div className="flex items-center justify-between text-xs text-amber-200">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  FOG-OF-WAR UNCOVERED: What color appeared in{' '}
                  {exposedMysteryRacks[0].id}?
                </span>
              </span>
              <span className="text-[10px] text-amber-400/80">
                Click a color to update & assist solver
              </span>
            </div>

            {/* Quick 1-click color swatch row */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {AVAILABLE_PALETTE.filter((c) => c !== '?').map((c) => {
                const style = getColorStyle(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      handleQuickRevealMystery(exposedMysteryRacks[0].id, c)
                    }
                    className="px-2.5 py-1 font-bold text-xs uppercase shadow-sm transition-transform hover:scale-105 cursor-pointer"
                    style={{
                      borderRadius: '6px',
                      background: style.gradient,
                      border: `1px solid ${style.borderHex}`,
                      color: style.textHex,
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Copy Notification Toast */}
      {copiedNotification && (
        <div className="p-2 bg-emerald-900/90 border-2 border-emerald-400 text-emerald-200 font-mono text-xs text-center rounded flex items-center justify-center gap-2 animate-fade-in">
          <Check className="w-4 h-4" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Inline Slot Color Picker Modal */}
      {editingSlot && (
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-brutalist-pink space-y-3 font-mono animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-brutalist-pink uppercase">
              ASSIGN COLOR TO {editingSlot.rackId} (SLOT{' '}
              {editingSlot.slotIdx + 1})
            </span>
            <button
              onClick={() => setEditingSlot(null)}
              className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 border border-zinc-600 rounded cursor-pointer"
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
                  className="px-3 py-1.5 font-mono font-black text-xs uppercase border shadow-md transition-transform hover:scale-105 cursor-pointer"
                  style={{
                    borderRadius: '8px',
                    background: style.gradient,
                    borderColor: style.borderHex,
                    color: style.textHex,
                  }}
                >
                  {c === '?' ? 'MYSTERY (?)' : c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Game Board Canvas Container (Integrated Loop Track Presentation) */}
      <div
        className="p-4 sm:p-8 space-y-6 select-none mx-auto max-w-4xl shadow-2xl relative"
        style={{
          borderRadius: '36px',
          background: 'linear-gradient(180deg, #181538 0%, #110e28 100%)',
          border: '4px solid #332766',
          boxShadow:
            '0 20px 40px rgba(0,0,0,0.8), inset 0 2px 8px rgba(255,255,255,0.1)',
        }}
      >
        {/* 1. UPPER QUEUE LOOP TRACK (Wrapped with Rope if locked) */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2 px-2">
            <span
              className="font-mono font-bold text-xs uppercase tracking-widest flex items-center gap-1.5"
              style={{ color: '#d8b4fe' }}
            >
              <span>QUEUE LOOP STAGING</span>
              {hasTopRope && (
                <span
                  className="text-[10px] font-black px-1.5 py-0.5"
                  style={{
                    borderRadius: '4px',
                    backgroundColor: 'rgba(69, 26, 3, 0.9)',
                    border: '1px solid #f59e0b',
                    color: '#fef08a',
                  }}
                >
                  BOUND BY ROPE
                </span>
              )}
            </span>
            <span
              className="font-mono text-xs font-bold"
              style={{ color: '#c084fc' }}
            >
              LEVEL {map.level || 259}
            </span>
          </div>

          {/* Queue Track Rail Container */}
          <div
            className="relative p-3 sm:p-4 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5"
            style={{
              borderRadius: '28px',
              backgroundColor: 'rgba(35, 27, 70, 0.75)',
              border: hasTopRope ? '4px solid #d97706' : '3px solid #4a3880',
              boxShadow: hasTopRope
                ? '0 0 20px rgba(217, 119, 6, 0.45)'
                : 'inset 0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {hasTopRope && (
              <>
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 text-[9px] font-mono font-black shadow-md uppercase tracking-wider z-20 flex items-center gap-1"
                  style={{
                    borderRadius: '9999px',
                    backgroundColor: '#854d0e',
                    border: '2px solid #fef08a',
                    color: '#ffffff',
                  }}
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>ROPE BOUND SHELF</span>
                </div>
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    borderRadius: '24px',
                    border: '3px dashed rgba(254, 240, 138, 0.35)',
                  }}
                />
              </>
            )}

            {/* Top Shelf Racks */}
            {topRacks.map((r) => renderRackCart(r))}

            {/* Top Shelf Target Boxes / Goal Truck */}
            {topBoxes.map(renderTargetTruck)}
          </div>
        </div>

        {/* Track Junction Flow Arrows */}
        <div className="flex items-center justify-between px-8 text-[#8670d8] font-mono text-[11px]">
          <div className="flex items-center gap-1">
            <ArrowUp className="w-4 h-4 animate-pulse" />
            <span>CIRCUIT INLET</span>
          </div>
          <div className="flex items-center gap-1">
            <span>CIRCUIT OUTLET</span>
            <ArrowDown className="w-4 h-4 animate-pulse" />
          </div>
        </div>

        {/* 2. CONTINUOUS CONVEYOR LOOP CIRCUIT TRACK */}
        <div
          className="relative p-4 sm:p-6 shadow-inner"
          style={{
            borderRadius: '32px',
            backgroundColor: '#22194a',
            border: '5px solid #3c2c78',
            boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.6)',
          }}
        >
          {/* Conveyor Track Perimeter with Directional Arrows */}
          <div
            className="p-4 sm:p-6 relative space-y-6"
            style={{
              borderRadius: '24px',
              backgroundColor: '#151032',
              border: '3px dashed rgba(124, 104, 186, 0.6)',
            }}
          >
            {/* Conveyor Belt Direction Chevrons */}
            <div
              className="flex items-center justify-between text-[11px] font-mono font-black px-2"
              style={{ color: '#a78bfa' }}
            >
              <span className="flex items-center gap-1">
                ◄ ◄ ◄ TRACK INBOUND
              </span>
              <span
                className="text-[10px] uppercase font-bold"
                style={{ color: '#7c68ba' }}
              >
                CONTINUOUS CONVEYOR TRACK
              </span>
              <span className="flex items-center gap-1">
                TRACK OUTBOUND ► ► ►
              </span>
            </div>

            {/* Upper Row inside Loop Track (4 Carts side-by-side) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
              {loopTopRacks.map((r) => renderRackCart(r))}
            </div>

            {/* Track Middle Divider */}
            <div
              className="h-0.5 w-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, #4c3a88 50%, transparent 100%)',
              }}
            />

            {/* Bottom Row inside Loop Track (1 Cart + 3 Target Trucks) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
              {loopBottomRacks.map((r) => renderRackCart(r))}
              {loopBoxes.map(renderTargetTruck)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
