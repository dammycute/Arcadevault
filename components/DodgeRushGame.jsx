// DodgeRushGame.jsx — Lane-based obstacle dodger for Arcade Vault
// Swipe/tap UP/DOWN to switch lanes, dodge obstacles, survive as long as possible

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, PanResponder, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');
const LANES = 3;
const OBSTACLE_INTERVAL = 1200;
const BASE_SPEED = 3;

// ─── HOME ───────────────────────────────────────────────────────────────────
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
      <Text style={s.homeEmoji}>🏃</Text>
      <Text style={s.homeTitle}>DODGE{'\n'}RUSH</Text>
      <Text style={s.homeSub}>Swipe up & down to dodge obstacles</Text>

      <View style={s.lanePreview}>
        {[0,1,2].map(i => (
          <View key={i} style={s.lanePreviewRow}>
            {i === 1 && <View style={s.previewPlayer} />}
            {i !== 1 && <View style={s.previewObstacle} />}
          </View>
        ))}
      </View>

      {highScore > 0 && (
        <View style={s.hsBox}>
          <Text style={s.hsLabel}>BEST DISTANCE</Text>
          <Text style={s.hsVal}>{highScore}m</Text>
        </View>
      )}

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity style={s.startBtn} onPress={onStart} activeOpacity={0.8}>
          <Text style={s.startBtnText}>START RUN</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={s.howText}>Tap UP/DOWN or use arrow keys to switch lanes</Text>
    </View>
  );
}

