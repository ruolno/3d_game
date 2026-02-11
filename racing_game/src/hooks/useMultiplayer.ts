import { useEffect, useState, useRef, useMemo, type MutableRefObject } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

export interface Player {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  role: 'seeker' | 'hider';
  score: number;
  isReady: boolean;
  isCaught: boolean;
}

export interface PlayerPositionData {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  timestamp: number;
  prevPosition?: { x: number; y: number; z: number };
  prevTimestamp?: number;
}

export type PlayerPositionsRef = MutableRefObject<Map<string, PlayerPositionData>>;

export interface GameState {
  state: 'lobby' | 'preparation' | 'seeking' | 'roundEnd';
  currentSeeker: string | null;
  roundNumber: number;
  roundStartTime: number | null;
  roundDuration: number;
  preparationDuration: number;
}

export function useMultiplayer() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    state: 'lobby',
    currentSeeker: null,
    roundNumber: 0,
    roundStartTime: null,
    roundDuration: 120000,
    preparationDuration: 10000
  });
  const [scoreboard, setScoreboard] = useState<Array<{ id: string; name: string; score: number }>>([]);
  
  // Shared ref for real-time position updates - RemotePlayer reads this directly in useFrame
  // This completely bypasses React re-renders for maximum performance
  const playerPositionsRef = useRef<Map<string, { 
    position: { x: number; y: number; z: number }; 
    rotation: { x: number; y: number; z: number };
    timestamp: number;
    prevPosition?: { x: number; y: number; z: number };
    prevTimestamp?: number;
  }>>(new Map());

  // Initialize socket connection
  useEffect(() => {
    const socketInstance = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    // Receive player ID
    socketInstance.on('player:id', (data: { id: string; player: Player }) => {
      console.log('Received player ID:', data.id);
      setPlayerId(data.id);
    });

    // Receive players list
    socketInstance.on('players:list', (playersList: Player[]) => {
      setPlayers(playersList);
    });

    // Receive game state
    socketInstance.on('game:state', (state: GameState) => {
      setGameState(state);
    });

    // Receive scores
    socketInstance.on('game:scores', (scores: Array<{ id: string; name: string; score: number }>) => {
      setScoreboard(scores);
    });

    // Handle player movement (from other players)
    // Store in shared ref - RemotePlayer reads this directly in useFrame (zero re-renders)
    socketInstance.on('player:moved', (data: { 
      id: string; 
      position: { x: number; y: number; z: number }; 
      rotation: { x: number; y: number; z: number };
      timestamp: number;
    }) => {
      const existing = playerPositionsRef.current.get(data.id);
      playerPositionsRef.current.set(data.id, {
        position: data.position,
        rotation: data.rotation,
        timestamp: Date.now(),
        // Store previous snapshot for velocity-based interpolation
        prevPosition: existing?.position,
        prevTimestamp: existing?.timestamp
      });
    });

    // Handle player caught
    socketInstance.on('player:caught', (data: {
      caughtPlayer: string;
      seeker: string;
      remainingHiders: number;
    }) => {
      console.log(`Player ${data.caughtPlayer} was caught! ${data.remainingHiders} hiders remaining`);
    });

    // Handle round started
    socketInstance.on('round:started', (data: {
      roundNumber: number;
      seeker: string;
    }) => {
      console.log(`Round ${data.roundNumber} started! Seeker:`, data.seeker);
    });

    // Handle round ended
    socketInstance.on('round:ended', (data: any) => {
      console.log('Round ended:', data.reason);
      setScoreboard(data.scores);
    });

    // Handle phase changed
    socketInstance.on('phase:changed', (data: { phase: string; message: string }) => {
      console.log('Phase changed:', data.phase, '-', data.message);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Send player position update
  const updatePosition = (position: { x: number; y: number; z: number }, rotation: { x: number; y: number; z: number }) => {
    if (socket && connected) {
      socket.emit('player:update', { position, rotation });
    }
  };

  // Toggle ready state
  const toggleReady = (isReady: boolean) => {
    if (socket && connected) {
      socket.emit('player:ready', { isReady });
    }
  };

  // Start game (manual trigger)
  const startGame = () => {
    if (socket && connected) {
      socket.emit('game:start');
    }
  };

  // Report that seeker found a hider
  const reportFound = (hiderId: string) => {
    if (socket && connected) {
      socket.emit('seeker:found', { hiderId });
    }
  };

  // End game (for testing)
  const endGame = () => {
    if (socket && connected) {
      socket.emit('game:end');
    }
  };

  // Get current player data
  const currentPlayer = players.find(p => p.id === playerId);

  // Get remote players with updated positions from refs
  // OPTIMIZATION: This combines the player state (role, name, etc.) with latest positions (from refs)
  // Note: positions update via refs and don't trigger re-renders
  const remotePlayers = useMemo(() => {
    return players
      .filter(p => p.id !== playerId)
      .map(player => {
        const latestPosition = playerPositionsRef.current.get(player.id);
        if (latestPosition) {
          return {
            ...player,
            position: latestPosition.position,
            rotation: latestPosition.rotation
          };
        }
        return player;
      });
  }, [players, playerId]); // Only re-compute when players list or playerId changes

  // Check if current player is seeker
  const isSeeker = currentPlayer?.role === 'seeker';

  // Get time remaining in current phase
  const getTimeRemaining = () => {
    if (!gameState.roundStartTime) return 0;
    
    const elapsed = Date.now() - gameState.roundStartTime;
    
    if (gameState.state === 'preparation') {
      return Math.max(0, gameState.preparationDuration - elapsed);
    } else if (gameState.state === 'seeking') {
      return Math.max(0, gameState.roundDuration - elapsed);
    }
    
    return 0;
  };

  return {
    socket,
    connected,
    playerId,
    players,
    remotePlayers,
    playerPositionsRef,
    currentPlayer,
    gameState,
    scoreboard,
    isSeeker,
    updatePosition,
    toggleReady,
    startGame,
    reportFound,
    endGame,
    getTimeRemaining
  };
}
