'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Shuffle, Bell, Users, ChevronLeft, ChevronRight } from '../icons';
import type { IconProps } from '../icons';
import { RandomPicker } from './classtools/RandomPicker';
import { Stopwatch } from './classtools/Stopwatch';
import { Countdown } from './classtools/Countdown';
import { GroupMaker } from './classtools/GroupMaker';
import { useClassStudents } from './TeacherUi';
import { Spinner } from '../Spinner';
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
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    const el = tabsRef.current;
    if (!el) return;
    const offset = direction === 'left' ? -160 : 160;
    el.scrollBy({ left: offset, behavior: 'smooth' });
    setTimeout(checkScroll, 220);
  };

  const setTool = (id: ToolId, e?: React.MouseEvent<HTMLButtonElement>) => {
    setToolState(id);
    try { window.localStorage.setItem(TOOL_KEY, id); } catch { /* gizli sekme vb. */ }
    e?.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    setTimeout(checkScroll, 220);
  };

  return (
    <div className={styles.pageBody}>
      <div className={s.tabsNav}>
        <button
          type="button"
          className={s.scrollBtn}
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          aria-label="Önceki araçlar"
          title="Önceki araçlar"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <div className={s.tabsTrack}>
          <div
            ref={tabsRef}
            className={s.tabs}
            role="tablist"
            aria-label="Sınıf araçları"
            onScroll={checkScroll}
          >
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tool-tab-${t.id}`}
                aria-selected={tool === t.id}
                aria-controls={`tool-panel-${t.id}`}
                onClick={(e) => setTool(t.id, e)}
              >
                <t.icon size={18} aria-hidden="true" />{t.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={s.scrollBtn}
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          aria-label="Sonraki araçlar"
          title="Sonraki araçlar"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      <div role="tabpanel" id={`tool-panel-${tool}`} aria-labelledby={`tool-tab-${tool}`}>
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
      </div>
    </div>
  );
}
