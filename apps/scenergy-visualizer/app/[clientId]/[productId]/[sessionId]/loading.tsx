/**
 * Loading state for session page
 */

import { buildTestId } from '../../../../lib/utils/test-ids';

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(99, 102, 241, 0.2)',
    borderTop: '4px solid rgb(99, 102, 241)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default function Loading() {
  return (
    <div style={styles.container} data-testid={buildTestId('loading', 'session-page')}>
      <div style={styles.spinner} />
    </div>
  );
}
