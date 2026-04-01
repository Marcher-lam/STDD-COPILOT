---
name: stdd-help
description: |
  STDD 使用指南与上下文感知帮助系统
  触发场景：用户说 '/stdd-help', 'help', '帮助', '使用指南', '怎么用'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---
# STDD 帮助向导 (/stdd-help)

## 目标
提供上下文感知的帮助系统，告诉用户当前应该做什么、可以做什么、以及下一步是什么。

## 使用方式
- `/stdd-help` - 获取当前状态的帮助
- `/stdd-help <关键词>` - 获取特定主题的帮助
- `/stdd-help 我刚完成X，接下来做什么` - 自然语言查询

---

## 智能状态检测

当用户运行 `/stdd-help` 时，系统会自动检测当前项目状态：

### 检测逻辑

1. **检查 `stdd/` 目录是否存在**
   - 不存在 → 揻示示: "请先运行 `/stdd-init` 初始化工作区"

2. **检查 `01_proposal.md` 是否存在**
   - 不存在 → 提示: "请运行 `/stdd-propose <需求>` 开始捕获需求"

3. **检查 `<!-- Confirmed -->` 标记**
   - 不存在 → 提示: "需求尚未确认，请运行 `/stdd-clarify` 澄清需求，然后 `/stdd-confirm` 确认"

4. **检查 `02_bdd_specs.feature` 是否存在**
   - 不存在 → 提示: "请运行 `/stdd-spec` 生成 BDD 规格"

5. **检查 `03_design.md` 和 `04_tasks.md` 是否存在**
   - 不存在 → 提示: "请运行 `/stdd-plan` 生成实现计划"

6. **检查 `FINAL_REQUIREMENT.md` 是否存在**
   - 不存在 → 提示: "请运行 `/stdd-final-doc` 生成最终需求文档"

7. **检查 `src/` 目录是否有实现文件**
   - 无实现 → 提示: "请运行 `/stdd-apply` 开始实现"

---

## 帮助主题索引

| 关键词 | 帮助内容 |
|--------|----------|
| `init` / `初始化` | `/stdd-init` 的详细说明 |
| `propose` / `需求` | 如何使用 `/stdd-propose` 捕获需求 |
| `clarify` / `澄清` | 需求澄清流程说明 |
| `spec` / `规格` | BDD 规格生成说明 |
| `plan` / `计划` | 架构设计与任务拆解 |
| `execute` / `执行` | TDD 执行循环 (Ralph Loop) |
| `commit` / `提交` | 原子化 Git 提交流程 |
| `turbo` / `快速` | 一键通扫模式 |
| `revert` / `回滚` | 熔断回滚机制 |
| `skill` / `技能` | 外部 AI 插件注册说明 |
| `memory` / `记忆` | 持久化记忆系统说明 |
| `tdd` / `测试` | TDD 最佳实践与 Ralph Loop |

---

## 示例输出

### 场景1: 新项目

```
🔍 STDD 状态检测

当前状态: 未初始化

📋 建议的下一步:
1. 运行 /stdd-init 初始化工作区

💡 快速开始提示:
   /stdd-turbo 实现一个支持 Markdown 导出的 todo-list

📚 相关文档:
   - INSTALL.md - 安装指南
   - USAGE.md - 使用手册
```

### 场景2: 需求已澄清，待确认

```
🔍 STDD 状态检测

当前状态: 需求已澄清，等待确认

📋 建议的下一步:
1. 运行 /stdd-confirm 确认需求
2. 确认后自动进入 /stdd-spec 生成 BDD 规格

⚠️ 注意: 需求未确认前无法进入实现阶段

📊 当前进度: ████████░░░░ 40%
   [init] → [propose] → [clarify] → [confirm] → [spec] → [plan] → [execute] → [commit]
```

### 场景3: 实现中

```
🔍 STDD 状态检测

当前状态: TDD 执行中

📊 任务进度: 3/5 完成
   ✅ 创建 TodoList 组件 UI
   ✅ 实现 addItem 方法
   ✅ 编写 markdown 导出函数
   ⬜ 编写 Vitest 单元测试 (当前)
   ⬜ 实现 localStorage 持久化

📋 建议的下一步:
1. 继续运行 /stdd-execute 完成剩余任务
2. 或运行 /stdd-help tdd 获取 TDD 最佳实践

🔄 Ralph Loop 状态: 绿灯阶段
   红灯 → 静态检查 → 🟢 绿灯 (当前) → 伪变异审查 → 重构
```

---

## 自然语言查询处理

当用户提供自然语言问题时，系统会：

1. **解析意图** - 识别用户想知道什么
2. **上下文关联** - 结合当前项目状态
3. **提供建议** - 给出具体可执行的命令

示例:
```
用户: /stdd-help 我刚完成架构设计，接下来做什么

系统:
根据您的进度 (已完成 03_design.md)，建议的下一步:

1. 运行 /stdd-plan 生成任务拆解 (04_tasks.md)
2. 然后运行 /stdd-final-doc 生成最终需求文档
3. 最后运行 /stdd-apply 开始实现

💡 提示: 可以使用 /stdd-turbo 跳过确认步骤快速完成
```

---

## 退出码

| 退出码 | 含义 |
|--------|------|
| 0 | 正常显示帮助 |
| 1 | 项目未初始化 |
| 2 | 找不到相关主题 |

---

> **调用方式**：在任何阶段运行 `/stdd-help` 即可获取上下文感知的帮助信息。
