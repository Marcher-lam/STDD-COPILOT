# /stdd:graph - Skill Graph 引擎

统一的 Skill Graph 可视化、编排、调度和追踪系统。

## 使用方式

```bash
/stdd:graph visualize           # 可视化 Skill 依赖图
/stdd:graph analyze             # 分析当前状态和可执行路径
/stdd:graph run <skill>         # 从指定 Skill 开始执行
/stdd:graph parallel            # 识别并执行可并行的 Skill
/stdd:graph history             # 查看执行历史
/stdd:graph replay <id>         # 回放历史执行
/stdd:graph recommend           # 智能推荐下一步
```

## 可视化

```bash
# 生成 Mermaid 图
/stdd:graph visualize

# 生成 HTML 可交互图
/stdd:graph visualize --format=html

# 仅显示特定层级
/stdd:graph visualize --level=spec

# 输出到文件
/stdd:graph visualize --output=graph.svg
```

## 分析

```bash
# 分析当前执行状态
/stdd:graph analyze

# 分析特定 Skill 的依赖
/stdd:graph analyze --skill=stdd-execute

# 分析可执行路径
/stdd:graph analyze --paths

# 分析瓶颈
/stdd:graph analyze --bottlenecks
```

## 运行

```bash
# 从指定 Skill 开始执行
/stdd:graph run stdd-spec

# 从头开始完整流程
/stdd:graph run stdd-init --full

# 跳过已完成的步骤
/stdd:graph run stdd-execute --skip-completed

# 干运行模式（仅显示计划）
/stdd:graph run stdd-plan --dry-run
```

## 并行执行

```bash
# 识别可并行的 Skill
/stdd:graph parallel --detect

# 执行可并行的 Skill
/stdd:graph parallel --execute

# 设置并行度
/stdd:graph parallel --max-workers=4

# 并行执行特定组
/stdd:graph parallel --group=verification
```

## 历史追踪

```bash
# 查看所有历史
/stdd:graph history

# 查看最近 N 次
/stdd:graph history --last=10

# 查看特定 Skill 的历史
/stdd:graph history --skill=stdd-execute

# 查看失败记录
/stdd:graph history --failures
```

## 回放

```bash
# 回放指定执行 ID
/stdd:graph replay exec-20260327-001

# 回放并重新执行
/stdd:graph replay exec-20260327-001 --re-execute

# 回放特定步骤
/stdd:graph replay exec-20260327-001 --from=3 --to=5
```

## 智能推荐

```bash
# 获取下一步推荐
/stdd:graph recommend

# 基于当前上下文推荐
/stdd:graph recommend --context=current

# 基于目标推荐
/stdd:graph recommend --goal="完成用户认证功能"
```

## Graph 配置

文件位置: `stdd/graph/config.yaml`

```yaml
version: "1.0"
name: "STDD Copilot Skill Graph"

skills:
  stdd-init:
    description: "初始化环境"
    phase: init
    next: [stdd-new]

  stdd-new:
    description: "创建新变更"
    phase: propose
    next: [stdd-clarify, stdd-spec]

  # ... 更多 Skills

dependencies:
  stdd-spec:
    requires: [stdd-clarify]

parallel_groups:
  verification:
    skills: [stdd-mutation, stdd-validate, stdd-contract]
    strategy: "all"
```
