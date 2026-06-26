---
name: add-docs-version
description: 为 openGauss 文档网站添加新的文档版本，自动更新相关配置文件
---

# add-docs-version

## 使用场景

当需要为 openGauss 文档网站添加新的文档版本时触发

- 添加文档版本
- 更新版本配置
- 配置nginx代理
- 版本发布

## 执行步骤

### 1. 获取版本信息

从用户输入中获取新的版本号。若用户未提供，询问用户。

版本号格式示例：`7.0.0-RC3`、`6.0.0`等

### 2. 更新版本配置文件

修改 `app/.vitepress/src/config/version.ts` 文件：

1. 在 `zh` 数组中添加新的版本对象，位置在 `latest` 之后
2. 在 `en` 数组中添加新的版本对象，位置在 `latest` 之后

版本对象格式：

```typescript
{
  label: '版本号 (状态)',  // 状态可以是 DEV、RC、LTS、Preview、EOM
  value: '版本号',
  link: {
    enterprise: '/zh/docs/版本号/release_notes/release_notes.html',
    lite: '/zh/docs/版本号-lite/release_notes/release_notes.html',
  }
}
```

### 3. 更新脚本配置文件（严格遵守）

修改 `scripts/config/version.js` 文件中的 `VITEPRESS_VERSIONS_CONFIG` 配置：

1. **不要**修改 `HUGO_VERSIONS_CONFIG` 配置
2. **不要**修改 `VITEPRESS_VERSIONS_CONFIG` 中**已添加**的 key 和 value，如 master 的内容
3. 在 `VITEPRESS_VERSIONS_CONFIG` 后面添加**新的**版本映射关系，格式为：`'版本号': '版本号'`

示例：

```typescript
export const VITEPRESS_VERSIONS_CONFIG = {
  common: 'common',
  master: 'latest',
  '7.0.0-RC3': '7.0.0-RC3',
  // ...中间的其它版本
  '新版本号': '新版本号',  // 添加此行
};
```

### 4. 更新 common.ts 中的 getSourceUrl 函数

修改 `app/.vitepress/src/utils/common.ts` 文件中的 `getSourceUrl` 函数：

1. 在函数内的 `map` 对象中添加新的版本映射关系
2. 格式为：`'新版本号': '新版本号',`

示例：

```typescript
const map: Record<string, string> = {
  common: 'common',
  latest: 'master',
  '7.0.0-RC3': '7.0.0-RC3',
  // ...中间的其它版本
  '新版本号': '新版本号',  // 添加此行
};
```

### 5. 更新 nginx 配置文件

修改 `deploy/nginx/nginx.portal.conf` 文件：

1. 在 `latest` 配置之后添加新的版本配置
2. 版本号中的点号(.)和连字符(-)需要替换为短横线(-)，例如 `7.0.0-RC3` 变为 `7-0-0-rc3`

配置格式：

```nginx
# ============ 版本号 ============

location /assets/版本号/ {
  proxy_set_header X-Forwarded-For $http_x_real_ip;
  proxy_set_header Connection "";

  proxy_pass https://docs-website-版本号.opengauss-docs-new:8080;
}

location ~ ^/(zh|en)/docs/版本号(-lite)?/ {
  proxy_set_header X-Forwarded-For $http_x_real_ip;
  proxy_set_header Connection "";
  proxy_intercept_errors on;
  error_page 404 @fallback;

  proxy_pass https://docs-website-版本号.opengauss-docs-new:8080;
}
```

### 6. 验证修改

检查所有修改是否正确，确保：

1. 版本号格式正确
2. 所有文件的修改都符合格式要求
3. 路径和链接格式正确
4. common.ts 中的 map 对象已添加新版本映射

## 注意事项

- 版本号格式：遵循语义化版本规范，如 `x.y.z` 或 `x.y.z-RCn`
- 状态标识：根据版本类型添加适当的状态标识，如 DEV、RC、LTS、Preview、EOM
- nginx配置：版本号在nginx配置中需要转换为小写，并将点号和连字符替换为短横线
- 位置顺序：新的版本应添加在 `latest` 之后，保持版本列表的降序排列

## 输出格式（严格遵守）

操作完成后，输出以下信息：

1. 已修改的文件列表
2. 添加的版本信息
3. 配置详情

示例：

```text
✅ 已添加版本：7.0.0-RC3

已修改文件：
- app/.vitepress/src/config/version.ts
- scripts/config/version.js
- app/.vitepress/src/utils/common.ts
- deploy/nginx/nginx.portal.conf

版本配置：
- 标签：7.0.0-RC3 (RC)
- 值：7.0.0-RC3
- 链接：
  - 企业版：/zh/docs/7.0.0-RC3/release_notes/release_notes.html
  - 轻量版：/zh/docs/7.0.0-RC3-lite/release_notes/release_notes.html

Nginx配置：
- 代理地址：https://docs-website-7-0-0-rc3.opengauss-docs-new:8080
```
