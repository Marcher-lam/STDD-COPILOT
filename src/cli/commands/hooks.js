/**
 * STDD CLI - Hooks Command
 * 管理 AI Code Hook 系统 (支持多引擎环境)
 */

const fs = require('fs');
const path = require('path');
const { getPackageRoot } = require('../../utils/path-resolver');
const os = require('os');
const chalk = require('chalk');

const enginesConfig = require('../../config/engines.json');
const ALL_SUPPORTED_AGENTS = enginesConfig.engines.map(e => e.value);

/**
 * 智能嗅探当前环境，获取所有存活终端的 settings.json 路径
 */
function getSettingsPaths(global = false) {
  const baseDir = global ? os.homedir() : process.cwd();
  
  try {
    const items = fs.readdirSync(baseDir);
    const activeAgents = ALL_SUPPORTED_AGENTS.filter(agent => items.includes(agent));
    
    // 如果没有任何引擎，fallback到配置中选中的主要配置
    if (activeAgents.length === 0) {
      const defaultEngine = enginesConfig.engines.find(e => e.checked) || enginesConfig.engines[0];
    return [path.join(baseDir, defaultEngine.value, 'settings.json')];
    }
    
    return activeAgents.map(agent => path.join(baseDir, agent, 'settings.json'));
  } catch(e) {
    const enginesConfig = require('../../config/engines.json');
      const defaultEngine = enginesConfig.engines.find(e => e.checked) || enginesConfig.engines[0];
      return [path.join(baseDir, defaultEngine.value, 'settings.json')];
  }
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
 * 获取 STDD hooks 脚本路径 (全局同一入口)
 */
function getSTDDHooksPath() {
  const possiblePaths = [
    ...enginesConfig.engines.map(e => path.join(getPackageRoot(), e.value, 'hooks')), // 源码目录
    ...enginesConfig.engines.map(e => path.join(process.cwd(), e.value, 'hooks')),               // 项目目录兼容
    ...enginesConfig.engines.map(e => path.join(os.homedir(), 'stdd-copilot', e.value, 'hooks')) // 全局链接兼容
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
          hooks: [{ type: "command", command: `node ${path.join(hooksPath, 'pre-file-write.js')}` }]
        }
      ],
      PostToolUse: [
        {
          matcher: "Edit|Write",
          hooks: [{ type: "command", command: `node ${path.join(hooksPath, 'post-file-write.js')}` }]
        }
      ]
    }
  };
  return config;
}

/**
 * 安装 hooks
 */
function installHooks(options) {
  const { global = false, force = false } = options;

  console.log(chalk.bold('\n🔧 STDD Hooks 安装 (Multi-Agent Adaptation)\n'));

  const hooksPath = getSTDDHooksPath();
  if (!hooksPath) {
    console.log(chalk.red('❌ 错误: 找不到 STDD hooks 脚本'));
    return false;
  }
  console.log(`📁 Hooks 脚本位置: ${hooksPath}`);

  const settingsPaths = getSettingsPaths(global);
  
  let successCount = 0;

  for (const settingsPath of settingsPaths) {
    console.log(chalk.cyan(`\n🎯 检测到目标引擎配置: ${settingsPath}`));
    const existingSettings = readSettings(settingsPath);

    if (existingSettings.hooks && !force) {
      console.log(chalk.yellow('   ⚠️ 配置文件已包含 hooks 配置 (跳过)'));
      continue;
    }

    const hooksConfig = generateHooksConfig(hooksPath, options);
    const newSettings = { ...existingSettings, ...hooksConfig };
    
    writeSettings(settingsPath, newSettings);
    console.log(chalk.green('   ✅ Hooks 注入成功!'));
    successCount++;
  }

  if (successCount > 0) {
    console.log(chalk.bold('\n✅ Multi-Agent Hooks 安装完成!\n'));
    console.log('已拦截的方法集:');
    console.log('  • PreToolUse: Article 2, 4, 7 (TDD, Style, Security)');
    console.log('  • PostToolUse: Article 5, 6, 8 (Docs, Errors, Performance)');
    console.log('\n验证安装: stdd hooks verify');
  }

  return true;
}

/**
 * 验证 hooks 安装
 */
