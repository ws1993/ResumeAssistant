/**
 * 轻量本地关键词抽取。
 * - 不依赖 jieba，体积极小
 * - 使用「技术词典」精确匹配（覆盖主流技术栈）
 * - 用作 LLM 抽取的兑底，避免漏抽常见硬技能
 */

const TECH_TERMS: string[] = [
  // 编程语言
  'Java', 'Kotlin', 'Scala', 'Go', 'Golang', 'Rust', 'Python', 'TypeScript', 'JavaScript',
  'Node.js', 'Node', 'Ruby', 'PHP', 'C++', 'C#', 'Swift', 'Objective-C', 'R', 'Lua', 'Dart',
  // 前端框架
  'React', 'React.js', 'Vue', 'Vue.js', 'Vue3', 'Vue2', 'Angular', 'Svelte', 'SolidJS', 'Solid',
  'Next.js', 'Nuxt', 'Nuxt.js', 'Remix', 'Astro', 'Gatsby', 'Qwik',
  // 移动
  'iOS', 'Android', 'Flutter', 'React Native', 'Compose', 'SwiftUI', 'Jetpack', 'Hybrid',
  // 后端框架
  'Spring', 'Spring Boot', 'SpringCloud', 'Django', 'Flask', 'FastAPI', 'Express', 'Koa',
  'NestJS', 'Nest', 'Gin', 'Echo', 'Fiber', 'Laravel', 'Symfony', 'Rails',
  // 数据库
  'MySQL', 'PostgreSQL', 'PG', 'Postgres', 'MongoDB', 'Redis', 'Elasticsearch', 'ES',
  'TiDB', 'ClickHouse', 'CK', 'Snowflake', 'DuckDB', 'Cassandra', 'HBase', 'DynamoDB',
  'SQLite', 'Oracle', 'SQL Server', 'MariaDB', 'Memcached',
  // 消息队列 / 流
  'Kafka', 'RabbitMQ', 'Pulsar', 'RocketMQ', 'NATS', 'NSQ',
  // DevOps / Cloud
  'Docker', 'Kubernetes', 'K8s', 'Helm', 'Istio', 'Service Mesh', 'Terraform', 'Ansible',
  'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI', 'ArgoCD',
  'AWS', 'GCP', 'Azure', 'Aliyun', '阿里云', '腾讯云', 'TKE', 'EKS', 'ECS',
  // 观测
  'Prometheus', 'Grafana', 'Loki', 'Jaeger', 'OpenTelemetry', 'OTel', 'Datadog', 'Sentry',
  // 大数据 / AI
  'Spark', 'Flink', 'Hadoop', 'Hive', 'Airflow', 'DBT', 'Iceberg', 'Hudi',
  'PyTorch', 'TensorFlow', 'JAX', 'LangChain', 'LlamaIndex', 'RAG', 'Embedding', 'Embeddings',
  'Vector', 'Vector DB', 'Pinecone', 'Milvus', 'Weaviate', 'FAISS',
  // 前端工程化
  'Webpack', 'Vite', 'Rspack', 'Rsbuild', 'esbuild', 'Rollup', 'Parcel', 'Turbopack',
  'Tailwind', 'Tailwind CSS', 'shadcn', 'shadcn/ui', 'Sass', 'Less', 'Stylus', 'CSS Modules',
  'Storybook', 'Jest', 'Vitest', 'Playwright', 'Cypress',
  // 协议 / 网络
  'GraphQL', 'gRPC', 'WebSocket', 'WebRTC', 'WebGL', 'WebGPU', 'OAuth', 'OAuth2', 'JWT', 'SSO',
  'HTTP/2', 'HTTP/3', 'QUIC', 'HTTPS', 'TLS',
  // 协作 / 流程
  'Git', 'GitHub', 'GitLab', 'Jira', 'Confluence', 'Figma', 'Notion',
  'Scrum', 'Agile', '敏捷', '看板', 'OKR', 'KPI',
  // 通用 / 软技能
  '团队协作', '跨部门协作', '需求评审', '架构设计', '系统设计',
  '性能优化', '高并发', '微服务', '中台', '前端', '后端', '全栈', '运维',
];

const NORMALIZED = new Map<string, string>();
for (const term of TECH_TERMS) NORMALIZED.set(term.toLowerCase(), term);

const STOP_TOKENS = new Set([
  'and', 'or', 'the', 'of', 'with', 'for', 'in', 'on', 'to', 'a', 'an', 'is', 'are', 'be',
]);

export interface ExtractedKeyword {
  term: string;
  count: number;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 从 JD 文本中找出所有出现的「技术词典」词条。 */
export function extractDictionaryTerms(text: string): ExtractedKeyword[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const counts = new Map<string, number>();

  for (const [needleLower, original] of NORMALIZED) {
    if (STOP_TOKENS.has(needleLower)) continue;
    const re = new RegExp(`(?:^|[^a-zA-Z0-9_+#./-])${escapeRegExp(needleLower)}(?=$|[^a-zA-Z0-9_+#./-])`, 'g');
    const matches = lower.match(re);
    if (matches?.length) counts.set(original, (counts.get(original) ?? 0) + matches.length);
  }

  return Array.from(counts.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count);
}

/** 简单粗暴：把简历 JSON 的所有字符串 join 起来用于关键词存在性判断。 */
export function flattenResumeText(value: unknown): string {
  const buf: string[] = [];
  const walk = (v: unknown): void => {
    if (v == null) return;
    if (typeof v === 'string') buf.push(v);
    else if (typeof v === 'number' || typeof v === 'boolean') buf.push(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(value);
  return buf.join('\n');
}

/** 在简历文本中统计某个 term 的出现次数（大小写不敏感）。 */
export function countOccurrences(haystack: string, term: string): number {
  if (!term) return 0;
  const re = new RegExp(`(?:^|[^a-zA-Z0-9_+#./-])${escapeRegExp(term)}(?=$|[^a-zA-Z0-9_+#./-])`, 'gi');
  return haystack.match(re)?.length ?? 0;
}
