import seedDbData from '../data/db.json'

// In-memory JSON database engine for Vercel Serverless Functions
let dbCache: any = null

function loadDb() {
  if (dbCache) return dbCache
  // Deep clone seedDbData to allow in-memory mutation per serverless instance
  dbCache = JSON.parse(JSON.stringify(seedDbData))
  return dbCache
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

      if (newSale.remaining > 0 && body.client) {
        const clientObj = db.clients.find((c: any) => c.name === body.client)
        if (clientObj) {
          clientObj.debt = (clientObj.debt || 0) + newSale.remaining
          clientObj.invoices = (clientObj.invoices || 0) + 1
        }
      }
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
      return newReq
    }
    if (method === 'PATCH') {
      const body = await readBody(event)
      const reqId = path.split('/').pop()
      const reqObj = db.purchaseRequests.find((r: any) => r.id === reqId)
      if (reqObj) {
        reqObj.status = body.status
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
      return newPay
    }
    return db.payments
  }

  // ⚙️ Settings
  if (path === '/settings') {
    if (method === 'PUT' || method === 'POST') {
      const body = await readBody(event)
      db.settings = { ...db.settings, ...body }
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

  return { message: 'Vercel Serverless JSON API Engine Active', path }
})
