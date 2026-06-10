/* ─── GitInsight · app.js ─────────────────────────────────────────────────── */

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

// ── Language colours ──────────────────────────────────────────────────────────
const LANG_COLORS = {
  JavaScript:"#f7df1e", TypeScript:"#3178c6", Python:"#3776ab",
  Java:"#b07219","C++":"#f34b7d", C:"#555555","C#":"#178600",
  Go:"#00add8", Rust:"#dea584", Ruby:"#701516", PHP:"#4f5d95",
  Swift:"#ffac45", Kotlin:"#a97bff", HTML:"#e34c26", CSS:"#563d7c",
  Shell:"#89e051", Dart:"#00b4ab", Vue:"#42b883", React:"#61dafb",
  default:"#8b949e"
};
const langColor = (l) => LANG_COLORS[l] || LANG_COLORS.default;

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  profile: null, repos: [], langs: {}, score: 0,
  aiText: "", heatmapData: null, username: ""
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const ghFetch = (url) =>
  fetch(url, { headers: { Accept: "application/vnd.github+json" } }).then(r => r.json());

const $ = (id) => document.getElementById(id);

function setBtn(loading) {
  const btn = $("analyzeBtn");
  btn.disabled = loading;
  $("btnText").textContent = loading ? "Analyzing…" : "Analyze →";
}

function showError(msg) {
  const el = $("errorBox");
  el.textContent = "⚠ " + msg;
  el.style.display = "block";
}

function hideError() { $("errorBox").style.display = "none"; }

// ── Main analyze ──────────────────────────────────────────────────────────────
async function analyze() {
  const input = $("usernameInput").value.trim();
  if (!input) return;

  setBtn(true); hideError();
  $("results").style.display = "none";
  $("hero").style.display = "none";

  try {
    // 1. Fetch user
    const user = await ghFetch(`https://api.github.com/users/${input}`);
    if (user.message === "Not Found") throw new Error("GitHub user not found.");

    // 2. Fetch repos
    const allRepos = await ghFetch(
      `https://api.github.com/users/${input}/repos?per_page=100&sort=updated`
    );
    if (!Array.isArray(allRepos)) throw new Error("Could not fetch repositories.");

    // 3. Aggregate languages
    const langMap = {};
    const ownRepos = allRepos.filter(r => !r.fork);
    for (const repo of ownRepos.slice(0, 30)) {
      if (repo.language) langMap[repo.language] = (langMap[repo.language] || 0) + (repo.size || 1);
    }

    // 4. Score
    const totalStars = ownRepos.reduce((s, r) => s + r.stargazers_count, 0);
    const hasDesc    = ownRepos.filter(r => r.description).length;
    const score = Math.min(
      Math.min(ownRepos.length * 2, 25) +
      Math.min(totalStars * 2, 25) +
      (user.public_gists > 0 ? 10 : 5) +
      Math.min(user.followers, 10) +
      Math.min(hasDesc * 2, 15) +
      Math.min(Object.keys(langMap).length * 2, 15),
      100
    );

    // Save state
    state = {
      profile: user, repos: ownRepos.slice(0, 24), langs: langMap,
      score, aiText: "", heatmapData: null, username: input
    };

    renderProfile();
    renderStats(totalStars);
    renderLangs();
    renderRepos();
    animateScore(score);

    $("results").style.display = "block";
    switchTab("overview");

    // Async: AI + Heatmap
    fetchAI(user, ownRepos, langMap, totalStars, score);
    fetchHeatmap(input);

  } catch (e) {
    showError(e.message || "Something went wrong.");
    $("hero").style.display = "block";
  } finally {
    setBtn(false);
  }
}

