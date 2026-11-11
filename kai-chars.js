// Video Studio by Kai - giao dien "Nhan vat": mac dinh / cua toi, nhieu nhan vat, Apply vao code.
(function () {
  'use strict';
  const KB = window.__KB;
  if (!KB) return;
  const $ = s => document.querySelector(s);
  const slug = n => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bo qua */ } },
  };

  // ------------------------------------------------------------ luu tru lau dai (IndexedDB)
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open('kai-video-studio', 1);
        r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('imgs', { keyPath: 'name' }); d.createObjectStore('glbs', { keyPath: 'id' }); };
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  const dbDo = (storeName, mode, fn) => db().then(d => new Promise((res, rej) => {
    const t = d.transaction(storeName, mode), req = fn(t.objectStore(storeName));
    t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  })).catch(() => undefined);

  // ------------------------------------------------------------ du lieu nhan vat
  const glbs = new Map();           // ten -> { buffer, anims, rev }
  window.KaiChars = { rev: 0, imgs: () => KB.Le, glbs: () => glbs };
  const bump = () => { window.KaiChars.rev++; };
  const roles = store.get('kaiRoles', {});
  const MODES = { vid: 'Video 2D', d25: 'Video 2.5D', d3: 'Video 3D', img: 'Ảnh' };
  const mode = () => { const b = document.body.classList; return b.contains('m-img') ? 'img' : b.contains('m-25') ? 'd25' : b.contains('m-3d') ? 'd3' : 'vid'; };
  const useMine = m => store.get('kaiMine_' + (m || mode()), false);

  function all() {
    const out = [];
    for (const n of Object.keys(KB.Ae())) if (!DEFAULTS.includes(n)) out.push({ name: n, kind: 'code' });
    for (const n of glbs.keys()) out.push({ name: n, kind: 'glb' });
    return out;
  }
  const compat = (c, m) => c.kind === 'img' || (c.kind === 'code' && m !== 'd3') || (c.kind === 'glb' && m === 'd3');
  const KIND = { img: 'ảnh', code: 'code', glb: 'mô hình 3D' };
  const DEFAULTS = ['hoodie', 'hooded', 'hero', 'band', 'voice', 'friend', 'friend2', 'friend3', 'girl', 'mom', 'dad', 'kid', 'ghost'];
  const DEF_LABEL = { hoodie: 'hoodie (mặc định)', hooded: 'hooded (mặc định)', hero: 'hero (mặc định)', band: 'band (mặc định)', voice: 'bóng đen (mặc định)', friend: 'friend (mặc định)', friend2: 'friend2 (mặc định)', friend3: 'friend3 (mặc định)', girl: 'girl (mặc định)', mom: 'mom (mặc định)', dad: 'dad (mặc định)', kid: 'kid (mặc định)', ghost: 'ghost (mặc định)', toon: 'toon - hoạt hình nét viền (3D, đẹp nhất)', toonhood: 'toon trùm mũ (3D)', toonband: 'toon đeo băng đô (3D)', robot: 'robot (3D)' };

  // ------------------------------------------------------------ doc / sua code JSON
  function parseCode() {
    const t = ($('#code').value || '').trim().replace(/^```(?:json|js|javascript)?/i, '').replace(/```$/, '').trim();
    return JSON.parse(t);
  }
  function walkWho(o, fn) {
    if (Array.isArray(o)) { o.forEach(x => walkWho(x, fn)); return; }
    if (o && typeof o === 'object') for (const k of Object.keys(o)) {
      if (k === 'chars') continue;
      if (k === 'who' && typeof o[k] === 'string') { const n = fn(o[k]); if (n !== o[k]) o[k] = n; } else walkWho(o[k], fn);
    }
  }
  function sourcesInCode() {
    try { const seen = []; walkWho(parseCode(), w => { const l = w.toLowerCase(); if (!seen.includes(l)) seen.push(l); return w; }); return seen; } catch (e) { return null; }
  }

  // ------------------------------------------------------------ giao dien
  const sel = new Map();             // nguon -> dich
  const touched = new Set();         // nguon do nguoi dung tu chon
  const undo = [];
  const note = (t, bad) => { const e = $('#cmsg'); if (e) { e.textContent = t || ''; e.style.color = bad ? 'var(--acc)' : 'var(--mut)'; } };

  function thumb(c) {
    const cv = document.createElement('canvas'); cv.height = 44; cv.width = 44;
    cv.style.cssText = 'height:44px;width:44px;border-radius:6px;background:repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 50%/10px 10px';
    const g = cv.getContext('2d');
    if (c.kind === 'img') {
      const p = KB.Le.get(c.name); const src = p && (p.poses.idle || p.poses.stand || Object.values(p.poses)[0]);
      if (src) { const k = Math.min(40 / src.width, 40 / src.height); g.drawImage(src, 22 - src.width * k / 2, 42 - src.height * k, src.width * k, src.height * k); }
    } else { g.fillStyle = '#8a8a96'; g.font = '700 15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.kind === 'glb' ? '3D' : '{ }', 22, 22); }
    return cv;
  }

  function render() {
    aliasAll();
    const panel = $('#cpanel'); if (!panel) return;
    const m = mode(), mine = useMine(m), chars = all();
    $('#cmdef').checked = !mine; $('#cmmine').checked = mine;
    $('#ccount').textContent = chars.length ? '(' + chars.length + ')' : '';
    $('#cbody').hidden = !mine;
    $('#cmodeName').textContent = MODES[m];
    if (!mine) return;

    const list = $('#clist'); list.innerHTML = '';
    if (!chars.length) { const e = document.createElement('span'); e.className = 's'; e.textContent = 'Chưa có nhân vật nào. Thêm nhân vật bằng code ở Bước 1.'; list.append(e); }
    for (const c of chars) {
      const ok = compat(c, m), box = document.createElement('div');
      box.style.cssText = 'display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:6px 8px;' + (ok ? '' : 'opacity:.5');
      const info = document.createElement('div'); info.style.cssText = 'display:grid;gap:2px;min-width:0';
      const nm = document.createElement('b'); nm.textContent = c.name;
      const ty = document.createElement('span'); ty.className = 's'; ty.style.fontSize = '11px'; ty.textContent = KIND[c.kind] + (ok ? '' : ' · không dùng được ở tab này');
      info.append(nm, ty);
      const role = document.createElement('select'); role.title = 'Vai trong phim';
      [['main', 'Vai chính'], ['shadow', 'Bóng đen'], ['other', 'Vai phụ']].forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; role.append(o); });
      role.value = roles[c.name] || (chars.findIndex(x => x.name === c.name) === 0 ? 'main' : 'other');
      role.onchange = () => { roles[c.name] = role.value; store.set('kaiRoles', roles); sel.clear(); touched.clear(); renderMap(); };
      const rl = document.createElement('label'); rl.style.cssText = 'display:grid;gap:2px;font-size:11px;color:var(--mut)'; rl.append('Vai trong phim', role);
      box.append(thumb(c), info, rl);
      if (c.kind !== 'glb') { const b = document.createElement('button'); b.textContent = 'Xem thử'; b.style.padding = '4px 8px'; b.onclick = () => { const r = KB.En(c.name); if (r) { note(String(r), true); return; } note(''); const pb = $('#cprevbox'); pb.hidden = false; pb.style.display = 'grid'; $('#cprevname').textContent = c.name; $('#cprev').hidden = false; pb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          clearInterval(window.__cprevTimer); const t0 = performance.now();
          window.__cprevTimer = setInterval(() => { if (pb.hidden || !document.body.contains(pb) || !document.querySelector('#cprev') || !KB.Le.has(c.name) && !KB.Ae()[c.name]) { clearInterval(window.__cprevTimer); return; } window.__cprevT = (performance.now() - t0) / 1000; KB.En(c.name); }, 50); }; box.append(b); }
      const d = document.createElement('button'); d.textContent = 'Xóa'; d.style.padding = '4px 8px'; d.onclick = () => { if (d.dataset.sure) { remove(c); return; } d.dataset.sure = 1; d.textContent = 'Bấm lần nữa để xóa'; d.style.color = 'var(--acc)'; setTimeout(() => { delete d.dataset.sure; d.textContent = 'Xóa'; d.style.color = ''; }, 3000); }; box.append(d);
      list.append(box);
    }
    renderMap();
  }

  function suggest(src, m) {
    const mc = all().filter(c => compat(c, m)); if (!mc.length) return '';
    const r = c => roles[c.name] || (all().findIndex(x => x.name === c.name) === 0 ? 'main' : 'other');
    const pick = role => mc.find(c => r(c) === role);
    if (['hoodie', 'hooded', 'hero', 'band'].includes(src)) return (pick('main') || {}).name || '';
    if (src === 'voice') return (pick('shadow') || {}).name || '';
    if (DEFAULTS.includes(src)) { const o = mc.filter(c => r(c) === 'other'); if (!o.length) return ''; const idx = ['friend', 'friend2', 'friend3', 'girl', 'mom', 'dad', 'kid', 'ghost'].indexOf(src); return o[Math.max(0, idx) % o.length].name; }
    return '';
  }

  function renderMap() {
    const box = $('#cmap'); if (!box) return; box.innerHTML = '';
    const m = mode(), src = sourcesInCode(), mc = all().filter(c => compat(c, m));
    if (src === null) { box.innerHTML = '<span class="s">Code chưa đúng định dạng nên chưa đọc được nhân vật trong đó.</span>'; $('#capply').disabled = true; return; }
    if (!src.length) { box.innerHTML = '<span class="s">Trong code chưa có nhân vật nào (mục "who").</span>'; $('#capply').disabled = true; return; }
    $('#capply').disabled = false;
    const hd = document.createElement('div'); hd.style.cssText = 'display:grid;grid-template-columns:minmax(80px,auto) auto 1fr;gap:8px;font-size:11px;color:var(--mut)';
    hd.innerHTML = '<span>Đang có trong code</span><span></span><span>Đổi thành</span>'; box.append(hd);
    const mine = new Set(all().map(c => c.name));
    for (const s of src) {
      if (!touched.has(s)) sel.set(s, suggest(s, m));
      const row = document.createElement('div'); row.style.cssText = 'display:grid;grid-template-columns:minmax(80px,auto) auto 1fr;gap:8px;align-items:center';
      const a = document.createElement('code'); a.textContent = s + (mine.has(s) ? ' ✓' : ''); if (mine.has(s)) a.title = 'Đã là nhân vật của bạn';
      const arrow = document.createElement('span'); arrow.textContent = '→';
      const s2 = document.createElement('select'); s2.style.minWidth = '0';
      const keep = document.createElement('option'); keep.value = ''; keep.textContent = mine.has(s) ? '— giữ nguyên (đã là nhân vật của bạn) —' : '— giữ nguyên —'; s2.append(keep);
      if (mc.length) { const g = document.createElement('optgroup'); g.label = 'Nhân vật của tôi'; mc.forEach(c => { const o = document.createElement('option'); o.value = c.name; o.textContent = c.name; g.append(o); }); s2.append(g); }
      const g2 = document.createElement('optgroup'); g2.label = 'Mặc định'; DEFAULTS.concat(m === 'd3' ? ['toon', 'toonhood', 'toonband', 'robot'] : []).forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = DEF_LABEL[d] || d; g2.append(o); }); s2.append(g2);
      s2.value = sel.get(s) || ''; if (s2.value !== (sel.get(s) || '')) s2.value = '';
      s2.onchange = () => { touched.add(s); sel.set(s, s2.value); };
      row.append(a, arrow, s2); box.append(row);
    }
  }

  function apply() {
    let obj; try { obj = parseCode(); } catch (e) { note('Code chưa đúng nên chưa thể Apply: ' + e.message, true); return; }
    let n = 0;
    walkWho(obj, w => { const t = sel.get(w.toLowerCase()); if (t && t !== w.toLowerCase()) { n++; return t; } return w; });
    if (!n) { note('Code đã dùng nhân vật của bạn rồi, không cần thay nữa. Nếu muốn đổi, mở mục "Tùy chỉnh" để chọn, hoặc đổi vai ở Bước 2.', true); return; }
    undo.push($('#code').value);
    $('#code').value = JSON.stringify(obj, null, 1);
    $('#cundo').disabled = false; sel.clear(); touched.clear();
    note('Đã thay ' + n + ' chỗ trong code. Bấm "Hoàn tác" nếu muốn quay lại.');
    KB.reload(); KB.load(); renderMap();
  }
  function doUndo() {
    if (!undo.length) return; $('#code').value = undo.pop(); $('#cundo').disabled = !undo.length; sel.clear(); touched.clear();
    note('Đã hoàn tác.'); KB.reload(); KB.load(); renderMap();
  }

  async function remove(c) {
    if (c.kind === 'code') { const A = KB.Ae(); delete A[c.name]; KB.saveAe(); }
    if (c.kind === 'img') {
      KB.Le.delete(c.name);
      const recs = (await dbDo('imgs', 'readonly', s => s.getAll())) || [];
      for (const r of recs) if (r.slug === c.name) await dbDo('imgs', 'readwrite', s => s.delete(r.name));
    }
    if (c.kind === 'glb') { glbs.delete(c.name); await dbDo('glbs', 'readwrite', s => s.delete(c.name)); }
    bump(); KB.reload(); KB.Ut(); sel.clear(); touched.clear(); render();
  }

  // ------------------------------------------------------------ them nhan vat
  function saveImgFiles(files) {
    const rm = !!($('#rmbg') && $('#rmbg').checked);
    files.forEach(f => dbDo('imgs', 'readwrite', s => s.put({ name: f.name, slug: slug(f.name.replace(/\.[^.]+$/, '').split('__')[0]), blob: f, rm, v: 2 })));
  }
  async function addGlb(files) {
    for (const f of files) {
      const id = slug(f.name.replace(/\.[^.]+$/, ''));
      if (!id) continue;
      if (f.size > 40 * 1024 * 1024) { note('Mô hình "' + f.name + '" lớn hơn 40MB. Hãy giảm dung lượng rồi thử lại.', true); continue; }
      try {
        const buffer = await f.arrayBuffer();
        await window.Kai3DReady;
        const info = await window.Kai3D.inspectGLB(buffer);
        glbs.set(id, { buffer, anims: info.anims, rev: Date.now() });
        await dbDo('glbs', 'readwrite', s => s.put({ id, name: f.name, buffer, anims: info.anims }));
        note('Đã thêm mô hình 3D "' + id + '". ' + (info.anims.length ? 'Động tác có sẵn: ' + info.anims.join(', ') + '. Ghi tên động tác vào "pose" trong code.' : 'Mô hình này không có động tác, nhân vật sẽ đứng yên.') + (info.skinned ? '' : ' (Không có xương nên chỉ đứng yên.)'));
      } catch (e) { note('Không đọc được mô hình "' + f.name + '". Hãy dùng file .glb hoặc .gltf đóng gói sẵn.', true); }
    }
    bump(); KB.reload(); render();
  }

  // ------------------------------------------------------------ tach anh co nhieu hinh
  function segments(cv) {
    const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data;
    const col = new Uint32Array(w);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) col[x]++;
    const minPx = Math.max(2, h * 0.01), gap = Math.max(6, w * 0.03), segs = [];
    let st = -1, last = -1;
    for (let x = 0; x < w; x++) {
      if (col[x] > minPx) { if (st < 0) st = x; else if (x - last > gap) { segs.push([st, last]); st = x; } last = x; }
    }
    if (st >= 0) segs.push([st, last]);
    const mass = s => { let m = 0; for (let x = s[0]; x <= s[1]; x++) m += col[x]; return m; };
    const total = segs.reduce((a, s) => a + mass(s), 0);
    return segs.filter(s => s[1] - s[0] > w * 0.06 && mass(s) > total * 0.08);
  }
  function cropCols(cv, a, b) {
    const w = b - a + 1, h = cv.height, g = cv.getContext('2d').getImageData(a, 0, w, h).data;
    let top = h, bot = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[(y * w + x) * 4 + 3] > 8) { if (y < top) top = y; bot = y; break; }
    if (bot < 0) return null;
    const o = document.createElement('canvas'); o.width = w; o.height = bot - top + 1;
    o.getContext('2d').drawImage(cv, a, top, w, o.height, 0, 0, w, o.height);
    return o;
  }
  // Mot anh co nhieu hinh dung canh nhau -> moi hinh thanh mot nhan vat rieng (ten-1, ten-2...)
  async function splitChar(name, existed) {
    const ent = KB.Le.get(name); if (!ent || existed) return 1;
    const poses = Object.entries(ent.poses); if (poses.length !== 1) return 1;
    const [pose, cv] = poses[0], segs = segments(cv);
    if (segs.length < 2 || segs.length > 8) return 1;
    const files = [];
    for (let i = 0; i < segs.length; i++) {
      const piece = cropCols(cv, segs[i][0], segs[i][1]); if (!piece) continue;
      const blob = await new Promise(r => piece.toBlob(r, 'image/png'));
      files.push(new File([blob], name + '-' + (i + 1) + '__' + pose + '.png', { type: 'image/png' }));
    }
    if (files.length < 2) return 1;
    const cb = $('#rmbg'), old = cb ? cb.checked : false; if (cb) cb.checked = false;
    try { await KB.In(files); } finally { if (cb) cb.checked = old; }
    KB.Le.delete(name);
    const recs = (await dbDo('imgs', 'readonly', s => s.getAll())) || [];
    for (const r of recs) if (r.slug === name) await dbDo('imgs', 'readwrite', s => s.delete(r.name));
    files.forEach(f => dbDo('imgs', 'readwrite', s => s.put({ name: f.name, slug: slug(f.name.split('__')[0]), blob: f, rm: false, v: 2 })));
    return files.length;
  }

  // ------------------------------------------------------------ bang nhieu dang cua 1 nhan vat
  const SHEET = ['idle', 'happy', 'sad', 'cry', 'punch', 'run', 'sit', 'cheer'];
  const SHEET_VN = { idle: 'đứng', happy: 'vui', sad: 'buồn', cry: 'khóc', punch: 'đấm', run: 'chạy', sit: 'ngồi', cheer: 'giơ tay ăn mừng' };
  const ALIAS = { idle: ['stand', 'relaxed', 'neutral'], happy: ['smile', 'grin', 'wave'], sad: ['tired', 'slump', 'lonely', 'headhold', 'facepalm', 'knees', 'kneel'], cry: [], punch: ['guard', 'fist'], run: ['walk'], sit: ['sitphone', 'sitdesk', 'sitsad', 'crouch'], cheer: ['win', 'lift'] };
  function aliasAll() {
    for (const [, ent] of KB.Le) { const p = ent.poses; for (const k of Object.keys(ALIAS)) if (p[k] && !p[k].__alias) for (const a of ALIAS[k]) if (!p[a]) { p[a] = p[k]; } }
  }
  function rowsOf(cv) {
    const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data, row = new Uint32Array(h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) row[y]++;
    const min = Math.max(2, w * .004), gap = Math.max(6, h * .025), out = [];
    let st = -1, last = -1;
    for (let y = 0; y < h; y++) if (row[y] > min) { if (st < 0) st = y; else if (y - last > gap) { out.push([st, last]); st = y; } last = y; }
    if (st >= 0) out.push([st, last]);
    return out.filter(r => r[1] - r[0] > h * .08);
  }
  // tach theo tung khoi hinh rieng (connected components), xep theo hang roi tu trai qua phai
  function blobs(cv) {
    const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data;
    const B = Math.max(2, Math.round(Math.max(w, h) / 400)), gw = Math.ceil(w / B), gh = Math.ceil(h / B);
    const occ = new Uint8Array(gw * gh), lab = new Int32Array(gw * gh).fill(-1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) occ[((y / B) | 0) * gw + ((x / B) | 0)] = 1;
    const comps = [];
    for (let i = 0; i < occ.length; i++) {
      if (!occ[i] || lab[i] >= 0) continue;
      const id = comps.length, c = { id, n: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1, ids: [id] }, st = [i]; lab[i] = id;
      while (st.length) {
        const j = st.pop(), gx = j % gw, gy = (j / gw) | 0; c.n++;
        if (gx < c.x0) c.x0 = gx; if (gx > c.x1) c.x1 = gx; if (gy < c.y0) c.y0 = gy; if (gy > c.y1) c.y1 = gy;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx, ny = gy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const k = ny * gw + nx; if (occ[k] && lab[k] < 0) { lab[k] = id; st.push(k); }
        }
      }
      comps.push(c);
    }
    if (!comps.length) return [];
    const max = Math.max(...comps.map(c => c.n));
    const big = comps.filter(c => c.n >= max * .15);
    for (const c of comps) {                 // manh nho (nuoc mat, tia sang...) -> gop vao hinh gan nhat
      if (big.includes(c) || c.n < max * .003) continue;
      const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
      const host = big.find(b => { const mx = (b.x1 - b.x0) * .15, my = (b.y1 - b.y0) * .15; return cx >= b.x0 - mx && cx <= b.x1 + mx && cy >= b.y0 - my && cy <= b.y1 + my; });
      if (host) { host.ids.push(c.id); host.x0 = Math.min(host.x0, c.x0); host.x1 = Math.max(host.x1, c.x1); host.y0 = Math.min(host.y0, c.y0); host.y1 = Math.max(host.y1, c.y1); }
    }
    // xep thu tu: theo hang, roi trai -> phai
    big.sort((a, b) => a.y0 - b.y0);
    const rows = [];
    for (const b of big) {
      const r = rows.find(r => { const cy = (b.y0 + b.y1) / 2; return cy >= r.y0 && cy <= r.y1; });
      if (r) { r.items.push(b); r.y0 = Math.min(r.y0, b.y0); r.y1 = Math.max(r.y1, b.y1); } else rows.push({ y0: b.y0, y1: b.y1, items: [b] });
    }
    const out = [];
    for (const r of rows) for (const b of r.items.sort((a, b) => a.x0 - b.x0)) {
      const set = new Set(b.ids), X0 = b.x0 * B, Y0 = b.y0 * B, X1 = Math.min(w, (b.x1 + 1) * B), Y1 = Math.min(h, (b.y1 + 1) * B);
      const pw = X1 - X0, ph = Y1 - Y0, im = new ImageData(pw, ph);
      for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
        const sx = X0 + x, sy = Y0 + y; if (!set.has(lab[((sy / B) | 0) * gw + ((sx / B) | 0)])) continue;
        const si = (sy * w + sx) * 4, di = (y * pw + x) * 4; for (let k = 0; k < 4; k++) im.data[di + k] = d[si + k];
      }
      const c = document.createElement('canvas'); c.width = pw; c.height = ph; c.getContext('2d').putImageData(im, 0, 0);
      out.push(c);
    }
    return out;
  }
  // 2 hinh gan nhu giong het nhau -> bo bot 1
  function sig(cv) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.drawImage(cv, 0, 0, 16, 16); const d = g.getImageData(0, 0, 16, 16).data, o = []; for (let i = 0; i < d.length; i += 4) o.push(d[i + 3] > 40 ? (d[i] + d[i + 1] + d[i + 2]) / 3 : -60); return o; }
  function same(a, b) { const r = Math.abs(a.width / a.height - b.width / b.height); if (r > .08) return false; const x = sig(a), y = sig(b); let s = 0; for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]); return s / x.length < 14; }
  async function splitSheet(name) {
    const ent = KB.Le.get(name); if (!ent) return 0;
    const cv = Object.values(ent.poses)[0], pieces = [];
    for (const pc of blobs(cv)) if (!pieces.some(q => same(q, pc))) pieces.push(pc);
    if (pieces.length < 2) return 0;
    const files = [];
    for (let i = 0; i < Math.min(pieces.length, SHEET.length); i++) {
      const blob = await new Promise(r => pieces[i].toBlob(r, 'image/png'));
      files.push(new File([blob], name + '__' + SHEET[i] + '.png', { type: 'image/png' }));
    }
    KB.Le.delete(name);
    const recs = (await dbDo('imgs', 'readonly', s => s.getAll())) || [];
    for (const r of recs) if (r.slug === name) await dbDo('imgs', 'readwrite', s => s.delete(r.name));
    const cb = $('#rmbg'), old = cb ? cb.checked : false; if (cb) cb.checked = false;
    try { await KB.In(files); } finally { if (cb) cb.checked = old; }
    files.forEach(f => dbDo('imgs', 'readwrite', s => s.put({ name: f.name, slug: name, blob: f, rm: false, v: 2 })));
    return files.length;
  }

  // ------------------------------------------------------------ prompt cho AI
  function promptExtra() {
    const m = mode(); if (!useMine(m)) return '';
    const mc = all().filter(c => compat(c, m)); if (!mc.length) return '';
    const R = { main: 'nhân vật chính', shadow: 'bóng đen cám dỗ', other: 'nhân vật phụ' };
    const lines = mc.map(c => {
      const r = R[roles[c.name] || (all().findIndex(x => x.name === c.name) === 0 ? 'main' : 'other')];
      if (c.kind === 'code') return '- "' + c.name + '" (' + r + '): nhân vật vẽ bằng code, hỗ trợ mọi dáng và mọi nét mặt, có hold phone/book.';
      if (c.kind === 'glb') { const g = glbs.get(c.name); return '- "' + c.name + '" (' + r + '): mô hình 3D có xương. Các "pose" dùng được: ' + ((g && g.anims.length) ? g.anims.join(', ') : 'chỉ đứng yên') + ' (pose khác sẽ dùng động tác nghỉ).'; }
      const p = KB.Le.get(c.name); return '- "' + c.name + '" (' + r + '): nhân vật bằng ảnh, các dáng có sẵn: ' + Object.keys(p ? p.poses : {}).join(', ') + ' (dáng khác sẽ dùng idle).';
    });
    return '\n\nNHÂN VẬT RIÊNG CỦA TÔI (đã có sẵn trong app, KHÔNG cần viết code vẽ lại). Dùng "who" đúng các tên này cho nhân vật chính, bóng đen và nhân vật phụ thay cho hoodie, band, voice, friend... Mỗi nhân vật giữ ĐÚNG một tên xuyên suốt phim để hình luôn giống nhau. Không đưa khối "chars" vào JSON.\n' + lines.join('\n');
  }

  // ------------------------------------------------------------ giao dien: dung khung + gan su kien
  function build() {
    if (!$('#cpanel')) return false;
    const on = (id, ev, fn) => { const e = $('#' + id); if (e) e['on' + ev] = fn; };
    on('cmdef', 'change', () => { store.set('kaiMine_' + mode(), false); render(); });
    on('cmmine', 'change', () => { store.set('kaiMine_' + mode(), true); render(); });
    on('capply', 'click', apply); on('cundo', 'click', doUndo);
    $('#cundo').disabled = true;
    const gf = $('#glbf'); if (gf) gf.onchange = async e => { await addGlb([...e.target.files]); e.target.value = ''; };
    const ff = $('#files'); if (ff) ff.onchange = async e => {
      const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
      note('Đang xử lý ảnh...');
      const before = new Set(KB.Le.keys());
      await KB.In(files); saveImgFiles(files);
      const added = [...new Set(files.map(f => slug(f.name.replace(/\.[^.]+$/, '').split('__')[0])))].filter(n => KB.Le.has(n));
      const msgs = [];
      const sheet = !!($('#csheet') && $('#csheet').checked);
      for (const n of added) {
        if (sheet) { const k = await splitSheet(n); msgs.push(k ? 'Đã tách bảng của "' + n + '" thành ' + k + ' dáng: ' + SHEET.slice(0, k).map(x => SHEET_VN[x]).join(', ') + '. Bấm Xem thử để kiểm tra.' : 'Không tách được bảng dáng của "' + n + '". Hãy để các dáng cách xa nhau trên nền trơn.'); continue; }
        const k = await splitChar(n, before.has(n)); if (k > 1) msgs.push('Ảnh "' + n + '" có ' + k + ' hình nên mình đã tách thành ' + k + ' nhân vật: ' + Array.from({ length: k }, (_, i) => n + '-' + (i + 1)).join(', ') + '. Nếu đây là nhiều dáng của cùng 1 nhân vật, hãy Xóa rồi thêm lại và tick ô "Ảnh là bảng nhiều dáng".'); }
      bump(); KB.reload(); KB.Ut(); sel.clear(); touched.clear(); render();
      note(msgs.join(' ') || ('Đã thêm ' + added.join(', ') + '.'));
    };
    $('#cadd') && $('#cadd').addEventListener('click', () => setTimeout(() => { bump(); render(); }, 200));
    let tm = null; $('#code').addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { if (useMine()) renderMap(); }, 350); });
    new MutationObserver(() => { sel.clear(); touched.clear(); render(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return true;
  }

  async function restore() {
    try {
      for (const r of (await dbDo('glbs', 'readonly', s => s.getAll())) || []) glbs.set(r.id, { buffer: r.buffer, anims: r.anims || [], rev: 1 });
      bump(); KB.reload(); KB.Ut(); render();
    } catch (e) { /* khong luu duoc thi bo qua */ }
  }

  // ------------------------------------------------------------ thu vien code: xem & sua code moi nhan vat
  const S = { hero: '#ece6d6', line: '#7f7a6f', friend1: '#d8d1c2', friend2: '#c8c4bb', girlSkin: '#efe3d2', scarf: '#e8b33c', coat: '#4e6b52', capY: '#e8b33c', capB: '#3f7fd0', capR: '#c8463c' };
  const PRESET = {
    hero: { skin: S.hero }, band: { skin: S.hero, headband: true }, hoodie: { skin: S.hero, hood: true }, hooded: { skin: S.hero, hood: 'up' },
    friend: { skin: S.friend1, cap: S.capY }, friend2: { skin: S.friend2, cap: S.capB }, friend3: { skin: S.friend1, cap: S.capR },
    girl: { skin: S.girlSkin, hair: 'bob', scarf: S.scarf, shirt: S.coat }, mom: { skin: S.friend1, hair: 'bun', shirt: '#7b6a8a' },
    dad: { skin: S.friend2, glasses: true, shirt: '#4d5a6e' }, kid: { skin: S.hero, kid: true }, ghost: { skin: S.hero, ghost: true }, voice: { shadow: true },
  };
  const DESC = { hero: 'nhân vật chính, không áo', band: 'nhân vật chính đeo băng đô (lúc tập luyện)', hoodie: 'nhân vật chính mặc hoodie, mũ hạ sau cổ', hooded: 'nhân vật chính trùm mũ hoodie', friend: 'bạn đội mũ vàng', friend2: 'bạn đội mũ xanh', friend3: 'bạn đội mũ đỏ', girl: 'cô gái tóc bob, khăn vàng', mom: 'mẹ', dad: 'bố', kid: 'trẻ con', ghost: 'bóng ma mờ', voice: 'bóng đen cám dỗ' };
  const v = x => x === undefined || x === null ? 'null' : typeof x === 'string' ? "'" + x + "'" : String(x);
  function defaultCode(n) {
    const p = PRESET[n] || {};
    const row = (k, val, note) => '  ' + (k + ':').padEnd(10) + (val + ',').padEnd(12) + '// ' + note;
    return [
      '// Nhân vật mặc định "' + n + '" (' + (DESC[n] || '') + ').',
      '// Sửa các giá trị trong "look" rồi bấm Lưu & dùng. Màu viết dạng \'#rrggbb\'.',
      '// Muốn vẽ lại hoàn toàn: xoá hết và dán code nhân vật do AI viết (cùng kiểu với Bước 1).',
      'const look = {',
      row('skin', v(p.skin || (p.shadow ? null : S.hero)), 'màu da'),
      row('edge', v(p.shadow ? null : S.line), 'màu nét viền'),
      row('hood', v(p.hood || false), "true = hoodie mũ hạ, 'up' = trùm mũ, false = không"),
      row('shirt', v(p.shirt), 'màu áo (null = không áo)'),
      row('headband', v(!!p.headband), 'băng đô màu nhấn'),
      row('cap', v(p.cap), 'màu mũ lưỡi trai (null = không mũ)'),
      row('hair', v(p.hair), "kiểu tóc: 'bob' | 'bun' | null"),
      row('scarf', v(p.scarf), 'màu khăn quàng (null = không)'),
      row('glasses', v(!!p.glasses), 'đeo kính'),
      row('shoes', v(p.shoes), 'màu giày (null = không vẽ giày)'),
      row('kid', v(!!p.kid), 'dáng trẻ con, đầu nhỏ hơn'),
      row('ghost', v(!!p.ghost), 'bóng ma mờ'),
      row('shadow', v(!!p.shadow), 'true = bóng đen cám dỗ'),
      row('glow', v(p.glow), 'màu phát sáng của bóng đen (null = màu nhấn)'),
      '};',
      "return u.bean(g, x, y, h, Object.assign({}, o, look, { who: '' }));",
    ].join('\n');
  }
  const lmsg = (t, bad) => { const e = $('#clibMsg'); if (e) { e.textContent = t || ''; e.style.color = bad ? 'var(--bad)' : 'var(--mut)'; } };
  function libFill(keep) {
    const sel = $('#clibSel'); if (!sel) return;
    const A = KB.Ae(), cur = keep || sel.value || 'hoodie';
    const mine = Object.keys(A).filter(n => !DEFAULTS.includes(n));
    sel.innerHTML = '<optgroup label="Mặc định">' + DEFAULTS.map(n => '<option value="' + n + '">' + n + ' - ' + (DESC[n] || '') + (A[n] ? ' (đã sửa)' : '') + '</option>').join('') + '</optgroup>' +
      (mine.length ? '<optgroup label="Nhân vật của tôi">' + mine.map(n => '<option value="' + n + '">' + n + '</option>').join('') + '</optgroup>' : '');
    sel.value = [...sel.options].some(o => o.value === cur) ? cur : 'hoodie';
    libShow();
  }
  function libShow() {
    const n = $('#clibSel').value, A = KB.Ae(), isDef = DEFAULTS.includes(n);
    $('#clibCode').value = A[n] ? A[n].code : defaultCode(n);
    $('#clibReset').hidden = !(isDef && A[n]);
    $('#clibDel').hidden = isDef;
    lmsg(isDef ? (A[n] ? 'Đang dùng bản bạn đã sửa.' : 'Đang dùng bản gốc.') : 'Nhân vật của bạn.');
    libPrev(n, true);
  }
  function libPrev(n, quiet) {
    const cv = $('#clibPrev'); if (!cv || !KB.bean) return null;
    KB.Ut(); KB.errs().delete(n);
    const g = cv.getContext('2d'), P = ['stand', 'punch', 'cheer', 'wave', 'sitphone', 'slump'], F = ['neutral', 'determined', 'smile', 'smile', 'tired', 'sad'];
    const VN = { stand: 'đứng', punch: 'đấm', cheer: 'vui', wave: 'vẫy tay', sitphone: 'ngồi', slump: 'buồn' }, w = cv.width / P.length;
    cv.hidden = false; g.clearRect(0, 0, cv.width, cv.height);
    P.forEach((p, i) => {
      g.save(); g.beginPath(); g.rect(i * w, 0, w, cv.height); g.clip();
      try { KB.bean(g, i * w + w / 2, cv.height - 28, 160, { who: n, pose: p, face: F[i], t: 1.3, pkey: 'lib|' + n + '|' + p, hold: p === 'sitphone' ? 'phone' : undefined }); }
      catch (e) { KB.errs().set(n, e.message || String(e)); }
      g.restore(); g.fillStyle = '#9a9aa6'; g.font = '16px sans-serif'; g.textAlign = 'center'; g.fillText(VN[p], i * w + w / 2, cv.height - 6);
    });
    const err = KB.errs().get(n);
    if (err && !quiet) lmsg('Code lỗi: ' + err + '. Hãy sửa lại, hoặc dán lỗi này cho AI để sửa.', true);
    return err || null;
  }
  function libSave() {
    const n = $('#clibSel').value, code = $('#clibCode').value.trim(), A = KB.Ae();
    if (!code) { lmsg('Ô code đang trống.', true); return; }
    const isDef = DEFAULTS.includes(n);
    if (isDef && !A[n] && code === defaultCode(n).trim()) { lmsg('Code chưa thay đổi gì.'); return; }
    const old = A[n];
    A[n] = { code };
    const err = libPrev(n, true);
    if (err) { if (old) A[n] = old; else delete A[n]; KB.Ut(); lmsg('Chưa lưu vì code lỗi: ' + err, true); return; }
    KB.saveAe(); bump(); KB.reload(); KB.Ut(); KB.load();
    libFill(n); render();
    lmsg('Đã lưu. Phim và ảnh dùng "' + n + '" sẽ dùng bản này.');
  }
  function libReset() {
    const n = $('#clibSel').value, A = KB.Ae();
    if (!A[n]) return;
    delete A[n]; KB.saveAe(); bump(); KB.reload(); KB.Ut(); KB.load();
    libFill(n); lmsg('Đã khôi phục bản gốc của "' + n + '".');
  }
  function buildLib() {
    if (!$('#clib')) return;
    $('#clibSel').onchange = libShow;
    $('#clibSave').onclick = libSave;
    $('#clibPrevBtn').onclick = () => {
      const n = $('#clibSel').value, A = KB.Ae(), old = A[n];
      A[n] = { code: $('#clibCode').value };   // xem thu ban dang go, chua luu
      const err = libPrev(n, false);
      if (old) A[n] = old; else delete A[n]; KB.Ut();
      if (!err) lmsg('Đây là bản đang sửa (chưa lưu). Ưng thì bấm Lưu & dùng.');
    };
    $('#clibCopy').onclick = async () => { try { await navigator.clipboard.writeText($('#clibCode').value); lmsg('Đã chép code.'); } catch (e) { $('#clibCode').select(); lmsg('Hãy bấm giữ để chép thủ công.', true); } };
    $('#clibReset').onclick = libReset;
    $('#clibDel').onclick = () => {
      const b = $('#clibDel'), n = $('#clibSel').value;
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Bấm lần nữa để xóa'; setTimeout(() => { delete b.dataset.sure; b.textContent = '🗑 Xóa nhân vật'; }, 3000); return; }
      delete b.dataset.sure; b.textContent = '🗑 Xóa nhân vật';
      const A = KB.Ae(); delete A[n]; KB.saveAe(); bump(); KB.reload(); KB.Ut(); libFill('hoodie'); render(); lmsg('Đã xóa "' + n + '".');
    };
    $('#clib').addEventListener('toggle', () => { if ($('#clib').open) libFill(); });
    $('#cadd') && $('#cadd').addEventListener('click', () => setTimeout(() => libFill(), 250));
  }

  window.KaiUI = { render, promptExtra };
  if (build()) { buildLib(); render(); restore(); }
})();
