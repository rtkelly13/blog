export interface ArchitectureNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel?: string;
  role?: 'leader' | 'follower' | 'client' | 'storage';
  badge?: string;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed';
  color?: 'primary' | 'secondary' | 'neutral';
}

export interface ArchitectureDiagramProps {
  title?: string;
  nodes?: ArchitectureNode[];
  edges?: ArchitectureEdge[];
  width?: number;
  height?: number;
  caption?: string;
  className?: string;
}

/**
 * Deterministic Monospace Vector SVG Architecture Schematic.
 *
 * Implements high-contrast, zero-border-radius technical schematics with
 * leader/follower semantics, directional arrow connectors, and an embedded
 * terminal legend. Adheres strictly to rx="0" and theme ladder variable fills.
 */
export default function ArchitectureDiagram({
  title = 'TOPOLOGY // DISTRIBUTED_REPLICATION_CLUSTER',
  caption,
  width = 760,
  height = 300,
  className = '',
}: ArchitectureDiagramProps) {
  return (
    <figure
      data-slot="architecture-diagram"
      className={`my-6 space-y-2 ${className}`}
    >
      <div className="border-2 border-white bg-black shadow-hard-lg overflow-hidden font-mono">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between border-b-2 border-white bg-zinc-950 px-3.5 py-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <span className="text-accent-primary font-black">&gt;_</span>
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-bold">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-accent-primary border border-white" />
              LEADER
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-zinc-800 border border-white" />
              FOLLOWER
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-accent-secondary">&rarr;</span>
              REPLICATION
            </span>
          </div>
        </div>

        {/* SVG Drawing Canvas */}
        <div className="p-4 flex items-center justify-center bg-black/60 overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-w-full h-auto"
            style={{ minWidth: '600px' }}
          >
            <defs>
              {/* Directional Arrowheads */}
              <marker
                id="arrow-primary"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 1 L 8 5 L 0 9 z"
                  fill="var(--color-cyan-400, #00f0ff)"
                />
              </marker>
              <marker
                id="arrow-secondary"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 1 L 8 5 L 0 9 z"
                  fill="var(--color-pink-400, #ff007f)"
                />
              </marker>
              <marker
                id="arrow-white"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#ffffff" />
              </marker>
            </defs>

            {/* Background Grid Accent Lines */}
            <g stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1">
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={`grid-h-${i}`}
                  x1="0"
                  y1={i * 25}
                  x2={width}
                  y2={i * 25}
                />
              ))}
              {Array.from({ length: 30 }).map((_, i) => (
                <line
                  key={`grid-v-${i}`}
                  x1={i * 26}
                  y1="0"
                  x2={i * 26}
                  y2={height}
                />
              ))}
            </g>

            {/* 1. Producer Client Node */}
            <g transform="translate(30, 105)">
              <rect
                x="0"
                y="0"
                width="140"
                height="80"
                fill="#121324"
                stroke="#ffffff"
                strokeWidth="2"
                rx="0"
              />
              <text
                x="70"
                y="32"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="12"
                fontWeight="bold"
              >
                PRODUCER
              </text>
              <text
                x="70"
                y="48"
                textAnchor="middle"
                fill="#a1a1aa"
                fontSize="10"
              >
                BATCH BUFFER
              </text>
              <rect
                x="25"
                y="58"
                width="90"
                height="14"
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1"
              />
              <text
                x="70"
                y="69"
                textAnchor="middle"
                fill="#00f0ff"
                fontSize="9"
                fontWeight="bold"
              >
                TCP / SOCKET
              </text>
            </g>

            {/* Connector: Producer -> Leader */}
            <path
              d="M 170 145 L 250 145"
              stroke="#ffffff"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrow-white)"
            />
            <text
              x="210"
              y="138"
              textAnchor="middle"
              fill="#a1a1aa"
              fontSize="9"
            >
              WRITE BATCH
            </text>

            {/* 2. Broker Partition Leader (Primary) */}
            <g transform="translate(260, 45)">
              <rect
                x="0"
                y="0"
                width="200"
                height="200"
                fill="#000000"
                stroke="var(--color-cyan-400, #00f0ff)"
                strokeWidth="2"
                rx="0"
              />
              <rect
                x="0"
                y="0"
                width="200"
                height="26"
                fill="var(--color-cyan-400, #00f0ff)"
              />
              <text
                x="100"
                y="18"
                textAnchor="middle"
                fill="#000000"
                fontSize="11"
                fontWeight="900"
              >
                {'PARTITION 0 // LEADER'}
              </text>

              <rect
                x="15"
                y="40"
                width="170"
                height="34"
                fill="#18181b"
                stroke="#ffffff"
                strokeWidth="1"
              />
              <text
                x="100"
                y="56"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
              >
                COMMIT LOG FILE
              </text>
              <text
                x="100"
                y="68"
                textAnchor="middle"
                fill="#22c55e"
                fontSize="9"
              >
                {'[ APPEND ONLY // CRC32 ]'}
              </text>

              <rect
                x="15"
                y="86"
                width="170"
                height="34"
                fill="#18181b"
                stroke="#ffffff"
                strokeWidth="1"
              />
              <text
                x="100"
                y="102"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
              >
                IN-MEMORY INDEX
              </text>
              <text
                x="100"
                y="114"
                textAnchor="middle"
                fill="#a1a1aa"
                fontSize="9"
              >
                SPARSE OFFSET MAP
              </text>

              <rect
                x="15"
                y="132"
                width="170"
                height="50"
                fill="#18181b"
                stroke="var(--color-pink-400, #ff007f)"
                strokeWidth="1"
              />
              <text
                x="100"
                y="152"
                textAnchor="middle"
                fill="#ff007f"
                fontSize="10"
                fontWeight="bold"
              >
                RAFT REPLICATION STATE
              </text>
              <text
                x="100"
                y="168"
                textAnchor="middle"
                fill="#a1a1aa"
                fontSize="9"
              >
                {'TERM: 4 // COMMIT IDX: 14,028'}
              </text>
            </g>

            {/* Replication Connectors: Leader -> Followers */}
            <path
              d="M 460 100 L 530 80"
              stroke="var(--color-pink-400, #ff007f)"
              strokeWidth="2"
              strokeDasharray="4 3"
              fill="none"
              markerEnd="url(#arrow-secondary)"
            />
            <path
              d="M 460 190 L 530 210"
              stroke="var(--color-pink-400, #ff007f)"
              strokeWidth="2"
              strokeDasharray="4 3"
              fill="none"
              markerEnd="url(#arrow-secondary)"
            />

            {/* 3. Replica Follower Node 1 */}
            <g transform="translate(540, 30)">
              <rect
                x="0"
                y="0"
                width="180"
                height="95"
                fill="#18181b"
                stroke="#ffffff"
                strokeWidth="2"
                rx="0"
              />
              <rect x="0" y="0" width="180" height="22" fill="#27272a" />
              <text
                x="90"
                y="15"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
              >
                REPLICA FOLLOWER #1
              </text>
              <text
                x="90"
                y="44"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
              >
                SYNC LOG SEGMENT
              </text>
              <text
                x="90"
                y="60"
                textAnchor="middle"
                fill="#22c55e"
                fontSize="9"
              >
                LAG: 0 MS (IN-SYNC)
              </text>
              <rect
                x="20"
                y="72"
                width="140"
                height="14"
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1"
              />
              <text
                x="90"
                y="83"
                textAnchor="middle"
                fill="#00f0ff"
                fontSize="9"
              >
                NODE US-EAST-1B
              </text>
            </g>

            {/* 4. Replica Follower Node 2 */}
            <g transform="translate(540, 165)">
              <rect
                x="0"
                y="0"
                width="180"
                height="95"
                fill="#18181b"
                stroke="#ffffff"
                strokeWidth="2"
                rx="0"
              />
              <rect x="0" y="0" width="180" height="22" fill="#27272a" />
              <text
                x="90"
                y="15"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
              >
                REPLICA FOLLOWER #2
              </text>
              <text
                x="90"
                y="44"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
              >
                SYNC LOG SEGMENT
              </text>
              <text
                x="90"
                y="60"
                textAnchor="middle"
                fill="#22c55e"
                fontSize="9"
              >
                LAG: 2 MS (IN-SYNC)
              </text>
              <rect
                x="20"
                y="72"
                width="140"
                height="14"
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1"
              />
              <text
                x="90"
                y="83"
                textAnchor="middle"
                fill="#00f0ff"
                fontSize="9"
              >
                NODE US-EAST-1C
              </text>
            </g>
          </svg>
        </div>
      </div>

      {caption && (
        <figcaption className="font-mono text-xs text-zinc-400">
          <span className="text-accent-primary font-bold mr-1">&gt;</span>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
