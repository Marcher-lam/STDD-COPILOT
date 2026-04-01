---
name: stdd-validate
description: |
  规范验证 - 验证实现与规范的一致性
  触发场景：用户说 '/stdd-validate', 'validate', '验证', '一致性', '规范验证'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---
# STDD 规范验证 (/stdd-validate)

## 目标
验证代码实现与规范文档的一致性，检测偏离行为，确保代码与需求规格保持同步。

---

## 验证维度

```
┌─────────────────────────────────────────────────────────────┐
│                    STDD Validation Matrix                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   BDD 规格 ──────────► 行为验证 ──────────► 代码实现        │
│       │                    │                    │           │
│       │                    ▼                    │           │
│       │              一致性检查                  │           │
│       │                    │                    │           │
│       ▼                    ▼                    ▼           │
│   API 规范 ──────────► 契约验证 ──────────► API 实现        │
│       │                    │                    │           │
│       ▼                    ▼                    ▼           │
│   类型定义 ──────────► 类型验证 ──────────► 数据结构        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 使用方式

### 全面验证
```bash
/stdd-validate
```

### 分维度验证
```bash
# BDD 行为验证
/stdd-validate --behavior

# API 规范验证
/stdd-validate --api

# 类型一致性验证
/stdd-validate --types

# 代码规范验证
/stdd-validate --code-style
```

### Spec Guardian（实现泄漏检测）
```bash
# 检测 BDD 规格中的实现泄漏
/stdd-validate --spec-guardian

# 检测并自动修复
/stdd-validate --spec-guardian --fix
```

### 规范覆盖率
```bash
/stdd-validate --coverage
```

### 生成报告
```bash
# HTML 报告
/stdd-validate --report=html

# Markdown 报告
/stdd-validate --report=md
```

---

## 验证输出

```
🔍 STDD 规范一致性验证

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 BDD 行为验证

  Feature: Todo List

  ✅ Scenario: 创建 Todo
     ├─ Given: 前置条件满足
     ├─ When: 操作实现正确
     └─ Then: 断言验证通过

  ✅ Scenario: 导出 Markdown
     ├─ Given: 前置条件满足
     ├─ When: 操作实现正确
     └─ Then: 断言验证通过

  ⚠️ Scenario: 删除 Todo (部分覆盖)
     ├─ Given: ✅
     ├─ When: ✅
     └─ Then: ⚠️ 缺少 404 边界测试

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 API 规范验证

  OpenAPI: docs/api/openapi.yaml

  ✅ GET /api/todos - 实现与规范一致
  ✅ POST /api/todos - 实现与规范一致
  ⚠️ GET /api/todos/{id} - 响应格式差异
     规范: { id, title, completed, createdAt }
     实现: { id, title, completed, createdAt, updatedAt }
     建议: 更新规范或移除实现中的额外字段

  ❌ DELETE /api/todos/{id} - 端点缺失
     建议: 实现此端点

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 类型一致性验证

  ✅ Todo 类型 - 实现与定义一致
  ✅ CreateTodoRequest - 实现与定义一致
  ⚠️ UpdateTodoRequest - 字段类型差异
     规范: { title?: TodoTitle, completed?: boolean }
     实现: { title?: string, completed?: boolean }
     建议: 使用 TodoTitle 品牌类型

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 规范覆盖率

  ┌──────────────────┬──────────┬──────────┐
  │ 规范类型         │ 覆盖率   │ 状态     │
  ├──────────────────┼──────────┼──────────┤
  │ BDD 行为         │ 85%      │ ⚠️ 良好  │
  │ API 端点         │ 80%      │ ⚠️ 良好  │
  │ 类型定义         │ 95%      │ ✅ 优秀  │
  │ 代码规范         │ 100%     │ ✅ 优秀  │
  └──────────────────┴──────────┴──────────┘

  总体覆盖率: 90% ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 发现的问题 (3 个)

  高优先级:
  1. [API] DELETE /api/todos/{id} 端点未实现
     影响: 无法删除 Todo
     建议: 实现此端点

  中优先级:
  2. [BDD] 删除 Todo 缺少 404 边界测试
     影响: 可能无法正确处理不存在的 Todo
     建议: 添加边界测试

  低优先级:
  3. [API] GET /api/todos/{id} 响应包含额外字段
     影响: 响应与规范不一致
     建议: 更新规范文档

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 建议操作

  1. 运行 /stdd-api-spec generate 实现 DELETE 端点
  2. 运行 /stdd-execute 添加边界测试
  3. 运行 /stdd-api-spec sync 同步规范文档
