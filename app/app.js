/* Vice Nights — Cover Studio.
   Plain classic script, no modules, no network: it draws the cover on a
   <canvas> from the photos in state, grades it, letters it, and exports PNG.
   All art, lettering and fonts are original; no Rockstar logo, artwork,
   wordmark or font is used anywhere. Photos never leave the device. */
'use strict';

/* ------------------------------------------------------------------ data */

var SAMPLES = {
  sunset: { file: 'samples/sunset-boulevard.png', label: 'Sunset Blvd' },
  boulevard: { file: 'samples/sunset-boulevard.png', label: 'Sunset Blvd' },
  neon: { file: 'samples/neon-pier.png', label: 'Neon Pier' },
  pier: { file: 'samples/neon-pier.png', label: 'Neon Pier' },
  dusk: { file: 'samples/city-dusk.png', label: 'City Dusk' },
  city: { file: 'samples/city-dusk.png', label: 'City Dusk' },
};

var LAYOUT_NOTES = {
  poster: 'Poster: one hero photo on top, two insets below.',
  triptych: 'Triptych: three vertical panels side by side.',
  single: 'Single: one photo full-bleed, title over it.',
};

var GRADES = {
  sunset: {
    filter: 'sepia(0.35) saturate(1.5) contrast(1.05)',
    tint: 'rgba(255,110,40,0.14)',
    title: '#fff7e0', titleStroke: '#3a0a2e',
    captionBg: 'rgba(20,5,30,0.85)', accent: '#ff8a3d',
  },
  neon: {
    filter: 'saturate(1.7) contrast(1.12) hue-rotate(-12deg)',
    tint: 'rgba(255,40,160,0.10)',
    title: '#ffffff', titleStroke: '#12002e',
    captionBg: 'rgba(10,0,30,0.85)', accent: '#ff4fa3',
  },
  noir: {
    filter: 'grayscale(0.92) contrast(1.25) brightness(0.95)',
    tint: 'rgba(0,0,0,0.10)',
    title: '#f5f5f5', titleStroke: '#000000',
    captionBg: 'rgba(0,0,0,0.88)', accent: '#e8e8e8',
  },
  palm: {
    filter: 'saturate(1.5) contrast(1.05) hue-rotate(8deg)',
    tint: 'rgba(20,180,140,0.10)',
    title: '#fffbe8', titleStroke: '#06281f',
    captionBg: 'rgba(4,30,24,0.85)', accent: '#39d5a0',
  },
};

var EXPORT_SIZES = [
  { w: 1080, h: 1080, label: '1080 x 1080 (square)' },
  { w: 1080, h: 1350, label: '1080 x 1350 (portrait)' },
  { w: 1920, h: 1080, label: '1920 x 1080 (landscape)' },
  { w: 1080, h: 1920, label: '1080 x 1920 (story)' },
];

var state = {
  photos: [null, null, null],   // HTMLImageElement or null, slots 0..2
  photoKinds: ['', '', ''],     // 'sample:<key>' | 'upload' | ''
  layout: 'poster',
  grade: 'sunset',
  title: 'VICE NIGHTS',
  caption: 'Welcome to Vice City',
  heroZoom: 1,
  heroPan: { x: 0, y: 0 },
  size: { w: 1080, h: 1080 },
  coverMode: false,
};

/* ------------------------------------------------------------------ dom */

function $(id) { return document.getElementById(id); }

var stage = $('stage');
var stageCtx = stage.getContext('2d');

/* ------------------------------------------------------------------ images */

function loadImage(src) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('could not load ' + src)); };
    img.src = src;
  });
}

function loadSamplePhoto(slot, key) {
  var sample = SAMPLES[key];
  if (!sample) return Promise.resolve(null);
  return loadImage(sample.file).then(function (img) {
    state.photos[slot] = img;
    state.photoKinds[slot] = 'sample:' + key;
    $('thumb' + slot).src = sample.file;
    return img;
  });
}

function loadUploadedPhoto(slot, file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      loadImage(reader.result).then(function (img) {
        state.photos[slot] = img;
        state.photoKinds[slot] = 'upload';
        $('thumb' + slot).src = reader.result;
        renderPreview();
        resolve(img);
      }, reject);
    };
    reader.onerror = function () { reject(new Error('could not read file')); };
    reader.readAsDataURL(file);
  });
}

function clearPhotoSlot(slot) {
  state.photos[slot] = null;
  state.photoKinds[slot] = '';
  $('thumb' + slot).removeAttribute('src');
}

/* ------------------------------------------------------------------ drawing */

