import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

const API_BASE = 'http://localhost:5000/api';

// Helper for fetch with credentials
const apiFetch = (url, options = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });
};

function App() {
  const [page, setPage] = useState('loading');
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState({ text: '', type: 'success' });

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const resp = await apiFetch(`${API_BASE}/me`);
        const data = await resp.json();
        if (resp.ok && data.user) {
          setUser(data.user);
          setPage('dashboard');
        } else {
          setPage('login');
        }
      } catch (e) {
        setPage('login');
      }
    };
    checkAuth();
  }, []);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const body = Object.fromEntries(data.entries());

    try {
      const resp = await apiFetch(`${API_BASE}/register`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const result = await resp.json();
      if (resp.ok) {
        setUser(result.user);
        setPage('dashboard');
        showMessage('Registration successful!');
      } else {
        showMessage(result.error, 'error');
      }
    } catch (e) {
      showMessage('Server error', 'error');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const body = Object.fromEntries(data.entries());

    try {
      const resp = await apiFetch(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const result = await resp.json();
      if (resp.ok) {
        setUser(result.user);
        setPage('dashboard');
        showMessage('Login successful!');
      } else {
        showMessage(result.error, 'error');
      }
    } catch (e) {
      showMessage('Server error', 'error');
    }
  };

  const handleLogout = async () => {
    await apiFetch(`${API_BASE}/logout`, { method: 'POST' });
    setUser(null);
    setPage('login');
  };

  if (page === 'loading') {
    return <div className="auth-container"><h1>Loading...</h1></div>;
  }

  if (page === 'login') {
    return (
      <div className="auth-container">
        <div className="auth-card glass">
          <h1>Login</h1>
          <form onSubmit={handleLoginSubmit}>
            <div className="input-group">
              <label>Email</label>
              <input name="email" type="email" required placeholder="admin@bank.com" />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input name="password" type="password" required placeholder="••••••••" />
            </div>
            <button type="submit">Unlock Vault</button>
            <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              No account? <span onClick={() => setPage('register')} style={{ color: '#38bdf8', cursor: 'pointer' }}>Register</span>
            </p>
          </form>
          {message.text && <div className={`message ${message.type}`} style={{ marginTop: '1rem' }}>{message.text}</div>}
        </div>
      </div>
    );
  }

  if (page === 'register') {
    return (
      <div className="auth-container">
        <div className="auth-card glass">
          <h1>Create Account</h1>
          <form onSubmit={handleRegisterSubmit}>
            <div className="input-group">
              <label>Full Name</label>
              <input name="name" type="text" required placeholder="John Doe" />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input name="email" type="email" required placeholder="john@example.com" />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input name="password" type="password" required placeholder="••••••••" />
            </div>
            <button type="submit">Join Kodbank</button>
            <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              Have an account? <span onClick={() => setPage('login')} style={{ color: '#38bdf8', cursor: 'pointer' }}>Login</span>
            </p>
          </form>
          {message.text && <div className={`message ${message.type}`} style={{ marginTop: '1rem' }}>{message.text}</div>}
        </div>
      </div>
    );
  }

  if (page === 'dashboard' && user) {
    return (
      <div className="app-layout">
        <AppContent user={user} handleLogout={handleLogout} apiFetch={apiFetch} />
      </div>
    );
  }

  return null;
}

function AppContent({ user, handleLogout, apiFetch }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        <Header user={user} handleLogout={handleLogout} />
        <DashboardContent user={user} apiFetch={apiFetch} handleLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      <AiSidebar apiFetch={apiFetch} />
    </>
  );
}

