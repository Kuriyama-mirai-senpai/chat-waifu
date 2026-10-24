# 🌸 Waifu Chatbot — Live2D Shizuku

Web app chat với "waifu" Live2D viết **thuần HTML/CSS/JavaScript** — không cần Node, không cần build tool, chạy local bằng Python server.

✨ **Tính năng**

- 💃 Nhân vật **Shizuku** (Live2D Cubism 2) render bằng **PixiJS 6 + pixi-live2d-display 0.4** — tài nguyên tải sẵn về máy, chạy offline hoàn toàn
- 👀 Mắt & đầu theo chuột, **kéo thả** model đi đâu cũng được
- 🖱️ Click vào **đầu / thân** để waifu reaction (motion + âm thanh "ừm ừm" dễ thương)
- 💬 Chat panel kiểu nhắn tin, hiệu ứng đang gõ, lưu lịch sử (localStorage)
- 🧠 4 chế độ "não" AI:
  - 🌸 **Offline** — rule-based tiếng Việt, không cần API key, vẫn có cảm xúc biểu cảm
  - 💜 **XAI247** — Claude / GPT / Gemini qua 1 key (dùng thử miễn phí — khuyên dùng)
  - 🤖 **OpenAI / API tương thích** — OpenAI, Ollama (chạy local), Groq, OpenRouter, vLLM...
  - ✨ **Google Gemini** — API key miễn phí từ Google AI Studio
- 🎭 AI trả lời kèm **tag cảm xúc** → tự đổi biểu cảm + motion (vui / dỗi / buồn / giận / ngạc nhiên)
- 🔊 **Đọc thoại tiếng Việt** bằng Web Speech API + **lip-sync** miệng khép mở theo lời nói
- ⚙️ Sửa được **tên + tính cách (persona)** waifu ngay trong phần Cài đặt
- 🌸 Cánh hoa anh đào bay lơ lửng cả màn hình ~

---

## 🚀 Chạy project

Yêu cầu duy nhất: **Python 3** có trên PATH.

**Cách 1 — chạy file bat (Windows):** double-click

```bat
start.bat
```

**Cách 2 — chạy tay:**

```bash
cd B:\waifu
python tools\server.py 8000
# rồi mở http://localhost:8000
# (python -m http.server vẫn chạy được — nhưng sẽ thiếu proxy cho XAI247)
```

> ⚠️ Live2D **bắt buộc** chạy qua HTTP — không mở trực tiếp `index.html` bằng `file://` (WebGL sẽ không nạp được tài nguyên model).

## 📁 Cấu trúc thư mục

```
B:\waifu\
├─ index.html                  # Trang chính
├─ start.bat                   # Chạy server + mở trình duyệt (Windows)
├─ css\
│  └─ style.css                # Giao diện theme sakura
├─ js\
│  ├─ config.js                # Cấu hình + cài đặt (localStorage)
│  ├─ persona.js               # Persona mặc định + bộ não offline
│  ├─ tts.js                   # Đọc thoại Web Speech API
│  ├─ live2d.js                # Sân khấu PixiJS + Live2D + lip-sync
│  ├─ chat.js                  # Bộ não chat (Offline / OpenAI / Gemini)
│  └─ app.js                   # Logic UI chính
├─ assets\
│  ├─ vendor\                  # pixi.min.js + pixi-live2d-display.min.js
│  └─ models\shizuku\           # Model Live2D (moc, texture, motion, sound...)
└─ tools\
   └─ download_sounds.py       # Tải lại âm thanh reaction (tuỳ chọn)
```

---

## 🧠 Cấu hình chế độ AI

Mở **⚙️ Cài đặt** (nút bánh răng góc phải trên) rồi chọn "Chế độ trả lời".

### 🌸 Offline (mặc định)
Không cần gì cả. Waifu trả lời bằng ~22 bộ luật nhận dạng tiếng Việt (bỏ dấu để khớp mềm): chào hỏi, hỏi tên, tỏ tình, khen, an ủi, ăn uống, tạm biệt, hỏi giờ, anime, học hành/code, tâm sự buồn... Ngoài ra waifu **học tên bạn** — nhắn thử: `tôi tên là Hoà`.

### 💜 XAI247 (Claude / GPT / Gemini) — khuyên dùng

Một key duy nhất cho **Claude, GPT, Gemini** qua endpoint tương thích OpenAI. Tài khoản mới được **dùng thử miễn phí** (model miễn phí, giới hạn token mỗi ngày, không cần nạp tiền).

> ✅ **Đã cấu hình sẵn**: app mặc định chạy XAI247 với key + model `claude-fable-5` gắn trong `js/config.js` — chỉ cần `start.bat` là chat được ngay, không cần nhập gì cả. Muốn đổi key/model: ⚙️ Cài đặt → 💜 XAI247 → 🔎 Kiểm tra → 💾 Lưu.

1. Đăng ký key tại: <https://xai247.xyz/auth/register>
2. Mở ⚙️ Cài đặt → Chế độ trả lời → chọn **💜 XAI247**
3. Dán API key vào, bấm **🔎 Kiểm tra** — app kiểm tra key và **tự điền tên model** (ưu tiên model Claude)
4. Bấm **💾 Lưu** rồi chat — waifu trả lời dài, ngọt ngào hơn hẳn nè~

