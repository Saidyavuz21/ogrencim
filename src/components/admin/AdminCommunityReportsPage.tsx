'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  listReports,
  resolveReport,
  unsuspendTeacher,
  type CommunityReport,
  type ReportKind,
} from '../../lib/communitySocialData';
import { useDialog } from '../ConfirmDialog';
import { CustomSelect } from '../CustomSelect';
import { Check, Flag, RotateCcw, Trash2, X } from '../icons';
import styles from './AdminManagement.module.css';
import { EmptyState, formatDate, type Notify } from './adminShared';

type ReportStatus = 'open' | 'removed' | 'dismissed';

const STATUS_TABS: { id: ReportStatus; label: string }[] = [
  { id: 'open', label: 'Açık' },
  { id: 'removed', label: 'Kaldırılan' },
  { id: 'dismissed', label: 'Reddedilen' },
];

const KIND_LABEL: Record<ReportKind, string> = {
  post: 'Gönderi',
  comment: 'Yorum',
  profile: 'Profil',
};

const SUSPEND_OPTIONS = [
  { value: '0', label: 'Yok' },
  { value: '3', label: '3 gün' },
  { value: '7', label: '7 gün' },
  { value: '30', label: '30 gün' },
];

const PAGE_LIMIT = 50;

function readStringField(
  snapshot: Record<string, unknown> | null,
  key: string
): string | null {
  if (!snapshot) return null;
  const val = snapshot[key];
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.trim();
  }
  return null;
}

export interface AdminCommunityReportsPageProps {
  notify: Notify;
}

