import { BoardEl, newId, PolyEl, StrokeEl } from '../boardData';
import { LibraryItem } from './types';
import {
  COLOR_FILL_BLUE,
  COLOR_FILL_GREEN,
  COLOR_MAIN,
  createText,
} from './itemsFen';

// --------------------------------------------------------
// 1. Düşünce balonu
// --------------------------------------------------------
export const thoughtBubbleItem: LibraryItem = {
  id: 'general.thought-bubble',
  name: 'Düşünce balonu',
  category: 'genel',
  keywords: ['düşünce balonu', 'dusunce balonu', 'düşünce', 'dusunce', 'balon', 'fikir', 'rüya', 'hayal', 'genel'],
  build: () => {
    const els: BoardEl[] = [];

    // Bulut biçimli ana gövdeyi oluşturan elipsler
    const bubbles = [
      { x1: 70, y1: 40, x2: 310, y2: 180 },
      { x1: 40, y1: 60, x2: 140, y2: 160 },
      { x1: 90, y1: 20, x2: 190, y2: 110 },
      { x1: 180, y1: 20, x2: 280, y2: 110 },
      { x1: 240, y1: 60, x2: 340, y2: 160 },
      { x1: 130, y1: 110, x2: 250, y2: 195 },
    ];
    for (const b of bubbles) {
      els.push({
        id: newId(),
        type: 'ellipse',
        x1: b.x1,
        y1: b.y1,
        x2: b.x2,
        y2: b.y2,
        fill: '#ffffff',
        color: COLOR_MAIN,
        width: 3.5,
      });
    }

    // Küçük daire kuyruğu
    els.push({ id: newId(), type: 'ellipse', x1: 75, y1: 200, x2: 95, y2: 220, fill: '#ffffff', color: COLOR_MAIN, width: 2.5 });
    els.push({ id: newId(), type: 'ellipse', x1: 52, y1: 228, x2: 68, y2: 244, fill: '#ffffff', color: COLOR_MAIN, width: 2 });
    els.push({ id: newId(), type: 'ellipse', x1: 34, y1: 250, x2: 44, y2: 260, fill: '#ffffff', color: COLOR_MAIN, width: 1.5 });

    // "Düşünüyorum…" metni
    els.push(createText(75, 88, 220, 44, 'Düşünüyorum…', 32, 'center', false, 'hand', COLOR_MAIN));

    return els;
  },
};

// --------------------------------------------------------
// 2. Oklar: Düz ok
// --------------------------------------------------------
export const arrowStraightItem: LibraryItem = {
  id: 'general.arrow-straight',
  name: 'Düz ok',
  category: 'genel',
  keywords: ['ok', 'düz ok', 'duz ok', 'işaret', 'isaret', 'yön', 'yon', 'blok ok', 'genel'],
  build: () => {
    const arrowPoly: PolyEl = {
      id: newId(),
      type: 'poly',
      points: [0, 30, 140, 30, 140, 0, 220, 50, 140, 100, 140, 70, 0, 70],
      fill: COLOR_FILL_GREEN,
      color: COLOR_MAIN,
      width: 3.5,
    };
    return [arrowPoly];
  },
};

// --------------------------------------------------------
// 3. Oklar: Çift yönlü ok
// --------------------------------------------------------
export const arrowDoubleItem: LibraryItem = {
  id: 'general.arrow-double',
  name: 'Çift yönlü ok',
  category: 'genel',
  keywords: ['çift yönlü ok', 'cift yonlu ok', 'ok', 'karşılıklı', 'karsilikli', 'yön', 'yon', 'genel'],
  build: () => {
    const arrowPoly: PolyEl = {
      id: newId(),
      type: 'poly',
      points: [60, 0, 60, 30, 180, 30, 180, 0, 240, 50, 180, 100, 180, 70, 60, 70, 60, 100, 0, 50],
      fill: COLOR_FILL_BLUE,
      color: COLOR_MAIN,
      width: 3.5,
    };
    return [arrowPoly];
  },
};

// --------------------------------------------------------
// 4. Oklar: Kavisli ok
// --------------------------------------------------------
export const arrowCurvedItem: LibraryItem = {
  id: 'general.arrow-curved',
  name: 'Kavisli ok',
  category: 'genel',
  keywords: ['kavisli ok', 'eğri ok', 'egri ok', 'yay ok', 'dönüş oku', 'genel'],
  build: () => {
    const els: BoardEl[] = [];
    const curve: StrokeEl = {
      id: newId(),
      type: 'stroke',
      points: [20, 150, 60, 60, 140, 20, 210, 35],
      color: COLOR_MAIN,
      width: 4,
    };
    els.push(curve);

    const head: PolyEl = {
      id: newId(),
      type: 'poly',
      points: [200, 15, 235, 45, 195, 65],
      fill: COLOR_MAIN,
      color: COLOR_MAIN,
      width: 1,
    };
    els.push(head);

    return els;
  },
};

