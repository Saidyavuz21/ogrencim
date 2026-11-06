import React from 'react';

// Tüm balıklar sağa bakacak şekilde çizilir (viewBox 0 0 120 80); sola yüzerken CSS ile çevrilir.
// Çizimler bu proje için özgün; renkler sınıf akvaryumunda öğrenciye göre hafifçe kaydırılır.

const OUTLINE = '#173a4a';

function Eye({ cx, cy, r = 5 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={OUTLINE} strokeWidth={1.4} />
      <circle cx={cx + r * 0.25} cy={cy} r={r * 0.55} fill={OUTLINE} />
      <circle cx={cx + r * 0.45} cy={cy - r * 0.3} r={r * 0.2} fill="#fff" />
    </g>
  );
}

function Shine({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" opacity={0.35} />;
}

/** 1 · Yavru (5–9): yuvarlak, iri gözlü */
function Fry() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M36 40 L18 28 Q22 40 18 52 Z" fill="#ffc98a" />
      <ellipse cx={62} cy={40} rx={28} ry={24} fill="#ffb067" />
      <path d="M56 18 Q62 10 70 17" fill="#ffc98a" />
      <Shine cx={58} cy={30} rx={11} ry={6} />
      <Eye cx={76} cy={36} r={7.5} />
      <path d="M86 47 Q83 50 80 48" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** 2 · Turuncu (10–14): çatallı kuyruk, sırt yüzgeci */
function Orange() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M30 40 L8 22 Q16 40 8 58 Z" fill="#ff9a4d" />
      <path d="M48 22 Q60 8 76 20 Z" fill="#ff9a4d" />
      <path d="M54 58 Q62 68 70 58 Z" fill="#ff9a4d" />
      <ellipse cx={62} cy={40} rx={36} ry={21} fill="#ff7f2a" />
      <path d="M78 24 Q72 40 78 56" fill="none" opacity={0.5} />
      <Shine cx={58} cy={31} rx={15} ry={5} />
      <Eye cx={84} cy={36} r={5.5} />
      <path d="M96 46 Q93 48 90 46" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** 3 · Çizgili (15–19): beyaz bantlı */
function Striped() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M28 40 L8 24 Q14 40 8 56 Z" fill="#ff8a1f" />
      <path d="M44 22 Q58 6 78 20 Z" fill="#ff8a1f" />
      <ellipse cx={62} cy={40} rx={38} ry={22} fill="#ff6f0f" />
      <path d="M44 20 Q38 40 44 60 L54 61 Q48 40 54 19 Z" fill="#fff" />
      <path d="M70 19 Q64 40 70 61 L80 59 Q75 40 80 21 Z" fill="#fff" />
      <Shine cx={60} cy={30} rx={9} ry={4} />
      <Eye cx={88} cy={36} r={5.5} />
      <path d="M98 46 Q95 48 92 46" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** 4 · Mavi (20–24): uzun gövde, sarı kuyruk */
function Blue() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M26 40 L4 20 Q14 40 4 60 Z" fill="#ffd23f" />
      <path d="M40 24 Q62 10 90 24 Z" fill="#2f6fe8" />
      <path d="M44 56 Q64 68 86 56 Z" fill="#2f6fe8" />
      <path d="M22 40 Q40 18 72 18 Q104 20 112 40 Q104 60 72 62 Q40 62 22 40 Z" fill="#3d82ff" />
      <path d="M40 34 Q60 26 82 34 Q70 46 48 44 Z" fill="#163f9e" opacity={0.85} />
      <Shine cx={70} cy={26} rx={14} ry={3.5} />
      <Eye cx={96} cy={35} r={5} />
      <path d="M108 45 Q105 47 102 45" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** 5 · Melek (25–29): yüksek gövde, uzun yüzgeçler, dikey çizgiler */
function Angel() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M38 40 L20 30 Q24 40 20 50 Z" fill="#f2e3a3" />
      <path d="M52 22 Q56 0 68 -2 Q66 14 74 20 Z" fill="#f2e3a3" />
      <path d="M52 58 Q56 80 68 82 Q66 66 74 60 Z" fill="#f2e3a3" />
      <path d="M36 40 Q56 8 84 24 Q100 32 102 40 Q100 48 84 56 Q56 72 36 40 Z" fill="#fff2b8" />
      <path d="M54 16 Q50 40 54 64" fill="none" strokeWidth={4} />
      <path d="M72 18 Q68 40 72 62" fill="none" strokeWidth={4} />
      <Shine cx={64} cy={30} rx={8} ry={4} />
      <Eye cx={88} cy={37} r={5} />
      <path d="M100 44 Q97 46 94 44" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** 6 · Benekli (30–34): yuvarlak, beyaz benekli */
function Spotted() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M30 40 L12 28 Q18 40 12 52 Z" fill="#21b3a6" />
      <path d="M52 16 Q60 6 72 14 Z" fill="#21b3a6" />
      <path d="M56 64 Q62 74 70 64 Z" fill="#21b3a6" />
      <ellipse cx={64} cy={40} rx={34} ry={26} fill="#2ec4b6" />
      {[[50, 30, 4], [62, 52, 3.5], [74, 26, 3], [46, 46, 3], [80, 52, 2.5], [58, 38, 2.5]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fff" stroke="none" />
      ))}
      <Shine cx={60} cy={22} rx={10} ry={3.5} />
      <Eye cx={86} cy={36} r={6} />
      <path d="M96 48 Q93 51 89 48" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** 7 · Pelerin (35–39): mor, uzun dalgalı kuyruk ve yüzgeçler */
