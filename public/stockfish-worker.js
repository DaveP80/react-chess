/**
 * Stockfish Web Worker
 * 
 * This worker loads Stockfish WASM engine from Lichess's CDN which is 
 * reliable and well-maintained. It handles UCI protocol communication
 * between the React component and the chess engine.
 */

let stockfish = null;
let ready = false;
let pending = [];

// Use Lichess's hosted stockfish.js/wasm - very reliable
const STOCKFISH_URL = 'https://lichess1.org/assets/javascripts/vendor/stockfish/stockfish.js';

async function init() {
  try {
    // Import stockfish.js from Lichess CDN
    importScripts(STOCKFISH_URL);
    
    // Initialize the Stockfish WASM module
    // stockfish.js exports a Stockfish() function that returns a promise
    if (typeof Stockfish === 'function') {
      stockfish = await Stockfish();
      
      // The modern stockfish.js uses addMessageListener
      if (typeof stockfish.addMessageListener === 'function') {
        stockfish.addMessageListener((line) => {
          postMessage(line);
        });
      } else if (stockfish.onmessage !== undefined) {
        // Older versions use onmessage property
        stockfish.onmessage = (e) => {
          postMessage(typeof e === 'string' ? e : e.data);
        };
      }
      
      ready = true;
      
      // Process any commands that came in before we were ready
      for (const cmd of pending) {
        stockfish.postMessage(cmd);
      }
      pending = [];
      
    } else {
      throw new Error('Stockfish function not found after loading script');
    }
  } catch (error) {
    console.error('Failed to initialize Stockfish:', error);
    postMessage(`info string Error: ${error.message}`);
    
    // Attempt fallback to cdnjs hosted version
    tryFallback();
  }
}

function tryFallback() {
  try {
    // Clear state
    stockfish = null;
    ready = false;
    
    // Try the cdnjs version (Stockfish 10, older but reliable)
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
    
    if (typeof STOCKFISH === 'function') {
      stockfish = STOCKFISH();
      
      stockfish.onmessage = (e) => {
        const msg = typeof e === 'string' ? e : e.data;
        postMessage(msg);
      };
      
      ready = true;
      postMessage('info string Using Stockfish 10 (fallback)');
      
      // Process pending commands
      for (const cmd of pending) {
        stockfish.postMessage(cmd);
      }
      pending = [];
    }
  } catch (err) {
    console.error('Fallback failed:', err);
    postMessage('info string Error: Could not load chess engine');
  }
}

// Handle messages from the main thread (React component)
onmessage = (e) => {
  const command = e.data;
  
  if (!command || typeof command !== 'string') {
    return;
  }
  
  if (ready && stockfish) {
    stockfish.postMessage(command);
  } else {
    // Queue commands until engine is ready
    pending.push(command);
  }
};

// Handle errors
onerror = (e) => {
  console.error('Worker error:', e.message);
  postMessage(`info string Worker error: ${e.message}`);
};

// Start initialization immediately when worker loads
init();
