type ClientMessage =
  | { type: "client/hello"; name: string }
  | { type: string; [key: string]: unknown };

type RequestPayload = {
  action: "createMatch" | "joinMatch";
  matchId?: string;
  lengthMinutes?: 10 | 20 | 30;
};

type RequestResponse = {
  ok?: boolean;
  matchId?: string;
  error?: string;
};

/**
 * @param baseUrl - Omit or pass "" to call same-origin `/api/match` (Next.js route).
 *  Use e.g. `http://localhost:8787` only if you run a separate match API server.
 */
export function connectClient(baseUrl = "") {
  const matchPath = baseUrl.trim() === "" ? "/api/match" : `${baseUrl.replace(/\/$/, "")}/api/match`;

  async function request(payload: RequestPayload): Promise<RequestResponse> {
    const response = await fetch(matchPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed: ${response.status}`);
    }

    return (await response.json()) as RequestResponse;
  }

  return {
    send(_message: ClientMessage) {
      // Placeholder for future realtime transport.
    },
    async createMatch(lengthMinutes: 10 | 20 | 30) {
      const data = await request({ action: "createMatch", lengthMinutes });
      if (!data.matchId) throw new Error(data.error || "Missing matchId from createMatch");
      return { matchId: data.matchId };
    },
    async joinMatch(matchId: string) {
      const data = await request({ action: "joinMatch", matchId });
      if (data.ok === false) throw new Error(data.error || "Unable to join match");
      return { ok: true };
    },
  };
}