// ─── GAME OVER ──────────────────────────────────────────────────────────────
function GameOverScreen({ distance, highScore, combo, onReplay, onMenu }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[s.overlay, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={s.overlayEmoji}>💥</Text>
      <Text style={s.overlayTitle}>CRASHED!</Text>
      <View style={s.overStats}>
        <View style={s.overStat}>
          <Text style={s.overStatVal}>{distance}m</Text>
          <Text style={s.overStatLabel}>DISTANCE</Text>
        </View>
        <View style={s.overStatDiv} />
        <View style={s.overStat}>
          <Text style={[s.overStatVal, { color: '#F1C40F' }]}>×{combo}</Text>
          <Text style={s.overStatLabel}>MAX COMBO</Text>
        </View>
        <View style={s.overStatDiv} />
        <View style={s.overStat}>
          <Text style={[s.overStatVal, { color: '#F39C12' }]}>{highScore}m</Text>
          <Text style={s.overStatLabel}>BEST</Text>
        </View>
      </View>
      <View style={s.btnRow}>
        <TouchableOpacity style={s.btnSecondary} onPress={onMenu} activeOpacity={0.8}>
          <Text style={s.btnSecondaryText}>↩ EXIT</Text>
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
  const [playerLane, setPlayerLane] = useState(1);
  const [obstacles, setObstacles] = useState([]);
  const [distance, setDistance] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [speed, setSpeed] = useState(BASE_SPEED);
  const [gameOver, setGameOver] = useState(false);

  const playerRef = useRef(1);
  const obstaclesRef = useRef([]);
  const gameOverRef = useRef(false);
  const distRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const speedRef = useRef(BASE_SPEED);
  const frameRef = useRef(null);
  const lastObstacleRef = useRef(Date.now());

  useEffect(() => { playerRef.current = playerLane; }, [playerLane]);
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { distRef.current = distance; }, [distance]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { maxComboRef.current = maxCombo; }, [maxCombo]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const LANE_HEIGHT = layout.h > 0 ? Math.min((layout.h - 200) / LANES, 90) : 80;
  const LANE_AREA_TOP = layout.h > 0 ? (layout.h - LANE_HEIGHT * LANES) / 2 - 30 : 100;

  const moveUp = useCallback(() => {
    if (gameOverRef.current) return;
    setPlayerLane(prev => Math.max(0, prev - 1));
  }, []);

  const moveDown = useCallback(() => {
    if (gameOverRef.current) return;
    setPlayerLane(prev => Math.min(LANES - 1, prev + 1));
  }, []);

  // Keyboard
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); moveUp(); }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); moveDown(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveUp, moveDown]);

  // Touch Controls
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 20,
      onPanResponderRelease: (evt, gestureState) => {
        if (gameOverRef.current) return;
        if (gestureState.dy > 30) moveDown();
        else if (gestureState.dy < -30) moveUp();
      },
    })
  ).current;

  // Game loop
  useEffect(() => {
    if (layout.w === 0 || gameOver) return;
    let animId;
    const loop = () => {
      if (gameOverRef.current) return;
      const now = Date.now();
      const spd = speedRef.current;

      // Spawn obstacles
      if (now - lastObstacleRef.current > Math.max(400, OBSTACLE_INTERVAL - distRef.current * 0.5)) {
        lastObstacleRef.current = now;
        // Pick 1-2 lanes to block
        const numBlocked = distRef.current > 2000 ? (Math.random() < 0.3 ? 2 : 1) : 1;
        const lanes = [];
        while (lanes.length < numBlocked) {
          const l = Math.floor(Math.random() * LANES);
          if (!lanes.includes(l)) lanes.push(l);
        }
        const width = 40 + Math.random() * 40;
        lanes.forEach(lane => {
          obstaclesRef.current = [...obstaclesRef.current, {
            id: now + lane,
            lane,
            x: layout.w + 20,
            width,
          }];
        });
        setObstacles([...obstaclesRef.current]);
      }

      // Move obstacles
      const pLane = playerRef.current;
      let hit = false;
      const playerX = 50;
      const playerW = 24;

      const updated = obstaclesRef.current
        .map(o => ({ ...o, x: o.x - spd }))
        .filter(o => o.x + o.width > -20);

      // Collision
      updated.forEach(o => {
        if (o.lane === pLane) {
          const oRight = o.x + o.width;
          const pRight = playerX + playerW;
          if (o.x < pRight && oRight > playerX) {
            hit = true;
          }
        }
      });

      if (hit) {
        setGameOver(true);
        onGameOver(distRef.current, maxComboRef.current);
        return;
      }

      obstaclesRef.current = updated;
      setObstacles([...updated]);

      // Update distance & speed & combo
      const newDist = distRef.current + Math.round(spd);
      setDistance(newDist);

      // Increase speed every 500m
      const newSpeed = BASE_SPEED + Math.floor(newDist / 500) * 0.5;
      setSpeed(Math.min(newSpeed, 10));

      // Combo: increment when obstacles pass the player
      const passed = updated.filter(o => o.x + o.width < playerX && !o.counted);
      if (passed.length > 0) {
        passed.forEach(o => o.counted = true);
        const newCombo = comboRef.current + passed.length;
        setCombo(newCombo);
        setMaxCombo(Math.max(maxComboRef.current, newCombo));
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [layout.w, gameOver, onGameOver]);

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
        <View style={s.distBox}>
          <Text style={s.distNum}>{distance}m</Text>
          <Text style={s.distLabel}>DISTANCE</Text>
        </View>
        {combo > 2 && (
          <View style={s.comboBox}>
            <Text style={s.comboText}>×{combo}</Text>
          </View>
        )}
      </View>

      {/* Lane Area */}
      {layout.w > 0 && (
        <View style={[s.laneArea, { top: LANE_AREA_TOP, height: LANE_HEIGHT * LANES }]}>
          {[0,1,2].map(i => (
            <View key={i} style={[s.lane, { height: LANE_HEIGHT }]}>
              {/* Player */}
              {playerLane === i && (
                <View style={[s.player, { left: 50 }]}>
                  <View style={s.playerDiamond} />
                  <View style={s.playerTrail} />
                </View>
              )}
            </View>
          ))}

          {/* Obstacles */}
          {obstacles.map(o => (
            <View
              key={o.id}
              style={[
                s.obstacle,
                {
                  left: o.x,
                  top: o.lane * LANE_HEIGHT + (LANE_HEIGHT - 40) / 2,
                  width: o.width,
                  height: 40,
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Controls */}
      <View style={s.controls}>
        <TouchableOpacity style={s.ctrlBtn} onPress={moveUp} activeOpacity={0.6}>
          <Text style={s.ctrlText}>▲</Text>
          <Text style={s.ctrlLabel}>UP</Text>
        </TouchableOpacity>
        <View style={s.ctrlCenter}>
          <Text style={s.ctrlCenterIcon}>🕹️</Text>
        </View>
        <TouchableOpacity style={s.ctrlBtn} onPress={moveDown} activeOpacity={0.6}>
          <Text style={s.ctrlText}>▼</Text>
          <Text style={s.ctrlLabel}>DOWN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── ROOT ───────────────────────────────────────────────────────────────────
export default function DodgeRushGame() {
  const [screen, setScreen] = useState('home');
  const [lastDist, setLastDist] = useState(0);
  const [lastCombo, setLastCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('@highscore_dodge_rush').then(score => {
      if (score) setHighScore(parseInt(score, 10));
    }).catch(e => console.log('Error loading score:', e));
  }, []);

  const handleGameOver = (dist, combo) => {
    setLastDist(dist);
    setLastCombo(combo);
    if (dist > highScore) {
      setHighScore(dist);
      AsyncStorage.setItem('@highscore_dodge_rush', dist.toString()).catch(e => console.log(e));
    }
    setScreen('over');
  };

  if (screen === 'home')
    return <HomeScreen onStart={() => setScreen('game')} highScore={highScore} />;
  if (screen === 'game')
    return <GameScreen key={Date.now()} onGameOver={handleGameOver} onMenu={() => setScreen('home')} />;
  if (screen === 'over')
    return <GameOverScreen distance={lastDist} highScore={highScore} combo={lastCombo}
      onReplay={() => setScreen('game')} onMenu={() => setScreen('home')} />;
  return null;
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  homeContainer: {
    flex: 1, backgroundColor: '#0d0d17',
    alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32,
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
  homeSub: { fontSize: 13, color: '#6B6B8E', letterSpacing: 1.5 },
  lanePreview: {
    gap: 4, padding: 12, backgroundColor: '#12121e', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', width: 200,
  },
  lanePreviewRow: {
    height: 32, backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 4, justifyContent: 'center', paddingLeft: 20,
  },
  previewPlayer: {
    width: 16, height: 16, backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }], borderRadius: 2,
    shadowColor: '#5cb8fd', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 8, elevation: 4,
  },
  previewObstacle: {
    width: 40, height: 20, backgroundColor: '#ff716c',
    borderRadius: 4, opacity: 0.6, marginLeft: 60,
  },
  hsBox: {
    alignItems: 'center', gap: 4, backgroundColor: '#12121e',
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(243,156,18,0.2)',
  },
  hsLabel: { fontSize: 9, color: '#6B6B8E', fontWeight: '700', letterSpacing: 2 },
  hsVal: { fontSize: 22, color: '#F39C12', fontWeight: '900' },
  startBtn: {
    backgroundColor: '#E67E22', paddingHorizontal: 52, paddingVertical: 16,
    borderRadius: 14, shadowColor: '#E67E22',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  howText: { color: '#3a3a5a', fontSize: 11, textAlign: 'center', lineHeight: 18 },

  // Game
  gameContainer: {
    flex: 1, backgroundColor: '#050510',
    paddingTop: Platform.OS === 'android' ? 60 : 12,
  },
  gameHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#12121e', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtnText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
  distBox: {
    flex: 1, alignItems: 'center',
  },
  distNum: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  distLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  comboBox: {
    backgroundColor: 'rgba(241,196,15,0.1)', borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.4)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  comboText: { color: '#F1C40F', fontSize: 16, fontWeight: '900', letterSpacing: -1 },

  laneArea: {
    position: 'absolute', left: 0, right: 0,
  },
  lane: {
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.015)',
    justifyContent: 'center',
  },
  player: {
    position: 'absolute', flexDirection: 'row', alignItems: 'center',
  },
  playerDiamond: {
    width: 24, height: 24, backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }], borderRadius: 3,
    shadowColor: '#5cb8fd', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 12, elevation: 6,
    zIndex: 2,
  },
  playerTrail: {
    width: 50, height: 6, marginLeft: -30,
    backgroundColor: 'rgba(92,184,253,0.3)', borderRadius: 99,
  },
  obstacle: {
    position: 'absolute',
    backgroundColor: '#ff716c',
    borderRadius: 8,
    shadowColor: '#ff716c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },

  controls: {
    position: 'absolute', bottom: 24, left: 24, right: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 0,
    backgroundColor: 'rgba(26,26,38,0.7)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  ctrlBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16,
  },
  ctrlText: { color: '#e7e3f3', fontSize: 24 },
  ctrlLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  ctrlCenter: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#12121e', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(92,184,253,0.3)',
    marginTop: -16,
    shadowColor: '#5cb8fd', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 15, elevation: 4,
  },
  ctrlCenterIcon: { fontSize: 24 },

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
  overStatVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  overStatLabel: { color: '#6B6B8E', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnPrimary: {
    backgroundColor: '#E67E22', paddingHorizontal: 28, paddingVertical: 16,
    borderRadius: 14, shadowColor: '#E67E22',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  btnSecondary: {
    backgroundColor: '#12121e', paddingHorizontal: 24, paddingVertical: 16,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  btnSecondaryText: { color: '#6B6B8E', fontSize: 15, fontWeight: '700' },
});
