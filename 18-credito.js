// ============ CRÉDITO DO FIADO: NÍVEIS, LIMITE, PARCELAS E TRAVAS (v5.54) ============
// Regras do PDF "GestãoPRO — Regras de Crédito, Score e VIP". O fiado só sai quando as TRÊS valem juntas:
//  1) nada vencido — a trava começa no dia seguinte ao vencimento, sem tolerância;
//  2) no máximo 1 parcela em aberto ANTES da nova venda (vale também para VIP: o motor não olha o segmento);
//  3) saldo devedor + compra nova ≤ limite do cliente (limite do nível, ou o personalizado, que o substitui).
// Parcelas: compra até R$ 50 = parcela única; acima disso, parcelas de R$ 50 de 30 em 30 dias (o resto vai na última).
// Estourou o limite: o cliente paga a diferença (saldo + compra − limite). Aqui isso vira a "entrada" da venda e,
// como todo pagamento deste app, abate a dívida mais antiga (FIFO — ver getUnidadesFiadoFlat em 00-core.js).
//
// Dados:  state.credito            config (ativo, limites por nível, valor/prazo da parcela, datas da revisão de 60 dias)
//         cliente.nivelCredito     0–3 (ausente = 0, só à vista)
//         cliente.limiteCredito    R$ personalizado (ausente/null = usa o limite do nível)
//         venda.creditoExcecao     {data, motivos[]} quando o dono registrou "mesmo assim" (ficha de papel que já aconteceu)
// Atraso e "em aberto" vêm do mesmo FIFO que Contas a Receber usa, então a conta sempre bate com o resto do app.

const CREDITO_PADRAO={ativo:true,limites:[0,80,130,200],parcelaValor:50,parcelaDias:30,revisarDias:60,vigenteDesde:null,revisadoEm:null};
let _creditoLiberarProxima=false; // o botão "Registrar mesmo assim" liga isto e chama salvarVenda() de novo
let _creditoUltima=null;          // última avaliação mostrada no aviso de bloqueio

function creditoCfg(){
  const c=Object.assign({},CREDITO_PADRAO,state&&state.credito||{});
  const l=Array.isArray(c.limites)?c.limites.map(Number):[];
  c.limites=[0,1,2,3].map(i=>(l[i]>=0)?l[i]:CREDITO_PADRAO.limites[i]);
  c.limites[0]=0; // Nível 0 é sempre "só à vista"
  if(!(Number(c.parcelaValor)>0)) c.parcelaValor=CREDITO_PADRAO.parcelaValor;
  if(!(parseInt(c.parcelaDias)>0)) c.parcelaDias=CREDITO_PADRAO.parcelaDias;
  if(!(parseInt(c.revisarDias)>0)) c.revisarDias=CREDITO_PADRAO.revisarDias;
  return c;
}

// Soma dias a uma data 'AAAA-MM-DD' sem passar por fuso/horário de verão.
function creditoAddDias(data,dias){
  const [y,m,d]=String(data).split('-').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d+dias));
  return dt.getUTCFullYear()+'-'+String(dt.getUTCMonth()+1).padStart(2,'0')+'-'+String(dt.getUTCDate()).padStart(2,'0');
}

function creditoNivel(c){ const n=parseInt(c&&c.nivelCredito); return (n>=0&&n<=3)?n:0; }
function creditoLimiteCliente(c,cfg){
  cfg=cfg||creditoCfg();
  const nivel=creditoNivel(c);
  const tem=c&&c.limiteCredito!=null&&c.limiteCredito!=='';
  const p=tem?Number(c.limiteCredito):NaN;
  if(p>=0) return {limite:round2(p),origem:'personalizado',nivel};
  return {limite:cfg.limites[nivel],origem:'nivel',nivel};
}

