---
name: stdd-turbo
description: |
  (防疲劳模式) 一键合并执行提出需求到任务拆解的所有事前阶段。
  触发场景：用户说 '/stdd-turbo', 'stdd turbo', '一键模式', 'STDD加速', 'stdd turbo'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 防疲劳推进向导 (/stdd-turbo)

目标：在面对非破坏性重构或中小型修改时，撤销冗长的人机问答与确权步骤，一口气贯穿策划、规格生成和白板拆解。

1. 【聚合 Propose & Spec 思考栈】：分析用户的输入意图。AI 即时在内部脑补边缘案例（不向用户打扰提问），并直接生成 `.stdd/active_feature/01_proposal.md`，随后迅速向下转换为符合 Given/When/Then 的严谨规格文件 `02_bdd_specs.feature`。
2. 【聚合 Plan 思考栈】：自动规划契约更新（`contracts.md`），拟定架构图 `03_design.md` 并直接根据上面的规格转化输出明确的带有极细颗粒度勾选框的 `04_tasks.md` 日程白板。
3. 【最终人工大门 (Total Gate)】：在此刻将控制权交还！提醒开发人员指出：
   "我已经将您的功能一口气转化成了完整的业务规约 (Spec) 与极细化的执行微任务白板 (Tasks)。请您抽空人工翻阅 `.stdd/active_feature/` 下的草案及列表进行最后审核！如果没问题，直接回复 `/stdd-execute` 开始狂飙。"
