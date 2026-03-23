// NumberMergeGame.jsx — 2048 Clone for Arcade Vault
// Swipe-based tile merging with animated transitions

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Dimensions, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');
const GRID = 4;

// ─── TILE COLORS ────────────────────────────────────────────────────────────
const TILE_COLORS = {
  0: 'transparent',
  2: '#2A2A48',
  4: '#33335A',
  8: '#E67E22',
  16: '#E74C3C',
  32: '#C0392B',
  64: '#D35400',
  128: '#F39C12',
  256: '#F1C40F',
  512: '#2ECC71',
  1024: '#1ABC9C',
  2048: '#9B59B6',
};

const TILE_TEXT_COLORS = {
  2: '#aca9b8',
  4: '#c0bdd0',
  8: '#fff',
  16: '#fff',
  32: '#fff',
  64: '#fff',
  128: '#fff',
  256: '#fff',
  512: '#fff',
  1024: '#fff',
  2048: '#fff',
};

// ─── GAME LOGIC HELPERS ─────────────────────────────────────────────────────

function createEmpty() {
  return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}

function addRandom(grid) {
  const empty = [];
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (grid[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const copy = grid.map(row => [...row]);
  copy[r][c] = Math.random() < 0.9 ? 2 : 4;
  return copy;
}

function slideRow(row) {
  const filtered = row.filter(v => v !== 0);
  const merged = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < GRID) merged.push(0);
  return { row: merged, score };
}

function rotateGrid(grid) {
  const n = grid.length;
  const result = createEmpty();
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      result[c][n - 1 - r] = grid[r][c];
  return result;
}

function moveLeft(grid) {
  let totalScore = 0;
  const newGrid = grid.map(row => {
    const { row: newRow, score } = slideRow(row);
    totalScore += score;
    return newRow;
  });
  return { grid: newGrid, score: totalScore };
}

function move(grid, direction) {
  let g = grid.map(r => [...r]);
  let rotations = { left: 0, up: 1, right: 2, down: 3 }[direction] || 0;
  for (let i = 0; i < rotations; i++) g = rotateGrid(g);
  const result = moveLeft(g);
  let ng = result.grid;
  for (let i = 0; i < (4 - rotations) % 4; i++) ng = rotateGrid(ng);
  return { grid: ng, score: result.score };
}

function gridsEqual(a, b) {
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (a[r][c] !== b[r][c]) return false;
  return true;
}

function canMove(grid) {
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < GRID && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < GRID && grid[r][c] === grid[r + 1][c]) return true;
    }
  return false;
}

function hasWon(grid) {
  return grid.some(row => row.some(cell => cell >= 2048));
}

// ─── ANIMATED TILE ──────────────────────────────────────────────────────────
function Tile({ value, cellSize }) {
  const scaleAnim = useRef(new Animated.Value(value ? 0.5 : 1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      if (value && value !== prevValue.current && prevValue.current !== 0) {
        scaleAnim.setValue(1.2);
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
      } else if (value && prevValue.current === 0) {
        scaleAnim.setValue(0.3);
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
      }
      prevValue.current = value;
    }
  }, [value]);

  if (value === 0) return <View style={[s.cell, { width: cellSize, height: cellSize }]} />;

  const bg = TILE_COLORS[value] || '#6C3483';
  const textColor = TILE_TEXT_COLORS[value] || '#fff';
  const fontSize = value >= 1024 ? cellSize * 0.25 : value >= 128 ? cellSize * 0.3 : cellSize * 0.38;

  return (
    <Animated.View style={[s.cell, s.cellFilled, {
      width: cellSize, height: cellSize,
      backgroundColor: bg,
      transform: [{ scale: scaleAnim }],
    }]}>
      <Text style={[s.cellText, { color: textColor, fontSize }]}>{value}</Text>
    </Animated.View>
  );
}

