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

---

## 🆕 基础增强功能

### 上下文感知帮助系统 (/stdd-help)

不知道下一步该做什么？运行 `/stdd-help` 系统会自动检测当前项目状态：

```bash
/stdd-help
```

**示例输出**:
```
🔍 STDD 状态检测

当前状态: 需求已澄清，等待确认

📋 建议的下一步:
1. 运行 /stdd-confirm 确认需求
2. 确认后自动进入 /stdd-spec 生成 BDD 规格

📊 当前进度: ████████░░░░ 40%
```

**获取特定主题帮助**:
```bash
/stdd-help tdd     # 获取 TDD 流程帮助
/stdd-help init    # 获取初始化帮助
/stdd-help skill   # 获取 Skill Graph 帮助
```

---

### 项目愿景文档 (/stdd-vision)

创建项目愿景文档作为 AI 决策的真理来源：

```bash
/stdd-vision
```

**愿景文档结构**:
- 项目概述与目标
- 非目标 (超出范围的事项)
- 关键约束 (技术/业务/安全)
- 架构决策及理由
- 用户体验原则
- 成功标准

**为什么需要愿景文档**:
- AI 代理首先读取愿景理解项目上下文
- 任务与愿景冲突时，代理会停下来询问
- 确保所有实现与项目目标一致

---

### 用户测试脚本生成 (/stdd-user-test)

从用户旅程自动生成双轨测试脚本：

```bash
/stdd-user-test
```

**生成内容**:
1. **人类测试脚本** - 包含 Think-Aloud 协议的测试指南
2. **AI 代理测试脚本** - 可执行的 Playwright 自动化测试

**理论基础**: Nielsen Norman Group 研究表明测试 3-5 个用户可发现 65-85% 可用性问题

---

## 🔥 高级增强功能

### TDD 守护钩子系统 (/stdd-guard)

通过 Hook 机制强制执行 TDD 原则，防止 AI 跳过测试或过度实现：

```bash
# 启用守护
/stdd-guard on

# 禁用守护
/stdd-guard off

# 查看状态
/stdd-guard status

# 配置规则
/stdd-guard set complexity-threshold 15
```

**守护规则**:
| 规则 | 说明 |
|------|------|
| 测试先行 | 实现前必须有对应的失败测试 |
| 最小实现 | 代码不能超出当前测试覆盖范围 |
| 测试必须失败 | 新测试首次运行必须是红灯 |
| 禁止跳过重构 | 绿灯后必须检查是否需要重构 |

---

### PRP 结构化规划模式 (/stdd-prp)

使用 **What/Why/How/Success** 四要素进行结构化规划：

```bash
/stdd-prp 实现一个支持 Markdown 导出的 todo-list
```

**四要素**:

| 要素 | 问题 | 输出 |
|------|------|------|
| **What** | 做什么？ | 功能描述、用户故事 |
| **Why** | 为什么？ | 业务价值、问题背景 |
| **How** | 怎么做？ | 技术方案、实现路径 |
| **Success** | 成功标准？ | 验收条件、KPI 指标 |

**生成文件**: `.stdd/active_feature/00_prp.md`

---

### 多 Agent 协调器 (/stdd-supervisor)

使用 **Supervisor 层级模式** 协调多个专业 Agent：

```bash
# 启动 Supervisor 模式
/stdd-supervisor 构建一个完整的电商购物车功能

# 指定协调模式
/stdd-supervisor --mode=parallel 实现用户认证模块
/stdd-supervisor --mode=sequential 修复登录 Bug

# 查看 Agent 状态
/stdd-supervisor status
```

**协调模式**:
| 模式 | 说明 | 适用场景 |
|------|------|----------|
| 顺序流水线 | 需求 → Planner → Coder → Tester → Reviewer | 简单功能 |
| 并行协作 | 多个 Coder 同时工作 | 模块独立 |
| 层级委托 | Sub-Supervisor 管理子团队 | 大型项目 |

**Agent 角色**: Planner、Coder、Tester、Reviewer

---

### 三层文档架构 (/stdd-context)

通过分层文档架构优化 Token 使用，实现渐进式上下文加载：

```bash
# 查看当前上下文层级
/stdd-context show

# 刷新特定层
/stdd-context refresh foundation
/stdd-context refresh component
/stdd-context refresh feature

# 导出上下文
/stdd-context export --full > context.md
```

**三层架构**:

| 层级 | 内容 | Token 占用 | 加载时机 |
|------|------|------------|----------|
| **Foundation** | 技术栈、代码规范、测试策略 | ~500 | 项目初始化时 |
| **Component** | 组件拓扑、模块依赖、接口契约 | ~1000 | 跨模块变更时 |
| **Feature** | PRP、BDD 规格、任务列表 | ~2000 | 执行当前功能时 |