// ── Render Profile ────────────────────────────────────────────────────────────
function renderProfile() {
  const u = state.profile;
  $("avatar").src = u.avatar_url;
  $("profileName").textContent = u.name || u.login;
  $("profileLogin").textContent = "@" + u.login;
  $("profileBio").textContent = u.bio || "";

  const meta = [];
  if (u.location) meta.push(`📍 ${u.location}`);
  if (u.company)  meta.push(`🏢 ${u.company}`);
  if (u.blog) {
    const href = u.blog.startsWith("http") ? u.blog : "https://" + u.blog;
    meta.push(`<a href="${href}" target="_blank" rel="noreferrer">🔗 Website</a>`);
  }
  $("profileMeta").innerHTML = meta.join(" &nbsp;·&nbsp; ");
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function animateScore(score) {
  const fill  = $("ringFill");
  const num   = $("scoreNum");
  const circ  = 2 * Math.PI * 52;
  const color = score >= 75 ? "#39d98a" : score >= 50 ? "#f9c74f" : "#f94144";

  fill.style.stroke = color;
  num.style.color   = color;

  // Animate counter
  let current = 0;
  const step  = score / 60;
  const timer = setInterval(() => {
    current = Math.min(current + step, score);
    num.textContent = Math.round(current);
    fill.style.strokeDasharray = `${(current / 100) * circ} ${circ}`;
    if (current >= score) clearInterval(timer);
  }, 16);
}

// ── Stat Cards ────────────────────────────────────────────────────────────────
function renderStats(totalStars) {
  const u = state.profile;
  const items = [
    { label:"Public Repos", value: u.public_repos, icon:"📦", accent:"#60a5fa" },
    { label:"Followers",    value: u.followers,    icon:"👥", accent:"#818cf8" },
    { label:"Following",    value: u.following,    icon:"➕", accent:"#34d399" },
    { label:"Total Stars",  value: totalStars,     icon:"⭐", accent:"#f9c74f" },
  ];
  $("statGrid").innerHTML = items.map(i => `
    <div class="stat-card">
      <div class="stat-icon" style="background:${i.accent}18">${i.icon}</div>
      <div>
        <div class="stat-label">${i.label}</div>
        <div class="stat-value">${i.value}</div>
      </div>
    </div>`).join("");
}

// ── Languages ─────────────────────────────────────────────────────────────────
function renderLangs() {
  const langs  = state.langs;
  const total  = Object.values(langs).reduce((a, b) => a + b, 0);
  if (!total) return;
  const sorted = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 7);

  $("langBarWrap").innerHTML = sorted.map(([l, b]) =>
    `<div class="lang-seg" style="width:${(b/total*100).toFixed(1)}%;background:${langColor(l)}"></div>`
  ).join("");

  $("langLegend").innerHTML = sorted.map(([l, b]) =>
    `<div class="lang-dot">
       <span class="lang-dot-circle" style="background:${langColor(l)}"></span>
       ${l} <span class="lang-pct">${(b/total*100).toFixed(1)}%</span>
     </div>`
  ).join("");
}

// ── Repos ─────────────────────────────────────────────────────────────────────
function repoCard(repo) {
  const langBit = repo.language
    ? `<span class="repo-lang">
         <span class="repo-lang-dot" style="background:${langColor(repo.language)}"></span>
         ${repo.language}
       </span>` : "";
  const desc = repo.description
    ? `<div class="repo-desc">${repo.description}</div>` : "";
  return `
    <a class="repo-card" href="${repo.html_url}" target="_blank" rel="noreferrer">
      <div class="repo-name">${repo.name}</div>
      ${desc}
      <div class="repo-meta">
        ${langBit}
        <span>⭐ ${repo.stargazers_count}</span>
        <span>🍴 ${repo.forks_count}</span>
      </div>
    </a>`;
}

