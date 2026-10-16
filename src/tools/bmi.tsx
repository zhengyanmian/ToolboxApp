import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, Result, C, dynStyles} from '../ui';
import { View, Text, StyleSheet } from 'react-native';

export default function BMI({ onBack }: { onBack: () => void }) {
  const [h, setH] = useState('170');
  const [w, setW] = useState('60');

  const height = parseFloat(h) / 100;
  const weight = parseFloat(w);
  const bmi = height > 0 && weight > 0 ? weight / (height * height) : NaN;

  let level = '';
  let color = C.text;
  if (!isNaN(bmi)) {
    if (bmi < 18.5) { level = '偏瘦'; color = '#f59e0b'; }
    else if (bmi < 24) { level = '正常'; color = C.ok; }
    else if (bmi < 28) { level = '偏胖'; color = '#f59e0b'; }
    else { level = '肥胖'; color = C.warn; }
  }
  const idealMin = height > 0 ? (18.5 * height * height).toFixed(1) : '';
  const idealMax = height > 0 ? (24 * height * height).toFixed(1) : '';

  return (
    <Page id="bmi" title="BMI 计算器" onBack={onBack}>
      <Card>
        <Field label="身高（cm）" value={h} onChange={setH} keyboardType="decimal-pad" />
        <Field label="体重（kg）" value={w} onChange={setW} keyboardType="decimal-pad" />
        {!isNaN(bmi) && (
          <View style={st.center}>
            <Text style={st.bmiLabel}>你的 BMI</Text>
            <Text style={[st.bmiValue, { color }]}>{bmi.toFixed(1)}</Text>
            <Text style={[st.level, { color }]}>{level}</Text>
          </View>
        )}
      </Card>
      {!isNaN(bmi) && (
        <Card>
          <Result label="正常 BMI 范围" value="18.5 ~ 24" />
          <Result label="你的理想体重" value={`${idealMin} ~ ${idealMax} kg`} />
        </Card>
      )}
      <Card>
        <Text style={st.tip}>
          中国成人标准：18.5 以下偏瘦，18.5~24 正常，24~28 偏胖，28 及以上为肥胖。
          BMI 仅供健康参考，不构成医疗建议。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 10 },
  bmiLabel: { fontSize: 14, color: C.sub },
  bmiValue: { fontSize: 44, fontWeight: '700', marginTop: 4 },
  level: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;
