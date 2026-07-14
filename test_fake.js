async function checkLogin() {
  const url = 'https://gbm-cure-bharat-backend.vercel.app/api/auth/login';
  
  // Test fake user
  const body2 = JSON.stringify({
    mobile: '9999999999',
    password: 'password'
  });
  const res2 = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body2 });
  console.log('FAKE USER:', res2.status, await res2.text());
}
checkLogin();
