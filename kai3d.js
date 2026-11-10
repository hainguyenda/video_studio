// Video Studio by Kai - bo ve 3D (tpl "scene3d").
// Ve bang Three.js, khong ton credit. Moi khung hinh chi phu thuoc thoi gian t,
// nen xem truoc, tua va xuat MP4 deu cho ra cung mot hinh.
import * as THREE from './lib/three/three.module.min.js';
import { GLTFLoader } from './lib/three/loaders/GLTFLoader.js';
import { clone as skClone } from './lib/three/utils/SkeletonUtils.js';

const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const easeIO = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1000003) / 1000003; }; }
const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

// ---------------------------------------------------------------- renderer
let renderer = null, glCanvas = null;
function getRenderer(w, h) {
  if (!renderer) {
    glCanvas = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  if (glCanvas.width !== w || glCanvas.height !== h) renderer.setSize(w, h, false);
  return renderer;
}

// ---------------------------------------------------------------- helpers
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function glowTex(color) {
  return canvasTex(128, 128, (g, w) => {
    const c = new THREE.Color(color), r = c.r * 255 | 0, gg = c.g * 255 | 0, b = c.b * 255 | 0;
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(.25, `rgba(${r},${gg},${b},.55)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
}
function clay(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? .82, metalness: o.metal ?? 0, emissive: o.emissive || '#000000', emissiveIntensity: o.ei ?? 1, emissiveMap: o.emissiveMap || null, map: o.map || null, side: o.side ?? THREE.FrontSide, transparent: !!o.transparent, opacity: o.opacity ?? 1 });
}
function mesh(geo, mat, x = 0, y = 0, z = 0, cast = true, recv = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; return m;
}
const box = (w, h, d, mat, x, y, z, cast, recv) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, cast, recv);
const cyl = (rt, rb, h, mat, x, y, z, seg = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
const sph = (r, mat, x, y, z, seg = 24) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * .66 | 0)), mat, x, y, z);
const cap = (r, len, mat, x, y, z) => mesh(new THREE.CapsuleGeometry(r, len, 8, 16), mat, x, y, z);
function glowSprite(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(color), color: '#ffffff', transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1); return s;
}
function pointLight(color, intensity, dist, x, y, z, shadow) {
  const l = new THREE.PointLight(color, intensity, dist, 2); l.position.set(x, y, z);
  if (shadow) { l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.004; l.shadow.radius = 4; }
  return l;
}
function dirLight(color, intensity, from, to = [0, 0, 0], shadow = true, span = 7) {
  const l = new THREE.DirectionalLight(color, intensity); l.position.set(...from); l.target.position.set(...to);
  if (shadow) {
    l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0006; l.shadow.normalBias = .02; l.shadow.radius = 5;
    const c = l.shadow.camera; c.left = -span; c.right = span; c.top = span; c.bottom = -span; c.near = .5; c.far = 60;
  }
  return l;
}
function spotLight(color, intensity, pos, target, angle = 34, shadow = true) {
  const l = new THREE.SpotLight(color, intensity, 0, angle * D2R, .55, 2); l.position.set(...pos); l.target.position.set(...target);
  if (shadow) { l.castShadow = true; l.shadow.mapSize.set(1536, 1536); l.shadow.bias = -0.0008; l.shadow.radius = 5; }
  return l;
}

// sky / textures ----------------------------------------------------------
const SKIES = {
  night: ['#05060d', '#121a33', '#22305a'], dawn: ['#2a3a78', '#a05a8a', '#ffa45a'], dusk: ['#14163a', '#6a3a6a', '#ff7a4a'],
  day: ['#4a86c8', '#8fbbe6', '#d8ecf8'], rain: ['#0a0c12', '#1a2030', '#2a3448'], dark: ['#020203', '#07070b', '#0d0d14'], moon: ['#05060d', '#121a33', '#22305a'],
};
function skyTex(kind = 'night', opts = {}) {
  const cols = SKIES[kind] || SKIES.night;
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, cols[0]); gr.addColorStop(.6, cols[1]); gr.addColorStop(1, cols[2]);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(11);
    if (kind === 'night' || kind === 'moon' || kind === 'dark') for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${.2 + r() * .7})`; const s = r() < .1 ? 2.4 : 1.2; g.fillRect(r() * w, r() * h * .8, s, s); }
    if (opts.moon !== false && (kind === 'night' || kind === 'moon')) {
      const mx = w * (opts.mx ?? .68), my = h * (opts.my ?? .3);
      const gl = g.createRadialGradient(mx, my, 0, mx, my, 90); gl.addColorStop(0, 'rgba(220,230,255,.45)'); gl.addColorStop(1, 'rgba(220,230,255,0)');
      g.fillStyle = gl; g.fillRect(0, 0, w, h); g.fillStyle = '#f3efe2'; g.beginPath(); g.arc(mx, my, 34, 0, 7); g.fill();
    }
    if (kind === 'dawn' || kind === 'dusk') { const gl = g.createRadialGradient(w * .5, h, 0, w * .5, h, 260); gl.addColorStop(0, 'rgba(255,210,140,.9)'); gl.addColorStop(1, 'rgba(255,210,140,0)'); g.fillStyle = gl; g.fillRect(0, 0, w, h); }
    if (kind === 'rain') { g.strokeStyle = 'rgba(180,200,230,.25)'; g.lineWidth = 1.5; for (let i = 0; i < 140; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + 26); g.stroke(); } }
  });
}
function windowsTex(seed, cols = 6, rows = 12, litRatio = .35, warm = '#ffcf7a') {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const r = rng(seed), cw = w / cols, rh = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (r() > litRatio) { g.fillStyle = '#0b0c12'; } else { g.fillStyle = r() < .75 ? warm : '#9fc4ff'; }
      g.fillRect(x * cw + cw * .22, y * rh + rh * .2, cw * .56, rh * .55);
    }
  });
}
function clockTex(timeStr = '3:17') {
  const [hh, mm] = String(timeStr).split(':').map(n => parseInt(n, 10) || 0);
  return canvasTex(256, 256, (g, w) => {
    const c = w / 2; g.fillStyle = '#e9e5da'; g.beginPath(); g.arc(c, c, c - 4, 0, 7); g.fill();
    g.strokeStyle = '#2a2a30'; g.lineWidth = 10; g.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = i % 3 ? 4 : 8; g.beginPath(); g.moveTo(c + Math.sin(a) * (c - 22), c - Math.cos(a) * (c - 22)); g.lineTo(c + Math.sin(a) * (c - 40), c - Math.cos(a) * (c - 40)); g.stroke(); }
    const ha = ((hh % 12) + mm / 60) / 12 * Math.PI * 2, ma = mm / 60 * Math.PI * 2; g.lineCap = 'round';
    g.lineWidth = 12; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(ha) * c * .45, c - Math.cos(ha) * c * .45); g.stroke();
    g.lineWidth = 7; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(ma) * c * .7, c - Math.cos(ma) * c * .7); g.stroke();
    g.fillStyle = '#2a2a30'; g.beginPath(); g.arc(c, c, 10, 0, 7); g.fill();
  });
}
function calendarTex(cal, accent) {
  const month = (cal && cal.month) || 'OCT', fill = num(cal && cal.fill, 0), mode = (cal && cal.mode) || 'x', col = (cal && cal.color) || accent;
  return canvasTex(256, 300, (g, w, h) => {
    g.fillStyle = '#ece8de'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2a30'; g.fillRect(0, 0, w, 62);
    g.fillStyle = '#ffffff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText(month, w / 2, 46);
    const cw = w / 7, rh = (h - 72) / 5;
    for (let i = 0; i < 31; i++) {
      const x = (i % 7) * cw, y = 72 + Math.floor(i / 7) * rh;
      g.strokeStyle = '#c9c4b8'; g.lineWidth = 2; g.strokeRect(x + 2, y + 2, cw - 4, rh - 4);
      if (i < fill) {
        g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5;
        if (mode === 'fill') { g.globalAlpha = .8; g.fillRect(x + 5, y + 5, cw - 10, rh - 10); g.globalAlpha = 1; }
        else { g.beginPath(); g.moveTo(x + 8, y + 8); g.lineTo(x + cw - 8, y + rh - 8); g.moveTo(x + cw - 8, y + 8); g.lineTo(x + 8, y + rh - 8); g.stroke(); }
      }
    }
  });
}
function plankTex(base = '#2c2620') {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(5);
    for (let y = 0; y < h; y += 64) { g.fillStyle = `rgba(0,0,0,${.15 + r() * .15})`; g.fillRect(0, y, w, 3); for (let x = (r() * 200) | 0; x < w; x += 220 + r() * 80) g.fillRect(x, y, 3, 64); g.fillStyle = `rgba(255,255,255,${r() * .04})`; g.fillRect(0, y + 3, w, 61); }
  }, [3, 3]);
}
function brickTex(base = '#3b2a26') {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#1b1514'; g.fillRect(0, 0, w, h); const r = rng(9);
    for (let y = 0, row = 0; y < h; y += 32, row++) for (let x = row % 2 ? -32 : 0; x < w; x += 64) {
      const c = new THREE.Color(base).offsetHSL(0, 0, (r() - .5) * .06); g.fillStyle = '#' + c.getHexString(); g.fillRect(x + 2, y + 2, 60, 28);
    }
  }, [4, 2]);
}

// ---------------------------------------------------------------- sets
// Moi bo canh tra ve { anchors, cam, ground(x,z), stageZ, update(t) }
let STAGE_W = 8;
function stageX(x) { return (x - .5) * STAGE_W; }

