import type { User } from "./User";

/**
 * Response returned by the authentication endpoints after a successful
 * login or code verification. Contains the JWT and the authenticated user profile.
 */
export interface AuthResponse {
  /** Signed JWT used for subsequent API requests via the Authorization header. */
  token: string;

  /** The authenticated user's profile data. */
  user: User;
}
