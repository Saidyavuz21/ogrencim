'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, Eye, Plus, Trash2, UserPlus, Users } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { getTeacherDocumentUrl } from '../../lib/supabaseClient';
import {
  CampusRow, createCampus, deleteCampus, listCampuses, listSchoolClasses, listSchoolTeachers, renameCampus, SchoolClassRow, SchoolTeacher,
  setClassCampus, setSchoolTeacherFlags,
} from '../../lib/schoolData';
import { Modal } from '../files/FilesUi';
import { TeacherStudentsPage } from '../teacher/TeacherStudentsPage';
import { ClassReportPage } from '../reports/ClassReportPage';
import { ClassMembersDialog } from './ClassMembersDialog';
import f from '../files/Files.module.css';
import r from '../reports/Reports.module.css';

type Tab = 'teachers' | 'classes';
const ALL = '__all__';
const NONE = '__none__';

/** Okul yöneticisi: kendi okulunun öğretmenleri, sınıfları ve kampüsleri */
export function SchoolAdminPage({ schoolId, schoolName }: { schoolId: string; schoolName?: string }) {
  const [tab, setTab] = useState<Tab>('teachers');
  return (
    <div className={f.page}>
      <p className={f.muted}>{schoolName ? `${schoolName} · ` : ''}Okul yöneticisi olarak okulunuzdaki öğretmen başvurularını onaylayabilir, öğretmenleri pasife alabilir, bütün sınıfların öğrencilerini ve karnelerini yönetebilirsiniz.</p>
      <div className={f.tabs} role="group" aria-label="Bölüm">
        <button type="button" aria-pressed={tab === 'teachers'} onClick={() => setTab('teachers')}><Users size={18} aria-hidden="true" />Öğretmenler</button>
        <button type="button" aria-pressed={tab === 'classes'} onClick={() => setTab('classes')}><BarChart3 size={18} aria-hidden="true" />Sınıflar ve kampüsler</button>
      </div>
      {tab === 'teachers' ? <TeachersTab schoolId={schoolId} /> : <ClassesTab schoolId={schoolId} />}
    </div>
  );
}

// --------------------------------------------------------
// Öğretmenler
// --------------------------------------------------------
function TeachersTab({ schoolId }: { schoolId: string }) {
  const { confirm } = useDialog();
  const [list, setList] = useState<SchoolTeacher[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listSchoolTeachers(schoolId).then((res) => {
      if (!alive) return;
      if (res.ok) setList(res.data);
      else setError(res.error);
    });
    return () => { alive = false; };
  }, [schoolId]);

  const patch = async (t: SchoolTeacher, change: { approved?: boolean; is_active?: boolean }, text: string) => {
    setBusy(t.id);
    const res = await setSchoolTeacherFlags(t.id, change);
    setBusy(null);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setList((prev) => (prev || []).map((x) => (x.id === t.id ? { ...x, ...change } : x)));
    setNotice({ kind: 'ok', text });
  };

  const openDoc = async (t: SchoolTeacher) => {
    if (!t.verification_doc) return;
    const win = window.open('', '_blank');
    const url = await getTeacherDocumentUrl(t.verification_doc);
    if (!url) { win?.close(); setNotice({ kind: 'error', text: 'Belge açılamadı.' }); return; }
    if (win) win.location.replace(url);
    else window.location.assign(url);
  };

  if (error) return <p className={f.error} role="alert">Öğretmenler alınamadı: {error}</p>;
  if (!list) return <Spinner center label="Öğretmenler yükleniyor…" />;
  const pending = list.filter((t) => !t.approved);
  const approved = list.filter((t) => t.approved);

  const row = (t: SchoolTeacher) => (
    <li key={t.id} className={f.row}>
      <div className={f.info}>
        <p className={f.name}>{t.full_name || t.email || 'Öğretmen'}{t.is_school_admin && <span className={f.shared} style={{ marginLeft: 8 }}>Okul yöneticisi</span>}</p>
        <div className={f.meta}>
          <span>{t.branch || 'Branş belirtilmedi'}</span>
          {t.class_name && <span className={f.dot}>Rehberlik: {t.class_name}</span>}
          {t.email && <span className={f.dot}>{t.email}</span>}
          {t.approved && !t.is_active && <span className={f.tag} style={{ background: '#fbe9ea', color: '#8f2232' }}>Pasif</span>}
        </div>
      </div>
      <div className={f.rowActions}>
        {t.verification_doc && (
          <button type="button" className={f.iconButton} onClick={() => openDoc(t)} aria-label={`${t.full_name} belgesini aç`} title="Belgeyi aç"><Eye size={18} aria-hidden="true" /></button>
        )}
        {t.is_school_admin ? null : !t.approved ? (
          <button type="button" className={f.primaryButton} disabled={busy === t.id} onClick={() => patch(t, { approved: true, is_active: true }, `${t.full_name} onaylandı; artık giriş yapabilir.`)}>
            <Check size={18} aria-hidden="true" />Onayla
          </button>
        ) : t.is_active ? (
          <button
            type="button"
            className={f.dangerButton}
            disabled={busy === t.id}
            onClick={async () => {
              const ok = await confirm({ title: 'Öğretmeni pasife al', message: `${t.full_name} pasife alınsın mı?\nHesabına giriş yapamaz; ödevleri ve verileri silinmez.`, confirmText: 'Pasife al', cancelText: 'Vazgeç', variant: 'warning' });
              if (ok) await patch(t, { is_active: false }, `${t.full_name} pasife alındı.`);
            }}
          >
            Pasife al
          </button>
        ) : (
          <button type="button" className={f.secondaryButton} disabled={busy === t.id} onClick={() => patch(t, { is_active: true }, `${t.full_name} yeniden aktif.`)}>Aktif et</button>
        )}
      </div>
    </li>
  );

  return (
    <section className={f.page} aria-label="Okul öğretmenleri">
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <div className={f.card}>
        <h3 className={f.cardTitle}>Onay bekleyen başvurular ({pending.length})</h3>
        {pending.length === 0 ? <p className={f.muted}>Bekleyen başvuru yok.</p> : <ul className={f.list}>{pending.map(row)}</ul>}
        <p className={f.muted}>Başvuruyu tamamen silmek ya da başka okula taşımak gerekirse süper yöneticiye bildirin.</p>
      </div>
      <div className={f.card}>
        <h3 className={f.cardTitle}>Öğretmenler ({approved.length})</h3>
        {approved.length === 0 ? <p className={f.muted}>Okulunuzda onaylı öğretmen yok.</p> : <ul className={f.list}>{approved.map(row)}</ul>}
      </div>
    </section>
  );
}

