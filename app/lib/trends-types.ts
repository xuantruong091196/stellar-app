export interface Niche {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  description: string;
}

export interface TrendItem {
  id: string;
  source: 'REDDIT' | 'TWITTER' | 'PINTEREST' | 'TIKTOK' | 'GOOGLE_TRENDS';
  niche: string;
  keyword: string;
  fullText?: string | null;
  styleRefs?: Array<{ pinUrl: string; imageUrl: string; palette: string[]; styleTags: string[] }> | null;
  sellabilityScore: number;
  visualPotential: number;
  copyrightRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';
  copyrightFlags: string[];
  copyrightSearchHits?: Array<{ title: string; link: string; snippet: string }> | null;
  viralityScore: number;
  emotionTags: string[];
  fetchedAt: string;
}

export interface BrowseResult {
  data: TrendItem[];
  total: number;
  page: number;
  limit: number;
}
