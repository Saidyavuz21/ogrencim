'use client';

import React, { useState } from 'react';
import { avatarUrl, initialsOfName, type TeacherCard } from '../../lib/communitySocialData';
import s from './CommunitySocial.module.css';

export type AvatarSize = 32 | 40 | 48 | 96;

export interface TeacherAvatarProps {
  card: Pick<TeacherCard, 'name'> & { avatar_path?: string | null };
  size?: AvatarSize;
  onClick?: () => void;
  href?: string;
  ariaLabel?: string;
}

const SIZE_CLASS: Record<AvatarSize, string> = {
  32: s.avatar32,
  40: s.avatar40,
  48: s.avatar48,
  96: s.avatar96,
};

export function TeacherAvatar({
  card,
  size = 40,
  onClick,
  href,
  ariaLabel,
}: TeacherAvatarProps) {
  const url = avatarUrl(card.avatar_path);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(url && failedUrl !== url);
  const initials = initialsOfName(card.name);
  const sizeCls = SIZE_CLASS[size] || s.avatar40;

  const inner = showImage && url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={s.avatarImg}
      loading="lazy"
      onError={() => setFailedUrl(url)}
    />
  ) : (
    <span aria-hidden="true">{initials}</span>
  );

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={`${s.avatar} ${sizeCls} ${s.avatarBtn}`}
        aria-label={ariaLabel || `${card.name} profilini aç`}
      >
        {inner}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${s.avatar} ${sizeCls} ${s.avatarBtn}`}
        aria-label={ariaLabel || `${card.name} profilini aç`}
      >
        {inner}
      </button>
    );
  }

  return (
    <span className={`${s.avatar} ${sizeCls}`} aria-hidden="true">
      {inner}
    </span>
  );
}

export interface TeacherBylineProps {
  card: TeacherCard;
  date?: string;
  size?: AvatarSize;
  onOpenTeacher?: (teacherId: string) => void;
}

export function TeacherByline({
  card,
  date,
  size = 40,
  onOpenTeacher,
}: TeacherBylineProps) {
  const canOpen = Boolean(card.profile_visible && onOpenTeacher && card.id);
  const metaParts = [card.branch, card.city].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
  const metaText = metaParts.join(' · ');

  const handleOpen = canOpen && onOpenTeacher ? () => onOpenTeacher(card.id) : undefined;

  return (
    <div className={s.byline}>
      <TeacherAvatar
        card={card}
        size={size}
        onClick={handleOpen}
        ariaLabel={canOpen ? `${card.name} profilini aç` : undefined}
      />
      <div className={s.bylineBody}>
        <div className={s.bylineTop}>
          {canOpen ? (
            <button type="button" className={s.bylineNameBtn} onClick={handleOpen}>
              {card.name}
            </button>
          ) : (
            <span className={s.bylineName}>{card.name}</span>
          )}
          {date && <span className={s.bylineDate}>· {date}</span>}
        </div>
        {metaText && <span className={s.bylineMeta}>{metaText}</span>}
      </div>
    </div>
  );
}

