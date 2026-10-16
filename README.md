# ToolboxApp 工具箱

原创安卓工具箱 App（React Native 0.88），收录日常高频小工具，全部代码原创、所有功能免费无限制。

## 功能（47 个）

| 分类 | 工具 |
|------|------|
| 计算 | 计算器(mathjs)、进制转换、单位换算、房贷计算、个税计算、利息计算、BMI、年龄计算、日期计算、纪念日倒计时(本地持久化)、电费计算、统计计算、质数与因数、罗马数字、人民币大写、秒表 |
| 文本 | 去重/替换/统计、大小写转换、正则测试、摩斯电码、汉字转拼音(pinyin-pro)、文本差异对比、密码强度检测、全角半角转换、打字测速 |
| 编码 | Base64/URL 编解码、JSON 格式化、哈希计算(MD5/SHA1/SHA256)、Unicode/HTML 实体 |
| 生成 | 随机数/密码、二维码生成、颜色转换、骰子/抽签/分组 |
| 查询 | 时间戳、汇率、农历/黄历(lunar-typescript)、世界时钟、身份证本地解析、常用电话、IP 子网计算、HTTP 状态码速查 |
| 图片 | 图片压缩/格式转换(JPEG/PNG/WEBP)、图片混淆/反混淆(密钥可逆乱序) |
| 设备 | 屏幕信息、金属探测仪(磁力计) |
| 生活 | 番茄钟(专注/休息循环)、屏幕时钟(常亮/农历) |

## 特性

- 挖孔屏/状态栏安全区适配（react-native-safe-area-context），首页返回后保持滚动位置
- 安卓返回键正确导航（工具页返回回首页）
- 每个工具页内置使用说明
- 纪念日倒计时数据本地持久化（AsyncStorage）
- 添加新工具：在 `src/tools/` 写组件 → `src/registry.tsx` 注册 → `src/details.ts` 加说明，三步完成

## 构建

```bash
cd android
JAVA_HOME=C:/Users/24508/android-build/jdk/jdk-17.0.20.1+1 ANDROID_HOME=C:/Users/24508/android-build/sdk ./gradlew assembleRelease
```

产物：`android/app/build/outputs/apk/release/app-release.apk`

## 开源依赖

react-native / react / mathjs / dayjs / lunar-typescript / qrcode-generator / react-native-safe-area-context（均 MIT 或同等许可）

## 补丁说明

`react-native-sensors@7.3.6` 的安卓构建脚本过旧（jcenter/AGP 3.5.1，与 Gradle 9 / AGP 8 不兼容）。已修补后的完整 `build.gradle` 存于 `patches/react-native-sensors.android.build.gradle`；若重新 `npm install`，把它复制回 `node_modules/react-native-sensors/android/build.gradle` 即可。
