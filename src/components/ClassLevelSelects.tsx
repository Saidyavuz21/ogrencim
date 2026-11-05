'use client';

import React from 'react';
import { CLASS_LEVEL_GROUPS, CLASS_SECTIONS, classLevelLabel } from '../data/portalData';
import { CustomSelect } from './CustomSelect';

interface ClassLevelSelectsProps {
  idPrefix: string;
  level: string;
  section: string;
  onChange: (next: { level: string; section: string }) => void;
  /** Seviye seçilmemesine izin verilsin mi (örn. öğretmenin rehberlik sınıfı yoksa) */
  allowEmpty?: boolean;
  emptyLabel?: string;
  /** Her bir <select> için CSS sınıfı (Tailwind veya CSS modülü) */
  selectClassName?: string;
  /** Etiket + select sarmalayıcısı; verilmezse basit <label> kullanılır */
  renderField?: (args: { id: string; label: string; control: React.ReactNode }) => React.ReactNode;
  disabled?: boolean;
}

/**
 * Sınıf seviyesi (Anaokulu → 12. sınıf, kademelere göre gruplu) + şube (A–L) seçicisi.
 * Değer '3-A', 'Anasınıfı-B' biçiminde saklanır (bkz. composeClassName / parseClassName).
 */
export const ClassLevelSelects: React.FC<ClassLevelSelectsProps> = ({
  idPrefix,
  level,
  section,
  onChange,
  allowEmpty = false,
  emptyLabel = 'Seçiniz',
  selectClassName,
  renderField,
  disabled,
}) => {
  const levelId = `${idPrefix}-level`;
  const sectionId = `${idPrefix}-section`;

  const levelOptions = [
    ...(allowEmpty || !level ? [{ value: '', label: emptyLabel }] : []),
    ...CLASS_LEVEL_GROUPS.flatMap((group) =>
      group.levels.map((lv) => ({
        value: lv,
        label: classLevelLabel(lv),
        badge: group.label,
      }))
    ),
  ];

  const levelControl = (
    <CustomSelect
      id={levelId}
      className={selectClassName}
      value={level}
      disabled={disabled}
      onChange={(val) => onChange({ level: val, section: val ? section || 'A' : '' })}
      options={levelOptions}
      placeholder={emptyLabel}
    />
  );

  const sectionOptions = level
    ? CLASS_SECTIONS.map((s) => ({ value: s, label: `${s} şubesi` }))
    : [{ value: '', label: '—' }];

  const sectionControl = (
    <CustomSelect
      id={sectionId}
      className={selectClassName}
      value={section}
      disabled={disabled || !level}
      onChange={(val) => onChange({ level, section: val })}
      options={sectionOptions}
      placeholder="Şube seçin"
    />
  );

  const wrap =
    renderField ??
    (({ id, label, control }) => (
      <div className="block">
        <label htmlFor={id} className="font-semibold text-slate-700 block mb-1">{label}</label>
        {control}
      </div>
    ));

  return (
    <>
      {wrap({ id: levelId, label: 'Sınıf seviyesi', control: levelControl })}
      {wrap({ id: sectionId, label: 'Şube', control: sectionControl })}
    </>
  );
};
