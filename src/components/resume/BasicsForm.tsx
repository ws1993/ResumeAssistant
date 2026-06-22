import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { newId } from '@/schema/resume';
import { useResumeStore } from '@/stores/resumeStore';

export function BasicsForm(): React.JSX.Element {
  const current = useResumeStore((s) => s.current);
  const setStore = useResumeStore((s) => s.set);
  if (!current) return <></>;
  const b = current.basics;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">姓名</Label>
          <Input id="name" value={b.name} onChange={(e) => setStore((doc) => (doc.basics.name = e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="headline">头衔</Label>
          <Input
            id="headline"
            placeholder="如：高级前端工程师"
            value={b.headline ?? ''}
            onChange={(e) => setStore((doc) => (doc.basics.headline = e.target.value))}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            value={b.email ?? ''}
            onChange={(e) => setStore((doc) => (doc.basics.email = e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">手机</Label>
          <Input
            id="phone"
            value={b.phone ?? ''}
            onChange={(e) => setStore((doc) => (doc.basics.phone = e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">城市</Label>
          <Input
            id="location"
            value={b.location ?? ''}
            onChange={(e) => setStore((doc) => (doc.basics.location = e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="summary">个人简介</Label>
        <Textarea
          id="summary"
          rows={4}
          placeholder="一句话定位 + 2-3 句亮点，用 JD 里的强动词"
          value={b.summary ?? ''}
          onChange={(e) => setStore((doc) => (doc.basics.summary = e.target.value))}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>链接</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setStore((doc) =>
                doc.basics.links.push({ id: newId(), label: '', url: '', category: 'personal' }),
              )
            }
          >
            添加链接
          </Button>
        </div>
        {b.links.map((link, i) => (
          <div key={link.id} className="flex gap-2">
            <Input
              placeholder="标签"
              className="w-28"
              value={link.label}
              onChange={(e) => setStore((doc) => (doc.basics.links[i].label = e.target.value))}
            />
            <Input
              placeholder="https://"
              value={link.url}
              onChange={(e) => setStore((doc) => (doc.basics.links[i].url = e.target.value))}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="删除链接"
              onClick={() => setStore((doc) => doc.basics.links.splice(i, 1))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
