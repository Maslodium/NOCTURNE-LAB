/* NOCTURNE / LAB v2 extensions: grid bending, keyframes, audio spectrum and Wallpaper Engine export. */

const featureStyle = document.createElement('style');
featureStyle.textContent = `
  .add { grid-template-columns: repeat(3,minmax(0,1fr)); }
  .animbar { position:absolute; z-index:5; left:14px; right:14px; bottom:14px; min-height:48px;
    display:grid; grid-template-columns:auto auto minmax(120px,1fr) 62px 75px auto auto; gap:7px;
    align-items:center; padding:7px; border:1px solid #343944; border-radius:6px;
    background:#0d0f14e8; backdrop-filter:blur(10px); box-shadow:0 8px 30px #0008; }
  .animbar input[type=range] { min-width:80px; }
  .anim-time { font:11px ui-monospace,Consolas,monospace; color:#dce2eb; text-align:center; }
  .timeline-wrap { position:relative; min-width:0; }
  .timeline-wrap input { display:block; }
  .key-dots { position:absolute; inset:0 7px; pointer-events:none; }
  .key-dot { position:absolute; top:50%; width:8px; height:8px; transform:translate(-50%,-50%) rotate(45deg);
    background:#a9ff68; border:1px solid #071004; box-shadow:0 0 0 1px #a9ff6870; pointer-events:auto; cursor:pointer; }
  .bend-hint { color:#a9ff68; }
  .value-edit { width:76px; height:25px; padding:2px 6px; text-align:right; font:11px ui-monospace,Consolas,monospace; }
  .font-row { display:grid; grid-template-columns:1fr auto; gap:6px; }
  @media(max-width:1000px){.animbar{grid-template-columns:auto auto 1fr 58px}.animbar .wide-hide{display:none}}
`;
document.head.appendChild(featureStyle);

/* Use an explicit button instead of an implicit file label: this prevents stray
   chooser activation and lets the same project be selected twice in a row. */
const projectOpenInput = document.querySelector('#projectOpen');
const projectOpenLabel = projectOpenInput?.closest('label');
if (projectOpenInput && projectOpenLabel) {
  const projectOpenButton = document.createElement('button');
  projectOpenButton.type = 'button'; projectOpenButton.textContent = 'Открыть проект';
  projectOpenInput.hidden = true;
  projectOpenLabel.before(projectOpenInput, projectOpenButton);
  projectOpenLabel.remove();
  projectOpenButton.onclick = () => { projectOpenInput.value = ''; projectOpenInput.click(); };
}

types.spectrum = 'Аудиоспектр';
types.clock = 'Часы и дата';
types.globe = 'Глобус-сетка';
const embeddedFontLoads = new WeakMap();

function activateEmbeddedFont(layer) {
  if (!layer?.fontData || typeof FontFace !== 'function') return;
  const signature = layer.fontFamily + '|' + layer.fontData.length;
  if (embeddedFontLoads.get(layer) === signature) return;
  embeddedFontLoads.set(layer, signature);
  new FontFace(layer.fontFamily, 'url(' + layer.fontData + ')').load().then(font => {
    document.fonts.add(font); draw();
  }).catch(() => toast('Не удалось загрузить файл шрифта'));
}

/* Every slider also gets an editable numeric value. */
row = function editableRow(name, key, min, max, step) {
  const layer = pick();
  return '<div class="row"><div class="label"><span>' + name + '</span><input class="value-edit" type="number" data-key="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + layer[key] + '"></div><input type="range" data-key="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + layer[key] + '"></div>';
};
rowState = function editableStateRow(name, key, min, max, step) {
  return '<div class="row"><div class="label"><span>' + name + '</span><input class="value-edit" type="number" data-state="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + S[key] + '"></div><input type="range" data-state="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + S[key] + '"></div>';
};
const baseBind = bind;
bind = function editableBind() {
  baseBind();
  [['key', '[data-key]'], ['state', '[data-state]']].forEach(([property, selector]) => {
    panel.querySelectorAll(selector).forEach(input => {
      if (!['range', 'number'].includes(input.type)) return;
      const original = input.oninput;
      input.oninput = event => {
        original?.call(input, event);
        const key = input.dataset[property];
        panel.querySelectorAll(selector).forEach(peer => {
          if (peer !== input && peer.dataset[property] === key && ['range', 'number'].includes(peer.type)) peer.value = input.value;
        });
      };
    });
  });
};

function ensureFeatureState() {
  if (!S.animation) S.animation = { duration: 8, time: 0, playing: false, loop: true, easing: 'linear', fps: 60, keyframes: [] };
  if (!['linear', 'smooth'].includes(S.animation.easing)) S.animation.easing = 'linear';
  S.animation.duration = clamp(Number(S.animation.duration) || 8, 1, 120);
  S.animation.time = clamp(Number(S.animation.time) || 0, 0, S.animation.duration);
  if (!Array.isArray(S.animation.keyframes)) S.animation.keyframes = [];
  S.layers.forEach(layer => {
    if (layer.type === 'grid') {
      if (!Array.isArray(layer.bendAnchors)) layer.bendAnchors = [];
      if (!Number.isFinite(layer.anchorRadius)) layer.anchorRadius = .14;
      if (!layer.bendSide) layer.bendSide = 'all';
      if (!layer.bendAxis) layer.bendAxis = 'both';
      if (!Number.isFinite(layer.bendFeather)) layer.bendFeather = .12;
    }
    if (layer.type === 'spectrum') normalizeSpectrum(layer);
    if (layer.type === 'clock') { normalizeClock(layer); activateEmbeddedFont(layer); }
    if (layer.type === 'globe') normalizeGlobe(layer);
  });
}

function Spectrum(o = {}) {
  return base(Object.assign({
    id: id++, type: 'spectrum', name: 'Спектр', color: '#a9ff68', color2: '#35d7ff',
    opacity: .86, blend: 'lighter', bars: 48, height: .23, width: .72, gap: .24,
    sensitivity: 1.35, smoothing: .72, spectrumStyle: 'bars', mirror: true,
    idleMotion: true, spectrumAngle: 0, spectrumArc: 360,
    glow: 12, glowColor: '#a9ff68', x: .5, y: .78
  }, o));
}

function Clock(o = {}) {
  return base(Object.assign({
    id: id++, type: 'clock', name: 'Часы', color: '#ffffff', color2: '#a9ff68',
    opacity: .94, blend: 'screen', x: .5, y: .2, fontFamily: 'Segoe UI',
    fontSize: 96, fontWeight: 600, letterSpacing: 2, textAlign: 'center',
    timeFormat: '24', showSeconds: true, showDate: true, dateFormat: 'long',
    locale: 'ru-RU', uppercase: false, lineGap: .42, glow: 10, glowColor: '#ffffff'
  }, o));
}

function Globe(o = {}) {
  return base(Object.assign({
    id: id++, type: 'globe', name: 'Глобус-сетка', color: '#a9ff68', color2: '#35d7ff',
    opacity: .72, blend: 'screen', x: .5, y: .5, radius: .25, latitudes: 12,
    longitudes: 20, flatten: 1, tilt: 0, spin: 0, perspective: 0,
    backOpacity: .18, width: 1, autoRotate: false, rotateSpeed: 8, glow: 8,
    glowColor: '#a9ff68', paint: 'gradient'
  }, o));
}

function normalizeSpectrum(layer) {
  const defaults = {
    color: '#a9ff68', color2: '#35d7ff', opacity: .86, blend: 'lighter', bars: 48,
    height: .23, width: .72, gap: .24, sensitivity: 1.35, smoothing: .72,
    spectrumStyle: 'bars', mirror: true, idleMotion: true, spectrumAngle: 0, spectrumArc: 360, glow: 12,
    glowColor: '#a9ff68', x: .5, y: .78, scale: 1, rotation: 0,
    patternDensity: 1, style: 'solid', paint: 'gradient', gradientAngle: 0
  };
  Object.keys(defaults).forEach(key => {
    if (layer[key] === undefined) layer[key] = defaults[key];
  });
  return layer;
}

function normalizeClock(layer) {
  const defaults = {
    color: '#ffffff', color2: '#a9ff68', opacity: .94, blend: 'screen', x: .5, y: .2,
    scale: 1, rotation: 0, fontFamily: 'Segoe UI', fontSize: 96, fontWeight: 600,
    letterSpacing: 2, textAlign: 'center', timeFormat: '24', showSeconds: true,
    showDate: true, dateFormat: 'long', locale: 'ru-RU', uppercase: false,
    lineGap: .42, glow: 10, glowColor: '#ffffff'
  };
  Object.keys(defaults).forEach(key => {
    if (layer[key] === undefined) layer[key] = defaults[key];
  });
  return layer;
}

