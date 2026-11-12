import React from 'react';
import type { GardenUnlockKey } from '../../lib/gardenData';
import styles from './Garden.module.css';

interface GardenSceneProps {
  unlocked: Set<GardenUnlockKey>;
  children?: React.ReactNode;
}

/**
 * Gökyüzü, Güneş, Bulutlar ve Tepeler Katmanı
 */
export function SkyAndHills() {
  return (
    <g id="scene-background">
      {/* Gökyüzü */}
      <rect x="0" y="0" width="1200" height="600" fill="url(#garden-sky-grad)" />

      {/* Güneş */}
      <circle cx="1020" cy="110" r="48" fill="url(#garden-sun-grad)" opacity="0.95" />
      <circle cx="1020" cy="110" r="64" fill="#fff9db" opacity="0.22" />

      {/* Bulutlar (Hafif kayma animasyonlu) */}
      <g className={styles.cloudSlow}>
        {/* Bulut 1 */}
        <g fill="#ffffff" opacity="0.88">
          <ellipse cx="220" cy="110" rx="46" ry="22" />
          <ellipse cx="250" cy="100" rx="36" ry="26" />
          <ellipse cx="190" cy="112" rx="30" ry="18" />
        </g>
        {/* Bulut 2 */}
        <g fill="#ffffff" opacity="0.82">
          <ellipse cx="580" cy="85" rx="55" ry="24" />
          <ellipse cx="620" cy="74" rx="40" ry="28" />
          <ellipse cx="545" cy="88" rx="32" ry="18" />
        </g>
      </g>

      <g className={styles.cloudFast}>
        {/* Bulut 3 */}
        <g fill="#ffffff" opacity="0.75">
          <ellipse cx="820" cy="130" rx="38" ry="17" />
          <ellipse cx="845" cy="122" rx="28" ry="20" />
        </g>
      </g>

      {/* Uzak Tepeler (2 Katman) */}
      {/* 1. En Uzak Tepe */}
      <path
        d="M0 290 Q220 210 460 260 T920 240 Q1060 215 1200 250 L1200 600 L0 600 Z"
        fill="url(#garden-hill-far)"
      />
      {/* 2. Orta Tepe */}
      <path
        d="M0 320 Q260 250 560 300 T1040 270 Q1120 260 1200 285 L1200 600 L0 600 Z"
        fill="url(#garden-hill-mid)"
      />

      {/* Yakın Çimen Çayırı (Ana zemin) */}
      <path
        d="M0 355 Q180 320 420 345 T880 320 Q1050 305 1200 335 L1200 600 L0 600 Z"
        fill="url(#garden-grass-grad)"
      />
    </g>
  );
}

/**
 * Gökkuşağı (Seviye 56)
 */
export function Rainbow() {
  return (
    <g opacity="0.45" strokeWidth="9" fill="none" strokeLinecap="round" className={styles.fadeInElement}>
      <ellipse cx="600" cy="460" rx="480" ry="290" stroke="#ff7675" />
      <ellipse cx="600" cy="460" rx="471" ry="281" stroke="#fab1a0" />
      <ellipse cx="600" cy="460" rx="462" ry="272" stroke="#ffeaa7" />
      <ellipse cx="600" cy="460" rx="453" ry="263" stroke="#55efc4" />
      <ellipse cx="600" cy="460" rx="444" ry="254" stroke="#74b9ff" />
      <ellipse cx="600" cy="460" rx="435" ry="245" stroke="#a29bfe" />
    </g>
  );
}

/**
 * Patika (Seviye 4)
 * Ön kenardan tepeye (evin olduğu yere) doğru kıvrılan doğal toprak patika
 */
