# Workflows

本指南介绍 STDD Copilot 的常见工作流程和使用场景。

## 快速参考

### 工作流路径

| 工作流 | 路径 | 适用场景 |
|--------|------|----------|
| **Core** | `/stdd:new → /stdd:apply → /stdd:archive` | 简单明确需求 |
| **Expanded** | `/stdd:new → /stdd:ff → /stdd:apply → /stdd:verify → /stdd:archive` | 复杂需求 |
| **Explore-First** | `/stdd:explore → /stdd:new → /stdd:continue → /stdd:apply → /stdd:archive` | 需求模糊 |
| **Bug-Fix** | `/stdd:new --bug → /stdd:apply --fix → /stdd:archive` | Bug 修复 |
| **Refactor** | `/stdd:new --refactor → /stdd:design → /stdd:apply → /stdd:archive` | 重构任务 |

---

## 工作流 1: Core (简单需求)

最简路径，适合需求明确的场景。

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  /stdd:new   │────►│ /stdd:apply  │────►│/stdd:archive │
│              │     │              │     │              │
│ 创建提案     │     │ TDD 实现     │     │ 归档变更     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 示例

```bash
/stdd:new 实现一个将字符串反转的工具函数

# 系统自动创建:
# - stdd/changes/change-xxx/proposal.md
# - stdd/changes/change-xxx/tasks.md

/stdd:apply

# Ralph Loop 执行:
# 🔴 RED → 🟢 GREEN → 🧪 MUTATION → 🔵 REFACTOR → ✅ DONE

/stdd:archive

# 归档到 stdd/changes/archive/
```

### 适用场景

- ✅ 工具函数实现
- ✅ 简单 CRUD 操作
- ✅ UI 组件开发
- ✅ 配置文件修改

---

## 工作流 2: Expanded (复杂需求)

完整流程，适合需要详细设计的复杂功能。

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  /stdd:new   │────►│   /stdd:ff   │────►│ /stdd:apply  │
│              │     │   或         │     │              │
│ 创建变更     │     │ /stdd:continue│     │ TDD 实现     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌──────────────┐     ┌──────▼───────┐
                     │/stdd:archive │◄────│ /stdd:verify │
                     │              │     │              │
                     │ 归档变更     │     │ 验证一致性   │
                     └──────────────┘     └──────────────┘
```

### 产物生成顺序

```
proposal.md
    │
    │ Intent + Scope + Approach
    ▼
specs/
    │ Delta Specs (ADDED/MODIFIED/REMOVED)
    ▼
design.md
    │ Technical Approach + File Changes
    ▼
tasks.md
    │ Checklist with [ ] items
    ▼
Ready for /stdd:apply
```

### 示例

```bash
# 1. 创建变更
/stdd:new 实现用户认证系统，支持 JWT 和 OAuth2.0

# 2. 生成所有产物
/stdd:ff

# 或逐步生成
/stdd:continue  # → proposal.md
/stdd:continue  # → specs/auth/spec.md
/stdd:continue  # → design.md
/stdd:continue  # → tasks.md

# 3. 实现
/stdd:apply

# 4. 验证
/stdd:verify

# 5. 归档
/stdd:archive
```

### 适用场景

- ✅ 新功能开发
- ✅ API 设计与实现
- ✅ 跨模块变更
- ✅ 安全相关功能

---

## 工作流 3: Explore-First (需求模糊)

先探索，再定义，适合不确定如何实现的情况。

```
┌────────────────┐     ┌──────────────┐     ┌──────────────┐
│ /stdd:explore  │────►│  /stdd:new   │────►│/stdd:continue│
│                │     │              │     │              │
│ 只读探索       │     │ 基于探索创建 │     │ 逐步生成产物 │
└────────────────┘     └──────────────┘     └──────┬───────┘
                                                   │
                      ┌──────────────┐     ┌──────▼───────┐
                      │/stdd:archive │◄────│ /stdd:apply  │
                      └──────────────┘     └──────────────┘
```

### 示例

```bash
# 1. 探索现有系统
/stdd:explore 理解现有的认证系统架构

# 输出: stdd/explorations/explore-xxx.md
# 包含: 项目结构、技术栈、约束、建议

# 2. 基于探索创建变更
/stdd:new 基于探索结果，优化认证流程

# 探索报告自动作为上下文

# 3. 后续同 Expanded 工作流
...
```

### 适用场景

- ✅ 接手新项目
- ✅ 大型重构
- ✅ 技术选型
- ✅ 性能优化

---

## 工作流 4: Bug-Fix (修复缺陷)

针对 Bug 修复的简化工作流。

```
┌────────────────────┐     ┌──────────────────┐     ┌──────────────┐
│ /stdd:new --bug    │────►│ /stdd:apply --fix│────►│/stdd:archive │
│                    │     │                  │     │              │
│ 记录 Bug 信息      │     │ 修复 + 回归测试  │     │ 归档修复     │
└────────────────────┘     └──────────────────┘     └──────────────┘
```

### Bug 报告模板

```markdown
# Bug Report: [Bug 标题]

## Description
[Bug 描述]

## Steps to Reproduce
1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

## Expected Behavior
[期望行为]

## Actual Behavior
[实际行为]

## Environment
- OS: [操作系统]
- Version: [版本]
- Browser: [浏览器]

## Root Cause Analysis
[根本原因分析 - 实现后填写]

## Fix Strategy
[修复策略 - 实现后填写]
```

### 示例

```bash
/stdd:new --bug 登录页面在移动端布局错乱

# 系统创建 bug report 模板

