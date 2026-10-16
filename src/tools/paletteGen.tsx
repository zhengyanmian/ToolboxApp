import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Btn, Card, Field, Icon, Page, SectionTitle, Segmented, Tap } from '../ui';
import { usePalette } from '../theme';
import { copyText } from '../native';

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
const rgbToHex = ({ r, g, b }: RGB) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

function rgbToHsl({ r, g, b }: RGB) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360 / 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 };
}

const SCHEMES = [
  { label: '单色', value: 'mono' },
  { label: '邻近', value: 'analog' },
  { label: '互补', value: 'comp' },
  { label: '三角', value: 'triad' },
  { label: '四角', value: 'tetra' },
] as const;

type Scheme = (typeof SCHEMES)[number]['value'];

export default function PaletteGen({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const [hex, setHex] = useState('#2F6BFF');
  const [scheme, setScheme] = useState<Scheme>('analog');
  const [copied, setCopied] = useState('');

  const rgb = useMemo(() => hexToRgb(hex), [hex]);

  const colors = useMemo(() => {
    if (!rgb) return [];
    const { h, s, l } = rgbToHsl(rgb);
    const out: RGB[] = [];
    switch (scheme) {
      case 'mono':
        for (let i = 0; i < 6; i++) out.push(hslToRgb(h, s, 0.16 + i * 0.135));
        break;
      case 'analog':
        [-40, -20, 0, 20, 40].forEach((d) => out.push(hslToRgb(h + d, s, Math.min(0.86, Math.max(0.2, l)))));
        break;
      case 'comp':
        [0, 0, 180, 180].forEach((d, i) => out.push(hslToRgb(h + d, s, i % 2 ? 0.28 : 0.62)));
        out.push(hslToRgb(h + 180, s, 0.82));
        break;
      case 'triad':
        [0, 120, 240].forEach((d) => {
          out.push(hslToRgb(h + d, s, 0.62));
          out.push(hslToRgb(h + d, s, 0.36));
        });
        break;
      default:
        [0, 90, 180, 270].forEach((d) => out.push(hslToRgb(h + d, s, 0.6)));
        out.push(hslToRgb(h, s, 0.34));
        out.push(hslToRgb(h + 180, s, 0.84));
    }
    return out.map(rgbToHex);
  }, [rgb, scheme]);

  const random = () => {
    const h = Math.floor(Math.random() * 360);
    const s = 0.55 + Math.random() * 0.35;
    setHex(rgbToHex(hslToRgb(h, s, 0.54)));
  };

  return (
    <Page id="palette" title="配色方案" onBack={onBack}>
      <Card>
        <Field label="基色（HEX）" value={hex} onChange={setHex} placeholder="#2F6BFF" />
        <Segmented options={SCHEMES as any} value={scheme} onChange={setScheme} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Btn text="随机基色" icon="refresh" kind="soft" onPress={random} />
          <Btn
            text="复制全部"
            icon="copy"
            kind="plain"
            onPress={() => {
              copyText(colors.join('\n'));
              setCopied('all');
              setTimeout(() => setCopied(''), 1200);
            }}
          />
        </View>
        {!rgb ? (
          <Text style={{ color: p.warn, fontSize: 12.5, marginTop: 10 }}>
            请输入 6 位十六进制颜色，例如 #2F6BFF
          </Text>
        ) : null}
      </Card>

      {colors.length ? (
        <>
          <SectionTitle text="配色色卡（点击复制单个色值）" />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {colors.slice(0, 3).map((c) => (
              <Swatch key={c + 'a'} hex={c} height={92} onCopy={setCopied} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {colors.slice(3).map((c) => (
              <Swatch key={c + 'b'} hex={c} height={64} onCopy={setCopied} />
            ))}
          </View>

          <Card style={{ marginTop: 14 }}>
            <SectionTitle text="界面示例" style={{ marginTop: 0 }} />
            <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors[2] }}>
              <View style={{ padding: 14 }}>
                <Text style={{ color: textOn(colors[2]), fontSize: 16, fontWeight: '700' }}>
                  标题文字
                </Text>
                <Text style={{ color: textOn(colors[2]), fontSize: 12.5, marginTop: 4, opacity: 0.85 }}>
                  正文用色对比度参考，可据此挑选主色与文字色。
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                {colors.slice(0, 5).map((c) => (
                  <View key={c + 'c'} style={{ flex: 1, height: 34, backgroundColor: c }} />
                ))}
              </View>
            </View>
          </Card>
        </>
      ) : null}

      {copied ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Icon name="check" size={15} color={p.ok} />
          <Text style={{ color: p.ok, fontSize: 12.5 }}>已复制到剪贴板</Text>
        </View>
      ) : null}
    </Page>
  );
}

function Swatch(props: { hex: string; height: number; onCopy: (v: string) => void }) {
  const p = usePalette();
  const [done, setDone] = useState(false);
  return (
    <Tap
      onPress={() => {
        copyText(props.hex);
        props.onCopy(props.hex);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      style={{ flex: 1 }}>
      <View
        style={{
          height: props.height,
          borderRadius: 16,
          backgroundColor: props.hex,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(0,0,0,0.08)',
        }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: textOn(props.hex) }}>
          {done ? '已复制' : props.hex.toUpperCase()}
        </Text>
      </View>
    </Tap>
  );
}

/** 依据背景亮度选黑/白文字 */
function textOn(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#111';
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.62 ? 'rgba(0,0,0,0.82)' : 'rgba(255,255,255,0.94)';
}
