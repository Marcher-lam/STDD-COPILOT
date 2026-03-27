---
name: stdd-plan
description: |
  评估架构变更并生成细粒度的微任务清单白板。
  触发场景：用户说 '/stdd-plan', 'stdd plan', '任务拆解', 'STDD计划', 'stdd plan'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 架构契约与微任务白板拆解 (/stdd-plan)

目标：输出详细微任务，同时建立绝对的跨模块数据契约（Contract），阻断实施阶段 AI 因隔离引发的失忆或接口乱编。

1. 【契约对齐 (防脱节)】：在设计阶段，必须首先在 `.stdd/memory/contracts.md`（或指向项目中真实的共享 `types.ts` 等文件）中敲定好组件/前后端之间的数据结构与接口类型。这保证了哪怕 TDD 在执行某特定微任务时由于隔离只读取了 1 个文件，也有着"公用契约基准"打底。
2. 【架构思考】：在 `.stdd/active_feature/03_design.md` 中画出这次变更涉及的组件依赖流与架构拓扑。
3. 【拆解微任务】：在 `.stdd/active_feature/04_tasks.md` 内，严格采用 Markdown Checkbox (`[ ]`) 制作极细步骤：
   - 必须由外向内的红绿推进：E2E测试架构 -> 底层核心（逻辑与数据） -> 业务胶水层 -> 外部 UI/CLI 呈现。
4. 【确认门控 (Human Gate)】：通知用户并挂起要求签批。
5. 【结束引导】：用户认同后，提示输入 `/stdd-execute` 开始真正的 TDD 代码微生成环。
