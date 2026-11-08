import { BoardEl, newId } from '../boardData';
import { LibraryItem } from './types';

export const numberLineItem: LibraryItem = {
  id: 'math.number-line',
  name: 'Sayı doğrusu',
  category: 'matematik',
  keywords: ['sayı', 'sayi', 'doğru', 'dogru', 'sayı doğrusu', 'tam sayı', 'pozitif', 'negatif', 'matematik'],
  build: () => {
    const els: BoardEl[] = [];
    const yLine = 30;

    // Ana doğru (iki uçta ok başı)
    els.push({
      id: newId(),
      type: 'arrow',
      x1: 0,
      y1: yLine,
      x2: 1000,
      y2: yLine,
      color: '#1f2a24',
      width: 4,
    });
    els.push({
      id: newId(),
      type: 'arrow',
      x1: 60,
      y1: yLine,
      x2: 0,
      y2: yLine,
      color: '#1f2a24',
      width: 4,
    });

    // 0'dan 10'a çentikler ve sayılar
    const startX = 50;
    const step = 90; // 50..950 arası 10 eşit aralık
    for (let i = 0; i <= 10; i++) {
      const cx = startX + i * step;
      // Dikey çentik (24 birim)
      els.push({
        id: newId(),
        type: 'line',
        x1: cx,
        y1: yLine - 12,
        x2: cx,
        y2: yLine + 12,
        color: '#1f2a24',
        width: 3,
      });

      // Sayı etiketi
      els.push({
        id: newId(),
        type: 'note',
        variant: 'text',
        x: cx - 25,
        y: yLine + 18,
        w: 50,
        h: 46,
        text: String(i),
        fontSize: 32,
        align: 'center',
        textColor: '#1f2a24',
        color: 'transparent',
        fontFamily: 'sans',
      });
    }

    return els;
  },
};

export const coordinatePlaneItem: LibraryItem = {
  id: 'math.coord-plane',
  name: 'Koordinat düzlemi',
  category: 'matematik',
  keywords: ['koordinat', 'düzlem', 'duzlem', 'eksen', 'kartezyen', 'orijin', 'x', 'y', 'matematik'],
  build: () => {
    const els: BoardEl[] = [];
    const size = 600;
    const step = 60; // 1 birim = 60 px (-5..5 aralığı 10 birim = 600 px)
    const mid = size / 2; // 300

    // Izgara çizgileri (ince, #c9c5b8)
    for (let i = 0; i <= 10; i++) {
      const pos = i * step;
      // Dikey ızgara
      els.push({
        id: newId(),
        type: 'line',
        x1: pos,
        y1: 0,
        x2: pos,
        y2: size,
        color: '#c9c5b8',
        width: 1,
      });
      // Yatay ızgara
      els.push({
        id: newId(),
        type: 'line',
        x1: 0,
        y1: pos,
        x2: size,
        y2: pos,
        color: '#c9c5b8',
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
      color: '#1f2a24',
      width: 4,
    });
    els.push({
      id: newId(),
      type: 'arrow',
      x1: 20,
      y1: mid,
      x2: -20,
      y2: mid,
      color: '#1f2a24',
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
      color: '#1f2a24',
      width: 4,
    });
    els.push({
      id: newId(),
      type: 'arrow',
      x1: mid,
      y1: size - 20,
      x2: mid,
      y2: size + 20,
      color: '#1f2a24',
      width: 4,
    });

    // Eksen etiketleri
    els.push({
      id: newId(),
      type: 'note',
      variant: 'text',
      x: size + 34,
      y: mid - 20,
      w: 30,
      h: 40,
      text: 'x',
      fontSize: 28,
      align: 'left',
      textColor: '#1f2a24',
      color: 'transparent',
    });
    els.push({
      id: newId(),
      type: 'note',
      variant: 'text',
      x: mid + 10,
      y: -44,
      w: 30,
      h: 40,
      text: 'y',
      fontSize: 28,
      align: 'left',
      textColor: '#1f2a24',
      color: 'transparent',
    });

    // ±5 etiketleri
    // -5 (x)
    els.push({
      id: newId(),
      type: 'note',
      variant: 'text',
      x: -25,
      y: mid + 8,
      w: 50,
      h: 36,
      text: '-5',
      fontSize: 24,
      align: 'center',
      textColor: '#1f2a24',
      color: 'transparent',
    });
    // 5 (x)
    els.push({
      id: newId(),
      type: 'note',
      variant: 'text',
      x: size - 25,
      y: mid + 8,
      w: 50,
      h: 36,
      text: '5',
      fontSize: 24,
      align: 'center',
      textColor: '#1f2a24',
      color: 'transparent',
    });
    // 5 (y)
    els.push({
      id: newId(),
      type: 'note',
      variant: 'text',
      x: mid - 46,
      y: -18,
      w: 40,
      h: 36,
      text: '5',
      fontSize: 24,
      align: 'right',
      textColor: '#1f2a24',
      color: 'transparent',
    });
    // -5 (y)
    els.push({
      id: newId(),
      type: 'note',
      variant: 'text',
      x: mid - 46,
      y: size - 18,
      w: 40,
      h: 36,
      text: '-5',
      fontSize: 24,
      align: 'right',
      textColor: '#1f2a24',
      color: 'transparent',
    });

    return els;
  },
};

export const speechBubbleItem: LibraryItem = {
  id: 'general.speech-bubble',
  name: 'Konuşma balonu',
  category: 'genel',
  keywords: ['konuşma', 'konusma', 'balon', 'balonu', 'mesaj', 'diyalog', 'genel', 'metin', 'yazı'],
  build: () => {
    const els: BoardEl[] = [];

    // Ana elips
    els.push({
      id: newId(),
      type: 'ellipse',
      x1: 10,
      y1: 10,
      x2: 370,
      y2: 210,
      color: '#1f2a24',
      width: 4,
      fill: '#ffffff',
    });

    // Kuyruk iki çizgisi
    els.push({
      id: newId(),
      type: 'line',
      x1: 75,
      y1: 195,
      x2: 20,
      y2: 260,
      color: '#1f2a24',
      width: 4,
    });
    els.push({
      id: newId(),
      type: 'line',
      x1: 130,
      y1: 205,
      x2: 20,
      y2: 260,
      color: '#1f2a24',
      width: 4,
    });

    // Ortada metin
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
      textColor: '#1f2a24',
      color: 'transparent',
    });

    return els;
  },
};

