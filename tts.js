/* ================================================================
   WAIFU CHATBOT — Đọc thoại (Web Speech API)
   Tìm giọng tiếng Việt nếu có, pitch cao cho "giọng waifu"
   ================================================================ */

const TTS = (() => {
  let voices = [];

  function supported() {
    return typeof window.speechSynthesis !== 'undefined' &&
           typeof window.SpeechSynthesisUtterance !== 'undefined';
  }

  function refreshVoices() {
    if (!supported()) return;
    try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; }
  }

  // Trình duyệt (đặc biệt Chrome) nạp danh sách giọng không đồng bộ
  function init(onChange) {
    if (!supported()) return;
    refreshVoices();
    try {
      window.speechSynthesis.onvoiceschanged = function () {
        refreshVoices();
        if (onChange) onChange(voices);
      };
    } catch (e) { /* ignore */ }
    let tries = 0;
    const timer = setInterval(() => {
      refreshVoices();
      if (voices.length || ++tries > 12) clearInterval(timer);
      if (voices.length && onChange) onChange(voices);
    }, 400);
  }

  /* ---------- Chọn giọng NỮ ----------
     Web Speech API không cho biết giới tính giọng, nên phải chấm điểm
     theo tên giọng: ưu tiên giọng Việt nữ (Hoài My, Mai, An...),
     né các giọng nam (David, Nam Minh...), dự phòng giọng nữ tiếng Anh
     (Zira, Aria, Jenny...) cho máy chưa cài giọng tiếng Việt. */
  function voiceScore(v) {
    const name = String((v && v.name) || '').toLowerCase();
    const lang = String((v && v.lang) || '').toLowerCase();
    const vi = lang.indexOf('vi') === 0;
    // Tên giọng nữ hay gặp (Việt + giọng nữ tiếng Anh của Windows/Edge)
    const female = /ho[àa][ìi]?|hoamy|mai|linh|hong|hồng|my\b|female|nữ|zira|susan|hazel|aria|jenny|michelle|samantha|victoria|karen|moira|tessa|fiona|serena|am[ée]lie|anna|petra|an\b/.test(name);
    // Tên giọng nam hay gặp
    const male = /nam\s*minh|namminh|nam\b|minh\b|david|mark|guy|male|daniel|george|james|ryan|liam|paul|tom\b|junior|brandon|christopher|eric\b/.test(name);
    let s = 0;
    if (vi) s += 60;                       // ưu tiên giọng tiếng Việt
    if (female) s += 50;                   // ưu tiên giọng nữ
    if (male) s -= 80;                     // né giọng nam
    if (!vi && female && !male) s += 5;    // nữ tiếng Anh = dự phòng
    if (v && v.default) s += 2;
    return s;
  }

  function pickVoice() {
    if (!voices.length) return null;
    let best = null;
    let bestScore = -Infinity;
    voices.forEach((v) => {
      const s = voiceScore(v);
      if (s > bestScore) { bestScore = s; best = v; }
    });
    return best || voices[0];
  }

  function speak(text, settings, cbs) {
    const onstart = cbs && cbs.onstart;
    const onend = cbs && cbs.onend;
    if (!supported() || !settings || !settings.ttsEnabled || !text) {
      if (onend) onend();
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      // Dùng giọng người dùng chọn trong Cài đặt; nhưng nếu giọng đó là
      // giọng NAM (chọn nhầm / dữ liệu cũ) thì tự đổi sang giọng nữ ưa thích
      let v = (settings.voiceName && voices.find((x) => x.name === settings.voiceName)) || null;
      if (!v || voiceScore(v) < 0) v = pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'vi-VN'; }
      u.rate = 1.0;    // chậm xíu cho dịu dàng, ngọt ngào hơn
      u.pitch = 1.4;   // cao giọng "waifu" dễ thương hơn nữa
      u.volume = 1;
      if (onstart) u.onstart = () => onstart();
      u.onend = () => { if (onend) onend(); };
      u.onerror = () => { if (onend) onend(); };
      window.speechSynthesis.speak(u);
      // Safari đôi khi không kích onstart — coi như đã bắt đầu
      if (onstart) setTimeout(onstart, 100);
      return true;
    } catch (e) {
      if (onend) onend();
      return false;
    }
  }

  function stop() {
    if (!supported()) return;
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }

  return { supported, init, speak, stop, getVoices: () => voices, pickVoice, voiceScore };
})();
