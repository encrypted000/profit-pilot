const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

// In dev: store in userData. When packaged: store next to the .exe so it's easy to find/backup.
const dbPath = path.join(app.getPath('userData'), 'trs.db')
const db = new Database(dbPath)

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL')

// Migrations – add columns that may not exist in older databases
try { db.exec(`ALTER TABLE bills ADD COLUMN discount REAL DEFAULT 0`) } catch (_) {}
try { db.exec(`ALTER TABLE bills ADD COLUMN amount_paid REAL DEFAULT 0`) } catch (_) {}
try { db.exec(`ALTER TABLE bills ADD COLUMN bill_type TEXT DEFAULT 'invoice'`) } catch (_) {}
try { db.exec(`ALTER TABLE bills ADD COLUMN previous_due REAL DEFAULT 0`) } catch (_) {}
try { db.exec(`ALTER TABLE bills ADD COLUMN paid_on_invoice REAL DEFAULT 0`) } catch (_) {}
try { db.exec(`ALTER TABLE bills ADD COLUMN rolled_forward INTEGER DEFAULT 0`) } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN total_spent REAL DEFAULT 0`) } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN opening_balance REAL DEFAULT 0`) } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN opening_balance_paid REAL DEFAULT 0`) } catch (_) {}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'cs',
    cost_price REAL NOT NULL,
    sell_price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_address TEXT,
    customer_phone TEXT,
    tax_rate REAL DEFAULT 8,
    discount REAL DEFAULT 0,
    sub_total REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    paid INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    amount_paid REAL DEFAULT 0,
    bill_type TEXT DEFAULT 'invoice',
    previous_due REAL DEFAULT 0,
    paid_on_invoice REAL DEFAULT 0,
    rolled_forward INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT DEFAULT '',
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

// One-time migration: convert existing opening balances into opening_balance bills
{
  const customersWithOB = db.prepare(`SELECT * FROM customers WHERE COALESCE(opening_balance, 0) > 0`).all()
  const insertOBBill = db.prepare(`
    INSERT INTO bills (bill_number, customer_name, bill_type, sub_total, grand_total, amount_paid, paid, created_at, tax_rate, discount, tax_amount)
    VALUES (?, ?, 'opening_balance', ?, ?, ?, ?, datetime('now'), 0, 0, 0)
  `)
  customersWithOB.forEach(c => {
    const existing = db.prepare(`SELECT id FROM bills WHERE bill_type='opening_balance' AND customer_name=?`).get(c.name)
    if (!existing) {
      const paidAmt = c.opening_balance_paid || 0
      const isPaid = paidAmt >= c.opening_balance ? 1 : 0
      insertOBBill.run(`OB-${c.id}`, c.name, c.opening_balance, c.opening_balance, paidAmt, isPaid)
    }
  })
}

// Seed default products if table is empty
const count = db.prepare('SELECT COUNT(*) as c FROM products').get()
if (count.c === 0) {
  const insert = db.prepare(`
    INSERT INTO products (name, unit, cost_price, sell_price, stock)
    VALUES (?, ?, ?, ?, ?)
  `)
  const seedProducts = [
    ['Current Hot Stk 10cs', 'cs', 80, 92, 300],
    ['Current Achari Stk 6cs', 'cs', 80, 92, 180],
    ['Current Hot n Lemon Stk 4cs', 'cs', 80, 92, 120],
    ['Current Noodles 2x 6cs', 'cs', 65, 75, 960],
    ['Current Spicy Cheeseball 4cs', 'cs', 80, 92, 120],
    ['Current Hot Noodles 10cs', 'cs', 65, 75, 1600],
    ['Basmati Rice 5Kg Green 25cs', 'cs', 2900, 3125, 100],
    ['Basmati Rice 5Kg Red 50cs', 'cs', 2800, 3025, 200],
    ['Chat M', 'pcs', 85, 100, 20],
    ['Pepsodant', 'pcs', 300, 360, 12],
    ['Current Chips All Flavor 5cs', 'cs', 80, 92, 300],
  ]
  seedProducts.forEach(p => insert.run(...p))
}

// ── PRODUCT QUERIES ──────────────────────────────────────────────────────────
function getAllProducts() {
  return db.prepare('SELECT * FROM products ORDER BY name COLLATE NOCASE ASC').all()
}

function addProduct(data) {
  const stmt = db.prepare(`
    INSERT INTO products (name, unit, cost_price, sell_price, stock)
    VALUES (@name, @unit, @cost_price, @sell_price, @stock)
  `)
  return stmt.run(data)
}

function updateProduct(data) {
  const stmt = db.prepare(`
    UPDATE products
    SET name=@name, unit=@unit, cost_price=@cost_price,
        sell_price=@sell_price, stock=@stock
    WHERE id=@id
  `)
  return stmt.run(data)
}

function deleteProduct(id) {
  return db.prepare('DELETE FROM products WHERE id=?').run(id)
}

function adjustStock(productId, qty) {
  db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id=?').run(qty, productId)
}

// ── BILL QUERIES ─────────────────────────────────────────────────────────────
function getAllBills() {
  const bills = db.prepare('SELECT * FROM bills ORDER BY created_at DESC, id DESC').all()
  const getItems = db.prepare('SELECT * FROM bill_items WHERE bill_id=?')
  return bills.map(b => ({
    ...b,
    amount_paid: b.amount_paid || 0,
    due: b.grand_total - (b.amount_paid || 0),
    items: getItems.all(b.id),
  }))
}

function createBill(billData, items) {
  const insertBill = db.prepare(`
    INSERT INTO bills (bill_number, customer_name, customer_address, customer_phone,
      tax_rate, discount, sub_total, tax_amount, grand_total, paid, created_at,
      previous_due, paid_on_invoice)
    VALUES (@bill_number, @customer_name, @customer_address, @customer_phone,
      @tax_rate, @discount, @sub_total, @tax_amount, @grand_total, @paid, @created_at,
      @previous_due, @paid_on_invoice)
  `)
  const insertItem = db.prepare(`
    INSERT INTO bill_items (bill_id, product_id, product_name, quantity, unit_price, total)
    VALUES (@bill_id, @product_id, @product_name, @quantity, @unit_price, @total)
  `)

  const transaction = db.transaction(() => {
    // Store grand_total = items total + previous_due (the full amount owed on this bill)
    const storedGrandTotal = (billData.grand_total || 0) + (billData.previous_due || 0)
    const result = insertBill.run({ ...billData, grand_total: storedGrandTotal })
    const billId = result.lastInsertRowid
    items.forEach(item => {
      insertItem.run({ ...item, bill_id: billId })
      if (item.product_id) adjustStock(item.product_id, item.quantity)
    })

    // Mark all previously unpaid bills for this customer as rolled_forward
    // (their debt is now consolidated into this new bill)
    if ((billData.previous_due || 0) > 0) {
      db.prepare(`
        UPDATE bills SET rolled_forward = 1
        WHERE customer_name = ? AND paid = 0 AND id != ? AND rolled_forward = 0
      `).run(billData.customer_name, billId)
    }

    // Apply initial payment (paid_on_invoice) to this bill only
    if ((billData.paid_on_invoice || 0) > 0) {
      const apply = Math.min(billData.paid_on_invoice, storedGrandTotal)
      db.prepare('UPDATE bills SET amount_paid=?, paid=? WHERE id=?')
        .run(apply, apply >= storedGrandTotal ? 1 : 0, billId)
    }

    return billId
  })

  return transaction()
}

function toggleBillPaid(id, paid) {
  const bill = db.prepare('SELECT grand_total, amount_paid FROM bills WHERE id=?').get(id)
  if (paid) {
    db.prepare('UPDATE bills SET paid=1, amount_paid=? WHERE id=?').run(bill.grand_total, id)
  } else {
    // Preserve any partial payment already recorded — only clear if it was a full toggle-pay
    const keepPaid = (bill.amount_paid || 0) < bill.grand_total ? (bill.amount_paid || 0) : 0
    db.prepare('UPDATE bills SET paid=0, amount_paid=? WHERE id=?').run(keepPaid, id)
  }
}

function recordPayment(id, amount) {
  const bill = db.prepare('SELECT grand_total, amount_paid FROM bills WHERE id=?').get(id)
  const newAmountPaid = Math.min((bill.amount_paid || 0) + amount, bill.grand_total)
  const isPaid = newAmountPaid >= bill.grand_total ? 1 : 0
  db.prepare('UPDATE bills SET amount_paid=?, paid=? WHERE id=?').run(newAmountPaid, isPaid, id)
  return { amount_paid: newAmountPaid, due: bill.grand_total - newAmountPaid, paid: isPaid }
}

function correctPayment(id, newTotal) {
  const bill = db.prepare('SELECT grand_total FROM bills WHERE id=?').get(id)
  const amt = Math.max(0, Math.min(parseFloat(newTotal) || 0, bill.grand_total))
  const isPaid = amt >= bill.grand_total ? 1 : 0
  db.prepare('UPDATE bills SET amount_paid=?, paid=? WHERE id=?').run(amt, isPaid, id)
}

function getCustomerOutstanding(customerName) {
  const result = db.prepare(`
    SELECT COALESCE(SUM(grand_total - COALESCE(amount_paid, 0)), 0) as total_due,
           COUNT(*) as bill_count
    FROM bills
    WHERE customer_name = ? AND paid = 0 AND rolled_forward = 0
  `).get(customerName)
  return { total_due: result.total_due, bill_count: result.bill_count }
}

function updateBill(billId, newItems) {
  const transaction = db.transaction(() => {
    // Restore stock for all existing items before replacing
    const oldItems = db.prepare('SELECT * FROM bill_items WHERE bill_id=?').all(billId)
    oldItems.forEach(item => {
      if (item.product_id) {
        db.prepare('UPDATE products SET stock = stock + ? WHERE id=?').run(item.quantity, item.product_id)
      }
    })
    // Replace items
    db.prepare('DELETE FROM bill_items WHERE bill_id=?').run(billId)
    const insertItem = db.prepare(`
      INSERT INTO bill_items (bill_id, product_id, product_name, quantity, unit_price, total)
      VALUES (@bill_id, @product_id, @product_name, @quantity, @unit_price, @total)
    `)
    let newSubTotal = 0
    newItems.forEach(item => {
      const qty   = parseFloat(item.quantity)  || 0
      const price = parseFloat(item.unit_price) || 0
      const total = qty * price
      insertItem.run({ ...item, bill_id: billId, quantity: qty, unit_price: price, total })
      newSubTotal += total
      if (item.product_id) adjustStock(item.product_id, qty)
    })
    // Recalculate bill totals — preserve existing discount
    const bill = db.prepare('SELECT * FROM bills WHERE id=?').get(billId)
    const discount = bill.discount || 0
    const newGrandTotal = newSubTotal - discount + (bill.previous_due || 0)
    const newAmountPaid = Math.min(bill.amount_paid || 0, newGrandTotal)
    const isPaid = newAmountPaid >= newGrandTotal ? 1 : 0
    db.prepare('UPDATE bills SET sub_total=?, grand_total=?, amount_paid=?, paid=? WHERE id=?')
      .run(newSubTotal, newGrandTotal, newAmountPaid, isPaid, billId)
  })
  return transaction()
}

function deleteBill(id) {
  const transaction = db.transaction(() => {
    const items = db.prepare('SELECT * FROM bill_items WHERE bill_id=?').all(id)
    items.forEach(item => {
      if (item.product_id) {
        db.prepare('UPDATE products SET stock = stock + ? WHERE id=?').run(item.quantity, item.product_id)
      }
    })
    db.prepare('DELETE FROM bills WHERE id=?').run(id)
  })
  transaction()
}

// ── DASHBOARD STATS ──────────────────────────────────────────────────────────
function getDashboardStats() {
  const _now = new Date()
  const currentMonth = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`

  // All-time revenue & cost (from product sales only)
  const revenue = db.prepare(`
    SELECT COALESCE(SUM(bi.quantity * bi.unit_price), 0) as total
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE b.bill_type != 'opening_balance'
  `).get().total

  const cost = db.prepare(`
    SELECT COALESCE(SUM(bi.quantity * p.cost_price), 0) as total
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    LEFT JOIN products p ON bi.product_id = p.id
    WHERE b.bill_type != 'opening_balance'
  `).get().total

  const totalExpenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses`).get().total

  const totalBills = db.prepare(`SELECT COUNT(*) as c FROM bills WHERE bill_type != 'opening_balance'`).get().c

  // This month stats
  const thisMonthRevenue = db.prepare(`
    SELECT COALESCE(SUM(bi.quantity * bi.unit_price), 0) as total
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE strftime('%Y-%m', b.created_at) = ? AND b.bill_type != 'opening_balance'
  `).get(currentMonth).total

  const thisMonthCOGS = db.prepare(`
    SELECT COALESCE(SUM(bi.quantity * p.cost_price), 0) as total
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    LEFT JOIN products p ON bi.product_id = p.id
    WHERE strftime('%Y-%m', b.created_at) = ? AND b.bill_type != 'opening_balance'
  `).get(currentMonth).total

  const thisMonthExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y-%m', date) = ?
  `).get(currentMonth).total

  const thisMonth = {
    revenue:     thisMonthRevenue,
    cogs:        thisMonthCOGS,
    grossProfit: thisMonthRevenue - thisMonthCOGS,
    expenses:    thisMonthExpenses,
    netProfit:   thisMonthRevenue - thisMonthCOGS - thisMonthExpenses,
  }

  const topProducts = db.prepare(`
    SELECT product_name as name, SUM(quantity * unit_price) as revenue,
           SUM(quantity) as units_sold
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE b.bill_type != 'opening_balance'
    GROUP BY product_name
    ORDER BY revenue DESC
    LIMIT 5
  `).all()

  const lowStock = db.prepare(`SELECT * FROM products WHERE stock < 50 ORDER BY stock ASC`).all()

  // Last 6 months: revenue + expenses per month
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push(ym)
  }
  const monthlyData = months.map(m => {
    const rev = db.prepare(`
      SELECT COALESCE(SUM(bi.quantity * bi.unit_price), 0) as total
      FROM bill_items bi JOIN bills b ON bi.bill_id = b.id
      WHERE strftime('%Y-%m', b.created_at) = ? AND b.bill_type != 'opening_balance'
    `).get(m).total
    const cogs = db.prepare(`
      SELECT COALESCE(SUM(bi.quantity * COALESCE(p.cost_price, 0)), 0) as total
      FROM bill_items bi JOIN bills b ON bi.bill_id = b.id
      LEFT JOIN products p ON bi.product_id = p.id
      WHERE strftime('%Y-%m', b.created_at) = ? AND b.bill_type != 'opening_balance'
    `).get(m).total
    const exp = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y-%m', date) = ?
    `).get(m).total
    return { month: m.slice(5), revenue: rev, expenses: exp, profit: rev - cogs - exp }
  })

  // Top customers by sales revenue (from actual items sold, no double-counting)
  const topCustomers = db.prepare(`
    SELECT b.customer_name as name,
           COUNT(DISTINCT b.id) as bill_count,
           COALESCE(SUM(bi.quantity * bi.unit_price), 0) as total_spent
    FROM bills b
    LEFT JOIN bill_items bi ON bi.bill_id = b.id
    WHERE b.bill_type != 'opening_balance'
    GROUP BY b.customer_name
    ORDER BY total_spent DESC
    LIMIT 5
  `).all()

  // Top customers by gross profit (revenue minus cost of goods)
  const topCustomersByProfit = db.prepare(`
    SELECT b.customer_name as name,
           COALESCE(SUM(bi.quantity * bi.unit_price), 0) as revenue,
           COALESCE(SUM(bi.quantity * COALESCE(p.cost_price, 0)), 0) as cogs,
           COALESCE(SUM(bi.quantity * bi.unit_price), 0) -
           COALESCE(SUM(bi.quantity * COALESCE(p.cost_price, 0)), 0) as profit
    FROM bills b
    LEFT JOIN bill_items bi ON bi.bill_id = b.id
    LEFT JOIN products p ON bi.product_id = p.id
    WHERE b.bill_type != 'opening_balance'
    GROUP BY b.customer_name
    ORDER BY profit DESC
    LIMIT 5
  `).all()

  // Top expense categories
  const topExpenses = db.prepare(`
    SELECT category,
           COALESCE(SUM(amount), 0) as total,
           COUNT(*) as entry_count
    FROM expenses
    GROUP BY category
    ORDER BY total DESC
    LIMIT 5
  `).all()

  const totalOutstanding = db.prepare(`
    SELECT COALESCE(SUM(grand_total - COALESCE(amount_paid,0)), 0) as total
    FROM bills WHERE paid = 0 AND rolled_forward = 0
  `).get().total

  return {
    revenue, cost, profit: revenue - cost - totalExpenses, totalBills,
    thisMonth, monthlyData, topProducts, lowStock,
    topCustomers, topCustomersByProfit, topExpenses, totalOutstanding,
  }
}

// ── CUSTOMER QUERIES ─────────────────────────────────────────────────────────
function getAllCustomers() {
  return db.prepare(`
    SELECT c.*,
      COALESCE((
        SELECT SUM(grand_total - COALESCE(amount_paid, 0))
        FROM bills
        WHERE customer_name = c.name AND paid = 0 AND rolled_forward = 0
      ), 0) AS total_due
    FROM customers c
    ORDER BY c.name COLLATE NOCASE
  `).all()
}

function addCustomer(data) {
  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO customers (name, address, phone, email, notes, opening_balance)
      VALUES (@name, @address, @phone, @email, @notes, @opening_balance)
    `).run(data)
    if ((data.opening_balance || 0) > 0) {
      const custId = result.lastInsertRowid
      db.prepare(`
        INSERT INTO bills (bill_number, customer_name, bill_type, sub_total, grand_total, amount_paid, paid, created_at, tax_rate, discount, tax_amount)
        VALUES (?, ?, 'opening_balance', ?, ?, 0, 0, datetime('now'), 0, 0, 0)
      `).run(`OB-${custId}`, data.name, data.opening_balance, data.opening_balance)
    }
    return result
  })
  return transaction()
}

