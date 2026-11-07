# GestãoPRO v5.91.4

## Correção da Análise de Estoque
- Corrigido o cálculo de estoque na Análise de Dados para produtos com variantes.
- O saldo do produto-pai agora é calculado pela soma dos estoques das variantes, em vez de interpretar a ausência de `produto.estoque` como zero.
- Alertas de estoque zerado/baixo identificam cada variante individualmente e seguem o mesmo critério da tela Estoque.
- O runway de cobertura e o cálculo de produtos parados usam o saldo agregado real.
- Instruções do pacote enviado à IA reforçam que o produto-pai não pode ser declarado zerado quando há saldo nas variantes.

## Publicação
Substitua os arquivos do projeto no GitHub pelo conteúdo deste pacote. A versão do app, URLs com cache-busting e cache do Service Worker foram atualizados para **5.91.4**.

**Observação:** análises antigas já importadas permanecem como histórico. Depois de publicar a atualização, gere uma nova análise para substituir os alertas antigos pelo diagnóstico com os saldos corrigidos.
