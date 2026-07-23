// ============ COMPRAS ============
let compraItensTemp = [];
let compraNotaParsed = null;

function showCompraTab(tab){
  const btnManual=document.getElementById('compra-tab-manual');
  const btnColar=document.getElementById('compra-tab-colar');
  const ativo='2px solid var(--primary);background:var(--primary);color:#fff';
  const inativo='2px solid var(--border);background:var(--card);color:var(--text)';
  if(tab==='manual'){
    btnManual.style.cssText=`flex:1;padding:10px;border-radius:9px;border:${ativo};font-weight:700;font-size:14px;cursor:pointer`;
    btnColar.style.cssText=`flex:1;padding:10px;border-radius:9px;border:${inativo};font-weight:700;font-size:14px;cursor:pointer`;
  } else {
    btnColar.style.cssText=`flex:1;padding:10px;border-radius:9px;border:${ativo};font-weight:700;font-size:14px;cursor:pointer`;
    btnManual.style.cssText=`flex:1;padding:10px;border-radius:9px;border:${inativo};font-weight:700;font-size:14px;cursor:pointer`;
  }
  document.getElementById('compra-painel-manual').style.display = tab==='manual'?'':'none';
  document.getElementById('compra-painel-colar').style.display = tab==='colar'?'':'none';
}

function parsearValorBR(str){
  if(!str) return 0;
  // "R$ 600,00" ou "600,00" ou "600.00"
  return parseFloat(str.replace(/[R$\s]/g,'').replace('.','').replace(',','.')) || 0;
}

// Normaliza nomes pra comparação: minúsculas, sem acento, espaços simples
function normalizarNomeMp(nome){
  return (nome||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}
// Distância de Levenshtein simples
function levenshtein(a,b){
  const m=a.length,n=b.length;
  if(m===0)return n; if(n===0)return m;
  const d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);
  for(let j=0;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    }
  }
  return d[m][n];
}
// Similaridade 0-1 (1 = idêntico)
function similaridadeTexto(a,b){
  const na=normalizarNomeMp(a),nb=normalizarNomeMp(b);
  if(na===nb)return 1;
  const maxLen=Math.max(na.length,nb.length);
  if(maxLen===0)return 1;
  return 1-(levenshtein(na,nb)/maxLen);
}
// Encontra a MP existente mais parecida (acima do limiar), se houver
function encontrarMpParecida(nome,limiar=0.72){
  let melhor=null,melhorScore=0;
  state.materias.forEach(m=>{
    const score=similaridadeTexto(nome,m.nome);
    if(score>melhorScore){melhorScore=score;melhor=m;}
  });
  return melhor&&melhorScore>=limiar&&melhorScore<1 ? {mp:melhor,score:melhorScore} : null;
}

