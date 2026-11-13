import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { PERIODS } from '../periods';
import type { PeriodState } from '../types';
import { C, Chip, Input } from './ui';

export function PeriodBar({ value, onChange }: { value: PeriodState; onChange: (p: PeriodState) => void }) {
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
        {PERIODS.map((p) => (
          <Chip key={p.key} label={p.label} active={value.key === p.key} onPress={() => onChange({ ...value, key: p.key })} />
        ))}
      </ScrollView>
      {value.key === 'custom' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: C.text, marginRight: 8 }}>Derniers</Text>
          <Input
            value={String(value.customValue || '')}
            onChangeText={(t) => onChange({ ...value, customValue: parseInt(t.replace(/\D/g, ''), 10) || 0 })}
            keyboardType="number-pad"
            style={{ width: 70, paddingVertical: 6, textAlign: 'center' }}
          />
          {(['min', 'h', 'j'] as const).map((u) => (
            <Pressable
              key={u}
              onPress={() => onChange({ ...value, customUnit: u })}
              style={{
                marginLeft: 8,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor: value.customUnit === u ? C.primary : C.card,
                borderWidth: 1,
                borderColor: value.customUnit === u ? C.primary : C.border,
              }}
            >
              <Text style={{ color: value.customUnit === u ? '#fff' : C.text, fontWeight: '600' }}>
                {u === 'min' ? 'minutes' : u === 'h' ? 'heures' : 'jours'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
