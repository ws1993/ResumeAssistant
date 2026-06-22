# JD 对标功能优化技术方案

## 一、现状分析

### 已有功能
- ✅ 基础 JD 匹配（输入 JD 和简历，返回总分）
- ✅ 6 维度评分体系（overall, keywords, relevance, quantified, expression, format）
- ✅ 雷达图可视化（RadarChart 组件）
- ✅ 关键词覆盖分析（matchedKeywords, missingKeywords）
- ✅ 改写建议生成（suggestions with target/rationale/draft）

### 架构现状
**前端：**
- 路由：`src/routes/Tailor.tsx`
- 组件：`ScoreCard.tsx`、`RadarChart.tsx`、`KeywordCoverage.tsx`
- 数据流：Zustand store (`tailorStore`) 管理状态

**后端：**
- 核心服务：`src/services/llm/analyzeJd.ts`
- Schema：`src/schema/jdAnalysis.ts`
- Prompt：`src/services/llm/prompts.ts`

### 待优化点
1. **多维度评分**：现有 6 维度 → 扩展为 14+ 子维度（技能匹配、经验匹配、技术深度等）
2. **技能证明链**：缺失技能追溯功能 → 需要新增技能与经历的关联分析
3. **实时匹配**：编辑后需手动重新分析 → 需要增量更新机制

---

## 二、优化目标（P0 核心功能）

### 功能 1：多维度评分体系
**目标：** 将现有 6 维度扩展为 14 维度，提供更细粒度的分析

#### 新增维度设计
```typescript
// 扩展 Scores 类型
interface DetailedScores extends Scores {
  // 简历维度（基于研究报告）
  skillsMatch: number;        // 技能匹配度
  experienceMatch: number;    // 经验匹配度
  technicalDepth: number;     // 技术深度
  industryAlignment: number;  // 行业契合度
  educationMatch: number;     // 教育背景匹配
  quantifiedImpact: number;   // 量化成果（细化原 quantified）
  toneSeniority: number;      // 语言语气与资历匹配
  
  // ATS 优化维度
  atsCompatibility: number;   // ATS 兼容性
}
```

#### 前端改造
- 保留雷达图显示核心 5-6 维度
- 新增"详细评分"展开面板，显示全部 14 维度
- 每个维度提供悬停提示（tooltip）解释计分逻辑

#### 后端改造
- 修改 `analyzeJdMessages` prompt，要求 LLM 输出扩展的维度
- `postProcess` 函数增加本地计算逻辑（如 ATS 兼容性检测）
- 保持向后兼容：如果 LLM 未返回新维度，使用默认值

---

### 功能 2：技能证明链
**目标：** 为每个技能标记证明强度，并支持点击定位到简历段落

#### 数据结构设计
```typescript
// 新增 Schema
interface SkillEvidence {
  skill: string;                // 技能名称
  strength: 0 | 1 | 2 | 3 | 4 | 5; // 证明强度（星级）
  sources: SkillSource[];       // 证明来源
  status: 'strong' | 'weak' | 'missing'; // 状态
  recommendation?: string;      // 改进建议
}

interface SkillSource {
  type: 'experience' | 'project' | 'education' | 'skills';
  path: string;                 // JSON Pointer (如 "/experiences/0")
  excerpt: string;              // 相关文本片段（用于预览）
  relevance: number;            // 相关性分数 0-1
}

// 扩展 JdAnalysis
interface JdAnalysis {
  // ... 现有字段
  skillsEvidence: SkillEvidence[]; // 新增
}
```

#### 交互设计
**UI 布局：**
```
┌─────────────────────────────────┐
│ 技能证明链                       │
├─────────────────────────────────┤
│ ✅ React (★★★★★) 强证明         │
│   └─ 📍 2 个工作经验 + 1 个项目  │  ← 点击展开详情
│                                  │
│ ⚠️ TypeScript (★★☆☆☆) 弱证明   │
│   └─ 📍 仅在技能列表提及         │
│   💡 建议：在项目中补充 TS 细节  │  ← 显示改进建议
│                                  │
│ ❌ GraphQL (☆☆☆☆☆) 无证明       │
│   💡 建议：补充相关项目或移除    │
└─────────────────────────────────┘
```

**点击定位逻辑：**
- 用户点击某个技能 → 触发事件传递 `path`（JSON Pointer）
- 使用 `postMessage` 或路由参数跳转到编辑器页面
- 编辑器根据 `path` 滚动到对应段落并高亮

