// import { updateEntry } from "../api.js";

// const OPTIONS = ["Happy","Sad","Angry","Worried","Excited","Calm"];

// export function openClarifyDialog(entry) {
//   const host = document.getElementById("clarify-dialog");
//   host.classList.remove("hidden");
//   host.innerHTML = `
//     <div class="panel" role="dialog" aria-modal="true" aria-labelledby="cd-title">
//       <h3 id="cd-title">Not fully sure about the emotion</h3>
//       <p><em>"${escapeHtml(entry.text)}"</em></p>
//       <p>Pick the closest:</p>
//       <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
//         ${OPTIONS.map(o => `<button data-opt="${o}">${o}</button>`).join("")}
//       </div>
//       <button id="skip">Skip</button>
//     </div>
//   `;

//   const firstBtn = host.querySelector("[data-opt]");
//   if (firstBtn) firstBtn.focus();

//   host.querySelectorAll("[data-opt]").forEach(btn =>
//     btn.addEventListener("click", async (e) => {
//       const label = e.currentTarget.dataset.opt;
//       await updateEntry(entry.id, { label, confidence: 1 });
//       close();
//       window.dispatchEvent(new Event("entries-changed"));
//     })
//   );
//   host.querySelector("#skip").addEventListener("click", close);
//   host.addEventListener("keydown", (ev) => { if (ev.key === "Escape") close(); });

//   function close(){ host.classList.add("hidden"); host.innerHTML=""; }
// }

// function escapeHtml(s) {
//   return (s||"").replace(/[&<>"']/g, c => (
//     {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]
//   ));
// }
