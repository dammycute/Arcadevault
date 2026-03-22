// TicTacToeGame.jsx — Tic Tac Toe for Arcade Vault
// Play vs AI with animated X and O markers

import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useCallback, useRef } from 'react';

const { width: SW } = Dimensions.get('window');

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],         // diags
];

function checkWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] };
    }
  }
  return null;
}

function isFull(board) {
  return board.every(c => c !== null);
}

// Simple AI: win > block > center > corner > random
function getAIMove(board, aiMark, playerMark) {
  // Try to win
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const copy = [...board]; copy[i] = aiMark;
      if (checkWinner(copy)) return i;
    }
  }
  // Try to block
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const copy = [...board]; copy[i] = playerMark;
      if (checkWinner(copy)) return i;
    }
  }
  // Center
  if (!board[4]) return 4;
  // Corners
  const corners = [0,2,6,8].filter(i => !board[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  // Random
  const empty = board.map((v,i) => v === null ? i : -1).filter(i => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)];
}

// ─── CELL COMPONENT ─────────────────────────────────────────────────────────
function Cell({ value, onPress, isWinCell, cellSize }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const prevVal = useRef(null);

  useEffect(() => {
    if (value && value !== prevVal.current) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }).start();
      prevVal.current = value;
    }
    if (!value) {
      scaleAnim.setValue(0);
      prevVal.current = null;
    }
  }, [value]);

  return (
    <TouchableOpacity
      style={[
        s.cell,
        { width: cellSize, height: cellSize },
        isWinCell && s.cellWin,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!!value}
    >
      {value && (
        <Animated.Text
          style={[
            s.cellText,
            { fontSize: cellSize * 0.5, transform: [{ scale: scaleAnim }] },
            value === 'X' ? s.cellX : s.cellO,
            isWinCell && s.cellTextWin,
          ]}
        >
          {value}
        </Animated.Text>
      )}
    </TouchableOpacity>
  );
}

// ─── HOME SCREEN ────────────────────────────────────────────────────────────
function HomeScreen({ onStart, stats }) {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.homeContainer}>
      <TouchableOpacity style={s.homeBackBtn} onPress={() => router.back()}>
        <Text style={s.homeBackText}>← BACK</Text>
      </TouchableOpacity>
      <Text style={s.homeEmoji}>❌⭕</Text>
      <Text style={s.homeTitle}>TIC TAC{'\n'}TOE</Text>
      <Text style={s.homeSubtitle}>Challenge the AI • Classic strategy</Text>

      <View style={s.previewBoard}>
        {['X',null,'O',null,'X',null,'O',null,'X'].map((v, i) => (
          <View key={i} style={s.previewCell}>
            {v && <Text style={[s.previewCellText, v === 'X' ? s.cellX : s.cellO]}>{v}</Text>}
          </View>
        ))}
      </View>

      {stats.total > 0 && (
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: '#2ECC71' }]}>{stats.wins}</Text>
            <Text style={s.statLabel}>WINS</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: '#E74C3C' }]}>{stats.losses}</Text>
            <Text style={s.statLabel}>LOSSES</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: '#F39C12' }]}>{stats.draws}</Text>
            <Text style={s.statLabel}>DRAWS</Text>
          </View>
        </View>
      )}

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity style={s.startBtn} onPress={() => onStart('X')} activeOpacity={0.8}>
          <Text style={s.startBtnText}>PLAY AS X</Text>
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity style={s.startBtnAlt} onPress={() => onStart('O')} activeOpacity={0.8}>
        <Text style={s.startBtnAltText}>PLAY AS O</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── RESULT SCREEN ──────────────────────────────────────────────────────────
