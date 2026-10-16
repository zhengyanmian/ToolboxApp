import React from 'react';
import { Page, Card, Result, C, dynStyles} from '../ui';
import { Dimensions, PixelRatio, Platform, StyleSheet, Text } from 'react-native';

// Android API 级别 → 版本名
const API_MAP: Record<string, string> = {
  '24': '7.0', '25': '7.1', '26': '8.0', '27': '8.1', '28': '9',
  '29': '10', '30': '11', '31': '12', '32': '12L', '33': '13',
  '34': '14', '35': '15', '36': '16', '37': '17', '38': '18',
};

function androidVersion(): string {
  const api = String(Platform.Version);
  const name = API_MAP[api];
  return name ? `Android ${name}（API ${api}）` : `API ${api}`;
}

export default function ScreenInfo({ onBack }: { onBack: () => void }) {
  const win = Dimensions.get('window');
  const screen = Dimensions.get('screen');
  const pxW = PixelRatio.getPixelSizeForLayoutSize(win.width);
  const pxH = PixelRatio.getPixelSizeForLayoutSize(win.height);
  const inchDiag = Math.sqrt((pxW / 160) ** 2 + (pxH / 160) ** 2);

  return (
    <Page id="screen" title="屏幕信息" onBack={onBack}>
      <Card>
        <Result label="窗口尺寸(dp)" value={`${Math.round(win.width)} × ${Math.round(win.height)}`} />
        <Result label="屏幕尺寸(dp)" value={`${Math.round(screen.width)} × ${Math.round(screen.height)}`} />
        <Result label="分辨率(px)" value={`${pxW} × ${pxH}`} />
        <Result label="像素密度" value={`${PixelRatio.get().toFixed(2)}x`} />
        <Result label="估算对角线" value={`${inchDiag.toFixed(1)} 英寸`} />
        <Result label="系统" value={Platform.OS === 'android' ? androidVersion() : Platform.OS} />
      </Card>
      <Card>
        <Text style={st.tip}>
          分辨率为物理像素，dp 为与密度无关的逻辑像素；对角线按 160dpi 基准估算，和官方标称值可能略有出入。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;
