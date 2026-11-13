import React, { useState } from 'react';
import { Alert, FlatList, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeMessage } from '../../modules/relais-native';
import { PeriodBar } from '../components/PeriodBar';
import { Banner, Btn, C, Card, Checkbox, EmptyState, Icon, Input, SearchInput, ToggleRow } from '../components/ui';
import { ensureSmsPermission, native } from '../native';
import { periodLabel, periodStart, relativeTime } from '../periods';
import { useStore } from '../store';
import type { PeriodState } from '../types';

export function SmsScreen({ onSend }: { onSend: (ids: string[], periodText: string) => void }) {
  const { addItem, hasExternal, items } = useStore();
  const [period, setPeriod] = useState<PeriodState>({ key: '1h', customValue: 2, customUnit: 'h' });
  const [number, setNumber] = useState('');
  const [search, setSearch] = useState('');
  const [withMms, setWithMms] = useState(true);
  const [list, setList] = useState<NativeMessage[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  if (!native) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Banner
          tone="warn"
          text="La lecture directe des SMS/MMS nécessite l'APK (ou un build de développement). Elle n'est pas possible dans Expo Go."
        />
        <Card>
          <Text style={{ fontWeight: '700', color: C.text, marginBottom: 6 }}>En attendant, dans Expo Go :</Text>
          <Text style={{ color: C.text, lineHeight: 21 }}>
            1. Dans l'appli Messages, faites un appui long sur le message → Copier.{'\n'}
            2. Revenez ici, onglet Messages → bouton « Coller ».{'\n'}
            3. Pour l'image : enregistrez-la puis bouton « Image ».
          </Text>
        </Card>
      </ScrollView>
    );
  }

  const mod = native;

  const load = async () => {
    const ok = await ensureSmsPermission();
    if (!ok) {
      Alert.alert('Permission refusée', "Autorisez l'accès aux SMS dans les paramètres de l'appli.", [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Paramètres', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    setLoading(true);
    try {
      const opts = { sinceMs: periodStart(period), address: number.trim() || null, limit: 300 };
      const [sms, mms] = await Promise.all([mod.readSms(opts), withMms ? mod.readMms(opts) : Promise.resolve([])]);
      const all = [...sms, ...mms].sort((a, b) => b.date - a.date);
      setList(all);
      setSelected(new Set(all.filter((m) => !hasExternal(m.id)).map((m) => m.id)));
    } catch (e: any) {
      Alert.alert('Lecture impossible', String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  const doImport = (thenSend: boolean) => {
    if (!list) return;
    const chosen = list.filter((m) => selected.has(m.id));
    const ids: string[] = [];
    chosen.forEach((m) => {
      const existing = items.find((i) => i.externalId === m.id);
      if (existing) {
        ids.push(existing.id);
        return;
      }
      const who = m.name ? `${m.name} (${m.address})` : m.address ?? undefined;
      const it = addItem({
        source: m.images.length ? 'mms' : 'sms',
        sender: who,
        text: m.body,
        imageUris: m.images,
        receivedAt: m.date,
        externalId: m.id,
      });
      ids.push(it.id);
    });
    if (thenSend && ids.length) {
      onSend(ids, periodLabel(period) + (number ? ` – ${number}` : ''));
    } else {
      Alert.alert('Importé', `${chosen.length} message(s) ajouté(s) à l'onglet Messages.`);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const fold = (s: string) =>
    s.toLowerCase().replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ûüù]/g, 'u').replace(/ç/g, 'c');
  const q = fold(search.trim());
  const shown = !list ? [] : !q ? list : list.filter((m) => fold(`${m.name ?? ''} ${m.address ?? ''} ${m.body ?? ''}`).includes(q));
  const shownIds = shown.map((m) => m.id);
  const allShownSelected = shownIds.length > 0 && shownIds.every((id) => selected.has(id));
  const toggleAll = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (allShownSelected) shownIds.forEach((id) => n.delete(id));
      else shownIds.forEach((id) => n.add(id));
      return n;
    });

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={shown}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            <Text style={{ color: C.sub, marginBottom: 6 }}>Messages reçus depuis :</Text>
            <PeriodBar value={period} onChange={setPeriod} />
            <Input
              value={number}
              onChangeText={setNumber}
              placeholder="Filtrer par numéro du client (optionnel)"
              keyboardType="phone-pad"
              style={{ marginTop: 10 }}
            />
            <ToggleRow label="Inclure les MMS (images)" value={withMms} onChange={setWithMms} />
            <Btn title="Charger les SMS" icon="refresh-cw" onPress={load} loading={loading} />
            {list ? (
              <View style={{ marginTop: 14 }}>
                <SearchInput value={search} onChangeText={setSearch} placeholder="Filtrer par nom de contact…" />
                {shown.length ? (
                  <Pressable
                    onPress={toggleAll}
                    hitSlop={6}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      marginTop: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      backgroundColor: C.card,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: C.border,
                    }}
                  >
                    <Checkbox checked={allShownSelected} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: C.text }}>
                      {allShownSelected ? 'Tout décocher' : 'Tout cocher'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.sub }}>
                      {selected.size}/{shown.length}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Text style={{ color: C.sub, marginTop: 14, fontSize: 12, lineHeight: 18 }}>
                Les messages RCS (« Chat ») de Google Messages et WhatsApp ne sont pas lisibles par une autre appli : utilisez le bouton Partager depuis ces applis.
              </Text>
            )}
          </View>
        }
        renderItem={({ item: m }) => {
          const already = hasExternal(m.id);
          return (
            <Pressable
              onPress={() => toggle(m.id)}
              style={{
                flexDirection: 'row',
                backgroundColor: C.card,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: selected.has(m.id) ? C.primary : C.border,
              }}
            >
              <View style={{ paddingRight: 10, paddingTop: 2 }}>
                <Checkbox checked={selected.has(m.id)} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '700', color: C.text, flex: 1 }} numberOfLines={1}>
                    {m.name ?? m.address ?? 'Inconnu'}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12 }}>{relativeTime(m.date)}</Text>
                </View>
                {m.body ? (
                  <Text style={{ color: C.text, marginTop: 3 }} numberOfLines={3}>
                    {m.body}
                  </Text>
                ) : null}
                {m.images.length ? (
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    {m.images.map((u) => (
                      <Image key={u} source={{ uri: u }} style={{ width: 44, height: 44, borderRadius: 6, marginRight: 4 }} />
                    ))}
                  </View>
                ) : null}
                {already ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Icon name="check" size={12} color={C.success} />
                    <Text style={{ color: C.success, fontSize: 12, fontWeight: '600' }}>Déjà importé</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          list && search ? <EmptyState icon="search" title="Aucun contact trouvé" subtitle="Essayez un autre nom ou numéro." /> : undefined
        }
      />
      {list && list.length ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: 12,
            backgroundColor: C.card,
            borderTopWidth: 1,
            borderTopColor: C.border,
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <Btn title="Importer" variant="secondary" onPress={() => doImport(false)} disabled={!selected.size} style={{ flex: 1 }} />
          <Btn title="Importer + envoyer" icon="send" onPress={() => doImport(true)} disabled={!selected.size} style={{ flex: 1.4 }} />
        </View>
      ) : null}
    </View>
  );
}
