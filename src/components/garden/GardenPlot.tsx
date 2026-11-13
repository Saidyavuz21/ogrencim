import React, { useId } from 'react';
import type { GardenBehavior, GardenTree } from '../../lib/gardenData';
import { GARDEN_UNLOCKS, gardenLevel, gardenUnlocks, growthStage, waterRights, wateringsToNext } from '../../lib/gardenData';
import { VillageHouse, Pond, ParkBench, GardenSwing, BirdsAndBirdhouse, Butterflies, Wildflowers, FairyLights, Rainbow } from './GardenScene';
import { TreeArt, getGardenIcon, TREE_NAMES, STAGE_NAMES } from './GardenArt';
import { Droplet, Sprout } from '../icons';
import { GardenFlowerBeds, GardenTools, PondDuck } from './GardenDetails';
import styles from './Garden.module.css';

export interface GardenPlotProps {
  behaviors: GardenBehavior[];
  trees: GardenTree[];
  size?: 'sm' | 'md' | 'lg';
  onTreeClick?: (behavior: GardenBehavior, tree?: GardenTree) => void;
  highlightWater?: boolean;
  title?: string;
  /** Öğrenci: ağacın yanındaki damlaya basınca sular */
  onWater?: (behavior: GardenBehavior, tree: GardenTree) => void;
  /** Şu an sulanan davranış (damla kilitlenir, ağaçta su animasyonu) */
  wateringId?: string | null;
}

/** Sulama animasyonu: kap eğilir, damlalar akar, toprakta halka açılır */
function WateringAnimation() {
  return (
    <span className={styles.orchardWatering} aria-hidden="true">
      <svg className={styles.waterCan} viewBox="0 0 84 64" focusable="false">
        <path d="M52 40 L72 20" stroke="#1f5d6c" strokeWidth="7" strokeLinecap="round" />
        <path d="M52 40 L72 20" stroke="#5aaec2" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="74.5" cy="17.5" rx="6.5" ry="4" transform="rotate(-45 74.5 17.5)" fill="#5aaec2" stroke="#1f5d6c" strokeWidth="2.5" />
        <path d="M19 24 C19 9 45 9 45 24" fill="none" stroke="#1f5d6c" strokeWidth="4" strokeLinecap="round" />
        <path d="M14 24 H50 A4 4 0 0 1 54 28 V52 A7 7 0 0 1 47 59 H17 A7 7 0 0 1 10 52 V28 A4 4 0 0 1 14 24 Z" fill="#5aaec2" stroke="#1f5d6c" strokeWidth="3" />
        <path d="M17 33 H42" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className={styles.waterStream}><i /><i /><i /><i /><i /><i /></span>
      <span className={styles.waterSplash} /><span className={`${styles.waterSplash} ${styles.waterSplashLate}`} />
    </span>
  );
}

function Ornament({ className, viewBox, children }: { className: string; viewBox: string; children: React.ReactNode }) {
  return <svg className={className} viewBox={viewBox} aria-hidden="true" focusable="false">{children}</svg>;
}

