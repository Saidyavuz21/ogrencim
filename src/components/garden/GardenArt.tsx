import React from 'react';
import type { IconProps } from '../icons';
import {
  BookOpen, Heart, Hand, Sparkles, HeartHandshake, Check, Star, Smile, Clock, Music, Palette, Leaf,
} from '../icons';
import styles from './Garden.module.css';

export const TREE_NAMES: Record<string, string> = {
  apple: 'Elma ağacı',
  cherry: 'Kiraz ağacı',
  oak: 'Meşe ağacı',
  pine: 'Çam ağacı',
  orange: 'Portakal ağacı',
  olive: 'Zeytin ağacı',
  lemon: 'Limon ağacı',
  willow: 'Söğüt ağacı',
};

export const STAGE_NAMES = [
  'Fidan (2 yaprak)',
  'Genç fidan',
  'Genç ağaç',
  'Yapraklı ağaç',
  'Çiçekli ağaç',
  'Meyveli ağaç',
  'Bereketli ağaç',
  'Ulu ağaç',
  'Işıltılı ulu ağaç',
] as const;

/** GARDEN_ICONS eşlemesi; bulunamazsa Star döner */
export function getGardenIcon(iconKey: string): React.FC<IconProps> {
  switch (iconKey) {
    case 'book': return BookOpen;
    case 'heart': return Heart;
    case 'hand': return Hand;
    case 'sparkles': return Sparkles;
    case 'handshake': return HeartHandshake;
    case 'check': return Check;
    case 'star': return Star;
    case 'smile': return Smile;
    case 'clock': return Clock;
    case 'music': return Music;
    case 'palette': return Palette;
    case 'leaf': return Leaf;
    default: return Star;
  }
}

const OUTLINE = '#1c3d2b';
const TRUNK = '#6d4c33';
const TRUNK_DARK = '#4e3320';
const SOIL = '#7a5438';

function SoilMound() {
  return (
    <g>
      <ellipse cx={50} cy={110} rx={22} ry={6} fill={SOIL} opacity={0.65} />
      <ellipse cx={50} cy={110} rx={14} ry={3.5} fill="#4a2e18" opacity={0.4} />
    </g>
  );
}

// ---------------- 0: Fidan (2 yaprak) ----------------
function Stage0Sapling() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <SoilMound />
      <path d="M50 110 Q50 94 50 82" stroke={TRUNK} strokeWidth={3} fill="none" />
      {/* Sol yaprak */}
      <path d="M50 86 C40 82 34 88 38 94 C46 96 49 90 50 86 Z" fill="#88d84a" />
      {/* Sağ yaprak */}
      <path d="M50 84 C60 78 66 84 62 91 C55 94 51 88 50 84 Z" fill="#9de659" />
      {/* Küçük tepe tomurcuğu */}
      <circle cx={50} cy={81} r={2.5} fill="#c8f57f" />
    </g>
  );
}

// ---------------- 1: Genç Fidan (4-5 yaprak) ----------------
function Stage1YoungSapling() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <SoilMound />
      <path d="M50 110 Q49 88 50 68" stroke={TRUNK} strokeWidth={3.5} fill="none" />
      {/* Yan dallar */}
      <path d="M50 90 Q40 86 36 82" stroke={TRUNK} strokeWidth={2} fill="none" />
      <path d="M50 80 Q60 76 64 72" stroke={TRUNK} strokeWidth={2} fill="none" />
      {/* Yapraklar */}
      <path d="M36 82 C28 80 26 88 32 92 C38 93 39 86 36 82 Z" fill="#78ce3f" />
      <path d="M48 94 C38 94 36 102 44 103 C50 102 50 96 48 94 Z" fill="#6bbe33" />
      <path d="M64 72 C72 70 74 78 68 82 C62 83 61 76 64 72 Z" fill="#86d84a" />
      <path d="M50 70 C42 62 46 54 52 58 C55 64 53 68 50 70 Z" fill="#9de659" />
      <path d="M50 68 C58 60 64 66 60 72 C54 74 51 70 50 68 Z" fill="#78ce3f" />
    </g>
  );
}

