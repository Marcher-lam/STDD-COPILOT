# Article 6: Error Handling & Logging

> 错误处理必须是显式的、可预测的、可恢复的。

## 核心原则

1. **显式优于隐式**
   ```typescript
   // ❌ 隐式错误
   function getUser(id: string) {
     return db.users.find(u => u.id === id); // 可能返回 undefined
   }

   // ✅ 显式错误
   function getUser(id: string): Promise<User> {
     const user = await db.users.find(id);
     if (!user) {
       throw new UserNotFoundError(id);
     }
     return user;
   }
   ```

2. **类型安全错误**
   ```typescript
   // 使用 Result 类型或自定义错误
   type Result<T, E = Error> =
     | { ok: true; value: T }
     | { ok: false; error: E };
   ```

3. **错误传播**
   ```
   错误应该:
   - 包含足够的上下文
   - 可被调用方处理
   - 有清晰的堆栈跟踪
   - 记录到日志系统
   ```

## 错误类型层次

```typescript
// 基础应用错误
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly timestamp: Date = new Date();
  readonly context: Record<string, unknown>;

  constructor(
    message: string,
    context: Record<string, unknown> = {}
  ) {
    super(message);
    this.context = context;
  }
}

// 领域错误
class UserNotFoundError extends AppError {
  readonly code = 'USER_NOT_FOUND';
  readonly statusCode = 404;

  constructor(userId: string) {
    super(`User not found: ${userId}`, { userId });
  }
}

class InvalidCredentialsError extends AppError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly statusCode = 401;
}

// 基础设施错误
class DatabaseError extends AppError {
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;
}
```

## 错误处理模式

### 1. Try-Catch 模式

```typescript
async function processOrder(orderId: string): Promise<OrderResult> {
  try {
    const order = await orderRepository.findById(orderId);
    const result = await paymentService.charge(order);
    return { ok: true, value: result };
  } catch (error) {
    if (error instanceof PaymentDeclinedError) {
      // 可恢复错误
      await orderRepository.markAsFailed(orderId, error);
      return { ok: false, error };
    }
    // 不可恢复错误
    logger.error('Order processing failed', { orderId, error });
    throw error;
  }
}
```

### 2. Result 模式

```typescript
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return { ok: false, error: 'Division by zero' };
  }
  return { ok: true, value: a / b };
}

// 使用
const result = divide(10, 2);
if (result.ok) {
  console.log(result.value); // 5
} else {
  console.error(result.error);
}
```

## 日志规范

### 日志级别

| 级别 | 用途 | 示例 |
|------|------|------|
| DEBUG | 开发调试 | 变量值、流程追踪 |
| INFO | 正常操作 | 用户登录、订单创建 |
| WARN | 潜在问题 | 性能下降、重试 |
| ERROR | 错误但不致命 | API 失败、超时 |
| FATAL | 系统崩溃 | 数据库连接失败 |

### 日志格式

```typescript
// 结构化日志
logger.info('User logged in', {
  userId: user.id,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  duration: Date.now() - startTime
});

// 输出
{
  "level": "INFO",
  "message": "User logged in",
  "timestamp": "2024-01-15T10:30:00Z",
  "context": {
    "userId": "user-123",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "duration": 150
  }
}
```

### 敏感信息处理

```typescript
// ❌ 记录敏感信息
logger.info('Payment processed', {
  cardNumber: '4111111111111111', // 危险!
  cvv: '123' // 危险!
});

// ✅ 脱敏处理
logger.info('Payment processed', {
  cardLastFour: maskCard(cardNumber), // ****1111
  amount: 99.99
});
```

## 错误边界

```typescript
// API 错误边界
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId: req.id
      }
    });
    return;
  }

  // 未知错误
  logger.error('Unhandled error', { error: err, path: req.path });
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: req.id
    }
  });
});
```

## 测试错误处理

```typescript
describe('UserService', () => {
  it('should throw UserNotFoundError when user does not exist', async () => {
    await expect(
      userService.findById('non-existent')
    ).rejects.toThrow(UserNotFoundError);
  });

  it('should log error on database failure', async () => {
    mockDb.find.mockRejectedValue(new DatabaseError('Connection lost'));

    await expect(
      userService.findById('user-1')
    ).rejects.toThrow(DatabaseError);

    expect(logger.error).toHaveBeenCalledWith(
      'Database query failed',
      expect.objectContaining({ userId: 'user-1' })
    );
  });
});
```

## Hook 集成

```bash
# Pre-commit: 检查未处理的 Promise
if grep -r "\.then\|\.catch" --include="*.ts" src/; then
  warn "检测到未正确处理的 Promise，建议使用 async/await"
fi

# Pre-commit: 检查空的 catch 块
if grep -r "catch\s*{[\s]*}" --include="*.ts" src/; then
  error "发现空的 catch 块，必须处理错误或添加注释说明"
fi
```
