---
name: stdd-roles
description: |
  多角色协作系统 - Product Owner/Developer/Tester/Reviewer 角色扮演
  触发场景：用户说 '/stdd-roles', 'roles', '角色', '协作', '角色扮演'.
metadata:
  author: Marcher-lam
  version: "2.0.0"
---
# STDD 多角色协作系统 (/stdd-roles)

## 目标
通过角色扮演实现多视角协作，每个角色有独特的职责、关注点和决策权，确保软件开发的全面质量。

---

## 角色定义

### 🎯 Product Owner (产品负责人)
```
职责:
- 定义产品愿景和优先级
- 编写用户故事
- 验收功能是否符合业务需求
- 决策范围: 需求优先级、功能取舍

关注点:
- 业务价值最大化
- 用户体验
- 交付时间

口头禅: "这个功能对用户的价值是什么？"
```

### 💻 Developer (开发者)
```
职责:
- 技术方案设计
- 代码实现
- 代码重构
- 决策范围: 技术选型、架构实现

关注点:
- 代码质量
- 可维护性
- 性能优化

口头禅: "如何用最简洁的方式实现？"
```

### 🧪 Tester (测试工程师)
```
职责:
- 编写测试用例
- 执行测试
- 缺陷报告
- 决策范围: 测试覆盖、质量门禁

关注点:
- 边界条件
- 异常处理
- 测试覆盖率

口头禅: "如果用户这样操作会怎样？"
```

### 🔍 Reviewer (审查者)
```
职责:
- 代码审查
- 安全审计
- 架构评审
- 决策范围: 代码批准、架构变更

关注点:
- 代码规范
- 安全漏洞
- 技术债务

口头禅: "这段代码有什么潜在问题？"
```

#### Subagent 自动审查

Reviewer 角色支持 subagent 自动审查模式（参考 tdder Clean Code Review）：

```bash
# 自动审查当前变更
/stdd-roles review --auto

# 自动审查指定文件
/stdd-roles review --auto --file=src/services/TodoService.ts
```

自动审查检查清单：

| 检查项 | 规则 | 工具 |
|--------|------|------|
| 命名规范 | 变量/函数/类命名一致性 | Pattern Teaching 数据 |
| 函数长度 | ≤30 行 | stdd-complexity |
| 嵌套深度 | ≤4 层 | stdd-complexity |
| 重复代码 | DRY 原则 | 相似度检测 |
| 未使用导入 | 无死代码 | AST 分析 |
| 类型安全 | 无 any/unknown | stdd-validate --types |
| 错误处理 | 所有异步操作有 try/catch | AST 分析 |
| 安全漏洞 | OWASP Top 10 | stdd-validate --review --focus=security |

#### 对抗式审查模式 (Adversarial Review)

参考 BMAD-METHOD，对抗式审查强制 Reviewer 进入"攻击者视角"——**只允许提出问题和风险，禁止说"看起来不错"**。这是比清单式审查更严格的模式。

```bash
# 启动对抗式审查
/stdd-roles review --adversarial

# 对指定文件进行对抗式审查
/stdd-roles review --adversarial --file=src/services/TodoService.ts

# 对抗式审查 + 攻击向量报告
/stdd-roles review --adversarial --attack-vectors
```

**对抗式审查规则**：

| 规则 | 说明 | 反例（禁止） |
|------|------|-------------|
| 只许提问 | 审查输出只能是问题/风险 | "这段代码看起来不错" ❌ |
| 不许夸赞 | 禁止"good"、"nice"、"LGTM" | "方法设计合理" ❌ |
| 必须找茬 | 至少找出 N 个潜在问题 | 无问题输出 → 不合格 |
| 攻击者视角 | 假设自己是恶意用户/攻击者 | - |
| 极端场景 | 考虑并发、超载、网络中断等 | - |

**攻击向量清单**：

