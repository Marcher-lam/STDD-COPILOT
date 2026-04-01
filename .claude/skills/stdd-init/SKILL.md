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

1. **检查工作区**：如果当前目录不存在 `stdd/`，则创建以下结构：
   ```bash
   mkdir -p stdd/memory stdd/active_feature
   ```
2. **加载已安装的 AI 代码助手插件信息**：
   - 读取 `stdd/memory/plugins.json`（如果不存在则创建空文件）。
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
   - 扫描项目根目录下的 `.claude/skills/` 中所有子目录，读取其中的 `SKILL.md`，提取同样的元信息。
4. **统一合并**：将步骤 2 与步骤 3 收集到的所有 skill 元信息合并，去重后写入统一的 **Skill Registry**：
   - 生成 `stdd/memory/registry.json`（机器可读）和 `stdd/memory/registry.md`（人类可读）。
5. **记录基础约束**：
   - 生成或更新 `stdd/memory/foundation.md`，记录项目的技术栈、包管理器、测试框架以及 **单体测试执行 CLI 模板**（例如 `Unit Test: npx vitest run {file}`），防止后续跑测试时出现盲区。
6. **愿景文档检查（强制前置）**：
   - 检查项目根目录或 `stdd/memory/` 下是否存在 `vision.md`。
   - **如果不存在**：暂停初始化流程，向用户提示：
     ```
     ⚠️ Vision Document 未检测到！

     愿景文档是 STDD 工作流的决策真理来源（Source of Truth）。
     它将指导 AI 在后续所有阶段中做出与项目目标一致的架构决策。

     请选择：
       1. 立即创建 — 回答几个问题后自动生成 vision.md
       2. 跳过 — 不推荐，后续所有需求提案将缺少上下文约束
       3. 从已有文档导入 — 指定一个现有文件作为愿景来源
     ```
   - **如果用户选择 1**：执行交互式问答（最多 5 个问题）生成 `vision.md`，内容包括：
     - 项目概述（做什么、为谁做）
     - 核心目标（最多 5 个）
     - 非目标（明确排除的范围）
     - 关键约束（技术、业务、安全）
     - 技术栈
   - **如果用户选择 2**：记录警告到 `stdd/memory/foundation.md`，标注 `vision: MISSING (user skipped)`
   - **如果用户选择 3**：读取指定文件，提取关键信息写入 `vision.md`
   - **如果已存在**：显示当前愿景摘要，询问是否需要更新
7. **创建核心库**：
   - 初始化 `stdd/memory/components.md`（组件架构追踪日志）。
   - 初始化 `stdd/memory/contracts.md`（前后端公共接口/类型定义簿）。
8. **结束引导**：
   - 输出初始化成功信息，提示用户使用 `/stdd-propose` 开始需求捕获，或使用 `/stdd-turbo` 直接进入全链路自动化模式。
   - 如果 Vision 已创建，额外提示：`✅ 愿景文档已就绪，AI 将基于此做出所有架构决策。`

> **注意**：此步骤在首次运行时会自动完成外部 Skill（包括已安装的 Claude Code、Qwen Code、OpenCode、OpenClaw 等）的注册，后续任何工作流（如 `/stdd-propose`、`/stdd-execute`）都会基于 `stdd/memory/registry.json` 动态构建 Skill Graph，无需手动放置 `SKILL.md`。
