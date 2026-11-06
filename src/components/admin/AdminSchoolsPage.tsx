'use client';

import React, { useMemo, useState } from 'react';
import styles from './AdminManagement.module.css';
import { Plus, Trash2, X } from '../icons';
import { TURKEY_CITIES } from '../../data/portalData';
import { CustomSelect } from '../CustomSelect';
import { useDialog } from '../ConfirmDialog';
import { addSchool, deleteSchool, SchoolRecord } from '../../lib/supabaseClient';
import { AdminData, EmptyState, FilterBar, Notify, SearchInput, matchesQuery } from './adminShared';

interface Props {
  data: AdminData;
  notify: Notify;
}

/** Onaylı okullar: arama, il filtresi, okul başına öğretmen/öğrenci sayısı, toplu ekleme, silme */
export function AdminSchoolsPage({ data, notify }: Props) {
  const { confirm } = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [names, setNames] = useState('');

  const approved = data.schools.filter((s) => s.status === 'approved');
  const cities = [...new Set(approved.map((s) => s.city))].sort((a, b) => a.localeCompare(b, 'tr'));
  const filtered = approved.filter((s) => (!cityFilter || s.city === cityFilter) && matchesQuery(query, s.name, s.city, s.district));

  const counts = useMemo(() => {
    const map: Record<string, { teachers: number; students: number }> = {};
    const bump = (id: string | null, key: 'teachers' | 'students') => {
      if (!id) return;
      (map[id] ||= { teachers: 0, students: 0 })[key] += 1;
    };
    data.profiles.filter((p) => p.role === 'ogretmen' && p.approved).forEach((p) => bump(p.school_id, 'teachers'));
    data.students.forEach((s) => bump(s.school_id, 'students'));
    return map;
  }, [data.profiles, data.students]);

  const inDistrict = city && district ? approved.filter((s) => s.city === city && s.district === district).length : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = names.split('\n').map((n) => n.trim()).filter((n) => n.length >= 3);
    if (!city || !district) return notify('error', 'Lütfen il ve ilçe seçiniz.');
    if (list.length === 0) return notify('error', 'Lütfen en az bir okul adı yazınız (en az 3 karakter).');

    setBusyId('add');
    let added = 0;
    const failed: string[] = [];
    for (const name of list) {
      const res = await addSchool(name, city, district);
      if (res.ok) added++;
      else failed.push(name);
    }
    setBusyId(null);
    if (failed.length) notify('error', `${added} okul eklendi; eklenemeyenler: ${failed.join(', ')}`);
    else notify('ok', `${added} okul ${district}/${city} listesine eklendi.`);
    setNames('');
    data.refresh();
  };

  const handleDelete = async (s: SchoolRecord) => {
    const c = counts[s.id];
    const ok = await confirm({
      title: 'Okulu Sil',
      message: `"${s.name}" silinsin mi?${c ? `\n${c.teachers} öğretmen ve ${c.students} öğrenci bu okula bağlı; okul bilgileri boşalır.` : ''}`,
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setBusyId(s.id);
    const res = await deleteSchool(s.id);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Silinemedi.');
    notify('ok', `"${s.name}" silindi.`);
    data.refresh();
  };

  return (
    <div className={styles.stack}>
      <section className={styles.section} aria-labelledby="add-school-title">
        <div className={styles.between}>
          <h2 id="add-school-title" className={styles.sectionTitle}>Okul ekle</h2>
          <button type="button" className={formOpen ? styles.button : styles.primary} aria-expanded={formOpen} aria-controls="add-school-form" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? <><X className={styles.icon} /> Kapat</> : <><Plus className={styles.icon} /> Okul ekle</>}
          </button>
        </div>
        <p className={styles.muted}>Öğretmenler kayıtta il ve ilçeye göre bu listeden okul seçer. Toplu eklemek için her satıra bir okul yazın.</p>
        {formOpen && (
          <form id="add-school-form" onSubmit={handleAdd} className={styles.formStack}>
            <div className={styles.pair}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>İl</span>
                <CustomSelect
                  value={city}
                  onChange={(val) => { setCity(val); setDistrict(''); }}
                  placeholder="İl seçin"
                  options={Object.keys(TURKEY_CITIES).map((c) => ({ value: c, label: c }))}
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>İlçe</span>
                <CustomSelect
                  value={district}
                  disabled={!city}
                  onChange={setDistrict}
                  placeholder="İlçe seçin"
                  options={(TURKEY_CITIES[city] || []).map((d) => ({ value: d, label: d }))}
                />
              </div>
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Okul adları</span>
              <textarea
                className={styles.textarea}
                value={names}
                onChange={(e) => setNames(e.target.value)}
                placeholder={'Atatürk Ortaokulu\nCumhuriyet İlkokulu'}
              />
            </label>
            <div className={styles.between}>
              <span className={styles.muted}>{city && district ? `${district} ilçesinde ${inDistrict} kayıtlı okul var.` : ''}</span>
              <button type="submit" disabled={busyId === 'add'} className={styles.primary}>
                <Plus className={styles.icon} /> {busyId === 'add' ? 'Ekleniyor…' : 'Ekle'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className={styles.section} aria-labelledby="schools-title">
        <h2 id="schools-title" className={styles.sectionTitle}>Okullar ({approved.length})</h2>
        <FilterBar>
          <SearchInput id="school-search" value={query} onChange={setQuery} placeholder="Okul, il veya ilçe ara" />
          {cities.length > 1 && (
            <div className={styles.filterSelect}>
              <CustomSelect
                value={cityFilter}
                onChange={setCityFilter}
                options={[{ value: '', label: 'Bütün iller' }, ...cities.map((c) => ({ value: c, label: c }))]}
                placeholder="İl"
              />
            </div>
          )}
        </FilterBar>

        {data.loading && <EmptyState>Okullar yükleniyor…</EmptyState>}
        {!data.loading && approved.length === 0 && <EmptyState>Henüz onaylı okul yok. Yukarıdan okul ekleyin.</EmptyState>}
        {!data.loading && approved.length > 0 && filtered.length === 0 && <EmptyState>Aramanıza uyan okul yok.</EmptyState>}

        {filtered.length > 0 && (
          <ul className={styles.list}>
            {filtered.map((s) => {
              const c = counts[s.id] || { teachers: 0, students: 0 };
              return (
                <li key={s.id} className={styles.row}>
                  <div className={styles.details}>
                    <span className={styles.name}>{s.name}</span>
                    <span className={styles.muted}>{s.district} / {s.city} • {c.teachers} öğretmen • {c.students} öğrenci</span>
                  </div>
                  <div className={styles.actions}>
                    <button type="button" disabled={busyId === s.id} onClick={() => handleDelete(s)} aria-label={`${s.name} okulunu sil`} className={styles.danger}>
                      <Trash2 className={styles.icon} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
