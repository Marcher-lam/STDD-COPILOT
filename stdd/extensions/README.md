# STDD Extensions

用户自定义 Skill 扩展系统。

## 用途

允许用户在不修改 STDD 核心 Skills 的情况下，添加自定义的工作流步骤和检查规则。

## 使用方式

### 1. 创建 Extension

在 `stdd/extensions/` 下创建目录和 `extension.yaml`：

```bash
stdd/extensions/
└── my-custom-check/
    ├── extension.yaml    # 扩展配置
    └── skill.md          # 扩展 Skill 内容
```

### 2. Extension 配置格式

```yaml
# extension.yaml
name: my-custom-check
version: "1.0.0"
description: "自定义代码检查扩展"
author: "your-name"

# 注入点：在 STDD 工作流的哪个阶段运行
hooks:
  # 在 execute 阶段之前运行
  pre_execute:
    - skill: skill.md
      description: "运行自定义检查"

  # 在 commit 阶段之后运行
  post_commit:
    - skill: skill.md
      description: "生成自定义报告"

# 可选：注入到 Constitution 的检查
constitution_override:
  articles:
    - id: "custom-01"
      title: "Custom Check"
      priority: "suggestion"
      description: "检查自定义规则"
```

### 3. Extension Skill 文件

`skill.md` 是标准的 Markdown 指令文件，AI 会读取并执行：

```markdown
# 自定义检查规则

在执行 TDD 循环时，额外检查以下内容：

1. 所有公开方法必须有 JSDoc 注释
2. 不得使用 `any` 类型
3. 函数长度不超过 50 行
```

### 4. 注册 Extension

Extension 在 `/stdd-init` 时自动扫描并注册到 Registry：

```bash
/stdd-init  # 自动发现 stdd/extensions/ 下所有扩展
```

## 内置 Extensions（无，仅目录结构）

Extensions 目录默认为空，用户按需添加。

---

## Extension Marketplace（扩展市场）

参考 SpecKit 的扩展市场机制，提供社区贡献和 RFC 流程。

### 提交新扩展 (RFC 流程)

```bash
# 1. 创建扩展草案
/stdd-init --extension=stdd-lint-rules
# → 生成 stdd/extensions/stdd-lint-rules/extension.yaml 草案

# 2. 填写 RFC 表格
# extension.yaml 中增加 rtf 段:
```

```yaml
# extension.yaml (含 RFC)
name: stdd-lint-rules
version: "1.0.0"
description: "自定义 Lint 规则集合"
author: "community-contributor"
license: "MIT"

# RFC (Request for Comments)
rfc:
  status: draft          # draft → review → approved → published
  submitted: "2026-04-02"
  motivation: "项目需要团队共享的 Lint 规则"
  scope: "pre_execute hook"
  breaking_changes: false
  dependencies: []

hooks:
  pre_execute:
    - skill: skill.md
      description: "运行自定义 Lint 规则检查"

# 兼容性声明
compatibility:
  min_stdd_version: "1.0.0"
  supported_engines: [claude-code, cursor, windsurf]
  tested_languages: [typescript, javascript]
```

### 扩展发现与安装

```bash
# 列出可用社区扩展
/stdd-init --marketplace

# 安装社区扩展
/stdd-init --install-extension=stdd-lint-rules

# 验证已安装扩展
/stdd-init --verify-extensions
```

### 扩展审核标准

| 标准 | 说明 |
|------|------|
| **安全性** | 无文件系统外访问、无网络请求（除非明确声明） |
| **兼容性** | 必须声明支持的 AI 引擎和语言 |
| **可逆性** | 安装/卸载不影响核心 STDD 功能 |
| **文档完整性** | extension.yaml + skill.md + README.md 缺一不可 |
| **测试覆盖** | 含 .test.md 示例验证扩展行为 |
