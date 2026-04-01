---
name: stdd-contract
description: |
  契约测试 - 消费者驱动契约 (CDC) 与提供者验证
  触发场景：用户说 '/stdd-contract', 'contract', '契约测试', 'CDC', '契约验证'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
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

<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

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

在 `stdd/memory/contract-config.json` 中：

<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

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

## 集成架构消息模式

参考 tdder，集成架构消息模式指导如何在模块间通信、在测试中验证消息传递的正确性。这是契约测试的扩展——不仅验证 HTTP 契约，还验证事件/消息契约。

### 支持的消息模式

```
┌──────────────────────────────────────────────────────────────┐
│               集成架构消息模式                                 │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ① 同步请求/响应 (REST/gRPC)    ② 异步事件驱动               │
│  ┌────────┐  请求   ┌────────┐  ┌────────┐  事件   ┌──────┐│
│  │Consumer│ ──────► │Provider│  │Producer│ ──────► │Consumer│
│  │        │ ◄────── │        │  │        │         │      ││
│  └────────┘  响应   └────────┘  └────────┘         └──────┘│
│                                                               │
│  ③ 发布/订阅 (Pub/Sub)          ④ CQRS                       │
│  ┌────────┐                     ┌────────┐                   │
│  │Publisher│ ──► [Topic] ──►    │Command │ ──► CommandHandler│
│  └────────┘     │  │  │        └────────┘                   │
│               ┌─┘  │  └─┐      ┌────────┐                   │
│               ▼    ▼    ▼      │ Query   │ ──► QueryHandler │
│            [Sub1][Sub2][Sub3]   └────────┘                   │
│                                                               │
│  ⑤ 事件溯源 (Event Sourcing)                                  │
│  ┌────────┐  事件   ┌─────────────┐  重放   ┌──────────┐    │
│  │Command │ ──────► │Event Store  │ ──────► │ Read Model│    │
│  └────────┘         └─────────────┘         └──────────┘    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 消息契约定义

```bash
# 生成消息契约
/stdd-contract message --pattern=event-driven \
  --producer=OrderService \
  --event=OrderCreated \
  --consumers=InventoryService,NotificationService
```

**生成的消息契约文件**: `stdd/changes/<change>/contracts/order-created.msgContract.json`

```json
{
  "contractType": "message",
  "pattern": "event-driven",
  "version": "1.0.0",
  "producer": {
    "service": "OrderService",
    "event": "OrderCreated"
  },
  "consumers": [
    { "service": "InventoryService", "binding": "order.created.inventory" },
    { "service": "NotificationService", "binding": "order.created.notification" }
  ],
  "message": {
    "headers": {
      "messageId": "uuid",
      "timestamp": "ISO8601",
      "correlationId": "uuid",
      "eventType": "OrderCreated"
    },
    "payload": {
      "orderId": "string",
      "userId": "string",
      "items": [
        { "productId": "string", "quantity": "number", "price": "number" }
      ],
      "totalAmount": "number",
      "currency": "string"
    }
  },
  " guarantees": {
    "delivery": "at-least-once",
    "ordering": "per-orderId",
    "retry": { "maxAttempts": 3, "backoffMs": 1000 }
  }
}
```

### 消息契约测试

#### ① 同步请求/响应测试（已有 CDC）

沿用现有消费者驱动契约测试。

#### ② 异步事件驱动测试

```typescript
// tests/contracts/order-created.contract.test.ts
import { describe, it, expect } from 'vitest';

describe('Message Contract: OrderCreated', () => {
  const contract = loadContract('order-created.msgContract.json');

  it('Producer 应发出符合 schema 的事件', () => {
    const event = OrderService.emitOrderCreated(sampleOrder);
    expect(event.headers.eventType).toBe('OrderCreated');
    expect(event.payload.orderId).toBeDefined();
    // 验证 payload 符合 JSON Schema
    expect(validateSchema(event.payload, contract.message.payload)).toBe(true);
  });

  it('Consumer (InventoryService) 应正确处理事件', async () => {
    const event = createOrderCreatedEvent({ items: [{ quantity: 5 }] });
    const result = await InventoryService.handleOrderCreated(event);
    expect(result.reserved).toBe(true);
  });

  it('Consumer 应幂等处理重复事件', async () => {
    const event = createOrderCreatedEvent({ orderId: 'dup-001' });
    await InventoryService.handleOrderCreated(event);
    const result = await InventoryService.handleOrderCreated(event);
    expect(result.alreadyProcessed).toBe(true);
  });

  it('消息头应包含必须字段', () => {
    const event = OrderService.emitOrderCreated(sampleOrder);
    expect(event.headers.messageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.headers.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(event.headers.correlationId).toBeDefined();
  });
});
```

#### ③ 发布/订阅测试

```typescript
describe('Pub/Sub Contract: OrderEvents', () => {
  it('Publisher 应将消息发布到正确的 Topic', async () => {
    const published = await MessageBus.publish('order-events', orderCreatedEvent);
    expect(published.topic).toBe('order-events');
    expect(published.received).toBe(true);
  });

  it('每个 Subscriber 应独立接收消息', async () => {
    const results = await MessageBus.publishAndWait('order-events', orderCreatedEvent);
    expect(results.subscribers).toHaveLength(3);
    results.subscribers.forEach(sub => {
      expect(sub.acknowledged).toBe(true);
    });
  });
});
```

#### ④ CQRS 测试

```typescript
describe('CQRS Contract', () => {
  it('Command 应通过 CommandHandler 执行', async () => {
    const result = await CommandBus.send(new CreateOrderCommand(sampleData));
    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();
  });

  it('Query 应从 ReadModel 读取（不经过 Command 路径）', async () => {
    // 先通过 Command 创建
    await CommandBus.send(new CreateOrderCommand(sampleData));
    // 再通过 Query 读取
    const order = await QueryBus.ask(new GetOrderQuery(result.orderId));
    expect(order).toBeDefined();
    expect(order.items).toHaveLength(sampleData.items.length);
  });

  it('Command 失败不应影响 ReadModel', async () => {
    await expect(CommandBus.send(new CreateOrderCommand(invalidData)))
      .rejects.toThrow();
    const orders = await QueryBus.ask(new ListOrdersQuery());
    expect(orders.total).toBe(0); // 无副作用
  });
});
```

### 模式选择决策树

```
需要模块间通信?
├── 实时响应? → ① 同步 REST/gRPC (现有 CDC)
├── 解耦+异步? → ② 事件驱动
│    ├── 一对多? → ③ Pub/Sub
│    └── 读写分离? → ④ CQRS
│         └── 需要完整历史? → ⑤ 事件溯源
└── 否 → 模块内调用，无需消息模式
```

---

> **引用**: 借鉴自 Pact 契约测试框架、Enterprise Integration Patterns (Hohpe/Woolf)、CQRS (Young)
