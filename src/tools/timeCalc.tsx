import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Chip, DateField, Icon, Page, Segmented, Tap, dynStyles } from '../ui';
import { usePalette } from '../theme';

const DAY = 86400000;
const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const pad = (n: number) => String(n).padStart(2, '0');

/** 纯 8 位数字自动补成 2026-10-16 */
function autoDate(v: string) {
  return /^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : v;
}
/** 纯 4 位数字自动补成 0830 → 08:30 */
function autoTime(v: string) {
  return /^\d{4}$/.test(v) ? `${v.slice(0, 2)}:${v.slice(2, 4)}` : v;
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtFull(d: Date) {
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
/** 手动解析，避免各平台 Date 字符串解析差异 */
function parseDT(dateStr: string, timeStr: string): number | null {
  const ds = (dateStr || '').trim();
  if (!ds) return null;
  const m = ds.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2] - 1;
  const dd = +m[3];
  let hh = 0;
  let mi = 0;
  let ss = 0;
  const ts = (timeStr || '').trim();
  if (ts) {
    const t = ts.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (!t) return null;
    hh = +t[1];
    mi = +t[2];
    ss = t[3] ? +t[3] : 0;
  }
  if (mo < 0 || mo > 11 || dd < 1 || dd > 31 || hh > 23 || mi > 59 || ss > 59) return null;
  const d = new Date(y, mo, dd, hh, mi, ss);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== dd) return null;
  return d.getTime();
}

/* ---------------- 时刻输入行（日期 + 时间 + 现在 + 清空） ---------------- */
function DTInput(props: {
  label: string;
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  onNow: () => void;
  showNow?: boolean;
}) {
  const p = usePalette();
  const filled = !!(props.date || props.time);
  return (
    <View style={st.dtBox}>
      <View style={st.dtHead}>
        <Text style={st.dtLabel}>{props.label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {props.showNow !== false ? (
            <Tap onPress={props.onNow} style={st.miniBtn} hitSlop={6}>
              <Icon name="clock" size={13} color={p.primary} strokeWidth={2} />
              <Text style={[st.miniTxt, { color: p.primary }]}>现在</Text>
            </Tap>
          ) : null}
          <Tap onPress={() => { props.onDate(''); props.onTime(''); }} style={st.miniBtn} hitSlop={6} disabled={!filled}>
            <Icon name="close" size={14} color={filled ? p.sub : p.faint} strokeWidth={2.2} />
          </Tap>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1.4 }}>
          <DateField
            value={props.date}
            onChange={props.onDate}
            mode="date"
            placeholder="选择日期"
            style={{ marginBottom: 0 }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateField
            value={props.time}
            onChange={props.onTime}
            mode="time"
            placeholder="选择时间"
            style={{ marginBottom: 0 }}
          />
        </View>
      </View>
    </View>
  );
}

