import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

const BASE_URL = 'http://localhost:3000';

async function runAudit() {
  console.log('================================================================');
  console.log('🔍 FINORA STAGE 4 THOROUGH AUDIT & COMPREHENSIVE VERIFICATION');
  console.log('================================================================\n');

  const results = {
    crud: [],
    security: [],
    calculations: [],
    validation: [],
    buildAndCode: [],
  };

  const auditTimestamp = Date.now();
  const primaryUser = {
    name: 'Audit User 1',
    email: `audit1.${auditTimestamp}@finora.test`,
    password: 'AuditPassword@123',
    token: null,
    cookie: null,
  };

  const secondaryUser = {
    name: 'Audit User 2',
    email: `audit2.${auditTimestamp}@finora.test`,
    password: 'AuditPassword@456',
    token: null,
    cookie: null,
  };

  // Helper for auth requests
  const apiCall = async (url, method = 'GET', body = null, token = null, cookie = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (cookie) headers['Cookie'] = cookie;

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
    return { status: res.status, headers: res.headers, data };
  };

  // 1. SETUP: Create primary and secondary test users
  console.log('--- Setting up test accounts ---');
  const u1Signup = await apiCall('/api/auth/signup', 'POST', primaryUser);
  primaryUser.token = u1Signup.data?.token;
  primaryUser.cookie = u1Signup.headers.get('set-cookie');

  const u2Signup = await apiCall('/api/auth/signup', 'POST', secondaryUser);
  secondaryUser.token = u2Signup.data?.token;
  secondaryUser.cookie = u2Signup.headers.get('set-cookie');

  console.log('Test users created successfully.\n');

  // ============================================================================
  // SECTION 1: TRANSACTION CRUD
  // ============================================================================
  console.log('--- SECTION 1: Transaction CRUD Audit ---');

  // 1.1 Add Income Transaction
  let incomeTxId = null;
  const incRes = await apiCall(
    '/api/transactions',
    'POST',
    {
      title: 'Consulting Retainer',
      description: 'Consulting Retainer',
      amount: 85000,
      type: 'income',
      category: 'Freelance',
      date: new Date().toISOString(),
      paymentMethod: 'Net Banking',
      notes: 'October consulting retainer fee',
    },
    primaryUser.token
  );

  incomeTxId = incRes.data?.transaction?.id || incRes.data?.transaction?._id;
  const passed1_1 = incRes.status === 201 && incRes.data?.success && incomeTxId;
  results.crud.push({
    name: 'Add new income transaction (₹85,000)',
    passed: Boolean(passed1_1),
    detail: `HTTP ${incRes.status}, ID: ${incomeTxId}`,
  });
  console.log(`1.1 Add Income: ${passed1_1 ? 'PASS' : 'FAIL'}`);

  // 1.2 Add Expense Transaction
  let expenseTxId = null;
  const expRes = await apiCall(
    '/api/transactions',
    'POST',
    {
      title: 'Office Rental & Coworking',
      description: 'Office Rental & Coworking',
      amount: 22000,
      type: 'expense',
      category: 'Housing & Rent',
      date: new Date().toISOString(),
      paymentMethod: 'UPI Pay',
      notes: 'Dedicated desk monthly fee',
    },
    primaryUser.token
  );

  expenseTxId = expRes.data?.transaction?.id || expRes.data?.transaction?._id;
  const passed1_2 = expRes.status === 201 && expRes.data?.success && expenseTxId;
  results.crud.push({
    name: 'Add new expense transaction (₹22,000)',
    passed: Boolean(passed1_2),
    detail: `HTTP ${expRes.status}, ID: ${expenseTxId}`,
  });
  console.log(`1.2 Add Expense: ${passed1_2 ? 'PASS' : 'FAIL'}`);

  // 1.3 View Transaction List
  const listRes = await apiCall('/api/transactions', 'GET', null, primaryUser.token);
  const passed1_3 =
    listRes.status === 200 &&
    listRes.data?.success &&
    Array.isArray(listRes.data?.transactions) &&
    listRes.data.transactions.length >= 2;
  results.crud.push({
    name: 'View transaction list',
    passed: Boolean(passed1_3),
    detail: `HTTP ${listRes.status}, count: ${listRes.data?.transactions?.length}`,
  });
  console.log(`1.3 View List: ${passed1_3 ? 'PASS' : 'FAIL'}`);

  // 1.4 Edit an Existing Transaction
  const editRes = await apiCall(
    `/api/transactions/${expenseTxId}`,
    'PUT',
    {
      amount: 24500, // Updated from 22000
      notes: 'Dedicated desk + 2 guest passes',
    },
    primaryUser.token
  );
  const getEdited = await apiCall(`/api/transactions/${expenseTxId}`, 'GET', null, primaryUser.token);
  const passed1_4 =
    editRes.status === 200 &&
    editRes.data?.success &&
    getEdited.data?.transaction?.amount === 24500 &&
    getEdited.data?.transaction?.notes?.includes('guest passes');
  results.crud.push({
    name: 'Edit existing transaction (amount & notes update)',
    passed: Boolean(passed1_4),
    detail: `HTTP ${editRes.status}, updated amount: ₹${getEdited.data?.transaction?.amount}`,
  });
  console.log(`1.4 Edit Transaction: ${passed1_4 ? 'PASS' : 'FAIL'}`);

  // 1.5 Delete a Transaction
  // Create a third tx to delete
  const tempTxRes = await apiCall(
    '/api/transactions',
    'POST',
    {
      title: 'Stationery Items',
      amount: 650,
      type: 'expense',
      category: 'Shopping',
    },
    primaryUser.token
  );
  const tempTxId = tempTxRes.data?.transaction?.id || tempTxRes.data?.transaction?._id;
  const delRes = await apiCall(`/api/transactions/${tempTxId}`, 'DELETE', null, primaryUser.token);
  const verifyDel = await apiCall(`/api/transactions/${tempTxId}`, 'GET', null, primaryUser.token);
  const passed1_5 = delRes.status === 200 && delRes.data?.success && verifyDel.status === 404;
  results.crud.push({
    name: 'Delete transaction and verify 404',
    passed: Boolean(passed1_5),
    detail: `HTTP ${delRes.status}, subsequent fetch returned HTTP ${verifyDel.status}`,
  });
  console.log(`1.5 Delete Transaction: ${passed1_5 ? 'PASS' : 'FAIL'}`);

  // 1.6 Direct MongoDB Verification via Mongoose
  let directMongoPassed = false;
  try {
    const { default: Transaction } = await import('../server/src/models/Transaction.js');
    await mongoose.connect(process.env.MONGODB_URI);
    const doc = await Transaction.findById(incomeTxId);
    if (doc && doc.amount === 85000 && doc.type === 'income') {
      directMongoPassed = true;
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('Direct MongoDB check error:', err.message);
  }
  results.crud.push({
    name: 'Direct MongoDB Atlas persistence verification',
    passed: directMongoPassed,
    detail: 'Document verified directly in finora MongoDB Atlas collection',
  });
  console.log(`1.6 Direct MongoDB Check: ${directMongoPassed ? 'PASS' : 'FAIL'}\n`);

  // ============================================================================
  // SECTION 2: AUTHENTICATION AND DATA SECURITY
  // ============================================================================
  console.log('--- SECTION 2: Authentication & Data Security Audit ---');

  // 2.1 All transaction routes require authentication
  const unauthGet = await apiCall('/api/transactions');
  const unauthPost = await apiCall('/api/transactions', 'POST', { title: 'No Auth', amount: 100, type: 'expense', category: 'Other' });
  const unauthPut = await apiCall(`/api/transactions/${expenseTxId}`, 'PUT', { amount: 50 });
  const unauthDel = await apiCall(`/api/transactions/${expenseTxId}`, 'DELETE');
  const passed2_1 =
    unauthGet.status === 401 &&
    unauthPost.status === 401 &&
    unauthPut.status === 401 &&
    unauthDel.status === 401;
  results.security.push({
    name: 'Unauthenticated requests rejected on all routes (GET, POST, PUT, DELETE)',
    passed: passed2_1,
    detail: `GET: ${unauthGet.status}, POST: ${unauthPost.status}, PUT: ${unauthPut.status}, DEL: ${unauthDel.status}`,
  });
  console.log(`2.1 Route Authentication Guard: ${passed2_1 ? 'PASS' : 'FAIL'}`);

  // 2.2 Users can only access, edit, and delete their own transactions (Cross-User Isolation)
  const crossGet = await apiCall(`/api/transactions/${incomeTxId}`, 'GET', null, secondaryUser.token);
  const crossPut = await apiCall(`/api/transactions/${incomeTxId}`, 'PUT', { amount: 1 }, secondaryUser.token);
  const crossDel = await apiCall(`/api/transactions/${incomeTxId}`, 'DELETE', null, secondaryUser.token);
  const passed2_2 = crossGet.status === 404 && crossPut.status === 404 && crossDel.status === 404;
  results.security.push({
    name: 'Cross-user manipulation prevented (HTTP 404 on unowned GET, PUT, DELETE)',
    passed: passed2_2,
    detail: `Cross GET: ${crossGet.status}, Cross PUT: ${crossPut.status}, Cross DEL: ${crossDel.status}`,
  });
  console.log(`2.2 Cross-User Data Protection: ${passed2_2 ? 'PASS' : 'FAIL'}`);

  // 2.3 One user's transactions are never visible in another user's list
  const user2List = await apiCall('/api/transactions', 'GET', null, secondaryUser.token);
  const leakFound = user2List.data?.transactions?.some((t) => t.id === incomeTxId || t._id === incomeTxId);
  const passed2_3 = user2List.status === 200 && !leakFound && user2List.data?.transactions?.length === 0;
  results.security.push({
    name: "User 1's records completely absent from User 2's list",
    passed: passed2_3,
    detail: `User 2 transaction count: ${user2List.data?.transactions?.length}, Leaks: ${leakFound ? 'YES' : 'NO'}`,
  });
  console.log(`2.3 Cross-User List Isolation: ${passed2_3 ? 'PASS' : 'FAIL'}`);

  // 2.4 Invalid or expired session handling
  const expiredRes = await apiCall('/api/transactions', 'GET', null, 'invalid.jwt.token.here');
  const passed2_4 = expiredRes.status === 401 && expiredRes.data?.success === false;
  results.security.push({
    name: 'Invalid or forged JWT token rejected',
    passed: passed2_4,
    detail: `HTTP ${expiredRes.status}, Message: ${expiredRes.data?.message}`,
  });
  console.log(`2.4 Invalid Token Rejection: ${passed2_4 ? 'PASS' : 'FAIL'}\n`);

  // ============================================================================
  // SECTION 3: DASHBOARD CALCULATIONS
  // ============================================================================
  console.log('--- SECTION 3: Dashboard Calculations Audit ---');

  // Import calculation utility
  const {
    calculateSummaryMetrics,
    calculateMonthlyCashFlow,
    calculateCategoryExpenses,
  } = await import('../src/utils/dashboardCalculations.ts');

  // Fetch all primary user transactions
  const user1Txs = await apiCall('/api/transactions', 'GET', null, primaryUser.token);
  const activeTxs = user1Txs.data.transactions;

  // Active expected: Income ₹85,000, Expense ₹24,500
  const metrics = calculateSummaryMetrics(activeTxs);
  const balanceMetric = metrics.find((m) => m.id === 'total-balance');
  const incomeMetric = metrics.find((m) => m.id === 'total-income');
  const expenseMetric = metrics.find((m) => m.id === 'total-expenses');
  const savingsMetric = metrics.find((m) => m.id === 'monthly-savings');

  const expectedIncome = 85000;
  const expectedExpense = 24500;
  const expectedBalance = expectedIncome - expectedExpense; // 60,500

  const passed3_1 = incomeMetric?.amount === expectedIncome;
  const passed3_2 = expenseMetric?.amount === expectedExpense;
  const passed3_3 = balanceMetric?.amount === expectedBalance;
  const passed3_4 = savingsMetric?.amount === expectedBalance;

  results.calculations.push({
    name: 'Total Income accurately calculated from DB records (₹85,000)',
    passed: passed3_1,
    detail: `Calculated: ₹${incomeMetric?.amount}, Expected: ₹${expectedIncome}`,
  });
  results.calculations.push({
    name: 'Total Expenses accurately calculated from DB records (₹24,500)',
    passed: passed3_2,
    detail: `Calculated: ₹${expenseMetric?.amount}, Expected: ₹${expectedExpense}`,
  });
  results.calculations.push({
    name: 'Balance accurately calculated as Income minus Expenses (₹60,500)',
    passed: passed3_3,
    detail: `Calculated: ₹${balanceMetric?.amount}, Expected: ₹${expectedBalance}`,
  });
  results.calculations.push({
    name: 'Monthly Savings accurately computed',
    passed: passed3_4,
    detail: `Calculated: ₹${savingsMetric?.amount}, Expected: ₹${expectedBalance}`,
  });

  // Verify recent transactions display real DB records
  const passed3_5 = activeTxs.length === 2 && activeTxs[0].amount > 0 && activeTxs[1].amount > 0;
  results.calculations.push({
    name: 'Recent transactions display live database records without mock data',
    passed: passed3_5,
    detail: `${activeTxs.length} real transactions in active user view`,
  });

  console.log(`3.1 Total Income: ${passed3_1 ? 'PASS' : 'FAIL'}`);
  console.log(`3.2 Total Expenses: ${passed3_2 ? 'PASS' : 'FAIL'}`);
  console.log(`3.3 Balance (Income - Expenses): ${passed3_3 ? 'PASS' : 'FAIL'}`);
  console.log(`3.4 Monthly Savings: ${passed3_4 ? 'PASS' : 'FAIL'}`);
  console.log(`3.5 Real Records in List: ${passed3_5 ? 'PASS' : 'FAIL'}\n`);

  // ============================================================================
  // SECTION 4: VALIDATION AND ERROR HANDLING
  // ============================================================================
  console.log('--- SECTION 4: Validation & Error Handling Audit ---');

  // 4.1 Missing description/title
  const noTitleRes = await apiCall(
    '/api/transactions',
    'POST',
    { amount: 500, type: 'expense', category: 'Shopping' },
    primaryUser.token
  );
  const passed4_1 = noTitleRes.status === 400 && noTitleRes.data?.success === false;
  results.validation.push({
    name: 'Reject missing title/description',
    passed: passed4_1,
    detail: `HTTP ${noTitleRes.status}, Error: ${noTitleRes.data?.message}`,
  });

  // 4.2 Missing category
  const noCatRes = await apiCall(
    '/api/transactions',
    'POST',
    { title: 'Test Coffee', amount: 200, type: 'expense', category: '' },
    primaryUser.token
  );
  const passed4_2 = noCatRes.status === 400 && noCatRes.data?.success === false;
  results.validation.push({
    name: 'Reject missing category',
    passed: passed4_2,
    detail: `HTTP ${noCatRes.status}, Error: ${noCatRes.data?.message}`,
  });

  // 4.3 Negative amount
  const negAmtRes = await apiCall(
    '/api/transactions',
    'POST',
    { title: 'Negative Refund', amount: -1500, type: 'expense', category: 'Shopping' },
    primaryUser.token
  );
  const passed4_3 = negAmtRes.status === 400 && negAmtRes.data?.success === false;
  results.validation.push({
    name: 'Reject negative amount',
    passed: passed4_3,
    detail: `HTTP ${negAmtRes.status}, Error: ${negAmtRes.data?.message}`,
  });

  // 4.4 Non-numeric amount
  const nanAmtRes = await apiCall(
    '/api/transactions',
    'POST',
    { title: 'String Amount', amount: 'one-thousand', type: 'expense', category: 'Shopping' },
    primaryUser.token
  );
  const passed4_4 = nanAmtRes.status === 400 && nanAmtRes.data?.success === false;
  results.validation.push({
    name: 'Reject non-numeric amount',
    passed: passed4_4,
    detail: `HTTP ${nanAmtRes.status}, Error: ${nanAmtRes.data?.message}`,
  });

  // 4.5 Invalid transaction type
  const badTypeRes = await apiCall(
    '/api/transactions',
    'POST',
    { title: 'Bad Type', amount: 500, type: 'transfer_crypto', category: 'Other' },
    primaryUser.token
  );
  const passed4_5 = badTypeRes.status === 400 && badTypeRes.data?.success === false;
  results.validation.push({
    name: 'Reject invalid transaction type (only income or expense allowed)',
    passed: passed4_5,
    detail: `HTTP ${badTypeRes.status}, Error: ${badTypeRes.data?.message}`,
  });

  // 4.6 Malformed ObjectId
  const badIdRes = await apiCall('/api/transactions/not-a-valid-object-id', 'GET', null, primaryUser.token);
  const passed4_6 = badIdRes.status === 400 && badIdRes.data?.success === false;
  results.validation.push({
    name: 'Reject malformed MongoDB ObjectId with HTTP 400',
    passed: passed4_6,
    detail: `HTTP ${badIdRes.status}, Error: ${badIdRes.data?.message}`,
  });

  console.log(`4.1 Missing Title: ${passed4_1 ? 'PASS' : 'FAIL'}`);
  console.log(`4.2 Missing Category: ${passed4_2 ? 'PASS' : 'FAIL'}`);
  console.log(`4.3 Negative Amount: ${passed4_3 ? 'PASS' : 'FAIL'}`);
  console.log(`4.4 Non-Numeric Amount: ${passed4_4 ? 'PASS' : 'FAIL'}`);
  console.log(`4.5 Invalid Type: ${passed4_5 ? 'PASS' : 'FAIL'}`);
  console.log(`4.6 Malformed ObjectId: ${passed4_6 ? 'PASS' : 'FAIL'}\n`);

  // ============================================================================
  // SUMMARY OF AUDIT
  // ============================================================================
  const allTests = [
    ...results.crud,
    ...results.security,
    ...results.calculations,
    ...results.validation,
  ];

  const totalPassed = allTests.filter((t) => t.passed).length;
  const totalFailed = allTests.filter((t) => !t.passed).length;

  console.log('================================================================');
  console.log(`📊 AUDIT COMPLETED: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log('================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
