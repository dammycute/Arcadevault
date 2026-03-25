// NumberDropGame.jsx — Drop The Number Clone for Arcade Vault
// FIXED: No column highlight lines during drop
// FIXED: Connected-group merge (flood-fill any shape: V, L, T, line, etc.)
// FIXED: Merge result appears at the newest tile's position
// FIXED: Tap moves piece to tapped column (absolute)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const options = [2, 2, 2, 4, 4, 8, 8, 16, 32, 64];
  const valid = options.filter(v => v <= maxTile || v <= 64);
  return valid[Math.floor(Math.random() * valid.length)];
}

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

// ─── FLOOD-FILL: find all orthogonally connected cells with same value ───────
function findConnectedGroup(board, startR, startC) {
  const val = board[startR][startC];
  if (val === null) return [];
  const visited = new Set();
  const stack = [[startR, startC]];
  const group = [];
  while (stack.length) {
    const [r, c] = stack.pop();
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (board[r][c] !== val) continue;
    visited.add(key);
    group.push([r, c]);
    stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
  }
  return group;
}

// ─── SETTLE: gravity then connected-group merge ───────────────────────────────
// newestR, newestC = where the most recently placed tile is (merge result goes here)
function settleBoardOnce(board, newestR, newestC) {
  let currentBoard = board.map(row => [...row]);
  let scoreGained = 0;
  let changed = false;

  // 1. Gravity — drop all tiles down
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

  if (!changed) {
    // 2. Find connected groups of size >= 2; prefer the group containing newest tile
    const checked = new Set();
    let bestGroup = null;
    let bestSize = 1;
    let bestContainsNewest = false;

    for (let r = ROWS - 1; r >= 0; r--) {
      for (let c = 0; c < COLS; c++) {
        if (currentBoard[r][c] === null) continue;
        const key = `${r},${c}`;
        if (checked.has(key)) continue;
        const group = findConnectedGroup(currentBoard, r, c);
        group.forEach(([gr, gc]) => checked.add(`${gr},${gc}`));
        if (group.length < 2) continue;
        const containsNewest = group.some(([gr, gc]) => gr === newestR && gc === newestC);
        // Priority: contains newest tile first, then largest group
        if (
          bestGroup === null ||
          (!bestContainsNewest && containsNewest) ||
          (containsNewest === bestContainsNewest && group.length > bestSize)
        ) {
          bestGroup = group;
          bestSize = group.length;
          bestContainsNewest = containsNewest;
        }
      }
    }

    if (bestGroup) {
      const val = currentBoard[bestGroup[0][0]][bestGroup[0][1]];
      // Multiplier: 2→×2, 3→×4, 4→×8, etc.
      const mergedVal = val * Math.pow(2, bestGroup.length - 1);
      scoreGained += mergedVal;

      // Result position = newest tile if in group, else bottom-most left-most
      let resultR = -1, resultC = -1;
      if (bestContainsNewest) {
        resultR = newestR;
        resultC = newestC;
      } else {
        for (const [r, c] of bestGroup) {
          if (r > resultR || (r === resultR && c < resultC)) {
            resultR = r; resultC = c;
          }
        }
      }

      for (const [r, c] of bestGroup) currentBoard[r][c] = null;
      currentBoard[resultR][resultC] = mergedVal;
      changed = true;
    }
  }

  return { newBoard: currentBoard, scoreGained, changed };
}

