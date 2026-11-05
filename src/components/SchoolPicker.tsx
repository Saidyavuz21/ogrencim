'use client';

import React, { useEffect, useState } from 'react';
import { listSchools, SchoolRecord } from '../lib/supabaseClient';
import { CustomSelect } from './CustomSelect';

/** Listede olmayan okul için seçicide kullanılan özel değer */
export const NEW_SCHOOL = '__yeni__';

interface SchoolPickerProps {
  idPrefix: string;
  city: string;
  district: string;
  /** Seçili okul id'si, NEW_SCHOOL veya '' */
  schoolId: string;
  newSchoolName: string;
  onChange: (next: { schoolId: string; newSchoolName: string }) => void;
  /** "Okulum listede yok" seçeneği gösterilsin mi (kayıt ekranı: evet, admin: hayır) */
  allowNew?: boolean;
  /** Seçili okul listede yoksa (örn. onay bekleyen okul) yine de gösterilecek ad */
  currentSchoolName?: string | null;
  selectClassName?: string;
  inputClassName?: string;
  renderField?: (args: { id: string; label: string; control: React.ReactNode; hint?: string }) => React.ReactNode;
  disabled?: boolean;
}

/** İl ve ilçeye göre onaylı okulları listeler; gerekirse "Okulum listede yok" ile yeni ad alır. */
export const SchoolPicker: React.FC<SchoolPickerProps> = ({
  idPrefix,
  city,
  district,
  schoolId,
  newSchoolName,
  onChange,
  allowNew = false,
  currentSchoolName,
  selectClassName,
  inputClassName,
  renderField,
  disabled,
}) => {
  // Seçili il/ilçe için gelen liste; anahtar değişince yükleniyor sayılır
  const key = city && district ? `${city}|${district}` : '';
  const [result, setResult] = useState<{ key: string; list: SchoolRecord[] }>({ key: '', list: [] });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    listSchools(city, district).then((list) => {
      if (!cancelled) setResult({ key, list });
    });
    return () => {
      cancelled = true;
    };
  }, [key, city, district]);

  const schools = key && result.key === key ? result.list : [];
  const isLoading = !!key && result.key !== key;

  const selectId = `${idPrefix}-school`;
  const inputId = `${idPrefix}-new-school`;
  const showCurrentFallback = !!schoolId && schoolId !== NEW_SCHOOL && !schools.some((s) => s.id === schoolId) && !!currentSchoolName;

  const wrap =
    renderField ??
    (({ id, label, control, hint }) => (
      <label htmlFor={id} className="block">
        <span className="font-semibold text-slate-700 block mb-1">{label}</span>
        {control}
        {hint && <span className="text-[11px] text-slate-500 block mt-1">{hint}</span>}
      </label>
    ));

  const placeholder = !district
    ? 'Önce il ve ilçe seçin'
    : isLoading
      ? 'Okullar yükleniyor…'
      : schools.length === 0
        ? allowNew
          ? 'Bu ilçede kayıtlı okul yok'
          : 'Bu ilçede okul yok'
        : 'Okulunuzu seçin';

  const selectOptions = [
    ...(showCurrentFallback ? [{ value: schoolId, label: `${currentSchoolName} (mevcut)` }] : []),
    ...schools.map((s) => ({ value: s.id, label: s.name })),
    ...(allowNew && district && !isLoading ? [{ value: NEW_SCHOOL, label: '➕ Okulum listede yok' }] : []),
  ];

  const selectControl = (
    <CustomSelect
      id={selectId}
      className={selectClassName}
      value={schoolId}
      disabled={disabled || !district || isLoading}
      onChange={(val) => onChange({ schoolId: val, newSchoolName: val === NEW_SCHOOL ? newSchoolName : '' })}
      options={selectOptions}
      placeholder={placeholder}
    />
  );

  const newSchoolControl = (
    <input
      id={inputId}
      className={inputClassName}
      value={newSchoolName}
      maxLength={160}
      placeholder="Örn. Atatürk Ortaokulu"
      disabled={disabled}
      onChange={(e) => onChange({ schoolId: NEW_SCHOOL, newSchoolName: e.target.value })}
    />
  );

  return (
    <div className="space-y-3">
      {wrap({
        id: selectId,
        label: 'Okul',
        control: selectControl,
        hint:
          allowNew && district
            ? 'Okulunuz listede yoksa en alttaki seçeneği tıklayıp adını yazabilirsiniz.'
            : undefined,
      })}

      {schoolId === NEW_SCHOOL &&
        wrap({
          id: inputId,
          label: 'Yeni okul adı',
          control: newSchoolControl,
          hint: 'Yönetici onaylayana kadar bu adla işlem yapılır.',
        })}
    </div>
  );
};
