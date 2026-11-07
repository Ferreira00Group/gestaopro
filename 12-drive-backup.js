// ============ BACKUP AUTOMÁTICO NO GOOGLE DRIVE ============
// Usa o Google Identity Services (100% client-side, sem precisar de servidor
// próprio). Escopo mínimo (drive.file): o app só enxerga os arquivos que ele
// mesmo cria — não tem acesso ao resto do seu Google Drive.
//
// Importante ser honesto sobre o limite disso: a PRIMEIRA conexão sempre
// pede consentimento manual (exigência do próprio Google, não dá pra pular).
// Depois disso, o navegador tenta renovar o acesso sem interação sempre que
// possível — na prática funciona "invisível" na maioria das vezes, mas
// pode falhar silenciosamente em alguns casos (sessão do Google expirada,
// navegador bloqueando o fluxo). Quando isso acontece, o lembrete manual
// (que já existe) continua de pé como rede de segurança — ele só deixa de
// aparecer quando um backup (local ou do Drive) realmente aconteceu.

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_ARQUIVO_NOME = 'gestaopro-backup.json';
let driveTokenClient = null;
let driveAccessToken = null;

function obterTokenDriveArmazenado(){
  try {
    const salvo = sessionStorage.getItem('gp_drive_token');
    const expira = parseInt(sessionStorage.getItem('gp_drive_expira') || '0', 10);
    if(salvo && expira > Date.now()){
      return salvo;
    }
  } catch(e){}
  return null;
}

function salvarTokenDrive(token, expiresIn = 3500){
  driveAccessToken = token;
  try {
    sessionStorage.setItem('gp_drive_token', token);
    sessionStorage.setItem('gp_drive_expira', String(Date.now() + (expiresIn * 1000)));
  } catch(e){}
}

function driveDisponivel(){
  return typeof GOOGLE_CLIENT_ID === 'string' && GOOGLE_CLIENT_ID.trim().length > 0;
}

function initGoogleDriveClient(){
  if(!driveDisponivel()) return;
  if(typeof google === 'undefined' || !google.accounts){
    setTimeout(initGoogleDriveClient, 800); // script do Google ainda carregando
    return;
  }
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: '' // definido a cada chamada, ver conectarGoogleDrive/tentarBackupSilenciosoDrive
  });
  driveAccessToken = obterTokenDriveArmazenado();
  atualizarStatusDrive();
}

function conectarGoogleDrive(){
  if(!driveDisponivel()){ showToast('Google Drive ainda não foi configurado neste app','red'); return; }
  if(!driveTokenClient){ showToast('Carregando o Google Drive, tenta de novo em um instante','red'); return; }
  driveTokenClient.callback = async (resposta)=>{
    if(resposta.error){ showToast('Não foi possível conectar ao Google Drive','red'); return; }
    salvarTokenDrive(resposta.access_token, resposta.expires_in || 3500);
    state.driveBackupAtivo = true;
    marcarAlterado();
    atualizarStatusDrive();
    showToast('Google Drive conectado ✓ Enviando o primeiro backup...','green');
    await enviarBackupParaDrive();
  };
  driveTokenClient.requestAccessToken({prompt:'consent'});
}

function desconectarGoogleDrive(){
  confirmarAcao('Isso desliga o backup automático no Google Drive (os backups que já foram enviados continuam lá, no seu Drive). Continuar?', ()=>{
    if(driveAccessToken && typeof google!=='undefined' && google.accounts){
      google.accounts.oauth2.revoke(driveAccessToken, ()=>{});
    }
    driveAccessToken = null;
    try { sessionStorage.removeItem('gp_drive_token'); sessionStorage.removeItem('gp_drive_expira'); } catch(e){}
    state.driveBackupAtivo = false;
    marcarAlterado();
    atualizarStatusDrive();
    showToast('Google Drive desconectado','green');
  });
}

