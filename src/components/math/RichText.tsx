'use client';

import React, { useEffect, useState } from 'react';
import 'katex/dist/katex.min.css';
import { parseRich, hasRich } from '../../lib/math/parseRich';
import { hasMath } from '../../lib/math/parseMath';
import { getLoadedKatex, loadKatex, subscribeKatex } from './MathText';

export interface RichTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  inline?: boolean;
}

export function RichText({ text, className, style, inline = false }: RichTextProps) {
  const containsMath = hasMath(text);
  const containsRich = hasRich(text);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!containsMath || getLoadedKatex()) return;
    const unsubscribe = subscribeKatex(() => setTick((t) => t + 1));
    loadKatex();
    return () => {
      unsubscribe();
    };
  }, [containsMath]);

  // Ne formül ne de zengin metin varsa düz metin olarak dön
  if (!containsMath && !containsRich) {
    if (inline) {
      return (
        <span className={className} style={style}>
          {text}
        </span>
      );
    }
    return (
      <div className={className} style={style}>
        {text.split('\n').map((line, i) => (
          <div key={i} style={{ minHeight: '1.2em' }}>
            {line || '\u00A0'}
          </div>
        ))}
      </div>
    );
  }

  const lines = parseRich(text);
  const katex = getLoadedKatex();

  const renderRun = (run: (typeof lines)[0]['runs'][0], idx: number) => {
    const runStyle: React.CSSProperties = {};
    if (run.bold) runStyle.fontWeight = 700;
    if (run.italic) runStyle.fontStyle = 'italic';
    if (run.underline) runStyle.textDecoration = 'underline';
    if (run.color) runStyle.color = run.color;
    if (run.highlight) {
      runStyle.backgroundColor = run.highlight;
      runStyle.padding = '0 0.1em';
      runStyle.borderRadius = '0.15em';
      runStyle.boxDecorationBreak = 'clone';
      (runStyle as Record<string, unknown>).WebkitBoxDecorationBreak = 'clone';
    }

    if (run.math !== undefined) {
      if (!katex) {
        return (
          <span key={idx} style={{ ...runStyle, opacity: 0.6, fontStyle: 'italic' }}>
            ${run.math}$
          </span>
        );
      }
      try {
        const html = katex.renderToString(run.math, {
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
            style={runStyle}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return (
          <span key={idx} style={{ ...runStyle, color: '#e03131' }}>
            ${run.math}$
          </span>
        );
      }
    }

    return (
      <span key={idx} style={runStyle}>
        {run.text}
      </span>
    );
  };

  // Tek satırlık ve liste olmayan inline gösterim
  if (inline && lines.length <= 1 && !lines[0]?.list) {
    const singleLine = lines[0];
    return (
      <span className={className} style={style}>
        {singleLine ? singleLine.runs.map(renderRun) : null}
      </span>
    );
  }

  return (
    <div className={className} style={style}>
      {lines.map((line, lIdx) => {
        const isBullet = line.list === 'bullet';
        const isNumber = line.list === 'number';

        const lineStyle: React.CSSProperties = {
          minHeight: '1.2em',
        };

        if (isBullet || isNumber) {
          lineStyle.paddingLeft = '1.4em';
          lineStyle.textIndent = '-1.4em';
        }

        return (
          <div key={lIdx} style={lineStyle}>
            {isBullet && (
              <span
                style={{
                  display: 'inline-block',
                  width: '1.4em',
                  textAlign: 'center',
                }}
              >
                {line.marker || '•'}
              </span>
            )}
            {isNumber && (
              <span
                style={{
                  display: 'inline-block',
                  width: '1.4em',
                  textAlign: 'right',
                  paddingRight: '0.3em',
                  boxSizing: 'border-box',
                }}
              >
                {line.marker}
              </span>
            )}
            {line.runs.length > 0 ? (
              line.runs.map(renderRun)
            ) : (
              '\u00A0'
            )}
          </div>
        );
      })}
    </div>
  );
}