function processarNotaColada(){
  const texto = document.getElementById('compra-texto-nota').value;
  if(!texto.trim()){showToast('Cole o texto da nota primeiro','red');return;}

  const parsed = {pedido:'', data:'', itens:[], frete:0, taxa:0, pagamento:''};

  // Nº Pedido
  const mPed = texto.match(/pedido[\s\S]*?n[°oº\.]*\s*(\d+)/i) || texto.match(/n[°oº\.]+\s*(\d+)/i);
  if(mPed) parsed.pedido = mPed[1];

  // Data
  const mData = texto.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if(mData) parsed.data = `${mData[3]}-${mData[2]}-${mData[1]}`;
  else parsed.data = today();

  // Itens: linha com | Qtd: X | R$ Y ou * nome * | Qtd
  const linhas = texto.split('\n');
  linhas.forEach(linha => {
    // formato: 1. *NOME* | Qtd: 1,00 | R$ 600,00
    const m = linha.match(/^\d+\.?\s*\*?([^|*]+?)\*?\s*\|\s*[Qq]td[:\.\s]+([\d,\.]+)\s*\|\s*R?\$?\s*([\d.,]+)/);
    if(m){
      parsed.itens.push({
        nome: m[1].trim().replace(/\*/g,''),
        qtd: parsearValorBR(m[2]),
        total: parsearValorBR(m[3]),
        custoUn: 0
      });
    }
  });
  // calcular custo unitário
  parsed.itens.forEach(i=>{ if(i.qtd>0) i.custoUn = parseFloat((i.total/i.qtd).toFixed(4)); });

  // Frete
  const mFrete = texto.match(/frete[:\s]+R?\$?\s*([\d.,]+)/i);
  if(mFrete) parsed.frete = parsearValorBR(mFrete[1]);

  // Taxa maquineta
  const mTaxa = texto.match(/taxa[\s\w]*?[:\s]+R?\$?\s*([\d.,]+)/i);
  if(mTaxa) parsed.taxa = parsearValorBR(mTaxa[1]);

  if(parsed.itens.length === 0){
    showToast('Não encontrei itens no texto. Verifique o formato.','red');
    return;
  }

  compraNotaParsed = parsed;

  // Montar preview
  const novos = parsed.itens.filter(i => !state.materias.find(m=>normalizarNomeMp(m.nome)===normalizarNomeMp(i.nome)));
  const parecidos = novos.filter(i => encontrarMpParecida(i.nome));
  const subtotal = parsed.itens.reduce((s,i)=>s+i.total,0);
  const total = subtotal + parsed.frete + parsed.taxa;

  let html = `<div style="background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;margin-bottom:10px">
      <div><strong>Pedido Nº ${parsed.pedido||'—'}</strong></div>
      <div style="color:var(--muted);font-size:13px">${parsed.data?fmtDate(parsed.data):''}</div>
    </div>
    <table style="width:100%;font-size:13px;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="text-align:left;padding:4px 0;color:var(--muted);font-weight:600">PRODUTO</th>
        <th style="text-align:center;padding:4px;color:var(--muted);font-weight:600">QTD</th>
        <th style="text-align:right;padding:4px 0;color:var(--muted);font-weight:600">TOTAL</th>
      </tr></thead>
      <tbody>`;
  parsed.itens.forEach((i,idx)=>{
    const isExato = state.materias.find(m=>normalizarNomeMp(m.nome)===normalizarNomeMp(i.nome));
    const parecida = !isExato ? encontrarMpParecida(i.nome) : null;
    let badge='';
    if(isExato){badge='';}
    else if(parecida){badge=`<span style="font-size:10px;background:#EBF5FB;color:var(--blue);border:1px solid var(--blue);border-radius:4px;padding:1px 5px;margin-left:6px">⚠️ PARECIDO</span>`;}
    else{badge='<span style="font-size:10px;background:var(--yellow);color:#000;border-radius:4px;padding:1px 5px;margin-left:6px">NOVA MP</span>';}
    html += `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:6px 0">${i.nome}${badge}
        ${parecida?`<div style="margin-top:6px">
          <select class="form-control" id="nota-resolucao-${idx}" style="font-size:12px;padding:5px 8px">
            <option value="usar_${parecida.mp.id}">🔗 É o mesmo que "${parecida.mp.nome}" (usar existente)</option>
            <option value="novo">➕ É diferente, criar matéria-prima nova</option>
          </select>
        </div>`:''}
      </td>
      <td style="text-align:center;padding:6px 4px">${i.qtd}</td>
      <td style="text-align:right;padding:6px 0;font-weight:600">${fmt(i.total)}</td>
    </tr>`;
  });
  html += `</tbody></table>
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);font-size:13px">
      ${parsed.frete>0?`<div style="display:flex;justify-content:space-between;color:var(--muted)"><span>Frete</span><span>${fmt(parsed.frete)}</span></div>`:''}
      ${parsed.taxa>0?`<div style="display:flex;justify-content:space-between;color:var(--muted)"><span>Taxa maquineta</span><span>${fmt(parsed.taxa)}</span></div>`:''}
      <div style="display:flex;justify-content:space-between;font-weight:800;font-size:16px;margin-top:6px;color:var(--green)">
        <span>TOTAL</span><span>${fmt(total)}</span>
      </div>
    </div>
  </div>`;

  const semParecido = novos.filter(i=>!encontrarMpParecida(i.nome));
  if(semParecido.length > 0){
    html += `<div style="background:#FEF9E7;border:1.5px solid var(--yellow);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px">
      ⚠️ <strong>${semParecido.length} matéria(s)-prima nova(s)</strong> serão criadas automaticamente com unidade <strong>un</strong>. Você pode ajustar depois em Estoque.<br>
      <span style="color:var(--muted)">${semParecido.map(i=>i.nome).join(', ')}</span>
    </div>`;
  }
  if(parecidos.length > 0){
    html += `<div style="background:#EBF5FB;border:1.5px solid var(--blue);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px">
      🔎 <strong>${parecidos.length} item(ns)</strong> têm nome parecido com uma matéria-prima que já existe. Confira acima se é a mesma ou não, pra evitar duplicidade.
    </div>`;
  }

  document.getElementById('compra-nota-preview').style.display='block';
  document.getElementById('compra-nota-preview').innerHTML=html;
  document.getElementById('compra-nota-footer').style.display='flex';
}

