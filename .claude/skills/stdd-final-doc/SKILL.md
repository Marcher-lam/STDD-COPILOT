---
name: stdd-final-doc
description: |
  生成最终需求文档（聚合所有阶段产出）。
  触发场景：用户说 '/stdd-final-doc', 'stdd final doc', '最终文档', 'STDD文档', 'stdd final doc'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 最终需求文档生成向导 (/stdd-final-doc)

## 目的
在整个 STDD Copilot 流程结束后，自动生成一份 **完整、可审阅的需求文档**，该文档汇总了：
1. 原始需求（`01_proposal.md`）
2. 所有澄清轮次及答案（`<!-- Clarify -->` 区块）
3. 需求确认报告（`<!-- Confirmed -->` 标记）
4. BDD 规格（`02_bdd_specs.feature`）
5. 任务拆解清单（`03_tasks.md`）
6. 关键实现摘要（自动抽取自生成的代码文件头部注释）
7. 测试概览（测试用例列表、通过率、伪变异审查结果）
8. 变更日志（从 `stdd-commit` 生成的原子提交信息）
9. 文档版本号与生成时间

## 步骤
1. **读取并合并原始需求**
   - 从 `01_proposal.md` 中提取标题与需求正文。
2. **聚合澄清记录**
   - 搜索 `<!-- Clarify -->` 区块，按轮次 (`Round #N`) 组织，形成 **澄清章节**。
3. **确认状态**
   - 检查 `<!-- Confirmed -->` 或 `<!-- Rejected -->` 标记，若已确认则在文档顶部写入 `需求已确认`，否则写入 `需求未确认` 并终止后续步骤。
4. **插入 BDD 规格**
   - 将 `02_bdd_specs.feature` 前 20 行（或全部）作为 **规格章节**，保持原始 Given/When/Then 格式。
5. **任务清单**
   - 读取 `03_tasks.md`，生成 **任务章节**，每条任务前加序号。
6. **实现摘要**
   - 对 `src/` 目录下的每个实现文件（`.js/.ts/.jsx/.tsx`），读取文件顶部的 `/***` 注释块（若存在），汇总为 **实现概览**。若文件缺少注释，则使用文件路径作为占位。
7. **测试概览**
   - 读取 `src/__tests__/` 下的所有测试文件，统计 **总用例数**、**通过数**、**覆盖率**（从 `coverage-summary.json`，若存在），并列出 **伪变异审查报告**（`stdd-execute` 生成的 `mutation_report.md`，若存在）。
8. **变更日志**
   - 调用 `git log -n 10 --pretty=format:"%h %s"`（限制最近 10 条），将带有 `red:`、`green:`、`refactor:` 前缀的提交收集为 **变更章节**。
9. **文档元信息**
   - 在文档最顶部写入 **版本号**（读取 `STDD_Copilot_Design_Document.md` 中的 `Version:` 行），若不存在则使用 `v1.0.0` 并在后续每次生成时递增次要版本。
   - 写入 **生成时间**（ISO 8601），例如 `2026-03-26T17:32:14+08:00`。
10. **写入最终文档**
    - 将所有章节拼接为 Markdown，写入 `.stdd/active_feature/FINAL_REQUIREMENT.md`。
    - 同时复制一份到项目根目录 `FINAL_REQUIREMENT.md`，便于外部审阅。
11. **自动记录**
    - 调用 Documenter Agent (`/documenter:update`) 自动在设计文档中追加一条更新日志：`生成最终需求文档 vX.Y.Z`。

## 示例输出结构（Markdown）
```markdown
# FINAL REQUIREMENT DOCUMENT (Version: v1.2.3)
*Generated on 2026-03-26T17:32:14+08:00*

## 1. 原始需求
<原始需求正文>

## 2. 需求澄清
### Round #1
- 持久化方式：localStorage
- 导出触发点：按钮
### Round #2
- 最大任务数：500
- 同步频率：网络恢复自动同步

## 3. 需求确认
需求已确认（2026-03-26T17:30:00+08:00）

## 4. BDD 规格
feature
Feature: Todo List
  Scenario: Export markdown
    Given a user has a todo list
    When the user clicks "Export"
    Then a markdown file is generated

## 5. 任务拆解
1. 创建 TodoList 组件 UI
2. 实现 addItem 方法
3. 编写 markdown 导出函数
4. 编写 Vitest 单元测试
5. 实现 localStorage 持久化

## 6. 实现概览
- **src/components/TodoList.jsx** – 实现 UI 与交互逻辑。
- **src/utils/exportMarkdown.ts** – 将任务列表转为 markdown。
- **src/services/storage.ts** – 使用 IndexedDB 持久化。

## 7. 测试概览
- 总用例数：12
- 通过用例数：12
- 覆盖率：92%
- 伪变异审查：全部通过（未发现未被捕获的变异）

## 8. 变更日志
- `a1b2c3d red: add initial BDD spec`
- `d4e5f6g green: implement TodoList component`
- `h7i8j9k refactor: extract storage service`

---
*此文档由 STDD Copilot 自动生成，保持与代码同步。*
```

> **调用方式**：在整个 `stdd-execute` 完成后（或手动在任意阶段），运行 `/stdd-final-doc` 即可生成上述文档。
