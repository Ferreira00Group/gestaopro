// ---- Gerador de QR Code (modo byte, correção M, versões 1–6; cabe URL de até 106 bytes) ----
const QR = (function(){
  const EXP=new Array(512), LOG=new Array(256);
  (function(){ let x=1; for(let i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&256) x^=0x11d; } for(let i=255;i<512;i++) EXP[i]=EXP[i-255]; })();
  const mul=(a,b)=>(a&&b)?EXP[LOG[a]+LOG[b]]:0;
  function rsGerador(n){ let g=[1]; for(let i=0;i<n;i++){ const r=new Array(g.length+1).fill(0); for(let j=0;j<g.length;j++){ r[j]^=g[j]; r[j+1]^=mul(g[j],EXP[i]); } g=r; } return g; }
  function rsEcc(dados,n){ const g=rsGerador(n), r=new Array(n).fill(0); for(const b of dados){ const f=b^r.shift(); r.push(0); if(f) for(let i=0;i<n;i++) r[i]^=mul(g[i+1],f); } return r; }
  // versão: [codewords totais, ecc por bloco, nº de blocos, dados por bloco, posições de alinhamento]
  const V={1:[26,10,1,16,[]],2:[44,16,1,28,[6,18]],3:[70,26,1,44,[6,22]],4:[100,18,2,32,[6,26]],5:[134,24,2,43,[6,30]],6:[172,16,4,27,[6,34]]};
  function codificar(texto){
    const bytes=Array.from(new TextEncoder().encode(texto));
    let ver=0; for(let v=1;v<=6;v++){ if(bytes.length<=V[v][2]*V[v][3]-2){ ver=v; break; } }
    if(!ver) throw new Error('Texto longo demais para o QR');
    const [total,eccBloco,nBlocos,dadosBloco,alin]=V[ver], nDados=nBlocos*dadosBloco, tam=17+4*ver;
    // fluxo de bits
    const bits=[]; const pus=(v,n)=>{ for(let i=n-1;i>=0;i--) bits.push((v>>i)&1); };
    pus(4,4); pus(bytes.length,8); bytes.forEach(b=>pus(b,8));
    const cap=nDados*8; pus(0,Math.min(4,cap-bits.length)); while(bits.length%8) bits.push(0);
    const cw=[]; for(let i=0;i<bits.length;i+=8){ let b=0; for(let j=0;j<8;j++) b=(b<<1)|bits[i+j]; cw.push(b); }
    for(let p=0xEC; cw.length<nDados; p^=0xEC^0x11) cw.push(p);
    // blocos + ECC + intercalação
    const blocos=[], eccs=[];
    for(let i=0;i<nBlocos;i++){ const d=cw.slice(i*dadosBloco,(i+1)*dadosBloco); blocos.push(d); eccs.push(rsEcc(d,eccBloco)); }
    const final=[]; for(let i=0;i<dadosBloco;i++) blocos.forEach(b=>final.push(b[i])); for(let i=0;i<eccBloco;i++) eccs.forEach(e=>final.push(e[i]));
    const dbits=[]; final.forEach(b=>{ for(let i=7;i>=0;i--) dbits.push((b>>i)&1); }); for(let i=total*8;i<total*8+(ver>1?7:0);i++) dbits.push(0);
    // matriz
    const M=Array.from({length:tam},()=>new Array(tam).fill(0)), F=Array.from({length:tam},()=>new Array(tam).fill(false));
    const set=(r,c,v)=>{ if(r>=0&&c>=0&&r<tam&&c<tam){ M[r][c]=v?1:0; F[r][c]=true; } };
    const finder=(r,c)=>{ for(let dr=-1;dr<=7;dr++) for(let dc=-1;dc<=7;dc++){ const on=(dr>=0&&dr<=6&&(dc===0||dc===6))||(dc>=0&&dc<=6&&(dr===0||dr===6))||(dr>=2&&dr<=4&&dc>=2&&dc<=4); set(r+dr,c+dc,on); } };
    finder(0,0); finder(0,tam-7); finder(tam-7,0);
    for(let i=8;i<tam-8;i++){ set(6,i,i%2===0); set(i,6,i%2===0); }
    for(const r of alin) for(const c of alin){ if((r===6&&c===6)||(r===6&&c===alin[alin.length-1])||(c===6&&r===alin[alin.length-1])) continue;
      for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++) set(r+dr,c+dc,Math.max(Math.abs(dr),Math.abs(dc))!==1); }
    set(tam-8,8,true); // módulo escuro fixo
    for(let i=0;i<9;i++){ if(!F[8][i]) set(8,i,0); if(!F[i][8]) set(i,8,0); }
    for(let i=0;i<8;i++){ set(8,tam-1-i,0); set(tam-1-i,8,0); }
    set(tam-8,8,true);
    // dados em zigue-zague
    const dados=[]; { let sobe=true, k=0; for(let col=tam-1;col>0;col-=2){ if(col===6) col--; for(let i=0;i<tam;i++){ const r=sobe?tam-1-i:i; for(let dc=0;dc<2;dc++){ const c=col-dc; if(!F[r][c]){ dados.push([r,c]); } } } sobe=!sobe; } }
    const mascaras=[(r,c)=>(r+c)%2===0,(r,c)=>r%2===0,(r,c)=>c%3===0,(r,c)=>(r+c)%3===0,(r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,(r,c)=>(r*c)%2+(r*c)%3===0,(r,c)=>((r*c)%2+(r*c)%3)%2===0,(r,c)=>((r+c)%2+(r*c)%3)%2===0];
    function formato(m){ let d=(0<<3)|m, r=d<<10; for(let i=14;i>=10;i--) if((r>>i)&1) r^=0x537<<(i-10); return ((d<<10)|r)^0x5412; }
    function montar(m){
      const X=M.map(l=>l.slice());
      dados.forEach(([r,c],i)=>{ const b=dbits[i]||0; X[r][c]=b^(mascaras[m](r,c)?1:0); });
      const f=formato(m), bit=i=>(f>>i)&1;
      for(let i=0;i<=5;i++) X[i][8]=bit(i); X[7][8]=bit(6); X[8][8]=bit(7); X[8][7]=bit(8); for(let i=9;i<15;i++) X[8][14-i]=bit(i);
      for(let i=0;i<8;i++) X[8][tam-1-i]=bit(i); for(let i=8;i<15;i++) X[tam-15+i][8]=bit(i); X[tam-8][8]=1;
      return X;
    }
    function penal(X){
      let p=0;
      for(let t=0;t<2;t++) for(let a=0;a<tam;a++){ let run=1; for(let b=1;b<tam;b++){ const x=t?X[b][a]:X[a][b], y=t?X[b-1][a]:X[a][b-1]; if(x===y){ run++; if(run===5) p+=3; else if(run>5) p++; } else run=1; } }
      for(let r=0;r<tam-1;r++) for(let c=0;c<tam-1;c++){ const v=X[r][c]; if(v===X[r][c+1]&&v===X[r+1][c]&&v===X[r+1][c+1]) p+=3; }
      const pad=[1,0,1,1,1,0,1,0,0,0,0], pad2=pad.slice().reverse();
      const iguais=(arr,a)=>arr.every((v,i)=>v===a[i]);
      for(let t=0;t<2;t++) for(let a=0;a<tam;a++) for(let b=0;b<=tam-11;b++){ const seg=[]; for(let i=0;i<11;i++) seg.push(t?X[b+i][a]:X[a][b+i]); if(iguais(seg,pad)||iguais(seg,pad2)) p+=40; }
      let esc=0; X.forEach(l=>l.forEach(v=>esc+=v)); p+=Math.floor(Math.abs(esc*100/(tam*tam)-50)/5)*10;
      return p;
    }
    let melhor=null, mp=1e9; for(let m=0;m<8;m++){ const X=montar(m), p=penal(X); if(p<mp){ mp=p; melhor=X; } }
    return melhor;
  }
  // SVG com zona de silêncio de 4 módulos
  function svg(texto,px){
    const X=codificar(texto), n=X.length, q=4; let d='';
    for(let r=0;r<n;r++){ let c=0; while(c<n){ if(X[r][c]){ let e=c; while(e<n&&X[r][e]) e++; d+=`M${c+q} ${r+q}h${e-c}v1h${-(e-c)}z`; c=e; } else c++; } }
    const s=n+2*q;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" ${px?`width="${px}" height="${px}"`:''} shape-rendering="crispEdges"><rect width="${s}" height="${s}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  return {codificar,svg};
})();

