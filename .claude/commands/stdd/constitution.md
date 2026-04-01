# /stdd:constitution - Constitution 管理

> 查看、检查和管理 STDD Constitution 的 9 篇开发条例。

## 使用方式

```bash
/stdd:constitution [command] [options]
```

### 命令

| 命令 | 说明 |
|------|------|
| `show [article]` | 查看条例详情 |
| `check` | 检查代码合规 |
| `waivers` | 管理豁免 |
| `enable` | 启用 Constitution |
| `disable` | 禁用 Constitution |

---

## 查看条例

### 查看所有条例

```bash
/stdd:constitution
```

输出:
```
📋 STDD Constitution - 9 篇开发条例

Priority 1 (Blocking):
  Article 2: TDD (测试先行)
  Article 7: Security (安全优先)
  Article 9: CI/CD (自动化流水线)

Priority 2 (Warning):
  Article 1: Library-First (优先使用成熟库)
  Article 3: Small Commits (原子提交)
  Article 4: Code Style (统一风格)

Priority 3 (Suggestion):
  Article 5: Documentation (文档即代码)
  Article 6: Error Handling (显式错误处理)
  Article 8: Performance (性能默认)

状态: ✅ 已启用 | Hooks: ✅ 活跃
```

### 查看特定条例

```bash
/stdd:constitution show 2
```

输出:
```
📖 Article 2: Test-Driven Development

核心原则:
所有生产代码必须在失败的测试之后编写。

检查时机: PreToolUse Hook (Blocking)
执行级别: 阻断操作

Ralph Loop:
🔴 RED → 🔍 CHECK → 🟢 GREEN → 🧪 MUTATE → 🔵 REFACTOR

违规时:
❌ 测试文件不存在: src/__tests__/services/UserService.test.ts
   运行: /stdd:apply --task=TASK-001 (TDD 红灯阶段)

豁免: 临时豁免需 team-lead 审批
```

---

## 检查合规

### 检查所有条例

```bash
/stdd:constitution check
```

输出:
```
🔍 Constitution 合规检查

Article 1 (Library-First): ✅ 通过
Article 2 (TDD):
  ⚠️ src/services/PaymentService.ts
     - 测试覆盖率: 45% (需要 > 80%)

Article 3 (Small Commits): ✅ 通过
Article 4 (Code Style): ✅ 通过
Article 5 (Documentation):
  💡 3 个公共函数缺少 JSDoc

Article 6 (Error Handling): ✅ 通过
Article 7 (Security): ✅ 通过
Article 8 (Performance):
  💡 src/api/orders.ts - 可能存在 N+1 查询

Article 9 (CI/CD): ✅ 通过

总结: 6 通过, 2 警告, 1 建议
状态: ✅ 可以继续
```

### 检查特定条例

```bash
/stdd:constitution check --article=2,7
```

### 只检查修改的文件

```bash
/stdd:constitution check --changed
```

---

## 豁免管理

### 申请临时豁免

```bash
/stdd:constitution waiver --article=2 --reason="Legacy migration phase 1" --days=30
```

输出:
```
📝 豁免申请已创建

ID: waiver-2024-001
Article: 2 (TDD)
原因: Legacy migration phase 1
范围: 当前变更
有效期: 30 天 (至 2024-04-15)
状态: ⏳ 待审批

审批流程:
1. 提交给 team-lead 审批
2. 审批通过后生效
3. 到期自动失效

豁免文件: stdd/constitution/waivers.yaml
```

### 查看当前豁免

```bash
/stdd:constitution waivers
```

输出:
```
📋 当前豁免列表

waiver-2024-001
  Article: 2 (TDD)
  原因: Legacy migration phase 1
  范围: src/legacy/**
  到期: 2024-04-15 (15 天后)
  状态: ✅ 活跃

waiver-2024-002
  Article: 8 (Performance)
  原因: MVP optimization pending
  范围: src/api/**
  到期: 2024-03-20 (已过期)
  状态: ⚠️ 已过期
```

### 取消豁免

```bash
/stdd:constitution waiver --revoke --id=waiver-2024-001
```

---

## 启用/禁用

### 启用 Constitution

```bash
/stdd:constitution enable
```

### 禁用 Constitution

```bash
/stdd:constitution disable --reason="Emergency hotfix"
```

> ⚠️ **警告**: 禁用 Constitution 会绕过所有安全检查，仅用于紧急情况。

---

## 输出文件

```
stdd/constitution/
├── waivers.yaml      # 临时豁免记录
└── .waivers.lock     # 豁免锁定状态
```

---

## 与 Hook 系统关系

Constitution 命令是 Hook 系统的管理接口：

```
/stdd:constitution     → 查看/管理条例
    ↓
Hooks                  → 执行检查
    ↓
PreToolUse/PostToolUse → 强制执行
```

---

## 示例工作流

### 开发新功能

```bash
# 1. 检查当前状态
/stdd:constitution check

# 2. 如果需要豁免
/stdd:constitution waiver --article=2 --reason="..."

# 3. 继续开发
/stdd:apply

# 4. 完成后清理豁免
/stdd:constitution waiver --revoke --id=xxx
```

### 修复违规

```bash
# 1. 检查发现违规
/stdd:constitution check --article=7

# 2. 查看条例详情
/stdd:constitution show 7

# 3. 修复问题
# ... 修改代码 ...

# 4. 重新检查
/stdd:constitution check --article=7
```

---

## 执行步骤

### 收到命令后

1. **解析命令**: `show` | `check` | `waivers` | `enable` | `disable`
2. **执行操作**:
   - `show`: 读取 `schemas/constitution/articles/*.md`
   - `check`: 运行 Constitution 检查脚本
   - `waivers`: 管理 `stdd/constitution/waivers.yaml`
3. **输出结果**: 格式化显示

### 注意事项

- 豁免需要记录原因和有效期
- Blocking 条例的豁免需要更高级别审批
- 过期豁免自动失效
- 禁用操作需要说明原因
