import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ItemCard } from '../components/ItemCard';
import { PeriodBar } from '../components/PeriodBar';
import {
  Banner,
  Btn,
  C,
  Chip,
  EmptyState,
  FAB,
  Icon,
  IconButton,
  IconName,
  RADIUS,
  SearchInput,
  Segmented,
  shadow,
} from '../components/ui';
import { isExpoGo } from '../native';
import { filterByPeriod, periodLabel, relativeTime } from '../periods';
import { useStore } from '../store';
import type { Item, PeriodState, Source } from '../types';
import type { Thread } from './ConversationScreen';

/** retire les accents + minuscule, pour une recherche tolérante (Dupont = dupont = Dûpont) */
const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/[àâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ûüù]/g, 'u')
    .replace(/ç/g, 'c');

const haystack = (it: Item) => fold([it.sender ?? '', it.text ?? '', ...it.images.map((m) => m.ocrText ?? '')].join(' '));

const QUICK: { source: Source; label: string; icon: IconName }[] = [
  { source: 'gallery', label: 'Galerie', icon: 'image' },
  { source: 'camera', label: 'Photo', icon: 'camera' },
  { source: 'clipboard', label: 'Coller', icon: 'clipboard' },
  { source: 'manual', label: 'Texte', icon: 'edit-3' },
];

type View2 = 'all' | 'threads';

export function HomeScreen({
  period,
  setPeriod,
  onOpen,
  onNew,
  onSend,
  onOpenThread,
}: {
  period: PeriodState;
  setPeriod: (p: PeriodState) => void;
  onOpen: (id: string) => void;
  onNew: (source: Source) => void;
  onSend: (ids: string[], periodText: string) => void;
  onOpenThread: (t: Thread) => void;
}) {
  const { items, deleteItems, runOcr } = useStore();
  const [view, setView] = useState<View2>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [sender, setSender] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const senders = useMemo(
    () => Array.from(new Set(items.map((i) => i.sender).filter(Boolean) as string[])),
    [items]
  );

  // ---- Vue « Messages » (liste à plat) ----
  const visible = useMemo(() => {
    let list = filterByPeriod(items, period);
    if (onlyUnsent) list = list.filter((i) => !i.sentAt);
    if (sender) list = list.filter((i) => i.sender === sender);
    const q = fold(query.trim());
    if (q) list = list.filter((i) => haystack(i).includes(q));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, period, onlyUnsent, sender, query, tick]);

  // ---- Vue « Conversations » (groupées par contact) ----
  const conversations = useMemo(() => {
    const map = new Map<string, { key: string | null; label: string; items: Item[] }>();
    for (const it of items) {
      const id = it.sender ?? '__none__';
      let c = map.get(id);
      if (!c) {
        c = { key: it.sender ?? null, label: it.sender ?? 'Sans nom', items: [] };
        map.set(id, c);
      }
      c.items.push(it);
    }
    let arr = Array.from(map.values());
    arr.forEach((c) => c.items.sort((a, b) => b.receivedAt - a.receivedAt));
    const q = fold(query.trim());
    if (q) arr = arr.filter((c) => fold(c.label).includes(q) || c.items.some((it) => haystack(it).includes(q)));
    arr.sort((a, b) => b.items[0].receivedAt - a.items[0].receivedAt);
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, tick]);

  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(visible.map((i) => i.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visible]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const allSelected = visible.length > 0 && selected.size === visible.length;
  const target = selected.size ? visible.filter((i) => selected.has(i.id)) : visible;
  const failed = Array.from(
    new Set(visible.filter((i) => i.images.some((m) => m.ocrStatus === 'error' || m.ocrStatus === 'none')).map((i) => i.id))
  );
  const pText = periodLabel(period) + (sender ? ` – ${sender}` : '') + (onlyUnsent ? ' – non envoyés' : '');

  const del = () =>
    Alert.alert(`Supprimer ${selected.size} message(s) ?`, '', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteItems([...selected]);
          setSelected(new Set());
        },
      },
    ]);

  const pick = (source: Source) => {
    setMenu(false);
    onNew(source);
  };

  const noData = items.length === 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 2 }}>
        {isExpoGo ? (
          <Banner
            tone="warn"
            text="Mode Expo Go : le partage depuis WhatsApp/SMS, la lecture SMS/MMS et l'OCR hors ligne ne sont dispo que dans l'APK. Ici l'OCR passe par OCR.space (en ligne)."
          />
        ) : null}

        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={view === 'threads' ? 'Rechercher une conversation…' : 'Rechercher un client (nom ou numéro)…'}
        />

        <View style={{ marginTop: 10 }}>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { key: 'all', label: 'Messages', icon: 'inbox' },
              { key: 'threads', label: 'Conversations', icon: 'message-square' },
            ]}
          />
        </View>

        {view === 'all' ? (
          <>
            <View style={{ marginTop: 10 }}>
              <PeriodBar value={period} onChange={setPeriod} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ paddingVertical: 2 }}>
              <Chip label="Non envoyés" icon={onlyUnsent ? 'check' : 'send'} active={onlyUnsent} onPress={() => setOnlyUnsent((v) => !v)} />
              {senders.length > 1 || sender
                ? senders.map((sName) => (
                    <Chip key={sName} label={sName} icon="user" active={sender === sName} onPress={() => setSender(sender === sName ? null : sName)} />
                  ))
                : null}
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 }}>
              <Text style={{ color: C.sub, fontWeight: '700', fontSize: 13 }}>
                {visible.length} message{visible.length > 1 ? 's' : ''}
              </Text>
              {visible.length ? (
                <Pressable onPress={() => setSelected(allSelected ? new Set() : new Set(visible.map((i) => i.id)))} hitSlop={8}>
                  <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>
                    {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : (
          <View style={{ marginTop: 14, marginBottom: 8 }}>
            <Text style={{ color: C.sub, fontWeight: '700', fontSize: 13 }}>
              {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {view === 'all' ? (
        <FlatList
          data={visible}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ItemCard item={item} selected={selected.has(item.id)} onToggle={() => toggle(item.id)} onOpen={() => onOpen(item.id)} />
          )}
          ListEmptyComponent={
            query || sender || onlyUnsent ? (
              <EmptyState icon="search" title="Aucun résultat" subtitle="Essayez un autre nom, numéro ou période." />
            ) : (
              <EmptyState
                icon="inbox"
                title="Aucun message sur cette période"
                subtitle="Depuis WhatsApp / Messages : appui long → Partager → « Relais Client ». Ou touchez le bouton + ci-dessous, ou l'onglet SMS."
              />
            )
          }
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.key ?? '__none__'}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: c }) => <ConversationRow conv={c} onPress={() => onOpenThread({ key: c.key, label: c.label })} />}
          ListEmptyComponent={
            query ? (
              <EmptyState icon="search" title="Aucune conversation" subtitle="Essayez un autre nom ou numéro." />
            ) : (
              <EmptyState icon="message-square" title="Aucune conversation" subtitle="Les messages reçus apparaîtront ici, regroupés par contact." />
            )
          }
        />
      )}

      {/* Bouton flottant « Ajouter » */}
      <FAB icon={menu ? 'x' : 'plus'} onPress={() => setMenu((v) => !v)} style={{ position: 'absolute', right: 16, bottom: view === 'all' ? 86 : 22 }} />

      {/* Menu rapide d'ajout */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenu(false)}>
          <View style={[styles.menu, { bottom: view === 'all' ? 154 : 90 }, shadow(3)]}>
            {QUICK.map((q) => (
              <Pressable key={q.source} onPress={() => pick(q.source)} style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: C.cardAlt }]}>
                <View style={styles.menuIcon}>
                  <Icon name={q.icon} size={18} color={C.primary} />
                </View>
                <Text style={styles.menuLabel}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Barre d'action (vue Messages uniquement) */}
      {view === 'all' && !noData ? (
        <View style={[styles.bar, shadow(3)]}>
          {selected.size ? <IconButton name="trash-2" color={C.danger} bg={C.dangerSoft} onPress={del} /> : null}
          {failed.length && !selected.size ? (
            <IconButton name="refresh-cw" color={C.primary} bg={C.primarySoft} onPress={() => failed.forEach((id) => runOcr(id))} />
          ) : null}
          <Btn
            style={{ flex: 1 }}
            icon="send"
            title={selected.size ? `Envoyer la sélection (${selected.size})` : `Envoyer (${visible.length})`}
            disabled={!target.length}
            onPress={() => onSend(target.map((i) => i.id), pText)}
          />
        </View>
      ) : null}
    </View>
  );
}

