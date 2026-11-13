'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MoreHorizontal, Sliders, Trash2 } from '../icons';
import { LibraryPreview } from './LibraryPreview';
import {
  LIBRARY_CATEGORY_LABEL,
  LIBRARY_ITEMS,
  LibraryCategory,
  LibraryItem,
} from '../../lib/boardLibrary';
import styles from './Board.module.css';

function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export type ShapeFilterTab = 'mine' | 'school' | 'all' | LibraryCategory;

/** Hangi liste: hazır şekiller (konu filtreli), öğretmenin kaydettikleri ya da okulda paylaşılanlar */
export type ShapeScope = 'builtin' | 'mine' | 'school';

export interface ShapeLibraryPanelProps {
  scope?: ShapeScope;
  onInsert: (shapeId: string) => void;
  userItems?: LibraryItem[];
  schoolItems?: LibraryItem[];
  isLoadingUserItems?: boolean;
  userItemsError?: string | null;
  onReloadUserItems?: () => void;
  onEditItem?: (item: LibraryItem, field: 'name' | 'category') => void;
  onDeleteItem?: (item: LibraryItem) => void;
  onToggleSchoolShare?: (item: LibraryItem) => void;
  onCopySchoolItem?: (item: LibraryItem) => void;
  schoolSharingEnabled?: boolean;
}

