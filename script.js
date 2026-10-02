(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- Nav: theme follows the section underneath ---------- */
  const nav = $("#nav");
  const zones = $$("[data-nav]");
  let navTick = false;
  const updateNav = () => {
    navTick = false;
    const nr = nav.getBoundingClientRect();
    const probe = nr.top + nr.height / 2;
    let theme = "dark";
    for (const z of zones) {
      const r = z.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { theme = z.dataset.nav; break; }
    }
    if (theme === "hero" && nr.top <= 0 && window.scrollY > 140) theme = "veil";
    if (nav.dataset.theme !== theme) nav.dataset.theme = theme;
  };
  const queueNav = () => { if (!navTick) { navTick = true; requestAnimationFrame(updateNav); } };
  window.addEventListener("scroll", queueNav, { passive: true });
  window.addEventListener("resize", queueNav);
  updateNav();

  /* ---------- Mobile menu ---------- */
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  const setMenu = (open) => {
    nav.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("menu-open")));
  links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("menu-open")) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia("(min-width: 960px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = $$(".split-text, .split-visual, .statement, .stats, .ruled, .step, .wc, .app, .trio-item, .cmp-wrap, .role, .faq-head, .faq-list, .cta-inner");
  if (motionOK && "IntersectionObserver" in window) {
    revealTargets.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    revealTargets.forEach((el) => io.observe(el));
  }

  /* ---------- Access forms ---------- */
  $$("[data-access-form]").forEach((form) => {
    const input = $("input", form);
    input.addEventListener("input", () => { form.classList.remove("is-invalid"); input.removeAttribute("aria-invalid"); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      if (!ok) {
        form.classList.add("is-invalid");
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      // TODO: wire to form backend
      const done = document.createElement("p");
      done.className = "thanks";
      done.setAttribute("role", "status");
      done.innerHTML = '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 10.4l2.6 2.5L14 7.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Thank you. We’ll be in touch.</span>';
      form.replaceWith(done);
    });
  });

  /* ---------- Accordions ---------- */
  const accHandlers = {};
  const accApi = {};
  $$(".acc").forEach((acc) => {
    const items = $$(".acc-item", acc);
    const name = acc.dataset.acc;
    let timer = null;
    const open = (idx) => {
      items.forEach((it, i) => {
        const on = i === idx;
        it.classList.toggle("is-open", on);
        $(".acc-btn", it).setAttribute("aria-expanded", String(on));
      });
      if (accHandlers[name]) accHandlers[name](idx, items[idx]);
    };
    const stopAuto = () => { if (timer) { clearInterval(timer); timer = null; } acc.dataset.touched = "1"; };
    items.forEach((it, i) => $(".acc-btn", it).addEventListener("click", () => { stopAuto(); open(i); }));
    accApi[name] = { open, stopAuto };

    if (acc.hasAttribute("data-auto") && motionOK && "IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        if (acc.dataset.touched) return;
        if (e.isIntersecting && !timer) {
          timer = setInterval(() => {
            const cur = items.findIndex((it) => it.classList.contains("is-open"));
            open((cur + 1) % items.length);
          }, 5200);
        } else if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
      }, { threshold: 0.4 }).observe(acc);
    }
  });

  /* ---------- Problem: the 168-hour grid ---------- */
  const wk = $("#weekGrid");
  if (wk) {
    const cells = $("#wkCells");
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const frag = document.createDocumentFragment();
    days.forEach((d, di) => {
      const label = document.createElement("span");
      label.textContent = d;
      frag.appendChild(label);
      for (let h = 0; h < 24; h++) {
        const c = document.createElement("i");
        const desk = di <= 4 && h >= 9 && h < 17;
        const wkend = (di === 4 && h >= 17) || di >= 5 || (di === 0 && h < 9);
        const cls = [];
        if (desk) cls.push("desk"); else if (wkend) cls.push("wkend"); else cls.push("night");
        if ((di === 2 && h === 10) || (di === 4 && h === 9)) cls.push("pay");
        c.className = cls.join(" ");
        c.style.setProperty("--c", h + di * 2);
        frag.appendChild(c);
      }
    });
    cells.appendChild(frag);

    const modes = [
      { mode: "overnight", hours: "64", cap: "Monday to Friday, 17:00 to 09:00" },
      { mode: "weekend", hours: "64", cap: "Friday 17:00 to Monday 09:00" },
      { mode: "runs", hours: "128", cap: "Every hour outside the desk, while cash waits for Wednesday’s supplier run and Friday’s payroll" },
    ];
    accHandlers.problem = (idx) => {
      const m = modes[idx];
      wk.dataset.mode = m.mode;
      $("#wkHours").textContent = m.hours;
      $("#wkCaption").textContent = m.cap;
    };
  }

  /* ---------- Policy: accordion and card stay in step ---------- */
  const polRows = $$(".pol-row");
  accHandlers.policy = (idx) => polRows.forEach((r, i) => r.classList.toggle("is-on", i === idx));
  polRows.forEach((r, i) => r.addEventListener("click", () => { accApi.policy.stopAuto(); accApi.policy.open(i); }));

  /* ---------- Controls: pause switch ---------- */
  const sw = $("#pauseSwitch");
  if (sw) {
    sw.addEventListener("click", () => {
      const active = sw.getAttribute("aria-checked") !== "true";
      sw.setAttribute("aria-checked", String(active));
      sw.setAttribute("aria-label", active ? "Agent active. Toggle to pause the agent in this demo." : "Agent paused. Toggle to resume the agent in this demo.");
      $("#pauseState").textContent = active ? "Agent active" : "Agent paused";
      $("#pauseHint").textContent = active ? "Try it. One switch stops everything." : "Nothing moves. Positions stay where they are.";
    });
  }

  /* ---------- A week of cash ---------- */
  const plot = $("#wcPlot");
  if (plot) {
    const HOURS = 168, YMAX = 9, RAMP = 0.75, FLOOR = 1.5;
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const EVENTS = [
      { t: 11, bank: 1.4, funds: 0 },        // Mon 11:00 customer receipts
      { t: 17.5, bank: -1.4, funds: 1.4 },   // Mon 17:30 sweep
      { t: 54.5, bank: 2.1, funds: -2.1 },   // Wed 06:30 return
      { t: 58, bank: -2.1, funds: 0 },       // Wed 10:00 supplier run
      { t: 85, bank: 0.9, funds: 0 },        // Thu 13:00 receipts
      { t: 89.5, bank: -0.9, funds: 0.9 },   // Thu 17:30 sweep
      { t: 101.75, bank: 1.8, funds: -1.8 }, // Fri 05:45 return
      { t: 105, bank: -1.8, funds: 0 },      // Fri 09:00 payroll
      { t: 111.5, bank: 2.6, funds: 0 },     // Fri 15:30 receipts
      { t: 113.75, bank: -2.6, funds: 2.6 }, // Fri 17:45 sweep
      { t: 130, bank: 0.4, funds: 0 },       // Sat 10:00 weekend receipts
      { t: 131.5, bank: -0.4, funds: 0.4 },  // Sat 11:30 sweep
    ];
    const STATUS = [
      [0, "The floor is held at the bank. Everything above it is at work."],
      [11, "Customer receipts arrive. $1.4M now sits above the floor."],
      [17.5, "The day’s payments are done. $1.4M goes to work overnight."],
      [54.5, "Returned $2.1M ahead of the 10:00 supplier run."],
      [58, "Supplier run paid in full. The floor is untouched."],
      [85, "More receipts arrive. $0.9M sits above the floor."],
      [89.5, "Swept $0.9M into funds for the night."],
      [101.75, "Returned $1.8M for payroll, more than three hours early."],
      [105, "Payroll paid on time."],
      [111.5, "Friday receipts arrive. $2.6M sits above the floor."],
      [113.75, "Swept $2.6M to work through the weekend."],
      [130, "Saturday receipts arrive. $0.4M above the floor."],
      [131.5, "Weekend receipts swept the same morning. Nothing waits for Monday."],
    ];
    const PAYMENTS = [{ t: 58, label: "Supplier run", short: "Suppliers" }, { t: 105, label: "Payroll", short: "Payroll" }];

    // breakpoints [t, bank, funds]
    const pts = [[0, FLOOR, 5.2]];
    { let b = FLOOR, f = 5.2;
      for (const e of EVENTS) { pts.push([e.t, b, f]); b += e.bank; f += e.funds; pts.push([e.t + RAMP, b, f]); }
      pts.push([HOURS, b, f]); }
    const stateAt = (t) => {
      for (let i = 1; i < pts.length; i++) {
        if (t <= pts[i][0]) {
          const a = pts[i - 1], c = pts[i];
          const k = c[0] === a[0] ? 1 : (t - a[0]) / (c[0] - a[0]);
          const s = k * k * (3 - 2 * k);
          return { bank: a[1] + (c[1] - a[1]) * s, funds: a[2] + (c[2] - a[2]) * s };
        }
      }
      const l = pts[pts.length - 1];
      return { bank: l[1], funds: l[2] };
    };

    const elTime = $("#wcTime"), elStatus = $("#wcStatus"), elBank = $("#wcBank"), elFunds = $("#wcFunds");
    const range = $("#wcRange"), playBtn = $("#wcPlay"), logItems = $$("#wcLog li");
    const money = (m) => "$" + (Math.round(m * 100) * 10000).toLocaleString("en-US");
    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    };

    let geo = null, head = null, t = 0, playing = false, raf = 0, last = 0, hold = 0, userPaused = false, inView = false;

    const draw = () => {
      const W = Math.max(240, Math.round(plot.clientWidth));
      const small = W < 520;
      const H = small ? 236 : Math.round(Math.min(330, W * 0.5));
      const pad = { l: small ? 0 : 42, r: small ? 0 : 4, t: 34, b: 28 };
      const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
      const x = (tt) => pad.l + (tt / HOURS) * pw;
      const y = (v) => pad.t + (1 - v / YMAX) * ph;
      geo = { x, y, pad, pw, ph, W, H };

      plot.textContent = "";
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, "aria-hidden": "true" }, plot);
      const defs = el("defs", {}, svg);
      const g1 = el("linearGradient", { id: "wc-funds", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el("stop", { offset: 0, "stop-color": "#cdddff", "stop-opacity": 0.5 }, g1);
      el("stop", { offset: 1, "stop-color": "#cdddff", "stop-opacity": 0.1 }, g1);
      const clip = el("clipPath", { id: "wc-clip" }, defs);
      el("rect", { x: pad.l, y: pad.t, width: pw, height: ph, rx: 6 }, clip);

      // plot background and night bands (18:00 to 06:00)
      el("rect", { x: pad.l, y: pad.t, width: pw, height: ph, rx: 6, fill: "#262735" }, svg);
      const bands = el("g", { "clip-path": "url(#wc-clip)", fill: "#14141d", opacity: 0.62 }, svg);
      for (let d = -1; d < 7; d++) {
        const a = Math.max(0, d * 24 + 18), b = Math.min(HOURS, d * 24 + 30);
        el("rect", { x: x(a), y: pad.t, width: x(b) - x(a), height: ph }, bands);
      }

      // gridlines and y labels
      for (const v of [3, 6, 9]) {
        if (v < YMAX) el("line", { x1: pad.l, x2: pad.l + pw, y1: y(v), y2: y(v), stroke: "#ededf3", "stroke-opacity": 0.07 }, svg);
        if (!small) { const tx = el("text", { x: pad.l - 10, y: y(v) + 4, "text-anchor": "end" }, svg); tx.textContent = `$${v}M`; }
      }
      if (!small) { const t0 = el("text", { x: pad.l - 10, y: y(0) + 1, "text-anchor": "end" }, svg); t0.textContent = "$0"; }

      // stacked areas: bank at the bottom, funds on top
      const top = pts.map((p) => `${x(p[0]).toFixed(1)} ${y(p[1] + p[2]).toFixed(1)}`);
      const mid = pts.map((p) => `${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`);
      const g = el("g", { "clip-path": "url(#wc-clip)" }, svg);
      el("path", { d: `M${top.join("L")}L${[...mid].reverse().join("L")}Z`, fill: "url(#wc-funds)" }, g);
      el("path", { d: `M${mid.join("L")}L${x(HOURS)} ${y(0)}L${x(0)} ${y(0)}Z`, fill: "#7f83a6", "fill-opacity": 0.42 }, g);
      el("path", { d: `M${top.join("L")}`, fill: "none", stroke: "#cdddff", "stroke-width": 2, "stroke-linejoin": "round" }, g);
      el("path", { d: `M${mid.join("L")}`, fill: "none", stroke: "#a9adcb", "stroke-width": 1.5, "stroke-linejoin": "round" }, g);

      // floor
      el("line", { x1: pad.l, x2: pad.l + pw, y1: y(FLOOR), y2: y(FLOOR), stroke: "#ededf3", "stroke-opacity": 0.55, "stroke-dasharray": "2 5" }, svg);
      const fl = el("text", { x: pad.l + pw - 8, y: y(FLOOR) + 16, "text-anchor": "end" }, svg);
      fl.textContent = small ? "Floor $1.5M" : "Minimum operating balance $1.5M";
      fl.setAttribute("fill", "#c3c3cc");

      // payment runs
      for (const p of PAYMENTS) {
        const px = x(p.t);
        el("line", { x1: px, x2: px, y1: pad.t, y2: pad.t + ph, stroke: "#ededf3", "stroke-opacity": 0.5, "stroke-dasharray": "3 4" }, svg);
        el("rect", { x: px - 4, y: pad.t - 4, width: 8, height: 8, transform: `rotate(45 ${px} ${pad.t})`, fill: "#ededf3" }, svg);
        const lb = el("text", { x: px, y: pad.t - 14, "text-anchor": "middle", class: "ev" }, svg);
        lb.textContent = small ? p.short : p.label;
      }

      // day labels
      const names = small ? ["M", "T", "W", "T", "F", "S", "S"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      names.forEach((n, i) => {
        const tx = el("text", { x: x(i * 24 + 12), y: H - 8, "text-anchor": "middle" }, svg);
        tx.textContent = n;
        if (i > 0) el("line", { x1: x(i * 24), x2: x(i * 24), y1: pad.t + ph, y2: pad.t + ph + 5, stroke: "#ededf3", "stroke-opacity": 0.25 }, svg);
      });

      // playhead
      head = el("g", {}, svg);
      head.line = el("line", { y1: pad.t, y2: pad.t + ph, stroke: "#ffffff", "stroke-opacity": 0.85 }, head);
      head.halo = el("circle", { r: 9, fill: "#cdddff", "fill-opacity": 0.22 }, head);
      head.top = el("circle", { r: 4.5, fill: "#ffffff" }, head);
      head.mid = el("circle", { r: 3.5, fill: "#1e1e2a", stroke: "#c8cbe2", "stroke-width": 1.5 }, head);
      render();
    };

    const render = () => {
      const s = stateAt(t);
      if (head && geo) {
        const px = geo.x(t);
        head.line.setAttribute("x1", px); head.line.setAttribute("x2", px);
        head.top.setAttribute("cx", px); head.top.setAttribute("cy", geo.y(s.bank + s.funds));
        head.halo.setAttribute("cx", px); head.halo.setAttribute("cy", geo.y(s.bank + s.funds));
        head.mid.setAttribute("cx", px); head.mid.setAttribute("cy", geo.y(s.bank));
      }
      const q = Math.min(HOURS - 0.25, Math.floor(t * 4) / 4);
      const day = DAYS[Math.min(6, Math.floor(q / 24))];
      const hh = Math.floor(q % 24), mm = Math.round((q % 1) * 60);
      const label = `${day} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      if (elTime.textContent !== label) elTime.textContent = label;
      const bank = money(s.bank), funds = money(s.funds);
      if (elBank.textContent !== bank) elBank.textContent = bank;
      if (elFunds.textContent !== funds) elFunds.textContent = funds;
      let st = STATUS[0][1];
      for (const row of STATUS) if (t >= row[0]) st = row[1];
      if (elStatus.textContent !== st) elStatus.textContent = st;
      let now = -1;
      logItems.forEach((li, i) => { if (t >= parseFloat($("button", li).dataset.t)) now = i; });
      logItems.forEach((li, i) => { li.classList.toggle("is-now", i === now); li.classList.toggle("is-past", i < now); });
      range.value = t;
      range.style.setProperty("--p", `${(t / HOURS) * 100}%`);
      range.setAttribute("aria-valuetext", `${label}. ${bank} at the bank, ${funds} in funds.`);
    };

    const setT = (v) => { t = Math.max(0, Math.min(HOURS, v)); render(); };
    const frame = (now) => {
      if (!playing) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (hold > 0) { hold -= dt; if (hold <= 0) setT(0); }
      else { setT(t + dt * (HOURS / 32)); if (t >= HOURS) hold = 1.8; }
      raf = requestAnimationFrame(frame);
    };
    const play = () => {
      if (playing) return;
      if (t >= HOURS) t = 0;
      playing = true; hold = 0; last = performance.now();
      playBtn.setAttribute("aria-pressed", "true");
      playBtn.setAttribute("aria-label", "Pause the week");
      raf = requestAnimationFrame(frame);
    };
    const pause = () => {
      playing = false; cancelAnimationFrame(raf);
      playBtn.setAttribute("aria-pressed", "false");
      playBtn.setAttribute("aria-label", "Play the week");
    };

    playBtn.addEventListener("click", () => { if (playing) { userPaused = true; pause(); } else { userPaused = false; play(); } });
    range.addEventListener("input", () => { userPaused = true; pause(); setT(parseFloat(range.value)); });
    logItems.forEach((li) => $("button", li).addEventListener("click", (e) => {
      userPaused = true; pause(); setT(parseFloat(e.currentTarget.dataset.t) + RAMP);
    }));

    // drag across the chart to scrub
    let dragging = false;
    const scrubTo = (clientX) => {
      const r = plot.getBoundingClientRect();
      setT(((clientX - r.left - geo.pad.l) / geo.pw) * HOURS);
    };
    plot.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      dragging = true; userPaused = true; pause();
      try { plot.setPointerCapture(e.pointerId); } catch (_) {}
      scrubTo(e.clientX);
    });
    plot.addEventListener("pointermove", (e) => { if (dragging) scrubTo(e.clientX); });
    const endDrag = () => { dragging = false; };
    plot.addEventListener("pointerup", endDrag);
    plot.addEventListener("pointercancel", endDrag);

    let rw = 0;
    const onResize = () => { const w = Math.round(plot.clientWidth); if (w !== rw) { rw = w; draw(); } };
    if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(plot); else window.addEventListener("resize", onResize);
    if (!motionOK) t = 102.5; // Friday 06:30, payroll funded
    onResize();

    if (motionOK && "IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        inView = e.isIntersecting;
        if (inView && !userPaused) play();
        else if (!inView && playing) pause();
      }, { threshold: 0.35 }).observe($("#weekChart"));
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && playing) pause();
        else if (!document.hidden && inView && !userPaused) play();
      });
    }
  }

  /* ---------- On-ledger: atomic swap ---------- */
  const swapSvg = $("#swapSvg");
  if (swapSvg && motionOK && "IntersectionObserver" in window) {
    const pa = $("#swA"), pb = $("#swB"), da = $("#swDotA"), db = $("#swDotB");
    const rings = $$(".sw-ring", swapSvg);
    const la = pa.getTotalLength(), lb = pb.getTotalLength();
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const CYCLE = 6200;
    let on = false, id = 0;
    const step = (now) => {
      if (!on) return;
      const p = (now % CYCLE) / CYCLE;
      const k = ease(Math.min(1, Math.max(0, (p - 0.06) / 0.78)));
      const a = pa.getPointAtLength(la * k), b = pb.getPointAtLength(lb * k);
      da.setAttribute("cx", a.x); da.setAttribute("cy", a.y);
      db.setAttribute("cx", b.x); db.setAttribute("cy", b.y);
      const fade = p > 0.9 ? (1 - p) / 0.1 : p < 0.06 ? p / 0.06 : 1;
      da.setAttribute("opacity", fade); db.setAttribute("opacity", fade);
      const pulse = Math.exp(-Math.pow((k - 0.5) / 0.09, 2));
      rings.forEach((r, i) => {
        r.setAttribute("r", (i ? 34 : 20) * (0.86 + pulse * 0.3));
        r.setAttribute("stroke-opacity", (i ? 0.16 : 0.34) + pulse * 0.6);
      });
      id = requestAnimationFrame(step);
    };
    new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      cancelAnimationFrame(id);
      if (on) id = requestAnimationFrame(step);
    }, { threshold: 0.15 }).observe(swapSvg);
  }
})();
