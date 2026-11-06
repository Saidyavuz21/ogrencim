'use client';

import React, { useState } from 'react';
import { Clock, Shuffle, Bell, Users } from '../icons';
import type { IconProps } from '../icons';
import { RandomPicker } from './classtools/RandomPicker';
import { Stopwatch } from './classtools/Stopwatch';
import { Countdown } from './classtools/Countdown';
import { GroupMaker } from './classtools/GroupMaker';
import { useClassStudents } from './TeacherUi';
import styles from './TeacherDashboard.module.css';
import s from './classtools/ClassTools.module.css';

/**
 * Sınıf araçları: derste kullanılan küçük araçlar (EduBoard listesi, Paket 1).
 * Rastgele seçici, grup oluşturucu, kronometre, geri sayım.
 */
type ToolId = 'picker' | 'groups' | 'stopwatch' | 'countdown';

const TOOLS: { id: ToolId; label: string; icon: React.FC<IconProps> }[] = [
  { id: 'picker', label: 'Rastgele seçici', icon: Shuffle },
  { id: 'groups', label: 'Grup oluştur', icon: Users },
  { id: 'stopwatch', label: 'Kronometre', icon: Clock },
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

export function TeacherClassToolsPage({ selectedClass }: { selectedClass: string }) {
  const { students, loading, error } = useClassStudents(selectedClass);
  const [tool, setToolState] = useState<ToolId>(readTool);
  const setTool = (id: ToolId) => {
    setToolState(id);
    try { window.localStorage.setItem(TOOL_KEY, id); } catch { /* gizli sekme vb. */ }
  };

  return (
    <div className={styles.pageBody}>
      <div className={s.tabs} role="tablist" aria-label="Sınıf araçları">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tool-tab-${t.id}`}
            aria-selected={tool === t.id}
            aria-controls={`tool-panel-${t.id}`}
            onClick={() => setTool(t.id)}
          >
            <t.icon size={18} aria-hidden="true" />{t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`tool-panel-${tool}`} aria-labelledby={`tool-tab-${tool}`}>
        {tool === 'picker' && (
          <>
            {loading && <p className={styles.mutedText}>Öğrenciler yükleniyor…</p>}
            {error && <p className={styles.noticeError}>{error}</p>}
            {!loading && !error && <RandomPicker key={selectedClass} className={selectedClass} students={students} />}
          </>
        )}
        {tool === 'groups' && (
          <>
            {loading && <p className={styles.mutedText}>Öğrenciler yükleniyor…</p>}
            {error && <p className={styles.noticeError}>{error}</p>}
            {!loading && !error && <GroupMaker key={selectedClass} className={selectedClass} students={students} />}
          </>
        )}
        {tool === 'stopwatch' && <Stopwatch />}
        {tool === 'countdown' && <Countdown />}
      </div>
    </div>
  );
}
