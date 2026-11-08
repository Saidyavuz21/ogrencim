import { BoardEl, newId, PolyEl, StrokeEl } from '../boardData';
import { LibraryItem } from './types';

export const COLOR_MAIN = '#1f2a24';
export const COLOR_MUTED = '#c9c5b8';
export const COLOR_FILL_GREEN = '#25634b33';
export const COLOR_FILL_BLUE = '#1971c233';
export const COLOR_FILL_RED = '#e0313133';
export const COLOR_FILL_YELLOW = '#f08c0033';

export function createText(
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  fontSize = 32,
  align: 'left' | 'center' | 'right' = 'center',
  italic = false,
  fontFamily: 'sans' | 'hand' | 'display' = 'sans',
  textColor = COLOR_MAIN,
  fontWeight?: 300 | 400 | 700
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
    fontFamily,
    fontWeight,
    textColor,
    color: 'transparent',
  };
}

// --------------------------------------------------------
// 1. Devre Elemanları: Pil
// --------------------------------------------------------
export const batteryItem: LibraryItem = {
  id: 'science.battery',
  name: 'Pil',
  category: 'fen',
  keywords: ['pil', 'batarya', 'güç kaynağı', 'guc kaynagi', 'devre', 'elektrik', 'fen', 'fizik', 'voltaj'],
  build: () => {
    const els: BoardEl[] = [];
    // Sol tel
    els.push({ id: newId(), type: 'line', x1: 10, y1: 60, x2: 85, y2: 60, color: COLOR_MAIN, width: 4 });
    // Pozitif plaka (+)
    els.push({ id: newId(), type: 'line', x1: 85, y1: 20, x2: 85, y2: 100, color: COLOR_MAIN, width: 4 });
    // Negatif plaka (−)
    els.push({ id: newId(), type: 'line', x1: 115, y1: 35, x2: 115, y2: 85, color: COLOR_MAIN, width: 8 });
    // Sağ tel
    els.push({ id: newId(), type: 'line', x1: 115, y1: 60, x2: 190, y2: 60, color: COLOR_MAIN, width: 4 });

    // "+" ve "−" işaretleri
    els.push(createText(65, 5, 40, 28, '+', 28, 'center', false, 'sans', COLOR_MAIN, 700));
    els.push(createText(115, 5, 40, 28, '−', 28, 'center', false, 'sans', COLOR_MAIN, 700));

    // Altta ad
    els.push(createText(10, 115, 180, 36, 'Pil', 26, 'center'));
    return els;
  },
};

// --------------------------------------------------------
// 2. Devre Elemanları: Ampul
// --------------------------------------------------------
export const bulbItem: LibraryItem = {
  id: 'science.bulb',
  name: 'Ampul',
  category: 'fen',
  keywords: ['ampul', 'lamba', 'ışık', 'isik', 'aydınlatma', 'devre', 'elektrik', 'fen', 'fizik'],
  build: () => {
    const els: BoardEl[] = [];
    // Sol tel
    els.push({ id: newId(), type: 'line', x1: 10, y1: 60, x2: 65, y2: 60, color: COLOR_MAIN, width: 4 });
    // Daire
    els.push({ id: newId(), type: 'ellipse', x1: 65, y1: 25, x2: 135, y2: 95, color: COLOR_MAIN, width: 4, fill: '#f08c0022' });
    // İçte çarpı
    els.push({ id: newId(), type: 'line', x1: 75, y1: 35, x2: 125, y2: 85, color: COLOR_MAIN, width: 3 });
    els.push({ id: newId(), type: 'line', x1: 75, y1: 85, x2: 125, y2: 35, color: COLOR_MAIN, width: 3 });
    // Sağ tel
    els.push({ id: newId(), type: 'line', x1: 135, y1: 60, x2: 190, y2: 60, color: COLOR_MAIN, width: 4 });
    // Altta ad
    els.push(createText(10, 115, 180, 36, 'Ampul', 26, 'center'));
    return els;
  },
};