// ─── HOME SCREEN ────────────────────────────────────────────────────────────
function HomeScreen({ onStart, highScore }) {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={s.homeContainer}>
      <TouchableOpacity style={s.homeBackBtn} onPress={() => router.back()}>
        <Text style={s.homeBackText}>← BACK</Text>
      </TouchableOpacity>
      <View style={s.homeContent}>
        <Text style={s.homeEmoji}>🔢</Text>
        <Text style={s.homeTitle}>NUMBER{'\n'}MERGE</Text>
        <Text style={s.homeSubtitle}>Slide • Merge • Conquer 2048</Text>

        <View style={s.previewGrid}>
          {[[2, 4, 8, 16], [32, 64, 128, 256], [512, 1024, 2048, 0], [4, 0, 2, 8]].map((row, r) => (
            <View key={r} style={s.previewRow}>
              {row.map((val, c) => (
                <View key={c} style={[s.previewCell, { backgroundColor: TILE_COLORS[val] || '#6C3483' }]}>
                  {val > 0 && <Text style={[s.previewCellText, { fontSize: val >= 128 ? 8 : 10 }]}>{val}</Text>}
                </View>
              ))}
            </View>
          ))}
        </View>

        {highScore > 0 && (
          <View style={s.highScoreContainer}>
            <Text style={s.highScoreLabel}>HIGH SCORE</Text>
            <Text style={s.highScoreValue}>{highScore}</Text>
          </View>
        )}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity style={s.startBtn} onPress={onStart} activeOpacity={0.8}>
            <Text style={s.startBtnText}>START GAME</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={s.howToPlay}>
          <Text style={s.howTitle}>HOW TO PLAY</Text>
          <Text style={s.howText}>Swipe to slide tiles. Matching numbers merge into a higher value. Reach 2048 to win!</Text>
        </View>
      </View>
    </View>
  );
}

