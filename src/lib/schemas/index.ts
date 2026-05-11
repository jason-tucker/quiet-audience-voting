import { z } from "zod";

/**
 * Browser-exposed device fingerprint info captured on every vote. Every field
 * other than `fingerprint` is best-effort; user agents may omit them. Bounds
 * are generous enough for real browsers but tight enough to reject abuse.
 */
export const DeviceInfoSchema = z.object({
  fingerprint: z.string().min(1).max(128),
  userAgent: z.string().max(512).optional(),
  screenWidth: z.number().int().nonnegative().optional(),
  screenHeight: z.number().int().nonnegative().optional(),
  timezone: z.string().max(128).optional(),
  language: z.string().max(128).optional(),
  platform: z.string().max(128).optional(),
  colorDepth: z.number().int().nonnegative().optional(),
  touchSupport: z.boolean().optional(),
  pixelRatio: z.number().nonnegative().optional(),
  viewportWidth: z.number().int().nonnegative().optional(),
  viewportHeight: z.number().int().nonnegative().optional(),
  cookieEnabled: z.boolean().optional(),
  doNotTrack: z.string().max(128).nullable().optional(),
  hardwareConcurrency: z.number().int().nonnegative().optional(),
  deviceMemory: z.number().nonnegative().optional(),
});
/** Static type for {@link DeviceInfoSchema}. */
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

/** Request body for `POST /api/vote`. */
export const VoteInputSchema = z.object({
  filmId: z.string().min(1).max(64),
  deviceInfo: DeviceInfoSchema,
});
/** Static type for {@link VoteInputSchema}. */
export type VoteInput = z.infer<typeof VoteInputSchema>;

/** Request body for `POST /api/films` (admin film creation). */
export const FilmInputSchema = z.object({
  name: z.string().min(1).max(200),
  school: z.string().min(1).max(200),
  posterUrl: z.string().min(1).max(2000),
});
/** Static type for {@link FilmInputSchema}. */
export type FilmInput = z.infer<typeof FilmInputSchema>;

/** Request body for `PATCH /api/films/[id]` — same shape as create, all optional. */
export const FilmPatchSchema = FilmInputSchema.partial();
/** Static type for {@link FilmPatchSchema}. */
export type FilmPatch = z.infer<typeof FilmPatchSchema>;

/** Request body for `POST /api/login`. */
export const LoginInputSchema = z.object({
  password: z.string().min(1).max(200),
});
/** Static type for {@link LoginInputSchema}. */
export type LoginInput = z.infer<typeof LoginInputSchema>;

/**
 * Request body for `POST /api/admin/settings`. The known fields cover the
 * admin password change flow; any additional fields must be strings or
 * booleans (enforced by the catchall) so feature toggles can be added without
 * widening this schema.
 */
export const SettingsInputSchema = z
  .object({
    adminPassword: z.string().min(6).max(200).optional(),
    adminPasswordConfirm: z.string().min(6).max(200).optional(),
  })
  .catchall(z.union([z.string(), z.boolean()]));
/** Static type for {@link SettingsInputSchema}. */
export type SettingsInput = z.infer<typeof SettingsInputSchema>;
