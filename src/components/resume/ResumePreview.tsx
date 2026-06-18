import { forwardRef } from 'react';

import { getTemplate } from '@/components/templates';
import type { ResumeDocument } from '@/schema/resume';

export interface ResumePreviewProps {
  document: ResumeDocument;
  templateId?: string;
  className?: string;
}

export const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(
  ({ document, templateId, className }, ref) => {
    const template = getTemplate(templateId ?? document.meta.template);
    return (
      <div ref={ref} className={className}>
        {template.render({ document })}
      </div>
    );
  },
);
ResumePreview.displayName = 'ResumePreview';