// --------------------------------------------------------
// 3. Devre Elemanları: Anahtar (açık)
// --------------------------------------------------------
export const switchItem: LibraryItem = {
  id: 'science.switch',
  name: 'Anahtar (açık)',
  category: 'fen',
  keywords: ['anahtar', 'anahtar açık', 'anahtar acik', 'devre anahtarı', 'devre', 'elektrik', 'fen', 'fizik'],
  build: () => {
    const els: BoardEl[] = [];
    // Sol tel
    els.push({ id: newId(), type: 'line', x1: 10, y1: 70, x2: 65, y2: 70, color: COLOR_MAIN, width: 4 });
    // Sol terminal noktası
    els.push({ id: newId(), type: 'ellipse', x1: 65, y1: 64, x2: 77, y2: 76, color: COLOR_MAIN, width: 3, fill: COLOR_MAIN });
    // Sağ terminal noktası
    els.push({ id: newId(), type: 'ellipse', x1: 133, y1: 64, x2: 145, y2: 76, color: COLOR_MAIN, width: 3, fill: COLOR_MAIN });
    // Açık kontak kolu
    els.push({ id: newId(), type: 'line', x1: 71, y1: 70, x2: 130, y2: 30, color: COLOR_MAIN, width: 4 });
    // Sağ tel
    els.push({ id: newId(), type: 'line', x1: 145, y1: 70, x2: 200, y2: 70, color: COLOR_MAIN, width: 4 });
    // Altta ad
    els.push(createText(10, 115, 190, 36, 'Anahtar (açık)', 24, 'center'));
    return els;
  },
};

// --------------------------------------------------------
// 4. Devre Elemanları: Direnç
// --------------------------------------------------------
export const resistorItem: LibraryItem = {
  id: 'science.resistor',
  name: 'Direnç',
  category: 'fen',
  keywords: ['direnç', 'direnc', 'rezistans', 'ohm', 'devre', 'elektrik', 'fen', 'fizik'],
  build: () => {
    const els: BoardEl[] = [];
    // Sol tel
    els.push({ id: newId(), type: 'line', x1: 10, y1: 60, x2: 50, y2: 60, color: COLOR_MAIN, width: 4 });
    // Zikzak hat
    const pts = [
      [50, 60], [60, 40], [80, 80], [100, 40],
      [120, 80], [140, 40], [160, 80], [170, 60],
    ];
    for (let i = 0; i < pts.length - 1; i++) {
      els.push({
        id: newId(),
        type: 'line',
        x1: pts[i][0],
        y1: pts[i][1],
        x2: pts[i + 1][0],
        y2: pts[i + 1][1],
        color: COLOR_MAIN,
        width: 4,
      });
    }
    // Sağ tel
    els.push({ id: newId(), type: 'line', x1: 170, y1: 60, x2: 210, y2: 60, color: COLOR_MAIN, width: 4 });
    // Altta ad
    els.push(createText(10, 115, 200, 36, 'Direnç', 26, 'center'));
    return els;
  },
};

// --------------------------------------------------------
// 5. Devre Elemanları: Kablo bağlantı noktası
// --------------------------------------------------------
export const junctionItem: LibraryItem = {
  id: 'science.junction',
  name: 'Bağlantı noktası',
  category: 'fen',
  keywords: ['bağlantı', 'baglanti', 'düğüm', 'dugum', 'kablo', 'bağlantı noktası', 'devre', 'elektrik', 'fen'],
  build: () => {
    const els: BoardEl[] = [];
    // Yatay ve dikey teller
    els.push({ id: newId(), type: 'line', x1: 20, y1: 80, x2: 180, y2: 80, color: COLOR_MAIN, width: 4 });
    els.push({ id: newId(), type: 'line', x1: 100, y1: 10, x2: 100, y2: 150, color: COLOR_MAIN, width: 4 });
    // Merkez nokta
    els.push({ id: newId(), type: 'ellipse', x1: 90, y1: 70, x2: 110, y2: 90, color: COLOR_MAIN, width: 2, fill: COLOR_MAIN });
    // Altta ad
    els.push(createText(10, 165, 180, 36, 'Bağlantı noktası', 22, 'center'));
    return els;
  },
};

