---
description: 自主迭代循环 - 自动检测失败并智能修复直到通过
---

# STDD 自主迭代循环 (/stdd-iterate)

## 目标
实现 **Plan-Execute-Reflect-Adjust** 循环，自动检测测试失败、分析原因、智能修复，直到所有测试通过或达到最大迭代次数。

---

## 循环模式

```
┌─────────────────────────────────────────────────────────────┐
│                    Iterate Loop                              │
│                                                              │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│   │  Plan   │───▶│ Execute │───▶│ Reflect │───▶│ Adjust  │ │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘ │
│        ▲                                             │       │
│        └─────────────────────────────────────────────┘       │
│                     (如果未通过)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `maxIterations` | 10 | 最大迭代次数 |
| `failureThreshold` | 3 | 连续失败阈值 (触发回滚) |
| `reflectionDepth` | 2 | 反思分析深度 |
| `adaptiveStrategy` | true | 是否启用自适应策略 |

---

## 步骤

### 1. Plan (规划)
分析当前任务和测试状态：
```javascript
function plan(context) {
  return {
    currentTask: context.tasks.find(t => !t.completed),
    testStatus: context.lastTestResult,
    previousAttempts: context.iterationHistory,
    estimatedComplexity: analyzeComplexity(context)
  };
}
```

### 2. Execute (执行)
执行当前策略：
```javascript
async function execute(plan) {
  // 执行代码修改
  await applyChanges(plan.changes);

  // 运行测试
  const result = await runTests();

  return {
    success: result.passed,
    failures: result.failures,
    coverage: result.coverage
  };
}
```

### 3. Reflect (反思)
分析执行结果：
```javascript
function reflect(execution) {
  if (execution.success) {
    return { action: 'proceed', reason: 'All tests passed' };
  }

  // 分析失败原因
  const rootCause = analyzeRootCause(execution.failures);

  return {
    action: 'adjust',
    rootCause: rootCause.type,
    details: rootCause.details,
    suggestedFix: rootCause.suggestion
  };
}
```

### 4. Adjust (调整)
根据反思结果调整策略：
```javascript
function adjust(reflection, iteration) {
  switch (reflection.rootCause) {
    case 'logic_error':
      return generateLogicFix(reflection.details);
    case 'missing_import':
      return generateImportFix(reflection.details);
    case 'type_error':
      return generateTypeFix(reflection.details);
    case 'test_incorrect':
      return generateTestFix(reflection.details);
    default:
      return generateGenericFix(reflection);
  }
}
```

---

## 自适应策略

### 策略选择逻辑
```javascript
function selectStrategy(iteration, failures) {
  // 迭代 1-3: 快速修复
  if (iteration <= 3) {
    return 'quick_fix';
  }

  // 迭代 4-6: 深度分析
  if (iteration <= 6) {
    return 'deep_analysis';
  }

  // 迭代 7+: 重新思考
  return 'rethink';
}
```

### 策略详情

| 策略 | 迭代范围 | 行为 |
|------|----------|------|
| `quick_fix` | 1-3 | 针对具体错误点修复 |
| `deep_analysis` | 4-6 | 全面分析代码逻辑 |
| `rethink` | 7+ | 重新审视实现方案 |

---

## 使用方式

### 启动迭代循环
```bash
/stdd-iterate
```

### 带参数启动
```bash
/stdd-iterate --max-iterations=15 --failure-threshold=5
```

### 查看迭代状态
```bash
/stdd-iterate status
```

### 手动干预
```bash
# 暂停迭代
/stdd-iterate pause

# 跳过当前任务
/stdd-iterate skip

# 回滚到上一个稳定状态
/stdd-iterate rollback
```

---

## 迭代日志

在 `.stdd/active_feature/iteration_log.md` 中记录：

```markdown
# 迭代日志

## 迭代 #1
- **时间**: 2026-03-27T10:00:00Z
- **任务**: 实现 TodoService.add 方法
- **策略**: quick_fix
- **执行**: 修改 src/services/TodoService.ts
- **结果**: ❌ 失败
- **错误**: TypeError: Cannot read property 'id' of undefined
- **反思**: 根因分析 - 未处理 null 参数
- **调整**: 添加参数验证

## 迭代 #2
- **时间**: 2026-03-27T10:02:15Z
- **任务**: 实现 TodoService.add 方法
- **策略**: quick_fix
- **执行**: 添加 if (!title) throw Error
- **结果**: ✅ 通过
- **覆盖率**: 95%

---

## 统计
- 总迭代: 2
- 成功: 1
- 失败: 1
- 成功率: 50%
```

---

## 熔断机制

### 触发条件
1. **连续失败阈值**: 连续 3 次迭代失败
2. **最大迭代次数**: 超过 10 次迭代
3. **相同错误重复**: 同一错误出现 3 次以上

### 熔断行为
```
⚠️ [Iterate] 熔断触发

原因: 连续失败次数达到阈值 (3/3)

建议操作:
1. 运行 /stdd-revert 回滚到上一个稳定状态
2. 运行 /stdd-clarify 重新澄清需求
3. 手动检查代码逻辑

最后 3 次失败原因:
- 迭代 #5: TypeError in TodoService.ts:42
- 迭代 #6: TypeError in TodoService.ts:42
- 迭代 #7: TypeError in TodoService.ts:42

检测到重复错误，建议人工干预。
```

---

## 与 Ralph Loop 集成

```
/stdd-iterate 启动
    │
    ├──► 检测当前任务
    │
    ├──► 执行 Ralph Loop (Red → Green → Refactor)
    │         │
    │         └──► 如果 Green 失败
    │                   │
    │                   ├──► Reflect: 分析失败原因
    │                   ├──► Adjust: 生成修复方案
    │                   └──► 重试 Ralph Loop (最多 3 次)
    │
    ├──► 如果连续失败 ≥ 3: 触发熔断
    │
    └──► 全部通过: 输出报告
```

---

## 示例输出

```
🔄 STDD Iterate 已启动

📋 当前任务: 实现 TodoService.add 方法
📊 迭代进度: 0/10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 迭代 #1
策略: quick_fix
执行: 修改 src/services/TodoService.ts

运行测试...
❌ 失败: 1/5 测试未通过

反思分析:
  根因: 参数验证缺失
  影响: 1 个测试用例
  建议: 添加 title 参数验证

调整方案:
  + if (!title || title.trim() === '') {
  +   throw new Error('Title is required');
  + }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 迭代 #2
策略: quick_fix
执行: 应用参数验证

运行测试...
✅ 通过: 5/5 测试全部通过
📊 覆盖率: 95%

✨ 任务完成！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 迭代统计:
  总迭代: 2
  成功: 2
  失败: 0
  成功率: 100%
  总耗时: 45s
```

---

> **引用**: 借鉴自 BabyAGI Plan-Execute 分离模式
