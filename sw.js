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

// index.html agora pede estes arquivos com "?v=APP_VERSION" (cache-busting, pra forçar o
// navegador a buscar de novo em vez de reusar uma cópia antiga guardada no cache HTTP normal
// dele — camada que nem o Service Worker nem "limpar cache" do app conseguem alcançar sozinhos).
// Por isso o precache abaixo também precisa das mesmas URLs com "?v=", senão o SW guardaria
// uma versão desalinhada (a de baixo, sem query) que a página nunca chega a pedir de verdade.
const v = '?v=' + APP_VERSION;
const ASSETS = [
  './',
  './index.html',
  './styles.css' + v,
  './00-core.js' + v,
  './00a-config.js' + v,
  './01-ui-nav.js' + v,
  './02-dashboard.js' + v,
  './03-clientes.js' + v,
  './04-vendas.js' + v,
  './05-producao.js' + v,
  './06-estoque.js' + v,
  './07-precificacao.js' + v,
  './08-compras-fornecedores.js' + v,
  './09-financeiro-relatorios.js' + v,
  './10-fab-inline.js' + v,
  './10b-planejamento.js' + v,
  './12-drive-backup.js' + v,
  './11-app-init.js' + v,
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
