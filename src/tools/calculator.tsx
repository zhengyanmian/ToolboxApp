import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Page, Card, C, Result } from '../ui';
import { create, all } from 'mathjs';

const math = create(all);

// 用 mathjs（开源库）求值；先做一层清洗，只放行数字和已知符号
function safeEval(src: string): number {
  const cleaned = src.replace(/[^0-9a-zA-Z+\-*/^().,%!\s]/g, '');
  const v = math.evaluate(cleaned);
  if (typeof v !== 'number' || isNaN(v)) throw new Error('结果不是有效数字');
  return v;
}

const KEYS: string[][] = [
  ['C', '(', ')', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '='],
];

export default function Calculator({ onBack }: { onBack: () => void }) {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  function press(k: string) {
    if (k === 'C') { setExpr(''); setResult(''); return; }
    if (k === '⌫') { setExpr(expr.slice(0, -1)); return; }
    if (k === '=') {
      try {
        const v = safeEval(expr.replace(/÷/g, '/').replace(/×/g, '*'));
        const line = `${expr} = ${fmt(v)}`;
        setHistory([line, ...history].slice(0, 20));
        setResult(fmt(v));
        setExpr(fmt(v));
      } catch (e: any) {
        setResult('错误：' + (e?.message ?? '表达式无效'));
      }
      return;
    }
    setExpr(expr + k);
  }

  // 实时预览
  let preview = '';
  try {
    if (expr) preview = '= ' + fmt(safeEval(expr.replace(/÷/g, '/').replace(/×/g, '*')));
  } catch { preview = ''; }

  return (
    <Page id="calculator" title="计算器" onBack={onBack}>
      <Card>
        <Text style={st.expr} numberOfLines={3}>{expr || '0'}</Text>
        <Text style={st.preview}>{preview}</Text>
      </Card>
      <View style={st.pad}>
        {KEYS.map((row, i) => (
          <View key={i} style={st.row}>
            {row.map((k) => (
              <TouchableOpacity
                key={k}
                style={[
                  st.key,
                  (k === '÷' || k === '×' || k === '-' || k === '+' || k === '=') && st.opKey,
                  k === '=' && st.eqKey,
                ]}
                onPress={() => press(k)}>
                <Text style={st.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
      {result ? <Card><Result label="结果" value={result} /></Card> : null}
      {history.length > 0 && (
        <Card>
          <Text style={st.hTitle}>历史记录</Text>
          {history.map((h, i) => (
            <Text key={i} style={st.hItem} selectable>{h}</Text>
          ))}
        </Card>
      )}
      <Card>
        <Text style={st.tip}>
          支持 + - × ÷ % ^ ( ) 和 sin cos tan sqrt ln log abs 阶乘!、常量 pi e。
          示例：sqrt(2)^2 或 5!
        </Text>
      </Card>
    </Page>
  );
}

function fmt(v: number): string {
  if (!isFinite(v)) return v > 0 ? '∞' : '-∞';
  const r = Math.round(v * 1e10) / 1e10;
  return String(r);
}

const st = StyleSheet.create({
  expr: { fontSize: 26, color: C.text, minHeight: 36, fontWeight: '500' },
  preview: { fontSize: 14, color: C.sub, marginTop: 6, minHeight: 18 },
  pad: { backgroundColor: C.card, borderRadius: 12, padding: 8, marginBottom: 12 },
  row: { flexDirection: 'row' },
  key: {
    flex: 1, margin: 4, backgroundColor: C.bg, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', height: 56,
  },
  opKey: { backgroundColor: '#e8f0fe' },
  eqKey: { backgroundColor: C.primary },
  keyText: { fontSize: 20, color: C.text },
  hTitle: { fontSize: 13, color: C.sub, marginBottom: 6 },
  hItem: { fontSize: 14, color: C.text, paddingVertical: 3 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});
