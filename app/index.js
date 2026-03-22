import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// --- THEME ---
const THEME = {
  primary: '#5cb8fd',
  surface: '#0d0d17',
  background: '#0d0d17',
  onSurface: '#e7e3f3',
  onSurfaceVariant: '#aca9b8',
  surfaceContainerLow: '#12121e',
  surfaceContainerHighest: '#252433',
  secondary: '#ff7260',
  error: '#ff716c',
  outlineVariant: 'rgba(71, 71, 83, 0.2)',
};

// --- DATA ---
const GAMES = [
  {
    id: 'color_flood',
    title: 'COLOR FLOOD',
    subtitle: 'Conquer the board with logic',
    icon: '🌊',
    colors: ['#3498DB', '#1ABC9C'],
    bestScore: '0',
  },
  {
    id: 'number_merge',
    title: 'NUMBER MERGE',
    subtitle: 'Classic 2048 strategy',
    icon: '🔢',
    colors: ['#8E44AD', '#9B59B6'],
    bestScore: '0',
  },
  {
    id: 'tic_tac_toe',
    title: 'TIC TAC TOE',
    subtitle: 'Outsmart the AI opponent',
    icon: '❌',
    colors: ['#E74C3C', '#C0392B'],
    bestScore: '0',
  },
  {
    id: 'tetris_extreme',
    title: 'TETRIS EXTREME',
    subtitle: 'Blocks at hyper-speed',
    icon: '🕹️',
    colors: ['#2980B9', '#1ABC9C'],
    bestScore: '0',
  },
  {
    id: 'dodge_rush',
    title: 'DODGE RUSH',
    subtitle: 'Intense obstacle avoidance',
    icon: '🏃',
    colors: ['#E67E22', '#F39C12'],
    bestScore: '0',
  },
  {
    id: 'number_drop',
    title: 'NUMBER DROP',
    subtitle: 'Catch falling numbers in order',
    icon: '🔟',
    colors: ['#27AE60', '#2ECC71'],
    bestScore: '0',
  },
];

// --- COMPONENTS ---

const StarField = () => {
    const stars = useRef(
        Array.from({ length: 30 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2 + 1,
            anim: new Animated.Value(Math.random()),
        }))
    ).current;

    useEffect(() => {
        stars.forEach(star => {
            const animate = () => {
                Animated.sequence([
                    Animated.timing(star.anim, {
                        toValue: 1,
                        duration: 1000 + Math.random() * 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(star.anim, {
                        toValue: 0.2,
                        duration: 1000 + Math.random() * 2000,
                        useNativeDriver: true,
                    }),
                ]).start(animate);
            };
            animate();
        });
    }, []);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {stars.map((star, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        left: star.x,
                        top: star.y,
                        width: star.size,
                        height: star.size,
                        borderRadius: star.size / 2,
                        backgroundColor: 'white',
                        opacity: star.anim,
                    }}
                />
            ))}
        </View>
    );
};

const GameCard = ({ game, onPlay, index }) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 100 + 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100 + 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.cardContainer, 
      { 
        opacity: opacityAnim, 
        transform: [{ translateY: slideAnim }] 
      }
    ]}>
      <LinearGradient
        colors={game.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardIcon}>{game.icon}</Text>
            <View>
              <Text style={styles.cardTitle}>{game.title}</Text>
              <Text style={styles.cardSubtitle}>{game.subtitle}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <TouchableOpacity 
              style={styles.playButton}
              onPress={() => onPlay(game.id)}
            >
              <Text style={[styles.playButtonText, { color: game.colors[0] }]}>PLAY</Text>
            </TouchableOpacity>
            <Text style={styles.bestScoreText}>Best Score: {game.bestScore}</Text>
          </View>
        </View>
        <View style={styles.cardDecor} />
      </LinearGradient>
    </Animated.View>
  );
};

