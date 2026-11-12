import React, { useId } from 'react';
import type { GardenBehavior, GardenTree } from '../../lib/gardenData';
import {
  GARDEN_UNLOCKS,
  gardenLevel,
  gardenUnlocks,
  growthStage,
  waterRights,
} from '../../lib/gardenData';
import { GardenSceneLayers } from './GardenScene';
import { TreeArt, getGardenIcon, TREE_NAMES, STAGE_NAMES } from './GardenArt';
import { Droplet } from '../icons';
import styles from './Garden.module.css';

export interface GardenPlotProps {
  behaviors: GardenBehavior[];
  trees: GardenTree[];
  size?: 'sm' | 'md' | 'lg';
  onTreeClick?: (behavior: GardenBehavior, tree?: GardenTree) => void;
  highlightWater?: boolean;
  title?: string;
}

/**
 * 12 Sabit Ağaç/Tarh Konumu (Arka, orta ve ön derinlik katmanları)
 * Sahnedeki patika, ev, gölet ve bank ile çakışmayacak şekilde dengelenmiştir.
 */
export const TREE_SLOTS = [
  // Arka hat (Ölçek ~0.65)
  { id: 0, x: 210, y: 315, scale: 0.65 },
  { id: 1, x: 370, y: 305, scale: 0.65 },
  { id: 2, x: 530, y: 300, scale: 0.65 },
  { id: 3, x: 690, y: 310, scale: 0.65 },

  // Orta hat (Ölçek ~0.82)
  { id: 4, x: 130, y: 395, scale: 0.8 },
  { id: 5, x: 320, y: 385, scale: 0.82 },
  { id: 6, x: 480, y: 405, scale: 0.82 },
  { id: 7, x: 845, y: 385, scale: 0.82 },
  { id: 8, x: 1060, y: 360, scale: 0.8 },

  // Ön hat (Ölçek ~1.0)
  { id: 9, x: 350, y: 485, scale: 0.98 },
  { id: 10, x: 740, y: 495, scale: 1.0 },
  { id: 11, x: 970, y: 480, scale: 0.98 },
] as const;

