// Telefon bildirimi (Web Push) gönderici.
// Çağıran: veritabanı (yeni bekleyen bildirim olunca pg_net, ayrıca her dakika pg_cron) —
// supabase/migrations/20261118090000_push.sql. Çağrı Vault'taki gizli anahtarla (x-push-secret) doğrulanır;
// JWT doğrulaması kapalıdır (VERIFY_JWT=false).
// Hangi bildirimin, kime, hangi metinle gideceğine veritabanı karar verir (push_claim);
// bu fonksiyon yalnızca şifreleyip gönderir ve sonucu bildirir (push_report).
// Push metninde içerik yoktur ("Yeni mesajın var" gibi); KVKK gereği kilit ekranına kişisel bilgi düşmez.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

type Sub = { id: number; endpoint: string; p256dh: string; auth: string };
type Item = { subs: Sub[]; payload: { title: string; body: string; url: string; tag: string; badge: number } };
type Outcome = { id: number; ok: boolean; gone: boolean };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const CONCURRENCY = 20;
const MAX_ROUNDS = 5;

let vapidReady = false;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const secret = req.headers.get('x-push-secret') || '';
  if (!secret) return json({ error: 'forbidden' }, 403);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!vapidReady) {
    const keys = await sb.rpc('push_vapid_keys', { p_secret: secret });
    if (keys.error || !keys.data?.public || !keys.data?.private) return json({ error: 'forbidden' }, 403);
    webpush.setVapidDetails('https://tofutr.com', keys.data.public, keys.data.private);
    vapidReady = true;
  }

  let sent = 0;
  let failed = 0;
  let removed = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const claim = await sb.rpc('push_claim', { p_secret: secret, p_limit: 200 });
    if (claim.error) return json({ error: claim.error.message, sent, failed }, claim.error.message === 'forbidden' ? 403 : 500);
    const items = (claim.data as Item[] | null) || [];
    if (!items.length) break;

    const jobs: { sub: Sub; payload: string }[] = [];
    for (const it of items) {
      const payload = JSON.stringify(it.payload);
      for (const sub of it.subs || []) jobs.push({ sub, payload });
    }

    const results: Outcome[] = [];
    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      const chunk = jobs.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(
        chunk.map(({ sub, payload }) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 12 * 3600, urgency: 'normal', timeout: 10000 },
          ),
        ),
      );
      settled.forEach((r, k) => {
        const id = chunk[k].sub.id;
        if (r.status === 'fulfilled') {
          results.push({ id, ok: true, gone: false });
          sent++;
        } else {
          const code = (r.reason as { statusCode?: number })?.statusCode;
          const gone = code === 404 || code === 410;
          results.push({ id, ok: false, gone });
          if (gone) removed++;
          else failed++;
        }
      });
    }
    if (results.length) await sb.rpc('push_report', { p_secret: secret, p_results: results });
  }
  return json({ sent, failed, removed });
});