function updateCustomer(data) {
  const transaction = db.transaction(() => {
    const old = db.prepare('SELECT * FROM customers WHERE id=?').get(data.id)
    db.prepare(`
      UPDATE customers
      SET name=@name, address=@address, phone=@phone, email=@email,
          notes=@notes, opening_balance=@opening_balance
      WHERE id=@id
    `).run(data)
    // Sync the opening balance bill
    const obBill = db.prepare(`SELECT * FROM bills WHERE bill_type='opening_balance' AND customer_name=?`).get(old.name)
    if ((data.opening_balance || 0) > 0) {
      if (obBill) {
        // Update existing OB bill (recalculate paid status, update customer name if changed)
        const newPaid = Math.min(obBill.amount_paid || 0, data.opening_balance)
        const isPaid = newPaid >= data.opening_balance ? 1 : 0
        db.prepare(`UPDATE bills SET customer_name=?, grand_total=?, sub_total=?, amount_paid=?, paid=? WHERE id=?`)
          .run(data.name, data.opening_balance, data.opening_balance, newPaid, isPaid, obBill.id)
      } else {
        db.prepare(`
          INSERT INTO bills (bill_number, customer_name, bill_type, sub_total, grand_total, amount_paid, paid, created_at, tax_rate, discount, tax_amount)
          VALUES (?, ?, 'opening_balance', ?, ?, 0, 0, datetime('now'), 0, 0, 0)
        `).run(`OB-${data.id}`, data.name, data.opening_balance, data.opening_balance)
      }
    } else if (obBill && !obBill.paid) {
      // opening_balance cleared — delete the unpaid OB bill
      db.prepare('DELETE FROM bills WHERE id=?').run(obBill.id)
    } else if (obBill && data.name !== old.name) {
      // Just rename if already paid
      db.prepare('UPDATE bills SET customer_name=? WHERE id=?').run(data.name, obBill.id)
    }
  })
  return transaction()
}

