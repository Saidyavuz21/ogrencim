// ========================================================
// ÖĞRENCİ & VELİ BİLGİ PORTALI - SUPABASE CANLI VERİ SERVİSİ
// ========================================================
// Tüm istekler giriş yapan kullanıcının oturumu (JWT) ile gider; yetki kontrolü
// veritabanındaki RLS politikalarında yapılır (supabase/migrations/*_auth_and_rls.sql).

import { createClient } from '@supabase/supabase-js';
import type { UserAccount } from '../data/portalData';

// Publishable (anon) anahtar herkese açık olacak şekilde tasarlanmıştır; güvenlik RLS ile sağlanır.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pvxkyazarymowhbbhzgo.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_w6U3bU8s6f9mwwdCvG1gfA_Xx805Utm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export interface StudentRecord {
  id: string;
  student_number: string;
  name: string;
  avatar: string;
  class_name: string;
  points: number;
  plus_count: number;
  minus_count: number;
}

export interface ProfileRecord {
  id: string;
  role: 'admin' | 'ogretmen';
  full_name: string;
  email: string | null;
  branch: string | null;
  city: string | null;
  district: string | null;
  school_id: string | null;
  school_name: string | null;
  class_name: string | null;
  approved: boolean;
  is_active: boolean;
  /** teacher-documents bucket'ındaki doğrulama belgesinin yolu */
  verification_doc: string | null;
  created_at: string;
  /** Okul yöneticisi (müdür / müdür yardımcısı): yalnızca süper admin verir */
  is_school_admin?: boolean;
}

export interface SchoolRecord {
  id: string;
  name: string;
  city: string;
  district: string;
  status: 'approved' | 'pending';
}

interface StudentSessionInfo {
  id: string;
  student_number: string;
  name: string;
  class_name: string | null;
  avatar: string | null;
}

// ========================================================
// 0. KİMLİK DOĞRULAMA
// ========================================================
export type AuthResult = { ok: true; user: UserAccount } | { ok: false; error: string };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '??';

function profileToAccount(p: ProfileRecord): UserAccount {
  return {
    id: p.id,
    role: p.role,
    name: p.full_name || p.email || 'Kullanıcı',
    emailOrPhone: p.email || '',
    branch: p.branch || undefined,
    city: p.city || undefined,
    district: p.district || undefined,
    schoolName: p.school_name || undefined,
    className: p.class_name || undefined,
    schoolId: p.school_id || undefined,
    isSchoolAdmin: p.role === 'ogretmen' && !!p.is_school_admin && !!p.school_id,
    avatar: initials(p.full_name || p.email || '?'),
    title:
      p.role === 'admin'
        ? 'Süper Admin & Sistem Yöneticisi'
        : `${p.branch || 'Branş'} Öğretmeni${p.school_name ? ` (${p.school_name})` : ''}`,
  };
}

function studentToAccount(s: StudentSessionInfo): UserAccount {
  return {
    id: s.id,
    role: 'ogrenci',
    name: s.name,
    emailOrPhone: '',
    studentNo: s.student_number,
    studentName: s.name,
    className: s.class_name || undefined,
    avatar: initials(s.name),
    title: `Öğrenci${s.class_name ? ` • ${s.class_name}` : ''}`,
  };
}

async function loadStaffAccount(userId: string): Promise<AuthResult> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) {
    return { ok: false, error: 'Hesap profiliniz bulunamadı. Lütfen okul yönetimiyle iletişime geçiniz.' };
  }
  const profile = data as ProfileRecord;
  if (!profile.approved) {
    return {
      ok: false,
      error: 'Hesabınız henüz okul yönetimi tarafından onaylanmadı. Onaylandıktan sonra giriş yapabilirsiniz.',
    };
  }
  if (profile.is_active === false) {
    return { ok: false, error: 'Hesabınız okul yönetimi tarafından pasif duruma alındı. Lütfen okul yönetimiyle iletişime geçiniz.' };
  }
  return { ok: true, user: profileToAccount(profile) };
}

/**
 * Sayfa yenilendiğinde / tarayıcı yeniden açıldığında mevcut oturumu geri yükler.
 * Oturum yoksa null döner. Oturum yalnızca kesin olarak geçersizse (öğrenci oturumu sona ermiş,
 * hesap silinmiş / onaysız / pasif) kapatılır; geçici ağ hatalarında oturum korunur ve hata fırlatılır.
 */
