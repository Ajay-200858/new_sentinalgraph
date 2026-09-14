export const SENTINEL_COLORS = {
  bg: '#0a0e27',
  card: '#1a1f3a',
  input: '#0f1425',
  border: '#2d3f5b',
  neonGreen: '#00ff88',
  magenta: '#ff00ff',
  cyan: '#00d4ff',
  warning: '#ffaa00',
  danger: '#ff0055',
  critical: '#ff0000',
  textPrimary: '#e0e0ff',
  textSecondary: '#a0a8c0',
  textMuted: '#6b7280',
} as const;

export type SentinelColorKey = keyof typeof SENTINEL_COLORS;