export function DirtPath() {
  return (
    <g className={styles.fadeInElement}>
      {/* Patika tabanı */}
      <path
        d="M510 600 C530 550 580 510 640 455 C700 405 780 375 840 335 C880 310 900 305 925 300
           L945 300 C920 310 890 320 855 348 C790 395 715 425 655 475 C590 530 540 565 530 600 Z"
        fill="url(#garden-path-grad)"
        stroke="#9b7348"
        strokeWidth="1.5"
      />
      {/* Patika üzerindeki küçük çakıl taşları */}
      <g fill="#99744c" opacity="0.6">
        <circle cx="535" cy="570" r="2.5" />
        <circle cx="550" cy="540" r="3" />
        <circle cx="610" cy="485" r="2.2" />
        <circle cx="670" cy="445" r="2.8" />
        <circle cx="730" cy="405" r="2" />
        <circle cx="790" cy="370" r="2.5" />
        <circle cx="860" cy="335" r="2.2" />
        <circle cx="910" cy="310" r="2" />
      </g>
    </g>
  );
}

/**
 * Kır Çiçekleri (Seviye 6)
 * Sabit tohumlu, çimende renkli çiçek öbekleri
 */
export function Wildflowers() {
  return (
    <g className={styles.fadeInElement} stroke="#1b4332" strokeWidth="0.8">
      {/* Sol Çiçek Öbeği */}
      <g transform="translate(180, 375)">
        <circle cx="0" cy="0" r="3" fill="#ff7675" />
        <circle cx="-5" cy="3" r="2.5" fill="#ffd166" />
        <circle cx="6" cy="2" r="2.8" fill="#ffffff" />
        <circle cx="0" cy="6" r="2.5" fill="#74b9ff" />
      </g>
      <g transform="translate(260, 420)">
        <circle cx="0" cy="0" r="3" fill="#fd79a8" />
        <circle cx="5" cy="4" r="2.5" fill="#ffeaa7" />
        <circle cx="-6" cy="2" r="2.5" fill="#a29bfe" />
      </g>
      {/* Orta Çiçekler */}
      <g transform="translate(420, 360)">
        <circle cx="0" cy="0" r="3" fill="#ffffff" />
        <circle cx="6" cy="3" r="2.5" fill="#ff7675" />
        <circle cx="-5" cy="4" r="2.5" fill="#ffd166" />
      </g>
      <g transform="translate(460, 440)">
        <circle cx="0" cy="0" r="3" fill="#ffd166" />
        <circle cx="5" cy="3" r="2.5" fill="#74b9ff" />
        <circle cx="-4" cy="5" r="2.2" fill="#ffffff" />
      </g>
      {/* Sağ Çiçekler */}
      <g transform="translate(710, 460)">
        <circle cx="0" cy="0" r="3" fill="#fd79a8" />
        <circle cx="6" cy="3" r="2.8" fill="#ffffff" />
        <circle cx="-5" cy="2" r="2.5" fill="#a29bfe" />
      </g>
      <g transform="translate(800, 415)">
        <circle cx="0" cy="0" r="2.8" fill="#ff7675" />
        <circle cx="5" cy="4" r="2.5" fill="#ffd166" />
      </g>
      <g transform="translate(1040, 420)">
        <circle cx="0" cy="0" r="3" fill="#ffffff" />
        <circle cx="-6" cy="3" r="2.5" fill="#74b9ff" />
        <circle cx="5" cy="4" r="2.8" fill="#fd79a8" />
      </g>
      <g transform="translate(620, 520)">
        <circle cx="0" cy="0" r="3.2" fill="#ffd166" />
        <circle cx="6" cy="2" r="2.5" fill="#ff7675" />
        <circle cx="-5" cy="4" r="2.5" fill="#ffffff" />
      </g>
    </g>
  );
}

/**
 * Çit (Seviye 9)
 * Ön tarafta alçak, samimi ahşap çit (patika geçişi açık)
 */