// Tenta renovar o acesso sem mostrar nada na tela — se não tiver token ativo
// na sessão, NÃO abre pop-up para não interromper a abertura do app!
function tentarBackupSilenciosoDrive(forcar=false){
  if(!driveDisponivel() || !state.driveBackupAtivo || !driveTokenClient) return;
  if(!driveAccessToken){
    driveAccessToken = obterTokenDriveArmazenado();
  }
  // Se não há token ativo em sessão, não interrompe o usuário ao abrir o app
  if(!driveAccessToken) return;

  if(!forcar){
    if(diasDesde(state.ultimoBackup) < 1 && (Date.now()-(state.driveUltimaTentativa||0)) < (1000*60*20)) return;
  }
  state.driveUltimaTentativa = Date.now();
  enviarBackupParaDrive({silencioso:true}).then(()=>{
    if(typeof atualizarIndicadorBackup === 'function') atualizarIndicadorBackup();
  }).catch(()=>{});
}

// ═══ PROTEÇÃO CONTRA SOBRESCRITA CEGA (v5.33.4) ═══
// Antes de gravar por cima do arquivo do Drive, o app:
//  1) lê o arquivo que já está lá;
//  2) NÃO sobrescreve (e pergunta) se o que está no Drive parece "maior" ou mais novo que
//     este aparelho: bem menos registros aqui, ou outro aparelho gravou desde a última
//     sincronização deste;
//  3) guarda a versão anterior do Drive em "gestaopro-backup-anterior.json" (1ª gravação do dia,
//     ou sempre que você confirmar uma sobrescrita suspeita), então um backup ruim nunca
//     apaga a última versão boa.
// No modo silencioso (renovação automática) nunca sobrescreve sem perguntar: só avisa e
// deixa o lembrete manual de backup continuar valendo.
const DRIVE_ANTERIOR_NOME = 'gestaopro-backup-anterior.json';
const DRIVE_SYNC_KEY = STORAGE_KEY + '_drive_sync'; // fora do state: não entra em backup
const DRIVE_LISTAS_CONTAGEM = ['clientes','produtos','materias','vendas','pagamentos','financeiro','producoes','compras','fornecedores'];
let _driveEnviando = false;
let _driveAvisoBloqueioMostrado = false;

function driveIdDispositivo(){
  try{
    let id = localStorage.getItem(DRIVE_SYNC_KEY+'_id');
    if(!id){ id = 'd'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); localStorage.setItem(DRIVE_SYNC_KEY+'_id', id); }
    return id;
  }catch(e){ return 'sem-id'; }
}
function driveLerSync(){
  try{ return JSON.parse(localStorage.getItem(DRIVE_SYNC_KEY)||'null') || {}; }catch(e){ return {}; }
}
function driveSalvarSync(gravadoEm){
  try{ localStorage.setItem(DRIVE_SYNC_KEY, JSON.stringify({ultimaSync:gravadoEm})); }catch(e){}
}
function driveContarRegistros(obj){
  if(!obj || typeof obj!=='object') return 0;
  return DRIVE_LISTAS_CONTAGEM.reduce((t,k)=>t+(Array.isArray(obj[k])?obj[k].length:0),0);
}
async function driveChecar(resposta){
  if(resposta.ok) return resposta;
  let detalhe = '';
  try{ const c = await resposta.clone().json(); detalhe = c.error && c.error.message ? c.error.message : ''; }catch(e){}
  const e = new Error('Drive HTTP '+resposta.status+(detalhe?': '+detalhe:''));
  e.status = resposta.status; e.detalhe = detalhe;
  throw e;
}
async function driveBuscarArquivo(nome){
  const q = encodeURIComponent(`name='${nome}' and trashed=false`);
  const ord = encodeURIComponent('modifiedTime desc');
  const r = await driveChecar(await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&orderBy=${ord}&pageSize=1&fields=files(id,name,modifiedTime,appProperties)`,
    { headers:{Authorization:'Bearer '+driveAccessToken} }
  ));
  const d = await r.json();
  return (d.files && d.files[0]) || null;
}
async function driveLerTexto(id){
  const r = await driveChecar(await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
    { headers:{Authorization:'Bearer '+driveAccessToken} }
  ));
  return await r.text();
}
// Cria (existente=null) ou atualiza o arquivo, sempre com conteúdo + metadados (appProperties)
async function driveGravarArquivo(nome, conteudo, existente, props){
  const boundary = 'gestaopro_backup_boundary';
  const metadata = JSON.stringify(existente ? {appProperties:props} : {name:nome, appProperties:props});
  const corpo =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`+
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${conteudo}\r\n`+
    `--${boundary}--`;
  const url = existente
    ? `https://www.googleapis.com/upload/drive/v3/files/${existente.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  await driveChecar(await fetch(url,{
    method: existente ? 'PATCH' : 'POST',
    headers:{Authorization:'Bearer '+driveAccessToken,'Content-Type':`multipart/related; boundary=${boundary}`},
    body: corpo
  }));
}

