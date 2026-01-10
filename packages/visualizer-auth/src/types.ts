import type { auth } from './server';

// Session includes both user and session data (per better-auth docs)
export type Session = typeof auth.$Infer.Session;
export type User = Session['user'];

// Organization plugin types - may not be available depending on plugin configuration
export type Organization = typeof auth.$Infer.Organization;
export type Member = typeof auth.$Infer.Member;
