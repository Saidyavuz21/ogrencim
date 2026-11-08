'use client';

import React, { useEffect, useState } from 'react';
import type katexType from 'katex';
import 'katex/dist/katex.min.css';
import { hasMath, splitMath } from '../../lib/math/parseMath';

// Modül düzeyinde tek bir Promise ve yüklenmiş modül önbelleği
let katexPromise: Promise<typeof katexType> | null = null;
let katexModule: typeof katexType | null = null;
const listeners = new Set<() => void>();

export function loadKatex(): Promise<typeof katexType> {
  if (katexModule) return Promise.resolve(katexModule);
  if (!katexPromise) {
    katexPromise = import('katex').then((mod) => {
      katexModule = (mod as unknown as { default?: typeof katexType }).default || mod;
      listeners.forEach((fn) => fn());
      return katexModule;
    });
  }
  return katexPromise;
}

export function getLoadedKatex(): typeof katexType | null {
  return katexModule;
}

export interface MathTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  inline?: boolean;
}

export function MathText({ text, className, style, inline = true }: MathTextProps) {
  const containsMath = hasMath(text);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!containsMath || katexModule) return;
    const update = () => setTick((t) => t + 1);
    listeners.add(update);
    loadKatex();
    return () => {
      listeners.delete(update);
    };
  }, [containsMath]);

  // Metinde hiç formül yoksa doğrudan metin olarak dön (KaTeX JS hiç yüklenmez)
  if (!containsMath) {
    return (
      <span className={className} style={style}>
        {text}
      </span>
    );
  }

  const segments = splitMath(text);
  const katex = katexModule;

  const content = segments.map((seg, idx) => {
    if (seg.kind === 'text') {
      return <React.Fragment key={idx}>{seg.value}</React.Fragment>;
    }

    // KaTeX formül parçası
    if (!katex) {
      // Yüklenene kadar ham metin soluk gösterilir
      return (
        <span key={idx} style={{ opacity: 0.6, fontStyle: 'italic' }}>
          ${seg.value}$
        </span>
      );
    }

    try {
      const html = katex.renderToString(seg.value, {
        throwOnError: false,
        trust: false,
        strict: 'ignore',
        maxSize: 10,
        maxExpand: 100,
        output: 'html',
      });
      return (
        <span
          key={idx}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return (
        <span key={idx} style={{ color: '#e03131' }}>
          ${seg.value}$
        </span>
      );
    }
  });

  const Tag = inline ? 'span' : 'div';
  return (
    <Tag className={className} style={style}>
      {content}
    </Tag>
  );
}
