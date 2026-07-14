async function checkLogin() {
  const url = 'https://gbm-cure-bharat-backend.vercel.app/api/auth/login';
  const body = JSON.stringify({
    mobile: '9978944422',
    password: '123456'
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });
    
    const text = await res.text();
    console.log('NEW BACKEND RESPONSE:', res.status, text);

    const res2 = await fetch('https://mlm-backend-phi.vercel.app/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });
    const text2 = await res2.text();
    console.log('OLD BACKEND RESPONSE:', res2.status, text2);
  } catch(e) {
    console.error(e);
  }
}
checkLogin();