function registrarCompraDaNota(){
  const parsed = compraNotaParsed;
  if(!parsed||parsed.itens.length===0){showToast('Extraia os dados primeiro','red');return;}
  const fornecedorId = parseInt(document.getElementById('compra-fornecedor-colar').value)||null;
  if(!fornecedorId){showToast('Selecione o fornecedor','red');return;}
  const pagamento = document.getElementById('compra-pagamento-colar').value;
  const fornNome = getFornecedor(fornecedorId)?.nome||'Fornecedor';

  parsed.itens.forEach((item,idx)=>{
    // Criar MP se não existir (ou usar a que o usuário indicou como "mesma")
    let mp = state.materias.find(m=>normalizarNomeMp(m.nome)===normalizarNomeMp(item.nome));
    if(!mp){
      const resolucaoEl = document.getElementById(`nota-resolucao-${idx}`);
      const resolucao = resolucaoEl ? resolucaoEl.value : null;
      if(resolucao && resolucao.startsWith('usar_')){
        mp = state.materias.find(m=>m.id===parseInt(resolucao.replace('usar_','')));
      }
    }
    if(!mp){
      mp = {id:nextId('materias'), nome:item.nome, qtd:0, unidade:'un', custo:item.custoUn, minimo:0, fornecedorId};
      state.materias.push(mp);
    }
    mp.qtd = parseFloat((mp.qtd + item.qtd).toFixed(4));
    mp.custo = item.custoUn;

    const novaCompra = {
      id:nextId('compras'), fornecedorId, materiaId:mp.id,
      qtd:item.qtd, custoUn:item.custoUn, total:item.total,
      pedido:parsed.pedido, pagamento, frete:0, taxa:0, data:parsed.data
    };
    state.compras.push(novaCompra);
    state.financeiro.push({
      id:nextId('financeiro'), tipo:'saida',
      desc:`Compra ${mp.nome} — ${fornNome}${parsed.pedido?' Ped.'+parsed.pedido:''}`,
      valor:item.total, data:parsed.data, compraId:novaCompra.id
    });
  });

  if(parsed.frete>0) state.financeiro.push({id:nextId('financeiro'),tipo:'saida',desc:`Frete — ${fornNome}${parsed.pedido?' Ped.'+parsed.pedido:''}`,valor:parsed.frete,data:parsed.data});
  if(parsed.taxa>0) state.financeiro.push({id:nextId('financeiro'),tipo:'saida',desc:`Taxa maquineta — ${fornNome}`,valor:parsed.taxa,data:parsed.data});

  showToast(`${parsed.itens.length} item(s) registrados com sucesso!`,'green');
  marcarAlterado();
  closeModal('modal-compra');
  renderHistoricoCompras();
  renderFornecedores();
  renderEstoque();
  renderAlertaEstoquePage();
  if(typeof atualizarAlertBells==='function') atualizarAlertBells();
}


