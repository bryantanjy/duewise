import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import './support/register-typescript.mjs';
globalThis.__settingsCalls = [];
globalThis.__settingsPlatform = 'android';
globalThis.__channelIntentFails = false;
registerHooks({ resolve(specifier, context, nextResolve) {
  const stubs = {
    'expo-constants': "export default {expoConfig:{android:{package:'com.bryan.duewise'}}};",
    'react-native': `export const Platform={get OS(){return globalThis.__settingsPlatform}};
      export const Linking={sendIntent:async(action,extras)=>{globalThis.__settingsCalls.push({action,extras});if(globalThis.__channelIntentFails)throw Error('Unavailable')},
        openSettings:async()=>{globalThis.__settingsCalls.push('app-settings')}};`,
  };
  if (specifier in stubs) return { url:'data:text/javascript,'+encodeURIComponent(stubs[specifier]),shortCircuit:true };
  return nextResolve(specifier,context);
} });
const { openNotificationSettings } = await import('../src/services/notification-settings.ts');
test.beforeEach(() => { globalThis.__settingsCalls=[];globalThis.__settingsPlatform='android';globalThis.__channelIntentFails=false; });
test('Android recovery opens only the Duewise reminder channel settings',async()=>{
  await openNotificationSettings();
  assert.deepEqual(globalThis.__settingsCalls,[{action:'android.settings.CHANNEL_NOTIFICATION_SETTINGS',extras:[
    {key:'android.provider.extra.APP_PACKAGE',value:'com.bryan.duewise'},
    {key:'android.provider.extra.CHANNEL_ID',value:'duewise-reminders'},
  ]}]);
});
test('vendor-specific intent failures fall back to ordinary app settings',async()=>{
  globalThis.__channelIntentFails=true;await openNotificationSettings();
  assert.equal(globalThis.__settingsCalls.at(-1),'app-settings');
});
test('iOS recovery uses app settings without an Android intent',async()=>{
  globalThis.__settingsPlatform='ios';await openNotificationSettings();
  assert.deepEqual(globalThis.__settingsCalls,['app-settings']);
});