// ============ CARTÕES QR DOS CLIENTES (v5.56) ============
// O QR do cartão guarda só um link com o NÚMERO DO CARTÃO (…/gestaopro/?cartao=42) — nada do cliente.
// O app guarda a ligação cartão → cliente em state.cartoes = {total, vinculos:{ "42": clienteId }}.
// Trocar o cliente de um cartão é só liberar e vincular de novo: o cartão impresso continua valendo.
// Cliente excluído deixa o cartão livre sozinho; cliente arquivado mantém o vínculo até você liberar.
const CARTOES_URL_BASE='https://ferreira00group.github.io/gestaopro/';
const CARTOES_LOTE=100;
let _cartoesDe=1, _cartoesAte='', _cartoesFiltro='todos', _cartoesBusca='', _cartaoPendente=null, _scanStream=null, _scanTimer=null;

function cartoesState(){
  if(!state.cartoes||typeof state.cartoes!=='object'||Array.isArray(state.cartoes)) state.cartoes={};
  const c=state.cartoes;
  if(!(c.total>0)) c.total=CARTOES_LOTE;
  if(!c.vinculos||typeof c.vinculos!=='object'||Array.isArray(c.vinculos)) c.vinculos={};
  return c;
}
const cartoesNum=n=>String(n).padStart(3,'0');
const cartoesLink=n=>CARTOES_URL_BASE+'?cartao='+n;
function cartoesClienteDe(n){
  const id=cartoesState().vinculos[n]; if(id==null) return null;
  return state.clientes.find(c=>c.id==id)||null; // cliente excluído → cartão livre
}
function cartoesDoCliente(clienteId){
  const v=cartoesState().vinculos;
  for(const n in v){ if(v[n]==clienteId&&state.clientes.some(c=>c.id==clienteId)) return Number(n); }
  return null;
}
function cartoesExtrair(txt){
  txt=String(txt||'').trim(); if(!txt) return null;
  let n=null;
  try{ n=new URL(txt).searchParams.get('cartao'); }catch(e){}
  if(n==null&&/^\d{1,5}$/.test(txt)) n=txt;
  n=parseInt(n,10);
  return n>=1?n:null;
}
function cartoesVincular(n,clienteId){
  const st=cartoesState(), antigo=cartoesDoCliente(clienteId);
  const fazer=()=>{
    if(antigo!=null&&antigo!==n) delete st.vinculos[antigo];
    st.vinculos[n]=clienteId;
    marcarAlterado(); cartoesFecharModal('modal-cartao'); renderCartoes();
    showToast('Cartão '+cartoesNum(n)+' vinculado a '+getCliente(clienteId).nome,'green');
  };
  if(antigo!=null&&antigo!==n) confirmarAcao('Este cliente já usa o cartão '+cartoesNum(antigo)+'. Passar para o cartão '+cartoesNum(n)+' e liberar o antigo?',fazer);
  else fazer();
}
function cartoesLiberar(n){
  const c=cartoesClienteDe(n);
  confirmarAcao('Liberar o cartão '+cartoesNum(n)+(c?' (hoje de '+c.nome+')':'')+'? O cartão impresso continua valendo para outro cliente.',()=>{
    delete cartoesState().vinculos[n]; marcarAlterado(); renderCartoes(); showToast('Cartão liberado','green');
  });
}
function cartoesMaisUm(){
  const st=cartoesState(); st.total+=CARTOES_LOTE; marcarAlterado(); renderCartoes();
  showToast('Agora são '+st.total+' cartões (imprima o novo lote)','green');
}

