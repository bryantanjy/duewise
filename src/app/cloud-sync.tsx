import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { useTheme } from '@/hooks/use-theme';
import { cloudClient, cloudConfigured, checkCloudConnection, sendCloudCode, signOutCloud, verifyCloudCode } from '@/services/cloud-client';
import { enableCloudSync, pauseCloudSync, syncCloud } from '@/services/cloud-sync';
import { readCloudSetting } from '@/services/cloud-local';

export default function CloudSyncScreen() {
  const colors = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!cloudConfigured);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  const enabled = readCloudSetting('enabled') === 'true';
  const lastSync = readCloudSetting('lastSync');
  const backgroundError = readCloudSetting('syncError');
  useEffect(() => {
    if (!cloudConfigured) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void cloudClient().then(async api => {
      const { data } = await api.auth.getSession();
      if (!active) return;
      setSession(data.session);
      const { data: listener } = api.auth.onAuthStateChange((_event, next) => { if (active) setSession(next); });
      unsubscribe = () => listener.subscription.unsubscribe();
    }).catch(() => { if (active) setError('Unable to restore sign-in. Check your connection and use the latest app build.'); })
      .finally(() => { if (active) setReady(true); });
    const timer = setInterval(() => { if (active) setVersion(value => value + 1); }, 5000);
    return () => { active = false; unsubscribe?.(); clearInterval(timer); };
  }, []);
  // Reading settings again on version changes refreshes progress from foreground sync.
  void version;
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(undefined); setMessage(undefined);
    try { await work(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
    finally { lock.current = false; setBusy(false); setVersion(value => value + 1); }
  }
  async function sync(enable = false) {
    const result = await (enable ? enableCloudSync() : syncCloud());
    setMessage(`Sync complete.${result.conflicts ? ` ${result.conflicts} conflicts were preserved; review any conflict copies.` : ''}${result.skippedAlerts ? ' Some alerts could not be scheduled. Review notification status on the affected reminders.' : ''}`);
  }
  const panel = { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 18, marginTop: 18 };
  const input = { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceInset, borderRadius: 12, color: colors.text, minHeight: 50, paddingHorizontal: 14, marginTop: 10, fontSize: 16 };
  const action = (label: string, work: () => Promise<void>, primary = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !ready, busy }} disabled={busy || !ready} onPress={() => { void run(work); }}
    style={({ pressed }) => ({ minHeight: 50, marginTop: 12, padding: 14, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: primary ? colors.primaryFill : colors.primarySoft, opacity: busy || pressed ? 0.6 : 1 })}>
    <Text style={{ color: primary ? colors.onPrimary : colors.primary, fontWeight: '500', fontSize: 14 }}>{label}</Text>
  </Pressable>;
  return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.homeBackground }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, width: '100%', maxWidth: 684, alignSelf: 'center' }}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 20 }}><Text style={{ color: colors.primary }}>Back</Text></Pressable>
        <Text accessibilityRole="header" style={{ fontSize: 27, lineHeight: 35, color: colors.text, fontWeight: '600', marginTop: 10 }}>Optional cloud sync</Text>
        <Text style={{ marginTop: 12, color: colors.textSecondary, lineHeight: 23 }}>Keep reminders available across your devices. Duewise works without an account, and local reminders remain available offline.</Text>
        {!cloudConfigured ? <View style={panel}><Text style={{ color: colors.text, lineHeight: 23 }}>Cloud sync is not available in this build yet. You can continue using local reminders and manual backups.</Text></View> : !ready ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} /> : !session ? <View style={panel}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>Sign in with an email code</Text>
          <TextInput accessibilityLabel="Email address" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" value={email} editable={!busy && !codeSent} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textSecondary} style={input} />
          {!codeSent ? action('Send sign-in code', async () => {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter a valid email address.');
            await sendCloudCode(email); setCodeSent(true); setMessage('Check your email for a sign-in code.');
          }, true) : <>
            <TextInput accessibilityLabel="Email sign-in code" autoCapitalize="none" autoCorrect={false} keyboardType="number-pad" textContentType="oneTimeCode" value={code} editable={!busy} onChangeText={setCode} placeholder="Sign-in code" placeholderTextColor={colors.textSecondary} style={input} maxLength={10} />
            {action('Verify code', async () => { if (!/^\d{6,10}$/.test(code.trim())) throw new Error('Enter the code from your email.'); await verifyCloudCode(email, code); setCode(''); }, true)}
            {action('Use another email or request a new code', async () => { setCodeSent(false); setCode(''); })}
          </>}
        </View> : <View style={panel}>
          <Text style={{ color: colors.text, lineHeight: 23 }}>Signed in as {session.user.email}</Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22, marginTop: 12 }}>Sync {enabled ? 'enabled' : 'paused'}. {lastSync ? `Last synced ${new Date(lastSync).toLocaleString()}.` : 'Not synced yet.'}</Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22, marginTop: 12 }}>Enabling sync uploads reminders, notes, costs, history, and attachments to your account. Changes and deletions sync when the app is open and online, about once a minute. Concurrent edits are kept as conflict copies.</Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22, marginTop: 12 }}>Cloud data is protected by your account and encrypted in transit. It is not end-to-end encrypted. Temporary snoozes and notification IDs stay on this phone.</Text>
          {action(enabled ? 'Sync now' : 'Enable sync and merge reminders', () => sync(!enabled), true)}
          {enabled ? action('Pause sync', async () => { await pauseCloudSync(); setMessage('Sync paused. Local and cloud data are kept.'); }) : null}
          {action('Sign out', async () => { await pauseCloudSync(); await signOutCloud(); setMessage('Signed out. Your reminders remain on this phone.'); })}
          <Text style={{ color: colors.textSecondary, lineHeight: 22, marginTop: 12 }}>This phone stays linked to this account to prevent mixing accounts. Signing out keeps downloaded reminders on this phone; protect access to it.</Text>
        </View>}
        {cloudConfigured ? action('Check sign-in connection', async () => { setMessage(await checkCloudConnection()); }) : null}
        {busy ? <ActivityIndicator color={colors.primary} style={{ marginTop: 18 }} /> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={{ color: colors.text, lineHeight: 23, marginTop: 18 }}>{message}</Text> : null}
        {error || (enabled && backgroundError) ? <Text accessibilityRole="alert" style={{ color: colors.danger, lineHeight: 23, marginTop: 18 }}>{error || backgroundError}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
