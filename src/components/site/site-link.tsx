"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { usePerformance } from "@/components/site/performance-provider";

type SiteLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children?: ReactNode;
  };

export function SiteLink({ prefetch, children, ...props }: SiteLinkProps) {
  const perf = usePerformance();
  return (
    <Link prefetch={prefetch ?? perf.prefetchLinks} {...props}>
      {children}
    </Link>
  );
}
