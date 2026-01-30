import { z } from "zod";

// ─── Configuration ───────────────────────────────────────────────────────────

export interface TranzilaConfig {
  /** Terminal name from Tranzila merchant dashboard */
  terminalName: string;
  /** API application key for V2 endpoints */
  apiAppKey: string;
  /** Transaction password for CGI endpoint authentication */
  transactionPassword: string;
  /** Base URL for tokenization iframe (default: https://direct.tranzila.com) */
  iframeBaseUrl?: string;
  /** Base URL for CGI charge/refund endpoint (default: https://secure5.tranzila.com) */
  cgiBaseUrl?: string;
  /** Base URL for API V2 endpoints (default: https://api.tranzila.com) */
  apiBaseUrl?: string;
}

// ─── Currency ────────────────────────────────────────────────────────────────

export enum TranzilaCurrency {
  ILS = 1,
  USD = 2,
  EUR = 3,
  GBP = 4,
}

// ─── Token Creation (iframe-based) ──────────────────────────────────────────

export interface TokenIframeParams {
  /** Language for the iframe (e.g., "il" for Hebrew, "us" for English) */
  lang?: string;
}

// ─── Charge ─────────────────────────────────────────────────────────────────

export interface ChargeParams {
  /** Token returned from iframe tokenization */
  token: string;
  /** Amount to charge */
  sum: number;
  /** Currency code */
  currency: TranzilaCurrency;
  /** Card expiration date in MMYY format */
  expdate: string;
  /** Credit type for installments (optional, default is regular charge) */
  credType?: string;
  /** Number of installments (if credType is set) */
  payments?: number;
  /** First payment amount (if installments) */
  firstPayment?: number;
  /** Additional parameters to pass to the CGI endpoint */
  additionalParams?: Record<string, string>;
}

/** Zod schema for parsing the CGI query-string response for charges */
export const ChargeResultSchema = z.object({
  Response: z.string(),
  ConfirmationCode: z.string().optional(),
  index: z.string().optional(),
  Rone: z.string().optional(),
  Tempref: z.string().optional(),
  Responsesource: z.string().optional(),
  CVVResponse: z.string().optional(),
  Merchantresponse: z.string().optional(),
});

export type ChargeResult = z.infer<typeof ChargeResultSchema>;

// ─── Refund ─────────────────────────────────────────────────────────────────

export interface RefundParams {
  /** Authorization number from original charge (ConfirmationCode) */
  authnr: string;
  /** Amount to refund */
  sum: number;
  /** Currency code */
  currency: TranzilaCurrency;
  /** Card expiration date in MMYY format */
  expdate: string;
  /** Token from original transaction */
  token: string;
  /** Additional parameters to pass to the CGI endpoint */
  additionalParams?: Record<string, string>;
}

/** Zod schema for parsing the CGI query-string response for refunds */
export const RefundResultSchema = z.object({
  Response: z.string(),
  ConfirmationCode: z.string().optional(),
  index: z.string().optional(),
  Tempref: z.string().optional(),
  Responsesource: z.string().optional(),
});

export type RefundResult = z.infer<typeof RefundResultSchema>;

// ─── Payment Request (API V2) ───────────────────────────────────────────────

export interface PaymentRequestParams {
  /** Payment amount */
  sum: number;
  /** Currency code (1=ILS, 2=USD, etc.) */
  currency: TranzilaCurrency;
  /** Description of the payment */
  description?: string;
  /** Payer email address */
  email?: string;
  /** Payer phone number */
  phone?: string;
  /** Payer name */
  name?: string;
  /** Callback URL after payment completes */
  callbackUrl?: string;
  /** Success redirect URL */
  successUrl?: string;
  /** Failure redirect URL */
  failUrl?: string;
  /** Whether to tokenize the card for future charges */
  tokenize?: boolean;
}

/** Zod schema for the API V2 payment request response (JSON) */
export const PaymentRequestResultSchema = z.object({
  success: z.boolean(),
  payment_request_url: z.string().optional(),
  payment_request_id: z.string().optional(),
  error: z.string().optional(),
});

export type PaymentRequestResult = z.infer<typeof PaymentRequestResultSchema>;

// ─── Error ──────────────────────────────────────────────────────────────────

export class TranzilaError extends Error {
  public readonly responseCode: string;
  public readonly description: string;

  constructor(responseCode: string, description: string) {
    super(`Tranzila error ${responseCode}: ${description}`);
    this.name = "TranzilaError";
    this.responseCode = responseCode;
    this.description = description;
  }
}

/** Map of common Tranzila response codes to descriptions */
export const TRANZILA_RESPONSE_CODES: Record<string, string> = {
  "000": "Transaction approved",
  "001": "Blocked card",
  "002": "Stolen card",
  "003": "Contact card company",
  "004": "Decline",
  "005": "Forged card",
  "006": "CVV/ID error",
  "010": "Partial approval",
  "014": "Invalid card number",
  "033": "Expired card",
  "036": "Card restricted",
  "039": "Invalid card number",
  "060": "Issuer error",
  "062": "Restricted transaction",
  "065": "Exceeds withdrawal limit",
};
