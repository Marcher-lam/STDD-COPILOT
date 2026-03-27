---
description: 生成用户测试脚本（人类测试脚本 + AI 代理测试脚本）
---

# STDD 用户测试向导 (/stdd-user-test)

## 目标
从用户旅程生成双轨测试脚本：
1. **人类测试脚本** - 用于真人用户测试
2. **AI 代理测试脚本** - 可执行的自动化测试

---

## 理论依据

Nielsen Norman Group 研究表明：测试 **3-5 个用户** 就能发现 **65-85%** 的可用性问题。

推荐策略： **小批量迭代** → 测试 → 修复 → 再测试

---

## 步骤

### 1. 检查用户旅程

- 读取 `04_tasks.md` 中的用户故事
- 如果没有用户旅程，提示用户先运行 `/stdd-plan`

### 2. 生成人类测试脚本

创建 `plan/human-test-script.md`:

```markdown
# 用户测试脚本 - [功能名称]

## 测试目标
验证 [功能] 是否满足用户需求

## 测试前准备
- [ ] 测试环境已部署
- [ ] 测试账号已创建
- [ ] 屏幕录制工具已准备

## 测试用户画像
| 编号 | 角色 | 背景 |
|------|------|------|
| U1 | 产品经理 | 每天使用协作工具 |
| U2 | 开发者 | 关注效率 |

## 测试任务

### 任务 1: [任务描述]

**场景**: 你是一个 [角色]，需要 [目标]

**步骤**:
1. [具体操作]
2. [具体操作]
3. ...

**预期结果**:
- [ ] [预期行为]

**思考 aloud 提示**:
- "你在想什么？"
- "为什么这样做？"
- "有什么困惑？"

**记录**:
- 完成时间: ___ 分钟
- 困惑点: ___
- 建议: ___

---

## 测试后问卷

1. 整体体验评分 (1-5): ___
2. 最喜欢的功能: ___
3. 最困惑的地方: ___
4. 改进建议: ___
```

### 3. 生成 AI 代理测试脚本

创建 `plan/agent-test-script.md`:

```markdown
# AI 代理测试脚本 - [功能名称]

## 测试配置

```yaml
base_url: http://localhost:3000
screenshot_dir: ./screenshots
persona: product_manager
```

## 测试用例

### TC-001: [测试用例名称]

**前置条件**:
- 用户已登录
- 项目已创建

**步骤**:
```typescript
// 1. 导航到功能页面
await page.goto('/todos');
await screenshot('01-todos-page.png');

// 2. 创建新任务
await page.click('[data-testid="add-task-btn"]');
await page.fill('[data-testid="task-title"]', '测试任务');
await screenshot('02-task-created.png');

// 3. 验证任务已添加
const task = await page.$('[data-testid="task-item"]');
expect(task).toBeVisible();
await screenshot('03-task-visible.png');
```

**预期结果**:
- 任务出现在列表中
- 任务标题为 "测试任务"

---

### TC-002: [下一个测试用例]
...
```

### 4. 保存测试脚本

- 人类脚本: `.stdd/active_feature/plan/human-test-script.md`
- AI 脚本: `.stdd/active_feature/plan/agent-test-script.md`

### 5. 生成执行命令

```bash
# 运行 AI 代理测试
/stdd-run-test agent-test-script.md
```

---

## 使用方式

```bash
# 生成用户测试脚本
/stdd-user-test

# 指定用户旅程文件
/stdd-user-test plan/story-map/user-journey.yaml

# 运行 AI 代理测试
/stdd-run-test plan/agent-test-script.md
```

---

## 与 TDD 的关系

```
用户测试脚本
    ↓
发现可用性问题
    ↓
转化为 BDD 场景
    ↓
添加到 02_bdd_specs.feature
    ↓
TDD 实现
```

---

## 示例

### 输入 (用户旅程)

```yaml
journey: 创建并导出 Todo 列表
persona: 产品经理
steps:
  - 打开应用
  - 创建 3 个 Todo
  - 点击导出按钮
  - 选择 Markdown 格式
  - 验证文件下载
```

### 输出 (AI 代理测试)

```typescript
// TC-001: 创建并导出 Todo 列表

describe('Todo 导出功能', () => {
  let page;

  beforeAll(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
  });

  test('应该能创建 Todo 并导出为 Markdown', async () => {
    // 创建 3 个 Todo
    for (let i = 1; i <= 3; i++) {
      await page.click('[data-testid="add-todo"]');
      await page.fill('[data-testid="todo-title"]', `Task ${i}`);
      await page.press('Enter');
    }

    // 验证 Todo 已添加
    const todos = await page.$$('[data-testid="todo-item"]');
    expect(todos).toHaveLength(3);

    // 导出为 Markdown
    await page.click('[data-testid="export-btn"]');
    await page.click('[data-testid="export-markdown"]');

    // 验证下载
    const download = await page.waitForEvent('download');
    expect(download).toBeTruthy();
  });
});
```

---

> **调用方式**：在 `/stdd-execute` 完成后，运行 `/stdd-user-test` 生成用户测试脚本。
