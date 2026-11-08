import { BoardEl, newId } from '../boardData';
import { LibraryItem } from './types';

// Ortak renk sabitleri
const COLOR_MAIN = '#1f2a24';
const COLOR_MUTED = '#c9c5b8';
const COLOR_FILL = '#25634b33';

function createText(
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  fontSize = 32,
  align: 'left' | 'center' | 'right' = 'center',
  italic = false
): BoardEl {
  return {
    id: newId(),
    type: 'note',
    variant: 'text',
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
    text,
    fontSize,
    align,
    italic,
    textColor: COLOR_MAIN,
    color: 'transparent',
    fontFamily: 'sans',
  };
}

// --------------------------------------------------------
// 1. Sayı doğrusu
// --------------------------------------------------------
export const numberLineItem: LibraryItem = {
  id: 'math.number-line',
  name: 'Sayı doğrusu',
  category: 'matematik',
  keywords: ['sayı', 'sayi', 'doğru', 'dogru', 'sayı doğrusu', 'tam sayı', 'pozitif', 'negatif', 'matematik'],
  params: [
    { key: 'baslangic', label: 'Başlangıç', type: 'number', min: -20, max: 20, default: 0 },
    { key: 'bitis', label: 'Bitiş', type: 'number', min: -20, max: 20, default: 10 },
    { key: 'adim', label: 'Adım', type: 'number', min: 1, max: 10, default: 1 },
  ],
  build: (params) => {
    const start = params?.baslangic ?? 0;
    let end = params?.bitis ?? 10;
    let step = Math.max(1, params?.adim ?? 1);

    if (start >= end) {
      end = start + 10;
    }
    // Çentik sayısı en fazla 41
    if ((end - start) / step > 40) {
      step = Math.ceil((end - start) / 40);
    }

    const count = Math.floor((end - start) / step);
    const els: BoardEl[] = [];
    const yLine = 30;
    const totalW = Math.max(400, Math.min(1200, count * 80 + 100));
    const startX = 50;
    const stepPx = (totalW - 100) / count;

    // Ana doğru (iki uçta ok)
    els.push({
      id: newId(),
      type: 'arrow',
      x1: 0,
      y1: yLine,
      x2: totalW,
      y2: yLine,
      color: COLOR_MAIN,
      width: 4,
    });
    els.push({
      id: newId(),
      type: 'arrow',
      x1: 60,
      y1: yLine,
      x2: 0,
      y2: yLine,
      color: COLOR_MAIN,
      width: 4,
    });

    for (let i = 0; i <= count; i++) {
      const val = start + i * step;
      const cx = Math.round(startX + i * stepPx);

      // Çentik
      els.push({
        id: newId(),
        type: 'line',
        x1: cx,
        y1: yLine - 12,
        x2: cx,
        y2: yLine + 12,
        color: COLOR_MAIN,
        width: 3,
      });

      // Etiket
      els.push(createText(cx - 30, yLine + 16, 60, 44, String(val), 28, 'center'));
    }

    return els;
  },
};

// --------------------------------------------------------
// 2. Koordinat düzlemi
// --------------------------------------------------------
export const coordinatePlaneItem: LibraryItem = {
  id: 'math.coord-plane',
  name: 'Koordinat düzlemi',
  category: 'matematik',
  keywords: ['koordinat', 'düzlem', 'duzlem', 'eksen', 'kartezyen', 'orijin', 'x', 'y', 'matematik'],
  params: [
    { key: 'aralik', label: 'Aralık (±)', type: 'number', min: 3, max: 10, default: 5 },
  ],
  build: (params) => {
    const range = Math.max(3, Math.min(10, Math.round(params?.aralik ?? 5)));
    const els: BoardEl[] = [];
    const step = 60;
    const size = range * 2 * step;
    const mid = size / 2;

    // Izgara çizgileri
    for (let i = 0; i <= range * 2; i++) {
      const pos = i * step;
      els.push({
        id: newId(),
        type: 'line',
        x1: pos,
        y1: 0,
        x2: pos,
        y2: size,
        color: COLOR_MUTED,
        width: 1,
      });
      els.push({
        id: newId(),
        type: 'line',
        x1: 0,
        y1: pos,
        x2: size,
        y2: pos,
        color: COLOR_MUTED,
        width: 1,
      });
    }

    // x ekseni (çift yönlü ok)
    els.push({
      id: newId(),
      type: 'arrow',
      x1: -20,
      y1: mid,
      x2: size + 30,
      y2: mid,
      color: COLOR_MAIN,
      width: 4,
    });
    els.push({
      id: newId(),
      type: 'arrow',
      x1: 20,
      y1: mid,
      x2: -20,
      y2: mid,
      color: COLOR_MAIN,
      width: 4,
    });

    // y ekseni (çift yönlü ok)
    els.push({
      id: newId(),
      type: 'arrow',
      x1: mid,
      y1: size + 20,
      x2: mid,
      y2: -30,
      color: COLOR_MAIN,
      width: 4,
    });
    els.push({
      id: newId(),
      type: 'arrow',
      x1: mid,
      y1: size - 20,
      x2: mid,
      y2: size + 20,
      color: COLOR_MAIN,
      width: 4,
    });

    // Eksen harfleri
    els.push(createText(size + 34, mid - 20, 30, 40, 'x', 28, 'left', true));
    els.push(createText(mid + 10, -44, 30, 40, 'y', 28, 'left', true));

    // ± uç etiketleri
    els.push(createText(-30, mid + 8, 50, 36, `-${range}`, 24, 'center'));
    els.push(createText(size - 20, mid + 8, 50, 36, `${range}`, 24, 'center'));
    els.push(createText(mid - 50, -18, 44, 36, `${range}`, 24, 'right'));
    els.push(createText(mid - 50, size - 18, 44, 36, `-${range}`, 24, 'right'));

    return els;
  },
};

