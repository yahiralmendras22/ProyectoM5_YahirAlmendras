export interface IssueSummary {
  number: number;
  title: string;
  state: string;
  author: string | null;
  labels: string[];
  url: string;
  createdAt: string;
}

export interface CommitResult {
  sha: string;
  message: string;
  url: string;
  filePath: string;
  created: boolean;
}

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface AppConfig {
  githubToken: string;
  logLevel: LogLevel;
}