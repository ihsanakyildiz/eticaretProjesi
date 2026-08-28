import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const PUBLIC_ROOT = path.join(process.cwd(), "public");

function sanitizeFilename(name: string) {
  const base = name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return base || "attachment";
}

function extensionFromMime(mimeType: string) {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "application/pdf":
      return ".pdf";
    case "text/plain":
      return ".txt";
    default:
      return "";
  }
}

export type SavedMailAttachment = {
  filename: string;
  mimeType: string;
  size: number;
  contentId: string | null;
  isInline: boolean;
  storagePath: string;
};

export async function saveMailAttachmentBuffer(
  messageId: string,
  input: {
    filename: string;
    mimeType: string;
    content: Buffer;
    contentId?: string | null;
    isInline?: boolean;
  },
): Promise<SavedMailAttachment> {
  const mimeType = input.mimeType || "application/octet-stream";
  const safeName = sanitizeFilename(input.filename);
  const ext = path.extname(safeName) || extensionFromMime(mimeType) || ".bin";
  const base = safeName.replace(/\.[^.]+$/, "") || "attachment";
  const fileName = `${base}-${randomBytes(4).toString("hex")}${ext}`;
  const relativeDir = `uploads/mail/${messageId}`;
  const targetDir = path.join(PUBLIC_ROOT, relativeDir);
  await mkdir(targetDir, { recursive: true });

  const absolutePath = path.join(targetDir, fileName);
  await writeFile(absolutePath, input.content);

  const storagePath = `/${relativeDir}/${fileName}`.replace(/\\/g, "/");
  const contentId = input.contentId?.replace(/^<|>$/g, "") || null;

  return {
    filename: input.filename.slice(0, 255),
    mimeType: mimeType.slice(0, 127),
    size: input.content.length,
    contentId,
    isInline: Boolean(input.isInline),
    storagePath,
  };
}

export function replaceCidReferences(
  html: string,
  attachments: Pick<SavedMailAttachment, "contentId" | "storagePath">[],
) {
  let result = html;
  for (const attachment of attachments) {
    if (!attachment.contentId) continue;
    const cid = attachment.contentId.replace(/^<|>$/g, "");
    const patterns = [
      new RegExp(`cid:${escapeRegExp(cid)}`, "gi"),
      new RegExp(`cid:&lt;${escapeRegExp(cid)}&gt;`, "gi"),
    ];
    for (const pattern of patterns) {
      result = result.replace(pattern, attachment.storagePath);
    }
  }
  return result;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function persistMailAttachments(
  messageId: string,
  attachments: SavedMailAttachment[],
) {
  if (attachments.length === 0) return;

  await prisma.mailAttachment.createMany({
    data: attachments.map((item) => ({
      messageId,
      filename: item.filename,
      mimeType: item.mimeType,
      size: item.size,
      contentId: item.contentId,
      isInline: item.isInline,
      storagePath: item.storagePath,
    })),
    skipDuplicates: true,
  });
}

export type MailAttachmentView = {
  id: string;
  messageId: string;
  filename: string;
  mimeType: string;
  size: number;
  isInline: boolean;
  url: string;
};

export function toMailAttachmentView(row: {
  id: string;
  messageId: string;
  filename: string;
  mimeType: string;
  size: number;
  isInline: boolean;
  storagePath: string;
}): MailAttachmentView {
  return {
    id: row.id,
    messageId: row.messageId,
    filename: row.filename,
    mimeType: row.mimeType,
    size: row.size,
    isInline: row.isInline,
    url: row.storagePath,
  };
}
