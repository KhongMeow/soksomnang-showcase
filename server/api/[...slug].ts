import seedDbData from '../data/db.json'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { neon } from '@neondatabase/serverless'

// Neon Postgres or Local JSON database engine with disk persistence & cloud fallback
let dbCache: any = null
let tableInitialized = false

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.VERCEL_POSTGRES_URL || ''
}

async function initNeonTable(sql: any) {
  if (tableInitialized) return
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS showcase_store (
        key TEXT PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    tableInitialized = true
  } catch (e) {
    console.error('Failed to initialize Neon Postgres table', e)
  }
}

async function loadDb() {
  const dbUrl = getDatabaseUrl()
  if (dbUrl) {
    try {
      const sql = neon(dbUrl)
      await initNeonTable(sql)
      const rows = await sql`SELECT value FROM showcase_store WHERE key = 'app_db'`
      if (rows && rows.length > 0 && rows[0].value) {
        dbCache = rows[0].value
        return dbCache
      }
    } catch (e) {
      console.error('Failed to fetch data from Neon Postgres, using seed fallback', e)
    }
  }

  if (dbCache) return dbCache

  dbCache = JSON.parse(JSON.stringify(seedDbData))

  if (dbUrl) {
    try {
      const sql = neon(dbUrl)
      await initNeonTable(sql)
      await sql`
        INSERT INTO showcase_store (key, value)
        VALUES ('app_db', ${JSON.stringify(dbCache)})
        ON CONFLICT (key) DO NOTHING;
      `
    } catch (e) {
      // Ignore seed error
    }
  }

  return dbCache
}

