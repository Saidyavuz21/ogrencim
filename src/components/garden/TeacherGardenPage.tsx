'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { GardenAward, GardenBehavior, GardenStudent } from '../../lib/gardenData';
import {
  awardGarden,
  awardGardenClass,
  GARDEN_ICONS,
  GARDEN_TREES,
  growthStage,
  listGardenBehaviors,
  listGardenClass,
  saveGardenBehavior,
  archiveGardenBehavior,
  undoGardenAward,
  waterRights,
} from '../../lib/gardenData';
import { Notice, NoticeState, initialsOf } from '../teacher/TeacherUi';
import { useDialog } from '../ConfirmDialog';
import { Modal } from '../files/FilesUi';
import { Spinner } from '../Spinner';
import { GardenPlot } from './GardenPlot';
import { TreeArt, getGardenIcon, TREE_NAMES, STAGE_NAMES } from './GardenArt';
import {
  Edit,
  Eye,
  Plus,
  RotateCcw,
  Settings,
  Sprout,
  Users,
  X,
} from '../icons';
import f from '../files/Files.module.css';
import styles from './Garden.module.css';

interface TeacherGardenPageProps {
  selectedClass: string;
}

interface LastAwardInfo {
  historyId: string;
  studentId: string;
  studentName: string;
  behaviorId: string;
  behaviorName: string;
}

