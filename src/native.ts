import { NativeModules, DeviceEventEmitter, PermissionsAndroid, Platform } from 'react-native';

type ToolboxNative = {
  setKeepScreenOn(on: boolean): void;
  setOrientation(mode: 'landscape' | 'portrait' | 'auto'): void;
  setImmersive(on: boolean): void;
  startMagnetometer(intervalMs: number): void;
  startAccelerometer(intervalMs: number): void;
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
