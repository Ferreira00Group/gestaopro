# GestãoPRO v5.99.0

## Versão 5.99.0 — Menu puxável, buscas que limpam ao navegar e cartão/rota na busca de clientes
- **Menu puxável:** no celular/tablet, o menu lateral abre arrastando o dedo a partir da borda esquerda (faixa de ~24 px) e acompanha o dedo; o fundo escurece aos poucos. Soltando depois de ~40% da largura, ou num puxão rápido, ele termina de abrir; senão volta. Para fechar, arraste o menu para a esquerda ou toque no fundo escuro. O botão ☰ continua. O gesto fica desligado com janela aberta e é ignorado quando o movimento é de rolagem vertical. Em telas largas (1024 px ou mais) o menu continua fixo.
- **Buscas limpam ao navegar:** ao entrar em qualquer tela, o texto da busca global e o das buscas de cada tela (Clientes, Vendas, Estoque e movimentações, Fornecedores, Precificação) volta vazio e a lista aparece completa. Só o texto: chips e filtros de tipo/status (devendo, em dia, tipo de venda etc.) continuam como estão. A Nova Venda e o PDV já abriam com a busca vazia.
- **Busca de clientes (global e Nova Venda):** cada resultado mostra o número do cartão em dourado antes do nome e, embaixo, o pino de mapa dourado (o mesmo do card do cliente) com o nome da rota. Cliente sem rota fica sem a linha da rota; cliente sem cartão fica sem o número. O telefone deixou de aparecer nessa lista, mas continua valendo na busca.
- Arquivos alterados: `00-core.js`, `01-ui-nav.js`, `04-vendas.js`, `styles.css`, `index.html`, `sw.js`, `00a-config.js`, `package.json` (que estava em 5.95.0 e agora acompanha a versão do app).

## Versão 5.98.0 — Brinde por valor, "Total do item" e botões À vista/Fiado
- **🎁 Brinde por valor:** a cada R$ 50,00 (configurável) do **total a cobrar** (depois dos descontos, sem juros) a venda dá direito a 1 brinde (configurável). Config em Precificação → "Editar promoções" (bloco 🎁 Brinde por valor). Vale à vista, no fiado e no orçamento.
- **Card 🎁 Brinde na grade de produtos:** toque no card (ele acende e mostra quantos brindes restam) e depois no produto que será o brinde; entra 1 un. a R$ 0,00, marcada como brinde (produtos com opções abrem o seletor). Toque de novo para somar mais. O stepper ajusta ou remove.
- **Passou do direito:** só avisa (aviso em vermelho embaixo do total e toast); não bloqueia a venda. Embaixo do total: "🎁 1 de 2 brindes usados · faltam R$ X para o próximo".
- **O brinde:** baixa do estoque, valida estoque, grava o custo da ficha técnica, não recebe desconto, não conta nas promoções por quantidade nem nos totais; aparece no recibo/WhatsApp/comprovante como "🎁 Brinde: X — grátis". "Repetir cesta" não copia brindes.
- **Relatórios:** cards "🎁 Brindes dados" (quantidade e quem mais ganhou) e "🎁 Custo dos brindes" (pela ficha técnica) no período.
- **Total do item:** o campo "Preço un." virou "Total do item" (ex.: 3 sabões por R$ 25,00). O unitário ("Final") se atualiza sozinho e é guardado com 4 casas quando não divide exato; o total do item fica exato. Mudar quantidade, condição de pagamento ou canal volta ao preço de tabela. Itens avulsos funcionam igual.
- **Botões À vista / Fiado:** cada botão agora mostra o percentual da própria condição (antes os dois mostravam o da condição selecionada).
- Os descontos por quantidade (por produto e geral) continuam existindo; para desativar, desmarque em "Editar promoções".

