import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

/**
 * 内置矢量图标集（线性风格，统一 24×24 网格、圆头描边）。
 * 全部为原创几何图形，取代 emoji，保证跨设备渲染一致。
 */
export type IconName =
  | 'calc'
  | 'hash'
  | 'swap'
  | 'home'
  | 'coin'
  | 'bank'
  | 'pulse'
  | 'cake'
  | 'calendar'
  | 'hourglass'
  | 'bolt'
  | 'chart'
  | 'grid'
  | 'yen'
  | 'timer'
  | 'clock'
  | 'briefcase'
  | 'wheel'
  | 'touch'
  | 'trophy'
  | 'megaphone'
  | 'pen'
  | 'letters'
  | 'regex'
  | 'signal'
  | 'book'
  | 'diff'
  | 'shield'
  | 'arrowsH'
  | 'keyboard'
  | 'lock'
  | 'braces'
  | 'globe'
  | 'key'
  | 'frame'
  | 'dice'
  | 'qr'
  | 'palette'
  | 'target'
  | 'moon'
  | 'card'
  | 'phone'
  | 'network'
  | 'server'
  | 'image'
  | 'puzzle'
  | 'layers'
  | 'dropper'
  | 'music'
  | 'magnet'
  | 'ruler'
  | 'bubble'
  | 'compass'
  | 'mic'
  | 'wave'
  | 'chip'
  | 'tomato'
  | 'search'
  | 'sun'
  | 'copy'
  | 'chevron'
  | 'next'
  | 'close'
  | 'check'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'sliders'
  | 'refresh'
  | 'play'
  | 'pause'
  | 'info'
  | 'star'
  | 'external'
  | 'rotate'
  | 'dot';

const s = (color: string) => ({ stroke: color, fill: 'none' as const });

