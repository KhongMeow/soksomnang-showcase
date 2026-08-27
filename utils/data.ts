export type Role = "admin" | "sale_staff"
export type Unit = "taka" | "head" | "kg"
export type PayStatus = "paid" | "partial" | "credit"
export type TransferStatus = "pending" | "received" | "cancelled"
export type PurchaseRequestStatus = "pending" | "approved" | "rejected"

export interface Branch {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  defaultPrice: number
  stock: Record<string, { heads: number; kg: number }>
}

export interface Supplier {
  id: string
  name: string
  phone: string
  debt: number
  totalPurchase: number
}

export interface Client {
  id: string
  name: string
  phone: string
  branchId?: string
  branch?: string
  debt: number
  invoices: number
  lastPayment: string
  specialPrice?: number
  isSpecial?: boolean
  customPrices?: Record<string, number>
}

export interface Invoice {
  id: string
  invoiceNo: string
  date: string
  product: string
  total: number
  paid: number
  remaining: number
  status: PayStatus
}

export interface Sale {
  id: string
  invoiceNo: string
  date: string
  client: string
  product: string
  unit: Unit
  qty: number
  price: number
  total: number
  status: PayStatus
  paid: number
  remaining: number
  branch: string
  staff: string
}

export interface Purchase {
  id: string
  invoiceNo: string
  date: string
  supplier: string
  product: string
  heads: number
  kg: number
  total: number
  status: PayStatus
  paid: number
  remaining: number
}

export interface StockTransfer {
  id: string
  transferNo: string
  date: string
  from: string
  to: string
  product: string
  heads: number
  kg: number
  status: TransferStatus
}

export interface PurchaseRequest {
  id: string
  requestNo: string
  date: string
  productId: string
  productName: string
  branchId: string
  branchName: string
  sourceBranchId: string
  sourceBranchName: string
  heads: number
  kg: number
  status: PurchaseRequestStatus
  note: string
  createdByName: string
  createdAt: string
  decidedBy: string | null
  decidedAt: string | null
}

export interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  method: "cash" | "bank"
  branch: string
}

export const BRANCHES: Branch[] = [
  { id: "central", name: "Central ស្ទឹងមានជ័យ" },
  { id: "orussey", name: "អូរឫស្សី" },
  { id: "deimkor", name: "ផ្សារដើមគរ" },
]

export const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "មាន់ស្រែ",
    defaultPrice: 8,
    stock: {
      central: { heads: 450, kg: 1125 },
      orussey: { heads: 200, kg: 500 },
      deimkor: { heads: 180, kg: 450 },
    },
  },
  {
    id: "p2",
    name: "មាន់សាច់",
    defaultPrice: 6,
    stock: {
      central: { heads: 320, kg: 800 },
      orussey: { heads: 150, kg: 375 },
      deimkor: { heads: 120, kg: 300 },
    },
  },
  {
    id: "p3",
    name: "មាន់ទា",
    defaultPrice: 7,
    stock: {
      central: { heads: 280, kg: 700 },
      orussey: { heads: 100, kg: 250 },
      deimkor: { heads: 90, kg: 225 },
    },
  },
  {
    id: "p4",
    name: "មាន់រស់",
    defaultPrice: 5,
    stock: {
      central: { heads: 600, kg: 1500 },
      orussey: { heads: 250, kg: 625 },
      deimkor: { heads: 200, kg: 500 },
    },
  },
]

export const SUPPLIERS: Supplier[] = [
  { id: "s1", name: "Supplier A", phone: "012 345 678", debt: 2500, totalPurchase: 15000 },
  { id: "s2", name: "កសិដ្ឋាន សុខា", phone: "077 123 456", debt: 1800, totalPurchase: 12000 },
  { id: "s3", name: "កសិដ្ឋាន រតនា", phone: "096 789 012", debt: 0, totalPurchase: 8500 },
]

export const CLIENTS: Client[] = [
  { id: "c1", name: "ម៉ូយ ចាន់ណា", phone: "012 111 222", debt: 1500, invoices: 2, lastPayment: "2026-07-28" },
  { id: "c2", name: "ម៉ូយ ស្រីពៅ", phone: "077 333 444", debt: 800, invoices: 1, lastPayment: "2026-07-30" },
  { id: "c3", name: "ហាង សំណាង", phone: "096 555 666", debt: 3200, invoices: 3, lastPayment: "2026-07-25" },
  { id: "c4", name: "ម៉ូយ វណ្ណា", phone: "011 777 888", debt: 0, invoices: 0, lastPayment: "2026-08-01" },
  { id: "c5", name: "ហាង ចន្ទ", phone: "078 999 000", debt: 650, invoices: 1, lastPayment: "2026-07-29" },
]