export function AdminCommunityReportsPage({
  notify,
}: AdminCommunityReportsPageProps) {
  const { confirm } = useDialog();
  const [nowMs] = useState(() => Date.now());
  const [status, setStatus] = useState<ReportStatus>('open');
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Her şikâyet satırı için açıklama ve uzaklaştırma süresi seçimi
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [suspendDaysMap, setSuspendDaysMap] = useState<Record<string, string>>({});

  const load = useCallback(
    async (offset = 0) => {
      if (offset > 0) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const res = await listReports(status, PAGE_LIMIT, offset);

      if (offset > 0) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }

      if (!res.ok) {
        if (offset > 0) notify('error', res.error);
        else setError(res.error);
        return;
      }

      setReports((prev) => {
        if (offset === 0) return res.data;
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...res.data.filter((x) => !seen.has(x.id))];
      });
      setHasMore(res.data.length >= PAGE_LIMIT);
    },
    [status, notify]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(0);
  }, [load]);

  const handleResolve = async (report: CommunityReport, action: 'remove' | 'dismiss') => {
    if (busyId) return;
    const note = (notes[report.id] || '').trim();
    const suspendDays = action === 'remove' ? Number(suspendDaysMap[report.id] || '0') : 0;

    const suspendNote =
      suspendDays > 0
        ? `\nAyrıca içerik sahibi ${suspendDays} gün süreyle topluluktan uzaklaştırılacak.`
        : '';

    const ok = await confirm({
      title: action === 'remove' ? 'İçeriği kaldır' : 'Şikâyeti reddet',
      message:
        action === 'remove'
          ? `Şikâyet edilen ${KIND_LABEL[report.target_kind].toLocaleLowerCase('tr-TR')} topluluktan gizlensin mi?${suspendNote}`
          : 'Bu şikâyet işlem yapılmadan reddedilsin mi?',
      confirmText: action === 'remove' ? 'İçeriği kaldır' : 'Reddet',
      cancelText: 'Vazgeç',
      variant: action === 'remove' ? 'danger' : 'warning',
    });
    if (!ok) return;

    setBusyId(report.id);
    const res = await resolveReport(report.id, action, note || undefined, suspendDays);
    setBusyId(null);

    if (!res.ok) {
      notify('error', res.error);
      return;
    }

    notify(
      'ok',
      action === 'remove'
        ? 'İçerik kaldırıldı ve şikâyet sonuçlandırıldı.'
        : 'Şikâyet reddedildi.'
    );
    setReports((prev) => prev.filter((r) => r.id !== report.id));
  };

  const handleUnsuspend = async (authorId: string, authorName: string) => {
    if (busyId) return;
    const ok = await confirm({
      title: 'Uzaklaştırmayı kaldır',
      message: `${authorName} adlı öğretmenin topluluk uzaklaştırması kaldırılsın mı?`,
      confirmText: 'Uzaklaştırmayı kaldır',
      cancelText: 'Vazgeç',
      variant: 'warning',
    });
    if (!ok) return;

    setBusyId(`unsuspend-${authorId}`);
    const res = await unsuspendTeacher(authorId);
    setBusyId(null);

    if (!res.ok) {
      notify('error', res.error);
      return;
    }

    notify('ok', `${authorName} için uzaklaştırma kaldırıldı.`);
    setReports((prev) =>
      prev.map((r) =>
        r.author?.id === authorId ? { ...r, author_suspended_until: null } : r
      )
    );
  };

  return (
    <div className={styles.stack}>
      <section className={styles.section} aria-labelledby="community-reports-heading">
        <div className={styles.between}>
          <div className={styles.sectionHeading}>
            <Flag />
            <h2 id="community-reports-heading" className={styles.sectionTitle}>
              Topluluk şikâyetleri
            </h2>
          </div>

          <div className={styles.segmented} role="tablist" aria-label="Şikâyet durumu">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={status === t.id}
                onClick={() => setStatus(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <p className={styles.muted}>
          5651 sayılı kanun gereği şikâyet edilen içeriklerin anlık görüntüleri ve denetim
          kayıtları silinmez; kaldırılan içerikler yalnızca topluluk görünümünden gizlenir.
        </p>

        {loading && <EmptyState>Yükleniyor…</EmptyState>}
        {!loading && error && <EmptyState>Şikâyetler alınamadı: {error}</EmptyState>}
        {!loading && !error && reports.length === 0 && (
          <EmptyState>Bu sekmede gösterilecek şikâyet kaydı bulunmuyor.</EmptyState>
        )}

        {!loading && !error && reports.length > 0 && (
          <>
            <ul className={styles.list}>
              {reports.map((r) => {
                const snapBody = readStringField(r.snapshot, 'body');
                const snapTitle = readStringField(r.snapshot, 'title');
                const snapLinkUrl = readStringField(r.snapshot, 'link_url');
                const snapLinkTitle = readStringField(r.snapshot, 'link_title');
                const snapBio = readStringField(r.snapshot, 'bio');
                const snapAlias = readStringField(r.snapshot, 'alias');

                const isSuspended = Boolean(
                  r.author_suspended_until &&
                    new Date(r.author_suspended_until).getTime() > nowMs
                );

                return (
                  <li key={r.id} className={styles.row}>
                    <div className={styles.details}>
                      <div className={styles.identity}>
                        <span className={styles.badge}>
                          {KIND_LABEL[r.target_kind] || r.target_kind}
                        </span>
                        <span className={styles.muted}>{formatDate(r.created_at)}</span>
                        {r.same_target_reports > 1 && (
                          <span className={styles.warningBadge}>
                            Aynı hedef için {r.same_target_reports} şikâyet
                          </span>
                        )}
                        {isSuspended && r.author_suspended_until && (
                          <span className={styles.errorBadge}>
                            Yazar {formatDate(r.author_suspended_until)} tarihine dek
                            uzaklaştırıldı
                          </span>
                        )}
                      </div>

                      <span className={styles.name}>Şikâyet nedeni: {r.reason}</span>

                      <dl className={styles.factList}>
                        <div>
                          <dt>Bildiren öğretmen</dt>
                          <dd>
                            {r.reporter
                              ? `${r.reporter.name}${
                                  r.reporter.school ? ` · ${r.reporter.school}` : ''
                                }`
                              : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt>İçerik sahibi</dt>
                          <dd>
                            {r.author
                              ? [r.author.name, r.author.school, r.author.email]
                                  .filter(Boolean)
                                  .join(' · ')
                              : '—'}
                          </dd>
                        </div>
                      </dl>

                      {/* İçerik anlık görüntüsü (snapshot) */}
                      {r.snapshot && (
                        <dl className={styles.factList}>
                          {snapTitle && (
                            <div>
                              <dt>Başlık</dt>
                              <dd>{snapTitle}</dd>
                            </div>
                          )}
                          {snapAlias && (
                            <div>
                              <dt>Görünen ad</dt>
                              <dd>{snapAlias}</dd>
                            </div>
                          )}
                          {snapBio && (
                            <div>
                              <dt>Tanıtım (bio)</dt>
                              <dd>{snapBio}</dd>
                            </div>
                          )}
                          {snapBody && (
                            <div>
                              <dt>Metin (body)</dt>
                              <dd>{snapBody}</dd>
                            </div>
                          )}
                          {(snapLinkUrl || snapLinkTitle) && (
                            <div>
                              <dt>Bağlantı</dt>
                              <dd>
                                {[snapLinkTitle, snapLinkUrl].filter(Boolean).join(' — ')}
                              </dd>
                            </div>
                          )}
                        </dl>
                      )}

                      {r.snapshot && (
                        <details>
                          <summary className={styles.muted}>Ayrıntı (anlık görüntü JSON)</summary>
                          <pre className={styles.muted}>
                            {JSON.stringify(r.snapshot, null, 2)}
                          </pre>
                        </details>
                      )}

                      {r.status !== 'open' && (
                        <span className={styles.muted}>
                          Sonuç:{' '}
                          <strong>
                            {r.status === 'removed' ? 'İçerik kaldırıldı' : 'Reddedildi'}
                          </strong>
                          {r.resolved_at ? ` · ${formatDate(r.resolved_at)}` : ''}
                          {r.resolver ? ` · İşlemi yapan: ${r.resolver}` : ''}
                          {r.resolution ? ` · Not: ${r.resolution}` : ''}
                        </span>
                      )}

                      {r.status === 'open' && (
                        <div className={styles.formStack}>
                          <div className={styles.pair}>
                            <label className={styles.field}>
                              <span className={styles.fieldLabel}>
                                Karar açıklaması (isteğe bağlı)
                              </span>
                              <input
                                type="text"
                                className={styles.input}
                                value={notes[r.id] || ''}
                                onChange={(e) =>
                                  setNotes((prev) => ({
                                    ...prev,
                                    [r.id]: e.target.value,
                                  }))
                                }
                                placeholder="Örn. Kişisel veri içerdiği için kaldırıldı"
                              />
                            </label>

                            <div className={styles.field}>
                              <label
                                htmlFor={`suspend-select-${r.id}`}
                                className={styles.fieldLabel}
                              >
                                Yazarı topluluktan uzaklaştır
                              </label>
                              <CustomSelect
                                id={`suspend-select-${r.id}`}
                                value={suspendDaysMap[r.id] || '0'}
                                options={SUSPEND_OPTIONS}
                                onChange={(val) =>
                                  setSuspendDaysMap((prev) => ({
                                    ...prev,
                                    [r.id]: val,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.danger}
                              disabled={busyId !== null}
                              onClick={() => handleResolve(r, 'remove')}
                            >
                              <Trash2 className={styles.icon} />
                              <span>İçeriği kaldır</span>
                            </button>

                            <button
                              type="button"
                              className={styles.button}
                              disabled={busyId !== null}
                              onClick={() => handleResolve(r, 'dismiss')}
                            >
                              <X className={styles.icon} />
                              <span>Reddet</span>
                            </button>

                            {isSuspended && r.author && (
                              <button
                                type="button"
                                className={styles.button}
                                disabled={busyId !== null}
                                onClick={() =>
                                  handleUnsuspend(r.author!.id, r.author!.name)
                                }
                              >
                                <RotateCcw className={styles.icon} />
                                <span>Uzaklaştırmayı kaldır</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {r.status !== 'open' && isSuspended && r.author && (
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.button}
                            disabled={busyId !== null}
                            onClick={() =>
                              handleUnsuspend(r.author!.id, r.author!.name)
                            }
                          >
                            <Check className={styles.icon} />
                            <span>Uzaklaştırmayı kaldır</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {hasMore && (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.button}
                  disabled={loadingMore}
                  onClick={() => load(reports.length)}
                >
                  {loadingMore ? 'Yükleniyor…' : 'Daha fazla göster'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

