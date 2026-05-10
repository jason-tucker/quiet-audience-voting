export interface Film {
  id: string;
  name: string;
  school: string;
  posterUrl: string;
  createdAt?: string;
}

export interface VoteResult {
  filmId: string;
  filmName: string;
  school: string;
  posterUrl: string;
  count: number;
  percentage: number;
}

export interface DeviceInfo {
  userAgent: string;
  screenWidth?: number;
  screenHeight?: number;
  timezone?: string;
  language?: string;
  platform?: string;
  colorDepth?: number;
  touchSupport?: boolean;
  pixelRatio?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  cookieEnabled?: boolean;
  doNotTrack?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  fingerprint: string;
}

export interface SuspiciousCluster {
  deviceFingerprint: string;
  voteCount: number;
  firstVote: string;
  lastVote: string;
  films: string[];
}

export interface AuditVote {
  id: string;
  filmId: string;
  filmName: string;
  timestamp: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  platform: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  timezone: string | null;
  language: string | null;
  rawDeviceJson: string;
}

export interface DeviceSummary {
  fingerprint: string;
  voteCount: number;
  firstSeen: string;
  lastSeen: string;
  films: string[];
  ipAddress: string;
  userAgent: string;
  platform: string | null;
  rawDeviceJson: string;
  trusted: boolean;
}

export interface TrustedDeviceProfile {
  id: string;
  label: string;
  fingerprint: string | null;
  userAgent: string;
  platform: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  createdAt: string;
}

export interface VoteSnapshotSummary {
  id: string;
  label: string;
  createdAt: string;
  totalVotes: number;
  uniqueDevices: number;
  filmResults: VoteResult[];
}

export interface AppStatus {
  votingOpen: boolean;
  eventName: string;
  votingOpenedAt: string | null;
}

export interface VoteEvent {
  id: string;
  filmId: string;
  filmName: string;
  timestamp: string;
}
