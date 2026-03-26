---
name: stdd-propose
description: |
  提出新特性需求草案并进行澄清 QA。
  触发场景：用户说 '/stdd-propose', 'stdd propose', '提出需求', 'STDD需求', 'stdd propose'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 需求提案与澄清向导 (/stdd-propose)

目标：彻底消除需求边界的模糊地带，并拒绝超大颗粒度的史诗级 (Epic) 任务。

1. 【Epic 探测器 (防爆炸)】：分析用户的输入需求。如果判断这是一个庞大的 Epic 史诗级任务（例如："我要写一个完整的电商首页"、"写一个网盘"），强行拦截！
   - 警告用户："该需求过于庞大。为防止生成的 Spec 规范和下达的任务链爆炸，请将其切分为一个小故事 (User Story) 重新告诉我（例如：只先完成'商品列表的状态渲染'）。"
   - 暂停，等待用户切片。
2. 【边界澄清问答】：若需求粒度合理，**严禁在此阶段写任何实现代码**。找出边缘用例（并发、非凡状态、性能约束等），向人类提出最多 2 个补全 QA。
3. 【生成草案】：获得完整回复后，在 `.stdd/active_feature/01_proposal.md` 写入需求草案。
4. 【结束引导】：提示用户执行 `/stdd-spec`。
