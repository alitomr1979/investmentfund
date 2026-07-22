import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function Statement({ user, users, onLogout, API_BASE }) {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedInvestor, setSelectedInvestor] = useState(user.role === 'admin' ? 'all' : user.id);
  const [period, setPeriod] = useState('Since Inception');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchStatements = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/reports/investor-statement`;
      const params = new URLSearchParams();
      if (selectedInvestor !== 'all') {
        params.append('user_id', selectedInvestor);
      }
      
      let start = null;
      let end = new Date();
      
      if (period === 'YTD') {
        start = new Date(end.getFullYear(), 0, 1);
      } else if (period === 'Last Month') {
        start = new Date();
        start.setMonth(start.getMonth() - 1);
      } else if (period === 'Last Quarter') {
        start = new Date();
        start.setMonth(start.getMonth() - 3);
      } else if (period === 'Custom') {
        start = customStart ? new Date(customStart) : null;
        end = customEnd ? new Date(customEnd) : new Date();
      }
      
      if (start) {
        params.append('start_date', start.toISOString().split('T')[0]);
      }
      if (period === 'Custom' && customEnd) {
        params.append('end_date', end.toISOString().split('T')[0]);
      } else if (period !== 'Custom') {
        params.append('end_date', end.toISOString().split('T')[0]);
      }
      
      const queryStr = params.toString();
      if (queryStr) url += `?${queryStr}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStatements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatUSD = (val) => `$${parseFloat(val).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  const exportCSV = () => {
    let csv = "Investor,Initial Balance,Total Contributions,Total Withdrawals,Net Profit,Ending Balance\n";
    statements.forEach(r => {
      csv += `"${r.investor_name}",${r.initial_balance},${r.total_contributions},${r.total_withdrawals},${r.net_profit},${r.ending_balance}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investor_statement.csv';
    a.click();
  };
  
  const exportExcel = () => {
    let csv = "Investor\tInitial Balance\tTotal Contributions\tTotal Withdrawals\tNet Profit\tEnding Balance\n";
    statements.forEach(r => {
      csv += `"${r.investor_name}"\t${r.initial_balance}\t${r.total_contributions}\t${r.total_withdrawals}\t${r.net_profit}\t${r.ending_balance}\n`;
    });
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investor_statement.xls';
    a.click();
  };

  const totalInitial = statements.reduce((s, r) => s + parseFloat(r.initial_balance), 0);
  const totalContributions = statements.reduce((s, r) => s + parseFloat(r.total_contributions), 0);
  const totalWithdrawals = statements.reduce((s, r) => s + parseFloat(r.total_withdrawals), 0);
  const totalEnding = statements.reduce((s, r) => s + parseFloat(r.ending_balance), 0);
  const totalNetProfit = statements.reduce((s, r) => s + parseFloat(r.net_profit), 0);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Capital Statement</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" onClick={exportCSV}>Export to CSV</button>
          <button className="btn" onClick={exportExcel}>Export to Excel</button>
        </div>
      </div>
      
      <div className="glass-panel" style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        {user.role === 'admin' && (
          <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
            <label>Investor</label>
            <select className="input" value={selectedInvestor} onChange={e => setSelectedInvestor(e.target.value)}>
              <option value="all">All Investors</option>
              {users && users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
          <label>Period</label>
          <select className="input" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="Since Inception">Since Inception</option>
            <option value="YTD">YTD</option>
            <option value="Last Month">Last Month</option>
            <option value="Last Quarter">Last Quarter</option>
            <option value="Custom">Custom</option>
          </select>
        </div>
        
        {period === 'Custom' && (
          <>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Start Date</label>
              <input type="date" className="input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>End Date</label>
              <input type="date" className="input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          </>
        )}
        
        <button className="btn" onClick={fetchStatements} disabled={loading}>
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {statements.length > 0 && (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '1rem' }}>Investor</th>
                <th style={{ padding: '1rem' }}>Initial Balance</th>
                <th style={{ padding: '1rem' }}>Contributions</th>
                <th style={{ padding: '1rem' }}>Withdrawals</th>
                <th style={{ padding: '1rem' }}>Net Profit</th>
                <th style={{ padding: '1rem' }}>Ending Balance</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>{r.investor_name}</td>
                  <td style={{ padding: '1rem' }}>{formatUSD(r.initial_balance)}</td>
                  <td style={{ padding: '1rem', color: 'var(--success)' }}>+{formatUSD(r.total_contributions)}</td>
                  <td style={{ padding: '1rem', color: 'var(--danger)' }}>-{formatUSD(r.total_withdrawals)}</td>
                  <td style={{ padding: '1rem', color: parseFloat(r.net_profit) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatUSD(r.net_profit)}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{formatUSD(r.ending_balance)}</td>
                </tr>
              ))}
              {statements.length > 1 && selectedInvestor === 'all' && (
                <tr style={{ borderTop: '2px solid var(--glass-border)', fontWeight: 'bold', background: 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '1rem' }}>GLOBAL TOTALS</td>
                  <td style={{ padding: '1rem' }}>{formatUSD(totalInitial)}</td>
                  <td style={{ padding: '1rem', color: 'var(--success)' }}>+{formatUSD(totalContributions)}</td>
                  <td style={{ padding: '1rem', color: 'var(--danger)' }}>-{formatUSD(totalWithdrawals)}</td>
                  <td style={{ padding: '1rem', color: totalNetProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatUSD(totalNetProfit)}
                  </td>
                  <td style={{ padding: '1rem' }}>{formatUSD(totalEnding)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!loading && statements.length === 0 && (
        <p className="text-muted">No data found for the selected criteria.</p>
      )}
    </Layout>
  );
}
