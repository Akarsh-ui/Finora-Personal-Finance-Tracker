import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

const BASE_URL = 'http://localhost:3000';

async function runStage6Tests() {
  console.log('================================================================');
  console.log('🧪 FINORA STAGE 6 SEARCH, FILTERING & SORTING AUDIT SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(num, name, condition, details = '') {
    if (condition) {
      passed++;
      console.log(`✅ [${num}/20] PASS: ${name}`);
      if (details) console.log(`   └─ ${details}`);
    } else {
      failed++;
      console.error(`❌ [${num}/20] FAIL: ${name}`);
      if (details) console.error(`   └─ ${details}`);
    }
  }

  const timestamp = Date.now();
  const userA = {
    name: 'Search Tester Alice',
    email: `alice.search.${timestamp}@finora.test`,
    password: 'AliceSearch@123',
    token: null,
  };

  const userB = {
    name: 'Search Tester Bob',
    email: `bob.search.${timestamp}@finora.test`,
    password: 'BobSearch@123',
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

  // Sign up User A and User B
  const resA = await apiCall('/api/auth/signup', 'POST', userA);
  userA.token = resA.data?.token;

  const resB = await apiCall('/api/auth/signup', 'POST', userB);
  userB.token = resB.data?.token;

  if (!userA.token || !userB.token) {
    console.error('Fatal: Failed to authenticate test users.');
    process.exit(1);
  }

  // Seed sample transactions for User A with varying descriptions, categories, amounts, dates, paymentMethods
  const seedTransactions = [
    {
      description: 'Monthly Salary from Tech Corp',
      type: 'income',
      amount: 85000,
      category: 'Salary',
      date: '2026-10-01',
      paymentMethod: 'Bank Transfer',
      notes: 'Direct deposit',
    },
    {
      description: 'Freelance React Dashboard Project',
      type: 'income',
      amount: 15000,
      category: 'Freelance',
      date: '2026-10-15',
      paymentMethod: 'UPI',
      notes: 'Client milestone 1',
    },
    {
      description: 'Organic Supermarket Groceries',
      type: 'expense',
      amount: 4200,
      category: 'Groceries',
      date: '2026-10-05',
      paymentMethod: 'Credit Card',
      notes: 'Weekly fresh vegetables and dairy',
    },
    {
      description: 'Modern Apartment Monthly Rent',
      type: 'expense',
      amount: 22000,
      category: 'Rent',
      date: '2026-10-02',
      paymentMethod: 'Bank Transfer',
      notes: 'October rent payment',
    },
    {
      description: 'High-speed Fiber Internet Bill',
      type: 'expense',
      amount: 1299,
      category: 'Utilities',
      date: '2026-10-10',
      paymentMethod: 'Debit Card',
      notes: 'Broadband connection',
    },
    {
      description: 'Weekend Italian Bistro Dinner',
      type: 'expense',
      amount: 1850,
      category: 'Dining Out',
      date: '2026-10-20',
      paymentMethod: 'UPI',
      notes: 'Family dinner',
    },
  ];

  const createdTxIds = [];
  for (const tx of seedTransactions) {
    const res = await apiCall('/api/transactions', 'POST', tx, userA.token);
    if (res.data?.transaction?._id || res.data?.transaction?.id) {
      createdTxIds.push(res.data.transaction._id || res.data.transaction.id);
    }
  }

  // Also seed one transaction for User B
  await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Bob Private Cryptic Note Tx',
      type: 'expense',
      amount: 9999,
      category: 'Entertainment',
      date: '2026-10-12',
      paymentMethod: 'Cash',
      notes: 'Secret note',
    },
    userB.token
  );

  // 1. Search by description
  const t1 = await apiCall('/api/transactions?search=Supermarket', 'GET', null, userA.token);
  report(
    1,
    'Search by description',
    t1.status === 200 &&
      t1.data.transactions.length === 1 &&
      t1.data.transactions[0].description.includes('Supermarket'),
    `Found: ${t1.data?.transactions?.[0]?.description}`
  );

  // 2. Search by category
  const t2 = await apiCall('/api/transactions?search=Utilities', 'GET', null, userA.token);
  report(
    2,
    'Search by category',
    t2.status === 200 &&
      t2.data.transactions.length === 1 &&
      t2.data.transactions[0].category === 'Utilities',
    `Found: ${t2.data?.transactions?.[0]?.category}`
  );

  // 3. Search by type
  const t3 = await apiCall('/api/transactions?search=income', 'GET', null, userA.token);
  report(
    3,
    'Search by type',
    t3.status === 200 &&
      t3.data.transactions.length >= 2 &&
      t3.data.transactions.every((t) => t.type === 'income'),
    `Found ${t3.data?.transactions?.length} income transactions matching search query`
  );

  // 4. Search with no matching results
  const t4 = await apiCall('/api/transactions?search=NonExistentQueryZ99', 'GET', null, userA.token);
  report(
    4,
    'Search with no matching results',
    t4.status === 200 && t4.data.transactions.length === 0 && t4.data.total === 0,
    `Returns count 0 and empty array safely`
  );

  // 5. Filter income transactions
  const t5 = await apiCall('/api/transactions?type=income', 'GET', null, userA.token);
  report(
    5,
    'Filter income transactions',
    t5.status === 200 &&
      t5.data.transactions.length === 2 &&
      t5.data.transactions.every((t) => t.type === 'income'),
    `Found exactly 2 income transactions (Salary + Freelance)`
  );

  // 6. Filter expense transactions
  const t6 = await apiCall('/api/transactions?type=expense', 'GET', null, userA.token);
  report(
    6,
    'Filter expense transactions',
    t6.status === 200 &&
      t6.data.transactions.length === 4 &&
      t6.data.transactions.every((t) => t.type === 'expense'),
    `Found exactly 4 expense transactions (Groceries + Rent + Utilities + Dining Out)`
  );

  // 7. Filter by category
  const t7 = await apiCall('/api/transactions?category=Groceries', 'GET', null, userA.token);
  report(
    7,
    'Filter by category',
    t7.status === 200 &&
      t7.data.transactions.length === 1 &&
      t7.data.transactions[0].category === 'Groceries',
    `Found category Groceries with amount ${t7.data?.transactions?.[0]?.amount}`
  );

  // 8. Filter by date range (startDate, endDate)
  const t8 = await apiCall(
    '/api/transactions?startDate=2026-10-01&endDate=2026-10-05',
    'GET',
    null,
    userA.token
  );
  report(
    8,
    'Filter by date range',
    t8.status === 200 && t8.data.transactions.length === 3,
    `Found 3 transactions between Oct 1 and Oct 5`
  );

  // 9. Filter by min & max amount
  const t9 = await apiCall(
    '/api/transactions?minAmount=1500&maxAmount=5000',
    'GET',
    null,
    userA.token
  );
  report(
    9,
    'Filter by min and max amount',
    t9.status === 200 &&
      t9.data.transactions.length === 2 &&
      t9.data.transactions.every((t) => t.amount >= 1500 && t.amount <= 5000),
    `Found 2 transactions in range [1500, 5000]: 4200 (Groceries) and 1850 (Dining Out)`
  );

  // 10. Sort by newest & oldest
  const t10Desc = await apiCall('/api/transactions?sortBy=date&sortOrder=desc', 'GET', null, userA.token);
  const t10Asc = await apiCall('/api/transactions?sortBy=date&sortOrder=asc', 'GET', null, userA.token);
  const isDescDate = new Date(t10Desc.data.transactions[0].date) >= new Date(t10Desc.data.transactions[1].date);
  const isAscDate = new Date(t10Asc.data.transactions[0].date) <= new Date(t10Asc.data.transactions[1].date);
  report(
    10,
    'Sort by newest and oldest',
    t10Desc.status === 200 && t10Asc.status === 200 && isDescDate && isAscDate,
    `Newest starts with ${t10Desc.data.transactions[0].date}, Oldest starts with ${t10Asc.data.transactions[0].date}`
  );

  // 11. Sort by highest & lowest amount
  const t11Desc = await apiCall('/api/transactions?sortBy=amount&sortOrder=desc', 'GET', null, userA.token);
  const t11Asc = await apiCall('/api/transactions?sortBy=amount&sortOrder=asc', 'GET', null, userA.token);
  const isDescAmt = t11Desc.data.transactions[0].amount >= t11Desc.data.transactions[1].amount;
  const isAscAmt = t11Asc.data.transactions[0].amount <= t11Asc.data.transactions[1].amount;
  report(
    11,
    'Sort by highest and lowest amount',
    t11Desc.status === 200 && t11Asc.status === 200 && isDescAmt && isAscAmt,
    `Highest amount: ₹${t11Desc.data.transactions[0].amount}, Lowest amount: ₹${t11Asc.data.transactions[0].amount}`
  );

  // 12. Combined multiple filters
  const t12 = await apiCall(
    '/api/transactions?type=expense&category=Groceries&minAmount=3000&search=fresh',
    'GET',
    null,
    userA.token
  );
  report(
    12,
    'Combined multiple filters (type, category, minAmount, search)',
    t12.status === 200 &&
      t12.data.transactions.length === 1 &&
      t12.data.transactions[0].category === 'Groceries',
    `Found matching transaction: ${t12.data.transactions[0].description}`
  );

  // 13. Clear all filters (default endpoint returns all records)
  const t13 = await apiCall('/api/transactions', 'GET', null, userA.token);
  report(
    13,
    'Clear all filters returns complete set',
    t13.status === 200 && t13.data.transactions.length === 6 && t13.data.total === 6,
    `Full list contains all 6 user records`
  );

  // 14. Pagination and page navigation
  const t14Page1 = await apiCall('/api/transactions?page=1&limit=2', 'GET', null, userA.token);
  const t14Page2 = await apiCall('/api/transactions?page=2&limit=2', 'GET', null, userA.token);
  const page1Id = t14Page1.data?.transactions?.[0]?._id;
  const page2Id = t14Page2.data?.transactions?.[0]?._id;
  report(
    14,
    'Pagination and page navigation',
    t14Page1.status === 200 &&
      t14Page1.data.page === 1 &&
      t14Page1.data.pageSize === 2 &&
      t14Page1.data.totalPages === 3 &&
      t14Page1.data.total === 6 &&
      t14Page2.data.page === 2 &&
      page1Id !== page2Id,
    `Page 1 returned 2 items (total pages: 3), Page 2 returned distinct items`
  );

  // 15. Header search safety (regex characters like parentheses/brackets handled safely)
  const t15 = await apiCall('/api/transactions?search=(test)[+]', 'GET', null, userA.token);
  report(
    15,
    'Regex character sanitization in search query',
    t15.status === 200 && Array.isArray(t15.data.transactions),
    `Query with special regex characters handled safely without crashing server`
  );

  // 16. User-specific search isolation
  const t16A = await apiCall('/api/transactions?search=Cryptic', 'GET', null, userA.token);
  const t16B = await apiCall('/api/transactions?search=Cryptic', 'GET', null, userB.token);
  report(
    16,
    'User-specific search isolation',
    t16A.status === 200 &&
      t16A.data.transactions.length === 0 &&
      t16B.status === 200 &&
      t16B.data.transactions.length === 1,
    `User A cannot find User B's "Cryptic" transaction (User A: 0, User B: 1)`
  );

  // 17. Dashboard calculations remain intact
  const allTxsRes = await apiCall('/api/transactions?limit=500', 'GET', null, userA.token);
  const txs = allTxsRes.data.transactions || [];
  const totalIncome = txs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpenses = txs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const netBalance = totalIncome - totalExpenses;
  report(
    17,
    'Dashboard calculations from actual database records',
    totalIncome === 100000 && totalExpenses === 29349 && netBalance === 70651,
    `Income: ₹${totalIncome}, Expenses: ₹${totalExpenses}, Net Balance: ₹${netBalance}`
  );

  // 18. Budget calculations remain intact
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Create budget for Groceries
  await apiCall(
    '/api/budgets',
    'POST',
    {
      category: 'Groceries',
      monthlyLimit: 10000,
      month: currentMonth,
      year: currentYear,
    },
    userA.token
  );

  const [budgetListRes, allTxsForBudget] = await Promise.all([
    apiCall(`/api/budgets?month=${currentMonth}&year=${currentYear}`, 'GET', null, userA.token),
    apiCall('/api/transactions?limit=500', 'GET', null, userA.token),
  ]);

  const targetBudget = (budgetListRes.data?.budgets || []).find((b) => b.category === 'Groceries');
  const spentForCategory = (allTxsForBudget.data?.transactions || [])
    .filter((t) => t.type === 'expense' && t.category === 'Groceries')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const remainingForCategory = (targetBudget?.monthlyLimit || 0) - spentForCategory;

  report(
    18,
    'Budget status calculations continue working seamlessly',
    budgetListRes.status === 200 &&
      targetBudget &&
      targetBudget.monthlyLimit === 10000 &&
      spentForCategory === 4200 &&
      remainingForCategory === 5800,
    `Groceries limit: ₹10,000, spent: ₹${spentForCategory}, remaining: ₹${remainingForCategory}`
  );

  // 19. Existing transaction CRUD still works
  const newTxRes = await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Temporary Test Expense',
      type: 'expense',
      amount: 550,
      category: 'Shopping',
      date: '2026-10-25',
      paymentMethod: 'Cash',
    },
    userA.token
  );
  const tempId = newTxRes.data?.transaction?._id || newTxRes.data?.transaction?.id;

  const updateRes = await apiCall(
    `/api/transactions/${tempId}`,
    'PUT',
    {
      description: 'Updated Test Expense',
      amount: 600,
    },
    userA.token
  );

  const deleteRes = await apiCall(`/api/transactions/${tempId}`, 'DELETE', null, userA.token);
  report(
    19,
    'Existing Transaction CRUD operations (Create, Read, Update, Delete)',
    newTxRes.status === 201 &&
      updateRes.status === 200 &&
      updateRes.data?.transaction?.amount === 600 &&
      deleteRes.status === 200,
    `Successfully created, updated amount to 600, and deleted temporary record`
  );

  // 20. Persistence after session refresh
  const meRes = await apiCall('/api/auth/me', 'GET', null, userA.token);
  const verifyTxsRes = await apiCall('/api/transactions', 'GET', null, userA.token);
  report(
    20,
    'Persistence after session refresh (/api/auth/me)',
    meRes.status === 200 &&
      meRes.data?.user?.email === userA.email &&
      verifyTxsRes.status === 200 &&
      verifyTxsRes.data.transactions.length === 6,
    `User session valid for ${meRes.data?.user?.name}, all 6 transactions persistent in MongoDB`
  );

  console.log('\n================================================================');
  console.log(`📊 STAGE 6 AUDIT SUMMARY: ${passed}/20 PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage6Tests().catch((err) => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
