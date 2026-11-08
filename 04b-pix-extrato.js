// ============ PIX, EXTRATO DO CLIENTE E ENCARGOS DE ATRASO (v5.36 / v5.37) ============
// Dados em state.pix e state.encargos (migrações 15 e 16). A chave Pix é digitada pelo usuário
// e fica só no aparelho e no backup — nunca no código.

const PIX_PADRAO={chave:'',tipo:'celular',nome:'',cidade:''};
// Carência 0 = a cobrança vale a partir do 1º dia após o vencimento (dias contam desde o vencimento).
const ENCARGOS_PADRAO={ativo:false,multa:5,juros:3,carencia:0,pixComEncargos:false};
function getPixCfg(){return Object.assign({},PIX_PADRAO,state.pix||{});}
function encargosCfg(){return Object.assign({},ENCARGOS_PADRAO,state.encargos||{});}
const round2=v=>Math.round((Number(v)||0)*100)/100;

// ───────── Pix "copia e cola" (BR Code estático e offline) ─────────
function pixNormalizarChave(tipo, raw){
  tipo = tipo || 'celular';
  let s = String(raw || '').trim();
  if(tipo === 'cpf'){
    let d = s.replace(/\D/g, '');
    if(d.length === 11) return d;
    return '';
  }
  if(tipo === 'cnpj'){
    let d = s.replace(/\D/g, '');
    if(d.length === 14) return d;
    return '';
  }
  if(tipo === 'email'){
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return s.toLowerCase();
    return '';
  }
  if(tipo === 'aleatoria'){
    let clean = s.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    if(clean.length >= 30 && clean.length <= 36) return clean;
    return '';
  }
  // Celular (padrão Bacen: +55 + DDD + 9 dígitos)
  let d = s.replace(/\D/g, '');
  if(d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if(d.length < 10 || d.length > 11) return '';
  return '+55' + d;
}
function pixNormalizarCelular(raw){ return pixNormalizarChave('celular', raw); }

function pixTipoNome(t){
  t = t || (getPixCfg().tipo || 'celular');
  switch(t){
    case 'cpf': return 'CPF';
    case 'cnpj': return 'CNPJ';
    case 'email': return 'E-mail';
    case 'aleatoria': return 'Chave Aleatória';
    case 'celular': default: return 'Celular';
  }
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
  return !!(p.chave&&pixSemAcento(p.nome,25)&&pixSemAcento(p.cidade||'BRASIL',15));
}
function pixValorTxt(v){return (Math.round((Number(v)||0)*100)/100).toFixed(2);} // sempre com ponto e 2 casas
function pixPayload(valor, customCfg){
  const p = customCfg || getPixCfg();
  const conta = pixCampo('00','br.gov.bcb.pix') + pixCampo('01', p.chave);
  let s = pixCampo('00','01') + pixCampo('01','11') + pixCampo('26', conta) + pixCampo('52','0000') + pixCampo('53','986');
  
  // Tag 54 (Transaction Amount): Omitida quando valor livre (conforme padrão BACEN / EMV QRCPS)
  const numVal = parseFloat(valor);
  if(!isNaN(numVal) && numVal > 0.009){
    s += pixCampo('54', pixValorTxt(numVal));
  }
  s += pixCampo('58','BR') + pixCampo('59',pixSemAcento(p.nome,25)) + pixCampo('60',pixSemAcento(p.cidade||'BRASIL',15)) + pixCampo('62',pixCampo('05','***'));
  s += '6304';
  return s + pixCrc16(s);
}
function pixChaveExibicao(customCfg){
  const p = customCfg || getPixCfg();
  const t = p.tipo || 'celular';
  const c = String(p.chave || '');
  if(!c) return '';
  if(t === 'celular'){
    const d = c.replace(/\D/g, '').replace(/^55/, '');
    if(d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if(d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return c;
  }
  if(t === 'cpf'){
    const d = c.replace(/\D/g, '');
    if(d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
    return c;
  }
  if(t === 'cnpj'){
    const d = c.replace(/\D/g, '');
    if(d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
    return c;
  }
  return c;
}
function pixBloco(valor, customCfg){
  const p = customCfg || getPixCfg();
  if(!p.chave) return '';
  const numVal = parseFloat(valor) || 0;
  const isLivre = numVal <= 0.009;
  return `💳 *Pix* (${pixTipoNome(p.tipo)}): ${pixChaveExibicao(p)}${p.nome?`\nTitular: ${p.nome}`:''}${p.cidade?`\nCidade: ${p.cidade}`:''}\nValor: ${isLivre ? '✨ Valor livre (digite o valor no seu banco)' : fmt(numVal)}\n\nPix copia e cola:\n${pixPayload(numVal, p)}`;
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

// ───────── Renderizador de QR Code SVG Offline ─────────
function renderizarQrSvg(conteudo, tamanho, elementoOuCb){
  tamanho = tamanho || 200;
  if(window.QRCode && typeof QRCode.toString === 'function'){
    try {
      QRCode.toString(conteudo, { type: 'svg', width: tamanho, margin: 1, errorCorrectionLevel: 'M' }, (err, svgStr) => {
        if(!err && svgStr){
          if(typeof elementoOuCb === 'function') elementoOuCb(svgStr);
          else if(elementoOuCb) elementoOuCb.innerHTML = svgStr;
          return;
        }
        fallbackQr();
      });
      return;
    } catch(e){}
  }
  fallbackQr();

  function fallbackQr(){
    try {
      if(typeof QR !== 'undefined' && typeof QR.svg === 'function'){
        const svg = QR.svg(conteudo, tamanho);
        if(typeof elementoOuCb === 'function') elementoOuCb(svg);
        else if(elementoOuCb) elementoOuCb.innerHTML = svg;
      }
    } catch(e){
      if(typeof elementoOuCb !== 'function' && elementoOuCb){
        elementoOuCb.innerHTML = '<div style="color:var(--muted);font-size:11px;padding:12px;text-align:center">QR Code indisponível</div>';
      }
    }
  }
}

// ───────── Compartilhar Pix no WhatsApp (v5.63.0) ─────────
function pixCompartilharWhatsapp(valor, clienteOuTel, customCfg){
  const p = customCfg || getPixCfg();
  if(!p.chave){
    showToast('Configure e salve sua chave Pix primeiro', 'red');
    abrirConfigPix();
    return;
  }
  const vNum = parseFloat(valor) || 0;
  const isLivre = vNum <= 0.009;
  const payload = pixPayload(vNum, p);
  
  let msg = `💳 *Cobrança Pix — GestãoPRO*\n\n`;
  msg += `*Titular:* ${p.nome || 'TITULAR'}\n`;
  msg += `*Cidade:* ${p.cidade || 'BRASIL'}\n`;
  msg += `*Chave (${pixTipoNome(p.tipo)}):* ${pixChaveExibicao(p)}\n`;
  if(isLivre){
    msg += `*Valor:* ✨ *Valor livre* (digite o valor combinado no seu banco)\n`;
  } else {
    msg += `*Valor:* *${fmt(vNum)}*\n`;
  }
  msg += `\n*Pix Copia e Cola:*\n${payload}\n\n`;
  msg += `_Abra o app do seu banco, escolha Pix Copia e Cola e confirme os dados._\nObrigado! 😊`;

  let tel = '';
  if(clienteOuTel && typeof clienteOuTel === 'object'){
    tel = (clienteOuTel.tel || '').replace(/\D/g, '');
  } else if(clienteOuTel){
    tel = String(clienteOuTel).replace(/\D/g, '');
  }

  if(tel){
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  } else {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  }
  showToast('WhatsApp aberto com os dados do Pix!', 'green');
}

// ───────── Configurar Pix com Suporte Multi-Chaves e Prévia em Tempo Real ─────────
let _pixTipoAtual = 'celular';

function pixMudarTipo(tipo){
  _pixTipoAtual = tipo;
  const inputChave = document.getElementById('pix-chave') || document.getElementById('pix-celular');
  const labelChave = document.getElementById('pix-label-chave');
  const dicaChave = document.getElementById('pix-dica-chave');
  
  // Atualiza botões visuais de tipo
  document.querySelectorAll('.pix-tipo-btn').forEach(btn => {
    if(btn.dataset.tipo === tipo){
      btn.style.background = 'var(--gold)';
      btn.style.color = '#000';
      btn.style.borderColor = 'var(--gold)';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text)';
      btn.style.borderColor = 'var(--border)';
    }
  });

  if(inputChave){
    if(tipo === 'celular'){
      inputChave.type = 'tel';
      inputChave.placeholder = 'DDD + número (ex: 11999998888)';
      if(labelChave) labelChave.textContent = 'Celular com DDD';
      if(dicaChave) dicaChave.textContent = 'Digite com 2 dígitos de DDD + 9 dígitos de celular.';
    } else if(tipo === 'cpf'){
      inputChave.type = 'text';
      inputChave.placeholder = '000.000.000-00 (11 dígitos)';
      if(labelChave) labelChave.textContent = 'CPF do titular';
      if(dicaChave) dicaChave.textContent = 'Apenas números ou com pontos e traço.';
    } else if(tipo === 'cnpj'){
      inputChave.type = 'text';
      inputChave.placeholder = '00.000.000/0000-00 (14 dígitos)';
      if(labelChave) labelChave.textContent = 'CNPJ da empresa';
      if(dicaChave) dicaChave.textContent = '14 dígitos da sua empresa.';
    } else if(tipo === 'email'){
      inputChave.type = 'email';
      inputChave.placeholder = 'seuemail@exemplo.com';
      if(labelChave) labelChave.textContent = 'E-mail cadastrado no Pix';
      if(dicaChave) dicaChave.textContent = 'E-mail exatamente como cadastrado no seu banco.';
    } else if(tipo === 'aleatoria'){
      inputChave.type = 'text';
      inputChave.placeholder = 'Cole a chave aleatória (EVP de 32-36 caracteres)';
      if(labelChave) labelChave.textContent = 'Chave Aleatória (EVP)';
      if(dicaChave) dicaChave.textContent = 'Cole o código gerado no app do seu banco.';
    }
  }
  pixAtualizarPrevia();
}

function abrirConfigPix(){
  const p = getPixCfg();
  _pixTipoAtual = p.tipo || 'celular';
  
  const inputChave = document.getElementById('pix-chave') || document.getElementById('pix-celular');
  const inputNome = document.getElementById('pix-nome');
  const inputCidade = document.getElementById('pix-cidade');

  if(inputNome) inputNome.value = p.nome || '';
  if(inputCidade) inputCidade.value = p.cidade || 'SAO PAULO';
  
  if(inputChave){
    if(_pixTipoAtual === 'celular'){
      inputChave.value = String(p.chave || '').replace(/\D/g, '').replace(/^55/, '');
    } else {
      inputChave.value = p.chave || '';
    }
  }

  pixMudarTipo(_pixTipoAtual);
  document.getElementById('modal-config-pix').classList.add('open');
  pixAtualizarPrevia();
  
  setTimeout(() => {
    if(inputChave) inputChave.focus();
  }, 150);
}

// ───────── Controle de Prévia (Valor Livre vs Editável) ─────────
let _pixPreviaModo = 'livre'; // 'livre' | 'valor'
let _pixPreviaValor = 10.00;

function pixPreviaMudarModo(modo){
  _pixPreviaModo = modo;
  const wrapValor = document.getElementById('pix-previa-valor-wrap');
  const btnLivre = document.getElementById('pix-previa-btn-livre');
  const btnValor = document.getElementById('pix-previa-btn-valor');

  if(wrapValor) wrapValor.style.display = modo === 'valor' ? 'flex' : 'none';

  if(btnLivre && btnValor){
    if(modo === 'livre'){
      btnLivre.style.background = 'var(--gold)';
      btnLivre.style.color = '#000';
      btnLivre.style.borderColor = 'var(--gold)';
      btnValor.style.background = 'transparent';
      btnValor.style.color = 'var(--text)';
      btnValor.style.borderColor = 'var(--border)';
    } else {
      btnValor.style.background = 'var(--gold)';
      btnValor.style.color = '#000';
      btnValor.style.borderColor = 'var(--gold)';
      btnLivre.style.background = 'transparent';
      btnLivre.style.color = 'var(--text)';
      btnLivre.style.borderColor = 'var(--border)';
    }
  }
  pixAtualizarPrevia();
}

function pixPreviaAjustarValor(delta){
  _pixPreviaModo = 'valor';
  _pixPreviaValor = Math.max(0.01, round2((_pixPreviaValor || 0) + delta));
  const inp = document.getElementById('pix-previa-valor-input');
  if(inp) inp.value = _pixPreviaValor.toFixed(2);
  pixAtualizarPrevia();
}

function pixPreviaDigitarValor(valStr){
  _pixPreviaModo = 'valor';
  const n = parseFloat(String(valStr).replace(',', '.')) || 0;
  _pixPreviaValor = round2(n);
  pixAtualizarPrevia();
}

function pixAtualizarPrevia(){
  const inputChave = document.getElementById('pix-chave') || document.getElementById('pix-celular');
  const inputNome = document.getElementById('pix-nome');
  const inputCidade = document.getElementById('pix-cidade');
  const previewBox = document.getElementById('pix-preview-box');
  const previewStatus = document.getElementById('pix-preview-status');
  const previewPayload = document.getElementById('pix-preview-payload');
  const previewQr = document.getElementById('pix-preview-qr');
  const previewTituloCod = document.getElementById('pix-preview-titulo-cod');
  const titularSanitizado = document.getElementById('pix-titular-sanitizado');

  if(!inputChave || !inputNome) return;

  const bruto = inputChave.value.trim();
  const nome = inputNome.value.trim();
  const cidade = (inputCidade ? inputCidade.value.trim() : '') || 'SAO PAULO';

  if(titularSanitizado){
    titularSanitizado.textContent = pixSemAcento(nome, 25) || '(sem titular)';
  }

  const chaveNorm = pixNormalizarChave(_pixTipoAtual, bruto);

  if(!chaveNorm){
    if(previewStatus) previewStatus.innerHTML = '<span style="color:var(--muted)">⚠️ Digite uma chave válida acima para gerar a prévia offline</span>';
    if(previewBox) previewBox.style.opacity = '0.5';
    if(previewPayload) previewPayload.textContent = 'Aguardando chave válida...';
    if(previewQr) previewQr.innerHTML = '<div style="width:120px;height:120px;border:1px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:11px">QR Code</div>';
    return;
  }

  if(previewBox) previewBox.style.opacity = '1';
  
  const isLivre = (_pixPreviaModo === 'livre');
  if(previewStatus){
    if(isLivre){
      previewStatus.innerHTML = `<span style="color:var(--gold);font-weight:700">✨ Pix Livre (cliente digita valor) · Bacen</span>`;
    } else {
      previewStatus.innerHTML = `<span style="color:#4CC38A;font-weight:700">✓ Pix Fixo (${fmt(_pixPreviaValor)}) · Bacen</span>`;
    }
  }

  if(previewTituloCod){
    previewTituloCod.textContent = isLivre ? 'Código Pix Livre (Tag 54 omitida):' : `Código Pix (R$ ${_pixPreviaValor.toFixed(2)}):`;
  }

  // Payload configurado
  const fakeCfg = { chave: chaveNorm, tipo: _pixTipoAtual, nome: nome || 'MEU NOME', cidade: cidade || 'BRASIL' };
  const valorParaPayload = isLivre ? 0 : _pixPreviaValor;
  const payloadTeste = pixPayload(valorParaPayload, fakeCfg);

  if(previewPayload) previewPayload.textContent = payloadTeste;

  if(previewQr){
    renderizarQrSvg(payloadTeste, 120, previewQr);
  }
}

function pixPreviaMostrarNaTela(){
  const inputChave = document.getElementById('pix-chave') || document.getElementById('pix-celular');
  const inputNome = document.getElementById('pix-nome');
  const inputCidade = document.getElementById('pix-cidade');
  const bruto = inputChave ? inputChave.value.trim() : '';
  const nome = inputNome ? inputNome.value.trim() : '';
  const cidade = inputCidade ? inputCidade.value.trim() : '';
  const chave = pixNormalizarChave(_pixTipoAtual, bruto);

  if(!chave || !pixSemAcento(nome, 25)){
    showToast('Informe chave e nome do titular válidos primeiro', 'red');
    return;
  }

  const cfgTemp = { chave, tipo: _pixTipoAtual, nome, cidade: cidade || 'SAO PAULO' };
  const v = _pixPreviaModo === 'livre' ? 0 : _pixPreviaValor;
  pixMostrarNaTela(v, { customCfg: cfgTemp });
}

function pixPreviaCompartilharWhats(){
  const inputChave = document.getElementById('pix-chave') || document.getElementById('pix-celular');
  const inputNome = document.getElementById('pix-nome');
  const inputCidade = document.getElementById('pix-cidade');
  const bruto = inputChave ? inputChave.value.trim() : '';
  const nome = inputNome ? inputNome.value.trim() : '';
  const cidade = inputCidade ? inputCidade.value.trim() : '';
  const chave = pixNormalizarChave(_pixTipoAtual, bruto);

  if(!chave || !pixSemAcento(nome, 25)){
    showToast('Informe chave e nome do titular válidos primeiro', 'red');
    return;
  }

  const cfgTemp = { chave, tipo: _pixTipoAtual, nome, cidade: cidade || 'SAO PAULO' };
  const v = _pixPreviaModo === 'livre' ? 0 : _pixPreviaValor;
  pixCompartilharWhatsapp(v, null, cfgTemp);
}

// ───────── MODO APRESENTAÇÃO NA TELA DO CELULAR (Item 1 Aprovado) ─────────
let _pixTelaValorAtual = 0; // 0 = livre
let _pixTelaModo = 'livre'; // 'livre' | 'valor'
let _pixTelaCliente = null;
let _pixTelaCustomCfg = null;

function pixMostrarNaTela(valorInicial, opts){
  opts = opts || {};
  _pixTelaCustomCfg = opts.customCfg || null;
  const cfg = _pixTelaCustomCfg || getPixCfg();
  if(!cfg.chave){
    showToast('Configure e salve sua chave Pix antes de apresentar ao cliente', 'red');
    abrirConfigPix();
    return;
  }

  _pixTelaCliente = opts.cliente || null;
  const num = parseFloat(valorInicial);
  if(!isNaN(num) && num > 0.009){
    _pixTelaValorAtual = round2(num);
    _pixTelaModo = 'valor';
  } else {
    _pixTelaValorAtual = 0;
    _pixTelaModo = 'livre';
  }

  pixTelaAlternarCodigo(false);
  pixAtualizarTelaCelular();
  const m = document.getElementById('modal-pix-tela');
  if(m) m.classList.add('open');
  if(window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

function pixTelaMudarModo(modo, valor){
  _pixTelaModo = modo;
  if(modo === 'livre'){
    _pixTelaValorAtual = 0;
  } else if(typeof valor !== 'undefined'){
    _pixTelaValorAtual = round2(parseFloat(valor) || 10);
  } else if(_pixTelaValorAtual <= 0.009){
    _pixTelaValorAtual = 10.00;
  }
  pixAtualizarTelaCelular();
}

function pixTelaAjustarValor(delta){
  _pixTelaModo = 'valor';
  _pixTelaValorAtual = Math.max(0, round2((_pixTelaValorAtual || 0) + delta));
  if(_pixTelaValorAtual <= 0.009){
    _pixTelaModo = 'livre';
    _pixTelaValorAtual = 0;
  }
  pixAtualizarTelaCelular();
}

function pixTelaDigitarValor(valStr){
  _pixTelaModo = 'valor';
  const n = parseFloat(String(valStr).replace(',', '.')) || 0;
  _pixTelaValorAtual = round2(n);
  if(_pixTelaValorAtual <= 0.009){
    _pixTelaModo = 'livre';
    _pixTelaValorAtual = 0;
  }
  pixAtualizarTelaCelular();
}

function pixTelaAlternarCodigo(forcar){
  const box = document.getElementById('pix-tela-payload');
  const btn = document.getElementById('pix-tela-btn-codigo');
  if(!box) return;
  const abrir = (typeof forcar === 'boolean') ? forcar : (box.style.display === 'none');
  box.style.display = abrir ? 'block' : 'none';
  if(btn){
    btn.innerHTML = `<i data-lucide="${abrir?'chevron-up':'chevron-down'}" class="ic"></i> ${abrir?'Ocultar código Pix':'Ver código Pix'}`;
    if(window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
  }
}
function pixAtualizarTelaCelular(){
  const p = _pixTelaCustomCfg || getPixCfg();
  const isLivre = (_pixTelaModo === 'livre' || _pixTelaValorAtual <= 0.009);
  const valorParaPayload = isLivre ? 0 : _pixTelaValorAtual;
  const payload = pixPayload(valorParaPayload, p);

  const qrEl = document.getElementById('pix-tela-qr');
  const titularEl = document.getElementById('pix-tela-titular');
  const cidadeEl = document.getElementById('pix-tela-cidade');
  const chaveEl = document.getElementById('pix-tela-chave');
  const tipoEl = document.getElementById('pix-tela-tipo');
  const valorBadgeEl = document.getElementById('pix-tela-valor-badge');
  const valorInputEl = document.getElementById('pix-tela-valor-input');
  const payloadEl = document.getElementById('pix-tela-payload');
  const ajusteBox = document.getElementById('pix-tela-ajuste-valor-box');

  if(titularEl) titularEl.textContent = p.nome || 'TITULAR';
  if(cidadeEl) cidadeEl.textContent = p.cidade || 'BRASIL';
  if(chaveEl) chaveEl.textContent = pixChaveExibicao(p);
  if(tipoEl) tipoEl.textContent = pixTipoNome(p.tipo);

  if(ajusteBox){
    ajusteBox.style.display = isLivre ? 'none' : 'block';
  }

  if(valorBadgeEl){
    if(isLivre){
      valorBadgeEl.innerHTML = `<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(201,162,75,.15);border:1px solid rgba(201,162,75,.4);color:var(--gold);padding:8px 16px;border-radius:24px;font-weight:700;font-size:13.5px">
        ✨ Modo Valor Livre <span style="font-size:11px;font-weight:400;color:var(--muted)">· cliente digita no banco</span>
      </div>`;
    } else {
      valorBadgeEl.innerHTML = `<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(76,195,138,.15);border:1px solid rgba(76,195,138,.4);color:#4CC38A;padding:8px 20px;border-radius:24px;font-weight:900;font-size:20px;letter-spacing:.3px">
        ${fmt(_pixTelaValorAtual)}
      </div>`;
    }
  }

  // valor grande acima do QR (só no modo Valor Editável); o selo de baixo fica só no modo livre
  const grandeEl = document.getElementById('pix-tela-valor-grande');
  if(grandeEl){
    if(isLivre){ grandeEl.style.display = 'none'; grandeEl.innerHTML = ''; }
    else {
      grandeEl.style.display = 'block';
      grandeEl.innerHTML = `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)">Valor a pagar</div><div style="font-size:34px;font-weight:900;color:var(--green);line-height:1.1">${fmt(_pixTelaValorAtual)}</div>`;
    }
  }
  if(valorBadgeEl && !isLivre) valorBadgeEl.innerHTML = '';

  if(valorInputEl && document.activeElement !== valorInputEl){
    valorInputEl.value = isLivre ? '' : _pixTelaValorAtual.toFixed(2);
  }

  if(payloadEl) payloadEl.textContent = payload;

  if(qrEl){
    renderizarQrSvg(payload, 230, qrEl);
  }

  const btnLivre = document.getElementById('pix-tela-btn-livre');
  const btnValor = document.getElementById('pix-tela-btn-valor');
  if(btnLivre && btnValor){
    if(isLivre){
      btnLivre.style.background = 'var(--gold)';
      btnLivre.style.color = '#000';
      btnLivre.style.borderColor = 'var(--gold)';
      btnValor.style.background = 'transparent';
      btnValor.style.color = 'var(--text)';
      btnValor.style.borderColor = 'var(--border)';
    } else {
      btnValor.style.background = 'var(--gold)';
      btnValor.style.color = '#000';
      btnValor.style.borderColor = 'var(--gold)';
      btnLivre.style.background = 'transparent';
      btnLivre.style.color = 'var(--text)';
      btnLivre.style.borderColor = 'var(--border)';
    }
  }
}

function salvarConfigPix(){
  const inputChave = document.getElementById('pix-chave') || document.getElementById('pix-celular');
  const inputNome = document.getElementById('pix-nome');
  const inputCidade = document.getElementById('pix-cidade');

  const bruto = inputChave ? inputChave.value.trim() : '';
  const nome = inputNome ? inputNome.value.trim() : '';
  const cidade = inputCidade ? inputCidade.value.trim() : '';

  if(!bruto && !nome && !cidade){ // tudo vazio = remover Pix
    state.pix = { ...PIX_PADRAO };
    marcarAlterado();
    closeModal('modal-config-pix');
    showToast('Pix removido com sucesso', 'green');
    if(typeof renderDashPixBanner === 'function') renderDashPixBanner();
    return;
  }

  const chave = pixNormalizarChave(_pixTipoAtual, bruto);
  if(!chave){
    if(_pixTipoAtual === 'celular') showToast('Celular inválido — digite DDD + número (ex: 11999998888)', 'red');
    else if(_pixTipoAtual === 'cpf') showToast('CPF inválido — digite os 11 dígitos', 'red');
    else if(_pixTipoAtual === 'cnpj') showToast('CNPJ inválido — digite os 14 dígitos', 'red');
    else if(_pixTipoAtual === 'email') showToast('E-mail inválido — digite um e-mail válido', 'red');
    else showToast('Chave aleatória inválida — cole a chave completa de 32 a 36 caracteres', 'red');
    return;
  }

  if(!pixSemAcento(nome, 25)){
    showToast('Informe o nome do titular (como aparece no banco)', 'red');
    return;
  }

  const cidadeFinal = cidade || 'SAO PAULO';
  if(!pixSemAcento(cidadeFinal, 15)){
    showToast('Informe a cidade (máx. 15 caracteres)', 'red');
    return;
  }

  state.pix = {
    chave,
    tipo: _pixTipoAtual,
    nome: nome,
    cidade: cidadeFinal
  };

  marcarAlterado();
  closeModal('modal-config-pix');
  showToast('✅ Chave Pix configurada! Códigos offline ativados.', 'green');

  if(typeof renderDashPixBanner === 'function') renderDashPixBanner();
  const pg = document.querySelector('.page.active');
  if(pg && pg.id === 'page-dashboard' && typeof renderDashboard === 'function') renderDashboard();
}

function removerConfigPix(){
  confirmarAcao('Deseja realmente remover os dados da chave Pix?', () => {
    state.pix = { ...PIX_PADRAO };
    marcarAlterado();
    closeModal('modal-config-pix');
    showToast('Chave Pix desativada', 'green');
    if(typeof renderDashPixBanner === 'function') renderDashPixBanner();
    const pg = document.querySelector('.page.active');
    if(pg && pg.id === 'page-dashboard' && typeof renderDashboard === 'function') renderDashboard();
  });
}

function copiarPixPrevia(){
  const previewPayload = document.getElementById('pix-preview-payload');
  if(previewPayload && previewPayload.textContent && !previewPayload.textContent.includes('Aguardando')){
    copiarTexto(previewPayload.textContent, 'Código Pix Copia e Cola copiado com sucesso!');
  } else {
    showToast('Digite uma chave e titular válidos primeiro', 'red');
  }
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
  const btnTelaExtrato = document.getElementById('extrato-btn-pix-tela');
  if(btnTelaExtrato) btnTelaExtrato.style.display = mostrarPix ? '' : 'none';
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
  getUnidadesFiadoFlat().filter(u=>u.status!=='pago'&&u.vencimento).forEach(u=>{
    const o=porCliente[u.clienteId]||(porCliente[u.clienteId]={vencimento:u.vencimento,vencido:0,us:[]});
    if(u.vencimento>o.vencimento) o.vencimento=u.vencimento;
    o.vencido+=u.valorRestante;
    o.us.push(u);
  });
  const todos=Object.keys(porCliente).map(k=>{
    const id=parseInt(k),c=getCliente(id),o=porCliente[k];
    const prom=(typeof promessaEstado==='function')?promessaEstado(id,hoje,o.us):null;
    return {id,c,vencimento:o.vencimento,vencido:round2(o.vencido),dias:diasEntre(o.vencimento,hoje),enc:calcEncargosCliente(id,hoje).total,uc:textoUltimaCobranca(c,hoje),prom};
  });
  // promessa ativa cobrindo todo o saldo: sai da lista até a data (v5.42)
  const prometidos=todos.filter(l=>l.prom&&l.prom.estado==='ativa'&&l.prom.cobreTudo).sort((a,b)=>a.prom.data.localeCompare(b.prom.data));
  const lista=todos.filter(l=>prometidos.indexOf(l)<0);
  const jaHoje=lista.filter(l=>l.uc.hoje).length;
  const totalVencido=round2(lista.reduce((s,l)=>s+l.vencido,0));
  const quebrada=(l)=>(l.prom&&l.prom.estado==='quebrada')?1:0;
  const vis=(cobrancaOcultarHoje?lista.filter(l=>!l.uc.hoje):lista).sort((a,b)=>String(b.vencimento||'').localeCompare(String(a.vencimento||''))||quebrada(b)-quebrada(a)||b.vencido-a.vencido);
  if(todos.length===0){
    el.innerHTML='<div style="text-align:center;padding:60px 20px"><h3 style="color:var(--green)">Nada para cobrar hoje</h3><p style="color:var(--muted);margin-top:8px">Nenhum fiado vencido ou vencendo hoje.</p></div>';
    return;
  }
  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;font-size:13px">
      <span><strong>${lista.length}</strong> cliente(s) · em aberto <strong style="color:var(--red)">${fmt(totalVencido)}</strong> · <strong>${jaHoje}</strong> já cobrado(s) hoje${prometidos.length?' · <strong>'+prometidos.length+'</strong> com promessa':''}</span>
      <label style="display:flex;align-items:center;gap:6px;color:var(--muted);cursor:pointer"><input type="checkbox" style="width:auto;margin:0" ${cobrancaOcultarHoje?'checked':''} onchange="toggleCobrancaOcultarHoje(this.checked)"> Ocultar já cobrados hoje</label>
    </div>
    <div class="table-card table-cards"><div class="table-scroll"><table>
      <thead><tr><th>Cliente</th><th>Vencimento</th><th>Em aberto</th><th>Última cobrança</th><th></th></tr></thead>
      <tbody>${vis.length===0?'<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">'+(lista.length===0?'Todos os clientes vencidos têm promessa em dia ✓':'Todos já foram cobrados hoje ✓')+'</td></tr>':vis.map(l=>{
        const cor=l.dias>0?'var(--red)':l.dias===0?'#d35400':'var(--blue)';
        const status=l.dias>0?`${l.dias}d atraso`:l.dias===0?'Hoje':`Vence em ${Math.abs(l.dias)}d`;
        return `<tr style="${l.uc.hoje?'opacity:.6':''}${l.prom&&l.prom.estado==='quebrada'?';background:rgba(192,57,43,.12)':''}">
          <td data-label="Cliente"><strong class="nome-cartao-link" onclick="abrirCartaoCliente(${l.c.id})">${escapeHtml(l.c.nome)}</strong>${l.uc.hoje?' <span class="badge badge-green">Cobrado hoje</span>':''}${cobrancaPromBadge(l.prom)}<br><span style="font-size:11px;color:var(--muted)">${escapeHtml(l.c.tel||'sem telefone')}</span></td>
          <td data-label="Vencimento"><span style="color:${cor};font-weight:600;font-size:12px">${fmtDate(l.vencimento)}</span><br><span style="font-size:11px;color:${cor}">${status}</span></td>
          <td data-label="Em aberto" class="debt-amount">${fmt(l.vencido)}${l.enc>0?`<div style="font-size:11px;color:var(--muted);font-weight:400">+ ${fmt(l.enc)} encargos</div>`:''}</td>
          <td data-label="Última cobrança" style="font-size:12px">${l.uc.txt}</td>
          <td><div class="actions-cell"><button class="btn btn-green btn-sm" onclick="abrirPagamento(${l.id})" title="Receber"><i data-lucide="banknote" class="ic"></i></button><button class="btn btn-outline btn-sm" onclick="abrirPromessa(${l.id})" title="Promessa de pagamento"><i data-lucide="handshake" class="ic"></i></button><button class="btn btn-outline btn-sm" onclick="abrirRenegociar(${l.id})" title="Renegociar dívida"><i data-lucide="refresh-cw" class="ic"></i></button>${l.c.tel?`<button class="btn btn-whatsapp btn-sm" onclick="cobrarWhatsapp(${l.id})" title="Cobrar por WhatsApp"><i data-lucide="message-circle" class="ic"></i></button>`:''}</div></td>
        </tr>`;}).join('')}</tbody>
    </table></div></div>`+cobrancaPrometidosHtml(prometidos);
  if(typeof lucide!=='undefined') lucide.createIcons();
}
