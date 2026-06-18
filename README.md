# Resume Assistant · AI 简历助手

> 对标招聘需求、重写你的故事。BYOK 大模型 + 纯前端 + 本地数据持久化，部署一次终身可用。

## 特性

- **JD 对标分析（S4）**：粘贴招聘需求 → 五维评分（关键词覆盖 / 经历相关度 / 量化数据 / 表达专业度 / 结构规范）+ 关键词命中/缺失可视化 + 雷达图。
- **一键改写（S4）**：LLM 返回 RFC 6902 JSON Patch，diff 预览后选择性应用，自动产出新版本，原稿保留。
- **求职信生成（S5）**：基于当前简历版本 + JD，输出中/英文求职信。
- **PDF 导出（S5）**：`html2canvas-pro` + `jsPDF` 一键下载；同时支持 `react-to-print` 浏览器原生打印（中文体验更佳）。
- **数据 100% 本地（S2）**：Dexie + IndexedDB 持久化，关闭浏览器也不丢，导入导出 JSON。
- **可选 WebDAV 同步（S6）**：AES-GCM 客户端加密 → 推送到坚果云 / NextCloud / 自建服务，无服务器依赖。
- **BYOK 大模型（S3）**：单一 OpenAI 兼容入口，支持 DeepSeek / Qwen / Moonshot / OpenRouter / Ollama / 自托管。
- **中文优先 + i18n 预留**：UI 默认中文，已埋好 `en` 命名空间，未来无缝切换。

## 技术栈

| 层     | 选型                                                   |
| ------ | ------------------------------------------------------ |
| 构建   | [Rsbuild](https://rsbuild.rs/) + React 19 + TypeScript    |
| 样式   | Tailwind CSS v4 + shadcn/ui（New York 风格）           |
| 状态   | Zustand + Immer                                        |
| 表单   | React Hook Form + Zod                                  |
| 存储   | Dexie.js（IndexedDB）                                  |
| 路由   | React Router v7                                        |
| LLM    | `openai` 兼容 SDK（用户自配置 baseURL/apiKey/model） |
| PDF    | `html2canvas-pro` + `jsPDF` + `react-to-print`   |
| WebDAV | `webdav` (browser build) + WebCrypto AES-GCM         |

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:5273](http://localhost:5273) 即可。

> 当前进度：**S1 基建已完成**（Rsbuild + Tailwind v4 + shadcn 基础组件 + 路由 + i18n + 主题切换）。后续 Sprint 见 [`docs/PRD.md`](./docs/PRD.md)。

## 脚本

| 命令                | 说明                            |
| ------------------- | ------------------------------- |
| `npm run dev`     | 启动开发服务器（默认端口 5273） |
| `npm run build`   | 生产构建，输出到 `dist/`      |
| `npm run preview` | 预览生产构建                    |
| `npm run check`   | TypeScript 类型检查             |
| `npm run format`  | Prettier 格式化                 |

## 部署到 Vercel

仓库根目录已提供 [`vercel.json`](./vercel.json)。将本项目推到 GitHub 后到 Vercel 选择「Other / No framework preset」，构建命令 `npm run build`、输出目录 `dist`，无需任何环境变量。

## 文档

- [PRD（产品方案）](./docs/PRD.md)
- [数据模型](./docs/data-model.md)
- [提示词版本日志](./docs/prompts.md)

## 安全

API Key 与 WebDAV 凭据仅保存在你的浏览器本地（localStorage / IndexedDB），不会上传到任何第三方服务器。WebDAV 同步前会用你设定的口令通过 PBKDF2 派生密钥 + AES-GCM 加密整库快照。

## 友联

[LINUX DO - 新的理想型社区](https://linux.do/)

## 许可证

[MIT](./LICENSE)
