"use client";

import Image from "next/image";
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  FileArchive,
  FileAudio,
  FileText,
  FileVideo,
  ImageIcon,
  LoaderCircle,
  LockKeyhole,
  MessageCircleMore,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n";
import type { ChatAttachment, ParsedChat } from "@/lib/types";
import { parseWhatsAppZip, revokeChatUrls } from "@/lib/whatsapp";

type AppStatus = "idle" | "reading" | "ready" | "generating" | "error";

function formatFileSize(bytes: number, locale: Locale) {
  const numberFormat = new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-BR", { maximumFractionDigits: 1 });
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${numberFormat.format(bytes / 1024)} KB`;
  return `${numberFormat.format(bytes / (1024 * 1024))} MB`;
}

function inferOwner(chat: ParsedChat) {
  const normalizedTitle = chat.title.replace(/\D/g, "");
  const candidate = chat.participants.find((participant) => {
    const normalizedParticipant = participant.replace(/\D/g, "");
    return normalizedTitle && normalizedParticipant && !normalizedParticipant.includes(normalizedTitle);
  });
  return candidate ?? chat.participants.at(-1) ?? "";
}

function attachmentIcon(attachment: ChatAttachment) {
  if (attachment.category === "audio") return <FileAudio aria-hidden="true" />;
  if (attachment.category === "video") return <FileVideo aria-hidden="true" />;
  if (attachment.category === "image") return <ImageIcon aria-hidden="true" />;
  return <FileText aria-hidden="true" />;
}

export function WhatsAppConverter({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [status, setStatus] = useState<AppStatus>("idle");
  const [chat, setChat] = useState<ParsedChat | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [includeImages, setIncludeImages] = useState(true);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<ParsedChat | null>(null);
  const copy = dictionaries[locale];

  useEffect(() => {
    document.documentElement.lang = copy.htmlLang;
    document.title = copy.metaTitle;
  }, [copy.htmlLang, copy.metaTitle]);

  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  useEffect(() => () => revokeChatUrls(chatRef.current), []);

  const processFile = useCallback(async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setStatus("error");
      setError(copy.invalidZip);
      return;
    }

    setStatus("reading");
    setError("");
    try {
      const parsed = await parseWhatsAppZip(file, locale);
      revokeChatUrls(chatRef.current);
      setChat(parsed);
      setTitle(parsed.title);
      setOwner(inferOwner(parsed));
      if (parsed.detectedLocale === "en") setLocale("en");
      setStatus("ready");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : copy.genericOpenError);
    }
  }, [copy.genericOpenError, copy.invalidZip, locale]);

  const reset = useCallback(() => {
    revokeChatUrls(chatRef.current);
    setChat(null);
    setTitle("");
    setOwner("");
    setError("");
    setProgress(0);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const downloadPdf = useCallback(async () => {
    if (!chat || !owner) return;
    setStatus("generating");
    setProgress(0);
    setError("");
    try {
      const { generateChatPdf } = await import("@/lib/pdf");
      await generateChatPdf(chat, { title, owner, includeImages, includeMedia, locale }, setProgress);
      setStatus("ready");
    } catch (cause) {
      setStatus("ready");
      setError(cause instanceof Error ? cause.message : copy.genericPdfError);
    }
  }, [chat, copy.genericPdfError, includeImages, includeMedia, locale, owner, title]);

  const changeLocale = useCallback((nextLocale: Locale) => {
    setLocale(nextLocale);
    setError("");
  }, []);

  const previewMessages = useMemo(() => chat?.messages.slice(0, 80) ?? [], [chat]);
  const currentStep = chat ? (status === "generating" ? 3 : 2) : 1;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label={copy.brandHome}>
          <span className="brand-mark"><MessageCircleMore aria-hidden="true" /></span>
          <span>Whats<span>2</span>PDF</span>
        </a>
        <div className="topbar-actions">
          <div className="language-switcher" aria-label="Language / Idioma">
            <button className={locale === "pt" ? "active" : ""} type="button" onClick={() => changeLocale("pt")} aria-pressed={locale === "pt"}>PT</button>
            <button className={locale === "en" ? "active" : ""} type="button" onClick={() => changeLocale("en")} aria-pressed={locale === "en"}>EN</button>
          </div>
          <div className="privacy-pill"><LockKeyhole aria-hidden="true" /> {copy.privacyPill}</div>
        </div>
      </header>

      <main id="top">
        <section className={`hero ${chat ? "hero-compact" : ""}`}>
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
          <div className="hero-inner">
            <div className="eyebrow"><Sparkles aria-hidden="true" /> {copy.eyebrow}</div>
            <h1>{copy.heroLineOne}<br /><em>{copy.heroLineTwo}</em></h1>
            <p>{copy.heroDescription}</p>

            <div className="steps" aria-label={copy.stepsLabel}>
              {copy.steps.map((label, index) => {
                const step = index + 1;
                return (
                  <div className={`step ${currentStep >= step ? "step-active" : ""}`} key={label}>
                    <span>{currentStep > step ? <Check aria-hidden="true" /> : step}</span>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {!chat ? (
          <section className="upload-section" aria-labelledby="upload-title">
            <div
              className={`upload-card ${isDragging ? "is-dragging" : ""}`}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void processFile(event.dataTransfer.files[0]);
              }}
            >
              <div className="upload-icon"><UploadCloud aria-hidden="true" /></div>
              <div>
                <h2 id="upload-title">{copy.uploadTitle}</h2>
                <p>{copy.uploadDescription}</p>
              </div>
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept=".zip,application/zip"
                onChange={(event) => void processFile(event.target.files?.[0])}
              />
              <button className="button button-primary" type="button" onClick={() => inputRef.current?.click()} disabled={status === "reading"}>
                {status === "reading" ? <LoaderCircle className="spin" aria-hidden="true" /> : <FileArchive aria-hidden="true" />}
                {status === "reading" ? copy.reading : copy.selectZip}
              </button>
              <small>{copy.fileLimit}</small>

              {status === "error" && (
                <div className="error-message" role="alert"><X aria-hidden="true" /> {error}</div>
              )}
            </div>

            <div className="trust-row">
              <div><ShieldCheck aria-hidden="true" /><span><strong>{copy.trust[0][0]}</strong>{copy.trust[0][1]}</span></div>
              <div><ImageIcon aria-hidden="true" /><span><strong>{copy.trust[1][0]}</strong>{copy.trust[1][1]}</span></div>
              <div><FileText aria-hidden="true" /><span><strong>{copy.trust[2][0]}</strong>{copy.trust[2][1]}</span></div>
            </div>

            <div className="how-to">
              <div>
                <span className="section-kicker">{copy.howKicker}</span>
                <h2>{copy.howTitle}</h2>
              </div>
              <ol>
                {copy.howSteps.map(([heading, description], index) => (
                  <li key={heading}><span>{index + 1}</span><div><strong>{heading}</strong><p>{description}</p></div></li>
                ))}
              </ol>
            </div>
          </section>
        ) : (
          <section className="workspace" aria-label={copy.workspaceLabel}>
            <aside className="settings-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">{copy.loaded}</span>
                  <h2>{copy.prepare}</h2>
                </div>
                <button className="icon-button" type="button" onClick={reset} title={copy.replaceFile} aria-label={copy.replaceFile}>
                  <RefreshCw aria-hidden="true" />
                </button>
              </div>

              <div className="file-summary">
                <span><FileArchive aria-hidden="true" /></span>
                <div><strong>{chat.sourceName}</strong><small>{copy.messagesFound(chat.messages.length)}</small></div>
                <Check aria-label={copy.validFile} />
              </div>

              <div className="stats-grid">
                <div><MessageCircleMore aria-hidden="true" /><strong>{chat.messages.length}</strong><span>{copy.messages}</span></div>
                <div><ImageIcon aria-hidden="true" /><strong>{chat.imageCount}</strong><span>{copy.photos}</span></div>
                <div><Paperclip aria-hidden="true" /><strong>{chat.attachmentCount}</strong><span>{copy.attachments}</span></div>
              </div>

              <label className="field">
                <span>{copy.documentTitle}</span>
                <input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder={copy.documentPlaceholder} />
              </label>

              <label className="field">
                <span>{copy.whoAreYou}</span>
                <div className="select-wrap">
                  <Users aria-hidden="true" />
                  <select value={owner} onChange={(event) => setOwner(event.target.value)}>
                    <option value="" disabled>{copy.selectName}</option>
                    {chat.participants.map((participant) => <option key={participant}>{participant}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" />
                </div>
                <small>{copy.ownerHint}</small>
              </label>

              <label className="toggle-row">
                <span><strong>{copy.includePhotos}</strong><small>{copy.includePhotosHint}</small></span>
                <input type="checkbox" checked={includeImages} onChange={(event) => setIncludeImages(event.target.checked)} />
                <i aria-hidden="true" />
              </label>

              <label className="toggle-row">
                <span><strong>{copy.includeMedia}</strong><small>{copy.includeMediaHint}</small></span>
                <input type="checkbox" checked={includeMedia} onChange={(event) => setIncludeMedia(event.target.checked)} />
                <i aria-hidden="true" />
              </label>

              {chat.warnings.map((warning) => <div className="warning-message" key={warning}>{warning}</div>)}
              {error && <div className="error-message" role="alert"><X aria-hidden="true" /> {error}</div>}

              <button className="button button-download" type="button" onClick={() => void downloadPdf()} disabled={!owner || status === "generating"}>
                {status === "generating" ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowDownToLine aria-hidden="true" />}
                {status === "generating" ? copy.generating(progress) : copy.generate}
              </button>
              {status === "generating" && <div className="progress-track" aria-label={`${copy.generating(progress)}`}><span style={{ width: `${progress}%` }} /></div>}
              <p className="privacy-note"><LockKeyhole aria-hidden="true" /> {copy.nothingSent}</p>
            </aside>

            <div className="preview-panel">
              <div className="preview-heading">
                <div><span className="section-kicker">{copy.preview}</span><h2>{copy.previewTitle}</h2></div>
                <span className="a4-badge">{copy.a4}</span>
              </div>

              <div className="paper-preview">
                <div className="document-header">
                  <span className="document-mark"><MessageCircleMore aria-hidden="true" /></span>
                  <div><strong>{title || copy.documentPlaceholder}</strong><span>{chat.messages.length} {copy.messages} · {chat.startedAt}{chat.endedAt !== chat.startedAt ? ` — ${chat.endedAt}` : ""}</span></div>
                </div>
                <div className="chat-background">
                  {previewMessages.map((message, index) => {
                    const showDate = index === 0 || previewMessages[index - 1].dateKey !== message.dateKey;
                    if (message.isSystem) {
                      return (
                        <div key={message.id}>
                          {showDate && <div className="date-divider"><span>{message.dateLabel}</span></div>}
                          <div className="system-message">{message.text}</div>
                        </div>
                      );
                    }
                    const outgoing = message.author === owner;
                    return (
                      <div key={message.id}>
                        {showDate && <div className="date-divider"><span>{message.dateLabel}</span></div>}
                        <article className={`message-bubble ${outgoing ? "outgoing" : "incoming"}`}>
                          <strong>{message.author}</strong>
                          {message.text && <p>{message.text}</p>}
                          {message.attachments.map((attachment) => (
                            attachment.category === "image" && attachment.previewUrl && includeImages ? (
                              <div className="message-image" key={attachment.name}>
                                <Image src={attachment.previewUrl} alt={copy.imageAlt(attachment.name)} fill sizes="(max-width: 760px) 65vw, 420px" unoptimized />
                              </div>
                            ) : attachment.category === "audio" && attachment.previewUrl ? (
                              <div className="media-card audio-card" key={attachment.name}>
                                <div className="media-card-header">
                                  <FileAudio aria-hidden="true" />
                                  <span><b>{copy.audioMessage}</b><small>{formatFileSize(attachment.size, locale)}</small></span>
                                  <a href={attachment.previewUrl} download={attachment.name} title={copy.downloadOriginal} aria-label={`${copy.downloadOriginal}: ${attachment.name}`}><ArrowDownToLine aria-hidden="true" /></a>
                                </div>
                                <audio controls preload="metadata" src={attachment.previewUrl} />
                              </div>
                            ) : attachment.category === "video" && attachment.previewUrl ? (
                              <div className="media-card video-card" key={attachment.name}>
                                <div className="media-card-header">
                                  <FileVideo aria-hidden="true" />
                                  <span><b>{attachment.name}</b><small>{formatFileSize(attachment.size, locale)}</small></span>
                                  <a href={attachment.previewUrl} download={attachment.name} title={copy.downloadOriginal} aria-label={`${copy.downloadOriginal}: ${attachment.name}`}><ArrowDownToLine aria-hidden="true" /></a>
                                </div>
                                <video controls preload="metadata" src={attachment.previewUrl} />
                              </div>
                            ) : (
                              <div className="attachment-card" key={attachment.name}>
                                {attachmentIcon(attachment)}
                                <span><b>{attachment.category === "audio" ? copy.audioMessage : attachment.name}</b><small>{formatFileSize(attachment.size, locale)}</small></span>
                              </div>
                            )
                          ))}
                          <time>{message.time}</time>
                        </article>
                      </div>
                    );
                  })}
                  {chat.messages.length > previewMessages.length && (
                    <div className="preview-truncated">{copy.fullPdfRemaining(chat.messages.length - previewMessages.length)}</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer>
        <a className="brand brand-footer" href="#top"><span className="brand-mark"><MessageCircleMore aria-hidden="true" /></span><span>Whats<span>2</span>PDF</span></a>
        <p>{copy.footerText}</p>
        <span>{copy.footerPrivacy}</span>
      </footer>
    </div>
  );
}