---

### 自主迭代循环 (/stdd-iterate)

**Plan-Execute-Reflect-Adjust** 循环，自动检测失败并智能修复：

```bash
# 启动迭代循环
/stdd-iterate

# 带参数启动
/stdd-iterate --max-iterations=15 --failure-threshold=5

# 查看状态
/stdd-iterate status

# 手动干预
/stdd-iterate pause      # 暂停
/stdd-iterate skip       # 跳过当前任务
/stdd-iterate rollback   # 回滚
```

**自适应策略**:
| 迭代范围 | 策略 | 行为 |
|----------|------|------|
| 1-3 | quick_fix | 针对具体错误点修复 |
| 4-6 | deep_analysis | 全面分析代码逻辑 |
| 7+ | rethink | 重新审视实现方案 |

**熔断机制**: 连续失败 3 次自动停止，建议人工干预

---

### 向量数据库记忆 (/stdd-memory)

使用向量数据库存储项目知识，实现语义搜索：

```bash
# 存储记忆
/stdd-memory save "选择 IndexedDB 而非 localStorage，因为支持更大的存储容量"

# 语义搜索
/stdd-memory search "如何处理离线数据存储"

# 查找相似错误
/stdd-memory find-similar "TypeError: Cannot read property"

# 查看统计
/stdd-memory stats

# 导出记忆
/stdd-memory export > memory_backup.json
```

**存储内容**:
- 决策记录 (技术选型理由)
- 代码片段 (最佳实践)
- 错误解决方案 (历史修复)
- 模式知识 (设计模式)

---

### 并行执行模式 (/stdd-parallel)

识别并并行执行独立的子任务：

```bash
# 启动并行执行
/stdd-parallel

# 指定并行度
/stdd-parallel --workers=4

# 选择策略
/stdd-parallel --strategy=module    # 模块并行
/stdd-parallel --strategy=test      # 测试并行
/stdd-parallel --strategy=slice     # 功能切片

# 查看执行计划
/stdd-parallel plan
```

**并行策略**:
| 策略 | 说明 |
|------|------|
| 模块并行 | 前端/后端/数据库同时开发 |
| 测试并行 | 单元/集成/E2E 测试同时运行 |
| 功能切片 | CRUD 操作并行实现 |

**冲突检测**: 自动检测文件冲突并提供解决方案

---

### 多角色协作 (/stdd-roles)

通过角色扮演实现多视角协作：

```bash
# 启动角色协作模式
/stdd-roles start

# 切换角色
/stdd-roles switch product-owner
/stdd-roles switch developer
/stdd-roles switch tester
/stdd-roles switch reviewer

# 角色会议
/stdd-roles meeting "讨论 Todo 导出功能"

# 角色投票
/stdd-roles vote "是否采用 IndexedDB?"
```

**角色定义**:

| 角色 | 职责 | 关注点 |
|------|------|--------|
| 🎯 **Product Owner** | 定义需求、验收功能 | 业务价值、用户体验 |
| 💻 **Developer** | 技术设计、代码实现 | 代码质量、可维护性 |
| 🧪 **Tester** | 编写测试、缺陷报告 | 边界条件、覆盖率 |
| 🔍 **Reviewer** | 代码审查、安全审计 | 代码规范、安全漏洞 |

---

### 质量指标仪表板 (/stdd-metrics)

收集并可视化项目质量指标：

```bash
# 查看完整仪表板
/stdd-metrics

# 查看特定指标
/stdd-metrics code-quality
/stdd-metrics coverage
/stdd-metrics tdd-compliance

# 查看趋势
/stdd-metrics trend --period=7d

# 导出报告
/stdd-metrics export --format=html --output=report.html
```

**指标体系**:

| 类别 | 指标 | 目标值 |
|------|------|--------|
| **代码质量** | 圈复杂度 | ≤ 10 |
| | 代码重复率 | ≤ 3% |
| | 可维护性指数 | ≥ 70 |
| **测试质量** | 语句覆盖率 | ≥ 80% |
| | 分支覆盖率 | ≥ 75% |
| | 变异测试得分 | ≥ 80% |
| **TDD 合规** | 测试先行率 | ≥ 90% |
| | 红灯确认率 | ≥ 95% |
| | 重构执行率 | ≥ 70% |

---

### 自适应学习系统 (/stdd-learn)

从用户反馈学习，持续优化决策质量：

```bash
# 提供反馈
/stdd-learn good "这个实现很简洁"
/stdd-learn bad "代码太复杂了"
/stdd-learn suggest "建议使用函数式编程风格"

# 查看学习状态
/stdd-learn status

# 查看详情
/stdd-learn preferences
/stdd-learn patterns
/stdd-learn templates

# 管理学习数据
/stdd-learn reset
/stdd-learn export > learning-data.json
```

