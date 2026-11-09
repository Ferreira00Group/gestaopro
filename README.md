# GestãoPRO v5.94.1

## Versão 5.94.1 — alerta de atraso no card Contas vencidas e Acesso rápido mais abaixo
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
Substitua os arquivos do projeto no GitHub pelo conteúdo deste pacote. A versão do app, URLs com cache-busting e cache do Service Worker foram atualizados para **5.94.1**.
