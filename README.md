# GestãoPRO v5.91.2

Atualização de navegação Android e saída segura.

## Novidades
- O botão Voltar do Android fecha primeiro janelas/modais e o menu lateral.
- Nas telas internas, Voltar retorna à tela anterior; se necessário, retorna ao Início.
- Na tela inicial, dois toques rápidos em Voltar abrem a confirmação **Sair e fazer backup**.
- Ao confirmar, o app grava os dados no armazenamento local e baixa uma cópia JSON. Se o Google Drive estiver conectado e autenticado, também tenta sincronizar.
- O app só tenta fechar depois de concluir o backup local; se o navegador bloquear o fechamento automático, orienta a fechar pelos aplicativos recentes do Android.

## Publicação
Substitua os arquivos do projeto no GitHub pelo conteúdo deste pacote. A versão do app, as URLs com cache-busting e o cache do Service Worker foram atualizados para **5.91.2**.
