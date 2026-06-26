# Git 工作流规范

## Commit 消息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>(<scope>): <subject>

[body]

[footer]
```

### Type 类型

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 代码重构（非新功能、非 Bug） |
| `style` | 代码格式调整（不影响逻辑） |
| `docs` | 文档变更 |
| `test` | 测试相关 |
| `chore` | 构建配置、依赖更新等 |
| `perf` | 性能优化 |
| `revert` | 回滚提交 |

### Scope 范围（可选）

使用模块名：`user`, `home`, `search`, `news`, `login`, `developer`, `header`, `footer` 等

### 示例

```bash
# ✅ 新功能
feat(user): add user detail profile page

# ✅ Bug 修复
fix(search): fix search result pagination reset on keyword change

# ✅ 样式调整
style(header): adjust nav spacing on mobile

# ✅ 重构
refactor(api): extract common error handling to shared/axios

# ✅ 依赖更新
chore: upgrade nuxt to 3.21.1

# ✅ 中文（团队内部项目可用中文）
feat(user): 新增用户详情页个人资料
fix(home): 修复首页 banner 在手机端显示异常
```

---

## 分支策略

```
master         # 主分支，与生产环境一致（PR 合并入）
dev            # 开发分支（日常开发基于此分支）
feature/xxx    # 功能开发分支（从 dev 分出）
fix/xxx        # Bug 修复分支
hotfix/xxx     # 紧急修复（从 master 分出）
```

### 分支命名规范

```bash
feature/user-detail-page        # 新功能
fix/search-pagination-bug      # Bug 修复
refactor/api-error-handling    # 重构
hotfix/login-token-expired     # 紧急修复
```

---

## 提交前检查流程

```bash
# 1. 暂存文件
git add packages/website/pages/user/index.vue

# 2. ESLint 检查
pnpm lint

# 3. 确认无错误后提交
git commit -m "feat(user): add user profile component"
```

---

## Pull Request 规范

### PR 标题格式

与 Commit 消息规范一致：
```
feat(user): add user detail page
fix(home): fix banner display on mobile
```

### PR 描述模板

```markdown
## 变更内容

简要描述本次 PR 的改动。

## 变更类型

- [ ] 新功能
- [ ] Bug 修复
- [ ] 代码重构
- [ ] 文档更新
- [ ] 样式调整

## 测试

- [ ] 本地开发环境测试通过
- [ ] SSG 生成（pnpm generate）测试通过
- [ ] lint 检查通过（pnpm lint）

## 相关 Issue

Closes #xxx
```

---

## 禁止事项

- **禁止**直接向 `master`、`dev` 分支推送（通过 PR 合并）
- **禁止** `git push --force`（紧急情况需团队审批）
- **禁止**在 commit 中包含 `console.log` / `debugger`，`packages/scripts` 下的脚本除外
- **禁止**提交构建产物（`.output/`、`node_modules/`,、`dist/`、`.nuxt/`）
- **禁止**提交敏感信息（密钥、token、密码）
- **禁止**提交 `.env`、`.env.local` 等环境变量文件
