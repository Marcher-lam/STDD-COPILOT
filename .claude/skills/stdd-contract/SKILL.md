---
description: 契约测试 - 消费者驱动契约 (CDC) 与提供者验证
---

# STDD 契约测试 (/stdd-contract)

## 目标
实现 **消费者驱动契约测试 (CDC)**，确保前后端 API 契约一致，支持独立开发和安全重构。

---

## 核心概念

```
┌─────────────────────────────────────────────────────────────┐
│                   Consumer-Driven Contracts                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   消费者 (前端)              契约               提供者 (后端)  │
│   ┌─────────┐           ┌─────────┐           ┌─────────┐  │
│   │ 定义期望 │ ────────▶ │  Pact   │ ◀──────── │ 实现接口 │  │
│   │ 生成契约 │           │  文件   │           │ 验证契约 │  │
│   └─────────┘           └─────────┘           └─────────┘  │
│                                                              │
│   ✅ 前端可以独立开发      ✅ 后端可以独立开发               │
│   ✅ 契约变更可追踪        ✅ Breaking Changes 可检测        │
└─────────────────────────────────────────────────────────────┘
```

---

## 使用方式

### 消费者端 (前端)

```bash
# 定义消费者契约
/stdd-contract consumer --name=frontend

# 为特定 API 定义期望
/stdd-contract consumer --name=frontend --endpoint=/api/todos

# 生成契约文件
/stdd-contract consumer --name=frontend --publish
```

### 提供者端 (后端)

```bash
# 验证提供者实现
/stdd-contract provider --verify

# 指定契约源
/stdd-contract provider --pact-dir=pacts/

# 验证特定消费者
/stdd-contract provider --consumer=frontend
```

### 契约管理

```bash
# 查看契约状态
/stdd-contract status

# 对比契约变更
/stdd-contract diff --old=pacts/v1 --new=pacts/v2

# 发布契约到 Broker
/stdd-contract publish --broker=http://pact-broker.example.com
```

---

## 契约文件格式

生成文件: `pacts/frontend-todo-api.json`

```json
{
  "consumer": {
    "name": "frontend"
  },
  "provider": {
    "name": "todo-api"
  },
  "interactions": [
    {
      "description": "获取所有 Todo 列表",
      "providerState": "存在 3 个 Todo",
      "request": {
        "method": "GET",
        "path": "/api/todos",
        "headers": {
          "Accept": "application/json"
        }
      },
      "response": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": [
          {
            "id": "uuid-1",
            "title": "Buy milk",
            "completed": false,
            "createdAt": "2026-03-27T10:00:00Z"
          }
        ],
        "matchingRules": {
          "$.body[*].id": {
            "matchers": [
              { "match": "regex", "regex": "^[0-9a-f-]{36}$" }
            ]
          },
          "$.body[*].title": {
            "matchers": [
              { "match": "type" }
            ]
          },
          "$.body[*].completed": {
            "matchers": [
              { "match": "type" }
            ]
          },
          "$.body[*].createdAt": {
            "matchers": [
              { "match": "regex", "regex": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$" }
            ]
          }
        }
      }
    },
    {
      "description": "创建新 Todo",
      "request": {
        "method": "POST",
        "path": "/api/todos",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "title": "New Todo"
        }
      },
      "response": {
        "status": 201,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "id": "uuid-new",
          "title": "New Todo",
          "completed": false,
          "createdAt": "2026-03-27T10:00:00Z"
        }
      }
    },
    {
      "description": "获取不存在的 Todo 返回 404",
      "providerState": "Todo 不存在",
      "request": {
        "method": "GET",
        "path": "/api/todos/non-existent-id"
      },
      "response": {
        "status": 404,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "code": "NOT_FOUND",
          "message": "Todo not found"
        }
      }
    }
  ],
  "metadata": {
    "pactSpecification": {
      "version": "2.0.0"
    }
  }
}
```

---

## 消费者测试生成

生成文件: `src/__tests__/contracts/todo-api.contract.test.ts`