**学习维度**:
- **显式反馈**: 用户的直接评价
- **隐式反馈**: 从用户行为推断
- **执行结果**: 从测试结果学习

**学习效果**:
- 提示模板优化
- 决策权重调整
- 错误模式识别
- 偏好学习

---

## 📋 完整命令参考表

### 核心流程命令

| 命令 | 阶段 | 说明 |
|------|------|------|
| `/stdd-init` | 初始化 | 创建工作区结构，注册外部 AI 插件 |
| `/stdd-propose` | 需求 | 提出原始需求草案 |
| `/stdd-clarify` | 澄清 | 多轮需求澄清 |
| `/stdd-confirm` | 确认 | 用户确认需求 |
| `/stdd-spec` | 规格 | 生成 BDD 规格 (.feature) |
| `/stdd-plan` | 规划 | 架构设计与任务拆解 |
| `/stdd-execute` | 执行 | 启动 Ralph Loop TDD 循环 |
| `/stdd-apply` | 实现 | 从 FINAL_REQUIREMENT.md 启动实现 |
| `/stdd-final-doc` | 文档 | 生成最终需求文档 |
| `/stdd-commit` | 提交 | 原子化 Git 提交 |
| `/stdd-turbo` | 快速 | 一键通扫模式 |

### 基础增强命令

| 命令 | 说明 |
|------|------|
| `/stdd-help [主题]` | 上下文感知帮助系统 |
| `/stdd-vision` | 创建/更新项目愿景文档 |
| `/stdd-user-test` | 生成用户测试脚本 |

### 高级增强命令

| 命令 | 说明 |
|------|------|
| `/stdd-guard` | TDD 守护钩子系统 |
| `/stdd-prp` | PRP 结构化规划模式 |
| `/stdd-supervisor` | 多 Agent 协调器 |
| `/stdd-context` | 三层文档架构 |
| `/stdd-iterate` | 自主迭代循环 |
| `/stdd-memory` | 向量数据库记忆系统 |
| `/stdd-parallel` | 并行执行模式 |
| `/stdd-roles` | 多角色协作系统 |
| `/stdd-metrics` | 质量指标仪表板 |
| `/stdd-learn` | 自适应学习系统 |
| **Skill Graph 引擎** | |
| `/stdd-graph visualize` | 可视化 Skill 依赖图 |
| `/stdd-graph analyze` | 分析当前状态和可执行路径 |
| `/stdd-graph run` | 从指定 Skill 开始执行 |
| `/stdd-graph parallel` | 识别并执行可并行的 Skill |
| `/stdd-graph history` | 查看执行历史 |
| `/stdd-graph replay` | 回放历史执行 |
| `/stdd-graph recommend` | 智能推荐下一步 |

---

## 🚀 Skill Graph 引擎

Skill Graph 引擎是 STDD Copilot 的核心调度系统，提供统一的可视化、编排、调度和追踪能力。

### 可视化 (Visualize)

```bash
# 生成 Mermaid 格式的依赖图
/stdd-graph visualize

# 生成可交互的 HTML 图
/stdd-graph visualize --format=html

# 仅显示特定阶段
/stdd-graph visualize --level=spec
/stdd-graph visualize --level=execute

# 输出到文件
/stdd-graph visualize --output=skill-graph.svg
```

### 分析 (Analyze)

```bash
# 分析当前执行状态
/stdd-graph analyze

# 分析特定 Skill 的依赖关系
/stdd-graph analyze --skill=stdd-execute

# 分析可执行路径
/stdd-graph analyze --paths

# 分析瓶颈
/stdd-graph analyze --bottlenecks
```

分析输出示例：
```
📊 Skill Graph 分析报告

当前执行: stdd-execute (Ralph Loop 迭代 2/3)

已完成:
  ✅ stdd-init → stdd-propose → stdd-clarify → stdd-confirm
  ✅ stdd-spec → stdd-plan

进行中:
  🔄 stdd-execute (测试: 12/18 通过)

阻塞中:
  ⏳ stdd-mutation (等待 stdd-execute)
  ⏳ stdd-validate (等待 stdd-execute)

⚡ 可并行执行:
  • stdd-mock (生成 Mock 文件)
  • stdd-factory (生成测试数据工厂)
```

### 运行 (Run)

```bash
# 从指定 Skill 开始执行
/stdd-graph run stdd-spec

# 从头开始完整流程
/stdd-graph run stdd-init --full

# 跳过已完成的步骤
/stdd-graph run stdd-execute --skip-completed

# 干运行模式（仅显示计划）
/stdd-graph run stdd-plan --dry-run
```

### 并行执行 (Parallel)

