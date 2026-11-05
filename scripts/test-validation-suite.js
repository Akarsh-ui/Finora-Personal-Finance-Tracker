import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('================================================================');
  console.log('🧪 FINORA COMPREHENSIVE VALIDATION & RESTRICTIONS SUITE');
  console.log('================================================================\n');

  const timestamp = Date.now();

  // --- 1. FULL NAME VALIDATION ---
  console.log('--- 1. Full Name Validation (Registration) ---');
  // 1. Empty name
  let res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '', email: `val_${timestamp}@test.com`, password: 'Password@123' }),
  });
  let data = await res.json();
  assert(res.status === 400 && data.message.includes('Name is required'), 'Empty name rejected with 400');

  // 2. Single char name
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'A', email: `val_${timestamp}@test.com`, password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('between 2 and 50 characters'), 'Single char name rejected with 400');

  // 3. Name with numbers
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'John123 Doe', email: `val_${timestamp}@test.com`, password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('only letters and spaces'), 'Name with numbers rejected with 400');

  // 4. Name with special characters
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'John@Doe!', email: `val_${timestamp}@test.com`, password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('only letters and spaces'), 'Name with special characters rejected with 400');

  // 5. Name consisting of only spaces
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '     ', email: `val_${timestamp}@test.com`, password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('Name is required'), 'Name of spaces rejected with 400');

  // 6. Name with leading/trailing spaces trimmed
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '   Akarsh Saini   ', email: `trimmed_${timestamp}@test.com`, password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 201 && data.user.name === 'Akarsh Saini', 'Name with spaces correctly trimmed and accepted');

  // 7. Legitimate multi-word name
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Mary Jane Watson', email: `multiword_${timestamp}@test.com`, password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 201 && data.user.name === 'Mary Jane Watson', 'Multi-word legitimate name accepted');

  // --- 2. EMAIL VALIDATION ---
  console.log('\n--- 2. Universal Email Validation (Registration) ---');
  // 8. Empty email
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: '', password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('required'), 'Empty email rejected with 400');

  // 9. Email without @
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'userdomain.com', password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('valid email address'), 'Email without @ rejected with 400');

  // 10. Email without domain
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'user@', password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 400, 'Email without domain rejected with 400');

  // 11. Email without domain extension
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'user@domain', password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 400, 'Email without domain extension rejected with 400');

  // 12. Email with spaces
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'user @domain.com', password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 400 && (data.message.includes('spaces') || data.message.includes('valid email address')), 'Email with spaces rejected with 400');

  // 13. Outlook email accepted
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Outlook User', email: `user_${timestamp}@outlook.com`, password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 201 && data.user.email === `user_${timestamp}@outlook.com`, 'Outlook email accepted successfully');

  // 14. Yahoo email accepted
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Yahoo User', email: `user_${timestamp}@yahoo.com`, password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 201 && data.user.email === `user_${timestamp}@yahoo.com`, 'Yahoo email accepted successfully');

  // 15. Hotmail email accepted
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Hotmail User', email: `user_${timestamp}@hotmail.com`, password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 201 && data.user.email === `user_${timestamp}@hotmail.com`, 'Hotmail email accepted successfully');

  // 16. Custom domain email accepted
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Custom Domain User', email: `director_${timestamp}@fintech.finance.co.uk`, password: 'Password@123' }),
  });
  data = await res.json();
  assert(res.status === 201, 'Custom domain email accepted without restriction');

  // --- 3. PASSWORD COMPLEXITY VALIDATION ---
  console.log('\n--- 3. Password Complexity Validation (Registration) ---');
  // 17. Password < 8 characters
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Short PW', email: `pw_${timestamp}_1@test.com`, password: 'Pass1!' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('between 8 and 64 characters'), 'Password < 8 chars rejected with 400');

  // 18. Password > 64 characters
  const longPw = 'Password123!'.repeat(6); // 72 chars
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Long PW', email: `pw_${timestamp}_2@test.com`, password: longPw }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('between 8 and 64 characters'), 'Password > 64 chars rejected with 400');

  // 19. Missing uppercase letter
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'No Upper', email: `pw_${timestamp}_3@test.com`, password: 'password123!' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('uppercase letter'), 'Password missing uppercase rejected with 400');

  // 20. Missing lowercase letter
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'No Lower', email: `pw_${timestamp}_4@test.com`, password: 'PASSWORD123!' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('lowercase letter'), 'Password missing lowercase rejected with 400');

  // 21. Missing number
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'No Number', email: `pw_${timestamp}_5@test.com`, password: 'Password!!!!' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('number'), 'Password missing number rejected with 400');

  // 22. Missing special character
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'No Special', email: `pw_${timestamp}_6@test.com`, password: 'Password1234' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('special character'), 'Password missing special char rejected with 400');

  // 23. Password of spaces
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Spaces PW', email: `pw_${timestamp}_7@test.com`, password: '        ' }),
  });
  data = await res.json();
  assert(res.status === 400, 'Password consisting entirely of spaces rejected with 400');

  // 24. Valid complex password
  const testEmail = `tester_${timestamp}@gmail.com`;
  const testPw = 'SecurePass@99';
  res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Primary Tester', email: testEmail, password: testPw }),
  });
  data = await res.json();
  const token = data.token;
  assert(res.status === 201 && token, 'Valid complex password accepted (201 Created)');

  // --- 4. LOGIN VALIDATION ---
  console.log('\n--- 4. Login Validation ---');
  // 25. Valid login
  res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPw }),
  });
  data = await res.json();
  assert(res.status === 200 && data.user.email === testEmail, 'Login with correct credentials succeeds');

  // 26. Login with invalid email format
  res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalid_email_format', password: testPw }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('valid email address'), 'Login with invalid email format rejected with 400');

  // --- 5. TRANSACTION FORM VALIDATION ---
  console.log('\n--- 5. Transaction Form Validation ---');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 27. Title empty / only spaces
  res = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ title: '   ', amount: 500, type: 'expense', category: 'Shopping' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('title is required'), 'Transaction with empty title rejected with 400');

  // 28. Title containing only symbols
  res = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ title: '---***&&&', amount: 500, type: 'expense', category: 'Shopping' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('must contain letters or numbers'), 'Transaction with title of only symbols rejected with 400');

  // 29. Amount = 0
  res = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ title: 'Coffee', amount: 0, type: 'expense', category: 'Food & Dining' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('greater than 0'), 'Transaction with amount 0 rejected with 400');

  // 30. Negative amount
  res = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ title: 'Coffee', amount: -150, type: 'expense', category: 'Food & Dining' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('greater than 0'), 'Transaction with negative amount rejected with 400');

  // 31. Amount exceeding maximum (100,000,000)
  res = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ title: 'Mega Asset', amount: 150000000, type: 'expense', category: 'Investment' }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('cannot exceed'), 'Transaction amount > 100M rejected with 400');

  // 32. Valid transaction
  res = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Monthly Cloud Infrastructure',
      amount: 4500.5,
      type: 'expense',
      category: 'Utilities',
      date: new Date().toISOString(),
      notes: 'Payment for server nodes',
    }),
  });
  data = await res.json();
  assert(res.status === 201 && data.transaction.amount === 4500.5, 'Valid transaction created successfully');

  // --- 6. BUDGET VALIDATION & DUPLICATE CHECKS ---
  console.log('\n--- 6. Budget Validation & Duplicate Checks ---');
  // Create first budget
  const bMonth = 11;
  const bYear = 2026;
  res = await fetch(`${BASE_URL}/api/budgets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ category: 'Food & Groceries', monthlyLimit: 20000, month: bMonth, year: bYear }),
  });
  data = await res.json();
  assert(res.status === 201, 'First category budget created successfully');

  // 33. Duplicate budget check for same category + month + year
  res = await fetch(`${BASE_URL}/api/budgets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ category: 'Food & Groceries', monthlyLimit: 25000, month: bMonth, year: bYear }),
  });
  data = await res.json();
  assert(
    res.status === 409 && data.message.includes('already exists for 11/2026'),
    'Duplicate budget rejected with HTTP 409 Conflict and helpful resolution hint'
  );

  // --- 7. SETTINGS / PASSWORD CHANGE VALIDATION ---
  console.log('\n--- 7. Settings / Password Change Validation ---');
  // 34. Password change enforces complexity, current password check, and matching confirmation
  // Case A: Mismatched confirmation
  res = await fetch(`${BASE_URL}/api/users/password`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      currentPassword: testPw,
      newPassword: 'BrandNewPass@100',
      confirmPassword: 'DifferentPass@100',
    }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('do not match'), 'Password change with mismatched confirmation rejected');

  // Case B: Incorrect current password
  res = await fetch(`${BASE_URL}/api/users/password`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      currentPassword: 'WrongPassword@123',
      newPassword: 'BrandNewPass@100',
      confirmPassword: 'BrandNewPass@100',
    }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('Current password is incorrect'), 'Incorrect current password rejected');

  // Case C: New password missing complexity (no special char)
  res = await fetch(`${BASE_URL}/api/users/password`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      currentPassword: testPw,
      newPassword: 'BrandNewPass100',
      confirmPassword: 'BrandNewPass100',
    }),
  });
  data = await res.json();
  assert(res.status === 400 && data.message.includes('special character'), 'New password missing complexity rejected');

  // Case D: Valid password change
  res = await fetch(`${BASE_URL}/api/users/password`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      currentPassword: testPw,
      newPassword: 'BrandNewPass@100',
      confirmPassword: 'BrandNewPass@100',
    }),
  });
  data = await res.json();
  assert(res.status === 200 && data.success, 'Valid password change succeeded with new token issued');

  console.log('\n================================================================');
  console.log(`📊 SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
