# 📦 STDD Copilot 安装指南

STDD Copilot 采用轻量化、本地化的安装方式，兼容 macOS、Linux 和 Windows (WSL)。

## 1. 前置依赖

在安装 STDD Copilot 之前，请确保您的系统已安装以下环境：

- **Node.js**: `>= 20.0.0` (推荐 LTS 版本)
- **Git**: 任意现代版本
- **包管理器**: `npm` 或 `yarn`
- **(可选) 外部 AI 代码助手插件**: 如 Claude Code, Qwen Code, OpenClaw 等。本框架支持动态发现这些插件。

## 2. 源码安装 (推荐)

最直接的方法是克隆仓库到本地，并链接为全局命令。

### 第一步：克隆仓库
```bash
git clone https://github.com/Marcher-lam/STDD-COPLOIT.git ~/stdd-copilot
cd ~/stdd-copilot
```

### 第二步：安装 Node 依赖
目前项目主要是由 Markdown 工作流和内部 JS 脚本驱动：
```bash
npm install
```

### 第三步：配置全局 CLI (可选)
为了能够在你自己的任意业务项目中使用 `/stdd-*` 指令：
```bash
npm link
```
*(注意：需要确保 `package.json` 中配置了 bin 字段，指向 CLI 入口文件。如果没有全局 CLI，可以直接在 STDD 项目目录下运行测试)*

## 3. 在目标项目中初始化

进入你想要进行 AI 辅助开发的**业务项目目录**：

```bash
cd /path/to/your/project
/stdd-init
```

初次运行 `/stdd-init` 时，系统会自动：
1. 创建 `.stdd/memory` 与 `.stdd/active_feature` 目录结构。
2. 扫描系统或本地目录下已安装的 AI 插件（基于 `plugins.json` 或 `.agents/skills` 下的 `SKILL.md`）。
3. 统一生成 `registry.json`，完成外部 Skill 的注册。
4. 生成项目基础约束日志 `foundation.md`（如记录当前使用的测试框架）。

## 4. 关于外部插件 (AI Skills) 接入

STDD Copilot 不绑定单一的大模型通道，而是将其他完善的代码助手包装为 **Skill**。

当您在官方渠道安装了支持 STDD 规范的 Claude Code 或 Qwen Code 插件时，它们会将自己的能力清单写入：
`~/.stdd_plugins/plugins.json` 或项目级 `.stdd/memory/plugins.json`。

`stdd-init` 会自动检测并把对应工具（例如提供前端预览的 `openclaw`，主打代码重构的 `claude-code`）无缝编排进 TDD 工作流的图中。