function normalizeGlobe(layer) {
  const defaults = { color: '#a9ff68', color2: '#35d7ff', opacity: .72, blend: 'screen', x: .5, y: .5,
    scale: 1, rotation: 0, radius: .25, latitudes: 12, longitudes: 20, flatten: 1, tilt: 0,
    spin: 0, perspective: 0, backOpacity: .18, width: 1, autoRotate: false, rotateSpeed: 8,
    glow: 8, glowColor: '#a9ff68', paint: 'gradient', style: 'solid', patternDensity: 1 };
  Object.keys(defaults).forEach(key => { if (layer[key] === undefined) layer[key] = defaults[key]; });
  return layer;
}

const addArea = document.querySelector('.add');
const spectrumButton = document.createElement('button');
spectrumButton.id = 'spectrum';
spectrumButton.textContent = '+ Спектр';
spectrumButton.title = 'Аудиоспектр Wallpaper Engine';
addArea.insertBefore(spectrumButton, addArea.lastElementChild);
spectrumButton.onclick = () => add(Spectrum({ name: 'Спектр ' + (S.layers.filter(x => x.type === 'spectrum').length + 1) }));
const clockButton = document.createElement('button');
clockButton.id = 'clock';
clockButton.textContent = '+ Часы';
clockButton.title = 'Дата и время';
addArea.insertBefore(clockButton, addArea.lastElementChild);
clockButton.onclick = () => add(Clock({ name: 'Часы ' + (S.layers.filter(x => x.type === 'clock').length + 1) }));
const globeButton = document.createElement('button');
globeButton.id = 'globe'; globeButton.textContent = '+ Глобус'; globeButton.title = 'Сферическая координатная сетка';
addArea.insertBefore(globeButton, addArea.lastElementChild);
globeButton.onclick = () => add(Globe({ name: 'Глобус ' + (S.layers.filter(x => x.type === 'globe').length + 1) }));

/* Two-dimensional Gaussian deformation for perspective grids. */
function gridAnchorPull(layer, u, t, ignored) {
  const radius = Math.max(.025, layer.anchorRadius || .14);
  return (layer.bendAnchors || []).reduce((out, anchor) => {
    if (anchor === ignored) return out;
    const du = (u - anchor.u) / radius;
    const dt = (t - anchor.t) / radius;
    let influence = Math.exp(-(du * du + dt * dt) * 1.8);
    const feather = Math.max(.01, layer.bendFeather || .12);
    const sideDistance = layer.bendSide === 'left' ? anchor.u - u : layer.bendSide === 'right' ? u - anchor.u : layer.bendSide === 'top' ? anchor.t - t : layer.bendSide === 'bottom' ? t - anchor.t : feather;
    if (layer.bendSide !== 'all') influence *= clamp(sideDistance / feather + .5, 0, 1);
    if (layer.bendAxis !== 'vertical') out.x += (anchor.dx || 0) * S.w * influence;
    if (layer.bendAxis !== 'horizontal') out.y += (anchor.dy || 0) * S.h * influence;
    return out;
  }, { x: 0, y: 0 });
}

function gridBasePoint(layer, u, t) {
  const W = S.w * 1.18;
  const H = S.h * .92;
  const depth = Math.pow(t, 1 + layer.perspective * 2);
  return {
    x: (u - .5) * W * (1 + (1 - depth) * layer.perspective * 1.6),
    y: (depth - .5) * H + Math.sin(u * Math.PI * 2 + t * 4) * layer.bend * S.h * (1 - t * .55)
  };
}

function gridAnchorWorld(layer, anchor) {
  const basePoint = gridBasePoint(layer, anchor.u, anchor.t);
  const pull = gridAnchorPull(layer, anchor.u, anchor.t);
  return localToWorld(layer, basePoint.x + pull.x, basePoint.y + pull.y);
}

const wavePathCache = new WeakMap(), gridPathCache = new WeakMap();

wavePass = function cachedWavePass(layer, glow) {
  const dynamic = !!S.drag || !!S.animation?.playing;
  const lineStride = Math.max(1, Math.ceil(layer.lines / (dynamic ? 90 : 180)));
  const steps = dynamic ? 72 : Math.max(80, Math.min(160, Math.round(150 * 96 / Math.max(96, layer.lines))));
  const signature = [S.w, S.h, layer.lines, layer.amplitude, layer.frequency, layer.phase, layer.twist, layer.spread, layer.anchorRadius, JSON.stringify(layer.anchors || []), lineStride, steps].join('|');
  let cached = wavePathCache.get(layer);
  if (!cached || cached.signature !== signature) {
    const path = new Path2D();
    for (let n = 0; n < layer.lines; n += lineStride) {
      const k = n / Math.max(1, layer.lines - 1) - .5;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps, x = (u - .5) * S.w * 1.35, y = waveBase(layer, u, k) + anchorPull(layer, u);
        i ? path.lineTo(x, y) : path.moveTo(x, y);
      }
    }
    cached = { signature, path }; wavePathCache.set(layer, cached);
  }
  c.save(); transform(c, layer);
  c.globalAlpha = layer.opacity * Math.min(1, 100 / Math.max(1, layer.lines)) * (glow ? .72 : 1);
  c.globalCompositeOperation = glow ? 'lighter' : layer.blend;
  c.filter = glow ? 'blur(' + Math.max(2, layer.glow * S.w / 1920) + 'px)' : 'none';
  c.strokeStyle = glow ? layer.glowColor : paint(c, layer, S.w * 1.35, S.h);
  c.lineWidth = layer.width * S.w / 1920 * (glow ? 2.2 : 1) * Math.sqrt(lineStride);
  stroke(c, layer); c.stroke(cached.path); c.restore();
};

gridPass = function enhancedGridPass(layer, glow) {
  const dynamic = !!S.drag || !!S.animation?.playing;
  const stepsU = dynamic ? 64 : 100, stepsT = dynamic ? 46 : 70;
  const rows = Math.max(2, layer.lines), columns = Math.max(3, Math.round(rows * 1.55));
  const stride = Math.max(1, Math.ceil(Math.max(rows, columns) / (dynamic ? 100 : 170)));
  const signature = [S.w, S.h, rows, layer.bend, layer.perspective, layer.anchorRadius, layer.bendSide, layer.bendAxis, layer.bendFeather, JSON.stringify(layer.bendAnchors || []), stepsU, stepsT, stride].join('|');
  let cached = gridPathCache.get(layer);
  if (!cached || cached.signature !== signature) {
    const path = new Path2D();
    for (let rowIndex = 0; rowIndex <= rows; rowIndex += stride) {
      const t = rowIndex / rows;
      for (let step = 0; step <= stepsU; step++) {
        const u = step / stepsU, point = gridBasePoint(layer, u, t), pull = gridAnchorPull(layer, u, t);
        step ? path.lineTo(point.x + pull.x, point.y + pull.y) : path.moveTo(point.x + pull.x, point.y + pull.y);
      }
    }
    for (let columnIndex = 0; columnIndex <= columns; columnIndex += stride) {
      const u = columnIndex / columns;
      for (let step = 0; step <= stepsT; step++) {
        const t = step / stepsT, point = gridBasePoint(layer, u, t), pull = gridAnchorPull(layer, u, t);
        step ? path.lineTo(point.x + pull.x, point.y + pull.y) : path.moveTo(point.x + pull.x, point.y + pull.y);
      }
    }
    cached = { signature, path }; gridPathCache.set(layer, cached);
  }
  c.save();
  transform(c, layer);
  c.globalAlpha = layer.opacity * (glow ? .68 : 1);
  c.globalCompositeOperation = glow ? 'lighter' : layer.blend;
  c.filter = glow ? 'blur(' + Math.max(2, layer.glow * S.w / 1920) + 'px)' : 'none';
  c.lineWidth = layer.width * S.w / 1920 * (glow ? 2.1 : 1);
  stroke(c, layer);
  c.strokeStyle = glow ? layer.glowColor : paint(c, layer, S.w * 1.18, S.h * .92);
  c.stroke(cached.path);
  c.restore();
};

