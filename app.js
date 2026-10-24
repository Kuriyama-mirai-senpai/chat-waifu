/* ================================================================
   WAIFU CHATBOT — Ứng dụng chính
   Nối Live2D (màn hình) + Chat (bộ não) + TTS (giọng nói) + UI
   ================================================================ */

(function () {
  'use strict';

  // Hiện lỗi JS ra góc màn hình để dễ báo lỗi
  window.addEventListener('error', function (e) {
    var el = document.getElementById('js-error');
    if (el) {
      el.textContent = ((el.textContent || '') + '\n' + (e.message || 'JS error')).slice(-600);
    }
  });

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    form: $('chat-form'),
    input: $('chat-input'),
    messages: $('chat-messages'),
    typing: $('typing-bubble'),
    toast: $('toast'),
    modal: $('settings-modal'),
    waifuName: $('waifu-name'),
    status: $('waifu-status'),
    btnSound: $('btn-sound'),
    send: $('btn-send'),
  };

  var settings = loadSettings();
  var busy = false;

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, ms || 3600);
  }

  /* ---------- Tin nhắn ---------- */
  function timeNow() {
    return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  function addMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'msg ' + (role === 'user' ? 'user' : 'waifu');
    var body = document.createElement('span');
    body.className = 'body';
    div.appendChild(body);
    var meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = (role === 'user' ? 'bạn' : settings.waifuName) + ' • ' + timeNow();
    div.appendChild(meta);
    if (text) body.textContent = text;
    els.messages.insertBefore(div, els.typing); // typing luôn nằm cuối
    scrollBottom();
    return body;
  }

  function scrollBottom() { els.messages.scrollTop = els.messages.scrollHeight; }

  function typeOut(body, text) {
    return new Promise(function (resolve) {
      if (!text) { resolve(); return; }
      var step = Math.max(12, Math.min(32, 1000 / Math.max(text.length, 1)));
      var i = 0;
      var iv = setInterval(function () {
        i += 1;
        body.textContent = text.slice(0, i);
        scrollBottom();
        if (i >= text.length) { clearInterval(iv); resolve(); }
      }, step);
    });
  }

  /* ---------- Gửi tin nhắn ---------- */
  function setBusy(on) {
    busy = on;
    els.typing.hidden = !on;
    els.send.disabled = on;
    els.input.disabled = on;
    els.status.textContent = on ? 'đang gõ... ✍️' : 'đang online 💕';
    if (on) scrollBottom();
  }

  function send(text) {
    var t = String(text || '').trim();
    if (!t || busy) return Promise.resolve();
    setBusy(true);
    addMessage('user', t);
    els.input.value = '';

    return Chat.getReply(t, settings).then(function (r) {
      if (r.error) toast('⚠️ API lỗi: ' + r.error + ' — tạm trả lời kiểu offline nha!', 5000);
      setBusy(false);
      var body = addMessage('waifu', '');
      return typeOut(body, r.text || '...').then(function () {
        Live2DStage.applyEmotion(r.emotion || 'neutral');
        if (settings.ttsEnabled && TTS.supported()) {
          Live2DStage.setSpeaking(true);
          TTS.speak(r.text, settings, { onend: function () { Live2DStage.setSpeaking(false); } });
        }
      });
    }).catch(function (e) {
      setBusy(false);
      addMessage('waifu', 'Hự... ' + settings.waifuName + ' hơi bị choáng đầu xíu (x_x) senpai thử nhắn lại nha~');
      Live2DStage.applyEmotion('sad');
    });
  }

  els.form.addEventListener('submit', function (e) {
    e.preventDefault();
    send(els.input.value);
  });

  /* ---------- Lời chào khi mở app ---------- */
  function greet() {
    var name = settings.waifuName;
    var lines = [
      'Chào senpai~ cuối cùng ' + name + ' cũng được gặp senpai rồi nè! (๑•̀ㅂ•́)و✧\nNhắn gì cho ' + name + ' đi nha~',
      'Ehehe~ ' + name + ' ở đây nè! Hôm nay senpai thế nào, có vui không? 💕',
      'Ơ~ senpai tới rồi! ' + name + ' canh màn hình chờ senpai nãy giờ luôn đó~\nCó chuyện gì kể nghe nha!',
    ];
    var t = lines[Math.floor(Math.random() * lines.length)];
    var body = addMessage('waifu', '');
    typeOut(body, t).then(function () {
      Live2DStage.applyEmotion('happy');
      if (settings.ttsEnabled && TTS.supported()) {
        Live2DStage.setSpeaking(true);
        TTS.speak(t, settings, { onend: function () { Live2DStage.setSpeaking(false); } });
      }
    });
  }

  /* ---------- Khôi phục lịch sử chat ---------- */
  Chat.loadHistory();
  var prev = Chat.getHistory();
  var stripTag = function (s) {
    return String(s || '').replace(/\s*\[(happy|sad|shy|angry|surprised|neutral)\]\s*$/i, '');
  };
  for (var i = 0; i < prev.length; i++) {
    addMessage(prev[i].role === 'user' ? 'user' : 'waifu', stripTag(prev[i].content));
  }

  /* ---------- Khởi động Live2D ---------- */
  Live2DStage.init($('live2d-container')).then(function () {
    $('loading-overlay').classList.add('hidden');
  }).catch(function (e) {
    $('loading-overlay').classList.add('hidden');
    toast('⚠️ Không nạp được Live2D (' + ((e && e.message) || e) + ') — vẫn chat được bình thường nha!', 7000);
  }).then(function () {
    greet();
  });

  /* ---------- Modal cài đặt ---------- */
  function syncProviderUI() {
    var p = $('set-provider').value;
    $('api-fields').style.display = (p === 'offline') ? 'none' : '';
    // XAI247 không cần Base URL (app tự đi qua proxy local của server)
    $('baseurl-field').style.display = (p === 'xai247') ? 'none' : '';
    $('key-check-result').hidden = true;
  }

  function fillVoices() {
    var sel = $('set-voice');
    sel.innerHTML = '';
    var vs = TTS.getVoices();
    if (!vs.length) {
      var o = document.createElement('option');
      o.value = '';
      o.textContent = '(Trình duyệt chưa liệt kê được giọng đọc)';
      sel.appendChild(o);
      return;
    }
    vs.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v.name;
      o.textContent = (((v.lang || '').toLowerCase().indexOf('vi') === 0) ? '🇻🇳 ' : '') + v.name + ' (' + v.lang + ')';
      sel.appendChild(o);
    });
    // Tự chọn giọng NỮ nếu chưa chọn giọng nào, hoặc giọng đang chọn là giọng nam
    var current = vs.filter(function (v) { return v.name === settings.voiceName; })[0];
    if (!current || TTS.voiceScore(current) < 0) {
      var auto = TTS.pickVoice();
      if (auto) settings.voiceName = auto.name;
    }
    if (settings.voiceName) sel.value = settings.voiceName;
  }

  function openSettings() {
    $('set-name').value = settings.waifuName;
    $('set-persona').value = settings.persona;
    $('set-provider').value = settings.provider;
    $('set-baseurl').value = settings.baseUrl;
    $('set-apikey').value = settings.apiKey;
    $('set-model').value = settings.model;
    $('set-tts').checked = settings.ttsEnabled;
    fillVoices();
    if (settings.voiceName) $('set-voice').value = settings.voiceName;
    syncProviderUI();
    els.modal.hidden = false;
  }

  function closeSettings() { els.modal.hidden = true; }

  function saveSettingsFromUI() {
    var provider = $('set-provider').value;
    var apiKey = $('set-apikey').value.trim();
    if (provider !== 'offline' && !apiKey) {
      toast('⚠️ Chưa nhập API key! Hoặc chọn chế độ 🌸 Offline.');
      return;
    }
    settings = Object.assign({}, settings, {
      provider: provider,
      baseUrl: provider === 'xai247' ? '/api/xai247/v1'
        : ($('set-baseurl').value.trim() || 'https://api.openai.com/v1'),
      apiKey: apiKey,
      model: $('set-model').value.trim() || 'gpt-4o-mini',
      waifuName: $('set-name').value.trim() || 'Shizuku',
      persona: $('set-persona').value.trim() || DEFAULT_PERSONA,
      ttsEnabled: $('set-tts').checked,
      voiceName: $('set-voice').value,
    });
    persistSettings(settings);
    applySettingsUI();
    closeSettings();
    toast('💾 Đã lưu! ' + settings.waifuName + ' yêu senpai nhiều hơn nè~ 💕');
  }

  function applySettingsUI() {
    els.waifuName.textContent = settings.waifuName;
    els.input.placeholder = 'Nhắn gì cho ' + settings.waifuName + ' nè...';
    updateSoundIcon();
  }

  /* ---------- Kiểm tra API key & lấy danh sách model ---------- */
  function showKeyResult(msg) {
    var el = $('key-check-result');
    if (!el) return;
    el.textContent = msg;
    el.hidden = !msg;
  }

  $('btn-check-key').addEventListener('click', function () {
    var provider = $('set-provider').value;
    var key = $('set-apikey').value.trim();
    if (!key) { showKeyResult('⚠️ Nhập API key trước đã nha senpai~'); return; }
    if (provider === 'offline') { showKeyResult('🌸 Offline không cần key gì hết đó~'); return; }
    if (provider === 'gemini') { showKeyResult('✨ Gemini không có nút kiểm tra — bấm Lưu rồi nhắn thử luôn nha!'); return; }
    var base = (provider === 'xai247')
      ? '/api/xai247/v1'
      : ($('set-baseurl').value.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
    var btn = this;
    btn.disabled = true;
    showKeyResult('⏳ Đang kiểm tra key...');
    fetch(base + '/models', { headers: { 'Authorization': 'Bearer ' + key } })
      .then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; });
      })
      .then(function (res) {
        if (!res.ok) {
          var m = (res.body && res.body.error && (res.body.error.message || res.body.error.status))
            || ('HTTP ' + res.status);
          showKeyResult('❌ Key chưa hợp lệ: ' + m);
          return;
        }
        var list = (res.body && res.body.data || []).map(function (m) { return m.id; }).filter(Boolean);
        if (!list.length) { showKeyResult('❓ Key được nhận nhưng không liệt kê được model nào...'); return; }
        var claude = list.filter(function (id) { return /claude/i.test(id); });
        var chosen = claude[0] || list[0];
        $('set-model').value = chosen;
        var others = list.filter(function (id) { return id !== chosen; }).slice(0, 6).join(', ');
        showKeyResult('✅ Key hợp lệ! Có ' + list.length + ' model'
          + (claude.length ? ' (' + claude.length + ' model Claude)' : '')
          + ' — đã tự điền: ' + chosen
          + (others ? '\nModel khác: ' + others : ''));
      })
      .catch(function (e) {
        showKeyResult('❌ Không kiểm tra được (' + ((e && e.message) || e) + ')'
          + (provider === 'xai247' ? ' — thử chạy lại start.bat (server có proxy XAI247) rồi bấm lại nha!' : ''));
      })
      .then(function () { btn.disabled = false; });
  });

  $('btn-settings').addEventListener('click', openSettings);
  $('btn-close-settings').addEventListener('click', closeSettings);
  $('btn-save-settings').addEventListener('click', saveSettingsFromUI);
  $('set-provider').addEventListener('change', syncProviderUI);
  els.modal.addEventListener('click', function (e) {
    if (e.target === els.modal) closeSettings();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !els.modal.hidden) closeSettings();
  });

  TTS.init(function () {
    if (!els.modal.hidden) fillVoices();
  });

  /* ---------- Bật/tắt giọng đọc ---------- */
  function updateSoundIcon() {
    els.btnSound.textContent = settings.ttsEnabled ? '🔊' : '🔇';
    els.btnSound.title = settings.ttsEnabled ? 'Tắt giọng đọc' : 'Bật giọng đọc (TTS)';
  }

  els.btnSound.addEventListener('click', function () {
    settings.ttsEnabled = !settings.ttsEnabled;
    persistSettings(settings);
    updateSoundIcon();
    if (!settings.ttsEnabled) {
      TTS.stop();
      Live2DStage.setSpeaking(false);
    } else if (!TTS.supported()) {
      toast('😥 Trình duyệt này không hỗ trợ đọc thoại (Web Speech API).');
    } else {
      toast('🔊 Đã bật giọng đọc! ' + settings.waifuName + ' sẽ nói chuyện với senpai nè~');
    }
  });

  /* ---------- Xoá lịch sử ---------- */
  $('btn-clear').addEventListener('click', function () {
    Chat.clear();
    OfflineBrain.reset();
    Array.prototype.forEach.call(els.messages.querySelectorAll('.msg'), function (m) {
      if (m !== els.typing) m.remove();
    });
    toast('🗑️ Đã xoá lịch sử — làm quen lại từ đầu nha senpai~');
  });

  /* ---------- Cánh hoa anh đào ---------- */
  (function () {
    for (var p = 0; p < 14; p++) {
      var el = document.createElement('div');
      el.className = 'petal';
      el.style.left = (Math.random() * 100) + 'vw';
      el.style.animationDuration = (7 + Math.random() * 9) + 's';
      el.style.animationDelay = (-Math.random() * 14) + 's';
      var s = 0.6 + Math.random() * 0.8;
      el.style.width = (12 * s) + 'px';
      el.style.height = (12 * s) + 'px';
      el.style.opacity = String(0.4 + Math.random() * 0.4);
      document.body.appendChild(el);
    }
  })();

  applySettingsUI();

})();
