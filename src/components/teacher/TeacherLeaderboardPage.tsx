'use client';

import React, { useMemo } from 'react';
import { CollapsiblePanel, useClassStudents } from './TeacherUi';
import { Spinner } from '../Spinner';
import styles from './TeacherDashboard.module.css';

export type PointTier = 'elite' | 'high' | 'good' | 'positive' | 'neutral' | 'warn' | 'negative';

export function getPointTier(points: number): PointTier {
  if (points >= 20) return 'elite';
  if (points >= 15) return 'high';
  if (points >= 10) return 'good';
  if (points >= 1) return 'positive';
  if (points === 0) return 'neutral';
  if (points >= -4) return 'warn';
  return 'negative';
}

export const TIER_CLASS: Record<PointTier, string> = {
  elite: styles.tierElite,
  high: styles.tierHigh,
  good: styles.tierGood,
  positive: styles.tierPositive,
  neutral: styles.tierNeutral,
  warn: styles.tierWarn,
  negative: styles.tierNegative,
};

export const TIER_ROW_CLASS: Record<PointTier, string> = {
  elite: styles.rankRowElite,
  high: styles.rankRowHigh,
  good: styles.rankRowGood,
  positive: styles.rankRowPositive,
  neutral: '',
  warn: styles.rankRowWarn,
  negative: styles.rankRowNegative,
};

export function computeCompetitionRanks(list: { points: number }[]): number[] {
  const out: number[] = [];
  list.forEach((s, i) => {
    if (i === 0) out.push(1);
    else if (s.points === list[i - 1].points) out.push(out[i - 1]);
    else out.push(i + 1);
  });
  return out;
}

export function getRankBadgeClass(rank: number, points: number): string {
  if (points <= 0) return '';
  if (rank === 1) return styles.rankFirst;
  if (rank === 2) return styles.rankSecond;
  if (rank === 3) return styles.rankThird;
  return '';
}

export function getRankRowPodiumClass(rank: number, points: number): string {
  if (points <= 0) return '';
  if (rank === 1) return styles.rankRowFirst;
  if (rank === 2) return styles.rankRowSecond;
  if (rank === 3) return styles.rankRowThird;
  return '';
}

export function LeaderboardTierLegend({ counts }: { counts: Record<PointTier, number> }) {
  return (
    <ul className={styles.tierLegend}>
      <li>
        <span className={`${styles.tierPill} ${styles.tierElite}`}>+20 ve üzeri</span>
        <span className={styles.tierLabel}>Zirve</span>
        <strong>{counts.elite} öğrenci</strong>
      </li>
      <li>
        <span className={`${styles.tierPill} ${styles.tierHigh}`}>+15 ile +19</span>
        <span className={styles.tierLabel}>Çok yüksek</span>
        <strong>{counts.high} öğrenci</strong>
      </li>
      <li>
        <span className={`${styles.tierPill} ${styles.tierGood}`}>+10 ile +14</span>
        <span className={styles.tierLabel}>İyi</span>
        <strong>{counts.good} öğrenci</strong>
      </li>
      <li>
        <span className={`${styles.tierPill} ${styles.tierPositive}`}>+1 ile +9</span>
        <span className={styles.tierLabel}>Artıda</span>
        <strong>{counts.positive} öğrenci</strong>
      </li>
      <li>
        <span className={`${styles.tierPill} ${styles.tierNeutral}`}>0 puan</span>
        <span className={styles.tierLabel}>Başlangıç / nötr</span>
        <strong>{counts.neutral} öğrenci</strong>
      </li>
      <li>
        <span className={`${styles.tierPill} ${styles.tierWarn}`}>−1 ile −4</span>
        <span className={styles.tierLabel}>Dikkat</span>
        <strong>{counts.warn} öğrenci</strong>
      </li>
      <li>
        <span className={`${styles.tierPill} ${styles.tierNegative}`}>−5 ve altı</span>
        <span className={styles.tierLabel}>Ekside</span>
        <strong>{counts.negative} öğrenci</strong>
      </li>
    </ul>
  );
}

