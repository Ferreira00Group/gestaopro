// ============ SERVICE WORKER — GestãoPRO ============
// Estratégia: cache-first pros arquivos do app (funciona offline assim que
// visitado uma vez), com atualização em segundo plano a cada acesso.
// O cache é nomeado com a APP_VERSION (00a-config.js) — ao subir uma nova
// versão, um novo cache é criado e o antigo é limpo no activate.
// Isso é complementar ao botão "Verificar Atualização" que já existe em
// 00-core.js: aquele fluxo continua funcionando como um "reset forçado"
// (desregistra SW + limpa caches + recarrega), pra quando o usuário quer
// garantir a versão mais nova na hora, sem esperar o ciclo normal do SW.

importScripts('00a-config.js');

const CACHE_NAME = 'gestaopro-cache-v' + APP_VERSION;

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './00-core.js',
  './00a-config.js',
  './01-ui-nav.js',
  './02-dashboard.js',
  './03-clientes.js',
  './04-vendas.js',
  './05-producao.js',
  './06-estoque.js',
  './07-precificacao.js',
  './08-compras-fornecedores.js',
  './09-financeiro-relatorios.js',
  './10-fab-inline.js',
  './10b-planejamento.js',
  './12-drive-backup.js',
  './11-app-init.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys()
      .then(names=>Promise.all(names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (event)=>{
  const req = event.request;
  if(req.method !== 'GET') return;

  // Chart.js (CDN externo): tenta rede primeiro, cai pro cache se offline.
  // Assim, com internet sempre pega a versão mais nova; sem internet, usa
  // a última versão que já tiver sido baixada com sucesso alguma vez.
  if(req.url.includes('cdnjs.cloudflare.com') || req.url.includes('accounts.google.com')){
    event.respondWith(
      caches.open(CACHE_NAME).then(cache=>
        fetch(req).then(res=>{ cache.put(req, res.clone()); return res; }).catch(()=>cache.match(req))
      )
    );
    return;
  }

  // Arquivos do app: cache primeiro (rápido e funciona offline), atualiza
  // o cache em segundo plano pra próxima visita já vir com o mais novo.
  event.respondWith(
    caches.match(req).then(cached=>{
      const fetchAndUpdate = fetch(req).then(res=>{
        if(res && res.status===200){
          caches.open(CACHE_NAME).then(cache=>cache.put(req, res.clone()));
        }
        return res;
      }).catch(()=>cached);
      return cached || fetchAndUpdate;
    })
  );
});
