/**
 * A registered user account. Each user authenticates via email codes
 * and owns zero-or-more task lists that contain tasks.
 */
export interface User {
  /** Unique database identifier for the user. */
  id: number;

  /** Unique email address (normalized to lowercase). */
  email: string;

  /** Friendly name shown in the UI header and profile page. */
  displayName: string;

  /** Chosen UI color theme, stored as a string for CSS class mapping. */
  themePreference: string;
}