export function countTiers(list: { points: number }[]): Record<PointTier, number> {
  const counts: Record<PointTier, number> = { elite: 0, high: 0, good: 0, positive: 0, neutral: 0, warn: 0, negative: 0 };
  list.forEach((s) => { counts[getPointTier(s.points)]++; });
  return counts;
}

export function TeacherLeaderboardPage({ selectedClass }: { selectedClass: string }) {
  const { students, loading, error } = useClassStudents(selectedClass);
  const ranked = useMemo(
    () => [...students].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'tr')),
    [students]
  );

  const ranks = useMemo(() => computeCompetitionRanks(ranked), [ranked]);

  const summary = useMemo(() => {
    const counts = countTiers(ranked);
    let totalPlus = 0;
    let totalMinus = 0;
    ranked.forEach((s) => {
      totalPlus += s.plus_count;
      totalMinus += s.minus_count;
    });
    return { counts, totalPlus, totalMinus };
  }, [ranked]);

  return (
    <div className={styles.pageBody}>
      <div className={styles.pointsLayout}>
        <section className={styles.studentList} aria-label={`${selectedClass} puan sıralaması`}>
          <div className={styles.listHeading}>
            <h3>{selectedClass} sınıfı</h3>
            <span>{ranked.length} öğrenci · puanlar canlı veritabanından</span>
          </div>
          {loading && <Spinner center label="Yükleniyor…" />}
          {error && <p className={`${styles.noticeError} ${styles.listPad}`}>{error}</p>}
          {!loading && !error && ranked.length === 0 && <p className={`${styles.mutedText} ${styles.listPad}`}>Bu sınıfta kayıtlı öğrenci yok.</p>}
          <ol className={styles.rankList}>
            {ranked.map((s, i) => {
              const tier = getPointTier(s.points);
              const rank = ranks[i];
              const rankBadge = getRankBadgeClass(rank, s.points);
              const podiumRow = getRankRowPodiumClass(rank, s.points);
              const formattedPoints = s.points > 0 ? `+${s.points}` : String(s.points);
              return (
                <li key={s.id} className={`${styles.rankRow} ${TIER_ROW_CLASS[tier]} ${podiumRow}`}>
                  <span className={`${styles.rankNo} ${rankBadge}`}>{rank}</span>
                  <span className={styles.studentCardInfo}>
                    <strong>{s.name}</strong>
                    <span>No {s.student_number} · +{s.plus_count} / −{s.minus_count}</span>
                  </span>
                  <strong className={`${styles.rankPoints} ${TIER_CLASS[tier]}`}>{formattedPoints}</strong>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className={styles.pointsAside}>
          <CollapsiblePanel title="Puana göre renk kademeleri" summary={`+${summary.totalPlus} / −${summary.totalMinus} toplam puan`}>
            <h2 id="leaderboard-legend-title" className={styles.panelTitle}>Puana göre renk kademeleri</h2>
            <LeaderboardTierLegend counts={summary.counts} />
          </CollapsiblePanel>

          <CollapsiblePanel title="Sınıf özeti" summary={`${ranked.length} öğrenci`}>
            <h2 id="leaderboard-summary-title" className={styles.panelTitle}>Sınıf özeti</h2>
            <dl className={styles.infoList}>
              <div>
                <dt>Toplam öğrenci</dt>
                <dd>{ranked.length}</dd>
              </div>
              <div>
                <dt>Verilen artı puan</dt>
                <dd>+{summary.totalPlus}</dd>
              </div>
              <div>
                <dt>Verilen eksi puan</dt>
                <dd>−{summary.totalMinus}</dd>
              </div>
            </dl>
          </CollapsiblePanel>
        </aside>
      </div>
    </div>
  );
}
