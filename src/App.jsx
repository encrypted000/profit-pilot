import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Bills from './pages/Bills'
import Inventory from './pages/Inventory'
import NewBill from './pages/NewBill'
import Customers from './pages/Customers'
import Expenses from './pages/Expenses'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'bills',     label: 'Bills',      icon: '🧾' },
  { id: 'customers', label: 'Customers',  icon: '👥' },
  { id: 'inventory', label: 'Inventory',  icon: '📦' },
  { id: 'expenses',  label: 'Expenses',   icon: '💸' },
]

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  bills:     'Bills & Invoices',
  customers: 'Customers',
  inventory: 'Inventory',
  expenses:  'Expenses',
  'new-bill': 'New Invoice',
}

export default function App() {
  const [page, setPage] = useState('dashboard')

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-text">TRS</span>
          <span className="logo-sub">Business Manager</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item${page === n.id || (page === 'new-bill' && n.id === 'bills') ? ' active' : ''}`}
              onClick={() => setPage(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>v1.0.0</span>
        </div>
      </aside>

      {/* Main area */}
      <div className="main-area">
        <header className="topbar">
          <h1 className="page-title">{PAGE_TITLES[page]}</h1>
          {page === 'new-bill' && (
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('bills')}>
              ← Back to Bills
            </button>
          )}
        </header>
        <main className="content">
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'bills'     && <Bills onNewBill={() => setPage('new-bill')} />}
          {page === 'customers' && <Customers />}
          {page === 'inventory' && <Inventory />}
          {page === 'expenses'  && <Expenses />}
          {page === 'new-bill'  && <NewBill onSaved={() => setPage('bills')} />}
        </main>
      </div>
    </div>
  )
}
