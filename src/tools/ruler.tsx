import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Btn,
  Card,
  Chip,
  GlassLayer,
  Icon,
  KV,
  Page,
  Row,
  SectionTitle,
  Tap,
  dynStyles,
} from '../ui';
import type { IconName } from '../icons';
import { usePalette } from '../theme';

/** Android 标准换算：1dp = 1/160 英寸 → 1cm = 37.795dp */
const DP_PER_CM = 37.7952755906;
const DP_PER_MM = DP_PER_CM / 10;
const SCALE_KEY = 'toolbox.ruler.scale';

/** 校准参照物 */
const KNOWN = [
  { label: '银行卡短边', mm: 53.98, hint: '银行卡宽度 53.98mm' },
  { label: '银行卡长边', mm: 85.6, hint: '银行卡长度 85.6mm' },
  { label: 'A4 短边', mm: 210, hint: 'A4 纸宽度 210mm' },
  { label: 'A4 长边', mm: 297, hint: 'A4 纸高度 297mm' },
];

export default function Ruler({ onBack }: { onBack: () => void }) {
  const p = usePalette();

  const [vertical, setVertical] = useState(false);
  const [cms, setCms] = useState(15);
  const [k, setK] = useState(1);
  const [cursor, setCursor] = useState(0);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [sheet, setSheet] = useState(false);
  const [knownIdx, setKnownIdx] = useState(1);
  const [mmText, setMmText] = useState('85.6');

  useEffect(() => {
    AsyncStorage.getItem(SCALE_KEY)
      .then((v) => {
        const n = v ? parseFloat(v) : NaN;
        if (isFinite(n) && n > 0.3 && n < 3) setK(n);
      })
      .catch(() => {});
  }, []);

  const dpPerMm = DP_PER_MM * k;
  const totalMm = Math.max(10, Math.round(cms * 10));
  const len = vertical ? area.h : area.w;

  const ref = useRef({ vertical, len });
  ref.current = { vertical, len };
  const startPos = useRef(0);
  const cursorRef = useRef(0);
  cursorRef.current = cursor;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const v = ref.current.vertical ? locationY : locationX;
        startPos.current = v;
        setCursor(Math.max(0, Math.min(ref.current.len, v)));
      },
      onPanResponderMove: (_e, g) => {
        const d = ref.current.vertical ? g.dy : g.dx;
        setCursor(Math.max(0, Math.min(ref.current.len, startPos.current + d)));
      },
    }),
  ).current;

  const ticks = useMemo(() => {
    const out: { pos: number; mm: number; major: boolean; mid: boolean }[] = [];
    for (let mm = 0; mm <= totalMm; mm++) {
      const pos = mm * dpPerMm;
      if (len > 0 && pos > len + 0.5) break;
      out.push({ pos, mm, major: mm % 10 === 0, mid: mm % 5 === 0 });
    }
    return out;
  }, [totalMm, dpPerMm, len]);

  const cursorMm = dpPerMm > 0 ? cursor / dpPerMm : 0;
  const realMm = parseFloat(mmText);
  const previewK =
    isFinite(realMm) && realMm > 0 && cursorMm > 0 ? (cursorMm * k) / realMm : k;

  const applyCalib = useCallback(() => {
    if (!(isFinite(realMm) && realMm > 0) || cursorMm <= 1) return;
    const nk = Math.max(0.3, Math.min(3, (cursorMm * k) / realMm));
    setK(nk);
    AsyncStorage.setItem(SCALE_KEY, String(nk)).catch(() => {});
    setSheet(false);
  }, [realMm, cursorMm, k]);

  const resetDefault = useCallback(() => {
    setK(1);
    AsyncStorage.setItem(SCALE_KEY, '1').catch(() => {});
  }, []);

  const cursorPos = Math.max(0, Math.min(len, cursor));
  const stripH = 92;

  return (
    <Page id="ruler" title="尺子" onBack={onBack} scroll={false} contentStyle={{ padding: 0 }}>
      <View style={st.root}>
        {/* 工具条 */}
        <View style={st.toolbar}>
          <GBtn name="swap" onPress={() => setVertical((v) => !v)} />
          <GBtn name="minus" disabled={cms <= 5} onPress={() => setCms((c) => Math.max(5, c - 5))} />
          <Text style={[st.len, { color: p.text }]}>{cms} cm</Text>
          <GBtn name="plus" disabled={cms >= 40} onPress={() => setCms((c) => Math.min(40, c + 5))} />
          <View style={{ flex: 1 }} />
          <Text style={[st.kTxt, { color: p.faint }]}>k {k.toFixed(4)}</Text>
        </View>

        {/* 尺身：贴着屏幕的一条边，0 刻度就在边缘上 */}
        {vertical ? (
          <View style={st.stageRow}>
            <View
              style={[st.stripV, { width: stripH, backgroundColor: p.cardSolid, borderColor: p.line }]}
              onLayout={(e) =>
                setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
              }
              {...pan.panHandlers}>
              <GlassLayer radius={0} tone="card" />
              {ticks.map((t) => {
                const size = t.major ? 26 : t.mid ? 16 : 9;
                return (
                  <React.Fragment key={t.mm}>
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: t.pos,
                        left: 0,
                        width: size,
                        height: 1,
                        backgroundColor: t.major ? p.text : t.mid ? p.sub : p.faint,
                      }}
                    />
                    {t.major ? (
                      <Text style={[st.numV, { top: t.pos + 2, color: p.sub }]}>{t.mm / 10}</Text>
                    ) : null}
                  </React.Fragment>
                );
              })}
              <View
                pointerEvents="none"
                style={[st.curV, { top: cursorPos, backgroundColor: p.primary }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <InfoPanel k={k} cms={cms} totalMm={totalMm} cursorMm={cursorMm} onCalib={() => setSheet(true)} />
            </View>
          </View>
        ) : (
          <>
            <View
              style={[
                st.stripH,
                { height: stripH, backgroundColor: p.cardSolid, borderColor: p.line },
              ]}
              onLayout={(e) =>
                setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
              }
              {...pan.panHandlers}>
              <GlassLayer radius={0} tone="card" />
              {ticks.map((t) => {
                const size = t.major ? 26 : t.mid ? 16 : 9;
                return (
                  <React.Fragment key={t.mm}>
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: t.pos,
                        top: 0,
                        width: 1,
                        height: size,
                        backgroundColor: t.major ? p.text : t.mid ? p.sub : p.faint,
                      }}
                    />
                    {t.major ? (
                      <Text style={[st.numH, { left: t.pos + 2, color: p.sub }]}>{t.mm / 10}</Text>
                    ) : null}
                  </React.Fragment>
                );
              })}
              <View
                pointerEvents="none"
                style={[st.curH, { left: cursorPos, backgroundColor: p.primary }]}
              />
              <View
                pointerEvents="none"
                style={[
                  st.cursorTag,
                  {
                    left: Math.max(4, Math.min(Math.max(4, len - 62), cursorPos - 30)),
                    backgroundColor: p.primary,
                  },
                ]}>
                <Text style={st.cursorTxt}>{cursorMm.toFixed(1)} mm</Text>
              </View>
            </View>
            <InfoPanel k={k} cms={cms} totalMm={totalMm} cursorMm={cursorMm} onCalib={() => setSheet(true)} />
          </>
        )}

        {/* 校准入口：右下角一颗按钮 */}
        <Tap
          onPress={() => setSheet(true)}
          scaleTo={0.92}
          style={[st.fab, { backgroundColor: p.primary }]}>
          <GlassLayer radius={999} tone="primary" />
          <Icon name="target" size={19} color={p.onPrimary} />
          <Text style={[st.fabTxt, { color: p.onPrimary }]}>校准</Text>
        </Tap>

        <CalibSheet
          visible={sheet}
          onClose={() => setSheet(false)}
          k={k}
          cursorMm={cursorMm}
          previewK={previewK}
          knownIdx={knownIdx}
          mmText={mmText}
          onPickKnown={(i) => {
            setKnownIdx(i);
            setMmText(String(KNOWN[i].mm));
          }}
          onChangeMm={setMmText}
          onApply={applyCalib}
          onReset={resetDefault}
        />
      </View>
    </Page>
  );
}

