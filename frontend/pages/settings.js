import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function Settings({ user, users, reload, onLogout, API_BASE }) {
  if (user.role !== 'admin') {
    return <Layout user={user} onLogout={onLogout}><p>Access denied.</p></Layout>;
  }

  const [selectedUser, setSelectedUser] = useState('');
  const [feePercentage, setFeePercentage] = useState('');

  const [feeFrequency, setFeeFrequency] = useState('monthly');
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then(res => res.json())
      .then(data => {
        setFeeFrequency(data.fee_collection_frequency || 'monthly');
        setLoadingSettings(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingSettings(false);
      });
  }, [API_BASE]);

  const handleUpdateFee = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/users/${selectedUser}/fee`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performance_fee_percentage: parseFloat(feePercentage) / 100 // converting 50 to 0.50
        })
      });
      alert('Fee percentage updated successfully!');
      reload();
      setSelectedUser('');
      setFeePercentage('');
    } catch (err) {
      alert('Error updating fee');
    }
  };

  const handleUpdateFrequency = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fee_collection_frequency: feeFrequency })
      });
      alert('Fee frequency updated successfully!');
    } catch(err) {
      alert('Error updating frequency');
    }
  };

  const investors = users;

  return (
    <Layout user={user} onLogout={onLogout}>
      <h1 style={{ fontSize: '2.5rem', margin: '0 0 2rem 0' }}>Settings</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="glass-panel" style={{ maxWidth: '600px' }}>
          <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Edit Performance Fee</h2>
          <form onSubmit={handleUpdateFee}>
            <div className="form-group">
              <label>Select Investor</label>
              <select className="input" required value={selectedUser} onChange={e=>setSelectedUser(e.target.value)}>
                <option value="">Select Investor...</option>
                {investors.map(u => <option key={u.id} value={u.id}>{u.name} (Current: {parseFloat(u.performance_fee_percentage) * 100}%)</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>New Fee Percentage (%)</label>
              <input 
                className="input" 
                type="number" 
                step="0.01" 
                required 
                value={feePercentage} 
                onChange={e=>setFeePercentage(e.target.value)} 
                placeholder="e.g. 50"
              />
            </div>
            <button className="btn btn-success" style={{width:'100%'}}>Save Settings</button>
          </form>
        </div>

        <div className="glass-panel" style={{ maxWidth: '600px' }}>
          <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Fee Collection Frequency</h2>
          {!loadingSettings ? (
            <form onSubmit={handleUpdateFrequency}>
              <div className="form-group">
                <label>Periodicidad de Cobro de Fees</label>
                <select className="input" value={feeFrequency} onChange={e=>setFeeFrequency(e.target.value)}>
                  <option value="monthly">Mensual (Monthly)</option>
                  <option value="quarterly">Trimestral (Quarterly)</option>
                  <option value="annual">Anual (Annual)</option>
                </select>
              </div>
              <button className="btn btn-success" style={{width:'100%'}}>Save Frequency Settings</button>
            </form>
          ) : (
            <p>Loading settings...</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
