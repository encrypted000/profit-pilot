import { useEffect, useState } from 'react'

const EMPTY = { name: '', address: '', phone: '', email: '', notes: '', opening_balance: '' }

const fmt = n => Number(n || 0).toLocaleString('ja-JP')

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [search, setSearch]       = useState('')
  const [msg, setMsg]             = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const data = await window.trsAPI.getCustomers()
    setCustomers(data)
    setLoading(false)
  }

  function flash(text, type = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  function startEdit(c) {
    setEditId(c.id)
    setForm({
      name: c.name, address: c.address || '', phone: c.phone || '',
      email: c.email || '', notes: c.notes || '',
      opening_balance: c.opening_balance || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { flash('Customer name is required.', 'error'); return }
    const data = { ...form, opening_balance: parseFloat(form.opening_balance) || 0 }
    if (editId) {
      await window.trsAPI.updateCustomer({ ...data, id: editId })
      flash(`"${form.name}" updated.`)
    } else {
      await window.trsAPI.addCustomer(data)
      flash(`"${form.name}" added.`)
    }
    setForm(EMPTY)
    setEditId(null)
    load()
  }

  async function handleDelete(c) {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return
    await window.trsAPI.deleteCustomer(c.id)
    flash(`"${c.name}" removed.`)
    load()
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.address || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalOutstanding = customers.reduce((s, c) => s + (c.total_due || 0), 0)

  return (
    <>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* Summary */}
      {totalOutstanding > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div className="stat-card" style={{ borderTop: '3px solid var(--red)', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div>
              <div className="stat-value" style={{ color: 'var(--red)', fontSize: 20 }}>¥{fmt(totalOutstanding)}</div>
              <div className="stat-label">Total Outstanding (all customers)</div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="card">
        <div className="card-title">{editId ? '✏️ Edit Customer' : '➕ Add New Customer'}</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
            <div className="form-group">
              <label>Customer Name *</label>
              <input className="form-control" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Marhaba Halal & Electronic" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-control" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="080 0000 0000" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-control" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="customer@email.com" />
            </div>
            <div className="form-group">
              <label>Opening Balance (¥)</label>
              <input className="form-control" type="number" min="0" step="1"
                value={form.opening_balance}
                onChange={e => setForm(f => ({ ...f, opening_balance: e.target.value }))}
                placeholder="0" />
            </div>
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <div className="form-group">
              <label>Address</label>
              <input className="form-control" value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="〒 Postal code, City, Street" />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <input className="form-control" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes" />
            </div>
          </div>

          {/* Opening balance hint */}
          {(parseFloat(form.opening_balance) > 0) && (
            <div style={{ fontSize: 12, color: 'var(--amber)', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 12px', marginBottom: 12 }}>
              {editId
                ? `📋 Updating this will adjust the "Prior Balance" entry in Bills to ¥${fmt(parseFloat(form.opening_balance))}.`
                : `📋 A "Prior Balance" entry of ¥${fmt(parseFloat(form.opening_balance))} will be added to Bills — settle it from there.`}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">
              {editId ? '✓ Update Customer' : '+ Add Customer'}
            </button>
            {editId && <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="card-title" style={{ margin: 0 }}>All Customers ({filtered.length})</span>
          <input className="form-control" style={{ width: 260 }}
            placeholder="🔍 Search by name, phone, address..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading customers...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>{search ? 'No customers match your search.' : 'No customers yet. Add your first one above!'}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Total Due</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{c.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{c.phone || '—'}</td>
                  <td style={{ color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.address || '—'}
                  </td>
                  <td>
                    {c.total_due > 0 ? (
                      <span className="badge badge-red">¥{fmt(c.total_due)} due</span>
                    ) : (
                      <span className="badge badge-green">Cleared</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.notes || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Edit</button>
                      <button className="btn btn-sm"
                        style={{ background: '#fee2e2', color: 'var(--red)', border: '1px solid #fecaca' }}
                        onClick={() => handleDelete(c)}>
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
