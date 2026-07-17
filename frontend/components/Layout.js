import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children, user, onLogout }) {
  const router = useRouter();
  
  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Transactions', path: '/transactions' },
    { name: 'Users', path: '/users' },
    { name: 'Reports / Ledger', path: '/reports' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: '250px', background: 'rgba(0,0,0,0.4)', padding: '2rem', borderRight: '1px solid var(--glass-border)' }}>
        <h2 style={{ margin: '0 0 2rem 0', background: 'linear-gradient(to right, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Elite Fund
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {navItems.map(item => (
            <Link key={item.path} href={item.path} style={{
              color: router.pathname === item.path ? 'var(--accent)' : 'var(--text-muted)',
              textDecoration: 'none',
              fontWeight: 600,
              padding: '0.5rem',
              borderRadius: '8px',
              background: router.pathname === item.path ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              transition: 'all 0.2s'
            }}>
              {item.name}
            </Link>
          ))}
        </div>
      </nav>
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '2rem' }}>
          <span className="text-muted" style={{marginRight: '1rem'}}>Welcome, <strong style={{color: '#fff'}}>{user?.name}</strong></span>
          <button className="btn" onClick={onLogout} style={{ padding: '0.5rem 1rem' }}>Logout</button>
        </div>
        {children}
      </main>
    </div>
  );
}
