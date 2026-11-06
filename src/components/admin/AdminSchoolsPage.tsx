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
  /** Okul başvuruları sayfasındaki "Okul ekle" ile gelindiyse form açık başlar */
  startWithForm?: boolean;
}

type AddMode = 'district' | 'paste';

interface ParsedRow {
  line: number;
  city: string;
  district: string;
  name: string;
  status: 'ok' | 'exists' | 'error';
  reason?: string;
}

const norm = (v: string) => v.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
const schoolKey = (city: string, district: string, name: string) => `${norm(city)}|${norm(district)}|${norm(name)}`;

/**
 * Excel'den yapıştırılan "İl, İlçe, Okul adı" satırlarını çözer.
 * Ayırıcı: sekme (Excel), noktalı virgül veya virgül. İl/ilçe adları listeyle karşılaştırılır.
 */
function parsePastedSchools(text: string, existing: Set<string>): ParsedRow[] {
  const cityByNorm = new Map(Object.keys(TURKEY_CITIES).map((c) => [norm(c), c]));
  const seen = new Set<string>();
  const rows: ParsedRow[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    const parts = line.split(sep).map((x) => x.trim()).filter(Boolean);
    // Başlık satırı ("İl, İlçe, Okul adı") sessizce atlanır
    if (rows.length === 0 && parts[0] && norm(parts[0]) === 'il') return;
    const name = parts.slice(2).join(sep === '\t' ? ' ' : `${sep} `).replace(/\s+/g, ' ');
    const base = { line: i + 1, city: parts[0] || '', district: parts[1] || '', name };
    if (parts.length < 3) {
      rows.push({ ...base, status: 'error', reason: 'İl, ilçe ve okul adı gerekli' });
      return;
    }
    const city = cityByNorm.get(norm(parts[0]));
    if (!city) {
      rows.push({ ...base, status: 'error', reason: `"${parts[0]}" ili bulunamadı` });
      return;
    }
    const district = (TURKEY_CITIES[city] || []).find((d) => norm(d) === norm(parts[1]));
    if (!district) {
      rows.push({ ...base, city, status: 'error', reason: `"${parts[1]}" ilçesi ${city} ilinde yok` });
      return;
    }
    if (name.length < 3) {
      rows.push({ ...base, city, district, status: 'error', reason: 'Okul adı çok kısa' });
      return;
    }
    const key = schoolKey(city, district, name);
    if (existing.has(key) || seen.has(key)) {
      rows.push({ ...base, city, district, status: 'exists', reason: existing.has(key) ? 'Zaten kayıtlı' : 'Listede iki kez var' });
      return;
    }
    seen.add(key);
    rows.push({ ...base, city, district, status: 'ok' });
  });
  return rows;
}

const PASTE_PLACEHOLDER = [
  "Excel'de İl, İlçe ve Okul adı sütunlarını seçip kopyalayın, buraya yapıştırın.",
  'Ya da elle yazın:',
  'Ankara; Çankaya; Atatürk Ortaokulu',
  'İzmir; Bornova; Cumhuriyet İlkokulu',
].join('\n');

