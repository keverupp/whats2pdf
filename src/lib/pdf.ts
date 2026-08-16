import { jsPDF } from "jspdf";
import { pdfCopy } from "@/lib/i18n";
import type { ChatAttachment, ParsedChat, PdfOptions } from "@/lib/types";
import type { PDFRef } from "pdf-lib";

type PdfImage = {
  dataUrl: string;
  width: number;
  height: number;
};

type MediaPlacement = {
  attachment: ChatAttachment;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const COLORS = {
  brand: [15, 92, 80] as const,
  brandSoft: [222, 246, 239] as const,
  ink: [29, 44, 40] as const,
  muted: [97, 113, 108] as const,
  border: [220, 226, 223] as const,
  incoming: [255, 255, 255] as const,
  outgoing: [220, 248, 198] as const,
  system: [235, 240, 238] as const,
  paper: [247, 249, 248] as const,
};

function pdfSafe(value: string) {
  return value
    .normalize("NFC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\u0009\u000A\u000D\u0020-\u00FF]/g, "");
}

function fileLabel(attachment: ChatAttachment, locale: PdfOptions["locale"], embedded = false) {
  const labels = pdfCopy[locale];
  return `${labels[attachment.category]} · ${embedded ? `${labels.embedded} · ` : ""}${attachment.name}`;
}

function formatDateRange(chat: ParsedChat, locale: PdfOptions["locale"]) {
  if (!chat.startedAt) return "";
  if (!chat.endedAt || chat.startedAt === chat.endedAt) return chat.startedAt;
  return `${chat.startedAt} ${pdfCopy[locale].rangeConnector} ${chat.endedAt}`;
}

function loadPdfImage(blob: Blob): Promise<PdfImage | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const maxPixels = 1600;
      const scale = Math.min(1, maxPixels / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
      URL.revokeObjectURL(url);
      resolve({ dataUrl, width, height });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    image.src = url;
  });
}

