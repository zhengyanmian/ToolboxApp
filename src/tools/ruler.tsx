import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Page, Card, Btn, Row, C } from '../ui';
import { PixelRatio } from 'react-native';

/** 安卓标准：1dp = 1/160 英寸 → 1cm = 37.795dp */
const DP_PER_CM = 37.7952755906;

export default function Ruler({ onBack }: { onBack: () => void }) {
  const [vertical, setVertical] = useState(false);
  const [cms, setCms] = useState(15);
  const dpPerMm = DP_PER_CM / 10;

  const ticks = [];
  for (let mm = 0; mm <= cms * 10; mm++) {
    const major = mm % 10 === 0;
    const mid = mm % 5 === 0;
    ticks.push(
      <View
        key={mm}
        style={
          vertical
            ? {
                height: dpPerMm,
                flexDirection: 'row',
                alignItems: 'center',
              }
            : { width: dpPerMm, alignItems: 'center', justifyContent: 'flex-start' }
        }>
        {vertical ? (
          <View
            style={{
              width: major ? 22 : mid ? 14 : 8,
              height: 1,
              backgroundColor: major ? C.text : C.sub,
            }}
          />
        ) : (
          <View
            style={{
              width: 1,
              height: major ? 22 : mid ? 14 : 8,
              backgroundColor: major ? C.text : C.sub,
            }}
          />
        )}
        {major && mm > 0 && (
          <Text style={vertical ? st.numV : st.num}>{mm / 10}</Text>
        )}
      </View>,
    );
  }

  return (
    <Page id="ruler" title="尺子" onBack={onBack}>
      <Card>
        <Row>
          <Btn text={vertical ? '横向' : '竖向'} onPress={() => setVertical(!vertical)} />
          <Btn text="−5cm" onPress={() => setCms(Math.max(5, cms - 5))} />
          <Btn text="+5cm" onPress={() => setCms(cms + 5)} />
        </Row>
        <Text style={st.cal}>
          刻度按标准 Android 密度换算（1cm = {DP_PER_CM.toFixed(1)}dp）。不同机型可能有 ±2% 误差：拿一张银行卡（85.6mm 长）贴屏比对，若偏差明显，按比例心算校正。
        </Text>
      </Card>
      <Card style={{ paddingVertical: 20 }}>
        <ScrollView
          horizontal={!vertical}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={vertical ? { alignItems: 'center' } : { paddingLeft: 14 }}>
          {vertical ? (
            <View style={{ flexDirection: 'column', height: cms * DP_PER_CM + 40 }}>{ticks}</View>
          ) : (
            <View style={{ flexDirection: 'row', width: cms * DP_PER_CM + 40 }}>{ticks}</View>
          )}
        </ScrollView>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  num: { fontSize: 9, color: C.sub, marginTop: 2 },
  numV: { fontSize: 9, color: C.sub, marginLeft: 4 },
  cal: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 10 },
});
