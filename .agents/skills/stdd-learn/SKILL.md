---
description: 自适应学习系统 - 从用户反馈学习，优化提示模板，改进决策质量
---

# STDD 自适应学习系统 (/stdd-learn)

## 目标
从用户反馈和执行结果中学习，持续优化提示模板、改进决策质量，使 STDD Copilot 越用越智能。

---

## 学习维度

```
┌─────────────────────────────────────────────────────────────┐
│                    STDD Learning System                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │   Feedback   │───▶│   Analysis   │───▶│  Adaptation  │  │
│   │   (反馈)     │    │   (分析)     │    │   (适应)     │  │
│   └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                    │         │
│   ┌────────────────────────────────────────────────┘         │
│   │                                                         │
│   ▼                                                         │
│   ┌──────────────────────────────────────────────────────┐  │
│   │                  Improvement Areas                    │  │
│   │                                                       │  │
│   │   • 提示模板优化    • 决策权重调整    • 偏好学习    │  │
│   │   • 错误模式识别    • 效率优化        • 上下文精简  │  │
│   │                                                       │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 学习类型

### 1. 显式反馈学习
用户直接提供的评价：
```
👍 正面反馈: "这个实现很好，简洁高效"
👎 负面反馈: "代码太复杂，可以更简单"
📝 建议反馈: "建议使用组合模式替代继承"
```

### 2. 隐式反馈学习
从用户行为推断：
```
✅ 接受建议 → 正面信号
🔄 多次修改 → 可能方向不对
⏭️ 跳过步骤 → 可能过于冗长
↩️ 回滚操作 → 策略失败
```

### 3. 执行结果学习
从执行结果学习：
```
🟢 测试通过 → 策略有效
🔴 测试失败 → 需要调整
⚠️ 性能问题 → 优化方案
🚫 编译错误 → 语法/类型问题
```

---

## 学习机制

### 提示模板优化
```
原始模板:
  "实现 {功能}，使用 {技术栈}"

学习后优化:
  "实现 {功能}，使用 {技术栈}。
   注意事项（基于历史学习）:
   - 优先考虑错误处理
   - 添加单元测试
   - 遵循项目代码规范"
```

### 决策权重调整
```javascript
// 学习前的权重
const defaultWeights = {
  brevity: 0.3,      // 简洁性
  performance: 0.3,  // 性能
  readability: 0.2,  // 可读性
  security: 0.2      // 安全性
};

// 学习后的权重（用户重视可读性）
const learnedWeights = {
  brevity: 0.2,
  performance: 0.2,
  readability: 0.4,  // 提升
  security: 0.2
};
```

### 错误模式识别
```javascript
const errorPatterns = [
  {
    pattern: /TypeError.*undefined/,
    frequency: 5,
    lastOccurred: "2026-03-27",
    rootCause: "缺少 null 检查",
    prevention: "使用可选链操作符 ?. 或添加 null 检查"
  },
  {
    pattern: /ReferenceError.*not defined/,
    frequency: 3,
    lastOccurred: "2026-03-25",
    rootCause: "缺少 import 语句",
    prevention: "生成代码时自动添加 import"
  }
];
```

---

## 使用方式

### 提供反馈
```bash
# 正面反馈
/stdd-learn good "这个实现很简洁"

# 负面反馈
/stdd-learn bad "代码太复杂了"

# 建议反馈
/stdd-learn suggest "建议使用函数式编程风格"
```

### 查看学习状态
```bash
/stdd-learn status
```

输出:
```
📚 STDD 学习系统状态

📊 学习统计:
  总反馈: 45 条
  ├─ 正面: 32 条 (71%)
  ├─ 负面: 8 条 (18%)
  └─ 建议: 5 条 (11%)

🎯 已学习的偏好:
  1. 优先使用函数式编程 (置信度: 85%)
  2. 重视代码可读性 (置信度: 78%)
  3. 偏好简洁实现 (置信度: 72%)

⚠️ 已识别的错误模式:
  1. TypeError: undefined (出现 5 次)
     预防: 使用可选链操作符
  2. ReferenceError (出现 3 次)
     预防: 自动添加 import

📈 改进效果:
  - 错误率降低: 35%
  - 代码质量提升: 22%
  - 用户满意度: 89%
```

### 查看学习详情
```bash
# 查看偏好学习
/stdd-learn preferences

# 查看错误模式
/stdd-learn patterns

