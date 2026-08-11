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
      <td style="padding:6px 0">${escapeHtml(i.nome)}${badge}
        ${parecida?`<div style="margin-top:6px">
          <select class="form-control" id="nota-resolucao-${idx}" style="font-size:12px;padding:5px 8px">
            <option value="usar_${parecida.mp.id}">🔗 É o mesmo que "${escapeHtml(parecida.mp.nome)}" (usar existente)</option>
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
      <span style="color:var(--muted)">${semParecido.map(i=>escapeHtml(i.nome)).join(', ')}</span>
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

  // "A Prazo" funciona igual ao modo Manual (ver registrarCompra): a compra vira dívida em
  // Contas a Pagar em vez de lançar saída imediata no Financeiro.
  const formaPagamento = pagamento==='A Prazo' ? 'prazo' : 'avista';
  const vencimento = formaPagamento==='prazo' ? (document.getElementById('compra-colar-vencimento').value||null) : null;
  if(formaPagamento==='prazo' && !vencimento){showToast('Informe a data de vencimento da compra a prazo','red');return;}
  const parcelar = formaPagamento==='prazo' && document.getElementById('compra-colar-parcelar-check').checked;
  const numParcelas = parcelar ? (parseInt(document.getElementById('compra-colar-num-parcelas').value)||2) : 1;
  // Paridade com o modo Manual (que já tem esse toggle): sem isso, Colar Nota sempre
  // sobrescrevia o custo médio da MP, mesmo quando o usuário queria manter o custo atual
  // (ex: nota com preço promocional pontual que não deve virar a nova referência de custo).
  const atualizaCusto = document.getElementById('compra-colar-atualiza-custo').value==='sim';

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
    // CMP: se a MP é nova (qtd:0 acima), a entrada define o custo inicial (atualizaCusto=false
    // não tem efeito nesse caso — mp.custo já é item.custoUn no momento da criação, acima); se
    // já existia, pondera com o que já estava em estoque (ver registrarEntradaMateria em
    // 00-core.js), a menos que o usuário tenha pedido pra manter o custo atual.
    registrarEntradaMateria(mp, item.qtd, atualizaCusto?item.custoUn:mp.custo);

    let parcelasItem = null;
    if(parcelar && numParcelas>=2){
      const valorParcela = parseFloat((item.total/numParcelas).toFixed(2));
      parcelasItem = [];
      for(let i=0;i<numParcelas;i++){
        const dataParc = document.getElementById(`compra-colar-parcela-data-${i}`)?.value || vencimento;
        const valParc = i===numParcelas-1 ? parseFloat((item.total-(valorParcela*(numParcelas-1))).toFixed(2)) : valorParcela;
        parcelasItem.push({vencimento:dataParc,valor:valParc});
      }
    }

    const novaCompra = {
      id:nextId('compras'), fornecedorId, materiaId:mp.id,
      qtd:item.qtd, custoUn:item.custoUn, total:item.total,
      pedido:parsed.pedido, pagamento, frete:0, taxa:0, data:parsed.data,
      formaPagamento,
      vencimento: formaPagamento==='prazo' ? (parcelasItem?parcelasItem[0].vencimento:vencimento) : null,
      parcelado: !!parcelasItem,
      parcelas: parcelasItem
    };
    state.compras.push(novaCompra);
    // só lança saída imediata no Financeiro se for À VISTA — "a prazo" só lança quando o
    // pagamento ao fornecedor for de fato registrado (mesma regra do modo Manual)
    if(formaPagamento!=='prazo'){
      state.financeiro.push({
        id:nextId('financeiro'), tipo:'saida',
        desc:`Compra ${mp.nome} — ${fornNome}${parsed.pedido?' Ped.'+parsed.pedido:''}`,
        valor:item.total, data:parsed.data, compraId:novaCompra.id
      });
    }
  });

  if(parsed.frete>0) state.financeiro.push({id:nextId('financeiro'),tipo:'saida',desc:`Frete — ${fornNome}${parsed.pedido?' Ped.'+parsed.pedido:''}`,valor:parsed.frete,data:parsed.data,categoria:'Frete'});
  if(parsed.taxa>0) state.financeiro.push({id:nextId('financeiro'),tipo:'saida',desc:`Taxa maquineta — ${fornNome}`,valor:parsed.taxa,data:parsed.data,categoria:'Taxa Maquineta'});

  showToast(`${parsed.itens.length} item(s) registrados com sucesso!${formaPagamento==='prazo'?' (a prazo, vence '+fmtDate(vencimento)+')':''}`,'green');
  marcarAlterado();
  closeModal('modal-compra');
  renderHistoricoCompras();
  renderFornecedores();
  renderEstoque();
  renderAlertaEstoquePage();
  renderDashboard();
  if(typeof renderPagar==='function') renderPagar();
  if(typeof atualizarAlertBells==='function') atualizarAlertBells();
}

// ============ COMPRA A PRAZO / PARCELADA — aba Colar Nota ============
// Espelha toggleCompraPrazo/toggleParcelasCompra/gerarParcelasCompra (aba Manual, abaixo)
// com IDs próprios, já que as duas abas do modal de Compra coexistem no mesmo DOM.
function toggleCompraPrazoColar(){
  const isPrazo=document.getElementById('compra-pagamento-colar').value==='A Prazo';
  document.getElementById('compra-colar-prazo-wrap').style.display=isPrazo?'block':'none';
  if(!isPrazo){
    document.getElementById('compra-colar-parcelar-check').checked=false;
    document.getElementById('compra-colar-parcelas-wrap').style.display='none';
  }
}
function toggleParcelasCompraColar(){
  const checked=document.getElementById('compra-colar-parcelar-check').checked;
  document.getElementById('compra-colar-parcelas-wrap').style.display=checked?'block':'none';
  if(checked) gerarParcelasCompraColar();
}
function gerarParcelasCompraColar(){
  const n=parseInt(document.getElementById('compra-colar-num-parcelas').value)||2;
  const baseDate=document.getElementById('compra-colar-vencimento').value||today();
  const el=document.getElementById('compra-colar-parcelas-lista');
  if(n<2||n>24){el.innerHTML='<p style="color:var(--red);font-size:12px">Entre 2 e 24 parcelas</p>';return;}
  const linhas=[];
  for(let i=0;i<n;i++){
    const d=new Date(baseDate+'T00:00:00');
    d.setMonth(d.getMonth()+i);
    const ds=d.toISOString().slice(0,10);
    linhas.push(`<div class="parcela-linha">
      <span class="parcela-num">${i+1}×</span>
      <input class="form-control" type="date" id="compra-colar-parcela-data-${i}" value="${ds}" style="max-width:160px;padding:7px 10px;font-size:13px">
      <span style="font-size:12px;color:var(--muted)">vencimento</span>
    </div>`);
  }
  el.innerHTML=linhas.join('');
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
    const opts = materiasOrdenadas().map(m => `<option value="${m.id}" ${m.id===item.mpId?'selected':''}>${escapeHtml(m.nome)} (${m.unidade})</option>`).join('');
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
  document.getElementById('compra-pagamento').value='Pix';
  document.getElementById('compra-vencimento').value='';
  document.getElementById('compra-prazo-wrap').style.display='none';
  document.getElementById('compra-parcelar-check').checked=false;
  document.getElementById('compra-parcelas-wrap').style.display='none';
  document.getElementById('compra-num-parcelas').value=2;
  document.getElementById('compra-parcelas-lista').innerHTML='';
  compraItensTemp=[];
  compraNotaParsed=null;
  renderCompraItensLista();
  // compra nova (não edição): botão de adicionar item disponível, nota de edição escondida
  // (ver editarCompra, que trava isso pro caso de edição de item único)
  const btnAdd=document.getElementById('btn-compra-add-item');
  const noteAdd=document.getElementById('compra-add-item-edit-note');
  if(btnAdd) btnAdd.style.display='';
  if(noteAdd) noteAdd.style.display='none';
  // popular fornecedor em ambas as abas
  const opts='<option value="">Selecione...</option>'+state.fornecedores.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
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
  document.getElementById('compra-pagamento-colar').value='Pix';
  document.getElementById('compra-colar-prazo-wrap').style.display='none';
  document.getElementById('compra-colar-vencimento').value='';
  document.getElementById('compra-colar-parcelar-check').checked=false;
  document.getElementById('compra-colar-parcelas-wrap').style.display='none';
  document.getElementById('compra-colar-num-parcelas').value=2;
  document.getElementById('compra-colar-parcelas-lista').innerHTML='';
  document.getElementById('compra-colar-atualiza-custo').value='sim';
  // mostrar aba manual por padrão
  showCompraTab('manual');
  document.getElementById('modal-compra').classList.add('open');
}
// ============ COMPRA A PRAZO / PARCELADA ============
function toggleCompraPrazo(){
  const isPrazo=document.getElementById('compra-pagamento').value==='A Prazo';
  document.getElementById('compra-prazo-wrap').style.display=isPrazo?'block':'none';
  if(!isPrazo){
    document.getElementById('compra-parcelar-check').checked=false;
    document.getElementById('compra-parcelas-wrap').style.display='none';
  }
}
function toggleParcelasCompra(){
  const checked=document.getElementById('compra-parcelar-check').checked;
  document.getElementById('compra-parcelas-wrap').style.display=checked?'block':'none';
  if(checked) gerarParcelasCompra();
}
function gerarParcelasCompra(){
  const n=parseInt(document.getElementById('compra-num-parcelas').value)||2;
  const baseDate=document.getElementById('compra-vencimento').value||today();
  const el=document.getElementById('compra-parcelas-lista');
  if(n<2||n>24){el.innerHTML='<p style="color:var(--red);font-size:12px">Entre 2 e 24 parcelas</p>';return;}
  const linhas=[];
  for(let i=0;i<n;i++){
    const d=new Date(baseDate+'T00:00:00');
    d.setMonth(d.getMonth()+i);
    const ds=d.toISOString().slice(0,10);
    linhas.push(`<div class="parcela-linha">
      <span class="parcela-num">${i+1}×</span>
      <input class="form-control" type="date" id="compra-parcela-data-${i}" value="${ds}" style="max-width:160px;padding:7px 10px;font-size:13px">
      <span style="font-size:12px;color:var(--muted)">vencimento</span>
    </div>`);
  }
  el.innerHTML=linhas.join('');
}
function registrarCompra(){
  const fornecedorId = parseInt(document.getElementById('compra-fornecedor').value)||null;
  const pedido = document.getElementById('compra-pedido').value.trim();
  const data = document.getElementById('compra-data').value||today();
  const pagamento = document.getElementById('compra-pagamento').value;
  const frete = parseFloat(document.getElementById('compra-frete').value)||0;
  const atualizaCusto = document.getElementById('compra-atualiza-custo').value==='sim';

  // "A Prazo" é uma forma de pagamento como as outras no mesmo dropdown — a diferença é que,
  // em vez de lançar a saída no Financeiro na hora, ela vira uma dívida com o fornecedor
  // (Contas a Pagar), do mesmo jeito que "Fiado" funciona em Vendas.
  const formaPagamento = pagamento==='A Prazo' ? 'prazo' : 'avista';
  const vencimento = formaPagamento==='prazo' ? (document.getElementById('compra-vencimento').value||null) : null;
  if(formaPagamento==='prazo' && !vencimento){showToast('Informe a data de vencimento da compra a prazo','red');return;}
  const parcelar = formaPagamento==='prazo' && document.getElementById('compra-parcelar-check').checked;
  const numParcelas = parcelar ? (parseInt(document.getElementById('compra-num-parcelas').value)||2) : 1;

  if(!fornecedorId){showToast('Selecione o fornecedor','red');return;}
  const itensValidos = compraItensTemp.filter(i=>i.mpId&&i.qtd>0&&i.custoUn>0);
  if(itensValidos.length===0){showToast('Adicione pelo menos 1 item com quantidade e custo','red');return;}

  const subtotal = itensValidos.reduce((s,i)=>s+i.qtd*i.custoUn, 0);
  const taxa = calcularTaxaMonetaria(subtotal);
  const total = subtotal + frete + taxa;
  const fornNome = getFornecedor(fornecedorId)?.nome||'Fornecedor';

  // EDIÇÃO: reverte por completo o registro original (estoque, custo médio, lançamento
  // financeiro) antes de criar a versão atualizada abaixo — sem isso, salvar uma edição
  // apenas ACRESCENTAVA um registro novo, deixando o antigo intacto (compra duplicada:
  // estoque/CMP contava a mercadoria duas vezes, e se fosse à vista, despesa em dobro no
  // Financeiro — se a prazo, dívida em dobro em Contas a Pagar).
  const editId = parseInt(document.getElementById('compra-edit-id').value)||null;
  let avisoImprecisaoEdicao = '';
  if(editId){
    const original = state.compras.find(c=>c.id===editId);
    if(original){
      const mpOriginal = state.materias.find(m=>m.id===original.materiaId);
      if(mpOriginal){
        if(materiaTeveConsumoApos(original.materiaId, original.data)){
          avisoImprecisaoEdicao = ' ⚠️ Custo médio recalculado de forma aproximada — já houve produção com esta matéria-prima depois da compra original.';
        }
        reverterEntradaMateria(mpOriginal, original.qtd, original.custoUn);
      }
      state.financeiro = state.financeiro.filter(f=>f.compraId!==editId);
      state.compras = state.compras.filter(c=>c.id!==editId);
    }
  }

  // Registrar uma compra por item (mantém compatibilidade) + atualiza estoque.
  // Cada item carrega seu próprio vencimento/parcelas — mesma granularidade que "Histórico de
  // Compras" já usa hoje (1 registro por item), sem precisar criar uma entidade "pedido" nova.
  itensValidos.forEach(item => {
    const mp = state.materias.find(m=>m.id===item.mpId);
    if(!mp) return;
    const itemTotal = item.qtd*item.custoUn;
    let parcelasItem = null;
    if(parcelar && numParcelas>=2){
      const valorParcela = parseFloat((itemTotal/numParcelas).toFixed(2));
      parcelasItem = [];
      for(let i=0;i<numParcelas;i++){
        const dataParc = document.getElementById(`compra-parcela-data-${i}`)?.value || vencimento;
        const valParc = i===numParcelas-1 ? parseFloat((itemTotal-(valorParcela*(numParcelas-1))).toFixed(2)) : valorParcela;
        parcelasItem.push({vencimento:dataParc,valor:valParc});
      }
    }
    const novaCompra = {
      id: nextId('compras'),
      fornecedorId, materiaId: item.mpId,
      qtd: item.qtd, custoUn: item.custoUn,
      total: itemTotal,
      pedido, pagamento, frete: frete/itensValidos.length,
      taxa: taxa/itensValidos.length,
      data,
      formaPagamento,
      vencimento: formaPagamento==='prazo' ? (parcelasItem?parcelasItem[0].vencimento:vencimento) : null,
      parcelado: !!parcelasItem,
      parcelas: parcelasItem
    };
    state.compras.push(novaCompra);
    // custo médio ponderado (CMP): a compra sempre soma quantidade real; se "atualizar custo"
    // estiver desmarcado, ela entra ao custo médio ATUAL (não muda o CMP) em vez de ser
    // ignorada por completo — senão a quantidade cresceria sem o valor correspondente,
    // distorcendo o custo médio pra baixo.
    registrarEntradaMateria(mp, item.qtd, atualizaCusto?item.custoUn:mp.custo);
    // só lança saída no Financeiro na hora se for À VISTA — "a prazo" só lança quando o
    // pagamento ao fornecedor for de fato registrado (ver registrarPagamentoFornecedor)
    if(formaPagamento!=='prazo'){
      state.financeiro.push({
        id: nextId('financeiro'), tipo:'saida',
        desc:`Compra ${mp.nome} — ${fornNome}${pedido?' Ped.'+pedido:''}`,
        valor: itemTotal, data, compraId: novaCompra.id
      });
    }
  });
  // Frete e taxa continuam sendo lançados na hora, mesmo numa compra a prazo — na prática são
  // valores tipicamente pagos na entrega/no cartão, separados do prazo negociado com o
  // fornecedor pela mercadoria em si.
  if(frete>0) state.financeiro.push({id:nextId('financeiro'),tipo:'saida',desc:`Frete — ${fornNome}${pedido?' Ped.'+pedido:''}`,valor:frete,data,categoria:'Frete'});
  if(taxa>0) state.financeiro.push({id:nextId('financeiro'),tipo:'saida',desc:`Taxa maquineta — ${fornNome}`,valor:taxa,data,categoria:'Taxa Maquineta'});

  showToast((formaPagamento==='prazo'
    ? `Compra a prazo ${editId?'atualizada':'registrada'}! ${itensValidos.length} item(s) — ${fmt(total)} (vence ${fmtDate(vencimento)})`
    : `Compra ${editId?'atualizada':'registrada'}! ${itensValidos.length} item(s) — ${fmt(total)}`)+avisoImprecisaoEdicao,'green');
  marcarAlterado();
  closeModal('modal-compra');
  renderHistoricoCompras();
  renderFornecedores();
  renderEstoque();
  renderAlertaEstoquePage();
  renderHistoricoPreco();
  renderDashboard();
  if(typeof renderPagar==='function') renderPagar();
  if(typeof atualizarAlertBells==='function') atualizarAlertBells();
}
function editarCompra(id){
  const c = state.compras.find(c=>c.id===id);
  if(!c) return;
  abrirRegistrarCompra(c.fornecedorId);
  document.getElementById('compra-data').value = c.data;
  document.getElementById('compra-pedido').value = c.pedido||'';
  document.getElementById('compra-edit-id').value = id;
  compraItensTemp = [{mpId:c.materiaId, qtd:c.qtd, custoUn:c.custoUn}];
  renderCompraItensLista();
  // Cada state.compras[] é 1 item por design (ver comentário em registrarCompra: "Registrar
  // uma compra por item"). Deixar adicionar item durante a edição fazia registrarCompra()
  // reverter esse 1 registro original e criar N novos com IDs novos — um "split" silencioso
  // que ninguém pedia. Trava o botão aqui; pra registrar mais itens, é uma compra nova.
  const btnAdd=document.getElementById('btn-compra-add-item');
  const noteAdd=document.getElementById('compra-add-item-edit-note');
  if(btnAdd) btnAdd.style.display='none';
  if(noteAdd) noteAdd.style.display='block';
  // Restaura forma de pagamento e, se era a prazo, vencimento/parcelas — sem isso, salvar a
  // edição resetaria a compra pra "à vista" (o padrão do formulário em branco) e apagaria a
  // dívida com o fornecedor sem avisar.
  document.getElementById('compra-pagamento').value = c.formaPagamento==='prazo' ? 'A Prazo' : (c.pagamento||'Pix');
  toggleCompraPrazo();
  if(c.formaPagamento==='prazo'){
    document.getElementById('compra-vencimento').value = c.vencimento||'';
    if(c.parcelado && Array.isArray(c.parcelas) && c.parcelas.length>0){
      document.getElementById('compra-parcelar-check').checked=true;
      document.getElementById('compra-num-parcelas').value=c.parcelas.length;
      toggleParcelasCompra(); // gera o cronograma padrão primeiro (datas mensais)...
      // ...depois sobrescreve com as datas que já estavam combinadas, pra não perder o
      // vencimento real só porque reabriu a edição
      c.parcelas.forEach((p,i)=>{
        const inp=document.getElementById(`compra-parcela-data-${i}`);
        if(inp) inp.value=p.vencimento;
      });
    }
  }
}
function excluirCompra(id){
  const c=state.compras.find(c=>c.id===id);
  if(!c) return;
  const mp=state.materias.find(m=>m.id===c.materiaId);
  const avisoImprecisao = (mp && materiaTeveConsumoApos(c.materiaId,c.data))
    ? ' ⚠️ Já houve produção usando esta matéria-prima depois desta compra — o custo médio recalculado é uma aproximação; revise manualmente se o valor parecer estranho.'
    : '';
  confirmarAcao(`Excluir esta compra? O estoque de "${mp?mp.nome:'MP'}" será revertido.${avisoImprecisao}`,()=>{
    // Reverter estoque da MP (quantidade e custo médio — ver reverterEntradaMateria em 00-core.js)
    if(mp) reverterEntradaMateria(mp, c.qtd, c.custoUn);
    // Remover do financeiro (só existe se a compra era à vista — "a prazo" nunca lançou nada aqui)
    state.financeiro=state.financeiro.filter(f=>f.compraId!==id);
    // Remover a compra (se era "a prazo", isso também reduz o saldo devedor do fornecedor —
    // getSaldoFornecedor recalcula na hora, não precisa de nenhuma limpeza extra, mesmo padrão
    // de excluirVenda com o saldo do cliente)
    state.compras=state.compras.filter(c=>c.id!==id);
    marcarAlterado();
    showToast('Compra excluída e estoque revertido','green');
    renderHistoricoCompras();
    renderEstoque();
    renderAlertaEstoquePage();
    renderDashboard();
    if(typeof renderPagar==='function') renderPagar();
  });
}

// ============ CONTAS A PAGAR (FORNECEDOR) ============
// Espelha 1:1 Contas a Receber (04-vendas.js: renderReceber/abrirPagamento/registrarPagamento).
function renderPagar(){
  const el=document.getElementById('pagar-lista');
  if(!el) return;
  const fComDivida=state.fornecedores.map(f=>({...f,saldo:getSaldoFornecedor(f.id)})).filter(f=>f.saldo>0).sort((a,b)=>b.saldo-a.saldo);
  if(fComDivida.length===0){
    el.innerHTML=`<div style="text-align:center;padding:60px 20px"><div style="font-size:50px;margin-bottom:16px">🎉</div><h3 style="color:var(--green)">Tudo em dia!</h3><p style="color:var(--muted);margin-top:8px">Nenhum fornecedor com saldo em aberto.</p></div>`;return;
  }
  const hoje=today();
  const mapaPagar=getMapaSituacaoPagar();
  el.innerHTML=fComDivida.map(f=>{
    const comprasPrazo=state.compras.filter(c=>c.fornecedorId===f.id&&c.formaPagamento==='prazo').sort((a,b)=>b.data.localeCompare(a.data));
    const pags=state.pagamentosFornecedor.filter(p=>p.fornecedorId===f.id).sort((a,b)=>b.data.localeCompare(a.data));
    const hist=[
      ...comprasPrazo.map(c=>({tipo:'compra',data:c.data,desc:`${getMateria(c.materiaId).nome} ×${c.qtd}`,val:c.total})),
      ...pags.map(p=>({tipo:'pag',data:p.data,desc:'Pago ('+p.forma+')',val:p.valor})),
    ].sort((a,b)=>b.data.localeCompare(a.data));
    // próximo vencimento em aberto, pra dar destaque visual (mesma ideia do vencBadge em Vendas)
    const proximaPendente=comprasPrazo.map(c=>situacaoCompra(c,mapaPagar)).filter(s=>s.vencimentoPendente).sort((a,b)=>(a.vencimentoPendente||'').localeCompare(b.vencimentoPendente||''))[0];
    return`<div class="client-debt-hero" style="background:linear-gradient(135deg,#8E44AD,#6C3483)">
      <div><div class="name">🚚 ${escapeHtml(f.nome)}</div><div class="phone">📞 ${escapeHtml(f.tel||'—')}</div></div>
      <div style="text-align:right">
        <div class="amount">${fmt(f.saldo)}</div>
        <div class="amount-label">saldo em aberto${proximaPendente?' · '+vencBadge(proximaPendente.vencimentoPendente,hoje):''}</div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
          <button class="btn btn-sm" style="background:#fff;color:#8E44AD;font-weight:700" onclick="abrirPagamentoFornecedor(${f.id})">💰 Pagar</button>
        </div>
      </div>
    </div>
    <div class="table-card" style="margin-bottom:24px">
      <div style="padding:16px 20px 8px"><strong style="font-size:13px;color:var(--muted)">HISTÓRICO</strong></div>
      <div class="table-scroll"><table><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead>
      <tbody>${hist.map(h=>`<tr>
        <td>${fmtDate(h.data)}</td><td>${escapeHtml(h.desc)}</td>
        <td><span class="badge ${h.tipo==='compra'?'badge-blue':'badge-green'}">${h.tipo==='compra'?'Compra':'Pagamento'}</span></td>
        <td class="${h.tipo==='compra'?'debt-amount':'debt-zero'}">${h.tipo==='compra'?'-':'+'} ${fmt(h.val)}</td>
      </tr>`).join('')}</tbody></table></div>
    </div>`;
  }).join('');
}
function abrirPagamentoFornecedor(fornecedorId){
  const f=getFornecedor(fornecedorId);
  const saldo=getSaldoFornecedor(fornecedorId);
  document.getElementById('pagf-fornecedor-id').value=fornecedorId;
  document.getElementById('pagf-saldo-atual').textContent=fmt(saldo);
  document.getElementById('pagf-fornecedor-nome-label').textContent=f?f.nome:'';
  document.getElementById('pagf-valor').value='';
  document.getElementById('pagf-restante').value='';
  document.getElementById('pagf-data').value=today();
  document.getElementById('modal-pagamento-fornecedor').classList.add('open');
}
function calcRestanteFornecedor(){
  const saldo=getSaldoFornecedor(parseInt(document.getElementById('pagf-fornecedor-id').value));
  const pago=parseFloat(document.getElementById('pagf-valor').value)||0;
  document.getElementById('pagf-restante').value=fmt(Math.max(0,saldo-pago));
}
function registrarPagamentoFornecedor(){
  const fornecedorId=parseInt(document.getElementById('pagf-fornecedor-id').value);
  const valor=parseFloat(document.getElementById('pagf-valor').value);
  const forma=document.getElementById('pagf-forma').value;
  const obs=document.getElementById('pagf-obs').value;
  const data=document.getElementById('pagf-data').value||today();
  const saldo=getSaldoFornecedor(fornecedorId);
  if(!valor||valor<=0){showToast('Informe o valor pago','red');return;}
  if(valor>saldo){showToast('Valor maior que o saldo em aberto','red');return;}
  const pagId=nextId('pagamentosFornecedor');
  state.pagamentosFornecedor.push({id:pagId,fornecedorId,valor,forma,obs,data});
  // pagamentoFornecedorId liga este lançamento ao pagamento acima — mesmo padrão do
  // pagamentoId de cliente (ver excluirLancamento em 09-financeiro-relatorios.js)
  state.financeiro.push({id:nextId('financeiro'),tipo:'saida',desc:`Pagamento a fornecedor — ${getFornecedor(fornecedorId)?.nome||'?'}`,valor,data,pagamentoFornecedorId:pagId});
  marcarAlterado();
  showToast(`Pagamento de ${fmt(valor)} registrado!`,'green');
  closeModal('modal-pagamento-fornecedor');
  const pg=document.querySelector('.page.active');
  if(pg) render(pg.id.replace('page-',''));
}

function renderHistoricoCompras(){
  // populate filters
  const selF=document.getElementById('hist-compras-fornecedor-filter');
  const selM=document.getElementById('hist-compras-mp-filter');
  if(!selF||!selM) return;
  const filtF=selF.value;
  const filtM=selM.value;
  selF.innerHTML='<option value="">Todos os fornecedores</option>'+state.fornecedores.map(f=>`<option value="${f.id}" ${filtF==f.id?'selected':''}>${escapeHtml(f.nome)}</option>`).join('');
  const mpsUsadas=[...new Set(state.compras.map(c=>c.materiaId))];
  selM.innerHTML='<option value="">Todas as matérias</option>'+mpsUsadas.map(mid=>{const m=getMateria(mid);return`<option value="${mid}" ${filtM==mid?'selected':''}>${escapeHtml(m.nome)}</option>`;}).join('');

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
      <td data-label="Fornecedor"><strong>${forn?escapeHtml(forn.nome):'—'}</strong></td>
      <td data-label="Matéria-Prima">${escapeHtml(mp.nome)}</td>
      <td data-label="Qtd"><strong>${c.qtd} ${mp.unidade}</strong></td>
      <td data-label="Valor Total"><strong style="color:var(--navy)">${fmt(c.total)}</strong></td>
      <td data-label="Custo/un" style="font-size:12px;color:var(--muted)">${fmt(c.custoUn)}/${mp.unidade}</td>
      <td data-label="Obs" style="font-size:12px;color:var(--muted)">${escapeHtml(c.obs||'—')}</td>
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
    const materiasTxt=materiasVinc.length?materiasVinc.map(m=>`<span class="variante-tag">${escapeHtml(m.nome)}</span>`).join(''):'<span style="color:var(--muted);font-size:12px">—</span>';
    return `<tr>
      <td data-label="Nome"><strong>${escapeHtml(f.nome)}</strong>${f.obs?`<br><span style="font-size:11px;color:var(--muted)">${escapeHtml(f.obs)}</span>`:''}</td>
      <td data-label="Contato">${escapeHtml(f.contato||'-')}</td>
      <td data-label="Telefone">${escapeHtml(f.tel||'-')}</td>
      <td data-label="Fornece" style="font-size:12px">${escapeHtml(f.categoria||'-')}</td>
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
// Bloqueia exclusão com saldo em aberto: excluir o fornecedor não apaga a dívida em
// state.compras (formaPagamento==='prazo'), só deixa ela órfã — some do Dashboard, de
// Contas a Pagar e do sino de alertas, mas o registro (e o valor devido de verdade)
// continua existindo, agora sem como ser pago ou consultado. Mesma classe de problema que
// excluirCliente/excluirProduto já tratam com arquivamento; aqui optei por bloqueio simples
// (sem novo campo de schema) já que "fornecedor arquivado com dívida ativa" é caso raro.
function excluirFornecedor(id){
  const f=state.fornecedores.find(f=>f.id===id);
  if(!f) return;
  const saldoAberto=getSaldoFornecedor(id);
  if(saldoAberto>0.009){
    showToast(`Não é possível excluir: há ${fmt(saldoAberto)} em aberto (Contas a Pagar). Quite o saldo antes.`,'red');
    return;
  }
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
    const opts=materiasOrdenadas().map(m=>`<option value="${m.id}" ${m.id===mp.mpId?'selected':''}>${escapeHtml(m.nome)} (${m.unidade})</option>`).join('');
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
      variantes:[],
      ativo:true
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
        <span class="form-control" style="flex:2;background:#F8F9FA;color:var(--muted)">${escapeHtml(v.nome)}</span>
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
// Mesma lógica de exclusão inteligente usada em excluirCliente (03-clientes.js): se o
// produto já tem venda ou produção registrada, apagar de verdade quebraria/distorceria
// relatórios antigos (histórico de vendas ficaria com item "?", custo/margem de meses
// fechados mudariam). Nesse caso arquivamos em vez de remover.
function excluirProduto(id){
  const p=state.produtos.find(p=>p.id===id);
  if(!p) return;
  const temHistorico=state.vendas.some(v=>(v.itens||[]).some(it=>it.produtoId===id))||state.producoes.some(pr=>pr.produtoId===id);
  if(temHistorico){
    confirmarAcao('Este produto já tem vendas ou produções registradas — excluir de verdade apagaria esse histórico dos relatórios. Em vez disso ele será arquivado: some do estoque ativo e não pode mais ser vendido/produzido, mas o histórico continua intacto (e você pode reativá-lo a qualquer momento). Continuar?',()=>{
      p.ativo=false;
      marcarAlterado();salvarDados();
      showToast('Produto arquivado ✓','green');renderEstoque();renderAlertaEstoquePage();
    });
    return;
  }
  confirmarAcao('Excluir este produto acabado? Ele não tem nenhuma venda ou produção registrada.',()=>{
    state.produtos=state.produtos.filter(p=>p.id!==id);
    marcarAlterado();salvarDados();
    showToast('Produto excluído','green');renderEstoque();renderAlertaEstoquePage();
  });
}
function reativarProduto(id){
  const p=state.produtos.find(p=>p.id===id);
  if(!p) return;
  p.ativo=true;
  marcarAlterado();salvarDados();
  showToast('Produto reativado ✓','green');renderEstoque();
}
function atualizarListaCategorias(){}


