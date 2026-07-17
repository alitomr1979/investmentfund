import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function Reports({ user, onLogout, API_BASE }) {
  const [ledger, setLedger] = useState([]);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (user.role === 'admin') {
        const res = await fetch(`${API_BASE}/fee-ledger`);
        const data = await res.json();
        setLedger(data);
      } else {
        const [feesRes, txRes] = await Promise.all([
          fetch(`${API_BASE}/users/${user.id}/fees`),
          fetch(`${API_BASE}/users/${user.id}/transactions`)
        ]);
        const feesData = await feesRes.json();
        const txData = await txRes.json();
        setLedger(feesData);
        setTxs(txData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString();
  const formatPct = (val) => `${(parseFloat(val) * 100).toFixed(2)}%`;

  if (loading) return <Layout user={user} onLogout={onLogout}><p>Loading reports...</p></Layout>;

  return (
    <Layout user={user} onLogout={onLogout}>
      <h1 style={{ fontSize: '2.5rem', margin: '0 0 2rem 0' }}>Reports</h1>
      
      {user.role === 'admin' ? (
        <div className="glass-panel">
          <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Global Manager Fee Ledger</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem 0' }}>Date</th>
                  <th style={{ padding: '1rem 0' }}>Investor ID</th>
                  <th style={{ padding: '1rem 0' }}>HWM NAV</th>
                  <th style={{ padding: '1rem 0' }}>New NAV</th>
                  <th style={{ padding: '1rem 0' }}>SPY Return</th>
                  <th style={{ padding: '1rem 0' }}>Units Deducted</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>No fees collected yet.</td></tr>
                ) : ledger.map((entry, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0' }}>{formatDate(entry.created_at || entry.date)}</td>
                    <td style={{ padding: '1rem 0' }}>{entry.user_id}</td>
                    <td style={{ padding: '1rem 0' }}>${parseFloat(entry.old_hwm).toFixed(4)}</td>
                    <td style={{ padding: '1rem 0' }}>${parseFloat(entry.new_nav).toFixed(4)}</td>
                    <td style={{ padding: '1rem 0' }}>{formatPct(entry.spy_return)}</td>
                    <td style={{ padding: '1rem 0', color: 'var(--success)' }}>+{parseFloat(entry.units_transferred).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel">
            <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>My External Cash Flows</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem 0' }}>Date</th>
                    <th style={{ padding: '1rem 0' }}>Type</th>
                    <th style={{ padding: '1rem 0' }}>Amount ($)</th>
                    <th style={{ padding: '1rem 0' }}>Units Transacted</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>No transactions yet.</td></tr>
                  ) : txs.map((tx, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0' }}>{formatDate(tx.effective_date)}</td>
                      <td style={{ padding: '1rem 0', textTransform: 'uppercase' }}>{tx.transaction_type}</td>
                      <td style={{ padding: '1rem 0' }}>${parseFloat(tx.amount_fiat).toFixed(2)}</td>
                      <td style={{ padding: '1rem 0', color: tx.transaction_type === 'deposit' ? 'var(--success)' : 'var(--danger)' }}>
                        {tx.transaction_type === 'deposit' ? '+' : '-'}{parseFloat(tx.units_transacted).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="glass-panel">
            <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>My Performance Fees Paid</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem 0' }}>Date</th>
                    <th style={{ padding: '1rem 0' }}>Fund Return</th>
                    <th style={{ padding: '1rem 0' }}>SPY Return</th>
                    <th style={{ padding: '1rem 0' }}>Excess Return</th>
                    <th style={{ padding: '1rem 0' }}>Units Deducted</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>No fees paid yet.</td></tr>
                  ) : ledger.map((entry, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0' }}>{formatDate(entry.created_at || entry.date)}</td>
                      <td style={{ padding: '1rem 0' }}>{formatPct(entry.fund_return)}</td>
                      <td style={{ padding: '1rem 0' }}>{formatPct(entry.spy_return)}</td>
                      <td style={{ padding: '1rem 0' }}>{formatPct(entry.excess_return)}</td>
                      <td style={{ padding: '1rem 0', color: 'var(--danger)' }}>-{parseFloat(entry.units_transferred).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
