// Player Manager - Handles player connections and state
export class PlayerManager {
  constructor() {
    this.players = new Map(); // socketId -> player data
  }

  addPlayer(socketId, playerData = {}) {
    const player = {
      id: socketId,
      name: playerData.name || `Player_${this.players.size + 1}`,
      position: { x: 0, y: 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      role: 'hider', // 'seeker' or 'hider'
      score: 0,
      isReady: false,
      isCaught: false,
      isConnected: true,
      joinedAt: Date.now(),
      ...playerData
    };
    
    this.players.set(socketId, player);
    console.log(`Player added: ${player.name} (${socketId})`);
    return player;
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      this.players.delete(socketId);
      console.log(`Player removed: ${player.name} (${socketId})`);
      return player;
    }
    return null;
  }

  updatePlayerPosition(socketId, position, rotation) {
    const player = this.players.get(socketId);
    if (player) {
      player.position = position;
      player.rotation = rotation;
      return true;
    }
    return false;
  }

  updatePlayerReady(socketId, isReady) {
    const player = this.players.get(socketId);
    if (player) {
      player.isReady = isReady;
      return true;
    }
    return false;
  }

  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  getConnectedPlayers() {
    return this.getAllPlayers().filter(p => p.isConnected);
  }

  getPlayerCount() {
    return this.players.size;
  }

  areAllPlayersReady() {
    const players = this.getConnectedPlayers();
    return players.length >= 2 && players.every(p => p.isReady);
  }

  resetPlayersForNewRound() {
    this.players.forEach(player => {
      player.isReady = false;
      player.isCaught = false;
      player.role = 'hider';
    });
  }

  getPlayersForBroadcast() {
    return this.getAllPlayers().map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      rotation: p.rotation,
      role: p.role,
      score: p.score,
      isReady: p.isReady,
      isCaught: p.isCaught
    }));
  }
}
