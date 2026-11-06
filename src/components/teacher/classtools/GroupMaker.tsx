'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Maximize, Minimize, Minus, Plus, Shuffle, UserX, Users, Copy } from '../../icons';
import type { ClassStudent } from '../../../lib/teacherData';
import { useFullscreen } from './useFullscreen';
import { absentKey, readJson, shuffled, today, writeJson } from './storage';
import s from './ClassTools.module.css';

/**
 * Grup oluşturucu
 *  - "N grup" ya da "grup başına N kişi"
 *  - "Puanları dengele": puana göre yılan dağıtımı (her grubun ortalaması yakın); kapalıysa tamamen rastgele
 *  - "Yok" işaretliler katılmaz (rastgele seçiciyle aynı liste)
 *  - Gruplar sınıf + gün bazında bu cihazda hatırlanır; panoya kopyalanabilir, tam ekranda gösterilir
 */

type Mode = 'count' | 'size';
interface Settings { mode: Mode; n: number; balance: boolean }

const SETTINGS_KEY = 'grup-ayar';
const groupsKey = (cls: string) => `gruplar:${cls}:${today()}`;
const COLORS = ['#ffd84d', '#7fd3ff', '#ff9f8a', '#a7e38f', '#d8b4ff', '#ffc27a', '#8fe3d0', '#f6a5d6'];

/** Grup sayısını ayara göre hesaplar (en az 1, en çok öğrenci sayısı) */
export function groupCount(total: number, { mode, n }: Pick<Settings, 'mode' | 'n'>) {
  if (total <= 0) return 0;
  const k = mode === 'count' ? n : Math.ceil(total / Math.max(1, n));
  return Math.max(1, Math.min(total, k));
}

/** Öğrencileri gruplara böler. balance: puana göre yılan dağıtımı */
export function makeGroups(students: ClassStudent[], settings: Settings): string[][] {
  const k = groupCount(students.length, settings);
  if (!k) return [];
  const groups: string[][] = Array.from({ length: k }, () => []);
  if (settings.balance) {
    // Aynı puandakiler kendi arasında karışsın diye önce karıştır, sonra puana göre sırala
    const ordered = shuffled(students).sort((a, b) => b.points - a.points);
    ordered.forEach((st, i) => {
      const round = Math.floor(i / k);
      const pos = i % k;
      groups[round % 2 === 0 ? pos : k - 1 - pos].push(st.id);
    });
    // Grup sırası da rastgele olsun ("Grup 1" hep en güçlü olmasın), grup içi sıra da karışsın
    return shuffled(groups).map((g) => shuffled(g));
  }
  shuffled(students).forEach((st, i) => groups[i % k].push(st.id));
  return groups;
}

const shortName = (name: string) => name.trim().split(/\s+/)[0] || name;