function drawPhotoCover(ctx, img, x, y, w, h, view, grade) {
  if (!img) {
    drawPlaceholderPanel(ctx, x, y, w, h, view ? 'PHOTO 1' : 'NO PHOTO');
    return null;
  }
  var iw = img.naturalWidth, ih = img.naturalHeight;
  var base = Math.max(w / iw, h / ih);
  var zoom = view ? view.zoom : 1;
  var scale = base * zoom;
  var dw = iw * scale, dh = ih * scale;
  var dx = x + (w - dw) / 2;
  var dy = y + (h - dh) / 2;
  if (view) {
    var slackX = Math.max(0, (dw - w) / 2);
    var slackY = Math.max(0, (dh - h) / 2);
    dx += view.panX * slackX;
    dy += view.panY * slackY;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  ctx.filter = 'none';
  return { dw: dw, dh: dh, w: w, h: h };
}

function drawPlaceholderPanel(ctx, x, y, w, h, label) {
  var g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#241536');
  g.addColorStop(1, '#12081f');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = Math.max(1, w * 0.004);
  for (var i = -h; i < w; i += Math.max(24, w * 0.08)) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(244,238,252,0.75)';
  ctx.font = '700 ' + Math.max(14, Math.round(h * 0.06)) + 'px "DejaVu Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

function applyGradeOverlays(ctx, w, h, grade) {
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  var v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function fitFontSize(ctx, text, maxWidth, baseSize, minSize, weight, family) {
  var size = baseSize;
  while (size > minSize) {
    ctx.font = weight + ' ' + size + 'px ' + family;
    try { ctx.letterSpacing = '2px'; } catch (e) { /* older canvas: ignore */ }
    if (ctx.measureText(text).width <= maxWidth) break;
    size = Math.floor(size * 0.92);
  }
  return size;
}

function drawTitleBlock(ctx, w, h, grade, rect, sizePx) {
  var title = state.title.trim();
  if (!title) return;
  var margin = w * 0.05;
  var maxWidth = rect.w - margin * 2;
  var size = fitFontSize(ctx, title.toUpperCase(), maxWidth, sizePx, Math.max(18, sizePx * 0.35), '900', '"Arial Black", "DejaVu Sans", sans-serif');
  var scrim = ctx.createLinearGradient(0, rect.y - size * 1.1, 0, rect.y + rect.h);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, rect.y - size * 1.1, w, rect.h + size * 1.1);
  ctx.save();
  ctx.translate(rect.x + margin, rect.y + rect.h - h * 0.028);
  ctx.rotate(-0.02);
  ctx.font = '900 ' + size + 'px "Arial Black", "DejaVu Sans", sans-serif';
  try { ctx.letterSpacing = '2px'; } catch (e) { /* ignore */ }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size / 9);
  ctx.strokeStyle = grade.titleStroke;
  ctx.strokeText(title.toUpperCase(), 0, 0);
  ctx.fillStyle = grade.title;
  ctx.fillText(title.toUpperCase(), 0, 0);
  ctx.restore();
}

function drawCaptionBar(ctx, w, h, grade) {
  var caption = state.caption.trim() || 'VICE NIGHTS — COVER STUDIO';
  var barH = Math.round(h * 0.072);
  var y = h - barH;
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, y, w, Math.max(2, h * 0.004));
  ctx.fillStyle = grade.captionBg;
  ctx.fillRect(0, y + Math.max(2, h * 0.004), w, barH);
  var size = fitFontSize(ctx, caption.toUpperCase(), w * 0.9, Math.round(h * 0.030), 12, '700', '"DejaVu Sans", sans-serif');
  ctx.font = '700 ' + size + 'px "DejaVu Sans", sans-serif';
  try { ctx.letterSpacing = '3px'; } catch (e) { /* ignore */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(caption.toUpperCase(), w / 2, y + barH / 2 + Math.max(2, h * 0.004));
  return barH;
}

function drawFrame(ctx, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

/** Draw the whole cover into ctx at w x h. Returns the hero draw metrics. */
function drawCover(ctx, w, h) {
  var grade = GRADES[state.grade] || GRADES.sunset;
  var gap = Math.max(6, Math.round(w * 0.012));
  var captionH = Math.round(h * 0.072);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0614';
  ctx.fillRect(0, 0, w, h);
  ctx.filter = 'none';

  var heroView = { zoom: state.heroZoom, panX: state.heroPan.x, panY: state.heroPan.y };
  var heroMetrics = null;

  if (state.layout === 'poster') {
    var heroH = Math.round(h * 0.60);
    var hero = { x: gap, y: gap, w: w - gap * 2, h: heroH };
    heroMetrics = drawPhotoCover(ctx, state.photos[0], hero.x, hero.y, hero.w, hero.h, heroView, grade);
    var insetY = gap + heroH + gap;
    var insetH = h - captionH - insetY - gap;
    var insetW = (w - gap * 3) / 2;
    drawPhotoCover(ctx, state.photos[1], gap, insetY, insetW, insetH, null, grade);
    drawPhotoCover(ctx, state.photos[2], gap * 2 + insetW, insetY, insetW, insetH, null, grade);
    drawTitleBlock(ctx, w, h, grade, { x: hero.x, y: hero.y + hero.h - Math.round(h * 0.16), w: hero.w, h: Math.round(h * 0.16) }, Math.round(h * 0.085));
  } else if (state.layout === 'triptych') {
    var panelW = (w - gap * 4) / 3;
    var panelH = h - captionH - gap * 2;
    for (var i = 0; i < 3; i++) {
      var px = gap + i * (panelW + gap);
      var view = i === 0 ? heroView : null;
      var m = drawPhotoCover(ctx, state.photos[i], px, gap, panelW, panelH, view, grade);
      if (i === 0) heroMetrics = m;
    }
    drawTitleBlock(ctx, w, h, grade, { x: gap, y: gap, w: w - gap * 2, h: Math.round(h * 0.15) }, Math.round(h * 0.068));
  } else { /* single */
    heroMetrics = drawPhotoCover(ctx, state.photos[0], 0, 0, w, h, heroView, grade);
    drawTitleBlock(ctx, w, h, grade, { x: 0, y: h - captionH - Math.round(h * 0.17), w: w, h: Math.round(h * 0.17) }, Math.round(h * 0.11));
  }

  applyGradeOverlays(ctx, w, h, grade);
  drawCaptionBar(ctx, w, h, grade);
  drawFrame(ctx, w, h);
  return heroMetrics;
}

/* ------------------------------------------------------------------ preview */

function currentCanvasSize() {
  if (state.coverMode) return { w: window.innerWidth, h: window.innerHeight };
  return { w: state.size.w, h: state.size.h };
}

function renderPreview() {
  var s = currentCanvasSize();
  if (stage.width !== s.w || stage.height !== s.h) {
    stage.width = s.w;
    stage.height = s.h;
  }
  drawCover(stageCtx, s.w, s.h);
}

/* ------------------------------------------------------------------ export */

function exportCoverPNG() {
  var size = state.size;
  var canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas.getContext('2d'), size.w, size.h);
  var name = 'vice-nights-cover-' + size.w + 'x' + size.h + '.png';
  canvas.toBlob(function (blob) {
    if (!blob) return;
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    $('exportNote').textContent = 'Saved ' + name + ' (' + Math.round(blob.size / 1024) + ' KiB).';
  }, 'image/png');
}

/* ------------------------------------------------------------------ ui wiring */

function setLayout(layout) {
  state.layout = layout;
  var buttons = document.querySelectorAll('#layoutChoices button');
  buttons.forEach(function (b) { b.classList.toggle('active', b.dataset.layout === layout); });
  $('layoutNote').textContent = LAYOUT_NOTES[layout] || '';
  renderPreview();
}

function setGrade(grade) {
  state.grade = grade;
  var buttons = document.querySelectorAll('#gradeChoices button');
  buttons.forEach(function (b) { b.classList.toggle('active', b.dataset.grade === grade); });
  renderPreview();
}

function wireUI() {
  document.querySelectorAll('#layoutChoices button').forEach(function (b) {
    b.addEventListener('click', function () { setLayout(b.dataset.layout); });
  });
  document.querySelectorAll('#gradeChoices button').forEach(function (b) {
    b.addEventListener('click', function () { setGrade(b.dataset.grade); });
  });

  $('title').addEventListener('input', function () { state.title = $('title').value; renderPreview(); });
  $('caption').addEventListener('input', function () { state.caption = $('caption').value; renderPreview(); });

  $('zoom').addEventListener('input', function () {
    state.heroZoom = parseFloat($('zoom').value);
    $('zoomValue').textContent = state.heroZoom.toFixed(2) + '×';
    renderPreview();
  });
  $('resetView').addEventListener('click', function () {
    state.heroZoom = 1;
    state.heroPan = { x: 0, y: 0 };
    $('zoom').value = '1';
    $('zoomValue').textContent = '1.00×';
    renderPreview();
  });

  $('size').addEventListener('change', function () {
    var parts = $('size').value.split('x');
    state.size = { w: parseInt(parts[0], 10), h: parseInt(parts[1], 10) };
    renderPreview();
  });
  $('exportBtn').addEventListener('click', exportCoverPNG);

  for (var slot = 0; slot < 3; slot++) {
    (function (s) {
      $('sample' + s).addEventListener('change', function () {
        var key = $('sample' + s).value;
        if (!key) { clearPhotoSlot(s); renderPreview(); return; }
        loadSamplePhoto(s, key).then(renderPreview);
      });
      $('file' + s).addEventListener('change', function (ev) {
        var file = ev.target.files && ev.target.files[0];
        if (!file) return;
        $('sample' + s).value = '';
        loadUploadedPhoto(s, file);
      });
    })(slot);
  }

  var dragging = null;
  stage.addEventListener('pointerdown', function (ev) {
    if (state.coverMode) return;
    dragging = { x: ev.clientX, y: ev.clientY };
    stage.classList.add('dragging');
    stage.setPointerCapture(ev.pointerId);
  });
  stage.addEventListener('pointermove', function (ev) {
    if (!dragging) return;
    var rect = stage.getBoundingClientRect();
    state.heroPan.x = Math.max(-1, Math.min(1, state.heroPan.x + (ev.clientX - dragging.x) / rect.width * 2.5));
    state.heroPan.y = Math.max(-1, Math.min(1, state.heroPan.y + (ev.clientY - dragging.y) / rect.height * 2.5));
    dragging = { x: ev.clientX, y: ev.clientY };
    renderPreview();
  });
  function endDrag() { dragging = null; stage.classList.remove('dragging'); }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
}

/* ------------------------------------------------------------------ shot mode */

function applyShotParams() {
  var params = new URLSearchParams(location.search);
  var shot = params.get('shot');
  if (!shot) return Promise.resolve(false);

  var key = function (name) { return params.get(name) || ''; };
  var loads = [];
  var canonical = { sunset: 'sunset', boulevard: 'sunset', neon: 'neon', pier: 'neon', dusk: 'dusk', city: 'dusk' };
  ['photo', 'photo2', 'photo3'].forEach(function (name, i) {
    var k = key(name);
    if (k && SAMPLES[k]) {
      $('sample' + i).value = canonical[k] || '';
      loads.push(loadSamplePhoto(i, k));
    }
  });
  if (key('layout') && LAYOUT_NOTES[key('layout')]) setLayout(key('layout'));
  if (key('grade') && GRADES[key('grade')]) setGrade(key('grade'));
  if (key('title') !== '') { state.title = key('title'); $('title').value = state.title; }
  if (key('caption') !== '') { state.caption = key('caption'); $('caption').value = state.caption; }
  if (key('size')) {
    var parts = key('size').split('x');
    var w = parseInt(parts[0], 10), h = parseInt(parts[1], 10);
    if (w > 0 && h > 0) {
      state.size = { w: w, h: h };
      var opt = $('size').querySelector('option[value="' + w + 'x' + h + '"]');
      if (opt) $('size').value = w + 'x' + h;
    }
  }
  if (key('zoom')) {
    var z = parseFloat(key('zoom'));
    if (z >= 1 && z <= 2.5) {
      state.heroZoom = z;
      $('zoom').value = String(z);
      $('zoomValue').textContent = z.toFixed(2) + '×';
    }
  }
  if (key('panx') !== '' || key('pany') !== '') {
    var px = parseFloat(key('panx') || '0');
    var py = parseFloat(key('pany') || '0');
    if (isFinite(px)) state.heroPan.x = Math.max(-1, Math.min(1, px));
    if (isFinite(py)) state.heroPan.y = Math.max(-1, Math.min(1, py));
  }
  if (shot === 'cover') {
    state.coverMode = true;
    document.body.classList.add('shot-cover');
  }
  return Promise.all(loads).then(function () {
    renderPreview();
    return true;
  });
}

/* ------------------------------------------------------------------ test hook */

window.__coverApp = {
  /** Render the current cover at w x h and return a PNG data URL. */
  exportDataURL: function (w, h) {
    return new Promise(function (resolve) {
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      drawCover(canvas.getContext('2d'), w, h);
      resolve(canvas.toDataURL('image/png'));
    });
  },
  state: state,
  render: renderPreview,
};

/* ------------------------------------------------------------------ boot */

function boot() {
  wireUI();
  var defaults = ['sunset', 'neon', 'dusk'].map(function (key, i) {
    $('sample' + i).value = key;
    return loadSamplePhoto(i, key);
  });
  Promise.all(defaults).then(function () {
    renderPreview();
    return applyShotParams();
  }).then(function (shot) {
    renderPreview();
    requestAnimationFrame(function () {
      window.__shotReady = true;
    });
  });
}

boot();