// Cronograma de uma compra: parcelas de `parcelaValor`, a última leva o resto. Vencimento da 1ª = `primeiroVenc`
// (se informado) ou data da venda + prazo; as seguintes de prazo em prazo. Trabalha em centavos.
function creditoParcelas(valor,dataVenda,primeiroVenc,cfg){
  cfg=cfg||creditoCfg();
  const cents=Math.round((Number(valor)||0)*100), passo=Math.round(cfg.parcelaValor*100);
  if(cents<=0||passo<=0) return [];
  const primeiro=primeiroVenc||creditoAddDias(dataVenda||today(),cfg.parcelaDias);
  const out=[]; let resto=cents, i=0;
  while(resto>0){
    const v=Math.min(passo,resto);
    out.push({vencimento:creditoAddDias(primeiro,cfg.parcelaDias*i),valor:v/100});
    resto-=v; i++;
  }
  return out;
}

// Situação do cliente HOJE: parcelas em aberto (inclui parcial), vencidas (venceu antes de hoje) e saldo.
function creditoSituacao(clienteId,hoje){
  hoje=hoje||today();
  const abertas=getUnidadesFiadoFlat().filter(u=>u.clienteId==clienteId&&u.status!=='pago');
  const atrasadas=abertas.filter(u=>u.vencimento&&u.vencimento<hoje).sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
  return {abertas:abertas.length,atrasadas:atrasadas.length,maisAntigaVenc:atrasadas[0]?atrasadas[0].vencimento:null,saldo:getSaldoCliente(clienteId)};
}

// Avalia uma compra fiado de `compra` reais. `entrada` = dinheiro recebido junto (abate o saldo antes de a dívida nova entrar).
// As travas 1 e 2 olham o cliente ANTES da venda — a entrada só resolve a 3 (limite).
function creditoAvaliar(clienteId,compra,opts){
  opts=opts||{};
  const cfg=creditoCfg(), c=getCliente(clienteId), hoje=opts.hoje||today();
  const lim=creditoLimiteCliente(c,cfg), sit=creditoSituacao(clienteId,hoje);
  compra=round2(compra); const entrada=round2(opts.entrada||0);
  const saldoDepois=round2(sit.saldo+compra-entrada);
  const entradaMin=Math.max(0,round2(sit.saldo+compra-lim.limite));
  const c1=sit.atrasadas===0, c2=sit.abertas<=1, c3=saldoDepois<=lim.limite+0.009;
  const pl=(n,s,p)=>n===1?s:p;
  const nivelTxt=lim.origem==='personalizado'?'limite personalizado':'Nível '+lim.nivel;
  const linhas=[
    {ok:c1,txt:c1?'Nada vencido':`${sit.atrasadas} ${pl(sit.atrasadas,'parcela vencida','parcelas vencidas')} (a mais antiga venceu em ${fmtDate(sit.maisAntigaVenc)})`},
    {ok:c2,txt:`${sit.abertas} ${pl(sit.abertas,'parcela em aberto','parcelas em aberto')} (máximo 1 antes de uma nova venda)`},
    {ok:c3,txt:(!c3&&lim.limite<=0&&lim.origem==='nivel')
      ? 'Nível 0: só à vista, sem fiado'
      : `Saldo ${fmt(sit.saldo)} + compra ${fmt(compra)}${entrada>0.009?' − entrada '+fmt(entrada):''} = ${fmt(saldoDepois)} · limite ${fmt(lim.limite)} (${nivelTxt})${c3?'':' → passa '+fmt(saldoDepois-lim.limite)}`}
  ];
  return {
    ok:c1&&c2&&c3, clienteId, lim, sit, compra, entrada, saldoDepois, entradaMin, linhas,
    c1,c2,c3,
    falhas:linhas.filter(l=>!l.ok).map(l=>l.txt),
    // pagar a diferença na própria venda só destrava se for a ÚNICA trava e a diferença couber na compra
    entradaResolve:c1&&c2&&!c3&&lim.limite>0&&entradaMin<=compra+0.009
  };
}

