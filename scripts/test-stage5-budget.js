import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

const BASE_URL = 'http://localhost:3000';

async function runStage5Tests() {
  console.log('================================================================');
  console.log('🧪 FINORA STAGE 5 BUDGET MANAGEMENT SYSTEM INTEGRATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const timestamp = Date.now();
  const userA = {
    name: 'Alice Budgeter',
    email: `alice.budget.${timestamp}@finora.test`,
    password: 'AlicePassword@123',
    token: null,
  };

  const userB = {
    name: 'Bob Budgeter',
    email: `bob.budget.${timestamp}@finora.test`,
    password: 'BobPassword@123',
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

  // Setup: Sign up User A and User B
  const resA = await apiCall('/api/auth/signup', 'POST', userA);
  userA.token = resA.data?.token;

  const resB = await apiCall('/api/auth/signup', 'POST', userB);
  userB.token = resB.data?.token;

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentYear = now.getFullYear();

  let createdBudgetId = null;

  // TEST 1: Creating a monthly budget
  try {
    process.stdout.write('1. Testing POST /api/budgets to create monthly budget... ');
    const res = await apiCall(
      '/api/budgets',
      'POST',
      {
        category: 'Food & Groceries',
        monthlyLimit: 15000,
        month: currentMonth,
        year: currentYear,
      },
      userA.token
    );

    createdBudgetId = res.data?.budget?.id || res.data?.budget?._id;
    if (res.status === 201 && res.data?.success && createdBudgetId && res.data?.budget?.monthlyLimit === 15000) {
      console.log('✅ PASSED (Created Food & Groceries budget: ₹15,000)');
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${res.status}, Error: ${res.data?.message})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 2: Editing its limit
  try {
    process.stdout.write('2. Testing PUT /api/budgets/:id to update limit... ');
    const res = await apiCall(
      `/api/budgets/${createdBudgetId}`,
      'PUT',
      {
        monthlyLimit: 18000, // Updated from 15000
      },
      userA.token
    );

    if (res.status === 200 && res.data?.success && res.data?.budget?.monthlyLimit === 18000) {
      console.log('✅ PASSED (Updated limit to ₹18,000)');
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${res.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 3: Duplicate budget prevention (same user, category, month, year)
  try {
    process.stdout.write('3. Testing duplicate budget prevention (same category & month)... ');
    const dupRes = await apiCall(
      '/api/budgets',
      'POST',
      {
        category: 'Food & Groceries',
        monthlyLimit: 20000,
        month: currentMonth,
        year: currentYear,
      },
      userA.token
    );

    if (dupRes.status === 409 && dupRes.data?.success === false) {
      console.log('✅ PASSED (Rejected with HTTP 409 Conflict as expected)');
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${dupRes.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 4: Spending calculation from actual expense transactions
  try {
    process.stdout.write('4. Testing spending calculation from real expense transactions... ');
    // Log two expense transactions in current month
    // 4a. Groceries expense
    await apiCall(
      '/api/transactions',
      'POST',
      {
        title: 'Weekly Supermarket Run',
        description: 'Weekly Supermarket Run',
        amount: 6000,
        type: 'expense',
        category: 'Food & Groceries',
        date: new Date().toISOString(),
      },
      userA.token
    );

    // 4b. Income transaction (must NOT be counted as spend)
    await apiCall(
      '/api/transactions',
      'POST',
      {
        title: 'Freelance Bonus',
        description: 'Freelance Bonus',
        amount: 25000,
        type: 'income',
        category: 'Salary',
        date: new Date().toISOString(),
      },
      userA.token
    );

    // Fetch transactions & budgets, then test calculation
    const [txsRes, bgtRes] = await Promise.all([
      apiCall('/api/transactions', 'GET', null, userA.token),
      apiCall(`/api/budgets?month=${currentMonth}&year=${currentYear}`, 'GET', null, userA.token),
    ]);

    const { calculateBudgetProgress } = await import('../src/utils/dashboardCalculations.ts');
    const progressList = calculateBudgetProgress(
      txsRes.data.transactions,
      bgtRes.data.budgets,
      currentMonth,
      currentYear
    );

    const fgItem = progressList.find((p) => p.category === 'Food & Groceries');

    // Expected: spent = 6000, allocated = 18000
    if (fgItem && fgItem.spent === 6000 && fgItem.allocated === 18000) {
      console.log('✅ PASSED (Spent: ₹6,000 / Allocated: ₹18,000, Income ignored)');
      passed++;
    } else {
      console.log(`❌ FAILED (fgItem: ${JSON.stringify(fgItem)})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 5: Progress updates after transaction CRUD operations (add more spend, reaching 80% threshold)
  try {
    process.stdout.write('5. Testing progress updates when spending reaches 80%+ warning threshold... ');
    // Add another ₹9,000 to Food & Groceries -> total spent = 15,000 / 18,000 = 83.3%
    const addTxRes = await apiCall(
      '/api/transactions',
      'POST',
      {
        title: 'Gourmet Organic Basket',
        description: 'Gourmet Organic Basket',
        amount: 9000,
        type: 'expense',
        category: 'Food & Groceries',
        date: new Date().toISOString(),
      },
      userA.token
    );

    const [txsRes2, bgtRes2] = await Promise.all([
      apiCall('/api/transactions', 'GET', null, userA.token),
      apiCall(`/api/budgets?month=${currentMonth}&year=${currentYear}`, 'GET', null, userA.token),
    ]);

    const { calculateBudgetProgress } = await import('../src/utils/dashboardCalculations.ts');
    const updatedProgress = calculateBudgetProgress(
      txsRes2.data.transactions,
      bgtRes2.data.budgets,
      currentMonth,
      currentYear
    );

    const fgItem2 = updatedProgress.find((p) => p.category === 'Food & Groceries');
    const utilization = fgItem2 ? Math.round((fgItem2.spent / fgItem2.allocated) * 100) : 0;

    if (fgItem2 && fgItem2.spent === 15000 && utilization >= 80) {
      console.log(`✅ PASSED (Updated spent: ₹15,000 / ₹18,000 -> ${utilization}% utilized, 80%+ alert triggered)`);
      passed++;
    } else {
      console.log(`❌ FAILED (Spent: ${fgItem2?.spent}, Util: ${utilization}%)`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 6: Previous-month budget selection
  try {
    process.stdout.write('6. Testing budget creation & retrieval for previous month... ');
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const prevRes = await apiCall(
      '/api/budgets',
      'POST',
      {
        category: 'Housing & Rent',
        monthlyLimit: 30000,
        month: prevMonth,
        year: prevYear,
      },
      userA.token
    );

    // Fetch filtered by previous month
    const getPrev = await apiCall(
      `/api/budgets?month=${prevMonth}&year=${prevYear}`,
      'GET',
      null,
      userA.token
    );

    // Fetch filtered by current month -> must NOT include the previous month budget
    const getCurr = await apiCall(
      `/api/budgets?month=${currentMonth}&year=${currentYear}`,
      'GET',
      null,
      userA.token
    );

    const hasInPrev = getPrev.data?.budgets?.some((b) => b.category === 'Housing & Rent');
    const hasInCurr = getCurr.data?.budgets?.some((b) => b.category === 'Housing & Rent');

    if (prevRes.status === 201 && hasInPrev && !hasInCurr) {
      console.log(`✅ PASSED (Budget for ${prevMonth}/${prevYear} isolated from ${currentMonth}/${currentYear})`);
      passed++;
    } else {
      console.log(`❌ FAILED (inPrev: ${hasInPrev}, inCurr: ${hasInCurr})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 7: Deleting a budget
  try {
    process.stdout.write('7. Testing DELETE /api/budgets/:id... ');
    const delRes = await apiCall(`/api/budgets/${createdBudgetId}`, 'DELETE', null, userA.token);

    // Verify it is gone
    const listAfter = await apiCall(
      `/api/budgets?month=${currentMonth}&year=${currentYear}`,
      'GET',
      null,
      userA.token
    );
    const stillExists = listAfter.data?.budgets?.some((b) => b.id === createdBudgetId || b._id === createdBudgetId);

    if (delRes.status === 200 && !stillExists) {
      console.log('✅ PASSED (Budget deleted cleanly)');
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${delRes.status}, stillExists: ${stillExists})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 8: Empty budget state
  try {
    process.stdout.write('8. Testing empty budget state calculation & handling... ');
    const { calculateBudgetProgress } = await import('../src/utils/dashboardCalculations.ts');
    const emptyProgress = calculateBudgetProgress([], []);

    if (Array.isArray(emptyProgress) && emptyProgress.length === 0) {
      console.log('✅ PASSED (Returns empty list, triggering clean UI empty state)');
      passed++;
    } else {
      console.log('❌ FAILED (Non-empty array returned)');
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 9: Cross-user data isolation
  try {
    process.stdout.write("9. Testing cross-user isolation (User B attempting to read/modify User A's budget)... ");
    // User A creates a new budget
    const budgetARes = await apiCall(
      '/api/budgets',
      'POST',
      {
        category: 'Utilities',
        monthlyLimit: 7500,
        month: currentMonth,
        year: currentYear,
      },
      userA.token
    );
    const budgetAId = budgetARes.data?.budget?.id || budgetARes.data?.budget?._id;

    // User B tries to update User A's budget
    const hackPut = await apiCall(`/api/budgets/${budgetAId}`, 'PUT', { monthlyLimit: 1 }, userB.token);

    // User B tries to delete User A's budget
    const hackDel = await apiCall(`/api/budgets/${budgetAId}`, 'DELETE', null, userB.token);

    // User B fetches own budgets list -> User A's budget must NOT be present
    const userBList = await apiCall('/api/budgets', 'GET', null, userB.token);
    const hasLeaked = userBList.data?.budgets?.some((b) => b.id === budgetAId || b._id === budgetAId);

    if (hackPut.status === 404 && hackDel.status === 404 && !hasLeaked) {
      console.log('✅ PASSED (User B blocked with 404 on PUT/DELETE, zero data leaks)');
      passed++;
    } else {
      console.log(`❌ FAILED (Put: ${hackPut.status}, Del: ${hackDel.status}, Leaked: ${hasLeaked})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 10: Direct MongoDB Atlas persistence verification
  try {
    process.stdout.write('10. Testing direct MongoDB Atlas persistence via Mongoose model... ');
    const { default: mongoose } = await import('mongoose');
    const { default: Budget } = await import('../server/src/models/Budget.js');

    await mongoose.connect(process.env.MONGODB_URI);
    const docs = await Budget.find({ category: 'Utilities' }).lean();
    await mongoose.disconnect();

    if (docs.length > 0 && docs[0].monthlyLimit === 7500) {
      console.log('✅ PASSED (Verified document saved directly in Atlas collection)');
      passed++;
    } else {
      console.log('❌ FAILED (Document not found in Atlas)');
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`📊 STAGE 5 TEST SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runStage5Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
