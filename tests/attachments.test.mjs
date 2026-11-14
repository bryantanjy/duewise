import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import './support/register-typescript.mjs';
import { drizzle } from '../node_modules/drizzle-orm/expo-sqlite/driver.js';
import { createSqliteItemRepository } from './support/sqlite-item-repository.mjs';
import { expoSqliteNodeAdapter } from './support/expo-sqlite-node-adapter.mjs';
const sqlite = createSqliteItemRepository();
globalThis.__attachmentDb = drizzle(expoSqliteNodeAdapter(sqlite.database));
globalThis.__attachmentPick = async () => ({ canceled: true });
globalThis.__attachmentWrites = [];
globalThis.__attachmentShares = [];
registerHooks({ resolve(specifier, context, nextResolve) {
  const stubs = {
    expo: 'export const requireOptionalNativeModule=()=>globalThis.__attachmentNative?{}:null;',
    '@/db': 'export const db=globalThis.__attachmentDb;',
    'react-native': "export const Platform={OS:'android'};",
    'expo-file-system': `export const Paths={cache:'file:///cache/'};
      export class File { constructor(...paths){this.uri=paths.join('/');this.exists=true;}
        static pickFileAsync=(...args)=>globalThis.__attachmentPick(...args);
        create(){} write(data,options){globalThis.__attachmentWrites.push({data,options});}
        delete(){globalThis.__attachmentWrites.push('delete');}
      }`,
    'expo-sharing': `export const isAvailableAsync=async()=>true;
      export const shareAsync=async(uri,options)=>globalThis.__attachmentShares.push({uri,options});`,
  };
  if (specifier in stubs) return { url:'data:text/javascript,'+encodeURIComponent(stubs[specifier]),shortCircuit:true };
  if (specifier.startsWith('@/')) return nextResolve(new URL('../src/'+specifier.slice(2)+'.ts',import.meta.url).href,context);
  return nextResolve(specifier,context);
} });
const service = await import('../src/services/attachments.ts');
const { attachmentSchema, attachmentName, attachmentMimeType, MAX_ATTACHMENT_BYTES } = await import('../src/utils/attachments.ts');
const document = { name:'receipt.pdf', mimeType:'application/pdf',size:5,base64:'JVBERi0=' };
let itemId;
test.beforeEach(async () => {
  sqlite.database.exec('DELETE FROM items;');
  itemId = await sqlite.repository.createItemRecord({ categoryId:1,name:'Warranty',dateType:'expiry',targetDate:'2028-01-01',importance:'normal',repeatType:'none',notes:'' });
  globalThis.__attachmentNative=true;
  globalThis.__attachmentPick=async()=>({canceled:true}); globalThis.__attachmentWrites=[];globalThis.__attachmentShares=[];
});
test.after(()=>sqlite.close());

test('file validation rejects broken payloads, mismatched byte counts and unsupported types',()=>{
  assert.equal(attachmentSchema.safeParse(document).success,true);
  for(const bad of [{size:6},{base64:'not base64'},{name:'../file.pdf'},{mimeType:'application/javascript'},{size:MAX_ATTACHMENT_BYTES+1}]) {
    assert.equal(attachmentSchema.safeParse({...document,...bad}).success,false);
  }
  assert.equal(attachmentName('../file.pdf'),'.._file.pdf');
  assert.equal(attachmentMimeType('receipt.PDF','application/octet-stream'),'application/pdf');
  assert.throws(()=>attachmentMimeType('file.exe','application/x-executable'),/Choose a PDF/);
});

test('maximum-size documents validate without overflowing the JavaScript regex stack',()=>{
  const base64=Buffer.alloc(MAX_ATTACHMENT_BYTES).toString('base64');
  assert.equal(attachmentSchema.safeParse({...document,size:MAX_ATTACHMENT_BYTES,base64}).success,true);
  assert.equal(attachmentSchema.safeParse({...document,size:5,base64:'AAAA=AAA'}).success,false);
});

test('attachments persist across archive and are removed atomically with the parent reminder',()=>{
  service.storeAttachment(itemId,document);
  sqlite.database.prepare('UPDATE items SET archived=1 WHERE id=?').run(itemId);
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM attachments').get().total,1);
  sqlite.database.prepare('DELETE FROM items WHERE id=?').run(itemId);
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM attachments').get().total,0);
  assert.throws(()=>service.storeAttachment(itemId,document),/no longer exists/);
});

test('per-reminder attachment limit is enforced inside the transaction',()=>{
  for(let i=0;i<5;i++)service.storeAttachment(itemId,document);
  assert.throws(()=>service.storeAttachment(itemId,document),/up to 5/);
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM attachments').get().total,5);
});

test('cancelled and oversized picks never read file contents or insert records',async()=>{
  assert.equal(await service.addAttachment(itemId),undefined);
  let reads=0;
  globalThis.__attachmentPick=async()=>({canceled:false,result:{name:'large.pdf',type:'application/pdf',size:MAX_ATTACHMENT_BYTES+1,base64:async()=>{reads++;return '';}}});
  await assert.rejects(service.addAttachment(itemId),/5 MB/);
  assert.equal(reads,0);
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM attachments').get().total,0);
});

test('a selected document is copied into the database and shared only through its owning reminder',async()=>{
  globalThis.__attachmentPick=async()=>({canceled:false,result:{name:document.name,type:document.mimeType,size:document.size,base64:async()=>document.base64}});
  const row=await service.addAttachment(itemId);
  await assert.rejects(service.shareAttachment(itemId+1,row.id),/no longer exists/);
  await service.shareAttachment(itemId,row.id);
  assert.equal(globalThis.__attachmentWrites[0].data,document.base64);
  assert.equal(globalThis.__attachmentWrites[0].options.encoding,'base64');
  assert.equal(globalThis.__attachmentShares[0].options.mimeType,'application/pdf');
  await service.removeAttachment(itemId,row.id);
  assert.equal(sqlite.database.prepare('SELECT count(*) AS total FROM attachments').get().total,0);
});

test('older app binaries explain the missing sharing module before creating a cached document',async()=>{
  const row=service.storeAttachment(itemId,document);
  globalThis.__attachmentNative=false;
  await assert.rejects(service.shareAttachment(itemId,row.id),/new Duewise build/);
  assert.equal(globalThis.__attachmentWrites.length,0);
});
