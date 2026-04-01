# /stdd:final-doc - 生成最终文档

聚合所有阶段产出，生成完整的最终需求文档。

## 使用方式

```
/stdd:final-doc                # 为当前活跃变更生成文档
/stdd:final-doc --change=<name>  # 为指定变更生成文档
```

## 执行流程

1. **读取原始需求** - 从 `proposal.md` 提取标题与正文
2. **聚合澄清记录** - 按 `<!-- Clarify -->` 区块组织澄清章节
3. **确认状态** - 检查 `<!-- Confirmed -->` 标记
4. **插入 BDD 规格** - 将 `.feature` 文件作为规格章节
5. **任务清单** - 读取 `tasks.md` 生成任务章节
6. **实现摘要** - 抽取代码文件头部注释，汇总实现概览
7. **测试概览** - 统计用例数、通过率、变异审查结果
8. **变更日志** - 收集 `red:/green:/refactor:` 前缀的 git 提交
9. **文档元信息** - 写入版本号和生成时间
10. **输出文件** - 写入 `FINAL_REQUIREMENT.md`

## 输出结构

```markdown
# FINAL REQUIREMENT DOCUMENT (Version: v1.0.0)
*Generated on <timestamp>*

## 1. 原始需求
## 2. 需求澄清
## 3. 需求确认
## 4. BDD 规格
## 5. 任务拆解
## 6. 实现概览
## 7. 测试概览
## 8. 变更日志
```

## 下一步

- 运行 `/stdd:archive` 归档变更
