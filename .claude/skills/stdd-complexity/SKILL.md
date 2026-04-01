---
name: stdd-complexity
description: |
  APP 代码质量计算 - 客观量化代码复杂度，生成 APP Mass 报告，集成到 stdd-metrics。
  触发场景：用户说 '/stdd-complexity', 'complexity', '复杂度', '代码质量', 'APP评分', 'stdd complexity'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD APP 代码质量计算 (/stdd-complexity)

目标：借鉴 tdder 的 **APP (Absolute Priority Premise)** 质量计算，客观量化代码复杂度，为 Ralph Loop 重构阶段提供可操作的改进目标。

## 核心理念

APP 的核心主张是：**代码复杂度可以且应该被客观测量**。通过计算每个模块的 "质量质量"（即 APP Mass），团队可以在重构阶段有明确的数据驱动目标，而非依赖主观判断。

---

## APP Mass 计算公式

### 单函数评分

对每个函数/方法，计算以下 6 个维度的加权得分：

```
APP_Mass(func) = Σ (dimension_score × weight)

维度:
  1. Lines of Code (LOC)      权重 15%  — 函数长度
  2. Cyclomatic Complexity (CC) 权重 25%  — 分支复杂度
  3. Cognitive Complexity (CogC) 权重 20%  — 认知负担
  4. Parameter Count (Params)   权重 15%  — 参数数量
  5. Nesting Depth (Depth)      权重 15%  — 嵌套层级
  6. Dependency Count (Deps)    权重 10%  — 外部依赖数
```

### 评分标准

每个维度 0-10 分（0 = 优秀，10 = 糟糕）：

| 维度 | 0 分 | 3 分 | 5 分 | 7 分 | 10 分 |
|------|------|------|------|------|-------|
| LOC | ≤5 行 | 6-15 行 | 16-30 行 | 31-50 行 | >50 行 |
| CC | 1 | 2-3 | 4-6 | 7-10 | >10 |
| CogC | 0 | 1-5 | 6-10 | 11-15 | >15 |
| Params | 0-1 | 2 | 3 | 4 | ≥5 |
| Depth | 0-1 | 2 | 3 | 4 | ≥5 |
| Deps | 0-2 | 3-5 | 6-8 | 9-12 | >12 |

### 模块/文件级评分

```
APP_File = Σ(APP_Mass(func) for func in file) / count(funcs)

APP_Module = Σ(APP_File(file) for file in module) / count(files)

APP_Project = Σ(APP_Module(module) for all modules) / count(modules)
```

---

## 质量等级

| APP Mass | 等级 | 标记 | 建议 |
|----------|------|------|------|
| 0.0 - 2.0 | A | 🟢 优秀 | 保持现状 |
| 2.1 - 3.5 | B | 🟢 良好 | 可选优化 |
| 3.6 - 5.0 | C | 🟡 一般 | 建议重构 |
| 5.1 - 7.0 | D | 🟠 较差 | 必须重构 |
| 7.1 - 10.0 | F | 🔴 糟糕 | 立即重构 |

---

## 执行步骤

### 1. 扫描目标代码

确定分析范围：

```bash
# 分析整个项目
/stdd-complexity

# 分析特定目录
/stdd-complexity src/services/

# 分析特定文件
/stdd-complexity src/services/TodoService.ts
```

### 2. 逐函数计算

对每个函数执行：

1. **提取度量值**：
   - LOC：函数体内非空非注释行数
   - CC：`if/else/for/while/switch/catch/&&/||/??` 计数 + 1
   - CogC：嵌套增加 +1，`break/continue` 到嵌套循环 +1，递归 +1
   - Params：参数列表长度
   - Depth：最大 `{}` 嵌套层级
   - Deps：`import/require` 中直接引用的数量

2. **查表得分**：根据评分标准表获取每个维度的 0-10 分

3. **加权计算**：`APP_Mass = LOC×0.15 + CC×0.25 + CogC×0.20 + Params×0.15 + Depth×0.15 + Deps×0.10`

### 3. 生成报告

#### 控制台摘要