function setBedroom(S, a, ctx) {
  const sky = a.sky || 'night', lamp = a.lamp !== false, room = new THREE.Group(); S.add(room);
  S.background = new THREE.Color('#0b0c12');
  const wallM = clay('#1f2232'), wall2 = clay('#1a1c2a');
  const floor = box(10, .1, 6, clay('#2c2620', { map: plankTex() }), 0, -.05, -.4, false, true); room.add(floor);
  room.add(box(10, 3.6, .1, wallM, 0, 1.8, -2.45, false, true));
  room.add(box(.1, 3.6, 6, wall2, -4.3, 1.8, -.4, false, true));
  room.add(box(10, .12, .06, clay('#2f3346'), 0, .06, -2.38, false, true)); // chan tuong
  // cua so + troi
  const wx = num(a.windowX, .6);
  if (a.window !== false) {
    const sk = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), new THREE.MeshBasicMaterial({ map: skyTex(sky === 'day' ? 'day' : sky, { mx: .65, my: .3 }), toneMapped: false }));
    sk.position.set(wx, 1.8, -2.39); room.add(sk);
    const fm = clay('#c9ccd4', { rough: .5 });
    room.add(box(1.62, .07, .08, fm, wx, 2.43, -2.36), box(1.62, .07, .08, fm, wx, 1.17, -2.36), box(.07, 1.3, .08, fm, wx - .78, 1.8, -2.36), box(.07, 1.3, .08, fm, wx + .78, 1.8, -2.36), box(.04, 1.2, .05, fm, wx, 1.8, -2.36), box(1.6, .05, .25, fm, wx, 1.15, -2.28));
  }
  // giuong
  const bedM = clay('#3b3530'), sheet = clay('#d8d2c4'), blanket = clay(a.blanket || '#3d4f73');
  const bx = -2.45 + num(a.bedX, 0);
  room.add(box(2.4, .32, 1.25, bedM, bx, .16, -1.75), box(.12, 1.05, 1.25, bedM, bx - 1.2, .52, -1.75));
  room.add(box(2.28, .2, 1.15, sheet, bx, .42, -1.75), box(.5, .16, .8, clay('#ece8de'), bx - .88, .6, -1.75));
  const occupied = !!ctx.occupied;
  if (occupied) { const bl = cap(.29, 1.2, blanket, bx + .3, .84, -1.75); bl.rotation.z = Math.PI / 2; bl.scale.set(1, 1, 1.9); room.add(bl); }
  else room.add(box(1.45, .1, 1.18, blanket, bx + .35, .57, -1.75));
  // ban + ghe + den + laptop
  const dx = 2.55;
  if (a.desk !== false) {
    const dm = clay('#3a332d');
    room.add(box(1.7, .07, .8, dm, dx, .78, -1.9));
    for (const [ox, oz] of [[-.78, -.32], [.78, -.32], [-.78, .32], [.78, .32]]) room.add(box(.06, .76, .06, dm, dx + ox, .38, -1.9 + oz));
    room.add(box(.55, .06, .55, dm, dx, .46, -1.05), box(.55, .6, .06, dm, dx, .78, -.8), box(.05, .44, .05, dm, dx, .22, -1.05));
    if (a.laptop) {
      const on = a.laptop !== 'off';
      room.add(box(.5, .03, .34, clay('#9aa0ab', { rough: .4, metal: .3 }), dx + .25, .83, -1.8));
      const scr = box(.5, .32, .02, clay('#1a1d24', { emissive: on ? '#7fa8ff' : '#000', ei: on ? 1.6 : 0 }), dx + .25, 1.0, -1.97); scr.rotation.x = -.15; room.add(scr);
      if (on) room.add(pointLight('#8fb0ff', 2.2, 4, dx + .25, 1.05, -1.6));
    }
    if (lamp) {
      const lm = clay('#2b2b30');
      room.add(cyl(.12, .14, .04, lm, dx - .6, .83, -2.05), cyl(.018, .018, .5, lm, dx - .6, 1.08, -2.05));
      const shade = mesh(new THREE.ConeGeometry(.2, .22, 24, 1, true), clay('#e8d9b0', { emissive: '#ffcf7a', ei: .9, side: THREE.DoubleSide }), dx - .6, 1.36, -2.05); room.add(shade);
      const bulb = glowSprite('#ffc56b', 1.6, .7); bulb.position.set(dx - .6, 1.3, -2.0); room.add(bulb);
      room.add(pointLight('#ffc070', 9, 9, dx - .6, 1.28, -1.95, true));
    }
  }
  // dong ho
  const clockG = new THREE.Group(); clockG.position.set(-1.05, 2.4, -2.36); room.add(clockG);
  const face = new THREE.Mesh(new THREE.CircleGeometry(.24, 40), clay('#ffffff', { map: clockTex(a.clock || '3:17'), rough: .6 })); face.position.z = .035; clockG.add(face);
  const rim = cyl(.27, .27, .06, clay('#2a2a30'), 0, 0, 0, 40); rim.rotation.x = Math.PI / 2; clockG.add(rim);
  // lich
  if (a.calendar !== false) {
    const cal = new THREE.Mesh(new THREE.PlaneGeometry(.56, .66), clay('#ffffff', { map: calendarTex(a.calendar, ctx.accent), rough: .9 })); cal.position.set(1.75, 1.95, -2.38); room.add(cal);
  }
  // tham + ke sach
  const rug = cyl(1.3, 1.3, .02, clay('#3e3346'), .3, .01, -.2, 40); rug.scale.z = .6; rug.castShadow = false; room.add(rug);
  room.add(box(.3, .06, 1.2, clay('#3a332d'), -4.12, 1.75, -1.2));
  const bc = ['#7a4b4b', '#4b6b7a', '#c9a35a', '#5a7a4b'];
  bc.forEach((c, i) => room.add(box(.18, .26 + (i % 2) * .06, .08, clay(c), -4.12, 1.92 + (i % 2) * .03, -1.6 + i * .12)));
  // anh sang
  const moonCol = sky === 'dawn' ? '#ffb07a' : sky === 'day' ? '#fff3dc' : '#8fa8ff';
  const moonI = sky === 'day' ? 2.2 : sky === 'dawn' ? 1.4 : lamp ? .55 : 1.1;
  const ml = dirLight(moonCol, moonI, [wx + 1.5, 4.5, -7], [wx - .6, 0, .5], true, 6); S.add(ml, ml.target);
  S.add(new THREE.HemisphereLight(sky === 'day' ? '#b8c8e8' : '#4a5a8a', '#1a1410', sky === 'day' ? .9 : .38));
  const ringOn = !!a.ring;
  return {
    anchors: {
      'bed.sit': { x: bx + .35, z: -1.22, seat: .54 }, 'bed.lie': { x: bx + .95, z: -1.75, y: .56, lie: true }, 'bed.head': { x: bx - .7, z: -1.22, seat: .54 },
      'desk.seat': { x: dx, z: -1.02, seat: .5, rot: 160 }, desk: { x: dx - .2, z: -1.15 }, window: { x: wx, z: -1.6, rot: 180 }, clock: { x: -1.05, z: -1.4 }, center: { x: 0, z: -.3 }, door: { x: -3.4, z: -.4 },
    },
    cam: { target: [0, 1.05, -1.0], dist: 6.4, el: 9 }, stageZ: -.4,
    update(t) { if (ringOn) clockG.rotation.z = Math.sin(t * 55) * .06 * (Math.sin(t * 3) > 0 ? 1 : 0); },
  };
}

function cityRow(S, seed, z, count, xSpan, hMin, hMax, colBase, lit) {
  const g = new THREE.Group(); S.add(g); const r = rng(seed); let x = -xSpan;
  const items = [];
  while (x < xSpan) {
    const w = 2 + r() * 3, h = hMin + r() * (hMax - hMin), d = 2 + r() * 2;
    const tex = windowsTex(seed * 100 + items.length, Math.max(3, w * 1.6 | 0), Math.max(5, h * 1.3 | 0), lit);
    const m = clay(colBase, { emissive: '#ffffff', emissiveMap: tex, ei: 1.15, rough: .9 });
    const b = box(w, h, d, m, x + w / 2, h / 2, z - d / 2 - r() * 1.2, false, false); g.add(b); items.push(b); x += w + .15 + r() * .6;
  }
  return { group: g, items, span: xSpan * 2 };
}

function setStreet(S, a, ctx) {
  S.background = new THREE.Color('#080a12'); S.fog = new THREE.Fog('#0a0c16', 9, 34);
  const rain = !!a.rain, wet = rain || a.wet;
  S.add(box(60, .1, 30, clay('#16181e', { rough: wet ? .18 : .7, metal: wet ? .5 : 0 }), 0, -.05, 0, false, true));
  S.add(box(60, .16, 3, clay('#2a2c33', { rough: wet ? .3 : .85, metal: wet ? .3 : 0 }), 0, .08, -3.1, false, true));
  S.add(box(60, .17, .12, clay('#3a3d46'), 0, .085, -1.6, false, true));
  for (let i = -6; i <= 6; i++) S.add(box(1.2, .012, .14, clay('#5a5c66'), i * 2.6, .006, 1.6, false, true));
  const back = cityRow(S, 3, -4.6, 14, 30, 4, 11, '#1b1e29', .32);
  const far = cityRow(S, 7, -14, 14, 40, 8, 22, '#141724', .22);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(120, 50), new THREE.MeshBasicMaterial({ map: skyTex(a.time === 'dusk' ? 'dusk' : a.time === 'dawn' ? 'dawn' : 'night', { mx: .62, my: .25 }), fog: false, toneMapped: false }));
  sky.position.set(0, 18, -40); S.add(sky);
  // cot den
  const lamps = (a.lamps || [-3.2, 3.2]).map(v => (v <= 1.5 && v >= -.5 ? stageX(v) : v));
  const pole = clay('#22242b', { rough: .5, metal: .4 }), lampG = new THREE.Group(); S.add(lampG);
  lamps.forEach((lx, i) => {
    lampG.add(cyl(.05, .07, 3.6, pole, lx, 1.8, -2.4), box(.6, .06, .08, pole, lx + .3, 3.58, -2.4), box(.28, .1, .2, clay('#2a2a30'), lx + .55, 3.52, -2.4));
    const gl = glowSprite('#ffc878', 1.6, .85); gl.position.set(lx + .55, 3.42, -2.38); lampG.add(gl);
    const sl = spotLight('#ffcf8a', 26, [lx + .55, 3.45, -2.4], [lx + .55, 0, -1.2], 40, i === 0); S.add(sl, sl.target);
  });
  // cua neon (cam do)
  if (a.neonDoor != null) {
    const nx = a.neonDoor <= 1.5 ? stageX(a.neonDoor) : a.neonDoor;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), new THREE.MeshBasicMaterial({ color: ctx.accent, toneMapped: false })); door.position.set(nx, 1.2, -4.55); S.add(door);
    const fr = clay('#0d0d12', { emissive: ctx.accent, ei: 2 }); S.add(box(1.3, .08, .06, fr, nx, 2.3, -4.52), box(.08, 2.2, .06, fr, nx - .65, 1.2, -4.52), box(.08, 2.2, .06, fr, nx + .65, 1.2, -4.52));
    const g2 = glowSprite(ctx.accent, 5, .6); g2.position.set(nx, 1.3, -4.3); S.add(g2);
    S.add(pointLight(ctx.accent, 14, 9, nx, 1.4, -3.6));
  }
  S.add(new THREE.HemisphereLight('#3a4a7a', '#0a0a10', .5));
  const fill = dirLight('#7f93c9', .55, [-5, 7, 6], [0, 0, -1], true, 8); S.add(fill, fill.target);
  const scroll = num(a.scroll, 0);
  return {
    anchors: { center: { x: 0, z: -.2 }, sidewalk: { x: 0, z: -2.5, y: .16 }, lamp: { x: lamps[0] + .4, z: -1.9, y: .16 }, neon: { x: (a.neonDoor != null ? (a.neonDoor <= 1.5 ? stageX(a.neonDoor) : a.neonDoor) : 2) - .9, z: -3.3, y: .16 } },
    cam: { target: [0, 1.1, -.8], dist: 7, el: 7 }, stageZ: -.2, rain,
    update(t) {
      if (!scroll) return;
      const off = (L, v) => (((-v * t) % L) + L) % L;
      back.group.position.x = off(20, scroll) - 10; far.group.position.x = off(40, scroll * .35) - 20; lampG.position.x = off(6.4, scroll) - 3.2;
    },
  };
}

