import type { SupportChatChannel } from "@/modules/support-chat/kinds";
import { supportChatChannelLabel } from "@/modules/support-chat/kinds";

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.15 6.4 2.15 11.84c0 1.74.46 3.44 1.34 4.94L2 22l5.38-1.41a10 10 0 0 0 4.66 1.18h.01c5.46 0 9.89-4.4 9.89-9.85C21.94 6.4 17.5 2 12.04 2m0 17.99h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.19.84.85-3.11-.2-.32a8.15 8.15 0 0 1-1.26-4.38c0-4.51 3.7-8.18 8.25-8.18 4.4 0 8.24 3.67 8.24 8.18 0 4.51-3.85 8.3-8.2 8.3m4.52-6.14c-.25-.12-1.46-.72-1.69-.8s-.39-.12-.56.12-.64.8-.79.97-.29.19-.54.06a6.7 6.7 0 0 1-1.98-1.22 7.4 7.4 0 0 1-1.37-1.7c-.14-.25 0-.38.11-.5s.25-.29.37-.43.16-.25.25-.41.04-.31-.02-.43-.56-1.34-.76-1.84-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31s-.86.84-.86 2.05.88 2.38 1 2.54 1.73 2.64 4.2 3.7c.59.25 1.04.41 1.4.52.59.18 1.12.16 1.54.1.47-.07 1.46-.6 1.67-1.17s.21-1.07.15-1.17-.22-.18-.47-.3"
      />
    </svg>
  );
}

function MessengerMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C6.36 2 2 6.13 2 11.7c0 2.88 1.19 5.4 3.14 7.17V22l3.05-1.67c1.18.33 2.44.5 3.81.5 5.64 0 10-4.13 10-9.7S17.64 2 12 2m1.13 12.36-2.54-2.71-4.96 2.71 5.45-5.78 2.6 2.71 4.9-2.71z"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <path
        fill="currentColor"
        d="M14.5 8.5V6.7c0-.77.52-.95 1.1-.95h1.35V3.5h-2.33C11.9 3.5 11 5.2 11 6.95V8.5H9v2.4h2V20h3.5v-9.1h2.33l.32-2.4z"
      />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <path
        fill="currentColor"
        d="M8.5 3h7A5.5 5.5 0 0 1 21 8.5v7A5.5 5.5 0 0 1 15.5 21h-7A5.5 5.5 0 0 1 3 15.5v-7A5.5 5.5 0 0 1 8.5 3m0 1.8A3.7 3.7 0 0 0 4.8 8.5v7a3.7 3.7 0 0 0 3.7 3.7h7a3.7 3.7 0 0 0 3.7-3.7v-7a3.7 3.7 0 0 0-3.7-3.7zm8.35 1.35a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3M12 7.6A4.4 4.4 0 1 1 7.6 12 4.4 4.4 0 0 1 12 7.6m0 1.8A2.6 2.6 0 1 0 14.6 12 2.6 2.6 0 0 0 12 9.4"
      />
    </svg>
  );
}

function TelegramMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <path
        fill="currentColor"
        d="M21.5 4.4 2.9 11.5c-1.27.5-1.26 1.2-.23 1.5l4.77 1.49 1.85 5.67c.22.68.86 1.04 1.4.64.31-.16.54-.42.73-1.02l3.3-3.2 6.86 5.06c1.26.7 2.17.34 2.48-1.17L23 5.7c.32-1.56-.56-2.27-1.5-1.3"
      />
    </svg>
  );
}

function TikTokMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <path
        fill="currentColor"
        d="M14.6 3c.4 2.5 1.8 4.2 4.2 4.4v2.6c-1.45.14-2.77-.32-4.2-1.2v6.55A5.85 5.85 0 1 1 8.2 9.7v2.7a3.2 3.2 0 1 0 2.55 3.14V3z"
      />
    </svg>
  );
}

function WebMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 1.7c1.5 0 2.88.9 4.02 2.3H7.98A7.2 7.2 0 0 1 12 4.7m-5.4 4h10.8c.3.7.5 1.48.58 2.3H5.99A8 8 0 0 1 6.6 8.7m0 6.6c-.3-.7-.5-1.48-.61-2.3h12.02c-.08.82-.28 1.6-.58 2.3zm1.38 1.7h8.04A7.2 7.2 0 0 1 12 19.3a7.2 7.2 0 0 1-4.02-2.3"
      />
    </svg>
  );
}

function channelTone(channel: SupportChatChannel) {
  switch (channel) {
    case "WHATSAPP":
      return { wrap: "bg-[#25D366] text-white", Icon: WhatsAppMark };
    case "FACEBOOK_MESSENGER":
      return { wrap: "bg-[#0084FF] text-white", Icon: MessengerMark };
    case "FACEBOOK_POST":
      return { wrap: "bg-[#1877F2] text-white", Icon: FacebookMark };
    case "INSTAGRAM_DM":
    case "INSTAGRAM_POST":
      return {
        wrap: "bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)] text-white",
        Icon: InstagramMark,
      };
    case "TELEGRAM":
      return { wrap: "bg-[#2AABEE] text-white", Icon: TelegramMark };
    case "TIKTOK":
      return { wrap: "bg-zinc-900 text-white", Icon: TikTokMark };
    case "WEB":
      return { wrap: "bg-slate-600 text-white", Icon: WebMark };
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

export function SupportChatChannelLogo({
  channel,
  className = "h-3.5 w-3.5",
  badge = false,
}: {
  channel: SupportChatChannel;
  className?: string;
  badge?: boolean;
}) {
  const tone = channelTone(channel);
  const Icon = tone.Icon;
  return (
    <span
      title={supportChatChannelLabel(channel)}
      className={`inline-grid shrink-0 place-items-center ${
        badge ? "rounded-full ring-[1.5px] ring-white" : "rounded-[4px]"
      } ${tone.wrap} ${className}`}
    >
      <span className="h-[78%] w-[78%]">
        <Icon />
      </span>
    </span>
  );
}
