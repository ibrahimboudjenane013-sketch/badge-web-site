// ==========================================================================
// ECO-AWARE Badges Application
// Main View: Formulaire & Badge pour les Participants
// Mode Hôte : Sécurisé par mot de passe via les 3 points (⋮)
// ==========================================================================

const form = document.getElementById("form");
const nameInput = document.getElementById("name");
const deptSelect = document.getElementById("department");
const errorEl = document.getElementById("error");
const submitBtn = document.getElementById("submit");
const result = document.getElementById("result");
const panelForm = document.getElementById("panel-form");

const badgeName = document.getElementById("badge-name");
const badgeId = document.getElementById("badge-id");
const validationDesc = document.getElementById("validation-desc");
const valMemberName = document.getElementById("val-member-name");
const valMemberDept = document.getElementById("val-member-dept");
const valMemberId = document.getElementById("val-member-id");
const printBtn = document.getElementById("print");
const downloadBtn = document.getElementById("download");
const btnCreateAnother = document.getElementById("btn-create-another");

// Menu & Modal Elements
const menuBtn = document.getElementById("menu-btn");
const hostModal = document.getElementById("host-modal");
const btnCloseHost = document.getElementById("btn-close-host");

// Host Authentication Elements
const hostAuthScreen = document.getElementById("host-auth-screen");
const hostAuthForm = document.getElementById("host-auth-form");
const hostPasswordInput = document.getElementById("host-password-input");
const btnTogglePwd = document.getElementById("btn-toggle-pwd");
const authErrorMsg = document.getElementById("auth-error-msg");
const hostDashScreen = document.getElementById("host-dash-screen");
const btnLockSession = document.getElementById("btn-lock-session");

// Host Dashboard Elements
const hostNameInput = document.getElementById("host-name-input");
const hostSavedIndicator = document.getElementById("host-saved-indicator");
const statTotalCount = document.getElementById("stat-total-count");
const statSessionCount = document.getElementById("stat-session-count");
const memberSearch = document.getElementById("member-search");
const recentMembersList = document.getElementById("recent-members-list");
const btnRefreshHost = document.getElementById("btn-refresh-host");
const btnIconRefresh = document.getElementById("btn-icon-refresh");

// Persistent Registrar State & Session Auth
let currentHostName = localStorage.getItem("eco_host_name") || "djo_1111";
let sessionCount = 0;
let cachedMembers = [];

// Secret admin password for host mode access
const HOST_PASSWORD = "eco-aware can access the admin mode";

// ==========================================================================
// Host Modal & Security Logic
// ==========================================================================
function isHostAuthenticated() {
  return sessionStorage.getItem("eco_host_authenticated") === "true";
}

function openHostModal() {
  if (!hostModal) return;
  hostModal.hidden = false;

  if (isHostAuthenticated()) {
    showDashboardScreen();
  } else {
    showAuthScreen();
  }
}

function closeHostModal() {
  if (hostModal) hostModal.hidden = true;
}

function showAuthScreen() {
  if (hostAuthScreen) hostAuthScreen.hidden = false;
  if (hostDashScreen) hostDashScreen.hidden = true;
  if (authErrorMsg) authErrorMsg.hidden = true;
  if (hostPasswordInput) {
    hostPasswordInput.value = "";
    setTimeout(() => hostPasswordInput.focus(), 100);
  }
}

function showDashboardScreen() {
  if (hostAuthScreen) hostAuthScreen.hidden = true;
  if (hostDashScreen) hostDashScreen.hidden = false;
  updateHostUI();
  loadHostStats();
}

// 3-Dots Button: Open Host Mode
if (menuBtn) {
  menuBtn.addEventListener("click", openHostModal);
}

// Close Button
if (btnCloseHost) {
  btnCloseHost.addEventListener("click", closeHostModal);
}

// Close on outside click
if (hostModal) {
  hostModal.addEventListener("click", (e) => {
    if (e.target === hostModal) {
      closeHostModal();
    }
  });
}

