/**
 * Loading state for client session page
 */

import { buildTestId } from '../../../../lib/utils/test-ids';

export default function Loading() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 0,
        padding: '24px',
      }}
      data-testid={buildTestId('loading', 'client-session-page')}
    >
      <span style={{ fontSize: '1.1rem', color: '#94a3b8' }}>Loading multi-product session...</span>
    </div>
  );
}
