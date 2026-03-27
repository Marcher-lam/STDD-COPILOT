---
description: 自动 Mock 生成 - 服务/API 依赖模拟
---

# STDD 自动 Mock 生成 (/stdd-mock)

## 目标
自动分析依赖关系并生成 Mock/Stub，隔离外部依赖，使单元测试专注于被测单元，提高测试速度和稳定性。

---

## Mock 类型

```
┌─────────────────────────────────────────────────────────────┐
│                      Mock 类型层次                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌───────────┐   ┌───────────┐   ┌───────────┐           │
│   │   Dummy   │   │   Stub    │   │   Mock    │           │
│   │  空实现   │   │  固定返回  │   │  验证调用  │           │
│   └───────────┘   └───────────┘   └───────────┘           │
│         │               │               │                   │
│         └───────────────┴───────────────┘                   │
│                         │                                    │
│   ┌─────────────────────┴─────────────────────┐             │
│   │              Fake                          │             │
│   │         (内存实现，如 Fake DB)             │             │
│   └───────────────────────────────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 使用方式

### 分析依赖
```bash
# 分析文件的依赖关系
/stdd-mock analyze src/services/TodoService.ts

# 分析整个目录
/stdd-mock analyze src/services/
```

### 生成 Mock
```bash
# 生成服务 Mock
/stdd-mock generate --service=TodoService

# 生成 API Mock
/stdd-mock generate --api=/api/todos

# 生成模块 Mock
/stdd-mock generate --module=../utils/logger

# 批量生成
/stdd-mock generate --all
```

### 配置 Mock 行为
```bash
# 设置默认返回值
/stdd-mock configure TodoService --returns={getAll: []}

# 设置抛出错误
/stdd-mock configure ApiService --throws={fetch: Error}
```

---

## 依赖分析输出

```bash
/stdd-mock analyze src/services/TodoService.ts
```

输出:
```
🔍 依赖分析: TodoService.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 依赖关系图

TodoService
    │
    ├──► StorageService (直接依赖)
    │       └──► localStorage API (外部)
    │
    ├──► LoggerService (直接依赖)
    │       └──► console (全局)
    │
    └──► ApiService (直接依赖)
            ├──► fetch (浏览器 API)
            └──► /api/todos (后端服务)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 建议生成的 Mock

┌─────────────────┬──────────────┬────────────────┐
│ 依赖            │ Mock 类型    │ 优先级         │
├─────────────────┼──────────────┼────────────────┤
│ StorageService  │ Fake         │ 高 (持久化)    │
│ LoggerService   │ Stub         │ 中 (日志)      │
│ ApiService      │ Mock         │ 高 (网络)      │
└─────────────────┴──────────────┴────────────────┘

💡 生成命令:
  /stdd-mock generate --service=StorageService --type=fake
  /stdd-mock generate --service=LoggerService --type=stub
  /stdd-mock generate --service=ApiService --type=mock
```

---

## 生成的 Mock 文件

### Mock 1: StorageService Fake

生成文件: `src/__mocks__/services/StorageService.fake.ts`

```typescript
import type { StorageService } from '../../services/StorageService';

/**
 * StorageService 的 Fake 实现
 * 使用内存 Map 模拟 localStorage
 */
export class StorageServiceFake implements StorageService {
  private store: Map<string, string> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get(key);
    if (value === undefined) {
      return null;
    }
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  // 测试辅助方法
  getStoreSnapshot(): Record<string, string> {
    return Object.fromEntries(this.store);
  }

  seed(data: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(data)) {
      this.store.set(key, JSON.stringify(value));
    }
  }
}

// 工厂函数
export function createStorageServiceFake(
  initialData?: Record<string, unknown>
): StorageServiceFake {
  const fake = new StorageServiceFake();
  if (initialData) {
    fake.seed(initialData);
  }
  return fake;
}
```

### Mock 2: LoggerService Stub

生成文件: `src/__mocks__/services/LoggerService.stub.ts`

```typescript
import type { LoggerService } from '../../services/LoggerService';

