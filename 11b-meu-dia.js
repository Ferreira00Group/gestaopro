// ============ MEU DIA POR ROTA (v5.40) ============
// Tela só de leitura: junta, por rota, as ENTREGAS pendentes e as COBRANÇAS vencidas.
// Não grava nada novo — os botões reaproveitam abrirPagamento() e cobrarWhatsapp().
// Uma "parada" = um cliente (mesmo com várias vendas).

// Pedidos antigos criados antes do controle de entrega não têm statusPedido e apareceriam como
// "Em preparação" para sempre. Por isso só entram pedidos dos últimos N dias.
const MEUDIA_DIAS_ENTREGA = 30;
let meuDiaRota = ''; // '' = todas as rotas | 'none' = sem rota | id da rota

function meuDiaDataLimite(hoje, dias){
  const [y,m,d] = String(hoje).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d - dias));
  return dt.getUTCFullYear()+'-'+String(dt.getUTCMonth()+1).padStart(2,'0')+'-'+String(dt.getUTCDate()).padStart(2,'0');
}

// Monta todas as paradas do dia (sem filtro de rota). Chama o motor FIFO UMA vez.
function getParadasDoDia(){
  const hoje = today();
  const limite = meuDiaDataLimite(hoje, MEUDIA_DIAS_ENTREGA);
  const cfgEnc = encargosCfg();
  const mapaFiado = getMapaSituacaoFiado();
  const paradas = {};
  const get = (clienteId)=>{
    const c = state.clientes.find(x=>x.id==clienteId);
    if(!c) return null;
    return paradas[clienteId] || (paradas[clienteId] = {
      id:c.id, c, rotaId:c.rotaId||null, entregas:[], vencido:0, venc:null, enc:0, us:[]
    });
  };

  // Cobrança: fiado vencido ou vencendo hoje (mesma regra da "Cobrança do dia")
  getUnidadesFiadoFlat().forEach(u=>{
    if(u.status==='pago' || !u.vencimento || u.vencimento>hoje) return;
    const p = get(u.clienteId); if(!p) return;
    p.vencido += u.valorRestante;
    p.us.push(u);
    if(!p.venc || u.vencimento<p.venc) p.venc = u.vencimento;
    const e = encargoDaUnidade(u, hoje, cfgEnc);
    if(e) p.enc += e.total;
  });

  // Entregas: vendas (não orçamento) ainda não entregues, dentro da janela
  state.vendas.forEach(v=>{
    if(v.tipo==='orcamento' || v.statusPedido==='entregue') return;
    if((v.data||'') < limite) return;
    const p = get(v.clienteId); if(!p) return;
    const sit = situacaoVenda(v, mapaFiado);
    p.entregas.push({v, sit});
  });

  return Object.values(paradas)
    .filter(p=>p.entregas.length>0 || p.vencido>0.009)
    .map(p=>({
      ...p,
      vencido: round2(p.vencido),
      enc: round2(p.enc),
      dias: p.venc ? diasEntre(p.venc, hoje) : 0,
      saldo: getSaldoCliente(p.id)
    }));
}

function meuDiaOrdenar(lista){
  return lista.sort((a,b)=>{
    const oa = (a.c.rotaOrdem!=null ? a.c.rotaOrdem : 9999), ob = (b.c.rotaOrdem!=null ? b.c.rotaOrdem : 9999);
    return oa-ob || String(a.c.nome).localeCompare(String(b.c.nome),'pt-BR');
  });
}

function meuDiaSelecionarRota(v){ meuDiaRota = v; meuDiaOtim = null; renderMeuDia(); }

