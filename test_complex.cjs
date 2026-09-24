const http = require('http');

async function run() {
  const loginRes = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: '123' })
  });
  
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login Status:', loginRes.status);
  
  const createRes = await fetch('http://localhost:3000/api/complexes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ name: "Test Script Complex", location: "Loc", password: "abc" })
  });
  
  console.log('Create Status:', createRes.status);
  const data = await createRes.text();
  console.log('Response:', data);
}
run();