// --------------------------------------------------------
// 6. Basit elektrik devresi
// --------------------------------------------------------
export const circuitItem: LibraryItem = {
  id: 'science.circuit',
  name: 'Basit elektrik devresi',
  category: 'fen',
  keywords: ['devre', 'basit devre', 'elektrik devresi', 'pil', 'ampul', 'anahtar', 'kapalı devre', 'fen', 'fizik'],
  build: () => {
    const els: BoardEl[] = [];
    // Sol dikey hat
    els.push({ id: newId(), type: 'line', x1: 60, y1: 60, x2: 60, y2: 300, width: 4, color: COLOR_MAIN });

    // Üst hat (anahtar)
    els.push({ id: newId(), type: 'line', x1: 60, y1: 60, x2: 190, y2: 60, width: 4, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'ellipse', x1: 185, y1: 55, x2: 195, y2: 65, fill: COLOR_MAIN, width: 2, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 190, y1: 60, x2: 270, y2: 25, width: 4, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'ellipse', x1: 275, y1: 55, x2: 285, y2: 65, fill: COLOR_MAIN, width: 2, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 285, y1: 60, x2: 440, y2: 60, width: 4, color: COLOR_MAIN });
    els.push(createText(180, 0, 120, 26, 'Anahtar', 22, 'center'));

    // Sağ hat (ampul)
    els.push({ id: newId(), type: 'line', x1: 440, y1: 60, x2: 440, y2: 145, width: 4, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'ellipse', x1: 410, y1: 145, x2: 470, y2: 205, color: COLOR_MAIN, width: 4, fill: '#f08c0022' });
    els.push({ id: newId(), type: 'line', x1: 419, y1: 154, x2: 461, y2: 196, width: 3, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 419, y1: 196, x2: 461, y2: 154, width: 3, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 440, y1: 205, x2: 440, y2: 300, width: 4, color: COLOR_MAIN });
    els.push(createText(475, 160, 100, 30, 'Ampul', 22, 'left'));

    // Alt hat (pil)
    els.push({ id: newId(), type: 'line', x1: 60, y1: 300, x2: 220, y2: 300, width: 4, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 220, y1: 270, x2: 220, y2: 330, width: 4, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 250, y1: 280, x2: 250, y2: 320, width: 8, color: COLOR_MAIN });
    els.push(createText(205, 260, 30, 24, '+', 24, 'center', false, 'sans', COLOR_MAIN, 700));
    els.push(createText(255, 260, 30, 24, '−', 24, 'center', false, 'sans', COLOR_MAIN, 700));
    els.push({ id: newId(), type: 'line', x1: 250, y1: 300, x2: 440, y2: 300, width: 4, color: COLOR_MAIN });
    els.push(createText(195, 335, 80, 28, 'Pil', 22, 'center'));

    return els;
  },
};

// --------------------------------------------------------
// 7. Besin zinciri
// --------------------------------------------------------
export const foodChainItem: LibraryItem = {
  id: 'science.food-chain',
  name: 'Besin zinciri',
  category: 'fen',
  keywords: ['besin zinciri', 'besin', 'ekoloji', 'üretici', 'tüketici', 'otçul', 'etçil', 'ekosistem', 'fen', 'biyoloji'],
  params: [
    { key: 'halka', label: 'Halka sayısı', type: 'number', min: 3, max: 6, default: 4 },
  ],
  build: (params) => {
    const halka = Math.max(3, Math.min(6, Math.round(params?.halka ?? 4)));
    const els: BoardEl[] = [];
    const boxW = 180;
    const boxH = 90;
    const gap = 60;
    const labels = ['Üretici', '1. tüketici', '2. tüketici', '3. tüketici', '4. tüketici', '5. tüketici'];

    for (let i = 0; i < halka; i++) {
      const boxX = i * (boxW + gap);
      // Yuvarlak köşeli kutu
      els.push({
        id: newId(),
        type: 'rect',
        x1: boxX,
        y1: 20,
        x2: boxX + boxW,
        y2: 20 + boxH,
        color: COLOR_MAIN,
        width: 3,
        fill: '#25634b22',
      });
      // Metin
      els.push(
        createText(boxX + 10, 48, boxW - 20, 36, labels[i], 22, 'center', false, 'sans', COLOR_MAIN, 700)
      );

      // Sonraki halkaya ok
      if (i < halka - 1) {
        els.push({
          id: newId(),
          type: 'arrow',
          x1: boxX + boxW + 8,
          y1: 20 + boxH / 2,
          x2: boxX + boxW + gap - 8,
          y2: 20 + boxH / 2,
          color: COLOR_MAIN,
          width: 4,
        });
      }
    }

    return els;
  },
};

