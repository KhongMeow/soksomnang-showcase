import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// In-memory / file JSON database engine
let dbCache: any = null

function getDbPath() {
  return resolve(process.cwd(), 'server/data/db.json')
}

function loadDb() {
  if (dbCache) return dbCache
  try {
    const filePath = getDbPath()
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8')
      dbCache = JSON.parse(content)
      return dbCache
    }
  } catch (e) {
    console.error('Error loading db.json:', e)
  }

  // Fallback initial database state
  dbCache = {
    branches: [
      { id: "b1", name: "Central ស្ទឹងមានជ័យ" },
      { id: "b2", name: "អូរឫស្សី" },
      { id: "b3", name: "ផ្សារដើមគរ" }
    ],
    users: [
      {
        id: "u1",
        username: "admin",
        passwordHash: "admin",
        name: "Admin",
        role: "admin",
        branchId: null,
        permissions: {
          create_sale: true, edit_price: true, receive_payment: true, view_cost: true, view_profit: true, adjust_stock: true, transfer_stock: true, view_reports: true, manage_settings: true, cancel_transaction: true
        }
      },
      {
        id: "u2",
        username: "staff",
        passwordHash: "staff",
        name: "Sale Staff",
        role: "sale_staff",
        branchId: "b1",
        permissions: {
          create_sale: true, edit_price: false, receive_payment: true, view_cost: false, view_profit: false, adjust_stock: false, transfer_stock: false, view_reports: true, manage_settings: false, cancel_transaction: false, manage_branch: true
        }
      }
    ],
    products: [
      { id: "p1", name: "មាន់ស្រែ", defaultPrice: 8 },
      { id: "p2", name: "មាន់សាច់", defaultPrice: 6 },
      { id: "p3", name: "មាន់ទា", defaultPrice: 7 },
      { id: "p4", name: "មាន់រស់", defaultPrice: 5 }
    ],
    stocks: [
      { id: "st1", productId: "p1", branchId: "b1", heads: 450, kg: 1125 },
      { id: "st2", productId: "p1", branchId: "b2", heads: 200, kg: 500 },
      { id: "st3", productId: "p1", branchId: "b3", heads: 180, kg: 450 },
      { id: "st4", productId: "p2", branchId: "b1", heads: 320, kg: 800 },
      { id: "st5", productId: "p2", branchId: "b2", heads: 150, kg: 375 },
      { id: "st6", productId: "p2", branchId: "b3", heads: 120, kg: 300 }
    ],
    suppliers: [
      { id: "s1", name: "Supplier A", phone: "012 345 678", debt: 2500, totalPurchase: 15000 },
      { id: "s2", name: "កសិដ្ឋាន សុខា", phone: "077 123 456", debt: 1800, totalPurchase: 12000 }
    ],
    clients: [
      { id: "c1", name: "ម៉ូយ ចាន់ណា", phone: "012 111 222", debt: 1500, invoices: 2, lastPayment: "2026-07-28" },
      { id: "c2", name: "ម៉ូយ ស្រីពៅ", phone: "077 333 444", debt: 800, invoices: 1, lastPayment: "2026-07-30" },
      { id: "c3", name: "ហាង សំណាង", phone: "096 555 666", debt: 3200, invoices: 3, lastPayment: "2026-07-25" }
    ],
    clientInvoices: [
      { id: "ci1", clientId: "c1", invoiceNo: "INV-0795", date: "2026-07-25", product: "មាន់ស្រែ", total: 800, paid: 300, remaining: 500, status: "partial" },
      { id: "ci2", clientId: "c1", invoiceNo: "INV-0790", date: "2026-07-20", product: "មាន់រស់", total: 1000, paid: 0, remaining: 1000, status: "credit" }
    ],
    sales: [
      { id: "sl1", invoiceNo: "INV-0801", date: "2026-08-02", client: "ម៉ូយ ចាន់ណា", product: "មាន់ស្រែ", unit: "taka", qty: 2, price: 500, total: 1000, status: "paid", paid: 1000, remaining: 0, branch: "Central ស្ទឹងមានជ័យ", staff: "ដារ៉ា", method: "cash" },
      { id: "sl2", invoiceNo: "INV-0800", date: "2026-08-02", client: "ហាង សំណាង", product: "មាន់សាច់", unit: "kg", qty: 50, price: 4, total: 200, status: "credit", paid: 0, remaining: 200, branch: "អូរឫស្សី", staff: "សំណាង", method: "cash" }
    ],
    purchases: [
      { id: "pur1", invoiceNo: "PUR-0201", date: "2026-08-02", supplier: "Supplier A", product: "មាន់ស្រែ", heads: 200, kg: 400, total: 1000, status: "paid", paid: 1000, remaining: 0, branch: "Central ស្ទឹងមានជ័យ" }
    ],
    purchaseRequests: [
      { id: "pr1", requestNo: "PR-001", date: "2026-08-02", branch: "អូរឫស្សី", staff: "Sale Staff 2", product: "មាន់ស្រែ", heads: 100, kg: 250, reason: "ស្តុកជិតអស់", status: "pending" }
    ],
    transfers: [
      { id: "trf1", transferNo: "TRF-0101", date: "2026-08-02", from: "Central ស្ទឹងមានជ័យ", to: "អូរឫស្សី", product: "មាន់ស្រែ", heads: 50, kg: 125, status: "received" }
    ],
    adjustments: [
      { id: "adj1", date: "2026-08-01", product: "មាន់រស់", branch: "Central ស្ទឹងមានជ័យ", type: "dead", headsBefore: 600, headsAdjustment: -5, headsAfter: 595, kgBefore: 1500, kgAdjustment: -12.5, kgAfter: 1487.5, reason: "ងាប់ក្នុងការដឹក" }
    ],
    expenses: [
      { id: "exp1", date: "2026-08-02", category: "ថ្លៃដឹក", description: "ដឹកមាន់ Central → អូរឫស្សី", amount: 25, method: "cash", branch: "Central ស្ទឹងមានជ័យ" }
    ],
    payments: [
      { id: "pay1", receiptNo: "REC-0301", date: "2026-08-02", type: "client", party: "ម៉ូយ ចាន់ណា", invoiceNo: "INV-0795", amount: 300, method: "cash", remainingAfter: 500 }
    ],
    settings: {
      headsPerTaka: 100,
      expenseCategories: ["ថ្លៃដឹក", "ម្ហូបអាហារ", "ប្រេងឥន្ធនៈ", "ផ្សេងៗ"]
    },
    priceMatrix: [
      { product: "មាន់ស្រែ", centralSelling: 500, centralClient: 480, orusseySelling: 520, orusseyClient: 500, deimkorSelling: 510, deimkorClient: 490 },
      { product: "មាន់សាច់", centralSelling: 420, centralClient: 400, orusseySelling: 440, orusseyClient: 420, deimkorSelling: 430, deimkorClient: 410 }
    ]
  }
  return dbCache
}

