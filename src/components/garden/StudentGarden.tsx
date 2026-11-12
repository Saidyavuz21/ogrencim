'use client';

import React, { useEffect, useState } from 'react';
import type { GardenBehavior, GardenTree, MyGarden } from '../../lib/gardenData';
import {
  getMyGarden,
  growthStage,
  waterMyTree,
  waterRights,
  wateringsToNext,
} from '../../lib/gardenData';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { Spinner } from '../Spinner';
import { GardenPlot } from './GardenPlot';
import { TreeArt, TREE_NAMES, STAGE_NAMES } from './GardenArt';
import { Droplet, Sparkles, Sprout } from '../icons';
import styles from './Garden.module.css';

let waterAudio: AudioContext | null = null;
function playWaterSound() {
  try {
    if (!waterAudio || waterAudio.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      waterAudio = new AudioCtx();
    }
    const ctx = waterAudio;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

    // Su damlası melodisi (1046Hz -> 523Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
  } catch {
    // Ses desteği yoksa sessizce devam et
  }
}

export function StudentGarden() {
  const [garden, setGarden] = useState<MyGarden | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [wateringBehaviorId, setWateringBehaviorId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMyGarden().then((res) => {
      if (!alive) return;
      if (res.ok) setGarden(res.data);
      else setNotice({ kind: 'error', text: `Bahçe yüklenemedi: ${res.error}` });
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (loading && !garden) {
    return (
      <div className={styles.gardenWorkspace}>
        <Spinner center label="Bahçen yükleniyor…" />
      </div>
    );
  }

  const trees = garden?.trees || [];
  const behaviors = garden?.behaviors || [];

  // Toplam sulama hakkı
  const totalWaterRights = trees.reduce((sum, t) => sum + waterRights(t), 0);

  // Dikilmiş ağaçlar (earned >= 1)
  const plantedTrees = trees.filter((t) => t.earned >= 1);

  // Sulama işlemi
  const handleWater = async (b: GardenBehavior, tree: GardenTree) => {
    if (wateringBehaviorId === b.id) return;

    setWateringBehaviorId(b.id);
    playWaterSound();

    const oldStage = growthStage(tree.watered);

    const res = await waterMyTree(b.id);

    // Animasyonun ~1 saniye görünmesi için bekle
    await new Promise((resolve) => setTimeout(resolve, 850));
    setWateringBehaviorId(null);

    if (!res.ok) {
      setNotice({ kind: 'error', text: `Sulanamadı: ${res.error}` });
      return;
    }

    const updatedTree = res.data;
    const newStage = growthStage(updatedTree.watered);

    // Yerel state'i güncelle
    setGarden((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        trees: prev.trees.map((t) => (t.behavior_id === b.id ? updatedTree : t)),
      };
    });

    // Aşama atlama kutlaması
    const treeName = TREE_NAMES[b.tree] || 'Ağaç';
    if (newStage > oldStage) {
      const stageName = STAGE_NAMES[newStage];
      const msg = `Tebrikler! ${b.name} için ${treeName} büyüdü: ${stageName}!`;
      setCelebration(msg);
      setTimeout(() => setCelebration(null), 6000);
      setNotice({ kind: 'ok', text: msg });
    } else {
      const toNext = wateringsToNext(updatedTree.watered);
      const hint = toNext !== null ? `Bir sonraki aşamaya ${toNext} sulama kaldı.` : 'Ağacın en üst aşamada!';
      setNotice({ kind: 'ok', text: `${treeName} sulandı! ${hint}` });
    }
  };

  return (
    <div className={styles.gardenWorkspace}>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {celebration && (
        <div className={styles.stageUpCelebration} role="status">
          <Sparkles size={24} aria-hidden="true" style={{ color: '#d97706', flexShrink: 0 }} />
          <span>{celebration}</span>
        </div>
      )}

      {/* Üst Kart: Bahçem ve Sulama Hakları */}
      <section className={styles.studentGardenHero} aria-label="Bahçem">
        <div className={styles.waterRightsBanner}>
          <div className={styles.waterRightsText}>
            <Droplet size={24} aria-hidden="true" />
            <span>
              {totalWaterRights > 0
                ? `${totalWaterRights} sulama hakkın var!`
                : 'Şu an sulama hakkın yok.'}
            </span>
          </div>
          {totalWaterRights > 0 ? (
            <span className={styles.waterRightsCount}>
              Hemen bir ağacını sula!
            </span>
          ) : (
            <span style={{ fontSize: 13, color: '#0369a1' }}>
              Öğretmenin puan verdikçe sulama hakkı kazanırsın.
            </span>
          )}
        </div>

        {/* Bahçe Görünümü (Arsa) */}
        <GardenPlot
          behaviors={behaviors}
          trees={trees}
          size="lg"
          highlightWater={true}
          title="Benim Bahçem"
        />

        {/* Hiç fidan yoksa başlangıç mesajı */}
        {plantedTrees.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              background: '#f6fbf7',
              borderRadius: 16,
              border: '1px dashed #b7e4c7',
            }}
          >
            <Sprout size={36} aria-hidden="true" style={{ color: '#25634b', margin: '0 auto 8px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: '#1b4332' }}>
              Henüz fidanın dikilmedi
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: '#40916c' }}>
              Öğretmenin bir davranışın için puan verdiğinde ilk fidanın dikilecek.
            </p>
          </div>
        )}
      </section>

      {/* Ağaçları Sulama Kartları */}
      {plantedTrees.length > 0 && (
        <section aria-label="Ağaçlarımı sula">
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '12px 0 14px' }}>Ağaçlarım</h3>
          <div className={styles.studentTreeCards}>
            {behaviors
              .filter((b) => trees.some((t) => t.behavior_id === b.id && t.earned >= 1))
              .map((b) => {
                const tree = trees.find((t) => t.behavior_id === b.id)!;
                const stage = growthStage(tree.watered);
                const treeName = TREE_NAMES[b.tree] || 'Ağaç';
                const stageName = STAGE_NAMES[stage] || 'Fidan';
                const rights = waterRights(tree);
                const toNext = wateringsToNext(tree.watered);
                const isWatering = wateringBehaviorId === b.id;

                return (
                  <div key={b.id} className={styles.studentTreeCard}>
                    <div className={styles.cardHeader}>
                      <h4>
                        {b.name} <small style={{ fontSize: 12, fontWeight: 500, color: '#58665f' }}>({treeName})</small>
                      </h4>
                      <span className={styles.cardStageBadge}>{stageName}</span>
                    </div>

                    <div className={styles.treeVisualBox}>
                      <TreeArt tree={b.tree} stage={stage} size={110} />
                      {isWatering && (
                        <div className={styles.wateringAnimationOverlay}>
                          <Droplet size={38} className={styles.waterDrops} aria-hidden="true" />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', marginTop: 4 }}>
                            Sulanıyor…
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {rights > 0 ? (
                        <button
                          type="button"
                          className={styles.waterButton}
                          onClick={() => void handleWater(b, tree)}
                          disabled={isWatering}
                          aria-label={`${b.name} ağacını sula (${rights} hak var)`}
                        >
                          <Droplet size={18} aria-hidden="true" />
                          Sula ({rights} hak)
                        </button>
                      ) : (
                        <p className={styles.noWaterText}>
                          {b.name} davranışını göstermeye devam et, sulama hakkı kazan.
                        </p>
                      )}

                      {toNext !== null ? (
                        <p className={styles.treeProgressText}>
                          Sonraki aşama için {toNext} sulama kaldı
                        </p>
                      ) : (
                        <p className={styles.treeProgressText} style={{ color: '#16a34a' }}>
                          Ağacın en güzel aşamasında!
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}
