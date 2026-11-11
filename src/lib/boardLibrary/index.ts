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
import { GEOMETRY_ITEMS } from './itemsGeometry';
import { TURKISH_ITEMS } from './itemsTurkish';
import { MEASUREMENT_ITEMS } from './itemsMeasurement';
import { DATA_ITEMS } from './itemsData';
import { BIOLOGY_ITEMS } from './itemsBiology';
import { TIME_DIRECTION_ITEMS } from './itemsTimeDirection';
import { PRACTICE_ITEMS } from './itemsPractice';
import { LITERACY_ITEMS } from './itemsLiteracy';
import { MATTER_ITEMS } from './itemsMatter';
import { SPATIAL_ITEMS } from './itemsSpatial';
import { MUSIC_ITEMS } from './itemsMusic';
import { MACHINE_ITEMS } from './itemsMachines';
import { EARLY_MATH_ITEMS } from './itemsEarlyMath';
import { LIGHT_FORCE_ITEMS } from './itemsLightForce';
import { NUMBER_OPERATION_ITEMS } from './itemsNumberOperations';
import { WRITTEN_ARITHMETIC_ITEMS } from './itemsWrittenArithmetic';
import { PROBABILITY_ITEMS } from './itemsProbability';
import { EARTH_SKY_ITEMS } from './itemsEarthSky';
import { CHART_ITEMS } from './itemsCharts';

export * from './types';
export * from './insert';
export * from './items';
export * from './itemsFen';
export * from './itemsGenel';
export * from './userLibrary';

export const LIBRARY_CATEGORY_LABEL: Record<LibraryCategory, string> = {
  matematik: 'Matematik',
  fen: 'Fen',
  genel: 'Genel',
  diger: 'Diğer',
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

  ...GEOMETRY_ITEMS,
  ...MEASUREMENT_ITEMS,
  ...DATA_ITEMS,
  ...PRACTICE_ITEMS,
  ...SPATIAL_ITEMS,
  ...EARLY_MATH_ITEMS,
  ...NUMBER_OPERATION_ITEMS,
  ...WRITTEN_ARITHMETIC_ITEMS,
  ...PROBABILITY_ITEMS,
  ...CHART_ITEMS,

  // Fen
  ...FEN_ITEMS,
  ...BIOLOGY_ITEMS,
  ...MATTER_ITEMS,
  ...MACHINE_ITEMS,
  ...LIGHT_FORCE_ITEMS,
  ...EARTH_SKY_ITEMS.filter(item => item.category === 'fen'),

  // Genel
  speechBubbleItem,
  ...GENEL_ITEMS,
  ...TURKISH_ITEMS,
  ...LITERACY_ITEMS,
  ...TIME_DIRECTION_ITEMS,
  ...MUSIC_ITEMS,
  ...EARTH_SKY_ITEMS.filter(item => item.category === 'genel'),
];

