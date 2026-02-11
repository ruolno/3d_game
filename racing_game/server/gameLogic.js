// Game Logic - Manages game state, rounds, scoring, and roles
export class GameLogic {
  constructor(playerManager, io = null) {
    this.playerManager = playerManager;
    this.io = io; // Socket.IO instance for broadcasting
    this.gameState = 'lobby'; // 'lobby', 'preparation', 'seeking', 'roundEnd'
    this.currentSeeker = null;
    this.roundNumber = 0;
    this.roundStartTime = null;
    this.roundDuration = 120000; // 2 minutes in milliseconds
    this.preparationDuration = 30000; // 30 seconds for hiders to hide
    this.roundTimer = null;
    this.preparationTimer = null;
  }
  
  setIo(io) {
    this.io = io;
  }

  getGameState() {
    return {
      state: this.gameState,
      currentSeeker: this.currentSeeker,
      roundNumber: this.roundNumber,
      roundStartTime: this.roundStartTime,
      roundDuration: this.roundDuration,
      preparationDuration: this.preparationDuration
    };
  }

  canStartGame() {
    return this.playerManager.getPlayerCount() >= 2 && 
           this.playerManager.areAllPlayersReady() &&
           this.gameState === 'lobby';
  }

  startNewRound() {
    if (this.playerManager.getPlayerCount() < 2) {
      return { success: false, error: 'Not enough players' };
    }

    // Reset players for new round
    this.playerManager.resetPlayersForNewRound();

    // Select random seeker
    const players = this.playerManager.getConnectedPlayers();
    const randomIndex = Math.floor(Math.random() * players.length);
    this.currentSeeker = players[randomIndex].id;
    
    const seekerPlayer = this.playerManager.getPlayer(this.currentSeeker);
    if (seekerPlayer) {
      seekerPlayer.role = 'seeker';
    }

    // Start preparation phase
    this.roundNumber++;
    this.gameState = 'preparation';
    this.roundStartTime = Date.now();

    console.log(`Round ${this.roundNumber} starting - Seeker: ${seekerPlayer?.name}`);

    // After preparation, start seeking phase
    this.preparationTimer = setTimeout(() => {
      this.startSeekingPhase();
    }, this.preparationDuration);

    return { 
      success: true, 
      seeker: this.currentSeeker,
      roundNumber: this.roundNumber 
    };
  }

  startSeekingPhase() {
    this.gameState = 'seeking';
    this.roundStartTime = Date.now(); // Reset timer for seeking phase
    console.log('Seeking phase started');

    // Broadcast state change to all clients
    if (this.io) {
      this.io.emit('game:state', this.getGameState());
      this.io.emit('phase:changed', { 
        phase: 'seeking',
        message: 'Seeking phase started! Seeker can now hunt!'
      });
    }

    // Start round timer
    this.roundTimer = setTimeout(() => {
      this.endRound('timeUp');
    }, this.roundDuration);
  }

  handlePlayerFound(seekerId, hiderId) {
    // Validate seeker
    if (seekerId !== this.currentSeeker) {
      return { success: false, error: 'Not the seeker' };
    }

    // Validate game state
    if (this.gameState !== 'seeking') {
      return { success: false, error: 'Game not in seeking phase' };
    }

    const hider = this.playerManager.getPlayer(hiderId);
    if (!hider || hider.isCaught) {
      return { success: false, error: 'Invalid hider or already caught' };
    }

    // Mark hider as caught
    hider.isCaught = true;

    // Award points to seeker
    const seeker = this.playerManager.getPlayer(seekerId);
    if (seeker) {
      seeker.score += 10;
    }

    console.log(`${hider.name} was found by ${seeker?.name}`);

    // Check if all hiders are caught
    const remainingHiders = this.getRemainingHiders();
    if (remainingHiders.length === 0) {
      // Seeker found everyone - bonus points
      if (seeker) {
        seeker.score += 20;
      }
      this.endRound('allFound');
    }

    return { 
      success: true, 
      caughtPlayer: hiderId,
      seekerScore: seeker?.score || 0,
      remainingHiders: remainingHiders.length
    };
  }

  getRemainingHiders() {
    return this.playerManager
      .getConnectedPlayers()
      .filter(p => p.role === 'hider' && !p.isCaught);
  }

  endRound(reason = 'timeUp') {
    console.log(`Round ${this.roundNumber} ended: ${reason}`);

    // Clear timers
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.preparationTimer) {
      clearTimeout(this.preparationTimer);
      this.preparationTimer = null;
    }

    // Award points to surviving hiders
    if (reason === 'timeUp') {
      const survivingHiders = this.getRemainingHiders();
      survivingHiders.forEach(hider => {
        hider.score += 5;
      });
    }

    // Update game state
    this.gameState = 'roundEnd';

    // Calculate results
    const results = {
      reason,
      roundNumber: this.roundNumber,
      seeker: this.currentSeeker,
      players: this.playerManager.getPlayersForBroadcast(),
      scores: this.getScoreboard()
    };

    // Return to lobby after delay
    setTimeout(() => {
      this.returnToLobby();
    }, 5000);

    return results;
  }

  returnToLobby() {
    this.gameState = 'lobby';
    this.currentSeeker = null;
    console.log('Returned to lobby');
    
    // Broadcast state change
    if (this.io) {
      this.io.emit('game:state', this.getGameState());
    }
  }

  getScoreboard() {
    return this.playerManager
      .getAllPlayers()
      .map(p => ({
        id: p.id,
        name: p.name,
        score: p.score
      }))
      .sort((a, b) => b.score - a.score);
  }

  cleanup() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
    }
    if (this.preparationTimer) {
      clearTimeout(this.preparationTimer);
    }
  }
}