// --------------------------------------------------------
// 8. Hayvan hücresi
// --------------------------------------------------------
export const animalCellItem: LibraryItem = {
  id: 'science.animal-cell',
  name: 'Hayvan hücresi',
  category: 'fen',
  keywords: ['hayvan hücresi', 'hucre', 'hücre', 'çekirdek', 'sitoplazma', 'mitokondri', 'zar', 'biyoloji', 'fen'],
  build: () => {
    const els: BoardEl[] = [];
    const cx = 280;
    const cy = 220;

    // Organik dalgalı kapalı çokgen (Hücre zarı)
    const polyPts: number[] = [];
    const numPoints = 20;
    for (let i = 0; i < numPoints; i++) {
      const a = (i / numPoints) * Math.PI * 2;
      const wave = Math.sin(a * 4) * 12 + Math.cos(a * 3) * 8;
      const rx = 190 + wave;
      const ry = 150 + wave * 0.8;
      polyPts.push(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry));
    }
    const cellMembrane: PolyEl = {
      id: newId(),
      type: 'poly',
      points: polyPts,
      color: COLOR_MAIN,
      width: 4,
      fill: '#1971c215',
    };
    els.push(cellMembrane);

    // Çekirdek (büyük dolgulu elips)
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 220,
      y1: 160,
      x2: 340,
      y2: 280,
      fill: '#7a3fd044',
      color: COLOR_MAIN,
      width: 3,
    });
    // Çekirdekçik
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 260,
      y1: 200,
      x2: 295,
      y2: 235,
      fill: '#7a3fd099',
      color: COLOR_MAIN,
      width: 1.5,
    });

    // Mitokondriler (3 adet küçük elips ve iç krista)
    const mitos = [
      { x1: 140, y1: 130, x2: 190, y2: 165, pts: [150, 147, 160, 137, 170, 157, 180, 147] },
      { x1: 360, y1: 140, x2: 410, y2: 175, pts: [370, 157, 380, 147, 390, 167, 400, 157] },
      { x1: 200, y1: 290, x2: 250, y2: 325, pts: [210, 307, 220, 297, 230, 317, 240, 307] },
    ];
    for (const m of mitos) {
      els.push({
        id: newId(),
        type: 'ellipse',
        x1: m.x1,
        y1: m.y1,
        x2: m.x2,
        y2: m.y2,
        fill: '#e0313144',
        color: COLOR_MAIN,
        width: 2,
      });
      const stroke: StrokeEl = {
        id: newId(),
        type: 'stroke',
        points: m.pts,
        color: COLOR_MAIN,
        width: 2,
      };
      els.push(stroke);
    }

    // Etiketler ve işaret çizgileri
    // 1. Hücre zarı
    els.push({ id: newId(), type: 'line', x1: 440, y1: 180, x2: 520, y2: 120, width: 2, color: COLOR_MUTED });
    els.push(createText(525, 105, 140, 30, 'Hücre zarı', 22, 'left'));

    // 2. Çekirdek
    els.push({ id: newId(), type: 'line', x1: 330, y1: 210, x2: 520, y2: 190, width: 2, color: COLOR_MUTED });
    els.push(createText(525, 175, 140, 30, 'Çekirdek', 22, 'left'));

    // 3. Sitoplazma
    els.push({ id: newId(), type: 'line', x1: 360, y1: 260, x2: 520, y2: 260, width: 2, color: COLOR_MUTED });
    els.push(createText(525, 245, 140, 30, 'Sitoplazma', 22, 'left'));

    // 4. Mitokondri
    els.push({ id: newId(), type: 'line', x1: 160, y1: 130, x2: 90, y2: 80, width: 2, color: COLOR_MUTED });
    els.push(createText(10, 65, 140, 30, 'Mitokondri', 22, 'left'));

    return els;
  },
};

