// TetrisGame.jsx — Tetris for Arcade Vault
// Classic block-dropping with keyboard + on-screen controls

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROWS = 20;
const COLS = 10;
const TICK_MS = 600; // starting speed

const PIECE_COLORS = {
  I: '#1ABC9C',
  O: '#F1C40F',
  T: '#9B59B6',
  S: '#2ECC71',
  Z: '#E74C3C',
  J: '#3498DB',
  L: '#E67E22',
};

const PIECES = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
};

const PIECE_TYPES = Object.keys(PIECES);

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  const shape = PIECES[type].map(r => [...r]);
  return { type, shape, row: 0, col: Math.floor((COLS - shape[0].length) / 2) };
}

function rotate(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      rotated[c][rows - 1 - r] = shape[r][c];
  return rotated;
}

function isValid(board, shape, row, col) {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[0].length; c++) {
      if (!shape[r][c]) continue;
      const nr = row + r;
      const nc = col + c;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
      if (board[nr][nc]) return false;
    }
  return true;
}

function placePiece(board, piece) {
  const newBoard = board.map(r => [...r]);
  const { shape, row, col, type } = piece;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[0].length; c++)
      if (shape[r][c]) newBoard[row + r][col + c] = type;
  return newBoard;
}

function clearLines(board) {
  const newBoard = board.filter(row => row.some(cell => cell === null));
  const cleared = ROWS - newBoard.length;
  const emptyRows = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { board: [...emptyRows, ...newBoard], cleared };
}

// ─── HOME SCREEN ────────────────────────────────────────────────────────────
function HomeScreen({ onStart, highScore }) {
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
      <Text style={s.homeEmoji}>🕹️</Text>
      <Text style={s.homeTitle}>TETRIS{'\n'}EXTREME</Text>
      <Text style={s.homeSubtitle}>Drop blocks • Clear lines • Survive</Text>

      <View style={s.previewBlocks}>
        {['I','T','S','Z','O','L','J'].map(t => (
          <View key={t} style={[s.previewBlock, { backgroundColor: PIECE_COLORS[t] }]} />
        ))}
      </View>

      {highScore > 0 && (
        <View style={s.highScoreBox}>
          <Text style={s.highScoreLabel}>HIGH SCORE</Text>
          <Text style={s.highScoreVal}>{highScore}</Text>
        </View>
      )}

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity style={s.startBtn} onPress={onStart} activeOpacity={0.8}>
          <Text style={s.startBtnText}>START GAME</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={s.howText}>Use arrow keys or on-screen controls{'\n'}← → Move  |  ↑ Rotate  |  ↓ Drop</Text>
    </View>
  );
}

