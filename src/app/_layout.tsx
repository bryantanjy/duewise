import '../global.css';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { db } from '@/db';

// Drizzle Kit 1.0 RC generates the runtime bundle without the legacy journal
// field, while the migrator hook's declaration still requires it.
const bundledMigrations = migrations as unknown as Parameters<typeof useMigrations>[1];

export default function RootLayout() {
  const { success, error } = useMigrations(db, bundledMigrations);

  if (error) {
    return (
      <View style={[styles.container, styles.errorBackground]}>
        <Text style={styles.errorTitle}>Database setup failed</Text>
        <Text selectable style={styles.errorMessage}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#635BFF" size="large" />
        <Text style={styles.loadingText}>Preparing Duewise…</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F7F7F5',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorBackground: {
    backgroundColor: '#FFF7F7',
  },
  errorTitle: {
    color: '#D84A4A',
    fontSize: 20,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#8F3030',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingText: {
    color: '#737373',
    fontSize: 15,
    marginTop: 16,
  },
});
