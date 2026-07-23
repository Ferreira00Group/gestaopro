// ============ PRECIFICAÇÃO ============
function showPrecTab(tab,btn){
  ['visao-geral','por-produto','simulador'].forEach(t=>{
    const el=document.getElementById('prec-tab-'+t);
    if(el) el.style.display=t===tab?'block':'none';
  });
  document.querySelectorAll('#page-precificacao .tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(tab==='visao-geral') renderPrecVisaoGeral();
  if(tab==='por-produto') renderPrecificacao();
  if(tab==='simulador') renderSimulador();
}

function getCustoFixoPorUnidade(){
  const totalCF=(state.custosFixos||[]).reduce((s,c)=>s+(c.valor||0),0);
  const mesAtual=today().slice(0,7);
  const unidadesProduzidasMes=state.producoes
    .filter(p=>p.data.startsWith(mesAtual))
    .reduce((s,p)=>s+p.qtd,0);
  const cfPorUn=unidadesProduzidasMes>0?(totalCF/unidadesProduzidasMes):0;
  return {totalCF,unidadesProduzidasMes,cfPorUn};
}

function calcularCustoTotal(produtoId,varianteId){
  const custoMP=calcularCustoFicha(produtoId,varianteId,1);
  const {cfPorUn}=getCustoFixoPorUnidade();
  return custoMP+cfPorUn;
}

function getPrecoCanal(precoBase,canal){
  if(!canal) return precoBase;
  const desc=(canal.desconto||0)/100;
  return precoBase*(1-desc);
}

function getLinhasPrecificacao(){
  const linhas=[];
  state.produtos.forEach(p=>{
    if(p.variantes&&p.variantes.length>0){
      p.variantes.forEach(v=>{
        const custoMP=calcularCustoFicha(p.id,v.id,1);
        const custoTotal=calcularCustoTotal(p.id,v.id);
        linhas.push({produtoId:p.id,varianteId:v.id,nome:getNomeCompletoItem(p.id,v.id),categoria:p.categoria,sku:v.sku||p.sku,preco:p.preco,custoMP,custoTotal,estoque:v.estoque});
      });
    } else {
      const custoMP=calcularCustoFicha(p.id,null,1);
      const custoTotal=calcularCustoTotal(p.id,null);
      linhas.push({produtoId:p.id,varianteId:null,nome:p.nome,categoria:p.categoria,sku:p.sku,preco:p.preco,custoMP,custoTotal,estoque:p.estoque});
    }
  });
  return linhas;
}

function renderPrecVisaoGeral(){
  const linhas=getLinhasPrecificacao();
  const {totalCF,unidadesProduzidasMes,cfPorUn}=getCustoFixoPorUnidade();
  const semFicha=linhas.filter(l=>l.custoMP===0).length;
  const margemNegativa=linhas.filter(l=>l.preco>0&&l.preco<=l.custoTotal).length;
  const margemArr=linhas.filter(l=>l.preco>0&&l.custoTotal>0).map(l=>(l.preco-l.custoTotal)/l.preco*100);
  const margemMedia=margemArr.length?margemArr.reduce((s,m)=>s+m,0)/margemArr.length:0;
  const custoMedioMP=linhas.filter(l=>l.custoMP>0).reduce((s,l)=>s+l.custoMP,0)/Math.max(1,linhas.filter(l=>l.custoMP>0).length);

  document.getElementById('prec-cards-resumo').innerHTML=`
    <div class="stat-card ${margemMedia<25?'red':margemMedia<40?'yellow':'green'}"><div class="label">Margem Média Real</div><div class="value">${margemMedia.toFixed(1)}%</div><div class="sub">custo MP + fixos rateados</div></div>
    <div class="stat-card ${margemNegativa>0?'red':'green'}"><div class="label">No Prejuízo</div><div class="value">${margemNegativa}</div><div class="sub">produto(s) abaixo do custo</div></div>
    <div class="stat-card yellow"><div class="label">Sem Ficha Técnica</div><div class="value">${semFicha}</div><div class="sub">custo de MP não calculado</div></div>
    <div class="stat-card blue"><div class="label">Custo Fixo/un</div><div class="value">${fmt(cfPorUn)}</div><div class="sub">${unidadesProduzidasMes} un produzidas este mês</div></div>
  `;

  // custos fixos
  const cf=state.custosFixos||[];
  document.getElementById('prec-custos-resumo').innerHTML=cf.length===0
    ?'<p style="color:var(--muted);font-size:13px">Nenhum custo fixo cadastrado ainda.</p>'
    :`<table style="width:100%;border-collapse:collapse">
      ${cf.map(c=>`<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:8px 4px;font-size:13px">${c.nome}</td>
        <td style="padding:8px 4px;font-size:13px;font-weight:700;text-align:right;color:var(--red)">${fmt(c.valor||0)}/mês</td>
      </tr>`).join('')}
      <tr><td style="padding:10px 4px;font-size:13px;font-weight:700">Total</td><td style="padding:10px 4px;font-size:14px;font-weight:800;text-align:right;color:var(--navy)">${fmt(totalCF)}/mês</td></tr>
    </table>
    <div style="margin-top:10px;padding:10px 12px;background:#EBF5FB;border-radius:8px;font-size:13px">
      ${unidadesProduzidasMes>0
        ?`<strong>${fmt(totalCF)} ÷ ${unidadesProduzidasMes} un = <span style="color:var(--blue)">${fmt(cfPorUn)}/un</span></strong> adicionado ao custo de cada produto`
        :`<span style="color:var(--muted)">⚠️ Sem produções registradas este mês — o custo fixo não está sendo rateado. Registre produções para ativar o rateio.</span>`}
    </div>`;

  // canais
  const canais=state.canais||[];
  document.getElementById('prec-canais-resumo').innerHTML=canais.length===0
    ?'<p style="color:var(--muted);font-size:13px">Nenhum canal cadastrado ainda.</p>'
    :`<div style="display:flex;flex-wrap:wrap;gap:10px">
      ${canais.map(c=>{
        const cor=c.desconto>0?'var(--red)':c.desconto<0?'var(--green)':'var(--muted)';
        const sinal=c.desconto>0?'−':c.desconto<0?'+':'';
        return`<div style="background:#F8F9FA;border-radius:10px;padding:12px 18px;min-width:130px">
          <div style="font-size:13px;font-weight:700">${c.nome}</div>
          <div style="font-size:20px;font-weight:800;color:${cor};margin-top:4px">${sinal}${Math.abs(c.desconto||0)}%</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${c.desconto>0?'desconto sobre preço base':c.desconto<0?'acréscimo sobre preço base':'preço cheio'}</div>
        </div>`;
      }).join('')}
    </div>`;
}

function filterPrecificacao(v){state.precificacao_filter=(v||'').toLowerCase();renderPrecificacao();}
const filterPrecificacaoDebounced=debounce(filterPrecificacao);
function renderPrecificacao(){
  // populate canal filter
  const selCanal=document.getElementById('prec-filtro-canal');
  if(selCanal){
    const vAtual=selCanal.value;
    selCanal.innerHTML='<option value="">Todos os canais</option>'+(state.canais||[]).map(c=>`<option value="${c.id}" ${vAtual==c.id?'selected':''}>${c.nome}</option>`).join('');
  }
  const canalFiltrado=selCanal?parseInt(selCanal.value)||null:null;
  const canal=canalFiltrado?(state.canais||[]).find(c=>c.id===canalFiltrado):null;

  let linhas=getLinhasPrecificacao();
  if(state.precificacao_filter)linhas=linhas.filter(l=>l.nome.toLowerCase().includes(state.precificacao_filter));
  linhas.sort((a,b)=>{
    const mA=a.preco>0?((a.preco-a.custoTotal)/a.preco):-999;
    const mB=b.preco>0?((b.preco-b.custoTotal)/b.preco):-999;
    return mA-mB;
  });

  const el=document.getElementById('precificacao-lista');
  if(!el) return;
  if(linhas.length===0){el.innerHTML='<div class="empty-state"><div class="icon">🏷️</div><p>Nenhum produto cadastrado</p></div>';return;}

  el.innerHTML=`<div class="table-card"><div class="table-scroll"><table>
    <thead><tr>
      <th>Produto</th><th>Custo MP</th><th>Custo Fixo/un</th><th>Custo Total</th>
      <th>${canal?canal.nome+' (preço)':'Preço Base'}</th>
      <th>Margem R$</th><th>Margem %</th><th>Piso Desconto</th>
    </tr></thead>
    <tbody>
      ${linhas.map(l=>{
        const {cfPorUn}=getCustoFixoPorUnidade();
        const semFichaFlag=l.custoMP===0;
        const precoCanal=canal?getPrecoCanal(l.preco,canal):l.preco;
        const margemRS=precoCanal-l.custoTotal;
        const margemPct=precoCanal>0?(margemRS/precoCanal*100):0;
        // piso = preço mínimo para não ter prejuízo = custo total / (1 - margem mínima 10%)
        const pisoAbsoluto=l.custoTotal;
        const pisoDescPct=precoCanal>0?Math.max(0,((precoCanal-pisoAbsoluto)/precoCanal*100)):0;
        let cor='var(--green)';
        if(semFichaFlag) cor='var(--muted)';
        else if(margemRS<=0) cor='var(--red)';
        else if(margemPct<25) cor='var(--yellow)';
        return `<tr>
          <td><strong>${l.nome}</strong>${l.sku?`<div style="font-size:11px;color:var(--muted)">${l.sku}</div>`:''}</td>
          <td style="font-size:13px">${semFichaFlag?'<span style="color:var(--muted)">—</span>':fmt(l.custoMP)}</td>
          <td style="font-size:13px;color:var(--blue)">${cfPorUn>0?fmt(cfPorUn):'<span style="color:var(--muted)">—</span>'}</td>
          <td style="font-weight:700">${semFichaFlag?'<span style="color:var(--muted)">—</span>':fmt(l.custoTotal)}</td>
          <td><strong>${fmt(precoCanal)}</strong>${canal&&canal.desconto>0?`<div style="font-size:10px;color:var(--muted)">base: ${fmt(l.preco)}</div>`:''}</td>
          <td style="color:${cor};font-weight:700">${semFichaFlag?'—':fmt(margemRS)}</td>
          <td><span class="badge" style="background:${cor}22;color:${cor}">${semFichaFlag?'—':margemPct.toFixed(1)+'%'}</span></td>
          <td style="font-size:12px">${semFichaFlag||precoCanal===0?'—':`<span style="color:var(--red);font-weight:600">até ${pisoDescPct.toFixed(1)}%</span><div style="font-size:11px;color:var(--muted)">piso: ${fmt(pisoAbsoluto)}</div>`}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div></div>`;
}

// ── Simulador ──
function renderSimulador(){
  const sp=document.getElementById('sim-produto');
  const sc=document.getElementById('sim-canal');
  if(!sp||!sc) return;
  sp.innerHTML='<option value="">Selecione o produto...</option>'+state.produtos.flatMap(p=>
    p.variantes&&p.variantes.length>0
      ?p.variantes.map(v=>`<option value="${p.id}::${v.id}">${getNomeCompletoItem(p.id,v.id)}</option>`)
      :[`<option value="${p.id}::">${p.nome}</option>`]
  ).join('');
  sc.innerHTML='<option value="">— Sem canal (preço base) —</option>'+(state.canais||[]).map(c=>`<option value="${c.id}">${c.nome} (${c.desconto>0?'−':''}${Math.abs(c.desconto||0)}%)</option>`).join('');
  simRecalc();
}
function simRecalc(){
  const res=document.getElementById('sim-resultado');
  if(!res) return;
  const prodVal=document.getElementById('sim-produto')?.value||'';
  if(!prodVal){res.style.display='none';return;}
  const [pidStr,vidStr]=prodVal.split('::');
  const pid=parseInt(pidStr)||null;
  const vid=vidStr?parseInt(vidStr)||null:null;
  if(!pid){res.style.display='none';return;}
  const qtd=parseFloat(document.getElementById('sim-qtd')?.value)||1;
  const canalId=parseInt(document.getElementById('sim-canal')?.value)||null;
  const canal=canalId?(state.canais||[]).find(c=>c.id===canalId):null;
  const custoMP=calcularCustoFicha(pid,vid,1);
  const custoTotal=calcularCustoTotal(pid,vid);
  const {cfPorUn}=getCustoFixoPorUnidade();
  const prod=getProduto(pid);
  const precoBase=prod.preco||0;
  const precoSugerido=canal?getPrecoCanal(precoBase,canal):precoBase;
  const practicado=parseFloat(document.getElementById('sim-preco-praticado')?.value)||precoSugerido;
  const margemRS=practicado-custoTotal;
  const margemPct=practicado>0?(margemRS/practicado*100):0;
  const pisoAbsoluto=custoTotal;
  const pisoDescPct=practicado>0?Math.max(0,((practicado-pisoAbsoluto)/practicado*100)):0;
  const totalVenda=practicado*qtd;
  const lucroTotal=margemRS*qtd;
  const corMarg=margemRS<=0?'var(--red)':margemPct<25?'var(--yellow)':'var(--green)';

  res.style.display='block';
  res.innerHTML=`
    <div class="cards-grid cards-grid-4" style="margin:16px 0 12px">
      <div class="stat-card"><div class="label">Custo MP</div><div class="value" style="font-size:18px;color:var(--navy)">${fmt(custoMP)}</div><div class="sub">por unidade</div></div>
      <div class="stat-card blue"><div class="label">Custo Fixo/un</div><div class="value" style="font-size:18px">${fmt(cfPorUn)}</div><div class="sub">rateio mensal</div></div>
      <div class="stat-card"><div class="label">Custo Total/un</div><div class="value" style="font-size:18px;color:var(--navy)">${fmt(custoTotal)}</div><div class="sub">MP + fixos</div></div>
      <div class="stat-card ${margemRS<=0?'red':margemPct<25?'yellow':'green'}"><div class="label">Margem</div><div class="value" style="font-size:18px">${margemPct.toFixed(1)}%</div><div class="sub">${fmt(margemRS)}/un</div></div>
    </div>
    <div class="cards-grid cards-grid-2">
      <div style="background:#F8F9FA;border-radius:10px;padding:14px 16px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:8px">Preços</div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span>Preço base</span><strong>${fmt(precoBase)}</strong></div>
        ${canal?`<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span>Preço ${canal.nome}</span><strong>${fmt(precoSugerido)}</strong></div>`:''}
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;${practicado!==precoSugerido?'color:var(--blue)':''}" ><span>Preço praticado</span><strong>${fmt(practicado)}</strong></div>
        <div style="border-top:1px solid var(--border);margin-top:6px;padding-top:6px;display:flex;justify-content:space-between;font-size:13px"><span>Total ${qtd} un</span><strong>${fmt(totalVenda)}</strong></div>
      </div>
      <div style="background:#F8F9FA;border-radius:10px;padding:14px 16px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:8px">Piso de Desconto</div>
        <div style="font-size:28px;font-weight:800;color:${pisoDescPct<5?'var(--red)':'var(--green)'}">${pisoDescPct.toFixed(1)}%</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">máximo sem entrar no prejuízo</div>
        <div style="font-size:12px;margin-top:6px">Piso absoluto: <strong>${fmt(pisoAbsoluto)}</strong>/un</div>
        <div style="font-size:12px;margin-top:4px">Lucro total: <strong style="color:${lucroTotal<0?'var(--red)':'var(--green)'}">${fmt(lucroTotal)}</strong></div>
      </div>
    </div>
    ${margemRS<=0?`<div class="alert-banner danger" style="margin-top:12px">⚠️ Preço abaixo do custo total — você está vendendo no prejuízo neste cenário.</div>`:''}
    ${margemPct>0&&margemPct<25?`<div class="alert-banner" style="margin-top:12px">⚠️ Margem abaixo de 25% — considere revisar o preço ou reduzir custos.</div>`:''}
  `;
}

// ── Custos Fixos Modal ──
let cfTemp=[];
function openModalCustosFixos(){
  cfTemp=JSON.parse(JSON.stringify(state.custosFixos||[]));
  renderCustosFixosLista();
  document.getElementById('modal-custos-fixos').classList.add('open');
}
function adicionarCustoFixo(){
  cfTemp.push({id:Date.now(),nome:'',valor:0});
  renderCustosFixosLista();
}
function renderCustosFixosLista(){
  const {unidadesProduzidasMes}=getCustoFixoPorUnidade();
  const el=document.getElementById('custos-fixos-lista');
  if(!el) return;
  el.innerHTML=cfTemp.map((c,i)=>`
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center">
      <input class="form-control" style="flex:1 1 100%" value="${c.nome}" placeholder="Nome do custo (ex: Aluguel)" oninput="cfTemp[${i}].nome=this.value">
      <div style="display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0">
        <span style="font-size:14px;color:var(--muted);flex-shrink:0">R$</span>
        <input class="form-control" type="number" step="0.01" min="0" value="${c.valor||''}" placeholder="0,00" style="min-width:90px;font-size:16px"
          oninput="cfTemp[${i}].valor=parseFloat(this.value)||0;atualizarTotalCF()">
        <span style="font-size:12px;color:var(--muted);flex-shrink:0">/mês</span>
      </div>
      <button class="icon-btn del" onclick="cfTemp.splice(${i},1);renderCustosFixosLista()">🗑️</button>
    </div>`).join('');
  atualizarTotalCF();
}
function atualizarTotalCF(){
  const total=cfTemp.reduce((s,c)=>s+(c.valor||0),0);
  const mesAtual=today().slice(0,7);
  const unidades=state.producoes.filter(p=>p.data.startsWith(mesAtual)).reduce((s,p)=>s+p.qtd,0);
  const cfPU=unidades>0?(total/unidades):0;
  const el1=document.getElementById('cf-total-label');
  const el2=document.getElementById('cf-unidades-label');
  const el3=document.getElementById('cf-por-unidade-label');
  if(el1) el1.textContent=fmt(total);
  if(el2) el2.textContent=unidades+' un';
  if(el3) el3.textContent=fmt(cfPU);
}
function salvarCustosFixos(){
  state.custosFixos=cfTemp.map(c=>({...c,valor:parseFloat(c.valor)||0}));
  marcarAlterado();
  closeModal('modal-custos-fixos');
  renderPrecVisaoGeral();
  showToast('Custos fixos salvos','green');
}

// ── Canais Modal ──
let canaisTemp=[];
function openModalCanais(){
  canaisTemp=JSON.parse(JSON.stringify(state.canais||[]));
  renderCanaisLista();
  document.getElementById('modal-canais').classList.add('open');
}
function adicionarCanal(){
  canaisTemp.push({id:Date.now(),nome:'',desconto:0});
  renderCanaisLista();
}
function renderCanaisLista(){
  const el=document.getElementById('canais-lista');
  if(!el) return;
  el.innerHTML=canaisTemp.map((c,i)=>`
    <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
      <input class="form-control" style="flex:2" value="${c.nome}" placeholder="Nome do canal (ex: Varejo)" oninput="canaisTemp[${i}].nome=this.value">
      <input class="form-control" type="number" step="0.1" min="-100" max="100" value="${c.desconto||0}" style="flex:1"
        oninput="canaisTemp[${i}].desconto=parseFloat(this.value)||0" placeholder="0">
      <span style="font-size:12px;color:var(--muted);flex-shrink:0;min-width:80px">% desconto</span>
      <button class="icon-btn del" onclick="canaisTemp.splice(${i},1);renderCanaisLista()">🗑️</button>
    </div>`).join('');
}
function salvarCanais(){
  if(canaisTemp.some(c=>!c.nome.trim())){showToast('Preencha o nome de todos os canais','red');return;}
  state.canais=canaisTemp;
  marcarAlterado();
  closeModal('modal-canais');
  renderPrecVisaoGeral();
  showToast('Canais salvos','green');
}

function salvarMateria(){
  const eid=document.getElementById('mp-edit-id').value;
  const nome=document.getElementById('mp-nome').value.trim();
  const unidade=document.getElementById('mp-unidade').value;
  const custo=parseFloat(document.getElementById('mp-custo').value)||0;
  const minimo=parseFloat(document.getElementById('mp-minimo').value)||0;
  const fornecedorId=document.getElementById('mp-fornecedor').value?parseInt(document.getElementById('mp-fornecedor').value):null;
  if(!nome){showToast('Informe o nome','red');return;}
  if(eid){
    const m=state.materias.find(m=>m.id==eid);
    m.nome=nome;m.unidade=unidade;m.custo=custo;m.minimo=minimo;m.fornecedorId=fornecedorId;
    showToast('Matéria-prima atualizada','green');
  } else {
    const estoqueInicial=parseFloat(document.getElementById('mp-estoque').value)||0;
    state.materias.push({id:nextId('materias'),nome,qtd:estoqueInicial,unidade,custo,minimo,fornecedorId});
    showToast('Matéria-prima cadastrada','green');
  }
  closeModal('modal-materia');marcarAlterado();renderEstoque();renderAlertaEstoquePage();
}
function editarMateria(id){
  const m=state.materias.find(m=>m.id===id);
  document.getElementById('mp-edit-id').value=id;
  document.getElementById('mp-nome').value=m.nome;
  document.getElementById('mp-unidade').value=m.unidade;
  document.getElementById('mp-custo').value=m.custo;
  document.getElementById('mp-minimo').value=m.minimo;
  document.getElementById('mp-estoque-wrap').style.display='none';
  populaSelectFornecedores();
  document.getElementById('mp-fornecedor').value=m.fornecedorId||'';
  document.getElementById('modal-materia-title').textContent='Editar Matéria-Prima';
  document.getElementById('modal-materia').classList.add('open');
}
function excluirMateria(id){
  confirmarAcao('Excluir esta matéria-prima?',()=>{
    state.materias=state.materias.filter(m=>m.id!==id);
    marcarAlterado();salvarDados();
    showToast('Matéria-prima excluída','green');renderEstoque();renderAlertaEstoquePage();
  });
}
function clearMateria(){
  ['mp-edit-id','mp-nome','mp-custo','mp-minimo','mp-estoque'].forEach(id=>document.getElementById(id).value='');
  populaSelectFornecedores();
  document.getElementById('mp-fornecedor').value='';
  document.getElementById('modal-materia-title').textContent='Nova Matéria-Prima';
  document.getElementById('mp-estoque-wrap').style.display='block';
}
function populaSelectFornecedores(){
  const sel=document.getElementById('mp-fornecedor');
  const atual=sel.value;
  sel.innerHTML='<option value="">— Nenhum —</option>'+state.fornecedores.map(f=>`<option value="${f.id}">${f.nome}</option>`).join('');
  sel.value=atual;
}