```typescript
import { Pact } from '@pact-foundation/pact';
import { TodoService } from '../../services/TodoService';

const provider = new Pact({
  consumer: 'frontend',
  provider: 'todo-api',
  port: 1234,
  log: './logs/pact.log',
  dir: './pacts',
});

describe('Todo API Contract Tests', () => {
  let todoService: TodoService;

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  beforeEach(() => {
    todoService = new TodoService('http://localhost:1234');
  });

  describe('GET /api/todos', () => {
    it('should return list of todos', async () => {
      // 定义期望
      await provider.addInteraction({
        state: '存在 3 个 Todo',
        uponReceiving: '获取所有 Todo 列表',
        withRequest: {
          method: 'GET',
          path: '/api/todos',
          headers: { Accept: 'application/json' },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: [
            {
              id: '1',
              title: 'Todo 1',
              completed: false,
              createdAt: '2026-03-27T10:00:00Z',
            },
          ],
        },
      });

      // 执行请求
      const todos = await todoService.getTodos();

      // 验证响应
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe('Todo 1');
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      await provider.addInteraction({
        uponReceiving: '创建新 Todo',
        withRequest: {
          method: 'POST',
          path: '/api/todos',
          headers: { 'Content-Type': 'application/json' },
          body: { title: 'New Todo' },
        },
        willRespondWith: {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: 'new-id',
            title: 'New Todo',
            completed: false,
            createdAt: '2026-03-27T10:00:00Z',
          },
        },
      });

      const todo = await todoService.createTodo({ title: 'New Todo' });

      expect(todo.title).toBe('New Todo');
      expect(todo.completed).toBe(false);
    });
  });
});
```

---

## 提供者验证

生成文件: `src/__tests__/contracts/provider.test.ts`

```typescript
import { Verifier } from '@pact-foundation/pact';
import { app } from '../../app';

describe('Pact Verification', () => {
  it('should validate the API against consumer contracts', async () => {
    const verifier = new Verifier({
      providerBaseUrl: 'http://localhost:3000',
      pactUrls: ['./pacts/frontend-todo-api.json'],
      providerStatesSetupUrl: '/test/setup-provider-states',
      providerStatesTeardownUrl: '/test/teardown-provider-states',
    });

    const result = await verifier.verifyProvider();

    expect(result).toBeTruthy();
  });
});
```

---

## Breaking Changes 检测

```bash
/stdd-contract diff --old=pacts/v1 --new=pacts/v2
```

输出:
```
📊 契约变更分析

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Breaking Changes (必须处理):

  GET /api/todos
  └── 响应字段变更
      ├── 移除字段: 'description' (前端依赖)
      └── 类型变更: 'completed' boolean → string

  POST /api/todos
  └── 必填字段变更
      └── 新增必填: 'priority'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 Non-Breaking Changes (建议处理):

  GET /api/todos/{id}
  └── 新增字段: 'tags' (可选)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Compatible Changes:

  DELETE /api/todos/{id}
  └── 无变更

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 建议:
1. 与前端团队沟通 'description' 字段移除影响
2. 'completed' 类型变更需要前端配合更新
3. 'priority' 字段需要前端添加默认值
```

---

## 契约状态仪表板

```bash
/stdd-contract status
```

输出:
```
📊 契约测试状态

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

消费者:
  ┌─────────────┬──────────┬──────────┬─────────────┐
  │ 名称        │ 版本     │ 最后验证 │ 状态        │
  ├─────────────┼──────────┼──────────┼─────────────┤
  │ frontend    │ 1.2.0    │ 2h ago   │ ✅ 通过     │
  │ mobile-app  │ 1.0.0    │ 1d ago   │ ⚠️ 待验证   │
  └─────────────┴──────────┴──────────┴─────────────┘

提供者:
  ┌─────────────┬──────────┬──────────┬─────────────┐
  │ 名称        │ 版本     │ 消费者数 │ 状态        │
  ├─────────────┼──────────┼──────────┼─────────────┤
  │ todo-api    │ 2.0.0    │ 2        │ ✅ 全部通过 │
  └─────────────┴──────────┴──────────┴─────────────┘

交互统计:
  总交互: 15
  ├── ✅ 通过: 14
  ├── ❌ 失败: 0
  └── ⚠️ 待验证: 1
```

---

## 与 STDD 工作流集成

```
/stdd-api-spec
    │
    └──► 生成 API 规范
            │
            ▼
/stdd-contract consumer
    │
    ├──► 前端定义 API 期望
    │
    └──► 生成契约文件 (pacts/)
            │
            ▼
/stdd-execute (后端实现)
    │
    └──► 实现必须通过契约验证
            │
            ▼
/stdd-contract provider --verify
    │
    └──► 确保后端实现符合契约
```

---

## 配置

在 `.stdd/memory/contract-config.json` 中：

```json
{
  "consumers": [
    { "name": "frontend", "version": "1.0.0" },
    { "name": "mobile-app", "version": "1.0.0" }
  ],
  "providers": [
    { "name": "todo-api", "baseUrl": "http://localhost:3000" }
  ],
  "pactBroker": {
    "url": "http://pact-broker.example.com",
    "enabled": false
  },
  "verification": {
    "publishResults": true,
    "failOnBreakingChanges": true
  }
}
```

---

> **引用**: 借鉴自 Pact 契约测试框架
