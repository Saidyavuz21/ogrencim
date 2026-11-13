'use client';

import React, { useState } from 'react';
import { Trash2 } from '../icons';
import { CustomSelect } from '../CustomSelect';
import {
  BAR_MAX,
  BAR_MAX_QUESTIONS,
  BAR_MIN,
  BAR_STEPS,
  BarMode,
  BarOrientation,
  BarStep,
  ClockMode,
  ClockReadInput,
  ClockStep,
  normalizeBarCategories,
  normalizeBarMode,
  normalizeBarOrientation,
  normalizeBarQuestions,
  normalizeBarStep,
  normalizeClockHour,
  normalizeClockMinute,
  normalizeClockMode,
  normalizeClockReadInput,
  normalizeClockStep,
  normalizeNumGridHidden,
  normalizeNumGridRange,
  normalizeNumGridRule,
  normalizeTallyItems,
  normalizeTallyMode,
  NumGridRule,
  TALLY_MAX,
  TALLY_MAX_COUNT,
  TALLY_MIN,
  TallyMode,
  WidgetData,
} from '../../lib/boardData';
import styles from './Board.module.css';

// ============================================================================
// 1. Sütun Grafiği Düzenleyici
// ============================================================================

export function BarChartEditor({
  data,
  onChange,
}: {
  data: WidgetData;
  onChange: (data: WidgetData) => void;
}) {
  const mode = normalizeBarMode(data.barMode);
  const orientation = normalizeBarOrientation(data.barOrientation);
  const step = normalizeBarStep(data.barStep);
  const cats = normalizeBarCategories(data.barCategories);
  const categories = cats.length >= BAR_MIN ? cats : [
    { label: 'Elma', value: 4 },
    { label: 'Armut', value: 6 },
    { label: 'Muz', value: 3 },
  ];
  const qs = normalizeBarQuestions(data.barQuestions);
  const questions = qs.length > 0 ? qs : [{ prompt: 'En yüksek değer hangi kategoride?', answer: '' }];

  const patch = (p: Partial<WidgetData>) => onChange({ ...data, ...p });

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <label>
        Başlık
        <input
          type="text"
          value={data.title ?? 'Sütun Grafiği'}
          maxLength={60}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </label>

      <label>
        Kip
        <CustomSelect
          value={mode}
          onChange={(v) => patch({ barMode: v as BarMode })}
          options={[
            { value: 'show', label: 'Göster' },
            { value: 'draw', label: 'Öğrenci çizsin' },
            { value: 'read', label: 'Öğrenci okusun' },
          ]}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label>
          Yön
          <CustomSelect
            value={orientation}
            onChange={(v) => patch({ barOrientation: v as BarOrientation })}
            options={[
              { value: 'vertical', label: 'Dikey' },
              { value: 'horizontal', label: 'Yatay' },
            ]}
          />
        </label>
        <label>
          Ölçek adımı
          <CustomSelect
            value={String(step)}
            onChange={(v) => patch({ barStep: Number(v) as BarStep })}
            options={BAR_STEPS.map((s) => ({ value: String(s), label: String(s) }))}
          />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label>
          X ekseni adı
          <input
            type="text"
            value={data.barXAxis ?? ''}
            maxLength={40}
            placeholder="Örn. Meyveler"
            onChange={(e) => patch({ barXAxis: e.target.value })}
          />
        </label>
        <label>
          Y ekseni adı
          <input
            type="text"
            value={data.barYAxis ?? ''}
            maxLength={40}
            placeholder="Örn. Adet"
            onChange={(e) => patch({ barYAxis: e.target.value })}
          />
        </label>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#3b4b43' }}>Kategoriler ({categories.length}/{BAR_MAX})</span>
        {categories.map((cat, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 36px', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              value={cat.label}
              maxLength={32}
              placeholder={`Kategori ${idx + 1}`}
              onChange={(e) => {
                const next = categories.map((c, i) => (i === idx ? { ...c, label: e.target.value } : c));
                patch({ barCategories: next });
              }}
            />
            <input
              type="number"
              min={0}
              max={200}
              value={cat.value}
              onChange={(e) => {
                const v = Math.max(0, Math.min(200, Math.round(Number(e.target.value) || 0)));
                const next = categories.map((c, i) => (i === idx ? { ...c, value: v } : c));
                patch({ barCategories: next });
              }}
              aria-label={`${cat.label || `Kategori ${idx + 1}`} değeri`}
            />
            <button
              type="button"
              className={styles.tool}
              disabled={categories.length <= BAR_MIN}
              onClick={() => patch({ barCategories: categories.filter((_, i) => i !== idx) })}
              aria-label="Kategoriyi sil"
              style={{ minWidth: 36, height: 36, padding: 0 }}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        ))}
        {categories.length < BAR_MAX && (
          <button
            type="button"
            className={styles.tool}
            onClick={() => patch({ barCategories: [...categories, { label: `Kategori ${categories.length + 1}`, value: step * 2 }] })}
          >
            + Kategori ekle
          </button>
        )}
      </div>

      {mode === 'read' && (
        <div style={{ display: 'grid', gap: 6, paddingTop: 6, borderTop: '1px solid #eceae2' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#3b4b43' }}>Sorular ({questions.length}/{BAR_MAX_QUESTIONS})</span>
          {questions.map((q, idx) => (
            <div key={idx} style={{ display: 'grid', gap: 4, padding: 8, borderRadius: 8, background: '#faf9f5', border: '1px solid #e5e2d8' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="text"
                  value={q.prompt}
                  maxLength={120}
                  placeholder={`Soru ${idx + 1}`}
                  onChange={(e) => {
                    const next = questions.map((item, i) => (i === idx ? { ...item, prompt: e.target.value } : item));
                    patch({ barQuestions: next });
                  }}
                />
                <button
                  type="button"
                  className={styles.tool}
                  disabled={questions.length <= 1}
                  onClick={() => patch({ barQuestions: questions.filter((_, i) => i !== idx) })}
                  aria-label="Soruyu sil"
                  style={{ minWidth: 34, height: 34, padding: 0 }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
              <input
                type="text"
                value={q.answer}
                maxLength={40}
                placeholder="Doğru cevap"
                onChange={(e) => {
                  const next = questions.map((item, i) => (i === idx ? { ...item, answer: e.target.value } : item));
                  patch({ barQuestions: next });
                }}
              />
            </div>
          ))}
          {questions.length < BAR_MAX_QUESTIONS && (
            <button
              type="button"
              className={styles.tool}
              onClick={() => patch({ barQuestions: [...questions, { prompt: '', answer: '' }] })}
            >
              + Soru ekle
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. Çetele Tablosu Düzenleyici
// ============================================================================

export function TallyEditor({
  data,
  onChange,
  onConvertToBar,
}: {
  data: WidgetData;
  onChange: (data: WidgetData) => void;
  onConvertToBar?: () => void;
}) {
  const mode = normalizeTallyMode(data.tallyMode);
  const raw = normalizeTallyItems(data.tallyItems);
  const items = raw.length >= TALLY_MIN ? raw : [
    { label: 'Kırmızı', count: 7 },
    { label: 'Mavi', count: 5 },
    { label: 'Yeşil', count: 9 },
  ];

  const patch = (p: Partial<WidgetData>) => onChange({ ...data, ...p });

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <label>
        Başlık
        <input
          type="text"
          value={data.title ?? 'Çetele Tablosu'}
          maxLength={60}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </label>

      <label>
        Kip
        <CustomSelect
          value={mode}
          onChange={(v) => patch({ tallyMode: v as TallyMode })}
          options={[
            { value: 'show', label: 'Göster' },
            { value: 'tally', label: 'Öğrenci çetele tutsun' },
            { value: 'count', label: 'Öğrenci saysın' },
          ]}
        />
      </label>

      <div style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#3b4b43' }}>Kategoriler ({items.length}/{TALLY_MAX})</span>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 68px 36px', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              value={item.label}
              maxLength={32}
              placeholder={`Kategori ${idx + 1}`}
              onChange={(e) => {
                const next = items.map((t, i) => (i === idx ? { ...t, label: e.target.value } : t));
                patch({ tallyItems: next });
              }}
            />
            <input
              type="number"
              min={0}
              max={TALLY_MAX_COUNT}
              value={item.count}
              onChange={(e) => {
                const v = Math.max(0, Math.min(TALLY_MAX_COUNT, Math.round(Number(e.target.value) || 0)));
                const next = items.map((t, i) => (i === idx ? { ...t, count: v } : t));
                patch({ tallyItems: next });
              }}
              aria-label={`${item.label || `Kategori ${idx + 1}`} sayısı`}
            />
            <button
              type="button"
              className={styles.tool}
              disabled={items.length <= TALLY_MIN}
              onClick={() => patch({ tallyItems: items.filter((_, i) => i !== idx) })}
              aria-label="Kategoriyi sil"
              style={{ minWidth: 36, height: 36, padding: 0 }}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        ))}
        {items.length < TALLY_MAX && (
          <button
            type="button"
            className={styles.tool}
            onClick={() => patch({ tallyItems: [...items, { label: `Kategori ${items.length + 1}`, count: 5 }] })}
          >
            + Kategori ekle
          </button>
        )}
      </div>

      {onConvertToBar && (
        <button type="button" className={styles.tool} onClick={onConvertToBar}>
          Sütun grafiğine çevir
        </button>
      )}
    </div>
  );
}

// ============================================================================
// 3. Sayı Tablosu Düzenleyici
// ============================================================================

export function NumGridEditor({
  data,
  onChange,
}: {
  data: WidgetData;
  onChange: (data: WidgetData) => void;
}) {
  const { start, end } = normalizeNumGridRange(data.numGridStart, data.numGridEnd);
  const hidden = normalizeNumGridHidden(data.numGridHidden, start, end);
  const hiddenSet = new Set(hidden);
  const rule = normalizeNumGridRule(data.numGridRule);
  const [randomN, setRandomN] = useState(10);

  const patch = (p: Partial<WidgetData>) => onChange({ ...data, ...p });

  const setRange = (nextStart: number, nextEnd: number) => {
    const norm = normalizeNumGridRange(nextStart, nextEnd);
    patch({
      numGridStart: norm.start,
      numGridEnd: norm.end,
      numGridHidden: normalizeNumGridHidden(hidden, norm.start, norm.end),
    });
  };

  const toggleHidden = (n: number) => {
    const next = new Set(hiddenSet);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    patch({ numGridHidden: Array.from(next).sort((a, b) => a - b) });
  };

  const hideRandom = () => {
    const pool: number[] = [];
    for (let n = start; n <= end; n += 1) pool.push(n);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const count = Math.max(1, Math.min(pool.length, randomN));
    patch({ numGridHidden: pool.slice(0, count).sort((a, b) => a - b) });
  };

  const cells: number[] = [];
  for (let n = start; n <= end; n += 1) cells.push(n);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <label>
        Başlık
        <input
          type="text"
          value={data.title ?? 'Sayı Tablosu'}
          maxLength={60}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label>
          Başlangıç
          <input
            type="number"
            min={0}
            max={900}
            value={start}
            onChange={(e) => setRange(Number(e.target.value) || 0, end)}
          />
        </label>
        <label>
          Bitiş (en fazla 200 hücre)
          <input
            type="number"
            min={start}
            max={start + 199}
            value={end}
            onChange={(e) => setRange(start, Number(e.target.value) || start)}
          />
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button type="button" className={styles.tool} onClick={() => setRange(1, 100)} style={{ height: 32, fontSize: 12 }}>1–100</button>
        <button type="button" className={styles.tool} onClick={() => setRange(0, 99)} style={{ height: 32, fontSize: 12 }}>0–99</button>
        <button type="button" className={styles.tool} onClick={() => setRange(1, 120)} style={{ height: 32, fontSize: 12 }}>1–120</button>
        <button type="button" className={styles.tool} onClick={() => setRange(101, 200)} style={{ height: 32, fontSize: 12 }}>101–200</button>
      </div>

      <label>
        Boyama kontrol kuralı
        <CustomSelect
          value={rule}
          onChange={(v) => patch({ numGridRule: v as NumGridRule })}
          options={[
            { value: 'none', label: 'Serbest boyama' },
            { value: 'mult2', label: "2'nin katlarını boya" },
            { value: 'mult5', label: "5'in katlarını boya" },
            { value: 'mult10', label: "10'un katlarını boya" },
            { value: 'even', label: 'Çift sayıları boya' },
            { value: 'odd', label: 'Tek sayıları boya' },
          ]}
        />
      </label>

      <div style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#3b4b43' }}>Gizli hücreler ({hidden.length})</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number"
            min={1}
            max={cells.length}
            value={randomN}
            onChange={(e) => setRandomN(Math.max(1, Math.min(cells.length, Math.round(Number(e.target.value) || 1))))}
            style={{ width: 64 }}
            aria-label="Rastgele gizlenecek hücre sayısı"
          />
          <button type="button" className={styles.tool} onClick={hideRandom} style={{ height: 34, fontSize: 12 }}>
            Rastgele gizle
          </button>
          {hidden.length > 0 && (
            <button type="button" className={styles.tool} onClick={() => patch({ numGridHidden: [] })} style={{ height: 34, fontSize: 12 }}>
              Tümünü göster
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: 2, maxHeight: 160, overflowY: 'auto', padding: 4, border: '1px solid #e5e2d8', borderRadius: 8, background: '#faf9f5' }}>
          {cells.map((n) => {
            const isHidden = hiddenSet.has(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggleHidden(n)}
                aria-pressed={isHidden}
                style={{
                  padding: '2px 0',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: isHidden ? '#25634b' : '#dedad0',
                  background: isHidden ? '#25634b' : '#fff',
                  color: isHidden ? '#fff' : '#2b3932',
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. Etkileşimli Saat Düzenleyici
// ============================================================================

export function ClockEditor({
  data,
  onChange,
}: {
  data: WidgetData;
  onChange: (data: WidgetData) => void;
}) {
  const mode = normalizeClockMode(data.clockMode);
  const hour = normalizeClockHour(data.clockHour, 3);
  const minute = normalizeClockMinute(data.clockMinute, 0);
  const targetHour = normalizeClockHour(data.clockTargetHour, 3);
  const targetMinute = normalizeClockMinute(data.clockTargetMinute, 30);
  const step = normalizeClockStep(data.clockStep);
  const readInput = normalizeClockReadInput(data.clockReadInput);

  const patch = (p: Partial<WidgetData>) => onChange({ ...data, ...p });

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <label>
        Başlık
        <input
          type="text"
          value={data.title ?? 'Saat'}
          maxLength={60}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </label>

      <label>
        Kip
        <CustomSelect
          value={mode}
          onChange={(v) => patch({ clockMode: v as ClockMode })}
          options={[
            { value: 'free', label: 'Serbest' },
            { value: 'set', label: 'Saati kur' },
            { value: 'read', label: 'Saat kaç?' },
          ]}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label>
          {mode === 'read' ? 'Gösterilen saat' : 'Başlangıç saati'}
          <input
            type="number"
            min={1}
            max={12}
            value={hour}
            onChange={(e) => patch({ clockHour: normalizeClockHour(Number(e.target.value) || 1, 3) })}
          />
        </label>
        <label>
          {mode === 'read' ? 'Gösterilen dakika' : 'Başlangıç dakikası'}
          <input
            type="number"
            min={0}
            max={59}
            value={minute}
            onChange={(e) => patch({ clockMinute: normalizeClockMinute(Number(e.target.value) || 0, 0) })}
          />
        </label>
      </div>

      {mode === 'set' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label>
            Hedef saat
            <input
              type="number"
              min={1}
              max={12}
              value={targetHour}
              onChange={(e) => patch({ clockTargetHour: normalizeClockHour(Number(e.target.value) || 1, 3) })}
            />
          </label>
          <label>
            Hedef dakika
            <input
              type="number"
              min={0}
              max={59}
              value={targetMinute}
              onChange={(e) => patch({ clockTargetMinute: normalizeClockMinute(Number(e.target.value) || 0, 30) })}
            />
          </label>
        </div>
      )}

      {mode !== 'read' && (
        <label>
          Dakika adımı
          <CustomSelect
            value={String(step)}
            onChange={(v) => patch({ clockStep: Number(v) as ClockStep })}
            options={[
              { value: '5', label: '5 dakika' },
              { value: '1', label: '1 dakika' },
            ]}
          />
        </label>
      )}

      {mode === 'read' && (
        <label>
          Cevap türü
          <CustomSelect
            value={readInput}
            onChange={(v) => patch({ clockReadInput: v as ClockReadInput })}
            options={[
              { value: 'box', label: 'Saat ve dakika kutusu' },
              { value: 'choice', label: '4 seçenek' },
            ]}
          />
        </label>
      )}

      {mode === 'free' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={data.clockShowDigital !== false}
              onChange={(e) => patch({ clockShowDigital: e.target.checked })}
            />
            <span>Dijital gösterge başlangıçta açık</span>
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={data.clockShowTurkish === true}
              onChange={(e) => patch({ clockShowTurkish: e.target.checked })}
            />
            <span>Türkçe okunuş başlangıçta açık</span>
          </label>
        </div>
      )}
    </div>
  );
}

