# Visualizer Services

Shared non-AI business logic services for the visualizer platform. For Gemini/AI
features (generation, analysis, queue facade, rate limiting), use `visualizer-ai`.

## Features

- Invitations (token creation and verification)
- Email templates and delivery helpers
- Quota management
- Notification preferences
- User settings defaults
- Inspiration image utilities
- Flow orchestration helpers

## Installation

```bash
yarn add visualizer-services
```

## Usage

```typescript
import { getInvitationService, createQuotaService } from 'visualizer-services';

const invites = getInvitationService();
const token = await invites.generateToken({
  invitationId: 'inv-123',
  email: 'user@example.com',
  clientId: 'client-1',
  clientName: 'Demo',
  inviterName: 'Admin',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

const quota = createQuotaService({
  getUsage: async () => 0,
  incrementUsage: async () => undefined,
  getClientPlan: async () => 'free',
});

await quota.getQuotaStatus('client-1');
```

## Services

- InvitationService
- EmailService
- NotificationService
- QuotaService
- UserSettingsService
- InspirationService
- FlowOrchestrationService

## License

Private - Internal use only