// ---- Rota otimizada (v5.51) ----
// Ordem calculada no próprio aparelho (vizinho mais próximo + 2-opt, distância em linha reta).
// Não grava nada: vale só enquanto a tela está aberta. Saída: link do Google Maps com paradas.
let meuDiaOtim = null; // {ids:[...ordem], semPin:[...], pos:{lat,lng}|null, km}
const MEUDIA_MAX_TRECHO = 10; // Google Maps: origem + até 9 paradas intermediárias + destino
function geoKm(a,b){
  const R=6371, rad=x=>x*Math.PI/180;
  const dLa=rad(b.lat-a.lat), dLo=rad(b.lng-a.lng);
  const h=Math.sin(dLa/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function ordenarRotaCurta(inicio, pts){
  // pts: [{id,lat,lng}] ; inicio: {lat,lng}|null. Retorna {ordem:[pts], km}
  if(!pts.length) return {ordem:[],km:0};
  const rest=pts.slice(); const ordem=[];
  let cur=inicio;
  if(!cur){ // sem GPS: parte do ponto mais a oeste/norte da lista só pra ter um começo estável
    rest.sort((a,b)=>a.lng-b.lng||b.lat-a.lat); cur=rest.shift(); ordem.push(cur);
  }
  while(rest.length){
    let bi=0,bd=Infinity;
    rest.forEach((p,i)=>{const d=geoKm(cur,p);if(d<bd){bd=d;bi=i;}});
    cur=rest.splice(bi,1)[0]; ordem.push(cur);
  }
  // 2-opt (caminho aberto, início fixo)
  const nodes=inicio?[inicio,...ordem]:ordem.slice();
  const ini=inicio?1:1; // nunca troca o primeiro nó
  let melhorou=true, it=0;
  while(melhorou && it++<60){
    melhorou=false;
    for(let i=ini;i<nodes.length-1;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i-1], b=nodes[i], c=nodes[j], d=nodes[j+1];
        const antes=geoKm(a,b)+(d?geoKm(c,d):0);
        const depois=geoKm(a,c)+(d?geoKm(b,d):0);
        if(depois+1e-9<antes){
          const seg=nodes.slice(i,j+1).reverse();
          nodes.splice(i,j-i+1,...seg); melhorou=true;
        }
      }
    }
  }
  const final=inicio?nodes.slice(1):nodes;
  let km=0, prev=inicio||final[0];
  final.forEach((p,i)=>{ if(i>0||inicio) km+=geoKm(prev,p); prev=p; });
  return {ordem:final,km};
}
function meuDiaParadasFiltradas(){
  let todas = getParadasDoDia();
  if(meuDiaRota==='none') todas = todas.filter(p=>!p.rotaId);
  else if(meuDiaRota) todas = todas.filter(p=>String(p.rotaId||'')===String(meuDiaRota));
  return todas;
}
function meuDiaOtimizar(){
  const todas = meuDiaParadasFiltradas();
  const comPin = todas.filter(p=>clienteTemPin(p.c));
  const semPin = todas.filter(p=>!clienteTemPin(p.c));
  if(!comPin.length){ showToast('Nenhum cliente desta lista tem localização salva. Cadastre no cliente.','red'); return; }
  const aplicar = (pos)=>{
    const r = ordenarRotaCurta(pos, comPin.map(p=>({id:p.id,lat:p.c.lat,lng:p.c.lng})));
    const volta = !!(state.voltarInicio && pos);
    let km = r.km;
    if(volta && r.ordem.length) km += geoKm(r.ordem[r.ordem.length-1], pos);
    meuDiaOtim = {ids:r.ordem.map(x=>x.id), semPin:semPin.map(p=>p.id), pos, km, volta};
    renderMeuDia();
    showToast('Rota organizada: '+comPin.length+' parada(s)'+(semPin.length?' · '+semPin.length+' sem localização':''),'green');
  };
  const pf=state.pontoPartida;
  if(state.partidaModo==='fixo' && pf && typeof pf.lat==='number'){ aplicar({lat:pf.lat,lng:pf.lng}); return; }
  if(!navigator.geolocation){ aplicar(null); return; }
  showToast('Pegando sua localização…','');
  navigator.geolocation.getCurrentPosition(
    p=>aplicar({lat:p.coords.latitude,lng:p.coords.longitude}),
    ()=>{ showToast('Sem GPS agora: a rota parte de uma das paradas','red'); aplicar(null); },
    {enableHighAccuracy:false,timeout:10000,maximumAge:120000}
  );
}
// ---- Ponto de partida (casa/empresa) ----
function meuDiaPartidaBox(){
  const b=document.getElementById('meudia-partida-box'); if(!b) return;
  const fixo=state.pontoPartida&&typeof state.pontoPartida.lat==='number';
  const modo=(state.partidaModo==='fixo'&&fixo)?'fixo':'gps';
  b.innerHTML=`<span style="color:var(--muted)">Partir de:</span>
    <select class="form-control" style="width:auto;min-width:130px;padding:4px 8px" onchange="meuDiaSetPartidaModo(this.value)">
      <option value="gps"${modo==='gps'?' selected':''}>Onde estou (GPS)</option>
      <option value="fixo"${modo==='fixo'?' selected':''}${fixo?'':' disabled'}>${fixo?escapeHtml(state.pontoPartida.rotulo||'Casa/empresa'):'Casa/empresa (não definido)'}</option>
    </select>
    <button class="btn btn-outline btn-sm" onclick="meuDiaDefinirPartida()">${fixo?'Alterar':'Definir'} casa/empresa</button>
    <label style="display:inline-flex;align-items:center;gap:5px;margin:0"><input type="checkbox" style="width:auto;margin:0"${state.voltarInicio?' checked':''} onchange="meuDiaSetVoltar(this.checked)"> Voltar ao início</label>`;
}
function meuDiaSetPartidaModo(v){ state.partidaModo=v; marcarAlterado(); meuDiaOtim=null; renderMeuDia(); }
function meuDiaSetVoltar(v){ state.voltarInicio=!!v; marcarAlterado(); meuDiaOtim=null; renderMeuDia(); }
function meuDiaDefinirPartida(){
  const rot=prompt('Nome do ponto de partida (ex: Casa, Empresa):', (state.pontoPartida&&state.pontoPartida.rotulo)||'Casa');
  if(rot===null) return;
  const t=prompt('Cole o link longo do Maps ou "lat, lng". Deixe vazio para usar o GPS agora (esteja no local):','');
  if(t===null) return;
  const salvar=(lat,lng)=>{
    state.pontoPartida={lat,lng,rotulo:(rot||'Casa/empresa').trim()};
    state.partidaModo='fixo'; marcarAlterado(); meuDiaOtim=null; renderMeuDia();
    showToast('Ponto de partida salvo','green');
  };
  if(t.trim()){
    const p=parseLocMapa(t);
    if(!p){ showToast('Não consegui ler essa localização. Use link longo ou "lat, lng"','red'); return; }
    salvar(p.lat,p.lng);
  } else {
    if(!navigator.geolocation){ showToast('Sem GPS neste aparelho','red'); return; }
    showToast('Pegando localização…','');
    navigator.geolocation.getCurrentPosition(p=>salvar(p.coords.latitude,p.coords.longitude),
      ()=>showToast('Não consegui o GPS agora','red'),{enableHighAccuracy:true,timeout:25000,maximumAge:0});
  }
}
function meuDiaLimparOtim(){ meuDiaOtim=null; renderMeuDia(); }
function meuDiaMapsUrl(origem, paradas, volta){
  const f=p=>p.lat+','+p.lng;
  const dest=volta||paradas[paradas.length-1];
  const way=(volta?paradas:paradas.slice(0,-1)).map(f).join('|');
  return 'https://www.google.com/maps/dir/?api=1&travelmode=driving'
    +(origem?'&origin='+f(origem):'')
    +'&destination='+f(dest)+(way?'&waypoints='+encodeURIComponent(way):'');
}
function meuDiaTamTrecho(volta){ return volta?MEUDIA_MAX_TRECHO-1:MEUDIA_MAX_TRECHO; }
function meuDiaAbrirTrecho(k){
  if(!meuDiaOtim) return;
  const pts=meuDiaOtim.ids.map(id=>state.clientes.find(c=>c.id==id)).filter(clienteTemPin).map(c=>({lat:c.lat,lng:c.lng}));
  const T=meuDiaTamTrecho(meuDiaOtim.volta);
  const ini=k*T, grupo=pts.slice(ini,ini+T);
  if(!grupo.length) return;
  const origem = k===0 ? meuDiaOtim.pos : pts[ini-1];
  const ultimo = (ini+T)>=pts.length;
  window.open(meuDiaMapsUrl(origem,grupo,(meuDiaOtim.volta&&ultimo)?meuDiaOtim.pos:null),'_blank');
}
function meuDiaIrAte(clienteId){
  const c=state.clientes.find(x=>x.id==clienteId); if(!c) return;
  if(clienteTemPin(c)) window.open('https://www.google.com/maps/dir/?api=1&travelmode=driving&destination='+c.lat+','+c.lng,'_blank');
  else if(c.locLink) window.open(c.locLink,'_blank');
  else if(c.end) window.open('https://www.google.com/maps/dir/?api=1&travelmode=driving&destination='+encodeURIComponent(c.end),'_blank');
}

