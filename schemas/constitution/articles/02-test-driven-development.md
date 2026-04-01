# Article 2: Test-Driven Development

> 所有生产代码必须在失败的测试之后编写。

## 核心原则

1. **Red-Green-Refactor 循环**
   ```
   🔴 RED    → 写一个失败的测试
   🟢 GREEN  → 写最少代码使测试通过
   🔵 REFACTOR → 优化代码，保持测试通过
   ```

2. **测试先行是强制的**
   ```
   IF 编写实现代码:
     REQUIRE 对应的失败测试存在
     ELSE 阻止实现
   ```

3. **最小实现原则**
   ```
   只写刚好使测试通过的代码
   不要预先实现未来功能
   不要过度设计
   ```

## Ralph Loop (STDD 增强 TDD)

```
┌─────────────────────────────────────────────────────────────┐
│                    Ralph Loop TDD                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐                                                │
│  │ 🔴 RED  │ 1. 编写失败测试                                 │
│  │         │ 2. 确认测试失败 (不是错误)                       │
│  └────┬────┘                                                 │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────┐                                                │
│  │🔍 CHECK │ 3. 静态检查 (语法/类型/Lint)                    │
│  │         │ 4. 确认测试仍然失败                             │
│  └────┬────┘                                                 │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────┐                                                │
│  │🟢 GREEN │ 5. 编写最小实现                                 │
│  │         │ 6. 确认测试通过                                 │
│  └────┬────┘                                                 │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────┐                                                │
│  │🧪MUTATE │ 7. 伪变异测试                                   │
│  │         │ 8. 确认测试能检测缺陷                           │
│  └────┬────┘                                                 │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────┐                                                │
│  │🔵REFACT │ 9. 重构优化                                     │
│  │         │ 10. 确认测试仍然通过                            │
│  └────┬────┘                                                 │
│       │                                                      │
│       ▼                                                      │
│       ✅ → 下一个任务或继续迭代                              │
│                                                              │
│  ⚠️ 连续失败 3 次 → 自动回滚                                 │
└─────────────────────────────────────────────────────────────┘
```

## 测试命名规范

```javascript
// ✅ 好的测试命名
describe('UserService', () => {
  describe('authenticate', () => {
    it('should return user when credentials are valid', () => {});
    it('should throw InvalidCredentialsError when password is wrong', () => {});
    it('should throw UserNotFoundError when user does not exist', () => {});
  });
});

// ❌ 差的测试命名
it('test1', () => {});
it('works', () => {});
```

## 测试结构 (AAA 模式)

```javascript
it('should calculate total with tax', () => {
  // Arrange - 准备
  const cart = new Cart();
  cart.add({ price: 100, quantity: 2 });
  const taxRate = 0.1;

  // Act - 执行
  const total = cart.calculateTotal(taxRate);

  // Assert - 断言
  expect(total).toBe(220); // 200 + 20 (10% tax)
});
```

## 覆盖率要求

| 类型 | 最低覆盖率 | 目标覆盖率 |
|------|----------|----------|
| Lines | 80% | 90% |
| Branches | 70% | 85% |
| Functions | 80% | 95% |
| Statements | 80% | 90% |

## 违规检测

```javascript
// Hook: PreToolUse
if (isImplementationFile(targetFile)) {
  const testFile = getCorrespondingTest(targetFile);

  if (!exists(testFile)) {
    BLOCK("请先创建测试文件: " + testFile);
  }

  if (!hasFailedBefore(testFile)) {
    BLOCK("测试必须先失败一次，请运行测试确认红灯状态");
  }
}
```

## 豁免场景

以下代码可以不需要测试：
- 纯配置文件 (`*.config.js`, `*.json`)
- 类型定义文件 (`*.d.ts`)
- 第三方库包装器 (已有测试)
- 简单的 POJO/接口
- 已有集成测试覆盖的胶水代码

## 执行命令

```bash
# 启动 TDD 循环 (Ralph Loop 自动完成红→绿→重构)
/stdd:apply

# 指定特定任务
/stdd:apply --task=TASK-001

# 验证
/stdd:verify   # 验证规范一致性
/stdd:mutation # 运行变异测试
```
