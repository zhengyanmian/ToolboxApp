import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Card,
  Chip,
  Field,
  Glow,
  Icon,
  KV,
  Page,
  SectionTitle,
  Segmented,
  Slider,
  dynStyles,
} from '../ui';
import { usePalette } from '../theme';

/* ================================================================== */
/* 一、纯计算层（无副作用，便于单测）                                  */
/* ================================================================== */

/** 月薪口径：pre = 税前，after = 税后（到手） */
export type Basis = 'pre' | 'after';

export type WorkInput = {
  salaryInput: number; // 用户输入的月薪（元），口径由 basis 决定
  basis: Basis; // 税前 / 税后
  weeklyDays: number; // 每周工作天数（5 双休 / 5.5 大小周 / 6 单休）
  onDutyHours: number; // 每天「在岗」小时（含午休、不含加班）
  commuteMin: number; // 通勤单程分钟（往返按 2 倍计）
  lunchCounted: boolean; // 午休是否算作工时
  overtimeHours: number; // 每月加班小时
  bonusYear: number; // 年终奖（元/年，按税前口径）
  slackHours: number; // 每月摸鱼小时
};

export type WorkResult = {
  workDays: number; // 月工作天数
  onDutyMonthly: number; // 月在岗时长（含加班）
  effectiveMonthly: number; // 月有效工作时长（不含午休）
  commuteMonthly: number; // 月通勤时长（往返合计）
  slackMonthly: number; // 月摸鱼时长
  realMonthly: number; // 月真实投入时长 = 在岗（含加班）+ 通勤
  preTax: number; // 税前月薪
  afterTax: number; // 税后月薪（到手）
  hourlyPreSurface: number; // 表面时薪（税前）
  hourlyAfterSurface: number; // 表面时薪（税后到手）= 到手 ÷ 月在岗
  hourlyReal: number; // 真实时薪（含通勤时间成本）
  hourlySlack: number; // 摸鱼时薪（含通勤 + 摸鱼时间）
  perMinute: number; // 每分钟薪资（按真实时薪）
  annualPre: number; // 年化税前总收入（含年终奖）
  annualAfter: number; // 年化税后总收入
  dropPct: number; // 真实时薪比表面到手时薪低多少（%）
};

/** 平均每月周数：52 周 ÷ 12 月 ≈ 4.3333 */
const WEEKS_PER_MONTH = 52 / 12;
/** 午休时长假定 1 小时：当「不算工时」时从在岗时长中扣除 */
const LUNCH_HOURS = 1;
/** 五险一金个人部分粗略合计比例（养老 8% + 医疗 2% + 失业 0.5% 等） */
const SOCIAL_RATE = 0.105;
/** 个税起征点（元/月） */
const TAX_FREE = 5000;

/** 综合所得「月度」税率表：[级距上限, 税率, 速算扣除数] */
const BRACKETS: [number, number, number][] = [
  [3000, 0.03, 0],
  [12000, 0.1, 210],
  [25000, 0.2, 1410],
  [35000, 0.25, 2660],
  [55000, 0.3, 4410],
  [80000, 0.35, 7160],
  [Infinity, 0.45, 15160],
];

/** 把数值收敛到 [min, max]，非法值用 def 兜底，避免除零 / NaN */
function clamp(v: number, def: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return def;
  return Math.min(max, Math.max(min, v));
}

/** 税前月薪 → 税后月薪（先扣五险一金，再套月度税率表） */
export function afterTaxOf(pre: number): number {
  const p = Math.max(0, pre);
  const social = p * SOCIAL_RATE;
  const taxable = Math.max(0, p - social - TAX_FREE);
  for (const [cap, rate, deduct] of BRACKETS) {
    if (taxable <= cap) {
      const tax = Math.max(0, taxable * rate - deduct);
      return Math.max(0, p - social - tax);
    }
  }
  return p;
}

