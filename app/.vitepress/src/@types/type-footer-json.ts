/**
 * 官网 footer 共享 JSON 类型（结构与官网 OFooter props 契约对齐）。
 * 数据链路：官网 .content/footer → gen-footer.cjs → public/footer/{zh,en}.json
 * → 本仓 scripts/fetch-footer-json.js 固化到 src/config/footer-data/ → useFooterData。
 * 图片字段为官网站内绝对路径（/footer/images/xxx），dev 走 vite 代理、生产走 nginx 反代。
 */
export interface FooterJsonLinkItemT {
  title: string;
  href: string;
}

export interface FooterJsonNavGroupT {
  title: string;
  children: FooterJsonLinkItemT[];
}

export interface FooterJsonQrcodeT {
  img: string;
  label: string;
}

export interface FooterJsonInfoT {
  title: string;
  logo: string;
  href: string;
}

export interface FooterJsonFriendshipT {
  title: string;
  children: FooterJsonLinkItemT[];
}

export interface FooterJsonLogoT {
  logo: string;
  email: string;
}

export interface FooterJsonOptionT {
  children: FooterJsonLinkItemT[];
  licenseText: string;
  licenseInfo: string;
  copyright: string;
  beianInfo1: string;
  beianInfo2: string;
  beianLink: string;
  policeIcon: string;
}

export interface FooterJsonBgT {
  pc: string;
  mb: string;
}

export interface FooterJsonT {
  info: FooterJsonInfoT;
  quickNav: FooterJsonNavGroupT[];
  qrcode: FooterJsonQrcodeT[];
  friendshipLink: FooterJsonFriendshipT;
  footerLogo: FooterJsonLogoT;
  footerOption: FooterJsonOptionT;
  footer_bg_img: FooterJsonBgT;
}