function setRooftop(S, a, ctx) {
  S.background = new THREE.Color('#06070e'); S.fog = new THREE.Fog('#0d1022', 14, 80);
  const fl = clay('#25262c', { rough: .9 });
  S.add(box(16, .2, 9, fl, 0, -.1, -.5, false, true));
  S.add(box(16, .55, .22, clay('#33343c'), 0, .27, -3.4), box(16, .05, .3, clay('#c9ccd4', { rough: .5 }), 0, .57, -3.4));
  const tm = clay('#2e3038');
  const tank = cyl(.75, .75, 1.4, tm, 3.6, 1.6, -2.3); S.add(tank);
  for (const [ox, oz] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) S.add(box(.08, .9, .08, tm, 3.6 + ox, .45, -2.3 + oz));
  S.add(box(1.1, .7, .8, clay('#3a3c46'), -3.4, .35, -2.4), cyl(.25, .25, .05, clay('#22242a'), -3.4, .72, -2.4));
  S.add(cyl(.02, .02, 2.6, clay('#22242a'), -2.4, 1.3, -3.0));
  const blink = sph(.05, new THREE.MeshBasicMaterial({ color: ctx.accent, toneMapped: false }), -2.4, 2.62, -3.0); S.add(blink);
  cityRow(S, 21, -14, 14, 50, 6, 26, '#151826', .28); cityRow(S, 33, -30, 14, 70, 14, 46, '#10131f', .2);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(220, 90), new THREE.MeshBasicMaterial({ map: skyTex(a.sky || 'night', { moon: false }), fog: false, toneMapped: false })); sky.position.set(0, 30, -75); S.add(sky);
  const moon = sph(5, new THREE.MeshBasicMaterial({ color: '#f3efe2', fog: false, toneMapped: false }), 14, 20, -70); S.add(moon);
  const mg = glowSprite('#c8d6ff', 34, .55); mg.material.fog = false; mg.position.set(14, 20, -69); S.add(mg);
  const key = dirLight('#a9bbff', 1.6, [8, 9, -12], [0, 0, 0], true, 7); S.add(key, key.target);
  S.add(new THREE.HemisphereLight('#3a4a80', '#2a1a1a', .55));
  const front = dirLight('#ffb27a', .45, [-4, 3, 8], [0, 1, 0], false); S.add(front, front.target);
  return {
    anchors: { center: { x: 0, z: -.4 }, edge: { x: 0, z: -2.75, rot: 180 }, tank: { x: 2.4, z: -1.6 } },
    cam: { target: [0, 1.15, -1.4], dist: 6.6, el: 8 }, stageZ: -.4,
    update(t) { blink.visible = (t % 1.6) < .8; },
  };
}

function setGym(S, a, ctx) {
  S.background = new THREE.Color('#0c0c10'); S.fog = new THREE.Fog('#0c0c10', 9, 22);
  S.add(box(14, .1, 9, clay('#202227', { rough: .95 }), 0, -.05, -.5, false, true));
  S.add(box(14, 4, .1, clay('#ffffff', { map: brickTex() }), 0, 2, -3.1, false, true));
  S.add(box(.1, 4, 9, clay('#1d1e24'), -5, 2, -.5, false, true));
  const bagX = num(a.bagX, 1.95), swing = num(a.swing, .6);
  const bagG = new THREE.Group(); bagG.position.set(bagX, 3.4, -1.25); S.add(bagG);
  bagG.add(cyl(.012, .012, .9, clay('#888', { metal: .7, rough: .3 }), 0, -.45, 0, 8));
  bagG.add(cap(.27, .75, clay('#7a2e2b', { rough: .55 }), 0, -1.55, 0));
  bagG.add(cyl(.28, .28, .06, clay('#2a2a30'), 0, -1.08, 0), cyl(.28, .28, .06, clay('#2a2a30'), 0, -2.02, 0));
  // gia ta
  const rm = clay('#2a2c33', { metal: .4, rough: .5 }); S.add(box(1.6, .05, .4, rm, -3.3, .5, -2.6), box(1.6, .05, .4, rm, -3.3, .9, -2.6));
  for (let i = 0; i < 4; i++) for (const yy of [.6, 1.0]) { const dbx = -3.9 + i * .4; S.add(cyl(.07, .07, .12, clay('#3a3c44', { metal: .5, rough: .4 }), dbx, yy, -2.6, 16)); }
  S.add(box(1.5, .1, .4, clay('#3a2a2a'), -1.3, .48, -1.6), box(.1, .44, .1, rm, -1.85, .22, -1.6), box(.1, .44, .1, rm, -.75, .22, -1.6));
  if (a.barbell !== false) { const bbx = num(a.barbellX, -1.3); S.add(cyl(.025, .025, 2, rm, bbx, 1.15, -2.1).rotateZ(Math.PI / 2)); for (const s of [-.8, .8]) { const p = cyl(.22, .22, .06, clay('#16161a'), bbx + s, 1.15, -2.1); p.rotation.z = Math.PI / 2; S.add(p); } }
  // den treo
  [[-1.4, '#fff1d6'], [1.6, '#fff1d6']].forEach(([lx, c], i) => {
    S.add(cyl(.01, .01, 1, clay('#222'), lx, 3.5, -1), mesh(new THREE.ConeGeometry(.35, .3, 24, 1, true), clay('#1d1d22', { side: THREE.DoubleSide }), lx, 2.9, -1));
    const g = glowSprite('#ffe2a8', 1.4, .9); g.position.set(lx, 2.78, -1); S.add(g);
    const sl = spotLight(c, 38, [lx, 2.85, -1], [lx * .6, 0, -.9], 46, i === 1); S.add(sl, sl.target);
  });
  S.add(new THREE.HemisphereLight('#5a6070', '#1a1612', .4));
  return {
    anchors: { center: { x: 0, z: -.3 }, bag: { x: bagX - .78, z: -1.25, rot: 90 }, bench: { x: -1.3, z: -1.3, seat: .53 }, rack: { x: -3.2, z: -1.8 } },
    cam: { target: [0, 1.05, -1.0], dist: 6.4, el: 8 }, stageZ: -.3,
    update(t) { bagG.rotation.z = Math.sin(t * 3.1) * .1 * swing; bagG.rotation.x = Math.sin(t * 2.3 + 1) * .04 * swing; },
  };
}

function setHill(S, a, ctx) {
  const time = a.time || a.sky || 'dawn';
  S.background = new THREE.Color('#0b0f22');
  const fogC = time === 'day' ? '#a8c8e8' : time === 'night' ? '#0c1024' : '#4a3a6a';
  S.fog = new THREE.Fog(fogC, 12, 70);
  const skyS = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex(time, { mx: .5, my: .25 }), side: THREE.BackSide, fog: false, toneMapped: false })); S.add(skyS);
  const sunCol = time === 'night' ? '#dfe6ff' : time === 'day' ? '#fff6d8' : '#ffb26a';
  const sun = sph(time === 'night' ? 2.2 : 3.2, new THREE.MeshBasicMaterial({ color: sunCol, fog: false, toneMapped: false }), 0, time === 'day' ? 22 : 6, -70); S.add(sun);
  const sg = glowSprite(sunCol, 40, .7); sg.material.fog = false; sg.position.copy(sun.position); sg.position.z += 2; S.add(sg);
  const grass = time === 'day' ? '#3f6b45' : time === 'night' ? '#141e2a' : '#2b4a40';
  const hill = sph(14, clay(grass, { rough: .95 }), 0, -12.6, -1.2, 64); hill.scale.set(1.5, 1, 1); S.add(hill);
  [[-18, -17.5, -24, 18, 1.6, '#1d2a32'], [20, -19, -32, 20, 1.4, '#18222c'], [-4, -30, -50, 30, 2.2, '#141c28']].forEach(([x, y, z, r, sx, c]) => { const h = sph(r, clay(time === 'day' ? '#5a8a6a' : c, { rough: 1 }), x, y, z, 48); h.scale.x = sx; h.castShadow = false; S.add(h); });
  const treeX = num(a.treeX, -3.2), ground = (x, z) => { const dx = x / 21, dz = (z + 1.2) / 14, v = 1 - dx * dx - dz * dz; return v > 0 ? -12.6 + 14 * Math.sqrt(v) : -1; };
  if (a.tree !== false) {
    const ty = ground(treeX, -1.6);
    S.add(cyl(.09, .14, 1.6, clay('#2a1f1a'), treeX, ty + .8, -1.6, 12));
    [[0, 1.9, 0, .8], [-.45, 1.6, .1, .55], [.45, 1.65, -.1, .6]].forEach(([ox, oy, oz, r]) => S.add(sph(r, clay(time === 'day' ? '#3f7a4a' : '#1c3a30'), treeX + ox, ty + oy, -1.6 + oz, 20)));
  }
  const key = dirLight(sunCol, time === 'day' ? 2.4 : 1.8, [0, 5, -18], [0, 1, 0], true, 8); S.add(key, key.target);
  const fillC = time === 'day' ? '#cfe0ff' : '#6a6aa8';
  S.add(new THREE.HemisphereLight(fillC, '#1a1410', time === 'day' ? .9 : .75));
  const front = dirLight('#ffd0a8', time === 'night' ? .2 : .6, [3, 4, 9], [0, 1.5, 0], false); S.add(front, front.target);
  return {
    anchors: { top: { x: 0, z: -1.2 }, center: { x: 0, z: -1.2 }, tree: { x: treeX + .9, z: -1.4 }, slope: { x: 2.6, z: -1.0 } },
    cam: { target: [0, 2.3, -1.2], dist: 7.2, el: 2 }, stageZ: -1.2, ground,
    update(t) { sun.position.y = (time === 'day' ? 22 : 6) + (a.rise ? t * num(a.rise, .3) : 0); sg.position.y = sun.position.y; },
  };
}