/** 税后月薪 → 税前月薪：afterTaxOf 单调递增，用二分反解（60 次足够精确） */
export function preFromAfter(after: number): number {
  const a = Math.max(0, after);
  if (a <= 0) return 0;
  let lo = a;
  let hi = a * 2 + 10000;
  for (let i = 0; i < 80 && afterTaxOf(hi) < a; i++) hi *= 1.5;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (afterTaxOf(mid) < a) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * 核心计算（纯函数）。
 * 公式：
 *   月工作天数 = 每周天数 × 52 ÷ 12
 *   月在岗时长 = 每天在岗 × 月工作天数 + 加班小时
 *   月通勤时长 = 单程分钟 ÷ 60 × 2 × 月工作天数
 *   月真实投入 = 月在岗 + 月通勤
 *   表面时薪   = 月薪 ÷ 月在岗时长
 *   真实时薪   = 税后月薪 ÷ 月真实投入
 *   摸鱼时薪   = 税后月薪 ÷ (月真实投入 + 月摸鱼)
 *   年化收入   = 月薪 × 12 + 年终奖
 */
export function calcWork(input: WorkInput): WorkResult {
  const weeklyDays = clamp(input.weeklyDays, 5, 0.5, 7);
  const workDays = weeklyDays * WEEKS_PER_MONTH;

  const onDutyHours = clamp(input.onDutyHours, 8, 0.5, 24);
  const effectivePerDay = Math.max(0.5, onDutyHours - (input.lunchCounted ? 0 : LUNCH_HOURS));

  const overtime = clamp(input.overtimeHours, 0, 0, 400);
  const onDutyMonthly = onDutyHours * workDays + overtime;
  const effectiveMonthly = effectivePerDay * workDays + overtime;

  const commuteMin = clamp(input.commuteMin, 0, 0, 300);
  const commuteMonthly = (commuteMin / 60) * 2 * workDays;

  const slackMonthly = clamp(input.slackHours, 0, 0, 400);
  const realMonthly = onDutyMonthly + commuteMonthly;

  const salaryInput = clamp(input.salaryInput, 0, 0, 1e8);
  let preTax = 0;
  let afterTax = 0;
  if (input.basis === 'after') {
    afterTax = salaryInput;
    preTax = preFromAfter(afterTax);
  } else {
    preTax = salaryInput;
    afterTax = afterTaxOf(preTax);
  }

  const bonus = clamp(input.bonusYear, 0, 0, 1e8);
  // 年终奖按整体税率水平折算税后（近似），避免口径混用
  const ratio = preTax > 0 ? afterTax / preTax : 1;

  const div = (a: number, b: number) => (b > 0 ? a / b : 0);
  const hourlyPreSurface = div(preTax, onDutyMonthly);
  const hourlyAfterSurface = div(afterTax, onDutyMonthly);
  const hourlyReal = div(afterTax, realMonthly);
  const hourlySlack = div(afterTax, realMonthly + slackMonthly);
  const perMinute = hourlyReal / 60;

  const annualPre = preTax * 12 + bonus;
  const annualAfter = afterTax * 12 + bonus * ratio;
  const dropPct =
    hourlyAfterSurface > 0 ? Math.max(0, (1 - hourlyReal / hourlyAfterSurface) * 100) : 0;

  return {
    workDays,
    onDutyMonthly,
    effectiveMonthly,
    commuteMonthly,
    slackMonthly,
    realMonthly,
    preTax,
    afterTax,
    hourlyPreSurface,
    hourlyAfterSurface,
    hourlyReal,
    hourlySlack,
    perMinute,
    annualPre,
    annualAfter,
    dropPct,
  };
}

/* ================================================================== */
/* 二、格式化工具                                                      */
/* ================================================================== */

/** 千分位整数（不依赖 Intl，Hermes 全兼容） */
function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return '--';
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString();
  const out = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + out;
}

function fmtMoney(n: number): string {
  return '¥' + fmtInt(n);
}

/** 把「分钟数」变成人话：分钟 / 小时 / 天（按 8 小时工作制折天） */
function fmtDur(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '--';
  if (min < 1) return '不到 1 分钟';
  if (min < 60) return `${Math.round(min)} 分钟`;
  const h = min / 60;
  if (h < 24) return `${h.toFixed(1)} 小时`;
  return `${(h / 8).toFixed(1)} 天`;
}

const WEEKLY_OPTS = [
  { label: '双休', value: 5 },
  { label: '大小周', value: 5.5 },
  { label: '单休', value: 6 },
];

const BASIS_OPTS: { label: string; value: Basis }[] = [
  { label: '税前', value: 'pre' },
  { label: '税后', value: 'after' },
];

const LUNCH_OPTS = [
  { label: '算工时', value: 1 },
  { label: '不算工时', value: 0 },
];

