# Article 9: Continuous Integration & Delivery

> 所有变更必须通过自动化流水线，手动部署是最后的手段。

## 核心原则

1. **自动化一切**
   ```
   - 代码检查 → 自动
   - 测试运行 → 自动
   - 构建部署 → 自动
   - 环境配置 → 代码化
   ```

2. **快速反馈**
   ```
   - PR 检查 < 5 分钟
   - 单元测试 < 1 分钟
   - 集成测试 < 10 分钟
   - 部署 < 15 分钟
   ```

3. **可回滚**
   ```
   - 每次部署可一键回滚
   - 数据库迁移可逆
   - 配置变更有历史
   ```

## CI 流水线

### Pull Request 检查

```yaml
# .github/workflows/pr.yml
name: PR Check

on: pull_request

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
```

### 部署流水线

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: |
          npm ci
          npm run test
          npm run lint
          npm run build

      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # 部署命令

      - name: Health check
        run: |
          curl -f https://api.example.com/health || exit 1

      - name: Rollback on failure
        if: failure()
        run: |
          echo "Rolling back..."
          # 回滚命令
```

## 环境管理

### 环境策略

```
开发环境 (dev)
  ↓ 自动部署
测试环境 (staging)
  ↓ 手动批准
生产环境 (production)
```

### 环境配置

```yaml
# environments/dev.yaml
database:
  host: dev-db.example.com
  name: app_dev

# environments/staging.yaml
database:
  host: staging-db.example.com
  name: app_staging

# environments/production.yaml
database:
  host: prod-db.example.com
  name: app_production
```

## 质量门禁

### PR 合并要求

```yaml
# .github/CODEOWNERS
* @team-lead
src/auth/* @security-team

# .github/branch-protection.yml
branches:
  - name: main
    protection:
      required_pull_request_reviews:
        required_approving_review_count: 1
      required_status_checks:
        strict: true
        contexts:
          - lint
          - test
          - build
      enforce_admins: true
```

### 覆盖率门禁

```json
// package.json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## 部署策略

### 蓝绿部署

```
┌─────────────┐
│   Router    │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│Blue │ │Green│
│ v1  │ │ v2  │
└─────┘ └─────┘

1. Green 环境部署新版本
2. 健康检查通过
3. 流量切换到 Green
4. Blue 作为回滚备份
```

### 金丝雀发布

```
┌─────────────────────────────────┐
│           Load Balancer         │
└───────────────┬─────────────────┘
                │
      ┌─────────┼─────────┐
      │         │         │
   ┌──▼──┐   ┌──▼──┐   ┌──▼──┐
   │ v1  │   │ v1  │   │ v2  │
   │ 45% │   │ 45% │   │ 10% │
   └─────┘   └─────┘   └─────┘

逐步增加 v2 流量: 10% → 25% → 50% → 100%
```

## 监控与告警

### 健康检查

```typescript
// health.ts
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    externalApi: await checkExternalApi()
  };

  const healthy = Object.values(checks).every(c => c.status === 'ok');

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  });
});
```

### 告警规则

```yaml
# alerts.yaml
alerts:
  - name: high_error_rate
    condition: error_rate > 1%
    duration: 5m
    severity: warning

  - name: service_down
    condition: health_check_failed
    duration: 1m
    severity: critical
```

## 回滚策略

### 代码回滚

```bash
# 快速回滚到上一版本
git revert HEAD
git push origin main

# 或回滚到特定版本
git revert <commit-hash>
```

### 数据库回滚

```sql
-- 迁移必须可逆
-- up migration
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL
);

-- down migration
DROP TABLE users;
```

## STDD 集成

```bash
# PR 自动验证
/stdd:verify

# 部署前完整检查
/stdd:verify --all --coverage

# 部署后回归测试
/stdd:verify --smoke --env=production
```

## Hook 集成

```bash
# Pre-push: 运行本地检查
npm run lint && npm run test

# Pre-merge: 验证 CI 状态
gh pr checks --watch

# Post-merge: 触发部署
/stdd:deploy --env=staging
```

## 禁止项

```
❌ 禁止:
- 跳过 CI 直接推送
- 手动修改生产环境
- 无回滚计划的部署
- 无测试的代码合并
- 硬编码环境配置
- 共享部署凭证
```