export function WoodenFence() {
  return (
    <g className={styles.fadeInElement} stroke="#462c16" strokeWidth="1.5" strokeLinejoin="round">
      {/* Sol Kanat Çit */}
      {/* Yatay kirişler */}
      <path d="M120 520 L490 528" stroke="#8d5b34" strokeWidth="4" />
      <path d="M120 538 L490 546" stroke="#8d5b34" strokeWidth="4" />
      {/* Dikey direkler */}
      {[130, 190, 250, 310, 370, 430, 485].map((x) => (
        <g key={`fence-l-${x}`}>
          <polygon points={`${x - 4},555 ${x - 4},512 ${x},502 ${x + 4},512 ${x + 4},555`} fill="#b88352" />
        </g>
      ))}

      {/* Sağ Kanat Çit */}
      {/* Yatay kirişler */}
      <path d="M555 548 L1080 525" stroke="#8d5b34" strokeWidth="4" />
      <path d="M555 566 L1080 543" stroke="#8d5b34" strokeWidth="4" />
      {/* Dikey direkler */}
      {[560, 620, 680, 740, 800, 860, 920, 980, 1040, 1075].map((x) => (
        <g key={`fence-r-${x}`}>
          <polygon points={`${x - 4},572 ${x - 4},529 ${x},519 ${x + 4},529 ${x + 4},572`} fill="#b88352" />
        </g>
      ))}
    </g>
  );
}

/**
 * Gölet (Seviye 25)
 * Sol ön tarafta sazlıkları ve nilüferleri olan parıltılı gölet
 */
export function Pond() {
  return (
    <g className={styles.fadeInElement}>
      {/* Gölet kıyısı / çamur çemberi */}
      <ellipse cx="140" cy="510" rx="90" ry="46" fill="#4d7852" opacity="0.5" />
      {/* Gölet suyu */}
      <ellipse cx="138" cy="508" rx="84" ry="40" fill="url(#garden-pond-grad)" stroke="#1a535c" strokeWidth="2" />
      {/* Su ışıltısı */}
      <ellipse cx="115" cy="498" rx="42" ry="16" fill="#ffffff" opacity="0.28" />

      {/* Nilüfer Yaprakları ve Çiçekler */}
      <g stroke="#1b4332" strokeWidth="1">
        {/* Yaprak 1 */}
        <path d="M100 505 C90 500 85 515 105 518 C115 518 118 510 100 505 Z" fill="#2d6a4f" />
        {/* Çiçek 1 */}
        <circle cx="106" cy="507" r="3.5" fill="#ff7675" />
        <circle cx="106" cy="507" r="1.5" fill="#ffeaa7" />

        {/* Yaprak 2 */}
        <path d="M165 520 C155 515 150 528 170 530 C180 530 182 522 165 520 Z" fill="#2d6a4f" />
        <circle cx="170" cy="522" r="3" fill="#ffffff" />
      </g>

      {/* Sazlıklar (Kıyı bitkileri) */}
      <g stroke="#2d6a4f" strokeWidth="2" strokeLinecap="round">
        <path d="M60 505 Q52 480 50 460" />
        <path d="M66 510 Q62 485 64 465" />
        <path d="M72 515 Q74 490 80 470" />
        {/* Kahverengi saz başları */}
        <ellipse cx="50" cy="465" rx="2.5" ry="7" fill="#603813" stroke="none" />
        <ellipse cx="64" cy="470" rx="2.5" ry="7" fill="#603813" stroke="none" />
      </g>
    </g>
  );
}

/**
 * Bank (Seviye 20)
 * Patika kenarında ahşap bahçe bankı
 */