// --------------------------------------------------------
// 3. Kesir pastası
// --------------------------------------------------------
export const fractionPieItem: LibraryItem = {
  id: 'math.fraction-pie',
  name: 'Kesir pastası',
  category: 'matematik',
  keywords: ['kesir', 'pay', 'payda', 'pasta', 'dilim', 'bütün', 'butun', 'oran', 'daire', 'matematik'],
  params: [
    { key: 'dilim', label: 'Dilim sayısı', type: 'number', min: 2, max: 12, default: 4 },
    { key: 'boyali', label: 'Boyalı dilim', type: 'number', min: 0, max: 12, default: 1 },
  ],
  build: (params) => {
    const dilim = Math.max(2, Math.min(12, Math.round(params?.dilim ?? 4)));
    const boyali = Math.max(0, Math.min(dilim, Math.round(params?.boyali ?? 1)));
    const els: BoardEl[] = [];
    const cx = 200;
    const cy = 200;
    const r = 180;

    for (let i = 0; i < dilim; i++) {
      const a1 = -Math.PI / 2 + (i * 2 * Math.PI) / dilim;
      const a2 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / dilim;
      const arcSteps = Math.max(10, Math.round(((a2 - a1) / Math.PI) * 45));
      const points: number[] = [cx, cy];

      for (let s = 0; s <= arcSteps; s++) {
        const t = s / arcSteps;
        const ang = a1 + t * (a2 - a1);
        points.push(Math.round(cx + r * Math.cos(ang)), Math.round(cy + r * Math.sin(ang)));
      }

      els.push({
        id: newId(),
        type: 'poly',
        points,
        color: COLOR_MAIN,
        width: 3,
        fill: i < boyali ? COLOR_FILL : null,
      });
    }

    // Kesir etiketi
    els.push(createText(cx - 60, cy + r + 18, 120, 58, `${boyali}/${dilim}`, 32, 'center'));

    return els;
  },
};

// --------------------------------------------------------
// 4. Kesir çubuğu
// --------------------------------------------------------
export const fractionBarItem: LibraryItem = {
  id: 'math.fraction-bar',
  name: 'Kesir çubuğu',
  category: 'matematik',
  keywords: ['kesir', 'çubuk', 'cubuk', 'kesir çubuğu', 'pay', 'payda', 'oran', 'parça', 'parca', 'matematik'],
  params: [
    { key: 'parca', label: 'Parça sayısı', type: 'number', min: 2, max: 12, default: 4 },
    { key: 'boyali', label: 'Boyalı parça', type: 'number', min: 0, max: 12, default: 1 },
  ],
  build: (params) => {
    const parca = Math.max(2, Math.min(12, Math.round(params?.parca ?? 4)));
    const boyali = Math.max(0, Math.min(parca, Math.round(params?.boyali ?? 1)));
    const els: BoardEl[] = [];
    const totalW = 720;
    const h = 80;

    for (let i = 0; i < parca; i++) {
      const x1 = Math.round((i * totalW) / parca);
      const x2 = Math.round(((i + 1) * totalW) / parca);
      els.push({
        id: newId(),
        type: 'rect',
        x1,
        y1: 0,
        x2,
        y2: h,
        color: COLOR_MAIN,
        width: 3,
        fill: i < boyali ? COLOR_FILL : null,
      });
    }

    els.push(createText(totalW / 2 - 60, h + 18, 120, 58, `${boyali}/${parca}`, 32, 'center'));

    return els;
  },
};

