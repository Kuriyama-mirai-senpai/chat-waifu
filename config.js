/* ================================================================
   WAIFU CHATBOT — Cấu hình & cài đặt người dùng
   ================================================================ */

const CONFIG = {
  // Đường dẫn model Live2D (Cubism 2) — đổi nếu muốn dùng model khác
  modelUrl: 'assets/models/shizuku/shizuku.model.json',

  settingsKey: 'waifu-chatbot-settings',
  historyKey: 'waifu-chatbot-history',

  // Map cảm xúc -> index expression trong shizuku.model.json:
  // f01 = mặt mặc định | f02 = buồn/dỗi | f03 = giận | f04 = lấp lánh/mắt sáng
  emotionExpressions: {
    neutral: 0,
    happy: 3,
    shy: 3,
    surprised: 3,
    sad: 1,
    angry: 2,
  },

  // Map cảm xúc -> motion group ưu tiên (nếu model có group đó)
  emotionMotions: {
    happy: ['tap_body', 'idle'],
    shy: ['pinch_out', 'tap_body'],
    surprised: ['pinch_out', 'tap_body'],
    sad: ['pinch_in', 'idle'],
    angry: ['shake', 'tap_body'],
    neutral: ['idle'],
  },
};

const DEFAULT_SETTINGS = {
  // Mặc định: 💜 XAI247 (Claude) — đã gắn sẵn key đăng ký miễn phí.
  // App gọi qua proxy local của tools/server.py (/api/xai247/* -> https://xai247.xyz/*)
  provider: 'xai247',
  baseUrl: '/api/xai247/v1',
  apiKey: 'sk-xai-WHZ59xh4rqWYWyJM7ag-1nXz1H1Lhjjb',
  model: 'claude-fable-5',
  waifuName: 'Shizuku',
  persona: DEFAULT_PERSONA,       // định nghĩa trong persona.js
  ttsEnabled: true,               // bật sẵn giọng đọc (tắt được bằng nút 🔊)
  voiceName: '',                  // trống = tự chọn giọng NỮ ưa thích
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(CONFIG.settingsKey);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const s = JSON.parse(raw);
    // Nâng cấp 1 lần cho máy đã dùng bản cũ (offline, chưa từng nhập key):
    // áp dụng cấu hình XAI247 mặc định, giữ nguyên tên waifu / persona riêng.
    if (s.provider === 'offline' && !s.apiKey && DEFAULT_SETTINGS.provider !== 'offline') {
      s.provider = DEFAULT_SETTINGS.provider;
      s.baseUrl = DEFAULT_SETTINGS.baseUrl;
      s.apiKey = DEFAULT_SETTINGS.apiKey;
      s.model = DEFAULT_SETTINGS.model;
    }
    return Object.assign({}, DEFAULT_SETTINGS, s);
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistSettings(s) {
  try {
    localStorage.setItem(CONFIG.settingsKey, JSON.stringify(s));
  } catch (e) { /* bộ nhớ đầy thì thôi */ }
}
