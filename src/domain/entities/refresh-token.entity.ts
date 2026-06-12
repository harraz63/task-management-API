export class RefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;

  constructor(data: RefreshToken) {
    this.id = data.id;
    this.tokenHash = data.tokenHash;
    this.userId = data.userId;
    this.expiresAt = data.expiresAt;
    this.revoked = data.revoked;
    this.createdAt = data.createdAt;
  }
}
