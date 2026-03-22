// NumberDropGame.jsx — Drop The Number Clone for Arcade Vault
// Blocks with numbers fall from the top. Move left/right. 
// When they land, they merge with adjacent identical numbers.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, PanResponder, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── CONSTANTS & HELPERS ───────────────────────────────────────────────────
const COLS = 5;
const ROWS = 8;
const START_SPEED = 800;

const TILE_COLORS = {
  2: { bg: '#2B2B36', text: '#E7E3F3' },
  4: { bg: '#363545', text: '#E7E3F3' },
  8: { bg: '#9B59B6', text: '#FFFFFF' },
  16: { bg: '#8E44AD', text: '#FFFFFF' },
  32: { bg: '#E74C3C', text: '#FFFFFF' },
  64: { bg: '#C0392B', text: '#FFFFFF' },
  128: { bg: '#E67E22', text: '#FFFFFF' },
  256: { bg: '#D35400', text: '#FFFFFF' },
  512: { bg: '#2ECC71', text: '#FFFFFF' },
  1024: { bg: '#27AE60', text: '#FFFFFF' },
  2048: { bg: '#F1C40F', text: '#FFFFFF' },
  4096: { bg: '#F39C12', text: '#FFFFFF' },
  8192: { bg: '#1ABC9C', text: '#FFFFFF' },
};

function getTileStyle(val) {
  return TILE_COLORS[val] || { bg: '#49A8EC', text: '#FFFFFF' };
}

function randomVal(maxTile) {
  // Biased towards 2, 4, 8, 16 
  const options = [2, 2, 2, 4, 4, 8, 8, 16, 32, 64];
  const valid = options.filter(v => v <= maxTile || v <= 64);
  return valid[Math.floor(Math.random() * valid.length)];
}

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

// Settles the board rapidly (gravity + merges) returning the final state
function settleBoardOnce(board) {
  let currentBoard = board.map(row => [...row]);
  let scoreGained = 0;
  let changed = false;

  // 1. Gravity
  for (let c = 0; c < COLS; c++) {
    let writeY = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (currentBoard[r][c] !== null) {
        if (r !== writeY) {
          currentBoard[writeY][c] = currentBoard[r][c];
          currentBoard[r][c] = null;
          changed = true;
        }
        writeY--;
      }
    }
  }

  // If gravity caused a drop, don't merge immediately (let the gravity visually "happen" if we animate, or just combine logic)
  // Let's do instant chaining for simplicity
  if (!changed) {
    // 2. Merges (prioritize Downwards, then Left/Right)
    let merged = false;
    // vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = ROWS - 1; r > 0; r--) {
        if (currentBoard[r][c] !== null && currentBoard[r][c] === currentBoard[r-1][c]) {
          currentBoard[r][c] *= 2;
          scoreGained += currentBoard[r][c];
          currentBoard[r-1][c] = null;
          merged = true;
          changed = true;
          break; // do one at a time for predictability
        }
      }
      if (merged) break;
    }

    if (!merged) {
      // horizontal
      for (let r = ROWS - 1; r >= 0; r--) {
        for (let c = 0; c < COLS - 1; c++) {
          if (currentBoard[r][c] !== null && currentBoard[r][c] === currentBoard[r][c+1]) {
            // merge right block into left block
            currentBoard[r][c] *= 2;
            scoreGained += currentBoard[r][c];
            currentBoard[r][c+1] = null;
            merged = true;
            changed = true;
            break;
          }
        }
        if (merged) break;
      }
    }
  }

  return { newBoard: currentBoard, scoreGained, changed };
}