function setVoid(S, a, ctx) {
  S.background = new THREE.Color('#040406'); S.fog = new THREE.Fog('#040406', 7, 18);
  S.add(box(40, .1, 40, clay('#0e0e12', { rough: .9 }), 0, -.05, 0, false, true));
  const sx = a.spot != null ? (a.spot <= 1.5 ? stageX(a.spot) : a.spot) : 0;
  const col = a.spotColor || '#fff4e0';
  const sl = spotLight(col, 60, [sx, 6, .5], [sx, 0, -.2], 22, true); sl.penumbra = .7; S.add(sl, sl.target);
  const beam = mesh(new THREE.ConeGeometry(1.6, 6, 32, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .045, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), sx, 3, -.15, false, false);
  S.add(beam);
  S.add(new THREE.HemisphereLight('#20243a', '#000', .25));
  return { anchors: { center: { x: sx, z: -.2 } }, cam: { target: [sx, 1.0, -.2], dist: 6, el: 10 }, stageZ: -.2 };
}

const SETS = { bedroom: setBedroom, street: setStreet, city: setStreet, rooftop: setRooftop, roof: setRooftop, gym: setGym, hill: setHill, void: setVoid, black: setVoid };

// ---------------------------------------------------------------- nhan vat dat set
const SKIN = '#ece6d6';
const OUTFITS = {
  hoodie: { top: '#5b616e', pants: '#2a2d35', hood: 'down' },
  hooded: { top: '#4a4f5a', pants: '#2a2d35', hood: 'up' },
  hero: { top: SKIN, sleeve: SKIN, pants: '#2a2d35' },
  band: { top: '#2b2e36', sleeve: SKIN, pants: '#2a2d35', band: true },
  friend: { top: '#3f6b8a', pants: '#3a3a44', cap: '#f2c14e' },
  friend2: { top: '#7a4b6b', pants: '#3a3a44', cap: '#4fa3ff' },
  friend3: { top: '#4b7a52', pants: '#3a3a44', cap: '#ff5a4f' },
  girl: { top: '#d98c8c', pants: '#3a3550', hair: '#3b2a24', hairStyle: 'bob', scarf: '#f2c14e' },
  mom: { top: '#8a6b9a', pants: '#3a3550', hair: '#4a3328', hairStyle: 'bun' },
  dad: { top: '#4a5a7a', pants: '#2a2d35', hair: '#2a2422', hairStyle: 'short' },
  kid: { top: '#e0a050', pants: '#3a5a7a', scale: .66 },
  ghost: { top: '#c9d4ff', pants: '#c9d4ff', ghost: true },
  voice: { voice: true, scale: 1.14 },
};

const POSES = {
  stand: {}, idle: {},
  relaxed: { la: [-5, 6, 15], ra: [-5, 6, 15], headZ: 4 },
  slump: { lean: 16, headX: 26, la: [10, 2, 10], ra: [10, 2, 10], drop: .03 },
  phone: { headX: 30, lean: 4, la: [35, -8, 85], ra: [35, -12, 88], hold: 'phone' },
  reach: { la: [80, -5, 5], ra: [20, 10, 10], lean: 6 },
  point: { ra: [88, -8, 0] },
  wave: { ra: [10, 155, 35], anim: 'wave' },
  cheer: { la: [10, 158, 15], ra: [10, 158, 15], headX: -14, anim: 'cheer' },
  win: { la: [10, 158, 15], ra: [10, 158, 15], headX: -14, anim: 'cheer' },
  fist: { ra: [15, 150, 20], la: [10, 8, 30], headX: -8 },
  headhold: { la: [55, 75, 145], ra: [55, 75, 145], headX: 18, lean: 6, anim: 'shake' },
  facepalm: { ra: [72, -18, 140], headX: 22 },
  arms: { la: [55, -40, 105], ra: [55, -40, 100] },
  shrug: { la: [5, 35, 95], ra: [5, 35, 95], headZ: 10 },
  hug: { la: [75, 15, 40], ra: [75, 15, 40] },
  open: { la: [25, 70, 15], ra: [25, 70, 15], headX: -8 },
  think: { ra: [45, -25, 145], la: [30, -20, 95], headZ: 8, headX: 5 },
  guard: { la: [50, -10, 125], ra: [50, -10, 125], lean: 8, ll: [18, 20], rl: [-12, 14], drop: .05 },
  punch: { la: [50, -10, 125], ra: [50, -10, 125], lean: 8, ll: [18, 20], rl: [-12, 14], drop: .05, anim: 'punch' },
  lift: { la: [5, 6, 30], ra: [5, 6, 30], anim: 'lift', hold: 'dumbbell' },
  walk: { anim: 'walk' }, run: { anim: 'run', lean: 10 },
  sit: { sit: true, la: [25, 4, 30], ra: [25, 4, 30] },
  sitphone: { sit: true, headX: 32, lean: 10, la: [38, -8, 88], ra: [38, -12, 90], hold: 'phone' },
  sitdesk: { sit: true, lean: 8, headX: 12, la: [58, 0, 45], ra: [58, 0, 45] },
  sitsad: { sit: true, lean: 24, headX: 32, la: [32, 0, 55], ra: [32, 0, 55] },
  knees: { floor: true, lean: 18, headX: 18, ll: [80, 145], rl: [80, 145], la: [62, 20, 70], ra: [62, 20, 70] },
  kneel: { drop: .3, ll: [0, 90], rl: [0, 90], lean: 8, headX: 18, la: [12, 4, 15], ra: [12, 4, 15] },
  crouch: { drop: .3, ll: [72, 118], rl: [72, 118], lean: 28, la: [45, 10, 30], ra: [45, 10, 30] },
  lie: { lie: true, la: [-5, 15, 20], ra: [-5, 15, 20] },
  pushup: { push: true, anim: 'pushup' },
};
const FACES = {
  neutral: { lid: .12, brow: 0, by: 0, mouth: 'small' }, smile: { lid: .18, brow: -4, by: .01, mouth: 'smile' },
  happy: { lid: .2, brow: -6, by: .015, mouth: 'smile' }, sad: { lid: .38, brow: -20, by: 0, mouth: 'sad' },
  tired: { lid: .52, brow: -8, by: -.01, mouth: 'flat' }, determined: { lid: .3, brow: 22, by: -.012, mouth: 'flat' },
  angry: { lid: .3, brow: 32, by: -.015, mouth: 'sad' }, sleep: { lid: 1, brow: 0, by: -.005, mouth: 'small' },
  cry: { lid: .45, brow: -24, by: 0, mouth: 'sad', tears: true }, shock: { lid: 0, brow: -10, by: .03, mouth: 'o' },
  grin: { lid: .2, brow: 26, by: -.01, mouth: 'grin' }, bloodshot: { lid: .5, brow: -8, by: -.01, mouth: 'flat', red: true },
};
const BASE_POSE = { lean: 0, twist: 0, headX: 0, headY: 0, headZ: 0, la: [0, 6, 8], ra: [0, 6, 8], ll: [0, 0], rl: [0, 0], drop: 0 };
const HIP_Y = .72, BODY_SCALE = .92;

function resolvePose(name) {
  const p = POSES[name] || POSES.stand;
  return { ...BASE_POSE, ...p, la: p.la || BASE_POSE.la, ra: p.ra || BASE_POSE.ra, ll: p.ll || BASE_POSE.ll, rl: p.rl || BASE_POSE.rl, name: POSES[name] ? name : 'stand' };
}
function mixPose(a, b, t) {
  const o = { ...b };
  for (const k of ['lean', 'twist', 'headX', 'headY', 'headZ', 'drop']) o[k] = lerp(a[k] || 0, b[k] || 0, t);
  for (const k of ['la', 'ra']) o[k] = [0, 1, 2].map(i => lerp(a[k][i], b[k][i], t));
  for (const k of ['ll', 'rl']) o[k] = [0, 1].map(i => lerp(a[k][i], b[k][i], t));
  return o;
}

