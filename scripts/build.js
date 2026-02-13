import path from 'path';
import url from 'url';
import { execSync } from 'child_process';

const SCRIPTS_PATH = path.dirname(url.fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('请提供分支名称');
  process.exit(1);
}

execSync(`node gen-toc.js ${args.join(' ')}`, {
  stdio: 'inherit',
  cwd: SCRIPTS_PATH,
});

execSync(`node merge-redirect.js ${args.join(' ')}`, {
  stdio: 'inherit',
  cwd: SCRIPTS_PATH,
});

execSync(`pnpm vitepress build app`, {
  stdio: 'inherit',
});

execSync(`node gen-docs-version.js`, {
  stdio: 'inherit',
  cwd: SCRIPTS_PATH,
});
