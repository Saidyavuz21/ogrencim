import { BoardEl } from '../boardData';

export type LibraryCategory = 'matematik' | 'fen' | 'genel';

export interface LibraryParam {
  key: string;
  label: string;
  type: 'number';
  min: number;
  max: number;
  step?: number;
  default: number;
}

export interface LibraryItem {
  id: string; // kalıcı, ör. 'math.number-line'
  name: string; // 'Sayı doğrusu'
  category: LibraryCategory;
  keywords?: string[]; // arama için: ['sayı', 'doğru', 'tam sayı']
  params?: LibraryParam[]; // bu işte KULLANILMAYACAK, yalnızca tip olarak dursun
  build: (params?: Record<string, number>) => BoardEl[]; // (0,0) başlangıçlı öğeler; id'ler önemsiz, eklerken yenilenir
}

