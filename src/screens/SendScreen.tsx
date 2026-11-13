import * as Clipboard from 'expo-clipboard';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Share, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Btn, C, Card, Input, Label, ToggleRow } from '../components/ui';
import { buildBody, buildSubject } from '../exportText';
import { deleteTempFile, writeTextFile } from '../files';
import { useStore } from '../store';

export function SendScreen({
  ids,
  periodText,
  onClose,
}: {
  ids: string[] | null;
  periodText: string;
  onClose: () => void;
}) {
  const { items, settings, updateSettings, markSent } = useStore();
  const selected = useMemo(() => items.filter((i) => ids?.includes(i.id)), [items, ids]);

  const [recipients, setRecipients] = useState(settings.recipients);
  const [subject, setSubject] = useState('');
  const [includeMessageText, setIncludeMessageText] = useState(settings.includeMessageText);
  const [includeOcrText, setIncludeOcrText] = useState(settings.includeOcrText);
  const [attachImages, setAttachImages] = useState(settings.attachImages);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ids) {
      setRecipients(settings.recipients);
      setSubject(buildSubject(settings.subjectTemplate, items.filter((i) => ids.includes(i.id))));
      setIncludeMessageText(settings.includeMessageText);
      setIncludeOcrText(settings.includeOcrText);
      setAttachImages(settings.attachImages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const body = useMemo(
    () => buildBody(selected, { includeMessageText, includeOcrText, periodText }),
    [selected, includeMessageText, includeOcrText, periodText]
  );
  const imageUris = selected.flatMap((i) => i.images.map((m) => m.uri));
  const pendingOcr = selected.some((i) => i.images.some((m) => m.ocrStatus === 'pending'));

  const done = () => {
    if (settings.markAsSent) markSent(selected.map((i) => i.id));
    onClose();
  };

  const sendMail = async () => {
    const list = recipients
      .split(/[,;\s]+/)
      .map((r) => r.trim())
      .filter(Boolean);
    if (recipients !== settings.recipients && list.length) updateSettings({ recipients: list.join(', ') });
    setBusy(true);
    try {
      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          recipients: list,
          subject,
          body,
          attachments: attachImages ? imageUris : [],
        });
        done();
      } else {
        // pas d'appli mail configurée : on passe par un lien mailto (sans pièces jointes)
        const url = `mailto:${encodeURIComponent(list.join(','))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        await Linking.openURL(url);
        done();
      }
    } catch (e: any) {
      Alert.alert('Envoi impossible', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const shareText = async () => {
    try {
      const r = await Share.share({ title: subject, message: `${subject}\n\n${body}` });
      if (r.action === Share.sharedAction) done();
    } catch (e: any) {
      Alert.alert('Partage impossible', String(e?.message ?? e));
    }
  };

  const shareFile = async () => {
    try {
      const uri = writeTextFile(`messages-client-${Date.now()}.txt`, `${subject}\n\n${body}`);
      await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: 'Envoyer le fichier' });
      deleteTempFile(uri); // nettoie le fichier temporaire après l'envoi
      done();
    } catch (e: any) {
      Alert.alert('Partage impossible', String(e?.message ?? e));
    }
  };

  const copy = async () => {
    await Clipboard.setStringAsync(`${subject}\n\n${body}`);
    Alert.alert('Copié', 'Collez le texte où vous voulez (mail, PC, WhatsApp Web…).');
  };

  return (
    <Sheet visible={!!ids} title={`Envoyer ${selected.length} message(s)`} onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Label>Destinataire(s)</Label>
        <Input
          value={recipients}
          onChangeText={setRecipients}
          placeholder="mon.adresse@exemple.fr"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Label>Objet</Label>
        <Input value={subject} onChangeText={setSubject} />

        <Label>Contenu</Label>
        <Card style={{ paddingVertical: 4 }}>
          <ToggleRow label="Texte des messages" value={includeMessageText} onChange={setIncludeMessageText} />
          <ToggleRow label="Texte extrait des images" value={includeOcrText} onChange={setIncludeOcrText} />
          <ToggleRow
            label={`Joindre les images (${imageUris.length})`}
            value={attachImages}
            onChange={setAttachImages}
            hint="Pièces jointes du mail uniquement"
          />
        </Card>

        {pendingOcr ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <ActivityIndicator size="small" color={C.warn} />
            <Text style={{ color: C.warn, flex: 1 }}>Extraction du texte en cours… l'aperçu se met à jour.</Text>
          </View>
        ) : null}

        <View style={{ gap: 10, marginTop: 18 }}>
          <Btn title="Envoyer par e-mail" icon="mail" onPress={sendMail} loading={busy} disabled={!selected.length} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn title="Partager" icon="share-2" variant="secondary" onPress={shareText} style={{ flex: 1 }} />
            <Btn title="Fichier" icon="file-text" variant="secondary" onPress={shareFile} style={{ flex: 1 }} />
            <Btn title="Copier" icon="copy" variant="secondary" onPress={copy} style={{ flex: 1 }} />
          </View>
        </View>

        <Label>Aperçu</Label>
        <Card>
          <Text style={{ fontWeight: '700', marginBottom: 8, color: C.text }}>{subject}</Text>
          <Text selectable style={{ fontFamily: 'monospace', fontSize: 12, color: C.text, lineHeight: 17 }}>
            {body}
          </Text>
        </Card>
      </ScrollView>
    </Sheet>
  );
}
