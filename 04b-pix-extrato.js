// ============ PIX, EXTRATO DO CLIENTE E ENCARGOS DE ATRASO (v5.36 / v5.37) ============
// Dados em state.pix e state.encargos (migrações 15 e 16). A chave Pix é digitada pelo usuário
// e fica só no aparelho e no backup — nunca no código.

const PIX_PADRAO={chave:'',tipo:'celular',nome:'',cidade:''};
// Carência 0 = a cobrança vale a partir do 1º dia após o vencimento (dias contam desde o vencimento).
const ENCARGOS_PADRAO={ativo:false,multa:5,juros:3,carencia:0,pixComEncargos:false};
function getPixCfg(){return Object.assign({},PIX_PADRAO,state.pix||{});}
function encargosCfg(){return Object.assign({},ENCARGOS_PADRAO,state.encargos||{});}
const round2=v=>Math.round((Number(v)||0)*100)/100;

// ───────── Pix "copia e cola" (BR Code estático) ─────────
function pixNormalizarCelular(raw){
  let d=String(raw||'').replace(/\D/g,'');
  if(d.startsWith('55')&&(d.length===12||d.length===13)) d=d.slice(2);
  if(d.length<10||d.length>11) return '';
  return '+55'+d;
}
function pixSemAcento(s,max){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 ]/g,'').replace(/\s+/g,' ').trim().toUpperCase().slice(0,max);
}
function pixCrc16(str){
  let crc=0xFFFF;
  for(let i=0;i<str.length;i++){
    crc^=str.charCodeAt(i)<<8;
    for(let j=0;j<8;j++){crc=(crc&0x8000)?((crc<<1)^0x1021):(crc<<1);crc&=0xFFFF;}
  }
  return crc.toString(16).toUpperCase().padStart(4,'0');
}
function pixCampo(id,val){val=String(val);return id+String(val.length).padStart(2,'0')+val;}
function pixDisponivel(){
  const p=getPixCfg();
  return !!(p.chave&&pixSemAcento(p.nome,25)&&pixSemAcento(p.cidade,15));
}
function pixValorTxt(v){return (Math.round((Number(v)||0)*100)/100).toFixed(2);} // sempre com ponto e 2 casas
function pixPayload(valor){
  const p=getPixCfg();
  const conta=pixCampo('00','br.gov.bcb.pix')+pixCampo('01',p.chave);
  let s=pixCampo('00','01')+pixCampo('01','11')+pixCampo('26',conta)+pixCampo('52','0000')+pixCampo('53','986');
  if(valor>0.009) s+=pixCampo('54',pixValorTxt(valor));
  s+=pixCampo('58','BR')+pixCampo('59',pixSemAcento(p.nome,25))+pixCampo('60',pixSemAcento(p.cidade,15))+pixCampo('62',pixCampo('05','***'));
  s+='6304';
  return s+pixCrc16(s);
}
function pixChaveExibicao(){
  const d=String(getPixCfg().chave||'').replace(/\D/g,'').replace(/^55/,'');
  if(d.length===11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if(d.length===10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return getPixCfg().chave;
}
function pixBloco(valor){
  if(!pixDisponivel()) return '';
  return `💳 *Pix* (celular): ${pixChaveExibicao()}${valor>0.009?`\nValor: ${fmt(valor)}`:''}\n\nPix copia e cola:\n${pixPayload(valor)}`;
}
function pixValorCobranca(clienteId){
  const saldo=getSaldoCliente(clienteId);
  return round2(saldo+(encargosCfg().pixComEncargos?calcEncargosCliente(clienteId).total:0));
}
function pixBlocoCobranca(clienteId){
  const saldo=getSaldoCliente(clienteId);
  if(saldo<=0.009||!pixDisponivel()) return '';
  return '\n\n'+pixBloco(pixValorCobranca(clienteId));
}
function copiarTexto(txt,ok){
  const fim=()=>showToast(ok||'Copiado!','green');
  const fallback=()=>{
    try{
      const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);fim();
    }catch(e){showToast('Não consegui copiar','red');}
  };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(fim).catch(fallback);
  else fallback();
}
function copiarPixValor(valor){
  if(!pixDisponivel()){showToast('Configure o Pix em Backup e manutenção → Configurar Pix','red');return;}
  copiarTexto(pixPayload(valor),'Pix copia e cola copiado!');
}
function copiarPixCliente(clienteId){
  if(getSaldoCliente(clienteId)<=0.009){showToast('Cliente sem saldo devedor','red');return;}
  copiarPixValor(pixValorCobranca(clienteId));
}
function enviarWhatsOuCopiar(c,msg){
  const tel=(c.tel||'').replace(/\D/g,'');
  if(tel) window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`,'_blank');
  else{copiarTexto(msg,'Cliente sem telefone — texto copiado');}
}

// ───────── Configurar Pix ─────────
function abrirConfigPix(){
  const p=getPixCfg();
  const d=String(p.chave||'').replace(/\D/g,'').replace(/^55/,'');
  document.getElementById('pix-celular').value=d;
  document.getElementById('pix-nome').value=p.nome||'';
  document.getElementById('pix-cidade').value=p.cidade||'';
  document.getElementById('modal-config-pix').classList.add('open');
}
function salvarConfigPix(){
  const nome=document.getElementById('pix-nome').value.trim();
  const cidade=document.getElementById('pix-cidade').value.trim();
  const bruto=document.getElementById('pix-celular').value.trim();
  if(!bruto&&!nome&&!cidade){ // tudo vazio = remover Pix
    state.pix={...PIX_PADRAO};marcarAlterado();closeModal('modal-config-pix');showToast('Pix removido','green');return;
  }
  const chave=pixNormalizarCelular(bruto);
  if(!chave){showToast('Celular inválido — digite DDD + número','red');return;}
  if(!pixSemAcento(nome,25)){showToast('Informe o nome do titular','red');return;}
  if(!pixSemAcento(cidade,15)){showToast('Informe a cidade','red');return;}
  state.pix={chave,tipo:'celular',nome,cidade};
  marcarAlterado();
  closeModal('modal-config-pix');showToast('Pix salvo!','green');
}

// ───────── Encargos de atraso (informativos) ─────────
function diasEntre(dataIni,dataFim){
  const a=String(dataIni).split('-').map(Number),b=String(dataFim).split('-').map(Number);
  return Math.round((Date.UTC(b[0],b[1]-1,b[2])-Date.UTC(a[0],a[1]-1,a[2]))/86400000);
}
// Encargo de UMA unidade (venda fiado ou parcela) do FIFO. Retorna null se não há encargo.
function encargoDaUnidade(u,hoje,cfg){
  cfg=cfg||encargosCfg();
  if(!cfg.ativo||!u.vencimento||u.status==='pago') return null;
  const base=u.valorRestante;
  if(!(base>0.009)) return null;
  const dias=diasEntre(u.vencimento,hoje||today());
  if(dias<=0||dias<=cfg.carencia) return null;
  const multa=round2(base*(cfg.multa/100));
  const juros=round2(base*(cfg.juros/100)*(dias/30)); // juros simples, proporcional aos dias
  return {vencimento:u.vencimento,base,dias,multa,juros,total:round2(multa+juros),parcelaNum:u.parcelaNum,parcelaTotal:u.parcelaTotal};
}
function calcEncargosCliente(clienteId,hoje){
  const cfg=encargosCfg();
  const r={total:0,multa:0,juros:0,itens:[]};
  if(!cfg.ativo) return r;
  hoje=hoje||today();
  getUnidadesFiadoFlat().filter(u=>u.clienteId==clienteId).forEach(u=>{
    const e=encargoDaUnidade(u,hoje,cfg);
    if(!e) return;
    r.itens.push(e);r.multa+=e.multa;r.juros+=e.juros;
  });
  r.multa=round2(r.multa);r.juros=round2(r.juros);r.total=round2(r.multa+r.juros);
  return r;
}
function abrirConfigEncargos(){
  const c=encargosCfg();
  document.getElementById('enc-ativo').checked=!!c.ativo;
  document.getElementById('enc-multa').value=c.multa;
  document.getElementById('enc-juros').value=c.juros;
  document.getElementById('enc-carencia').value=c.carencia;
  document.getElementById('enc-pix-total').checked=!!c.pixComEncargos;
  document.getElementById('modal-config-encargos').classList.add('open');
}
function salvarConfigEncargos(){
  const multa=parseFloat(document.getElementById('enc-multa').value);
  const juros=parseFloat(document.getElementById('enc-juros').value);
  const carencia=parseInt(document.getElementById('enc-carencia').value);
  if(!(multa>=0&&multa<=100)){showToast('Multa deve ficar entre 0 e 100%','red');return;}
  if(!(juros>=0&&juros<=100)){showToast('Juros deve ficar entre 0 e 100% ao mês','red');return;}
  if(!(carencia>=0)){showToast('Carência deve ser 0 ou mais dias','red');return;}
  state.encargos={ativo:document.getElementById('enc-ativo').checked,multa,juros,carencia,pixComEncargos:document.getElementById('enc-pix-total').checked};
  marcarAlterado();
  closeModal('modal-config-encargos');showToast('Encargos salvos','green');
  const pg=document.querySelector('.page.active');
  if(pg) render(pg.id.replace('page-',''));
}

// ───────── Extrato do cliente ─────────
// Junta vendas fiado + pagamentos por data, com saldo corrido. Mesmos filtros do getSaldoCliente,
// então o saldo final bate com ele.
function getExtratoCliente(clienteId){
  const mov=[];
  state.vendas.filter(v=>v.clienteId==clienteId&&v.forma=='fiado').forEach(v=>mov.push({
    data:v.data||'',ord:0,id:v.id,tipo:'venda',
    desc:(v.itens||[]).map(it=>nomeItemVenda(it)+' ×'+it.qtd).join(', ')||'Venda',
    debito:v.total||0,credito:0
  }));
  state.pagamentos.filter(p=>p.clienteId==clienteId).forEach(p=>mov.push({
    data:p.data||'',ord:1,id:p.id,tipo:'pagamento',forma:p.forma||'',
    desc:'Pagou ('+(p.forma||'—')+')'+(p.obs?' — '+p.obs:''),
    debito:0,credito:p.valor||0
  }));
  // renegociações (v5.42): crédito da dívida antiga + débito da nova
  (state.renegociacoes||[]).filter(r=>r.clienteId==clienteId).forEach(r=>{
    mov.push({data:r.data||'',ord:2,id:r.id,tipo:'renegociacao',desc:'Renegociação #'+r.id+' — dívida anterior substituída',debito:0,credito:r.base||0});
    mov.push({data:r.data||'',ord:3,id:r.id,tipo:'renegociacao',desc:'Renegociação #'+r.id+' — '+(r.parcelas||[]).length+' parcela(s)'+(r.modoEnc==='incluir'?' (com '+fmt(r.encargos)+' de encargos)':(r.encargos>0?' (encargos perdoados)':'')),debito:r.total||0,credito:0});
  });
  mov.sort((a,b)=>a.data.localeCompare(b.data)||a.ord-b.ord||a.id-b.id);
  let s=0;
  mov.forEach(m=>{s+=m.debito-m.credito;m.saldo=round2(s);});
  const saldoFinal=Math.max(0,round2(s));
  if(Math.abs(saldoFinal-getSaldoCliente(clienteId))>0.005) console.warn('[GestãoPRO] Extrato diverge do saldo do cliente',clienteId,saldoFinal,getSaldoCliente(clienteId));
  return {linhas:mov,saldoFinal};
}
let extratoClienteIdAtual=null;
function abrirExtrato(clienteId){
  const c=getCliente(clienteId);
  extratoClienteIdAtual=clienteId;
  const ex=getExtratoCliente(clienteId);
  const enc=calcEncargosCliente(clienteId);
  const mostrarPix=ex.saldoFinal>0.009&&pixDisponivel();
  document.getElementById('extrato-conteudo').innerHTML=`
    <div style="margin-bottom:10px"><strong>${escapeHtml(c.nome)}</strong> <span style="font-size:12px;color:var(--muted)">${fmtClienteNum(clienteId)}</span><div style="font-size:12px;color:var(--muted)">Extrato em ${fmtDate(today())}</div></div>
    ${ex.linhas.length===0?'<div style="text-align:center;color:var(--muted);padding:20px">Sem vendas fiado nem pagamentos.</div>':`
    <div class="table-scroll"><table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Saldo</th></tr></thead><tbody>
    ${ex.linhas.map(m=>`<tr><td>${fmtDate(m.data)}</td><td style="font-size:12px">${escapeHtml(m.desc)}</td>
      <td class="${m.debito>0?'debt-amount':'debt-zero'}">${m.debito>0?'+':'−'} ${fmt(m.debito>0?m.debito:m.credito)}</td>
      <td><strong>${fmt(Math.max(0,m.saldo))}</strong></td></tr>`).join('')}
    </tbody></table></div>`}
    <div style="display:flex;justify-content:space-between;font-weight:800;font-size:15px;margin-top:12px"><span>Saldo final</span><span style="color:${ex.saldoFinal>0?'var(--red)':'var(--green)'}">${fmt(ex.saldoFinal)}</span></div>
    ${enc.total>0?`<div style="margin-top:8px;font-size:12px;color:var(--muted)">Encargos de atraso (informativo, fora do saldo): <strong>${fmt(enc.total)}</strong> — multa ${fmt(enc.multa)} + juros ${fmt(enc.juros)}</div>`:''}
    ${mostrarPix?`<div style="margin-top:12px;padding:10px;border:1px dashed var(--border);border-radius:8px;font-size:12px"><strong>Pix (celular):</strong> ${escapeHtml(pixChaveExibicao())}<br><span style="color:var(--muted)">Valor do Pix: ${fmt(pixValorCobranca(clienteId))}</span></div>`:''}`;
  document.getElementById('extrato-btn-pix').style.display=mostrarPix?'':'none';
  document.getElementById('modal-extrato').classList.add('open');
  if(typeof lucide!=='undefined') lucide.createIcons();
}
function gerarTextoExtrato(clienteId){
  const c=getCliente(clienteId);
  const ex=getExtratoCliente(clienteId);
  const MAX=15;
  const recorte=ex.linhas.length>MAX?ex.linhas.slice(-MAX):ex.linhas;
  const saldoAnt=ex.linhas.length>MAX?Math.max(0,ex.linhas[ex.linhas.length-MAX-1].saldo):null;
  const linhas=recorte.map(m=>m.tipo==='venda'
    ?`${fmtDate(m.data)} — Compra: ${m.desc} — +${fmt(m.debito)} (saldo ${fmt(Math.max(0,m.saldo))})`
    :m.tipo==='renegociacao'?`${fmtDate(m.data)} — ${m.desc} — ${m.debito>0?'+'+fmt(m.debito):'−'+fmt(m.credito)} (saldo ${fmt(Math.max(0,m.saldo))})`
    :`${fmtDate(m.data)} — Pagamento${m.forma?' ('+m.forma+')':''} — −${fmt(m.credito)} (saldo ${fmt(Math.max(0,m.saldo))})`).join('\n');
  const enc=calcEncargosCliente(clienteId);
  const encTxt=enc.total>0?`\n\n⚠️ Encargos de atraso (fora do saldo): ${fmt(enc.total)}\n(multa ${fmt(enc.multa)} + juros ${fmt(enc.juros)})\nTotal com encargos: ${fmt(ex.saldoFinal+enc.total)}`:'';
  const pixTxt=ex.saldoFinal>0.009&&pixDisponivel()?'\n\n'+pixBloco(pixValorCobranca(clienteId)):'';
  return `📄 *Extrato — ${c.nome}*\nEmitido em ${fmtDate(today())}\n\n${saldoAnt!=null?`Saldo anterior: ${fmt(saldoAnt)}\n(últimas ${MAX} movimentações)\n\n`:''}${linhas||'Sem movimentações.'}\n\n*Saldo final: ${fmt(ex.saldoFinal)}*${encTxt}${pixTxt}\n\nQualquer dúvida estou à disposição! 😊`;
}
function enviarExtratoWhatsapp(){
  if(extratoClienteIdAtual==null) return;
  enviarWhatsOuCopiar(getCliente(extratoClienteIdAtual),gerarTextoExtrato(extratoClienteIdAtual));
}
function copiarPixExtrato(){ if(extratoClienteIdAtual!=null) copiarPixCliente(extratoClienteIdAtual); }

// ───────── Pix no recibo (só venda fiado ainda em aberto) ─────────
function pixDadosRecibo(v,sit){
  if(v.forma!=='fiado'||sit.status==='pago'||!pixDisponivel()) return null;
  const valor=round2(sit.valorRestante>0.009?sit.valorRestante:v.total);
  return {valor,texto:pixBloco(valor)};
}
function reciboPixHtml(v,sit){
  const d=pixDadosRecibo(v,sit);
  if(!d) return '';
  return `<hr style="border:none;border-top:1px dashed var(--border);margin:10px 0">
    <div style="font-size:12px"><strong>Pix (celular):</strong> ${escapeHtml(pixChaveExibicao())}<br>Valor: ${fmt(d.valor)}</div>
    <div style="font-size:10px;word-break:break-all;color:var(--muted);margin-top:4px">${escapeHtml(pixPayload(d.valor))}</div>
    <button class="btn btn-outline btn-sm" data-noprint="1" style="margin-top:6px" onclick="copiarPixValor(${d.valor})">Copiar Pix</button>`;
}

// ───────── Comprovante de pagamento (v5.38) ─────────
function gerarTextoComprovante(i){
  const c=getCliente(i.clienteId);
  const totalRecebido=round2(i.valor+(i.encargo||0));
  return `🧾 *Comprovante de pagamento — GestãoPRO*\n\nCliente: ${c.nome}\nData: ${fmtDate(i.data)}\nForma: ${i.forma}\nValor pago: ${fmt(i.valor)}${i.encargo>0?`\nJuros/multa: ${fmt(i.encargo)}\n*Total recebido: ${fmt(totalRecebido)}*`:''}\n\n${i.saldoRestante>0.009?`*Saldo restante: ${fmt(i.saldoRestante)}*`:'✅ *Saldo quitado!*'}\n\nObrigado! 😊`;
}
function perguntarComprovante(i){
  confirmarAcao(`Pagamento registrado. Enviar o comprovante de ${fmt(i.valor)} para ${getCliente(i.clienteId).nome} por WhatsApp?`,
    ()=>enviarWhatsOuCopiar(getCliente(i.clienteId),gerarTextoComprovante(i)));
}

// ───────── Cobrança do dia (v5.38) ─────────
// Vencidos + vencendo hoje, um cliente por linha. A data da última cobrança fica em
// cliente.ultimaCobranca (campo opcional, sem migração) e é gravada ao tocar no WhatsApp.
let cobrancaOcultarHoje=false;
function registrarCobranca(clienteId){
  const c=state.clientes.find(x=>x.id==clienteId);
  if(!c) return;
  c.ultimaCobranca=today();
  marcarAlterado();
  const pg=document.querySelector('.page.active');
  if(pg&&pg.id==='page-cobranca') renderCobrancaDia();
}
function textoUltimaCobranca(c,hoje){
  if(!c.ultimaCobranca) return {txt:'Nunca',hoje:false};
  const n=diasEntre(c.ultimaCobranca,hoje);
  if(n<=0) return {txt:'Hoje',hoje:true};
  return {txt:`Há ${n}d (${fmtDate(c.ultimaCobranca).slice(0,5)})`,hoje:false};
}
function toggleCobrancaOcultarHoje(v){cobrancaOcultarHoje=!!v;renderCobrancaDia();}
function renderCobrancaDia(){
  const el=document.getElementById('cobranca-lista');
  if(!el) return;
  const hoje=today();
  const porCliente={};
  getUnidadesFiadoFlat().filter(u=>u.status!=='pago'&&u.vencimento&&u.vencimento<=hoje).forEach(u=>{
    const o=porCliente[u.clienteId]||(porCliente[u.clienteId]={vencimento:u.vencimento,vencido:0,us:[]});
    if(u.vencimento<o.vencimento) o.vencimento=u.vencimento;
    o.vencido+=u.valorRestante;
    o.us.push(u);
  });
  const todos=Object.keys(porCliente).map(k=>{
    const id=parseInt(k),c=getCliente(id),o=porCliente[k];
    const prom=(typeof promessaEstado==='function')?promessaEstado(id,hoje,o.us):null;
    return {id,c,vencimento:o.vencimento,vencido:round2(o.vencido),dias:diasEntre(o.vencimento,hoje),enc:calcEncargosCliente(id,hoje).total,uc:textoUltimaCobranca(c,hoje),prom};
  });
  // promessa em dia cobrindo tudo que está vencido: sai da lista até a data (v5.42)
  const prometidos=todos.filter(l=>l.prom&&l.prom.estado==='ativa'&&l.prom.cobreTudo).sort((a,b)=>a.prom.data.localeCompare(b.prom.data));
  const lista=todos.filter(l=>prometidos.indexOf(l)<0);
  const jaHoje=lista.filter(l=>l.uc.hoje).length;
  const totalVencido=round2(lista.reduce((s,l)=>s+l.vencido,0));
  const quebrada=(l)=>(l.prom&&l.prom.estado==='quebrada')?1:0;
  const vis=(cobrancaOcultarHoje?lista.filter(l=>!l.uc.hoje):lista).sort((a,b)=>quebrada(b)-quebrada(a)||b.dias-a.dias||b.vencido-a.vencido);
  if(todos.length===0){
    el.innerHTML='<div style="text-align:center;padding:60px 20px"><h3 style="color:var(--green)">Nada para cobrar hoje</h3><p style="color:var(--muted);margin-top:8px">Nenhum fiado vencido ou vencendo hoje.</p></div>';
    return;
  }
  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;font-size:13px">
      <span><strong>${lista.length}</strong> cliente(s) · vencido <strong style="color:var(--red)">${fmt(totalVencido)}</strong> · <strong>${jaHoje}</strong> já cobrado(s) hoje${prometidos.length?' · <strong>'+prometidos.length+'</strong> com promessa':''}</span>
      <label style="display:flex;align-items:center;gap:6px;color:var(--muted);cursor:pointer"><input type="checkbox" style="width:auto;margin:0" ${cobrancaOcultarHoje?'checked':''} onchange="toggleCobrancaOcultarHoje(this.checked)"> Ocultar já cobrados hoje</label>
    </div>
    <div class="table-card table-cards"><div class="table-scroll"><table>
      <thead><tr><th>Cliente</th><th>Vencimento</th><th>Vencido</th><th>Última cobrança</th><th></th></tr></thead>
      <tbody>${vis.length===0?'<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">'+(lista.length===0?'Todos os clientes vencidos têm promessa em dia ✓':'Todos já foram cobrados hoje ✓')+'</td></tr>':vis.map(l=>{
        const cor=l.dias>0?'var(--red)':'#d35400';
        const status=l.dias>0?`${l.dias}d atraso`:'Hoje';
        return `<tr style="${l.uc.hoje?'opacity:.6':''}${l.prom&&l.prom.estado==='quebrada'?';background:rgba(192,57,43,.12)':''}">
          <td data-label="Cliente"><strong>${escapeHtml(l.c.nome)}</strong>${l.uc.hoje?' <span class="badge badge-green">Cobrado hoje</span>':''}${cobrancaPromBadge(l.prom)}<br><span style="font-size:11px;color:var(--muted)">${escapeHtml(l.c.tel||'sem telefone')}</span></td>
          <td data-label="Vencimento"><span style="color:${cor};font-weight:600;font-size:12px">${fmtDate(l.vencimento)}</span><br><span style="font-size:11px;color:${cor}">${status}</span></td>
          <td data-label="Vencido" class="debt-amount">${fmt(l.vencido)}${l.enc>0?`<div style="font-size:11px;color:var(--muted);font-weight:400">+ ${fmt(l.enc)} encargos</div>`:''}</td>
          <td data-label="Última cobrança" style="font-size:12px">${l.uc.txt}</td>
          <td><div class="actions-cell"><button class="btn btn-green btn-sm" onclick="abrirPagamento(${l.id})" title="Receber"><i data-lucide="banknote" class="ic"></i></button><button class="btn btn-outline btn-sm" onclick="abrirPromessa(${l.id})" title="Promessa de pagamento"><i data-lucide="handshake" class="ic"></i></button><button class="btn btn-outline btn-sm" onclick="abrirRenegociar(${l.id})" title="Renegociar dívida"><i data-lucide="refresh-cw" class="ic"></i></button>${l.c.tel?`<button class="btn btn-whatsapp btn-sm" onclick="cobrarWhatsapp(${l.id})" title="Cobrar por WhatsApp"><i data-lucide="message-circle" class="ic"></i></button>`:''}</div></td>
        </tr>`;}).join('')}</tbody>
    </table></div></div>`+cobrancaPrometidosHtml(prometidos);
  if(typeof lucide!=='undefined') lucide.createIcons();
}
