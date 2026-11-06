// Sınıf araçlarının bu cihazda sakladığı küçük durumlar (localStorage).
// Gizli sekme ya da kapalı depolamada sessizce varsayılan değere döner.

export const today = () => new Date().toISOString().slice(0, 10);

/** Bugün derste olmayan öğrenciler (rastgele seçici ve grup oluşturucu ortak kullanır) */
export const absentKey = (cls: string) => `secici-yok:${cls}:${today()}`;

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* gizli sekme vb. */ }
}

/** Güvenli rastgele tam sayı [0, n) */
export function randomIndex(n: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

/** Fisher–Yates karıştırma (güvenli rastgele) */
export function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
