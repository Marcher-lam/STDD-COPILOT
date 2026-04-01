---
name: stdd-outside-in
description: |
  外向内 TDD - E2E → 集成 → 单元 层层推进
  触发场景：用户说 '/stdd-outside-in', 'outside-in', '外向内', 'E2E优先', '由外向内'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---
# STDD 外向内 TDD (/stdd-outside-in)

## 目标
实现 **Outside-In TDD (London School)**，从外层（E2E 测试）开始，逐步向内（单元测试）推进，确保功能从用户视角正确工作。

---

## 核心理念

```
传统 TDD (Inside-Out):
  单元测试 → 集成测试 → E2E 测试
  (可能错过用户视角)

Outside-In TDD:
  E2E 测试 → 集成测试 → 单元测试
  (从用户视角开始，确保功能可用)
```

---

## 测试金字塔 (Outside-In)

```
                    ┌─────────┐
                    │  E2E    │  1. 先写 E2E 测试 (用户视角)
                    │  Tests  │     验证完整用户流程
                    └────┬────┘
                         │
              ┌──────────┴──────────┐
              │    Integration      │  2. 再写集成测试
              │       Tests         │     验证模块协作
              └──────────┬──────────┘
                         │
         ┌───────────────┴───────────────┐
         │        Unit Tests              │  3. 最后写单元测试
         │    (最深层的细节验证)           │     验证独立逻辑
         └───────────────────────────────┘
```

---

## 使用方式

### 启动 Outside-In 模式
```bash
/stdd-outside-in
```

### 指定起始层级
```bash
# 从 E2E 开始 (默认)
/stdd-outside-in --start=e2e

# 从集成层开始
/stdd-outside-in --start=integration

# 仅运行到指定层级
/stdd-outside-in --stop-at=unit
```

### 查看进度
```bash
/stdd-outside-in status
```

---

## 执行流程

### 第一步: E2E 测试先行

生成 E2E 测试文件: `tests/e2e/todo-export.feature`

```gherkin
Feature: Todo Markdown Export (E2E)

  Background:
    Given I am on the todo list page
    And I have created the following todos:
      | title        | completed |
      | Buy milk     | false     |
      | Walk dog     | true      |
      | Read book    | false     |

  @e2e @outside-in-level-1
  Scenario: Export todos as Markdown file
    When I click the "Export" button
    And I select "Markdown" format
    Then a file should be downloaded
    And the file content should contain:
      """
      - [ ] Buy milk
      - [x] Walk dog
      - [ ] Read book
      """

  @e2e @outside-in-level-1
  Scenario: Export empty list
    Given I have no todos
    When I click the "Export" button
    Then a file should be downloaded
    And the file content should be empty
```

**E2E 测试结果**: 🔴 红灯 (实现缺失)

---

### 第二步: 识别缺失组件

```
🔍 Outside-In 分析

E2E 测试失败，缺失以下组件:

前端层:
  ❌ ExportButton 组件
  ❌ ExportFormatSelector 组件
  ❌ exportMarkdown 函数

服务层:
  ❌ ExportService
  ❌ TodoService.getCompletedCount

依赖:
  ↓ ExportButton 依赖
  ↓ ExportService 依赖
  ↓ TodoService

建议实现顺序:
  1. TodoService (单元层)
  2. ExportService (单元层)
  3. exportMarkdown (单元层)
  4. 集成测试验证
  5. ExportButton + FormatSelector (前端组件)
  6. E2E 测试验证
```

---

### 第三步: 单元测试驱动

自动生成单元测试: `src/__tests__/services/ExportService.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ExportService } from '../../services/ExportService';
import type { Todo } from '../../types/todo.types';

describe('ExportService', () => {
  const exportService = new ExportService();

  describe('exportMarkdown', () => {
    it('should export empty list as empty markdown', () => {
      const result = exportService.exportMarkdown([]);
      expect(result).toBe('');
    });

    it('should export uncompleted todo with unchecked checkbox', () => {
      const todos: Todo[] = [
        { id: '1', title: 'Buy milk', completed: false, createdAt: new Date() },
      ];

      const result = exportService.exportMarkdown(todos);

      expect(result).toContain('- [ ] Buy milk');
    });

    it('should export completed todo with checked checkbox', () => {
      const todos: Todo[] = [
        { id: '1', title: 'Walk dog', completed: true, createdAt: new Date() },
      ];

      const result = exportService.exportMarkdown(todos);

      expect(result).toContain('- [x] Walk dog');
    });

    it('should export multiple todos on separate lines', () => {
      const todos: Todo[] = [
        { id: '1', title: 'Task 1', completed: false, createdAt: new Date() },
        { id: '2', title: 'Task 2', completed: true, createdAt: new Date() },
        { id: '3', title: 'Task 3', completed: false, createdAt: new Date() },
      ];

      const result = exportService.exportMarkdown(todos);

      expect(result).toContain('- [ ] Task 1');
      expect(result).toContain('- [x] Task 2');
      expect(result).toContain('- [ ] Task 3');
    });

    it('should handle special characters in title', () => {
      const todos: Todo[] = [
        { id: '1', title: 'Buy <special> & "chars"', completed: false, createdAt: new Date() },
      ];

      const result = exportService.exportMarkdown(todos);

      expect(result).toContain('Buy <special> & "chars"');
    });
  });

  describe('download', () => {
    it('should trigger file download with correct filename', () => {
      const content = '# My Todos';
      const filename = 'todos.md';

      // Mock download
      const mockClick = vi.fn();
      const mockAnchor = { click: mockClick, href: '' };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

      exportService.download(content, filename);

      expect(mockClick).toHaveBeenCalled();
    });
  });
});
```