// ---------------- 2: Genç Ağaç (İnce gövde + küçük taç) ----------------
function Stage2SmallTree({ leafColor = '#4ea84b' }: { leafColor?: string }) {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <SoilMound />
      {/* Gövde */}
      <path d="M46 110 L48 64 Q50 60 52 64 L54 110 Z" fill={TRUNK} />
      <path d="M49 68 Q40 60 36 56" stroke={TRUNK_DARK} strokeWidth={2.5} fill="none" />
      <path d="M51 66 Q60 58 64 54" stroke={TRUNK_DARK} strokeWidth={2.5} fill="none" />
      {/* Taç */}
      <circle cx={50} cy={44} r={22} fill={leafColor} />
      <circle cx={40} cy={48} r={14} fill={leafColor} />
      <circle cx={60} cy={48} r={14} fill={leafColor} />
      <circle cx={50} cy={35} r={15} fill="#6fd368" />
    </g>
  );
}

// ---------------- Taç Çizimleri (Stage 3, 4, 5) ----------------
function TreeTrunk() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <SoilMound />
      <path d="M43 110 Q45 80 47 56 Q50 50 53 56 Q55 80 57 110 Z" fill={TRUNK} />
      {/* Kök çizgileri */}
      <path d="M43 110 Q38 112 34 113" stroke={TRUNK_DARK} strokeWidth={2.5} fill="none" />
      <path d="M57 110 Q62 112 66 113" stroke={TRUNK_DARK} strokeWidth={2.5} fill="none" />
      {/* Dallar */}
      <path d="M48 68 Q36 56 30 50" stroke={TRUNK} strokeWidth={3.5} fill="none" />
      <path d="M52 66 Q64 54 70 48" stroke={TRUNK} strokeWidth={3.5} fill="none" />
      <path d="M50 56 Q50 44 48 38" stroke={TRUNK} strokeWidth={3} fill="none" />
    </g>
  );
}

/** Çam ağacı katmanlı piramit tacı */
function PineCanopy({ stage }: { stage: number }) {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* Alt katman */}
      <polygon points="50,44 18,78 82,78" fill="#2d6a45" />
      {/* Orta katman */}
      <polygon points="50,28 26,58 74,58" fill="#357a50" />
      {/* Üst katman */}
      <polygon points="50,14 34,40 66,40" fill="#408d5c" />
      {/* Kar/ışık parıltısı */}
      <path d="M50 16 L44 32 L56 32 Z" fill="#61b580" opacity={0.35} stroke="none" />

      {/* Stage 4: Çam tomurcukları */}
      {stage === 4 && (
        <g stroke={OUTLINE} strokeWidth={1.2}>
          <circle cx={32} cy={72} r={3} fill="#d48a37" />
          <circle cx={68} cy={72} r={3} fill="#d48a37" />
          <circle cx={40} cy={52} r={3} fill="#d48a37" />
          <circle cx={60} cy={52} r={3} fill="#d48a37" />
          <circle cx={50} cy={34} r={3} fill="#e59d4c" />
        </g>
      )}

      {/* Stage 5+: Kozalaklar (6+ bereket: ikinci kat, aynalanmış) */}
      {stage >= 6 && (
        <g stroke={OUTLINE} strokeWidth={1.4} transform="translate(100 6) scale(-1 1)">
          <ellipse cx={30} cy={70} rx={3.5} ry={6} fill="#774724" />
          <ellipse cx={42} cy={50} rx={3.5} ry={5.5} fill="#633b1e" />
          <ellipse cx={58} cy={64} rx={3.5} ry={5.5} fill="#774724" />
        </g>
      )}
      {stage >= 5 && (
        <g stroke={OUTLINE} strokeWidth={1.4}>
          <ellipse cx={28} cy={74} rx={3.5} ry={6} fill="#633b1e" />
          <ellipse cx={72} cy={74} rx={3.5} ry={6} fill="#633b1e" />
          <ellipse cx={36} cy={54} rx={3.5} ry={5.5} fill="#633b1e" />
          <ellipse cx={64} cy={54} rx={3.5} ry={5.5} fill="#633b1e" />
          <ellipse cx={50} cy={36} rx={3.5} ry={6} fill="#774724" />
        </g>
      )}
    </g>
  );
}

