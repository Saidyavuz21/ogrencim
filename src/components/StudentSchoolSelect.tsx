'use client';

import React, { useEffect, useState } from 'react';
import { Search, School } from './icons';
import { listSchools, SchoolRecord, searchSchools } from '../lib/supabaseClient';
import { TURKEY_CITIES } from '../data/portalData';
import styles from './StudentSchoolSelect.module.css';

const STORAGE_KEY = 'tofutr-ogrenci-okul';

/** Bu cihazda daha önce seçilen okul (yoksa null) */
export function loadRememberedSchool(): SchoolRecord | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const s = raw ? (JSON.parse(raw) as SchoolRecord) : null;
    return s && s.id && s.name ? s : null;
  } catch {
    return null;
  }
}

/** Başarılı girişten sonra okulu cihazda hatırlar */
export function rememberSchool(school: SchoolRecord | null) {
  try {
    if (school) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(school));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* gizli sekme vb.: hatırlanmaz, sorun değil */
  }
}

interface StudentSchoolSelectProps {
  value: SchoolRecord | null;
  onChange: (school: SchoolRecord | null) => void;
  disabled?: boolean;
}

/** Öğrenci girişi için okul seçimi: ada göre arama veya il → ilçe → okul */
export function StudentSchoolSelect({ value, onChange, disabled }: StudentSchoolSelectProps) {
  const [mode, setMode] = useState<'search' | 'browse'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SchoolRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [districtSchools, setDistrictSchools] = useState<SchoolRecord[]>([]);

  // Ada göre arama (yazmayı bırakınca)
  useEffect(() => {
    if (mode !== 'search' || query.trim().length < 2) return;
    let alive = true;
    const t = setTimeout(() => {
      setSearching(true);
      searchSchools(query).then((list) => {
        if (!alive) return;
        setResults(list);
        setSearching(false);
      });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [query, mode]);

  // İl + ilçe seçilince okulları getir
  useEffect(() => {
    if (mode !== 'browse' || !city || !district) return;
    let alive = true;
    listSchools(city, district).then((list) => { if (alive) setDistrictSchools(list); });
    return () => { alive = false; };
  }, [mode, city, district]);

  if (value) {
    return (
      <div className={styles.selected}>
        <School size={20} aria-hidden="true" />
        <div>
          <strong>{value.name}</strong>
          <span>{value.district} / {value.city}</span>
        </div>
        <button type="button" className={styles.linkButton} onClick={() => onChange(null)} disabled={disabled}>Değiştir</button>
      </div>
    );
  }

  const shownResults = query.trim().length >= 2 ? results : [];

  return (
    <div className={styles.wrap}>
      <span className={styles.label} id="school-select-label">Okulun</span>
      {mode === 'search' ? (
        <>
          <label className={styles.search}>
            <Search size={18} aria-hidden="true" />
            <span className={styles.srOnly}>Okul adı</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Okul adını yaz"
              autoComplete="off"
              disabled={disabled}
              aria-describedby="school-search-help"
            />
          </label>
          <p id="school-search-help" className={styles.hint}>Aramak için en az 2 harf yaz.</p>
          {searching && <p className={styles.hint}>Aranıyor…</p>}
          {!searching && query.trim().length >= 2 && shownResults.length === 0 && (
            <p className={styles.hint}>Bu adla okul bulunamadı. İl ve ilçeden aramayı dene.</p>
          )}
          {shownResults.length > 0 && (
            <ul className={styles.results} aria-label="Bulunan okullar">
              {shownResults.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => onChange(s)} disabled={disabled}>
                    <strong>{s.name}</strong>
                    <span>{s.district} / {s.city}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={styles.linkButton} onClick={() => setMode('browse')} disabled={disabled}>İl ve ilçeden seç</button>
        </>
      ) : (
        <>
          <div className={styles.row}>
            <label>
              <span className={styles.srOnly}>İl</span>
              <select value={city} onChange={(e) => { setCity(e.target.value); setDistrict(''); setDistrictSchools([]); }} disabled={disabled}>
                <option value="">İl seç</option>
                {Object.keys(TURKEY_CITIES).sort((a, b) => a.localeCompare(b, 'tr')).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <span className={styles.srOnly}>İlçe</span>
              <select value={district} onChange={(e) => { setDistrict(e.target.value); setDistrictSchools([]); }} disabled={disabled || !city}>
                <option value="">İlçe seç</option>
                {(TURKEY_CITIES[city] || []).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          </div>
          {city && district && (
            <label>
              <span className={styles.srOnly}>Okul</span>
              <select
                value=""
                onChange={(e) => { const s = districtSchools.find((x) => x.id === e.target.value); if (s) onChange(s); }}
                disabled={disabled || !districtSchools.length}
              >
                <option value="">{districtSchools.length ? 'Okul seç' : 'Bu ilçede kayıtlı okul yok'}</option>
                {districtSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          )}
          <button type="button" className={styles.linkButton} onClick={() => setMode('search')} disabled={disabled}>Okul adıyla ara</button>
        </>
      )}
    </div>
  );
}
