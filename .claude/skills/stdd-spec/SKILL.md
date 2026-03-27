---
name: stdd-spec
description: |
  将需求草案转译为 BDD (Given/When/Then) 严谨规范文档。
  触发场景：用户说 '/stdd-spec', 'stdd spec', '生成BDD', 'BDD规格', 'stdd spec'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD BDD 规格生成与验证门控 (/stdd-spec)

目标：在动手编写任何代码前，用跨团队懂的自然语言完全锁定系统行为逻辑与验收成功标准。

1. 【上下文加载】：专门加载 `.stdd/active_feature/01_proposal.md`。拒绝读取其他的实现代码库文件，以防思维固化。
2. 【生成特性文档】：在 `.stdd/active_feature/02_bdd_specs.feature` 文件中写入严谨的 BDD (行为驱动开发) 格式。每个功能或边角案例都作为一个独立的 `Scenario`。
   - **绝对红线**：禁止涉及任何具体实现细节（比如：前端类名、某一张具体的数据库表结构、某种特定的 API 端点 URL）。只讲人类能理解的外部行为观察。
3. 【确认门控 (Human Gate)】：暂停执行。提醒用户："验收规格 `.feature` 已生成，在这个规格以外的分支需求我一概不会开发。请检查行为流是否满足您的业务需求！"
4. 【结束引导】：告知用户在批准上一步后，通过输入 `/stdd-plan` 开启架构拆解阶段。