/** Meşe ağacı geniş bulut tacı */
function OakCanopy({ stage }: { stage: number }) {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={32} cy={50} r={18} fill="#3f7c35" />
      <circle cx={68} cy={50} r={18} fill="#3f7c35" />
      <circle cx={50} cy={36} r={24} fill="#4b8e3f" />
      <circle cx={34} cy={32} r={16} fill="#5ba64e" />
      <circle cx={66} cy={32} r={16} fill="#5ba64e" />
      <circle cx={50} cy={22} r={15} fill="#6bb85d" />

      {/* Stage 4: Palamut çiçekleri (sarı/altın püsküller) */}
      {stage === 4 && (
        <g stroke={OUTLINE} strokeWidth={1.2}>
          <path d="M30 46 Q28 54 30 58" stroke="#d6b838" strokeWidth={2} />
          <path d="M44 38 Q42 46 44 50" stroke="#d6b838" strokeWidth={2} />
          <path d="M58 38 Q60 46 58 50" stroke="#d6b838" strokeWidth={2} />
          <path d="M70 46 Q72 54 70 58" stroke="#d6b838" strokeWidth={2} />
        </g>
      )}

      {/* Stage 6+: Bereket, ikinci kat palamut */}
      {stage >= 6 && (
        <g stroke={OUTLINE} strokeWidth={1.4}>
          <Acorn cx={36} cy={46} />
          <Acorn cx={64} cy={40} />
          <Acorn cx={50} cy={32} />
          <Acorn cx={24} cy={46} />
          <Acorn cx={76} cy={46} />
        </g>
      )}
      {/* Stage 5+: Palamutlar (Acorns) */}
      {stage >= 5 && (
        <g stroke={OUTLINE} strokeWidth={1.4}>
          <Acorn cx={30} cy={54} />
          <Acorn cx={46} cy={42} />
          <Acorn cx={56} cy={44} />
          <Acorn cx={70} cy={52} />
          <Acorn cx={40} cy={28} />
          <Acorn cx={60} cy={28} />
        </g>
      )}
    </g>
  );
}

function Acorn({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* Şapka */}
      <path d={`M${cx - 4} ${cy} Q${cx} ${cy - 4} ${cx + 4} ${cy}`} fill="#50351d" />
      {/* Gövde */}
      <path d={`M${cx - 3.5} ${cy} Q${cx} ${cy + 7} ${cx + 3.5} ${cy} Z`} fill="#92623a" />
    </g>
  );
}

/** Söğüt ağacı zarif sarkan dallar */
function WillowCanopy({ stage }: { stage: number }) {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={50} cy={36} r={24} fill="#569246" />
      <circle cx={36} cy={40} r={18} fill="#629e51" />
      <circle cx={64} cy={40} r={18} fill="#629e51" />
      {/* Sarkan söğüt dalları */}
      <path d="M24 44 Q18 64 22 84" stroke="#68a658" strokeWidth={3} fill="none" />
      <path d="M34 48 Q28 68 32 88" stroke="#7ab66a" strokeWidth={3} fill="none" />
      <path d="M44 50 Q40 70 42 86" stroke="#68a658" strokeWidth={2.8} fill="none" />
      <path d="M56 50 Q60 70 58 86" stroke="#68a658" strokeWidth={2.8} fill="none" />
      <path d="M66 48 Q72 68 68 88" stroke="#7ab66a" strokeWidth={3} fill="none" />
      <path d="M76 44 Q82 64 78 84" stroke="#68a658" strokeWidth={3} fill="none" />

      {/* Stage 6+: Bereket, dalların ucunda ikinci sıra çiçek */}
      {stage >= 6 && (
        <g stroke={OUTLINE} strokeWidth={1}>
          <circle cx={23} cy={82} r={2.5} fill="#f2ec86" />
          <circle cx={33} cy={86} r={2.5} fill="#f2ec86" />
          <circle cx={42} cy={84} r={2.5} fill="#f2ec86" />
          <circle cx={58} cy={84} r={2.5} fill="#f2ec86" />
          <circle cx={67} cy={86} r={2.5} fill="#f2ec86" />
          <circle cx={77} cy={82} r={2.5} fill="#f2ec86" />
          <circle cx={30} cy={60} r={2.3} fill="#e5df63" />
          <circle cx={70} cy={60} r={2.3} fill="#e5df63" />
        </g>
      )}
      {/* Stage 4+: Sarkan püskül çiçekler / tomurcuklar */}
      {stage >= 4 && (
        <g stroke={OUTLINE} strokeWidth={1}>
          <circle cx={21} cy={70} r={2.5} fill="#e5df63" />
          <circle cx={31} cy={76} r={2.5} fill="#e5df63" />
          <circle cx={42} cy={74} r={2.5} fill="#e5df63" />
          <circle cx={58} cy={74} r={2.5} fill="#e5df63" />
          <circle cx={69} cy={76} r={2.5} fill="#e5df63" />
          <circle cx={79} cy={70} r={2.5} fill="#e5df63" />
        </g>
      )}
    </g>
  );
}

