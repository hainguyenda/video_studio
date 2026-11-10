// Video Studio by Kai - "roi giay" tu dong: cat anh nhan vat thanh dau / than / 2 chan roi cu dong theo dang.
(function () {
  'use strict';
  const RIG = new WeakMap();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;

  // ------------------------------------------------------------ phan tich anh -> cac bo phan
  function rig(cv) {
    let r = RIG.get(cv);
    if (r) return r;
    const W = cv.width, H = cv.height;
    r = { W, H, ok: false };
    RIG.set(cv, r);
    if (W < 8 || H < 24 || W > H * 1.3) return r;          // anh nam ngang / qua nho: chi cu dong nhe
    const d = cv.getContext('2d').getImageData(0, 0, W, H).data, A = (x, y) => d[(y * W + x) * 4 + 3] > 40;
    const L = new Int32Array(H).fill(-1), R = new Int32Array(H).fill(-1), N = new Int32Array(H);
    let top = -1, bot = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) if (A(x, y)) { if (L[y] < 0) L[y] = x; R[y] = x; N[y]++; }
      if (N[y] > 1) { if (top < 0) top = y; bot = y; }
    }
    if (top < 0 || bot - top < 20) return r;
    const h = bot - top + 1;
    // co: hang hep nhat trong khoang 12%-40% chieu cao
    let neck = Math.round(top + h * .24), best = 1e9;
    for (let y = Math.round(top + h * .12); y <= Math.round(top + h * .4); y++) {
      let s = 0, k = 0;
      for (let j = -2; j <= 2; j++) { const yy = y + j; if (yy >= top && yy <= bot) { s += N[yy]; k++; } }
      s /= k || 1;
      if (s < best * .97) { best = s; neck = y; }
    }
    // hong: tu duoi len, tim khe ho giua 2 chan
    const cxs = [];
    for (let y = bot; y > bot - h * .15; y--) if (N[y]) cxs.push((L[y] + R[y]) / 2);
    let cx = cxs.length ? cxs.reduce((a, b) => a + b, 0) / cxs.length : W / 2;
    const gapAt = y => {
      if (N[y] < 2) return -1;
      let s = -1, bestLen = 0, bestMid = -1;
      const lo = Math.round(L[y] + (R[y] - L[y]) * .2), hi = Math.round(R[y] - (R[y] - L[y]) * .2);
      for (let x = lo; x <= hi + 1; x++) {
        const empty = x <= hi && !A(x, y);
        if (empty && s < 0) s = x;
        if (!empty && s >= 0) { if (x - s > bestLen) { bestLen = x - s; bestMid = (s + x - 1) / 2; } s = -1; }
      }
      return bestLen >= 1 ? bestMid : -1;
    };
    let hip = -1, gx = [];
    for (let y = bot - 1; y > top + h * .4; y--) {
      const g = gapAt(y);
      if (g < 0) { if (bot - y > h * .08) break; else continue; }
      hip = y; gx.push(g);
    }
    let split = true;
    if (hip < 0 || bot - hip < h * .14) { hip = Math.round(top + h * .6); split = false; }
    else {
      const near = gx.slice(-Math.max(1, gx.length >> 2));          // khe ho gan hong nhat
      cx = near.reduce((a, b) => a + b, 0) / near.length;
      hip = Math.max(Math.round(top + h * .42), hip - Math.round(h * .03));
    }
    const ov = Math.max(2, Math.round(h * .035));
    // ---- tay: tach 2 tay khoi than (theo mep ngoai cua hinh, tu vai xuong ban tay)
    const shY = Math.round(neck + (hip - neck) * .1), mask = new Uint8Array(W * H), arms = {};
    for (const side of [-1, 1]) {
      const edge = y => side < 0 ? L[y] : R[y];
      const run = y => { let x = edge(y), n = 0; while (x >= 0 && x < W && A(x, y)) { n++; x -= side; } let g = 0; while (x >= 0 && x < W && !A(x, y)) { g++; x -= side; } return { n, sep: g >= 1 && x >= 0 && x < W }; };
      const runs = [];
      for (let y = Math.round(shY + (hip - shY) * .45); y < hip; y += 2) if (N[y] > 1) { const q = run(y); if (q.sep && q.n < (R[y] - L[y]) * .4) runs.push(q.n); }
      let bw = 0; for (let y = shY; y < hip; y++) if (N[y] > 1) bw = Math.max(bw, R[y] - L[y]);
      runs.sort((a, b) => a - b);
      const med = runs.length >= 3 ? runs[runs.length >> 1] : 0, sep = med >= Math.max(6, bw * .1);
      const aw = sep ? med + 2 : Math.max(4, Math.round(bw * .22));
      let x0 = W, x1 = -1, y1 = shY;
      const take = (y, n) => { const e = edge(y); for (let i = 0; i < n; i++) { const x = e - side * i; if (x < 0 || x >= W) break; if (A(x, y)) { mask[y * W + x] = side < 0 ? 1 : 2; if (x < x0) x0 = x; if (x > x1) x1 = x; } } y1 = y; };
      for (let y = shY; y < hip; y++) if (N[y] > 1) take(y, aw);
      // duoi hong: chi lay phan nho ra ngoai ong quan (ban tay, co tay ao)
      let lo = side < 0 ? W : -1;
      for (let y = Math.round(hip + (bot - hip) * .4); y < Math.round(bot - (bot - hip) * .12); y++) if (N[y] > 1) lo = side < 0 ? Math.min(lo, L[y]) : Math.max(lo, R[y]);
      const outside = x => side < 0 ? x < lo - 1 : x > lo + 1;
      let started = false;
      for (let y = hip; y < Math.min(bot - h * .05, hip + h * .22); y++) {
        if (N[y] < 2) break;
        const e = edge(y);
        if (!outside(e - side * Math.max(2, aw * .15))) { if (started) break; else continue; }
        started = true;
        const q = run(y), n = q.sep && q.n <= aw * 1.3 ? q.n : aw;
        const e2 = edge(y); for (let i = 0; i < n; i++) { const x = e2 - side * i; if (x < 0 || x >= W || !outside(x)) break; if (A(x, y)) { mask[y * W + x] = side < 0 ? 1 : 2; if (x < x0) x0 = x; if (x > x1) x1 = x; } }
        y1 = y;
      }
      if (x1 < 0 || y1 - shY < h * .12) continue;
      let sx = 0, k = 0; for (let x = x0; x <= x1; x++) if (mask[(shY + 1) * W + x] === (side < 0 ? 1 : 2)) { sx += x; k++; }
      arms[side < 0 ? 'L' : 'R'] = { x0, x1, y0: shY, y1, px: k ? sx / k : (x0 + x1) / 2, py: shY + aw * .4, id: side < 0 ? 1 : 2 };
    }
    const src = document.createElement('canvas'); src.width = W; src.height = H;
    const sctx = src.getContext('2d'), body = sctx.createImageData(W, H);
    body.data.set(d);
    for (let i = 0; i < W * H; i++) if (mask[i]) body.data[i * 4 + 3] = 0;
    sctx.putImageData(body, 0, 0);
    for (const k of Object.keys(arms)) {
      const a = arms[k], aw2 = a.x1 - a.x0 + 1, ah = a.y1 - a.y0 + 1, im = new ImageData(aw2, ah);
      for (let y = 0; y < ah; y++) for (let x = 0; x < aw2; x++) { const si = (a.y0 + y) * W + a.x0 + x; if (mask[si] === a.id) for (let c = 0; c < 4; c++) im.data[(y * aw2 + x) * 4 + c] = d[si * 4 + c]; }
      const c = document.createElement('canvas'); c.width = aw2; c.height = ah; c.getContext('2d').putImageData(im, 0, 0);
      a.part = { c, x: a.x0, y: a.y0 };
    }
    r.arms = arms;
    const part = (x0, y0, x1, y1) => {
      x0 = clamp(Math.floor(x0), 0, W); x1 = clamp(Math.ceil(x1), 0, W); y0 = clamp(Math.floor(y0), 0, H); y1 = clamp(Math.ceil(y1), 0, H);
      const c = document.createElement('canvas'); c.width = Math.max(1, x1 - x0); c.height = Math.max(1, y1 - y0);
      c.getContext('2d').drawImage(src, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
      return { c, x: x0, y: y0 };
    };
    r.top = top; r.bot = bot; r.h = h; r.neck = neck; r.hip = hip; r.cx = cx; r.split = split;
    r.head = part(0, top, W, neck + ov);
    r.torso = part(0, neck, W, hip + ov + Math.round(h * .03));
    if (split) { r.legL = part(0, hip - ov, cx + 1, bot + 1); r.legR = part(cx, hip - ov, W, bot + 1); }
    else r.legs = part(0, hip - ov, W, bot + 1);
    // tam cua tung chan (de xoay quanh hong)
    const legCenter = (x0, x1) => { let s = 0, k = 0; for (let y = hip; y < Math.min(bot, hip + h * .1); y++) for (let x = x0; x < x1; x++) if (A(x, y)) { s += x; k++; } return k ? s / k : (x0 + x1) / 2; };
    r.lx = split ? legCenter(0, Math.floor(cx)) : cx; r.rx = split ? legCenter(Math.ceil(cx), W) : cx;
    r.ok = true;
    return r;
  }

  // ------------------------------------------------------------ dang -> thong so chuyen dong
  const SAD = /^(slump|sitsad|knees|kneel|headhold|facepalm|sad|cry|tired|lonely|down)$/;
  const SIT = /^(sit|sitdesk|sitphone|sitsad|crouch|knees|kneel)$/;
  const HAPPY = /^(cheer|win|fist|happy|grin|smile|lift|jump)$/;
  function target(o) {
    const t = o.t || 0, pose = String(o.pose || 'stand').toLowerCase(), face = String(o.face || '').toLowerCase();
    const p = { head: 0, headDY: 0, lean: 0, squash: 1, legL: 0, legR: 0, legK: 1, y: 0, rot: 0, sx: 1, aL: 0, aR: 0, kL: 1, kR: 1 };
    // goc tay: am = dua ra truoc (huong mat), tay trai duong = dang ra ngoai, tay phai am = dang ra ngoai
    const breath = Math.sin(t * 2.2 + (o.seed || 0));
    p.squash = 1 + .012 * breath;
    p.head = Math.sin(t * .9 + (o.seed || 0)) * .035;
    p.rot = Math.sin(t * .5 + (o.seed || 0)) * .012;
    const spd = +o.walk || +o.run || 0;
    if (spd || o.moving) {
      const run = !!o.run, ph = o.phase != null ? o.phase : t * (spd || 1) * 2.2 * 2;
      const amp = run ? .45 : .24, sw = Math.sin(ph);
      p.legL = sw * amp; p.legR = -sw * amp;
      p.y = -Math.abs(Math.cos(ph)) * (run ? .05 : .022);
      p.lean = run ? .14 : .05; p.head = -sw * .04; p.rot = 0;
      p.squash = 1 + Math.abs(Math.cos(ph)) * (run ? .025 : .012);
    } else if (SIT.test(pose)) {
      p.legK = pose === 'kneel' ? .4 : pose === 'crouch' ? .45 : .55;
      p.legL = -.22; p.legR = .22; p.rot *= .5;
      if (pose === 'sitphone' || pose === 'sitdesk') { p.head = .16; p.headDY = .012; }
    } else if (pose === 'lie' || pose === 'pushup') {
      p.rot = -Math.PI / 2 * .96; p.y = 0;
    } else if (HAPPY.test(pose)) {
      const j = Math.max(0, Math.sin(t * 6.5));
      p.y = -j * .1; p.squash = 1 + (j > .05 ? .03 : -.04) * (1 - j);
      p.legL = -j * .16; p.legR = j * .16; p.head = Math.sin(t * 6.5) * .06;
    } else if (pose === 'wave' || pose === 'point' || pose === 'reach' || pose === 'open' || pose === 'shrug' || pose === 'think' || pose === 'hug' || pose === 'arms') {
      p.rot = Math.sin(t * 3) * .03; p.head = .08 + Math.sin(t * 3) * .03;
    } else if (pose === 'punch' || pose === 'guard') {
      p.lean = .06 + Math.max(0, Math.sin(t * 8)) * .1; p.legL = -.12; p.legR = .12;
    } else if (pose === 'phone') {
      p.head = .14; p.headDY = .012; p.lean = .03;
    }
    // ---- tay
    const sw2 = Math.sin(t * 1.3 + (o.seed || 0)) * .04;
    p.aL = .05 + sw2; p.aR = -.05 - sw2;
    if (spd || o.moving) { const ph = o.phase != null ? o.phase : t * (spd || 1) * 4.4, a = o.run ? .7 : .4; p.aL = -Math.sin(ph) * a; p.aR = Math.sin(ph) * a; if (o.run) { p.kL = p.kR = .8; } }
    else if (pose === 'punch') { const j = Math.max(0, Math.sin(t * 8)), j2 = Math.max(0, Math.sin(t * 8 + Math.PI)); p.aR = -1.45 - j * .15; p.kR = .6 + j * .55; p.aL = -1.35 - j2 * .15; p.kL = .55 + j2 * .5; p.head -= .04; }
    else if (pose === 'guard') { p.aR = -1.9; p.kR = .55; p.aL = -1.7; p.kL = .5; }
    else if (pose === 'cheer' || pose === 'win') { const w = Math.sin(t * 9) * .15; p.aL = 2.75 + w; p.aR = -2.75 - w; }
    else if (pose === 'fist' || pose === 'lift') { p.aR = -2.9 + Math.sin(t * 7) * .12; p.aL = pose === 'lift' ? 2.9 : .1; }
    else if (pose === 'wave') { p.aR = -2.55 + Math.sin(t * 9) * .35; }
    else if (pose === 'point' || pose === 'reach') { p.aR = -1.5 + Math.sin(t * 2) * .04; if (pose === 'reach') p.aL = -1.35; }
    else if (pose === 'phone' || pose === 'sitphone') { p.aR = -.55; p.kR = .7; p.aL = -.45; p.kL = .7; }
    else if (pose === 'headhold' || pose === 'facepalm') { p.aR = -2.55; p.kR = .62; if (pose === 'headhold') { p.aL = 2.55; p.kL = .62; } }
    else if (pose === 'arms' || pose === 'hug') { p.aL = -.85; p.aR = .85; p.kL = p.kR = .62; }
    else if (pose === 'shrug') { const s2 = Math.abs(Math.sin(t * 2.5)) * .2; p.aL = .75 + s2; p.aR = -.75 - s2; p.kL = p.kR = .7; }
    else if (pose === 'open') { p.aL = .6; p.aR = -.6; }
    else if (pose === 'think') { p.aR = -2.3; p.kR = .55; }
    else if (pose === 'sitdesk') { p.aR = -1.2; p.aL = -1.1; p.kL = p.kR = .7; }
    else if (pose === 'umbrella' || pose === 'carry') { p.aR = -1.1; p.kR = .7; }
    else if (pose === 'pushup' || pose === 'climb') { p.aL = 3; p.aR = -3; }
    if (SAD.test(pose) || SAD.test(face)) {
      p.head += .14; p.headDY += .018; p.squash *= .965; p.lean += .05;
      if (face === 'cry' || pose === 'facepalm' || pose === 'headhold') { p.head += Math.sin(t * 13) * .03; p.y += Math.sin(t * 11) * .003; }
    }
    if (face === 'angry' || face === 'determined') { p.lean += .05; p.head -= .05; }
    if ((face === 'happy' || face === 'smile' || face === 'grin') && !HAPPY.test(pose) && !(spd || o.moving)) p.y -= Math.max(0, Math.sin(t * 5)) * .012;
    return p;
  }

  const STATE = new Map();
  function smooth(key, p, t) {
    if (!key) return p;
    const s = STATE.get(key);
    if (!s || t < s.t || t - s.t > .25) { STATE.set(key, { t, p: { ...p } }); return p; }
    const k = 1 - Math.exp(-(t - s.t) * 9);
    for (const n in p) if (!/^(legL|legR|y|head|aL|aR|kL|kR)$/.test(n)) s.p[n] = lerp(s.p[n], p[n], k); else s.p[n] = lerp(s.p[n], p[n], Math.min(1, k * 2.5));
    s.t = t;
    return { ...s.p };
  }

  // ------------------------------------------------------------ ve
  // ctx: da dat goc toa do o giua ban chan, don vi = pixel anh * sc. Ve anh cao h (pixel man hinh).
  function draw(ctx, cv, o) {
    o = o || {};
    const r = rig(cv), sc = o.h / (r.ok ? r.h : cv.height);
    if (!r.ok || o.light) {
      const p = target({ ...o, pose: 'stand', walk: 0, run: 0, moving: false });
      const bob = (o.moving || +o.walk || +o.run) ? -Math.abs(Math.sin(o.phase != null ? o.phase : (o.t || 0) * 4.4)) * .025 * o.h : 0;
      ctx.save(); ctx.translate(0, bob); ctx.rotate(p.rot * .6); ctx.scale(1, p.squash);
      const w = cv.width * o.h / cv.height; ctx.drawImage(cv, -w / 2, -o.h, w, o.h); ctx.restore();
      return { headY: -o.h * .88 + bob };
    }
    const p = smooth(o.key, target(o), o.t || 0);
    const legLen = (r.bot - r.hip) * sc, k = p.legK;
    ctx.save();
    ctx.translate(0, p.y * o.h);
    ctx.rotate(p.rot);
    // hong o do cao: chan ngan lai khi ngoi
    const hipY = -legLen * k;
    const at = (pt, px, py) => ctx.drawImage(pt.c, (pt.x - px) * sc, (pt.y - py) * sc, pt.c.width * sc, pt.c.height * sc);
    // chan
    const leg = (pt, pivotX, ang) => {
      ctx.save(); ctx.translate((pivotX - r.cx) * sc, hipY); ctx.rotate(ang); ctx.scale(1, k);
      at(pt, pivotX, r.hip); ctx.restore();
    };
    if (r.split) { leg(r.legL, r.lx, p.legL); leg(r.legR, r.rx, p.legR); }
    else { ctx.save(); ctx.translate(0, hipY); ctx.rotate((p.legL - p.legR) * .08); ctx.scale(1 + Math.abs(p.legL) * .05, k); at(r.legs, r.cx, r.hip); ctx.restore(); }
    // than + dau xoay quanh hong
    ctx.translate(0, hipY);
    ctx.rotate(p.lean);
    ctx.scale(1, p.squash);
    const arm = (a, ang, k2) => {
      if (!a) return;
      ctx.save(); ctx.translate((a.px - r.cx) * sc, (a.py - r.hip) * sc); ctx.rotate(ang); ctx.scale(1, k2);
      at(a.part, a.px, a.py); ctx.restore();
    };
    const AR = r.arms || {};
    arm(AR.L, p.aL, p.kL);                 // tay sau: ve truoc than
    at(r.torso, r.cx, r.hip);
    const neckY = (r.neck - r.hip) * sc;
    ctx.save();
    ctx.translate(0, neckY + p.headDY * o.h);
    ctx.rotate(p.head);
    at(r.head, r.cx, r.neck);
    ctx.restore();
    arm(AR.R, p.aR, p.kR);                 // tay truoc: ve sau cung
    ctx.restore();
    return { headY: p.y * o.h + hipY + neckY - (r.neck - r.top) * sc * .6 };
  }

  window.KaiPuppet = { rig, draw, target };
})();
