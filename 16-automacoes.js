// ============ AUTOMAÇÕES, CADÊNCIAS E FILA DE ENVIO (v5.49) ============
// Uma REGRA liga um SEGMENTO salvo (v5.48.1) a uma CADÊNCIA de mensagens (por padrão dia 0, 3 e 7), cada passo com um
// modelo de mensagem do CRM. O app só roda com a tela aberta, então tudo é avaliado ao abrir o app e ao abrir o CRM / Meu dia.
// O envio continua MANUAL (o WhatsApp não permite envio automático): a fila deixa a mensagem pronta e um toque abre o WhatsApp.
//
// Dados (dentro do state, entram em backup/Drive):
//   state.crmAutomacoes  [{id,nome,ativa,segmentoId,cadencia:[{dia,modeloId}],criadaEm}]
//   state.crmFila        [{id,regraId,clienteId,dia,modeloId,entrada,previsto,status,motivo?,criadoEm,feitoEm?}]
//     status: pendente | enviado | pulado | cancelado
//   state.crmAutoLimite  máximo de envios por dia (padrão 20); o que passar fica para o dia seguinte
//   state.automacaoDisparos  chaves "cad-<regraId>|<clienteId>|<dia de entrada>" (autoDisparar, 00-core.js) — evitam inscrever
//                            o mesmo cliente duas vezes no mesmo dia.
//
// Regras de funcionamento:
//  • Dia 0 = dia em que o cliente passa a casar com o segmento (para quem já está nele, o dia em que a regra é ativada / o app é aberto).
//    Os passos seguintes são agendados a partir dessa data (entrada + dia).
//  • Um cliente só participa de UMA cadência por vez: enquanto tiver passos pendentes, não entra em outra.
//  • Depois que uma cadência termina (ou é cancelada), o mesmo cliente só volta à mesma regra após AUTO_COOLDOWN_DIAS dias.
//  • Se o cliente deixa de casar com o segmento (ex.: voltou a comprar), os passos pendentes dele são cancelados.
//  • Só entram clientes com telefone. Segmento sem critério nunca dispara (casaria com todo mundo).
//  • Fila do dia: passos com data prevista até hoje, só o mais antigo de cada cliente, limitado a (limite diário − enviados hoje).
//  • Ao enviar ou pular um passo, os seguintes mantêm o espaçamento (se estavam atrasados, são empurrados para frente).
//  • Alterar uma regra vale para NOVAS inscrições; passos já agendados seguem como foram criados.

const AUTO_LIMITE_PADRAO=20, AUTO_COOLDOWN_DIAS=30, AUTO_RETENCAO_DIAS=120, AUTO_MAX_PASSOS=6, AUTO_DIA_MAX=90;
const AUTO_CADENCIA_PADRAO=[0,3,7];

let autoUltimaExec=0;
let autoEditId=null;
let _autoPassos=[];
let _autoEnvio=null;

function auGaranteEstado(){
  if(!Array.isArray(state.crmAutomacoes)) state.crmAutomacoes=[];
  if(!Array.isArray(state.crmFila)) state.crmFila=[];
  if(!state.nextId) state.nextId={};
  if(!(state.nextId.crmAutomacoes>0)) state.nextId.crmAutomacoes=state.crmAutomacoes.reduce((m,r)=>Math.max(m,r.id||0),0)+1;
  if(!(state.nextId.crmFila>0)) state.nextId.crmFila=state.crmFila.reduce((m,i)=>Math.max(m,i.id||0),0)+1;
  if(!(state.crmAutoLimite>0)) state.crmAutoLimite=AUTO_LIMITE_PADRAO;
}

// ── Utilitários ──
function autoRegra(id){ return state.crmAutomacoes.find(r=>r.id==id)||null; }
function autoSegmento(r){ return r?((state.crmSegmentos||[]).find(s=>s.id==r.segmentoId)||null):null; }
function autoTel(c){ return String((c&&c.tel)||'').replace(/\D/g,''); }
function autoRotuloCadencia(r){ return (r.cadencia||[]).map(p=>'Dia '+p.dia).join(' · ')||'Sem passos'; }

