import { useEffect } from 'react';
import { AppState } from 'react-native';
import { cloudConfigured } from '@/services/cloud-client';
import { readCloudSetting, writeCloudSetting } from '@/services/cloud-local';
import { syncCloud } from '@/services/cloud-sync';
export default function CloudSync() {
  useEffect(() => {
    if (!cloudConfigured) return;
    let active = true;
    const sync = () => {
      if (!active || AppState.currentState !== 'active' || readCloudSetting('enabled') !== 'true') return;
      void syncCloud().catch(error => { if (active) writeCloudSetting('syncError', error instanceof Error ? error.message : 'Cloud sync failed.'); });
    };
    sync();
    const timer = setInterval(sync, 60000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, []);
  return null;
}