function adicionarItemCompra(){
  compraItensTemp.push({mpId:'', qtd:0, custoUn:0});
  renderCompraItensLista();
}
function renderCompraItensLista(){
  const wrap = document.getElementById('compra-itens-lista');
  if(!wrap) return;
  if(compraItensTemp.length === 0){
    wrap.innerHTML = '<p style="color:var(--muted);font-size:12px;padding:4px 0">Nenhum item adicionado.</p>';
    calcularTotalCompra();
    return;
  }
  wrap.innerHTML = compraItensTemp.map((item, i) => {
    const opts = state.materias.map(m => `<option value="${m.id}" ${m.id===item.mpId?'selected':''}>${m.nome} (${m.unidade})</option>`).join('');
    return `<div style="background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:12px;font-weight:700;color:var(--muted)">ITEM ${i+1}</span>
        <button class="icon-btn del" onclick="compraItensTemp.splice(${i},1);renderCompraItensLista()">✕</button>
      </div>
      <select class="form-control" style="margin-bottom:6px" onchange="compraItensTemp[${i}].mpId=parseInt(this.value)||'';calcularTotalCompra()">
        <option value="">Selecione a matéria-prima...</option>${opts}
      </select>
      <div style="display:flex;gap:6px">
        <div style="flex:1"><label style="font-size:11px;color:var(--muted)">Quantidade</label>
          <input class="form-control" type="number" step="0.01" placeholder="0" value="${item.qtd||''}"
            oninput="compraItensTemp[${i}].qtd=parseFloat(this.value)||0;calcularTotalCompra();var el=document.getElementById('compra-item-total-${i}');if(el)el.textContent=fmt(compraItensTemp[${i}].qtd*compraItensTemp[${i}].custoUn);">
        </div>
        <div style="flex:1"><label style="font-size:11px;color:var(--muted)">Custo unit. (R$)</label>
          <input class="form-control" type="number" step="0.01" placeholder="0,00" value="${item.custoUn||''}"
            oninput="compraItensTemp[${i}].custoUn=parseFloat(this.value)||0;calcularTotalCompra();var el=document.getElementById('compra-item-total-${i}');if(el)el.textContent=fmt(compraItensTemp[${i}].qtd*compraItensTemp[${i}].custoUn);">
        </div>
        <div style="flex:1"><label style="font-size:11px;color:var(--muted)">Total</label>
          <div id="compra-item-total-${i}" style="padding:9px 12px;background:var(--card);border:1.5px solid var(--border);border-radius:8px;font-weight:700;font-size:13px;color:var(--green)">
            ${fmt((item.qtd||0)*(item.custoUn||0))}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
  calcularTotalCompra();
}
let compraTaxaModo='valor';
function setTaxaModo(modo){
  compraTaxaModo=modo;
  document.getElementById('compra-taxa-modo-valor').style.background=modo==='valor'?'var(--primary)':'transparent';
  document.getElementById('compra-taxa-modo-valor').style.color=modo==='valor'?'#fff':'var(--muted)';
  document.getElementById('compra-taxa-modo-pct').style.background=modo==='percentual'?'var(--primary)':'transparent';
  document.getElementById('compra-taxa-modo-pct').style.color=modo==='percentual'?'#fff':'var(--muted)';
  document.getElementById('compra-taxa').placeholder=modo==='percentual'?'0,00 %':'0,00';
  calcularTotalCompra();
}
function calcularTaxaMonetaria(subtotal){
  const taxaInput = parseFloat(document.getElementById('compra-taxa')?.value)||0;
  return compraTaxaModo==='percentual' ? subtotal*(taxaInput/100) : taxaInput;
}
function calcularTotalCompra(){
  const subtotal = compraItensTemp.reduce((s,i)=>s+(i.qtd||0)*(i.custoUn||0), 0);
  const frete = parseFloat(document.getElementById('compra-frete')?.value)||0;
  const taxa = calcularTaxaMonetaria(subtotal);
  const total = subtotal + frete + taxa;
  const el = document.getElementById('compra-total-val');
  if(el) el.textContent = fmt(total);
  const preview = document.getElementById('compra-taxa-pct-preview');
  if(preview){
    if(compraTaxaModo==='percentual'&&taxa>0){preview.style.display='block';preview.textContent=`= ${fmt(taxa)}`;}
    else preview.style.display='none';
  }
}
function abrirRegistrarCompra(fornecedorIdPresel){
  document.getElementById('compra-edit-id').value='';
  document.getElementById('compra-data').value=today();
  document.getElementById('compra-pedido').value='';
  document.getElementById('compra-frete').value='';
  document.getElementById('compra-taxa').value='';
  setTaxaModo('valor');
  document.getElementById('compra-atualiza-custo').value='sim';
  compraItensTemp=[];
  compraNotaParsed=null;
  renderCompraItensLista();
  // popular fornecedor em ambas as abas
  const opts='<option value="">Selecione...</option>'+state.fornecedores.map(f=>`<option value="${f.id}">${f.nome}</option>`).join('');
  document.getElementById('compra-fornecedor').innerHTML=opts;
  document.getElementById('compra-fornecedor-colar').innerHTML=opts;
  if(fornecedorIdPresel){
    document.getElementById('compra-fornecedor').value=fornecedorIdPresel;
    document.getElementById('compra-fornecedor-colar').value=fornecedorIdPresel;
  }
  // resetar aba colar
  document.getElementById('compra-texto-nota').value='';
  document.getElementById('compra-nota-preview').style.display='none';
  document.getElementById('compra-nota-footer').style.display='none';
  // mostrar aba manual por padrão
  showCompraTab('manual');
  document.getElementById('modal-compra').classList.add('open');
}
function registrarCompra(){
  const fornecedorId = parseInt(document.getElementById('compra-fornecedor').value)||null;
  const pedido = document.getElementById('compra-pedido').value.trim();
  const data = document.getElementById('compra-data').value||today();
  const pagamento = document.getElementById('compra-pagamento').value;
  const frete = parseFloat(document.getElementById('compra-frete').value)||0;
  const atualizaCusto = document.getElementById('compra-atualiza-custo').value==='sim';

  if(!fornecedorId){showToast('Selecione o fornecedor','red');return;}
  const itensValidos = compraItensTemp.filter(i=>i.mpId&&i.qtd>0&&i.custoUn>0);
  if(itensValidos.length===0){showToast('Adicione pelo menos 1 item com quantidade e custo','red');return;}

  const subtotal = itensValidos.reduce((s,i)=>s+i.qtd*i.custoUn, 0);
  const taxa = calcularTaxaMonetaria(subtotal);
  const total = subtotal + frete + taxa;
  const fornNome = getFornecedor(fornecedorId)?.nome||'Fornecedor';

  // Registrar uma compra por item (mantém compatibilidade) + atualiza estoque
  itensValidos.forEach(item => {
    const mp = state.materias.find(m=>m.id===item.mpId);
    if(!mp) return;
    const novaCompra = {
      id: nextId('compras'),
      fornecedorId, materiaId: item.mpId,
      qtd: item.qtd, custoUn: item.custoUn,
      total: item.qtd*item.custoUn,
      pedido, pagamento, frete: frete/itensValidos.length,
      taxa: taxa/itensValidos.length,
      data
    };
    state.compras.push(novaCompra);
    mp.qtd = parseFloat((mp.qtd + item.qtd).toFixed(4));
    if(atualizaCusto) mp.custo = item.custoUn;
    state.financeiro.push({
      id: nextId('financeiro'), tipo:'saida',
      desc:`Compra ${mp.nome} — ${fornNome}${pedido?' Ped.'+pedido:''}`,
      valor: item.qtd*item.custoUn, data, compraId: novaCompra.id
    });
  });
  // Lançar frete e taxa separado se existirem
  if(frete>0) state.financeiro.push({id:nextId('financeiro'),tipo:'saida',desc:`Frete — ${fornNome}${pedido?' Ped.'+pedido:''}`,valor:frete,data});
  if(taxa>0) state.financeiro.push({id:nextId('financeiro'),tipo:'saida',desc:`Taxa maquineta — ${fornNome}`,valor:taxa,data});

  showToast(`Compra registrada! ${itensValidos.length} item(s) — ${fmt(total)}`,'green');
  marcarAlterado();
  closeModal('modal-compra');
  renderHistoricoCompras();
  renderFornecedores();
  renderEstoque();
  renderAlertaEstoquePage();
  renderHistoricoPreco();
  if(typeof atualizarAlertBells==='function') atualizarAlertBells();
}
function editarCompra(id){
  // edição simples: abre modal com 1 item preenchido
  const c = state.compras.find(c=>c.id===id);
  if(!c) return;
  abrirRegistrarCompra(c.fornecedorId);
  document.getElementById('compra-data').value = c.data;
  document.getElementById('compra-pedido').value = c.pedido||'';
  document.getElementById('compra-edit-id').value = id;
  compraItensTemp = [{mpId:c.materiaId, qtd:c.qtd, custoUn:c.custoUn}];
  renderCompraItensLista();
}
function excluirCompra(id){
  const c=state.compras.find(c=>c.id===id);
  if(!c) return;
  const mp=state.materias.find(m=>m.id===c.materiaId);
  confirmarAcao(`Excluir esta compra? O estoque de "${mp?mp.nome:'MP'}" será revertido.`,()=>{
    // Reverter estoque da MP
    if(mp) mp.qtd=parseFloat(Math.max(0,mp.qtd-c.qtd).toFixed(4));
    // Remover do financeiro
    state.financeiro=state.financeiro.filter(f=>f.compraId!==id);
    // Remover a compra
    state.compras=state.compras.filter(c=>c.id!==id);
    marcarAlterado();
    showToast('Compra excluída e estoque revertido','green');
    renderHistoricoCompras();
    renderEstoque();
    renderAlertaEstoquePage();
  });
}
function renderHistoricoCompras(){
  // populate filters
  const selF=document.getElementById('hist-compras-fornecedor-filter');
  const selM=document.getElementById('hist-compras-mp-filter');
  if(!selF||!selM) return;
  const filtF=selF.value;
  const filtM=selM.value;
  selF.innerHTML='<option value="">Todos os fornecedores</option>'+state.fornecedores.map(f=>`<option value="${f.id}" ${filtF==f.id?'selected':''}>${f.nome}</option>`).join('');
  const mpsUsadas=[...new Set(state.compras.map(c=>c.materiaId))];
  selM.innerHTML='<option value="">Todas as matérias</option>'+mpsUsadas.map(mid=>{const m=getMateria(mid);return`<option value="${mid}" ${filtM==mid?'selected':''}>${m.nome}</option>`;}).join('');

  let list=[...state.compras];
  if(filtF) list=list.filter(c=>c.fornecedorId==filtF);
  if(filtM) list=list.filter(c=>c.materiaId==filtM);
  list.sort((a,b)=>b.data.localeCompare(a.data));

  const tb=document.getElementById('hist-compras-table');
  if(!tb) return;
  if(list.length===0){
    tb.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:28px">Nenhuma compra registrada ainda. Clique em "🛒 Registrar Compra" para começar.</td></tr>';
    return;
  }
  tb.innerHTML=list.map(c=>{
    const forn=getFornecedor(c.fornecedorId);
    const mp=getMateria(c.materiaId);
    return`<tr>
      <td data-label="Data">${fmtDate(c.data)}</td>
      <td data-label="Fornecedor"><strong>${forn?forn.nome:'—'}</strong></td>
      <td data-label="Matéria-Prima">${mp.nome}</td>
      <td data-label="Qtd"><strong>${c.qtd} ${mp.unidade}</strong></td>
      <td data-label="Valor Total"><strong style="color:var(--navy)">${fmt(c.total)}</strong></td>
      <td data-label="Custo/un" style="font-size:12px;color:var(--muted)">${fmt(c.custoUn)}/${mp.unidade}</td>
      <td data-label="Obs" style="font-size:12px;color:var(--muted)">${c.obs||'—'}</td>
      <td><div class="actions-cell">
        <button class="icon-btn edit" onclick="editarCompra(${c.id})" title="Editar">✏️</button>
        <button class="icon-btn del" onclick="excluirCompra(${c.id})" title="Excluir">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');
}

// ============ FORNECEDORES ============
function renderFornecedores(){
  let list=state.fornecedores;
  if(state.fornecedor_filter){
    const t=state.fornecedor_filter;
    list=list.filter(f=>f.nome.toLowerCase().includes(t)||(f.tel||'').includes(t)||(f.categoria||'').toLowerCase().includes(t));
  }
  if(state.fornecedor_status_filter)list=list.filter(f=>f.status===state.fornecedor_status_filter);
  const tb=document.getElementById('fornecedores-table');
  if(list.length===0){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">Nenhum fornecedor encontrado</td></tr>';return;}
  tb.innerHTML=list.map(f=>{
    const materiasVinc=state.materias.filter(m=>m.fornecedorId===f.id);
    const materiasTxt=materiasVinc.length?materiasVinc.map(m=>`<span class="variante-tag">${m.nome}</span>`).join(''):'<span style="color:var(--muted);font-size:12px">—</span>';
    return `<tr>
      <td data-label="Nome"><strong>${f.nome}</strong>${f.obs?`<br><span style="font-size:11px;color:var(--muted)">${f.obs}</span>`:''}</td>
      <td data-label="Contato">${f.contato||'-'}</td>
      <td data-label="Telefone">${f.tel||'-'}</td>
      <td data-label="Fornece" style="font-size:12px">${f.categoria||'-'}</td>
      <td data-label="Matérias Vinculadas" class="td-block" style="max-width:220px">${materiasTxt}</td>
      <td data-label="Compras" style="white-space:nowrap">${(()=>{const comprasForn=state.compras.filter(c=>c.fornecedorId===f.id);const totalGasto=comprasForn.reduce((s,c)=>s+c.total,0);return comprasForn.length?`<span style="font-size:12px"><strong>${comprasForn.length}</strong> compra(s)<br><span style="color:var(--muted)">${fmt(totalGasto)}</span></span>`:`<span style="color:var(--muted);font-size:12px">—</span>`;})()}</td>
      <td data-label="Status"><span class="badge ${f.status==='ativo'?'badge-green':'badge-red'}">${f.status==='ativo'?'Ativo':'Inativo'}</span></td>
      <td><div class="actions-cell">
        <button class="icon-btn" onclick="abrirRegistrarCompra(${f.id})" title="Registrar Compra" style="color:var(--green)">🛒</button>
        <button class="icon-btn edit" onclick="editarFornecedor(${f.id})" title="Editar">✏️</button>
        <button class="icon-btn del" onclick="excluirFornecedor(${f.id})" title="Excluir">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');
}
function filterFornecedores(v){state.fornecedor_filter=v.toLowerCase();renderFornecedores();}
const filterFornecedoresDebounced=debounce(filterFornecedores);

function filterFornecedorStatus(v){state.fornecedor_status_filter=v;renderFornecedores();}
function clearFornecedorForm(){
  ['forn-edit-id','forn-nome','forn-contato','forn-tel','forn-categoria','forn-obs'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('forn-status').value='ativo';
  document.getElementById('modal-fornecedor-title').textContent='Novo Fornecedor';
}
function salvarFornecedor(){
  const eid=document.getElementById('forn-edit-id').value;
  const nome=document.getElementById('forn-nome').value.trim();
  const contato=document.getElementById('forn-contato').value.trim();
  const tel=document.getElementById('forn-tel').value.trim();
  const categoria=document.getElementById('forn-categoria').value.trim();
  const obs=document.getElementById('forn-obs').value.trim();
  const status=document.getElementById('forn-status').value;
  if(!nome){showToast('Informe o nome do fornecedor','red');return;}
  if(eid){
    const f=state.fornecedores.find(f=>f.id==eid);
    f.nome=nome;f.contato=contato;f.tel=tel;f.categoria=categoria;f.obs=obs;f.status=status;
    showToast('Fornecedor atualizado','green');
  } else {
    state.fornecedores.push({id:nextId('fornecedores'),nome,contato,tel,categoria,obs,status});
    showToast('Fornecedor cadastrado','green');
  }
  marcarAlterado();
  closeModal('modal-fornecedor');renderFornecedores();renderHistoricoCompras();
}
function editarFornecedor(id){
  const f=state.fornecedores.find(f=>f.id===id);
  document.getElementById('forn-edit-id').value=id;
  document.getElementById('forn-nome').value=f.nome;
  document.getElementById('forn-contato').value=f.contato||'';
  document.getElementById('forn-tel').value=f.tel||'';
  document.getElementById('forn-categoria').value=f.categoria||'';
  document.getElementById('forn-obs').value=f.obs||'';
  document.getElementById('forn-status').value=f.status||'ativo';
  document.getElementById('modal-fornecedor-title').textContent='Editar Fornecedor';
  document.getElementById('modal-fornecedor').classList.add('open');
}
function excluirFornecedor(id){
  const vinculadas=state.materias.filter(m=>m.fornecedorId===id).length;
  const aviso=vinculadas>0?` ${vinculadas} matéria(s)-prima(s) vinculada(s) ficarão sem fornecedor.`:'';
  confirmarAcao('Excluir este fornecedor?'+aviso,()=>{
    state.fornecedores=state.fornecedores.filter(f=>f.id!==id);
    state.materias.forEach(m=>{if(m.fornecedorId===id)m.fornecedorId=null;});
    marcarAlterado();salvarDados();
    showToast('Fornecedor excluído','green');renderFornecedores();renderEstoque();
  });
}
let prodVariantesTemp=[];
let npMPsTemp=[];
let npTipoAtual='pronto';
function npSetTipo(tipo){
  npTipoAtual=tipo;
  document.getElementById('np-tab-pronto').classList.toggle('active',tipo==='pronto');
  document.getElementById('np-tab-semi').classList.toggle('active',tipo==='semiacabado');
  document.getElementById('np-campos-pronto').style.display=tipo==='pronto'?'block':'none';
  document.getElementById('np-campos-semi').style.display=tipo==='semiacabado'?'block':'none';
  document.getElementById('np-campos-semi-mp').style.display=tipo==='semiacabado'?'block':'none';
}
function npAdicionarMP(){
  npMPsTemp.push({id:Date.now(),mpId:'',qtd:0});
  npRenderMPLista();
}
function npRenderMPLista(){
  const wrap=document.getElementById('np-mp-lista');
  if(!wrap)return;
  if(npMPsTemp.length===0){wrap.innerHTML='<p style="color:var(--muted);font-size:12px">Nenhuma MP adicionada.</p>';return;}
  wrap.innerHTML=npMPsTemp.map((mp,i)=>{
    const opts=state.materias.map(m=>`<option value="${m.id}" ${m.id===mp.mpId?'selected':''}>${m.nome} (${m.unidade})</option>`).join('');
    return `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <select class="form-control" style="flex:2" onchange="npMPsTemp[${i}].mpId=parseInt(this.value)">
        <option value="">Selecione MP...</option>${opts}
      </select>
      <input class="form-control" style="flex:1;max-width:80px" type="number" step="0.01" placeholder="Qtd" value="${mp.qtd||''}" onchange="npMPsTemp[${i}].qtd=parseFloat(this.value)||0">
      <button class="icon-btn del" onclick="npMPsTemp.splice(${i},1);npRenderMPLista()">✕</button>
    </div>`;
  }).join('');
}
function abrirNovoProduto(){
  document.getElementById('np-nome').value='';
  document.getElementById('np-sku').value='';
  document.getElementById('np-categoria').value='';
  document.getElementById('np-preco').value='';
  document.getElementById('np-unidade').value='L';
  document.getElementById('np-estoque').value=0;
  document.getElementById('np-minimo').value=0;
  npMPsTemp=[];
  npRenderMPLista();
  npSetTipo('pronto');
  requestAnimationFrame(()=>requestAnimationFrame(()=>openModal('modal-novo-produto')));
}
function salvarNovoProduto(){
  const nome=document.getElementById('np-nome').value.trim();
  if(!nome){showToast('Informe o nome do produto','red');return;}
  if(npTipoAtual==='semiacabado'){
    const novo={
      id:nextId('semiacabados'),
      nome,
      unidade:document.getElementById('np-unidade').value,
      estoque:parseFloat(document.getElementById('np-estoque').value)||0,
      minimo:parseFloat(document.getElementById('np-minimo').value)||0,
      mps:npMPsTemp.filter(mp=>mp.mpId&&mp.qtd>0)
    };
    if(!state.semiacabados)state.semiacabados=[];
    state.semiacabados.push(novo);
    showToast('Semiacabado cadastrado ✓','green');
  } else {
    const novo={
      id:nextId('produtos'),
      nome,
      sku:document.getElementById('np-sku').value.trim(),
      categoria:document.getElementById('np-categoria').value.trim(),
      preco:parseFloat(document.getElementById('np-preco').value)||0,
      estoque:parseInt(document.getElementById('np-estoque').value)||0,
      minimo:parseInt(document.getElementById('np-minimo').value)||0,
      variantes:[]
    };
    state.produtos.push(novo);
    showToast('Produto cadastrado ✓','green');
  }
  marcarAlterado();salvarDados();
  closeModal('modal-novo-produto');
  renderEstoque();renderPrecificacao();
}
function editarProduto(id){
  const p=state.produtos.find(p=>p.id===id);
  if(!p)return;
  document.getElementById('ep-id').value=id;
  document.getElementById('ep-nome').value=p.nome||'';
  document.getElementById('ep-sku').value=p.sku||'';
  document.getElementById('ep-categoria').value=p.categoria||'';
  document.getElementById('ep-preco').value=p.preco||'';
  document.getElementById('ep-minimo').value=p.minimo||0;
  // Variantes
  const wrap=document.getElementById('ep-variantes-wrap');
  if(p.variantes&&p.variantes.length>0){
    wrap.innerHTML=`<div class="form-group"><label>Preço por Variante</label>${p.variantes.map((v,i)=>`
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <span class="form-control" style="flex:2;background:#F8F9FA;color:var(--muted)">${v.nome}</span>
        <input class="form-control" type="number" step="0.01" min="0" style="flex:1" value="${v.preco||p.preco||''}" placeholder="Preço" id="ep-var-preco-${i}">
      </div>`).join('')}</div>`;
  } else {
    wrap.innerHTML='';
  }
  requestAnimationFrame(()=>requestAnimationFrame(()=>openModal('modal-editar-produto')));
}
function salvarEdicaoProduto(){
  const id=parseInt(document.getElementById('ep-id').value);
  const p=state.produtos.find(p=>p.id===id);
  if(!p)return;
  p.nome=document.getElementById('ep-nome').value.trim()||p.nome;
  p.sku=document.getElementById('ep-sku').value.trim();
  p.categoria=document.getElementById('ep-categoria').value.trim();
  p.preco=parseFloat(document.getElementById('ep-preco').value)||p.preco;
  p.minimo=parseInt(document.getElementById('ep-minimo').value)||0;
  if(p.variantes&&p.variantes.length>0){
    p.variantes.forEach((v,i)=>{
      const inp=document.getElementById(`ep-var-preco-${i}`);
      if(inp)v.preco=parseFloat(inp.value)||p.preco;
    });
  }
  marcarAlterado();salvarDados();
  showToast('Produto atualizado ✓','green');
  closeModal('modal-editar-produto');
  renderEstoque();renderPrecificacao();
}
function excluirProduto(id){
  confirmarAcao('Excluir este produto acabado?',()=>{
    state.produtos=state.produtos.filter(p=>p.id!==id);
    marcarAlterado();salvarDados();
    showToast('Produto excluído','green');renderEstoque();renderAlertaEstoquePage();
  });
}
function atualizarListaCategorias(){}