// --------------------------------------------------------
// 5. Kesir duvarı
// --------------------------------------------------------
export const fractionWallItem: LibraryItem = {
  id: 'math.fraction-wall',
  name: 'Kesir duvarı',
  category: 'matematik',
  keywords: ['kesir', 'duvar', 'kesir duvarı', 'kesir duvari', 'pay', 'payda', 'eşdeğer', 'esdeger', 'karşılaştırma', 'matematik'],
  params: [],
  build: () => {
    const rows = [1, 2, 3, 4, 5, 6, 8, 10];
    const totalW = 800;
    const rowH = 48;
    const els: BoardEl[] = [];

    rows.forEach((d, rIdx) => {
      const y1 = rIdx * rowH;
      const y2 = (rIdx + 1) * rowH;
      for (let j = 0; j < d; j++) {
        const x1 = Math.round((j * totalW) / d);
        const x2 = Math.round(((j + 1) * totalW) / d);
        const cellW = x2 - x1;

        els.push({
          id: newId(),
          type: 'rect',
          x1,
          y1,
          x2,
          y2,
          color: COLOR_MAIN,
          width: 2,
          fill: rIdx % 2 === 0 ? '#25634b15' : '#25634b28',
        });

        const label = d === 1 ? '1' : `1/${d}`;
        const fs = d > 6 ? 20 : 24;
        els.push(createText(x1, y1 + 6, cellW, rowH - 12, label, fs, 'center'));
      }
    });

    return els;
  },
};

// --------------------------------------------------------
// 6. Cetvel
// --------------------------------------------------------
export const rulerItem: LibraryItem = {
  id: 'math.ruler',
  name: 'Cetvel',
  category: 'matematik',
  keywords: ['cetvel', 'ölçüm', 'olcum', 'santimetre', 'cm', 'milimetre', 'mm', 'uzunluk', 'matematik'],
  params: [
    { key: 'cm', label: 'Uzunluk (cm)', type: 'number', min: 5, max: 20, default: 10 },
  ],
  build: (params) => {
    const cm = Math.max(5, Math.min(20, Math.round(params?.cm ?? 10)));
    const els: BoardEl[] = [];
    const pxPerCm = 60;
    const pad = 20;
    const totalW = cm * pxPerCm + pad * 2;
    const bodyH = 120;

    // Gövde
    els.push({
      id: newId(),
      type: 'rect',
      x1: 0,
      y1: 0,
      x2: totalW,
      y2: bodyH,
      color: COLOR_MAIN,
      width: 3,
      fill: '#faf8f2',
    });

    for (let c = 0; c <= cm; c++) {
      const cx = pad + c * pxPerCm;

      // cm çentiği
      els.push({
        id: newId(),
        type: 'line',
        x1: cx,
        y1: 0,
        x2: cx,
        y2: 38,
        color: COLOR_MAIN,
        width: 3,
      });

      // cm sayısı
      els.push(createText(cx - 20, 44, 40, 40, String(c), 26, 'center'));

      // Milimetre çentikleri
      if (c < cm) {
        for (let m = 1; m < 10; m++) {
          const mx = Math.round(cx + (m * pxPerCm) / 10);
          const isMid = m === 5;
          els.push({
            id: newId(),
            type: 'line',
            x1: mx,
            y1: 0,
            x2: mx,
            y2: isMid ? 24 : 14,
            color: COLOR_MAIN,
            width: isMid ? 2 : 1,
          });
        }
      }
    }

    return els;
  },
};

// --------------------------------------------------------
// 7. Açıölçer
// --------------------------------------------------------
export const protractorItem: LibraryItem = {
  id: 'math.protractor',
  name: 'Açıölçer',
  category: 'matematik',
  keywords: ['açıölçer', 'aciolcer', 'iletki', 'açı', 'aci', 'derece', 'geometri', 'matematik'],
  params: [],
  build: () => {
    const els: BoardEl[] = [];
    const cx = 320;
    const cy = 320;
    const r = 300;

    // Yarım daire yayı (180° -> 0°)
    const arcPoints: number[] = [];
    for (let deg = 180; deg >= 0; deg -= 3) {
      const rad = (deg * Math.PI) / 180;
      arcPoints.push(Math.round(cx - r * Math.cos(rad)), Math.round(cy - r * Math.sin(rad)));
    }
    els.push({
      id: newId(),
      type: 'stroke',
      points: arcPoints,
      color: COLOR_MAIN,
      width: 4,
    });

    // Taban çizgisi
    els.push({
      id: newId(),
      type: 'line',
      x1: cx - r,
      y1: cy,
      x2: cx + r,
      y2: cy,
      color: COLOR_MAIN,
      width: 4,
    });

    // Merkez artı işareti
    els.push({
      id: newId(),
      type: 'line',
      x1: cx - 14,
      y1: cy,
      x2: cx + 14,
      y2: cy,
      color: COLOR_MAIN,
      width: 2,
    });
    els.push({
      id: newId(),
      type: 'line',
      x1: cx,
      y1: cy - 14,
      x2: cx,
      y2: cy,
      color: COLOR_MAIN,
      width: 2,
    });

    // Çentikler (her 5°'de bir, 10°'de uzun)
    for (let deg = 0; deg <= 180; deg += 5) {
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const is10 = deg % 10 === 0;
      const rInner = is10 ? 275 : 287;

      els.push({
        id: newId(),
        type: 'line',
        x1: Math.round(cx - rInner * cos),
        y1: Math.round(cy - rInner * sin),
        x2: Math.round(cx - r * cos),
        y2: Math.round(cy - r * sin),
        color: COLOR_MAIN,
        width: is10 ? 2 : 1,
      });
    }

    // 0–180 etiketleri (her 30°'de)
    for (let deg = 0; deg <= 180; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Dış sıra (0–180)
      const rOut = 248;
      const ox = Math.round(cx - rOut * cos);
      const oy = Math.round(cy - rOut * sin);
      els.push(createText(ox - 24, oy - 14, 48, 30, String(deg), 22, 'center'));

      // İç sıra (180–0)
      const rIn = 212;
      const ix = Math.round(cx - rIn * cos);
      const iy = Math.round(cy - rIn * sin);
      els.push(createText(ix - 22, iy - 12, 44, 26, String(180 - deg), 18, 'center'));
    }

    return els;
  },
};