// ---------- modais criados sob demanda ----------
function cartoesGaranteModais(){
  if(document.getElementById('modal-cartao')) return;
  const w=document.createElement('div');
  w.innerHTML=`
  <div class="modal-overlay" id="modal-cartao"><div class="modal" style="max-width:440px">
    <div class="modal-header"><h3 id="cartao-titulo">Cartão</h3><button class="modal-close" onclick="cartoesFecharModal('modal-cartao')"><i data-lucide="x" class="ic"></i></button></div>
    <div class="modal-body">
      <input class="form-control" id="cartao-busca" placeholder="Buscar cliente por nome, telefone ou nº" oninput="cartoesListaPick()" autocomplete="off">
      <div id="cartao-lista" style="margin-top:10px"></div>
      <button class="btn btn-outline btn-sm" style="margin-top:10px;width:100%" onclick="cartoesNovoCliente()">+ Cadastrar novo cliente e vincular</button>
    </div></div></div>
  <div class="modal-overlay" id="modal-cartao-qr"><div class="modal" style="max-width:340px">
    <div class="modal-header"><h3 id="cartao-qr-titulo">QR</h3><button class="modal-close" onclick="cartoesFecharModal('modal-cartao-qr')"><i data-lucide="x" class="ic"></i></button></div>
    <div class="modal-body" style="text-align:center"><div id="cartao-qr-img" style="max-width:260px;margin:0 auto"></div><p id="cartao-qr-link" style="font-size:11px;color:var(--muted);word-break:break-all;margin-top:8px"></p></div></div></div>
  <div class="modal-overlay" id="modal-cartao-scan"><div class="modal" style="max-width:440px">
    <div class="modal-header"><h3>Ler cartão QR</h3><button class="modal-close" onclick="cartoesFecharScan()"><i data-lucide="x" class="ic"></i></button></div>
    <div class="modal-body">
      <video id="cartao-video" playsinline muted style="width:100%;border-radius:10px;background:#000;display:none"></video>
      <p id="cartao-scan-msg" style="font-size:13px;color:var(--muted);margin:8px 0">Iniciando câmera…</p>
      <div style="display:flex;gap:8px"><input class="form-control" id="cartao-scan-num" type="number" inputmode="numeric" min="1" placeholder="ou digite o nº do cartão" style="flex:1" onkeydown="if(event.key==='Enter')cartoesAbrirDigitado()"><button class="btn btn-primary btn-sm" onclick="cartoesAbrirDigitado()">Abrir</button></div>
    </div></div></div>`;
  while(w.firstChild) document.body.appendChild(w.firstChild);
  ['modal-cartao','modal-cartao-qr'].forEach(id=>{ const m=document.getElementById(id); m.addEventListener('click',e=>{ if(e.target===m) cartoesFecharModal(id); }); });
  const ms=document.getElementById('modal-cartao-scan'); ms.addEventListener('click',e=>{ if(e.target===ms) cartoesFecharScan(); });
}
function cartoesFecharModal(id){ const m=document.getElementById(id); if(m) m.classList.remove('open'); }

