# ToolboxApp 工具箱

原创安卓工具箱 App（React Native 0.88 + TypeScript，Hermes），收录日常高频小工具。全部代码原创、所有功能免费无限制、无需登录、数据不出本机。

## 功能（74 个）

| 分类 | 工具 |
|------|------|
| 计算 | 计算器(mathjs)、进制转换、单位换算、房贷计算、个税计算、利息计算、BMI、年龄计算、日期计算、纪念日倒计时(本地持久化)、电费计算、统计计算、质数与因数、罗马数字、人民币大写、秒表、数字转中文、时间计算器、工作性价比 |
| 决定 | 决定转盘(SVG 转盘)、指尖转(多点触控抽选)、计分板(本地保存)、反应力测试(按住-抬手计时)、手持弹幕(全屏滚动大字) |
| 文本 | 去重/替换/统计、大小写转换、正则测试、摩斯电码、汉字转拼音(pinyin-pro)、文本差异对比、密码强度检测、全角半角转换、打字测速 |
| 编码 | Base64/URL 编解码、JSON 格式化、哈希计算(MD5/SHA1/SHA256)、Unicode/HTML 实体、RC4 加密、图片转 Base64 |
| 生成 | 随机数/密码、二维码生成、颜色转换、骰子/抽签/分组、配色方案(单色/邻近/互补/三角/四角) |
| 查询 | 时间戳、汇率、农历/黄历(lunar-typescript)、世界时钟、身份证本地解析、常用电话、IP 子网计算、HTTP 状态码速查、网页源码获取、IP 查询、历史上的今天(多源自动回退 + 离线缓存) |
| 图片 | 图片压缩/格式转换(实时预估输出大小)、图片混淆/还原、光棱坦克图片(双图合成 √(D×H) + 明暗预览显影) |
| 音频 | NCM 音乐转换(本地解密，输出到系统「下载」目录) |
| 设备 | 屏幕信息、屏幕测试(纯色坏点)、金属探测仪(自研磁力计模块)、尺子(贴边刻度 + 可校准)、水平仪、指南针、噪音检测、振动器(自定义节奏/时长/间隔/无限循环)、设备详情、当前壁纸导出、运行自检(核心模块自测) |
| 生活 | 番茄钟(沉浸圆环 + 无级时长设置)、屏幕时钟(默认横屏/无级字号/秒数独立字号/竖排) |

## 界面与视觉（v1.8 重构）

- **深色 / 亮色双主题**：`src/theme.tsx` 提供两套调色板，可跟随系统或手动切换（首页「外观模式」），选择持久化到本机。
- **统一设计系统**：`src/ui.tsx` 提供 `Page / Card / Btn / Chip / Segmented / Field / Slider / Toggle / Result / KV / IconTile / RoundButton / Glow / Tap` 等组件，所有工具页面共用同一套圆角、间距、描边与阴影。
- **质感视觉**：背景为柔和渐变 + 双色光晕；卡片为半透明玻璃质感 + 细描边 + 柔和投影；主色系按钮与关键区块使用渐变描边 + 循环扫光的「流光轮廓」（`Glow`）。
- **动效**：页面进场位移淡入、按钮弹性缩放、列表项分批淡入、滑杆/开关弹簧过渡、状态色柔和渐变。
- **手势返回**：任意工具页从屏幕左边缘向右滑动即可返回（带「返回」提示浮层与位移动画），同时保留左上角返回键与系统返回键。
- **零 emoji**：界面图标全部为内置矢量线性图标（`src/icons.tsx`，24×24 网格、圆头描边），首页磁贴按分类配色渐变。
- **主题切换实时生效**：工具页样式通过 `dynStyles((C) => StyleSheet.create({...}))` 延迟求值，模块级样式也会跟随主题。

## 自研原生模块（android/app/src/main/java/com/toolboxapp/）

`ToolboxNative` 一个模块覆盖全部原生能力，全部 try/catch 防御：屏幕常亮、横竖屏切换、沉浸式全屏、磁力计、加速度计、指南针（融合解算航向）、振动（波形节奏）、噪音检测（MediaRecorder 振幅）、当前壁纸导出、设备 Build 信息、复制到剪贴板、把文件写入系统「下载」目录（Android 10+ 走 MediaStore，无需存储权限）。

## 特性

- 挖孔屏/状态栏安全区适配（react-native-safe-area-context），首页返回后保持滚动位置
- 安卓返回键正确导航（工具页返回回首页）
- 每个工具页顶部内置用途与操作说明
- 关键数据本地持久化（AsyncStorage）：主题模式、纪念日、计分板、番茄钟计数、尺子校准系数、历史今天缓存
- 全局错误边界：单页异常时显示可读错误信息与「返回首页」，不会闪退
- 添加新工具：在 `src/tools/` 写组件 → `src/registry.tsx` 注册（含图标名与分类）→ `src/details.ts` 加说明，三步完成

## 构建

```bash
cd android
JAVA_HOME=C:/Users/24508/android-build/jdk/jdk-17.0.20.1+1 ANDROID_HOME=C:/Users/24508/android-build/sdk ./gradlew assembleRelease
```

产物：`android/app/build/outputs/apk/release/app-release.apk`

## 开源依赖

react-native / react / mathjs / dayjs / lunar-typescript / pinyin-pro / qrcode-generator / pako / jpeg-js / js-md5 / js-sha1 / js-sha256 / ncmdump-js / react-native-svg / react-native-safe-area-context / @react-native-async-storage/async-storage / react-native-blob-util / react-native-image-picker / react-native-document-picker / @bam.tech/react-native-image-resizer / @react-native-camera-roll/camera-roll（均 MIT 或同等许可）

## 补丁说明

`react-native-sensors@7.3.6` 的安卓构建脚本过旧（jcenter/AGP 3.5.1，与 Gradle 9 / AGP 8 不兼容）。已修补后的完整 `build.gradle` 存于 `patches/react-native-sensors.android.build.gradle`；若重新 `npm install`，把它复制回 `node_modules/react-native-sensors/android/build.gradle` 即可。

`react-native-document-picker@9.3.1` 依赖 RN 0.88 已移除的 `GuardedResultAsyncTask`。修补后的 `RNDocumentPickerModule.java` 存于 `patches/react-native-document-picker.RNDocumentPickerModule.java`，重装依赖后复制回 `node_modules/react-native-document-picker/android/src/main/java/com/reactnativedocumentpicker/`。