// --------------------------------------------------------
// 8. Açı
// --------------------------------------------------------
export const angleItem: LibraryItem = {
  id: 'math.angle',
  name: 'Açı',
  category: 'matematik',
  keywords: ['açı', 'aci', 'derece', 'ışın', 'isin', 'dar açı', 'geniş açı', 'dik açı', 'geometri', 'matematik'],
  params: [
    { key: 'derece', label: 'Derece', type: 'number', min: 10, max: 170, default: 60 },
  ],
  build: (params) => {
    const derece = Math.max(10, Math.min(170, Math.round(params?.derece ?? 60)));
    const els: BoardEl[] = [];
    const ox = 80;
    const oy = 280;
    const len = 240;

    // Yatay ışın
    els.push({
      id: newId(),
      type: 'arrow',
      x1: ox,
      y1: oy,
      x2: ox + len,
      y2: oy,
      color: COLOR_MAIN,
      width: 4,
    });

    // Açılı ışın
    const rad = (derece * Math.PI) / 180;
    els.push({
      id: newId(),
      type: 'arrow',
      x1: ox,
      y1: oy,
      x2: Math.round(ox + len * Math.cos(rad)),
      y2: Math.round(oy - len * Math.sin(rad)),
      color: COLOR_MAIN,
      width: 4,
    });

    // Açı yayı
    const rArc = 70;
    const arcPoints: number[] = [];
    for (let a = 0; a <= derece; a += 3) {
      const aRad = (a * Math.PI) / 180;
      arcPoints.push(Math.round(ox + rArc * Math.cos(aRad)), Math.round(oy - rArc * Math.sin(aRad)));
    }
    // Son noktayı garanti ekle
    arcPoints.push(Math.round(ox + rArc * Math.cos(rad)), Math.round(oy - rArc * Math.sin(rad)));

    els.push({
      id: newId(),
      type: 'stroke',
      points: arcPoints,
      color: '#25634b',
      width: 3,
    });

    // Derece etiketi
    const midRad = rad / 2;
    const rText = 110;
    const tx = Math.round(ox + rText * Math.cos(midRad));
    const ty = Math.round(oy - rText * Math.sin(midRad));
    els.push(createText(tx - 40, ty - 20, 80, 48, `${derece}°`, 30, 'center'));

    return els;
  },
};

// --------------------------------------------------------
// 9. Üçgenler (5 ayrı parça)
// --------------------------------------------------------
export const triangleEquilateralItem: LibraryItem = {
  id: 'math.triangle-equilateral',
  name: 'Eşkenar üçgen',
  category: 'matematik',
  keywords: ['üçgen', 'ucgen', 'eşkenar', 'eskenar', 'eşkenar üçgen', 'geometri', 'matematik'],
  params: [],
  build: () => [
    {
      id: newId(),
      type: 'poly',
      points: [200, 40, 40, 317, 360, 317],
      color: COLOR_MAIN,
      width: 4,
      fill: null,
    },
    createText(175, -2, 50, 44, 'A', 32, 'center'),
    createText(10, 325, 50, 44, 'B', 32, 'center'),
    createText(340, 325, 50, 44, 'C', 32, 'center'),
  ],
};

export const triangleIsoscelesItem: LibraryItem = {
  id: 'math.triangle-isosceles',
  name: 'İkizkenar üçgen',
  category: 'matematik',
  keywords: ['üçgen', 'ucgen', 'ikizkenar', 'ikizkenar üçgen', 'geometri', 'matematik'],
  params: [],
  build: () => [
    {
      id: newId(),
      type: 'poly',
      points: [180, 40, 60, 340, 300, 340],
      color: COLOR_MAIN,
      width: 4,
      fill: null,
    },
    createText(155, -2, 50, 44, 'A', 32, 'center'),
    createText(30, 345, 50, 44, 'B', 32, 'center'),
    createText(280, 345, 50, 44, 'C', 32, 'center'),
  ],
};

