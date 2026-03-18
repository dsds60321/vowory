export type ThankyouMain = {
  imageUrl?: string | null;
  caption?: string | null;
};

export type ThankyouBasicInfo = {
  title: string;
  senderType: "couple" | "parents";
  groomName?: string | null;
  brideName?: string | null;
  groomParentName?: string | null;
  brideParentName?: string | null;
  recipientName?: string | null;
  headingPrefixText?: string | null;
  headingPrefixColor?: string | null;
  headingPrefixFontSize?: number | null;
  headingTitleColor?: string | null;
  headingTitleFontSize?: number | null;
  senderName: string;
  receiverName?: string | null;
  eventDate?: string | null;
};

export type ThankyouEnding = {
  imageUrl?: string | null;
  caption?: string | null;
};

export type ThankyouDetail = {
  bodyText?: string | null;
  ending: ThankyouEnding;
};

export type ThankyouShare = {
  slug?: string | null;
  shareUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
};

export type ThankyouEditorPayload = {
  id: number;
  themeId: string;
  status: "draft" | "published";
  published: boolean;
  main: ThankyouMain;
  basicInfo: ThankyouBasicInfo;
  greetingHtml: string;
  detail: ThankyouDetail;
  share: ThankyouShare;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  themeBackgroundColor?: string | null;
  themeTextColor?: string | null;
  themeAccentColor?: string | null;
  themePattern?: string | null;
  themeEffectType?: string | null;
  themeFontFamily?: string | null;
  themeFontSize?: number | null;
  themeScrollReveal: boolean;
};

export type MyThankyouCardSummary = {
  id: number;
  slug?: string | null;
  published: boolean;
  title: string;
  senderName: string;
  mainImageUrl?: string | null;
  updatedAt?: string | null;
};

export type ThankyouPublishResponse = {
  thankyouId: number;
  slug: string;
  shareUrl: string;
};
