---
name: stdd-mutation
description: |
  变异测试 - Stryker 风格的测试质量验证
  触发场景：用户说 '/stdd-mutation', 'mutation', '变异测试', '测试质量', 'stryker'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---
# STDD 变异测试 (/stdd-mutation)

## 目标
通过 **Mutation Testing** 验证测试质量，检测"骗绿灯"断言，确保测试真正能捕获代码缺陷。

---

## 核心概念

```
┌─────────────────────────────────────────────────────────────┐
│                    Mutation Testing Flow                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   原始代码 ────► 变异代码 ────► 运行测试 ────► 结果        │
│       │            │              │              │           │
│       │            │              │              │           │
│       │       ┌────┴────┐         │              │           │
│       │       │  变异   │         │              │           │
│       │       │  算子   │         │              │           │
│       │       └────┬────┘         │              │           │
│       │            │              │              │           │
│   ┌───┴───┐   ┌────┴────┐   ┌────┴────┐   ┌────┴────┐     │
│   │ 源码  │   │ 变异体  │   │ 测试    │   │ 存活?   │     │
│   └───────┘   └─────────┘   └─────────┘   └─────────┘     │
│                                                              │
│   测试质量 = 杀死的变异体 / 总变异体 × 100%                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 变异算子

| 算子类型 | 变异示例 | 说明 |
|----------|----------|------|
| **Arithmetic** | `a + b` → `a - b` | 算术运算符 |
| **Conditional** | `if (a > b)` → `if (a <= b)` | 条件边界 |
| **Boolean** | `true` → `false` | 布尔值替换 |
| **String** | `"hello"` → `""` | 字符串边界 |
| **Null** | `return obj` → `return null` | 空值检查 |
| **Logical** | `&&` → `\|\|` | 逻辑运算符 |
| **Return** | `return x` → `return` | 返回值移除 |
| **Statement** | 删除整行 | 语句删除 |

---

## 使用方式

### 运行变异测试
```bash
# 对整个项目运行
/stdd-mutation run

# 对特定文件运行
/stdd-mutation run --file=src/services/TodoService.ts

# 对特定函数运行
/stdd-mutation run --function=exportMarkdown
```

### 查看报告
```bash
# 终端报告
/stdd-mutation report

# HTML 报告
/stdd-mutation report --html

# 保存报告
/stdd-mutation report --output=mutation-report.html
```

### 配置变异
```bash
# 设置变异算子
/stdd-mutation config --operators=arithmetic,conditional

