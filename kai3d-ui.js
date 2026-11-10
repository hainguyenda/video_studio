// Video Studio by Kai - mau co san va prompt AI cho tab "Lam video 3D".
window.Kai3DReady = new Promise(r => { window.__k3dres = r; });

window.K3EX = [
  ["Phim 3D mẫu: Tomorrow (31 giây)", { aspect: "16:9", res: "1080p", fade: 1, title: "tomorrow-3d" }, { shots: [
    { dur: 6, tpl: "scene3d", music: "sad", sfx: [{ at: .2, name: "clock_tick", gain: -14 }, { at: 1.4, name: "tempt_swell", gain: -6 }], args: {
      set: "bedroom", setArgs: { clock: "11:47", lamp: true, laptop: "off", calendar: { month: "OCT", fill: 12 } },
      actors: [
        { who: "hoodie", x: "bed.sit", pose: "sitphone", face: "tired", bloodshot: true },
        { who: "voice", x: .55, z: .25, pose: "reach", facing: -1, at: 1.2 } ],
      cam: { move: "push" }, hud: { rows: [{ label: "DAY", n: 0 }] },
      texts: [{ kind: "narr", t: "He said he would start tomorrow.", at: .4, dur: 4.6, type: true, pos: "bottom" },
        { kind: "tempt", t: "one more video.", at: 2.2, x: .62, y: .16 }] } },
    { dur: 5, tpl: "scene3d", music: "sad", sfx: [{ at: .3, name: "heartbeat", gain: -10 }], args: {
      set: "bedroom", setArgs: { clock: "3:17", lamp: false, laptop: "off", calendar: { month: "OCT", fill: 12 } },
      actors: [{ who: "hoodie", x: "bed.sit", pose: "sitphone", face: "tired", bloodshot: true }],
      cam: { move: "close", look: "hoodie" },
      texts: [{ kind: "narr", t: "3 AM. Again.", at: .6, dur: 3.8, type: true, pos: "bottom" }] } },
    { dur: 6, tpl: "scene3d", music: "dark", sfx: [{ at: 1, name: "tempt_whisper", gain: -8 }, { at: 3.9, name: "glass_shatter", gain: -4 }], args: {
      set: "void", actors: [
        { who: "hoodie", x: .45, pose: "knees", face: "cry", faceAt: [[4.2, "determined"]], poseAt: [[4.3, "stand"]] },
        { who: "voice", x: .62, z: .3, pose: "stand", out: 3.9 } ],
      fx: [{ kind: "shards", at: 3.9 }, { kind: "flash", at: 3.9, dur: .3 }],
      cam: { move: "push", shake: [{ at: 3.9, amt: 1.2, dur: .5 }] },
      texts: [{ kind: "tempt", t: "you'll fail anyway.", at: .8, x: .66, y: .18 },
        { kind: "narr", t: "Until he stopped listening.", at: 4.3, dur: 1.6, type: true, pos: "bottom" }] } },
    { dur: 7, tpl: "scene3d", music: "hope", sfx: [{ at: .5, name: "footsteps", gain: -10 }, { at: 4.4, name: "riser_2s", gain: -8 }], args: {
      set: "hill", setArgs: { time: "dawn" }, particles: "dust",
      actors: [{ who: "band", x: .2, pose: "walk", face: "determined", walk: { to: "top", at: .3, dur: 3.6 }, poseAt: [[4.4, "cheer"]], faceAt: [[4.4, "smile"]] }],
      cam: { move: "crane" }, hud: { rows: [{ label: "DAY", n: 1 }] },
      texts: [{ kind: "big", t: "DAY 1.", at: 4.6, dur: 2.2 }] } },
    { dur: 7, tpl: "scene3d", music: "hope", sfx: [{ at: .4, name: "punch_bag", gain: -8 }, { at: 1.4, name: "punch_bag", gain: -8 }, { at: 2.4, name: "punch_bag", gain: -8 }], args: {
      set: "gym", particles: "dust",
      actors: [{ who: "band", x: "bag", pose: "punch", face: "determined" }],
      cam: { move: "orbit", look: "band" }, hud: { rows: [{ label: "DAY", from: 2, to: 30, at: .3, dur: 4 }] },
      texts: [{ kind: "narr", t: "Small wins. Every day.", at: 4.4, dur: 2.4, type: true, pos: "bottom" }] } },
  ] }],
  ["Robot 3D nhảy múa (10 giây)", { aspect: "16:9", res: "1080p", fade: 1, title: "robot-3d" }, { shots: [
    { dur: 10, tpl: "scene3d", music: "hope", sfx: [{ at: .4, name: "footsteps", gain: -10 }, { at: 4, name: "pop", gain: -6 }], args: {
      set: "street", setArgs: { time: "dusk", neonDoor: .82 },
      actors: [
        { who: "robot", x: .15, pose: "stand", walk: { to: .42, at: .3, dur: 3 }, poseAt: [[3.4, "wave"], [5.4, "dance"]] },
        { who: "girl", x: .66, pose: "stand", face: "smile", poseAt: [[3.6, "wave"], [5.6, "cheer"]], facing: -1 } ],
      cam: { move: "orbit" },
      texts: [{ kind: "narr", t: "New friend in town.", at: 3.4, dur: 3, type: true, pos: "bottom" }] } },
  ] }],
  ["Video dọc 9:16 3D: Sân thượng đêm (10 giây)", { aspect: "9:16", res: "1080p", fade: 1, title: "san-thuong-3d" }, { shots: [
    { dur: 10, tpl: "scene3d", music: "sad", sfx: [{ at: 4.6, name: "footsteps", gain: -10 }], args: {
      set: "rooftop", particles: "dust",
      actors: [
        { who: "hoodie", x: "edge", pose: "slump", face: "sad", turnAt: [[6.2, 0]], faceAt: [[7, "smile"]], poseAt: [[6.2, "stand"]] },
        { who: "friend", x: 1.1, z: .6, pose: "walk", face: "smile", walk: { to: .74, at: 4.4, dur: 1.8 }, poseAt: [[6.4, "wave"]] } ],
      cam: { move: "crane" },
      texts: [{ kind: "narr", t: "He thought he was alone.", at: .6, dur: 3.6, type: true, pos: "top" },
        { kind: "say", t: "hey. you good?", who: "friend", at: 6.6, x: .7, y: .3 }] } },
  ] }],
];

