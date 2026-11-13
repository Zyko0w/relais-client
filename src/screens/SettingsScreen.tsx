import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Btn, C, Card, Chip, Icon, Input, Label, ToggleRow } from '../components/ui';
import { hasNative, isExpoGo } from '../native';
import { PERIODS } from '../periods';
import { useStore } from '../store';
import type { OcrEngine } from '../types';

const LANGS = [
  { code: 'fre', label: 'Français' },
  { code: 'eng', label: 'Anglais' },
  { code: 'spa', label: 'Espagnol' },
  { code: 'ger', label: 'Allemand' },
  { code: 'ita', label: 'Italien' },
  { code: 'por', label: 'Portugais' },
];

export function SettingsScreen() {
  const { settings: s, updateSettings: set, items, deleteItems } = useStore();

  const engines: { key: OcrEngine; label: string }[] = [
    { key: 'auto', label: 'Auto' },
    { key: 'device', label: 'Sur le téléphone' },
    { key: 'online', label: 'En ligne' },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Label>E-mail de destination par défaut</Label>
      <Input
        value={s.recipients}
        onChangeText={(t) => set({ recipients: t })}
        placeholder="moi@entreprise.fr, collegue@entreprise.fr"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Label>Objet du mail</Label>
      <Input value={s.subjectTemplate} onChangeText={(t) => set({ subjectTemplate: t })} />
      <Text style={{ color: C.sub, fontSize: 12, marginTop: 4 }}>Variables : {'{client}'} {'{date}'} {'{nombre}'}</Text>

      <Label>Contenu par défaut</Label>
      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow label="Texte des messages" value={s.includeMessageText} onChange={(v) => set({ includeMessageText: v })} />
        <ToggleRow label="Texte extrait des images" value={s.includeOcrText} onChange={(v) => set({ includeOcrText: v })} />
        <ToggleRow label="Joindre les images" value={s.attachImages} onChange={(v) => set({ attachImages: v })} />
        <ToggleRow
          label="Marquer comme envoyés"
          hint="Permet de filtrer « Non envoyés »"
          value={s.markAsSent}
          onChange={(v) => set({ markAsSent: v })}
        />
      </Card>

      <Label>Période par défaut</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
        {PERIODS.filter((p) => p.key !== 'custom').map((p) => (
          <Chip key={p.key} label={p.label} active={s.defaultPeriod === p.key} onPress={() => set({ defaultPeriod: p.key })} />
        ))}
      </View>

      <Label>Extraction du texte (OCR)</Label>
      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow label="Extraire automatiquement" value={s.autoOcr} onChange={(v) => set({ autoOcr: v })} />
        <View style={{ flexDirection: 'row', marginVertical: 8 }}>
          {engines.map((e) => (
            <Chip key={e.key} label={e.label} active={s.ocrEngine === e.key} onPress={() => set({ ocrEngine: e.key })} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <Icon name={hasNative ? 'check-circle' : 'alert-triangle'} size={15} color={hasNative ? C.success : C.warn} style={{ marginTop: 1 }} />
          <Text style={{ color: C.sub, fontSize: 12, lineHeight: 17, flex: 1 }}>
            {hasNative
              ? 'OCR sur le téléphone disponible (Google ML Kit, hors ligne, gratuit, les images ne quittent pas le téléphone).'
              : `OCR sur le téléphone indisponible${isExpoGo ? ' dans Expo Go' : ''} : l'OCR en ligne (OCR.space) est utilisé.`}
          </Text>
        </View>
      </Card>

      <Label>OCR en ligne (OCR.space)</Label>
      <Input
        value={s.ocrSpaceKey}
        onChangeText={(t) => set({ ocrSpaceKey: t.trim() })}
        placeholder="Clé API"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={{ color: C.sub, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
        « helloworld » = clé de démo limitée. Clé gratuite personnelle (quota plus large) sur ocr.space/ocrapi. Les images
        sont envoyées à ce service.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, rowGap: 8 }}>
        {LANGS.map((l) => (
          <Chip key={l.code} label={l.label} active={s.ocrLanguage === l.code} onPress={() => set({ ocrLanguage: l.code })} />
        ))}
      </View>

      <Label>Nettoyage automatique</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
        {[
          { d: 7, l: '7 jours' },
          { d: 30, l: '30 jours' },
          { d: 90, l: '90 jours' },
          { d: 0, l: 'Jamais' },
        ].map((o) => (
          <Chip key={o.d} label={o.l} active={s.retentionDays === o.d} onPress={() => set({ retentionDays: o.d })} />
        ))}
      </View>
      <Text style={{ color: C.sub, fontSize: 12, marginTop: 4 }}>Supprime les messages plus anciens au démarrage.</Text>

      <Btn
        title={`Tout effacer (${items.length})`}
        icon="trash-2"
        variant="danger"
        style={{ marginTop: 24 }}
        disabled={!items.length}
        onPress={() =>
          Alert.alert('Tout effacer ?', 'Tous les messages et images de l’appli seront supprimés.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Effacer', style: 'destructive', onPress: () => deleteItems(items.map((i) => i.id)) },
          ])
        }
      />
    </ScrollView>
  );
}
