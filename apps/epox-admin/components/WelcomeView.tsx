'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Layers, Zap, Image } from 'lucide-react';
import { colors } from '@/lib/styles/common-styles';
import { buildTestId } from '@/lib/utils/test-ids';
import styles from './WelcomeView.module.scss';

interface WelcomeViewProps {
  onAddClient?: () => void;
}

export function WelcomeView({ onAddClient }: WelcomeViewProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <Sparkles style={{ width: '40px', height: '40px', color: colors.indigo[400] }} />
        </div>
        <h1 className={styles.title}>Welcome to Scenergy Visualizer</h1>
        <p className={styles.subtitle}>Your creative partner for generating stunning product visuals with AI.</p>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🚀 Get Started:</h2>
          <div className={styles.list}>
            <div className={styles.listItem}>
              <div className={styles.badge}>1</div>
              <span className={styles.listText}>
                {isMobile
                  ? 'Tap the menu (☰) to open navigation and manage clients.'
                  : 'Open the navigation panel to view and manage your clients.'}
              </span>
            </div>
            <div className={styles.listItem}>
              <div className={styles.badge}>2</div>
              <span className={styles.listText}>
                Create a client, then add products with base images (PNG with transparency or reference photos).
              </span>
            </div>
            <div className={styles.listItem}>
              <div className={styles.badge}>3</div>
              <span className={styles.listText}>
                Start a session to generate visuals for a single product, or create a client session for multiple products at once.
              </span>
            </div>
            <div className={styles.listItem}>
              <div className={styles.badge}>4</div>
              <span className={styles.listText}>
                Use the prompt builder {isMobile ? '(hammer icon)' : 'on the right'} to configure settings, then describe your scene!
              </span>
            </div>
          </div>
        </div>
        {onAddClient && (
          <div className={styles.buttonWrapper}>
            <button className={styles.primaryButton} onClick={onAddClient} data-testid={buildTestId('welcome', 'create-client')}>
              <Plus size={20} />
              Create Your First Client
            </button>
          </div>
        )}

        {isMobile && (
          <div className={styles.mobileWarning}>
            <p className={styles.mobileWarningText}>
              📱 Mobile tip: Use the hamburger menu (☰) to navigate. For the best experience, we recommend tablets or desktops.
            </p>
          </div>
        )}

        <div className={styles.tipSection}>
          <div className={styles.tip}>
            <h3 className={styles.tipTitle}>
              <Layers size={16} />
              Multi-Product Sessions
            </h3>
            <p className={styles.tipText}>
              Create client sessions to generate images for multiple products simultaneously with consistent settings.
            </p>
          </div>

          <div className={styles.tip}>
            <h3 className={styles.tipTitle}>
              <Image size={16} />
              Inspiration Images
            </h3>
            <p className={styles.tipText}>
              Upload inspiration images in the chat to guide the AI's style and composition for better results.
            </p>
          </div>

          <div className={styles.tip}>
            <h3 className={styles.tipTitle}>
              <Zap size={16} />
              Quick Actions
            </h3>
            <p className={styles.tipText}>Use the star icon to favorite images, and the download button to save multiple images at once.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
