import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function InvestorPerformance({ user, users, onLogout, API_BASE }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedInvestor, setSelectedInvestor] = useState(user.role === 'admin' ? 'all' : user.id);
  const [period, setPeriod] = useState('Since Inception');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/reports/investor-performance`;
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
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPct = (val) => `${(parseFloat(val) * 100).toFixed(2)}%`;
  const formatUSD = (val) => `$${parseFloat(val).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  const exportCSV = () => {
    let csv = "Investor,Beginning Value,Net Contributions,Net Withdrawals,Ending Value,Gain/Loss,Total Return,Annualized Return\n";
    reports.forEach(r => {
      csv += `"${r.investor_name}",${r.beginning_value},${r.net_contributions},${r.net_withdrawals},${r.ending_value},${r.investment_gain_loss},${r.total_return_percentage},${r.annualized_return_percentage}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investor_performance.csv';
    a.click();
  };
  
  const exportExcel = () => {
    let csv = "Investor\tBeginning Value\tNet Contributions\tNet Withdrawals\tEnding Value\tGain/Loss\tTotal Return\tAnnualized Return\n";
    reports.forEach(r => {
      csv += `"${r.investor_name}"\t${r.beginning_value}\t${r.net_contributions}\t${r.net_withdrawals}\t${r.ending_value}\t${r.investment_gain_loss}\t${r.total_return_percentage}\t${r.annualized_return_percentage}\n`;
    });
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investor_performance.xls';
    a.click();
  };

  const totalBeginning = reports.reduce((s, r) => s + parseFloat(r.beginning_value), 0);
  const totalContributions = reports.reduce((s, r) => s + parseFloat(r.net_contributions), 0);
  const totalWithdrawals = reports.reduce((s, r) => s + parseFloat(r.net_withdrawals), 0);
  const totalEnding = reports.reduce((s, r) => s + parseFloat(r.ending_value), 0);
  const totalGainLoss = reports.reduce((s, r) => s + parseFloat(r.investment_gain_loss), 0);
  
  const baseForReturn = totalBeginning + totalContributions;
  const globalTotalReturn = baseForReturn > 0 ? (totalGainLoss / baseForReturn) : 0;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Investor Performance</h1>
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
        
        <button className="btn" onClick={fetchReports} disabled={loading}>
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {reports.length > 0 && (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '1rem' }}>Investor</th>
                <th style={{ padding: '1rem' }}>Beginning Value</th>
                <th style={{ padding: '1rem' }}>Contributions</th>
                <th style={{ padding: '1rem' }}>Withdrawals</th>
                <th style={{ padding: '1rem' }}>Gain/Loss</th>
                <th style={{ padding: '1rem' }}>Ending Value</th>
                <th style={{ padding: '1rem' }}>Total Return</th>
                <th style={{ padding: '1rem' }}>Ann. Return</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>{r.investor_name}</td>
                  <td style={{ padding: '1rem' }}>{formatUSD(r.beginning_value)}</td>
                  <td style={{ padding: '1rem', color: 'var(--success)' }}>+{formatUSD(r.net_contributions)}</td>
                  <td style={{ padding: '1rem', color: 'var(--danger)' }}>-{formatUSD(r.net_withdrawals)}</td>
                  <td style={{ padding: '1rem', color: parseFloat(r.investment_gain_loss) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatUSD(r.investment_gain_loss)}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{formatUSD(r.ending_value)}</td>
                  <td style={{ padding: '1rem', color: parseFloat(r.total_return_percentage) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatPct(r.total_return_percentage)}
                  </td>
                  <td style={{ padding: '1rem' }}>{formatPct(r.annualized_return_percentage)}</td>
                </tr>
              ))}
              {reports.length > 1 && selectedInvestor === 'all' && (
                <tr style={{ borderTop: '2px solid var(--glass-border)', fontWeight: 'bold', background: 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '1rem' }}>GLOBAL TOTALS</td>
                  <td style={{ padding: '1rem' }}>{formatUSD(totalBeginning)}</td>
                  <td style={{ padding: '1rem', color: 'var(--success)' }}>+{formatUSD(totalContributions)}</td>
                  <td style={{ padding: '1rem', color: 'var(--danger)' }}>-{formatUSD(totalWithdrawals)}</td>
                  <td style={{ padding: '1rem', color: totalGainLoss >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatUSD(totalGainLoss)}
                  </td>
                  <td style={{ padding: '1rem' }}>{formatUSD(totalEnding)}</td>
                  <td style={{ padding: '1rem', color: globalTotalReturn >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatPct(globalTotalReturn)}
                  </td>
                  <td style={{ padding: '1rem' }}>-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!loading && reports.length === 0 && (
        <p className="text-muted">No data found for the selected criteria.</p>
      )}
    </Layout>
  );
}