export function ParkBench() {
  return (
    <g transform="translate(710, 385)" className={styles.fadeInElement} stroke="#3e2715" strokeWidth="1.5" strokeLinejoin="round">
      {/* Ayaklar */}
      <path d="M0 24 L2 40" stroke="#222" strokeWidth="3" />
      <path d="M42 24 L44 40" stroke="#222" strokeWidth="3" />
      <path d="M6 30 L40 30" stroke="#222" strokeWidth="2" />
      {/* Oturma tahtası */}
      <rect x="0" y="20" width="46" height="6" rx="2" fill="#b07d4b" />
      {/* Sırt tahtaları */}
      <rect x="2" y="8" width="44" height="5" rx="1.5" fill="#b07d4b" />
      <rect x="2" y="14" width="44" height="5" rx="1.5" fill="#b07d4b" />
      {/* Sırt dikmeleri */}
      <path d="M6 8 L6 20" stroke="#222" strokeWidth="2.5" />
      <path d="M40 8 L40 20" stroke="#222" strokeWidth="2.5" />
    </g>
  );
}

/**
 * Kuşlar ve Kuş Evi (Seviye 16)
 */
export function BirdsAndBirdhouse() {
  return (
    <g className={styles.fadeInElement}>
      {/* Gökyüzünde süzülen 2 zarif kuş (kanat çırpma animasyonlu) */}
      <g className={styles.birdFlock}>
        <path d="M380 130 Q390 120 400 130 Q410 120 420 130" stroke="#2c3e50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M430 145 Q438 137 446 145 Q454 137 462 145" stroke="#2c3e50" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* Ahşap Kuş Evi (Evin yanında direk üstünde) */}
      <g transform="translate(850, 275)" stroke="#3e2715" strokeWidth="1.5" strokeLinejoin="round">
        {/* Direk */}
        <line x1="12" y1="28" x2="12" y2="60" stroke="#6e4726" strokeWidth="3.5" />
        {/* Ev gövdesi */}
        <rect x="2" y="10" width="20" height="18" fill="#d49a6a" />
        {/* Çatı */}
        <polygon points="12,0 -2,11 26,11" fill="#a0402a" />
        {/* Yuva deliği */}
        <circle cx="12" cy="18" r="3.2" fill="#2d1c0e" stroke="none" />
        {/* Tüneme çubuğu */}
        <line x1="12" y1="23" x2="12" y2="26" stroke="#3e2715" strokeWidth="2" />
        {/* Üzerinde minik mavi kuş */}
        <circle cx="18" cy="7" r="3" fill="#3498db" stroke="#1d4a6e" strokeWidth="1" />
        <polygon points="21,7 24,8 21,9" fill="#f39c12" stroke="none" />
      </g>
    </g>
  );
}

/**
 * Kelebekler (Seviye 2)
 * Ağaçların arasında süzülen 3 neşeli kelebek
 */
export function Butterflies() {
  return (
    <g className={`${styles.fadeInElement} ${styles.butterflyGroup}`}>
      {/* Kelebek 1 (Sarı) */}
      <g transform="translate(310, 340)">
        <ellipse cx="-4" cy="-3" rx="4.5" ry="3.5" fill="#f1c40f" opacity="0.9" />
        <ellipse cx="4" cy="-3" rx="4.5" ry="3.5" fill="#f1c40f" opacity="0.9" />
        <ellipse cx="-3" cy="2" rx="3" ry="2.2" fill="#f39c12" />
        <ellipse cx="3" cy="2" rx="3" ry="2.2" fill="#f39c12" />
        <line x1="0" y1="-5" x2="0" y2="4" stroke="#2c3e50" strokeWidth="1" />
      </g>

      {/* Kelebek 2 (Mavi) */}
      <g transform="translate(680, 360)">
        <ellipse cx="-4" cy="-3" rx="4.5" ry="3.5" fill="#3498db" opacity="0.9" />
        <ellipse cx="4" cy="-3" rx="4.5" ry="3.5" fill="#3498db" opacity="0.9" />
        <ellipse cx="-3" cy="2" rx="3" ry="2.2" fill="#2980b9" />
        <ellipse cx="3" cy="2" rx="3" ry="2.2" fill="#2980b9" />
        <line x1="0" y1="-5" x2="0" y2="4" stroke="#2c3e50" strokeWidth="1" />
      </g>

      {/* Kelebek 3 (Pembe) */}
      <g transform="translate(860, 430)">
        <ellipse cx="-4" cy="-3" rx="4" ry="3" fill="#fd79a8" opacity="0.9" />
        <ellipse cx="4" cy="-3" rx="4" ry="3" fill="#fd79a8" opacity="0.9" />
        <ellipse cx="-2.5" cy="2" rx="2.5" ry="1.8" fill="#e84393" />
        <ellipse cx="2.5" cy="2" rx="2.5" ry="1.8" fill="#e84393" />
        <line x1="0" y1="-4" x2="0" y2="3" stroke="#2c3e50" strokeWidth="1" />
      </g>
    </g>
  );
}