```
╔══════════════════════════════════════════════════════════════╗
║              📊 APP Complexity Report                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  项目: todo-app    文件: 12    函数: 47                       ║
║  项目 APP Mass: 3.2 (B 🟢 良好)                              ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  模块评分                                                     ║
║  ────────                                                    ║
║  🟢 src/types/         1.4 (A)  3 funcs                      ║
║  🟢 src/services/      2.8 (B)  12 funcs                     ║
║  🟡 src/components/    4.1 (C)  18 funcs                     ║
║  🟠 src/utils/         5.3 (D)  8 funcs                      ║
║  🟢 src/__tests__/     1.9 (A)  6 funcs                      ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  🔴 Top 5 需要重构的函数                                     ║
║  ─────────────────────────                                    ║
║  1. exportMarkdown()     7.8 (F)  LOC:52 CC:9 CogC:14       ║
║  2. handleSubmit()       6.5 (D)  LOC:38 CC:7 CogC:11       ║
║  3. parseFilter()        5.9 (D)  LOC:45 CC:8 CogC:9        ║
║  4. validateInput()      5.2 (D)  LOC:32 CC:6 CogC:8        ║
║  5. renderList()         4.8 (C)  LOC:28 CC:5 CogC:7        ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  重构建议                                                     ║
║  ────────                                                    ║
║  1. exportMarkdown(): 拆分为 formatItem()+buildSection()     ║
║  2. handleSubmit(): 提取 validate()+submit() 子函数          ║
║  3. parseFilter(): 使用策略模式替代 switch/if 链             ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### 4. 生成 JSON 报告

写入 `stdd/reports/complexity.json`：

```json
{
  "timestamp": "2026-04-01T10:30:00Z",
  "project": "todo-app",
  "summary": {
    "total_files": 12,
    "total_functions": 47,
    "app_mass": 3.2,
    "grade": "B",
    "distribution": {
      "A": 15,
      "B": 18,
      "C": 8,
      "D": 4,
      "F": 2
    }
  },
  "modules": [
    {
      "path": "src/utils/",
      "app_mass": 5.3,
      "grade": "D",
      "functions": [
        {
          "name": "exportMarkdown",
          "file": "src/utils/exportMarkdown.ts",
          "line": 15,
          "app_mass": 7.8,
          "grade": "F",
          "dimensions": {
            "loc": { "value": 52, "score": 10 },
            "cc": { "value": 9, "score": 7 },
            "cogc": { "value": 14, "score": 7 },
            "params": { "value": 3, "score": 5 },
            "depth": { "value": 4, "score": 7 },
            "deps": { "value": 5, "score": 3 }
          }
        }
      ]
    }
  ],
  "refactoring_suggestions": [
    {
      "function": "exportMarkdown",
      "app_mass": 7.8,
      "suggestion": "拆分为 formatItem()+buildSection()",
      "target_mass": 3.0
    }
  ]
}
```

---

## 与 Ralph Loop 集成

在 Ralph Loop 的 **Refactor 阶段** 自动触发：

```
5. 🔵 REFACTOR:
   a. 运行 /stdd-complexity 对当前修改的文件
   b. 如果 APP_Mass > 5.0 (D/F 级):
      - 自动生成重构建议
      - 执行建议的拆分/提取
      - 重新计算确认 APP_Mass 下降
   c. 如果 APP_Mass ≤ 5.0:
      - 通过，继续下一个任务
```

### 与 stdd-metrics 集成

APP Mass 作为 `stdd-metrics` 代码质量指标的核心计算引擎：

```
代码质量评分 = APP_Mass 加权平均 + 覆盖率权重 + TDD 合规权重

具体公式:
  quality_score = (
    app_mass_normalized × 0.40 +    // APP Mass 转换为 0-100
    coverage_score × 0.30 +          // 测试覆盖率
    tdd_compliance × 0.30            // TDD 合规率
  )
```

---

## 阈值配置

在 `stdd/config.yaml` 中可配置：

```yaml
tdd:
  complexity:
    enabled: true
    # 触发重构的阈值
    refactor_threshold: 5.0    # D 级以上必须重构
    warning_threshold: 3.5     # C 级建议重构
    # 各维度权重（可自定义）
    weights:
      loc: 0.15
      cc: 0.25
      cogc: 0.20
      params: 0.15
      depth: 0.15
      deps: 0.10
    # 排除规则
    exclude:
      - "**/*.test.*"
      - "**/*.spec.*"
      - "**/types/**"
      - "**/fixtures/**"
```

---

## 快速参考

```bash
# 全项目分析
/stdd-complexity

# 指定目录
/stdd-complexity src/services/

# 仅显示 D/F 级函数
/stdd-complexity --threshold=5.0

# 输出 JSON
/stdd-complexity --format=json --output=stdd/reports/complexity.json
```

## 与其他 Skill 的关系

```
/stdd-execute (Refactor 阶段) ──► /stdd-complexity ──► 重构建议
                                                           │
/stdd-metrics (代码质量评分) ◄──────────────────────────────┘
```