// ── Avaliação: cancela quem saiu do segmento e inscreve quem entrou ──
function autoExecutar(forcar){
  auGaranteEstado();
  const agora=Date.now();
  if(!forcar&&agora-autoUltimaExec<3000) return {inscritos:0,cancelados:0};
  autoUltimaExec=agora;
  const hoje=today();
  const todos=relCalcClientes();
  const porId={}; todos.forEach(x=>{ porId[x.c.id]=x; });
  let cancelados=0, inscritos=0, mudou=false;

  // 1) cancela passos pendentes que perderam o sentido
  state.crmFila.forEach(it=>{
    if(it.status!=='pendente') return;
    const r=autoRegra(it.regraId);
    let motivo='';
    if(!r) motivo='regra excluída';
    else {
      const sg=autoSegmento(r);
      if(!sg) motivo='segmento excluído';
      else if(segTemCriterio(sg.crit)){
        const x=porId[it.clienteId];
        if(!x) motivo='cliente inativo ou removido';
        else if(!segCasa(x,segNormaliza(sg.crit))) motivo='saiu do segmento';
      }
    }
    if(motivo){ it.status='cancelado'; it.motivo=motivo; it.feitoEm=hoje; cancelados++; mudou=true; }
  });

  // 2) inscreve quem passou a casar com o segmento de uma regra ativa
  const comPendente=new Set(state.crmFila.filter(i=>i.status==='pendente').map(i=>i.clienteId));
  const limiteCooldown=relSomaDias(hoje,-AUTO_COOLDOWN_DIAS);
  state.crmAutomacoes.filter(r=>r.ativa).sort((a,b)=>a.id-b.id).forEach(r=>{
    const sg=autoSegmento(r);
    if(!sg||!segTemCriterio(sg.crit)||!(r.cadencia||[]).length) return;
    const crit=segNormaliza(sg.crit);
    todos.forEach(x=>{
      if(!segCasa(x,crit)) return;
      if(!autoTel(x.c)) return;
      if(comPendente.has(x.c.id)) return;
      if(state.crmFila.some(i=>i.regraId===r.id&&i.clienteId===x.c.id&&i.entrada>=limiteCooldown)) return;
      const ok=autoDisparar('cad-'+r.id,x.c.id,hoje,()=>{
        r.cadencia.forEach(p=>state.crmFila.push({
          id:nextId('crmFila'),regraId:r.id,clienteId:x.c.id,dia:p.dia,modeloId:p.modeloId,
          entrada:hoje,previsto:relSomaDias(hoje,p.dia),status:'pendente',criadoEm:hoje
        }));
      });
      if(ok){ comPendente.add(x.c.id); inscritos++; mudou=true; }
    });
  });

  // 3) limpeza: registros antigos de disparo e itens já encerrados
  autoLimparDisparos(AUTO_RETENCAO_DIAS);
  const limiteRet=relSomaDias(hoje,-AUTO_RETENCAO_DIAS), antes=state.crmFila.length;
  state.crmFila=state.crmFila.filter(i=>i.status==='pendente'||String(i.feitoEm||i.criadoEm||'9999')>=limiteRet);
  if(state.crmFila.length!==antes) mudou=true;

  if(mudou) marcarAlterado();
  return {inscritos,cancelados};
}

// ── Fila do dia ──
function autoFilaHoje(){
  auGaranteEstado();
  const hoje=today();
  const ativas=new Set(state.crmAutomacoes.filter(r=>r.ativa).map(r=>r.id));
  const devidos=state.crmFila.filter(i=>i.status==='pendente'&&ativas.has(i.regraId)&&i.previsto<=hoje)
    .sort((a,b)=>a.previsto.localeCompare(b.previsto)||a.id-b.id);
  const vistos=new Set(), unicos=[];
  devidos.forEach(i=>{ if(vistos.has(i.clienteId)) return; vistos.add(i.clienteId); unicos.push(i); });
  const limite=state.crmAutoLimite||AUTO_LIMITE_PADRAO;
  const enviadosHoje=state.crmFila.filter(i=>i.status==='enviado'&&i.feitoEm===hoje).length;
  const sobra=Math.max(0,limite-enviadosHoje);
  return {visiveis:unicos.slice(0,sobra),adiados:Math.max(0,unicos.length-sobra),enviadosHoje,limite};
}

