---
name: stdd-commit
description: |
  归档特性，完成防范围溢漏审查，原子化提交。
  触发场景：用户说 '/stdd-commit', 'stdd commit', '提交代码', 'STDD提交', 'stdd commit'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD 文档闭环与原子规范提交 (/stdd-commit)

目标：杜绝屎山堆积。每次大特性落幕必须严格归档和规范化提交。

1. 【防溢出审查】：将现在的实际落地产物集，同最初规划的 `02_bdd_specs.feature` 进行一次防漏缝与溢出的逆向比对。如果发现多加了完全违背业务需求的非必要复杂结构，警告用户。
2. 【全局记忆更新】：将本次特性引入的最新组件/系统架构更新进核心记忆库：`.stdd/memory/components.md` 和 `foundation.md`。这保证以后的开发记忆不会断层。
3. 【原子化 Git 归档】：扫描 `git diff`。基于 STDD 的纯绿色记录，强制分为若干小份提交：
   - 打包所有被修改或新增的测试文件，执行类似 `git commit -m "red: test spec for [本次功能点]"`
   - 打包核心逻辑实现代码，执行 `git commit -m "green: implement [本次功能点]"`
   - 提取重构与清理行为产生的冗余代码分离，执行 `git commit -m "refactor: optimize [本次组件]"`
4. 【结束】：清理 `active_feature/` 临时态目录。庆祝开发完成！迎接下一个光荣的需求。
