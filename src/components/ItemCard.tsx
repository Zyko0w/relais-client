import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { relativeTime } from '../periods';
import type { Item } from '../types';
import { C, Checkbox, Icon, IconName, RADIUS, shadow } from './ui';

const ICON: Record<Item['source'], IconName> = {
  share: 'share-2',
  sms: 'message-square',
  mms: 'image',
  gallery: 'image',
  camera: 'camera',
  clipboard: 'clipboard',
  manual: 'edit-3',
};

export function ItemCard({
  item,
  selected,
  onToggle,
  onOpen,
}: {
  item: Item;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const pending = item.images.some((i) => i.ocrStatus === 'pending');
  const errors = item.images.filter((i) => i.ocrStatus === 'error').length;
  const ocrPreview = item.images.map((i) => i.ocrText).filter(Boolean).join(' ').replace(/\s+/g, ' ');

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [s.card, shadow(1), selected && s.cardSel, pressed && { opacity: 0.9 }]}
    >
      <Pressable onPress={onToggle} hitSlop={12} style={{ paddingRight: 12, paddingTop: 2 }}>
        <Checkbox checked={selected} />
      </Pressable>

      <View style={{ flex: 1 }}>
        <View style={s.row}>
          <View style={s.badge}>
            <Icon name={ICON[item.source]} size={13} color={C.primary} />
          </View>
          <Text style={s.sender} numberOfLines={1}>
            {item.sender || 'Expéditeur inconnu'}
          </Text>
          <Text style={s.time}>{relativeTime(item.receivedAt)}</Text>
        </View>

        {item.text ? (
          <Text style={s.text} numberOfLines={3}>
            {item.text}
          </Text>
        ) : null}

        {item.images.length ? (
          <View style={s.imagesRow}>
            {item.images.slice(0, 4).map((img) => (
              <Image key={img.id} source={{ uri: img.uri }} style={s.thumb} />
            ))}
            {item.images.length > 4 ? (
              <View style={[s.thumb, s.more]}>
                <Text style={s.moreText}>+{item.images.length - 4}</Text>
              </View>
            ) : null}
            <View style={{ flex: 1, marginLeft: 8, justifyContent: 'center' }}>
              {pending ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={[s.ocr, { marginLeft: 6 }]}>Extraction du texte…</Text>
                </View>
              ) : ocrPreview ? (
                <Text style={s.ocr} numberOfLines={2}>
                  {ocrPreview}
                </Text>
              ) : errors ? (
                <Text style={[s.ocr, { color: C.danger }]}>Extraction échouée — toucher pour réessayer</Text>
              ) : (
                <Text style={s.ocr}>Texte non extrait</Text>
              )}
            </View>
          </View>
        ) : null}

        {item.sentAt ? (
          <View style={s.sentRow}>
            <Icon name="check-circle" size={13} color={C.success} />
            <Text style={s.sent}>Envoyé {relativeTime(item.sentAt)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardSel: { borderColor: C.primary, backgroundColor: C.primarySoft },
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sender: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  time: { fontSize: 12, color: C.faint, fontWeight: '500' },
  text: { fontSize: 14, color: C.text, marginTop: 6, lineHeight: 20 },
  imagesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  thumb: { width: 46, height: 46, borderRadius: 9, marginRight: 5, backgroundColor: C.cardAlt },
  more: { alignItems: 'center', justifyContent: 'center' },
  moreText: { color: C.sub, fontWeight: '700', fontSize: 13 },
  ocr: { fontSize: 12, color: C.sub, fontStyle: 'italic', lineHeight: 16 },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  sent: { fontSize: 12, color: C.success, fontWeight: '600' },
});
