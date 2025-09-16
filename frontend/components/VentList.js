// frontend/components/VentList.js
import { getVents, deleteVent /*, updateVent */ } from "../api.js";

export async function renderVents() {
  const host = document.getElementById("vent-list");
  if (!host) return;
  host.innerHTML = "<p>Loading…</p>";

  try {
    let vents = await getVents().catch(() => []);
    vents = (vents || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!vents.length) {
      host.innerHTML = "<p class='muted'>No vents yet.</p>";
      return;
    }

    host.innerHTML = `<div class="list">${vents.map(card).join("")}</div>`;

    // ONE delegated listener for all actions
    if (!host.dataset.bound) {
      host.dataset.bound = "1";
      host.addEventListener("click", onListClick);
    }
  } catch (err) {
    console.error("VentList failed", err);
    host.innerHTML = "<p style='color:#c00'>Failed to load vents.</p>";
  }
}

function card(v) {
  // prefer _id (Mongo) then id (legacy)
  const docId = String(v?._id ?? v?.id ?? "");
  const when = v?.createdAt ? new Date(v.createdAt).toLocaleString() : "";
  const txt  = escapeHtml(v?.text || "");

  return `
    <div class="card vent-card" id="vent-${docId}">
      <div class="vent-head">
        <span class="badge">Vent</span>
        <small class="muted" style="margin-left:auto">${escapeHtml(when)}</small>
      </div>

      <p>${txt}</p>

      <div class="vent-actions" style="margin-top:8px">
        <button data-edit="${docId}">Edit</button>
        <button data-del="${docId}">Delete</button>
      </div>

      <!-- Inline editor (optional, if you support editing text) -->
      <div class="vent-edit hidden" style="margin-top:8px">
        <textarea id="vent-ta-${docId}" rows="6">${txt}</textarea>
        <div class="vent-actions" style="margin-top:8px">
          <button data-save="${docId}">Save</button>
          <button data-cancel="${docId}">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

async function onListClick(ev) {
  const btn = ev.target.closest("button");
  if (!btn) return;

  const cardEl = ev.target.closest(".vent-card");
  if (!cardEl) return;

  const id = (cardEl.id || "").replace("vent-", "");

  // Edit -> toggle editor
  if (btn.matches("[data-edit]")) {
    toggleEdit(cardEl, true);
    return;
  }
  if (btn.matches("[data-cancel]")) {
    toggleEdit(cardEl, false);
    return;
  }

  // Delete
  if (btn.matches("[data-del]")) {
    await handleDelete(id, cardEl, btn);
    return;
  }

  // Save (only if you wire update on the backend)
  // if (btn.matches("[data-save]")) {
  //   const ta = cardEl.querySelector(`#vent-ta-${CSS.escape(id)}`);
  //   try {
  //     await updateVent(id, { text: ta.value });
  //     toggleEdit(cardEl, false);
  //     window.dispatchEvent(new Event("entries-changed")); // reuse same event bus
  //     renderVents();
  //   } catch (e) {
  //     console.error(e);
  //     alert("Failed to save vent");
  //   }
  // }
}

function toggleEdit(cardEl, on) {
  cardEl.querySelector(".vent-actions")?.classList.toggle("hidden", !!on);
  cardEl.querySelector(".vent-edit")?.classList.toggle("hidden", !on);
}

async function handleDelete(id, cardEl, btn) {
  const host = document.getElementById("vent-list");
  const list = host?.querySelector(".list");
  try {
    // prevent double-delete
    if (btn) btn.disabled = true;
    cardEl.classList.add("removing");

    await deleteVent(id)
      .catch(err => {
        // If server says 404, treat as already gone and continue
        if (err?.message?.includes("404")) return;
        throw err;
      });

    // notify others and optimistically remove
    window.dispatchEvent(new Event("entries-changed"));

    cardEl.addEventListener("transitionend", () => cardEl.remove(), { once: true });
    setTimeout(() => cardEl.remove(), 220);

    if (list && list.children.length <= 1) {
      host.innerHTML = "<p class='muted'>No vents yet.</p>";
    }
  } catch (e) {
    console.error(e);
    cardEl.classList.remove("removing");
    if (btn) btn.disabled = false;
    alert("Failed to delete vent");
  }
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}