export const CLIENT_INVOICES: Record<string, Invoice[]> = {
  c1: [
    { id: "inv1", invoiceNo: "INV-0795", date: "2026-07-25", product: "មាន់ស្រែ", total: 800, paid: 300, remaining: 500, status: "partial" },
    { id: "inv2", invoiceNo: "INV-0790", date: "2026-07-20", product: "មាន់រស់", total: 1000, paid: 0, remaining: 1000, status: "credit" },
  ],
  c2: [
    { id: "inv3", invoiceNo: "INV-0798", date: "2026-07-30", product: "មាន់សាច់", total: 800, paid: 0, remaining: 800, status: "credit" },
  ],
  c3: [
    { id: "inv4", invoiceNo: "INV-0785", date: "2026-07-15", product: "មាន់ទា", total: 1500, paid: 300, remaining: 1200, status: "partial" },
    { id: "inv5", invoiceNo: "INV-0780", date: "2026-07-10", product: "មាន់ស្រែ", total: 1200, paid: 500, remaining: 700, status: "partial" },
    { id: "inv6", invoiceNo: "INV-0770", date: "2026-07-01", product: "មាន់រស់", total: 1300, paid: 0, remaining: 1300, status: "credit" },
  ],
  c5: [
    { id: "inv7", invoiceNo: "INV-0797", date: "2026-07-29", product: "មាន់ស្រែ", total: 650, paid: 0, remaining: 650, status: "credit" },
  ],
}

export const RECENT_SALES: Sale[] = [
  { id: "sa1", invoiceNo: "INV-0801", date: "2026-08-02", client: "ម៉ូយ ចាន់ណា", product: "មាន់ស្រែ", unit: "taka", qty: 2, price: 500, total: 1000, status: "paid", paid: 1000, remaining: 0, branch: "Central", staff: "ដារ៉ា" },
  { id: "sa2", invoiceNo: "INV-0800", date: "2026-08-02", client: "ហាង សំណាង", product: "មាន់សាច់", unit: "kg", qty: 50, price: 4, total: 200, status: "credit", paid: 0, remaining: 200, branch: "អូរឫស្សី", staff: "សំណាង" },
  { id: "sa3", invoiceNo: "INV-0799", date: "2026-08-01", client: "ម៉ូយ ស្រីពៅ", product: "មាន់រស់", unit: "head", qty: 50, price: 6, total: 300, status: "partial", paid: 150, remaining: 150, branch: "Central", staff: "ដារ៉ា" },
  { id: "sa4", invoiceNo: "INV-0798", date: "2026-08-01", client: "ហាង ចន្ទ", product: "មាន់ទា", unit: "taka", qty: 1, price: 700, total: 700, status: "paid", paid: 700, remaining: 0, branch: "ផ្សារដើមគរ", staff: "ចន្ទ" },
]

export const RECENT_PURCHASES: Purchase[] = [
  { id: "pu1", invoiceNo: "PUR-0201", date: "2026-08-02", supplier: "Supplier A", product: "មាន់ស្រែ", heads: 200, kg: 400, total: 1000, status: "paid", paid: 1000, remaining: 0 },
  { id: "pu2", invoiceNo: "PUR-0200", date: "2026-08-01", supplier: "កសិដ្ឋាន សុខា", product: "មាន់សាច់", heads: 150, kg: 375, total: 1500, status: "partial", paid: 700, remaining: 800 },
]

export const RECENT_TRANSFERS: StockTransfer[] = [
  { id: "tr1", transferNo: "TRF-0101", date: "2026-08-02", from: "Central", to: "អូរឫស្សី", product: "មាន់ស្រែ", heads: 50, kg: 125, status: "received" },
  { id: "tr2", transferNo: "TRF-0100", date: "2026-08-01", from: "Central", to: "ផ្សារដើមគរ", product: "មាន់សាច់", heads: 30, kg: 75, status: "pending" },
]

export const EXPENSE_CATEGORIES = [
  "ប្រាក់ឈ្នួលពលករ",
  "ប្រេងឥន្ធនៈ",
  "ម្ហូបអាហារ",
  "ថ្លៃដឹក",
  "ថ្លៃប្រាស",
  "ថ្ងូរ/ឧបករណ៍",
  "ផ្សេងៗ",
]

export const RECENT_EXPENSES: Expense[] = [
  { id: "ex1", date: "2026-08-02", category: "ថ្លៃដឹក", description: "ដឹកមាន់ Central → អូរឫស្សី", amount: 25, method: "cash", branch: "Central" },
  { id: "ex2", date: "2026-08-02", category: "ម្ហូបអាហារ", description: "អាហារពេលព្រឹក", amount: 15, method: "cash", branch: "Central" },
  { id: "ex3", date: "2026-08-01", category: "ប្រេងឥន្ធនៈ", description: "បំពេញប្រេងឡាន", amount: 40, method: "cash", branch: "Central" },
]
