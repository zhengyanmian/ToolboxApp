import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { parseNcm } from 'ncmdump-js';
import { Page, Card, Btn, Result, Row, C } from '../ui';
import { installBrowserPolyfills } from '../lib/polyfills';
import { base64ToBytes, bytesToBase64 } from '../lib/imgio';

function fmtSize(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || 'output';
}

export default function NcmTool({ onBack }: { onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState<{ name: string; artist: string; album: string; format: string; size: number; path: string } | null>(null);

  const pick = async () => {
    if (busy) return;
    setErr('');
    setMsg('');
    try {
      const f = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.allFiles] });
      if (!f.name?.toLowerCase().endsWith('.ncm')) {
        setErr('请选择 .ncm 格式的文件');
        return;
      }
      setBusy(true);
      setInfo(null);
      installBrowserPolyfills();

      // content:// 或 file:// 都先拷到缓存再读
      const cachePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/tmp_${Date.now()}.ncm`;
      try {
        await ReactNativeBlobUtil.fs.cp(f.uri, cachePath);
      } catch {
        throw new Error('无法读取所选文件');
      }
      const b64 = await ReactNativeBlobUtil.fs.readFile(cachePath, 'base64');
      const bytes = base64ToBytes(b64);

      const r = parseNcm(bytes);
      const meta = r.metadata;
      const name = sanitize(
        meta?.musicName ? String(meta.musicName) : (f.name?.replace(/\.ncm$/i, '') || 'output'),
      );
      const artist = meta?.artistName ? String(meta.artistName) : '';
      const album = meta?.album ? String(meta.album) : '';
      const outName = artist ? `${name} - ${artist}.${r.format}` : `${name}.${r.format}`;

      const outPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${encodeURIComponent(outName)}`;
      await ReactNativeBlobUtil.fs.writeFile(outPath, bytesToBase64(r.audio), 'base64');

      let saved = '已通过系统下载服务保存';
      try {
        await ReactNativeBlobUtil.android.addCompleteDownload({
          title: outName,
          description: '工具箱 NCM 转换',
          mime: r.format === 'mp3' ? 'audio/mpeg' : 'audio/flac',
          path: outPath,
          showNotification: true,
        });
      } catch {
        saved = `已保存到应用缓存：${outPath}`;
      }
      await ReactNativeBlobUtil.fs.unlink(cachePath).catch(() => {});

      setInfo({
        name: name,
        artist: artist || '—',
        album: album || '—',
        format: r.format.toUpperCase(),
        size: r.audio.length,
        path: saved,
      });
      setMsg('转换完成，请在「下载」通知或下载目录查看');
    } catch (e: any) {
      if (e?.code === 'DOCUMENT_PICKER_CANCELED' || DocumentPicker.isCancel?.(e)) return;
      setErr('转换失败：' + (e?.message || '未知错误'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page id="ncm" title="NCM 音乐转换" onBack={onBack}>
      <Card>
        <Btn text={busy ? '转换中…' : '选择 .ncm 文件'} onPress={pick} />
        {msg ? <Text style={st.ok}>{msg}</Text> : null}
        {err ? <Text style={st.err}>{err}</Text> : null}
      </Card>

      {info && (
        <Card>
          <Result label="歌名" value={info.name} />
          <Result label="歌手" value={info.artist} />
          <Result label="专辑" value={info.album} />
          <Result label="输出格式" value={info.format} />
          <Result label="大小" value={fmtSize(info.size)} />
          <Result label="保存位置" value={info.path} />
        </Card>
      )}

      <Card>
        <Text style={st.tip}>
          原理：NCM 是网易云音乐的加密容器，内部就是加密后的 MP3/FLAC 音频流。本工具用其公开的解密算法（AES-ECB 解出 RC4 密钥 → 流解密）在本地还原音频，不联网、不上传，仅用于处理你已合法获得的音乐文件。转换后输出同名 MP3/FLAC 到下载目录，并弹系统通知。
        </Text>
        <Text style={st.tip2}>
          提示：转换后文件不内嵌封面图（NCM 容器把封面和音频分开放），播放器识别文件名即可正常显示。请尊重音乐版权，仅限个人使用。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  ok: { fontSize: 13, color: C.ok, marginTop: 10, lineHeight: 18 },
  err: { fontSize: 13, color: C.warn, marginTop: 10, lineHeight: 18 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
  tip2: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 8 },
});
