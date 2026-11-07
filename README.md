# GestãoPRO v5.91.9

Ficha técnica agora exibe preço unitário por ingrediente, custo na mistura e custo estimado por unidade produzida, atualizados em tempo real.

## Correção da ficha técnica de produção
- O botão **Adicionar ingrediente** agora cria uma linha vazia com a opção “Selecione o ingrediente”, em vez de preencher automaticamente a primeira matéria-prima cadastrada.
- Ao adicionar ou remover uma linha, o formulário captura os valores já escolhidos e as quantidades digitadas, preservando as demais linhas.
- Cada seletor mantém sua própria seleção, sem alterar os ingredientes das outras linhas.
- A ficha não pode ser salva enquanto houver linha sem ingrediente selecionado, evitando gravar referências inválidas.

## Correção da Análise de Estoque
- Mantida a correção do cálculo de estoque para produtos com variantes.
- O saldo do produto-pai é calculado pela soma dos estoques das variantes.
- Alertas de estoque zerado/baixo identificam cada variante individualmente.

## Publicação
Substitua os arquivos do projeto no GitHub pelo conteúdo deste pacote. A versão do app, URLs com cache-busting e cache do Service Worker foram atualizados para **5.91.9**.
