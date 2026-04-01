---
name: stdd-spec
description: |
  将需求草案转译为 BDD (Given/When/Then) 严谨规范文档。
  触发场景：用户说 '/stdd-spec', 'stdd spec', '生成BDD', 'BDD规格', 'stdd spec'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD BDD 规格生成与验证门控 (/stdd-spec)

目标：在动手编写任何代码前，用跨团队懂的自然语言完全锁定系统行为逻辑与验收成功标准。

## 前置条件

- `proposal.md` 包含 `<!-- Confirmed -->` 标记

## 执行步骤

### 1. 上下文加载

**专门加载** `proposal.md`（含需求正文 + 澄清记录 + 确认标记）。

**红线规则**：
- 拒绝读取任何实现代码库文件（`src/**/*.ts`、`src/**/*.tsx` 等）
- 目的：防止已有实现细节固化思维，确保规格只描述行为而非实现

### 2. 生成特性文档

在 `stdd/changes/<change>/specs/` 下写入 BDD 格式的 `.feature` 文件。

**Gherkin 格式规范**：
```gherkin
Feature: <功能名称>
  作为 <角色>
  我想要 <功能>
  以便 <价值>

  # --- 正常流程 ---
  Scenario: <场景名称>
    Given <前置条件>
    When <触发动作>
    Then <预期结果>

  # --- 边界情况 ---
  Scenario: <边界场景名称>
    Given <异常前置条件>
    When <触发操作>
    Then <异常处理结果>

  # --- 异常流程 ---
  Scenario: <异常场景名称>
    Given <系统异常状态>
    When <操作>
    Then <容错处理>
```

**覆盖要求**：
- 每个功能点至少 1 个正常场景
- 每个澄清回答涉及的边界条件必须有对应 Scenario
- 涉及用户输入的场景必须有异常值 Scenario

### 3. 红线检查（自动）

生成完成后，自动检查：

| 检查项 | 规则 |
|--------|------|
| 无实现细节 | 规格中不得出现类名、表名、API URL、技术实现术语 |
| 只描述外部行为 | 所有 Then 应描述用户可观察的结果 |
| 场景完整性 | 每个 In Scope 功能点都有对应 Scenario |
| 无歧义 | 所有数值使用具体数字而非"一些"、"多个"等模糊词 |

**若检查不通过** → 自动修正后重新生成。

### 4. 确认门控（Human Gate）

暂停执行，输出确认提示：

```
✅ BDD 规格已生成: stdd/changes/<change>/specs/*.feature

⚠️ 在这个规格以外的分支需求一概不会开发。
请检查行为流是否满足您的业务需求！

确认后请运行: /stdd:plan
```

等待用户确认。

### 5. Test Pipeline 自动生成

BDD 规格确认后，自动执行 **parser → IR → generator** 三阶段流水线，将 GWT 规格转译为测试代码骨架。

#### Pipeline 架构

```
┌─────────────────────────────────────────────────────────┐
│                  Test Pipeline (自动)                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   .feature 文件 ──► [Parser] ──► IR ──► [Generator]     │
│                          │                  │            │
│                          ▼                  ▼            │
│                    Scenario IR         测试代码骨架       │
│                    ┌──────────┐        ┌──────────┐     │
│                    │ feature  │        │ describe  │     │
│                    │ scenario │        │ it/test   │     │
│                    │ given[]  │   ──►  │ arrange   │     │
│                    │ when[]   │        │ act       │     │
│                    │ then[]   │        │ assert    │     │
│                    └──────────┘        └──────────┘     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 阶段 5a: Parser（GWT 解析器）

解析 `.feature` 文件，提取结构化 IR（Intermediate Representation）：

```json
{
  "feature": "Todo List",
  "role": "用户",
  "scenarios": [
    {
      "name": "创建 Todo",
      "type": "happy_path",
      "tags": ["smoke"],
      "given": [
        { "text": "用户在 Todo 页面", "type": "precondition", "data": null }
      ],
      "when": [
        { "text": "输入标题 \"Buy milk\" 并提交", "type": "action", "data": { "title": "Buy milk" } }
      ],
      "then": [
        { "text": "创建新 Todo 并显示在列表中", "type": "assertion", "data": { "visible": true } }
      ]
    }
  ]
}
```

输出到 `stdd/changes/<change>/specs/.pipeline/ir.json`。

#### 阶段 5b: IR → 测试代码生成器

根据 `stdd/config.yaml` 中 `specs.bdd_framework` 配置，选择对应模板生成测试骨架：

| 框架 | 输出文件 | 模板 |
|------|----------|------|
| vitest | `src/__tests__/<feature>.spec.ts` | `describe/it/expect` |
| jest | `src/__tests__/<feature>.test.ts` | `describe/it/expect` |
| pytest | `tests/test_<feature>.py` | `class/test_/assert` |
| go testing | `<feature>_test.go` | `func Test*(t *testing.T)` |

**生成模板示例**（vitest/jest）：
```typescript
import { describe, it, expect } from 'vitest'; // or '@jest/globals'

