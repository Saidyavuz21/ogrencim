'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Shuffle, Bell, Users, Mic, Trophy } from '../icons';
import type { IconProps } from '../icons';
import { RandomPicker } from './classtools/RandomPicker';
import { Stopwatch } from './classtools/Stopwatch';
import { Countdown } from './classtools/Countdown';
import { SoundLevel } from './classtools/SoundLevel';
import { Scoreboard } from './classtools/Scoreboard';
import { GroupMaker } from './classtools/GroupMaker';
import { useClassStudents } from './TeacherUi';
import { Spinner } from '../Spinner';
import styles from './TeacherDashboard.module.css';
import s from './classtools/ClassTools.module.css';

/**
 * Sınıf araçları: derste kullanılan küçük araçlar (EduBoard listesi, Paket 1).
 * Rastgele seçici, grup oluşturucu, kronometre, geri sayım.
 */
export type ClassToolId = 'picker' | 'groups' | 'stopwatch' | 'countdown' | 'sound' | 'scoreboard';
type ToolId = ClassToolId;

const TOOLS: { id: ToolId; label: string; icon: React.FC<IconProps> }[] = [
  { id: 'picker', label: 'Rastgele seçici', icon: Shuffle },
  { id: 'groups', label: 'Grup oluştur', icon: Users },
  { id: 'stopwatch', label: 'Kronometre', icon: Clock },
  { id: 'sound', label: 'Ses seviyesi', icon: Mic },
  { id: 'scoreboard', label: 'Skor tabelası', icon: Trophy },
  { id: 'countdown', label: 'Geri sayım', icon: Bell },
];

const TOOL_KEY = 'sinif-araci';
const readTool = (): ToolId => {
  if (typeof window === 'undefined') return 'picker';
  try {
    const v = window.localStorage.getItem(TOOL_KEY);
    return TOOLS.some((t) => t.id === v) ? (v as ToolId) : 'picker';
  } catch {
    return 'picker';
  }
};

export function TeacherClassToolsPage({ selectedClass, initialTool }: { selectedClass: string; initialTool?: ClassToolId }) {
  const { students, loading, error } = useClassStudents(selectedClass);
  const [tool, setToolState] = useState<ToolId>(() => initialTool ?? readTool());
  const [verticalMenu, setVerticalMenu] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setVerticalMenu(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const setTool = (id: ToolId) => {
    setToolState(id);
    try { window.localStorage.setItem(TOOL_KEY, id); } catch { /* Storage may be unavailable. */ }
  };

  return (
    <div className={`${styles.pageBody} ${s.workspace}`}>
      <div className={s.tabsNav}>
        <div className={s.tabsTrack}>
          <div
            className={s.tabs}
            role="tablist"
            aria-label="Sınıf araçları"
            aria-orientation={verticalMenu ? 'vertical' : 'horizontal'}
          >
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tool-tab-${t.id}`}
                aria-selected={tool === t.id}
                aria-controls={`tool-panel-${t.id}`}
                tabIndex={tool === t.id ? 0 : -1}
                onClick={() => setTool(t.id)}
                onKeyDown={(e) => {
                  const previousKey = verticalMenu ? 'ArrowUp' : 'ArrowLeft';
                  const nextKey = verticalMenu ? 'ArrowDown' : 'ArrowRight';
                  if (![previousKey, nextKey, 'Home', 'End'].includes(e.key)) return;
                  e.preventDefault();
                  const index = TOOLS.findIndex((item) => item.id === tool);
                  const nextIndex = e.key === 'Home' ? 0 : e.key === 'End' ? TOOLS.length - 1 : (index + (e.key === nextKey ? 1 : -1) + TOOLS.length) % TOOLS.length;
                  const next = TOOLS[nextIndex];
                  setTool(next.id);
                  document.getElementById(`tool-tab-${next.id}`)?.focus();
                }}
              >
                <t.icon size={18} aria-hidden="true" />{t.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      <div className={s.toolContent} role="tabpanel" id={`tool-panel-${tool}`} aria-labelledby={`tool-tab-${tool}`}>
        {tool === 'picker' && (
          <>
            {loading && <Spinner center label="Öğrenciler yükleniyor…" />}
            {error && <p className={styles.noticeError}>{error}</p>}
            {!loading && !error && <RandomPicker key={selectedClass} className={selectedClass} students={students} />}
          </>
        )}
        {tool === 'groups' && (
          <>
            {loading && <Spinner center label="Öğrenciler yükleniyor…" />}
            {error && <p className={styles.noticeError}>{error}</p>}
            {!loading && !error && <GroupMaker key={selectedClass} className={selectedClass} students={students} />}
          </>
        )}
        {tool === 'stopwatch' && <Stopwatch />}
        {tool === 'countdown' && <Countdown />}
        {tool === 'sound' && <SoundLevel />}
        {tool === 'scoreboard' && <Scoreboard key={selectedClass} className={selectedClass} students={students} loading={loading} />}
      </div>
    </div>
  );
}
