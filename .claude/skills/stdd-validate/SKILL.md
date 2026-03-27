---
description: 规范验证 - 验证实现与规范的一致性
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

## BDD 行为追踪

生成文件: `.stdd/active_feature/behavior-coverage.md`

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

生成文件: `.stdd/active_feature/api-compliance.md`

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
```json
{
  "id": "uuid",
  "title": "string",
  "completed": "boolean",
  "createdAt": "datetime"
}
```

实际响应:
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

在 `.stdd/memory/validation-config.json` 中：

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
