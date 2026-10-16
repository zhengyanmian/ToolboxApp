import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  BackHandler,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { C } from './src/ui';
import { TOOLS, CATEGORIES } from './src/registry';

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const [stack, setStack] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  // 安卓返回键：工具页 → 回首页；首页 → 正常退出
  useEffect(() => {
    if (!stack) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setStack(null);
      return true;
    });
    return () => sub.remove();
  }, [stack]);

  const tool = stack ? TOOLS.find((t) => t.id === stack) ?? null : null;
  if (tool) {
    const Comp = tool.component;
    return <Comp onBack={() => setStack(null)} />;
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? TOOLS.filter((t) => t.name.toLowerCase().includes(q) || t.desc.includes(q))
    : null;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[s.top, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
          <Text style={s.title}>工具箱</Text>
          <Text style={s.subtitle}>原创开源 · 全部功能免费</Text>
        </View>
        <View style={s.searchWrap}>
          <TextInput
            style={s.search}
            value={query}
            onChangeText={setQuery}
            placeholder="搜索工具…"
            placeholderTextColor={C.sub}
          />
        </View>
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
          {filtered ? (
            filtered.length > 0 ? (
              <View style={s.grid}>
                {filtered.map((t) => (
                  <ToolCard key={t.id} tool={t} onPress={() => setStack(t.id)} />
                ))}
              </View>
            ) : (
              <Text style={s.empty}>没有匹配的工具</Text>
            )
          ) : (
            CATEGORIES.map((cat) => {
              const list = TOOLS.filter((t) => t.category === cat);
              if (!list.length) return null;
              return (
                <View key={cat} style={{ marginBottom: 18 }}>
                  <Text style={s.catTitle}>{cat}</Text>
                  <View style={s.grid}>
                    {list.map((t) => (
                      <ToolCard key={t.id} tool={t} onPress={() => setStack(t.id)} />
                    ))}
                  </View>
                </View>
              );
            })
          )}
          <Text style={s.foot}>
            共 {TOOLS.length} 个工具 · 后续版本持续添加
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ToolCard(props: {
  tool: (typeof TOOLS)[number];
  onPress: () => void;
}) {
  const { tool } = props;
  return (
    <TouchableOpacity style={s.card} onPress={props.onPress} activeOpacity={0.7}>
      <Text style={s.icon}>{tool.icon}</Text>
      <Text style={s.name} numberOfLines={1}>{tool.name}</Text>
      <Text style={s.desc} numberOfLines={1}>{tool.desc}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: { paddingHorizontal: 16, paddingTop: 14 },
  title: { fontSize: 26, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 12, color: C.sub, marginTop: 2 },
  searchWrap: { paddingHorizontal: 14, paddingTop: 12 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    color: C.text,
  },
  catTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  icon: { fontSize: 26 },
  name: { fontSize: 13, fontWeight: '600', color: C.text, marginTop: 6 },
  desc: { fontSize: 10, color: C.sub, marginTop: 2 },
  empty: { textAlign: 'center', color: C.sub, marginTop: 40 },
  foot: { textAlign: 'center', color: C.sub, fontSize: 12, marginTop: 8 },
});
