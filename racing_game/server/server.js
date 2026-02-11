import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PlayerManager } from './playerManager.js';
import { GameLogic } from './gameLogic.js';

const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors());

// Socket.IO server with CORS
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize game managers
const playerManager = new PlayerManager();
const gameLogic = new GameLogic(playerManager);

// Set Socket.IO instance after initialization
setTimeout(() => {
  gameLogic.setIo(io);
}, 0);

// Broadcast helper
function broadcastGameState() {
  io.emit('game:state', gameLogic.getGameState());
}

function broadcastPlayersList() {
  io.emit('players:list', playerManager.getPlayersForBroadcast());
}

function broadcastScores() {
  io.emit('game:scores', gameLogic.getScoreboard());
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Add player
  const player = playerManager.addPlayer(socket.id, {
    name: `Player_${playerManager.getPlayerCount()}`
  });

  // Send player their ID and initial game state
  socket.emit('player:id', { 
    id: socket.id, 
    player: player 
  });

  // Broadcast updated players list to all clients
  broadcastPlayersList();
  broadcastGameState();

  // Handle player position updates
  socket.on('player:update', (data) => {
    const { position, rotation } = data;
    playerManager.updatePlayerPosition(socket.id, position, rotation);
    
    // Broadcast to other players (not the sender)
    socket.broadcast.emit('player:moved', {
      id: socket.id,
      position,
      rotation,
      timestamp: Date.now()
    });
  });

  // Handle player ready
  socket.on('player:ready', (data) => {
    playerManager.updatePlayerReady(socket.id, data.isReady);
    broadcastPlayersList();

    // Check if all players are ready and can start game
    if (gameLogic.canStartGame()) {
      const result = gameLogic.startNewRound();
      if (result.success) {
        broadcastGameState();
        broadcastPlayersList();
      }
    }
  });

  // Handle game start request (manual trigger)
  socket.on('game:start', () => {
    if (gameLogic.canStartGame()) {
      const result = gameLogic.startNewRound();
      if (result.success) {
        io.emit('round:started', {
          roundNumber: result.roundNumber,
          seeker: result.seeker
        });
        broadcastGameState();
        broadcastPlayersList();
      }
    }
  });

  // Handle seeker finding hider
  socket.on('seeker:found', (data) => {
    const { hiderId } = data;
    const result = gameLogic.handlePlayerFound(socket.id, hiderId);
    
    if (result.success) {
      // Notify all players
      io.emit('player:caught', {
        caughtPlayer: result.caughtPlayer,
        seeker: socket.id,
        remainingHiders: result.remainingHiders
      });
      
      broadcastPlayersList();
      broadcastScores();

      // Check if round ended (all hiders caught)
      if (result.remainingHiders === 0) {
        const endResults = gameLogic.endRound('allFound');
        io.emit('round:ended', endResults);
        broadcastGameState();
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    const player = playerManager.removePlayer(socket.id);
    
    // If disconnected player was the seeker, end the round
    if (player && player.id === gameLogic.currentSeeker) {
      if (gameLogic.gameState === 'seeking' || gameLogic.gameState === 'preparation') {
        const endResults = gameLogic.endRound('seekerDisconnected');
        io.emit('round:ended', endResults);
      }
    }

    broadcastPlayersList();
    broadcastGameState();
  });

  // Handle manual round end (for testing)
  socket.on('game:end', () => {
    if (gameLogic.gameState === 'seeking') {
      const results = gameLogic.endRound('manual');
      io.emit('round:ended', results);
      broadcastGameState();
      broadcastScores();
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    players: playerManager.getPlayerCount(),
    gameState: gameLogic.getGameState()
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Hide and Seek server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  gameLogic.cleanup();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
