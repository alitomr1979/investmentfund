import Layout from '../components/Layout';
import { useState } from 'react';

export default function Users({ user, users, reload, onLogout, API_BASE }) {
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');

  if (user.role !== 'admin') {
    return <Layout user={user} onLogout={onLogout}><p>Access denied.</p></Layout>;
  }

  const handleAddInvestor = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: invName, email: invEmail, role: 'investor' })
      });
      setInvName(''); setInvEmail('');
      alert('Investor added');
      reload();
    } catch (err) {
      alert('Error adding investor');
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <h1 style={{ fontSize: '2.5rem', margin: '0 0 2rem 0' }}>Users Management</h1>
      
      <div className="glass-panel" style={{ maxWidth: '600px', marginBottom: '2rem' }}>
        <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Add New Investor</h2>
        <form onSubmit={handleAddInvestor}>
          <div className="form-group">
            <label>Name</label>
            <input className="input" required value={invName} onChange={e=>setInvName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="input" type="email" required value={invEmail} onChange={e=>setInvEmail(e.target.value)} />
          </div>
          <button className="btn btn-success" style={{width:'100%'}}>Create Investor</button>
        </form>
      </div>

      <div className="glass-panel">
        <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Registered Users</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <div>
                <strong>{u.name}</strong> <span className="text-muted">({u.email})</span>
              </div>
              <div>
                <span className="text-muted" style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>{u.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
