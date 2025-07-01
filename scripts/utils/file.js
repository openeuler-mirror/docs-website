import path from 'path';
import fs from 'fs';

export function copyDirectorySync(sourceDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.readdirSync(sourceDir, { withFileTypes: true }).forEach((item) => {
    const sourcePath = path.join(sourceDir, item.name);
    const targetPath = path.join(destDir, item.name);

    if (item.isDirectory()) {
      copyDirectorySync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}
