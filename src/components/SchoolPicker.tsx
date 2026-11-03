'use client';

import React, { useEffect, useState } from 'react';
import { listSchools, SchoolRecord } from '../lib/supabaseClient';

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
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!city || !district) {
      setSchools([]);
      return;
    }
    setIsLoading(true);
    listSchools(city, district).then((list) => {
      if (cancelled) return;
      setSchools(list);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [city, district]);

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

  const selectControl = (
    <select
      id={selectId}
      className={selectClassName}
      value={schoolId}
      disabled={disabled || !district || isLoading}
      onChange={(e) => onChange({ schoolId: e.target.value, newSchoolName: e.target.value === NEW_SCHOOL ? newSchoolName : '' })}
    >
      <option value="">{placeholder}</option>
      {showCurrentFallback && <option value={schoolId}>{currentSchoolName} (mevcut)</option>}
      {schools.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
      {allowNew && district && !isLoading && <option value={NEW_SCHOOL}>➕ Okulum listede yok</option>}
    </select>
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
    <>
      {wrap({ id: selectId, label: 'Okul', control: selectControl })}
      {allowNew &&
        schoolId === NEW_SCHOOL &&
        wrap({
          id: inputId,
          label: 'Okulunuzun tam adı',
          control: newSchoolControl,
          hint: 'Okulunuz okul yönetimi onayladıktan sonra listeye eklenir.',
        })}
    </>
  );
};
