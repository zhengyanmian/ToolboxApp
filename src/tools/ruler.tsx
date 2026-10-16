import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, Card, Chip, dynStyles, Field, Icon, KV, Page, Row, SectionTitle, Tap } from '../ui';
import type { IconName } from '../icons';
import { usePalette } from '../theme';

/** Android 标准换算：1dp = 1/160 英寸 → 1cm = 37.795dp */
const DP_PER_CM = 37.7952755906;
const DP_PER_MM = DP_PER_CM / 10;
const SCALE_KEY = 'toolbox.ruler.scale';

/** 常用参照物 */
const KNOWN = [
  { label: '银行卡 85.6mm', mm: 85.6 },
  { label: 'A4 短边 210mm', mm: 210 },
  { label: 'A4 长边 297mm', mm: 297 },
];

export default function Ruler({ onBack }: { onBack: () => void }) {
  const p = usePalette();

  const [vertical, setVertical] = useState(false);
  const [cms, setCms] = useState(15);
  const [k, setK] = useState(1);
  const [calib, setCalib] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [mmText, setMmText] = useState('85.6');
  const [knownIdx, setKnownIdx] = useState(0);
  const [area, setArea] = useState({ w: 0, h: 0 });

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

  /* 拖拽校准参考线：进入校准模式才响应手势 */
  const calibRef = useRef(calib);
  calibRef.current = calib;
  const modeRef = useRef({ vertical, len });
  modeRef.current = { vertical, len };
  const startPos = useRef(0);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => calibRef.current,
      onMoveShouldSetPanResponder: () => calibRef.current,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const v = modeRef.current.vertical ? locationY : locationX;
        startPos.current = v;
        setCursor(Math.max(0, Math.min(modeRef.current.len, v)));
      },
      onPanResponderMove: (_e, g) => {
        const d = modeRef.current.vertical ? g.dy : g.dx;
        setCursor(Math.max(0, Math.min(modeRef.current.len, startPos.current + d)));
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

  const toggleCalib = useCallback(() => {
    setCalib((v) => {
      const next = !v;
      if (next) {
        // 进入校准：把参考线放到量程 60% 处，方便拖动对齐
        setCursor((c) => (c > 0 ? c : Math.round(modeRef.current.len * 0.6)));
      }
      return next;
    });
  }, []);

  const applyCalib = useCallback(() => {
    if (!(isFinite(realMm) && realMm > 0) || cursorMm <= 1) return;
    const nk = Math.max(0.3, Math.min(3, (cursorMm * k) / realMm));
    setK(nk);
    AsyncStorage.setItem(SCALE_KEY, String(nk)).catch(() => {});
  }, [realMm, cursorMm, k]);

  const resetDefault = useCallback(() => {
    setK(1);
    AsyncStorage.setItem(SCALE_KEY, '1').catch(() => {});
  }, []);

  const onLayoutStrip = useCallback((w: number, h: number) => setArea({ w, h }), []);

  const renderTicks = () =>
    ticks.map((t) => {
      const size = t.major ? 26 : t.mid ? 16 : 9;
      const color = t.major ? p.text : t.mid ? p.sub : p.faint;
      if (vertical) {
        return (
          <React.Fragment key={t.mm}>
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: t.pos, left: 0, width: size, height: 1, backgroundColor: color }}
            />
            {t.major ? (
              <Text style={[st.numV, { top: t.pos - 6, color: p.sub }]}>{t.mm / 10}</Text>
            ) : null}
          </React.Fragment>
        );
      }
      return (
        <React.Fragment key={t.mm}>
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: t.pos, top: 0, width: 1, height: size, backgroundColor: color }}
          />
          {t.major ? (
            <Text style={[st.numH, { left: t.pos + 3, color: p.sub }]}>{t.mm / 10}</Text>
          ) : null}
        </React.Fragment>
      );
    });

  const cursorPos = Math.max(0, Math.min(len, cursor));

  const renderCursor = () => {
    if (vertical) {
      return (
        <>
          <View pointerEvents="none" style={[st.curV, { top: cursorPos, backgroundColor: p.primary }]} />
          <View
            pointerEvents="none"
            style={[st.handle, { top: cursorPos - 9, left: 0, backgroundColor: p.primary }]}
          />
          <View pointerEvents="none" style={[st.tagV, { top: cursorPos + 14, backgroundColor: p.primary }]}>
            <Text style={st.tagTxt}>{cursorMm.toFixed(1)}mm</Text>
          </View>
        </>
      );
    }
    return (
      <>
        <View pointerEvents="none" style={[st.curH, { left: cursorPos, backgroundColor: p.primary }]} />
        <View
          pointerEvents="none"
          style={[st.handle, { left: cursorPos - 9, top: 0, backgroundColor: p.primary }]}
        />
        <View
          pointerEvents="none"
          style={[
            st.tagH,
            { left: Math.max(0, Math.min(Math.max(0, len - 54), cursorPos - 26)), backgroundColor: p.primary },
          ]}>
          <Text style={st.tagTxt}>{cursorMm.toFixed(1)}mm</Text>
        </View>
      </>
    );
  };

  const infoPanel = (
    <Card>
      <SectionTitle text="刻度与校准" style={{ marginTop: 0 }} />
      <KV k="校正系数 k" v={k.toFixed(4)} />
      <KV k="相对标准误差" v={`${k >= 1 ? '+' : ''}${((k - 1) * 100).toFixed(2)}%`} />
      <KV k="当前量程" v={`${cms} cm · ${totalMm} mm`} />
      <Text style={st.tip}>
        标准换算：1 cm = {DP_PER_CM.toFixed(3)} dp（Android 1dp = 1/160 英寸）。机身屏幕密度标称值与实际物理尺寸
        可能有 ±2% 误差——拿一张银行卡（长 85.6mm）贴屏比对，偏差明显时点「进入校准」按比例修正。
      </Text>
      <Row style={{ marginTop: 12 }}>
        <Btn text="进入校准" icon="target" onPress={toggleCalib} />
        <Btn text="恢复默认 k=1" icon="refresh" kind="plain" onPress={resetDefault} />
      </Row>
    </Card>
  );

  const calibPanel = (
    <Card>
      <SectionTitle text="校准：拖动蓝色参考线" style={{ marginTop: 0 }} />
      <Text style={st.tip}>
        把参考线拖到已知物体的端点（例如银行卡长边），选择或输入它的真实长度，系统按比例重算刻度系数 k。
      </Text>
      <View style={st.chipRow}>
        {KNOWN.map((o, i) => (
          <Chip
            key={o.label}
            text={o.label}
            active={knownIdx === i}
            onPress={() => {
              setKnownIdx(i);
              setMmText(String(o.mm));
            }}
          />
        ))}
      </View>
      <Field label="实测长度（毫米）" value={mmText} onChange={setMmText} keyboardType="decimal-pad" />
      <KV k="参考线读数" v={`${cursorMm.toFixed(1)} mm`} />
      <KV k="应用后系数 k" v={previewK.toFixed(4)} />
      <Row style={{ marginTop: 12 }}>
        <Btn text="应用校准" icon="check" onPress={applyCalib} />
        <Btn text="恢复默认" icon="refresh" kind="plain" onPress={resetDefault} />
      </Row>
      <View style={{ marginTop: 10 }}>
        <Btn text="退出校准" icon="close" kind="ghost" onPress={() => setCalib(false)} />
      </View>
    </Card>
  );

  return (
    <Page id="ruler" title="尺子" onBack={onBack} scroll={false} contentStyle={{ padding: 0 }}>
      <View style={st.root}>
        <View style={st.toolbarWrap}>
          <View
            style={[
              st.toolbar,
              { backgroundColor: p.card, borderColor: p.cardBorder, shadowColor: p.cardShadow },
            ]}>
            <GBtn name="swap" onPress={() => setVertical((v) => !v)} />
            <GBtn name="minus" disabled={cms <= 5} onPress={() => setCms((c) => Math.max(5, c - 5))} />
            <Text style={[st.len, { color: p.text }]}>{cms} cm</Text>
            <GBtn name="plus" disabled={cms >= 40} onPress={() => setCms((c) => Math.min(40, c + 5))} />
            <View style={st.spacer} />
            <GBtn name="target" active={calib} onPress={toggleCalib} />
            <GBtn name="refresh" onPress={resetDefault} />
          </View>
        </View>

        {vertical ? (
          <View style={st.stageRow}>
            <View
              style={st.stripV}
              onLayout={(e) => onLayoutStrip(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
              {...(calib ? pan.panHandlers : {})}>
              {renderTicks()}
              {calib ? renderCursor() : null}
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={st.infoPad}
              showsVerticalScrollIndicator={false}>
              {calib ? calibPanel : infoPanel}
            </ScrollView>
          </View>
        ) : (
          <>
            <View
              style={st.stripH}
              onLayout={(e) => onLayoutStrip(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
              {...(calib ? pan.panHandlers : {})}>
              {renderTicks()}
              {calib ? renderCursor() : null}
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={st.infoPad}
              showsVerticalScrollIndicator={false}>
              {calib ? calibPanel : infoPanel}
            </ScrollView>
          </>
        )}
      </View>
    </Page>
  );
}

/** 工具条玻璃小圆按钮 */
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
          borderColor: props.active ? p.primary : p.chipBorder,
        },
      ]}>
      <Icon name={props.name} size={17} color={props.active ? p.onPrimary : p.text} />
    </Tap>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    root: { flex: 1 },
    toolbarWrap: { paddingHorizontal: 12, paddingTop: 10 },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      shadowOpacity: 0.8,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    gbtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    len: { fontSize: 13, fontWeight: '700', minWidth: 48, textAlign: 'center' },
    spacer: { flex: 1 },
    stageRow: { flexDirection: 'row', flex: 1 },
    stripH: { height: 76, alignSelf: 'stretch', overflow: 'hidden' },
    stripV: { width: 76, alignSelf: 'stretch', overflow: 'hidden' },
    infoPad: { padding: 14, paddingTop: 10 },
    numH: { position: 'absolute', top: 30, fontSize: 10 },
    numV: { position: 'absolute', left: 30, width: 36, fontSize: 10 },
    curH: { position: 'absolute', top: 0, bottom: 0, width: 2 },
    curV: { position: 'absolute', left: 0, right: 0, height: 2 },
    handle: { position: 'absolute', width: 18, height: 18, borderRadius: 9 },
    tagH: {
      position: 'absolute',
      top: 46,
      minWidth: 52,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      alignItems: 'center',
    },
    tagV: {
      position: 'absolute',
      left: 22,
      minWidth: 52,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      alignItems: 'center',
    },
    tagTxt: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
    tip: { fontSize: 12.5, lineHeight: 19, color: C.sub, marginTop: 10 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 12 },
  }),
);
