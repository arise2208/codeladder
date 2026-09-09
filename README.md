# CodeLadder Frontend

Modern, fast, and responsive web frontend for **CodeLadder**, a competitive programming practice platform, collaborative problem ladder organizer, and Codeforces-style community blogging hub.

Built with **React 18**, **Vite**, **Tailwind CSS**, and **Lucide React**.

---

## Key Features & Pages

### 1. Home & Community Pulse (`/`)
- Interactive landing experience showcasing platform capabilities.
- Live practice statistics: Total Solved, Starred Questions, Practised, and Community Ladders.
- Community Pulse widget displaying trending community blogs and the live Codeforces-style **Recent actions** stream.

### 2. Multi-Platform Problemset (`/problemset`)
- Unified question catalog across **LeetCode**, **Codeforces**, **CodeChef**, and **AtCoder**.
- Instant search by title or problem ID.
- Multi-dimensional filters by platform, difficulty tier, and algorithmic tags.
- One-click global solve tracking with a **2-minute freeze rule** preventing accidental score manipulation.

### 3. Contest Upsolvers
- Dedicated interfaces for upsolving recent contest problems:
  - **Codeforces** (`/contest/codeforces`)
  - **CodeChef** (`/contest/codechef`)
  - **LeetCode** (`/contest/leetcode`)

### 4. Ladders & Community Ladders (`/ladders`)
- **Personal Ladders**: Create and customize ladders (up to 10 ladders per user).
- **Practice & Revision Mode**: Step-by-step problem checklists and intelligent revision candidates.
- **Collaboration**: Invite teammates with `READ` or `WRITE` permissions.
- **Community Ladders Directory**:
  - Discover community-curated ladders with author claims and descriptions.
  - Upvote and downvote ladders (`score = upvotes - downvotes`) protected by the 2-minute freeze rule.
  - Strict 10 public ladders quota. Irreversible publishing protects community links.

### 5. Codeforces-Style Community Blogs (`/blogs`)
- **Notion-Like Reader** (`/blog/:blogId`):
  - LaTeX / KaTeX math formula rendering ($O(N \log N)$ and $$\sum_{i=1}^n$$).
  - Preformatted code syntax highlighting with one-click copy buttons.
  - Markdown callouts (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`).
  - Auto-generated **Table of Contents** navigation bar with smooth scroll anchors.
  - Codeforces-style **comment upvoting & downvoting** with net scores.
- **Notion-Style Editor** (`/blogs/create`, `/blogs/:blogId/edit`):
  - Instant **Slash Commands Menu (`/`)** supporting 12 block types (Headings, Code, Math, Callouts, Lists, Dividers).
  - Live character counter with warning thresholds (max 50,000 characters).
  - Strict **5 blogs per user** quota tracker (`x / 5 Blogs Used`).
- **Feeds & Tabs**:
  - `🔥 Trending`: High-engagement community guides.
  - `🕒 Recent`: Freshly published write-ups.
  - `👤 My Blogs`: Dedicated management panel to edit, monitor, or delete authored articles.
- **Live Recent Actions Sidebar**: Real-time chronological activity feed (`author → blog title / comment`).

### 6. Public User Profiles (`/profile/:username`, `/u/:username`)
- Annual activity calendar heatmap and streak counters (Current Streak, Max Streak, Active Days).
- Connected competitive-programming accounts (LeetCode, Codeforces, CodeChef, AtCoder).
- **Curated Community Ladders**: Public ladders shared by the user with problem counts and upvote badges.
- **Blogs & Community Editorials Showcase**: Articles published by the author with view counts, comment counters, and upvote metrics.
- Combined **Total Upvotes Received** across ladders and blogs.

### 7. Administrative Console (`/admin`)
- Accessible strictly to users with `ADMIN` role.
- Complete user management, ladder inspection, and question catalog maintenance.

---

## Project Structure

```text
codeladder/
├── src/
│   ├── auth/              # AuthContext & token management
│   ├── components/
│   │   ├── layout/        # Navbar, Sidebar, PageHeader
│   │   ├── profile/       # Calendar heatmap, PlatformInsights
│   │   ├── shared/        # NotionRenderer, RecentActionsWidget, LadderCard
│   │   └── ui/            # Button, Input, Modal, Badge, Pagination
│   ├── hooks/             # Custom React hooks (useLadders, useContestData)
│   ├── lib/               # Axios API client & error interceptor
│   ├── pages/             # Route page components
│   ├── App.jsx            # Route definitions & guards
│   └── main.jsx           # Application entry point
├── package.json
└── vite.config.js
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Backend running on `http://localhost:3000`

### Installation
```bash
npm install
```

### Run Development Server
```bash
npm run dev
# Running on http://localhost:5173
```

### Production Build
```bash
npm run build
```

---

## License
MIT