# 查看模板优化历史
/stdd-learn templates
```

### 管理学习数据
```bash
# 重置学习数据
/stdd-learn reset

# 导出学习数据
/stdd-learn export > learning-data.json

# 导入学习数据
/stdd-learn import learning-data.json
```

---

## 学习报告

```bash
/stdd-learn report
```

输出:
```
📊 STDD 学习报告 (过去 30 天)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 偏好学习

代码风格偏好:
  ┌─────────────────┬──────────┬──────────┐
  │ 偏好项          │ 学习前   │ 学习后   │
  ├─────────────────┼──────────┼──────────┤
  │ 简洁性权重      │ 0.30     │ 0.25     │
  │ 可读性权重      │ 0.20     │ 0.35     │
  │ 函数式风格      │ 0.40     │ 0.70     │
  │ 类型安全        │ 0.60     │ 0.85     │
  └─────────────────┴──────────┴──────────┘

实现策略偏好:
  • 优先选择: 纯函数 + 不可变数据 (↑ 40%)
  • 次选策略: 类 + 继承 (↓ 25%)
  • 避免策略: 全局状态 (↓ 60%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 错误模式识别

高频错误模式:
  1. TypeError: Cannot read property 'x' of undefined
     出现次数: 12
     根因: 缺少 null/undefined 检查
     预防策略: 使用可选链 ?.
     学习效果: 此类错误下降 67%

  2. Missing import statement
     出现次数: 8
     根因: 生成代码时遗漏 import
     预防策略: 自动检测并添加 import
     学习效果: 此类错误下降 100%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 模板优化

已优化的提示模板: 5 个

示例 - stdd-execute 模板:
  原始:
    "执行 TDD 循环"

  优化后:
    "执行 TDD 循环，注意:
     - 添加 null 检查
     - 使用可选链操作符
     - 自动添加 import 语句
     - 遵循函数式编程风格"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 整体改进

  代码质量:
    ├── 可读性: 78% → 89% (+11%)
    ├── 错误率: 15% → 5% (-10%)
    └── 用户满意度: 72% → 89% (+17%)

  开发效率:
    ├── 首次成功率: 65% → 82% (+17%)
    ├── 迭代次数: 4.2 → 2.8 (-33%)
    └── 平均完成时间: 45min → 32min (-29%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 下一步建议

  1. 加强异步错误处理的学习
  2. 优化复杂度评估模型
  3. 增加性能测试反馈收集
```

---

## 学习数据存储

在 `.stdd/memory/learning/` 中：

```
.stdd/memory/learning/
├── feedback/
│   ├── 2026-03-27.json
│   └── ...
├── preferences.json        # 学习到的偏好
├── patterns.json           # 错误模式
├── templates/              # 优化的模板
│   ├── stdd-execute.md
│   └── ...
└── stats.json              # 统计数据
```

### 数据格式

**preferences.json**:
```json
{
  "codeStyle": {
    "brevity": 0.25,
    "readability": 0.35,
    "functionalStyle": 0.70,
    "typeSafety": 0.85
  },
  "implementationStrategy": {
    "preferred": ["pure-functions", "immutability"],
    "secondary": ["classes"],
    "avoided": ["global-state"]
  },
  "confidenceScores": {
    "functionalStyle": 0.85,
    "readability": 0.78
  }
}
```

**patterns.json**:
```json
{
  "errorPatterns": [
    {
      "id": "ep-001",
      "pattern": "TypeError.*undefined",
      "frequency": 12,
      "rootCause": "missing-null-check",
      "prevention": "使用可选链操作符 ?.",
      "effectiveness": 0.67,
      "lastUpdated": "2026-03-27"
    }
  ]
}
```

---

## 与 STDD 工作流集成

```
/stdd-execute 执行中
    │
    ├──► 捕获执行结果
    │       │
    │       └──► 自动分析错误模式
    │
    └──► 用户反馈
            │
            ├──► /stdd-learn good → 强化当前策略
            └──► /stdd-learn bad → 调整决策权重

/stdd-commit 完成后
    │
    └──► 自动评估本次实现质量
            │
            └──► 更新学习数据

/stdd-learn status
    │
    └──► 显示学习效果和改进建议
```

---

## 隐私与安全

- 所有学习数据存储在本地
- 不上传到云端
- 用户可随时删除学习数据
- 支持选择性共享学习成果

---

> **引用**: 借鉴自机器学习中的在线学习 (Online Learning) 和强化学习 (Reinforcement Learning) 模式
