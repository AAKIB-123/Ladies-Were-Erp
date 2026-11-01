import { Types } from 'mongoose';
import { Sale } from '../models/Sale';
import { Purchase } from '../models/Purchase';
import { Expense } from '../models/Expense';
import { Payment } from '../models/Payment';
import { Inventory } from '../models/Inventory';
import { SalesReturn } from '../models/SalesReturn';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { Location } from '../models/Location';

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export function parsePeriodDates(period?: string, customStart?: string, customEnd?: string): { start?: Date; end?: Date } {
  const now = new Date();

  if (customStart || customEnd) {
    const start = customStart ? new Date(customStart) : undefined;
    if (start) start.setHours(0, 0, 0, 0);

    const end = customEnd ? new Date(customEnd) : undefined;
    if (end) end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
    const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'this_week') {
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  return {};
}

export async function calculateProfitAndLoss(filter: {
  locationId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const salesFilter: any = { isVoided: false };
  const returnsFilter: any = {};
  const expensesFilter: any = { isVoided: false };
  const purchasesFilter: any = { status: 'posted' };

  if (filter.locationId) {
    salesFilter.locationId = new Types.ObjectId(filter.locationId);
    returnsFilter.locationId = new Types.ObjectId(filter.locationId);
    // Location-specific expenses or shared expenses without duplicate counting
    expensesFilter.locationId = new Types.ObjectId(filter.locationId);
    purchasesFilter.receivingLocationId = new Types.ObjectId(filter.locationId);
  }

  if (filter.startDate || filter.endDate) {
    salesFilter.saleDate = {};
    returnsFilter.returnDate = {};
    expensesFilter.expenseDate = {};
    purchasesFilter.purchaseDate = {};

    if (filter.startDate) {
      salesFilter.saleDate.$gte = filter.startDate;
      returnsFilter.returnDate.$gte = filter.startDate;
      expensesFilter.expenseDate.$gte = filter.startDate;
      purchasesFilter.purchaseDate.$gte = filter.startDate;
    }
    if (filter.endDate) {
      salesFilter.saleDate.$lte = filter.endDate;
      returnsFilter.returnDate.$lte = filter.endDate;
      expensesFilter.expenseDate.$lte = filter.endDate;
      purchasesFilter.purchaseDate.$lte = filter.endDate;
    }
  }

  // 1. Fetch Sales
  const sales = await Sale.find(salesFilter);
  const returns = await SalesReturn.find(returnsFilter);
  const expenses = await Expense.find(expensesFilter);
  const purchases = await Purchase.find(purchasesFilter);

  // Sales aggregates
  let grossSales = 0;
  let totalDiscounts = 0;
  let totalConfirmedCogs = 0;
  let unresolvedQuickSaleRevenue = 0;
  let unresolvedQuickSaleCount = 0;

  for (const s of sales) {
    grossSales += s.grossAmount;
    totalDiscounts += s.discountAmount;

    if (s.isReconciled) {
      totalConfirmedCogs += s.totalCogs || 0;
    } else {
      unresolvedQuickSaleRevenue += s.netAmount;
      unresolvedQuickSaleCount += 1;
    }
  }

  // Returns aggregates
  let totalSalesReturns = 0;
  let totalReturnCogsReversal = 0;

  for (const r of returns) {
    totalSalesReturns += r.totalRefundAmount;
    for (const item of r.items) {
      if (item.isRestocked) {
        totalReturnCogsReversal += Math.round(item.quantityReturned * item.unitCostSnapshot * 100) / 100;
      }
    }
  }

  // Net Sales: Gross Sales - Discounts - Returns (Prompt Equation Section 17)
  const netSales = Math.max(0, Math.round((grossSales - totalDiscounts - totalSalesReturns) * 100) / 100);

  // Net COGS: Cost of sold items minus restocked return cost reversals
  const netCogs = Math.max(0, Math.round((totalConfirmedCogs - totalReturnCogsReversal) * 100) / 100);

  // Confirmed Gross Profit
  const confirmedGrossProfit = Math.round((netSales - unresolvedQuickSaleRevenue - netCogs) * 100) / 100;

  // Total Business Operating Expenses
  const totalOperatingExpenses = Math.round(
    expenses.reduce((sum, e) => sum + e.amount, 0) * 100
  ) / 100;

  // Confirmed Net Profit
  const confirmedNetProfit = Math.round((confirmedGrossProfit - totalOperatingExpenses) * 100) / 100;

  // Provisional Gross & Net Profit (including unresolved Quick Sales)
  const provisionalGrossProfit = Math.round((netSales - netCogs) * 100) / 100;
  const provisionalNetProfit = Math.round((provisionalGrossProfit - totalOperatingExpenses) * 100) / 100;

  const isProvisional = unresolvedQuickSaleCount > 0;

  return {
    period: {
      startDate: filter.startDate,
      endDate: filter.endDate
    },
    locationId: filter.locationId,
    sales: {
      grossSales: Math.round(grossSales * 100) / 100,
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
      totalSalesReturns: Math.round(totalSalesReturns * 100) / 100,
      netSales,
      salesCount: sales.length
    },
    cogs: {
      confirmedCogs: totalConfirmedCogs,
      returnCogsReversal: totalReturnCogsReversal,
      netCogs
    },
    operatingExpenses: {
      total: totalOperatingExpenses,
      expenseCount: expenses.length
    },
    purchasesCapitalized: {
      totalAmount: Math.round(purchases.reduce((s, p) => s + p.totalAmount, 0) * 100) / 100,
      count: purchases.length,
      note: 'Purchases are capitalized into balance sheet inventory assets, NOT expensed until sold.'
    },
    profit: {
      confirmedGrossProfit,
      confirmedNetProfit,
      isProvisional,
      unresolvedQuickSaleRevenue: Math.round(unresolvedQuickSaleRevenue * 100) / 100,
      unresolvedQuickSaleCount,
      provisionalGrossProfit,
      provisionalNetProfit,
      provisionalWarning: isProvisional
        ? `Warning: There are ${unresolvedQuickSaleCount} unresolved Quick Sales totalling ₹${unresolvedQuickSaleRevenue.toFixed(2)} in revenue without confirmed product costs. Reported profit is provisional.`
        : null
    }
  };
}

export async function getDashboardOverview(filter: {
  locationId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const pnl = await calculateProfitAndLoss(filter);

  // Payments & Receipts Breakdown
  const paymentFilter: any = {};
  if (filter.locationId) paymentFilter.locationId = new Types.ObjectId(filter.locationId);
  if (filter.startDate || filter.endDate) {
    paymentFilter.paymentDate = {};
    if (filter.startDate) paymentFilter.paymentDate.$gte = filter.startDate;
    if (filter.endDate) paymentFilter.paymentDate.$lte = filter.endDate;
  }

  const payments = await Payment.find(paymentFilter);

  let cashReceipts = 0;
  let upiReceipts = 0;
  let bankReceipts = 0;

  for (const p of payments) {
    if (p.paymentType === 'customer_collection' || p.paymentType === 'customer_sale') {
      if (p.paymentMethod === 'cash') cashReceipts += p.amount;
      else if (p.paymentMethod === 'upi') upiReceipts += p.amount;
      else if (p.paymentMethod === 'bank_transfer' || p.paymentMethod === 'cheque') bankReceipts += p.amount;
    }
  }

  // Balances
  const customers = await Customer.find({ isActive: true });
  const totalCustomerReceivables = Math.round(
    customers.reduce((acc, c) => acc + (c.outstandingBalance || 0), 0) * 100
  ) / 100;

  const suppliers = await Supplier.find({ isActive: true });
  const totalSupplierPayables = Math.round(
    suppliers.reduce((acc, s) => acc + (s.outstandingPayable || 0), 0) * 100
  ) / 100;

  // Inventory Valuation at current Weighted Average Cost
  const inventoryFilter: any = {};
  if (filter.locationId) inventoryFilter.locationId = new Types.ObjectId(filter.locationId);

  const inventories = await Inventory.find(inventoryFilter).populate('productId');
  let totalInventoryUnits = 0;
  let totalInventoryValuation = 0;
  let lowStockAlertCount = 0;

  for (const inv of inventories) {
    const qty = inv.quantityOnHand;
    totalInventoryUnits += qty;
    if (qty <= 2) lowStockAlertCount += 1;

    const prod: any = inv.productId;
    const variant = prod?.variants?.find((v: any) => v.variantId === inv.variantId);
    const unitCost = variant?.currentCost || prod?.currentWeightedAverageCost || 0;
    totalInventoryValuation += Math.round(qty * unitCost * 100) / 100;
  }

  // Location Breakdown
  const allLocations = await Location.find();
  const salesByLocation: Record<string, { name: string; netSales: number; salesCount: number }> = {};
  for (const l of allLocations) {
    salesByLocation[l._id.toString()] = { name: l.name, netSales: 0, salesCount: 0 };
  }

  const rawSales = await Sale.find({
    isVoided: false,
    ...(filter.startDate || filter.endDate
      ? {
          saleDate: {
            ...(filter.startDate ? { $gte: filter.startDate } : {}),
            ...(filter.endDate ? { $lte: filter.endDate } : {})
          }
        }
      : {})
  });

  for (const s of rawSales) {
    const lid = s.locationId.toString();
    if (salesByLocation[lid]) {
      salesByLocation[lid].netSales += s.netAmount;
      salesByLocation[lid].salesCount += 1;
    }
  }

  // Expenses by Category
  const rawExpenses = await Expense.find({
    isVoided: false,
    ...(filter.startDate || filter.endDate
      ? {
          expenseDate: {
            ...(filter.startDate ? { $gte: filter.startDate } : {}),
            ...(filter.endDate ? { $lte: filter.endDate } : {})
          }
        }
      : {})
  });

  const expenseByCategory: Record<string, number> = {};
  for (const e of rawExpenses) {
    expenseByCategory[e.category] = Math.round(((expenseByCategory[e.category] || 0) + e.amount) * 100) / 100;
  }

  return {
    kpis: {
      netSales: pnl.sales.netSales,
      confirmedGrossProfit: pnl.profit.confirmedGrossProfit,
      confirmedNetProfit: pnl.profit.confirmedNetProfit,
      isProvisional: pnl.profit.isProvisional,
      unresolvedQuickSaleRevenue: pnl.profit.unresolvedQuickSaleRevenue,
      unresolvedQuickSaleCount: pnl.profit.unresolvedQuickSaleCount,
      provisionalNetProfit: pnl.profit.provisionalNetProfit,
      provisionalWarning: pnl.profit.provisionalWarning,
      totalOperatingExpenses: pnl.operatingExpenses.total,
      totalPurchases: pnl.purchasesCapitalized.totalAmount,
      cashReceipts: Math.round(cashReceipts * 100) / 100,
      upiReceipts: Math.round(upiReceipts * 100) / 100,
      bankReceipts: Math.round(bankReceipts * 100) / 100,
      totalCustomerReceivables,
      totalSupplierPayables,
      totalInventoryUnits,
      totalInventoryValuation: Math.round(totalInventoryValuation * 100) / 100,
      lowStockAlertCount
    },
    charts: {
      salesByLocation: Object.values(salesByLocation),
      expensesByCategory: Object.entries(expenseByCategory).map(([category, amount]) => ({
        category,
        amount
      }))
    },
    pnl
  };
}

export async function getInventoryValuationReport(locationId?: string) {
  const filter: any = {};
  if (locationId) {
    filter.locationId = new Types.ObjectId(locationId);
  }

  const inventories = await Inventory.find(filter)
    .populate('productId')
    .populate('locationId');

  let totalUnits = 0;
  let totalValuation = 0;

  const items = inventories.map((inv: any) => {
    const prod = inv.productId;
    const loc = inv.locationId;
    const variant = prod?.variants?.find((v: any) => v.variantId === inv.variantId);

    const unitCost = variant?.currentCost || prod?.currentWeightedAverageCost || 0;
    const lineValuation = Math.round(inv.quantityOnHand * unitCost * 100) / 100;

    totalUnits += inv.quantityOnHand;
    totalValuation += lineValuation;

    return {
      inventoryId: inv._id,
      productId: prod?._id,
      productName: prod?.name || 'Unknown Product',
      sku: prod?.sku || 'N/A',
      category: prod?.category || 'General',
      variantId: inv.variantId,
      variantName: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() : 'Standard',
      size: variant?.size,
      color: variant?.color,
      locationId: loc?._id,
      locationName: loc?.name || 'Unknown Location',
      quantityOnHand: inv.quantityOnHand,
      unitCost,
      totalValuation: lineValuation
    };
  });

  return {
    locationId,
    totalItems: items.length,
    totalUnits,
    totalValuation: Math.round(totalValuation * 100) / 100,
    items
  };
}

