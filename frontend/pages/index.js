import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function Dashboard({ user, fundStatus, reload, onLogout, API_BASE }) {
  const [newAum, setNewAum] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [updatingAum, setUpdatingAum] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [fundStatus]);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch(`${API_BASE}/reports/investors-summary`);
      const data = await res.json();
      setSummaryData(data.summary || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleUpdateAUM = async (e) => {
    e.preventDefault();
    setUpdatingAum(true);
    try {
      await fetch(`${API_BASE}/fund-status/update-value`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_value: newAum, effective_date: effectiveDate })
      });
      setNewAum('');
      setShowModal(false);
      reload();
    } catch (err) {
      alert('Error updating AUM');
    } finally {
      setUpdatingAum(false);
    }
  };

  const formatPct = (val) => `${(parseFloat(val) * 100).toFixed(2)}%`;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>Dashboard</h1>
          <p className="text-muted">Global Fund Overview</p>
        </div>
        
        {user.role === 'admin' && (
          <button className="btn btn-success" onClick={() => setShowModal(true)}>Update AUM</button>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '2rem' }}>
            <h2 style={{ marginTop: 0 }}>Update Global AUM</h2>
            <form onSubmit={handleUpdateAUM}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Total AUM ($)</label>
                <input className="input" type="number" step="0.01" required value={newAum} onChange={e=>setNewAum(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Effective Date</label>
                <input className="input" type="date" required value={effectiveDate} onChange={e=>setEffectiveDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn" style={{ flex: 1, background: 'var(--glass-border)' }} onClick={() => setShowModal(false)} disabled={updatingAum}>Cancel</button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }} disabled={updatingAum}>
                  {updatingAum ? 'Updating...' : 'Submit'}
                </button>
              </div>
              {updatingAum && <p className="text-muted" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>Actualizando NAV y Calculando Comisiones...</p>}
            </form>
          </div>
        </div>
      )}

      <div className="grid-3">
        <div className="glass-panel stat-card">
          <h3>Total Value (AUM)</h3>
          <div className="value">${parseFloat(fundStatus?.total_value || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
        </div>
        <div className="glass-panel stat-card">
          <h3>Total Units</h3>
          <div className="value">{parseFloat(fundStatus?.total_units || 0).toLocaleString(undefined, {minimumFractionDigits:4, maximumFractionDigits:4})}</div>
        </div>
        <div className="glass-panel stat-card">
          <h3>NAV per Unit</h3>
          <div className="value">${parseFloat(fundStatus?.nav_per_unit || 100).toLocaleString(undefined, {minimumFractionDigits:4, maximumFractionDigits:4})}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Investors Performance Summary</h2>
        {loadingSummary ? (
          <p className="text-muted">Loading summary...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem 0' }}>Investor</th>
                  <th style={{ padding: '1rem 0' }}>Current Value</th>
                  <th style={{ padding: '1rem 0' }}>Fund (3M)</th>
                  <th style={{ padding: '1rem 0' }}>Net (3M)</th>
                  <th style={{ padding: '1rem 0' }}>Fund (1Y)</th>
                  <th style={{ padding: '1rem 0' }}>Net (1Y)</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>No investors found or waiting for data.</td></tr>
                ) : summaryData.map((inv, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0', fontWeight: 600 }}>{inv.investor_name}</td>
                    <td style={{ padding: '1rem 0' }}>${parseFloat(inv.total_amount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                    <td style={{ padding: '1rem 0', color: inv.last_quarter.fund_gross_return >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {formatPct(inv.last_quarter.fund_gross_return)}
                    </td>
                    <td style={{ padding: '1rem 0', color: inv.last_quarter.investor_net_return >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      {formatPct(inv.last_quarter.investor_net_return)}
                    </td>
                    <td style={{ padding: '1rem 0', color: inv.last_year.fund_gross_return >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {formatPct(inv.last_year.fund_gross_return)}
                    </td>
                    <td style={{ padding: '1rem 0', color: inv.last_year.investor_net_return >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      {formatPct(inv.last_year.investor_net_return)}
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
