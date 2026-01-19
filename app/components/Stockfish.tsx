import React, { useEffect, useState } from 'react'

export default function Stockfish({fen}) {
    const [evaluation, setEvaluation] = useState(null);
    // Initialize a web worker instance
    const worker = new Worker('stockfish-worker.js');
  
    useEffect(() => {
      worker.addEventListener('message', (e) => {
        // Parse the engine's output and update the UI (e.g., the 'info' message has evaluation)
        if (e.data.includes('info')) {
          // ... logic to extract evaluation from the message ...
          setEvaluation(e.data);
        }
      });
  
      // Send initial commands to the engine
      worker.postMessage('uci'); // Standard UCI start command
      worker.postMessage('isready');
      worker.postMessage('ucinewgame');
  
      return () => {
        worker.terminate(); // Clean up the worker on component unmount
      };
    }, []);

const analyzePosition = (fen) => {
  // Send the current position to the worker for analysis
   worker.postMessage(`position fen ${fen}`);
   worker.postMessage('go depth 20'); // Ask for an analysis up to a certain depth
};
analyzePosition(fen);
  

    return (
        <div>
            {JSON.stringify(evaluation)}
        </div>
    )
}