#### 后端实现
**阶段 1（MVP）：** LLM 一次性分析所有技能证明
```typescript
// 扩展 analyzeJd 函数
export async function analyzeJd(
  settings: LlmSettings,
  opts: AnalyzeJdOptions,
): Promise<{ analysis: JdAnalysis; raw: string }> {
  // ... 现有逻辑
  
  // 新增：提取 JD 中的技能需求
  const requiredSkills = extractSkillsFromJd(opts.jd);
  
  // 新增：分析每个技能的证明来源
  const skillsEvidence = await analyzeSkillsEvidence(
    settings,
    opts.resume,
    requiredSkills,
  );
  
  return {
    analysis: { ...data, skillsEvidence },
    raw,
  };
}

// 新增函数：技能证明分析
async function analyzeSkillsEvidence(
  settings: LlmSettings,
  resume: ResumeDocument,
  skills: string[],
): Promise<SkillEvidence[]> {
  // 使用 LLM 分析每个技能在简历中的证明
  // Prompt 示例：
  // "给定技能 'React'，在简历 JSON 中找到所有证明该技能的段落，
  //  返回 JSON Pointer 路径和相关性分数"
}
```

**阶段 2（优化）：** 本地规则 + LLM 补充
- 先用正则/NLP 快速匹配技能关键词定位段落
- LLM 仅负责评估相关性和生成建议（减少 API 调用）

---

### 功能 3：实时匹配分数更新
**目标：** 编辑简历时，动态更新与 JD 的匹配分数（无需手动重新分析）

#### 技术挑战
- 完整 LLM 分析耗时长（10-30 秒）
- 频繁调用 API 成本高
- 用户期望「所见即所得」的体验

#### 解决方案：混合计算模式

**模式 1：轻量级本地计算（实时）**
```typescript
// 新增：快速评分引擎（纯前端）
export function quickScore(
  resume: ResumeDocument,
  jd: string,
  baseAnalysis?: JdAnalysis, // 上一次完整分析结果
): Partial<Scores> {
  const resumeText = flattenResumeText(resume);
  const jdKeywords = extractDictionaryTerms(jd);
  
  // 仅计算可快速量化的维度
  const keywordsScore = calculateKeywordCoverage(resumeText, jdKeywords);
  const quantifiedScore = countQuantifiedBullets(resume);
  const formatScore = checkFormatCompliance(resume);
  
  // 其他维度沿用上次 LLM 分析结果（如果有）
  return {
    keywords: keywordsScore,
    quantified: quantifiedScore,
    format: formatScore,
    relevance: baseAnalysis?.scores.relevance ?? 50, // 保留
    expression: baseAnalysis?.scores.expression ?? 50, // 保留
  };
}
```

**模式 2：防抖 + 增量分析（延迟）**
```typescript
// 编辑器中使用 debounce
const debouncedAnalyze = useMemo(
  () =>
    debounce(async (resume: ResumeDocument) => {
      // 用户停止编辑 3 秒后触发完整分析
      const result = await analyzeJd(llm, { jd, resume });
      setAnalysis(result.analysis);
    }, 3000),
  [llm, jd],
);

// 监听简历变化
useEffect(() => {
  if (!resume) return;
  
  // 立即更新快速分数
  const quickScores = quickScore(resume, jd, analysis);
  setQuickScores(quickScores);
  
  // 延迟触发完整分析
  debouncedAnalyze(resume);
}, [resume, jd, analysis, debouncedAnalyze]);
```

**UI 状态设计：**
```tsx
<ScoreCard
  scores={quickScores}          // 实时本地计算
  loading={isAnalyzing}         // 完整分析进行中
  lastAnalyzedAt={analyzedAt}   // 上次完整分析时间
  onRefresh={() => analyzeJd()} // 手动刷新按钮
/>
```

**状态指示器：**
```
┌─────────────────────────────┐
│ 对标评分  72 ⚡              │ ← ⚡ 表示实时计算（不完整）
│ 上次完整分析：2 分钟前       │
│ [🔄 重新完整分析]            │
└─────────────────────────────┘
```

---

## 三、实施计划

### 阶段 1：后端扩展（第 1-2 周）
**任务：**
1. 扩展 `scoresSchema`，添加 8 个新维度
2. 修改 `analyzeJdMessages` prompt，要求 LLM 输出扩展维度
3. 实现 `analyzeSkillsEvidence` 函数（技能证明链分析）
4. 实现 `quickScore` 函数（本地快速评分）
5. 编写单元测试

**交付物：**
- `src/schema/jdAnalysis.ts` 新增 `DetailedScores` 和 `SkillEvidence` 类型
- `src/services/llm/analyzeJd.ts` 支持技能证明分析
- `src/lib/quickScore.ts` 本地评分引擎

---