function ResultScreen({ result, onReplay, onMenu }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, []);

  const emoji = result === 'win' ? '🏆' : result === 'lose' ? '💀' : '🤝';
  const title = result === 'win' ? 'YOU WIN!' : result === 'lose' ? 'YOU LOSE' : 'DRAW!';
  const color = result === 'win' ? '#2ECC71' : result === 'lose' ? '#E74C3C' : '#F39C12';

  return (
    <Animated.View style={[s.overlay, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={s.overlayEmoji}>{emoji}</Text>
      <Text style={[s.overlayTitle, { color }]}>{title}</Text>
      <View style={s.btnRow}>
        <TouchableOpacity style={s.btnSecondary} onPress={onMenu} activeOpacity={0.8}>
          <Text style={s.btnSecondaryText}>↩ EXIT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnPrimary, { backgroundColor: color }]} onPress={onReplay} activeOpacity={0.8}>
          <Text style={s.btnPrimaryText}>↺ AGAIN</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── GAME SCREEN ────────────────────────────────────────────────────────────
function GameScreen({ playerMark, onResult, onMenu }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState('X'); // X always goes first
  const [result, setResult] = useState(null); // null | { winner, line }
  const [gameOver, setGameOver] = useState(false);

  const aiMark = playerMark === 'X' ? 'O' : 'X';
  const GAP = 6;
  const boardSize = containerWidth > 0 ? Math.min(containerWidth - 48, 360) : 0;
  const cellSize = boardSize > 0 ? (boardSize - GAP * 2) / 3 : 0;

  // AI plays first if player is O
  useEffect(() => {
    if (turn === aiMark && !gameOver && board.every(c => c === null) && playerMark === 'O') {
      const timer = setTimeout(() => {
        const idx = getAIMove(board, aiMark, playerMark);
        makeMove(idx, aiMark);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const makeMove = useCallback((idx, mark) => {
    setBoard(prev => {
      if (prev[idx] || gameOver) return prev;
      const next = [...prev];
      next[idx] = mark;

      const win = checkWinner(next);
      if (win) {
        setResult(win);
        setGameOver(true);
        setTimeout(() => {
          onResult(win.winner === playerMark ? 'win' : 'lose');
        }, 800);
      } else if (isFull(next)) {
        setGameOver(true);
        setTimeout(() => onResult('draw'), 600);
      } else {
        setTurn(mark === 'X' ? 'O' : 'X');
      }
      return next;
    });
  }, [gameOver, playerMark, onResult]);

  // AI turn
  useEffect(() => {
    if (turn === aiMark && !gameOver) {
      const timer = setTimeout(() => {
        setBoard(prev => {
          if (gameOver) return prev;
          const idx = getAIMove(prev, aiMark, playerMark);
          if (idx === undefined) return prev;
          const next = [...prev];
          next[idx] = aiMark;

          const win = checkWinner(next);
          if (win) {
            setResult(win);
            setGameOver(true);
            setTimeout(() => onResult('lose'), 800);
          } else if (isFull(next)) {
            setGameOver(true);
            setTimeout(() => onResult('draw'), 600);
          } else {
            setTurn(playerMark);
          }
          return next;
        });
      }, 400 + Math.random() * 300);
      return () => clearTimeout(timer);
    }
  }, [turn, gameOver]);

  const handleCellPress = (idx) => {
    if (turn !== playerMark || gameOver || board[idx]) return;
    makeMove(idx, playerMark);
  };

  const winCells = result ? result.line : [];

  return (
    <View style={s.gameContainer} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <View style={s.gameHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onMenu} activeOpacity={0.7}>
          <Text style={s.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.levelText}>TIC TAC TOE</Text>
        <View style={s.turnBox}>
          <Text style={[s.turnText, turn === 'X' ? s.cellX : s.cellO]}>
            {gameOver ? '—' : turn}
          </Text>
          <Text style={s.turnLabel}>{gameOver ? 'DONE' : 'TURN'}</Text>
        </View>
      </View>

      <View style={s.markInfo}>
        <Text style={s.markInfoText}>
          You are <Text style={playerMark === 'X' ? s.cellX : s.cellO}>{playerMark}</Text>
          {'  •  '}
          AI is <Text style={aiMark === 'X' ? s.cellX : s.cellO}>{aiMark}</Text>
        </Text>
      </View>

      {cellSize > 0 && (
        <View style={[s.board, { width: boardSize, gap: GAP }]}>
          {[0,1,2].map(row => (
            <View key={row} style={[s.boardRow, { gap: GAP }]}>
              {[0,1,2].map(col => {
                const idx = row * 3 + col;
                return (
                  <Cell
                    key={idx}
                    value={board[idx]}
                    onPress={() => handleCellPress(idx)}
                    isWinCell={winCells.includes(idx)}
                    cellSize={cellSize}
                  />
                );
              })}
            </View>
          ))}
        </View>
      )}

      <Text style={s.hint}>
        {gameOver ? 'Game finished!' : turn === playerMark ? 'Your turn — tap a cell' : 'AI is thinking...'}
      </Text>
    </View>
  );
}

// ─── ROOT ───────────────────────────────────────────────────────────────────
export default function TicTacToeGame() {
  const [screen, setScreen] = useState('home');
  const [playerMark, setPlayerMark] = useState('X');
  const [lastResult, setLastResult] = useState(null);
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0, total: 0 });

  useEffect(() => {
    AsyncStorage.getItem('@score_data_tic_tac_toe').then(data => {
      if (data) setStats(JSON.parse(data));
    }).catch(e => console.log(e));
  }, []);

  const handleResult = (result) => {
    setLastResult(result);
    setStats(prev => {
      const next = {
        wins: prev.wins + (result === 'win' ? 1 : 0),
        losses: prev.losses + (result === 'lose' ? 1 : 0),
        draws: prev.draws + (result === 'draw' ? 1 : 0),
        total: prev.total + 1,
      };
      AsyncStorage.setItem('@score_data_tic_tac_toe', JSON.stringify(next));
      AsyncStorage.setItem('@highscore_tic_tac_toe', next.wins + ' Wins');
      return next;
    });
    setScreen('result');
  };

  if (screen === 'home')
    return (
      <HomeScreen
        onStart={(mark) => { setPlayerMark(mark); setScreen('game'); }}
        stats={stats}
      />
    );

  if (screen === 'game')
    return (
      <GameScreen
        key={`game-${Date.now()}`}
        playerMark={playerMark}
        onResult={handleResult}
        onMenu={() => setScreen('home')}
      />
    );

  if (screen === 'result')
    return (
      <ResultScreen
        result={lastResult}
        onReplay={() => setScreen('game')}
        onMenu={() => setScreen('home')}
      />
    );

  return null;
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  homeContainer: {
    flex: 1,
    backgroundColor: '#0d0d17',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 32,
    paddingTop: Platform.OS === 'android' ? 60 : 32,
  },
  homeBackBtn: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: '#12121e', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  homeBackText: { color: '#6B6B8E', fontSize: 12, fontWeight: '700' },
  homeEmoji: { fontSize: 56 },
  homeTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    textAlign: 'center',
    lineHeight: 48,
  },
  homeSubtitle: {
    fontSize: 13,
    color: '#6B6B8E',
    letterSpacing: 1.5,
  },
  previewBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 150,
    gap: 4,
    padding: 10,
    backgroundColor: '#12121e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  previewCell: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCellText: {
    fontSize: 20,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#12121e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    minWidth: 70,
  },
  statVal: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 9, color: '#6B6B8E', fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  startBtn: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 52,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  startBtnAlt: {
    backgroundColor: '#12121e',
    paddingHorizontal: 44,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  startBtnAltText: {
    color: '#3498DB',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Game
  gameContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0d0d17',
    paddingTop: Platform.OS === 'android' ? 60 : 16,
    gap: 16,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#12121e',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtnText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
  levelText: {
    flex: 1, textAlign: 'center',
    color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 3,
  },
  turnBox: {
    alignItems: 'center',
    backgroundColor: '#12121e',
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6,
    minWidth: 52,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  turnText: { fontSize: 18, fontWeight: '900' },
  turnLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  markInfo: { paddingHorizontal: 16 },
  markInfoText: { color: '#6B6B8E', fontSize: 13, fontWeight: '600' },

  board: {
    backgroundColor: '#12121e',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  boardRow: { flexDirection: 'row' },
  cell: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  cellWin: {
    backgroundColor: 'rgba(46,204,113,0.15)',
    borderColor: 'rgba(46,204,113,0.3)',
  },
  cellText: { fontWeight: '900' },
  cellTextWin: { textShadowColor: '#2ECC71', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  cellX: { color: '#E74C3C' },
  cellO: { color: '#3498DB' },
  hint: { color: '#3a3a5a', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },

  // Overlay
  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0d0d17', gap: 16, padding: 32,
    paddingTop: Platform.OS === 'android' ? 60 : 32,
  },
  overlayEmoji: { fontSize: 64 },
  overlayTitle: { fontSize: 32, fontWeight: '900', letterSpacing: 4 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnPrimary: {
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: 14,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  btnSecondary: {
    backgroundColor: '#12121e',
    paddingHorizontal: 24, paddingVertical: 16, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  btnSecondaryText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
});