// --------------------------------------------------------
// 9. Bitki hücresi
// --------------------------------------------------------
export const plantCellItem: LibraryItem = {
  id: 'science.plant-cell',
  name: 'Bitki hücresi',
  category: 'fen',
  keywords: ['bitki hücresi', 'hucre', 'hücre', 'hücre duvarı', 'kloroplast', 'koful', 'çekirdek', 'biyoloji', 'fen'],
  build: () => {
    const els: BoardEl[] = [];
    // Hücre duvarı (dış kalın dikdörtgen)
    els.push({
      id: newId(),
      type: 'rect',
      x1: 50,
      y1: 40,
      x2: 500,
      y2: 380,
      color: COLOR_MAIN,
      width: 6,
      fill: '#25634b15',
    });
    // Hücre zarı (iç ince dikdörtgen)
    els.push({
      id: newId(),
      type: 'rect',
      x1: 62,
      y1: 52,
      x2: 488,
      y2: 368,
      color: COLOR_MAIN,
      width: 2,
      fill: 'none',
    });

    // Büyük koful (ortada geniş mavi alan)
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 130,
      y1: 130,
      x2: 330,
      y2: 300,
      fill: '#1971c233',
      color: COLOR_MAIN,
      width: 2.5,
    });

    // Çekirdek
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 350,
      y1: 90,
      x2: 450,
      y2: 190,
      fill: '#7a3fd044',
      color: COLOR_MAIN,
      width: 3,
    });
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 380,
      y1: 120,
      x2: 415,
      y2: 155,
      fill: '#7a3fd099',
      color: COLOR_MAIN,
      width: 1.5,
    });

    // Kloroplastlar (4 adet yeşil elips)
    const chloros = [
      { x1: 90, y1: 80, x2: 140, y2: 115 },
      { x1: 90, y1: 290, x2: 140, y2: 325 },
      { x1: 370, y1: 240, x2: 420, y2: 275 },
      { x1: 260, y1: 310, x2: 310, y2: 345 },
    ];
    for (const c of chloros) {
      els.push({
        id: newId(),
        type: 'ellipse',
        x1: c.x1,
        y1: c.y1,
        x2: c.x2,
        y2: c.y2,
        fill: '#25634b66',
        color: COLOR_MAIN,
        width: 2,
      });
    }

    // Çizgilerle bağlı etiketler
    els.push({ id: newId(), type: 'line', x1: 500, y1: 60, x2: 550, y2: 50, width: 2, color: COLOR_MUTED });
    els.push(createText(555, 35, 140, 30, 'Hücre duvarı', 22, 'left'));

    els.push({ id: newId(), type: 'line', x1: 488, y1: 80, x2: 550, y2: 100, width: 2, color: COLOR_MUTED });
    els.push(createText(555, 85, 140, 30, 'Hücre zarı', 22, 'left'));

    els.push({ id: newId(), type: 'line', x1: 445, y1: 140, x2: 550, y2: 155, width: 2, color: COLOR_MUTED });
    els.push(createText(555, 140, 140, 30, 'Çekirdek', 22, 'left'));

    els.push({ id: newId(), type: 'line', x1: 280, y1: 215, x2: 550, y2: 220, width: 2, color: COLOR_MUTED });
    els.push(createText(555, 205, 140, 30, 'Koful', 22, 'left'));

    els.push({ id: newId(), type: 'line', x1: 415, y1: 260, x2: 550, y2: 280, width: 2, color: COLOR_MUTED });
    els.push(createText(555, 265, 140, 30, 'Kloroplast', 22, 'left'));

    return els;
  },
};

// --------------------------------------------------------
// 10. Çubuk mıknatıs
// --------------------------------------------------------
export const magnetItem: LibraryItem = {
  id: 'science.magnet',
  name: 'Çubuk mıknatıs',
  category: 'fen',
  keywords: ['mıknatıs', 'miknatis', 'çubuk mıknatıs', 'manyetik', 'kutup', 'n kutbu', 's kutbu', 'fizik', 'fen'],
  build: () => {
    const els: BoardEl[] = [];
    // Sol yarı (N - Kırmızı)
    els.push({
      id: newId(),
      type: 'rect',
      x1: 0,
      y1: 0,
      x2: 180,
      y2: 100,
      fill: '#e03131',
      color: COLOR_MAIN,
      width: 4,
    });
    // Sağ yarı (S - Mavi)
    els.push({
      id: newId(),
      type: 'rect',
      x1: 180,
      y1: 0,
      x2: 360,
      y2: 100,
      fill: '#1971c2',
      color: COLOR_MAIN,
      width: 4,
    });
    // Ortadaki ayrım çizgisi
    els.push({
      id: newId(),
      type: 'line',
      x1: 180,
      y1: 0,
      x2: 180,
      y2: 100,
      color: COLOR_MAIN,
      width: 3,
    });
    // Beyaz harfler
    els.push(createText(40, 18, 100, 64, 'N', 56, 'center', false, 'sans', '#ffffff', 700));
    els.push(createText(220, 18, 100, 64, 'S', 56, 'center', false, 'sans', '#ffffff', 700));

    return els;
  },
};