### 阶段 2：前端 UI 实现（第 3-4 周）
**任务：**
1. 重构 `ScoreCard` 组件，支持 14 维度展示
2. 新增 `SkillEvidenceCard` 组件
3. 实现点击技能定位到简历段落的交互
4. 实现实时评分更新（debounce + 快速计算）
5. 优化加载状态和错误处理

**交付物：**
- `src/components/tailor/ScoreCard.tsx` 支持详细评分展开
- `src/components/tailor/SkillEvidenceCard.tsx` 新组件
- `src/components/tailor/DetailedScoresPanel.tsx` 14 维度面板
- 实时评分 Hook：`src/hooks/useRealtimeScore.ts`

---

### 阶段 3：集成与优化（第 5 周）
**任务：**
1. 数据结构迁移（确保老数据兼容）
2. 性能优化（减少不必要的重新渲染）
3. 用户测试与反馈收集
4. 文档更新

**交付物：**
- 完整功能可用
- 性能指标达标（实时评分 < 100ms，完整分析 < 15s）
- 用户文档和开发文档

---

## 四、技术细节

### 4.1 数据结构兼容性
**问题：** 现有数据库中的 `JdAnalysis` 没有新字段

**解决方案：**
```typescript
// 在 postProcess 中提供默认值
function postProcess(
  analysis: JdAnalysis,
  jdText: string,
  resume: ResumeDocument,
): JdAnalysis {
  // 兼容旧数据
  const skillsEvidence = analysis.skillsEvidence ?? [];
  const detailedScores = {
    ...analysis.scores,
    skillsMatch: analysis.scores.keywords, // 降级
    experienceMatch: analysis.scores.relevance,
    // ... 其他默认值
  };
  
  return {
    ...analysis,
    scores: detailedScores,
    skillsEvidence,
  };
}
```

### 4.2 性能优化策略
**本地快速评分：**
- 使用 Web Worker 运行 `quickScore`（避免阻塞主线程）
- 缓存 JD 提取的关键词（避免重复解析）

**LLM 调用优化：**
- 技能证明分析可以异步加载（不阻塞主评分）
- 使用 streaming 模式（如果 LLM 支持）逐步返回结果

### 4.3 交互体验优化
**加载状态：**
```tsx
{phase === 'analyzing' && (
  <div className="flex items-center gap-2">
    <Loader2 className="animate-spin" />
    <span>正在分析... (1/3 基础评分)</span>
  </div>
)}
```

**骨架屏：**
- 显示维度名称，分数位置显示占位符
- 避免突然的布局跳动

---

## 五、风险与应对

### 风险 1：LLM 输出不稳定
**描述：** 新增维度可能导致 LLM 输出格式错误或遗漏字段

**应对：**
- Schema 中所有新字段设为 `optional`
- 提供降级逻辑（使用旧维度推算新维度）
- 增加输出验证和错误重试

### 风险 2：实时评分不准确
**描述：** 本地快速评分可能与完整 LLM 分析差异较大

**应对：**
- UI 明确标识"快速评分"与"完整分析"
- 提供手动刷新按钮
- 记录差异数据，持续优化本地算法

### 风险 3：技能定位失败
**描述：** JSON Pointer 可能因数据结构变化失效

**应对：**
- 实现容错机制（路径不存在时显示友好提示）
- 使用模糊匹配定位相似内容
- 记录失败案例用于优化

---

## 六、验收标准

### 功能验收
- [ ] 14 维度评分正确显示，且与研究报告定义一致
- [ ] 技能证明链能准确定位到简历段落
- [ ] 点击技能能跳转到编辑器并高亮
- [ ] 实时评分在编辑后 1 秒内更新
- [ ] 完整分析在 15 秒内完成

### 性能验收
- [ ] 快速评分执行时间 < 100ms
- [ ] 页面交互流畅，无明显卡顿
- [ ] LRU 缓存命中率 > 60%

### 兼容性验收
- [ ] 老数据库记录能正常加载并显示
- [ ] 不同 LLM 提供商（OpenAI/Anthropic/本地）均可用
- [ ] 移动端布局适配

---

## 七、后续扩展（P1 优先级）

基于本次优化的架构，后续可快速实现：

1. **文件级 ATS 检查器**：读取导出的 DOCX，检测 ATS 兼容性
2. **公司特定题库**：基于技能证明链生成针对性面试问题
3. **Chrome 扩展**：复用评分引擎，在招聘网站直接分析
4. **进度仪表板**：聚合历史分析数据，展示提升曲线

---

**文档版本：** v1.0  
**创建时间：** 2026-06-22  
**作者：** Claude Code  
**预计开发周期：** 5 周  