export function GroupMaker({ className, students }: { className: string; students: ClassStudent[] }) {
  const [absent, setAbsent] = useState<string[]>(() => readJson(absentKey(className), []));
  const [settings, setSettings] = useState<Settings>(() => readJson(SETTINGS_KEY, { mode: 'count', n: 4, balance: false }));
  const [groups, setGroups] = useState<string[][]>(() => readJson(groupsKey(className), []));
  const [copied, setCopied] = useState(false);
  const [version, setVersion] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const { full, toggle: toggleFull } = useFullscreen(stageRef);

  useEffect(() => writeJson(absentKey(className), absent), [className, absent]);
  useEffect(() => writeJson(SETTINGS_KEY, settings), [settings]);
  useEffect(() => writeJson(groupsKey(className), groups), [className, groups]);

  const byId = useMemo(() => new Map(students.map((st) => [st.id, st])), [students]);
  const present = useMemo(() => students.filter((st) => !absent.includes(st.id)), [students, absent]);
  // Silinmiş öğrenciler gruplardan düşer
  const shownGroups = groups.map((g) => g.filter((id) => byId.has(id))).filter((g) => g.length);
  const k = groupCount(present.length, settings);
  const perGroup = k ? `${Math.floor(present.length / k)}${present.length % k ? `–${Math.ceil(present.length / k)}` : ''}` : '0';
  const stale = shownGroups.some((g) => g.some((id) => absent.includes(id)));

  const generate = () => {
    if (!present.length) return;
    setGroups(makeGroups(present, settings));
    setVersion((v) => v + 1);
    setCopied(false);
  };

  // Tam ekranda boşluk / Enter ile yeniden karıştır
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (present.length) {
          setGroups(makeGroups(present, settings));
          setVersion((v) => v + 1);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [full, present, settings]);

  // En az 2, en çok sınıf mevcudu
  const setN = (n: number) => setSettings((st) => ({ ...st, n: Math.max(2, Math.min(Math.max(2, students.length), n)) }));
  const toggleAbsent = (id: string) =>
    setAbsent((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const copy = async () => {
    const text = shownGroups
      .map((g, i) => `Grup ${i + 1}: ${g.map((id) => byId.get(id)?.name).filter(Boolean).join(', ')}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(`${className} grupları\n${text}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!students.length) {
    return <p className={s.empty}>{className} sınıfında öğrenci yok. Önce &quot;Öğrenciler&quot; sayfasından öğrenci ekleyin.</p>;
  }

  return (
    <div className={s.layout}>
      <div ref={stageRef} className={`${s.stage} ${s.groupStage} ${full ? s.full : ''}`}>
        <div className={s.stageTop}>
          <span className={s.counter}>
            {shownGroups.length ? `${shownGroups.length} grup · ${shownGroups.reduce((a, g) => a + g.length, 0)} öğrenci` : `${present.length} öğrenci · ${k} grup olacak`}
          </span>
          <div className={s.stageActions}>
            {shownGroups.length > 0 && (
              <button type="button" className={s.ghost} onClick={copy} aria-live="polite">
                {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            )}
            <button type="button" className={s.ghost} onClick={toggleFull} aria-label={full ? 'Tam ekrandan çık' : 'Tam ekran'}>
              {full ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
              <span>{full ? 'Küçült' : 'Tam ekran'}</span>
            </button>
          </div>
        </div>

        {shownGroups.length === 0 ? (
          <div className={s.display}>
            <p className={s.prompt}>{present.length ? 'Ayarları seçip "Grupları oluştur"a basın.' : 'Bütün öğrenciler "yok" işaretli.'}</p>
          </div>
        ) : (
          <ol key={version} className={s.groups}>
            {shownGroups.map((g, i) => (
              <li key={i} className={s.group} style={{ '--group-color': COLORS[i % COLORS.length], animationDelay: `${i * 60}ms` } as React.CSSProperties}>
                <h3 className={s.groupTitle}><Users size={18} aria-hidden="true" />Grup {i + 1}<span>{g.length}</span></h3>
                <ul className={s.groupMembers}>
                  {g.map((id) => {
                    const st = byId.get(id);
                    return (
                      <li key={id} className={absent.includes(id) ? s.memberAbsent : undefined}>
                        {full ? st?.name : shortName(st?.name || '')}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}

        <div className={s.controls}>
          <button type="button" className={s.primary} onClick={generate} disabled={!present.length}>
            <Shuffle size={22} aria-hidden="true" />{shownGroups.length ? 'Yeniden karıştır' : 'Grupları oluştur'}
          </button>
        </div>
        {stale && !full && <p className={s.hint}>&quot;Yok&quot; işaretlenen öğrenci gruplarda üstü çizili; yeniden karıştırınca çıkar.</p>}
        {full && <p className={s.hint}>Boşluk ya da Enter ile yeniden karıştır · Esc ile çık</p>}
      </div>

      <aside className={s.side}>
        <section className={s.panel} aria-labelledby="groups-settings-title">
          <h2 id="groups-settings-title" className={s.panelTitle}>Nasıl bölünsün?</h2>
          <div className={s.segment} role="group" aria-label="Bölme biçimi">
            <button type="button" aria-pressed={settings.mode === 'count'} onClick={() => setSettings((st) => ({ ...st, mode: 'count' }))}>Grup sayısı</button>
            <button type="button" aria-pressed={settings.mode === 'size'} onClick={() => setSettings((st) => ({ ...st, mode: 'size' }))}>Grup başına kişi</button>
          </div>
          <div className={s.stepper}>
            <button type="button" onClick={() => setN(settings.n - 1)} disabled={settings.n <= 2} aria-label="Azalt"><Minus size={20} aria-hidden="true" /></button>
            <output aria-live="polite">
              <strong>{settings.n}</strong>
              <span>{settings.mode === 'count' ? 'grup' : 'kişi'}</span>
            </output>
            <button type="button" onClick={() => setN(settings.n + 1)} disabled={settings.n >= Math.max(2, students.length)} aria-label="Artır"><Plus size={20} aria-hidden="true" /></button>
          </div>
          <p className={s.muted}>{present.length} öğrenci → {k} grup, grup başına {perGroup} kişi.</p>
          <label className={s.option}>
            <input type="checkbox" checked={settings.balance} onChange={(e) => setSettings((st) => ({ ...st, balance: e.target.checked }))} />
            Puanları dengele
          </label>
          <p className={s.muted}>Açıkken her gruba benzer puanlarda öğrenciler düşer; kapalıyken tamamen rastgele.</p>
        </section>

        <section className={s.panel} aria-labelledby="groups-roster-title">
          <div className={s.panelHead}>
            <h2 id="groups-roster-title">Sınıf listesi</h2>
            {absent.some((id) => byId.has(id)) && (
              <button type="button" className={s.link} onClick={() => setAbsent([])}>Herkes burada</button>
            )}
          </div>
          <p className={s.muted}>Gelmeyen öğrenciye dokunun: gruplara katılmaz. Rastgele seçiciyle ortaktır.</p>
          <ul className={s.roster}>
            {students.map((st) => {
              const isAbsent = absent.includes(st.id);
              return (
                <li key={st.id}>
                  <button
                    type="button"
                    className={`${s.chip} ${isAbsent ? s.chipAbsent : ''}`}
                    aria-pressed={isAbsent}
                    aria-label={`${st.name}${isAbsent ? ', yok' : ''}`}
                    onClick={() => toggleAbsent(st.id)}
                  >
                    {isAbsent && <UserX size={14} aria-hidden="true" />}
                    {st.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </aside>
    </div>
  );
}
