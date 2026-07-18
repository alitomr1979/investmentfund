import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function Statement({ user, users, onLogout, API_BASE }) {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvestor, setSelectedInvestor] = useState(user.role === 'investor' ? user.id : '');

  useEffect(() => {
    if (selectedInvestor) fetchStatement();
    else setLoading(false);
  }, [selectedInvestor]);

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/investor-statement/${selectedInvestor}`);
      const data = await res.json();
      setStatement(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const investors = users;

  return (
    <Layout user={user} onLogout={onLogout}>
      <h1 style={{ fontSize: '2.5rem', margin: '0 0 2rem 0' }}>Capital Statement</h1>
      
      {user.role === 'admin' && (
        <div className="glass-panel" style={{ maxWidth: '400px', marginBottom: '2rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Select Investor to view statement</label>
            <select className="input" value={selectedInvestor} onChange={e => setSelectedInvestor(e.target.value)}>
              <option value="">Select Investor...</option>
              {investors.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading statement...</p>
      ) : !selectedInvestor ? (
        <p className="text-muted">Please select an investor.</p>
      ) : !statement ? (
        <p className="text-muted">Statement unavailable.</p>
      ) : (
        <div className="glass-panel" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
            <h2 style={{ margin: 0, color: 'var(--accent)' }}>{statement.investor_name}</h2>
            <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>Official Capital Statement</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span className="text-muted">Initial Balance:</span>
                <span>${parseFloat(statement.initial_balance).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span className="text-muted">Total Contributions:</span>
                <span style={{ color: 'var(--success)' }}>+${parseFloat(statement.total_contributions).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span className="text-muted">Total Withdrawals:</span>
                <span style={{ color: 'var(--danger)' }}>-${parseFloat(statement.total_withdrawals).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid var(--glass-border)', marginTop: '0.5rem', fontWeight: 'bold' }}>
                <span className="text-muted">Net Invested Capital:</span>
                <span>${parseFloat(statement.total_contributions - statement.total_withdrawals).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span className="text-muted">Fees Paid (Units):</span>
                <span style={{ color: 'var(--danger)' }}>{parseFloat(statement.total_fees_paid_units).toFixed(4)} Units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span className="text-muted">Net Profit / Loss:</span>
                <span style={{ fontWeight: 'bold', color: statement.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {statement.net_profit >= 0 ? '+' : '-'}${Math.abs(statement.net_profit).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', marginTop: '2rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>Ending Balance:</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent)' }}>${parseFloat(statement.ending_balance).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
          </div>
        </div>
      )}
    </Layout>
  );
}
