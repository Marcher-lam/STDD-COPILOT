# 在 Claude Code 中使用 STDD Copilot (最佳实践)

STDD Copilot 的核心本质是将**开发流程固化为基于 Markdown 的工作流指令（在 `.agents/skills/` 下）**，而 Claude Code 天生能够理解这些 Markdown 树形逻辑并完美执行！

两者结合的体验，无需复杂的代码插件编写，直接获得一个**不跑偏、懂测试约束**的超级 AI 结对编程专家。

## 1. 原理：为什么 Claude Code 能直接跑？

- **零成本解析**：STDD 将高级约束（如 `/stdd-turbo`、微任务拆解规则、多轮交互）变成声明式文档；Claude Code 则充当完美的"执行体"（操作文件系统、跑终端命令、修改代码）。
- **天然契合**：大模型最喜欢严谨的步骤拆解，你只需要要求 Claude 在当前工作区优先遵循特定的 SKILL.md 流程指令，它就会变得既有强执行力、又受系统安全网制约。

---

## 2. 基础交互步骤

### 第一步：在项目中引入 STDD 框架沙盒

进入您的业务开发目标目录，通过命令行初始化 `.agents` 与 `.stdd` 的骨架结构：

```bash
# 如果前面已经通过 npm link 关联了 stdd-copilot CLI：
stdd /stdd-init
```

### 第二步：在同级目录启动 Claude Code

在你的项目根目录里，直接呼出 Claude 控制台：

```bash
claude
```

### 第三步：直接"点对点"下达 STDD 指令

由于 Claude Code 会实时扫描并理解当前项目的文件结构，你在对话框中可以直接指定路径让其接管流程：

```text
> 请严格按照本地 .agents/skills/stdd-propose/SKILL.md 中的定义执行需求。我的需求是：编写一个支持 Markdown 导出的简易 Todo-List。
```

**遇到需要连续执行的防疲劳模式：**

```text
> 遵循 .agents/skills/stdd-turbo/SKILL.md 的步骤流水线。需求：开发一个登录页组件。遇到 "confirm" 或需要 user 输入 `yes/no` 的挂起环节，必须停下来提问我。
```

---

## 3. 高阶配置：无感植入 STDD (全局系统约定)

每一次都去打路径（如 `.agents/skills/.../SKILL.md`）显然太麻烦。你可以依靠 Claude 对上文契约的遵守力度，在项目第一次启动时为其**"注入身份"**：

在对话伊始，抛出这段通用约束（你可以把它存为 `stdd-rules.txt` 并让 Claude 读取）：

> **[项目顶层纪律设定]：**
> 你的身份是受 STDD Copilot 监管的执行体。从现在起，一旦我输入任何以 `/stdd-` 开头的斜杠指令（例如 `/stdd-plan`, `/stdd-commit`），你必须:**立刻、无条件**读取本项目根目录下 `.agents/skills/{指令名称}/SKILL.md` 文件，并将其声明的具体步骤视作最高优先级的任务规则（System Prompt）进行运转。如果流程需要与我确认交互，严禁自作主张。

**自此之后，你的体验将产生质变：**

```text
> 我明白了，已加载 STDD 纪律。

> /stdd-spec
```

就凭输入一个 `/stdd-spec`，Claude 会乖乖前往目录下阅读规则，然后吐出标准化的 `02_bdd_specs.feature` (BDD行为树) 并停止，体验丝滑流畅，彻底告别写满屏幕却无法测试的"屎山幻觉代码"！

---

## 4. 可用指令列表

| 指令 | 说明 |
|------|------|
| `/stdd-init` | 初始化 STDD 工作区 |
| `/stdd-propose` | 提出需求草案 |
| `/stdd-clarify` | 需求澄清问答 |
| `/stdd-confirm` | 需求确认 |
| `/stdd-spec` | 生成 BDD 规格 |
| `/stdd-plan` | 任务拆解 |
| `/stdd-execute` | TDD 执行循环 |
| `/stdd-apply` | 开始实现 |
| `/stdd-final-doc` | 生成最终文档 |
| `/stdd-commit` | 原子化提交 |
| `/stdd-turbo` | 一键防疲劳模式 |