const SALARY_PRESETS = [6000, 8000, 12000, 20000, 30000];

/* ================================================================== */
/* 三、页面                                                            */
/* ================================================================== */

export default function WorkValue({ onBack }: { onBack: () => void }) {
  const p = usePalette();

  // 全部输入以字符串存放：滑杆与手输共用同一份状态，改哪个都会立刻重算
  const [salary, setSalary] = useState('10000');
  const [basis, setBasis] = useState<Basis>('pre');
  const [weeklyDays, setWeeklyDays] = useState(5);
  const [onDuty, setOnDuty] = useState('9');
  const [commute, setCommute] = useState('30');
  const [lunch, setLunch] = useState(1);
  const [overtime, setOvertime] = useState('10');
  const [bonus, setBonus] = useState('0');
  const [slack, setSlack] = useState('20');

  const toNum = (s: string, def: number) => {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : def;
  };

  // 任意输入变化都会重算（useMemo 依赖全部输入）
  const r = useMemo(
    () =>
      calcWork({
        salaryInput: toNum(salary, 0),
        basis,
        weeklyDays,
        onDutyHours: toNum(onDuty, 9),
        commuteMin: toNum(commute, 30),
        lunchCounted: lunch === 1,
        overtimeHours: toNum(overtime, 10),
        bonusYear: toNum(bonus, 0),
        slackHours: toNum(slack, 20),
      }),
    [salary, basis, weeklyDays, onDuty, commute, lunch, overtime, bonus, slack],
  );

  const hasSalary = toNum(salary, 0) > 0;
  const hr = r.hourlyReal;
  const conclusion = !hasSalary
    ? '先填一个月薪，结果马上出来。'
    : r.dropPct < 3
    ? `真实时薪约 ¥${hr.toFixed(1)}，通勤占比不高，时间性价比还不错。`
    : `真实时薪约 ¥${hr.toFixed(1)}，比表面到手时薪低 ${r.dropPct.toFixed(0)}%。`;

  return (
    <Page id="workvalue" title="工作性价比" onBack={onBack}>
      {/* 视觉重点：真实时薪 + 一句话结论 */}
      <Glow radius={24}>
        <View style={st.hero}>
          <View style={st.heroTop}>
            <Icon name="hourglass" size={15} color={p.sub} />
            <Text style={st.heroLabel}>真实时薪 · 把通勤也算进去</Text>
          </View>
          <View style={st.heroValueRow}>
            <Text style={st.heroUnit}>¥</Text>
            <Text style={st.heroValue}>{hasSalary ? hr.toFixed(1) : '--'}</Text>
            <Text style={st.heroSuffix}>/小时（税后到手）</Text>
          </View>
          <Text style={st.heroNote}>{conclusion}</Text>
          {hasSalary && r.dropPct >= 3 ? (
            <View style={[st.dropPill, { backgroundColor: p.warn + '1f' }]}>
              <Icon name="pulse" size={13} color={p.warn} />
              <Text style={[st.dropText, { color: p.warn }]}>
                时薪缩水 {r.dropPct.toFixed(0)}%
              </Text>
            </View>
          ) : null}
        </View>
      </Glow>

      {/* 收入 */}
      <Card>
        <SectionTitle text="我的收入" style={{ marginTop: 0 }} />
        <Segmented options={BASIS_OPTS} value={basis} onChange={setBasis} style={{ marginBottom: 14 }} />
        <Field
          label={basis === 'pre' ? '月薪（税前，元）' : '月薪（税后到手，元）'}
          value={salary}
          onChange={setSalary}
          keyboardType="numeric"
          placeholder="例如 12000"
        />
        <Text style={st.hint}>
          {basis === 'pre'
            ? '税前＝公司开的「包」，含五险一金和个税。'
            : '税后＝银行卡实际到账的钱。'}
        </Text>
        <View style={st.presetRow}>
          {SALARY_PRESETS.map((v) => (
            <Chip
              key={v}
              text={v >= 10000 ? `${v / 10000}万` : `${v / 1000}k`}
              active={Math.round(toNum(salary, 0)) === v}
              onPress={() => setSalary(String(v))}
            />
          ))}
        </View>
        <Field
          label="年终奖（元/年，没有填 0）"
          value={bonus}
          onChange={setBonus}
          keyboardType="numeric"
          placeholder="0"
          style={{ marginTop: 14, marginBottom: 0 }}
        />
      </Card>

      {/* 时间 */}
      <Card>
        <SectionTitle text="我的时间" style={{ marginTop: 0 }} />
        <Text style={st.groupLabel}>每周上班几天</Text>
        <Segmented options={WEEKLY_OPTS} value={weeklyDays} onChange={setWeeklyDays} style={{ marginBottom: 14 }} />

        <NumRow
          label="每天在岗小时"
          unit="小时"
          hint="从打卡进公司到打卡离开，含午休和会议。"
          value={onDuty}
          onChange={setOnDuty}
          min={4}
          max={16}
          step={0.5}
          def={9}
        />
        <NumRow
          label="通勤单程"
          unit="分钟"
          hint="从家到公司的单程用时，往返会自动 ×2。"
          value={commute}
          onChange={setCommute}
          min={0}
          max={120}
          step={5}
          def={30}
        />

        <Text style={st.groupLabel}>午休算工时吗</Text>
        <Segmented options={LUNCH_OPTS} value={lunch} onChange={setLunch} style={{ marginBottom: 14 }} />

        <NumRow
          label="每月加班"
          unit="小时"
          hint="统计一下这个月额外加了多少小时班。"
          value={overtime}
          onChange={setOvertime}
          min={0}
          max={120}
          step={1}
          def={10}
        />
        <NumRow
          label="每月摸鱼"
          unit="小时"
          hint="上班时间刷手机、聊天、带薪发呆的总时长。"
          value={slack}
          onChange={setSlack}
          min={0}
          max={160}
          step={5}
          def={20}
          last
        />
      </Card>

      {/* 结果明细 */}
      <Card>
        <SectionTitle text="算出来是这样" style={{ marginTop: 0 }} />
        <View style={st.grid}>
          <Metric label="表面时薪（税前）" value={`¥${r.hourlyPreSurface.toFixed(1)}`} color={p.sub} />
          <Metric label="表面时薪（到手）" value={`¥${r.hourlyAfterSurface.toFixed(1)}`} color={p.info} />
          <Metric label="真实时薪（含通勤）" value={`¥${r.hourlyReal.toFixed(1)}`} color={p.primary} />
          <Metric label="摸鱼时薪（含通勤）" value={`¥${r.hourlySlack.toFixed(1)}`} color={p.ok} />
        </View>
        <View style={st.kvWrap}>
          <KV k="每分钟薪资" v={`¥${r.perMinute.toFixed(2)}`} />
          <KV k="月工作天数" v={`${r.workDays.toFixed(1)} 天`} />
          <KV k="月真实投入时长" v={`${r.realMonthly.toFixed(0)} 小时`} />
          <KV k="其中通勤" v={`${r.commuteMonthly.toFixed(0)} 小时`} />
          <KV k="税后到手月薪" v={fmtMoney(r.afterTax)} />
          <KV k="年化税前收入" v={fmtMoney(r.annualPre)} />
          <KV k="年化税后收入" v={fmtMoney(r.annualAfter)} />
        </View>
        <Text style={st.hint}>月工作天数按「每周天数 × 52 ÷ 12」折算；通勤时长按往返计。</Text>
      </Card>

      {/* 换个说法 */}
      <Card>
        <SectionTitle text="换成实物看看" style={{ marginTop: 0 }} />
        <CostRow icon="coin" text={`一杯 20 元奶茶 ≈ 工作 ${fmtDur(r.perMinute > 0 ? 20 / r.perMinute : 0)}`} />
        <CostRow icon="cake" text={`一张 60 元电影票 ≈ 工作 ${fmtDur(r.perMinute > 0 ? 60 / r.perMinute : 0)}`} />
        <CostRow
          icon="phone"
          text={`一部 6000 元手机 ≈ 工作 ${fmtDur(hr > 0 ? (6000 / hr) * 60 : 0)}`}
          last
        />
      </Card>

      <Card>
        <Text style={st.foot}>
          口径说明：五险一金个人部分按 {Math.round(SOCIAL_RATE * 100)}% 粗估，个税套用月度税率表，年终奖按整体税负水平近似折算，均与实际申报存在误差，仅供自我参考。数字高低都不代表你值不值，只是帮你看清时间花在哪儿。
        </Text>
      </Card>
    </Page>
  );
}

