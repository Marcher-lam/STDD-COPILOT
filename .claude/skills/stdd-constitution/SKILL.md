---
description: STDD Constitution 管理 - 9 篇开发条例的执行与豁免
---

# STDD Constitution (/stdd:constitution)

## 目标
管理和执行 STDD Constitution 的 9 篇开发条例，确保代码质量和开发流程的一致性。

---

## Constitution 概述

STDD Constitution 定义了 9 篇核心开发条例：

| # | 条例名称 | 核心原则 | 强制级别 |
|---|----------|----------|----------|
| 1 | Library-First | 优先使用成熟库 | Warning |
| 2 | TDD | 测试先行 | **Blocking** |
| 3 | Small Commits | 原子提交 | Warning |
| 4 | Code Style | 统一风格 | Warning |
| 5 | Documentation | 文档即代码 | Suggestion |
| 6 | Error Handling | 显式错误处理 | Warning |
| 7 | Security | 安全优先 | **Blocking** |
| 8 | Performance | 性能默认 | Suggestion |
| 9 | CI/CD | 自动化流水线 | **Blocking** |

---

## 使用方式

### 查看条例

```bash
# 查看所有条例概览
/stdd:constitution

# 查看特定条例详情
/stdd:constitution show 2
/stdd:constitution show --article=tdd
```

### 检查合规

```bash
# 检查当前代码是否符合所有条例
/stdd:constitution check

# 检查特定条例
/stdd:constitution check --article=2,7

# 只检查修改的文件
/stdd:constitution check --changed
```

### 豁免管理

```bash
# 申请临时豁免
/stdd:constitution waiver --article=2 --reason="Legacy migration" --days=30

# 查看当前豁免
/stdd:constitution waivers

# 取消豁免
/stdd:constitution waiver --revoke --id=waiver-123
```

---

## 执行流程

```
┌─────────────────────────────────────────────────────────────────┐
│                   Constitution Check Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  用户操作 (Write/Edit)                                           │
│          │                                                       │
│          ▼                                                       │
│  ┌─────────────────┐                                            │
│  │ PreToolUse Hook │                                            │
│  │ (Article 2,4,7) │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│     ┌─────┴─────┐                                               │
│     │           │                                               │
│    PASS        FAIL                                             │
│     │           │                                               │
│     ▼           ▼                                               │
│  执行操作    阻止 + 错误提示                                      │
│     │                                                           │
│     ▼                                                           │
│  ┌─────────────────┐                                            │
│  │PostToolUse Hook │                                            │
│  │(Article 5,6,8)  │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│      建议提示 (不阻止)                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 条例详情

### Article 1: Library-First Development

**核心**: 在编写自定义代码前，优先搜索和使用成熟的库。

**检查时机**: Design 阶段

**违规示例**:
```javascript
// ❌ 手写日期格式化
function formatDate(date) { ... }

// ✅ 使用 date-fns
import { format } from 'date-fns';
```

---

### Article 2: Test-Driven Development

**核心**: 所有生产代码必须在失败的测试之后编写。

**检查时机**: PreToolUse Hook (Blocking)

**Ralph Loop**:
```
🔴 RED → 🔍 CHECK → 🟢 GREEN → 🧪 MUTATE → 🔵 REFACTOR
```

**违规时**:
```
❌ [STDD Guard] Article 2 违规

测试文件不存在: src/__tests__/services/UserService.test.ts

修复方式:
1. 运行: /stdd:red src/services/UserService.ts
2. 创建失败的测试
3. 确认红灯状态
4. 然后再实现功能
```

---

### Article 3: Small, Atomic Commits

**核心**: 每次提交是一个独立、可回滚的变更单元。

**检查时机**: Pre-commit Hook

**提交消息格式**:
```
<type>(<scope>): <subject>

Types: feat|fix|refactor|test|docs|style|chore|perf
```

---

### Article 4: Consistent Code Style

**核心**: 代码风格由工具强制，统一执行。

**检查时机**: PreToolUse Hook

**配置**:
- Prettier (格式化)
- ESLint (Lint)
- TypeScript (类型)

---

### Article 5: Documentation as Code

**核心**: 文档与代码同步，纳入版本控制。

**检查时机**: PostToolUse Hook (建议)

**建议**:
- 为公共 API 添加 JSDoc
- 保持 README 更新
- 使用 OpenAPI 描述 API

---

### Article 6: Error Handling & Logging

**核心**: 错误处理显式、可预测、可恢复。

**检查时机**: PostToolUse Hook (警告)

**检测项**:
- 空的 catch 块
- 未处理的 Promise
- 缺少错误类型的 throw

---

### Article 7: Security by Design

**核心**: 安全从设计阶段考虑。

**检查时机**: PreToolUse Hook (Blocking)

**检测项**:
- 硬编码的密码/API Key
- SQL 注入风险
- eval() 使用
- XSS 风险

---

### Article 8: Performance by Default

**核心**: 性能是设计决策的一部分。

**检查时机**: PostToolUse Hook (建议)

**检测项**:
- N+1 查询模式
- 缺少分页
- 昂贵计算未缓存

---

### Article 9: Continuous Integration & Delivery

**核心**: 所有变更通过自动化流水线。

**检查时机**: CI Pipeline

**质量门禁**:
- 测试覆盖率 > 80%
- Lint 通过
- 类型检查通过
- 构建成功

---

## 豁免管理

### 豁免文件位置

```
stdd/constitution/
├── waivers.yaml      # 临时豁免记录
└── .waivers.lock     # 豁免锁定状态
```

### 豁免格式

```yaml
# stdd/constitution/waivers.yaml
waivers:
  - id: waiver-2024-001
    article: 2
    reason: "Legacy code migration - Phase 1"
    scope: "src/legacy/**"
    expires: 2024-06-01
    approved_by: team-lead
    created_at: 2024-03-15

  - id: waiver-2024-002
    article: 8
    reason: "MVP performance optimization pending"
    scope: "src/api/**"
    expires: 2024-04-15
    approved_by: tech-lead
```

### 豁免限制

```
豁免规则:
- 最长有效期: 90 天
- 必须有审批人
- 必须说明原因
- 到期自动失效
- Blocking 条例 (2, 7, 9) 需要更高级别审批
```

---

## 与 Hook 系统集成

Constitution 通过 Hook 系统在关键节点强制执行：

| Hook | Articles | 行为 |
|------|----------|------|
| PreToolUse | 2, 4, 7 | Blocking/Warning |
| PostToolUse | 5, 6, 8 | Suggestion |
| PreCommit | 1, 3, 4 | Warning |
| PrePush | 2, 9 | Blocking |

---

## 禁用机制

```bash
# 临时禁用 (当前命令)
STDD_HOOKS_DISABLED=1 /stdd:apply

# 全局禁用 (不推荐)
stdd hooks disable

# 禁用特定条例
stdd hooks disable --article=4
```

> ⚠️ **警告**: 禁用 Constitution 检查会绕过安全机制，仅用于特殊情况。

---

## 最佳实践

1. **理解条例意图**: 每个条例都有其价值，不要只为了通过检查
2. **及时处理警告**: Warning 虽然不阻止，但建议尽快修复
3. **合理使用豁免**: 豁免是例外，不是常态
4. **定期审查**: 每月审查豁免状态和 Constitution 适用性

---

> "Constitution is not a set of rules, but a set of principles that guide every decision."