/**
 * Küçük Ev (Seviye 12) & Ev Büyümesi (Seviye 31 - house2)
 * Tepede patikanın sonundaki sevimli köy evi
 */
export function VillageHouse({ upgraded }: { upgraded: boolean }) {
  return (
    <g transform="translate(900, 215)" className={styles.fadeInElement} stroke="#2d1c0e" strokeWidth="1.8" strokeLinejoin="round">
      {/* Baca */}
      <rect x="68" y="12" width="14" height="24" fill="#a0402a" />
      <rect x="66" y="8" width="18" height="5" rx="1" fill="#7a2a16" />

      {/* Seviye 31 (house2): Bacadan tüten duman bulutları */}
      {upgraded && (
        <g className={styles.smokePuff} stroke="none">
          <circle cx="75" cy="2" r="5" fill="#ffffff" opacity="0.6" />
          <circle cx="79" cy="-10" r="7.5" fill="#ffffff" opacity="0.5" />
          <circle cx="74" cy="-24" r="10" fill="#ffffff" opacity="0.35" />
        </g>
      )}

      {/* Evin Ana Gövdesi */}
      <rect x="15" y="36" width="76" height="58" fill="#fffdfa" />

      {/* Çatı */}
      <polygon points="53,2 4,40 102,40" fill="#c0392b" />
      <polygon points="53,2 6,38 100,38" fill="none" stroke="#e74c3c" strokeWidth="1.5" />

      {/* Kapı */}
      <path d="M43 62 L43 94 L63 94 L63 62 Q53 58 43 62 Z" fill="#8d5b34" />
      <circle cx="58" cy="78" r="1.8" fill="#f1c40f" stroke="none" />

      {/* Pencereler */}
      {/* Sol Pencere */}
      <rect x="22" y="52" width="15" height="18" rx="2" fill="#bbf2f6" />
      <line x1="29.5" y1="52" x2="29.5" y2="70" stroke="#2d1c0e" strokeWidth="1" />
      <line x1="22" y1="61" x2="37" y2="61" stroke="#2d1c0e" strokeWidth="1" />

      {/* Sağ Pencere */}
      <rect x="69" y="52" width="15" height="18" rx="2" fill="#bbf2f6" />
      <line x1="76.5" y1="52" x2="76.5" y2="70" stroke="#2d1c0e" strokeWidth="1" />
      <line x1="69" y1="61" x2="84" y2="61" stroke="#2d1c0e" strokeWidth="1" />

      {/* Seviye 31 (house2) Eklentileri: Çiçek kutuları ve paspas */}
      {upgraded && (
        <g>
          {/* Sol Pencere Çiçek Kutusu */}
          <rect x="20" y="69" width="19" height="6" rx="1.5" fill="#795548" />
          <circle cx="23" cy="68" r="2.5" fill="#ff7675" stroke="#c0392b" strokeWidth="0.8" />
          <circle cx="29" cy="67" r="2.5" fill="#ffd166" stroke="#f39c12" strokeWidth="0.8" />
          <circle cx="35" cy="68" r="2.5" fill="#fd79a8" stroke="#e84393" strokeWidth="0.8" />

          {/* Sağ Pencere Çiçek Kutusu */}
          <rect x="67" y="69" width="19" height="6" rx="1.5" fill="#795548" />
          <circle cx="70" cy="68" r="2.5" fill="#ff7675" stroke="#c0392b" strokeWidth="0.8" />
          <circle cx="76" cy="67" r="2.5" fill="#55efc4" stroke="#00b894" strokeWidth="0.8" />
          <circle cx="82" cy="68" r="2.5" fill="#ffd166" stroke="#f39c12" strokeWidth="0.8" />

          {/* Kapı Önü Taş Basamak / Paspas */}
          <rect x="40" y="93" width="26" height="4" rx="2" fill="#7f8c8d" />
        </g>
      )}
    </g>
  );
}