export function GardenPlot({
  behaviors,
  trees,
  size = 'md',
  onTreeClick,
  highlightWater = false,
  title,
}: GardenPlotProps) {
  const figId = useId();
  const level = gardenLevel(trees);
  const { unlocked } = gardenUnlocks(level);

  // Davranışları sort sırasına göre sırala
  const sortedBehaviors = [...behaviors]
    .filter((b) => !b.archived || trees.some((t) => t.behavior_id === b.id && t.earned > 0))
    .sort((a, b) => a.sort - b.sort);

  // Ağaç yuvalarını hazırla ve y-derinlik sırasına göre sırala (arkadaki önce çizilir)
  const renderSlots = TREE_SLOTS.map((slot, index) => {
    const behavior = sortedBehaviors[index] as GardenBehavior | undefined;
    const tree = behavior ? trees.find((t) => t.behavior_id === behavior.id) : undefined;
    const isPlanted = Boolean(tree && tree.earned >= 1);
    const stage = isPlanted && tree ? growthStage(tree.watered) : 0;
    const rights = isPlanted && tree ? waterRights(tree) : 0;

    return {
      slot,
      behavior,
      tree,
      isPlanted,
      stage,
      rights,
    };
  }).sort((a, b) => a.slot.y - b.slot.y);

  // Erişilebilirlik özeti metni
  const plantedSummaries = renderSlots
    .filter((s) => s.isPlanted && s.behavior && s.tree)
    .map((s) => `${s.behavior!.name} (${TREE_NAMES[s.behavior!.tree] || 'ağaç'}, ${STAGE_NAMES[s.stage]})`)
    .join(', ');

  const unlockedList = GARDEN_UNLOCKS.filter((u) => unlocked.has(u.key))
    .map((u) => u.name)
    .join(', ');

  const figCaptionText = `Bahçe seviyesi ${level}. ${
    unlockedList ? `Açılan manzara öğeleri: ${unlockedList}. ` : 'Henüz manzara öğesi açılmadı. '
  }${
    plantedSummaries ? `Dikilmiş ağaçlar: ${plantedSummaries}.` : 'Henüz fidan dikilmedi.'
  }`;

  return (
    <figure className={`${styles.landscapeFigure} ${size === 'sm' ? styles.figureSmall : ''}`}>
      {title && (
        <div className={styles.plotSkyline}>
          <h3 className={styles.plotTitle}>{title}</h3>
          <span className={styles.landscapeLevelBadge}>Seviye {level}</span>
        </div>
      )}

      {/* Ekran okuyucular için görsel olarak gizli metin */}
      <figcaption id={figId} className={styles.srOnly}>
        {figCaptionText}
      </figcaption>

      <div className={styles.landscapeSvgWrapper}>
        <svg
          viewBox="0 0 1200 600"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          className={styles.landscapeSvg}
          aria-labelledby={figId}
        >
          <GardenSceneLayers unlocked={unlocked}>
            {/* Ağaçlar ve Tabela Yuvaları (Derinlik Sıralı) */}
            {renderSlots.map(({ slot, behavior, tree, isPlanted, stage, rights }) => {
              if (!behavior) return null;

              const treeName = TREE_NAMES[behavior.tree] || 'Ağaç';
              const stageName = STAGE_NAMES[stage] || 'Fidan';
              const ariaLabel = isPlanted && tree
                ? `${behavior.name} (${treeName}): ${stageName}, ${tree.watered} kez sulandı${
                    rights > 0 ? `, ${rights} sulama hakkı var` : ''
                  }`
                : `${behavior.name}: Henüz fidan dikilmedi`;

              const isClickable = Boolean(onTreeClick);

              // Tıklama tuş işleyicisi (Enter ve Boşluk tuşu ile klavye erişilebilirliği)
              const handleKeyDown = (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onTreeClick?.(behavior, tree);
                }
              };

              const treeWidth = 100 * slot.scale;
              const treeHeight = 120 * slot.scale;
              const treeX = slot.x - 50 * slot.scale;
              const treeY = slot.y - 110 * slot.scale;

              const Icon = getGardenIcon(behavior.icon);

              return (
                <g
                  key={`tree-slot-${slot.id}-${behavior.id}`}
                  className={isClickable ? styles.treeSlotInteractive : styles.treeSlotStatic}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  aria-label={isClickable ? ariaLabel : undefined}
                  onClick={isClickable ? () => onTreeClick?.(behavior, tree) : undefined}
                  onKeyDown={isClickable ? handleKeyDown : undefined}
                >
                  {isPlanted && tree ? (
                    /* Dikilmiş Ağaç */
                    <g>
                      {/* Ağaç Çizimi */}
                      <TreeArt
                        tree={behavior.tree}
                        stage={stage}
                        x={treeX}
                        y={treeY}
                        width={treeWidth}
                        height={treeHeight}
                      />

                      {/* Ağacın Dibindeki Tahta Tabela */}
                      <g className={styles.woodenSignboard}>
                        {/* Tabela Kazığı */}
                        <line
                          x1={slot.x}
                          y1={slot.y - 3}
                          x2={slot.x}
                          y2={slot.y + 16 * slot.scale}
                          stroke="#54381e"
                          strokeWidth={2.5 * slot.scale}
                          strokeLinecap="round"
                        />
                        {/* Tabela Tahtası */}
                        <rect
                          x={slot.x - 38 * slot.scale}
                          y={slot.y + 1}
                          width={76 * slot.scale}
                          height={18 * slot.scale}
                          rx={3 * slot.scale}
                          fill="#b27f4d"
                          stroke="#432813"
                          strokeWidth={1.2 * slot.scale}
                        />
                        {/* Tabela Yazısı (Küçük boyutta yalnızca ikon, normal boyutta ad) */}
                        {size !== 'sm' ? (
                          <text
                            x={slot.x}
                            y={slot.y + 13.5 * slot.scale}
                            textAnchor="middle"
                            fill="#201308"
                            fontSize={10.5 * slot.scale}
                            fontWeight="700"
                            fontFamily="inherit"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >
                            {behavior.name.length > 9 ? `${behavior.name.slice(0, 8)}…` : behavior.name}
                          </text>
                        ) : (
                          /* Küçük boyutta ortalanmış minik ikon simgesi */
                          <circle
                            cx={slot.x}
                            cy={slot.y + 10 * slot.scale}
                            r={4.5 * slot.scale}
                            fill="#ffffff"
                            opacity={0.85}
                          />
                        )}
                      </g>

                      {/* Sulama Rozeti (highlightWater açık ve hak varsa) */}
                      {highlightWater && rights > 0 && (
                        <g
                          transform={`translate(${slot.x + 22 * slot.scale}, ${slot.y - 96 * slot.scale})`}
                          className={styles.waterDropIndicator}
                        >
                          <circle cx="0" cy="0" r={11 * slot.scale} fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                          <Droplet
                            size={Math.round(11 * slot.scale)}
                            style={{
                              transform: `translate(${-5.5 * slot.scale}px, ${-9.5 * slot.scale}px)`,
                              color: '#ffffff',
                            }}
                            aria-hidden="true"
                          />
                          <text
                            x="0"
                            y={4.5 * slot.scale}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize={8.5 * slot.scale}
                            fontWeight="800"
                            style={{ pointerEvents: 'none' }}
                          >
                            {rights}
                          </text>
                        </g>
                      )}
                    </g>
                  ) : (
                    /* Dikilmemiş Yer: Toprak Çukuru + Soluk Tabela */
                    <g className={styles.unplantedSpot}>
                      <title>{`${behavior.name}: Henüz dikilmedi`}</title>
                      {/* Toprak Çukuru */}
                      <ellipse
                        cx={slot.x}
                        cy={slot.y}
                        rx={18 * slot.scale}
                        ry={5.5 * slot.scale}
                        fill="#5c3c20"
                        opacity={0.65}
                      />
                      <ellipse
                        cx={slot.x}
                        cy={slot.y}
                        rx={11 * slot.scale}
                        ry={3.2 * slot.scale}
                        fill="#3a2210"
                        opacity={0.4}
                      />

                      {/* Minik Soluk Tahta Tabela */}
                      <line
                        x1={slot.x}
                        y1={slot.y - 2}
                        x2={slot.x}
                        y2={slot.y - 22 * slot.scale}
                        stroke="#795548"
                        strokeWidth={2 * slot.scale}
                        strokeLinecap="round"
                      />
                      <rect
                        x={slot.x - 14 * slot.scale}
                        y={slot.y - 38 * slot.scale}
                        width={28 * slot.scale}
                        height={18 * slot.scale}
                        rx={2.5 * slot.scale}
                        fill="#d7ccc8"
                        stroke="#8d6e63"
                        strokeWidth={1 * slot.scale}
                        opacity={0.8}
                      />
                      {/* İkon */}
                      <g
                        transform={`translate(${slot.x - 7 * slot.scale}, ${slot.y - 35 * slot.scale}) scale(${
                          0.75 * slot.scale
                        })`}
                        style={{ color: '#5d4037', opacity: 0.65 }}
                      >
                        <Icon size={18} aria-hidden="true" />
                      </g>
                    </g>
                  )}
                </g>
              );
            })}
          </GardenSceneLayers>
        </svg>
      </div>
    </figure>
  );
}
