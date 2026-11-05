// ========================================================
// SINIF AKVARYUMU KURALLARI
// - 5 puanın altı (eksiler dahil) yumurta; 1–4 puanda çatlaklar artar
// - 5 puanda yumurtadan çıkar; bir kez çıkan balık bir daha yumurta olmaz, kaybolmaz
// - Her 5 puanda balığın şekli değişir (8 şekil: 5–9, 10–14, … 40+)
// - Her puanda boy biraz artar; büyüme yavaşlayarak bir üst sınıra yaklaşır
// - 50 puanda parıltı, 75 puanda taç
// ========================================================

export interface AquariumInput {
  id: string;
  name: string;
  points: number;
  hatched: boolean;
}

export const HATCH_POINTS = 5;
export const FORM_STEP = 5;
export const FORM_COUNT = 8;
export const SPARKLE_POINTS = 50;
export const CROWN_POINTS = 75;

export const isFish = (s: Pick<AquariumInput, 'points' | 'hatched'>) => s.hatched || s.points >= HATCH_POINTS;

/** Yumurtadaki çatlak sayısı: 0 puan ve eksi → 0, 1–4 puan → 1–4 */
export const eggCracks = (points: number) => Math.max(0, Math.min(HATCH_POINTS - 1, points));

/** Balık şekli 1–8 (yumurtadan çıkıp puanı 5'in altına düşen balık en küçük şekilde kalır) */
export const fishForm = (points: number) =>
  Math.max(1, Math.min(FORM_COUNT, Math.floor(Math.max(points, HATCH_POINTS) / FORM_STEP)));

const MIN_SIZE = 44;
const HATCH_SIZE = 50;
const MAX_SIZE = 132;

/**
 * Balığın genişliği (1000 birim genişlikteki akvaryuma göre).
 * Her puanda büyür ama ekranı kaplamasın diye büyüme yavaşlar.
 * Eksiye düşen (önceden çıkmış) balık en küçük boyda kalır, kaybolmaz.
 */
export function fishSize(points: number): number {
  if (points < HATCH_POINTS) return MIN_SIZE + (HATCH_SIZE - MIN_SIZE) * Math.max(0, points) / HATCH_POINTS;
  return HATCH_SIZE + (MAX_SIZE - HATCH_SIZE) * (1 - Math.exp(-(points - HATCH_POINTS) / 32));
}

/** Kimliğe göre sabit sözde rastgele sayı (her açılışta aynı balık aynı yerde yüzer) */
export function seeded(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Akvaryumda görünecek kısa ad: ilk isim; aynı ilk isimden birden fazla varsa soyadının baş harfi eklenir */
export function shortNames(students: Pick<AquariumInput, 'id' | 'name'>[]): Record<string, string> {
  const parts = students.map((s) => ({ id: s.id, words: s.name.trim().split(/\s+/).filter(Boolean) }));
  const firstCount = new Map<string, number>();
  for (const p of parts) {
    const first = (p.words[0] || '').toLocaleUpperCase('tr-TR');
    firstCount.set(first, (firstCount.get(first) || 0) + 1);
  }
  const out: Record<string, string> = {};
  for (const p of parts) {
    const first = p.words[0] || '?';
    const last = p.words.length > 1 ? p.words[p.words.length - 1] : '';
    const dup = (firstCount.get(first.toLocaleUpperCase('tr-TR')) || 0) > 1;
    out[p.id] = dup && last ? `${first} ${last[0]}.` : first;
  }
  return out;
}
