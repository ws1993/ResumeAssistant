import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { newId } from '@/schema/resume';
import { useResumeStore } from '@/stores/resumeStore';

import { BulletEditor, TagEditor } from './bits';

export function ProjectForm(): React.JSX.Element {
  const items = useResumeStore((s) => s.current?.projects ?? []);
  const setStore = useResumeStore((s) => s.set);

  const add = (): void =>
    setStore((doc) =>
      doc.projects.push({
        id: newId(),
        name: '',
        highlights: [''],
        links: [],
      }),
    );

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={item.id} className="rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>项目名</Label>
              <Input
                value={item.name}
                onChange={(e) => setStore((doc) => (doc.projects[idx].name = e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>角色</Label>
              <Input
                placeholder="如：负责人 / 全栈开发"
                value={item.role ?? ''}
                onChange={(e) =>
                  setStore((doc) => (doc.projects[idx].role = e.target.value || undefined))
                }
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>开始</Label>
              <Input
                placeholder="2024-03"
                value={item.period?.start ?? ''}
                onChange={(e) =>
                  setStore((doc) => {
                    const p = doc.projects[idx];
                    p.period = { ...(p.period ?? {}), start: e.target.value };
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>结束</Label>
              <Input
                placeholder="留空=至今"
                value={item.period?.end ?? ''}
                onChange={(e) =>
                  setStore((doc) => {
                    const p = doc.projects[idx];
                    p.period = { ...(p.period ?? {}), end: e.target.value || undefined };
                  })
                }
              />
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <Label>一段式概述</Label>
            <Textarea
              rows={2}
              value={item.summary ?? ''}
              onChange={(e) =>
                setStore((doc) => (doc.projects[idx].summary = e.target.value || undefined))
              }
            />
          </div>

          <Separator className="my-3" />

          <Label>项目亮点</Label>
          <div className="mt-2">
            <BulletEditor
              value={item.highlights}
              onChange={(next) => setStore((doc) => (doc.projects[idx].highlights = next))}
              placeholder="一条亮点（建议带量化指标）"
            />
          </div>

          <div className="mt-3 space-y-1.5">
            <Label>技术栈</Label>
            <TagEditor
              value={item.stack ?? []}
              onChange={(next) =>
                setStore((doc) => (doc.projects[idx].stack = next.length ? next : undefined))
              }
            />
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label>链接</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setStore((doc) =>
                    doc.projects[idx].links.push({
                      id: newId(),
                      label: '',
                      url: '',
                      category: 'portfolio',
                    }),
                  )
                }
              >
                添加
              </Button>
            </div>
            {item.links.map((link, li) => (
              <div key={link.id} className="flex gap-2">
                <Input
                  placeholder="标签"
                  className="w-28"
                  value={link.label}
                  onChange={(e) =>
                    setStore((doc) => (doc.projects[idx].links[li].label = e.target.value))
                  }
                />
                <Input
                  placeholder="https://"
                  value={link.url}
                  onChange={(e) =>
                    setStore((doc) => (doc.projects[idx].links[li].url = e.target.value))
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="删除链接"
                  onClick={() => setStore((doc) => doc.projects[idx].links.splice(li, 1))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setStore((doc) => doc.projects.splice(idx, 1))}
            >
              <Trash2 className="size-4" /> 删除该项目
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" /> 添加项目经历
      </Button>
    </div>
  );
}
