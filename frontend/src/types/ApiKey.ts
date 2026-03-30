/**
 * A personal API key that allows a user to access the REST API
 * without going through the email-code authentication flow.
 * The raw key is shown once on creation; only a prefix is stored afterward.
 */
export interface ApiKey {
  /** Unique database identifier for the API key. */
  id: number;

  /** Friendly label so the user can identify the key. */
  name: string;

  /** First 8 characters of the key, displayed as a hint. */
  keyPrefix: string;

  /** ISO 8601 timestamp of when the key was created. */
  createdAt: string;

  /** ISO 8601 expiration timestamp. Null means the key never expires. */
  expiresAt?: string;

  /** Whether the key has been revoked and can no longer be used. */
  isRevoked: boolean;
}

/**
 * Extended API key data returned only at creation time.
 * Contains the full raw key which is shown to the user once
 * and cannot be retrieved again.
 */
export interface ApiKeyCreated {
  /** Unique database identifier for the API key. */
  id: number;

  /** Friendly label so the user can identify the key. */
  name: string;

  /** The full raw API key. Only available at creation time — store it securely. */
  key: string;

  /** First 8 characters of the key, displayed as a hint. */
  keyPrefix: string;

  /** ISO 8601 timestamp of when the key was created. */
  createdAt: string;
}