```

---

## Spec Guardian（实现泄漏检测 Agent）

Spec Guardian 是独立的验证维度，专门检测 BDD 规格中混入的实现细节。良好的规格应只描述行为，不包含技术实现。

### 检测规则

```
┌─────────────────────────────────────────────────────────────┐
│                   Spec Guardian 检测矩阵                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   .feature 文件 ──► 泄漏检测 ──► 泄漏报告                    │
│                          │                                   │
│     ┌────────────────────┼────────────────────┐             │
│     │                    │                    │              │
│     ▼                    ▼                    ▼              │
│   实现术语            内部 API             数据库结构         │
│   类名/表名           函数名/变量名        列名/索引名        │
│   🔴 阻断             🔴 阻断              🟡 警告          │
│                                                              │
│     ┌────────────────────┼────────────────────┐             │
│     │                    │                    │              │
│     ▼                    ▼                    ▼              │
│   超具体数值          私有方法引用          框架特定术语       │
│   端口/超时/ID        private/#/_          React/SQL等       │
│   🟢 建议             🔴 阻断              🟡 警告          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 检测项详细规则

| 检测项 | 模式 | 严重级 | 示例 |
|--------|------|--------|------|
| 类名泄漏 | `UserService`/`TodoRepository` 等大驼峰技术名词 | 🔴 阻断 | `Given UserService 已初始化` |
| 函数名泄漏 | `handleClick`/`processRequest` 等小驼峰 | 🔴 阻断 | `When handleClick 被调用` |
| 数据库术语 | `SELECT`/`INSERT`/`JOIN`/`table`/`column` | 🟡 警告 | `Given users 表有 3 条记录` |
| HTTP 细节 | `POST`/`GET`/`200`/`404`/`/api/` 路径 | 🟡 警告 | `Then 返回 HTTP 200` |
| 框架术语 | `React`/`useState`/`component`/`render` | 🟡 警告 | `Given React 组件已挂载` |
| 超具体数值 | 端口号 `:3000`/超时 `5000ms`/ID `uuid` | 🟢 建议 | `When 连接到 :3000` |
| 私有方法 | `#privateMethod`/`_internal` | 🔴 阻断 | `When #validate 被调用` |
| 技术协议 | `gRPC`/`GraphQL`/`WebSocket`/`Redis` | 🟡 警告 | `Given Redis 缓存已清空` |

### 输出示例

```
🛡️ Spec Guardian — 实现泄漏检测

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 todo-list.feature

  🔴 [阻断] Line 12: "Given TodoRepository 已初始化"
     → 检测到类名泄漏: TodoRepository
     → 建议: "Given Todo 数据源可用"

  🔴 [阻断] Line 18: "When handleClick 被调用"
     → 检测到函数名泄漏: handleClick
     → 建议: "When 用户点击添加按钮"

  🟡 [警告] Line 25: "Then 返回 HTTP 201 Created"
     → 检测到 HTTP 细节: HTTP 201
     → 建议: "Then Todo 创建成功"

  🟢 [建议] Line 30: "When 等待 5000ms 后重试"
     → 检测到超具体数值: 5000ms
     → 建议: "When 短暂等待后重试"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 检测结果: 2 阻断 / 1 警告 / 1 建议
❌ 存在阻断级泄漏，规格需要修正

💡 运行 /stdd-validate --spec-guardian --fix 自动修正
```

### 自动修正（--fix 模式）

自动修正规则：
1. 🔴 阻断级：自动替换为行为描述（保留原文本作为注释供人工审核）
2. 🟡 警告级：自动替换为用户视角描述
3. 🟢 建议级：保留原样，仅在报告中标注

