"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAuthMe, logout } from "@/lib/auth";
import { apiFetch, apiFetchRaw, getApiErrorMessage, isApiError } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";
import type { AdminNoticeSummary, PagedResponse } from "@/types/notice";
import type { AdminUserSummary } from "@/types/user";

type RsvpStatus = "attending" | "declined";
type MyPageMenu = "dashboard" | "invitations" | "thankyou" | "rsvp" | "guestbook" | "adminUsers" | "adminNotices";
type NoticeViewStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "EXPIRED" | "HIDDEN";

type MyInvitation = {
  id: number;
  slug?: string | null;
  published: boolean;
  title: string;
  weddingDate?: string | null;
  mainImageUrl?: string | null;
  updatedAt?: string | null;
};

type MyRsvp = {
  id: number;
  invitationId: number;
  invitationTitle: string;
  name: string;
  side: "groom" | "bride";
  attending: boolean;
  partyCount?: number | null;
  contact?: string | null;
  meal?: boolean | null;
  bus?: boolean | null;
  note?: string | null;
  createdAt: string;
};

type MyGuestbook = {
  id: number;
  invitationId: number;
  invitationTitle: string;
  name: string;
  content: string;
  createdAt: string;
};

type MyThankyou = {
  id: number;
  slug?: string | null;
  published: boolean;
  title: string;
  senderName: string;
  mainImageUrl?: string | null;
  updatedAt?: string | null;
};

type DashboardVisitPoint = {
  date: string;
  count: number;
};

type DashboardSummary = {
  totalVisitors: number;
  totalRsvps: number;
  totalGuestbooks: number;
  visitorTrend: DashboardVisitPoint[];
  recentRsvps: MyRsvp[];
  recentGuestbooks: MyGuestbook[];
};

