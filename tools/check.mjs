import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files=['src/game.js','src/art.js','src/audio.js','tools/serve.mjs'];
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
for(const file of ['index.html','style.css','favicon.svg'])if(!readFileSync(file,'utf8').trim())throw new Error(`Empty file: ${file}`);
console.log('模块语法与网页文件检查通过。');
