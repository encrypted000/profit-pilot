import { useEffect, useState } from 'react'

const COMPANY = {
  name:    'TRS TRAVEL & TOURS PRIVATE LIMITED',
  address: '〒262-0046 Chibaken Chiba-shi\nHanamigawaku Hanashima-cho 407-17',
  phone:   '(080) 4478-1978',
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
  if (!bill) return null
  const MIN_ROWS = 10
  const emptyRows = Math.max(0, MIN_ROWS - bill.items.length)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #invoice-print-root { display: block !important; position: fixed; inset: 0; }
          #invoice-print-root .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div id="invoice-print-root" style={{
        background: '#fff', width: 740, maxHeight: '92vh', overflowY: 'auto',
        borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}>
        <div style={{ padding: '32px 36px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, color: '#111', lineHeight: 1.4 }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            {/* Left: logo + address */}
            <div>
              <div style={{ fontSize: 42, fontWeight: 900, color: '#0f2557', letterSpacing: 3, lineHeight: 1, marginBottom: 6 }}>TRS</div>
              <div style={{ fontSize: 10.5, color: '#333', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{COMPANY.address}</div>
              <div style={{ fontSize: 10.5, color: '#333', marginTop: 2 }}>☎ {COMPANY.phone}</div>
            </div>
            {/* Right: company name + invoice meta */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0f2557', marginBottom: 8 }}>{COMPANY.name}</div>
              <table style={{ fontSize: 11, marginLeft: 'auto', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#555', paddingRight: 8 }}>TAX NO:</td>
                    <td style={{ borderBottom: '1px solid #aaa', minWidth: 120 }}>&nbsp;</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#555', paddingRight: 8, paddingTop: 4 }}>DATE:</td>
                    <td style={{ paddingTop: 4 }}>{fmtDate(bill.created_at)}</td>
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
            textAlign: 'center', fontWeight: 800, fontSize: 16, letterSpacing: 2,
            borderTop: '2.5px solid #0f2557', borderBottom: '2.5px solid #0f2557',
            padding: '6px 0', margin: '0 0 14px', color: '#0f2557',
          }}>
            TAX INVOICE
          </div>

          {/* ── Bill To ── */}
          <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f7f8fc', borderRadius: 6, border: '1px solid #e0e4f0' }}>
            <div style={{ fontWeight: 700, fontSize: 10.5, color: '#555', letterSpacing: 0.5, marginBottom: 5, textTransform: 'uppercase' }}>Bill To</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f2557' }}>{bill.customer_name}</div>
            {bill.customer_address && <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>〒 {bill.customer_address}</div>}
            {bill.customer_phone   && <div style={{ fontSize: 11, color: '#444', marginTop: 1 }}>☎ {bill.customer_phone}</div>}
          </div>

          {/* ── Items table ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 11.5 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #0f2557' }}>
                <th style={{ padding: '7px 8px', textAlign: 'center', width: 36, color: '#0f2557', fontSize: 10.5 }}>S/N</th>
                <th style={{ padding: '7px 8px', textAlign: 'left', color: '#0f2557', fontSize: 10.5 }}>PRODUCT DETAILS</th>
                <th style={{ padding: '7px 8px', textAlign: 'right', width: 80, color: '#0f2557', fontSize: 10.5 }}>QTY</th>
                <th style={{ padding: '7px 8px', textAlign: 'right', width: 90, color: '#0f2557', fontSize: 10.5 }}>UNIT PRICE</th>
                <th style={{ padding: '7px 8px', textAlign: 'right', width: 90, color: '#0f2557', fontSize: 10.5 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #dde', padding: '6px 8px', textAlign: 'center', color: '#555' }}>{i + 1}</td>
                  <td style={{ border: '1px solid #dde', padding: '6px 8px' }}>{item.product_name}</td>
                  <td style={{ border: '1px solid #dde', padding: '6px 8px', textAlign: 'right' }}>{fmt(item.quantity)}</td>
                  <td style={{ border: '1px solid #dde', padding: '6px 8px', textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                  <td style={{ border: '1px solid #dde', padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(item.total)}</td>
                </tr>
              ))}
              {Array.from({ length: emptyRows }).map((_, i) => (
                <tr key={`e${i}`}>
                  <td style={{ border: '1px solid #dde', padding: '12px 8px' }}>&nbsp;</td>
                  <td style={{ border: '1px solid #dde', padding: '12px 8px' }}></td>
                  <td style={{ border: '1px solid #dde', padding: '12px 8px' }}></td>
                  <td style={{ border: '1px solid #dde', padding: '12px 8px' }}></td>
                  <td style={{ border: '1px solid #dde', padding: '12px 8px' }}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Footer ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
            {/* Left: thank you + bank */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6, color: '#0f2557' }}>THANK YOU FOR YOUR BUSINESS...!</div>
              <div style={{ fontSize: 10, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{COMPANY.bank}</div>
            </div>

            {/* Right: totals */}
            <div>
              <table style={{ fontSize: 12, borderCollapse: 'collapse', minWidth: 240 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '5px 12px', color: '#555' }}>SUB TOTAL</td>
                    <td style={{ textAlign: 'right', padding: '5px 12px' }}>¥{fmt(bill.sub_total)}</td>
                  </tr>
                  {bill.discount > 0 && (
                    <tr>
                      <td style={{ padding: '5px 12px', color: '#16a34a' }}>DISCOUNT</td>
                      <td style={{ textAlign: 'right', padding: '5px 12px', color: '#16a34a' }}>- ¥{fmt(bill.discount)}</td>
                    </tr>
                  )}
                  {(bill.previous_due || 0) > 0 && (
                    <tr>
                      <td style={{ padding: '5px 12px', color: '#d97706', fontWeight: 700 }}>PREVIOUS DUE</td>
                      <td style={{ textAlign: 'right', padding: '5px 12px', color: '#d97706', fontWeight: 700 }}>+ ¥{fmt(bill.previous_due)}</td>
                    </tr>
                  )}
                  {(bill.previous_due || 0) > 0 && (
                    <tr style={{ borderTop: '1px solid #dde' }}>
                      <td style={{ padding: '5px 12px', fontWeight: 700 }}>GRAND TOTAL</td>
                      <td style={{ textAlign: 'right', padding: '5px 12px', fontWeight: 700 }}>¥{fmt(bill.grand_total)}</td>
                    </tr>
                  )}
                  {(bill.amount_paid || 0) > 0 && (
                    <tr>
                      <td style={{ padding: '5px 12px', color: '#16a34a', fontWeight: 700 }}>PAID</td>
                      <td style={{ textAlign: 'right', padding: '5px 12px', color: '#16a34a', fontWeight: 700 }}>- ¥{fmt(bill.amount_paid)}</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: '2px solid #0f2557' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 800, fontSize: 13, color: '#0f2557' }}>
                      {(bill.amount_paid || 0) > 0 ? 'BALANCE DUE' : 'GRAND TOTAL'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 800, fontSize: 13, color: '#0f2557' }}>
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
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print / Save PDF</button>
        <button className="btn btn-ghost" onClick={onClose}>✕ Close</button>
      </div>
    </div>
  )
}

// ── Payment Panel ─────────────────────────────────────────────────────────────
function PaymentPanel({ bill, onDone }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const due = bill.due ?? (bill.grand_total - (bill.amount_paid || 0))

  async function submit(e) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setSaving(true)
    await window.trsAPI.recordPayment(bill.id, amt)
    setSaving(false)
    onDone()
  }

  return (
    <div style={{ background: 'var(--blue-light)', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', marginBottom: 8 }}>
        Record Payment — Due: ¥{fmt(due)}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="form-control" type="number" min="1" max={due} step="1"
          style={{ width: 140 }} placeholder={`Max ¥${fmt(due)}`}
          value={amount} onChange={e => setAmount(e.target.value)} autoFocus
        />
        <button type="button" className="btn btn-ghost btn-sm"
          onClick={() => setAmount(String(due))}>
          Full Amount
        </button>
        <button className="btn btn-success btn-sm" disabled={saving || !amount}>
          {saving ? 'Saving...' : '✓ Confirm'}
        </button>
      </form>
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

  useEffect(() => { load() }, [])

  async function load() {
    const data = await window.trsAPI.getBills()
    setBills(data)
    setLoading(false)
  }

  async function togglePaid(bill) {
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
            <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 18 }}>{bills.length}</div>
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
                  <>
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
                          {!bill.paid && !isRF && (
                            <button className="btn btn-sm"
                              style={{ background: '#dcfce7', color: 'var(--green)', border: '1px solid #bbf7d0' }}
                              onClick={() => setPayingId(payingId === bill.id ? null : bill.id)}>
                              💰 Pay
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
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