## Versão 5.97.0 — Renegociação por compra, datas editáveis, juros no ato e nova cobrança
- **Renegociar só o que você escolher:** a tela lista as compras (e renegociações ativas) em aberto, com produto, data, valor que falta e situação. Só as marcadas entram; o resto do saldo não muda. Já vêm marcadas as vencidas (ou todas, se nenhuma venceu). Botão "Selecionar tudo".
- **Parcelas mensais com data editável:** igual ao parcelamento da venda — nº de parcelas, 1º vencimento e uma data editável para cada parcela (a última absorve os centavos). Saiu o "Intervalo (dias)".
- **Juros no ato:** mesmo campo da venda ("% sobre o valor" ou "Valor fixo") e resumo com Valor das compras / Encargos / Juros / Total a receber.
- **Encargos de atraso** passam a considerar só as compras selecionadas.
- **Motor do fiado (`00-core.js`):** as compras renegociadas são quitadas pela baixa da renegociação; compras normais e parcelas de renegociação entram juntas na fila de pagamento, por **vencimento** (antes as compras eram pagas antes das parcelas, mesmo vencendo depois). O saldo total de nenhum cliente muda; renegociações antigas continuam valendo.
- **Mensagem de cobrança (WhatsApp):** endereço logo abaixo do nome ("📍 Endereço:"), grupos "⚠️ Em atraso", "🔔 Vence hoje", "📋 Em aberto" (sem data) e "📅 A vencer"; "Total em aberto" e "Para pagar hoje"; compras com produto e data; parcelas de renegociação mostram de quais compras vieram.
- **Pix da cobrança:** se há valor vencido/vencendo hoje e ainda sobra coisa a vencer, o Pix e o copia e cola cobram só o devido agora (com a indicação "vence hoje" / "valor vencido"); senão cobram o saldo todo. Extrato e "Mostrar no celular" não mudaram.

## Versão 5.96.1 — QR Code do Pix funciona offline
- **Correção:** o gerador de QR (`lib-qrcode.js`) e o `logo.png` não estavam na lista de arquivos guardados para uso offline (`sw.js`). Sem internet, o QR do Pix aparecia como "QR Code indisponível". Agora os dois entram no cache na instalação da versão. Importante: abrir o app **uma vez com internet** depois de atualizar, para o celular baixar esses arquivos.

## Versão 5.96.0 — Próxima prevista, desconto no comprovante e envio por print
- **Cartão do cliente:** o campo "Frequência" virou "Próxima prevista". A data é o mesmo dia da última compra no mês seguinte (30/10 → 30/11); se o mês seguinte for mais curto, cai no último dia (31/10 → 30/11). Vale também para quem tem só 1 compra.
- **Regra única:** a mesma conta (`relProximaPrevista` em 14-relacionamento.js) alimenta o cartão, o Cliente 360, "Recompra próxima", relatórios e automações.
- **Atendimento concluído:** o comprovante mostra Subtotal, "Desconto aplicado" em destaque e o Total; o texto do WhatsApp traz as mesmas linhas e a mensagem "Você economizou R$ X".
- **Texto ou print:** dois botões no comprovante. "Enviar texto" abre a conversa do cliente (com Pix Copia e Cola); "Enviar print" gera uma imagem (canvas) e abre o menu de compartilhar do celular, com a chave Pix escrita quando há saldo. Se o aparelho não compartilhar arquivos, a imagem é baixada.

## Versão 5.95.0 — Curva ABC e Runway de estoque corrigidos
- **Curva ABC (resumo e relatório detalhado):** itens avulsos (valor digitado, sem produto cadastrado, como "Item avulso" e "Saldo Anterior") ficam fora da curva e do giro do estoque. A contagem "N produtos classificados" e as porcentagens agora consideram só produtos.
- **Classes A/B/C:** passou a usar o Pareto clássico — o item que cruza 80% / 95% do acumulado fica na classe de cima.
- **Runway:** "Sem vendas" agora só aparece quando o giro é zero (antes, produto com mais de 999 dias de cobertura, como a Cera, aparecia como sem vendas). Itens sem vendas vão para o fim da lista.
- **Excesso de estoque:** cobertura acima de 180 dias aparece em azul com "· excesso".
- **Visual:** linhas do resumo e do runway em duas linhas fixas (sem quebra irregular no celular); "1 un vendida" no singular; números com vírgula decimal (33,5% · 1,47/dia).

## Versão 5.94.3 (anterior) — topbar mais limpa
- Removido o botão Modo Foco do topo, o botão "Sair do Foco", a opção em Configurações do Sistema, o atalho Alt+F e os estilos do recurso. Notificações, PDV Balcão e Expedição foram mantidos.
- Removido o botão Copiloto IA do topo; o contador de pendências agora aparece no botão flutuante Copiloto IA.

## Versão 5.94.2 (anterior) — Central de Análise abre pelo botão flutuante
- O card "Central de Análise de Dados & Copiloto" saiu da tela inicial; o botão flutuante Copiloto IA agora abre esse conteúdo numa janela deslizante (Expedição, Resultados IA, Painel Local e Copiloto IA).
- Removida a linha da data no topo do Início.

