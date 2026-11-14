import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import './support/register-typescript.mjs';
const id='11111111-1111-4111-8111-111111111111';
const item={name:'Plan',category:null,dateType:'renewal',targetDate:'2099-01-01',reminderTime:'09:00',repeatType:'monthly',repeatInterval:1,importance:'normal',notes:null,archived:false,costMinor:null,costCurrency:null,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',reminderDays:[],history:[]};
const settings=new Map();let applied, reads, writes, failures, remote, local, base;
globalThis.__syncApi={
  auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})},
  from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{reads++;return {data:remote,error:null}}})})}),
  rpc:async()=>{writes++;if(failures-->0)return {data:null,error:null};return {data:2,error:null}},
};
globalThis.__syncLocal={
 readCloudSetting:key=>settings.get(key), writeCloudSetting:(key,value)=>settings.set(key,value),
 cloudLocalRecords:()=>local, cloudBaseline:()=>base, cloudConflictId:()=>id,
 validateCloudCapacity:()=>{}, applyCloudRecords:records=>{applied=records;settings.set('baseline',JSON.stringify(records));return []},
};
registerHooks({resolve(specifier,context,nextResolve){
 if(specifier==='@/db')return {url:'data:text/javascript,export const db = {select:()=>({from:()=>({all:()=>[]})})}',shortCircuit:true};
 if(specifier==='@/db/schema')return {url:'data:text/javascript,export const items = {id:1}',shortCircuit:true};
 if(specifier==='./cloud-client')return {url:'data:text/javascript,export const cloudClient = async()=>globalThis.__syncApi;export const cloudProject="https://project.supabase.co"',shortCircuit:true};
 if(specifier==='./cloud-local')return {url:'data:text/javascript,export const {readCloudSetting,writeCloudSetting,cloudLocalRecords,cloudBaseline,cloudConflictId,validateCloudCapacity,applyCloudRecords}=globalThis.__syncLocal',shortCircuit:true};
 if(specifier==='./items')return {url:'data:text/javascript,export const rescheduleItem=async()=>({skippedReminderCount:0})',shortCircuit:true};
 if(specifier==='./notification-cleanup')return {url:'data:text/javascript,export const processNotificationCleanup=async()=>{}',shortCircuit:true};
 if(specifier.startsWith('@/'))return nextResolve(new URL('../src/'+specifier.slice(2)+'.ts',import.meta.url).href,context);
 return nextResolve(specifier,context);
}});
const {syncCloud,enableCloudSync,pauseCloudSync}=await import('../src/services/cloud-sync.ts');
test.beforeEach(()=>{settings.clear();settings.set('owner','https://project.supabase.co:owner');settings.set('enabled','true');applied=undefined;reads=0;writes=0;failures=0;remote=null;local={[id]:item};base={};});
test('CAS contention retries a fresh download, then commits the merged snapshot',async()=>{
 failures=1;await syncCloud();assert.equal(reads,2);assert.equal(writes,2);assert.deepEqual(applied,local);
});
test('exhausted CAS retries never apply local state or advance its checkpoint',async()=>{
 failures=3;await assert.rejects(syncCloud(),/Another device/);assert.equal(reads,3);assert.equal(applied,undefined);assert.equal(settings.has('baseline'),false);
});
test('account switching and paused state prevent network sync',async()=>{
 settings.set('owner','different-owner');await assert.rejects(enableCloudSync(),/another account/);await assert.rejects(syncCloud(),/Enable sync/);assert.equal(reads,0);
 settings.set('owner','https://project.supabase.co:owner');await pauseCloudSync();await assert.rejects(syncCloud(),/paused/);assert.equal(reads,0);
});
test('matching cloud snapshot avoids upload, and invalid protocol cannot reach apply',async()=>{
 remote={revision:2,protocol:1,records:local};await syncCloud();assert.equal(writes,0);assert.deepEqual(applied,local);
 applied=undefined;remote.protocol=2;await assert.rejects(syncCloud(),/Update Duewise/);assert.equal(applied,undefined);
});
