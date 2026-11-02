// ============ CENTRAL DE CONECTORES — GestãoPRO v5.55 ============
// Preferências ficam em chave separada. Não altera STORAGE_KEY nem o estado comercial.
const CONECTORES_STORAGE_KEY = 'gestao_pro_conectores_v1';
const CONECTORES_CATALOGO = [
  {id:'maps',nome:'Google Maps',grupo:'Google Maps Platform',icone:'map',descricao:'Mapas, geocodificação, distâncias e rotas de entrega.',uso:'Mapas e rotas',custo:'Pode gerar cobrança por uso',custoTipo:'pago',fase:'Fase 2',detalhe:'O GestãoPRO já consegue abrir a navegação por link e trabalhar com coordenadas existentes. A integração avançada adicionará mapas incorporados, conversão de endereços em coordenadas e cálculo de rotas. Serviços avançados exigem chave e projeto Google Cloud.'},
  {id:'vision',nome:'Google Cloud Vision',grupo:'Reconhecimento',icone:'scan-search',descricao:'OCR para ler cartões, etiquetas e textos em imagens.',uso:'Cartões e produtos',custo:'Franquia gratuita limitada; excedente pago',custoTipo:'misto',fase:'Fase 3',detalhe:'Será usado para extrair texto de fotografias. O resultado será apresentado para conferência antes de criar ou alterar qualquer cadastro.'},
  {id:'gemini',nome:'Google Gemini',grupo:'Inteligência artificial',icone:'brain-circuit',descricao:'Interpretar imagens e sugerir dados de produtos.',uso:'Reconhecimento inteligente',custo:'Possui modalidade gratuita limitada e planos pagos',custoTipo:'misto',fase:'Fase 3/5',detalhe:'Poderá interpretar imagens e organizar informações. O uso ficará sujeito a limites e nunca atualizará estoque ou financeiro sem a confirmação definida no projeto.'},
  {id:'documentai',nome:'Google Document AI',grupo:'Documentos',icone:'file-text',descricao:'Extração estruturada de notas fiscais e documentos.',uso:'Notas e recibos',custo:'Pago conforme processador e volume',custoTipo:'pago',fase:'Fase 4',detalhe:'Será avaliado para documentos fiscais e recibos que exigem extração estruturada. Só será habilitado após definir orçamento e limites.'},
  {id:'drive',nome:'Google Drive',grupo:'Armazenamento',icone:'cloud',descricao:'Backup e restauração dos dados do GestãoPRO.',uso:'Backup',custo:'API sem cobrança por chamada dentro das cotas; armazenamento sujeito à conta',custoTipo:'free',fase:'Já existe',detalhe:'O aplicativo já contém integração com Google Drive para backup. Esta central permitirá acompanhar e organizar sua configuração sem substituir o mecanismo atual.'},
  {id:'sheets',nome:'Google Sheets',grupo:'Produtividade',icone:'table',descricao:'Exportar relatórios e listas para Planilhas Google.',uso:'Relatórios e exportações',custo:'API gratuita dentro das cotas',custoTipo:'free',fase:'Fase 5',detalhe:'Permitirá exportar relatórios, clientes e produtos para planilhas, respeitando permissões específicas da conta Google.'},
  {id:'barcode',nome:'Leitor de códigos',grupo:'Leitura local',icone:'barcode',descricao:'Ler EAN/UPC pela câmera do aparelho.',uso:'Produtos e estoque',custo:'Sem custo de API com leitura local',custoTipo:'free',fase:'Fase 3',detalhe:'A leitura será feita no próprio aparelho sempre que possível. A busca do código em catálogos externos será uma etapa separada e opcional.'}
];
function conectoresLerConfig(){
  try{return Object.assign({permitirCobranca:false,orcamentoMensal:0,alertaPercentual:80,preferencias:{}},JSON.parse(localStorage.getItem(CONECTORES_STORAGE_KEY)||'{}'));}
  catch(e){return {permitirCobranca:false,orcamentoMensal:0,alertaPercentual:80,preferencias:{}};}
}
function conectoresSalvarConfig(cfg){
  try{localStorage.setItem(CONECTORES_STORAGE_KEY,JSON.stringify(cfg));return true;}
  catch(e){showToast('Não foi possível salvar as configurações dos conectores','red');return false;}
}
function conectoresStatus(item){
  if(item.id==='drive') return (typeof state!=='undefined'&&state.driveBackupAtivo)?'Ativo no backup':'Integração existente';
  if(item.id==='maps') return 'Navegação básica disponível';
  if(item.id==='barcode') return 'Aguardando módulo de leitura';
  return 'Aguardando configuração';
}
function conectoresCustoBadge(item){
  if(item.custoTipo==='free')return '<span class="conector-tag conector-free">Sem cobrança por uso da API*</span>';
  if(item.custoTipo==='misto')return '<span class="conector-tag conector-misto">Gratuito limitado / pago</span>';
  return '<span class="conector-tag conector-paid">Pode gerar cobrança</span>';
}
function renderConectores(){
  const root=document.getElementById('conectores-conteudo');if(!root)return;
  const cfg=conectoresLerConfig();
  const ativos=CONECTORES_CATALOGO.filter(x=>cfg.preferencias[x.id]&&cfg.preferencias[x.id].marcado).length;
  root.innerHTML=`
    <div class="conectores-resumo">
      <div><span class="conector-kicker">CENTRAL DE INTEGRAÇÕES</span><h3>Serviços conectados ao GestãoPRO</h3><p>Gerencie integrações, permissões e custos em um único lugar.</p></div>
      <div class="conectores-resumo-num"><strong>${ativos}</strong><span>marcados para configuração</span></div>
    </div>
    <div class="conectores-alerta"><i data-lucide="shield-check" class="ic"></i><div><strong>Proteção contra cobranças</strong><span>Serviços que podem gerar custos permanecem bloqueados até você autorizar. Marcar um conector nesta tela não ativa uma API nem gera cobrança.</span></div></div>
    <div class="conectores-section-title"><div><h3>Conectores disponíveis</h3><p>Integrações Google e recursos locais</p></div><span>${CONECTORES_CATALOGO.length} serviços</span></div>
    <div class="conectores-grid">${CONECTORES_CATALOGO.map(item=>{
      const pref=cfg.preferencias[item.id]||{};
      return `<article class="conector-card">
        <div class="conector-card-top"><div class="conector-icon"><i data-lucide="${item.icone}"></i></div><span class="conector-fase">${item.fase}</span></div>
        <h4>${item.nome}</h4><p class="conector-desc">${item.descricao}</p>
        <div class="conector-status"><span class="conector-status-dot ${item.id==='drive'&&state.driveBackupAtivo?'is-on':''}"></span>${conectoresStatus(item)}</div>
        ${conectoresCustoBadge(item)}
        <div class="conector-card-actions"><button class="btn btn-outline btn-sm" onclick="conectoresDetalhe('${item.id}')">Detalhes</button><button class="btn ${pref.marcado?'btn-primary':'btn-outline'} btn-sm" onclick="conectoresMarcar('${item.id}')">${pref.marcado?'Selecionado':'Preparar'}</button></div>
      </article>`;
    }).join('')}</div>
    <section class="conectores-config table-card">
      <div class="conectores-section-title"><div><h3>Controle de custos e permissões</h3><p>Configurações locais desta instalação</p></div><i data-lucide="sliders-horizontal" class="ic"></i></div>
      <label class="conector-check"><input type="checkbox" id="conectores-permitir-cobranca" ${cfg.permitirCobranca?'checked':''} onchange="conectoresAtualizarControle()"><span><strong>Autorizar serviços que podem gerar cobrança</strong><small>Desativado por padrão. A autorização não substitui a configuração de faturamento e limites no Google Cloud.</small></span></label>
      <div class="conectores-limites"><div class="form-group"><label>Orçamento mensal máximo desejado (R$)</label><input class="form-control" id="conectores-orcamento" type="number" min="0" step="1" value="${Number(cfg.orcamentoMensal)||0}" onchange="conectoresAtualizarControle()" placeholder="0 = não definido"></div><div class="form-group"><label>Alerta ao atingir</label><select class="form-control" id="conectores-alerta" onchange="conectoresAtualizarControle()"><option value="50" ${cfg.alertaPercentual===50?'selected':''}>50%</option><option value="70" ${cfg.alertaPercentual===70?'selected':''}>70%</option><option value="80" ${cfg.alertaPercentual===80?'selected':''}>80%</option><option value="90" ${cfg.alertaPercentual===90?'selected':''}>90%</option></select></div></div>
      <p class="conectores-nota">*As cotas gratuitas, preços e limites dependem do serviço e da conta. O orçamento definido aqui é uma preferência de controle; o bloqueio efetivo de gastos precisará ser configurado também no Google Cloud/backend.</p>
    </section>
    <div id="conectores-detalhe" class="conectores-detalhe" style="display:none"></div>
    <div class="conectores-rodape"><i data-lucide="info" class="ic"></i>As configurações desta central são salvas separadamente dos dados de clientes, vendas, estoque e financeiro.</div>`;
  if(typeof lucide!=='undefined')lucide.createIcons();
}
function conectoresMarcar(id){
  const item=CONECTORES_CATALOGO.find(x=>x.id===id);if(!item)return;
  const cfg=conectoresLerConfig();cfg.preferencias=cfg.preferencias||{};cfg.preferencias[id]=cfg.preferencias[id]||{};
  cfg.preferencias[id].marcado=!cfg.preferencias[id].marcado;
  if(conectoresSalvarConfig(cfg)){renderConectores();showToast(cfg.preferencias[id].marcado?'Conector marcado para configuração':'Seleção removida','green');}
}
function conectoresDetalhe(id){
  const item=CONECTORES_CATALOGO.find(x=>x.id===id);const box=document.getElementById('conectores-detalhe');if(!item||!box)return;
  box.innerHTML=`<div class="conector-detalhe-head"><div><span class="conector-kicker">DETALHES DO SERVIÇO</span><h3>${item.nome}</h3></div><button class="btn btn-outline btn-sm" onclick="document.getElementById('conectores-detalhe').style.display='none'">Fechar</button></div><p>${item.detalhe}</p><div class="conector-detalhe-meta"><span><strong>Uso previsto:</strong> ${item.uso}</span><span><strong>Custo:</strong> ${item.custo}</span><span><strong>Etapa:</strong> ${item.fase}</span></div>`;
  box.style.display='block';box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function conectoresAtualizarControle(){
  const cfg=conectoresLerConfig();
  cfg.permitirCobranca=!!document.getElementById('conectores-permitir-cobranca')?.checked;
  cfg.orcamentoMensal=Math.max(0,Number(document.getElementById('conectores-orcamento')?.value)||0);
  cfg.alertaPercentual=Number(document.getElementById('conectores-alerta')?.value)||80;
  if(conectoresSalvarConfig(cfg))showToast('Controles dos conectores salvos','green');
}
