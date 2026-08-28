export type SiteNavItem = {
  label: string;
  href: string;
  children?: SiteNavItem[];
};

export type SiteHeaderProps = {
  siteName: string;
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  ctaLabel?: string;
  ctaHref?: string;
  items: SiteNavItem[];
  membershipEnabled?: boolean;
  memberLoggedIn?: boolean;
  memberName?: string | null;
};