**单元测试结果**: 🔴 红灯 (ExportService 未实现)

---

### 第四步: 实现最小代码

实现文件: `src/services/ExportService.ts`

```typescript
import type { Todo } from '../types/todo.types';

export class ExportService {
  /**
   * 将 Todo 列表导出为 Markdown 格式
   */
  exportMarkdown(todos: Todo[]): string {
    if (todos.length === 0) {
      return '';
    }

    return todos
      .map(todo => {
        const checkbox = todo.completed ? '[x]' : '[ ]';
        return `- ${checkbox} ${todo.title}`;
      })
      .join('\n');
  }

  /**
   * 触发文件下载
   */
  download(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    URL.revokeObjectURL(url);
  }
}
```

**单元测试结果**: 🟢 绿灯

---

### 第五步: 集成测试

集成测试: `src/__tests__/integration/todo-export.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TodoService } from '../../services/TodoService';
import { ExportService } from '../../services/ExportService';

describe('Todo Export Integration', () => {
  let todoService: TodoService;
  let exportService: ExportService;

  beforeEach(() => {
    todoService = new TodoService();
    exportService = new ExportService();
  });

  it('should export todos from TodoService', async () => {
    // 创建 Todos
    await todoService.create('Task 1');
    await todoService.create('Task 2');
    await todoService.toggleComplete('1'); // 完成第一个

    // 获取并导出
    const todos = await todoService.getAll();
    const markdown = exportService.exportMarkdown(todos);

    // 验证
    expect(markdown).toContain('- [x] Task 1');
    expect(markdown).toContain('- [ ] Task 2');
  });

  it('should handle empty todo list export', async () => {
    const todos = await todoService.getAll();
    const markdown = exportService.exportMarkdown(todos);

    expect(markdown).toBe('');
  });
});
```

**集成测试结果**: 🟢 绿灯

---

### 第六步: E2E 验证

```
🔄 回到 E2E 测试

运行: tests/e2e/todo-export.feature

✅ Scenario: Export todos as Markdown file
✅ Scenario: Export empty list

E2E 测试结果: 🟢 绿灯
```

---

## 进度可视化

```bash
/stdd-outside-in status
```

输出:
```
📊 Outside-In TDD 进度

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 E2E 层 (1/2 通过)
├── ✅ Export todos as Markdown file
└── ⏳ Export with custom filename

🟡 集成层 (1/1 通过)
└── ✅ Todo Export Integration

🟢 单元层 (5/5 通过)
├── ✅ exportMarkdown - empty list
├── ✅ exportMarkdown - unchecked
├── ✅ exportMarkdown - checked
├── ✅ exportMarkdown - multiple
└── ✅ download - triggers file download

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 整体进度: 7/8 (87%)

当前层级: E2E (最外层)
待完成: Export with custom filename

下一步:
1. 添加 E2E 测试: custom filename 场景
2. 扩展 ExportService 支持 filename 参数
```

---

## 与 STDD 工作流集成

```
/stdd-spec
    │
    └──► 生成 BDD 规格
            │
            ▼
/stdd-outside-in
    │
    ├──► 1. 生成 E2E 测试 (红灯)
    │
    ├──► 2. 识别缺失组件
    │
    ├──► 3. 生成单元测试 (红灯)
    │
    ├──► 4. 实现最小代码 (绿灯)
    │
    ├──► 5. 集成测试 (绿灯)
    │
    └──► 6. E2E 验证 (绿灯)
            │
            ▼
/stdd-commit
```

---

## 配置

在 `stdd/memory/outside-in-config.json` 中：

<!-- 配置 Schema: 参见 schemas/shared/skill-config-schema.json -->

```json
{
  "levels": ["e2e", "integration", "unit"],
  "startLevel": "e2e",
  "autoProgress": true,
  "e2e": {
    "framework": "playwright",
    "testDir": "tests/e2e",
    "browsers": ["chromium", "firefox", "webkit"],
    "headless": true,
    "baseUrl": "http://localhost:3000",
    "auto_setup": {
      "detect_playwright": true,
      "generate_config": true,
      "install_browsers": false
    }
  },
  "integration": {
    "framework": "vitest",
    "testDir": "src/__tests__/integration"
  },
  "unit": {
    "framework": "vitest",
    "testDir": "src/__tests__"
  }
}
```

### E2E 浏览器集成

E2E 层支持以下浏览器测试框架：

| 框架 | 配置命令 | 支持浏览器 |
|------|----------|------------|
| Playwright | `npx playwright install` | Chromium, Firefox, WebKit |
| Cypress | `npx cypress open` | Chrome, Firefox, Edge |
| Puppeteer | `npm install puppeteer` | Chrome/Chromium |

**自动检测**：`stdd-outside-in` 启动时自动扫描 `package.json` 中的依赖，选择已安装的 E2E 框架。

**E2E 测试模板**（Playwright）：
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature: Todo List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should add a new todo', async ({ page }) => {
    // Given: 用户在 Todo 页面
    // When: 输入标题并点击添加
    await page.fill('[data-testid="todo-input"]', 'Buy milk');
    await page.click('[data-testid="add-button"]');

    // Then: 新 Todo 出现在列表中
    await expect(page.locator('[data-testid="todo-list"]')).toContainText('Buy milk');
  });
});
```

---

> **引用**: 借鉴自 London School TDD (Outside-In) 和 Growing Object-Oriented Software