// Host Authentication Form
if (hostAuthForm) {
  hostAuthForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const entered = (hostPasswordInput.value || "").trim();

    if (entered.toLowerCase() === HOST_PASSWORD.toLowerCase()) {
      sessionStorage.setItem("eco_host_authenticated", "true");
      if (authErrorMsg) authErrorMsg.hidden = true;
      showDashboardScreen();
    } else {
      if (authErrorMsg) {
        authErrorMsg.textContent = "Mot de passe incorrect. Réessayez.";
        authErrorMsg.hidden = false;
      }
      hostPasswordInput.select();
    }
  });
}

// Toggle Password Visibility (Eye Icon)
if (btnTogglePwd && hostPasswordInput) {
  btnTogglePwd.addEventListener("click", () => {
    const isPassword = hostPasswordInput.type === "password";
    hostPasswordInput.type = isPassword ? "text" : "password";
    btnTogglePwd.innerHTML = isPassword
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  });
}

// Lock Session Button
if (btnLockSession) {
  btnLockSession.addEventListener("click", () => {
    sessionStorage.removeItem("eco_host_authenticated");
    showAuthScreen();
  });
}

// ==========================================================================
// Host State & UI Updates
// ==========================================================================
function updateHostUI() {
  if (hostNameInput) hostNameInput.value = currentHostName;
  if (statSessionCount) statSessionCount.textContent = String(sessionCount);
}

if (hostNameInput) {
  let saveTimeout;
  hostNameInput.addEventListener("input", () => {
    currentHostName = hostNameInput.value.trim() || "Host / Organisateur";
    localStorage.setItem("eco_host_name", currentHostName);
    updateHostUI();

    if (hostSavedIndicator) {
      hostSavedIndicator.classList.add("visible");
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        hostSavedIndicator.classList.remove("visible");
      }, 1600);
    }
  });
}

// ==========================================================================
// Load Host Statistics & Members
// ==========================================================================
async function loadHostStats() {
  if (!recentMembersList) return;
  recentMembersList.innerHTML = `<div class="loading-state">Chargement des inscriptions...</div>`;
  try {
    const res = await fetch("/api/members");
    if (res.ok) {
      const members = await res.json();
      if (Array.isArray(members)) cachedMembers = members;
    } else {
      throw new Error("offline");
    }
  } catch (err) {
    const localList = JSON.parse(localStorage.getItem("eco_local_members") || "[]");
    cachedMembers = localList;
  }

  if (statTotalCount) statTotalCount.textContent = String(cachedMembers.length);
  renderMembersList(cachedMembers);
}

function renderMembersList(list) {
  if (!recentMembersList) return;
  const query = (memberSearch ? memberSearch.value : "").trim().toLowerCase();
  const filtered = query
    ? list.filter((m) =>
        (m.name || "").toLowerCase().includes(query) ||
        (m.department || "").toLowerCase().includes(query) ||
        (m.registrar || "").toLowerCase().includes(query) ||
        String(m.id || "").toLowerCase().includes(query)
      )
    : list;

  if (filtered.length === 0) {
    recentMembersList.innerHTML = `<div class="empty-state">Aucun membre correspondant trouvé.</div>`;
    return;
  }

  recentMembersList.innerHTML = filtered
    .map((m) => `
      <div class="recent-item">
        <div>
          <div class="recent-name">${escapeHtml(m.name || "Inconnu")}</div>
          <div class="recent-meta">${escapeHtml(m.department || "")} • ECO-${escapeHtml(String(m.id || ""))} • ${escapeHtml(m.date || "")}</div>
        </div>
        <div class="recent-host" title="Enregistré par">${escapeHtml(m.registrar || "Host")}</div>
      </div>
    `)
    .join("");
}

if (memberSearch) {
  memberSearch.addEventListener("input", () => {
    renderMembersList(cachedMembers);
  });
}

function triggerRefresh() {
  const icons = document.querySelectorAll(".refresh-icon");
  icons.forEach((ic) => ic.classList.add("refresh-spin"));
  setTimeout(() => {
    icons.forEach((ic) => ic.classList.remove("refresh-spin"));
  }, 750);
  loadHostStats();
}

