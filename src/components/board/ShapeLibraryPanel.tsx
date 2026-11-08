'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, MoreHorizontal, Sliders, Trash2 } from '../icons';
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

export interface ShapeLibraryPanelProps {
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
  const [activeTab, setActiveTab] = useState<ShapeFilterTab>('all');
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

  // Tüm liste: önce kullanıcının kendi kayıtları, sonra okul kayıtları (varsa), sonra hazır parçalar
  const allItems = useMemo(() => {
    return [...userItems, ...schoolItems, ...LIBRARY_ITEMS];
  }, [userItems, schoolItems]);

  const filteredItems = useMemo(() => {
    const query = normalizeSearch(search.trim());

    let base: LibraryItem[] = [];
    if (activeTab === 'mine') {
      base = userItems;
    } else if (activeTab === 'school') {
      base = schoolItems;
    } else if (activeTab === 'all') {
      base = allItems;
    } else {
      base = allItems.filter((it) => it.category === activeTab);
    }

    if (!query) return base;

    return base.filter((item) => {
      const normName = normalizeSearch(item.name);
      if (normName.includes(query)) return true;
      if (item.keywords && item.keywords.some((kw) => normalizeSearch(kw).includes(query))) {
        return true;
      }
      return false;
    });
  }, [search, activeTab, userItems, schoolItems, allItems]);

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

      {/* Kategori ve alan filtre çipleri */}
      <div
        className={styles.pageTools}
        style={{ flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}
        role="group"
        aria-label="Kategori filtresi"
      >
        <button
          type="button"
          className={styles.tool}
          aria-pressed={activeTab === 'mine'}
          onClick={() => setActiveTab('mine')}
          style={{
            minHeight: '32px',
            fontSize: '13px',
            fontWeight: activeTab === 'mine' ? 700 : 500,
          }}
        >
          <Bookmark size={13} aria-hidden="true" style={{ marginRight: 2 }} />
          Kütüphanem
        </button>

        {schoolSharingEnabled && (
          <button
            type="button"
            className={styles.tool}
            aria-pressed={activeTab === 'school'}
            onClick={() => setActiveTab('school')}
            style={{
              minHeight: '32px',
              fontSize: '13px',
              fontWeight: activeTab === 'school' ? 700 : 500,
            }}
          >
            Okulum
          </button>
        )}

        <button
          type="button"
          className={styles.tool}
          aria-pressed={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          style={{ minHeight: '32px', fontSize: '13px' }}
        >
          Tümü
        </button>

        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={styles.tool}
            aria-pressed={activeTab === cat}
            onClick={() => setActiveTab(cat)}
            style={{ minHeight: '32px', fontSize: '13px' }}
          >
            {LIBRARY_CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

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
      {!isLoadingUserItems && !userItemsError && filteredItems.length === 0 && (
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
        </div>
      )}

      {/* Şekil ızgarası */}
      {(!isLoadingUserItems || activeTab !== 'mine') && filteredItems.length > 0 && (
        <div className={styles.mediaGrid}>
          {filteredItems.map((item) => {
            const isConfigurable = Boolean(item.params && item.params.length > 0);
            const isUserItem = item.source === 'mine';
            const isSchoolItem = item.source === 'school';
            const isMenuOpen = openMenuId === item.id;
            const elements = item.build();

            return (
              <div
                key={item.id}
                className={styles.mediaItem}
                style={{
                  position: 'relative',
                  minHeight: '104px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
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
                {isUserItem && item.visibility === 'school' && (
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
                    title="Okulunuzla paylaşıldı"
                  >
                    Paylaşıldı
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
                            {item.visibility === 'school' ? 'Paylaşımı kaldır' : 'Okulumla paylaş'}
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
                <div style={{ width: '100%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {elements.length > 0 && <LibraryPreview elements={elements} />}
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
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                  {isSchoolItem && item.authorName && (
                    <span style={{ display: 'block', fontSize: '10px', color: '#6b7280', fontWeight: 400, marginTop: '2px' }}>
                      · {item.authorName}
                    </span>
                  )}
                </span>
              </div>
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
