import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VITEPRESS_VERSIONS_CONFIG, HUGO_VERSIONS_CONFIG } from './config/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const packageConfig = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
if (!packageConfig.scripts.build.includes('common')) {
  process.exit(0);
}

function readEnvVar(key) {
  const envFile = join(__dirname, '../app/.env.production');
  if (!existsSync(envFile)) {
    return undefined;
  }

  const match = readFileSync(envFile, 'utf-8').match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm'));

  return match ? match[1].trim() : undefined;
}

const sitemapHostname = readEnvVar('VITE_SERVICE_DOCS_URL') || 'https://docs.openeuler.org';
const distDir = join(__dirname, '../app/.vitepress/dist');

const branches = [
  ...new Set([...Object.values(VITEPRESS_VERSIONS_CONFIG), ...Object.values(HUGO_VERSIONS_CONFIG)]),
].filter((br) => !br.includes('common'));

// ============ write sitemap_index.xml
const sitemapIndex = join(distDir, 'sitemap_index.xml');
writeFileSync(
  sitemapIndex,
  `<?xml version="1.0" encoding="utf-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <sitemap>
    <loc>${sitemapHostname}/sitemap.xml</loc>
  </sitemap>
${branches
  .map((br) => {
    return `  <sitemap>
  <loc>${sitemapHostname}/docs/${br}/sitemap.xml</loc>
</sitemap>`;
  })
  .join('\n')}
</sitemapindex>`
);

// 写robots.txt
const robots = join(distDir, 'robots.txt');
if (!existsSync(robots)) {
  console.log(`❌ robots.txt不存在`);
} else {
  const robotsContent = readFileSync(robots, 'utf-8');
  writeFileSync(robots, `${robotsContent}\nSitemap:${sitemapHostname}/sitemap_index.xml`);
}