> 🔧 **Lưu ý kỹ thuật**: XAI247 chặn gọi thẳng từ trình duyệt (CORS) nên `start.bat` giờ chạy `tools/server.py` — server kèm proxy `/api/xai247/*` → `https://xai247.xyz/*`. Nếu chạy tay bằng `python -m http.server` thì chế độ XAI247 không gọi được API — dùng `python tools\server.py 8000` thay thế nha. Lỗi API/key sai thì app vẫn **tự fallback về Offline** nên chat không đứng máy.

### 🤖 OpenAI / API tương thích

| Nhà cung cấp | Base URL | Model ví dụ |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini`, `gpt-4o` |
| Ollama (chạy local, miễn phí) | `http://localhost:11434/v1` | `llama3.1`, `qwen2.5:7b` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenRouter | `https://openrouter.ai/api/v1` | tuỳ catalog |

API key: lấy từ trang nhà cung cấp (Ollama điền `ollama` là được).

### ✨ Google Gemini
- API key **miễn phí** tại Google AI Studio: <https://aistudio.google.com/apikey>
- Model ví dụ: `gemini-2.0-flash`, `gemini-1.5-flash`

> ⚠️ **Bảo mật**: API key chỉ lưu trong `localStorage` của trình duyệt trên máy bạn — đừng dùng máy công cộng. Nếu API lỗi/key sai, app **tự fallback về chế độ Offline** nên chat không bao giờ đứng máy.

---

## 🔊 Bật giọng đọc (TTS)

1. Bấm nút **🔇 → 🔊** trên thanh cùng, hoặc bật trong Cài đặt (mặc định đang **bật sẵn**)
2. App **tự chọn giọng NỮ** (ưu tiên giọng 🇻🇳 vi-VN nữ như Hoài My / An, né giọng nam như David / Nam Minh; nếu máy chưa có giọng Việt thì tạm dùng giọng nữ tiếng Anh như Zira):
   - *Windows*: muốn nghe chuẩn tiếng Việt — Settings → Time & Language → Language → Vietnamese → Options → thêm Speech, hoặc Settings → Speech → Manage voices → Add voices → Vietnamese
   - *Edge* thường có sẵn giọng vi-VN online (Microsoft An)
3. Mỗi câu trả lời được **đọc thành tiếng** kèm **miệng khép mở** (lip-sync qua `beforeModelUpdate` hook)

Ghi chú: TTS hoạt động tốt nhất trên Chrome/Edge. Giọng vi-VN online của Microsoft cần mạng; giọng offline cài local thì không cần.

## 🎭 Cảm xúc & biểu cảm hoạt động thế nào

- AI được hệ thống yêu cầu (qua system prompt) kết thúc câu trả lời bằng đúng 1 tag `[happy]` `[shy]` `[sad]` `[angry]` `[surprised]` `[neutral]`
- App tách tag ra khỏi văn bản, rồi map sang **expression** (f01–f04) + **motion group** của Shizuku:
  - `happy`/`shy`/`surprised` → f04 (mắt lấp lánh, má hồng) + tap_body
  - `sad` → f02 (mặt ủ rũ) + pinch_in
  - `angry` → f03 (lông mày nheo) + shake
- Chế độ Offline cũng tự sinh tag sẵn trong mỗi câu

## 🎨 Đổi model Live2D khác

1. Tải model Cubism 2 (vd kho: <https://github.com/xiazeyu/live2d-widget-models>) vào `assets/models/<tên>/`
2. Sửa `CONFIG.modelUrl` trong `js/config.js`
3. Chỉnh `CONFIG.emotionExpressions` / `CONFIG.emotionMotions` theo motion group mà model đó có

## 🛠️ Xử lý sự cố nhanh

| Triệu chứng | Nguyên nhân & cách xử lý |
|---|---|
| Màn hình trống, không thấy waifu | Chạy qua `http://localhost:8000` chứ **không** phải mở file `index.html` trực tiếp (`file://`) |
| Không render + góc trái dưới có chữ đỏ | Đó là lỗi JS đã bị bắt — đọc thử nội dung để biết thiếu file nào |
| `PIXI.live2d is undefined` | File `assets/vendor/pixi-live2d-display.min.js` thiếu/hỏng — tải lại từ CDN |
| Không nghe TTS | Thử Chrome/Edge; kiểm tra đã cài giọng tiếng Việt; có trình duyệt cần click vào trang 1 lần trước khi cho phát âm |
| API báo 401/403 | Sai API key — toast sẽ hiện thông báo lỗi gốc |
| Motion không kêu tiếng | Chạy `python tools/download_sounds.py` để tải lại mp3 |
| Bấm 🔎 kiểm tra key XAI247 báo lỗi | Chạy lại `start.bat` (hoặc `python tools\server.py 8000`) — cần server proxy local cho XAI247 |
| Đổi model khác không animate | Motion group khác tên — chỉnh lại map trong `js/config.js` |

## 📜 Giấy phép & nguồn

- Code của project: **MIT** — cứ vọc thoải mái.
- **Model Shizuku**: © Live2D Inc. — phát hành theo **Free Material License** (dùng cá nhân/nhỏ miễn phí; đọc điều khoản tại <https://www.live2d.com/eula/live2d-sample-model-terms.html> trước khi dùng thương mại).
- [PixiJS](https://github.com/pixijs/pixijs) (MIT) · [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display) (MIT) · texture/sound gốc từ repo demo của pixi-live2d-display.