export const triangleRightItem: LibraryItem = {
  id: 'math.triangle-right',
  name: 'Dik üçgen',
  category: 'matematik',
  keywords: ['üçgen', 'ucgen', 'dik', 'dik üçgen', 'pisagor', 'hipotenüs', 'geometri', 'matematik'],
  params: [],
  build: () => [
    {
      id: newId(),
      type: 'poly',
      points: [60, 40, 60, 320, 400, 320],
      color: COLOR_MAIN,
      width: 4,
      fill: null,
    },
    // Dik açı karesi
    {
      id: newId(),
      type: 'line',
      x1: 60,
      y1: 292,
      x2: 88,
      y2: 292,
      color: COLOR_MAIN,
      width: 2,
    },
    {
      id: newId(),
      type: 'line',
      x1: 88,
      y1: 292,
      x2: 88,
      y2: 320,
      color: COLOR_MAIN,
      width: 2,
    },
    {
      id: newId(),
      type: 'ellipse',
      x1: 72,
      y1: 304,
      x2: 76,
      y2: 308,
      color: COLOR_MAIN,
      width: 1,
      fill: COLOR_MAIN,
    },
    createText(35, -2, 50, 44, 'A', 32, 'center'),
    createText(20, 325, 50, 44, 'B', 32, 'center'),
    createText(380, 325, 50, 44, 'C', 32, 'center'),
  ],
};

export const triangleScaleneItem: LibraryItem = {
  id: 'math.triangle-scalene',
  name: 'Çeşitkenar üçgen',
  category: 'matematik',
  keywords: ['üçgen', 'ucgen', 'çeşitkenar', 'cesitkenar', 'çeşitkenar üçgen', 'geometri', 'matematik'],
  params: [],
  build: () => [
    {
      id: newId(),
      type: 'poly',
      points: [140, 40, 40, 300, 380, 260],
      color: COLOR_MAIN,
      width: 4,
      fill: null,
    },
    createText(115, -2, 50, 44, 'A', 32, 'center'),
    createText(10, 305, 50, 44, 'B', 32, 'center'),
    createText(385, 250, 50, 44, 'C', 32, 'center'),
  ],
};

export const triangleObtuseItem: LibraryItem = {
  id: 'math.triangle-obtuse',
  name: 'Geniş açılı üçgen',
  category: 'matematik',
  keywords: ['üçgen', 'ucgen', 'geniş açılı', 'genis acili', 'geniş açılı üçgen', 'geometri', 'matematik'],
  params: [],
  build: () => [
    {
      id: newId(),
      type: 'poly',
      points: [60, 60, 160, 280, 440, 280],
      color: COLOR_MAIN,
      width: 4,
      fill: null,
    },
    createText(35, 16, 50, 44, 'A', 32, 'center'),
    createText(135, 288, 50, 44, 'B', 32, 'center'),
    createText(420, 288, 50, 44, 'C', 32, 'center'),
  ],
};

// --------------------------------------------------------
// 10. Dörtgenler (5 ayrı parça)
// --------------------------------------------------------
export const squareItem: LibraryItem = {
  id: 'math.quad-square',
  name: 'Kare',
  category: 'matematik',
  keywords: ['kare', 'dörtgen', 'dortgen', 'geometri', 'dik açı', 'kenar', 'alan', 'çevre', 'matematik'],
  params: [],
  build: () => {
    const els: BoardEl[] = [];
    els.push({
      id: newId(),
      type: 'poly',
      points: [60, 60, 300, 60, 300, 300, 60, 300],
      color: COLOR_MAIN,
      width: 4,
      fill: null,
    });
    // Dik açı işaretleri
    const s = 20;
    // A
    els.push({ id: newId(), type: 'line', x1: 60, y1: 60 + s, x2: 60 + s, y2: 60 + s, color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'line', x1: 60 + s, y1: 60 + s, x2: 60 + s, y2: 60, color: COLOR_MAIN, width: 2 });
    // B
    els.push({ id: newId(), type: 'line', x1: 300 - s, y1: 60, x2: 300 - s, y2: 60 + s, color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'line', x1: 300 - s, y1: 60 + s, x2: 300, y2: 60 + s, color: COLOR_MAIN, width: 2 });
    // C
    els.push({ id: newId(), type: 'line', x1: 300, y1: 300 - s, x2: 300 - s, y2: 300 - s, color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'line', x1: 300 - s, y1: 300 - s, x2: 300 - s, y2: 300, color: COLOR_MAIN, width: 2 });
    // D
    els.push({ id: newId(), type: 'line', x1: 60, y1: 300 - s, x2: 60 + s, y2: 300 - s, color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'line', x1: 60 + s, y1: 300 - s, x2: 60 + s, y2: 300, color: COLOR_MAIN, width: 2 });

    // Etiketler
    els.push(createText(35, 16, 50, 44, 'A', 32, 'center'));
    els.push(createText(285, 16, 50, 44, 'B', 32, 'center'));
    els.push(createText(285, 308, 50, 44, 'C', 32, 'center'));
    els.push(createText(35, 308, 50, 44, 'D', 32, 'center'));
    return els;
  },
};

