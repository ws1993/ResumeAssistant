import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { newId } from '@/schema/resume';
import { useResumeStore } from '@/stores/resumeStore';

import { BulletEditor, TagEditor } from './bits';

export function ExperienceForm(): React.JSX.Element {
  const items = useResumeStore((s) => s.current?.experiences ?? []);
  const setStore = useResumeStore((s) => s.set);

  const add = (): void =>
    setStore((doc) =>
      doc.experiences.push({
        id: newId(),
        company: '',
        title: '',
        period: { start: '' },
        bullets: [''],
      }),
    );

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={item.id} className="rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>公司</Label>
              <Input
                value={item.company}
                onChange={(e) => setStore((doc) => (doc.experiences[idx].company = e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>职位</Label>
              <Input
                value={item.title}
                onChange={(e) => setStore((doc) => (doc.experiences[idx].title = e.target.value))}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>开始</Label>
              <Input
                placeholder="2024-03"
                value={item.period.start}
                onChange={(e) =>
                  setStore((doc) => (doc.experiences[idx].period.start = e.target.value))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>结束（留空=至今）</Label>
              <Input
                placeholder="2026-06"
                value={item.period.end ?? ''}
                onChange={(e) =>
                  setStore((doc) => (doc.experiences[idx].period.end = e.target.value || undefined))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>所在城市</Label>
              <Input
                value={item.location ?? ''}
                onChange={(e) =>
                  setStore((doc) => (doc.experiences[idx].location = e.target.value || undefined))
                }
              />
            </div>
          </div>

          <Separator className="my-3" />

          <Label>工作要点</Label>
          <div className="mt-2">
            <BulletEditor
              value={item.bullets}
              onChange={(next) => setStore((doc) => (doc.experiences[idx].bullets = next))}
            />
          </div>

          <div className="mt-3 space-y-1.5">
            <Label>技术栈</Label>
            <TagEditor
              value={item.stack ?? []}
              onChange={(next) =>
                setStore((doc) => (doc.experiences[idx].stack = next.length ? next : undefined))
              }
            />
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setStore((doc) => doc.experiences.splice(idx, 1))}
            >
              <Trash2 className="size-4" /> 删除该经历
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" /> 添加工作经历
      </Button>
    </div>
  );
}
