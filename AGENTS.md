# openEuler-docs-website AI Agents

本项目为 openEuler 文档官网，基于 VitePress + Vue 3 + TypeScript 构建。

## 技术栈

| 类别 | 技术选型 |
|------|---------|
| 文档框架 | VitePress（SSG） |
| 前端框架 | Vue 3 Composition API |
| 语言 | TypeScript |
| 构建工具 | Vite（VitePress 内置） |
| 状态管理 | Pinia |
| HTTP 请求 | `shared/axios`（封装实例，**不要自己创建 axios 实例**） |
| UI 组件库 | Element Plus + `@opensig/opendesign` / `@opendesign-plus/components` |
| CSS 预处理器 | SCSS |
| 包管理器 | **pnpm**（不使用 npm / yarn） |
| 代码检查 | ESLint + Prettier |
| 测试框架 | Vitest（jsdom 环境） |
| 国际化 | vue-i18n（翻译文件在 `i18n/`） |
| 路径别名 | `@` → `app/.vitepress/src` |

## 项目结构

```
openEuler-docs-website/
├── app/
│   ├── .vitepress/
│   │   ├── config.ts              # VitePress 配置文件
│   │   ├── plugins/               # 自定义 Vite 插件
│   │   ├── public/                # 公共静态资源
│   │   ├── src/
│   │   │   ├── @types/            # TypeScript 类型定义（type-模块.ts）
│   │   │   ├── api/               # 接口请求（api-模块.ts）
│   │   │   ├── assets/            # 静态资源 / 样式 / mixin / SVG 图标
│   │   │   ├── components/        # 通用组件（PascalCase 命名）
│   │   │   ├── composables/       # 组合式函数（useXxx.ts）
│   │   │   ├── config/            # 项目内配置（版本号、常量等）
│   │   │   ├── i18n/              # i18n 翻译文件（按模块拆分）
│   │   │   ├── layouts/           # 布局组件
│   │   │   ├── shared/            # 共享模块（axios 封装、cookie、login）
│   │   │   ├── stores/            # Pinia 状态管理
│   │   │   ├── utils/             # 工具函数
│   │   │   ├── views/             # 页面视图
│   │   │   ├── App.vue            # 根组件
│   │   │   └── NotFound.vue       # 404 页面
│   │   └── theme/                 # VitePress 主题定制
│   ├── en/                        # 英文文档目录
│   │   ├── docs/                  # 英文文档内容
│   │   └── index.md               # 英文首页
│   ├── zh/                        # 中文文档目录
│   │   ├── docs/                  # 中文文档内容
│   │   └── index.md               # 中文首页
│   ├── vite.config.ts             # Vite 配置（别名、SCSS 全局注入等）
│   └── index.md                   # 首页
├── scripts/                       # 构建 / 开发脚本（文档拉取、目录生成等）
├── tests/                         # 单元测试文件
└── pnpm-workspace.yaml
```

**分层架构：**

1. **Views 层**：页面视图组件，负责页面级布局和数据获取
2. **Components 层**：可复用 UI 组件，只负责展示逻辑
3. **Composables 层**：封装业务逻辑和状态管理，供 Views/Components 复用
4. **Stores 层**：Pinia 状态管理，跨组件共享状态
5. **API 层**：接口请求定义，调用 shared/axios 封装实例
6. **Utils 层**：纯工具函数，无副作用，必须有单元测试

## 规范索引

详细编码规范通过 `.agents/rules/` 目录下的规则文件提供（工具无关，任何 AI 工具按需 Read）：

**编码时必须遵守以下规范文件中的所有规则，不得违反禁止事项：**

| 规范领域 | 文件 |
|---------|---------|
| 编码规范 | [.agents/rules/coding.md](.agents/rules/coding.md) |
| 命名约定 | [.agents/rules/naming.md](.agents/rules/naming.md) |
| 组件规范 | [.agents/rules/components.md](.agents/rules/components.md) |
| TypeScript 规范 | [.agents/rules/typescript.md](.agents/rules/typescript.md) |
| API 规范 | [.agents/rules/api.md](.agents/rules/api.md) |
| 状态管理 | [.agents/rules/state.md](.agents/rules/state.md) |
| 样式规范 | [.agents/rules/styling.md](.agents/rules/styling.md) |
| Composable 规范 | [.agents/rules/composable.md](.agents/rules/composable.md) |
| VitePress 规范 | [.agents/rules/vitepress.md](.agents/rules/vitepress.md) |
| Git 工作流 | [.agents/rules/git.md](.agents/rules/git.md) |

## Skill 索引

`.agents/skills/` 目录下存放可复用的自动化技能定义，每个 Skill 由 `SKILL.md` 描述触发场景和执行步骤：

| Skill | 说明 | 文件 |
|-------|------|------|
| add-docs-version | 为文档网站添加新的文档版本，自动更新相关配置文件 | [.agents/skills/add-docs-version/SKILL.md](.agents/skills/add-docs-version/SKILL.md) |

## 强制要求

1. **包管理器**：只使用 `pnpm`，禁止 `npm install` 或 `yarn add`
2. **类型安全**：所有新代码必须有 TypeScript 类型，尽量避免 `any`
3. **组件格式**：Vue SFC 使用 `<script setup lang="ts">`，不使用 Options API
4. **错误处理**：异步操作必须使用 `try/catch`
5. **代码检查**：提交前执行 `pnpm lint`，确保零错误
6. **样式隔离**：组件样式使用 `<style lang="scss" scoped>`
7. **axios 实例**：始终从 `@/shared/axios` 导入，禁止自行创建 axios 实例
8. **路径别名**：使用 `@/` 路径别名代替相对路径引用 `app/.vitepress/src/` 下的模块
9. **不修改规范**：不得在未经确认的情况下修改 ESLint / Prettier / vite.config.ts / VitePress 配置
10. **文档内容**：`app/zh/` 和 `app/en/` 下的 Markdown 文档内容由脚本从上游仓库拉取，不要手动修改

## 测试要求

- 测试文件放在 `tests/` 目录下，与 `utils/` 下对应文件同名（xxx.test.ts）
- Vitest 配置了 jsdom 环境和 globals，测试中可直接使用 `describe` / `it` / `expect`
- 覆盖率仅统计 `utils/` 目录，要求覆盖率 ≥85%
- 若新增或改动 `utils/` 下文件，必须完善对应的单元测试
- 使用 Mock/Stub 隔离外部依赖

## 常用命令

```bash
pnpm dev          # 启动开发服务器（含文档拉取流程）
pnpm dev:app      # 直接启动开发服务（不拉取文档，需已拉取过）
pnpm dev:clone    # 拉取文档资源
pnpm dev:toc      # 生成文档目录
pnpm build        # 构建（需指定版本）
pnpm preview      # 预览构建结果
pnpm format       # Prettier 格式化
pnpm type-check   # TypeScript 类型检查
pnpm test         # 运行所有测试（vitest --coverage）
pnpm lint         # ESLint 检查
pnpm fix          # ESLint 自动修复
```

## 开发流程

1. **需求理解**：阅读本文件和项目结构
2. **编码实现**：遵循分层架构和强制要求
3. **测试验证**：新增/修改 `utils/` 下文件需编写单元测试
4. **质量检查**：提交前运行 `pnpm lint` 和 `pnpm type-check`，确保通过
