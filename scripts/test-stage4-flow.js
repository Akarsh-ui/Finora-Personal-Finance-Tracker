// Stage 4 Transaction Management & CRUD APIs Integration Test Suite
const BASE_URL = 'http://localhost:3000';

async function runStage4Tests() {
  console.log('========================================================');
  console.log('🧪 STAGE 4 TRANSACTION MANAGEMENT & CRUD TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  // Generate two separate users for cross-user security testing
  const timestamp = Date.now();
  const user1 = {
    name: 'Alice Investor',
    email: `alice.${timestamp}@finora.internal`,
    password: 'AlicePassword@123',
    token: null,
    cookie: null,
  };

  const user2 = {
    name: 'Bob Saver',
    email: `bob.${timestamp}@finora.internal`,
    password: 'BobPassword@123',
    token: null,
    cookie: null,
  };

  // Helper for authenticated requests
  const authFetch = (url, user, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {}),
      ...(options.headers || {}),
    };
    return fetch(`${BASE_URL}${url}`, {
      ...options,
      headers,
    });
  };

  // Setup: Signup User 1
  try {
    const res1 = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user1),
    });
    const data1 = await res1.json();
    user1.token = data1.token;
    user1.cookie = res1.headers.get('set-cookie');
  } catch (err) {
    console.error('Setup User 1 failed:', err);
  }

  // Setup: Signup User 2
  try {
    const res2 = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user2),
    });
    const data2 = await res2.json();
    user2.token = data2.token;
    user2.cookie = res2.headers.get('set-cookie');
  } catch (err) {
    console.error('Setup User 2 failed:', err);
  }

  let createdIncomeId = null;
  let createdExpenseId = null;

  // TEST 1: Create income and expense transactions
  try {
    process.stdout.write('1. Testing POST /api/transactions for income & expense... ');
    // 1a. Income
    const incRes = await authFetch('/api/transactions', user1, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Monthly Tech Salary',
        description: 'Monthly Tech Salary',
        amount: 150000,
        type: 'income',
        category: 'Salary',
        date: new Date().toISOString(),
        paymentMethod: 'Net Banking',
        notes: 'Monthly corporate payroll direct deposit',
      }),
    });
    const incData = await incRes.json();
    createdIncomeId = incData.transaction?._id || incData.transaction?.id;

    // 1b. Expense
    const expRes = await authFetch('/api/transactions', user1, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Apartment Monthly Lease',
        description: 'Apartment Monthly Lease',
        amount: 35000,
        type: 'expense',
        category: 'Housing & Rent',
        date: new Date().toISOString(),
        paymentMethod: 'UPI Pay',
        notes: 'Lease rent for flat 402',
      }),
    });
    const expData = await expRes.json();
    createdExpenseId = expData.transaction?._id || expData.transaction?.id;

    if (
      incRes.status === 201 &&
      incData.success &&
      expRes.status === 201 &&
      expData.success &&
      createdIncomeId &&
      createdExpenseId
    ) {
      console.log('✅ PASSED (Income: ₹1,50,000, Expense: ₹35,000 created)');
      passed++;
    } else {
      console.log(`❌ FAILED (Inc: ${incRes.status}, Exp: ${expRes.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 2: Fetch current user's transactions
  try {
    process.stdout.write("2. Testing GET /api/transactions for current user's list... ");
    const res = await authFetch('/api/transactions', user1);
    const data = await res.json();

    if (
      res.status === 200 &&
      data.success &&
      Array.isArray(data.transactions) &&
      data.transactions.length >= 2
    ) {
      const hasIncome = data.transactions.some((t) => t._id === createdIncomeId || t.id === createdIncomeId);
      const hasExpense = data.transactions.some((t) => t._id === createdExpenseId || t.id === createdExpenseId);
      if (hasIncome && hasExpense) {
        console.log(`✅ PASSED (${data.transactions.length} records returned, newest first)`);
        passed++;
      } else {
        console.log('❌ FAILED (Created records missing from response)');
        failed++;
      }
    } else {
      console.log(`❌ FAILED (Status: ${res.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 3: Update a transaction and verify change persists
  try {
    process.stdout.write('3. Testing PUT /api/transactions/:id to update amount & category... ');
    const updateRes = await authFetch(`/api/transactions/${createdExpenseId}`, user1, {
      method: 'PUT',
      body: JSON.stringify({
        amount: 38000, // Updated from 35000
        category: 'Housing & Rent',
        notes: 'Updated rent including maintenance charges',
      }),
    });
    const updateData = await updateRes.json();

    // Verify by fetching individual record
    const getRes = await authFetch(`/api/transactions/${createdExpenseId}`, user1);
    const getData = await getRes.json();

    if (
      updateRes.status === 200 &&
      updateData.success &&
      getRes.status === 200 &&
      getData.transaction.amount === 38000 &&
      getData.transaction.notes.includes('maintenance')
    ) {
      console.log('✅ PASSED (Amount updated to ₹38,000 and confirmed in database)');
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${updateRes.status}, Amount: ${getData.transaction?.amount})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 4: Delete a transaction and verify it is gone
  try {
    process.stdout.write('4. Testing DELETE /api/transactions/:id... ');
    // Create a temporary transaction to delete
    const tempRes = await authFetch('/api/transactions', user1, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Temporary Grocery Snack',
        description: 'Temporary Grocery Snack',
        amount: 450,
        type: 'expense',
        category: 'Food & Dining',
      }),
    });
    const tempData = await tempRes.json();
    const tempId = tempData.transaction._id || tempData.transaction.id;

    // Delete it
    const delRes = await authFetch(`/api/transactions/${tempId}`, user1, {
      method: 'DELETE',
    });
    const delData = await delRes.json();

    // Try to fetch it again -> must be 404
    const verifyDelRes = await authFetch(`/api/transactions/${tempId}`, user1);

    if (delRes.status === 200 && delData.success && verifyDelRes.status === 404) {
      console.log('✅ PASSED (Transaction deleted and subsequent GET returns 404)');
      passed++;
    } else {
      console.log(`❌ FAILED (Del Status: ${delRes.status}, Fetch Status: ${verifyDelRes.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 5: Verify invalid amounts and invalid transaction types are rejected
  try {
    process.stdout.write('5. Testing validation rejection for negative amount, 0 amount, and invalid type... ');
    const badAmountRes = await authFetch('/api/transactions', user1, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Invalid Negative Amount',
        amount: -500,
        type: 'expense',
        category: 'Shopping',
      }),
    });

    const zeroAmountRes = await authFetch('/api/transactions', user1, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Zero Amount',
        amount: 0,
        type: 'expense',
        category: 'Shopping',
      }),
    });

    const badTypeRes = await authFetch('/api/transactions', user1, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Invalid Type',
        amount: 1000,
        type: 'crypto_swap', // invalid type
        category: 'Investment',
      }),
    });

    if (badAmountRes.status === 400 && zeroAmountRes.status === 400 && badTypeRes.status === 400) {
      console.log('✅ PASSED (All 3 rejected with HTTP 400 Bad Request)');
      passed++;
    } else {
      console.log(`❌ FAILED (Amt: ${badAmountRes.status}, Zero: ${zeroAmountRes.status}, Type: ${badTypeRes.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 6: Verify unauthenticated requests are rejected
  try {
    process.stdout.write('6. Testing unauthenticated request rejection on /api/transactions... ');
    const unauthGet = await fetch(`${BASE_URL}/api/transactions`);
    const unauthPost = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Sneaky Transaction',
        amount: 100,
        type: 'expense',
        category: 'Other',
      }),
    });

    if (unauthGet.status === 401 && unauthPost.status === 401) {
      console.log('✅ PASSED (HTTP 401 Unauthorized enforced on GET and POST)');
      passed++;
    } else {
      console.log(`❌ FAILED (GET: ${unauthGet.status}, POST: ${unauthPost.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 7: Cross-user privacy: Second user cannot access or modify first user's transactions
  try {
    process.stdout.write("7. Testing cross-user isolation (User 2 accessing User 1's records)... ");
    // User 2 attempts to GET User 1's transaction
    const stealGet = await authFetch(`/api/transactions/${createdIncomeId}`, user2);

    // User 2 attempts to UPDATE User 1's transaction
    const stealPut = await authFetch(`/api/transactions/${createdIncomeId}`, user2, {
      method: 'PUT',
      body: JSON.stringify({ amount: 1 }),
    });

    // User 2 attempts to DELETE User 1's transaction
    const stealDel = await authFetch(`/api/transactions/${createdIncomeId}`, user2, {
      method: 'DELETE',
    });

    // User 2 fetches own transactions list -> User 1's records must NOT be listed
    const user2ListRes = await authFetch('/api/transactions', user2);
    const user2ListData = await user2ListRes.json();
    const hasUser1Record = user2ListData.transactions.some(
      (t) => t._id === createdIncomeId || t.id === createdIncomeId
    );

    if (
      stealGet.status === 404 &&
      stealPut.status === 404 &&
      stealDel.status === 404 &&
      !hasUser1Record
    ) {
      console.log("✅ PASSED (Complete isolation: 404 Not Found on cross-user GET, PUT, DELETE)");
      passed++;
    } else {
      console.log(
        `❌ FAILED (Get: ${stealGet.status}, Put: ${stealPut.status}, Del: ${stealDel.status}, leaked: ${hasUser1Record})`
      );
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 8: Dashboard dynamic calculations change after transactions
  try {
    process.stdout.write('8. Testing dynamic calculation accuracy from transactions... ');
    const user1ListRes = await authFetch('/api/transactions', user1);
    const user1Data = await user1ListRes.json();
    const txs = user1Data.transactions;

    const calcIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const calcExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const calcBalance = calcIncome - calcExpense;

    // Expected: 150000 income - 38000 expense = 112000 balance
    if (calcIncome === 150000 && calcExpense === 38000 && calcBalance === 112000) {
      console.log(`✅ PASSED (Income: ₹${calcIncome}, Expense: ₹${calcExpense}, Balance: ₹${calcBalance})`);
      passed++;
    } else {
      console.log(`❌ FAILED (Inc: ${calcIncome}, Exp: ${calcExpense}, Bal: ${calcBalance})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 9: Existing signup/login/logout flow and /api/health still work
  try {
    process.stdout.write('9. Testing auth regression and /api/health integrity... ');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1.email, password: user1.password }),
    });
    const loginData = await loginRes.json();

    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
    });

    if (
      healthRes.status === 200 &&
      healthData.database.connected === true &&
      loginRes.status === 200 &&
      loginData.success &&
      logoutRes.status === 200
    ) {
      console.log('✅ PASSED (Health OK, Database connected, Login/Logout functional)');
      passed++;
    } else {
      console.log(`❌ FAILED (Health: ${healthRes.status}, Login: ${loginRes.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 10: Malformed ID rejection (testing 400 Bad Request on invalid ObjectIds)
  try {
    process.stdout.write('10. Testing malformed ObjectId validation (e.g. /api/transactions/123-abc)... ');
    const badIdGet = await authFetch('/api/transactions/invalid-id-xyz', user1);
    const badIdPut = await authFetch('/api/transactions/invalid-id-xyz', user1, {
      method: 'PUT',
      body: JSON.stringify({ amount: 100 }),
    });
    const badIdDel = await authFetch('/api/transactions/invalid-id-xyz', user1, {
      method: 'DELETE',
    });

    if (badIdGet.status === 400 && badIdPut.status === 400 && badIdDel.status === 400) {
      console.log('✅ PASSED (All malformed IDs rejected with HTTP 400 Bad Request)');
      passed++;
    } else {
      console.log(`❌ FAILED (Get: ${badIdGet.status}, Put: ${badIdPut.status}, Del: ${badIdDel.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`📊 STAGE 4 TEST SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runStage4Tests();