修正结果写入 `stdd/changes/<change>/specs/.pipeline/leak-report.json`：
```json
{
  "feature": "todo-list.feature",
  "total_leaks": 4,
  "blocked": 2,
  "warnings": 1,
  "suggestions": 1,
  "fixes": [
    {
      "line": 12,
      "severity": "blocked",
      "original": "Given TodoRepository 已初始化",
      "fixed": "Given Todo 数据源可用",
      "rule": "class_name_leak"
    }
  ]
}
```

### 工作流集成

```
/stdd-spec 生成 .feature 后
      │
      ├──► Spec Guardian 快速检测（步骤 5c）
      │         │
      │         ├── 通过 ──► 生成测试骨架
      │         └── 阻断 ──► 自动修正 ──► 重新检测
      │
/stdd-validate --spec-guardian（独立运行）
      │
      ├──► 扫描所有 .feature 文件
      ├──► 生成泄漏报告
      └──► --fix 模式自动修正
```

---

## BDD 行为追踪

生成文件: `stdd/active_feature/behavior-coverage.md`

```markdown
# BDD 行为覆盖率报告

## Feature: Todo List

### Scenario: 创建 Todo ✅
- **实现文件**: `src/services/TodoService.ts`
- **测试文件**: `src/__tests__/TodoService.test.ts`
- **覆盖率**: 100%

| 步骤 | 实现状态 | 测试状态 |
|------|----------|----------|
| Given 用户在 Todo 页面 | ✅ | ✅ |
| When 输入标题 "Buy milk" | ✅ | ✅ |
| Then 创建新 Todo | ✅ | ✅ |

### Scenario: 导出 Markdown ✅
- **实现文件**: `src/services/ExportService.ts`
- **测试文件**: `src/__tests__/ExportService.test.ts`
- **覆盖率**: 95%

| 步骤 | 实现状态 | 测试状态 |
|------|----------|----------|
| Given 用户有 3 个 Todo | ✅ | ✅ |
| When 点击导出按钮 | ✅ | ✅ |
| Then 生成 Markdown 文件 | ✅ | ⚠️ (缺格式验证) |

### Scenario: 删除不存在的 Todo ⚠️
- **实现文件**: `src/services/TodoService.ts`
- **测试文件**: ❌ 缺失
- **覆盖率**: 50%

| 步骤 | 实现状态 | 测试状态 |
|------|----------|----------|
| Given Todo 不存在 | ✅ | ❌ |
| When 尝试删除 | ✅ | ❌ |
| Then 返回 404 | ✅ | ❌ |

**建议**: 添加边界测试覆盖
```

---

## API 规范追踪

生成文件: `stdd/active_feature/api-compliance.md`

```markdown
# API 规范合规报告

## OpenAPI 规范: v1.0.0

### 端点合规矩阵

| 端点 | 方法 | 规范定义 | 实现 | 合规性 |
|------|------|----------|------|--------|
| /api/todos | GET | ✅ | ✅ | 100% |
| /api/todos | POST | ✅ | ✅ | 100% |
| /api/todos/{id} | GET | ✅ | ✅ | 90% ⚠️ |
| /api/todos/{id} | PATCH | ✅ | ✅ | 100% |
| /api/todos/{id} | DELETE | ✅ | ❌ | 0% ❌ |
| /api/todos/export | POST | ✅ | ✅ | 100% |

### 响应格式合规

#### GET /api/todos/{id}

规范定义:
<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

```json
{
  "id": "uuid",
  "title": "string",
  "completed": "boolean",
  "createdAt": "datetime"
}
```

实际响应:
<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

```json
{
  "id": "uuid",
  "title": "string",
  "completed": "boolean",
  "createdAt": "datetime",
  "updatedAt": "datetime"  // 额外字段
}
```

**合规性**: 90%
**问题**: 响应包含规范未定义的字段 `updatedAt`
**建议**: 更新规范或移除额外字段
```

---

## 类型合规检查

```bash
/stdd-validate --types --strict
```

