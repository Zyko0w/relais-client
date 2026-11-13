import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  Edit3,
  FileText,
  Image as ImageIcon,
  Inbox,
  Info,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Share2,
  Trash2,
  Type,
  User,
  X,
} from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

/* ----------------------------------------------------------------------------
 * Tokens de design — palette « Relais Client » (indigo → bleu)
 * -------------------------------------------------------------------------- */
export const C = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardAlt: '#F1F5F9',
  text: '#0F172A',
  sub: '#64748B',
  faint: '#94A3B8',
  border: '#E8EDF3',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EFF4FF',
  brandA: '#6366F1',
  brandB: '#1D4ED8',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  success: '#16A34A',
  successSoft: '#ECFDF3',
  warn: '#B45309',
  warnSoft: '#FFFBEB',
};

export const BRAND_GRADIENT = [C.brandA, C.primary, C.brandB] as const;

export const RADIUS = { sm: 10, md: 14, lg: 20, pill: 999 };

/** Ombre douce et cohérente (iOS + Android). */
export const shadow = (level: 1 | 2 | 3 = 1): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOpacity: level === 1 ? 0.05 : level === 2 ? 0.08 : 0.12,
      shadowRadius: level === 1 ? 6 : level === 2 ? 12 : 20,
      shadowOffset: { width: 0, height: level === 1 ? 2 : level === 2 ? 6 : 10 },
    },
    default: { elevation: level === 1 ? 1 : level === 2 ? 3 : 6 },
  })!;

/* ----------------------------------------------------------------------------
 * Icônes (Lucide — SVG vectoriel, monochrome, cohérent)
 * -------------------------------------------------------------------------- */
const ICONS = {
  'arrow-right': ArrowRight,
  inbox: Inbox,
  'message-square': MessageSquare,
  settings: Settings,
  'share-2': Share2,
  image: ImageIcon,
  camera: Camera,
  clipboard: Clipboard,
  'edit-3': Edit3,
  'check-circle': CheckCircle,
  search: Search,
  x: X,
  send: Send,
  check: Check,
  user: User,
  plus: Plus,
  'trash-2': Trash2,
  'refresh-cw': RefreshCw,
  'alert-triangle': AlertTriangle,
  info: Info,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  type: Type,
  copy: Copy,
  mail: Mail,
  'file-text': FileText,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color = C.text,
  strokeWidth = 2,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const Cmp = ICONS[name];
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} style={style as any} />;
}