const originalHandles = handles;
handles = function enhancedHandles() {
  originalHandles();
  const layer = pick();
  if (!layer || layer.type !== 'grid') return;
  o.save();
  o.lineWidth = 2 * S.w / 1920;
  o.strokeStyle = '#a9ff68';
  o.fillStyle = '#101217';
  (layer.bendAnchors || []).forEach((anchor, index) => {
    const basePoint = gridBasePoint(layer, anchor.u, anchor.t);
    const baseWorld = localToWorld(layer, basePoint.x, basePoint.y);
    const world = gridAnchorWorld(layer, anchor);
    o.globalAlpha = .55;
    o.beginPath(); o.moveTo(baseWorld.x, baseWorld.y); o.lineTo(world.x, world.y); o.stroke();
    o.globalAlpha = 1;
    o.beginPath(); o.rect(world.x - 7 * S.w / 1920, world.y - 7 * S.w / 1920, 14 * S.w / 1920, 14 * S.w / 1920);
    o.fill(); o.stroke();
    if (index === S.anchor) {
      o.beginPath(); o.arc(world.x, world.y, 11 * S.w / 1920, 0, Math.PI * 2); o.stroke();
    }
  });
  o.restore();
  stage.classList.add('move');
};

function closestGridCoordinates(layer, localPoint) {
  let best = { u: .5, t: .5, distance: Infinity };
  for (let yi = 0; yi <= 30; yi++) {
    for (let xi = 0; xi <= 40; xi++) {
      const u = xi / 40, t = yi / 30;
      const point = gridBasePoint(layer, u, t);
      const pull = gridAnchorPull(layer, u, t);
      const distance = Math.hypot(point.x + pull.x - localPoint.x, point.y + pull.y - localPoint.y);
      if (distance < best.distance) best = { u, t, distance };
    }
  }
  return best;
}

function setGridAnchorFromPoint(layer, point, anchor, isNew) {
  const localPoint = worldToLocal(layer, point.x, point.y);
  if (isNew) {
    const nearest = closestGridCoordinates(layer, localPoint);
    anchor.u = nearest.u;
    anchor.t = nearest.t;
  }
  const basePoint = gridBasePoint(layer, anchor.u, anchor.t);
  const otherPull = gridAnchorPull(layer, anchor.u, anchor.t, anchor);
  anchor.dx = clamp((localPoint.x - basePoint.x - otherPull.x) / S.w, -.5, .5);
  anchor.dy = clamp((localPoint.y - basePoint.y - otherPull.y) / S.h, -.5, .5);
}

ov.onpointerdown = event => {
  const layer = pick(), canvasPoint = point(event);
  if (!layer) return;
  const anchors = layer.type === 'wave' ? layer.anchors : layer.type === 'grid' ? layer.bendAnchors : null;
  if (anchors) {
    let hit = -1, best = Infinity;
    anchors.forEach((anchor, index) => {
      const world = layer.type === 'wave' ? anchorWorld(layer, anchor) : gridAnchorWorld(layer, anchor);
      const distance = Math.hypot(world.x - canvasPoint.x, world.y - canvasPoint.y);
      if (distance < best) { best = distance; hit = index; }
    });
    if (S.adding) {
      const anchor = layer.type === 'wave' ? { u: .5, dy: 0 } : { u: .5, t: .5, dx: 0, dy: 0 };
      if (layer.type === 'wave') anchorFromPoint(layer, canvasPoint, anchor);
      else setGridAnchorFromPoint(layer, canvasPoint, anchor, true);
      anchors.push(anchor);
      S.anchor = anchors.length - 1;
      S.adding = false;
      S.drag = { type: layer.type + 'Anchor', index: S.anchor };
      ui(); toast('Точка изгиба добавлена');
    } else if (best < 20 * S.w / 1920) {
      S.anchor = hit;
      S.drag = { type: layer.type + 'Anchor', index: hit };
      ui();
    } else {
      S.drag = { type: 'layer', dx: canvasPoint.x / S.w - layer.x, dy: canvasPoint.y / S.h - layer.y };
    }
  } else {
    S.drag = { type: 'layer', dx: canvasPoint.x / S.w - layer.x, dy: canvasPoint.y / S.h - layer.y };
  }
  if (S.drag) { ov.setPointerCapture(event.pointerId); stage.classList.add('drag'); draw(); }
};

ov.onpointermove = event => {
  if (!S.drag) return;
  const layer = pick(), canvasPoint = point(event);
  if (S.drag.type === 'layer') {
    layer.x = canvasPoint.x / S.w - S.drag.dx;
    layer.y = canvasPoint.y / S.h - S.drag.dy;
  } else if (S.drag.type === 'waveAnchor') {
    anchorFromPoint(layer, canvasPoint, layer.anchors[S.drag.index]);
  } else if (S.drag.type === 'gridAnchor') {
    setGridAnchorFromPoint(layer, canvasPoint, layer.bendAnchors[S.drag.index], false);
  }
  draw();
};

ov.onpointerup = () => {
  const movedLayer = S.drag?.type === 'layer';
  S.drag = null;
  stage.classList.remove('drag');
  if (movedLayer) ui();
};

ov.ondblclick = event => {
  const layer = pick();
  if (!layer || !['wave', 'grid'].includes(layer.type)) return;
  const anchor = layer.type === 'wave' ? { u: .5, dy: 0 } : { u: .5, t: .5, dx: 0, dy: 0 };
  if (layer.type === 'wave') anchorFromPoint(layer, point(event), anchor);
  else setGridAnchorFromPoint(layer, point(event), anchor, true);
  const anchors = layer.type === 'wave' ? layer.anchors : layer.bendAnchors;
  anchors.push(anchor);
  S.anchor = anchors.length - 1;
  sync(); toast('Точка изгиба добавлена');
};

/* Audio visualizer. Wallpaper Engine supplies 64 bins for each stereo channel. */
const audioTarget = new Float32Array(64);
const audioCurrent = new Float32Array(64);
let audioInputSeen = false;
let featureClock = 0;

function wallpaperAudioListener(samples) {
  audioInputSeen = true;
  for (let index = 0; index < 64; index++) {
    const left = Number(samples[index]) || 0;
    const right = Number(samples[index + 64]) || 0;
    audioTarget[index] = Math.min(1.5, (left + right) * .5);
  }
}
window.nocturneWallpaperAudioListener = wallpaperAudioListener;
if (typeof window.wallpaperRegisterAudioListener === 'function') {
  window.wallpaperRegisterAudioListener(wallpaperAudioListener);
}

function spectrumValue(layer, normalizedIndex) {
  const sourceIndex = Math.min(63, Math.max(0, Math.round(normalizedIndex * 63)));
  const idle = .16 + .12 * Math.sin(featureClock * 1.8 + sourceIndex * .37) + .05 * Math.sin(featureClock * .7 + sourceIndex * .11);
  const target = audioInputSeen ? audioTarget[sourceIndex] : (layer.idleMotion ? Math.max(.02, idle) : 0);
  const smoothing = clamp(layer.smoothing, 0, .96);
  audioCurrent[sourceIndex] = audioCurrent[sourceIndex] * smoothing + target * (1 - smoothing);
  return Math.min(1.5, audioCurrent[sourceIndex] * layer.sensitivity);
}

function drawSpectrum(layer) {
  normalizeSpectrum(layer);
  c.save(); transform(c, layer);
  c.globalAlpha = layer.opacity;
  c.globalCompositeOperation = layer.blend;
  c.shadowBlur = layer.glow * S.w / 1920;
  c.shadowColor = layer.glowColor;
  const count = Math.round(clamp(layer.bars, 8, 64));
  const totalWidth = layer.width * S.w;
  const maxHeight = layer.height * S.h;
  const step = totalWidth / count;
  const barWidth = step * (1 - layer.gap);
  if (layer.spectrumStyle === 'radial') {
    const radius = Math.min(S.w, S.h) * layer.width * .28;
    for (let index = 0; index < count; index++) {
      const t = index / Math.max(1, count - 1);
      const value = spectrumValue(layer, t);
      const angle = (layer.spectrumAngle - 90) * Math.PI / 180 + (t - .5) * layer.spectrumArc * Math.PI / 180;
      const inner = radius, outer = radius + value * maxHeight * .55;
      c.strokeStyle = mix(layer.color, layer.color2, t);
      c.lineWidth = Math.max(1, barWidth * .32);
      c.beginPath(); c.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner); c.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); c.stroke();
    }
  } else if (layer.spectrumStyle === 'line') {
    c.strokeStyle = paint(c, layer, totalWidth, maxHeight);
    c.lineWidth = Math.max(1, layer.patternDensity * S.w / 1920);
    c.beginPath();
    for (let index = 0; index < count; index++) {
      const t = index / Math.max(1, count - 1), value = spectrumValue(layer, t);
      const x = (t - .5) * totalWidth, y = -value * maxHeight;
      index ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
    if (layer.mirror) { c.scale(1, -1); c.globalAlpha *= .48; c.stroke(); }
  } else {
    for (let index = 0; index < count; index++) {
      const t = index / Math.max(1, count - 1), value = spectrumValue(layer, t);
      const height = Math.max(1, value * maxHeight);
      c.fillStyle = mix(layer.color, layer.color2, t);
      c.fillRect(-totalWidth / 2 + index * step, -height, barWidth, height);
      if (layer.mirror) { c.globalAlpha = layer.opacity * .48; c.fillRect(-totalWidth / 2 + index * step, 0, barWidth, height); c.globalAlpha = layer.opacity; }
    }
  }
  c.restore();
}

