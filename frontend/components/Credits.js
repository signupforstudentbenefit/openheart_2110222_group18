// frontend/components/Credits.js
export function Credits() {
  const roles = [
    { role: "Frontend", members: [
      { student_id: "6833168221", name: "Piyawat Jaikla" },
      { student_id: "6833067521", name: "Natapat Lapteerawut" },
    ]},
    { role: "Backend", members: [
      { student_id: "6833070321", name: "Napatr Boonyarangkul" },
      { student_id: "6833066921", name: "Nathaphong Wongwiangchan" },
    ]},
    { role: "AI Deployment", members: [
      { student_id: "6833123021", name: "Thiraphat Pholboon" },
    ]},
    { role: "EC2 Integration", members: [
      { student_id: "6733107921", name: "Tawin Jiramahapokee" },
    ]},
  ];

  const wrap = document.createElement("div");
  wrap.className = "container";
  wrap.innerHTML = `
    <div class="card">
      <h2>Credits</h2>
      <p>Made with 💖 by Group 18 — CEDT CU (final project for 2110222 sem1/2025)</p>

      <div class="credits-grid">
        ${roles.map(r => `
          <div class="credits-row">
            <div class="credits-role">${r.role}</div>
            <div class="credits-members">
              ${r.members.map(m => `
                <span class="credit-chip">
                  <span class="chip-name">${m.name}</span>
                  <span class="chip-id">${m.student_id}</span>
                </span>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>`;
  return wrap;
}
