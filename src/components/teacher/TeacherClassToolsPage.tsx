'use client';

import React from 'react';
import { RandomPicker } from './classtools/RandomPicker';
import { useClassStudents } from './TeacherUi';
import styles from './TeacherDashboard.module.css';

/**
 * Sınıf araçları: derste kullanılan küçük araçlar (EduBoard listesi, Paket 1).
 * Şimdilik rastgele öğrenci seçici; kronometre, geri sayım ve grup oluşturucu sırayla eklenecek.
 */
export function TeacherClassToolsPage({ selectedClass }: { selectedClass: string }) {
  const { students, loading, error } = useClassStudents(selectedClass);

  return (
    <div className={styles.pageBody}>
      {loading && <p className={styles.mutedText}>Öğrenciler yükleniyor…</p>}
      {error && <p className={styles.noticeError}>{error}</p>}
      {!loading && !error && <RandomPicker key={selectedClass} className={selectedClass} students={students} />}
    </div>
  );
}
