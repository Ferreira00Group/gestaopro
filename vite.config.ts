import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  plugins: [
    {
      name: 'copy-root-static-assets',
      closeBundle() {
        const rootDir = process.cwd();
        const distDir = path.resolve(rootDir, 'dist');
        if (!fs.existsSync(distDir)) return;
        const files = fs.readdirSync(rootDir);
        for (const file of files) {
          if (
            file.endsWith('.js') ||
            file.endsWith('.png') ||
            file.endsWith('.json') ||
            file.endsWith('.css')
          ) {
            if (
              file === 'package.json' ||
              file === 'package-lock.json' ||
              file === 'tsconfig.json'
            ) {
              continue;
            }
            const src = path.join(rootDir, file);
            const dest = path.join(distDir, file);
            try {
              fs.copyFileSync(src, dest);
            } catch (err) {
              console.warn(`Could not copy ${file} to dist:`, err);
            }
          }
        }
      },
    },
  ],
});
