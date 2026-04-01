// STDD Docs Site - Astro + Starlight 配置模板
// 由 /stdd-docs generate 自动生成

import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: process.env.SITE_URL || 'https://localhost:4321',

  integrations: [
    starlight({
      title: 'STDD Copilot',
      description: 'Specification & Test-Driven Development Framework',

      // 默认语言
      defaultLocale: 'zh',
      locales: {
        zh: { label: '中文' },
        en: { label: 'English', lang: 'en' },
      },

      // 侧边栏（由 generate 命令自动填充）
      sidebar: [
        {
          label: '快速开始',
          items: [
            { label: '安装', slug: 'zh/getting-started' },
            { label: '核心概念', slug: 'zh/concepts' },
          ],
        },
        {
          label: 'CLI 参考',
          items: [
            { label: '命令指南', slug: 'zh/cli-guide' },
            { label: '全部命令', slug: 'zh/commands' },
          ],
        },
        {
          label: '工作流',
          items: [
            { label: '完整工作流', slug: 'zh/workflows' },
          ],
        },
        {
          label: 'Getting Started',
          items: [
            { label: 'Installation', slug: 'en/getting-started' },
            { label: 'CLI Guide', slug: 'en/cli-guide' },
          ],
        },
      ],

      // 搜索
      search: true,

      // 自定义样式
      customCss: ['./src/styles/custom.css'],

      // 社交链接
      social: {
        github: 'https://github.com/Marcher-lam/stdd-copilot',
      },
    }),
  ],
});
