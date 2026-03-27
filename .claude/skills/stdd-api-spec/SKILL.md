---
description: API 规范先行 - 生成 OpenAPI/TypeScript 类型规范
---

# STDD API 规范先行 (/stdd-api-spec)

## 目标
实现 **API-First Design**，在编写任何代码前先生成 API 规范，确保接口设计先行、类型安全、文档自动同步。

---

## 核心理念

```
传统开发:
  代码 → (手动) → API 文档 → (可能过时)

API-First:
  API 规范 → 代码生成 → 类型安全 + 文档同步
```

---

## 支持的规范格式

| 格式 | 用途 | 文件扩展名 |
|------|------|-----------|
| **OpenAPI 3.1** | REST API 规范 | `.yaml`, `.json` |
| **TypeScript** | 类型定义 | `.d.ts`, `.ts` |
| **JSON Schema** | 数据验证 | `.schema.json` |
| **gRPC Proto** | RPC 服务 | `.proto` |
| **GraphQL Schema** | GraphQL API | `.graphql` |

---

## 使用方式

### 从需求生成 OpenAPI 规范
```bash
/stdd-api-spec --openapi

# 指定输出路径
/stdd-api-spec --openapi --output=docs/api/openapi.yaml
```

### 生成 TypeScript 类型
```bash
# 从 OpenAPI 生成 TypeScript
/stdd-api-spec --typescript --from=openapi.yaml

# 从 BDD 规格生成
/stdd-api-spec --typescript --from=02_bdd_specs.feature
```

### 生成 JSON Schema
```bash
# 生成请求/响应 Schema
/stdd-api-spec --json-schema

# 指定模型
/stdd-api-spec --json-schema --models=Todo,User,Project
```

### 验证 API 规范
```bash
# 验证规范格式
/stdd-api-spec validate openapi.yaml

# 检查 breaking changes
/stdd-api-spec diff openapi.v1.yaml openapi.v2.yaml
```

---

## OpenAPI 规范模板

生成文件: `.stdd/active_feature/api-spec.yaml`

```yaml
openapi: 3.1.0
info:
  title: Todo List API
  version: 1.0.0
  description: |
    支持 Markdown 导出的 Todo List API

    ## 功能特性
    - Todo CRUD 操作
    - Markdown 导出
    - localStorage 持久化

servers:
  - url: http://localhost:3000/api
    description: 开发环境

paths:
  /todos:
    get:
      summary: 获取所有 Todo
      operationId: getTodos
      tags:
        - Todos
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [all, active, completed]
          description: 过滤状态
      responses:
        '200':
          description: 成功返回 Todo 列表
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Todo'

    post:
      summary: 创建新 Todo
      operationId: createTodo
      tags:
        - Todos
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTodoRequest'
      responses:
        '201':
          description: 创建成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Todo'
        '400':
          description: 请求参数错误
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /todos/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid

    get:
      summary: 获取单个 Todo
      operationId: getTodo
      tags:
        - Todos
      responses:
        '200':
          description: 成功返回 Todo
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Todo'
        '404':
          description: Todo 不存在

    patch:
      summary: 更新 Todo
      operationId: updateTodo
      tags:
        - Todos
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateTodoRequest'
      responses:
        '200':
          description: 更新成功
        '404':
          description: Todo 不存在

    delete:
      summary: 删除 Todo
      operationId: deleteTodo
      tags:
        - Todos
      responses:
        '204':
          description: 删除成功
        '404':
          description: Todo 不存在

  /todos/export:
    post:
      summary: 导出 Todo 为 Markdown
      operationId: exportTodos
      tags:
        - Export
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                format:
                  type: string
                  enum: [markdown, json, csv]
                  default: markdown
                filter:
                  $ref: '#/components/schemas/TodoFilter'
      responses:
        '200':
          description: 导出成功
          content:
            text/markdown:
              schema:
                type: string
            application/json:
              schema:
                type: object

components:
  schemas:
    Todo:
      type: object
      required:
        - id
        - title
        - completed
        - createdAt
      properties:
        id:
          type: string
          format: uuid
          description: Todo 唯一标识
        title:
          type: string
          minLength: 1
          maxLength: 200
          description: Todo 标题
        completed:
          type: boolean
          default: false
          description: 是否完成
        createdAt:
          type: string
          format: date-time
          description: 创建时间
        updatedAt:
          type: string
          format: date-time
          description: 更新时间

    CreateTodoRequest:
      type: object
      required:
        - title
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 200

    UpdateTodoRequest:
      type: object
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 200
        completed:
          type: boolean

    TodoFilter:
      type: object
      properties:
        status:
          type: string
          enum: [all, active, completed]
        ids:
          type: array
          items:
            type: string
            format: uuid

    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          description: 错误代码
        message:
          type: string
          description: 错误信息
        details:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
```

---

## TypeScript 类型生成

