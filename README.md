# Whats2PDF

Aplicação web para transformar conversas exportadas do WhatsApp (`.zip`) em PDFs A4 organizados, com mensagens, datas, imagens e referências aos demais anexos.

## Privacidade

Todo o processamento acontece localmente no navegador. O ZIP não é enviado, armazenado ou processado por uma API. Além de proteger as conversas, isso permite publicar a aplicação como um site estático na Vercel ou em outra plataforma compatível com Next.js.

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
- Mensagens multilinha e avisos do sistema.
- Imagens JPEG, PNG, WebP e GIF que o navegador conseguir decodificar.
- Áudios, vídeos e documentos identificados na linha do tempo.
- Escolha de qual participante representa o usuário.
- PDF A4 paginado, pesquisável e com indicação das datas.

Áudios e vídeos são listados no PDF pelo nome, mas não são incorporados como arquivos executáveis. Imagens HEIC dependem do suporte do navegador; quando não puderem ser abertas, aparecem como anexos identificados.