function renderRepos() {
  const { repos } = state;
  $("topRepoGrid").innerHTML  = repos.slice(0, 4).map(repoCard).join("");
  $("allRepoGrid").innerHTML  = repos.map(repoCard).join("");
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
async function fetchHeatmap(username) {
  try {
    // GitHub's contribution data via the user events endpoint (public)
    // We'll build a 53-week grid using repo push event dates + a proxy approach
    // Using the GitHub contributions calendar via scraping-friendly endpoint
    const res = await fetch(
      `https://github.com/users/${username}/contributions`
    );
    const text = await res.text();

    // Parse SVG rect elements from GitHub's contribution graph HTML
    const parser    = new DOMParser();
    const doc       = parser.parseFromString(text, "text/html");
    const rects     = doc.querySelectorAll("table.ContributionCalendar-grid td.ContributionCalendar-day");

    if (rects.length === 0) {
      // Fallback: build from repos pushed_at dates
      buildHeatmapFromRepos();
      return;
    }

    // Build date→count map
    const map = {};
    rects.forEach(td => {
      const date  = td.getAttribute("data-date");
      const count = parseInt(td.querySelector("span")?.textContent || "0") || 0;
      if (date) map[date] = count;
    });

    renderHeatmap(map);

  } catch (_) {
    buildHeatmapFromRepos();
  }
}

function buildHeatmapFromRepos() {
  // Fallback: infer activity from repo pushed_at dates
  const map = {};
  state.repos.forEach(repo => {
    if (repo.pushed_at) {
      const d = repo.pushed_at.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    }
    if (repo.created_at) {
      const d = repo.created_at.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    }
    if (repo.updated_at) {
      const d = repo.updated_at.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    }
  });
  renderHeatmap(map);
}

function renderHeatmap(map) {
  const container = $("heatmapContainer");
  const loading   = $("heatmapLoading");
  const grid      = $("heatmapGrid");

  // Build 53 weeks back from today
  const today = new Date();
  today.setHours(0,0,0,0);

  // Start from the Sunday 53 weeks ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (53 * 7) + 1);
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Build weeks array
  const weeks = [];
  let cur = new Date(startDate);
  const months = {};

  while (cur <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().slice(0, 10);
      const count   = map[dateStr] || 0;
      const level   = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
      // Track months for labels
      const mKey = `${cur.getFullYear()}-${cur.getMonth()}`;
      if (!months[mKey]) months[mKey] = { name: cur.toLocaleString("en", {month:"short"}), weekIdx: weeks.length };
      week.push({ dateStr, count, level, future: cur > today });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const totalContribs = Object.values(map).reduce((a,b) => a+b, 0);

  // Month labels
  const monthLabels = Object.values(months);
  let monthHTML = `<div class="heatmap-months">`;
  monthLabels.forEach((m, i) => {
    const nextIdx = monthLabels[i+1]?.weekIdx ?? weeks.length;
    const width   = (nextIdx - m.weekIdx) * 16; // 13px + 3px gap
    monthHTML += `<div class="heatmap-month-label" style="min-width:${width}px">${m.name}</div>`;
  });
  monthHTML += `</div>`;

  // Day labels
  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  // Cells
  let weeksHTML = `<div class="heatmap-weeks">`;
  weeks.forEach(week => {
    weeksHTML += `<div class="heatmap-week">`;
    week.forEach(cell => {
      if (cell.future) {
        weeksHTML += `<div class="heatmap-cell" style="visibility:hidden"></div>`;
      } else {
        weeksHTML += `<div class="heatmap-cell" data-level="${cell.level}" title="${cell.dateStr}: ${cell.count} contribution${cell.count!==1?'s':''}"></div>`;
      }
    });
    weeksHTML += `</div>`;
  });
  weeksHTML += `</div>`;

  const daysHTML = `<div class="heatmap-days-col">${dayLabels.map(l=>`<span>${l}</span>`).join("")}</div>`;

  grid.innerHTML = `
    <div class="heatmap-total">${totalContribs.toLocaleString()} contributions in the last year</div>
    ${monthHTML}
    <div class="heatmap-body">${daysHTML}<div style="overflow-x:auto">${weeksHTML}</div></div>
  `;

  loading.style.display = "none";
  grid.style.display    = "block";
  state.heatmapData     = map;
}

// ── AI Insights ───────────────────────────────────────────────────────────────
async function fetchAI(user, repos, langMap, totalStars, score) {
  const topLangs = Object.entries(langMap)
    .sort((a,b) => b[1]-a[1]).slice(0,5).map(([l]) => l);
  const topRepos = repos.slice(0,5).map(r =>
    `${r.name} (⭐${r.stargazers_count}${r.description?", "+r.description.slice(0,50):""})`
  ).join("; ");

  const prompt = `You are a senior tech recruiter reviewing a GitHub profile. Be direct, specific, and genuinely useful. Keep it under 200 words total.

Developer: ${user.name || user.login}
Public Repos: ${user.public_repos} | Followers: ${user.followers} | Stars: ${totalStars}
Top languages: ${topLangs.join(", ")}
Notable repos: ${topRepos}
Dev score: ${score}/100

Respond in exactly 3 sections with these emoji headers:
💪 Strengths (2 specific bullet points based on their actual repos/languages)
⚠️ Gaps to fix (2 specific, actionable bullet points)
🎯 Next project to build (one concrete idea tailored to their stack — be specific about what to build and why it will impress recruiters)

No preamble. No closing line. Just the 3 sections.`;

  try {
    const res  = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(b => b.text || "").join("") || "Could not generate insights.";
    state.aiText = text;
    $("aiLoading").style.display = "none";
    $("aiText").style.display    = "block";
    $("aiText").textContent      = text;
  } catch (e) {
    $("aiLoading").textContent = "Could not load AI insights. Check your API key.";
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  $(`tab-${name}`).classList.add("active");

  const btns = document.querySelectorAll(".tab-btn");
  const map  = { overview:0, repos:1, heatmap:2, ai:3 };
  btns[map[name]]?.classList.add("active");
}

// ── Download Profile Card ─────────────────────────────────────────────────────
async function downloadCard() {
  const btn = document.querySelector(".download-btn");
  btn.textContent = "⏳ Generating…";
  btn.disabled = true;

  try {
    buildExportCard();
    const card = $("exportCard");
    card.style.display = "block";

    // Wait a tick for render
    await new Promise(r => setTimeout(r, 200));

    const canvas = await html2canvas(card.querySelector(".ec-bg"), {
      backgroundColor: "#0a1628",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
    });

    card.style.display = "none";

    const link    = document.createElement("a");
    link.download = `gitinsight-${state.username}.png`;
    link.href     = canvas.toDataURL("image/png");
    link.click();
  } catch (e) {
    alert("Could not generate card. Try again.");
    console.error(e);
  } finally {
    btn.textContent = "⬇ Download Profile Card";
    btn.disabled    = false;
  }
}

function buildExportCard() {
  const u      = state.profile;
  const langs  = state.langs;
  const repos  = state.repos;
  const total  = Object.values(langs).reduce((a,b) => a+b, 0);
  const sorted = Object.entries(langs).sort((a,b) => b[1]-a[1]).slice(0,6);
  const stars  = repos.reduce((s,r) => s + r.stargazers_count, 0);

  $("ecAvatar").src   = u.avatar_url;
  $("ecName").textContent  = u.name || u.login;
  $("ecLogin").textContent = "@" + u.login;
  $("ecBio").textContent   = u.bio ? u.bio.slice(0, 80) : "";
  $("ecScore").textContent = state.score;
  $("ecUrl").textContent   = `github.com/${u.login}`;

  $("ecStats").innerHTML = [
    { l:"Repos",     v: u.public_repos },
    { l:"Followers", v: u.followers },
    { l:"Stars",     v: stars },
    { l:"Languages", v: Object.keys(langs).length },
  ].map(s => `
    <div class="ec-stat">
      <div class="ec-stat-v">${s.v}</div>
      <div class="ec-stat-l">${s.l}</div>
    </div>`).join("");

  $("ecLangs").innerHTML = `
    <div class="ec-lang-bar">
      ${sorted.map(([l,b]) =>
        `<div style="width:${(b/total*100).toFixed(1)}%;background:${langColor(l)};border-radius:4px"></div>`
      ).join("")}
    </div>
    <div class="ec-lang-list">
      ${sorted.map(([l,b]) =>
        `<span class="ec-lang-item">
           <span class="ec-lang-dot" style="background:${langColor(l)}"></span>
           ${l} <span style="color:#475569">${(b/total*100).toFixed(1)}%</span>
         </span>`
      ).join("")}
    </div>`;
}

// ── Enter key ─────────────────────────────────────────────────────────────────
document.getElementById("usernameInput").addEventListener("keydown", e => {
  if (e.key === "Enter") analyze();
});
