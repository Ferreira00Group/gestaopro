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
// ═══ CONFIGURAÇÃO CENTRALIZADA DE FORMATAÇÃO DO CARTÃO (v5.59.0) ═══
const CONECTIVOS_NOME = new Set(["de", "da", "do", "dos", "das", "e", "d'"]);
const PREFIXOS_ENDERECO = new Set([
  "rua", "r.", "r", "avenida", "av.", "av", "travessa", "trav", "tr.",
  "alameda", "al.", "rodovia", "rod.", "estrada", "est.", "praca", "praça",
  "pc.", "pça", "vila", "v.", "bairro", "jd.", "jardim", "quadra", "qd.", "lote", "lt."
]);

function formatarNomeCartao(nome){
  if(!nome) return "";
  const palavras = String(nome).trim().split(/\s+/);
  const res = [];
  let termos = 0;
  for(let i = 0; i < palavras.length; i++){
    const p = palavras[i];
    const ehConectivo = CONECTIVOS_NOME.has(p.toLowerCase());
    res.push(p);
    if(!ehConectivo){
      termos++;
      if(termos >= 2) break;
    }
  }
  return res.join(" ");
}

function formatarEnderecoCartao(end){
  if(!end) return "";
  let palavras = String(end).split(",")[0].trim().split(/\s+/).filter(Boolean);
  if(palavras.length > 0 && PREFIXOS_ENDERECO.has(palavras[0].toLowerCase()) && palavras.length - 1 >= 2){
    palavras.shift();
  }
  // pula conectivos no começo ("das Flores" -> "Flores") e junta até 2 termos, mantendo conectivos do meio
  while(palavras.length > 1 && CONECTIVOS_NOME.has(palavras[0].toLowerCase())) palavras.shift();
  const res = []; let termos = 0;
  for(const p of palavras){
    const conectivo = CONECTIVOS_NOME.has(p.toLowerCase());
    if(!conectivo && termos >= 2) break;
    res.push(p);
    if(!conectivo) termos++;
  }
  while(res.length > 1 && CONECTIVOS_NOME.has(res[res.length-1].toLowerCase())) res.pop();
  return res.join(" ");
}

function formatarRotaCartao(rota){
  if(!rota) return "";
  let palavras = String(rota).trim().split(/\s+/).filter(p => p.toLowerCase() !== "rota");
  return palavras[0] || "";
}

