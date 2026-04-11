import { useEffect, useState } from 'react'

export default function NewBill({ onSaved }) {
  const [products, setProducts]     = useState([])
  const [customers, setCustomers]   = useState([])
  const [custSearch, setCustSearch]       = useState('')
  const [showDropdown, setShowDropdown]   = useState(false)
  const [customer, setCustomer]           = useState({ name: '', address: '', phone: '' })
  const [outstanding, setOutstanding]     = useState(null)  // { total_due, bill_count }
  const [items, setItems]           = useState([])
  const [discount, setDiscount]     = useState(0)
  const [paidToday, setPaidToday]   = useState('')
  const [billDate, setBillDate]     = useState(new Date().toISOString().split('T')[0])
  const [selProd, setSelProd]       = useState('')
  const [selQty, setSelQty]         = useState(1)
  const [selPrice, setSelPrice]     = useState('')
  const [msg, setMsg]               = useState(null)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    window.trsAPI.getProducts().then(setProducts)
    window.trsAPI.getCustomers().then(setCustomers)
  }, [])

  const custMatches = custSearch.length > 0
    ? customers.filter(c =>
        c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
        (c.phone || '').includes(custSearch)
      )
    : customers

  async function selectExistingCustomer(c) {
    setCustomer({ name: c.name, address: c.address || '', phone: c.phone || '' })
    setCustSearch(c.name)
    setShowDropdown(false)
    const result = await window.trsAPI.getCustomerOutstanding(c.name)
    setOutstanding(result)
  }

  function clearCustomer() {
    setCustomer({ name: '', address: '', phone: '' })
    setCustSearch('')
    setOutstanding(null)
    setPaidToday('')
  }

  function handleProductSelect(e) {
    const id = e.target.value
    setSelProd(id)
    setSelPrice('')
    setSelQty(1)
  }

  const selectedProd = selProd ? products.find(p => String(p.id) === selProd) : null
  const alreadyInBill = selectedProd ? (items.find(i => i.product_id === selectedProd.id)?.quantity || 0) : 0
  const availableStock = selectedProd ? Math.max(0, selectedProd.stock - alreadyInBill) : 0

  function addItem() {
    if (!selectedProd || !selQty || !selPrice) return
    const qty = parseFloat(selQty)
    const unitPrice = parseFloat(selPrice)
    if (!qty || qty <= 0 || !unitPrice || unitPrice <= 0) return
    if (qty > availableStock) {
      setMsg({ text: `Only ${availableStock} unit(s) of "${selectedProd.name}" available in stock.`, type: 'error' })
      return
    }
    const existing = items.find(i => i.product_id === selectedProd.id)
    if (existing) {
      setItems(items.map(i =>
        i.product_id === selectedProd.id
          ? { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.unit_price }
          : i
      ))
    } else {
      setItems([...items, {
        product_id: selectedProd.id,
        product_name: selectedProd.name,
        quantity: qty,
        unit_price: unitPrice,
        total: qty * unitPrice,
      }])
    }
    setSelProd('')
    setSelQty(1)
    setSelPrice('')
  }

  function removeItem(productId) {
    setItems(items.filter(i => i.product_id !== productId))
  }

  function updateQty(productId, rawQty) {
    const prod = products.find(p => p.id === productId)
    const maxQty = prod ? prod.stock : Infinity
    const qty = Math.min(Math.max(1, parseFloat(rawQty) || 1), maxQty)
    setItems(items.map(i =>
      i.product_id === productId
        ? { ...i, quantity: qty, total: qty * i.unit_price }
        : i
    ))
  }

  function updatePrice(productId, price) {
    setItems(items.map(i =>
      i.product_id === productId
        ? { ...i, unit_price: price, total: i.quantity * price }
        : i
    ))
  }

  const subTotal    = items.reduce((s, i) => s + i.total, 0)
  const discountAmt = Math.min(parseFloat(discount) || 0, subTotal)
  const grand       = subTotal - discountAmt
  const prevDue     = outstanding?.total_due || 0
  const totalAmount = grand + prevDue
  const paidTodayAmt = Math.min(parseFloat(paidToday) || 0, totalAmount)
  const balance     = totalAmount - paidTodayAmt

  async function handleSave() {
    if (!customer.name.trim()) { setMsg({ text: 'Customer name is required.', type: 'error' }); return }
    if (items.length === 0)    { setMsg({ text: 'Add at least one item.', type: 'error' }); return }

    setSaving(true)
    const bills = await window.trsAPI.getBills()
    const invoiceCount = bills.filter(b => b.bill_type !== 'opening_balance').length
    const nextNum = String(invoiceCount + 1).padStart(3, '0')

    const billData = {
      bill_number: `INV-${nextNum}`,
      customer_name: customer.name,
      customer_address: customer.address,
      customer_phone: customer.phone,
      tax_rate: 0,
      discount: discountAmt,
      sub_total: subTotal,
      tax_amount: 0,
      grand_total: grand,
      paid: 0,
      created_at: billDate,
      previous_due: prevDue,
      paid_on_invoice: paidTodayAmt,
    }

    await window.trsAPI.createBill(billData, items)
    setSaving(false)
    onSaved()
  }

  return (
    <>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Customer */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">Customer Details</div>

          {/* Search existing customers */}
          <div className="form-group" style={{ marginBottom: 12, position: 'relative' }}>
            <label>Search Existing Customer</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-control"
                value={custSearch}
                onChange={e => { setCustSearch(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Type name or phone to search..."
              />
              {custSearch && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearCustomer}
                  style={{ whiteSpace: 'nowrap' }}>
                  ✕ Clear
                </button>
              )}
            </div>
            {showDropdown && custMatches.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto',
              }}>
                {custMatches.map(c => (
                  <div key={c.id}
                    onMouseDown={() => selectExistingCustomer(c)}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                      {c.address && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.address}</div>}
                    </div>
                    {c.phone && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{c.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outstanding balance alert */}
          {outstanding && outstanding.total_due > 0 && (
            <div style={{
              background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8,
              padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, color: '#92400e', fontSize: 13 }}>
                  Outstanding Balance: ¥{Number(outstanding.total_due).toLocaleString('ja-JP')}
                </div>
                <div style={{ fontSize: 11, color: '#b45309' }}>
                  {outstanding.bill_count} unpaid {outstanding.bill_count === 1 ? 'invoice' : 'invoices'} from previous bills
                </div>
              </div>
            </div>
          )}
          {outstanding && outstanding.total_due === 0 && (
            <div style={{
              background: 'var(--green-light)', border: '1px solid #bbf7d0', borderRadius: 8,
              padding: '8px 14px', marginBottom: 12, fontSize: 12, color: 'var(--green)', fontWeight: 600,
            }}>
              ✅ No outstanding balance
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Or fill in manually
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Customer Name *</label>
              <input className="form-control" value={customer.name}
                onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
                placeholder="e.g. Marhaba Halal & Electronic" />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Address</label>
              <input className="form-control" value={customer.address}
                onChange={e => setCustomer(c => ({ ...c, address: e.target.value }))}
                placeholder="〒 Postal code, City, Street" />
            </div>
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label>Phone</label>
                <input className="form-control" value={customer.phone}
                  onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))}
                  placeholder="080 0000 0000" />
              </div>
              <div className="form-group">
                <label>Bill Date</label>
                <input className="form-control" type="date"
                  value={billDate}
                  onChange={e => setBillDate(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Add product */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">Add Product to Bill</div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Select Product</label>
            <select className="form-control" value={selProd} onChange={handleProductSelect}>
              <option value="">-- Choose a product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.stock === 0}>
                  {p.stock === 0 ? `[Out of Stock] ${p.name}` : `${p.name} (Stock: ${p.stock}) — Cost: ¥${p.cost_price}`}
                </option>
              ))}
            </select>
          </div>
          {selectedProd && (
            <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--bg)', borderRadius: 6, padding: '5px 10px', marginBottom: 8 }}>
              Available stock: <strong style={{ color: availableStock === 0 ? 'var(--red)' : 'var(--green)' }}>{availableStock} {selectedProd.unit}</strong>
              {' · '}Cost price: <strong>¥{Number(selectedProd.cost_price).toLocaleString()}</strong>
            </div>
          )}
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>Quantity {selectedProd ? `(max ${availableStock})` : ''}</label>
              <input className="form-control" type="number" min="1"
                max={availableStock || undefined}
                value={selQty} onChange={e => setSelQty(e.target.value)}
                disabled={!selectedProd} />
            </div>
            <div className="form-group">
              <label>Selling Price (¥) *</label>
              <input className="form-control" type="number" min="0"
                value={selPrice} onChange={e => setSelPrice(e.target.value)}
                placeholder="Type selling price"
                disabled={!selectedProd} />
            </div>
          </div>
          {selectedProd && availableStock === 0 && (
            <div style={{ fontSize: 12, color: 'var(--red)', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
              This product is out of stock and cannot be added.
            </div>
          )}
          <button className="btn btn-primary" onClick={addItem}
            disabled={!selectedProd || !selQty || !selPrice || availableStock === 0}>
            + Add to Bill
          </button>
        </div>
      </div>

      {/* Items table */}
      <div className="card">
        <div className="card-title">Bill Items</div>
        {items.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <div className="empty-icon">🛒</div>
            <p>No items added yet. Select products above.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price (¥)</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.product_id}>
                      <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                      <td>
                        <input type="number" min="1"
                          max={products.find(p => p.id === item.product_id)?.stock || undefined}
                          className="form-control"
                          style={{ width: 80 }}
                          value={item.quantity}
                          onChange={e => updateQty(item.product_id, e.target.value)} />
                      </td>
                      <td>
                        <input type="number" min="0"
                          className="form-control"
                          style={{ width: 100 }}
                          value={item.unit_price}
                          onChange={e => updatePrice(item.product_id, parseFloat(e.target.value) || 0)} />
                      </td>
                      <td style={{ color: 'var(--blue)', fontWeight: 700 }}>
                        ¥{item.total.toLocaleString('ja-JP')}
                      </td>
                      <td>
                        <button className="btn btn-sm" style={{ background: '#fee2e2', color: 'var(--red)', border: '1px solid #fecaca' }}
                          onClick={() => removeItem(item.product_id)}>
                          ✕ Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ minWidth: 340 }}>

                {/* Sub Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Sub Total</span>
                  <span>¥{subTotal.toLocaleString('ja-JP')}</span>
                </div>

                {/* Discount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Discount (¥)</span>
                  <input type="number" min="0" className="form-control"
                    style={{ width: 110, textAlign: 'right', padding: '3px 8px', fontSize: 13 }}
                    value={discount} onChange={e => setDiscount(e.target.value)} />
                </div>

                {/* This Bill */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 14, fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                  <span>This Bill</span>
                  <span>¥{grand.toLocaleString('ja-JP')}</span>
                </div>

                {/* Previous Due */}
                {prevDue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13, borderBottom: '1px solid var(--border)', color: 'var(--amber)' }}>
                    <span style={{ fontWeight: 600 }}>Previous Due</span>
                    <span style={{ fontWeight: 600 }}>+ ¥{prevDue.toLocaleString('ja-JP')}</span>
                  </div>
                )}

                {/* Total Amount (only if there's previous due) */}
                {prevDue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--border)', color: 'var(--red)' }}>
                    <span>Total Amount</span>
                    <span>¥{totalAmount.toLocaleString('ja-JP')}</span>
                  </div>
                )}

                {/* Paid Today */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>Paid Today (¥)</span>
                  <input type="number" min="0" max={totalAmount} className="form-control"
                    style={{ width: 130, textAlign: 'right', padding: '3px 8px', fontSize: 13 }}
                    placeholder="0"
                    value={paidToday} onChange={e => setPaidToday(e.target.value)} />
                </div>

                {/* Balance Due */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontSize: 18, fontWeight: 700, color: balance === 0 ? 'var(--green)' : 'var(--navy)', borderTop: '2px solid var(--navy)', marginTop: 2 }}>
                  <span>{balance === 0 ? '✓ Cleared' : 'Balance Due'}</span>
                  <span>¥{balance.toLocaleString('ja-JP')}</span>
                </div>

              </div>
            </div>
          </>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8, display: 'flex', gap: 10 }}>
          <button className="btn btn-success" onClick={handleSave}
            disabled={saving || !customer.name || items.length === 0}>
            {saving ? 'Saving...' : '✅ Save & Create Invoice'}
          </button>
        </div>
      </div>
    </>
  )
}
