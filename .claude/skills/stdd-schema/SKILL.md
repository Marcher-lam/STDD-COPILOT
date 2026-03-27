---
description: 类型规范先行 - JSON Schema / Zod / TypeScript 类型生成
---

# STDD 类型规范先行 (/stdd-schema)

## 目标
实现 **Type-First Development**，在编写业务逻辑前先定义数据类型，确保类型安全、自动验证、文档同步。

---

## 核心理念

```
传统开发:
  代码 → (隐式) → 数据结构 → (可能不一致)

Type-First:
  类型定义 → 代码生成 → 类型安全 + 自动验证 + 文档同步
```

---

## 支持的类型系统

| 类型系统 | 用途 | 输出文件 |
|---------|------|----------|
| **JSON Schema** | 数据验证规范 | `*.schema.json` |
| **Zod** | 运行时验证 | `*.zod.ts` |
| **TypeScript** | 静态类型 | `*.types.ts` |
| **io-ts** | 函数式验证 | `*.codec.ts` |
| **Yup** | 表单验证 | `*.yup.ts` |

---

## 使用方式

### 从 BDD 规格生成类型
```bash
# 从 BDD 规格生成
/stdd-schema --from=02_bdd_specs.feature

# 指定类型系统
/stdd-schema --from=specs --format=zod
```

### 生成 JSON Schema
```bash
# 生成 JSON Schema
/stdd-schema generate --format=json-schema

# 为特定模型生成
/stdd-schema generate --format=json-schema --models=Todo,User
```

### 生成 Zod 验证器
```bash
# 生成 Zod Schema
/stdd-schema generate --format=zod

# 带自定义验证
/stdd-schema generate --format=zod --strict
```

### 验证数据
```bash
# 验证 JSON 数据
/stdd-schema validate --data=data.json --schema=Todo.schema.json

# 验证 API 响应
/stdd-schema validate --api-response --endpoint=/api/todos
```

---

## 类型定义示例

### 输入: BDD 规格

```gherkin
Feature: Todo List
  Scenario: Create Todo
    Given a user wants to create a todo
    When they submit title "Buy milk"
    Then a new todo is created with:
      | field     | value        |
      | id        | UUID         |
      | title     | string       |
      | completed | false        |
      | createdAt | current time |
```

### 输出 1: JSON Schema

生成文件: `schemas/Todo.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/Todo",
  "title": "Todo",
  "description": "待办事项",
  "type": "object",
  "required": ["id", "title", "completed", "createdAt"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Todo 唯一标识"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "description": "Todo 标题"
    },
    "completed": {
      "type": "boolean",
      "default": false,
      "description": "是否完成"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "创建时间"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "更新时间"
    }
  },
  "additionalProperties": false
}
```

### 输出 2: Zod Schema

生成文件: `src/schemas/todo.zod.ts`

```typescript
import { z } from 'zod';

/**
 * Todo 唯一标识
 */
export const TodoIdSchema = z.string().uuid();

/**
 * Todo 标题 (1-200 字符)
 */
export const TodoTitleSchema = z.string().min(1).max(200);

/**
 * Todo 完整 Schema
 */
export const TodoSchema = z.object({
  /** Todo 唯一标识 */
  id: TodoIdSchema,
  /** Todo 标题 */
  title: TodoTitleSchema,
  /** 是否完成 */
  completed: z.boolean().default(false),
  /** 创建时间 */
  createdAt: z.string().datetime(),
  /** 更新时间 */
  updatedAt: z.string().datetime().optional(),
});

/**
 * 创建 Todo 请求 Schema
 */
export const CreateTodoRequestSchema = z.object({
  title: TodoTitleSchema,
});

/**
 * 更新 Todo 请求 Schema
 */
export const UpdateTodoRequestSchema = z.object({
  title: TodoTitleSchema.optional(),
  completed: z.boolean().optional(),
});

/**
 * Todo 过滤器 Schema
 */
export const TodoFilterSchema = z.object({
  status: z.enum(['all', 'active', 'completed']).default('all'),
  ids: z.array(z.string().uuid()).optional(),
});

// 导出类型
export type Todo = z.infer<typeof TodoSchema>;
export type CreateTodoRequest = z.infer<typeof CreateTodoRequestSchema>;
export type UpdateTodoRequest = z.infer<typeof UpdateTodoRequestSchema>;
export type TodoFilter = z.infer<typeof TodoFilterSchema>;
```

### 输出 3: TypeScript 类型

生成文件: `src/types/todo.types.ts`