/* ================================================================== */
/* 四、局部小组件                                                      */
/* ================================================================== */

/** 数值输入：一行标签 + 手输框，下方滑杆与说明，二者共用同一份字符串状态 */
function NumRow(props: {
  label: string;
  unit: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step: number;
  def: number;
  last?: boolean;
}) {
  const p = usePalette();
  const parsed = parseFloat(props.value);
  const n = Number.isFinite(parsed) ? Math.min(props.max, Math.max(props.min, parsed)) : props.def;
  return (
    <View style={[st.numRow, props.last ? { marginBottom: 0 } : null]}>
      <View style={st.numHead}>
        <Text style={st.numLabel}>{props.label}</Text>
        <View style={[st.numBox, { backgroundColor: p.input, borderColor: p.line }]}>
          <TextInput
            value={props.value}
            onChangeText={props.onChange}
            keyboardType="numeric"
            style={[st.numInput, { color: p.text }]}
            placeholderTextColor={p.faint}
            placeholder={String(props.def)}
          />
          <Text style={[st.numUnit, { color: p.sub }]}>{props.unit}</Text>
        </View>
      </View>
      <Slider
        value={n}
        onChange={(v) => props.onChange(String(v))}
        min={props.min}
        max={props.max}
        step={props.step}
        style={{ marginBottom: 4 }}
      />
      <Text style={st.hint}>{props.hint}</Text>
    </View>
  );
}

