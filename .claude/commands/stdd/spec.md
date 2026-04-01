# /stdd:spec - 生成 BDD 规格

将确认后的需求转译为严谨的 BDD (Given/When/Then) 规范文档。

## 使用方式

```
/stdd:spec                     # 为当前活跃变更生成规格
/stdd:spec --change=<name>     # 为指定变更生成规格
```

## 执行流程

1. **上下文加载** - 加载 `proposal.md`，拒绝读取实现代码以防思维固化
2. **生成特性文档** - 在 `specs/*.feature` 中写入 Given/When/Then 格式
3. **场景覆盖** - 每个功能和边界案例作为独立 Scenario
4. **确认门控** - 暂停执行，提示用户检查行为流是否满足需求
5. **结束引导** - 告知用户运行 `/stdd:plan` 进入任务拆解

## BDD 格式规范

```gherkin
Feature: 功能名称
  作为 <角色>
  我想要 <功能>
  以便 <价值>

  Scenario: 正常流程
    Given 前置条件
    When 用户操作
    Then 预期结果

  Scenario: 边界情况
    Given 异常前置条件
    When 触发操作
    Then 异常处理结果
```

## 红线规则

- 禁止涉及实现细节（类名、表结构、API URL）
- 只描述外部可观察的行为
- 每个边界条件必须有对应 Scenario

## 下一步

- 运行 `/stdd:plan` 进行任务拆解
