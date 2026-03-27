# /stdd:verify - 验证规范一致性

检查代码实现与规格定义是否一致。

## 使用方式

```
/stdd:verify                     # 验证当前变更
/stdd:verify --all              # 验证所有变更
/stdd:verify --spec=auth.feature # 验证特定规格
/stdd:verify --fix              # 自动修复不一致
```

## 验证维度

| 维度 | 检查项 | 说明 |
|------|--------|------|
| **接口一致性** | API 签名 | 方法名、参数、返回值 |
| **行为一致性** | BDD 场景 | Given/When/Then 是否实现 |
| **类型一致性** | TypeScript/Zod | 类型定义与运行时一致 |
| **边界条件** | 边界处理 | 空值、异常、边界值 |
| **文档一致性** | 注释/文档 | 代码注释与规格匹配 |

## 验证报告

```
📊 验证报告: change-20260327-143052

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 接口一致性 (5/5)
  ✅ UserService.login()
  ✅ UserService.logout()
  ✅ UserService.refresh()
  ✅ TokenManager.generate()
  ✅ TokenManager.validate()

⚠️ 行为一致性 (3/4)
  ✅ 登录成功场景
  ✅ 登录失败场景
  ❌ 并发登录场景 - 未实现
  ✅ Token 过期场景

✅ 类型一致性 (8/8)
  ✅ User 类型定义
  ✅ Token 类型定义
  ... (6 more)

⚠️ 边界条件 (2/3)
  ✅ 空用户名处理
  ❌ 超长密码处理 - 缺失
  ✅ 特殊字符处理

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

总体验证: ⚠️ 部分通过 (90%)
发现 2 个不一致项需要修复
```

## 与其他命令集成

```
/stdd:apply → /stdd:verify → /stdd:archive
```
