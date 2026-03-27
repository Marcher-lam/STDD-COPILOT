# Article 5: Documentation as Code

> 文档与代码同等重要，必须同步更新、纳入版本控制。

## 核心原则

1. **代码即文档**
   ```
   优先级:
   1. 自解释的代码 (最佳)
   2. 类型定义 (良好)
   3. 内联注释 (必要)
   4. 外部文档 (补充)
   ```

2. **文档位置**
   ```
   API 文档 → 与代码同目录
   架构文档 → /docs/architecture/
   用户文档 → /docs/user-guide/
   规格文档 → /stdd/specs/
   ```

3. **文档格式**
   ```
   首选: Markdown
   API: OpenAPI/Swagger
   类型: TypeScript/Zod/JSON Schema
   ```

## 必需文档

### 1. README.md

```markdown
# 项目名称

简短描述

## 快速开始

\`\`\`bash
npm install
npm run dev
\`\`\`

## 文档

- [架构设计](./docs/architecture.md)
- [API 参考](./docs/api.md)
- [开发指南](./docs/development.md)

## 许可证

MIT
```

### 2. CHANGELOG.md

```markdown
# Changelog

## [Unreleased]

### Added
- 新功能描述

## [1.0.0] - 2024-01-15

### Added
- 初始版本
```

### 3. API 文档

```typescript
/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: 获取用户列表
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
```

## 注释规范

### 函数注释

```typescript
/**
 * 计算订单总价
 *
 * @param items - 订单商品列表
 * @param discount - 折扣码 (可选)
 * @returns 包含税费的总价
 *
 * @example
 * ```ts
 * const total = calculateTotal([
 *   { price: 100, quantity: 2 }
 * ], 'SAVE10');
 * // 返回 180
 * ```
 */
function calculateTotal(
  items: CartItem[],
  discount?: string
): number {
  // ...
}
```

### 复杂逻辑注释

```typescript
// 使用二分查找优化搜索性能
// 时间复杂度: O(log n)
// 为什么这样做: 因为列表是有序的且不可变
const index = binarySearch(sortedList, target);
```

## STDD 规格文档

### 规格文件位置

```
stdd/specs/
├── auth/
│   └── spec.md          # 认证规格
├── payment/
│   └── spec.md          # 支付规格
└── user/
    └── spec.md          # 用户规格
```

### 规格格式

```markdown
# Spec: 用户认证

## 概述
用户可以通过邮箱密码或 OAuth2 登录系统。

## 需求

### Requirement: 邮箱登录
用户可以通过邮箱和密码登录。

#### Scenario: 成功登录
- GIVEN 用户已注册
- WHEN 用户输入正确的邮箱和密码
- THEN 系统返回 JWT token
- AND token 有效期为 24 小时

#### Scenario: 密码错误
- GIVEN 用户已注册
- WHEN 用户输入错误的密码
- THEN 系统返回 401 错误
- AND 记录失败尝试
```

## 文档同步检查

```bash
# Pre-commit Hook
if code_changed && !docs_changed; then
  warn "代码已变更但文档未更新"
  suggest "检查是否需要更新: README, API docs, Specs"
fi
```

## 文档生成

```bash
# 从代码生成 API 文档
/stdd:api-spec

# 从类型生成 Schema
/stdd:schema

# 从规格生成测试
/stdd:spec --generate-tests
```

## 文档审查清单

```
代码变更时检查:
[ ] README 是否需要更新?
[ ] API 文档是否需要更新?
[ ] 类型注释是否完整?
[ ] 复杂逻辑是否有注释?
[ ] CHANGELOG 是否需要更新?
[ ] 示例代码是否可运行?
```

## 禁止项

```
❌ 不要:
- 过时的文档
- 与代码不符的注释
- 无意义的注释 (// increment i)
- 复制粘贴的模板文档
- 隐藏的 tribal knowledge
```
