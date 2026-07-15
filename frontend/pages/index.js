import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/fund-status')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Family Investment Fund</h1>
      {status ? (
        <div>
          <p><strong>Total Value:</strong> ${status.total_value.toFixed(2)}</p>
          <p><strong>Total Units:</strong> {status.total_units.toFixed(4)}</p>
          <p><strong>NAV per Unit:</strong> ${status.nav_per_unit.toFixed(4)}</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