/**
 * Fenerler ve Işık Zinciri (Seviye 38)
 * Ev saçağında ve çit boyunca yumuşak parıldayan ışıklar
 */
export function FairyLights() {
  return (
    <g className={`${styles.fadeInElement} ${styles.twinkleLights}`}>
      {/* Ev Saçağındaki Işık Zinciri */}
      <path
        d="M908 252 Q928 260 953 252 Q978 260 998 252"
        fill="none"
        stroke="#4a4a4a"
        strokeWidth="1.2"
      />
      {[914, 926, 938, 950, 962, 974, 986, 994].map((lx, i) => (
        <circle
          key={`house-light-${lx}`}
          cx={lx}
          cy={254 + (i % 2 === 0 ? 3 : 1)}
          r="2.8"
          fill="#fff382"
          stroke="#e5b824"
          strokeWidth="0.8"
        />
      ))}

      {/* Çit Direklerindeki Küçük Fenerler */}
      <g stroke="#333" strokeWidth="1">
        {/* Sol Fener */}
        <g transform="translate(370, 498)">
          <line x1="0" y1="0" x2="0" y2="6" />
          <rect x="-4" y="6" width="8" height="11" rx="2" fill="#fff9db" />
          <circle cx="0" cy="11.5" r="2" fill="#ffd32a" stroke="none" />
        </g>
        {/* Sağ Fener */}
        <g transform="translate(680, 524)">
          <line x1="0" y1="0" x2="0" y2="6" />
          <rect x="-4" y="6" width="8" height="11" rx="2" fill="#fff9db" />
          <circle cx="0" cy="11.5" r="2" fill="#ffd32a" stroke="none" />
        </g>
      </g>
    </g>
  );
}

/**
 * Salıncak (Seviye 46)
 * Ahşap direkli veya ağaca asılı neşeli bahçe salıncağı
 */
export function GardenSwing() {
  return (
    <g transform="translate(240, 360)" className={styles.fadeInElement} stroke="#3e2715" strokeWidth="1.6" strokeLinejoin="round">
      {/* A-şekilli ahşap taşıyıcı direkler */}
      <line x1="0" y1="65" x2="16" y2="0" stroke="#795548" strokeWidth="3" />
      <line x1="32" y1="65" x2="16" y2="0" stroke="#795548" strokeWidth="3" />
      <line x1="5" y1="42" x2="27" y2="42" stroke="#795548" strokeWidth="2.5" />

      <line x1="60" y1="65" x2="44" y2="0" stroke="#795548" strokeWidth="3" />
      <line x1="28" y1="65" x2="44" y2="0" stroke="#795548" strokeWidth="3" />
      <line x1="33" y1="42" x2="55" y2="42" stroke="#795548" strokeWidth="2.5" />

      {/* Üst kiriş */}
      <line x1="10" y1="0" x2="50" y2="0" stroke="#5d4037" strokeWidth="4" strokeLinecap="round" />

      {/* Salıncak Halatları (Hafif sallanma animasyonu) */}
      <g className={styles.swingMotion}>
        <line x1="24" y1="2" x2="24" y2="44" stroke="#d7ccc8" strokeWidth="1.5" />
        <line x1="36" y1="2" x2="36" y2="44" stroke="#d7ccc8" strokeWidth="1.5" />
        {/* Tahta oturak */}
        <rect x="20" y="44" width="20" height="4" rx="1.5" fill="#a1887f" stroke="#3e2715" strokeWidth="1.2" />
      </g>
    </g>
  );
}

