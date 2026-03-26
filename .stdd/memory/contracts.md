# 接口契约与类型定义簿 (Contracts)

**初始化时间:** 2026-03-26

## 用途

此文件用于定义项目中的公共接口、数据结构和类型契约。在 TDD 执行过程中，即使某个微任务只读取单个文件，也能通过此契约文件了解模块间的数据交互规范。

## 契约格式

```typescript
// 示例：Todo 模块契约
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoService {
  getAll(): Promise<Todo[]>;
  add(title: string): Promise<Todo>;
  toggle(id: string): Promise<void>;
  remove(id: string): Promise<void>;
}
```

## 当前状态

*等待首次执行 `/stdd-plan` 节点后，根据架构设计填充具体契约...*

---

> **注意**: 此文件由 STDD Copilot 自动维护，请勿手动删除。
