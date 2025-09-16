// frontend/components/EntryList.js
import { getEntries, deleteEntry, updateEntry } from "../api.js";

const EMOTIONS = ["Happy", "Sad", "Angry", "Worried", "Excited", "Calm"];

export async function renderEntries() {
  const host = document.getElementById("entry-list");
  if (!host) return;
  host.innerHTML = "<p>Loading…</p>";

  try {
    // newest first
    let entries = await getEntries().catch(() => []);
    entries = (entries || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!entries.length) {
      host.innerHTML = "<p class='muted'>No entries yet.</p>";
      return;
    }

    host.innerHTML = `<div class="list">${entries.map(card).join("")}</div>`;

    // --- Event delegation: attach ONE listener for all actions ---
    if (!host.dataset.bound) {
      host.dataset.bound = "1";
      host.addEventListener("click", onListClick);
      host.addEventListener("input", onSliderInput);
    }
  } catch (err) {
    console.error("EntryList failed", err);
    host.innerHTML = "<p style='color:#c00'>Failed to load entries.</p>";
  }
}

function onSliderInput(e) {
  // Handle confidence slider updates
  if (e.target.type === "range" && e.target.id.startsWith("conf-slider-")) {
    const id = e.target.id.replace("conf-slider-", "");
    const readout = document.getElementById(`conf-readout-${id}`);
    if (readout) {
      readout.textContent = `${e.target.value}%`;
    }
  }
}

async function onListClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;

  const host = document.getElementById("entry-list");
  const cardEl = e.target.closest(".entry-card");
  const id = cardEl ? (cardEl.id || "").replace("card-", "") : null;

  // Edit -> show chooser
  if (btn.matches("[data-edit]")) {
    openChooser(id, host);
    return;
  }

  // Cancel -> hide chooser
  if (btn.matches(".cancel")) {
    closeChooser(cardEl);
    return;
  }

  // Delete
  if (btn.matches("[data-del]")) {
    if (!id) return;
    await handleDelete(id, host);
    return;
  }

  // Pick emotion -> highlight selection and prepare for save
  if (btn.matches(".opt")) {
    if (!id) return;
    
    // Remove previous selection in this card
    const cardEl = e.target.closest(".entry-card");
    cardEl.querySelectorAll(".opt").forEach(b => b.classList.remove("selected"));
    
    // Mark this option as selected
    btn.classList.add("selected");
    return;
  }

  // Save edit -> update both label and confidence
  if (btn.matches("[data-save]")) {
    if (!id) return;
    try {
      // Get currently selected emotion (if any)
      const chooser = cardEl.querySelector(".chooser");
      const selectedEmotionBtn = chooser.querySelector(".opt.selected");
      const currentLabel = selectedEmotionBtn ? selectedEmotionBtn.dataset.pick : null;
      
      // Get confidence from slider
      const confSlider = cardEl.querySelector(`#conf-slider-${CSS.escape(id)}`);
      const confidence = confSlider ? Number(confSlider.value) / 100 : undefined;
      
      // Build update object with only changed values
      const updates = {};
      if (currentLabel) updates.label = currentLabel;
      if (confidence !== undefined) updates.confidence = confidence;
      
      if (Object.keys(updates).length > 0) {
        await updateEntry(id, updates);
        closeChooser(cardEl);
        window.dispatchEvent(new Event("entries-changed"));
        renderEntries();
      } else {
        closeChooser(cardEl);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update entry");
    }
    return;
  }
}

async function handleDelete(id, host) {
  const card = document.getElementById(`card-${CSS.escape(id)}`);
  const list = host.querySelector(".list");
  const delBtn = card?.querySelector(`[data-del="${CSS.escape(id)}"]`);

  try {
    if (card) {
      card.classList.add("removing");
      if (delBtn) delBtn.disabled = true;
    }
    await deleteEntry(id);

    // notify others (analytics) and optimistically remove
    window.dispatchEvent(new Event("entries-changed"));
    if (card) {
      card.addEventListener("transitionend", () => card.remove(), { once: true });
      setTimeout(() => card.remove(), 220);
    }
    if (list && list.children.length <= 1) {
      host.innerHTML = "<p class='muted'>No entries yet.</p>";
    }
  } catch (err) {
    console.error(err);
    if (card) card.classList.remove("removing");
    if (delBtn) delBtn.disabled = false;
    alert("Failed to delete entry");
  }
}

function openChooser(id, scope = document) {
  const card = scope.querySelector(`#card-${CSS.escape(id)}`);
  if (!card) return;
  
  // Show the chooser panel
  card.querySelector(".entry-actions")?.classList.add("hidden");
  card.querySelector(".chooser")?.classList.remove("hidden");
  
  // Pre-select current emotion
  const currentLabel = card.querySelector(".badge")?.textContent?.trim();
  if (currentLabel) {
    const emotionBtn = card.querySelector(`[data-pick="${currentLabel}"]`);
    if (emotionBtn) {
      emotionBtn.classList.add("selected");
    }
  }
}

function closeChooser(card) {
  if (!card) return;
  card.querySelector(".entry-actions")?.classList.remove("hidden");
  card.querySelector(".chooser")?.classList.add("hidden");
}

function card(e) {
  const docId = String(e?.id ?? e?._id ?? "");
  const when = e?.createdAt ? new Date(e.createdAt).toLocaleString() : "";
  const pct = Math.round((e.confidence ?? 0) * 100);

  return `
    <div class="card entry-card" id="card-${docId}">
      <div class="entry-head">
        <span class="badge">${escapeHtml(e.label || "")}</span>
        <small> · ${pct}%</small>
        <small class="muted" style="margin-left:auto">${escapeHtml(when)}</small>
      </div>

      <p>${escapeHtml(e.text || "")}</p>

      <!-- Default actions (visible) -->
      <div class="entry-actions" style="margin-top:8px">
        <button data-edit="${docId}">Edit</button>
        <button data-del="${docId}">Delete</button>
      </div>

      <!-- Emotion chooser (hidden until Edit) -->
      <div class="chooser hidden" id="chooser-${docId}" style="margin-top:8px">
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          ${EMOTIONS.map(o => `<button class="opt" data-pick="${o}">${o}</button>`).join("")}
        </div>
        <div class="confidence-edit" style="display:flex;align-items:center;gap:10px;margin:8px 0;">
          <label class="muted">Confidence</label>
          <input type="range" min="0" max="100" step="1" value="${pct}" id="conf-slider-${docId}" />
          <span class="muted" id="conf-readout-${docId}">${pct}%</span>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="save-edit" data-save="${docId}">Save</button>
          <button class="cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}