// Já era venda fiado do mesmo cliente? Editar uma venda assim não é "venda nova": o saldo já a contém.
function creditoVendaJaFiado(prev,clienteId){
  return !!(prev&&prev.tipo!=='orcamento'&&prev.clienteId==clienteId&&(prev.forma==='fiado'||(prev.pagamentos||[]).some(p=>p.forma==='fiado')));
}

// Chamado por salvarVenda(). Devolve {pode:true[,excecao]} ou {pode:false} (e abre o aviso).
function creditoConferirVenda(ctx){
  const cfg=creditoCfg();
  if(!cfg.ativo||!(ctx.compra>0.009)) return {pode:true};
  const av=creditoAvaliar(ctx.clienteId,ctx.compra,{entrada:ctx.entrada});
  if(av.ok) return {pode:true};
  if(ctx.liberado) return {pode:true,excecao:{data:today(),motivos:av.falhas.slice()}};
  creditoAbrirBloqueio(av,ctx);
  return {pode:false};
}
function creditoRegistrarInicio(){ // o prazo de revisão (60 dias) conta a partir da 1ª venda sob as regras
  const cfg=creditoCfg();
  if(!cfg.ativo||cfg.vigenteDesde) return;
  state.credito=Object.assign({},cfg,{vigenteDesde:today()});
}

// ───────── Aviso "Fiado não liberado" ─────────
function creditoLinhasHtml(linhas){
  return linhas.map(l=>`<div style="display:flex;gap:8px;align-items:flex-start;padding:4px 0;font-size:13px"><span style="font-weight:800;color:var(--${l.ok?'green':'red'})">${l.ok?'✓':'✕'}</span><span style="${l.ok?'color:var(--muted)':'font-weight:600'}">${escapeHtml(l.txt)}</span></div>`).join('');
}
function creditoAbrirBloqueio(av,ctx){
  _creditoUltima=av;
  const podeEntrada=!!(ctx&&ctx.podeEntrada&&av.entradaResolve);
  let dica='';
  if(!av.c1||!av.c2) dica='Receba o pagamento em Contas a Receber e refaça a venda — a entrada junto da venda não destrava vencido nem excesso de parcelas.';
  else if(podeEntrada) dica=`O cliente paga a diferença de ${fmt(av.entradaMin)}; o valor abate a dívida mais antiga e a venda sai dentro do limite.`;
  else if(av.lim.limite>0&&av.entradaMin>av.compra+0.009) dica=`O saldo sozinho já passa do limite. Receba ao menos ${fmt(av.entradaMin-av.compra)} em Contas a Receber antes de vender no fiado.`;
  else dica='Venda à vista (dinheiro, Pix ou cartão) ou ajuste o nível/limite do cliente na ficha dele.';
  document.getElementById('credito-bloqueio-corpo').innerHTML=
    `<div style="font-size:13px;margin-bottom:8px"><strong>${escapeHtml(getCliente(av.clienteId).nome)}</strong> · compra de ${fmt(av.compra)} no fiado</div>`+
    creditoLinhasHtml(av.linhas)+
    `<div style="margin-top:10px;padding:10px 12px;background:var(--card-2);border-radius:8px;font-size:12px;color:var(--muted)">${escapeHtml(dica)}</div>`;
  const b=document.getElementById('credito-btn-entrada');
  if(b){ b.style.display=podeEntrada?'':'none'; b.textContent=`Cobrar entrada de ${fmt(av.entradaMin)}`; }
  document.getElementById('modal-credito-bloqueio').classList.add('open');
}
function creditoUsarEntrada(){
  const av=_creditoUltima; if(!av) return;
  document.getElementById('venda-entrada-valor').value=av.entradaMin.toFixed(2);
  atualizarInfoEntrada();
  closeModal('modal-credito-bloqueio');
  showToast(`Entrada de ${fmt(av.entradaMin)} preenchida. Confira e confirme a venda.`,'green');
}
function creditoRegistrarMesmoAssim(){
  closeModal('modal-credito-bloqueio');
  _creditoLiberarProxima=true;
  salvarVenda();
  _creditoLiberarProxima=false;
}