function formatDateText(value?: string | null): string {
  if (!value) return "날짜 미입력";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWeddingDateTime(value?: string | null): string {
  if (!value) return "예식 일시 미입력";

  const normalized = value.trim();
  if (!normalized) return "예식 일시 미입력";

  const directMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (directMatch) {
    const [, datePart, hh, mm, ss] = directMatch;
    return `${datePart} ${hh}:${mm}:${ss ?? "00"}`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;

  const yyyy = parsed.getFullYear();
  const mm = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const dd = `${parsed.getDate()}`.padStart(2, "0");
  const hh = `${parsed.getHours()}`.padStart(2, "0");
  const min = `${parsed.getMinutes()}`.padStart(2, "0");
  const sec = `${parsed.getSeconds()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
}

function formatRsvpStatus(attending: boolean): RsvpStatus {
  return attending ? "attending" : "declined";
}

function formatRsvpSide(side: string | undefined): "신랑측" | "신부측" {
  return side === "bride" ? "신부측" : "신랑측";
}

function formatMealText(value?: boolean | null): string {
  if (value == null) return "미입력";
  return value ? "예정" : "안함";
}

function formatBusText(value?: boolean | null): string {
  if (value == null) return "미입력";
  return value ? "이용" : "미이용";
}

function maskContact(value?: string | null): string {
  if (!value) return "-";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return value;

  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  const middleLength = Math.max(0, digits.length - 7);
  const middle = "*".repeat(middleLength || 1);
  return `${head}-${middle}-${tail}`;
}

function formatChartDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(5);
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  return `${month}/${day}`;
}

function resolveNoticeViewStatus(row: AdminNoticeSummary): NoticeViewStatus {
  if (row.status === "DRAFT") return "DRAFT";
  if (row.status === "HIDDEN") return "HIDDEN";

  const now = Date.now();
  const startAt = new Date(row.startAt).getTime();
  const endAt = row.endAt ? new Date(row.endAt).getTime() : Number.NaN;

  if (!Number.isNaN(startAt) && now < startAt) return "SCHEDULED";
  if (!Number.isNaN(endAt) && now > endAt) return "EXPIRED";
  return "PUBLISHED";
}

function getNoticeStatusMeta(status: NoticeViewStatus): { label: string; className: string } {
  switch (status) {
    case "DRAFT":
      return { label: "초안", className: "bg-gray-100 text-gray-600" };
    case "SCHEDULED":
      return { label: "예약", className: "bg-sky-100 text-sky-700" };
    case "PUBLISHED":
      return { label: "발행", className: "bg-green-100 text-green-700" };
    case "EXPIRED":
      return { label: "만료", className: "bg-amber-100 text-amber-700" };
    case "HIDDEN":
      return { label: "중지", className: "bg-rose-100 text-rose-700" };
    default:
      return { label: status, className: "bg-gray-100 text-gray-600" };
  }
}

function VisitorTrendChart({ points }: { points: DashboardVisitPoint[] }) {
  if (points.length === 0) return null;

  const width = 680;
  const height = 240;
  const paddingX = 36;
  const paddingY = 28;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;
  const maxCount = Math.max(...points.map((point) => point.count), 1);

  const mapped = points.map((point, index) => {
    const x = points.length === 1 ? paddingX + graphWidth / 2 : paddingX + (graphWidth * index) / (points.length - 1);
    const ratio = point.count / maxCount;
    const y = height - paddingY - ratio * graphHeight;
    return {
      ...point,
      x,
      y,
      label: formatChartDate(point.date),
    };
  });

  const linePath = mapped.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `M ${mapped[0].x} ${height - paddingY} L ${mapped.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${mapped[mapped.length - 1].x} ${height - paddingY} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full">
      <defs>
        <linearGradient id="visitorArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(188, 121, 78, 0.28)" />
          <stop offset="100%" stopColor="rgba(188, 121, 78, 0.02)" />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3, 4].map((step) => {
        const y = paddingY + (graphHeight * step) / 4;
        return <line key={`grid-${step}`} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(184, 161, 147, 0.25)" strokeWidth="1" />;
      })}

      <path d={areaPath} fill="url(#visitorArea)" />
      <polyline points={linePath} fill="none" stroke="rgba(153, 95, 58, 0.95)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {mapped.map((point) => (
        <g key={`dot-${point.date}`}>
          <circle cx={point.x} cy={point.y} r={4} fill="rgba(153, 95, 58, 1)" />
          <text x={point.x} y={height - 6} textAnchor="middle" fontSize="11" fill="rgba(107, 96, 88, 1)">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function MyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ready, setReady] = useState(false);
  const [memberName, setMemberName] = useState("회원");
  const [memberId, setMemberId] = useState("0000000000");
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeMenu, setActiveMenu] = useState<MyPageMenu>("dashboard");
  const [rsvpFilter, setRsvpFilter] = useState<"all" | RsvpStatus>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [guestbookSearch, setGuestbookSearch] = useState("");
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersPage, setAdminUsersPage] = useState(0);
  const [adminUsersPayload, setAdminUsersPayload] = useState<PagedResponse<AdminUserSummary> | null>(null);
  const [adminNoticesLoading, setAdminNoticesLoading] = useState(false);
  const [adminNoticesPage, setAdminNoticesPage] = useState(0);
  const [adminNoticesPayload, setAdminNoticesPayload] = useState<PagedResponse<AdminNoticeSummary> | null>(null);

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [thankyouCards, setThankyouCards] = useState<MyThankyou[]>([]);
  const [rsvps, setRsvps] = useState<MyRsvp[]>([]);
  const [guestbooks, setGuestbooks] = useState<MyGuestbook[]>([]);

  const [deletingInvitationId, setDeletingInvitationId] = useState<number | null>(null);
  const [deletingThankyouId, setDeletingThankyouId] = useState<number | null>(null);
  const [deletingGuestbookId, setDeletingGuestbookId] = useState<number | null>(null);
  const [savingRsvpId, setSavingRsvpId] = useState<number | null>(null);
  const [savingGuestbookId, setSavingGuestbookId] = useState<number | null>(null);

  const [editingRsvp, setEditingRsvp] = useState<{
    id: number;
    name: string;
    password: string;
    attending: boolean;
    side: "groom" | "bride";
    partyCount: string;
    contact: string;
    meal: "none" | "yes" | "no";
    bus: "none" | "yes" | "no";
    note: string;
  } | null>(null);

  const [editingGuestbook, setEditingGuestbook] = useState<{
    id: number;
    name: string;
    password: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    const menu = searchParams.get("menu");
    if (!menu) return;

    const isValidMenu = [
      "dashboard",
      "invitations",
      "thankyou",
      "rsvp",
      "guestbook",
      "adminUsers",
      "adminNotices",
    ].includes(menu);

    if (!isValidMenu) return;
    if (!isAdmin && (menu === "adminUsers" || menu === "adminNotices")) return;
    setActiveMenu(menu as MyPageMenu);
  }, [searchParams, isAdmin]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const me = await fetchAuthMe();
        if (!me.loggedIn) {
          router.replace("/login");
          return;
        }

        setMemberName(me.name ?? "회원");
        setIsAdmin(Boolean(me.isAdmin));
        const normalizedId = (me.userId ?? "3386306573").replace(/[^a-zA-Z0-9]/g, "").slice(-10);
        setMemberId(normalizedId.padStart(10, "0"));

        const [myDashboard, myInvitations, myThankyouCards, myRsvps, myGuestbooks] = await Promise.all([
          apiFetch<DashboardSummary>("/api/invitations/me/dashboard", { cache: "no-store" }),
          apiFetch<MyInvitation[]>("/api/invitations/me", { cache: "no-store" }),
          apiFetch<MyThankyou[]>("/api/thankyou-cards/me", { cache: "no-store" }),
          apiFetch<MyRsvp[]>("/api/rsvps/me", { cache: "no-store" }),
          apiFetch<MyGuestbook[]>("/api/invitations/me/guestbooks", { cache: "no-store" }),
        ]);

        setDashboard(myDashboard);
        setInvitations(myInvitations);
        setThankyouCards(myThankyouCards);
        setRsvps(myRsvps);
        setGuestbooks(myGuestbooks);
        setReady(true);
      } catch (error) {
        if (isApiError(error) && error.redirectedToLogin) return;
        router.replace("/");
      }
    };

    void initialize();
  }, [router]);

  const refreshDashboard = async () => {
    setDashboardLoading(true);
    try {
      const latest = await apiFetch<DashboardSummary>("/api/invitations/me/dashboard", { cache: "no-store" });
      setDashboard(latest);
    } catch (error) {
      window.alert(getApiErrorMessage(error, "대시보드 데이터를 불러오지 못했습니다."));
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadAdminUsers = async (targetPage: number) => {
    setAdminUsersLoading(true);
    try {
      const data = await apiFetch<PagedResponse<AdminUserSummary>>(`/api/admin/users?page=${targetPage}&size=20`, { cache: "no-store" });
      setAdminUsersPayload(data);
      setAdminUsersPage(data.page ?? targetPage);
    } catch (error) {
      window.alert(getApiErrorMessage(error, "관리자 사용자 목록을 불러오지 못했습니다."));
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const loadAdminNotices = async (targetPage: number) => {
    setAdminNoticesLoading(true);
    try {
      const data = await apiFetch<PagedResponse<AdminNoticeSummary>>(`/api/admin/notices?page=${targetPage}&size=20`, { cache: "no-store" });
      setAdminNoticesPayload(data);
      setAdminNoticesPage(data.page ?? targetPage);
    } catch (error) {
      window.alert(getApiErrorMessage(error, "관리자 공지 목록을 불러오지 못했습니다."));
    } finally {
      setAdminNoticesLoading(false);
    }
  };

  const dashboardData = useMemo<DashboardSummary>(() => {
    if (dashboard) return dashboard;
    return {
      totalVisitors: 0,
      totalRsvps: rsvps.length,
      totalGuestbooks: guestbooks.length,
      visitorTrend: [],
      recentRsvps: rsvps.slice(0, 10),
      recentGuestbooks: guestbooks.slice(0, 5),
    };
  }, [dashboard, rsvps, guestbooks]);

  const rsvpStats = useMemo(() => {
    const total = rsvps.length;
    const attending = rsvps.filter((row) => row.attending).length;
    const declined = rsvps.filter((row) => !row.attending).length;
    const groomSide = rsvps.filter((row) => row.side !== "bride").length;
    const brideSide = rsvps.filter((row) => row.side === "bride").length;
    return { total, attending, declined, groomSide, brideSide };
  }, [rsvps]);

  const filteredRsvpRows = useMemo(() => {
    const normalizedQuery = searchKeyword.trim().toLowerCase();

    return rsvps.filter((row) => {
      const rowStatus = formatRsvpStatus(row.attending);
      const statusMatched = rsvpFilter === "all" ? true : rowStatus === rsvpFilter;
      const queryMatched =
        normalizedQuery.length === 0 ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.invitationTitle.toLowerCase().includes(normalizedQuery) ||
        formatRsvpSide(row.side).toLowerCase().includes(normalizedQuery) ||
        (row.note ?? "").toLowerCase().includes(normalizedQuery) ||
        formatDateText(row.createdAt).toLowerCase().includes(normalizedQuery);

      return statusMatched && queryMatched;
    });
  }, [rsvps, rsvpFilter, searchKeyword]);

  const filteredGuestbookRows = useMemo(() => {
    const normalizedQuery = guestbookSearch.trim().toLowerCase();
    return guestbooks.filter((row) => {
      if (!normalizedQuery) return true;
      return (
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.invitationTitle.toLowerCase().includes(normalizedQuery) ||
        row.content.toLowerCase().includes(normalizedQuery) ||
        formatDateText(row.createdAt).toLowerCase().includes(normalizedQuery)
      );
    });
  }, [guestbooks, guestbookSearch]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeMenu === "adminUsers" && !adminUsersPayload && !adminUsersLoading) {
      void loadAdminUsers(0);
    }
    if (activeMenu === "adminNotices" && !adminNoticesPayload && !adminNoticesLoading) {
      void loadAdminNotices(0);
    }
  }, [isAdmin, activeMenu, adminUsersPayload, adminUsersLoading, adminNoticesPayload, adminNoticesLoading]);

  const hasVisitorTrendData = dashboardData.visitorTrend.some((point) => point.count > 0);
  const adminUserRows = adminUsersPayload?.content ?? [];
  const adminNoticeRows = adminNoticesPayload?.content ?? [];

  const downloadCsv = async () => {
    try {
      const response = await apiFetchRaw("/api/invitations/me/rsvps.csv", {
        method: "GET",
      });

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "my-rsvps.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // ignore
    }
  };

  const deleteInvitation = async (invitationId: number) => {
    const target = invitations.find((item) => item.id === invitationId);
    if (target?.published) {
      window.alert("발행된 청첩장은 삭제할 수 없습니다.");
      return;
    }

    if (!window.confirm("이 청첩장을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.")) {
      return;
    }

    setDeletingInvitationId(invitationId);
    try {
      await apiFetch<{ message: string }>(`/api/invitations/${invitationId}`, {
        method: "DELETE",
      });
      setInvitations((prev) => prev.filter((item) => item.id !== invitationId));
      setDashboard((prev) => (prev ? { ...prev, totalRsvps: Math.max(0, prev.totalRsvps), totalGuestbooks: Math.max(0, prev.totalGuestbooks) } : prev));
    } catch {
      window.alert("삭제 처리 중 오류가 발생했습니다.");
    } finally {
      setDeletingInvitationId(null);
    }
  };

  const deleteThankyou = async (thankyouId: number) => {
    const target = thankyouCards.find((item) => item.id === thankyouId);
    if (target?.published) {
      window.alert("발행된 감사장은 삭제할 수 없습니다.");
      return;
    }

    if (!window.confirm("이 감사장을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.")) {
      return;
    }

    setDeletingThankyouId(thankyouId);
    try {
      await apiFetch<{ message: string }>(`/api/thankyou-cards/${thankyouId}`, {
        method: "DELETE",
      });
      setThankyouCards((prev) => prev.filter((item) => item.id !== thankyouId));
    } catch {
      window.alert("감사장 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingThankyouId(null);
    }
  };

  const deleteGuestbook = async (guestbookId: number) => {
    if (!window.confirm("이 방명록을 삭제하시겠습니까?")) {
      return;
    }

    setDeletingGuestbookId(guestbookId);
    try {
      await apiFetch<{ message: string }>(`/api/invitations/me/guestbooks/${guestbookId}`, {
        method: "DELETE",
      });
      setGuestbooks((prev) => prev.filter((row) => row.id !== guestbookId));
      setDashboard((prev) =>
        prev
          ? {
              ...prev,
              totalGuestbooks: Math.max(0, prev.totalGuestbooks - 1),
              recentGuestbooks: prev.recentGuestbooks.filter((row) => row.id !== guestbookId),
            }
          : prev,
      );
    } catch {
      window.alert("방명록 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingGuestbookId(null);
    }
  };

  const openRsvpEditModal = (row: MyRsvp) => {
    setEditingRsvp({
      id: row.id,
      name: row.name,
      password: "",
      attending: row.attending,
      side: row.side ?? "groom",
      partyCount: row.partyCount && row.partyCount > 0 ? String(row.partyCount) : "",
      contact: row.contact ?? "",
      meal: row.meal == null ? "none" : row.meal ? "yes" : "no",
      bus: row.bus == null ? "none" : row.bus ? "yes" : "no",
      note: row.note ?? "",
    });
  };

  const updateRsvp = async () => {
    if (!editingRsvp) return;
    if (!editingRsvp.name.trim()) {
      window.alert("이름을 입력해 주세요.");
      return;
    }
    if (editingRsvp.password.trim().length < 4) {
      window.alert("비밀번호는 4자 이상 입력해 주세요.");
      return;
    }

    const parsedPartyCount = editingRsvp.partyCount.trim() ? Number(editingRsvp.partyCount) : null;

    setSavingRsvpId(editingRsvp.id);
    try {
      const updated = await apiFetch<MyRsvp>(`/api/rsvps/me/${editingRsvp.id}`, {
        method: "PUT",
        body: JSON.stringify({
          password: editingRsvp.password.trim(),
          name: editingRsvp.name.trim(),
          attending: editingRsvp.attending,
          side: editingRsvp.side,
          partyCount: editingRsvp.attending && parsedPartyCount && parsedPartyCount > 0 ? parsedPartyCount : null,
          contact: editingRsvp.contact.trim() || null,
          meal: editingRsvp.meal === "none" ? null : editingRsvp.meal === "yes",
          bus: editingRsvp.bus === "none" ? null : editingRsvp.bus === "yes",
          note: editingRsvp.note.trim() || null,
        }),
      });

      setRsvps((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setDashboard((prev) =>
        prev
          ? {
              ...prev,
              recentRsvps: prev.recentRsvps.map((row) => (row.id === updated.id ? updated : row)),
            }
          : prev,
      );
      setEditingRsvp(null);
      window.alert("RSVP가 수정되었습니다.");
    } catch (error) {
      window.alert(getApiErrorMessage(error, "RSVP 수정에 실패했습니다."));
    } finally {
      setSavingRsvpId(null);
    }
  };

  const openGuestbookEditModal = (row: MyGuestbook) => {
    setEditingGuestbook({
      id: row.id,
      name: row.name,
      password: "",
      content: row.content,
    });
  };

  const updateGuestbook = async () => {
    if (!editingGuestbook) return;
    if (!editingGuestbook.name.trim()) {
      window.alert("이름을 입력해 주세요.");
      return;
    }
    if (!editingGuestbook.content.trim()) {
      window.alert("내용을 입력해 주세요.");
      return;
    }
    if (editingGuestbook.password.trim().length < 4) {
      window.alert("비밀번호는 4자 이상 입력해 주세요.");
      return;
    }

    setSavingGuestbookId(editingGuestbook.id);
    try {
      const updated = await apiFetch<MyGuestbook>(`/api/invitations/me/guestbooks/${editingGuestbook.id}`, {
        method: "PUT",
        body: JSON.stringify({
          password: editingGuestbook.password.trim(),
          name: editingGuestbook.name.trim(),
          content: editingGuestbook.content.trim(),
        }),
      });
      setGuestbooks((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setDashboard((prev) =>
        prev
          ? {
              ...prev,
              recentGuestbooks: prev.recentGuestbooks.map((row) => (row.id === updated.id ? updated : row)),
            }
          : prev,
      );
      setEditingGuestbook(null);
      window.alert("방명록이 수정되었습니다.");
    } catch (error) {
      window.alert(getApiErrorMessage(error, "방명록 수정에 실패했습니다."));
    } finally {
      setSavingGuestbookId(null);
    }
  };

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-theme-secondary">로그인 상태 확인 중...</div>;
  }

  return (
    <div className="mypage-modern min-h-screen bg-theme font-pretendard">
      <header className="border-b border-warm bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-4 md:px-6">
          <button className="inline-flex items-center" type="button" onClick={() => router.push("/")}>
            <Image src="/logo.png" alt="WeddingLetter" width={220} height={80} priority className="h-10 w-auto" />
          </button>
          <div className="flex items-center gap-3">
            <button
              className="rounded-md border border-warm px-4 py-2 text-xs font-bold text-theme-secondary transition-colors hover:bg-theme"
              type="button"
              onClick={() => router.push("/")}
            >
              돌아가기
            </button>
            <button
              className="rounded-md bg-theme-brand px-4 py-2 text-xs font-bold text-white"
              type="button"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-4 py-8 md:px-6 md:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-3xl border border-warm bg-white p-6">
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-theme text-theme-brand">
                <span className="material-symbols-outlined text-[32px]">person</span>
              </div>
              <div>
                <p className="font-pretendard text-2xl font-bold tracking-tight text-theme-brand">{memberId}</p>
                <p className="mt-1 text-xs text-theme-secondary">{memberName}님</p>
              </div>
            </div>

            <div className="mt-8 space-y-2 border-t border-warm pt-6">
              <button
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                  activeMenu === "dashboard" ? "bg-theme font-semibold text-theme-brand" : "font-medium text-theme-secondary hover:bg-theme"
                }`}
                type="button"
                onClick={() => setActiveMenu("dashboard")}
              >
                대시보드
              </button>
              <button
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                  activeMenu === "invitations" ? "bg-theme font-semibold text-theme-brand" : "font-medium text-theme-secondary hover:bg-theme"
                }`}
                type="button"
                onClick={() => setActiveMenu("invitations")}
              >
                청첩장 목록
              </button>
              <button
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                  activeMenu === "thankyou" ? "bg-theme font-semibold text-theme-brand" : "font-medium text-theme-secondary hover:bg-theme"
                }`}
                type="button"
                onClick={() => setActiveMenu("thankyou")}
              >
                감사장 목록
              </button>
              <button
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                  activeMenu === "rsvp" ? "bg-theme font-semibold text-theme-brand" : "font-medium text-theme-secondary hover:bg-theme"
                }`}
                type="button"
                onClick={() => setActiveMenu("rsvp")}
              >
                RSVP 관리
              </button>
              <button
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                  activeMenu === "guestbook" ? "bg-theme font-semibold text-theme-brand" : "font-medium text-theme-secondary hover:bg-theme"
                }`}
                type="button"
                onClick={() => setActiveMenu("guestbook")}
              >
                방명록 관리
              </button>
              {isAdmin ? (
                <>
                  <button
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                      activeMenu === "adminUsers" ? "bg-theme font-semibold text-theme-brand" : "font-medium text-theme-secondary hover:bg-theme"
                    }`}
                    type="button"
                    onClick={() => setActiveMenu("adminUsers")}
                  >
                    관리자 사용자 관리
                  </button>
                  <button
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                      activeMenu === "adminNotices" ? "bg-theme font-semibold text-theme-brand" : "font-medium text-theme-secondary hover:bg-theme"
                    }`}
                    type="button"
                    onClick={() => setActiveMenu("adminNotices")}
                  >
                    관리자 공지 관리
                  </button>
                </>
              ) : null}
            </div>

            <div className="mt-6 border-t border-warm pt-6 text-sm text-theme-secondary">
              <button
                className="w-full rounded-xl px-4 py-3 text-left font-medium transition-colors hover:bg-theme hover:text-theme-brand"
                type="button"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
              >
                로그아웃
              </button>
            </div>
          </aside>

          <section className="space-y-5">
            {activeMenu === "dashboard" ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-warm bg-white p-6">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-theme-brand">청첩장 통계</h1>
                    <p className="mt-2 text-sm text-theme-secondary">방문자 추이, RSVP, 방명록 현황을 한 화면에서 확인하세요.</p>
                  </div>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl border border-warm bg-white px-4 py-2 text-xs font-semibold text-theme-secondary transition-colors hover:bg-theme disabled:opacity-60"
                    type="button"
                    onClick={() => void refreshDashboard()}
                    disabled={dashboardLoading}
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    {dashboardLoading ? "새로고침 중" : "새로고침"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <article className="rounded-2xl border border-warm bg-white p-5">
                    <div className="flex items-center justify-between text-theme-secondary">
                      <p className="text-xs font-bold tracking-[0.08em] uppercase">전체 방문자 수</p>
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </div>
                    <p className="mt-3 text-3xl font-pretendard text-theme-brand">{dashboardData.totalVisitors.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-theme-secondary">총 {dashboardData.totalVisitors.toLocaleString()}명</p>
                  </article>

                  <article className="rounded-2xl border border-warm bg-white p-5">
                    <div className="flex items-center justify-between text-theme-secondary">
                      <p className="text-xs font-bold tracking-[0.08em] uppercase">RSVP 응답자 수</p>
                      <span className="material-symbols-outlined text-[18px]">fact_check</span>
                    </div>
                    <p className="mt-3 text-3xl font-pretendard text-theme-brand">{dashboardData.totalRsvps.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-theme-secondary">총 {dashboardData.totalRsvps.toLocaleString()}건</p>
                  </article>

                  <article className="rounded-2xl border border-warm bg-white p-5">
                    <div className="flex items-center justify-between text-theme-secondary">
                      <p className="text-xs font-bold tracking-[0.08em] uppercase">방명록 작성 수</p>
                      <span className="material-symbols-outlined text-[18px]">forum</span>
                    </div>
                    <p className="mt-3 text-3xl font-pretendard text-theme-brand">{dashboardData.totalGuestbooks.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-theme-secondary">총 {dashboardData.totalGuestbooks.toLocaleString()}건</p>
                  </article>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
                  <section className="rounded-2xl border border-warm bg-white p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-theme-brand">최근 7일 방문자 추이</h2>
                      <span className="rounded-md bg-theme px-3 py-1 text-[11px] font-semibold text-theme-secondary">최근 7일</span>
                    </div>

                    {!hasVisitorTrendData ? (
                      <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-warm bg-theme/40 text-sm text-theme-secondary">
                        아직 방문 데이터가 없습니다.
                      </div>
                    ) : (
                      <VisitorTrendChart points={dashboardData.visitorTrend} />
                    )}
                  </section>

                  <section className="rounded-2xl border border-warm bg-white p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-theme-brand">최근 방명록</h2>
                      <button
                        className="rounded-lg border border-warm px-3 py-1.5 text-xs font-semibold text-theme-secondary hover:bg-theme"
                        type="button"
                        onClick={() => setActiveMenu("guestbook")}
                      >
                        모두보기
                      </button>
                    </div>

                    {dashboardData.recentGuestbooks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-warm bg-theme/40 px-4 py-8 text-center text-sm text-theme-secondary">
                        등록된 방명록이 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dashboardData.recentGuestbooks.map((entry) => (
                          <div key={`dashboard-guestbook-${entry.id}`} className="rounded-xl border border-warm bg-theme/40 px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-theme-brand">{entry.name}</p>
                              <p className="text-[11px] text-theme-secondary">{formatDateText(entry.createdAt)}</p>
                            </div>
                            <p className="mt-1 truncate text-xs text-theme-secondary">{entry.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <section className="rounded-2xl border border-warm bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-theme-brand">최근 RSVP</h2>
                    <button
                      className="rounded-lg border border-warm px-3 py-1.5 text-xs font-semibold text-theme-secondary hover:bg-theme"
                      type="button"
                      onClick={() => setActiveMenu("rsvp")}
                    >
                      모두보기
                    </button>
                  </div>

                  {dashboardData.recentRsvps.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-warm bg-theme/40 px-4 py-10 text-center text-sm text-theme-secondary">
                      아직 RSVP 응답이 없습니다.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-warm">
                      <table className="w-full min-w-[860px] text-left">
                        <thead>
                          <tr className="bg-theme">
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-theme-secondary">작성자</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-theme-secondary">연락처</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-theme-secondary">참석</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-theme-secondary">동행 인원</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-theme-secondary">식사 여부</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-theme-secondary">버스 여부</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-theme-secondary">메시지</th>
                            <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-theme-secondary">응답 일시</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--theme-divider)]">
                          {dashboardData.recentRsvps.map((row) => (
                            <tr key={`dashboard-rsvp-${row.id}`} className="hover:bg-[var(--theme-bg)]">
                              <td className="px-4 py-3 text-sm font-semibold text-theme-brand">{row.name}</td>
                              <td className="px-4 py-3 text-xs text-theme-secondary">{maskContact(row.contact)}</td>
                              <td className="px-4 py-3">
                                {row.attending ? (
                                  <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-bold text-green-700">참석</span>
                                ) : (
                                  <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600">미참석</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-theme-secondary">{row.partyCount ?? "-"}</td>
                              <td className="px-4 py-3 text-xs text-theme-secondary">{formatMealText(row.meal)}</td>
                              <td className="px-4 py-3 text-xs text-theme-secondary">{formatBusText(row.bus)}</td>
                              <td className="px-4 py-3 text-xs text-theme-secondary">
                                <p className="max-w-[220px] truncate">{row.note?.trim() ? row.note : "-"}</p>
                              </td>
                              <td className="px-4 py-3 text-right text-xs text-theme-secondary">{formatDateText(row.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            ) : null}

            {activeMenu === "invitations" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-theme-brand">내 청첩장</h1>
                  <button
                    className="rounded-xl bg-theme-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-100"
                    type="button"
                    onClick={() => router.push("/editor")}
                  >
                    + 새 청첩장 만들기
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {invitations.map((item) => (
                    <article className="overflow-hidden rounded-3xl border border-warm bg-white" key={item.id}>
                      <div className="relative h-[170px] bg-theme">
                        {item.mainImageUrl ? (
                          <img className="h-full w-full object-cover" src={resolveAssetUrl(item.mainImageUrl)} alt={`${item.title}-thumbnail`} />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="material-symbols-outlined text-5xl text-theme-secondary">mail</span>
                          </div>
                        )}
                        <span className={`absolute top-4 right-4 rounded-md px-3 py-1 text-[10px] font-bold text-white ${item.published ? "bg-green-500" : "bg-gray-500"}`}>
                          {item.published ? "발행됨" : "작성중"}
                        </span>
                      </div>
                      <div className="space-y-4 p-5">
                        <div>
                          <p className="text-2xl font-semibold text-theme-brand">{item.title}</p>
                          <p className="mt-1 text-xs text-theme-secondary">{formatWeddingDateTime(item.weddingDate)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            className="rounded-xl border border-warm py-3 text-sm font-semibold text-theme-secondary transition-colors hover:bg-theme"
                            type="button"
                            onClick={() => router.push(`/editor?id=${item.id}`)}
                          >
                            수정하기
                          </button>
                          <button
                            className="rounded-xl bg-theme px-4 py-3 text-sm font-semibold text-theme-brand transition-colors hover:bg-[#f7ece5]"
                            type="button"
                            onClick={() => {
                              if (item.slug) router.push(`/invitation/${item.slug}`);
                            }}
                            disabled={!item.slug}
                          >
                            보기
                          </button>
                          <button
                            className="col-span-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            type="button"
                            onClick={() => void deleteInvitation(item.id)}
                            disabled={item.published || deletingInvitationId === item.id}
                          >
                            {item.published ? "발행된 청첩장 삭제 불가" : deletingInvitationId === item.id ? "삭제중..." : "삭제하기"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}

                  {invitations.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-warm bg-white p-12 text-center text-sm text-theme-secondary">
                      생성된 초대장이 없습니다. 새 청첩장을 만들어 주세요.
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {activeMenu === "thankyou" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-theme-brand">내 감사장</h1>
                  <button
                    className="rounded-xl bg-theme-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-100"
                    type="button"
                    onClick={() => router.push("/thankyou/editor")}
                  >
                    + 새 감사장 만들기
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {thankyouCards.map((item) => (
                    <article className="overflow-hidden rounded-3xl border border-warm bg-white" key={`thankyou-${item.id}`}>
                      <div className="relative h-[170px] bg-theme">
                        {item.mainImageUrl ? (
                          <img className="h-full w-full object-cover" src={resolveAssetUrl(item.mainImageUrl)} alt={`${item.title}-thumbnail`} />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="material-symbols-outlined text-5xl text-theme-secondary">favorite</span>
                          </div>
                        )}
                        <span className={`absolute top-4 right-4 rounded-md px-3 py-1 text-[10px] font-bold text-white ${item.published ? "bg-green-500" : "bg-gray-500"}`}>
                          {item.published ? "발행됨" : "작성중"}
                        </span>
                      </div>
                      <div className="space-y-4 p-5">
                        <div>
                          <p className="text-2xl font-semibold text-theme-brand">{item.title}</p>
                          <p className="mt-1 text-xs text-theme-secondary">보내는 사람: {item.senderName || "-"}</p>
                          <p className="mt-1 text-xs text-theme-secondary">{formatDateText(item.updatedAt)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            className="rounded-xl border border-warm py-3 text-sm font-semibold text-theme-secondary transition-colors hover:bg-theme"
                            type="button"
                            onClick={() => router.push(`/thankyou/editor?id=${item.id}`)}
                          >
                            수정하기
                          </button>
                          <button
                            className="rounded-xl bg-theme px-4 py-3 text-sm font-semibold text-theme-brand transition-colors hover:bg-[#f7ece5]"
                            type="button"
                            onClick={() => {
                              if (item.slug) {
                                router.push(`/thankyou/${item.slug}`);
                              }
                            }}
                            disabled={!item.slug}
                          >
                            보기
                          </button>
                          <button
                            className="col-span-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            type="button"
                            onClick={() => void deleteThankyou(item.id)}
                            disabled={item.published || deletingThankyouId === item.id}
                          >
                            {item.published ? "발행된 감사장 삭제 불가" : deletingThankyouId === item.id ? "삭제중..." : "삭제하기"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}

                  {thankyouCards.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-warm bg-white p-12 text-center text-sm text-theme-secondary">
                      생성된 감사장이 없습니다. 새 감사장을 만들어 주세요.
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {activeMenu === "rsvp" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-theme-brand">RSVP 관리</h1>
                  <button
                    className="rounded-xl border border-warm bg-white px-5 py-3 text-sm font-bold text-theme-secondary"
                    type="button"
                    onClick={downloadCsv}
                  >
                    명단 다운로드 (CSV)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  <div className="rounded-2xl border border-warm bg-white p-4">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-theme-secondary uppercase">Total</p>
                    <p className="mt-2 text-3xl font-pretendard text-theme-brand">{rsvpStats.total}</p>
                  </div>
                  <div className="rounded-2xl border border-warm bg-white p-4">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-theme-secondary uppercase">참석</p>
                    <p className="mt-2 text-3xl font-pretendard text-theme-accent">{rsvpStats.attending}</p>
                  </div>
                  <div className="rounded-2xl border border-warm bg-white p-4">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-theme-secondary uppercase">미참석</p>
                    <p className="mt-2 text-3xl font-pretendard text-theme-brand">{rsvpStats.declined}</p>
                  </div>
                  <div className="rounded-2xl border border-warm bg-white p-4">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-theme-secondary uppercase">신랑측</p>
                    <p className="mt-2 text-3xl font-pretendard text-theme-brand">{rsvpStats.groomSide}</p>
                  </div>
                  <div className="rounded-2xl border border-warm bg-white p-4">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-theme-secondary uppercase">신부측</p>
                    <p className="mt-2 text-3xl font-pretendard text-theme-brand">{rsvpStats.brideSide}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      className={`rounded-md px-4 py-2 text-xs font-bold transition-colors ${
                        rsvpFilter === "all" ? "bg-theme-brand text-white" : "border border-warm bg-white text-theme-secondary hover:bg-theme"
                      }`}
                      type="button"
                      onClick={() => setRsvpFilter("all")}
                    >
                      전체
                    </button>
                    <button
                      className={`rounded-md px-4 py-2 text-xs font-bold transition-colors ${
                        rsvpFilter === "attending" ? "bg-theme-brand text-white" : "border border-warm bg-white text-theme-secondary hover:bg-theme"
                      }`}
                      type="button"
                      onClick={() => setRsvpFilter("attending")}
                    >
                      참석
                    </button>
                    <button
                      className={`rounded-md px-4 py-2 text-xs font-bold transition-colors ${
                        rsvpFilter === "declined" ? "bg-theme-brand text-white" : "border border-warm bg-white text-theme-secondary hover:bg-theme"
                      }`}
                      type="button"
                      onClick={() => setRsvpFilter("declined")}
                    >
                      미참석
                    </button>
                  </div>

                  <div className="relative w-full max-w-[260px]">
                    <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-theme-secondary">
                      search
                    </span>
                    <input
                      className="w-full rounded-md border border-warm bg-white py-2 pr-4 pl-10 text-sm text-theme-brand outline-none transition-colors focus:border-[var(--theme-accent)]"
                      type="text"
                      placeholder="이름/응답 검색"
                      value={searchKeyword}
                      onChange={(event) => setSearchKeyword(event.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-warm bg-white">
                  <table className="w-full min-w-[1060px] table-fixed text-left align-middle">
                    <colgroup>
                      <col className="w-[120px]" />
                      <col className="w-[92px]" />
                      <col className="w-[92px]" />
                      <col className="w-[120px]" />
                      <col className="w-[76px]" />
                      <col className="w-[76px]" />
                      <col className="w-[76px]" />
                      <col className="w-[150px]" />
                      <col className="w-[170px]" />
                      <col className="w-[150px]" />
                      <col className="w-[64px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-theme">
                        <th className="px-6 py-4 text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">하객 성함</th>
                        <th className="px-6 py-4 text-center text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">하객측</th>
                        <th className="px-6 py-4 text-center text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">참석 여부</th>
                        <th className="px-6 py-4 text-center text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">연락처</th>
                        <th className="px-6 py-4 text-center text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">인원</th>
                        <th className="px-6 py-4 text-center text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">식사</th>
                        <th className="px-6 py-4 text-center text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">버스</th>
                        <th className="px-6 py-4 text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">초대장</th>
                        <th className="px-6 py-4 text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">메모</th>
                        <th className="px-6 py-4 text-center text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">응답 일시</th>
                        <th className="px-6 py-4 text-center text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--theme-divider)]">
                      {filteredRsvpRows.length > 0
                        ? filteredRsvpRows.map((row) => (
                            <tr className="hover:bg-[var(--theme-bg)]" key={row.id}>
                              <td className="px-6 py-4 align-middle font-semibold text-theme-brand">
                                <p className="truncate">{row.name}</p>
                              </td>
                              <td className="px-6 py-4 text-center align-middle text-sm text-theme-secondary whitespace-nowrap">
                                <span className={`rounded-md px-2 py-1 text-xs font-bold ${row.side === "bride" ? "bg-pink-50 text-pink-600" : "bg-blue-50 text-blue-600"}`}>
                                  {formatRsvpSide(row.side)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center align-middle whitespace-nowrap">
                                {row.attending ? (
                                  <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-bold text-green-600">참석</span>
                                ) : (
                                  <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-400">미참석</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center align-middle text-xs text-theme-secondary whitespace-nowrap">{maskContact(row.contact)}</td>
                              <td className="px-6 py-4 text-center align-middle text-xs text-theme-secondary whitespace-nowrap">{row.partyCount ?? "-"}</td>
                              <td className="px-6 py-4 text-center align-middle text-xs text-theme-secondary whitespace-nowrap">{formatMealText(row.meal)}</td>
                              <td className="px-6 py-4 text-center align-middle text-xs text-theme-secondary whitespace-nowrap">{formatBusText(row.bus)}</td>
                              <td className="px-6 py-4 align-middle text-sm text-theme-secondary">
                                <p className="truncate">{row.invitationTitle}</p>
                              </td>
                              <td className="px-6 py-4 align-middle text-sm text-theme-secondary">
                                <p className="truncate">{row.note?.trim() ? row.note : "-"}</p>
                              </td>
                              <td className="px-6 py-4 text-center align-middle text-xs text-theme-secondary whitespace-nowrap">{formatDateText(row.createdAt)}</td>
                              <td className="px-6 py-4 text-center align-middle">
                                <button
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-warm bg-white text-theme-secondary transition-colors hover:bg-theme"
                                  type="button"
                                  onClick={() => openRsvpEditModal(row)}
                                  aria-label={`${row.name} RSVP 수정`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        : null}
                      {filteredRsvpRows.length === 0 ? (
                        <tr>
                          <td className="px-6 py-10 text-center text-sm text-theme-secondary" colSpan={11}>
                            검색/필터 결과가 없습니다.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {activeMenu === "guestbook" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-theme-brand">방명록 관리</h1>
                  <div className="rounded-md border border-warm bg-white px-4 py-2 text-xs font-bold text-theme-secondary">
                    총 {guestbooks.length}건
                  </div>
                </div>

                <div className="relative w-full max-w-[320px]">
                  <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-theme-secondary">
                    search
                  </span>
                  <input
                    className="w-full rounded-md border border-warm bg-white py-2 pr-4 pl-10 text-sm text-theme-brand outline-none transition-colors focus:border-[var(--theme-accent)]"
                    type="text"
                    placeholder="이름/내용/초대장 검색"
                    value={guestbookSearch}
                    onChange={(event) => setGuestbookSearch(event.target.value)}
                  />
                </div>

                <div className="overflow-hidden rounded-3xl border border-warm bg-white">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-theme">
                        <th className="px-6 py-4 text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">작성자</th>
                        <th className="px-6 py-4 text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">내용</th>
                        <th className="px-6 py-4 text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">초대장</th>
                        <th className="px-6 py-4 text-right text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">등록 일시</th>
                        <th className="px-6 py-4 text-right text-[11px] font-bold tracking-[0.08em] text-theme-secondary uppercase">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--theme-divider)]">
                      {filteredGuestbookRows.length > 0
                        ? filteredGuestbookRows.map((row) => (
                            <tr className="hover:bg-[var(--theme-bg)]" key={row.id}>
                              <td className="px-6 py-4 font-semibold text-theme-brand">{row.name}</td>
                              <td className="px-6 py-4 text-sm text-theme-secondary">
                                <p className="max-w-[440px] truncate">{row.content}</p>
                              </td>
                              <td className="px-6 py-4 text-sm text-theme-secondary">{row.invitationTitle}</td>
                              <td className="px-6 py-4 text-right text-xs text-theme-secondary">{formatDateText(row.createdAt)}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-warm bg-white text-theme-secondary transition-colors hover:bg-theme"
                                    type="button"
                                    onClick={() => openGuestbookEditModal(row)}
                                    aria-label={`${row.name} 방명록 수정`}
                                  >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                  </button>
                                  <button
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    type="button"
                                    onClick={() => void deleteGuestbook(row.id)}
                                    disabled={deletingGuestbookId === row.id}
                                    aria-label={`${row.name} 방명록 삭제`}
                                  >
                                    <span className="material-symbols-outlined text-[18px]">
                                      {deletingGuestbookId === row.id ? "progress_activity" : "delete"}
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        : null}
                      {filteredGuestbookRows.length === 0 ? (
                        <tr>
                          <td className="px-6 py-10 text-center text-sm text-theme-secondary" colSpan={5}>
                            표시할 방명록이 없습니다.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {activeMenu === "adminUsers" && isAdmin ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-theme-brand">관리자 사용자 관리</h1>
                    <p className="mt-1 text-sm text-theme-secondary">사용자 계정 및 권한 상태를 확인하고 사용자별 청첩장 관리로 이동합니다.</p>
                  </div>
                  <button
                    className="rounded-xl border border-warm bg-white px-5 py-3 text-sm font-bold text-theme-secondary"
                    type="button"
                    onClick={() => void loadAdminUsers(adminUsersPage)}
                    disabled={adminUsersLoading}
                  >
                    {adminUsersLoading ? "불러오는 중..." : "새로고침"}
                  </button>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-warm bg-white">
                  {adminUsersLoading && adminUserRows.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-theme-secondary">불러오는 중...</p>
                  ) : null}

                  {!adminUsersLoading && adminUserRows.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-theme-secondary">표시할 사용자가 없습니다.</p>
                  ) : null}

                  {adminUserRows.length > 0 ? (
                    <table className="min-w-[900px] w-full text-left text-sm">
                      <thead className="bg-theme text-[11px] text-theme-secondary">
                        <tr>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">userId</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">이름</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">이메일</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">권한</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">상태</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">가입일</th>
                          <th className="px-4 py-3 text-right font-bold uppercase tracking-[0.08em]">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--theme-divider)]">
                        {adminUserRows.map((row) => (
                          <tr key={`admin-user-${row.userId}`} className="hover:bg-[var(--theme-bg)]">
                            <td className="px-4 py-3 font-semibold text-theme-brand">{row.userId}</td>
                            <td className="px-4 py-3 text-theme-secondary">{row.name ?? "-"}</td>
                            <td className="px-4 py-3 text-theme-secondary">{row.email ?? "-"}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-xs font-bold ${
                                  row.role === "ADMIN" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {row.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`rounded-md px-2 py-1 text-xs font-bold ${row.isActive ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"}`}>
                                {row.isActive ? "활성" : "비활성"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-theme-secondary">{formatDateText(row.createdAt)}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                className="rounded-md border border-warm px-3 py-1.5 text-xs font-bold text-theme-secondary hover:bg-theme"
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/mypage/admin/users/${encodeURIComponent(row.userId)}/invitations?name=${encodeURIComponent(row.name ?? "")}`,
                                  )
                                }
                              >
                                청첩장 관리
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </div>

                {adminUsersPayload ? (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      className="rounded-md border border-warm bg-white px-4 py-2 text-xs font-bold text-theme-secondary disabled:opacity-50"
                      type="button"
                      disabled={adminUsersPayload.page <= 0 || adminUsersLoading}
                      onClick={() => void loadAdminUsers(Math.max(adminUsersPage - 1, 0))}
                    >
                      이전
                    </button>
                    <span className="text-xs text-theme-secondary">
                      {adminUsersPayload.page + 1} / {Math.max(adminUsersPayload.totalPages, 1)}
                    </span>
                    <button
                      className="rounded-md border border-warm bg-white px-4 py-2 text-xs font-bold text-theme-secondary disabled:opacity-50"
                      type="button"
                      disabled={adminUsersPayload.last || adminUsersLoading}
                      onClick={() => void loadAdminUsers(adminUsersPage + 1)}
                    >
                      다음
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}

            {activeMenu === "adminNotices" && isAdmin ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-theme-brand">관리자 공지 관리</h1>
                    <p className="mt-1 text-sm text-theme-secondary">공지 상태를 확인하고 작성/수정 화면으로 이동할 수 있습니다.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-xl border border-warm bg-white px-4 py-3 text-sm font-bold text-theme-secondary"
                      type="button"
                      onClick={() => router.push("/mypage/admin/notices/new")}
                    >
                      + 공지 작성
                    </button>
                    <button
                      className="rounded-xl border border-warm bg-white px-4 py-3 text-sm font-bold text-theme-secondary"
                      type="button"
                      onClick={() => void loadAdminNotices(adminNoticesPage)}
                      disabled={adminNoticesLoading}
                    >
                      {adminNoticesLoading ? "불러오는 중..." : "새로고침"}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-warm bg-white">
                  {adminNoticesLoading && adminNoticeRows.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-theme-secondary">불러오는 중...</p>
                  ) : null}

                  {!adminNoticesLoading && adminNoticeRows.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-theme-secondary">표시할 공지가 없습니다.</p>
                  ) : null}

                  {adminNoticeRows.length > 0 ? (
                    <table className="min-w-[980px] w-full text-left text-sm">
                      <thead className="bg-theme text-[11px] text-theme-secondary">
                        <tr>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">제목</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">상태</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">배너</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">노출 시작</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">노출 종료</th>
                          <th className="px-4 py-3 font-bold uppercase tracking-[0.08em]">수정일</th>
                          <th className="px-4 py-3 text-right font-bold uppercase tracking-[0.08em]">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--theme-divider)]">
                        {adminNoticeRows.map((row) => {
                          const viewStatus = resolveNoticeViewStatus(row);
                          const statusMeta = getNoticeStatusMeta(viewStatus);
                          return (
                            <tr key={`admin-notice-${row.id}`} className="hover:bg-[var(--theme-bg)]">
                              <td className="px-4 py-3">
                                <p className="max-w-[380px] truncate font-semibold text-theme-brand">{row.title}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusMeta.className}`}>{statusMeta.label}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`rounded-md px-2 py-1 text-xs font-bold ${row.isBanner ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"}`}>
                                  {row.isBanner ? "배너" : "일반"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-theme-secondary">{formatDateText(row.startAt)}</td>
                              <td className="px-4 py-3 text-xs text-theme-secondary">{formatDateText(row.endAt)}</td>
                              <td className="px-4 py-3 text-xs text-theme-secondary">{formatDateText(row.updatedAt)}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  className="rounded-md border border-warm px-3 py-1.5 text-xs font-bold text-theme-secondary hover:bg-theme"
                                  type="button"
                                  onClick={() => router.push(`/mypage/admin/notices/${row.id}/edit`)}
                                >
                                  수정
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : null}
                </div>

                {adminNoticesPayload ? (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      className="rounded-md border border-warm bg-white px-4 py-2 text-xs font-bold text-theme-secondary disabled:opacity-50"
                      type="button"
                      disabled={adminNoticesPayload.page <= 0 || adminNoticesLoading}
                      onClick={() => void loadAdminNotices(Math.max(adminNoticesPage - 1, 0))}
                    >
                      이전
                    </button>
                    <span className="text-xs text-theme-secondary">
                      {adminNoticesPayload.page + 1} / {Math.max(adminNoticesPayload.totalPages, 1)}
                    </span>
                    <button
                      className="rounded-md border border-warm bg-white px-4 py-2 text-xs font-bold text-theme-secondary disabled:opacity-50"
                      type="button"
                      disabled={adminNoticesPayload.last || adminNoticesLoading}
                      onClick={() => void loadAdminNotices(adminNoticesPage + 1)}
                    >
                      다음
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      </main>

      {editingRsvp ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-warm bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-theme-brand">RSVP 수정</h3>
              <button type="button" className="text-theme-secondary" onClick={() => setEditingRsvp(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-theme-secondary">성함</span>
                <input
                  className="input-premium"
                  value={editingRsvp.name}
                  onChange={(event) => setEditingRsvp((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold text-theme-secondary">비밀번호</span>
                <input
                  type="password"
                  className="input-premium"
                  value={editingRsvp.password}
                  onChange={(event) => setEditingRsvp((prev) => (prev ? { ...prev, password: event.target.value } : prev))}
                  placeholder="등록 시 입력한 비밀번호"
                  maxLength={30}
                />
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold text-theme-secondary">참석 여부</span>
                  <select
                    className="input-premium"
                    value={String(editingRsvp.attending)}
                    onChange={(event) =>
                      setEditingRsvp((prev) =>
                        prev
                          ? {
                              ...prev,
                              attending: event.target.value === "true",
                              partyCount: event.target.value === "true" ? prev.partyCount : "",
                            }
                          : prev,
                      )
                    }
                  >
                    <option value="true">참석</option>
                    <option value="false">미참석</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold text-theme-secondary">하객측</span>
                  <select
                    className="input-premium"
                    value={editingRsvp.side}
                    onChange={(event) =>
                      setEditingRsvp((prev) => (prev ? { ...prev, side: event.target.value === "bride" ? "bride" : "groom" } : prev))
                    }
                  >
                    <option value="groom">신랑측</option>
                    <option value="bride">신부측</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold text-theme-secondary">연락처</span>
                  <input
                    className="input-premium"
                    value={editingRsvp.contact}
                    onChange={(event) => setEditingRsvp((prev) => (prev ? { ...prev, contact: event.target.value } : prev))}
                    placeholder="선택 입력"
                    maxLength={40}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold text-theme-secondary">동행 인원</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="input-premium"
                    value={editingRsvp.partyCount}
                    onChange={(event) => setEditingRsvp((prev) => (prev ? { ...prev, partyCount: event.target.value } : prev))}
                    placeholder="선택 입력"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold text-theme-secondary">식사 여부</span>
                  <select
                    className="input-premium"
                    value={editingRsvp.meal}
                    onChange={(event) =>
                      setEditingRsvp((prev) =>
                        prev ? { ...prev, meal: event.target.value as "none" | "yes" | "no" } : prev,
                      )
                    }
                  >
                    <option value="none">미입력</option>
                    <option value="yes">예정</option>
                    <option value="no">안함</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold text-theme-secondary">버스 여부</span>
                  <select
                    className="input-premium"
                    value={editingRsvp.bus}
                    onChange={(event) =>
                      setEditingRsvp((prev) =>
                        prev ? { ...prev, bus: event.target.value as "none" | "yes" | "no" } : prev,
                      )
                    }
                  >
                    <option value="none">미입력</option>
                    <option value="yes">이용</option>
                    <option value="no">미이용</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-semibold text-theme-secondary">메모</span>
                <textarea
                  className="input-premium min-h-24"
                  value={editingRsvp.note}
                  onChange={(event) => setEditingRsvp((prev) => (prev ? { ...prev, note: event.target.value } : prev))}
                />
              </label>

              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-xl border border-warm px-4 py-2 text-xs font-bold text-theme-secondary" onClick={() => setEditingRsvp(null)}>
                  취소
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-theme-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  onClick={() => void updateRsvp()}
                  disabled={savingRsvpId === editingRsvp.id}
                >
                  {savingRsvpId === editingRsvp.id ? "저장중..." : "수정 저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingGuestbook ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-warm bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-theme-brand">방명록 수정</h3>
              <button type="button" className="text-theme-secondary" onClick={() => setEditingGuestbook(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-theme-secondary">작성자</span>
                <input
                  className="input-premium"
                  value={editingGuestbook.name}
                  onChange={(event) => setEditingGuestbook((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-theme-secondary">비밀번호</span>
                <input
                  type="password"
                  className="input-premium"
                  value={editingGuestbook.password}
                  onChange={(event) => setEditingGuestbook((prev) => (prev ? { ...prev, password: event.target.value } : prev))}
                  placeholder="등록 시 입력한 비밀번호"
                  maxLength={30}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-theme-secondary">내용</span>
                <textarea
                  className="input-premium min-h-28"
                  value={editingGuestbook.content}
                  onChange={(event) => setEditingGuestbook((prev) => (prev ? { ...prev, content: event.target.value } : prev))}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-xl border border-warm px-4 py-2 text-xs font-bold text-theme-secondary" onClick={() => setEditingGuestbook(null)}>
                  취소
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-theme-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  onClick={() => void updateGuestbook()}
                  disabled={savingGuestbookId === editingGuestbook.id}
                >
                  {savingGuestbookId === editingGuestbook.id ? "저장중..." : "수정 저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function MyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-theme-secondary">페이지 로딩 중...</div>}>
      <MyPageContent />
    </Suspense>
  );
}
