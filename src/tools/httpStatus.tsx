import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Field, C } from '../ui';

const CODES: [number, string, string][] = [
  [100, 'Continue', '继续，客户端应继续请求'],
  [101, 'Switching Protocols', '切换协议（如升级 WebSocket）'],
  [200, 'OK', '请求成功'],
  [201, 'Created', '已创建（常用于 POST 新资源）'],
  [204, 'No Content', '成功但无返回体'],
  [301, 'Moved Permanently', '永久重定向'],
  [302, 'Found', '临时重定向'],
  [304, 'Not Modified', '缓存有效，用本地缓存'],
  [400, 'Bad Request', '请求参数错误'],
  [401, 'Unauthorized', '未认证（没登录/token 失效）'],
  [403, 'Forbidden', '已认证但无权限'],
  [404, 'Not Found', '资源不存在'],
  [405, 'Method Not Allowed', '请求方法不允许'],
  [408, 'Request Timeout', '请求超时'],
  [409, 'Conflict', '资源冲突'],
  [413, 'Payload Too Large', '请求体过大'],
  [415, 'Unsupported Media Type', '不支持的媒体类型'],
  [422, 'Unprocessable Entity', '参数校验失败'],
  [429, 'Too Many Requests', '请求过于频繁（被限流）'],
  [500, 'Internal Server Error', '服务器内部错误'],
  [501, 'Not Implemented', '功能未实现'],
  [502, 'Bad Gateway', '网关错误（后端挂了）'],
  [503, 'Service Unavailable', '服务不可用（过载/维护）'],
  [504, 'Gateway Timeout', '网关超时'],
];

export default function HttpStatus({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState('');
  const key = q.trim().toLowerCase();
  const filtered = key
    ? CODES.filter(
        ([c, name, d]) =>
          String(c).includes(key) || name.toLowerCase().includes(key) || d.includes(key),
      )
    : CODES;

  return (
    <Page id="http" title="HTTP 状态码" onBack={onBack}>
      <Card>
        <Field
          label="搜索（码 / 英文名 / 说明）"
          value={q}
          onChange={setQ}
          placeholder="例如 404、redirect、超时"
        />
      </Card>
      <Card>
        {filtered.map(([code, name, desc]) => (
          <View key={code} style={st.row}>
            <Text style={[st.code, { color: colorOf(code) }]}>{code}</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{name}</Text>
              <Text style={st.desc}>{desc}</Text>
            </View>
          </View>
        ))}
        {filtered.length === 0 && <Text style={st.empty}>没有匹配的状态码</Text>}
      </Card>
    </Page>
  );
}

function colorOf(code: number): string {
  if (code < 200) return '#6b7280';
  if (code < 300) return '#16a34a';
  if (code < 400) return '#2563eb';
  if (code < 500) return '#f97316';
  return '#dc2626';
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  code: { width: 52, fontSize: 17, fontWeight: '800' },
  name: { fontSize: 14, fontWeight: '600', color: C.text },
  desc: { fontSize: 12, color: C.sub, marginTop: 2, lineHeight: 17 },
  empty: { color: C.sub, textAlign: 'center', paddingVertical: 16 },
});
