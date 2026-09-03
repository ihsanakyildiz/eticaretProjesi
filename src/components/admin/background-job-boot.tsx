"use client";

import { useEffect } from "react";

export function BackgroundJobBoot() {
  useEffect(() => {
    void fetch("/api/cron/xml-feeds", { cache: "no-store" });
  }, []);
  return null;
}