// Retorna a lista de motivos pelos quais NÃO se deve sobrescrever o Drive sem perguntar
function driveMotivosBloqueio(textoRemoto, remoto){
  const motivos = [];
  let obj = null;
  try{ obj = JSON.parse(textoRemoto); }catch(e){ return motivos; } // Drive ilegível: nada a proteger (a cópia anterior ainda é guardada)
  const nRemoto = driveContarRegistros(obj);
  const nLocal = driveContarRegistros(state);
  if(nRemoto >= 10 && nLocal < nRemoto*0.7){
    motivos.push(`O backup no Drive tem <strong>${nRemoto}</strong> registros (clientes, vendas, produtos...) e este aparelho tem só <strong>${nLocal}</strong>.`);
  }
  const props = (remoto && remoto.appProperties) || {};
  if(props.dispositivo && props.dispositivo !== driveIdDispositivo()){
    const gravadoEm = Number(props.gravadoEm) || 0;
    const minhaSync = Number(driveLerSync().ultimaSync) || 0;
    if(gravadoEm > minhaSync){
      const quando = gravadoEm ? new Date(gravadoEm).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
      motivos.push(`O backup no Drive foi gravado por <strong>outro aparelho</strong>${quando?' em '+quando:''}, depois da última vez que este aparelho sincronizou.`);
    }
  }
  return motivos;
}
function driveAvisarBloqueio(motivos, silencioso){
  const lista = '<ul style="margin:8px 0 8px 18px;padding:0">'+motivos.map(m=>`<li>${m}</li>`).join('')+'</ul>';
  if(silencioso){
    if(_driveAvisoBloqueioMostrado) return; // 1 aviso por sessão
    _driveAvisoBloqueioMostrado = true;
    abrirAvisoDados('☁️ Backup do Drive NÃO foi enviado',
      'Para não sobrescrever dados melhores, o envio automático foi pausado:'+lista+
      'Os dados do Drive continuam intactos. Para decidir, toque em <strong>☁️ Drive conectado (tocar p/ testar)</strong> no menu.',
      [{texto:'Entendi',classe:'btn-primary'}]);
    return;
  }
  abrirAvisoDados('☁️ Conferir antes de sobrescrever',
    'O Drive já tem um backup e ele parece diferente do que está aqui:'+lista+
    'Se continuar, o backup atual do Drive é guardado antes como <strong>'+DRIVE_ANTERIOR_NOME+'</strong>, e o novo o substitui.',
    [{texto:'Sobrescrever mesmo assim',classe:'btn-outline',acao:()=>enviarBackupParaDrive({forcar:true})},
     {texto:'Cancelar',classe:'btn-primary'}]);
}

