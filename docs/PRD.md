# Resume Assistant · 产品方案（PRD）

> 版本：v0.1（2026-06）。本文档同步反映规划方案与实施进度，作为下游开发与团队对齐的唯一真理源。

## 1. 愿景与目标

帮助求职者把「自己写的简历」与「目标岗位的招聘需求（JD）」对齐：

1. **建议**：基于 JD 与简历当前内容，给出五维评分（关键词覆盖 / 经历相关度 / 量化数据 / 表达专业度 / 结构规范）+ 缺口列表 + 改写草稿。
2. **生成**：让大模型把建议转成 RFC 6902 JSON Patch，前端 diff 预览后选择性应用，生成新版本，原稿保留。
3. **出件**：一键导出 PDF 或浏览器打印；中文字体精校。

差异化定位：**纯前端、BYOK、本地数据、零服务器**——部署一次终身可用，所有人都能自托管。

## 2. 用户旅程

```
打开应用 → 设置中配置大模型 → 新建简历（手填或导入 JSON）
   ↓
进入「JD 对标」→ 粘贴 JD → 看五维评分 + 关键词覆盖 + 改写建议
   ↓
勾选建议 → LLM 返回 JSON Patch → diff 预览 → 接受 → 生成新版本
   ↓
预览 → 一键下载 PDF / 浏览器打印 → 投递
   ↓（可选）
WebDAV 加密同步 → 在另一台设备拉取
```

## 3. 范围（MVP = 全功能版）

| 模块 | 功能 | 实现 Sprint |
|---|---|---|
| 工作台 | 简历列表 + 版本树 + 复制 / 删除 | S2 / S4 |
| 编辑器 | 分区块表单 + RHF + Zod + A4 预览 + 拖拽排序 + 自动保存 | S2 |
| 模板 | V1 中文优先模板（其它两套在 S7 加） | S2 / S7 |
| 设置 | LLM / WebDAV / 主题 / 数据导入导出 | S3 / S6 |
| LLM 客户端 | OpenAI 兼容 + 流式 + retry + Zod 校验 | S3 |
| JD 对标 | 关键词抽取 + 五维评分 + 雷达图 + 关键词覆盖 chip | S4 |
| 改写闭环 | 建议列表 + diff + JSON Patch 应用 + 新版本 | S4 |
| 求职信 | 抽屉式中英文生成 + Markdown 渲染 + 一键复制 | S5 |
| PDF | html2canvas-pro + jsPDF 下载；react-to-print 打印 | S5 |
| WebDAV 同步 | AES-GCM + webdav 客户端 + 冲突策略 | S6 |
| 设计升级 | huashu-design Fallback 三版 → 选定 → 固化 + 2 套额外模板 | S7 |
| 部署 | Vercel 静态部署 + README + 演示 | S8 |

## 4. 技术架构

参见 [README](../README.md) 技术栈表。补充说明：

- 路由：React Router v7 SPA + Vercel rewrites 兜底
- 状态：Zustand 主导业务状态、persist 中间件落地非敏感数据到 localStorage；敏感数据（API Key / WebDAV 凭据 / 简历正文）走 IndexedDB（Dexie）
- LLM：只信任「OpenAI 兼容 chat completions」契约；提供 DeepSeek / Qwen / Moonshot / OpenRouter / Ollama / 自托管 vLLM 的 baseURL 预设
- 图表：S4 使用 `recharts` 渲染雷达图（按路由懒加载，不进入首屏 bundle）
- 性能预算：首屏 gzip < 200KB；PDF / WebDAV / recharts 全部懒加载

## 5. 数据模型概览

详见 [`data-model.md`](./data-model.md)。

```
ResumeDocument
├── meta: { title, targetRole, language, updatedAt }
├── basics: { name, email, phone, location, summary, links[] }
├── experiences[]
├── projects[]
├── educations[]
├── skills[]            // category + items[]
├── certifications?[]
├── publications?[]
└── customSections?[]

ResumeVersion
├── id, baseResumeId, parentVersionId?, source, jdSnapshot?, createdAt
└── document: ResumeDocument

JdAnalysis
├── scores: { overall, keywords, relevance, quantified, expression, format }
├── matchedKeywords[]
├── missingKeywords[]
├── suggestions[]: { priority, target: JsonPointer, rationale, draft }
└── redFlags[]
```

