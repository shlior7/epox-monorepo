/**
 * Invitation Service
 * Handles invitation creation, token generation/validation, and acceptance
 */

import { SignJWT, jwtVerify } from 'jose';
import type {
  InvitationTokenPayload
} from './types';

export interface InvitationServiceConfig {
  jwtSecret: string;
  baseUrl: string;
}

export class InvitationService {
  private readonly secret: Uint8Array;
  private readonly baseUrl: string;

  constructor(config: InvitationServiceConfig) {
    this.secret = new TextEncoder().encode(config.jwtSecret);
    this.baseUrl = config.baseUrl;
  }

  /**
   * Generate a signed JWT token for an invitation
   */
  async generateToken(payload: InvitationTokenPayload): Promise<string> {
    const token = await new SignJWT({
      invitationId: payload.invitationId,
      email: payload.email,
      clientId: payload.clientId,
      clientName: payload.clientName,
      inviterName: payload.inviterName,
      role: payload.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(payload.expiresAt)
      .sign(this.secret);

    return token;
  }

  /**
   * Verify and decode an invitation token
   */
  async verifyToken(token: string): Promise<InvitationTokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);

      return {
        invitationId: payload.invitationId as string,
        email: payload.email as string,
        clientId: payload.clientId as string,
        clientName: payload.clientName as string,
        inviterName: payload.inviterName as string,
        role: payload.role as string | undefined,
        expiresAt: payload.exp!,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate the full invitation URL
   */
  generateInvitationUrl(token: string): string {
    return `${this.baseUrl}/signup?token=${encodeURIComponent(token)}`;
  }

  /**
   * Calculate expiration date from days
   */
  calculateExpiresAt(daysFromNow = 7): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysFromNow);
    return expiresAt;
  }

  /**
   * Check if an invitation is expired
   */
  isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }
}

// Singleton instance
let _invitationService: InvitationService | null = null;

export function getInvitationService(): InvitationService {
  if (!_invitationService) {
    const jwtSecret = process.env.JWT_SECRET ?? process.env.INVITATION_JWT_SECRET;
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL) ?? 'http://localhost:3000';

    if (!jwtSecret) {
      throw new Error('JWT_SECRET or INVITATION_JWT_SECRET environment variable is required');
    }

    _invitationService = new InvitationService({
      jwtSecret,
      baseUrl,
    });
  }

  return _invitationService;
}

export function resetInvitationService(): void {
  _invitationService = null;
}


