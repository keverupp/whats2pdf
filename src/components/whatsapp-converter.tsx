"use client";

import Image from "next/image";
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  FileArchive,
  FileAudio,
  FileText,
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
import type { ChatAttachment, ParsedChat } from "@/lib/types";
import { parseWhatsAppZip, revokeChatUrls } from "@/lib/whatsapp";

type AppStatus = "idle" | "reading" | "ready" | "generating" | "error";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  if (attachment.category === "image") return <ImageIcon aria-hidden="true" />;
  return <FileText aria-hidden="true" />;
}

export function WhatsAppConverter() {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [chat, setChat] = useState<ParsedChat | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [includeImages, setIncludeImages] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<ParsedChat | null>(null);

  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  useEffect(() => () => revokeChatUrls(chatRef.current), []);

  const processFile = useCallback(async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setStatus("error");
      setError("Escolha o arquivo .zip gerado pelo WhatsApp.");
      return;
    }

    setStatus("reading");
    setError("");
    try {
      const parsed = await parseWhatsAppZip(file);
      revokeChatUrls(chatRef.current);
      setChat(parsed);
      setTitle(parsed.title);
      setOwner(inferOwner(parsed));
      setStatus("ready");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir este arquivo.");
    }
  }, []);

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
      await generateChatPdf(chat, { title, owner, includeImages }, setProgress);
      setStatus("ready");
    } catch (cause) {
      setStatus("ready");
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o PDF.");
    }
  }, [chat, includeImages, owner, title]);

  const previewMessages = useMemo(() => chat?.messages.slice(0, 80) ?? [], [chat]);
  const currentStep = chat ? (status === "generating" ? 3 : 2) : 1;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Whats2PDF — início">
          <span className="brand-mark"><MessageCircleMore aria-hidden="true" /></span>
          <span>Whats<span>2</span>PDF</span>
        </a>
        <div className="privacy-pill"><LockKeyhole aria-hidden="true" /> Seus arquivos não saem do navegador</div>
      </header>

      <main id="top">
        <section className={`hero ${chat ? "hero-compact" : ""}`}>
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
          <div className="hero-inner">
            <div className="eyebrow"><Sparkles aria-hidden="true" /> Simples, privado e organizado</div>
            <h1>Sua conversa do WhatsApp.<br /><em>Bonita no papel.</em></h1>
            <p>Transforme o ZIP exportado pelo WhatsApp em um PDF fácil de ler, com mensagens, fotos, datas e anexos no lugar certo.</p>

            <div className="steps" aria-label="Etapas">
              {["Enviar ZIP", "Revisar", "Baixar PDF"].map((label, index) => {
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
                <h2 id="upload-title">Solte sua conversa aqui</h2>
                <p>Arraste o arquivo ZIP ou selecione no seu dispositivo</p>
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
                {status === "reading" ? "Lendo conversa..." : "Selecionar arquivo ZIP"}
              </button>
              <small>Até 200 MB · fotos, áudios, vídeos e documentos</small>

              {status === "error" && (
                <div className="error-message" role="alert"><X aria-hidden="true" /> {error}</div>
              )}
            </div>

            <div className="trust-row">
              <div><ShieldCheck aria-hidden="true" /><span><strong>100% privado</strong>Processado no seu dispositivo</span></div>
              <div><ImageIcon aria-hidden="true" /><span><strong>Fotos no lugar certo</strong>Mídia junto da mensagem</span></div>
              <div><FileText aria-hidden="true" /><span><strong>PDF organizado</strong>Pronto para guardar ou imprimir</span></div>
            </div>

            <div className="how-to">
              <div>
                <span className="section-kicker">Como exportar</span>
                <h2>Do WhatsApp para o PDF<br />em poucos minutos.</h2>
              </div>
              <ol>
                <li><span>1</span><div><strong>Abra a conversa</strong><p>Toque no nome do contato ou grupo.</p></div></li>
                <li><span>2</span><div><strong>Exporte com mídia</strong><p>Use “Exportar conversa” e inclua os arquivos.</p></div></li>
                <li><span>3</span><div><strong>Envie o ZIP aqui</strong><p>Revise a prévia e baixe seu PDF.</p></div></li>
              </ol>
            </div>
          </section>
        ) : (
          <section className="workspace" aria-label="Revisar e gerar PDF">
            <aside className="settings-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Arquivo carregado</span>
                  <h2>Prepare seu PDF</h2>
                </div>
                <button className="icon-button" type="button" onClick={reset} title="Trocar arquivo" aria-label="Trocar arquivo">
                  <RefreshCw aria-hidden="true" />
                </button>
              </div>

              <div className="file-summary">
                <span><FileArchive aria-hidden="true" /></span>
                <div><strong>{chat.sourceName}</strong><small>{chat.messages.length} mensagens encontradas</small></div>
                <Check aria-label="Arquivo válido" />
              </div>

              <div className="stats-grid">
                <div><MessageCircleMore aria-hidden="true" /><strong>{chat.messages.length}</strong><span>mensagens</span></div>
                <div><ImageIcon aria-hidden="true" /><strong>{chat.imageCount}</strong><span>fotos</span></div>
                <div><Paperclip aria-hidden="true" /><strong>{chat.attachmentCount}</strong><span>anexos</span></div>
              </div>

              <label className="field">
                <span>Título do documento</span>
                <input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="Conversa do WhatsApp" />
              </label>

              <label className="field">
                <span>Quem é você na conversa?</span>
                <div className="select-wrap">
                  <Users aria-hidden="true" />
                  <select value={owner} onChange={(event) => setOwner(event.target.value)}>
                    <option value="" disabled>Selecione seu nome</option>
                    {chat.participants.map((participant) => <option key={participant}>{participant}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" />
                </div>
                <small>Suas mensagens aparecem à direita.</small>
              </label>

              <label className="toggle-row">
                <span><strong>Incluir fotos</strong><small>Adiciona as imagens ao PDF</small></span>
                <input type="checkbox" checked={includeImages} onChange={(event) => setIncludeImages(event.target.checked)} />
                <i aria-hidden="true" />
              </label>

              {chat.warnings.map((warning) => <div className="warning-message" key={warning}>{warning}</div>)}
              {error && <div className="error-message" role="alert"><X aria-hidden="true" /> {error}</div>}

              <button className="button button-download" type="button" onClick={() => void downloadPdf()} disabled={!owner || status === "generating"}>
                {status === "generating" ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowDownToLine aria-hidden="true" />}
                {status === "generating" ? `Gerando PDF · ${progress}%` : "Gerar e baixar PDF"}
              </button>
              {status === "generating" && <div className="progress-track" aria-label={`Progresso: ${progress}%`}><span style={{ width: `${progress}%` }} /></div>}
              <p className="privacy-note"><LockKeyhole aria-hidden="true" /> Nada é enviado ou armazenado.</p>
            </aside>

            <div className="preview-panel">
              <div className="preview-heading">
                <div><span className="section-kicker">Prévia</span><h2>Assim sua conversa vai ficar</h2></div>
                <span className="a4-badge">Formato A4</span>
              </div>

              <div className="paper-preview">
                <div className="document-header">
                  <span className="document-mark"><MessageCircleMore aria-hidden="true" /></span>
                  <div><strong>{title || "Conversa do WhatsApp"}</strong><span>{chat.messages.length} mensagens · {chat.startedAt}{chat.endedAt !== chat.startedAt ? ` a ${chat.endedAt}` : ""}</span></div>
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
                                <Image src={attachment.previewUrl} alt={`Imagem anexada: ${attachment.name}`} fill sizes="(max-width: 760px) 65vw, 420px" unoptimized />
                              </div>
                            ) : (
                              <div className="attachment-card" key={attachment.name}>
                                {attachmentIcon(attachment)}
                                <span><b>{attachment.category === "audio" ? "Mensagem de áudio" : attachment.name}</b><small>{formatFileSize(attachment.size)}</small></span>
                              </div>
                            )
                          ))}
                          <time>{message.time}</time>
                        </article>
                      </div>
                    );
                  })}
                  {chat.messages.length > previewMessages.length && (
                    <div className="preview-truncated">+ {chat.messages.length - previewMessages.length} mensagens no PDF completo</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer>
        <a className="brand brand-footer" href="#top"><span className="brand-mark"><MessageCircleMore aria-hidden="true" /></span><span>Whats<span>2</span>PDF</span></a>
        <p>Feito para organizar memórias, registros e conversas importantes.</p>
        <span>Privacidade por princípio.</span>
      </footer>
    </div>
  );
}
