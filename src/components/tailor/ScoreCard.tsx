import type { JdAnalysis, Scores } from '@/schema/jdAnalysis';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarChart } from './RadarChart';
import { DetailedScoresPanel } from './DetailedScoresPanel';

const SCORE_KEYS: { key: keyof Scores; label: string }[] = [
  { key: 'overall', label: '总分' },
  { key: 'keywords', label: '关键词' },
  { key: 'relevance', label: '相关度' },
  { key: 'quantified', label: '量化' },
  { key: 'expression', label: '表达' },
  { key: 'format', label: '结构' },
];

function scoreColor(value: number): string {
  if (value >= 80) return 'text-[color:var(--success)]';
  if (value >= 60) return 'text-foreground';
  if (value >= 40) return 'text-[color:var(--warning)]';
  return 'text-[color:var(--destructive)]';
}

interface ScoreCardProps {
  analysis: JdAnalysis;
  isQuickScore?: boolean; // 是否为快速评分（实时计算）
  lastAnalyzedAt?: string; // 上次完整分析时间
  onRefresh?: () => void; // 手动刷新回调
}

export function ScoreCard({
  analysis,
  isQuickScore = false,
  lastAnalyzedAt,
  onRefresh,
}: ScoreCardProps): React.JSX.Element {
  const { scores, summary, redFlags } = analysis;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-3">
          <span>对标评分</span>
          <span className={`text-3xl font-bold ${scoreColor(scores.overall)}`}>
            {Math.round(scores.overall)}
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
          {isQuickScore && (
            <Badge variant="outline" className="ml-auto text-xs">
              ⚡ 实时计算
            </Badge>
          )}
        </CardTitle>
        {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
        {isQuickScore && lastAnalyzedAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>上次完整分析：{new Date(lastAnalyzedAt).toLocaleString('zh-CN')}</span>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-primary hover:underline"
              >
                🔄 重新完整分析
              </button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[auto_1fr] items-center gap-4">
          <div className="text-primary">
            <RadarChart scores={scores} />
          </div>
          <div className="space-y-1.5">
            {SCORE_KEYS.filter((s) => s.key !== 'overall').map((s) => (
              <div key={s.key} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-muted-foreground">{s.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, scores[s.key]))}%` }}
                  />
                </div>
                <span className={`w-8 text-right font-medium ${scoreColor(scores[s.key])}`}>
                  {Math.round(scores[s.key])}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 详细评分面板 */}
        <DetailedScoresPanel scores={scores} />

        {redFlags.length ? (
          <div className="rounded-md border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/5 p-2">
            <div className="mb-1 text-xs font-medium text-[color:var(--destructive)]">严重问题</div>
            <ul className="space-y-0.5 text-xs text-foreground/80">
              {redFlags.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Badge variant="destructive" className="shrink-0">
                    !
                  </Badge>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