function saveDb() {
  try {
    const filePath = getDbPath()
    writeFileSync(filePath, JSON.stringify(dbCache, null, 2), 'utf-8')
  } catch (e) {
    // In serverless read-only environments, keep in memory cache
    console.warn('Db save notice (in-memory update):', e)
  }
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method
  const url = event.node.req.url || ''
  const path = url.split('?')[0].replace(/^\/api/, '').replace(/\/$/, '')
  const db = loadDb()

  // 🔐 Authentication Endpoints
  if (path === '/auth/login' && method === 'POST') {
    const body = await readBody(event)
    const user = db.users.find((u: any) => u.username === body?.username)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
    }
    return {
      token: `mock-jwt-token-${user.id}-${Date.now()}`,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        branchId: user.branchId,
        permissions: user.permissions
      }
    }
  }

  if (path === '/auth/me') {
    const admin = db.users.find((u: any) => u.role === 'admin') || db.users[0]
    return {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      branchId: admin.branchId,
      permissions: admin.permissions
    }
  }

  // 🏬 Branches
  if (path === '/branches') {
    return db.branches
  }

  // 📊 Dashboard
  if (path === '/dashboard') {
    const todaySales = db.sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
    const totalDebt = db.clients.reduce((sum: number, c: any) => sum + (c.debt || 0), 0)
    const totalExpense = db.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
    const totalStockHeads = db.stocks.reduce((sum: number, st: any) => sum + (st.heads || 0), 0)
    const totalStockKg = db.stocks.reduce((sum: number, st: any) => sum + (st.kg || 0), 0)

    return {
      todaySalesCount: db.sales.length,
      todaySalesTotal: todaySales,
      todayRevenue: todaySales,
      todayExpense: totalExpense,
      totalClientDebt: totalDebt,
      stockSummary: {
        typesCount: db.products.length,
        totalHeads: totalStockHeads,
        totalKg: totalStockKg
      },
      recentSales: db.sales.slice(0, 5)
    }
  }

  // 📦 Products & Stock
  if (path === '/products' || path === '/products/stock') {
    return db.products.map((p: any) => {
      const pStocks = db.stocks.filter((st: any) => st.productId === p.id)
      return {
        ...p,
        stock: pStocks
      }
    })
  }

  // 👥 Clients
  if (path === '/clients') {
    if (method === 'POST') {
      const body = await readBody(event)
      const newClient = {
        id: `c${Date.now()}`,
        name: body.name,
        phone: body.phone || '',
        debt: 0,
        invoices: 0,
        lastPayment: new Date().toISOString().split('T')[0]
      }
      db.clients.push(newClient)
      saveDb()
      return newClient
    }
    return db.clients
  }

  // 🤝 Suppliers
  if (path === '/suppliers') {
    if (method === 'POST') {
      const body = await readBody(event)
      const newSup = {
        id: `s${Date.now()}`,
        name: body.name,
        phone: body.phone || '',
        debt: 0,
        totalPurchase: 0
      }
      db.suppliers.push(newSup)
      saveDb()
      return newSup
    }
    return db.suppliers
  }

  // 💵 Sales
  if (path === '/sales') {
    if (method === 'POST') {
      const body = await readBody(event)
      const newSale = {
        id: `sl${Date.now()}`,
        invoiceNo: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        ...body,
        status: body.paid >= body.total ? 'paid' : body.paid > 0 ? 'partial' : 'credit',
        remaining: body.total - (body.paid || 0)
      }
      db.sales.unshift(newSale)

      // Update client debt if credit
      if (newSale.remaining > 0 && body.client) {
        const clientObj = db.clients.find((c: any) => c.name === body.client)
        if (clientObj) {
          clientObj.debt = (clientObj.debt || 0) + newSale.remaining
          clientObj.invoices = (clientObj.invoices || 0) + 1
        }
      }
      saveDb()
      return newSale
    }
    return db.sales
  }

  // 📦 Purchases
  if (path === '/purchases') {
    if (method === 'POST') {
      const body = await readBody(event)
      const newPur = {
        id: `pur${Date.now()}`,
        invoiceNo: `PUR-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        ...body
      }
      db.purchases.unshift(newPur)
      saveDb()
      return newPur
    }
    return db.purchases
  }

  // 📋 Purchase Requests (Stock Requests)
  if (path.startsWith('/purchase-requests')) {
    if (method === 'POST') {
      const body = await readBody(event)
      const newReq = {
        id: `pr${Date.now()}`,
        requestNo: `PR-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        ...body
      }
      db.purchaseRequests.unshift(newReq)
      saveDb()
      return newReq
    }
    if (method === 'PATCH') {
      const body = await readBody(event)
      const reqId = path.split('/').pop()
      const reqObj = db.purchaseRequests.find((r: any) => r.id === reqId)
      if (reqObj) {
        reqObj.status = body.status
        saveDb()
        return reqObj
      }
    }
    return db.purchaseRequests
  }

  // 🔀 Stock Transfers
  if (path === '/transfers') {
    if (method === 'POST') {
      const body = await readBody(event)
      const newTrf = {
        id: `trf${Date.now()}`,
        transferNo: `TRF-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        ...body
      }
      db.transfers.unshift(newTrf)
      saveDb()
      return newTrf
    }
    return db.transfers
  }

  // 🛠️ Stock Adjustments
  if (path === '/adjustments') {
    if (method === 'POST') {
      const body = await readBody(event)
      const newAdj = {
        id: `adj${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        ...body
      }
      db.adjustments.unshift(newAdj)
      saveDb()
      return newAdj
    }
    return db.adjustments
  }

  // 💸 Expenses
  if (path === '/expenses') {
    if (method === 'POST') {
      const body = await readBody(event)
      const newExp = {
        id: `exp${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        ...body
      }
      db.expenses.unshift(newExp)
      saveDb()
      return newExp
    }
    return db.expenses
  }

  // 🧾 Payments
  if (path === '/payments') {
    if (method === 'POST') {
      const body = await readBody(event)
      const newPay = {
        id: `pay${Date.now()}`,
        receiptNo: `REC-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split('T')[0],
        ...body
      }
      db.payments.unshift(newPay)
      saveDb()
      return newPay
    }
    return db.payments
  }

  // ⚙️ Settings
  if (path === '/settings') {
    if (method === 'PUT' || method === 'POST') {
      const body = await readBody(event)
      db.settings = { ...db.settings, ...body }
      saveDb()
      return db.settings
    }
    return db.settings
  }

  // 📈 Reports
  if (path.startsWith('/reports')) {
    return {
      summary: {
        totalSales: db.sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0),
        totalExpense: db.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0),
        totalPurchases: db.purchases.reduce((sum: number, p: any) => sum + (p.total || 0), 0),
        netProfit: db.sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0) - db.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
      },
      sales: db.sales,
      expenses: db.expenses
    }
  }

  // Default response for unhandled endpoints
  return { message: 'Mock API Server Operational', path }
})