```
┌─────────────────────────────────────────────────────────────┐
│                  Attack Vector Checklist                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   🔒 安全攻击面                                              │
│   ├── 输入验证：恶意输入、超长字符串、特殊字符               │
│   ├── 注入攻击：SQL/NoSQL/XSS/命令注入                       │
│   ├── 权限绕过：越权访问、IDOR、权限提升                     │
│   └── 数据泄露：日志敏感信息、错误信息暴露                   │
│                                                              │
│   ⚡ 可靠性攻击面                                            │
│   ├── 并发冲突：竞态条件、死锁、数据不一致                   │
│   ├── 资源耗尽：内存泄漏、连接池耗尽、OOM                   │
│   ├── 依赖故障：第三方服务宕机、超时、降级                   │
│   └── 数据完整性：部分写入、孤儿记录、级联删除               │
│                                                              │
│   📊 性能攻击面                                              │
│   ├── 数据量：空列表、百万条、分页边界                       │
│   ├── 响应时间：P99 超时、慢查询、N+1 问题                  │
│   └── 资源消耗：CPU 峰值、内存占用、磁盘 I/O                │
│                                                              │
│   🔧 可维护性攻击面                                          │
│   ├── 变更困难：硬编码、紧耦合、魔法数字                    │
│   ├── 测试困难：不可 mock、副作用、全局状态                  │
│   └── 理解困难：过度抽象、隐式行为、命名误导                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**对抗式审查输出**：

```
🗡️ 对抗式审查报告

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 src/services/TodoService.ts

  ⚔️ Attack Vector #1: SQL 注入风险 (Line 42)
     "如果 title 包含 '; DROP TABLE todos; -- 会怎样？"
     → 建议: 参数化查询

  ⚔️ Attack Vector #2: 并发竞态 (Line 78)
     "两个用户同时创建相同标题的 Todo，唯一约束存在吗？"
     → 建议: 添加唯一索引或乐观锁

  ⚔️ Attack Vector #3: 内存泄漏 (Line 95)
     "事件监听器在 delete 后是否被移除？"
     → 建议: 添加 cleanup 逻辑

  ⚔️ Attack Vector #4: 级联失败 (Line 112)
     "如果 ExportService 不可用，整个创建流程会阻塞吗？"
     → 建议: 异步导出 + 重试机制

  ⚔️ Attack Vector #5: 边界条件 (Line 56)
     "title 为 200 字符的 UTF-8 中文，截断后是否产生无效 UTF-8 序列？"
     → 建议: 使用字符级截断而非字节级

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 攻击向量统计: 5 个发现
   🔴 高危: 1 (SQL 注入)
   🟡 中危: 2 (并发、级联)
   🟢 低危: 2 (内存、边界)

⚠️ 对抗式审查完成: 发现 5 个潜在攻击向量
   修复优先级: #1 → #2 → #4 → #3 → #5
```

**与常规审查的对比**：

| 维度 | 常规审查 (--auto) | 对抗式审查 (--adversarial) |
|------|------------------|--------------------------|
| 目标 | 检查是否符合规范 | 找出所有可能出错的地方 |
| 输出 | 通过/警告/阻断 | 攻击向量列表 |
| 心态 | "代码是否符合标准？" | "代码怎么会被攻破？" |
| 最少发现 | 0 (全部通过) | ≥3 (否则审查不合格) |
| 适用场景 | 日常 PR 审查 | 安全敏感/高风险功能 |

---

## 专用 Agent 细分（12 Agent 体系）

参考 Claude Pilot 12 专用 Agent，在 4 基础角色之上细分出 12 个专用 Agent，每个聚焦特定领域。

### 架构图

```
┌──────────────────────────────────────────────────────────────┐
│                    12 Agent 角色体系                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  需求侧 (4)                开发侧 (4)                         │
│  ┌─────────────────┐      ┌─────────────────┐                │
│  │ Product Owner    │      │ Developer        │                │
│  │ (需求价值)       │      │ (代码实现)       │                │
│  ├─────────────────┤      ├─────────────────┤                │
│  │ UX Researcher    │      │ Architect        │                │
│  │ (用户体验)       │      │ (架构设计)       │                │
│  ├─────────────────┤      ├─────────────────┤                │
│  │ Business Analyst │      │ DevOps Engineer  │                │
│  │ (业务规则)       │      │ (部署/CI)       │                │
│  ├─────────────────┤      ├─────────────────┤                │
│  │ Tech Writer      │      │ Security Engineer│                │
│  │ (文档)           │      │ (安全)           │                │
│  └─────────────────┘      └─────────────────┘                │
│                                                               │
│  质量侧 (4)                                                   │
│  ┌─────────────────┐                                         │
│  │ Tester           │                                         │
│  │ (功能测试)       │                                         │
│  ├─────────────────┤                                         │
│  │ Reviewer         │                                         │
│  │ (代码审查)       │                                         │
│  ├─────────────────┤                                         │
│  │ QA Lead          │                                         │
│  │ (质量策略)       │                                         │
│  ├─────────────────┤                                         │
│  │ Data Analyst     │                                         │
│  │ (指标分析)       │                                         │
│  └─────────────────┘                                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Agent 定义

