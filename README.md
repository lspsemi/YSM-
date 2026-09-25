# YSM 可视化查看器

基于 Vite、Three.js 和 Lucide 的 YSM 模型网页预览器，提供模型信息展示、三维预览、动画控制及本地模型导入。

## 本地运行

需要 Node.js 20.19+（20.x）或 22.12+；建议使用 Node.js 24。
在本仓库根目录执行：

```sh
npm ci
npm run dev
```

打开终端输出的本地地址。

```sh
npm run build    # 构建到 dist/
npm run preview  # 本地预览构建结果
```

## 目录结构

```text
.
├── src/                       # 页面、样式、渲染与动画逻辑
│   └── model-config.js         # 默认模型路径及相关链接
├── public/
│   ├── favicon.svg
│   └── assets/
│       ├── model-shanami/      # 当前默认模型及其完整配套资源
│       ├── carryon.webp
│       └── tac.webp
├── scripts/
│   └── sync-default-model.mjs  # 可选的本地模型同步工具
├── index.html
├── package.json
├── package-lock.json          # 提交到 Git，供 npm ci 使用
├── .gitattributes
└── .gitignore
```

`node_modules/`、`dist/` 和 `.ref/` 为本地目录，不提交到 Git。
`.ref/` 存放开发参考文件，其中 `legacy-assets/` 保存已停用的模型、压缩包和封面。
旧版查看器、Blockbench、ModernYSM 和模型测试用例保留在仓库外，不属于本项目的运行依赖。

## 默认模型

项目直接读取 `public/assets/model-shanami/`，开发和构建均不需要外层测试用例目录。
需要从本地 `../模型测试用例/[香奈美]-重制/` 更新默认模型时，手动执行：

```sh
npm run sync:model
```

该命令会覆盖默认模型目录中的同名文件，但不会清除目标中的旧文件。
同步后请检查模型资源的 Git 差异。

模型作者及许可信息保留在模型自身的 `ysm.json` 中；当前默认模型声明为 `All Rights Reserved`。
这些资源的许可独立于查看器源码，本仓库未为第三方资源重新授予许可。

## 上传到 GitHub

以本目录（`YSM新版查看器`）作为仓库根目录。
提交源码、`public/`、`scripts/`、README、配置文件和 `package-lock.json`。
依赖、构建输出、参考资料和本地环境配置由 `.gitignore` 排除。

当前静态资源使用 `/assets/` 等根路径。若后续部署到 GitHub Pages 的仓库子路径，需要另外适配资源路径及 Vite 的 `base` 配置。
