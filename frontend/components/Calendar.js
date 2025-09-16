// frontend/components/Calendar.js
import { getEntries, getVents } from "../api.js";

const COLORS = {
  Happy:  "#22c55e",
  Sad:    "#3b82f6",
  Angry:  "#ef4444",
  Worried:"#f59e0b",
  Excited:"#a855f7",
  Calm:   "#94a3b8",
};
const VENT_COLOR = "#64748b"; // neutral gray for vents

export function mountCalendar(host) {
  // state
  let view = startOfMonth(new Date());
  let allEntries = null;
  let allVents = null;

  host.innerHTML = `
    <div class="cal-toolbar">
      <div class="cal-left">
        <button class="btn" id="cal-prev" title="Previous month">‹</button>
        <button class="btn" id="cal-today" title="Jump to today">Today</button>
        <button class="btn" id="cal-next" title="Next month">›</button>
      </div>
      <div class="cal-title" id="cal-title"></div>
      <div class="cal-right">
        <label class="cal-inline">
          Emotion:
          <select id="cal-filter-emotion">
            <option value="">All</option>
            ${Object.keys(COLORS).map(k => `<option value="${k}">${k}</option>`).join("")}
          </select>
        </label>
        <label class="cal-inline">
          <input type="checkbox" id="cal-include-vents" checked />
          Include Vents
        </label>
      </div>
    </div>

    <div class="cal-grid">
      <div class="cal-weekdays">
        ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(w => `<div class="cal-weekday">${w}</div>`).join("")}
      </div>
      <div class="cal-days" id="cal-days"></div>
    </div>

    <div class="cal-detail hidden" id="cal-detail"></div>

    <div class="cal-carousel-overlay hidden" id="cal-carousel">
      <div class="carousel-backdrop"></div>
      <div class="carousel-modal">
        <div class="carousel-header">
          <h3 id="carousel-title">Entries for Day</h3>
          <button class="carousel-close" id="carousel-close">✕</button>
        </div>
        <div class="carousel-content">
          <button class="carousel-nav carousel-prev" id="carousel-prev">‹</button>
          <div class="carousel-viewport">
            <div class="carousel-track" id="carousel-track"></div>
          </div>
          <button class="carousel-nav carousel-next" id="carousel-next">›</button>
        </div>
        <div class="carousel-indicators" id="carousel-indicators"></div>
      </div>
    </div>
  `;

  const elTitle    = host.querySelector("#cal-title");
  const elDays     = host.querySelector("#cal-days");
  const elPrev     = host.querySelector("#cal-prev");
  const elNext     = host.querySelector("#cal-next");
  const elToday    = host.querySelector("#cal-today");
  const elEmo      = host.querySelector("#cal-filter-emotion");
  const elVentsChk = host.querySelector("#cal-include-vents");
  const elDetail   = host.querySelector("#cal-detail");
  
  // Carousel elements
  const elCarousel = host.querySelector("#cal-carousel");
  const elCarouselTitle = host.querySelector("#carousel-title");
  const elCarouselClose = host.querySelector("#carousel-close");
  const elCarouselTrack = host.querySelector("#carousel-track");
  const elCarouselPrev = host.querySelector("#carousel-prev");
  const elCarouselNext = host.querySelector("#carousel-next");
  const elCarouselIndicators = host.querySelector("#carousel-indicators");

  let currentCarouselIndex = 0;
  let carouselEntries = [];

  elPrev.addEventListener("click", () => { view = addMonths(view, -1); render(); });
  elNext.addEventListener("click", () => { view = addMonths(view,  1); render(); });
  elToday.addEventListener("click", () => { view = startOfMonth(new Date()); render(); });
  elEmo.addEventListener("change", render);
  elVentsChk.addEventListener("change", render);

  // Carousel event listeners
  elCarouselClose.addEventListener("click", closeCarousel);
  elCarouselPrev.addEventListener("click", () => navigateCarousel(-1));
  elCarouselNext.addEventListener("click", () => navigateCarousel(1));
  
  // Close on backdrop click
  elCarousel.addEventListener("click", (e) => {
    if (e.target === elCarousel || e.target.classList.contains("carousel-backdrop")) {
      closeCarousel();
    }
  });

  function closeCarousel() {
    elCarousel.classList.add("hidden");
    currentCarouselIndex = 0;
    carouselEntries = [];
  }

  function navigateCarousel(direction) {
    if (carouselEntries.length === 0) return;
    
    currentCarouselIndex += direction;
    if (currentCarouselIndex < 0) currentCarouselIndex = carouselEntries.length - 1;
    if (currentCarouselIndex >= carouselEntries.length) currentCarouselIndex = 0;
    
    updateCarouselView();
  }

  function updateCarouselView() {
    if (carouselEntries.length === 0) return;

    const entry = carouselEntries[currentCarouselIndex];
    const isVent = !entry.label;

    elCarouselTrack.innerHTML = `
      <div class="carousel-card">
        <div class="emotion-badge ${entry.label?.toLowerCase() || 'vent'}" style="background-color: ${isVent ? VENT_COLOR : COLORS[entry.label] || '#e5e7eb'}">
          ${isVent ? 'Vent' : entry.label}
        </div>
        ${!isVent ? `<div class="confidence-display">Confidence: ${Math.round((entry.confidence || 0) * 100)}%</div>` : ''}
        <div class="entry-text">${entry.text || ''}</div>
        <div class="entry-time">${new Date(entry.createdAt).toLocaleTimeString()}</div>
      </div>
    `;

    // Update indicators
    elCarouselIndicators.innerHTML = carouselEntries.map((_, i) => 
      `<span class="indicator ${i === currentCarouselIndex ? 'active' : ''}" data-index="${i}"></span>`
    ).join('');

    // Add click handlers to indicators
    elCarouselIndicators.querySelectorAll('.indicator').forEach((ind, i) => {
      ind.addEventListener('click', () => {
        currentCarouselIndex = i;
        updateCarouselView();
      });
    });

    // Update navigation buttons
    elCarouselPrev.style.display = carouselEntries.length > 1 ? 'block' : 'none';
    elCarouselNext.style.display = carouselEntries.length > 1 ? 'block' : 'none';
  }

  // initial load (fetch once, filter client-side)
  (async () => {
    try {
      [allEntries, allVents] = await Promise.all([
        getEntries().catch(() => []),
        getVents().catch(() => []),
      ]);
    } catch {
      allEntries = allEntries || [];
      allVents = allVents || [];
    } finally {
      render();
    }
  })();

  function render() {
    elTitle.textContent = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const days = buildMonthCells(view);
    const emotionFilter = elEmo.value;
    const includeVents  = elVentsChk.checked;

    // index items by YYYY-MM-DD (local)
    const entryByDay = new Map();
    for (const e of (allEntries || [])) {
      if (emotionFilter && e.label !== emotionFilter) continue;
      const k = dayKey(new Date(e.createdAt));
      if (!entryByDay.has(k)) entryByDay.set(k, []);
      entryByDay.get(k).push(e);
    }
    const ventByDay = new Map();
    if (includeVents) {
      for (const v of (allVents || [])) {
        const k = dayKey(new Date(v.createdAt));
        if (!ventByDay.has(k)) ventByDay.set(k, []);
        ventByDay.get(k).push(v);
      }
    }

    elDays.innerHTML = days.map(d => {
      const k = dayKey(d.date);
      const entries = entryByDay.get(k) || [];
      const vents   = ventByDay.get(k) || [];
      const total   = entries.length + (includeVents ? vents.length : 0);

      // build up to 4 dots: top emotions by count, then vent dot if any
      const dots = [];
      if (entries.length) {
        const counts = countBy(entries, x => x.label);
        const top = Object.entries(counts)
          .sort((a,b) => b[1]-a[1])
          .slice(0, 4);
        for (const [label, cnt] of top) {
          dots.push(dot(COLORS[label] || "#e5e7eb", cnt));
        }
      }
      if (includeVents && vents.length) {
        dots.push(dot(VENT_COLOR, vents.length));
      }

      return `
        <div class="cal-cell ${d.inMonth ? "" : "muted"}" data-date="${k}">
          <div class="cal-date">${d.date.getDate()}</div>
          <div class="cal-dots">${dots.join("")}</div>
          ${total ? `<div class="cal-count badge">${total}</div>` : ""}
        </div>
      `;
    }).join("");

    // click handler to open carousel for a day
    elDays.querySelectorAll(".cal-cell").forEach(cell => {
      cell.addEventListener("click", () => {
        const k = cell.getAttribute("data-date");
        const entries = entryByDay.get(k) || [];
        const vents   = includeVents ? (ventByDay.get(k) || []) : [];
        openCarousel(k, entries, vents);
      });
    });
  }

  function openCarousel(yyyy_mm_dd, entries, vents) {
    const [y,m,d] = yyyy_mm_dd.split("-").map(n => parseInt(n,10));
    const dayDate = new Date(y, m-1, d);
    
    // Combine entries and vents into one array
    carouselEntries = [...entries, ...vents];
    
    if (carouselEntries.length === 0) {
      alert("No entries for this day");
      return;
    }
    
    currentCarouselIndex = 0;
    elCarouselTitle.textContent = `${dayDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} (${carouselEntries.length})`;
    
    elCarousel.classList.remove("hidden");
    updateCarouselView();
  }

function openDetail(yyyy_mm_dd, entries, vents) {
  const [y,m,d] = yyyy_mm_dd.split("-").map(n => parseInt(n,10));
  const dayDate = new Date(y, m-1, d);

  // summarize emotions (kept)
  const emoCounts = countBy(entries, x => x.label);
  const emoList = Object.entries(emoCounts)
    .sort((a,b)=> b[1]-a[1]); // top first

  const stripId  = `emo-strip-${yyyy_mm_dd}`;

  elDetail.classList.remove("hidden");
  elDetail.innerHTML = `
    <div class="cal-detail-panel card">
      <div class="cal-detail-head">
        <h3>${dayDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</h3>
        <button class="btn cal-detail-close" title="Close">✕</button>
      </div>

      ${emoList.length ? `
      <section class="cal-section">
        <h4>Emotions</h4>
        <div class="emo-strip" id="${stripId}">
          <div class="emo-track">
            ${emoList.map(([label,n]) => chip(label, n)).join("")}
          </div>
        </div>
      </section>
      ` : ""}

      ${renderSection("Entries", entries, true)}
      ${renderSection("Vents", vents, false)}
    </div>
  `;

  // close actions (kept)
  elDetail.querySelector(".cal-detail-close")?.addEventListener("click", () => {
    elDetail.classList.add("hidden");
    elDetail.innerHTML = "";
  });
  elDetail.addEventListener("click", (e) => {
    if (e.target === elDetail) {
      elDetail.classList.add("hidden");
      elDetail.innerHTML = "";
    }
  }, { once: true });

  // strip scroll behavior (kept, slider removed)
  const strip  = elDetail.querySelector(`#${stripId}`);
  if (strip) {
    // allow wheel to scroll horizontally
    strip.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        strip.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
  }
}
}

