# Article 1: Library-First Development

> 所有代码必须优先使用成熟的库和框架，而非从头实现。

## 核心原则

1. **Before Writing Code, Check Libraries**
   - 搜索 npm/pypi/maven 等包管理器
   - 检查 GitHub 上是否有成熟解决方案
   - 评估库的维护状态、star 数、issue 响应

2. **Library Selection Criteria**
   ```
   ✅ 选择标准:
   - 最近 6 个月有更新
   - >1000 stars (或领域内知名)
   - 良好的 TypeScript 支持
   - 活跃的社区支持
   - 清晰的文档

   ❌ 避免选择:
   - 2 年以上未维护
   - 大量未解决的 issue
   - 频繁的 breaking changes
   - 无测试覆盖
   ```

3. **When to Write Custom Code**
   ```
   允许自定义实现的场景:
   - 无现有库满足需求
   - 现有库过于复杂/臃肿
   - 学习/教学目的
   - 性能有特殊要求
   - 安全审计要求
   ```

## 检查流程

```
新需求 → 搜索现有库 → 评估候选库 → 选定或自定义 → 记录决策
```

## 违规示例

```javascript
// ❌ 错误: 手写日期格式化
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ✅ 正确: 使用 date-fns 或 dayjs
import { format } from 'date-fns';
const formatted = format(date, 'yyyy-MM-dd');
```

## 记录格式

在 `stdd/constitution/library-decisions.md` 中记录：

```markdown
## [日期] 库选择决策

### 需求
[描述功能需求]

### 候选库
1. **库A** - 优点/缺点
2. **库B** - 优点/缺点
3. **自定义** - 理由

### 决策
选择: [库名/自定义]
理由: [为什么选择这个方案]
```

## 执行时机

- **Pre-Implementation**: 在 `stdd-design` 阶段检查
- **Code Review**: 在 `stdd-verify` 阶段验证
- **Learning**: 记录到 `stdd/memory/components.md`