function Veil() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M44 40 Q20 8 2 14 Q14 30 6 40 Q14 50 2 66 Q20 72 44 40 Z" fill="#c45cf0" />
      <path d="M50 26 Q56 4 84 22 Z" fill="#b14ce0" />
      <path d="M50 54 Q50 78 80 58 Z" fill="#b14ce0" />
      <ellipse cx={70} cy={40} rx={30} ry={17} fill="#8e3fe0" />
      <path d="M14 22 Q26 32 30 40 M14 58 Q26 48 30 40" fill="none" opacity={0.5} />
      <Shine cx={68} cy={32} rx={12} ry={3.5} />
      <Eye cx={90} cy={37} r={5} />
      <path d="M100 45 Q97 47 94 45" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** 8 · Altın (40–44): parlak altın gövde, akan yüzgeçler */
function Golden() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M34 40 Q14 14 0 18 Q10 30 6 40 Q10 50 0 62 Q14 66 34 40 Z" fill="#ffcf3a" />
      <path d="M46 22 Q58 0 86 20 Z" fill="#ffcf3a" />
      <path d="M52 58 Q58 76 80 60 Z" fill="#ffcf3a" />
      <ellipse cx={66} cy={40} rx={38} ry={23} fill="#ffb800" />
      <path d="M60 22 Q54 40 60 58 M76 20 Q70 40 76 60" fill="none" stroke="#e08a00" strokeWidth={2} />
      <ellipse cx={62} cy={29} rx={18} ry={5} fill="#fff" opacity={0.55} />
      <circle cx={46} cy={34} r={2} fill="#fff" stroke="none" opacity={0.9} />
      <Eye cx={90} cy={36} r={5.5} />
      <path d="M102 46 Q99 48 96 46" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** 9 · Balon (45–49): yuvarlak, dikenli kirpi balığı */
const PUFFER_SPIKES = Array.from({ length: 16 }, (_, k) => {
  const a = (k / 16) * Math.PI * 2;
  const p = (r: number, da: number) => `${(64 + Math.cos(a + da) * r).toFixed(1)} ${(40 + Math.sin(a + da) * r).toFixed(1)}`;
  return `M${p(29, -0.1)} L${p(37, 0)} L${p(29, 0.1)} Z`;
}).join(' ');

function Puffer() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d={PUFFER_SPIKES} fill="#e9d36a" />
      <path d="M32 40 L14 30 Q18 40 14 50 Z" fill="#9fd36b" />
      <circle cx={64} cy={40} r={30} fill="#b8e07a" />
      <ellipse cx={66} cy={53} rx={20} ry={11} fill="#f4f7d8" stroke="none" />
      {[[50, 28, 3], [60, 22, 2.5], [46, 42, 2.5], [72, 24, 2], [54, 34, 2]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#5f9a3a" stroke="none" />
      ))}
      <Shine cx={58} cy={20} rx={10} ry={3.5} />
      <Eye cx={80} cy={34} r={7} />
      <circle cx={92} cy={47} r={2.6} fill="#5c1626" strokeWidth={1.4} />
    </g>
  );
}

