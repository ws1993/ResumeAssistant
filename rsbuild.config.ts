import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import path from 'node:path';

export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss()],
  html: {
    title: 'Resume Assistant · AI 简历助手',
    meta: {
      description: 'BYOK 大模型简历助手：JD 对标分析、一键改写、PDF 导出，数据本地保存。',
      viewport: 'width=device-width, initial-scale=1.0',
    },
    favicon: './public/icons/favicon.svg',
  },
  source: {
    entry: { index: './src/main.tsx' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  output: {
    distPath: { root: 'dist' },
    cleanDistPath: true,
    sourceMap: { js: 'source-map' },
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
    },
  },
  server: {
    port: 5273,
  },
});