// Encerra um passo (enviado/pulado) e mantém o espaçamento dos seguintes da mesma inscrição.
function autoConcluirItem(it,status){
  const hoje=today();
  it.status=status; it.feitoEm=hoje;
  state.crmFila.filter(o=>o.status==='pendente'&&o.regraId===it.regraId&&o.clienteId===it.clienteId&&o.entrada===it.entrada&&o.dia>it.dia)
    .forEach(o=>{ const min=relSomaDias(hoje,o.dia-it.dia); if(o.previsto<min) o.previsto=min; });
  marcarAlterado();
}
function autoAtualizaTelas(){ crmAtualizaTelas(); }

// ── Linha da fila (usada na aba e no Meu dia) ──
function autoLinhaFila(it,porId,hoje){
  const x=porId[it.clienteId], r=autoRegra(it.regraId);
  const nome=x?x.c.nome:'Cliente removido', atrasada=it.previsto<hoje;
  const rotulo=crmRotuloData(it.previsto,hoje);
  return `<div class="crm-item"><div class="crm-item-main"><strong>${escapeHtml(nome)}</strong> <span class="badge badge-gray">Dia ${it.dia}</span>
      <div class="crm-card-sub${atrasada?' crm-atraso':''}">${escapeHtml(r?r.nome:'—')} · ${rotulo}</div></div>
    <div class="actions-cell"><button class="btn btn-whatsapp btn-sm" title="Abrir mensagem" onclick="autoAbrirEnvio(${it.id})"><i data-lucide="message-circle" class="ic"></i></button>
      <button class="icon-btn edit" title="Pular este passo" onclick="autoPular(${it.id})"><i data-lucide="skip-forward" class="ic"></i></button></div></div>`;
}
function autoMapaClientes(){ const m={}; relCalcClientes().forEach(x=>{ m[x.c.id]=x; }); return m; }

// Bloco para a tela "Meu dia" (chamado por crmMeuDiaHtml em 13-crm.js)
function autoFilaMeuDia(){
  try{ autoExecutar(); }catch(e){ console.warn('[GestãoPRO] Automações:',e); }
  const f=autoFilaHoje();
  if(!f.visiveis.length) return {qtd:0,html:''};
  const hoje=today(), porId=autoMapaClientes(), MAX=10;
  const linhas=f.visiveis.slice(0,MAX).map(it=>autoLinhaFila(it,porId,hoje)).join('');
  const mais=f.visiveis.length>MAX?`<div style="text-align:center;margin-top:8px"><button class="btn btn-outline btn-sm" onclick="state.crm_tab='automacoes';goto('crm')">Ver todas (${f.visiveis.length})</button></div>`:'';
  return {qtd:f.visiveis.length,html:`<div class="crm-meudia"><h3 class="crm-sec-titulo"><i data-lucide="zap" class="ic ic-sm"></i> Automações · mensagens do dia <span>(${f.visiveis.length})</span></h3><div class="crm-lista">${linhas}</div>${mais}</div>`};
}

