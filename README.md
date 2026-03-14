# ContractChat v3

对话式 EVM 智能合约交互平台，前后端分离全栈工程。

```
contractchat-v3/
├── frontend/          # SolidJS + Tailwind CSS 4 → 部署到 GitHub Pages
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/   Sidebar, TopBar, ToastStack
│   │   ├── pages/        ChatPage, DiscoverPage, HistoryPage, SettingsPage
│   │   ├── stores/       app.js (全局状态)
│   │   └── lib/          api.js (后端客户端)
│   └── vite.config.js
├── backend/           # Node.js Express → 部署到 Railway
│   └── src/
│       ├── index.js
│       ├── db/           SQLite (Skills + 合约白名单 + 配置)
│       ├── routes/       models, abi, skills, chat, discover, admin
│       └── services/     ai.js (Claude + DeepSeek 路由)
└── .github/
    └── workflows/
        └── deploy.yml    GitHub Actions 自动构建部署
```

---

## 本地开发

```bash
# 1. 启动后端
cd backend
cp .env.example .env      # 填入 ANTHROPIC_KEY 等
npm install
npm run dev               # http://localhost:3001

# 2. 启动前端
cd frontend
cp .env.example .env      # 本地开发留空 VITE_API_URL
npm install
npm run dev               # http://localhost:5173

# 3. 运营后台
# 直接访问 http://localhost:3001/admin
# 默认密码: admin123  (务必通过 .env ADMIN_PASSWORD 修改)
```

---

## 部署

### 后端 → Railway

1. 在 [railway.app](https://railway.app) 新建项目，选择从 GitHub 仓库导入
2. 根目录设置为 `backend/`（或在 Railway 界面指定 Root Directory）
3. 在 Railway 的 Variables 面板添加环境变量：

| 变量 | 说明 |
|------|------|
| `ANTHROPIC_KEY` | Anthropic API Key |
| `DEEPSEEK_KEY` | DeepSeek API Key（可选）|
| `ETHERSCAN_KEY` | Etherscan API Key（可选）|
| `ADMIN_PASSWORD` | 运营后台密码 |
| `ADMIN_JWT_SECRET` | JWT 签名密钥（随机字符串）|

4. 部署后 Railway 会分配域名，如 `https://contractchat-xxx.up.railway.app`

### 前端 → GitHub Pages

1. 在 GitHub 仓库 Settings → Pages → Source 选择 `GitHub Actions`
2. 在 Settings → Secrets → Actions 添加：
   - `VITE_API_URL` = Railway 分配的后端域名
3. Push 代码到 `main` 分支，Actions 自动构建部署

---

## 运营后台

访问 `https://your-backend.up.railway.app/admin`

### Skills 配置
每个 Skill 定义一类合约的交互方式：
- **matchABI**：用于自动识别合约类型的函数名列表
- **System Prompt**：注入 AI 的角色指令，影响回复风格
- **快捷操作**：前端显示的快捷问题按钮
- **Schema Fields**：页面加载时自动从链上读取并展示的字段

### 合约白名单
维护「合约发现」页面的官方审核合约列表，可随时增删改，前端实时生效。


---

## 技术选型说明

| 层 | 技术 | 理由 |
|----|------|------|
| 前端框架 | SolidJS | 细粒度响应式，比 React 更轻量，适合状态频繁更新的聊天场景 |
| CSS | Tailwind CSS 4 | Vite 插件零配置，新版性能显著提升 |
| 前端部署 | GitHub Pages | 免费，Actions 自动化，无需服务器 |
| 后端 | Node.js Express | 轻量，原生支持 ES modules |
| 数据库 | SQLite (better-sqlite3) | 零配置，Railway 持久化 Volume 即可，无需外部数据库 |
| 后端部署 | Railway | 支持持久化存储，部署简单，免费额度够用 |
| AI 路由 | 统一抽象层 | 同一接口支持 Claude / DeepSeek，后续扩展只需加一个 provider |
