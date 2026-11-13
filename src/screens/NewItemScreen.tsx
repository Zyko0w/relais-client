import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Btn, C, Chip, Icon, Input, Label } from '../components/ui';
import { NewItem, useStore } from '../store';
import type { Source } from '../types';

export type NewItemDraft = { source: Source; imageUris?: string[]; text?: string };

const AGO = [
  { label: 'Maintenant', min: 0 },
  { label: 'Il y a 15 min', min: 15 },
  { label: 'Il y a 30 min', min: 30 },
  { label: 'Il y a 1 h', min: 60 },
  { label: 'Il y a 2 h', min: 120 },
];

export function NewItemScreen({
  draft,
  onClose,
  onSaved,
}: {
  draft: NewItemDraft | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { addItem, items } = useStore();
  const [sender, setSender] = useState('');
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [ago, setAgo] = useState(0);

  useEffect(() => {
    if (draft) {
      setSender('');
      setText(draft.text ?? '');
      setImages(draft.imageUris ?? []);
      setAgo(0);
    }
  }, [draft]);

  // derniers expéditeurs pour remplir vite
  const recentSenders = Array.from(new Set(items.map((i) => i.sender).filter(Boolean) as string[])).slice(0, 6);

  const addImages = async (camera: boolean) => {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission refusée', "L'accès à l'appareil photo est nécessaire.");
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!res.canceled) setImages((prev) => [...prev, ...res.assets.map((a) => a.uri)]);
  };

  const paste = async () => {
    if (await Clipboard.hasImageAsync()) {
      const img = await Clipboard.getImageAsync({ format: 'png' });
      if (img?.data) {
        setImages((prev) => [...prev, img.data]);
        return;
      }
    }
    const t = await Clipboard.getStringAsync();
    if (!t) return Alert.alert('Presse-papier vide');
    setText((prev) => (prev ? prev + '\n' + t : t));
  };

  const save = () => {
    if (!text.trim() && images.length === 0) {
      return Alert.alert('Message vide', 'Ajoutez un texte ou au moins une image.');
    }
    const n: NewItem = {
      source: draft?.source ?? 'manual',
      sender,
      text,
      imageUris: images,
      receivedAt: Date.now() - ago * 60_000,
    };
    const item = addItem(n);
    onSaved(item.id);
  };

  return (
    <Sheet visible={!!draft} title="Nouveau message client" onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Label>Client (nom ou numéro)</Label>
        <Input value={sender} onChangeText={setSender} placeholder="Ex : M. Dupont – 06 12 34 56 78" />
        {recentSenders.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {recentSenders.map((s) => (
              <Chip key={s} label={s} active={sender === s} onPress={() => setSender(s)} />
            ))}
          </ScrollView>
        ) : null}

        <Label>Message du client</Label>
        <Input value={text} onChangeText={setText} multiline placeholder="Collez ou tapez l'explication du client…" />
        <Btn title="Coller depuis le presse-papier" icon="clipboard" variant="secondary" small onPress={paste} style={{ marginTop: 8, alignSelf: 'flex-start' }} />

        <Label>Images ({images.length})</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {images.map((uri, idx) => (
            <Pressable
              key={uri + idx}
              onLongPress={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
              style={{ marginRight: 8, marginBottom: 8 }}
            >
              <Image source={{ uri }} style={{ width: 90, height: 90, borderRadius: 10, backgroundColor: C.border }} />
              <Pressable
                onPress={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#0009', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="x" size={14} color="#fff" />
              </Pressable>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn title="Galerie" icon="image" variant="secondary" small onPress={() => addImages(false)} style={{ flex: 1 }} />
          <Btn title="Photo" icon="camera" variant="secondary" small onPress={() => addImages(true)} style={{ flex: 1 }} />
        </View>

        <Label>Reçu</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {AGO.map((a) => (
            <Chip key={a.min} label={a.label} active={ago === a.min} onPress={() => setAgo(a.min)} />
          ))}
        </ScrollView>
        <Text style={{ color: C.sub, fontSize: 12, marginTop: 6 }}>
          Sert au filtre « messages datant de… ». Le texte des images est extrait automatiquement après l'enregistrement.
        </Text>

        <Btn title="Enregistrer" icon="check" onPress={save} style={{ marginTop: 22 }} />
      </ScrollView>
    </Sheet>
  );
}
