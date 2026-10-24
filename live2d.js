/* ================================================================
   WAIFU CHATBOT — Sân khấu Live2D
   PixiJS + pixi-live2d-display (Cubism 2):
   - render model Shizuku, mắt theo chuột
   - kéo thả model, click vào đầu/thân để reaction
   - đổi biểu cảm + motion theo cảm xúc chat
   - lip-sync khi TTS đọc (hook beforeModelUpdate)
   ================================================================ */

const Live2DStage = (() => {
  let app = null;
  let model = null;
  let naturalH = 0;
  let mouthActive = false;
  let drag = null;
  let userMoved = false;
  const MOUTH_PARAM = 'PARAM_MOUTH_OPEN_Y';
  const rel = { x: 0.5, y: 0.56 };

  function l2d() {
    return (window.PIXI && window.PIXI.live2d) || window.live2d || null;
  }

  async function init(containerEl) {
    if (!window.PIXI) throw new Error('Chưa nạp được PixiJS (pixi.min.js)');
    const L = l2d();
    if (!L || !L.Live2DModel) throw new Error('Chưa nạp được pixi-live2d-display');

    app = new PIXI.Application({
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    containerEl.appendChild(app.view);

    model = await L.Live2DModel.from(CONFIG.modelUrl, { autoInteract: true });
    app.stage.addChild(model);

    // Cho toàn sân khấu nhận chuột: kéo thả + mắt theo chuột
    // kể cả khi rê ra ngoài model
    app.stage.hitArea = app.screen;
    app.stage.interactive = true;

    layout();
    setupInteractions();
    setupLipSync();

    window.addEventListener('resize', () => { if (model) layout(); });
    return model;
  }

  /* ---------- Bố cục ---------- */

  function availWidth() {
    const w = app.screen.width;
    return w <= 760 ? w : Math.max(w - 400, w * 0.55);
  }

  function layout() {
    if (!model || !app) return;
    if (!naturalH) {
      naturalH = (model.internalModel && model.internalModel.originalHeight)
        || (model.height / (model.scale.y || 1)) || 1000;
    }
    const h = app.screen.height;
    const narrow = app.screen.width <= 760;
    const targetH = narrow ? h * 0.55 : h * 0.98;
    model.scale.set(targetH / naturalH);
    if (model.anchor) model.anchor.set(0.5, 0.5);
    model.x = availWidth() * rel.x;
    model.y = h * (userMoved ? rel.y : (narrow ? 0.3 : 0.56));
  }

  /* ---------- Tương tác ---------- */

  function setupInteractions() {
    // Kéo thả model
    model.on('pointerdown', (e) => {
      if (!e.data) return;
      drag = { dx: e.data.global.x - model.x, dy: e.data.global.y - model.y };
    });

    app.stage.on('pointermove', (e) => {
      if (!e.data || !model) return;
      const p = e.data.global;
      if (drag) {
        model.x = p.x - drag.dx;
        model.y = p.y - drag.dy;
        userMoved = true;
        rel.x = Math.min(1, Math.max(0, model.x / availWidth()));
        rel.y = Math.min(1, Math.max(0, model.y / app.screen.height));
      } else if (typeof model.focus === 'function') {
        try { model.focus(p.x, p.y); } catch (err) { /* ignore */ }
      }
    });

    const endDrag = () => { drag = null; };
    app.stage.on('pointerup', endDrag);
    app.stage.on('pointerupoutside', endDrag);

    // Click vào model -> reaction theo vùng chạm (đầu / miệng / thân)
    model.on('hit', (areas) => {
      const names = (areas || []).map(String);
      const has = (kw) => names.some((nm) => nm.toLowerCase().indexOf(kw) >= 0);
      let groups;
      if (has('head')) groups = ['flick_head', 'shake', 'tap_body', 'idle'];
      else if (has('body') || has('mouth')) groups = ['tap_body', 'pinch_out', 'idle'];
      else groups = ['tap_body', 'pinch_out', 'shake', 'idle'];
      playMotion(groups, 3);
    });
  }

  /* ---------- Motion / biểu cảm ---------- */

  function motionGroups() {
    try { return model.internalModel.settings.motions || {}; } catch (e) { return {}; }
  }

  function playMotion(groups, priority) {
    if (!model) return false;
    const mg = motionGroups();
    for (const g of groups) {
      if (mg[g] && mg[g].length) {
        try { model.motion(g, undefined, priority); return true; } catch (e) { /* thử group kế */ }
      }
    }
    return false;
  }

  function applyEmotion(emotion) {
    if (!model) return;
    try {
      const idx = CONFIG.emotionExpressions[emotion];
      const count = (model.internalModel.settings.expressions || []).length;
      if (idx != null && idx >= 0 && idx < count) model.expression(idx);
    } catch (e) { /* model không có expression này */ }
    const groups = (CONFIG.emotionMotions[emotion]) || ['tap_body', 'idle'];
    if (Math.random() < 0.85) playMotion(groups, 3);
  }

  /* ---------- Lip-sync ---------- */
  // Cắm vào sự kiện "beforeModelUpdate": chạy SAU khi motion/expression áp
  // tham số, TRƯỚC khi coreModel.update() commit & vẽ -> miệng mở khép
  // theo sóng sin mà không bị motion ghi đè lại
  function setupLipSync() {
    try {
      const im = model.internalModel;
      im.on('beforeModelUpdate', () => {
        if (!mouthActive) return;
        const t = performance.now() / 1000;
        const v = 0.42 + 0.36 * Math.sin(t * 10.5) + 0.22 * Math.sin(t * 4.3 + 1.7);
        im.coreModel.setParamFloat(MOUTH_PARAM, Math.max(0.06, Math.min(1, v)));
      });
    } catch (e) { /* model không hỗ trợ -> bỏ lip-sync */ }
  }

  function setSpeaking(on) {
    mouthActive = !!on;
    if (on) playMotion(['tap_body', 'idle'], 3);
  }

  return {
    init: init,
    applyEmotion: applyEmotion,
    setSpeaking: setSpeaking,
    layout: layout,
    getModel: () => model,
  };
})();