// --------------------------------------------------------
// 5. Oklar: Dönüş oku
// --------------------------------------------------------
export const arrowLoopItem: LibraryItem = {
  id: 'general.arrow-loop',
  name: 'Dönüş oku',
  category: 'genel',
  keywords: ['dönüş oku', 'donus oku', 'döngü', 'dongu', 'tekrar', 'geri dönüş', 'genel'],
  build: () => {
    const els: BoardEl[] = [];
    // U dönüşü / dairesel yay
    const arc: StrokeEl = {
      id: newId(),
      type: 'stroke',
      points: [90, 155, 30, 135, 25, 60, 90, 25, 155, 60, 150, 120],
      color: COLOR_MAIN,
      width: 4,
    };
    els.push(arc);

    const head: PolyEl = {
      id: newId(),
      type: 'poly',
      points: [135, 110, 150, 145, 175, 115],
      fill: COLOR_MAIN,
      color: COLOR_MAIN,
      width: 1,
    };
    els.push(head);

    return els;
  },
};

// --------------------------------------------------------
// 6. Tablo
// --------------------------------------------------------
export const tableItem: LibraryItem = {
  id: 'general.table',
  name: 'Tablo',
  category: 'genel',
  keywords: ['tablo', 'çizelge', 'cizelge', 'satır', 'satir', 'sütun', 'sutun', 'hücre', 'hucre', 'veri', 'genel'],
  params: [
    { key: 'satir', label: 'Satır', type: 'number', min: 2, max: 10, default: 3 },
    { key: 'sutun', label: 'Sütun', type: 'number', min: 2, max: 8, default: 3 },
  ],
  build: (params) => {
    const satir = Math.max(2, Math.min(10, Math.round(params?.satir ?? 3)));
    const sutun = Math.max(2, Math.min(8, Math.round(params?.sutun ?? 3)));
    const els: BoardEl[] = [];

    const cellW = 160;
    const cellH = 64;
    const totalW = sutun * cellW;
    const totalH = satir * cellH;

    // Başlık satırı arka planı (açık yeşil dolgu)
    els.push({
      id: newId(),
      type: 'rect',
      x1: 0,
      y1: 0,
      x2: totalW,
      y2: cellH,
      fill: '#25634b33',
      color: 'none',
      width: 0,
    });

    // Dış çerçeve
    els.push({
      id: newId(),
      type: 'rect',
      x1: 0,
      y1: 0,
      x2: totalW,
      y2: totalH,
      fill: 'none',
      color: COLOR_MAIN,
      width: 3.5,
    });

    // Yatay çizgiler
    for (let r = 1; r < satir; r++) {
      els.push({
        id: newId(),
        type: 'line',
        x1: 0,
        y1: r * cellH,
        x2: totalW,
        y2: r * cellH,
        width: r === 1 ? 3 : 1.5,
        color: COLOR_MAIN,
      });
    }

    // Dikey çizgiler
    for (let c = 1; c < sutun; c++) {
      els.push({
        id: newId(),
        type: 'line',
        x1: c * cellW,
        y1: 0,
        x2: c * cellW,
        y2: totalH,
        width: 1.5,
        color: COLOR_MAIN,
      });
    }

    // Yalnızca başlık hücrelerinde metin
    for (let c = 0; c < sutun; c++) {
      els.push(
        createText(c * cellW, 16, cellW, 32, `Başlık ${c + 1}`, 22, 'center', false, 'sans', COLOR_MAIN, 700)
      );
    }

    return els;
  },
};