export function GardenPlot({ behaviors, trees, size = 'md', onTreeClick, highlightWater = false, title, onWater, wateringId = null }: GardenPlotProps) {
  const figId = useId();
  const pondId = `${figId}-pond`;
  const level = gardenLevel(trees);
  const { unlocked } = gardenUnlocks(level, behaviors.filter((b) => !b.archived).length);
  const sortedBehaviors = [...behaviors]
    .filter((b) => !b.archived || trees.some((t) => t.behavior_id === b.id && t.earned > 0))
    .sort((a, b) => a.sort - b.sort);
  const summaries = sortedBehaviors.map((b) => {
    const tree = trees.find((t) => t.behavior_id === b.id);
    return tree && tree.earned >= 1 ? `${b.name}: ${TREE_NAMES[b.tree] || 'Ağaç'}, ${STAGE_NAMES[growthStage(tree.watered)]}` : `${b.name}: Henüz fidan dikilmedi`;
  });
  const unlockedNames = GARDEN_UNLOCKS.filter((u) => unlocked.has(u.key)).map((u) => u.name).join(', ');

  return (
    <figure className={`${styles.landscapeFigure} ${size === 'sm' ? styles.figureSmall : ''}`}>
      {title && <div className={styles.plotSkyline}>
        <div><h3 className={styles.plotTitle}>{title}</h3><p className={styles.plotSubtitle}>Her güzel davranış burada büyür.</p></div>
        <span className={styles.landscapeLevelBadge}><Sprout size={16} aria-hidden="true" /> Seviye {level}</span>
      </div>}
      <figcaption id={figId} className={styles.srOnly}>
        Bahçe seviyesi {level}. {unlockedNames ? `Açılan manzara öğeleri: ${unlockedNames}. ` : ''}{summaries.join('. ')}
      </figcaption>
      <div className={styles.orchard} aria-describedby={figId}>
        {/* Gökkuşağı gökyüzündedir: tepelerin arkasında çizilir, uçları tepelerin ardında kaybolur */}
        <div className={styles.gardenHorizon} aria-hidden="true">
          {unlocked.has('rainbow') && <svg className={styles.orchardRainbow} viewBox="110 165 980 300" aria-hidden="true" focusable="false"><Rainbow /></svg>}
          <span /><span /><span />
        </div>
        {unlocked.has('house') && <Ornament className={styles.orchardHouse} viewBox="890 175 180 160"><VillageHouse upgraded={unlocked.has('house2')} /></Ornament>}
        {unlocked.has('house') && <GardenTools />}
        {unlocked.has('flowers') && <GardenFlowerBeds />}
        {unlocked.has('birds') && <Ornament className={styles.orchardBirds} viewBox="835 265 60 80"><BirdsAndBirdhouse /></Ornament>}
        {unlocked.has('path') && <svg className={styles.orchardPath} viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true"><path d="M620 820 C590 710 930 670 880 535 S790 390 1000 276" fill="none" stroke="#d2ba92" strokeWidth="44" /><path d="M620 820 C590 710 930 670 880 535 S790 390 1000 276" fill="none" stroke="#ead5b1" strokeWidth="37" /></svg>}
        {unlocked.has('lights') && <Ornament className={styles.orchardLights} viewBox="100 340 1000 200"><FairyLights /></Ornament>}
        <div className={styles.orchardTrees}>
          {sortedBehaviors.map((behavior) => {
            const tree = trees.find((t) => t.behavior_id === behavior.id);
            const planted = Boolean(tree && tree.earned >= 1);
            const stage = planted && tree ? growthStage(tree.watered) : 0;
            const rights = planted && tree ? waterRights(tree) : 0;
            const Icon = getGardenIcon(behavior.icon);
            const label = `${behavior.name}: ${planted && tree ? `${STAGE_NAMES[stage]}, ${tree.watered} kez sulandı, ${rights} sulama hakkı` : 'Henüz fidan dikilmedi'}`;
            const content = <>
              <span className={`${styles.orchardTreeVisual} ${!planted ? styles.orchardUnplanted : ''} ${wateringId === behavior.id ? styles.orchardTreeDrinking : ''}`}>
                <span className={styles.orchardSoil} />
                {planted ? <TreeArt tree={behavior.tree} stage={stage} size={144} /> : <Sprout className={styles.orchardEmptySprout} size={38} aria-hidden="true" />}
                {wateringId === behavior.id && <WateringAnimation />}
                {onWater && tree && rights > 0 ? (() => {
                  const toNext = wateringsToNext(tree.watered);
                  return (
                    <button
                      type="button"
                      className={`${styles.orchardWater} ${styles.orchardWaterButton}`}
                      onClick={() => onWater(behavior, tree)}
                      disabled={wateringId !== null}
                      aria-label={`${behavior.name} ağacını sula, ${rights} sulama hakkı${toNext !== null ? `, sonraki aşamaya ${toNext} sulama` : ''}`}
                      title={toNext !== null ? `Sula · sonraki aşamaya ${toNext} sulama` : 'Sula'}
                    >
                      <Droplet size={18} aria-hidden="true" />{rights}
                    </button>
                  );
                })() : highlightWater && rights > 0 && <span className={styles.orchardWater}><Droplet size={15} aria-hidden="true" />{rights}</span>}
              </span>
              <span className={styles.orchardLabel}><Icon size={14} aria-hidden="true" /><span>{behavior.name}</span></span>
              <span className={styles.orchardStage}>{planted ? STAGE_NAMES[stage] : 'Henüz dikilmedi'}</span>
            </>;
            return onTreeClick ? <button key={behavior.id} type="button" className={styles.orchardTree} onClick={() => onTreeClick(behavior, tree)} aria-label={label}>{content}</button>
              : onWater ? <div key={behavior.id} className={styles.orchardTree} role="group" aria-label={label}>{content}</div>
              : <div key={behavior.id} className={styles.orchardTree} role="img" aria-label={label}>{content}</div>;
          })}
          {sortedBehaviors.length === 0 && <div className={styles.orchardEmpty}><Sprout size={42} aria-hidden="true" /><p>İlk fidanını bekleyen bir bahçe.</p></div>}
        </div>
        {unlocked.has('flowers') && <Ornament className={styles.orchardFlowers} viewBox="100 340 1000 200"><Wildflowers /></Ornament>}
          {unlocked.has('pond') && <Ornament className={styles.orchardPond} viewBox="35 450 210 115"><defs><linearGradient id={pondId} x2="0" y2="1"><stop stopColor="#a4d5ce" /><stop offset="1" stopColor="#639eaa" /></linearGradient></defs><Pond fill={`url(#${pondId})`} /><PondDuck /></Ornament>}
        <div className={styles.orchardAmenities}>
          {unlocked.has('bench') && <Ornament className={styles.orchardBench} viewBox="700 380 65 55"><ParkBench /></Ornament>}
          {unlocked.has('swing') && <Ornament className={styles.orchardSwing} viewBox="230 350 85 90"><GardenSwing /></Ornament>}
        </div>
        {unlocked.has('fence') && <div className={`${styles.orchardFence} ${unlocked.has('path') ? styles.orchardFenceGate : ''}`} aria-hidden="true">{Array.from({ length: 19 }, (_, i) => <i key={i} />)}</div>}
        {unlocked.has('butterflies') && <Ornament className={styles.orchardButterflies} viewBox="180 270 800 230"><Butterflies /></Ornament>}
      </div>
    </figure>
  );
}
