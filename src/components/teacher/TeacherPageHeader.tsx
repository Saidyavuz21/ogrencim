'use client';

import React, { useState } from 'react';
import { ArrowLeft, ChevronDown } from '../icons';
import { TeacherClass } from '../../data/portalData';
import { TeacherPageInfo } from './teacherPages';
import { CustomSelect } from '../CustomSelect';
import styles from './TeacherDashboard.module.css';

interface TeacherPageHeaderProps {
  page: TeacherPageInfo;
  onBack: () => void;
  /** Sınıfa bağlı sayfalarda sınıf seçici gösterilir */
  classes?: TeacherClass[];
  selectedClass?: string;
  onSelectClass?: (value: string) => void;
}

/** Alt sayfaların üst çubuğu: ana sayfaya dönüş + sayfa adı (+ sınıf seçimi, mobilde açılır/kapanır) */
export function TeacherPageHeader({ page, onBack, classes, selectedClass, onSelectClass }: TeacherPageHeaderProps) {
  const showClassPicker = Boolean(classes && onSelectClass);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderRow}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
          <span>Ana sayfa</span>
        </button>
      </div>
      <div className={styles.pageTitleRow}>
        <span className={styles.pageCardIcon}><page.icon size={22} aria-hidden="true" /></span>
        <div className={styles.pageTitleText}>
          <h1>{page.title}</h1>
          {showClassPicker && selectedClass && (
            <p className={styles.pageMobileClassSummary}>Sınıf: {selectedClass}</p>
          )}
        </div>
        {showClassPicker && (
          <button
            type="button"
            className={styles.pageHeaderToggle}
            aria-expanded={mobileOpen}
            aria-controls="teacher-page-class-wrap"
            aria-label={mobileOpen ? 'Sınıf seçimini gizle' : 'Sınıf seçimini göster'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <ChevronDown size={20} aria-hidden="true" className={mobileOpen ? styles.homeToggleOpen : undefined} />
          </button>
        )}
      </div>
      {showClassPicker && (
        <div
          id="teacher-page-class-wrap"
          className={`${styles.pageClassField} ${mobileOpen ? '' : styles.pageClassFieldClosed}`}
        >
          <span>Sınıf</span>
          <div style={{ flex: 1, minWidth: 160, maxWidth: 280 }}>
            <CustomSelect
              id="teacher-page-class"
              value={classes!.some((cls) => cls.name === selectedClass) ? selectedClass! : ''}
              onChange={(val) => {
                onSelectClass!(val);
                setMobileOpen(false);
              }}
              options={classes!.map((cls) => ({ value: cls.name, label: cls.name }))}
              placeholder={classes!.length ? 'Sınıf seçin' : 'Henüz sınıf eklenmedi'}
              disabled={!classes!.length}
            />
          </div>
        </div>
      )}
    </header>
  );
}
