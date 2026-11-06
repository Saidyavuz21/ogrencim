// ========================================================
// SINIF AKVARYUMU KURALLARI
// - 5 puanın altı (eksiler dahil) yumurta; 1–4 puanda çatlaklar artar
// - 5 puanda yumurtadan çıkar; puan 5'in altına düşerse yeniden yumurta olur
// - Her 5 puanda balığın şekli değişir (16 şekil: 5–9, 10–14, … 80+)
// - Her puanda boy belirgin biçimde artar; büyüme yavaşlayarak bir üst sınıra yaklaşır
// - Puanı yaklaşık iki katı olan balık yanındaki küçüğe ağzını açıp saldırır, küçük kaçar (yemez)
// - 50 puanda parıltı, 75 puanda taç
// ========================================================

export interface AquariumInput {
  id: string;
  name: string;
  points: number;
}

export const HATCH_POINTS = 5;
export const FORM_STEP = 5;
export const FORM_COUNT = 16;
export const SPARKLE_POINTS = 50;
export const CROWN_POINTS = 75;

/** Balık mı? Yalnızca şu anki puana bakılır: 5 ve üzeri balık, altı yumurta */
export const isFish = (s: Pick<AquariumInput, 'points'>) => s.points >= HATCH_POINTS;

/** Yumurtadaki çatlak sayısı: 0 puan ve eksi → 0, 1–4 puan → 1–4 */
export const eggCracks = (points: number) => Math.max(0, Math.min(HATCH_POINTS - 1, points));

/** Balık şekli 1–16 (5–9 puan → 1, 10–14 → 2, … 80+ → 16) */
export const fishForm = (points: number) =>
  Math.max(1, Math.min(FORM_COUNT, Math.floor(Math.max(points, HATCH_POINTS) / FORM_STEP)));

const MIN_SIZE = 34;
const HATCH_SIZE = 38;
const MAX_SIZE = 250;
/** Büyüme hızı: yüksek puanlarda da boy farkı görünsün (5 puan ≈ 38, 20 ≈ 85, 40 ≈ 131, 60 ≈ 165, 100 ≈ 207) */
const GROWTH = 60;

/**
 * Balığın genişliği (1000 birim genişlikteki akvaryuma göre).
 * Her puanda belirgin biçimde büyür; ekranı kaplamasın diye büyüme yüksek puanlarda yavaşlar.
 */
export function fishSize(points: number): number {
  if (points < HATCH_POINTS) return MIN_SIZE + (HATCH_SIZE - MIN_SIZE) * Math.max(0, points) / HATCH_POINTS;
  return HATCH_SIZE + (MAX_SIZE - HATCH_SIZE) * (1 - Math.exp(-(points - HATCH_POINTS) / GROWTH));
}

/** "Yeme" oyunu: büyük balığın puanı küçüğün yaklaşık iki katıysa ona saldırır (küçük kaçar) */
export const CHASE_RATIO = 1.8;

/**
 * "Balıklar birbirini yutsun" modu (yalnızca ekranda; gerçek puanlar değişmez):
 * - Balık, kendinden en az 1 şekil (kademe) küçük balığı yakalarsa yutar
 * - İkisi de son şekildeyse (Ejder) puanı fazla olan diğerini yutar
 * - Yutan, yutulan kaç puanlı olursa olsun geçici olarak 5 puan alır (bir şekil büyür); böylece
 *   şekiller atlanmadan sırayla görünür ve yuta yuta daha büyükleri de yutabilir
 * - Yaklaşık 1 dakika sonra yutulan geri gelir, yutan da aldığı geçici puanı kaybeder
 */
export const SWALLOW_TIER_GAP = 1;
export const SWALLOW_MS = 60_000;
/** Her yutuşta kazanılan geçici puan (bir şekil kademesi) */
export const SWALLOW_POINTS = FORM_STEP;
export function canSwallow(bigPoints: number, smallPoints: number) {
  if (!isFish({ points: bigPoints }) || !isFish({ points: smallPoints })) return false;
  const big = fishForm(bigPoints);
  const small = fishForm(smallPoints);
  if (big === FORM_COUNT && small === FORM_COUNT) return bigPoints > smallPoints;
  return big - small >= SWALLOW_TIER_GAP;
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
