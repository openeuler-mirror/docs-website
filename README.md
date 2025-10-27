# docs-website

## 介绍

openEuler 文档前端仓库

## 软件架构

软件架构说明

## 开发教程

本项目使用 pnpm 作为包管理工具

1. 安装依赖

```bash
pnpm i
```

2. 执行开发命令

```bash
pnpm dev
```

3. 命令行中选择构建版本

```bash
? 请选择要额外构建的文档版本：
❯ - 跳过
  - 所有版本 (请谨慎选择)
  - 24.03_LTS_SP2
  - 25.03
  ...
```

4. 等待资源拉取构建完后会启动开发服务

5. 如果之前已经拉取过资源，本次开发不想拉取直接运行开发服务，可执行

```bash
pnpm dev:app
```

## 项目结构

```
docs-website/                      
├── app/                                     
│   ├── .vitepress/                          
│   │   ├── config.ts                        # VitePress 配置文件
│   │   ├── plugins/                         # 自定义插件
│   │   ├── public/                          # 公共静态资源
│   │   ├── src/                             
│   │   │   ├── @types/                      # 类型定义
│   │   │   ├── api/                         # API 接口定义
│   │   │   ├── assets/                      # 静态资源文件
│   │   │   ├── components/                  # 公共组件
│   │   │   ├── composables/                 # 自定义 hook 函数
│   │   │   ├── config/                      # 项目内配置
│   │   │   ├── i18n/                        # 国际化资源文件
│   │   │   ├── layouts/                     # 布局
│   │   │   ├── shared/                      # 共享模块
│   │   │   ├── stores/                      # 状态管理
│   │   │   ├── utils/                       # 工具函数
│   │   │   ├── views/                       # 页面
│   │   │   ├── App.vue                      # 根组件
│   │   │   └── NotFound.vue                 # 404 页面组件
│   │   └── theme/                           # 主题定制
│   ├── en/                                  # 英文文档目录
│   │   ├── docs/                            # 英文文档内容
│   │   └── index.md                         # 英文首页
│   ├── zh/                                  # 中文文档目录
│   │   ├── docs/                            # 中文文档内容
│   │   └── index.md                         # 中文首页
│   └── vite.config.ts                       # Vite 配置文件                             
├── scripts/                                 # 构建和开发相关脚本目录
├── tests/                                   # 测试文件
...
```

## 参与贡献

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request


