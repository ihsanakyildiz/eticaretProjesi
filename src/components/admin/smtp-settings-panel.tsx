"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Loader2, Send } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  SMTP_PROVIDER_PRESETS,
  getSmtpProviderPreset,
  resolveSmtpProviderId,
  type SmtpProviderId,
} from "@/config/smtp-providers";
import {
  sendSmtpTestEmailAction,
  type MailTestState,
} from "@/app/admin/(panel)/settings/mail-actions";
import {
  resolveMailInboxFilterMode,
  type MailInboxFilterMode,
} from "@/config/mail-inbox";

type SmtpSettingsPanelProps = {
  values: Record<string, string>;
};

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

const lockedInputClass = `${inputClass} cursor-default bg-slate-50 text-slate-700 focus:border-[#e9ebec] focus:ring-0`;

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{children}</p>;
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="md:col-span-2 border-t border-[#e9ebec] pt-5">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export function SmtpSettingsPanel({ values }: SmtpSettingsPanelProps) {
  const initialProvider = resolveSmtpProviderId(values.smtp_provider);
  const [providerId, setProviderId] = useState<SmtpProviderId>(initialProvider);
  const preset = useMemo(() => getSmtpProviderPreset(providerId), [providerId]);

  const [host, setHost] = useState(() => values.smtp_host || "");
  const [port, setPort] = useState(() => values.smtp_port || "587");
  const [secure, setSecure] = useState(() => values.smtp_secure === "true");
  const [enabled, setEnabled] = useState(() => values.smtp_enabled === "true");
  const [user, setUser] = useState(() => {
    if (values.smtp_user) return values.smtp_user;
    return initialProvider === "sendgrid" ? "apikey" : "";
  });

  const [storeContact, setStoreContact] = useState(
    () => values.mail_store_contact_messages !== "false",
  );
  const [imapEnabled, setImapEnabled] = useState(() => values.imap_enabled === "true");
  const [imapSameAsSmtp, setImapSameAsSmtp] = useState(
    () => values.imap_same_as_smtp !== "false",
  );
  const [imapHost, setImapHost] = useState(() => values.imap_host || "");
  const [imapPort, setImapPort] = useState(() => values.imap_port || "993");
  const [imapSecure, setImapSecure] = useState(() => values.imap_secure !== "false");
  const [imapUser, setImapUser] = useState(() => values.imap_user || "");
  const [filterMode, setFilterMode] = useState<MailInboxFilterMode>(() =>
    resolveMailInboxFilterMode(values.mail_inbox_filter_mode),
  );

  const [testTo, setTestTo] = useState(() => values.mail_notify_email || "");
  const [testPending, setTestPending] = useState(false);
  const [testState, setTestState] = useState<MailTestState>({});

  const hasStoredPassword = Boolean(values.smtp_password);
  const hasStoredImapPassword = Boolean(values.imap_password);
  const serverLocked = Boolean(preset.lockServerFields);
  const imapSupported = preset.imapSupported !== false;

  const applyProvider = (nextId: SmtpProviderId) => {
    const next = getSmtpProviderPreset(nextId);
    setProviderId(nextId);

    if (next.id === "custom") {
      if (!port) setPort(String(next.port));
      if (!imapPort) setImapPort(String(next.imapPort ?? 993));
      return;
    }

    setHost(next.host);
    setPort(String(next.port));
    setSecure(next.secure);

    if (next.imapSupported && next.imapHost) {
      setImapHost(next.imapHost);
      setImapPort(String(next.imapPort ?? 993));
      setImapSecure(next.imapSecure !== false);
    } else if (!next.imapSupported) {
      setImapEnabled(false);
    }

    if (next.id === "sendgrid") {
      setUser((current) => (current.trim() ? current : "apikey"));
    }
  };

  const runSmtpTest = async () => {
    setTestPending(true);
    setTestState({});
    try {
      const fd = new FormData();
      fd.set("test_to", testTo);
      const result = await sendSmtpTestEmailAction({}, fd);
      setTestState(result);
    } catch (error) {
      setTestState({
        error: error instanceof Error ? error.message : "Test başarısız.",
      });
    } finally {
      setTestPending(false);
    }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <h3 className="text-sm font-semibold text-slate-800">1) Gönderim (SMTP)</h3>
        <p className="mt-1 text-xs text-slate-500">
          İletişim formu bildirimleri ve admin cevapları bu ayarlarla gönderilir.
        </p>
      </div>

      <div className="md:col-span-2">
        <AdminSwitch
          name="smtp_enabled"
          label="SMTP ile gönderimi aç"
          description="Kapalıyken e-posta gönderilmez."
          checked={enabled}
          onChange={setEnabled}
        />
      </div>

      <div className="md:col-span-2">
        <FieldLabel htmlFor="smtp_provider">E-posta servisi</FieldLabel>
        <select
          id="smtp_provider"
          name="smtp_provider"
          value={providerId}
          onChange={(event) => applyProvider(event.target.value as SmtpProviderId)}
          className={inputClass}
        >
          {SMTP_PROVIDER_PRESETS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <FieldHint>{preset.description}</FieldHint>
      </div>

      <div className="md:col-span-2 rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-4">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {preset.label} — kurulum notları
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          {preset.guide.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div>
        <FieldLabel htmlFor="smtp_host">SMTP Host</FieldLabel>
        <input
          id="smtp_host"
          name="smtp_host"
          type="text"
          value={host}
          onChange={(event) => setHost(event.target.value)}
          readOnly={serverLocked}
          placeholder={preset.host || "mail.ornek.com"}
          className={serverLocked ? lockedInputClass : inputClass}
        />
      </div>

      <div>
        <FieldLabel htmlFor="smtp_port">SMTP Port</FieldLabel>
        <input
          id="smtp_port"
          name="smtp_port"
          type="number"
          min={1}
          max={65535}
          value={port}
          onChange={(event) => setPort(event.target.value)}
          readOnly={serverLocked}
          className={serverLocked ? lockedInputClass : inputClass}
        />
        <FieldHint>
          Önerilen: {preset.port} ({preset.secure ? "SSL" : "STARTTLS"})
        </FieldHint>
      </div>

      <div className="md:col-span-2">
        {serverLocked ? (
          <input type="hidden" name="smtp_secure" value={secure ? "true" : "false"} />
        ) : null}
        <AdminSwitch
          name={serverLocked ? undefined : "smtp_secure"}
          label="SSL / TLS (port 465)"
          description={
            serverLocked
              ? `Bu servis için ${secure ? "açık" : "kapalı"} önerilir.`
              : "Port 465 için açın. Port 587 için genelde kapalı bırakın."
          }
          checked={secure}
          onChange={setSecure}
          disabled={serverLocked}
        />
      </div>

      <div>
        <FieldLabel htmlFor="smtp_user">SMTP Kullanıcı Adı</FieldLabel>
        <input
          id="smtp_user"
          name="smtp_user"
          type="text"
          value={user}
          onChange={(event) => setUser(event.target.value)}
          placeholder={preset.userPlaceholder}
          className={inputClass}
          autoComplete="username"
        />
      </div>

      <div>
        <FieldLabel htmlFor="smtp_password">SMTP Şifresi</FieldLabel>
        <input
          id="smtp_password"
          name="smtp_password"
          type="password"
          autoComplete="new-password"
          defaultValue=""
          placeholder={
            hasStoredPassword
              ? "Kayıtlı şifre korunuyor — değiştirmek için yazın"
              : "••••••••"
          }
          className={inputClass}
        />
        <FieldHint>
          {hasStoredPassword
            ? "Boş bırakırsanız kayıtlı şifre değişmez."
            : preset.passwordHint || "Uygulama şifresi veya SMTP anahtarı"}
        </FieldHint>
      </div>

      <div>
        <FieldLabel htmlFor="mail_from_name">Gönderen Adı</FieldLabel>
        <input
          id="mail_from_name"
          name="mail_from_name"
          type="text"
          defaultValue={values.mail_from_name || "İhsan Akyıldız"}
          placeholder="İhsan Akyıldız"
          className={inputClass}
        />
      </div>

      <div>
        <FieldLabel htmlFor="mail_from_email">Gönderen E-posta</FieldLabel>
        <input
          id="mail_from_email"
          name="mail_from_email"
          type="email"
          defaultValue={values.mail_from_email || ""}
          placeholder="noreply@alanadiniz.com"
          className={inputClass}
        />
      </div>

      <div>
        <FieldLabel htmlFor="mail_notify_email">Bildirim E-postası</FieldLabel>
        <input
          id="mail_notify_email"
          name="mail_notify_email"
          type="email"
          defaultValue={values.mail_notify_email || ""}
          placeholder="admin@alanadiniz.com"
          className={inputClass}
        />
        <FieldHint>İletişim formu bildirimlerinin düşeceği adres</FieldHint>
      </div>

      <div>
        <FieldLabel htmlFor="mail_reply_to">Reply-To (isteğe bağlı)</FieldLabel>
        <input
          id="mail_reply_to"
          name="mail_reply_to"
          type="email"
          defaultValue={values.mail_reply_to || ""}
          placeholder="info@alanadiniz.com"
          className={inputClass}
        />
      </div>

      <div className="md:col-span-2 rounded-lg border border-dashed border-[#cfd4d9] bg-[#fbfcfd] p-4">
        <p className="text-sm font-medium text-slate-800">SMTP bağlantı testi</p>
        <p className="mt-1 text-xs text-slate-500">
          Önce yukarıdaki ayarları kaydedin, sonra test gönderin. Başarılıysa hedef gelen
          kutusunda (ve spam’de) mail görünür.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <FieldLabel htmlFor="smtp_test_to">Test alıcısı</FieldLabel>
            <input
              id="smtp_test_to"
              type="email"
              value={testTo}
              onChange={(event) => setTestTo(event.target.value)}
              placeholder="sizin@eposta.com"
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={() => void runSmtpTest()}
            disabled={testPending}
            className="inline-flex h-[42px] items-center justify-center gap-2 rounded-md bg-[#3577f1] px-4 text-sm font-medium text-white transition hover:bg-[#2f6ae0] disabled:opacity-60"
          >
            {testPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            Test e-postası gönder
          </button>
        </div>
        {testState.error ? (
          <p className="mt-3 text-sm text-rose-600" role="alert">
            {testState.error}
          </p>
        ) : null}
        {testState.success ? (
          <p className="mt-3 text-sm text-emerald-600" role="status">
            {testState.message}
          </p>
        ) : null}
      </div>

      <SectionTitle
        title="2) Admin paneli gelen kutusu"
        description="Hangi mesajların panele düşeceğini buradan seçin. Tasarım bir sonraki adımda yapılacak."
      />

      <div className="md:col-span-2">
        <AdminSwitch
          name="mail_store_contact_messages"
          label="İletişim formu mesajlarını panele kaydet"
          description="Önerilir. Form gönderimleri veritabanına yazılır; okunur ve cevaplanır."
          checked={storeContact}
          onChange={setStoreContact}
        />
      </div>

      <div>
        <FieldLabel htmlFor="mail_contact_subject_prefix">İletişim formu konu öneki</FieldLabel>
        <input
          id="mail_contact_subject_prefix"
          name="mail_contact_subject_prefix"
          type="text"
          defaultValue={values.mail_contact_subject_prefix || "[İletişim Formu]"}
          placeholder="[İletişim Formu]"
          className={inputClass}
        />
        <FieldHint>
          Bildirim maillerinin konusuna eklenir; IMAP filtresiyle de eşleştirilebilir.
        </FieldHint>
      </div>

      <div>
        <FieldLabel htmlFor="mail_inbox_filter_mode">IMAP / panel filtresi</FieldLabel>
        <select
          id="mail_inbox_filter_mode"
          name="mail_inbox_filter_mode"
          value={filterMode}
          onChange={(event) =>
            setFilterMode(event.target.value as MailInboxFilterMode)
          }
          className={inputClass}
        >
          <option value="contact_only">Yalnızca iletişim formu etiketli mailler</option>
          <option value="subject_contains">Konusunda şu metin geçenler</option>
          <option value="to_address">Yalnızca belirli alıcı adresine gelenler</option>
          <option value="all">Klasördeki tüm mailler (önerilmez)</option>
        </select>
        <FieldHint>
          “Tüm mailler” spam ve kişisel postayı da panele çekebilir; dikkatli kullanın.
        </FieldHint>
      </div>

      {(filterMode === "contact_only" || filterMode === "subject_contains") && (
        <div className="md:col-span-2">
          <FieldLabel htmlFor="mail_inbox_subject_filter">Konu filtresi</FieldLabel>
          <input
            id="mail_inbox_subject_filter"
            name="mail_inbox_subject_filter"
            type="text"
            defaultValue={values.mail_inbox_subject_filter || "[İletişim]"}
            placeholder="[İletişim]"
            className={inputClass}
          />
          <FieldHint>
            {filterMode === "contact_only"
              ? "İletişim öneki veya bu metin konu satırında aranır."
              : "Konu satırında bu metin geçen mailler panele alınır."}
          </FieldHint>
        </div>
      )}

      {filterMode === "to_address" ? (
        <div className="md:col-span-2">
          <FieldLabel htmlFor="mail_inbox_to_filter">Alıcı adresi filtresi</FieldLabel>
          <input
            id="mail_inbox_to_filter"
            name="mail_inbox_to_filter"
            type="email"
            defaultValue={values.mail_inbox_to_filter || ""}
            placeholder="info@alanadiniz.com"
            className={inputClass}
          />
          <FieldHint>Yalnızca bu adrese gelen IMAP mailleri panele düşer.</FieldHint>
        </div>
      ) : (
        <input type="hidden" name="mail_inbox_to_filter" value={values.mail_inbox_to_filter || ""} />
      )}

      {filterMode !== "contact_only" && filterMode !== "subject_contains" ? (
        <input
          type="hidden"
          name="mail_inbox_subject_filter"
          value={values.mail_inbox_subject_filter || "[İletişim]"}
        />
      ) : null}

      <SectionTitle
        title="3) Gelen kutu bağlantısı (IMAP)"
        description="Posta kutusundan seçici çekim için. SendGrid/SES gibi yalnızca gönderim servislerinde IMAP yoktur; hosting veya Gmail/Outlook kullanın."
      />

      {!imapSupported ? (
        <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Seçili servis ({preset.label}) gelen kutu okumaz. İletişim formu kayıtları paneli
          besler; IMAP için “Özel / Hosting” veya Gmail/Outlook seçin.
        </div>
      ) : null}

      <div className="md:col-span-2">
        {!imapSupported ? <input type="hidden" name="imap_enabled" value="false" /> : null}
        <AdminSwitch
          name={imapSupported ? "imap_enabled" : undefined}
          label="IMAP ile posta kutusundan çek"
          description="Açıkken filtreye uyan mailler admin paneline senkronlanır (sonraki adımda)."
          checked={imapEnabled && imapSupported}
          onChange={setImapEnabled}
          disabled={!imapSupported}
        />
      </div>

      <div className="md:col-span-2">
        <AdminSwitch
          name="imap_same_as_smtp"
          label="IMAP için SMTP kullanıcı / şifresini kullan"
          description="Aynı hesapla gönderip okuyorsanız açık bırakın."
          checked={imapSameAsSmtp}
          onChange={setImapSameAsSmtp}
          disabled={!imapSupported || !imapEnabled}
        />
      </div>

      <div>
        <FieldLabel htmlFor="imap_host">IMAP Host</FieldLabel>
        <input
          id="imap_host"
          name="imap_host"
          type="text"
          value={imapHost}
          onChange={(event) => setImapHost(event.target.value)}
          readOnly={!imapSupported || (serverLocked && Boolean(preset.imapHost))}
          placeholder={preset.imapHost || "imap.alanadiniz.com"}
          className={
            !imapSupported || (serverLocked && Boolean(preset.imapHost))
              ? lockedInputClass
              : inputClass
          }
          disabled={!imapSupported}
        />
      </div>

      <div>
        <FieldLabel htmlFor="imap_port">IMAP Port</FieldLabel>
        <input
          id="imap_port"
          name="imap_port"
          type="number"
          min={1}
          max={65535}
          value={imapPort}
          onChange={(event) => setImapPort(event.target.value)}
          readOnly={!imapSupported || (serverLocked && Boolean(preset.imapHost))}
          className={
            !imapSupported || (serverLocked && Boolean(preset.imapHost))
              ? lockedInputClass
              : inputClass
          }
          disabled={!imapSupported}
        />
        <FieldHint>Genelde 993 (SSL)</FieldHint>
      </div>

      <div className="md:col-span-2">
        <input type="hidden" name="imap_secure" value={imapSecure ? "true" : "false"} />
        <AdminSwitch
          label="IMAP SSL (port 993)"
          description="Çoğu sağlayıcıda açık olmalıdır."
          checked={imapSecure}
          onChange={setImapSecure}
          disabled={!imapSupported || !imapEnabled || (serverLocked && Boolean(preset.imapHost))}
        />
      </div>

      {!imapSameAsSmtp ? (
        <>
          <div>
            <FieldLabel htmlFor="imap_user">IMAP Kullanıcı Adı</FieldLabel>
            <input
              id="imap_user"
              name="imap_user"
              type="text"
              value={imapUser}
              onChange={(event) => setImapUser(event.target.value)}
              placeholder={preset.userPlaceholder || "info@alanadiniz.com"}
              className={inputClass}
              disabled={!imapSupported || !imapEnabled}
              autoComplete="username"
            />
          </div>
          <div>
            <FieldLabel htmlFor="imap_password">IMAP Şifresi</FieldLabel>
            <input
              id="imap_password"
              name="imap_password"
              type="password"
              autoComplete="new-password"
              defaultValue=""
              placeholder={
                hasStoredImapPassword
                  ? "Kayıtlı şifre korunuyor — değiştirmek için yazın"
                  : "••••••••"
              }
              className={inputClass}
              disabled={!imapSupported || !imapEnabled}
            />
            <FieldHint>
              {hasStoredImapPassword
                ? "Boş bırakırsanız kayıtlı IMAP şifresi değişmez."
                : "SMTP’den farklı bir hesap kullanıyorsanız buraya yazın."}
            </FieldHint>
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="imap_user" value="" />
          <input type="hidden" name="imap_password" value="" />
        </>
      )}

      <div className="md:col-span-2">
        <FieldLabel htmlFor="imap_folder">IMAP Klasörü</FieldLabel>
        <input
          id="imap_folder"
          name="imap_folder"
          type="text"
          defaultValue={values.imap_folder || "INBOX"}
          placeholder="INBOX"
          className={inputClass}
          disabled={!imapSupported || !imapEnabled}
        />
        <FieldHint>Varsayılan: INBOX. Bazı sunucularda “INBOX/Iletisim” gibi alt klasör kullanılabilir.</FieldHint>
      </div>
    </div>
  );
}
