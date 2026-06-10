# ⚡ GitInsight — GitHub Portfolio Analyzer

> Analyze any GitHub profile in seconds. Get a developer score, language breakdown, contribution heatmap, and AI-powered career insights — all in a single, beautiful page.

![GitInsight Demo](https://raw.githubusercontent.com/YOUR_USERNAME/gitinsight/main/demo.gif)

**[🔗 Live Demo →](https://YOUR_USERNAME.github.io/gitinsight)**

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏆 **Developer Score** | 0–100 score calculated from repos, stars, followers, language diversity & documentation quality |
| 🌐 **Language Distribution** | Animated bar + legend showing tech stack breakdown |
| 📦 **Repository Browser** | All public repos with stars, forks, language, and description |
| 🔥 **Contribution Heatmap** | 53-week GitHub-style activity calendar |
| ✨ **AI Career Insights** | Claude AI gives personalized strengths, gaps, and next project ideas |
| 🖼 **Downloadable Profile Card** | One-click PNG export of your developer card |

---

## 🛠 Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks, no build step)
- **GitHub API:** Fetches user profiles, repos, and contribution data
- **Claude API:** `claude-sonnet-4-20250514` for AI-powered career insights
- **html2canvas:** Client-side PNG generation for the downloadable card
- **Deployment:** GitHub Pages

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/gitinsight.git
cd gitinsight
```

### 2. Open locally

Just open `index.html` with VS Code Live Server — no build step needed.

```
Right-click index.html → Open with Live Server
```

> The Claude AI insights feature requires the Anthropic API to be accessible. The app calls the API directly from the browser using CORS-enabled fetch.

### 3. Deploy to GitHub Pages

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

Then go to **Settings → Pages → Source: main branch / root** and hit Save.

Your site will be live at: `https://YOUR_USERNAME.github.io/gitinsight`

---

## 📁 Project Structure

```
gitinsight/
├── index.html     # Markup & layout
├── style.css      # All styles, animations, export card
├── app.js         # GitHub API, Claude API, heatmap, download logic
└── README.md
```

---

## 🧠 How the Developer Score Works

The score (0–100) is calculated from:

| Signal | Max Points |
|---|---|
| Number of own (non-fork) repos | 25 |
| Total stars earned | 25 |
| Followers | 10 |
| Language diversity | 15 |
| Repos with descriptions (README quality) | 15 |
| GitHub Gists / extra activity | 10 |

---

## 🔥 How the Heatmap Works

GitInsight fetches the public GitHub contributions calendar for any user. If the CORS endpoint is unavailable, it falls back to inferring activity from repo `pushed_at`, `created_at`, and `updated_at` timestamps — giving a best-effort activity map with no authentication needed.

---

## 🤖 AI Insights (Claude API)

The app sends a structured prompt to `claude-sonnet-4-20250514` with:
- Username, repo count, star count, follower count
- Top languages by code volume
- Notable repository names and descriptions
- Computed developer score

Claude responds with **3 sections**: Strengths · Gaps to Fix · Recommended Next Project — all tailored specifically to that developer's actual GitHub data.

---

## 📸 How to Record the Demo GIF

1. Open the live site in Chrome
2. Use [ScreenToGif](https://www.screentogif.com/) (Windows) or [Kap](https://getkap.co/) (macOS)
3. Record: type a username → Analyze → tab through Overview, Heatmap, AI Insights → Download Card
4. Keep it under 30 seconds · Export at 800×500
5. Save as `demo.gif` in the repo root and push

---

## 📌 Roadmap

- [ ] GitHub OAuth login for authenticated rate limits (5000 req/hr)
- [ ] Compare two developer profiles side by side
- [ ] Export full PDF report
- [ ] Shareable profile card link (short URL)
- [ ] Top contributor repositories

---

## 👩‍💻 Author

Built by **Rajeshwari Gajendran**  
[GitHub](https://github.com/Rajeshwari2805) · [LinkedIn](https://linkedin.com/in/YOUR_LINKEDIN)

---

## 📄 License

MIT — free to use, modify, and deploy.

---

> *Built to stand out. Powered by GitHub API + Claude AI.*
