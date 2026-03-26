---
name: stdd-confirm
description: |
  需求确认（用户审阅并同意）。
  触发场景：用户说 '/stdd-confirm', 'stdd confirm', '确认需求', 'STDD确认', 'confirm需求'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 需求确认向导 (/stdd-confirm)

1. 读取 `01_proposal.md`（已包含原始需求 + 澄清记录）。
2. 自动生成 **需求确认报告**：
   - 原始需求
   - 所有澄清答案（从 `<!-- Clarify -->` 区块提取）
   - 初步 BDD 大纲（如果已经生成 `02_bdd_specs.feature`，则摘取前 5 行作为预览）
3. 将报告以 Markdown 格式打印到终端，提示用户输入 **`yes`**（确认）或 **`no`**（不确认）。
4. 根据用户输入：
   - **yes** → 在 `01_proposal.md` 追加 `<!-- Confirmed -->` 标记，输出 `确认通过，进入规格编写`，并**自动调用** `/stdd-spec`。
   - **no**  → 在 `01_proposal.md` 追加 `<!-- Rejected -->` 标记，输出 `需求被拒绝，返回 /stdd-propose 重新描述`，并**自动调用** `/stdd-propose`。
5. 完成后结束本工作流。
