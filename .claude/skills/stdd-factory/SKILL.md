---
description: 测试数据工厂 - 自动生成测试数据和 Fixtures
---

# STDD 测试数据工厂 (/stdd-factory)

## 目标
自动生成类型安全的测试数据，支持多种构建策略，确保测试数据的一致性和可维护性。

---

## 核心概念

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Data Factory                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Builder Pattern      Fixture Pattern      Faker Pattern   │
│   ┌───────────┐       ┌───────────┐       ┌───────────┐  │
│   │   .with() │       │   预定义   │       │   随机     │  │
│   │   .build()│       │   数据集   │       │   生成     │  │
│   └───────────┘       └───────────┘       └───────────┘  │
│         │                   │                   │          │
│         └───────────────────┴───────────────────┘          │
│                             │                               │
│                    类型安全的测试数据                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 使用方式

### 生成工厂
```bash
# 为模型生成数据工厂
/stdd-factory create --model=Todo

# 批量生成
/stdd-factory create --models=Todo,User,Project

# 从类型定义生成
/stdd-factory create --from=src/types/todo.types.ts
```

### 生成测试数据
```bash
# 生成单个对象
/stdd-factory build Todo

# 生成多个对象
/stdd-factory build Todo --count=10

# 带自定义属性
/stdd-factory build Todo --override='{"title":"Custom"}'

# 生成特定场景
/stdd-factory build Todo --scenario=completed
```

### 管理 Fixtures
```bash
# 保存为 Fixture
/stdd-factory save --name=todo-list --data=todos.json

# 加载 Fixture
/stdd-factory load --name=todo-list

# 列出所有 Fixtures
/stdd-factory list
```

---

## 生成的工厂代码

生成文件: `src/__tests__/factories/todo.factory.ts`

```typescript
import { faker } from '@faker-js/faker';
import type { Todo, TodoId, TodoTitle } from '../../types/todo.types';

/**
 * Todo 数据工厂
 */
export class TodoFactory {
  private overrides: Partial<Todo> = {};

  /**
   * 设置覆盖属性
   */
  with(overrides: Partial<Todo>): this {
    this.overrides = { ...this.overrides, ...overrides };
    return this;
  }

  /**
   * 构建单个 Todo
   */
  build(): Todo {
    const defaults: Todo = {
      id: this.generateId(),
      title: this.generateTitle(),
      completed: false,
      createdAt: new Date(),
      updatedAt: undefined,
    };

    return { ...defaults, ...this.overrides } as Todo;
  }

  /**
   * 构建多个 Todo
   */
  buildList(count: number): Todo[] {
    return Array.from({ length: count }, () => {
      const factory = new TodoFactory();
      factory.overrides = { ...this.overrides };
      return factory.build();
    });
  }

  /**
   * 生成 Todo ID
   */
  private generateId(): TodoId {
    return faker.string.uuid() as TodoId;
  }

  /**
   * 生成 Todo 标题
   */
  private generateTitle(): TodoTitle {
    return faker.hacker.phrase().slice(0, 200) as TodoTitle;
  }

  // ========== 预设场景 ==========

  /**
   * 已完成的 Todo
   */
  static completed(): Todo {
    return new TodoFactory()
      .with({ completed: true })
      .build();
  }

  /**
   * 未完成的 Todo
   */
  static pending(): Todo {
    return new TodoFactory()
      .with({ completed: false })
      .build();
  }

  /**
   * 今天创建的 Todo
   */
  static createdToday(): Todo {
    return new TodoFactory()
      .with({ createdAt: new Date() })
      .build();
  }

  /**
   * 过期的 Todo (30 天前)
   */
  static stale(): Todo {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new TodoFactory()
      .with({ createdAt: thirtyDaysAgo })
      .build();
  }

  /**
   * 长标题的 Todo
   */
  static longTitle(): Todo {
    return new TodoFactory()
      .with({ title: faker.lorem.paragraph(3).slice(0, 200) as TodoTitle })
      .build();
  }

  /**
   * 混合状态列表
   */
  static mixedList(total: number = 10, completedRatio: number = 0.3): Todo[] {
    const completedCount = Math.floor(total * completedRatio);
    return [
      ...Array.from({ length: completedCount }, () => TodoFactory.completed()),
      ...Array.from({ length: total - completedCount }, () => TodoFactory.pending()),
    ];
  }
}

// 便捷导出
export const createTodo = (overrides?: Partial<Todo>) =>
  new TodoFactory().with(overrides || {}).build();

export const createTodos = (count: number, overrides?: Partial<Todo>) =>
  new TodoFactory().with(overrides || {}).buildList(count);
```

