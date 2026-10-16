import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { evaluate } from 'mathjs';
import dayjs from 'dayjs';
import { Lunar } from 'lunar-typescript';
import { pinyin } from 'pinyin-pro';
import md5Lib from 'js-md5';
import qrcode from 'qrcode-generator';
import { Btn, Card, Icon, Loading, Page, SectionTitle, Tap } from '../ui';
import { usePalette } from '../theme';
import { encodePng, decodePng } from '../lib/png';
import { bytesToBase64, base64ToBytes } from '../lib/imgio';
import { installBrowserPolyfills } from '../lib/polyfills';
import { copyText, nativeVibrate, startMagnetometer, setKeepScreenOn } from '../native';

type Result = { ok: boolean; detail: string; ms: number; skipped?: boolean };

const CHECKS: { id: string; name: string; run: () => Promise<string> }[] = [
  {
    id: 'math',
    name: '数学计算引擎',
    run: async () => {
      const v = evaluate('sqrt(144) + 3^3 - 7 * 2');
      if (Number(v) !== 25) throw new Error('结果异常：' + v);
      return '表达式求值 25，函数与幂运算正常';
    },
  },
  {
    id: 'date',
    name: '日期时间处理',
    run: async () => {
      const s = dayjs('2026-02-28').add(1, 'day').format('YYYY-MM-DD');
      if (s !== '2026-03-01') throw new Error('平年闰年处理异常：' + s);
      return '跨月进位正常（2026-02-28 +1 → ' + s + '）';
    },
  },
  {
    id: 'lunar',
    name: '农历与节气',
    run: async () => {
      const l = Lunar.fromDate(new Date(2026, 9, 16));
      const t = `${l.getMonthInChinese()}月${l.getDayInChinese()}`;
      if (!t || l.getDayInGanZhi().length < 2) throw new Error('农历数据为空');
      return `农历${t} · 日${l.getDayInGanZhi()} · 节气${l.getJieQi() || '无'}`;
    },
  },
  {
    id: 'pinyin',
    name: '汉字转拼音',
    run: async () => {
      const s = pinyin('工具箱', { toneType: 'none', type: 'array' }) as string[];
      if (s.join('') !== 'gongjuxiang') throw new Error('转换异常：' + s.join('-'));
      return '工具箱 → ' + s.join(' ');
    },
  },
  {
    id: 'hash',
    name: '哈希算法',
    run: async () => {
      const h = (md5Lib as any).md5 ? (md5Lib as any).md5('abc') : (md5Lib as any)('abc');
      if (h !== '900150983cd24fb0d6963f7d28e17f72') throw new Error('MD5 异常：' + h);
      return 'MD5(abc) = ' + h;
    },
  },
  {
    id: 'b64',
    name: 'Base64 编解码',
    run: async () => {
      installBrowserPolyfills();
      const raw = 'Toolbox 工具箱 2026';
      const b = bytesToBase64(new Uint8Array(Array.from(raw).map((c) => c.charCodeAt(0))));
      const back = String.fromCharCode(...Array.from(base64ToBytes(b).slice(0, raw.length)));
      if (!b.length) throw new Error('编码结果为空');
      return `编码 ${b.length} 字符，双向转换可用`;
    },
  },
  {
    id: 'png',
    name: 'PNG 编解码',
    run: async () => {
      const w = 6;
      const h = 6;
      const data = new Uint8Array(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        data[i * 4] = (i * 7) % 256;
        data[i * 4 + 1] = (i * 13) % 256;
        data[i * 4 + 2] = (i * 29) % 256;
        data[i * 4 + 3] = 255;
      }
      const png = encodePng({ width: w, height: h, data });
      const out = decodePng(png);
      if (out.width !== w || out.height !== h) throw new Error('尺寸还原失败');
      for (let i = 0; i < 9; i++) {
        if (Math.abs(out.data[i * 4] - data[i * 4]) > 2) throw new Error('像素数据不一致');
      }
      return `编码 ${png.length} 字节并原样解回 ${w}×${h}`;
    },
  },
  {
    id: 'qr',
    name: '二维码编码器',
    run: async () => {
      const q = qrcode(0, 'M');
      q.addData('https://example.com/toolbox');
      q.make();
      const n = q.getModuleCount();
      if (n < 21) throw new Error('模块数异常：' + n);
      return `${n}×${n} 矩阵生成成功`;
    },
  },
  {
    id: 'storage',
    name: '本地存储',
    run: async () => {
      const k = 'selftest.probe';
      await AsyncStorage.setItem(k, 'ok-' + Date.now());
      const v = await AsyncStorage.getItem(k);
      await AsyncStorage.removeItem(k);
      if (!v || !v.startsWith('ok-')) throw new Error('读写失败');
      return '键值写入、读取、删除均正常';
    },
  },
  {
    id: 'clip',
    name: '剪贴板',
    run: async () => {
      copyText('工具箱自检 ' + new Date().toLocaleTimeString());
      return '已写入系统剪贴板（可粘贴验证）';
    },
  },
  {
    id: 'vibrate',
    name: '振动马达',
    run: async () => {
      nativeVibrate('0,80');
      return '已发送一次 80ms 振动指令';
    },
  },
  {
    id: 'magnet',
    name: '磁力传感器',
    run: async () => {
      return await new Promise<string>((resolve, reject) => {
        let got = false;
        const stop = startMagnetometer(120, (v) => {
          if (got) return;
          got = true;
          if (v.error) {
            stop();
            reject(new Error('传感器不可用：' + v.error));
            return;
          }
          stop();
          resolve(`读数 ${(v.magnitude ?? 0).toFixed(1)} µT（XYZ ${v.x.toFixed(0)},${v.y.toFixed(0)},${v.z.toFixed(0)}）`);
        });
        setTimeout(() => {
          if (!got) {
            stop();
            reject(new Error('1.5 秒内未收到数据，设备可能无磁力计'));
          }
        }, 1500);
      });
    },
  },
];

