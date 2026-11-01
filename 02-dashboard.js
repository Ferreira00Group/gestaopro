// ============ DASHBOARD ============
function renderTrend(elId,atual,anterior,legenda){
  const el=document.getElementById(elId);
  if(!el)return;
  if(!anterior||anterior===0){el.innerHTML='';return;}
  const diff=((atual-anterior)/anterior)*100;
  const arrow=diff>0.5?'▲':diff<-0.5?'▼':'▬';
  const cls=diff>0.5?'up':diff<-0.5?'down':'flat';
  el.innerHTML=`<span class="trend ${cls}">${arrow} ${Math.abs(diff).toFixed(0)}%</span> ${legenda||''}`;
}

// ───────── v5.50.0: nova tela inicial ─────────
function dashSet(id,txt){const el=document.getElementById(id);if(el)el.textContent=txt;}
function dashNorm(s){return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
// Combustível: categoria com "gasolina", "combustível", diesel, etanol ou álcool
function dashEhCombustivel(f){return /gasolina|combustiv|diesel|etanol|alcool/.test(dashNorm(f.categoria));}
// Insumos/matéria-prima: saída gerada por compra ou por pagamento a fornecedor
function dashEhInsumo(f){return !!(f.compraId||f.pagamentoFornecedorId);}
function dashSoma(arr,fn){return arr.reduce((s,x)=>s+(fn?fn(x):x.valor||0),0);}
function dashPct(n){return String(Number(n.toFixed(1))).replace('.',',')+'%';}
function dashMoedaSinal(v){return (v<0?'-':'')+fmt(Math.abs(v));}

// Menu do botão "Nova venda"
function abrirMenuNovaVenda(){
  document.getElementById('qa-sheet-backdrop').classList.add('open');
  document.getElementById('qa-sheet').classList.add('open');
}
function fecharMenuNovaVenda(){
  document.getElementById('qa-sheet-backdrop').classList.remove('open');
  document.getElementById('qa-sheet').classList.remove('open');
}
// Venda rápida = orçamento (depois completo e converto em venda)
function novaVendaRapida(){
  fecharMenuNovaVenda();
  setTimeout(function(){goto('vendas');setTimeout(function(){abrirNovaVenda();setVendaTipo('orcamento');},80);},120);
}
function novaVendaCompleta(){
  fecharMenuNovaVenda();
  setTimeout(function(){goto('vendas');setTimeout(function(){abrirNovaVenda();},80);},120);
}
// Novo gasto = lançamento de saída (com categoria; use "Gasolina" para o número do card)
function abrirNovoGasto(){
  openModal('modal-lancamento');
  document.getElementById('lanc-tipo').value='saida';
  toggleCategoriaLanc();
}

function renderDashboard(){
  const hoje=today();
  const mesAtual=hoje.slice(0,7);
  const el=document.getElementById('dash-date');
  if(el) el.textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  // ── Parte 1: cards grandes ──
  const devedores=state.clientes.map(c=>({...c,saldo:getSaldoCliente(c.id)})).filter(c=>c.saldo>0).sort((a,b)=>b.saldo-a.saldo);
  dashSet('dash-total-fiado',fmt(dashSoma(devedores,c=>c.saldo)));
  dashSet('dash-fiado-count',devedores.length+' cliente'+(devedores.length!==1?'s':'')+' devendo');
  // Caixa atual = entradas − saídas (compra a prazo só baixa o caixa quando o pagamento ao fornecedor é registrado)
  const caixaAtual=state.financeiro.reduce((s,f)=>s+(f.tipo==='entrada'?f.valor:-f.valor),0);
  dashSet('dash-caixa-atual',dashMoedaSinal(caixaAtual));
  dashSet('dash-caixa-sub',caixaAtual>=0?'dinheiro disponível':'caixa negativo');
  // Vendas do mês (sem orçamentos) e gastos do mês (saídas do Financeiro)
  const vendasMes=state.vendas.filter(v=>v.tipo!=='orcamento'&&v.data&&v.data.startsWith(mesAtual));
  const totalVendasMes=dashSoma(vendasMes,v=>v.total);
  const saidasMes=state.financeiro.filter(f=>f.tipo==='saida'&&!f.retirada&&f.data&&f.data.startsWith(mesAtual));
  const gastosMes=dashSoma(saidasMes);
  dashSet('dash-gastos-mes',fmt(gastosMes));
  dashSet('dash-gastos-mes-insumos',fmt(dashSoma(saidasMes.filter(dashEhInsumo))));
  // Lucro = vendas do mês − gastos do mês; % = margem real (lucro ÷ vendas)
  const lucro=totalVendasMes-gastosMes;
  const margem=totalVendasMes>0?(lucro/totalVendasMes)*100:0;
  const elLucro=document.getElementById('dash-lucro');
  if(elLucro){elLucro.textContent=dashMoedaSinal(lucro);elLucro.style.color=lucro<0?'var(--red)':'';}
  dashSet('dash-lucro-pct',dashPct(margem));

  // ── Acesso rápido: contador de clientes (só o número, 999+) ──
  const nCli=state.clientes.filter(estaAtivo).length;
  dashSet('qa-clientes-count',nCli>999?'999+':String(nCli));

  // ── Parte 2: alertas (sem mudança de layout) ──
  const alertas=getAlertasEstoque();
  dashSet('dash-estoque-baixo',alertas.total);
  const orcPend=state.vendas.filter(v=>v.tipo==='orcamento');
  dashSet('dash-orc-pendentes',orcPend.length);
  dashSet('dash-orc-sub',orcPend.filter(o=>o.statusOrc==='rascunho').length+' rascunho · '+orcPend.filter(o=>o.statusOrc==='aprovado').length+' aprovado');
  renderAlertasBanner();
  // Contas vencidas e vencem hoje (por parcela)
  const flatFiado=getUnidadesFiadoFlat();
  const pendentesFiado=flatFiado.filter(u=>u.status!=='pago'&&u.vencimento);
  const vencidas=pendentesFiado.filter(u=>u.vencimento<hoje);
  const vencemHojeArr=pendentesFiado.filter(u=>u.vencimento===hoje);
  dashSet('dash-contas-vencidas',vencidas.length);
  dashSet('dash-contas-vencidas-sub',vencidas.length===1?'1 parcela atrasada':vencidas.length+' parcelas atrasadas');
  dashSet('dash-vencem-hoje',vencemHojeArr.length);
  dashSet('dash-vencem-hoje-sub',vencemHojeArr.length===1?'1 cobrança':vencemHojeArr.length+' cobranças');

  // ── Parte 3: desempenho do dia ──
  const vendasHoje=state.vendas.filter(v=>v.tipo!=='orcamento'&&v.data===hoje);
  dashSet('dash-vendas-hoje',fmt(dashSoma(vendasHoje,v=>v.total)));
  dashSet('dash-vendas-hoje-count',vendasHoje.length+' venda'+(vendasHoje.length!==1?'s':''));
  // Recebido hoje = vendas à vista (vendaId) + pagamentos recebidos (pagamentoId); pequeno = só à vista
  const entradasHoje=state.financeiro.filter(f=>f.tipo==='entrada'&&f.data===hoje&&(f.vendaId||f.pagamentoId));
  dashSet('dash-recebido',fmt(dashSoma(entradasHoje)));
  dashSet('dash-recebido-avista',fmt(dashSoma(entradasHoje.filter(f=>f.vendaId))));
  // Gastos do dia = saídas de hoje; pequeno = só combustível
  const saidasHoje=state.financeiro.filter(f=>f.tipo==='saida'&&!f.retirada&&f.data===hoje);
  dashSet('dash-gastos-dia',fmt(dashSoma(saidasHoje)));
  dashSet('dash-gastos-dia-comb',fmt(dashSoma(saidasHoje.filter(dashEhCombustivel))));

  // ── Meta do mês ──
  renderMetaVendas(totalVendasMes);

  // ── Listas ──
  const alertasVenc=flatFiado
    .filter(u=>u.vencimento && u.status!=='pago')
    .filter(u=>{const d=diasParaVencimento(u.vencimento,hoje);return d<=3;})
    .sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
  const vistosD=new Set();
  const alertasUnicos=alertasVenc.filter(u=>{if(vistosD.has(u.clienteId))return false;vistosD.add(u.clienteId);return true;});
  const tb=document.getElementById('dash-devedores');
  tb.innerHTML=alertasUnicos.length===0
    ?'<div class="empty-inline" style="padding:20px;text-align:center"><i data-lucide="circle-check"></i><span>Nenhuma cobrança vencida</span></div>'
    :dashVencimentosHtml(alertasUnicos,hoje);

  // Mais devem (5 primeiros + "ver todos")
  const tbTopDev=document.getElementById('dash-top-devedores');
  if(devedores.length===0){
    tbTopDev.innerHTML='<div class="empty-inline" style="padding:20px;text-align:center"><i data-lucide="circle-check"></i><span>Nenhum cliente devendo</span></div>';
  } else {
    tbTopDev.innerHTML=devedores.slice(0,5).map(c=>dashCardCliente(c,c.saldo,true)).join('')
      +(devedores.length>5?`<div class="dash-mais">+ ${devedores.length-5} cliente${devedores.length-5>1?'s':''} — <a onclick="goto('receber')">ver todos</a></div>`:'');
  }

  // Mais vendidos no mês (5 primeiros)
  const prodMap={};
  vendasMes.forEach(v=>{
    (v.itens||[]).forEach(it=>{
      const key=it.avulso?'av_'+nomeItemVenda(it):it.produtoId+'_'+(it.varianteId||0);
      if(!prodMap[key]) prodMap[key]={nome:nomeItemVenda(it),qtd:0,valor:0};
      prodMap[key].qtd+=it.qtd;
      prodMap[key].valor+=(it.total!=null?it.total:it.qtd*(it.preco||0));
    });
  });
  const topProdutos=Object.values(prodMap).sort((a,b)=>b.valor-a.valor).slice(0,5);
  const tbTopProd=document.getElementById('dash-top-produtos');
  if(topProdutos.length===0){
    tbTopProd.innerHTML='<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px"><div class="empty-inline"><i data-lucide="inbox"></i><span>Sem vendas este mês</span></div></td></tr>';
  } else {
    tbTopProd.innerHTML=topProdutos.map(p=>`<tr>
      <td><strong>${escapeHtml(p.nome)}</strong></td>
      <td>${p.qtd}</td>
      <td>${fmt(p.valor)}</td>
    </tr>`).join('');
  }

  // Movimentações recentes
  const hist=document.getElementById('dash-historico');
  const items=[
    ...state.vendas.map(v=>({type:'sale',data:v.data,title:'Venda — '+v.itens.map(it=>nomeItemVenda(it)).join(', '),sub:getCliente(v.clienteId).nome+' · '+v.itens.reduce((s,it)=>s+it.qtd,0)+' un.',val:v.total})),
    ...state.pagamentos.map(p=>({type:'pay',data:p.data,title:'Pagamento recebido',sub:getCliente(p.clienteId).nome+' · '+p.forma,val:p.valor})),
    ...state.producoes.map(p=>({type:'prod',data:p.data,title:'Produção — '+getNomeCompletoItem(p.produtoId,p.varianteId),sub:p.qtd+' unidades produzidas',val:null})),
  ].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,8);
  if(items.length===0){hist.innerHTML='<div class="empty-state"><div class="icon"><i data-lucide="inbox"></i></div><p>Sem movimentações</p></div>';}
  else{hist.innerHTML=items.map(i=>`<div class="history-item">
    <div class="history-dot h-${i.type}"></div>
    <div class="history-info"><div class="title">${escapeHtml(i.title)}</div><div class="sub">${fmtDate(i.data)} · ${escapeHtml(i.sub)}</div></div>
    ${i.val!==null?`<div class="history-amount ${i.val>0?'pos':'neg'}">${i.val>0?'+':''}${fmt(Math.abs(i.val))}</div>`:''}
  </div>`).join('');}
}

