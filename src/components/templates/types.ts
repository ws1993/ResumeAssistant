import type { ResumeDocument } from '@/schema/resume';

export interface ResumeTemplateDefinition {
  id: string;
  label: string;
  description: string;
  render: (props: { document: ResumeDocument }) => React.ReactNode;
}