// --------------------------------------------------------
// 7. Venn şeması
// --------------------------------------------------------
export const vennItem: LibraryItem = {
  id: 'general.venn-diagram',
  name: 'Venn şeması',
  category: 'genel',
  keywords: ['venn', 'venn şeması', 'venn semasi', 'küme', 'kume', 'kesişim', 'kesisim', 'birleşim', 'birlesim', 'mantık', 'genel', 'matematik'],
  params: [
    { key: 'kume', label: 'Küme sayısı', type: 'number', min: 2, max: 3, default: 2 },
  ],
  build: (params) => {
    const kume = Math.max(2, Math.min(3, Math.round(params?.kume ?? 2)));
    const els: BoardEl[] = [];

    if (kume === 2) {
      // Sol daire (A - mavi)
      els.push({
        id: newId(),
        type: 'ellipse',
        x1: 20,
        y1: 40,
        x2: 280,
        y2: 300,
        fill: '#1971c233',
        color: COLOR_MAIN,
        width: 3.5,
      });
      // Sağ daire (B - sarı)
      els.push({
        id: newId(),
        type: 'ellipse',
        x1: 140,
        y1: 40,
        x2: 400,
        y2: 300,
        fill: '#f08c0033',
        color: COLOR_MAIN,
        width: 3.5,
      });
      // Etiketler
      els.push(createText(60, 5, 60, 32, 'A', 32, 'center', false, 'sans', COLOR_MAIN, 700));
      els.push(createText(300, 5, 60, 32, 'B', 32, 'center', false, 'sans', COLOR_MAIN, 700));
    } else {
      // 3 Küme: Üst (A), Sol alt (B), Sağ alt (C)
      els.push({
        id: newId(),
        type: 'ellipse',
        x1: 120,
        y1: 30,
        x2: 340,
        y2: 250,
        fill: '#1971c233',
        color: COLOR_MAIN,
        width: 3.5,
      });
      els.push({
        id: newId(),
        type: 'ellipse',
        x1: 40,
        y1: 140,
        x2: 260,
        y2: 360,
        fill: '#e0313133',
        color: COLOR_MAIN,
        width: 3.5,
      });
      els.push({
        id: newId(),
        type: 'ellipse',
        x1: 200,
        y1: 140,
        x2: 420,
        y2: 360,
        fill: '#25634b33',
        color: COLOR_MAIN,
        width: 3.5,
      });

      els.push(createText(200, 0, 60, 30, 'A', 30, 'center', false, 'sans', COLOR_MAIN, 700));
      els.push(createText(20, 220, 60, 30, 'B', 30, 'center', false, 'sans', COLOR_MAIN, 700));
      els.push(createText(380, 220, 60, 30, 'C', 30, 'center', false, 'sans', COLOR_MAIN, 700));
    }

    return els;
  },
};

// --------------------------------------------------------
// 8. Zihin haritası
// --------------------------------------------------------
export const mindMapItem: LibraryItem = {
  id: 'general.mind-map',
  name: 'Zihin haritası',
  category: 'genel',
  keywords: ['zihin haritası', 'zihin haritasi', 'kavram haritası', 'beyin fırtınası', 'fikir', 'şema', 'diyagram', 'genel'],
  params: [
    { key: 'dal', label: 'Dal sayısı', type: 'number', min: 3, max: 8, default: 4 },
  ],
  build: (params) => {
    const dal = Math.max(3, Math.min(8, Math.round(params?.dal ?? 4)));
    const els: BoardEl[] = [];
    const cx = 400;
    const cy = 300;
    const rDist = 240;

    // Dallar ve uç kutular
    for (let i = 0; i < dal; i++) {
      const angle = (2 * Math.PI / dal) * i - Math.PI / 2;
      const targetX = Math.round(cx + Math.cos(angle) * rDist);
      const targetY = Math.round(cy + Math.sin(angle) * rDist);
      const startX = Math.round(cx + Math.cos(angle) * 100);
      const startY = Math.round(cy + Math.sin(angle) * 50);

      // Dal çizgisi
      els.push({
        id: newId(),
        type: 'line',
        x1: startX,
        y1: startY,
        x2: targetX,
        y2: targetY,
        width: 3,
        color: COLOR_MAIN,
      });

      // Uç kutu
      els.push({
        id: newId(),
        type: 'rect',
        x1: targetX - 70,
        y1: targetY - 28,
        x2: targetX + 70,
        y2: targetY + 28,
        rx: 8,
        fill: '#ffffff',
        color: COLOR_MAIN,
        width: 2.5,
      });
      // Metin
      els.push(
        createText(targetX - 65, targetY - 14, 130, 28, `Fikir ${i + 1}`, 20, 'center')
      );
    }

    // Merkez elips (en üstte görünsün diye kollardan sonra eklenir)
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: cx - 100,
      y1: cy - 50,
      x2: cx + 100,
      y2: cy + 50,
      fill: '#25634b33',
      color: COLOR_MAIN,
      width: 3.5,
    });
    els.push(createText(cx - 90, cy - 18, 180, 36, 'Ana fikir', 28, 'center', false, 'sans', COLOR_MAIN, 700));

    return els;
  },
};

