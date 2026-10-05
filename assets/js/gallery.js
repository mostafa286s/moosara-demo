/* موس‌آرا — لایت‌باکس گالری: زوم چرخ ۲۰٪–۵۰۰٪، درگ بالای ۱۰۰٪، دابل‌کلیک، pinch، کیبورد، Escape */
(function () {
  'use strict';
  var MIN = 0.2, MAX = 5;
  var lb = document.getElementById('lightbox');
  var stage = lb.querySelector('.lb-stage');
  var img = lb.querySelector('.lb-stage img');
  var titleEl = lb.querySelector('.lb-bar .title');
  var zoomEl = lb.querySelector('.zoomval');
  var items = Array.prototype.slice.call(document.querySelectorAll('.gallery button'));
  var current = 0, scale = 1, fit = 1, tx = 0, ty = 0, open = false;
  var pointers = new Map(), pinchStart = 0, pinchScale = 1, dragging = false, moved = false;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function apply() {
    img.style.transform = 'translate(-50%,-50%) translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    zoomEl.textContent = Math.round(scale * 100) + '٪';
    stage.style.cursor = scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in';
  }
  function natural() { return { w: img.naturalWidth || 800, h: img.naturalHeight || 600 }; }
  function computeFit() {
    var n = natural(), r = stage.getBoundingClientRect();
    return clamp(Math.min((r.width - 24) / n.w, (r.height - 24) / n.h), MIN, 1);
  }
  function resetTo(z) { scale = clamp(z, MIN, MAX); tx = 0; ty = 0; apply(); }

  function show(i) {
    current = (i + items.length) % items.length;
    var src = items[current].getAttribute('data-full');
    titleEl.textContent = items[current].getAttribute('data-title');
    img.onload = function () { fit = computeFit(); resetTo(fit); img.onload = null; };
    img.src = src;
    fit = computeFit(); resetTo(fit);
  }
  function openLb(i) { open = true; lb.classList.add('open'); document.body.style.overflow = 'hidden'; show(i); }
  function closeLb() { open = false; lb.classList.remove('open'); document.body.style.overflow = ''; pointers.clear(); }

  /* چرخ ماوس: زوم حول نقطهٔ اشاره */
  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = stage.getBoundingClientRect();
    var cx = r.width / 2, cy = r.height / 2;
    var px = e.clientX - r.left - cx, py = e.clientY - r.top - cy;
    var prev = scale;
    scale = clamp(scale * Math.exp(-e.deltaY * 0.0016), MIN, MAX);
    var k = scale / prev;
    tx = px - k * (px - tx); ty = py - k * (py - ty);
    if (scale <= fit + 0.001) { tx = 0; ty = 0; }
    apply();
  }, { passive: false });

  /* درگ (وقتی زوم بالای ۱۰۰٪) + pinch دو انگشتی */
  stage.addEventListener('pointerdown', function (e) {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pointers.size === 1) { dragging = scale > 1; apply(); }
    if (pointers.size === 2) {
      var p = Array.from(pointers.values());
      pinchStart = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      pinchScale = scale;
    }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId)) return;
    var prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      var p = Array.from(pointers.values());
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (pinchStart > 0) { scale = clamp(pinchScale * (d / pinchStart), MIN, MAX); apply(); }
      moved = true;
    } else if (dragging && scale > 1) {
      tx += e.clientX - prev.x; ty += e.clientY - prev.y; moved = true; apply();
    }
  });
  function release(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = 0;
    if (pointers.size === 0) { dragging = false; apply(); }
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  /* دابل‌کلیک: بین fit و ۲۰۰٪ */
  stage.addEventListener('dblclick', function (e) {
    e.preventDefault();
    if (Math.abs(scale - fit) < 0.01) {
      var r = stage.getBoundingClientRect();
      var px = e.clientX - r.left - r.width / 2, py = e.clientY - r.top - r.height / 2;
      var k = 2 / scale;
      tx = px - k * (px - tx); ty = py - k * (py - ty);
      scale = 2;
    } else { resetTo(fit); }
    apply();
  });

  /* دکمه‌ها */
  lb.querySelector('[data-act="in"]').addEventListener('click', function () { scale = clamp(scale * 1.25, MIN, MAX); apply(); });
  lb.querySelector('[data-act="out"]').addEventListener('click', function () { scale = clamp(scale / 1.25, MIN, MAX); if (scale <= fit + 0.001) { tx = 0; ty = 0; } apply(); });
  lb.querySelector('[data-act="fit"]').addEventListener('click', function () { resetTo(computeFit()); });
  lb.querySelector('[data-act="100"]').addEventListener('click', function () { resetTo(1); });
  lb.querySelector('[data-act="close"]').addEventListener('click', closeLb);
  lb.querySelector('[data-act="prev"]').addEventListener('click', function () { show(current - 1); });
  lb.querySelector('[data-act="next"]').addEventListener('click', function () { show(current + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });

  /* کیبورد */
  document.addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowRight') show(current - 1);   /* RTL: راست = قبلی */
    else if (e.key === 'ArrowLeft') show(current + 1);
    else if (e.key === '+' || e.key === '=') { scale = clamp(scale * 1.25, MIN, MAX); apply(); }
    else if (e.key === '-') { scale = clamp(scale / 1.25, MIN, MAX); apply(); }
    else if (e.key === '0') resetTo(computeFit());
  });

  window.addEventListener('resize', function () { if (open) { fit = computeFit(); if (scale <= fit) resetTo(fit); } });

  items.forEach(function (btn, i) { btn.addEventListener('click', function () { openLb(i); }); });
})();
