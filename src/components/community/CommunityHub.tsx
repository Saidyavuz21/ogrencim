'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CommunityFeed } from './CommunityFeed';
import { TeacherProfileView } from './TeacherProfileView';

export type CommunityHubView = 'feed' | 'teacher';

function readTeacherIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const val = params.get('ogretmen')?.trim() || '';
    return val.length > 0 ? val : null;
  } catch {
    return null;
  }
}

export interface CommunityHubProps {
  onOpenProfile?: () => void;
  onOpenBoards?: () => void;
  onOpenQuestions?: () => void;
}

export function CommunityHub({
  onOpenProfile,
  onOpenBoards,
  onOpenQuestions,
}: CommunityHubProps) {
  const [teacherId, setTeacherId] = useState<string | null>(readTeacherIdFromUrl);
  const view: CommunityHubView = teacherId ? 'teacher' : 'feed';

  useEffect(() => {
    const onPopState = () => {
      setTeacherId(readTeacherIdFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openTeacher = useCallback((id: string) => {
    const clean = id.trim();
    if (!clean) return;
    setTeacherId(clean);
    const url = new URL(window.location.href);
    url.searchParams.set('sayfa', 'topluluk');
    url.searchParams.set('ogretmen', clean);
    if (url.href !== window.location.href) {
      window.history.pushState(null, '', url);
    }
    window.scrollTo({ top: 0 });
  }, []);

  const closeTeacher = useCallback(() => {
    setTeacherId(null);
    const url = new URL(window.location.href);
    url.searchParams.set('sayfa', 'topluluk');
    url.searchParams.delete('ogretmen');
    if (url.href !== window.location.href) {
      window.history.pushState(null, '', url);
    }
    window.scrollTo({ top: 0 });
  }, []);

  if (view === 'teacher' && teacherId) {
    return (
      <TeacherProfileView
        teacherId={teacherId}
        onBack={closeTeacher}
        onOpenTeacher={openTeacher}
        onEditProfile={onOpenProfile}
      />
    );
  }

  return (
    <CommunityFeed
      onOpenTeacher={openTeacher}
      onOpenBoards={onOpenBoards}
      onOpenQuestions={onOpenQuestions}
    />
  );
}
