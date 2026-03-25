import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  Modal,
  Alert,
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
    title: 'TETRIS',
    subtitle: 'Classic block stacking',
    icon: '🕹️',
    colors: ['#2980B9', '#1ABC9C'],
    bestScore: '0',
  },
  {
    id: 'number_drop',
    title: 'NUMBER DROP',
    subtitle: 'Merge falling numbers',
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
              activeOpacity={0.8}
            >
              <Text style={[styles.playButtonText, { color: game.colors[0] }]}>PLAY</Text>
            </TouchableOpacity>
            <Text style={styles.bestScoreText}>Best: {game.bestScore}</Text>
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
  const [totalPoints, setTotalPoints] = useState(0);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'stats' | 'settings'

  const loadScores = async () => {
    let total = 0;
    const updatedGames = await Promise.all(GAMES.map(async (g) => {
      try {
        const score = await AsyncStorage.getItem(`@highscore_${g.id}`);
        if (score) {
          const num = parseInt(score, 10);
          if (!isNaN(num)) total += num;
          return { ...g, bestScore: score };
        }
        return { ...g, bestScore: '0' };
      } catch (e) {
        return g;
      }
    }));
    setGamesWithScores(updatedGames);
    setTotalPoints(total);
  };

  useEffect(() => {
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
      number_drop: '/number_drop',
    };
    if (routes[gameId]) {
      router.push(routes[gameId]);
    }
  };

  const getRank = (score) => {
    if (score > 10000) return 'ELITE GAMER';
    if (score > 5000) return 'PRO PLAYER';
    if (score > 1000) return 'ARCADE MASTER';
    if (score > 100) return 'SKILLED NOVICE';
    return 'NOVICE EXPLORER';
  };

  const handleClearProgress = () => {
    Alert.alert(
      "Clear Progress",
      "Are you sure you want to reset all high scores? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: async () => {
            const keys = GAMES.map(g => `@highscore_${g.id}`);
            keys.push('@score_data_color_flood', '@score_data_tic_tac_toe', '@score_data_number_merge', '@score_data_tetris_extreme');
            await AsyncStorage.multiRemove(keys);
            loadScores();
            setActiveTab('home');
          }
        }
      ]
    );
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
              <MaterialCommunityIcons name="account-circle" size={32} color={THEME.onSurfaceVariant} />
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Message */}
        <Animated.View style={{ opacity: statsOpacity, marginBottom: 12 }}>
            <Text style={styles.welcomeTitle}>Welcome back!</Text>
            <Text style={styles.welcomeSub}>Pick a vault and start playing.</Text>
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
            <Text style={styles.playerName}>Guest Player</Text>
            <Text style={styles.playerTier}>{getRank(totalPoints)}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>⭐ {totalPoints}</Text>
              <Text style={styles.statLabel}>POINTS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: THEME.secondary }]}>LVL {Math.floor(totalPoints / 1000) + 1}</Text>
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

      {/* Statistics Modal */}
      <Modal visible={activeTab === 'stats'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <BlurView intensity={80} tint="dark" style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>STATISTICS</Text>
                    <TouchableOpacity onPress={() => setActiveTab('home')}>
                        <MaterialCommunityIcons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScroll}>
                    <View style={styles.totalStatsCard}>
                        <Text style={styles.totalPointsVal}>{totalPoints}</Text>
                        <Text style={styles.totalPointsLabel}>TOTAL ARCADE POINTS</Text>
                    </View>
                    <Text style={styles.statsSubtitle}>VAULT BREAKDOWN</Text>
                    {gamesWithScores.map(game => (
                        <View key={game.id} style={styles.statRowItem}>
                            <Text style={styles.statIcon}>{game.icon}</Text>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.statGameTitle}>{game.title}</Text>
                                <Text style={styles.statGameScore}>Best: {game.bestScore}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={THEME.outlineVariant} />
                        </View>
                    ))}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </BlurView>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={activeTab === 'settings'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <BlurView intensity={80} tint="dark" style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>SETTINGS</Text>
                    <TouchableOpacity onPress={() => setActiveTab('home')}>
                        <MaterialCommunityIcons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>
                <View style={styles.modalScroll}>
                    <View style={styles.settingsSection}>
                        <Text style={styles.settingsLabel}>DATA MANAGEMENT</Text>
                        <TouchableOpacity style={styles.settingsBtn} onPress={handleClearProgress}>
                            <MaterialCommunityIcons name="trash-can-outline" size={22} color={THEME.error} />
                            <Text style={[styles.settingsBtnText, { color: THEME.error }]}>Reset All Progress</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.settingsSection}>
                        <Text style={styles.settingsLabel}>ABOUT</Text>
                        <View style={styles.aboutCard}>
                            <Text style={styles.aboutText}>ARCADE VAULT v1.0.0</Text>
                            <Text style={styles.aboutSub}>A collection of premium arcade classics. Built for APKPure release.</Text>
                        </View>
                    </View>

                    <View style={{ flex: 1 }} />
                    <Text style={styles.versionText}>Released 2024 • Arcade Vault Team</Text>
                    <View style={{ height: 40 }} />
                </View>
            </BlurView>
        </View>
      </Modal>

      {/* Bottom Nav Bar */}
      <View style={styles.bottomNavContainer}>
        <BlurView intensity={25} tint="dark" style={styles.bottomNav}>
          <TouchableOpacity 
            style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
            onPress={() => setActiveTab('home')}
          >
            <MaterialCommunityIcons name="home" size={24} color={activeTab === 'home' ? 'white' : THEME.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navItem, activeTab === 'stats' && styles.navItemActive]}
            onPress={() => setActiveTab('stats')}
          >
            <MaterialCommunityIcons name="chart-bar" size={24} color={activeTab === 'stats' ? 'white' : THEME.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navItem, activeTab === 'settings' && styles.navItemActive]}
            onPress={() => setActiveTab('settings')}
          >
            <MaterialCommunityIcons name="cog" size={24} color={activeTab === 'settings' ? 'white' : THEME.onSurfaceVariant} />
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(92, 184, 253, 0.2)',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: height * 0.8,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    overflow: 'hidden',
    backgroundColor: THEME.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
  },
  modalScroll: {
    flex: 1,
  },
  totalStatsCard: {
    backgroundColor: THEME.surfaceContainerHighest,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(92, 184, 253, 0.1)',
  },
  totalPointsVal: {
    fontSize: 48,
    fontWeight: '900',
    color: THEME.primary,
  },
  totalPointsLabel: {
    fontSize: 10,
    color: THEME.onSurfaceVariant,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  statsSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.onSurfaceVariant,
    marginBottom: 16,
    letterSpacing: 1,
  },
  statRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceContainerLow,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  statIcon: {
    fontSize: 24,
  },
  statGameTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  statGameScore: {
    color: THEME.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },
  settingsSection: {
    marginBottom: 32,
  },
  settingsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.onSurfaceVariant,
    marginBottom: 12,
    letterSpacing: 1,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 113, 108, 0.05)',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 108, 0.1)',
  },
  settingsBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  aboutCard: {
    backgroundColor: THEME.surfaceContainerHighest,
    padding: 20,
    borderRadius: 16,
    gap: 8,
  },
  aboutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  aboutSub: {
    color: THEME.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 20,
  },
  versionText: {
    textAlign: 'center',
    color: THEME.onSurfaceVariant,
    fontSize: 11,
    opacity: 0.5,
  },
});