describe('Feature: Todo List', () => {

  // Scenario: 创建 Todo (happy_path)
  describe('创建 Todo', () => {
    it('should 创建新 Todo 并显示在列表中', async () => {
      // Given: 用户在 Todo 页面
      // TODO: arrange - 设置前置条件

      // When: 输入标题 "Buy milk" 并提交
      // TODO: act - 执行操作

      // Then: 创建新 Todo 并显示在列表中
      // TODO: assert - 验证结果
      expect(true).toBe(true); // placeholder
    });
  });
});
```

**生成模板示例**（pytest）：
```python
import pytest

class TestTodoList:
    """Feature: Todo List"""

    def test_create_todo(self):
        """Scenario: 创建 Todo (happy_path)"""
        # Given: 用户在 Todo 页面
        # TODO: arrange

        # When: 输入标题 "Buy milk" 并提交
        # TODO: act

        # Then: 创建新 Todo 并显示在列表中
        # TODO: assert
        assert True  # placeholder
```

#### 阶段 5c: Spec Guardian（前置泄漏检测）

在生成测试骨架前，运行快速泄漏检测：

| 检测项 | 规则 | 严重级 |
|--------|------|--------|
| 实现术语泄漏 | GWT 中出现类名、表名、技术术语 | 🔴 阻断 |
| 内部 API 泄漏 | Then 中引用内部函数名/变量名 | 🔴 阻断 |
| 数据库结构泄漏 | Given/When 中出现列名/索引名 | 🟡 警告 |
| 过度具体的数值 | 硬编码超时值/端口号 | 🟢 建议 |

**若检测到泄漏** → 自动移除实现术语，替换为行为描述，记录到 `specs/.pipeline/leak-report.json`。

#### Pipeline 配置

在 `stdd/config.yaml` 中增加：

```yaml
# Test Pipeline 配置（参考 ATDD）
test_pipeline:
  enabled: true
  auto_generate: true          # spec 确认后自动生成测试骨架
  spec_guardian: true          # 启用泄漏检测
  placeholder_mode: "todo"     # todo / skip / pending
  output_dir: "src/__tests__"  # 测试骨架输出目录
  ir_dir: "specs/.pipeline"    # IR 中间文件目录
```

## 输出

- `specs/*.feature` — BDD 规格文件（1 个 Feature 对应 1 个文件）
- `specs/.pipeline/ir.json` — 结构化 IR 中间表示
- `specs/.pipeline/leak-report.json` — Spec 泄漏检测报告（如有泄漏）
- `src/__tests__/<feature>.spec.ts` — 自动生成的测试代码骨架
- `specs/*.usecase.yaml` — 原子用例文件（标准格式）

### 原子用例文件格式（Atomic Use Case）

参考 Spec-First TDD，每个 Scenario 可导出为独立的原子用例文件：

```yaml
# specs/create-todo.usecase.yaml
id: "UC-001"
feature: "Todo List"
scenario: "创建 Todo"
type: "happy_path"         # happy_path / edge_case / error_path
priority: "P0"             # P0-P4
estimated_duration: "15min" # 建议实现时长

given:
  - precondition: "用户在 Todo 页面"
    setup: null             # 无需特殊数据

when:
  - action: "输入标题并提交"
    input:
      title: "Buy milk"

then:
  - assertion: "新 Todo 创建成功并显示在列表中"
    expected:
      visible: true
      title: "Buy milk"

# 测试骨架映射
test_file: "src/__tests__/todo-list.spec.ts"
test_name: "should 创建新 Todo 并显示在列表中"

# 依赖
depends_on: []              # 无前置用例
blocks: ["UC-002", "UC-003"] # 被哪些用例依赖
```

**格式规则**：
- 1 个 Scenario = 1 个 `.usecase.yaml` 文件
- 文件名使用 kebab-case 场景名
- `id` 格式: `UC-NNN`（递增编号）
- `type` 必须为三种之一: `happy_path` / `edge_case` / `error_path`
- `priority` 遵循 P0(阻断) → P4(可选)
- `estimated_duration` 不超过 30 分钟（微任务原则）
- `depends_on` / `blocks` 构成用例依赖 DAG

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| proposal 未确认 | 报错，提示先运行 `/stdd:confirm` |
| 需求极简（如改个按钮颜色） | 允许生成极简规格（1 Scenario 即可） |
| 需求涉及 API | 调用 `/stdd:api-spec` 生成 OpenAPI 规范（并行） |
| 需求涉及数据模型 | 调用 `/stdd:schema` 生成类型规范（并行） |

## 与其他 Skill 的关系

```
/stdd-confirm ──► /stdd-spec ──► /stdd-plan
                        ──► /stdd-api-spec (并行，有 API 时)
                        ──► /stdd-schema (并行，有数据模型时)
```
