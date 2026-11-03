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

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'parent' | 'teacher' | 'admin';
  content: string;
  message_type: 'text' | 'audio' | 'file';
  file_url?: string | null;
  audio_duration?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface HomeworkRecord {
  id: string;
  subject: string;
  teacher_name: string;
  title: string;
  file_type: string;
  file_url?: string | null;
  due_days: number;
  points: number;
  is_submitted: boolean;
  created_at: string;
}

export interface AnnouncementRecord {
  id: string;
  teacher_name: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent';
  created_at: string;
}

export interface ProfileRecord {
  id: string;
  role: 'admin' | 'ogretmen';
  full_name: string;
  email: string | null;
  branch: string | null;
  city: string | null;
  district: string | null;
  school_name: string | null;
  class_name: string | null;
  approved: boolean;
  created_at: string;
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
  return { ok: true, user: profileToAccount(profile) };
}

/** Sayfa yenilendiğinde mevcut oturumu geri yükler. Oturum yoksa null döner. */
export async function restoreSession(): Promise<UserAccount | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  if (session.user.is_anonymous) {
    const { data: student } = await supabase.rpc('my_student');
    if (student) return studentToAccount(student as StudentSessionInfo);
    await supabase.auth.signOut();
    return null;
  }

  const res = await loadStaffAccount(session.user.id);
  if (res.ok) return res.user;
  await supabase.auth.signOut();
  return null;
}

/** Öğretmen / Admin girişi (e-posta + şifre) */
export async function signInStaff(email: string, password: string, expectedRole: 'admin' | 'ogretmen'): Promise<AuthResult> {
  // Önceki (ör. anonim öğrenci) oturumu kapat
  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) {
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
    return { ok: false, error: 'Bu hesabın yönetici yetkisi yok. Lütfen "Öğretmen" sekmesinden giriş yapınız.' };
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
  school: string;
  className: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        name: input.name.trim(),
        branch: input.branch,
        city: input.city,
        district: input.district,
        school: input.school.trim(),
        class_name: input.className,
      },
    },
  });
  // Kayıt sonrası oluşan oturumu kapat: admin onayı beklenir
  await supabase.auth.signOut();
  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { ok: false, error: 'Bu e-posta adresiyle zaten bir hesap var.' };
    }
    return { ok: false, error: `Kayıt yapılamadı: ${error.message}` };
  }
  return { ok: true };
}

const studentLoginErrors: Record<string, string> = {
  invalid: 'Okul numarası veya PIN hatalı.',
  locked: 'Çok fazla hatalı deneme yapıldı. Bu öğrenci hesabı 15 dakika boyunca kilitlendi.',
  too_many_attempts: 'Çok fazla hatalı deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyiniz.',
  not_authenticated: 'Oturum açılamadı. Lütfen sayfayı yenileyip tekrar deneyiniz.',
};