export default function TimeCalc({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const [mode, setMode] = useState<'diff' | 'shift'>('diff');

  const now = useMemo(() => new Date(), []);
  const [d1, setD1] = useState(fmtDate(now));
  const [t1, setT1] = useState(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  const [d2, setD2] = useState(fmtDate(now));
  const [t2, setT2] = useState(`${pad(now.getHours())}:${pad(now.getMinutes())}`);

  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<'分' | '时' | '天'>('天');
  const [sign, setSign] = useState<1 | -1>(1);

  const a = parseDT(d1, t1);
  const b = parseDT(d2, t2);

  let main = '';
  let lines: string[] = [];
  let hint = '';

  if (mode === 'diff') {
    if (a === null || b === null) {
      hint = '日期格式 2026-10-16，时间格式 08:30（只填 20261016 / 0830 也会自动补好）';
    } else {
      const diff = b - a;
      const abs = Math.abs(diff);
      const d = Math.floor(abs / DAY);
      const h = Math.floor((abs % DAY) / 3600000);
      const m = Math.floor((abs % 3600000) / 60000);
      const s = Math.floor((abs % 60000) / 1000);
      main = `${d} 天 ${h} 小时 ${m} 分 ${s} 秒`;
      lines = [
        `折合 ${(abs / 3600000).toFixed(2)} 小时 · ${Math.round(abs / 60000)} 分钟 · ${Math.round(abs / 1000)} 秒`,
        `起点 ${fmtFull(new Date(a))}（${WD[new Date(a).getDay()]}）`,
        `终点 ${fmtFull(new Date(b))}（${WD[new Date(b).getDay()]}）`,
        diff === 0
          ? '两个时刻完全相同'
          : diff > 0
          ? `终点比起点晚 ${d ? d + ' 天 ' : ''}${h}:${pad(m)}:${pad(s)}`
          : `终点比起点早 ${d ? d + ' 天 ' : ''}${h}:${pad(m)}:${pad(s)}（上方取相隔时长）`,
      ];
    }
  } else {
    const base = parseDT(d1, t1);
    const n = parseFloat(amount);
    if (base === null) {
      hint = '先填基准日期，例如 2026-10-16';
    } else if (isNaN(n) || amount.trim() === '') {
      hint = '请输入要加减的数值，可以是小数，例如 1.5';
    } else {
      const mul = unit === '分' ? 60000 : unit === '时' ? 3600000 : DAY;
      const delta = sign * n * mul;
      const target = new Date(base + delta);
      main = fmtFull(target);
      const abs = Math.abs(delta);
      const dd = Math.floor(abs / DAY);
      const hh = Math.floor((abs % DAY) / 3600000);
      const mm = Math.round((abs % 3600000) / 60000);
      lines = [
        `${WD[target.getDay()]} · 距今天 ${Math.round((target.getTime() - Date.now()) / DAY)} 天`,
        `计算过程：${fmtFull(new Date(base))} ${sign > 0 ? '+' : '−'} ${n} ${unit}（共 ${dd} 天 ${hh} 小时 ${mm} 分）`,
        `时间戳（秒）${Math.floor(target.getTime() / 1000)}`,
      ];
    }
  }

  const setNow1 = () => {
    const n = new Date();
    setD1(fmtDate(n));
    setT1(`${pad(n.getHours())}:${pad(n.getMinutes())}`);
  };
  const setNow2 = () => {
    const n = new Date();
    setD2(fmtDate(n));
    setT2(`${pad(n.getHours())}:${pad(n.getMinutes())}`);
  };
  const shiftDay = (n: number) => {
    const base = parseDT(d2, t2) ?? parseDT(d1, t1);
    if (base === null) return;
    const d = new Date(base + n * DAY);
    setD2(fmtDate(d));
    setT2(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };
  const swap = () => {
    const od = d1;
    const ot = t1;
    setD1(d2);
    setT1(t2);
    setD2(od);
    setT2(ot);
  };
  const reset = () => {
    setD1(fmtDate(now));
    setT1(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    setD2(fmtDate(now));
    setT2(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    setAmount('1');
    setUnit('天');
    setSign(1);
  };

  return (
    <Page id="timecalc" title="时间计算器" onBack={onBack}>
      <Segmented
        options={[
          { label: '算两刻相差', value: 'diff' as const },
          { label: '加减一段时长', value: 'shift' as const },
        ]}
        value={mode}
        onChange={setMode}
        style={{ marginBottom: 12 }}
      />

      <Card>
        <DTInput
          label={mode === 'diff' ? '起点' : '基准时刻'}
          date={d1}
          time={t1}
          onDate={setD1}
          onTime={setT1}
          onNow={setNow1}
        />

        {mode === 'diff' ? (
          <>
            <View style={st.chipWrap}>
              <Chip text="交换起止" icon="swap" onPress={swap} />
              <Chip text="终点 +1 天" onPress={() => shiftDay(1)} />
              <Chip text="终点 −1 天" onPress={() => shiftDay(-1)} />
            </View>
            <DTInput
              label="终点"
              date={d2}
              time={t2}
              onDate={setD2}
              onTime={setT2}
              onNow={setNow2}
            />
          </>
        ) : (
          <>
            <View style={{ height: 4 }} />
            <Text style={st.dtLabel}>加减多少</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TextInput
                style={[st.input, { flex: 1 }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="1.5"
                placeholderTextColor={p.faint}
                keyboardType="numbers-and-punctuation"
              />
              <Tap
                onPress={() => setSign(sign === 1 ? -1 : 1)}
                style={[st.signBtn, { backgroundColor: p.primarySoft, borderColor: p.primary + '55' }]}>
                <Text style={[st.signTxt, { color: p.primary }]}>{sign > 0 ? '往后 +' : '往前 −'}</Text>
              </Tap>
            </View>
            <Segmented
              options={[
                { label: '分钟', value: '分' as const },
                { label: '小时', value: '时' as const },
                { label: '天', value: '天' as const },
              ]}
              value={unit}
              onChange={setUnit}
              style={{ marginTop: 10 }}
            />
            <View style={st.chipWrap}>
              <Chip text="基准取现在" icon="clock" onPress={setNow1} />
              <Chip text="基准 +1 天" onPress={() => { const n = new Date(); setD1(fmtDate(new Date(n.getTime() + DAY))); }} />
              <Chip text="基准 −1 天" onPress={() => { const n = new Date(); setD1(fmtDate(new Date(n.getTime() - DAY))); }} />
            </View>
          </>
        )}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={st.sec}>结果</Text>
          <Tap onPress={reset} style={st.miniBtn} hitSlop={6}>
            <Icon name="refresh" size={14} color={p.sub} strokeWidth={2} />
            <Text style={[st.miniTxt, { color: p.sub }]}>重置</Text>
          </Tap>
        </View>

        {main ? (
          <>
            <View style={[st.outBox, { backgroundColor: p.primarySoft, borderColor: p.primary + '44' }]}>
              <Text style={[st.outMain, { color: p.isDark ? '#fff' : p.primary }]} selectable>
                {main}
              </Text>
            </View>
            {lines.map((l, i) => (
              <Text key={i} style={[st.outLine, { color: p.sub }]} selectable>
                {l}
              </Text>
            ))}
          </>
        ) : (
          <Text style={[st.outLine, { color: p.faint }]}>
            照着上面填好日期时间，结果会实时算出来。
          </Text>
        )}

        {hint ? (
          <Text style={{ color: p.warn, fontSize: 12.5, lineHeight: 19, marginTop: 10 }}>{hint}</Text>
        ) : null}
      </Card>
    </Page>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    sec: { fontSize: 15, fontWeight: '600', color: C.text },
    dtBox: { marginBottom: 4 },
    dtHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 7,
    },
    dtLabel: { fontSize: 12.5, color: C.sub, fontWeight: '600' },
    miniBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 9,
      backgroundColor: C.chip,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.chipBorder,
    },
    miniTxt: { fontSize: 11.5, fontWeight: '600' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
    input: {
      backgroundColor: C.input,
      borderRadius: 13,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.line,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 15,
      color: C.text,
      letterSpacing: 0.4,
    },
    signBtn: {
      paddingHorizontal: 14,
      borderRadius: 13,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signTxt: { fontSize: 13.5, fontWeight: '700' },
    outBox: {
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 10,
    },
    outMain: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
    outLine: { fontSize: 12.5, lineHeight: 21 },
  }),
);