function clockStrings(layer, date = new Date()) {
  const timeOptions = {
    hour: '2-digit', minute: '2-digit', second: layer.showSeconds ? '2-digit' : undefined,
    hour12: layer.timeFormat === '12'
  };
  const dateOptions = layer.dateFormat === 'numeric'
    ? { year: 'numeric', month: '2-digit', day: '2-digit' }
    : layer.dateFormat === 'weekday'
      ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'long', day: 'numeric' };
  let timeText = new Intl.DateTimeFormat(layer.locale || 'ru-RU', timeOptions).format(date);
  let dateText = new Intl.DateTimeFormat(layer.locale || 'ru-RU', dateOptions).format(date);
  if (layer.uppercase) { timeText = timeText.toUpperCase(); dateText = dateText.toUpperCase(); }
  return { timeText, dateText };
}

function drawTrackedText(context, text, x, y, spacing, align) {
  if (!spacing) { context.textAlign = align; context.fillText(text, x, y); return; }
  const glyphs = [...text], widths = glyphs.map(glyph => context.measureText(glyph).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, glyphs.length - 1) * spacing;
  let cursor = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
  context.textAlign = 'left';
  glyphs.forEach((glyph, index) => { context.fillText(glyph, cursor, y); cursor += widths[index] + spacing; });
}

