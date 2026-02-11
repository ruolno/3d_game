import { useEffect, useState } from 'react'
import type { Player, GameState } from '../hooks/useMultiplayer'

interface GameUIProps {
  connected: boolean;
  currentPlayer: Player | null;
  players: Player[];
  gameState: GameState;
  scoreboard: Array<{ id: string; name: string; score: number }>;
  isSeeker: boolean;
  onToggleReady: (ready: boolean) => void;
  getTimeRemaining: () => number;
}

export function GameUI({
  connected,
  currentPlayer,
  players,
  gameState,
  scoreboard,
  isSeeker,
  onToggleReady,
  getTimeRemaining
}: GameUIProps) {
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Update timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining())
    }, 100)

    return () => clearInterval(interval)
  }, [getTimeRemaining])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  // Connection status
  if (!connected) {
    return (
      <div style={styles.overlay}>
        <div style={styles.connectionBox}>
          <h2>Connecting to server...</h2>
          <p>Please wait</p>
        </div>
      </div>
    )
  }

  // Lobby
  if (gameState.state === 'lobby') {
    return (
      <div style={styles.overlay}>
        <div style={styles.lobbyBox}>
          <h1 style={styles.title}>Hide and Seek</h1>
          
          <div style={styles.section}>
            <h2>Players ({players.length})</h2>
            <div style={styles.playerList}>
              {players.map(player => (
                <div key={player.id} style={styles.playerItem}>
                  <span style={{ color: player.id === currentPlayer?.id ? '#00ff00' : '#ffffff' }}>
                    {player.name} {player.id === currentPlayer?.id && '(You)'}
                  </span>
                  <span style={{ color: player.isReady ? '#00ff00' : '#ff6600' }}>
                    {player.isReady ? '✓ Ready' : '○ Not Ready'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <button
              style={{
                ...styles.button,
                backgroundColor: currentPlayer?.isReady ? '#ff6600' : '#00ff00'
              }}
              onClick={() => onToggleReady(!currentPlayer?.isReady)}
            >
              {currentPlayer?.isReady ? 'Not Ready' : 'Ready'}
            </button>
          </div>

          {players.length < 2 && (
            <p style={styles.warning}>Waiting for at least 2 players...</p>
          )}

          <div style={styles.rules}>
            <h3>Rules:</h3>
            <ul>
              <li>One player will be randomly selected as the seeker</li>
              <li>Hiders have 30 seconds to hide</li>
              <li>Seeker must find all hiders within 2 minutes</li>
              <li>Seeker gets +10 points per hider found, +20 bonus if all found</li>
              <li>Surviving hiders get +5 points</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // In-game HUD
  if (gameState.state === 'preparation' || gameState.state === 'seeking') {
    const remainingHiders = players.filter(p => p.role === 'hider' && !p.isCaught).length

    return (
      <>
        {/* Role indicator */}
        <div style={{
          ...styles.roleIndicator,
          backgroundColor: isSeeker ? '#ff0000' : '#0088ff'
        }}>
          <h2 style={styles.roleText}>
            {isSeeker ? '👁️ SEEKER' : '🙈 HIDER'}
          </h2>
          {gameState.state === 'preparation' && (
            <p style={styles.phaseText}>
              {isSeeker ? 'Wait here...' : 'Hide quickly!'}
            </p>
          )}
        </div>

        {/* Timer */}
        <div style={styles.timer}>
          <div style={styles.timerLabel}>
            {gameState.state === 'preparation' ? 'Hide Time' : 'Time Left'}
          </div>
          <div style={styles.timerValue}>
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Score panel */}
        <div style={styles.scorePanel}>
          <h3 style={styles.scorePanelTitle}>Scores</h3>
          {players.map(player => (
            <div key={player.id} style={styles.scoreItem}>
              <span style={{ 
                color: player.id === currentPlayer?.id ? '#00ff00' : '#ffffff',
                fontWeight: player.id === currentPlayer?.id ? 'bold' : 'normal'
              }}>
                {player.name}
              </span>
              <span>{player.score}</span>
            </div>
          ))}
        </div>

        {/* Hiders remaining (for seeker) */}
        {isSeeker && gameState.state === 'seeking' && (
          <div style={styles.hidersRemaining}>
            Hiders Remaining: {remainingHiders}
          </div>
        )}

        {/* Status (for hiders) */}
        {!isSeeker && currentPlayer?.isCaught && (
          <div style={styles.caughtIndicator}>
            You were found! 😢
          </div>
        )}
      </>
    )
  }

  // Round end scoreboard
  if (gameState.state === 'roundEnd') {
    return (
      <div style={styles.overlay}>
        <div style={styles.scoreboardBox}>
          <h1 style={styles.title}>Round {gameState.roundNumber} Complete!</h1>
          
          <div style={styles.finalScores}>
            <h2>Final Scores</h2>
            {scoreboard.map((player, index) => (
              <div key={player.id} style={{
                ...styles.finalScoreItem,
                backgroundColor: index === 0 ? 'rgba(255, 215, 0, 0.2)' : 
                                 index === 1 ? 'rgba(192, 192, 192, 0.2)' :
                                 index === 2 ? 'rgba(205, 127, 50, 0.2)' : 'transparent'
              }}>
                <span style={styles.rank}>#{index + 1}</span>
                <span style={{ 
                  color: player.id === currentPlayer?.id ? '#00ff00' : '#ffffff',
                  flex: 1
                }}>
                  {player.name}
                </span>
                <span style={styles.score}>{player.score}</span>
              </div>
            ))}
          </div>

          <p style={styles.nextRound}>Next round starting soon...</p>
        </div>
      </div>
    )
  }

  return null
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  connectionBox: {
    background: 'rgba(0, 0, 0, 0.9)',
    padding: '40px',
    borderRadius: '10px',
    textAlign: 'center',
    color: 'white',
  },
  lobbyBox: {
    background: 'rgba(0, 0, 0, 0.9)',
    padding: '40px',
    borderRadius: '15px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    color: 'white',
  },
  title: {
    fontSize: '36px',
    marginBottom: '30px',
    textAlign: 'center',
    color: '#00ff00',
  },
  section: {
    marginBottom: '25px',
  },
  playerList: {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '15px',
    borderRadius: '8px',
    marginTop: '10px',
  },
  playerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  button: {
    width: '100%',
    padding: '15px 30px',
    fontSize: '18px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'white',
    transition: 'transform 0.1s',
  },
  warning: {
    color: '#ff6600',
    textAlign: 'center',
    fontSize: '14px',
  },
  rules: {
    marginTop: '30px',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    fontSize: '14px',
  },
  roleIndicator: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '15px 40px',
    borderRadius: '10px',
    zIndex: 1000,
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
  },
  roleText: {
    margin: 0,
    color: 'white',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  phaseText: {
    margin: '5px 0 0 0',
    color: 'white',
    fontSize: '14px',
  },
  timer: {
    position: 'fixed',
    top: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.7)',
    padding: '15px 30px',
    borderRadius: '10px',
    zIndex: 1000,
    textAlign: 'center',
  },
  timerLabel: {
    color: '#aaaaaa',
    fontSize: '12px',
    marginBottom: '5px',
  },
  timerValue: {
    color: '#ffffff',
    fontSize: '32px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  scorePanel: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'rgba(0, 0, 0, 0.7)',
    padding: '15px',
    borderRadius: '10px',
    minWidth: '200px',
    zIndex: 1000,
  },
  scorePanelTitle: {
    margin: '0 0 10px 0',
    color: '#00ff00',
    fontSize: '16px',
    textAlign: 'center',
  },
  scoreItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '14px',
    color: 'white',
  },
  hidersRemaining: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255, 0, 0, 0.8)',
    color: 'white',
    padding: '15px 30px',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: 'bold',
    zIndex: 1000,
  },
  caughtIndicator: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(100, 100, 100, 0.8)',
    color: 'white',
    padding: '15px 30px',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: 'bold',
    zIndex: 1000,
  },
  scoreboardBox: {
    background: 'rgba(0, 0, 0, 0.9)',
    padding: '40px',
    borderRadius: '15px',
    maxWidth: '500px',
    width: '90%',
    color: 'white',
  },
  finalScores: {
    marginTop: '30px',
  },
  finalScoreItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    marginBottom: '10px',
    borderRadius: '8px',
    fontSize: '18px',
  },
  rank: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginRight: '15px',
    minWidth: '40px',
  },
  score: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#00ff00',
  },
  nextRound: {
    textAlign: 'center',
    marginTop: '30px',
    color: '#aaaaaa',
    fontSize: '14px',
  },
}
