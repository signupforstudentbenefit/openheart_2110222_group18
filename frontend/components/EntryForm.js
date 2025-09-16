import { api } from "../api.js";
// CHANGE: import Clarify dialog in a way that won't break if file is stubbed/commented out
import * as Clarify from "./ClarifyDialog.js";
import { renderEntries } from "./EntryList.js";

function debounce(fn, ms=400){
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}

const THRESHOLD = 0.7; // backend stores 0..1

export function mountEntryForm(el) {
  el.innerHTML = `
    <div class="entry-form">
      <textarea id="entry-text" placeholder="How are you feeling?" style="width:100%;min-height:100px"></textarea>

      <div class="row" style="align-items:center; gap:12px; margin-top:8px;">
        <div class="muted" id="ai-preview"></div>
      </div>

      <div class="row" style="align-items:center; gap:10px; margin:10px 0;">
        <label for="conf-slider" class="muted">Confidence</label>
        <input id="conf-slider" type="range" min="0" max="100" step="1" value="70" />
        <span id="conf-readout" class="muted">70%</span>
      </div>

      <button id="btn-save">Save</button>
    </div>
  `;

  const input       = el.querySelector("#entry-text");
  const btnSave     = el.querySelector("#btn-save");
  const aiPreview   = el.querySelector("#ai-preview");
  const slider      = el.querySelector("#conf-slider");
  const readout     = el.querySelector("#conf-readout");

  let lastAI = { label: null, confidence: 0.7 }; // fallback 70%
  let userTouchedSlider = false;

  // --- Slider wiring
  const setSlider = (pct) => {
    const v = Math.max(0, Math.min(100, Math.round(pct)));
    slider.value = String(v);
    readout.textContent = `${v}%`;
  };
  slider.addEventListener("input", () => {
    userTouchedSlider = true;
    readout.textContent = `${slider.value}%`;
  });
  setSlider(70);

  // --- Optional: live classify while typing (debounced)
  const showThinking = () => aiPreview.innerHTML = `<span class="spin"></span> AI classifying...`;
  const showResult   = ({label, confidence}) => {
    const pct = Math.round((confidence ?? 0)*100);
    aiPreview.innerHTML = `<strong>${label}</strong> <span class="muted">${pct}%</span>`;
    // Auto-move slider if user hasn't touched it
    if (!userTouchedSlider) setSlider(pct);
  };
  const showIdle     = () => aiPreview.textContent = "";

  const classifyDebounced = debounce(async () => {
    const text = input.value.trim();
    if (!text || text.length < 3) { showIdle(); return; }
    try {
      showThinking();
      const res = await api.classifyText(text); // backend /classify
      lastAI = res; // remember for Reset
      showResult(res);
    } catch (error) {
      console.error('AI classification failed:', error);
      aiPreview.innerHTML = `<span class="muted">AI unavailable</span>`;
    }
  }, 800);
  input.addEventListener("input", classifyDebounced);

  // --- Save flow:
  // 1) createEntry(text) -> backend AI classifies & stores
  // 2) PATCH with slider value (0..1) so manual adjustment wins
  btnSave.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;
    btnSave.disabled = true;
    try {
      const entry = await api.createEntry(text); // backend classifies
      const manual = Number(slider.value) / 100; // 0..1

      // Only patch if user moved the slider or slider disagrees with stored value by >1%
      const stored = Number(entry.confidence ?? 0);
      const delta = Math.abs(stored - manual);
      if (userTouchedSlider || delta > 0.01) {
        // CHANGE: Safely determine id (Mongo `_id` or normalized `id`) and guard PATCH
        const savedId = entry?.id ?? entry?.id;
        if (savedId) {
          await api.updateEntry(savedId, { confidence: manual });
        }
        entry.confidence = manual;
      }

      input.value = "";
      showIdle();
      userTouchedSlider = false;
      if (entry.confidence < THRESHOLD) {
        // CHANGE: optional chaining ensures app keeps working if dialog is disabled
        Clarify.openClarifyDialog?.(entry);
      }

    // render separately so save errors aren’t masked by render bugs
    try {
      renderEntries();
      window.dispatchEvent(new Event("entries-changed"));
    } catch (re) {
      console.error("Render after save failed:", re);
      alert(`Saved, but list render failed: ${re?.message || re}`);
    }
    } catch (e) {
      console.error("createEntry failed:", e);
      alert(`Failed to save: ${e?.message || e}`);
    } finally {
      btnSave.disabled = false;
    }
  });
}
