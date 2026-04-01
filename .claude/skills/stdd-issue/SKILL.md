---
name: stdd-issue
description: |
  Issue Resolution 模式 - 针对生产 Bug 的 TDD 修复流程。
  触发场景：用户说 '/stdd-issue', 'stdd issue', '修复bug', 'Bug修复', 'issue', 'stdd issue'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD Issue Resolution 模式 (/stdd-issue)

目标：为生产环境 Bug 提供结构化的 TDD 修复流程，确保修复不引入回归。

## 与 Feature Development 的区别

| 维度 | Feature (/stdd-propose) | Issue (/stdd-issue) |
|------|------------------------|---------------------|
| 起点 | 用户需求描述 | Bug 报告/复现步骤 |
| 首步 | Epic 检测 | 影响范围分类 |
| 测试先行 | 为新功能写测试 | 先复现 Bug 的失败测试 |
| 规格 | Given/When/Then 行为规格 | Given/When/Then Bug 复现 |
| 验收 | 功能正常工作 | Bug 不再复现 + 回归全绿 |

## 执行步骤

### 1. Bug 分类

根据用户的 Bug 描述，自动分类：

| 分类 | 说明 | 严重度 |
|------|------|--------|
| P0-Crash | 系统崩溃/数据丢失 | 🔴 立即修复 |
| P1-Blocker | 核心功能不可用 | 🔴 当日修复 |
| P2-Major | 功能异常但有规避方式 | 🟡 本次迭代修复 |
| P3-Minor | 体验问题 | 🟢 排期修复 |
| P4-Enhancement | 改进建议 | ⚪ 需求池 |

**输出**：
```
📋 Bug 分类结果:
- 严重度: P2-Major
- 影响范围: [受影响的模块列表]
- 分类依据: [分类理由]
```

### 2. 复现分析

收集以下信息（缺失则向用户提问）：

1. **复现步骤**：精确到每一步的操作序列
2. **预期行为**：正常情况下应该怎样
3. **实际行为**：实际发生了什么
4. **环境信息**：版本、浏览器、操作系统等
5. **频率**：必现/偶发/特定条件

**生成 Bug 规格文件**：`stdd/changes/<issue-name>/bug-spec.md`

```markdown
# Bug Spec: <标题>

## 分类
- 严重度: P2-Major
- 影响模块: [模块列表]

## 复现步骤
1. <步骤 1>
2. <步骤 2>
3. <步骤 3>

## 预期行为
<描述>

## 实际行为
<描述>

## 环境信息
- 版本: <版本号>
- 环境: <环境信息>

## 根因假设
- [ ] 假设 1: <描述>
- [ ] 假设 2: <描述>
```

### 3. 定位根因

基于 Bug 规格和项目代码：

1. **阅读相关代码**：根据影响模块定位代码文件
2. **日志分析**：检查错误日志和堆栈信息
3. **假设验证**：逐个验证根因假设
4. **确认根因**：锁定具体的问题代码位置

**输出**：在 `bug-spec.md` 中更新根因分析结果

### 4. 失败测试先行（Red）

**这是 Issue 模式最关键的步骤**：写一个精确复现 Bug 的失败测试。

```typescript
// 示例: Bug - Todo 列表超过 100 条时导出为空
describe('Bug: Export returns empty for large lists', () => {
  it('should export 100+ todo items correctly', () => {
    // 复现: 创建 101 条 Todo
    const todos = Array.from({ length: 101 }, (_, i) => ({
      id: String(i),
      title: `Todo ${i}`,
      completed: false,
    }));

    const result = exportMarkdown(todos);

    // Bug 表现: 返回空字符串
    expect(result).not.toBe('');
    expect(result.split('\n').length).toBeGreaterThan(101);
  });
});
```

**运行测试确认红灯**（测试失败 = Bug 确实存在）。

### 5. 最小修复（Green）

- **只修复 Bug 本身**，不做额外重构或优化
- 最小化修改范围
- 运行测试确认绿灯

### 6. 回归验证

1. **运行全量测试**：确保修复没有引入新问题
2. **边缘场景测试**：检查相关功能的边界情况
3. **运行 `stdd-mutation`**（可选）：验证修复测试的质量

### 7. 修复报告

生成修复报告：`stdd/changes/<issue-name>/fix-report.md`

```markdown
# Fix Report: <标题>

## Bug 信息
- 严重度: P2-Major
- 根因: <根因描述>
- 修复文件: [修改的文件列表]

## 修复内容
- <修改 1>
- <修改 2>

## 测试覆盖
- 复现测试: ✅
- 全量回归: ✅/❌
- 变异测试: ✅/❌/跳过

## 变更影响
- 影响范围: <描述>
- 潜在风险: <描述>
```

## 熔断机制

| 情况 | 处理 |
|------|------|
| 无法复现 Bug | 暂停，向用户请求更多复现信息 |
| 根因不明确 | 暂停，列出可能的根因让用户选择 |
| 修复涉及架构变更 | 建议转为 Feature 模式 (`/stdd-propose`) |
| 回归测试失败 | 回退修复，重新分析根因 |

## 与其他 Skill 的关系

```
/stdd-issue ──► Bug分类 ──► 复现分析 ──► TDD修复 ──► /stdd-commit
                                                    ──► (回归失败) 回到复现分析
```

## 目录结构

```
stdd/changes/<issue-name>/
├── bug-spec.md       # Bug 规格与根因分析
├── fix-report.md     # 修复报告
└── (测试文件在项目 tests/ 目录下)
```
