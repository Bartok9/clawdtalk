(function() {
  'use strict';

  const script = document.currentScript;
  const agentId = script?.getAttribute('data-agent-id') || '';
  const color = script?.getAttribute('data-color') || '#16a34a';
  const apiUrl = script?.getAttribute('data-api-url') || window.location.origin;
  const title = script?.getAttribute('data-title') || 'Chat with us';

  const style = document.createElement('style');
  style.textContent = `
    .ct-chat-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${color}; color: white; border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; transition: all 0.3s;
    }
    .ct-chat-btn:hover { transform: scale(1.1); }
    .ct-chat-widget {
      position: fixed; bottom: 92px; right: 24px; z-index: 99998;
      width: 380px; height: 520px;
      background: white; border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      font-family: -apple-system, sans-serif;
      display: none; flex-direction: column; overflow: hidden;
    }
    .ct-chat-widget.open { display: flex; }
    .ct-chat-header {
      padding: 16px 20px; background: ${color}; color: white;
      font-weight: 600; font-size: 15px; display: flex; justify-content: space-between; align-items: center;
    }
    .ct-chat-header button { background:none;border:none;color:white;cursor:pointer;font-size:18px; }
    .ct-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px;
    }
    .ct-chat-msg {
      margin-bottom: 12px; display: flex;
    }
    .ct-chat-msg.user { justify-content: flex-end; }
    .ct-chat-msg .bubble {
      max-width: 80%; padding: 10px 14px; border-radius: 16px;
      font-size: 14px; line-height: 1.5;
    }
    .ct-chat-msg.user .bubble { background: ${color}; color: white; border-bottom-right-radius: 4px; }
    .ct-chat-msg.assistant .bubble { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }
    .ct-chat-typing { padding: 0 16px 8px; font-size: 12px; color: #94a3b8; display: none; }
    .ct-chat-typing.show { display: block; }
    .ct-chat-input-area {
      padding: 12px 16px; border-top: 1px solid #e2e8f0;
      display: flex; gap: 8px;
    }
    .ct-chat-input {
      flex: 1; padding: 10px 14px; border: 1px solid #e2e8f0;
      border-radius: 24px; font-size: 14px; outline: none;
    }
    .ct-chat-input:focus { border-color: ${color}; }
    .ct-chat-send {
      width: 40px; height: 40px; border-radius: 50%;
      background: ${color}; color: white; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 16px;
    }
    .ct-chat-send:disabled { opacity: 0.5; cursor: default; }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.className = 'ct-chat-btn';
  btn.innerHTML = '💬';

  const widget = document.createElement('div');
  widget.className = 'ct-chat-widget';
  widget.innerHTML = `
    <div class="ct-chat-header">
      <span>${title}</span>
      <button id="ct-chat-close">✕</button>
    </div>
    <div class="ct-chat-messages" id="ct-chat-messages">
      <div class="ct-chat-msg assistant"><div class="bubble">Hi! How can I help you today?</div></div>
    </div>
    <div class="ct-chat-typing" id="ct-chat-typing">Agent is typing...</div>
    <div class="ct-chat-input-area">
      <input class="ct-chat-input" id="ct-chat-input" placeholder="Type a message..." />
      <button class="ct-chat-send" id="ct-chat-send">➤</button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(widget);

  let conversationId = null;

  btn.addEventListener('click', () => {
    widget.classList.toggle('open');
    if (widget.classList.contains('open')) {
      document.getElementById('ct-chat-input')?.focus();
    }
  });

  document.getElementById('ct-chat-close')?.addEventListener('click', () => {
    widget.classList.remove('open');
  });

  const addMsg = (role, text) => {
    const el = document.getElementById('ct-chat-messages');
    if (!el) return;
    const div = document.createElement('div');
    div.className = `ct-chat-msg ${role}`;
    div.innerHTML = `<div class="bubble">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  };

  const sendMessage = async () => {
    const input = document.getElementById('ct-chat-input');
    const sendBtn = document.getElementById('ct-chat-send');
    const typing = document.getElementById('ct-chat-typing');
    const text = input?.value?.trim();
    if (!text) return;

    input.value = '';
    sendBtn.disabled = true;
    addMsg('user', text);
    if (typing) typing.classList.add('show');

    try {
      const res = await fetch(`${apiUrl}/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId,
          from: 'chat-widget-user',
        }),
      });
      const data = await res.json();
      conversationId = data.conversationId;
      if (data.reply) addMsg('assistant', data.reply);
      else if (data.error) addMsg('assistant', 'Sorry, something went wrong.');
    } catch {
      addMsg('assistant', 'Sorry, I couldn\'t connect.');
    }

    if (typing) typing.classList.remove('show');
    sendBtn.disabled = false;
    input?.focus();
  };

  document.getElementById('ct-chat-send')?.addEventListener('click', sendMessage);
  document.getElementById('ct-chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
})();
