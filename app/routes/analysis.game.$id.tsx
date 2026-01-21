import { useEffect, useState, useCallback, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  RotateCcw,
  GitBranch,
  Trash2,
  FlipVertical,
  Clipboard
} from "lucide-react";
import {
  copyDivContents,
  parsePgnEntry,
} from "~/utils/helper";
import { createSupabaseServerClient } from "~/utils/supabase.server";
import { useLoaderData, useRouteLoaderData } from "@remix-run/react";
import { lookup_userdata_on_gameid } from "~/utils/apicalls.server";
import Stockfish from "~/components/Stockfish";

export const meta: MetaFunction = () => {
  return [
    { title: "Analyze Game - Chess Analysis Board" },
    {
      name: "description",
      content: "Analyze your chess games with move variations and branching lines",
    },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const gameId = params.id;

  try {
    const { client, headers } = createSupabaseServerClient(request);
    const { data: userData } = await client.auth.getClaims();
    const response = await lookup_userdata_on_gameid(
      client,
      headers,
      Number(gameId),
      userData
    );
    return response;
  } catch (error) {
    const headers = new Headers();
    return Response.json({ error }, { headers });
  }
}

// Types for the move tree structure
interface MoveNode {
  id: string;
  san: string;           // Standard algebraic notation (e.g., "e4", "Nf3")
  fen: string;           // Position after this move
  from: string;          // Source square
  to: string;            // Target square
  parent: string | null; // Parent node ID
  children: string[];    // Child node IDs (variations)
  isMainLine: boolean;   // Is this part of the original game?
  moveNumber: number;    // Full move number
  color: 'w' | 'b';      // Who made this move
}

interface MoveTree {
  nodes: Record<string, MoveNode>;
  rootId: string;
  currentNodeId: string;
}

// Generate unique IDs for nodes
const generateId = () => Math.random().toString(36).substring(2, 11);

export default function AnalysisBoard() {
  const { data: gameData } = useLoaderData<typeof loader>();
  const UserContext = useRouteLoaderData<typeof loader>("root");

  // Core state
  const [moveTree, setMoveTree] = useState<MoveTree>(() => ({
    nodes: {},
    rootId: 'root',
    currentNodeId: 'root',
  }));
  const [displayPosition, setDisplayPosition] = useState<string>(new Chess().fen());
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [selectedNodeId, setSelectedNodeId] = useState<string>('root');
  const [pgnInfoString, setpgnInfoString] = useState<string>("");
  // Initialize the move tree from loaded game data
  useEffect(() => {
    if (gameData?.pgn?.length) {
      const initialTree: MoveTree = {
        nodes: {},
        rootId: 'root',
        currentNodeId: 'root',
      };

      // Create root node (starting position)
      const startingFen = new Chess().fen();
      initialTree.nodes['root'] = {
        id: 'root',
        san: '',
        fen: startingFen,
        from: '',
        to: '',
        parent: null,
        children: [],
        isMainLine: true,
        moveNumber: 0,
        color: 'w',
      };

      // Build the main line from game PGN
      let currentParentId = 'root';
      const tempGame = new Chess();
      tempGame.setHeader(
        "Event", `${gameData.pgn_info.is_rated == "rated" ? "Rated Game" : "Unrated Game"}`);
      tempGame.setHeader(
        "Site", "Online");
      tempGame.setHeader(
        "Date", new Date(gameData.pgn_info.date).toDateString());
      tempGame.setHeader(
        "Round", "1");
      tempGame.setHeader(
        "White", gameData.white_username);
      tempGame.setHeader(
        "Black", gameData.black_username);
      tempGame.setHeader(
        "Result", gameData.pgn_info.result);
      tempGame.setHeader(
        "Termination", gameData.pgn_info.termination);
      tempGame.setHeader(
        "WhiteElo", gameData.pgn_info.whiteelo);
      tempGame.setHeader(
        "BlackElo", gameData.pgn_info.blackelo);
      tempGame.setHeader(
        "EndTime", gameData.pgn[gameData.pgn.length - 1].split("$")[2]);


      gameData.pgn.forEach((pgnEntry: string, index: number) => {
        const parsed = parsePgnEntry(pgnEntry);
        const move = tempGame.move({
          from: parsed.from,
          to: parsed.to,
          promotion: 'q',
        });

        if (move) {
          const nodeId = generateId();
          const moveNumber = Math.floor(index / 2) + 1;
          const color = index % 2 === 0 ? 'w' : 'b';

          initialTree.nodes[nodeId] = {
            id: nodeId,
            san: move.san,
            fen: tempGame.fen(),
            from: parsed.from,
            to: parsed.to,
            parent: currentParentId,
            children: [],
            isMainLine: true,
            moveNumber,
            color,
          };

          // Link parent to child
          initialTree.nodes[currentParentId].children.push(nodeId);
          currentParentId = nodeId;
        }
      });
      const gamePGNFile = tempGame.pgn();

      // Set current position to end of main line
      initialTree.currentNodeId = currentParentId;

      setMoveTree(initialTree);
      setDisplayPosition(initialTree.nodes[currentParentId].fen);
      setSelectedNodeId(currentParentId);
      setpgnInfoString(gamePGNFile);
      // Set orientation based on user
      if (UserContext?.rowData?.username) {
        const isWhite = gameData.white_username === UserContext.rowData.username;
        setOrientation(isWhite ? "white" : "black");
      }
    }
  }, [gameData, UserContext]);

  // Navigate to a specific node
  const goToNode = useCallback((nodeId: string) => {
    const node = moveTree.nodes[nodeId];
    if (node) {
      setSelectedNodeId(nodeId);
      setDisplayPosition(node.fen);
      setMoveTree(prev => ({ ...prev, currentNodeId: nodeId }));
    }
  }, [moveTree.nodes]);

  // Handle piece drop - create new move or variation
  const onDrop = useCallback((sourceSquare: string, targetSquare: string): boolean => {
    const currentNode = moveTree.nodes[selectedNodeId];
    if (!currentNode) return false;

    // Create a chess instance from current position
    const tempGame = new Chess(currentNode.fen);

    try {
      const move = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      // Check if this move already exists as a child
      const existingChild = currentNode.children.find(childId => {
        const child = moveTree.nodes[childId];
        return child && child.from === sourceSquare && child.to === targetSquare;
      });

      if (existingChild) {
        // Move already exists, just navigate to it
        goToNode(existingChild);
        return true;
      }

      // Create new node for this move
      const newNodeId = generateId();
      const isWhiteMove = currentNode.color === 'w' ? (currentNode.fen == "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" ? "w" : "b") : 'w';
      const moveNumber = isWhiteMove === 'w'
        ? (currentNode.fen == "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" ? 1 : currentNode.moveNumber + 1)
        : currentNode.moveNumber;

      const newNode: MoveNode = {
        id: newNodeId,
        san: move.san,
        fen: tempGame.fen(),
        from: sourceSquare,
        to: targetSquare,
        parent: selectedNodeId,
        children: [],
        isMainLine: false, // Variations are not main line
        moveNumber,
        color: isWhiteMove,
      };

      setMoveTree(prev => ({
        ...prev,
        nodes: {
          ...prev.nodes,
          [newNodeId]: newNode,
          [selectedNodeId]: {
            ...prev.nodes[selectedNodeId],
            children: [...prev.nodes[selectedNodeId].children, newNodeId],
          },
        },
        currentNodeId: newNodeId,
      }));

      setSelectedNodeId(newNodeId);
      setDisplayPosition(tempGame.fen());
      return true;
    } catch (error) {
      console.error("Invalid move:", error);
      return false;
    }
  }, [moveTree, selectedNodeId, goToNode]);

  // Navigation functions
  const goToStart = useCallback(() => {
    goToNode('root');
  }, [goToNode]);

  const goToEnd = useCallback(() => {
    // Follow main line to the end
    let nodeId = selectedNodeId;
    let node = moveTree.nodes[nodeId];

    while (node && node.children.length > 0) {
      // Prefer main line children, otherwise take first child
      const mainLineChild = node.children.find(id => moveTree.nodes[id]?.isMainLine);
      nodeId = mainLineChild || node.children[0];
      node = moveTree.nodes[nodeId];
    }

    goToNode(nodeId);
  }, [moveTree.nodes, selectedNodeId, goToNode]);

  const goToPrevious = useCallback(() => {
    const currentNode = moveTree.nodes[selectedNodeId];
    if (currentNode?.parent) {
      goToNode(currentNode.parent);
    }
  }, [moveTree.nodes, selectedNodeId, goToNode]);

  const goToNext = useCallback(() => {
    const currentNode = moveTree.nodes[selectedNodeId];
    if (currentNode?.children.length > 0) {
      // Prefer main line, otherwise first child
      const mainLineChild = currentNode.children.find(id => moveTree.nodes[id]?.isMainLine);
      goToNode(mainLineChild || currentNode.children[0]);
    }
  }, [moveTree.nodes, selectedNodeId, goToNode]);

  // Delete variation from current node
  const deleteVariation = useCallback((nodeId: string) => {
    const node = moveTree.nodes[nodeId];
    if (!node || node.isMainLine || !node.parent) return;

    // Collect all descendant IDs to remove
    const toRemove = new Set<string>();
    const collectDescendants = (id: string) => {
      toRemove.add(id);
      moveTree.nodes[id]?.children.forEach(collectDescendants);
    };
    collectDescendants(nodeId);

    setMoveTree(prev => {
      const newNodes = { ...prev.nodes };

      // Remove from parent's children
      const parent = newNodes[node.parent!];
      if (parent) {
        newNodes[node.parent!] = {
          ...parent,
          children: parent.children.filter(id => id !== nodeId),
        };
      }

      // Remove all collected nodes
      toRemove.forEach(id => delete newNodes[id]);

      // If current node was deleted, go to parent
      const newCurrentId = toRemove.has(prev.currentNodeId)
        ? node.parent!
        : prev.currentNodeId;

      return {
        ...prev,
        nodes: newNodes,
        currentNodeId: newCurrentId,
      };
    });

    if (toRemove.has(selectedNodeId)) {
      goToNode(node.parent!);
    }
  }, [moveTree.nodes, selectedNodeId, goToNode]);

  // Reset to original game position
  const resetToMainLine = useCallback(() => {
    // Remove all non-main-line nodes
    let finalFen = "";
    let finalNodeId = "";
    setMoveTree(prev => {
      const newNodes: Record<string, MoveNode> = {};

      Object.values(prev.nodes).forEach(node => {
        if (node.isMainLine && node.children.length == 0) {
          finalFen = node.fen;
          finalNodeId = node.id;
        }
        if (node.isMainLine || node.id === 'root') {
          newNodes[node.id] = {
            ...node,
            children: node.children.filter(childId => prev.nodes[childId]?.isMainLine),
          };
        }
      });

      return {
        ...prev,
        nodes: newNodes,
      };
    });
    setDisplayPosition(finalFen);
    setSelectedNodeId(finalNodeId);
  }, []);

  // Build the move list display
  const moveListDisplay = useMemo(() => {
    const lines: JSX.Element[] = [];
    const visited = new Set<string>();

    const renderLine = (nodeId: string, depth: number = 0): JSX.Element[] => {
      const elements: JSX.Element[] = [];
      let currentId = nodeId;
      let isFirst = true;

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const node = moveTree.nodes[currentId];
        if (!node || currentId === 'root') {
          break;
        }

        const isSelected = currentId === selectedNodeId;
        const moveNum = node.moveNumber;
        const showMoveNumber = node.color === 'w' || isFirst;

        elements.push(
          <span
            key={node.id}
            onClick={() => goToNode(node.id)}
            className={`
              inline-flex items-center cursor-pointer px-1.5 py-0.5 rounded text-sm
              transition-all duration-150
              ${isSelected
                ? 'bg-amber-400 text-slate-900 font-bold shadow-sm'
                : node.isMainLine
                  ? 'text-slate-200 hover:bg-slate-700'
                  : 'text-emerald-400 hover:bg-slate-700'
              }
            `}
          >
            {showMoveNumber && (
              <span className="text-slate-500 mr-1 text-xs">
                {moveNum}{node.color === 'w' ? '.' : '...'}
              </span>
            )}
            {node.san}
            {!node.isMainLine && node.children.length === 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteVariation(node.id);
                }}
                className="ml-1 opacity-50 hover:opacity-100 text-red-400"
                title="Delete variation"
              >
                <Trash2 size={12} />
              </button>
            )}
          </span>
        );

        isFirst = false;

        // Handle variations (non-first children)
        if (node.children.length > 1) {
          node.children.slice(1).forEach((varId) => {
            const varNode = moveTree.nodes[varId];
            if (varNode && !visited.has(varId)) {
              elements.push(
                <span key={`var-${varId}`} className="text-slate-500 mx-1">(</span>
              );
              elements.push(...renderLine(varId, depth + 1));
              elements.push(
                <span key={`var-end-${varId}`} className="text-slate-500 mx-1">)</span>
              );
            }
          });
        }

        // Continue with first child (main continuation)
        if (node.children.length > 0) {
          currentId = node.children[0];
        } else {
          break;
        }
      }

      return elements;
    };

    // Start from root's first child
    const rootNode = moveTree.nodes['root'];
    if (rootNode?.children.length > 0) {
      const mainLineElements: JSX.Element[] = [];

      // Render the main line (first child of root)
      mainLineElements.push(...renderLine(rootNode.children[0]));

      // Render variations from root (children beyond the first)
      if (rootNode.children.length > 1) {
        rootNode.children.slice(1).forEach((varId) => {
          const varNode = moveTree.nodes[varId];
          if (varNode && !visited.has(varId)) {
            mainLineElements.push(
              <span key={`root-var-${varId}`} className="text-slate-500 mx-1">(</span>
            );
            mainLineElements.push(...renderLine(varId, 1));
            mainLineElements.push(
              <span key={`root-var-end-${varId}`} className="text-slate-500 mx-1">)</span>
            );
          }
        });
      }
      lines.push(
        <div key="main-line" className="flex flex-wrap gap-1 items-center">
          {mainLineElements}
        </div>
      );
    }

    return lines;
  }, [moveTree.nodes, selectedNodeId, goToNode, deleteVariation]);

  // Calculate game status indicators
  const currentGame = useMemo(() => {
    try {
      return new Chess(displayPosition);
    } catch {
      return new Chess();
    }
  }, [displayPosition]);

  const isCheck = currentGame.isCheck();
  const isCheckmate = currentGame.isCheckmate();
  const isDraw = currentGame.isDraw();
  const isStalemate = currentGame.isStalemate();

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          goToStart();
          break;
        case 'ArrowDown':
          e.preventDefault();
          goToEnd();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, goToStart, goToEnd]);

  // Count moves and variations
  const moveCount = Object.values(moveTree.nodes).filter(n => n.id !== 'root').length;
  const variationCount = Object.values(moveTree.nodes).filter(n => !n.isMainLine && n.id !== 'root').length;

  return (
    <div className="min-h-screen bg-[#1a1a2e]">


      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-amber-400 rounded-full" />
            <h1 className="text-3xl font-light text-white tracking-tight">
              Analysis Board
            </h1>
          </div>
          <p className="text-slate-400 text-sm ml-4 pl-3 border-l border-slate-700">
            Play through the game and explore alternative moves
          </p>
        </header>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Left Column - Board */}
          <div className="space-y-4">
            {/* Player info - opponent */}
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-semibold text-sm">
                {(orientation === 'white' ? gameData.black_username : gameData.white_username).charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-white font-medium">
                  {orientation === 'white' ? gameData.black_username : gameData.white_username}
                </p>
                <p className="text-slate-500 text-sm">
                  {orientation === 'white' ? gameData.pgn_info.blackelo : gameData.pgn_info.whiteelo}
                </p>
              </div>
              {currentGame.turn() === (orientation === 'white' ? 'b' : 'w') && !currentGame.isGameOver() && (
                <div className="ml-auto w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>

            {/* Chess Board */}
            {/* Status indicators */}
            {(isCheck || isCheckmate || isDraw) && (
              <div className="flex justify-center mb-2">
                {isCheckmate && (
                  <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                    Checkmate
                  </span>
                )}
                {isCheck && !isCheckmate && (
                  <span className="bg-amber-500 text-slate-900 px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                    Check
                  </span>
                )}
                {isDraw && (
                  <span className="bg-slate-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                    {isStalemate ? 'Stalemate' : 'Draw'}
                  </span>
                )}
              </div>
            )}

            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <Chessboard
                position={displayPosition}
                onPieceDrop={onDrop}
                boardWidth={Math.min(700, typeof window !== "undefined" ? window.innerWidth - 60 : 700)}
                boardOrientation={orientation}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
                customDarkSquareStyle={{ backgroundColor: '#4a5568' }}
                customLightSquareStyle={{ backgroundColor: '#718096' }}
              />
            </div>

            {/* Player info - user */}
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 font-semibold text-sm">
                {(orientation === 'white' ? gameData.white_username : gameData.black_username).charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-white font-medium">
                  {orientation === 'white' ? gameData.white_username : gameData.black_username}
                </p>
                <p className="text-slate-500 text-sm">
                  {orientation === 'white' ? gameData.pgn_info.whiteelo : gameData.pgn_info.blackelo}
                </p>
              </div>
              {currentGame.turn() === (orientation === 'white' ? 'w' : 'b') && !currentGame.isGameOver() && (
                <div className="ml-auto w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>

            {/* Board controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={goToStart}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="Go to start (↑)"
              >
                <ChevronsLeft size={20} />
              </button>
              <button
                onClick={goToPrevious}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="Previous move (←)"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 py-2 text-sm text-slate-400 min-w-[80px] text-center font-mono">
                {moveTree.nodes[selectedNodeId]?.moveNumber || 0}.
                {moveTree.nodes[selectedNodeId]?.san || '...'}
              </span>
              <button
                onClick={goToNext}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="Next move (→)"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={goToEnd}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="Go to end (↓)"
              >
                <ChevronsRight size={20} />
              </button>
              <div className="w-px h-8 bg-slate-700 mx-2" />
              <button
                onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="Flip board"
              >
                <FlipVertical size={20} />
              </button>
            </div>
          </div>

          {/* Right Column - Move List & Info */}
          <div className="space-y-4">
            {gameData?.pgn_info?.result && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Game Result</span>
                  <span className="text-2xl font-bold text-white font-mono">
                    {gameData.pgn_info.result}
                  </span>
                </div>
                {gameData?.pgn_info?.termination && (
                  <p className="text-slate-500 text-sm mt-1">{gameData.pgn_info.termination}</p>
                )}
              </div>
            )}

            {/* Move List */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                <h2 className="text-white font-medium flex items-center gap-2">
                  Moves
                  {variationCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      <GitBranch size={12} />
                      {variationCount}
                    </span>
                  )}
                </h2>
                {variationCount > 0 && (
                  <button
                    onClick={resetToMainLine}
                    className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
                    title="Reset to main line"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                )}
              </div>

              <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {moveCount === 0 ? (
                  <p className="text-slate-500 text-center py-8">No moves yet</p>
                ) : (
                  <div className="space-y-2">
                    {moveListDisplay}
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Tips */}
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
              <h3 className="text-slate-300 text-sm font-medium mb-3">How to Analyze</h3>
              <ul className="space-y-2 text-slate-500 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>Click moves to navigate, or use arrow keys</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span>Drag pieces to explore alternative moves</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span>Variations appear in <span className="text-emerald-400">green</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Click <Trash2 size={12} className="inline" /> to delete a variation</span>
                </li>
              </ul>
            </div>

            {/* Position Info */}
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
              <h3 className="text-slate-300 text-sm font-medium mb-2">Position</h3>
              <Clipboard onClick={() => copyDivContents("FEN")} className="hover:bg-gray-400 cursor-pointer" />
              <p className="text-slate-600 text-xs font-mono break-all leading-relaxed FEN">
                FEN: {displayPosition}
              </p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
              <h3 className="text-slate-300 text-sm font-medium mb-2">PGN File</h3>
              <Clipboard onClick={() => copyDivContents("PGN")} className="hover:bg-gray-400 cursor-pointer" />
              <p className="text-slate-600 text-xs font-mono break-all leading-relaxed PGN">
                {pgnInfoString}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Stockfish fen={displayPosition} multiPV={4} />

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
}