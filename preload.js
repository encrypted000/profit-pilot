const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('trsAPI', {
  // Products
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (data) => ipcRenderer.invoke('add-product', data),
  updateProduct: (data) => ipcRenderer.invoke('update-product', data),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  importProducts: (rows) => ipcRenderer.invoke('import-products', rows),
  importCustomers: (rows) => ipcRenderer.invoke('import-customers', rows),

  // Bills
  getBills: () => ipcRenderer.invoke('get-bills'),
  createBill: (bill, items) => ipcRenderer.invoke('create-bill', bill, items),
  updateBill: (billId, items) => ipcRenderer.invoke('update-bill', billId, items),
  togglePaid: (id, paid) => ipcRenderer.invoke('toggle-paid', id, paid),
  deleteBill: (id) => ipcRenderer.invoke('delete-bill', id),

  // Dashboard
  getStats: () => ipcRenderer.invoke('get-stats'),

  // Print
  printBill: (billId) => ipcRenderer.invoke('print-bill', billId),

  // Customers
  getCustomers:           ()           => ipcRenderer.invoke('get-customers'),
  addCustomer:            (data)       => ipcRenderer.invoke('add-customer', data),
  updateCustomer:         (data)       => ipcRenderer.invoke('update-customer', data),
  deleteCustomer:         (id)         => ipcRenderer.invoke('delete-customer', id),

  // Payments
  recordPayment:          (id, amt)    => ipcRenderer.invoke('record-payment', id, amt),
  getPayments:            (billId)     => ipcRenderer.invoke('get-payments', billId),
  correctPayment:         (id, amt)    => ipcRenderer.invoke('correct-payment', id, amt),
  getVersion:             ()           => ipcRenderer.invoke('get-version'),
  getCustomerOutstanding: (name)       => ipcRenderer.invoke('get-customer-outstanding', name),

  // Expenses
  getExpenses:    ()       => ipcRenderer.invoke('get-expenses'),
  addExpense:     (data)   => ipcRenderer.invoke('add-expense', data),
  updateExpense:  (data)   => ipcRenderer.invoke('update-expense', data),
  deleteExpense:  (id)     => ipcRenderer.invoke('delete-expense', id),
})
