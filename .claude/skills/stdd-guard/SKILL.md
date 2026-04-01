---
name: stdd-guard
description: |
  TDD 守护钩子系统 - 强制执行测试驱动开发原则
  触发场景：用户说 '/stdd-guard', 'guard', '守护', 'TDD钩子', '测试守护'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
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

在 `stdd/memory/guard-config.json` 中：

<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

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

## AI 模型验证 TDD 合规

参考 TDD Guard (nizos)，增加 AI 辅助验证模式，使用 AI 模型审查代码是否遵循 TDD 原则：

```bash
# AI 验证最近提交的 TDD 合规性
/stdd-guard --ai-verify

# AI 验证指定文件
/stdd-guard --ai-verify --file=src/services/TodoService.ts
```

### AI 验证检查项

| 检查项 | 说明 | 判定 |
|--------|------|------|
| 测试先行证据 | 测试文件修改时间是否早于实现文件 | 时间戳比较 |
| 实现与测试比例 | 实现代码是否被对应测试覆盖 | 1:1 映射检查 |
| 断言质量 | 断言是否验证具体行为而非仅检查存在 | AI 语义分析 |
| TDD 周期完整性 | 是否有 Red→Green→Refactor 的提交记录 | git log 分析 |

### 输出示例

```
🤖 AI TDD 合规验证

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 src/services/TodoService.ts

  ✅ 测试先行: test (10:01) → impl (10:03)
  ✅ 测试覆盖: 100% 方法有对应测试
  ⚠️ 断言质量: 2 处 toBeTruthy() 建议改为精确断言
  ✅ TDD 周期: 3 次完整的 Red→Green→Refactor

  合规评分: 92/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 总体 TDD 合规: 92%
```

---

## 防绕过机制 (Anti-Bypass Enforcement)

参考 TDD Guard，检测并防止绕过 Hook 系统的行为。确保 Constitution 条例和 TDD 流程不被跳过。

### 绕过检测矩阵

```
┌─────────────────────────────────────────────────────────────┐
│                   Anti-Bypass Detection                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   绕过方式                  检测手段             严重级       │
│   ──────────                ────────             ──────      │
│                                                              │
│   ① git commit --no-verify   pre-commit hook     🔴 阻断     │
│      绕过 pre-commit hook                                    │
│                                                              │
│   ② 直接编辑文件             PostToolUse hook     🟡 警告     │
│      跳过 PreToolUse 检查     时间戳比对                       │
│                                                              │
│   ③ 手动修改 waivers.yaml    文件哈希校验        🔴 阻断     │
│      非法豁免 Constitution                                   │
│                                                              │
│   ④ 删除测试文件             pre-commit 检查     🔴 阻断     │
│      绕过测试先行要求                                         │
│                                                              │
│   ⑤ 临时禁用 hooks          stdd-guard status    🟡 警告     │
│      /stdd-guard off                                          │
│                                                              │
│   ⑥ 在 .claude/settings.json git diff 监控        🟡 警告     │
│      删除 hook 配置          配置文件哈希                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 防御措施

#### 1. Pre-commit Hook（防止 --no-verify）

```bash
#!/bin/bash
# .git/hooks/pre-commit (STDD 强化版)

# 检测 --no-verify 绕过尝试
if git config --get commit.template | grep -q "stdd"; then
  echo "🔒 STDD Guard: 检测到提交行为"
fi

# 验证测试文件存在性
changed_impl_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E 'src/.*\.(ts|js|py)$')
for file in $changed_impl_files; do
  test_file=$(echo "$file" | sed 's/src\//__tests__\//' | sed 's/\.\(ts\|js\)$/.test.\1/')
  if [ ! -f "$test_file" ]; then
    echo "❌ STDD Guard: $file 无对应测试文件 $test_file"
    echo "   请先运行 TDD 流程创建测试"
    exit 1
  fi
done

# 验证 waivers.yaml 完整性
if [ -f "schemas/constitution/waivers.yaml" ]; then
  current_hash=$(sha256sum schemas/constitution/waivers.yaml | cut -d' ' -f1)
  stored_hash=$(cat stdd/memory/.waivers-hash 2>/dev/null || echo "")
  if [ "$current_hash" != "$stored_hash" ] && [ -n "$stored_hash" ]; then
    echo "⚠️ STDD Guard: waivers.yaml 被外部修改"
    echo "   请通过 /stdd-constitution exempt 正式申请豁免"
    exit 1
  fi
fi
```

#### 2. 文件变更监控（防止直接编辑绕过）

```bash
# 检查是否有文件被绕过 Hook 直接修改
/stdd-guard --audit-trail

# 输出示例:
# 🔒 STDD Guard 审计追踪
#
# 最近 10 次文件修改:
# ┌────────────────────┬──────────────────────────┬──────────┐
# │ 时间               │ 文件                     │ Hook状态 │
# ├────────────────────┼──────────────────────────┼──────────┤
# │ 10:01:23           │ TodoService.ts           │ ✅ 已检查│
# │ 10:03:45           │ TodoService.test.ts      │ ✅ 已检查│
# │ 10:05:12           │ waivers.yaml             │ ⚠️ 未检查│ ← 可疑
# └────────────────────┴──────────────────────────┴──────────┘
```

#### 3. Hook 配置完整性检查

```bash
# 验证 Hook 配置是否被篡改
/stdd-guard --verify-hooks

# 输出示例:
# 🔍 Hook 配置验证
#
# .claude/settings.json:
#   ✅ PreToolUse hook 已配置
#   ✅ PostToolUse hook 已配置
#   ✅ Hook 脚本路径存在
#
# .git/hooks/pre-commit:
#   ✅ pre-commit hook 已安装
#   ✅ hook 内容未被修改
#
# ⚠️ 可疑修改:
#   - .claude/settings.json 上次修改: 2分钟前 (非 STDD 流程)
```

### 会话控制

参考 TDD Guard 的会话控制功能：

```bash
# 临时禁用（紧急情况，如 hotfix）
/stdd-guard off --reason="紧急 hotfix, P0 修复"
# → 记录禁用原因到 stdd/memory/guard-log.json
# → 自动在 30 分钟后重新启用

# 重新启用
/stdd-guard on

# 查看状态
/stdd-guard status
# → 输出: 🟢 已启用 | 🔴 已禁用 (原因: ..., 禁用时间: ..., 自动恢复: ...)
```

---

> **引用**: 借鉴自 TDD Guard (https://github.com/nizos/tdd-guard)
