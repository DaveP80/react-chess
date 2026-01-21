import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Brain, TrendingUp, Target, Loader2, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

interface StockfishProps {
  fen: string;
  multiPV?: number; // Number of lines to analyze (default: 3)
}

// Helper to determine whose turn it is from FEN
function getTurnFromFen(fen: string): 'w' | 'b' {
  const parts = fen.split(' ');
  return (parts[1] || 'w') as 'w' | 'b';
}

interface LineData {
  multipv: number;           // Line number (1 = best, 2 = second best, etc.)
  score: number | null;      // Centipawns score
  mate: number | null;       // Mate in X moves
  depth: number;
  pv: string[];              // Principal variation moves
}

interface EvaluationData {
  lines: LineData[];         // All analyzed lines
  bestMove: string | null;
  ponder: string | null;
  nodes: number;
  time: number;
  currentDepth: number;
}

export default function Stockfish({ fen, multiPV = 3 }: StockfishProps) {
  const [evaluation, setEvaluation] = useState<EvaluationData>({
    lines: [],
    bestMove: null,
    ponder: null,
    nodes: 0,
    time: 0,
    currentDepth: 0,
  });
  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [showAllLines, setShowAllLines] = useState(true);
  
  const workerRef = useRef<Worker | null>(null);
  const currentFenRef = useRef<string>(fen);
  const multiPVRef = useRef<number>(multiPV);
  const analysisDepth = 25;

  // Parse UCI info string to extract line data
  const parseInfoString = useCallback((info: string): { lineData: Partial<LineData>; nodes?: number; time?: number } | null => {
    const result: Partial<LineData> = {};
    let nodes: number | undefined;
    let time: number | undefined;
    
    // Extract multipv (which line this is)
    const multipvMatch = info.match(/\bmultipv (\d+)/);
    if (multipvMatch) {
      result.multipv = parseInt(multipvMatch[1], 10);
    } else {
      result.multipv = 1; // Default to line 1 if not specified
    }
    
    // Extract depth
    const depthMatch = info.match(/\bdepth (\d+)/);
    if (depthMatch) {
      result.depth = parseInt(depthMatch[1], 10);
    }
    
    // Extract score (centipawns or mate)
    const cpMatch = info.match(/\bscore cp (-?\d+)/);
    const mateMatch = info.match(/\bscore mate (-?\d+)/);
    
    if (cpMatch) {
      result.score = parseInt(cpMatch[1], 10);
      result.mate = null;
    } else if (mateMatch) {
      result.mate = parseInt(mateMatch[1], 10);
      result.score = null;
    }
    
    // Extract principal variation (pv)
    const pvMatch = info.match(/\bpv (.+?)(?:\s+(?:bmc|string|$)|\s*$)/);
    if (pvMatch) {
      result.pv = pvMatch[1].trim().split(/\s+/);
    }
    
    // Extract nodes
    const nodesMatch = info.match(/\bnodes (\d+)/);
    if (nodesMatch) {
      nodes = parseInt(nodesMatch[1], 10);
    }
    
    // Extract time
    const timeMatch = info.match(/\btime (\d+)/);
    if (timeMatch) {
      time = parseInt(timeMatch[1], 10);
    }
    
    // Only return if we have meaningful data (score and pv)
    if ((result.score !== undefined || result.mate !== undefined) && result.pv) {
      return { lineData: result, nodes, time };
    }
    
    return null;
  }, []);

  // Parse bestmove string
  const parseBestMove = useCallback((message: string): { bestMove: string; ponder: string | null } | null => {
    const match = message.match(/^bestmove (\S+)(?:\s+ponder (\S+))?/);
    if (match) {
      return {
        bestMove: match[1],
        ponder: match[2] || null,
      };
    }
    return null;
  }, []);

  // Initialize the web worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const worker = new Worker('/stockfish-worker.js');
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent) => {
        const message = event.data;
        
        if (typeof message !== 'string') return;

        // Check for UCI OK (engine ready)
        if (message === 'uciok') {
          // Set MultiPV option
          worker.postMessage(`setoption name MultiPV value ${multiPVRef.current}`);
          worker.postMessage('isready');
        }
        
        // Check for ready
        if (message === 'readyok') {
          setIsReady(true);
          setError(null);
        }
        
        // Parse info lines for evaluation
        if (message.startsWith('info') && message.includes('score')) {
          const parsed = parseInfoString(message);
          if (parsed && parsed.lineData.multipv !== undefined) {
            setEvaluation(prev => {
              const newLines = [...prev.lines];
              const lineIndex = newLines.findIndex(l => l.multipv === parsed.lineData.multipv);
              
              const newLine: LineData = {
                multipv: parsed.lineData.multipv!,
                score: parsed.lineData.score ?? null,
                mate: parsed.lineData.mate ?? null,
                depth: parsed.lineData.depth ?? 0,
                pv: parsed.lineData.pv ?? [],
              };
              
              if (lineIndex >= 0) {
                // Update existing line if new depth is greater or equal
                if (newLine.depth >= newLines[lineIndex].depth) {
                  newLines[lineIndex] = newLine;
                }
              } else {
                // Add new line
                newLines.push(newLine);
              }
              
              // Sort by multipv number
              newLines.sort((a, b) => a.multipv - b.multipv);
              
              return {
                ...prev,
                lines: newLines,
                nodes: parsed.nodes ?? prev.nodes,
                time: parsed.time ?? prev.time,
                currentDepth: Math.max(prev.currentDepth, newLine.depth),
              };
            });
          }
        }
        
        // Parse bestmove
        if (message.startsWith('bestmove')) {
          const parsed = parseBestMove(message);
          if (parsed) {
            setEvaluation(prev => ({
              ...prev,
              bestMove: parsed.bestMove,
              ponder: parsed.ponder,
            }));
            setIsAnalyzing(false);
          }
        }
      };

      worker.onerror = (err) => {
        console.error('Stockfish worker error:', err);
        setError('Failed to load chess engine. Please refresh the page.');
        setIsReady(false);
      };

      // Initialize the engine
      worker.postMessage('uci');

      return () => {
        worker.postMessage('quit');
        worker.terminate();
        workerRef.current = null;
      };
    } catch (err) {
      console.error('Failed to create Stockfish worker:', err);
      setError('Chess engine not available');
    }
  }, [parseInfoString, parseBestMove]);

  // Update MultiPV if prop changes
  useEffect(() => {
    multiPVRef.current = multiPV;
    if (isReady && workerRef.current) {
      workerRef.current.postMessage(`setoption name MultiPV value ${multiPV}`);
    }
  }, [multiPV, isReady]);

  // Analyze position when FEN changes
  useEffect(() => {
    if (!isReady || !workerRef.current || !fen) return;

    currentFenRef.current = fen;
    setIsAnalyzing(true);
    setTurn(getTurnFromFen(fen));

    // Reset evaluation for new position
    setEvaluation({
      lines: [],
      bestMove: null,
      ponder: null,
      nodes: 0,
      time: 0,
      currentDepth: 0,
    });

    const worker = workerRef.current;

    // Stop any ongoing analysis
    worker.postMessage('stop');
    
    // Small delay to ensure stop is processed
    const timeoutId = setTimeout(() => {
      if (currentFenRef.current === fen) {
        worker.postMessage('ucinewgame');
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${analysisDepth}`);
      }
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [fen, isReady, analysisDepth]);

  // Format score for display (always from White's perspective)
  const formatScore = useCallback((score: number | null, mate: number | null) => {
    let s = score;
    let m = mate;
    
    // If it's black's turn, flip the score for display
    if (turn === 'b') {
      if (s !== null) s = -s;
      if (m !== null) m = -m;
    }
    
    if (m !== null) {
      const sign = m > 0 ? '+' : '';
      return `M${sign}${m}`;
    }
    if (s !== null) {
      const scoreInPawns = s / 100;
      const sign = scoreInPawns > 0 ? '+' : '';
      return `${sign}${scoreInPawns.toFixed(2)}`;
    }
    return '0.00';
  }, [turn]);

  // Get evaluation bar percentage
  const getEvalBarPercent = useCallback((score: number | null, mate: number | null) => {
    let s = score;
    let m = mate;
    
    if (turn === 'b') {
      if (s !== null) s = -s;
      if (m !== null) m = -m;
    }
    
    if (m !== null) {
      return m > 0 ? 100 : 0;
    }
    if (s !== null) {
      const clamped = Math.max(-500, Math.min(500, s));
      return ((clamped + 500) / 1000) * 100;
    }
    return 50;
  }, [turn]);

  // Get color indicator based on score
  const getScoreColor = useCallback((score: number | null, mate: number | null) => {
    let s = score;
    let m = mate;
    
    if (turn === 'b') {
      if (s !== null) s = -s;
      if (m !== null) m = -m;
    }
    
    if (m !== null) {
      return m > 0 ? 'text-emerald-400' : 'text-red-400';
    }
    if (s !== null) {
      if (s > 100) return 'text-emerald-400';
      if (s < -100) return 'text-red-400';
    }
    return 'text-slate-300';
  }, [turn]);

  // Get line label
  const getLineLabel = (index: number) => {
    if (index === 0) return 'Best';
    if (index === 1) return '2nd';
    if (index === 2) return '3rd';
    return `${index + 1}th`;
  };

  // Get line color classes
  const getLineColorClasses = (index: number) => {
    if (index === 0) return 'border-amber-500/50 bg-amber-500/5';
    if (index === 1) return 'border-slate-600/50 bg-slate-700/20';
    return 'border-slate-700/30 bg-slate-800/20';
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 max-w-7xl pb-6">
        <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400">
            <Brain size={20} />
            <span className="font-medium">Engine Error</span>
          </div>
          <p className="text-red-300/70 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const primaryLine = evaluation.lines[0];

  return (
    <div className="container mx-auto px-4 max-w-7xl pb-6">
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="text-purple-400" size={20} />
            <h2 className="text-white font-medium">Stockfish Analysis</h2>
            {isAnalyzing && (
              <Loader2 className="animate-spin text-amber-400 ml-2" size={16} />
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600 text-xs">
              {turn === 'w' ? 'White' : 'Black'} to move
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Depth:</span>
              <span className="text-slate-300 font-mono">{evaluation.currentDepth}/{analysisDepth}</span>
            </div>
          </div>
        </div>

        {!isReady ? (
          <div className="p-4 space-y-4">
          {/* Skeleton for eval bar + score area */}
          <div className="flex items-center gap-4 animate-pulse">
            {/* Fake eval bar */}
            <div className="flex-shrink-0 w-8 h-28 bg-slate-700/50 rounded-lg" />
            
            {/* Fake score and details */}
            <div className="flex-1 space-y-3">
              <div className="h-10 bg-slate-700/50 rounded w-28" />
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 bg-slate-700/50 rounded" />
                <div className="h-5 bg-slate-700/50 rounded w-20" />
                <div className="h-6 bg-slate-700/50 rounded w-16" />
              </div>
            </div>
          </div>
          
          {/* Skeleton for lines */}
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`rounded-lg border p-3 ${
                  i === 1 
                    ? 'border-amber-500/20 bg-amber-500/5' 
                    : 'border-slate-700/30 bg-slate-800/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-5 w-10 bg-slate-700/50 rounded" />
                  <div className="h-5 w-14 bg-slate-700/50 rounded" />
                  <div className="h-4 w-6 bg-slate-700/30 rounded" />
                  <div className="flex-1 h-4 bg-slate-700/30 rounded" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Loading indicator */}
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm pt-2">
            <Loader2 className="animate-spin" size={16} />
            <span>Loading chess engine...</span>
          </div>
          
          {/* Skeleton for stats */}
          <div className="flex items-center gap-4 pt-2 border-t border-slate-700/50 animate-pulse">
            <div className="h-3 w-20 bg-slate-700/30 rounded" />
            <div className="h-3 w-16 bg-slate-700/30 rounded" />
            <div className="h-3 w-14 bg-slate-700/30 rounded" />
            <div className="h-3 w-12 bg-slate-700/30 rounded ml-auto" />
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-4 relative">
          {/* Analyzing overlay - shows when position changes */}
          {isAnalyzing && evaluation.lines.length === 0 && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] 
                          flex items-center justify-center rounded-b-xl z-10">
              <div className="flex items-center gap-2 text-slate-300 bg-slate-800/80 px-4 py-2 rounded-lg">
                <Loader2 className="animate-spin" size={18} />
                <span>Analyzing position...</span>
              </div>
            </div>
          )}
          {/* Primary Line with Eval Bar */}
          {primaryLine ? (
            <div className="flex items-center gap-4">
              {/* Evaluation Bar */}
              <div className="flex-shrink-0 w-8 h-28 bg-slate-900 rounded-lg overflow-hidden relative">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-300"
                  style={{ height: `${getEvalBarPercent(primaryLine.score, primaryLine.mate)}%` }}
                />
                <div 
                  className="absolute top-0 left-0 right-0 bg-slate-800 transition-all duration-300"
                  style={{ height: `${100 - getEvalBarPercent(primaryLine.score, primaryLine.mate)}%` }}
                />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-600 -translate-y-1/2" />
              </div>

              {/* Main Score and Best Move */}
              <div className="flex-1 space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className={`text-4xl font-bold font-mono ${getScoreColor(primaryLine.score, primaryLine.mate)}`}>
                    {formatScore(primaryLine.score, primaryLine.mate)}
                  </span>
                  {primaryLine.mate !== null && (
                    <span className="text-slate-500 text-sm">
                      {(() => {
                        let mate = primaryLine.mate;
                        if (turn === 'b') mate = -mate;
                        return mate > 0 ? 'White' : 'Black';
                      })()} mates in {Math.abs(primaryLine.mate)}
                    </span>
                  )}
                </div>

                {evaluation.bestMove && (
                  <div className="flex items-center gap-2">
                    <Target className="text-amber-400" size={16} />
                    <span className="text-slate-400 text-sm">Best move:</span>
                    <span className="text-amber-400 font-mono font-semibold text-lg">
                      {evaluation.bestMove}
                    </span>
                    {evaluation.ponder && (
                      <>
                        <ChevronRight className="text-slate-600" size={16} />
                        <span className="text-slate-500 font-mono">
                          {evaluation.ponder}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Skeleton for primary line while loading */
            <div className="flex items-center gap-4 animate-pulse">
              <div className="flex-shrink-0 w-8 h-28 bg-slate-700/50 rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="h-10 bg-slate-700/50 rounded w-28" />
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-slate-700/50 rounded" />
                  <div className="h-5 bg-slate-700/50 rounded w-20" />
                  <div className="h-6 bg-slate-700/50 rounded w-16" />
                </div>
              </div>
            </div>
          )}

          {/* All Lines Toggle */}
          {evaluation.lines.length > 1 && (
            <button
              onClick={() => setShowAllLines(!showAllLines)}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              {showAllLines ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showAllLines ? 'Hide' : 'Show'} alternative lines ({evaluation.lines.length - 1})
            </button>
          )}

          {/* All Lines Display */}
          {showAllLines && evaluation.lines.length > 0 && (
            <div className="space-y-2">
              {evaluation.lines.map((line, index) => (
                <div 
                  key={line.multipv}
                  className={`rounded-lg border p-3 ${getLineColorClasses(index)}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Line Label */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      index === 0 
                        ? 'bg-amber-500/20 text-amber-400' 
                        : 'bg-slate-700/50 text-slate-400'
                    }`}>
                      {getLineLabel(index)}
                    </span>

                    {/* Score */}
                    <span className={`font-mono font-bold ${getScoreColor(line.score, line.mate)}`}>
                      {formatScore(line.score, line.mate)}
                    </span>

                    {/* Depth indicator */}
                    <span className="text-slate-600 text-xs">
                      d{line.depth}
                    </span>

                    {/* Principal Variation */}
                    <div className="flex-1 flex items-center gap-1 overflow-hidden">
                      <TrendingUp className="text-slate-600 flex-shrink-0" size={14} />
                      <span className="text-slate-400 font-mono text-sm truncate">
                        {line.pv.slice(0, 8).join(' ')}
                        {line.pv.length > 8 && '...'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skeleton while waiting for first results */}
          {evaluation.lines.length === 0 && isAnalyzing && (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: multiPV }).map((_, i) => (
                <div 
                  key={i} 
                  className={`rounded-lg border p-3 ${
                    i === 0 
                      ? 'border-amber-500/20 bg-amber-500/5' 
                      : 'border-slate-700/30 bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-10 bg-slate-700/50 rounded" />
                    <div className="h-5 w-14 bg-slate-700/50 rounded" />
                    <div className="h-4 w-6 bg-slate-700/30 rounded" />
                    <div className="flex-1 h-4 bg-slate-700/30 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {(evaluation.nodes > 0 || evaluation.time > 0) && (
            <div className="flex items-center gap-4 pt-2 border-t border-slate-700/50 text-xs text-slate-500">
              {evaluation.nodes > 0 && (
                <span>
                  Nodes: {(evaluation.nodes / 1000000).toFixed(2)}M
                </span>
              )}
              {evaluation.time > 0 && (
                <span>
                  Time: {(evaluation.time / 1000).toFixed(1)}s
                </span>
              )}
              {evaluation.nodes > 0 && evaluation.time > 0 && (
                <span>
                  NPS: {Math.round(evaluation.nodes / (evaluation.time / 1000) / 1000)}k
                </span>
              )}
              <span className="ml-auto">
                {multiPV} line{multiPV > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
  );
}