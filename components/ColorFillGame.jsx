// ColorFillGame.jsx — Embedded Tab Version
// Works inside an existing React Native layout (no SafeAreaView, no StatusBar)
// Uses onLayout to measure its own container width instead of Dimensions

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── CONFIG ────────────────────────────────────────────────────────────────
const COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'];

const LEVELS = [
  { grid: 6, maxMoves: 8, colors: 4 },
  { grid: 7, maxMoves: 10, colors: 4 },
  { grid: 8, maxMoves: 12, colors: 5 },
  { grid: 9, maxMoves: 15, colors: 5 },
  { grid: 10, maxMoves: 18, colors: 6 },
  { grid: 11, maxMoves: 20, colors: 6 },
  { grid: 12, maxMoves: 23, colors: 6 },

];

// ─── GAME LOGIC ────────────────────────────────────────────────────────────
function generateGrid(size, numColors) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.floor(Math.random() * numColors))
  );
}

function floodFill(grid, row, col, oldColor, newColor) {
  const size = grid.length;
  const stack = [[row, col]];
  const visited = new Set();
  while (stack.length) {
    const [r, c] = stack.pop();
    const key = `${r},${c}`;
    if (r < 0 || r >= size || c < 0 || c >= size) continue;
    if (visited.has(key)) continue;
    if (grid[r][c] !== oldColor) continue;
    visited.add(key);
    grid[r][c] = newColor;
    stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
  }
}

function isBoardFilled(grid) {
  const target = grid[0][0];
  return grid.every(row => row.every(cell => cell === target));
}

function deepCopy(grid) {
  return grid.map(row => [...row]);
}

