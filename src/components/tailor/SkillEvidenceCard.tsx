/**
 * 技能证明卡片：显示技能证明链，支持点击定位到简历段落
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, XCircle, MapPin } from 'lucide-react';

import type { SkillEvidence } from '@/schema/jdAnalysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SkillEvidenceCardProps {
  evidence: SkillEvidence[];
  onLocate?: (path: string) => void; // 点击定位回调
  language?: 'zh' | 'en';
}

function StrengthStars({ strength }: { strength: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < strength ? 'text-yellow-500' : 'text-muted'}>
          ★
        </span>
      ))}
    </span>
  );
}

function StatusIcon({ status }: { status: SkillEvidence['status'] }) {
  switch (status) {
    case 'strong':
      return <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" />;
    case 'weak':
      return <AlertCircle className="h-4 w-4 text-[color:var(--warning)]" />;
    case 'missing':
      return <XCircle className="h-4 w-4 text-[color:var(--destructive)]" />;
  }
}

function StatusLabel({ status, language }: { status: SkillEvidence['status']; language: 'zh' | 'en' }) {
  const labels = {
    strong: { zh: '强证明', en: 'Strong' },
    weak: { zh: '弱证明', en: 'Weak' },
    missing: { zh: '无证明', en: 'Missing' },
  };
  return <span>{language === 'en' ? labels[status].en : labels[status].zh}</span>;
}

function SourceTypeLabel({ type, language }: { type: string; language: 'zh' | 'en' }) {
  const labels: Record<string, { zh: string; en: string }> = {
    experience: { zh: '工作经验', en: 'Experience' },
    project: { zh: '项目', en: 'Project' },
    education: { zh: '教育', en: 'Education' },
    skills: { zh: '技能列表', en: 'Skills' },
  };
  return <span>{language === 'en' ? labels[type]?.en ?? type : labels[type]?.zh ?? type}</span>;
}

function SkillItem({ item, onLocate, language }: { item: SkillEvidence; onLocate?: (path: string) => void; language: 'zh' | 'en' }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusIcon status={item.status} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.skill}</span>
              <StrengthStars strength={item.strength} />
              <Badge variant={item.status === 'strong' ? 'default' : item.status === 'weak' ? 'secondary' : 'destructive'}>
                <StatusLabel status={item.status} language={language} />
              </Badge>
            </div>
            {item.sources.length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                {language === 'en' ? `${item.sources.length} evidence source(s)` : `${item.sources.length} 个证明来源`}
              </div>
            )}
          </div>
        </div>
        {item.sources.length > 0 && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
        )}
      </div>

      <CollapsibleContent className="mt-2 space-y-2">
        {item.sources.map((source, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 rounded bg-muted/50 p-2 text-xs hover:bg-muted"
          >
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  <SourceTypeLabel type={source.type} language={language} />
                </Badge>
                <span className="text-muted-foreground">
                  {language === 'en' ? 'Relevance' : '相关性'}: {Math.round(source.relevance * 100)}%
                </span>
              </div>
              <p className="text-foreground/80">{source.excerpt}</p>
              {onLocate && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => onLocate(source.path)}
                >
                  {language === 'en' ? '→ Locate in resume' : '→ 在简历中定位'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CollapsibleContent>

      {item.recommendation && (
        <div className="mt-2 rounded bg-blue-50 p-2 text-xs text-blue-900 dark:bg-blue-950 dark:text-blue-100">
          <span className="font-medium">💡 {language === 'en' ? 'Recommendation' : '建议'}：</span>
          {item.recommendation}
        </div>
      )}
    </Collapsible>
  );
}

export function SkillEvidenceCard({ evidence, onLocate, language = 'zh' }: SkillEvidenceCardProps) {
  if (evidence.length === 0) {
    return null;
  }

  // 按状态分组
  const strong = evidence.filter((e) => e.status === 'strong');
  const weak = evidence.filter((e) => e.status === 'weak');
  const missing = evidence.filter((e) => e.status === 'missing');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{language === 'en' ? 'Skills Evidence Chain' : '技能证明链'}</span>
          <div className="flex gap-2 text-xs font-normal">
            {strong.length > 0 && (
              <Badge variant="default">
                {strong.length} {language === 'en' ? 'strong' : '强'}
              </Badge>
            )}
            {weak.length > 0 && (
              <Badge variant="secondary">
                {weak.length} {language === 'en' ? 'weak' : '弱'}
              </Badge>
            )}
            {missing.length > 0 && (
              <Badge variant="destructive">
                {missing.length} {language === 'en' ? 'missing' : '缺失'}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {strong.map((item) => (
          <SkillItem key={item.skill} item={item} onLocate={onLocate} language={language} />
        ))}
        {weak.map((item) => (
          <SkillItem key={item.skill} item={item} onLocate={onLocate} language={language} />
        ))}
        {missing.map((item) => (
          <SkillItem key={item.skill} item={item} onLocate={onLocate} language={language} />
        ))}
      </CardContent>
    </Card>
  );
}
