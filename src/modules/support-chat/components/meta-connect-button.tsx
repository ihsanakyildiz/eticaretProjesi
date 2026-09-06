export function SupportChatMetaConnectButton({ configured }: { configured: boolean }) {
  return (
    <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Meta ile bağlan</h2>
      <p className="mt-1 text-xs text-slate-500">
        Facebook ile giriş yapın, kendi sayfa, Instagram ve WhatsApp Business hesaplarınızı seçin.
        Seçilen hesaplar doğrudan bu projeye bağlanır.
      </p>
      {configured ? (
        <form action="/api/support-chat/meta/start" method="get" className="mt-4">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#166fe5]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M8.5 3.5h7A5 5 0 0 1 20.5 8.5v7a5 5 0 0 1-5 5h-2.6v-5.4h1.8l.3-2.1h-2.1V11c0-.6.2-1 .9-1h1.3V8c-.2 0-1.1-.1-2-.1-2 0-3.3 1.2-3.3 3.4v1.8H8.4v2.1h1.8V20.5H8.5a5 5 0 0 1-5-5v-7a5 5 0 0 1 5-5Z" />
            </svg>
            Meta ile devam et
          </button>
        </form>
      ) : (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Buton, Meta uygulama bilgileri kaydedildikten sonra açılır.
        </p>
      )}
    </div>
  );
}
