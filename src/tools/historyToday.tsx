import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, Card, Empty, Field, Icon, Loading, Page, Row, dynStyles } from '../ui';
import { usePalette } from '../theme';

type Ev = { year: number | null; text: string };
type CacheShape = { list: Ev[]; source: string; ts: number };

/* ------------------------------ 工具函数 ------------------------------ */

const pad2 = (n: number) => String(n).padStart(2, '0');

function todayMD(): string {
  const d = new Date();
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 月/日加减天（用 2020 闰年做基准，避免 2-29 溢出异常） */
function shiftMD(md: string, delta: number): string {
  const [m, d] = md.split('-').map(Number);
  const dt = new Date(2020, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

/** 兼容 10-16 / 10/16 / 10.16 与 10-6 等写法，返回规范化 MM-DD */
function normalizeMD(s: string): string | null {
  const m = /^\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*$/.exec(s);
  if (!m) return null;
  const mo = Number(m[1]);
  const da = Number(m[2]);
  if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  return `${pad2(mo)}-${pad2(da)}`;
}

const fmtMD = (md: string) => {
  const [m, d] = md.split('-').map(Number);
  return `${m} 月 ${d} 日`;
};

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 从任意字符串里抠出年份（优先「NNNN 年」，其次裸四位数） */
function extractYear(s: string): number | null {
  const m = /(-?\d{3,4})\s*年/.exec(s) || /\b(-?\d{3,4})\b/.exec(s);
  return m ? Number(m[1]) : null;
}

/** 容错地从各种结构里取出事件数组 */
const LIST_KEYS = ['events', 'data', 'list', 'result', 'content', 'items', 'newslist', 'rows', 'records', 'history'];
function pickList(j: any, depth = 0): any[] | null {
  if (Array.isArray(j)) return j;
  if (!j || typeof j !== 'object' || depth > 4) return null;
  for (const k of LIST_KEYS) {
    const v = (j as any)[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      const inner = pickList(v, depth + 1);
      if (inner) return inner;
    }
  }
  return null;
}

/** 把任意一条记录归一化成 { year, text } */
function toEvent(it: any): Ev | null {
  if (it == null) return null;
  if (typeof it === 'string') {
    const t = stripHtml(it);
    return t ? { year: extractYear(t), text: t } : null;
  }
  if (typeof it !== 'object') return null;

  let text = '';
  for (const key of ['text', 'title', 'content', 'event', 'desc', 'description', 'ls', 'info', 'memo', 'name']) {
    const v = (it as any)[key];
    if (typeof v === 'string' && v.trim()) {
      text = stripHtml(v);
      if (text) break;
    }
  }
  if (!text) return null;

  let year: number | null = null;
  for (const key of ['year', 'y', 'time', 'date', 'yearNum']) {
    const v = (it as any)[key];
    if (typeof v === 'number' && v !== 0) {
      year = v;
      break;
    }
    if (typeof v === 'string') {
      const n = /(-?\d{3,4})/.exec(v);
      if (n) {
        year = Number(n[1]);
        break;
      }
    }
  }
  if (year === null) year = extractYear(text);
  return { year, text };
}

function dedupe(list: Ev[]): Ev[] {
  const seen = new Set<string>();
  const out: Ev[] = [];
  for (const e of list) {
    const k = `${e.year ?? ''}|${e.text}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

/* ------------------------------ 数据源 ------------------------------ */

type Source = { name: string; url: (mm: string, dd: string) => string; todayOnly?: boolean };

// 顺序：国内可访问源优先 → Wikimedia（国内多数网络可达）→ 维基原站（国内基本不通，兜底）
const SOURCES: Source[] = [
  { name: 'vvhan', url: (mm, dd) => `https://api.vvhan.com/api/history?type=json&date=${mm}${dd}` },
  // 欧克 API：只提供「今天」，其它日期自动跳过
  { name: '欧克 API', url: () => 'https://api.oick.cn/lishi/api.php', todayOnly: true },
  { name: 'oioweb', url: (mm, dd) => `https://api.oioweb.cn/api/common/HistoryToday?month=${mm}&day=${dd}` },
  {
    name: 'Wikimedia 中文',
    url: (mm, dd) => `https://api.wikimedia.org/feed/v1/wikipedia/zh/onthisday/events/${mm}/${dd}`,
  },
  {
    name: 'Wikimedia English',
    url: (mm, dd) => `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${mm}/${dd}`,
  },
  {
    name: '维基百科',
    url: (mm, dd) => `https://zh.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`,
  },
];

/** 8 秒超时的 JSON 请求 */
async function fetchJson(url: string, ms = 8000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        // Wikimedia REST API 要求带可识别的 User-Agent，否则可能 403
        'User-Agent': 'ToolboxApp/1.0 (Android; historical-today)',
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const txt = await res.text();
    try {
      return JSON.parse(txt);
    } catch {
      throw new Error('返回内容不是 JSON');
    }
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------ 页面 ------------------------------ */

const cacheKey = (md: string) => `hoday.${md}`;

export default function HistoryToday({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const [md, setMd] = useState(todayMD());
  const [input, setInput] = useState(todayMD());
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [offline, setOffline] = useState(false);

  const load = useCallback(async (target: string) => {
    setBusy(true);
    setErr('');
    setOffline(false);
    const [mm, dd] = target.split('-');

    try {
      // 1) 多源依次回退
      for (const s of SOURCES) {
        if (s.todayOnly && target !== todayMD()) continue;
        try {
          const j = await fetchJson(s.url(mm, dd));
          const raw = pickList(j);
          if (!raw || raw.length === 0) continue;
          const list = dedupe(raw.map(toEvent).filter((x): x is Ev => !!x));
          if (list.length === 0) continue;
          list.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
          setEvents(list);
          setSource(s.name);
          AsyncStorage.setItem(cacheKey(target), JSON.stringify({ list, source: s.name, ts: Date.now() })).catch(
            () => {},
          );
          return;
        } catch {
          // 该源失败，继续下一个
        }
      }

      // 2) 全部失败 → 读离线缓存
      try {
        const raw = await AsyncStorage.getItem(cacheKey(target));
        if (raw) {
          const c: CacheShape = JSON.parse(raw);
          if (c.list?.length) {
            setEvents(c.list);
            setSource(c.source);
            setOffline(true);
            setErr('当前为离线缓存：网络不可用或接口变动');
            return;
          }
        }
      } catch {}

      // 3) 彻底失败
      setEvents(null);
      setSource('');
      setErr('网络不可用或接口变动，请稍后重试；也可换一个日期再试。');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load(todayMD());
  }, [load]);

  const query = () => {
    const n = normalizeMD(input);
    if (!n) {
      setErr('日期格式应为「月-日」，例如 10-16 或 3/5');
      return;
    }
    setInput(n);
    setMd(n);
    load(n);
  };

  const go = (delta: number) => {
    const n = shiftMD(md, delta);
    setMd(n);
    setInput(n);
    load(n);
  };

  const goToday = () => {
    const t = todayMD();
    setMd(t);
    setInput(t);
    load(t);
  };

  const count = events?.length ?? 0;

  return (
    <Page id="hoday" title="历史上的今天" onBack={onBack}>
      <Card>
        <Field label="查询日期（月-日）" value={input} onChange={setInput} placeholder="例如 10-16" />
        <Row>
          <Btn text="查询" icon="search" kind="primary" onPress={query} disabled={busy} />
          <Btn text="加载今天" icon="calendar" kind="plain" onPress={goToday} disabled={busy} />
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Btn text="前一天" icon="minus" kind="ghost" size="sm" onPress={() => go(-1)} disabled={busy} />
          <Btn text="后一天" icon="plus" kind="ghost" size="sm" onPress={() => go(1)} disabled={busy} />
          <Btn text="重试" icon="refresh" kind="soft" size="sm" onPress={() => load(md)} disabled={busy} />
        </Row>
        <View style={st.badgeRow}>
          <View style={[st.badge, { backgroundColor: p.primarySoft, borderColor: p.primary + '44' }]}>
            <Icon name="calendar" size={13} color={p.primary} />
            <Text style={[st.badgeText, { color: p.primary }]}>{fmtMD(md)}</Text>
          </View>
          {source ? (
            <View style={[st.badge, { backgroundColor: p.chip, borderColor: p.chipBorder }]}>
              <Icon name="globe" size={13} color={p.sub} />
              <Text style={[st.badgeText, { color: p.sub }]}>{offline ? '离线缓存 · ' : ''}{source}</Text>
            </View>
          ) : null}
        </View>
        {busy ? <Loading text="正在获取历史事件…" /> : null}
        {err ? (
          <View style={st.errLine}>
            <Icon name="info" size={15} color={p.isDark ? p.warn : '#dc2626'} />
            <Text style={[st.err, { color: p.isDark ? p.warn : '#dc2626' }]}>{err}</Text>
          </View>
        ) : null}
      </Card>

      {events && events.length > 0 ? (
        <Card>
          <View style={st.head}>
            <Text style={[st.headTitle, { color: p.text }]}>
              共 <Text style={{ color: p.primary, fontWeight: '800' }}>{count}</Text> 条
            </Text>
            <Text style={{ fontSize: 12, color: p.faint }}>{offline ? '离线缓存' : '按年份排序'}</Text>
          </View>
          {events.map((e, i) => (
            <View key={i} style={[st.row, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.line } : null]}>
              <Text style={[st.year, { color: p.primary }]}>{e.year != null ? e.year : '——'}</Text>
              <Text style={[st.text, { color: p.text }]}>{e.text}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {!busy && (!events || events.length === 0) ? (
        <Card>
          <Empty text={err ? '暂无可显示的内容' : '点击「加载今天」或输入月-日查询'} />
        </Card>
      ) : null}
    </Page>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    badgeText: { fontSize: 12.5, fontWeight: '600' },
    errLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 },
    err: { fontSize: 12.5, lineHeight: 18, flex: 1 },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    headTitle: { fontSize: 14, fontWeight: '600' },
    row: { flexDirection: 'row', paddingVertical: 10 },
    year: { width: 54, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
    text: { flex: 1, fontSize: 14, lineHeight: 21 },
  }),
);