// ───────── Painel dentro da venda ─────────
function atualizarPainelCredito(){
  const el=document.getElementById('venda-credito-info'); if(!el) return;
  const cfg=creditoCfg();
  const cid=parseInt(document.getElementById('venda-cliente').value)||null;
  const forma=document.getElementById('venda-forma').value;
  const misto=document.getElementById('venda-pag-misto-check').checked;
  const orc=document.getElementById('venda-tipo')?.value==='orcamento';
  const eid=document.getElementById('venda-edit-id').value;
  const prev=eid?state.vendas.find(v=>v.id==eid):null;
  if(!cfg.ativo||orc||!cid||forma!=='fiado'||misto||creditoVendaJaFiado(prev,cid)){el.style.display='none';return;}
  const total=calcTotalVendaGeralSemRecursao();
  const entrada=parseFloat(document.getElementById('venda-entrada-valor').value)||0;
  const av=creditoAvaliar(cid,total,{entrada});
  const lim=av.lim;
  const cab=lim.origem==='personalizado'?`Limite personalizado ${fmt(lim.limite)}`:`Nível ${lim.nivel} · ${lim.limite>0?'limite '+fmt(lim.limite):'só à vista'}`;
  let extra='';
  if(!av.c3&&av.entradaResolve) extra+=`<div style="margin-top:6px;font-size:12px;color:var(--muted)">Com entrada de ${fmt(av.entradaMin)} a venda fica dentro do limite.</div>`;
  const parcelarManual=document.getElementById('venda-parcelar-check').checked;
  if(total>0.009&&!parcelarManual){
    const dataVenda=document.getElementById('venda-data').value||today();
    const venc=document.getElementById('venda-vencimento').value||null;
    const ps=creditoParcelas(total,dataVenda,venc,cfg);
    extra+=`<div style="margin-top:6px;font-size:12px;color:var(--muted)"><strong>Parcelas previstas:</strong> ${ps.map((p,i)=>`${i+1}/${ps.length} ${fmt(p.valor)} em ${fmtDate(p.vencimento)}`).join(' · ')}${venc?'':' <span style="opacity:.8">(vencimento em branco = venda + '+cfg.parcelaDias+' dias)</span>'}</div>`;
  }
  const rev=creditoRevisaoPendente(cfg);
  if(rev) extra+=`<div style="margin-top:6px;font-size:11px;color:var(--gold-2)">Os limites estão há ${rev.dias} dias sem revisão — veja “Regras de crédito” no menu.</div>`;
  el.style.display='block';
  el.style.cssText='display:block;margin-bottom:12px;padding:10px 12px;border-radius:10px;border:1px solid var(--'+(av.ok?'green':'red')+');background:var(--card-2)';
  el.innerHTML=`<div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:4px">Crédito · ${escapeHtml(cab)}</div>${creditoLinhasHtml(av.linhas)}${extra}`;
}

// ───────── Ficha do cliente ─────────
function creditoPopularNiveis(){
  const sel=document.getElementById('cliente-nivel'); if(!sel) return;
  const cfg=creditoCfg();
  const atual=sel.value||'0';
  sel.innerHTML=[0,1,2,3].map(n=>`<option value="${n}">Nível ${n} — ${cfg.limites[n]>0?'até '+fmt(cfg.limites[n]):'só à vista'}</option>`).join('');
  sel.value=atual;
}
function creditoFormCliente(c){ // c = cliente (editar) ou null (novo)
  const sel=document.getElementById('cliente-nivel'), inp=document.getElementById('cliente-limite');
  if(!sel||!inp) return;
  sel.value='0'; creditoPopularNiveis();
  sel.value=String(c?creditoNivel(c):0);
  inp.value=(c&&c.limiteCredito!=null&&c.limiteCredito!=='')?c.limiteCredito:'';
}
// null = campos não existem (não mexe no cliente); {erro} = valor inválido; senão {nivel,limite}
function creditoLerFormCliente(){
  const sel=document.getElementById('cliente-nivel'), inp=document.getElementById('cliente-limite');
  if(!sel||!inp) return null;
  const nivel=parseInt(sel.value)||0;
  const txt=String(inp.value||'').trim().replace(',','.');
  if(txt==='') return {nivel,limite:null};
  const lim=parseFloat(txt);
  if(!(lim>=0)) return {erro:'Limite personalizado inválido'};
  return {nivel,limite:round2(lim)};
}
function creditoBadgeCliente(c){
  const cfg=creditoCfg(); if(!cfg.ativo||!c) return '';
  const l=creditoLimiteCliente(c,cfg);
  const txt=l.origem==='personalizado'?'Limite '+fmt(l.limite):(l.limite>0?`Nível ${l.nivel} · ${fmt(l.limite)}`:'Só à vista');
  return `<span class="badge ${l.limite>0?'badge-blue':'badge-gray'}" title="Limite de fiado">${escapeHtml(txt)}</span>`;
}

