import { LibraryCategory, LibraryItem } from './types';
import {
  angleItem,
  baseTenFlatItem,
  baseTenRodItem,
  baseTenUnitItem,
  circleItem,
  clockItem,
  coordinatePlaneItem,
  fractionBarItem,
  fractionPieItem,
  fractionWallItem,
  hundredChartItem,
  numberLineItem,
  parallelogramItem,
  protractorItem,
  rectangleItem,
  rhombusItem,
  rulerItem,
  speechBubbleItem,
  squareItem,
  trapezoidItem,
  triangleEquilateralItem,
  triangleIsoscelesItem,
  triangleObtuseItem,
  triangleRightItem,
  triangleScaleneItem,
} from './items';
import { FEN_ITEMS } from './itemsFen';
import { GENEL_ITEMS } from './itemsGenel';

export * from './types';
export * from './insert';
export * from './items';
export * from './itemsFen';
export * from './itemsGenel';

export const LIBRARY_CATEGORY_LABEL: Record<LibraryCategory, string> = {
  matematik: 'Matematik',
  fen: 'Fen',
  genel: 'Genel',
};

export const LIBRARY_ITEMS: LibraryItem[] = [
  // Matematik
  numberLineItem,
  coordinatePlaneItem,
  fractionPieItem,
  fractionBarItem,
  fractionWallItem,
  rulerItem,
  protractorItem,
  angleItem,
  triangleEquilateralItem,
  triangleIsoscelesItem,
  triangleRightItem,
  triangleScaleneItem,
  triangleObtuseItem,
  squareItem,
  rectangleItem,
  parallelogramItem,
  trapezoidItem,
  rhombusItem,
  circleItem,
  baseTenUnitItem,
  baseTenRodItem,
  baseTenFlatItem,
  hundredChartItem,
  clockItem,

  // Fen
  ...FEN_ITEMS,

  // Genel
  speechBubbleItem,
  ...GENEL_ITEMS,
];

