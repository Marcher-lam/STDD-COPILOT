# Article 7: Security by Design

> 安全必须从设计阶段就考虑，而不是事后添加。

## 核心原则

1. **最小权限原则**
   ```
   - 只授予完成任务所需的最小权限
   - 默认拒绝，显式允许
   - 定期审查权限
   ```

2. **纵深防御**
   ```
   - 多层安全检查
   - 不依赖单一防线
   - 每层独立可测试
   ```

3. **信任边界**
   ```
   - 所有外部输入都是不可信的
   - 在边界进行验证
   - 内部使用类型系统保证
   ```

## 安全检查清单

### 输入验证

```typescript
// ✅ 使用 schema 验证
import { z } from 'zod';

const UserInputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).regex(/^[\w\s-]+$/)
});

function createUser(input: unknown) {
  // 验证在任何处理之前
  const validated = UserInputSchema.parse(input);
  // ...
}
```

### SQL 注入防护

```typescript
// ❌ 危险: 字符串拼接
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ 安全: 参数化查询
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [userId]);
```

### XSS 防护

```typescript
// ❌ 危险: 直接插入 HTML
element.innerHTML = userInput;

// ✅ 安全: 使用 textContent 或框架的转义
element.textContent = userInput;

// 或使用 DOMPurify
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

### CSRF 防护

```typescript
// Express 中间件
app.use(csrf({ cookie: true }));

// 在表单中包含 token
<input type="hidden" name="_csrf" value="<%= csrfToken %>" />
```

### 认证安全

```typescript
// 密码存储
import { hash, compare } from 'bcrypt';

// ✅ 使用强哈希
const hashedPassword = await hash(password, 12);

// ✅ 验证
const isValid = await compare(password, hashedPassword);

// JWT 配置
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '24h' } // ✅ 设置过期时间
);
```

## 敏感数据处理

### 环境变量

```bash
# .env (不要提交到 Git)
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# .env.example (提交到 Git)
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-secret-here
API_KEY=your-api-key-here
```

### 配置验证

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  API_KEY: z.string().min(16)
});

// 启动时验证
const config = ConfigSchema.parse(process.env);
```

### 数据脱敏

```typescript
// 日志脱敏
function maskSensitive(data: Record<string, unknown>) {
  const sensitive = ['password', 'token', 'apiKey', 'creditCard'];

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        return [key, '***REDACTED***'];
      }
      return [key, value];
    })
  );
}
```

## 安全 Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## 依赖安全

```bash
# 定期检查漏洞
npm audit

# 自动修复
npm audit fix

# 使用 npm audit in CI
npm audit --audit-level=high
```

## 安全测试

```typescript
describe('Security', () => {
  it('should reject SQL injection attempts', async () => {
    const maliciousInput = "'; DROP TABLE users; --";

    await expect(
      userService.findByEmail(maliciousInput)
    ).rejects.toThrow();
  });

  it('should sanitize XSS attempts', async () => {
    const maliciousInput = '<script>alert("xss")</script>';

    const result = await commentService.create({
      content: maliciousInput
    });

    expect(result.content).not.toContain('<script>');
  });

  it('should require authentication for protected routes', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .expect(401);
  });
});
```

## Hook 安全检查

```bash
# Pre-commit: 检查敏感信息
if git diff --cached | grep -E "(password|api_key|secret|token)\s*=\s*['\"]"; then
  error "检测到可能的敏感信息硬编码"
  error "请使用环境变量替代"
  exit 1
fi

# Pre-commit: 检查依赖漏洞
npm audit --audit-level=high || {
  warn "发现依赖漏洞，请运行 npm audit fix"
}
```

## 安全报告

```
发现安全问题:
1. 不要在公开 issue 中报告
2. 发送邮件到 security@example.com
3. 包含详细的重现步骤
4. 等待 90 天披露期
```

## 禁止项

```
❌ 绝对禁止:
- 硬编码密钥/密码
- 提交 .env 文件
- 记录敏感信息到日志
- 跳过输入验证
- 使用 eval() 执行用户输入
- 禁用安全 Headers
- 使用过时的加密算法
```
