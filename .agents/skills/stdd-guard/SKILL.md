---
description: TDD 守护钩子系统 - 强制执行测试驱动开发原则
---

# STDD TDD 守护钩子 (/stdd-guard)

## 目标
通过 Hook 机制强制执行 TDD 原则，防止 AI 跳过测试或过度实现。

---

## 守护规则

### Rule 1: 测试先行
```
IF 实现文件将被修改 AND 没有对应的失败测试:
  THEN 阻止操作
  提示: "请先运行 /stdd-red 为此功能创建失败的测试"
```

### Rule 2: 最小实现
```
IF 实现代码超出当前测试覆盖范围:
  THEN 警告
  提示: "检测到超出测试范围的实现，建议遵循最小实现原则"
```

### Rule 3: 测试必须失败
```
IF 新测试首次运行就通过:
  THEN 警告
  提示: "测试首次运行即通过，可能测试无效或功能已存在"
```

### Rule 4: 禁止跳过重构
```
IF 绿灯后直接进入下一个任务 AND 代码有重复/复杂度问题:
  THEN 提示
  提示: "建议运行 /stdd-refactor 优化代码质量"
```

---

## Hook 集成点

### 1. PreToolUse Hook (工具执行前)
```javascript
// 在写入实现文件前检查
onPreToolUse('write', (context) => {
  const targetFile = context.file;

  // 检查是否是实现文件
  if (isImplementationFile(targetFile)) {
    const testFile = getCorrespondingTestFile(targetFile);

    // 检查测试是否存在
    if (!fileExists(testFile)) {
      return {
        block: true,
        message: `❌ [TDD Guard] 测试文件不存在: ${testFile}
请先运行: /stdd-red ${targetFile}`
      };
    }

    // 检查测试是否失败过
    if (!hasFailedTest(testFile)) {
      return {
        block: true,
        message: `❌ [TDD Guard] 测试 ${testFile} 从未失败过
请先运行测试确认它是红灯状态`
      };
    }
  }

  return { block: false };
});
```

### 2. UserPromptSubmit Hook (用户提交提示时)
```javascript
// 检测可能违反 TDD 的指令
onUserPromptSubmit((prompt) => {
  const violations = detectTDDViolations(prompt);

  if (violations.length > 0) {
    return {
      warn: true,
      message: `⚠️ [TDD Guard] 检测到可能的 TDD 违规:
${violations.map(v => '- ' + v).join('\n')}

建议流程: /stdd-red → /stdd-green → /stdd-refactor`
    };
  }

  return { warn: false };
});
```

### 3. PostToolUse Hook (工具执行后)
```javascript
// 执行后验证
onPostToolUse('write', async (context) => {
  const targetFile = context.file;

  if (isImplementationFile(targetFile)) {
    // 检查代码复杂度
    const complexity = calculateComplexity(context.content);

    if (complexity > THRESHOLD) {
      return {
        warn: true,
        message: `⚠️ [TDD Guard] 代码复杂度较高 (${complexity})
建议运行 /stdd-refactor 进行优化`
      };
    }
  }

  return { warn: false };
});
```

---

## 使用方式

### 启用守护
```bash
/stdd-guard on
```

### 禁用守护
```bash
/stdd-guard off
```

### 检查状态
```bash
/stdd-guard status
```

### 配置规则
```bash
# 禁用特定规则
/stdd-guard disable rule:test-first

# 启用特定规则
/stdd-guard enable rule:minimal-impl

# 设置复杂度阈值
/stdd-guard set complexity-threshold 15
```

---

## 守护配置文件

在 `.stdd/memory/guard-config.json` 中：

```json
{
  "enabled": true,
  "rules": {
    "test-first": true,
    "minimal-impl": true,
    "test-must-fail": true,
    "no-skip-refactor": true
  },
  "thresholds": {
    "complexity": 15,
    "duplication": 5,
    "test-coverage": 80
  },
  "languages": {
    "javascript": {
      "testPattern": "**/*.test.{js,jsx,ts,tsx}",
      "implPattern": "**/src/**/*.{js,jsx,ts,tsx}"
    },
    "python": {
      "testPattern": "**/test_*.py",
      "implPattern": "**/*.py"
    }
  }
}
```

---

## 与 Ralph Loop 集成

stdd-guard 与 stdd-execute 的 Ralph Loop 紧密集成：

```
Ralph Loop + TDD Guard:

🔴 Red 阶段
  ↓ [Guard: 确认测试失败]
🔍 Static Check
  ↓ [Guard: 确认语法正确]
🟢 Green 阶段
  ↓ [Guard: 确认最小实现]
🧪 Mutation Review
  ↓ [Guard: 确认测试有效]
🔵 Refactor
  ↓ [Guard: 确认复杂度降低]
✅ 完成
```

---

## 示例输出

### 阻止违规操作
```
❌ [TDD Guard] 阻止操作

原因: 测试文件不存在
文件: src/services/UserService.ts
期望测试: src/__tests__/services/UserService.test.ts

修复方式:
1. 运行: /stdd-red src/services/UserService.ts
2. 创建失败的测试
3. 然后再实现功能

TDD 原则: 先写测试，再写实现
```

### 警告提示
```
⚠️ [TDD Guard] 警告

检测到: 代码复杂度过高
当前复杂度: 23
建议阈值: 15

文件: src/components/TodoList.tsx
函数: processTodos (圈复杂度: 12)

建议:
1. 拆分 processTodos 为更小的函数
2. 运行 /stdd-refactor 优化代码
3. 确保测试覆盖所有分支
```

---

> **引用**: 借鉴自 TDD Guard (https://github.com/nizos/tdd-guard)
