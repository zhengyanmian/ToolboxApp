import { NativeModules, DeviceEventEmitter, PermissionsAndroid, Platform } from 'react-native';

type ToolboxNative = {
  setKeepScreenOn(on: boolean): void;
  setOrientation(mode: 'landscape' | 'portrait' | 'auto'): void;
  setImmersive(on: boolean): void;
  startMagnetometer(intervalMs: number): void;
  startAccelerometer(intervalMs: number): void;
  startGravity(intervalMs: number): void;
  startCompass(intervalMs: number): void;
  stopSensors(): void;
  vibrate(pattern: string): void;
  cancelVibrate(): void;
  startNoise(): Promise<boolean>;
  getNoiseAmplitude(): Promise<number>;
  stopNoise(): void;
  getWallpaper(): Promise<string>;
  getDeviceInfo(): Promise<Record<string, unknown>>;
  copyText(text: string): void;
  saveToDownloads(srcPath: string, displayName: string, mime: string): Promise<string>;
  getDisplayMetrics(): Promise<ScreenMetrics>;
  openFile(path: string, mime: string): Promise<string>;
  openFolder(path: string): Promise<string>;
  listOpenWith(path: string, mime: string): Promise<string>;
};

export type ScreenMetrics = {
  widthPx: number;
  heightPx: number;
  xdpi: number;
  ydpi: number;
  densityDpi: number;
  density: number;
};

const native: ToolboxNative | undefined = NativeModules.ToolboxNative as any;

function safe<T extends any[]>(fn: (...args: T) => void): (...args: T) => void {
  return (...args: T) => {
    try {
      native ? fn(...args) : undefined;
    } catch {
      // 原生层异常静默，页面自行处理"无数据"状态
    }
  };
}

export const setKeepScreenOn = safe((on: boolean) => native!.setKeepScreenOn(on));
export const setOrientation = safe((m: 'landscape' | 'portrait' | 'auto') =>
  native!.setOrientation(m),
);
export const setImmersive = safe((on: boolean) => native!.setImmersive(on));
export const nativeVibrate = safe((pattern: string) => native!.vibrate(pattern));
export const cancelVibrate = safe(() => native!.cancelVibrate());

type Vec3 = {
  x: number;
  y: number;
  z: number;
  magnitude?: number;
  heading?: number;
  error?: string;
};

function sensorFn(
  eventName: string,
  startFn: (n: number) => void,
  stopFn: () => void,
): (intervalMs: number, cb: (v: Vec3) => void) => () => void {
  return (intervalMs: number, cb: (v: Vec3) => void) => {
    let sub: { remove: () => void } | null = null;
    try {
      sub = DeviceEventEmitter.addListener(eventName, (v: any) => {
        cb({
          x: v?.x ?? 0,
          y: v?.y ?? 0,
          z: v?.z ?? 0,
          magnitude: v?.magnitude,
          heading: v?.heading,
          error: v?.error,
        });
      });
      startFn(intervalMs);
    } catch {
      cb({ x: 0, y: 0, z: 0, error: 'unsupported' });
    }
    return () => {
      try {
        sub?.remove();
      } catch {}
      try {
        if (native) stopFn();
      } catch {}
    };
  };
}

export const startMagnetometer = sensorFn(
  'MagnetometerUpdate',
  (n) => native!.startMagnetometer(n),
  () => native!.stopSensors(),
);

export const startAccelerometer = sensorFn(
  'AccelerometerUpdate',
  (n) => native!.startAccelerometer(n),
  () => native!.stopSensors(),
);

export const startGravity = sensorFn(
  'GravityUpdate',
  (n) => native!.startGravity(n),
  () => native!.stopSensors(),
);

export const startCompass = sensorFn(
  'CompassUpdate',
  (n) => native!.startCompass(n),
  () => native!.stopSensors(),
);

/** 噪音检测：启动（自动请求麦克风权限），失败返回错误信息 */
export async function startNoise(): Promise<string | null> {
  if (!native?.startNoise) return '设备不支持';
  try {
    const perm = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    const got = await PermissionsAndroid.request(perm, {
      title: '噪音检测需要麦克风',
      message: '用于测量环境声音强度，不会录音保存',
      buttonPositive: '允许',
      buttonNegative: '拒绝',
    });
    if (got !== PermissionsAndroid.RESULTS.GRANTED) return '未授予麦克风权限';
    await native.startNoise();
    return null;
  } catch (e: any) {
    return e?.message || '启动失败';
  }
}

export async function getNoiseAmplitude(): Promise<number> {
  try {
    return (await native?.getNoiseAmplitude()) ?? -1;
  } catch {
    return -1;
  }
}

export function stopNoise(): void {
  try {
    native?.stopNoise();
  } catch {}
}

export async function getWallpaper(): Promise<string> {
  try {
    return await native!.getWallpaper();
  } catch (e: any) {
    throw new Error(e?.message || '获取壁纸失败');
  }
}

export async function getDeviceInfo(): Promise<Record<string, string> | null> {
  try {
    return ((await native?.getDeviceInfo()) as any) ?? null;
  } catch {
    return null;
  }
}

/** 复制文本到系统剪贴板 */
export const copyText = safe((t: string) => native!.copyText(t));

/** 把应用内文件写入系统「下载」目录（Android 10+ 走 MediaStore） */
export async function saveToDownloads(
  srcPath: string,
  displayName: string,
  mime: string,
): Promise<string> {
  if (!native?.saveToDownloads) throw new Error('当前设备不支持写入下载目录');
  return await native.saveToDownloads(srcPath, displayName, mime);
}

/**
 * 用系统里已安装的应用打开单个文件。
 * path 支持绝对路径 / content:// / 相对路径「Download/xxx.mp3」。
 * 原生方法缺失时返回中文提示而不抛错；原生失败则抛中文 Error，调用方需 try/catch。
 */
export async function openFile(path: string, mime: string): Promise<string> {
  if (!native?.openFile) return '当前设备不支持直接打开文件';
  try {
    return await native.openFile(path, mime);
  } catch (e: any) {
    throw new Error(e?.message || '没有可以打开该文件的应用');
  }
}

/**
 * 跳到文件所在目录（原生会逐个尝试 DocumentsUI / 下载列表 / 文件管理器首页）。
 * 原生方法缺失时返回中文提示而不抛错；全部候选失败时抛中文 Error。
 */
export async function openFolder(path: string): Promise<string> {
  if (!native?.openFolder) return '当前设备不支持打开文件夹';
  try {
    return await native.openFolder(path);
  } catch (e: any) {
    throw new Error(e?.message || '此设备没有可用的文件管理器');
  }
}

/** 弹出系统「选择应用打开」选择器 */
export async function openWith(path: string, mime: string): Promise<string> {
  if (!native?.listOpenWith) return '当前设备不支持「用其他应用打开」';
  try {
    return await native.listOpenWith(path, mime);
  } catch (e: any) {
    throw new Error(e?.message || '没有可以打开该文件的应用');
  }
}


/** 真实屏幕参数（尺子用它算 1mm 等于多少 dp） */
export async function getScreenMetrics(): Promise<ScreenMetrics | null> {
  if (!native?.getDisplayMetrics) return null;
  try {
    return (await native.getDisplayMetrics()) as ScreenMetrics;
  } catch {
    return null;
  }
}
