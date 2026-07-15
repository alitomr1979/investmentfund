import Layout from '../components/Layout';
import { useState } from 'react';

export default function Transactions({ user, users, reload, onLogout, API_BASE }) {
  const [txUserId, setTxUserId] = useState('');
  const [txType, setTxType] = useState('deposit');
  const [txAmount, setTxAmount] = useState('');
  
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
    </Layout>
  );
}
