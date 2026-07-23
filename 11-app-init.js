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

// ============ INIT ============
carregarDados();
renderDashboard();
renderClientes();
renderEstoque();
atualizarAlertBells();
setTimeout(renderChartDash, 100);
setTimeout(ajustarStickyTabela, 150);
setTimeout(renderChart30Dias, 100);