// ─── TILE COMPONENT ─────────────────────────────────────────────────────────
function SettledTile({ value, size }) {
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1, friction: 3, tension: 80, useNativeDriver: true,
    }).start();
  }, [value]);

  const style = getTileStyle(value);
  return (
    <Animated.View style={[
      s.cellTile,
      { width: size, height: size, backgroundColor: style.bg, transform: [{ scale }] }
    ]}>
      <Text style={[s.cellTileText, { color: style.text, fontSize: value > 1000 ? size * 0.35 : size * 0.45 }]}>
        {value}
      </Text>
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
      
      <Text style={s.homeEmoji}>🎯</Text>
      <Text style={s.homeTitle}>NUMBER{'\n'}DROP</Text>
      <Text style={s.homeSub}>Free fall blocks • Merge adjacent numbers</Text>

      <View style={s.previewBoard}>
        {/* Simple static preview of merges */}
        <View style={s.previewRow}>
           <SettledTile value={2} size={36} />
           <SettledTile value={2} size={36} />
           <Text style={{color:'#6B6B8E', fontWeight:'900', marginHorizontal: 8}}>→</Text>
           <SettledTile value={4} size={36} />
        </View>
      </View>

      {highScore > 0 && (
        <View style={s.hsBox}>
          <Text style={s.hsLabel}>TOP SCORE</Text>
          <Text style={s.hsVal}>{highScore}</Text>
        </View>
      )}

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity style={s.startBtn} onPress={onStart} activeOpacity={0.8}>
          <Text style={s.startBtnText}>START MATCHING</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={s.howText}>Move horizontally to place the block.{'\n'}Touching identical neighbor numbers will merge them!</Text>
    </View>
  );
}