function buildBean(spec, accent) {
  const who = spec.who || 'hoodie', O = OUTFITS[who] || OUTFITS.hoodie;
  const mats = [];
  const M = (c, o = {}) => { const m = clay(c, o); mats.push(m); return m; };
  const isVoice = !!O.voice, isGhost = !!O.ghost;
  const dark = '#050507';
  const topC = isVoice ? dark : (spec.color || O.top), sleeveC = isVoice ? dark : (O.sleeve || topC), skinC = isVoice ? dark : (spec.skin || SKIN);
  const pantsC = isVoice ? dark : O.pants, shoeC = isVoice ? dark : '#17181c';
  const vO = isVoice ? { rough: 1 } : isGhost ? { transparent: true, opacity: .45 } : {};
  const mTop = M(topC, vO), mSleeve = M(sleeveC, vO), mSkin = M(skinC, vO), mPants = M(pantsC, vO), mShoe = M(shoeC, vO);

  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const hips = new THREE.Group(); hips.position.y = HIP_Y; body.add(hips);
  const pelvis = sph(.22, mPants, 0, 0, 0); pelvis.scale.set(1.1, .7, .85); hips.add(pelvis);
  const torso = new THREE.Group(); hips.add(torso);
  const chest = cap(.24, .3, mTop, 0, .27, 0); chest.scale.set(1.05, 1, .82); torso.add(chest);
  const neck = new THREE.Group(); neck.position.y = .56; torso.add(neck);
  const head = new THREE.Group(); head.position.y = .27; neck.add(head);
  const skull = sph(.3, mSkin, 0, 0, 0, 32); skull.scale.set(1, .96, .96); head.add(skull);

  // mat
  const scleraM = isVoice ? null : M(spec.bloodshot ? '#f0c8c0' : '#f4f1ea', { rough: .35 });
  const pupilM = isVoice ? new THREE.MeshBasicMaterial({ color: accent, toneMapped: false }) : M('#141418', { rough: .2 });
  if (isVoice) mats.push(pupilM);
  const lidM = mSkin, eyes = [];
  for (const s of [1, -1]) {
    const eg = new THREE.Group(); eg.position.set(s * .108, .03, .245); head.add(eg);
    let lid = null;
    if (!isVoice) {
      const sc = sph(.058, scleraM, 0, 0, 0, 20); sc.scale.z = .62; eg.add(sc);
      const pu = sph(.032, pupilM, 0, -.004, .03, 16); pu.scale.z = .5; eg.add(pu);
      lid = mesh(new THREE.SphereGeometry(.064, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lidM); lid.scale.z = .7; eg.add(lid);
      if (spec.bloodshot) { const rr = mesh(new THREE.TorusGeometry(.05, .006, 6, 20), M('#c0392b')); rr.position.z = .028; eg.add(rr); }
    } else {
      const pu = sph(.05, pupilM, 0, 0, .01, 16); pu.scale.set(1.15, .7, .5); eg.add(pu);
    }
    const brow = box(.095, .018, .022, M(isVoice ? dark : (O.hair || '#3a3436')), 0, .095, .03, true, false); eg.add(brow);
    eyes.push({ g: eg, lid, brow, s });
  }
  const mouthG = new THREE.Group(); mouthG.position.set(0, -.125, .272); head.add(mouthG);
  const mouthM = isVoice ? new THREE.MeshBasicMaterial({ color: '#fff4f0', toneMapped: false }) : M('#3a2226', { rough: .5 }); if (isVoice) mats.push(mouthM);
  const arc = mesh(new THREE.TorusGeometry(.055, .013, 6, 18, Math.PI), mouthM, 0, 0, 0, false); mouthG.add(arc);
  const line = mesh(new THREE.CapsuleGeometry(.011, .05, 4, 8), mouthM, 0, 0, 0, false); line.rotation.z = Math.PI / 2; mouthG.add(line);
  const oh = sph(.028, mouthM, 0, 0, 0, 12); oh.scale.set(1, 1.2, .5); mouthG.add(oh);
  const tearM = new THREE.MeshBasicMaterial({ color: '#8fd0ff', transparent: true, opacity: .9 }); mats.push(tearM);
  const tears = [1, -1].map(s => { const tr = sph(.018, tearM, s * .11, -.03, .27, 10); tr.scale.y = 1.4; tr.visible = false; head.add(tr); return tr; });

  // toc, mu, bang do
  if (O.hood === 'down') { const hd = mesh(new THREE.TorusGeometry(.2, .075, 10, 24), mTop, 0, .5, -.12); hd.rotation.x = Math.PI / 2 - .5; torso.add(hd); for (const s of [-1, 1]) torso.add(cyl(.01, .01, .16, M('#d8d8dc'), s * .07, .42, .2, 6)); }
  if (O.hood === 'up') { const hd = mesh(new THREE.SphereGeometry(.345, 28, 18, Math.PI / 2 + .95, Math.PI * 2 - 1.9, 0, Math.PI * .78), M(O.top, { side: THREE.DoubleSide }), 0, .02, -.02); head.add(hd); }
  if (O.band) { const b = mesh(new THREE.TorusGeometry(.298, .032, 8, 32), M(accent, { emissive: accent, ei: .15 }), 0, .1, 0); b.rotation.x = Math.PI / 2 - .08; head.add(b); }
  if (O.cap) { const cp = mesh(new THREE.SphereGeometry(.31, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(O.cap), 0, .04, 0); head.add(cp); const br = cyl(.2, .2, .025, M(O.cap), 0, .06, .26); br.scale.z = .7; head.add(br); }
  if (O.hairStyle === 'bob') { head.add(mesh(new THREE.SphereGeometry(.33, 28, 18, Math.PI / 2 + .75, Math.PI * 2 - 1.5, 0, Math.PI * .7), M(O.hair, { side: THREE.DoubleSide }), 0, .03, -.01)); head.add(mesh(new THREE.SphereGeometry(.315, 24, 10, 0, Math.PI * 2, 0, Math.PI * .28), M(O.hair), 0, .02, .01)); }
  if (O.hairStyle === 'bun') { head.add(mesh(new THREE.SphereGeometry(.315, 24, 10, 0, Math.PI * 2, 0, Math.PI * .4), M(O.hair), 0, .02, -.01), sph(.13, M(O.hair), 0, .3, -.12, 16)); }
  if (O.hairStyle === 'short') head.add(mesh(new THREE.SphereGeometry(.312, 24, 10, 0, Math.PI * 2, 0, Math.PI * .34), M(O.hair), 0, .02, -.01));
  if (O.scarf) { const sc = mesh(new THREE.TorusGeometry(.17, .06, 10, 24), M(O.scarf), 0, .56, .01); sc.rotation.x = Math.PI / 2; torso.add(sc); }

  // tay chan
  const limb = (side, isArm) => {
    const g = new THREE.Group();
    if (isArm) {
      g.position.set(side * .29, .47, 0); torso.add(g);
      g.add(cap(.074, .17, mSleeve, 0, -.15, 0));
      const el = new THREE.Group(); el.position.y = -.31; g.add(el);
      el.add(cap(.066, .14, O.sleeve === SKIN || isVoice ? mSkin : mSleeve, 0, -.12, 0));
      const hand = new THREE.Group(); hand.position.y = -.28; el.add(hand); hand.add(sph(.078, mSkin, 0, 0, 0, 16));
      return { g, el, hand };
    }
    g.position.set(side * .12, -.04, 0); hips.add(g);
    g.add(cap(.092, .17, mPants, 0, -.16, 0));
    const kn = new THREE.Group(); kn.position.y = -.31; g.add(kn);
    kn.add(cap(.082, .16, mPants, 0, -.15, 0));
    const ft = sph(.11, mShoe, 0, -.3, .05, 16); ft.scale.set(.95, .62, 1.5); kn.add(ft);
    return { g, kn };
  };
  const LA = limb(1, true), RA = limb(-1, true), LL = limb(1, false), RL = limb(-1, false);

  // do cam tay
  const props = {};
  {
    const pg = new THREE.Group(); pg.position.set(-.02, -.06, .06); pg.rotation.set(-1.0, 0, .15);
    pg.add(box(.085, .16, .014, M('#16161a', { rough: .3 }), 0, 0, 0));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(.072, .145), new THREE.MeshBasicMaterial({ color: spec.glowFace || '#9fb6ff', toneMapped: false })); scr.position.z = .008; mats.push(scr.material); pg.add(scr);
    const pl = pointLight(spec.glowFace || '#9fb6ff', .35, 1.2, 0, .04, .2); pg.add(pl);
    RA.hand.add(pg); props.phone = pg; pg.visible = false;
    const dbs = [LA, RA].map(A => { const d = new THREE.Group(); d.add(cyl(.018, .018, .26, M('#888', { metal: .6, rough: .35 }), 0, 0, 0, 8)); for (const s of [-.12, .12]) d.add(cyl(.07, .07, .05, M('#222'), 0, s, 0, 14)); d.rotation.z = Math.PI / 2; A.hand.add(d); d.visible = false; return d; });
    props.dumbbell = { set visible(v) { dbs.forEach(d => d.visible = v); } };
  }
  // hao quang cho bong den
  let aura = null, auraLight = null;
  if (isVoice) {
    aura = glowSprite(accent, 3.4, .55); aura.position.set(0, 1.25, -.25); root.add(aura); mats.push(aura.material);
    auraLight = pointLight(accent, 5, 4.5, 0, 1.3, -.9); root.add(auraLight);
    const a2 = glowSprite(accent, 1.6, .5); a2.position.set(0, 1.55, -.15); root.add(a2); mats.push(a2.material);
  }

  root.traverse(o => { if (o.isMesh) { o.castShadow = !isGhost; } });
  const scale = num(spec.scale, 1) * (O.scale || 1) * BODY_SCALE;
  root.scale.setScalar(scale);
  return { kind: 'bean', root, body, hips, torso, neck, head, LA, RA, LL, RL, eyes, arc, line, oh, tears, props, mats, chest, aura, auraLight, isVoice, scale, spec };
}

function applyBean(c, P, F, t, extra) {
  const { LA, RA, LL, RL } = c;
  let la = P.la.slice(), ra = P.ra.slice(), ll = P.ll.slice(), rl = P.rl.slice(), lean = P.lean, drop = P.drop, headX = P.headX, headY = P.headY, headZ = P.headZ, bob = 0;
  const anim = extra.moving ? (extra.run ? 'run' : 'walk') : P.anim;
  if (anim === 'walk' || anim === 'run') {
    const run = anim === 'run', ph = extra.phase, sw = Math.sin(ph), cw = Math.cos(ph);
    const A = run ? 48 : 26;
    ll = [A * sw, (run ? 30 : 8) + (run ? 60 : 30) * Math.max(0, -cw)]; rl = [-A * sw, (run ? 30 : 8) + (run ? 60 : 30) * Math.max(0, cw)];
    la = [-(run ? 50 : 24) * sw, 8, run ? 95 : 20]; ra = [(run ? 50 : 24) * sw, 8, run ? 95 : 20];
    bob = Math.abs(Math.sin(ph)) * (run ? .07 : .03); lean = run ? 12 : 3;
  } else if (anim === 'wave') { ra = [ra[0], ra[1], 35 + 28 * Math.sin(t * 9)]; }
  else if (anim === 'cheer') { const k = Math.sin(t * 7); la[1] += k * 6; ra[1] += k * 6; bob = Math.max(0, Math.sin(t * 7)) * .05; }
  else if (anim === 'punch') {
    const ph = (t % .5) / .5, side = Math.floor(t / .5) % 2, k = ph < .35 ? ease(ph / .35) : 1 - ease((ph - .35) / .65);
    const tgt = [90, 2, 0]; if (side) ra = ra.map((v, i) => lerp(v, tgt[i], k)); else la = la.map((v, i) => lerp(v, tgt[i], k));
    c.torso.rotation.y = (side ? -1 : 1) * .25 * k;
  } else if (anim === 'lift') { const k = .5 + .5 * Math.sin(t * 3.2); la[2] = 30 + 105 * k; ra[2] = 30 + 105 * (1 - k); }
  else if (anim === 'shake') { headY += Math.sin(t * 5) * 8; }
  if (anim !== 'punch') c.torso.rotation.y = P.twist * D2R;
  // tho
  const br = Math.sin(t * 2.1 + extra.seed);
  c.chest.scale.y = 1 + br * .018; headX += br * 1.2;
  // ngoi
  let seatDrop = 0;
  if (P.sit || P.floor) {
    const seatLocal = (P.floor ? 0 : extra.seat) / c.scale;
    seatDrop = Math.max(0, HIP_Y - seatLocal - .08);
    if (P.sit) { ll = [88, 88]; rl = [88, 88]; }
  }
  c.hips.position.y = HIP_Y - drop - seatDrop + bob;
  c.torso.rotation.x = lean * D2R;
  c.neck.rotation.set(headX * D2R, headY * D2R, headZ * D2R);
  const arm = (A, v, s) => { A.g.rotation.set(-v[0] * D2R, 0, s * v[1] * D2R); A.el.rotation.set(-v[2] * D2R, 0, 0); };
  arm(LA, la, 1); arm(RA, ra, -1);
  const leg = (L, v) => { L.g.rotation.set(-v[0] * D2R, 0, 0); L.kn.rotation.set(v[1] * D2R, 0, 0); };
  leg(LL, ll); leg(RL, rl);
  // nam / hit dat
  c.body.rotation.set(0, 0, 0); c.body.position.set(0, 0, 0);
  if (P.lie) { c.body.rotation.x = -Math.PI / 2; c.body.position.set(0, .26, 0); }
  if (P.push) {
    const k = .5 + .5 * Math.sin(t * 3);
    c.body.rotation.x = (78 - k * 10) * D2R; c.body.position.set(0, .12 + k * .12, 0);
    arm(LA, [175 - k * 10, -8, 0 + (1 - k) * 70], 1); arm(RA, [175 - k * 10, -8, (1 - k) * 70], -1);
  }
  // mat
  const lidC = F.lid, blink = extra.blinkable && ((t + extra.seed * 1.7) % 3.3) < .13 ? 1 : 0, close = Math.max(lidC, blink);
  for (const e of c.eyes) {
    if (e.lid) e.lid.rotation.x = lerp(-1.25, 1.57, close);
    e.brow.rotation.z = e.s * F.brow * D2R; e.brow.position.y = .095 + F.by;
    e.g.rotation.y = (extra.look || 0) * .4 * D2R;
  }
  c.arc.visible = F.mouth === 'smile' || F.mouth === 'sad' || F.mouth === 'grin';
  c.arc.rotation.z = F.mouth === 'sad' ? 0 : Math.PI;
  c.arc.scale.setScalar(F.mouth === 'grin' ? 1.9 : 1); c.arc.position.y = F.mouth === 'sad' ? -.035 : 0;
  c.line.visible = F.mouth === 'flat' || F.mouth === 'small'; c.line.scale.y = F.mouth === 'small' ? .6 : 1;
  c.oh.visible = F.mouth === 'o';
  c.tears.forEach((tr, i) => { tr.visible = !!F.tears; tr.position.y = -.04 - ((t * .5 + i * .37) % 1) * .2; });
  c.props.phone.visible = P.hold === 'phone' || extra.hold === 'phone';
  c.props.dumbbell.visible = P.hold === 'dumbbell' || extra.hold === 'dumbbell';
  if (c.aura) { c.aura.material.opacity = (.42 + .14 * Math.sin(t * 2.4)) * extra.opacity; c.auraLight.intensity = (4 + 1.5 * Math.sin(t * 2.4)) * extra.opacity; }
}

// ---------------------------------------------------------------- nhan vat co xuong (GLB)
const GLB = new Map();
const loader = new GLTFLoader();
const ROBOT_URL = new URL('./lib/models/robot.glb', import.meta.url).href;
const MODEL_ALIAS = { robot: ROBOT_URL };
const KC = () => window.KaiChars || null;
const wlow = v => String(v || '').toLowerCase();
function modelUrl(spec) {
  if (spec.model) return spec.model;
  if (MODEL_ALIAS[spec.who]) return MODEL_ALIAS[spec.who];
  const kc = KC(); return kc && kc.glbs && kc.glbs().has(wlow(spec.who)) ? 'user:' + wlow(spec.who) : null;
}
const userSprite = spec => { const kc = KC(); return kc && kc.imgs ? kc.imgs().get(wlow(spec.who)) || null : null; };
function loadGLB(url) {
  if (!GLB.has(url)) GLB.set(url, new Promise((res, rej) => {
    const fail = () => rej(new Error('khong tai duoc mo hinh 3D: ' + url));
    // Neu may chu khong phuc vu .glb (vi du trong khung artifact), doc ban base64 di kem (.glb.b64.txt).
    const viaB64 = () => fetch(url + '.b64.txt').then(r => { if (!r.ok) throw 0; return r.text(); }).then(t => {
      const bin = atob(t.trim()), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      loader.parse(buf.buffer, '', g => res(g), fail);
    }).catch(fail);
    loader.load(url, g => res(g), undefined, viaB64);
  }));
  return GLB.get(url);
}
const ROBOT_MAP = { stand: 'Idle', idle: 'Idle', relaxed: 'Idle', walk: 'Walking', run: 'Running', wave: 'Wave', cheer: 'Dance', win: 'Dance', dance: 'Dance', punch: 'Punch', sit: 'Sitting', yes: 'Yes', no: 'No', thumbsup: 'ThumbsUp', jump: 'Jump', death: 'Death', fall: 'Death', standup: 'Standing', walkjump: 'WalkJump', slump: 'No' };
const ONCE = new Set(['Death', 'Sitting', 'Standing', 'Jump', 'WalkJump']);
function buildRigged(spec, gltf) {
  const root = new THREE.Group(), model = skClone(gltf.scene); root.add(model);
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.shared = true; } });
  model.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(model, true), h = bb.max.y - bb.min.y || 1;
  const target = 1.7 * num(spec.scale, 1) * (spec.who === 'robot' ? .95 : 1);
  model.scale.setScalar(target / h); model.position.y = -bb.min.y * target / h;
  const mixer = new THREE.AnimationMixer(model), actions = {};
  for (const clip of gltf.animations) { const a = mixer.clipAction(clip); a.play(); a.setEffectiveWeight(0); actions[clip.name.toLowerCase()] = a; }
  let face = null, headBone = null; model.traverse(o => { if (o.morphTargetDictionary && o.morphTargetDictionary.Sad != null) face = o; if (o.isBone && !headBone && /head/i.test(o.name)) headBone = o; });
  return { kind: 'rig', root, model, mixer, actions, face, headBone, mats: [], scale: 1, spec };
}
function rigClip(c, name) {
  if (!name) return null; const n = String(name).toLowerCase();
  if (c.actions[n]) return c.actions[n];
  if (c.actions[(ROBOT_MAP[n] || '').toLowerCase()]) return c.actions[(ROBOT_MAP[n] || '').toLowerCase()];
  const keys = Object.keys(c.actions), hit = keys.find(k => k.includes(n) || n.includes(k));
  if (hit) return c.actions[hit];
  const idle = keys.find(k => /idle|stand|breath|rest/.test(k));
  return c.actions[idle || keys[0]] || null;
}
function applyRig(c, segs, t, F) {
  for (const k in c.actions) c.actions[k].setEffectiveWeight(0);
  const i = segs.findLastIndex(s => t >= s.at), cur = segs[Math.max(0, i)], prev = i > 0 ? segs[i - 1] : null;
  const setA = (seg, w) => {
    const a = rigClip(c, seg.name) || c.actions.idle || Object.values(c.actions)[0]; if (!a) return;
    const d = a.getClip().duration, lt = Math.max(0, t - seg.at);
    a.time = ONCE.has(a.getClip().name) ? Math.min(lt, d - .001) : lt % d; a.setEffectiveWeight(a.getEffectiveWeight() + w);
  };
  const k = prev ? ease((t - cur.at) / .3) : 1;
  if (prev && k < 1) setA(prev, 1 - k);
  setA(cur, k);
  c.mixer.update(0);
  if (c.face) {
    const dict = c.face.morphTargetDictionary, inf = c.face.morphTargetInfluences; inf.fill(0);
    const map = { sad: 'Sad', cry: 'Sad', tired: 'Sad', angry: 'Angry', determined: 'Angry', shock: 'Surprised', happy: 'Surprised' };
    const m = map[F.name]; if (m && dict[m] != null) inf[dict[m]] = 1;
  }
}