export function IconButton({
  name,
  onPress,
  color = C.sub,
  size = 22,
  bg,
  style,
}: {
  name: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [
        styles.iconBtn,
        bg ? { backgroundColor: bg } : null,
        { opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

/* ----------------------------------------------------------------------------
 * Logo (marque) — badge dégradé + bulle/flèche dessinée en View
 * -------------------------------------------------------------------------- */
export function BrandMark({ size = 32, radius }: { size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.28);
  return (
    <LinearGradient
      colors={BRAND_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center' }}
    >
      {/* bulle blanche + flèche de relais */}
      <View
        style={{
          width: size * 0.56,
          height: size * 0.44,
          borderRadius: size * 0.16,
          backgroundColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="arrow-right" size={Math.round(size * 0.34)} color={C.primary} strokeWidth={2.5} />
      </View>
    </LinearGradient>
  );
}

export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: size, fontWeight: '800', color: C.text, letterSpacing: -0.3 }}>Relais</Text>
      <Text style={{ fontSize: size, fontWeight: '600', color: C.primary, letterSpacing: -0.3 }}>Client</Text>
    </View>
  );
}

/* ----------------------------------------------------------------------------
 * Bouton
 * -------------------------------------------------------------------------- */
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

type BtnProps = {
  title?: string;
  onPress: () => void;
  variant?: BtnVariant;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};

export function Btn({ title, onPress, variant = 'primary', icon, iconRight, disabled, loading, style, small }: BtnProps) {
  const fg =
    variant === 'primary'
      ? '#fff'
      : variant === 'danger'
      ? C.danger
      : variant === 'success'
      ? C.success
      : C.primary;

  const inner = (
    <View style={styles.btnInner}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
          {title ? (
            <Text style={[styles.btnText, small && { fontSize: 13 }, { color: fg }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {iconRight ? <Icon name={iconRight} size={small ? 16 : 18} color={fg} /> : null}
        </>
      )}
    </View>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [{ borderRadius: RADIUS.md, opacity: disabled ? 0.45 : pressed ? 0.9 : 1 }, !disabled && shadow(1), style]}
      >
        <LinearGradient
          colors={BRAND_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.btn, small && styles.btnSmall]}
        >
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  const bg =
    variant === 'secondary' ? C.primarySoft : variant === 'danger' ? C.dangerSoft : variant === 'success' ? C.successSoft : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {inner}
    </Pressable>
  );
}

/** Bouton d'action flottant (FAB). */
export function FAB({ icon = 'plus', onPress, style }: { icon?: IconName; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, shadow(3), style]}>
      <LinearGradient
        colors={BRAND_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fab}
      >
        <Icon name={icon} size={26} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

/** Sélecteur segmenté (onglets internes). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.segmentItem, on && [styles.segmentItemOn, shadow(1)]]}>
            {o.icon ? <Icon name={o.icon} size={15} color={on ? C.primary : C.sub} /> : null}
            <Text style={[styles.segmentText, { color: on ? C.primary : C.sub }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ----------------------------------------------------------------------------
 * Chips / filtres
 * -------------------------------------------------------------------------- */
export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {icon ? <Icon name={icon} size={13} color={active ? '#fff' : C.sub} style={{ marginRight: 5 }} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/* ----------------------------------------------------------------------------
 * Carte, libellé, saisie
 * -------------------------------------------------------------------------- */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={C.faint}
      {...props}
      style={[styles.input, props.multiline && styles.inputMulti, props.style]}
    />
  );
}

/** Barre de recherche avec icône loupe + effacement. */
export function SearchInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={18} color={C.faint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.searchInput}
      />
      {value ? <IconButton name="x" size={18} color={C.faint} onPress={() => onChangeText('')} /> : null}
    </View>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: C.primary, false: '#CBD5E1' }}
        thumbColor="#fff"
        ios_backgroundColor="#CBD5E1"
      />
    </View>
  );
}

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked ? <Icon name="check" size={15} color="#fff" /> : null}
    </View>
  );
}

export function Banner({ text, tone = 'info' }: { text: string; tone?: 'info' | 'warn' }) {
  return (
    <View style={[styles.banner, tone === 'warn' && { backgroundColor: C.warnSoft, borderColor: '#FDE68A' }]}>
      <Icon name={tone === 'warn' ? 'alert-triangle' : 'info'} size={16} color={tone === 'warn' ? C.warn : C.primary} />
      <Text style={[styles.bannerText, tone === 'warn' && { color: '#7C2D12' }]}>{text}</Text>
    </View>
  );
}

/** État vide illustré. */
export function EmptyState({ icon = 'inbox', title, subtitle }: { icon?: IconName; title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={30} color={C.primary} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginTop: 14 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: C.sub, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 36, borderRadius: RADIUS.sm },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: 15, fontWeight: '700' },
  fab: { width: 58, height: 58, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', backgroundColor: C.cardAlt, borderRadius: RADIUS.pill, padding: 3 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
  },
  segmentItemOn: { backgroundColor: C.card },
  segmentText: { fontSize: 14, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: {
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  label: { fontSize: 12, fontWeight: '700', color: C.sub, marginBottom: 7, marginTop: 16, letterSpacing: 0.4, textTransform: 'uppercase' },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 3,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.text, paddingVertical: Platform.OS === 'ios' ? 0 : 6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  toggleLabel: { fontSize: 15, color: C.text, fontWeight: '500' },
  hint: { fontSize: 12, color: C.sub, marginTop: 2, lineHeight: 16 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxOn: { backgroundColor: C.primary, borderColor: C.primary },
  banner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: C.primarySoft,
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { flex: 1, fontSize: 13, color: '#1E3A8A', lineHeight: 18 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