function drawClock(layer) {
  normalizeClock(layer);
  const text = clockStrings(layer);
  c.save(); transform(c, layer);
  c.globalAlpha = layer.opacity;
  c.globalCompositeOperation = layer.blend;
  c.fillStyle = layer.color;
  c.shadowBlur = layer.glow * S.w / 1920;
  c.shadowColor = layer.glowColor;
  c.textBaseline = 'middle';
  c.font = layer.fontWeight + ' ' + layer.fontSize + 'px "' + layer.fontFamily.replace(/"/g, '') + '"';
  drawTrackedText(c, text.timeText, 0, layer.showDate ? -layer.fontSize * layer.lineGap * .5 : 0, layer.letterSpacing, layer.textAlign);
  if (layer.showDate) {
    c.fillStyle = layer.color2;
    c.font = Math.max(12, layer.fontSize * .34) + 'px "' + layer.fontFamily.replace(/"/g, '') + '"';
    drawTrackedText(c, text.dateText, 0, layer.fontSize * layer.lineGap * 1.05, layer.letterSpacing * .45, layer.textAlign);
  }
  c.restore();
}

function globePoint(layer, latitude, longitude) {
  const spin = (layer.spin + (layer.autoRotate ? featureClock * layer.rotateSpeed : 0)) * Math.PI / 180;
  const tilt = layer.tilt * Math.PI / 180;
  let px = Math.cos(latitude) * Math.sin(longitude + spin), py = Math.sin(latitude), pz = Math.cos(latitude) * Math.cos(longitude + spin);
  const ry = py * Math.cos(tilt) - pz * Math.sin(tilt), rz = py * Math.sin(tilt) + pz * Math.cos(tilt);
  const scale = 1 / Math.max(.35, 1 + rz * layer.perspective);
  const radius = Math.min(S.w, S.h) * layer.radius;
  return { x: px * radius * scale, y: ry * radius * layer.flatten * scale, z: rz };
}

function drawGlobe(layer) {
  normalizeGlobe(layer);
  const front = new Path2D(), back = new Path2D(), segments = S.drag ? 48 : 80;
  const trace = points => {
    let target = points[0].z <= 0 ? front : back, previous = target;
    points.forEach((point, index) => {
      target = point.z <= 0 ? front : back;
      if (!index || target !== previous) target.moveTo(point.x, point.y); else target.lineTo(point.x, point.y);
      previous = target;
    });
  };
  for (let i = 1; i < layer.latitudes; i++) {
    const latitude = -Math.PI / 2 + Math.PI * i / layer.latitudes, points = [];
    for (let s = 0; s <= segments; s++) points.push(globePoint(layer, latitude, Math.PI * 2 * s / segments));
    trace(points);
  }
  for (let i = 0; i < layer.longitudes; i++) {
    const longitude = Math.PI * 2 * i / layer.longitudes, points = [];
    for (let s = 0; s <= segments; s++) points.push(globePoint(layer, -Math.PI / 2 + Math.PI * s / segments, longitude));
    trace(points);
  }
  c.save(); transform(c, layer); c.globalCompositeOperation = layer.blend;
  c.lineWidth = layer.width * S.w / 1920; stroke(c, layer);
  c.strokeStyle = layer.paint === 'gradient' ? paint(c, layer, Math.min(S.w, S.h) * layer.radius * 2, Math.min(S.w, S.h) * layer.radius * 2) : layer.color;
  c.shadowBlur = layer.glow * S.w / 1920; c.shadowColor = layer.glowColor;
  c.globalAlpha = layer.opacity * layer.backOpacity; c.stroke(back);
  c.globalAlpha = layer.opacity; c.stroke(front); c.restore();
}

const originalDrawImage = drawImage;
drawImage = function enhancedDrawImage(layer) {
  if (layer.type === 'spectrum') return drawSpectrum(layer);
  if (layer.type === 'clock') return drawClock(layer);
  if (layer.type === 'globe') return drawGlobe(layer);
  return originalDrawImage(layer);
};

/* Extend the properties panel for grids and spectrum layers. */
const originalUi = ui;
ui = function enhancedUi() {
  ensureFeatureState();
  originalUi();
  const layer = pick();
  if (!layer) return;
  if (layer.type === 'wave') panel.querySelectorAll('[data-key="amplitude"]').forEach(input => { input.min = 0; });
  if (layer.type === 'grid') {
    const geometry = [...panel.querySelectorAll('.group')].find(group => group.querySelector('h3')?.textContent.includes('Геометрия сетки'));
    if (geometry) {
      const body = geometry.querySelector('.group-body') || geometry;
      const block = document.createElement('div');
      block.innerHTML = row('Радиус точек изгиба', 'anchorRadius', .025, .35, .005, value => Math.round(value * 100) + '%') +
        row('Мягкость границы', 'bendFeather', .01, .5, .01) +
        '<div class="row"><div class="label">Сторона изгиба</div><select style="width:100%" data-key="bendSide"><option value="all" ' + (layer.bendSide === 'all' ? 'selected' : '') + '>во все стороны</option><option value="left" ' + (layer.bendSide === 'left' ? 'selected' : '') + '>только слева</option><option value="right" ' + (layer.bendSide === 'right' ? 'selected' : '') + '>только справа</option><option value="top" ' + (layer.bendSide === 'top' ? 'selected' : '') + '>только сверху</option><option value="bottom" ' + (layer.bendSide === 'bottom' ? 'selected' : '') + '>только снизу</option></select></div>' +
        '<div class="row"><div class="label">Ось смещения</div><select style="width:100%" data-key="bendAxis"><option value="both" ' + (layer.bendAxis === 'both' ? 'selected' : '') + '>X и Y</option><option value="horizontal" ' + (layer.bendAxis === 'horizontal' ? 'selected' : '') + '>только X</option><option value="vertical" ' + (layer.bendAxis === 'vertical' ? 'selected' : '') + '>только Y</option></select></div>' +
        '<div class="pair"><button data-add-grid-anchor>' + (S.adding ? 'Кликните по сетке' : 'Добавить точку') + '</button>' +
        '<button data-del-grid-anchor ' + (S.anchor === null ? 'disabled' : '') + '>Удалить</button></div>' +
        '<div class="note bend-hint">Двойной клик по сетке также создаёт точку изгиба.</div>';
      body.appendChild(block);
      bind();
      panel.querySelector('[data-add-grid-anchor]')?.addEventListener('click', () => { S.adding = !S.adding; ui(); draw(); });
      panel.querySelector('[data-del-grid-anchor]')?.addEventListener('click', () => {
        if (S.anchor !== null) { layer.bendAnchors.splice(S.anchor, 1); S.anchor = null; sync(); }
      });
    }
  }
  if (layer.type === 'spectrum') {
    const styleOptions = ['bars', 'line', 'radial'].map(value => '<option value="' + value + '" ' + (layer.spectrumStyle === value ? 'selected' : '') + '>' + ({ bars: 'столбцы', line: 'линия', radial: 'радиальный' }[value]) + '</option>').join('');
    panel.innerHTML = '<div class="group"><h3>Аудиоспектр</h3>' + color('Низкие частоты', 'color') + color('Высокие частоты', 'color2') +
      '<div class="row"><div class="label">Вид</div><select style="width:100%" data-key="spectrumStyle">' + styleOptions + '</select></div>' +
      row('Полосы', 'bars', 8, 64, 1) + row('Высота', 'height', .03, .65, .01, value => Math.round(value * 100) + '%') +
      row('Ширина', 'width', .1, 1.4, .01, value => Math.round(value * 100) + '%') + row('Зазор', 'gap', 0, .8, .01, value => Math.round(value * 100) + '%') +
      row('Чувствительность', 'sensitivity', .1, 4, .05, value => Number(value).toFixed(2)) + row('Сглаживание', 'smoothing', 0, .96, .01, value => Math.round(value * 100) + '%') +
      row('Направление сектора', 'spectrumAngle', -180, 180, 1) + row('Размер сектора', 'spectrumArc', 5, 360, 1) +
      '<div class="row"><label><input type="checkbox" data-spectrum-bool="mirror" ' + (layer.mirror ? 'checked' : '') + '> Зеркальное отражение</label></div>' +
      '<div class="row"><label><input type="checkbox" data-spectrum-bool="idleMotion" ' + (layer.idleMotion ? 'checked' : '') + '> Анимация без звука</label></div></div>' +
      styleGroup(layer) + '<div class="group"><h3>Положение</h3>' + row('Масштаб', 'scale', .1, 3, .01, value => Math.round(value * 100) + '%') +
      row('Поворот', 'rotation', -180, 180, 1, value => value + '°') + '<div class="pair"><div class="row"><div class="label">X</div><input style="width:100%" type="number" data-key="x" step=".01" value="' + layer.x.toFixed(2) + '"></div><div class="row"><div class="label">Y</div><input style="width:100%" type="number" data-key="y" step=".01" value="' + layer.y.toFixed(2) + '"></div></div></div>';
    bind();
    panel.querySelectorAll('[data-spectrum-bool]').forEach(input => input.onchange = () => { layer[input.dataset.spectrumBool] = input.checked; draw(); });
  }
  if (layer.type === 'clock') {
    const fonts = window.nocturneLocalFonts || ['Segoe UI', 'Arial', 'Georgia', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Courier New', 'Consolas', 'Impact'];
    const fontOptions = fonts.map(font => '<option value="' + String(font).replace(/"/g, '&quot;') + '"></option>').join('');
    const weightOptions = [300, 400, 500, 600, 700, 800, 900].map(weight => '<option value="' + weight + '" ' + (+layer.fontWeight === weight ? 'selected' : '') + '>' + weight + '</option>').join('');
    panel.innerHTML = '<div class="group"><h3>Дата и время</h3>' + color('Цвет времени', 'color') + color('Цвет даты', 'color2') +
      '<div class="row"><div class="label">Шрифт с компьютера</div><div class="font-row"><input list="nocturne-fonts" data-key="fontFamily" value="' + String(layer.fontFamily).replace(/"/g, '&quot;') + '"><button type="button" data-load-fonts title="Запросить список установленных шрифтов">↻</button></div><datalist id="nocturne-fonts">' + fontOptions + '</datalist></div>' +
      '<div class="row"><button type="button" data-font-file-button style="width:100%">Загрузить файл шрифта</button><input hidden data-font-file type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2">' + (layer.fontData ? '<div class="note">Встроен: ' + (layer.fontFileName || layer.fontFamily) + '</div>' : '') + '</div>' +
      '<div class="row"><div class="label">Начертание</div><select style="width:100%" data-key="fontWeight">' + weightOptions + '</select></div>' +
      row('Размер', 'fontSize', 24, 280, 1, value => value + ' px') + row('Интервал', 'letterSpacing', -4, 30, .5, value => value + ' px') +
      row('Расстояние до даты', 'lineGap', .15, 1.2, .01, value => Math.round(value * 100) + '%') +
      '<div class="row"><div class="label">Формат времени</div><select style="width:100%" data-key="timeFormat"><option value="24" ' + (layer.timeFormat === '24' ? 'selected' : '') + '>24 часа</option><option value="12" ' + (layer.timeFormat === '12' ? 'selected' : '') + '>12 часов</option></select></div>' +
      '<div class="row"><div class="label">Формат даты</div><select style="width:100%" data-key="dateFormat"><option value="long" ' + (layer.dateFormat === 'long' ? 'selected' : '') + '>10 октября 2026</option><option value="weekday" ' + (layer.dateFormat === 'weekday' ? 'selected' : '') + '>с днём недели</option><option value="numeric" ' + (layer.dateFormat === 'numeric' ? 'selected' : '') + '>10.10.2026</option></select></div>' +
      '<div class="row"><div class="label">Язык</div><select style="width:100%" data-key="locale"><option value="ru-RU" ' + (layer.locale === 'ru-RU' ? 'selected' : '') + '>Русский</option><option value="en-US" ' + (layer.locale === 'en-US' ? 'selected' : '') + '>English</option><option value="de-DE" ' + (layer.locale === 'de-DE' ? 'selected' : '') + '>Deutsch</option></select></div>' +
      '<div class="row"><label><input type="checkbox" data-clock-bool="showSeconds" ' + (layer.showSeconds ? 'checked' : '') + '> Показывать секунды</label></div>' +
      '<div class="row"><label><input type="checkbox" data-clock-bool="showDate" ' + (layer.showDate ? 'checked' : '') + '> Показывать дату</label></div>' +
      '<div class="row"><label><input type="checkbox" data-clock-bool="uppercase" ' + (layer.uppercase ? 'checked' : '') + '> Верхний регистр</label></div></div>' +
      '<div class="group"><h3>Свечение</h3>' + row('Свечение', 'glow', 0, 50, 1, value => value + ' px') + color('Цвет свечения', 'glowColor') + '</div>' +
      '<div class="group"><h3>Положение</h3>' + row('Масштаб', 'scale', .1, 3, .01, value => Math.round(value * 100) + '%') + row('Поворот', 'rotation', -180, 180, 1, value => value + '°') +
      '<div class="pair"><div class="row"><div class="label">X</div><input style="width:100%" type="number" data-key="x" step=".01" value="' + layer.x.toFixed(2) + '"></div><div class="row"><div class="label">Y</div><input style="width:100%" type="number" data-key="y" step=".01" value="' + layer.y.toFixed(2) + '"></div></div></div>';
    bind();
    panel.querySelectorAll('[data-clock-bool]').forEach(input => input.onchange = () => { layer[input.dataset.clockBool] = input.checked; draw(); });
    panel.querySelector('[data-font-file-button]')?.addEventListener('click', () => {
      const input = panel.querySelector('[data-font-file]'); input.value = ''; input.click();
    });
    panel.querySelector('[data-font-file]')?.addEventListener('change', event => {
      const file = event.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        layer.fontData = reader.result; layer.fontFileName = file.name;
        layer.fontFamily = file.name.replace(/\.[^.]+$/, '').replace(/["']/g, '') || 'Nocturne Embedded Font';
        activateEmbeddedFont(layer); ui(); toast('Шрифт встроен в проект');
      };
      reader.onerror = () => toast('Не удалось прочитать шрифт');
      reader.readAsDataURL(file);
    });
    panel.querySelector('[data-load-fonts]')?.addEventListener('click', async () => {
      if (typeof window.queryLocalFonts !== 'function') return toast('Введите название установленного шрифта вручную');
      try {
        const fontData = await window.queryLocalFonts();
        window.nocturneLocalFonts = [...new Set(fontData.map(font => font.family).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        toast('Загружено шрифтов: ' + window.nocturneLocalFonts.length); ui();
      } catch (error) { toast('Доступ к шрифтам не выдан — название можно ввести вручную'); }
    });
  }
  if (layer.type === 'globe') {
    panel.innerHTML = '<div class="group"><h3>Глобус-сетка</h3>' + color('Основной цвет', 'color') + color('Второй цвет', 'color2') +
      row('Широты', 'latitudes', 3, 48, 1) + row('Долготы', 'longitudes', 4, 72, 1) + row('Радиус', 'radius', .05, .7, .01) +
      row('Сплющивание', 'flatten', .2, 2, .01) + row('Наклон', 'tilt', -90, 90, 1) + row('Поворот сферы', 'spin', -180, 180, 1) +
      row('Перспектива', 'perspective', 0, .8, .01) + row('Задняя полусфера', 'backOpacity', 0, 1, .01) +
      '<div class="row"><label><input type="checkbox" data-globe-auto ' + (layer.autoRotate ? 'checked' : '') + '> Автовращение</label></div>' + row('Скорость вращения', 'rotateSpeed', -60, 60, 1) + '</div>' +
      styleGroup(layer) + '<div class="group"><h3>Положение</h3>' + row('Масштаб', 'scale', .1, 3, .01) + row('Поворот слоя', 'rotation', -180, 180, 1) +
      '<div class="pair"><div class="row"><div class="label">X</div><input style="width:100%" type="number" data-key="x" step=".01" value="' + layer.x.toFixed(2) + '"></div><div class="row"><div class="label">Y</div><input style="width:100%" type="number" data-key="y" step=".01" value="' + layer.y.toFixed(2) + '"></div></div></div>';
    bind();
    panel.querySelector('[data-globe-auto]').onchange = event => { layer.autoRotate = event.target.checked; draw(); };
  }
};

/* Scene keyframes. Each keyframe captures the complete canvas and layer state. */
const transientKeys = new Set(['source', 'processed', 'vectorImage', 'glowMask', 'edgeTimer', 'vectorTimer', 'vectorUrl']);
function cleanClone(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => transientKeys.has(key) || typeof item === 'function' ? undefined : item));
}
function captureSceneState() {
  return {
    canvas: { bg: S.bg, bg2: S.bg2, bgMode: S.bgMode, bgAngle: S.bgAngle },
    layers: S.layers.map(layer => cleanClone(layer))
  };
}
function lerpColor(a, b, amount) {
  if (!/^#[0-9a-f]{6}$/i.test(a || '') || !/^#[0-9a-f]{6}$/i.test(b || '')) return amount < .5 ? a : b;
  const A = rgb(a), B = rgb(b);
  return '#' + A.map((value, index) => Math.round(value + (B[index] - value) * amount).toString(16).padStart(2, '0')).join('');
}
function interpolateValue(a, b, amount) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * amount;
  if (typeof a === 'string' && typeof b === 'string' && a.startsWith('#')) return lerpColor(a, b, amount);
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((value, index) => interpolateValue(value, b[index], amount));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out = {};
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach(key => { out[key] = interpolateValue(a[key], b[key], amount); });
    return out;
  }
  return amount < .5 ? cleanClone(a) : cleanClone(b);
}
function applySceneState(state) {
  if (!state) return;
  Object.assign(S, state.canvas || {});
  const byId = new Map((state.layers || []).map(layer => [layer.id, layer]));
  S.layers.forEach(layer => {
    const source = byId.get(layer.id);
    if (!source) return;
    Object.keys(source).forEach(key => {
      if (!transientKeys.has(key) && !['id', 'type', 'name', 'sourceData', 'svgText'].includes(key)) layer[key] = cleanClone(source[key]);
    });
  });
}
function sampleAnimation(time) {
  const frames = S.animation.keyframes.slice().sort((a, b) => a.time - b.time);
  if (!frames.length) return;
  if (frames.length === 1 || time <= frames[0].time) return applySceneState(frames[0].state);
  if (time >= frames.at(-1).time) return applySceneState(frames.at(-1).state);
  const rightIndex = frames.findIndex(frame => frame.time >= time);
  const left = frames[rightIndex - 1], right = frames[rightIndex];
  let amount = (time - left.time) / Math.max(.0001, right.time - left.time);
  if (S.animation.easing === 'smooth') amount = amount * amount * (3 - 2 * amount);
  applySceneState(interpolateValue(left.state, right.state, amount));
}

const animationBar = document.createElement('div');
animationBar.className = 'animbar';
animationBar.innerHTML = '<button data-play title="Воспроизвести">▶</button><button data-key title="Записать состояние в текущей позиции">+ Ключ</button>' +
  '<div class="timeline-wrap"><input data-time type="range" min="0" max="8" step=".01" value="0"><div class="key-dots"></div></div>' +
  '<div class="anim-time">0.00 s</div><label class="wide-hide">Длина <input data-duration type="number" min="1" max="120" step=".5" value="8" style="width:58px"></label>' +
  '<label class="wide-hide" title="Ускорение и замедление возле ключевых точек"><input data-easing type="checkbox"> Плавно</label>' +
  '<select data-fps class="wide-hide" title="Ограничение FPS"><option value="30">30 FPS</option><option value="60" selected>60 FPS</option></select>' +
  '<button data-export class="wide-hide">Wallpaper Engine</button>';
document.querySelector('main').appendChild(animationBar);

const timeInput = animationBar.querySelector('[data-time]');
const durationInput = animationBar.querySelector('[data-duration]');
const playButton = animationBar.querySelector('[data-play]');
function refreshTimeline() {
  ensureFeatureState();
  timeInput.max = S.animation.duration;
  timeInput.value = S.animation.time;
  durationInput.value = S.animation.duration;
  animationBar.querySelector('[data-easing]').checked = S.animation.easing === 'smooth';
  animationBar.querySelector('.anim-time').textContent = S.animation.time.toFixed(2) + ' s';
  playButton.textContent = S.animation.playing ? '❚❚' : '▶';
  const dots = animationBar.querySelector('.key-dots');
  dots.innerHTML = '';
  S.animation.keyframes.forEach((frame, index) => {
    const dot = document.createElement('button'); dot.className = 'key-dot'; dot.title = 'Ключ ' + frame.time.toFixed(2) + ' s';
    dot.style.left = (frame.time / S.animation.duration * 100) + '%';
    dot.onclick = () => { S.animation.time = frame.time; sampleAnimation(frame.time); refreshTimeline(); sync(); };
    dot.oncontextmenu = event => { event.preventDefault(); S.animation.keyframes.splice(index, 1); refreshTimeline(); toast('Ключ удалён'); };
    dots.appendChild(dot);
  });
}
timeInput.oninput = () => { S.animation.playing = false; S.animation.time = +timeInput.value; sampleAnimation(S.animation.time); refreshTimeline(); sync(); };
durationInput.onchange = () => { S.animation.duration = clamp(+durationInput.value || 8, 1, 120); S.animation.time = Math.min(S.animation.time, S.animation.duration); refreshTimeline(); };
animationBar.querySelector('[data-fps]').onchange = event => { S.animation.fps = +event.target.value; };
animationBar.querySelector('[data-easing]').onchange = event => { S.animation.easing = event.target.checked ? 'smooth' : 'linear'; sampleAnimation(S.animation.time); draw(); };
playButton.onclick = () => { if (S.animation.keyframes.length < 2) return toast('Добавьте минимум два ключа'); S.animation.playing = !S.animation.playing; refreshTimeline(); };
animationBar.querySelector('[data-key]').onclick = () => {
  const existing = S.animation.keyframes.find(frame => Math.abs(frame.time - S.animation.time) < .02);
  const keyframe = { time: S.animation.time, state: captureSceneState() };
  if (existing) Object.assign(existing, keyframe); else S.animation.keyframes.push(keyframe);
  S.animation.keyframes.sort((a, b) => a.time - b.time);
  refreshTimeline(); toast(existing ? 'Ключ обновлён' : 'Ключ добавлен');
};

let previousTick = performance.now(), accumulatedFrameTime = 0;
function featureTick(now) {
  ensureFeatureState();
  const delta = Math.min(.1, (now - previousTick) / 1000); previousTick = now; featureClock += delta;
  const animated = S.animation.playing;
  const hasSpectrum = S.layers.some(layer => layer.visible && layer.type === 'spectrum');
  const hasClock = S.layers.some(layer => layer.visible && layer.type === 'clock');
  const hasRotatingGlobe = S.layers.some(layer => layer.visible && layer.type === 'globe' && layer.autoRotate);
  const reactive = hasSpectrum || hasClock || hasRotatingGlobe;
  const targetFrame = animated || hasSpectrum ? 1 / (S.animation.fps || 60) : 1;
  accumulatedFrameTime += delta;
  if ((animated || reactive) && accumulatedFrameTime >= targetFrame) {
    accumulatedFrameTime %= targetFrame;
    if (animated) {
      S.animation.time += delta;
      if (S.animation.time > S.animation.duration) {
        if (S.animation.loop) S.animation.time %= S.animation.duration;
        else { S.animation.time = S.animation.duration; S.animation.playing = false; }
      }
      sampleAnimation(S.animation.time); refreshTimeline();
    }
    render();
  }
  requestAnimationFrame(featureTick);
}
requestAnimationFrame(featureTick);

/* Include v2 data in saved projects while still accepting v1 projects. */
const originalProjectObject = projectObject;
projectObject = function enhancedProjectObject() {
  const project = originalProjectObject();
  project.version = 2;
  project.animation = cleanClone(S.animation);
  project.animation.playing = false;
  return project;
};
const originalRestoreProject = restoreProject;
restoreProject = function enhancedRestoreProject(project) {
  const incoming = cleanClone(project);
  const animation = incoming.animation;
  incoming.version = 1;
  originalRestoreProject(incoming);
  S.animation = animation || { duration: 8, time: 0, playing: false, loop: true, easing: 'linear', fps: 60, keyframes: [] };
  S.animation.playing = false;
  ensureFeatureState(); refreshTimeline(); sync();
};

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}
function zipStore(files) {
  const encoder = new TextEncoder(), parts = [], directory = [];
  let offset = 0;
  const u16 = value => new Uint8Array([value & 255, value >>> 8 & 255]);
  const u32 = value => new Uint8Array([value & 255, value >>> 8 & 255, value >>> 16 & 255, value >>> 24 & 255]);
  Object.entries(files).forEach(([name, text]) => {
    const filename = encoder.encode(name), data = encoder.encode(text), checksum = crc32(data);
    const local = [u32(0x04034b50), u16(20), u16(0x800), u16(0), u16(0), u16(0), u32(checksum), u32(data.length), u32(data.length), u16(filename.length), u16(0), filename, data];
    const localSize = local.reduce((sum, part) => sum + part.length, 0);
    parts.push(...local);
    directory.push(u32(0x02014b50), u16(20), u16(20), u16(0x800), u16(0), u16(0), u16(0), u32(checksum), u32(data.length), u32(data.length), u16(filename.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), filename);
    offset += localSize;
  });
  const directorySize = directory.reduce((sum, part) => sum + part.length, 0), count = Object.keys(files).length;
  parts.push(...directory, u32(0x06054b50), u16(0), u16(0), u16(count), u16(count), u32(directorySize), u32(offset), u16(0));
  return new Blob(parts, { type: 'application/zip' });
}

function wallpaperRuntimeHtml(project) {
  const data = JSON.stringify(project).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}canvas{display:block;width:100%;height:100%}</style></head><body><canvas id="c"></canvas><script>
const P=${data},cv=document.getElementById('c'),x=cv.getContext('2d',{alpha:false}),bins=new Float32Array(64),smooth=new Float32Array(64);let hasAudio=false,start=performance.now();
if(typeof FontFace==='function')(P.layers||[]).filter(l=>l.type==='clock'&&l.fontData).forEach(l=>{new FontFace(l.fontFamily,'url('+l.fontData+')').load().then(f=>document.fonts.add(f)).catch(()=>{})});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rgb=h=>{let q=h.slice(1);return[parseInt(q.slice(0,2),16),parseInt(q.slice(2,4),16),parseInt(q.slice(4,6),16)]},mix=(a,b,t)=>{let A=rgb(a),B=rgb(b);return'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t))+')'};
function wallpaperAudioListener(samples){hasAudio=true;for(let i=0;i<64;i++)bins[i]=Math.min(1,((+samples[i]||0)+(+samples[i+64]||0))*.5)}
window.nocturneWallpaperAudioListener=wallpaperAudioListener;
if(typeof window.wallpaperRegisterAudioListener==='function')window.wallpaperRegisterAudioListener(wallpaperAudioListener);
function clone(v){return JSON.parse(JSON.stringify(v))}function iv(a,b,t){if(typeof a==='number'&&typeof b==='number')return a+(b-a)*t;if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length)return a.map((v,i)=>iv(v,b[i],t));if(a&&b&&typeof a==='object'&&typeof b==='object'){let o={};new Set([...Object.keys(a),...Object.keys(b)]).forEach(k=>o[k]=iv(a[k],b[k],t));return o}return t<.5?clone(a):clone(b)}
function sceneAt(t){let base={canvas:P.canvas,layers:P.layers},a=P.animation,f=a?.keyframes||[];if(!f.length)return clone(base);f=f.slice().sort((q,w)=>q.time-w.time);if(t<=f[0].time)return clone(f[0].state);if(t>=f[f.length-1].time)return clone(f[f.length-1].state);let i=f.findIndex(q=>q.time>=t),l=f[i-1],r=f[i],u=(t-l.time)/(r.time-l.time);if(a.easing==='smooth')u=u*u*(3-2*u);return iv(l.state,r.state,u)}
function tr(l){x.translate(l.x*P.canvas.w,l.y*P.canvas.h);x.rotate(l.rotation*Math.PI/180);x.scale(l.scale*(l.scaleX||1),l.scale*(l.scaleY||1))}function pull(l,u,t){let r=Math.max(.025,l.anchorRadius||.14),o={x:0,y:0};(l.bendAnchors||[]).forEach(a=>{let du=(u-a.u)/r,dt=(t-a.t)/r,k=Math.exp(-(du*du+dt*dt)*1.8),f=Math.max(.01,l.bendFeather||.12),sd=l.bendSide==='left'?a.u-u:l.bendSide==='right'?u-a.u:l.bendSide==='top'?a.t-t:l.bendSide==='bottom'?t-a.t:f;if(l.bendSide&&l.bendSide!=='all')k*=clamp(sd/f+.5,0,1);if(l.bendAxis!=='vertical')o.x+=(a.dx||0)*P.canvas.w*k;if(l.bendAxis!=='horizontal')o.y+=(a.dy||0)*P.canvas.h*k});return o}function gp(l,u,t){let W=P.canvas.w*1.18,H=P.canvas.h*.92,d=Math.pow(t,1+l.perspective*2);return{x:(u-.5)*W*(1+(1-d)*l.perspective*1.6),y:(d-.5)*H+Math.sin(u*Math.PI*2+t*4)*l.bend*P.canvas.h*(1-t*.55)}}
function wave(l){let pass=glow=>{x.save();tr(l);x.globalAlpha=l.opacity*(glow?.7:1);x.globalCompositeOperation=glow?'lighter':l.blend;x.filter=glow?'blur('+Math.max(2,(l.glow||0)*P.canvas.w/1920)+'px)':'none';x.strokeStyle=glow?l.glowColor:l.color;x.lineWidth=l.width*P.canvas.w/1920*(glow?2.2:1);for(let n=0;n<l.lines;n++){let k=n/(l.lines-1)-.5;x.beginPath();for(let i=0;i<=140;i++){let u=i/140,base=k*l.spread*P.canvas.h+Math.sin(u*Math.PI*2*l.frequency+l.phase+k*l.twist*8)*l.amplitude*P.canvas.h*Math.sin(Math.PI*u)+Math.sin(u*Math.PI*4+l.phase*.45)*l.amplitude*P.canvas.h*.18+Math.sin(u*Math.PI*2+l.phase+k*3)*k*l.twist*P.canvas.h*.17,ap=(l.anchors||[]).reduce((s,a)=>s+a.dy*P.canvas.h*Math.exp(-Math.pow((u-a.u)/(l.anchorRadius||.1),2)*2.2),0),px=(u-.5)*P.canvas.w*1.35,py=base+ap;i?x.lineTo(px,py):x.moveTo(px,py)}x.stroke()}x.restore()};if((l.glow||0)>0)pass(true);pass(false)}
function grid(l){let pass=glow=>{x.save();tr(l);x.globalAlpha=l.opacity*(glow?.68:1);x.globalCompositeOperation=glow?'lighter':l.blend;x.filter=glow?'blur('+Math.max(2,(l.glow||0)*P.canvas.w/1920)+'px)':'none';x.lineWidth=l.width*P.canvas.w/1920*(glow?2.1:1);let R=l.lines,C=Math.round(R*1.55);for(let r=0;r<=R;r++){let t=r/R;x.strokeStyle=glow?l.glowColor:(l.paint==='gradient'?mix(l.color,l.color2,t):l.color);x.beginPath();for(let i=0;i<=100;i++){let u=i/100,p=gp(l,u,t),q=pull(l,u,t);i?x.lineTo(p.x+q.x,p.y+q.y):x.moveTo(p.x+q.x,p.y+q.y)}x.stroke()}for(let q=0;q<=C;q++){let u=q/C;x.strokeStyle=glow?l.glowColor:(l.paint==='gradient'?mix(l.color,l.color2,u):l.color);x.beginPath();for(let i=0;i<=70;i++){let t=i/70,p=gp(l,u,t),d=pull(l,u,t);i?x.lineTo(p.x+d.x,p.y+d.y):x.moveTo(p.x+d.x,p.y+d.y)}x.stroke()}x.restore()};if((l.glow||0)>0)pass(true);pass(false)}
function spot(l){x.save();tr(l);x.globalAlpha=l.opacity;x.globalCompositeOperation=l.blend;let r=l.radius*P.canvas.w,g=x.createRadialGradient(0,0,r*(1-l.softness),0,0,r),A=rgb(l.color),B=rgb(l.color2);g.addColorStop(0,'rgba('+A.join(',')+',1)');g.addColorStop(.52,'rgba('+B.join(',')+',.62)');g.addColorStop(1,'rgba('+B.join(',')+',0)');x.scale(l.stretch,1);x.fillStyle=g;x.fillRect(-r,-r,r*2,r*2);x.restore()}
function spectrum(l,time){x.save();tr(l);x.globalAlpha=l.opacity;x.globalCompositeOperation=l.blend;x.shadowBlur=(l.glow||0)*P.canvas.w/1920;x.shadowColor=l.glowColor;let n=Math.round(clamp(l.bars||48,8,64)),W=l.width*P.canvas.w,H=l.height*P.canvas.h,s=W/n,bw=s*(1-l.gap),values=[];for(let i=0;i<n;i++){let t=i/(n-1),j=Math.round(t*63),idle=.16+.12*Math.sin(time*1.8+j*.37)+.05*Math.sin(time*.7+j*.11),target=hasAudio?bins[j]:(l.idleMotion?Math.max(.02,idle):0);smooth[j]=smooth[j]*(l.smoothing||.72)+target*(1-(l.smoothing||.72));values.push(Math.min(1.5,smooth[j]*(l.sensitivity||1.35)))}if(l.spectrumStyle==='line'){let line=sign=>{x.beginPath();for(let i=0;i<n;i++){let t=i/(n-1),px=(t-.5)*W,py=sign*values[i]*H;i?x.lineTo(px,py):x.moveTo(px,py)}x.stroke()};x.strokeStyle=l.color;x.lineWidth=Math.max(1,(l.patternDensity||1)*P.canvas.w/1920);line(-1);if(l.mirror){x.globalAlpha=l.opacity*.48;line(1)}}else for(let i=0;i<n;i++){let t=i/(n-1),v=values[i];x.fillStyle=mix(l.color,l.color2,t);if(l.spectrumStyle==='radial'){let r=Math.min(P.canvas.w,P.canvas.h)*l.width*.28,a=((l.spectrumAngle||0)-90)*Math.PI/180+(t-.5)*(l.spectrumArc||360)*Math.PI/180;x.strokeStyle=x.fillStyle;x.lineWidth=Math.max(1,bw*.32);x.beginPath();x.moveTo(Math.cos(a)*r,Math.sin(a)*r);x.lineTo(Math.cos(a)*(r+v*H*.55),Math.sin(a)*(r+v*H*.55));x.stroke()}else{x.fillRect(-W/2+i*s,-v*H,bw,Math.max(1,v*H));if(l.mirror){x.globalAlpha=l.opacity*.48;x.fillRect(-W/2+i*s,0,bw,Math.max(1,v*H));x.globalAlpha=l.opacity}}}x.restore()}
function clock(l){x.save();tr(l);x.globalAlpha=l.opacity;x.globalCompositeOperation=l.blend;x.fillStyle=l.color;x.shadowBlur=(l.glow||0)*P.canvas.w/1920;x.shadowColor=l.glowColor;x.textBaseline='middle';let d=new Date(),to={hour:'2-digit',minute:'2-digit',second:l.showSeconds?'2-digit':undefined,hour12:l.timeFormat==='12'},dao=l.dateFormat==='numeric'?{year:'numeric',month:'2-digit',day:'2-digit'}:l.dateFormat==='weekday'?{weekday:'long',year:'numeric',month:'long',day:'numeric'}:{year:'numeric',month:'long',day:'numeric'},time=new Intl.DateTimeFormat(l.locale||'ru-RU',to).format(d),date=new Intl.DateTimeFormat(l.locale||'ru-RU',dao).format(d);if(l.uppercase){time=time.toUpperCase();date=date.toUpperCase()}let text=(value,y,size,color)=>{x.font=(size===l.fontSize?(l.fontWeight||600)+' ':'')+size+'px "'+(l.fontFamily||'Segoe UI').replace(/"/g,'')+'"';x.fillStyle=color;x.textAlign=l.textAlign||'center';x.fillText(value,0,y)};text(time,l.showDate?-l.fontSize*(l.lineGap||.42)*.5:0,l.fontSize,l.color);if(l.showDate)text(date,l.fontSize*(l.lineGap||.42)*1.05,Math.max(12,l.fontSize*.34),l.color2);x.restore()}
function globe(l,time){x.save();tr(l);x.globalCompositeOperation=l.blend;x.lineWidth=(l.width||1)*P.canvas.w/1920;x.shadowBlur=(l.glow||0)*P.canvas.w/1920;x.shadowColor=l.glowColor;x.strokeStyle=l.color;let R=Math.min(P.canvas.w,P.canvas.h)*(l.radius||.25),spin=((l.spin||0)+(l.autoRotate?time*(l.rotateSpeed||8):0))*Math.PI/180,tilt=(l.tilt||0)*Math.PI/180,proj=(la,lo)=>{let px=Math.cos(la)*Math.sin(lo+spin),py=Math.sin(la),pz=Math.cos(la)*Math.cos(lo+spin),ry=py*Math.cos(tilt)-pz*Math.sin(tilt),rz=py*Math.sin(tilt)+pz*Math.cos(tilt),q=1/Math.max(.35,1+rz*(l.perspective||0));return{x:px*R*q,y:ry*R*(l.flatten||1)*q,z:rz}};let trace=pts=>{for(let pass=0;pass<2;pass++){x.globalAlpha=l.opacity*(pass?(l.backOpacity||.18):1);x.beginPath();let active=false;pts.forEach(p=>{let wanted=pass?p.z>0:p.z<=0;if(wanted){active?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y);active=true}else active=false});x.stroke()}};for(let i=1;i<(l.latitudes||12);i++){let pts=[],la=-Math.PI/2+Math.PI*i/l.latitudes;for(let s=0;s<=72;s++)pts.push(proj(la,Math.PI*2*s/72));trace(pts)}for(let i=0;i<(l.longitudes||20);i++){let pts=[],lo=Math.PI*2*i/l.longitudes;for(let s=0;s<=72;s++)pts.push(proj(-Math.PI/2+Math.PI*s/72,lo));trace(pts)}x.restore()}
function resize(){let d=Math.min(2,devicePixelRatio||1);cv.width=Math.max(1,innerWidth*d);cv.height=Math.max(1,innerHeight*d)}addEventListener('resize',resize);resize();let last=0;function frame(now){requestAnimationFrame(frame);let fps=P.animation?.fps||60;if(now-last<1000/fps)return;last=now;let sec=(now-start)/1000,d=P.animation?.duration||8,t=P.animation?.loop===false?Math.min(sec,d):sec%d,s=sceneAt(t),sx=cv.width/P.canvas.w,sy=cv.height/P.canvas.h;x.setTransform(sx,0,0,sy,0,0);let bg=s.canvas||P.canvas;if(bg.bgMode==='gradient'){let g=x.createLinearGradient(0,0,P.canvas.w,P.canvas.h);g.addColorStop(0,bg.bg);g.addColorStop(1,bg.bg2);x.fillStyle=g}else x.fillStyle=bg.bg;x.fillRect(0,0,P.canvas.w,P.canvas.h);(s.layers||P.layers).forEach(l=>{if(!l.visible)return;if(l.type==='wave')wave(l);else if(l.type==='grid')grid(l);else if(l.type==='spot')spot(l);else if(l.type==='spectrum')spectrum(l,sec);else if(l.type==='clock')clock(l);else if(l.type==='globe')globe(l,sec)})}requestAnimationFrame(frame);
<\/script></body></html>`;
}

function exportWallpaperEngine() {
  const project = projectObject();
  project.animation.playing = false;
  const index = wallpaperRuntimeHtml(project);
  const manifest = JSON.stringify({
    file: 'index.html', type: 'web', title: 'NOCTURNE / LAB Animated Wallpaper', supportsaudioprocessing: true,
    description: 'Generated by NOCTURNE / LAB', preview: '', visibility: 'private',
    general: { properties: {} }
  }, null, 2);
  const blob = zipStore({ 'index.html': index, 'project.json': manifest, 'README.txt': 'Распакуйте папку и перетащите index.html в Create Wallpaper в Wallpaper Engine.\\r\\n' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = 'nocturne-wallpaper-engine.zip'; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1500); toast('Проект Wallpaper Engine готов');
}
animationBar.querySelector('[data-export]').onclick = exportWallpaperEngine;

ensureFeatureState();
refreshTimeline();
