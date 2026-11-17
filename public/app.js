(() => {
  const SERVER = window.CHAT_SERVER_URL || '';
  const $ = (id) => document.getElementById(id);
  let socket = null;

  const session = {
    get: () => {
      try { return JSON.parse(localStorage.getItem('chat-session')); } catch { return null; }
    },
    set: (s) => { try { localStorage.setItem('chat-session', JSON.stringify(s)); } catch {} },
    clear: () => { try { localStorage.removeItem('chat-session'); } catch {} },
  };

  function show(view) {
    $('auth-view').hidden = view !== 'auth';
    $('chat-view').hidden = view !== 'chat';
    $('who').hidden = view !== 'chat';
  }

  function addMessage(m, me) {
    const row = document.createElement('div');
    row.className = 'msg' + (m.username === me ? ' mine' : '');
    const meta = document.createElement('div');
    meta.className = 'meta';
    const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    meta.textContent = `${m.username} · ${time}`;
    const text = document.createElement('div');
    text.textContent = m.text; // textContent prevents HTML/script injection
    row.append(meta, text);
    $('messages').appendChild(row);
    $('messages').scrollTop = $('messages').scrollHeight;
  }

  function connect(s) {
    $('who-name').textContent = s.username;
    $('messages').innerHTML = '';
    $('chat-error').textContent = '';
    show('chat');

    socket = io(SERVER || undefined, { auth: { token: s.token } });
    socket.on('chat history', (list) => list.forEach((m) => addMessage(m, s.username)));
    socket.on('chat message', (m) => addMessage(m, s.username));
    socket.on('connect_error', (err) => {
      if (/log in/i.test(err.message)) logout(err.message);
      else $('chat-error').textContent = 'Connection problem: ' + err.message;
    });
    socket.on('connect', () => { $('chat-error').textContent = ''; });
  }

  function logout(reason) {
    if (socket) socket.disconnect();
    socket = null;
    session.clear();
    show('auth');
    $('auth-error').textContent = reason || '';
  }

  $('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = (e.submitter && e.submitter.dataset.mode) || 'login';
    $('auth-error').textContent = '';
    try {
      const res = await fetch(`${SERVER}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: $('username').value.trim(), password: $('password').value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      session.set(data);
      $('password').value = '';
      connect(data);
    } catch (err) {
      $('auth-error').textContent = err.message;
    }
  });

  $('message-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('message-input').value.trim();
    if (text && socket) {
      socket.emit('chat message', text);
      $('message-input').value = '';
    }
  });

  $('logout-btn').addEventListener('click', () => logout());

  const saved = session.get();
  if (saved && saved.token) connect(saved); else show('auth');
})();
