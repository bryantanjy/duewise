import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudFetch } from '../src/utils/cloud-fetch.ts';
const hanging=async(_input,{signal})=>new Promise((resolve,reject)=>{
 if(signal.aborted)reject(new Error('aborted'));
 else signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});
});
test('cloud requests have bounded native-compatible timeouts and respect caller cancellation',async()=>{
 await assert.rejects(cloudFetch('https://example.com',undefined,10,hanging),/aborted/);
 const caller=new AbortController();caller.abort();
 await assert.rejects(cloudFetch('https://example.com',{signal:caller.signal},100,hanging),/aborted/);
 const response=await cloudFetch('https://example.com',undefined,100,async()=>({ok:true}));assert.equal(response.ok,true);
});
