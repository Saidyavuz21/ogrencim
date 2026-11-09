// Süresi dolan ödev ekleri ve öğrenci teslim dosyaları (30 gün kuralı) depodan silinir.
// Her gece pg_cron çağırır (supabase/migrations/20261112090000_storage_limits_file_expiry.sql).
// Çağrı, Vault'taki gizli anahtarla doğrulanır; JWT doğrulaması kapalıdır (verify_jwt = false).
// Ödev, not, puan ve "teslim etti" bilgisi kalır; yalnızca dosyalar silinir.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

type Candidate = { kind: 'homework' | 'submission'; homework_id: string; student_id: string | null; paths: string[] | null };

const BUCKET: Record<Candidate['kind'], string> = { homework: 'homework-files', submission: 'homework-submissions' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const check = await sb.rpc('check_purge_secret', { p_secret: req.headers.get('x-purge-secret') || '' });
  if (check.error || check.data !== true) return json({ error: 'forbidden' }, 403);

  let purged = 0;
  let files = 0;
  const failures: string[] = [];
  // En fazla 10 tur × 100 kayıt; kalan olursa ertesi gece devam eder
  for (let round = 0; round < 10; round++) {
    const { data, error } = await sb.rpc('purge_file_candidates', { p_limit: 100 });
    if (error) return json({ error: error.message, purged, files }, 500);
    const list = (data as Candidate[] | null) || [];
    if (!list.length) break;
    let roundFailed = 0;
    for (const c of list) {
      const paths = (c.paths || []).filter(Boolean);
      if (paths.length) {
        const rm = await sb.storage.from(BUCKET[c.kind]).remove(paths);
        if (rm.error) { roundFailed++; failures.push(`${c.kind}:${c.homework_id}: ${rm.error.message}`); continue; }
        files += paths.length;
      }
      const mark = await sb.rpc('mark_files_purged', { p_kind: c.kind, p_homework: c.homework_id, p_student: c.student_id });
      if (mark.error) { roundFailed++; failures.push(`${c.kind}:${c.homework_id}: ${mark.error.message}`); continue; }
      purged++;
    }
    // Hep aynı kayıtlar başarısız oluyorsa döngüde kalma
    if (roundFailed === list.length) break;
  }
  return json({ purged, files, failures: failures.slice(0, 20) }, failures.length ? 207 : 200);
});
