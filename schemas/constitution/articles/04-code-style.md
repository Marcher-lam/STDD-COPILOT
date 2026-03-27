# Article 4: Consistent Code Style

> 代码风格必须统一，由工具强制执行，而非人工审查。

## 核心原则

1. **自动化优于人工**
   ```
   格式化: Prettier / Black / gofmt
   Linting: ESLint / Ruff / golangci-lint
   类型检查: TypeScript / mypy / go vet
   ```

2. **配置即代码**
   ```
   所有风格配置必须:
   - 存储在项目根目录
   - 纳入版本控制
   - 有明确文档说明
   ```

3. **CI 强制执行**
   ```
   CI Pipeline 必须包含:
   - 格式检查 (format check)
   - Lint 检查
   - 类型检查
   - 测试运行
   ```

## 配置文件

### JavaScript/TypeScript

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100
}
```

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    '@typescript-eslint/no-unused-vars': 'error'
  }
};
```

### Python

```toml
# pyproject.toml
[tool.black]
line-length = 100
target-version = ['py39', 'py310', 'py311']

[tool.ruff]
select = ["E", "F", "I", "N", "W"]
line-length = 100
```

### Go

```yaml
# .golangci.yml
linters:
  enable:
    - gofmt
    - goimports
    - govet
    - errcheck
    - staticcheck
```

## 命名规范

### 通用规则

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `user-service.ts` |
| 类名 | PascalCase | `UserService` |
| 函数名 | camelCase | `getUserById` |
| 常量 | SCREAMING_SNAKE | `MAX_RETRIES` |
| 私有成员 | _前缀 | `_privateMethod` |
| 接口 | I前缀或无 | `IUser` 或 `User` |

### 领域特定

```typescript
// ✅ 好的命名
interface UserRepository {
  findById(id: UserId): Promise<User>;
  save(user: User): Promise<void>;
}

class PostgresUserRepository implements UserRepository {
  // ...
}

// ❌ 差的命名
interface UserRepo {
  get(i: string): any;
  put(u: any): void;
}
```

## 文件结构

```
src/
├── modules/
│   └── user/
│       ├── index.ts           # 公共导出
│       ├── user.service.ts    # 业务逻辑
│       ├── user.repository.ts # 数据访问
│       ├── user.types.ts      # 类型定义
│       └── __tests__/
│           └── user.service.test.ts
```

## 导入顺序

```typescript
// 1. 外部库
import { injectable } from 'tsyringe';
import { z } from 'zod';

// 2. 内部模块
import { Logger } from '@/common/logger';
import { Database } from '@/infrastructure/database';

// 3. 类型
import type { User } from './user.types';

// 4. 本地模块
import { UserRepository } from './user.repository';
```

## 注释规范

```typescript
/**
 * 用户服务 - 处理用户相关的业务逻辑
 */
@injectable()
export class UserService {
  /**
   * 根据ID获取用户
   * @param id - 用户唯一标识
   * @returns 用户实体
   * @throws {UserNotFoundError} 用户不存在时抛出
   */
  async findById(id: UserId): Promise<User> {
    // 实现...
  }
}
```

## Hook 集成

```bash
# Pre-commit Hook
npm run lint-staged

# Pre-push Hook
npm run type-check
npm run test
```

## 违规处理

```
检测到风格违规:
1. 自动修复 (如果支持)
2. 阻止提交 (如果是错误)
3. 警告提示 (如果是警告)
4. 记录到 lint 报告
```

## 工具配置

```json
// package.json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx}\"",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "lint:fix": "eslint --fix \"src/**/*.{ts,tsx}\"",
    "type-check": "tsc --noEmit"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```
