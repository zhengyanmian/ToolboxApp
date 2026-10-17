import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, usePalette, useTheme } from './src/theme';
import {
  Background,
  Card,
  Chip,
  Empty,
  GlassLayer,
  Icon,
  IconTile,
  RoundButton,
  SectionTitle,
  Tap,
} from './src/ui';
import { CATEGORY_COLORS, CATEGORIES, TOOLS, ToolDef } from './src/registry';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <Root />
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** 全局错误边界：任何页面异常显示错误卡片，而不是闪退 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0b0f16', justifyContent: 'center', padding: 26 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fb7185' }}>页面出了点问题</Text>
          <Text style={{ color: '#98a3b3', marginTop: 10, lineHeight: 21 }}>
            {String(this.state.error?.message || this.state.error)}
          </Text>
          <Text
            style={{ color: '#4c8dff', marginTop: 22, fontSize: 16, fontWeight: '600' }}
            onPress={() => this.setState({ error: null })}>
            返回首页
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function Root() {
  const p = usePalette();
  const { p: pal } = useTheme();
  const [stack, setStack] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string>('全部');
  const insets = useSafeAreaInsets();

  /* 页面转场：首页淡出/缩小的同时工具页滑入 → 两个页面真正交叉过渡，不再是硬切 */
  const nav = useRef(new Animated.Value(0)).current;
  const homeOut = useRef(new Animated.Value(1)).current;
  const [homeGone, setHomeGone] = useState(false);

  const openTool = (id: string) => {
    nav.setValue(0);
    setStack(id);
    Animated.timing(homeOut, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setHomeGone(true);
    });
  };

  const goHome = () => {
    setHomeGone(false);
    setStack(null);
    homeOut.setValue(0);
    Animated.timing(homeOut, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (!stack) return;
    Animated.timing(nav, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [stack, nav]);

  useEffect(() => {
    if (!stack) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, [stack]);

  const tool = stack ? TOOLS.find((t) => t.id === stack) ?? null : null;
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = TOOLS;
    if (cat !== '全部') list = list.filter((t) => t.category === cat);
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.desc.toLowerCase().includes(q) ||
          t.category.includes(q),
      );
    }
    return list;
  }, [q, cat]);

  const grouped = useMemo(() => {
    if (cat !== '全部') return [[cat, filtered]] as [string, ToolDef[]][];
    return CATEGORIES.map((c) => [c, filtered.filter((t) => t.category === c)] as [string, ToolDef[]]).filter(
      ([, list]) => list.length > 0,
    );
  }, [filtered, cat]);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Background />
      {/* 首页常驻不卸载，返回时滚动位置不丢 */}
      <Animated.View
        style={[
          { flex: 1 },
          homeGone ? { display: 'none' } : null,
          {
            opacity: homeOut,
            transform: [
              { scale: homeOut.interpolate({ inputRange: [0, 1], outputRange: [1.015, 1] }) },
            ],
          },
        ]}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 14,
            paddingBottom: 44,
            paddingHorizontal: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 27, fontWeight: '800', color: p.text, letterSpacing: 0.4 }}>
                工具箱
              </Text>
              <Text style={{ fontSize: 12.5, color: p.sub, marginTop: 3 }}>
                {TOOLS.length} 个功能 · 全部本地运行 · 无广告
              </Text>
            </View>
            <ThemeButton />
          </View>

          <SearchBar value={query} onChange={setQuery} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 12, paddingRight: 16 }}>
            <Chip text="全部" active={cat === '全部'} onPress={() => setCat('全部')} />
            {CATEGORIES.map((c) => (
              <Chip key={c} text={c} active={cat === c} onPress={() => setCat(c)} />
            ))}
          </ScrollView>

          {grouped.length === 0 ? (
            <Card>
              <Empty text={`没有匹配「${query}」的工具`} />
            </Card>
          ) : (
            grouped.map(([title, list]) => (
              <View key={title} style={{ marginBottom: 8 }}>
                <SectionTitle
                  text={title}
                  right={
                    <Text style={{ fontSize: 11.5, color: p.faint }}>
                      {list.length} 项
                    </Text>
                  }
                />
                <View style={styles.grid}>
                  {list.map((t, i) => (
                    <ToolTile key={t.id} tool={t} index={i} onPress={() => openTool(t.id)} />
                  ))}
                </View>
              </View>
            ))
          )}

          <Text style={{ textAlign: 'center', color: p.faint, fontSize: 11.5, marginTop: 6 }}>
            原创开源 · 全部功能免费 · 数据不出本机
          </Text>
          <Text style={{ textAlign: 'center', color: p.faint, fontSize: 11, marginTop: 3 }}>
            右上角点按切换深/浅色，长按恢复跟随系统
          </Text>
        </ScrollView>
      </Animated.View>

      {tool ? (
        <Animated.View
          style={{
            flex: 1,
            opacity: nav,
            transform: [
              { translateX: nav.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) },
              { scale: nav.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
            ],
          }}>
          <tool.component onBack={goHome} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function ThemeButton() {
  const p = usePalette();
  const { isDark, setMode, mode } = useTheme();
  const ref = useRef<any>(null);

  /** 量出按钮在屏幕上的位置，让换色从这一角向外扩开 */
  const go = () => {
    const next = isDark ? 'light' : 'dark';
    const v: any = ref.current;
    if (v && typeof v.measureInWindow === 'function') {
      v.measureInWindow((x: number, y: number, w: number, h: number) =>
        setMode(next, { x: x + w / 2, y: y + h / 2 }),
      );
    } else {
      setMode(next);
    }
  };

  return (
    <View ref={ref} collapsable={false}>
      <RoundButton
        icon={isDark ? 'moon' : 'sun'}
        onPress={go}
        onLongPress={() => setMode(mode === 'system' ? (isDark ? 'light' : 'dark') : 'system')}
        style={{ borderColor: p.cardBorder }}
      />
    </View>
  );
}

function SearchBar(props: { value: string; onChange: (v: string) => void }) {
  const p = usePalette();
  const [focus, setFocus] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 14,
        paddingHorizontal: 15,
        height: 46,
        borderRadius: 999,
        backgroundColor: p.input,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: focus ? p.primary : p.cardBorder,
      }}>
      <Icon name="search" size={18} color={p.faint} />
      <TextInput
        style={{ flex: 1, paddingVertical: 8, fontSize: 15, color: p.text }}
        value={props.value}
        onChangeText={props.onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder="搜索工具名称或用途"
        placeholderTextColor={p.faint}
        returnKeyType="search"
      />
      {props.value.length > 0 ? (
        <Tap onPress={() => props.onChange('')} hitSlop={8}>
          <Icon name="close" size={16} color={p.faint} />
        </Tap>
      ) : null}
    </View>
  );
}

function ToolTile(props: { tool: ToolDef; index: number; onPress: () => void }) {
  const p = usePalette();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const delay = Math.min(props.index * 22, 320);
    Animated.timing(a, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [a, props.index]);
  const [from, to] = CATEGORY_COLORS[props.tool.category] ?? [p.primary, p.primary2];
  return (
    <Animated.View
      style={{
        width: '31.5%',
        flexGrow: 1,
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}>
      <Tap onPress={props.onPress} glow style={styles.tile}>
        <View
          style={{
            backgroundColor: p.card,
            borderRadius: 18,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.cardBorder,
            paddingVertical: 13,
            paddingHorizontal: 6,
            alignItems: 'center',
            overflow: 'hidden',
          }}>
          <GlassLayer radius={18} tone="button" />
          <IconTile name={props.tool.icon as any} from={from} to={to} size={40} />
          <Text
            numberOfLines={1}
            style={{ fontSize: 12.5, fontWeight: '600', color: p.text, marginTop: 8 }}>
            {props.tool.name}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 9.5, color: p.faint, marginTop: 2 }}>
            {props.tool.desc}
          </Text>
        </View>
      </Tap>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flex: 1, borderRadius: 18, overflow: 'hidden' },
});
