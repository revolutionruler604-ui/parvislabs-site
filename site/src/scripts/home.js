import { isLive } from './live.js';

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const page = $('page'), hero = document.querySelector('.hero');
  const wide = $('wide'), tall = $('tall');
  const el = (name, attrs, parent) => { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n; };

  // The button is a model of the loop, not a replay of the log: review sends a change back at most once, half the time.
  // The founder's share is from the record snapshot the page was built with (src/data/record.json).
  const TOTAL = +$('tally').dataset.total, FOUNDER = +$('tally').dataset.founder, SHARE = TOTAL > 0 && FOUNDER >= 0 ? FOUNDER / TOTAL : 0;
  const pickRounds = () => (Math.random() < .5 ? 1 : 0);

  /* ---------- the hero machine ---------- */
  let rig;
  const balls = [];
  const say = $('say'), tally = $('tally');
  const count = { done: 0, founder: 0, bowl: 0 };
  const show = () => { tally.hidden = false; for (const k of ['done', 'founder']) $('n-' + k).textContent = count[k]; $('n-times').textContent = count.founder === 1 ? 'time' : 'times'; };

  function build(svg, p) {
    const main = svg.querySelector('#' + p + '-main'), lift = svg.querySelector('#' + p + '-lift'), side = svg.querySelector('#' + p + '-founder');
    const len = main.getTotalLength();
    const near = (cx, cy) => { let best = 0, bd = 1e9; for (let s = 0; s <= len; s += 2) { const q = main.getPointAtLength(s), d = (q.x - cx) ** 2 + (q.y - cy) ** 2; if (d < bd) { bd = d; best = s; } } return best; };
    const at = {};
    svg.querySelectorAll('.joint').forEach(j => { at[j.dataset.j] = { s: near(+j.getAttribute('cx'), +j.getAttribute('cy')), el: j }; });
    const a = side.getPointAtLength(0), z = side.getPointAtLength(side.getTotalLength());
    const m = svg.getScreenCTM(), hr = hero.getBoundingClientRect(), pr = page.getBoundingClientRect();
    // Labels keep one size on screen however far the drawing is scaled.
    svg.querySelectorAll('.lbl').forEach(t => { t.style.fontSize = (innerWidth <= 760 ? 13 : 15) / m.a + 'px'; });
    const sy = q => q.x * m.b + q.y * m.d + m.f, sx = q => q.x * m.a + q.y * m.c + m.e;
    let startS = 0, exitS = len, exitX = 0;
    for (let s = 0; s <= len; s += 3) { const q = main.getPointAtLength(s); if (sy(q) < hr.top - 30) startS = s; if (sy(q) >= hr.bottom) { exitS = s; exitX = sx(q) - pr.left; break; } }
    return { svg, main, lift, side, len, at, startS, exitS, exitX, exitY: hr.bottom - pr.top, fork: near(a.x, a.y), join: near(z.x, z.y), layer: svg.querySelector('#' + p + '-balls'), r: p === 'w' ? 11 : 8, scale: p === 'w' ? 1 : .62, px: m.a };
  }
  // A phone, or any screen taller than it is wide (a tablet held upright), gets the tall drawing.
  const isTall = () => innerWidth <= 760 || innerWidth < innerHeight;
  function choose() {
    const t = isTall();
    wide.toggleAttribute('hidden', t); tall.toggleAttribute('hidden', !t);
    for (let i = balls.length - 1; i >= 0; i--) if (balls[i].on !== 'thread') { balls[i].el.remove(); balls.splice(i, 1); }
    rig = build(t ? tall : wide, t ? 't' : 'w');
    for (let k = 0; k < 3; k++) balls.push({ el: el('circle', { class: 'ball', r: rig.r }, rig.layer), on: 'main', s: slotS(k), v: 0, held: true, seen: {}, sent: 0 });
  }
  // Three changes wait their turn just above Plan. Dropping one lets the front one go.
  const slotS = k => rig.at.plan.s - rig.r * (1.4 + k * 2.3);
  const pulse = name => { const j = rig.at[name].el; j.classList.add('on'); setTimeout(() => j.classList.remove('on'), 260); };
  const BACK = 'Review. A different agent tried to break it, and did. Sent back.';
  const tell = (b, text) => { if (b.newest) say.textContent = text; };

  function drop() {
    const rounds = pickRounds(), founder = Math.random() < SHARE;
    if (reduce) {
      count.done++; if (founder) count.founder++; show();
      say.textContent = (rounds ? 'Sent back once, then recorded. ' : 'Passed review the first time. ') + (founder ? 'The founder decided this one.' : 'Nobody asked the founder.');
      settle(null); return;
    }
    if (balls.filter(b => b.on !== 'thread' && !b.held && !b.refill).length >= 14) { say.textContent = 'The crew is busy. Give them a second.'; return; }
    balls.forEach(b => b.newest = false);
    const live = { on: 'main', s: rig.startS, v: 260 * rig.scale, wait: 0, rounds, sent: 0, founder, seen: {}, newest: true };
    const front = balls.filter(b => b.held || b.refill).sort((a, b) => b.s - a.s)[0];
    if (front) {
      Object.assign(front, live, { s: front.s, v: 40 * rig.scale, held: false, refill: false });
      balls.forEach(b => { if (b.held) { b.held = false; b.refill = true; } });
      balls.push({ el: el('circle', { class: 'ball', r: rig.r }, rig.layer), on: 'main', s: rig.startS, v: 260 * rig.scale, refill: true, seen: {}, sent: 0 });
    } else balls.push({ el: el('circle', { class: 'ball', r: rig.r }, rig.layer), ...live });
    say.textContent = 'Plan. An agent writes down what done looks like.';
  }

  /* ---------- the thread through the page ---------- */
  const thread = $('thread'), tpath = $('thread-path'), tj = $('thread-joints'), tt = $('thread-twigs'), tb = $('thread-balls');
  let T = { len: 0 }, slots = [];
  function layoutThread() {
    thread.style.height = '0px'; // the line itself must not prop the page open at a stale height
    const pr = page.getBoundingClientRect(), W = pr.width, H = page.scrollHeight;
    thread.setAttribute('viewBox', '0 0 ' + W + ' ' + H); thread.style.height = H + 'px';
    const pts = [{ x: rig.exitX, y: rig.exitY }];
    document.querySelectorAll('#page .knot').forEach(k => { if (!k.offsetParent) return; const r = k.getBoundingClientRect(); pts.push({ x: r.left - pr.left, y: r.top - pr.top, joint: k.dataset.joint }); });
    let d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], h = (b.y - a.y) * .5;
      d += ' C' + a.x.toFixed(1) + ' ' + (a.y + h).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + (b.y - h).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    }
    tpath.setAttribute('d', d);
    const old = T.len; T = { len: tpath.getTotalLength() };
    if (old) balls.forEach(b => { if (b.on === 'thread') b.s = b.s / old * T.len; });
    tj.replaceChildren(); tt.replaceChildren();
    pts.forEach(p => { if (p.joint !== undefined) el('circle', { class: 'joint' + (p.joint === 'live' ? ' live' : ''), cx: p.x, cy: p.y, r: 8 }, tj); });
    const end = pts[pts.length - 1], small = W <= 900, R = small ? 8 : 11, step = R * 2 + 1;
    slots = [];
    [[7, 46], [6, 46 - step * .86], [5, 46 - step * 1.72]].forEach(([n, dy]) => { [...Array(n).keys()].sort((a, b) => Math.abs(a - (n - 1) / 2) - Math.abs(b - (n - 1) / 2)).forEach(i => slots.push({ x: end.x + (i - (n - 1) / 2) * step, y: end.y + dy * (small ? .8 : 1), r: R })); });
    tb.querySelectorAll('[data-slot]').forEach(c => { const s = slots[+c.dataset.slot]; c.setAttribute('cx', s.x); c.setAttribute('cy', s.y); c.setAttribute('r', s.r); });
  }
  function settle(node) {
    const i = count.bowl++, s = slots[i % slots.length];
    $('bowl-say').textContent = count.bowl === 1 ? 'One change aboard. It made it.' : count.bowl > slots.length ? count.bowl + ' changes. The ship is full and you are still going.' : count.bowl + ' changes aboard.';
    if (i >= slots.length) { if (node) node.remove(); return; }
    const c = node || el('circle', { class: 'ball', r: s.r }, tb);
    c.dataset.slot = i;
    if (!node) { c.setAttribute('cx', s.x); c.setAttribute('cy', s.y); return; }
    const x0 = +c.getAttribute('cx'), y0 = +c.getAttribute('cy'), t0 = performance.now();
    const fall = now => { const t = Math.min(1, (now - t0) / 420), e = 1 - Math.pow(1 - t, 3); c.setAttribute('cx', x0 + (s.x - x0) * e); c.setAttribute('cy', y0 + (s.y - y0) * e * e); if (t < 1 && c.dataset.slot == i) requestAnimationFrame(fall); else { c.setAttribute('cx', slots[i].x); c.setAttribute('cy', slots[i].y); } };
    requestAnimationFrame(fall);
  }

  /* ---------- one loop moves every sphere ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.04, (now - last) / 1000); last = now;
    const G = 2300 * rig.scale, order = balls.filter(b => b.on === 'main').sort((a, b) => b.s - a.s);
    for (const b of balls) {
      if (b.wait > 0) { b.wait -= dt; continue; }
      if (b.held) { const p = rig.main.getPointAtLength(b.s); b.el.setAttribute('cx', p.x); b.el.setAttribute('cy', p.y); continue; }
      if (b.on === 'main') {
        const p0 = rig.main.getPointAtLength(b.s), p1 = rig.main.getPointAtLength(Math.min(rig.len, b.s + 2));
        b.v += (G * (p1.y - p0.y) / 2 - b.v * 1.2) * dt;
        b.v = Math.max(170 * rig.scale, b.v);
        let s = b.s + b.v * dt;
        const ahead = order[order.indexOf(b) - 1];
        if (ahead && ahead.on === 'main' && s > ahead.s - rig.r * 2.3) { s = Math.max(b.s, ahead.s - rig.r * 2.3); b.v = Math.min(b.v, ahead.v); }
        if (b.refill) { const t = slotS(balls.filter(o => o.held && o.s > b.s).length); if (s >= t - .5) { s = t; b.v = 0; b.held = true; b.refill = false; } }
        const cross = name => !b.seen[name + b.sent] && b.s < rig.at[name].s && s >= rig.at[name].s;
        if (cross('plan')) { b.seen['plan' + b.sent] = 1; pulse('plan'); b.wait = .35; }
        if (cross('build')) { b.seen['build' + b.sent] = 1; pulse('build'); b.wait = .45; tell(b, b.sent ? 'Build. The builder fixes what the reviewer found.' : 'Build. A second agent writes it and saves each step that works.'); }
        if (cross('review')) {
          b.seen['review' + b.sent] = 1; pulse('review'); b.wait = .55; s = rig.at.review.s;
          if (b.rounds > 0) { b.rounds--; tell(b, BACK); b.sent++; b.on = 'lift'; b.t = 0; }
          else tell(b, 'Review. A different agent tried to break it. It held.');
        }
        if (b.on === 'main' && b.founder && !b.seen.fork && b.s < rig.fork && s >= rig.fork) { b.seen.fork = 1; b.on = 'side'; b.t = 0; b.half = false; }
        if (b.on === 'main' && !b.seen.rec && b.s < rig.at.record.s && s >= rig.at.record.s) {
          b.seen.rec = 1; pulse('record'); count.done++; show();
          tell(b, b.founder ? 'Recorded. The founder decided this one.' : 'Recorded. Nobody asked the founder.');
        }
        b.s = s;
        if (b.s >= rig.exitS) {
          b.el.remove(); b.el = el('circle', { class: 'ball', r: T.len && innerWidth <= 900 ? 8 : 11 }, tb);
          b.on = 'thread'; b.s = 0; b.v = Math.max(700, b.v * rig.px);
        } else { const p = rig.main.getPointAtLength(b.s); b.el.setAttribute('cx', p.x); b.el.setAttribute('cy', p.y); continue; }
      }
      if (b.on === 'lift') {
        const L = rig.lift.getTotalLength(); b.t += 640 * rig.scale * dt;
        const p = rig.lift.getPointAtLength(Math.min(L, b.t)); b.el.setAttribute('cx', p.x); b.el.setAttribute('cy', p.y);
        if (b.t >= L) { b.on = 'main'; b.s = rig.at.build.s - 1; b.v = 40 * rig.scale; }
      } else if (b.on === 'side') {
        const L = rig.side.getTotalLength(); b.t += 230 * rig.scale * dt;
        if (!b.half && b.t >= L * .42) { b.half = true; b.wait = 1.3; count.founder++; show(); tell(b, 'The founder is asked. Money, privacy, or anything the public will see.'); }
        const p = rig.side.getPointAtLength(Math.min(L, b.t)); b.el.setAttribute('cx', p.x); b.el.setAttribute('cy', p.y);
        if (b.t >= L) { b.on = 'main'; b.s = rig.join; b.v = 60 * rig.scale; }
      } else if (b.on === 'thread') {
        const p0 = tpath.getPointAtLength(b.s), p1 = tpath.getPointAtLength(Math.min(T.len, b.s + 2));
        b.v += (3600 * (p1.y - p0.y) / 2 - b.v * 1.2) * dt;
        b.v = Math.max(700, b.v);
        b.s += b.v * dt;
        const p = tpath.getPointAtLength(Math.min(T.len, b.s)); b.el.setAttribute('cx', p.x); b.el.setAttribute('cy', p.y);
        if (b.s >= T.len) { b.dead = true; settle(b.el); }
      }
    }
    for (let i = balls.length - 1; i >= 0; i--) if (balls[i].dead) balls.splice(i, 1);
    requestAnimationFrame(frame);
  }


  /* ---------- the voyage: the real globe, the real way round ---------- */
  const G = window.geo, LAND = window.LAND;
  // Each leg runs port to port. The points between keep the track at sea.
  const LEGS = [
    [[-4.14, 50.36], [-7, 48], [-10.5, 43.5], [-10.5, 36], [-9.9, 31.5], [-14, 26], [-17.8, 21], [-23.5, 15]],
    [[-23.5, 15], [-28, 5], [-31, -5], [-36, -18], [-44, -28], [-51, -33.5], [-56.2, -35.6]],
    [[-56.2, -35.6], [-55.5, -38], [-60, -42.5], [-64.5, -46.5], [-67.6, -49.3]],
    [[-67.6, -49.3], [-67.5, -51.5], [-68.6, -52.5], [-71.2, -53.5]],
    [[-71.2, -53.5], [-74.2, -52.8], [-76.5, -49], [-75.5, -42], [-74.2, -38.3], [-71.9, -33]],
    [[-71.9, -33], [-72.5, -27], [-71.5, -22], [-71.2, -18.5], [-74, -15.5], [-77.3, -12.05]],
    [[-77.3, -12.05], [-80, -8], [-82, -4], [-81.5, 1], [-84, 6], [-89, 11.5], [-93.5, 14], [-96.2, 15.6]],
    [[-96.2, 15.6], [-103, 15], [-112, 19], [-124, 28], [-130, 37], [-128.5, 43.5], [-125, 42.5], [-123.2, 38]],
    [[-123.2, 38], [-135, 30], [-155, 18], [-180, 11], [160, 9], [145, 9], [134.5, 7.8], [127.5, 6], [127.6, 3], [127.3, .9]],
    [[127.3, .9], [126.3, -1.2], [124.6, -3.5], [125.2, -7], [124.5, -8.6], [121, -10.6], [114, -9.8], [109.2, -8]],
    [[109.2, -8], [100, -13], [80, -22], [58, -30], [38, -34], [26, -36], [18.3, -35.2]],
    [[18.3, -35.2], [13, -28], [6, -15], [-4, -2], [-11, 3.5], [-13.6, 8.3]],
    [[-13.6, 8.3], [-18.5, 13], [-19.5, 21], [-17, 28.5], [-13.5, 36], [-12, 43], [-8, 47.5], [-4.14, 50.36]]
  ];
  const STOPS = [
    { name: 'Plymouth', side: 1 },
    { name: 'Rich Life', place: 'Cape Verde', side: -1 },
    { name: 'Blackfin', place: 'Río de la Plata', side: 1 },
    { name: 'Frame Board', place: 'Puerto San Julián', side: 1 },
    { name: 'Language Coach', place: 'Strait of Magellan', side: -1 },
    { name: 'Atlas', place: 'Valparaíso', side: -1 },
    { name: 'Rich Life for everyone', place: 'Callao', side: -1 },
    { name: 'Home operating system', place: 'Huatulco', side: -1 },
    { name: 'More Blackfin strategies', place: 'California', side: -1 },
    { place: 'Ternate', side: 1 }, { place: 'Java', side: -1 }, { place: 'Cape of Good Hope', side: 1 }, { place: 'Sierra Leone', side: 1 },
    { name: 'Plymouth', side: 1 }
  ];
  const NOW = 3; // ports made so far
  const soften = line => { const out = [line[0]]; for (let i = 0; i < line.length - 1; i++) { const f = G.geoInterpolate(line[i], line[i + 1]); out.push(f(.25), f(.75)); } out.push(line[line.length - 1]); return out; };
  const R = { pts: [], cum: [], stop: [0] };
  LEGS.forEach(leg => {
    const l = soften(soften(leg));
    for (let i = 0; i < l.length - 1; i++) {
      const d = G.geoDistance(l[i], l[i + 1]), n = Math.max(1, Math.ceil(d / .02)), f = G.geoInterpolate(l[i], l[i + 1]);
      for (let k = R.pts.length ? 1 : 0; k <= n; k++) { const q = f(k / n); R.cum.push(R.pts.length ? R.cum[R.cum.length - 1] + G.geoDistance(R.pts[R.pts.length - 1], q) : 0); R.pts.push(q); }
    }
    R.stop.push(R.cum[R.cum.length - 1]);
  });
  R.total = R.cum[R.cum.length - 1];
  const idxAt = s => { let lo = 0, hi = R.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R.cum[m] <= s) lo = m; else hi = m; } return lo; };
  const posAt = s => { s = Math.max(0, Math.min(R.total, s)); const i = idxAt(s), j = Math.min(i + 1, R.pts.length - 1), span = R.cum[j] - R.cum[i]; return span ? G.geoInterpolate(R.pts[i], R.pts[j])(Math.min(1, (s - R.cum[i]) / span)) : R.pts[i]; };
  const PORT = R.stop.map(posAt), GRID = G.geoGraticule10(), SPHERE = { type: 'Sphere' };
  $('round').textContent = Math.round(R.stop[NOW] / R.total * 100);

  const globes = [...document.querySelectorAll('canvas.globe')].map(c => ({ c, ctx: c.getContext('2d'), box: c.closest('.leg') || c.closest('.home'), kind: c.dataset.kind, from: +c.dataset.from, to: +c.dataset.to, labels: c.dataset.labels.split(',').map(Number), s: null, size: 0, hit: 0, there: false, proj: G.geoOrthographic().clipAngle(90).precision(.4) }));
  let dpr = 1, queued = false;
  const smooth = u => u * u * (3 - 2 * u), unit = v => Math.max(0, Math.min(1, v));
  function wantOf(g) {
    const r = g.box.getBoundingClientRect(), vh = innerHeight, travel = r.height - vh;
    let u;
    if (g.kind === 'pass') u = unit((vh - r.top) / r.height);
    else if (travel < 40) u = g.kind === 'look' ? .5 : 1;
    else u = unit((unit(-r.top / travel) - .05) / .85);
    return R.stop[g.from] + (R.stop[g.to] - R.stop[g.from]) * smooth(u);
  }
  function chart(g, now) {
    const { ctx, size, proj } = g, c = size / 2, cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
    const ink = v('--line'), ground = v('--ground'), muted = v('--muted'), accent = v('--accent'), text = v('--ink');
    const at = g.kind === 'sail' ? g.s : R.stop[NOW], ship = posAt(at);
    const eye = g.kind === 'sail' ? G.geoInterpolate(ship, PORT[g.to])(.3) : posAt(g.s), mid = [eye[0], eye[1] * .8];
    proj.translate([c, c]).scale(c - 3).rotate([-mid[0], -mid[1]]);
    const path = G.geoPath(proj, ctx), seen = q => G.geoDistance(mid, q) < 1.5, draw = o => { ctx.beginPath(); path(o); };
    let again = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size); ctx.lineJoin = ctx.lineCap = 'round'; ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle = ink;
    draw(SPHERE); ctx.globalAlpha = .045; ctx.fill();
    draw(GRID); ctx.globalAlpha = .1; ctx.lineWidth = 1; ctx.stroke();
    draw(LAND); ctx.globalAlpha = .14; ctx.fill(); ctx.globalAlpha = .6; ctx.lineWidth = .9; ctx.stroke();
    ctx.globalAlpha = 1; draw(SPHERE); ctx.lineWidth = 2; ctx.stroke();
    const i = idxAt(at);
    draw({ type: 'LineString', coordinates: [ship, ...R.pts.slice(i + 1)] }); ctx.setLineDash([.1, 8]); ctx.lineWidth = 2.6; ctx.strokeStyle = muted; ctx.stroke();
    draw({ type: 'LineString', coordinates: [...R.pts.slice(0, i + 1), ship] }); ctx.setLineDash([]); ctx.lineWidth = 3.4; ctx.strokeStyle = ink; ctx.stroke();
    const f = Math.max(.8, Math.min(1.08, size / 600)), boat = seen(ship) ? proj(ship) : null;
    // Ports first, then labels. Each label takes the free spot beside its port that covers the least route,
    // fewest other ports and no earlier label or the ship.
    const jobs = [], dots = [];
    STOPS.forEach((st, k) => {
      const q = PORT[k]; if (!seen(q)) return;
      const [x, y] = proj(q), home = k === 0 || k === STOPS.length - 1, far = k > 8 && !home, made = home || (k <= NOW && at >= R.stop[k] - 1e-4), r = (home ? 4.5 : far ? 3.4 : 6.5) * f;
      const docked = boat && Math.hypot(boat[0] - x, boat[1] - y) < 22 * f;
      dots.push([x, y]);
      if (!(docked && Math.hypot(boat[0] - x, boat[1] - y) < 6 * f)) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = made ? ink : ground; ctx.fill(); ctx.lineWidth = far ? 1.8 : 2.8; ctx.strokeStyle = far ? muted : ink; ctx.stroke(); }
      if (g.kind === 'sail' && k === g.to && g.hit) { const a = (now - g.hit) / 600; if (a < 1) { ctx.beginPath(); ctx.arc(x, y, r + 18 * a * f, 0, 7); ctx.globalAlpha = 1 - a; ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.stroke(); ctx.globalAlpha = 1; again = true; } }
      if (g.labels.includes(k)) jobs.push({ st, x, y, r, docked });
    });
    const route = []; for (let j = 0; j < R.pts.length; j += 2) if (seen(R.pts[j])) route.push(proj(R.pts[j]));
    const boatBox = boat ? [boat[0] - 17 * f, boat[1] - 44 * f, boat[0] + 17 * f, boat[1]] : null;
    const fb = Math.max(13.5, 15 * f), fs = Math.max(11.5, 12.5 * f), bigFont = st => (st.name ? '700 ' : '500 ') + Math.round(fb) + 'px "Zen Kaku Gothic New",sans-serif', smallFont = '400 ' + Math.round(fs) + 'px "Zen Kaku Gothic New",sans-serif';
    const inside = (b, [px, py], pad) => px > b[0] - pad && px < b[2] + pad && py > b[1] - pad && py < b[3] + pad;
    const hits = (a, t) => a[0] < t[2] && a[2] > t[0] && a[1] < t[3] && a[3] > t[1];
    // Every spot beside each port, scored once: off the globe, over a port, nearer another port, over the route.
    // A small globe with many labels drops the place names under the project names.
    const tight = size < 440 && jobs.length > 3;
    const cands = jobs.map(({ st, x, y, r, docked }) => {
      const big = st.name || st.place, small = st.name && !tight ? st.place : '';
      ctx.font = smallFont; const ws = small ? ctx.measureText(small).width : 0;
      ctx.font = bigFont(st); const wb = ctx.measureText(big).width, hgt = fb + (small ? fs + 4 : 0), out = [];
      for (const side of [st.side, -st.side]) for (const lift of [0, 1, -1, 2, -2]) {
        const tx = x + side * (r + (docked ? 24 * f : 9)), step = hgt + 6;
        const ty = lift > 0 ? y - r - fs - 6 - (lift - 1) * step : lift < 0 ? y + r + fb + 4 + (-lift - 1) * step : y + (small ? -1 : 5) * f;
        // One box per line of text, as tight as the letters.
        const line = (w, base, size) => [side < 0 ? tx - w : tx, base - size * .78, side < 0 ? tx : tx + w, base + size * .22];
        const bs = [line(wb, ty, fb)]; if (small) bs.push(line(ws, ty + fs + 4, fs));
        const any = fn => bs.some(fn);
        let base = (side !== st.side ? .5 : 0) + (Math.abs(lift) === 2 ? 4 : Math.abs(lift) * .8);
        if (any(b => b[0] < 2 || b[2] > size - 2 || b[1] < 2 || b[3] > size - 2)) base += 100;
        if (boatBox && any(b => hits(b, boatBox))) base += 100;
        const ay = (bs[0][1] + bs[bs.length - 1][3]) / 2, own = Math.hypot(tx - x, ay - y);
        for (const d of dots) { if (any(b => inside(b, d, 4))) base += 20; if ((d[0] !== x || d[1] !== y) && Math.hypot(tx - d[0], ay - d[1]) < own) base += 40; }
        for (const pt of route) if (any(b => inside(b, pt, 2))) base += 1;
        out.push({ st, big, small, side, tx, ty, bs, base });
      }
      return out;
    });
    // Labels must not overlap. Place them one by one, and let each label in turn go first; keep the best total.
    const place = order => { const taken = [], pick = []; let total = 0;
      for (const i of order) { let best = null; for (const c of cands[i]) { let sc = c.base; for (const t of taken) if (c.bs.some(b => hits(b, t))) sc += 100; if (!best || sc < best.sc) best = { c, sc }; } taken.push(...best.c.bs); total += best.sc; pick.push(best.c); }
      return { total, pick }; };
    const ids = cands.map((_, i) => i); let plan = place(ids);
    for (let i = 1; i < ids.length; i++) { const tryIt = place([i, ...ids.filter(j => j !== i)]); if (tryIt.total < plan.total) plan = tryIt; }
    for (const { st, big, small, side, tx, ty } of plan.pick) {
      ctx.font = bigFont(st); ctx.textAlign = side < 0 ? 'right' : 'left'; ctx.strokeStyle = ground; ctx.lineWidth = 4;
      ctx.strokeText(big, tx, ty); ctx.fillStyle = st.name ? text : muted; ctx.fillText(big, tx, ty);
      if (small) { ctx.font = smallFont; ctx.strokeText(small, tx, ty + fs + 4); ctx.fillStyle = muted; ctx.fillText(small, tx, ty + fs + 4); }
    }
    if (boat) {
      const [x, y] = boat, n = proj(posAt(Math.min(R.total, at + .03))), dir = n[0] < x - .2 ? -1 : 1, k = 1.15 * f;
      ctx.save(); ctx.translate(x, y - 12 * k); ctx.scale(dir * k, k); ctx.fillStyle = accent; ctx.strokeStyle = ground; ctx.lineWidth = 3.5;
      const shape = () => { ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(0, 4, 15, -3); ctx.quadraticCurveTo(11, 8, 5, 9); ctx.lineTo(-7, 9); ctx.quadraticCurveTo(-12, 7, -14, 0); ctx.closePath();
        ctx.moveTo(1.5, -3); ctx.lineTo(1.5, -26); ctx.quadraticCurveTo(12, -17, 13, -3); ctx.closePath(); ctx.moveTo(-1.5, -3); ctx.lineTo(-1.5, -20); ctx.quadraticCurveTo(-9, -12, -10, -3); ctx.closePath(); };
      shape(); ctx.stroke(); shape(); ctx.fill(); ctx.restore();
    }
    return again;
  }
  function tick(now) {
    queued = false; let again = false;
    for (const g of globes) {
      const r = g.c.getBoundingClientRect(); if (!g.size || r.bottom < -40 || r.top > innerHeight + 40) continue;
      const want = wantOf(g), first = g.s === null;
      if (first || reduce || Math.abs(want - g.s) < 2e-4) g.s = want; else { g.s += (want - g.s) * .16; again = true; }
      if (g.kind === 'sail') { const there = g.s >= R.stop[g.to] - 1e-4; if (there && !g.there && !first && !reduce) g.hit = now; g.there = there; }
      if (chart(g, now)) again = true;
    }
    if (again) kick();
  }
  function kick() { if (!queued) { queued = true; requestAnimationFrame(tick); } }
  function sizeGlobes() {
    dpr = Math.min(2, devicePixelRatio || 1);
    for (const g of globes) { const w = Math.round(g.c.clientWidth); if (w && w !== g.size) { g.size = w; g.c.width = g.c.height = Math.round(w * dpr); } }
    kick();
  }
  addEventListener('scroll', kick, { passive: true });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', kick);
  new MutationObserver(kick).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function relayout() { const t = isTall(); if (t !== !tall.hasAttribute('hidden')) choose(); else { const keep = rig; rig = build(keep.svg, keep.svg === tall ? 't' : 'w'); } layoutThread(); sizeGlobes(); }
  choose(); layoutThread(); sizeGlobes();
  let timer; const later = () => { clearTimeout(timer); timer = setTimeout(relayout, 120); };
  addEventListener('resize', later); addEventListener('load', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  if ('ResizeObserver' in window) new ResizeObserver(later).observe(page);
  $('drop').addEventListener('click', drop);
  if (!reduce) requestAnimationFrame(frame);

  /* ---------- Rich Life: whose eyes, and the chart ---------- */
  const press = (group, on) => group.forEach(b => b.setAttribute('aria-pressed', b === on));
  const eyes = [...document.querySelectorAll('[data-eyes]')];
  eyes.forEach(b => b.addEventListener('click', () => { press(eyes, b); $('eyes-a').hidden = b.dataset.eyes !== 'a'; $('eyes-b').hidden = b.dataset.eyes !== 'b'; }));
  const flows = [...document.querySelectorAll('[data-flow]')];
  // On a phone the chart is wider than the screen. It opens where the money comes in, and Open Guilt-Free pans to where the split is.
  const pan = document.querySelector('.pan'), panTo = (end, smooth) => { const room = pan.scrollWidth - pan.clientWidth; if (room > 0) pan.scrollTo({ left: end ? room : pan.clientWidth < 600 ? Math.min(room, Math.max(0, pan.scrollWidth * .41 - pan.clientWidth)) : 0, behavior: smooth && !reduce ? 'smooth' : 'auto' }); };
  panTo(false, false);
  flows.forEach(b => b.addEventListener('click', () => { press(flows, b); const drill = b.dataset.flow === 'drill'; $('flow-all').classList.toggle('off', drill); $('flow-drill').classList.toggle('off', !drill); panTo(drill, true); }));

  /* ---------- Blackfin: try to make it buy ---------- */
  const gates = $('gates'), rows = [...gates.querySelectorAll('li')], gball = $('gate-ball'), send = $('send'), verdict = $('verdict');
  const sw = [...gates.querySelectorAll('.switch')];
  const paint = () => rows.forEach(li => { const s = li.querySelector('.switch'); li.classList.toggle('shut', !!s && s.getAttribute('aria-pressed') === 'false'); });
  sw.forEach(s => s.addEventListener('click', () => { s.setAttribute('aria-pressed', s.getAttribute('aria-pressed') !== 'true'); paint(); const off = sw.filter(x => x.getAttribute('aria-pressed') === 'false').length; verdict.textContent = off === 0 ? 'Every switch is on. This almost never happens. Send it.' : off === 1 ? 'One switch is off. That is the usual state of things.' : off + ' switches are off. It will not get far.'; }));
  paint();
  const yOf = li => li.offsetTop + li.offsetHeight / 2 - 14;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function sendOrder() {
    const stop = rows.findIndex(li => li.classList.contains('shut')), lastRow = stop < 0 ? rows.length - 1 : stop;
    const no = stop < 0 ? '' : rows[stop].querySelector('.switch').dataset.no;
    const yes = 'Bought. The stop-loss goes in with the order, and the bot goes back to sleep.';
    if (reduce) { verdict.textContent = stop < 0 ? yes : 'Refused. ' + no; return; }
    send.disabled = true; verdict.textContent = 'The order is on its way down.';
    gball.style.transition = 'none'; gball.style.transform = 'translateY(' + yOf(rows[0]) + 'px)'; gball.style.opacity = 1; gball.getBoundingClientRect();
    for (let i = 1; i <= lastRow; i++) { gball.style.transition = 'transform 300ms cubic-bezier(.77,0,.175,1)'; gball.style.transform = 'translateY(' + yOf(rows[i]) + 'px)'; await wait(i === lastRow ? 320 : 420); }
    if (stop < 0) { verdict.textContent = yes; await wait(900); gball.style.transition = 'opacity 400ms'; gball.style.opacity = 0; }
    else {
      verdict.textContent = 'Refused. ' + no; await wait(500);
      gball.style.transition = 'transform 700ms cubic-bezier(.23,1,.32,1), opacity 700ms'; gball.style.transform = 'translateY(' + yOf(rows[0]) + 'px)'; gball.style.opacity = 0;
    }
    await wait(450); send.disabled = false;
  }
  send.addEventListener('click', sendOrder);

  /* ---------- Frame Board: the phone is the remote ---------- */
  let tapped = false, busy = false;
  $('phone').addEventListener('click', async () => {
    if (busy) return; busy = true; tapped = !tapped;
    $('phone-0').classList.toggle('off', tapped); $('phone-1').classList.toggle('off', !tapped);
    $('board-say').textContent = tapped ? 'One egg logged, one chore ticked. The TV is catching up.' : 'Back to before. Hens cannot actually do this.';
    await wait(reduce ? 0 : 1300);
    $('board-0').classList.toggle('off', tapped); $('board-1').classList.toggle('off', !tapped);
    if (tapped) $('board-say').textContent = 'There. Tap again to undo.';
    busy = false;
  });

  /* ---------- Blackfin: the account's one figure, read once a minute ---------- */
  // The page prints the last snapshot. When the site's live endpoint has a reading, it replaces it.
  // A reading under three minutes old counts as live; the bot only sends while the market is open.
  const tickBox = $('tick'), tickPct = $('tick-pct'), tickWhen = $('tick-when');
  const nyTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true });
  const nyDay = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' });
  const clock = d => { const p = {}; nyTime.formatToParts(d).forEach(x => { p[x.type] = x.value; }); return p.hour + ':' + p.minute + (p.dayPeriod === 'AM' ? ' a.m.' : ' p.m.'); };
  const signed = v => (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(2) + '%';
  let lastPct = null;
  const readLive = async () => {
    if (document.hidden) return;
    let v;
    try { const r = await fetch('/api/blackfin-live', { cache: 'no-store' }); if (r.status !== 200) return; v = await r.json(); } catch (e) { return; }
    if (!v || typeof v.pct !== 'number' || !isFinite(v.pct) || typeof v.at !== 'string') return;
    const at = new Date(v.at); if (isNaN(at.getTime())) return;
    // Live only for a reading from the last three minutes; one stamped ahead of this clock is not.
    const live = isLive(Date.now(), at.getTime());
    tickPct.textContent = signed(v.pct);
    tickWhen.textContent = live ? 'Live at ' + clock(at) + ' New York time.' : 'Last read ' + nyDay.format(at) + ' at ' + clock(at) + ' New York time.';
    tickBox.classList.toggle('live', live);
    if (lastPct !== null && v.pct !== lastPct && !reduce) { tickPct.classList.remove('moved'); void tickPct.offsetWidth; tickPct.classList.add('moved'); }
    lastPct = v.pct;
  };
  readLive(); setInterval(readLive, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) readLive(); });

  const mail = $('mail'); mail.href = 'mailto:' + mail.dataset.u + '@' + mail.dataset.d;
})();
