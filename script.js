// ===================== CONFIG =====================
const REGISTRY_SHEET_ID = "1caK5SHWG2YrrlDHFQYRufvU0CARoKfGXwSJkB5yO2bM";
const REGISTRY_TAB = "Registry";

const TRACKER_SHEET_ID = "1GaRWwoJ5xeOQKmCdPhLDRbQ4ALBU2_WN5v3iCvxYCWM";
const TRACKER_TAB = "Project_Tracker";

const FORM2_BASE_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfTxylQuqduT_GWEtPAVib7F76gatXzBR3A-CX8UmyiXfnWyA/viewform";
const FORM2_ENTRY_PROJECT_ID = "entry.1971957002";
const FORM2_ENTRY_PROJECT_NAME = "entry.1670802012";
// =====================================================================

let allDocs = [];
let allProjects = [];

function gvizUrl(sheetId, tab) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
}

function parseGviz(text) {
  const jsonText = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
  const json = JSON.parse(jsonText);
  return json.table.rows.map(r => (r.c || []).map(cell => (cell ? cell.v : "")));
}

// -------- Documents (Registry) --------
async function loadRegistry() {
  try {
    const res = await fetch(gvizUrl(REGISTRY_SHEET_ID, REGISTRY_TAB));
    const text = await res.text();
    const rows = parseGviz(text);

    allDocs = rows
      .filter(r => r[1]) // has Document Name
      .map(r => ({
        timestamp: r[0],
        name: r[1],
        link: r[2],
        type: r[3],
        industry: String(r[4] || "").split(",").map(s => s.trim()).filter(Boolean),
        serviceLine: String(r[5] || "").split(",").map(s => s.trim()).filter(Boolean),
        confidence: r[6],
        submittedBy: r[7]
      }));

    renderDocs(allDocs);
  } catch (e) {
    document.getElementById("docGrid").innerHTML = "<p>Could not load documents right now.</p>";
  }
}

function renderDocs(docs) {
  const grid = document.getElementById("docGrid");
  if (docs.length === 0) {
    grid.innerHTML = "<p>No documents found.</p>";
    return;
  }
  grid.innerHTML = docs.map(d => `
    <div class="card">
      <h3>${d.name}</h3>
      <div>
        ${d.industry.map(i => `<span class="pill">${i}</span>`).join("")}
        <span class="pill">${d.type}</span>
        <span class="pill">${d.confidence}</span>
      </div>
      <a href="${d.link}" target="_blank">Open →</a>
    </div>
  `).join("");
}

document.querySelectorAll("#industryFilters button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#industryFilters button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const industry = btn.dataset.industry;
    const filtered = industry === "All"
      ? allDocs
      : allDocs.filter(d => d.industry.includes(industry));
    renderDocs(filtered);
  });
});

document.getElementById("searchBar").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  renderDocs(allDocs.filter(d => d.name.toLowerCase().includes(q)));
});

// -------- Projects (Tracker) --------
async function loadProjects() {
  try {
    const res = await fetch(gvizUrl(TRACKER_SHEET_ID, TRACKER_TAB));
    const text = await res.text();
    const rows = parseGviz(text);

    allProjects = rows
      .filter(r => r[0]) // has Project ID
      .map(r => ({
        id: r[0],
        name: r[1],
        client: r[2],
        status: r[3],
        flag: r[9] || ""
      }))
      .filter(p => p.status !== "Closed");

    renderProjects(allProjects);
  } catch (e) {
    document.getElementById("projectList").innerHTML = "<p>Could not load projects right now.</p>";
  }
}

function flagDot(flag) {
  if (flag.includes("OVERDUE")) return '<span class="dot red"></span>';
  if (flag.includes("WATCH")) return '<span class="dot yellow"></span>';
  if (flag.includes("OK")) return '<span class="dot green"></span>';
  return "";
}

function closeLink(project) {
  const params = new URLSearchParams();
  params.set("usp", "pp_url");
  params.set(FORM2_ENTRY_PROJECT_ID, project.id);
  params.set(FORM2_ENTRY_PROJECT_NAME, project.name);
  return `${FORM2_BASE_URL}?${params.toString()}`;
}

function renderProjects(projects) {
  const list = document.getElementById("projectList");
  if (projects.length === 0) {
    list.innerHTML = "<p>No open projects right now.</p>";
    return;
  }
  list.innerHTML = projects.map(p => `
    <div class="project-row">
      <div class="project-info">
        <strong>${flagDot(p.flag)} ${p.name} (${p.id})</strong>
        <span>${p.client} · ${p.status}</span>
      </div>
      <a class="close-btn" href="${closeLink(p)}" target="_blank">Close Project →</a>
    </div>
  `).join("");
}

// -------- Init --------
loadRegistry();
loadProjects();
document.getElementById("lastUpdated").textContent =
  "Page loaded: " + new Date().toLocaleString();