function InfoPanel(props: {
  k: number;
  cms: number;
  totalMm: number;
  cursorMm: number;
  onCalib: () => void;
}) {
  const p = usePalette();
  return (
    <View style={{ padding: 14, paddingTop: 12 }}>
      <Card pad={13}>
        <SectionTitle text="读数" style={{ marginTop: 0 }} />
        <Text style={[st.bigNum, { color: p.primary }]}>{props.cursorMm.toFixed(1)}</Text>
        <Text style={[st.bigUnit, { color: p.sub }]}>
          毫米 · 约 {(props.cursorMm / 10).toFixed(2)} 厘米
        </Text>
        <Text style={[st.tip, { color: p.faint }]}>
          用手指在尺身上滑动可以拖出读数线，把尺子刻度边对准物体一端、读数线对准另一端即可。
        </Text>
      </Card>

      <Card pad={13}>
        <KV k="校正系数 k" v={props.k.toFixed(4)} />
        <KV
          k="相对标准误差"
          v={`${props.k >= 1 ? '+' : ''}${((props.k - 1) * 100).toFixed(2)}%`}
        />
        <KV k="当前量程" v={`${props.cms} cm · ${props.totalMm} mm`} />
        <Text style={[st.tip, { color: p.faint }]}>
          标准换算 1cm = {DP_PER_CM.toFixed(3)}dp（Android 1dp = 1/160 英寸）。屏幕标称密度与实际物理
          尺寸可能有 ±2% 偏差，拿银行卡或 A4 纸比对一下就能校准。
        </Text>
        <View style={{ marginTop: 10 }}>
          <Btn text="打开校准" icon="target" size="sm" onPress={props.onCalib} />
        </View>
      </Card>
    </View>
  );
}

