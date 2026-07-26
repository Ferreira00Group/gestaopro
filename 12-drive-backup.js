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
  atualizarStatusDrive();
}

function conectarGoogleDrive(){
  if(!driveDisponivel()){ showToast('Google Drive ainda não foi configurado neste app','red'); return; }
  if(!driveTokenClient){ showToast('Carregando o Google Drive, tenta de novo em um instante','red'); return; }
  driveTokenClient.callback = async (resposta)=>{
    if(resposta.error){ showToast('Não foi possível conectar ao Google Drive','red'); return; }
    driveAccessToken = resposta.access_token;
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
    state.driveBackupAtivo = false;
    marcarAlterado();
    atualizarStatusDrive();
    showToast('Google Drive desconectado','green');
  });
}

// Tenta renovar o acesso sem mostrar nada na tela — se não conseguir
// (sessão expirada, navegador bloqueando), desiste sem incomodar; o
// lembrete manual continua funcionando como rede de segurança.
function tentarBackupSilenciosoDrive(){
  if(!driveDisponivel() || !state.driveBackupAtivo || !driveTokenClient) return;
  if(diasDesde(state.ultimoBackup) < 1) return; // já tem backup de menos de 1 dia
  if(state.driveUltimaTentativa && (Date.now()-state.driveUltimaTentativa) < (1000*60*60*6)) return; // espera 6h entre tentativas
  state.driveUltimaTentativa = Date.now();
  driveTokenClient.callback = async (resposta)=>{
    if(resposta.error) return; // falha silenciosa — o lembrete manual cobre isso depois
    driveAccessToken = resposta.access_token;
    await enviarBackupParaDrive();
  };
  try{ driveTokenClient.requestAccessToken({prompt:''}); }catch(e){ /* idem — sem incomodar */ }
}

async function enviarBackupParaDrive(){
  if(!driveAccessToken) return;
  const conteudo = JSON.stringify(state, null, 2);
  try{
    const busca = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D%27${DRIVE_ARQUIVO_NOME}%27+and+trashed%3Dfalse&spaces=drive&fields=files(id,name)`,
      { headers:{Authorization:'Bearer '+driveAccessToken} }
    );
    const dadosBusca = await busca.json();
    const arquivoExistente = dadosBusca.files && dadosBusca.files[0];

    let resposta;
    if(arquivoExistente){
      resposta = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${arquivoExistente.id}?uploadType=media`,{
        method:'PATCH',
        headers:{Authorization:'Bearer '+driveAccessToken,'Content-Type':'application/json'},
        body: conteudo
      });
    } else {
      const boundary = 'gestaopro_backup_boundary';
      const metadata = JSON.stringify({name: DRIVE_ARQUIVO_NOME});
      const corpo =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`+
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${conteudo}\r\n`+
        `--${boundary}--`;
      resposta = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{
        method:'POST',
        headers:{Authorization:'Bearer '+driveAccessToken,'Content-Type':`multipart/related; boundary=${boundary}`},
        body: corpo
      });
    }

    if(resposta.ok){
      state.ultimoBackup = Date.now();
      state.snoozeBackupAte = null;
      salvarDados();
      showToast('Backup salvo no Google Drive ✓','green');
    } else {
      showToast('Backup no Google Drive falhou — tenta de novo mais tarde','red');
    }
  }catch(e){
    console.warn('[GestãoPRO] Erro ao enviar backup pro Drive:', e);
  }
}

// ── UI do rodapé da sidebar ──
function atualizarStatusDrive(){
  const btn = document.getElementById('drive-status-btn');
  if(!btn) return;
  if(!driveDisponivel()){
    btn.style.display = 'none';
    return;
  }
  btn.style.display = 'block';
  if(state.driveBackupAtivo){
    btn.innerHTML = '☁️ <span style="color:var(--green)">Drive conectado</span> — <span style="color:var(--red)">desconectar</span>';
  } else {
    btn.innerHTML = '<span style="color:#2980B9">☁️ Conectar Google Drive (backup automático)</span>';
  }
}
function cliqueBotaoDrive(){
  if(state.driveBackupAtivo) desconectarGoogleDrive();
  else conectarGoogleDrive();
}
