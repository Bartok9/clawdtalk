(function() {
  'use strict';

  const script = document.currentScript;
  const agentId = script?.getAttribute('data-agent-id') || '';
  const color = script?.getAttribute('data-color') || '#16a34a';
  const apiUrl = script?.getAttribute('data-api-url') || window.location.origin;

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    .ct-voice-orb {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 64px; height: 64px; border-radius: 50%;
      background: ${color}; color: white; border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; transition: all 0.3s;
    }
    .ct-voice-orb:hover { transform: scale(1.1); }
    .ct-voice-orb.active { animation: ct-pulse 1.5s infinite; }
    @keyframes ct-pulse {
      0%, 100% { box-shadow: 0 0 0 0 ${color}66; }
      50% { box-shadow: 0 0 0 16px ${color}00; }
    }
    .ct-voice-transcript {
      position: fixed; bottom: 100px; right: 24px; z-index: 99998;
      width: 320px; max-height: 400px; overflow-y: auto;
      background: white; border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      font-family: -apple-system, sans-serif; display: none;
    }
    .ct-voice-transcript.open { display: block; }
    .ct-voice-transcript-header {
      padding: 16px; border-bottom: 1px solid #e2e8f0;
      font-weight: 600; font-size: 14px; display: flex; justify-content: space-between;
    }
    .ct-voice-transcript-body { padding: 16px; }
    .ct-voice-msg {
      margin-bottom: 8px; padding: 8px 12px; border-radius: 12px;
      font-size: 13px; max-width: 85%; line-height: 1.4;
    }
    .ct-voice-msg.user { background: ${color}; color: white; margin-left: auto; text-align: right; }
    .ct-voice-msg.assistant { background: #f1f5f9; color: #1e293b; }
    .ct-voice-status {
      text-align: center; font-size: 12px; color: #94a3b8; padding: 8px;
    }
  `;
  document.head.appendChild(style);

  // Create elements
  const orb = document.createElement('button');
  orb.className = 'ct-voice-orb';
  orb.innerHTML = '🎙️';
  orb.title = 'Start voice conversation';

  const transcript = document.createElement('div');
  transcript.className = 'ct-voice-transcript';
  transcript.innerHTML = `
    <div class="ct-voice-transcript-header">
      <span>Voice Chat</span>
      <button onclick="this.closest('.ct-voice-transcript').classList.remove('open')" style="background:none;border:none;cursor:pointer;font-size:16px">✕</button>
    </div>
    <div class="ct-voice-transcript-body" id="ct-voice-messages"></div>
    <div class="ct-voice-status" id="ct-voice-status">Click the orb to start</div>
  `;

  document.body.appendChild(orb);
  document.body.appendChild(transcript);

  let isActive = false;
  let mediaRecorder = null;
  let conversationId = null;

  const addMsg = (role, text) => {
    const el = document.getElementById('ct-voice-messages');
    if (!el) return;
    const div = document.createElement('div');
    div.className = `ct-voice-msg ${role}`;
    div.textContent = text;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  };

  const setStatus = (text) => {
    const el = document.getElementById('ct-voice-status');
    if (el) el.textContent = text;
  };

  orb.addEventListener('click', async () => {
    transcript.classList.add('open');

    if (isActive) {
      isActive = false;
      orb.classList.remove('active');
      orb.innerHTML = '🎙️';
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      setStatus('Conversation ended');
      return;
    }

    isActive = true;
    orb.classList.add('active');
    orb.innerHTML = '⏹️';
    setStatus('Listening...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (!isActive) return;

        setStatus('Processing...');
        // In production, send audio to speech-to-text then to agent
        // For MVP, show a demo message
        addMsg('user', '[Voice input captured]');

        try {
          const res = await fetch(`${apiUrl}/api/agents/${agentId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'Hello, I need help.',
              conversationId,
              from: 'voice-orb-user',
            }),
          });
          const data = await res.json();
          conversationId = data.conversationId;
          if (data.reply) addMsg('assistant', data.reply);
        } catch (err) {
          addMsg('assistant', 'Sorry, I encountered an error.');
        }
        setStatus(isActive ? 'Listening...' : 'Click the orb to start');
      };

      mediaRecorder.start();
      // Auto-stop after 10s for MVP
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 10000);
    } catch (err) {
      setStatus('Microphone access denied');
      isActive = false;
      orb.classList.remove('active');
      orb.innerHTML = '🎙️';
    }
  });
})();
