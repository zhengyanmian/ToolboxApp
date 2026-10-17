import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Appearance, Easing, StyleSheet, View } from 'react-native';

/**
 * 设计系统：双主题调色板（亮色 / 暗色）。
 * 视觉语言参考「质感玻璃」——低饱和背景渐变 + 半透明卡片 + 柔和轮廓光。
 */
export type Mode = 'light' | 'dark' | 'system';

export type Palette = {
  name: 'light' | 'dark';
  isDark: boolean;
  bg: string;
  bgTop: string;
  bgBottom: string;
  bgGlow: string;
  header: string;
  card: string;
  cardSolid: string;
  cardBorder: string;
  cardShadow: string;
  text: string;
  sub: string;
  faint: string;
  line: string;
  primary: string;
  primary2: string;
  onPrimary: string;
  primarySoft: string;
  ok: string;
  warn: string;
  info: string;
  chip: string;
  chipBorder: string;
  input: string;
  overlay: string;
  glowA: string;
  glowB: string;
  track: string;
};

export const lightPalette: Palette = {
  name: 'light',
  isDark: false,
  bg: '#f1f3f8',
  bgTop: '#fbfcff',
  bgBottom: '#eaedf5',
  bgGlow: '#cfe0ff',
  header: 'rgba(252,253,255,0.86)',
  card: 'rgba(255,255,255,0.72)',
  cardSolid: '#ffffff',
  cardBorder: 'rgba(15,23,42,0.06)',
  cardShadow: 'rgba(24,40,80,0.10)',
  text: '#111827',
  sub: '#5f6b7c',
  faint: '#9aa4b2',
  line: 'rgba(17,24,39,0.08)',
  primary: '#2f6bff',
  primary2: '#63a0ff',
  onPrimary: '#ffffff',
  primarySoft: 'rgba(47,107,255,0.10)',
  ok: '#0eab6b',
  warn: '#e5484d',
  info: '#2f6bff',
  chip: 'rgba(15,23,42,0.045)',
  chipBorder: 'rgba(15,23,42,0.055)',
  input: 'rgba(15,23,42,0.04)',
  overlay: 'rgba(17,24,39,0.28)',
  glowA: '#7bb0ff',
  glowB: '#c4b5fd',
  track: 'rgba(17,24,39,0.10)',
};

export const darkPalette: Palette = {
  name: 'dark',
  isDark: true,
  bg: '#080b11',
  bgTop: '#0d1219',
  bgBottom: '#05070b',
  bgGlow: '#1c3358',
  header: 'rgba(10,14,20,0.80)',
  card: 'rgba(255,255,255,0.05)',
  cardSolid: '#141a24',
  cardBorder: 'rgba(255,255,255,0.07)',
  cardShadow: 'rgba(0,0,0,0.5)',
  text: '#eef2f8',
  sub: '#98a3b3',
  faint: '#636f80',
  line: 'rgba(255,255,255,0.09)',
  primary: '#4c8dff',
  primary2: '#7db2ff',
  onPrimary: '#ffffff',
  primarySoft: 'rgba(76,141,255,0.16)',
  ok: '#34d399',
  warn: '#fb7185',
  info: '#7db2ff',
  chip: 'rgba(255,255,255,0.07)',
  chipBorder: 'rgba(255,255,255,0.10)',
  input: 'rgba(255,255,255,0.06)',
  overlay: 'rgba(0,0,0,0.5)',
  glowA: '#4c8dff',
  glowB: '#22d3ee',
  track: 'rgba(255,255,255,0.14)',
};

/** 当前生效的调色板（供样式工厂在渲染时读取） */
let currentPalette: Palette = lightPalette;
export function paletteNow(): Palette {
  return currentPalette;
}

/** 建立一个「读取时求值」的对象：键固定，值每次读取都取当前主题的结果 */
function liveFrom<T extends object>(keys: string[], read: (k: string) => any): T {
  const out: any = {};
  for (const k of keys) {
    Object.defineProperty(out, k, {
      enumerable: true,
      configurable: true,
      get: () => read(k),
    });
  }
  return out as T;
}

/**
 * 延迟求值样式：把 StyleSheet.create 包一层，样式在「取值的那一刻」按当前主题生成。
 * 这样模块级 const st = dynStyles(c => StyleSheet.create({...})) 也能跟随主题切换。
 */
export function dynStyles<T extends object>(factory: (c: Palette) => T): T {
  const cache = new Map<Palette, T>();
  const build = (c: Palette): T => {
    let s = cache.get(c);
    if (!s) {
      s = factory(c);
      cache.set(c, s);
    }
    return s;
  };
  const keys = Object.keys(build(currentPalette) as any);
  return liveFrom<T>(keys, (k) => (build(currentPalette) as any)[k]);
}

/** 全局色板快捷引用：属性在读取时解析当前主题 */
export const C: Palette = liveFrom<Palette>(
  Object.keys(lightPalette),
  (k) => (currentPalette as any)[k],
);

type ThemeCtx = {
  p: Palette;
  mode: Mode;
  isDark: boolean;
  setMode: (m: Mode) => void;
  toggle: () => void;
};

const Ctx = createContext<ThemeCtx>({
  p: lightPalette,
  mode: 'system',
  isDark: false,
  setMode: () => {},
  toggle: () => {},
});

const KEY = 'toolbox.theme.mode';

export function ThemeProvider(props: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('system');
  const [sys, setSys] = useState<string>(Appearance.getColorScheme() ?? 'light');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
      })
      .catch(() => {});
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSys(colorScheme ?? 'light'));
    return () => sub.remove();
  }, []);

  const dark = mode === 'dark' || (mode === 'system' && sys === 'dark');
  const p = dark ? darkPalette : lightPalette;
  currentPalette = p;

  /* 主题切换过渡：内容整体快速「压暗一下」再恢复，在最低亮度那一刻完成换色。
     不再铺一整屏纯色蒙版——那样看起来就是一张灰纸盖上来，用户反馈很丑。 */
  const fade = useRef(new Animated.Value(1)).current;
  const busy = useRef(false);

  const persist = useCallback((m: Mode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  }, []);

  const setMode = useCallback(
    (m: Mode) => {
      if (busy.current) return;
      const nextDark =
        m === 'dark' || (m === 'system' && (Appearance.getColorScheme() ?? 'light') === 'dark');
      if (nextDark === dark) {
        persist(m);
        return;
      }
      busy.current = true;
      Animated.timing(fade, {
        toValue: 0.12,
        duration: 130,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        persist(m);
        requestAnimationFrame(() => {
          Animated.timing(fade, {
            toValue: 1,
            duration: 210,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            busy.current = false;
          });
        });
      });
    },
    [dark, persist, fade],
  );

  const value = useMemo<ThemeCtx>(
    () => ({
      p,
      mode,
      isDark: dark,
      setMode,
      toggle: () => setMode(dark ? 'light' : 'dark'),
    }),
    [p, mode, dark, setMode],
  );

  return (
    <Ctx.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        <Animated.View
          style={{
            flex: 1,
            opacity: fade,
            transform: [
              { scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
            ],
          }}>
          {props.children}
        </Animated.View>
      </View>
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}

export function usePalette(): Palette {
  return useContext(Ctx).p;
}

/** 稳定的计时器 hook：按毫秒刷新（后台自动暂停） */
export function useTick(ms: number, enabled = true): number {
  const [n, setN] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    ref.current = setInterval(() => setN((v) => v + 1), ms);
    return () => {
      if (ref.current) clearInterval(ref.current);
      ref.current = null;
    };
  }, [ms, enabled]);
  return n;
}