export const rectangleItem: LibraryItem = {
  id: 'math.quad-rectangle',
  name: 'Dikdörtgen',
  category: 'matematik',
  keywords: ['dikdörtgen', 'dikdortgen', 'dörtgen', 'geometri', 'kenar', 'alan', 'çevre', 'matematik'],
  params: [],
  build: () => {
    const els: BoardEl[] = [];
    els.push({
      id: newId(),
      type: 'poly',
      points: [60, 60, 420, 60, 420, 260, 60, 260],
      color: COLOR_MAIN,
      width: 4,
      fill: null,
    });
    // Dik açı işaretleri
    const s = 20;
    els.push({ id: newId(), type: 'line', x1: 60, y1: 60 + s, x2: 60 + s, y2: 60 + s, color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'line', x1: 60 + s, y1: 60 + s, x2: 60 + s, y2: 60, color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'line', x1: 420 - s, y1: 60, x2: 420 - s, y2: 60 + s, color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'line', x1: 420 - s, y1: 60 + s, x2: 420, y2: 60 + s, color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'line', x1: 420, y1: 260 - s, x2: 420 - s, y2: 260 - s, color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'line', x1: 420 - s, y1: 260 - s, x2: 420 - s, y2: 260, color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'line', x1: 60, y1: 260 - s, x2: 60 + s, y2: 260 - s, color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'line', x1: 60 + s, y1: 260 - s, x2: 60 + s, y2: 260, color: COLOR_MAIN, width: 2 });

    // Etiketler
    els.push(createText(35, 16, 50, 44, 'A', 32, 'center'));
    els.push(createText(405, 16, 50, 44, 'B', 32, 'center'));
    els.push(createText(405, 268, 50, 44, 'C', 32, 'center'));
    els.push(createText(35, 268, 50, 44, 'D', 32, 'center'));
    return els;
  },
};

export const parallelogramItem: LibraryItem = {
  id: 'math.quad-parallelogram',
  name: 'Paralelkenar',
  category: 'matematik',
  keywords: ['paralelkenar', 'dörtgen', 'geometri', 'paralel', 'kenar', 'matematik'],
  params: [],
  build: () => [
    {
      id: newId(),
      type: 'poly',
      points: [120, 60, 420, 60, 360, 260, 60, 260],
      color: COLOR_MAIN,
      width: 4,
      fill: null,
    },
    createText(95, 16, 50, 44, 'A', 32, 'center'),
    createText(405, 16, 50, 44, 'B', 32, 'center'),
    createText(345, 268, 50, 44, 'C', 32, 'center'),
    createText(35, 268, 50, 44, 'D', 32, 'center'),
  ],
};

export const trapezoidItem: LibraryItem = {
  id: 'math.quad-trapezoid',
  name: 'Yamuk',
  category: 'matematik',
  keywords: ['yamuk', 'dörtgen', 'geometri', 'alt taban', 'üst taban', 'matematik'],
  params: [],
  build: () => [
    {
      id: newId(),
      type: 'poly',
      points: [140, 60, 340, 60, 420, 260, 60, 260],
      color: COLOR_MAIN,
      width: 4,
      fill: null,
    },
    createText(115, 16, 50, 44, 'A', 32, 'center'),
    createText(325, 16, 50, 44, 'B', 32, 'center'),
    createText(405, 268, 50, 44, 'C', 32, 'center'),
    createText(35, 268, 50, 44, 'D', 32, 'center'),
  ],
};

export const rhombusItem: LibraryItem = {
  id: 'math.quad-rhombus',
  name: 'Eşkenar dörtgen',
  category: 'matematik',
  keywords: ['eşkenar dörtgen', 'eskenar dortgen', 'baklava', 'romb', 'dörtgen', 'geometri', 'matematik'],
  params: [],
  build: () => [
    {
      id: newId(),
      type: 'poly',
      points: [220, 40, 380, 180, 220, 320, 60, 180],
      color: COLOR_MAIN,
      width: 4,
      fill: null,
    },
    createText(195, -4, 50, 44, 'A', 32, 'center'),
    createText(385, 160, 50, 44, 'B', 32, 'center'),
    createText(195, 326, 50, 44, 'C', 32, 'center'),
    createText(30, 160, 50, 44, 'D', 32, 'center'),
  ],
};

