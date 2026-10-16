import React from 'react';
import { IconName } from './icons';
import Calculator from './tools/calculator';
import BaseConverter from './tools/baseConverter';
import UnitConverter from './tools/unitConverter';
import DateCalc from './tools/dateCalc';
import BMI from './tools/bmi';
import Mortgage from './tools/mortgage';
import IncomeTax from './tools/incomeTax';
import InterestCalc from './tools/interestCalc';
import AgeCalc from './tools/ageCalc';
import Countdown from './tools/countdown';
import TextTools from './tools/textTools';
import CaseConvert from './tools/caseConvert';
import RandomTools from './tools/randomTools';
import QrGen from './tools/qrGen';
import ColorTool from './tools/colorTool';
import Codec from './tools/codec';
import JsonFmt from './tools/jsonFmt';
import Timestamp from './tools/timestamp';
import ExchangeRate from './tools/exchangeRate';
import IdCard from './tools/idcard';
import LunarTool from './tools/lunar';
import WorldClock from './tools/worldClock';
import Hotlines from './tools/hotlines';
import ScreenInfo from './tools/screenInfo';
import ElectricBill from './tools/electricBill';
import RegexTester from './tools/regexTester';
import Morse from './tools/morse';
import Stats from './tools/stats';
import Prime from './tools/prime';
import Roman from './tools/roman';
import RmbUpper from './tools/rmbUpper';
import Stopwatch from './tools/stopwatch';
import Pinyin from './tools/pinyin';
import Diff from './tools/diff';
import PwStrength from './tools/pwStrength';
import Hash from './tools/hash';
import Unicode from './tools/unicode';
import WidthConvert from './tools/widthConvert';
import Lottery from './tools/lottery';
import Subnet from './tools/subnet';
import HttpStatus from './tools/httpStatus';
import Typing from './tools/typing';
import Pomodoro from './tools/pomodoro';
import ScreenClock from './tools/screenClock';
import ImageCompress from './tools/imageCompress';
import ImageScramble from './tools/imageScramble';
import MetalDetector from './tools/metalDetector';
import PrismTank from './tools/prismTank';
import NcmTool from './tools/ncmTool';
import DecisionWheel from './tools/decisionWheel';
import FingerRoulette from './tools/fingerRoulette';
import Scoreboard from './tools/scoreboard';
import ReactionTest from './tools/reactionTest';
import Danmaku from './tools/danmaku';
import NumberToChinese from './tools/numberToChinese';
import Rc4Tool from './tools/rc4';
import WorkValue from './tools/workValue';
import TimeCalc from './tools/timeCalc';
import ImgToBase64 from './tools/imgToBase64';
import ColorPicker from './tools/colorPicker';
import Ruler from './tools/ruler';
import Level from './tools/level';
import Compass from './tools/compass';
import NoiseMeter from './tools/noiseMeter';
import VibratorTool from './tools/vibratorTool';
import DeviceInfo from './tools/deviceInfo';
import WallpaperTool from './tools/wallpaperTool';
import WebSource from './tools/webSource';
import IpQuery from './tools/ipQuery';
import HistoryToday from './tools/historyToday';
import SelfTest from './tools/selfTest';
import ScreenTest from './tools/screenTest';
import PaletteGen from './tools/paletteGen';

export type ToolDef = {
  id: string;
  name: string;
  icon: IconName;
  category: string;
  desc: string;
  component: React.ComponentType<{ onBack: () => void }>;
};

export const CATEGORIES = [
  '计算',
  '决定',
  '文本',
  '编码',
  '生成',
  '查询',
  '图片',
  '音频',
  '设备',
  '生活',
];

/** 分类配色（渐变磁贴） */
export const CATEGORY_COLORS: Record<string, [string, string]> = {
  计算: ['#4c7dff', '#7aa8ff'],
  决定: ['#ff7a59', '#ffab85'],
  文本: ['#12b981', '#4bd6a5'],
  编码: ['#7c5cff', '#a98bff'],
  生成: ['#f2a33c', '#ffc46b'],
  查询: ['#0ea5e9', '#67d0f5'],
  图片: ['#ec4899', '#f78fc0'],
  音频: ['#8b5cf6', '#b79bff'],
  设备: ['#14b8a6', '#5cdcc9'],
  生活: ['#ef4444', '#ff8a8a'],
};

