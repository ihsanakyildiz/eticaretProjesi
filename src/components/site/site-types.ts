export type SiteNavItem = {
  label: string;
  href: string;
  children?: SiteNavItem[];
};

export type SiteCategoryNavItem = {
  label: string;
  href: string;
  image?: string | null;
  children?: SiteCategoryNavItem[];
};

export type SiteHeaderProps = {
  siteName: string;
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  ctaLabel?: string;
  ctaHref?: string;
  pageItems: SiteNavItem[];
  categoryItems: SiteCategoryNavItem[];
  membershipEnabled?: boolean;
  memberLoggedIn?: boolean;
  memberName?: string | null;
};
