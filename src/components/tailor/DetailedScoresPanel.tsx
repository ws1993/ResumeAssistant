/**
 * 详细评分面板：展示全部 14 维度评分
 * 支持展开/折叠，每个维度显示分数、进度条、悬停提示
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

import type { DetailedScores, DetailedScoreDim } from '@/schema/jdAnalysis';
import { DETAILED_SCORE_DIM_LABELS } from '@/schema/jdAnalysis';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DetailedScoresPanelProps {
  scores: Partial<DetailedScores>;
  language?: 'zh' | 'en';
}

function scoreColor(value: number): string {
  if (value >= 80) return 'text-[color:var(--success)]';
  if (value >= 60) return 'text-foreground';
  if (value >= 40) return 'text-[color:var(--warning)]';
  return 'text-[color:var(--destructive)]';
}

function scoreBarColor(value: number): string {
  if (value >= 80) return 'bg-[color:var(--success)]';
  if (value >= 60) return 'bg-primary';
  if (value >= 40) return 'bg-[color:var(--warning)]';
  return 'bg-[color:var(--destructive)]';
}

// 扩展维度（详细面板显示）
const EXTENDED_DIMS: DetailedScoreDim[] = [
  'skillsMatch',
  'experienceMatch',
  'technicalDepth',
  'industryAlignment',
  'educationMatch',
  'quantifiedImpact',
  'toneSeniority',
  'atsCompatibility',
];

export function DetailedScoresPanel({ scores, language = 'zh' }: DetailedScoresPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // 过滤出有值的扩展维度
  const availableExtendedDims = EXTENDED_DIMS.filter((dim) => scores[dim] !== undefined);

  if (availableExtendedDims.length === 0) {
    return null; // 没有扩展维度时不显示
  }

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-between text-sm"
      >
        <span>详细评分（{availableExtendedDims.length} 个维度）</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {expanded && (
        <div className="space-y-2 rounded-md border bg-card p-3">
          {availableExtendedDims.map((dim) => {
            const score = scores[dim] ?? 0;
            const label = DETAILED_SCORE_DIM_LABELS[dim];
            const labelText = language === 'en' ? label.en : label.zh;
            const description = language === 'en' ? label.description.en : label.description.zh;

            return (
              <div key={dim} className="flex items-center gap-2 text-xs">
                <div className="flex w-24 shrink-0 items-center gap-1">
                  <span className="text-muted-foreground">{labelText}</span>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-xs">{description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${scoreBarColor(score)}`}
                    style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                  />
                </div>

                <span className={`w-8 text-right font-medium ${scoreColor(score)}`}>
                  {Math.round(score)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
