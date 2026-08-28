import { buildSiteThemeCss } from "@/lib/site-theme";

type SiteThemeStylesProps = {
  settings: Record<string, string>;
};

export function SiteThemeStyles({ settings }: SiteThemeStylesProps) {
  const css = buildSiteThemeCss(settings);
  return <style id="site-theme-vars" dangerouslySetInnerHTML={{ __html: css }} />;
}