// ─── HOME SCREEN ───────────────────────────────────────────────────────────
function HomeScreen({ onStart, bestScores }) {
  const router = useRouter();

  return (
    <View style={s.homeContainer}>
      <TouchableOpacity style={s.homeBackBtn} onPress={() => router.back()}>
        <Text style={s.homeBackText}>← BACK</Text>
      </TouchableOpacity>
      <Text style={s.homeTitle}>COLOR{'\n'}FLOOD</Text>
      <Text style={s.homeSubtitle}>Fill the board in fewest moves</Text>

      <View style={s.previewGrid}>
        {[0, 1, 2, 3].map(row => (
          <View key={row} style={s.previewRow}>
            {[0, 1, 2, 3].map(col => (
              <View
                key={col}
                style={[s.previewCell, { backgroundColor: COLORS[(row * 3 + col * 2) % 4] }]}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={s.howBox}>
        <Text style={s.howTitle}>HOW TO PLAY</Text>
        <Text style={s.howText}>Tap colors to change the top-left square and all connected same-colored squares. Fill the entire board before you run out of moves!</Text>
      </View>

      <TouchableOpacity style={s.startBtn} onPress={onStart} activeOpacity={0.8}>
        <Text style={s.startBtnText}>PLAY</Text>
      </TouchableOpacity>

      {bestScores.some(v => v !== null) && (
        <View style={s.bestRow}>
          <Text style={s.bestLabel}>BEST SCORES</Text>
          <View style={s.bestGrid}>
            {bestScores.slice(0, 7).map((v, i) =>
              v !== null ? (
                <View key={i} style={s.bestItem}>
                  <Text style={s.bestLvl}>Lvl {i + 1}</Text>
                  <Text style={s.bestVal}>{v}</Text>
                </View>
              ) : null
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── WIN SCREEN ────────────────────────────────────────────────────────────
function WinScreen({ level, moves, maxMoves, onNext, onMenu, onReplay }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const stars = moves <= Math.floor(maxMoves * 0.5) ? 3
    : moves <= Math.floor(maxMoves * 0.75) ? 2 : 1;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[s.overlay, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={s.overlayEmoji}>🎉</Text>
      <Text style={s.overlayTitle}>LEVEL {level} CLEAR!</Text>
      <View style={s.starsRow}>
        {[1, 2, 3].map(i => (
          <Text key={i} style={[s.star, i <= stars && s.starOn]}>★</Text>
        ))}
      </View>
      <Text style={s.overlayMeta}>{moves} / {maxMoves} moves used</Text>
      <View style={s.btnRow}>
        <TouchableOpacity style={s.btnSecondary} onPress={onReplay} activeOpacity={0.8}>
          <Text style={s.btnSecondaryText}>↺ Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnPrimary} onPress={onNext} activeOpacity={0.8}>
          <Text style={s.btnPrimaryText}>Next →</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onMenu} activeOpacity={0.7}>
        <Text style={s.menuLink}>↩ Menu</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── LOSE SCREEN ───────────────────────────────────────────────────────────
function LoseScreen({ level, onReplay, onMenu }) {
  return (
    <View style={s.overlay}>
      <Text style={s.overlayEmoji}>💀</Text>
      <Text style={[s.overlayTitle, { color: '#E74C3C' }]}>OUT OF MOVES</Text>
      <Text style={s.overlayMeta}>Level {level}</Text>
      <View style={s.btnRow}>
        <TouchableOpacity style={s.btnSecondary} onPress={onMenu} activeOpacity={0.8}>
          <Text style={s.btnSecondaryText}>↩ Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnPrimary} onPress={onReplay} activeOpacity={0.8}>
          <Text style={s.btnPrimaryText}>↺ Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── GAME SCREEN ───────────────────────────────────────────────────────────
function GameScreen({ levelIndex, onWin, onLose, onMenu }) {
  const config = LEVELS[Math.min(levelIndex, LEVELS.length - 1)];
  const { grid: GRID_SIZE, maxMoves: MAX_MOVES, colors: NUM_COLORS } = config;

  // Measure container width via onLayout — works correctly inside any parent
  const [containerWidth, setContainerWidth] = useState(0);
  const [grid, setGrid] = useState(() => generateGrid(GRID_SIZE, NUM_COLORS));
  const [moves, setMoves] = useState(0);
  const [gameState, setGameState] = useState('playing');
  const [lastColor, setLastColor] = useState(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const cellAnims = useRef({}).current;

  const GRID_PAD = 16;
  const cellSize = containerWidth > 0
    ? Math.floor((containerWidth - GRID_PAD * 2) / GRID_SIZE)
    : 0;

  const getAnim = (r, c) => {
    const key = `${r},${c}`;
    if (!cellAnims[key]) cellAnims[key] = new Animated.Value(1);
    return cellAnims[key];
  };

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: moves / MAX_MOVES,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [moves]);

  const handleColorPick = useCallback((colorIdx) => {
    if (gameState !== 'playing') return;
    const currentColor = grid[0][0];
    if (colorIdx === currentColor) return;

    const newGrid = deepCopy(grid);
    floodFill(newGrid, 0, 0, currentColor, colorIdx);
    const newMoves = moves + 1;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (newGrid[r][c] !== grid[r][c]) {
          const anim = getAnim(r, c);
          Animated.sequence([
            Animated.timing(anim, { toValue: 0.82, duration: 55, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1, duration: 90, useNativeDriver: true }),
          ]).start();
        }
      }
    }

    setGrid(newGrid);
    setMoves(newMoves);
    setLastColor(colorIdx);

    if (isBoardFilled(newGrid)) {
      setGameState('won');
      setTimeout(() => onWin(newMoves), 350);
    } else if (newMoves >= MAX_MOVES) {
      setGameState('lost');
      setTimeout(() => onLose(), 350);
    }
  }, [grid, moves, gameState]);

  const progressColor = progressAnim.interpolate({
    inputRange: [0, 0.6, 0.85, 1],
    outputRange: ['#2ECC71', '#F39C12', '#E74C3C', '#E74C3C'],
  });

  const movesLeft = MAX_MOVES - moves;

  return (
    <View
      style={s.gameContainer}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Header */}
      <View style={s.gameHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onMenu} activeOpacity={0.7}>
          <Text style={s.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.levelText}>LEVEL {levelIndex + 1}</Text>
        <View style={s.movesBox}>
          <Text style={[s.movesNum, movesLeft <= 5 && { color: '#E74C3C' }]}>
            {movesLeft}
          </Text>
          <Text style={s.movesLabel}>left</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <Animated.View style={[
          s.progressFill,
          {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: progressColor,
          }
        ]} />
      </View>

      {/* Grid — deferred until container width is known */}
      {cellSize > 0 && (
        <View style={[s.gridWrapper, { width: cellSize * GRID_SIZE, height: cellSize * GRID_SIZE }]}>
          {grid.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {row.map((colorIdx, c) => (
                <Animated.View
                  key={c}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: COLORS[colorIdx],
                    borderWidth: 0.5,
                    borderColor: 'rgba(0,0,0,0.12)',
                    transform: [{ scale: getAnim(r, c) }],
                  }}
                />
              ))}
            </View>
          ))}
          {/* Top-left origin marker */}
          <View style={{
            position: 'absolute', top: 0, left: 0,
            width: cellSize * 1.6, height: cellSize * 1.6,
            borderRightWidth: 2, borderBottomWidth: 2,
            borderColor: 'rgba(255,255,255,0.65)',
            borderTopLeftRadius: 4,
          }} pointerEvents="none" />
        </View>
      )}

      {/* Color palette */}
      <View style={s.palette}>
        {COLORS.slice(0, NUM_COLORS).map((color, idx) => {
          const isActive = grid[0][0] === idx;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => handleColorPick(idx)}
              activeOpacity={0.75}
              style={[
                s.colorBtn,
                { backgroundColor: color },
                isActive && s.colorBtnActive,
                lastColor === idx && !isActive && s.colorBtnLast,
              ]}
            >
              {isActive && <View style={s.colorBtnDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.hint}>Tap a color to flood from the top-left ↖</Text>
    </View>
  );
}

export default function ColorFillGame() {
  const [screen, setScreen] = useState('home');
  const [levelIndex, setLevelIndex] = useState(0);
  const [lastMoves, setLastMoves] = useState(0);
  const [bestScores, setBestScores] = useState(Array(LEVELS.length).fill(null));

  useEffect(() => {
    AsyncStorage.getItem('@score_data_color_flood').then(data => {
      if (data) setBestScores(JSON.parse(data));
    }).catch(e => console.log(e));
  }, []);

  const config = LEVELS[Math.min(levelIndex, LEVELS.length - 1)];

  const handleWin = (moves) => {
    setLastMoves(moves);
    setBestScores(prev => {
      const next = [...prev];
      if (next[levelIndex] === null || moves < next[levelIndex]) next[levelIndex] = moves;

      const unlockedLevels = next.filter(s => s !== null).length;
      AsyncStorage.setItem('@highscore_color_flood', `Level ${Math.min(unlockedLevels + 1, LEVELS.length)}`);
      AsyncStorage.setItem('@score_data_color_flood', JSON.stringify(next));

      return next;
    });
    setScreen('win');
  };

  if (screen === 'home') return (
    <HomeScreen
      onStart={() => { setLevelIndex(0); setScreen('game'); }}
      bestScores={bestScores}
    />
  );

  if (screen === 'game') return (
    <GameScreen
      key={`level-${levelIndex}-${screen}`}
      levelIndex={levelIndex}
      onWin={handleWin}
      onLose={() => setScreen('lose')}
      onMenu={() => setScreen('home')}
    />
  );

  if (screen === 'win') return (
    <WinScreen
      level={levelIndex + 1}
      moves={lastMoves}
      maxMoves={config.maxMoves}
      onNext={() => { setLevelIndex(i => Math.min(i + 1, LEVELS.length - 1)); setScreen('game'); }}
      onReplay={() => setScreen('game')}
      onMenu={() => setScreen('home')}
    />
  );

  if (screen === 'lose') return (
    <LoseScreen
      level={levelIndex + 1}
      onReplay={() => setScreen('game')}
      onMenu={() => setScreen('home')}
    />
  );

  return null;
}

// ─── STYLES ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  // Home
  homeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F0F1A',
    gap: 20,
    paddingVertical: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 24,
  },
  homeBackBtn: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: '#1A1A2E', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    zIndex: 10,
  },
  homeBackText: { color: '#6B6B8E', fontSize: 12, fontWeight: '700' },
  homeTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    textAlign: 'center',
    lineHeight: 52,
  },
  homeSubtitle: {
    fontSize: 13,
    color: '#666',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  previewGrid: { gap: 3, padding: 10, backgroundColor: '#1A1A2E', borderRadius: 10 },
  previewRow: { flexDirection: 'row', gap: 3 },
  previewCell: { width: 26, height: 26, borderRadius: 4 },
  startBtn: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 56,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  startBtnText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 4 },
  howBox: {
    backgroundColor: 'rgba(52, 152, 219, 0.08)',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    gap: 8,
  },
  howTitle: {
    color: '#3498DB',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  howText: {
    color: '#aca9b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.8,
  },
  bestRow: { alignItems: 'center', gap: 6 },
  bestLabel: { color: '#444', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  bestGrid: { flexDirection: 'row', gap: 8 },
  bestItem: { alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 8, padding: 8, minWidth: 48 },
  bestLvl: { color: '#555', fontSize: 10 },
  bestVal: { color: '#F39C12', fontSize: 15, fontWeight: '700' },

  // Game
  gameContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
    paddingTop: Platform.OS === 'android' ? 60 : 12,
    paddingBottom: 16,
    gap: 10,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1A1A2E',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#777', fontSize: 15 },
  levelText: {
    flex: 1, textAlign: 'center',
    color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 3,
  },
  movesBox: {
    alignItems: 'center', backgroundColor: '#1A1A2E',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, minWidth: 48,
  },
  movesNum: { color: '#fff', fontSize: 18, fontWeight: '800' },
  movesLabel: { color: '#555', fontSize: 10, letterSpacing: 1 },

  progressTrack: {
    width: '90%', height: 4,
    backgroundColor: '#1A1A2E', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  gridWrapper: {
    borderRadius: 6, overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 12,
    elevation: 10,
  },

  palette: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#1A1A2E', borderRadius: 50, marginTop: 4,
  },
  colorBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  colorBtnActive: {
    transform: [{ scale: 1.22 }],
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.75)',
  },
  colorBtnLast: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  colorBtnDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  hint: { color: '#383838', fontSize: 11, letterSpacing: 0.4 },

  // Win / Lose
  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0F0F1A', gap: 14, padding: 32,
  },
  overlayEmoji: { fontSize: 60 },
  overlayTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 3 },
  overlayMeta: { color: '#666', fontSize: 13, letterSpacing: 1 },
  starsRow: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 36, color: '#2a2a2a' },
  starOn: { color: '#F39C12' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnPrimary: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12,
    shadowColor: '#3498DB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  btnSecondary: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  btnSecondaryText: { color: '#999', fontSize: 15, fontWeight: '600' },
  menuLink: { color: '#3a3a3a', fontSize: 12, letterSpacing: 1, marginTop: 2 },
});
