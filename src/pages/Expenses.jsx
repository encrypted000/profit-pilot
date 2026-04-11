import { useEffect, useState } from 'react'

const CATEGORIES = [
  'Container Parking',
  'Road Tax',
  'Delivery',
  'Petrol',
  'Employee Salary',
  'Maintenance',
  'Miscellaneous',
]

const EMPTY = { category: CATEGORIES[0], amount: '', note: '', date: new Date().toISOString().split('T')[0] }
const fmt = n => Number(n || 0).toLocaleString('ja-JP')

function currentYearMonth() {
  return new Date().toISOString().slice(0, 7)
}

function monthLabel(ym) {
  const [y, m] = ym.split('-')
  return new Date(+y, +m - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' })
}

export default function Expenses() {
  const [expenses, setExpenses]   = useState([])
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth())
  const [msg, setMsg]             = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const data = await window.trsAPI.getExpenses()
    setExpenses(data)
    setLoading(false)
  }

  function flash(text, type = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  function startEdit(e) {
    setEditId(e.id)
    setForm({ category: e.category, amount: e.amount, note: e.note || '', date: e.date })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY) }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { flash('Please enter a valid amount.', 'error'); return }
    if (!form.date) { flash('Please select a date.', 'error'); return }
    const data = { ...form, amount: amt, note: form.note || '' }
    if (editId) {
      await window.trsAPI.updateExpense({ ...data, id: editId })
      flash('Expense updated.')
    } else {
      await window.trsAPI.addExpense(data)
      flash('Expense added.')
    }
    setForm(EMPTY)
    setEditId(null)
    load()
  }

  async function handleDelete(e) {
    if (!confirm(`Delete this ${e.category} expense of ¥${fmt(e.amount)}?`)) return
    await window.trsAPI.deleteExpense(e.id)
    flash('Expense deleted.')
    load()
  }

  // All months that have expenses, plus current month
  const allMonths = [...new Set([
    currentYearMonth(),
    ...expenses.map(e => e.date.slice(0, 7)),
  ])].sort().reverse()

  const filtered = expenses.filter(e => e.date.slice(0, 7) === selectedMonth)
  const monthTotal = filtered.reduce((s, e) => s + e.amount, 0)

  // Category breakdown for selected month
  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: filtered.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(x => x.total > 0)

  return (
    <>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* Add / Edit form */}
      <div className="card">
        <div className="card-title">{editId ? '✏️ Edit Expense' : '➕ Add Expense'}</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr' }}>
            <div className="form-group">
              <label>Category *</label>
              <select className="form-control" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Amount (¥) *</label>
              <input className="form-control" type="number" min="1" step="1"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 5000" />
            </div>
            <div className="form-group">
              <label>Date *</label>
              <input className="form-control" type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>
                Note {form.category === 'Miscellaneous' ? <span style={{ color: 'var(--red)' }}>*</span> : <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>}
              </label>
              <input className="form-control"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder={form.category === 'Miscellaneous' ? 'What is this for?' : 'Optional details'} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary"
              disabled={!form.amount || (form.category === 'Miscellaneous' && !form.note.trim())}>
              {editId ? '✓ Update Expense' : '+ Add Expense'}
            </button>
            {editId && <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      {/* Month selector + summary */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ marginBottom: 0, flex: '0 0 auto' }}>
          <div className="card-title" style={{ marginBottom: 8 }}>View Month</div>
          <select className="form-control" style={{ width: 200 }}
            value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {allMonths.map(m => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
        </div>

        {/* Monthly summary */}
        {filtered.length > 0 && (
          <div className="card" style={{ marginBottom: 0, flex: 1 }}>
            <div className="card-title" style={{ marginBottom: 8 }}>
              {monthLabel(selectedMonth)} — Total: <span style={{ color: 'var(--red)' }}>¥{fmt(monthTotal)}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {byCategory.map(({ cat, total }) => (
                <div key={cat} style={{
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '6px 12px', fontSize: 12,
                }}>
                  <span style={{ color: 'var(--muted)' }}>{cat}: </span>
                  <strong style={{ color: 'var(--red)' }}>¥{fmt(total)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expenses table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="card-title" style={{ margin: 0 }}>
            Expenses — {monthLabel(selectedMonth)} ({filtered.length})
          </span>
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💸</div>
            <p>No expenses recorded for {monthLabel(selectedMonth)}.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{e.date ? (() => { const [y,m,d] = e.date.split('-'); return `${d}/${m}/${y}` })() : ''}</td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
                      fontSize: 12, fontWeight: 600,
                      background: 'var(--red-light)', color: 'var(--red)',
                    }}>{e.category}</span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{e.note || '—'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--red)' }}>¥{fmt(e.amount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(e)}>Edit</button>
                      <button className="btn btn-sm"
                        style={{ background: '#fee2e2', color: 'var(--red)', border: '1px solid #fecaca' }}
                        onClick={() => handleDelete(e)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
