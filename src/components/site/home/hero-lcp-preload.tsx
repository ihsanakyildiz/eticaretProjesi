import { preload } from "react-dom";
import { getWebpCompanion } from "@/lib/uploads";

type HeroLcpPreloadProps = {
  src: string | null | undefined;
};

export function HeroLcpPreload({ src }: HeroLcpPreloadProps) {
  if (!src) return null;

  const webp = getWebpCompanion(src);
  preload(webp ?? src, {
    as: "image",
    fetchPriority: "high",
  });

  return null;
}