// ============ META DE VENDAS ============
// v5.52.1: a meta vale a partir do mês em que foi definida e CONTINUA nos meses seguintes até ser trocada.
// Antes ela só existia para o mês corrente e aparecia zerada todo dia 1º. state.metas[AAAA-MM]=valor.
// Um valor 0 definido de propósito (campo apagado) significa "sem meta" a partir daquele mês.
function metaVigente(ym){
  const m=state.metas||{};
  const chaves=Object.keys(m).filter(k=>/^\d{4}-\d{2}$/.test(k)&&k<=ym).sort();
  if(!chaves.length) return {valor:0,mes:null};
  const k=chaves[chaves.length-1];
  return {valor:Number(m[k])||0,mes:k};
}
// Aceita do jeito brasileiro: 10000 · 10.000 · 10.000,50 · 10000,5 · R$ 10.000. Vazio = 0. Texto inválido = NaN.
function metaParse(txt){
  let t=String(txt==null?'':txt).replace(/R\$|\s/g,'');
  if(t==='') return 0;
  if(!/^[\d.,]+$/.test(t)||(t.match(/,/g)||[]).length>1) return NaN;
  if(t.includes(',')) t=t.replace(/\./g,'').replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(t)) t=t.replace(/\./g,'');
  const n=parseFloat(t);
  return isNaN(n)||n<0?NaN:n;
}
function metaRealizadoMes(){
  const mesAtual=today().slice(0,7);
  return state.vendas.filter(v=>v.tipo!=='orcamento'&&v.data.startsWith(mesAtual)).reduce((s,v)=>s+v.total,0);
}
function salvarMeta(){
  const val=metaParse(document.getElementById('dash-meta-input').value);
  if(isNaN(val)) return; // texto ainda inválido (ex.: letras): não mexe na meta já salva
  const mesAtual=today().slice(0,7);
  if(!state.metas) state.metas={};
  state.metas[mesAtual]=Math.round(val*100)/100;
  marcarAlterado();
  salvarMetaDebounced();
  renderMetaVendas(metaRealizadoMes());
}
const salvarMetaDebounced=debounce(salvarDados,500);
function salvarMetaAgora(){
  // Gravação imediata (sem esperar o debounce) ao sair do campo — evita perder a meta
  // se o usuário fechar o app logo em seguida, já que no celular o navegador nem
  // sempre roda o salvamento automático de saída (beforeunload) a tempo.
  marcarAlterado();
  salvarDados();
  renderMetaVendas(metaRealizadoMes()); // reformata o campo (10.000) e descarta texto inválido
}
function renderMetaVendas(realizado){
  const mesAtual=today().slice(0,7);
  if(!state.metas) state.metas={};
  const vig=metaVigente(mesAtual);
  const meta=vig.valor;
  // populate input
  const inp=document.getElementById('dash-meta-input');
  if(inp&&(document.activeElement!==inp)) inp.value=meta?meta.toLocaleString('pt-BR',{maximumFractionDigits:2}):'';
  // periodo label
  const [y,m]=mesAtual.split('-');
  const nomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const elP=document.getElementById('dash-meta-periodo');
  if(elP) elP.textContent=nomes[parseInt(m)-1]+' de '+y;
  // progress
  const pct=meta>0?Math.min(100,(realizado/meta)*100):0;
  const bar=document.getElementById('dash-meta-bar');
  const lbl=document.getElementById('dash-meta-label');
  const pctEl=document.getElementById('dash-meta-pct');
  const sub=document.getElementById('dash-meta-sub');
  if(bar){
    bar.style.width=pct+'%';
    bar.style.background=pct>=100?'var(--green)':pct>=60?'var(--yellow)':'var(--blue)';
  }
  const herdada=(meta>0&&vig.mes&&vig.mes!==mesAtual)?' · mantida de '+nomes[parseInt(vig.mes.slice(5),10)-1].toLowerCase():'';
  if(lbl) lbl.textContent=fmt(realizado)+' de '+(meta>0?fmt(meta):'— defina uma meta acima')+herdada;
  if(pctEl){
    pctEl.textContent=meta>0?pct.toFixed(1)+'%':'—';
    pctEl.style.color=pct>=100?'var(--green)':pct>=60?'var(--yellow)':'var(--navy)';
  }
  if(sub){
    if(meta<=0){sub.textContent='Digite uma meta acima para acompanhar o progresso';return;}
    const faltam=meta-realizado;
    if(faltam<=0){sub.textContent='Meta atingida! Parabéns!';}
    else{
      const diasMes=new Date(parseInt(y),parseInt(m),0).getDate();
      const diaAtual=new Date().getDate();
      const diasRestantes=diasMes-diaAtual;
      const diario=diasRestantes>0?(faltam/diasRestantes):faltam;
      sub.textContent=`Faltam ${fmt(faltam)} · ${diasRestantes} dia(s) restantes · meta diária: ${fmt(diario)}`;
    }
  }
}