window.AI_PROMPT5 = `Bạn là đạo diễn phim hoạt hình 3D ngắn KHÔNG LỜI ĐỌC kiểu kênh self-improvement ("An Animated Short Film").
Tôi sẽ đưa một chủ đề. Hãy trả về DUY NHẤT một khối JSON (không giải thích, không markdown) cho app "Video Studio by Kai", tab "Làm video 3D".

KHUNG JSON:
{"shots":[
 {"dur":6,"tpl":"scene3d","music":"sad","sfx":[{"at":0.3,"name":"clock_tick","gain":-12}],
  "args":{
   "set":"bedroom",
   "setArgs":{"clock":"3:17","lamp":true,"laptop":"off","calendar":{"month":"OCT","fill":12}},
   "actors":[
     {"who":"hoodie","x":"bed.sit","pose":"sitphone","face":"tired","bloodshot":true},
     {"who":"voice","x":0.6,"z":0.25,"pose":"reach","facing":-1,"at":1.2}
   ],
   "cam":{"move":"push"},
   "hud":{"rows":[{"label":"DAY","n":47}]},
   "texts":[
     {"kind":"narr","t":"Tomorrow sounded reasonable.","at":0.4,"dur":4.5,"type":true,"pos":"bottom"},
     {"kind":"tempt","t":"one more video.","at":2,"x":0.62,"y":0.16}
   ]}}
]}

QUY TẮC CHUNG:
- Mọi cảnh dùng "tpl":"scene3d". Mỗi cảnh có "dur" (giây), 4 đến 8 giây. Tổng 30 đến 60 giây.
- Chữ trên hình bằng tiếng Anh, câu ngắn dưới 9 từ, đánh vần chuẩn.
- Nhân vật chính giữ đúng MỘT "who" suốt phim (đổi sang "band" khi bắt đầu tập luyện là dấu hiệu thay đổi).
- Lặp lại cùng bối cảnh phòng ngủ nhiều lần, chỉ đổi giờ đồng hồ, lịch, đèn, để người xem thấy thời gian trôi.
- Cảnh cuối là khoảnh khắc ánh sáng / người thật / chữ chốt.
- Chỉ dùng đúng các tên có trong danh sách dưới đây.

BỐI CẢNH ("set") và "setArgs":
- "bedroom": phòng ngủ. setArgs: "clock" ("3:17"), "ring" (true = đồng hồ rung), "lamp" (true/false), "laptop" (true / "off"), "sky" ("night","dawn","day","rain"), "calendar" {"month","fill","mode":"x"|"fill"} hoặc false, "window": false, "desk": false.
  Mốc đặt nhân vật: "bed.sit" (ngồi mép giường), "desk.seat" (ngồi bàn), "window" (đứng nhìn ra cửa sổ, quay lưng), "center", "door". Nằm ngủ trên giường: thêm "bed": {"who":"hoodie","face":"sleep","faceAt":[[2,"tired"]]} vào args.
- "street": phố đêm. setArgs: "time" ("night","dusk","dawn"), "rain" (true), "neonDoor" (0..1, cửa neon cám dỗ màu nhấn), "lamps" [0.1, 0.9], "scroll" (số, ví dụ 2 = phố trôi qua như đang chạy). Mốc: "center","sidewalk","lamp","neon".
- "rooftop": sân thượng nhìn thành phố, trăng to. Mốc: "edge" (đứng mép, quay lưng nhìn thành phố), "center","tank".
- "gym": phòng tập, bao cát, giá tạ. setArgs: "swing" (độ lắc bao cát 0..1). Mốc: "bag" (đứng đấm bao cát), "bench" (ngồi ghế), "rack","center".
- "hill": ngọn đồi, mặt trời. setArgs: "time" ("dawn","dusk","day","night"), "rise" (mặt trời mọc dần, ví dụ 0.3), "tree": false. Mốc: "top" (đỉnh đồi),"tree","slope".
- "void": nền đen, một đèn rọi từ trên xuống. setArgs: "spot" (0..1 vị trí đèn), "spotColor". Dùng cho khoảnh khắc cô đơn, đáy cảm xúc.

NHÂN VẬT ("actors"):
- "who": "hoodie" (áo hoodie xám, mũ hạ), "hooded" (trùm mũ), "hero" (cởi trần), "band" (băng đô màu nhấn, khi tập luyện), "friend","friend2","friend3" (mũ vàng/xanh/đỏ), "girl" (tóc bob khăn vàng), "mom","dad","kid", "ghost" (mờ), "voice" (bóng đen cám dỗ: đen tuyền, mắt và nụ cười phát sáng, hào quang màu nhấn), "robot" (robot 3D có xương, cử động mượt).
- "x": số 0..1 (trái sang phải) hoặc tên mốc ở trên. "z": 0 = hàng trước, 1 = lùi sâu ra sau (bóng đen thường z 0.2-0.4).
- "pose": "stand","relaxed","slump","phone","reach","point","wave","cheer","fist","headhold","facepalm","arms","shrug","hug","open","think","guard","punch" (đấm liên tục),"lift" (tạ tay),"walk","run" (chạy tại chỗ),"sit","sitphone","sitdesk","sitsad","knees" (ngồi bó gối dưới sàn),"kneel","crouch","pushup","lie".
  Robot dùng thêm: "dance","yes","no","thumbsup","jump","death","standup".
- "poseAt": [[giây, "tư thế"]] đổi tư thế giữa cảnh (tự chuyển mượt).
- "face": "neutral","smile","happy","sad","tired","determined","angry","sleep","cry","shock","grin". "faceAt": [[giây, "mặt"]].
- "bloodshot": true = mắt đỏ gân máu (thức đêm, nghiện). "hold": "phone" | "dumbbell". "glowFace": màu màn hình điện thoại chiếu lên mặt.
- "walk": {"to": số 0..1 hoặc tên mốc, "at": giây bắt đầu, "dur": giây, "run": true nếu chạy}. Nhân vật tự quay mặt theo hướng đi.
- "facing": 1 (quay sang phải) | -1 (quay sang trái) | 0 (nhìn thẳng). "rot": độ quay tự do (180 = quay lưng). "turnAt": [[giây, độ]].
- "at": giây xuất hiện (hiện dần). "out": giây biến mất (mờ dần). "scale": cỡ (1 bình thường, bóng đen yếu dần 0.8 → 0.6 qua các cảnh).

MÁY QUAY ("cam"), luôn có chuyển động:
- "cam": {"move": "push" | "pull" | "orbit" | "orbitl" | "crane" (từ trên hạ xuống) | "drop" (bay lên cao) | "low" (góc thấp hùng tráng) | "high" | "wide" | "close" (cận mặt) | "side" | "back" | "static"}.
- "look": tên "who" của nhân vật để máy quay bám theo (bắt buộc với "close"). "shake": [{"at":giây,"amt":1,"dur":0.4}] rung máy. "fov": góc ống kính.
- Nâng cao: "from":[góc ngang độ, góc cao độ, khoảng cách m], "to":[...], ví dụ {"from":[-30,10,7],"to":[20,5,4.5],"look":"hoodie"}.

HIỆU ỨNG:
- "particles": "dust" | "rain" | "snow" | "embers" | "stars" | "fireflies".
- "fx": [{"kind":"shards","at":giây}] bóng đen vỡ thành mảnh sáng (đặt "out" của voice cùng giây, sfx "glass_shatter"). Chung: "flash","pulse","dark","glitch" (như bản 2D).
- "props": [{"kind":"box"|"plant"|"chair"|"trophy"|"books"|"candle","x":0..1,"z":0..1}]. "lights": [{"x":0.3,"y":2,"color":"#ffc56b","power":8}]. "glow": màu viền sáng phía sau.

CHỮ VÀ BỘ ĐẾM (giống bản 2D):
- "texts": "narr" (chữ kể chuyện trắng; "pos":"top"|"bottom"|"center"; "type":true gõ từng chữ), "tempt" (giọng cám dỗ viết tay màu nhấn, đặt "x","y" cạnh bóng đen, KHÔNG đè mặt nhân vật chính), "big" (chữ chốt rất to), "say" (bong bóng thoại, "who" + "x","y").
- "hud": {"rows":[{"label":"DAY","n":47}]} hoặc đếm dần {"label":"DAY","from":3,"to":30,"at":0.3,"dur":4} hoặc sụp về 0 {"label":"DAY","n":412,"reset":{"at":1.5,"to":0}}.
- "music": "sad" | "dark" | "hope". "sfx": [{"at":giây,"name":"...","gain":-8}] với name trong: clock_tick, alarm_beep, heartbeat, footsteps, tempt_swell, tempt_whisper, glass_shatter, punch_bag, impact_light, impact_heavy, whoosh_fast, whoosh_mid, whoosh_long, riser_2s, riser_4s, boom_deep, thud_soft, phone_vibrate, notif_msg, door_open, rain_loop, breath_in, ding_soft, ting_idea, pop.

NỘI DUNG NHẠY CẢM: không vẽ cơ thể gợi cảm, không minh hoạ tự hại; dùng ẩn dụ (bóng tối, căn phòng trống) và luôn kết bằng ánh sáng, người thật.
`;