输出:
```
📐 类型合规检查 (严格模式)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Todo 类型
   规范: schemas/Todo.schema.json
   实现: src/types/todo.types.ts
   合规: 100%

   字段对照:
   ├─ id: UUID ✅
   ├─ title: string(1-200) ✅
   ├─ completed: boolean ✅
   └─ createdAt: datetime ✅

⚠️ UpdateTodoRequest 类型
   规范: schemas/UpdateTodoRequest.schema.json
   实现: src/types/todo.types.ts
   合规: 85%

   差异:
   └─ title: 规范要求 TodoTitle 品牌, 实现使用普通 string

❌ TodoFilter 类型
   规范: schemas/TodoFilter.schema.json
   实现: ❌ 缺失
   合规: 0%

   建议: 生成类型定义

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 与 STDD 工作流集成

```
/stdd-execute 完成后
    │
    └──► 自动运行 /stdd-validate
            │
            ├──► BDD 行为覆盖检查
            ├──► API 规范合规检查
            └──► 类型一致性检查
                    │
                    ▼
            通过 ──► /stdd-commit
                    │
            失败 ──► 显示问题列表
                    │
                    └──► 建议修复方案
```

---

## Review Process（独立代码审查流程）

参考 AIDD，提供独立的代码审查流程，不依赖 TDD 执行循环。

### 使用方式

```bash
# 对指定文件执行代码审查
/stdd-validate --review --file=src/services/TodoService.ts

# 对当前变更的所有文件执行审查
/stdd-validate --review

# 仅审查安全性
/stdd-validate --review --focus=security

# 仅审查架构一致性
/stdd-validate --review --focus=architecture
```

### 审查维度

| 维度 | 检查项 | 严重级 |
|------|--------|--------|
| **可读性** | 命名清晰度、函数长度、嵌套深度 | 🟡 建议 |
| **安全性** | 输入验证、SQL 注入、XSS、敏感数据暴露 | 🔴 阻断 |
| **架构一致性** | 层级依赖方向、接口契约遵守、模块边界 | 🔴 阻断 |
| **测试质量** | 覆盖率、断言质量、边界测试、骗绿灯检测 | 🟡 建议 |
| **复杂度** | APP Mass 评分、认知复杂度、参数数量 | 🟡 建议 |
| **规范合规** | BDD 场景覆盖、API 合规、类型一致 | 🔴 阻断 |

### 审查报告

```
📋 STDD 代码审查报告

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 src/services/TodoService.ts

  🔴 [安全] Line 42: 直接拼接 SQL 查询
     风险: SQL 注入攻击
     建议: 使用参数化查询

  🟡 [可读性] Line 67-112: 函数过长 (46行)
     建议: 拆分为 validateInput() + processTodo() + saveTodo()

  🟡 [测试] Line 89: 边界条件缺少测试
     场景: title.length = 200 (边界值)
     建议: 添加边界测试

  ✅ [架构] 分层正确: Service → Repository
  ✅ [规范] BDD 场景覆盖率: 100%
  ✅ [复杂度] APP Mass: 2.1 (B 级)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 审查总结: 1 阻断 / 2 建议 / 3 通过
❌ 存在阻断级问题，需要修复后才能合并
```

### 工作流集成

```
/stdd-execute 完成
    │
    ├──► /stdd-validate (规范验证)
    │
    └──► /stdd-validate --review (代码审查)
              │
              ├── 全部通过 ──► /stdd-commit
              ├── 有建议 ───► 显示建议，用户决定是否修复
              └── 有阻断 ───► 必须修复后重新审查
```

---

## Git Hook 集成

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 运行规范验证..."

# 运行快速验证
/stdd-validate --quick

if [ $? -ne 0 ]; then
  echo "❌ 规范验证失败，请先修复问题"
  exit 1
fi

echo "✅ 规范验证通过"
```

### CI/CD 集成
```yaml
# .github/workflows/validate.yml
name: Spec Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - name: Run STDD Validation
        run: /stdd-validate --report=html
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: validation-report
          path: reports/validation/
```

---

## 配置

在 `stdd/memory/validation-config.json` 中：

<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