export async function restoreSession(): Promise<UserAccount | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  if (session.user.is_anonymous) {
    const { data: student, error } = await supabase.rpc('my_student');
    if (error) throw new Error(error.message);
    if (student) return studentToAccount(student as StudentSessionInfo);
    await supabase.auth.signOut();
    return null;
  }

  const { data: profile, error } = await supabase.from('profiles').select('id').eq('id', session.user.id).maybeSingle();
  if (error) throw new Error(error.message);
  const res = profile ? await loadStaffAccount(session.user.id) : null;
  if (res?.ok) return res.user;
  await supabase.auth.signOut();
  return null;
}

/** Öğretmen / Admin girişi (e-posta + şifre) */
export async function signInStaff(email: string, password: string, expectedRole: 'admin' | 'ogretmen', captchaToken?: string): Promise<AuthResult> {
  // Önceki (ör. anonim öğrenci) oturumu kapat
  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password, options: { captchaToken } });
  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes('captcha')) return { ok: false, error: CAPTCHA_ERROR };
    if (error?.message?.toLowerCase().includes('email not confirmed')) {
      return { ok: false, error: 'E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzdaki onay bağlantısına tıklayınız.' };
    }
    return { ok: false, error: 'E-posta veya şifre hatalı.' };
  }

  const res = await loadStaffAccount(data.user.id);
  if (!res.ok) {
    await supabase.auth.signOut();
    return res;
  }
  if (expectedRole === 'admin' && res.user.role !== 'admin') {
    await supabase.auth.signOut();
    return { ok: false, error: 'Bu hesabın yönetici yetkisi yok. Öğretmenler ana giriş sayfasından giriş yapar.' };
  }
  if (expectedRole === 'ogretmen' && res.user.role === 'admin') {
    await supabase.auth.signOut();
    return { ok: false, error: 'Yönetici hesapları bu sayfadan değil, yönetim giriş sayfasından giriş yapar.' };
  }
  return res;
}

