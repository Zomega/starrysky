import { BskyAgent } from "@atproto/api";
import { Checkin, Inventory, Policy } from "./streak-logic.ts";

export class PdsFetcher {
  private agent: BskyAgent;

  constructor(service: string = "https://bsky.social") {
    this.agent = new BskyAgent({ service });
  }

  public async fetchRecord(
    uri: string,
  ): Promise<{ record: any; cid: string } | null> {
    const parsed = this.parseAtUri(uri);
    if (!parsed) return null;

    try {
      const res = await this.agent.com.atproto.repo.getRecord({
        repo: parsed.did,
        collection: parsed.collection,
        rkey: parsed.rkey,
      });
      return { record: res.data.value, cid: res.data.cid || "" };
    } catch (err) {
      console.error(`[PdsFetcher] Failed to fetch ${uri}:`, err);
      return null;
    }
  }

  public async fetchRecordByCid(
    did: string,
    collection: string,
    cid: string,
  ): Promise<{ record: any; uri: string } | null> {
    // Note: com.atproto.repo.getRecord doesn't support fetching by CID alone.
    // However, for Starrysky, we usually have the URI or can list records.
    // This is a simplified fetcher.
    try {
      const res = await this.agent.com.atproto.repo.listRecords({
        repo: did,
        collection: collection,
        limit: 100, // Search recent records
      });

      const found = res.data.records.find((r) => r.cid === cid);
      if (found) {
        return { record: found.value, uri: found.uri };
      }
      return null;
    } catch (err) {
      console.error(`[PdsFetcher] Failed to fetch record by CID ${cid}:`, err);
      return null;
    }
  }

  private parseAtUri(uri: string) {
    const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    return { did: match[1], collection: match[2], rkey: match[3] };
  }
}
