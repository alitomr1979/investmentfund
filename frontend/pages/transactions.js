import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function Transactions({ user, users, reload, onLogout, API_BASE }) {
  const [txUserId, setTxUserId] = useState('');
  const [txType, setTxType] = useState('deposit');
  const [txAmount, setTxAmount] = useState('');
  
  const [txHistory, setTxHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/transactions?limit=25`);
      const data = await res.json();
      setTxHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (user.role !== 'admin') {
    return <Layout user={user} onLogout={onLogout}><p>Access denied.</p></Layout>;
  }

  const handleTransaction = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(txUserId),
          transaction_type: txType,
          amount_fiat: txAmount
        })
      });
      setTxAmount('');
      alert('Transaction successful');
      reload();
      fetchHistory();
    } catch (err) {
      alert('Error processing transaction');
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <h1 style={{ fontSize: '2.5rem', margin: '0 0 2rem 0' }}>Transactions</h1>
      
      <div className="glass-panel" style={{ maxWidth: '600px' }}>
        <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Register Transaction</h2>
        <form onSubmit={handleTransaction}>
          <div className="form-group">
            <label>User</label>
            <select className="input" required value={txUserId} onChange={e=>setTxUserId(e.target.value)}>
              <option value="">Select User...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select className="input" value={txType} onChange={e=>setTxType(e.target.value)}>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </div>
          <div className="form-group">
            <label>Amount (Fiat)</label>
            <input className="input" type="number" step="0.01" required value={txAmount} onChange={e=>setTxAmount(e.target.value)} />
          </div>
          <button className="btn btn-success" style={{width:'100%'}}>Submit</button>
        </form>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Transaction History</h2>
        {loading ? (
          <p className="text-muted">Loading transactions...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem 0' }}>Investor</th>
                  <th style={{ padding: '1rem 0' }}>Type</th>
                  <th style={{ padding: '1rem 0' }}>Date</th>
                  <th style={{ padding: '1rem 0' }}>Executed NAV</th>
                  <th style={{ padding: '1rem 0' }}>Amount ($)</th>
                  <th style={{ padding: '1rem 0' }}>Balance (Units)</th>
                  <th style={{ padding: '1rem 0' }}>Balance ($)</th>
                </tr>
              </thead>
              <tbody>
                {txHistory.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>No transactions found.</td></tr>
                ) : txHistory.map((tx, i) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'transparent' }}>
                    <td style={{ padding: '1rem 0', fontWeight: 600 }}>{tx.investor_name}</td>
                    <td style={{ padding: '1rem 0', textTransform: 'uppercase', color: tx.transaction_type === 'deposit' ? 'var(--success)' : 'var(--danger)' }}>
                      {tx.transaction_type}
                    </td>
                    <td style={{ padding: '1rem 0' }}>{new Date(tx.effective_date).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem 0' }}>${parseFloat(tx.nav_at_transaction).toFixed(4)}</td>
                    <td style={{ padding: '1rem 0' }}>${parseFloat(tx.amount_fiat).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                    <td style={{ padding: '1rem 0' }}>{parseFloat(tx.running_balance_units).toFixed(4)}</td>
                    <td style={{ padding: '1rem 0', fontWeight: 600 }}>${parseFloat(tx.running_balance_fiat).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
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