// --------------------------------------------------------
// 11. Çember
// --------------------------------------------------------
export const circleItem: LibraryItem = {
  id: 'math.circle',
  name: 'Çember',
  category: 'matematik',
  keywords: ['çember', 'cember', 'daire', 'yarıçap', 'yaricap', 'merkez', 'orijin', 'çap', 'geometri', 'matematik'],
  params: [],
  build: () => {
    const cx = 240;
    const cy = 240;
    const r = 200;
    return [
      // Çember çizgisi
      {
        id: newId(),
        type: 'ellipse',
        x1: cx - r,
        y1: cy - r,
        x2: cx + r,
        y2: cy + r,
        color: COLOR_MAIN,
        width: 4,
        fill: null,
      },
      // Merkez noktası
      {
        id: newId(),
        type: 'ellipse',
        x1: cx - 4,
        y1: cy - 4,
        x2: cx + 4,
        y2: cy + 4,
        color: COLOR_MAIN,
        width: 1,
        fill: COLOR_MAIN,
      },
      // Merkez etiketi "O"
      createText(cx - 36, cy - 36, 40, 40, 'O', 28, 'center'),
      // Yarıçap çizgisi
      {
        id: newId(),
        type: 'line',
        x1: cx,
        y1: cy,
        x2: cx + r,
        y2: cy,
        color: COLOR_MAIN,
        width: 3,
      },
      // Yarıçap etiketi "r"
      createText(cx + r / 2 - 20, cy - 38, 40, 40, 'r', 28, 'center', true),
    ];
  },
};

// --------------------------------------------------------
// 12. Onluk taban blokları (3 ayrı parça)
// --------------------------------------------------------
export const baseTenUnitItem: LibraryItem = {
  id: 'math.base-ten-unit',
  name: 'Onluk blok: Birlik',
  category: 'matematik',
  keywords: ['onluk blok', 'birlik', 'taban blokları', 'sayı basamağı', 'basamak', 'matematik'],
  params: [],
  build: () => [
    {
      id: newId(),
      type: 'rect',
      x1: 0,
      y1: 0,
      x2: 40,
      y2: 40,
      color: COLOR_MAIN,
      width: 2,
      fill: COLOR_FILL,
    },
    createText(-5, 48, 50, 40, '1', 26, 'center'),
  ],
};

export const baseTenRodItem: LibraryItem = {
  id: 'math.base-ten-rod',
  name: 'Onluk blok: Onluk',
  category: 'matematik',
  keywords: ['onluk blok', 'onluk', 'taban blokları', 'sayı basamağı', 'basamak', 'matematik'],
  params: [],
  build: () => {
    const els: BoardEl[] = [];
    for (let i = 0; i < 10; i++) {
      els.push({
        id: newId(),
        type: 'rect',
        x1: 0,
        y1: i * 40,
        x2: 40,
        y2: (i + 1) * 40,
        color: COLOR_MAIN,
        width: 2,
        fill: COLOR_FILL,
      });
    }
    els.push(createText(-5, 408, 50, 40, '10', 26, 'center'));
    return els;
  },
};

export const baseTenFlatItem: LibraryItem = {
  id: 'math.base-ten-flat',
  name: 'Onluk blok: Yüzlük',
  category: 'matematik',
  keywords: ['onluk blok', 'yüzlük', 'yuzluk', 'taban blokları', 'sayı basamağı', 'basamak', 'matematik'],
  params: [],
  build: () => {
    const els: BoardEl[] = [];
    els.push({
      id: newId(),
      type: 'rect',
      x1: 0,
      y1: 0,
      x2: 400,
      y2: 400,
      color: COLOR_MAIN,
      width: 3,
      fill: COLOR_FILL,
    });
    for (let i = 1; i < 10; i++) {
      els.push({
        id: newId(),
        type: 'line',
        x1: i * 40,
        y1: 0,
        x2: i * 40,
        y2: 400,
        color: COLOR_MAIN,
        width: 1,
      });
      els.push({
        id: newId(),
        type: 'line',
        x1: 0,
        y1: i * 40,
        x2: 400,
        y2: i * 40,
        color: COLOR_MAIN,
        width: 1,
      });
    }
    els.push(createText(175, 408, 50, 40, '100', 26, 'center'));
    return els;
  },
};

// --------------------------------------------------------
// 13. Yüzlük sayı tablosu
// --------------------------------------------------------
export const hundredChartItem: LibraryItem = {
  id: 'math.hundred-chart',
  name: 'Yüzlük sayı tablosu',
  category: 'matematik',
  keywords: ['yüzlük tablo', 'yuzluk tablo', 'sayı tablosu', 'sayi tablosu', '1-100', 'sayılar', 'matematik'],
  params: [],
  build: () => {
    const els: BoardEl[] = [];
    const size = 720;
    const cell = 72;

    // Dış çerçeve
    els.push({
      id: newId(),
      type: 'rect',
      x1: 0,
      y1: 0,
      x2: size,
      y2: size,
      color: COLOR_MAIN,
      width: 3,
      fill: '#ffffff',
    });

    // Izgara çizgileri
    for (let i = 1; i < 10; i++) {
      const pos = i * cell;
      els.push({
        id: newId(),
        type: 'line',
        x1: pos,
        y1: 0,
        x2: pos,
        y2: size,
        color: COLOR_MUTED,
        width: 1,
      });
      els.push({
        id: newId(),
        type: 'line',
        x1: 0,
        y1: pos,
        x2: size,
        y2: pos,
        color: COLOR_MUTED,
        width: 1,
      });
    }

    // 1–100 sayıları
    for (let n = 1; n <= 100; n++) {
      const col = (n - 1) % 10;
      const row = Math.floor((n - 1) / 10);
      const cx = col * cell + cell / 2;
      const cy = row * cell + 16;
      els.push(createText(cx - 32, cy, 64, 44, String(n), 26, 'center'));
    }

    return els;
  },
};

