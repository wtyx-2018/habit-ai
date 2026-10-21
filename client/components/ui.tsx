import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle, StyleProp, ScrollView, Modal,
} from 'react-native';
import { C, RADIUS } from '@/theme';

// ===== 卡片 =====
export function Card({
  children, style, padded = true,
}: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return (
    <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>
  );
}

// ===== 区块标题 =====
export function SectionTitle({
  title, right, style,
}: { title: string; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.rowBetween, styles.sectionTitle, style]}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {right}
    </View>
  );
}

// ===== 小标签 =====
export function Tag({
  text, color = C.info, soft = true, style,
}: { text: string; color?: string; soft?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: soft ? hexA(color, 0.12) : color, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }, style]}>
      <Text style={{ color: soft ? color : '#fff', fontSize: 11, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

// ===== 按钮 =====
export function Btn({
  title, onPress, variant = 'primary', disabled, loading, style, textStyle, small,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'soft' | 'accent';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  small?: boolean;
}) {
  const palette = {
    primary: { bg: C.primary, fg: '#fff' },
    accent: { bg: C.accent, fg: '#fff' },
    soft: { bg: C.primarySoft, fg: C.primary },
    ghost: { bg: 'transparent', fg: C.muted, border: C.border },
  }[variant];
  return (
    <TouchableOpacity
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.btn, { backgroundColor: palette.bg, borderWidth: variant === 'ghost' ? 1 : 0, borderColor: C.border }, small && styles.btnSmall, disabled && { opacity: 0.5 }, style]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : (
        <Text style={[{ color: palette.fg, fontSize: 15, fontWeight: '600' }, small && { fontSize: 13 }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

// ===== 表单条目 =====
export function Field({
  label, value, onChangeText, placeholder, multiline, keyboardType, style, required, maxLength,
}: {
  label?: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  style?: StyleProp<ViewStyle>;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? (
        <Text style={styles.fieldLabel}>{label}{required ? <Text style={{ color: C.warn }}> *</Text> : null}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={[styles.input, multiline && { minHeight: 84, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

// ===== 分段选择 =====
export function Segmented<T extends string>({
  options, value, onChange, color = C.primary,
}: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void; color?: string }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segItem, active && { backgroundColor: hexA(color, 0.14) }]}
          >
            <Text style={{ color: active ? color : C.muted, fontWeight: '600', fontSize: 13 }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ===== 空状态 =====
export function Empty({ text, hint }: { text: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

// ===== 底部弹层容器 =====
export function ModalSheet({
  visible, onClose, title, children,
}: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={styles.modalScrim} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.rowBetween}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={{ fontSize: 20, color: C.muted }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            style={{ flexGrow: 0 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// 工具：hex 加透明度
export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: RADIUS.card, borderWidth: 1, borderColor: C.border },
  cardPadded: { padding: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { marginTop: 18, marginBottom: 10 },
  sectionTitleText: { fontSize: 15, fontWeight: '700', color: C.text },
  btn: {
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: RADIUS.control,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 14 },
  fieldLabel: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' },
  input: {
    backgroundColor: C.primarySoft, borderRadius: RADIUS.control, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: C.text,
  },
  seg: { flexDirection: 'row', backgroundColor: C.primarySoft, borderRadius: RADIUS.control, padding: 3 },
  segItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.control - 3 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyText: { color: C.muted, fontSize: 14 },
  emptyHint: { color: C.border, fontSize: 12, marginTop: 6, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,26,20,0.35)' },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24, maxHeight: '85%',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.text },
});