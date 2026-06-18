import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, FilePlus2, Pencil, Sparkles, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { db, deleteResumeCascade, saveResume } from '@/services/db';
import { createEmptyResume, newId, type ResumeDocument } from '@/schema/resume';
import { formatDateTime, truncate } from '@/lib/utils';

async function createNew(): Promise<ResumeDocument> {
  const draft = createEmptyResume();
  await saveResume(draft);
  return draft;
}

async function duplicate(doc: ResumeDocument): Promise<ResumeDocument> {
  const now = new Date().toISOString();
  const copy: ResumeDocument = {
    ...doc,
    id: newId(),
    meta: {
      ...doc.meta,
      title: `${doc.meta.title} · 副本`,
      createdAt: now,
      updatedAt: now,
    },
  };
  await saveResume(copy);
  return copy;
}

export default function Dashboard(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const resumes = useLiveQuery(
    async () => db.resumes.orderBy('meta.updatedAt').reverse().toArray(),
    [],
    [],
  );
  const versionsCount = useLiveQuery(async () => {
    if (!resumes?.length) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const r of resumes) {
      counts[r.id] = await db.versions.where('baseResumeId').equals(r.id).count();
    }
    return counts;
  }, [resumes ?? []], {} as Record<string, number>);

  const onCreate = async (): Promise<void> => {
    const draft = await createNew();
    navigate(`/editor/${draft.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <Button onClick={onCreate}>
          <FilePlus2 className="size-4" /> {t('dashboard.createResume')}
        </Button>
      </div>

      {!resumes?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.noResumes')}</CardTitle>
            <CardDescription>
              先到「<Link to="/settings" className="underline">设置</Link>」配置大模型，然后回这里新建。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onCreate}>
              <FilePlus2 className="size-4" /> 从空白模板开始
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resumes.map((r) => (
            <Card key={r.id} className="group transition hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="truncate" title={r.meta.title}>
                    {r.meta.title}
                  </CardTitle>
                  <Badge variant="secondary">v{versionsCount[r.id] ?? 0}</Badge>
                </div>
                <CardDescription>
                  {r.meta.targetRole ? `目标：${r.meta.targetRole}` : '未设置目标岗位'}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <div>{t('dashboard.lastEdited', { date: formatDateTime(r.meta.updatedAt) })}</div>
                {r.basics.summary ? (
                  <div className="mt-2 line-clamp-2 text-foreground/80">{truncate(r.basics.summary, 120)}</div>
                ) : null}
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm" asChild>
                  <Link to={`/editor/${r.id}`}>
                    <Pencil className="size-3.5" /> 编辑
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/tailor/${r.id}`}>
                    <Sparkles className="size-3.5" /> 对标
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    const copy = await duplicate(r);
                    navigate(`/editor/${copy.id}`);
                  }}
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-destructive hover:text-destructive"
                  onClick={async () => {
                    if (confirm(`确认删除「${r.meta.title}」及其所有版本？`)) {
                      await deleteResumeCascade(r.id);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
