export interface HomeBannerItemT {
  title: string;
  desc: string;
  href: string;
  bg_light: string;
  bg_dark: string;
  bg_mb_light: string;
  bg_mb_dark: string;
  dropdown?: string;
}

export interface HomeRecommendT {
  title: string;
  columns: number;
  columns_mb: number;
  items: HomeBannerItemT[];
}

export interface HomeSectionItemT {
  title: string;
  desc: string;
  href: string;
  icon?: string;
  bg?: string;
}

export interface HomeSectionT {
  title: string;
  columns: number;
  columns_mb: number;
  items: HomeSectionItemT[];
}

export interface HomeConfig {
  hots: string[];
  recommend: HomeRecommendT;
  sections: HomeSectionT[];
}
