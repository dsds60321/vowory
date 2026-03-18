export type AdminUserInvitationSummary = {
  invitationId: number;
  slug?: string | null;
  createdAt?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  watermarkEnabledSnapshot?: boolean | null;
};
