const fs = require('fs');
const path = require('path');

const SUPPORTED_AGENTS = [
  '.claude',
  '.qwen',
  '.cursor',
  '.codex',
  '.kiro',
  '.codebuddy',
  '.vscode',
  '.openclaw',
  '.antigravity',
  '.opencode'
];

const initJsPath = '/Users/marcher/Desktop/stdd-copliot/src/cli/commands/init.js';
let initContent = fs.readFileSync(initJsPath, 'utf8');

// Replace the manual directory creation with a dynamic loop
const createDirsRegex = /async createDirectories[\s\S]*?async createAgentsMd/m;
const newCreateDirs = `async createDirectories(targetPath) {
    const baseDirs = [
      'stdd',
      'stdd/specs',
      'stdd/changes',
      'stdd/changes/archive',
      'stdd/memory',
      'stdd/graph',
      'stdd/explorations'
    ];

    const supportedAgents = ${JSON.stringify(SUPPORTED_AGENTS, null, 6)};

    for (const dir of baseDirs) {
      await fs.mkdir(path.join(targetPath, dir), { recursive: true });
    }

    for (const agent of supportedAgents) {
      await fs.mkdir(path.join(targetPath, agent, 'commands', 'stdd'), { recursive: true });
      await fs.mkdir(path.join(targetPath, agent, 'skills'), { recursive: true });
    }
  }

  async createAgentsMd`;
initContent = initContent.replace(createDirsRegex, newCreateDirs);

// Replace the manual copy logic with dynamic loop in init.js
const copyCommandsRegex = /async copyClaudeCommands[\s\S]*?async copySchemas/m;
const newCopyCommands = `async copyClaudeCommands(targetPath) {
    const sourceDir = path.join(__dirname, '..', '..', '..', '.claude', 'commands', 'stdd');
    const supportedAgents = ${JSON.stringify(SUPPORTED_AGENTS, null, 6)};

    for (const agent of supportedAgents) {
      const targetDir = path.join(targetPath, agent, 'commands', 'stdd');
      await this.copyDirContents(sourceDir, targetDir);
    }
  }

  async copyDirContents(sourceDir, targetDir) {
    if (await this.exists(sourceDir)) {
      await fs.mkdir(targetDir, { recursive: true });
      const files = await fs.readdir(sourceDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(sourceDir, file), 'utf-8');
          await fs.writeFile(path.join(targetDir, file), content);
        }
      }
    }
  }

  async copySchemas`;
initContent = initContent.replace(copyCommandsRegex, newCopyCommands);

fs.writeFileSync(initJsPath, initContent, 'utf8');
console.log('init.js updated for multi-agent support');

// Update update.js
const updateJsPath = '/Users/marcher/Desktop/stdd-copliot/src/cli/commands/update.js';
let updateContent = fs.readFileSync(updateJsPath, 'utf8');

const updateCommandsRegex = /async updateClaudeCommands[\s\S]*?async updateSchemas/m;
const newUpdateCommands = `async updateClaudeCommands(targetPath, force) {
    const sourceDir = path.join(__dirname, '..', '..', '..', '.claude', 'commands', 'stdd');
    const supportedAgents = ${JSON.stringify(SUPPORTED_AGENTS, null, 6)};

    for (const agent of supportedAgents) {
      const targetDir = path.join(targetPath, agent, 'commands', 'stdd');
      await this.updateDirContents(sourceDir, targetDir, force);
    }
  }

  async updateDirContents(sourceDir, targetDir, force) {
    if (await this.exists(sourceDir)) {
      await fs.mkdir(targetDir, { recursive: true });
      const files = await fs.readdir(sourceDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const targetFile = path.join(targetDir, file);
          if (!await this.exists(targetFile) || force) {
            const content = await fs.readFile(path.join(sourceDir, file), 'utf-8');
            await fs.writeFile(targetFile, content);
          }
        }
      }
    }
  }

  async updateSchemas`;
updateContent = updateContent.replace(updateCommandsRegex, newUpdateCommands);

fs.writeFileSync(updateJsPath, updateContent, 'utf8');
console.log('update.js updated for multi-agent support');
