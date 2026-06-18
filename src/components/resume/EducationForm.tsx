import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { newId } from '@/schema/resume';
import { useResumeStore } from '@/stores/resumeStore';

import { BulletEditor } from './bits';

export function EducationForm(): React.JSX.Element {
  const items = useResumeStore((s) => s.current?.educations ?? []);
  const setStore = useResumeStore((s) => s.set);

  const add = (): void =>
    setStore((doc) =>
      doc.educations.push({
        id: newId(),
        school: '',
        period: { start: '' },
      }),
    );

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={item.id} className="rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>学校</Label>
              <Input
                value={item.school}
                onChange={(e) => setStore((doc) => (doc.educations[idx].school = e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>专业</Label>
              <Input
                value={item.major ?? ''}
                onChange={(e) =>
                  setStore((doc) => (doc.educations[idx].major = e.target.value || undefined))
                }
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>学位</Label>
              <Input
                placeholder="学士 / 硕士 / 博士"
                value={item.degree ?? ''}
                onChange={(e) =>
                  setStore((doc) => (doc.educations[idx].degree = e.target.value || undefined))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>开始</Label>
              <Input
                placeholder="2018-09"
                value={item.period.start}
                onChange={(e) =>
                  setStore((doc) => (doc.educations[idx].period.start = e.target.value))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>结束</Label>
              <Input
                placeholder="2022-06"
                value={item.period.end ?? ''}
                onChange={(e) =>
                  setStore((doc) => (doc.educations[idx].period.end = e.target.value || undefined))
                }
              />
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <Label>GPA / 排名（选填）</Label>
            <Input
              value={item.gpa ?? ''}
              onChange={(e) =>
                setStore((doc) => (doc.educations[idx].gpa = e.target.value || undefined))
              }
            />
          </div>

          <div className="mt-3 space-y-1.5">
            <Label>主修课程 / 荣誉</Label>
            <BulletEditor
              value={item.highlights ?? []}
              onChange={(next) =>
                setStore(
                  (doc) =>
                    (doc.educations[idx].highlights = next.length ? next : undefined),
                )
              }
              placeholder="一条课程或荣誉"
            />
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setStore((doc) => doc.educations.splice(idx, 1))}
            >
              <Trash2 className="size-4" /> 删除
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" /> 添加教育经历
      </Button>
    </div>
  );
}