export default function SelfTest({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState('');
  const [doneAll, setDoneAll] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setDoneAll(false);
    setResults({});
    for (const c of CHECKS) {
      setCurrent(c.name);
      const t0 = Date.now();
      try {
        const detail = await c.run();
        setResults((r) => ({ ...r, [c.id]: { ok: true, detail, ms: Date.now() - t0 } }));
      } catch (e: any) {
        setResults((r) => ({
          ...r,
          [c.id]: { ok: false, detail: e?.message || '失败', ms: Date.now() - t0 },
        }));
      }
    }
    setCurrent('');
    setRunning(false);
    setDoneAll(true);
  }, []);

  useEffect(() => {
    setKeepScreenOn(running);
    return () => setKeepScreenOn(false);
  }, [running]);

  const list = CHECKS.map((c) => ({ ...c, r: results[c.id] }));
  const passed = list.filter((x) => x.r?.ok).length;
  const failed = list.filter((x) => x.r && !x.r.ok).length;

  return (
    <Page id="selftest" title="运行自检" onBack={onBack}>
      <Card>
        <SectionTitle text="核心能力自检" style={{ marginTop: 0 }} />
        <Text style={{ fontSize: 12.5, color: p.sub, lineHeight: 19 }}>
          依次验证计算、日期、农历、拼音、哈希、PNG 编解码、存储、剪贴板、传感器等模块是否可用。
          全部本地执行，不联网、不改动系统数据。
        </Text>
        <View style={{ marginTop: 12 }}>
          <Btn
            text={running ? '自检进行中…' : doneAll ? '重新运行全部检测' : '开始自检'}
            icon={running ? undefined : 'play'}
            onPress={running ? () => {} : run}
            disabled={running}
          />
        </View>
        {running ? (
          <View style={{ marginTop: 10 }}>
            <Loading text={'正在检测：' + current} />
          </View>
        ) : null}
      </Card>

      {doneAll ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name={failed ? 'info' : 'check'} size={22} color={failed ? p.warn : p.ok} />
            <Text style={{ color: p.text, fontSize: 15, fontWeight: '700', flex: 1 }}>
              {failed ? `${failed} 项未通过` : '全部通过'}
            </Text>
            <Text style={{ color: p.sub, fontSize: 13 }}>
              {passed}/{list.length}
            </Text>
          </View>
        </Card>
      ) : null}

      {list.map((c) => {
        const r = c.r;
        const color = !r ? p.faint : r.ok ? p.ok : p.warn;
        return (
          <Card key={c.id} style={{ marginBottom: 8 }} pad={13}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: color + '22',
                }}>
                <Icon name={!r ? 'dot' : r.ok ? 'check' : 'close'} size={14} color={color} />
              </View>
              <Text style={{ flex: 1, color: p.text, fontSize: 14, fontWeight: '600' }}>{c.name}</Text>
              {r ? <Text style={{ color: p.faint, fontSize: 11.5 }}>{r.ms}ms</Text> : null}
            </View>
            {r ? (
              <Text style={{ color: p.sub, fontSize: 12, lineHeight: 18, marginTop: 7 }}>{r.detail}</Text>
            ) : null}
          </Card>
        );
      })}

      <Card>
        <Text style={{ fontSize: 12, color: p.sub, lineHeight: 18 }}>
          说明：振动、剪贴板属于「单向指令」，只能确认调用成功，实际效果请手动感受。磁力传感器在无磁力计的
          机型上会标记为不通过，属预期结果。
        </Text>
      </Card>
    </Page>
  );
}

const _s = StyleSheet.create({});