// ---------------------------------------------------------------- nhan vat tu anh (sprite)
const TEX = new WeakMap();
function texOf(cv) {
  let t = TEX.get(cv);
  if (!t) { t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; TEX.set(cv, t); }
  return t;
}
function buildSprite(spec, entry) {
  const root = new THREE.Group(), holder = new THREE.Group(); root.add(holder);
  const mat = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: .3, roughness: 1, metalness: 0, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: .55 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.castShadow = true; m.receiveShadow = false;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: .3 });
  holder.add(m);
  return { kind: 'sprite', root, holder, mesh: m, mat, entry, mats: [mat], scale: 1, spec, H: 1.7 * num(spec.scale, 1), seed: 0 };
}
function applySprite(c, o) {
  const poses = c.entry.poses || {}, keys = Object.keys(poses);
  const cv = poses[o.pname] || poses[o.face] || poses.idle || poses.stand || poses[keys[0]];
  if (!cv) return;
  const tex = texOf(cv);
  if (c.mat.map !== tex) { c.mat.map = tex; c.mat.emissiveMap = tex; c.mesh.customDepthMaterial.map = tex; c.mat.needsUpdate = true; c.mesh.customDepthMaterial.needsUpdate = true; }
  const who = wlow(c.spec.who), H = c.H * (who === 'voice' ? 1.1 : 1) * (c.entry.scale ?? 1), W = H * cv.width / cv.height;
  const flip = (o.facing < 0) !== !!c.entry.flip ? -1 : 1, t = o.t;
  const amp = o.moving ? (o.run ? .07 : .035) : 0, bob = o.moving ? Math.abs(Math.sin(o.phase)) * amp : 0;
  const breathe = 1 + .012 * Math.sin(t * 2.2 + c.seed);
  c.mesh.scale.set(W * flip, H * breathe, 1);
  let y = H * breathe / 2 + bob + (c.entry.dy || 0) * H, rz = o.moving ? Math.sin(o.phase) * .035 : 0;
  if (o.sit) y -= H * .1;
  if (o.cheer) y += Math.max(0, Math.sin(t * 7)) * .05;
  if (o.lie) { rz = -Math.PI / 2 * .95; y = W * .1; }
  c.mesh.position.set(0, y, 0); c.mesh.rotation.z = rz; c.H = H;
}

