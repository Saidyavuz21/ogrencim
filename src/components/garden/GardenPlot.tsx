import React from 'react';
import type { GardenBehavior, GardenTree } from '../../lib/gardenData';
import { growthStage, waterRights } from '../../lib/gardenData';
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

export function GardenPlot({
  behaviors,
  trees,
  size = 'md',
  onTreeClick,
  highlightWater = false,
  title,
}: GardenPlotProps) {
  // Yalnızca etkin ya da ağacı dikilmiş davranışları göster
  const activeOrPlantedBehaviors = behaviors.filter((b) => {
    const t = trees.find((x) => x.behavior_id === b.id);
    return !b.archived || (t && t.earned > 0);
  });

  const treeSize = size === 'lg' ? 140 : size === 'sm' ? 85 : 110;
  const gridClass = size === 'lg' ? styles.plotGridLarge : styles.plotGrid;

  return (
    <div className={styles.gardenPlotContainer}>
      {title && (
        <div className={styles.plotSkyline}>
          <h3 className={styles.plotTitle}>{title}</h3>
        </div>
      )}

      <div className={gridClass} role="region" aria-label="Bahçe arsası">
        {activeOrPlantedBehaviors.length === 0 ? (
          <div className={styles.plotEmptySlot} style={{ gridColumn: '1 / -1' }}>
            <p className={styles.plotEmptyText}>Henüz belirlenmiş davranış fidanı yok.</p>
          </div>
        ) : (
          activeOrPlantedBehaviors.map((b) => {
            const tree = trees.find((t) => t.behavior_id === b.id);
            const isPlanted = Boolean(tree && tree.earned >= 1);
            const stage = isPlanted && tree ? growthStage(tree.watered) : 0;
            const availableWater = isPlanted && tree ? waterRights(tree) : 0;
            const Icon = getGardenIcon(b.icon);

            if (isPlanted && tree) {
              const treeName = TREE_NAMES[b.tree] || 'Ağaç';
              const stageName = STAGE_NAMES[stage] || 'Fidan';
              const label = `${b.name} (${treeName}): ${stageName}, ${tree.watered} kez sulandı`;

              return (
                <div key={b.id} className={styles.plotSlot}>
                  {onTreeClick ? (
                    <button
                      type="button"
                      className={`${styles.treeClickable} ${styles.plotSlot}`}
                      onClick={() => onTreeClick(b, tree)}
                      aria-label={label}
                    >
                      <TreeArt tree={b.tree} stage={stage} size={treeSize} />
                      {highlightWater && availableWater > 0 && (
                        <span className={styles.waterDropBadge} title={`${availableWater} sulama hakkı var`}>
                          <Droplet size={13} aria-hidden="true" />
                          {availableWater}
                        </span>
                      )}
                    </button>
                  ) : (
                    <div className={styles.plotSlot} title={label}>
                      <TreeArt tree={b.tree} stage={stage} size={treeSize} />
                      {highlightWater && availableWater > 0 && (
                        <span className={styles.waterDropBadge} title={`${availableWater} sulama hakkı var`}>
                          <Droplet size={13} aria-hidden="true" />
                          {availableWater}
                        </span>
                      )}
                    </div>
                  )}
                  <span className={styles.plotLabel} title={b.name}>
                    {b.name}
                  </span>
                </div>
              );
            }

            // Henüz dikilmemiş boş arsa tarhı
            return (
              <div key={b.id} className={styles.plotSlot}>
                <div className={styles.plotEmptySlot} title={`${b.name}: Henüz dikilmedi`}>
                  <Icon size={24} aria-hidden="true" style={{ opacity: 0.6 }} />
                  <div className={styles.emptySoilMound} />
                  <span className={styles.plotEmptyText}>Henüz dikilmedi</span>
                </div>
                <span className={styles.plotLabel} title={b.name}>
                  {b.name}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