function verifyHooks(options) {
  const { global = false } = options;
  console.log(chalk.bold('\n🔍 验证 STDD Hooks 安装\n'));

  const settingsPaths = getSettingsPaths(global);
  let allOk = true;

  for (const settingsPath of settingsPaths) {
    console.log(chalk.cyan(`\n📂 检查引擎: ${settingsPath}`));
    const settings = readSettings(settingsPath);

    if (settings.hooks?.PreToolUse) {
      console.log(chalk.green('  ✅ PreToolUse Hook: 已配置'));
    } else {
      console.log(chalk.red('  ❌ PreToolUse Hook: 未配置'));
      allOk = false;
    }

    if (settings.hooks?.PostToolUse) {
      console.log(chalk.green('  ✅ PostToolUse Hook: 已配置'));
    } else {
      console.log(chalk.red('  ❌ PostToolUse Hook: 未配置'));
      allOk = false;
    }
  }

  const hooksPath = getSTDDHooksPath();
  if (hooksPath) {
    console.log(chalk.cyan('\n📜 检查脚本文件'));
    if (fs.existsSync(path.join(hooksPath, 'pre-file-write.js'))) {
      console.log(chalk.green('  ✅ pre-file-write.js: 存在'));
    } else {
      console.log(chalk.red('  ❌ pre-file-write.js: 不存在'));
      allOk = false;
    }

    if (fs.existsSync(path.join(hooksPath, 'post-file-write.js'))) {
      console.log(chalk.green('  ✅ post-file-write.js: 存在'));
    } else {
      console.log(chalk.red('  ❌ post-file-write.js: 不存在'));
      allOk = false;
    }
  } else {
    console.log(chalk.red('\n❌ Hooks 脚本目录: 不存在'));
    allOk = false;
  }

  console.log('');
  if (allOk) {
    console.log(chalk.green('✅ 该环境下所有引擎Hooks验证通过!'));
  } else {
    console.log(chalk.red('❌ 部分验证失败，请运行: stdd hooks install --force'));
  }

  return allOk;
}

/**
 * 禁用 hooks
 */
function disableHooks(options) {
  const { global = false, article = null } = options;
  console.log(chalk.bold('\n⏸️  禁用 STDD Hooks\n'));

  const settingsPaths = getSettingsPaths(global);
  
  if (article) {
    console.log(chalk.yellow('⚠️ 部分禁用暂不支持，建议设置环境变量: STDD_HOOKS_DISABLED=1'));
    return true;
  }

  for (const settingsPath of settingsPaths) {
    const settings = readSettings(settingsPath);
    if (!settings.hooks) continue;

    const backupPath = settingsPath + '.backup';
    fs.copyFileSync(settingsPath, backupPath);
    console.log(chalk.green(`📦 [备份] ${backupPath}`));

    delete settings.hooks;
    writeSettings(settingsPath, settings);
    console.log(chalk.green(`✅ [禁用] ${settingsPath}`));
  }
  return true;
}

/**
 * 启用 hooks
 */
function enableHooks(options) {
  const { global = false } = options;
  console.log(chalk.bold('\n▶️  启用 STDD Hooks\n'));

  const settingsPaths = getSettingsPaths(global);
  
  for (const settingsPath of settingsPaths) {
    const backupPath = settingsPath + '.backup';
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, settingsPath);
      fs.unlinkSync(backupPath);
      console.log(chalk.green(`✅ [恢复] ${settingsPath}`));
    } else {
      installHooks({ ...options, force: true });
    }
  }
  return true;
}

/**
 * 显示 hooks 状态
 */
function statusHooks(options) {
  const { global = false } = options;
  console.log(chalk.bold('\n📊 STDD Hooks 状态\n'));

  const settingsPaths = getSettingsPaths(global);
  
  for (const settingsPath of settingsPaths) {
    console.log(chalk.cyan(`\n🔧 引擎配置: ${settingsPath}`));
    const settings = readSettings(settingsPath);

    if (settings.hooks) {
      console.log(chalk.green('  状态: ✅ 已启用'));
    } else {
      console.log(chalk.yellow('  状态: ⏸️  未配置'));
    }
  }
  return true;
}

/**
 * 导出命令处理函数
 */
module.exports = function(program) {
  const hooks = program.command('hooks')
    .description('管理 STDD Hook 系统 (多引擎适配版)');

  hooks.command('install')
    .description('自动嗅探并安装 STDD Hooks 到所有活跃引擎')
    .option('-g, --global', '安装到全局配置')
    .option('-f, --force', '强制覆盖现有配置')
    .action((options) => installHooks(options));

  hooks.command('verify')
    .description('验证各个引擎内的 Hooks 安装')
    .option('-g, --global', '验证全局配置')
    .action((options) => { process.exit(verifyHooks(options) ? 0 : 1); });

  hooks.command('disable')
    .description('禁用选定范围内的 Hooks')
    .option('-g, --global', '禁用全局配置')
    .option('--article <n>', '禁用特定条例')
    .action((options) => disableHooks(options));

  hooks.command('enable')
    .description('恢复并启用 Hooks')
    .option('-g, --global', '启用全局配置')
    .action((options) => enableHooks(options));

  hooks.command('status')
    .description('显示所有支持引擎的 Hooks 状态')
    .option('-g, --global', '显示全局状态')
    .action((options) => statusHooks(options));
};
