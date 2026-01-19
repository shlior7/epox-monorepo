/**
 * Invitation Service Types
 */

export interface InvitationTokenPayload {
  invitationId: string;
  email: string;
  clientId: string;
  clientName: string;
  inviterName: string;
  role?: string;
  expiresAt: number; // Unix timestamp
}

export interface CreateInvitationRequest {
  clientId: string;
  email: string;
  role?: string;
  inviterId: string;
  inviterName: string;
  clientName: string;
  expiresInDays?: number;
}

export interface AcceptInvitationRequest {
  token: string;
  name: string;
  password: string;
}

export interface InvitationDetails {
  id: string;
  email: string;
  clientId: string;
  clientName: string;
  inviterName: string;
  role: string | null;
  expiresAt: Date;
  isValid: boolean;
}



