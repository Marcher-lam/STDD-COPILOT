---
name: stdd-turbo
description: |
  (防疲劳模式) 一键合并执行从需求提出到任务拆解的全部事前阶段，可选择继续执行 TDD 循环到最终提交。
  触发场景：用户说 '/stdd-turbo', 'stdd turbo', '一键模式', 'STDD加速', 'stdd turbo', '全链路', '一键通扫'.
metadata:
  author: Marcher-lam
  version: "2.0.0"
---

# STDD 防疲劳一键通扫 (/stdd-turbo)

目标：在面对中小型修改或有明确边界的需求时，撤销冗长的人机问答与确权步骤，一口气贯穿从需求到任务拆解的全部事前阶段，最终在人工大门处暂停审核。

## 适用场景

| 场景 | 是否适合 Turbo |
|------|---------------|
| 非破坏性重构 | ✅ 非常适合 |
| 单组件新功能 | ✅ 适合 |
| 2-3 个微任务的需求 | ✅ 适合 |
| 涉及多子系统的大型 Epic | ❌ 请用标准流程 |
| 安全敏感的修改 | ❌ 请用标准流程 |

## 前置条件

- 项目已通过 `/stdd-init` 初始化
- `stdd/memory/foundation.md` 已存在（含技术栈信息）

## Turbo 流水线

```
用户需求
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Turbo Pipeline (全自动)                        │
│                                                                  │
│  Phase 1: PROPOSE ── 自动生成需求草案，跳过澄清问答               │
│  Phase 2: SPEC    ── 自动生成 BDD 规格 (Given/When/Then)        │
│  Phase 3: PLAN    ── 自动生成契约 + 架构 + 微任务白板             │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Total Gate  │ ← 人工审核门
                    │  (暂停等待)   │
                    └──────┬───────┘
                           │ 用户确认
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Execute Pipeline (可选)                        │
│                                                                  │
│  Phase 4: EXECUTE ── Ralph Loop TDD 循环                         │
│  Phase 5: DOC      ── 生成最终需求文档                           │
│  Phase 6: COMMIT   ── 原子化提交                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 执行步骤

### Phase 1: 自动需求捕获（聚合 Propose）

分析用户输入的意图，**跳过澄清问答环节**，直接生成需求草案。

1. **Epic 快速检测**：判断需求粒度。若满足以下任一条件，**强行拦截并建议切分**：
   - 涉及 3 个以上独立模块
   - 无法在 1 段 Given/When/Then 中描述核心行为
   - 预估微任务数 > 6 个

2. **边界推断**：AI 即时在内部脑补以下维度的边界决策（不向用户打扰提问）：
   - 边界条件（空值、极限值）
   - 异常场景（网络断开、权限不足）
   - 性能约束（基于 foundation.md 中的技术栈）
   - 排除范围（明确写出"不包含"的内容）

3. **生成产物**：写入 `stdd/changes/<change-name>/proposal.md`

   ```markdown
   # Proposal: <标题>

   ## 原始需求
   <用户原始输入>

   ## Turbo 自动推断
   - 边界决策: <AI推断的边界条件>
   - 异常处理: <AI推断的异常策略>
   - 排除范围: <AI推断的不包含内容>

   ## 范围
   ### 包含
   - <功能点列表>
   ### 不包含
   - <明确排除的内容>

   ## 验收标准
   - [ ] <标准 1>
   - [ ] <标准 2>
   ```

### Phase 2: 自动规格生成（聚合 Spec）

基于 proposal.md 直接生成 BDD 规格，**跳过确认环节**。

1. **提取行为**：从需求草案中提取所有可测试的外部可观察行为

2. **生成 BDD 规格**：写入 `stdd/changes/<change-name>/specs/feature.feature`

   ```feature
   Feature: <功能名称>
     As a <角色>
     I want <功能>
     So that <价值>

     Scenario: <场景 1>
       Given <前置条件>
       When <动作>
       Then <预期结果>

     Scenario: <场景 2 - 边界情况>
       Given <前置条件>
       When <动作>
       Then <预期结果>

     Scenario: <场景 3 - 异常情况>
       Given <前置条件>
       When <动作>
       Then <预期结果>
   ```

3. **规格自检**：
   - 每个 Scenario 必须是独立的（不依赖其他 Scenario 的执行顺序）
   - Given/When/Then 必须使用领域语言（不包含技术实现细节）
   - 至少覆盖：正常路径 + 1 个边界情况 + 1 个异常情况

### Phase 3: 自动规划拆解（聚合 Plan）

基于 BDD 规格直接生成契约和微任务，**跳过人工审批**。

1. **契约对齐**：在 `stdd/memory/contracts.md` 中敲定接口类型

2. **架构速写**：在 `stdd/changes/<change-name>/design.md` 中生成 Mermaid 架构图

3. **微任务拆解**：生成 `stdd/changes/<change-name>/tasks.md`

   **拆解规则**：
   - 每个变更最多 **6 个**原子任务
   - 由外向内推进：E2E → 核心逻辑 → 业务胶水 → UI
   - 每个任务标注 输入/输出/测试文件
   - 每个任务预估 **≤ 30 分钟**

### Phase 4: Total Gate（人工审核门）

**在此刻将控制权交还！** 这是 Turbo 模式唯一的暂停点。

输出审核摘要：

```
╔══════════════════════════════════════════════════════════╗
║                 TURBO 产物审核摘要                        ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  需求草案: stdd/changes/<name>/proposal.md               ║
║  BDD 规格: stdd/changes/<name>/specs/feature.feature     ║
║  契约文件: stdd/memory/contracts.md                      ║
║  架构设计: stdd/changes/<name>/design.md                 ║
║  微任务板: stdd/changes/<name>/tasks.md (N 个任务)       ║
║                                                          ║
║  Turbo 自动推断的决策:                                    ║
║  - <列出 AI 自动做出的关键决策>                           ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  请翻阅以上文件审核。确认无误后:                           ║
║                                                          ║
║  /stdd-execute  → 开始 TDD 执行循环                      ║
║  /stdd:apply    → 直接开始实现                           ║
║                                                          ║
║  如需修改:                                                ║
║  /stdd-propose  → 回到需求阶段重新澄清                    ║
║  /stdd-plan     → 只调整任务拆解                         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