let gardenAudio: AudioContext | null = null;
function playChimeSound() {
  try {
    if (!gardenAudio || gardenAudio.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      gardenAudio = new AudioCtx();
    }
    const ctx = gardenAudio;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

    osc.type = 'sine';
    osc.frequency.setValueAtTime(698.46, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch {
    // Ses desteği yoksa sessizce devam et
  }
}

export function TeacherGardenPage({ selectedClass }: TeacherGardenPageProps) {
  const { confirm } = useDialog();
  const [behaviors, setBehaviors] = useState<GardenBehavior[] | null>(null);
  const [students, setStudents] = useState<GardenStudent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  // Kilitli buton (aynı butona peş peşe basılmasını engeller)
  // Birden fazla öğrenciye hızlı dokunulabilir: her düğme kendi kilidini taşır
  const [busyKeys, setBusyKeys] = useState<Set<string>>(() => new Set());
  const busyRef = useRef<Set<string>>(new Set());
  const setBusy = (key: string, on: boolean) => {
    if (on) busyRef.current.add(key); else busyRef.current.delete(key);
    setBusyKeys(new Set(busyRef.current));
  };

  // Kısa "+1" animasyonu için aktif buton key'i
  const [animKey, setAnimKey] = useState<string | null>(null);
  const animTimer = useRef<number | null>(null);

  // Son verilen puan için 8 saniyelik "Geri Al" çubuğu
  const [lastAward, setLastAward] = useState<LastAwardInfo | null>(null);
  const undoTimer = useRef<number | null>(null);

  // Pencereler
  const [viewingStudent, setViewingStudent] = useState<GardenStudent | null>(null);
  const [behaviorModalOpen, setBehaviorModalOpen] = useState(false);
  const [editingBehavior, setEditingBehavior] = useState<GardenBehavior | null>(null);
  const [isNewBehavior, setIsNewBehavior] = useState(false);
  const [behaviorFormName, setBehaviorFormName] = useState('');
  const [behaviorFormIcon, setBehaviorFormIcon] = useState<string>('book');
  const [behaviorFormTree, setBehaviorFormTree] = useState<string>('apple');
  const [behaviorBusy, setBehaviorBusy] = useState(false);

  // "Herkese ver" menüsü
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (!selectedClass) return;
    let alive = true;
    Promise.all([
      listGardenBehaviors(selectedClass),
      listGardenClass(selectedClass),
    ]).then(([bRes, sRes]) => {
      if (!alive) return;
      if (!bRes.ok) {
        setError(`Davranışlar yüklenemedi: ${bRes.error}`);
      } else if (!sRes.ok) {
        setError(`Öğrenciler yüklenemedi: ${sRes.error}`);
      } else {
        setBehaviors(bRes.data);
        setStudents(sRes.data);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [selectedClass]);

  useEffect(() => {
    return () => {
      if (animTimer.current) window.clearTimeout(animTimer.current);
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    };
  }, []);

  const activeBehaviors = behaviors ? behaviors.filter((b) => !b.archived) : [];

  // Tek dokunuşla puan verme
  const handleAward = async (student: GardenStudent, behavior: GardenBehavior) => {
    const key = `${student.id}:${behavior.id}`;
    if (busyRef.current.has(key)) return;

    setBusy(key, true);

    // Animasyon ve ses efekti
    playChimeSound();
    setAnimKey(key);
    if (animTimer.current) window.clearTimeout(animTimer.current);
    animTimer.current = window.setTimeout(() => {
      setAnimKey(null);
    }, 750);

    const res = await awardGarden(student.id, behavior.id);
    setBusy(key, false);

    if (!res.ok) {
      setNotice({ kind: 'error', text: `Puan verilemedi: ${res.error}` });
      return;
    }

    const award: GardenAward = res.data;

    // Öğrenci listesini güncelle
    setStudents((prev) => {
      if (!prev) return prev;
      return prev.map((s) => {
        if (s.id !== student.id) return s;
        const oldTrees = s.trees || [];
        const existingTree = oldTrees.find((t) => t.behavior_id === behavior.id);
        const updatedTrees = existingTree
          ? oldTrees.map((t) => (t.behavior_id === behavior.id ? { ...t, earned: award.earned } : t))
          : [
              ...oldTrees,
              {
                behavior_id: behavior.id,
                earned: award.earned,
                watered: award.watered,
                planted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];

        return {
          ...s,
          points: award.points,
          trees: updatedTrees,
        };
      });
    });

    // 8 saniyelik Geri Al çubuğunu ayarla
    setLastAward({
      historyId: award.history_id,
      studentId: student.id,
      studentName: student.name,
      behaviorId: behavior.id,
      behaviorName: behavior.name,
    });

    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => {
      setLastAward(null);
    }, 8000);
  };

  // Son verilen puanı geri al
  const handleUndo = async () => {
    if (!lastAward) return;
    const { historyId, studentId, studentName, behaviorId, behaviorName } = lastAward;

    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setLastAward(null);

    const res = await undoGardenAward(historyId);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Geri alınamadı: ${res.error}` });
      return;
    }

    const undo = res.data;

    setStudents((prev) => {
      if (!prev) return prev;
      return prev.map((s) => {
        if (s.id !== studentId) return s;
        // earned 0: fidan sökülür (ilk puan geri alındı)
        const updatedTrees = (s.trees || [])
          .map((t) => (t.behavior_id === behaviorId ? { ...t, earned: undo.earned, watered: undo.watered } : t))
          .filter((t) => t.earned > 0);
        return {
          ...s,
          points: undo.points,
          trees: updatedTrees,
        };
      });
    });

    setNotice({
      kind: 'ok',
      text: `${studentName} için verilen "${behaviorName}" +1 puanı geri alındı.`,
    });
  };

  // "Herkese ver" işlemi
  const handleAwardClass = async (behavior: GardenBehavior) => {
    setBulkMenuOpen(false);
    if (!students || students.length === 0) return;

    const ok = await confirm({
      title: 'Tüm sınıfa puan ver',
      message: `${selectedClass} sınıfındaki ${students.length} öğrenciye "${behavior.name}" +1 verilsin mi?`,
      confirmText: 'Puan Ver',
      cancelText: 'Vazgeç',
    });
    if (!ok) return;

    setBulkBusy(true);
    playChimeSound();

    const res = await awardGardenClass(selectedClass, behavior.id);
    setBulkBusy(false);

    if (!res.ok) {
      setNotice({ kind: 'error', text: `Toplu puan verilemedi: ${res.error}` });
      return;
    }

    const awards = res.data;
    const awardMap = new Map(awards.map((a) => [a.student_id, a]));

    setStudents((prev) => {
      if (!prev) return prev;
      return prev.map((s) => {
        const aw = awardMap.get(s.id);
        if (!aw) return s;
        const oldTrees = s.trees || [];
        const existing = oldTrees.find((t) => t.behavior_id === behavior.id);
        const updatedTrees = existing
          ? oldTrees.map((t) => (t.behavior_id === behavior.id ? { ...t, earned: aw.earned } : t))
          : [
              ...oldTrees,
              {
                behavior_id: behavior.id,
                earned: aw.earned,
                watered: aw.watered,
                planted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];

        return {
          ...s,
          points: aw.points,
          trees: updatedTrees,
        };
      });
    });

    setNotice({
      kind: 'ok',
      text: `${selectedClass} sınıfındaki ${awards.length} öğrenciye "${behavior.name}" +1 puan verildi.`,
    });
  };

  // Davranış düzenleme / ekleme
  const openEditBehavior = (b: GardenBehavior | null) => {
    if (b) {
      setEditingBehavior(b);
      setIsNewBehavior(false);
      setBehaviorFormName(b.name);
      setBehaviorFormIcon(b.icon);
      setBehaviorFormTree(b.tree);
    } else {
      setEditingBehavior(null);
      setIsNewBehavior(true);
      setBehaviorFormName('');
      setBehaviorFormIcon(GARDEN_ICONS[0]);
      setBehaviorFormTree(GARDEN_TREES[0]);
    }
  };

  const handleSaveBehavior = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = behaviorFormName.trim();
    if (!trimmed || trimmed.length > 30) {
      setNotice({ kind: 'error', text: 'Davranış adı 1–30 karakter olmalıdır.' });
      return;
    }

    setBehaviorBusy(true);
    const res = await saveGardenBehavior(selectedClass, {
      id: isNewBehavior ? null : editingBehavior?.id,
      name: trimmed,
      icon: behaviorFormIcon,
      tree: behaviorFormTree,
    });
    setBehaviorBusy(false);

    if (!res.ok) {
      setNotice({ kind: 'error', text: `Kaydedilemedi: ${res.error}` });
      return;
    }

    const saved = res.data;
    setBehaviors((prev) => {
      if (!prev) return [saved];
      const exists = prev.some((b) => b.id === saved.id);
      if (exists) return prev.map((b) => (b.id === saved.id ? saved : b));
      return [...prev, saved];
    });

    setEditingBehavior(null);
    setIsNewBehavior(false);
    setNotice({ kind: 'ok', text: `"${saved.name}" davranışı kaydedildi.` });
  };

  const handleArchiveBehavior = async (b: GardenBehavior) => {
    const nextArchived = !b.archived;
    setBehaviorBusy(true);
    const res = await archiveGardenBehavior(b.id, nextArchived);
    setBehaviorBusy(false);

    if (!res.ok) {
      setNotice({ kind: 'error', text: `İşlem başarısız: ${res.error}` });
      return;
    }

    const updated = res.data;
    setBehaviors((prev) => (prev ? prev.map((x) => (x.id === updated.id ? updated : x)) : prev));
    setNotice({
      kind: 'ok',
      text: `"${updated.name}" davranışı ${nextArchived ? 'arşivlendi' : 'arşivden çıkarıldı'}.`,
    });
  };

  // Öğrenci grupları: Ana şube ve Grup üyeleri
  const mainBranchStudents = students ? students.filter((s) => !s.is_member) : [];
  const groupMemberStudents = students ? students.filter((s) => s.is_member) : [];

  if (loading && !students) {
    return (
      <div className={styles.gardenWorkspace}>
        <Spinner center label="Bahçe ve öğrenciler yükleniyor…" />
      </div>
    );
  }

  return (
    <div className={styles.gardenWorkspace}>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {error && (
        <div className={f.error} role="alert">
          {error}
        </div>
      )}

      {/* Üst Başlık ve Eylemler */}
      <header className={styles.gardenHeader}>
        <div className={styles.gardenHeaderTitle}>
          <h2>{selectedClass} Sınıf Bahçesi</h2>
          <p>
            Her dokunuş öğrenciye +1 puan verir. İlk puan fidanı diker, sonraki puanlar sulama hakkı kazandırır.
          </p>
        </div>

        <div className={styles.gardenHeaderActions}>
          {/* Herkese ver menüsü */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={f.secondaryButton}
              onClick={() => setBulkMenuOpen((v) => !v)}
              disabled={bulkBusy || activeBehaviors.length === 0}
              aria-expanded={bulkMenuOpen}
              aria-haspopup="menu"
            >
              <Users size={18} aria-hidden="true" />
              Herkese ver…
            </button>

            {bulkMenuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  background: '#fff',
                  border: '1px solid var(--teacher-border, #dedad0)',
                  borderRadius: 14,
                  boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                  zIndex: 40,
                  minWidth: 200,
                  padding: '6px 0',
                }}
              >
                {activeBehaviors.map((b) => {
                  const Icon = getGardenIcon(b.icon);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="menuitem"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '10px 16px',
                        border: 0,
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontFamily: 'inherit',
                      }}
                      onClick={() => void handleAwardClass(b)}
                    >
                      <Icon size={18} aria-hidden="true" style={{ color: 'var(--teacher-primary, #25634b)' }} />
                      <span>{b.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Davranışlar Yönetimi Butonu */}
          <button
            type="button"
            className={f.secondaryButton}
            onClick={() => setBehaviorModalOpen(true)}
            aria-label="Sınıf davranışlarını yönet"
          >
            <Settings size={18} aria-hidden="true" />
            Davranışlar
          </button>
        </div>
      </header>

      {/* Öğrenci Listesi */}
      <section className={styles.rosterCard} aria-label="Öğrenci listesi ve davranış puanları">
        <div className={styles.rosterHeader}>
          <h3>Öğrenciler ({students ? students.length : 0})</h3>
          <span style={{ fontSize: 13, color: 'var(--teacher-muted, #58665f)' }}>
            Etkin davranışlar: {activeBehaviors.length} / 12
          </span>
        </div>

        {students && students.length === 0 && (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--teacher-muted, #58665f)' }}>
            Bu sınıfta kayıtlı öğrenci bulunamadı.
          </p>
        )}

        {/* Ana Şube Öğrencileri */}
        {mainBranchStudents.map((s) => (
          <StudentRow
            key={s.id}
            student={s}
            activeBehaviors={activeBehaviors}
            busyKeys={busyKeys}
            animKey={animKey}
            onAward={handleAward}
            onViewGarden={() => setViewingStudent(s)}
          />
        ))}

        {/* Grup Üyeleri (Varsa) */}
        {groupMemberStudents.length > 0 && (
          <>
            <div className={styles.rosterGroupHeader}>
              Grup Üyeleri ({groupMemberStudents.length})
            </div>
            {groupMemberStudents.map((s) => (
              <StudentRow
                key={s.id}
                student={s}
                activeBehaviors={activeBehaviors}
                busyKeys={busyKeys}
                animKey={animKey}
                onAward={handleAward}
                onViewGarden={() => setViewingStudent(s)}
              />
            ))}
          </>
        )}
      </section>

      {/* 8 Saniyelik Geri Al Çubuğu */}
      {lastAward && (
        <div className={styles.undoToast} role="alert">
          <span className={styles.undoText}>
            {lastAward.studentName}: <strong>{lastAward.behaviorName} +1</strong> verildi.
          </span>
          <button type="button" className={styles.undoBtn} onClick={() => void handleUndo()}>
            <RotateCcw size={15} aria-hidden="true" />
            Geri al
          </button>
          <button
            type="button"
            className={styles.undoClose}
            onClick={() => setLastAward(null)}
            aria-label="Kapat"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Bahçeyi Gör Penceresi */}
      {viewingStudent && behaviors && (
        <Modal
          title={`${viewingStudent.name} Bahçesi`}
          kicker={`No ${viewingStudent.student_number || '—'} · Toplam ${viewingStudent.points || 0} puan`}
          onClose={() => setViewingStudent(null)}
          wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <GardenPlot
              behaviors={behaviors}
              trees={viewingStudent.trees || []}
              size="lg"
              highlightWater={false}
            />

            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700 }}>Ağaçların Durumu</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {behaviors
                  .filter((b) => !b.archived || (viewingStudent.trees || []).some((t) => t.behavior_id === b.id))
                  .map((b) => {
                    const tree = (viewingStudent.trees || []).find((t) => t.behavior_id === b.id);
                    const isPlanted = Boolean(tree && tree.earned >= 1);
                    const treeName = TREE_NAMES[b.tree] || 'Ağaç';
                    const stage = isPlanted && tree ? growthStage(tree.watered) : 0;
                    const stageName = STAGE_NAMES[stage] || 'Fidan';
                    const waterCount = tree ? tree.watered : 0;
                    const rights = tree ? waterRights(tree) : 0;

                    return (
                      <div
                        key={b.id}
                        style={{
                          padding: '12px 14px',
                          border: '1px solid var(--teacher-border, #dedad0)',
                          borderRadius: 12,
                          background: isPlanted ? '#ffffff' : '#faf9f5',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <strong style={{ fontSize: 14 }}>{b.name}</strong>
                          <span style={{ fontSize: 12, color: 'var(--teacher-muted, #58665f)' }}>{treeName}</span>
                        </div>
                        {isPlanted ? (
                          <div style={{ fontSize: 12, color: 'var(--teacher-muted, #58665f)', lineHeight: 1.5 }}>
                            <div>{stageName}</div>
                            <div>{tree?.earned} puan · {waterCount} kez sulandı</div>
                            <div style={{ color: rights > 0 ? '#0284c7' : 'inherit', fontWeight: rights > 0 ? 600 : 'normal' }}>
                              {rights > 0 ? `${rights} sulama hakkı bekliyor` : 'Bekleyen hak yok'}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: 'var(--teacher-muted, #58665f)', fontStyle: 'italic' }}>
                            Henüz fidan dikilmedi (0 puan)
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Davranışlar Yönetimi Penceresi */}
      {behaviorModalOpen && behaviors && (
        <Modal
          title="Sınıf Davranışları"
          kicker={`${selectedClass} · En fazla 12 etkin davranış`}
          onClose={() => {
            setBehaviorModalOpen(false);
            setEditingBehavior(null);
            setIsNewBehavior(false);
          }}
          busy={behaviorBusy}
        >
          {editingBehavior || isNewBehavior ? (
            /* Ekle / Düzenle Formu */
            <form onSubmit={(e) => void handleSaveBehavior(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ margin: 0, fontSize: 16 }}>
                {isNewBehavior ? 'Yeni Davranış Ekle' : 'Davranışı Düzenle'}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="behavior-name" style={{ fontSize: 13, fontWeight: 600 }}>
                  Davranış Adı (1–30 karakter)
                </label>
                <input
                  id="behavior-name"
                  type="text"
                  maxLength={30}
                  value={behaviorFormName}
                  onChange={(e) => setBehaviorFormName(e.target.value)}
                  placeholder="Örn: Ödev, Derse katılım, Nezaket"
                  required
                  style={{
                    minHeight: 44,
                    padding: '0 12px',
                    border: '1px solid var(--teacher-border, #dedad0)',
                    borderRadius: 10,
                    fontSize: 15,
                  }}
                />
              </div>

              {/* İkon Seçimi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>İkon Seçin</span>
                <div className={styles.pickerGrid}>
                  {GARDEN_ICONS.map((ic) => {
                    const Icon = getGardenIcon(ic);
                    const isSel = behaviorFormIcon === ic;
                    return (
                      <button
                        key={ic}
                        type="button"
                        className={`${styles.pickerOption} ${isSel ? styles.pickerOptionSelected : ''}`}
                        onClick={() => setBehaviorFormIcon(ic)}
                      >
                        <Icon size={20} aria-hidden="true" />
                        <span style={{ fontSize: 11 }}>{ic}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ağaç Türü Seçimi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Ağaç Türü Seçin</span>
                <div className={styles.pickerGrid}>
                  {GARDEN_TREES.map((tr) => {
                    const isSel = behaviorFormTree === tr;
                    const trName = TREE_NAMES[tr] || tr;
                    return (
                      <button
                        key={tr}
                        type="button"
                        className={`${styles.pickerOption} ${isSel ? styles.pickerOptionSelected : ''}`}
                        onClick={() => setBehaviorFormTree(tr)}
                      >
                        <TreeArt tree={tr} stage={3} size={42} />
                        <span style={{ fontSize: 11, textAlign: 'center' }}>{trName.replace(' ağacı', '')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className={f.secondaryButton}
                  onClick={() => {
                    setEditingBehavior(null);
                    setIsNewBehavior(false);
                  }}
                  disabled={behaviorBusy}
                >
                  Vazgeç
                </button>
                <button type="submit" className={f.primaryButton} disabled={behaviorBusy || !behaviorFormName.trim()}>
                  {behaviorBusy ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </div>
            </form>
          ) : (
            /* Davranışlar Listesi */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: 'var(--teacher-muted, #58665f)' }}>
                  Etkin: {activeBehaviors.length} / 12
                </span>
                <button
                  type="button"
                  className={f.primaryButton}
                  disabled={activeBehaviors.length >= 12}
                  onClick={() => openEditBehavior(null)}
                  title={activeBehaviors.length >= 12 ? 'En fazla 12 etkin davranış olabilir' : 'Yeni davranış ekle'}
                >
                  <Plus size={18} aria-hidden="true" />
                  Yeni Davranış
                </button>
              </div>

              <div className={styles.behaviorModalList}>
                {behaviors.map((b) => {
                  const Icon = getGardenIcon(b.icon);
                  const treeName = TREE_NAMES[b.tree] || b.tree;

                  return (
                    <div
                      key={b.id}
                      className={`${styles.behaviorModalItem} ${b.archived ? styles.behaviorModalItemArchived : ''}`}
                    >
                      <div className={styles.behaviorItemLeft}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: '#eef5ee',
                            color: 'var(--teacher-primary, #25634b)',
                          }}
                        >
                          <Icon size={18} aria-hidden="true" />
                        </div>
                        <div>
                          <div className={styles.behaviorItemTitle}>
                            {b.name}
                            {b.archived && <span className={styles.archivedBadge}>Arşivde</span>}
                          </div>
                          <div className={styles.behaviorItemTree}>{treeName}</div>
                        </div>
                      </div>

                      <div className={styles.behaviorItemActions}>
                        <button
                          type="button"
                          className={f.secondaryButton}
                          onClick={() => openEditBehavior(b)}
                          title="Düzenle"
                          aria-label={`${b.name} düzenle`}
                        >
                          <Edit size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={f.secondaryButton}
                          onClick={() => void handleArchiveBehavior(b)}
                          title={b.archived ? 'Arşivden Çıkar' : 'Arşivle'}
                          aria-label={`${b.name} ${b.archived ? 'arşivden çıkar' : 'arşivle'}`}
                        >
                          {b.archived ? 'Aktifleştir' : 'Arşivle'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// Öğrenci Satırı Bileşeni
function StudentRow({
  student,
  activeBehaviors,
  busyKeys,
  animKey,
  onAward,
  onViewGarden,
}: {
  student: GardenStudent;
  activeBehaviors: GardenBehavior[];
  busyKeys: Set<string>;
  animKey: string | null;
  onAward: (student: GardenStudent, behavior: GardenBehavior) => void;
  onViewGarden: () => void;
}) {
  return (
    <div className={styles.studentRow}>
      {/* Öğrenci Kimliği */}
      <div className={styles.studentInfo}>
        <span className={styles.studentAvatar} aria-hidden="true">
          {initialsOf(student.name)}
        </span>
        <div className={styles.studentNameGroup}>
          <h4 className={styles.studentName}>{student.name}</h4>
          <p className={styles.studentMeta}>
            No {student.student_number || '—'} · {student.points || 0} puan
          </p>
        </div>
      </div>

      {/* Davranış İkon Butonları */}
      <div className={styles.behaviorButtonsRow}>
        {activeBehaviors.map((b) => {
          const key = `${student.id}:${b.id}`;
          const tree = (student.trees || []).find((t) => t.behavior_id === b.id);
          const earned = tree ? tree.earned : 0;
          const isPlanted = earned >= 1;
          const isBusy = busyKeys.has(key);
          const isAnim = animKey === key;
          const Icon = getGardenIcon(b.icon);

          return (
            <button
              key={b.id}
              type="button"
              className={`${styles.behaviorBtn} ${isPlanted ? styles.behaviorBtnPlanted : ''}`}
              disabled={isBusy}
              onClick={() => onAward(student, b)}
              aria-label={`${student.name}: ${b.name} +1`}
              title={`${student.name}: ${b.name} +1 (${earned} puan)`}
            >
              {isAnim && (
                <span className={styles.floatPlusBadge} aria-hidden="true">
                  +1
                </span>
              )}
              <div className={styles.btnIconWrap}>
                <Icon size={18} aria-hidden="true" />
                {isPlanted && (
                  <span className={styles.plantedBadge} title="Fidan dikildi">
                    <Sprout size={12} aria-hidden="true" />
                  </span>
                )}
              </div>
              <span className={styles.btnEarnedCount}>{earned}</span>
            </button>
          );
        })}
      </div>

      {/* Bahçeyi Gör Butonu */}
      <button
        type="button"
        className={styles.viewGardenBtn}
        onClick={onViewGarden}
        aria-label={`${student.name} bahçesini gör`}
      >
        <Eye size={16} aria-hidden="true" />
        Bahçeyi gör
      </button>
    </div>
  );
}
