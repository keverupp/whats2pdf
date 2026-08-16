export type AttachmentCategory = "image" | "audio" | "video" | "document" | "other";

export type ChatAttachment = {
  name: string;
  mimeType: string;
  category: AttachmentCategory;
  size: number;
  blob: Blob;
  previewUrl?: string;
};

export type ChatMessage = {
  id: string;
  dateKey: string;
  dateLabel: string;
  time: string;
  author?: string;
  text: string;
  attachments: ChatAttachment[];
  isSystem: boolean;
};

export type ParsedChat = {
  title: string;
  sourceName: string;
  messages: ChatMessage[];
  participants: string[];
  startedAt: string;
  endedAt: string;
  attachmentCount: number;
  imageCount: number;
  warnings: string[];
};

export type PdfOptions = {
  title: string;
  owner: string;
  includeImages: boolean;
};