```json
{
  "enabled": true,
  "strict": false,
  "validators": {
    "behavior": true,
    "api": true,
    "types": true,
    "codeStyle": true
  },
  "thresholds": {
    "behaviorCoverage": 80,
    "apiCompliance": 90,
    "typeCompliance": 95
  },
  "hooks": {
    "preCommit": true,
    "prePush": false,
    "ci": true
  },
  "reporting": {
    "formats": ["html", "md", "json"],
    "outputPath": "reports/validation/"
  }
}
```

---

> **引用**: 借鉴自 Contract Testing 和 Compliance Testing 最佳实践

---

## 3D 验证框架 (3D Verification)

参考 OpenSpec 的三维验证模式，将验证从单维度线性检查升级为三维立体验证框架：

```
┌─────────────────────────────────────────────────────────────┐
│                  3D Verification Framework                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   维度 1: Completeness (完整性)                               │
│   "所有应该验证的东西都验证了吗？"                            │
│   ├── BDD 场景是否全覆盖                                      │
│   ├── API 端点是否全覆盖                                      │
│   ├── 类型定义是否全覆盖                                      │
│   ├── 边界条件是否全覆盖                                      │
│   └── 错误路径是否全覆盖                                      │
│                                                              │
│   维度 2: Correctness (正确性)                                │
│   "验证通过的东西真的正确吗？"                                │
│   ├── 实现行为是否与规格描述一致                              │
│   ├── 断言是否验证了具体值（非 toBeTruthy）                   │
│   ├── 测试是否真正能捕获 Bug（变异测试）                      │
│   ├── API 响应是否与契约一致                                  │
│   └── 类型约束是否在运行时生效                                │
│                                                              │
│   维度 3: Coherence (一致性)                                  │
│   "所有东西之间是否自洽？"                                    │
│   ├── 规格 ↔ 代码 ↔ 测试 三者对齐                            │
│   ├── API 规范 ↔ 实现 ↔ 消费者期望 对齐                      │
│   ├── 类型定义 ↔ 运行时行为 对齐                              │
│   ├── 命名规范 ↔ 领域语言 对齐                                │
│   └── 文档 ↔ 实际行为 对齐                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 使用方式

```bash
# 3D 验证（完整性 + 正确性 + 一致性）
/stdd-validate --3d

# 仅验证特定维度
/stdd-validate --3d --dimension=completeness
/stdd-validate --3d --dimension=correctness
/stdd-validate --3d --dimension=coherence

# 3D 验证 + 自动修复
/stdd-validate --3d --fix
```

### 3D 验证输出

```
📊 3D Verification Report

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Dimension 1: Completeness (完整性) — 87%

  ✅ BDD 场景覆盖: 5/5 (100%)
  ✅ API 端点覆盖: 4/5 (80%)  ← 缺少 DELETE
  ✅ 类型定义覆盖: 100%
  ⚠️ 边界条件覆盖: 3/5 (60%)
     └── 缺少: 空列表、超长标题
  ✅ 错误路径覆盖: 2/3 (67%)

📐 Dimension 2: Correctness (正确性) — 92%

  ✅ 行为一致性: 100%
  ⚠️ 断言质量: 2 处 toBeTruthy 需精确化
  ✅ 变异测试: 85% (≥80% 通过)
  ✅ 契约合规: 100%
  ✅ 类型运行时: 100%

📐 Dimension 3: Coherence (一致性) — 95%

  ✅ 规格↔代码↔测试: 完全对齐
  ✅ API规范↔实现: 完全对齐
  ⚠️ 命名规范↔领域: 1 处不一致
     └── 代码用 'remove', 规格用 'delete'
  ✅ 文档↔实际: 完全对齐

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 3D 综合评分: 91.3%
   ✅ 通过 (阈值: 80%)

   最弱维度: Completeness (87%)
   建议改进: 添加 DELETE 端点 + 边界测试
```

### 与现有验证的关系

| 现有验证 | 3D 维度映射 |
|---------|------------|
| `--behavior` | Completeness + Correctness |
| `--api` | Completeness + Coherence |
| `--types` | Correctness + Coherence |
| `--coverage` | Completeness |
| `--spec-guardian` | Coherence (规格纯度) |
| `--review` | Correctness (代码质量) |
| `--3d` | 全部三维综合 |
