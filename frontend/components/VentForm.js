import { api } from "../api.js";
import { renderVents } from "./VentList.js";

export function mountVentForm(el) {
  el.innerHTML = `
    <textarea id="vent-text" placeholder="Let it all out..." style="width:100%;min-height:160px"></textarea>
    <div class="row" style="align-items:center; gap:12px; margin-top:8px;">
      <button id="vent-save">Save</button>
      <span id="vent-status" class="muted"></span>
    </div>
  `;
  const input = el.querySelector("#vent-text");
  const btn   = el.querySelector("#vent-save");
  const st    = el.querySelector("#vent-status");

btn.addEventListener("click", async (e) => {
  e.preventDefault();

  const text = (input.value || "").trim();
  if (!text) {
    st.textContent = "Type something first";
    setTimeout(() => (st.textContent = ""), 1500);
    return;
  }

  btn.disabled = true;
  st.textContent = "Saving…";

  try {
    // If your api exposes createVent(text), keep this line:
    const doc = await api.createVent(text);
    // Otherwise, use:
    // const doc = await api.post("/api/vents", { text });

    input.value = "";
    st.textContent = "Saved";
    await renderVents();                     // ensure UI updates before firing the event
    window.dispatchEvent(new Event("vents-changed"));
  } catch (err) {
    console.error(err);
    const msg = err?.message || "Unknown error";
    st.textContent = "Failed";
    alert(`Failed to save: ${msg}`);         // shows HTTP status/body from api.js
  } finally {
    btn.disabled = false;
    setTimeout(() => (st.textContent = ""), 1200);
  }
});

}