function CalibSheet(props: {
  visible: boolean;
  onClose: () => void;
  k: number;
  cursorMm: number;
  previewK: number;
  knownIdx: number;
  mmText: string;
  onPickKnown: (i: number) => void;
  onChangeMm: (v: string) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const p = usePalette();
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable
        onPress={props.onClose}
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
            <Tap onPress={props.onClose} hitSlop={10}>
              <Icon name="close" size={20} color={p.sub} />
            </Tap>
          </View>
          <Text style={[st.tip, { color: p.sub, marginTop: 2 }]}>
            第 1 步：把物体的一端对齐屏幕上的 0 刻度。第 2 步：滑动尺身把读数线拖到物体另一端。
            第 3 步：下面选一个已知尺寸的参照物，点应用。
          </Text>

          <View style={st.readRow}>
            <View style={[st.readBox, { backgroundColor: p.primarySoft }]}>
              <Text style={{ fontSize: 11.5, color: p.sub }}>读数线</Text>
              <Text style={{ fontSize: 19, fontWeight: '800', color: p.primary }}>
                {props.cursorMm.toFixed(1)} mm
              </Text>
            </View>
            <Icon name="next" size={16} color={p.faint} />
            <View style={[st.readBox, { backgroundColor: p.chip }]}>
              <Text style={{ fontSize: 11.5, color: p.sub }}>应用后 k</Text>
              <Text style={{ fontSize: 19, fontWeight: '800', color: p.text }}>
                {props.previewK.toFixed(4)}
              </Text>
            </View>
          </View>

          <Text style={[st.sheetLabel, { color: p.text }]}>选择校准方式</Text>
          <View style={st.chipWrap}>
            {KNOWN.map((o, i) => (
              <Chip
                key={o.label}
                text={`${o.label} ${o.mm}mm`}
                active={props.knownIdx === i}
                onPress={() => props.onPickKnown(i)}
              />
            ))}
          </View>

          <Text style={[st.sheetLabel, { color: p.text, marginTop: 12 }]}>或输入实测长度（毫米）</Text>
          <View style={[st.inputWrap, { backgroundColor: p.input, borderColor: p.line }]}>
            <TextInput
              value={props.mmText}
              onChangeText={props.onChangeMm}
              keyboardType="decimal-pad"
              placeholder="例如 85.6"
              placeholderTextColor={p.faint}
              style={{ flex: 1, fontSize: 16, color: p.text, paddingVertical: 11 }}
            />
            <Text style={{ fontSize: 13, color: p.sub }}>mm</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Btn text="恢复 k=1" kind="ghost" fit icon="refresh" onPress={props.onReset} />
            <Btn text="应用校准" icon="check" onPress={props.onApply} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function GBtn(props: { name: IconName; onPress: () => void; active?: boolean; disabled?: boolean }) {
  const p = usePalette();
  return (
    <Tap
      onPress={props.onPress}
      disabled={props.disabled}
      scaleTo={0.9}
      style={[
        st.gbtn,
        {
          backgroundColor: props.active ? p.primary : p.chip,
          borderColor: props.active ? 'transparent' : p.chipBorder,
        },
      ]}>
      <Icon name={props.name} size={17} color={props.active ? p.onPrimary : p.text} />
    </Tap>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    root: { flex: 1 },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    gbtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    len: { fontSize: 13, fontWeight: '700', minWidth: 46, textAlign: 'center' },
    kTxt: { fontSize: 11.5, fontWeight: '600' },
    stageRow: { flexDirection: 'row', flex: 1 },
    stripH: {
      alignSelf: 'stretch',
      overflow: 'hidden',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    stripV: {
      alignSelf: 'stretch',
      overflow: 'hidden',
      borderRightWidth: StyleSheet.hairlineWidth,
    },
    numH: { position: 'absolute', top: 30, fontSize: 10 },
    numV: { position: 'absolute', left: 30, width: 40, fontSize: 10 },
    curH: { position: 'absolute', top: 0, bottom: 0, width: 2 },
    curV: { position: 'absolute', left: 0, right: 0, height: 2 },
    cursorTag: {
      position: 'absolute',
      top: 54,
      minWidth: 60,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 9,
      alignItems: 'center',
    },
    cursorTxt: { color: '#ffffff', fontSize: 10.5, fontWeight: '700' },
    bigNum: { fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
    bigUnit: { fontSize: 12.5, marginTop: 2 },
    tip: { fontSize: 11.5, lineHeight: 17, marginTop: 8 },
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 22,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 999,
      overflow: 'hidden',
    },
    fabTxt: { fontSize: 14, fontWeight: '700' },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sheetLabel: { fontSize: 12.5, fontWeight: '700', marginTop: 14, marginBottom: 8 },
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
