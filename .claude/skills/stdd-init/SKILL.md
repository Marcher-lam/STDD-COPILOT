---
name: stdd-init
description: |
  初始化 STDD 工作流、自动发现外部 Skill（包括已安装的 AI 代码助手）。
  触发场景：用户说 '/stdd-init', 'stdd init', '初始化STDD', 'STDD初始化', 'stdd init'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 工作区初始化向导 (/stdd-init)

1. **检查工作区**：如果当前目录不存在 `.stdd/`，则创建以下结构：
   ```bash
   mkdir -p .stdd/memory .stdd/active_feature
   ```
2. **加载已安装的 AI 代码助手插件信息**：
   - 读取 `.stdd/memory/plugins.json`（如果不存在则创建空文件）。
   - 该 JSON 列表的每一项必须包含 `name`, `entry`, `languages`, `frameworks` 等字段，格式与 `SKILL.md` 中的 YAML 前置相同。
   - 示例内容（已在后续步骤生成）：
     ```json
     [
       {
         "name": "claude-code",
         "description": "Claude Code 插件",
         "entry": "/claude-code",
         "languages": ["javascript","typescript","python"],
         "frameworks": ["node","react","vue"]
       }
     ]
     ```
3. **自动发现本地 Skill 目录**（兼容旧方式）：
   - 扫描项目根目录下的 `./.agents/skills/`（或 `./skills/`）中所有子目录，读取其中的 `SKILL.md`，提取同样的元信息。
4. **统一合并**：将步骤 2 与步骤 3 收集到的所有 skill 元信息合并，去重后写入统一的 **Skill Registry**：
   - 生成 `.stdd/memory/registry.json`（机器可读）和 `.stdd/memory/registry.md`（人类可读）。
5. **记录基础约束**：
   - 生成或更新 `.stdd/memory/foundation.md`，记录项目的技术栈、包管理器、测试框架以及 **单体测试执行 CLI 模板**（例如 `Unit Test: npx vitest run {file}`），防止后续跑测试时出现盲区。
6. **创建核心库**：
   - 初始化 `.stdd/memory/components.md`（组件架构追踪日志）。
   - 初始化 `.stdd/memory/contracts.md`（前后端公共接口/类型定义簿）。
7. **结束引导**：
   - 输出初始化成功信息，提示用户使用 `/stdd-propose` 开始需求捕获，或使用 `/stdd-turbo` 直接进入全链路自动化模式。

> **注意**：此步骤在首次运行时会自动完成外部 Skill（包括已安装的 Claude Code、Qwen Code、OpenCode、OpenClaw 等）的注册，后续任何工作流（如 `/stdd-propose`、`/stdd-execute`）都会基于 `.stdd/memory/registry.json` 动态构建 Skill Graph，无需手动放置 `SKILL.md`。
