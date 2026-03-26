# 📖 STDD Copilot 使用手册

STDD Copilot 完全基于 CLI 中的斜杠指令 (Slash Commands) 驱动。本手册将带你完整走通一次从“一句话需求”到“代码测试全通过”的闭环。

## 🧠 核心概念

1. **Memory (持久化记忆库)**：`.stdd/memory/` 存放项目架构 (`components.md`), 接口契约 (`contracts.md`), 外部扩展列表 (`registry.json`)。
2. **Active Feature (当前工作区)**：`.stdd/active_feature/` 临时存放当前正在激进开发的草案、BDD 规范及微任务清单。
3. **Skill Graph (技能图谱)**：核心 TDD 流程被固化为主干，而外部的 AI 插件(如写测试、写代码、发请求)则被作为节点，根据需求关键词动态挂载到主干上。

---

## 🚀 完整实战流：开发一个支持 Markdown 导出的 Todo-List

### 1. 初始化环境
在项目根目录执行：
```bash
/stdd-init
```
> **系统动作**：建立沙盒结构，自动读取并注册你当前拥有的外部 AI 能力，并确立 `foundation.md`。

### 2. 提出需求草案 (Propose)
```bash
/stdd-propose 编写一个支持 Markdown 导出的简易 todo-list
```
> **系统动作**：生成 `01_proposal.md`。然后**自动**触发澄清环节。

### 3. 多轮需求澄清 (Clarify & Confirm)
系统 AI 会发现需求中的模糊点（例如：持久化用什么？框架用什么？），主动在终端提问：
*(终端交互演示)*
```text
> [系统]: 数据持久化方式是？(localStorage / IndexedDB)
> 你: localStorage
> [系统]: 导出触发点是按钮还是自动保存？
> 你: 按钮
```
一旦系统认为需求已足够清晰（或者到达问答上限），会输出**需求确认报告**。
如果确认无误，输入 `yes`。需求就被固化，防止后续跑偏。

### 4. 生成形式化规格 (Spec)
```bash
/stdd-spec
```
> **系统动作**：将人类语言转化为严谨的 `02_bdd_specs.feature` (Given/When/Then)。

### 5. 任务微隔离拆解 (Plan)
```bash
/stdd-plan
```
> **系统动作**：将 Feature 拆解成可执行的 5~6 个原子任务清单放入 `03_tasks.md`，极大降低后续大模型迷失上下文的概率。

### 6. 进入自动 TDD 执行图谱 (Execute)
```bash
/stdd-execute
```
> **核心魔法时刻**：
> 1. 解析器读取任务，发现你需要React代码和单元测试能力。
> 2. 从注册表中捞出对应的外部 AI 插件（如 `claude-code` 和 `qwen-code`）。
> 3. 装配执行图谱，自动化运转 **Ralph Loop**：
>    - **红灯**：调用外部 QA 插件生成必定失败的测试用例。
>    - **绿灯**：调用外部 Implement 插件编写逻辑，直到测试跑通。
>    - **变异审查**：伪修改代码，看测试是否真能拦截。
>    - **重构**：测试保障下优化代码。

### 7. 汇总与交付 (Final Doc & Commit)
如果执行成功后：

```bash
/stdd-final-doc
```
> 聚合所有阶段数据（需求、问答、测试结果），生成精美的 `FINAL_REQUIREMENT.md` 交付物。

```bash
/stdd-commit
```
> 自动对成果进行精细的 `red:`, `green:`, `refactor:` 前缀原子化 Git Commit。

---

## ⚡ 进阶操作

### 防疲劳“一键”模式 (Turbo)
针对你完全有把握的极简需求，或者已经预热好的项目，支持一键通扫：
```bash
/stdd-turbo 实现一个将字符串反转的工具函数
```
系统会尽量跳过繁琐的人类 Confirm 门，一路帮你撸到代码提交。

### 中断与回滚
当大模型在 `execute` 阶段反复出现幻觉，无法修正错误（连续失败 3 次以上）时，系统会自动停止并提示：
- 人工检查当前代码状态
- 使用 `git stash` 或手动回滚到上一个稳定状态
- 重新思考实现路径后再次执行 `/stdd-execute`
