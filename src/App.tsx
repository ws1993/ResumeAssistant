import { Suspense, lazy, useEffect } from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';

import { Header } from '@/components/common/Header';
import { Toaster } from '@/components/common/Toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { applyTheme, useThemeStore } from '@/stores/themeStore';
import { useSettingsStore } from '@/stores/settingsStore';

const Dashboard = lazy(() => import('@/routes/Dashboard'));
const EditorPage = lazy(() => import('@/routes/Editor'));
const TailorPage = lazy(() => import('@/routes/Tailor'));
const SettingsPage = lazy(() => import('@/routes/Settings'));
const NotFound = lazy(() => import('@/routes/NotFound'));

function Layout(): React.JSX.Element {
  const mode = useThemeStore((s) => s.mode);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-[1480px] px-6 py-8">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <Outlet />
        </Suspense>
      </main>
      <Toaster />
    </div>
  );
}

export function App(): React.JSX.Element {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="editor" element={<EditorPage />} />
        <Route path="editor/:resumeId" element={<EditorPage />} />
        <Route path="tailor" element={<TailorPage />} />
        <Route path="tailor/:resumeId" element={<TailorPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
