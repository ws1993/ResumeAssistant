import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BasicsForm } from '@/components/resume/BasicsForm';
import { ExperienceForm } from '@/components/resume/ExperienceForm';
import { ProjectForm } from '@/components/resume/ProjectForm';
import { EducationForm } from '@/components/resume/EducationForm';
import { SkillsForm } from '@/components/resume/SkillsForm';
import { ResumePreview } from '@/components/resume/ResumePreview';
import { useAutosave } from '@/hooks/useAutosave';
import { useResumeStore } from '@/stores/resumeStore';
import { db, saveResume } from '@/services/db';
import { createEmptyResume } from '@/schema/resume';
import { formatDateTime } from '@/lib/utils';

export default function EditorPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { resumeId } = useParams<{ resumeId?: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !resumeId && searchParams.get('new') === '1';
  const navigate = useNavigate();

  const current = useResumeStore((s) => s.current);
  const loading = useResumeStore((s) => s.loading);
  const load = useResumeStore((s) => s.load);
  const setStore = useResumeStore((s) => s.set);

  const { savedAt, dirty } = useAutosave(800);

  useEffect(() => {
    let mounted = true;
    async function bootstrap(): Promise<void> {
      if (resumeId) {
        await load(resumeId);
        return;
      }
      if (isNew) {
        const draft = createEmptyResume();
        await saveResume(draft);
        await load(draft.id);
        if (mounted) navigate(`/editor/${draft.id}`, { replace: true });
        return;
      }
      const first = await db.resumes.orderBy('meta.updatedAt').reverse().first();
      if (first) {
        if (mounted) navigate(`/editor/${first.id}`, { replace: true });
        return;
      }
      const draft = createEmptyResume();
      await saveResume(draft);
      if (mounted) navigate(`/editor/${draft.id}`, { replace: true });
    }
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [resumeId, isNew, load, navigate]);

  const sectionMap = useMemo(
    () =>
      [
        { key: 'basics', label: t('editor.sections.basics'), node: <BasicsForm /> },
        { key: 'experiences', label: t('editor.sections.experiences'), node: <ExperienceForm /> },
        { key: 'projects', label: t('editor.sections.projects'), node: <ProjectForm /> },
        { key: 'educations', label: t('editor.sections.educations'), node: <EducationForm /> },
        { key: 'skills', label: t('editor.sections.skills'), node: <SkillsForm /> },
      ] as const,
    [t],
  );

  if (loading || !current) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> <span className="ml-2">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_min-content]">
      <div className="space-y-4">
        <header className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="resume-title">简历名</Label>
            <Input
              id="resume-title"
              value={current.meta.title}
              onChange={(e) => setStore((doc) => (doc.meta.title = e.target.value))}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="target-role">目标岗位</Label>
            <Input
              id="target-role"
              placeholder="如：高级前端工程师"
              value={current.meta.targetRole ?? ''}
              onChange={(e) =>
                setStore((doc) => (doc.meta.targetRole = e.target.value || undefined))
              }
            />
          </div>
          <div className="pb-1 text-xs text-muted-foreground">
            {dirty ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> 保存中…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[color:var(--success)]">
                <Check className="size-3" /> {t('editor.autosaved')} · {formatDateTime(savedAt)}
              </span>
            )}
          </div>
        </header>

        <Separator />

        <Accordion type="multiple" defaultValue={['basics', 'experiences', 'projects']}>
          {sectionMap.map((s) => (
            <AccordionItem key={s.key} value={s.key}>
              <AccordionTrigger>{s.label}</AccordionTrigger>
              <AccordionContent>{s.node}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/tailor/${current.id}`)}
          >
            进入 JD 对标 →
          </Button>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-[72px] max-h-[calc(100vh-96px)] overflow-auto rounded-lg bg-muted/30 p-4">
          <ResumePreview
            document={current}
            className="origin-top-right scale-[0.62]"
          />
        </div>
      </aside>
    </div>
  );
}