---

## 请求工厂

生成文件: `src/__tests__/factories/request.factory.ts`

```typescript
import { faker } from '@faker-js/faker';
import type { CreateTodoRequest, UpdateTodoRequest, TodoFilter } from '../../types/api.types';

/**
 * 创建请求工厂
 */
export class CreateTodoRequestFactory {
  private overrides: Partial<CreateTodoRequest> = {};

  with(overrides: Partial<CreateTodoRequest>): this {
    this.overrides = { ...this.overrides, ...overrides };
    return this;
  }

  build(): CreateTodoRequest {
    return {
      title: faker.hacker.phrase().slice(0, 200),
      ...this.overrides,
    };
  }

  static emptyTitle(): CreateTodoRequest {
    return new CreateTodoRequestFactory().with({ title: '' }).build();
  }

  static longTitle(): CreateTodoRequest {
    return new CreateTodoRequestFactory()
      .with({ title: 'a'.repeat(201) })
      .build();
  }
}

/**
 * 更新请求工厂
 */
export class UpdateTodoRequestFactory {
  private overrides: Partial<UpdateTodoRequest> = {};

  with(overrides: Partial<UpdateTodoRequest>): this {
    this.overrides = { ...this.overrides, ...overrides };
    return this;
  }

  build(): UpdateTodoRequest {
    return {
      title: faker.hacker.phrase().slice(0, 200),
      completed: faker.datatype.boolean(),
      ...this.overrides,
    };
  }

  static completeOnly(): UpdateTodoRequest {
    return new UpdateTodoRequestFactory().with({ title: undefined }).build();
  }

  static titleOnly(): UpdateTodoRequest {
    return new UpdateTodoRequestFactory().with({ completed: undefined }).build();
  }
}

/**
 * 过滤器工厂
 */
export class TodoFilterFactory {
  private overrides: Partial<TodoFilter> = {};

  with(overrides: Partial<TodoFilter>): this {
    this.overrides = { ...this.overrides, ...overrides };
    return this;
  }

  build(): TodoFilter {
    return {
      status: 'all',
      ...this.overrides,
    };
  }

  static activeOnly(): TodoFilter {
    return new TodoFilterFactory().with({ status: 'active' }).build();
  }

  static completedOnly(): TodoFilter {
    return new TodoFilterFactory().with({ status: 'completed' }).build();
  }
}
```

---

## Fixture 管理

生成文件: `src/__tests__/fixtures/todos.fixture.ts`

```typescript
import type { Todo } from '../../types/todo.types';

/**
 * 预定义的 Todo Fixtures
 */
export const todoFixtures = {
  /**
   * 空 Todo 列表
   */
  empty: [] as Todo[],

  /**
   * 单个未完成 Todo
   */
  singlePending: [
    {
      id: 'todo-1',
      title: 'Buy groceries',
      completed: false,
      createdAt: new Date('2026-03-27T10:00:00Z'),
    },
  ] as Todo[],

  /**
   * 单个已完成 Todo
   */
  singleCompleted: [
    {
      id: 'todo-1',
      title: 'Walk the dog',
      completed: true,
      createdAt: new Date('2026-03-26T10:00:00Z'),
      updatedAt: new Date('2026-03-27T10:00:00Z'),
    },
  ] as Todo[],

  /**
   * 混合状态列表 (3 未完成, 2 已完成)
   */
  mixedList: [
    {
      id: 'todo-1',
      title: 'Task 1',
      completed: false,
      createdAt: new Date('2026-03-27T09:00:00Z'),
    },
    {
      id: 'todo-2',
      title: 'Task 2',
      completed: true,
      createdAt: new Date('2026-03-27T08:00:00Z'),
      updatedAt: new Date('2026-03-27T10:00:00Z'),
    },
    {
      id: 'todo-3',
      title: 'Task 3',
      completed: false,
      createdAt: new Date('2026-03-27T09:30:00Z'),
    },
    {
      id: 'todo-4',
      title: 'Task 4',
      completed: true,
      createdAt: new Date('2026-03-26T10:00:00Z'),
      updatedAt: new Date('2026-03-27T09:00:00Z'),
    },
    {
      id: 'todo-5',
      title: 'Task 5',
      completed: false,
      createdAt: new Date('2026-03-27T10:00:00Z'),
    },
  ] as Todo[],

  /**
   * 边界情况: 长标题
   */
  longTitle: [
    {
      id: 'todo-1',
      title: 'a'.repeat(200),
      completed: false,
      createdAt: new Date(),
    },
  ] as Todo[],

  /**
   * 边界情况: 特殊字符
   */
  specialCharacters: [
    {
      id: 'todo-1',
      title: 'Test <script>alert("xss")</script>',
      completed: false,
      createdAt: new Date(),
    },
    {
      id: 'todo-2',
      title: 'Test "quotes" and \'apostrophes\'',
      completed: false,
      createdAt: new Date(),
    },
    {
      id: 'todo-3',
      title: 'Test 🎉 emoji 📝',
      completed: false,
      createdAt: new Date(),
    },
  ] as Todo[],
};

export type TodoFixtureName = keyof typeof todoFixtures;
```

