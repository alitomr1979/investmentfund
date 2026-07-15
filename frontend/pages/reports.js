import Layout from '../components/Layout';
import { useState } from 'react';

export default function Reports({ user, reload, onLogout, API_BASE }) {
  const [evalEndDate, setEvalEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [evaluating, setEvaluating] = useState(false);

  if (user.role !== 'admin') {
    return <Layout user={user} onLogout={onLogout}><p>Access denied.</p></Layout>;
  }

  const handleEval = async (e) => {
    e.preventDefault();
    setEvaluating(true);
    try {
      const res = await fetch(`${API_BASE}/evaluate-performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: user.id,
          end_date: evalEndDate
        })
      });
      const data = await res.json();
      alert(data.message + (data.fees_charged !== undefined ? ` (Fees charged to ${data.fees_charged} investors)` : ''));
      reload();
    } catch (err) {
      alert("Error evaluating performance");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <h1 style={{ fontSize: '2.5rem', margin: '0 0 2rem 0' }}>HWM & Reports</h1>
      
      <div className="glass-panel" style={{ maxWidth: '600px' }}>
        <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Evaluate Fees (HWM)</h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
          Executes the performance evaluation comparing the fund's returns against the SPY benchmark. Modifies user balances dynamically.
        </p>
        <form onSubmit={handleEval}>
          <div className="form-group">
            <label>End Date</label>
            <input className="input" type="date" required value={evalEndDate} onChange={e=>setEvalEndDate(e.target.value)} />
          </div>
          <button className="btn btn-success" style={{width:'100%'}} disabled={evaluating}>
            {evaluating ? 'Evaluating...' : 'Run Evaluation'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
