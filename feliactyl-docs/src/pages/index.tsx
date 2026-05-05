import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const features = [
  {
    icon: '🪙',
    title: 'Coin Economy',
    desc: 'AFK earning, Linkvertise, gifting, referrals, and Stripe real-money purchases.',
  },
  {
    icon: '🖥️',
    title: 'Server Management',
    desc: 'Users create, modify, and delete Pterodactyl servers without admin access.',
  },
  {
    icon: '🛍️',
    title: 'Resource Store',
    desc: 'Buy RAM, Disk, CPU, and server slots with coins. Configurable pricing.',
  },
  {
    icon: '🛡️',
    title: 'Security',
    desc: 'Discord OAuth2, 2FA, IP firewall, Anti-VPN, AbuseIPDB, geo-blocking.',
  },
  {
    icon: '⚙️',
    title: 'Admin Panel',
    desc: 'Manage users, plans, coupons, audit logs, firewall rules, and all settings from the UI.',
  },
  {
    icon: '⚡',
    title: 'Microservices',
    desc: 'PM2 cluster with background economy workers, health endpoints, and graceful scaling.',
  },
];

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>v2.2.0</div>
          <h1 className={styles.heroTitle}>Feliactyl</h1>
          <p className={styles.heroSubtitle}>
            Self-hosted client dashboard for <strong>Pterodactyl</strong>.<br />
            Coin economy, resource store, Discord OAuth2, and a powerful admin panel.
          </p>
          <div className={styles.heroButtons}>
            <Link className={styles.btnPrimary} to="/docs/installation">
              🚀 Get Started
            </Link>
            <Link className={styles.btnSecondary} to="/docs/intro">
              📖 Read Docs
            </Link>
            <Link className={styles.btnOutline} href="https://github.com/notcaliper/Feliactyl">
              GitHub
            </Link>
          </div>
          <div className={styles.statsBar}>
            <div className={styles.statItem}><span className={styles.statNum}>v2.2.0</span><span className={styles.statLabel}>Latest</span></div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}><span className={styles.statNum}>MIT</span><span className={styles.statLabel}>License</span></div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}><span className={styles.statNum}>Node 20</span><span className={styles.statLabel}>Required</span></div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}><span className={styles.statNum}>Pterodactyl</span><span className={styles.statLabel}>Compatible</span></div>
          </div>
        </div>
      </header>

      {/* Features */}
      <main className={styles.featuresSection}>
        <p className={styles.sectionLabel}>Everything you need</p>
        <h2 className={styles.sectionTitle}>Built for hosting providers</h2>
        <div className={styles.featuresGrid}>
          {features.map(({icon, title, desc}) => (
            <div key={title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{icon}</div>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Quick install CTA */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>One-command install</h2>
        <pre className={styles.ctaCode}>
          bash &lt;(curl -s https://raw.githubusercontent.com/notcaliper/Feliactyl/v2-features/install.sh)
        </pre>
        <Link className={styles.btnPrimary} to="/docs/installation">
          Full Installation Guide →
        </Link>
      </section>
    </Layout>
  );
}
