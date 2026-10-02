import { GameAudio } from './audio.js';
import { drawBackdrop, drawPlatform, drawHero, drawEnemy, drawTrophy, drawPoop, drawBean, drawWeapon } from './art.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const ctx = canvas.getContext('2d');
const audio = new GameAudio();
const H = 540, WORLD = 6920, FLOOR = 444, GRAVITY = 1250;
const SKILLS = {
  yellow: { name: '黄屁 · 冲击波', color: '#ffbf18', cost: 14, cooldown: .46, damage: 34, speed: 550, radius: 30, ttl: 1.02 },
  green: { name: '绿屁 · 臭雾减速', color: '#64ca39', cost: 20, cooldown: .65, damage: 16, speed: 360, radius: 33, ttl: 1.15 },
  stink: { name: '普通臭屁 · 快速连发', color: '#89603d', cost: 8, cooldown: .26, damage: 21, speed: 500, radius: 25, ttl: .95 },
  pink: { name: '粉色香屁 · 回血净化', color: '#ff69b4', cost: 22, cooldown: .62, damage: 19, speed: 430, radius: 30, ttl: 1.05 },
};
const DIFFICULTIES = {
  easy: { name: '轻松', health: 7, enemyHealth: .72, bossHealth: 290, speed: .8, regen: 19, bulletSpeed: 150, bossInterval: 3.1, crit: .3, weaponCooldown: 1.6, score: .85, note: '7 颗心 · 回气更快 · 慢速臭气弹，适合轻松玩' },
  normal: { name: '标准', health: 5, enemyHealth: 1, bossHealth: 430, speed: 1, regen: 13, bulletSpeed: 205, bossInterval: 2.5, crit: .23, weaponCooldown: 1.9, score: 1, note: '5 颗心 · 标准首领战，来一场屁力冒险' },
  hard: { name: '挑战', health: 3, enemyHealth: 1.35, bossHealth: 680, speed: 1.3, regen: 10, bulletSpeed: 270, bossInterval: 1.75, crit: .2, weaponCooldown: 2.2, score: 1.4, note: '3 颗心 · 更强敌人 · 首领三连弹，得分 ×1.4' },
};
let difficulty = 'normal', weaponCooldown = 0;
const settings = () => DIFFICULTIES[difficulty];
const order = Object.keys(SKILLS);
let W = 960, mode = 'title', time = 0, last = 0, camera = 0, shake = 0, toastTimer = 0;
let hero, platforms, enemies, beans, projectiles, particles, fields, numbers;
let score = 0, beanCount = 0, attackTimer = 0, attackStreak = 0, critCount = 0, forceCrit = false;
let skill = 'stink', checkpoint = 0, lastHeal = -10, jumpBuffer = 0, coyote = 0, zone = 0;
let bossDefeated = false, bossShots = [], best = 0, muted = false, hudTick = 0;
const input = { left: false, right: false, down: false, fire: false, weapon: false };
const keyHeld = new Set();
const touchHeld = { left: new Set(), right: new Set(), fire: new Set(), weapon: new Set(), down: new Set() };
try {
  const savedDifficulty = localStorage.getItem('baisiyu-difficulty-v1');
  if (DIFFICULTIES[savedDifficulty]) difficulty = savedDifficulty;
  muted = ['1', 'true'].includes(localStorage.getItem('baisiyu-muted-v1'));
} catch {}
function readBest() {
  try { return Number(localStorage.getItem(`baisiyu-best-${difficulty}-v2`) || (difficulty === 'normal' ? localStorage.getItem('baisiyu-best-v1') : 0)) || 0; } catch { return 0; }
}
best = readBest();
function addScore(base) { score += Math.round(base * settings().score); }
audio.setMuted(muted);
$('#best-score').innerHTML = `${best} <span>分</span>`;

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function resetInput() {
  keyHeld.clear();
  for (const held of Object.values(touchHeld)) held.clear();
  input.left = input.right = input.down = input.fire = input.weapon = false;
  jumpBuffer = 0;
  document.querySelectorAll('.pressed').forEach(el => el.classList.remove('pressed'));
}
function updateInput() {
  input.left = keyHeld.has('KeyA') || keyHeld.has('ArrowLeft') || touchHeld.left.size > 0;
  input.right = keyHeld.has('KeyD') || keyHeld.has('ArrowRight') || touchHeld.right.size > 0;
  input.fire = keyHeld.has('KeyK') || touchHeld.fire.size > 0;
  input.down = keyHeld.has('KeyS') || keyHeld.has('ArrowDown') || touchHeld.down.size > 0;
  input.weapon = keyHeld.has('KeyE') || touchHeld.weapon.size > 0;
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
  hero = { x: 110, y: FLOOR - 60, w: 44, h: 60, vx: 0, vy: 0, dir: 1, hp: settings().health, maxHp: settings().health, energy: 100, hurt: 0, grounded: true, jumps: 0, weapon: false, dropTimer: 0 };
  weaponCooldown = 0;
  platforms = [
    {x:0,y:FLOOR,w:1200,h:180,kind:'ground'}, {x:1330,y:FLOOR,w:1570,h:180,kind:'ground'},
    {x:3030,y:FLOOR,w:1670,h:180,kind:'ground'}, {x:4820,y:FLOOR,w:2100,h:180,kind:'ground'},
    ...[[410,353,180],[820,328,175],[1120,353,270],[1650,340,195],[1970,285,175],[2390,350,200],
      [2810,352,270],[3200,340,190],[3530,288,185],[3900,349,220],[4320,303,180],[4620,353,280],
      [5080,334,195],[5510,304,160]].map(([x,y,w]) => ({x,y,w,h:24,kind:'float'}))
  ];
  enemies = [650,960,1540,1880,2500,2820,3280,3650,4140,4590,4980,5380,5640].map((x,i) => ({
    x, y: i % 3 === 1 ? 280 : FLOOR - 38, w: i % 3 === 1 ? 42 : 44, h:38,
    type:i % 3 === 1 ? 'fly' : 'slime', hp:Math.round((i % 3 === 1 ? 35 : 46) * settings().enemyHealth), maxHp:Math.round((i % 3 === 1 ? 35 : 46) * settings().enemyHealth),
    origin:x, vy:0, dir:i%2?1:-1, speed:rand(27,44)*settings().speed, slow:0, flash:0, dead:false, phase:rand(0,6), attack:2,
  }));
  enemies.push({x:6160,y:FLOOR-105,w:105,h:105,type:'boss',hp:settings().bossHealth,maxHp:settings().bossHealth,origin:6160,vy:0,dir:-1,speed:40*settings().speed,slow:0,flash:0,dead:false,phase:0,attack:2.8});
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
function syncDifficulty() {
  document.querySelectorAll('[data-difficulty]').forEach(el => {
    const active = el.dataset.difficulty === difficulty;
    el.classList.toggle('selected', active); el.setAttribute('aria-pressed', String(active));
  });
  if ($('#difficulty-label')) $('#difficulty-label').textContent = settings().name;
  if ($('#difficulty-note')) $('#difficulty-note').textContent = settings().note;
  $('#best-score').innerHTML = `${best} <span>分</span>`;
}
function selectDifficulty(next) {
  if (!DIFFICULTIES[next] || mode === 'playing' || mode === 'paused') return;
  difficulty = next; best = readBest();
  try { localStorage.setItem('baisiyu-difficulty-v1', next); } catch {}
  if (mode === 'title') init();
  syncDifficulty();
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
  if ($('#difficulty-picker')) $('#difficulty-picker').hidden = kind === 'paused';
  $('#overlay').hidden=false;
}
function start() {init();mode='playing';$('#overlay').hidden=true;$('#pause-toggle').setAttribute('aria-label','暂停游戏');$('#pause-toggle').innerHTML='Ⅱ <span>暂停</span>';const touchLayout=matchMedia('(pointer: coarse)').matches || innerWidth<=700;toast(touchLayout?'左手移动和下落，右手跳跃、放屁；点四色卡换屁！':'WASD / 方向键行动，1–4 选屁，K 放屁！',3.5);if(touchLayout)requestAnimationFrame(()=>$('.game-card').scrollIntoView({block:'start',behavior:'auto'}));}
function togglePause() {
  if(mode==='playing'){mode='paused';resetInput();showOverlay('paused');$('#pause-toggle').innerHTML='▶ <span>继续</span>';$('#pause-toggle').setAttribute('aria-label','继续游戏');}
  else if(mode==='paused'){mode='playing';$('#overlay').hidden=true;$('#pause-toggle').innerHTML='Ⅱ <span>暂停</span>';$('#pause-toggle').setAttribute('aria-label','暂停游戏');}
}
function saveBest() {if(score>best){best=score;try{localStorage.setItem(`baisiyu-best-${difficulty}-v2`,String(best));}catch{}$('#best-score').innerHTML=`${best} <span>分</span>`;}}
function finish(won) {
  if(mode!=='playing')return;
  if(won)addScore(1500);
  mode=won?'won':'lost';resetInput();saveBest();syncHUD();audio.play(won?'win':'lose');showOverlay(mode);
  if(won){for(let i=0;i<95;i++)particles.push({x:hero.x+rand(-W/2,W/2),y:rand(-130,120),vx:rand(-90,90),vy:rand(30,140),r:rand(3,7),life:rand(2.8,5),max:5,color:['#ffd55f','#a9c97a','#f9a4c5','#7eaeca'][i%4],confetti:true});}
}
function puff(x,y,color,count=12,power=1) {
  for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-90,90)*power,vy:rand(-110,25)*power,r:rand(5,15)*power,life:rand(.3,.7),max:.7,color});
  if(particles.length>280)particles.splice(0,particles.length-280);
}
function floating(text,x,y,color='#4b543a') {numbers.push({text,x,y,life:1,color});}
function makeField(x,y){fields.push({x,y,r:78,life:3,tick:0});puff(x,y,'#64ca39',22,1.5);}
function hurt(amount=1, fall=false) {
  if(mode!=='playing'||hero.hurt>0&&!fall)return;
  hero.hp-=amount;hero.hurt=1.6;shake=8;audio.play('hurt');puff(hero.x+18,hero.y+25,'#f4ad93',14);
  if(hero.hp<=0){hero.hp=0;finish(false);return;}
  if(fall){hero.x=checkpoint===2?4470:checkpoint===1?2270:110;hero.y=FLOOR-hero.h;hero.vx=hero.vy=0;hero.jumps=0;hero.dropTimer=0;hero.grounded=true;hero.energy=Math.max(hero.energy,45);camera=clamp(hero.x-W*.36,0,WORLD-W);toast('小旗子接住你啦！粉色香屁可以回血。');}
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
    e.hp=0;e.dead=true;addScore(e.type==='boss'?800:120);puff(e.x+e.w/2,e.y+e.h/2,e.type==='boss'?'#ad9174':'#b5cc8b',22,1.5);audio.play('hit');
    if(e.type==='boss'){bossDefeated=true;bossShots=[];toast('臭臭大王被打败！向右去领浩然杯！',5);}
  }
}
function fire() {
  if(mode!=='playing'||attackTimer>0)return;
  const s=SKILLS[skill];
  if(hero.energy<s.cost){attackTimer=.2;toast('屁力不足！吃豆回气，稍等也会恢复。',1.3);return;}
  hero.energy-=s.cost;attackTimer=s.cooldown;attackStreak++;
  const crit=forceCrit||attackStreak>=4||Math.random()<settings().crit;
  if(crit){attackStreak=0;critCount++;forceCrit=false;}
  const x=hero.x+hero.w/2+hero.dir*26,y=hero.y+hero.h*.56;
  projectiles.push({x,y,vx:s.speed*hero.dir,vy:0,r:s.radius,life:s.ttl,kind:skill,damage:s.damage,dir:hero.dir,w:s.radius*2,h:s.radius*2});
  puff(hero.x+hero.w/2-hero.dir*20,hero.y+hero.h*.64,s.color,10,.8);audio.play('fart',skill);
  if(skill==='pink' && hero.hp<hero.maxHp && time-lastHeal>=4.5){hero.hp++;lastHeal=time;floating('♥ +1',hero.x,hero.y-16,'#d47b9d');toast('香香回血！下次回血需等 5 秒。',1.7);}
  if(crit){
    for(let i=0;i<4;i++)projectiles.push({x,y:y-3,vx:hero.dir*rand(400,530),vy:-60-i*36,r:11,life:1.5,kind:'poop',damage:17,dir:hero.dir,angle:0});
    shake=4;audio.play('crit');floating('暴击！大便粒！',hero.x+20,hero.y-28,'#8d6133');
  }
  syncHUD();
}
function fireWeapon() {
  if(mode !== 'playing' || weaponCooldown > 0) return;
  if(!hero.weapon){weaponCooldown=.8;toast('在大王前面的发光台拾取浩然屁力炮！',1.8);return;}
  if(hero.energy<18){weaponCooldown=.3;toast('炮击需要 18 点屁力，吃豆或等回气！',1.5);return;}
  hero.energy-=18;weaponCooldown=settings().weaponCooldown;
  const x=hero.x+hero.w/2+hero.dir*42,y=hero.y+hero.h*.55;
  projectiles.push({x,y,vx:hero.dir*690,vy:0,r:31,life:1.5,kind:'cannon',damage:110,dir:hero.dir});
  puff(x,y,'#ffd125',20,1.8);shake=6;audio.play('fart','yellow');audio.play('crit');
  floating('浩然炮，发射！',hero.x,hero.y-35,'#9b6615');syncHUD();
}
function dropDown() {
  if(mode !== 'playing') return;
  if(hero.grounded) {
    const support = platforms.find(p => p.kind === 'float' && Math.abs(hero.y + hero.h - p.y) < 4 && hero.x + hero.w > p.x && hero.x < p.x + p.w);
    if(!support) return; // Solid ground remains solid.
    hero.dropTimer=.28; hero.y+=8; hero.grounded=false;
    hero.jumps=1; coyote=0; jumpBuffer=0;
    puff(hero.x+hero.w/2,hero.y+hero.h,'#ecdfb8',5,.55);
  }
  hero.vy=Math.max(hero.vy,180);
}
function moveHero(dt) {
  hero.dropTimer=Math.max(0,hero.dropTimer-dt);
  if(input.down && hero.grounded)dropDown();
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
  hero.vy+=GRAVITY*dt*(input.down?1.85:1);hero.y+=hero.vy*dt;hero.grounded=false;
  if(hero.vy>=0)for(const p of platforms){if(p.kind==='float'&&hero.dropTimer>0)continue;if(hero.x+hero.w>p.x&&hero.x<p.x+p.w&&previousBottom<=p.y+3&&hero.y+hero.h>=p.y){hero.y=p.y-hero.h;hero.vy=0;hero.grounded=true;hero.jumps=0;break;}}
  if(hero.y>H+120)hurt(1,true);
  hero.hurt=Math.max(0,hero.hurt-dt);
  hero.energy=Math.min(100,hero.energy+settings().regen*dt);
  if(hero.x>2250&&checkpoint<1){checkpoint=1;addScore(180);audio.play('checkpoint');toast('到达香香云谷！复活位置已保存。',3);}
  if(hero.x>4450&&checkpoint<2){checkpoint=2;addScore(180);audio.play('checkpoint');toast('到达臭臭王国！小心大王的臭气弹。',3);}
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
        e.attack=settings().bossInterval*(e.hp/e.maxHp<.4?.72:1);
        const dx=(hero.x+18)-(e.x+e.w/2),dy=(hero.y+25)-(e.y+45),len=Math.hypot(dx,dy)||1;
        const angle = Math.atan2(dy, dx);
        for (const spread of (difficulty === 'hard' ? [-.2, 0, .2] : [0])) {
          bossShots.push({x:e.x+e.w/2,y:e.y+45,vx:Math.cos(angle+spread)*settings().bulletSpeed,vy:Math.sin(angle+spread)*settings().bulletSpeed,r:17,life:5});
        }
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
        hitEnemy(e,p.damage,p.kind,p.dir);puff(p.x,p.y,p.kind==='cannon'?'#f5b720':SKILLS[p.kind]?.color||'#a88661',6,.65);audio.play('hit');
        if(p.kind==='green')makeField(p.x,p.y);
        if(p.kind==='cannon'){
          shake=10;puff(p.x,p.y,'#ffba1b',26,2.2);floating('轰！浩然炮！',p.x,p.y-40,'#986316');audio.play('crit');
          for(const other of enemies)if(other!==e&&!other.dead&&Math.hypot(other.x-e.x,other.y-e.y)<130)hitEnemy(other,40,'cannon',p.dir);
        }
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
    time+=dt;attackTimer=Math.max(0,attackTimer-dt);weaponCooldown=Math.max(0,weaponCooldown-dt);moveHero(dt);
    if(mode!=='playing')return;
    if (!hero.weapon && hero.x + hero.w > 5768 && hero.x < 5855 && hero.y + hero.h > FLOOR - 78) {
      hero.weapon = true; audio.play('checkpoint'); puff(5810,FLOOR-45,'#ffd128',28,1.7);
      toast('拾取浩然屁力炮！按 E 或“炮击”，长按可连发。',4.5);
    }
    if(input.fire)fire();
    if(input.weapon)fireWeapon();
    updateEnemies(dt);updateProjectiles(dt);
    for(const b of beans){if(!b.taken&&hero.x+hero.w>b.x-12&&hero.x<b.x+12&&hero.y+hero.h>b.y-12&&hero.y<b.y+12){b.taken=true;beanCount++;addScore(35);hero.energy=Math.min(100,hero.energy+15);audio.play('coin');puff(b.x,b.y,'#f5d476',5,.5);}}
    if(hero.x>6540&&!bossDefeated&&toastTimer<=0)toast('先打败臭臭大王，才能领取浩然杯！',2);
    if(bossDefeated&&hero.x+hero.w>6638&&hero.x<6740)finish(true);
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('#toast').classList.remove('visible');}
    hudTick+=dt;if(hudTick>.1){syncHUD();hudTick=0;}
  }
  if(mode==='playing'||mode==='won'||mode==='title')updateEffects(dt);
}
function syncHUD() {
  $('#hearts').textContent=Array.from({length:hero.maxHp},(_,i)=>i<hero.hp?'♥':'♡').join(' ');$('#hearts').setAttribute('aria-label',`生命 ${hero.hp} / ${hero.maxHp}`);
  $('#energy-fill').style.width=`${hero.energy}%`;$('#energy-text').textContent=`屁力 ${Math.floor(hero.energy)}%`;
  $('#score').textContent=score;$('#beans').textContent=beanCount;
  $('#zone-label').textContent=['01 / 豆豆草原','02 / 香香云谷','03 / 臭臭王国'][zone];
  const boss=enemies.find(e=>e.type==='boss');$('#boss-meter').hidden=boss.dead||hero.x<5570;
  $('#boss-fill').style.width=`${boss.hp/boss.maxHp*100}%`;
  if ($('#weapon-button')) {
    $('#weapon-button').disabled = !hero.weapon;
    $('#weapon-button').setAttribute('aria-label', !hero.weapon ? '浩然屁力炮未拾取' : weaponCooldown > 0 ? `炮击冷却 ${weaponCooldown.toFixed(1)} 秒` : '发射浩然屁力炮');
    $('#weapon-button').classList.toggle('ready', hero.weapon && weaponCooldown <= 0);
  }
  if ($('#weapon-status')) $('#weapon-status').classList.toggle('ready',hero.weapon);
  if ($('#weapon-status')) $('#weapon-status').textContent = !hero.weapon ? '浩然屁力炮 · BOSS 前拾取' : weaponCooldown > 0 ? `浩然屁力炮 · 充能 ${weaponCooldown.toFixed(1)}s` : '浩然屁力炮就绪 · E / 炮击';
}
function drawFlag(x,active,label) {
  ctx.save();ctx.translate(x,FLOOR);ctx.strokeStyle='#697754';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-111);ctx.stroke();
  ctx.fillStyle=active?'#a6c67a':'#e7d8a3';ctx.strokeStyle='#48503a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-108);ctx.quadraticCurveTo(28,-114,50,-101);ctx.lineTo(45,-77);ctx.quadraticCurveTo(21,-89,0,-80);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#48503a';ctx.font='bold 12px system-ui';ctx.fillText(active?'✓':'★',18,-90);
  ctx.fillStyle='#fff7e6';ctx.strokeStyle='#8a9172';ctx.beginPath();ctx.roundRect(-30,9,85,24,5);ctx.fill();ctx.stroke();ctx.fillStyle='#667053';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText(label,12,25);ctx.restore();
}
function drawSign(x,text) {
  ctx.save();ctx.translate(x,FLOOR);ctx.fillStyle='#a5895f';ctx.fillRect(25,-38,6,44);ctx.fillStyle='#fff2c9';ctx.strokeStyle='#94784f';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-30,-80,120,45,7);ctx.fill();ctx.stroke();ctx.fillStyle='#706046';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText(text,30,-53);ctx.restore();
}
function drawGas(p) {
  const palette = {
    yellow: ['#ffcd19','#a96b08','ϟ'], green: ['#65d631','#286b20','臭'],
    stink: ['#94613b','#4c3025','噗'], pink: ['#ff65b2','#9b3165','♥'],
  };
  const [color, ink, symbol]=palette[p.kind];
  ctx.save();ctx.translate(p.x,p.y);
  // Bright solid cloud, sharp outline and layered trails read clearly on phones.
  for(let i=3;i>0;i--){ctx.globalAlpha=.2+(3-i)*.13;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(-p.dir*i*19,Math.sin(time*12+i)*6,p.r*(1-i*.13),p.r*(.8-i*.08),0,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;ctx.shadowColor=color;ctx.shadowBlur=15;
  ctx.fillStyle=color;ctx.strokeStyle=ink;ctx.lineWidth=3;
  ctx.beginPath();
  for(let i=0;i<=32;i++){const a=i/32*Math.PI*2,r=p.r*(1+.11*Math.sin(a*6+time*8));const x=Math.cos(a)*r,y=Math.sin(a)*r*.88;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  ctx.fillStyle='#fff9e3';ctx.globalAlpha=.7;ctx.beginPath();ctx.ellipse(-p.r*.3,-p.r*.34,p.r*.3,p.r*.12,-.3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.fillStyle=p.kind==='yellow'?'#73500a':'#fff9e3';ctx.font='900 25px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(symbol,0,2);
  if(p.kind==='pink'||p.kind==='yellow'){ctx.strokeStyle=color;ctx.lineWidth=3;for(let i=0;i<4;i++){const a=time*3+i*Math.PI/2,r=p.r+14;ctx.beginPath();ctx.moveTo(Math.cos(a)*r-4,Math.sin(a)*r);ctx.lineTo(Math.cos(a)*r+4,Math.sin(a)*r);ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r-4);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r+4);ctx.stroke();}}
  ctx.restore();
}
function drawCannonShot(p) {
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.dir,1);
  const glow=ctx.createRadialGradient(0,0,4,0,0,55);glow.addColorStop(0,'#fff2a3');glow.addColorStop(.55,'#ffd129aa');glow.addColorStop(1,'#ffd12900');ctx.fillStyle=glow;ctx.fillRect(-60,-60,120,120);
  ctx.fillStyle='#ffae20';ctx.strokeStyle='#7f561b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-20,-20);ctx.lineTo(-78,-8);ctx.lineTo(-59,0);ctx.lineTo(-78,12);ctx.lineTo(-20,22);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffe446';ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff8d2';ctx.beginPath();ctx.ellipse(-8,-11,13,5,-.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#805d23';ctx.font='900 25px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('轰',0,3);ctx.restore();
}
function drawFields() {
  for(const f of fields){ctx.save();const fade=Math.min(1,f.life);ctx.globalAlpha=.53*fade;ctx.fillStyle='#69c731';ctx.strokeStyle='#398122';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(f.x,f.y,f.r,49,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    for(let i=0;i<5;i++){ctx.globalAlpha=.38*fade;ctx.beginPath();ctx.arc(f.x+Math.cos(time+i)*f.r*.6,f.y-12+Math.sin(time*2+i)*19,20+i%2*5,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=.95*fade;ctx.fillStyle='#285b1d';ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.fillText('臭雾 · 减速',f.x,f.y+7);ctx.restore();
  }
}
function render() {
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);
  drawBackdrop(ctx,{width:W,height:H,camera,time,zone});
  ctx.save();ctx.translate(-camera+(shake?rand(-shake,shake):0),shake?rand(-shake*.4,shake*.4):0);
  for(const p of platforms)if(p.x+p.w>camera-30&&p.x<camera+W+30)drawPlatform(ctx,p,time);
  drawSign(245,'出发！浩然杯 →');drawSign(5550,'前方：臭臭大王');
  drawFlag(2250,checkpoint>=1,'云谷存档');drawFlag(4450,checkpoint>=2,'王国存档');
  drawFields();
  for(const b of beans)if(!b.taken&&b.x>camera-30&&b.x<camera+W+30)drawBean(ctx,{...b,time});
  drawWeapon(ctx,{x:5810,y:FLOOR,time,collected:hero.weapon});
  drawTrophy(ctx,{x:6680,y:FLOOR-35,time});
  if(!bossDefeated){ctx.save();ctx.globalAlpha=.65;ctx.fillStyle='#fff7d4';ctx.strokeStyle='#b6a169';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(6680,FLOOR-45,53,72,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#8c7644';ctx.textAlign='center';ctx.font='bold 12px system-ui';ctx.fillText('打败大王解锁',6680,FLOOR-120);ctx.restore();}
  for(const e of enemies)if(!e.dead&&e.x>camera-140&&e.x<camera+W+120)drawEnemy(ctx,e,time);
  for(const p of projectiles)p.kind==='poop'?drawPoop(ctx,p):p.kind==='cannon'?drawCannonShot(p):drawGas(p);
  for(const p of bossShots){ctx.save();ctx.fillStyle='#9a8168';ctx.strokeStyle='#70594d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#efe1be';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText('臭',p.x,p.y+5);ctx.restore();}
  for(const p of particles){ctx.save();ctx.globalAlpha=clamp(p.life/(p.confetti?.8:p.max),0,1);ctx.fillStyle=p.color;if(p.confetti){ctx.translate(p.x,p.y);ctx.rotate(p.life*3);ctx.fillRect(-p.r,-p.r,p.r*2,p.r);}else{ctx.beginPath();ctx.arc(p.x,p.y,p.r*(1.3-p.life/p.max*.3),0,Math.PI*2);ctx.fill();}ctx.restore();}
  if(hero.hurt<=0||Math.floor(hero.hurt*12)%2===0)drawHero(ctx,hero,time);
  for(const n of numbers){ctx.save();ctx.globalAlpha=Math.min(1,n.life*2);ctx.textAlign='center';ctx.font='900 20px system-ui';ctx.strokeStyle='#fff8e4';ctx.lineWidth=3;ctx.strokeText(n.text,n.x,n.y);ctx.fillStyle=n.color;ctx.fillText(n.text,n.x,n.y);ctx.restore();}
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
    if(action==='jump')jumpBuffer=.14;else {touchHeld[action].add(ev.pointerId);updateInput();if(action==='fire')fire();if(action==='weapon')fireWeapon();if(action==='down')dropDown();}
  });
  const release=ev=>{if(action!=='jump'){touchHeld[action].delete(ev.pointerId);updateInput();}el.classList.remove('pressed');};
  el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);
  el.addEventListener('contextmenu',ev=>ev.preventDefault());
}
const gameKeys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS','KeyK','KeyE','KeyP','Escape','Digit1','Digit2','Digit3','Digit4']);
window.addEventListener('keydown',ev=>{
  if($('#controls-guide')?.open)return;
  if(ev.code==='Space' && ev.target instanceof HTMLButtonElement && ev.target.id==='guide-open')return;
  if(!gameKeys.has(ev.code)||ev.ctrlKey||ev.metaKey||ev.altKey)return;
  if(ev.target instanceof HTMLElement&&['INPUT','TEXTAREA','SELECT'].includes(ev.target.tagName))return;
  // Preserve native Space/Enter activation on focused menu buttons.
  if(mode!=='playing'&&ev.code==='Space'&&ev.target instanceof HTMLButtonElement)return;
  ev.preventDefault();unlockSound();
  if(!ev.repeat){
    if(ev.code==='KeyP'||ev.code==='Escape'){togglePause();return;}
    if(mode!=='playing')return;
    if(['Space','ArrowUp','KeyW'].includes(ev.code))jumpBuffer=.14;
    if(['KeyS','ArrowDown'].includes(ev.code))dropDown();
    if(ev.code.startsWith('Digit'))setSkill(order[Number(ev.code.slice(-1))-1]);
    if(ev.code==='KeyK')fire();
    if(ev.code==='KeyE')fireWeapon();
  }
  if(mode==='playing'){keyHeld.add(ev.code);updateInput();}
});
window.addEventListener('keyup',ev=>{keyHeld.delete(ev.code);updateInput();});
window.addEventListener('blur',()=>{resetInput();if(mode==='playing')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();if(mode==='playing')togglePause();}});

let guideResume = false;
function openGuide() {
  const guide=$('#controls-guide');
  if(!guide || guide.open)return;
  guideResume=mode==='playing';
  if(guideResume)togglePause();
  resetInput();guide.showModal();
}
$('#guide-open')?.addEventListener('click',openGuide);
$('#guide-close')?.addEventListener('click',()=>$('#controls-guide').close());
$('#controls-guide')?.addEventListener('close',()=>{
  resetInput();
  if(guideResume && mode==='paused' && !document.hidden)togglePause();
  guideResume=false;
});
$('#controls-guide')?.addEventListener('click',ev=>{
  if(ev.target!==ev.currentTarget)return;
  const rect=ev.currentTarget.getBoundingClientRect();
  if(ev.clientX<rect.left||ev.clientX>rect.right||ev.clientY<rect.top||ev.clientY>rect.bottom)ev.currentTarget.close();
});
document.querySelectorAll('[data-difficulty]').forEach(el => el.addEventListener('click', () => selectDifficulty(el.dataset.difficulty)));
init();syncSound();syncDifficulty();resize();requestAnimationFrame(frame);
if(new URLSearchParams(location.search).has('debug')){
  window.__gameTest={
    snapshot:()=>({mode,difficulty,weaponCooldown,skill,score,beanCount,critCount,attackStreak,checkpoint,bossDefeated,fields:fields.map(f=>({...f})),bossShots:bossShots.map(b=>({...b})),particleCount:particles.length,hero:{...hero},camera,projectiles:projectiles.map(p=>({...p})),enemies:enemies.map(e=>({...e})),audioState:audio.context?.state||audio.ctx?.state||'unknown',input:{...input},time,best}),
    teleport:(x,y=FLOOR-hero.h)=>{hero.x=clamp(x,0,WORLD-hero.w);hero.y=y;hero.vx=hero.vy=0;camera=clamp(hero.x-W*.36,0,WORLD-W);},
    setHealth:hp=>{hero.hp=clamp(hp,1,hero.maxHp);syncHUD();},
    forceCrit:()=>{forceCrit=true;},
    setBossHealth:hp=>{const b=enemies.find(e=>e.type==='boss');b.hp=Math.max(1,hp);},
    step:seconds=>{for(let t=0;t<seconds;t+=1/60)update(1/60);},
  };
}