// --------------------------------------------------------
// 9. Zaman çizelgesi
// --------------------------------------------------------
export const timelineItem: LibraryItem = {
  id: 'general.timeline',
  name: 'Zaman çizelgesi',
  category: 'genel',
  keywords: ['zaman çizelgesi', 'zaman cizelgesi', 'zaman', 'tarih', 'kronoloji', 'süreç', 'olay', 'tarih şeridi', 'genel'],
  params: [
    { key: 'olay', label: 'Olay sayısı', type: 'number', min: 3, max: 8, default: 5 },
  ],
  build: (params) => {
    const olay = Math.max(3, Math.min(8, Math.round(params?.olay ?? 5)));
    const els: BoardEl[] = [];

    const step = 150;
    const totalW = olay * step + 60;
    const yLine = 100;

    // Ana yatay ok
    els.push({
      id: newId(),
      type: 'arrow',
      x1: 20,
      y1: yLine,
      x2: totalW,
      y2: yLine,
      width: 4,
      color: COLOR_MAIN,
    });

    for (let i = 0; i < olay; i++) {
      const cx = 60 + i * step;

      // Çentik çizgisi
      els.push({
        id: newId(),
        type: 'line',
        x1: cx,
        y1: yLine - 15,
        x2: cx,
        y2: yLine + 15,
        width: 2.5,
        color: COLOR_MAIN,
      });

      // Dolu merkez nokta
      els.push({
        id: newId(),
        type: 'ellipse',
        x1: cx - 8,
        y1: yLine - 8,
        x2: cx + 8,
        y2: yLine + 8,
        fill: COLOR_MAIN,
        color: COLOR_MAIN,
        width: 2,
      });

      // Tarih etiketi (üstte)
      els.push(createText(cx - 50, yLine - 52, 100, 28, 'Tarih', 20, 'center', true, 'sans', '#6b7280'));
      // Olay etiketi (altta)
      els.push(createText(cx - 65, yLine + 25, 130, 36, `Olay ${i + 1}`, 22, 'center', false, 'sans', COLOR_MAIN, 700));
    }

    return els;
  },
};

// --------------------------------------------------------
// 10. Kontrol listesi
// --------------------------------------------------------
export const checklistItem: LibraryItem = {
  id: 'general.checklist',
  name: 'Kontrol listesi',
  category: 'genel',
  keywords: ['kontrol listesi', 'liste', 'yapılacaklar', 'yapilacaklar', 'madde', 'kutu', 'onay', 'genel'],
  params: [
    { key: 'madde', label: 'Madde sayısı', type: 'number', min: 3, max: 10, default: 5 },
  ],
  build: (params) => {
    const madde = Math.max(3, Math.min(10, Math.round(params?.madde ?? 5)));
    const els: BoardEl[] = [];

    for (let i = 0; i < madde; i++) {
      const y = 20 + i * 54;
      // Boş onay kutusu
      els.push({
        id: newId(),
        type: 'rect',
        x1: 20,
        y1: y,
        x2: 48,
        y2: y + 28,
        rx: 6,
        fill: '#ffffff',
        color: COLOR_MAIN,
        width: 2.5,
      });
      // Madde metni
      els.push(createText(60, y - 2, 280, 32, `Madde ${i + 1}`, 24, 'left'));
    }

    return els;
  },
};

// --------------------------------------------------------
// 11. Karşılaştırma tablosu (T şeması)
// --------------------------------------------------------
export const tChartItem: LibraryItem = {
  id: 'general.t-chart',
  name: 'Karşılaştırma tablosu (T şeması)',
  category: 'genel',
  keywords: ['t şeması', 't semasi', 't tablosu', 'karşılaştırma', 'karsilastirma', 'benzerlik', 'farklılık', 'genel'],
  build: () => {
    const els: BoardEl[] = [];

    // Başlık arka plan dolguları
    els.push({
      id: newId(),
      type: 'rect',
      x1: 20,
      y1: 15,
      x2: 320,
      y2: 70,
      fill: '#1971c215',
      color: 'none',
      width: 0,
    });
    els.push({
      id: newId(),
      type: 'rect',
      x1: 320,
      y1: 15,
      x2: 620,
      y2: 70,
      fill: '#f08c0015',
      color: 'none',
      width: 0,
    });

    // T çizgileri
    els.push({ id: newId(), type: 'line', x1: 20, y1: 70, x2: 620, y2: 70, width: 4, color: COLOR_MAIN });
    els.push({ id: newId(), type: 'line', x1: 320, y1: 15, x2: 320, y2: 420, width: 4, color: COLOR_MAIN });

    // Başlıklar
    els.push(createText(20, 22, 290, 40, 'Benzerlikler', 28, 'center', false, 'sans', COLOR_MAIN, 700));
    els.push(createText(330, 22, 290, 40, 'Farklılıklar', 28, 'center', false, 'sans', COLOR_MAIN, 700));

    return els;
  },
};

