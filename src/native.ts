import { NativeModules } from 'react-native';

export function setKeepScreenOn(on: boolean): void {
  try {
    NativeModules.KeepScreenOn?.setOn(on);
  } catch {
    // 模块不可用时静默忽略
  }
}