#### 需求侧

| # | Agent | 角色映射 | 专用职责 | 口头禅 |
|---|-------|---------|---------|--------|
| 1 | **Product Owner** | 基础 | 需求价值、优先级、验收 | "用户价值是什么？" |
| 2 | **UX Researcher** | PO 细分 | 用户旅程、交互设计、可用性 | "用户会怎么用？" |
| 3 | **Business Analyst** | PO 细分 | 业务规则、数据流、合规 | "业务规则覆盖全了吗？" |
| 4 | **Tech Writer** | PO 细分 | API 文档、用户手册、变更日志 | "用户能看懂吗？" |

#### 开发侧

| # | Agent | 角色映射 | 专用职责 | 口头禅 |
|---|-------|---------|---------|--------|
| 5 | **Developer** | 基础 | 代码实现、重构、性能 | "最简洁的实现？" |
| 6 | **Architect** | Dev 细分 | 架构决策、模块边界、技术选型 | "这个决策的 Trade-off？" |
| 7 | **DevOps Engineer** | Dev 细分 | CI/CD、部署、监控、容器化 | "部署流程安全吗？" |
| 8 | **Security Engineer** | Dev 细分 | 安全审计、漏洞扫描、OWASP | "攻击面在哪里？" |

#### 质量侧

| # | Agent | 角色映射 | 专用职责 | 口头禅 |
|---|-------|---------|---------|--------|
| 9 | **Tester** | 基础 | 测试用例、边界条件、覆盖率 | "如果用户这样操作？" |
| 10 | **Reviewer** | 基础 | 代码审查、技术债务、规范 | "有什么潜在问题？" |
| 11 | **QA Lead** | Tester 细分 | 测试策略、质量门禁、回归计划 | "质量策略完备吗？" |
| 12 | **Data Analyst** | Tester 细分 | 指标分析、趋势报告、根因分析 | "数据说明了什么？" |

### 使用方式

```bash
# 切换到任意专用 Agent
/stdd-roles switch architect        # 架构师视角
/stdd-roles switch security         # 安全工程师视角
/stdd-roles switch ux-researcher    # UX 研究员视角
/stdd-roles switch qa-lead          # QA 负责人视角
/stdd-roles switch data-analyst     # 数据分析师视角

# 仅启用部分 Agent（按需组合）
/stdd-roles meeting "架构评审" --agents=architect,developer,reviewer,security

# 全员会议（12 Agent）
/stdd-roles meeting "Sprint 规划" --all-agents
```

### Agent 与 Skill 的映射

| Agent | 对应 Skill | 触发时机 |
|-------|-----------|---------|
| Product Owner | stdd-propose, stdd-confirm | 需求阶段 |
| UX Researcher | stdd-spec (验收场景) | 规格阶段 |
| Business Analyst | stdd-clarify | 澄清阶段 |
| Tech Writer | stdd-final-doc | 文档阶段 |
| Developer | stdd-apply, stdd-execute | 实现阶段 |
| Architect | stdd-plan | 计划阶段 |
| DevOps Engineer | stdd-guard (CI hooks) | 全流程 |
| Security Engineer | stdd-validate --review --focus=security | 验证阶段 |
| Tester | stdd-spec, stdd-mutation | 规格+验证 |
| Reviewer | stdd-validate --review | 验证阶段 |
| QA Lead | stdd-metrics | 全流程 |
| Data Analyst | stdd-metrics, stdd-complexity | 全流程 |

### 配置扩展

