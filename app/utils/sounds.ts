// app/utils/sounds.ts

const SOUND_PATHS = {
    move: '/sounds/move.mp3',
    capture: '/sounds/capture.mp3',
    check: '/sounds/check.mp3',
    castle: '/sounds/castle.mp3',
    lowTime: '/sounds/low-time.mp3',
    gameEndVictory: '/sounds/game-end-victory.mp3',
    gameEndLoss: '/sounds/game-end-loss.mp3',
    gameEndDraw: '/sounds/game-end-draw.mp3',
  } as const;
  
  export type SoundType = keyof typeof SOUND_PATHS;
  
  // Audio cache to avoid creating new Audio objects each time
  const audioCache: Partial<Record<SoundType, HTMLAudioElement>> = {};
  
  // Track if low time warning has been played (to avoid repeated alerts)
  let lowTimePlayedWhite = false;
  let lowTimePlayedBlack = false;
  
  /**
   * Preload all sounds for faster playback
   * Call this on component mount
   */
  export function preloadSounds(): void {
    if (typeof window === 'undefined') return;
  
    Object.entries(SOUND_PATHS).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audioCache[key as SoundType] = audio;
    });
  }
  
  /**
   * Play a specific sound effect
   */
  export function playSound(type: SoundType): void {
    if (typeof window === 'undefined') return;
  
    try {
      // Get or create audio element
      if (!audioCache[type]) {
        audioCache[type] = new Audio(SOUND_PATHS[type]);
      }
  
      const audio = audioCache[type]!;
      audio.currentTime = 0;
      audio.volume = 0.5; // Adjust volume as needed
      audio.play().catch((err) => {
        // Silently handle autoplay restrictions
        console.debug('Sound play failed:', err);
      });
    } catch (error) {
      console.debug('Sound error:', error);
    }
  }
  
  /**
   * Play the appropriate sound for a chess move
   * @param move - The move object from chess.js
   * @param isCheck - Whether the move results in check
   */
  export function playMoveSound(
    move: { captured?: string; flags?: string; san?: string } | null,
    isCheck: boolean = false
  ): void {
    if (!move) return;
  
    // Priority: Check > Capture > Castle > Normal move
    if (isCheck) {
      playSound('check');
    } else if (move.captured) {
      playSound('capture');
    } else if (move.flags?.includes('k') || move.flags?.includes('q') || 
               move.san?.includes('O-O')) {
      playSound('castle');
    } else {
      playSound('move');
    }
  }
  
  /**
   * Check and play low time warning (under 60 seconds)
   * Only plays once per player per game
   */
  export function checkLowTime(
    whiteTime: number | undefined,
    blackTime: number | undefined,
    currentTurn: 'w' | 'b'
  ): void {
    const LOW_TIME_THRESHOLD = 60; // seconds
  
    if (currentTurn === 'w' && whiteTime !== undefined && whiteTime < LOW_TIME_THRESHOLD && !lowTimePlayedWhite) {
      playSound('lowTime');
      lowTimePlayedWhite = true;
    } else if (currentTurn === 'b' && blackTime !== undefined && blackTime < LOW_TIME_THRESHOLD && !lowTimePlayedBlack) {
      playSound('lowTime');
      lowTimePlayedBlack = true;
    }
  }
  
  /**
   * Reset low time warnings (call when starting a new game)
   */
  export function resetLowTimeWarnings(): void {
    lowTimePlayedWhite = false;
    lowTimePlayedBlack = false;
  }
  
  /**
   * Play game end sound
   */
  export function playGameEndSound(result: "Victory" | "Draw" | "Loss"): void {
    playSound(`gameEnd${result}`);
  }