function Sidebar({ activeTab, setActiveTab }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard },
    { id: 'deposit', label: 'Deposit', icon: Icons.Deposit },
    { id: 'withdraw', label: 'Withdraw', icon: Icons.Withdraw },
    { id: 'transfer', label: 'Transfer', icon: Icons.Transfer },
    { id: 'transactions', label: 'Transactions', icon: Icons.Transaction },
    { id: 'profile', label: 'Profile', icon: Icons.Profile },
  ];

  return (
    <div className="sidebar glass">
      {items.map(item => (
        <div
          key={item.id}
          className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => setActiveTab(item.id)}
        >
          <item.icon />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function Header({ user, handleLogout }) {
  return (
    <div className="header glass">
      <div className="bank-logo">
        <Icons.Bank />
        <div>
          <h2>STATE BANK OF INDIA</h2>
          <p style={{ fontSize: '0.65rem', color: '#b0c4de' }}>INTERNET BANKING</p>
        </div>
      </div>
      <div className="user-profile">
        <span style={{ fontSize: '0.875rem' }}>{user.name}</span>
        <button onClick={handleLogout} style={{ width: 'auto', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>Logout</button>
      </div>
    </div>
  );
}

function DashboardContent({ user, apiFetch, handleLogout, activeTab, setActiveTab }) {
  const [balance, setBalance] = useState(user.balance);
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState({ text: '', type: '' });

  const refreshBalance = async () => {
    try {
      const resp = await apiFetch(`${API_BASE}/balance`);
      const data = await resp.json();
      if (resp.ok) setBalance(data.balance);
      else if (resp.status === 401) handleLogout();
    } catch (e) { }
  };

  const fetchTransactions = async () => {
    try {
      const resp = await apiFetch(`${API_BASE}/transactions`);
      const data = await resp.json();
      if (resp.ok) setTransactions(data.transactions);
    } catch (e) { }
  };

  useEffect(() => {
    refreshBalance();
    fetchTransactions();
  }, [activeTab]);

  const handleAction = async (e, endpoint, successMsg) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    try {
      const resp = await apiFetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const result = await resp.json();
      if (resp.ok) {
        setStatus({ text: successMsg || 'Success!', type: 'success' });
        refreshBalance();
        fetchTransactions();
        e.target.reset();
        setTimeout(() => setStatus({ text: '', type: '' }), 3000);
      } else {
        setStatus({ text: result.error, type: 'error' });
      }
    } catch (e) { setStatus({ text: 'Action failed', type: 'error' }); }
  };

  return (
    <div className="dashboard-view">
      {status.text && <div className={`message ${status.type}`} style={{ marginBottom: '1.5rem' }}>{status.text}</div>}

      {activeTab === 'dashboard' && (
        <>
          <h1 className="view-title">Account Dashboard</h1>
          <div className="stats-grid">
            <div className="stat-card glass">
              <div className="stat-icon"><Icons.Deposit /></div>
              <div>
                <p className="stat-label">Current Balance</p>
                <p className="stat-value">₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="stat-card glass">
              <div className="stat-icon"><Icons.Profile /></div>
              <div>
                <p className="stat-label">Account Number</p>
                <p className="stat-value">089525140</p>
              </div>
            </div>
            <div className="stat-card glass">
              <div className="stat-icon"><Icons.Dashboard /></div>
              <div>
                <p className="stat-label">IFSC Code</p>
                <p className="stat-value">SBIN00012</p>
              </div>
            </div>
          </div>

          <h2 className="section-header">Quick Actions</h2>
          <div className="actions-grid">
            <div className="action-btn glass" onClick={() => setActiveTab('deposit')}><Icons.Deposit /> Deposit Funds</div>
            <div className="action-btn glass" onClick={() => setActiveTab('withdraw')}><Icons.Withdraw /> Withdraw Funds</div>
            <div className="action-btn glass" style={{ background: 'var(--primary)' }} onClick={() => setActiveTab('transfer')}><Icons.Transfer /> Transfer Money</div>
          </div>

          <TransactionsTable transactions={transactions.slice(0, 5)} />
        </>
      )}

      {activeTab === 'deposit' && (
        <ActionForm title="Deposit Funds" endpoint="deposit" label="Amount to Deposit" successMsg="Funds deposited successfully!" handleAction={handleAction} icon={<Icons.Deposit />} />
      )}

      {activeTab === 'withdraw' && (
        <ActionForm title="Withdraw Funds" endpoint="withdraw" label="Amount to Withdraw" successMsg="Funds withdrawn successfully!" handleAction={handleAction} icon={<Icons.Withdraw />} />
      )}

      {activeTab === 'transfer' && (
        <div className="glass" style={{ padding: '2.5rem', borderRadius: '1.5rem', maxWidth: '500px' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Icons.Transfer /> Transfer Money</h2>
          <form onSubmit={(e) => handleAction(e, 'transfer', 'Transfer successful!')}>
            <div className="input-group">
              <label>Recipient Email</label>
              <input name="toEmail" required placeholder="recipient@example.com" />
            </div>
            <div className="input-group">
              <label>Amount (₹)</label>
              <input name="amount" type="number" step="0.01" required placeholder="0.00" />
            </div>
            <button type="submit">Verify & Confirm Transfer</button>
          </form>
        </div>
      )}

      {activeTab === 'transactions' && (
        <>
          <h1 className="view-title">Transaction History</h1>
          <TransactionsTable transactions={transactions} full />
        </>
      )}

      {activeTab === 'profile' && (
        <div className="glass" style={{ padding: '2.5rem', borderRadius: '1.5rem', maxWidth: '500px' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>User Profile</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              <p className="stat-label">Full Name</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{user.name}</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              <p className="stat-label">Email Address</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{user.email}</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              <p className="stat-label">Account Status</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#4ade80' }}>ACTIVE</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionsTable({ transactions, full }) {
  return (
    <div className="data-table-container glass">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h3>{full ? 'History' : 'Recent Transactions'}</h3>
        {!full && <span style={{ color: '#38bdf8', fontSize: '0.875rem', cursor: 'pointer' }}>View All</span>}
      </div>
      {transactions.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id}>
                <td>{new Date(t.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td>{t.description}</td>
                <td><span className={`badge ${t.type === 'CREDIT' ? 'badge-success' : 'badge-error'}`} style={t.type === 'DEBIT' ? { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' } : {}}>{t.type}</span></td>
                <td style={{ color: t.type === 'CREDIT' ? '#4ade80' : '#f87171' }}>₹{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td><span className="badge badge-success">SUCCESS</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No transactions found.</p>
      )}
    </div>
  );
}

function ActionForm({ title, endpoint, label, successMsg, handleAction, icon }) {
  return (
    <div className="glass" style={{ padding: '2.5rem', borderRadius: '1.5rem', maxWidth: '450px' }}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>{icon} {title}</h2>
      <form onSubmit={(e) => handleAction(e, endpoint, successMsg)}>
        <div className="input-group">
          <label>{label} (₹)</label>
          <input name="amount" type="number" step="0.01" required placeholder="0.00" />
        </div>
        <button type="submit">Submit Request</button>
      </form>
    </div>
  );
}

function AiSidebar({ apiFetch }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hello! I'm your Kodbank AI assistant. How can I help you today?", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await apiFetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: input })
      });
      const data = await resp.json();

      if (resp.ok) {
        setMessages(prev => [...prev, { text: data.response, sender: 'ai' }]);
      } else {
        setMessages(prev => [...prev, { text: 'Error: ' + (data.error || 'Failed to get response'), sender: 'ai' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { text: 'Connection error', sender: 'ai' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-sidebar-container">
      {!isOpen && (
        <button className="ai-sidebar-trigger glass" onClick={() => setIsOpen(true)}>
          AI AGENT 👤
        </button>
      )}

      <div className={`ai-panel glass ${isOpen ? 'open' : ''}`}>
        <div className="ai-panel-header">
          <h2>AI Assistant</h2>
          <button className="close-panel" onClick={() => setIsOpen(false)}>&times;</button>
        </div>

        <div className="chat-container">
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.sender}`}>
                {m.text}
              </div>
            ))}
            {loading && <div className="chat-bubble ai">...</div>}
          </div>
          <form className="chat-input-area glass" onSubmit={handleSend} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', marginTop: 'auto' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask AI anything..."
              disabled={loading}
              style={{ borderRadius: '0.5rem' }}
            />
            <button type="submit" disabled={loading} style={{ width: 'auto', padding: '0.75rem 1.25rem', marginTop: '0.5rem' }}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