// ---------------------------------------------------------------- hat (bui, mua...)
function buildParticles(kind, accent, area) {
  if (!kind) return null;
  const N = { rain: 900, snow: 500, dust: 260, embers: 160, stars: 400, fireflies: 60 }[kind] || 200;
  const r = rng(kind.length * 31 + 7), base = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { base[i * 4] = r(); base[i * 4 + 1] = r(); base[i * 4 + 2] = r(); base[i * 4 + 3] = r(); }
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(N * (kind === 'rain' ? 6 : 3));
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const col = { rain: '#a8c0e8', snow: '#ffffff', dust: '#f3e6c8', embers: '#ffb06a', stars: '#ffffff', fireflies: '#e8ff9a' }[kind] || '#fff';
  const obj = kind === 'rain'
    ? new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .45 }))
    : new THREE.Points(geo, new THREE.PointsMaterial({ color: col, size: kind === 'snow' ? .05 : kind === 'stars' ? .06 : kind === 'fireflies' ? .07 : .028, transparent: true, opacity: kind === 'dust' ? .55 : .9, depthWrite: false, blending: kind === 'snow' ? THREE.NormalBlending : THREE.AdditiveBlending, map: glowTex(col) }));
  obj.frustumCulled = false;
  const [W, H, D, cz] = area;
  obj.userData.update = t => {
    for (let i = 0; i < N; i++) {
      const a = base[i * 4], b = base[i * 4 + 1], c = base[i * 4 + 2], d = base[i * 4 + 3];
      let x = (a - .5) * W, y, z = cz + (c - .5) * D;
      if (kind === 'rain') { y = H - (((b * H + t * 9 * (.8 + d * .4)) % H)); pos.set([x, y, z, x - .02, y + .32, z], i * 6); continue; }
      if (kind === 'snow') { y = H - ((b * H + t * .6 * (.6 + d)) % H); x += Math.sin(t * .8 + d * 9) * .3; }
      else if (kind === 'embers') { y = (b * H + t * .7 * (.5 + d)) % H; x += Math.sin(t * 1.3 + d * 7) * .4; }
      else if (kind === 'stars') { y = H * .4 + b * H; }
      else { y = .2 + ((b * (H - .2) + Math.sin(t * .35 + d * 6) * .3) % H); x += Math.sin(t * .25 + d * 11) * .5; z += Math.cos(t * .2 + a * 9) * .3; }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return obj;
}
function buildShards(accent) {
  const g = new THREE.Group(), N = 70, r = rng(77), m = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false, transparent: true });
  const items = [];
  for (let i = 0; i < N; i++) {
    const s = mesh(new THREE.TetrahedronGeometry(.03 + r() * .06), m, 0, 0, 0, false, false); g.add(s);
    items.push({ s, v: new THREE.Vector3((r() - .5) * 4, r() * 3 + .5, (r() - .2) * 3), w: new THREE.Vector3(r() * 9, r() * 9, r() * 9), o: new THREE.Vector3((r() - .5) * .5, r() * 1.4 + .4, (r() - .5) * .3) });
  }
  g.userData.items = items; g.userData.mat = m; g.visible = false; return g;
}

// ---------------------------------------------------------------- dung canh
function pickAnchor(set, v) {
  if (typeof v === 'string') return set.anchors[v] || set.anchors.center || { x: 0, z: set.stageZ || 0 };
  return null;
}
function buildShot(args, env) {
  STAGE_W = env.H > env.W ? 3.6 : env.W === env.H ? 5 : 8;
  const S = new THREE.Scene(), accent = env.accent || '#ff3b30';
  const setName = String(args.set || 'bedroom').toLowerCase();
  const sa = { ...(args.setArgs || {}) };
  if (args.sky && !sa.sky) sa.sky = args.sky; if (args.time && !sa.time) sa.time = args.time;
  const set = (SETS[setName] || setVoid)(S, sa, { accent, occupied: !!args.bed });
  set.name = setName;
  const ground = set.ground || (() => 0);
  const actors = [];
  const list = (args.actors || []).slice();
  if (args.bed) list.unshift({ ...args.bed, x: 'bed.lie', pose: 'lie', face: args.bed.face || 'sleep', who: args.bed.who || 'hoodie', _bed: true });
  list.forEach((sp, idx) => {
    const isRig = !!modelUrl(sp), ent = !isRig ? userSprite(sp) : null;
    let c;
    if (isRig) { const g = env.glb.get(modelUrl(sp)); if (!g) return; c = buildRigged(sp, g); }
    else if (ent) c = buildSprite(sp, ent);
    else c = buildBean(sp, accent);
    const anc = pickAnchor(set, sp.x);
    const x0 = anc ? anc.x : stageX(num(sp.x, .5)), z0 = anc ? anc.z : (set.stageZ ?? 0) - num(sp.z, 0) * 3;
    const walk = sp.walk && typeof sp.walk === 'object' && sp.walk.to != null ? sp.walk : null;
    const x1 = walk ? (typeof walk.to === 'string' ? (pickAnchor(set, walk.to) || { x: x0 }).x : stageX(walk.to)) : x0;
    const z1 = walk && typeof walk.to === 'string' ? (pickAnchor(set, walk.to) || { z: z0 }).z : walk && walk.z != null ? (set.stageZ ?? 0) - walk.z * 3 : z0;
    // lich tu the
    const segs = [{ at: 0, name: sp.anim || sp.pose || (anc && anc.seat ? 'sit' : 'stand') }];
    (sp.poseAt || []).forEach(([at, n]) => segs.push({ at, name: n })); (sp.animAt || []).forEach(([at, n]) => segs.push({ at, name: n }));
    segs.sort((a, b) => a.at - b.at);
    const faces = [{ at: 0, name: sp.face || (sp.who === 'voice' ? 'grin' : 'neutral') }]; (sp.faceAt || []).forEach(([at, n]) => faces.push({ at, name: n }));
    S.add(c.root);
    actors.push({ c, sp, idx, x0, z0, x1, z1, walk, segs, faces, anc, seed: idx * 1.37 + 1, ground, name: sp.who });
  });
  // vat dung them
  (args.props || []).forEach(p => {
    const px = stageX(num(p.x, .5)), pz = (set.stageZ ?? 0) - num(p.z, 0) * 3, k = p.kind;
    const m = clay(p.color || '#6a6f7a');
    if (k === 'box') S.add(box(.6, .5, .6, clay(p.color || '#8a6b4a'), px, .25, pz));
    else if (k === 'plant') { S.add(cyl(.18, .14, .3, clay('#7a4b3a'), px, .15, pz)); [[0, .55, 0, .25], [.12, .45, .05, .18], [-.12, .48, -.04, .2]].forEach(([a, b, c2, r]) => S.add(sph(r, clay('#3f7a4a'), px + a, b, pz + c2))); }
    else if (k === 'chair') S.add(box(.5, .06, .5, m, px, .46, pz), box(.5, .55, .06, m, px, .75, pz - .25));
    else if (k === 'trophy') { const gm = clay('#e8b84a', { metal: .8, rough: .25 }); S.add(cyl(.12, .08, .25, gm, px, num(p.y, 0) + .3, pz), cyl(.1, .1, .06, clay('#2a2a30'), px, num(p.y, 0) + .03, pz)); }
    else if (k === 'books') ['#7a4b4b', '#4b6b7a', '#c9a35a'].forEach((c2, i) => S.add(box(.45, .08, .32, clay(c2), px, num(p.y, 0) + .04 + i * .08, pz)));
    else if (k === 'candle') { S.add(cyl(.05, .05, .2, clay('#efe6d0'), px, num(p.y, 0) + .1, pz)); const f = glowSprite('#ffb04a', .5, .9); f.position.set(px, num(p.y, 0) + .26, pz); S.add(f); S.add(pointLight('#ffb04a', 2, 3, px, num(p.y, 0) + .35, pz)); }
  });
  (args.lights || []).forEach(l => S.add(pointLight(l.color || '#ffc56b', num(l.power, 8), num(l.dist, 8), stageX(num(l.x, .5)), num(l.y, 2), (set.stageZ ?? 0) - num(l.z, 0) * 3 + .8)));
  if (args.glow) { const rim = dirLight(args.glow, 1.4, [0, 3, -6], [0, 1, 0], false); S.add(rim, rim.target); }
  const kind = args.particles || (set.rain ? 'rain' : null) || ((args.fx || []).find(f => ['rain', 'snow', 'dust', 'embers'].includes(f.kind)) || {}).kind;
  const parts = buildParticles(kind, accent, [14, 6, 8, (set.stageZ ?? 0) - 1]); if (parts) S.add(parts);
  const shardFx = (args.fx || []).find(f => f.kind === 'shards'); let shards = null;
  if (shardFx) { shards = buildShards(accent); S.add(shards); }
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, .05, 400);
  const FILL = { bedroom: .9, street: .85, city: .85, rooftop: .75, roof: .75, gym: .75, hill: .8, void: .3, black: .3 };
  const fill = new THREE.DirectionalLight(args.fillColor || '#fff1e2', num(args.fill, FILL[setName] ?? .7)); S.add(fill, fill.target);
  return { S, set, actors, parts, shards, shardFx, camera, args, fill };
}

function segAt(segs, t) { let s = segs[0]; for (const x of segs) if (t >= x.at) s = x; return s; }
function camPreset(name, D) {
  const P = {
    static: [[0, 8, D], [0, 8, D * .97]], push: [[0, 9, D * 1.08], [0, 7, D * .78]], pull: [[0, 7, D * .78], [0, 10, D * 1.12]],
    orbit: [[-32, 10, D], [32, 10, D]], orbitl: [[32, 10, D], [-32, 10, D]], crane: [[0, 34, D * 1.15], [0, 6, D * .85]], drop: [[0, 6, D * .85], [0, 38, D * 1.2]],
    low: [[14, -2, D * .82], [-6, 1, D * .72]], high: [[0, 48, D * 1.1], [0, 40, D * .95]], wide: [[0, 12, D * 1.45], [0, 10, D * 1.32]],
    close: [[14, 5, 3.0], [4, 3, 2.45]], face: [[14, 5, 3.0], [4, 3, 2.45]], side: [[70, 6, D * .9], [60, 6, D * .8]], back: [[165, 12, D * .8], [180, 10, D * .7]],
  };
  return P[name] || P.push;
}

