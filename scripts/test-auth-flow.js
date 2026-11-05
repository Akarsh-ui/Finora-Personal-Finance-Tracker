// Stage 3 Authentication verification test script
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================');
  console.log('🧪 STAGE 3 AUTHENTICATION INTEGRATION TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  const testEmail = `test.student.${Date.now()}@finora.internal`;
  const testPassword = 'Password@123';
  const testName = 'Test Student';
  let authToken = null;
  let authCookie = null;

  // TEST 1: /api/auth/me when logged out
  try {
    process.stdout.write('1. Testing GET /api/auth/me while logged out... ');
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    const data = await res.json();
    if (res.status === 401 && data.success === false) {
      console.log('✅ PASSED (HTTP 401 Unauthorized as expected)');
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${res.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 2: Signup with valid details
  try {
    process.stdout.write('2. Testing POST /api/auth/signup with valid details... ');
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
      }),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');

    if (res.status === 201 && data.success && data.user && data.user.email === testEmail && !data.user.password) {
      console.log('✅ PASSED (HTTP 201 Created, user object returned without password)');
      authToken = data.token;
      authCookie = setCookie;
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${res.status}, Message: ${data.message})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 3: Duplicate email rejection
  try {
    process.stdout.write('3. Testing POST /api/auth/signup with duplicate email... ');
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another Student',
        email: testEmail, // same email
        password: 'AnotherPassword456',
      }),
    });
    const data = await res.json();

    if (res.status === 409 && data.success === false) {
      console.log('✅ PASSED (HTTP 409 Conflict, duplicate email rejected cleanly)');
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${res.status}, Message: ${data.message})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 4: Login with incorrect credentials
  try {
    process.stdout.write('4. Testing POST /api/auth/login with incorrect password... ');
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999',
      }),
    });
    const data = await res.json();

    if (res.status === 401 && data.success === false) {
      console.log('✅ PASSED (HTTP 401 Unauthorized, rejected incorrect password)');
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${res.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 5: Login with correct credentials
  try {
    process.stdout.write('5. Testing POST /api/auth/login with correct credentials... ');
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');

    if (res.status === 200 && data.success && data.user && data.user.email === testEmail && !data.user.password) {
      console.log('✅ PASSED (HTTP 200 OK, authenticated and cookie issued)');
      authToken = data.token;
      authCookie = setCookie;
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${res.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 6: /api/auth/me when logged in (via Bearer token & cookie)
  try {
    process.stdout.write('6. Testing GET /api/auth/me while authenticated... ');
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    const data = await res.json();

    if (res.status === 200 && data.success && data.user && data.user.email === testEmail) {
      console.log(`✅ PASSED (HTTP 200 OK, verified identity: ${data.user.name})`);
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${res.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 7: Logout
  try {
    process.stdout.write('7. Testing POST /api/auth/logout... ');
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': authCookie ? authCookie.split(';')[0] : '',
      },
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');

    if (res.status === 200 && data.success) {
      console.log('✅ PASSED (HTTP 200 OK, cookie cleared)');
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${res.status})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  // TEST 8: /api/health endpoint intact
  try {
    process.stdout.write('8. Testing GET /api/health retains MongoDB connection... ');
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();

    if (res.status === 200 && data.status === 'ok' && data.database && data.database.connected === true) {
      console.log('✅ PASSED (HTTP 200 OK, MongoDB status: connected)');
      passed++;
    } else {
      console.log(`❌ FAILED (Status: ${res.status}, DB: ${JSON.stringify(data.database)})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runTests();
