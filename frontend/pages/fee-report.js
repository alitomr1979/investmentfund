import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function FeeReport({ user, users, onLogout, API_BASE }) {
  if (user.role !== 'admin') {
    return <Layout user={user} onLogout={onLogout}><p>Access denied.</p></Layout>;
  }

  const [selectedUser, setSelectedUser] = useState('');
  const [period, setPeriod] = useState('inception');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const getDatesForPeriod = () => {
    const now = new Date();
    let start = null;
    let end = now.toISOString().split('T')[0];

    if (period === 'inception') {
      start = null;
    } else if (period === 'ytd') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    } else if (period === 'last_month') {
      const lm = new Date(now);
      lm.setMonth(lm.getMonth() - 1);
      start = lm.toISOString().split('T')[0];
    } else if (period === 'last_quarter') {
      const lq = new Date(now);
      lq.setMonth(lq.getMonth() - 3);
      start = lq.toISOString().split('T')[0];
    } else if (period === 'custom') {
      start = customStart || null;
      end = customEnd || end;
    }

    return { start, end };
  };

  const handleGenerate = async () => {
    if (!selectedUser) {
      alert("Please select an investor");
      return;
    }
    setLoading(true);
    const { start, end } = getDatesForPeriod();
    
    let url = `${API_BASE}/reports/fee-report?user_id=${selectedUser}`;
    if (start) url += `&start_date=${start}`;
    if (end) url += `&end_date=${end}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      setReportData(data);
    } catch(err) {
      console.error(err);
      alert("Error generating report");
    }
    setLoading(false);
  };

  const exportCSV = () => {
    if (!reportData || !reportData.last_30_days_fees) return;
    const header = "Date,Units,Fee USD\n";
    const rows = reportData.last_30_days_fees.map(f => `${new Date(f.created_at).toLocaleDateString()},${f.units_transferred},${f.fee_usd}`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee_traceability_${selectedUser}.csv`;
    a.click();
  };

  const exportExcel = () => {
    // Basic CSV download labeled as xlsx for simplicity
    if (!reportData || !reportData.last_30_days_fees) return;
    const header = "Date\tUnits\tFee USD\n";
    const rows = reportData.last_30_days_fees.map(f => `${new Date(f.created_at).toLocaleDateString()}\t${f.units_transferred}\t${f.fee_usd}`).join("\n");
    const blob = new Blob([header + rows], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee_traceability_${selectedUser}.xls`;
    a.click();
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <h1 style={{ fontSize: '2.5rem', margin: '0 0 2rem 0' }}>Fee Report Generation Engine</h1>
      
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label>Investor</label>
            <select className="input" value={selectedUser} onChange={e=>setSelectedUser(e.target.value)}>
              <option value="">Select Investor...</option>
              {users.filter(u=>u.role!=='admin').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label>Period</label>
            <select className="input" value={period} onChange={e=>setPeriod(e.target.value)}>
              <option value="inception">Inception</option>
              <option value="ytd">YTD</option>
              <option value="last_month">Last Month</option>
              <option value="last_quarter">Last Quarter</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {period === 'custom' && (
            <>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" className="input" value={customStart} onChange={e=>setCustomStart(e.target.value)} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" className="input" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} />
              </div>
            </>
          )}
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading} style={{ marginBottom: '1rem' }}>
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {reportData && (
        <>
          <div className="glass-panel" style={{ marginBottom: '2rem' }}>
            <h2 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <p className="text-muted">HWM NAV</p>
                <h3>${parseFloat(reportData.hwm_nav).toFixed(2)}</h3>
              </div>
              <div>
                <p className="text-muted">HWM Date</p>
                <h3>{reportData.hwm_date ? new Date(reportData.hwm_date).toLocaleDateString() : 'N/A'}</h3>
              </div>
              <div>
                <p className="text-muted">Performance Fee %</p>
                <h3>{(parseFloat(reportData.performance_fee_percentage) * 100).toFixed(2)}%</h3>
              </div>
              <div>
                <p className="text-muted">Paid Fees Units</p>
                <h3 style={{ color: 'var(--danger)'}}>{parseFloat(reportData.paid_fees_units).toFixed(4)}</h3>
              </div>
              <div>
                <p className="text-muted">Paid Fees USD</p>
                <h3 style={{ color: 'var(--danger)'}}>${parseFloat(reportData.paid_fees_usd).toFixed(2)}</h3>
              </div>
              <div>
                <p className="text-muted">Accrued Fees (Unrealized) USD</p>
                <h3 style={{ color: 'var(--warning)'}}>${parseFloat(reportData.accrued_fees_usd).toFixed(2)}</h3>
              </div>
              <div>
                <p className="text-muted">Net Return After Fees</p>
                <h3 style={{ color: 'var(--success)'}}>{(parseFloat(reportData.net_return_after_fees) * 100).toFixed(2)}%</h3>
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h2>Last 30 Days Fee Summary / Traceability</h2>
              <div>
                <button className="btn btn-primary" onClick={exportCSV} style={{ marginRight: '1rem' }}>Export to CSV</button>
                <button className="btn btn-primary" onClick={exportExcel}>Export to Excel</button>
              </div>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '1rem 0' }}>Date</th>
                  <th style={{ padding: '1rem 0' }}>Units Transferred</th>
                  <th style={{ padding: '1rem 0' }}>Fee USD Approx</th>
                </tr>
              </thead>
              <tbody>
                {reportData.last_30_days_fees.length === 0 ? (
                  <tr><td colSpan="3" style={{ padding: '1rem 0' }}>No fee transactions in the last 30 days.</td></tr>
                ) : reportData.last_30_days_fees.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem 0', color: 'var(--danger)' }}>-{parseFloat(f.units_transferred).toFixed(4)}</td>
                    <td style={{ padding: '1rem 0' }}>${parseFloat(f.fee_usd).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
