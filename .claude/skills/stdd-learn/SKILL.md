---
name: stdd-learn
description: |
  自适应学习系统 - 从用户反馈学习，优化提示模板，改进决策质量
  触发场景：用户说 '/stdd-learn', 'learn', '学习', '自适应', '优化提示'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
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

## Pattern Teaching（从现有代码学习模式）

参考 TDAID，Pattern Teaching 让 AI 从项目现有代码中学习编码风格、命名规范、架构模式和惯用写法，使后续生成的代码与项目风格一致。

### 学习维度

```
┌─────────────────────────────────────────────────────────────┐
│                  Pattern Teaching 架构                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   现有代码库 ──► [模式提取] ──► [规范生成] ──► [风格应用]   │
│                     │               │               │        │
│                     ▼               ▼               ▼        │
│               ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│               │ 命名规范   │  │ 风格指南   │  │ 新代码     │  │
│               │ 架构模式   │  │ 惯用写法   │  │ 自动适配   │  │
│               │ 错误处理   │  │ 导入风格   │  │ 项目风格   │  │
│               └───────────┘  └───────────┘  └───────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 使用方式

```bash
# 分析项目代码模式（扫描整个项目）
/stdd-learn analyze-patterns

# 分析特定目录的模式
/stdd-learn analyze-patterns --dir=src/services

# 查看已学习的模式
/stdd-learn patterns

# 导出风格指南
/stdd-learn export-styleguide
```

### 提取的模式类型

| 模式类型 | 提取内容 | 示例 |
|---------|---------|------|
| **命名规范** | 变量/函数/类/文件的命名风格 | camelCase 变量、PascalCase 类、kebab-case 文件 |
| **架构模式** | 分层/模块化/依赖方向 | Service→Repository 分层 |
| **错误处理** | try/catch 模式、错误类型、日志风格 | 自定义 Error 类 + 错误码 |
| **异步风格** | async/await vs Promise.then vs callback | async/await 统一风格 |
| **导入风格** | import 排序、路径别名、相对路径深度 | 绝对路径 + 别名 @/ |
| **类型使用** | interface vs type、泛型使用模式、品牌类型 | interface 优先 |
| **测试风格** | describe/it 组织、mock 模式、断言风格 | AAA (Arrange-Act-Assert) |
| **注释风格** | JSDoc 频率、内联注释风格 | 函数 JSDoc + 行内 Why 注释 |
| **状态管理** | 不可变更新、状态提升模式 | spread/immer 不可变更新 |

### 输出示例

```
🔍 Pattern Teaching — 代码模式分析

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 扫描范围: src/**/*.ts (128 文件)

📝 命名规范
  变量:    camelCase (98%) — ✅ 强规则
  函数:    camelCase (95%) — ✅ 强规则
  类:      PascalCase (100%) — ✅ 强规则
  常量:    SCREAMING_SNAKE (87%) — ⚠️ 弱规则
  文件:    kebab-case (92%) — ✅ 强规则
  接口:    PascalCase, 无 I 前缀 (100%) — ✅ 强规则

🏗️ 架构模式
  分层:    Controller → Service → Repository (76% 文件遵循)
  依赖注入: 构造函数注入 (89%)
  接口抽象: Service 层面向接口 (62%)

⚡ 异步风格
  主风格:  async/await (94%) — ✅ 强规则
  错误处理: try/catch + 自定义 Error 类 (78%)

📦 导入风格
  排序:    第三方 → 本地模块 → 类型 (85%)
  路径:    @/ 别名优先 (91%)
  分组:    空行分隔 (72%)

🧪 测试风格
  组织:    describe > describe > it (三层嵌套)
  断言:    expect().toBe/toEqual/toThrow
  Mock:    vi.fn() + vi.mock() 模式
  工厂:    createXXX() 工厂函数模式

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 模式置信度

  命名规范:     95% (高置信度 — 生成代码时必须遵循)
  架构模式:     76% (中置信度 — 建议遵循)
  测试风格:     88% (高置信度 — 生成测试时必须遵循)
  异步风格:     94% (高置信度 — 必须遵循)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 模式数据已保存到: stdd/memory/learning/code-patterns.json
