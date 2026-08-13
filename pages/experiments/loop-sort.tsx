import { ArrowLeft, FileCode, Gamepad2, Layers } from 'lucide-react';
import { useState } from 'react';
import Link from '@/components/Link';
import { LoopSortBoard } from '@/components/loop-sort/LoopSortBoard';
import { MapTextPanel } from '@/components/loop-sort/MapTextPanel';
import { SolutionControls } from '@/components/loop-sort/SolutionControls';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';
import { LEVEL_259_EXPOSED } from '@/lib/loop-sort/presets';
import { solveLoopSort } from '@/lib/loop-sort/solver';
import type {
  LoopSortMap,
  MoveStep,
  SolverResult,
} from '@/lib/loop-sort/types';

export default function LoopSortExperimentPage() {
  const [map, setMap] = useState<LoopSortMap>(LEVEL_259_EXPOSED);
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isSolving, setIsSolving] = useState<boolean>(false);

  const handleMapChange = (newMap: LoopSortMap) => {
    setMap(newMap);
    setSolverResult(null);
    setCurrentStepIndex(0);
  };

  const handleRunSolver = () => {
    setIsSolving(true);
    setTimeout(() => {
      const res = solveLoopSort(map);
      setSolverResult(res);
      setCurrentStepIndex(0);
      setIsSolving(false);
    }, 50);
  };

  // Determine displayed map state based on current step
  const displayedMap: LoopSortMap =
    solverResult && currentStepIndex > 0
      ? solverResult.steps[currentStepIndex - 1]?.snapshot || map
      : map;

  const activeStep: MoveStep | undefined =
    solverResult && currentStepIndex > 0
      ? solverResult.steps[currentStepIndex - 1]
      : undefined;

  return (
    <>
      <PageSEO
        title={`Loop Sort Puzzle Solver - ${siteMetadata.author}`}
        description="Interactive solver and visualization engine for Loop Sort puzzle maps, accepting structured text files in fully exposed form."
      />

      <div className="divide-y divide-white border-2 border-white bg-black min-h-screen">
        {/* Header Hero */}
        <div className="pt-8 pb-10 px-6 bg-zinc-900 border-b-2 border-white">
          <div className="max-w-5xl mx-auto">
            <Link
              href="/experiments"
              className="inline-flex items-center gap-2 font-mono text-xs text-brutalist-cyan hover:text-white uppercase mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Back to Experiments</span>
            </Link>

            <div className="flex items-center gap-4 mb-4">
              <Gamepad2 className="w-10 h-10 text-brutalist-cyan" />
              <h1 className="text-3xl font-display font-bold uppercase text-white md:text-5xl">
                [ LOOP_SORT_SOLVER ]
              </h1>
            </div>

            <p className="text-base font-mono text-zinc-300 max-w-3xl leading-relaxed">
              <span className="text-brutalist-yellow">&gt;</span> An interactive
              solver engine for{' '}
              <span className="text-brutalist-cyan">Loop Sort</span> puzzle
              levels. Upload or edit structured map files in fully exposed form,
              switch color schemes, and step through the computed optimal
              solution path.
            </p>
          </div>
        </div>

        {/* Main Content Workspace */}
        <div className="py-8 px-4 md:px-6 max-w-6xl mx-auto space-y-8">
          {/* Visualizer Board */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-zinc-700 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-brutalist-cyan" />
                <h2 className="font-display font-bold text-xl text-white uppercase">
                  [ PUZZLE_LEVEL_VISUALIZER ]
                </h2>
              </div>
              <span className="font-mono text-xs text-brutalist-cyan">
                LEVEL: {map.name}
              </span>
            </div>

            <LoopSortBoard
              map={displayedMap}
              activeStep={activeStep}
              solverResult={solverResult}
              currentStepIndex={currentStepIndex}
              onStepChange={setCurrentStepIndex}
              onSolveRequest={handleRunSolver}
              isSolving={isSolving}
              onMapUpdate={handleMapChange}
            />
          </section>

          {/* Detailed Solution Step Timeline (Collapsible/Secondary) */}
          {solverResult && (
            <section>
              <SolutionControls
                result={solverResult}
                currentStepIndex={currentStepIndex}
                onStepChange={setCurrentStepIndex}
                onSolveRequest={handleRunSolver}
                isSolving={isSolving}
              />
            </section>
          )}

          {/* Structured Text File Editor & File Upload */}
          <section>
            <MapTextPanel currentMap={map} onMapChange={handleMapChange} />
          </section>

          {/* Explanatory Article Section */}
          <section className="border-2 border-brutalist-yellow bg-zinc-900 p-6 space-y-4">
            <h2 className="font-display font-bold text-xl text-brutalist-yellow uppercase flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              <span>[ HOW_LOOPSORT_SOLVER_WORKS ]</span>
            </h2>

            <div className="space-y-3 font-mono text-sm text-zinc-300 leading-relaxed">
              <p>
                <strong>Loop Sort</strong> is a color-sorting strategy puzzle
                featuring vertical block stacks (racks) positioned along a
                continuous conveyor loop track. Blocks must be transferred
                between stacks or deposited into colored target box cars to
                complete each level.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-black border-2 border-white space-y-2">
                  <h4 className="font-bold text-brutalist-cyan uppercase">
                    1. Structured Text Map Specification
                  </h4>
                  <p className="text-xs text-zinc-400">
                    While in-game levels obscure unrevealed tiles with mystery
                    icons, this solver accepts map definitions in{' '}
                    <strong>fully exposed form</strong>. You can upload or paste
                    structured text files (key-value text or JSON) defining the
                    colors of every stack position and target box.
                  </p>
                </div>

                <div className="p-4 bg-black border-2 border-white space-y-2">
                  <h4 className="font-bold text-brutalist-pink uppercase">
                    2. Color Permutation & Switching
                  </h4>
                  <p className="text-xs text-zinc-400">
                    The layout structure and rack positions remain consistent
                    across level variants while colors change. Use the{' '}
                    <strong>"Switch Colors"</strong> button to permute colors
                    across the exact same structural puzzle layout and verify
                    solver adaptability.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-black border-2 border-zinc-700">
                <h4 className="font-bold text-brutalist-yellow uppercase mb-2">
                  3. Algorithm & Graph Search State Space
                </h4>
                <p className="text-xs text-zinc-400">
                  The solver models each state as a tuple of rack block stacks
                  and target box progress. It uses an{' '}
                  <strong>A* search graph traversal algorithm</strong> with
                  state hash deduplication. Greedy target box deposits are
                  evaluated alongside stack-to-stack transfers to find the
                  minimal sequence of moves required to win.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
