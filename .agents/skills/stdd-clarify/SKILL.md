---
name: stdd-clarify
description: |
  需求细化与澄清（与用户交互）。
  触发场景：用户说 '/stdd-clarify', 'stdd clarify', '需求澄清', 'STDD澄清', 'clarify需求'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 需求澄清向导 (/stdd-clarify)

1. 读取 `01_proposal.md` 中的原始需求文本。
2. 基于需求自动生成 **3‑5 条关键澄清问题**（例如技术栈、持久化方式、导出方式、是否需要 UI 预览等）。
3. 将每个问题逐条输出到终端，等待用户回复。
4. 将用户的回复写入 `01_proposal.md` 的 **澄清记录** 区块（使用 Markdown 注释 `<!-- Clarify -->` 标记）。
5. 完成所有澄清后，输出 `澄清完成` 并 **自动触发** `/stdd-confirm` 进入需求确认阶段。
