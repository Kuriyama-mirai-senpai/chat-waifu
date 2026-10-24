/* ================================================================
   WAIFU CHATBOT — Bộ não hội thoại
   4 chế độ: Offline / XAI247 (Claude, GPT, Gemini... qua proxy) / OpenAI-compatible / Gemini
   ================================================================ */

const Chat = (() => {
  let history = []; // [{role: 'user'|'assistant', content}]

  function loadHistory() {
    try { history = JSON.parse(localStorage.getItem(CONFIG.historyKey) || '[]') || []; }
    catch (e) { history = []; }
  }
  function saveHistory() {
    try { localStorage.setItem(CONFIG.historyKey, JSON.stringify(history.slice(-40))); } catch (e) { /* đầy thì thôi */ }
  }
  function clear() {
    history = [];
    try { localStorage.removeItem(CONFIG.historyKey); } catch (e) { /* ignore */ }
  }
  function getHistory() { return history; }

  /* ---------- Phân tách cảm xúc ---------- */

  const EMOTION_WORD = 'happy|sad|shy|angry|surprised|neutral';

  function cleanText(t) {
    return String(t || '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **in đậm**
      .replace(/\*([^*\n]+)\*/g, '$1')    // *in nghiêng*
      .replace(/^#+\s*/gm, '')            // # tiêu đề
      .trim();
  }

  // AI được yêu cầu kết thúc bằng tag [cảm xúc] -> tách ra;
  // nếu không có thì đoán bằng từ khoá tiếng Việt
  function parseEmotion(raw) {
    const text = cleanText(raw);
    const m = text.match(new RegExp('\\[(' + EMOTION_WORD + ')\\]\\s*$', 'i'));
    if (m) {
      return {
        text: text.slice(0, m.index).trim(),
        emotion: m[1].toLowerCase(),
      };
    }
    return { text, emotion: guessEmotion(text) };
  }

  function guessEmotion(text) {
    const t = String(text).toLowerCase();
    if (/(haha|hihi|ehehe|hehe|vui|thích|thich|tuyệt|tuyet|yay|❤|💕|♡|✧)/.test(t)) return 'happy';
    if (/(buồn|buon|khóc|khoc|tủi|tui thân|sad)/.test(t)) return 'sad';
    if (/(xấu hổ|xau ho|ngượng|nguong|đỏ mặt|do mat|shy)/.test(t)) return 'shy';
    if (/(giận|gian|tức|tuc|hmph|hờnh|hohn|khó chịu|kho chiu|angry)/.test(t)) return 'angry';
    if (/(hở|ơ|trời ơi|troi oi|thế à|the a|sao lại|sao lai|sốc|soc|\?{2,}|!{2,})/.test(t)) return 'surprised';
    return 'neutral';
  }

  /* ---------- Lấy phản hồi ---------- */

  async function getReply(userText, settings) {
    history.push({ role: 'user', content: userText });

    let raw = null;
    let error = null;
    const useAPI = ['openai', 'gemini', 'xai247'].indexOf(settings.provider) >= 0
      && !!settings.apiKey;

    if (useAPI) {
      try {
        raw = settings.provider === 'gemini'
          ? await callGemini(settings)
          : await callOpenAI(settings);
      } catch (e) {
        error = (e && e.message) ? e.message : String(e);
      }
    }

    if (raw == null) raw = OfflineBrain.reply(userText, settings.waifuName);

    history.push({ role: 'assistant', content: raw });
    saveHistory();

    const out = parseEmotion(raw);
    out.error = error;
    return out;
  }

  /* ---------- Providers ---------- */

  async function fetchJSON(url, options, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 45000);
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (e) { /* body không phải JSON */ }
      if (!res.ok) {
        const msg = (data && data.error && (data.error.message || data.error.status)) || ('HTTP ' + res.status);
        throw new Error(msg);
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function trimHistory(limit) { return history.slice(-limit); }

  async function callOpenAI(s) {
    // XAI247: endpoint tương thích OpenAI nhưng chặn CORS từ trình duyệt
    // → đi qua proxy local của tools/server.py (/api/xai247/* -> https://xai247.xyz/*)
    const baseUrl = (s.provider === 'xai247')
      ? '/api/xai247/v1'
      : String(s.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const data = await fetchJSON(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + s.apiKey,
      },
      body: JSON.stringify({
        model: s.model || 'gpt-4o-mini',
        messages: [{ role: 'system', content: buildSystemPrompt(s) }, ...trimHistory(16)],
        temperature: 0.85,
        // XAI247 (Claude...) trả lời dài, ngọt ngào hơn — cho nhiều token hơn
        max_tokens: (s.provider === 'xai247' ? 700 : 300),
      }),
    });
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      && data.choices[0].message.content;
    if (!content) throw new Error('API trả về rỗng');
    return content;
  }

  async function callGemini(s) {
    const model = encodeURIComponent(s.model || 'gemini-2.0-flash');
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model
      + ':generateContent?key=' + encodeURIComponent(s.apiKey);
    let contents = trimHistory(16).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    // Gemini yêu cầu lịch sử bắt đầu bằng role "user"
    while (contents.length && contents[0].role !== 'user') contents.shift();
    const data = await fetchJSON(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(s) }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
      }),
    });
    const cand = data && data.candidates && data.candidates[0];
    const parts = cand && cand.content && cand.content.parts;
    const text = parts ? parts.map((p) => p.text || '').join('') : '';
    if (!text) throw new Error((cand && cand.blockReason) || 'API trả về rỗng');
    return text;
  }

  return { loadHistory, getHistory, clear, getReply };
})();