if (btnRefreshHost) {
  btnRefreshHost.addEventListener("click", triggerRefresh);
}
if (btnIconRefresh) {
  btnIconRefresh.addEventListener("click", triggerRefresh);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Default Departments
const DEPARTMENTS = ["IT", "RE", "RH", "ORGANISATION", "COMMUNICATION"];

function populateDepartments(list = DEPARTMENTS) {
  if (!deptSelect) return;
  deptSelect.innerHTML = list.map((d) => `<option value="${d}">${d}</option>`).join("");
}

async function loadDepartments() {
  populateDepartments();
  try {
    const res = await fetch("/api/departments");
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        populateDepartments(list);
      }
    }
  } catch (err) {
    // Already populated
  }
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = !msg;
}

// "Inscrire un autre membre" Button
if (btnCreateAnother) {
  btnCreateAnother.addEventListener("click", () => {
    result.hidden = true;
    panelForm.hidden = false;
    form.reset();
    showError("");
    nameInput.focus();
    panelForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ==========================================================================
// Submit Form (Participant Registration)
// ==========================================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");

  const name = nameInput.value.trim();
  const dept = deptSelect.value;

  if (!name) {
    showError("Le nom complet est obligatoire.");
    nameInput.focus();
    return;
  }
  if (!dept) {
    showError("Veuillez sélectionner un département.");
    deptSelect.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Validation en cours...";

  try {
    let data = null;
    try {
      const formData = new FormData(form);
      formData.append("registrar", currentHostName);

      const res = await fetch("/api/badges", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        data = await res.json();
      }
    } catch (netErr) {
      // In case of static deployment without Node server
    }

    if (!data || !data.name) {
      const randomId = Math.random().toString(16).substring(2, 10).toUpperCase();
      const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");
      data = {
        id: randomId,
        displayId: `ECO-${randomId}`,
        name: name,
        department: dept,
        registrar: currentHostName,
        date: nowStr
      };

      const localList = JSON.parse(localStorage.getItem("eco_local_members") || "[]");
      localList.unshift(data);
      localStorage.setItem("eco_local_members", JSON.stringify(localList));
    }

    // Update confirmation details
    if (valMemberName) valMemberName.textContent = data.name;
    if (valMemberDept) valMemberDept.textContent = data.department;
    if (valMemberId) valMemberId.textContent = data.displayId || `ECO-${data.id}`;

    // Update validation confirmation banner
    if (validationDesc) {
      validationDesc.innerHTML = `Félicitations <strong>${escapeHtml(data.name)}</strong>, votre inscription au département <strong>${escapeHtml(data.department)}</strong> a été validée avec succès !`;
    }

    // Keep badgeName / badgeId safe if present
    if (badgeName) badgeName.textContent = data.name.toUpperCase();
    if (badgeId) badgeId.textContent = data.displayId || `ECO-${data.id}`;

    sessionCount++;
    updateHostUI();

    // Hide registration form and show validation message
    panelForm.hidden = true;
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    showError(err.message || "Erreur lors de la validation de l'inscription.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Créer le badge";
  }
});

// ==========================================================================
// Print & PNG Export
// ==========================================================================
if (printBtn) {
  printBtn.addEventListener("click", () => {
    window.print();
  });
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    exportBadgeCard();
  });
}

function exportBadgeCard() {
  const dpr = 2;
  const width = 595 * dpr;
  const height = 335 * dpr;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 1. Background
  ctx.fillStyle = "#090c10";
  drawRoundedRect(0, 0, width, height, 22 * dpr);
  ctx.fill();

  // Left side red curves
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(70 * dpr, 40 * dpr, 90 * dpr, 110 * dpr, 55 * dpr, 200 * dpr);
  ctx.bezierCurveTo(35 * dpr, 240 * dpr, 0, 260 * dpr, 0, height);
  ctx.closePath();
  ctx.fillStyle = "#DF3331";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(45 * dpr, 20 * dpr, 60 * dpr, 60 * dpr, 30 * dpr, 130 * dpr);
  ctx.bezierCurveTo(15 * dpr, 160 * dpr, 0, 180 * dpr, 0, 180 * dpr);
  ctx.closePath();
  ctx.fillStyle = "#b91c1c";
  ctx.fill();
  ctx.restore();

  // Right side leaves representation
  ctx.save();
  ctx.fillStyle = "#79AE44";
  ctx.beginPath();
  ctx.moveTo(width, 35 * dpr);
  ctx.bezierCurveTo(width - 60 * dpr, 35 * dpr, width - 100 * dpr, 75 * dpr, width - 85 * dpr, 135 * dpr);
  ctx.bezierCurveTo(width - 40 * dpr, 135 * dpr, width, 95 * dpr, width, 35 * dpr);
  ctx.fill();

  ctx.fillStyle = "#5c8a30";
  ctx.beginPath();
  ctx.moveTo(width - 50 * dpr, 130 * dpr);
  ctx.bezierCurveTo(width - 90 * dpr, 100 * dpr, width - 120 * dpr, 130 * dpr, width - 110 * dpr, 175 * dpr);
  ctx.bezierCurveTo(width - 70 * dpr, 180 * dpr, width - 45 * dpr, 155 * dpr, width - 50 * dpr, 130 * dpr);
  ctx.fill();

  ctx.fillStyle = "#79AE44";
  ctx.beginPath();
  ctx.moveTo(width, 155 * dpr);
  ctx.bezierCurveTo(width - 45 * dpr, 150 * dpr, width - 65 * dpr, 185 * dpr, width - 58 * dpr, 230 * dpr);
  ctx.bezierCurveTo(width - 20 * dpr, 225 * dpr, width, 195 * dpr, width, 155 * dpr);
  ctx.fill();
  ctx.restore();

  // Center Logo
  const logo = new Image();
  logo.crossOrigin = "anonymous";
  logo.onload = () => {
    const logoW = 52 * dpr;
    const logoH = 52 * dpr;
    const logoX = (width - logoW) / 2;
    const logoY = 20 * dpr;
    ctx.drawImage(logo, logoX, logoY, logoW, logoH);

    // ECO-AWARE Text under logo
    ctx.font = `bold ${13 * dpr}px Plus Jakarta Sans, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#79AE44";
    ctx.fillText("ECO-", (width / 2) - (24 * dpr), logoY + logoH + (16 * dpr));
    ctx.fillStyle = "#ffffff";
    ctx.fillText("AWARE", (width / 2) + (18 * dpr), logoY + logoH + (16 * dpr));

    // Name Pill Outline
    const pillW = width - (70 * dpr);
    const pillH = 46 * dpr;
    const pillX = 35 * dpr;
    const pillY = logoY + logoH + (32 * dpr);

    ctx.fillStyle = "#0d1014";
    drawRoundedRect(pillX, pillY, pillW, pillH, 999);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    // User Icon
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(pillX + 26 * dpr, pillY + 18 * dpr, 6 * dpr, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pillX + 26 * dpr, pillY + 34 * dpr, 10 * dpr, Math.PI, 0, false);
    ctx.fill();

    // Divider
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(pillX + 46 * dpr, pillY + 12 * dpr, 1.5 * dpr, 22 * dpr);

    // NAME :
    ctx.textAlign = "left";
    ctx.font = `bold ${12 * dpr}px Plus Jakarta Sans, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("NAME :", pillX + 58 * dpr, pillY + 28 * dpr);

    // Member Name
    const nameStr = (badgeName.textContent || "DJAMEL LABIDINE").trim();
    ctx.font = `bold ${14 * dpr}px Plus Jakarta Sans, sans-serif`;
    ctx.fillText(nameStr, pillX + 120 * dpr, pillY + 28 * dpr);

    // Bottom Ribbon
    const ribbonY = height - (54 * dpr);
    const ribbonH = 54 * dpr;
    ctx.fillStyle = "#DF3331";
    ctx.fillRect(0, ribbonY, width, ribbonH);

    // Green stripe on ribbon top
    ctx.fillStyle = "#79AE44";
    ctx.fillRect(0, ribbonY, width, 3.5 * dpr);

    // PARTICIPANT Text
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${19 * dpr}px Playfair Display, serif`;
    ctx.fillText("PARTICIPANT", width / 2, ribbonY + 34 * dpr);

    // Download trigger
    const link = document.createElement("a");
    const slug = nameStr.toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.download = `eco_aware_badge_${slug}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  logo.src = "emblem.png";
}

// Initial calls
if (hostModal) hostModal.hidden = true;
loadDepartments();
