document.getElementById('login').onclick = () => {
  window.location = '/auth/start';
};

document.getElementById('check').onclick = async () => {
  const r = await fetch('/me');
  const text = await r.text();
  document.getElementById('output').innerHTML = text;
};
