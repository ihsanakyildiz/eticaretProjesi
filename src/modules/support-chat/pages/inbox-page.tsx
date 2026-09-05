import { Suspense } from "react";
import { after } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { SupportChatErrorBoundary } from "@/modules/support-chat/components/error-boundary";
import { SupportChatInboxShell } from "@/modules/support-chat/components/inbox-shell";
import { startSupportChatCustomerBackfill } from "@/modules/support-chat/customer-profiles";
import {
  countOwnSupportChatInboxWorkload,
  listAssignableStaff,
  listSupportChatConversations,
  listSupportChatDepartments,
  listSupportChatReplies,
  listSupportChatStaffDepartmentIdsByUser,
  listSupportChatTags,
} from "@/modules/support-chat/db";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import { startMetaInboxSync } from "@/modules/support-chat/meta-sync";

export async function SupportChatInboxPage() {
  try {
    const licensed = await isSupportChatLicensed();
    const session = await getAdminSession();
    const userId = session?.user?.id ?? "";
    if (licensed) {
      after(() => {
        startMetaInboxSync();
        startSupportChatCustomerBackfill();
      });
    }
    const [conversations, replies, tags, staff, departments, ownWorkload] = licensed
      ? await Promise.all([
          listSupportChatConversations(),
          listSupportChatReplies(),
          listSupportChatTags(),
          listAssignableStaff(),
          listSupportChatDepartments(),
          countOwnSupportChatInboxWorkload(userId),
        ])
      : [[], [], [], [], [], { assignedInbox: 0, unreadInbox: 0 }];
    const staffDepartmentIds = licensed
      ? await listSupportChatStaffDepartmentIdsByUser([
          userId,
          ...staff.map((person) => person.id),
        ])
      : {};
    return (
      <SupportChatErrorBoundary>
        <Suspense
          fallback={
            <div className="grid h-full place-items-center text-sm text-slate-400">Gelen kutusu yükleniyor...</div>
          }
        >
          <SupportChatInboxShell
            conversations={conversations}
            replies={replies}
            tags={tags}
            staff={staff}
            departments={departments}
            staffDepartmentIds={staffDepartmentIds}
            live={licensed}
            currentUserId={userId}
            currentUserName={session?.user?.name ?? "Benim"}
            ownAssignedInboxCount={ownWorkload.assignedInbox}
            ownUnreadInboxCount={ownWorkload.unreadInbox}
          />
        </Suspense>
      </SupportChatErrorBoundary>
    );
  } catch {
    return (
      <div className="grid h-full place-items-center p-6 text-sm text-slate-500">
        Sohbet modülü şu an yüklenemedi. Mağaza etkilenmez.
      </div>
    );
  }
}