```json
{
  "roles": {
    "product-owner":    { "enabled": true, "agents": ["ux-researcher", "business-analyst", "tech-writer"] },
    "developer":        { "enabled": true, "agents": ["architect", "devops-engineer", "security-engineer"] },
    "tester":           { "enabled": true, "agents": ["qa-lead", "data-analyst"] },
    "reviewer":         { "enabled": true, "agents": [] }
  },
  "agents": {
    "ux-researcher":     { "votingWeight": 0.8, "autoInvoke": "spec" },
    "business-analyst":  { "votingWeight": 0.8, "autoInvoke": "clarify" },
    "tech-writer":       { "votingWeight": 0.5, "autoInvoke": "final-doc" },
    "architect":         { "votingWeight": 1.2, "autoInvoke": "plan" },
    "devops-engineer":   { "votingWeight": 0.8, "autoInvoke": "guard" },
    "security-engineer": { "votingWeight": 1.0, "autoInvoke": "validate" },
    "qa-lead":           { "votingWeight": 1.0, "autoInvoke": "metrics" },
    "data-analyst":      { "votingWeight": 0.8, "autoInvoke": "metrics" }
  }
}
```

---

## 协作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      STDD Role Workflow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐                                              │
│   │   Product    │                                              │
│   │    Owner     │                                              │
│   │  定义需求    │                                              │
│   └──────┬───────┘                                              │
│          │ 需求文档                                              │
│          ▼                                                       │
│   ┌──────────────┐    ┌──────────────┐                         │
│   │   Tester     │◀──▶│  Developer   │                         │
│   │  编写测试    │    │  实现代码    │                         │
│   └──────┬───────┘    └──────┬───────┘                         │
│          │                    │                                  │
│          │     测试 + 代码    │                                  │
│          └────────┬───────────┘                                  │
│                   ▼                                               │
│          ┌──────────────┐                                        │
│          │   Reviewer   │                                        │
│          │   代码审查   │                                        │
│          └──────┬───────┘                                        │
│                 │ 审查报告                                        │
│                 ▼                                                 │
│          ┌──────────────┐                                        │
│          │   Product    │                                        │
│          │    Owner     │                                        │
│          │   验收确认   │                                        │
│          └──────────────┘                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 使用方式

### 启动角色协作模式
```bash
/stdd-roles start
```

### 切换角色
```bash
# 切换到产品负责人视角
/stdd-roles switch product-owner

# 切换到开发者视角
/stdd-roles switch developer

# 切换到测试工程师视角
/stdd-roles switch tester

# 切换到审查者视角
/stdd-roles switch reviewer
```

### 角色会议
```bash
# 召开角色会议 (所有角色发言)
/stdd-roles meeting "讨论 Todo 导出功能"

# 快速投票
/stdd-roles vote "是否采用 IndexedDB?"

# 共识确认
/stdd-roles consensus
```

---

## 角色视图

### Product Owner 视图
```bash
/stdd-roles switch product-owner
```

输出:
```
🎯 当前角色: Product Owner

📋 待处理需求:
  1. [高优先级] Todo Markdown 导出
  2. [中优先级] 离线支持
  3. [低优先级] 主题切换

💡 产品思考:
  - "Todo 导出功能对用户的核心价值是什么？"
  - "用户期望的导出格式有哪些？"
  - "是否需要支持批量导出？"

📝 建议行动:
  1. 明确导出格式需求
  2. 确定优先级
  3. 编写用户故事
```

### Developer 视图
```bash
/stdd-roles switch developer
```

输出:
```
💻 当前角色: Developer

🔧 技术上下文:
  - 技术栈: React + TypeScript
  - 测试框架: Vitest
  - 状态管理: Zustand

📐 架构思考:
  - ExportButton 组件位置: src/components/
  - 服务层: src/services/ExportService.ts
  - 测试覆盖目标: 90%

💡 开发建议:
  - 创建 ExportService 抽象导出逻辑
  - 支持 Markdown 和 JSON 两种格式
  - 使用策略模式便于扩展
```

### Tester 视图
```bash
/stdd-roles switch tester
```

