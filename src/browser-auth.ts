/**
 * Shared browser-based OAuth login for CarsXE tools.
 *
 * Any Node.js integration (CLI, Gemini extension, MCP server, …) can call
 * browserLogin() to open the browser, perform the PKCE flow, and get back the
 * user's API key — without the user having to copy-paste anything.
 *
 * The underlying web endpoints are:
 *   GET  {baseUrl}/cli-auth          — browser page the user sees
 *   POST {baseUrl}/api/auth/cli/complete — browser-side: stores the session
 *   POST {baseUrl}/api/auth/cli/status  — polled by this function
 */

import * as crypto from "crypto";

const DEFAULT_BASE_URL = "https://api.carsxe.com";
// ─── Local development ───────────────────────────────────────────────────────
// To test the login flow locally, change DEFAULT_BASE_URL to your local server:
//   const DEFAULT_BASE_URL = "http://localhost:3000";
// Remember to revert before committing.
// ─────────────────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 3_000;
const TIMEOUT_MS = 5 * 60 * 1_000;
// Abort after this many consecutive errors (network failures, non-JSON
// responses, unexpected HTTP status codes) rather than polling until timeout.
const MAX_CONSECUTIVE_ERRORS = 5;

export interface BrowserLoginOptions {
  /**
   * Override the base URL. Defaults to https://api.carsxe.com.
   * Useful for local development: set to "http://localhost:3000".
   */
  baseUrl?: string;
  /**
   * Called once the browser URL is ready, before polling begins.
   * Implementations should open the URL in a browser and print a message.
   */
  onOpen: (url: string) => Promise<void> | void;
  /**
   * Optional: called on each poll tick so callers can show a progress indicator.
   */
  onPoll?: () => void;
}

export interface BrowserLoginResult {
  apiKey: string;
  teamName: string;
}

function pkce(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

/**
 * Opens the CarsXE web app in the user's browser for authorization and polls
 * until the user completes sign-in. Returns the API key and team name on
 * success, or throws if the flow times out or encounters an error.
 */
export async function browserLogin(
  options: BrowserLoginOptions,
): Promise<BrowserLoginResult> {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");

  const sessionId = crypto.randomBytes(32).toString("hex");
  const { codeVerifier, codeChallenge } = pkce();

  const authUrl =
    `${baseUrl}/cli-auth` +
    `?code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&source=cli` +
    `#session_id=${sessionId}`;

  await options.onOpen(authUrl);

  const pollUrl = `${baseUrl}/api/auth/cli/status`;
  const deadline = Date.now() + TIMEOUT_MS;
  let consecutiveErrors = 0;

  while (Date.now() < deadline) {
    await new Promise<void>((res) => setTimeout(res, POLL_INTERVAL_MS));
    options.onPoll?.();

    let res: Response;
    try {
      res = await fetch(pollUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          code_verifier: codeVerifier,
        }),
      });
    } catch (err) {
      // Transient network error — count and retry.
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw new Error(
          `Unable to reach ${pollUrl} after ${MAX_CONSECUTIVE_ERRORS} attempts. ` +
            "Check your network connection and try again.",
        );
      }
      continue;
    }

    // A non-2xx response that isn't a transient 5xx means something is wrong
    // with the endpoint (e.g. 404 = not deployed yet, 401 = bad request).
    if (!res.ok && res.status < 500) {
      let detail = "";
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) detail = ` — ${body.error}`;
      } catch {
        /* body is not JSON */
      }
      throw new Error(
        `Login endpoint returned HTTP ${res.status}${detail}. ` +
          "Make sure you are using the latest version of this tool.",
      );
    }

    // 5xx or parse failure — transient, keep polling.
    let data: { status?: string; apiKey?: string; teamName?: string };
    try {
      data = (await res.json()) as typeof data;
      consecutiveErrors = 0; // reset on any successful parse
    } catch {
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw new Error(
          `Received ${MAX_CONSECUTIVE_ERRORS} unparseable responses from ${pollUrl}. ` +
            "Make sure you are using the latest version of this tool.",
        );
      }
      continue;
    }

    if (data?.status === "complete" && data.apiKey) {
      return {
        apiKey: data.apiKey,
        teamName: data.teamName ?? "your team",
      };
    }
  }

  throw new Error(
    "Login timed out after 5 minutes. " +
      "Please try again or set your API key manually: https://api.carsxe.com/dashboard/developer",
  );
}
