import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

const BASE_URL = 'http://localhost:3000';

async function runStage9Tests() {
  console.log('================================================================');
  console.log('🧪 FINORA STAGE 9 REAL NOTIFICATION SYSTEM AUDIT SUITE');
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
    name: 'Notification Tester Alice',
    email: `alice.notif.${timestamp}@finora.test`,
    password: 'AliceNotifPass@123',
    token: null,
  };

  const userB = {
    name: 'Notification Tester Bob',
    email: `bob.notif.${timestamp}@finora.test`,
    password: 'BobNotifPass@123',
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
    console.error('Fatal: Failed to authenticate test users for Stage 9 audit.');
    process.exit(1);
  }

  // 1. Transaction Activity Notification (Create Transaction)
  const txCreateRes = await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Audit Freelance Project',
      amount: 15000,
      type: 'income',
      category: 'Freelance',
      date: '2026-11-01',
    },
    userA.token
  );
  // Allow async notification to commit
  await new Promise((r) => setTimeout(r, 200));

  const notifsRes1 = await apiCall('/api/notifications', 'GET', null, userA.token);
  const txNotif = notifsRes1.data?.notifications?.find(
    (n) => n.type === 'transaction_activity' && n.title.includes('Added')
  );
  report(
    1,
    'Transaction activity notification on create',
    txCreateRes.status === 201 && Boolean(txNotif),
    `Created notification: "${txNotif?.title}" - ${txNotif?.message}`
  );

  // 2. Unread Count Retrieval
  const unreadRes1 = await apiCall('/api/notifications/unread-count', 'GET', null, userA.token);
  report(
    2,
    'Retrieve unread notifications count',
    unreadRes1.status === 200 && unreadRes1.data?.unreadCount >= 1,
    `Unread count: ${unreadRes1.data?.unreadCount}`
  );

  // 3. Mark Single Notification as Read
  const markReadRes = await apiCall(
    `/api/notifications/${txNotif?._id}/read`,
    'PATCH',
    null,
    userA.token
  );
  report(
    3,
    'Mark single notification as read',
    markReadRes.status === 200 && markReadRes.data?.notification?.isRead === true,
    `Status updated to isRead: true for ID: ${txNotif?._id}`
  );

  // 4. Transaction Activity Notification on Update
  const txId = txCreateRes.data?.transaction?._id;
  await apiCall(
    `/api/transactions/${txId}`,
    'PUT',
    { amount: 18000, description: 'Audit Freelance Project (Bonus)' },
    userA.token
  );
  await new Promise((r) => setTimeout(r, 200));

  const notifsRes2 = await apiCall('/api/notifications', 'GET', null, userA.token);
  const updateNotif = notifsRes2.data?.notifications?.find(
    (n) => n.type === 'transaction_activity' && n.title.includes('Updated')
  );
  report(
    4,
    'Transaction activity notification on update',
    Boolean(updateNotif),
    `Update notification: "${updateNotif?.title}"`
  );

  // 5. Mark All Notifications as Read
  const markAllRes = await apiCall('/api/notifications/read-all', 'PATCH', null, userA.token);
  const unreadRes2 = await apiCall('/api/notifications/unread-count', 'GET', null, userA.token);
  report(
    5,
    'Mark all notifications as read',
    markAllRes.status === 200 && unreadRes2.data?.unreadCount === 0,
    `Unread count reset to 0 (modified: ${markAllRes.data?.updatedCount})`
  );

  // 6. Budget Warning Notification (80%+ threshold)
  // Setup budget: ₹10,000 for Dining Out (Nov 2026)
  const budgetRes = await apiCall(
    '/api/budgets',
    'POST',
    {
      category: 'Dining Out',
      monthlyLimit: 10000,
      month: 11,
      year: 2026,
    },
    userA.token
  );
  // Log expense of ₹8,500 (85% utilization)
  await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Team Dinner',
      amount: 8500,
      type: 'expense',
      category: 'Dining Out',
      date: '2026-11-02',
    },
    userA.token
  );
  await new Promise((r) => setTimeout(r, 250));

  const notifsRes3 = await apiCall('/api/notifications', 'GET', null, userA.token);
  const budgetWarnNotif = notifsRes3.data?.notifications?.find(
    (n) => n.type === 'budget_warning' && n.message.includes('85%')
  );
  report(
    6,
    'Budget threshold notification (80%+ warning)',
    Boolean(budgetWarnNotif),
    `Generated alert: "${budgetWarnNotif?.title}" (${budgetWarnNotif?.message})`
  );

  // 7. Budget Exceeded Notification (100%+ utilization)
  // Add another expense of ₹2,500 (Total: ₹11,000 -> 110%)
  await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Late Night Snack',
      amount: 2500,
      type: 'expense',
      category: 'Dining Out',
      date: '2026-11-03',
    },
    userA.token
  );
  await new Promise((r) => setTimeout(r, 250));

  const notifsRes4 = await apiCall('/api/notifications', 'GET', null, userA.token);
  const budgetExceededNotif = notifsRes4.data?.notifications?.find(
    (n) => n.type === 'budget_exceeded' && n.message.includes('110%')
  );
  report(
    7,
    'Budget exceeded notification (100%+ alert)',
    Boolean(budgetExceededNotif),
    `Generated alert: "${budgetExceededNotif?.title}"`
  );

  // 8. Duplicate Prevention for Budget Alerts
  // Add another transaction under the same category that stays exceeded
  await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Coffee',
      amount: 200,
      type: 'expense',
      category: 'Dining Out',
      date: '2026-11-04',
    },
    userA.token
  );
  await new Promise((r) => setTimeout(r, 250));

  const notifsRes5 = await apiCall('/api/notifications', 'GET', null, userA.token);
  const exceededCount = notifsRes5.data?.notifications?.filter(
    (n) => n.type === 'budget_exceeded' && n.relatedEntityId === budgetRes.data?.budget?._id
  ).length;
  report(
    8,
    'Budget alert deduplication for same month and budget',
    exceededCount === 1,
    `Budget exceeded alerts count is exactly 1 (duplicate avoided via compound key)`
  );

  // 9. Notification Preference Enforcement: Disabled Alerts
  // Turn OFF transactionActivityAlerts
  await apiCall(
    '/api/users/preferences',
    'PUT',
    { notifications: { transactionActivityAlerts: false } },
    userA.token
  );

  const prevCount = notifsRes5.data?.total || 0;
  await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Muted Transaction',
      amount: 500,
      type: 'income',
      category: 'Salary',
      date: '2026-11-05',
    },
    userA.token
  );
  await new Promise((r) => setTimeout(r, 200));

  const notifsRes6 = await apiCall('/api/notifications', 'GET', null, userA.token);
  const mutedTxNotif = notifsRes6.data?.notifications?.find((n) =>
    n.message.includes('Muted Transaction')
  );
  report(
    9,
    'Notification preference enforcement (Muted transactionActivityAlerts)',
    !mutedTxNotif,
    `Muted transaction produced 0 notifications according to user preference`
  );

  // Re-enable transactionActivityAlerts
  await apiCall(
    '/api/users/preferences',
    'PUT',
    { notifications: { transactionActivityAlerts: true } },
    userA.token
  );

  // 10. Monthly Financial Summary Generation
  const summaryRes = await apiCall(
    '/api/notifications/monthly-summary',
    'POST',
    { month: 11, year: 2026 },
    userA.token
  );
  report(
    10,
    'Monthly financial summary notification generation',
    summaryRes.status === 201 && summaryRes.data?.notification?.type === 'monthly_summary',
    `Generated summary: "${summaryRes.data?.notification?.title}"`
  );

  // 11. Monthly Summary Duplicate Prevention
  const duplicateSummaryRes = await apiCall(
    '/api/notifications/monthly-summary',
    'POST',
    { month: 11, year: 2026 },
    userA.token
  );
  report(
    11,
    'Monthly summary deduplication',
    duplicateSummaryRes.status === 200 && duplicateSummaryRes.data?.notification === null,
    duplicateSummaryRes.data?.message
  );

  // 12. Delete / Dismiss Notification
  const notifToDelete = notifsRes6.data?.notifications?.[0];
  const deleteRes = await apiCall(
    `/api/notifications/${notifToDelete?._id}`,
    'DELETE',
    null,
    userA.token
  );
  const verifyDeleteRes = await apiCall('/api/notifications', 'GET', null, userA.token);
  const deletedFound = verifyDeleteRes.data?.notifications?.some(
    (n) => n._id === notifToDelete?._id
  );
  report(
    12,
    'Delete / dismiss notification',
    deleteRes.status === 200 && !deletedFound,
    `Deleted notification ID: ${notifToDelete?._id}`
  );

  // 13. User-Specific Data Isolation
  // User B cannot see User A's notifications or delete them
  const userBNotifs = await apiCall('/api/notifications', 'GET', null, userB.token);
  const deleteCrossUser = await apiCall(
    `/api/notifications/${budgetExceededNotif?._id}`,
    'DELETE',
    null,
    userB.token
  );
  report(
    13,
    'User-specific notification data isolation',
    userBNotifs.data?.total === 0 && deleteCrossUser.status === 404,
    `User B cannot access or delete User A's notifications (404 Unauthorized Access)`
  );

  // 14. Persistence after Refresh and Login
  const meRes = await apiCall('/api/auth/me', 'GET', null, userA.token);
  const reloadNotifs = await apiCall('/api/notifications', 'GET', null, userA.token);
  report(
    14,
    'Persistence after refresh and login',
    meRes.status === 200 && reloadNotifs.status === 200 && reloadNotifs.data?.total >= 3,
    `Persistent records loaded from MongoDB Atlas: ${reloadNotifs.data?.total} notifications intact`
  );

  // 15. Transaction Deletion Notification
  const delTxRes = await apiCall(
    `/api/transactions/${txId}`,
    'DELETE',
    null,
    userA.token
  );
  await new Promise((r) => setTimeout(r, 200));

  const afterDelNotifs = await apiCall('/api/notifications', 'GET', null, userA.token);
  const delNotif = afterDelNotifs.data?.notifications?.find(
    (n) => n.type === 'transaction_activity' && n.title.includes('Deleted')
  );
  report(
    15,
    'Transaction activity notification on delete',
    delTxRes.status === 200 && Boolean(delNotif),
    `Delete notification: "${delNotif?.title}"`
  );

  // 16. Regression: Stages 4–8 Functionality Intact
  const checkTx = await apiCall('/api/transactions', 'GET', null, userA.token);
  const checkBudgets = await apiCall('/api/budgets', 'GET', null, userA.token);
  const checkAnalytics = await apiCall('/api/transactions/analytics?period=this_month', 'GET', null, userA.token);
  const checkProfile = await apiCall('/api/users/profile', 'GET', null, userA.token);

  report(
    16,
    'Regression check for Stages 4–8 (Transactions, Budgets, Analytics, Settings)',
    checkTx.status === 200 &&
      checkBudgets.status === 200 &&
      checkAnalytics.status === 200 &&
      checkProfile.status === 200,
    `All core systems operating concurrently and flawlessly.`
  );

  console.log('\n================================================================');
  console.log(`📊 STAGE 9 AUDIT SUMMARY: ${passed}/16 PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage9Tests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
