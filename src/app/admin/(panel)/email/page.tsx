import type { Metadata } from "next";
import { EmailWorkspace } from "@/components/admin/email/email-workspace";
import {
  MAIL_FOLDER_MAP,
  MAIL_LABELS,
  resolveMailFolderKey,
  resolveMailLabelKey,
} from "@/lib/mail";
import {
  ensureDemoMailMessages,
  getMailFolderCounts,
  getMailMessageDetail,
  listMailMessagesPage,
} from "@/lib/mail-queries";
import { relinkOrphanMailReplies } from "@/lib/mail-imap-sync";

export const metadata: Metadata = {
  title: "E-posta",
  description: "Gelen kutusu, gönderilenler ve iletişim mesajları",
};

type EmailPageProps = {
  searchParams: Promise<{
    folder?: string;
    label?: string;
    id?: string;
    q?: string;
  }>;
};

export default async function AdminEmailPage({ searchParams }: EmailPageProps) {
  const params = await searchParams;

  const folder = resolveMailFolderKey(params.folder);
  const label = resolveMailLabelKey(params.label);
  const query = (params.q ?? "").trim();
  const selectedId = (params.id ?? "").trim() || null;

  // Daha önce parent’sız düşmüş Re: mesajlarını yazışmaya bağla (IMAP yok)
  await relinkOrphanMailReplies(30).catch(() => 0);

  const [messagePage, counts, mailDetail] = await Promise.all([
    listMailMessagesPage({ folder, label, q: query }),
    getMailFolderCounts(),
    selectedId ? getMailMessageDetail(selectedId) : Promise.resolve(null),
    ensureDemoMailMessages(),
  ]);

  const labelMeta = label ? MAIL_LABELS.find((item) => item.key === label) : null;
  const folderTitle = labelMeta
    ? labelMeta.label
    : MAIL_FOLDER_MAP[folder].title;

  return (
    <EmailWorkspace
      folder={folder}
      label={label}
      selectedId={selectedId}
      query={query}
      messages={messagePage.items}
      nextCursor={messagePage.nextCursor}
      hasMore={messagePage.hasMore}
      selected={mailDetail?.message ?? null}
      thread={mailDetail?.thread ?? []}
      attachments={mailDetail?.attachments ?? []}
      counts={counts}
      folderTitle={folderTitle}
    />
  );
}
