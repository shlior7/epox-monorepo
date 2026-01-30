import {
  type TranzilaConfig,
  type ChargeParams,
  type ChargeResult,
  ChargeResultSchema,
  type RefundParams,
  type RefundResult,
  RefundResultSchema,
  type PaymentRequestParams,
  type PaymentRequestResult,
  PaymentRequestResultSchema,
  type TokenIframeParams,
  TranzilaError,
  TRANZILA_RESPONSE_CODES,
} from "./types.js";

const DEFAULT_IFRAME_BASE_URL = "https://direct.tranzila.com";
const DEFAULT_CGI_BASE_URL = "https://secure5.tranzila.com";
const DEFAULT_API_BASE_URL = "https://api.tranzila.com";

/**
 * Client for interacting with the Tranzila payment gateway.
 *
 * Supports:
 * - Tokenization iframe URL generation
 * - Token-based charging via CGI endpoint
 * - Refunds via CGI endpoint
 * - Payment request creation via API V2
 */
export class TranzilaClient {
  private readonly config: Required<
    Pick<TranzilaConfig, "terminalName" | "apiAppKey" | "transactionPassword">
  > & {
    iframeBaseUrl: string;
    cgiBaseUrl: string;
    apiBaseUrl: string;
  };

  constructor(config: TranzilaConfig) {
    this.config = {
      terminalName: config.terminalName,
      apiAppKey: config.apiAppKey,
      transactionPassword: config.transactionPassword,
      iframeBaseUrl: config.iframeBaseUrl ?? DEFAULT_IFRAME_BASE_URL,
      cgiBaseUrl: config.cgiBaseUrl ?? DEFAULT_CGI_BASE_URL,
      apiBaseUrl: config.apiBaseUrl ?? DEFAULT_API_BASE_URL,
    };
  }

  /**
   * Returns the tokenization iframe URL.
   * Embed this URL in an iframe for the user to enter card details.
   * The iframe returns a TranzilaTK token via postMessage.
   */
  getIframeUrl(params?: TokenIframeParams): string {
    const base = `${this.config.iframeBaseUrl}/${this.config.terminalName}/iframe.php`;
    const searchParams = new URLSearchParams({ tranmode: "VK" });
    if (params?.lang) {
      searchParams.set("lang", params.lang);
    }
    return `${base}?${searchParams.toString()}`;
  }

  /**
   * Charge a token obtained from the tokenization iframe.
   * Posts form-encoded data to the CGI endpoint.
   *
   * @throws {TranzilaError} if the response code is not '000' (success)
   */
  async chargeToken(params: ChargeParams): Promise<ChargeResult> {
    const body = new URLSearchParams({
      supplier: this.config.terminalName,
      TranzilaPW: this.config.transactionPassword,
      TranzilaTK: params.token,
      sum: params.sum.toString(),
      currency: params.currency.toString(),
      expdate: params.expdate,
    });

    if (params.credType) {
      body.set("cred_type", params.credType);
    }
    if (params.payments !== undefined) {
      body.set("fpay", params.payments.toString());
    }
    if (params.firstPayment !== undefined) {
      body.set("spay", params.firstPayment.toString());
    }
    if (params.additionalParams) {
      for (const [key, value] of Object.entries(params.additionalParams)) {
        body.set(key, value);
      }
    }

    const url = `${this.config.cgiBaseUrl}/cgi-bin/tranzila31tk.cgi`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const responseText = await response.text();
    const parsed = parseCgiResponse(responseText);
    const result = ChargeResultSchema.parse(parsed);

    if (result.Response !== "000") {
      const description =
        TRANZILA_RESPONSE_CODES[result.Response] ??
        `Unknown error (code: ${result.Response})`;
      throw new TranzilaError(result.Response, description);
    }

    return result;
  }

  /**
   * Refund a previous charge.
   * Posts form-encoded data to the CGI endpoint with CreditPass action.
   *
   * @throws {TranzilaError} if the response code is not '000' (success)
   */
  async refund(params: RefundParams): Promise<RefundResult> {
    const body = new URLSearchParams({
      supplier: this.config.terminalName,
      TranzilaPW: this.config.transactionPassword,
      TranzilaTK: params.token,
      sum: params.sum.toString(),
      currency: params.currency.toString(),
      expdate: params.expdate,
      Rone: "true",
      Authnr: params.authnr,
    });

    if (params.additionalParams) {
      for (const [key, value] of Object.entries(params.additionalParams)) {
        body.set(key, value);
      }
    }

    const url = `${this.config.cgiBaseUrl}/cgi-bin/tranzila31tk.cgi`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const responseText = await response.text();
    const parsed = parseCgiResponse(responseText);
    const result = RefundResultSchema.parse(parsed);

    if (result.Response !== "000") {
      const description =
        TRANZILA_RESPONSE_CODES[result.Response] ??
        `Unknown error (code: ${result.Response})`;
      throw new TranzilaError(result.Response, description);
    }

    return result;
  }

  /**
   * Create a payment request via the Tranzila API V2.
   * This creates a hosted payment page URL as an alternative to iframe tokenization.
   *
   * @throws {TranzilaError} if the API returns an error
   */
  async createPaymentRequest(
    params: PaymentRequestParams
  ): Promise<PaymentRequestResult> {
    const url = `${this.config.apiBaseUrl}/v1/pr/create`;

    const requestBody: Record<string, unknown> = {
      terminal_name: this.config.terminalName,
      sum: params.sum,
      currency: params.currency,
    };

    if (params.description) requestBody.description = params.description;
    if (params.email) requestBody.email = params.email;
    if (params.phone) requestBody.phone = params.phone;
    if (params.name) requestBody.name = params.name;
    if (params.callbackUrl) requestBody.callback_url = params.callbackUrl;
    if (params.successUrl) requestBody.success_url = params.successUrl;
    if (params.failUrl) requestBody.fail_url = params.failUrl;
    if (params.tokenize !== undefined) requestBody.tokenize = params.tokenize;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-tranzila-api-app-key": this.config.apiAppKey,
      },
      body: JSON.stringify(requestBody),
    });

    const json = await response.json();
    const result = PaymentRequestResultSchema.parse(json);

    if (!result.success) {
      throw new TranzilaError(
        "PR_ERROR",
        result.error ?? "Payment request creation failed"
      );
    }

    return result;
  }
}

/**
 * Parse a CGI query-string-encoded response into a key-value object.
 * Tranzila CGI endpoints return responses in the format: key1=value1&key2=value2
 */
function parseCgiResponse(responseText: string): Record<string, string> {
  const result: Record<string, string> = {};
  const trimmed = responseText.trim();
  if (!trimmed) return result;

  const pairs = trimmed.split("&");
  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) {
      result[decodeURIComponent(pair)] = "";
    } else {
      const key = decodeURIComponent(pair.slice(0, eqIndex));
      const value = decodeURIComponent(pair.slice(eqIndex + 1));
      result[key] = value;
    }
  }

  return result;
}
