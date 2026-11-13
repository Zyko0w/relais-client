import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark, C, Icon, IconName, Wordmark } from './src/components/ui';
import { isExpoGo } from './src/native';
import { ConversationScreen, Thread } from './src/screens/ConversationScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ItemScreen } from './src/screens/ItemScreen';
import { NewItemDraft, NewItemScreen } from './src/screens/NewItemScreen';
import { SendScreen } from './src/screens/SendScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SmsScreen } from './src/screens/SmsScreen';
import { StoreProvider, useStore } from './src/store';
import type { PeriodState, Source } from './src/types';

type Tab = 'home' | 'sms' | 'settings';

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'home', label: 'Messages', icon: 'inbox' },
  { key: 'sms', label: 'SMS', icon: 'message-square' },
  { key: 'settings', label: 'Réglages', icon: 'settings' },
];

/** Reçoit les images / textes partagés depuis WhatsApp, Messages, Galerie… */
function useIncomingShares(onCreated: (id: string) => void) {
  const { ready, addItem } = useStore();
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntentContext();

  useEffect(() => {
    if (error) console.warn('Share intent', error);
  }, [error]);

  useEffect(() => {
    if (!ready || !hasShareIntent) return;
    const images = (shareIntent.files ?? []).filter((f) => f.mimeType?.startsWith('image/')).map((f) => f.path);
    const text = shareIntent.text ?? shareIntent.webUrl ?? '';
    if (images.length || text) {
      const item = addItem({ source: 'share', text, imageUris: images });
      onCreated(item.id);
    } else {
      Alert.alert('Contenu non pris en charge', 'Seuls les textes et images peuvent être partagés vers l’appli.');
    }
    resetShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hasShareIntent]);
}

function Main() {
  const { ready, settings } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [period, setPeriod] = useState<PeriodState>({ key: '1h', customValue: 2, customUnit: 'h' });
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewItemDraft | null>(null);
  const [send, setSend] = useState<{ ids: string[]; periodText: string } | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);

  useEffect(() => {
    if (ready) setPeriod((p) => ({ ...p, key: settings.defaultPeriod }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useIncomingShares((id) => {
    setTab('home');
    setDraft(null);
    setSend(null);
    setThread(null);
    setOpenId(id);
  });

  const startNew = async (source: Source) => {
    try {
      if (source === 'gallery') {
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
        if (r.canceled) return;
        return setDraft({ source, imageUris: r.assets.map((a) => a.uri) });
      }
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('Permission refusée', "L'accès à l'appareil photo est nécessaire.");
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
        if (r.canceled) return;
        return setDraft({ source, imageUris: r.assets.map((a) => a.uri) });
      }
      if (source === 'clipboard') {
        if (await Clipboard.hasImageAsync()) {
          const img = await Clipboard.getImageAsync({ format: 'png' });
          if (img?.data) return setDraft({ source, imageUris: [img.data] });
        }
        const text = await Clipboard.getStringAsync();
        if (!text) return Alert.alert('Presse-papier vide', 'Copiez d’abord le message du client (appui long → Copier).');
        return setDraft({ source, text });
      }
      setDraft({ source: 'manual' });
    } catch (e: any) {
      Alert.alert('Erreur', String(e?.message ?? e));
    }
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const openSend = (ids: string[], periodText: string) => {
    setOpenId(null);
    setSend({ ids, periodText });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
        <BrandMark size={34} />
        {tab === 'home' ? (
          <Wordmark size={20} />
        ) : (
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.text }}>
            {tab === 'sms' ? 'Importer des SMS' : 'Réglages'}
          </Text>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'home' ? (
          <HomeScreen period={period} setPeriod={setPeriod} onOpen={setOpenId} onNew={startNew} onSend={openSend} onOpenThread={setThread} />
        ) : tab === 'sms' ? (
          <SmsScreen onSend={openSend} />
        ) : (
          <SettingsScreen />
        )}
      </View>

      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card, paddingBottom: 2 }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, alignItems: 'center', paddingTop: 9, paddingBottom: 7 }}>
              <Icon name={t.icon} size={22} color={on ? C.primary : C.faint} />
              <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 3, color: on ? C.primary : C.faint }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <NewItemScreen
        draft={draft}
        onClose={() => setDraft(null)}
        onSaved={(id) => {
          setDraft(null);
          setOpenId(id);
        }}
      />
      <ConversationScreen
        thread={thread}
        onClose={() => setThread(null)}
        onSend={(ids, periodText) => {
          setThread(null);
          openSend(ids, periodText);
        }}
      />
      <ItemScreen itemId={openId} onClose={() => setOpenId(null)} onSend={(ids) => openSend(ids, 'message sélectionné')} />
      <SendScreen ids={send?.ids ?? null} periodText={send?.periodText ?? ''} onClose={() => setSend(null)} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ShareIntentProvider options={{ disabled: isExpoGo, resetOnBackground: true }}>
      <SafeAreaProvider>
        <StoreProvider>
          <Main />
        </StoreProvider>
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}