const GLYPHS: Record<IconName, (c: string) => React.ReactNode> = {
  dot: (c) => <Circle cx={12} cy={12} r={3} {...s(c)} />,
  calc: (c) => (
    <>
      <Rect x={4.5} y={3} width={15} height={18} rx={2.6} {...s(c)} />
      <Path d="M8 7.5h8" {...s(c)} />
      <Path d="M8.4 12h.2M11.9 12h.2M15.4 12h.2M8.4 16h.2M11.9 16h.2M15.4 16h.2" {...s(c)} />
    </>
  ),
  hash: (c) => (
    <>
      <Path d="M9.5 4 8 20M16 4l-1.5 16M4.5 9h15M4 15h15" {...s(c)} />
    </>
  ),
  swap: (c) => (
    <>
      <Path d="M4 8h13M14 5l3.5 3L14 11" {...s(c)} />
      <Path d="M20 16H7M10 13l-3.5 3L10 19" {...s(c)} />
    </>
  ),
  home: (c) => (
    <>
      <Path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" {...s(c)} />
      <Path d="M9.5 20.5v-6h5v6" {...s(c)} />
    </>
  ),
  coin: (c) => (
    <>
      <Circle cx={12} cy={12} r={8} {...s(c)} />
      <Path d="M12 7.5v9M9.5 10.2h5M9.5 13.4h5" {...s(c)} />
    </>
  ),
  bank: (c) => (
    <>
      <Path d="M3.5 9.5 12 5l8.5 4.5" {...s(c)} />
      <Path d="M6 11v7M10 11v7M14 11v7M18 11v7M4 19.5h16" {...s(c)} />
    </>
  ),
  pulse: (c) => (
    <>
      <Path d="M2.8 12.5h3.6l1.9-5.6 2.8 10.2 2.1-6.2 1.5 3.3h6.5" {...s(c)} />
    </>
  ),
  cake: (c) => (
    <>
      <Rect x={4} y={11} width={16} height={8.5} rx={2} {...s(c)} />
      <Path d="M4 15h16M12 11V7.4" {...s(c)} />
      <Circle cx={12} cy={5.4} r={1.1} {...s(c)} />
    </>
  ),
  calendar: (c) => (
    <>
      <Rect x={3.5} y={5} width={17} height={15.5} rx={2.6} {...s(c)} />
      <Path d="M8 3.2v3.6M16 3.2v3.6M3.5 10h17" {...s(c)} />
      <Path d="M8 14h2M14 14h2M8 17.4h2" {...s(c)} />
    </>
  ),
  hourglass: (c) => (
    <>
      <Path d="M7 3.5h10M7 20.5h10" {...s(c)} />
      <Path d="M8 3.5v3.2c0 2 4 3.4 4 5.3s-4 3.3-4 5.3v3.2" {...s(c)} />
      <Path d="M16 3.5v3.2c0 2-4 3.4-4 5.3s4 3.3 4 5.3v3.2" {...s(c)} />
    </>
  ),
  bolt: (c) => <Path d="M13.6 2.5 5.5 13.2h5.1l-1.2 8.3 8.1-11H12z" {...s(c)} />,
  chart: (c) => (
    <>
      <Path d="M4 20h16" {...s(c)} />
      <Path d="M7.5 20V12M12 20V6.5M16.5 20v-5" {...s(c)} />
    </>
  ),
  grid: (c) => (
    <>
      <Rect x={4} y={4} width={7} height={7} rx={1.8} {...s(c)} />
      <Rect x={13} y={4} width={7} height={7} rx={1.8} {...s(c)} />
      <Rect x={4} y={13} width={7} height={7} rx={1.8} {...s(c)} />
      <Rect x={13} y={13} width={7} height={7} rx={1.8} {...s(c)} />
    </>
  ),
  yen: (c) => (
    <>
      <Path d="M12 4v16M7 4.5l5 6 5-6M7.5 13.5h9M7.5 16.5h9" {...s(c)} />
    </>
  ),
  timer: (c) => (
    <>
      <Circle cx={12} cy={13.2} r={7.3} {...s(c)} />
      <Path d="M12 13.2V9.4M9.4 2.6h5.2M18 7.4l1.6-1.6" {...s(c)} />
    </>
  ),
  clock: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.2} {...s(c)} />
      <Path d="M12 7.4V12l3.2 2" {...s(c)} />
    </>
  ),
  briefcase: (c) => (
    <>
      <Rect x={3.5} y={7.5} width={17} height={12} rx={2.4} {...s(c)} />
      <Path d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7M3.5 12.5h17" {...s(c)} />
    </>
  ),
  wheel: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.4} {...s(c)} />
      <Path d="M12 3.6v16.8M3.6 12h16.8M6 6.1l12 11.8M18 6.1 6 17.9" {...s(c)} />
      <Circle cx={12} cy={12} r={2} {...s(c)} />
    </>
  ),
  touch: (c) => (
    <>
      <Circle cx={12} cy={12} r={3.2} {...s(c)} />
      <Path d="M12 3.2v2.4M12 18.4v2.4M3.2 12h2.4M18.4 12h2.4" {...s(c)} />
      <Circle cx={12} cy={12} r={7.6} {...s(c)} />
    </>
  ),
  trophy: (c) => (
    <>
      <Path d="M7.5 4h9v4.6a4.5 4.5 0 0 1-9 0z" {...s(c)} />
      <Path d="M7.5 5.4H5.2a2.4 2.4 0 0 0 2.3 3.2M16.5 5.4h2.3a2.4 2.4 0 0 1-2.3 3.2" {...s(c)} />
      <Path d="M12 13.1V16M9 20h6M10.2 16h3.6l.6 4h-4.8z" {...s(c)} />
    </>
  ),
  megaphone: (c) => (
    <>
      <Path d="M4 10.5v3l10 4.5V6z" {...s(c)} />
      <Path d="M14 8.5c2 0 3.4 1.5 3.4 3.5S16 15.5 14 15.5M6.5 14.6v2.6a1.6 1.6 0 0 0 3.2.3v-1.8" {...s(c)} />
    </>
  ),
  pen: (c) => (
    <>
      <Path d="M4 20h16" {...s(c)} />
      <Path d="M6.5 16.5 16.8 6.2a2 2 0 0 1 2.8 2.8L9.3 19.3z" {...s(c)} />
    </>
  ),
  letters: (c) => (
    <>
      <Path d="M3.5 19 8 5.5 12.5 19M5.2 14.4h5.6" {...s(c)} />
      <Path d="M20.5 11.2a3.6 3.6 0 1 0 0 7.2M20.5 11.2v7.2" {...s(c)} />
    </>
  ),
  regex: (c) => (
    <>
      <Path d="M6.5 12h9M11 7.5v9M7.8 8.6l5.4 6.8M13.2 8.6l-5.4 6.8" {...s(c)} />
      <Circle cx={19} cy={12} r={1.6} {...s(c)} />
      <Circle cx={19} cy={17.5} r={1.6} {...s(c)} />
    </>
  ),
  signal: (c) => (
    <>
      <Path d="M4 6h3v12H4zM10 9h3v9h-3zM16 4h3v14h-3z" {...s(c)} />
    </>
  ),
  book: (c) => (
    <>
      <Path d="M5 4.5h9.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" {...s(c)} />
      <Path d="M5 17.2a3 3 0 0 1 3-3h9.5M9 8h5" {...s(c)} />
    </>
  ),
  diff: (c) => (
    <>
      <Path d="M3.5 6.5h7M3.5 12h5M3.5 17.5h7" {...s(c)} />
      <Path d="M14.5 9.5h6M14.5 15h6M17.5 6.5v6" {...s(c)} />
    </>
  ),
  shield: (c) => (
    <>
      <Path d="M12 3.4l7 2.6v5.2c0 4.6-3 8-7 9.4-4-1.4-7-4.8-7-9.4V6z" {...s(c)} />
      <Path d="m9.2 12.2 2 2 3.6-4" {...s(c)} />
    </>
  ),
  arrowsH: (c) => (
    <>
      <Path d="M4 12h16M7 8.6 3.6 12 7 15.4M17 8.6 20.4 12 17 15.4" {...s(c)} />
    </>
  ),
  keyboard: (c) => (
    <>
      <Rect x={2.8} y={6.5} width={18.4} height={11} rx={2.4} {...s(c)} />
      <Path d="M6.4 10h.2M9.7 10h.2M13 10h.2M16.3 10h.2M6.4 13.4h.2M9.7 13.4h.2M13 13.4h5" {...s(c)} />
    </>
  ),
  lock: (c) => (
    <>
      <Rect x={4.8} y={10.2} width={14.4} height={10} rx={2.4} {...s(c)} />
      <Path d="M8.2 10.2V7.8a3.8 3.8 0 0 1 7.6 0v2.4M12 14.4v2" {...s(c)} />
    </>
  ),
  braces: (c) => (
    <>
      <Path d="M9.4 4C7 4 7.6 9.2 5.6 10.4c-1 .6-1 .6 0 1.2 2 1.2 1.4 6.4 3.8 6.4" {...s(c)} />
      <Path d="M14.6 4c2.4 0 1.8 5.2 3.8 6.4 1 .6 1 .6 0 1.2-2 1.2-1.4 6.4-3.8 6.4" {...s(c)} />
    </>
  ),
  globe: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.4} {...s(c)} />
      <Ellipse cx={12} cy={12} rx={3.6} ry={8.4} {...s(c)} />
      <Path d="M3.8 9.4h16.4M3.8 14.6h16.4" {...s(c)} />
    </>
  ),
  key: (c) => (
    <>
      <Circle cx={8} cy={15.6} r={3.6} {...s(c)} />
      <Path d="M10.8 13 19.5 4.3M16.3 7.5l2.4 2.4M18.4 5.4l2.4 2.4" {...s(c)} />
    </>
  ),
  frame: (c) => (
    <>
      <Rect x={3.6} y={4.6} width={16.8} height={14.8} rx={2.6} {...s(c)} />
      <Path d="M3.6 9.2h16.8" {...s(c)} />
      <Path d="M8 5.9h4" {...s(c)} />
    </>
  ),
  dice: (c) => (
    <>
      <Rect x={3.8} y={3.8} width={16.4} height={16.4} rx={3.4} {...s(c)} />
      <Circle cx={8.6} cy={8.6} r={1.35} fill={c} />
      <Circle cx={15.4} cy={15.4} r={1.35} fill={c} />
      <Circle cx={12} cy={12} r={1.35} fill={c} />
    </>
  ),
  qr: (c) => (
    <>
      <Rect x={3.6} y={3.6} width={6.6} height={6.6} rx={1.6} {...s(c)} />
      <Rect x={13.8} y={3.6} width={6.6} height={6.6} rx={1.6} {...s(c)} />
      <Rect x={3.6} y={13.8} width={6.6} height={6.6} rx={1.6} {...s(c)} />
      <Path d="M13.8 13.8h3v3h-3zM20.4 13.8v6.6h-6.6" {...s(c)} />
    </>
  ),
  palette: (c) => (
    <>
      <Path d="M12 3.6a8.4 8.4 0 0 0 0 16.8c1.4 0 2.2-1 2.2-2s-.8-1.8-.8-2.6c0-.9.7-1.6 1.7-1.6h1.6a3.7 3.7 0 0 0 3.7-3.9c0-3.6-3.6-6.7-8.4-6.7z" {...s(c)} />
      <Circle cx={8.2} cy={9.6} r={1.2} fill={c} />
      <Circle cx={12} cy={7.4} r={1.2} fill={c} />
      <Circle cx={7.8} cy={14} r={1.2} fill={c} />
    </>
  ),
  target: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.4} {...s(c)} />
      <Circle cx={12} cy={12} r={4.6} {...s(c)} />
      <Circle cx={12} cy={12} r={1.3} fill={c} />
    </>
  ),
  moon: (c) => <Path d="M19.5 14.4A7.8 7.8 0 0 1 9.6 4.5a8.4 8.4 0 1 0 9.9 9.9z" {...s(c)} />,
  card: (c) => (
    <>
      <Rect x={2.8} y={5.4} width={18.4} height={13.2} rx={2.6} {...s(c)} />
      <Path d="M2.8 10h18.4M6.4 14.6h3.6" {...s(c)} />
    </>
  ),
  phone: (c) => (
    <>
      <Rect x={6.4} y={2.6} width={11.2} height={18.8} rx={3} {...s(c)} />
      <Path d="M10.4 5.6h3.2M12 18.2h.2" {...s(c)} />
    </>
  ),
  network: (c) => (
    <>
      <Circle cx={12} cy={5.4} r={2.4} {...s(c)} />
      <Circle cx={5.6} cy={18.6} r={2.4} {...s(c)} />
      <Circle cx={18.4} cy={18.6} r={2.4} {...s(c)} />
      <Path d="M12 7.8v4.4M12 12.2 6.8 16.5M12 12.2l5.2 4.3" {...s(c)} />
    </>
  ),
  server: (c) => (
    <>
      <Rect x={3.4} y={4.2} width={17.2} height={6.4} rx={2.2} {...s(c)} />
      <Rect x={3.4} y={13.4} width={17.2} height={6.4} rx={2.2} {...s(c)} />
      <Path d="M6.8 7.4h.2M6.8 16.6h.2" {...s(c)} />
    </>
  ),
  image: (c) => (
    <>
      <Rect x={3.4} y={4.4} width={17.2} height={15.2} rx={2.8} {...s(c)} />
      <Circle cx={9} cy={9.6} r={1.6} {...s(c)} />
      <Path d="m4.4 17.6 4.8-4.4 3.6 3.2 3-2.6 4.2 4" {...s(c)} />
    </>
  ),
  puzzle: (c) => (
    <>
      <Path d="M9.6 4.2h4.8v2.2a1.7 1.7 0 1 0 3.4 0V4.2h1.4a1 1 0 0 1 1 1v5.2h-2.2a1.8 1.8 0 1 0 0 3.6h2.2v5.4a1 1 0 0 1-1 1h-5.3v-2.2a1.8 1.8 0 1 0-3.6 0v2.2H5.8a1 1 0 0 1-1-1V14h2.1a1.8 1.8 0 1 0 0-3.6H4.8V5.2a1 1 0 0 1 1-1h3.8z" {...s(c)} />
    </>
  ),
  layers: (c) => (
    <>
      <Path d="m12 3.4 8.4 4.3L12 12 3.6 7.7z" {...s(c)} />
      <Path d="m4.4 12.4 7.6 3.9 7.6-3.9M4.4 16.6l7.6 3.9 7.6-3.9" {...s(c)} />
    </>
  ),
  dropper: (c) => (
    <>
      <Path d="M15.6 3.4a2.6 2.6 0 0 1 3.7 3.7l-1.8 1.8 1 1-1.6 1.6-1-1-6.6 6.6-3.6.9.9-3.6 6.6-6.6-1-1 1.6-1.6 1 1z" {...s(c)} />
    </>
  ),
  music: (c) => (
    <>
      <Path d="M9.4 17.2V6.4l9-1.8v10.6" {...s(c)} />
      <Circle cx={7} cy={17.8} r={2.6} {...s(c)} />
      <Circle cx={16} cy={15.6} r={2.6} {...s(c)} />
    </>
  ),
  magnet: (c) => (
    <>
      <Path d="M6.2 3.6v9.2a5.8 5.8 0 0 0 11.6 0V3.6" {...s(c)} />
      <Path d="M6.2 8.6h4.4M13.4 8.6h4.4" {...s(c)} />
    </>
  ),
  ruler: (c) => (
    <>
      <Rect x={2.6} y={8.4} width={18.8} height={7.2} rx={1.8} {...s(c)} />
      <Path d="M7 8.4v2.6M11 8.4v3.6M15 8.4v2.6M19 8.4v3.6" {...s(c)} />
    </>
  ),
  bubble: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.2} {...s(c)} />
      <Circle cx={12} cy={12} r={3.6} fill={c} />
      <Path d="M3.8 12h4.4M15.8 12h4.4" {...s(c)} />
    </>
  ),
  compass: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.4} {...s(c)} />
      <Path d="m15.4 8.6-2 4.8-4.8 2 2-4.8z" {...s(c)} />
    </>
  ),
  mic: (c) => (
    <>
      <Rect x={9.2} y={3} width={5.6} height={10.4} rx={2.8} {...s(c)} />
      <Path d="M5.8 11.4a6.2 6.2 0 0 0 12.4 0M12 17.8V21M9 21h6" {...s(c)} />
    </>
  ),
  wave: (c) => (
    <>
      <Path d="M2.8 12h2.4M7.2 7.4v9.2M11.6 4.6v14.8M16 8.4v7.2M20.4 10.6v2.8" {...s(c)} />
    </>
  ),
  chip: (c) => (
    <>
      <Rect x={6.6} y={6.6} width={10.8} height={10.8} rx={2.4} {...s(c)} />
      <Path d="M10 3.4v3.2M14 3.4v3.2M10 17.4v3.2M14 17.4v3.2M3.4 10h3.2M3.4 14h3.2M17.4 10h3.2M17.4 14h3.2" {...s(c)} />
    </>
  ),
  tomato: (c) => (
    <>
      <Circle cx={12} cy={13.8} r={6.8} {...s(c)} />
      <Path d="M12 7V5.4M8.6 5.6c1.4.4 2.4 1 3.4 2.2 1-1.2 2-1.8 3.4-2.2" {...s(c)} />
    </>
  ),
  search: (c) => (
    <>
      <Circle cx={10.6} cy={10.6} r={6.2} {...s(c)} />
      <Path d="m15.4 15.4 4.4 4.4" {...s(c)} />
    </>
  ),
  sun: (c) => (
    <>
      <Circle cx={12} cy={12} r={4.2} {...s(c)} />
      <Path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.5 5.5 7 7M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5" {...s(c)} />
    </>
  ),
  copy: (c) => (
    <>
      <Rect x={8.4} y={8.4} width={11.2} height={11.2} rx={2.4} {...s(c)} />
      <Path d="M15.6 5.6a2.2 2.2 0 0 0-2.2-2.2H6.6a2.2 2.2 0 0 0-2.2 2.2v6.8a2.2 2.2 0 0 0 2.2 2.2" {...s(c)} />
    </>
  ),
  chevron: (c) => <Path d="M14.6 5.6 8.2 12l6.4 6.4" {...s(c)} />,
  next: (c) => <Path d="M9.4 5.6 15.8 12l-6.4 6.4" {...s(c)} />,
  close: (c) => <Path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6" {...s(c)} />,
  check: (c) => <Path d="m5.4 12.6 4.4 4.4 9-9.6" {...s(c)} />,
  plus: (c) => <Path d="M12 5.4v13.2M5.4 12h13.2" {...s(c)} />,
  minus: (c) => <Path d="M5.4 12h13.2" {...s(c)} />,
  trash: (c) => (
    <>
      <Path d="M4.6 6.8h14.8M9.2 6.8V4.6h5.6v2.2" {...s(c)} />
      <Path d="M6.6 6.8 7.6 20h8.8l1-13.2M10.4 10.2v6M13.6 10.2v6" {...s(c)} />
    </>
  ),
  sliders: (c) => (
    <>
      <Path d="M4 7.4h16M4 12h16M4 16.6h16" {...s(c)} />
      <Circle cx={9} cy={7.4} r={1.8} fill={c} />
      <Circle cx={15} cy={12} r={1.8} fill={c} />
      <Circle cx={7.6} cy={16.6} r={1.8} fill={c} />
    </>
  ),
  refresh: (c) => (
    <>
      <Path d="M20 12a8 8 0 1 1-2.6-5.9" {...s(c)} />
      <Path d="M20.4 3.6v4.6h-4.6" {...s(c)} />
    </>
  ),
  play: (c) => <Path d="M8.4 5.6 18.4 12l-10 6.4z" {...s(c)} />,
  pause: (c) => <Path d="M9 5.4v13.2M15 5.4v13.2" {...s(c)} />,
  info: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.4} {...s(c)} />
      <Path d="M12 11v5.4M12 7.8h.2" {...s(c)} />
    </>
  ),
  star: (c) => (
    <Path d="m12 3.8 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17.2l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z" {...s(c)} />
  ),
  external: (c) => (
    <>
      <Path d="M13.4 4.4h6.2v6.2" {...s(c)} />
      <Path d="M19.6 4.4 11 13" {...s(c)} />
      <Path d="M18 14.4v4.6a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6V7.6A1.6 1.6 0 0 1 5.4 6h4.6" {...s(c)} />
    </>
  ),
  // 屏幕旋转：手机 + 两侧旋转箭头
  rotate: (c) => (
    <>
      <Rect x={7.6} y={4.6} width={8.8} height={14.8} rx={2.2} {...s(c)} />
      <Path d="M12 17h.2" {...s(c)} />
      <Path d="M4.4 8.2a3.4 3.4 0 0 1 3.4-2.6M19.6 15.8a3.4 3.4 0 0 1-3.4 2.6" {...s(c)} />
      <Path d="M4.2 5.6v2.8h2.8M19.8 18.4v-2.8h-2.8" {...s(c)} />
    </>
  ),
};

export function Icon(props: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const size = props.size ?? 22;
  const glyph = GLYPHS[props.name] ?? GLYPHS.dot;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      stroke={props.color}
      strokeWidth={props.strokeWidth ?? 1.7}
      strokeLinecap="round"
      strokeLinejoin="round">
      {glyph(props.color)}
    </Svg>
  );
}

export const ICON_NAMES = Object.keys(GLYPHS) as IconName[];
