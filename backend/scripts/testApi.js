const testLogin = async () => {
  try {
    const res = await fetch('https://timeflow-backend.yuviiconsultancy.com/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'yuviiconsultancy@gmail.com',
        password: 'Yuvii@1120'
      })
    });
    
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
};
testLogin();
