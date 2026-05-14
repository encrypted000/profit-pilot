const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const isDev = !app.isPackaged

let db
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'TRS Business Manager',
    backgroundColor: '#f0f3fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Custom titlebar feel
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  // Load database after app is ready (so app.getPath works)
  db = require('./database.js')

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Auto-update: only runs in packaged app, not during development
  if (app.isPackaged) {
    autoUpdater.checkForUpdates()

    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available.`,
        detail: 'The update will download in the background. You will be notified when it is ready to install.',
        buttons: ['OK'],
      })
    })

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded successfully.',
        detail: 'Restart the app now to install the update, or install it the next time you close the app.',
        buttons: ['Restart Now', 'Later'],
      }).then(result => {
        if (result.response === 0) autoUpdater.quitAndInstall()
      })
    })

    autoUpdater.on('error', (err) => {
      // Silently ignore update errors — don't interrupt the user
      console.error('Auto-update error:', err.message)
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC HANDLERS ─────────────────────────────────────────────────────────────

ipcMain.handle('get-products', () => db.getAllProducts())
ipcMain.handle('add-product', (_, data) => db.addProduct(data))
ipcMain.handle('update-product', (_, data) => db.updateProduct(data))
ipcMain.handle('delete-product', (_, id) => db.deleteProduct(id))

ipcMain.handle('get-bills', () => db.getAllBills())
ipcMain.handle('create-bill', (_, bill, items) => db.createBill(bill, items))
ipcMain.handle('update-bill', (_, billId, items) => db.updateBill(billId, items))
ipcMain.handle('toggle-paid', (_, id, paid) => db.toggleBillPaid(id, paid))
ipcMain.handle('delete-bill', (_, id) => db.deleteBill(id))

ipcMain.handle('get-stats', () => db.getDashboardStats())

ipcMain.handle('get-customers',          ()           => db.getAllCustomers())
ipcMain.handle('add-customer',           (_, data)    => db.addCustomer(data))
ipcMain.handle('update-customer',        (_, data)    => db.updateCustomer(data))
ipcMain.handle('delete-customer',        (_, id)      => db.deleteCustomer(id))

ipcMain.handle('record-payment',           (_, id, amt) => db.recordPayment(id, amt))
ipcMain.handle('get-customer-outstanding', (_, name)  => db.getCustomerOutstanding(name))
ipcMain.handle('pay-opening-balance',      (_, id, amt) => db.payOpeningBalance(id, amt))

ipcMain.handle('get-expenses',    ()           => db.getAllExpenses())
ipcMain.handle('add-expense',    (_, data)    => db.addExpense(data))
ipcMain.handle('update-expense', (_, data)    => db.updateExpense(data))
ipcMain.handle('delete-expense', (_, id)      => db.deleteExpense(id))

ipcMain.handle('print-bill', async (_, billId) => {
  const printWin = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true },
  })
  if (isDev) {
    await printWin.loadURL(`http://localhost:5173/print/${billId}`)
  } else {
    await printWin.loadFile(path.join(__dirname, 'dist', 'index.html'), {
      hash: `/print/${billId}`,
    })
  }
  await new Promise(r => setTimeout(r, 800))
  printWin.webContents.print({ silent: false, printBackground: true }, () => {
    printWin.close()
  })
})
