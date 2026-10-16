import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, Result, C, dynStyles} from '../ui';
import { Text, StyleSheet } from 'react-native';

const PROVINCES: Record<string, string> = {
  11: '北京', 12: '天津', 13: '河北', 14: '山西', 15: '内蒙古',
  21: '辽宁', 22: '吉林', 23: '黑龙江',
  31: '上海', 32: '江苏', 33: '浙江', 34: '安徽', 35: '福建', 36: '江西',
  37: '山东', 41: '河南', 42: '湖北', 43: '湖南', 44: '广东', 45: '广西',
  46: '海南', 50: '重庆', 51: '四川', 52: '贵州', 53: '云南', 54: '西藏',
  61: '陕西', 62: '甘肃', 63: '青海', 64: '宁夏', 65: '新疆',
  71: '中国台湾', 81: '中国香港', 82: '中国澳门',
};

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECKS = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

export default function IdCard({ onBack }: { onBack: () => void }) {
  const [id, setId] = useState('');
  const [out, setOut] = useState<{ k: string; v: string }[]>([]);
  const [valid, setValid] = useState<boolean | null>(null);

  function check() {
    const raw = id.trim().toUpperCase();
    const res: { k: string; v: string }[] = [];
    if (!/^\d{17}[\dX]$/.test(raw)) {
      setValid(false);
      setOut([]);
      return;
    }
    // 校验位
    let sum = 0;
    for (let i = 0; i < 17; i++) sum += parseInt(raw[i], 10) * WEIGHTS[i];
    const ok = CHECKS[sum % 11] === raw[17];
    setValid(ok);

    const prov = PROVINCES[raw.slice(0, 2)];
    res.push({ k: '省份', v: prov ?? '未知地区码' });
    const birth = `${raw.slice(6, 10)}-${raw.slice(10, 12)}-${raw.slice(12, 14)}`;
    const bd = new Date(birth.replace(/-/g, '/'));
    if (!isNaN(bd.getTime())) {
      const age = Math.floor((Date.now() - bd.getTime()) / (365.25 * 86400000));
      res.push({ k: '出生日期', v: `${birth}（${age} 岁）` });
      res.push({ k: '性别', v: parseInt(raw[16], 10) % 2 === 1 ? '男' : '女' });
    }
    setOut(res);
  }

  return (
    <Page id="idcard" title="身份证信息" onBack={onBack}>
      <Card>
        <Field label="身份证号码" value={id} onChange={setId} placeholder="18 位号码（仅本地解析，不上传）" />
        <Row>
          <Btn text="解析" onPress={check} />
        </Row>
      </Card>
      {valid !== null && (
        <Card>
          <Result
            label="校验位验证"
            value={valid ? '通过（号码格式合法）' : '不通过（校验位不匹配）'}
          />
          {out.map((r) => (
            <Result key={r.k} label={r.k} value={r.v} />
          ))}
        </Card>
      )}
      <Card>
        <Text style={st.tip}>
          纯本地解析：根据号码规则推算省份、生日、性别并验证校验位，不联网、不查真实姓名。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;
