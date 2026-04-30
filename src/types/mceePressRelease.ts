export type MceeDownloadLink = {
  name: string;
  url: string;
  extension?: string;
  size?: string;
};

export type MceePressRelease = {
  id: string;
  title: string;
  bodyText: string;
  department: string;
  author: string;
  publishedDate: string | null;
  effectiveDate: string | null;
  viewCount: number | null;
  sourceUrl: string;
  downloadLinks: MceeDownloadLink[];
  searchKeyword: string;
  matchedKeywords: string[];
};