// ─── GAME OVER ──────────────────────────────────────────────────────────────
function GameOverScreen({ score, maxTile, highScore, onReplay, onMenu }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[s.overlay, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={s.overlayEmoji}>🧱</Text>
      <Text style={s.overlayTitle}>BOARD FULL!</Text>
      <View style={s.overStats}>
        <View style={s.overStat}>
          <Text style={s.overStatVal}>{score}</Text>
          <Text style={s.overStatLabel}>SCORE</Text>
        </View>
        <View style={s.overStatDiv} />
        <View style={s.overStat}>
          <Text style={s.overStatVal}>{maxTile}</Text>
          <Text style={s.overStatLabel}>BEST TILE</Text>
        </View>
        <View style={s.overStatDiv} />
        <View style={s.overStat}>
          <Text style={[s.overStatVal, { color: '#F39C12' }]}>{highScore}</Text>
          <Text style={s.overStatLabel}>HIGH SCORE</Text>
        </View>
      </View>
      <View style={s.btnRow}>
        <TouchableOpacity style={s.btnSecondary} onPress={onMenu} activeOpacity={0.8}>
          <Text style={s.btnSecondaryText}>↩ MENU</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnPrimary} onPress={onReplay} activeOpacity={0.8}>
          <Text style={s.btnPrimaryText}>↺ RETRY</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── GAME ───────────────────────────────────────────────────────────────────
function GameScreen({ onGameOver, onMenu }) {
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [board, setBoard] = useState(createBoard);
  const [piece, setPiece] = useState({ val: 2, r: 0, c: 2 });
  const [nextVal, setNextVal] = useState(4);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  const [settling, setSettling] = useState(false); // When true, piece is frozen, board is resolving
  const [maxTile, setMaxTile] = useState(64);

  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const nextRef = useRef(nextVal);
  const scoreRef = useRef(score);
  const maxTileRef = useRef(maxTile);
  const settlingRef = useRef(settling);
  const gameOverRef = useRef(gameOver);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { nextRef.current = nextVal; }, [nextVal]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { maxTileRef.current = maxTile; }, [maxTile]);
  useEffect(() => { settlingRef.current = settling; }, [settling]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  // Touch Controls (PanResponder)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Trigger if swiping far enough
        return Math.abs(gestureState.dx) > 20 || gestureState.dy > 30;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gameOverRef.current || settlingRef.current) return;
        
        // Horizontal swipe
        if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 30) {
          moveHorizontal(gestureState.dx > 0 ? 1 : -1);
        }
        // Vertical swipe (Down only)
        else if (gestureState.dy > 40) {
          hardDrop();
        }
      },
    })
  ).current;

  // INITIAL LOAD
  useEffect(() => {
    setNextVal(randomVal(16));
    setPiece({ val: randomVal(16), r: 0, c: 2 });
  }, []);

  const startSettling = useCallback(() => {
    if (settlingRef.current) return;
    setSettling(true);
    
    // Place piece in board
    const p = pieceRef.current;
    let newBoard = boardRef.current.map(row => [...row]);
    
    // Check game over (if we lock above row 0, or on row 0)
    if (newBoard[p.r][p.c] !== null || p.r < 0) {
      setGameOver(true);
      onGameOver(scoreRef.current, maxTileRef.current);
      return;
    }
    
    newBoard[p.r][p.c] = p.val;
    setBoard(newBoard);

    // Resolution loop (handled by interval to safely animate state)
    let resolveTimer;
    const processStep = () => {
      const { newBoard: nb, scoreGained, changed } = settleBoardOnce(boardRef.current);
      if (changed) {
        setBoard(nb);
        setScore(prev => prev + scoreGained);
        
        // update max tile
        const largest = Math.max(...nb.flat().filter(Boolean));
        if (largest > maxTileRef.current) setMaxTile(largest);
      } else {
        // Fully settled!
        clearInterval(resolveTimer);
        
        // Spawn next piece
        const nbCols = nb[0]; // check top row
        if (nbCols.some(c => c !== null)) {
            // Game Over if top row fills up too much and we can't spawn safely
            const nx = nextRef.current;
            if (nb[0][2] !== null) {
              setGameOver(true);
              onGameOver(scoreRef.current, Math.max(...nb.flat().filter(Boolean)));
              return;
            }
        }
        
        setPiece({ val: nextRef.current, r: 0, c: 2 });
        setNextVal(randomVal(maxTileRef.current));
        setSettling(false);
      }
    };
    
    resolveTimer = setInterval(processStep, 100); // 100ms per gravity/merge step

  }, [onGameOver]);

  const moveHorizontal = useCallback((dir) => {
    if (gameOverRef.current || settlingRef.current) return;
    const p = pieceRef.current;
    const b = boardRef.current;
    const newC = p.c + dir;
    if (newC >= 0 && newC < COLS) {
      if (b[p.r][newC] === null) {
        setPiece({ ...p, c: newC });
      }
    }
  }, []);

  const moveDown = useCallback(() => {
    if (gameOverRef.current || settlingRef.current) return;
    const p = pieceRef.current;
    const b = boardRef.current;
    
    if (p.r + 1 < ROWS && b[p.r + 1][p.c] === null) {
      setPiece({ ...p, r: p.r + 1 });
    } else {
      startSettling();
    }
  }, [startSettling]);

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || settlingRef.current) return;
    const p = pieceRef.current;
    const b = boardRef.current;
    let dropR = p.r;
    while (dropR + 1 < ROWS && b[dropR + 1][p.c] === null) {
      dropR++;
    }
    setPiece({ ...p, r: dropR });
    // setTimeout to allow render before lock
    setTimeout(() => startSettling(), 50);
  }, [startSettling]);

  // Gravity
  useEffect(() => {
    if (gameOver || settling) return;
    // Speed up based on max tile
    const speed = Math.max(300, START_SPEED - Math.floor(score / 500) * 50);
    const interval = setInterval(moveDown, speed);
    return () => clearInterval(interval);
  }, [maxTile, score, gameOver, settling, moveDown]);

  // Keyboard controls
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKey = (e) => {
      const map = {
        ArrowLeft: () => moveHorizontal(-1),
        ArrowRight: () => moveHorizontal(1),
        ArrowDown: () => moveDown(),
        ' ': () => hardDrop(),
        w: () => hardDrop(),
        a: () => moveHorizontal(-1),
        d: () => moveHorizontal(1),
        s: () => moveDown(),
      };
      if (map[e.key]) {
        e.preventDefault();
        map[e.key]();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveHorizontal, moveDown, hardDrop]);

  // Cell Size math
  const maxBoardHeight = layout.h > 0 ? layout.h - 180 : 0;
  const maxBoardWidth = layout.w > 0 ? layout.w - 32 : 0;
  
  const GAP = 4;
  const cellW = maxBoardWidth > 0 ? Math.floor((maxBoardWidth - GAP*(COLS+1)) / COLS) : 0;
  const cellH = maxBoardHeight > 0 ? Math.floor((maxBoardHeight - GAP*(ROWS+1)) / ROWS) : 0;
  const cellSize = Math.min(cellW, cellH, 60); // Cap at 60px

  const boardWidth = cellSize * COLS + GAP * (COLS + 1);
  const boardHeight = cellSize * ROWS + GAP * (ROWS + 1);

  const curStyle = getTileStyle(piece.val);
  const nextStyle = getTileStyle(nextVal);

  return (
    <View style={s.gameContainer} {...panResponder.panHandlers} onLayout={(e) => {
      const { width: w, height: h } = e.nativeEvent.layout;
      setLayout({ w, h });
    }}>
      {/* Header */}
      <View style={s.gameHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onMenu} activeOpacity={0.7}>
          <Text style={s.backBtnText}>✕</Text>
        </TouchableOpacity>
        
        <View style={s.scoreBox}>
          <Text style={s.scoreNum}>{score}</Text>
          <Text style={s.scoreLabel}>SCORE</Text>
        </View>
        <View style={s.nextBox}>
          <Text style={s.nextLabel}>NEXT</Text>
          <View style={[s.nextTile, { backgroundColor: nextStyle.bg }]}>
            <Text style={[s.nextTileText, { color: nextStyle.text }]}>{nextVal}</Text>
          </View>
        </View>
      </View>

      {cellSize > 0 && (
        <View style={[s.board, { width: boardWidth, height: boardHeight, padding: GAP }]}>
          
          {/* Background Grid */}
          <View style={StyleSheet.absoluteFill}>
            {Array.from({ length: ROWS }).map((_, r) => (
              <View key={`bg-r-${r}`} style={{ flexDirection: 'row', gap: GAP, marginTop: r===0?GAP:0, marginLeft: GAP }}>
                {Array.from({ length: COLS }).map((_, c) => (
                  <View key={`bg-c-${c}`} style={[s.bgCell, { width: cellSize, height: cellSize }]} />
                ))}
              </View>
            ))}
          </View>

          {/* Placed Tiles */}
          <View style={StyleSheet.absoluteFill}>
            {board.map((row, r) => (
              <View key={`row-${r}`} style={{ flexDirection: 'row', gap: GAP, marginTop: r===0?GAP:0, marginLeft: GAP }}>
                {row.map((val, c) => (
                  <View key={`cell-${r}-${c}`} style={{ width: cellSize, height: cellSize }}>
                    {val !== null && <SettledTile value={val} size={cellSize} />}
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* Falling Piece */}
          {!settling && (
            <View
              style={{
                position: 'absolute',
                top: piece.r * (cellSize + GAP) + GAP,
                left: piece.c * (cellSize + GAP) + GAP,
                width: cellSize, height: cellSize,
                backgroundColor: curStyle.bg,
                borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity: 0.3, shadowRadius:4, elevation:4,
              }}
            >
              <Text style={[s.cellTileText, { color: curStyle.text, fontSize: piece.val > 1000 ? cellSize*0.35 : cellSize*0.45 }]}>
                {piece.val}
              </Text>
            </View>
          )}

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
export default function NumberDropGame() {
  const [screen, setScreen] = useState('home');
  const [lastScore, setLastScore] = useState(0);
  const [lastMax, setLastMax] = useState(0);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('@highscore_number_drop').then(score => {
      if (score) setHighScore(parseInt(score, 10));
    }).catch(e => console.log('Error loading score:', e));
  }, []);

  const handleGameOver = (finalScore, finalMax) => {
    setLastScore(finalScore);
    setLastMax(finalMax);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      AsyncStorage.setItem('@highscore_number_drop', finalScore.toString()).catch(e => console.log(e));
    }
    setScreen('over');
  };

  if (screen === 'home')
    return <HomeScreen onStart={() => setScreen('game')} highScore={highScore} />;
  if (screen === 'game')
    return <GameScreen key={Date.now()} onGameOver={handleGameOver} onMenu={() => setScreen('home')} />;
  if (screen === 'over')
    return <GameOverScreen score={lastScore} maxTile={lastMax} highScore={highScore}
      onReplay={() => setScreen('game')} onMenu={() => setScreen('home')} />;
  return null;
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  homeContainer: {
    flex: 1, backgroundColor: '#0d0d17',
    alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32,
    paddingTop: Platform.OS === 'android' ? 64 : 32,
  },
  homeBackBtn: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: '#12121e', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    zIndex: 10,
  },
  homeBackText: { color: '#6B6B8E', fontSize: 12, fontWeight: '700' },
  homeEmoji: { fontSize: 56 },
  homeTitle: {
    fontSize: 44, fontWeight: '900', color: '#fff',
    letterSpacing: 4, textAlign: 'center', lineHeight: 48,
  },
  homeSub: { fontSize: 13, color: '#6B6B8E', letterSpacing: 1, textAlign: 'center' },
  
  previewBoard: {
    padding: 12,
    backgroundColor: '#12121e', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  previewRow: { flexDirection: 'row', alignItems: 'center' },

  hsBox: {
    alignItems: 'center', backgroundColor: '#12121e',
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)',
  },
  hsLabel: { fontSize: 9, color: '#6B6B8E', fontWeight: '700', letterSpacing: 2 },
  hsVal: { fontSize: 22, color: '#2ECC71', fontWeight: '900' },
  
  startBtn: {
    backgroundColor: '#8E44AD', paddingHorizontal: 52, paddingVertical: 16,
    borderRadius: 14, shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  howText: { color: '#3a3a5a', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Game
  gameContainer: {
    flex: 1, backgroundColor: '#050510', alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 60 : 8,
  },
  gameHeader: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', paddingHorizontal: 16, gap: 12, marginBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#12121e', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtnText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
  scoreBox: {
    flex: 1, alignItems: 'center', backgroundColor: '#12121e',
    borderRadius: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  scoreNum: { color: '#fff', fontSize: 20, fontWeight: '900' },
  scoreLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  nextBox: {
    alignItems: 'center', gap: 4, width: 44,
  },
  nextLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  nextTile: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  nextTileText: { fontSize: 12, fontWeight: '900' },

  board: {
    backgroundColor: '#0a0a14', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  bgCell: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
  },
  cellTile: {
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width:0, height:2 }, shadowRadius: 4, elevation: 3,
  },
  cellTileText: { fontWeight: '900' },

  controls: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 24,
    justifyContent: 'center',
  },
  ctrlBtn: {
    width: 52, height: 48, borderRadius: 12,
    backgroundColor: '#12121e', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  ctrlBtnWide: { width: 72 },
  ctrlText: { color: '#6B6B8E', fontSize: 18 },

  // Overlay
  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0d0d17', gap: 16, padding: 32,
    paddingTop: Platform.OS === 'android' ? 60 : 32,
  },
  overlayEmoji: { fontSize: 64 },
  overlayTitle: { color: '#E74C3C', fontSize: 32, fontWeight: '900', letterSpacing: 4 },
  overStats: {
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
    backgroundColor: '#8E44AD', paddingHorizontal: 28, paddingVertical: 16,
    borderRadius: 14, shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  btnSecondary: {
    backgroundColor: '#12121e', paddingHorizontal: 24, paddingVertical: 16,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  btnSecondaryText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
});
