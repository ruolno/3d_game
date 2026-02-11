# Hide and Seek - Multiplayer Game

A real-time multiplayer hide and seek game built with React Three Fiber, Socket.IO, and Rapier physics.

## Features

- Real-time multiplayer with WebSocket communication
- Hide and seek game mechanics
- Role-based gameplay (Seeker vs Hiders)
- Scoring system
- 3D environment with physics
- Smooth player interpolation
- Game lobby and HUD

## Setup Instructions

### 1. Install Server Dependencies

```bash
cd server
npm install
```

### 2. Install Client Dependencies

Already installed in the main project.

### 3. Start the Server

```bash
cd server
npm start
```

The server will run on `http://localhost:3001`

### 4. Start the Client (in a new terminal)

```bash
cd ..
npm run dev
```

The client will run on `http://localhost:5173`

### 5. Play the Game

1. Open multiple browser windows/tabs at `http://localhost:5173`
2. Each window represents a different player
3. Wait for at least 2 players in the lobby
4. Click "Ready" in each window
5. The game will start automatically when all players are ready

## Game Rules

### Roles
- **Seeker**: One player randomly selected to find the hiders
- **Hiders**: All other players must hide and avoid the seeker

### Phases
1. **Lobby**: Players join and mark themselves as ready
2. **Preparation** (10 seconds): Hiders spread out and hide
3. **Seeking** (2 minutes): Seeker tries to find all hiders
4. **Round End**: Show scores and prepare for next round

### Scoring
- **Seeker**:
  - +10 points for each hider found
  - +20 bonus points if all hiders are found before time runs out
  
- **Hiders**:
  - +5 points if they survive until the end of the round
  - 0 points if caught

### Controls
- **Arrow Keys**: Move your character
- **Shift**: Run (faster movement)
- **Space**: Jump
- **D**: Toggle debug mode (physics wireframes)

## Architecture

### Server (`/server`)
- `server.js`: Express + Socket.IO server
- `gameLogic.js`: Game state management, rounds, scoring
- `playerManager.js`: Player connection and state management

### Client (`/src`)
- `App.tsx`: Main application component
- `hooks/useMultiplayer.ts`: WebSocket connection and state management
- `components/`:
  - `Model.jsx`: Local player with physics and controls
  - `RemotePlayer.jsx`: Remote player rendering and interpolation
  - `GameUI.tsx`: UI components (lobby, HUD, scoreboard)
  - `CityScene.jsx`: 3D city environment

## Technical Details

### Network Communication
- Update rate: 20 Hz (50ms intervals)
- WebSocket protocol via Socket.IO
- Client-authoritative movement, server-authoritative game logic

### Physics
- Physics engine: Rapier (via @react-three/rapier)
- Collision detection for player interactions
- Capsule colliders for smooth character movement

### Events
- `player:update`: Position/rotation updates
- `player:ready`: Player ready state
- `seeker:found`: Seeker found a hider
- `game:state`: Game phase updates
- `players:list`: Updated player list
- `game:scores`: Scoreboard updates

## Troubleshooting

### Server won't start
- Make sure port 3001 is available
- Check that all dependencies are installed: `cd server && npm install`

### Can't connect to server
- Verify the server is running
- Check the console for connection errors
- Ensure firewall isn't blocking port 3001

### Players not appearing
- Check browser console for errors
- Verify WebSocket connection is established
- Make sure models are loaded (`/models/person/model.glb`)

### Physics issues
- Toggle debug mode (press 'D') to see collision shapes
- Check that Rapier is properly initialized
- Verify model scale matches collider scale

## Development

### Server hot-reload
```bash
cd server
npm run dev
```

### Client hot-reload
Already enabled by Vite (main project)

## Future Enhancements

- Voice chat integration
- Custom player names
- Multiple maps/levels
- Power-ups and special abilities
- Persistent leaderboard
- Team modes
- Spectator mode for caught players
- Better visual indicators for roles
- Sound effects and music

## Credits

Built with:
- React Three Fiber
- Socket.IO
- Rapier Physics
- Three.js
- Vite
