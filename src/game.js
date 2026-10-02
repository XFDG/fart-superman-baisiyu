import { GameAudio } from './audio.js';
import { drawBackdrop, drawPlatform, drawHero, drawEnemy, drawTrophy, drawPoop, drawBean } from './art.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const ctx = canvas.getContext('2d');
const audio = new GameAudio();
const H = 540, WORLD = 6920, FLOOR = 444, GRAVITY = 1250;
const SKILLS = {
  yellow: { name: '黄屁 · 冲击波', color: '#f8c843', cost: 14, cooldown: .46, damage: 34, speed: 550, radius: 22, ttl: 1.02 },
  green: { name: '绿屁 · 臭雾减速', color: '#93bf59', cost: 20, cooldown: .65, damage: 16, speed: 360, radius: 25, ttl: 1.15 },
  stink: { name: '普通臭屁 · 快速连发', color: '#aa9172', cost: 8, cooldown: .26, damage: 21, speed: 500, radius: 18, ttl: .95 },
  pink: { name: '粉色香屁 · 回血净化', color: '#f799bc', cost: 22, cooldown: .62, damage: 19, speed: 430, radius: 23, ttl: 1.05 },
};
const order = Object.keys(SKILLS);
let W = 960, mode = 'title', time = 0, last = 0, camera = 0, shake = 0, toastTimer = 0;
let hero, platforms, enemies, beans, projectiles, particles, fields, numbers;
let score = 0, beanCount = 0, attackTimer = 0, attackStreak = 0, critCount = 0, forceCrit = false;
let skill = 'stink', checkpoint = 0, lastHeal = -10, jumpBuffer = 0, coyote = 0, zone = 0;
let bossDefeated = false, bossShots = [], best = 0, muted = false, hudTick = 0;
const input = { left: false, right: false, fire: false };
const keyHeld = new Set();
const touchHeld = { left: new Set(), right: new Set(), fire: new Set() };
try { best = Number(localStorage.getItem('baisiyu-best-v1')) || 0; muted = ['1', 'true'].includes(localStorage.getItem('baisiyu-muted-v1')); } catch {}
audio.setMuted(muted);
$('#best-score').innerHTML = `${best} <span>分</span>`;

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function resetInput() {
  keyHeld.clear();
  for (const held of Object.values(touchHeld)) held.clear();
  input.left = input.right = input.fire = false;
  jumpBuffer = 0;
  document.querySelectorAll('.pressed').forEach(el => el.classList.remove('pressed'));
}
function updateInput() {
  input.left = keyHeld.has('KeyA') || keyHeld.has('ArrowLeft') || touchHeld.left.size > 0;
  input.right = keyHeld.has('KeyD') || keyHeld.has('ArrowRight') || touchHeld.right.size > 0;
  input.fire = keyHeld.has('KeyJ') || keyHeld.has('KeyX') || touchHeld.fire.size > 0;
}
function resize() {
  const rect = canvas.getBoundingClientRect();
  W = H * (rect.width / Math.max(1, rect.height));
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
}
new ResizeObserver(resize).observe($('#stage'));
function init() {
  hero = { x: 110, y: FLOOR - 52, w: 36, h: 52, vx: 0, vy: 0, dir: 1, hp: 5, energy: 100, hurt: 0, grounded: true, jumps: 0 };
  platforms = [
    {x:0,y:FLOOR,w:1200,h:180,kind:'ground'}, {x:1330,y:FLOOR,w:1570,h:180,kind:'ground'},
    {x:3030,y:FLOOR,w:1670,h:180,kind:'ground'}, {x:4820,y:FLOOR,w:2100,h:180,kind:'ground'},
    ...[[410,353,180],[820,328,175],[1120,353,270],[1650,340,195],[1970,285,175],[2390,350,200],
      [2810,352,270],[3200,340,190],[3530,288,185],[3900,349,220],[4320,303,180],[4620,353,280],
      [5080,334,195],[5510,304,160]].map(([x,y,w]) => ({x,y,w,h:24,kind:'float'}))
  ];
  enemies = [650,960,1540,1880,2500,2820,3280,3650,4140,4590,4980,5380,5640].map((x,i) => ({
    x, y: i % 3 === 1 ? 280 : FLOOR - 38, w: i % 3 === 1 ? 42 : 44, h:38,
    type:i % 3 === 1 ? 'fly' : 'slime', hp:i % 3 === 1 ? 35 : 46, maxHp:i % 3 === 1 ? 35 : 46,
    origin:x, vy:0, dir:i%2?1:-1, speed:rand(27,44), slow:0, flash:0, dead:false, phase:rand(0,6), attack:2,
  }));
  enemies.push({x:6160,y:FLOOR-105,w:105,h:105,type:'boss',hp:430,maxHp:430,origin:6160,vy:0,dir:-1,speed:40,slow:0,flash:0,dead:false,phase:0,attack:2.8});
  beans = [];
  for(let x=260;x<5800;x+=155) {
    const ground = platforms.find(p=>p.kind==='ground' && x>=p.x && x<p.x+p.w);
    if(ground) beans.push({x,y:FLOOR-39,r:10,taken:false});
  }
  platforms.filter(p=>p.kind==='float').forEach(p=>{ for(let x=p.x+30;x<p.x+p.w-20;x+=48)beans.push({x,y:p.y-30,r:10,taken:false}); });
  projectiles=[];particles=[];fields=[];numbers=[];bossShots=[];
  score=0;beanCount=0;attackTimer=0;attackStreak=0;critCount=0;checkpoint=0;lastHeal=-10;
  bossDefeated=false;forceCrit=false;camera=0;shake=0;zone=0;coyote=.12;time=0;
  resetInput();setSkill('stink',false);syncHUD();
}
function toast(message, duration=2.3) {
  $('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=duration;
}
function setSkill(next, announce=true) {
  if(!SKILLS[next])return;
  skill=next;
  document.querySelectorAll('[data-skill]').forEach(el=>{const active=el.dataset.skill===skill;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});
  if(announce && mode==='playing')toast(SKILLS[skill].name,1.2);
}
function unlockSound() { void audio.unlock(); }
function showOverlay(kind) {
  const values = {
    title:['屁力全开 · 准备出发','英雄，就位！','穿过豆豆草原和香香云谷，打败臭臭大王，赢取传说中的浩然杯。','出发！屁力全开 →'],
    paused:['英雄休息中','稍微喘口气。','冒险已经暂停，你的豆豆和屁力都在。准备好就继续！','继续冒险 →'],
    lost:['胜败乃兵家常事','屁力暂时耗尽！',`本次得到 ${score} 分。吃豆回气，粉色香屁可以回血；试着在敌人靠近前出手。`,'再战一次 →'],
    won:['浩然杯 · 冠军诞生','白思雨，你赢啦！',`你击败了臭臭大王！本次 ${score} 分，收集 ${beanCount} 颗豆豆，打出 ${critCount} 次大便粒暴击。`,'再来一场！→'],
  };
  const v=values[kind];
  $('#modal-badge').textContent=v[0];$('#modal-title').textContent=v[1];$('#modal-description').textContent=v[2];$('#primary-action').textContent=v[3];
  $('#start-tips').hidden=kind!=='title';$('#secondary-action').hidden=kind!=='paused';
  $('#modal-footnote').textContent=kind==='won'?'🏆 浩然杯属于放屁超人白思雨！':'电脑键盘 / 手机按键 · 好玩的音效已就绪';
  $('#overlay').hidden=false;
}
function start() {init();mode='playing';$('#overlay').hidden=true;$('#pause-toggle').setAttribute('aria-label','暂停游戏');$('#pause-toggle').innerHTML='Ⅱ <span>暂停</span>';toast('出发！吃豆回气，按 J 或“放屁”攻击。',3.5);}
function togglePause() {
  if(mode==='playing'){mode='paused';resetInput();showOverlay('paused');$('#pause-toggle').innerHTML='▶ <span>继续</span>';$('#pause-toggle').setAttribute('aria-label','继续游戏');}
  else if(mode==='paused'){mode='playing';$('#overlay').hidden=true;$('#pause-toggle').innerHTML='Ⅱ <span>暂停</span>';$('#pause-toggle').setAttribute('aria-label','暂停游戏');}
}
function saveBest() {if(score>best){best=score;try{localStorage.setItem('baisiyu-best-v1',String(best));}catch{}$('#best-score').innerHTML=`${best} <span>分</span>`;}}
function finish(won) {
  if(mode!=='playing')return;
  if(won)score+=1500;
  mode=won?'won':'lost';resetInput();saveBest();syncHUD();audio.play(won?'win':'lose');showOverlay(mode);
  if(won){for(let i=0;i<95;i++)particles.push({x:hero.x+rand(-W/2,W/2),y:rand(-130,120),vx:rand(-90,90),vy:rand(30,140),r:rand(3,7),life:rand(2.8,5),max:5,color:['#ffd55f','#a9c97a','#f9a4c5','#7eaeca'][i%4],confetti:true});}
}
function puff(x,y,color,count=12,power=1) {
  for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-90,90)*power,vy:rand(-110,25)*power,r:rand(5,15)*power,life:rand(.3,.7),max:.7,color});
  if(particles.length>280)particles.splice(0,particles.length-280);
}
function floating(text,x,y,color='#4b543a') {numbers.push({text,x,y,life:1,color});}
function makeField(x,y){fields.push({x,y,r:65,life:3,tick:0});puff(x,y,'#a9c87f',18,1.4);}
function hurt(amount=1, fall=false) {
  if(mode!=='playing'||hero.hurt>0&&!fall)return;
  hero.hp-=amount;hero.hurt=1.6;shake=8;audio.play('hurt');puff(hero.x+18,hero.y+25,'#f4ad93',14);
  if(hero.hp<=0){hero.hp=0;finish(false);return;}
  if(fall){hero.x=checkpoint===2?4470:checkpoint===1?2270:110;hero.y=FLOOR-hero.h;hero.vx=hero.vy=0;hero.jumps=0;hero.grounded=true;hero.energy=Math.max(hero.energy,45);camera=clamp(hero.x-W*.36,0,WORLD-W);toast('小旗子接住你啦！粉色香屁可以回血。');}
  else {hero.vy=-280;hero.vx=-hero.dir*160;floating('哎哟！',hero.x,hero.y-10,'#c26558');}
  syncHUD();
}
function hitEnemy(e,damage,kind,dir=1) {
  if(e.dead)return;
  e.hp-=damage;e.flash=.16;
  if(kind==='green')e.slow=3;
  if(e.type!=='boss')e.x+=dir*(kind==='yellow'?28:8);
  floating(String(damage),e.x+e.w/2,e.y-3,kind==='poop'?'#946132':SKILLS[kind]?.color||'#735c44');
  if(e.hp<=0){
    e.hp=0;e.dead=true;score+=e.type==='boss'?800:120;puff(e.x+e.w/2,e.y+e.h/2,e.type==='boss'?'#ad9174':'#b5cc8b',22,1.5);audio.play('hit');
    if(e.type==='boss'){bossDefeated=true;bossShots=[];toast('臭臭大王被打败！向右去领浩然杯！',5);}
  }
}
function fire() {
  if(mode!=='playing'||attackTimer>0)return;
  const s=SKILLS[skill];
  if(hero.energy<s.cost){attackTimer=.2;toast('屁力不足！吃豆回气，稍等也会恢复。',1.3);return;}
  hero.energy-=s.cost;attackTimer=s.cooldown;attackStreak++;
  const crit=forceCrit||attackStreak>=4||Math.random()<.23;
  if(crit){attackStreak=0;critCount++;forceCrit=false;}
  const x=hero.x+hero.w/2+hero.dir*26,y=hero.y+hero.h*.56;
  projectiles.push({x,y,vx:s.speed*hero.dir,vy:0,r:s.radius,life:s.ttl,kind:skill,damage:s.damage,dir:hero.dir,w:s.radius*2,h:s.radius*2});
  puff(hero.x+hero.w/2-hero.dir*20,hero.y+hero.h*.64,s.color,10,.8);audio.play('fart',skill);
  if(skill==='pink' && hero.hp<5 && time-lastHeal>=4.5){hero.hp++;lastHeal=time;floating('♥ +1',hero.x,hero.y-16,'#d47b9d');toast('香香回血！下次回血需等 5 秒。',1.7);}
  if(crit){
    for(let i=0;i<4;i++)projectiles.push({x,y:y-3,vx:hero.dir*rand(400,530),vy:-60-i*36,r:8,life:1.5,kind:'poop',damage:17,dir:hero.dir,angle:0});
    shake=4;audio.play('crit');floating('暴击！大便粒！',hero.x+20,hero.y-28,'#8d6133');
  }
  syncHUD();
}
function moveHero(dt) {
  const direction=(input.right?1:0)-(input.left?1:0);
  if(direction){hero.dir=direction;hero.vx+=direction*1550*dt;hero.vx=clamp(hero.vx,-270,270);}
  else hero.vx*=Math.pow(.00004,dt);
  hero.x=clamp(hero.x+hero.vx*dt,8,WORLD-hero.w-8);
  coyote=hero.grounded?.12:Math.max(0,coyote-dt);
  if(jumpBuffer>0){
    jumpBuffer-=dt;
    if(coyote>0||hero.jumps<2){
      const double=coyote<=0;hero.vy=double?-475:-535;hero.jumps=double?2:1;hero.grounded=false;coyote=0;jumpBuffer=0;
      audio.play(double?'fart':'jump',skill);puff(hero.x+18,hero.y+hero.h,double?SKILLS[skill].color:'#efe4bb',8,.7);
      if(double)floating('噗！二段跳',hero.x,hero.y-5,SKILLS[skill].color);
    }
  }
  const previousBottom=hero.y+hero.h;
  hero.vy+=GRAVITY*dt;hero.y+=hero.vy*dt;hero.grounded=false;
  if(hero.vy>=0)for(const p of platforms){if(hero.x+hero.w>p.x&&hero.x<p.x+p.w&&previousBottom<=p.y+3&&hero.y+hero.h>=p.y){hero.y=p.y-hero.h;hero.vy=0;hero.grounded=true;hero.jumps=0;break;}}
  if(hero.y>H+120)hurt(1,true);
  hero.hurt=Math.max(0,hero.hurt-dt);
  hero.energy=Math.min(100,hero.energy+13*dt);
  if(hero.x>2250&&checkpoint<1){checkpoint=1;score+=180;audio.play('checkpoint');toast('到达香香云谷！复活位置已保存。',3);}
  if(hero.x>4450&&checkpoint<2){checkpoint=2;score+=180;audio.play('checkpoint');toast('到达臭臭王国！小心大王的臭气弹。',3);}
  zone=hero.x<2250?0:hero.x<4450?1:2;
  camera+=((clamp(hero.x-W*.36,0,Math.max(0,WORLD-W)))-camera)*Math.min(1,dt*7);
}
function updateEnemies(dt) {
  for(const e of enemies){
    if(e.dead)continue;
    e.flash=Math.max(0,e.flash-dt);e.slow=Math.max(0,e.slow-dt);
    if(Math.abs(e.x-hero.x)>W+250)continue;
    const speed=e.speed*(e.slow>0?.35:1);
    if(e.type==='fly'){e.x=e.origin+Math.sin(time*.9+e.phase)*65;e.y=278+Math.sin(time*2+e.phase)*24;}
    else if(e.type==='boss'){
      e.dir=hero.x<e.x?-1:1;
      if(Math.abs(hero.x-e.x)>170)e.x=clamp(e.x+e.dir*speed*dt,5980,6460);
      e.attack-=dt;
      if(e.attack<=0 && hero.x>5580){
        e.attack=e.hp<180?1.7:2.5;
        const dx=(hero.x+18)-(e.x+e.w/2),dy=(hero.y+25)-(e.y+45),len=Math.hypot(dx,dy)||1;
        bossShots.push({x:e.x+e.w/2,y:e.y+45,vx:dx/len*200,vy:dy/len*200,r:15,life:5});
        puff(e.x+e.w/2,e.y+45,'#b5a28a',8);audio.play('fart','stink');
      }
    } else {e.x+=speed*e.dir*dt;if(Math.abs(e.x-e.origin)>90)e.dir*=-1;}
    if(overlaps(hero,e)){
      if(hero.vy>100&&hero.y+hero.h<e.y+22&&e.type!=='boss'){hero.vy=-350;hitEnemy(e,28,'yellow',hero.dir);audio.play('hit');}
      else hurt();
    }
  }
}
function updateProjectiles(dt) {
  for(const p of projectiles){
    p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.kind==='poop'){p.vy+=410*dt;p.angle+=p.dir*8*dt;}
    let collided=false;
    for(const e of enemies){
      if(e.dead)continue;
      if(p.x+p.r>e.x&&p.x-p.r<e.x+e.w&&p.y+p.r>e.y&&p.y-p.r<e.y+e.h){
        hitEnemy(e,p.damage,p.kind,p.dir);puff(p.x,p.y,SKILLS[p.kind]?.color||'#a88661',6,.65);audio.play('hit');
        if(p.kind==='green')makeField(p.x,p.y);
        if(p.kind==='yellow')for(const other of enemies){if(other!==e&&!other.dead&&Math.hypot(other.x-e.x,other.y-e.y)<100)hitEnemy(other,15,'yellow',p.dir);}
        p.life=0;collided=true;break;
      }
    }
    if(!collided&&p.life<=0&&p.kind==='green')makeField(p.x,p.y);
    if(p.y>FLOOR+16&&p.kind==='poop')p.life=0;
  }
  projectiles=projectiles.filter(p=>p.life>0&&p.x>-50&&p.x<WORLD+50);
  for(const f of fields){
    f.life-=dt;f.tick-=dt;
    if(f.tick<=0){f.tick=.45;for(const e of enemies)if(!e.dead&&Math.hypot(e.x+e.w/2-f.x,e.y+e.h/2-f.y)<f.r+e.w/2)hitEnemy(e,7,'green',0);}
  }
  fields=fields.filter(f=>f.life>0);
  for(const p of bossShots){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x+p.r>hero.x&&p.x-p.r<hero.x+hero.w&&p.y+p.r>hero.y&&p.y-p.r<hero.y+hero.h){hurt();p.life=0;}}
  bossShots=bossShots.filter(p=>p.life>0);
}
function updateEffects(dt) {
  for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.confetti?12*dt:-12*dt;}
  particles=particles.filter(p=>p.life>0);
  for(const n of numbers){n.life-=dt;n.y-=35*dt;}
  numbers=numbers.filter(n=>n.life>0);
  shake=Math.max(0,shake-25*dt);
}
function update(dt) {
  if(mode==='playing'){
    time+=dt;attackTimer=Math.max(0,attackTimer-dt);moveHero(dt);
    if(mode!=='playing')return;
    if(input.fire)fire();
    updateEnemies(dt);updateProjectiles(dt);
    for(const b of beans){if(!b.taken&&hero.x+hero.w>b.x-12&&hero.x<b.x+12&&hero.y+hero.h>b.y-12&&hero.y<b.y+12){b.taken=true;beanCount++;score+=35;hero.energy=Math.min(100,hero.energy+15);audio.play('coin');puff(b.x,b.y,'#f5d476',5,.5);}}
    if(hero.x>6540&&!bossDefeated&&toastTimer<=0)toast('先打败臭臭大王，才能领取浩然杯！',2);
    if(bossDefeated&&hero.x+hero.w>6638&&hero.x<6740)finish(true);
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('#toast').classList.remove('visible');}
    hudTick+=dt;if(hudTick>.1){syncHUD();hudTick=0;}
  }
  if(mode==='playing'||mode==='won'||mode==='title')updateEffects(dt);
}
function syncHUD() {
  $('#hearts').textContent=Array.from({length:5},(_,i)=>i<hero.hp?'♥':'♡').join(' ');$('#hearts').setAttribute('aria-label',`生命 ${hero.hp} / 5`);
  $('#energy-fill').style.width=`${hero.energy}%`;$('#energy-text').textContent=`屁力 ${Math.floor(hero.energy)}%`;
  $('#score').textContent=score;$('#beans').textContent=beanCount;
  $('#zone-label').textContent=['01 / 豆豆草原','02 / 香香云谷','03 / 臭臭王国'][zone];
  const boss=enemies.find(e=>e.type==='boss');$('#boss-meter').hidden=boss.dead||hero.x<5570;
  $('#boss-fill').style.width=`${boss.hp/boss.maxHp*100}%`;
}
function drawFlag(x,active,label) {
  ctx.save();ctx.translate(x,FLOOR);ctx.strokeStyle='#697754';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-111);ctx.stroke();
  ctx.fillStyle=active?'#a6c67a':'#e7d8a3';ctx.strokeStyle='#48503a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-108);ctx.quadraticCurveTo(28,-114,50,-101);ctx.lineTo(45,-77);ctx.quadraticCurveTo(21,-89,0,-80);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#48503a';ctx.font='bold 12px system-ui';ctx.fillText(active?'✓':'★',18,-90);
  ctx.fillStyle='#fff7e6';ctx.strokeStyle='#8a9172';ctx.beginPath();ctx.roundRect(-30,9,85,24,5);ctx.fill();ctx.stroke();ctx.fillStyle='#667053';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText(label,12,25);ctx.restore();
}
function drawSign(x,text) {
  ctx.save();ctx.translate(x,FLOOR);ctx.fillStyle='#a5895f';ctx.fillRect(25,-38,6,44);ctx.fillStyle='#fff2c9';ctx.strokeStyle='#94784f';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-30,-80,120,45,7);ctx.fill();ctx.stroke();ctx.fillStyle='#706046';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(text,30,-53);ctx.restore();
}
function drawGas(p) {
  ctx.save();ctx.translate(p.x,p.y);const s=SKILLS[p.kind];ctx.globalAlpha=.82;
  ctx.fillStyle=s.color;ctx.strokeStyle=p.kind==='stink'?'#88705c':p.kind==='green'?'#73994d':p.kind==='pink'?'#db7e9f':'#dca832';ctx.lineWidth=1.5;
  ctx.beginPath();for(let i=0;i<7;i++){const a=i/7*Math.PI*2,r=p.r*(.8+Math.sin(time*9+i)*.13);ctx.moveTo(Math.cos(a)*r+9,Math.sin(a)*r);ctx.arc(Math.cos(a)*r,Math.sin(a)*r,9,0,Math.PI*2);}ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff9df';ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.kind==='pink'?'♥':p.kind==='yellow'?'ϟ':p.kind==='green'?'≈':'噗',0,1);ctx.restore();
}
function render() {
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);
  drawBackdrop(ctx,{width:W,height:H,camera,time,zone});
  ctx.save();ctx.translate(-camera+(shake?rand(-shake,shake):0),shake?rand(-shake*.4,shake*.4):0);
  for(const p of platforms)if(p.x+p.w>camera-30&&p.x<camera+W+30)drawPlatform(ctx,p,time);
  drawSign(245,'出发！浩然杯 →');drawSign(5550,'前方：臭臭大王');
  drawFlag(2250,checkpoint>=1,'云谷存档');drawFlag(4450,checkpoint>=2,'王国存档');
  for(const f of fields){ctx.save();ctx.globalAlpha=.18*Math.min(1,f.life);ctx.fillStyle='#86ac55';ctx.beginPath();ctx.ellipse(f.x,f.y, f.r,45,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  for(const b of beans)if(!b.taken&&b.x>camera-30&&b.x<camera+W+30)drawBean(ctx,{...b,time});
  drawTrophy(ctx,{x:6680,y:FLOOR-35,time});
  if(!bossDefeated){ctx.save();ctx.globalAlpha=.65;ctx.fillStyle='#fff7d4';ctx.strokeStyle='#b6a169';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(6680,FLOOR-45,53,72,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#8c7644';ctx.textAlign='center';ctx.font='bold 12px system-ui';ctx.fillText('打败大王解锁',6680,FLOOR-120);ctx.restore();}
  for(const e of enemies)if(!e.dead&&e.x>camera-140&&e.x<camera+W+120)drawEnemy(ctx,e,time);
  for(const p of projectiles)p.kind==='poop'?drawPoop(ctx,p):drawGas(p);
  for(const p of bossShots){ctx.save();ctx.fillStyle='#9a8168';ctx.strokeStyle='#70594d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#efe1be';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText('臭',p.x,p.y+5);ctx.restore();}
  for(const p of particles){ctx.save();ctx.globalAlpha=clamp(p.life/(p.confetti?.8:p.max),0,1);ctx.fillStyle=p.color;if(p.confetti){ctx.translate(p.x,p.y);ctx.rotate(p.life*3);ctx.fillRect(-p.r,-p.r,p.r*2,p.r);}else{ctx.beginPath();ctx.arc(p.x,p.y,p.r*(1.3-p.life/p.max*.3),0,Math.PI*2);ctx.fill();}ctx.restore();}
  if(hero.hurt<=0||Math.floor(hero.hurt*12)%2===0)drawHero(ctx,hero,time);
  for(const n of numbers){ctx.save();ctx.globalAlpha=Math.min(1,n.life*2);ctx.textAlign='center';ctx.font='900 15px system-ui';ctx.strokeStyle='#fff8e4';ctx.lineWidth=3;ctx.strokeText(n.text,n.x,n.y);ctx.fillStyle=n.color;ctx.fillText(n.text,n.x,n.y);ctx.restore();}
  ctx.restore();
  if(mode==='playing'){ctx.save();const trackW=Math.min(210,W*.25),x=W/2-trackW/2;ctx.fillStyle='#fff9e899';ctx.beginPath();ctx.roundRect(x,H-20,trackW,5,3);ctx.fill();ctx.fillStyle='#869c64';ctx.beginPath();ctx.roundRect(x,H-20,trackW*clamp(hero.x/6680,0,1),5,3);ctx.fill();ctx.restore();}
}
function frame(now) {
  const dt=Math.min((now-last)/1000||0,.035);last=now;
  // Small substeps keep collisions consistent on slower phones.
  const steps=Math.max(1,Math.ceil(dt/.0167));for(let i=0;i<steps;i++)update(dt/steps);
  render();requestAnimationFrame(frame);
}

$('#primary-action').addEventListener('click',()=>{unlockSound();if(mode==='paused')togglePause();else start();});
$('#secondary-action').addEventListener('click',()=>{unlockSound();start();});
$('#pause-toggle').addEventListener('click',()=>{unlockSound();togglePause();});
function syncSound(){ $('#sound-toggle').innerHTML=muted?'♩ <span>音效关</span>':'♫ <span>音效开</span>';$('#sound-toggle').setAttribute('aria-label',muted?'开启音效':'关闭音效');$('#sound-toggle').setAttribute('aria-pressed',String(!muted)); }
$('#sound-toggle').addEventListener('click',()=>{muted=!muted;audio.setMuted(muted);unlockSound();syncSound();if(!muted)audio.play('coin');try{localStorage.setItem('baisiyu-muted-v1',muted?'1':'0');}catch{}});
document.querySelectorAll('[data-skill]').forEach(el=>el.addEventListener('click',()=>{unlockSound();setSkill(el.dataset.skill);}));
for(const el of document.querySelectorAll('[data-control]')){
  const action=el.dataset.control;
  el.addEventListener('pointerdown',ev=>{
    ev.preventDefault();unlockSound();if(mode!=='playing')return;
    el.setPointerCapture(ev.pointerId);el.classList.add('pressed');
    if(action==='jump')jumpBuffer=.14;else {touchHeld[action].add(ev.pointerId);updateInput();}
  });
  const release=ev=>{if(action!=='jump'){touchHeld[action].delete(ev.pointerId);updateInput();}el.classList.remove('pressed');};
  el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);
  el.addEventListener('contextmenu',ev=>ev.preventDefault());
}
const gameKeys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyJ','KeyX','KeyK','KeyC','KeyP','Escape','Digit1','Digit2','Digit3','Digit4']);
window.addEventListener('keydown',ev=>{
  if(!gameKeys.has(ev.code)||ev.ctrlKey||ev.metaKey||ev.altKey)return;
  if(ev.target instanceof HTMLElement&&['INPUT','TEXTAREA','SELECT'].includes(ev.target.tagName))return;
  // Preserve native Space/Enter activation on focused menu buttons.
  if(mode!=='playing'&&ev.code==='Space'&&ev.target instanceof HTMLButtonElement)return;
  ev.preventDefault();unlockSound();
  if(!ev.repeat){
    if(ev.code==='KeyP'||ev.code==='Escape'){togglePause();return;}
    if(mode!=='playing')return;
    if(['Space','ArrowUp','KeyW'].includes(ev.code))jumpBuffer=.14;
    if(['KeyK','KeyC'].includes(ev.code))setSkill(order[(order.indexOf(skill)+1)%order.length]);
    if(ev.code.startsWith('Digit'))setSkill(order[Number(ev.code.slice(-1))-1]);
  }
  if(mode==='playing'){keyHeld.add(ev.code);updateInput();}
});
window.addEventListener('keyup',ev=>{keyHeld.delete(ev.code);updateInput();});
window.addEventListener('blur',()=>{resetInput();if(mode==='playing')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();if(mode==='playing')togglePause();}});

init();syncSound();resize();requestAnimationFrame(frame);
if(new URLSearchParams(location.search).has('debug')){
  window.__gameTest={
    snapshot:()=>({mode,skill,score,beanCount,critCount,attackStreak,checkpoint,bossDefeated,hero:{...hero},camera,projectiles:projectiles.map(p=>({...p})),enemies:enemies.map(e=>({...e})),audioState:audio.context?.state||audio.ctx?.state||'unknown',input:{...input},time,best}),
    teleport:(x,y=FLOOR-hero.h)=>{hero.x=clamp(x,0,WORLD-hero.w);hero.y=y;hero.vx=hero.vy=0;camera=clamp(hero.x-W*.36,0,WORLD-W);},
    setHealth:hp=>{hero.hp=clamp(hp,1,5);syncHUD();},
    forceCrit:()=>{forceCrit=true;},
    setBossHealth:hp=>{const b=enemies.find(e=>e.type==='boss');b.hp=Math.max(1,hp);},
    step:seconds=>{for(let t=0;t<seconds;t+=1/60)update(1/60);},
  };
}
