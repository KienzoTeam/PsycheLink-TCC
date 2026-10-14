import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { brand } from '../theme';
import { Sidebar } from './Sidebar';
import { Fab } from './Fab';

export function Layout() {
  const [colapsada, setColapsada] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(max-width: 820px)').matches) setColapsada(true);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: brand.background, color: brand.text }}>
      <Sidebar colapsada={colapsada} onToggle={() => setColapsada((v) => !v)} />
      <main style={{ flex: 1, minWidth: 0, padding: 20, display: 'grid', gap: 16, alignContent: 'start', maxWidth: 1100 }}>
        <Outlet />
      </main>
      <Fab />
    </div>
  );
}