// --------------------------------------------------------
// 14. Saat
// --------------------------------------------------------
export const clockItem: LibraryItem = {
  id: 'math.clock',
  name: 'Saat',
  category: 'matematik',
  keywords: ['saat', 'zaman', 'kadran', 'akrep', 'yelkovan', 'dakika', 'geometri', 'matematik'],
  params: [
    { key: 'saat', label: 'Saat', type: 'number', min: 1, max: 12, default: 3 },
    { key: 'dakika', label: 'Dakika', type: 'number', min: 0, max: 55, step: 5, default: 0 },
  ],
  build: (params) => {
    const saat = Math.max(1, Math.min(12, Math.round(params?.saat ?? 3)));
    const dakika = Math.max(0, Math.min(55, Math.round(params?.dakika ?? 0)));
    const els: BoardEl[] = [];
    const cx = 240;
    const cy = 240;
    const r = 220;

    // Dış kadran
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: cx - r,
      y1: cy - r,
      x2: cx + r,
      y2: cy + r,
      color: COLOR_MAIN,
      width: 4,
      fill: '#ffffff',
    });

    // 60 dakika çentiği
    for (let i = 0; i < 60; i++) {
      const isHour = i % 5 === 0;
      const rad = (i * 6 * Math.PI) / 180;
      const sin = Math.sin(rad);
      const cos = Math.cos(rad);
      const rInner = isHour ? 204 : 212;

      els.push({
        id: newId(),
        type: 'line',
        x1: Math.round(cx + rInner * sin),
        y1: Math.round(cy - rInner * cos),
        x2: Math.round(cx + r * sin),
        y2: Math.round(cy - r * cos),
        color: COLOR_MAIN,
        width: isHour ? 3 : 1,
      });
    }

    // 12 saat sayısı
    for (let n = 1; n <= 12; n++) {
      const rad = (n * 30 * Math.PI) / 180;
      const nx = Math.round(cx + 172 * Math.sin(rad));
      const ny = Math.round(cy - 172 * Math.cos(rad));
      els.push(createText(nx - 25, ny - 20, 50, 44, String(n), 32, 'center'));
    }

    // Merkez pimi
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: cx - 6,
      y1: cy - 6,
      x2: cx + 6,
      y2: cy + 6,
      color: COLOR_MAIN,
      width: 2,
      fill: COLOR_MAIN,
    });

    // Akrep (saat ibresi)
    const hourAng = ((saat % 12) + dakika / 60) * 30 * (Math.PI / 180);
    const rHour = 105;
    els.push({
      id: newId(),
      type: 'arrow',
      x1: cx,
      y1: cy,
      x2: Math.round(cx + rHour * Math.sin(hourAng)),
      y2: Math.round(cy - rHour * Math.cos(hourAng)),
      color: COLOR_MAIN,
      width: 6,
    });

    // Yelkovan (dakika ibresi)
    const minAng = dakika * 6 * (Math.PI / 180);
    const rMin = 155;
    els.push({
      id: newId(),
      type: 'arrow',
      x1: cx,
      y1: cy,
      x2: Math.round(cx + rMin * Math.sin(minAng)),
      y2: Math.round(cy - rMin * Math.cos(minAng)),
      color: COLOR_MAIN,
      width: 4,
    });

    return els;
  },
};

// --------------------------------------------------------
// Genel kategori örnekleri
// --------------------------------------------------------
export const speechBubbleItem: LibraryItem = {
  id: 'general.speech-bubble',
  name: 'Konuşma balonu',
  category: 'genel',
  keywords: ['konuşma', 'konusma', 'balon', 'balonu', 'mesaj', 'diyalog', 'genel', 'metin', 'yazı'],
  build: () => {
    const els: BoardEl[] = [];

    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 10,
      y1: 10,
      x2: 370,
      y2: 210,
      color: COLOR_MAIN,
      width: 4,
      fill: '#ffffff',
    });

    els.push({
      id: newId(),
      type: 'line',
      x1: 75,
      y1: 195,
      x2: 20,
      y2: 260,
      color: COLOR_MAIN,
      width: 4,
    });
    els.push({
      id: newId(),
      type: 'line',
      x1: 130,
      y1: 205,
      x2: 20,
      y2: 260,
      color: COLOR_MAIN,
      width: 4,
    });

    els.push({
      id: newId(),
      type: 'note',
      variant: 'text',
      x: 40,
      y: 75,
      w: 300,
      h: 60,
      text: 'Yazınız…',
      fontFamily: 'hand',
      fontSize: 36,
      align: 'center',
      textColor: COLOR_MAIN,
      color: 'transparent',
    });

    return els;
  },
};