/** 10 · Kılıç (50–54): uzun gövde, yelken gibi sırt yüzgeci, kılıç burun */
function Sword() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M22 40 L4 18 Q12 40 4 62 Z" fill="#1f4f8f" />
      <path d="M38 28 Q46 -2 78 4 Q70 16 76 28 Z" fill="#2b6cb0" />
      <path d="M100 37 L123 39.5 L100 42 Z" fill="#a9c4e0" />
      <path d="M18 40 Q36 22 70 24 Q94 26 104 38 Q94 54 70 56 Q36 58 18 40 Z" fill="#3a7bd5" />
      <path d="M30 45 Q60 56 98 43 Q88 54 66 55 Q42 55 30 45 Z" fill="#d6e7f8" stroke="none" />
      <path d="M66 46 L56 62 L76 50 Z" fill="#2b6cb0" />
      <Shine cx={64} cy={30} rx={14} ry={3} />
      <Eye cx={92} cy={36} r={4.8} />
    </g>
  );
}

/** 11 · Fener (55–59): iri başlı derin deniz balığı, alnında parlayan fener */
function Lantern() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M30 42 L10 28 Q16 42 10 56 Z" fill="#6b4a8c" />
      <path d="M44 62 Q50 76 62 66 Z" fill="#6b4a8c" />
      <path d="M26 42 Q34 14 70 12 Q104 14 108 42 Q104 68 70 70 Q34 68 26 42 Z" fill="#7d5aa6" />
      {[[48, 30, 3], [56, 50, 2.5], [40, 44, 2], [64, 24, 2]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#a98bd4" stroke="none" />
      ))}
      <path d="M78 14 Q86 -2 100 2" fill="none" strokeWidth={2.4} />
      <circle cx={101} cy={4} r={8} fill="#fff59d" opacity={0.45} stroke="none" />
      <circle cx={101} cy={4} r={3.8} fill="#ffeb3b" strokeWidth={1.4} />
      <path d="M84 53 Q97 56 108 46" fill="none" />
      <path d="M88 54 L90 48 L92 54 Z M94 54 L96 48 L98 53 Z M100 52 L102 47 L104 50 Z" fill="#fff" strokeWidth={1} />
      <Shine cx={62} cy={22} rx={12} ry={3.5} />
      <Eye cx={84} cy={31} r={6} />
    </g>
  );
}

/** 12 · Aslan (60–64): çizgili gövde, yelpaze gibi dikenli yüzgeçler */
function Lion() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M34 42 L14 30 Q20 42 14 54 Z" fill="#f6d7c3" />
      <path d="M42 30 L32 4 L50 27 L46 -1 L58 26 L62 -3 L68 26 L76 1 L80 29 Z" fill="#f3c2ae" />
      <path d="M38 6 L44 28 M50 2 L52 27 M62 0 L63 26 M74 4 L72 27" fill="none" stroke="#c8372d" strokeWidth={1.4} />
      <path d="M62 50 Q50 80 28 78 Q44 68 50 54 Z" fill="#f3c2ae" />
      <path d="M58 54 Q46 72 34 76 M54 52 Q48 64 40 72" fill="none" stroke="#c8372d" strokeWidth={1.4} />
      <path d="M30 42 Q44 24 72 26 Q98 28 106 42 Q98 56 72 58 Q44 60 30 42 Z" fill="#fbefe4" />
      <path d="M46 30 Q42 42 46 56 M60 27 Q56 42 60 58 M74 26 Q70 42 74 58 M86 29 Q83 42 86 55" fill="none" stroke="#c8372d" strokeWidth={4.5} />
      <Shine cx={66} cy={32} rx={12} ry={3} />
      <Eye cx={93} cy={38} r={5} />
      <path d="M104 46 Q101 48 98 46" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** 13 · Vatoz (65–69): geniş kanatlı, uzun kuyruklu */
