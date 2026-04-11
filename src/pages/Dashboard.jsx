import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

const fmt = (n) => '¥' + Number(n || 0).toLocaleString('ja-JP')

function monthLabel() {
  return new Date().toLocaleString('en', { month: 'long', year: 'numeric' })
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.trsAPI.getStats().then(s => {
      setStats(s)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="empty-state"><p>Loading...</p></div>

  const {
    thisMonth, monthlyData, topProducts, lowStock,
    topCustomers, topCustomersByProfit, topExpenses, totalOutstanding,
  } = stats

  const maxTopProd    = topProducts[0]?.revenue || 1
  const maxCustSales  = topCustomers?.[0]?.total_spent || 1
  const maxCustProfit = topCustomersByProfit?.[0]?.profit || 1
  const maxExp        = topExpenses?.[0]?.total || 1

  const rankColor = i => i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c3e' : 'var(--border)'
  const rankText  = i => i <= 2 ? '#fff' : 'var(--muted)'

  function RankBadge({ i }) {
    return (
      <span style={{
        width: 22, height: 22, borderRadius: '50%', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800,
        background: rankColor(i), color: rankText(i), flexShrink: 0,
      }}>
        {i + 1}
      </span>
    )
  }

  return (
    <>
      {/* ── This Month KPI strip ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          {monthLabel()} — This Month
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
          <div className="stat-card blue">
            <span className="stat-icon">💴</span>
            <span className="stat-value" style={{ color: 'var(--blue)', fontSize: 18 }}>{fmt(thisMonth.revenue)}</span>
            <span className="stat-label">Revenue</span>
          </div>
          <div className="stat-card amber">
            <span className="stat-icon">🏷️</span>
            <span className="stat-value" style={{ color: '#d97706', fontSize: 18 }}>{fmt(thisMonth.cogs)}</span>
            <span className="stat-label">Cost of Goods</span>
          </div>
          <div className={`stat-card ${thisMonth.grossProfit >= 0 ? 'blue' : 'red'}`}>
            <span className="stat-icon">📊</span>
            <span className="stat-value" style={{ color: thisMonth.grossProfit >= 0 ? 'var(--blue)' : 'var(--red)', fontSize: 18 }}>
              {fmt(thisMonth.grossProfit)}
            </span>
            <span className="stat-label">Gross Profit</span>
          </div>
          <div className="stat-card red">
            <span className="stat-icon">💸</span>
            <span className="stat-value" style={{ color: 'var(--red)', fontSize: 18 }}>{fmt(thisMonth.expenses)}</span>
            <span className="stat-label">Expenses</span>
          </div>
          <div className={`stat-card ${thisMonth.netProfit >= 0 ? 'green' : 'red'}`}>
            <span className="stat-icon">{thisMonth.netProfit >= 0 ? '📈' : '📉'}</span>
            <span className="stat-value" style={{ color: thisMonth.netProfit >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 18 }}>
              {fmt(thisMonth.netProfit)}
            </span>
            <span className="stat-label">Net Profit</span>
          </div>
        </div>
      </div>

      {/* ── Outstanding warning ── */}
      {totalOutstanding > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div className="stat-card" style={{ borderTop: '3px solid var(--red)', flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div>
              <div className="stat-value" style={{ color: 'var(--red)', fontSize: 18 }}>{fmt(totalOutstanding)}</div>
              <div className="stat-label">Total Outstanding (unpaid bills)</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Row 1: Revenue vs Expenses chart + Low Stock ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">Revenue vs Expenses (Last 6 Months)</div>
          {monthlyData.every(m => m.revenue === 0 && m.expenses === 0) ? (
            <div className="empty-state" style={{ padding: '24px 0' }}><p>No data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '¥' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip formatter={v => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue"  name="Revenue"  fill="#1a4db3" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">⚠️ Low Stock Alert</div>
          {lowStock.length === 0 ? (
            <div style={{ color: 'var(--green)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
              ✅ All items are well stocked
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lowStock.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--text)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  <span className={`badge ${p.stock < 20 ? 'badge-red' : 'badge-amber'}`}>
                    {p.stock} {p.unit} left
                  </span>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 4, alignSelf: 'flex-start' }}
                onClick={() => onNavigate('inventory')}>
                Manage Inventory →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Top Products + Top Expenses ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">🏅 Top 5 Products by Revenue</div>
          {topProducts.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}><p>No sales data yet</p></div>
          ) : topProducts.map((p, i) => (
            <div key={p.name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <RankBadge i={i} />
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{Number(p.units_sold).toLocaleString()} units</span>
                  <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{fmt(p.revenue)}</span>
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(p.revenue / maxTopProd) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">💸 Top 5 Expense Categories</div>
          {!topExpenses || topExpenses.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}><p>No expenses recorded yet</p></div>
          ) : topExpenses.map((e, i) => (
            <div key={e.category} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RankBadge i={i} />
                  <span style={{ fontWeight: 500 }}>{e.category}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{e.entry_count} {e.entry_count === 1 ? 'entry' : 'entries'}</span>
                  <span style={{ color: 'var(--red)', fontWeight: 700 }}>{fmt(e.total)}</span>
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(e.total / maxExp) * 100}%`, background: 'var(--red)' }} />
              </div>
            </div>
          ))}
          {topExpenses && topExpenses.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => onNavigate('expenses')}>
              View All Expenses →
            </button>
          )}
        </div>
      </div>

      {/* ── Row 3: Top Customers by Sales + Top Customers by Profit ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">🏆 Top 5 Customers by Sales</div>
          {!topCustomers || topCustomers.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}><p>No customer data yet</p></div>
          ) : topCustomers.map((c, i) => (
            <div key={c.name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <RankBadge i={i} />
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                    {c.name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{c.bill_count} bills</span>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>{fmt(c.total_spent)}</span>
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(c.total_spent / maxCustSales) * 100}%`, background: 'var(--green)' }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">💰 Top 5 Customers by Profit</div>
          {!topCustomersByProfit || topCustomersByProfit.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}><p>No customer data yet</p></div>
          ) : topCustomersByProfit.map((c, i) => (
            <div key={c.name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <RankBadge i={i} />
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                    {c.name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>{fmt(c.revenue)} rev</span>
                  <span style={{ color: c.profit >= 0 ? 'var(--blue)' : 'var(--red)', fontWeight: 700 }}>{fmt(c.profit)}</span>
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${Math.max(0, (c.profit / maxCustProfit)) * 100}%`,
                  background: c.profit >= 0 ? 'var(--blue)' : 'var(--red)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