// ─── GAME OVER SCREEN ───────────────────────────────────────────────────────
function GameOverScreen({ score, highScore, won, onReplay, onMenu }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[s.overlay, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={s.overlayEmoji}>{won ? '🏆' : '💀'}</Text>
      <Text style={[s.overlayTitle, !won && { color: '#E74C3C' }]}>
        {won ? 'YOU WIN!' : 'GAME OVER'}
      </Text>
      <View style={s.overStats}>
        <View style={s.overStat}>
          <Text style={s.overStatVal}>{score}</Text>
          <Text style={s.overStatLabel}>SCORE</Text>
        </View>
        <View style={s.overStatDivider} />
        <View style={s.overStat}>
          <Text style={[s.overStatVal, { color: '#F39C12' }]}>{highScore}</Text>
          <Text style={s.overStatLabel}>BEST</Text>
        </View>
      </View>
      <View style={s.btnRow}>
        <TouchableOpacity style={s.btnSecondary} onPress={onMenu} activeOpacity={0.8}>
          <Text style={s.btnSecondaryText}>↩ EXIT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnPrimary} onPress={onReplay} activeOpacity={0.8}>
          <Text style={s.btnPrimaryText}>↺ REPLAY</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── GAME SCREEN ────────────────────────────────────────────────────────────
function GameScreen({ onGameOver, onMenu }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [grid, setGrid] = useState(() => {
    let g = createEmpty();
    g = addRandom(g);
    g = addRandom(g);
    return g;
  });
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('playing');
  const [hasAcknowledgedWin, setHasAcknowledgedWin] = useState(false);

  const gridRef = useRef(grid);
  const scoreRef = useRef(score);
  const gameStateRef = useRef(gameState);
  const hasWonRef = useRef(hasAcknowledgedWin);
  // Track touch start for swipe detection
  const touchStartRef = useRef(null);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { hasWonRef.current = hasAcknowledgedWin; }, [hasAcknowledgedWin]);

  const GAP = 6;
  const BOARD_PAD = 12;
  const boardSize = containerWidth > 0 ? containerWidth - 32 : 0;
  const cellSize = boardSize > 0 ? (boardSize - BOARD_PAD * 2 - GAP * (GRID - 1)) / GRID : 0;

  const doMove = useCallback((direction) => {
    const currentGrid = gridRef.current;
    const currentScore = scoreRef.current;
    const currentGameState = gameStateRef.current;
    const currentHasWon = hasWonRef.current;

    if (currentGameState === 'lost' || (currentGameState === 'won' && !currentHasWon)) return;

    const result = move(currentGrid, direction);
    if (gridsEqual(currentGrid, result.grid)) return;

    const newGrid = addRandom(result.grid);
    const newScore = currentScore + result.score;
    setGrid(newGrid);
    setScore(newScore);

    if (hasWon(newGrid) && !currentHasWon) {
      setGameState('won');
      setTimeout(() => onGameOver(newScore, true), 400);
      return;
    }
    if (!canMove(newGrid)) {
      setGameState('lost');
      setTimeout(() => onGameOver(newScore, false), 400);
    }
  }, [onGameOver]);

  // Keyboard support for web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e) => {
      const keyMap = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        W: 'up', S: 'down', A: 'left', D: 'right',
      };
      const dir = keyMap[e.key];
      if (dir) { e.preventDefault(); doMove(dir); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doMove]);

  // Simple touch handlers — no PanResponder, no dragging
  const handleTouchStart = useCallback((e) => {
    const touch = e.nativeEvent.touches[0];
    touchStartRef.current = { x: touch.pageX, y: touch.pageY };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;
    const touch = e.nativeEvent.changedTouches[0];
    const dx = touch.pageX - touchStartRef.current.x;
    const dy = touch.pageY - touchStartRef.current.y;
    touchStartRef.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < 12 && absDy < 12) return; // too small

    if (absDx > absDy) {
      doMove(dx > 0 ? 'right' : 'left');
    } else {
      doMove(dy > 0 ? 'down' : 'up');
    }
  }, [doMove]);

  const resetGame = () => {
    let g = createEmpty();
    g = addRandom(g);
    g = addRandom(g);
    setGrid(g);
    setScore(0);
    setGameState('playing');
    setHasAcknowledgedWin(false);
  };

  return (
    <View
      style={s.gameContainer}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Header */}
      <View style={s.gameHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onMenu} activeOpacity={0.7}>
          <Text style={s.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.levelText}>NUMBER MERGE</Text>
        <View style={s.scoreBox}>
          <Text style={s.scoreNum}>{score}</Text>
          <Text style={s.scoreLabel}>SCORE</Text>
        </View>
      </View>

      {/* Board — native touch handlers for crisp swipe detection */}
      {cellSize > 0 && (
        <View
          style={[s.board, { width: boardSize, height: boardSize, padding: BOARD_PAD }]}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleTouchStart}
          onResponderRelease={handleTouchEnd}
        >
          {grid.map((row, r) => (
            <View key={r} style={[s.boardRow, { gap: GAP }]}>
              {row.map((val, c) => (
                <Tile key={`${r}-${c}`} value={val} cellSize={cellSize} />
              ))}
            </View>
          ))}
        </View>
      )}

      <Text style={s.hint}>Swipe the board to move tiles</Text>

      {/* D-pad buttons */}
      <View style={s.dpadContainer}>
        <TouchableOpacity style={s.dpadBtn} onPress={() => doMove('up')} activeOpacity={0.6}>
          <Text style={s.dpadText}>▲</Text>
        </TouchableOpacity>
        <View style={s.dpadMiddle}>
          <TouchableOpacity style={s.dpadBtn} onPress={() => doMove('left')} activeOpacity={0.6}>
            <Text style={s.dpadText}>◀</Text>
          </TouchableOpacity>
          <View style={s.dpadCenter} />
          <TouchableOpacity style={s.dpadBtn} onPress={() => doMove('right')} activeOpacity={0.6}>
            <Text style={s.dpadText}>▶</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.dpadBtn} onPress={() => doMove('down')} activeOpacity={0.6}>
          <Text style={s.dpadText}>▼</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.newGameBtn} onPress={resetGame} activeOpacity={0.7}>
        <Text style={s.newGameBtnText}>↺  NEW GAME</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── ROOT ───────────────────────────────────────────────────────────────────
