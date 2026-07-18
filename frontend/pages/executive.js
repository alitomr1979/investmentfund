import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function Executive({ user, onLogout, API_BASE }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/executive-dashboard`);
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (user.role !== 'admin') {
    return <Layout user={user} onLogout={onLogout}><p>Access denied.</p></Layout>;
  }

  const formatPct = (val) => `${(parseFloat(val) * 100).toFixed(2)}%`;

  return (
    <Layout user={user} onLogout={onLogout}>
      <h1 style={{ fontSize: '2.5rem', margin: '0 0 2rem 0' }}>Executive Dashboard</h1>
      
      {loading || !dashboard ? (
        <p className="text-muted">Loading executive metrics...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {dashboard.price_missing_alert && (
            <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', color: '#fca5a5' }}>
              <strong>⚠️ Alert:</strong> Missing prices. The NAV hasn't been updated in {dashboard.days_since_update} days.
            </div>
          )}

          <div className="grid-3">
            <div className="glass-panel stat-card">
              <h3>Global AUM</h3>
              <div className="value">${parseFloat(dashboard.global_aum).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </div>
            <div className="glass-panel stat-card">
              <h3>Current NAV</h3>
              <div className="value">${parseFloat(dashboard.nav).toFixed(4)}</div>
            </div>
            <div className="glass-panel stat-card">
              <h3>Total Investors</h3>
              <div className="value">{dashboard.investors_count}</div>
            </div>
          </div>
          
          <div className="glass-panel" style={{ maxWidth: '800px' }}>
            <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Performance Matrix (Fund vs SPY)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem 0' }}>Period</th>
                    <th style={{ padding: '1rem 0' }}>Fund Return</th>
                    <th style={{ padding: '1rem 0' }}>SPY Return</th>
                    <th style={{ padding: '1rem 0' }}>Alpha (Fund - SPY)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Daily (Yesterday)', key: 'daily' },
                    { label: 'Monthly (1M)', key: 'monthly' },
                    { label: 'Year To Date (YTD)', key: 'ytd' },
                    { label: 'Since Inception', key: 'inception' }
                  ].map((period, i) => {
                    const fundRet = dashboard.returns?.[period.key]?.fund || 0;
                    const spyRet = dashboard.returns?.[period.key]?.spy || 0;
                    const alpha = fundRet - spyRet;
                    return (
                      <tr key={period.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'transparent' }}>
                        <td style={{ padding: '1rem 0', fontWeight: 600 }}>{period.label}</td>
                        <td style={{ padding: '1rem 0', color: fundRet >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatPct(fundRet)}</td>
                        <td style={{ padding: '1rem 0', color: spyRet >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatPct(spyRet)}</td>
                        <td style={{ padding: '1rem 0', fontWeight: 'bold', color: alpha >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatPct(alpha)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </Layout>
  );
}
