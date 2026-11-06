'use client';

import React, { useMemo, useState } from 'react';
import styles from './AdminManagement.module.css';
import { CustomSelect } from '../CustomSelect';
import { AdminData, EmptyState, FilterBar } from './adminShared';

interface ClassRow {
  key: string;
  className: string;
  schoolName: string;
  students: number;
  homerooms: string[];
}

/** Okullara göre sınıflar: öğrenci kayıtlarından ve öğretmenlerin rehberlik sınıflarından türetilir */
export function AdminClassesPage({ data }: { data: AdminData }) {
  const [schoolId, setSchoolId] = useState('');

  const { rows, schoolOptions, noClass } = useMemo(() => {
    const schoolNames = new Map(data.schools.map((s) => [s.id, s.name]));
    const map = new Map<string, ClassRow>();
    const rowFor = (sid: string | null, cls: string) => {
      const key = `${sid || 'none'}|${cls}`;
      let row = map.get(key);
      if (!row) {
        row = { key, className: cls, schoolName: (sid && schoolNames.get(sid)) || 'Okulsuz', students: 0, homerooms: [] };
        map.set(key, row);
      }
      return row;
    };
    let missing = 0;
    data.students
      .filter((s) => !schoolId || s.school_id === schoolId)
      .forEach((s) => {
        if (!s.class_name) { missing += 1; return; }
        rowFor(s.school_id, s.class_name).students += 1;
      });
    data.profiles
      .filter((p) => p.role === 'ogretmen' && p.approved && p.class_name && (!schoolId || p.school_id === schoolId))
      .forEach((p) => rowFor(p.school_id, p.class_name as string).homerooms.push(p.full_name || p.email || 'Öğretmen'));

    const used = new Set<string>();
    data.students.forEach((s) => s.school_id && used.add(s.school_id));
    data.profiles.forEach((p) => p.school_id && used.add(p.school_id));

    return {
      rows: [...map.values()].sort((a, b) =>
        a.schoolName.localeCompare(b.schoolName, 'tr') || a.className.localeCompare(b.className, 'tr', { numeric: true })),
      schoolOptions: [...used].map((id) => [id, schoolNames.get(id) || 'Adsız okul'] as const).sort((a, b) => a[1].localeCompare(b[1], 'tr')),
      noClass: missing,
    };
  }, [data.students, data.profiles, data.schools, schoolId]);

  const showSchool = schoolOptions.length > 1;
  const withoutHomeroom = rows.filter((r) => r.homerooms.length === 0).length;

  return (
    <section className={styles.section} aria-labelledby="classes-title">
      <div className={styles.between}>
        <h2 id="classes-title" className={styles.sectionTitle}>Sınıflar ({rows.length})</h2>
        {withoutHomeroom > 0 && <span className={styles.warningBadge}>{withoutHomeroom} sınıfın rehber öğretmeni yok</span>}
      </div>
      <p className={styles.muted}>Sınıflar öğrenci kayıtlarından ve öğretmenlerin rehberlik sınıflarından otomatik oluşur.</p>

      {showSchool && (
        <FilterBar>
          <div className={styles.filterSelect}>
            <CustomSelect
              value={schoolId}
              onChange={setSchoolId}
              options={[{ value: '', label: 'Bütün okullar' }, ...schoolOptions.map(([id, name]) => ({ value: id, label: name }))]}
              placeholder="Okul"
            />
          </div>
        </FilterBar>
      )}

      {data.loading && <EmptyState>Sınıflar yükleniyor…</EmptyState>}
      {!data.loading && rows.length === 0 && <EmptyState>Henüz sınıf yok. Öğrenci eklendikçe burada görünür.</EmptyState>}

      {rows.length > 0 && (
        <ul className={styles.list}>
          {rows.map((r) => (
            <li key={r.key} className={styles.row}>
              <div className={styles.classIdentity}>
                <span className={styles.classBadge} aria-hidden="true">{r.className}</span>
                <div className={styles.details}>
                  <span className={styles.name}>{r.className}{showSchool ? ` · ${r.schoolName}` : ''}</span>
                  <span className={styles.muted}>
                    {r.students} öğrenci • Rehber: {r.homerooms.length ? r.homerooms.join(', ') : 'atanmadı'}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {noClass > 0 && <p className={styles.muted}>{noClass} öğrencinin sınıfı girilmemiş.</p>}
    </section>
  );
}
