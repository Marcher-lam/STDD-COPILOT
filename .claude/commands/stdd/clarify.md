# /stdd:clarify - 需求澄清

对需求草案进行多轮智能澄清，补全边界条件和隐含约束。

## 使用方式

```
/stdd:clarify                  # 澄清当前活跃变更
/stdd:clarify --change=<name>  # 澄清指定变更
```

## 执行流程

1. **读取提案** - 加载 `proposal.md` 中的原始需求
2. **生成澄清问题** - 自动生成 3-5 条关键问题（技术栈、持久化、边界条件等）
3. **逐条交互** - 每个问题单独展示，等待用户回复
4. **记录澄清** - 将回复写入 `proposal.md` 的 `<!-- Clarify -->` 区块
5. **自动流转** - 澄清完成后自动进入 `/stdd:confirm` 阶段

## 示例

```
/stdd:clarify

# 交互示例：
Q1: 数据持久化方式？（localStorage / IndexedDB / 后端 API）
> localStorage

Q2: 导出格式支持哪些？（Markdown / JSON / CSV）
> Markdown 和 JSON
```

## 下一步

- 澄清完成后自动进入 `/stdd:confirm`