// ── Aba "Automações" do CRM ──
function autoSetLimite(v){ auGaranteEstado(); state.crmAutoLimite=Math.max(1,parseInt(v)||AUTO_LIMITE_PADRAO); marcarAlterado(); autoAtualizaTelas(); }
function autoHtmlAba(){
  auGaranteEstado();
  const hoje=today(), f=autoFilaHoje(), porId=autoMapaClientes();
  const limites=[5,10,20,30,50]; if(!limites.includes(f.limite)) limites.push(f.limite), limites.sort((a,b)=>a-b);
  const topo=`<div class="crm-toolbar"><button class="btn btn-primary btn-sm" onclick="autoNovaRegra()"><i data-lucide="plus" class="ic"></i> Regra</button>
    <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted)">Envios por dia
      <select class="filter" style="min-width:70px;flex:none" onchange="autoSetLimite(this.value)">${limites.map(n=>`<option value="${n}"${n===f.limite?' selected':''}>${n}</option>`).join('')}</select></label></div>
    <div class="crm-card-sub" style="margin-bottom:12px">Cada regra liga um segmento a uma cadência de mensagens. O app prepara a fila e você envia com um toque.</div>`;

  let fila;
  if(!f.visiveis.length){
    fila=`<div class="crm-vazio" style="padding:18px">${f.adiados?'Limite de envios de hoje atingido.':'Nenhuma mensagem para enviar agora.'}</div>`;
  } else fila=`<div class="crm-lista">${f.visiveis.map(it=>autoLinhaFila(it,porId,hoje)).join('')}</div>`;
  const resumoFila=`<div class="crm-card-sub" style="margin:6px 0 0">Enviados hoje: ${f.enviadosHoje} de ${f.limite}${f.adiados?' · '+f.adiados+' ficam para os próximos dias':''}</div>`;

  const regras=state.crmAutomacoes.slice().sort((a,b)=>a.id-b.id);
  let lista;
  if(!regras.length) lista='<div class="crm-vazio" style="padding:18px">Nenhuma regra ainda. Crie um segmento em Clientes e depois uma regra aqui.</div>';
  else lista='<div class="crm-lista">'+regras.map(r=>{
    const sg=autoSegmento(r);
    const meus=state.crmFila.filter(i=>i.regraId===r.id);
    const andamento=new Set(meus.filter(i=>i.status==='pendente').map(i=>i.clienteId)).size;
    const enviados=meus.filter(i=>i.status==='enviado').length;
    const aviso=!sg?'<span class="badge badge-red">Segmento excluído</span>':(!r.ativa?'<span class="badge badge-gray">Pausada</span>':'');
    return `<div class="crm-item"><div class="crm-item-main"><strong>${escapeHtml(r.nome)}</strong> ${aviso}
        <div class="crm-card-sub">${sg?escapeHtml(sg.nome)+' · '+escapeHtml(segDescreve(sg.crit)):'Escolha outro segmento'}</div>
        <div class="crm-card-sub">${escapeHtml(autoRotuloCadencia(r))} · ${andamento} em andamento · ${enviados} enviada${enviados!==1?'s':''}</div>
        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;margin-top:4px"><input type="checkbox" ${r.ativa?'checked':''} onchange="autoToggleRegra(${r.id},this.checked)"> Ativa</label></div>
      <div class="actions-cell"><button class="icon-btn edit" title="Editar" onclick="autoAbrirRegra(${r.id})"><i data-lucide="pencil" class="ic"></i></button></div></div>`;
  }).join('')+'</div>';

  return topo+`<h3 class="crm-sec-titulo">Fila de hoje <span>(${f.visiveis.length})</span></h3>${fila}${resumoFila}
    <h3 class="crm-sec-titulo" style="margin-top:18px">Regras <span>(${regras.length})</span></h3>${lista}`;
}

function autoToggleRegra(id,on){
  const r=autoRegra(id); if(!r) return;
  r.ativa=!!on; marcarAlterado();
  if(r.ativa) autoExecutar(true);
  autoAtualizaTelas();
  showToast(r.ativa?'Regra ativada':'Regra pausada','green');
}
function autoPular(id){
  const it=state.crmFila.find(i=>i.id===id); if(!it||it.status!=='pendente') return;
  confirmarAcao('Pular este passo? O cliente não recebe esta mensagem.',()=>{ autoConcluirItem(it,'pulado'); autoAtualizaTelas(); showToast('Passo pulado','green'); });
}

