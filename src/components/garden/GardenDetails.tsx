import React from 'react';
import styles from './Garden.module.css';

/** Dekorlar yalnızca açılmış bahçe öğelerini tamamlar; etkileşim almaz. */
export function GardenFlowerBeds() {
  return <>
    {['gardenBedHouse', 'gardenBedPath', 'gardenBedEntry'].map((key) => (
      <svg key={key} className={`${styles.gardenFlowerBed} ${styles[key]}`} viewBox="0 0 300 110" aria-hidden="true" focusable="false">
        <image href="/images/garden/flowerbed-v1.png" width="300" height="110" preserveAspectRatio="xMidYMid meet" />
      </svg>
    ))}
    <svg className={styles.gardenBees} viewBox="0 0 180 100" aria-hidden="true" focusable="false">
      <g className={styles.gardenBeeFlight}><image href="/images/garden/bee-v1.png" x="35" y="35" width="26" height="24" /></g>
      <g className={`${styles.gardenBeeFlight} ${styles.gardenBeeLate}`}><image href="/images/garden/bee-v1.png" x="105" y="53" width="23" height="21" /></g>
    </svg>
  </>;
}

export function GardenTools() {
  return <svg className={styles.gardenTools} viewBox="0 0 200 140" aria-hidden="true" focusable="false">
    <image href="/images/garden/tools-v1.png" width="200" height="140" preserveAspectRatio="xMidYMid meet" />
  </svg>;
}

/** Göletin kendi koordinatlarında: su halkaları kıyının içinde kalır. */
export function PondDuck() {
  return <g>
    <ellipse className={styles.duckRipple} cx="150" cy="498" rx="17" ry="5" fill="none" stroke="#e2f4e8" strokeWidth="1.2" />
    <ellipse className={`${styles.duckRipple} ${styles.duckRippleLate}`} cx="150" cy="498" rx="17" ry="5" fill="none" stroke="#e2f4e8" strokeWidth="1.2" />
    <g className={styles.duckFloat}><image href="/images/garden/duck-v1.png" x="132" y="477" width="36" height="25" /></g>
  </g>;
}
