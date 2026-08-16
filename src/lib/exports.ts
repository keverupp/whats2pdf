import JSZip from "jszip";
import type { ChatAttachment, ExportOptions, ParsedChat } from "@/lib/types";

type Asset = {
  attachment: ChatAttachment;
  fileName: string;
  path: string;
};

const exportLabels = {
  pt: {
    search: "Pesquisar na conversa",
    searchPlaceholder: "Digite uma mensagem, nome ou data...",
    messages: "mensagens",
    noResults: "Nenhuma mensagem encontrada.",
    generated: "Exportado e organizado com Whats2PDF",
    openFile: "Abrir arquivo",
    unsupportedAudio: "Seu aplicativo não consegue reproduzir este áudio.",
    unsupportedVideo: "Seu aplicativo não consegue reproduzir este vídeo.",
    htmlReadme: "Extraia todos os arquivos deste ZIP e abra index.html no navegador. Mantenha a pasta media ao lado do arquivo.",
  },
  en: {
    search: "Search this chat",
    searchPlaceholder: "Type a message, name, or date...",
    messages: "messages",
    noResults: "No messages found.",
    generated: "Exported and organized with Whats2PDF",
    openFile: "Open file",
    unsupportedAudio: "Your app cannot play this audio file.",
    unsupportedVideo: "Your app cannot play this video file.",
    htmlReadme: "Extract every file from this ZIP and open index.html in your browser. Keep the media folder next to the file.",
  },
} as const;

const chatStyles = `
:root{color-scheme:light;--brand:#0f5c50;--ink:#172824;--muted:#667772;--line:#dce5e1;--out:#dcf8c6;--bg:#eef2ef}
*{box-sizing:border-box}body{margin:0;color:var(--ink);background:#f7faf8;font-family:Arial,Helvetica,sans-serif;line-height:1.45}
header{position:sticky;top:0;z-index:2;padding:18px max(20px,calc((100% - 900px) * .5));color:#fff;background:var(--brand);box-shadow:0 4px 18px #0d41372b}
.header-inner{display:flex;align-items:center;justify-content:space-between;gap:20px}.title{min-width:0}.title h1{margin:0;font-size:22px;overflow-wrap:anywhere}.title p{margin:4px 0 0;color:#cde4de;font-size:12px}
.search{width:min(310px,42vw);padding:10px 12px;color:var(--ink);background:#fff;border:0;border-radius:9px;font:inherit}
main{max-width:900px;margin:0 auto;padding:25px 20px 60px;background:var(--bg);min-height:100vh;background-image:radial-gradient(circle at 8px 8px,#0f5c500b 1.2px,transparent 1.4px);background-size:22px 22px}
.date{margin:16px 0;display:flex;justify-content:center}.date span,.empty{padding:6px 11px;color:var(--brand);background:#dff2eb;border-radius:8px;font-size:11px;font-weight:700}
.system{max-width:76%;margin:9px auto;padding:7px 10px;color:#62716d;background:#dfe7e4;border-radius:7px;font-size:11px;text-align:center}
.message{position:relative;width:fit-content;min-width:150px;max-width:76%;margin:6px 0;padding:10px 11px 20px;background:#fff;border:1px solid #1f3e370f;border-radius:11px;box-shadow:0 2px 3px #1839320c;overflow-wrap:anywhere}
.message.outgoing{margin-left:auto;background:var(--out)}.author{display:block;margin-bottom:4px;color:#4968b2;font-size:11px}.outgoing .author{color:var(--brand)}.message p{margin:0;font-size:14px;white-space:normal}.message time{position:absolute;right:9px;bottom:5px;color:#7c8b87;font-size:9px}
.attachment{display:block;margin:7px 0 2px;padding:9px;color:var(--brand);background:#ffffffb8;border:1px solid #0f5c501a;border-radius:8px;font-size:11px;text-decoration:none}.attachment small{display:block;margin-top:2px;color:var(--muted)}
.media{width:min(520px,100%);margin:7px 0 2px}.media img,.media video{display:block;width:100%;max-height:540px;object-fit:contain;background:#14201d;border-radius:8px}.media audio{display:block;width:100%}.media-name{display:block;margin-bottom:5px;color:var(--muted);font-size:10px}
.empty{display:none;width:fit-content;margin:30px auto}.footer{padding:22px;color:var(--muted);font-size:10px;text-align:center}
@media(max-width:620px){header{position:static}.header-inner{align-items:stretch;flex-direction:column}.search{width:100%}main{padding-inline:10px}.message{max-width:90%}.title h1{font-size:18px}}
`;

