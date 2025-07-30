import { exec } from 'child_process';

import NEW_VERSONS from './config/new-version.js';

function execCommand(command) {
  return new Promise((resolve, reject) => {
    const child = exec(command, {
      inherit: true,
    });

    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);

    child.on('close', (code) => {
      resolve(code);
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

(async () => {
  let versions = process.argv.slice(2);
  if (versions.length === 0) {
    versions = NEW_VERSONS;
  }

  await execCommand(`pnpm pre-dev ${versions.join(' ')}`);
  await execCommand(`pnpm gen-toc ${versions.join(' ')}`);
  await execCommand(`pnpm dev`);
})();