/** Yuvarlak meyve ağacı tacı (Elma, Kiraz, Portakal, Limon, Zeytin) */
function RoundFruitCanopy({
  tree,
  stage,
  baseColor = '#469b43',
  lightColor = '#5db559',
}: {
  tree: string;
  stage: number;
  baseColor?: string;
  lightColor?: string;
}) {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={50} cy={38} r={26} fill={baseColor} />
      <circle cx={32} cy={44} r={18} fill={baseColor} />
      <circle cx={68} cy={44} r={18} fill={baseColor} />
      <circle cx={38} cy={28} r={16} fill={lightColor} />
      <circle cx={62} cy={28} r={16} fill={lightColor} />
      <circle cx={50} cy={20} r={14} fill={lightColor} />

      {/* Stage 4: Çiçekler */}
      {stage === 4 && <Blossoms tree={tree} />}

      {/* Stage 5+: Meyveler; 6+ bereket: aynalanmış ikinci kat */}
      {stage >= 5 && <Fruits tree={tree} />}
      {stage >= 6 && <g transform="translate(100 5) scale(-1 1)"><Fruits tree={tree} /></g>}
    </g>
  );
}

function Flower({ cx, cy, color = '#ffffff', center = '#ffcc00' }: { cx: number; cy: number; color?: string; center?: string }) {
  return (
    <g stroke={OUTLINE} strokeWidth={1}>
      <circle cx={cx - 2} cy={cy} r={2.2} fill={color} />
      <circle cx={cx + 2} cy={cy} r={2.2} fill={color} />
      <circle cx={cx} cy={cy - 2} r={2.2} fill={color} />
      <circle cx={cx} cy={cy + 2} r={2.2} fill={color} />
      <circle cx={cx} cy={cy} r={1.8} fill={center} />
    </g>
  );
}

function Blossoms({ tree }: { tree: string }) {
  const color = tree === 'cherry' ? '#ffc2d6' : tree === 'apple' ? '#ffe0eb' : '#ffffff';
  const center = tree === 'cherry' ? '#ff5277' : '#ffd033';
  return (
    <g>
      <Flower cx={32} cy={42} color={color} center={center} />
      <Flower cx={48} cy={46} color={color} center={center} />
      <Flower cx={66} cy={40} color={color} center={center} />
      <Flower cx={38} cy={26} color={color} center={center} />
      <Flower cx={54} cy={24} color={color} center={center} />
      <Flower cx={64} cy={28} color={color} center={center} />
      <Flower cx={48} cy={16} color={color} center={center} />
    </g>
  );
}