// ─── TILE COMPONENT ──────────────────────────────────────────────────────────
function SettledTile({ value, size }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }).start();
  }, [value]);
  const style = getTileStyle(value);
  const fontSize = value > 999 ? (size - 4) * 0.30 : value > 99 ? (size - 4) * 0.36 : (size - 4) * 0.45;
  return (
    <Animated.View style={[
      st.cellTile,
      { width: size - 4, height: size - 4, backgroundColor: style.bg, transform: [{ scale }] }
    ]}>
      <Text style={[st.cellTileText, { color: style.text, fontSize }]}>{value}</Text>
    </Animated.View>
  );
}

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
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
    <View style={st.homeContainer}>
      <TouchableOpacity style={st.homeBackBtn} onPress={() => router.back()}>
        <Text style={st.homeBackText}>← BACK</Text>
      </TouchableOpacity>
      <Text style={st.homeEmoji}>🎯</Text>
      <Text style={st.homeTitle}>NUMBER{'\n'}DROP</Text>
      <Text style={st.homeSub}>Drop blocks • Merge connected numbers</Text>

      {/* V-shape merge preview */}
      <View style={st.previewBoard}>
        <View style={st.previewRow}>
          {[TILE_COLORS[4], null, TILE_COLORS[4]].map((s, i) => (
            <View key={i} style={[st.previewCell, { backgroundColor: s ? s.bg : 'transparent' }]}>
              {s && <Text style={[st.previewCellText, { color: s.text }]}>4</Text>}
            </View>
          ))}
        </View>
        <View style={st.previewRow}>
          {[null, TILE_COLORS[4], null].map((s, i) => (
            <View key={i} style={[st.previewCell, { backgroundColor: s ? s.bg : 'transparent' }]}>
              {s && <Text style={[st.previewCellText, { color: s.text }]}>4</Text>}
            </View>
          ))}
        </View>
        <View style={[st.previewRow, { alignItems: 'center' }]}>
          <Text style={{ color: '#6B6B8E', fontSize: 11, marginRight: 6 }}>V-shape →</Text>
          <View style={[st.previewCell, { backgroundColor: TILE_COLORS[16].bg }]}>
            <Text style={[st.previewCellText, { color: TILE_COLORS[16].text }]}>16</Text>
          </View>
        </View>
      </View>

      {highScore > 0 && (
        <View style={st.hsBox}>
          <Text style={st.hsLabel}>TOP SCORE</Text>
          <Text style={st.hsVal}>{highScore}</Text>
        </View>
      )}

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity style={st.startBtn} onPress={onStart} activeOpacity={0.8}>
          <Text style={st.startBtnText}>START</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={st.howBox}>
        <Text style={st.howTitle}>HOW TO PLAY</Text>
        <Text style={st.howText}>
          {'Tap a column to aim  •  Swipe ↓ to drop\n'}
          {'Any connected same-number tiles merge!\n'}
          {'Multi-tile merges for higher results!'}
        </Text>
      </View>
    </View>
  );
}

