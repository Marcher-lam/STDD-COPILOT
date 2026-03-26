---
name: stdd-apply
description: |
  开始实现（基于最终需求文档）。
  触发场景：用户说 '/stdd-apply', 'stdd apply', '开始实现', 'STDD实现', 'stdd apply'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 开始实现向导 (/stdd-apply)

## 目标
在 **FINAL_REQUIREMENT.md** 完成后，自动启动实现阶段，依据需求文档生成实现计划并调用外部代码生成 skill，随后进入标准的 TDD 流程。

## 步骤
1. **检查需求文档**
   - 确认 `.stdd/active_feature/FINAL_REQUIREMENT.md` 已存在。
   - 若不存在，输出错误并提示用户先运行 `/stdd-final-doc`。

2. **解析需求文档**
   - 读取 `FINAL_REQUIREMENT.md`，提取以下关键章节：
     - **原始需求**
     - **需求澄清**（所有 `Round #N`）
     - **BDD 规格**（`Feature:` 块）
     - **任务拆解**（编号任务列表）
   - 将上述内容拼装成 **实现输入**（`implementation_input.md`），放在 `.stdd/active_feature/` 中，供后续 skill 使用。

3. **生成实现计划**
   - 调用外部代码助手插件 **Claude Code**（或已注册的任意实现 skill）
   - 使用指令 `/claude-code:implement`，将 `implementation_input.md` 作为上下文传入。
   - 该 skill 负责：
     - 为每个任务生成 **实现概要**（文件路径、主要函数、关键技术点）。
     - 在 `src/` 目录下创建对应的 **骨架文件**（如 `TodoList.jsx`、`exportMarkdown.ts` 等），并在文件顶部写入 `/*** Implementation Summary ***/` 注释块。
   - 将 skill 的返回信息写入 `implementation_summary.md`（位于 `.stdd/active_feature/`），供后续审阅。

4. **启动 TDD 循环**
   - 自动调用核心工作流 `/stdd-execute`，此时 **graph.deps.json** 已包含实现所需的外部测试生成 skill（如 `qwen-code`）以及 UI 预览 skill（如 `openclaw`）。
   - `stdd-execute` 将按照 **红灯 → 绿灯 → 伪变异 → 重构** 的顺序完成代码实现、单元测试生成与执行、代码重构。

5. **记录实现日志**
   - 在 `implementation_log.md` 中追加本次实现的时间戳、涉及的外部 skill 列表以及关键里程碑（如 "生成骨架文件"、 "完成第一轮红灯" 等）。
   - 调用 Documenter Agent (`/documenter:update`) 自动在设计文档中记录本次实现步骤。

6. **结束提示**
   - 输出 **实现已启动** 的提示，提供后续可执行的指令列表：
     - `/stdd-execute`（若需手动重新运行）
     - `/stdd-commit`（查看提交日志）
     - `/stdd-final-doc`（重新生成需求文档）

---
> **使用方式**：在完成 `/stdd-final-doc` 之后，直接运行 `/stdd-apply` 即可开始实现。
> 若想一次性完成全部流程，可使用防疲劳模式 `/stdd-turbo <需求>`，该模式内部已经包含 `/stdd-apply` 步骤。
