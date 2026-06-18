import type { JdAnalysis } from '@/schema/jdAnalysis';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function KeywordCoverage({ analysis }: { analysis: JdAnalysis }): React.JSX.Element {
  const { matchedKeywords, missingKeywords } = analysis;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-3">
          <span>关键词覆盖</span>
          <span className="text-xs text-muted-foreground">
            已命中 {matchedKeywords.length} · 缺失 {missingKeywords.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matchedKeywords.length ? (
          <div>
            <div className="mb-1.5 text-xs font-medium text-[color:var(--success)]">已命中</div>
            <div className="flex flex-wrap gap-1.5">
              {matchedKeywords.map((k) => (
                <span
                  key={k.term}
                  className="inline-flex items-center gap-1 rounded-md bg-[color:var(--success)]/15 px-2 py-0.5 text-xs text-[color:var(--success)]"
                  title={`简历中出现 ${k.frequency} 次`}
                >
                  {k.term}
                  {k.frequency > 0 ? (
                    <span className="text-[10px] opacity-70">×{k.frequency}</span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {missingKeywords.length ? (
          <div>
            <div className="mb-1.5 text-xs font-medium text-[color:var(--destructive)]">缺失</div>
            <div className="flex flex-wrap gap-1.5">
              {missingKeywords.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center rounded-md bg-[color:var(--destructive)]/12 px-2 py-0.5 text-xs text-[color:var(--destructive)]"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
