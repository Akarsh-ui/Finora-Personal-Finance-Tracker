import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

const BASE_URL = 'http://localhost:3000';

async function testNotificationSync() {
  console.log('================================================================');
  console.log('🧪 FINORA NOTIFICATION SYNCHRONIZATION TEST SUITE');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const user = {
    name: 'Sync Tester',
    email: `sync.${timestamp}@finora.test`,
    password: 'SyncPassword@123',
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

  // Sign up
  const signupRes = await apiCall('/api/auth/signup', 'POST', user);
  user.token = signupRes.data?.token;

  if (!user.token) {
    console.error('Failed to create sync test user');
    process.exit(1);
  }

  // Initial check: 0 notifications, 0 unread
  const initial = await apiCall('/api/notifications', 'GET', null, user.token);
  console.log(`Initial state: total=${initial.data?.total}, unread=${initial.data?.unreadCount}`);

  // 1. Create a transaction
  console.log('\nStep 1: Create transaction...');
  const createTxRes = await apiCall(
    '/api/transactions',
    'POST',
    {
      description: 'Grocery Shopping Test',
      amount: 3200,
      type: 'expense',
      category: 'Groceries',
      date: '2026-11-01',
    },
    user.token
  );
  const txId = createTxRes.data?.transaction?._id;
  await new Promise((r) => setTimeout(r, 150));

  // 2. Fetch notifications dropdown list immediately (simulating opening bell)
  console.log('Step 2: Simulating clicking bell and opening dropdown without page refresh...');
  const dropdownFetch = await apiCall('/api/notifications', 'GET', null, user.token);
  const foundNewTx = dropdownFetch.data?.notifications?.find(
    (n) => n.type === 'transaction_activity' && n.title.includes('Added')
  );

  if (foundNewTx && dropdownFetch.data?.unreadCount === 1) {
    console.log('✅ PASS: New transaction notification is visible in dropdown immediately!');
    console.log(`   └─ Title: "${foundNewTx.title}", Unread: ${dropdownFetch.data?.unreadCount}`);
  } else {
    console.error('❌ FAIL: Notification not found in dropdown list without refresh!');
    process.exit(1);
  }

  // 3. Mark as read
  console.log('\nStep 3: Mark notification as read...');
  const markRes = await apiCall(
    `/api/notifications/${foundNewTx._id}/read`,
    'PATCH',
    null,
    user.token
  );
  const afterReadFetch = await apiCall('/api/notifications', 'GET', null, user.token);
  if (markRes.status === 200 && afterReadFetch.data?.unreadCount === 0) {
    console.log('✅ PASS: Unread count synchronized to 0 after marking read.');
  } else {
    console.error('❌ FAIL: Unread count not synchronized.');
    process.exit(1);
  }

  // 4. Update transaction
  console.log('\nStep 4: Update transaction...');
  await apiCall(
    `/api/transactions/${txId}`,
    'PUT',
    { amount: 3500, description: 'Grocery Shopping Test (Organic)' },
    user.token
  );
  await new Promise((r) => setTimeout(r, 150));

  const afterUpdateFetch = await apiCall('/api/notifications', 'GET', null, user.token);
  const foundUpdate = afterUpdateFetch.data?.notifications?.find(
    (n) => n.type === 'transaction_activity' && n.title.includes('Updated')
  );
  if (foundUpdate && afterUpdateFetch.data?.unreadCount === 1) {
    console.log('✅ PASS: Update notification visible in dropdown immediately.');
  } else {
    console.error('❌ FAIL: Update notification not visible.');
    process.exit(1);
  }

  // 5. Delete transaction
  console.log('\nStep 5: Delete transaction...');
  await apiCall(`/api/transactions/${txId}`, 'DELETE', null, user.token);
  await new Promise((r) => setTimeout(r, 150));

  const afterDeleteFetch = await apiCall('/api/notifications', 'GET', null, user.token);
  const foundDelete = afterDeleteFetch.data?.notifications?.find(
    (n) => n.type === 'transaction_activity' && n.title.includes('Deleted')
  );
  if (foundDelete) {
    console.log('✅ PASS: Delete notification visible in dropdown immediately.');
  } else {
    console.error('❌ FAIL: Delete notification not visible.');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL NOTIFICATION SYNCHRONIZATION VERIFICATION CHECKS PASSED!');
  console.log('================================================================\n');
}

testNotificationSync().catch((err) => {
  console.error('Sync test error:', err);
  process.exit(1);
});
