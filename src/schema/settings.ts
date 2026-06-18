import { z } from 'zod';

export const llmPresetIdSchema = z.enum([
  'openai',
  'deepseek',
  'qwen',
  'moonshot',
  'openrouter',
  'ollama',
  'custom',
]);

export const llmSettingsSchema = z.object({
  baseURL: z.string().url('请输入合法的 Base URL'),
  apiKey: z.string().min(1, '请填写 API Key'),
  model: z.string().min(1, '请填写模型名'),
  temperature: z.number().min(0).max(2).default(0.4),
  timeoutMs: z.number().int().positive().default(60000),
  maxRetries: z.number().int().min(0).max(5).default(1),
  presetId: llmPresetIdSchema.default('custom'),
});

export const webdavSettingsSchema = z.object({
  endpoint: z.string().url('请输入合法的 WebDAV 地址'),
  username: z.string().min(1),
  password: z.string().min(1),
  remotePath: z.string().default('/resume-assistant'),
  passphrase: z.string().optional(),
  lastSyncedAt: z.string().optional(),
});

export type LlmPresetId = z.infer<typeof llmPresetIdSchema>;
export type LlmSettings = z.infer<typeof llmSettingsSchema>;
export type WebDAVSettings = z.infer<typeof webdavSettingsSchema>;

export interface LlmPreset {
  id: LlmPresetId;
  label: string;
  baseURL: string;
  defaultModel: string;
  note?: string;
}

export const LLM_PRESETS: LlmPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    note: '建议使用 deepseek-chat 或 deepseek-reasoner',
  },
  {
    id: 'qwen',
    label: '通义千问（DashScope 兼容模式）',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
  },
  {
    id: 'moonshot',
    label: 'Moonshot AI',
    baseURL: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
  },
  {
    id: 'ollama',
    label: '本地 Ollama',
    baseURL: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:7b',
    note: '需在 Ollama 启动后访问；浏览器需允许跨域',
  },
  {
    id: 'custom',
    label: '自定义',
    baseURL: '',
    defaultModel: '',
  },
];

export function defaultLlmSettings(): LlmSettings {
  return {
    baseURL: '',
    apiKey: '',
    model: '',
    temperature: 0.4,
    timeoutMs: 60000,
    maxRetries: 1,
    presetId: 'custom',
  };
}

export function defaultWebDAVSettings(): WebDAVSettings {
  return {
    endpoint: '',
    username: '',
    password: '',
    remotePath: '/resume-assistant',
  };
}
