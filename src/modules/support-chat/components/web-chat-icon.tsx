import {
  Bot,
  Headphones,
  Heart,
  HelpCircle,
  LifeBuoy,
  MessageCircle,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import type { WebChatIcon } from "@/modules/support-chat/web-chat-appearance";

export function WebChatGlyph({
  icon,
  className,
}: {
  icon: WebChatIcon;
  className?: string;
}) {
  switch (icon) {
    case "message":
      return <MessageCircle className={className} />;
    case "messages":
      return <MessagesSquare className={className} />;
    case "headset":
      return <Headphones className={className} />;
    case "help":
      return <HelpCircle className={className} />;
    case "sparkles":
      return <Sparkles className={className} />;
    case "heart":
      return <Heart className={className} />;
    case "bot":
      return <Bot className={className} />;
    case "lifebuoy":
      return <LifeBuoy className={className} />;
    default: {
      const _exhaustive: never = icon;
      return _exhaustive;
    }
  }
}