/** Öğretmen kaydı. Hesap admin onayından sonra aktifleşir. */
export async function signUpTeacher(input: {
  email: string;
  password: string;
  name: string;
  branch: string;
  city: string;
  district: string;
  /** Listeden seçilen onaylı okul */
  schoolId?: string;
  /** "Okulum listede yok" ile yazılan okul adı (onay bekleyen okul olarak eklenir) */
  newSchoolName?: string;
  className: string;
  /** Öğretmenliği gösteren belge (PDF / JPG / PNG) */
  document: File;
  /** CAPTCHA jetonu (Supabase'de CAPTCHA açıksa zorunlu) */
  captchaToken?: string;
}): Promise<{ ok: boolean; error?: string; docWarning?: string }> {
  const docError = teacherDocumentError(input.document);
  if (docError) return { ok: false, error: docError };

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      captchaToken: input.captchaToken,
      data: {
        name: input.name.trim(),
        branch: input.branch,
        city: input.city,
        district: input.district,
        school_id: input.schoolId || null,
        new_school_name: input.schoolId ? null : input.newSchoolName?.trim() || null,
        class_name: input.className,
      },
    },
  });
  if (error) {
    await supabase.auth.signOut();
    if (error.message.toLowerCase().includes('captcha')) return { ok: false, error: CAPTCHA_ERROR };
    if (error.message.toLowerCase().includes('already registered')) {
      return { ok: false, error: 'Bu e-posta adresiyle zaten bir hesap var.' };
    }
    return { ok: false, error: `Kayıt yapılamadı: ${error.message}` };
  }

  // Belge, kayıtla açılan oturumla öğretmenin kendi klasörüne yüklenir
  let docWarning: string | undefined;
  const userId = data.user?.id;
  if (!data.session || !userId) {
    docWarning = 'Belgeniz yüklenemedi (oturum açılamadı). Lütfen belgenizi okul yönetimine ayrıca iletiniz.';
  } else {
    const ext = input.document.type === 'application/pdf' ? 'pdf' : input.document.type === 'image/png' ? 'png' : 'jpg';
    const path = `${userId}/ogretmen-belgesi-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(TEACHER_DOC_BUCKET)
      .upload(path, input.document, { contentType: input.document.type, upsert: false });
    const { data: saved } = upErr ? { data: false } : await supabase.rpc('set_my_verification_doc', { p_path: path });
    if (upErr || !saved) {
      docWarning = 'Hesabınız oluşturuldu ancak belgeniz yüklenemedi. Lütfen belgenizi okul yönetimine ayrıca iletiniz.';
    }
  }
  // Kayıt sonrası oluşan oturumu kapat: admin onayı beklenir
  await supabase.auth.signOut();
  return { ok: true, docWarning };
}

// ---------------- Öğretmen doğrulama belgesi ----------------
const TEACHER_DOC_BUCKET = 'teacher-documents';
export const TEACHER_DOC_MAX_BYTES = 5 * 1024 * 1024;
export const TEACHER_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/** Belge seçimi geçerli mi? Değilse hata mesajını döner. */
export function teacherDocumentError(file: File | null | undefined): string | null {
  if (!file) return 'Lütfen öğretmen olduğunuzu gösteren bir belge yükleyiniz.';
  if (!TEACHER_DOC_TYPES.includes(file.type)) return 'Belge PDF, JPG veya PNG biçiminde olmalıdır.';
  if (file.size > TEACHER_DOC_MAX_BYTES) return 'Belge en fazla 5 MB olabilir.';
  return null;
}

/** Admin: doğrulama belgesi için 10 dakikalık görüntüleme bağlantısı */
export async function getTeacherDocumentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(TEACHER_DOC_BUCKET).createSignedUrl(path, 600);
  if (error || !data) return null;
  return data.signedUrl;
}

const CAPTCHA_ERROR = 'Güvenlik doğrulaması tamamlanamadı. Lütfen doğrulama kutusunu yeniden işaretleyip tekrar deneyiniz.';

const studentLoginErrors: Record<string, string> = {
  invalid: 'Okul numarası veya PIN hatalı.',
  locked: 'Çok fazla hatalı deneme yapıldı. Bu öğrenci hesabı 15 dakika boyunca kilitlendi.',
  too_many_attempts: 'Çok fazla hatalı deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyiniz.',
  no_school: 'Lütfen önce okulunuzu seçiniz.',
  not_authenticated: 'Oturum açılamadı. Lütfen sayfayı yenileyip tekrar deneyiniz.',
};

/** Öğrenci girişi (okul + okul no + 4 haneli PIN). PIN sunucuda doğrulanır. */
export async function signInStudent(schoolId: string, studentNumber: string, pin: string, captchaToken?: string): Promise<AuthResult> {
  if (!schoolId) return { ok: false, error: studentLoginErrors.no_school };
  const { data: existing } = await supabase.auth.getSession();
  if (!existing.session || !existing.session.user.is_anonymous) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInAnonymously({ options: { captchaToken } });
    if (error?.message?.toLowerCase().includes('captcha')) return { ok: false, error: CAPTCHA_ERROR };
    if (error) {
      return { ok: false, error: 'Öğrenci girişi şu anda kullanılamıyor (anonim oturum kapalı). Lütfen okul yönetimine bildiriniz.' };
    }
  }

  const { data, error } = await supabase.rpc('student_login', {
    p_school_id: schoolId,
    p_student_number: studentNumber.trim(),
    p_pin: pin,
  });
  if (error || !data) return { ok: false, error: 'Giriş sırasında bir hata oluştu. Lütfen tekrar deneyiniz.' };

  const result = data as { ok: boolean; error?: string; student?: StudentSessionInfo };
  if (!result.ok || !result.student) {
    return { ok: false, error: studentLoginErrors[result.error || 'invalid'] || studentLoginErrors.invalid };
  }
  return { ok: true, user: studentToAccount(result.student) };
}

export async function signOutUser(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.is_anonymous) {
    await supabase.rpc('student_logout');
  }
  await supabase.auth.signOut();
}

/** Giriş yapmış öğretmen/admin kendi şifresini değiştirir */
export async function changeMyPassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Giriş yapmış öğretmen sadece kendi Ad Soyad ve Branş bilgilerini günceller.
 * Okul, il/ilçe ve sınıf güvenliği için sunucu tarafındaki update_my_profile RPC'si çağrılır.
 */
export async function updateMyProfile(name: string, branch: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('update_my_profile', {
    p_full_name: name,
    p_branch: branch,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Öğretmen e-posta değişikliği: Supabase Auth akışı üzerinden yürütülür.
 * Yeni e-posta adresine onay bağlantısı gönderilir, doğrudan profiles tablosu güncellenmez.
 */
export async function changeMyEmail(newEmail: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ========================================================
// 1. ÖĞRENCİ SERVİSLERİ
// ========================================================
/** Sınıf sıralaması: öğrenci kendi sınıfını, personel tüm öğrencileri görür */
export async function getLiveStudents(): Promise<StudentRecord[]> {
  const { data, error } = await supabase.rpc('class_leaderboard');
  if (error) {
    console.error('Supabase getLiveStudents hatası:', error.message);
    return [];
  }
  return (data as StudentRecord[]) || [];
}

// Puan verme: src/lib/teacherData.ts → givePoints (sunucuda staff_give_points)

/** Personel: öğrenci ekler (PIN veritabanında hash olarak saklanır) */
export async function createStudent(input: {
  studentNumber: string;
  name: string;
  className: string;
  pin: string;
  /** Yalnızca admin için: öğrencinin okulu (öğretmen her zaman kendi okuluna ekler) */
  schoolId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('staff_create_student', {
    p_student_number: input.studentNumber,
    p_name: input.name,
    p_class_name: input.className,
    p_pin: input.pin,
    p_school_id: input.schoolId || null,
  });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Bu okul numarası zaten kayıtlı.' };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Personel: öğrencinin PIN'ini sıfırlar (açık oturumları da kapatır) */
export async function resetStudentPin(studentId: string, pin: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('staff_set_student_pin', { p_student_id: studentId, p_pin: pin });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Personel: öğrencilerin giriş PIN'leri (öğretmen yalnızca kendi sınıflarındakileri, admin hepsini görür).
 * PIN'i bilinmeyen (PIN gösterimi açılmadan önce belirlenmiş) öğrenciler null döner.
 */
export async function listStudentPins(studentIds: string[]): Promise<{ ok: true; pins: Record<string, string | null> } | { ok: false; error: string }> {
  if (!studentIds.length) return { ok: true, pins: {} };
  const { data, error } = await supabase.rpc('staff_list_student_pins', { p_student_ids: studentIds });
  if (error) return { ok: false, error: error.message };
  const pins: Record<string, string | null> = {};
  ((data as { student_id: string; pin: string | null }[]) || []).forEach((r) => { pins[r.student_id] = r.pin; });
  return { ok: true, pins };
}

/** Öğrenciyi ve tüm kayıtlarını siler (admin: hepsi, öğretmen: kendi okulu). Mesajları da silinir. */
export async function deleteStudent(studentId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('staff_delete_student', { p_student_id: studentId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface StudentListItem {
  id: string;
  student_number: string;
  name: string;
  class_name: string;
  points: number;
}

/** Personel: öğrenci listesi (RLS: personel tüm öğrencileri görür) */
export async function listStudents(): Promise<{ ok: boolean; students: StudentListItem[]; error?: string }> {
  const { data, error } = await supabase
    .from('students')
    .select('id, student_number, name, class_name, points')
    .order('class_name', { ascending: true })
    .order('student_number', { ascending: true });
  if (error) return { ok: false, students: [], error: error.message };
  return { ok: true, students: (data as StudentListItem[]) || [] };
}

/** Personel: öğrencinin adını ve sınıfını günceller (okul numarası değiştirilemez) */
export async function updateStudentInfo(
  studentId: string,
  values: { name: string; class_name: string }
): Promise<{ ok: boolean; error?: string }> {
  const name = values.name.trim();
  if (!name) return { ok: false, error: 'Ad soyad boş bırakılamaz.' };
  const { error, count } = await supabase
    .from('students')
    .update({ name: name.slice(0, 120), class_name: values.class_name.trim().slice(0, 20) }, { count: 'exact' })
    .eq('id', studentId);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: 'Öğrenci güncellenemedi (yetki yok).' };
  return { ok: true };
}

// ========================================================
// 1b. OKULLAR (il → ilçe → okul)
// ========================================================
/** Bir ilçedeki onaylı okullar (giriş yapmadan da okunabilir; kayıt ekranı için) */
/** Okul adına göre arama (giriş ekranı; yalnızca onaylı okullar) */
export async function searchSchools(query: string): Promise<SchoolRecord[]> {
  const q = query.trim().replace(/[%_,()]/g, ' ').trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, city, district, status')
    .eq('status', 'approved')
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(20);
  if (error) {
    console.error('Supabase searchSchools hatası:', error.message);
    return [];
  }
  return (data as SchoolRecord[]) || [];
}

export async function listSchools(city: string, district: string): Promise<SchoolRecord[]> {
  if (!city || !district) return [];
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, city, district, status')
    .eq('city', city)
    .eq('district', district)
    .eq('status', 'approved')
    .order('name');
  if (error) {
    console.error('Supabase listSchools hatası:', error.message);
    return [];
  }
  return (data as SchoolRecord[]) || [];
}

/** Admin: onay bekleyen okullar */
export async function listPendingSchools(): Promise<SchoolRecord[]> {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, city, district, status')
    .eq('status', 'pending')
    .order('city')
    .order('district');
  if (error) {
    console.error('Supabase listPendingSchools hatası:', error.message);
    return [];
  }
  return (data as SchoolRecord[]) || [];
}

type Result = { ok: boolean; error?: string };
const rpcResult = async (fn: string, args: Record<string, unknown>): Promise<Result> => {
  const { error } = await supabase.rpc(fn, args);
  return error ? { ok: false, error: error.message } : { ok: true };
};

/** Admin: okul ekler (onaylı). Aynı ilçede aynı ad varsa yenisini oluşturmaz. */
export const addSchool = (name: string, city: string, district: string) =>
  rpcResult('admin_add_school', { p_name: name, p_city: city, p_district: district });

/** Admin: bekleyen okulu onaylar (isteğe bağlı ad düzeltmesiyle) */
export const approveSchool = (schoolId: string, name?: string) =>
  rpcResult('admin_approve_school', { p_school_id: schoolId, p_name: name ?? null });

/** Admin: yanlış yazılmış okulu doğru okulla birleştirir (öğretmenler taşınır) */
export const mergeSchool = (fromId: string, intoId: string) =>
  rpcResult('admin_merge_school', { p_from: fromId, p_into: intoId });

/** Admin: okulu siler (bağlı öğretmenlerin okulu boşalır) */
export async function deleteSchool(schoolId: string): Promise<Result> {
  const { error, count } = await supabase.from('schools').delete({ count: 'exact' }).eq('id', schoolId);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: 'Okul silinemedi.' };
  return { ok: true };
}

// ========================================================
// 2. ADMIN: ÖĞRETMEN ONAYI
// ========================================================
export async function listProfiles(): Promise<ProfileRecord[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase listProfiles hatası:', error.message);
    return [];
  }
  return (data as ProfileRecord[]) || [];
}

async function updateProfile(profileId: string, values: Partial<ProfileRecord>): Promise<{ ok: boolean; error?: string }> {
  const { error, count } = await supabase.from('profiles').update(values, { count: 'exact' }).eq('id', profileId);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: 'Güncelleme yetkiniz yok.' };
  return { ok: true };
}

/** Admin: öğretmeni pasif/aktif yapar. Pasif öğretmen anında tüm erişimini kaybeder. */
export function setTeacherActive(profileId: string, isActive: boolean) {
  return updateProfile(profileId, { is_active: isActive });
}

/** Admin: öğretmen bilgilerini düzenler */
export function updateTeacherProfile(
  profileId: string,
  // Okul adı school_id'den veritabanında otomatik eşitlenir (profiles_sync_school_name)
  values: Pick<ProfileRecord, 'full_name' | 'branch' | 'school_id' | 'city' | 'district' | 'class_name'>
) {
  return updateProfile(profileId, values);
}

/** Admin: öğretmen hesabını tamamen siler (giriş hesabı dahil) */
export async function deleteTeacher(profileId: string): Promise<{ ok: boolean; error?: string }> {
  // Doğrulama belgelerini önce temizle (hesap silindikten sonra klasör sahipsiz kalır)
  const { data: docs } = await supabase.storage.from(TEACHER_DOC_BUCKET).list(profileId);
  if (docs?.length) {
    await supabase.storage.from(TEACHER_DOC_BUCKET).remove(docs.map((d) => `${profileId}/${d.name}`));
  }
  const { error } = await supabase.rpc('admin_delete_teacher', { p_profile_id: profileId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setTeacherApproved(profileId: string, approved: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error, count } = await supabase
    .from('profiles')
    .update({ approved }, { count: 'exact' })
    .eq('id', profileId);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: 'Güncelleme yetkiniz yok.' };
  return { ok: true };
}
