'use client';

import React, { useMemo, useState } from 'react';
import styles from './AdminManagement.module.css';
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from '../icons';
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

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

/** Onaylı okullar: arama, il filtresi, okul başına öğretmen/öğrenci sayısı, toplu ekleme, silme */
export function AdminSchoolsPage({ data, notify, startWithForm = false }: Props) {
  const { confirm } = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(startWithForm);
  const [mode, setMode] = useState<AddMode>('district');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [names, setNames] = useState('');
  const [pasted, setPasted] = useState('');

  const approved = useMemo(() => data.schools.filter((s) => s.status === 'approved'), [data.schools]);
  const cities = useMemo(() => [...new Set(approved.map((s) => s.city))].sort((a, b) => a.localeCompare(b, 'tr')), [approved]);

  const availableDistricts = useMemo(() => {
    const pool = cityFilter ? approved.filter((s) => s.city === cityFilter) : approved;
    const set = new Set(pool.map((s) => s.district).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [approved, cityFilter]);

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

  const filtered = useMemo(() => {
    return approved.filter((s) => {
      if (cityFilter && s.city !== cityFilter) return false;
      if (districtFilter && s.district !== districtFilter) return false;
      if (query && !matchesQuery(query, s.name, s.city, s.district)) return false;

      if (typeFilter) {
        const n = norm(s.name);
        if (typeFilter === 'ilkokul' && !n.includes('ilkokul')) return false;
        if (typeFilter === 'ortaokul' && !n.includes('ortaokul')) return false;
        if (typeFilter === 'lise' && !n.includes('lise')) return false;
        if (typeFilter === 'anaokulu' && !n.includes('anaokul')) return false;
        if (typeFilter === 'imam-hatip' && !n.includes('imam hatip')) return false;
      }

      if (activityFilter) {
        const c = counts[s.id] || { teachers: 0, students: 0 };
        if (activityFilter === 'has_teacher' && c.teachers === 0) return false;
        if (activityFilter === 'no_teacher' && c.teachers > 0) return false;
        if (activityFilter === 'has_student' && c.students === 0) return false;
      }

      return true;
    });
  }, [approved, cityFilter, districtFilter, query, typeFilter, activityFilter, counts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginatedSchools = filtered.slice(startIndex, endIndex);

  const handleQueryChange = (val: string) => { setQuery(val); setPage(1); };
  const handleCityChange = (val: string) => { setCityFilter(val); setDistrictFilter(''); setPage(1); };
  const handleDistrictChange = (val: string) => { setDistrictFilter(val); setPage(1); };
  const handleTypeChange = (val: string) => { setTypeFilter(val); setPage(1); };
  const handleActivityChange = (val: string) => { setActivityFilter(val); setPage(1); };
  const handlePageSizeChange = (val: number) => { setPageSize(val); setPage(1); };

  const hasActiveFilters = Boolean(query || cityFilter || districtFilter || typeFilter || activityFilter);
  const handleClearFilters = () => {
    setQuery('');
    setCityFilter('');
    setDistrictFilter('');
    setTypeFilter('');
    setActivityFilter('');
    setPage(1);
  };

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
          <SearchInput id="school-search" value={query} onChange={handleQueryChange} placeholder="Okul, il veya ilçe ara" />
          {cities.length > 1 && (
            <div className={styles.filterSelect}>
              <CustomSelect
                value={cityFilter}
                onChange={handleCityChange}
                options={[{ value: '', label: 'Bütün iller' }, ...cities.map((c) => ({ value: c, label: c }))]}
                placeholder="İl"
              />
            </div>
          )}
          {availableDistricts.length > 0 && (
            <div className={styles.filterSelect}>
              <CustomSelect
                value={districtFilter}
                onChange={handleDistrictChange}
                options={[{ value: '', label: 'Bütün ilçeler' }, ...availableDistricts.map((d) => ({ value: d, label: d }))]}
                placeholder="İlçe"
              />
            </div>
          )}
          <div className={styles.filterSelect}>
            <CustomSelect
              value={typeFilter}
              onChange={handleTypeChange}
              options={[
                { value: '', label: 'Bütün kademeler' },
                { value: 'ilkokul', label: 'İlkokul' },
                { value: 'ortaokul', label: 'Ortaokul' },
                { value: 'lise', label: 'Lise' },
                { value: 'anaokulu', label: 'Anaokulu' },
                { value: 'imam-hatip', label: 'İmam Hatip' },
              ]}
              placeholder="Kademe"
            />
          </div>
          <div className={styles.filterSelect}>
            <CustomSelect
              value={activityFilter}
              onChange={handleActivityChange}
              options={[
                { value: '', label: 'Kullanım: Tümü' },
                { value: 'has_teacher', label: 'Öğretmeni olanlar' },
                { value: 'no_teacher', label: 'Öğretmeni olmayanlar' },
                { value: 'has_student', label: 'Öğrencisi olanlar' },
              ]}
              placeholder="Durum"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.clearFilterButton}
              onClick={handleClearFilters}
              title="Tüm filtreleri sıfırla"
            >
              <X size={15} aria-hidden="true" /> Temizle
            </button>
          )}
        </FilterBar>

        {data.loading && <EmptyState>Okullar yükleniyor…</EmptyState>}
        {!data.loading && approved.length === 0 && <EmptyState>Henüz onaylı okul yok. Yukarıdan okul ekleyin.</EmptyState>}
        {!data.loading && approved.length > 0 && filtered.length === 0 && <EmptyState>Aramanıza uyan okul yok.</EmptyState>}

        {filtered.length > 0 && (
          <>
            <ul className={styles.list}>
              {paginatedSchools.map((s) => {
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

            {filtered.length > 10 && (
              <nav className={styles.pagination} aria-label="Okul listesi sayfalama">
                <div className={styles.paginationInfo}>
                  {filtered.length === approved.length ? (
                    <span>Toplam <strong>{approved.length}</strong> okuldan <strong>{startIndex + 1}–{endIndex}</strong> arası gösteriliyor</span>
                  ) : (
                    <span>Filtrelenen <strong>{filtered.length}</strong> okuldan <strong>{startIndex + 1}–{endIndex}</strong> arası gösteriliyor (Toplam {approved.length} okul)</span>
                  )}
                </div>

                <div className={styles.paginationControls}>
                  <div className={styles.pageSizeSelector}>
                    <label htmlFor="school-page-size">Sayfa başı:</label>
                    <CustomSelect id="school-page-size" className={styles.pageSizeSelect} value={String(pageSize)} onChange={(value) => handlePageSizeChange(Number(value))} options={[{ value: '10', label: '10' }, { value: '20', label: '20' }, { value: '50', label: '50' }]} />
                  </div>

                  <button
                    type="button"
                    className={styles.pageButton}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Önceki sayfa"
                    title="Önceki sayfa"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>

                  {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots-${idx}`} className={styles.pageDots}>…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={`${styles.pageButton} ${p === currentPage ? styles.pageButtonActive : ''}`}
                        onClick={() => setPage(p)}
                        aria-current={p === currentPage ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    className={styles.pageButton}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Sonraki sayfa"
                    title="Sonraki sayfa"
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