// ───────── v5.39: listas do Dashboard em cartões + Vencimentos agrupados por data ─────────
function dashBotoesCliente(id,tel,podeReceber){
  return `<div class="dash-cli-acoes">${podeReceber?`<button class="btn btn-green dash-btn" onclick="abrirPagamento(${id})"><i data-lucide="banknote" class="ic"></i> Receber</button>`:''}${tel?`<button class="btn btn-whatsapp dash-btn" onclick="cobrarWhatsapp(${id})"><i data-lucide="message-circle" class="ic"></i> Cobrar</button>`:''}</div>`;
}
function dashCardCliente(c,valor,podeReceber){
  return `<div class="dash-cli dash-cli-row"><strong class="dash-cli-nome">${escapeHtml(c.nome)}</strong><span class="debt-amount">${fmt(valor)}</span>${dashBotoesCliente(c.id,c.tel,podeReceber)}</div>`;
}
// dias = diasParaVencimento (negativo = atraso). Faixas: 1–15 dias (amarelo), 16–60 (laranja), mais de 60 (vermelho).
function faixaVencimento(dias){
  if(dias<-60) return {tag:'Crítico',cls:'badge-red',cor:'var(--red)'};
  if(dias<-15) return {tag:'Atenção',cls:'badge-orange',cor:'#d35400'};
  if(dias<0) return {tag:'Recente',cls:'badge-yellow',cor:'var(--yellow)'};
  return {tag:'A vencer',cls:'badge-blue',cor:'var(--blue)'};
}
function tituloVencimento(dias){
  if(dias<0){const n=Math.abs(dias);return `${n} dia${n>1?'s':''} de atraso`;}
  if(dias===0) return 'Vence hoje';
  if(dias===1) return 'Vence amanhã';
  return `Vence em ${dias} dias`;
}
// Agrupa por data de vencimento (lista já vem em ordem de data, um item por cliente).
function dashVencimentosHtml(itens,hoje){
  const MAX=5; // máximo de clientes mostrados no card
  const grupos=[];
  itens.forEach(u=>{
    let g=grupos.find(x=>x.venc===u.vencimento);
    if(!g){g={venc:u.vencimento,itens:[]};grupos.push(g);}
    g.itens.push(u);
  });
  let restante=MAX,mostrados=0,html='';
  grupos.forEach(g=>{
    if(restante<=0) return;
    const dias=diasParaVencimento(g.venc,hoje),f=faixaVencimento(dias);
    const total=g.itens.reduce((s,u)=>{const sd=getSaldoCliente(u.clienteId);return s+(sd>0?sd:u.valor);},0);
    html+=`<div class="dash-grupo"><div class="dash-grupo-l"><span style="color:${f.cor}">${fmtDate(g.venc)}</span><span class="badge ${f.cls}">${f.tag}</span></div><div class="dash-grupo-sub">${tituloVencimento(dias)} · ${g.itens.length} cliente${g.itens.length>1?'s':''} · ${fmt(total)}</div></div>`;
    g.itens.slice(0,restante).forEach(u=>{
      const c=getCliente(u.clienteId),saldo=getSaldoCliente(u.clienteId);
      html+=dashCardCliente(c,saldo>0?saldo:u.valor,saldo>0);
      mostrados++;
    });
    restante-=Math.min(restante,g.itens.length);
  });
  if(mostrados<itens.length) html+=`<div class="dash-mais">+ ${itens.length-mostrados} cliente${itens.length-mostrados>1?'s':''} — <a onclick="goto('receber')">ver todas</a></div>`;
  return html;
}
