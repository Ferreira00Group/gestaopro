# GestãoPRO v5.92.1

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
Substitua os arquivos do projeto no GitHub pelo conteúdo deste pacote. A versão do app, URLs com cache-busting e cache do Service Worker foram atualizados para **5.92.1**.