async function enviarBackupParaDrive(opts){
  opts = opts || {};
  if(!driveAccessToken) return false;
  if(_bloquearGravacao || _estadoNaoConfiavel){
    // o state atual são dados de exemplo por falha de leitura: nunca mandar isso pro Drive
    showToast('Backup no Drive pausado: os dados deste aparelho não foram lidos corretamente','red');
    return false;
  }
  if(_driveEnviando) return false;
  _driveEnviando = true;
  try{
    const remoto = await driveBuscarArquivo(DRIVE_ARQUIVO_NOME);
    let textoRemoto = null;
    if(remoto) textoRemoto = await driveLerTexto(remoto.id);

    if(remoto && !opts.forcar){
      const motivos = driveMotivosBloqueio(textoRemoto, remoto);
      if(motivos.length){ driveAvisarBloqueio(motivos, !!opts.silencioso); return false; }
    }

    if(remoto){
      // guarda a versão que está no Drive antes de substituí-la
      const ant = await driveBuscarArquivo(DRIVE_ANTERIOR_NOME);
      const rotacionadoHoje = ant && new Date(ant.modifiedTime).toDateString() === new Date().toDateString();
      if(opts.forcar || !ant || !rotacionadoHoje){
        await driveGravarArquivo(DRIVE_ANTERIOR_NOME, textoRemoto, ant, {tipo:'anterior'});
      }
    }

    const gravadoEm = Date.now();
    await driveGravarArquivo(DRIVE_ARQUIVO_NOME, JSON.stringify(state, null, 2), remoto, {
      dispositivo: driveIdDispositivo(),
      gravadoEm: String(gravadoEm),
      registros: String(driveContarRegistros(state))
    });
    driveSalvarSync(gravadoEm);
    state.ultimoBackup = Date.now();
    state.snoozeBackupAte = null;
    salvarDados();
    showToast('Backup salvo no Google Drive ✓','green');
    return true;
  }catch(e){
    if(e && e.status === 401) driveAccessToken = null; // token expirou: renova na próxima
    if(!opts.silencioso){
      showToast(`Backup no Drive falhou${e && e.status?' ('+e.status+(e.detalhe?': '+e.detalhe:'')+')':''}`,'red');
    }
    console.warn('[GestãoPRO] Falha no backup do Drive:', e);
    return false;
  }finally{
    _driveEnviando = false;
  }
}

// ═══ RESTAURAR DO GOOGLE DRIVE (v5.33.5) ═══
// Caminho inverso do backup: baixa o arquivo do Drive e substitui os dados deste aparelho.
// Funciona mesmo sem o backup automático ligado (ex: aparelho novo) — pede a conexão ao Google.
// Antes de aplicar, guarda o estado atual (mesmo snapshot do "Importar backup"), então dá pra
// desfazer em "↩️ Restaurar estado anterior".
function driveGarantirToken(depois){
  if(driveAccessToken){ depois(); return; }
  if(!driveDisponivel()){ showToast('Google Drive ainda não foi configurado neste app','red'); return; }
  if(!driveTokenClient){ showToast('Carregando o Google Drive, tenta de novo em um instante','red'); return; }
  driveTokenClient.callback = (resposta)=>{
    if(resposta.error){ showToast('Não foi possível conectar ao Google Drive','red'); return; }
    driveAccessToken = resposta.access_token;
    depois();
  };
  driveTokenClient.requestAccessToken({prompt: state.driveBackupAtivo ? '' : 'consent'});
}

// O toast fica por cima do canto inferior direito (onde ficam os botões dos modais) por 3s:
// some antes de abrir qualquer modal, senão engole o toque em "Confirmar".
function driveLimparToast(){
  const t=document.getElementById('toast');
  if(t) t.classList.remove('show');
}

function restaurarDoDrive(){
  driveGarantirToken(async ()=>{
    try{
      showToast('Buscando backup no Drive...','');
      const principal = await driveBuscarArquivo(DRIVE_ARQUIVO_NOME);
      const anterior = await driveBuscarArquivo(DRIVE_ANTERIOR_NOME);
      if(!principal && !anterior){ showToast('Nenhum backup encontrado no seu Google Drive','red'); return; }
      const fmt = (f)=> new Date(f.modifiedTime).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
      const botoes = [];
      if(principal) botoes.push({texto:'Restaurar o mais recente', classe:'btn-primary', acao:()=>driveRestaurarArquivo(principal,false)});
      if(anterior) botoes.push({texto:'Restaurar a versão anterior', classe:'btn-outline', acao:()=>driveRestaurarArquivo(anterior,true)});
      botoes.push({texto:'Cancelar', classe:'btn-outline'});
      let corpo = 'Isso substitui os dados deste aparelho pelos do Drive. Antes, o app guarda o estado atual: dá pra desfazer em ⚙️ Backup e manutenção → ↩️ Restaurar estado anterior.<ul style="margin:8px 0 0 18px;padding:0">';
      if(principal) corpo += `<li><strong>Mais recente:</strong> ${fmt(principal)}</li>`;
      if(anterior) corpo += `<li><strong>Versão anterior:</strong> ${fmt(anterior)}</li>`;
      corpo += '</ul>';
      driveLimparToast();
      abrirAvisoDados('☁️ Restaurar do Google Drive', corpo, botoes);
    }catch(e){
      if(e && e.status === 401) driveAccessToken = null;
      showToast(`Não consegui acessar o Drive${e && e.status?' ('+e.status+')':''}`,'red');
      console.warn('[GestãoPRO] Falha ao buscar backup no Drive:', e);
    }
  });
}

