import React, { useEffect, useState } from 'react';
import { Page, Card, KV, Btn, Row, C } from '../ui';
import { Text, PixelRatio, Dimensions, Platform } from 'react-native';
import { getDeviceInfo } from '../native';

export default function DeviceInfo({ onBack }: { onBack: () => void }) {
  const [n, setN] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    getDeviceInfo().then(setN);
  }, []);

  const win = Dimensions.get('window');
  const density = PixelRatio.get();
  const physicalW = Math.round(win.width * density);

  return (
    <Page id="devinfo" title="设备详情" onBack={onBack}>
      <Card>
        <KV k="品牌" v={n?.brand ?? '…'} />
        <KV k="型号" v={n?.model ?? '…'} />
        <KV k="制造商" v={n?.manufacturer ?? '…'} />
        <KV k="产品代号" v={n?.product ?? '…'} />
        <KV k="主板" v={n?.board ?? '…'} />
        <KV k="硬件" v={n?.hardware ?? '…'} />
        <KV k="CPU 架构" v={n?.abi ?? '…'} />
      </Card>
      <Card>
        <KV k="系统版本" v={`Android ${n?.release ?? Platform.Version}（API ${n?.sdk ?? '?'}）`} />
        <KV k="版本代号" v={n?.codename || '—'} />
        <KV k="安全补丁" v={n?.securityPatch || '—'} />
        <KV k="屏幕逻辑分辨率" v={`${Math.round(win.width)} × ${Math.round(win.height)} dp`} />
        <KV k="屏幕物理分辨率" v={`${physicalW} × ${Math.round(win.height * density)} px`} />
        <KV k="像素密度" v={`${density}x（约 ${Math.round(160 * density)} ppi）`} />
      </Card>
      <Card>
        <KV k="指纹" v={n?.fingerprint ?? '…'} />
        <Row style={{ marginTop: 10 }}>
          <Btn text="刷新" onPress={() => getDeviceInfo().then(setN)} />
        </Row>
      </Card>
      <Card>
        <Text style={{ fontSize: 12, color: C.sub, lineHeight: 18 }}>
          数据来自系统 Build 常量与屏幕参数，仅展示、不上传。
        </Text>
      </Card>
    </Page>
  );
}
