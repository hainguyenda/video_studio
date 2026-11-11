// Video Studio by Kai - tab "Tao anh AI": go prompt -> AI ve anh (Pollinations, mien phi) -> chen chu thumbnail -> tai PNG/JPG.
(() => {
  const $ = s => document.querySelector(s);
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("kaiai." + k); return v == null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("kaiai." + k, v); } catch {} },
  };

  const ACCENTS = [
    ["teal", "Xanh ngọc (như ảnh mẫu)", "#19f2cf", "glowing teal cyan"],
    ["red", "Đỏ", "#ff3b3b", "glowing red"],
    ["pink", "Hồng", "#ff4fa0", "glowing hot pink"],
    ["amber", "Vàng cam", "#ffb03b", "glowing amber orange"],
    ["purple", "Tím", "#a66bff", "glowing purple"],
    ["lime", "Xanh lá", "#9dff3b", "glowing lime green"],
  ];

  const STYLES = [
    ["mau", "Như ảnh mẫu: hoạt hình tối, đầu tròn, bóng đen cám dỗ", a =>
      `2D cartoon illustration, YouTube thumbnail style, thick clean black outlines, flat cel shading, very dark navy background with soft vignette, ` +
      `main character: cute bald round head with smooth cream skin, no hair, big round white eyes with small black pupils and tired dark eye bags, simple small mouth, gray hoodie, ` +
      `${a} rim light and screen glow on the character, behind him a dark black shadow demon silhouette with wispy smoky edges and ${a} glowing evil eyes and wide grin, ` +
      `high contrast, centered composition, empty space at the top for a title, no text, no letters, no watermark`],
    ["sang", "Hoạt hình sáng, dễ thương (như ảnh con mèo)", a =>
      `cute anime cartoon illustration, clean lineart, warm pastel sunset sky with soft clouds and sun rays, glowing sparkles, vibrant soft colors, ` +
      `empty space on one side for a title, no text, no letters, no watermark`],
    ["that", "Ảnh như thật (chụp điện ảnh)", a =>
      `photorealistic, cinematic lighting, shallow depth of field, 35mm film photo, highly detailed, dramatic ${a} accent light, no text, no watermark`],
    ["3d", "3D kiểu phim hoạt hình", a =>
      `3D animated movie still, soft global illumination, cute stylized character, expressive face, ${a} rim light, high detail, no text, no watermark`],
    ["none", "Không thêm phong cách (dùng đúng prompt của tôi)", () => ""],
  ];

  const SIZES = [
    ["Thumbnail YouTube 1280×720", 1280, 720],
    ["Thumbnail YouTube HD 1920×1080", 1920, 1080],
    ["Ảnh dọc Shorts 1080×1920", 1080, 1920],
    ["Avatar vuông 800×800", 800, 800],
    ["Ảnh vuông 1080×1080", 1080, 1080],
    ["Banner kênh YouTube 2560×1440", 2560, 1440],
  ];

  const MODELS = [["flux", "Flux (đẹp, mặc định)"], ["turbo", "Turbo (nhanh hơn)"]];

  const SAMPLE = {
    prompt: "a scared, sleepy young man in a gray hoodie holding a game controller at night, his face lit by the screen, a shadow demon behind him with a clawed hand on his shoulder, a basketball on the floor in the corner",
    title: "ONE MORE GAME.",
    accentWords: "GAME.",
  };

  const opt = (arr, f) => arr.map(f).join("");

  // ---------- giao dien ----------
  const left = `
<section class="card ai"><h2>2. Mô tả ảnh bạn muốn</h2>
<p class="note">Gõ mô tả ảnh (tiếng Anh cho kết quả chuẩn nhất; tiếng Việt cũng được nếu bật "Để AI viết lại prompt"). App tự thêm phong cách bên dưới, rồi AI vẽ ảnh miễn phí. Ảnh AI vẽ <b>không có chữ</b>, chữ thumbnail do app chèn ở bước 3 nên luôn sắc nét, đúng chính tả.</p>
<div class="row"><button type="button" id="aiSample">🖼️ Dùng mẫu "One more game"</button><button type="button" id="aiCopyHelp">📋 Chép prompt nhờ AI viết mô tả</button></div>
<textarea id="aiPrompt" spellcheck="false" style="min-height:110px" placeholder="vd: a lonely boy sitting on his bed scrolling his phone at 3am, shadow demon whispering behind him"></textarea>
<div class="grid"><label>Phong cách<select id="aiStyle">${opt(STYLES, s => `<option value="${s[0]}">${s[1]}</option>`)}</select></label>
<label>Mô hình AI<select id="aiModel">${opt(MODELS, m => `<option value="${m[0]}">${m[1]}</option>`)}</select></label></div>
<label class="chk"><input type="checkbox" id="aiEnhance"> Để AI viết lại prompt cho đẹp hơn (nên bật khi gõ tiếng Việt)</label>
<div class="row"><button class="p big" id="aiGo">✨ Tạo ảnh</button><button id="aiMore" disabled>🔁 Tạo thêm 1 bản khác</button><span id="aiWait" class="s"></span></div>
<details class="sub"><summary>Ảnh mẫu</summary><div style="margin-top:8px"><img src="assets/ai-mau.jpg" alt="Ảnh mẫu" style="width:100%;border-radius:8px;border:1px solid var(--line)"><p class="note">Phong cách "Như ảnh mẫu" được viết theo ảnh này: nền tối, nhân vật đầu tròn mặc hoodie, bóng đen cám dỗ phát sáng, chữ trắng viền đen có 1 từ màu nhấn.</p></div></details>
<details class="sub"><summary>Khoá miễn phí (không bắt buộc)</summary><div style="display:grid;gap:8px;margin-top:8px">
<p class="note">Không có khoá vẫn tạo được ảnh, nhưng phải chờ giữa các lần tạo và đôi khi ảnh có logo nhỏ. Tạo tài khoản miễn phí ở <a href="https://enter.pollinations.ai" target="_blank" rel="noopener" style="color:var(--acc)">enter.pollinations.ai</a>, tạo khoá loại <b>Publishable (pk_)</b>, dán vào đây. Khoá chỉ lưu trên trình duyệt của bạn.</p>
<input type="text" id="aiKey" placeholder="pk_..." autocomplete="off"></div></details>
</section>
<section class="card ai"><h2>3. Kích thước ảnh</h2>
<p class="note">Chọn kích thước trước khi bấm Tạo ảnh để AI vẽ đúng khung (ngang, dọc hay vuông).</p>
<div class="grid"><label style="grid-column:span 2">Kích thước nhanh<select id="aiSizeSel">${opt(SIZES, (s, i) => `<option value="${i}">${s[0]}</option>`)}<option value="custom">Tự nhập kích thước...</option></select></label>
<label class="aiCus">Rộng (px)<input type="text" id="aiW" inputmode="numeric" value="1280"></label>
<label class="aiCus">Cao (px)<input type="text" id="aiH" inputmode="numeric" value="720"></label></div>
</section>
<section class="card ai"><h2>4. Chữ trên ảnh</h2>
<div class="grid"><label style="grid-column:1/-1">Chữ (xuống dòng để tách dòng; để trống nếu không cần chữ)<textarea id="aiTitle" spellcheck="false" style="min-height:60px;font:600 15px/1.4 system-ui"></textarea></label>
<label>Từ tô màu nhấn (cách nhau dấu phẩy)<input type="text" id="aiAccWords"></label>
<label>Màu nhấn<select id="aiAccent">${opt(ACCENTS, a => `<option value="${a[0]}">${a[1]}</option>`)}</select></label>
<label>Vị trí chữ<select id="aiPos"><option value="top">Trên</option><option value="center">Giữa</option><option value="bottom">Dưới</option></select></label>
<label>Phông chữ<select id="aiFont"><option value="baloo">Tròn đậm (như mẫu)</option><option value="lucky">Hoạt hình</option><option value="viet">Gọn (có dấu tiếng Việt)</option></select></label>
<label>Cỡ chữ<input type="range" id="aiSize" min="50" max="130" value="100"></label>
<label>Căn chữ<select id="aiAlign"><option value="center">Giữa</option><option value="left">Trái</option></select></label></div>
<label class="chk"><input type="checkbox" id="aiGlow" checked> Từ màu nhấn phát sáng</label>
</section>`;

  const right = `
<div class="col side ai">
<section class="card"><h2>5. Xem trước &amp; tải ảnh</h2>
<div id="aiSizeNow" class="s"></div>
<div class="stage"><canvas id="aiC" width="1280" height="720"></canvas></div>
<div id="aiMsg" class="s" style="min-height:20px"></div>
<div id="aiGal" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px"></div>
<div class="row"><button id="aiPng" class="p">⬇ Tải ảnh PNG</button><button id="aiJpg">⬇ Tải ảnh JPG</button></div>
<p class="note">Ảnh do AI miễn phí của Pollinations vẽ. Mỗi lần tạo ra một ảnh khác nhau; bấm vào ảnh nhỏ bên trên để chọn lại ảnh cũ.</p>
</section></div>`;

  function mount() {
    const tabs = $("#tabs");
    if (!tabs) return;
    const tabCard = tabs.closest("section");
    tabCard.id = "tabcard";
    const btn = document.createElement("button");
    btn.id = "tai";
    btn.innerHTML = '<span class="ic">✨</span><span>Tạo ảnh AI<small>Gõ prompt là ra ảnh, miễn phí</small></span>';
    tabs.appendChild(btn);

    const col = tabCard.parentElement;
    tabCard.insertAdjacentHTML("afterend", left);
    col.parentElement.insertAdjacentHTML("beforeend", right);

    const others = [...tabs.querySelectorAll("button")].filter(b => b !== btn);
    btn.addEventListener("click", () => {
      document.body.classList.add("m-ai");
      others.forEach(b => (b.className = ""));
      btn.className = "p";
      LS.set("tab", "1");
      draw();
    });
    others.forEach(b => b.addEventListener("click", () => {
      document.body.classList.remove("m-ai");
      btn.className = "";
      LS.set("tab", "0");
    }));

    init();
    if (LS.get("tab", "0") === "1") setTimeout(() => btn.click(), 60);
  }

  // ---------- trang thai ----------
  const gallery = []; // {url, img, prompt}
  let cur = -1, busy = false, lastAt = 0;

  function fields() {
    return ["aiW", "aiH", "aiPrompt", "aiStyle", "aiModel", "aiTitle", "aiAccWords", "aiAccent", "aiPos", "aiFont", "aiSize", "aiAlign", "aiSizeSel", "aiKey"];
  }

  function init() {
    // khoi phuc lua chon
    for (const id of fields()) {
      const el = $("#" + id), v = LS.get(id, null);
      if (v != null) el.value = v;
    }
    for (const id of ["aiEnhance", "aiGlow"]) {
      const v = LS.get(id, null);
      if (v != null) $("#" + id).checked = v === "1";
    }
    if (LS.get("aiPrompt", null) == null) applySample(false);

    const save = () => {
      for (const id of fields()) LS.set(id, $("#" + id).value);
      LS.set("aiEnhance", $("#aiEnhance").checked ? "1" : "0");
      LS.set("aiGlow", $("#aiGlow").checked ? "1" : "0");
    };
    for (const id of [...fields(), "aiEnhance", "aiGlow"]) {
      const el = $("#" + id);
      el.addEventListener("input", () => { save(); draw(); });
      el.addEventListener("change", () => { save(); draw(); });
    }

    $("#aiSample").onclick = () => { applySample(true); save(); draw(); };
    $("#aiGo").onclick = () => generate();
    $("#aiMore").onclick = () => generate();
    $("#aiPng").onclick = () => download("png");
    $("#aiJpg").onclick = () => download("jpg");
    $("#aiCopyHelp").onclick = copyHelp;

    // ve lai khi phong chu tai xong
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    draw();
  }

  function applySample(showImage) {
    $("#aiPrompt").value = SAMPLE.prompt;
    $("#aiTitle").value = SAMPLE.title;
    $("#aiAccWords").value = SAMPLE.accentWords;
    $("#aiStyle").value = "mau";
    $("#aiAccent").value = "teal";
    $("#aiPos").value = "top";
    $("#aiFont").value = "baloo";
    if (showImage) {
      const img = new Image();
      img.onload = () => { addToGallery(img, "assets/ai-mau.jpg", "ảnh mẫu (đã có sẵn chữ)", true); msg("Đã điền mẫu. Đây là ảnh mẫu của bạn; bấm ✨ Tạo ảnh để AI vẽ bản mới."); };
      img.src = "assets/ai-mau.jpg";
    }
  }

  const accent = () => ACCENTS.find(a => a[0] === $("#aiAccent").value) || ACCENTS[0];
  const outSize = () => {
    const v = $("#aiSizeSel").value;
    if (v === "custom") {
      const n = id => Math.max(64, Math.min(4096, Math.round(+$(id).value) || 0));
      return ["custom", n("#aiW"), n("#aiH")];
    }
    return SIZES[+v] || SIZES[0];
  };

  function fullPrompt() {
    const p = $("#aiPrompt").value.trim();
    const st = STYLES.find(s => s[0] === $("#aiStyle").value) || STYLES[0];
    const extra = st[2](accent()[3]);
    return extra ? `${p}. ${extra}` : p;
  }

  function msg(t, bad) {
    const el = $("#aiMsg");
    el.textContent = t || "";
    el.style.color = bad ? "var(--bad)" : "";
  }

  // ---------- goi AI ----------
  async function generate() {
    if (busy) return;
    const p = $("#aiPrompt").value.trim();
    if (!p) { msg("Hãy gõ mô tả ảnh trước.", true); $("#aiPrompt").focus(); return; }
    const key = $("#aiKey").value.trim();
    // khong co khoa: Pollinations gioi han khoang 1 anh / 15 giay
    const gap = key ? 0 : 16000 - (Date.now() - lastAt);
    busy = true;
    $("#aiGo").disabled = $("#aiMore").disabled = true;
    try {
      if (gap > 0) await countdown(gap, "Chờ giới hạn miễn phí");
      const [, W, H] = outSize();
      // AI ve o canh dai toi da 1280, app phong len kich thuoc xuat
      const k = Math.min(1, 1280 / Math.max(W, H));
      const w = Math.round(W * k / 16) * 16, h = Math.round(H * k / 16) * 16;
      const seed = Math.floor(Math.random() * 1e9);
      const params = new URLSearchParams({ width: w, height: h, seed, model: $("#aiModel").value, nologo: "true", private: "true" });
      if ($("#aiEnhance").checked) params.set("enhance", "true");
      const enc = encodeURIComponent(fullPrompt());
      const urls = [];
      if (key) { params.set("key", key); urls.push(`https://gen.pollinations.ai/image/${enc}?${params}`); params.delete("key"); }
      params.set("referrer", "videostudio-kai");
      urls.push(`https://image.pollinations.ai/prompt/${enc}?${params}`);

      const t0 = Date.now();
      const tick = setInterval(() => { $("#aiWait").textContent = `AI đang vẽ... ${Math.round((Date.now() - t0) / 1000)} giây`; }, 500);
      let img = null, lastErr = "";
      try {
        for (const u of urls) {
          try { img = await fetchImage(u); break; } catch (e) { lastErr = e.message || String(e); }
        }
      } finally { clearInterval(tick); $("#aiWait").textContent = ""; lastAt = Date.now(); }
      if (!img) throw new Error(lastErr);
      addToGallery(img.img, img.url, p);
      msg(`Xong sau ${Math.round((Date.now() - t0) / 1000)} giây. Không ưng thì bấm "Tạo thêm 1 bản khác".`);
    } catch (e) {
      const m = String(e.message || e);
      if (/429|rate|limit|queue/i.test(m)) msg("Máy chủ miễn phí đang bận hoặc bạn tạo quá nhanh. Chờ khoảng 30 giây rồi thử lại, hoặc thêm khoá miễn phí ở mục \"Khoá miễn phí\".", true);
      else if (/401|402|403|key|auth|pollen/i.test(m)) msg("Khoá không dùng được hoặc hết lượt miễn phí trong giờ này. Xoá khoá để dùng chế độ không cần khoá, hoặc thử lại sau.", true);
      else if (/abort|timeout/i.test(m)) msg("AI vẽ quá lâu (hơn 2 phút). Hãy thử lại, hoặc chọn mô hình Turbo.", true);
      else msg("Không tạo được ảnh: " + m + ". Kiểm tra mạng rồi thử lại.", true);
    } finally {
      busy = false;
      $("#aiGo").disabled = false;
      $("#aiMore").disabled = !gallery.length;
    }
  }

  async function fetchImage(url) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(new Error("timeout")), 120000);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) {
        let t = ""; try { t = (await r.text()).slice(0, 160); } catch {}
        throw new Error(`HTTP ${r.status} ${t}`);
      }
      const blob = await r.blob();
      if (!/^image\//.test(blob.type)) throw new Error("máy chủ không trả về ảnh");
      const obj = URL.createObjectURL(blob);
      const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("ảnh lỗi")); i.src = obj; });
      return { img, url: obj };
    } finally { clearTimeout(to); }
  }

  function countdown(ms, label) {
    return new Promise(ok => {
      const end = Date.now() + ms;
      const f = () => {
        const s = Math.ceil((end - Date.now()) / 1000);
        if (s <= 0) { $("#aiWait").textContent = ""; ok(); return; }
        $("#aiWait").textContent = `${label}: ${s} giây...`;
        setTimeout(f, 250);
      };
      f();
    });
  }

  function addToGallery(img, url, prompt, hasText) {
    gallery.unshift({ img, url, prompt, hasText });
    if (gallery.length > 16) gallery.pop();
    cur = 0;
    renderGallery();
    draw();
  }

  function renderGallery() {
    const g = $("#aiGal");
    g.innerHTML = "";
    gallery.forEach((it, i) => {
      const t = document.createElement("img");
      t.src = it.url; t.title = it.prompt;
      t.style.cssText = `width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid ${i === cur ? "var(--acc)" : "transparent"}`;
      t.onclick = () => { cur = i; renderGallery(); draw(); };
      g.appendChild(t);
    });
    $("#aiMore").disabled = busy || !gallery.length;
  }

  // ---------- ve anh + chu ----------
  const FONTS = {
    baloo: '800 {s}px "Baloo 2", "Luckiest Guy", system-ui, sans-serif',
    lucky: '400 {s}px "Luckiest Guy", "Baloo 2", system-ui, sans-serif',
    viet: '700 {s}px "Be Vietnam Pro", system-ui, sans-serif',
  };

  function render(cv, W, H) {
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    g.fillStyle = "#0d1418"; g.fillRect(0, 0, W, H);
    const it = gallery[cur];
    if (it) {
      // phu kin khung (cat bot neu khac ti le)
      const iw = it.img.naturalWidth, ih = it.img.naturalHeight, k = Math.max(W / iw, H / ih);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
      g.drawImage(it.img, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
    } else {
      const gr = g.createRadialGradient(W / 2, H * .6, 0, W / 2, H * .6, Math.max(W, H) * .7);
      gr.addColorStop(0, "#16333a"); gr.addColorStop(1, "#0b0f14");
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = "#6f8790"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `600 ${Math.round(Math.min(W, H) * .045)}px "Be Vietnam Pro", system-ui`;
      g.fillText("Gõ mô tả rồi bấm ✨ Tạo ảnh", W / 2, H * .62);
    }
    if (!(it && it.hasText)) drawTitle(g, W, H);
  }

  function drawTitle(g, W, H) {
    const raw = $("#aiTitle").value.replace(/\r/g, "").trim();
    if (!raw) return;
    const lines = raw.split("\n").map(s => s.trim()).filter(Boolean);
    const accSet = new Set($("#aiAccWords").value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean));
    const [, , col] = accent();
    const fontKey = $("#aiFont").value;
    const font = s => (FONTS[fontKey] || FONTS.baloo).replace("{s}", s);
    const upper = fontKey !== "viet";
    const words = lines.map(l => l.split(/\s+/).map(w => (upper ? w.toUpperCase() : w)));
    const isAcc = w => accSet.has(w.toUpperCase()) || accSet.has(w.toUpperCase().replace(/[.,!?]+$/, ""));

    // co chu tu dong vua khung
    const base = Math.min(W, H * 1.6) * 0.105 * (+$("#aiSize").value / 100);
    const maxW = W * 0.9;
    let s = base;
    const lineW = (ws, sz) => { g.font = font(sz); const sp = g.measureText(" ").width; return ws.reduce((a, w) => a + g.measureText(w).width, 0) + sp * (ws.length - 1); };
    for (const ws of words) { const lw = lineW(ws, s); if (lw > maxW) s = s * maxW / lw; }
    s = Math.max(12, Math.floor(s));
    const lh = s * 1.02;
    const total = lh * words.length;
    const pos = $("#aiPos").value;
    let y0 = pos === "top" ? H * 0.05 : pos === "bottom" ? H * 0.95 - total : (H - total) / 2;
    const align = $("#aiAlign").value;
    const stroke = Math.max(4, s * 0.17);
    const glow = $("#aiGlow").checked;

    g.save();
    g.textBaseline = "top"; g.textAlign = "left"; g.lineJoin = "round"; g.miterLimit = 2;
    words.forEach((ws, li) => {
      g.font = font(s);
      const sp = g.measureText(" ").width;
      const lw = lineW(ws, s);
      let x = align === "left" ? W * 0.05 : (W - lw) / 2;
      const y = y0 + li * lh + s * 0.08;
      for (const w of ws) {
        const acc = isAcc(w);
        const ww = g.measureText(w).width;
        // bong do
        g.save();
        g.shadowColor = "rgba(0,0,0,.65)"; g.shadowBlur = s * 0.12; g.shadowOffsetY = s * 0.07;
        g.lineWidth = stroke * 2; g.strokeStyle = "#000"; g.strokeText(w, x, y);
        g.restore();
        // vien den day
        g.lineWidth = stroke * 2; g.strokeStyle = "#000"; g.strokeText(w, x, y);
        // phat sang
        if (acc && glow) {
          g.save(); g.shadowColor = col; g.shadowBlur = s * 0.45;
          g.fillStyle = col; g.fillText(w, x, y); g.fillText(w, x, y);
          g.restore();
        }
        g.fillStyle = acc ? col : "#ffffff";
        g.fillText(w, x, y);
        x += ww + sp;
      }
    });
    g.restore();
  }

  function draw() {
    if (!$("#aiC")) return;
    const cus = $("#aiSizeSel").value === "custom";
    document.querySelectorAll(".aiCus").forEach(e => (e.style.display = cus ? "" : "none"));
    const [, W, H] = outSize();
    $("#aiSizeNow").textContent = `Kích thước: ${W} × ${H} px (đổi ở mục 3 bên trái)`;
    // xem truoc nho cho nhe may
    const k = Math.min(1, 1280 / Math.max(W, H));
    render($("#aiC"), Math.round(W * k), Math.round(H * k));
  }

  function download(ext) {
    if (!gallery.length && !$("#aiTitle").value.trim()) { msg("Chưa có ảnh để tải. Bấm ✨ Tạo ảnh trước.", true); return; }
    const [, W, H] = outSize();
    const cv = document.createElement("canvas");
    render(cv, W, H);
    const name = (($("#aiTitle").value.trim().split("\n")[0] || "anh-ai").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "anh-ai") + `_${W}x${H}.${ext}`;
    try {
      cv.toBlob(b => {
        if (!b) { msg("Không xuất được ảnh.", true); return; }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        msg("Đã tải " + name);
      }, ext === "png" ? "image/png" : "image/jpeg", 0.95);
    } catch (e) { msg("Không xuất được ảnh: " + (e.message || e), true); }
  }

  async function copyHelp() {
    const idea = $("#aiPrompt").value.trim();
    const t = `Viết giúp tôi MỘT đoạn mô tả ảnh bằng tiếng Anh (40-70 từ) để đưa vào AI vẽ ảnh, làm thumbnail YouTube.
Chỉ mô tả nội dung: nhân vật, hành động, nét mặt, đồ vật, bối cảnh, ánh sáng. KHÔNG đưa chữ, tiêu đề hay câu nói vào ảnh (chữ tôi tự chèn sau).
Phong cách đã được app tự thêm, bạn không cần viết phong cách.
Chỉ trả về đúng đoạn mô tả, không giải thích.
Ý tưởng của tôi: ${idea || "[gõ ý tưởng bằng tiếng Việt ở đây]"}`;
    try { await navigator.clipboard.writeText(t); msg("Đã chép. Dán vào Claude hoặc Gemini, rồi dán kết quả vào ô mô tả."); }
    catch { msg("Không chép tự động được, hãy thử lại.", true); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
