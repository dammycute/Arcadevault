import { Stack } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <View style={styles.outerContainer}>
      <View style={styles.mobileFrame}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="color_flood" />
          <Stack.Screen name="number_merge" />
          <Stack.Screen name="tic_tac_toe" />
          <Stack.Screen name="tetris" />
          <Stack.Screen name="dodge_rush" />
          <Stack.Screen name="number_drop" />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  mobileFrame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    backgroundColor: '#0d0d17',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        overflow: 'hidden',
      },
    }),
  },
});