/** 结果指标小卡 */
function Metric(props: { label: string; value: string; color: string }) {
  const p = usePalette();
  return (
    <View style={[st.metric, { backgroundColor: p.chip, borderColor: p.chipBorder }]}>
      <Text style={[st.metricLabel, { color: p.sub }]}>{props.label}</Text>
      <Text style={[st.metricValue, { color: props.color }]}>{props.value}</Text>
    </View>
  );
}

/** 实物换算一行 */
function CostRow(props: { icon: 'coin' | 'cake' | 'phone'; text: string; last?: boolean }) {
  const p = usePalette();
  return (
    <View style={[st.costRow, props.last ? { borderBottomWidth: 0 } : { borderBottomColor: p.line }]}>
      <Icon name={props.icon} size={17} color={p.primary} />
      <Text style={[st.costText, { color: p.text }]}>{props.text}</Text>
    </View>
  );
}

/* ================================================================== */
/* 五、样式                                                            */
/* ================================================================== */

const st = dynStyles((C) =>
  StyleSheet.create({
    hero: { padding: 18 },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroLabel: { fontSize: 12.5, color: C.sub, fontWeight: '600' },
    heroValueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 },
    heroUnit: { fontSize: 22, fontWeight: '700', color: C.primary, marginBottom: 6, marginRight: 1 },
    heroValue: {
      fontSize: 46,
      fontWeight: '800',
      color: C.primary,
      fontVariant: ['tabular-nums'] as any,
      letterSpacing: -1,
    },
    heroSuffix: { fontSize: 12.5, color: C.sub, marginBottom: 9, marginLeft: 6 },
    heroNote: { fontSize: 13, color: C.text, lineHeight: 20, marginTop: 8 },
    dropPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      marginTop: 10,
    },
    dropText: { fontSize: 12.5, fontWeight: '700' },

    hint: { fontSize: 11.5, color: C.sub, lineHeight: 17, marginTop: 2 },
    groupLabel: { fontSize: 12.5, fontWeight: '600', color: C.sub, marginBottom: 6 },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },

    numRow: { marginBottom: 16 },
    numHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    numLabel: { fontSize: 13.5, fontWeight: '600', color: C.text },
    numBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 9,
      paddingVertical: 4,
      minWidth: 84,
      justifyContent: 'flex-end',
    },
    numInput: {
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'right',
      minWidth: 34,
      paddingVertical: 0,
    },
    numUnit: { fontSize: 11.5, marginLeft: 3 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    metric: {
      width: '47.5%',
      flexGrow: 1,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: StyleSheet.hairlineWidth,
    },
    metricLabel: { fontSize: 11.5 },
    metricValue: {
      fontSize: 19,
      fontWeight: '800',
      fontVariant: ['tabular-nums'] as any,
      marginTop: 3,
    },
    kvWrap: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: 4 },

    costRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    costText: { fontSize: 13.5, flex: 1, lineHeight: 19 },
    foot: { fontSize: 11.5, color: C.sub, lineHeight: 18 },
  }),
);
