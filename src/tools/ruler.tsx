import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, Chip, GlassLayer, Icon, Page, Tap, dynStyles } from '../ui';
import type { IconName } from '../icons';
import { usePalette } from '../theme';
import { getScreenMetrics, setImmersive, setOrientation } from '../native';

/** 名义换算：1dp = 1/160 英寸。真实值优先取屏幕的 xdpi（见下） */
const NOMINAL_DP_PER_MM = 37.7952755906 / 10;
const SCALE_KEY = 'toolbox.ruler.dpmm';

const KNOWN = [
  { label: '银行卡短边', mm: 53.98 },
  { label: '银行卡长边', mm: 85.6 },
  { label: 'A4 短边', mm: 210 },
  { label: 'A4 长边', mm: 297 },
];

export default function Ruler({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const { width } = useWindowDimensions();

  const [dpPerMm, setDpPerMm] = useState(NOMINAL_DP_PER_MM);
  const [baseDpPerMm, setBaseDpPerMm] = useState(NOMINAL_DP_PER_MM);
  const [cms, setCms] = useState(15);
  const [cursor, setCursor] = useState(0);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [sheet, setSheet] = useState(false);
  const [knownIdx, setKnownIdx] = useState(1);
  const [mmText, setMmText] = useState('85.6');
  const [autoFit, setAutoFit] = useState(true);

  /* 尺子要贴着屏幕长边量东西：进入即锁横屏 + 沉浸（隐藏状态栏），离开恢复 */
  useEffect(() => {
    setOrientation('landscape');
    setImmersive(true);
    return () => {
      setOrientation('auto');
      setImmersive(false);
    };
  }, []);

  /* 物理尺寸：优先用真实 xdpi，而不是 densityDpi（后者只决定排版大小） */
  useEffect(() => {
    let alive = true;
    (async () => {
      const m = await getScreenMetrics();
      if (!alive) return;
      let base = NOMINAL_DP_PER_MM;
      if (m && m.xdpi > 100 && m.xdpi < 900) {
        const density = m.density || m.densityDpi / 160 || 1;
        const v = m.xdpi / 25.4 / density;
        if (v > 2 && v < 12) base = v;
      }
      setBaseDpPerMm(base);
      const saved = await AsyncStorage.getItem(SCALE_KEY);
      const n = saved ? parseFloat(saved) : NaN;
      setDpPerMm(isFinite(n) && n > 1 && n < 20 ? n : base);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const totalMm = Math.max(10, Math.round(cms * 10));
  const len = area.w || width;

  const ref = useRef({ len });
  ref.current = { len };
  const startPos = useRef(0);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const v = e.nativeEvent.locationX;
        startPos.current = v;
        setCursor(Math.max(0, Math.min(ref.current.len, v)));
      },
      onPanResponderMove: (_e, g) => {
        setCursor(Math.max(0, Math.min(ref.current.len, startPos.current + g.dx)));
      },
    }),
  ).current;

  const ticks = useMemo(() => {
    const out: { pos: number; mm: number; major: boolean; mid: boolean }[] = [];
    for (let mm = 0; mm <= totalMm; mm++) {
      const pos = mm * dpPerMm;
      if (pos > len + 0.5) break;
      out.push({ pos, mm, major: mm % 10 === 0, mid: mm % 5 === 0 });
    }
    return out;
  }, [totalMm, dpPerMm, len]);

  /* 第一次拿到宽度时让量程自动铺满屏幕长边（固定 15cm 在横屏下会显得太短） */
  useEffect(() => {
    if (!autoFit || !area.w || !dpPerMm) return;
    const fitCm = Math.floor(area.w / (dpPerMm * 10));
    if (fitCm >= 5) setCms(Math.min(40, fitCm));
    setAutoFit(false);
  }, [area.w, dpPerMm, autoFit]);

  const cursorMm = dpPerMm > 0 ? cursor / dpPerMm : 0;
  const realMm = parseFloat(mmText);
  const k = dpPerMm / baseDpPerMm;

  const applyCalib = useCallback(() => {
    if (!(isFinite(realMm) && realMm > 0) || cursorMm <= 1) return;
    const next = Math.max(1, Math.min(20, cursor / realMm));
    setDpPerMm(next);
    AsyncStorage.setItem(SCALE_KEY, String(next)).catch(() => {});
    setSheet(false);
  }, [realMm, cursorMm, cursor]);

  const resetDefault = useCallback(() => {
    setDpPerMm(baseDpPerMm);
    AsyncStorage.setItem(SCALE_KEY, String(baseDpPerMm)).catch(() => {});
  }, [baseDpPerMm]);

  const stripH = 116;
  const cursorPos = Math.max(0, Math.min(len, cursor));

  return (
    <Page
      id="ruler"
      title="尺子"
      onBack={onBack}
      scroll={false}
      headerless
      noDetail
      contentStyle={{ padding: 0 }}>
      <View style={st.root}>
        {/* 尺身：贴屏幕最上沿，0 刻度就在屏幕边缘 */}
        <View
          style={[st.strip, { height: stripH, backgroundColor: p.cardSolid, borderColor: p.line }]}
          onLayout={(e) =>
            setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          }
          {...pan.panHandlers}>
          {ticks.map((t) => {
            const size = t.major ? 30 : t.mid ? 19 : 11;
            return (
              <React.Fragment key={t.mm}>
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: t.pos,
                    top: 0,
                    width: t.major ? 1.5 : 1,
                    height: size,
                    backgroundColor: t.major ? p.text : t.mid ? p.sub : p.faint,
                  }}
                />
                {t.major ? (
                  <Text style={[st.num, { left: t.pos + 3, color: p.sub }]}>{t.mm / 10}</Text>
                ) : null}
              </React.Fragment>
            );
          })}
          {cursor > 0 ? (
            <>
              <View
                pointerEvents="none"
                style={[st.cursor, { left: cursorPos, backgroundColor: p.primary }]}
              />
              <View
                pointerEvents="none"
                style={[
                  st.tag,
                  {
                    left: Math.max(4, Math.min(Math.max(4, len - 74), cursorPos - 34)),
                    backgroundColor: p.primary,
                  },
                ]}>
                <Text style={st.tagTxt}>{cursorMm.toFixed(1)} mm</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[st.hint, { color: p.faint }]}>
            把物体一端对准屏幕边缘，滑动尺身拖出读数线
          </Text>
        </View>

        {/* 底部悬浮控件 */}
        <View style={st.dock}>
          <Tap
            onPress={onBack}
            glow
            style={[st.round, { backgroundColor: p.chip, borderColor: p.chipBorder }]}>
            <Icon name="chevron" size={20} color={p.text} />
          </Tap>

          <View style={[st.pill, { backgroundColor: p.card, borderColor: p.cardBorder }]}>
            <GBtn name="minus" onPress={() => setCms((c) => Math.max(2, c - 1))} />
            <Text style={[st.len, { color: p.text }]}>{cms} cm</Text>
            <GBtn name="plus" onPress={() => setCms((c) => Math.min(40, c + 1))} />
          </View>

          <Tap
            onPress={() => setSheet(true)}
            glow
            style={[st.round, st.calib, { backgroundColor: p.primary, borderColor: 'transparent' }]}>
            <Icon name="target" size={19} color={p.onPrimary} />
          </Tap>
        </View>

        <Modal
          visible={sheet}
          transparent
          animationType="fade"
          onRequestClose={() => setSheet(false)}>
          <Pressable
            onPress={() => setSheet(false)}
            style={{ flex: 1, backgroundColor: p.overlay, justifyContent: 'flex-end' }}>
            <Pressable
              onPress={() => {}}
              style={{
                backgroundColor: p.cardSolid,
                borderTopLeftRadius: 26,
                borderTopRightRadius: 26,
                padding: 18,
                paddingBottom: 24,
                overflow: 'hidden',
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: p.cardBorder,
              }}>
              <GlassLayer radius={26} tone="card" />
              <View style={st.sheetHead}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: p.text }}>校准尺子</Text>
                <Tap onPress={() => setSheet(false)} hitSlop={10}>
                  <Icon name="close" size={20} color={p.sub} />
                </Tap>
              </View>
              <Text style={[st.note, { color: p.sub }]}>
                先把物体一端对齐屏幕上的 0 刻度，再把读数线拖到另一端，然后选一个已知尺寸的参照物点应用。
              </Text>

              <View style={st.readRow}>
                <View style={[st.readBox, { backgroundColor: p.primarySoft }]}>
                  <Text style={{ fontSize: 11.5, color: p.sub }}>读数线</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: p.primary }}>
                    {cursorMm.toFixed(1)} mm
                  </Text>
                </View>
                <Icon name="next" size={16} color={p.faint} />
                <View style={[st.readBox, { backgroundColor: p.chip }]}>
                  <Text style={{ fontSize: 11.5, color: p.sub }}>当前比例</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: p.text }}>
                    {k.toFixed(3)}×
                  </Text>
                </View>
              </View>

              <Text style={[st.sheetLabel, { color: p.text }]}>选择校准方式</Text>
              <View style={st.chipWrap}>
                {KNOWN.map((o, i) => (
                  <Chip
                    key={o.label}
                    text={`${o.label} ${o.mm}mm`}
                    active={knownIdx === i}
                    onPress={() => {
                      setKnownIdx(i);
                      setMmText(String(o.mm));
                    }}
                  />
                ))}
              </View>

              <Text style={[st.sheetLabel, { color: p.text, marginTop: 12 }]}>
                或输入实测长度（毫米）
              </Text>
              <View style={[st.inputWrap, { backgroundColor: p.input, borderColor: p.line }]}>
                <TextInput
                  value={mmText}
                  onChangeText={setMmText}
                  keyboardType="decimal-pad"
                  placeholder="例如 85.6"
                  placeholderTextColor={p.faint}
                  style={{ flex: 1, fontSize: 16, color: p.text, paddingVertical: 11 }}
                />
                <Text style={{ fontSize: 13, color: p.sub }}>mm</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Btn text="恢复默认" kind="ghost" fit icon="refresh" onPress={resetDefault} />
                <Btn text="应用校准" icon="check" onPress={applyCalib} style={{ flex: 1 }} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </Page>
  );
}

