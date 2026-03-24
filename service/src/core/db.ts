import Database from "better-sqlite3";
import { Checkin, Inventory, Policy } from "./streak-logic.ts";

export class StreakDb {
  private db: Database.Database;

  constructor(dbPath: string = "streaks.db") {
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        uri TEXT PRIMARY KEY,
        cid TEXT NOT NULL,
        did TEXT NOT NULL,
        collection TEXT NOT NULL,
        rkey TEXT NOT NULL,
        subject TEXT,
        createdAt TEXT NOT NULL,
        indexedAt TEXT NOT NULL,
        value BLOB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_records_did ON records(did);
      CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);
      CREATE INDEX IF NOT EXISTS idx_records_subject ON records(subject);

      CREATE TABLE IF NOT EXISTS labels (
        uri TEXT PRIMARY KEY,
        cid TEXT NOT NULL,
        did TEXT NOT NULL,
        val TEXT NOT NULL,
        neg INTEGER NOT NULL DEFAULT 0,
        cts TEXT NOT NULL,
        sig BLOB,
        indexedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_labels_did ON labels(did);
    `);
  }

  public saveLabel(
    uri: string,
    cid: string,
    did: string,
    val: string,
    neg: boolean,
    cts: string,
    sig: Buffer | null = null,
  ) {
    const indexedAt = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO labels (uri, cid, did, val, neg, cts, sig, indexedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uri) DO UPDATE SET
        cid = excluded.cid,
        did = excluded.did,
        val = excluded.val,
        neg = excluded.neg,
        cts = excluded.cts,
        sig = excluded.sig,
        indexedAt = excluded.indexedAt
    `);

    stmt.run(uri, cid, did, val, neg ? 1 : 0, cts, sig, indexedAt);
  }

  public getLabels(did: string): any[] {
    const rows = this.db.prepare("SELECT * FROM labels WHERE did = ?").all(did);
    return rows;
  }

  public getRecordByCid(cid: string): any | null {
    const row = this.db
      .prepare("SELECT value FROM records WHERE cid = ?")
      .get(cid) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : null;
  }

  public upsertRecord(
    uri: string,
    cid: string,
    did: string,
    collection: string,
    rkey: string,
    record: any,
  ) {
    const subject = record.subject || null;
    const createdAt = record.createdAt;
    const indexedAt = new Date().toISOString();
    const value = JSON.stringify(record);

    const stmt = this.db.prepare(`
      INSERT INTO records (uri, cid, did, collection, rkey, subject, createdAt, indexedAt, value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uri) DO UPDATE SET
        cid = excluded.cid,
        did = excluded.did,
        collection = excluded.collection,
        rkey = excluded.rkey,
        subject = excluded.subject,
        createdAt = excluded.createdAt,
        indexedAt = excluded.indexedAt,
        value = excluded.value
    `);

    stmt.run(
      uri,
      cid,
      did,
      collection,
      rkey,
      subject,
      createdAt,
      indexedAt,
      value,
    );
  }

  public deleteRecord(uri: string) {
    const stmt = this.db.prepare("DELETE FROM records WHERE uri = ?");
    stmt.run(uri);
  }

  public getCheckins(did: string, subject?: string): Checkin[] {
    let query =
      "SELECT value FROM records WHERE did = ? AND collection = 'app.starrysky.streak.checkin'";
    const params: any[] = [did];

    if (subject) {
      query += " AND subject = ?";
      params.push(subject);
    }

    query += " ORDER BY createdAt ASC";

    const rows = this.db.prepare(query).all(...params) as { value: string }[];
    return rows.map((row) => JSON.parse(row.value));
  }

  public getInventories(did: string, subject?: string): Inventory[] {
    let query =
      "SELECT value FROM records WHERE did = ? AND collection = 'app.starrysky.streak.inventory'";
    const params: any[] = [did];

    if (subject) {
      query += " AND subject = ?";
      params.push(subject);
    }

    query += " ORDER BY createdAt ASC";

    const rows = this.db.prepare(query).all(...params) as { value: string }[];
    return rows.map((row) => JSON.parse(row.value));
  }

  public getPolicy(uri: string): Policy | null {
    const row = this.db
      .prepare("SELECT value FROM records WHERE uri = ?")
      .get(uri) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : null;
  }

  public getPoliciesBySubject(subject: string): Policy[] {
    const rows = this.db
      .prepare(
        "SELECT value FROM records WHERE collection = 'app.starrysky.streak.policy' AND subject = ?",
      )
      .all(subject) as { value: string }[];
    return rows.map((row) => JSON.parse(row.value));
  }

  public getSubjects(did: string): string[] {
    const rows = this.db
      .prepare(
        `
      SELECT DISTINCT subject 
      FROM records 
      WHERE did = ? AND subject IS NOT NULL
    `,
      )
      .all(did) as { subject: string }[];
    return rows.map((row) => row.subject);
  }
}
