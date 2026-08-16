import JSZip from "jszip";
import type {
  AttachmentCategory,
  ChatAttachment,
  ChatMessage,
  ParsedChat,
} from "@/lib/types";

const MESSAGE_START = /^\s*[\u200e\u200f]?\[?(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4})(?:,?\s+)(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:[ap]\.?\s*m\.?|da\s+(?:manhã|tarde|noite)))?)\]?\s*[-–]\s*(.*)$/i;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  opus: "audio/ogg",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  mp4: "video/mp4",
  mov: "video/quicktime",
  "3gp": "video/3gpp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  vcf: "text/vcard",
};

function cleanInvisibleCharacters(value: string) {
  return value.replace(/[\u200e\u200f\ufeff]/g, "").trim();
}

function getBaseName(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function getCategory(mimeType: string): AttachmentCategory {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType !== "application/octet-stream") return "document";
  return "other";
}

function titleFromFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.zip$/i, "");
  return withoutExtension
    .replace(/^Conversa do WhatsApp com\s+/i, "")
    .replace(/^WhatsApp Chat with\s+/i, "")
    .trim();
}

function normalizeDateLabel(rawDate: string) {
  const parts = rawDate.split(/[/.\-]/);
  if (parts.length !== 3) return rawDate;
  const [first, second, yearValue] = parts;
  const year = yearValue.length === 2 ? `20${yearValue}` : yearValue;
  return `${first.padStart(2, "0")}/${second.padStart(2, "0")}/${year}`;
}

function normalizeTime(rawTime: string) {
  const clean = rawTime.replace(/\s+/g, " ").trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(.*)$/i);
  if (!match) return clean;

  let hour = Number(match[1]);
  const suffix = match[3].toLowerCase();
  if ((suffix.includes("p") || suffix.includes("tarde") || suffix.includes("noite")) && hour < 12) {
    hour += 12;
  }
  if ((suffix.includes("a") || suffix.includes("manhã")) && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function splitAuthorAndBody(value: string) {
  const separatorIndex = value.indexOf(": ");
  if (separatorIndex < 0) return { text: value };

  const possibleAuthor = cleanInvisibleCharacters(value.slice(0, separatorIndex));
  if (!possibleAuthor || possibleAuthor.length > 100) return { text: value };

  return {
    author: possibleAuthor,
    text: value.slice(separatorIndex + 2),
  };
}

function removeAttachmentMarker(text: string, fileNames: string[]) {
  let clean = cleanInvisibleCharacters(text);
  for (const name of fileNames) {
    clean = clean.replace(name, "");
  }

  return clean
    .replace(/<?\s*(?:arquivo|ficheiro|file|media)\s+(?:anexad[oa]|attached|omitted)\s*>?/gi, "")
    .replace(/<\s*Mensagem editada\s*>/gi, " (editada)")
    .replace(/\(\s*\)/g, "")
    .replace(/<\s*>/g, "")
    .replace(/^\s*[-–]\s*/, "")
    .trim();
}

function parseText(text: string, attachmentByName: Map<string, ChatAttachment>) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const rawMessages: Array<{
    date: string;
    time: string;
    content: string;
  }> = [];

  for (const line of lines) {
    const start = line.match(MESSAGE_START);
    if (start) {
      rawMessages.push({ date: start[1], time: start[2], content: start[3] });
      continue;
    }

    if (rawMessages.length > 0) {
      rawMessages[rawMessages.length - 1].content += `\n${line}`;
    }
  }

  if (rawMessages.length === 0) {
    throw new Error("Não encontrei mensagens no arquivo de texto. Verifique se o ZIP foi exportado pelo WhatsApp.");
  }

  return rawMessages.map<ChatMessage>((raw, index) => {
    const { author, text: messageText } = splitAuthorAndBody(raw.content);
    const normalizedContent = cleanInvisibleCharacters(messageText);
    const attachments = Array.from(attachmentByName.entries())
      .filter(([normalizedName]) => normalizedContent.toLocaleLowerCase().includes(normalizedName))
      .map(([, attachment]) => attachment);
    const text = removeAttachmentMarker(
      messageText,
      attachments.map((attachment) => attachment.name),
    );
    const dateLabel = normalizeDateLabel(raw.date);

    return {
      id: `${dateLabel}-${raw.time}-${index}`,
      dateKey: dateLabel,
      dateLabel,
      time: normalizeTime(raw.time),
      author,
      text,
      attachments,
      isSystem: !author,
    };
  }).filter((message) => message.text || message.attachments.length > 0);
}

export async function parseWhatsAppZip(file: File): Promise<ParsedChat> {
  if (file.size > 200 * 1024 * 1024) {
    throw new Error("O arquivo ultrapassa o limite de 200 MB.");
  }

  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const textEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith(".txt"));

  if (textEntries.length === 0) {
    throw new Error("Este ZIP não contém o arquivo .txt da conversa.");
  }

  const transcriptEntry = textEntries[0];
  const mediaEntries = entries.filter((entry) => entry.name !== transcriptEntry.name);
  const attachmentByName = new Map<string, ChatAttachment>();

  await Promise.all(mediaEntries.map(async (entry) => {
    const name = getBaseName(entry.name);
    const extension = getExtension(name);
    const mimeType = MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
    const blob = await entry.async("blob");
    const category = getCategory(mimeType);
    const attachment: ChatAttachment = {
      name,
      mimeType,
      category,
      size: blob.size,
      blob,
      previewUrl: category === "image" ? URL.createObjectURL(blob) : undefined,
    };
    attachmentByName.set(cleanInvisibleCharacters(name).toLocaleLowerCase(), attachment);
  }));

  const transcript = await transcriptEntry.async("string");
  const messages = parseText(transcript, attachmentByName);
  const participants = Array.from(new Set(messages.flatMap((message) => message.author ? [message.author] : [])));
  const referencedAttachments = messages.flatMap((message) => message.attachments);
  const referencedNames = new Set(referencedAttachments.map((attachment) => attachment.name));
  const missingReferences = mediaEntries.length - referencedNames.size;
  const warnings: string[] = [];

  if (missingReferences > 0) {
    warnings.push(`${missingReferences} arquivo(s) do ZIP não estavam referenciados no histórico e foram ignorados.`);
  }

  return {
    title: titleFromFileName(file.name) || "Conversa do WhatsApp",
    sourceName: file.name,
    messages,
    participants,
    startedAt: messages[0]?.dateLabel ?? "",
    endedAt: messages.at(-1)?.dateLabel ?? "",
    attachmentCount: referencedAttachments.length,
    imageCount: referencedAttachments.filter((attachment) => attachment.category === "image").length,
    warnings,
  };
}

export function revokeChatUrls(chat: ParsedChat | null) {
  if (!chat) return;
  const urls = new Set(
    chat.messages.flatMap((message) => message.attachments.flatMap((attachment) => attachment.previewUrl ? [attachment.previewUrl] : [])),
  );
  urls.forEach((url) => URL.revokeObjectURL(url));
}