function GBtn(props: { name: IconName; onPress: () => void }) {
  const p = usePalette();
  return (
    <Tap onPress={props.onPress} glow scaleTo={0.9} style={st.gbtn} hitSlop={6}>
      <Icon name={props.name} size={17} color={p.text} />
    </Tap>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    root: { flex: 1 },
    strip: {
      alignSelf: 'stretch',
      overflow: 'hidden',
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    num: { position: 'absolute', top: 34, fontSize: 11, fontWeight: '600' },
    cursor: { position: 'absolute', top: 0, bottom: 0, width: 2 },
    tag: {
      position: 'absolute',
      top: 74,
      minWidth: 68,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 9,
      alignItems: 'center',
    },
    tagTxt: { color: '#ffffff', fontSize: 10.5, fontWeight: '700' },
    hint: { fontSize: 12, textAlign: 'center', paddingHorizontal: 30 },
    dock: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 14,
    },
    round: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
    },
    calib: { width: 52, height: 52, borderRadius: 26 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
    },
    gbtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    len: { fontSize: 14, fontWeight: '700', minWidth: 52, textAlign: 'center' },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sheetLabel: { fontSize: 12.5, fontWeight: '700', marginTop: 14, marginBottom: 8 },
    note: { fontSize: 11.5, lineHeight: 17, marginTop: 6 },
    readRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
    readBox: { flex: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 14,
      paddingHorizontal: 13,
      borderWidth: StyleSheet.hairlineWidth,
    },
  }),
);
