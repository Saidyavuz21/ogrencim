'use client';

import React, { useEffect, useState } from 'react';
import { Building, Check, Trash2, Plus } from '../icons';
import { TURKEY_CITIES } from '../../data/portalData';
import {
  listPendingSchools,
  listSchools,
  addSchool,
  approveSchool,
  mergeSchool,
  deleteSchool,
  SchoolRecord,
} from '../../lib/supabaseClient';

const FIELD = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-slate-800';

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
    const corrected = window.prompt('Okul adını kontrol edin (gerekirse düzeltin) ve onaylayın:', s.name);
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
    if (!window.confirm(`"${s.name}" silinsin mi? Bu okulu seçen öğretmenlerin okul bilgisi boşalır.`)) return;
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
    <section className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-3">
      <div className="flex items-center gap-2">
        <Building className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-bold text-slate-900">Okullar</h3>
      </div>
      <p className="text-xs text-slate-500">
        Öğretmenler kayıtta il ve ilçeye göre okul seçer. Listede olmayan okullar burada onayınızı bekler.
        Yazım farkıyla tekrar eklenmiş bir okulu mevcut okulla birleştirebilirsiniz.
      </p>

      {/* ONAY BEKLEYEN OKULLAR */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase text-amber-700">Onay bekleyen okullar ({pending.length})</span>
          {pending.map((s) => (
            <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50/60">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-900 block truncate">{s.name}</span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {s.district} / {s.city}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => handleDelete(s)}
                  aria-label={`${s.name} okulunu sil`}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 text-slate-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => openMerge(s)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Birleştir
                </button>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => handleApprove(s)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Onayla
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OKUL EKLE */}
      <form onSubmit={handleAdd} className="space-y-2 pt-1">
        <span className="text-[11px] font-bold uppercase text-slate-500">Okul ekle</span>
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="İl"
            className={FIELD}
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setDistrict('');
            }}
          >
            <option value="">İl seçin</option>
            {Object.keys(TURKEY_CITIES).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select aria-label="İlçe" className={FIELD} value={district} disabled={!city} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">İlçe seçin</option>
            {(TURKEY_CITIES[city] || []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <textarea
          aria-label="Okul adları"
          className={`${FIELD} min-h-20`}
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder={'Okul adı (toplu eklemek için her satıra bir okul yazın)\nÖrn. Atatürk Ortaokulu\nCumhuriyet İlkokulu'}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500">
            {city && district ? `${district} ilçesinde ${districtSchools.length} kayıtlı okul var.` : ''}
          </span>
          <button
            type="submit"
            disabled={busyId === 'add'}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> {busyId === 'add' ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
        {districtSchools.length > 0 && (
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer text-slate-500">Bu ilçedeki okulları göster</summary>
            <ul className="mt-2 divide-y divide-slate-100">
              {districtSchools.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-1.5">
                  <span className="truncate">{s.name}</span>
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => handleDelete(s)}
                    aria-label={`${s.name} okulunu sil`}
                    className="p-1 rounded-md hover:bg-rose-50 hover:text-rose-700 text-slate-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </form>

      {/* BİRLEŞTİRME MODALI */}
      {mergeFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <form onSubmit={handleMerge} className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Okulu birleştir</h3>
            <p className="text-slate-600">
              <strong>{mergeFor.name}</strong> ({mergeFor.district}/{mergeFor.city}) aslında listedeki hangi okul? Bu okulu seçen öğretmenler
              seçtiğiniz okula taşınır ve bu kayıt silinir.
            </p>
            {mergeOptions.length === 0 ? (
              <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                Bu ilçede henüz onaylı okul yok. Birleştirmek yerine okulu onaylayabilirsiniz.
              </p>
            ) : (
              <select aria-label="Hedef okul" className={FIELD} value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}>
                <option value="">Okul seçin</option>
                {mergeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMergeFor(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={!mergeTarget || busyId === mergeFor.id}
                className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold cursor-pointer"
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
