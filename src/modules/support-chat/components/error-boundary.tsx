"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class SupportChatErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Sohbet modülünde beklenmeyen bir hata oluştu. Mağaza ve diğer admin sayfaları etkilenmez.
          Ayarlar → Sohbet Ayarları → Ayarlar üzerinden modülü kontrol edin.
        </div>
      );
    }
    return this.props.children;
  }
}
