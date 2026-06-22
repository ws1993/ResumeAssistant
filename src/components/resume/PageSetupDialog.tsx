import { useState } from 'react';
import { Settings2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface PageSetup {
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  pageSize: 'A4' | 'Letter';
}

export const DEFAULT_PAGE_SETUP: PageSetup = {
  marginTop: 18,
  marginBottom: 18,
  marginLeft: 16,
  marginRight: 16,
  pageSize: 'A4',
};

interface PageSetupDialogProps {
  value: PageSetup;
  onChange: (setup: PageSetup) => void;
}

const PAGE_SIZES: Array<{ value: PageSetup['pageSize']; label: string; desc: string }> = [
  { value: 'A4', label: 'A4', desc: '210 × 297 mm' },
  { value: 'Letter', label: 'Letter', desc: '216 × 279 mm' },
];

export function PageSetupDialog({ value, onChange }: PageSetupDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<PageSetup>(value);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (nextOpen) {
      setLocal(value);
    }
    setOpen(nextOpen);
  };

  const handleConfirm = (): void => {
    onChange(local);
    setOpen(false);
  };

  const updateMargin = (key: keyof PageSetup, val: string): void => {
    const num = Math.max(0, Math.min(50, Number(val) || 0));
    setLocal((prev) => ({ ...prev, [key]: num }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-muted-foreground">
          <Settings2 className="size-3.5" />
          页面设置
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>页面设置</DialogTitle>
          <DialogDescription>
            配置打印和导出 PDF 的页面参数
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Page size */}
          <div className="space-y-2">
            <Label>纸张大小</Label>
            <div className="flex gap-2">
              {PAGE_SIZES.map((ps) => (
                <button
                  key={ps.value}
                  type="button"
                  onClick={() => setLocal((prev) => ({ ...prev, pageSize: ps.value }))}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2.5 text-left transition',
                    local.pageSize === ps.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <div className="text-sm font-medium">{ps.label}</div>
                  <div className="text-xs text-muted-foreground">{ps.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Margins */}
          <div className="space-y-3">
            <Label>页边距 (mm)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mt" className="text-xs text-muted-foreground">上</Label>
                <Input
                  id="mt"
                  type="number"
                  min={0}
                  max={50}
                  value={local.marginTop}
                  onChange={(e) => updateMargin('marginTop', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mb" className="text-xs text-muted-foreground">下</Label>
                <Input
                  id="mb"
                  type="number"
                  min={0}
                  max={50}
                  value={local.marginBottom}
                  onChange={(e) => updateMargin('marginBottom', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ml" className="text-xs text-muted-foreground">左</Label>
                <Input
                  id="ml"
                  type="number"
                  min={0}
                  max={50}
                  value={local.marginLeft}
                  onChange={(e) => updateMargin('marginLeft', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mr" className="text-xs text-muted-foreground">右</Label>
                <Input
                  id="mr"
                  type="number"
                  min={0}
                  max={50}
                  value={local.marginRight}
                  onChange={(e) => updateMargin('marginRight', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