export async function generateChatPdf(
  chat: ParsedChat,
  options: PdfOptions,
  onProgress?: (progress: number) => void,
) {
  const labels = pdfCopy[options.locale];
  const mediaByName = new Map<string, ChatAttachment>();
  if (options.includeMedia) {
    for (const message of chat.messages) {
      for (const attachment of message.attachments) {
        if (attachment.category === "audio" || attachment.category === "video") {
          mediaByName.set(attachment.name, attachment);
        }
      }
    }
  }
  const mediaAttachments = Array.from(mediaByName.values());
  const mediaPlacements: MediaPlacement[] = [];
  const layoutProgressLimit = mediaAttachments.length > 0 ? 85 : 100;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const footerY = pageHeight - 8;
  const maxBubbleWidth = 138;
  let cursorY = 0;

  const drawPageHeader = (firstPage = false) => {
    if (firstPage) {
      doc.setFillColor(...COLORS.brand);
      doc.rect(0, 0, pageWidth, 42, "F");
      doc.setFillColor(255, 255, 255);
      doc.circle(margin + 6, 15, 6, "F");
      doc.setTextColor(...COLORS.brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("W", margin + 6, 16.8, { align: "center" });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(pdfSafe(options.title || chat.title), margin + 15, 14.5, { maxWidth: pageWidth - margin * 2 - 15 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        pdfSafe(`${chat.messages.length} ${labels.messages} · ${chat.participants.length} ${labels.participants} · ${formatDateRange(chat, options.locale)}`),
        margin + 15,
        21,
      );
      doc.setFontSize(7.5);
      doc.setTextColor(207, 235, 228);
      doc.text(labels.organizedBy, margin + 15, 27);
      cursorY = 50;
      return;
    }

    doc.setFillColor(...COLORS.brandSoft);
    doc.rect(0, 0, pageWidth, 14, "F");
    doc.setTextColor(...COLORS.brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(pdfSafe(options.title || chat.title), margin, 8.8);
    cursorY = 21;
  };

  const addPage = () => {
    doc.addPage();
    drawPageHeader(false);
  };

  const ensureSpace = (height: number) => {
    if (cursorY + height > footerY - 4) addPage();
  };

  const drawDateDivider = (label: string) => {
    ensureSpace(13);
    const cleanLabel = pdfSafe(label);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const width = doc.getTextWidth(cleanLabel) + 12;
    const x = (pageWidth - width) / 2;
    doc.setFillColor(...COLORS.brandSoft);
    doc.roundedRect(x, cursorY, width, 8, 4, 4, "F");
    doc.setTextColor(...COLORS.brand);
    doc.text(cleanLabel, pageWidth / 2, cursorY + 5.2, { align: "center" });
    cursorY += 12;
  };

  drawPageHeader(true);
  let previousDate = "";

  for (let index = 0; index < chat.messages.length; index += 1) {
    const message = chat.messages[index];
    if (message.dateKey !== previousDate) {
      drawDateDivider(message.dateLabel);
      previousDate = message.dateKey;
    }

    if (message.isSystem) {
      const systemText = pdfSafe(message.text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.4);
      const lines = doc.splitTextToSize(systemText, 112) as string[];
      const height = lines.length * 3.8 + 6;
      ensureSpace(height + 3);
      const width = Math.min(122, Math.max(42, Math.max(...lines.map((line) => doc.getTextWidth(line))) + 10));
      const x = (pageWidth - width) / 2;
      doc.setFillColor(...COLORS.system);
      doc.roundedRect(x, cursorY, width, height, 2.5, 2.5, "F");
      doc.setTextColor(...COLORS.muted);
      doc.text(lines, pageWidth / 2, cursorY + 4.6, { align: "center" });
      cursorY += height + 3;
      onProgress?.(Math.round(((index + 1) / chat.messages.length) * layoutProgressLimit));
      continue;
    }

    const isOutgoing = message.author === options.owner;
    const imageAttachments = options.includeImages
      ? message.attachments.filter((attachment) => attachment.category === "image")
      : [];
    const images = await Promise.all(imageAttachments.map((attachment) => loadPdfImage(attachment.blob)));
    const validImages = images.filter((image): image is PdfImage => image !== null);
    const nonImageAttachments = message.attachments.filter((attachment) => attachment.category !== "image");
    const failedImageAttachments = imageAttachments.filter((_, imageIndex) => images[imageIndex] === null);
    const listedAttachments = [...nonImageAttachments, ...failedImageAttachments];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    const textLines = message.text ? doc.splitTextToSize(pdfSafe(message.text), maxBubbleWidth - 10) as string[] : [];
    const authorHeight = message.author ? 5 : 0;
    const textHeight = textLines.length * 4.25;
    const imageSizes = validImages.map((image) => {
      const maxWidth = maxBubbleWidth - 7;
      const maxHeight = 62;
      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
      return { width: image.width * ratio, height: image.height * ratio };
    });
    const imagesHeight = imageSizes.reduce((total, image) => total + image.height + 2, 0);
    const attachmentsHeight = listedAttachments.length * 10;
    const bubbleHeight = 5 + authorHeight + textHeight + imagesHeight + attachmentsHeight + 7;
    const longestTextLine = textLines.reduce((width, line) => Math.max(width, doc.getTextWidth(line)), 0);
    const authorWidth = message.author ? doc.getTextWidth(pdfSafe(message.author)) : 0;
    const widestImage = imageSizes.reduce((width, image) => Math.max(width, image.width), 0);
    const attachmentWidth = listedAttachments.length > 0 ? 103 : 0;
    const bubbleWidth = Math.min(
      maxBubbleWidth,
      Math.max(54, longestTextLine + 10, authorWidth + 10, widestImage + 7, attachmentWidth),
    );

    ensureSpace(Math.min(bubbleHeight + 3, footerY - 22));
    const bubbleX = isOutgoing ? pageWidth - margin - bubbleWidth : margin;
    const bubbleColor = isOutgoing ? COLORS.outgoing : COLORS.incoming;
    doc.setFillColor(bubbleColor[0], bubbleColor[1], bubbleColor[2]);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(bubbleX, cursorY, bubbleWidth, bubbleHeight, 3, 3, "FD");
    let innerY = cursorY + 5;

    if (message.author) {
      const authorColor = isOutgoing ? COLORS.brand : [66, 94, 178] as const;
      doc.setTextColor(authorColor[0], authorColor[1], authorColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.8);
      doc.text(pdfSafe(message.author), bubbleX + 5, innerY);
      innerY += 5;
    }

    if (textLines.length > 0) {
      doc.setTextColor(...COLORS.ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.2);
      doc.text(textLines, bubbleX + 5, innerY);
      innerY += textHeight;
    }

    validImages.forEach((image, imageIndex) => {
      const size = imageSizes[imageIndex];
      doc.addImage(image.dataUrl, "JPEG", bubbleX + 3.5, innerY, size.width, size.height, undefined, "FAST");
      innerY += size.height + 2;
    });

    for (const attachment of listedAttachments) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(bubbleX + 4, innerY, bubbleWidth - 8, 8, 2, 2, "F");
      doc.setTextColor(...COLORS.brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.3);
      const isEmbedded = options.includeMedia && (attachment.category === "audio" || attachment.category === "video");
      const label = doc.splitTextToSize(pdfSafe(fileLabel(attachment, options.locale, isEmbedded)), bubbleWidth - 17) as string[];
      doc.text(label[0], bubbleX + 8, innerY + 5.1);
      if (isEmbedded) {
        mediaPlacements.push({
          attachment,
          pageNumber: doc.getCurrentPageInfo().pageNumber,
          x: bubbleX + 4,
          y: innerY,
          width: bubbleWidth - 8,
          height: 8,
        });
      }
      innerY += 10;
    }

    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.text(pdfSafe(message.time), bubbleX + bubbleWidth - 5, cursorY + bubbleHeight - 3.2, { align: "right" });
    cursorY += bubbleHeight + 3;
    onProgress?.(Math.round(((index + 1) / chat.messages.length) * layoutProgressLimit));
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`${page} / ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
  }

  const fileName = (options.title || chat.title || "conversa-whatsapp")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  let pdfBytes = new Uint8Array(doc.output("arraybuffer"));

  if (mediaAttachments.length > 0) {
    const { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName } = await import("pdf-lib");
    const pdfDocument = await PDFDocument.load(pdfBytes);

    for (let index = 0; index < mediaAttachments.length; index += 1) {
      const attachment = mediaAttachments[index];
      await pdfDocument.attach(await attachment.blob.arrayBuffer(), attachment.name, {
        mimeType: attachment.mimeType,
        description: fileLabel(attachment, options.locale),
      });
      onProgress?.(layoutProgressLimit + Math.round(((index + 1) / mediaAttachments.length) * (100 - layoutProgressLimit)));
    }

    await pdfDocument.flush();
    const names = pdfDocument.catalog.lookup(PDFName.of("Names"), PDFDict);
    const embeddedFiles = names.lookup(PDFName.of("EmbeddedFiles"), PDFDict);
    const embeddedFileNames = embeddedFiles.lookup(PDFName.of("Names"), PDFArray);
    const fileRefs = new Map<string, PDFRef>();

    mediaAttachments.forEach((attachment, index) => {
      fileRefs.set(attachment.name, embeddedFileNames.get(index * 2 + 1) as PDFRef);
    });

    const pointsPerMillimeter = 72 / 25.4;
    const pages = pdfDocument.getPages();
    mediaPlacements.forEach((placement, index) => {
      const page = pages[placement.pageNumber - 1];
      const fileRef = fileRefs.get(placement.attachment.name);
      if (!page || !fileRef) return;

      const pageHeight = page.getHeight();
      const x = placement.x * pointsPerMillimeter;
      const y = pageHeight - (placement.y + placement.height) * pointsPerMillimeter;
      const width = placement.width * pointsPerMillimeter;
      const height = placement.height * pointsPerMillimeter;
      const annotation = pdfDocument.context.obj({
        Type: "Annot",
        Subtype: "FileAttachment",
        Rect: [x, y, x + width, y + height],
        FS: fileRef,
        Contents: PDFHexString.fromText(fileLabel(placement.attachment, options.locale, true)),
        Name: "Paperclip",
        NM: PDFHexString.fromText(`whats2pdf-media-${index}`),
        C: [0.06, 0.36, 0.31],
        F: 4,
      });
      const annotationRef = pdfDocument.context.register(annotation);
      let annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
      if (!annotations) {
        annotations = pdfDocument.context.obj([]);
        page.node.set(PDFName.of("Annots"), annotations);
      }
      annotations.push(annotationRef);
    });

    pdfBytes = new Uint8Array(await pdfDocument.save({ useObjectStreams: true }));
  }

  const downloadBlob = new Blob([Uint8Array.from(pdfBytes)], { type: "application/pdf" });
  const downloadUrl = URL.createObjectURL(downloadBlob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = `${fileName || "conversa-whatsapp"}.pdf`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
  onProgress?.(100);
}