// ───────── Configuração (menu → Regras de crédito) ─────────
function creditoRevisaoPendente(cfg){
  cfg=cfg||creditoCfg();
  const base=cfg.revisadoEm||cfg.vigenteDesde; if(!base) return null;
  const dias=diasEntre(base,today());
  return dias>=cfg.revisarDias?{dias,base}:null;
}
function creditoTextoRevisao(cfg){
  if(!cfg.vigenteDesde&&!cfg.revisadoEm) return 'A contagem de 60 dias para revisar os limites começa na primeira venda feita com as regras ativas.';
  const base=cfg.revisadoEm||cfg.vigenteDesde;
  const limite=creditoAddDias(base,cfg.revisarDias), dias=diasEntre(base,today());
  const rotulo=cfg.revisadoEm?'Última revisão':'Regras em vigor desde';
  if(dias>=cfg.revisarDias) return `⚠️ ${rotulo} ${fmtDate(base)} — já passaram ${dias} dias. Hora de revisar os limites com base nas vendas novas.`;
  return `${rotulo} ${fmtDate(base)}. Revisar os limites a partir de ${fmtDate(limite)} (faltam ${cfg.revisarDias-dias} dias).`;
}
function abrirConfigCredito(){
  const c=creditoCfg();
  document.getElementById('cred-ativo').checked=!!c.ativo;
  document.getElementById('cred-l1').value=c.limites[1];
  document.getElementById('cred-l2').value=c.limites[2];
  document.getElementById('cred-l3').value=c.limites[3];
  document.getElementById('cred-parc-valor').value=c.parcelaValor;
  document.getElementById('cred-parc-dias').value=c.parcelaDias;
  creditoAtualizarRevisaoUI();
  document.getElementById('modal-config-credito').classList.add('open');
}
function creditoAtualizarRevisaoUI(){
  const c=creditoCfg();
  const info=document.getElementById('cred-revisao-info'); if(info) info.textContent=creditoTextoRevisao(c);
  const b=document.getElementById('cred-btn-revisado'); if(b) b.style.display=(c.vigenteDesde||c.revisadoEm)?'':'none';
}
function salvarConfigCredito(){
  const l1=parseFloat(document.getElementById('cred-l1').value);
  const l2=parseFloat(document.getElementById('cred-l2').value);
  const l3=parseFloat(document.getElementById('cred-l3').value);
  const parcelaValor=parseFloat(document.getElementById('cred-parc-valor').value);
  const parcelaDias=parseInt(document.getElementById('cred-parc-dias').value);
  if(!(l1>=0&&l2>=0&&l3>=0)){showToast('Os limites precisam ser valores de 0 para cima','red');return;}
  if(!(l1<=l2&&l2<=l3)){showToast('Os níveis devem ser crescentes (Nível 1 ≤ Nível 2 ≤ Nível 3)','red');return;}
  if(!(parcelaValor>0)){showToast('Informe o valor de cada parcela','red');return;}
  if(!(parcelaDias>=1)){showToast('O prazo entre parcelas deve ser de 1 dia ou mais','red');return;}
  state.credito=Object.assign({},creditoCfg(),{ativo:document.getElementById('cred-ativo').checked,limites:[0,round2(l1),round2(l2),round2(l3)],parcelaValor:round2(parcelaValor),parcelaDias});
  marcarAlterado();
  closeModal('modal-config-credito');showToast('Regras de crédito salvas','green');
  const pg=document.querySelector('.page.active');
  if(pg) render(pg.id.replace('page-',''));
}
function creditoMarcarRevisado(){
  state.credito=Object.assign({},creditoCfg(),{revisadoEm:today()});
  marcarAlterado();creditoAtualizarRevisaoUI();
  showToast('Revisão registrada — próxima em 60 dias','green');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR DE SCORE DO CLIENTE (0 a 100) — v5.59.0
// Regras do desenho:
// 1) Pontualidade (40 pts)
//    - Analisa se há parcelas/fiado vencidos em atraso hoje e histórico.
//    - Parcela vencida em aberto hoje: 0 pts. Sem atraso: 40 pts.
// 2) Saldo vs. Limite (25 pts)
//    - Comprometimento = saldo / limite.
//    - Comprometimento <= 30%: 25 pts. <= 60%: 20 pts. <= 85%: 15 pts. <= 100%: 10 pts. Estourado: 0 pts.
//    - Cliente SEM LIMITE definido: Nota neutra de 15 pts.
// 3) Frequência (20 pts)
//    - Compras nos últimos 60 dias e compras totais.
//    - >= 4 compras em 60d ou >= 8 no histórico: 20 pts. 3 compras: 16 pts. 2 compras: 12 pts. 1 compra: 8 pts.
// 4) Recência (15 pts)
//    - Dias desde a última compra: <= 15d: 15 pts; 16-30d: 11 pts; 31-60d: 7 pts; 61-90d: 4 pts; >90d: 1 pt.
//
// Regras especiais:
// - "Novo" (tag cinza): menos de 3 compras no total.
// - "Só à vista" (Nível 0 / sem fiado): os 65 pts de pontualidade + saldo/limite
//   são redistribuídos para frequência (57 pts) e recência (43 pts), totalizando 100 pts.
//
// Faixas de cores:
// - Verde: 70 a 100
// - Amarelo: 40 a 69
// - Vermelho: abaixo de 40
// ═══════════════════════════════════════════════════════════════════════════════

function calcularScoreCliente(c, vendasCliente, saldo, limiteCredito, parcelasEmAberto){
  if(!c) return { score: 0, ehNovo: true, cor: 'gray', classe: 'novo', rotulo: 'Novo', detalhes: {} };
  const compras = Array.isArray(vendasCliente) ? vendasCliente : (state.vendas || []).filter(v => v.clienteId === c.id);
  const totalCompras = compras.length;
  const ehNovo = totalCompras < 3;
  const nivel = creditoNivel(c);
  const saldoAtual = typeof saldo === 'number' ? saldo : getSaldoCliente(c.id);
  
  // Identifica se é "Só à vista": nível 0 de crédito E nunca teve fiado em aberto ou compras a prazo
  const nuncaUsouFiado = !compras.some(v => v.forma === 'fiado' || v.status === 'em-aberto');
  const ehSoAVista = (nivel === 0 || nuncaUsouFiado) && saldoAtual === 0;

  // 1. Recência (dias desde a última compra)
  let diasUltima = 999;
  if(compras.length > 0){
    const ord = [...compras].filter(v => v.data).sort((a,b) => b.data.localeCompare(a.data));
    if(ord[0]){
      const [y,m,d] = ord[0].data.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m-1, d));
      const hoje = new Date();
      diasUltima = Math.max(0, Math.floor((hoje.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }
  let notaRec = 1;
  if(diasUltima <= 15) notaRec = 15;
  else if(diasUltima <= 30) notaRec = 11;
  else if(diasUltima <= 60) notaRec = 7;
  else if(diasUltima <= 90) notaRec = 4;
  else notaRec = 1;

  // 2. Frequência (compras nos últimos 60 dias)
  const agora = Date.now();
  const compras60d = compras.filter(v => {
    if(!v.data) return false;
    const [y,m,d] = v.data.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m-1, d)).getTime();
    return (agora - dt) <= (60 * 24 * 60 * 60 * 1000);
  }).length;

  let notaFreq = 4;
  if(compras60d >= 4 || totalCompras >= 8) notaFreq = 20;
  else if(compras60d === 3) notaFreq = 16;
  else if(compras60d === 2) notaFreq = 12;
  else if(compras60d === 1) notaFreq = 8;
  else if(totalCompras >= 1) notaFreq = 4;
  else notaFreq = 0;

  let scoreFinal = 0;
  let detalhes = {};

  if(ehSoAVista){
    // 65 pontos de pontualidade + saldo vão proporcionalmente para frequência e recência
    const freqAVista = Math.round((notaFreq / 20) * 57);
    const recAVista = Math.round((notaRec / 15) * 43);
    scoreFinal = freqAVista + recAVista;
    detalhes = { tipo: 'avista', freq: freqAVista, rec: recAVista, pont: 0, saldoLim: 0, diasUltima, compras60d };
  } else {
    // Pontualidade (40 pts)
    let notaPont = 40;
    // Checa parcelas vencidas em atraso hoje
    const infoAtraso = typeof creditoParcelasCliente === 'function' ? creditoParcelasCliente(c.id) : null;
    const temAtrasoHoje = infoAtraso ? infoAtraso.temAtraso : (saldoAtual > 0 && diasUltima > 30);
    if(temAtrasoHoje){
      notaPont = 0;
    } else {
      notaPont = 40;
    }

    // Saldo vs. Limite (25 pts)
    let notaSaldoLim = 15; // Nota neutra se não tiver limite configurado
    const limObj = typeof creditoLimiteCliente === 'function' ? creditoLimiteCliente(c) : null;
    const lim = limObj ? limObj.limite : (limiteCredito || 0);

    if(lim > 0){
      const comp = saldoAtual / lim;
      if(comp <= 0.3) notaSaldoLim = 25;
      else if(comp <= 0.6) notaSaldoLim = 20;
      else if(comp <= 0.85) notaSaldoLim = 15;
      else if(comp <= 1.0) notaSaldoLim = 10;
      else notaSaldoLim = 0;
    }
    scoreFinal = notaPont + notaSaldoLim + notaFreq + notaRec;
    detalhes = { tipo: 'credito', pont: notaPont, saldoLim: notaSaldoLim, freq: notaFreq, rec: notaRec, diasUltima, compras60d, limite: lim, saldo: saldoAtual };
  }

  scoreFinal = Math.max(0, Math.min(100, Math.round(scoreFinal)));

  let cor = 'green', classe = 'verde', rotulo = 'Excelente';
  if(scoreFinal < 40){ cor = 'red'; classe = 'vermelho'; rotulo = 'Risco'; }
  else if(scoreFinal < 70){ cor = 'yellow'; classe = 'amarelo'; rotulo = 'Atenção'; }

  return {
    score: scoreFinal,
    ehNovo,
    cor,
    classe,
    rotulo: ehNovo ? 'Novo' : rotulo,
    detalhes
  };
}

function creditoScoreBadgeHtml(scoreObj){
  if(!scoreObj) return '';
  if(scoreObj.ehNovo){
    return `<span class="badge-score badge-score-novo" title="Cliente novo: menos de 3 compras registradas"><span class="score-num">${scoreObj.score}</span> <span class="score-tag">Novo</span></span>`;
  }
  return `<span class="badge-score badge-score-${scoreObj.classe}" title="Score ${scoreObj.score}/100 · ${scoreObj.rotulo}"><span class="score-num">${scoreObj.score}</span> <span class="score-tag">${scoreObj.rotulo}</span></span>`;
}
