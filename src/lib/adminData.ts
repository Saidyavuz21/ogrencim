// ========================================================
// SÜPER ADMIN VERİLERİ
// Admin RLS ile bütün okulların öğrencilerini ve okullarını okuyabilir.
// ========================================================

import { supabase, SchoolRecord } from './supabaseClient';

export interface AdminStudentRecord {
  id: string;
  student_number: string;
  name: string;
  class_name: string | null;
  points: number;
  school_id: string | null;
  school_name: string | null;
  created_at: string;
}

/** Admin: bütün öğrenciler, okul adıyla birlikte */
export async function adminListStudents(): Promise<AdminStudentRecord[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, student_number, name, class_name, points, school_id, created_at, schools(name)')
    .order('name');
  if (error) {
    console.error('Supabase adminListStudents hatası:', error.message);
    return [];
  }
  type Row = Omit<AdminStudentRecord, 'school_name'> & { schools: { name: string } | { name: string }[] | null };
  return ((data as unknown as Row[]) || []).map(({ schools, ...s }) => ({
    ...s,
    school_name: Array.isArray(schools) ? schools[0]?.name ?? null : schools?.name ?? null,
  }));
}

/** Admin: onaylı ve onay bekleyen bütün okullar */
export async function adminListSchools(): Promise<SchoolRecord[]> {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, city, district, status')
    .order('city')
    .order('district')
    .order('name');
  if (error) {
    console.error('Supabase adminListSchools hatası:', error.message);
    return [];
  }
  return (data as SchoolRecord[]) || [];
}
