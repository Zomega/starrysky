import { StreakDataProvider } from "../data-provider.js";
export class AppViewDataProvider extends StreakDataProvider {
  baseUrl;
  constructor(baseUrl = "http://localhost:3000") {
    super();
    this.baseUrl = baseUrl;
  }
  async xrpcCall(method, params) {
    const url = new URL(`/xrpc/${method}`, this.baseUrl);
    Object.keys(params).forEach((key) => {
      if (Array.isArray(params[key])) {
        params[key].forEach((val) => url.searchParams.append(key, val));
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
  async getProfileStreaks(actor) {
    const data = await this.xrpcCall("app.starrysky.streak.getProfileStreaks", {
      actor,
    });
    return data.streaks;
  }
  async getStreakDetail(actor, subject, policyUri) {
    return this.xrpcCall("app.starrysky.streak.getStreakDetail", {
      actor,
      subject,
      policy: policyUri,
    });
  }
  async getStreakStatus(actor, subject) {
    return this.xrpcCall("app.starrysky.streak.getStreakStatus", {
      actor,
      subject,
    });
  }
}