function Manta() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M32 42 Q16 44 -2 52" fill="none" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M28 42 Q48 30 60 4 Q72 24 98 34 Q110 38 110 42 Q110 46 98 50 Q72 60 60 80 Q48 54 28 42 Z" fill="#3d5a80" />
      <path d="M44 42 Q62 35 98 40 Q62 50 44 42 Z" fill="#e0ecf5" stroke="none" />
      <path d="M100 36 Q112 28 116 35 Q109 36 104 39 Z M100 48 Q112 56 116 49 Q109 48 104 45 Z" fill="#2c4462" />
      {[[58, 22, 2.5], [64, 30, 2], [56, 60, 2.5], [64, 54, 2]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#9db7d3" stroke="none" />
      ))}
      <Shine cx={62} cy={16} rx={4} ry={8} />
      <Eye cx={96} cy={38} r={4.5} />
    </g>
  );
}

/** 14 · Çekiç (70–74): çekiç başlı köpekbalığı */
function Hammer() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M26 40 L6 12 Q12 34 14 40 Q12 48 4 60 Z" fill="#7f8c9a" />
      <path d="M52 27 L64 4 L74 27 Z" fill="#7f8c9a" />
      <path d="M66 52 L54 70 L78 54 Z" fill="#7f8c9a" />
      <path d="M20 40 Q40 24 70 26 Q92 28 100 36 L100 46 Q92 54 70 56 Q40 56 20 40 Z" fill="#95a5b4" />
      <path d="M34 46 Q60 56 96 46 Q86 54 66 55 Q44 54 34 46 Z" fill="#eef2f5" stroke="none" />
      <path d="M94 32 Q100 20 108 12 Q115 12 114 19 L108 41 L114 64 Q115 71 108 71 Q100 64 94 52 Z" fill="#95a5b4" />
      <path d="M82 34 Q80 40 82 46 M87 34 Q85 40 87 46" fill="none" strokeWidth={1.6} />
      <Shine cx={62} cy={31} rx={14} ry={3} />
      <Eye cx={110} cy={18} r={3.8} />
      <Eye cx={110} cy={64} r={3.2} />
    </g>
  );
}

/** 15 · Köpekbalığı (75–79): üçgen sırt yüzgeci, beyaz karın, dişli gülüş */
function Shark() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M26 40 L4 6 Q14 32 16 40 Q14 48 8 64 Z" fill="#4a6fa5" />
      <path d="M50 24 L62 -2 L74 24 Z" fill="#4a6fa5" />
      <path d="M62 52 L48 72 L74 54 Z" fill="#4a6fa5" />
      <path d="M18 40 Q38 20 72 22 Q100 24 114 40 Q104 54 72 58 Q38 58 18 40 Z" fill="#5b84c4" />
      <path d="M32 46 Q66 60 108 44 Q96 56 70 57 Q46 56 32 46 Z" fill="#f2f5f8" stroke="none" />
      <path d="M82 32 Q79 40 82 48 M87 32 Q84 40 87 48 M92 33 Q89 40 92 47" fill="none" strokeWidth={1.6} />
      <path d="M96 47 Q104 50 110 44" fill="none" strokeLinecap="round" />
      <path d="M98 48 L99.5 51.5 L101 48.8 Z M102.5 48.8 L104 52 L105.5 48 Z" fill="#fff" strokeWidth={1} />
      <Shine cx={68} cy={28} rx={15} ry={3} />
      <Eye cx={100} cy={35} r={4.5} />
    </g>
  );
}

/** 16 · Ejder (80+): kırmızı pullu gövde, altın dikenli sırt, uzun bıyıklar */
function Dragon() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <path d="M38 40 Q16 8 0 12 Q12 28 6 40 Q12 52 0 68 Q16 72 38 40 Z" fill="#ff6b3d" />
      <path d="M40 26 L46 10 L52 23 L58 5 L64 21 L70 3 L76 21 L82 9 L88 26 Z" fill="#ffc83d" />
      <path d="M58 56 Q64 74 80 58 Z" fill="#ffc83d" />
      <ellipse cx={70} cy={40} rx={36} ry={19} fill="#e8322b" />
      <path d="M48 38 q4 -4 8 0 M58 46 q4 -4 8 0 M58 30 q4 -4 8 0 M68 38 q4 -4 8 0 M78 46 q4 -4 8 0" fill="none" stroke="#9e1b16" strokeWidth={1.5} />
      <path d="M101 46 Q112 58 119 52 M101 43 Q114 40 120 29" fill="none" stroke="#ffc83d" strokeWidth={2.2} strokeLinecap="round" />
      <Shine cx={68} cy={29} rx={13} ry={3.5} />
      <Eye cx={92} cy={35} r={5.5} />
    </g>
  );
}