// --------------------------------------------------------
// 12. Yıldız
// --------------------------------------------------------
export const starItem: LibraryItem = {
  id: 'general.star',
  name: 'Yıldız',
  category: 'genel',
  keywords: ['yıldız', 'yildiz', 'star', 'ödül', 'odul', 'başarı', 'beşgen', 'genel'],
  build: () => {
    const cx = 110;
    const cy = 110;
    const rOuter = 100;
    const rInner = 42;
    const pts: number[] = [];

    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      pts.push(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r));
    }

    const starPoly: PolyEl = {
      id: newId(),
      type: 'poly',
      points: pts,
      fill: '#fcc419',
      color: COLOR_MAIN,
      width: 3.5,
    };
    return [starPoly];
  },
};

// --------------------------------------------------------
// 13. Rozet
// --------------------------------------------------------
export const badgeItem: LibraryItem = {
  id: 'general.badge',
  name: 'Rozet',
  category: 'genel',
  keywords: ['rozet', 'kurdele', 'madalya', 'başarı', 'basari', 'ödül', 'tebrik', 'genel'],
  build: () => {
    const els: BoardEl[] = [];

    // Kurdeleler (kırmızı)
    const ribbonLeft: PolyEl = {
      id: newId(),
      type: 'poly',
      points: [70, 110, 40, 230, 80, 205, 105, 230, 95, 110],
      fill: '#e03131',
      color: COLOR_MAIN,
      width: 3,
    };
    els.push(ribbonLeft);

    const ribbonRight: PolyEl = {
      id: newId(),
      type: 'poly',
      points: [115, 110, 105, 230, 130, 205, 170, 230, 140, 110],
      fill: '#e03131',
      color: COLOR_MAIN,
      width: 3,
    };
    els.push(ribbonRight);

    // Dış madalya çemberi (altın sarısı)
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 40,
      y1: 20,
      x2: 170,
      y2: 150,
      fill: '#fcc419',
      color: COLOR_MAIN,
      width: 3.5,
    });
    // İç dekoratif çember
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 54,
      y1: 34,
      x2: 156,
      y2: 136,
      fill: '#fff3bf',
      color: COLOR_MAIN,
      width: 2,
    });
    // İçteki yıldız sembolü
    els.push(createText(40, 48, 130, 60, '★', 54, 'center', false, 'sans', '#e03131'));

    return els;
  },
};

// --------------------------------------------------------
// 14. Etiket kutusu
// --------------------------------------------------------
export const labelBoxItem: LibraryItem = {
  id: 'general.label-box',
  name: 'Etiket kutusu',
  category: 'genel',
  keywords: ['etiket kutusu', 'etiket', 'başlık', 'baslik', 'kutu', 'afiş', 'banner', 'genel'],
  build: () => {
    const els: BoardEl[] = [];

    // Dış dolgulu kutu
    els.push({
      id: newId(),
      type: 'rect',
      x1: 10,
      y1: 10,
      x2: 390,
      y2: 100,
      rx: 12,
      fill: '#25634b33',
      color: COLOR_MAIN,
      width: 4,
    });
    // İç ince dekoratif çerçeve
    els.push({
      id: newId(),
      type: 'rect',
      x1: 18,
      y1: 18,
      x2: 382,
      y2: 92,
      rx: 8,
      fill: 'none',
      color: COLOR_MAIN,
      width: 1.5,
    });
    // Ortada başlık metni
    els.push(createText(20, 32, 360, 48, 'Başlık', 38, 'center', false, 'display', COLOR_MAIN, 700));

    return els;
  },
};

export const GENEL_ITEMS: LibraryItem[] = [
  thoughtBubbleItem,
  arrowStraightItem,
  arrowDoubleItem,
  arrowCurvedItem,
  arrowLoopItem,
  tableItem,
  vennItem,
  mindMapItem,
  timelineItem,
  checklistItem,
  tChartItem,
  starItem,
  badgeItem,
  labelBoxItem,
];

