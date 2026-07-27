// ============ TELA DE SENHA (LOCK SCREEN) ============
// Pra reativar a tela de senha, troque LOCK_ATIVO para true.
const LOCK_ATIVO = false;
const SENHA_KEY = 'gestao_pro_senha_hash';
function hashSenha(s){
  let hash=0;
  for(let i=0;i<s.length;i++){hash=((hash<<5)-hash+s.charCodeAt(i))|0;}
  return 'h'+hash.toString();
}
function initLockScreen(){
  if(!LOCK_ATIVO) return;
  document.getElementById('lock-screen').style.display='flex';
  const senhaSalva=localStorage.getItem(SENHA_KEY);
  if(!senhaSalva){
    document.getElementById('lock-criar').style.display='block';
    document.getElementById('lock-entrar').style.display='none';
  } else {
    document.getElementById('lock-criar').style.display='none';
    document.getElementById('lock-entrar').style.display='block';
    setTimeout(()=>{const i=document.getElementById('lock-senha-input');if(i)i.focus();},100);
  }
}
function lockCriarSenha(){
  const s1=document.getElementById('lock-nova-senha').value;
  const s2=document.getElementById('lock-confirma-senha').value;
  const erro=document.getElementById('lock-erro-criar');
  if(!s1||s1.length<4){erro.textContent='A senha deve ter pelo menos 4 caracteres.';erro.style.display='block';return;}
  if(s1!==s2){erro.textContent='As senhas não coincidem.';erro.style.display='block';return;}
  localStorage.setItem(SENHA_KEY,hashSenha(s1));
  document.getElementById('lock-screen').style.display='none';
}
function lockEntrar(){
  const s=document.getElementById('lock-senha-input').value;
  const erro=document.getElementById('lock-erro-entrar');
  const senhaSalva=localStorage.getItem(SENHA_KEY);
  if(hashSenha(s)===senhaSalva){
    document.getElementById('lock-screen').style.display='none';
  } else {
    erro.textContent='Senha incorreta. Tente novamente.';
    erro.style.display='block';
    document.getElementById('lock-senha-input').value='';
    document.getElementById('lock-senha-input').focus();
  }
}
function lockEsqueciSenha(){
  if(confirm('Isso vai remover a senha de acesso (seus dados NÃO serão apagados). Deseja continuar?')){
    localStorage.removeItem(SENHA_KEY);
    initLockScreen();
  }
}
initLockScreen();

// ============ PWA: SERVICE WORKER + STORAGE PERSISTENTE ============
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').catch(e=>{
      console.warn('[GestãoPRO] Falha ao registrar Service Worker:',e);
    });
  });
}
// Pede ao navegador pra não apagar os dados do app sob pressão de espaço
// (não garante 100%, mas reduz bastante o risco — funciona melhor depois
// que o usuário instala o app na tela inicial)
if(navigator.storage && navigator.storage.persist){
  navigator.storage.persist().then(concedido=>{
    if(!concedido) console.warn('[GestãoPRO] Armazenamento persistente não concedido pelo navegador.');
  });
}

// ============ INIT ============
carregarDados();
renderDashboard();
renderClientes();
renderEstoque();
atualizarAlertBells();
setTimeout(renderChartDash, 100);
setTimeout(ajustarStickyTabela, 150);
setTimeout(renderChart30Dias, 100);

// Ícones do menu lateral (Lucide) — tenta de novo se o CDN ainda não carregou
function inicializarIconesLucide(){
  if(typeof lucide==='undefined'){ setTimeout(inicializarIconesLucide, 400); return; }
  lucide.createIcons();
}
inicializarIconesLucide();
initGoogleDriveClient();
setTimeout(tentarBackupSilenciosoDrive, 1000);
setTimeout(verificarLembreteBackup, 3000);
