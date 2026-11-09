// Supabase Storage'daki bütün kovaları (bucket) yerel klasöre indirir.
// Kullanım: SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node storage-backup.mjs <hedef-klasör>
// service_role anahtarı RLS'i aşar: yalnızca sunucuda, ortam değişkeninden okunur.
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const out = process.argv[2];
if (!url || !key || !out) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_KEY ve hedef klasör gerekli.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function listAll(bucket, prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) files.push(...(await listAll(bucket, full))); // klasör
      else files.push(full);
    }
    if (data.length < 1000) break;
  }
  return files;
}

const { data: buckets, error } = await supabase.storage.listBuckets();
if (error) throw new Error(error.message);

let total = 0;
let failed = 0;
for (const b of buckets) {
  const files = await listAll(b.id);
  for (const f of files) {
    const { data, error: dlErr } = await supabase.storage.from(b.id).download(f);
    if (dlErr || !data) { failed++; console.error(`indirilemedi: ${b.id}/${f}`); continue; }
    const target = path.join(out, b.id, f);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await data.arrayBuffer()));
    total++;
  }
  console.log(`${b.id}: ${files.length} dosya`);
}
console.log(`toplam ${total} dosya indirildi${failed ? `, ${failed} hata` : ''}`);
if (failed) process.exit(2);
