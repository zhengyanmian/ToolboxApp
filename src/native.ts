import { NativeModules, DeviceEventEmitter } from 'react-native';

type ToolboxNative = {
  setKeepScreenOn(on: boolean): void;
  setOrientation(mode: 'landscape' | 'portrait' | 'auto'): void;
  startMagnetometer(intervalMs: number): void;
  stopMagnetometer(): void;
};

const native: ToolboxNative | undefined = NativeModules.ToolboxNative as any;

export function setKeepScreenOn(on: boolean): void {
  try {
    native?.setKeepScreenOn(on);
  } catch {
    // 模块不可用时静默忽略
  }
}

export function setOrientation(mode: 'landscape' | 'portrait' | 'auto'): void {
  try {
    native?.setOrientation(mode);
  } catch {
    // 忽略
  }
}

/** 启动磁力计监听，返回停止函数 */
export function startMagnetometer(
  intervalMs: number,
  cb: (v: { x: number; y: number; z: number; error?: string }) => void,
): () => void {
  const sub = DeviceEventEmitter.addListener('MagnetometerUpdate', (v: any) => {
    cb({ x: v.x ?? 0, y: v.y ?? 0, z: v.z ?? 0, error: v.error });
  });
  try {
    native?.startMagnetometer(intervalMs);
  } catch {
    // 忽略
  }
  return () => {
    sub.remove();
    try {
      native?.stopMagnetometer();
    } catch {
      // 忽略
    }
  };
}
