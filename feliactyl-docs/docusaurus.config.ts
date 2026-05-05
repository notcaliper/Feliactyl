import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Feliactyl Docs',
  tagline: 'Self-hosted client dashboard for Pterodactyl',
  favicon: 'img/feliactyl-logo.png',

  future: {
    v4: true,
  },

  url: 'https://notcaliper.github.io',
  baseUrl: '/',

  organizationName: 'notcaliper',
  projectName: 'Feliactyl',

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/notcaliper/Feliactyl/tree/v2-features/feliactyl-docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/feliactyl-logo.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Feliactyl',
      logo: {
        alt: 'Feliactyl Logo',
        src: 'img/feliactyl-logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/notcaliper/Feliactyl',
          label: 'GitHub',
          position: 'right',
        },

        {
          href: 'https://discord.gg/N7C2nbYpQf',
          label: 'Discord',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'Installation', to: '/docs/installation' },
            { label: 'Configuration', to: '/docs/configuration' },
            { label: 'Migration Guide', to: '/docs/migration' },
          ],
        },
        {
          title: 'Features',
          items: [
            { label: 'Coin Economy', to: '/docs/features/economy' },
            { label: 'Security', to: '/docs/features/security' },
            { label: 'Admin Panel', to: '/docs/features/admin' },
            { label: 'System Requirements', to: '/docs/requirements' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'Discord', href: 'https://discord.gg/N7C2nbYpQf' },
            { label: 'GitHub Issues', href: 'https://github.com/notcaliper/Feliactyl/issues' },
            { label: 'Discussions', href: 'https://github.com/notcaliper/Feliactyl/discussions' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: 'https://github.com/notcaliper/Feliactyl' },
            { label: 'Releases', href: 'https://github.com/notcaliper/Feliactyl/releases' },
            { label: 'Contributing', href: 'https://github.com/notcaliper/Feliactyl/blob/v2-features/CONTRIBUTING.md' },
            { label: 'License (MIT)', href: 'https://github.com/notcaliper/Feliactyl/blob/v2-features/LICENSE' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://github.com/notcaliper" target="_blank">notcaliper</a>. Released under the MIT License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