/**
 * LoggerService 的 Stub 实现
 * 静默日志，可选记录调用
 */
export class LoggerServiceStub implements LoggerService {
  private calls: Array<{ level: string; message: string; data?: unknown }> = [];

  info(message: string, data?: unknown): void {
    this.calls.push({ level: 'info', message, data });
  }

  warn(message: string, data?: unknown): void {
    this.calls.push({ level: 'warn', message, data });
  }

  error(message: string, data?: unknown): void {
    this.calls.push({ level: 'error', message, data });
  }

  debug(message: string, data?: unknown): void {
    this.calls.push({ level: 'debug', message, data });
  }

  // 测试辅助方法
  getCalls(): Array<{ level: string; message: string; data?: unknown }> {
    return [...this.calls];
  }

  getInfoCalls(): Array<{ message: string; data?: unknown }> {
    return this.calls.filter(c => c.level === 'info');
  }

  getErrorCalls(): Array<{ message: string; data?: unknown }> {
    return this.calls.filter(c => c.level === 'error');
  }

  clear(): void {
    this.calls = [];
  }
}

export function createLoggerServiceStub(): LoggerServiceStub {
  return new LoggerServiceStub();
}
```

### Mock 3: ApiService Mock

生成文件: `src/__mocks__/services/ApiService.mock.ts`

```typescript
import { vi } from 'vitest';
import type { ApiService } from '../../services/ApiService';

/**
 * ApiService 的 Mock 实现
 * 使用 Vitest mock 验证调用
 */
export function createApiServiceMock(): ApiService & {
  _mock: {
    getTodos: ReturnType<typeof vi.fn>;
    createTodo: ReturnType<typeof vi.fn>;
    updateTodo: ReturnType<typeof vi.fn>;
    deleteTodo: ReturnType<typeof vi.fn>;
  };
} {
  const mock = {
    getTodos: vi.fn().mockResolvedValue([]),
    createTodo: vi.fn().mockResolvedValue({}),
    updateTodo: vi.fn().mockResolvedValue({}),
    deleteTodo: vi.fn().mockResolvedValue(undefined),
  };

  return {
    ...mock,
    _mock: mock,
  };
}

/**
 * 预配置的场景 Mock
 */
export const apiServiceScenarios = {
  /**
   * 空列表场景
   */
  emptyList: () => {
    const mock = createApiServiceMock();
    mock._mock.getTodos.mockResolvedValue([]);
    return mock;
  },

  /**
   * 包含多个 Todo 的场景
   */
  withTodos: (count: number = 3) => {
    const mock = createApiServiceMock();
    const todos = Array.from({ length: count }, (_, i) => ({
      id: `todo-${i + 1}`,
      title: `Todo ${i + 1}`,
      completed: i % 2 === 0,
      createdAt: new Date().toISOString(),
    }));
    mock._mock.getTodos.mockResolvedValue(todos);
    return mock;
  },

  /**
   * 网络错误场景
   */
  networkError: () => {
    const mock = createApiServiceMock();
    mock._mock.getTodos.mockRejectedValue(new Error('Network error'));
    return mock;
  },
};
```

---

## 测试中使用 Mock

```typescript
// src/__tests__/services/TodoService.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { TodoService } from '../../services/TodoService';
import { createStorageServiceFake } from '../../__mocks__/services/StorageService.fake';
import { createLoggerServiceStub } from '../../__mocks__/services/LoggerService.stub';
import { createApiServiceMock, apiServiceScenarios } from '../../__mocks__/services/ApiService.mock';

