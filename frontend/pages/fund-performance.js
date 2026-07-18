import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function FundPerformance({ user, onLogout, API_BASE }) {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/fund-performance`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPerformance(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPct = (val) => `${(parseFloat(val) * 100).toFixed(2)}%`;
  const formatUSD = (val) => `$${parseFloat(val).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  const MetricCard = ({ title, fundVal, spyVal, isUSD = false }) => {
    const isPositive = parseFloat(fundVal) >= 0;
    const diff = parseFloat(fundVal) - parseFloat(spyVal);
    const diffPositive = diff >= 0;
    
    return (
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{title}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: '600', color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
              {isUSD ? formatUSD(fundVal) : formatPct(fundVal)}
            </div>
            {!isUSD && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                SPY Benchmark: {formatPct(spyVal)}
              </div>
            )}
          </div>
          {!isUSD && (
            <div style={{ fontSize: '0.9rem', color: diffPositive ? 'var(--success)' : 'var(--danger)', background: diffPositive ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              {diffPositive ? '+' : ''}{(diff * 100).toFixed(2)}%
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <h1 style={{ fontSize: '2.5rem', margin: '0 0 2rem 0' }}>Fund Performance</h1>
      
      {loading || !performance ? <p>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <MetricCard title="Compound Annual Growth Rate (CAGR)" fundVal={performance.cagr?.fund} spyVal={performance.cagr?.spy} />
            <MetricCard title="Since Inception Return" fundVal={performance.inception?.fund} spyVal={performance.inception?.spy} />
            <MetricCard title="Total Dollar Return (Gain/Loss)" fundVal={performance.dollar_return} isUSD={true} />
          </div>

          <h2 style={{ margin: '1rem 0 0 0', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Periodic Returns</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <MetricCard title="Year-to-Date (YTD)" fundVal={performance.ytd?.fund} spyVal={performance.ytd?.spy} />
            <MetricCard title="1-Year Annual" fundVal={performance.annual?.fund} spyVal={performance.annual?.spy} />
            <MetricCard title="Quarterly (3 Months)" fundVal={performance.quarterly?.fund} spyVal={performance.quarterly?.spy} />
            <MetricCard title="Monthly" fundVal={performance.monthly?.fund} spyVal={performance.monthly?.spy} />
            <MetricCard title="Daily" fundVal={performance.daily?.fund} spyVal={performance.daily?.spy} />
          </div>
        </div>
      )}
    </Layout>
  );
}