# 排除文件
/stdd-mutation config --exclude=**/*.test.ts

# 设置阈值
/stdd-mutation config --threshold=80
```

---

## 变异报告

```bash
/stdd-mutation report
```

输出:
```
🧬 STDD 变异测试报告

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 总体统计

┌─────────────────┬──────────┬─────────────────┐
│ 指标             │ 数值     │ 状态            │
├─────────────────┼──────────┼─────────────────┤
│ 变异体总数       │ 156      │                 │
│ 已杀死          │ 142      │                 │
│ 存活            │ 10       │ ⚠️ 需关注       │
│ 超时            │ 4        │                 │
│ 编译错误        │ 0        │                 │
├─────────────────┼──────────┼─────────────────┤
│ 变异测试得分     │ 91.0%    │ ✅ 优秀         │
└─────────────────┴──────────┴─────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 存活的变异体 (需要加强测试)

1. src/services/ExportService.ts:42
   原始: return todos.map(t => `- [${t.completed ? 'x' : ' '}] ${t.title}`)
   变异: return todos.map(t => `- [${t.completed ? ' ' : 'x'}] ${t.title}`)
   影响: 完成状态反转
   建议: 添加完成状态验证测试

2. src/services/TodoService.ts:67
   原始: if (title.length > 200) throw new Error('Title too long')
   变异: if (title.length >= 200) throw new Error('Title too long')
   影响: 边界条件变化
   建议: 添加边界值测试 (title.length = 200)

3. src/services/TodoService.ts:89
   原始: return this.storage.get('todos') || []
   变异: return this.storage.get('todos') || [{} as Todo]
   影响: 默认值返回非空数组
   建议: 测试空存储场景

4. src/utils/markdown.ts:15
   原始: return content.trim()
   变异: return content
   影响: 移除 trim 处理
   建议: 测试首尾空白处理

5. src/services/ExportService.ts:78
   原始: anchor.download = filename || 'export.md'
   变异: anchor.download = 'export.md'
   影响: 忽略自定义文件名
   建议: 测试自定义文件名

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 文件覆盖率详情

┌────────────────────────────────┬───────┬───────┬─────────┐
│ 文件                           │ 变异体│ 得分  │ 状态    │
├────────────────────────────────┼───────┼───────┼─────────┤
│ ExportService.ts               │ 45    │ 96%   │ ✅      │
│ TodoService.ts                 │ 62    │ 89%   │ ⚠️     │
│ StorageService.ts              │ 28    │ 100%  │ ✅      │
│ markdown.ts                    │ 21    │ 81%   │ ⚠️     │
└────────────────────────────────┴───────┴───────┴─────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 改进建议

高优先级:
1. [markdown.ts] 添加空白字符处理测试
2. [TodoService.ts] 添加边界值测试 (length = 200)

中优先级:
3. [ExportService.ts] 添加完成状态反转测试
4. [TodoService.ts] 测试空存储默认值

建议命令:
  /stdd-mutation generate-test --mutant=1
  /stdd-mutation generate-test --mutant=2
```

---

## 生成的变异测试

针对存活的变异体，自动生成测试：

```bash
/stdd-mutation generate-test --mutant=1
```

生成文件: `src/__tests__/mutations/export-markdown-completion.mutation.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ExportService } from '../../services/ExportService';
import { createTodo } from '../factories/todo.factory';

describe('Mutation Test: Export Markdown Completion Status', () => {
  const exportService = new ExportService();

  it('should correctly mark completed todos with [x]', () => {
    const completedTodo = createTodo({ completed: true });
    const result = exportService.exportMarkdown([completedTodo]);

    expect(result).toContain('[x]');
    expect(result).not.toContain('[ ]');
  });

  it('should correctly mark pending todos with [ ]', () => {
    const pendingTodo = createTodo({ completed: false });
    const result = exportService.exportMarkdown([pendingTodo]);

    expect(result).toContain('[ ]');
    expect(result).not.toContain('[x]');
  });

  it('should handle mixed completion status', () => {
    const todos = [
      createTodo({ title: 'Task 1', completed: true }),
      createTodo({ title: 'Task 2', completed: false }),
      createTodo({ title: 'Task 3', completed: true }),
    ];

    const result = exportService.exportMarkdown(todos);

    const lines = result.split('\n');
    expect(lines[0]).toContain('[x]');
    expect(lines[1]).toContain('[ ]');
    expect(lines[2]).toContain('[x]');
  });
});
```

---

## 骗绿灯检测

变异测试可以检测以下骗绿灯断言：

### 问题断言
```typescript
// ❌ 骗绿灯: 太宽泛
expect(result).toBeTruthy();

// ❌ 骗绿灯: 不验证具体值
expect(result).toBeDefined();

// ❌ 骗绿灯: 总是通过
expect(result !== undefined || result === undefined).toBe(true);

// ❌ 骗绿灯: 不验证长度
expect(array.length).toBeGreaterThanOrEqual(0);
```

### 检测报告
```
🔍 骗绿灯断言检测

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ 可疑断言 (2 处)

1. src/__tests__/TodoService.test.ts:45
   问题: expect(result).toBeTruthy()
   存活变异体: 3 个
   建议: 使用更具体的断言
   修复: expect(result.title).toBe('Expected Title')

2. src/__tests__/ExportService.test.ts:78
   问题: expect(markdown).toBeDefined()
   存活变异体: 2 个
   建议: 验证具体内容
   修复: expect(markdown).toContain('- [ ]')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 自动修复建议

/stdd-mutation fix-assertion --file=TodoService.test.ts --line=45
/stdd-mutation fix-assertion --file=ExportService.test.ts --line=78
```

---

## 变异算子详情

### 自定义变异算子

在 `stdd/mutation/operators.json` 中：

<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

```json
{
  "operators": [
    {
      "name": "ArithmeticOperatorReplacement",
      "enabled": true,
      "mutations": [
        { "from": "+", "to": "-" },
        { "from": "-", "to": "+" },
        { "from": "*", "to": "/" },
        { "from": "/", "to": "*" }
      ]
    },
    {
      "name": "ConditionalBoundary",
      "enabled": true,
      "mutations": [
        { "from": ">", "to": ">=" },
        { "from": "<", "to": "<=" },
        { "from": ">=", "to": ">" },
        { "from": "<=", "to": "<" }
      ]
    },
    {
      "name": "BooleanLiteralReplacement",
      "enabled": true,
      "mutations": [
        { "from": "true", "to": "false" },
        { "from": "false", "to": "true" }
      ]
    },
    {
      "name": "StringLiteralReplacement",
      "enabled": true,
      "mutations": [
        { "from": "\"(.+)\"", "to": "\"\"" },
        { "from": "'(.+)'", "to": "''" }
      ]
    },
    {
      "name": "NullReturn",
      "enabled": true,
      "mutations": [
        { "from": "return (.+)", "to": "return null" }
      ]
    }
  ]
}
```

---

## 双模式系统

STDD 变异测试提供两种模式：**快速模式**（伪变异，AI 驱动）和**深度模式**（Stryker 真实工具集成）。

```
┌─────────────────────────────────────────────────────────────┐
│                  Mutation Testing 双模式                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────┐       ┌─────────────────┐            │
│   │  Quick Mode      │       │  Deep Mode       │            │
│   │  (伪变异/AI驱动)  │       │  (Stryker 集成)  │            │
│   ├─────────────────┤       ├─────────────────┤            │
│   │ ⚡ 秒级完成      │       │ 🔬 分钟级完成     │            │
│   │ AI 模拟变异体    │       │ 真实代码变异      │            │
│   │ 8 种内置算子     │       │ Stryker 全量算子  │            │
│   │ Ralph Loop 内置  │       │ CI/CD 独立运行    │            │
│   │ 适合开发时使用   │       │ 适合合并前验证    │            │
│   └─────────────────┘       └─────────────────┘            │
│                                                              │
│   自动选择逻辑:                                               │
│   ├── Stryker 已安装 → 默认使用 Deep Mode                     │
│   ├── Stryker 未安装 → 降级到 Quick Mode                      │
│   └── 可通过 --mode=quick|deep 强制指定                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Deep Mode（Stryker 集成）

#### 安装检测

运行 `stdd-mutation` 时自动检测 Stryker 是否已安装：

```bash
# 检测命令
npx stryker --version 2>/dev/null
```

| 语言/框架 | Stryker 包 | 配置文件 |
|-----------|-----------|---------|
| JavaScript/TypeScript | `stryker-cli` + `@stryker-mutator/*` | `stryker.conf.json` |
| Python | `stryker-python` (实验) | `stryker.ini` |

#### 自动生成 Stryker 配置

若未存在 `stryker.conf.json`，STDD 自动生成：

```bash
/stdd-mutation init-stryker
```

生成文件 `stryker.conf.json`：
```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "json", "dashboard"],
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/types/**"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  },
  "concurrency": 4,
  "timeoutMS": 5000,
  "dryRunTimeoutMinutes": 5,
  "htmlReporter": {
    "fileName": "reports/mutation/stryker-report.html"
  },
  "jsonReporter": {
    "fileName": "reports/mutation/stryker-report.json"
  }
}
```

#### 运行 Stryker Deep Mode

```bash
# 使用 Stryker 运行（自动检测或强制）
/stdd-mutation run --mode=deep

# 指定文件
/stdd-mutation run --mode=deep --file=src/services/TodoService.ts

# 指定并发数
/stdd-mutation run --mode=deep --concurrency=2
```

#### Deep Mode 输出

```
🧬 STDD 变异测试报告 [Stryker Deep Mode]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 总体统计 (Stryker 引擎)

┌─────────────────┬──────────┬─────────────────┐
│ 指标             │ 数值     │ 状态            │
├─────────────────┼──────────┼─────────────────┤
│ 变异体总数       │ 312      │                 │
│ 已杀死 (Killed)  │ 285      │                 │
│ 超时 (Timeout)   │ 12       │                 │
│ 存活 (Survived)  │ 8        │ ⚠️ 需关注       │
│ 编译错误         │ 7        │                 │
├─────────────────┼──────────┼─────────────────┤
│ 变异测试得分     │ 91.3%    │ ✅ 优秀         │
│ 耗时             │ 3m 42s   │                 │
│ 引擎             │ Stryker  │ 🔬 Deep         │
└─────────────────┴──────────┴─────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 HTML 报告: reports/mutation/stryker-report.html
📁 JSON 报告: reports/mutation/stryker-report.json
```

#### Quick ↔ Deep 结果对比

```
📊 模式对比

┌─────────────────┬──────────┬──────────┬──────────┐
│ 指标             │ Quick    │ Deep     │ 差异     │
├─────────────────┼──────────┼──────────┼──────────┤
│ 变异体数量       │ 156      │ 312      │ +100%    │
│ 变异得分         │ 91.0%    │ 91.3%    │ +0.3%    │
│ 存活变异体       │ 10       │ 8        │ -2       │
│ 运行时间         │ 5s       │ 3m 42s   │          │
│ 算子类型         │ 8        │ 24       │ +16      │
└─────────────────┴──────────┴──────────┴──────────┘

💡 Quick 模式得分与 Deep 模式高度一致，建议开发时用 Quick，合并前用 Deep。
```

---

## 与 STDD 工作流集成

```
Ralph Loop 绿灯阶段
    │
    └──► 测试通过后自动运行变异测试
            │
            ├──► 变异得分 ≥ 80%: 通过 ✅
            │
            └──► 变异得分 < 80%: 警告 ⚠️
                    │
                    ├──► 显示存活变异体
                    │
                    └──► 生成增强测试建议
```

---

## 配置

在 `stdd/memory/mutation-config.json` 中：

<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

```json
{
  "enabled": true,
  "mode": "auto",
  "threshold": 80,
  "timeout": 5000,
  "maxMutants": 1000,
  "stryker": {
    "enabled": "auto",
    "config_file": "stryker.conf.json",
    "concurrency": 4,
    "test_runner": "vitest",
    "fallback_to_quick": true
  },
  "operators": [
    "ArithmeticOperatorReplacement",
    "ConditionalBoundary",
    "BooleanLiteralReplacement",
    "StringLiteralReplacement",
    "NullReturn"
  ],
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/node_modules/**"
  ],
  "report": {
    "html": true,
    "json": true,
    "console": true,
    "baseUrl": "./reports/mutation"
  }
}
```

---

> **引用**: 借鉴自 Stryker Mutator 和 Mutation Testing 原则