```typescript
/**
 * 自动生成类型定义
 * 生成时间: 2026-03-27T12:00:00Z
 * 源文件: 02_bdd_specs.feature
 */

/**
 * Todo 唯一标识 (UUID 格式)
 */
export type TodoId = string & { readonly __brand: 'TodoId' };

/**
 * Todo 标题 (1-200 字符)
 */
export type TodoTitle = string & { readonly __brand: 'TodoTitle' };

/**
 * 待办事项
 */
export interface Todo {
  /** Todo 唯一标识 */
  readonly id: TodoId;
  /** Todo 标题 */
  readonly title: TodoTitle;
  /** 是否完成 */
  readonly completed: boolean;
  /** 创建时间 */
  readonly createdAt: Date;
  /** 更新时间 */
  readonly updatedAt?: Date;
}

/**
 * 创建 Todo 请求
 */
export interface CreateTodoRequest {
  /** Todo 标题 */
  readonly title: TodoTitle;
}

/**
 * 更新 Todo 请求
 */
export interface UpdateTodoRequest {
  /** Todo 标题 */
  readonly title?: TodoTitle;
  /** 是否完成 */
  readonly completed?: boolean;
}

/**
 * Todo 状态
 */
export type TodoStatus = 'all' | 'active' | 'completed';

/**
 * Todo 过滤器
 */
export interface TodoFilter {
  /** 状态过滤 */
  readonly status?: TodoStatus;
  /** ID 过滤 */
  readonly ids?: readonly TodoId[];
}

/**
 * Todo 列表响应
 */
export interface TodoListResponse {
  readonly items: readonly Todo[];
  readonly total: number;
}
```

---

## 运行时验证

生成文件: `src/utils/validation.ts`

```typescript
import { TodoSchema, CreateTodoRequestSchema, UpdateTodoRequestSchema } from '../schemas/todo.zod';
import type { Todo, CreateTodoRequest, UpdateTodoRequest } from '../types/todo.types';

/**
 * 验证 Todo 对象
 */
export function validateTodo(data: unknown): Todo {
  return TodoSchema.parse(data);
}

/**
 * 安全验证 Todo 对象 (不抛异常)
 */
export function safeValidateTodo(data: unknown): { success: true; data: Todo } | { success: false; errors: string[] } {
  const result = TodoSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * 验证创建请求
 */
export function validateCreateRequest(data: unknown): CreateTodoRequest {
  return CreateTodoRequestSchema.parse(data);
}

/**
 * 验证更新请求
 */
export function validateUpdateRequest(data: unknown): UpdateTodoRequest {
  return UpdateTodoRequestSchema.parse(data);
}

/**
 * 类型守卫: 检查是否为有效的 Todo
 */
export function isTodo(data: unknown): data is Todo {
  return TodoSchema.safeParse(data).success;
}
```

---

## Express 中间件集成

生成文件: `src/middleware/validate.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * 创建验证中间件
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: '请求参数验证失败',
        details: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    req.body = result.data;
    next();
  };
}

/**
 * 验证路由参数
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: '路由参数验证失败',
        details: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    req.params = result.data as any;
    next();
  };
}
```

### 使用示例

```typescript
import { Router } from 'express';
import { validateBody, validateParams } from '../middleware/validate';
import { CreateTodoRequestSchema, UpdateTodoRequestSchema } from '../schemas/todo.zod';
import { z } from 'zod';

const router = Router();

// 参数验证 Schema
const TodoParamsSchema = z.object({
  id: z.string().uuid(),
});

// POST /api/todos - 创建 Todo
router.post('/',
  validateBody(CreateTodoRequestSchema),
  async (req, res) => {
    // req.body 已被验证且类型安全
    const todo = await todoService.create(req.body);
    res.status(201).json(todo);
  }
);

// PATCH /api/todos/:id - 更新 Todo
router.patch('/:id',
  validateParams(TodoParamsSchema),
  validateBody(UpdateTodoRequestSchema),
  async (req, res) => {
    // req.params 和 req.body 都已验证
    const todo = await todoService.update(req.params.id, req.body);
    res.json(todo);
  }
);
```

---

## 与 STDD 工作流集成

```
/stdd-spec
    │
    └──► 生成 BDD 规格
            │
            ▼
/stdd-schema ───────────────────────────────────┐
    │                                             │
    ├──► 生成 JSON Schema (数据验证)              │
    │                                             │
    ├──► 生成 Zod Schema (运行时验证)             │
    │                                             │
    ├──► 生成 TypeScript 类型 (静态检查)          │
    │                                             │
    └──► 生成验证中间件                           │
            │                                     │
            ▼                                     │
/stdd-execute                                    │
    │                                             │
    └──► 实现代码自动类型安全 ◄──────────────────┘
```

---

## 配置

在 `.stdd/memory/schema-config.json` 中：

```json
{
  "formats": ["json-schema", "zod", "typescript"],
  "outputPaths": {
    "jsonSchema": "schemas/",
    "zod": "src/schemas/",
    "typescript": "src/types/"
  },
  "options": {
    "strict": true,
    "generateValidators": true,
    "generateMiddleware": true,
    "brandTypes": true
  }
}
```

---

> **引用**: 借鉴自 JSON Schema、Zod 和 Type-First Development 原则
