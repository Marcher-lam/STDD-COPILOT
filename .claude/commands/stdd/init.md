# /stdd:init - 初始化 STDD 项目

初始化 STDD Copilot 环境，创建必要的目录结构和配置文件。

## 使用方式

```
/stdd:init                    # 初始化项目
/stdd:init --force            # 强制重新初始化
/stdd:init --with-memory      # 包含向量数据库
```

## 生成的目录结构

```
.claude/
├── commands/
│   └── stdd/
│       ├── init.md
│       ├── new.md
│       ├── explore.md
│       ├── ff.md
│       ├── continue.md
│       ├── apply.md
│       ├── verify.md
│       ├── archive.md
│       └── graph.md
└── skills/
    ├── stdd-propose/
    │   └── SKILL.md
    ├── stdd-clarify/
    │   └── SKILL.md
    ├── stdd-spec/
    │   └── SKILL.md
    ├── stdd-plan/
    │   └── SKILL.md
    ├── stdd-execute/
    │   └── SKILL.md
    ├── stdd-verify/
    │   └── SKILL.md
    └── ... (更多技能)

stdd/
├── changes/
│   └── archive/           # 归档的变更
├── specs/
│   └── .gitkeep
├── memory/
│   ├── foundation.md      # 项目基础约束
│   ├── components.md      # 组件架构
│   └── patterns.md        # 设计模式
└── config.yaml            # STDD 配置
```

## 初始化流程

```
┌─────────────────────────────────────────────────────────────┐
│                    STDD 初始化流程                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 检测项目类型                                             │
│     ├── package.json → Node.js                              │
│     ├── pom.xml → Java/Maven                                │
│     ├── requirements.txt → Python                           │
│     └── Cargo.toml → Rust                                   │
│                                                              │
│  2. 识别技术栈                                               │
│     ├── 框架: React/Vue/Spring/etc.                         │
│     ├── 测试: Jest/Vitest/PyTest/etc.                       │
│     └── 语言: TypeScript/Python/Java/etc.                   │
│                                                              │
│  3. 生成记忆文件                                             │
│     ├── foundation.md - 基础约束                            │
│     ├── components.md - 组件架构                            │
│     └── patterns.md - 设计模式                              │
│                                                              │
│  4. 创建命令文件                                             │
│     └── 复制 stdd 命令模板                                  │
│                                                              │
│  5. 配置 hooks (可选)                                        │
│     └── TDD 守护钩子                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 示例输出

```
🚀 初始化 STDD Copilot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 项目分析

┌─────────────────┬──────────────────────┐
│ 项目类型        │ Node.js               │
│ 框架            │ React 18 + TypeScript│
│ 测试框架        │ Vitest               │
│ 构建工具        │ Vite                 │
│ 包管理器        │ pnpm                 │
└─────────────────┴──────────────────────┘

📁 创建目录结构

  ✅ .claude/commands/stdd/
  ✅ .claude/skills/
  ✅ stdd/changes/archive/
  ✅ stdd/specs/
  ✅ stdd/memory/

📝 生成记忆文件

  ✅ stdd/memory/foundation.md (检测到 15 条约束)
  ✅ stdd/memory/components.md (识别到 8 个组件)
  ✅ stdd/memory/patterns.md (发现 3 种模式)

⚡ 配置命令

  ✅ /stdd:new - 创建新变更
  ✅ /stdd:explore - 自由探索
  ✅ /stdd:ff - Fast-Forward
  ✅ /stdd:continue - 继续生成
  ✅ /stdd:apply - 实现任务
  ✅ /stdd:verify - 验证一致性
  ✅ /stdd:archive - 归档变更
  ✅ /stdd:graph - Graph 引擎

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 初始化完成！

快速开始:
  /stdd:new <需求>    创建第一个变更
  /stdd:ff <需求>     快速生成所有产物
  /stdd:explore       探索现有代码
```

## 下一步

- 运行 `/stdd:new <需求>` 创建第一个变更
- 运行 `/stdd:explore` 探索项目结构
- 编辑 `stdd/memory/*.md` 补充项目知识
