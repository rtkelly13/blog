import {
  AlertTriangle,
  CheckCircle,
  Cpu,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { MoveStep, SolverResult } from '../../lib/loop-sort/types';

interface SolutionControlsProps {
  result: SolverResult | null;
  currentStepIndex: number; // 0 = start state, 1..N = after step N
  onStepChange: (stepIndex: number) => void;
  onSolveRequest: () => void;
  isSolving: boolean;
}

export const SolutionControls: React.FC<SolutionControlsProps> = ({
  result,
  currentStepIndex,
  onStepChange,
  onSolveRequest,
  isSolving,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1000); // ms per step

  const totalSteps = result?.steps.length || 0;

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || !result || totalSteps === 0) return;

    if (currentStepIndex >= totalSteps) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      onStepChange(currentStepIndex + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, totalSteps, result, speed, onStepChange]);

  const activeStep: MoveStep | null =
    result && currentStepIndex > 0 ? result.steps[currentStepIndex - 1] : null;

  return (
    <div className="border-2 border-white bg-zinc-900 p-4 space-y-4">
      {/* Header & Solve Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-zinc-700 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-brutalist-yellow" />
          <h3 className="font-display font-bold text-lg text-white uppercase">
            [ SOLVER_ENGINE_SOLUTION ]
          </h3>
        </div>

        <button
          type="button"
          onClick={onSolveRequest}
          disabled={isSolving}
          className="px-5 py-2 bg-brutalist-pink text-white font-mono font-bold text-xs uppercase border-2 border-white hover:bg-pink-600 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
        >
          {isSolving ? 'Solving Puzzle...' : 'Run Solver Engine'}
        </button>
      </div>

      {/* Solver Metrics Summary */}
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-black border-2 border-white p-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            {result.solved ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span
              className={
                result.solved
                  ? 'text-emerald-400 font-bold'
                  : 'text-red-400 font-bold'
              }
            >
              {result.solved
                ? `[ SOLVED IN ${totalSteps} MOVES ]`
                : `[ NO SOLUTION FOUND ]`}
            </span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <span>
              Visited: {result.visitedStatesCount.toLocaleString()} states
            </span>
            <span>Time: {result.executionTimeMs.toFixed(1)} ms</span>
          </div>
        </div>
      )}

      {/* Playback Controls */}
      {result?.solved && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-800 p-3 border-2 border-zinc-700">
            {/* Step buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  onStepChange(0);
                }}
                disabled={currentStepIndex === 0}
                className="p-2 bg-black border border-white text-white hover:border-brutalist-cyan disabled:opacity-40"
                title="Reset to Start"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  onStepChange(Math.max(0, currentStepIndex - 1));
                }}
                disabled={currentStepIndex === 0}
                className="p-2 bg-black border border-white text-white hover:border-brutalist-cyan disabled:opacity-40"
                title="Previous Step"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 bg-brutalist-cyan text-black font-mono font-bold text-xs uppercase flex items-center gap-2 border border-white hover:bg-cyan-300"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  onStepChange(Math.min(totalSteps, currentStepIndex + 1));
                }}
                disabled={currentStepIndex >= totalSteps}
                className="p-2 bg-black border border-white text-white hover:border-brutalist-cyan disabled:opacity-40"
                title="Next Step"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
              <span>SPEED:</span>
              {[
                { label: '0.5x', ms: 1600 },
                { label: '1x', ms: 1000 },
                { label: '2x', ms: 500 },
                { label: '4x', ms: 250 },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setSpeed(s.ms)}
                  className={`px-2 py-1 border text-xs ${
                    speed === s.ms
                      ? 'border-brutalist-yellow text-brutalist-yellow font-bold bg-black'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Current Step Description Banner */}
          <div className="p-3 bg-black border-2 border-brutalist-cyan font-mono text-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span className="text-brutalist-cyan font-bold">
                STEP {currentStepIndex} / {totalSteps}
              </span>
              <span>
                {currentStepIndex === 0 ? 'STARTING STATE' : activeStep?.type}
              </span>
            </div>
            <p className="text-white">
              {currentStepIndex === 0
                ? 'Initial map layout state. Click Play or Next Step to begin solution playback.'
                : activeStep?.description}
            </p>
          </div>

          {/* Timeline Step List */}
          <div className="max-h-48 overflow-y-auto border-2 border-zinc-700 bg-black p-2 space-y-1 font-mono text-xs">
            {result.steps.map((step) => {
              const isActive = step.stepIndex === currentStepIndex;
              return (
                <button
                  type="button"
                  key={step.stepIndex}
                  onClick={() => {
                    setIsPlaying(false);
                    onStepChange(step.stepIndex);
                  }}
                  className={`w-full text-left p-2 border cursor-pointer flex items-center justify-between transition-colors ${
                    isActive
                      ? 'border-brutalist-pink bg-zinc-800 text-brutalist-pink font-bold'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  <span>
                    #{step.stepIndex}. {step.description}
                  </span>
                  <span className="text-[10px] uppercase text-zinc-500">
                    {step.type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