function meuDiaCobrar(clienteId){ cobrarWhatsapp(clienteId); renderMeuDia(); }

function meuDiaEntregaHtml(e){
  const v = e.v;
  const itens = (v.itens||[]).map(it=>escapeHtml(nomeItemVenda(it))+' ×'+it.qtd).join(', ') || 'Venda';
  const num = 'VD'+String(v.id).padStart(4,'0');
  let pag;
  if(v.forma==='fiado'){
    pag = e.sit.status==='pago' ? '<span class="badge badge-green">Fiado pago</span>' : '<span class="badge badge-yellow">Fiado</span>';
  } else {
    pag = '<span class="badge badge-green">Pago · '+escapeHtml(formaLabel(v.forma))+'</span>';
  }
  return `<div style="padding:6px 0;border-top:1px dashed var(--border);font-size:12.5px">
    <div><strong>${num}</strong> · ${fmtDate(v.data)} · <strong>${fmt(v.total)}</strong> ${pag}</div>
    <div style="color:var(--muted)">${itens}</div>
    ${v.obs?`<div style="color:var(--muted);font-style:italic">${escapeHtml(v.obs)}</div>`:''}
  </div>`;
}

function meuDiaParadaHtml(p, n){
  const hoje = today();
  const uc = textoUltimaCobranca(p.c, hoje);
  const temEntrega = p.entregas.length>0;
  const temCobr = p.vencido>0.009;
  const end = [p.c.end, p.c.referencia].filter(Boolean).join(' — ');
  const corVenc = p.dias>0 ? 'var(--red)' : '#d35400';
  const selos = [];
  if(temEntrega) selos.push(`<span class="badge badge-orange">📦 ${p.entregas.length} entrega${p.entregas.length>1?'s':''}</span>`);
  if(temCobr) selos.push(`<span class="badge badge-red">💰 Cobrar ${fmt(p.vencido)}${p.dias>0?' · '+p.dias+'d':' · hoje'}</span>`);
  const prom = (typeof promessaEstado==='function') ? promessaEstado(p.id, hoje, p.us) : null;
  if(prom) selos.push(prom.estado==='ativa'
    ? `<span class="badge badge-yellow">🤝 Prometeu ${fmtDate(prom.data)}</span>`
    : `<span class="badge badge-red">⚠️ Promessa quebrada ${fmtDate(prom.data)}</span>`);
  if(!estaAtivo(p.c)) selos.push('<span class="badge badge-gray">Arquivado</span>');
  if(uc.hoje) selos.push('<span class="badge badge-green">Cobrado hoje</span>');
  if(!p.c.end) selos.push('<span class="badge badge-gray">⚠️ sem endereço</span>');
  if(meuDiaOtim && !clienteTemPin(p.c)) selos.push('<span class="badge badge-gray">📍 sem localização</span>');
  const tel = (p.c.tel||'').trim();
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
      <div style="min-width:0">
        <div style="font-weight:700;font-size:15px"><span style="color:var(--muted);font-weight:600">${n}.</span> <span class="nome-cartao-link" onclick="abrirCartaoCliente(${p.c.id})">${escapeHtml(p.c.nome)}</span> <span style="font-size:11px;color:var(--muted);font-weight:500">${fmtClienteNum(p.id)}</span></div>
        ${end?`<div style="font-size:12px;color:var(--muted)">📍 ${escapeHtml(end)}</div>`:''}
        ${tel?`<div style="font-size:12px;color:var(--muted)">${escapeHtml(tel)}</div>`:''}
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">${selos.join('')}</div>
    ${p.entregas.map(meuDiaEntregaHtml).join('')}
    ${temCobr?`<div style="padding:6px 0;border-top:1px dashed var(--border);font-size:12.5px">
      Vencido desde <span style="color:${corVenc};font-weight:600">${fmtDate(p.venc)}</span>
      · saldo total do cliente <strong>${fmt(p.saldo)}</strong>
      ${p.enc>0?`<div style="color:var(--muted)">+ ${fmt(p.enc)} de encargos (informativo)</div>`:''}
      <div style="color:var(--muted)">Última cobrança: ${uc.txt}</div>
    </div>`:''}
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
      ${p.saldo>0.009?`<button class="btn btn-green btn-sm" onclick="abrirPagamento(${p.id})"><i data-lucide="banknote" class="ic"></i> Receber</button>`:''}
      ${tel&&p.saldo>0.009?`<button class="btn btn-whatsapp btn-sm" onclick="meuDiaCobrar(${p.id})"><i data-lucide="message-circle" class="ic"></i> Cobrar</button>`:''}
      ${(clienteTemPin(p.c)||p.c.locLink||p.c.end)?`<button class="btn btn-outline btn-sm" onclick="meuDiaIrAte(${p.id})">🧭 Ir até lá</button>`:''}
    </div>
  </div>`;
}

function renderMeuDia(){
  const el = document.getElementById('meudia-lista');
  if(!el) return;
  const hoje = today();
  const dt = document.getElementById('meudia-data');
  if(dt) dt.textContent = fmtDate(hoje);

  // seletor de rota (mantém a escolha mesmo se a rota foi excluída)
  const selEl = document.getElementById('meudia-rota');
  if(selEl){
    if(meuDiaRota && meuDiaRota!=='none' && !getRota(meuDiaRota)) meuDiaRota = '';
    selEl.innerHTML = '<option value="">Todas as rotas</option>'
      + state.rotas.map(r=>`<option value="${r.id}">${escapeHtml(r.nome)}</option>`).join('')
      + '<option value="none">Sem rota</option>';
    selEl.value = meuDiaRota;
  }

  meuDiaPartidaBox();
  const todas = meuDiaParadasFiltradas();

  // v5.47: follow-ups do CRM (próximas ações, atividades vencidas, negócios sem próxima ação)
  const crm = (typeof crmMeuDiaHtml==='function') ? crmMeuDiaHtml() : {qtd:0, html:''};

  const totEntregas = todas.reduce((s,p)=>s+p.entregas.length,0);
  const totCobrar = round2(todas.reduce((s,p)=>s+p.vencido,0));
  const resumo = `<div style="font-size:13px;margin-bottom:12px"><strong>${todas.length}</strong> parada(s) · <strong>${totEntregas}</strong> entrega(s) · a cobrar <strong style="color:var(--red)">${fmt(totCobrar)}</strong></div>`;

  if(todas.length===0){
    el.innerHTML = crm.html + (crm.qtd
      ? `<p style="color:var(--muted);margin-top:14px;font-size:13px">Sem entregas pendentes nem fiado vencido${meuDiaRota?' nesta rota':''}.</p>`
      : `<div style="text-align:center;padding:60px 20px"><h3 style="color:var(--green)">Nada para hoje${meuDiaRota?' nesta rota':''}</h3>
      <p style="color:var(--muted);margin-top:8px">Sem entregas pendentes (últimos ${MEUDIA_DIAS_ENTREGA} dias), fiado vencido nem follow-ups do CRM.</p></div>`);
    if(typeof lucide!=='undefined') lucide.createIcons();
    return;
  }

  // v5.51: rota otimizada = lista única na ordem calculada, sem-localização por último
  if(meuDiaOtim){
    const porId=new Map(todas.map(p=>[p.id,p]));
    const ord=meuDiaOtim.ids.map(id=>porId.get(id)).filter(Boolean);
    const sem=todas.filter(p=>!ord.includes(p));
    const nTrechos=Math.ceil(ord.length/meuDiaTamTrecho(meuDiaOtim.volta));
    const btnsMapa=Array.from({length:nTrechos},(_,k)=>`<button class="btn btn-primary btn-sm" onclick="meuDiaAbrirTrecho(${k})">🗺️ Abrir no Maps${nTrechos>1?' · trecho '+(k+1)+'/'+nTrechos:''}</button>`).join(' ');
    const painel=`<div style="background:var(--card);border:1px solid var(--gold);border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:13px"><strong>🧭 Rota otimizada</strong> · ${ord.length} parada(s) · ~${meuDiaOtim.km.toFixed(1)} km em linha reta${meuDiaOtim.volta?' (com volta ao início)':''}${meuDiaOtim.pos?'':' · <span style="color:var(--muted)">partindo da 1ª parada (sem GPS)</span>'}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${btnsMapa}<button class="btn btn-outline btn-sm" onclick="meuDiaLimparOtim()">Voltar à ordem normal</button></div>
    </div>`;
    el.innerHTML = crm.html + resumo + painel
      + ord.map((p,i)=>meuDiaParadaHtml(p,i+1)).join('')
      + (sem.length?`<h3 style="margin:14px 0 8px;font-size:14px">Sem localização <span style="color:var(--muted);font-weight:500">(${sem.length})</span></h3>`+sem.map((p,i)=>meuDiaParadaHtml(p,ord.length+i+1)).join(''):'');
    if(typeof lucide!=='undefined') lucide.createIcons();
    return;
  }

  // agrupa por rota, na ordem em que as rotas foram cadastradas; "Sem rota" por último
  const grupos = state.rotas.map(r=>({nome:r.nome, itens:todas.filter(p=>String(p.rotaId||'')===String(r.id))}));
  grupos.push({nome:'Sem rota', itens:todas.filter(p=>!p.rotaId || !getRota(p.rotaId))});
  const vistos = new Set();
  const html = grupos.filter(g=>g.itens.length).map(g=>{
    const itens = meuDiaOrdenar(g.itens.filter(p=>!vistos.has(p.id)));
    itens.forEach(p=>vistos.add(p.id));
    if(!itens.length) return '';
    return `<h3 style="margin:14px 0 8px;font-size:14px"><i data-lucide="map-pin" class="ic ic-sm"></i> ${escapeHtml(g.nome)} <span style="color:var(--muted);font-weight:500">(${itens.length})</span></h3>`
      + itens.map((p,i)=>meuDiaParadaHtml(p,i+1)).join('');
  }).join('');
  el.innerHTML = crm.html + resumo + html;
  if(typeof lucide!=='undefined') lucide.createIcons();
}