生成文件: `src/types/api.ts`

```typescript
/**
 * 自动生成自 OpenAPI 规范
 * 生成时间: 2026-03-27T12:00:00Z
 * 生成命令: /stdd-api-spec --typescript
 */

export interface Todo {
  /** Todo 唯一标识 */
  id: string;
  /** Todo 标题 */
  title: string;
  /** 是否完成 */
  completed: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt?: string;
}

export interface CreateTodoRequest {
  title: string;
}

export interface UpdateTodoRequest {
  title?: string;
  completed?: boolean;
}

export interface TodoFilter {
  status?: 'all' | 'active' | 'completed';
  ids?: string[];
}

export interface Error {
  code: string;
  message: string;
  details?: Array<{
    field?: string;
    message?: string;
  }>;
}

// API 响应类型
export type GetTodosResponse = Todo[];
export type CreateTodoResponse = Todo;
export type GetTodoResponse = Todo;
export type UpdateTodoResponse = Todo;
export type ExportTodosResponse = string | object;
```

---

## 代码生成

### 生成 API 客户端
```bash
# 生成 fetch 客户端
/stdd-api-spec generate client --style=fetch

# 生成 axios 客户端
/stdd-api-spec generate client --style=axios
```

生成文件: `src/services/TodoService.ts`

```typescript
import type {
  Todo,
  CreateTodoRequest,
  UpdateTodoRequest,
  GetTodosResponse
} from '../types/api';

const API_BASE = '/api';

export class TodoService {
  /**
   * GET /todos
   * 获取所有 Todo
   */
  async getTodos(status?: 'all' | 'active' | 'completed'): Promise<GetTodosResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await fetch(`${API_BASE}/todos?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch todos: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * POST /todos
   * 创建新 Todo
   */
  async createTodo(data: CreateTodoRequest): Promise<Todo> {
    const response = await fetch(`${API_BASE}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create todo: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * GET /todos/{id}
   * 获取单个 Todo
   */
  async getTodo(id: string): Promise<Todo> {
    const response = await fetch(`${API_BASE}/todos/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Todo not found');
      }
      throw new Error(`Failed to fetch todo: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * PATCH /todos/{id}
   * 更新 Todo
   */
  async updateTodo(id: string, data: UpdateTodoRequest): Promise<Todo> {
    const response = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Todo not found');
      }
      throw new Error(`Failed to update todo: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * DELETE /todos/{id}
   * 删除 Todo
   */
  async deleteTodo(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Todo not found');
      }
      throw new Error(`Failed to delete todo: ${response.statusText}`);
    }
  }

  /**
   * POST /todos/export
   * 导出 Todo 为 Markdown
   */
  async exportTodos(format: 'markdown' | 'json' | 'csv' = 'markdown'): Promise<string> {
    const response = await fetch(`${API_BASE}/todos/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    });
    if (!response.ok) {
      throw new Error(`Failed to export todos: ${response.statusText}`);
    }
    return response.text();
  }
}

export const todoService = new TodoService();
```

---

## 与 STDD 工作流集成

```
/stdd-spec
    │
    └──► 生成 BDD 规格
            │
            ▼
/stdd-api-spec ─────────────────────────────┐
    │                                         │
    ├──► 生成 OpenAPI 规范      │
    │                                         │
    ├──► 生成 TypeScript 类型                  │
    │                                         │
    └──► 生成 API 客户端代码                   │
            │                                 │
            ▼                                 │
/stdd-plan                                  │
    │                                         │
    └──► 任务拆解时引用 API 规范 ◄─────────────┘
            │
            ▼
/stdd-execute
    │
    └──► 实现代码自动符合 API 规范
```

---

## 规范验证

### 检查规范与实现一致性
```bash
/stdd-api-spec validate --impl=src/
```

输出:
```
🔍 API 规范一致性验证

✅ GET /todos - 实现与规范一致
✅ POST /todos - 实现与规范一致
⚠️ GET /todos/{id} - 响应类型略有差异
   规范: Todo
   实现: Todo | null
   建议: 调整为 404 响应

❌ DELETE /todos/{id} - 实现缺失
   建议: 实现此端点

覆盖率: 80% (4/5 端点已实现)
```

---

## 配置

在 `.stdd/memory/api-spec-config.json` 中：

```json
{
  "openapi": {
    "version": "3.1.0",
    "outputPath": "docs/api/openapi.yaml",
    "servers": [
      { "url": "http://localhost:3000/api", "description": "开发" },
      { "url": "https://api.example.com", "description": "生产" }
    ]
  },
  "typescript": {
    "outputPath": "src/types/api.ts",
    "generateClient": true,
    "clientStyle": "fetch"
  },
  "validation": {
    "validateOnCommit": true,
    "strictMode": true
  }
}
```

---

> **引用**: 借鉴自 OpenAPI Specification 和 API-First Design 原则