// --------------------------------------------------------
// Sınıflar ve kampüsler
// --------------------------------------------------------
function ClassesTab({ schoolId }: { schoolId: string }) {
  const { confirm, prompt } = useDialog();
  const [classes, setClasses] = useState<SchoolClassRow[] | null>(null);
  const [campuses, setCampuses] = useState<CampusRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [campusFilter, setCampusFilter] = useState(ALL);
  const [studentsOf, setStudentsOf] = useState<string | null>(null);
  const [reportOf, setReportOf] = useState<string | null>(null);
  const [membersOf, setMembersOf] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listSchoolClasses(), listCampuses()]).then(([c, k]) => {
      if (!alive) return;
      if (!c.ok) { setError(c.error); return; }
      setClasses(c.data);
      if (k.ok) setCampuses(k.data);
    });
    return () => { alive = false; };
  }, []);

  const classNames = useMemo(() => (classes || []).map((c) => c.class_name), [classes]);
  const campusName = (id: string | null) => campuses.find((c) => c.id === id)?.name;
  const visible = (classes || []).filter((c) => campusFilter === ALL || (campusFilter === NONE ? !c.campus_id : c.campus_id === campusFilter));

  const addCampus = async () => {
    const name = await prompt({ title: 'Yeni kampüs', message: 'Kampüsün ya da binanın adını yazın.', inputLabel: 'Kampüs adı', placeholder: 'Örn. Ortaokul binası', confirmText: 'Ekle', cancelText: 'Vazgeç', variant: 'primary' });
    if (!name?.trim()) return;
    const res = await createCampus(name);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setCampuses((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
  };
  const rename = async (c: CampusRow) => {
    const name = await prompt({ title: 'Kampüsü yeniden adlandır', message: 'Yeni adı yazın.', inputLabel: 'Kampüs adı', defaultValue: c.name, confirmText: 'Kaydet', cancelText: 'Vazgeç', variant: 'primary' });
    if (!name?.trim() || name.trim() === c.name) return;
    const res = await renameCampus(c.id, name);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setCampuses((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: name.trim() } : x)));
  };
  const remove = async (c: CampusRow) => {
    const ok = await confirm({ title: 'Kampüsü sil', message: `"${c.name}" silinsin mi?\nBağlı sınıflar kampüssüz kalır; öğrenciler etkilenmez.`, confirmText: 'Sil', cancelText: 'Vazgeç', variant: 'danger' });
    if (!ok) return;
    const res = await deleteCampus(c.id);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setCampuses((prev) => prev.filter((x) => x.id !== c.id));
    setClasses((prev) => (prev || []).map((x) => (x.campus_id === c.id ? { ...x, campus_id: null } : x)));
    if (campusFilter === c.id) setCampusFilter(ALL);
  };
  const assign = async (cls: SchoolClassRow, value: string) => {
    const campusId = value === NONE ? null : value;
    const res = await setClassCampus(schoolId, cls.class_name, campusId);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setClasses((prev) => (prev || []).map((x) => (x.class_name === cls.class_name ? { ...x, campus_id: campusId } : x)));
  };

  if (error) return <p className={f.error} role="alert">Sınıflar alınamadı: {error}</p>;
  if (!classes) return <Spinner center label="Sınıflar yükleniyor…" />;
  const totals = visible.reduce((a, c) => ({ students: a.students + c.student_count, members: a.members + c.member_count }), { students: 0, members: 0 });

  return (
    <section className={f.page} aria-label="Okul sınıfları">
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <div className={f.card}>
        <div className={f.cardHead} style={{ justifyContent: 'space-between' }}>
          <h3 className={f.cardTitle}>Kampüsler</h3>
          <button type="button" className={f.secondaryButton} onClick={addCampus}><Plus size={18} aria-hidden="true" />Kampüs ekle</button>
        </div>
        {campuses.length === 0 ? <p className={f.muted}>Okulunuz tek yerleşkeyse kampüs eklemenize gerek yok. Birden çok bina ya da kademe varsa kampüs ekleyip sınıfları bağlayabilirsiniz.</p> : (
          <div className={f.folderBar}>
            {campuses.map((c) => (
              <span key={c.id} className={f.folderChip} style={{ cursor: 'default' }}>
                {c.name} <small>{classes.filter((x) => x.campus_id === c.id).length} sınıf</small>
                <button type="button" className={f.linkButton} onClick={() => rename(c)}>Adı</button>
                <button type="button" className={f.linkButton} onClick={() => remove(c)} aria-label={`${c.name} kampüsünü sil`}><Trash2 size={14} aria-hidden="true" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={f.card}>
        <div className={f.cardHead} style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h3 className={f.cardTitle}>Sınıflar ({visible.length}) · {totals.students} öğrenci{totals.members ? ` · ${totals.members} grup üyesi` : ''}</h3>
          {campuses.length > 0 && (
            <span style={{ minWidth: 220 }}>
              <CustomSelect value={campusFilter} onChange={setCampusFilter} options={[{ value: ALL, label: 'Bütün kampüsler' }, { value: NONE, label: 'Kampüssüz' }, ...campuses.map((c) => ({ value: c.id, label: c.name }))]} />
            </span>
          )}
        </div>
        {visible.length === 0 ? <p className={f.muted}>Gösterilecek sınıf yok.</p> : (
          <div className={r.tableWrap}>
            <table className={r.table}>
              <caption className={f.srOnly}>Okulun sınıfları</caption>
              <thead><tr><th scope="col">Sınıf</th><th scope="col" className={r.num}>Öğrenci</th><th scope="col">Öğretmenler</th>{campuses.length > 0 && <th scope="col">Kampüs</th>}<th scope="col"><span className={f.srOnly}>İşlemler</span></th></tr></thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.class_name}>
                    <th scope="row">{c.class_name}</th>
                    <td className={r.num}>{c.student_count}{c.member_count ? ` + ${c.member_count}` : ''}</td>
                    <td style={{ maxWidth: 280 }}><span className={f.muted} style={{ fontSize: 13 }}>{c.teachers.length ? c.teachers.join(', ') : '—'}</span></td>
                    {campuses.length > 0 && (
                      <td style={{ minWidth: 180 }}>
                        <CustomSelect value={c.campus_id || NONE} onChange={(v) => assign(c, v)} options={[{ value: NONE, label: 'Kampüssüz' }, ...campuses.map((k) => ({ value: k.id, label: k.name }))]} />
                        <span className={f.srOnly}>{campusName(c.campus_id) || 'Kampüssüz'}</span>
                      </td>
                    )}
                    <td>
                      <span className={f.cardActions} style={{ flexWrap: 'nowrap' }}>
                        <button type="button" className={f.secondaryButton} onClick={() => setStudentsOf(c.class_name)}><Users size={16} aria-hidden="true" />Öğrenciler</button>
                        <button type="button" className={f.secondaryButton} onClick={() => setReportOf(c.class_name)}><BarChart3 size={16} aria-hidden="true" />Karne</button>
                        <button type="button" className={f.iconButton} onClick={() => setMembersOf(c.class_name)} aria-label={`${c.class_name} grup üyeleri`} title="Grup üyeleri ve kod"><UserPlus size={16} aria-hidden="true" /></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={f.muted}>Öğrenci sütunu: ana şubesi bu sınıf olanlar + başka şubeden katılan grup üyeleri.</p>
      </div>

      {studentsOf && (
        <Modal title={studentsOf} kicker="Öğrenciler" onClose={() => setStudentsOf(null)} wide>
          <TeacherStudentsPage selectedClass={studentsOf} classNames={classNames} onOpenClasses={() => setStudentsOf(null)} />
        </Modal>
      )}
      {reportOf && (
        <Modal title={reportOf} kicker="Sınıf karnesi" onClose={() => setReportOf(null)} wide>
          <ClassReportPage selectedClass={reportOf} />
        </Modal>
      )}
      {membersOf && <ClassMembersDialog className={membersOf} onClose={() => setMembersOf(null)} />}
    </section>
  );
}