export const TOOLS: ToolDef[] = [
  { id: 'calculator', name: '计算器', icon: 'calc', category: '计算', desc: '函数与阶乘', component: Calculator },
  { id: 'base', name: '进制转换', icon: 'hash', category: '计算', desc: '2/8/10/16', component: BaseConverter },
  { id: 'unit', name: '单位换算', icon: 'swap', category: '计算', desc: '长度重量温度', component: UnitConverter },
  { id: 'mortgage', name: '房贷计算', icon: 'home', category: '计算', desc: '本息/本金', component: Mortgage },
  { id: 'tax', name: '个税计算', icon: 'coin', category: '计算', desc: '年度综合所得', component: IncomeTax },
  { id: 'interest', name: '利息计算', icon: 'bank', category: '计算', desc: '单利复利明细', component: InterestCalc },
  { id: 'bmi', name: 'BMI 计算', icon: 'pulse', category: '计算', desc: '体重健康指数', component: BMI },
  { id: 'age', name: '年龄计算', icon: 'cake', category: '计算', desc: '周岁虚岁天数', component: AgeCalc },
  { id: 'date', name: '日期计算', icon: 'calendar', category: '计算', desc: '相差/加减天数', component: DateCalc },
  { id: 'countdown', name: '纪念日倒计时', icon: 'hourglass', category: '计算', desc: '本地保存', component: Countdown },
  { id: 'electric', name: '电费计算', icon: 'wave', category: '计算', desc: '功率算电费', component: ElectricBill },
  { id: 'stats', name: '统计计算', icon: 'chart', category: '计算', desc: '均值方差标准差', component: Stats },
  { id: 'prime', name: '质数与因数', icon: 'grid', category: '计算', desc: '分解/公约数', component: Prime },
  { id: 'roman', name: '罗马数字', icon: 'book', category: '计算', desc: '1~3999 互转', component: Roman },
  { id: 'rmb', name: '人民币大写', icon: 'yen', category: '计算', desc: '票据规范写法', component: RmbUpper },
  { id: 'stopwatch', name: '秒表', icon: 'timer', category: '计算', desc: '计次分段', component: Stopwatch },
  { id: 'numcn', name: '数字转中文', icon: 'pen', category: '计算', desc: '读法/大写', component: NumberToChinese },
  { id: 'timecalc', name: '时间计算器', icon: 'clock', category: '计算', desc: '时刻差/加时长', component: TimeCalc },
  { id: 'workvalue', name: '工作性价比', icon: 'briefcase', category: '计算', desc: '薪资通勤换算', component: WorkValue },
  { id: 'wheel', name: '决定转盘', icon: 'wheel', category: '决定', desc: '选项随机转', component: DecisionWheel },
  { id: 'finger', name: '指尖转', icon: 'touch', category: '决定', desc: '多人按屏抽选', component: FingerRoulette },
  { id: 'score', name: '计分板', icon: 'trophy', category: '决定', desc: '多人计分', component: Scoreboard },
  { id: 'reaction', name: '反应力测试', icon: 'bolt', category: '决定', desc: '毫秒手速', component: ReactionTest },
  { id: 'danmaku', name: '手持弹幕', icon: 'megaphone', category: '决定', desc: '全屏滚动大字', component: Danmaku },
  { id: 'text', name: '文本工具', icon: 'pen', category: '文本', desc: '去重/替换/统计', component: TextTools },
  { id: 'case', name: '大小写转换', icon: 'letters', category: '文本', desc: '驼峰下划线', component: CaseConvert },
  { id: 'regex', name: '正则测试', icon: 'regex', category: '文本', desc: '实时匹配', component: RegexTester },
  { id: 'morse', name: '摩斯电码', icon: 'signal', category: '文本', desc: '编解码互转', component: Morse },
  { id: 'pinyin', name: '汉字转拼音', icon: 'book', category: '文本', desc: '声调/首字母', component: Pinyin },
  { id: 'diff', name: '文本差异', icon: 'diff', category: '文本', desc: '逐行对比', component: Diff },
  { id: 'pwstrength', name: '密码强度', icon: 'shield', category: '文本', desc: '评分与熵值', component: PwStrength },
  { id: 'width', name: '全角半角', icon: 'arrowsH', category: '文本', desc: 'ＡＢＣ ↔ ABC', component: WidthConvert },
  { id: 'typing', name: '打字测速', icon: 'keyboard', category: '文本', desc: '字速正确率', component: Typing },
  { id: 'codec', name: '编解码工具', icon: 'lock', category: '编码', desc: 'Base64 / URL', component: Codec },
  { id: 'json', name: 'JSON 格式化', icon: 'braces', category: '编码', desc: '格式化与校验', component: JsonFmt },
  { id: 'hash', name: '哈希计算', icon: 'hash', category: '编码', desc: 'MD5/SHA1/256', component: Hash },
  { id: 'unicode', name: 'Unicode 实体', icon: 'globe', category: '编码', desc: '转义与还原', component: Unicode },
  { id: 'rc4', name: 'RC4 加密', icon: 'key', category: '编码', desc: '对称加解密', component: Rc4Tool },
  { id: 'imgb64', name: '图片转 Base64', icon: 'frame', category: '编码', desc: '生成 Data URI', component: ImgToBase64 },
  { id: 'random', name: '随机数与密码', icon: 'dice', category: '生成', desc: '强密码生成', component: RandomTools },
  { id: 'qr', name: '二维码生成', icon: 'qr', category: '生成', desc: '文字链接成码', component: QrGen },
  { id: 'color', name: '颜色转换', icon: 'palette', category: '生成', desc: 'HEX/RGB/HSL', component: ColorTool },
  { id: 'lottery', name: '骰子抽签分组', icon: 'target', category: '生成', desc: '随机公平', component: Lottery },
  { id: 'palette', name: '配色方案', icon: 'dropper', category: '生成', desc: '一键生成协调配色', component: PaletteGen },
  { id: 'timestamp', name: '时间戳', icon: 'timer', category: '查询', desc: '秒/毫秒互转', component: Timestamp },
  { id: 'rate', name: '汇率换算', icon: 'swap', category: '查询', desc: '15 种常用货币', component: ExchangeRate },
  { id: 'lunar', name: '农历黄历', icon: 'moon', category: '查询', desc: '干支节气宜忌', component: LunarTool },
  { id: 'worldclock', name: '世界时钟', icon: 'clock', category: '查询', desc: '12 城市时间', component: WorldClock },
  { id: 'idcard', name: '身份证解析', icon: 'card', category: '查询', desc: '归属与生日', component: IdCard },
  { id: 'hotlines', name: '常用电话', icon: 'phone', category: '查询', desc: '公共服务号码', component: Hotlines },
  { id: 'subnet', name: 'IP 子网计算', icon: 'network', category: '查询', desc: '网段可用范围', component: Subnet },
  { id: 'http', name: 'HTTP 状态码', icon: 'signal', category: '查询', desc: '含义速查', component: HttpStatus },
  { id: 'websrc', name: '网页源码', icon: 'frame', category: '查询', desc: '状态头部正文', component: WebSource },
  { id: 'ipq', name: 'IP 查询', icon: 'server', category: '查询', desc: '归属运营商', component: IpQuery },
  { id: 'hoday', name: '历史上的今天', icon: 'book', category: '查询', desc: '大事记速览', component: HistoryToday },
  { id: 'imgcompress', name: '图片压缩', icon: 'image', category: '图片', desc: '压缩改格式', component: ImageCompress },
  { id: 'imgscramble', name: '图片混淆', icon: 'puzzle', category: '图片', desc: '乱序加密还原', component: ImageScramble },
  { id: 'prism', name: '光棱坦克图片', icon: 'layers', category: '图片', desc: '两图合成暗藏', component: PrismTank },
  { id: 'picker', name: '取色器', icon: 'dropper', category: '图片', desc: '图上取值', component: ColorPicker },
  { id: 'ncm', name: 'NCM 音乐转换', icon: 'music', category: '音频', desc: '本地转 MP3/FLAC', component: NcmTool },
  { id: 'metal', name: '金属探测仪', icon: 'magnet', category: '设备', desc: '磁力计探测', component: MetalDetector },
  { id: 'ruler', name: '尺子', icon: 'ruler', category: '设备', desc: '贴边刻度可校准', component: Ruler },
  { id: 'level', name: '水平仪', icon: 'bubble', category: '设备', desc: '气泡倾角检测', component: Level },
  { id: 'compass', name: '指南针', icon: 'compass', category: '设备', desc: '磁北方向', component: Compass },
  { id: 'noise', name: '噪音检测', icon: 'mic', category: '设备', desc: '分贝估算', component: NoiseMeter },
  { id: 'vibrate', name: '振动器', icon: 'wave', category: '设备', desc: '自定义节奏测马达', component: VibratorTool },
  { id: 'devinfo', name: '设备详情', icon: 'chip', category: '设备', desc: '硬件系统全览', component: DeviceInfo },
  { id: 'wallpaper', name: '当前壁纸', icon: 'image', category: '设备', desc: '导出系统壁纸', component: WallpaperTool },
  { id: 'screen', name: '屏幕信息', icon: 'phone', category: '设备', desc: '分辨率密度', component: ScreenInfo },
  { id: 'screentest', name: '屏幕测试', icon: 'grid', category: '设备', desc: '纯色坏点检测', component: ScreenTest },
  { id: 'selftest', name: '运行自检', icon: 'check', category: '设备', desc: '核心能力自测', component: SelfTest },
  { id: 'pomodoro', name: '番茄钟', icon: 'tomato', category: '生活', desc: '专注休息循环', component: Pomodoro },
  { id: 'screenclock', name: '屏幕时钟', icon: 'clock', category: '生活', desc: '全屏常亮农历', component: ScreenClock },
];