function escapeMarkup(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeBaseName(value: string) {
  return (value || "whatsapp-chat")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "whatsapp-chat";
}

function safeAssetName(value: string, index: number) {
  const dot = value.lastIndexOf(".");
  const rawStem = dot > 0 ? value.slice(0, dot) : value;
  const rawExtension = dot > 0 ? value.slice(dot + 1) : "bin";
  const stem = safeBaseName(rawStem).slice(0, 70) || `file-${index + 1}`;
  const extension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "bin";
  return `${String(index + 1).padStart(3, "0")}-${stem}.${extension}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shouldInclude(attachment: ChatAttachment, options: ExportOptions) {
  if (attachment.category === "image") return options.includeImages;
  if (attachment.category === "audio" || attachment.category === "video") return options.includeMedia;
  return true;
}

function collectAssets(chat: ParsedChat, options: ExportOptions) {
  const unique = new Map<string, ChatAttachment>();
  chat.messages.forEach((message) => {
    message.attachments.forEach((attachment) => {
      if (shouldInclude(attachment, options) && !unique.has(attachment.name)) {
        unique.set(attachment.name, attachment);
      }
    });
  });

  const assets = Array.from(unique.values()).map<Asset>((attachment, index) => {
    const fileName = safeAssetName(attachment.name, index);
    return { attachment, fileName, path: `media/${fileName}` };
  });
  const paths = new Map(assets.map((asset) => [asset.attachment.name, asset.path]));
  return { assets, paths };
}

function renderAttachment(attachment: ChatAttachment, path: string, options: ExportOptions) {
  const labels = exportLabels[options.locale];
  const escapedPath = escapeMarkup(path);
  const escapedName = escapeMarkup(attachment.name);
  const details = `${escapedName} · ${formatFileSize(attachment.size)}`;

  if (attachment.category === "image") {
    return `<figure class="media"><span class="media-name">${details}</span><img src="${escapedPath}" alt="${escapedName}" loading="lazy" /></figure>`;
  }
  if (attachment.category === "audio") {
    return `<figure class="media"><span class="media-name">${details}</span><audio controls="controls" preload="metadata"><source src="${escapedPath}" type="${escapeMarkup(attachment.mimeType)}" />${labels.unsupportedAudio} <a href="${escapedPath}">${labels.openFile}</a></audio></figure>`;
  }
  if (attachment.category === "video") {
    return `<figure class="media"><span class="media-name">${details}</span><video controls="controls" preload="metadata"><source src="${escapedPath}" type="${escapeMarkup(attachment.mimeType)}" />${labels.unsupportedVideo} <a href="${escapedPath}">${labels.openFile}</a></video></figure>`;
  }
  return `<a class="attachment" href="${escapedPath}">${labels.openFile}<small>${details}</small></a>`;
}

function renderMessages(chat: ParsedChat, options: ExportOptions, paths: Map<string, string>) {
  let previousDate = "";
  return chat.messages.map((message) => {
    const date = message.dateKey !== previousDate
      ? `<div class="date"><span>${escapeMarkup(message.dateLabel)}</span></div>`
      : "";
    previousDate = message.dateKey;

    if (message.isSystem) {
      return `${date}<div class="search-item system">${escapeMarkup(message.text).replace(/\n/g, "<br />")}</div>`;
    }

    const outgoing = message.author === options.owner;
    const text = message.text
      ? `<p>${escapeMarkup(message.text).replace(/\n/g, "<br />")}</p>`
      : "";
    const attachments = message.attachments.map((attachment) => {
      const path = paths.get(attachment.name);
      return path ? renderAttachment(attachment, path, options) : "";
    }).join("");

    return `${date}<article class="search-item message ${outgoing ? "outgoing" : "incoming"}">
      ${message.author ? `<strong class="author">${escapeMarkup(message.author)}</strong>` : ""}
      ${text}${attachments}<time>${escapeMarkup(message.time)}</time>
    </article>`;
  }).join("");
}

function renderHtmlDocument(chat: ParsedChat, options: ExportOptions, paths: Map<string, string>) {
  const labels = exportLabels[options.locale];
  const language = options.locale === "en" ? "en" : "pt-BR";
  const title = escapeMarkup(options.title || chat.title);
  const messages = renderMessages(chat, options, paths);
  return `<!doctype html>
<html lang="${language}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${chatStyles}</style></head>
<body>
  <header><div class="header-inner"><div class="title"><h1>${title}</h1><p>${chat.messages.length} ${labels.messages} · ${escapeMarkup(chat.startedAt)}${chat.endedAt !== chat.startedAt ? ` — ${escapeMarkup(chat.endedAt)}` : ""}</p></div><input id="search" class="search" type="search" aria-label="${labels.search}" placeholder="${labels.searchPlaceholder}"></div></header>
  <main id="chat">${messages}<p id="empty" class="empty">${labels.noResults}</p></main>
  <div class="footer">${labels.generated}</div>
  <script>
    const search = document.getElementById('search');
    const items = Array.from(document.querySelectorAll('.search-item'));
    const empty = document.getElementById('empty');
    search.addEventListener('input', () => {
      const query = search.value.toLocaleLowerCase().trim();
      let visible = 0;
      items.forEach((item) => {
        const match = !query || item.textContent.toLocaleLowerCase().includes(query);
        item.style.display = match ? '' : 'none';
        if (match) visible += 1;
      });
      empty.style.display = visible ? 'none' : 'block';
    });
  </script>
</body></html>`;
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function generateInteractiveHtml(
  chat: ParsedChat,
  options: ExportOptions,
  onProgress?: (progress: number) => void,
) {
  const { assets, paths } = collectAssets(chat, options);
  const zip = new JSZip();
  zip.file("index.html", renderHtmlDocument(chat, options, paths));
  zip.file("README.txt", exportLabels[options.locale].htmlReadme);
  assets.forEach((asset) => zip.file(asset.path, asset.attachment.blob));
  onProgress?.(10);
  const blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (metadata) => onProgress?.(10 + Math.round(metadata.percent * 0.9)),
  );
  download(blob, `${safeBaseName(options.title || chat.title)}-interactive-html.zip`);
  onProgress?.(100);
}

function renderEpubDocument(chat: ParsedChat, options: ExportOptions, paths: Map<string, string>) {
  const labels = exportLabels[options.locale];
  const language = options.locale === "en" ? "en" : "pt-BR";
  const title = escapeMarkup(options.title || chat.title);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${language}" lang="${language}">
<head><meta charset="utf-8"/><title>${title}</title><link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body><header><div class="header-inner"><div class="title"><h1>${title}</h1><p>${chat.messages.length} ${labels.messages} · ${escapeMarkup(chat.startedAt)}${chat.endedAt !== chat.startedAt ? ` — ${escapeMarkup(chat.endedAt)}` : ""}</p></div></div></header><main>${renderMessages(chat, options, paths)}</main><div class="footer">${labels.generated}</div></body>
</html>`;
}

export async function generateEpub(
  chat: ParsedChat,
  options: ExportOptions,
  onProgress?: (progress: number) => void,
) {
  const { assets, paths } = collectAssets(chat, options);
  const title = escapeMarkup(options.title || chat.title);
  const language = options.locale === "en" ? "en" : "pt-BR";
  const identifier = `urn:uuid:${crypto.randomUUID()}`;
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const zip = new JSZip();

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  zip.file("OEBPS/styles.css", chatStyles.replace(/position:sticky/g, "position:static"));
  zip.file("OEBPS/chat.xhtml", renderEpubDocument(chat, options, paths));
  zip.file("OEBPS/nav.xhtml", `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}"><head><title>${title}</title></head><body><nav epub:type="toc"><h1>${title}</h1><ol><li><a href="chat.xhtml">${title}</a></li></ol></nav></body></html>`);

  const assetManifest = assets.map((asset, index) =>
    `<item id="asset-${index + 1}" href="${escapeMarkup(asset.path)}" media-type="${escapeMarkup(asset.attachment.mimeType || "application/octet-stream")}"/>`,
  ).join("");
  zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${language}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${identifier}</dc:identifier><dc:title>${title}</dc:title><dc:language>${language}</dc:language><meta property="dcterms:modified">${modified}</meta></metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="chat" href="chat.xhtml" media-type="application/xhtml+xml"/><item id="style" href="styles.css" media-type="text/css"/>${assetManifest}</manifest>
<spine><itemref idref="chat"/></spine></package>`);
  assets.forEach((asset) => zip.file(`OEBPS/${asset.path}`, asset.attachment.blob));
  onProgress?.(10);
  const blob = await zip.generateAsync(
    { type: "blob", mimeType: "application/epub+zip", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (metadata) => onProgress?.(10 + Math.round(metadata.percent * 0.9)),
  );
  download(blob, `${safeBaseName(options.title || chat.title)}.epub`);
  onProgress?.(100);
}
