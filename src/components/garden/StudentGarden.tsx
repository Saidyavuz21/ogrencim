'use client';

import React, { useEffect, useState } from 'react';
import type { GardenBehavior, GardenTree, MyGarden } from '../../lib/gardenData';
import {
  GARDEN_UNLOCKS,
  gardenLevel,
  gardenUnlocks,
  unlockLevel,
  getMyGarden,
  growthStage,
  waterMyTree,
  waterRights,
} from '../../lib/gardenData';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { Spinner } from '../Spinner';
import { GardenPlot } from './GardenPlot';
import { TREE_NAMES, STAGE_NAMES } from './GardenArt';
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

  // Bahçe seviyesi ve manzara kazanımları
  const level = gardenLevel(trees);
  const behaviorCount = behaviors.filter((b) => !b.archived).length;
  const { next, remaining } = gardenUnlocks(level, behaviorCount);

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
    const oldLevel = gardenLevel(trees);

    const res = await waterMyTree(b.id);

    // Sulama animasyonu (kap, damlalar, ağacın kabarması) bitene kadar bekle
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setWateringBehaviorId(null);

    if (!res.ok) {
      setNotice({ kind: 'error', text: `Sulanamadı: ${res.error}` });
      return;
    }

    const updatedTree = res.data;
    const newStage = growthStage(updatedTree.watered);

    // Yerel state'i güncelle
    let newLevel = oldLevel;
    setGarden((prev) => {
      if (!prev) return prev;
      const nextTrees = prev.trees.map((t) => (t.behavior_id === b.id ? updatedTree : t));
      newLevel = gardenLevel(nextTrees);
      return {
        ...prev,
        trees: nextTrees,
      };
    });

    // Yeni açılan manzara öğesi kontrolü
    const newlyUnlocked = GARDEN_UNLOCKS.filter((u) => oldLevel < unlockLevel(u, behaviorCount) && newLevel >= unlockLevel(u, behaviorCount));
    const treeName = TREE_NAMES[b.tree] || 'Ağaç';

    if (newlyUnlocked.length > 0) {
      const itemsText = newlyUnlocked.map((u) => u.name).join(', ');
      const unlockMsg = `Tebrikler! Bahçene yeni eklendi: ${itemsText}!`;
      setCelebration(unlockMsg);
      setTimeout(() => setCelebration(null), 7000);
    } else if (newStage > oldStage) {
      // Aşama atlama kutlaması
      const stageName = STAGE_NAMES[newStage];
      const msg = `Tebrikler! ${b.name} için ${treeName} büyüdü: ${stageName}!`;
      setCelebration(msg);
      setTimeout(() => setCelebration(null), 6000);
    }
    // Sıradan sulamada ayrıca bildirim yok: animasyon ve damladaki sayı yeterli
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
              Ağacının yanındaki damlaya dokunarak sula.
            </span>
          ) : (
            <span style={{ fontSize: 13, color: '#48654b' }}>
              Öğretmenin puan verdikçe sulama hakkı kazanırsın.
            </span>
          )}
        </div>

        {/* Bahçe Görünümü (Manzara Resmi) */}
        <GardenPlot
          behaviors={behaviors}
          trees={trees}
          size="lg"
          highlightWater={true}
          title="Benim Bahçem"
          onWater={(b, t) => void handleWater(b, t)}
          wateringId={wateringBehaviorId}
        />

        {/* Manzara İlerleme Bilgi Çubuğu */}
        <div className={styles.landscapeProgressCard}>
          <div className={styles.landscapeProgressLeft}>
            <Sprout size={18} aria-hidden="true" style={{ color: '#25634b' }} />
            <span>Bahçe Seviyesi: <strong>{level}</strong></span>
          </div>
          {next ? (
            <span className={styles.landscapeNextTarget}>
              Ağaçların {remaining} aşama daha büyüyünce bahçene {next.name.toLocaleLowerCase('tr-TR')} gelecek
            </span>
          ) : (
            <span className={styles.landscapeNextTarget} style={{ background: '#dcfce7', color: '#166534' }}>
              Bahçen tamamlandı! Bütün güzellikler açıldı.
            </span>
          )}
        </div>

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

    </div>
  );
}