## Versão 5.94.1 (anterior) — alerta de atraso no card Contas vencidas e Acesso rápido mais abaixo
- Removida a linha "N clientes em atraso" do card Total a receber.
- A regra "Alerta de atraso" (% do Total a receber, padrão 20, em Regras de crédito) agora acende o card **Contas vencidas** em laranja (número, ícone e borda).
- Acesso rápido movido para depois do Desempenho do dia.

## Versão 5.94.0 (anterior) — cores do Início e alerta de atraso
- Total a receber em azul; Lucro verde (vermelho se negativo); Gastos do mês em coral; Caixa atual dourado (vermelho se negativo).
- Card Total a receber: nova linha "N clientes em atraso", sempre visível em cinza; vira laranja com ícone quando o valor vencido chega a X% do Total a receber.
- X% (padrão 20) é configurável em Configurações → Regras de crédito (Fiado) → "Alerta de atraso".
- Card "Contas vencidas" com o número em laranja.

## Etiqueta do estoque com código
- Cartões de Produto, Matéria-prima e Semiacabado mostram o tipo no corpo dourado e o **código na ponta**, uma cor por tipo: **P003** bronze, **M015** azul, **S015** violeta. Vale também para inativos e arquivados.
- Tocar no código copia. A busca de cada aba aceita o código (P003, M015, S015); a aba Semiacabados ganhou a barra de busca.

## Cadastro sem duplicar por erro de digitação (Produto, Matéria-prima, Semiacabado)
- Ao digitar o nome aparece a lista do que já existe (código, unidade, estoque); tocar abre o item em vez de criar outro. A busca ignora acento e maiúscula e acha grafia parecida.
- Nome igual a outro item: bloqueado, só oferece "Abrir esse" (acabou o "criar mesmo assim").
- Nome parecido: pergunta "Usar esse" ou "É outro item" (na edição: "Voltar" ou "Salvar assim").
- Nome salvo padronizado: sem espaços sobrando e com a primeira letra maiúscula.
- Estoque: item novo mostra "Estoque inicial" (começa em 0); item existente mostra o "Estoque atual" travado, só para ler (ajuste pelo + / − do cartão ou pela Entrada de Estoque). No Semiacabado a edição não altera mais o estoque.

## Versão 5.92.1 (anterior)

## Selo de situação no cartão do cliente
- Cliente com parcela vencida mostra **"Atrasado há X dias"** (dias da parcela em aberto mais antiga), no lugar de "Devendo".
  - 1 a 15 dias: laranja.
  - 16 a 60 dias: vermelho.
  - Mais de 60 dias: vermelho pulsante.
- Cliente devendo **ainda no prazo** continua com "Devendo R$ X", agora em **azul**.
- Em dia continua verde.

## Correção: confirmação escondida atrás de outro modal
- O diálogo "Confirmar" abria atrás de modais mais abaixo no HTML (ex.: Renegociar dívida) e só aparecia ao fechá-los. Agora fica sempre por cima.

## Versão 5.92.0 (anterior)
Cards do painel agora abrem a tela já filtrada, e o cartão do cliente ganhou o botão **Renegociar**.

## Botão Renegociar no cartão do cliente
- Aparece na lista de Clientes, ao lado de Receber, quando o cliente tem **saldo devedor** e não está arquivado.
- Abre o modal "Renegociar dívida" já existente (nenhuma regra de renegociação foi alterada).

## Cards do painel abrem o filtro correspondente
- **Contas vencidas** → Clientes com o novo filtro **Vencidos** (parcela em aberto vencida).
- **Vencem hoje** → Clientes com o novo filtro **Vencem hoje**.
- **Estoque baixo** → Estoque com filtro **Abaixo do mínimo** (abre Produtos; vai para Matérias-Primas se só ela tiver itens baixos; avisa se a outra aba também tem).
- **Vendas do dia** → Vendas filtradas por hoje.
- **Recebido hoje** → Financeiro, Entradas de hoje (mesma regra do card: vendas à vista + pagamentos recebidos).
- **Gastos do dia** → Financeiro, Saídas de hoje (mesma regra do card: sem retirada do dono).
- Os filtros por dia e por estoque aparecem como selo com **✕** para limpar, e são zerados ao entrar na tela pelo menu.
- Orçamentos continua como antes.

## Publicação
Substitua os arquivos do projeto no GitHub pelo conteúdo deste pacote. A versão do app, URLs com cache-busting e cache do Service Worker foram atualizados para **5.94.3**.