export default function ArcadeVaultHome() {
  const router = useRouter();
  const headerAnim = useRef(new Animated.Value(-100)).current;
  const statsAnim = useRef(new Animated.Value(0.9)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const joystickPulse = useRef(new Animated.Value(1)).current;
  const [gamesWithScores, setGamesWithScores] = useState(GAMES);

  useEffect(() => {
    // Fetch top scores
    const loadScores = async () => {
      const updatedGames = await Promise.all(GAMES.map(async (g) => {
        try {
          const score = await AsyncStorage.getItem(`@highscore_${g.id}`);
          return { ...g, bestScore: score ? score : '0' };
        } catch (e) {
          return g;
        }
      }));
      setGamesWithScores(updatedGames);
    };
    loadScores();

    // Header anim
    Animated.spring(headerAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Stats Bar anim
    Animated.parallel([
      Animated.spring(statsAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(statsOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    // Infinite logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(joystickPulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(joystickPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePlay = (gameId) => {
    const routes = {
      color_flood: '/color_flood',
      number_merge: '/number_merge',
      tic_tac_toe: '/tic_tac_toe',
      tetris_extreme: '/tetris',
      dodge_rush: '/dodge_rush',
      number_drop: '/number_drop',
    };
    if (routes[gameId]) {
      router.push(routes[gameId]);
    } else {
      alert(`${gameId} coming soon!`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StarField />
      
      {/* Top App Bar */}
      <Animated.View style={[styles.topAppBar, { transform: [{ translateY: headerAnim }] }]}>
        <SafeAreaView>
          <View style={styles.topBarContent}>
            <View style={styles.logoContainer}>
              <Animated.View style={{ transform: [{ scale: joystickPulse }] }}>
                <MaterialCommunityIcons name="controller-classic" size={32} color={THEME.primary} style={styles.neonGlow} />
              </Animated.View>
              <Text style={styles.logoText}>ARCADE VAULT</Text>
            </View>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCct2FKxpYs0ErYsA3k2MzEWoVii91Vykzxp-hvaT-N0wUEaoAmW7wsGo3sHJetCyOL6u7SFgHpmrA9QQ5l_8iXBTgJ9vgKiz0MSSbO5iYa1P8eRce4vT7tj_ifkKVqdFn312SIeQAC9Gb-XYDOav4Sx5TUsrT7WREPAO6pfspU1rfQJcvlGnF52CaLolr4ELsL8Wmyq2m69Ec2JNY0JJsDIGoYNWRfFQrmNwe_KKMhbd9iJbh_DXA7JkNblfpO4lqOVlFI6wuwDwUf' }} 
                style={styles.avatar} 
              />
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Message */}
        <Animated.View style={{ opacity: statsOpacity, marginBottom: 12 }}>
            <Text style={styles.welcomeTitle}>Welcome, Recruit!</Text>
            <Text style={styles.welcomeSub}>Complete your first vault to unlock more.</Text>
        </Animated.View>

        {/* Player Stats Bar */}
        <Animated.View style={[
            styles.statsBar, 
            { 
              opacity: statsOpacity, 
              transform: [{ scale: statsAnim }] 
            }
        ]}>
          <View>
            <Text style={styles.playerName}>New Player</Text>
            <Text style={styles.playerTier}>NOVICE EXPLORER</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>⭐ 0</Text>
              <Text style={styles.statLabel}>COINS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: THEME.secondary }]}>LVL 1</Text>
              <Text style={styles.statLabel}>RANK</Text>
            </View>
          </View>
        </Animated.View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Vaults</Text>
          <Text style={styles.sectionCount}>{GAMES.length} Active</Text>
        </View>

        {/* Game List */}
        <View style={styles.gameList}>
          {gamesWithScores.map((game, index) => (
            <GameCard key={game.id} game={game} onPlay={handlePlay} index={index} />
          ))}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Nav Bar */}
      <View style={styles.bottomNavContainer}>
        <BlurView intensity={25} tint="dark" style={styles.bottomNav}>
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
            <MaterialCommunityIcons name="home" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => alert('Leaderboards coming soon!')}>
            <MaterialCommunityIcons name="chart-bar" size={24} color={THEME.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => alert('Achievements coming soon!')}>
            <MaterialCommunityIcons name="trophy" size={24} color={THEME.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => alert('Settings coming soon!')}>
            <MaterialCommunityIcons name="cog" size={24} color={THEME.onSurfaceVariant} />
          </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  topAppBar: {
    backgroundColor: THEME.background,
    zIndex: 50,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -1,
  },
  neonGlow: {
    textShadowColor: THEME.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(92, 184, 253, 0.2)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  welcomeTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  welcomeSub: {
    color: THEME.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  statsBar: {
    backgroundColor: THEME.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  playerName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  playerTier: {
    color: THEME.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'flex-end',
  },
  statValue: {
    color: THEME.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: THEME.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: THEME.outlineVariant,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  sectionCount: {
    fontSize: 12,
    color: THEME.onSurfaceVariant,
  },
  gameList: {
    gap: 16,
  },
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: THEME.surfaceContainerHighest,
  },
  cardGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    width: '100%',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
  },
  cardIcon: {
    fontSize: 40,
  },
  cardTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  playButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 99,
  },
  playButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bestScoreText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    marginTop: 8,
  },
  cardDecor: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 100,
    height: '200%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ rotate: '15deg' }, { translateX: 40 }],
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 24,
  },
  bottomNav: {
    width: '90%',
    height: 64,
    backgroundColor: 'rgba(26, 26, 38, 0.85)',
    borderRadius: 32,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  navItem: {
    padding: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 99,
  },
});