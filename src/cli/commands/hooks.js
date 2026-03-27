/**
 * STDD CLI - Hooks Command
 * 管理 Claude Code Hook 系统
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 获取 settings.json 路径
 */
function getSettingsPath(global = false) {
  if (global) {
    return path.join(os.homedir(), '.claude', 'settings.json');
  }
  return path.join(process.cwd(), '.claude', 'settings.json');
}

/**
 * 读取当前 settings
 */
function readSettings(settingsPath) {
  if (!fs.existsSync(settingsPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch (error) {
    return {};
  }
}

/**
 * 写入 settings
 */
function writeSettings(settingsPath, settings) {
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

/**
 * 获取 STDD hooks 脚本路径
 */
function getSTDDHooksPath() {
  // 尝试多个可能的位置
  const possiblePaths = [
    path.join(__dirname, '..', '..', '..', '.claude', 'hooks'),
    path.join(process.cwd(), '.claude', 'hooks'),
    path.join(os.homedir(), 'stdd-copilot', '.claude', 'hooks')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * 生成 hooks 配置
 */
function generateHooksConfig(hooksPath, options = {}) {
  const config = {
    hooks: {
      PreToolUse: [
        {
          matcher: "Edit|Write",
          hooks: [
            {
              type: "command",
              command: `node ${path.join(hooksPath, 'pre-file-write.js')}`
            }
          ]
        }
      ],
      PostToolUse: [
        {
          matcher: "Edit|Write",
          hooks: [
            {
              type: "command",
              command: `node ${path.join(hooksPath, 'post-file-write.js')}`
            }
          ]
        }
      ]
    }
  };

  // 如果指定了只启用部分 hooks
  if (options.articles) {
    // 可以根据 articles 过滤
  }

  return config;
}

/**
 * 安装 hooks
 */
function installHooks(options) {
  const { global = false, force = false } = options;

  console.log('\n🔧 STDD Hooks 安装\n');

  // 检查 hooks 脚本
  const hooksPath = getSTDDHooksPath();
  if (!hooksPath) {
    console.log('❌ 错误: 找不到 STDD hooks 脚本');
    console.log('   请确保 STDD Copilot 已正确安装');
    return false;
  }

  console.log(`📁 Hooks 脚本位置: ${hooksPath}`);

  // 检查目标配置
  const settingsPath = getSettingsPath(global);
  console.log(`📝 配置文件: ${settingsPath}`);

  const existingSettings = readSettings(settingsPath);

  if (existingSettings.hooks && !force) {
    console.log('\n⚠️  配置文件已包含 hooks 配置');
    console.log('   使用 --force 覆盖现有配置');
    return false;
  }

  // 生成配置
  const hooksConfig = generateHooksConfig(hooksPath, options);

  // 合并配置
  const newSettings = {
    ...existingSettings,
    ...hooksConfig
  };

  // 写入配置
  writeSettings(settingsPath, newSettings);

  console.log('\n✅ Hooks 安装成功!\n');
  console.log('已安装的 Hooks:');
  console.log('  • PreToolUse: Article 2, 4, 7 (TDD, Style, Security)');
  console.log('  • PostToolUse: Article 5, 6, 8 (Docs, Errors, Performance)');
  console.log('\n配置位置: ' + settingsPath);
  console.log('\n验证安装: stdd hooks verify');
  console.log('禁用 Hooks: stdd hooks disable');

  return true;
}

/**
 * 验证 hooks 安装
 */
function verifyHooks(options) {
  const { global = false } = options;

  console.log('\n🔍 验证 STDD Hooks 安装\n');

  const settingsPath = getSettingsPath(global);
  const settings = readSettings(settingsPath);

  let allOk = true;

  // 检查 PreToolUse
  if (settings.hooks?.PreToolUse) {
    console.log('✅ PreToolUse Hook: 已配置');
  } else {
    console.log('❌ PreToolUse Hook: 未配置');
    allOk = false;
  }

  // 检查 PostToolUse
  if (settings.hooks?.PostToolUse) {
    console.log('✅ PostToolUse Hook: 已配置');
  } else {
    console.log('❌ PostToolUse Hook: 未配置');
    allOk = false;
  }

  // 检查脚本文件
  const hooksPath = getSTDDHooksPath();
  if (hooksPath) {
    const preScript = path.join(hooksPath, 'pre-file-write.js');
    const postScript = path.join(hooksPath, 'post-file-write.js');

    if (fs.existsSync(preScript)) {
      console.log('✅ pre-file-write.js: 存在');
    } else {
      console.log('❌ pre-file-write.js: 不存在');
      allOk = false;
    }

    if (fs.existsSync(postScript)) {
      console.log('✅ post-file-write.js: 存在');
    } else {
      console.log('❌ post-file-write.js: 不存在');
      allOk = false;
    }
  } else {
    console.log('❌ Hooks 脚本目录: 不存在');
    allOk = false;
  }

  console.log('');
  if (allOk) {
    console.log('✅ 所有 Hooks 验证通过!');
  } else {
    console.log('❌ 部分验证失败，请运行: stdd hooks install');
  }

  return allOk;
}

/**
 * 禁用 hooks
 */
function disableHooks(options) {
  const { global = false, article = null } = options;

  console.log('\n⏸️  禁用 STDD Hooks\n');

  const settingsPath = getSettingsPath(global);
  const settings = readSettings(settingsPath);

  if (!settings.hooks) {
    console.log('⚠️  没有已配置的 Hooks');
    return true;
  }

  if (article) {
    // 禁用特定条例
    console.log(`禁用 Article ${article} 检查...`);
    // 实际实现需要修改 hook 脚本逻辑
    console.log('⚠️  部分禁用暂不支持，建议设置环境变量:');
    console.log(`   STDD_HOOKS_DISABLED=1`);
  } else {
    // 完全禁用
    const backupPath = settingsPath + '.backup';
    fs.copyFileSync(settingsPath, backupPath);
    console.log(`📦 备份配置到: ${backupPath}`);

    delete settings.hooks;
    writeSettings(settingsPath, settings);

    console.log('✅ Hooks 已禁用');
    console.log('\n恢复: mv ' + backupPath + ' ' + settingsPath);
  }

  return true;
}

/**
 * 启用 hooks
 */
function enableHooks(options) {
  const { global = false } = options;

  console.log('\n▶️  启用 STDD Hooks\n');

  // 检查备份
  const settingsPath = getSettingsPath(global);
  const backupPath = settingsPath + '.backup';

  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, settingsPath);
    fs.unlinkSync(backupPath);
    console.log('✅ 从备份恢复成功');
  } else {
    // 重新安装
    return installHooks({ ...options, force: true });
  }

  return true;
}

/**
 * 显示 hooks 状态
 */
function statusHooks(options) {
  const { global = false } = options;

  console.log('\n📊 STDD Hooks 状态\n');

  const settingsPath = getSettingsPath(global);
  const settings = readSettings(settingsPath);

  console.log(`配置文件: ${settingsPath}`);
  console.log('');

  if (settings.hooks) {
    console.log('Hooks 配置:');

    if (settings.hooks.PreToolUse) {
      console.log('  PreToolUse:');
      settings.hooks.PreToolUse.forEach(hook => {
        console.log(`    • Matcher: ${hook.matcher}`);
        hook.hooks.forEach(h => {
          console.log(`      Command: ${h.command}`);
        });
      });
    }

    if (settings.hooks.PostToolUse) {
      console.log('  PostToolUse:');
      settings.hooks.PostToolUse.forEach(hook => {
        console.log(`    • Matcher: ${hook.matcher}`);
        hook.hooks.forEach(h => {
          console.log(`      Command: ${h.command}`);
        });
      });
    }

    console.log('\n状态: ✅ 已启用');
  } else {
    console.log('状态: ⏸️  未配置');
    console.log('\n运行: stdd hooks install');
  }

  return true;
}

/**
 * 导出命令处理函数
 */
module.exports = function(program) {
  const hooks = program.command('hooks')
    .description('管理 STDD Hook 系统');

  // 安装
  hooks.command('install')
    .description('安装 STDD Hooks')
    .option('-g, --global', '安装到全局配置')
    .option('-f, --force', '强制覆盖现有配置')
    .option('--articles <list>', '指定要启用的条例 (逗号分隔)')
    .action((options) => {
      installHooks(options);
    });

  // 验证
  hooks.command('verify')
    .description('验证 Hooks 安装')
    .option('-g, --global', '验证全局配置')
    .action((options) => {
      const result = verifyHooks(options);
      process.exit(result ? 0 : 1);
    });

  // 禁用
  hooks.command('disable')
    .description('禁用 Hooks')
    .option('-g, --global', '禁用全局配置')
    .option('--article <n>', '禁用特定条例')
    .action((options) => {
      disableHooks(options);
    });

  // 启用
  hooks.command('enable')
    .description('启用 Hooks')
    .option('-g, --global', '启用全局配置')
    .action((options) => {
      enableHooks(options);
    });

  // 状态
  hooks.command('status')
    .description('显示 Hooks 状态')
    .option('-g, --global', '显示全局状态')
    .action((options) => {
      statusHooks(options);
    });
};
