import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function NavHistory({ user, onLogout, API_BASE }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [startDate, endDate]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/reports/nav-history`;
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr) => new Date(dateStr).toLocaleString();
  const formatUSD = (val) => `$${parseFloat(val).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4})}`;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>NAV History</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Start Date</label>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>End Date</label>
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>
      
      <div className="glass-panel">
        {loading ? <p>Loading...</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem 0' }}>Calculation Date</th>
                  <th style={{ padding: '1rem 0' }}>NAV (Total Value)</th>
                  <th style={{ padding: '1rem 0' }}>NAV per Unit</th>
                  <th style={{ padding: '1rem 0' }}>Units Outstanding</th>
                  <th style={{ padding: '1rem 0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>No NAV records found.</td></tr>
                ) : history.map((record, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0' }}>{formatDateTime(record.calculation_timestamp)}</td>
                    <td style={{ padding: '1rem 0' }}>{formatUSD(record.nav)}</td>
                    <td style={{ padding: '1rem 0', color: 'var(--primary)' }}>{formatUSD(record.nav_per_unit)}</td>
                    <td style={{ padding: '1rem 0' }}>{parseFloat(record.total_units_outstanding).toFixed(4)}</td>
                    <td style={{ padding: '1rem 0' }}>
                      <span style={{ background: 'rgba(46, 213, 115, 0.2)', color: 'var(--success)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {record.calculation_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
