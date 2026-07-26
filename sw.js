// ============ SERVICE WORKER — GestãoPRO ============
// Estratégia: rede primeiro, sempre — com internet, o app sempre busca a
// versão mais nova de cada arquivo (evita a inconsistência de um arquivo
// atualizar e outro ficar preso na versão antiga). O cache só é usado como
// último recurso, quando o dispositivo está de fato sem internet — é isso
// que garante o funcionamento offline.
// O cache é nomeado com a APP_VERSION (00a-config.js) — ao subir uma nova
// versão, um novo cache é criado e o antigo é limpo no activate.

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

  event.respondWith(
    fetch(req).then(res=>{
      if(res && res.status===200){
        caches.open(CACHE_NAME).then(cache=>cache.put(req, res.clone()));
      }
      return res;
    }).catch(()=>caches.match(req))
  );
});