## 6. 关键流程

### 6.1 JD 对标五维评分

1. 用户粘贴 JD → 本地正则 / `jieba-wasm`（懒加载）做 hard skill 词典预匹配
2. LLM 调用：`POST /chat/completions` with system prompt + 当前简历 JSON + JD 文本 → 严格 JSON 输出
3. Zod 校验 `JdAnalysis` → 失败一次自动重试 → 再失败展示 raw response 让用户重试
4. UI 渲染雷达图 + 关键词 chip + 建议卡片

### 6.2 一键改写

1. 用户勾选建议（`Suggestion.id`）
2. LLM 调用：传 selected suggestions + 简历 JSON Pointer 上下文 → 返回 `{ operations: JsonPatchOp[] }`
3. 前端用 `fast-json-patch` 干跑 patch → 在简历预览旁渲染 diff
4. 用户确认 → 真正 apply → 创建 `ResumeVersion`（parentVersionId 指向当前）→ 切到新版本

### 6.3 PDF 导出

- **路径 A**：用户点「下载 PDF」 → 懒加载 `html2canvas-pro` + `jspdf` → 截预览容器 → 多页拆分 → 命名 `{name}_{targetRole}_{YYYYMMDD}.pdf`
- **路径 B**：用户点「打印 PDF」 → `react-to-print` 调起浏览器打印对话框 → `@media print` 精调

## 7. Sprint 计划

| Sprint | 状态 | 目标 |
|---|---|---|
| **S1 基建** | DONE | Rsbuild + Tailwind v4 + shadcn 基础组件 + 路由 + i18n + 主题切换 |
| **S1 文档** | DONE | PRD / data-model / prompts / README / LICENSE |
| S2 数据 & 编辑器 | TODO | Zod schema、表单、A4 预览、自动保存、模板 V1 |
| S3 LLM 集成 | TODO | 客户端封装、设置页、连接测试 |
| S4 JD 对标 | TODO | 评分卡、关键词、建议、JSON Patch 改写、版本树 |
| S5 求职信 + PDF | TODO | 抽屉式生成、PDF 双路径、中文字体调试 |
| S6 同步 | TODO | WebDAV + AES-GCM + 冲突策略 |
| S7 设计升级 | TODO | huashu-design Fallback 三版 → 选定 → 固化 + 2 套模板 |
| S8 发布 | TODO | Vercel 部署 + README + 演示 |

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 浏览器直连大模型端点 CORS 不通 | 推荐用户用支持 CORS 的 OpenAI 兼容端点（DeepSeek / OpenRouter / 自托管 vLLM / Ollama） |
| API Key 泄露 | Key 仅在浏览器；Settings 页明显警示；可选 PBKDF2 口令加密后再持久化 |
| 中文 PDF 字体糊 | 优先 `react-to-print` 路径；`html2canvas` 路径开启 `useCORS` + 2x scale |
| LLM JSON 输出不规范 | Zod 强校验 + 一次自动重试 + 失败时显示原始响应 |
| WebDAV 各家实现差异 | 先支持坚果云 + NextCloud + 自建，提供 e2e 验证清单 |
| 体积膨胀 | Rsbuild splitChunks + 懒加载 PDF/WebDAV/recharts；首屏 < 200KB gzip |

## 9. 非目标

- ❌ 不提供云端账号体系、社交分享
- ❌ 不抓取招聘平台的 JD（更适合做浏览器扩展，超出本项目）
- ❌ 不内置「面试题练习」「岗位推荐」等求职衍生功能（避免范围蔓延）

## 10. 参考与借鉴

- [Reactive Resume](https://github.com/amruthpillai/reactive-resume)：BYOK 多供应商、JSON Patch 改写、五维评分；本项目目标是把它的核心能力搬到纯前端形态
- [olyaiy/resume-lm](https://github.com/olyaiy/resume-lm)：JD 粘贴 → 改写要点 → ATS 评分 → 多版本仪表盘
- [srbhr/Resume-Matcher](https://github.com/srbhr/Resume-Matcher)：纯 JD 适配流程、关键词高亮、ATS 匹配分
