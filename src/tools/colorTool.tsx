import React, { useState } from 'react';
import { Page, Card, Field, Result, C } from '../ui';
import { View, Text, StyleSheet } from 'react-native';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(m)) {
    return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
  }
  if (/^[0-9a-fA-F]{3}$/.test(m)) {
    return [parseInt(m[0] + m[0], 16), parseInt(m[1] + m[1], 16), parseInt(m[2] + m[2], 16)];
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h, Math.round(s * 100), Math.round(l * 100)];
}

export default function ColorTool({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('#3B82F6');
  const rgb = hexToRgb(input);

  return (
    <Page id="color" title="颜色转换" onBack={onBack}>
      <Card>
        <Field label="HEX 颜色值" value={input} onChange={setInput} placeholder="#3B82F6 或 3B82F6" />
        {rgb ? (
          <View style={[st.swatch, { backgroundColor: rgbToHex(...rgb) }]}>
            <Text style={st.swatchText}>{rgbToHex(...rgb)}</Text>
          </View>
        ) : (
          <Text style={st.err}>无法识别的颜色值</Text>
        )}
      </Card>
      {rgb && (
        <Card>
          <Result label="HEX" value={rgbToHex(...rgb)} />
          <Result label="RGB" value={`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`} />
          <Result label="HSL" value={`hsl(${rgbToHsl(...rgb)[0]}, ${rgbToHsl(...rgb)[1]}%, ${rgbToHsl(...rgb)[2]}%)`} />
        </Card>
      )}
      <Card>
        <Text style={st.tip}>
          支持 6 位或 3 位 HEX 格式。输入后自动换算 RGB 与 HSL，色块即为实际显示效果。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  swatch: {
    height: 80, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.line,
  },
  swatchText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  err: { color: C.warn, fontSize: 13 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});
