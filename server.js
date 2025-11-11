require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'unsegretoqualsiasi',
  resave: false,
  saveUninitialized: true,
}));

// --- ROUTE 1: inizio login Roblox ---
app.get('/auth/start', (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ROBLOX_CLIENT_ID,
    redirect_uri: process.env.ROBLOX_REDIRECT_URI,
    scope: 'openid profile asset:read asset:write',
    state: 'nonce-' + Math.random().toString(36).substring(2)
  });
  const authUrl = `https://apis.roblox.com/oauth/v1/authorize?${params}`;
  res.redirect(authUrl);
});

// --- ROUTE 2: callback Roblox ---
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Nessun codice di autorizzazione ricevuto.');

  try {
    const tokenRes = await fetch('https://apis.roblox.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.ROBLOX_REDIRECT_URI,
        client_id: process.env.ROBLOX_CLIENT_ID,
        client_secret: process.env.ROBLOX_CLIENT_SECRET
      })
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error('Errore token:', tokenData);
      return res.status(400).send('Errore OAuth: ' + tokenData.error_description);
    }

    req.session.roblox = tokenData;
    res.redirect('/me');
  } catch (err) {
    console.error('Errore callback:', err);
    res.status(500).send('Errore interno callback Roblox.');
  }
});

// --- ROUTE 3: test profilo utente ---
app.get('/me', async (req, res) => {
  if (!req.session.roblox?.access_token)
    return res.redirect('/auth/start');

  try {
    const r = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
      headers: { Authorization: `Bearer ${req.session.roblox.access_token}` }
    });
    const profile = await r.json();
    res.send(`
      <h1>Ciao, ${profile.name}!</h1>
      <img src="${profile.picture}" width="150"/><br>
      <pre>${JSON.stringify(profile, null, 2)}</pre>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore nel recupero profilo utente.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server online su porta', PORT));