function Fruits({ tree }: { tree: string }) {
  switch (tree) {
    case 'apple':
      return (
        <g stroke={OUTLINE} strokeWidth={1.4}>
          <Apple cx={30} cy={44} />
          <Apple cx={46} cy={48} />
          <Apple cx={68} cy={42} />
          <Apple cx={36} cy={28} />
          <Apple cx={54} cy={24} />
          <Apple cx={64} cy={30} />
          <Apple cx={48} cy={16} />
        </g>
      );
    case 'cherry':
      return (
        <g stroke={OUTLINE} strokeWidth={1.3}>
          <Cherries cx={32} cy={42} />
          <Cherries cx={64} cy={40} />
          <Cherries cx={48} cy={24} />
          <Cherries cx={38} cy={28} />
          <Cherries cx={58} cy={46} />
        </g>
      );
    case 'orange':
      return (
        <g stroke={OUTLINE} strokeWidth={1.4}>
          <Orange cx={30} cy={44} />
          <Orange cx={46} cy={48} />
          <Orange cx={68} cy={42} />
          <Orange cx={36} cy={28} />
          <Orange cx={54} cy={24} />
          <Orange cx={64} cy={30} />
          <Orange cx={48} cy={16} />
        </g>
      );
    case 'lemon':
      return (
        <g stroke={OUTLINE} strokeWidth={1.4}>
          <Lemon cx={32} cy={42} />
          <Lemon cx={48} cy={48} />
          <Lemon cx={66} cy={40} />
          <Lemon cx={36} cy={28} />
          <Lemon cx={54} cy={24} />
          <Lemon cx={64} cy={30} />
          <Lemon cx={48} cy={16} />
        </g>
      );
    case 'olive':
      return (
        <g stroke={OUTLINE} strokeWidth={1.3}>
          <Olive cx={30} cy={44} />
          <Olive cx={46} cy={46} />
          <Olive cx={66} cy={42} />
          <Olive cx={38} cy={28} />
          <Olive cx={54} cy={24} />
          <Olive cx={64} cy={30} />
          <Olive cx={48} cy={16} />
        </g>
      );
    default:
      return null;
  }
}

function Apple({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <path d={`M${cx} ${cy - 5} Q${cx + 2} ${cy - 8} ${cx + 3} ${cy - 9}`} stroke="#3d2616" strokeWidth={1.2} fill="none" />
      <circle cx={cx} cy={cy} r={4.5} fill="#e53935" />
      <circle cx={cx - 1.2} cy={cy - 1.5} r={1.2} fill="#ff7675" stroke="none" />
    </g>
  );
}

function Cherries({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <path d={`M${cx} ${cy - 6} Q${cx - 3} ${cy} ${cx - 3} ${cy + 2}`} stroke="#2e5926" strokeWidth={1} fill="none" />
      <path d={`M${cx} ${cy - 6} Q${cx + 3} ${cy} ${cx + 3} ${cy + 2}`} stroke="#2e5926" strokeWidth={1} fill="none" />
      <circle cx={cx - 3} cy={cy + 3} r={3} fill="#c2185b" />
      <circle cx={cx + 3} cy={cy + 3} r={3} fill="#c2185b" />
    </g>
  );
}

function Orange({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={4.6} fill="#fb8c00" />
      <circle cx={cx - 1.2} cy={cy - 1.5} r={1.2} fill="#ffb74d" stroke="none" />
      <circle cx={cx} cy={cy - 4.2} r={0.8} fill="#2e5926" stroke="none" />
    </g>
  );
}

function Lemon({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={4.8} ry={3.6} fill="#fdd835" />
      <circle cx={cx - 1.2} cy={cy - 1} r={1} fill="#fff59d" stroke="none" />
    </g>
  );
}

function Olive({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={3.5} ry={4.5} fill="#4a3754" />
      <ellipse cx={cx - 0.8} cy={cy - 1} rx={0.8} ry={1.2} fill="#7e57c2" stroke="none" />
    </g>
  );
}

/** Bereketli ağacın dibine düşmüş meyveler */
function FallenFruits({ tree }: { tree: string }) {
  const spots: [number, number][] = [[34, 113], [64, 114], [71, 111]];
  return (
    <g stroke={OUTLINE} strokeWidth={1.2}>
      {spots.map(([cx, cy]) => {
        const key = `${cx}-${cy}`;
        switch (tree) {
          case 'apple': return <Apple key={key} cx={cx} cy={cy} />;
          case 'cherry': return <Cherries key={key} cx={cx} cy={cy - 3} />;
          case 'orange': return <Orange key={key} cx={cx} cy={cy} />;
          case 'lemon': return <Lemon key={key} cx={cx} cy={cy} />;
          case 'olive': return <Olive key={key} cx={cx} cy={cy} />;
          case 'oak': return <Acorn key={key} cx={cx} cy={cy - 2} />;
          case 'pine': return <ellipse key={key} cx={cx} cy={cy} rx={5.5} ry={3.2} fill="#633b1e" />;
          default: return <circle key={key} cx={cx} cy={cy} r={2.6} fill="#e5df63" />;
        }
      })}
    </g>
  );
}