输出:
```
🧪 当前角色: Tester

📋 测试场景:
  1. ✅ 导出空列表 → 生成空 Markdown
  2. ✅ 导出已完成项 → 正确的勾选状态
  3. ⚠️ 导出大量数据 → 性能测试
  4. ⚠️ 特殊字符处理 → XSS 防护

🔍 边界条件:
  - 空列表
  - 1000+ 项
  - 特殊字符 (HTML, Markdown)
  - Unicode 字符

📊 覆盖率目标:
  - 语句覆盖: ≥ 90%
  - 分支覆盖: ≥ 85%
  - 函数覆盖: ≥ 95%
```

### Reviewer 视图
```bash
/stdd-roles switch reviewer
```

输出:
```
🔍 当前角色: Reviewer

📋 审查清单:
  [ ] 代码符合项目规范
  [ ] 无明显安全漏洞
  [ ] 测试覆盖充分
  [ ] 无硬编码值
  [ ] 错误处理完善

⚠️ 潜在问题:
  1. ExportService.ts:42 - 未处理 null 参数
  2. exportButton.tsx:15 - 缺少 aria-label

💡 改进建议:
  - 添加参数验证
  - 增强可访问性
  - 考虑添加日志
```

---

## 角色会议示例

```bash
/stdd-roles meeting "讨论是否使用 IndexedDB"
```

输出:
```
📢 角色会议: 讨论是否使用 IndexedDB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Product Owner:
  "从用户角度，IndexedDB 提供更大的存储空间，
   支持离线使用，但实现复杂度增加。
   我建议先评估用户实际需求量。"

💻 Developer:
  "技术实现上，IndexedDB 需要:
   - Dexie.js 作为 ORM (简化操作)
   - 迁移策略 (版本管理)
   - 预计增加 2 天开发时间
   建议: 先用 localStorage MVP，后续迭代升级"

🧪 Tester:
  "测试角度考虑:
   - IndexedDB 有更多的边界条件
   - 需要模拟离线场景
   - 跨浏览器兼容性测试
   建议: 先保持简单"

🔍 Reviewer:
  "代码质量角度:
   - IndexedDB 代码更复杂
   - 需要更完善的错误处理
   建议: 遵循 YAGNI 原则"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 共识结果:
  ✅ 先使用 localStorage 实现 MVP
  ✅ 预留 IndexedDB 升级接口
  ✅ 在 02_bdd_specs.feature 中记录此决策

执行: 记录决策到 stdd/memory/decisions.md
```

---

## 角色投票

```bash
/stdd-roles vote "导出功能是否需要支持 PDF?"
```

输出:
```
📊 角色投票: 导出功能是否需要支持 PDF?

🎯 Product Owner: ✅ 是
  理由: "用户可能需要打印分享"

💻 Developer: ❌ 否
  理由: "PDF 生成复杂度高，建议后续迭代"

🧪 Tester: ❌ 否
  理由: "测试工作量翻倍"

🔍 Reviewer: ❌ 否
  理由: "增加维护成本"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

结果: ❌ 不支持 (1:3)

决策: 本迭代不支持 PDF 导出
      记录到 backlog 作为未来功能
```

---

## 与 STDD 工作流集成

```
/stdd-propose
    │
    └──► Product Owner: 定义需求价值

/stdd-clarify
    │
    └──► Product Owner + Developer: 业务与技术对齐

/stdd-spec
    │
    └──► Tester: 编写 BDD 规格

/stdd-plan
    │
    └──► Developer: 技术方案设计

/stdd-execute
    │
    ├──► Developer: 实现代码
    └──► Tester: 编写测试

/stdd-commit
    │
    └──► Reviewer: 代码审查
            │
            └──► Product Owner: 最终验收
```

---

## 配置

在 `stdd/memory/roles-config.json` 中：

<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

```json
{
  "roles": {
    "product-owner": {
      "enabled": true,
      "votingWeight": 1.5
    },
    "developer": {
      "enabled": true,
      "votingWeight": 1.0
    },
    "tester": {
      "enabled": true,
      "votingWeight": 1.0
    },
    "reviewer": {
      "enabled": true,
      "votingWeight": 1.2
    }
  },
  "consensusThreshold": 0.6,
  "meetingTimeout": 300000
}
```

---

> **引用**: 借鉴自 CrewAI 多 Agent 角色协作模式
