import { PaperATemplate } from './PaperA';
import type { ResumeTemplateDefinition } from './types';

export const TEMPLATES: ResumeTemplateDefinition[] = [
  {
    id: 'paper-a',
    label: '纸张 · 标准黑白',
    description: '中文招聘市场友好的紧凑版式，全黑标题线 + 单列布局。',
    render: ({ document }) => <PaperATemplate document={document} />,
  },
];

export function getTemplate(id: string): ResumeTemplateDefinition {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
