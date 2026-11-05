'use client';

import React, { useEffect, useState } from 'react';
import { Aquarium } from '../aquarium/Aquarium';
import { AquariumStudent, listClassAquarium } from '../../lib/teacherData';
import styles from './TeacherDashboard.module.css';

/** Sınıf akvaryumu: tüm sınıf aynı akvaryumda; akıllı tahtaya yansıtmak için tam ekran */
export function TeacherAquariumPage({ selectedClass }: { selectedClass: string }) {
  const [students, setStudents] = useState<AquariumStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listClassAquarium(selectedClass).then((res) => {
      if (!alive) return;
      if (res.ok) setStudents(res.data);
      else setError(`Akvaryum yüklenemedi: ${res.error}`);
    });
    return () => { alive = false; };
  }, [selectedClass]);

  return (
    <div className={styles.pageBody}>
      {error && <p role="alert" className={styles.noticeError}>{error}</p>}
      {!students && !error && <p className={styles.mutedText}>Akvaryum hazırlanıyor…</p>}
      {students && <Aquarium students={students} scopeKey={`ogretmen:${selectedClass}`} title={`${selectedClass} akvaryumu`} />}
    </div>
  );
}
