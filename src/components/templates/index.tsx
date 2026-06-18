import { GeistBTemplate } from './GeistB';
import { NotionCTemplate } from './NotionC';
import { PaperATemplate } from './PaperA';
import type { ResumeTemplateDefinition } from './types';

export const TEMPLATES: ResumeTemplateDefinition[] = [
  {
    id: 'paper-a',
    label: '纸张 · 标准黑白',
    description: '中文招聘市场友好的紧凑版式，全黑标题线 + 单列布局。',
    render: ({ document }) => <PaperATemplate document={document} />,
  },
  {
    id: 'geist-b',
    label: '极简 · 暗色 Geist',
    description: '深色背景 + 高对比度排版，适合技术岗 / 海外求职。',
    render: ({ document }) => <GeistBTemplate document={document} />,
  },
  {
    id: 'notion-c',
    label: '文档 · 左栏双列',
    description: '左侧技能/教育/证书，右侧经历/项目，适合内容丰富的候选人。',
    render: ({ document }) => <NotionCTemplate document={document} />,
  },
];

export function getTemplate(id: string): ResumeTemplateDefinition {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
