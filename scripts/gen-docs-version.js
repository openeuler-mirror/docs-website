import fs from 'fs';
import path from 'path';
import url from 'url';
import { createRequire } from 'module';

console.log('正在生成 docs-version.json...');

const SCRIPT_PATH = path.dirname(url.fileURLToPath(import.meta.url));
const DOCS_VERSION_TS_PATH = path.join(SCRIPT_PATH, '../app/.vitepress/src/config/version.ts');
const DOCS_VERSION_JSON_PATH = path.join(SCRIPT_PATH, '../app/.vitepress/dist/docs-version.json');

const require = createRequire(import.meta.url);
const { versions } = require(DOCS_VERSION_TS_PATH);
const data = versions.zh.map(item => ({
  label: item.label,
  value: item.value,
  eom: item.archive,
  branch: item.href ? `stable2-${item.value}` : `stable-${item.value}`
}));

fs.writeFileSync(DOCS_VERSION_JSON_PATH, JSON.stringify(data, null, 2));

console.log('生成 docs-version.json 成功！');
