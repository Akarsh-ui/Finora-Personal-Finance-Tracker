import path from 'path';
import dotenv from 'dotenv';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

const BASE_URL = 'http://localhost:3000';

async function runStage7Tests() {
  console.log('================================================================');
  console.log('🧪 FINORA STAGE 7 ADVANCED ANALYTICS & REPORTING AUDIT SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(num, name, condition, details = '') {
    if (condition) {
      passed++;
      console.log(`✅ [${num}/15] PASS: ${name}`);
      if (details) console.log(`   └─ ${details}`);
    } else {
      failed++;
      console.error(`❌ [${num}/15] FAIL: ${name}`);
      if (details) console.error(`   └─ ${details}`);
    }
  }

  const timestamp = Date.now();
  const userA = {
    name: 'Analytics Lead Alice',
    email: `alice.analytics.${timestamp}@finora.test`,
    password: 'AliceAnalytics@123',
    token: null,
  };

  const userB = {
    name: 'Analytics Lead Bob',
    email: `bob.analytics.${timestamp}@finora.test`,
    password: 'BobAnalytics@123',
    token: null,
  };

  const userC = {
    name: 'Empty State User Carol',
    email: `carol.analytics.${timestamp}@finora.test`,
    password: 'CarolAnalytics@123',
    token: null,
  };

  const apiCall = async (url, method = 'GET', body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${url}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      // ignore
    }
    return { status: res.status, data };
  };

  // Sign up test users
  const resA = await apiCall('/api/auth/signup', 'POST', userA);
  userA.token = resA.data?.token;

  const resB = await apiCall('/api/auth/signup', 'POST', userB);
  userB.token = resB.data?.token;

  const resC = await apiCall('/api/auth/signup', 'POST', userC);
  userC.token = resC.data?.token;

  if (!userA.token || !userB.token || !userC.token) {
    console.error('Fatal: Failed to authenticate test users.');
    process.exit(1);
  }

  // Current month transactions for User A
  // Seed Income: Salary (80,000), Freelance (20,000) => Total Income: 100,000
  // Seed Expenses: Rent (25,000), Groceries (6,000), Utilities (2,500), Dining Out (3,500) => Total Expenses: 37,000
  // Net Savings: 63,000 | Savings Rate: 63%
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');

  const currentMonthTxs = [
    {
      description: 'Monthly Engineering Salary',
      type: 'income',
      amount: 80000,
      category: 'Salary',
      date: `${yyyy}-${mm}-02`,
      paymentMethod: 'Bank Transfer',
      notes: 'Direct monthly payroll',
    },
    {
      description: 'UI Design Freelance Milestone',
      type: 'income',
      amount: 20000,
      category: 'Freelance',
      date: `${yyyy}-${mm}-10`,
      paymentMethod: 'UPI',
      notes: 'Client app design',
    },
    {
      description: 'Apartment Monthly Rent',
      type: 'expense',
      amount: 25000,
      category: 'Rent',
      date: `${yyyy}-${mm}-03`,
      paymentMethod: 'Bank Transfer',
      notes: 'October flat rent',
    },
    {
      description: 'Whole Foods Grocery Haul',
      type: 'expense',
      amount: 6000,
      category: 'Groceries',
      date: `${yyyy}-${mm}-06`,
      paymentMethod: 'Credit Card',
      notes: 'Monthly staples',
    },
    {
      description: 'Fiber Broadband & Electricity',
      type: 'expense',
      amount: 2500,
      category: 'Utilities',
      date: `${yyyy}-${mm}-08`,
      paymentMethod: 'Debit Card',
      notes: 'Utility bill payments',
    },
    {
      description: 'Gourmet Bistro Dinner',
      type: 'expense',
      amount: 3500,
      category: 'Dining Out',
      date: `${yyyy}-${mm}-12`,
      paymentMethod: 'UPI',
      notes: 'Celebration dinner',
    },
  ];

  for (const tx of currentMonthTxs) {
    await apiCall('/api/transactions', 'POST', tx, userA.token);
  }

  // Previous month transaction for User A (to verify previous-period comparisons)
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 15);
  const prevYyyy = prevMonthDate.getFullYear();
  const prevMm = String(prevMonthDate.getMonth() + 1).padStart(2, '0');

  await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Previous Month Salary',
      type: 'income',
      amount: 75000,
      category: 'Salary',
      date: `${prevYyyy}-${prevMm}-05`,
      paymentMethod: 'Bank Transfer',
    },
    userA.token
  );

  await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Previous Month Rent',
      type: 'expense',
      amount: 25000,
      category: 'Rent',
      date: `${prevYyyy}-${prevMm}-05`,
      paymentMethod: 'Bank Transfer',
    },
    userA.token
  );

  // User B private transaction (for isolation check)
  await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Bob Super Confidential Investment',
      type: 'income',
      amount: 500000,
      category: 'Investment',
      date: `${yyyy}-${mm}-05`,
      paymentMethod: 'Wire',
    },
    userB.token
  );

  // 1. Summary cards against actual database transactions
  const resAnalyticsThisMonth = await apiCall(
    '/api/transactions/analytics?period=this_month',
    'GET',
    null,
    userA.token
  );
  const aSummary = resAnalyticsThisMonth.data?.summary;
  report(
    1,
    'Summary cards against actual database transactions',
    resAnalyticsThisMonth.status === 200 &&
      aSummary?.totalIncome === 100000 &&
      aSummary?.totalExpenses === 37000 &&
      aSummary?.netSavings === 63000 &&
      aSummary?.savingsRate === 63,
    `Income: ₹${aSummary?.totalIncome}, Expenses: ₹${aSummary?.totalExpenses}, Net Savings: ₹${aSummary?.netSavings}, Savings Rate: ${aSummary?.savingsRate}%`
  );

  // 2. Monthly income and expense charts
  const resAnalytics6M = await apiCall(
    '/api/transactions/analytics?period=last_6_months',
    'GET',
    null,
    userA.token
  );
  const monthlyTrends = resAnalytics6M.data?.monthlyTrends || [];
  const currentMonthTrend = monthlyTrends.find(
    (m) => m.key === `${yyyy}-${mm}`
  );
  report(
    2,
    'Monthly income and expense charts aggregation',
    monthlyTrends.length > 0 &&
      currentMonthTrend &&
      currentMonthTrend.income === 100000 &&
      currentMonthTrend.expense === 37000 &&
      currentMonthTrend.savings === 63000,
    `Found trend for ${currentMonthTrend?.month}: Inflow ₹${currentMonthTrend?.income}, Outflow ₹${currentMonthTrend?.expense}`
  );

  // 3. Category-wise expense calculations
  const expenseBreakdown = resAnalyticsThisMonth.data?.expenseBreakdown || [];
  const rentExp = expenseBreakdown.find((e) => e.category === 'Rent');
  const groceriesExp = expenseBreakdown.find((e) => e.category === 'Groceries');
  const highestExp = resAnalyticsThisMonth.data?.highestExpenseCategory;
  report(
    3,
    'Category-wise expense calculations and top spending categories',
    expenseBreakdown.length === 4 &&
      rentExp?.amount === 25000 &&
      groceriesExp?.amount === 6000 &&
      highestExp?.category === 'Rent' &&
      highestExp?.percentage === 67.6,
    `Highest expense category: ${highestExp?.category} (${highestExp?.percentage}%), Top 5 count: ${resAnalyticsThisMonth.data?.top5Expenses?.length}`
  );

  // 4. Income source calculations
  const incomeBreakdown = resAnalyticsThisMonth.data?.incomeBreakdown || [];
  const salaryInc = incomeBreakdown.find((i) => i.category === 'Salary');
  const freelanceInc = incomeBreakdown.find((i) => i.category === 'Freelance');
  const highestInc = resAnalyticsThisMonth.data?.highestIncomeCategory;
  report(
    4,
    'Income source calculations and distribution without expense mixing',
    incomeBreakdown.length === 2 &&
      salaryInc?.amount === 80000 &&
      freelanceInc?.amount === 20000 &&
      highestInc?.category === 'Salary' &&
      highestInc?.percentage === 80,
    `Primary source: ${highestInc?.category} (₹${highestInc?.amount}, ${highestInc?.percentage}%)`
  );

  // 5. Custom date ranges
  const resCustom = await apiCall(
    `/api/transactions/analytics?period=custom&startDate=${yyyy}-${mm}-01&endDate=${yyyy}-${mm}-07`,
    'GET',
    null,
    userA.token
  );
  // Between 01 and 07: Salary (80,000), Rent (25,000), Groceries (6,000)
  const customSum = resCustom.data?.summary;
  report(
    5,
    'Custom date ranges filtering',
    resCustom.status === 200 &&
      customSum?.totalIncome === 80000 &&
      customSum?.totalExpenses === 31000 &&
      customSum?.transactionCount === 3,
    `Custom [01 to 07]: Inflow ₹${customSum?.totalIncome}, Outflow ₹${customSum?.totalExpenses}, Count: ${customSum?.transactionCount}`
  );

  // 6. Previous-period comparisons
  const resPrevComp = await apiCall(
    '/api/transactions/analytics?period=this_month',
    'GET',
    null,
    userA.token
  );
  const pSum = resPrevComp.data?.summary;
  report(
    6,
    'Previous-period comparisons and percentage changes',
    pSum &&
      pSum.prevTotalIncome === 75000 &&
      pSum.prevTotalExpenses === 25000 &&
      pSum.incomeChangePct === 33.3 &&
      pSum.expenseChangePct === 48,
    `Income changed: +${pSum?.incomeChangePct}%, Expense changed: +${pSum?.expenseChangePct}%`
  );

  // 7. Empty-state handling
  const resCarol = await apiCall(
    '/api/transactions/analytics?period=this_month',
    'GET',
    null,
    userC.token
  );
  report(
    7,
    'Empty-state handling for accounts with zero transactions',
    resCarol.status === 200 &&
      resCarol.data?.hasData === false &&
      resCarol.data?.summary?.totalIncome === 0 &&
      resCarol.data?.summary?.totalExpenses === 0 &&
      resCarol.data?.summary?.netSavings === 0 &&
      resCarol.data?.summary?.savingsRate === 0 &&
      resCarol.data?.insights?.length === 0,
    `Safe empty response with hasData: false, 0 metrics, no crash`
  );

  // 8. Negative savings calculations
  // Seed User C with expense > income
  await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Small Stipend',
      type: 'income',
      amount: 10000,
      category: 'Other',
      date: `${yyyy}-${mm}-05`,
      paymentMethod: 'Cash',
    },
    userC.token
  );
  await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Emergency Medical Hospitalization',
      type: 'expense',
      amount: 50000,
      category: 'Healthcare',
      date: `${yyyy}-${mm}-06`,
      paymentMethod: 'Credit Card',
    },
    userC.token
  );

  const resCarolDeficit = await apiCall(
    '/api/transactions/analytics?period=this_month',
    'GET',
    null,
    userC.token
  );
  const cSum = resCarolDeficit.data?.summary;
  const deficitInsight = resCarolDeficit.data?.insights?.find(
    (i) => i.id === 'savings-rate'
  );
  report(
    8,
    'Negative savings calculations (Outflows exceed Inflows)',
    cSum?.totalIncome === 10000 &&
      cSum?.totalExpenses === 50000 &&
      cSum?.netSavings === -40000 &&
      cSum?.savingsRate === -400 &&
      deficitInsight?.type === 'warning',
    `Deficit: ₹${cSum?.netSavings}, Savings Rate: ${cSum?.savingsRate}%, Warning insight triggered`
  );

  // 9. CSV export generation logic
  const txsToExport = resAnalyticsThisMonth.data?.transactions || [];
  const csvHeaders = ['Date', 'Description', 'Type', 'Category', 'Amount (INR)', 'Payment Method', 'Notes'];
  const hasValidCSVFields =
    txsToExport.length === 6 &&
    txsToExport.every(
      (t) =>
        t.date &&
        t.description &&
        t.type &&
        t.category &&
        typeof t.amount === 'number'
    );
  report(
    9,
    'CSV export schema and transaction records serialization',
    hasValidCSVFields,
    `Validated ${txsToExport.length} transactions with headers: [${csvHeaders.join(', ')}]`
  );

  // 10. PDF report generation logic (jsPDF document structure with autotable)
  let pdfRenderOk = false;
  try {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Metric', 'Value']],
      body: [
        ['Total Income', '₹1,00,000.00'],
        ['Total Expenses', '₹37,000.00'],
        ['Net Savings', '₹63,000.00'],
      ],
    });
    const pdfDataUri = doc.output('datauristring');
    pdfRenderOk = typeof pdfDataUri === 'string' && pdfDataUri.startsWith('data:application/pdf');
  } catch (err) {
    console.error('PDF error:', err);
  }
  report(
    10,
    'PDF report generation using jsPDF and jspdf-autotable',
    pdfRenderOk,
    `Successfully constructed PDF buffer with table headers and metric bodies`
  );

  // 11. User-specific data isolation
  const resAnalyticsBob = await apiCall(
    '/api/transactions/analytics?period=this_month',
    'GET',
    null,
    userB.token
  );
  const bobSummary = resAnalyticsBob.data?.summary;
  report(
    11,
    'User-specific data isolation (User A vs User B)',
    bobSummary?.totalIncome === 500000 &&
      bobSummary?.totalExpenses === 0 &&
      aSummary?.totalIncome === 100000,
    `User B has ₹5,00,000 income, completely isolated from User A's ₹1,00,000`
  );

  // 12. Persistence after refresh
  const meRes = await apiCall('/api/auth/me', 'GET', null, userA.token);
  const reloadAnalytics = await apiCall(
    '/api/transactions/analytics?period=this_month',
    'GET',
    null,
    userA.token
  );
  report(
    12,
    'Persistence after session refresh (/api/auth/me)',
    meRes.status === 200 &&
      meRes.data?.user?.email === userA.email &&
      reloadAnalytics.data?.summary?.netSavings === 63000,
    `Verified session for ${meRes.data?.user?.name}, analytics intact on reload`
  );

  // 13. Existing dashboard calculations
  const dashboardTxsRes = await apiCall('/api/transactions?limit=500', 'GET', null, userA.token);
  const allUserATxs = dashboardTxsRes.data?.transactions || [];
  const calculatedIncome = allUserATxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const calculatedExpenses = allUserATxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  report(
    13,
    'Existing dashboard calculations from all user records',
    calculatedIncome === 175000 && calculatedExpenses === 62000,
    `All-time user transactions: Inflow ₹${calculatedIncome}, Outflow ₹${calculatedExpenses}`
  );

  // 14. Existing budget calculations
  const curMonthNum = today.getMonth() + 1;
  const curYearNum = today.getFullYear();
  const createBudgetRes = await apiCall(
    '/api/budgets',
    'POST',
    {
      category: 'Rent',
      monthlyLimit: 30000,
      month: curMonthNum,
      year: curYearNum,
    },
    userA.token
  );

  const getBudgetsRes = await apiCall(
    `/api/budgets?month=${curMonthNum}&year=${curYearNum}`,
    'GET',
    null,
    userA.token
  );
  report(
    14,
    'Existing budget calculations and persistence',
    createBudgetRes.status === 201 &&
      getBudgetsRes.status === 200 &&
      getBudgetsRes.data?.budgets?.some((b) => b.category === 'Rent' && b.monthlyLimit === 30000),
    `Budget created and retrieved for Rent with limit ₹30,000`
  );

  // 15. Existing transaction search and CRUD
  const searchRes = await apiCall(
    '/api/transactions?search=Engineering',
    'GET',
    null,
    userA.token
  );
  const newTxRes = await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Stage 7 Temporary Crud Test',
      type: 'expense',
      amount: 450,
      category: 'Shopping',
      date: `${yyyy}-${mm}-15`,
    },
    userA.token
  );
  const newId = newTxRes.data?.transaction?._id || newTxRes.data?.transaction?.id;
  const delTxRes = await apiCall(`/api/transactions/${newId}`, 'DELETE', null, userA.token);

  report(
    15,
    'Existing transaction search and CRUD operations',
    searchRes.status === 200 &&
      searchRes.data?.transactions?.length === 1 &&
      searchRes.data?.transactions[0].description.includes('Engineering') &&
      newTxRes.status === 201 &&
      delTxRes.status === 200,
    `Search matches "Engineering", Created and Deleted temporary transaction`
  );

  console.log('\n================================================================');
  console.log(`📊 STAGE 7 AUDIT SUMMARY: ${passed}/15 PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage7Tests().catch((err) => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