let _cartaoEmEdicao=null;
function cartoesAbrirVincular(n){
  cartoesGaranteModais(); _cartaoEmEdicao=n;
  const atual=cartoesClienteDe(n);
  document.getElementById('cartao-titulo').textContent='Cartão nº '+cartoesNum(n)+(atual?' — trocar cliente':' — vincular cliente');
  document.getElementById('cartao-busca').value='';
  cartoesListaPick();
  document.getElementById('modal-cartao').classList.add('open');
  setTimeout(()=>{ const i=document.getElementById('cartao-busca'); if(i) i.focus(); },150);
}
function cartoesListaPick(){
  const q=document.getElementById('cartao-busca').value, box=document.getElementById('cartao-lista');
  const lista=state.clientes.filter(c=>estaAtivo(c)&&clienteCombinaBusca(c,q)).sort((a,b)=>a.nome.localeCompare(b.nome)).slice(0,8);
  if(!lista.length){ box.innerHTML='<p style="color:var(--muted);font-size:13px">Nenhum cliente encontrado.</p>'; return; }
  box.innerHTML=lista.map(c=>{ const outro=cartoesDoCliente(c.id);
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="min-width:0"><strong>${escapeHtml(c.nome)}</strong><div style="font-size:12px;color:var(--muted)">${escapeHtml(c.tel||'')}${outro!=null?' · já tem o cartão '+cartoesNum(outro):''}</div></div>
      <button class="btn btn-primary btn-sm" onclick="cartoesVincular(${_cartaoEmEdicao},${c.id})">Vincular</button></div>`; }).join('');
}
function cartoesNovoCliente(){
  _cartaoPendente=_cartaoEmEdicao; cartoesFecharModal('modal-cartao');
  showToast('Cadastre o cliente: ele será vinculado ao cartão '+cartoesNum(_cartaoPendente),'green');
  openModal('modal-cliente');
}
function cartoesVerQR(n){
  cartoesGaranteModais();
  document.getElementById('cartao-qr-titulo').textContent='Cartão nº '+cartoesNum(n);
  document.getElementById('cartao-qr-img').innerHTML=QR.svg(cartoesLink(n));
  document.getElementById('cartao-qr-link').textContent=cartoesLink(n);
  document.getElementById('modal-cartao-qr').classList.add('open');
}

// ---------- abrir pelo número / link / câmera ----------
function cartoesAbrir(n){
  n=parseInt(n,10); const st=cartoesState();
  if(!(n>=1)||n>st.total){ showToast('Cartão '+(n||'?')+' não existe (o app tem '+st.total+' cartões)','red'); return; }
  const c=cartoesClienteDe(n);
  if(c){ abrirCliente360(c.id); if(!estaAtivo(c)) showToast('Cliente arquivado — para reaproveitar o cartão, libere-o em Cartões QR','red'); }
  else cartoesAbrirVincular(n);
}
function cartoesAbrirDigitado(){
  const n=cartoesExtrair(document.getElementById('cartao-scan-num').value);
  if(!n){ showToast('Digite o número do cartão','red'); return; }
  cartoesFecharScan(); cartoesAbrir(n);
}
async function cartoesAbrirScan(){
  cartoesGaranteModais();
  const msg=document.getElementById('cartao-scan-msg'), vid=document.getElementById('cartao-video');
  document.getElementById('cartao-scan-num').value='';
  document.getElementById('modal-cartao-scan').classList.add('open');
  vid.style.display='none';
  if(!window.BarcodeDetector||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    msg.textContent='Este navegador não lê QR dentro do app. Aponte a câmera normal do celular para o cartão (ele abre o link) ou digite o número abaixo.'; return;
  }
  try{
    _scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    vid.srcObject=_scanStream; vid.style.display='block'; await vid.play();
    msg.textContent='Aponte para o QR do cartão…';
    const det=new BarcodeDetector({formats:['qr_code']}); let busy=false;
    _scanTimer=setInterval(async()=>{
      if(busy) return; busy=true;
      try{ const r=await det.detect(vid); if(r.length){ const n=cartoesExtrair(r[0].rawValue); if(n){ cartoesFecharScan(); cartoesAbrir(n); } } }catch(e){}
      busy=false;
    },300);
  }catch(e){ msg.textContent='Não consegui usar a câmera (permissão negada?). Digite o número do cartão abaixo.'; }
}
function cartoesFecharScan(){
  if(_scanTimer){ clearInterval(_scanTimer); _scanTimer=null; }
  if(_scanStream){ _scanStream.getTracks().forEach(t=>t.stop()); _scanStream=null; }
  cartoesFecharModal('modal-cartao-scan');
}
// Link do cartão (?cartao=42) aberto pela câmera do celular
function cartoesTratarLink(){
  let n=null; try{ n=new URLSearchParams(location.search).get('cartao'); }catch(e){}
  if(n==null) return;
  try{ history.replaceState(null,'',location.pathname+location.hash); }catch(e){}
  cartoesAbrir(n);
}

// ---------- tela ----------
function cartoesFiltrar(f){ _cartoesFiltro=f; renderCartoes(); }
function cartoesBuscar(v){ _cartoesBusca=v; renderCartoes(true); }
function renderCartoes(mantemBusca){
  const root=document.getElementById('cartoes-conteudo'); if(!root) return;
  const st=cartoesState(); const linhas=[]; let vinc=0;
  for(let n=1;n<=st.total;n++){ const c=cartoesClienteDe(n); if(c) vinc++; linhas.push({n,c}); }
  const q=normBusca(_cartoesBusca);
  const lista=linhas.filter(l=>(_cartoesFiltro==='todos'||(_cartoesFiltro==='livres'?!l.c:!!l.c))&&(!q||String(l.n).includes(q.replace(/^0+/,''))&&/^\d+$/.test(q)||(l.c&&normBusca(l.c.nome).includes(q))));
  const aba=(f,t)=>`<button class="tab ${_cartoesFiltro===f?'active':''}" onclick="cartoesFiltrar('${f}')">${t}</button>`;
  const html=`
    <div class="conectores-resumo"><div><span class="conector-kicker">CARTÕES DE CLIENTE</span><h3>${vinc} de ${st.total} cartões em uso</h3><p>O QR guarda só o número do cartão. Troque o cliente de um cartão a qualquer momento, sem reimprimir.</p></div></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">
      <button class="btn btn-primary btn-sm" onclick="cartoesAbrirScan()"><i data-lucide="scan-line" class="ic"></i> Ler cartão</button>
      <button class="btn btn-outline btn-sm" onclick="cartoesMaisUm()">+ ${CARTOES_LOTE} cartões</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px;font-size:13px">Imprimir do nº
      <input class="form-control" id="cartoes-de" type="number" min="1" value="${_cartoesDe}" style="width:80px" oninput="_cartoesDe=this.value"> até
      <input class="form-control" id="cartoes-ate" type="number" min="1" value="${_cartoesAte||Math.min(st.total,CARTOES_LOTE)}" style="width:80px" oninput="_cartoesAte=this.value">
      <button class="btn btn-outline btn-sm" onclick="cartoesImprimirUI()"><i data-lucide="printer" class="ic"></i> Imprimir</button>
      <span style="color:var(--muted);font-size:12px">18 cartões por folha A4</span></div>
    <div class="tabs" style="margin-bottom:10px">${aba('todos','Todos')}${aba('livres','Livres')}${aba('vinculados','Vinculados')}</div>
    <input class="form-control" id="cartoes-busca" placeholder="Buscar por nº do cartão ou nome do cliente" value="${escapeHtml(_cartoesBusca)}" oninput="cartoesBuscar(this.value)" style="margin-bottom:10px" autocomplete="off">
    <div class="table-card table-cards"><div class="table-scroll"><table>
      <thead><tr><th>Cartão</th><th>Cliente</th><th>Ações</th></tr></thead><tbody>
      ${lista.length?lista.map(({n,c})=>`<tr>
        <td data-label="Cartão"><span style="font-family:monospace;font-weight:700">${cartoesNum(n)}</span></td>
        <td data-label="Cliente">${c?`<a style="cursor:pointer;font-weight:600" onclick="abrirCliente360(${c.id})">${escapeHtml(c.nome)}</a>${estaAtivo(c)?'':' <span class="badge badge-gray">Arquivado</span>'}`:'<span class="badge badge-green">Livre</span>'}</td>
        <td data-label="Ações"><div style="display:flex;flex-wrap:wrap;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="cartoesAbrirVincular(${n})">${c?'Trocar':'Vincular'}</button>
          ${c?`<button class="btn btn-outline btn-sm" onclick="cartoesLiberar(${n})">Liberar</button>`:''}
          <button class="btn btn-outline btn-sm" onclick="cartoesVerQR(${n})">Ver QR</button></div></td></tr>`).join(''):'<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:24px">Nenhum cartão encontrado</td></tr>'}
      </tbody></table></div></div>`;
  const foco=document.activeElement&&document.activeElement.id==='cartoes-busca', pos=foco?document.activeElement.selectionStart:0;
  root.innerHTML=html;
  if(foco){ const i=document.getElementById('cartoes-busca'); i.focus(); try{ i.setSelectionRange(pos,pos); }catch(e){} }
  if(typeof lucide!=='undefined') lucide.createIcons();
}

// ---------- impressão (folha A4, 3 × 6 cartões por página) ----------
function cartoesImprimirUI(){
  const st=cartoesState();
  const de=parseInt(document.getElementById('cartoes-de').value,10), ate=parseInt(document.getElementById('cartoes-ate').value,10);
  if(!(de>=1)||!(ate>=de)||ate>st.total){ showToast('Informe um intervalo válido (1 a '+st.total+')','red'); return; }
  cartoesImprimir(de,ate);
}
function cartoesImprimir(de,ate){
  if(!document.getElementById('cartoes-print-css')){
    const s=document.createElement('style'); s.id='cartoes-print-css';
    s.textContent=`#cartoes-print{display:none}
@media print{
  @page{size:A4;margin:1cm}
  body.imprimindo-cartoes>*:not(#cartoes-print){display:none!important}
  body.imprimindo-cartoes #cartoes-print{display:grid!important;grid-template-columns:repeat(3,6.3cm);justify-content:center;background:#fff;color:#000}
  .cartao-print{width:6.3cm;height:4.4cm;box-sizing:border-box;border:1px dashed #999;display:flex;align-items:center;gap:.25cm;padding:.3cm;break-inside:avoid;font-family:Arial,sans-serif}
  .cartao-print svg{width:2.9cm;height:2.9cm;flex:none}
  .cartao-print b{display:block;font-size:11pt}.cartao-print small{font-size:7.5pt;color:#444}
  .cartao-print .cp-n{font-size:22pt;font-weight:800;letter-spacing:1px;margin:.1cm 0}
}`;
    document.head.appendChild(s);
  }
  let box=document.getElementById('cartoes-print'); if(!box){ box=document.createElement('div'); box.id='cartoes-print'; document.body.appendChild(box); }
  let h=''; for(let n=de;n<=ate;n++) h+=`<div class="cartao-print">${QR.svg(cartoesLink(n))}<div><b>GestãoPRO</b><small>Cartão do cliente</small><div class="cp-n">${cartoesNum(n)}</div><small>Mostre este cartão<br>a cada compra</small></div></div>`;
  box.innerHTML=h;
  document.body.classList.add('imprimindo-cartoes');
  const fim=()=>{ document.body.classList.remove('imprimindo-cartoes'); box.innerHTML=''; window.removeEventListener('afterprint',fim); };
  window.addEventListener('afterprint',fim);
  setTimeout(()=>window.print(),150);
}

// ---------- integrações com o resto do app ----------
// 1) Cadastro iniciado a partir de um cartão livre: vincula o cliente novo ao salvar.
if(typeof salvarCliente==='function'){
  const _salvarClienteOrig=salvarCliente;
  salvarCliente=function(){
    const antes=state.clientes.length, pend=_cartaoPendente;
    _salvarClienteOrig.apply(this,arguments);
    if(pend!=null&&state.clientes.length>antes){
      const novo=state.clientes[state.clientes.length-1];
      cartoesState().vinculos[pend]=novo.id; _cartaoPendente=null; marcarAlterado();
      showToast('Cartão '+cartoesNum(pend)+' vinculado a '+novo.nome,'green');
      if(document.getElementById('page-cartoes')&&document.getElementById('page-cartoes').classList.contains('active')) renderCartoes();
    }
  };
}
// cancelou o cadastro: esquece o cartão pendente
(function(){
  const m=document.getElementById('modal-cliente'); if(!m) return;
  new MutationObserver(()=>{ if(!m.classList.contains('open')) _cartaoPendente=null; }).observe(m,{attributes:true,attributeFilter:['class']});
})();
// 2) Ficha 360 mostra o número do cartão do cliente.
if(typeof c360Render==='function'){
  const _c360Orig=c360Render;
  c360Render=function(){
    _c360Orig.apply(this,arguments);
    try{
      const n=cartoesDoCliente(c360Id), b=document.getElementById('c360-corpo');
      if(n!=null&&b) b.insertAdjacentHTML('afterbegin',`<div style="margin-bottom:6px"><span class="badge badge-blue">Cartão nº ${cartoesNum(n)}</span></div>`);
    }catch(e){}
  };
}
// 3) Link do cartão aberto pela câmera do celular (espera o app terminar de carregar os dados).
setTimeout(cartoesTratarLink,900);
