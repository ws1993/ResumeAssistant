import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export default function NotFound(): React.JSX.Element {
  return (
    <div className="grid place-items-center py-24 text-center">
      <div className="space-y-4">
        <p className="text-6xl font-bold tracking-tight text-muted-foreground">404</p>
        <p className="text-lg">页面走丢了</p>
        <Button asChild>
          <Link to="/">回工作台</Link>
        </Button>
      </div>
    </div>
  );
}