function ConversationRow({ conv, onPress }: { conv: { key: string | null; label: string; items: Item[] }; onPress: () => void }) {
  const last = conv.items[0];
  const unsent = conv.items.filter((i) => !i.sentAt).length;
  const preview = last.text?.trim() || (last.images.length ? `${last.images.length} image${last.images.length > 1 ? 's' : ''}` : '—');
  const words = conv.label.trim().split(/\s+/).filter(Boolean);
  const initials = ((words.length >= 2 ? words[0][0] + words[1][0] : conv.label.trim().slice(0, 2)) || '?').toUpperCase();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.conv, shadow(1), pressed && { opacity: 0.9 }]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.convName} numberOfLines={1}>
            {conv.label}
          </Text>
          <Text style={styles.convTime}>{relativeTime(last.receivedAt)}</Text>
        </View>
        <Text style={styles.convPreview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6, marginLeft: 8 }}>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{conv.items.length}</Text>
        </View>
        {unsent ? <View style={styles.dot} /> : null}
      </View>
      <Icon name="chevron-right" size={20} color={C.faint} style={{ marginLeft: 4 }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menu: {
    position: 'absolute',
    right: 16,
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 6,
    minWidth: 190,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  conv: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: C.primary, fontWeight: '800', fontSize: 15 },
  convName: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text, marginRight: 8 },
  convTime: { fontSize: 12, color: C.faint, fontWeight: '500' },
  convPreview: { fontSize: 13, color: C.sub, marginTop: 3 },
  countBadge: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: RADIUS.pill, backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontWeight: '700', color: C.sub },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
});
