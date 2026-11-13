import type React from 'react';
import type { TeacherPageGroup, TeacherPageId } from './teacherPages';

export type TeacherToneKey = 'green' | 'amber' | 'blue' | 'teal' | 'sand' | 'purple' | 'orange' | 'danger';

export interface TeacherTone {
  bg: string;
  fg: string;
  border: string;
}

export const TEACHER_TONES: Record<TeacherToneKey, TeacherTone> = {
  green: { bg: '#e6f0ea', fg: '#25634b', border: '#b8d3c3' },
  amber: { bg: '#fbf0d9', fg: '#8a5a0b', border: '#e6cf9b' },
  blue: { bg: '#e7eff8', fg: '#24527a', border: '#bfd3ea' },
  teal: { bg: '#e2f2f1', fg: '#1d6560', border: '#b2d7d4' },
  sand: { bg: '#f1eee6', fg: '#5d5547', border: '#d8d2c3' },
  purple: { bg: '#efeaf6', fg: '#5b3c88', border: '#d2c5e6' },
  orange: { bg: '#f8eee2', fg: '#8a4f17', border: '#e5cdb2' },
  danger: { bg: '#fcecef', fg: '#a33342', border: '#ecc4cb' },
};

export const TEACHER_GROUP_TONE: Record<TeacherPageGroup, TeacherToneKey> = {
  'Ödevler': 'green',
  'Puan ve ödül': 'amber',
  'Ders ve değerlendirme': 'blue',
  'Öğrenciler ve sınıflar': 'teal',
  'Okul yönetimi': 'sand',
  'İletişim': 'blue',
  'Hesap': 'sand',
};

export const TEACHER_PAGE_TONE: Record<TeacherPageId, TeacherToneKey> = {
  home: 'green',
  assignments: 'green',
  check_sheet: 'green',
  questions: 'blue',
  files: 'sand',
  plus_minus: 'amber',
  leaderboard: 'amber',
  aquarium: 'amber',
  garden: 'amber',
  class_tools: 'orange',
  reading: 'blue',
  quiz_show: 'blue',
  grade_entry: 'blue',
  boards: 'blue',
  community: 'purple',
  students: 'teal',
  consent: 'teal',
  class_report: 'amber',
  classes: 'teal',
  school_admin: 'sand',
  messages: 'blue',
  announcements: 'blue',
  profile: 'sand',
};

export const TEACHER_CLASS_TOOL_TONE: Record<'picker' | 'stopwatch' | 'groups' | 'countdown', TeacherToneKey> = {
  picker: 'orange',
  stopwatch: 'orange',
  groups: 'teal',
  countdown: 'purple',
};

export function teacherToneVars(tone: TeacherToneKey): React.CSSProperties {
  const t = TEACHER_TONES[tone];
  return {
    '--tone-bg': t.bg,
    '--tone-fg': t.fg,
    '--tone-border': t.border,
  } as React.CSSProperties;
}

export function teacherPageToneVars(page: TeacherPageId): React.CSSProperties {
  return teacherToneVars(TEACHER_PAGE_TONE[page] ?? 'green');
}

export function teacherGroupToneVars(group: TeacherPageGroup): React.CSSProperties {
  return teacherToneVars(TEACHER_GROUP_TONE[group] ?? 'green');
}

