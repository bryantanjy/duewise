import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const tokens=new Map([['duewise.cloud.refresh','saved-refresh']]);let listener;let refreshed;let sendError=null;
process.env.EXPO_PUBLIC_SUPABASE_URL='https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
globalThis.__cloudAuthStore={getItemAsync:async key=>tokens.get(key),setItem:(key,value)=>tokens.set(key,value),deleteItemAsync:async key=>tokens.delete(key),WHEN_UNLOCKED_THIS_DEVICE_ONLY:'device'};
globalThis.__cloudAuthSdk={createClient:()=>({auth:{
 onAuthStateChange:fn=>{listener=fn;fn('INITIAL_SESSION',null)},
 refreshSession:async({refresh_token})=>{refreshed=refresh_token;listener('TOKEN_REFRESHED',{refresh_token:'rotated-refresh'});return {error:null}},
 signInWithOtp:async()=>({error:sendError}),
 verifyOtp:async()=>{listener('SIGNED_IN',{refresh_token:'new-refresh'});return {error:null}},
 signOut:async()=>{listener('SIGNED_OUT',null);return {error:null}},
}}),processLock:()=>{}};
registerHooks({resolve(specifier,context,nextResolve){
 if(specifier==='react-native-url-polyfill/auto')return {url:'data:text/javascript,export {}',shortCircuit:true};
 if(specifier==='react-native')return {url:'data:text/javascript,export const Platform={OS:"android"}',shortCircuit:true};
 if(specifier==='expo-secure-store')return {url:'data:text/javascript,export const {getItemAsync,setItem,deleteItemAsync,WHEN_UNLOCKED_THIS_DEVICE_ONLY}=globalThis.__cloudAuthStore',shortCircuit:true};
 if(specifier==='@supabase/supabase-js')return {url:'data:text/javascript,export const {createClient,processLock}=globalThis.__cloudAuthSdk',shortCircuit:true};
 if(specifier.startsWith('@/'))return nextResolve(new URL('../src/'+specifier.slice(2)+'.ts',import.meta.url).href,context);
 return nextResolve(specifier,context);
}});
const auth=await import('../src/services/cloud-client.ts');
test('native auth restores and rotates a small refresh token without initial-session erasure; sign-out clears it',async()=>{
 await auth.cloudClient();assert.equal(refreshed,'saved-refresh');assert.equal(tokens.get('duewise.cloud.refresh'),'rotated-refresh');
 await auth.verifyCloudCode('me@example.com','123456');assert.equal(tokens.get('duewise.cloud.refresh'),'new-refresh');
 await auth.signOutCloud();assert.equal(tokens.has('duewise.cloud.refresh'),false);
});

test('the real send-code service preserves safe actionable delivery errors',async()=>{
 sendError={code:'email_address_not_authorized',status:403};
 await assert.rejects(auth.sendCloudCode('me@example.com'),/configure email delivery/);
 sendError={code:'over_email_send_rate_limit',status:429};
 await assert.rejects(auth.sendCloudCode('me@example.com'),/Wait/);
 sendError=null;
});

test('connection check distinguishes server rejection and device network failure without sending codes',async()=>{
 const original=globalThis.fetch;
 try {
   globalThis.fetch=async(_url,init)=>{assert.equal(init.method,undefined);assert.ok(init.headers.apikey);return {ok:true,status:200,json:async()=>({external:{email:true}})}};
   assert.match(await auth.checkCloudConnection(),/reachable.*200.*enabled/);
   globalThis.fetch=async()=>({ok:false,status:401});
   await assert.rejects(auth.checkCloudConnection(),/HTTP 401/);
   globalThis.fetch=async()=>{throw new TypeError('Network request failed')};
   await assert.rejects(auth.checkCloudConnection(),/This phone could not reach/);
 } finally {globalThis.fetch=original;}
});