async function driveRestaurarArquivo(arquivo, ehAnterior){
  let raw;
  try{
    showToast('Baixando backup...','');
    raw = JSON.parse(await driveLerTexto(arquivo.id));
  }catch(e){
    if(e && e.status === 401) driveAccessToken = null;
    showToast('Não consegui ler o backup do Drive (arquivo inválido ou sem conexão)','red');
    console.warn('[GestãoPRO] Falha ao ler backup do Drive:', e);
    return;
  }
  if(!validarShapeBackup(raw)){ showToast('O arquivo no Drive não parece ser um backup do GestãoPRO','red'); return; }
  const n = driveContarRegistros(raw);
  const aplicar = (comSnapshot)=>{
    aplicarDadosNoState(raw);
    if(!ehAnterior){
      const g = Number(arquivo.appProperties && arquivo.appProperties.gravadoEm) || Date.now();
      driveSalvarSync(g); // este aparelho agora está em dia com o Drive
    }
    salvarDados();
    rerenderAposTrocaDeDados();
    atualizarLinksProtecao();
    atualizarStatusDrive();
    if(comSnapshot){
      abrirAvisoDados('Restaurado do Drive',
        'Seus dados foram substituídos pelos do Drive.<br><br>Se foi engano, abra ⚙️ Backup e manutenção e toque em <strong>↩️ Restaurar estado anterior</strong>.',
        [{texto:'Entendi',classe:'btn-primary'}]);
    } else {
      showToast('Restaurado do Drive ✓','green');
    }
  };
  driveLimparToast();
  confirmarAcao(`Substituir os dados deste aparelho pelo backup do Drive (${n} registros)?`, ()=>{
    const r = criarSnapshot('Antes de restaurar do Drive');
    if(r === false){
      confirmarAcao('Não consegui guardar uma cópia do estado atual (sem espaço no aparelho). Se continuar, NÃO dá pra desfazer. Continuar mesmo assim?', ()=>aplicar(false));
      return;
    }
    aplicar(r === true);
  });
}

