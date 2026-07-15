import '../styles/globals.css'
import { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:8000';

export default function App({ Component, pageProps }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [fundStatus, setFundStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async (userToSet = currentUser) => {
    try {
      const usersRes = await fetch(`${API_BASE}/users`);
      const usersData = await usersRes.json();
      setUsers(usersData);

      const fundRes = await fetch(`${API_BASE}/fund-status`);
      const fundData = await fundRes.json();
      setFundStatus(fundData);

      if (userToSet) {
        const updatedUser = usersData.find(u => u.id === userToSet.id);
        setCurrentUser(updatedUser);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div className="container"><p>Loading...</p></div>;

  if (users.length === 0) {
    return <SetupAdmin onSetup={(u) => { setCurrentUser(u); loadData(u); }} />;
  }

  if (!currentUser) {
    return <Login users={users} onLogin={(u) => setCurrentUser(u)} />;
  }

  return (
    <Component 
      {...pageProps} 
      user={currentUser} 
      users={users} 
      fundStatus={fundStatus} 
      reload={loadData} 
      onLogout={() => setCurrentUser(null)} 
      API_BASE={API_BASE}
    />
  );
}

function SetupAdmin({ onSetup }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role: 'admin' })
    });
    const data = await res.json();
    onSetup(data);
  };

  return (
    <div className="container">
      <div className="glass-panel" style={{ maxWidth: '400px', margin: '10vh auto' }}>
        <div className="header" style={{ marginBottom: '1.5rem' }}>
          <h1>Elite Fund</h1>
        </div>
        <p className="text-muted" style={{ marginBottom: '2rem', textAlign: 'center' }}>No users found. Create the Master Admin account.</p>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Name</label>
            <input className="input" required value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <button className="btn" style={{ width: '100%' }}>Create Admin</button>
        </form>
      </div>
    </div>
  );
}

function Login({ users, onLogin }) {
  return (
    <div className="container">
      <div className="glass-panel" style={{ maxWidth: '400px', margin: '10vh auto' }}>
        <div className="header">
          <h1>Elite Fund</h1>
          <p className="text-muted" style={{marginTop:'0.5rem'}}>Select your account</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {users.map(u => (
            <button key={u.id} className="btn" onClick={() => onLogin(u)} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
              <span>{u.name}</span>
              <span className="text-muted" style={{ fontSize: '0.8rem', paddingTop: '2px' }}>{u.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