### Phase 5-6: 执行流水线（用户确认后）

用户确认后，可选择进入以下流程：

**选项 A: 完整 TDD 循环** (`/stdd-execute`)
```
对 tasks.md 中每个 [ ] 任务:
  🔴 RED → 🔍 CHECK → 🟢 GREEN → 🧪 MUTATE → 🔵 REFACTOR → ✅
  连续失败 3 次 → 熔断
```

**选项 B: 直接实现** (`/stdd:apply`)
```
跳过严格 TDD 循环，直接按 tasks.md 实现代码。
适用于：紧急修复、简单工具函数、配置文件修改。
```

执行完成后自动触发：
- `/stdd-final-doc` → 生成 `FINAL_REQUIREMENT.md`
- `/stdd-commit` → 原子化 Git 提交

## 产物清单

| 产物 | 路径 | 阶段 |
|------|------|------|
| 需求草案 | `stdd/changes/<name>/proposal.md` | Phase 1 |
| BDD 规格 | `stdd/changes/<name>/specs/feature.feature` | Phase 2 |
| 接口契约 | `stdd/memory/contracts.md` | Phase 3 |
| 架构设计 | `stdd/changes/<name>/design.md` | Phase 3 |
| 微任务白板 | `stdd/changes/<name>/tasks.md` | Phase 3 |
| 实现代码 | `src/` | Phase 5 |
| 测试代码 | `__tests__/` | Phase 5 |
| 最终文档 | `FINAL_REQUIREMENT.md` | Phase 5 |

## 与标准流程的对照

| 标准流程步骤 | Turbo 对应 | 差异 |
|-------------|-----------|------|
| /stdd-propose | Phase 1 | 跳过澄清问答，AI 自动推断 |
| /stdd-clarify | 已合并到 Phase 1 | 不单独提问 |
| /stdd-confirm | 已合并到 Total Gate | 只确认一次 |
| /stdd-spec | Phase 2 | 自动生成，跳过人工审批 |
| /stdd-plan | Phase 3 | 自动拆解，跳过人工审批 |
| /stdd-execute | Phase 5 | 同标准流程 |

## 熔断回退

若 Turbo 在任意阶段检测到问题：

| 问题 | 处理 |
|------|------|
| Epic 过大 | 暂停并建议切分为多个 Turbo 运行 |
| BDD 规格有歧义 | 回退到标准 `/stdd-clarify` 流程 |
| 微任务超过 6 个 | 暂停并建议拆分变更 |
| Total Gate 被驳回 | 根据用户反馈调整对应阶段 |

## Quick Dev 智能路由 (Intelligent Routing)

参考 BMAD-METHOD 的 Quick Dev 模式，自动检测任务复杂度并智能选择执行路径。

### 路由决策矩阵

```
用户输入需求
       │
       ▼
  ┌───────────────────┐
  │  复杂度评估器       │
  │  (Complexity Probe) │
  └───────┬───────────┘
          │
    ┌─────┼──────────────┐
    │     │              │
    ▼     ▼              ▼
  简单   中等          复杂
  (0-4)  (5-8)        (9+)
    │     │              │
    ▼     ▼              ▼
  One-Shot  Standard    Full Ralph
  直接实现   Turbo 模式   Loop
  + 验证    (当前文档)    + Mutation
                           + Enhancement
```

### 复杂度评估信号

| 信号 | 权重 | 说明 |
|------|------|------|
| 新增文件数 | ×2 | 预估需要新增的源文件数量 |
| 影响模块数 | ×3 | 涉及几个独立模块 |
| BDD 场景数 | ×1 | 预估需要多少 Given/When/Then |
| 外部依赖 | ×2 | 是否引入新依赖/服务 |
| 架构变更 | ×5 | 是否需要修改目录结构/层级 |
| 安全敏感 | ×3 | 是否涉及认证/权限/数据 |

### 路由策略

| 评分 | 路径 | 流程 | 跳过 |
|------|------|------|------|
| 0-4 | **One-Shot** | 直接实现 + 测试 | 提案/规格/计划 |
| 5-8 | **Standard Turbo** | Turbo 流水线（当前文档） | 澄清/确认 |
| 9-12 | **Full Turbo** | Turbo + Enhancement | 仅跳过澄清 |
| 13+ | **Standard Flow** | 完整标准流程 | 无跳过 |

### 使用方式

```bash
# 自动路由（默认）
/stdd-turbo "添加 Todo 颜色标签功能"
# → 自动评估: 评分=6 → Standard Turbo

# 强制路由
/stdd-turbo --route=one-shot "修复拼写错误"
/stdd-turbo --route=full "实现 OAuth2 登录"

# 查看路由评估（不执行）
/stdd-turbo --route-preview "添加导出功能"
```

### One-Shot 模式详情

当复杂度评分 ≤4 时，执行极简流程：

```
1. 直接生成测试 + 实现代码（合并为一步）
2. 运行测试确认通过
3. 提交
```

**适用场景**：拼写修复、配置修改、简单工具函数、单行改动

---

## 与其他 Skill 的关系

```
/stdd-init ──► /stdd-turbo ──► [Total Gate] ──► /stdd-execute
                                         ──► /stdd:apply
                 回退: /stdd-propose /stdd-spec /stdd-plan
```
