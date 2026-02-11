import create from 'zustand'

// Multiplayer game store for Hide and Seek
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

export interface GameState {
  state: 'lobby' | 'preparation' | 'seeking' | 'roundEnd';
  currentSeeker: string | null;
  roundNumber: number;
  roundStartTime: number | null;
  roundDuration: number;
  preparationDuration: number;
}

interface MultiplayerState {
  // Connection
  connected: boolean;
  playerId: string | null;
  
  // Players
  players: Player[];
  remotePlayers: Player[];
  currentPlayer: Player | null;
  
  // Game state
  gameState: GameState;
  scoreboard: Array<{ id: string; name: string; score: number }>;
  
  // UI
  showLobby: boolean;
  showHUD: boolean;
  showScoreboard: boolean;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setPlayerId: (id: string | null) => void;
  setPlayers: (players: Player[]) => void;
  setGameState: (state: GameState) => void;
  setScoreboard: (scores: Array<{ id: string; name: string; score: number }>) => void;
  setShowLobby: (show: boolean) => void;
  setShowHUD: (show: boolean) => void;
  setShowScoreboard: (show: boolean) => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  // Initial state
  connected: false,
  playerId: null,
  players: [],
  remotePlayers: [],
  currentPlayer: null,
  gameState: {
    state: 'lobby',
    currentSeeker: null,
    roundNumber: 0,
    roundStartTime: null,
    roundDuration: 120000,
    preparationDuration: 10000
  },
  scoreboard: [],
  showLobby: true,
  showHUD: false,
  showScoreboard: false,
  
  // Actions
  setConnected: (connected) => set({ connected }),
  
  setPlayerId: (id) => set({ playerId: id }),
  
  setPlayers: (players) => {
    const { playerId } = get();
    const currentPlayer = players.find(p => p.id === playerId) || null;
    const remotePlayers = players.filter(p => p.id !== playerId);
    set({ players, currentPlayer, remotePlayers });
  },
  
  setGameState: (gameState) => {
    set({ gameState });
    // Auto-manage UI visibility based on game state
    if (gameState.state === 'lobby') {
      set({ showLobby: true, showHUD: false, showScoreboard: false });
    } else if (gameState.state === 'preparation' || gameState.state === 'seeking') {
      set({ showLobby: false, showHUD: true, showScoreboard: false });
    } else if (gameState.state === 'roundEnd') {
      set({ showLobby: false, showHUD: false, showScoreboard: true });
    }
  },
  
  setScoreboard: (scoreboard) => set({ scoreboard }),
  setShowLobby: (showLobby) => set({ showLobby }),
  setShowHUD: (showHUD) => set({ showHUD }),
  setShowScoreboard: (showScoreboard) => set({ showScoreboard }),
}));
