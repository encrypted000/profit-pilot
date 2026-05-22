import { useEffect, useState, Fragment } from 'react'

const COMPANY = {
  name:    'TRS TRAVEL & TOURS PRIVATE LIMITED',
  address: '〒262-0046 Chibaken Chiba-shi\nHanamigawaku Hanashima-cho 407-17',
  phone:   '(080) 4478-1978',
  taxNo:   'T3700150011038',
  bank:    'JP POST BANK\nACC NAME: TRS TRAVEL AND TOURS PRIVATE LIMITED\nACC NO: 10030-15316731   BRANCH CODE: 008',
}

function fmt(n) { return Number(n || 0).toLocaleString('ja-JP') }
function fmtDate(s) {
  if (!s) return ''
  const d = s.split('T')[0] || s
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ── Print Invoice ─────────────────────────────────────────────────────────────
function PrintView({ bill, onClose }) {
  function handlePrint() {
    window.print()
  }
  if (!bill) return null
  const MIN_ROWS = 10
  const emptyRows = bill.items.length >= MIN_ROWS ? 0 : MIN_ROWS - bill.items.length

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Print styles */}
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          body * { visibility: hidden; }
          #invoice-print-root, #invoice-print-root * { visibility: visible !important; }
          #invoice-print-root {
            position: static !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .invoice-footer { page-break-inside: avoid; }
          .invoice-table { page-break-inside: auto; }
          .invoice-table tr { page-break-inside: avoid; page-break-after: auto; }
          .invoice-header { page-break-after: avoid; }
        }
      `}</style>

      <div id="invoice-print-root" style={{
        background: '#fff', width: 740, maxHeight: '92vh', overflowY: 'auto',
        borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}>
        <div style={{ padding: '20px 26px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 10.5, color: '#111', lineHeight: 1.3 }}>

          {/* ── Header ── */}
          <div className="invoice-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            {/* Left: logo + address */}
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#000', letterSpacing: 3, lineHeight: 1, marginBottom: 4 }}>TRS</div>
              <div style={{ fontSize: 9.5, color: '#333', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{COMPANY.address}</div>
              <div style={{ fontSize: 9.5, color: '#333', marginTop: 2 }}>☎ {COMPANY.phone}</div>
            </div>
            {/* Right: company name + invoice meta */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 11, color: '#000', marginBottom: 6 }}>{COMPANY.name}</div>
              <table style={{ fontSize: 10, marginLeft: 'auto', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#555', paddingRight: 8 }}>TAX NO:</td>
                    <td style={{ minWidth: 110, fontWeight: 600 }}>{COMPANY.taxNo}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#555', paddingRight: 8, paddingTop: 3 }}>DATE:</td>
                    <td style={{ paddingTop: 3 }}>{fmtDate(bill.created_at)}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#555', paddingRight: 8 }}>INVOICE:</td>
                    <td style={{ fontWeight: 700 }}>{bill.bill_number}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── TAX INVOICE banner ── */}
          <div style={{
            textAlign: 'center', fontWeight: 800, fontSize: 13, letterSpacing: 2,
            borderTop: '2px solid #000', borderBottom: '2px solid #000',
            padding: '4px 0', margin: '0 0 8px', color: '#000',
          }}>
            TAX INVOICE
          </div>

          {/* ── Bill To ── */}
          <div style={{ marginBottom: 8, padding: '6px 10px', background: '#f5f5f5', borderRadius: 4, border: '1px solid #ccc' }}>
            <div style={{ fontWeight: 700, fontSize: 9, color: '#555', letterSpacing: 0.5, marginBottom: 3, textTransform: 'uppercase' }}>Bill To</div>
            <div style={{ fontWeight: 700, fontSize: 11.5, color: '#000' }}>{bill.customer_name}</div>
            {bill.customer_address && <div style={{ fontSize: 9.5, color: '#333', marginTop: 1 }}>〒 {bill.customer_address}</div>}
            {bill.customer_phone   && <div style={{ fontSize: 9.5, color: '#333', marginTop: 1 }}>☎ {bill.customer_phone}</div>}
          </div>

          {/* ── Items table ── */}
          <table className="invoice-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={{ padding: '5px 6px', textAlign: 'center', width: 30, color: '#000', fontSize: 9.5 }}>S/N</th>
                <th style={{ padding: '5px 6px', textAlign: 'left', color: '#000', fontSize: 9.5 }}>PRODUCT DETAILS</th>
                <th style={{ padding: '5px 6px', textAlign: 'right', width: 70, color: '#000', fontSize: 9.5 }}>QTY</th>
                <th style={{ padding: '5px 6px', textAlign: 'right', width: 80, color: '#000', fontSize: 9.5 }}>UNIT PRICE</th>
                <th style={{ padding: '5px 6px', textAlign: 'right', width: 80, color: '#000', fontSize: 9.5 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #bbb', padding: '3px 5px', textAlign: 'center', color: '#333' }}>{i + 1}</td>
                  <td style={{ border: '1px solid #bbb', padding: '3px 5px' }}>{item.product_name}</td>
                  <td style={{ border: '1px solid #bbb', padding: '3px 5px', textAlign: 'right' }}>{fmt(item.quantity)}</td>
                  <td style={{ border: '1px solid #bbb', padding: '3px 5px', textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                  <td style={{ border: '1px solid #bbb', padding: '3px 5px', textAlign: 'right', fontWeight: 600 }}>{fmt(item.total)}</td>
                </tr>
              ))}
              {Array.from({ length: emptyRows }).map((_, i) => (
                <tr key={`e${i}`}>
                  <td style={{ border: '1px solid #bbb', padding: '8px 5px' }}>&nbsp;</td>
                  <td style={{ border: '1px solid #bbb', padding: '8px 5px' }}></td>
                  <td style={{ border: '1px solid #bbb', padding: '8px 5px' }}></td>
                  <td style={{ border: '1px solid #bbb', padding: '8px 5px' }}></td>
                  <td style={{ border: '1px solid #bbb', padding: '8px 5px' }}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Footer ── */}
          <div className="invoice-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
            {/* Left: thank you + bank */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 10.5, marginBottom: 4, color: '#000' }}>THANK YOU FOR YOUR BUSINESS...!</div>
              <div style={{ fontSize: 9, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{COMPANY.bank}</div>
            </div>

            {/* Right: totals */}
            <div>
              <table style={{ fontSize: 10.5, borderCollapse: 'collapse', minWidth: 220 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '3px 10px', color: '#555' }}>SUB TOTAL</td>
                    <td style={{ textAlign: 'right', padding: '3px 10px' }}>¥{fmt(bill.sub_total)}</td>
                  </tr>
                  {bill.discount > 0 && (
                    <tr>
                      <td style={{ padding: '3px 10px' }}>DISCOUNT</td>
                      <td style={{ textAlign: 'right', padding: '3px 10px' }}>- ¥{fmt(bill.discount)}</td>
                    </tr>
                  )}
                  {(bill.previous_due || 0) > 0 && (
                    <tr>
                      <td style={{ padding: '3px 10px', fontWeight: 700 }}>PREVIOUS DUE</td>
                      <td style={{ textAlign: 'right', padding: '3px 10px', fontWeight: 700 }}>+ ¥{fmt(bill.previous_due)}</td>
                    </tr>
                  )}
                  {(bill.previous_due || 0) > 0 && (
                    <tr style={{ borderTop: '1px solid #bbb' }}>
                      <td style={{ padding: '3px 10px', fontWeight: 700 }}>GRAND TOTAL</td>
                      <td style={{ textAlign: 'right', padding: '3px 10px', fontWeight: 700 }}>¥{fmt(bill.grand_total)}</td>
                    </tr>
                  )}
                  {(bill.amount_paid || 0) > 0 && (
                    <tr>
                      <td style={{ padding: '3px 10px', fontWeight: 700 }}>PAID</td>
                      <td style={{ textAlign: 'right', padding: '3px 10px', fontWeight: 700 }}>- ¥{fmt(bill.amount_paid)}</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: '2px solid #000' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 800, fontSize: 11.5, color: '#000' }}>
                      {(bill.amount_paid || 0) > 0 ? 'BALANCE DUE' : 'GRAND TOTAL'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 800, fontSize: 11.5, color: '#000' }}>
                      ¥{fmt(bill.grand_total - (bill.amount_paid || 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Controls */}
      <div className="no-print" style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 12,
      }}>
        <button className="btn btn-primary" onClick={handlePrint}>
          🖨️ Print / Save PDF
        </button>
        <button className="btn btn-ghost" onClick={onClose}>✕ Close</button>
      </div>
    </div>
  )
}

// ── Payment Panel ─────────────────────────────────────────────────────────────
function PaymentPanel({ bill, onDone }) {
  const alreadyPaid = bill.amount_paid || 0
  const [mode, setMode]     = useState('add')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const due = bill.grand_total - alreadyPaid

  async function submit(e) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt < 0) return
    setSaving(true)
    if (mode === 'correct') {
      await window.trsAPI.correctPayment(bill.id, amt)
    } else {
      await window.trsAPI.recordPayment(bill.id, amt)
    }
    setSaving(false)
    onDone()
  }

  return (
    <div style={{ background: 'var(--blue-light)', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginTop: 8 }}>
      {alreadyPaid > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button type="button"
            className={`btn btn-sm ${mode === 'add' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMode('add'); setAmount('') }}>
            + Add Payment
          </button>
          <button type="button"
            className={`btn btn-sm ${mode === 'correct' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMode('correct'); setAmount(String(alreadyPaid)) }}>
            ✏️ Correct Amount
          </button>
        </div>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', marginBottom: 8 }}>
        {mode === 'correct'
          ? `Correct total paid — currently ¥${fmt(alreadyPaid)} · Grand Total ¥${fmt(bill.grand_total)}`
          : `Record Payment — Due: ¥${fmt(due)}`}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="form-control" type="number"
          style={{ width: 160 }}
          placeholder={mode === 'correct' ? `0 – ¥${fmt(bill.grand_total)}` : `Max ¥${fmt(due)}`}
          value={amount} onChange={e => setAmount(e.target.value)} autoFocus
        />
        {mode === 'add' && (
          <button type="button" className="btn btn-ghost btn-sm"
            onClick={() => setAmount(String(due))}>
            Full Amount
          </button>
        )}
        <button className="btn btn-success btn-sm" disabled={saving || amount === ''}>
          {saving ? 'Saving...' : mode === 'correct' ? '✓ Set Amount' : '✓ Confirm'}
        </button>
      </form>
    </div>
  )
}

// ── Edit Panel ────────────────────────────────────────────────────────────────
function EditPanel({ bill, onDone, onCancel }) {
  const [products, setProducts] = useState([])
  const [items, setItems]       = useState(bill.items.map(i => ({ ...i })))
  const [saving, setSaving]     = useState(false)

  useEffect(() => { window.trsAPI.getProducts().then(setProducts) }, [])

  function addItem() {
    if (!products.length) return
    const p = products[0]
    setItems(prev => [...prev, {
      product_id: p.id, product_name: p.name,
      quantity: 1, unit_price: '', total: 0,
    }])
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx, field, raw) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: raw }
      if (field === 'product_id') {
        const p = products.find(p => p.id === parseInt(raw))
        if (p) {
          updated.product_name = p.name
          updated.unit_price   = ''
          updated.total        = 0
        }
      }
      if (field === 'quantity' || field === 'unit_price') {
        updated.total = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.unit_price) || 0)
      }
      return updated
    }))
  }

  const subTotal = items.reduce((s, i) => s + (i.total || 0), 0)

  async function save() {
    if (!items.length) return
    setSaving(true)
    await window.trsAPI.updateBill(bill.id, items)
    setSaving(false)
    onDone()
  }

  return (
    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '16px 20px', marginTop: 4 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--navy)' }}>
        ✏️ Edit Items — {bill.bill_number}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--muted)', fontWeight: 600 }}>Product</th>
            <th style={{ textAlign: 'right', padding: '4px 6px', width: 80, color: 'var(--muted)', fontWeight: 600 }}>Qty</th>
            <th style={{ textAlign: 'right', padding: '4px 6px', width: 110, color: 'var(--muted)', fontWeight: 600 }}>Unit Price</th>
            <th style={{ textAlign: 'right', padding: '4px 6px', width: 100, color: 'var(--muted)', fontWeight: 600 }}>Total</th>
            <th style={{ width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ padding: '4px 6px' }}>
                <select className="form-control" style={{ fontSize: 12 }}
                  value={item.product_id || ''}
                  onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </td>
              <td style={{ padding: '4px 6px' }}>
                <input className="form-control" type="number"
                  style={{ width: 72, textAlign: 'right', fontSize: 12 }}
                  value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', e.target.value)} />
              </td>
              <td style={{ padding: '4px 6px' }}>
                <input className="form-control" type="number"
                  style={{ width: 100, textAlign: 'right', fontSize: 12 }}
                  value={item.unit_price}
                  onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
              </td>
              <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>¥{fmt(item.total)}</td>
              <td style={{ padding: '4px 6px' }}>
                <button className="btn btn-sm"
                  style={{ background: '#fee2e2', color: 'var(--red)', border: '1px solid #fecaca', padding: '2px 8px' }}
                  onClick={() => removeItem(idx)}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={addItem}>+ Add Item</button>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Sub Total: ¥{fmt(subTotal)}</span>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={saving || !items.length} onClick={save}>
            {saving ? 'Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bills List ────────────────────────────────────────────────────────────────
export default function Bills({ onNewBill }) {
  const [bills, setBills]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [printBill, setPrintBill] = useState(null)
  const [payingId, setPayingId]   = useState(null)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const data = await window.trsAPI.getBills()
    setBills(data)
    setLoading(false)
  }

  async function togglePaid(bill) {
    if (bill.paid && (bill.amount_paid || 0) > 0) {
      if (!confirm(`Mark "${bill.bill_number}" as unpaid? The recorded payment of ¥${fmt(bill.amount_paid)} will be cleared.`)) return
    }
    await window.trsAPI.togglePaid(bill.id, !bill.paid)
    load()
  }

  async function handleDelete(bill) {
    const label = bill.bill_type === 'opening_balance'
      ? `the opening balance for "${bill.customer_name}"`
      : `invoice ${bill.bill_number}`
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return
    await window.trsAPI.deleteBill(bill.id)
    load()
  }

  function clearFilters() { setSearch(''); setDateFrom(''); setDateTo('') }

  const filtered = bills.filter(b => {
    const matchText = (
      b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_name.toLowerCase().includes(search.toLowerCase())
    )
    const rawDate = (b.created_at || '').split('T')[0]
    const matchFrom = !dateFrom || rawDate >= dateFrom
    const matchTo   = !dateTo   || rawDate <= dateTo
    return matchText && matchFrom && matchTo
  })

  // Revenue = sum of sub_totals (items only), excluding opening balance and rolled_forward bills
  const totalRevenue  = bills.filter(b => !b.rolled_forward && b.bill_type !== 'opening_balance').reduce((s, b) => s + (b.sub_total || b.grand_total), 0)
  // Due = only active (non-rolled-forward) unpaid bills
  const totalDue      = bills.filter(b => !b.rolled_forward).reduce((s, b) => s + (b.due ?? 0), 0)
  const paidCount     = bills.filter(b => b.paid && !b.rolled_forward).length
  const hasFilters    = search || dateFrom || dateTo

  function statusBadge(bill) {
    if (bill.rolled_forward) return { cls: 'badge-muted', label: '→ Carried Forward' }
    if (bill.paid) return { cls: 'badge-green', label: '✓ Paid' }
    if ((bill.amount_paid || 0) > 0) return { cls: 'badge-blue', label: `Partial — ¥${fmt(bill.due)} due` }
    return { cls: 'badge-amber', label: `⏳ ¥${fmt(bill.due)} due` }
  }

  return (
    <>
      {printBill && <PrintView bill={printBill} onClose={() => setPrintBill(null)} />}

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div className="stat-card blue" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 22 }}>🧾</span>
          <div>
            <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 18 }}>{bills.filter(b => b.bill_type !== 'opening_balance').length}</div>
            <div className="stat-label">Total Bills</div>
          </div>
        </div>
        <div className="stat-card green" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div className="stat-value" style={{ color: 'var(--green)', fontSize: 18 }}>{paidCount}</div>
            <div className="stat-label">Paid</div>
          </div>
        </div>
        <div className="stat-card amber" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 22 }}>⏳</span>
          <div>
            <div className="stat-value" style={{ color: '#d97706', fontSize: 18 }}>{bills.length - paidCount}</div>
            <div className="stat-label">Unpaid</div>
          </div>
        </div>
        <div className="stat-card blue" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 22 }}>💴</span>
          <div>
            <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 16 }}>¥{fmt(totalRevenue)}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>
        <div className="stat-card" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, borderTop: `3px solid var(--red)` }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <div className="stat-value" style={{ color: 'var(--red)', fontSize: 16 }}>¥{fmt(totalDue)}</div>
            <div className="stat-label">Total Outstanding</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'visible' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
          <span className="card-title" style={{ margin: 0 }}>All Invoices</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="form-control" style={{ width: 200 }}
              placeholder="🔍 Search..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>From</span>
              <input className="form-control" type="date" style={{ width: 140 }}
                value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>To</span>
              <input className="form-control" type="date" style={{ width: 140 }}
                value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters}>✕ Clear</button>}
            <button className="btn btn-primary" onClick={onNewBill}>+ New Bill</button>
          </div>
        </div>

        {hasFilters && (
          <div style={{ padding: '8px 20px', background: 'var(--blue-light)', fontSize: 12, color: 'var(--blue)', borderBottom: '1px solid var(--border)' }}>
            Showing {filtered.length} of {bills.length} bills
            {dateFrom && ` · From ${dateFrom}`}{dateTo && ` · To ${dateTo}`}
          </div>
        )}

        {loading ? (
          <div className="empty-state"><p>Loading bills...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <p>{hasFilters ? 'No bills match your filters.' : 'No bills yet.'}</p>
            {!hasFilters && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onNewBill}>Create First Bill</button>}
            {hasFilters  && <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={clearFilters}>Clear Filters</button>}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Grand Total</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(bill => {
                const { cls, label } = statusBadge(bill)
                const isOB = bill.bill_type === 'opening_balance'
                const isRF = !!bill.rolled_forward
                const rowStyle = isRF
                  ? { background: '#f8f8f8', opacity: 0.65 }
                  : isOB
                    ? { background: '#fffdf0' }
                    : {}
                return (
                  <Fragment key={bill.id}>
                    <tr key={bill.id} style={rowStyle}>
                      <td style={{ fontWeight: 700, color: isOB ? 'var(--amber)' : isRF ? 'var(--muted)' : 'var(--blue)' }}>
                        {isOB
                          ? <span title="Pre-existing opening balance">📋 Prior Balance</span>
                          : <span style={isRF ? { textDecoration: 'line-through' } : {}}>{bill.bill_number}</span>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{bill.customer_name}</div>
                        {bill.customer_phone && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{bill.customer_phone}</div>}
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{fmtDate(bill.created_at)}</td>
                      <td style={{ fontWeight: 700, color: isRF ? 'var(--muted)' : 'var(--navy)' }}>¥{fmt(bill.grand_total)}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 600 }}>
                        {(bill.amount_paid || 0) > 0 ? `¥${fmt(bill.amount_paid)}` : '—'}
                      </td>
                      <td style={{ color: isRF ? 'var(--muted)' : bill.due > 0 ? 'var(--red)' : 'var(--muted)', fontWeight: (!isRF && bill.due > 0) ? 700 : 400 }}>
                        {isRF ? '—' : bill.due > 0 ? `¥${fmt(bill.due)}` : '—'}
                      </td>
                      <td>
                        {isRF ? (
                          <span className="badge badge-muted" style={{ whiteSpace: 'nowrap' }}>→ Carried Forward</span>
                        ) : (
                          <button className={`badge ${cls}`}
                            style={{ border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onClick={() => togglePaid(bill)}
                            title="Click to mark fully paid / unpaid">
                            {label}
                          </button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!isRF && (
                            <button className="btn btn-sm"
                              style={{ background: bill.paid ? '#f1f5f9' : '#dcfce7', color: bill.paid ? 'var(--muted)' : 'var(--green)', border: `1px solid ${bill.paid ? '#e2e8f0' : '#bbf7d0'}` }}
                              onClick={() => { setEditingId(null); setPayingId(payingId === bill.id ? null : bill.id) }}>
                              {bill.paid ? '✏️ Adjust' : '💰 Pay'}
                            </button>
                          )}
                          {!isOB && !isRF && (
                            <button className="btn btn-ghost btn-sm"
                              onClick={() => { setPayingId(null); setEditingId(editingId === bill.id ? null : bill.id) }}>
                              ✏️ Edit
                            </button>
                          )}
                          {!isOB && !isRF && <button className="btn btn-ghost btn-sm" onClick={() => setPrintBill(bill)}>🖨️</button>}
                          <button className="btn btn-sm"
                            style={{ background: '#fee2e2', color: 'var(--red)', border: '1px solid #fecaca' }}
                            onClick={() => handleDelete(bill)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {payingId === bill.id && (
                      <tr key={`pay-${bill.id}`}>
                        <td colSpan={8} style={{ padding: '0 16px 12px', background: '#f0f9ff' }}>
                          <PaymentPanel bill={bill} onDone={() => { setPayingId(null); load() }} />
                        </td>
                      </tr>
                    )}
                    {editingId === bill.id && (
                      <tr key={`edit-${bill.id}`}>
                        <td colSpan={8} style={{ padding: '0 16px 12px', background: '#f0f9ff' }}>
                          <EditPanel bill={bill}
                            onDone={() => { setEditingId(null); load() }}
                            onCancel={() => setEditingId(null)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