describe('TodoService', () => {
  let todoService: TodoService;
  let storageFake: ReturnType<typeof createStorageServiceFake>;
  let loggerStub: ReturnType<typeof createLoggerServiceStub>;
  let apiMock: ReturnType<typeof createApiServiceMock>;

  beforeEach(() => {
    storageFake = createStorageServiceFake();
    loggerStub = createLoggerServiceStub();
    apiMock = apiServiceScenarios.emptyList();

    todoService = new TodoService(storageFake, loggerStub, apiMock);
  });

  describe('create', () => {
    it('should create todo and persist to storage', async () => {
      const todo = await todoService.create('New Todo');

      expect(todo.title).toBe('New Todo');
      expect(todo.completed).toBe(false);

      // 验证存储调用
      const stored = await storageFake.get('todos');
      expect(stored).toHaveLength(1);
    });

    it('should log creation', async () => {
      await todoService.create('New Todo');

      const infoCalls = loggerStub.getInfoCalls();
      expect(infoCalls).toHaveLength(1);
      expect(infoCalls[0].message).toContain('Todo created');
    });
  });

  describe('getAll', () => {
    it('should return todos from API', async () => {
      apiMock = apiServiceScenarios.withTodos(3);
      todoService = new TodoService(storageFake, loggerStub, apiMock);

      const todos = await todoService.getAll();

      expect(todos).toHaveLength(3);
      expect(apiMock._mock.getTodos).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      apiMock = apiServiceScenarios.networkError();
      todoService = new TodoService(storageFake, loggerStub, apiMock);

      await expect(todoService.getAll()).rejects.toThrow('Network error');

      const errorCalls = loggerStub.getErrorCalls();
      expect(errorCalls).toHaveLength(1);
    });
  });
});
```

---

## API Mock (MSW 集成)

生成文件: `src/__mocks__/api/handlers.ts`

```typescript
import { http, HttpResponse, delay } from 'msw';

/**
 * MSW handlers for /api/todos
 */
export const todoHandlers = [
  // GET /api/todos
  http.get('/api/todos', async () => {
    await delay(100);
    return HttpResponse.json([
      {
        id: '1',
        title: 'Mock Todo 1',
        completed: false,
        createdAt: '2026-03-27T10:00:00Z',
      },
      {
        id: '2',
        title: 'Mock Todo 2',
        completed: true,
        createdAt: '2026-03-27T10:00:00Z',
      },
    ]);
  }),

  // POST /api/todos
  http.post('/api/todos', async ({ request }) => {
    await delay(100);
    const body = await request.json();
    return HttpResponse.json(
      {
        id: 'new-id',
        ...(body as object),
        completed: false,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // DELETE /api/todos/:id
  http.delete('/api/todos/:id', async ({ params }) => {
    await delay(50);
    return new HttpResponse(null, { status: 204 });
  }),
];

// 场景配置
export const createScenarioHandlers = (scenario: 'empty' | 'error' | 'normal') => {
  switch (scenario) {
    case 'empty':
      return [
        http.get('/api/todos', () => HttpResponse.json([])),
      ];
    case 'error':
      return [
        http.get('/api/todos', () => HttpResponse.json(
          { code: 'SERVER_ERROR', message: 'Internal server error' },
          { status: 500 }
        )),
      ];
    default:
      return todoHandlers;
  }
};
```

---

## 与 STDD 工作流集成

```
/stdd-execute
    │
    ├──► 分析依赖
    │       │
    │       └──► /stdd-mock analyze
    │
    ├──► 生成 Mock
    │       │
    │       └──► /stdd-mock generate --all
    │
    └──► 使用 Mock 运行测试
            │
            └──► 隔离依赖，快速验证
```

---

## 配置

在 `.stdd/memory/mock-config.json` 中：

```json
{
  "mocksDir": "src/__mocks__",
  "types": {
    "services": "fake",
    "api": "mock",
    "utilities": "stub"
  },
  "frameworks": {
    "unit": "vitest",
    "api": "msw"
  },
  "defaults": {
    "includeTestHelpers": true,
    "includeScenarios": true,
    "generateTypes": true
  }
}
```

---

> **引用**: 借鉴自 Vitest Mock、MSW (Mock Service Worker) 和 Test Double 模式
