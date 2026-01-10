import type { PropsWithChildren, ReactNode } from 'react';

interface SectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function Section({ title, description, action, children }: PropsWithChildren<SectionProps>) {
  return (
    <section
      style={{
        background: 'rgba(15, 23, 42, 0.55)',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: '18px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backdropFilter: 'blur(12px)'
      }}
    >
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'flex-start',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{title}</h2>
          {description ? (
            <p style={{ marginTop: '6px', marginBottom: 0, color: 'rgba(226, 232, 240, 0.8)', fontSize: '0.95rem' }}>
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div>{action}</div> : null}
      </header>
      {children}
    </section>
  );
}
