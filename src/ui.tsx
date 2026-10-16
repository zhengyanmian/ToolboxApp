import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DETAILS } from './details';

// 全局配色（浅色主题）
export const C = {
  bg: '#f4f5f7',
  card: '#ffffff',
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  text: '#1f2937',
  sub: '#6b7280',
  line: '#e5e7eb',
  ok: '#16a34a',
  warn: '#dc2626',
};

export function Page(props: {
  id?: string;
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const detail = props.id ? DETAILS[props.id] : undefined;
  return (
    <View style={s.page}>
      <StatusBar barStyle="dark-content" />
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        {props.onBack && (
          <TouchableOpacity
            style={s.backBtn}
            onPress={props.onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: C.primary, fontSize: 26, lineHeight: 30 }}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={s.headerTitle}>{props.title}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        {detail && (
          <View style={s.introCard}>
            <Text style={s.introText}>{detail}</Text>
          </View>
        )}
        {props.children}
      </ScrollView>
    </View>
  );
}

export function Card(props: { children: React.ReactNode; style?: object }) {
  return <View style={[s.card, props.style]}>{props.children}</View>;
}

export function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'numbers-and-punctuation';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{props.label}</Text>
      <TextInput
        style={[s.input, props.multiline && { height: 100, textAlignVertical: 'top' }]}
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={C.sub}
        multiline={props.multiline}
        keyboardType={props.keyboardType}
      />
    </View>
  );
}

export function Btn(props: {
  text: string;
  onPress: () => void;
  kind?: 'primary' | 'plain';
  style?: object;
}) {
  return (
    <TouchableOpacity
      style={[
        s.btn,
        props.kind === 'plain' ? s.btnPlain : s.btnPrimary,
        props.style,
      ]}
      onPress={props.onPress}>
      <Text
        style={[
          s.btnText,
          { color: props.kind === 'plain' ? C.primary : '#ffffff' },
        ]}>
        {props.text}
      </Text>
    </TouchableOpacity>
  );
}

export function Result(props: { label: string; value: string; copyable?: boolean }) {
  return (
    <View style={s.resultRow}>
      <Text style={s.resultLabel}>{props.label}</Text>
      <Text style={s.resultValue} selectable>
        {props.value}
      </Text>
    </View>
  );
}

export function KV(props: { k: string; v: string }) {
  return (
    <View style={s.kvRow}>
      <Text style={s.kvKey}>{props.k}</Text>
      <Text style={s.kvVal}>{props.v}</Text>
    </View>
  );
}

export function Row(props: { children: React.ReactNode; style?: object }) {
  return <View style={[{ flexDirection: 'row', gap: 10 }, props.style]}>{props.children}</View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 6,
    backgroundColor: C.bg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  introCard: {
    backgroundColor: '#e8f0fe',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  introText: { fontSize: 12, color: '#334155', lineHeight: 19 },
  label: { fontSize: 13, color: C.sub, marginBottom: 6 },
  input: {
    backgroundColor: C.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
  },
  btn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: C.primary },
  btnPlain: { backgroundColor: C.card, borderWidth: 1, borderColor: C.primary },
  btnText: { fontSize: 15, fontWeight: '600' },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  resultLabel: { fontSize: 14, color: C.sub },
  resultValue: { fontSize: 15, color: C.text, fontWeight: '600', flexShrink: 1 },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  kvKey: { fontSize: 14, color: C.sub },
  kvVal: { fontSize: 14, color: C.text, fontWeight: '500' },
});
