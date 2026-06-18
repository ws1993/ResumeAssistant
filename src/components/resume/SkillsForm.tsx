import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { newId } from '@/schema/resume';
import { useResumeStore } from '@/stores/resumeStore';

import { TagEditor } from './bits';

export function SkillsForm(): React.JSX.Element {
  const groups = useResumeStore((s) => s.current?.skills ?? []);
  const setStore = useResumeStore((s) => s.set);

  const add = (): void =>
    setStore((doc) => doc.skills.push({ id: newId(), category: '', items: [] }));

  return (
    <div className="space-y-3">
      {groups.map((g, idx) => (
        <div key={g.id} className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>类别</Label>
              <Input
                placeholder="编程语言 / 框架 / 工具链 / 软技能"
                value={g.category}
                onChange={(e) => setStore((doc) => (doc.skills[idx].category = e.target.value))}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="删除类别"
              onClick={() => setStore((doc) => doc.skills.splice(idx, 1))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <div className="mt-3 space-y-1.5">
            <Label>具体技能</Label>
            <TagEditor
              value={g.items}
              onChange={(next) => setStore((doc) => (doc.skills[idx].items = next))}
            />
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" /> 添加技能类别
      </Button>
    </div>
  );
}