// --------------------------------------------------------
// 11. Termometre
// --------------------------------------------------------
export const thermometerItem: LibraryItem = {
  id: 'science.thermometer',
  name: 'Termometre',
  category: 'fen',
  keywords: ['termometre', 'sıcaklık', 'sicaklik', 'derece', 'ısı', 'isi', 'ölçüm', 'celsius', 'fen', 'fizik'],
  params: [
    { key: 'derece', label: 'Sıcaklık (°C)', type: 'number', min: -10, max: 50, default: 20 },
  ],
  build: (params) => {
    const derece = Math.max(-10, Math.min(50, Math.round(params?.derece ?? 20)));
    const els: BoardEl[] = [];

    // Dikey cam tüp
    els.push({
      id: newId(),
      type: 'rect',
      x1: 90,
      y1: 40,
      x2: 130,
      y2: 380,
      fill: '#ffffff',
      color: COLOR_MAIN,
      width: 3,
    });
    // Tüp üst ucu
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 90,
      y1: 30,
      x2: 130,
      y2: 50,
      fill: '#ffffff',
      color: COLOR_MAIN,
      width: 3,
    });
    // Alt hazne (kırmızı dolu küre)
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 70,
      y1: 370,
      x2: 150,
      y2: 450,
      fill: '#e03131',
      color: COLOR_MAIN,
      width: 3,
    });

    // Kırmızı sıvı sütunu (-10°C y=360, 50°C y=80)
    const liquidY = Math.round(360 - (derece - (-10)) * (280 / 60));
    els.push({
      id: newId(),
      type: 'rect',
      x1: 100,
      y1: liquidY,
      x2: 120,
      y2: 380,
      fill: '#e03131',
      color: '#e03131',
      width: 0,
    });

    // 10'ar derecelik çentikler ve sayılar
    for (let deg = 50; deg >= -10; deg -= 10) {
      const y = Math.round(360 - (deg - (-10)) * (280 / 60));
      els.push({
        id: newId(),
        type: 'line',
        x1: 130,
        y1: y,
        x2: 148,
        y2: y,
        width: 2,
        color: COLOR_MAIN,
      });
      els.push(createText(154, y - 12, 60, 24, `${deg}°`, 18, 'left'));

      if (deg > -10) {
        const yMid = Math.round(360 - (deg - 5 - (-10)) * (280 / 60));
        els.push({
          id: newId(),
          type: 'line',
          x1: 130,
          y1: yMid,
          x2: 140,
          y2: yMid,
          width: 1.5,
          color: COLOR_MUTED,
        });
      }
    }

    // °C etiketi
    els.push(createText(80, 5, 60, 24, '°C', 20, 'center', false, 'sans', COLOR_MAIN, 700));

    return els;
  },
};

// --------------------------------------------------------
// 12. Deney tüpü
// --------------------------------------------------------
export const testTubeItem: LibraryItem = {
  id: 'science.test-tube',
  name: 'Deney tüpü',
  category: 'fen',
  keywords: ['deney tüpü', 'deney tupu', 'tüp', 'kimya', 'laboratuvar', 'sıvı', 'çözelti', 'fen'],
  build: () => {
    const els: BoardEl[] = [];
    // Dudak
    els.push({ id: newId(), type: 'ellipse', x1: 24, y1: 22, x2: 96, y2: 38, fill: '#ffffff', color: COLOR_MAIN, width: 3 });
    // Yan cam çizgileri
    els.push({ id: newId(), type: 'line', x1: 30, y1: 30, x2: 30, y2: 280, width: 3, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 90, y1: 30, x2: 90, y2: 280, width: 3, color: COLOR_MAIN });
    // Alt yuvarlak dip
    els.push({ id: newId(), type: 'ellipse', x1: 30, y1: 250, x2: 90, y2: 310, fill: COLOR_FILL_BLUE, color: COLOR_MAIN, width: 3 });
    // Sıvı gövdesi
    els.push({ id: newId(), type: 'rect', x1: 31, y1: 160, x2: 89, y2: 280, fill: COLOR_FILL_BLUE, color: 'none', width: 0 });
    // Sıvı menisküsü
    els.push({ id: newId(), type: 'ellipse', x1: 31, y1: 154, x2: 89, y2: 166, fill: '#1971c255', color: COLOR_MAIN, width: 2 });

    // Derece çizgileri
    els.push({ id: newId(), type: 'line', x1: 70, y1: 120, x2: 89, y2: 120, width: 1.5, color: COLOR_MUTED });
    els.push({ id: newId(), type: 'line', x1: 65, y1: 160, x2: 89, y2: 160, width: 2, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 70, y1: 200, x2: 89, y2: 200, width: 1.5, color: COLOR_MUTED });
    els.push({ id: newId(), type: 'line', x1: 65, y1: 240, x2: 89, y2: 240, width: 2, color: COLOR_MAIN });

    // Altta ad
    els.push(createText(5, 325, 110, 30, 'Deney tüpü', 20, 'center'));
    return els;
  },
};

