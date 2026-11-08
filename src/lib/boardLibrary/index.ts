import { LibraryCategory, LibraryItem } from './types';
import { coordinatePlaneItem, numberLineItem, speechBubbleItem } from './items';

export * from './types';
export * from './insert';

export const LIBRARY_CATEGORY_LABEL: Record<LibraryCategory, string> = {
  matematik: 'Matematik',
  fen: 'Fen',
  genel: 'Genel',
};

export const LIBRARY_ITEMS: LibraryItem[] = [
  numberLineItem,
  coordinatePlaneItem,
  speechBubbleItem,
];