export function ShapeLibraryPanel({
  scope = 'builtin',
  onInsert,
  userItems = [],
  schoolItems = [],
  isLoadingUserItems = false,
  userItemsError = null,
  onReloadUserItems,
  onEditItem,
  onDeleteItem,
  onToggleSchoolShare,
  onCopySchoolItem,
  schoolSharingEnabled = false,
}: ShapeLibraryPanelProps) {
  const [search, setSearch] = useState('');
  // Varsayılan görünüm (builtin): kaydedilen şekiller üstte, hazır şekiller altta; konu filtresi ikisine de uygulanır.
  // 'mine' ve 'school' kapsamları ayrı liste olarak da kullanılabilir (şu an panelde sekmesi yok).
  const [category, setCategory] = useState<'all' | LibraryCategory>('all');
  const activeTab: ShapeFilterTab = scope === 'builtin' ? category : scope;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<LibraryItem | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Dışarı tıklandığında açık menüyü kapat
  useEffect(() => {
    if (!openMenuId) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [openMenuId]);

  const categories: LibraryCategory[] = ['matematik', 'fen', 'genel', 'diger'];

  const filteredItems = useMemo(() => {
    const query = normalizeSearch(search.trim());

    let base: LibraryItem[] = [];
    if (activeTab === 'mine') {
      base = userItems;
    } else if (activeTab === 'school') {
      base = schoolItems;
    } else if (activeTab === 'all') {
      // Önce öğretmenin kaydettikleri ("Kaydettiklerim" başlığı altında), sonra hazır şekiller
      base = [...userItems, ...LIBRARY_ITEMS];
    } else {
      base = [...userItems, ...LIBRARY_ITEMS].filter((it) => it.category === activeTab);
    }

    base = base.filter((item) => !item.imageSource);
    if (!query) return base;

    return base.filter((item) => {
      const normName = normalizeSearch(item.name);
      if (normName.includes(query)) return true;
      if (item.keywords && item.keywords.some((kw) => normalizeSearch(kw).includes(query))) {
        return true;
      }
      return false;
    });
  }, [search, activeTab, userItems, schoolItems]);

  return (
    <div className={styles.shapeLibraryPanel}>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="search"
          placeholder="Şekil ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            borderRadius: '8px',
            border: '1px solid #dcd8ce',
            boxSizing: 'border-box',
          }}
          aria-label="Şekillerde ara"
        />
      </div>

      {/* Konu filtresi: yalnızca hazır şekillerde */}
      {scope === 'builtin' && (
        <div
          className={styles.pageTools}
          style={{ flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}
          role="group"
          aria-label="Konu filtresi"
        >
          <button
            type="button"
            className={styles.tool}
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
            style={{ minHeight: '32px', fontSize: '13px' }}
          >
            Tümü
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={styles.tool}
              aria-pressed={category === cat}
              onClick={() => setCategory(cat)}
              style={{ minHeight: '32px', fontSize: '13px' }}
            >
              {LIBRARY_CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>
      )}

      {scope === 'builtin' && userItemsError && !isLoadingUserItems && (
        <p style={{ margin: '0 0 8px', fontSize: '13px', lineHeight: 1.5, color: '#a3283a' }}>
          Kaydettiğiniz şekiller yüklenemedi.{' '}
          {onReloadUserItems && (
            <button type="button" onClick={onReloadUserItems} style={{ padding: 0, border: 0, background: 'none', color: 'inherit', font: 'inherit', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
              Tekrar dene
            </button>
          )}
        </p>
      )}

      {/* Yüklenme durumu */}
      {isLoadingUserItems && activeTab === 'mine' && (
        <div className={styles.mediaGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                minHeight: '96px',
                background: '#f4f2eb',
                borderRadius: '10px',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
          ))}
        </div>
      )}

      {/* Hata durumu */}
      {userItemsError && activeTab === 'mine' && !isLoadingUserItems && (
        <div style={{ padding: '24px 12px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#a3283a' }}>
            Kütüphaneniz yüklenemedi.
          </p>
          {onReloadUserItems && (
            <button
              type="button"
              className={styles.tool}
              onClick={onReloadUserItems}
            >
              Tekrar dene
            </button>
          )}
        </div>
      )}

      {/* Boş durumlar */}
      {(scope === 'builtin' || (!isLoadingUserItems && !userItemsError)) && filteredItems.length === 0 && (
        <div style={{ margin: '24px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px', padding: '0 12px' }}>
          {activeTab === 'mine' ? (
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              Henüz kaydettiğiniz şekil yok. Tahtada öğeleri seçip “Kütüphaneye kaydet”e basın.
            </p>
          ) : activeTab === 'school' ? (
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              Okulunuzda henüz paylaşılan şekil yok.
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              Aramanıza uygun şekil yok.
            </p>
          )}
          {search.trim() && activeTab !== 'all' && (
            <p style={{ margin: '6px 0 0', fontSize: '13px' }}>Arama kutusunu temizleyip yeniden deneyin.</p>
          )}
        </div>
      )}

      {/* Şekil ızgarası */}
      {(!isLoadingUserItems || activeTab !== 'mine') && filteredItems.length > 0 && (
        <div className={styles.mediaGrid}>
          {filteredItems.map((item, index) => {
            const isConfigurable = Boolean(item.params && item.params.length > 0);
            const isUserItem = item.source === 'mine';
            const isSchoolItem = item.source === 'school';
            const isMenuOpen = openMenuId === item.id;
            const elements = item.build();
            // Birleşik listede bölüm başlıkları: yalnızca kaydedilmiş şekil varsa gösterilir
            const sectioned = scope === 'builtin' && filteredItems[0]?.source === 'mine';
            const heading = !sectioned ? null
              : index === 0 ? 'Kaydettiklerim'
              : !isUserItem && filteredItems[index - 1].source === 'mine' ? 'Hazır şekiller'
              : null;

            return (
              <React.Fragment key={item.id}>
              {heading && (
                <h4 style={{ gridColumn: '1 / -1', margin: index === 0 ? '0 0 2px' : '10px 0 2px', fontSize: '13px', fontWeight: 600, color: '#58665f' }}>
                  {heading}
                </h4>
              )}
              <div
                className={styles.mediaItem}
                style={{
                  position: 'relative',
                  minHeight: '104px',
                  // Sabit satırlı ızgara: önizleme 80 px, altında ad. Esnek kutuda kareye yakın önizlemeler
                  // bazı tarayıcılarda kartı doldurup adı sıfır yüksekliğe sıkıştırıyordu.
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  gridTemplateRows: '80px auto',
                  justifyItems: 'center',
                  alignContent: 'center',
                  gap: 0,
                  padding: '8px',
                  background: '#ffffff',
                  border: isUserItem ? '1px solid #c8d9cc' : '1px solid #e5e3dc',
                  borderRadius: '10px',
                  cursor: 'grab',
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-board-shape', JSON.stringify({ id: item.id }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onInsert(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onInsert(item.id);
                  }
                }}
                aria-label={`${item.name} şeklini ekle${isConfigurable ? ', ayarlanabilir' : ''}`}
                title={`${item.name} · Tıkla veya sürükleyerek ekle${isConfigurable ? ' (ayarlanabilir)' : ''}`}
              >
                {/* Paylaşıldı rozeti */}
                {isUserItem && (item.visibility === 'school' || item.visibility === 'branch') && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      background: '#e8f4ed',
                      color: '#25634b',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                    title={item.visibility === 'branch' ? 'Zümrenizle paylaşıldı' : 'Okulunuzla paylaşıldı'}
                  >
                    {item.visibility === 'branch' ? 'Zümre' : 'Paylaşıldı'}
                  </span>
                )}

                {/* Ayarlanabilir rozeti */}
                {isConfigurable && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-hidden="true"
                    title="Ayarlanabilir"
                  >
                    <Sliders size={13} />
                  </span>
                )}

                {/* Kullanıcı kayıtları için ⋯ Menü düğmesi */}
                {isUserItem && (
                  <div
                    ref={isMenuOpen ? menuRef : undefined}
                    style={{ position: 'absolute', top: 4, right: 4, zIndex: 5 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(isMenuOpen ? null : item.id);
                      }}
                      style={{
                        background: isMenuOpen ? '#e5e3dc' : 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px',
                        cursor: 'pointer',
                        color: '#4b5563',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Şekil seçenekleri"
                      title="Seçenekler"
                    >
                      <MoreHorizontal size={15} />
                    </button>

                    {isMenuOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: '#ffffff',
                          border: '1px solid #dcd8ce',
                          borderRadius: '8px',
                          boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                          padding: '4px',
                          minWidth: '150px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          zIndex: 20,
                        }}
                      >
                        <button
                          type="button"
                          className={styles.tool}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            justifyContent: 'flex-start',
                            fontSize: '12px',
                            minHeight: '28px',
                            padding: '4px 8px',
                            border: 'none',
                            background: 'transparent',
                          }}
                          onClick={() => {
                            setOpenMenuId(null);
                            onEditItem?.(item, 'name');
                          }}
                        >
                          Yeniden adlandır
                        </button>
                        <button
                          type="button"
                          className={styles.tool}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            justifyContent: 'flex-start',
                            fontSize: '12px',
                            minHeight: '28px',
                            padding: '4px 8px',
                            border: 'none',
                            background: 'transparent',
                          }}
                          onClick={() => {
                            setOpenMenuId(null);
                            onEditItem?.(item, 'category');
                          }}
                        >
                          Kategoriyi değiştir
                        </button>
                        {schoolSharingEnabled && onToggleSchoolShare && (
                          <button
                            type="button"
                            className={styles.tool}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              justifyContent: 'flex-start',
                              fontSize: '12px',
                              minHeight: '28px',
                              padding: '4px 8px',
                              border: 'none',
                              background: 'transparent',
                            }}
                            onClick={() => {
                              setOpenMenuId(null);
                              onToggleSchoolShare(item);
                            }}
                          >
                            {item.visibility === 'school' || item.visibility === 'branch' ? 'Paylaşımı kaldır' : 'Okulumla paylaş'}
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.tool}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            justifyContent: 'flex-start',
                            fontSize: '12px',
                            minHeight: '28px',
                            padding: '4px 8px',
                            border: 'none',
                            background: 'transparent',
                            color: '#a3283a',
                          }}
                          onClick={() => {
                            setOpenMenuId(null);
                            setDeleteConfirmItem(item);
                          }}
                        >
                          <Trash2 size={13} style={{ marginRight: 4 }} />
                          Sil
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Okul parçaları için Kütüphaneme kopyala düğmesi */}
                {isSchoolItem && onCopySchoolItem && (
                  <div
                    style={{ position: 'absolute', top: 4, right: 4, zIndex: 5 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopySchoolItem(item);
                      }}
                      style={{
                        background: '#f4f2eb',
                        border: '1px solid #dcd8ce',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: '#25634b',
                      }}
                      title="Kütüphaneme kopyala"
                    >
                      Kopyala
                    </button>
                  </div>
                )}

                {/* Önizleme alanı */}
                <div style={{ width: '100%', height: '80px', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {elements.length > 0 && <LibraryPreview elements={elements} style={{ height: 80, minWidth: 0, flex: '0 1 100%' }} />}
                </div>

                {/* Şekil adı */}
                <span
                  className={styles.mediaName}
                  style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textAlign: 'center',
                    lineHeight: '1.2',
                    maxWidth: '100%',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                  {isSchoolItem && item.authorName && (
                    <span style={{ display: 'block', fontSize: '10px', color: '#6b7280', fontWeight: 400, marginTop: '2px' }}>
                      · {item.authorName}{item.visibility === 'branch' ? ' · Zümre' : ''}
                    </span>
                  )}
                </span>
              </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Silme onay penceresi */}
      {deleteConfirmItem && (
        <div
          className={styles.confirmOverlay}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirmItem(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setDeleteConfirmItem(null);
          }}
        >
          <div
            className={styles.confirmBox}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="shape-delete-title"
          >
            <h3 id="shape-delete-title">Şekli sil</h3>
            <p>
              “{deleteConfirmItem.name}” silinsin mi? Bu işlem geri alınamaz.
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={() => setDeleteConfirmItem(null)}
                autoFocus
              >
                Vazgeç
              </button>
              <button
                type="button"
                className={styles.confirmDanger}
                onClick={() => {
                  const target = deleteConfirmItem;
                  setDeleteConfirmItem(null);
                  onDeleteItem?.(target);
                }}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
