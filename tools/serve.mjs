import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json; charset=utf-8' };
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname.split('/').some(part=>part.startsWith('.'))){res.writeHead(404);res.end('Not found');return;}
    let target=path.resolve(root,'.'+pathname);
    if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
    if((await stat(target)).isDirectory())target=path.join(target,'index.html');
    const content=await readFile(target);
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(content);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',e=>{console.error(`无法启动服务器：${e.message}`);process.exitCode=1;});
server.listen(port,'0.0.0.0',()=>{
  console.log(`放屁超人白思雨 → http://localhost:${port}`);
  for(const list of Object.values(os.networkInterfaces()))for(const iface of list||[])if(iface.family==='IPv4'&&!iface.internal)console.log(`同一 Wi-Fi 手机访问 → http://${iface.address}:${port}`);
});