// ── Envio de um passo da fila ──
function autoAbrirEnvio(id){
  auGaranteEstado(); autoModais();
  const it=state.crmFila.find(i=>i.id===id); if(!it||it.status!=='pendente') return;
  const x=relCalcClientes().find(x=>x.c.id===it.clienteId);
  if(!x){ showToast('Cliente não encontrado','red'); return; }
  if(!autoTel(x.c)){ showToast('Cliente sem telefone cadastrado','red'); return; }
  const r=autoRegra(it.regraId);
  const m=state.crmModelos.find(m=>m.id==it.modeloId)||state.crmModelos[0]||null;
  _autoEnvio={it,x,r};
  document.getElementById('auto-env-info').textContent=x.c.nome+' · '+(r?r.nome:'automação')+' · passo do dia '+it.dia;
  document.getElementById('auto-env-texto').value=m?c360Preencher(m.texto,x):'';
  document.getElementById('modal-auto-envio').classList.add('open');
}
function autoEnvioConfirmar(){
  const e=_autoEnvio; if(!e) return;
  const texto=document.getElementById('auto-env-texto').value.trim();
  if(!texto){ showToast('Mensagem vazia','red'); return; }
  crmWhats(e.x.c.tel,texto);
  state.crmAtividades.push({id:nextId('crmAtividades'),tipo:'whatsapp',titulo:'WhatsApp: '+(e.r?e.r.nome:'automação')+' · dia '+e.it.dia,
    data:today(),hora:'',concluida:true,concluidaEm:today(),criadoEm:today(),clienteId:e.x.c.id,leadId:null,negocioId:null});
  autoConcluirItem(e.it,'enviado');
  _autoEnvio=null; closeModal('modal-auto-envio'); autoAtualizaTelas();
}
function autoEnvioPular(){
  const e=_autoEnvio; if(!e) return;
  autoConcluirItem(e.it,'pulado');
  _autoEnvio=null; closeModal('modal-auto-envio'); autoAtualizaTelas(); showToast('Passo pulado','green');
}

// ── Modais (criados no primeiro uso) ──
function autoModais(){
  if(document.getElementById('modal-auto-regra')) return;
  const w=document.createElement('div');
  w.innerHTML=`
<div class="modal-overlay" id="modal-auto-regra"><div class="modal">
  <div class="modal-header"><h3 id="auto-regra-titulo">Nova regra</h3><button class="modal-close" onclick="closeModal('modal-auto-regra')"><i data-lucide="x" class="ic"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label>Nome da regra</label><input class="form-control" id="auto-nome" maxlength="40" placeholder="Ex: Reativar inativos"></div>
    <div class="form-group"><label>Segmento</label><select class="form-control" id="auto-seg" onchange="autoSegMudou()"></select>
      <div class="crm-card-sub" id="auto-seg-desc" style="margin-top:4px"></div></div>
    <div class="form-group"><label>Cadência (dia 0 = dia em que o cliente entra no segmento)</label><div id="auto-passos"></div>
      <button class="btn btn-outline btn-sm" id="auto-passo-add" onclick="autoPassoAdd()"><i data-lucide="plus" class="ic"></i> Passo</button></div>
    <div class="form-group"><label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="auto-ativa"> Regra ativa</label></div>
    <div class="crm-card-sub" style="margin-bottom:10px">Mudanças valem para novas inscrições; passos já agendados seguem como estavam.</div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="auto-del" style="margin-right:auto;display:none" onclick="autoExcluirRegra()">Excluir</button>
      <button class="btn btn-outline" onclick="closeModal('modal-auto-regra')">Cancelar</button>
      <button class="btn btn-primary" onclick="autoSalvarRegra()">Salvar</button>
    </div>
  </div>
</div></div>
<div class="modal-overlay" id="modal-auto-envio"><div class="modal">
  <div class="modal-header"><h3>Enviar WhatsApp</h3><button class="modal-close" onclick="closeModal('modal-auto-envio')"><i data-lucide="x" class="ic"></i></button></div>
  <div class="modal-body">
    <div class="crm-card-sub" id="auto-env-info" style="margin-bottom:8px"></div>
    <div class="form-group"><label>Mensagem (pode editar antes de enviar)</label><textarea class="form-control" id="auto-env-texto" rows="6"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-outline" style="margin-right:auto" onclick="autoEnvioPular()">Pular passo</button>
      <button class="btn btn-outline" onclick="closeModal('modal-auto-envio')">Cancelar</button>
      <button class="btn btn-whatsapp" onclick="autoEnvioConfirmar()">Abrir WhatsApp</button>
    </div>
  </div>
</div></div>`;
  while(w.firstChild) document.body.appendChild(w.firstChild);
  document.querySelectorAll('#modal-auto-regra,#modal-auto-envio').forEach(m=>{
    m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('open'); });
  });
}

