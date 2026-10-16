# ToolboxApp 工具箱

原创安卓工具箱 App（React Native 0.88），对标「一个木函」的功能形态，全部代码原创、所有功能免费无限制。

## 功能（24 个）

| 分类 | 工具 |
|------|------|
| 计算 | 计算器(mathjs)、进制转换、单位换算、房贷计算、个税计算、利息计算、BMI、年龄计算、日期计算、纪念日倒计时 |
| 文本 | 去重/替换/统计、大小写转换 |
| 编码 | Base64/URL 编解码、JSON 格式化 |
| 生成 | 随机数/密码、二维码生成、颜色转换 |
| 查询 | 时间戳、汇率、农历/黄历(lunar-typescript)、世界时钟、身份证本地解析、常用电话 |
| 设备 | 屏幕信息 |

## 特性

- 挖孔屏/状态栏安全区适配（react-native-safe-area-context）
- 安卓返回键正确导航（工具页返回回首页）
- 每个工具页内置使用说明
- 添加新工具：在 `src/tools/` 写组件 → `src/registry.tsx` 注册 → `src/details.ts` 加说明，三步完成

## 构建

```bash
cd android
JAVA_HOME=C:/Users/24508/android-build/jdk/jdk-17.0.20.1+1 ANDROID_HOME=C:/Users/24508/android-build/sdk ./gradlew assembleRelease
```

产物：`android/app/build/outputs/apk/release/app-release.apk`

## 开源依赖

react-native / react / mathjs / dayjs / lunar-typescript / qrcode-generator / react-native-safe-area-context（均 MIT 或同等许可）