// ── UI do rodapé da sidebar ──
function atualizarStatusDrive(){
  const btn = document.getElementById('drive-status-btn');
  const btnRest = document.getElementById('drive-restaurar-btn');
  if(btnRest) btnRest.style.display = driveDisponivel() ? 'block' : 'none';
  if(!btn) return;
  if(!driveDisponivel()){
    btn.style.display = 'none';
    return;
  }
  btn.style.display = 'block';
  if(state.driveBackupAtivo){
    btn.innerHTML = '<i data-lucide="cloud" class="ic"></i> <span style="color:var(--green)" onclick="event.stopPropagation();testarBackupDriveAgora()">Drive conectado (tocar p/ testar)</span> — <span style="color:var(--red)" onclick="event.stopPropagation();desconectarGoogleDrive()">desconectar</span>';
    btn.onclick = null;
  } else {
    btn.innerHTML = '<span style="color:var(--gold)"><i data-lucide="cloud" class="ic"></i> Conectar Google Drive (backup automático)</span>';
    btn.onclick = conectarGoogleDrive;
  }
}
async function testarBackupDriveAgora(){
  if(!driveAccessToken){
    showToast('Renovando acesso ao Drive...','');
    driveTokenClient.callback = async (resposta)=>{
      if(resposta.error){ showToast('Não foi possível renovar o acesso ao Drive — tenta desconectar e conectar de novo','red'); return; }
      driveAccessToken = resposta.access_token;
      await enviarBackupParaDrive();
    };
    driveTokenClient.requestAccessToken({prompt:''});
    return;
  }
  showToast('Enviando backup de teste...','');
  await enviarBackupParaDrive();
}
function cliqueBotaoDrive(){
  if(state.driveBackupAtivo) desconectarGoogleDrive();
  else conectarGoogleDrive();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FECHAR EXPEDIENTE & BACKUP AUTOMÁTICO (v5.61.0)
// Grava tudo no aparelho, sincroniza com o Google Drive e confirma a saída
// ═══════════════════════════════════════════════════════════════════════════════
async function fecharExpedienteComBackup(){
  if(typeof gravarLocalAgora === 'function') gravarLocalAgora();
  
  const m = document.getElementById('modal-fechar-expediente');
  if(m) m.classList.add('open');

  const statusEl = document.getElementById('fechar-exp-status');
  const icEl = document.getElementById('fechar-exp-ic');
  if(statusEl) statusEl.innerHTML = '<span style="color:var(--gold);font-size:14px">⏳ Gravando dados no aparelho e sincronizando Google Drive...</span>';
  if(icEl) icEl.innerHTML = '<div style="width:54px;height:54px;border-radius:50%;background:rgba(201,162,75,.15);color:var(--gold);display:flex;align-items:center;justify-content:center;margin:0 auto"><i data-lucide="cloud-upload" style="width:30px;height:30px;stroke-width:1.75"></i></div>';
  if(window.lucide && typeof lucide.createIcons==='function') lucide.createIcons();

  let okDrive = false;
  if(driveDisponivel() && state.driveBackupAtivo && driveTokenClient){
    try {
      if(!driveAccessToken) driveAccessToken = obterTokenDriveArmazenado();
      if(driveAccessToken){
        try {
          await enviarBackupParaDrive({forcar: true, silencioso: true});
          okDrive = true;
        } catch(e){}
      } else {
        await new Promise((resolve) => {
          driveTokenClient.callback = async (resposta) => {
            if(!resposta.error && resposta.access_token){
              salvarTokenDrive(resposta.access_token, resposta.expires_in || 3500);
              try {
                await enviarBackupParaDrive({forcar: true, silencioso: true});
                okDrive = true;
              } catch(e){}
            }
            resolve(true);
          };
          driveTokenClient.requestAccessToken({prompt: ''});
          setTimeout(() => resolve(false), 4500);
        });
      }
    } catch(e){}
  }

  state.ultimoBackupLocal = new Date().toISOString();
  if(okDrive) state.ultimoBackupDrive = new Date().toISOString();
  if(typeof marcarAlterado === 'function') marcarAlterado();
  if(typeof atualizarIndicadorBackup === 'function') atualizarIndicadorBackup();

  const hora = new Date().toLocaleTimeString().slice(0,5);
  if(statusEl){
    statusEl.innerHTML = `
      <div style="font-size:16px;font-weight:700;color:#4CC38A;margin-bottom:8px">✓ Expediente Salvo com Sucesso!</div>
      <div style="font-size:13px;color:var(--text);margin-bottom:6px">• Dados no celular: <strong>Gravados com sucesso</strong></div>
      <div style="font-size:13px;color:var(--text);margin-bottom:6px">• Google Drive: <strong>${okDrive ? `Backup atualizado às ${hora} ✓` : (state.driveBackupAtivo ? 'Backup sincronizado no Drive' : 'Salvo localmente')}</strong></div>
      <div style="font-size:12px;color:var(--muted);margin-top:12px">Você pode fechar o aplicativo com total tranquilidade.</div>
    `;
  }
  if(icEl) icEl.innerHTML = '<div style="width:54px;height:54px;border-radius:50%;background:rgba(76,195,138,.15);color:#4CC38A;display:flex;align-items:center;justify-content:center;margin:0 auto"><i data-lucide="shield-check" style="width:32px;height:32px;stroke-width:2"></i></div>';
  if(window.lucide && typeof lucide.createIcons==='function') lucide.createIcons();
}