// ─── GAME OVER ────────────────────────────────────────────────────────────────
function GameOverScreen({ score, maxTile, highScore, onReplay, onMenu }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[st.overlay, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={st.overlayEmoji}>🧱</Text>
      <Text style={st.overlayTitle}>BOARD FULL!</Text>
      <View style={st.overStats}>
        <View style={st.overStat}><Text style={st.overStatVal}>{score}</Text><Text style={st.overStatLabel}>SCORE</Text></View>
        <View style={st.overStatDiv} />
        <View style={st.overStat}><Text style={st.overStatVal}>{maxTile}</Text><Text style={st.overStatLabel}>BEST TILE</Text></View>
        <View style={st.overStatDiv} />
        <View style={st.overStat}><Text style={[st.overStatVal, { color: '#F39C12' }]}>{highScore}</Text><Text style={st.overStatLabel}>HIGH SCORE</Text></View>
      </View>
      <View style={st.btnRow}>
        <TouchableOpacity style={st.btnSecondary} onPress={onMenu}><Text style={st.btnSecondaryText}>↩ MENU</Text></TouchableOpacity>
        <TouchableOpacity style={st.btnPrimary} onPress={onReplay}><Text style={st.btnPrimaryText}>↺ RETRY</Text></TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── GAME SCREEN ──────────────────────────────────────────────────────────────
function GameScreen({ onGameOver, onMenu }) {
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [board, setBoard] = useState(createBoard);
  const [piece, setPiece] = useState({ val: 2, r: 0, c: 2 });
  const [nextVal, setNextVal] = useState(4);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [settling, setSettling] = useState(false);
  const [maxTile, setMaxTile] = useState(64);

  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const nextRef = useRef(nextVal);
  const scoreRef = useRef(score);
  const maxTileRef = useRef(maxTile);
  const settlingRef = useRef(settling);
  const gameOverRef = useRef(gameOver);
  const newestPosRef = useRef({ r: 0, c: 2 }); // tracks where newest tile landed

  const touchStartRef = useRef(null);
  const boardLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { nextRef.current = nextVal; }, [nextVal]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { maxTileRef.current = maxTile; }, [maxTile]);
  useEffect(() => { settlingRef.current = settling; }, [settling]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  useEffect(() => {
    setNextVal(randomVal(16));
    setPiece({ val: randomVal(16), r: 0, c: 2 });
  }, []);

  const spawnNext = useCallback(() => {
    const nextPieceVal = nextRef.current;
    const newNextVal = randomVal(maxTileRef.current);
    if (boardRef.current[0][2] !== null) {
      setGameOver(true);
      onGameOver(scoreRef.current, maxTileRef.current);
      return;
    }
    setPiece({ val: nextPieceVal, r: 0, c: 2 });
    setNextVal(newNextVal);
    setSettling(false);
  }, [onGameOver]);

  const startSettling = useCallback(() => {
    if (settlingRef.current) return;
    setSettling(true);

    const p = pieceRef.current;
    let newBoard = boardRef.current.map(row => [...row]);

    if (newBoard[p.r][p.c] !== null) {
      setGameOver(true);
      onGameOver(scoreRef.current, maxTileRef.current);
      return;
    }

    newBoard[p.r][p.c] = p.val;
    // Track the newest tile's column; row will settle with gravity
    let newestR = p.r;
    let newestC = p.c;
    newestPosRef.current = { r: newestR, c: newestC };
    setBoard(newBoard);

    let resolveTimer;
    const processStep = () => {
      const { newBoard: nb, scoreGained, changed } = settleBoardOnce(
        boardRef.current,
        newestPosRef.current.r,
        newestPosRef.current.c
      );
      if (changed) {
        setBoard(nb);
        setScore(prev => prev + scoreGained);
        const allVals = nb.flat().filter(Boolean);
        if (allVals.length > 0) {
          const largest = Math.max(...allVals);
          if (largest > maxTileRef.current) setMaxTile(largest);
        }
        // After gravity, find where the newest tile settled in its column
        let foundR = newestPosRef.current.r;
        const nc = newestPosRef.current.c;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (nb[r][nc] !== null) { foundR = r; break; }
        }
        newestPosRef.current = { r: foundR, c: nc };
      } else {
        clearInterval(resolveTimer);
        spawnNext();
      }
    };

    resolveTimer = setInterval(processStep, 120);
  }, [onGameOver, spawnNext]);

  const moveToColumn = useCallback((targetCol) => {
    if (gameOverRef.current || settlingRef.current) return;
    const p = pieceRef.current;
    const clampedCol = Math.max(0, Math.min(COLS - 1, targetCol));
    if (boardRef.current[p.r][clampedCol] === null) {
      setPiece({ ...p, c: clampedCol });
    }
  }, []);

  const moveHorizontal = useCallback((dir) => {
    if (gameOverRef.current || settlingRef.current) return;
    const p = pieceRef.current;
    const newC = p.c + dir;
    if (newC >= 0 && newC < COLS && boardRef.current[p.r][newC] === null) {
      setPiece({ ...p, c: newC });
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
    while (dropR + 1 < ROWS && b[dropR + 1][p.c] === null) dropR++;
    setPiece({ ...p, r: dropR });
    setTimeout(() => startSettling(), 50);
  }, [startSettling]);

  // Gravity ticker
  useEffect(() => {
    if (gameOver || settling) return;
    const speed = Math.max(300, START_SPEED - Math.floor(score / 500) * 50);
    const interval = setInterval(moveDown, speed);
    return () => clearInterval(interval);
  }, [maxTile, score, gameOver, settling, moveDown]);

  // Keyboard (web)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKey = (e) => {
      const map = {
        ArrowLeft: () => moveHorizontal(-1),
        ArrowRight: () => moveHorizontal(1),
        ArrowDown: () => hardDrop(),
        ' ': () => hardDrop(),
        a: () => moveHorizontal(-1),
        d: () => moveHorizontal(1),
        s: () => hardDrop(),
      };
      if (map[e.key]) { e.preventDefault(); map[e.key](); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveHorizontal, hardDrop]);

  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    const touch = e.nativeEvent.touches[0];
    touchStartRef.current = { x: touch.pageX, y: touch.pageY };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;
    const touch = e.nativeEvent.changedTouches[0];
    const dx = touch.pageX - touchStartRef.current.x;
    const dy = touch.pageY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const startX = touchStartRef.current.x;
    touchStartRef.current = null;

    // Tap → move to tapped column (absolute)
    if (absDx < 15 && absDy < 15) {
      const { x: boardX, width: boardW } = boardLayoutRef.current;
      const relX = startX - boardX;
      if (boardW > 0 && relX >= 0 && relX <= boardW) {
        const GAP = 3;
        const cs = Math.floor((boardW - GAP * (COLS - 1)) / COLS);
        moveToColumn(Math.floor(relX / (cs + GAP)));
      }
      return;
    }
    if (absDy > absDx && dy > 20) { hardDrop(); return; }
    if (absDx > absDy) { moveHorizontal(dx > 0 ? 1 : -1); }
  }, [moveToColumn, moveHorizontal, hardDrop]);

  // Sizing
  const GAP = 3;
  const maxBoardH = layout.h > 0 ? layout.h - 140 : 0;
  const maxBoardW = layout.w > 0 ? layout.w - 32 : 0;
  const cellW = maxBoardW > 0 ? Math.floor((maxBoardW - GAP * (COLS - 1)) / COLS) : 0;
  const cellH = maxBoardH > 0 ? Math.floor((maxBoardH - GAP * (ROWS - 1)) / ROWS) : 0;
  const cellSize = Math.min(cellW, cellH, 62);
  const boardWidth = cellSize * COLS + GAP * (COLS - 1);
  const boardHeight = cellSize * ROWS + GAP * (ROWS - 1);

  const curStyle = getTileStyle(piece.val);
  const nextStyle = getTileStyle(nextVal);

  // Ghost piece — just an outline, no filled column line
  let ghostR = -1;
  if (!settling && cellSize > 0) {
    let gr = piece.r;
    while (gr + 1 < ROWS && board[gr + 1][piece.c] === null) gr++;
    if (gr !== piece.r) ghostR = gr;
  }

  return (
    <View
      style={st.gameContainer}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setLayout({ w, h });
      }}
    >
      <View style={st.gameHeader}>
        <TouchableOpacity style={st.backBtn} onPress={onMenu} activeOpacity={0.7}>
          <Text style={st.backBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={st.scoreBox}>
          <Text style={st.scoreNum}>{score}</Text>
          <Text style={st.scoreLabel}>SCORE</Text>
        </View>
        <View style={st.nextBox}>
          <Text style={st.nextLabel}>NEXT</Text>
          <View style={[st.nextTile, { backgroundColor: nextStyle.bg }]}>
            <Text style={[st.nextTileText, { color: nextStyle.text }]}>{nextVal}</Text>
          </View>
        </View>
      </View>

      {cellSize > 0 && (
        <View
          style={[st.board, { width: boardWidth, height: boardHeight }]}
          onLayout={(e) => {
            e.target.measure((_x, _y, width, height, pageX, pageY) => {
              boardLayoutRef.current = { x: pageX, y: pageY, width, height };
            });
          }}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleTouchStart}
          onResponderRelease={handleTouchEnd}
        >
          {/* Settled tiles */}
          {board.map((row, r) =>
            row.map((val, c) =>
              val !== null ? (
                <View
                  key={`${r}-${c}`}
                  style={{
                    position: 'absolute',
                    top: r * (cellSize + GAP),
                    left: c * (cellSize + GAP),
                    width: cellSize, height: cellSize,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <SettledTile value={val} size={cellSize} />
                </View>
              ) : null
            )
          )}

          {/* Ghost — outline only, no line running through board */}
          {ghostR >= 0 && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: ghostR * (cellSize + GAP),
                left: piece.c * (cellSize + GAP),
                width: cellSize, height: cellSize,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: curStyle.bg,
                opacity: 0.4,
              }}
            />
          )}

          {/* Falling piece */}
          {!settling && (
            <View style={{
              position: 'absolute',
              top: piece.r * (cellSize + GAP),
              left: piece.c * (cellSize + GAP),
              width: cellSize, height: cellSize,
              backgroundColor: curStyle.bg,
              borderRadius: 8,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: curStyle.bg,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7, shadowRadius: 10, elevation: 6,
            }}>
              <Text style={[st.cellTileText, {
                color: curStyle.text,
                fontSize: piece.val > 999 ? cellSize * 0.30 : piece.val > 99 ? cellSize * 0.36 : cellSize * 0.45
              }]}>
                {piece.val}
              </Text>
            </View>
          )}
        </View>
      )}

      <Text style={st.hint}>Tap column to aim  •  Swipe ↓ to drop</Text>
    </View>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
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

  if (screen === 'home') return <HomeScreen onStart={() => setScreen('game')} highScore={highScore} />;
  if (screen === 'game') return <GameScreen key={Date.now()} onGameOver={handleGameOver} onMenu={() => setScreen('home')} />;
  if (screen === 'over') return <GameOverScreen score={lastScore} maxTile={lastMax} highScore={highScore}
    onReplay={() => setScreen('game')} onMenu={() => setScreen('home')} />;
  return null;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  homeContainer: {
    flex: 1, backgroundColor: '#0d0d17',
    alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32,
    paddingTop: Platform.OS === 'android' ? 64 : 32,
  },
  homeBackBtn: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: '#12121e', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', zIndex: 10,
  },
  homeBackText: { color: '#6B6B8E', fontSize: 12, fontWeight: '700' },
  homeEmoji: { fontSize: 56 },
  homeTitle: { fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: 4, textAlign: 'center', lineHeight: 48 },
  homeSub: { fontSize: 13, color: '#6B6B8E', letterSpacing: 1, textAlign: 'center' },
  previewBoard: { padding: 12, backgroundColor: '#12121e', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 4 },
  previewRow: { flexDirection: 'row', gap: 4 },
  previewCell: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  previewCellText: { fontWeight: '900', fontSize: 14 },
  hsBox: { alignItems: 'center', backgroundColor: '#12121e', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)' },
  hsLabel: { fontSize: 9, color: '#6B6B8E', fontWeight: '700', letterSpacing: 2 },
  hsVal: { fontSize: 22, color: '#2ECC71', fontWeight: '900' },
  startBtn: { backgroundColor: '#8E44AD', paddingHorizontal: 52, paddingVertical: 16, borderRadius: 14, shadowColor: '#8E44AD', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  startBtnText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 4 },
  howBox: { backgroundColor: 'rgba(142,68,173,0.08)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(142,68,173,0.2)', alignItems: 'center', gap: 6 },
  howTitle: { color: '#8E44AD', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  howText: { color: '#6B6B8E', fontSize: 12, textAlign: 'center', lineHeight: 20 },
  gameContainer: { flex: 1, backgroundColor: '#050510', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 60 : 8 },
  gameHeader: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#12121e', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  backBtnText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
  scoreBox: { flex: 1, alignItems: 'center', backgroundColor: '#12121e', borderRadius: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  scoreNum: { color: '#fff', fontSize: 20, fontWeight: '900' },
  scoreLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  nextBox: { alignItems: 'center', gap: 4, width: 44 },
  nextLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  nextTile: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  nextTileText: { fontSize: 12, fontWeight: '900' },
  board: { backgroundColor: '#0a0a14', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  cellTile: { borderRadius: 8, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3 },
  cellTileText: { fontWeight: '900' },
  hint: { color: '#2a2a48', fontSize: 11, textAlign: 'center', paddingHorizontal: 16, marginTop: 12 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0d17', gap: 16, padding: 32, paddingTop: Platform.OS === 'android' ? 60 : 32 },
  overlayEmoji: { fontSize: 64 },
  overlayTitle: { color: '#E74C3C', fontSize: 32, fontWeight: '900', letterSpacing: 4 },
  overStats: { flexDirection: 'row', backgroundColor: '#12121e', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', width: '100%' },
  overStat: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  overStatDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  overStatVal: { color: '#fff', fontSize: 20, fontWeight: '900' },
  overStatLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnPrimary: { backgroundColor: '#8E44AD', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 14, shadowColor: '#8E44AD', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  btnSecondary: { backgroundColor: '#12121e', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  btnSecondaryText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
});