function deleteCustomer(id) {
  return db.prepare('DELETE FROM customers WHERE id=?').run(id)
}

function payOpeningBalance(id, amount) {
  const cust = db.prepare('SELECT opening_balance, opening_balance_paid FROM customers WHERE id=?').get(id)
  const remaining = (cust.opening_balance || 0) - (cust.opening_balance_paid || 0)
  const newPaid = Math.min((cust.opening_balance_paid || 0) + amount, cust.opening_balance || 0)
  db.prepare('UPDATE customers SET opening_balance_paid=? WHERE id=?').run(newPaid, id)
  return { opening_balance_paid: newPaid, remaining: remaining - amount }
}

// ── EXPENSE QUERIES ───────────────────────────────────────────────────────────
function getAllExpenses() {
  return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
}

function addExpense(data) {
  return db.prepare(`
    INSERT INTO expenses (category, amount, note, date)
    VALUES (@category, @amount, @note, @date)
  `).run(data)
}

function updateExpense(data) {
  return db.prepare(`
    UPDATE expenses SET category=@category, amount=@amount, note=@note, date=@date
    WHERE id=@id
  `).run(data)
}

function deleteExpense(id) {
  return db.prepare('DELETE FROM expenses WHERE id=?').run(id)
}

function importProducts(rows) {
  const insert = db.prepare(`
    INSERT INTO products (name, unit, cost_price, sell_price, stock)
    VALUES (@name, @unit, @cost_price, @sell_price, @stock)
  `)
  let imported = 0, skipped = 0
  db.transaction(() => {
    rows.forEach(row => {
      const name = (row.name || '').trim()
      if (!name) { skipped++; return }
      try {
        insert.run({
          name,
          unit: (row.unit || 'cs').trim(),
          cost_price: parseFloat(row.cost_price) || 0,
          sell_price: 0,
          stock: parseInt(row.stock) || 0,
        })
        imported++
      } catch (_) { skipped++ }
    })
  })()
  return { imported, skipped }
}

