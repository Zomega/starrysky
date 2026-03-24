import {
  StreakDataProvider,
  StreakSummary,
  StreakDetail,
  StreakStatus,
} from "../data-provider.js";

export class AppViewDataProvider extends StreakDataProvider {
  constructor(private baseUrl: string = "http://localhost:3000") {
    super();
  }

  private async xrpcCall(method: string, params: Record<string, any>) {
    const url = new URL(`/xrpc/${method}`, this.baseUrl);
    Object.keys(params).forEach((key) => {
      if (Array.isArray(params[key])) {
        params[key].forEach((val: any) => url.searchParams.append(key, val));
      } else {
        url.searchParams.append(key, params[key]);
      }
    });

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`XRPC call failed: ${res.statusText}`);
    }
    return res.json();
  }

  async getProfileStreaks(actor: string): Promise<StreakSummary[]> {
    const data = await this.xrpcCall("app.starrysky.streak.getProfileStreaks", {
      actor,
    });
    return data.streaks;
  }

  async getStreakDetail(
    actor: string,
    subject: string,
    policyUri: string,
  ): Promise<StreakDetail> {
    return this.xrpcCall("app.starrysky.streak.getStreakDetail", {
      actor,
      subject,
      policy: policyUri,
    });
  }

  async getStreakStatus(actor: string, subject: string): Promise<StreakStatus> {
    return this.xrpcCall("app.starrysky.streak.getStreakStatus", {
      actor,
      subject,
    });
  }
}
