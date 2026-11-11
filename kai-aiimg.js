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
<section class="card ai"><h2>2. Cách tạo ảnh</h2>
<div class="seg"><label class="chk"><input type="radio" name="aimode" id="aiModeRef"> 🖼️ Dùng theo hình tải lên</label><label class="chk"><input type="radio" name="aimode" id="aiModeTxt" checked> ✍️ Tự viết prompt</label></div>
<div id="aiRefBox" style="display:grid;gap:10px">
<p class="note">Tải 1 ảnh lên, rồi ghi ở ô bên dưới bạn muốn đổi gì (tiếng Việt được), giống như sửa ảnh trong Google Flow: giữ nguyên nhân vật, đổi cảnh, đổi hành động, thêm bớt đồ vật.</p>
<div id="aiDrop" style="border:2px dashed var(--line);border-radius:10px;padding:14px;display:grid;place-items:center;gap:8px;cursor:pointer;min-height:120px;text-align:center">
<img id="aiRefPrev" hidden alt="Ảnh tải lên" style="max-width:100%;max-height:220px;border-radius:6px">
<span id="aiDropTxt" class="s">📤 Bấm để chọn ảnh, kéo thả ảnh vào đây, hoặc dán ảnh (Ctrl+V)</span></div>
<input type="file" id="aiRefFile" accept="image/*" hidden>
<div class="row"><button type="button" id="aiRefSample">Dùng ảnh mẫu "One more game"</button><button type="button" id="aiRefClear">Xoá ảnh</button><button type="button" id="aiRefOnlyText" title="Đã sửa ảnh xong ở Gemini / Google Flow? Đưa ảnh vào khung xem trước để chỉ chèn chữ">➕ Chỉ chèn chữ lên ảnh này</button></div>
<label>Cách vẽ theo ảnh<select id="aiRefEngine">
<option value="puter">⭐ Nano Banana (giống Google Flow): giữ nhân vật, đổi cảnh. Đăng nhập Puter miễn phí</option>
<option value="hf">Hugging Face (Qwen Image Edit): miễn phí, không cần đăng nhập, giới hạn lượt mỗi ngày</option>
<option value="poll">Pollinations: cần khoá Pollinations</option>
<option value="desc">Chỉ theo mô tả từ Gemini: miễn phí, KHÔNG giữ được nhân vật</option></select></label>
<label class="eng-puter">Mô hình Nano Banana<select id="aiPuterModel">
<option value="google/gemini-nano-banana-2.1">Nano Banana 2.1 (mới, rẻ lượt)</option>
<option value="google/gemini-3.1-flash-lite-image">Nano Banana 2 Lite (nhanh nhất)</option>
<option value="google/gemini-3.1-flash-image-preview">Nano Banana 2 (đẹp hơn, tốn lượt gấp đôi)</option>
<option value="google/gemini-3-pro-image-preview">Nano Banana Pro (đẹp nhất, tốn lượt gấp 4)</option></select></label>
<div class="row eng-puter"><button type="button" id="aiPuterLogin">🔑 Đăng nhập Puter</button><span id="aiPuterWho" class="s"></span></div>
<p class="note eng-hf">Dùng máy chủ miễn phí của Hugging Face, không cần tài khoản. Mỗi ngày có giới hạn số lần (khi hết sẽ báo lỗi, chờ hôm sau hoặc thêm mã Hugging Face miễn phí bên dưới để được nhiều lượt hơn). Lúc máy chủ đông có thể phải chờ 1-3 phút. Model này hiểu <b>tiếng Anh</b> tốt nhất.</p>
<details class="sub eng-hf"><summary>Tuỳ chọn Hugging Face (không bắt buộc)</summary><div style="display:grid;gap:8px;margin-top:8px">
<label>Mã Hugging Face (hf_..., tạo miễn phí ở huggingface.co → Settings → Access Tokens, loại Read)<input type="text" id="aiHfToken" placeholder="hf_..." autocomplete="off"></label>
<label>Space<input type="text" id="aiHfSpace" value="Qwen/Qwen-Image-Edit"></label></div></details>
<label class="chk eng-puter eng-poll eng-hf"><input type="checkbox" id="aiRmText" checked> Xoá chữ cũ trong ảnh (chữ mới chèn ở mục 4)</label>
<p class="note eng-puter">Lần đầu bấm Tạo ảnh sẽ hiện cửa sổ <b>đăng nhập Puter</b> (tạo tài khoản miễn phí, không cần thẻ). Mỗi tài khoản có lượt dùng miễn phí mỗi tháng; hết lượt thì Puter hỏi nâng cấp, không tự trừ tiền. Không tính vào Claude hay Gemini của bạn.</p>
<div id="aiRefStatus" class="note"></div>
<label class="eng-poll">Mô hình vẽ theo ảnh (khi có khoá)<select id="aiRefModel"></select></label>
<details class="sub eng-desc" id="aiDescBox"><summary>Chưa có khoá? Vẽ theo mô tả phong cách (miễn phí)</summary><div style="display:grid;gap:8px;margin-top:8px">
<p class="note">1) Ghi điều muốn thay đổi (tiếng Việt cũng được) vào ô <b>"Muốn ảnh mới khác ảnh gốc ở điểm nào"</b> phía dưới. 2) Bấm nút chép prompt. 3) Mở Gemini, dán prompt và <b>đính kèm ảnh của bạn</b>. 4) Chép đoạn <b>tiếng Anh</b> Gemini trả về, dán vào ô này. Cách này AI không nhìn thấy ảnh, chỉ vẽ theo lời tả, nên giống phong cách nhưng nhân vật không giống hệt.<br>Muốn đổi chữ trên ảnh (vd ONE MORE GAME → DOPAMINE) thì sửa ở mục <b>4. Chữ trên ảnh</b>.</p>
<div class="row"><button type="button" id="aiCopyDesc">📋 Chép prompt cho Gemini</button></div>
<textarea id="aiRefDesc" spellcheck="false" style="min-height:90px" placeholder="Dán prompt TIẾNG ANH Gemini trả về vào đây (không gõ yêu cầu của bạn vào ô này)"></textarea></div></details>
</div>
<p class="note aiTxtOnly">Gõ mô tả ảnh (tiếng Anh cho kết quả chuẩn nhất; tiếng Việt cũng được nếu bật "Để AI viết lại prompt"). App tự thêm phong cách bên dưới, rồi AI vẽ ảnh miễn phí. Ảnh AI vẽ <b>không có chữ</b>, chữ thumbnail do app chèn ở bước 3 nên luôn sắc nét, đúng chính tả.</p>
<div class="row aiTxtOnly"><button type="button" id="aiSample">🖼️ Dùng mẫu "One more game"</button><button type="button" id="aiCopyHelp">📋 Chép prompt nhờ AI viết mô tả</button></div>
<label id="aiPromptLbl" style="color:var(--fg)">Mô tả ảnh (prompt)</label>
<textarea id="aiPrompt" spellcheck="false" style="min-height:110px" placeholder="vd: a lonely boy sitting on his bed scrolling his phone at 3am, shadow demon whispering behind him"></textarea>
<div class="grid"><label class="aiTxtOnly">Phong cách<select id="aiStyle">${opt(STYLES, s => `<option value="${s[0]}">${s[1]}</option>`)}</select></label>
<label class="aiTxtOnly">Mô hình AI<select id="aiModel">${opt(MODELS, m => `<option value="${m[0]}">${m[1]}</option>`)}</select></label></div>
<label class="chk"><input type="checkbox" id="aiEnhance"> Để AI viết lại prompt cho đẹp hơn (nên bật khi gõ tiếng Việt)</label>
<div class="row"><button class="p big" id="aiGo">✨ Tạo ảnh</button><button id="aiMore" disabled>🔁 Tạo thêm 1 bản khác</button><span id="aiWait" class="s"></span></div>
<details class="sub"><summary>Ảnh mẫu</summary><div style="margin-top:8px"><img src="assets/ai-mau.jpg" alt="Ảnh mẫu" style="width:100%;border-radius:8px;border:1px solid var(--line)"><p class="note">Phong cách "Như ảnh mẫu" được viết theo ảnh này: nền tối, nhân vật đầu tròn mặc hoodie, bóng đen cám dỗ phát sáng, chữ trắng viền đen có 1 từ màu nhấn.</p></div></details>
<details class="sub" id="aiKeyBox"><summary>Khoá miễn phí</summary><div style="display:grid;gap:8px;margin-top:8px">
<p class="note">Chế độ "Tự viết prompt": không có khoá vẫn tạo được ảnh, nhưng phải chờ giữa các lần tạo và đôi khi ảnh có logo nhỏ. Tạo tài khoản miễn phí ở <a href="https://enter.pollinations.ai" target="_blank" rel="noopener" style="color:var(--acc)">enter.pollinations.ai</a>, tạo khoá loại <b>Publishable (pk_)</b>, dán vào đây. Khoá chỉ lưu trên trình duyệt của bạn.<br>Chế độ "Dùng theo hình tải lên" <b>cần khoá</b> để AI nhìn được ảnh của bạn (việc này có thể dùng lượt miễn phí của tài khoản).</p>
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
  // anh tham chieu (che do "Dung theo hinh tai len")
  let refBlob = null, refPrevUrl = "", refPublic = "", refUp = { key: "", url: "" };
  const REF_FALLBACK = ["kontext", "nanobanana", "seedream", "klein"];
  const isRef = () => $("#aiModeRef").checked;
  const hasVi = t => /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(t);

  function fields() {
    return ["aiHfToken", "aiHfSpace", "aiRefDesc", "aiW", "aiH", "aiPrompt", "aiStyle", "aiModel", "aiTitle", "aiAccWords", "aiAccent", "aiPos", "aiFont", "aiSize", "aiAlign", "aiSizeSel", "aiKey"];
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
    initRef(save);
    $("#aiGo").onclick = () => generate();
    $("#aiMore").onclick = () => generate();
    $("#aiPng").onclick = () => download("png");
    $("#aiJpg").onclick = () => download("jpg");
    $("#aiCopyHelp").onclick = copyHelp;

    // ve lai khi phong chu tai xong
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    draw();
  }

  // ---------- che do theo anh tai len ----------
  function initRef(save) {
    let modeNow = null;
    const setMode = ref => {
      // moi che do giu o prompt rieng
      const m = ref ? "ref" : "txt";
      if (modeNow && modeNow !== m) {
        LS.set("aiPrompt_" + modeNow, $("#aiPrompt").value);
        $("#aiPrompt").value = LS.get("aiPrompt_" + m, "");
        LS.set("aiPrompt", $("#aiPrompt").value);
      }
      modeNow = m;
      $("#aiModeRef").checked = ref; $("#aiModeTxt").checked = !ref;
      $("#aiRefBox").style.display = ref ? "grid" : "none";
      document.querySelectorAll(".aiTxtOnly").forEach(e => (e.style.display = ref ? "none" : ""));
      $("#aiPromptLbl").textContent = ref ? "Muốn ảnh mới khác ảnh gốc ở điểm nào? (không bắt buộc, tiếng Anh tốt nhất)" : "Mô tả ảnh (prompt)";
      $("#aiPrompt").placeholder = ref ? "vd: same character lying in bed at 3am scrolling his phone, shadow demon whispering behind him" : "vd: a lonely boy sitting on his bed scrolling his phone at 3am, shadow demon whispering behind him";
      LS.set("aimode", ref ? "ref" : "txt");
      if (ref && $("#aiRefEngine") && $("#aiRefEngine").value === "puter") loadPuter().catch(() => {});
      refStatus();
    };
    $("#aiModeRef").onchange = () => setMode(true);
    $("#aiModeTxt").onchange = () => setMode(false);
    setMode(LS.get("aimode", "txt") === "ref");

    const pick = $("#aiRefFile"), drop = $("#aiDrop");
    drop.onclick = () => pick.click();
    pick.onchange = () => { if (pick.files[0]) loadRef(pick.files[0]); pick.value = ""; };
    drop.ondragover = e => { e.preventDefault(); drop.style.borderColor = "var(--acc)"; };
    drop.ondragleave = () => (drop.style.borderColor = "");
    drop.ondrop = e => { e.preventDefault(); drop.style.borderColor = ""; const f = [...(e.dataTransfer.files || [])].find(f => /^image\//.test(f.type)); if (f) loadRef(f); };
    document.addEventListener("paste", e => {
      if (!document.body.classList.contains("m-ai") || !isRef()) return;
      const it = [...(e.clipboardData?.items || [])].find(i => /^image\//.test(i.type));
      if (it) { e.preventDefault(); loadRef(it.getAsFile()); }
    });
    $("#aiRefSample").onclick = async () => {
      const b = await (await fetch("assets/ai-mau.jpg")).blob();
      await loadRef(b, location.protocol === "https:" ? new URL("assets/ai-mau.jpg", location.href).href : "");
    };
    $("#aiRefClear").onclick = () => { refBlob = null; refPublic = ""; refUp = { key: "", url: "" }; $("#aiRefPrev").hidden = true; $("#aiDropTxt").hidden = false; refStatus(); };
    $("#aiCopyDesc").onclick = copyDesc;
    $("#aiKey").addEventListener("input", refStatus);
    $("#aiRefDesc").addEventListener("input", refStatus);
    $("#aiRefModel").onchange = () => LS.set("aiRefModel", $("#aiRefModel").value);
    const eng = $("#aiRefEngine"), pm = $("#aiPuterModel"), rm = $("#aiRmText");
    eng.value = LS.get("aiRefEngine", "puter"); pm.value = LS.get("aiPuterModel", pm.value) || pm.options[0].value;
    rm.checked = LS.get("aiRmText", "1") === "1";
    const showEng = () => {
      for (const k of ["puter", "hf", "poll", "desc"]) document.querySelectorAll(".eng-" + k).forEach(e => { if (!e.className.split(" ").some(c => c.startsWith("eng-") && c === "eng-" + eng.value)) e.style.display = "none"; });
      document.querySelectorAll(".eng-" + eng.value).forEach(e => (e.style.display = ""));
      LS.set("aiRefEngine", eng.value);
      if (eng.value === "puter" && isRef()) loadPuter().then(puterWho).catch(() => {});
      refStatus();
    };
    $("#aiPuterLogin").onclick = async () => {
      try { const P = await loadPuter(); await P.auth.signIn(); puterWho(); msg("Đã đăng nhập Puter. Giờ bấm ✨ Tạo ảnh."); }
      catch (e) { msg("Chưa đăng nhập được Puter: " + errText(e) + ". Nếu không hiện cửa sổ, hãy cho phép cửa sổ bật lên (popup) cho trang này rồi bấm lại, hoặc chọn cách Hugging Face.", true); }
    };
    $("#aiRefOnlyText").onclick = async () => {
      if (!refBlob) { msg("Hãy tải ảnh lên trước.", true); return; }
      const url = URL.createObjectURL(refBlob);
      const im = new Image(); im.onload = () => { addToGallery(im, url, "ảnh của bạn"); msg("Đã đưa ảnh vào khung xem trước. Gõ chữ ở mục 4 rồi tải ảnh."); }; im.src = url;
    };
    eng.onchange = showEng; pm.onchange = () => LS.set("aiPuterModel", pm.value); rm.onchange = () => LS.set("aiRmText", rm.checked ? "1" : "0");
    showEng();
    loadRefModels();
  }

  async function loadRef(file, publicUrl = "") {
    try {
      const url = URL.createObjectURL(file);
      const im = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("không đọc được ảnh")); i.src = url; });
      // thu nho con canh dai toi da 1536 cho nhe
      const k = Math.min(1, 1536 / Math.max(im.naturalWidth, im.naturalHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k);
      cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      refBlob = await new Promise(ok => cv.toBlob(ok, "image/jpeg", 0.9));
      if (refPrevUrl) URL.revokeObjectURL(refPrevUrl);
      refPrevUrl = URL.createObjectURL(refBlob);
      refPublic = publicUrl; refUp = { key: "", url: "" };
      $("#aiRefPrev").src = refPrevUrl; $("#aiRefPrev").hidden = false; $("#aiDropTxt").hidden = true;
      refStatus();
      msg("Đã nhận ảnh. Gõ điều muốn khác đi (nếu có) rồi bấm ✨ Tạo ảnh.");
    } catch (e) { msg("Không đọc được ảnh: " + (e.message || e), true); }
  }

  function refStatus() {
    const el = $("#aiRefStatus"); if (!el) return;
    const key = $("#aiKey").value.trim(), desc = $("#aiRefDesc").value.trim();
    const engv = $("#aiRefEngine") ? $("#aiRefEngine").value : "poll";
    if (!refBlob) el.innerHTML = "Chưa có ảnh.";
    else if (engv === "hf") el.innerHTML = "✅ Sẵn sàng: Qwen Image Edit (Hugging Face) sẽ nhìn trực tiếp ảnh của bạn và sửa theo yêu cầu (nên viết yêu cầu bằng tiếng Anh).";
    else if (engv === "puter") el.innerHTML = "✅ Sẵn sàng: Nano Banana sẽ nhìn trực tiếp ảnh của bạn và sửa theo yêu cầu.";
    else if (engv === "poll") el.innerHTML = key ? "✅ Có ảnh và có khoá: AI sẽ nhìn trực tiếp ảnh của bạn để vẽ." : "⚠️ Cách này cần khoá Pollinations (mục \"Khoá miễn phí\" bên dưới). Không có khoá thì chọn Nano Banana.";
    else if (key) el.innerHTML = "✅ Có ảnh và có khoá: AI sẽ nhìn trực tiếp ảnh của bạn để vẽ.";
    else if (desc) el.innerHTML = "✅ App sẽ vẽ theo <b>mô tả phong cách</b> bạn dán (miễn phí).";
    else el.innerHTML = "⚠️ Cần thêm 1 trong 2: <b>khoá miễn phí</b> (mục \"Khoá miễn phí\" bên dưới, giống ảnh nhất) hoặc <b>mô tả phong cách</b> từ Gemini (mục ngay dưới, hoàn toàn miễn phí).";
  }

  async function loadRefModels() {
    const sel = $("#aiRefModel");
    const fill = list => {
      sel.innerHTML = list.map(m => `<option value="${m.name}">${m.name}${m.paid ? " (tốn lượt tài khoản)" : ""}</option>`).join("");
      const saved = LS.get("aiRefModel", "");
      if (list.some(m => m.name === saved)) sel.value = saved;
      else { const free = list.find(m => !m.paid); if (free) sel.value = free.name; }
    };
    fill(REF_FALLBACK.map(name => ({ name })));
    try {
      const r = await fetch("https://gen.pollinations.ai/image/models");
      const js = await r.json();
      const arr = (Array.isArray(js) ? js : js.models || js.data || []).map(m => typeof m === "string" ? { name: m } : {
        name: m.name || m.id, paid: !!(m.paid_only || m.paidOnly || m.tier === "paid"),
        img: (m.input_modalities || m.inputModalities || []).includes("image"),
        video: (m.output_modalities || m.outputModalities || []).includes("video"),
      }).filter(m => m.name && m.img && !m.video);
      if (arr.length) fill(arr);
    } catch {}
  }

  let puterP = null;
  function loadPuter() {
    if (window.puter) return Promise.resolve(window.puter);
    if (!puterP) puterP = new Promise((ok, bad) => {
      const sc = document.createElement("script");
      sc.src = "https://js.puter.com/v2/";
      sc.onload = () => (window.puter ? ok(window.puter) : bad(new Error("không tải được Puter")));
      sc.onerror = () => { puterP = null; bad(new Error("không tải được Puter, kiểm tra mạng")); };
      document.head.appendChild(sc);
    });
    return puterP;
  }
  async function puterWho() {
    try { const P = window.puter; if (!P) return; const el = $("#aiPuterWho");
      if (P.auth.isSignedIn()) { const u = await P.auth.getUser(); el.textContent = "Đã đăng nhập: " + (u.username || "OK"); } else el.textContent = "Chưa đăng nhập";
    } catch {}
  }

  async function generateHF(p) {
    busy = true;
    $("#aiGo").disabled = $("#aiMore").disabled = true;
    const t0 = Date.now();
    const tick = setInterval(() => { $("#aiWait").textContent = `Hugging Face đang vẽ (có thể phải xếp hàng)... ${Math.round((Date.now() - t0) / 1000)} giây`; }, 500);
    try {
      $("#aiWait").textContent = "Đang kết nối Hugging Face...";
      const G = await import("https://esm.sh/@gradio/client@1");
      const token = $("#aiHfToken").value.trim();
      const opts = token ? { hf_token: token, token } : {};
      const app = await G.Client.connect($("#aiHfSpace").value.trim() || "Qwen/Qwen-Image-Edit", opts);
      const api = await app.view_api();
      const eps = Object.entries(api.named_endpoints || {});
      const isImg = q => /image/i.test(q.component || "") || /image|file/i.test(q.python_type?.type || q.type || "");
      const isTxt = q => /textbox|text/i.test(q.component || "");
      const ep = eps.find(([, e]) => e.parameters?.some(isImg) && e.parameters?.some(isTxt));
      if (!ep) throw new Error("Space này không có chức năng sửa ảnh phù hợp");
      const [name, e] = ep;
      const [, W, H] = outSize();
      const args = {};
      let gotImg = false, gotTxt = false;
      for (const q of e.parameters) {
        const n = q.parameter_name || q.label;
        if (!gotImg && isImg(q)) { args[n] = G.handle_file(refBlob); gotImg = true; }
        else if (!gotTxt && isTxt(q)) { args[n] = editPrompt(p, W, H); gotTxt = true; }
        else if (/rewrite/i.test(n)) args[n] = false;
        else if (/randomize/i.test(n)) args[n] = true;
        else if (q.parameter_has_default) args[n] = q.parameter_default;
        else if (q.example_input !== undefined) args[n] = q.example_input;
      }
      const res = await app.predict(name, args);
      let out = Array.isArray(res.data) ? res.data[0] : res.data;
      if (Array.isArray(out)) out = out[0];
      if (out && out.image) out = out.image;
      const src = typeof out === "string" ? out : out?.url || out?.path;
      if (!src) throw new Error("Hugging Face không trả về ảnh");
      const img = await elToImage({ src });
      addToGallery(img.img, img.url, p || "theo ảnh tải lên");
      msg(`Xong sau ${Math.round((Date.now() - t0) / 1000)} giây. Không ưng thì sửa yêu cầu rồi bấm lại.`);
    } catch (e) {
      const m = errText(e);
      if (/quota|exceeded|gpu|limit|zero/i.test(m)) msg("Hết lượt miễn phí của Hugging Face hôm nay (" + m + "). Thêm mã Hugging Face miễn phí ở mục \"Tuỳ chọn Hugging Face\" để có thêm lượt, hoặc thử lại sau.", true);
      else if (/sleep|paused|building|not found|404|runtime/i.test(m)) msg("Máy chủ Hugging Face đang tắt hoặc lỗi (" + m + "). Thử lại sau vài phút.", true);
      else msg("Hugging Face không tạo được ảnh: " + m, true);
    } finally {
      clearInterval(tick); $("#aiWait").textContent = "";
      busy = false; $("#aiGo").disabled = false; $("#aiMore").disabled = !gallery.length;
    }
  }

  const blobToB64 = b => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = bad; r.readAsDataURL(b); });
  async function elToImage(el) {
    let src = el && (el.src || (typeof el === "string" ? el : ""));
    if (!src) throw new Error("Nano Banana không trả về ảnh");
    let url = src;
    if (!/^(data|blob):/.test(src)) { const r = await fetch(src); url = URL.createObjectURL(await r.blob()); }
    else if (src.startsWith("data:")) url = URL.createObjectURL(await (await fetch(src)).blob());
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("ảnh lỗi")); i.src = url; });
    return { img, url };
  }
  function errText(e) {
    if (!e) return "lỗi không rõ";
    if (typeof e === "string") return e;
    return e.error?.message || e.message || e.error?.code || (() => { try { return JSON.stringify(e).slice(0, 200); } catch { return String(e); } })();
  }
  function editPrompt(p, W, H) {
    const frame = W > H * 1.2 ? "a wide 16:9 landscape" : H > W * 1.2 ? "a tall 9:16 portrait" : "a 1:1 square";
    return `Edit the provided image. Keep exactly the same characters (face, head shape, eyes, body, clothes), the same art style, line work, shading, color palette and lighting as the original image.\n` +
      `Requested changes (may be written in Vietnamese, follow them carefully): ${p || "put the same characters in a new, different scene"}\n` +
      ($("#aiRmText").checked ? "Remove ALL text, titles, letters, logos and watermarks from the image. The result must contain no text at all.\n" : "") +
      `Compose the result for ${frame} frame, keeping the main characters fully visible.`;
  }

  async function uploadRef(key) {
    if (refPublic) return refPublic;
    if (refUp.url && refUp.key === key) return refUp.url;
    const r = await fetch("https://media.pollinations.ai/upload", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "image/jpeg" }, body: refBlob });
    const t = await r.text();
    if (!r.ok) throw new Error(`UPLOAD HTTP ${r.status} ${t.slice(0, 120)}`);
    let u = ""; try { u = JSON.parse(t).url || ""; } catch {}
    u = (u || t).trim();
    if (!/^https?:\/\//.test(u)) throw new Error("UPLOAD không nhận được link ảnh");
    refUp = { key, url: u };
    return u;
  }

  async function copyDesc() {
    const want = $("#aiPrompt").value.trim();
    const t = `Tôi gửi kèm 1 ảnh. Hãy viết MỘT prompt bằng tiếng Anh (80-130 từ) để một AI vẽ ảnh KHÔNG nhìn thấy ảnh này vẫn vẽ ra được ảnh MỚI giống nó nhất có thể.
Prompt phải tả đủ: kiểu vẽ (2D hay 3D, hoạt hình hay ảnh thật), nét viền, cách tô bóng, bảng màu chính, ánh sáng, nền, từng nhân vật (hình đầu, mắt, da, tóc, quần áo, tư thế, nét mặt), đồ vật, bố cục.
${want ? "Ảnh mới cần thay đổi so với ảnh gốc như sau (đưa thẳng các thay đổi này vào prompt, tả ảnh SAU KHI đã đổi):\n" + want + "\n" : ""}KHÔNG đưa bất kỳ chữ, tiêu đề hay logo nào vào prompt (chữ tôi sẽ tự chèn sau). Chỉ trả về đúng prompt tiếng Anh, không giải thích.`;
    try { await navigator.clipboard.writeText(t); msg("Đã chép. Mở Gemini, dán prompt, đính kèm ảnh của bạn, rồi dán kết quả vào ô mô tả phong cách."); }
    catch { msg("Không chép tự động được, hãy thử lại.", true); }
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

  function descPrompt(p, desc) {
    // yeu cau tieng Viet da duoc Gemini dua vao mo ta, khong gui lai cho AI ve
    const extra = p && !hasVi(p) ? ` ${p}.` : "";
    return `${desc}.${extra} No text, no letters, no title, no watermark.`;
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
    const key = $("#aiKey").value.trim();
    const ref = isRef(), desc = $("#aiRefDesc").value.trim();
    if (ref) {
      if (!refBlob) { msg("Hãy tải 1 ảnh lên trước (bấm vào khung có chữ 📤).", true); return; }
      const engv = $("#aiRefEngine").value;
      if (engv === "puter") return generatePuter(p);
      if (engv === "hf") return generateHF(p);
      if (engv === "poll" && !key) { msg("Cách Pollinations cần khoá. Thêm khoá ở mục \"Khoá miễn phí\", hoặc chọn cách Nano Banana.", true); $("#aiKeyBox").open = true; return; }
      if (engv === "desc" && !desc) { msg("Hãy dán mô tả tiếng Anh từ Gemini vào ô mô tả trước (xem hướng dẫn ngay trên).", true); $("#aiDescBox").open = true; return; }
      if (!key && !desc) { msg("Cần khoá miễn phí hoặc mô tả phong cách từ Gemini. Xem hướng dẫn ngay dưới ảnh.", true); $("#aiDescBox").open = true; return; }
      if ((engv === "desc" || !key) && hasVi(desc)) {
        msg("Ô \"mô tả phong cách\" phải là đoạn TIẾNG ANH do Gemini viết, không phải yêu cầu sửa của bạn. Hãy ghi yêu cầu sửa vào ô \"Muốn ảnh mới khác ảnh gốc ở điểm nào\", bấm 📋 Chép prompt cho Gemini, dán vào Gemini kèm ảnh, rồi dán kết quả tiếng Anh vào ô mô tả.", true);
        $("#aiDescBox").open = true; return;
      }
    } else if (!p) { msg("Hãy gõ mô tả ảnh trước.", true); $("#aiPrompt").focus(); return; }
    return generatePollinations(p, key, ref, desc);
  }

  async function generatePuter(p) {
    busy = true;
    $("#aiGo").disabled = $("#aiMore").disabled = true;
    const t0 = Date.now();
    let tick = null;
    try {
      const P = await loadPuter();
      if (!P.auth.isSignedIn()) {
        msg("Đang mở cửa sổ đăng nhập Puter. Tạo tài khoản miễn phí hoặc đăng nhập, rồi app sẽ tự vẽ tiếp.");
        await P.auth.signIn();
        puterWho();
      }
      const [, W, H] = outSize();
      const b64 = await blobToB64(refBlob);
      tick = setInterval(() => { $("#aiWait").textContent = `Nano Banana đang vẽ... ${Math.round((Date.now() - t0) / 1000)} giây`; }, 500);
      const el = await P.ai.txt2img(editPrompt(p, W, H), { model: $("#aiPuterModel").value, input_image: b64, input_image_mime_type: "image/jpeg" });
      const img = await elToImage(el);
      addToGallery(img.img, img.url, p || "theo ảnh tải lên");
      msg(`Xong sau ${Math.round((Date.now() - t0) / 1000)} giây. Không ưng thì sửa yêu cầu rồi bấm lại, hoặc "Tạo thêm 1 bản khác".`);
    } catch (e) {
      const m = errText(e);
      if (/insufficient|funds|credit|balance|quota|limit|upgrade|402/i.test(m)) msg("Tài khoản Puter đã hết lượt miễn phí tháng này (" + m + "). Chọn mô hình rẻ hơn (Nano Banana 2.1 / 2 Lite) hoặc chờ sang tháng.", true);
      else if (/sign|auth|cancel|popup|closed/i.test(m)) msg("Chưa đăng nhập Puter được (" + m + "). Bấm nút 🔑 Đăng nhập Puter, cho phép cửa sổ bật lên; hoặc đổi sang cách Hugging Face.", true);
      else msg("Nano Banana không tạo được ảnh: " + m, true);
    } finally {
      if (tick) clearInterval(tick);
      $("#aiWait").textContent = "";
      busy = false; $("#aiGo").disabled = false; $("#aiMore").disabled = !gallery.length;
    }
  }

  async function generatePollinations(p, key, ref, desc) {
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
      if ($("#aiEnhance").checked && !ref) params.set("enhance", "true");
      const urls = [];
      if (ref && key && $("#aiRefEngine").value === "poll") {
        // AI nhin truc tiep anh tai len
        $("#aiWait").textContent = "Đang gửi ảnh của bạn cho AI...";
        const imgUrl = await uploadRef(key);
        const rp = `${p || "a new variation of the reference image with a slightly different pose and scene"}. ` +
          `Use the reference image as the style guide: keep exactly the same art style, line work, shading, color palette, lighting, background mood and character design. ` +
          `No text, no letters, no title, no watermark.`;
        params.set("model", $("#aiRefModel").value || "kontext");
        params.set("image", imgUrl);
        params.set("key", key);
        urls.push(`https://gen.pollinations.ai/image/${encodeURIComponent(rp)}?${params}`);
        if (desc) { // du phong: neu ve theo anh loi thi ve theo mo ta phong cach
          const fp = new URLSearchParams(params); fp.delete("image"); fp.set("model", "flux");
          urls.push(`https://gen.pollinations.ai/image/${encodeURIComponent(descPrompt(p, desc))}?${fp}`);
        }
      } else {
        const enc = encodeURIComponent(ref ? descPrompt(p, desc) : fullPrompt());
        if (key) { params.set("key", key); urls.push(`https://gen.pollinations.ai/image/${enc}?${params}`); params.delete("key"); }
        params.set("referrer", "videostudio-kai");
        urls.push(`https://image.pollinations.ai/prompt/${enc}?${params}`);
      }

      const t0 = Date.now();
      const tick = setInterval(() => { $("#aiWait").textContent = `AI đang vẽ... ${Math.round((Date.now() - t0) / 1000)} giây`; }, 500);
      let img = null, lastErr = "";
      try {
        for (const u of urls) {
          try { img = await fetchImage(u); break; } catch (e) { lastErr = e.message || String(e); }
        }
      } finally { clearInterval(tick); $("#aiWait").textContent = ""; lastAt = Date.now(); }
      if (!img) throw new Error(lastErr);
      addToGallery(img.img, img.url, p || (ref ? "theo ảnh tải lên" : ""));
      msg(`Xong sau ${Math.round((Date.now() - t0) / 1000)} giây. Không ưng thì bấm "Tạo thêm 1 bản khác".`);
    } catch (e) {
      const m = String(e.message || e);
      if (/^UPLOAD/.test(m)) msg("Không gửi được ảnh của bạn cho AI (" + m.replace(/^UPLOAD\s*/, "") + "). Kiểm tra lại khoá, hoặc dùng cách mô tả phong cách từ Gemini (miễn phí).", true);
      else if (/429|rate|limit|queue/i.test(m)) msg("Máy chủ miễn phí đang bận hoặc bạn tạo quá nhanh. Chờ khoảng 30 giây rồi thử lại, hoặc thêm khoá miễn phí ở mục \"Khoá miễn phí\".", true);
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
