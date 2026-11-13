import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { ItemCard } from '../components/ItemCard';
import { Sheet } from '../components/Sheet';
import { Btn, C, Checkbox, EmptyState, shadow } from '../components/ui';
import { useStore } from '../store';

export type Thread = { key: string | null; label: string };

export function ConversationScreen({
  thread,
  onClose,
  onSend,
}: {
  thread: Thread | null;
  onClose: () => void;
  onSend: (ids: string[], periodText: string) => void;
}) {
  const { items } = useStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const list = useMemo(
    () =>
      items
        .filter((i) => (thread ? (thread.key ? i.sender === thread.key : !i.sender) : false))
        .sort((a, b) => b.receivedAt - a.receivedAt),
    [items, thread]
  );

  // réinitialise la sélection à chaque ouverture / changement de fil
  useEffect(() => {
    setSelected(new Set());
  }, [thread?.key]);

  // retire ce qui n'existe plus
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(list.map((i) => i.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [list]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const allSelected = list.length > 0 && selected.size === list.length;
  const target = selected.size ? list.filter((i) => selected.has(i.id)) : list;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(list.map((i) => i.id)));

  return (
    <Sheet visible={!!thread} title={thread?.label ?? ''} subtitle={`${list.length} message${list.length > 1 ? 's' : ''}`} onClose={onClose}>
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          list.length ? (
            <Pressable onPress={toggleAll} style={styles.selectAll} hitSlop={6}>
              <Checkbox checked={allSelected} />
              <Text style={styles.selectAllText}>{allSelected ? 'Tout décocher' : 'Tout cocher'}</Text>
              <Text style={styles.selectAllCount}>
                {selected.size}/{list.length}
              </Text>
            </Pressable>
          ) : undefined
        }
        renderItem={({ item }) => (
          // dans un fil, toucher un message le coche/décoche (écran de sélection)
          <ItemCard item={item} selected={selected.has(item.id)} onToggle={() => toggle(item.id)} onOpen={() => toggle(item.id)} />
        )}
        ListEmptyComponent={<EmptyState icon="message-square" title="Conversation vide" />}
      />

      {list.length ? (
        <View style={[styles.bar, shadow(3)]}>
          <Btn
            style={{ flex: 1 }}
            icon="send"
            title={selected.size ? `Partager la sélection (${selected.size})` : `Tout partager (${list.length})`}
            disabled={!target.length}
            onPress={() => onSend(target.map((i) => i.id), thread?.label ?? 'conversation')}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = {
  bar: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  selectAll: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  selectAllText: { flex: 1, fontSize: 14, fontWeight: '700' as const, color: C.text },
  selectAllCount: { fontSize: 13, fontWeight: '700' as const, color: C.sub },
};
