import "server-only";

import { graphGet, graphGetMaybe, META_GRAPH_VERSION } from "@/modules/support-chat/meta-oauth";
import { downloadRemoteMediaUrl } from "@/modules/support-chat/media";
import type { SupportChatChannel } from "@/modules/support-chat/kinds";

export type SupportChatPostSource = {
  url: string;
  title: string;
  image: string | null;
};

function snippet(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > 140 ? `${clean.slice(0, 137)}…` : clean;
}

function firstHttpsUrl(value: unknown): string {
  return typeof value === "string" && /^https?:\/\//.test(value) ? value : "";
}

export function facebookPostFallbackUrl(postId: string, commentId = "") {
  const id = postId.trim();
  if (!id) return "";
  const commentPart = commentId.includes("_") ? commentId.split("_").pop() : commentId.trim();
  if (id.includes("_")) {
    const [pageId, storyId] = id.split("_");
    const url = `https://www.facebook.com/${pageId}/posts/${storyId}`;
    return commentPart ? `${url}?comment_id=${commentPart}` : url;
  }
  return `https://www.facebook.com/${id}`;
}

async function persistPreviewImage(remoteUrl: string, token: string, graphObjectId = "") {
  if (remoteUrl.startsWith("/uploads/")) return remoteUrl;
  const urls = [remoteUrl];
  if (graphObjectId && token) {
    urls.push(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(graphObjectId)}/picture?type=large`,
    );
  }
  for (const url of urls.filter(Boolean)) {
    const saved = await downloadRemoteMediaUrl({
      url,
      tokens: token ? [token] : [],
      kind: "image",
      fileName: "post-preview.jpg",
    });
    if (saved?.src) return saved.src;
  }
  return remoteUrl.length <= 500 ? remoteUrl : null;
}

function facebookLookupIds(pageId: string, postId: string, commentId: string) {
  const parts: string[] = [];
  const seenParts = new Set<string>();
  const addPart = (value: string) => {
    const id = value.trim();
    if (!id || seenParts.has(id)) return;
    seenParts.add(id);
    parts.push(id);
  };
  for (const raw of [commentId, postId]) {
    const value = raw.trim();
    if (!value) continue;
    addPart(value);
    for (const part of value.split("_")) addPart(part);
  }

  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ordered.push(id);
  };
  if (pageId) {
    for (const raw of [commentId, postId]) {
      const left = raw.trim().split("_")[0] ?? "";
      if (left) push(`${pageId}_${left}`);
    }
    for (const id of parts) {
      if (id.startsWith(`${pageId}_`)) push(id);
      else push(`${pageId}_${id}`);
    }
  }
  for (const id of parts) push(id);
  return ordered;
}

type FacebookPostFields = {
  id?: string;
  message?: string;
  full_picture?: string;
  picture?: string;
  permalink_url?: string;
};

type InstagramMediaFields = {
  id?: string;
  permalink?: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  media_type?: string;
  shortcode?: string;
  media?: InstagramMediaFields;
};

function instagramPreviewImage(json: InstagramMediaFields) {
  const video = json.media_type === "VIDEO" || json.media_type === "REELS";
  if (video) {
    return firstHttpsUrl(json.thumbnail_url) || firstHttpsUrl(json.media_url);
  }
  return firstHttpsUrl(json.media_url) || firstHttpsUrl(json.thumbnail_url);
}

function instagramFallbackUrl(shortcode: string) {
  const code = shortcode.trim();
  if (!code) return "";
  return `https://www.instagram.com/p/${encodeURIComponent(code)}/`;
}

async function fetchInstagramMedia(token: string, mediaId: string) {
  const id = mediaId.trim();
  if (!id || !token) return null;
  return graphGetMaybe<InstagramMediaFields>(`/${id}`, token, {
    fields: "id,permalink,caption,media_url,thumbnail_url,media_type,shortcode",
  });
}

async function fetchInstagramMediaFromComment(token: string, commentId: string) {
  const id = commentId.trim();
  if (!id || !token) return null;
  const json = await graphGetMaybe<InstagramMediaFields & { media?: InstagramMediaFields | { id?: string } }>(
    `/${id}`,
    token,
    {
      fields:
        "id,text,media{id,permalink,caption,media_url,thumbnail_url,media_type,shortcode}",
    },
  );
  if (!json) return null;
  const media = json.media;
  if (media && ("permalink" in media || "media_url" in media || "caption" in media)) {
    return media as InstagramMediaFields;
  }
  const nestedId = media && "id" in media ? String(media.id ?? "").trim() : "";
  if (nestedId) return fetchInstagramMedia(token, nestedId);
  return json.permalink || json.media_url ? json : null;
}

function applyInstagramMedia(
  json: InstagramMediaFields,
  current: { url: string; title: string; image: string; objectId: string },
) {
  const media = json.media ?? json;
  return {
    url:
      current.url ||
      firstHttpsUrl(media.permalink) ||
      firstHttpsUrl(json.permalink) ||
      instagramFallbackUrl(media.shortcode ?? json.shortcode ?? ""),
    title: current.title || snippet(media.caption ?? json.caption ?? ""),
    image: current.image || instagramPreviewImage(media) || instagramPreviewImage(json),
    objectId: current.objectId || media.id?.trim() || json.id?.trim() || "",
  };
}

function applyFacebookPost(
  json: FacebookPostFields,
  current: { url: string; title: string; image: string; objectId: string },
) {
  return {
    url: current.url || firstHttpsUrl(json.permalink_url) || current.url,
    title: current.title || snippet(json.message ?? ""),
    image:
      current.image ||
      firstHttpsUrl(json.full_picture) ||
      firstHttpsUrl(json.picture),
    objectId: current.objectId || json.id?.trim() || "",
  };
}

async function findFacebookPagePost(pageId: string, token: string, candidates: string[]) {
  const needles = new Set(candidates.filter(Boolean));
  let after = "";
  for (let page = 0; page < 4; page += 1) {
    const json = await graphGetMaybe<{
      data?: FacebookPostFields[];
      paging?: { cursors?: { after?: string } };
    }>(`/${pageId}/posts`, token, {
      fields: "id,message,full_picture,picture,permalink_url",
      limit: "25",
      ...(after ? { after } : {}),
    });
    if (!json?.data?.length) break;
    const found = json.data.find((post) => {
      const id = post.id ?? "";
      const permalink = post.permalink_url ?? "";
      return [...needles].some(
        (needle) =>
          id === needle ||
          id.endsWith(`_${needle}`) ||
          permalink.includes(needle),
      );
    });
    if (found) return found;
    after = json.paging?.cursors?.after ?? "";
    if (!after) break;
  }
  return null;
}

export async function materializeKnownPostSource(input: {
  token: string;
  url: string;
  title?: string;
  image?: string;
}): Promise<SupportChatPostSource | null> {
  const url = input.url.trim();
  if (!url) return null;
  const storedImage = input.image ? await persistPreviewImage(input.image, input.token) : null;
  return {
    url: url.slice(0, 500),
    title: (snippet(input.title ?? "") || "Gönderiyi aç").slice(0, 191),
    image: storedImage,
  };
}

export async function resolveSocialPostSource(input: {
  channel: SupportChatChannel;
  token: string;
  pageId?: string;
  postId: string;
  commentId: string;
  permalink?: string;
  postMessage?: string;
  postImage?: string;
}): Promise<SupportChatPostSource | null> {
  switch (input.channel) {
    case "FACEBOOK_POST":
    case "INSTAGRAM_POST":
      break;
    case "FACEBOOK_MESSENGER":
    case "INSTAGRAM_DM":
    case "WHATSAPP":
    case "TELEGRAM":
    case "TIKTOK":
    case "WEB":
      return null;
    default: {
      const _exhaustive: never = input.channel;
      return _exhaustive;
    }
  }

  let url = input.permalink?.trim() ?? "";
  let title = snippet(input.postMessage ?? "");
  let image = firstHttpsUrl(input.postImage);
  let objectId = "";

  if (input.token) {
    try {
      if (input.channel === "FACEBOOK_POST") {
        const pageId = input.pageId?.trim() ?? "";
        const candidates = facebookLookupIds(pageId, input.postId, input.commentId);
        for (const target of candidates) {
          const json = await graphGetMaybe<FacebookPostFields & { post?: FacebookPostFields }>(
            `/${target}`,
            input.token,
            { fields: "id,message,full_picture,picture,permalink_url,post{permalink_url,message,full_picture,picture}" },
          );
          if (!json) continue;
          const applied = applyFacebookPost(json.post ?? json, { url, title, image, objectId });
          url = applied.url;
          title = applied.title;
          image = applied.image;
          objectId = applied.objectId;
          if (url && (image || objectId)) break;
        }
        if ((!url || !image) && pageId) {
          const post = await findFacebookPagePost(pageId, input.token, candidates);
          if (post) {
            const applied = applyFacebookPost(post, { url, title, image, objectId });
            url = applied.url;
            title = applied.title;
            image = applied.image;
            objectId = applied.objectId;
          }
        }
      } else {
        const mediaIds = [input.postId].map((value) => value.trim()).filter(Boolean);
        const commentIds = [input.commentId].map((value) => value.trim()).filter(Boolean);
        for (const mediaId of mediaIds) {
          const json = await fetchInstagramMedia(input.token, mediaId);
          if (!json) continue;
          const applied = applyInstagramMedia(json, { url, title, image, objectId });
          url = applied.url;
          title = applied.title;
          image = applied.image;
          objectId = applied.objectId;
          if (url && (image || title)) break;
        }
        if (!url || !image) {
          for (const commentId of commentIds) {
            const json = await fetchInstagramMediaFromComment(input.token, commentId);
            if (!json) continue;
            const applied = applyInstagramMedia(json, { url, title, image, objectId });
            url = applied.url;
            title = applied.title;
            image = applied.image;
            objectId = applied.objectId;
            if (url && (image || title)) break;
          }
        }
      }
    } catch {
      /* try oEmbed / fallback */
    }
  }

  if (input.token && url && (!title || !image)) {
    try {
      const path = input.channel === "INSTAGRAM_POST" ? "/instagram_oembed" : "/oembed_post";
      const embed = await graphGet<{ thumbnail_url?: string; title?: string; author_name?: string }>(
        path,
        input.token,
        { url, omitscript: "true" },
      );
      title = title || snippet(embed.title || embed.author_name || "");
      image = image || firstHttpsUrl(embed.thumbnail_url);
    } catch {
      /* keep what we have */
    }
  }

  if (!url && input.channel === "FACEBOOK_POST") {
    url = facebookPostFallbackUrl(input.postId || input.commentId, input.commentId);
  }
  if (!url) return null;
  const storedImage = await persistPreviewImage(image, input.token, objectId);
  return {
    url: url.slice(0, 500),
    title: (title || "Gönderiyi aç").slice(0, 191),
    image: storedImage,
  };
}