📄 风格指南已生成: stdd/memory/learning/styleguide.md
```

### 模式应用

Pattern Teaching 分析完成后，所有后续 skill（stdd-execute、stdd-apply 等）自动读取 `code-patterns.json`，生成的代码将遵循学到的模式：

```bash
# Pattern Teaching 自动应用于所有代码生成
/stdd-execute    # 自动遵循学到的命名、架构、异步风格
/stdd-spec       # 测试风格自动匹配项目惯例
/stdd-apply      # 实现代码自动适配项目模式
```

### 数据存储

```
stdd/memory/learning/
├── code-patterns.json     # 提取的代码模式（机器可读）
├── styleguide.md          # 生成的风格指南（人类可读）
└── pattern-confidence.json # 各模式置信度
```

**code-patterns.json** 示例：
```json
{
  "naming": {
    "variables": { "style": "camelCase", "confidence": 0.98 },
    "classes": { "style": "PascalCase", "confidence": 1.0 },
    "constants": { "style": "SCREAMING_SNAKE", "confidence": 0.87 },
    "files": { "style": "kebab-case", "confidence": 0.92 },
    "interfaces": { "style": "PascalCase", "prefix": "none", "confidence": 1.0 }
  },
  "architecture": {
    "layering": "Controller-Service-Repository",
    "di_pattern": "constructor-injection",
    "confidence": 0.76
  },
  "async": {
    "style": "async-await",
    "error_handling": "try-catch-custom-error",
    "confidence": 0.94
  },
  "imports": {
    "sort_order": ["third-party", "local", "types"],
    "path_style": "alias",
    "alias": "@/",
    "confidence": 0.88
  },
  "testing": {
    "structure": "describe-nested",
    "assertion": "expect",
    "mocking": "vi.fn-vi.mock",
    "factory_pattern": "createXXX",
    "confidence": 0.88
  }
}
```

### 与 stdd-learn 集成

Pattern Teaching 是 stdd-learn 的一个子模块：
- `/stdd-learn analyze-patterns` — 触发模式提取
- `/stdd-learn patterns` — 查看已学模式
- `/stdd-learn export-styleguide` — 导出风格指南
- 模式数据与反馈学习数据共享存储目录

---

## 学习数据存储

在 `stdd/memory/learning/` 中：

```
stdd/memory/learning/
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
<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

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
<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

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

## 渐进式发现模式（Progressive Discovery）

参考 AIDD，渐进式发现是一种按需深入的需求理解策略。不要求一开始就了解所有细节，而是在每个工作流阶段逐步发现和补充信息。

### 核心理念

```
┌─────────────────────────────────────────────────────────────┐
│              Progressive Discovery 渐进式发现                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   /stdd-propose  →  /stdd-clarify  →  /stdd-spec            │
│        │                  │               │                  │
│        ▼                  ▼               ▼                  │
│   [发现层 1]          [发现层 2]       [发现层 3]             │
│   核心需求            边界条件          技术约束              │
│   用户角色            错误路径          性能要求              │
│   主流程              异常处理          安全策略              │
│                                                              │
│   每层只问必要问题，不强迫一次性回答所有问题                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 使用方式

```bash
# 查看当前渐进式发现状态
/stdd-learn discovery-status

# 强制进入下一发现层（跳过等待自然触发）
/stdd-learn discover-next
```

### 发现层级

| 层级 | 触发时机 | 发现内容 | 问题数 |
|------|----------|----------|--------|
| L1 核心需求 | `/stdd-propose` | 用户角色、主流程、核心价值 | ≤3 |
| L2 边界条件 | `/stdd-clarify` | 错误路径、边界值、异常处理 | ≤5 |
| L3 技术约束 | `/stdd-spec` | 性能要求、安全策略、兼容性 | ≤3 |
| L4 实现细节 | `/stdd-plan` | 架构选择、依赖关系、复杂度 | ≤3 |

### 与普通流程的区别

| 维度 | 传统模式 | 渐进式发现 |
|------|----------|------------|
| 需求收集 | 一次性全部收集 | 按阶段逐步深入 |
| 问题数量 | 一次性 10+ 个 | 每阶段 ≤5 个 |
| 用户负担 | 重，需要全面思考 | 轻，只关注当前阶段 |
| 回溯成本 | 低（前面都答了） | 可能需要回溯 |
| 适用场景 | 需求明确时 | 需求模糊/探索性时 |

### 数据存储

```json
// stdd/memory/learning/discovery-state.json
{
  "change": "todo-list",
  "current_layer": 2,
  "layers": {
    "1_core": { "status": "completed", "questions_asked": 3, "timestamp": "2026-04-01T10:00:00Z" },
    "2_boundary": { "status": "in_progress", "questions_asked": 2, "remaining": 3 },
    "3_technical": { "status": "pending" },
    "4_implementation": { "status": "pending" }
  },
  "discovered_facts": [
    { "layer": 1, "fact": "用户需要管理 Todo 列表", "confidence": 1.0 },
    { "layer": 2, "fact": "空标题应被拒绝", "confidence": 0.9 }
  ]
}
```

---

## 隐私与安全

- 所有学习数据存储在本地
- 不上传到云端
- 用户可随时删除学习数据
- 支持选择性共享学习成果

---

> **引用**: 借鉴自机器学习中的在线学习 (Online Learning) 和强化学习 (Reinforcement Learning) 模式
