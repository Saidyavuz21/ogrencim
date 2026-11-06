'use client';

import styles from './AdminManagement.module.css';
import React, { useEffect, useState } from 'react';
import { Building, Check, Trash2, Plus } from '../icons';
import { TURKEY_CITIES } from '../../data/portalData';
import { CustomSelect } from '../CustomSelect';
import { useDialog } from '../ConfirmDialog';
import {
  listPendingSchools,
  listSchools,
  addSchool,
  approveSchool,
  mergeSchool,
  deleteSchool,
  SchoolRecord,
} from '../../lib/supabaseClient';

interface SchoolManagementProps {
  notify: (type: 'ok' | 'error', text: string) => void;
  /** Okul değişikliği öğretmen listesini de etkiler (okul adları) */
  onChanged: () => void;
  /** Dışarıdan yenileme tetiklemek için artan sayaç */
  refreshKey: number;
}

/**
 * Okul yönetimi:
 *  - Öğretmenlerin "Okulum listede yok" ile eklediği okulları onaylama / doğru okulla birleştirme / silme
 *  - Admin'in il → ilçe seçip okul eklemesi (tek tek veya her satıra bir okul yazarak toplu)
 */
export const SchoolManagement: React.FC<SchoolManagementProps> = ({ notify, onChanged, refreshKey }) => {
  const { confirm, prompt } = useDialog();
  const [pending, setPending] = useState<SchoolRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Birleştirme: bekleyen okul → aynı ilçedeki onaylı okullardan biri
  const [mergeFor, setMergeFor] = useState<SchoolRecord | null>(null);
  const [mergeOptions, setMergeOptions] = useState<SchoolRecord[]>([]);
  const [mergeTarget, setMergeTarget] = useState('');

  // Okul ekleme
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [names, setNames] = useState('');
  const [fetchedSchools, setFetchedSchools] = useState<SchoolRecord[]>([]);
  const districtSchools = city && district ? fetchedSchools : [];

  const loadPending = async () => setPending(await listPendingSchools());

  useEffect(() => {
    let cancelled = false;
    listPendingSchools().then((list) => {
      if (!cancelled) setPending(list);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    if (!city || !district) return;
    listSchools(city, district).then((list) => {
      if (!cancelled) setFetchedSchools(list);
    });
    return () => {
      cancelled = true;
    };
  }, [city, district, refreshKey]);

  const afterChange = () => {
    loadPending();
    onChanged();
  };

  const handleApprove = async (s: SchoolRecord) => {
    const corrected = await prompt({
      title: 'Okulu Onayla',
      message: 'Okul adını kontrol edin (gerekirse düzeltin) ve onaylayın:',
      defaultValue: s.name,
      confirmText: 'Onayla ve Ekle',
      cancelText: 'Vazgeç',
      variant: 'primary',
    });
    if (corrected === null) return;
    setBusyId(s.id);
    const res = await approveSchool(s.id, corrected);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Onaylanamadı.');
    notify('ok', `${corrected.trim() || s.name} okul listesine eklendi.`);
    afterChange();
  };

  const openMerge = async (s: SchoolRecord) => {
    setMergeFor(s);
    setMergeTarget('');
    setMergeOptions(await listSchools(s.city, s.district));
  };

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeFor || !mergeTarget) return;
    setBusyId(mergeFor.id);
    const res = await mergeSchool(mergeFor.id, mergeTarget);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Birleştirilemedi.');
    const target = mergeOptions.find((o) => o.id === mergeTarget);
    notify('ok', `"${mergeFor.name}" → "${target?.name}" ile birleştirildi; öğretmenleri taşındı.`);
    setMergeFor(null);
    afterChange();
  };

  const handleDelete = async (s: SchoolRecord) => {
    const ok = await confirm({
      title: 'Okulu Sil',
      message: `"${s.name}" silinsin mi?\nBu okulu seçen öğretmenlerin okul bilgisi boşalır.`,
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
    afterChange();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = names
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length >= 3);
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
    afterChange();
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <Building className={styles.icon} />
        <h3 className={styles.sectionTitle}>Okullar</h3>
      </div>
      <p className={styles.muted}>
        Öğretmenler kayıtta il ve ilçeye göre okul seçer. Listede olmayan okullar burada onayınızı bekler.
        Yazım farkıyla tekrar eklenmiş bir okulu mevcut okulla birleştirebilirsiniz.
      </p>

      {/* ONAY BEKLEYEN OKULLAR */}
      {pending.length > 0 && (
        <div className={styles.formStack}>
          <span className={styles.pendingTitle}>Onay bekleyen okullar ({pending.length})</span>
          {pending.map((s) => (
            <div key={s.id} className={styles.pendingRow}>
              <div className={styles.details}>
                <span className={styles.name}>{s.name}</span>
                <span className={styles.muted}>
                  {s.district} / {s.city}
                </span>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => handleDelete(s)}
                  aria-label={`${s.name} okulunu sil`}
                  className={styles.danger}
                >
                  <Trash2 className={styles.icon} />
                </button>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => openMerge(s)}
                  className={styles.button}
                >
                  Birleştir
                </button>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => handleApprove(s)}
                  className={styles.primary}
                >
                  <Check className={styles.icon} /> Onayla
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OKUL EKLE */}
      <form onSubmit={handleAdd} className={styles.formStack}>
        <span className={styles.fieldLabel}>Okul ekle</span>
        <div className={styles.pair}>
          <CustomSelect
            value={city}
            onChange={(val) => {
              setCity(val);
              setDistrict('');
            }}
            placeholder="İl seçin"
            options={Object.keys(TURKEY_CITIES).map((c) => ({ value: c, label: c }))}
          />
          <CustomSelect
            value={district}
            disabled={!city}
            onChange={(val) => setDistrict(val)}
            placeholder="İlçe seçin"
            options={(TURKEY_CITIES[city] || []).map((d) => ({ value: d, label: d }))}
          />
        </div>
        <textarea
          aria-label="Okul adları"
          className={styles.textarea}
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder={'Okul adı (toplu eklemek için her satıra bir okul yazın)\nÖrn. Atatürk Ortaokulu\nCumhuriyet İlkokulu'}
        />
        <div className={styles.between}>
          <span className={styles.muted}>
            {city && district ? `${district} ilçesinde ${districtSchools.length} kayıtlı okul var.` : ''}
          </span>
          <button
            type="submit"
            disabled={busyId === 'add'}
            className={styles.primary}
          >
            <Plus className={styles.icon} /> {busyId === 'add' ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
        {districtSchools.length > 0 && (
          <details className={styles.muted}>
            <summary className={styles.muted}>Bu ilçedeki okulları göster</summary>
            <ul className={styles.list}>
              {districtSchools.map((s) => (
                <li key={s.id} className={styles.row}>
                  <span className={styles.details}>{s.name}</span>
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => handleDelete(s)}
                    aria-label={`${s.name} okulunu sil`}
                    className={styles.danger}
                  >
                    <Trash2 className={styles.icon} />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </form>

      {/* BİRLEŞTİRME MODALI */}
      {mergeFor && (
        <div className={styles.backdrop}>
          <form onSubmit={handleMerge} className={styles.dialog}>
            <h3 className={styles.sectionTitle}>Okulu birleştir</h3>
            <p className={styles.muted}>
              <strong>{mergeFor.name}</strong> ({mergeFor.district}/{mergeFor.city}) aslında listedeki hangi okul? Bu okulu seçen öğretmenler
              seçtiğiniz okula taşınır ve bu kayıt silinir.
            </p>
            {mergeOptions.length === 0 ? (
              <p className={styles.muted}>
                Bu ilçede henüz onaylı okul yok. Birleştirmek yerine okulu onaylayabilirsiniz.
              </p>
            ) : (
              <CustomSelect
                value={mergeTarget}
                onChange={(val) => setMergeTarget(val)}
                placeholder="Okul seçin"
                options={mergeOptions.map((o) => ({ value: o.id, label: o.name }))}
              />
            )}
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => setMergeFor(null)}
                className={styles.button}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={!mergeTarget || busyId === mergeFor.id}
                className={styles.primary}
              >
                Birleştir
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
