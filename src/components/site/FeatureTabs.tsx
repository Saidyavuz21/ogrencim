'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import styles from './FeatureTabs.module.css';

interface FeatureTab {
  id: string;
  label: string;
  content: ReactNode;
}

export function FeatureTabs({ tabs }: { tabs: FeatureTab[] }) {
  const [active, setActive] = useState(0);
  const prefix = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const syncHash = () => {
      const index = tabs.findIndex(tab => `#${tab.id}` === window.location.hash);
      if (index >= 0) setActive(index);
    };
    queueMicrotask(syncHash);
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [tabs]);

  function select(index: number, focus = false) {
    setActive(index);
    window.history.replaceState(null, '', `#${tabs[index].id}`);
    if (focus) buttons.current[index]?.focus();
  }

  return (
    <div>
      <div className={styles.tabs} role="tablist" aria-label="Özellikler">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={element => { buttons.current[index] = element; }}
            type="button"
            role="tab"
            id={`${prefix}-${tab.id}`}
            aria-controls={tab.id}
            aria-selected={active === index}
            tabIndex={active === index ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={event => {
              const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
                : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
              if (next === null) return;
              event.preventDefault();
              select(next, true);
            }}
          >{tab.label}</button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div key={tab.id} id={tab.id} role="tabpanel" aria-labelledby={`${prefix}-${tab.id}`} hidden={active !== index} tabIndex={0} className={styles.panel}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