const FORMS = [Fry, Orange, Striped, Blue, Angel, Spotted, Veil, Golden, Puffer, Sword, Lantern, Lion, Manta, Hammer, Shark, Dragon];

export const FORM_NAMES = ['Yavru', 'Turuncu', 'Çizgili', 'Mavi', 'Melek', 'Benekli', 'Pelerin', 'Altın', 'Balon', 'Kılıç', 'Fener', 'Aslan', 'Vatoz', 'Çekiç', 'Köpekbalığı', 'Ejder'];

function Crown() {
  return (
    <path
      d="M74 14 L78 2 L84 10 L90 0 L95 10 L101 2 L104 14 Z"
      fill="#ffd400"
      stroke={OUTLINE}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  );
}

/** Her şeklin burun ucu (ağzın açılacağı nokta): [x, y] */
const MOUTHS: [number, number][] = [
  [89, 46], [97, 45], [99, 45], [110, 44], [101, 43], [96, 47], [101, 44], [103, 45],
  [94, 47], [102, 41], [108, 47], [105, 45], [110, 42], [100, 48], [111, 44], [105, 43],
];

/**
 * Açılan ağız: burun ucundan gövdeye doğru koyu bir kama + dişler.
 * Varsayılan olarak kapalıdır (mouthClassName ile CSS açar/kapatır).
 */
function Mouth({ x, y, className }: { x: number; y: number; className?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <path d="M2 -9 L-17 0 L2 9 Q6 0 2 -9 Z" fill="#5c1626" stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round" />
        <path d="M0 -7 L-4 -3 L-6 -5.5 L-9 -1.5 L-11 -3.5 Z" fill="#fff" />
        <path d="M0 7 L-4 3 L-6 5.5 L-9 1.5 L-11 3.5 Z" fill="#fff" />
      </g>
    </g>
  );
}

export function FishArt({ form, crown, mouthClassName }: { form: number; crown?: boolean; mouthClassName?: string }) {
  const index = Math.max(0, Math.min(FORMS.length - 1, form - 1));
  const Form = FORMS[index];
  const [mx, my] = MOUTHS[index];
  return (
    <svg viewBox="-4 -6 124 92" width="100%" height="100%" aria-hidden="true" focusable="false" overflow="visible">
      <Form />
      {mouthClassName && <Mouth x={mx} y={my} className={mouthClassName} />}
      {crown && <Crown />}
    </svg>
  );
}

/** Yumurta: 0 çatlak (0 ve eksi puan) … 4 çatlak (4 puan, çıkmak üzere) */
export function EggArt({ cracks }: { cracks: number }) {
  // Çatlaklar ortadaki isim bandının (y ≈ 44–62) dışında kalır
  const lines = [
    'M30 16 L36 24 L31 32',
    'M58 20 L52 27 L58 33 L54 38',
    'M22 70 L30 74 L26 82',
    'M54 70 L48 76 L55 81',
  ];
  return (
    <svg viewBox="0 0 80 100" width="100%" height="100%" aria-hidden="true" focusable="false">
      <ellipse cx={40} cy={94} rx={26} ry={5} fill="#000" opacity={0.18} />
      <path
        d="M40 4 C62 4 74 38 74 60 C74 82 59 94 40 94 C21 94 6 82 6 60 C6 38 18 4 40 4 Z"
        fill="#fff6e4"
        stroke={OUTLINE}
        strokeWidth={2.2}
      />
      <ellipse cx={28} cy={30} rx={7} ry={12} fill="#fff" opacity={0.7} transform="rotate(20 28 30)" />
      {[[52, 22, 3], [58, 66, 2.5], [22, 74, 3], [46, 82, 2], [18, 50, 2]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#f0c98e" />
      ))}
      {lines.slice(0, cracks).map((d) => (
        <path key={d} d={d} fill="none" stroke={OUTLINE} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