---

## 测试中使用

```typescript
// src/__tests__/services/TodoService.test.ts

import { describe, it, expect } from 'vitest';
import { TodoFactory, createTodo, createTodos } from '../factories/todo.factory';
import { CreateTodoRequestFactory } from '../factories/request.factory';
import { todoFixtures } from '../fixtures/todos.fixture';

describe('TodoService', () => {
  describe('create', () => {
    it('should create todo with generated data', async () => {
      const service = new TodoService();
      const todo = await service.create(createTodo());

      expect(todo.id).toBeDefined();
      expect(todo.title).toBeDefined();
    });

    it('should create todo with custom title', async () => {
      const service = new TodoService();
      const todo = await service.create(
        createTodo({ title: 'Custom Title' })
      );

      expect(todo.title).toBe('Custom Title');
    });

    it('should validate empty title', async () => {
      const service = new TodoService();
      const request = CreateTodoRequestFactory.emptyTitle();

      await expect(service.create(request)).rejects.toThrow('Title is required');
    });
  });

  describe('getAll', () => {
    it('should return empty list', async () => {
      const service = new TodoService({ todos: todoFixtures.empty });
      const todos = await service.getAll();

      expect(todos).toHaveLength(0);
    });

    it('should return mixed list', async () => {
      const service = new TodoService({ todos: todoFixtures.mixedList });
      const todos = await service.getAll();

      expect(todos).toHaveLength(5);
      expect(todos.filter(t => t.completed)).toHaveLength(2);
    });
  });

  describe('export', () => {
    it('should generate correct markdown for mixed list', async () => {
      const service = new TodoService({ todos: todoFixtures.mixedList });
      const markdown = await service.exportMarkdown();

      expect(markdown).toContain('- [ ] Task 1');
      expect(markdown).toContain('- [x] Task 2');
    });
  });

  describe('performance', () => {
    it('should handle large lists', async () => {
      const todos = createTodos(1000);
      const service = new TodoService({ todos });

      const start = performance.now();
      const result = await service.getAll();
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // < 100ms
    });
  });
});
```

---

## 与 STDD 工作流集成

```
/stdd-schema
    │
    └──► 生成类型定义
            │
            ▼
/stdd-factory create --from=types
    │
    ├──► 生成数据工厂
    │
    ├──► 生成请求工厂
    │
    └──► 生成 Fixtures
            │
            ▼
/stdd-execute
    │
    └──► 使用工厂生成测试数据
```

---

## 配置

在 `.stdd/memory/factory-config.json` 中：

```json
{
  "factoriesDir": "src/__tests__/factories",
  "fixturesDir": "src/__tests__/fixtures",
  "faker": {
    "locale": "zh_CN",
    "seed": 12345
  },
  "defaults": {
    "generateScenarios": true,
    "generateFixtures": true,
    "includeEdgeCases": true
  }
}
```

---

> **引用**: 借鉴自 Factory Boy (Python)、Test Data Builder 模式和 Faker.js
