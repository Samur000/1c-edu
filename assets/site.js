(function () {
  "use strict";
  var P = window.PLAN, html = document.documentElement, body = document.body;
  var ROOT = html.getAttribute("data-root") || "";
  var PAGE_TASK = html.getAttribute("data-task");
  var MODES = { look: ["👀", "изучить"], practice: ["✍️", "практика"], key: ["🔥", "ключевое"] };
  var NARROW = window.matchMedia("(max-width: 1000px)");

  /* ---------- хранилище ---------- */
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var allTasks = [], chapters = [];
  P.stages.forEach(function (s) {
    s.chapters.forEach(function (c) {
      c.stage = s; chapters.push(c);
      c.tasks.forEach(function (t) { t.chapter = c; allTasks.push(t); });
    });
  });
  var byId = {}; allTasks.forEach(function (t) { byId[t.id] = t; });

  var done = null;
  try { done = JSON.parse(get("c1.done") || "null"); } catch (e) {}
  if (!done) { done = {}; allTasks.forEach(function (t) { if (t.done) done[t.id] = true; }); }
  function isDone(id) { return !!done[id]; }
  function setDone(id, v) { if (v) done[id] = true; else delete done[id]; set("c1.done", JSON.stringify(done)); }

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (attrs[k] == null) continue;
      if (k === "text") e.textContent = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function href(t) { return ROOT + t.page; }

  /* ---------- анимация: 0.3 s, ease-in-out ---------- */
  var DUR = 300;
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");
  var EASE = "ease-in-out";
  // ease-in-out = cubic-bezier(.42, 0, .58, 1)
  function easeInOut(t) {
    var lo = 0, hi = 1, u = t;
    for (var i = 0; i < 24; i++) {
      u = (lo + hi) / 2;
      var x = 3 * (1 - u) * (1 - u) * u * 0.42 + 3 * (1 - u) * u * u * 0.58 + u * u * u;
      if (x < t) lo = u; else hi = u;
    }
    return 3 * (1 - u) * u * u + u * u * u;
  }
  var scrollRaf = 0, scrollGuard = 0;
  function smoothScrollTo(y) {
    cancelAnimationFrame(scrollRaf);
    var from = window.scrollY, dist = y - from, t0 = null;
    if (REDUCED.matches || Math.abs(dist) < 2) { window.scrollTo(0, y); return; }
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / DUR);
      window.scrollTo(0, from + dist * easeInOut(k));
      if (k < 1) scrollRaf = requestAnimationFrame(step); else clearTimeout(scrollGuard);
    }
    scrollRaf = requestAnimationFrame(step);
    // вкладка в фоне не рисует кадры — тогда просто переходим к месту
    clearTimeout(scrollGuard);
    scrollGuard = setTimeout(function () { cancelAnimationFrame(scrollRaf); if (t0 === null) window.scrollTo(0, y); }, DUR + 150);
  }
  // колесо или палец прерывают анимацию прокрутки
  ["wheel", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { cancelAnimationFrame(scrollRaf); }, { passive: true });
  });
  function anim(node, frames) {
    if (REDUCED.matches || !node.animate) return null;
    return node.animate(frames, { duration: DUR, easing: EASE });
  }
  function themeFade(fn) {
    html.classList.add("theme-anim");
    fn();
    clearTimeout(themeFade.t);
    themeFade.t = setTimeout(function () { html.classList.remove("theme-anim"); }, DUR + 50);
  }

  /* Ссылки на разделы этой же страницы — плавно */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var id = decodeURIComponent(a.getAttribute("href").slice(1));
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    var pad = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
    smoothScrollTo(target.getBoundingClientRect().top + window.scrollY - pad);
    if (history.pushState) history.pushState(null, "", "#" + encodeURIComponent(id));
  });
  function dayDiff(iso) {
    var now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((new Date(iso + "T00:00:00") - now) / 864e5);
  }
  function plural(n, a, b, c) {
    var m10 = n % 10, m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c;
  }

  /* ---------- верхняя полоса и тема ---------- */
  var tocBtn = null;
  var GEAR = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  var DARK_MQ = window.matchMedia("(prefers-color-scheme: dark)");
  function applyTheme() {
    var t = get("c1.theme") || "auto";
    html.setAttribute("data-theme", t === "auto" ? (DARK_MQ.matches ? "dark" : "light") : t);
  }
  function topbar() {
    var bar = document.getElementById("topbar"); if (!bar) return;
    var isNote = !!document.getElementById("toc");
    if (isNote) {
      tocBtn = el("button", { class: "btn", type: "button", "aria-controls": "toc", text: "☰ Содержание" });
      tocBtn.onclick = function () { toggleToc(); };
      bar.appendChild(tocBtn);
    }
    bar.appendChild(el("a", { class: "brand", href: ROOT + "index.html", html: "Конспекты 1С <span>· путь до джуна</span>" }));
    bar.appendChild(el("span", { class: "spacer" }));

    var gear = el("button", { class: "btn gear", type: "button", "aria-label": "Настройки", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-controls": "settings", html: GEAR });
    bar.appendChild(gear);
    var panel = el("div", { class: "settings", id: "settings", role: "dialog", "aria-label": "Настройки" });
    body.appendChild(panel);

    var groups = [
      { label: "Тема", key: "c1.theme", def: "auto", opts: [["light", "Светлая"], ["dark", "Тёмная"], ["auto", "Как в системе"]],
        apply: function () { themeFade(applyTheme); } },
      { label: "Размер текста", key: "c1.size", def: "m", opts: [["s", "Мельче"], ["m", "Обычный"], ["l", "Крупнее"]],
        apply: function (v) { html.setAttribute("data-size", v); } },
      { label: "Ширина конспекта", key: "c1.width", def: "full", note: true, desk: true, opts: [["normal", "Колонка"], ["full", "Во всю ширину"]],
        hint: "Во всю ширину — с отступом 100 px по краям, когда содержание скрыто.",
        apply: function (v) { html.setAttribute("data-width", v); } },
      { label: "Содержание слева", key: "toc", note: true, desk: true, opts: [["open", "Показывать"], ["closed", "Скрыть"]],
        cur: function () { return body.classList.contains("toc-closed") ? "closed" : "open"; },
        apply: function (v) { toggleToc(v === "open"); } }
    ];
    var x = el("button", { class: "set-close", type: "button", "aria-label": "Закрыть настройки", text: "✕" });
    x.onclick = function () { openPanel(false); };
    panel.appendChild(el("div", { class: "set-head" }, [el("h2", { text: "Настройки" }), x]));
    groups.forEach(function (g) {
      if (g.note && !isNote) return;
      g.seg = el("div", { class: "seg", role: "group", "aria-label": g.label }, [el("span", { class: "seg-thumb", "aria-hidden": "true" })]);
      g.opts.forEach(function (o) {
        var b = el("button", { type: "button", "data-v": o[0], text: o[1] });
        b.onclick = function () { if (!g.cur) set(g.key, o[0]); g.apply(o[0]); sync(); };
        g.seg.appendChild(b);
      });
      panel.appendChild(el("div", { class: "set-group" + (g.desk ? " set-desk" : "") }, [el("div", { class: "set-label", text: g.label }), g.seg, g.hint ? el("p", { class: "set-hint", text: g.hint }) : null]));
    });
    function sync() {
      groups.forEach(function (g) {
        if (!g.seg) return;
        var cur = g.cur ? g.cur() : (get(g.key) || g.def), on = null;
        [].forEach.call(g.seg.querySelectorAll("button"), function (b) {
          var p = b.getAttribute("data-v") === cur; b.setAttribute("aria-pressed", String(p)); if (p) on = b;
        });
        var th = g.seg.firstChild;
        if (on) { th.style.width = on.offsetWidth + "px"; th.style.transform = "translateX(" + on.offsetLeft + "px)"; }
      });
    }
    function isOpen() { return panel.classList.contains("open"); }
    function openPanel(v) {
      if (v) { panel.classList.add("snap"); sync(); panel.offsetWidth; panel.classList.remove("snap"); }
      panel.classList.toggle("open", v); gear.setAttribute("aria-expanded", String(v));
      if (v) { var f = panel.querySelector('[aria-pressed="true"]'); if (f) f.focus({ preventScroll: true }); } else gear.focus({ preventScroll: true });
    }
    gear.onclick = function () { openPanel(!isOpen()); };
    document.addEventListener("click", function (e) {
      if (isOpen() && !panel.contains(e.target) && !gear.contains(e.target)) { panel.classList.remove("open"); gear.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen()) openPanel(false); });
    var onSys = function () { if ((get("c1.theme") || "auto") === "auto") themeFade(applyTheme); };
    DARK_MQ.addEventListener ? DARK_MQ.addEventListener("change", onSys) : DARK_MQ.addListener(onSys);
  }

  /* ---------- главная ---------- */
  function home() {
    var root = document.getElementById("plan"); if (!root) return;
    var cur = byId[P.current];

    var st = document.getElementById("status");
    var doneCount = allTasks.filter(function (t) { return isDone(t.id); }).length;
    var nowLine = el("p", { class: "now" }, ["Сейчас: "]);
    var curName = cur.id + " " + cur.title;
    nowLine.appendChild(cur.page ? el("a", { href: href(cur), text: curName }) : el("strong", { text: curName }));
    var facts = P.milestones.map(function (m) {
      var d = dayDiff(m.date);
      return d > 0 ? "до этапа «" + m.label + "» " + d + " " + plural(d, "день", "дня", "дней") : null;
    }).filter(Boolean);
    st.innerHTML = "";
    st.appendChild(nowLine);
    homeFacts = facts;
    st.appendChild(el("p", { class: "facts", text: factsText() }));
    var bar = el("div", { class: "bar", "aria-hidden": "true" });
    chapters.forEach(function (c, ci) {
      if (ci) bar.appendChild(el("i", { class: "gap" }));
      c.tasks.forEach(function (t) {
        bar.appendChild(el("i", { class: isDone(t.id) ? "done" : t.id === P.current ? "cur" : "", title: t.id + " " + t.title, "data-id": t.id }));
      });
    });
    st.appendChild(bar);
    st.appendChild(el("p", { class: "bar-legend", text: "Каждая клетка — задача плана, промежутки — границы глав." }));

    root.innerHTML = "";
    P.stages.forEach(function (s) {
      var sec = el("section", { class: "stage" });
      sec.appendChild(el("header", { class: "stage-head" }, [
        el("h2", { text: s.title }),
        el("p", { class: "dates", text: s.dates }),
        el("p", { class: "goal", text: s.goal })
      ]));
      s.chapters.forEach(function (c) {
        var n = c.tasks.filter(function (t) { return isDone(t.id); }).length;
        var art = el("article", { class: "chapter" + (n === c.tasks.length ? " all-done" : ""), id: "ch" + c.n, "data-ch": c.n });
        art.appendChild(el("div", { class: "ch-num", text: c.n }));
        art.appendChild(el("div", { class: "ch-head" }, [
          el("h3", { text: c.title }),
          el("span", { class: "ch-meta", text: [c.dates, n + " из " + c.tasks.length].filter(Boolean).join(" · ") })
        ]));
        var ol = el("ol", { class: "tasks" });
        c.tasks.forEach(function (t) {
          var cls = "task" + (isDone(t.id) ? " is-done" : "") + (t.id === P.current ? " is-current" : "");
          var cb = el("input", { type: "checkbox", "aria-label": "Пройдено: " + t.id });
          cb.checked = isDone(t.id);
          cb.onchange = function () { setDone(t.id, cb.checked); refreshHome(true); };
          var title = t.page ? el("a", { class: "t-title", href: href(t), text: t.title })
                             : el("span", { class: "t-title", title: "Конспекта пока нет", text: t.title });
          if (t.id === P.current) title.appendChild(el("span", { class: "badge-now", text: "сейчас" }));
          var m = MODES[t.mode];
          ol.appendChild(el("li", { class: cls, "data-id": t.id }, [
            el("label", { class: "chk" }, [cb]),
            el("span", { class: "t-id", text: t.id }),
            title,
            el("span", { class: "t-side", title: m[1] }, [el("span", { class: "ico", text: m[0] }), m[1]])
          ]));
        });
        art.appendChild(ol);
        sec.appendChild(art);
      });
      root.appendChild(sec);
    });

    var hide = document.getElementById("hide-done");
    if (hide && !hide.dataset.bound) {
      hide.dataset.bound = 1;
      hide.checked = get("c1.hideDone") === "1";
      hideDone = hide.checked;
      applyHide(false);
      hide.onchange = function () { hideDone = hide.checked; set("c1.hideDone", hide.checked ? "1" : "0"); applyHide(true); };
    }
    var reset = document.getElementById("reset-done");
    if (reset && !reset.dataset.bound) {
      reset.dataset.bound = 1;
      reset.onclick = function () {
        if (!confirm("Вернуть отметки как в плане? Свои отметки пропадут.")) return;
        done = {}; allTasks.forEach(function (t) { if (t.done) done[t.id] = true; });
        set("c1.done", JSON.stringify(done));
        root.querySelectorAll(".task input").forEach(function (cb) { cb.checked = isDone(cb.closest(".task").getAttribute("data-id")); });
        refreshHome(true);
      };
    }
  }

  var homeFacts = [], hideDone = false;
  function factsText() {
    var n = allTasks.filter(function (t) { return isDone(t.id); }).length;
    return "Пройдено " + n + " из " + allTasks.length + " задач" + (homeFacts.length ? " · " + homeFacts.join(" · ") : "");
  }
  function refreshHome(animate) {
    var root = document.getElementById("plan"); if (!root) return;
    var f = document.querySelector("#status .facts"); if (f) f.textContent = factsText();
    document.querySelectorAll("#status .bar i[data-id]").forEach(function (i) {
      var id = i.getAttribute("data-id");
      i.className = isDone(id) ? "done" : id === P.current ? "cur" : "";
    });
    root.querySelectorAll(".task").forEach(function (li) { li.classList.toggle("is-done", isDone(li.getAttribute("data-id"))); });
    chapters.forEach(function (c) {
      var art = root.querySelector('[data-ch="' + c.n + '"]'); if (!art) return;
      var n = c.tasks.filter(function (t) { return isDone(t.id); }).length;
      art.classList.toggle("all-done", n === c.tasks.length);
      art.querySelector(".ch-meta").textContent = [c.dates, n + " из " + c.tasks.length].filter(Boolean).join(" · ");
    });
    applyHide(animate);
  }
  // Плавно свернуть или развернуть элемент списка
  function setShown(node, shown, animate) {
    if (node._anim) { node._anim.cancel(); node._anim = null; }
    var hidden = node.classList.contains("gone");
    if (shown === !hidden) return;
    if (!animate || REDUCED.matches || !node.animate) { node.classList.toggle("gone", !shown); return; }
    node.classList.remove("gone");
    var cs = getComputedStyle(node);
    var full = { height: node.offsetHeight + "px", opacity: 1, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: cs.marginTop };
    var zero = { height: "0px", opacity: 0, paddingTop: "0px", paddingBottom: "0px", marginTop: "0px" };
    node.style.overflow = "hidden";
    var a = node._anim = node.animate(shown ? [zero, full] : [full, zero], { duration: DUR, easing: EASE });
    a.onfinish = function () { node.style.overflow = ""; node._anim = null; if (!shown) node.classList.add("gone"); };
  }
  function applyHide(animate) {
    var root = document.getElementById("plan"); if (!root) return;
    root.querySelectorAll(".chapter").forEach(function (art) {
      var chHide = hideDone && art.classList.contains("all-done");
      setShown(art, !chHide, animate);
      art.querySelectorAll(".task").forEach(function (li) {
        setShown(li, !(hideDone && li.classList.contains("is-done")), animate && !chHide);
      });
    });
  }

  /* ---------- конспект: крошки и режим ---------- */
  function crumbs() {
    var box = document.querySelector(".crumbs"), here = byId[PAGE_TASK];
    if (!box || !here) return;
    var c = here.chapter;
    box.appendChild(el("ol", {}, [
      el("li", {}, [el("a", { href: ROOT + "index.html", text: "Главная" })]),
      el("li", {}, [el("a", { href: ROOT + "index.html#ch" + c.n, text: "Глава " + c.n + ". " + c.title })]),
      el("li", {}, [el("span", { "aria-current": "page", text: here.id + " " + here.title })])
    ]));
    var meta = document.querySelector(".note-meta"), m = MODES[here.mode];
    if (meta) meta.insertBefore(el("span", {}, [el("strong", { text: "Режим:" }), " ", el("span", { class: "ico", text: m[0] }), m[1] + ". "]), meta.firstChild);
  }

  /* ---------- содержание слева ---------- */
  function headings() {
    var b = document.querySelector(".note-body"); if (!b) return [];
    var hs = [].slice.call(b.querySelectorAll("h2, h3"));
    hs.forEach(function (h) {
      if (h.tagName !== "H2") return;
      var m = h.textContent.match(/^(\d+)\.\s+/);
      if (m) {
        h.setAttribute("data-num", m[1]);
        h.innerHTML = h.innerHTML.replace(/^(\d+)\.\s+/, '<span class="h-num">$1. </span>');
      }
    });
    return hs;
  }

  function tocOpen() {
    return NARROW.matches ? body.classList.contains("toc-open") : !body.classList.contains("toc-closed");
  }
  function paintTocBtn() { if (tocBtn) tocBtn.setAttribute("aria-expanded", tocOpen()); }
  function toggleToc(force) {
    var open = force == null ? !tocOpen() : force;
    if (NARROW.matches) body.classList.toggle("toc-open", open);
    else { body.classList.toggle("toc-closed", !open); set("c1.toc", open ? "open" : "closed"); }
    paintTocBtn();
  }

  function toc(hs) {
    var box = document.getElementById("toc"); if (!box) return;
    if (!hs.length) {   // короткая страница без разделов — содержание не нужно
      body.classList.add("no-toc"); html.classList.remove("pre-toc-closed");
      if (tocBtn) tocBtn.hidden = true;
      return;
    }
    var close = el("button", { class: "toc-close", type: "button", text: "Скрыть ←" });
    close.onclick = function () { toggleToc(false); };
    var inner = el("div", { class: "toc-inner" });
    box.appendChild(inner);
    inner.appendChild(el("div", { class: "toc-head" }, [el("h2", { text: "Содержание" }), close]));
    var ol = el("ol"), links = [];
    hs.forEach(function (h) {
      var a = el("a", { href: "#" + h.id, text: h.textContent.replace(/\s+—\s+\S+$/, "") });
      links.push(a);
      ol.appendChild(el("li", { class: h.tagName === "H3" ? "l3" : "l2" }, [a]));
    });
    inner.appendChild(ol);
    box.addEventListener("click", function (e) { if (e.target.closest("a") && NARROW.matches) toggleToc(false); });

    var scrim = el("div", { class: "scrim" });
    scrim.onclick = function () { toggleToc(false); };
    body.appendChild(scrim);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && body.classList.contains("toc-open")) toggleToc(false); });

    if (get("c1.toc") === "closed") body.classList.add("toc-closed");
    html.classList.remove("pre-toc-closed");
    NARROW.addEventListener ? NARROW.addEventListener("change", paintTocBtn) : NARROW.addListener(paintTocBtn);
    paintTocBtn();

    var ticking = false;
    function spy() {
      ticking = false;
      var cur = 0;
      hs.forEach(function (h, i) { if (h.getBoundingClientRect().top < 100) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle("on", i === cur); });
      var on = links[cur];
      if (on && tocOpen() && !NARROW.matches) {
        var r = on.getBoundingClientRect(), br = box.getBoundingClientRect();
        if (r.top < br.top + 40 || r.bottom > br.bottom - 20) box.scrollBy({ top: r.top - br.top - br.height / 3, behavior: REDUCED.matches ? "auto" : "smooth" });
      }
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
  }

  /* ---------- низ: пройдено и соседние конспекты ---------- */
  function foot() {
    var f = document.querySelector(".note-foot"), here = byId[PAGE_TASK]; if (!f || !here) return;
    var btn = el("button", { class: "done-btn", type: "button" });
    function paint() {
      var v = isDone(here.id);
      btn.setAttribute("aria-pressed", v);
      btn.textContent = v ? "✓ Пройдено" : "Отметить как пройдено";
    }
    btn.onclick = function () { setDone(here.id, !isDone(here.id)); paint(); };
    paint(); f.appendChild(btn);
    var withPage = allTasks.filter(function (t) { return t.page; });
    var i = withPage.indexOf(here), pg = el("nav", { class: "pager", "aria-label": "Соседние конспекты" });
    var prev = withPage[i - 1], next = withPage[i + 1];
    if (prev) pg.appendChild(el("a", { class: "prev", href: href(prev) }, [el("span", { text: "← Предыдущий" }), el("strong", { text: prev.id + " " + prev.title })]));
    if (next) pg.appendChild(el("a", { class: "next", href: href(next) }, [el("span", { text: "Следующий →" }), el("strong", { text: next.id + " " + next.title })]));
    if (!prev && !next) pg.appendChild(el("p", { text: "Других конспектов пока нет." }));
    f.appendChild(pg);
  }

  /* ---------- таблицы: горизонтальная прокрутка на узком экране ---------- */
  function tables() {
    document.querySelectorAll(".note-body table").forEach(function (t) {
      var w = el("div", { class: "table-wrap" });
      t.parentNode.insertBefore(w, t); w.appendChild(t);
    });
  }

  /* ---------- код: подсветка 1С и копирование ---------- */
  var KW = ("процедура конецпроцедуры функция конецфункции если тогда иначеесли иначе конецесли для каждого из по цикл конеццикла пока " +
    "возврат продолжить прервать новый попытка исключение конецпопытки вызватьисключение перем экспорт знач истина ложь неопределено и или не " +
    "выбрать разрешенные различные первые как где между сгруппировать упорядочить итоги имеющие объединить все поместить уничтожить индексировать " +
    "левое правое полное внутреннее соединение выбор когда конец есть null естьnull сумма количество максимум минимум среднее возр убыв в иерархии подобно значение тип ссылка " +
    "procedure endprocedure function endfunction if then elsif else endif for each in to do enddo while return continue break new try except endtry raise var export val true false undefined and or not").split(" ");
  var KWS = {}; KW.forEach(function (k) { KWS[k] = 1; });
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function paintBsl(src) {
    var re = /(\/\/[^\n]*)|("(?:[^"\n]|"")*"?|\|[^\n]*)|(&[A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё]*)|(#[A-Za-zА-Яа-яЁё]+[^\n]*|&На[А-Яа-яЁё]+)|([A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё]*)|(\d+(?:\.\d+)?)/g;
    var out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index)); last = re.lastIndex;
      var t = esc(m[0]);
      if (m[1]) out += '<span class="c">' + t + "</span>";
      else if (m[2]) out += '<span class="s">' + t + "</span>";
      else if (m[3]) out += (/^&На[А-Я]/.test(m[0]) ? '<span class="d">' : '<span class="p">') + t + "</span>";
      else if (m[4]) out += '<span class="d">' + t + "</span>";
      else if (m[5]) out += KWS[m[5].toLowerCase()] ? '<span class="k">' + t + "</span>" : t;
      else out += '<span class="n">' + t + "</span>";
    }
    return out + esc(src.slice(last));
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return copyOld(text); });
    }
    return copyOld(text);
  }
  function copyOld(text) {
    return new Promise(function (ok, fail) {
      var ta = el("textarea", { readonly: "", style: "position:fixed;left:-9999px;top:0" });
      ta.value = text; body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? ok() : fail(); } catch (e) { fail(e); }
      body.removeChild(ta);
    });
  }
  function code() {
    document.querySelectorAll(".note-body pre").forEach(function (pre) {
      var c = pre.querySelector("code"); if (!c) return;
      var isBsl = /language-(bsl|1c)/.test(c.className);
      var src = c.textContent.replace(/\n$/, "");
      if (isBsl) c.innerHTML = paintBsl(src);
      var wrap = el("div", { class: "code" + (isBsl ? " has-copy" : "") });
      pre.parentNode.insertBefore(wrap, pre); wrap.appendChild(pre);
      if (!isBsl) return;
      var b = el("button", { class: "copy-btn", type: "button", text: "Копировать" });
      b.onclick = function () {
        copyText(src).then(function () {
          b.textContent = "Скопировано ✓"; b.classList.add("ok");
          setTimeout(function () { b.textContent = "Копировать"; b.classList.remove("ok"); }, 1600);
        }, function () { b.textContent = "Не вышло"; });
      };
      wrap.appendChild(el("div", { class: "code-bar" }, [el("span", { text: "1С" }), b]));
    });
  }

  /* ---------- просмотр скринов: зум + листание ---------- */
  // Скрины страницы — одна галерея; каждый PDF — своя галерея из картинок страниц
  function lightbox() {
    var groups = {}, order = [];
    document.querySelectorAll(".note-body figure.shot, .note-body figure.page").forEach(function (f) {
      var box = f.closest("[data-gallery]"), key = box ? box.getAttribute("data-gallery") : "shots";
      if (!groups[key]) { groups[key] = { figs: [], box: box }; order.push(key); }
      groups[key].figs.push(f);
    });
    order.forEach(function (k) { gallery(groups[k].figs, k === "shots", groups[k].box); });
  }

  function gallery(figs, isShots, box) {
    var items = figs.map(function (f, i) {
      var img = f.querySelector("img"), cap = f.querySelector("figcaption");
      if (cap && isShots) cap.setAttribute("data-n", "Скрин " + (i + 1));
      var text = isShots ? (cap && cap.textContent.trim()) || "Скрин " + (i + 1) : img.alt;
      return { src: img.getAttribute("src"), cap: text, img: img };
    });

    var lb = el("div", { class: "lb", role: "dialog", "aria-modal": "true", "aria-label": isShots ? "Просмотр скрина" : "Просмотр PDF" });
    var lbOpen = false, zoomT = 0;
    var count = el("span", { class: "lb-count" }), cap = el("span", { class: "lb-cap" });
    var zOut = el("button", { class: "lb-btn lb-z", "aria-label": "Уменьшить", text: "−" });
    var zVal = el("span", { class: "lb-zoomval" });
    var zIn = el("button", { class: "lb-btn lb-z", "aria-label": "Увеличить", text: "+" });
    var zFit = el("button", { class: "lb-btn", text: "Целиком" });
    var z100 = el("button", { class: "lb-btn lb-z", text: "1:1" });
    var close = el("button", { class: "lb-btn lb-close", "aria-label": "Закрыть", text: "✕" });
    var stage = el("div", { class: "lb-stage" });
    var pic = el("img", { alt: "" });
    var slide = el("div", { class: "lb-slide" }, [pic]);
    var prev = el("button", { class: "lb-nav lb-prev", "aria-label": isShots ? "Предыдущий скрин" : "Предыдущая страница", text: "‹" });
    var next = el("button", { class: "lb-nav lb-next", "aria-label": isShots ? "Следующий скрин" : "Следующая страница", text: "›" });
    var thumbs = el("div", { class: "lb-thumbs" });
    stage.appendChild(slide); stage.appendChild(prev); stage.appendChild(next);
    lb.appendChild(el("div", { class: "lb-top" }, [count, cap, zOut, zVal, zIn, zFit, z100, close]));
    lb.appendChild(stage);
    lb.appendChild(el("div", {}, [thumbs, el("div", { class: "lb-hint", text: "Колесо или щипок — масштаб · двойной клик — приблизить · тяни, чтобы двигать · ← → листать · Esc закрыть" })]));
    body.appendChild(lb);

    items.forEach(function (it, i) {
      var b = el("button", { "aria-label": (isShots ? "Скрин " : "Страница ") + (i + 1) + ": " + it.cap }, [el("img", { src: it.src, alt: "", loading: "lazy" })]);
      b.onclick = function () { show(i); };
      thumbs.appendChild(b);
    });

    var idx = 0, s = 1, fit = 1, tx = 0, ty = 0, nw = 0, nh = 0, lastFocus = null;
    function apply() {
      var W = stage.clientWidth, H = stage.clientHeight, w = nw * s, h = nh * s;
      tx = w <= W ? (W - w) / 2 : Math.min(0, Math.max(W - w, tx));
      ty = h <= H ? (H - h) / 2 : Math.min(0, Math.max(H - h, ty));
      pic.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
      zVal.textContent = Math.round(s * 100) + "%";
    }
    function fitNow() {
      var pad = NARROW.matches ? 8 : 24;
      fit = Math.min((stage.clientWidth - pad) / nw, (stage.clientHeight - pad) / nh, 1); s = fit; tx = 0; ty = 0; apply();
    }
    function zoomAt(ns, cx, cy) {
      ns = Math.max(fit, Math.min(4, ns));
      tx = cx - (cx - tx) * (ns / s); ty = cy - (cy - ty) * (ns / s); s = ns; apply();
    }
    function center() { return [stage.clientWidth / 2, stage.clientHeight / 2]; }
    // плавный масштаб для кнопок и двойного клика; колесо, щипок и перетаскивание — без задержки
    function smooth(fn) {
      return function () {
        pic.classList.add("zoom-anim");
        fn.apply(null, arguments);
        clearTimeout(zoomT); zoomT = setTimeout(function () { pic.classList.remove("zoom-anim"); }, DUR + 20);
      };
    }
    function instant() { clearTimeout(zoomT); pic.classList.remove("zoom-anim"); }
    function show(i, dir) {
      if (dir == null) dir = i > idx ? 1 : i < idx ? -1 : 0;
      instant();
      idx = (i + items.length) % items.length;
      if (dir && lbOpen) anim(slide, [{ opacity: 0, transform: "translateX(" + (dir * 48) + "px)" }, { opacity: 1, transform: "none" }]);
      var it = items[idx];
      count.textContent = (idx + 1) + " / " + items.length;
      cap.textContent = it.cap;
      pic.onload = function () { nw = pic.naturalWidth; nh = pic.naturalHeight; fitNow(); };
      pic.src = it.src; pic.alt = it.cap;
      if (pic.complete && pic.naturalWidth) pic.onload();
      [].forEach.call(thumbs.children, function (b, j) { b.classList.toggle("on", j === idx); });
      var on = thumbs.children[idx]; if (on) on.scrollIntoView({ block: "nearest", inline: "center", behavior: lbOpen && !REDUCED.matches ? "smooth" : "auto" });
      prev.hidden = next.hidden = items.length < 2;
      [idx - 1, idx + 1].forEach(function (j) { new Image().src = items[(j + items.length) % items.length].src; });
    }
    function open(i) {
      lastFocus = document.activeElement;
      body.style.overflow = "hidden"; lb.classList.add("open"); show(i, 0); lbOpen = true; close.focus({ preventScroll: true });
    }
    function shut() {
      lbOpen = false; lb.classList.remove("open"); body.style.overflow = "";
      items[idx].img.scrollIntoView({ block: "center", inline: "nearest" });
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }

    items.forEach(function (it, i) {
      it.img.setAttribute("tabindex", "0");
      it.img.setAttribute("role", "button");
      it.img.addEventListener("click", function () { open(i); });
      it.img.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); } });
    });
    if (box) { var ob = box.querySelector(".pdf-open"); if (ob) ob.onclick = function () { open(0); }; }
    prev.onclick = function () { show(idx - 1, -1); };
    next.onclick = function () { show(idx + 1, 1); };
    close.onclick = shut;
    zIn.onclick = smooth(function () { var c = center(); zoomAt(s * 1.4, c[0], c[1]); });
    zOut.onclick = smooth(function () { var c = center(); zoomAt(s / 1.4, c[0], c[1]); });
    zFit.onclick = smooth(fitNow);
    z100.onclick = smooth(function () { var c = center(); zoomAt(1, c[0], c[1]); });
    window.addEventListener("resize", function () { if (lbOpen) fitNow(); });

    document.addEventListener("keydown", function (e) {
      if (!lbOpen) return;
      if (e.key === "Escape") shut();
      else if (e.key === "ArrowLeft") show(idx - 1, -1);
      else if (e.key === "ArrowRight") show(idx + 1, 1);
      else if (e.key === "+" || e.key === "=") zIn.onclick();
      else if (e.key === "-") zOut.onclick();
      else if (e.key === "0") zFit.onclick();
      else if (e.key === "Tab") {
        var f = [].slice.call(lb.querySelectorAll("button")).filter(function (b) { return b.offsetParent; });
        var a = f.indexOf(document.activeElement);
        if (e.shiftKey && a <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && a === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });

    stage.addEventListener("wheel", function (e) {
      e.preventDefault(); instant();
      var r = stage.getBoundingClientRect();
      zoomAt(s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    var lastTap = 0;
    var toggleZoom = smooth(function (x, y) {
      var r = stage.getBoundingClientRect();
      if (s > fit * 1.05) fitNow(); else zoomAt(Math.max(1, fit * 2.5), x - r.left, y - r.top);
    });
    var ptrs = {}, start = null, pinch = null;
    stage.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".lb-nav")) return;
      stage.setPointerCapture(e.pointerId); instant();
      ptrs[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(ptrs);
      if (ids.length === 1) { start = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, t: Date.now() }; stage.classList.add("dragging"); }
      if (ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], r = stage.getBoundingClientRect();
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: s, cx: (a[0] + b[0]) / 2 - r.left, cy: (a[1] + b[1]) / 2 - r.top };
        start = null;
      }
    });
    stage.addEventListener("pointermove", function (e) {
      if (!ptrs[e.pointerId]) return;
      ptrs[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(ptrs);
      if (pinch && ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]];
        zoomAt(pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d, pinch.cx, pinch.cy);
      } else if (start && s > fit * 1.01) {
        tx = start.tx + (e.clientX - start.x); ty = start.ty + (e.clientY - start.y); apply();
      }
    });
    function up(e) {
      if (!ptrs[e.pointerId]) return;
      delete ptrs[e.pointerId];
      if (start) {
        var dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
          var now = Date.now();
          if (now - lastTap < 320) { lastTap = 0; toggleZoom(e.clientX, e.clientY); } else lastTap = now;
        } else if (s <= fit * 1.01 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && Date.now() - start.t < 700) {
          show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        }
      }
      if (Object.keys(ptrs).length < 2) pinch = null;
      if (!Object.keys(ptrs).length) { start = null; stage.classList.remove("dragging"); }
    }
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
  }

  topbar();
  home();
  crumbs();
  toc(headings());
  foot();
  tables();
  code();
  lightbox();
  requestAnimationFrame(function () { requestAnimationFrame(function () { html.classList.remove("no-anim"); }); });
})();