async function saveDb(data: any) {
  dbCache = data

  const dbUrl = getDatabaseUrl()
  if (dbUrl) {
    try {
      const sql = neon(dbUrl)
      await initNeonTable(sql)
      await sql`
        INSERT INTO showcase_store (key, value, updated_at)
        VALUES ('app_db', ${JSON.stringify(data)}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
      `
      return
    } catch (e) {
      console.error('Failed to save data to Neon Postgres', e)
    }
  }

  try {
    const dbPath = resolve(process.cwd(), 'server/data/db.json')
    if (fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8')
    }
  } catch (e) {
    // In serverless read-only environment, in-memory cache remains active
  }
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method
  const url = event.node.req.url || ''
  const path = url.split('?')[0].replace(/^\/api/, '').replace(/\/$/, '')
  const db = await loadDb()

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
    const authHeader = getHeader(event, 'authorization') || ''
    const tokenCookie = getCookie(event, 'auth:token') || ''
    const roleCookie = getCookie(event, 'auth:role') || ''

    let user: any = null

    // 1. Match by token user ID (e.g., mock-jwt-token-u2-12345)
    const tokenMatch = (authHeader || tokenCookie).match(/mock-jwt-token-([a-zA-Z0-9_]+)-/)
    if (tokenMatch) {
      const uId = tokenMatch[1]
      user = db.users.find((u: any) => u.id === uId || u.username === uId)
    }

    // 2. Fallback to role match or username match
    if (!user && roleCookie) {
      user = db.users.find((u: any) => u.role === roleCookie || u.username === roleCookie)
    }

    const current = user || db.users[0]
    return {
      id: current.id,
      username: current.username,
      name: current.name,
      role: current.role,
      branchId: current.branchId,
      permissions: current.permissions
    }
  }

  // 🏬 Branches
  if (path === '/branches') {
    return db.branches
  }

  // 📊 Dashboard Endpoints
  if (path === '/dashboard' || path === '/dashboard/summary') {
    const todaySales = db.sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
    const totalDebt = db.clients.reduce((sum: number, c: any) => sum + (c.debt || 0), 0)
    const totalSupplierDebt = db.suppliers.reduce((sum: number, s: any) => sum + (s.debt || 0), 0)
    const totalExpense = db.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
    const totalStockHeads = db.stocks.reduce((sum: number, st: any) => sum + (st.heads || 0), 0)
    const totalStockKg = db.stocks.reduce((sum: number, st: any) => sum + (st.kg || 0), 0)

    return {
      date: new Date().toISOString().split('T')[0],
      todaySales: db.sales.length,
      todayRevenue: todaySales,
      todayExpense: totalExpense,
      totalDebt: totalDebt,
      totalSupplierDebt: totalSupplierDebt,
      productCount: db.products.length,
      totalHeads: totalStockHeads,
      totalKg: totalStockKg,
      lowStock: 0,
      todaySalesCount: db.sales.length,
      todaySalesTotal: todaySales,
      stockSummary: {
        typesCount: db.products.length,
        totalHeads: totalStockHeads,
        totalKg: totalStockKg
      },
      recentSales: db.sales.slice(0, 5)
    }
  }

  if (path === '/dashboard/recent') {
    return {
      sales: db.sales,
      purchases: db.purchases,
      transfers: db.transfers,
      expenses: db.expenses
    }
  }

  if (path === '/dashboard/advanced') {
    return {
      salesByBranch: [
        { branch: "Central ស្ទឹងមានជ័យ", sales: 1300, paid: 1150, credit: 150 },
        { branch: "អូរឫស្សី", sales: 200, paid: 0, credit: 200 },
        { branch: "ផ្សារដើមគរ", sales: 700, paid: 700, credit: 0 }
      ],
      salesByDay: [
        { date: "2026-08-01", sales: 1000, expense: 40 },
        { date: "2026-08-02", sales: 1200, expense: 40 }
      ],
      paymentStatusCounts: { paid: 2, partial: 1, credit: 2 },
      cashBank: { cash: 2500, bank: 1200 },
      stockByBranch: [
        { branch: "Central ស្ទឹងមានជ័យ", heads: 1650, kg: 4125 },
        { branch: "អូរឫស្សី", heads: 700, kg: 1750 },
        { branch: "ផ្សារដើមគរ", heads: 590, "kg": 1475 }
      ],
      topDebtors: db.clients.filter((c: any) => c.debt > 0)
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
        branchId: body.branchId || body.branch || '',
        branch: body.branch || '',
        isSpecial: !!body.isSpecial,
        customPrices: body.customPrices || {},
        debt: 0,
        invoices: 0,
        lastPayment: new Date().toISOString().split('T')[0]
      }
      db.clients.push(newClient)
      await saveDb(db)
      return newClient
    }
    const query = getQuery(event)
    if (query.branchId) {
      return db.clients.filter((c: any) => !c.branchId || c.branchId === query.branchId || c.branch === query.branchId)
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
      await saveDb(db)
      return newSup
    }
    return db.suppliers
  }

  // 💵 Sales
  if (path === '/sales') {
    if (method === 'POST') {
      const body = await readBody(event)
      const invoiceNo = `INV-${Math.floor(1000 + Math.random() * 9000)}`
      const date = body.date || new Date().toISOString().split('T')[0]
      const total = Number(body.total) || 0
      const paid = Number(body.paid) || 0
      const remaining = Math.max(0, total - paid)
      const status = remaining <= 0 ? 'paid' : paid > 0 ? 'partial' : 'credit'

      const clientObj = db.clients ? db.clients.find((c: any) => c.id === body.clientId || c.name === body.client || c.id === body.client) : null

      let newSales: any[] = []
      if (body.items && Array.isArray(body.items) && body.items.length > 0) {
        for (const it of body.items) {
          const itemTotal = Number(it.total) || 0
          const itemRatio = total > 0 ? itemTotal / total : 1 / body.items.length
          const itemPaid = Math.round(paid * itemRatio * 100) / 100
          const itemRemaining = Math.max(0, Math.round((itemTotal - itemPaid) * 100) / 100)

          const s = {
            id: `sl${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            invoiceNo,
            date,
            client: body.client || (clientObj ? clientObj.name : 'អតិថិជនទូទៅ'),
            product: it.productName || it.product,
            unit: it.unit || 'taka',
            qty: Number(it.qty) || 0,
            price: Number(it.price) || 0,
            total: itemTotal,
            status,
            paid: itemPaid,
            remaining: itemRemaining,
            branch: body.branch,
            staff: body.staff || 'Staff',
            method: body.method || 'cash',
          }
          newSales.push(s)
          db.sales.unshift(s)

          // Deduct stock in db.stocks and db.products
          if (db.stocks && Array.isArray(db.stocks)) {
            const st = db.stocks.find((x: any) =>
              (x.productId === it.productId || x.productId === it.product || x.productName === it.productName || x.productName === it.product) &&
              (x.branchId === body.branch || x.branch === body.branch)
            )
            if (st) {
              if (it.heads) st.heads = Math.max(0, (st.heads || 0) - Number(it.heads))
              if (it.kg) st.kg = Math.max(0, (st.kg || 0) - Number(it.kg))
            }
          }
          if (db.products && Array.isArray(db.products)) {
            const prod = db.products.find((p: any) => p.id === it.productId || p.id === it.product || p.name === it.productName || p.name === it.product)
            if (prod && prod.stock && prod.stock[body.branch]) {
              if (it.heads) prod.stock[body.branch].heads = Math.max(0, (prod.stock[body.branch].heads || 0) - Number(it.heads))
              if (it.kg) prod.stock[body.branch].kg = Math.max(0, (prod.stock[body.branch].kg || 0) - Number(it.kg))
            }
          }

          // Auto-memorize sold price for this client at this branch
          if (clientObj && (Number(it.price) > 0)) {
            clientObj.customPrices = clientObj.customPrices || {}
            const prodKey = it.productId || it.product
            const brKey = body.branchId || body.branch
            if (prodKey && brKey) {
              clientObj.customPrices[`${brKey}_${prodKey}`] = Number(it.price)
              clientObj.customPrices[prodKey] = Number(it.price)
            }
          }
        }
      } else {
        const newSale = {
          id: `sl${Date.now()}`,
          invoiceNo,
          date,
          ...body,
          status,
          remaining
        }
        newSales.push(newSale)
        db.sales.unshift(newSale)

        if (clientObj && body.price && Number(body.price) > 0) {
          clientObj.customPrices = clientObj.customPrices || {}
          const prodKey = body.productId || body.product
          const brKey = body.branchId || body.branch
          if (prodKey && brKey) {
            clientObj.customPrices[`${brKey}_${prodKey}`] = Number(body.price)
            clientObj.customPrices[prodKey] = Number(body.price)
          }
        }
      }

      if (remaining > 0 && clientObj) {
        clientObj.debt = (clientObj.debt || 0) + remaining
        clientObj.invoices = (clientObj.invoices || 0) + 1
      }

      await saveDb(db)
      return {
        id: newSales[0]?.id || invoiceNo,
        invoiceNo,
        date,
        client: body.client || (clientObj ? clientObj.name : 'អតិថិជនទូទៅ'),
        branch: body.branch,
        total,
        paid,
        remaining,
        status,
        items: newSales,
        ...newSales[0]
      }
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
      await saveDb(db)
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
      await saveDb(db)
      return newReq
    }
    if (method === 'PATCH') {
      const body = await readBody(event)
      const reqId = path.split('/').pop()
      const reqObj = db.purchaseRequests.find((r: any) => r.id === reqId)
      if (reqObj) {
        reqObj.status = body.status
        await saveDb(db)
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
      await saveDb(db)
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
      await saveDb(db)
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
      await saveDb(db)
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
      await saveDb(db)
      return newPay
    }
    return db.payments
  }

  // ⚙️ Settings - Daily Price Matrix with History
  if (path === '/settings/prices') {
    const query = getQuery(event)
    const targetDate = (query.date as string) || new Date().toISOString().slice(0, 10)

    if (method === 'PUT' || method === 'POST') {
      const body = await readBody(event)
      const saveDate = (body?.date as string) || targetDate
      const rows = Array.isArray(body?.rows) ? body.rows : Array.isArray(body) ? body : []

      if (!db.priceHistory) db.priceHistory = []

      // Remove existing rows for this date and append updated ones
      db.priceHistory = db.priceHistory.filter((r: any) => r.date !== saveDate)

      const newRows = rows.map((r: any) => ({
        id: `pm_${r.productId || r.product?.id}_${r.branchId || r.branch?.id}_${saveDate}`,
        date: saveDate,
        productId: r.productId || r.product?.id,
        branchId: r.branchId || r.branch?.id,
        product: typeof r.product === 'object' ? r.product : db.products.find((p: any) => p.id === (r.productId || r.product)),
        branch: typeof r.branch === 'object' ? r.branch : db.branches.find((b: any) => b.id === (r.branchId || r.branch)),
        costPrice: Number(r.costPrice) || 0,
        sellingPrice: Number(r.sellingPrice) || 0,
        clientSpecialPrice: Number(r.clientSpecialPrice) || 0,
      }))

      db.priceHistory.push(...newRows)
      db.priceMatrix = newRows // also update active matrix
      await saveDb(db)
      return newRows
    }

    if (!db.priceHistory) db.priceHistory = []

    // 1. Look for exact date records
    const exact = db.priceHistory.filter((r: any) => r.date === targetDate)
    if (exact.length > 0) {
      return exact
    }

    // 2. Look for most recent records
    if (db.priceHistory.length > 0) {
      const sorted = [...db.priceHistory].sort((a, b) => b.date.localeCompare(a.date))
      const map = new Map<string, any>()
      for (const r of sorted) {
        const key = `${r.productId}_${r.branchId}`
        if (!map.has(key)) {
          map.set(key, { ...r, date: targetDate })
        }
      }
      return Array.from(map.values())
    }

    // 3. Generate default price matrix if none exists
    const matrix: any[] = []
    for (const prod of (db.products || [])) {
      for (const br of (db.branches || [])) {
        matrix.push({
          id: `pm_${prod.id}_${br.id}_${targetDate}`,
          date: targetDate,
          productId: prod.id,
          branchId: br.id,
          product: prod,
          branch: br,
          costPrice: Math.round(Number(prod.defaultPrice || 5) * 0.75 * 100) / 100,
          sellingPrice: Number(prod.defaultPrice || 5),
          clientSpecialPrice: Math.round(Number(prod.defaultPrice || 5) * 0.9 * 100) / 100,
        })
      }
    }
    db.priceHistory = matrix
    db.priceMatrix = matrix
    await saveDb(db)
    return matrix
  }

  if (path === '/settings') {
    if (method === 'PUT' || method === 'POST') {
      const body = await readBody(event)
      db.settings = { ...db.settings, ...body }
      await saveDb(db)
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

  // 💬 Comments API
  if (path === '/comments' || path.startsWith('/comments')) {
    if (!db.comments) db.comments = []

    if (path === '/comments/react' && method === 'POST') {
      const body = await readBody(event)
      const targetCm = db.comments.find((c: any) => c.id === body.commentId)
      if (targetCm) {
        if (!targetCm.reactions) targetCm.reactions = {}
        const type = body.reactionType || 'thumbsup'
        targetCm.reactions[type] = (targetCm.reactions[type] || 0) + 1
        await saveDb(db)
        return targetCm
      }
      return { error: 'Comment not found' }
    }

    if (method === 'POST') {
      const body = await readBody(event)
      const newComment = {
        id: `cm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        screenId: body.screenId || 'general',
        route: body.route || '/',
        author: body.author || 'Guest Reviewer',
        role: body.role || 'reviewer',
        tag: body.tag || '💡 Suggestion',
        text: body.text || '',
        createdAt: new Date().toISOString(),
        reactions: { thumbsup: 0, heart: 0 }
      }
      db.comments.unshift(newComment)
      await saveDb(db)
      return newComment
    }

    const query = getQuery(event)
    let results = [...db.comments]
    if (query.screenId) {
      results = results.filter((c: any) => c.screenId === query.screenId)
    }
    if (query.route) {
      results = results.filter((c: any) => c.route === query.route)
    }
    return results
  }

  return { message: 'Vercel Serverless JSON API Engine Active', path }
})