export default function NumberMergeGame() {
  const [screen, setScreen] = useState('home');
  const [lastScore, setLastScore] = useState(0);
  const [lastWon, setLastWon] = useState(false);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('@highscore_number_merge').then(score => {
      if (score) setHighScore(parseInt(score, 10));
    }).catch(e => console.log('Error loading score:', e));
  }, []);

  const handleGameOver = (finalScore, won) => {
    setLastScore(finalScore);
    setLastWon(won);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      AsyncStorage.setItem('@highscore_number_merge', finalScore.toString()).catch(e => console.log(e));
    }
    setScreen('over');
  };

  if (screen === 'home') return <HomeScreen onStart={() => setScreen('game')} highScore={highScore} />;
  if (screen === 'game') return <GameScreen key={`game-${Date.now()}`} onGameOver={handleGameOver} onMenu={() => setScreen('home')} />;
  if (screen === 'over') return <GameOverScreen score={lastScore} highScore={highScore} won={lastWon} onReplay={() => setScreen('game')} onMenu={() => setScreen('home')} />;
  return null;
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  homeContainer: {
    flex: 1, backgroundColor: '#0d0d17',
    justifyContent: 'center', alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 60 : 0,
  },
  homeBackBtn: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: '#12121e', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', zIndex: 10,
  },
  homeBackText: { color: '#6B6B8E', fontSize: 12, fontWeight: '700' },
  homeContent: { alignItems: 'center', gap: 20, paddingHorizontal: 32, width: '100%' },
  homeEmoji: { fontSize: 64 },
  homeTitle: { fontSize: 48, fontWeight: '900', color: '#fff', letterSpacing: 4, textAlign: 'center', lineHeight: 52 },
  homeSubtitle: { fontSize: 13, color: '#6B6B8E', letterSpacing: 2, textTransform: 'uppercase' },
  previewGrid: { gap: 3, padding: 10, backgroundColor: '#12121e', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  previewRow: { flexDirection: 'row', gap: 3 },
  previewCell: { width: 46, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  previewCellText: { color: '#fff', fontWeight: '800' },
  highScoreContainer: { alignItems: 'center', gap: 4, backgroundColor: '#12121e', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(243,156,18,0.2)' },
  highScoreLabel: { fontSize: 9, color: '#6B6B8E', fontWeight: '700', letterSpacing: 2 },
  highScoreValue: { fontSize: 22, color: '#F39C12', fontWeight: '900' },
  startBtn: { backgroundColor: '#8E44AD', paddingHorizontal: 56, paddingVertical: 16, borderRadius: 14, shadowColor: '#8E44AD', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  howToPlay: { alignItems: 'center', gap: 6, marginTop: 8 },
  howTitle: { color: '#3a3a5a', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  howText: { color: '#3a3a5a', fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: 260 },

  gameContainer: { flex: 1, alignItems: 'center', backgroundColor: '#0d0d17', paddingTop: Platform.OS === 'android' ? 60 : 12, paddingBottom: 16, gap: 14 },
  gameHeader: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#12121e', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  backBtnText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
  levelText: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  scoreBox: { alignItems: 'center', backgroundColor: '#12121e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, minWidth: 64, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  scoreNum: { color: '#F39C12', fontSize: 18, fontWeight: '900' },
  scoreLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  board: { backgroundColor: '#12121e', borderRadius: 14, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  boardRow: { flexDirection: 'row' },
  cell: { borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  cellFilled: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  cellText: { fontWeight: '900', textAlign: 'center' },

  hint: { color: '#2a2a48', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  dpadContainer: { alignItems: 'center', gap: 4 },
  dpadMiddle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dpadCenter: { width: 44, height: 44 },
  dpadBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#12121e', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  dpadText: { color: '#6B6B8E', fontSize: 16 },
  newGameBtn: { backgroundColor: '#12121e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  newGameBtnText: { color: '#6B6B8E', fontSize: 13, fontWeight: '700', letterSpacing: 1 },

  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0d17', gap: 16, padding: 32, paddingTop: Platform.OS === 'android' ? 60 : 32 },
  overlayEmoji: { fontSize: 64 },
  overlayTitle: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 4 },
  overStats: { flexDirection: 'row', backgroundColor: '#12121e', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', width: '100%' },
  overStat: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  overStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  overStatVal: { color: '#fff', fontSize: 24, fontWeight: '900' },
  overStatLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnPrimary: { backgroundColor: '#8E44AD', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 14, shadowColor: '#8E44AD', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  btnSecondary: { backgroundColor: '#12121e', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  btnSecondaryText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
});