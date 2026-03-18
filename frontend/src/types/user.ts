export type AdminUserSummary = {
  userId: string;
  name?: string | null;
  email?: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt?: string | null;
};
