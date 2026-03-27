# Article 8: Performance by Default

> 性能不是事后优化，而是设计决策的一部分。

## 核心原则

1. **先测量，后优化**
   ```
   - 建立性能基线
   - 使用 profiler 定位瓶颈
   - 优化真正影响用户体验的地方
   ```

2. **复杂度意识**
   ```
   Big-O 意识必须成为编码习惯:
   - O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ)
   ```

3. **资源限制**
   ```
   - 内存: 峰值使用 < 80% 可用内存
   - CPU: 避免阻塞主线程
   - I/O: 批量操作，减少往返
   ```

## 性能预算

### Web 应用

| 指标 | 预算 | 说明 |
|------|------|------|
| FCP | < 1.8s | First Contentful Paint |
| LCP | < 2.5s | Largest Contentful Paint |
| TTI | < 3.8s | Time to Interactive |
| CLS | < 0.1 | Cumulative Layout Shift |
| Bundle | < 200KB | 初始 JS 大小 |

### API 响应

| 端点类型 | 预算 | P99 |
|----------|------|-----|
| 读操作 | < 100ms | < 500ms |
| 写操作 | < 200ms | < 1000ms |
| 复杂查询 | < 500ms | < 2000ms |
| 批量操作 | < 2s | < 10s |

## 常见优化模式

### 1. 数据库查询

```typescript
// ❌ N+1 查询问题
const users = await db.users.findMany();
for (const user of users) {
  user.posts = await db.posts.findMany({ userId: user.id });
}

// ✅ 使用 JOIN 或批量查询
const users = await db.users.findMany({
  include: { posts: true }
});
```

### 2. 缓存策略

```typescript
// 缓存层
class CachedUserService {
  private cache = new LRUCache<string, User>({ max: 1000 });

  async findById(id: string): Promise<User> {
    const cached = this.cache.get(id);
    if (cached) return cached;

    const user = await this.repository.findById(id);
    this.cache.set(id, user, { ttl: 300 }); // 5分钟
    return user;
  }
}
```

### 3. 分页

```typescript
// ✅ 游标分页 (大数据集)
async function getPosts(cursor?: string, limit = 20) {
  return db.posts.findMany({
    where: cursor ? { id: { gt: cursor } } : {},
    take: limit,
    orderBy: { id: 'asc' }
  });
}

// ✅ 偏移分页 (小数据集)
async function getPosts(page = 1, limit = 20) {
  return db.posts.findMany({
    skip: (page - 1) * limit,
    take: limit
  });
}
```

### 4. 异步处理

```typescript
// ❌ 同步阻塞
async function processOrder(order: Order) {
  await validateOrder(order);
  await chargePayment(order);
  await sendConfirmationEmail(order);
  await updateInventory(order);
}

// ✅ 异步非阻塞
async function processOrder(order: Order) {
  await validateOrder(order);
  await chargePayment(order);

  // 非关键操作异步处理
  Promise.all([
    sendConfirmationEmail(order),
    updateInventory(order)
  ]).catch(logger.error);
}
```

### 5. 懒加载

```typescript
// ✅ 懒加载模块
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}

// ✅ 懒加载图片
<img loading="lazy" src="..." alt="..." />
```

## 性能测试

```typescript
describe('Performance', () => {
  it('should respond within 100ms', async () => {
    const start = Date.now();
    await request(app).get('/api/users');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should handle concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      request(app).get('/api/users')
    );

    const responses = await Promise.all(requests);
    expect(responses.every(r => r.status === 200)).toBe(true);
  });
});
```

## 监控与告警

```typescript
// 性能监控中间件
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    metrics.histogram('http_request_duration', duration, {
      method: req.method,
      path: req.path,
      status: res.statusCode
    });

    if (duration > 1000) {
      logger.warn('Slow request', { path: req.path, duration });
    }
  });

  next();
});
```

## Hook 集成

```bash
# Pre-commit: 检查打包大小
npm run build -- --analyze
if [ $(stat -f%z dist/bundle.js) -gt 200000 ]; then
  error "Bundle 大小超过 200KB 预算"
fi

# CI: 性能回归检测
lighthouse $URL --budget-path=./budget.json
```

## 优化清单

```
性能优化优先级:

1. 减少请求
   - 合并 API 调用
   - 使用 HTTP/2
   - 启用压缩

2. 优化渲染
   - 虚拟滚动
   - 防抖/节流
   - 懒加载

3. 缓存策略
   - 浏览器缓存
   - CDN 缓存
   - 服务端缓存

4. 代码优化
   - Tree shaking
   - Code splitting
   - 压缩混淆

5. 数据库优化
   - 索引优化
   - 查询优化
   - 连接池
```

## 禁止项

```
❌ 避免:
- 过早优化
- 盲目优化 (无测量)
- 牺牲可读性换取微小性能提升
- 忽略 P99 延迟
- 无限缓存 (内存泄漏)
- 同步阻塞操作
```
