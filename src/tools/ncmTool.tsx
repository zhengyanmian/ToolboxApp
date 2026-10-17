import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { parseNcm } from 'ncmdump-js';
import { Btn, Card, Icon, Loading, Page, Result, Row, SectionTitle, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { installBrowserPolyfills } from '../lib/polyfills';
import { base64ToBytes, bytesToBase64 } from '../lib/imgio';
import { copyText, openFolder, openWith, saveToDownloads } from '../native';

type Info = {
  file: string;
  artist: string;
  album: string;
  format: string;
  size: number;
  /** 展示 + 复制用的路径 */
  path: string;
  /** 真正交给原生打开用的绝对路径（content:// 也可） */
  absPath: string;
  mime: string;
  /** downloads = 系统下载目录；cache = 回退到应用缓存 */
  where: 'downloads' | 'cache';
};

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** 去掉文件名中的非法字符，保证能写入系统目录 */
function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|\r\n\t]/g, '_').slice(0, 80) || 'output';
}

export default function NcmTool({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState<Info | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  /** 2 秒后自动消失的页面内提示 */
  const showToast = (text: string, ok = true) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, ok });
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const doOpenWith = async () => {
    if (!info) return;
    try {
      const r = await openWith(info.absPath, info.mime);
      showToast(r || '已打开');
    } catch (e: any) {
      showToast(e?.message ? String(e.message) : '没有可以打开该文件的应用', false);
    }
  };

  const doOpenFolder = async () => {
    if (!info) return;
    try {
      const r = await openFolder(info.absPath);
      showToast(r || '已打开文件管理器');
    } catch (e: any) {
      showToast(e?.message ? String(e.message) : '此设备没有可用的文件管理器', false);
    }
  };

  const pick = async () => {
    if (busy) return;
    setErr('');
    setMsg('');
    setInfo(null);
    // 1) 选择文件
    let f: any;
    try {
      f = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.allFiles] });
    } catch (e: any) {
      if (e?.code === 'DOCUMENT_PICKER_CANCELED' || DocumentPicker.isCancel?.(e)) return;
      setErr('选择文件失败：' + (e?.message || '未知错误'));
      return;
    }
    if (!f?.name?.toLowerCase().endsWith('.ncm')) {
      setErr('只支持 .ncm 格式的文件，请重新选择');
      return;
    }

    const cachedDir = ReactNativeBlobUtil.fs.dirs.CacheDir;
    const stamp = Date.now();
    const tmpNcm = `${cachedDir}/ncm_in_${stamp}.ncm`;
    let tmpAudio = '';

    try {
      setBusy(true);
      setStep('正在读取文件…');
      installBrowserPolyfills();

      // 2) content:// 或 file:// 先拷到缓存再读
      try {
        await ReactNativeBlobUtil.fs.cp(f.uri, tmpNcm);
      } catch {
        throw new Error('无法读取所选文件，请换一个文件或重新选择');
      }
      const b64 = await ReactNativeBlobUtil.fs.readFile(tmpNcm, 'base64');
      const bytes = base64ToBytes(b64);

      // 3) 解密
      setStep('正在解密并还原音频…');
      const r = parseNcm(bytes);
      if (!r?.audio?.length) throw new Error('解密后音频为空，文件可能已损坏');
      const meta: any = r.metadata ?? {};
      const name = sanitize(
        meta?.musicName ? String(meta.musicName) : f.name.replace(/\.ncm$/i, '') || 'output',
      );
      const artist = meta?.artistName ? String(meta.artistName) : '';
      const album = meta?.album ? String(meta.album) : '';
      const ext = String(r.format || 'mp3').toLowerCase();
      const outName = artist ? `${name} - ${artist}.${ext}` : `${name}.${ext}`;
      const mime = ext === 'flac' ? 'audio/flac' : 'audio/mpeg';

      // 4) 先写临时文件，再搬进系统「下载」目录
      tmpAudio = `${cachedDir}/ncm_out_${stamp}.${ext}`;
      setStep('正在写入临时文件…');
      await ReactNativeBlobUtil.fs.writeFile(tmpAudio, bytesToBase64(r.audio), 'base64');

      // saveToDownloads 只回相对的「Download/文件名」，这里补成可复制的绝对路径
      const dlDir = String(ReactNativeBlobUtil.fs.dirs.DownloadDir || '').replace(/\/+$/, '');

      setStep('正在保存到系统下载目录…');
      let saved = '';
      let absPath = '';
      let where: Info['where'] = 'downloads';
      try {
        const rel = await saveToDownloads(tmpAudio, outName, mime);
        absPath = dlDir ? `${dlDir}/${outName}` : rel && rel.trim() ? rel : `Download/${outName}`;
        saved = absPath;
        // 搬移成功，删除临时文件
        await ReactNativeBlobUtil.fs.unlink(tmpAudio).catch(() => {});
        tmpAudio = '';
      } catch {
        // 回退：交给系统下载服务（部分 ROM 不开放 MediaStore 时会失败）
        where = 'cache';
        try {
          await ReactNativeBlobUtil.android.addCompleteDownload({
            title: outName,
            description: '工具箱 NCM 转换',
            mime,
            path: tmpAudio,
            showNotification: true,
          });
        } catch {}
        saved = tmpAudio;
        absPath = tmpAudio;
      }

      setInfo({
        file: outName,
        artist: artist || '—',
        album: album || '—',
        format: ext.toUpperCase(),
        size: r.audio.length,
        path: saved,
        absPath,
        mime,
        where,
      });
      setMsg(
        where === 'downloads'
          ? '转换完成，文件已保存到系统「下载」目录'
          : '转换完成，但系统「下载」目录不可用，已回退保存到应用缓存',
      );
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : '转换失败，请重试');
    } finally {
      // 清掉输入的 .ncm 临时文件
      await ReactNativeBlobUtil.fs.unlink(tmpNcm).catch(() => {});
      setBusy(false);
      setStep('');
    }
  };

  return (
    <Page id="ncm" title="NCM 音乐转换" onBack={onBack}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Icon name="music" size={18} color={p.primary} />
          <Text style={{ fontSize: 13, color: p.sub, flex: 1 }}>
            选择 .ncm 文件，本地解密后直接写入系统「下载」目录，不联网、不上传。
          </Text>
        </View>
        <Btn
          text={busy ? '处理中…' : '选择 .ncm 文件'}
          icon="music"
          onPress={pick}
          disabled={busy}
        />
        {busy ? <Loading text={step || '处理中…'} /> : null}
        {msg ? (
          <View style={st.line}>
            <Icon name="check" size={16} color={p.ok} />
            <Text style={[st.msg, { color: p.ok }]}>{msg}</Text>
          </View>
        ) : null}
        {err ? (
          <View style={st.line}>
            <Icon name="info" size={16} color={p.warn} />
            <Text style={[st.msg, { color: p.warn }]}>{err}</Text>
          </View>
        ) : null}
      </Card>

      {info ? (
        <Card>
          <SectionTitle text="转换结果" style={{ marginTop: 0 }} />
          <Result label="文件名" value={info.file} />
          <Result label="歌手" value={info.artist} copyable={false} />
          <Result label="专辑" value={info.album} copyable={false} />
          <Result label="输出格式" value={info.format} copyable={false} />
          <Result label="文件大小" value={fmtSize(info.size)} copyable={false} />
          <Result label="保存路径" value={info.path} />
          <Row style={st.actions}>
            <Btn
              size="sm"
              fit
              text="用其他应用打开"
              icon="file"
              onPress={doOpenWith}
            />
            <Btn
              size="sm"
              fit
              kind="soft"
              text="打开所在文件夹"
              icon="folder"
              onPress={doOpenFolder}
            />
            <Btn
              size="sm"
              fit
              kind="ghost"
              text={copied ? '已复制路径' : '复制路径'}
              icon={copied ? 'check' : 'copy'}
              onPress={() => {
                copyText(info.path);
                setCopied(true);
                showToast('路径已复制到剪贴板');
                setTimeout(() => setCopied(false), 1200);
              }}
            />
          </Row>
          {toast ? (
            <View style={st.line}>
              <Icon name={toast.ok ? 'check' : 'info'} size={16} color={toast.ok ? p.ok : p.warn} />
              <Text style={[st.msg, { color: toast.ok ? p.ok : p.warn }]}>{toast.text}</Text>
            </View>
          ) : null}
          <Text style={st.note}>
            {info.where === 'downloads'
              ? '可在「文件管理 → 下载」或系统「下载」通知中找到该文件；也可以直接用上面的按钮跳转。'
              : '当前设备未开放系统下载目录，文件暂存在应用缓存中（其他应用读不到），可用「复制路径」定位。'}
          </Text>
        </Card>
      ) : null}

      <Card>
        <SectionTitle text="原理说明" style={{ marginTop: 0 }} />
        <Text style={st.tip}>
          原理：NCM 是网易云音乐的加密容器，内部就是加密后的 MP3/FLAC 音频流。本工具用其公开的解密算法（AES-ECB 解出 RC4 密钥 → 流解密）在本地还原音频，不联网、不上传，仅用于处理你已合法获得的音乐文件。转换后输出同名 MP3/FLAC 到系统下载目录。
        </Text>
        <Text style={st.tip2}>
          提示：转换后文件不内嵌封面图（NCM 容器把封面和音频分开放），播放器识别文件名即可正常显示。请尊重音乐版权，仅限个人使用。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    line: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 },
    msg: { fontSize: 13, lineHeight: 18, flex: 1 },
    actions: { marginTop: 12, flexWrap: 'wrap' },
    note: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 10 },
    tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
    tip2: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 8 },
  }),
);
