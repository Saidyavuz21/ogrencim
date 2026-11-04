'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { listMessages, MessageRow } from './teacherData';

const FALLBACK_MS = 30000;

/**
 * Konuşmaların mesajlarını getirir ve Supabase Realtime ile canlı tutar.
 * Yetki RLS ile sağlanır: abone yalnızca okuyabildiği konuşmaların olaylarını alır.
 */
export function useLiveMessages(conversationIds: string[]) {
  const key = conversationIds.join('|');
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const refresh = useCallback(async () => {
    const ids = key ? key.split('|') : [];
    const res = await listMessages(ids);
    if (res.ok) {
      setMessages(res.data);
      setError(null);
    } else {
      setError(res.error);
    }
  }, [key]);

  useEffect(() => {
    const ids = new Set(key ? key.split('|') : []);
    if (!ids.size) return;
    let alive = true;
    const load = () => { if (alive) refresh(); };
    const first = setTimeout(load, 0);

    const channel = supabase
      .channel(`messages-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as MessageRow;
        if (!row?.id || !ids.has(row.conversation_id)) return;
        setMessages((prev) => {
          const i = prev.findIndex((m) => m.id === row.id);
          if (i === -1) return [...prev, row].sort((a, b) => a.created_at.localeCompare(b.created_at));
          const next = prev.slice();
          next[i] = { ...prev[i], ...row };
          return next;
        });
      })
      .subscribe((status) => {
        if (!alive) return;
        setLive(status === 'SUBSCRIBED');
        // Yeniden bağlanınca aradaki mesajları kaçırmamak için tazele
        if (status === 'SUBSCRIBED') load();
      });

    const fallback = setInterval(load, FALLBACK_MS);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [key, refresh]);

  return { messages, error, live, refresh };
}
