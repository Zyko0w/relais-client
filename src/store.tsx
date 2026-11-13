import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { deleteImage, persistImage, uid } from './files';
import { recognize } from './ocr';
import type { Item, ItemImage, Settings, Source } from './types';

const ITEMS_KEY = 'relais.items.v1';
const SETTINGS_KEY = 'relais.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  recipients: '',
  subjectTemplate: 'Demande client – {client} – {date}',
  autoOcr: true,
  ocrEngine: 'auto',
  ocrSpaceKey: 'helloworld',
  ocrLanguage: 'fre',
  includeMessageText: true,
  includeOcrText: true,
  attachImages: true,
  markAsSent: true,
  retentionDays: 30,
  defaultPeriod: '1h',
};

export type NewItem = {
  source: Source;
  sender?: string;
  text?: string;
  imageUris?: string[];
  receivedAt?: number;
  externalId?: string;
};

type Store = {
  ready: boolean;
  items: Item[];
  settings: Settings;
  addItem: (n: NewItem) => Item;
  updateItem: (id: string, patch: Partial<Item>) => void;
  updateImageText: (itemId: string, imageId: string, text: string) => void;
  deleteItems: (ids: string[]) => void;
  removeImage: (itemId: string, imageId: string) => void;
  runOcr: (itemId: string, imageId?: string) => void;
  markSent: (ids: string[]) => void;
  hasExternal: (externalId: string) => boolean;
  updateSettings: (patch: Partial<Settings>) => void;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider manquant');
  return s;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // ----- chargement -----
  useEffect(() => {
    (async () => {
      try {
        const [rawItems, rawSettings] = await Promise.all([
          AsyncStorage.getItem(ITEMS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);
        const s: Settings = { ...DEFAULT_SETTINGS, ...(rawSettings ? JSON.parse(rawSettings) : {}) };
        let list: Item[] = rawItems ? JSON.parse(rawItems) : [];
        // OCR interrompus => à relancer
        list = list.map((i) => ({
          ...i,
          images: i.images.map((img) => (img.ocrStatus === 'pending' ? { ...img, ocrStatus: 'none' } : img)),
        }));
        // nettoyage automatique
        if (s.retentionDays > 0) {
          const limit = Date.now() - s.retentionDays * 86_400_000;
          const old = list.filter((i) => i.addedAt < limit);
          old.forEach((i) => i.images.forEach((img) => deleteImage(img.uri)));
          list = list.filter((i) => i.addedAt >= limit);
        }
        setSettings(s);
        setItems(list);
      } catch (e) {
        console.warn('Chargement impossible', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // ----- sauvegarde -----
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [items, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, ready]);

  // ----- OCR (file d'attente séquentielle) -----
  const queue = useRef<{ itemId: string; imageId: string }[]>([]);
  const running = useRef(false);

  const patchImage = useCallback((itemId: string, imageId: string, patch: Partial<ItemImage>) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id !== itemId ? i : { ...i, images: i.images.map((img) => (img.id === imageId ? { ...img, ...patch } : img)) }
      )
    );
  }, []);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const job = queue.current.shift()!;
      const item = itemsRef.current.find((i) => i.id === job.itemId);
      const img = item?.images.find((m) => m.id === job.imageId);
      if (!img) continue;
      try {
        const text = await recognize(img.uri, settingsRef.current);
        patchImage(job.itemId, job.imageId, { ocrStatus: 'done', ocrText: text, ocrError: undefined });
      } catch (e: any) {
        patchImage(job.itemId, job.imageId, { ocrStatus: 'error', ocrError: String(e?.message ?? e) });
      }
    }
    running.current = false;
  }, [patchImage]);

  const enqueue = useCallback(
    (jobs: { itemId: string; imageId: string }[]) => {
      jobs.forEach((j) => patchImage(j.itemId, j.imageId, { ocrStatus: 'pending', ocrError: undefined }));
      queue.current.push(...jobs);
      // laisse React appliquer l'état avant de lire itemsRef
      setTimeout(pump, 50);
    },
    [patchImage, pump]
  );

  // ----- actions -----
  const addItem = useCallback(
    (n: NewItem): Item => {
      const now = Date.now();
      const images: ItemImage[] = (n.imageUris ?? []).map((u) => ({
        id: uid('im_'),
        uri: persistImage(u),
        ocrStatus: 'none',
      }));
      const item: Item = {
        id: uid('it_'),
        receivedAt: n.receivedAt ?? now,
        addedAt: now,
        source: n.source,
        sender: n.sender?.trim() || undefined,
        text: n.text?.trim() || undefined,
        images,
        externalId: n.externalId,
      };
      setItems((prev) => [item, ...prev].sort((a, b) => b.receivedAt - a.receivedAt));
      itemsRef.current = [item, ...itemsRef.current];
      if (settingsRef.current.autoOcr && images.length) {
        enqueue(images.map((img) => ({ itemId: item.id, imageId: img.id })));
      }
      return item;
    },
    [enqueue]
  );

  const updateItem = useCallback((id: string, patch: Partial<Item>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i)).sort((a, b) => b.receivedAt - a.receivedAt)
    );
  }, []);

  const updateImageText = useCallback(
    (itemId: string, imageId: string, text: string) => patchImage(itemId, imageId, { ocrText: text, ocrStatus: 'done' }),
    [patchImage]
  );

  const deleteItems = useCallback((ids: string[]) => {
    const set = new Set(ids);
    itemsRef.current.filter((i) => set.has(i.id)).forEach((i) => i.images.forEach((img) => deleteImage(img.uri)));
    setItems((prev) => prev.filter((i) => !set.has(i.id)));
  }, []);

  const removeImage = useCallback((itemId: string, imageId: string) => {
    const img = itemsRef.current.find((i) => i.id === itemId)?.images.find((m) => m.id === imageId);
    if (img) deleteImage(img.uri);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, images: i.images.filter((m) => m.id !== imageId) } : i))
    );
  }, []);

  const runOcr = useCallback(
    (itemId: string, imageId?: string) => {
      const item = itemsRef.current.find((i) => i.id === itemId);
      if (!item) return;
      const imgs = imageId ? item.images.filter((m) => m.id === imageId) : item.images;
      enqueue(imgs.map((m) => ({ itemId, imageId: m.id })));
    },
    [enqueue]
  );

  const markSent = useCallback((ids: string[]) => {
    const set = new Set(ids);
    const now = Date.now();
    setItems((prev) => prev.map((i) => (set.has(i.id) ? { ...i, sentAt: now } : i)));
  }, []);

  const hasExternal = useCallback(
    (externalId: string) => itemsRef.current.some((i) => i.externalId === externalId),
    []
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);

  const value = useMemo<Store>(
    () => ({
      ready,
      items,
      settings,
      addItem,
      updateItem,
      updateImageText,
      deleteItems,
      removeImage,
      runOcr,
      markSent,
      hasExternal,
      updateSettings,
    }),
    [ready, items, settings, addItem, updateItem, updateImageText, deleteItems, removeImage, runOcr, markSent, hasExternal, updateSettings]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
