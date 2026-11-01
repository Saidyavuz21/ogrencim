// ========================================================
// ÖĞRENCİ & VELİ BİLGİ PORTALI - SUPABASE CANLI VERİ SERVİSİ
// ========================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pvxkyazarymowhbbhzgo.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_w6U3bU8s6f9mwwdCvG1gfA_Xx805Utm';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

export interface StudentRecord {
  id: string;
  student_number: string;
  name: string;
  avatar: string;
  class_name: string;
  points: number;
  plus_count: number;
  minus_count: number;
  attendance_days: number;
  absence_days: number;
  parent_pin: string;
  created_at?: string;
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

// --------------------------------------------------------
// 1. ÖĞRENCİ SERVİSLERİ
// --------------------------------------------------------
export async function getLiveStudents(): Promise<StudentRecord[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*&order=points.desc`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Supabase getLiveStudents hatası:', err);
    return [];
  }
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
  try {
    // 1. Öğrenci puanını güncelle
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?student_number=eq.${studentNumber}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        points: newPoints,
        plus_count: newPlusCount,
        minus_count: newMinusCount,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const updated = await res.json();

    // 2. Puan geçmişi tablosuna log kaydet
    if (updated && updated[0]) {
      fetch(`${SUPABASE_URL}/rest/v1/points_history`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          student_id: updated[0].id,
          teacher_name: teacherName,
          change_type: delta > 0 ? 'plus' : 'minus',
          amount: delta,
          reason: reason || (delta > 0 ? 'Derse aktif katılım' : 'Ödev eksikliği'),
        }),
      }).catch((e) => console.warn('Puan geçmişi log hatası:', e));
    }

    return updated[0] || null;
  } catch (err) {
    console.error('Supabase updateStudentScore hatası:', err);
    return null;
  }
}

// --------------------------------------------------------
// 2. MESAJLAŞMA SERVİSLERİ (WhatsApp Tarzı)
// --------------------------------------------------------
export async function getLiveMessages(conversationId?: string): Promise<MessageRecord[]> {
  try {
    const filter = conversationId ? `&conversation_id=eq.${conversationId}` : '';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?select=*${filter}&order=created_at.asc`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Supabase getLiveMessages hatası:', err);
    return [];
  }
}

export async function sendLiveMessage(msg: {
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'parent' | 'teacher' | 'admin';
  content: string;
  message_type?: 'text' | 'audio' | 'file';
  file_url?: string;
  audio_duration?: string;
}): Promise<MessageRecord | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        sender_role: msg.sender_role,
        content: msg.content,
        message_type: msg.message_type || 'text',
        file_url: msg.file_url || null,
        audio_duration: msg.audio_duration || null,
        is_read: false,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data[0] || null;
  } catch (err) {
    console.error('Supabase sendLiveMessage hatası:', err);
    return null;
  }
}

// --------------------------------------------------------
// 3. ÖDEVLER VE DUYURULAR
// --------------------------------------------------------
export async function getLiveHomeworks(): Promise<HomeworkRecord[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/homeworks?select=*&order=created_at.desc`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Supabase getLiveHomeworks hatası:', err);
    return [];
  }
}

export async function getLiveAnnouncements(): Promise<AnnouncementRecord[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/announcements?select=*&order=created_at.desc`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Supabase getLiveAnnouncements hatası:', err);
    return [];
  }
}

export async function postLiveAnnouncement(
  title: string,
  content: string,
  teacherName: string = 'Zehra Aydın',
  priority: 'normal' | 'urgent' = 'normal'
): Promise<AnnouncementRecord | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/announcements`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title,
        content,
        teacher_name: teacherName,
        priority,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data[0] || null;
  } catch (err) {
    console.error('Supabase postLiveAnnouncement hatası:', err);
    return null;
  }
}