/** Ulu ağacın dalındaki kuş */
function PerchedBird() {
  return (
    <g stroke={OUTLINE} strokeWidth={1.4} strokeLinejoin="round">
      <path d="M70 15 C70 9 77 7 81 10 L86 9 L82 13 C82 17 78 20 73 19 C71 18 70 17 70 15 Z" fill="#f2a541" />
      <path d="M72 14 C74 12 78 12 79 14" fill="none" stroke="#b86e1c" />
      <circle cx={79.5} cy={11.5} r={0.9} fill={OUTLINE} stroke="none" />
      <path d="M73 19 L72 22 M76 19 L76 22" fill="none" />
    </g>
  );
}

/** Işıltılı ulu ağacın çevresindeki altın ışıltılar */
function Sparkles8() {
  const stars: [number, number, number][] = [[18, 30, 5], [84, 26, 6], [26, 66, 4], [78, 62, 4.5], [50, -2, 5.5], [10, 50, 3.5], [90, 46, 3.5]];
  return (
    <g>
      {stars.map(([x, y, r], i) => (
        <path
          key={i}
          className={styles.treeSparkle}
          style={{ animationDelay: `${(i * 0.37) % 1.8}s` }}
          d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`}
          fill="#f6c945"
          stroke="#b8860b"
          strokeWidth={0.8}
        />
      ))}
    </g>
  );
}

export interface TreeArtProps {
  tree: string;
  stage: number;
  className?: string;
  size?: number;
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
}

/**
 * 8 ağaç türü × 9 büyüme aşaması için özgün SVG çizim bileşeni (6+ bereket, 7+ ulu, 8 ışıltılı).
 * viewBox="0 0 100 120"
 */
export function TreeArt({
  tree,
  stage,
  className,
  size = 110,
  x,
  y,
  width,
  height,
}: TreeArtProps) {
  const safeStage = Math.max(0, Math.min(8, Math.floor(stage)));

  // Sway animasyon sınıfı
  const swayClass = styles.treeSway;

  const renderContent = () => {
    if (safeStage === 0) return <Stage0Sapling />;
    if (safeStage === 1) return <Stage1YoungSapling />;
    if (safeStage === 2) {
      const color = tree === 'pine' ? '#2d6a45' : tree === 'olive' ? '#5a825e' : '#4ea84b';
      return <Stage2SmallTree leafColor={color} />;
    }

    // Stage 3, 4, 5
    return (
      <g>
        <TreeTrunk />
        {tree === 'pine' && <PineCanopy stage={safeStage} />}
        {tree === 'oak' && <OakCanopy stage={safeStage} />}
        {tree === 'willow' && <WillowCanopy stage={safeStage} />}
        {tree === 'olive' && (
          <RoundFruitCanopy tree={tree} stage={safeStage} baseColor="#557d59" lightColor="#6e9672" />
        )}
        {tree !== 'pine' && tree !== 'oak' && tree !== 'willow' && tree !== 'olive' && (
          <RoundFruitCanopy tree={tree} stage={safeStage} />
        )}
      </g>
    );
  };

  const finalWidth = width ?? size;
  const finalHeight = height ?? Math.round((Number(size) * 120) / 100);

  return (
    <svg
      x={x}
      y={y}
      viewBox="0 0 100 120"
      width={finalWidth}
      height={finalHeight}
      className={`${swayClass} ${className || ''}`}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {safeStage >= 7 ? (
        // Ulu ağaç: aynı ağaç dibinden büyütülür
        <g transform="translate(50 112) scale(1.14) translate(-50 -112)">
          {renderContent()}
          <PerchedBird />
        </g>
      ) : renderContent()}
      {safeStage >= 6 && <FallenFruits tree={tree} />}
      {safeStage === 8 && <Sparkles8 />}
    </svg>
  );
}

