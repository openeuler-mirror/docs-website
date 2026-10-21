import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VITEPRESS_VERSIONS_CONFIG, HUGO_VERSIONS_CONFIG } from './config/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnvVar(key) {
  const envFile = join(__dirname, '../app/.env.production');
  if (!existsSync(envFile)) {
    return undefined;
  }
  const match = readFileSync(envFile, 'utf-8').match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : undefined;
}

const docsOrigin = readEnvVar('VITE_SERVICE_DOCS_URL') || 'https://docs.openeuler.org';

const packageConfig = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
if (!packageConfig.scripts.build.includes('common')) {
  process.exit(0);
}

const versions = [...new Set([...Object.values(VITEPRESS_VERSIONS_CONFIG), ...Object.values(HUGO_VERSIONS_CONFIG)])].filter((ver) => !ver.includes('common'));

// GET 请求并只读取首个响应块校验可访问性，同时防范软 404 返回 HTML 页面的情况
async function isFileAccessible(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok || !resp.body) {
      return false;
    }
    const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader();
    const { value } = await reader.read();
    await reader.cancel();
    if (value && value.replace(/^\s+/, '').startsWith('<!DOCTYPE html>')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const llmstxtPath = join(__dirname, '../app/.vitepress/dist/llms.txt');
  if (!existsSync(llmstxtPath)) {
    console.log('❌ llms.txt不存在');
    return;
  }

  const linkLines = [];
  for (const ver of versions) {
    const llmsUrl = `${docsOrigin}/docs/${ver}/llms.txt`;
    const llmsFullUrl = `${docsOrigin}/docs/${ver}/llms-full.txt`;

    if (await isFileAccessible(llmsUrl)) {
      linkLines.push(`- [${ver} llms.txt](${llmsUrl})`);
    } else {
      console.log(`❌ ${ver} llms.txt 无法访问，已跳过`);
    }
    if (await isFileAccessible(llmsFullUrl)) {
      linkLines.push(`- [${ver} llms-full.txt](${llmsFullUrl})`);
    } else {
      console.log(`❌ ${ver} llms-full.txt 无法访问，已跳过`);
    }
  }

  if (linkLines.length > 0) {
    const section = ['', '## llms.txt and llms-full.txt of docs', '', ...linkLines, ''].join('\n');
    appendFileSync(llmstxtPath, section, 'utf-8');
    console.log(`✅ llms.txt 已追加 ${linkLines.length} 条版本文档链接`);
  } else {
    console.log('❌ 没有任何版本文档链接可追加');
  }
}

await main();