/stdd:apply --fix

# 自动:
# 1. 定位问题
# 2. 修复代码
# 3. 添加回归测试

/stdd:archive
```

---

## 工作流 5: Refactor (重构)

针对代码重构的工作流。

```
┌────────────────────┐     ┌──────────────┐     ┌──────────────┐
│ /stdd:new --refactor│────►│ /stdd:design │────►│ /stdd:apply  │
│                    │     │              │     │              │
│ 定义重构范围       │     │ 设计重构方案 │     │ 增量重构     │
└────────────────────┘     └──────────────┘     └──────┬───────┘
                                                       │
                        ┌──────────────────┐          │
                        │ /stdd:verify     │◄─────────┘
                        │ --behavior-preserved│
                        └────────┬─────────┘
                                 │
                        ┌────────▼───────┐
                        │ /stdd:archive  │
                        └────────────────┘
```

### 重构模板

```markdown
# Refactor Proposal: [重构名称]

## Motivation
[为什么需要重构]

## Scope
### Files Affected
- `src/services/AuthService.ts`
- `src/repositories/UserRepository.ts`

### Behavior Preserved
- [x] 所有现有测试必须通过
- [x] API 接口不变
- [x] 数据格式不变

## Approach
[重构方法]

## Risks
[风险评估]

## Rollback Plan
[回滚计划]
```

---

## 工作流 6: Parallel (并行执行)

识别并并行执行独立的子任务。

```
                    ┌──────────────┐
                    │  /stdd:new   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ /stdd:graph  │
                    │ parallel      │
                    │ --detect      │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐        ┌────▼────┐       ┌────▼────┐
   │ Worker 1│        │ Worker 2│       │ Worker 3│
   │ 前端    │        │ 后端    │       │ 测试    │
   └────┬────┘        └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼───────┐
                    │ /stdd:archive│
                    └──────────────┘
```

### 示例

```bash
/stdd:new 实现完整的用户管理模块

# 分析可并行的任务
/stdd:graph parallel --detect

# 输出:
# ⚡ 可并行组:
#   组 1: 前端组件 + 后端 API + 数据库迁移
#   组 2: 单元测试 + 集成测试 + E2E 测试

# 执行并行
/stdd:graph parallel --execute --max-workers=4
```

---

## 工作流 7: Iteration (迭代循环)

自适应迭代，自动检测失败并智能修复。

```
┌─────────────────────────────────────────────────────────────────┐
│                     Iteration Loop                               │
│                                                                  │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│   │  PLAN    │────►│ EXECUTE  │────►│ REFLECT  │              │
│   │ 制定计划 │     │ 执行任务 │     │ 反思结果 │              │
│   └──────────┘     └──────────┘     └────┬─────┘              │
│        ▲                                 │                      │
│        │           ┌──────────┐          │                      │
│        └───────────│ ADJUST   │◄─────────┘                      │
│                    │ 调整策略 │                                 │
│                    └──────────┘                                 │
│                                                                  │
│   ⚠️ 连续失败 3 次 → 熔断                                         │
│   ✅ 全部成功 → /stdd:archive                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 示例

```bash
/stdd:iterate

# 系统自动:
# 1. 检测失败测试
# 2. 分析失败原因
# 3. 调整实现策略
# 4. 重新执行
# 5. 循环直到成功或熔断
```

---

## 工作流选择指南

```
                    需求输入
                        │
                        ▼
                ┌───────────────┐
                │ 需求是否明确? │
                └───────┬───────┘
                        │
            ┌───────────┴───────────┐
            │                       │
           YES                      NO
            │                       │
            ▼                       ▼
    ┌───────────────┐       ┌───────────────┐
    │ 功能复杂度?   │       │ /stdd:explore │
    └───────┬───────┘       └───────┬───────┘
            │                       │
    ┌───────┴───────┐               │
    │               │               │
   简单            复杂              │
    │               │               │
    ▼               ▼               │
┌─────────┐   ┌─────────┐           │
│  Core   │   │ Expanded│           │
│ Workflow│   │ Workflow│◄──────────┘
└─────────┘   └─────────┘
```

---

## 最佳实践

### 1. 选择正确的工作流

| 场景 | 推荐工作流 |
|------|-----------|
| 工具函数 | Core |
| 新功能 | Expanded |
| 不确定的实现 | Explore-First |
| Bug 修复 | Bug-Fix |
| 代码重构 | Refactor |
| 大型模块 | Parallel |
| 持续优化 | Iteration |

### 2. 使用 Graph 引擎监控

```bash
# 查看当前状态
/stdd:graph analyze

# 获取推荐
/stdd:graph recommend

# 查看历史
/stdd:graph history --last=5
```

### 3. 善用中断和恢复

```bash
# 中断当前工作
# (关闭终端即可，状态自动保存)

# 恢复工作
/stdd:graph history --last=1
/stdd:graph replay <exec-id>
```

### 4. 质量检查点

| 阶段 | 检查项 |
|------|--------|
| Proposal | Scope 是否明确？非目标是否清晰？ |
| Spec | 场景是否可测试？边界情况覆盖？ |
| Design | 技术方案可行？文件变更合理？ |
| Tasks | 任务粒度合适（5~6 个）？依赖正确？ |
| Apply | 测试先行？变异测试通过？ |
| Archive | Specs 合并正确？历史保留完整？ |

---

## 下一步

- [Commands](commands.md) - 所有命令的完整参考
- [Concepts](concepts.md) - 深入理解核心概念
- [Customization](customization.md) - 创建自定义工作流
