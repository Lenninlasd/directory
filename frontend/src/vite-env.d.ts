interface ImportMetaEnv {
  /** API origin, set at build time (spec 002 AC-4.4). Empty or unset in local development. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
