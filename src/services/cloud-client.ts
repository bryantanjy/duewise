import 'react-native-url-polyfill/auto';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { cloudCodeError } from '@/utils/cloud-auth-error';
import { cloudFetch } from '@/utils/cloud-fetch';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const cloudProject = url ?? '';
export const cloudConfigured = Boolean(url?.startsWith('https://') && key?.startsWith('sb_publishable_') && Platform.OS !== 'web');
// Persist only the refresh token (small enough for platform keychain limits).
// The rest of the session stays in memory and is renewed on cold start.
const TOKEN_KEY = 'duewise.cloud.refresh';
let client: SupabaseClient | undefined;
let boot: Promise<SupabaseClient> | undefined;
let credentialError = false;
export async function cloudClient() {
  if (!cloudConfigured) throw new Error('Cloud sync is not configured in this build.');
  if (!boot) boot = (async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false, lock: processLock }, global: { fetch: cloudFetch } });
    client.auth.onAuthStateChange((_event, session) => {
      // Synchronous secure writes avoid SDK calls or promises inside the auth callback.
      try {
        if (session) SecureStore.setItem(TOKEN_KEY, session.refresh_token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
        else if (_event === 'SIGNED_OUT') SecureStore.setItem(TOKEN_KEY, '');
        credentialError = false;
      } catch { credentialError = true; }
    });
    if (token) {
      const { error } = await client.auth.refreshSession({ refresh_token: token });
      if (error) {
        // Keep the token on transient network failures so offline use doesn't sign users out.
        if (error.status && error.status >= 400 && error.status < 500) await SecureStore.deleteItemAsync(TOKEN_KEY);
        else { client.auth.stopAutoRefresh(); throw new Error('Unable to restore sign-in while offline. Your reminders remain on this phone.'); }
      }
    }
    return client;
  })().catch(error => { boot = undefined; throw error; });
  return boot;
}
export async function sendCloudCode(email: string) {
  const { error } = await (await cloudClient()).auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  if (error) throw new Error(cloudCodeError(error));
}
export async function verifyCloudCode(email: string, token: string) {
  const { error } = await (await cloudClient()).auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' });
  if (error) throw new Error('This sign-in code is invalid or expired. Request a new code.');
  if (credentialError) {
    await (await cloudClient()).auth.signOut({ scope: 'local' });
    throw new Error('Unable to save sign-in securely. Check device storage and try again.');
  }
}
export async function signOutCloud() {
  const api = await cloudClient();
  const { error } = await api.auth.signOut({ scope: 'local' });
  if (error) throw new Error('Unable to sign out. Please try again.');
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function checkCloudConnection() {
  if (!cloudConfigured) throw new Error('Cloud sync is not configured in this build.');
  let response: Response;
  try {
    response = await cloudFetch(`${url!.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: key! } }, 15000);
  } catch {
    throw new Error('This phone could not reach the sign-in server. Try mobile data, or check VPN and Private DNS settings.');
  }
  if (!response.ok) throw new Error(`The sign-in server responded with HTTP ${response.status}. ${response.status === 401 || response.status === 403 ? 'The build configuration was rejected.' : 'The server is unavailable or misconfigured.'}`);
  const settings = await response.json() as { external?: { email?: boolean } };
  return `Sign-in server reachable (HTTP ${response.status}). Email sign-in is ${settings.external?.email ? 'enabled' : 'disabled'}. This checks connectivity only; sending a code also requires working email delivery.`;
}