/** Öğrenci & Veli girişi (okul no + 4 haneli PIN). PIN sunucuda doğrulanır. */
export async function signInStudent(studentNumber: string, pin: string): Promise<AuthResult> {
  const { data: existing } = await supabase.auth.getSession();
  if (!existing.session || !existing.session.user.is_anonymous) {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      return { ok: false, error: 'Öğrenci girişi şu anda kullanılamıyor (anonim oturum kapalı). Lütfen okul yönetimine bildiriniz.' };
    }
  }

  const { data, error } = await supabase.rpc('student_login', {
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

/** Veli kilit ekranı: oturumdaki öğrencinin PIN'ini yeniden doğrular */
export async function verifyMyPin(pin: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('verify_my_pin', { p_pin: pin });
  if (error || !data) return { ok: false, error: 'Doğrulama sırasında bir hata oluştu.' };
  const result = data as { ok: boolean; error?: string };
  if (result.ok) return { ok: true };
  return { ok: false, error: studentLoginErrors[result.error || 'invalid'] || studentLoginErrors.invalid };
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

export async function updateStudentScore(
  studentNumber: string,
  newPoints: number,
  newPlusCount: number,
  newMinusCount: number,
  delta: number,
  reason: string,
  teacherName: string = 'Öğretmen'
): Promise<StudentRecord | null> {
  const { data, error } = await supabase
    .from('students')
    .update({ points: newPoints, plus_count: newPlusCount, minus_count: newMinusCount })
    .eq('student_number', studentNumber)
    .select('id, student_number, name, avatar, class_name, points, plus_count, minus_count')
    .maybeSingle();
  if (error || !data) {
    if (error) console.error('Supabase updateStudentScore hatası:', error.message);
    return null;
  }

  const { error: logError } = await supabase.from('points_history').insert({
    student_id: data.id,
    teacher_name: teacherName,
    change_type: delta > 0 ? 'plus' : 'minus',
    amount: delta,
    reason: reason || (delta > 0 ? 'Derse aktif katılım' : 'Ödev eksikliği'),
  });
  if (logError) console.warn('Puan geçmişi log hatası:', logError.message);

  return data as StudentRecord;
}

/** Personel: öğrenci ekler (PIN veritabanında hash olarak saklanır) */
export async function createStudent(input: {
  studentNumber: string;
  name: string;
  className: string;
  pin: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('staff_create_student', {
    p_student_number: input.studentNumber,
    p_name: input.name,
    p_class_name: input.className,
    p_pin: input.pin,
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

export async function deleteStudent(studentId: string): Promise<{ ok: boolean; error?: string }> {
  const { error, count } = await supabase.from('students').delete({ count: 'exact' }).eq('id', studentId);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: 'Öğrenci silinemedi (yalnızca admin silebilir).' };
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

export async function setTeacherApproved(profileId: string, approved: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error, count } = await supabase
    .from('profiles')
    .update({ approved }, { count: 'exact' })
    .eq('id', profileId);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: 'Güncelleme yetkiniz yok.' };
  return { ok: true };
}

// ========================================================
// 3. MESAJLAŞMA SERVİSLERİ
// ========================================================
export async function getLiveMessages(conversationId?: string): Promise<MessageRecord[]> {
  let query = supabase.from('messages').select('*').order('created_at', { ascending: true });
  if (conversationId) query = query.eq('conversation_id', conversationId);
  const { data, error } = await query;
  if (error) {
    console.error('Supabase getLiveMessages hatası:', error.message);
    return [];
  }
  return (data as MessageRecord[]) || [];
}

export async function sendLiveMessage(msg: {
  conversation_id: string;
  sender_name: string;
  content: string;
  message_type?: 'text' | 'audio' | 'file';
  file_url?: string;
  audio_duration?: string;
}): Promise<MessageRecord | null> {
  // sender_id, sender_role ve is_read sunucuda (trigger) oturuma göre belirlenir
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: msg.conversation_id,
      sender_id: 'server',
      sender_name: msg.sender_name,
      sender_role: 'parent',
      content: msg.content,
      message_type: msg.message_type || 'text',
      file_url: msg.file_url || null,
      audio_duration: msg.audio_duration || null,
    })
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('Supabase sendLiveMessage hatası:', error.message);
    return null;
  }
  return data as MessageRecord;
}

// ========================================================
// 4. ÖDEVLER VE DUYURULAR
// ========================================================
export async function getLiveHomeworks(): Promise<HomeworkRecord[]> {
  const { data, error } = await supabase.from('homeworks').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase getLiveHomeworks hatası:', error.message);
    return [];
  }
  return (data as HomeworkRecord[]) || [];
}

export async function getLiveAnnouncements(): Promise<AnnouncementRecord[]> {
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase getLiveAnnouncements hatası:', error.message);
    return [];
  }
  return (data as AnnouncementRecord[]) || [];
}

export async function postLiveAnnouncement(
  title: string,
  content: string,
  teacherName: string,
  priority: 'normal' | 'urgent' = 'normal'
): Promise<AnnouncementRecord | null> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ title, content, teacher_name: teacherName, priority })
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('Supabase postLiveAnnouncement hatası:', error.message);
    return null;
  }
  return data as AnnouncementRecord;
}