```bash
# 识别可并行的 Skill
/stdd-graph parallel --detect

# 执行可并行的 Skill
/stdd-graph parallel --execute

# 设置并行度
/stdd-graph parallel --max-workers=4

# 并行执行特定组
/stdd-graph parallel --group=verification
```

并行执行示例：
```
⚡ 并行执行: verification 组

[Worker 1] stdd-mutation   运行中... 45%
[Worker 2] stdd-validate   运行中... 62%
[Worker 3] stdd-contract   运行中... 78%

总耗时: 12 分 34 秒 (比顺序执行快 50%)
```

### 历史追踪 (History)

```bash
# 查看所有历史
/stdd-graph history

# 查看最近 N 次
/stdd-graph history --last=10

# 查看特定 Skill 的历史
/stdd-graph history --skill=stdd-execute

# 查看失败记录
/stdd-graph history --failures
```

历史输出示例：
```
📜 执行历史

exec-20260327-005  ✅  45 分 12 秒  feature/user-auth
exec-20260327-004  ⚠️  32 分 08 秒  fix/export-markdown
exec-20260327-003  ✅  28 分 45 秒  spec/api-design
exec-20260326-002  ❌  15 分 30 秒  feature/storage
exec-20260326-001  ✅  1 小时 12 分  project/init
```

### 回放 (Replay)

```bash
# 回放指定执行 ID
/stdd-graph replay exec-20260327-004

# 回放并重新执行
/stdd-graph replay exec-20260327-004 --re-execute

# 回放特定步骤
/stdd-graph replay exec-20260327-004 --from=3 --to=5
```

### 智能推荐 (Recommend)

```bash
# 获取下一步推荐
/stdd-graph recommend

# 基于当前上下文推荐
/stdd-graph recommend --context=current

# 基于目标推荐
/stdd-graph recommend --goal="完成用户认证功能"
```

推荐输出示例：
```
🎯 推荐操作 (按优先级)

1. [立即执行] 完成 Ralph Loop 迭代
   原因: 还有 6 个测试未通过
   预计剩余时间: 15 分钟
   置信度: 95%

2. [并行准备] 生成 Mock 和 Factory
   原因: 可与实现并行，加速后续测试
   命令: /stdd-graph parallel --group=testing
   预计时间: 8 分钟 (并行)
   置信度: 88%

3. [预配置] 设置变异测试阈值
   原因: 当前测试覆盖较低，建议调低阈值
   命令: /stdd-mutation config --threshold=70
   置信度: 75%

🔮 最优路径预测:
  完成 stdd-execute (~15 分钟)
  → 并行验证 (~12 分钟)
  → 生成文档 (~5 分钟)
  → 提交代码 (~3 分钟)
  总计: 35 分钟，成功概率 89%
```

---

## 🛡️ 5级防跑偏防御体系

| 级别 | 机制 | 说明 |
|------|------|------|
| 1 | 人机确认门 | 关键决策需人类确认 |
| 2 | 微任务隔离 | 5~6个原子任务，降低上下文迷失 |
| 3 | 连续失败回滚 | 3次失败自动熔断 |
| 4 | 静态质检门 | 语法/类型检查在测试前执行 |
| 5 | 伪变异审查 | 检测骗绿灯断言 |

---

## 🔄 Ralph Loop 严格 TDD

```
┌──────────────────────────────────────────────────────┐
│                    Ralph Loop                        │
│                                                     │
│  🔴 红灯  →  🔍 静态检查  →  🟢 绿灯  →           │
│  生成失败测试    语法/类型检查    最简实现           │
│                                                     │
│  →  🧪 伪变异审查  →  🔵 重构  →  ✅ 完成           │
│     检测骗绿灯断言     优化代码                       │
│                                                     │
│  ⚠️ 连续失败 3 次 → 自动回滚 (/stdd-revert)          │
└──────────────────────────────────────────────────────┘
```

---

## 💡 最佳实践

1. **从愿景开始** - 大型项目先运行 `/stdd-vision` 建立项目共识
2. **善用帮助** - 任何时候运行 `/stdd-help` 获取指导
3. **启用守护** - 运行 `/stdd-guard on` 强制 TDD 纪律
4. **结构化规划** - 使用 `/stdd-prp` 确保 What/Why/How/Success 清晰
5. **信任流程** - 让澄清和确认机制发挥作用
6. **小步快跑** - 使用微任务拆解，避免大爆炸实现
7. **测试先行** - 严格遵守 Ralph Loop，红灯 → 绿灯 → 重构
8. **持续验证** - 完成后运行 `/stdd-user-test` 进行用户测试
9. **监控质量** - 定期运行 `/stdd-metrics` 查看质量指标
10. **持续学习** - 使用 `/stdd-learn` 提供反馈，优化系统
