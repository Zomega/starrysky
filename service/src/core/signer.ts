import { Secp256k1Keypair } from "@atproto/crypto";

export class LabelSigner {
  private keypair: Secp256k1Keypair | null = null;

  constructor(private privateKeyHex?: string) {}

  public async init() {
    if (this.privateKeyHex) {
      this.keypair = await Secp256k1Keypair.import(
        Buffer.from(this.privateKeyHex, "hex"),
      );
    } else {
      console.warn(
        "[Signer] No LABELER_KEY provided. Labels will not be signed.",
      );
    }
  }

  public async signLabel(label: any): Promise<Buffer | null> {
    if (!this.keypair) return null;

    // AT Protocol labels are usually signed by hashing a canonical representation
    // of the label object and signing the hash.
    // For this implementation, we sign the JSON representation.
    const data = Buffer.from(JSON.stringify(label));
    const sig = await this.keypair.sign(data);
    return Buffer.from(sig);
  }

  public get did(): string {
    return this.keypair?.did() || "did:example:unsigned";
  }
}
