import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function InvestorPerformance({ user, onLogout, API_BASE }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (user.role === 'admin') {
        const res = await fetch(`${API_BASE}/reports/investor-performance`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setReports(data);
      } else {
        const res = await fetch(`${API_BASE}/reports/investor-performance/${user.id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setReports([data]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPct = (val) => `${(parseFloat(val) * 100).toFixed(2)}%`;
  const formatUSD = (val) => `$${parseFloat(val).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  return (
    <Layout user={user} onLogout={onLogout}>
      <h1 style={{ fontSize: '2.5rem', margin: '0 0 2rem 0' }}>Investor Performance</h1>
      
      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {reports.length === 0 ? (
            <p className="text-muted">No investor performance data found.</p>
          ) : reports.map((report, idx) => (
            <div key={idx} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ margin: 0, borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                {report.investor_name}
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Beginning Value</label>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{formatUSD(report.beginning_value)}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Net Contributions</label>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>+{formatUSD(report.net_contributions)}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Net Withdrawals</label>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)' }}>-{formatUSD(report.net_withdrawals)}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ending Value</label>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{formatUSD(report.ending_value)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Investment Gain/Loss</label>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: parseFloat(report.investment_gain_loss) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatUSD(report.investment_gain_loss)}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Return</label>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: parseFloat(report.total_return_percentage) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatPct(report.total_return_percentage)}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Annualized Return</label>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: parseFloat(report.annualized_return_percentage) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatPct(report.annualized_return_percentage)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
