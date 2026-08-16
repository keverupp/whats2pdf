# Whats2PDF

Aplicação web para transformar conversas exportadas do WhatsApp (`.zip`) em PDF, HTML interativo ou EPUB, com mensagens, datas, imagens e demais anexos.

A interface está disponível em português e inglês. O idioma é escolhido automaticamente pelo navegador e também pode mudar para inglês ao reconhecer uma exportação do WhatsApp nesse idioma. O seletor **PT / EN** permite ajuste manual, e os arquivos exportados acompanham a escolha.

## Privacidade

Todo o processamento do ZIP acontece localmente no navegador. A conversa não é enviada, armazenada ou processada por uma API. A aplicação pode ser publicada diretamente na Vercel ou em outra plataforma compatível com Next.js.

## Rodando localmente

Requisitos: Node.js 20.9 ou superior.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` e selecione o ZIP gerado pela opção **Exportar conversa** do WhatsApp.

Para validar a versão de produção:

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

## Deploy

### Vercel

1. Envie este repositório ao GitHub.
2. Importe o repositório em [vercel.com/new](https://vercel.com/new).
3. Mantenha o preset **Next.js** e publique.

Não há variáveis de ambiente, banco de dados ou serviço externo para configurar.

### Outras nuvens

Qualquer serviço com Node.js pode executar `npm run build` e `npm start`. O projeto também pode ser adaptado para exportação estática, pois a página não depende de rotas de servidor.

## O que é suportado

- Exportações em português e inglês, com formatos comuns de Android e iPhone.
- Interface e exportações em português ou inglês, com detecção automática e seletor manual.
- Mensagens multilinha e avisos do sistema.
- Imagens JPEG, PNG, WebP e GIF que o navegador conseguir decodificar.
- Reprodução de áudios e vídeos diretamente na prévia da conversa.
- Áudios e vídeos originais incorporados como anexos, com cartões clicáveis em leitores compatíveis.
- Documentos identificados na linha do tempo.
- Escolha de qual participante representa o usuário.
- PDF A4 paginado, pesquisável e com indicação das datas.
- HTML interativo pesquisável, offline e com reprodução de áudio e vídeo no navegador.
- EPUB pesquisável e ajustável, com mídia incorporada para leitores compatíveis.

No PDF, áudios e vídeos são anexos e não têm reprodução inline universal. No EPUB, a reprodução depende do leitor e do codec. O HTML interativo é baixado como ZIP: extraia o conteúdo e abra `index.html`, mantendo a pasta `media` ao lado. Imagens HEIC dependem do suporte do navegador; quando não puderem ser abertas, aparecem como anexos identificados.
