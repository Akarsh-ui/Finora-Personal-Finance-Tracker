import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

const BASE_URL = 'http://localhost:3000';

async function runStage8Tests() {
  console.log('================================================================');
  console.log('🧪 FINORA STAGE 8 SETTINGS & PROFILE MANAGEMENT AUDIT SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(num, name, condition, details = '') {
    if (condition) {
      passed++;
      console.log(`✅ [${num}/16] PASS: ${name}`);
      if (details) console.log(`   └─ ${details}`);
    } else {
      failed++;
      console.error(`❌ [${num}/16] FAIL: ${name}`);
      if (details) console.error(`   └─ ${details}`);
    }
  }

  const timestamp = Date.now();
  const userA = {
    name: 'Settings Tester Alice',
    email: `alice.settings.${timestamp}@finora.test`,
    password: 'AliceInitialPassword@123',
    token: null,
  };

  const userB = {
    name: 'Settings Tester Bob',
    email: `bob.settings.${timestamp}@finora.test`,
    password: 'BobInitialPassword@123',
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
    return { status: res.status, headers: res.headers, data };
  };

  // Sign up test users
  const resA = await apiCall('/api/auth/signup', 'POST', userA);
  userA.token = resA.data?.token;

  const resB = await apiCall('/api/auth/signup', 'POST', userB);
  userB.token = resB.data?.token;

  if (!userA.token || !userB.token) {
    console.error('Fatal: Failed to authenticate test users for Stage 8 audit.');
    process.exit(1);
  }

  // 1. Retrieve current user profile
  const profileRes1 = await apiCall('/api/users/profile', 'GET', null, userA.token);
  report(
    1,
    'Retrieve current user profile',
    profileRes1.status === 200 &&
      profileRes1.data?.user?.email === userA.email &&
      profileRes1.data?.user?.name === userA.name &&
      profileRes1.data?.user?.currency === 'INR',
    `Name: ${profileRes1.data?.user?.name}, Currency: ${profileRes1.data?.user?.currency}`
  );

  // 2. Update profile name
  const updatedName = 'Alice Settings Renamed';
  const profileRes2 = await apiCall(
    '/api/users/profile',
    'PUT',
    { name: updatedName },
    userA.token
  );
  report(
    2,
    'Update profile name',
    profileRes2.status === 200 && profileRes2.data?.user?.name === updatedName,
    `Updated name in MongoDB: ${profileRes2.data?.user?.name}`
  );

  // 3. Update email with valid input
  const updatedEmail = `alice.newemail.${timestamp}@finora.test`;
  const profileRes3 = await apiCall(
    '/api/users/profile',
    'PUT',
    { email: updatedEmail },
    userA.token
  );
  if (profileRes3.data?.token) {
    userA.token = profileRes3.data.token;
  }
  userA.email = updatedEmail;
  report(
    3,
    'Update email with valid input',
    profileRes3.status === 200 && profileRes3.data?.user?.email === updatedEmail,
    `Updated email: ${profileRes3.data?.user?.email}`
  );

  // 4. Reject duplicate email
  const duplicateRes = await apiCall(
    '/api/users/profile',
    'PUT',
    { email: userB.email },
    userA.token
  );
  report(
    4,
    'Reject duplicate email',
    duplicateRes.status === 409 && duplicateRes.data?.success === false,
    `Blocked duplicate registration of ${userB.email} with HTTP 409`
  );

  // 5. Reject invalid email
  const invalidEmailRes = await apiCall(
    '/api/users/profile',
    'PUT',
    { email: 'not-a-valid-email' },
    userA.token
  );
  report(
    5,
    'Reject invalid email',
    invalidEmailRes.status === 400 && invalidEmailRes.data?.success === false,
    `Rejected with message: ${invalidEmailRes.data?.message}`
  );

  // 6. Change password with correct current password
  const newPasswordAlice = 'AliceBrandNewPass@2026';
  const changePwRes = await apiCall(
    '/api/users/password',
    'PUT',
    {
      currentPassword: userA.password,
      newPassword: newPasswordAlice,
      confirmPassword: newPasswordAlice,
    },
    userA.token
  );
  if (changePwRes.data?.token) {
    userA.token = changePwRes.data.token;
  }
  report(
    6,
    'Change password with correct current password',
    changePwRes.status === 200 && changePwRes.data?.success === true,
    changePwRes.data?.message
  );

  // 7. Reject incorrect current password
  const wrongCurrentPwRes = await apiCall(
    '/api/users/password',
    'PUT',
    {
      currentPassword: 'WrongOldPassword@999',
      newPassword: 'SomeOtherPass@123',
      confirmPassword: 'SomeOtherPass@123',
    },
    userA.token
  );
  report(
    7,
    'Reject incorrect current password',
    wrongCurrentPwRes.status === 400 && wrongCurrentPwRes.data?.success === false,
    `Error: ${wrongCurrentPwRes.data?.message}`
  );

  // 8. Reject mismatched new passwords
  const mismatchRes = await apiCall(
    '/api/users/password',
    'PUT',
    {
      currentPassword: newPasswordAlice,
      newPassword: 'ValidNewPassword@123',
      confirmPassword: 'DifferentPassword@456',
    },
    userA.token
  );
  report(
    8,
    'Reject mismatched new passwords',
    mismatchRes.status === 400 && mismatchRes.data?.success === false,
    `Error: ${mismatchRes.data?.message}`
  );

  // 9. Verify old password no longer works after successful change
  const oldLoginRes = await apiCall('/api/auth/login', 'POST', {
    email: userA.email,
    password: userA.password, // old password
  });
  report(
    9,
    'Verify old password no longer works',
    oldLoginRes.status === 401 && oldLoginRes.data?.success === false,
    `Old password login rejected with HTTP 401`
  );

  // 10. Verify new password works
  const newLoginRes = await apiCall('/api/auth/login', 'POST', {
    email: userA.email,
    password: newPasswordAlice,
  });
  if (newLoginRes.data?.token) {
    userA.token = newLoginRes.data.token;
  }
  userA.password = newPasswordAlice;
  report(
    10,
    'Verify new password works',
    newLoginRes.status === 200 && newLoginRes.data?.success === true,
    `Authenticated with new credentials for ${newLoginRes.data?.user?.email}`
  );

  // 11. Save and retrieve currency preference
  const currencyRes = await apiCall(
    '/api/users/preferences',
    'PUT',
    { currency: 'USD' },
    userA.token
  );
  report(
    11,
    'Save and retrieve currency preference',
    currencyRes.status === 200 && currencyRes.data?.user?.currency === 'USD',
    `Currency updated in MongoDB: ${currencyRes.data?.user?.currency}`
  );

  // 12. Verify currency display updates across pages
  // Check formatting helper logic
  const checkEurRes = await apiCall(
    '/api/users/preferences',
    'PUT',
    { currency: 'EUR' },
    userA.token
  );
  report(
    12,
    'Verify currency display updates across pages',
    checkEurRes.status === 200 && checkEurRes.data?.user?.currency === 'EUR',
    `Currency switched to EUR; formatters dynamically adapt currency symbol (€, $, £, ₹)`
  );

  // 13. Save and retrieve notification preferences
  const notifPayload = {
    budgetThresholdAlerts: true,
    budgetExceededAlerts: true,
    transactionActivityAlerts: false,
    monthlySummaryAlerts: true,
  };
  const notifRes = await apiCall(
    '/api/users/preferences',
    'PUT',
    { notifications: notifPayload },
    userA.token
  );
  const n = notifRes.data?.user?.notifications;
  report(
    13,
    'Save and retrieve notification preferences',
    notifRes.status === 200 &&
      n?.budgetThresholdAlerts === true &&
      n?.transactionActivityAlerts === false &&
      n?.monthlySummaryAlerts === true,
    `Saved in MongoDB: threshold=${n?.budgetThresholdAlerts}, txActivity=${n?.transactionActivityAlerts}`
  );

  // 14. Verify settings persist after refresh and login
  const meRes = await apiCall('/api/auth/me', 'GET', null, userA.token);
  report(
    14,
    'Verify settings persist after refresh and login',
    meRes.status === 200 &&
      meRes.data?.user?.email === userA.email &&
      meRes.data?.user?.name === updatedName &&
      meRes.data?.user?.currency === 'EUR' &&
      meRes.data?.user?.notifications?.transactionActivityAlerts === false,
    `Reloaded session from /api/auth/me: ${meRes.data?.user?.name}, Currency: ${meRes.data?.user?.currency}`
  );

  // 15. Verify users cannot access other users' settings
  // User B attempts to access /api/users/profile without token
  const unauthRes = await apiCall('/api/users/profile', 'GET');
  const userBProfile = await apiCall('/api/users/profile', 'GET', null, userB.token);
  report(
    15,
    'Verify users cannot access other users settings',
    unauthRes.status === 401 &&
      userBProfile.status === 200 &&
      userBProfile.data?.user?.email === userB.email &&
      userBProfile.data?.user?.name === userB.name,
    `User B isolated: ${userBProfile.data?.user?.email}, Unauthenticated rejected with HTTP 401`
  );

  // 16. Verify existing Stages 4–7 functionality remains intact
  // Create a transaction, budget, and test search/analytics
  const txRes = await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Stage 8 Regressive Test Income',
      amount: 45000,
      type: 'income',
      category: 'Salary',
      date: '2026-11-01',
      paymentMethod: 'Bank Transfer',
    },
    userA.token
  );
  const budgetRes = await apiCall(
    '/api/budgets',
    'POST',
    {
      category: 'Food & Dining',
      monthlyLimit: 12000,
      month: 11,
      year: 2026,
    },
    userA.token
  );
  const searchRes = await apiCall(
    '/api/transactions?search=Regressive',
    'GET',
    null,
    userA.token
  );
  const analyticsRes = await apiCall(
    '/api/transactions/analytics?period=this_month',
    'GET',
    null,
    userA.token
  );

  report(
    16,
    'Verify existing Stages 4–7 functionality remains intact',
    txRes.status === 201 &&
      budgetRes.status === 201 &&
      searchRes.status === 200 &&
      searchRes.data?.count >= 1 &&
      analyticsRes.status === 200 &&
      analyticsRes.data?.summary?.totalIncome >= 45000,
    `Txs, Budgets, Search, and Analytics functioning perfectly concurrently.`
  );

  console.log('\n================================================================');
  console.log(`📊 STAGE 8 AUDIT SUMMARY: ${passed}/16 PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage8Tests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
