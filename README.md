<div align="center">

<img src="docs/preview.png" alt="Interface do Whats2PDF" width="840">

# Whats2PDF

**Transforme conversas exportadas do WhatsApp em PDF, HTML interativo ou EPUB — sem enviar nada para servidor nenhum.**

[![Open source](https://img.shields.io/badge/open%20source-c%C3%B3digo%20p%C3%BAblico-1d9b7d?style=flat-square)](https://github.com/keverupp/whats2pdf)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-087ea4?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-0f5c50?style=flat-square)](LICENSE)

[Repositório](https://github.com/keverupp/whats2pdf) · [Como usar](#-como-usar) · [Rodar localmente](#-rodando-localmente) · [Contribuir](#-contribuindo)

</div>

---

## 🌱 Projeto open source

O Whats2PDF é um projeto **open source, com código livre para conferência**, publicado em:

> **[github.com/keverupp/whats2pdf](https://github.com/keverupp/whats2pdf)**

Todo o código que roda no seu navegador está lá — não existe parte fechada, serviço oculto ou etapa de processamento em servidor. Qualquer pessoa pode auditar linha a linha, rodar localmente, fazer um fork e adaptar.

## ✨ Destaques

- **Processamento 100% local.** O ZIP é lido no navegador; a conversa nunca é enviada, armazenada ou processada por uma API.
- **Três formatos de saída.** PDF paginado, HTML interativo (offline) e EPUB.
- **Mídia no lugar certo.** Fotos, áudios, vídeos e documentos ficam junto da mensagem que os originou.
- **Prévia antes de exportar.** Você vê como a conversa vai ficar, escolhe o título e quem é você no diálogo.
- **Bilíngue.** Interface e arquivos exportados em português ou inglês, com detecção automática.
- **Sem configuração.** Não há variáveis de ambiente, banco de dados ou serviço externo.

## 🔒 Privacidade

Todo o processamento do ZIP acontece localmente, no seu dispositivo. Nada é enviado para a rede: não há upload, telemetria de conteúdo, nem armazenamento remoto. Como o código é aberto, essa afirmação é verificável — não precisa de confiança, basta conferir.

## 🧭 Como usar

1. **No WhatsApp**, abra a conversa ou o grupo que deseja exportar.
2. Toque no menu de **três pontos** no canto superior direito.
3. Escolha **Mais → Exportar conversa** e selecione **incluir mídia** para levar fotos, áudios e vídeos.
4. **No Whats2PDF**, envie o `.zip` gerado, revise a prévia, ajuste as opções e baixe o arquivo final.

## 📦 Formatos de exportação

| Formato | Arquivo | Quando usar | Limitação |
| --- | --- | --- | --- |
| **PDF** | `.pdf` | Guardar, imprimir ou compartilhar um documento A4 pesquisável | Áudios e vídeos entram como anexos; não são reproduzidos dentro do PDF |
| **HTML interativo** | `.zip` | Reler no navegador, offline, com áudio e vídeo funcionando | É preciso extrair o ZIP e abrir o `index.html` mantendo a pasta `media` ao lado |
| **EPUB** | `.epub` | Leitura ajustável em e-readers e aplicativos de leitura | A reprodução de mídia depende do leitor e do codec |

## ✅ O que é suportado

- Exportações em **português e inglês**, nos formatos comuns de Android e iPhone.
- Mensagens multilinha, avisos do sistema e datas ao longo da conversa.
- Imagens **JPEG, PNG, WebP e GIF** que o navegador conseguir decodificar.
- Reprodução de **áudios e vídeos** na prévia da conversa.
- Áudios e vídeos originais incorporados como anexos, com cartões clicáveis em leitores compatíveis.
- Documentos identificados na linha do tempo.
- Escolha de qual participante representa você (mensagens à direita).
- Arquivos de até **200 MB**.

### Limitações conhecidas

- Imagens **HEIC** dependem do suporte do navegador; quando não podem ser abertas, aparecem como anexos identificados.
- No PDF, áudio e vídeo são anexos — não há reprodução inline universal.
- No EPUB, a reprodução de mídia varia conforme o leitor.

## 🌍 Idiomas

A interface está disponível em **português e inglês**. O idioma é escolhido automaticamente pelo navegador e pode mudar para inglês ao reconhecer uma exportação do WhatsApp nesse idioma. O seletor **PT / EN** permite ajuste manual, e os arquivos exportados acompanham a escolha.

## 🚀 Rodando localmente

Requisitos: **Node.js 20.9 ou superior**.

```bash
git clone https://github.com/keverupp/whats2pdf.git
cd whats2pdf
npm install
npm run dev
```

Abra `http://localhost:3000` e selecione o ZIP gerado pela opção **Exportar conversa** do WhatsApp.

### Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Sobe o build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos do TypeScript |

Antes de abrir um PR, vale rodar `npm run lint`, `npm run typecheck` e `npm run build`.

## ☁️ Deploy

### Vercel

1. Envie o repositório ao GitHub.
2. Importe em [vercel.com/new](https://vercel.com/new).
3. Mantenha o preset **Next.js** e publique.

Não há variáveis de ambiente, banco de dados ou serviço externo para configurar.

### Outras plataformas

Qualquer serviço com Node.js pode executar `npm run build` e `npm start`. O projeto também pode ser adaptado para exportação estática, pois a página não depende de rotas de servidor.

## 🧱 Stack

[Next.js 16](https://nextjs.org) (App Router) · [React 19](https://react.dev) · [TypeScript](https://www.typescriptlang.org) · CSS puro (sem framework de estilo) · [JSZip](https://stuk.github.io/jszip/) · [jsPDF](https://github.com/parallax/jsPDF) · [pdf-lib](https://pdf-lib.js.org) · [lucide-react](https://lucide.dev)

```text
src/
├── app/
│   ├── apple-icon.tsx           # ícone gerado para iOS
│   ├── globals.css              # todo o design do app
│   ├── icon.svg                 # favicon
│   ├── layout.tsx               # metadados e idioma do documento
│   └── page.tsx
├── components/
│   └── whatsapp-converter.tsx   # interface: upload, opções e prévia
└── lib/
    ├── exports.ts               # HTML interativo e EPUB
    ├── i18n.ts                  # textos PT/EN e detecção de idioma
    ├── pdf.ts                   # geração do PDF
    ├── types.ts
    └── whatsapp.ts              # leitura e parse do ZIP
```

## 🤝 Contribuindo

Contribuições são bem-vindas: abra uma [issue](https://github.com/keverupp/whats2pdf/issues) para relatar um problema ou sugerir algo, ou mande um pull request.

Ao relatar um bug de leitura de conversa, descreva **de qual sistema veio a exportação** (Android ou iPhone) e **em qual idioma** — os formatos de data e os marcadores de anexo mudam entre eles. Nunca anexe conversas reais: prefira um trecho pequeno e anonimizado.

## 📄 Licença

Distribuído sob a licença [MIT](LICENSE) — use, modifique e redistribua livremente, mantendo o aviso de copyright.