function importCustomers(rows) {
  const insertCust = db.prepare(`
    INSERT INTO customers (name, phone, address, email, notes, opening_balance)
    VALUES (@name, @phone, @address, @email, @notes, @opening_balance)
  `)
  const insertOB = db.prepare(`
    INSERT INTO bills (bill_number, customer_name, bill_type, sub_total, grand_total, amount_paid, paid, created_at, tax_rate, discount, tax_amount)
    VALUES (?, ?, 'opening_balance', ?, ?, 0, 0, datetime('now'), 0, 0, 0)
  `)
  let imported = 0, skipped = 0
  db.transaction(() => {
    rows.forEach(row => {
      const name = (row.name || '').trim()
      if (!name) { skipped++; return }
      try {
        const ob = parseFloat(row.opening_balance) || 0
        const result = insertCust.run({
          name,
          phone:           (row.phone   || '').trim(),
          address:         (row.address || '').trim(),
          email:           (row.email   || '').trim(),
          notes:           (row.notes   || '').trim(),
          opening_balance: ob,
        })
        if (ob > 0) {
          insertOB.run(`OB-${result.lastInsertRowid}`, name, ob, ob)
        }
        imported++
      } catch (_) { skipped++ }
    })
  })()
  return { imported, skipped }
}

module.exports = {
  getAllProducts, addProduct, updateProduct, deleteProduct, importProducts,
  importCustomers,
  getAllBills, createBill, updateBill, toggleBillPaid, recordPayment, correctPayment, deleteBill,
  getCustomerOutstanding,
  getDashboardStats,
  getAllCustomers, addCustomer, updateCustomer, deleteCustomer, payOpeningBalance,
  getAllExpenses, addExpense, updateExpense, deleteExpense,
}