// ---------- helpers ----------
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d, n){ return new Date(d.getFullYear(), d.getMonth()+n, 1); }
function dayKey(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function buildMonthCells(viewDate){
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const last  = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0);
  const start = new Date(first); start.setDate(1 - first.getDay());  // start on Sunday
  const cells = [];
  for (let i=0;i<42;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    cells.push({ date: d, inMonth: d.getMonth() === viewDate.getMonth() });
  }
  return cells;
}
function countBy(arr, keyFn){
  const map = {};
  for (const x of arr) {
    const k = keyFn(x);
    map[k] = (map[k]||0)+1;
  }
  return map;
}
function dot(color, count){
  return `<span class="cal-dot" style="background:${color}" title="${count}"></span>`;
}
function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function chip(label, n){
  const color = COLORS[label] || "#e5e7eb";
  return `
    <span class="emo-chip" title="${label}: ${n}">
      <span class="emo-dot" style="background:${color}"></span>
      ${escapeHtml(label)} <span class="emo-count">${n}</span>
    </span>
  `;
}
function renderSection(title, items, showEmotion){
  if (!items?.length) return `
    <section class="cal-section">
      <h4>${title}</h4>
      <p class="muted">None.</p>
    </section>
  `;
  const rows = items
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(x => {
      const when = new Date(x.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const color = showEmotion ? (COLORS[x.label] || "#e5e7eb") : "#e5e7eb";
      const docId = String(x?.id ?? x?._id ?? "");
      return `
        <div class="cal-item">
          <span class="swatch" style="background:${color}"></span>
          ${showEmotion ? `<span class="badge">${escapeHtml(x.label||"")}</span>` : `<span class="badge">Vent</span>`}
          <span class="muted">· ${when}</span>
          <span class="muted" style="margin-left:auto">${docId.slice(0,6)}</span>
          <div class="cal-item-text">${escapeHtml(x.text || "")}</div>
        </div>
      `;
    }).join("");
  return `
    <section class="cal-section">
      <h4>${title} (${items.length})</h4>
      <div class="cal-list">${rows}</div>
    </section>
  `;
}
