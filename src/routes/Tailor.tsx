import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { History, Loader2, Mail, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CoverLetterDrawer } from '@/components/tailor/CoverLetterDrawer';
import { KeywordCoverage } from '@/components/tailor/KeywordCoverage';
import { PatchPreviewDialog } from '@/components/tailor/PatchPreviewDialog';
import { ScoreCard } from '@/components/tailor/ScoreCard';
import { SkillEvidenceCard } from '@/components/tailor/SkillEvidenceCard';
import { SuggestionCard } from '@/components/tailor/SuggestionCard';
import { previewPatch, applyPatchSafe, type PatchPreview } from '@/lib/jsonPatch';
import { formatDateTime } from '@/lib/utils';
import { db, saveResume } from '@/services/db';
import { analyzeJd } from '@/services/llm/analyzeJd';
import { generatePatch } from '@/services/llm/suggest';
import { LlmError } from '@/services/llm/retry';
import { createVersion, listVersions, saveAnalysis } from '@/services/versions';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTailorStore } from '@/stores/tailorStore';
import { toast } from '@/stores/toastStore';
import type { JdSnapshot, ResumeDocument } from '@/schema/resume';
import type { JsonPatchOp, RewriteResult } from '@/schema/patches';

export default function TailorPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { resumeId } = useParams<{ resumeId?: string }>();
  const llm = useSettingsStore((s) => s.llm);
  const tailor = useTailorStore();

  const [resume, setResume] = useState<ResumeDocument | undefined>(undefined);
  const versions = useLiveQuery(
    async () => (resumeId ? listVersions(resumeId) : []),
    [resumeId],
    [],
  );

  const [previewState, setPreviewState] = useState<{
    open: boolean;
    previews: PatchPreview[];
    patch?: RewriteResult;
    nextDocument?: ResumeDocument;
    error?: string;
    applying?: boolean;
  }>({ open: false, previews: [] });

  const [coverOpen, setCoverOpen] = useState(false);

  useEffect(() => {
    if (!resumeId) {
      void (async () => {
        const first = await db.resumes.orderBy('meta.updatedAt').reverse().first();
        if (first) navigate(`/tailor/${first.id}`, { replace: true });
      })();
      return;
    }
    void db.resumes.get(resumeId).then((doc) => setResume(doc));
  }, [resumeId, navigate]);

  const selectedSuggestions = useMemo(() => {
    if (!tailor.analysis) return [];
    return tailor.analysis.suggestions.filter((s) => tailor.selectedIds.has(s.id));
  }, [tailor.analysis, tailor.selectedIds]);

  const llmReady = Boolean(llm.baseURL && llm.apiKey && llm.model);

  const onAnalyze = async (): Promise<void> => {
    if (!resume) return;
    if (!llmReady) {
      toast({ title: '请先在设置中配置大模型', variant: 'warning' });
      navigate('/settings');
      return;
    }
    if (!tailor.jd.trim()) {
      toast({ title: '请粘贴 JD 后再分析', variant: 'warning' });
      return;
    }
    tailor.setPhase('analyzing');
    try {
      const { analysis, raw } = await analyzeJd(llm, { jd: tailor.jd, resume });
      tailor.setAnalysis(analysis, raw);
      toast({
        title: `已分析完成（${Math.round(analysis.scores.overall)} 分）`,
        variant: 'success',
      });
    } catch (err) {
      const msg = err instanceof LlmError ? err.message : String(err);
      tailor.setPhase('error', msg);
      toast({ title: '分析失败', description: msg, variant: 'error', durationMs: 8000 });
    }
  };

  const onPreviewApply = async (): Promise<void> => {
    if (!resume || !tailor.analysis) return;
    if (!selectedSuggestions.length) {
      toast({ title: '请至少选择一条建议', variant: 'warning' });
      return;
    }
    tailor.setPhase('suggesting');
    try {
      const { result } = await generatePatch(llm, {
        resume,
        jd: tailor.jd,
        suggestions: selectedSuggestions,
      });
      const { previews, result: nextDocument, error } = previewPatch(
        resume,
        result.operations as JsonPatchOp[],
      );
      tailor.setPhase('analyzed');
      setPreviewState({
        open: true,
        previews,
        patch: result,
        nextDocument,
        error,
      });
    } catch (err) {
      const msg = err instanceof LlmError ? err.message : String(err);
      tailor.setPhase('error', msg);
      toast({ title: '生成改写失败', description: msg, variant: 'error', durationMs: 8000 });
    }
  };

  const onConfirmApply = async (): Promise<void> => {
    if (!resume || !previewState.patch) return;
    setPreviewState((s) => ({ ...s, applying: true }));
    try {
      const nextDoc =
        previewState.nextDocument ?? applyPatchSafe(resume, previewState.patch.operations);

      const baseResumeId = resume.id;

      const archived = await createVersion({
        baseResumeId,
        source: 'manual',
        document: resume,
        note: '改写前快照',
      });

      const jdSnapshot: JdSnapshot = {
        jdText: tailor.jd,
        company: tailor.company,
        industry: tailor.industry,
        collectedAt: new Date().toISOString(),
      };

      const updated: ResumeDocument = {
        ...nextDoc,
        meta: { ...nextDoc.meta, updatedAt: new Date().toISOString() },
      };
      await saveResume(updated);
      setResume(updated);

      const tailorVersion = await createVersion({
        baseResumeId,
        parentVersionId: archived.id,
        source: 'jd-tailor',
        document: updated,
        jdSnapshot,
        note: `按 JD 改写（${selectedSuggestions.length} 条建议）`,
      });

      if (tailor.analysis) {
        await saveAnalysis(tailor.analysis, {
          versionId: tailorVersion.id,
          baseResumeId,
        });
      }

      toast({ title: '已应用改写并生成新版本', variant: 'success' });
      tailor.clearSelected();
      setPreviewState({ open: false, previews: [] });
    } catch (err) {
      toast({ title: '应用失败', description: String(err), variant: 'error' });
    } finally {
      setPreviewState((s) => ({ ...s, applying: false }));
    }
  };

  // 技能证明定位处理：跳转到编辑页并传递路径参数
  const onLocateSkill = (path: string): void => {
    if (!resumeId) return;
    // 将路径编码后通过URL参数传递到编辑器
    const encodedPath = encodeURIComponent(path);
    navigate(`/editor/${resumeId}?highlight=${encodedPath}`);
  };

  if (!resume) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="ml-2">加载简历…</span>
      </div>
    );
  }

  const phase = tailor.phase;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)_360px]">
        {/* 左：JD 输入 */}
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">招聘需求（JD）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={14}
                placeholder="在此粘贴目标岗位的完整 JD……"
                value={tailor.jd}
                onChange={(e) => tailor.setJd(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">公司</Label>
                  <Input
                    value={tailor.company ?? ''}
                    placeholder="选填"
                    onChange={(e) => tailor.setCompany(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">行业</Label>
                  <Input
                    value={tailor.industry ?? ''}
                    placeholder="选填"
                    onChange={(e) => tailor.setIndustry(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={onAnalyze} disabled={phase === 'analyzing'} className="w-full">
                {phase === 'analyzing' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {phase === 'analyzing' ? '分析中…' : tailor.analysis ? '重新分析' : '开始分析'}
              </Button>
              {!llmReady ? (
                <p className="text-xs text-[color:var(--warning)]">
                  尚未配置大模型，
                  <button
                    type="button"
                    className="underline"
                    onClick={() => navigate('/settings')}
                  >
                    去设置
                  </button>
                </p>
              ) : null}
            </CardContent>
          </Card>

          {versions && versions.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="size-4" />
                  版本历史
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={v.source === 'jd-tailor' ? 'warning' : 'secondary'}
                        >
                          {v.source === 'jd-tailor' ? '改写' : v.source === 'manual' ? '快照' : '导入'}
                        </Badge>
                        <span className="text-muted-foreground">{formatDateTime(v.createdAt)}</span>
                      </div>
                      {v.note ? (
                        <span className="text-[10px] text-muted-foreground">{v.note}</span>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!confirm('恢复到此版本？当前内容会变为该版本的快照。')) return;
                        const archived = await createVersion({
                          baseResumeId: resume.id,
                          source: 'manual',
                          document: resume,
                          note: `恢复前快照（${formatDateTime(new Date())}）`,
                        });
                        const next: ResumeDocument = {
                          ...v.document,
                          id: resume.id,
                          meta: {
                            ...v.document.meta,
                            updatedAt: new Date().toISOString(),
                          },
                        };
                        await saveResume(next);
                        setResume(next);
                        toast({
                          title: '已恢复',
                          description: `已写入旧版本，并将当前内容存为快照 ${archived.id.slice(0, 6)}`,
                          variant: 'success',
                        });
                      }}
                    >
                      恢复
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </section>

        {/* 中：评分 + 关键词 + 技能证明 */}
        <section className="space-y-4">
          {tailor.analysis ? (
            <>
              <ScoreCard analysis={tailor.analysis} />
              <KeywordCoverage analysis={tailor.analysis} />
              {tailor.analysis.skillsEvidence && tailor.analysis.skillsEvidence.length > 0 && (
                <SkillEvidenceCard
                  evidence={tailor.analysis.skillsEvidence}
                  onLocate={onLocateSkill}
                  language={resume.meta.language}
                />
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex h-[300px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <Sparkles className="size-8 opacity-50" />
                <p className="text-sm">粘贴 JD 并点击「开始分析」，看你的简历与目标岗位的差距。</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* 右：改写建议 */}
        <section className="space-y-4">
          {tailor.analysis ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>
                    改写建议
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      已选 {tailor.selectedIds.size} / {tailor.analysis.suggestions.length}
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {tailor.analysis.suggestions.map((s) => (
                  <SuggestionCard
                    key={s.id}
                    suggestion={s}
                    selected={tailor.selectedIds.has(s.id)}
                    onToggle={() => tailor.toggleSelected(s.id)}
                  />
                ))}
                <Separator />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onPreviewApply}
                    disabled={
                      phase === 'suggesting' || tailor.selectedIds.size === 0 || !llmReady
                    }
                    className="flex-1"
                  >
                    {phase === 'suggesting' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    {phase === 'suggesting' ? '生成改写中…' : '应用所选建议'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => tailor.clearSelected()}>
                    清空
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setCoverOpen(true)}
                  disabled={!llmReady || !tailor.jd.trim()}
                >
                  <Mail className="size-3.5" /> 写一封求职信
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>

      <PatchPreviewDialog
        open={previewState.open}
        onOpenChange={(open) =>
          setPreviewState((s) => ({ ...s, open, applying: open ? s.applying : false }))
        }
        previews={previewState.previews}
        onApply={() => void onConfirmApply()}
        applying={previewState.applying}
        rationale={previewState.patch?.rationale}
        error={previewState.error}
      />

      <CoverLetterDrawer
        open={coverOpen}
        onOpenChange={setCoverOpen}
        resume={resume}
        jd={tailor.jd}
        company={tailor.company}
      />
    </>
  );
}
