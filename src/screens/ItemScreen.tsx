import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Btn, C, Card, Input, Label } from '../components/ui';
import { formatDate } from '../periods';
import { useStore } from '../store';

export function ItemScreen({
  itemId,
  onClose,
  onSend,
}: {
  itemId: string | null;
  onClose: () => void;
  onSend: (ids: string[]) => void;
}) {
  const { items, updateItem, updateImageText, runOcr, removeImage, deleteItems } = useStore();
  const item = items.find((i) => i.id === itemId);
  const [zoom, setZoom] = useState<string | null>(null);

  if (!item) return <Sheet visible={false} title="" onClose={onClose}>{null}</Sheet>;

  const allText = [
    item.sender ? `Client : ${item.sender}` : '',
    item.text ? `Message :\n${item.text}` : '',
    ...item.images.map((img, i) => (img.ocrText ? `Texte image ${i + 1} :\n${img.ocrText}` : '')),
  ]
    .filter(Boolean)
    .join('\n\n');

  const copy = async (t: string) => {
    await Clipboard.setStringAsync(t);
    Alert.alert('Copié', 'Le texte est dans le presse-papier.');
  };

  const del = () =>
    Alert.alert('Supprimer ce message ?', 'Les images associées seront supprimées de l’appli.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteItems([item.id]);
          onClose();
        },
      },
    ]);

  return (
    <Sheet visible={!!itemId} title="Détail du message" onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: C.sub }}>
          Reçu le {formatDate(item.receivedAt)}
          {item.sentAt ? `  ·  envoyé le ${formatDate(item.sentAt)}` : ''}
        </Text>

        <Label>Client</Label>
        <Input
          value={item.sender ?? ''}
          onChangeText={(t) => updateItem(item.id, { sender: t })}
          placeholder="Nom ou numéro du client"
        />

        <Label>Message</Label>
        <Input
          value={item.text ?? ''}
          onChangeText={(t) => updateItem(item.id, { text: t })}
          multiline
          placeholder="(pas de texte)"
        />

        {item.images.map((img, idx) => (
          <Card key={img.id} style={{ marginTop: 16 }}>
            <Pressable onPress={() => setZoom(img.uri)}>
              <Image source={{ uri: img.uri }} style={{ width: '100%', height: 220, borderRadius: 10, backgroundColor: C.border }} resizeMode="contain" />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>
                Texte extrait {item.images.length > 1 ? `(image ${idx + 1})` : ''}
              </Text>
              {img.ocrStatus === 'pending' ? <ActivityIndicator color={C.primary} /> : null}
            </View>
            {img.ocrStatus === 'error' ? (
              <Text style={{ color: C.danger, marginTop: 4 }}>Échec : {img.ocrError}</Text>
            ) : null}
            {img.ocrStatus === 'none' ? <Text style={{ color: C.sub, marginTop: 4 }}>Pas encore extrait.</Text> : null}
            {img.ocrStatus === 'done' || img.ocrText ? (
              <Input
                value={img.ocrText ?? ''}
                onChangeText={(t) => updateImageText(item.id, img.id, t)}
                multiline
                placeholder="(aucun texte détecté)"
                style={{ marginTop: 8 }}
              />
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Btn
                title={img.ocrStatus === 'none' ? 'Extraire' : 'Ré-extraire'}
                icon="type"
                small
                variant="secondary"
                loading={img.ocrStatus === 'pending'}
                onPress={() => runOcr(item.id, img.id)}
                style={{ flex: 1 }}
              />
              <Btn title="Copier" icon="copy" small variant="secondary" disabled={!img.ocrText} onPress={() => copy(img.ocrText ?? '')} style={{ flex: 1 }} />
              <Btn title="" icon="trash-2" small variant="ghost" onPress={() => removeImage(item.id, img.id)} />
            </View>
          </Card>
        ))}

        <View style={{ gap: 10, marginTop: 24 }}>
          <Btn title="Envoyer ce message" icon="send" onPress={() => onSend([item.id])} />
          <Btn title="Copier tout le texte" icon="copy" variant="secondary" onPress={() => copy(allText)} disabled={!allText} />
          <Btn title="Supprimer" icon="trash-2" variant="danger" onPress={del} />
        </View>
      </ScrollView>

      <Modal visible={!!zoom} transparent onRequestClose={() => setZoom(null)} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }} onPress={() => setZoom(null)}>
          {zoom ? <Image source={{ uri: zoom }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </Sheet>
  );
}
