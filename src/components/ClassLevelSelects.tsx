'use client';

import React from 'react';
import { CLASS_LEVEL_GROUPS, CLASS_SECTIONS, classLevelLabel } from '../data/portalData';

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

  const levelControl = (
    <select
      id={levelId}
      className={selectClassName}
      value={level}
      disabled={disabled}
      onChange={(e) => onChange({ level: e.target.value, section: e.target.value ? section || 'A' : '' })}
    >
      {(allowEmpty || !level) && <option value="">{emptyLabel}</option>}
      {CLASS_LEVEL_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.levels.map((lv) => (
            <option key={lv} value={lv}>
              {classLevelLabel(lv)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  const sectionControl = (
    <select
      id={sectionId}
      className={selectClassName}
      value={section}
      disabled={disabled || !level}
      onChange={(e) => onChange({ level, section: e.target.value })}
    >
      {!level && <option value="">—</option>}
      {level &&
        CLASS_SECTIONS.map((s) => (
          <option key={s} value={s}>
            {s} şubesi
          </option>
        ))}
    </select>
  );

  const wrap =
    renderField ??
    (({ id, label, control }) => (
      <label htmlFor={id} className="block">
        <span className="font-semibold text-slate-700 block mb-1">{label}</span>
        {control}
      </label>
    ));

  return (
    <>
      {wrap({ id: levelId, label: 'Sınıf seviyesi', control: levelControl })}
      {wrap({ id: sectionId, label: 'Şube', control: sectionControl })}
    </>
  );
};
