// next.config.mjs
import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';

// Получаем путь к текущей директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Эта настройка решает проблему с модулем 'fs'
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Этот плагин скопирует необходимые файлы для tesseract.js
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.join(
              __dirname,
              'node_modules/tesseract.js/dist/worker.min.js'
            ),
            to: path.join(__dirname, 'public/'),
          },
          {
            from: path.join(
              __dirname,
              'node_modules/tesseract.js-core/tesseract-core.wasm'
            ),
            to: path.join(__dirname, 'public/'),
          },
          {
            from: path.join(__dirname, 'node_modules/tessdata-rus/'),
            to: path.join(__dirname, 'public/tessdata/'),
          },
        ],
      })
    );
    
    return config;
  },
};

export default nextConfig;
