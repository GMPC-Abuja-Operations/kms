// ===================== CONFIG =====================
const REGISTRY_SHEET_ID = "1caK5SHWG2YrrlDHFQYRufvU0CARoKfGXwSJkB5yO2bM";
const REGISTRY_TAB = "Registry";

const TRACKER_SHEET_ID = "1GaRWwoJ5xeOQKmCdPhLDRbQ4ALBU2_WN5v3iCvxYCWM";
const TRACKER_TAB = "Project_Tracker";

const FORM2_BASE_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfTxylQuqduT_GWEtPAVib7F76gatXzBR3A-CX8UmyiXfnWyA/viewform";
const FORM2_ENTRY_PROJECT_ID = "entry.1971957002";
const FORM2_ENTRY_PROJECT_NAME = "entry.1670802012";

const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz64-zqT-QqpQekvfNs5S73AH3vTayWU8f6OHnw9iYU0fYk58JXSY1VHHwxfmdCy-LQ/exec";
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
      .filter(r => r[1] && r[1] !== "Document Name")
      .map(r => ({
        name: r[1],
        link: r[2],
        type: r[3],
        industry: String(r[4] || "").split(",").map(s => s.trim()).filter(Boolean),
        confidence: r[6]
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
    const filtered = industry === "All" ? allDocs : allDocs.filter(d => d.industry.includes(industry));
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
      .filter(r => r[0] && r[0] !== "Project ID")
      .map(r => ({
        id: r[0],
        name: r[1],
        client: r[2],
        status: r[3],
        flag: r[9] || "",
        workplanLink: r[10] || "",
        progress: r[11] || "",
        type: r[12] || ""
      }))
      .filter(p => p.status !== "Closed");

    renderProjects(allProjects);
  } catch (e) {
    document.getElementById("pipelineList").innerHTML = "<p>Could not load projects right now.</p>";
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
  const pipeline = projects.filter(p => !p.workplanLink);
  const active = projects.filter(p => p.workplanLink);

  const pipelineEl = document.getElementById("pipelineList");
  const activeEl = document.getElementById("activeList");

  pipelineEl.innerHTML = pipeline.length === 0
    ? "<p>Nothing in pipeline.</p>"
    : pipeline.map(p => `
        <div class="pipeline-row">
          <div class="project-info">
            <strong>${p.name} (${p.id})</strong>
            <span>${p.client} · Won — awaiting workplan</span>
          </div>
        </div>
      `).join("");

  activeEl.innerHTML = active.length === 0
    ? "<p>No active projects yet.</p>"
    : active.map(p => `
        <div class="project-row">
          <div class="project-info">
            <strong>${flagDot(p.flag)} ${p.name} (${p.id})</strong>
            <span>${p.type} · ${p.status} · Progress: <span class="progress-percent">${p.progress}</span></span>
          </div>
          <div class="project-actions">
            <button class="report-btn" onclick="openSubmitPanel('${p.name.replace(/'/g, "\\'")}')">Submit Report</button>
            <a class="close-btn" href="${closeLink(p)}" target="_blank">Close Project →</a>
          </div>
        </div>
      `).join("");
}

// -------- Modals --------
function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});

document.getElementById("openRegisterBtn").addEventListener("click", () => openModal("registerModal"));
document.getElementById("openSubmitBtn").addEventListener("click", () => openSubmitPanel(null));

async function openSubmitPanel(prefilledProjectName) {
  openModal("submitModal");
  const projWrap = document.getElementById("sf_projectNameWrap");
  const projInput = document.getElementById("sf_projectName");
  const typeSelect = document.getElementById("sf_docType");

  if (prefilledProjectName) {
    typeSelect.value = "Report";
    projInput.value = prefilledProjectName;
    projWrap.style.display = "block";
    typeSelect.disabled = true;
  } else {
    typeSelect.disabled = false;
    projInput.value = "";
  }

  await loadTrainingDropdown();
  toggleConditionalFields();
}

document.getElementById("sf_docType").addEventListener("change", toggleConditionalFields);

function toggleConditionalFields() {
  const type = document.getElementById("sf_docType").value;
  document.getElementById("sf_projectNameWrap").style.display =
    (type === "Report") ? "block" : "none";
  document.getElementById("sf_trainingWrap").style.display =
    (type === "Training Material" || type === "Training Report") ? "block" : "none";
}

async function loadTrainingDropdown() {
  try {
    const res = await fetch(`${WEBAPP_URL}?action=getTrainingFolders`);
    const data = await res.json();
    const select = document.getElementById("sf_training");
    select.innerHTML = data.folders.map(f => `<option>${f}</option>`).join("")
      + `<option value="__new__">+ New Training Program</option>`;
  } catch (e) {
    console.error("Could not load training folders", e);
  }
}

function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  });
}

function getCheckedValues(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map(cb => cb.value);
}

document.getElementById("submitForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("sf_status");
  status.textContent = "Uploading...";

  const file = document.getElementById("sf_file").files[0];
  const fileBase64 = await fileToBase64(file);

  const payload = {
    action: "submitDocument",
    documentName: document.getElementById("sf_docName").value,
    documentType: document.getElementById("sf_docType").value,
    industryTags: getCheckedValues("sf_industry").join(","),
    serviceLine: getCheckedValues("sf_serviceLine").join(","),
    confidenceLevel: document.getElementById("sf_confidence").value,
    submittedBy: document.getElementById("sf_submittedBy").value,
    fileBase64,
    fileName: file.name,
    mimeType: file.type,
    trainingName: document.getElementById("sf_training").value,
    projectName: document.getElementById("sf_projectName").value,
    isReport: document.getElementById("sf_docType").value === "Report"
  };

  try {
    const res = await fetch(WEBAPP_URL, { method: "POST", body: JSON.stringify(payload) });
    const result = await res.json();
    if (result.success) {
      status.textContent = "✅ Submitted successfully!";
      setTimeout(() => { closeModal("submitModal"); loadRegistry(); }, 1500);
    } else {
      status.textContent = "❌ Error: " + result.error;
    }
  } catch (err) {
    status.textContent = "❌ Network error: " + err.message;
  }
});

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("rf_status");
  status.textContent = "Registering...";

  const payload = {
    action: "registerWorkplan",
    leadName: document.getElementById("rf_lead").value,
    workplanUrl: document.getElementById("rf_link").value,
    progressCell: document.getElementById("rf_cell").value,
    relatedProposalId: document.getElementById("rf_proposal").value
  };

  try {
    const res = await fetch(WEBAPP_URL, { method: "POST", body: JSON.stringify(payload) });
    const result = await res.json();
    if (result.success) {
      status.textContent = "✅ Registered as " + result.projectId;
      setTimeout(() => { closeModal("registerModal"); loadProjects(); }, 1500);
    } else {
  status.innerHTML = `⚠️ <strong>Action needed:</strong> ${result.error}`;
  status.style.color = "#8B6F47"; // brown, not alarm-red — this is guidance, not a system failure
}
  } catch (err) {
    status.textContent = "❌ Network error: " + err.message;
  }
});

// -------- Init --------
loadRegistry();
loadProjects();
document.getElementById("lastUpdated").textContent = "Page loaded: " + new Date().toLocaleString();