function drawShot(B, t, dur, env) {
  const { S, set, actors, camera, args } = B;
  STAGE_W = env.H > env.W ? 3.6 : env.W === env.H ? 5 : 8;
  set.update && set.update(t);
  const byName = {};
  for (const A of actors) {
    const { c, sp } = A;
    // vi tri + di bo
    let x = A.x0, z = A.z0, moving = false, phase = 0, dir = 0;
    if (A.walk) {
      const at = num(A.walk.at, 0), wd = Math.max(.1, num(A.walk.dur, 2)), k = clamp((t - at) / wd, 0, 1), ke = A.walk.ease === 'linear' ? k : easeIO(k);
      x = lerp(A.x0, A.x1, ke); z = lerp(A.z0, A.z1, ke);
      moving = t > at && t < at + wd; dir = Math.sign(A.x1 - A.x0) || 0;
      const dist = Math.hypot(A.x1 - A.x0, A.z1 - A.z0) * ke; phase = dist / (.42 * num(sp.scale, 1)) * Math.PI * (A.walk.run || sp.pose === 'run' ? .75 : 1);
    }
    const seg = segAt(A.segs, t), pname = seg.name;
    const runCycle = !moving && (pname === 'run' || pname === 'walk');
    if (runCycle) { moving = true; phase = t * (pname === 'run' ? 11 : 6.5); }
    const anc = A.anc || {}, y = anc.y != null ? anc.y : A.ground(x, z);
    c.root.position.set(x, y, z);
    // huong
    let rot = sp.rot != null ? sp.rot : anc.rot != null ? anc.rot : (sp.facing ? sp.facing * 30 : 0);
    if (moving && A.walk && dir) rot = dir * 72;
    if (anc.lie) rot = 90;
    if (sp.turnAt) for (const [at, r] of sp.turnAt) if (t >= at) rot = r;
    c.root.rotation.y = rot * D2R;
    // hien / an
    const at = num(sp.at, 0), out = sp.out != null ? num(sp.out, 1e9) : 1e9;
    let op = (at > 0 ? clamp((t - at) / .35, 0, 1) : 1) * (1 - clamp((t - out) / .5, 0, 1));
    const sc = num(sp.scaleTo, null) != null ? lerp(1, sp.scaleTo, ease(t / dur)) : 1;
    c.root.visible = op > .01; c.root.scale.setScalar((c.kind === 'bean' ? c.scale : 1) * sc * (.92 + .08 * op));
    for (const m of c.mats) {
      const base = m.userData.baseOp ?? (m.userData.baseOp = m.opacity), tr = m.userData.baseTr ?? (m.userData.baseTr = m.transparent);
      m.opacity = op * base; m.transparent = tr || op < .999;
    }
    if (c.kind === 'rig' && c.lastOp !== op) { c.lastOp = op; c.model.traverse(o => { if (o.isMesh) { o.material = o.userData.ownMat || (o.userData.ownMat = o.material.clone()); o.material.transparent = op < .999; o.material.opacity = op; } }); }
    const fn = segAt(A.faces, t).name, F = { ...(FACES[fn] || FACES.neutral), name: fn };
    if (sp.bloodshot && fn !== 'sleep') F.lid = Math.max(F.lid, .45);
    if (c.kind === 'bean') {
      const pPrev = A.segs.filter(s => s.at <= t), cur = pPrev[pPrev.length - 1] || A.segs[0], prv = pPrev[pPrev.length - 2];
      let P = resolvePose(cur.name);
      if (anc.lie && !POSES[cur.name]?.lie) P = resolvePose('lie');
      if (prv) P = mixPose(resolvePose(prv.name), P, ease((t - cur.at) / .4));
      if (P.sit && !(anc.seat)) { P = { ...P, sit: false, floor: true }; }
      applyBean(c, P, F, t, { moving, run: (A.walk && A.walk.run) || pname === 'run', phase, seed: A.seed, seat: anc.seat || .45, blinkable: !c.isVoice, hold: sp.hold, look: sp.look, opacity: op });
    } else if (c.kind === 'sprite') {
      c.root.rotation.y = 0;
      applySprite(c, { pname, face: fn, t, moving, phase, run: (A.walk && A.walk.run) || pname === 'run', facing: moving && dir ? dir : (sp.facing || 1), sit: !!(POSES[pname] && POSES[pname].sit), lie: !!anc.lie, cheer: pname === 'cheer' || pname === 'win' });
    } else {
      let segs = A.segs;
      if (A.walk) {
        const wa = num(A.walk.at, 0), we = wa + num(A.walk.dur, 2), last = A.segs[A.segs.length - 1].name;
        const after = A.segs.filter(s => s.at >= we);
        segs = [...A.segs.filter(s => s.at < wa), { at: wa, name: A.walk.run ? 'run' : 'walk' },
          ...(after.length ? after : [{ at: we, name: last === 'walk' || last === 'run' ? 'stand' : last }])];
        if (!segs.length || segs[0].at > 0) segs.unshift({ at: 0, name: 'stand' });
      }
      applyRig(c, segs, t, F);
    }
    c.root.updateMatrixWorld(true);
    const head = new THREE.Vector3();
    if (c.kind === 'bean') c.head.getWorldPosition(head);
    else if (c.kind === 'sprite') head.set(x, y + c.H * .88, z);
    else if (c.headBone) { c.headBone.getWorldPosition(head); head.y += .25; }
    else head.set(x, y + 1.5 * num(sp.scale, 1), z);
    const info = { pos: new THREE.Vector3(x, y, z), head, chest: new THREE.Vector3(x, (head.y + y) / 2 + .2, z) };
    byName[sp.who] = byName[sp.who] || info; byName['#' + A.idx] = info;
    if (sp.who === 'voice') byName.voice = info;
  }
  B.parts && B.parts.userData.update(t);
  // vo bong den
  if (B.shards) {
    const fx = B.shardFx, at = num(fx.at, 0), lt = t - at, v = byName.voice || { chest: new THREE.Vector3(stageX(num(fx.x, .6)), 1.2, 0) };
    B.shards.visible = lt >= 0 && lt < 2.6; B.shards.position.copy(v.chest);
    if (B.shards.visible) { B.shards.userData.mat.opacity = 1 - clamp(lt / 2.6, 0, 1); for (const it of B.shards.userData.items) { it.s.position.set(it.o.x + it.v.x * lt, it.o.y + it.v.y * lt - 2.4 * lt * lt, it.o.z + it.v.z * lt); it.s.rotation.set(it.w.x * lt, it.w.y * lt, it.w.z * lt); } }
  }
  // may quay
  const vertical = env.H > env.W, def = set.cam, Dbase = def.dist * (vertical ? 1.05 : 1);
  let cam = args.cam;
  if (typeof cam === 'string') cam = { move: cam };
  cam = cam || { move: 'push' };
  let [from, to] = cam.from && to3(cam.from) && to3(cam.to || cam.from) ? [to3(cam.from), to3(cam.to || cam.from)] : camPreset(cam.move || 'push', Dbase);
  const closeMove = ['close', 'face'].includes(cam.move);
  let look = cam.look ?? cam.target ?? (closeMove ? (actors[0] && actors[0].sp.who) : null);
  const ct = clamp((t - num(cam.at, 0)) / Math.max(.1, num(cam.dur, dur - num(cam.at, 0))), 0, 1), ke = cam.ease === 'linear' ? ct : easeIO(ct);
  const az = lerp(from[0], to[0], ke) * D2R, el = lerp(from[1], to[1], ke) * D2R, dist = lerp(from[2], to[2], ke);
  let target = new THREE.Vector3(...def.target);
  if (look != null) {
    if (Array.isArray(look)) target.set(look[0] <= 1.5 ? stageX(look[0]) : look[0], num(look[1], 1), look[2] != null ? (set.stageZ ?? 0) - look[2] * 3 : def.target[2]);
    else { const L = byName[look] || byName['#' + look]; if (L) target.copy(closeMove || cam.face ? L.head : L.chest); }
  }
  camera.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
  for (const sh of cam.shake || []) { const lt = t - num(sh.at, 0), d2 = num(sh.dur, .4); if (lt >= 0 && lt < d2) { const k = (1 - lt / d2) * num(sh.amt, 1) * .06; camera.position.x += Math.sin(lt * 71) * k; camera.position.y += Math.cos(lt * 53) * k; } }
  camera.fov = num(cam.fov, vertical ? 46 : 30); camera.aspect = env.W / env.H; camera.updateProjectionMatrix();
  camera.lookAt(target);
  for (const A of actors) if (A.c.kind === 'sprite') A.c.holder.rotation.y = Math.atan2(camera.position.x - A.c.root.position.x, camera.position.z - A.c.root.position.z);
  B.fill.position.copy(camera.position).add(new THREE.Vector3(.8, 1.6, 0)); B.fill.target.position.copy(target);
  if (cam.roll) camera.rotateZ(cam.roll * D2R);
}
function to3(v) { return Array.isArray(v) && v.length >= 3 && v.every(n => typeof n === 'number') ? v : null; }

function disposeShot(B) {
  B.S.traverse(o => {
    if (o.userData && o.userData.shared) return;
    o.geometry && o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) { for (const k of ['map', 'emissiveMap']) m[k] && m[k].dispose(); m.dispose(); }
  });
}

// ---------------------------------------------------------------- API cho app
const cache = new Map();
const envGlb = new Map();
function keyOf(args, env) { return JSON.stringify(args) + '|' + env.accent + '|' + (env.H > env.W ? 'v' : env.W === env.H ? 's' : 'h') + '|' + ((window.KaiChars && window.KaiChars.rev) || 0); }
function getShot(args, env) {
  const k = keyOf(args, env);
  let B = cache.get(k);
  if (!B) {
    B = buildShot(args, { ...env, glb: envGlb }); cache.set(k, B);
    while (cache.size > 3) { const [k0, b0] = cache.entries().next().value; disposeShot(b0); cache.delete(k0); }
  }
  return B;
}

window.Kai3D = {
  version: 1,
  sets: Object.keys(SETS), poses: Object.keys(POSES), faces: Object.keys(FACES), who: [...Object.keys(OUTFITS), 'robot'],
  async prepare(json) {
    const urls = new Set();
    for (const s of (json && json.shots) || []) {
      if (s.tpl !== 'scene3d') continue; const a = s.args || {};
      for (const sp of [...(a.actors || []), a.bed].filter(Boolean)) { const u = modelUrl(sp); if (u) urls.add(u); }
    }
    for (const u of urls) {
      if (u.startsWith('user:')) {
        const ent = KC().glbs().get(u.slice(5)), key = u + '#' + ent.buffer.byteLength + '#' + (ent.rev || 0);
        if (!GLB.has(key)) GLB.set(key, loader.parseAsync(ent.buffer.slice(0), ''));
        envGlb.set(u, await GLB.get(key));
      } else envGlb.set(u, await loadGLB(u));
    }
  },
  async inspectGLB(buffer) {
    const g = await loader.parseAsync(buffer.slice(0), '');
    let skinned = false; g.scene.traverse(o => { if (o.isSkinnedMesh) skinned = true; });
    return { anims: g.animations.map(a => a.name), skinned };
  },
  draw(ctx, t, shot, args, env) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    try {
      const R = getRenderer(cw, ch), B = getShot(args, env);
      drawShot(B, t, num(shot.dur, 5), env);
      R.render(B.S, B.camera);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(glCanvas, 0, 0, cw, ch); ctx.restore();
    } catch (e) {
      console.error('Kai3D', e);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1a0f14'; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#ff6a6a'; ctx.font = `${Math.round(ch * .03)}px sans-serif`; ctx.fillText('Loi canh 3D: ' + String(e.message || e).slice(0, 90), ch * .04, ch * .1); ctx.restore();
    }
  },
};
if (window.__k3dres) window.__k3dres(window.Kai3D);
