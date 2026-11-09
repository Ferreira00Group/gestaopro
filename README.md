# GestãoPRO v5.95.0

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
