export type NoticeStatus = "DRAFT" | "PUBLISHED" | "HIDDEN";

export type PagedResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export type NoticeSummary = {
  id: number;
  title: string;
  startAt: string;
  endAt?: string | null;
  isBanner: boolean;
};

export type NoticeDetail = {
  id: number;
  title: string;
  content: string;
  startAt: string;
  endAt?: string | null;
  isBanner: boolean;
  status: NoticeStatus;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminNoticeSummary = {
  id: number;
  title: string;
  status: NoticeStatus;
  isBanner: boolean;
  startAt: string;
  endAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type NoticeUpsertRequest = {
  title: string;
  content: string;
  startAt: string;
  endAt?: string | null;
  isBanner: boolean;
  status: NoticeStatus;
};
