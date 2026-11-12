import { newId } from '../boardData';
import { LibraryItem } from './types';

const SCHOOL_SUPPLIES = [
  { slug: 'school-bag', name: 'Okul çantası', keywords: ['çanta', 'canta', 'backpack'] },
  { slug: 'pencil', name: 'Kurşun kalem', keywords: ['kalem', 'kursun', 'pencil'] },
  { slug: 'pen', name: 'Tükenmez kalem', keywords: ['kalem', 'tukenmez', 'pen'] },
  { slug: 'crayon', name: 'Pastel boya', keywords: ['boya', 'pastel', 'crayon'] },
  { slug: 'ruler', name: 'Cetvel görseli', keywords: ['cetvel', 'ruler', 'ölçme'] },
  { slug: 'set-square', name: 'Gönye görseli', keywords: ['gönye', 'gonye', 'üçgen cetvel'] },
  { slug: 'notebook', name: 'Defter', keywords: ['defter', 'notebook'] },
  { slug: 'notepad', name: 'Spiralli not defteri', keywords: ['spiral', 'not', 'defter', 'notepad'] },
  { slug: 'book', name: 'Kapalı kitap', keywords: ['kitap', 'book', 'okuma'] },
  { slug: 'open-book', name: 'Açık kitap', keywords: ['kitap', 'acik kitap', 'okuma'] },
  { slug: 'books', name: 'Kitaplar', keywords: ['kitap', 'kitaplar', 'books', 'kütüphane'] },
  { slug: 'scissors', name: 'Makas', keywords: ['makas', 'kesme', 'scissors'] },
  { slug: 'paperclip', name: 'Ataş', keywords: ['ataş', 'atas', 'paperclip'] },
  { slug: 'paintbrush', name: 'Boya fırçası', keywords: ['boya', 'fırça', 'firca', 'paintbrush'] },
];

export const SCHOOL_ITEMS: LibraryItem[] = SCHOOL_SUPPLIES.map(({ slug, name, keywords }) => {
  const source = `/board-library/school/${slug}.png`;
  return {
    id: `school.${slug}`,
    name,
    category: 'genel',
    keywords: ['okul eşyaları', 'okul', 'eşya', 'esya', 'kırtasiye', 'kirtasiye', ...keywords],
    imageSource: source,
    build: () => [{ id: newId(), type: 'image', bucket: 'builtin-library', path: source, x: 0, y: 0, w: 256, h: 256 }],
  };
});