// --------------------------------------------------------
// 13. Beher
// --------------------------------------------------------
export const beakerItem: LibraryItem = {
  id: 'science.beaker',
  name: 'Beher',
  category: 'fen',
  keywords: ['beher', 'beherglas', 'cam', 'laboratuvar', 'kimya', 'sıvı', 'ölçek', 'fen'],
  build: () => {
    const els: BoardEl[] = [];
    // Dudak ve gövde
    els.push({ id: newId(), type: 'line', x1: 40, y1: 30, x2: 50, y2: 40, width: 3, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 50, y1: 40, x2: 50, y2: 280, width: 3, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 230, y1: 40, x2: 230, y2: 280, width: 3, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 50, y1: 280, x2: 230, y2: 280, width: 4, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 50, y1: 40, x2: 230, y2: 40, width: 3, color: COLOR_MAIN });

    // Sıvı
    els.push({ id: newId(), type: 'rect', x1: 52, y1: 150, x2: 228, y2: 278, fill: COLOR_FILL_BLUE, color: 'none', width: 0 });
    els.push({ id: newId(), type: 'ellipse', x1: 52, y1: 142, x2: 228, y2: 158, fill: '#1971c255', color: COLOR_MAIN, width: 2 });

    // Ölçek çizgileri ve etiketleri
    const scales = [
      { y: 100, label: '200 ml' },
      { y: 150, label: '150 ml' },
      { y: 200, label: '100 ml' },
      { y: 240, label: '50 ml' },
    ];
    for (const s of scales) {
      els.push({ id: newId(), type: 'line', x1: 60, y1: s.y, x2: 95, y2: s.y, width: 2, color: COLOR_MAIN });
      els.push(createText(102, s.y - 12, 70, 24, s.label, 18, 'left'));
    }

    // Altta ad
    els.push(createText(50, 295, 180, 30, 'Beher', 22, 'center'));
    return els;
  },
};

// --------------------------------------------------------
// 14. Güneş sistemi
// --------------------------------------------------------
export const solarSystemItem: LibraryItem = {
  id: 'science.solar-system',
  name: 'Güneş sistemi',
  category: 'fen',
  keywords: ['güneş sistemi', 'gunes sistemi', 'gezegen', 'dünya', 'mars', 'jüpiter', 'satürn', 'uzay', 'astronomi', 'fen'],
  build: () => {
    const els: BoardEl[] = [];
    const cy = 190;

    // Güneş
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: -120,
      y1: cy - 170,
      x2: 80,
      y2: cy + 170,
      fill: '#f08c00',
      color: COLOR_MAIN,
      width: 4,
    });
    els.push(createText(10, cy - 14, 70, 28, 'Güneş', 22, 'center', false, 'sans', COLOR_MAIN, 700));

    // Gezegenler listesi
    const planets = [
      { name: 'Merkür', r: 7, color: '#868e96', x: 150 },
      { name: 'Venüs', r: 12, color: '#e599f7', x: 235 },
      { name: 'Dünya', r: 13, color: '#339af0', x: 330 },
      { name: 'Mars', r: 9, color: '#ff6b6b', x: 425 },
      { name: 'Jüpiter', r: 32, color: '#fcc419', x: 550 },
      { name: 'Satürn', r: 26, color: '#ffd43b', x: 700, ring: true },
      { name: 'Uranüs', r: 18, color: '#66d9e8', x: 840 },
      { name: 'Neptün', r: 17, color: '#4dabf7', x: 960 },
    ];

    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      const ry = Math.round(50 + i * 16);
      // İnce yörünge eğrisi (yassı perspektifli elips)
      els.push({
        id: newId(),
        type: 'ellipse',
        x1: -120,
        y1: cy - ry,
        x2: p.x,
        y2: cy + ry,
        fill: 'none',
        color: COLOR_MUTED,
        width: 1.5,
      });

      // Satürn halkası (gezegenin arkasından ve önünden geçiş için)
      if (p.ring) {
        els.push({
          id: newId(),
          type: 'ellipse',
          x1: p.x - 46,
          y1: cy - 12,
          x2: p.x + 46,
          y2: cy + 12,
          fill: 'none',
          color: '#e0a800',
          width: 3.5,
        });
      }

      // Gezegen küresi
      els.push({
        id: newId(),
        type: 'ellipse',
        x1: p.x - p.r,
        y1: cy - p.r,
        x2: p.x + p.r,
        y2: cy + p.r,
        fill: p.color,
        color: COLOR_MAIN,
        width: 2,
      });

      // Ad etiketi
      els.push(createText(p.x - 45, cy + 42, 90, 24, p.name, 18, 'center'));
    }

    return els;
  },
};