// ─── GAME OVER SCREEN ───────────────────────────────────────────────────────
function GameOverScreen({ score, lines, level, highScore, onReplay, onMenu }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[s.overlay, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={s.overlayEmoji}>💥</Text>
      <Text style={s.overlayTitle}>GAME OVER</Text>

      <View style={s.overStatsRow}>
        <View style={s.overStat}>
          <Text style={s.overStatVal}>{score}</Text>
          <Text style={s.overStatLabel}>SCORE</Text>
        </View>
        <View style={s.overStatDiv} />
        <View style={s.overStat}>
          <Text style={s.overStatVal}>{lines}</Text>
          <Text style={s.overStatLabel}>LINES</Text>
        </View>
        <View style={s.overStatDiv} />
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
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [board, setBoard] = useState(createBoard);
  const [piece, setPiece] = useState(randomPiece);
  const [nextPiece, setNextPiece] = useState(randomPiece);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const nextRef = useRef(nextPiece);
  const scoreRef = useRef(score);
  const linesRef = useRef(lines);
  const levelRef = useRef(level);
  const gameOverRef = useRef(gameOver);
  const pausedRef = useRef(isPaused);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { nextRef.current = nextPiece; }, [nextPiece]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);

  // Reserve space: header ~44, info row ~40, controls ~56, gaps ~40, padding ~16
  const RESERVED_HEIGHT = 200;
  const maxBoardHeight = layout.height > 0 ? layout.height - RESERVED_HEIGHT : 0;
  const maxBoardWidth = layout.width > 0 ? layout.width - 32 : 0;

  // Cell size must fit both width and height constraints
  const cellFromWidth = maxBoardWidth > 0 ? Math.floor(maxBoardWidth / COLS) : 0;
  const cellFromHeight = maxBoardHeight > 0 ? Math.floor(maxBoardHeight / ROWS) : 0;
  const cellSize = Math.min(cellFromWidth, cellFromHeight, 28); // cap at 28px max

  const lockPiece = useCallback(() => {
    const b = boardRef.current;
    const p = pieceRef.current;
    const np = nextRef.current;

    const newBoard = placePiece(b, p);
    const { board: clearedBoard, cleared } = clearLines(newBoard);

    const lineScores = [0, 100, 300, 500, 800];
    const newLines = linesRef.current + cleared;
    const newLevel = Math.floor(newLines / 10) + 1;
    const newScore = scoreRef.current + (lineScores[cleared] || 0) * levelRef.current;

    setBoard(clearedBoard);
    setLines(newLines);
    setLevel(newLevel);
    setScore(newScore);

    if (!isValid(clearedBoard, np.shape, np.row, np.col)) {
      setGameOver(true);
      onGameOver(newScore, newLines, newLevel);
      return;
    }

    setPiece(np);
    setNextPiece(randomPiece());
  }, [onGameOver]);

  const moveDown = useCallback(() => {
    if (gameOverRef.current || pausedRef.current) return;
    const p = pieceRef.current;
    const b = boardRef.current;
    if (isValid(b, p.shape, p.row + 1, p.col)) {
      setPiece({ ...p, row: p.row + 1 });
    } else {
      lockPiece();
    }
  }, [lockPiece]);

  const moveHorizontal = useCallback((dir) => {
    if (gameOverRef.current || pausedRef.current) return;
    const p = pieceRef.current;
    const b = boardRef.current;
    const newCol = p.col + dir;
    if (isValid(b, p.shape, p.row, newCol)) {
      setPiece({ ...p, col: newCol });
    }
  }, []);

  const rotatePiece = useCallback(() => {
    if (gameOverRef.current || pausedRef.current) return;
    const p = pieceRef.current;
    const b = boardRef.current;
    const rotated = rotate(p.shape);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (isValid(b, rotated, p.row, p.col + kick)) {
        setPiece({ ...p, shape: rotated, col: p.col + kick });
        return;
      }
    }
  }, []);

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || pausedRef.current) return;
    const p = pieceRef.current;
    const b = boardRef.current;
    let dropRow = p.row;
    while (isValid(b, p.shape, dropRow + 1, p.col)) dropRow++;
    setPiece(prev => ({ ...prev, row: dropRow }));
    setTimeout(() => lockPiece(), 50);
  }, [lockPiece]);

  // Gravity tick
  useEffect(() => {
    if (gameOver) return;
    const speed = Math.max(100, TICK_MS - (level - 1) * 50);
    const interval = setInterval(moveDown, speed);
    return () => clearInterval(interval);
  }, [level, gameOver, moveDown]);

  // Keyboard controls
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKey = (e) => {
      const map = {
        ArrowLeft: () => moveHorizontal(-1),
        ArrowRight: () => moveHorizontal(1),
        ArrowDown: () => moveDown(),
        ArrowUp: () => rotatePiece(),
        ' ': () => hardDrop(),
        a: () => moveHorizontal(-1),
        d: () => moveHorizontal(1),
        s: () => moveDown(),
        w: () => rotatePiece(),
      };
      if (map[e.key]) {
        e.preventDefault();
        map[e.key]();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveHorizontal, moveDown, rotatePiece, hardDrop]);

  // Render board with current piece overlaid
  const displayBoard = board.map(r => [...r]);
  if (piece) {
    const { shape, row, col, type } = piece;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[0].length; c++)
        if (shape[r][c] && row + r >= 0 && row + r < ROWS && col + c >= 0 && col + c < COLS)
          displayBoard[row + r][col + c] = type;
  }

  // Ghost piece
  if (piece) {
    let ghostRow = piece.row;
    while (isValid(board, piece.shape, ghostRow + 1, piece.col)) ghostRow++;
    if (ghostRow !== piece.row) {
      for (let r = 0; r < piece.shape.length; r++)
        for (let c = 0; c < piece.shape[0].length; c++)
          if (piece.shape[r][c] && ghostRow + r >= 0 && ghostRow + r < ROWS && !displayBoard[ghostRow + r][piece.col + c])
            displayBoard[ghostRow + r][piece.col + c] = 'ghost';
    }
  }

  const boardPixelWidth = cellSize * COLS + 4;

  return (
    <View
      style={s.gameContainer}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setLayout({ width: w, height: h });
      }}
    >
      {/* Header */}
      <View style={s.gameHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onMenu} activeOpacity={0.7}>
          <Text style={s.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.levelText}>TETRIS</Text>
        <View style={s.scoreBox}>
          <Text style={s.scoreNum}>{score}</Text>
          <Text style={s.scoreLabel}>SCORE</Text>
        </View>
      </View>

      {/* Info Row */}
      <View style={s.infoRow}>
        <View style={s.infoItem}>
          <Text style={s.infoVal}>{lines}</Text>
          <Text style={s.infoLabel}>LINES</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoVal}>{level}</Text>
          <Text style={s.infoLabel}>LEVEL</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>NEXT</Text>
          <View style={s.nextPieceBox}>
            {nextPiece.shape.map((row, r) => (
              <View key={r} style={{ flexDirection: 'row' }}>
                {row.map((v, c) => (
                  <View
                    key={c}
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: v ? PIECE_COLORS[nextPiece.type] : 'transparent',
                      borderRadius: 2,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Board */}
      {cellSize > 0 && (
        <View style={[s.board, { width: boardPixelWidth, padding: 2 }]}>
          {displayBoard.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {row.map((cell, c) => (
                <View
                  key={c}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: cell === 'ghost'
                      ? 'rgba(255,255,255,0.06)'
                      : cell
                        ? PIECE_COLORS[cell]
                        : 'rgba(255,255,255,0.02)',
                    borderWidth: cell && cell !== 'ghost' ? 0.5 : 0,
                    borderColor: 'rgba(0,0,0,0.2)',
                    borderRadius: 2,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Controls */}
      <View style={s.controls}>
        <TouchableOpacity style={s.ctrlBtn} onPress={() => moveHorizontal(-1)} activeOpacity={0.6}>
          <Text style={s.ctrlText}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ctrlBtn} onPress={moveDown} activeOpacity={0.6}>
          <Text style={s.ctrlText}>▼</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ctrlBtn} onPress={rotatePiece} activeOpacity={0.6}>
          <Text style={s.ctrlText}>⟳</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ctrlBtn} onPress={() => moveHorizontal(1)} activeOpacity={0.6}>
          <Text style={s.ctrlText}>▶</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.ctrlBtn, s.ctrlBtnWide]} onPress={hardDrop} activeOpacity={0.6}>
          <Text style={s.ctrlText}>⏬</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


// ─── ROOT ───────────────────────────────────────────────────────────────────
export default function TetrisGame() {
  const [screen, setScreen] = useState('home');
  const [lastScore, setLastScore] = useState(0);
  const [lastLines, setLastLines] = useState(0);
  const [lastLevel, setLastLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('@highscore_tetris_extreme').then(score => {
      if (score) setHighScore(parseInt(score, 10));
    }).catch(e => console.log('Error loading tetris score:', e));
  }, []);

  const handleGameOver = (finalScore, totalLines, finalLevel) => {
    setLastScore(finalScore);
    setLastLines(totalLines);
    setLastLevel(finalLevel);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      AsyncStorage.setItem('@highscore_tetris_extreme', finalScore.toString()).catch(e => console.log(e));
    }
    setScreen('over');
  };

  if (screen === 'home')
    return <HomeScreen onStart={() => setScreen('game')} highScore={highScore} />;

  if (screen === 'game')
    return (
      <GameScreen
        key={`game-${Date.now()}`}
        onGameOver={handleGameOver}
        onMenu={() => setScreen('home')}
      />
    );

  if (screen === 'over')
    return (
      <GameOverScreen
        score={lastScore}
        lines={lastLines}
        level={lastLevel}
        highScore={highScore}
        onReplay={() => setScreen('game')}
        onMenu={() => setScreen('home')}
      />
    );

  return null;
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  homeContainer: {
    flex: 1, backgroundColor: '#0d0d17',
    alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32,
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
    fontSize: 44, fontWeight: '900', color: '#fff',
    letterSpacing: 4, textAlign: 'center', lineHeight: 48,
  },
  homeSubtitle: { fontSize: 13, color: '#6B6B8E', letterSpacing: 1.5 },
  previewBlocks: {
    flexDirection: 'row', gap: 4, padding: 10,
    backgroundColor: '#12121e', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  previewBlock: { width: 24, height: 24, borderRadius: 4 },
  highScoreBox: {
    alignItems: 'center', gap: 4,
    backgroundColor: '#12121e', paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(243,156,18,0.2)',
  },
  highScoreLabel: { fontSize: 9, color: '#6B6B8E', fontWeight: '700', letterSpacing: 2 },
  highScoreVal: { fontSize: 22, color: '#F39C12', fontWeight: '900' },
  startBtn: {
    backgroundColor: '#2980B9', paddingHorizontal: 52, paddingVertical: 16,
    borderRadius: 14, shadowColor: '#2980B9',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  howText: {
    color: '#3a3a5a', fontSize: 11, textAlign: 'center', lineHeight: 18,
  },

  // Game
  gameContainer: {
    flex: 1, alignItems: 'center', backgroundColor: '#0d0d17',
    paddingTop: Platform.OS === 'android' ? 60 : 8, gap: 8,
  },
  gameHeader: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', paddingHorizontal: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#12121e', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtnText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
  levelText: {
    flex: 1, textAlign: 'center',
    color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 3,
  },
  scoreBox: {
    alignItems: 'center', backgroundColor: '#12121e',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4,
    minWidth: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  scoreNum: { color: '#F39C12', fontSize: 16, fontWeight: '900' },
  scoreLabel: { color: '#6B6B8E', fontSize: 8, fontWeight: '700', letterSpacing: 1 },

  infoRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16,
  },
  infoItem: {
    alignItems: 'center', backgroundColor: '#12121e',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  infoVal: { color: '#fff', fontSize: 16, fontWeight: '900' },
  infoLabel: { color: '#6B6B8E', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  nextPieceBox: { marginTop: 4, gap: 1 },

  board: {
    backgroundColor: '#0a0a14', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  controls: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16,
    flexWrap: 'wrap', justifyContent: 'center',
  },
  ctrlBtn: {
    width: 52, height: 48, borderRadius: 12,
    backgroundColor: '#12121e', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  ctrlBtnWide: { width: 72 },
  ctrlText: { color: '#6B6B8E', fontSize: 18 },

  // Overlays
  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0d0d17', gap: 16, padding: 32,
    paddingTop: Platform.OS === 'android' ? 60 : 32,
  },
  overlayEmoji: { fontSize: 64 },
  overlayTitle: { color: '#E74C3C', fontSize: 32, fontWeight: '900', letterSpacing: 4 },
  overStatsRow: {
    flexDirection: 'row', backgroundColor: '#12121e',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden', width: '100%',
  },
  overStat: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  overStatDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  overStatVal: { color: '#fff', fontSize: 20, fontWeight: '900' },
  overStatLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnPrimary: {
    backgroundColor: '#2980B9', paddingHorizontal: 28, paddingVertical: 16,
    borderRadius: 14, shadowColor: '#2980B9',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  btnSecondary: {
    backgroundColor: '#12121e', paddingHorizontal: 24, paddingVertical: 16,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  btnSecondaryText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
});