// ── Editor de regra ──
function autoModeloSugerido(segId){
  const sg=(state.crmSegmentos||[]).find(s=>s.id==segId);
  const base=(sg&&sg.crit&&Array.isArray(sg.crit.segs)&&sg.crit.segs[0])||'';
  return (state.crmModelos.find(m=>m.seg===base)||state.crmModelos[0]).id;
}
function autoNovaRegra(){ autoAbrirRegra(null); }
function autoAbrirRegra(id){
  auGaranteEstado(); autoModais();
  if(!(state.crmSegmentos||[]).length){ showToast('Crie um segmento primeiro (CRM › Clientes › + Segmento)','red'); return; }
  if(!state.crmModelos.length){ showToast('Crie um modelo de mensagem primeiro (CRM › Modelos)','red'); return; }
  const r=id?autoRegra(id):null;
  autoEditId=r?r.id:null;
  document.getElementById('auto-regra-titulo').textContent=r?'Editar regra':'Nova regra';
  document.getElementById('auto-nome').value=r?r.nome:'';
  const segAtual=r&&autoSegmento(r)?r.segmentoId:state.crmSegmentos[0].id;
  document.getElementById('auto-seg').innerHTML=state.crmSegmentos.map(s=>`<option value="${s.id}"${s.id==segAtual?' selected':''}>${escapeHtml(s.nome)}</option>`).join('');
  document.getElementById('auto-ativa').checked=r?!!r.ativa:true;
  _autoPassos=r?r.cadencia.map(p=>({dia:p.dia,modeloId:p.modeloId})):AUTO_CADENCIA_PADRAO.map(d=>({dia:d,modeloId:autoModeloSugerido(segAtual)}));
  document.getElementById('auto-del').style.display=r?'inline-flex':'none';
  autoSegDesc(); autoPassosRender();
  document.getElementById('modal-auto-regra').classList.add('open');
}
function autoSegDesc(){
  const sg=(state.crmSegmentos||[]).find(s=>s.id==document.getElementById('auto-seg').value);
  document.getElementById('auto-seg-desc').textContent=sg?segDescreve(sg.crit):'';
}
function autoSegMudou(){
  autoSegDesc();
  if(!autoEditId){ // regra nova: sugere o modelo do segmento escolhido
    autoPassosSync();
    const m=autoModeloSugerido(document.getElementById('auto-seg').value);
    _autoPassos.forEach(p=>{ p.modeloId=m; });
    autoPassosRender();
  }
}
function autoPassosSync(){
  const dias=document.querySelectorAll('#auto-passos input[type=number]'), mods=document.querySelectorAll('#auto-passos select');
  if(dias.length!==_autoPassos.length) return;
  _autoPassos=_autoPassos.map((p,i)=>({dia:dias[i].value===''?'':Number(dias[i].value),modeloId:parseInt(mods[i].value)||p.modeloId}));
}
function autoPassosRender(){
  const el=document.getElementById('auto-passos');
  el.innerHTML=_autoPassos.map((p,i)=>`<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
    <span style="font-size:12px;color:var(--muted)">Dia</span>
    <input class="form-control" type="number" min="0" max="${AUTO_DIA_MAX}" step="1" inputmode="numeric" style="width:64px;flex:none" value="${p.dia}">
    <select class="form-control" style="flex:1;min-width:0">${state.crmModelos.map(m=>`<option value="${m.id}"${m.id==p.modeloId?' selected':''}>${escapeHtml(m.nome)}</option>`).join('')}</select>
    <button class="icon-btn del" title="Remover passo" onclick="autoPassoRem(${i})"><i data-lucide="trash-2" class="ic"></i></button></div>`).join('');
  document.getElementById('auto-passo-add').style.display=_autoPassos.length>=AUTO_MAX_PASSOS?'none':'inline-flex';
  if(typeof lucide!=='undefined') lucide.createIcons();
}
function autoPassoAdd(){
  autoPassosSync();
  if(_autoPassos.length>=AUTO_MAX_PASSOS) return;
  const maior=_autoPassos.reduce((m,p)=>Math.max(m,Number(p.dia)||0),0);
  _autoPassos.push({dia:Math.min(AUTO_DIA_MAX,maior+7),modeloId:autoModeloSugerido(document.getElementById('auto-seg').value)});
  autoPassosRender();
}
function autoPassoRem(i){
  autoPassosSync();
  if(_autoPassos.length<=1){ showToast('A cadência precisa de ao menos um passo','red'); return; }
  _autoPassos.splice(i,1); autoPassosRender();
}
function autoSalvarRegra(){
  autoPassosSync();
  const nome=document.getElementById('auto-nome').value.trim();
  if(!nome){ showToast('Dê um nome à regra','red'); return; }
  if(state.crmAutomacoes.some(r=>r.id!==autoEditId&&r.nome.toLowerCase()===nome.toLowerCase())){ showToast('Já existe uma regra com esse nome','red'); return; }
  const segId=parseInt(document.getElementById('auto-seg').value);
  const sg=(state.crmSegmentos||[]).find(s=>s.id===segId);
  if(!sg){ showToast('Escolha um segmento','red'); return; }
  const dias=_autoPassos.map(p=>p.dia);
  if(dias.some(d=>d===''||!Number.isInteger(d)||d<0||d>AUTO_DIA_MAX)){ showToast('Os dias devem ser números inteiros de 0 a '+AUTO_DIA_MAX,'red'); return; }
  if(new Set(dias).size!==dias.length){ showToast('Há dois passos no mesmo dia','red'); return; }
  const cadencia=_autoPassos.map(p=>({dia:p.dia,modeloId:p.modeloId})).sort((a,b)=>a.dia-b.dia);
  const ativa=document.getElementById('auto-ativa').checked;
  if(autoEditId){ const r=autoRegra(autoEditId); if(r){ r.nome=nome; r.segmentoId=segId; r.cadencia=cadencia; r.ativa=ativa; } }
  else state.crmAutomacoes.push({id:nextId('crmAutomacoes'),nome,ativa,segmentoId:segId,cadencia,criadaEm:today()});
  marcarAlterado(); closeModal('modal-auto-regra');
  const res=autoExecutar(true);
  autoAtualizaTelas();
  showToast(ativa&&res.inscritos?('Regra salva · '+res.inscritos+' cliente'+(res.inscritos!==1?'s':'')+' na fila'):'Regra salva','green');
}
function autoExcluirRegra(){
  const id=autoEditId; if(!id) return;
  confirmarAcao('Excluir esta regra? Os passos pendentes dela serão cancelados.',()=>{
    state.crmFila.forEach(i=>{ if(i.regraId===id&&i.status==='pendente'){ i.status='cancelado'; i.motivo='regra excluída'; i.feitoEm=today(); } });
    state.crmAutomacoes=state.crmAutomacoes.filter(r=>r.id!==id);
    marcarAlterado(); closeModal('modal-auto-regra'); autoAtualizaTelas(); showToast('Regra excluída','green');
  });
}
