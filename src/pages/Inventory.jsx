import { useEffect, useState } from 'react'

const EMPTY = { name: '', unit: 'cs', cost_price: '', stock: '' }

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const data = await window.trsAPI.getProducts()
    setProducts(data)
    setLoading(false)
  }

  function flash(text, type = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  function startEdit(p) {
    setEditId(p.id)
    setForm({ name: p.name, unit: p.unit, cost_price: p.cost_price, stock: p.stock })
    document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditId(null)
    setForm(EMPTY)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const data = {
      ...form,
      cost_price: parseFloat(form.cost_price),
      sell_price: 0,
      stock: parseInt(form.stock),
    }
    if (!data.name || isNaN(data.cost_price) || isNaN(data.stock)) {
      flash('Please fill in all fields correctly.', 'error')
      return
    }
    if (editId) {
      await window.trsAPI.updateProduct({ ...data, id: editId })
      flash(`"${data.name}" updated successfully.`)
    } else {
      await window.trsAPI.addProduct(data)
      flash(`"${data.name}" added to inventory.`)
      document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setForm(EMPTY)
    setEditId(null)
    load()
  }

  async function handleDelete(p) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    await window.trsAPI.deleteProduct(p.id)
    flash(`"${p.name}" removed.`)
    load()
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* Form */}
      <div className="card">
        <div className="card-title">{editId ? '✏️ Edit Product' : '➕ Add New Product'}</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
            <div className="form-group">
              <label>Product Name *</label>
              <input className="form-control" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Current Hot Stk 10cs" />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select className="form-control" value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="cs">cs</option>
                <option value="pcs">pcs</option>
                <option value="kg">kg</option>
                <option value="box">box</option>
                <option value="pack">pack</option>
              </select>
            </div>
            <div className="form-group">
              <label>Cost Price (¥)</label>
              <input className="form-control" type="number" min="0" step="0.01"
                value={form.cost_price}
                onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))}
                placeholder="80" />
            </div>
            <div className="form-group">
              <label>Stock Qty</label>
              <input className="form-control" type="number" min="0"
                value={form.stock}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                placeholder="100" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">
              {editId ? '✓ Update Product' : '+ Add Product'}
            </button>
            {editId && (
              <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="card-title" style={{ margin: 0 }}>
            All Products ({filtered.length})
          </span>
          <input className="form-control" style={{ width: 240 }}
            placeholder="🔍 Search products..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading inventory...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>{search ? 'No products match your search.' : 'No products yet. Add your first one above!'}</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Unit</th>
                  <th>Cost Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const stockBadge = p.stock < 20 ? 'badge-red' : p.stock < 50 ? 'badge-amber' : 'badge-green'
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td style={{ color: 'var(--muted)' }}>{p.unit}</td>
                      <td>¥{Number(p.cost_price).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${stockBadge}`}>
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>
                            Edit
                          </button>
                          <button className="btn btn-sm" style={{ background: '#fee2e2', color: 'var(--red)', border: '1px solid #fecaca' }}
                            onClick={() => handleDelete(p)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
