import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, IconButton } from './ui';

/** Écran plein (modal) avec en-tête et bouton fermer */
export function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  right,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.header}>
            <IconButton name="chevron-left" size={26} color={C.text} onPress={onClose} />
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <Text style={s.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={s.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
          </View>
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  title: { fontSize: 17, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 12, color: C.sub, marginTop: 1 },
});
