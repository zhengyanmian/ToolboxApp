import React from 'react';
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

export type ToolDef = {
  id: string;
  name: string;
  icon: string;
  category: string;
  desc: string;
  component: React.ComponentType<{ onBack: () => void }>;
};

export const CATEGORIES = ['计算', '文本', '编码', '生成', '查询', '设备'];

export const TOOLS: ToolDef[] = [
  { id: 'calculator', name: '计算器', icon: '🧮', category: '计算', desc: '支持函数与阶乘', component: Calculator },
  { id: 'base', name: '进制转换', icon: '🔢', category: '计算', desc: '2/8/10/16 进制', component: BaseConverter },
  { id: 'unit', name: '单位换算', icon: '📐', category: '计算', desc: '长度重量温度等', component: UnitConverter },
  { id: 'mortgage', name: '房贷计算', icon: '🏠', category: '计算', desc: '等额本息/本金', component: Mortgage },
  { id: 'tax', name: '个税计算', icon: '💰', category: '计算', desc: '年度综合所得税', component: IncomeTax },
  { id: 'interest', name: '利息计算', icon: '🏦', category: '计算', desc: '单利/复利逐年明细', component: InterestCalc },
  { id: 'bmi', name: 'BMI 计算', icon: '⚖️', category: '计算', desc: '体重健康指数', component: BMI },
  { id: 'age', name: '年龄计算', icon: '🎂', category: '计算', desc: '周岁/虚岁/生活天数', component: AgeCalc },
  { id: 'date', name: '日期计算', icon: '📅', category: '计算', desc: '相差天数/加减天数', component: DateCalc },
  { id: 'countdown', name: '纪念日倒计时', icon: '⏳', category: '计算', desc: '本地保存/快捷日期', component: Countdown },
  { id: 'electric', name: '电费计算', icon: '⚡', category: '计算', desc: '电器功率算电费', component: ElectricBill },
  { id: 'text', name: '文本工具', icon: '📝', category: '文本', desc: '去重/替换/统计', component: TextTools },
  { id: 'case', name: '大小写转换', icon: '🔠', category: '文本', desc: '驼峰/下划线等', component: CaseConvert },
  { id: 'regex', name: '正则测试', icon: '🔤', category: '文本', desc: '实时匹配/标志切换', component: RegexTester },
  { id: 'morse', name: '摩斯电码', icon: '📡', category: '文本', desc: '编码/解码互转', component: Morse },
  { id: 'codec', name: '编解码工具', icon: '🔐', category: '编码', desc: 'Base64 / URL', component: Codec },
  { id: 'json', name: 'JSON 格式化', icon: '🧾', category: '编码', desc: '格式化/压缩校验', component: JsonFmt },
  { id: 'random', name: '随机数/密码', icon: '🎲', category: '生成', desc: '随机数与强密码', component: RandomTools },
  { id: 'qr', name: '二维码生成', icon: '🔳', category: '生成', desc: '文字/链接生成码', component: QrGen },
  { id: 'color', name: '颜色转换', icon: '🎨', category: '生成', desc: 'HEX/RGB/HSL', component: ColorTool },
  { id: 'timestamp', name: '时间戳', icon: '⏱️', category: '查询', desc: '秒/毫秒互转', component: Timestamp },
  { id: 'rate', name: '汇率换算', icon: '💱', category: '查询', desc: '15 种常用货币', component: ExchangeRate },
  { id: 'lunar', name: '农历/黄历', icon: '🏮', category: '查询', desc: '干支/节气/宜忌', component: LunarTool },
  { id: 'worldclock', name: '世界时钟', icon: '🌍', category: '查询', desc: '12 城市实时时间', component: WorldClock },
  { id: 'idcard', name: '身份证解析', icon: '🪪', category: '查询', desc: '本地解析归属/生日', component: IdCard },
  { id: 'hotlines', name: '常用电话', icon: '☎️', category: '查询', desc: '公共服务号码速拨', component: Hotlines },
  { id: 'screen', name: '屏幕信息', icon: '📱', category: '设备', desc: '分辨率/密度/系统', component: ScreenInfo },
];