/** Onaylı okullar: arama, il filtresi, okul başına öğretmen/öğrenci sayısı, toplu ekleme, silme */
export function AdminSchoolsPage({ data, notify, startWithForm = false }: Props) {
  const { confirm } = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const [formOpen, setFormOpen] = useState(startWithForm);
  const [mode, setMode] = useState<AddMode>('district');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [names, setNames] = useState('');
  const [pasted, setPasted] = useState('');

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

  // Kayıtlı (onaylı + bekleyen) okullar: aynı okul ikinci kez eklenmez
  const existingKeys = useMemo(
    () => new Set(data.schools.map((s) => schoolKey(s.city, s.district, s.name))),
    [data.schools]
  );
  const parsed = useMemo(() => (mode === 'paste' ? parsePastedSchools(pasted, existingKeys) : []), [mode, pasted, existingKeys]);
  const parsedOk = parsed.filter((r) => r.status === 'ok');
  const parsedSkipped = parsed.filter((r) => r.status !== 'ok');
  const existsCount = parsed.filter((r) => r.status === 'exists').length;
  const errorCount = parsed.filter((r) => r.status === 'error').length;

  /** Okulları sırayla ekler ve sonucu bildirir; hepsi eklendiyse true */
  const addAll = async (items: { name: string; city: string; district: string }[], skipped: number) => {
    setBusyId('add');
    let added = 0;
    const failed: string[] = [];
    for (const item of items) {
      const res = await addSchool(item.name, item.city, item.district);
      if (res.ok) added++;
      else failed.push(item.name);
    }
    setBusyId(null);
    const skippedNote = skipped ? ` ${skipped} satır atlandı.` : '';
    if (failed.length) notify('error', `${added} okul eklendi; eklenemeyenler: ${failed.join(', ')}.${skippedNote}`);
    else notify('ok', `${added} okul eklendi.${skippedNote}`);
    data.refresh();
    return failed.length === 0;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'paste') {
      if (!parsedOk.length) return notify('error', 'Eklenecek geçerli satır yok. Her satır: İl, İlçe, Okul adı.');
      if (await addAll(parsedOk, parsedSkipped.length)) setPasted('');
      return;
    }
    if (!city || !district) return notify('error', 'Lütfen il ve ilçe seçiniz.');
    const list = [...new Set(names.split('\n').map((n) => n.trim().replace(/\s+/g, ' ')).filter((n) => n.length >= 3))];
    if (list.length === 0) return notify('error', 'Lütfen en az bir okul adı yazınız (en az 3 karakter).');
    const fresh = list.filter((n) => !existingKeys.has(schoolKey(city, district, n)));
    if (!fresh.length) return notify('error', 'Yazdığınız okulların hepsi bu ilçede zaten kayıtlı.');
    if (await addAll(fresh.map((name) => ({ name, city, district })), list.length - fresh.length)) setNames('');
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
        <p className={styles.muted}>
          Öğretmenler kayıtta il ve ilçeye göre bu listeden okul seçer. Bir ilçeye toplu ekleyebilir ya da farklı il ve ilçelerdeki
          okulları Excel&apos;den yapıştırabilirsiniz. Kayıtlı okullar tekrar eklenmez.
        </p>
        {formOpen && (
          <form id="add-school-form" onSubmit={handleAdd} className={styles.formStack}>
            <div className={styles.segmented} role="group" aria-label="Ekleme yöntemi">
              <button type="button" aria-pressed={mode === 'district'} onClick={() => setMode('district')}>Bir ilçeye ekle</button>
              <button type="button" aria-pressed={mode === 'paste'} onClick={() => setMode('paste')}>Excel&apos;den yapıştır</button>
            </div>

            {mode === 'district' ? (
              <>
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
                  <span className={styles.fieldLabel}>Okul adları (her satıra bir okul)</span>
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
              </>
            ) : (
              <>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>İl, ilçe ve okul adı (her satıra bir okul)</span>
                  <textarea
                    className={`${styles.textarea} ${styles.pasteArea}`}
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    spellCheck={false}
                    placeholder={PASTE_PLACEHOLDER}
                  />
                </label>
                {parsed.length > 0 && (
                  <div className={styles.parseSummary} aria-live="polite">
                    <span className={styles.activeBadge}>{parsedOk.length} okul eklenecek</span>
                    {existsCount > 0 && <span className={styles.badge}>{existsCount} zaten kayıtlı</span>}
                    {errorCount > 0 && <span className={styles.errorBadge}>{errorCount} hatalı satır</span>}
                  </div>
                )}
                {parsedSkipped.length > 0 && (
                  <ul className={styles.parseIssues}>
                    {parsedSkipped.slice(0, 8).map((r) => (
                      <li key={r.line}><strong>{r.line}. satır:</strong> {r.reason}{r.name ? ` · ${r.name}` : ''}</li>
                    ))}
                    {parsedSkipped.length > 8 && <li>… ve {parsedSkipped.length - 8} satır daha</li>}
                  </ul>
                )}
                <div className={styles.between}>
                  <span className={styles.muted}>Ayırıcı: sekme (Excel), noktalı virgül veya virgül. Başlık satırı atlanır.</span>
                  <button type="submit" disabled={busyId === 'add' || !parsedOk.length} className={styles.primary}>
                    <Plus className={styles.icon} /> {busyId === 'add' ? 'Ekleniyor…' : `${parsedOk.length} okulu ekle`}
                  </button>
                </div>
              </>
            )}
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