// --------------------------------------------------------
// 15. Su döngüsü
// --------------------------------------------------------
export const waterCycleItem: LibraryItem = {
  id: 'science.water-cycle',
  name: 'Su döngüsü',
  category: 'fen',
  keywords: ['su döngüsü', 'su dongusu', 'buharlaşma', 'yoğuşma', 'yağış', 'toplanma', 'bulut', 'deniz', 'coğrafya', 'fen'],
  build: () => {
    const els: BoardEl[] = [];

    // Deniz (sağ alt)
    els.push({
      id: newId(),
      type: 'rect',
      x1: 420,
      y1: 360,
      x2: 820,
      y2: 440,
      rx: 8,
      fill: '#1971c233',
      color: '#1971c2',
      width: 3,
    });
    const waveStroke: StrokeEl = {
      id: newId(),
      type: 'stroke',
      points: [430, 375, 470, 368, 510, 380, 550, 368, 590, 380, 630, 368, 670, 380, 710, 368, 750, 380, 800, 370],
      color: '#1971c2',
      width: 2.5,
    };
    els.push(waveStroke);
    els.push(createText(580, 395, 100, 30, 'Deniz', 22, 'center', false, 'sans', '#1971c2', 700));

    // Dağ (sol)
    const mountain: PolyEl = {
      id: newId(),
      type: 'poly',
      points: [40, 440, 220, 160, 400, 440],
      fill: '#25634b33',
      color: COLOR_MAIN,
      width: 3,
    };
    els.push(mountain);
    // Karlı zirve
    const snowCap: PolyEl = {
      id: newId(),
      type: 'poly',
      points: [180, 225, 220, 160, 260, 225, 240, 220, 220, 230, 200, 220],
      fill: '#ffffff',
      color: COLOR_MAIN,
      width: 2,
    };
    els.push(snowCap);

    // Güneş (sağ üst)
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 720,
      y1: 30,
      x2: 800,
      y2: 110,
      fill: '#f08c00',
      color: COLOR_MAIN,
      width: 3,
    });
    // Güneş ışınları
    const rays = [
      [760, 15, 760, 25],
      [760, 115, 760, 125],
      [705, 70, 715, 70],
      [805, 70, 815, 70],
    ];
    for (const r of rays) {
      els.push({ id: newId(), type: 'line', x1: r[0], y1: r[1], x2: r[2], y2: r[3], width: 2.5, color: COLOR_MAIN });
    }

    // Bulut
    els.push({ id: newId(), type: 'ellipse', x1: 400, y1: 100, x2: 520, y2: 155, fill: '#ffffff', color: COLOR_MAIN, width: 2.5 });
    els.push({ id: newId(), type: 'ellipse', x1: 430, y1: 75, x2: 490, y2: 130, fill: '#ffffff', color: COLOR_MAIN, width: 2.5 });
    els.push({ id: newId(), type: 'ellipse', x1: 470, y1: 85, x2: 545, y2: 145, fill: '#ffffff', color: COLOR_MAIN, width: 2.5 });

    // Yağmur çizgileri
    els.push({ id: newId(), type: 'line', x1: 220, y1: 240, x2: 210, y2: 270, width: 2, color: '#1971c2' });
    els.push({ id: newId(), type: 'line', x1: 250, y1: 250, x2: 240, y2: 280, width: 2, color: '#1971c2' });
    els.push({ id: newId(), type: 'line', x1: 280, y1: 240, x2: 270, y2: 270, width: 2, color: '#1971c2' });

    // Döngü okları ve etiketleri
    // 1. Buharlaşma
    els.push({ id: newId(), type: 'arrow', x1: 650, y1: 340, x2: 650, y2: 190, width: 3.5, color: '#1971c2' });
    els.push(createText(665, 250, 130, 28, 'Buharlaşma', 20, 'left', true));

    // 2. Yoğuşma
    els.push({ id: newId(), type: 'arrow', x1: 630, y1: 110, x2: 560, y2: 110, width: 3.5, color: '#1971c2' });
    els.push(createText(560, 60, 120, 28, 'Yoğuşma', 20, 'center', true));

    // 3. Yağış
    els.push({ id: newId(), type: 'arrow', x1: 380, y1: 140, x2: 280, y2: 180, width: 3.5, color: '#1971c2' });
    els.push(createText(280, 130, 100, 28, 'Yağış', 20, 'center', true));

    // 4. Toplanma
    els.push({ id: newId(), type: 'arrow', x1: 320, y1: 420, x2: 410, y2: 420, width: 3.5, color: '#1971c2' });
    els.push(createText(300, 445, 120, 28, 'Toplanma', 20, 'center', true));

    return els;
  },
};

export const FEN_ITEMS: LibraryItem[] = [
  batteryItem,
  bulbItem,
  switchItem,
  resistorItem,
  junctionItem,
  circuitItem,
  foodChainItem,
  animalCellItem,
  plantCellItem,
  magnetItem,
  thermometerItem,
  testTubeItem,
  beakerItem,
  solarSystemItem,
  waterCycleItem,
];