let _cartoesDe=1, _cartoesAte='', _cartoesFiltro='todos', _cartoesBusca='', _cartoesSo=null, _cartaoPendente=null, _scanStream=null, _scanTimer=null;

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
  n = Number(n);
  const porFicha = (state.clientes||[]).find(c=>estaAtivo(c)&&Number(c.cartaoNum)===n);
  if(porFicha) return porFicha;
  const id=cartoesState().vinculos[n]; if(id==null) return null;
  const c=(state.clientes||[]).find(x=>x.id==id);
  if(c&&estaAtivo(c)){ c.cartaoNum=n; return c; }
  return null;
}
function cartoesDoCliente(clienteId){
  const c=(state.clientes||[]).find(x=>x.id===clienteId);
  if(c&&c.cartaoNum!=null){
    const st=cartoesState();
    if(st.vinculos&&st.vinculos[c.cartaoNum]!==clienteId) st.vinculos[c.cartaoNum]=clienteId;
    return c.cartaoNum;
  }
  const v=cartoesState().vinculos;
  for(const n in v){
    if(v[n]==clienteId&&(state.clientes||[]).some(x=>x.id==clienteId)){
      if(c&&estaAtivo(c)) c.cartaoNum=Number(n);
      return Number(n);
    }
  }
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
  const c=(state.clientes||[]).find(x=>x.id===clienteId);
  const fazer=()=>{
    if(antigo!=null&&antigo!==n) delete st.vinculos[antigo];
    st.vinculos[n]=clienteId;
    if(c){
      if(c.cartaoNum!=null&&c.cartaoNum!==n){
        c.cartoesAntigos=Array.isArray(c.cartoesAntigos)?c.cartoesAntigos:[];
        if(!c.cartoesAntigos.includes(c.cartaoNum)) c.cartoesAntigos.push(c.cartaoNum);
      }
      c.cartaoNum=Number(n);
    }
    marcarAlterado();
    cartoesFecharModal('modal-cartao');
    if(document.getElementById('modal-cartao-sem-cliente')) cartoesFecharModal('modal-cartao-sem-cliente');
    renderCartoes();
    if(typeof renderClientes==='function') renderClientes();
    showToast('Cartão '+cartoesNum(n)+' vinculado a '+(c?c.nome:'cliente'),'green');
  };
  if(antigo!=null&&antigo!==n) confirmarAcao('Este cliente já usa o cartão '+cartoesNum(antigo)+'. Passar para o cartão '+cartoesNum(n)+' e liberar o antigo?',fazer);
  else fazer();
}
function cartoesLiberar(n){
  const c=cartoesClienteDe(n);
  confirmarAcao('Liberar o cartão '+cartoesNum(n)+(c?' (hoje de '+c.nome+')':'')+'? O cartão impresso continua valendo para outro cliente.',()=>{
    delete cartoesState().vinculos[n];
    if(c&&c.cartaoNum===Number(n)){
      c.cartoesAntigos=Array.isArray(c.cartoesAntigos)?c.cartoesAntigos:[];
      if(!c.cartoesAntigos.includes(Number(n))) c.cartoesAntigos.push(Number(n));
      c.cartaoNum=null;
    }
    marcarAlterado(); renderCartoes();
    if(typeof renderClientes==='function') renderClientes();
    showToast('Cartão liberado','green');
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
    <div class="modal-overlay" id="modal-cartao-sem-cliente"><div class="modal" style="max-width:420px">
    <div class="modal-header"><h3>Cartão sem cliente</h3><button class="modal-close" onclick="cartoesFecharModal('modal-cartao-sem-cliente')"><i data-lucide="x" class="ic"></i></button></div>
    <div class="modal-body cartao-sem-cliente-box">
      <div class="cartao-sem-cliente-icon"><i data-lucide="credit-card" style="width:32px;height:32px;stroke-width:1.75"></i></div>
      <h3 style="margin-bottom:6px">Cartão <span id="cartao-sem-num" style="color:var(--gold)">#000</span></h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:20px">Este cartão impresso ainda não está associado a nenhum cliente ativo.</p>
      <button class="btn btn-primary" style="width:100%;margin-bottom:8px;padding:11px" onclick="cartoesCadastrarNovoDoSemCliente()"><i data-lucide="user-plus" class="ic"></i> Cadastrar novo cliente vinculado</button>
      <button class="btn btn-outline" style="width:100%;padding:10px" onclick="cartoesVincularExistenteDoSemCliente()"><i data-lucide="link" class="ic"></i> Vincular a cliente já cadastrado</button>
    </div>
  </div></div>
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
  ['modal-cartao','modal-cartao-qr','modal-cartao-sem-cliente'].forEach(id=>{ const m=document.getElementById(id); m.addEventListener('click',e=>{ if(e.target===m) cartoesFecharModal(id); }); });
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
  if(c&&estaAtivo(c)){
    abrirCliente360(c.id);
  } else {
    cartoesAbrirSemCliente(n);
  }
}
function cartoesAbrirSemCliente(n){
  cartoesGaranteModais();
  _cartaoEmEdicao=n;
  const numEl=document.getElementById('cartao-sem-num');
  if(numEl) numEl.textContent=cartoesNum(n);
  const m=document.getElementById('modal-cartao-sem-cliente');
  if(m) m.classList.add('open');
  else cartoesAbrirVincular(n);
}
function cartoesCadastrarNovoDoSemCliente(){
  const n=_cartaoEmEdicao;
  cartoesFecharModal('modal-cartao-sem-cliente');
  _cartaoPendente=n;
  showToast('Cadastre o cliente: será vinculado ao Cartão '+cartoesNum(n),'green');
  if(typeof clearClienteForm==='function') clearClienteForm();
  const tit=document.getElementById('modal-cliente-title');
  if(tit) tit.textContent='Novo Cliente · Cartão '+cartoesNum(n);
  openModal('modal-cliente');
}
function cartoesVincularExistenteDoSemCliente(){
  const n=_cartaoEmEdicao;
  cartoesFecharModal('modal-cartao-sem-cliente');
  cartoesAbrirVincular(n);
}
function cartoesAbrirDigitado(){
  const n=cartoesExtrair(document.getElementById('cartao-scan-num').value);
  if(!n){ showToast('Digite o número do cartão','red'); return; }
  cartoesFecharScan(); cartoesAposLeitura(n);
}
// Quem pediu a leitura (ex.: PDV) pode registrar um callback; sem callback abre o cartão normalmente
let _cartaoScanCb=null;
function cartoesAposLeitura(n){
  const cb=_cartaoScanCb; _cartaoScanCb=null;
  if(typeof cb==='function') cb(n); else cartoesAbrir(n);
}
async function cartoesAbrirScan(cb){
  _cartaoScanCb=(typeof cb==='function')?cb:null;
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
      try{ const r=await det.detect(vid); if(r.length){ const n=cartoesExtrair(r[0].rawValue); if(n){ cartoesFecharScan(); cartoesAposLeitura(n); } } }catch(e){}
      busy=false;
    },300);
  }catch(e){ msg.textContent='Não consegui usar a câmera (permissão negada?). Digite o número do cartão abaixo.'; }
}
function cartoesFecharScan(){
  _cartaoScanCb=null;
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
function cartoesFiltrar(f){ _cartoesFiltro=f; _cartoesSo=null; renderCartoes(); }
function cartoesBuscar(v){ _cartoesBusca=v; _cartoesSo=null; renderCartoes(true); }
// clicar no #001 do cliente: abre a tela Cartões já mostrando só esse cartão
function cartoesIrPara(n){ _cartoesFiltro='todos'; _cartoesBusca=''; _cartoesSo=Number(n); goto('cartoes'); }
function cartoesMostrarTodos(){ _cartoesSo=null; renderCartoes(); }
function renderCartoes(mantemBusca){
  const root=document.getElementById('cartoes-conteudo'); if(!root) return;
  const st=cartoesState(); const linhas=[]; let vinc=0;
  for(let n=1;n<=st.total;n++){ const c=cartoesClienteDe(n); if(c) vinc++; linhas.push({n,c}); }
  const q=normBusca(_cartoesBusca);
  const lista=_cartoesSo!=null?linhas.filter(l=>l.n===_cartoesSo):linhas.filter(l=>(_cartoesFiltro==='todos'||(_cartoesFiltro==='livres'?!l.c:!!l.c))&&(!q||String(l.n).includes(q.replace(/^0+/,''))&&/^\d+$/.test(q)||(l.c&&normBusca(l.c.nome).includes(q))));
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
      <button class="btn btn-outline btn-sm" onclick="cartoesImprimirUI()"><i data-lucide="printer" class="ic"></i> Gerar PDF</button>
      <span style="color:var(--muted);font-size:12px">PDF A4 • 10 cartões por folha • salva em Downloads</span></div>
    ${_cartoesSo!=null?`<div style="margin:0 0 10px;font-size:13px">Mostrando só o cartão ${cartoesNum(_cartoesSo)} <button class="btn btn-outline btn-sm" onclick="cartoesMostrarTodos()">Ver todos</button></div>`:''}
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

// ---------- geração de PDF local (sem janela de impressão) ----------
// O PDF é montado em vetor: QR nítido, textos e formas. Funciona offline.
function cartoesPDFAscii(s){
  return String(s).replace(/[^\x20-\x7E]/g,ch=>{ const c=ch.charCodeAt(0); return (c>=0xA0&&c<=0xFF)?'\\'+c.toString(8).padStart(3,'0'):'?'; });
}
function cartoesPDFBuild(de,ate){
  const W=595.276, H=841.89, mm=72/25.4;
  const cw=85*mm, ch=48.57*mm, gapX=4*mm, gapY=3*mm;
  const cols=2, porPagina=10;
  const total=ate-de+1, paginas=[];
  const fmt=n=>Number(n).toFixed(2);
  const rect=(x,y,w,h,fill,stroke=null,lw=1)=>{
    let q=`${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)} re `;
    if(fill&&stroke) q+=`B`;
    else if(fill) q+=`f`;
    else q+=`S`;
    return `${fill?`${fill} rg `:''}${stroke?`${stroke} RG ${fmt(lw)} w `:''}${q}\n`;
  };
  const line=(x1,y1,x2,y2,color,width=1)=>`${color} RG ${fmt(width)} w ${fmt(x1)} ${fmt(y1)} m ${fmt(x2)} ${fmt(y2)} l S\n`;
  const txt=(x,y,size,str,color='1 1 1',font='F2')=>`BT /${font} ${fmt(size)} Tf ${color} rg ${fmt(x)} ${fmt(y)} Td (${cartoesPDFAscii(String(str).replace(/([\\()])/g,'\\$1'))}) Tj ET\n`;
  for(let base=de;base<=ate;base+=porPagina){
    let c='';
    const nFim=Math.min(ate,base+porPagina-1);
    for(let n=base;n<=nFim;n++){
      const idx=n-base, col=idx%cols, row=Math.floor(idx/cols);
      const x=(W-(cols*cw+(cols-1)*gapX))/2+col*(cw+gapX);
      const y=H-10*mm-ch-row*(ch+gapY);
      // cartão preto com moldura dourada e detalhes geométricos
      c+='q\n';
      c+=rect(x,y,cw,ch,'0.015 0.015 0.018','0.91 0.64 0.10',1.35);
      c+=line(x+8,y+ch-23,x+cw-8,y+ch-23,'0.70 0.47 0.08',0.8);
      c+=line(x+cw*.61,y+8,x+cw*.61,y+ch-30,'0.95 0.67 0.16',1.2);
      // faixas angulares douradas nas extremidades
      c+=`0.82 0.56 0.08 rg ${fmt(x)} ${fmt(y+ch-3)} m ${fmt(x+cw*.32)} ${fmt(y+ch)} l ${fmt(x+cw*.25)} ${fmt(y+ch)} l ${fmt(x)} ${fmt(y+ch-9)} l f\n`;
      c+=`0.72 0.48 0.06 rg ${fmt(x+cw*.78)} ${fmt(y)} m ${fmt(x+cw)} ${fmt(y+ch*.22)} l ${fmt(x+cw)} ${fmt(y+ch*.30)} l ${fmt(x+cw*.72)} ${fmt(y)} l f\n`;
      c+=txt(x+13,y+ch-19,12,'Gestão','1 1 1','F2');
      c+=txt(x+56,y+ch-19,12,'PRO','0.99 0.72 0.18','F2');
      c+=txt(x+cw-48,y+ch-20,18,cartoesNum(n),'1 1 1','F2');
      // QR em vetor com zona de silencio de 4 modulos
      const mat=QR.codificar(cartoesLink(n)), q=mat.length, quiet=4;
      const qrSize=ch*.66, module=qrSize/(q+quiet*2), qx=x+10, qy=y+12;
      c+=rect(qx-3,qy-3,qrSize+6,qrSize+6,'1 1 1','0.91 0.64 0.10',0.8);
      c+='0 0 0 rg\n';
      for(let r=0;r<q;r++){
        let cc=0;
        while(cc<q){
          if(mat[r][cc]){
            let end=cc+1; while(end<q&&mat[r][end]) end++;
            const rx=qx+(cc+quiet)*module;
            const ry=qy+(q-1-r+quiet)*module;
            c+=`${fmt(rx)} ${fmt(ry)} ${fmt((end-cc)*module)} ${fmt(module)} re f\n`;
            cc=end;
          }else cc++;
        }
      }
      // três campos: se cliente ativo existir, imprime dados formatados; senão caixa em branco
      const cli = cartoesClienteDe(n);
      const fx = x + cw * .66, fw = cw * .29, fh = 13;
      const campoValores = [
        cli ? formatarNomeCartao(cli.nome) : '',
        cli ? formatarEnderecoCartao(cli.end) : '',
        cli ? formatarRotaCartao(cli.rotaId && typeof getRota === 'function' ? (getRota(cli.rotaId)?.nome || '') : '') : ''
      ];
      for(let k = 0; k < 3; k++){
        const fy = y + ch - 43 - k * 24;
        c += rect(fx, fy, fw, fh, '1 1 1', '0.91 0.64 0.10', 0.75);
        c += `0.99 0.72 0.18 RG 1.25 w ${fmt(x+cw*.635)} ${fmt(fy+fh/2)} m ${fmt(x+cw*.65)} ${fmt(fy+fh/2)} l S\n`;
        const val = campoValores[k];
        if(val){
          c += txt(fx + 2.5, fy + 3.8, 6.5, val.slice(0, 22), '0.08 0.08 0.08', 'F2');
        }
      }
      c+='Q\n';
    }
    paginas.push(c);
  }
  const objs=[];
  const add=o=>(objs.push(o),objs.length);
  const catalog=add(''), pagesObj=add(''), f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds=[];
  for(const content of paginas){
    const stream=content;
    const contentId=add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    const pageId=add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  objs[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objs[pagesObj-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
  let pdf='%PDF-1.4\n%GestaoPRO\n', offsets=[0];
  for(let i=0;i<objs.length;i++){ offsets.push(pdf.length); pdf+=`${i+1} 0 obj\n${objs[i]}\nendobj\n`; }
  const xref=pdf.length;
  pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<offsets.length;i++) pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+=`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}
function cartoesGerarPDF(de,ate){
  de=parseInt(de,10); ate=parseInt(ate,10);
  if(!Number.isInteger(de)||!Number.isInteger(ate)||de<1||ate<de||ate-de>999){
    showToast('Informe um intervalo válido de cartões (máximo 1.000 por arquivo)','red'); return;
  }
  try{
    const pdf=cartoesPDFBuild(de,ate);
    const blob=new Blob([pdf],{type:'application/pdf'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=`GestaoPRO-Cartoes-${cartoesNum(de)}-${cartoesNum(ate)}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    showToast(`PDF gerado: ${ate-de+1} cartão(ões). Verifique a pasta Downloads.`,'green');
  }catch(e){
    console.error('Falha ao gerar PDF dos cartões:',e);
    showToast('Não foi possível gerar o PDF: '+(e.message||'erro inesperado'),'red');
  }
}
function cartoesImprimir(de,ate){ cartoesGerarPDF(de,ate); }
function cartoesImprimirUI(){
  const de=document.getElementById('cartoes-de')?.value;
  const ate=document.getElementById('cartoes-ate')?.value;
  cartoesGerarPDF(de,ate);
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
// 2) Ficha 360: nº do cartão, ações rápidas (venda, pagamento, cartão) e cartões anteriores.
if(typeof c360Render==='function'){
  const _c360Orig=c360Render;
  c360Render=function(){
    _c360Orig.apply(this,arguments);
    try{
      const c=state.clientes.find(x=>x.id===c360Id), b=document.getElementById('c360-corpo'); if(!c||!b) return;
      const n=cartoesDoCliente(c.id), ant=(c.cartoesAntigos||[]).filter(x=>x!==n);
      b.insertAdjacentHTML('afterbegin',`<div style="margin-bottom:8px">
        ${n!=null?`<span class="badge badge-blue">Cartão nº ${cartoesNum(n)}</span>`:''}
        ${ant.length?`<span style="font-size:11px;color:var(--muted);margin-left:6px">já teve o cartão ${ant.map(cartoesNum).join(', ')}</span>`:''}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          <button class="btn btn-sm" style="background:linear-gradient(135deg,#F6B52A,#C98C14);color:#000;font-weight:800;border:none;box-shadow:0 2px 6px rgba(201,140,20,.3)" onclick="c360Acao(()=>iniciarAtendimentoMes(${c.id}))"><i data-lucide="zap" class="ic"></i> Atendimento do Mês</button>
          <button class="btn btn-primary btn-sm" onclick="c360Acao(()=>cartoesNovaVendaPara(${c.id}))">Nova venda</button>
          <button class="btn btn-outline btn-sm" onclick="c360Acao(()=>abrirPagamento(${c.id}))">Receber pagamento</button>
          ${n!=null?`<button class="btn btn-outline btn-sm" onclick="c360Acao(()=>cartoesImprimir(${n},${n}))">Imprimir cartão</button>`:''}
        </div></div>`);
    }catch(e){}
  };
}
function cartoesNovaVendaPara(id){ goto('vendas'); setTimeout(()=>{ abrirNovaVenda(); selecionarClienteVenda(id); },200); }
// 3) Link do cartão aberto pela câmera do celular (espera o app terminar de carregar os dados).
setTimeout(cartoesTratarLink,900);

// ═══ v5.57 — número do cartão segue a ficha: menor livre, libera ao arquivar/excluir, histórico, migração ═══
let _cartoesNorm=false, _cartoesSemAuto=false;
function cartoesMenorLivre(st){
  for(let n=1;n<=st.total;n++){ if(st.vinculos[n]==null) return n; }
  const n=st.total+1; st.total+=CARTOES_LOTE; return n; // acabou o lote: abre outro (imprimir depois)
}
function cartoesNormalizar(st){
  let mudou = false;
  if(!st.migradoV){
    st.backupPreMigracao = { em: today(), vinculos: Object.assign({}, st.vinculos), total: st.total };
    st.migradoV = 2;
    mudou = true;
  }
  for(const n in st.vinculos){
    const id = st.vinculos[n];
    const c = (state.clientes||[]).find(x => x.id == id);
    if(c && estaAtivo(c)){
      if(c.cartaoNum !== Number(n)){
        c.cartaoNum = Number(n);
        mudou = true;
      }
    } else {
      if(c){
        c.cartoesAntigos = Array.isArray(c.cartoesAntigos) ? c.cartoesAntigos : [];
        if(!c.cartoesAntigos.includes(Number(n))) c.cartoesAntigos.push(Number(n));
        c.cartaoNum = null;
      }
      delete st.vinculos[n];
      mudou = true;
    }
  }
  (state.clientes||[]).forEach(c => {
    if(estaAtivo(c) && c.cartaoNum != null){
      if(st.vinculos[c.cartaoNum] !== c.id){
        st.vinculos[c.cartaoNum] = c.id;
        mudou = true;
      }
    }
  });
  if(_cartaoPendente == null && !_cartoesSemAuto){
    const ativosSem = (state.clientes||[]).filter(c => estaAtivo(c) && (c.cartaoNum == null && cartoesDoCliente(c.id) == null)).sort((a,b) => a.id - b.id);
    ativosSem.forEach(c => {
      const livre = cartoesMenorLivre(st);
      c.cartaoNum = livre;
      st.vinculos[livre] = c.id;
      mudou = true;
    });
  }
  if(mudou && typeof marcarAlterado === 'function') marcarAlterado();
}
(function(){
  const base=cartoesState;
  cartoesState=function(){
    const st=base();
    if(!_cartoesNorm&&Array.isArray(state.clientes)){ _cartoesNorm=true; try{ cartoesNormalizar(st); }finally{ _cartoesNorm=false; } }
    return st;
  };
})();
// só cliente ativo "tem" o cartão
cartoesClienteDe=function(n){
  const id=cartoesState().vinculos[n]; if(id==null) return null;
  const c=state.clientes.find(x=>x.id==id); return c&&estaAtivo(c)?c:null;
};
// cliente novo cadastrado a partir de um cartão livre: tira o número automático (se já houver) e fica com o do cartão
(function(){
  if(typeof salvarCliente!=='function') return;
  const orig=salvarCliente;
  salvarCliente=function(){
    const pend=_cartaoPendente, antes=state.clientes.length;
    orig.apply(this,arguments);
    if(pend!=null&&state.clientes.length>antes){
      const novo=state.clientes[state.clientes.length-1], v=cartoesState().vinculos;
      for(const n in v){ if(v[n]==novo.id&&Number(n)!==pend) delete v[n]; }
    }
  };
})();
// reativar: volta ao número antigo se ainda estiver livre; senão pega o menor livre e avisa para reimprimir
(function(){
  if(typeof reativarCliente!=='function') return;
  const orig=reativarCliente;
  reativarCliente=function(id){
    let aviso=null;
    _cartoesSemAuto=true;
    try{
      orig.apply(this,arguments);
      const c=state.clientes.find(x=>x.id===id);
      if(c&&estaAtivo(c)){
        const st=cartoesState();
        if(cartoesDoCliente(id)==null){
          const ant=c.cartoesAntigos||[], ult=ant.length?ant[ant.length-1]:null;
          if(ult!=null&&ult<=st.total&&st.vinculos[ult]==null){ st.vinculos[ult]=id; aviso={n:ult,igual:true}; }
          else { const n=cartoesMenorLivre(st); st.vinculos[n]=id; aviso={n,igual:false,ult}; }
          if(typeof marcarAlterado==='function') marcarAlterado();
        }
      }
    }finally{ _cartoesSemAuto=false; }
    if(aviso&&aviso.igual) showToast('Cartão nº '+cartoesNum(aviso.n)+' mantido','green');
    else if(aviso) confirmarAcao('Novo cartão nº '+cartoesNum(aviso.n)+(aviso.ult!=null?' (o '+cartoesNum(aviso.ult)+' já foi para outro cliente)':'')+'. Imprima o cartão novo e descarte o antigo. Imprimir agora?',()=>cartoesImprimir(aviso.n,aviso.n));
  };
})();