/**
 * Ana Manzara Katmanlarını Birleştiren Sahne Bileşeni
 */
export function GardenSceneLayers({ unlocked, children }: GardenSceneProps) {
  const hasButterflies = unlocked.has('butterflies');
  const hasPath = unlocked.has('path');
  const hasFlowers = unlocked.has('flowers');
  const hasFence = unlocked.has('fence');
  const hasHouse = unlocked.has('house');
  const hasBirds = unlocked.has('birds');
  const hasBench = unlocked.has('bench');
  const hasPond = unlocked.has('pond');
  const hasHouse2 = unlocked.has('house2');
  const hasLights = unlocked.has('lights');
  const hasSwing = unlocked.has('swing');
  const hasRainbow = unlocked.has('rainbow');

  return (
    <>
      <defs>
        {/* Gökyüzü Gradyanı */}
        <linearGradient id="garden-sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b6e0f8" />
          <stop offset="55%" stopColor="#dbf0fd" />
          <stop offset="100%" stopColor="#fef6e9" />
        </linearGradient>

        {/* Güneş Gradyanı */}
        <radialGradient id="garden-sun-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff9db" />
          <stop offset="80%" stopColor="#ffd166" />
          <stop offset="100%" stopColor="#fca311" />
        </radialGradient>

        {/* Uzak Tepe Gradyanı */}
        <linearGradient id="garden-hill-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#98c79f" />
          <stop offset="100%" stopColor="#7da883" />
        </linearGradient>

        {/* Orta Tepe Gradyanı */}
        <linearGradient id="garden-hill-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dbd85" />
          <stop offset="100%" stopColor="#639c6b" />
        </linearGradient>

        {/* Ana Çimen Gradyanı */}
        <linearGradient id="garden-grass-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60ad57" />
          <stop offset="35%" stopColor="#519e49" />
          <stop offset="100%" stopColor="#3d8236" />
        </linearGradient>

        {/* Patika Gradyanı */}
        <linearGradient id="garden-path-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dfbd8e" />
          <stop offset="100%" stopColor="#bf9967" />
        </linearGradient>

        {/* Gölet Su Gradyanı */}
        <linearGradient id="garden-pond-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#56ccf2" />
          <stop offset="100%" stopColor="#2f80ed" />
        </linearGradient>
      </defs>

      {/* 1. Gökyüzü ve Tepeler */}
      <SkyAndHills />

      {/* 2. Gökkuşağı (varsa) */}
      {hasRainbow && <Rainbow />}

      {/* 3. Patika (varsa) */}
      {hasPath && <DirtPath />}

      {/* 4. Ev (Küçük Ev veya Büyütülmüş Ev) */}
      {hasHouse && <VillageHouse upgraded={hasHouse2} />}

      {/* 5. Kuşlar ve Kuş Evi */}
      {hasBirds && <BirdsAndBirdhouse />}

      {/* 6. Bank */}
      {hasBench && <ParkBench />}

      {/* 7. Salıncak */}
      {hasSwing && <GardenSwing />}

      {/* 8. Ağaçlar ve Tabela Yuvaları (Derinlik Sırasıyla) */}
      {children}

      {/* 9. Kır Çiçekleri */}
      {hasFlowers && <Wildflowers />}

      {/* 10. Gölet */}
      {hasPond && <Pond />}

      {/* 11. Çit */}
      {hasFence && <WoodenFence />}

      {/* 12. Kelebekler */}
      {hasButterflies && <Butterflies />}

      {/* 13. Işıklar ve Fenerler */}
      {hasLights && <FairyLights />}
    </>
  );
}

