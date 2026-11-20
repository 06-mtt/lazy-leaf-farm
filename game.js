(function(){
'use strict';

/* ---------- 遊戲資料（品種皆為虛構） ---------- */

/* 配種表：兩個親代配出新品種，ch 是基礎成功率，親代品質每一級再 +4% */

/* 天氣每 30 分鐘換一次、季節每 3 天換一次，都由時間決定，之後所有玩家會看到同樣的天氣 */

function weather(now){ var r=rnd(Math.floor(now/3600000)*17+3); return WX[r<0.45?0:(r<0.67?1:(r<0.82?2:(r<0.95?3:4)))]; }

function season(now){ return Math.floor(now/259200000)%4; }

function inSeason(st,now){ return SEASON_OF[st.id]===season(now); }

function findRecipe(a,b){ for(var i=0;i<RECIPES.length;i++){ var r=RECIPES[i]; if((r.a===a&&r.b===b)||(r.a===b&&r.b===a)) return r; } return null; }
function has(st,t){ return (' '+st.trait+' ').indexOf(' '+t+' ')>=0; }

/* 品質六級，對應稀有度顏色；售價倍率依品質提高 */

var SMAP={}; STRAINS.forEach(function(s,i){s.idx=i;SMAP[s.id]=s;});


/* 稀有度：普通、一般、精良、稀有、傳說，最後一級保留給之後的內容 */



var IMAP={}; ITEMS.forEach(function(it){IMAP[it.id]=it;});

var PMAP={}; PETS.forEach(function(p){PMAP[p.id]=p;});


/* ---------- 存檔層：之後換成雲端存檔只需要改這一段 ---------- */
var GUEST_KEY='lazyleaf-save-v1', SAVE_KEY=GUEST_KEY;
var Store={
  load:function(){ try{ var r=localStorage.getItem(SAVE_KEY); return r?JSON.parse(r):null; }catch(e){ return null; } },
  save:function(s){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(s)); }catch(e){} },
  clear:function(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
};
/* 設定：只存在這台裝置 */
var SET={music:false,mvol:0.6,sfx:true,svol:0.7,fx:true,labels:true};
try{ var _st=JSON.parse(localStorage.getItem('lazyleaf-settings')||'{}'); for(var _k in _st) if(_k in SET) SET[_k]=_st[_k]; }catch(e){}
function saveSet(){ try{ localStorage.setItem('lazyleaf-settings',JSON.stringify(SET)); }catch(e){} }
function fresh(){
  var plots=[]; for(var i=0;i<9;i++) plots.push({u:i<3,crop:null,prog:0,last:0,water:0});
  return {v:1,coins:100,xp:0,lvl:1,seed:'lazy',plots:plots,inv:{},seeds:{lazy:10},
    upg:{fert:0,sprinkler:0,speaker:0,dog:0},
    stats:{harvest:0,earned:0,bluff:0,cat:0,ufo:0,gold:0},ach:{},items:{},pets:{}};
}
var S=Store.load();
if(!S||S.v!==1||!S.plots||S.plots.length!==9) S=fresh();
function normalize(){
  S.items=S.items||{}; S.pets=S.pets||{}; S.sat=S.sat||{}; S.dex=S.dex||{}; S.tasks=S.tasks||[]; S.charm=S.charm||0;
  if(!S.nextTask) S.nextTask=Date.now()+600000;
  S.stats.tasks=S.stats.tasks||0; S.stats.best=S.stats.best||0; ['fish','breed','help'].forEach(function(k){ S.stats[k]=S.stats[k]||0; });
  S.land=S.land||{};
  S.rep=S.rep||0; S.contest=S.contest||null; S.story=S.story||{}; S.hint=S.hint||{};
  S.decor=S.decor||{}; S.look=S.look||{hat:'straw',shirt:'red'}; S.wardrobe=S.wardrobe||{straw:1,none:1,red:1}; S.dexInfo=S.dexInfo||{};
  S.seeds=S.seeds||{}; S.known=S.known||{}; S.goods=S.goods||[]; S.favor=S.favor||{}; S.job=S.job||null;
  if(S.upg.dog){ S.pets.dog=S.pets.dog||{aff:0,last:0}; S.upg.dog=0; }
  STRAINS.forEach(function(st){ var v=S.inv[st.id]; if(!Array.isArray(v)){ S.inv[st.id]=[v||0,0,0,0,0,0]; if(v) S.dex[st.id+'0']=1; } });
  if(!SMAP[S.seed]) S.seed='lazy';
  S.log=S.log||[]; S.plots.forEach(function(p){ if(p.crop&&!p.n) p.n=5+Math.floor(Math.random()*6); });
}
normalize();
function hearts(id){ return S.pets[id]?Math.min(5,Math.floor(S.pets[id].aff/4)):0; }
function petBonus(id){ return S.pets[id]&&!S.pets[id].trip?PMAP[id].base*(1+0.1*hearts(id)):0; }
function petReq(pt){
  var c=pt.cost, n;
  if(c.coins) return {ok:S.coins>=c.coins,txt:coinTxt(c.coins),how:'寵物店 '+c.coins+' 金幣'};
  if(c.cat) return {ok:S.stats.cat>=c.cat,txt:S.stats.cat>=c.cat?'帶回家':'摸流浪貓 '+Math.min(S.stats.cat,c.cat)+'/'+c.cat,how:'摸流浪貓 '+c.cat+' 次'};
  if(c.stat){ n=S.stats[c.stat]||0; return {ok:n>=c.n,txt:n>=c.n?'帶回家':c.how+' '+Math.min(n,c.n)+'/'+c.n,how:'累計'+c.how+' '+c.n+' 次'}; }
  if(c.trip) return {ok:false,txt:'',how:'寵物探險時偶爾會撿到'};
  n=S.items[c.item]||0; var cn=c.crop?invCount(c.crop):1, ok=n>=c.n&&cn>0;
  return {ok:ok,txt:ok?'交換':IMAP[c.item].name+' '+Math.min(n,c.n)+'/'+c.n+(c.crop?'、'+SMAP[c.crop].name+' '+Math.min(cn,1)+'/1':''),how:'用 '+IMAP[c.item].name+' ×'+c.n+(c.crop?' 和「'+SMAP[c.crop].name+'」1 株':'')+' 交換'};
}
var petFx=0, petZoom=false;
function drawPetBig(t){
  var cv=document.getElementById('petbig'); if(!cv||tab!=='pets'||!petZoom) return;
  var c=cv.getContext('2d'), pt=PMAP[petSel], own=S.pets[pt.id], b=BMP[pt.id], w=b.rows[0].length, hh=b.rows.length, i;
  c.fillStyle='#3d2a5e'; c.fillRect(0,0,64,36); c.fillStyle='#5e3672'; c.fillRect(0,14,64,4);
  c.fillStyle='#4d7a5a'; c.fillRect(0,22,64,14); c.fillStyle='#5c8c66'; for(i=0;i<20;i++) c.fillRect((i*23)%64,23+(i*7)%12,1,1);
  c.fillStyle='#c9a27a'; for(i=1;i<64;i+=8) c.fillRect(i,17,2,6); c.fillRect(0,19,64,1);
  c.fillStyle='#f6e7c8'; [[6,3],[20,7],[41,2],[55,8]].forEach(function(s){ if((Math.floor(t/600)+s[0])%3) c.fillRect(s[0],s[1],1,1); });
  if(own&&own.trip){ c.fillStyle='#7a5644'; c.fillRect(28,14,2,12); c.fillStyle='#c9a27a'; c.fillRect(22,10,16,7); c.fillStyle='#3a2433'; c.fillRect(24,12,12,1); c.fillRect(24,14,9,1); return; }
  var span=64-w-6, ph=(t/pt.pace/2)%(span*2), right=ph<span, x=3+Math.round(right?ph:span*2-ph), y=31-hh-((pt.hop&&Math.floor(t/250)%2)?1:0);
  if(!own){ x=Math.round((64-w)/2); y=31-hh; var sil={rows:b.rows,pal:{}}; Object.keys(b.pal).forEach(function(k){ sil.pal[k]='#1c1530'; }); bmp(c,sil,x,y,false); return; }
  bmp(c,b,x,y,right!==pt.faceRight);
  var age=Date.now()-petFx; if(age<1400){ c.fillStyle='#ef7a8a'; for(i=0;i<3;i++){ var hx=x+Math.round(w/2)-5+i*5, hy=y-3-Math.round(age/120)-i*2; c.fillRect(hx,hy,1,1); c.fillRect(hx+2,hy,1,1); c.fillRect(hx,hy+1,3,1); c.fillRect(hx+1,hy+2,1,1); } }
}
function give(id,n){ S.items[id]=(S.items[id]||0)+(n||1); }

/* ---------- 規則 ---------- */
function rnd(n){ var x=Math.sin(n*12.9898)*43758.5453; return x-Math.floor(x); }
function price(s,now){
  var bucket=Math.floor(now/60000);
  var mult=0.7+0.8*rnd(bucket*31+s.idx*7+1);
  return Math.max(1,Math.round(s.base*mult*(1+0.1*S.upg.speaker)*(inSeason(s,now)?1.15:1)*(1+0.01*charmPts())*(1+petBonus('fox'))*evMul('sell')));
}
function charmPts(){
  var g=0; Object.keys(S.land).forEach(function(k){ var o=S.land[k], l=LOTMAP[k]; if(o.b==='garden'&&l) g+=Math.floor(l.sw*l.sh/5); });
  return DECOR.reduce(function(a,x){ return a+(S.decor[x.id]?x.charm:0); },0)+Math.min(30,g);
}
function landYield(l,o,now){ var hrs=Math.min(8,(now-o.t)/3600000), area=l.sw*l.sh; return o.b==='inn'?Math.floor(hrs*area*10):(o.b==='green'?Math.floor(hrs*area/10):0); }
function week(now){ return Math.floor(now/604800000); }
function isBase(x){ return !x.gen&&!x.ev; }
function twDate(now){ return new Date(now+8*3600000).toISOString().slice(0,10); }
function activeEvents(now){ var ds=twDate(now), wd=new Date(now+8*3600000).getUTCDay(); return EVENTS_CAL.filter(function(e){ return e.weekly?e.weekly.indexOf(wd)>=0:(ds>=e.from&&ds<=e.to); }); }
function evOn(id){ return activeEvents(Date.now()).some(function(e){ return e.id===id; }); }
function evMul(k){ return activeEvents(Date.now()).reduce(function(a,e){ return a*(e[k]||1); },1); }
function contestStrain(w){ var b=STRAINS.filter(isBase); return b[Math.floor(rnd(w*5+2)*b.length)]; }
function npcEntries(w){ return NPCS.map(function(n,i){ return {name:n,q:Math.min(5,Math.floor(Math.pow(rnd(w*13+i*7+1),2.2)*5.3))}; }); }
function rankOf(w,q){ return 1+npcEntries(w).filter(function(e){return e.q>q;}).length; }
function xpNeed(l){ return Math.round(12*Math.pow(l,1.8)); }
function speed(){ return (1+0.25*S.upg.fert)*(1+petBonus('alien')); }
function waterSpan(s){ return (has(s,'thirsty')?Math.max(30,s.time*0.34):Math.max(45,s.time*0.5))*1000*(1+petBonus('frog')); }
function nightFrac(a,b){
  var n=Math.max(1,Math.min(200,Math.ceil((b-a)/60000))), step=(b-a)/n, c=0;
  for(var i=0;i<n;i++){ var h=new Date(a+step*(i+0.5)).getHours(); if(h>=18||h<6) c++; }
  return c/n;
}
function grow(p,now){
  if(!p.crop) return;
  if(S.upg.sprinkler) p.water=now+1e9;
  var st=SMAP[p.crop], until=Math.min(now,p.water), last0=p.last;
  if(until>p.last){ var m=speed(); if(inSeason(st,now)) m*=1.25; if(now-p.last<300000&&weather(now).id==='heat') m*=1.2; if(has(st,'night')) m*=0.8+0.7*nightFrac(p.last,until); p.prog+=(until-p.last)/1000*m; }
  p.last=now;
  if(p.prog<st.time&&now>Math.max(last0,p.water)) p.dry=(p.dry||0)+(now-Math.max(last0,p.water))/1000;
}
/* 品質：照顧越好、輪作、肥料、寵物都會提高擲出高品質的機會 */
function luck(p,st){
  var care=has(st,'hardy')?1:1-Math.min(1,Math.max(0,(p.dry||0)-5)/Math.max(30,st.time*0.5));
  var L=0.4*care+0.08*S.upg.fert+petBonus('cat')+petBonus('dragon')+(p.rot||0)+(S.charm>0?0.25:0);
  if(has(st,'heirloom')) L+=0.2;
  if(has(st,'lucky')) L+=0.2;
  var wxid=weather(Date.now()).id; if(wxid==='fog') L+=0.1; if(wxid==='bow') L+=0.2;
  if(has(st,'thirsty')&&!((p.dry||0)>5)) L+=0.15;
  return Math.max(0,Math.min(1,L));
}
function rollQ(L){
  var a=[50,30,14,5,1,0], b=[4,22,36,26,11.5,0], w=[], sum=0, i;
  for(i=0;i<6;i++){ w[i]=a[i]+(b[i]-a[i])*L; }
  if(L>=0.7) w[5]=0.5*(L-0.7)/0.3;
  for(i=0;i<6;i++) sum+=w[i];
  var r=Math.random()*sum;
  for(i=0;i<6;i++){ r-=w[i]; if(r<0) return i; }
  return 0;
}
function invCount(id){ return S.inv[id].reduce(function(a,b){return a+b;},0); }
function getSat(id,now){ var o=S.sat[id]; return o?o.v*Math.pow(0.5,(now-o.t)/480000):0; }
function satFactor(v){ return Math.max(0.4,1-0.03*v); }
function sellStrain(id,now,commit){
  var st=SMAP[id], arr=S.inv[id], pr=price(st,now), v=getSat(id,now), tot=0;
  for(var q=5;q>=0;q--) for(var k=0;k<arr[q];k++){ tot+=pr*QMULT[q]*satFactor(v); v++; }
  if(commit){ S.inv[id]=[0,0,0,0,0,0]; S.sat[id]={v:v,t:now}; }
  return Math.round(tot);
}
function neighbors(i){ var a=[]; if(i>=3)a.push(i-3); if(i<6)a.push(i+3); if(i%3)a.push(i-1); if(i%3!==2)a.push(i+1); return a; }
function isRipe(p){ return p.crop&&p.prog>=SMAP[p.crop].time; }
function addCoins(n){ S.coins+=n; if(n>0) S.stats.earned+=n; }
function addXp(n){
  S.xp+=n;
  while(S.xp>=xpNeed(S.lvl)){
    S.xp-=xpNeed(S.lvl); S.lvl++;
    var un=STRAINS.filter(function(s){return s.lvl===S.lvl;})[0];
    logAdd('升到 LV '+S.lvl); toast('升到 LV '+S.lvl+(un?'，解鎖新品種「'+un.name+'」':''));
  }
}
function checkAch(){
  ACH.forEach(function(a){
    if(!S.ach[a.id]&&a.ok(S)){ S.ach[a.id]=1; addCoins(a.reward); toast('達成成就「'+a.name+'」 +'+a.reward+' 金幣'); }
  });
}
function hm(t){ var d=new Date(t); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
function fmt(sec){
  sec=Math.max(0,Math.ceil(sec));
  if(sec<60) return sec+' 秒';
  if(sec<3600) return Math.floor(sec/60)+' 分 '+(sec%60)+' 秒';
  return Math.floor(sec/3600)+' 小時 '+Math.floor(sec%3600/60)+' 分';
}

/* ---------- 介面元件 ---------- */
function $(id){ return document.getElementById(id); }
var toastT=0;
function toast(msg){
  var el=$('toast'); el.textContent=msg; el.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(function(){ el.classList.remove('show'); },2200);
}
function coinTxt(n){ return '<img class="ci" alt="" src="'+TICON.coin+'">'+nf(n); }
function nf(n){ return Math.round(n).toLocaleString('en-US'); }
function badge(id,n,pre){ var el=$(id); if(!el) return; var t=n>0?pre+(n>99?'99+':n):''; if(el.textContent!==t) el.textContent=t; }
function hud(){
  $('coins').textContent=S.coins.toLocaleString('en-US');
  $('lvl').innerHTML='LV '+S.lvl+(S.name?'<span class="nm">'+esc(S.name)+'</span>':'');
  $('xpfill').style.width=Math.min(100,S.xp/xpNeed(S.lvl)*100)+'%';
  $('rep').textContent=nf(S.rep||0);
  var now=Date.now(), back=0; Object.keys(S.pets).forEach(function(k){ var o=S.pets[k]; if(o.trip&&now>=o.trip.until) back++; });
  var fanN=FR?FR.fans.filter(function(id){ return FR.mine.indexOf(id)<0; }).length:0, ib=INBOX||{mail:0,coop:0};
  badge('b_ach',S.tasks.length,'!'); badge('b_pets',back,''); badge('b_upg',ib.mail+ib.coop+fanN,'');
  $('golbl').textContent=scene==='farm'?'去小鎮':(scene==='visit'?'回小鎮':'回農場');
  var gi=scene==='farm'?'town':'farm'; if($('goicon').dataset.ti!==gi){ $('goicon').dataset.ti=gi; $('goicon').src=TICON[gi]; }
}

/* ---------- 像素繪圖 ---------- */
var cv=$('cv'), ctx=cv.getContext('2d'), W=160, H=200;
ctx.imageSmoothingEnabled=false;
function px(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),w,h); }
var BMP={
  ufo:{rows:['....cccc....','...cwwwwc...','..gggggggg..','.gygygygygg.','..gggggggg..','....y..y....','...y....y...'],
       pal:{c:'#7fd8f0',w:'#eafaff',g:'#9a8fb8',y:'#f5c451'}},
  cat:{rows:['o...o.......','oo.oo......o','ooooo.....o.','okoko.oooo..','ooooooooooo.','.oooooooooo.','.o.o....o.o.'],
       pal:{o:'#ee9a72',k:'#2a2148'}},
  police:{rows:['...bbbbbb...','..bbbybbbb..','.bbbbbbbbbb.','..kkkkkkkk..','..ssssssss..','..skssssks..','..ssssssss..','..sssrrsss..','...ssssss...'],
       pal:{b:'#4a6fd0',y:'#f5c451',k:'#2a2148',s:'#f2c9a0',r:'#c8647a'}},
  granny:{rows:['...wwwwww...','..wwwwwwww..','..wsssssww..','..skssskss..','..ssssssss..','..ssrrrsss..','...ssssss...','..pppppppp..','.pppppppppp.'],
       pal:{w:'#e6e0f0',s:'#f2c9a0',k:'#2a2148',r:'#c8647a',p:'#b48cf2'}},
  star:{rows:['.....y......','.....y......','....yyy.....','.yyyyyyyyy..','..yyyyyyy...','...yyyyy....','..yyy.yyy...','..y.....y...'],
       pal:{y:'#f5c451'}}
};
BMP.chick={rows:['..yy..','.yyyy.','yyykyo','yyyyy.','.yyyy.','.o..o.'],pal:{y:'#f7e07a',k:'#2a2148',o:'#ee9a72'}};
BMP.dog={rows:['.........tt.','t.......tttt','tt.....ttktn','.tttttttttt.','.tttttttttt.','.twwwwwwtt..','.t.t...t.t..'],pal:{t:'#e0a060',w:'#f6e7c8',k:'#2a2148',n:'#3a2433'}};
BMP.alien={rows:['.ggggg.','ggggggg','gkkgkkg','gkkgkkg','.ggggg.','..ggg..','.ggggg.','.g...g.'],pal:{g:'#9be08a',k:'#2a2148'}};
BMP.frog={rows:['.gg...gg..','gwkg.gwkg.','gggggggggg','ggrrrrrrgg','.gggggggg.','gg.gggg.gg','g........g'],pal:{g:'#6fcf6a',w:'#ffffff',k:'#2a2148',r:'#e87a8a'}};
BMP.bunny={rows:['.w...w....','.wp..wp...','.wp..wp...','.wwwwwww..','wwkwwwkww.','wwwwpwwwww','.wwwwwwwww','..wwwwwww.','..w.w.w.w.'],pal:{w:'#f4f1ea',p:'#ef9ab0',k:'#2a2148'}};
BMP.owl={rows:['.b.....b.','.bbbbbbb.','bwwbbbwwb','bwkbbbwkb','bbbbybbbb','.bbcccbb.','.bcccccb.','..bbbbb..','..y...y..'],pal:{b:'#8a6a4a',w:'#f6e7c8',k:'#2a2148',y:'#f5c451',c:'#c9a27a'}};
BMP.fox={rows:['o.......o...','oo.....oo...','ooooooooo...','okoooookoo..','oowwnwwoo..o','.oowwwoo..oo','.ooooooooooo','.oooooooooww','.o.o...o.o..'],pal:{o:'#e8743a',w:'#ffffff',k:'#2a2148',n:'#2a2148'}};
BMP.hog={rows:['...bbbbb...','..bbbbbbbb.','.bbbbbbbbbb','bbbbbbbsss.','bbbbbbbsks.','.bbbbbsssn.','..s.s..s.s.'],pal:{b:'#6a5040',s:'#e8c8a0',k:'#2a2148',n:'#2a2148'}};
BMP.dragon={rows:['..r......rr.','.rrr....rrrr','rrrrr..rrkry','.rrrrrrrrrrr','..rrrrrrrr..','.yrrrrrrry..','.r.rr..rr.r.','r...r..r....'],pal:{r:'#ef4a4a',y:'#f5c451',k:'#2a2148'}};
BMP.pickle={rows:['....rrrr....','...rrrrrr...','...wwwwww...','..wggggggw..','..wglggggw..','..wgggglgw..','..wggggggw..','..wglggggw..','..wggglggw..','..wggggggw..','...wwwwww...'],pal:{r:'#c8647a',w:'#cfe8e8',g:'#8fae4a',l:'#c9d77a'}};
BMP.hairball={rows:['....oooo....','..oooooooo..','.oookoooooo.','.oooookoooo.','.ookooooooo.','.oooooookoo.','.ooookooooo.','..oooooooo..','....oooo....'],pal:{o:'#ee9a72',k:'#b8684a'}};
BMP.whistle={rows:['..bbbbbbb...','.bbbbbbbbbyy','.bbkkbbbbbyy','.bbkkbbbb...','.bbbbbbbb...','..bbbbbb....','............','..y..y..y...'],pal:{b:'#5aa0f2',k:'#2a2148',y:'#f5c451'}};
BMP.meteor={rows:['..........c.','........cc..','....pppp.c..','...pppppp...','..ppqppppp..','..pppppqpp..','..pqpppppp..','..pppppppp..','...ppqppp...','....pppp....'],pal:{p:'#8a5cc8',q:'#5e3672',c:'#7fd8f0'}};
var BUD=['.....cc.....','....cccc....','...ccwccc...','..gccccccg..','.ggcccdccgg.','..gccccccg..','...cdcccc...','..ggccccgg..','...gcccdg...','....cccc....','.....ss.....','.....ss.....'];
function shade(hex,f){ var n=parseInt(hex.slice(1),16); return 'rgb('+Math.round((n>>16)*f)+','+Math.round((n>>8&255)*f)+','+Math.round((n&255)*f)+')'; }
function bmp(c,b,x,y,flip){
  for(var r=0;r<b.rows.length;r++) for(var k=0,L=b.rows[r].length;k<L;k++){
    var ch=b.rows[r][k]; if(ch!=='.'){ c.fillStyle=b.pal[ch]; c.fillRect(x+(flip?L-1-k:k),y+r,1,1); }
  }
}
function icon(b){
  var c=document.createElement('canvas'); c.width=12; c.height=12;
  bmp(c.getContext('2d'),b,Math.floor((12-b.rows[0].length)/2),Math.floor((12-b.rows.length)/2));
  return c.toDataURL();
}
var ICON={}, TICON={};
(function(){
  var T={
    bag:{rows:['....kkkk....','...k....k...','..kkkkkkkk..','.kbbbbbbbbk.','.kbbbbbbbbk.','.kbbkkkkbbk.','.kbbkyykbbk.','.kbbbbbbbbk.','.kbbbbbbbbk.','..kkkkkkkk..'],pal:{k:'#2a2148',b:'#c98a5a',y:'#f5c451'}},
    paw:{rows:['............','..oo....oo..','..oo....oo..','.....oo.....','oo...oo...oo','oo........oo','...oooooo...','..oooooooo..','..oooooooo..','...oo..oo...'],pal:{o:'#ee9a72'}},
    scroll:{rows:['.wwwwwwwww..','.wkkkkkkkw..','.wwwwwwwww..','.wkkkkkwww..','.wwwwwwwww..','.wkkkkkkkw..','.wwwwwwwww..','.wkkkkwwww..','.wwwwwwwww..','..wwwwwwww..'],pal:{w:'#f6e7c8',k:'#8a7a9a'}},
    town:{rows:['.....rr.....','....rrrr....','...rrrrrr...','..rrrrrrrr..','.rrrrrrrrrr.','..wwwwwwww..','..wwyywkkw..','..wwyywkkw..','..wwwwwkkw..','..wwwwwkkw..'],pal:{r:'#c8647a',w:'#f6e7c8',y:'#f5c451',k:'#7a4a52'}},
    farm:{rows:['.....gg.....','....gggg....','..g..gg..g..','.ggg.gg.ggg.','..g..gg..g..','.....gg.....','.bbbbbbbbbb.','bbbbbbbbbbbb','bdbbdbbdbbdb','bbbbbbbbbbbb'],pal:{g:'#8fd67a',b:'#7a5644',d:'#5a3d33'}},
    menu:{rows:['............','.cc..cc..cc.','.cc..cc..cc.','............','.cc..cc..cc.','.cc..cc..cc.','............','.cc..cc..cc.','.cc..cc..cc.','............'],pal:{c:'#b9a8cf'}},
    coin:{rows:['...yyyyyy...','..yyyyyyyy..','.yyywwyyyyy.','.yywyyyyydy.','.yywyyyyydy.','.yyyyyyyydy.','.yyyyyyyddy.','..yyyydddy..','...yyyyyy...'],pal:{y:'#f5c451',w:'#fff3c4',d:'#c8922f'}},
    rep:{rows:['.....pp.....','.....pp.....','....pppp....','pppppppppppp','.pppppppppp.','..pppppppp..','..pppppppp..','.pppp..pppp.','.pp......pp.'],pal:{p:'#b48cf2'}}
  };
  Object.keys(T).forEach(function(k){ TICON[k]=icon(T[k]); });
  Array.prototype.forEach.call(document.querySelectorAll('img[data-ti]'),function(el){ el.src=TICON[el.dataset.ti]; });
  $('i_coin').src=TICON.coin; $('i_rep').src=TICON.rep;
})();
STRAINS.forEach(function(s){ ICON[s.id]=icon({rows:BUD,pal:{c:s.color,d:shade(s.color,0.7),g:'#6fbf5f',w:'#ffffff',s:'#3f8f4a'}}); });
FISH.forEach(function(f){ BMP[f.id]={rows:['............','...ccc......','..cccccc..c.','.ccwccccccc.','.cckcccccc..','..cccccc..c.','...ccc......'],pal:{c:f.c,w:'#ffffff',k:'#2a2148'}}; });
ITEMS.forEach(function(it){ ICON[it.id]=icon(BMP[it.id]); });
PETS.forEach(function(p){ ICON['pet_'+p.id]=icon(BMP[p.id]); var sp={}; Object.keys(BMP[p.id].pal).forEach(function(k){ sp[k]='#140f26'; }); ICON['sil_'+p.id]=icon({rows:BMP[p.id].rows,pal:sp}); });
BMP.juice={rows:['.......ww...','......w.....','..gggggggg..','..gjjjjjjg..','..gjjjjjjg..','..gjjwjjjg..','..gjjjjjjg..','...gjjjjg...','...gggggg...'],pal:{w:'#f6e7c8',g:'#cfe8e8',j:'#f5a742'}};
BMP.jam={rows:['...rrrrrr...','...rrrrrr...','..wwwwwwww..','..wjjjjjjw..','..wjjwjjjw..','..wjjjjjjw..','..wjjjjwjw..','..wjjjjjjw..','...wwwwww...'],pal:{r:'#f6e7c8',w:'#cfe8e8',j:'#c8647a'}};
ICON.juice=icon(BMP.juice); ICON.jam=icon(BMP.jam);
function plotRect(i){ return {x:7+(i%3)*51,y:62+Math.floor(i/3)*45,w:44,h:40}; }
var STARS=[[12,5],[40,11],[66,4],[92,14],[130,7],[150,16],[24,20],[108,24]];
var sparks=[];
function burst(x,y,c){ for(var i=0;i<8;i++) sparks.push({x:x,y:y,vx:(Math.random()-.5)*1.6,vy:-Math.random()*1.8-.4,life:18,c:c}); }

function drawPlant(cx,by,stage,s,t,i){
  var G='#6fbf5f', D='#3f8f4a';
  if(stage===0){ px(cx-2,by-1,5,2,'#3a2a22'); px(cx,by-3,1,2,G); return; }
  var hs=[0,7,13,19,25][stage], sway=Math.round(Math.sin(t/700+i*1.7));
  for(var h=0;h<=hs;h++) px(cx+(h>hs*0.6?sway:0),by-h,1,1,D);
  var hts=[[],[5],[5,10],[5,10,16],[6,12,18,23]][stage];
  for(var j=0;j<hts.length;j++){
    var hh=hts[j], ox=hh>hs*0.6?sway:0, y0=by-hh, len=Math.max(2,2+Math.min(stage,3)-j+(stage===4?1:0));
    for(var k=1;k<=len;k++){
      var yy=y0-Math.floor(k/2);
      px(cx+ox-k,yy,1,1,G); px(cx+ox+k,yy,1,1,G);
      if(k<len){ px(cx+ox-k,yy+1,1,1,D); px(cx+ox+k,yy+1,1,1,D); }
    }
    if(stage===4&&j>=2){ px(cx+ox-len-1,y0-Math.floor(len/2)-1,2,2,s.color); px(cx+ox+len,y0-Math.floor(len/2)-1,2,2,s.color); }
  }
  px(cx+sway-1,by-hs-2,3,3,G);
  if(stage===4){
    px(cx+sway-2,by-hs-4,5,5,s.color); px(cx+sway-1,by-hs-6,3,2,s.color);
    px(cx+sway-1,by-hs-3,1,1,'#ffffff');
    if(Math.floor(t/400+i)%4===0){ px(cx+sway+5,by-hs-6,1,3,'#fff'); px(cx+sway+4,by-hs-5,3,1,'#fff'); }
  }
}

function draw(t){
  var now=Date.now(), i;
  if(scene==='town'){ drawTown(t); return; }
  var bands=['#2a2148','#3d2a5e','#5e3672','#8f4a7c','#c8647a','#ee9a72'];
  for(i=0;i<6;i++) px(0,i*8,W,8,bands[i]);
  for(i=0;i<STARS.length;i++) if((Math.floor(t/600)+i)%3) px(STARS[i][0],STARS[i][1],1,1,'#f6e7c8');
  for(var dy=-11;dy<=0;dy++){ var hw=Math.round(Math.sqrt(121-dy*dy)); px(118-hw,48+dy,hw*2,1,'#ffd9a0'); }
  for(i=0;i<2;i++){ var cxc=((t/500+i*110)%220)-40, cyc=10+i*14; px(cxc,cyc,18,4,'#d98fa0'); px(cxc+4,cyc-3,9,3,'#d98fa0'); px(cxc+12,cyc+2,10,3,'#c8647a'); }
  for(var x=0;x<W;x+=2){ var hgt=7+Math.round(4*Math.sin(x/17)+3*Math.sin(x/7+2)); px(x,48-hgt,2,hgt,'#3a2a55'); }
  px(0,48,W,H-48,'#4d7a5a');
  for(i=0;i<150;i++) px((i*37)%160,50+(i*53)%150,1,1,i%9===0?'#f6e7c8':(i%2?'#416b4f':'#5c8c66'));
  for(x=1;x<W;x+=10) px(x,47,2,9,'#c9a27a');
  px(0,50,W,1,'#b08a66'); px(0,53,W,1,'#b08a66');
  // 小屋與農夫
  var FS=farmState();
  px(6,28,30,22,'#7a4a52'); var rc=FS.decor.goldroof?'#f5c451':'#b8566a'; px(4,24,34,5,rc); px(8,20,26,4,rc); px(12,17,18,3,rc);
  px(17,37,8,13,'#3a2433'); px(27,33,6,6,Math.floor(t/1500)%7?'#ffd98a':'#f5c451');
  person(42,36+(Math.floor(t/600)%2),0,1,FS.me);
  drawDecor(t,FS.decor);
  // 圍籬上的貓
  var cx0=((t/110)%520)-20; if(cx0<170) bmp(ctx,BMP.cat,Math.round(cx0),41+(Math.floor(t/300)%2));
  // 自己養的寵物在田邊散步
  var pi=0;
  PETS.forEach(function(pt){
    if(!FS.pets[pt.id]||FS.pets[pt.id].trip) return;
    var b=BMP[pt.id], wd=b.rows[0].length, span=W-wd-8, ph=(t/pt.pace+pi*97)%(span*2), right=ph<span, xx=right?ph:span*2-ph;
    bmp(ctx,b,4+Math.round(xx),61-b.rows.length-((pt.hop&&Math.floor(t/250+pi)%2)?1:0),right!==pt.faceRight);
    pi++;
  });
  // 田地
  var firstLocked=-1; for(i=0;i<9;i++) if(!FS.plots[i].u){ firstLocked=i; break; }
  for(i=0;i<9;i++){
    var p=FS.plots[i], r=plotRect(i);
    if(!p.u){
      px(r.x,r.y,r.w,r.h,'#3c5c48'); px(r.x+2,r.y+2,r.w-4,r.h-4,'#456a52');
      px(r.x+18,r.y+12,8,7,'#2a2148'); px(r.x+19,r.y+8,6,5,'#2a2148'); px(r.x+21,r.y+10,2,3,'#456a52');
      if(i===firstLocked&&scene!=='visit'){
        ctx.font='8px "Press Start 2P"'; ctx.textAlign='center'; ctx.textBaseline='top';
        ctx.fillStyle=S.coins>=PLOT_COST[i]?'#f5c451':'#b9a8cf'; ctx.fillText(String(PLOT_COST[i]),r.x+22,r.y+24);
      }
      continue;
    }
    var wet=p.crop&&now<p.water;
    px(r.x,r.y,r.w,r.h,'#3b2a2a'); px(r.x+2,r.y+2,r.w-4,r.h-4,wet?'#5a3d33':'#7a5644');
    for(var fyy=r.y+7;fyy<r.y+r.h-6;fyy+=8) px(r.x+4,fyy,r.w-8,1,wet?'#4a3029':'#69483a');
    if(!p.crop&&scene!=='visit'){
      if(pickI===i) outline(r.x-1,r.y-1,r.w+2,r.h+2,'#f5c451');
      else if(Math.floor(t/700)%2){ px(r.x+21,r.y+16,3,7,'#8a6a58'); px(r.x+19,r.y+18,7,3,'#8a6a58'); }
    }
    if(p.crop){
      var s=SMAP[p.crop], frac=Math.min(1,p.prog/s.time), ripe=frac>=1, stage=ripe?4:Math.floor(frac*4);
      drawPlant(r.x+22,r.y+33,stage,s,t,i);
      px(r.x+4,r.y+36,36,2,'#2a1f1f'); px(r.x+4,r.y+36,Math.round(36*frac),2,s.color);
      if(ripe){ var bb=Math.floor(t/250)%2; px(r.x+35,r.y+3+bb,5,5,'#f5c451'); px(r.x+37,r.y+4+bb,1,2,'#2a2148'); px(r.x+37,r.y+6+bb,1,1,'#f5c451'); px(r.x+37,r.y+7+bb,1,1,'#2a2148'); px(r.x+37,r.y+6+bb,1,1,'#f5c451'); }
      else if(!wet&&Math.floor(t/400)%2){ px(r.x+37,r.y+3,1,1,'#7fd8f0'); px(r.x+36,r.y+4,3,1,'#7fd8f0'); px(r.x+35,r.y+5,5,3,'#7fd8f0'); px(r.x+36,r.y+8,3,1,'#7fd8f0'); px(r.x+36,r.y+6,1,1,'#eafaff'); }
    }
  }
  var wv=SET.fx?weather(now).id:'none';
  if(wv==='rain'){ for(i=0;i<46;i++){ var rx=(i*41+Math.floor(t/30)*3)%W, ry=(i*67+Math.floor(t/30)*9)%H; px(rx,ry,1,3,'#9fd0f0'); } }
  else if(wv==='heat'){ ctx.fillStyle='rgba(255,170,90,.13)'; ctx.fillRect(0,0,W,H); for(i=0;i<5;i++) px(118+Math.round(Math.cos(i*1.3+t/900)*15),40+Math.round(Math.sin(i*1.3+t/900)*-9),2,2,'#ffd9a0'); }
  else if(wv==='fog'){ ctx.fillStyle='rgba(230,224,240,.22)'; for(i=0;i<5;i++) ctx.fillRect(((t/90+i*70)%260)-60,56+i*30,90,10); }
  else if(wv==='bow'){ var bc=['#ef7a8a','#f5c451','#8fd67a','#7fd8f0','#b48cf2']; for(i=0;i<5;i++) for(var a=0;a<60;a++){ var an=Math.PI*a/59, bx=60+Math.round(Math.cos(an)*(46-i)), by=50-Math.round(Math.sin(an)*(34-i)); if(by<47) px(bx,by,1,1,bc[i]); } }
  for(i=sparks.length-1;i>=0;i--){
    var sp=sparks[i]; sp.x+=sp.vx; sp.y+=sp.vy; sp.vy+=0.12; sp.life--;
    px(sp.x,sp.y,1,1,sp.c); if(sp.life<=0) sparks.splice(i,1);
  }
}

/* ---------- 小鎮：俯視大地圖。道路有斜的、有彎的；有功能的地是大塊，其他是小塊。
   小塊的地在地圖上一樣大，點進去才看得到實際大小；離市中心越近、面積越大就越貴 ---------- */
var scene='farm', TW=956, TH=700, CX=478, CY=350, curLot=null;
var ROADS=[
  [20,60,936,60],[20,350,936,350],[20,640,936,640],[20,60,20,640],[936,60,936,640],
  [120,60,120,640],[478,60,478,640],[840,60,840,640],
  [120,200,660,200],[300,60,300,200],[200,500,840,500],[660,200,660,640],[360,350,360,500],[200,500,200,640],[20,470,120,470],
  [300,200,478,350],[478,350,660,500],[840,60,660,200],[120,640,200,500],[660,200,740,270],[740,270,840,270]
];
function distPS(x,y,r){
  var dx=r[2]-r[0], dy=r[3]-r[1], t=((x-r[0])*dx+(y-r[1])*dy)/(dx*dx+dy*dy); t=Math.max(0,Math.min(1,t));
  var qx=r[0]+dx*t, qy=r[1]+dy*t; return {d:Math.sqrt((x-qx)*(x-qx)+(y-qy)*(y-qy)),pt:[qx,qy]};
}
function nearestRoad(x,y){ var b={d:1e9,pt:null}; for(var i=0;i<ROADS.length;i++){ var q=distPS(x,y,ROADS[i]); if(q.d<b.d) b=q; } return b; }
/* 路網：把道路在交叉點切開，變成節點和線段，角色沿著線段走 */
var NODES=[], EDGES=[];
(function(){
  function inter(a,b){
    var x1=a[0],y1=a[1],x2=a[2],y2=a[3],x3=b[0],y3=b[1],x4=b[2],y4=b[3], den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
    if(Math.abs(den)<1e-6) return null;
    var t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/den, u=-((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3))/den;
    return (t>-0.002&&t<1.002&&u>-0.002&&u<1.002)?[x1+t*(x2-x1),y1+t*(y2-y1)]:null;
  }
  function node(p){ for(var i=0;i<NODES.length;i++) if(Math.abs(NODES[i][0]-p[0])<1.5&&Math.abs(NODES[i][1]-p[1])<1.5) return i; NODES.push([Math.round(p[0]),Math.round(p[1])]); return NODES.length-1; }
  var pts=ROADS.map(function(r){ return [[r[0],r[1]],[r[2],r[3]]]; }), i, j;
  for(i=0;i<ROADS.length;i++) for(j=i+1;j<ROADS.length;j++){ var p=inter(ROADS[i],ROADS[j]); if(p){ pts[i].push(p); pts[j].push(p); } }
  ROADS.forEach(function(r,k){
    var dx=r[2]-r[0], dy=r[3]-r[1], prev=-1;
    pts[k].sort(function(a,b){ return ((a[0]-r[0])*dx+(a[1]-r[1])*dy)-((b[0]-r[0])*dx+(b[1]-r[1])*dy); });
    pts[k].forEach(function(p){ var n=node(p); if(prev>=0&&prev!==n){ var A=NODES[prev], B=NODES[n]; EDGES.push({a:prev,b:n,len:Math.sqrt((A[0]-B[0])*(A[0]-B[0])+(A[1]-B[1])*(A[1]-B[1]))}); } prev=n; });
  });
})();
/* 有功能的地（大塊）。row 1 表示在馬路北側、門口朝南 */
var FUNC=[
  {id:'post',  type:'shop', name:'郵局',    x:488,y:312,row:1,tab:'mail',roof:'#d9505a',ridge:'#f08a8a',icon:'mail'},
  {id:'shop',  type:'shop', name:'商店',    x:521,y:312,row:1,tab:'shop',  roof:'#6f9a6a',ridge:'#8fbf8a',icon:'bud'},
  {id:'market',type:'shop', name:'市場',    x:554,y:312,row:1,tab:'market',roof:'#c98a5a',ridge:'#e0a878',icon:'star'},
  {id:'lab',   type:'shop', name:'工坊',    x:587,y:312,row:1,tab:'lab',   roof:'#7a6fa8',ridge:'#9a8fc8',icon:'juice'},
  {id:'wear',  type:'shop', name:'服飾店',  x:620,y:312,row:1,tab:'wear',  roof:'#d97a9a',ridge:'#f0a8c0',icon:'hat'},
  {id:'pets',  type:'shop', name:'寵物店',  x:438,y:360,row:0,tab:'pets',  roof:'#d9a05a',ridge:'#f0c080',icon:'cat'},
  {id:'land',  type:'shop', name:'地政所',  x:405,y:360,row:0,tab:'land',  roof:'#8f9ab8',ridge:'#b0bad8',icon:'deed'},
  {id:'board', type:'board',name:'公告欄',  x:372,y:360,row:0,tab:'ach'},
  {id:'contest',type:'shop',name:'品評會場',x:320,y:360,row:0,tab:'contest',roof:'#a8862f',ridge:'#f5c451',icon:'cup'},
  {id:'dex',   type:'shop', name:'圖鑑館',  x:287,y:360,row:0,tab:'dex',   roof:'#5e7a9a',ridge:'#8fb0d0',icon:'book'},
  {type:'home',name:'阿嬤家',  x:380,y:312,row:1,npc:'隔壁阿嬤',  roof:'#b48cf2',ridge:'#d9c0ff',desc:'門口曬著一排醃菜。'},
  {type:'home',name:'派出所',  x:347,y:312,row:1,npc:'警察杯杯',  roof:'#4a6fd0',ridge:'#8aa6f0',desc:'門口停著一台腳踏車。'},
  {type:'home',name:'早餐店',  x:314,y:312,row:1,npc:'早餐店老闆',roof:'#ee9a72',ridge:'#ffc8a8',desc:'一大早就飄出蛋餅香。'},
  {type:'home',name:'土地公廟',x:542,y:360,row:0,npc:'廟口里長',  roof:'#c8647a',ridge:'#f5c451',desc:'里長每天在這裡泡茶。'},
  {type:'home',name:'星際民宿',x:575,y:360,row:0,npc:'外星觀光客',roof:'#7fd8f0',ridge:'#c8f2ff',desc:'屋頂上停著一台小飛碟。'}
];
var LOTS=[], LOTMAP={};
(function(){
  var SIZES=[[2,2],[2,3],[3,3],[3,3],[3,4],[4,4],[4,5],[5,5],[6,6]], ROOFS=['#b8566a','#8f6a4a','#5e7a9a','#7a8a5a','#9a6a8a'], idx=0;
  FUNC.forEach(function(f,i){ f.n='f'+i; f.w=30; f.h=28; f.label=1; f.door=nearestRoad(f.x+15,f.y+14).pt; LOTS.push(f);
    if(nearestRoad(f.x+15,f.y+14).d<16||nearestRoad(f.x,f.y).d<8||nearestRoad(f.x+30,f.y).d<8||nearestRoad(f.x,f.y+28).d<8||nearestRoad(f.x+30,f.y+28).d<8) console.warn('lot too close to a road: '+f.name); });
  for(var gy=10;gy<TH-20;gy+=16) for(var gx=10;gx<TW-20;gx+=17){
    var n=idx++, cx=gx+7.5, cy=gy+7, nr=nearestRoad(cx,cy), k, ok=true;
    if(nr.d>46||nr.d<15) continue;
    for(k=0;k<FUNC.length;k++) if(gx<FUNC[k].x+32&&gx+15>FUNC[k].x-2&&gy<FUNC[k].y+30&&gy+14>FUNC[k].y-2){ ok=false; break; }
    if(!ok) continue;
    if((cx-750)*(cx-750)/3844+(cy-425)*(cy-425)/1521<1) continue;
    var P=[[gx,gy],[gx+15,gy],[gx,gy+14],[gx+15,gy+14],[cx,gy],[cx,gy+14],[gx,cy],[gx+15,cy]];
    for(k=0;k<8;k++) if(nearestRoad(P[k][0],P[k][1]).d<9){ ok=false; break; }
    if(!ok) continue;
    var c=1-Math.min(1,Math.sqrt((cx-CX)*(cx-CX)+(cy-CY)*(cy-CY))/520), r=rnd(n*3.7+2), sz=SIZES[Math.floor(rnd(n*1.9+7)*SIZES.length)];
    var l={n:n,x:gx,y:gy,w:15,h:14,small:1,door:nr.pt,c:c,sw:sz[0],sh:sz[1]};
    if(r<0.36){ l.type='sale'; l.name='土地 '+n+' 號'; l.price=Math.round((800+9000*c*c)*sz[0]*sz[1]/9/100)*10000; }
    else if(r<0.6+0.25*c){ l.type='house'; l.name='民宅 '+n+' 號'; l.roof=ROOFS[n%5]; l.ridge='#e6dcf0'; }
    else if(r<0.97){ l.type='woods'; l.name='小樹林'; }
    else { l.type='pond'; l.name='小池塘'; }
    LOTS.push(l); LOTMAP[n]=l;
  }
})();
var HOMEPOOL=LOTS.filter(function(l){ return l.small&&l.type==='sale'&&l.sw===3&&l.sh===3&&l.price<=400000; });
function homeLot(){ return LOTMAP[S.home]||HOMEPOOL[0]; }
var town={cx:0,cy:0,vx:0,vy:0,drag:null,moved:false};
function centerOn(x,y){ town.cx=clamp(x-W/2,0,TW-W); town.cy=clamp(y-H/2,0,TH-H); town.vx=town.vy=0; }
var NPC=[{x:300,y:345,ax:'x',lo:30,hi:920,dir:1,sp:9,c:{hair:'#e6e0f0',skin:'#f2c9a0',shirt:'#b48cf2',pants:'#5e4a82'}},{x:483,y:200,ax:'y',lo:70,hi:630,dir:-1,sp:12,c:{hat:'#4a6fd0',skin:'#f2c9a0',shirt:'#4a6fd0',pants:'#2a2148'}}];
var fish={st:'idle',msg:'',t1:0,t2:0};
function fishReset(){ clearTimeout(fish.t1); clearTimeout(fish.t2); fish.st='idle'; fish.msg=''; }
var ME={};
function syncLook(){
  var h=HATS.filter(function(x){return x.id===S.look.hat;})[0]||HATS[0], sh=SHIRTS.filter(function(x){return x.id===S.look.shirt;})[0]||SHIRTS[0];
  ME={hatType:h.id,hat:h.c,hair:'#6b4a3a',skin:'#f2c9a0',shirt:sh.c,pants:'#3d4a7a',long:S.gender==='f'};
}
syncLook();
BMP.lampi={rows:['.....yy.....','....yyyy....','....yyyy....','.....kk.....','.....kk.....','.....kk.....','....kkkk....'],pal:{y:'#ffd98a',k:'#b9a8cf'}};
BMP.hat={rows:['....yyyy....','...yyyyyy...','...yrrrry...','.yyyyyyyyyy.','yyyyyyyyyyyy'],pal:{y:'#e8c36a',r:'#c8647a'}};
BMP.cup={rows:['..yyyyyyyy..','.yyyyyyyyyy.','.y.yyyyyy.y.','..yyyyyyyy..','...yyyyyy...','.....yy.....','....yyyy....'],pal:{y:'#f5c451'}};
BMP.book={rows:['..bbbbbbbb..','..bwwwwwwb..','..bwkkkkwb..','..bwwwwwwb..','..bwkkkwwb..','..bwwwwwwb..','..bbbbbbbb..'],pal:{b:'#c8647a',w:'#f6e7c8',k:'#5e4a82'}};
function farmState(){ return scene==='visit'&&VISIT?VISIT.fs:{decor:S.decor,pets:S.pets,plots:S.plots,me:ME}; }
function lookOf(look,g){
  look=look||{}; var h=HATS.filter(function(x){return x.id===look.hat;})[0]||HATS[0], sh=SHIRTS.filter(function(x){return x.id===look.shirt;})[0]||SHIRTS[0];
  return {hatType:h.id,hat:h.c,hair:'#6b4a3a',skin:'#f2c9a0',shirt:sh.c,pants:'#3d4a7a',long:g==='f'};
}
function drawDecor(t,D){
  D=D||S.decor; var k, r;
  if(D.sign){ px(56,44,1,6,'#b08a66'); px(51,38,11,7,'#b08a66'); px(52,39,9,5,'#c9a27a'); px(53,40,6,1,'#5e4a82'); px(53,42,4,1,'#5e4a82'); }
  if(D.lamp){ ctx.fillStyle='rgba(255,217,138,.18)'; ctx.fillRect(66,28,9,9); px(70,34,1,16,'#2a2148'); px(69,31,3,3,'#ffd98a'); px(68,30,5,1,'#2a2148'); }
  if(D.birdhouse){ px(86,38,1,12,'#b08a66'); px(83,32,7,6,'#d9705a'); px(82,31,9,2,'#7a4a52'); px(86,34,1,2,'#2a2148'); if(Math.floor(t/2500)%3===0){ px(84,29,2,2,'#7fd8f0'); px(86,30,1,1,'#f5c451'); } }
  if(D.scarecrow){ px(102,36,1,14,'#b08a66'); px(98,39,9,1,'#b08a66'); px(101,33,3,3,'#f2c9a0'); px(100,32,5,1,'#e8c36a'); px(101,31,3,1,'#e8c36a'); px(100,40,5,5,'#d9705a'); }
  if(D.lantern){ px(119,44,3,6,'#9a8fb8'); px(117,40,7,4,'#b9a8cf'); px(119,41,3,2,'#ffd98a'); px(118,38,5,2,'#9a8fb8'); px(120,37,1,1,'#9a8fb8'); }
  if(D.windmill){ px(141,32,4,18,'#c9bfd8'); px(140,42,6,8,'#c9bfd8'); px(142,44,2,6,'#3a2433');
    for(k=0;k<4;k++){ var an=t/900+k*Math.PI/2; for(r=1;r<=9;r++) px(143+Math.round(Math.cos(an)*r),32+Math.round(Math.sin(an)*r),1,1,'#f6e7c8'); } px(142,31,2,2,'#c8647a'); }
  if(D.trophy){ px(128,47,5,3,'#b08a66'); px(128,40,5,4,'#f5c451'); px(130,44,1,3,'#f5c451'); px(127,41,1,2,'#f5c451'); px(133,41,1,2,'#f5c451'); px(129,41,1,1,'#fff6c8'); }
  if(D.pumpkin){ px(108,46,6,4,'#e8862b'); px(110,45,2,1,'#3f8f4a'); px(109,47,1,1,'#ffd98a'); px(112,47,1,1,'#ffd98a'); }
  if(D.xtree){ for(k=0;k<6;k++) px(153-k,38+k*2,1+k*2,2,'#2f7a45'); px(152,50,2,3,'#7a4a52'); px(152,37,1,1,'#f5c451'); px(150,44,1,1,'#ef4a4a'); px(154,46,1,1,'#7fd8f0'); }
  if(D.couplet){ px(15,36,2,10,'#d9303a'); px(25,36,2,10,'#d9303a'); px(18,34,6,2,'#d9303a'); px(15,38,1,1,'#f5c451'); px(26,40,1,1,'#f5c451'); }
  if(D.flowers){ var fc=['#ef7a8a','#f5c451','#b48cf2','#f6e7c8']; for(k=4;k<W;k+=9){ px(k,57,1,2,'#6fbf5f'); px(k-1,56,3,1,fc[(k/9|0)%4]); px(k,55,1,1,fc[(k/9|0)%4]); } }
}
BMP.mail={rows:['............','.wwwwwwwwww.','.wkwwwwwwkw.','.wwkwwwwkww.','.wwwkwwkwww.','.wwwwkkwwww.','.wwwwwwwwww.','............'],pal:{w:'#f6e7c8',k:'#c8647a'}};
BMP.bud={rows:BUD,pal:{c:'#8fd67a',d:'#5fa052',g:'#6fbf5f',w:'#ffffff',s:'#3f8f4a'}};
BMP.deed={rows:['..wwwwwww...','..wkkkkkw...','..wwwwwww...','..wkkkkkw...','..wwwwwww...','..wkkkwww...','..wwwwwrw...','..wwwwwww...'],pal:{w:'#f6e7c8',k:'#5e4a82',r:'#c8647a'}};
var LBL=LOTS.filter(function(l){return l.label;});
var lblEls=LBL.map(function(l){
  var d=document.createElement('div'); d.className='lbl'; d.textContent=l.name;
  d.style.transform=l.row?'translate(-50%,-100%)':'translate(-50%,0)';
  $('labels').appendChild(d); return d;
});
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function person(fx,fy,step,dir,c){
  var ht=c.hatType||(c.hat?'straw':'none');
  if(ht==='straw'){ px(fx-1,fy,8,2,c.hat); px(fx+1,fy-2,4,2,c.hat); }
  else if(ht==='cap'){ px(fx+1,fy-1,4,3,c.hat); px(fx+(dir>0?5:-1),fy+1,2,1,c.hat); }
  else if(ht==='beanie'){ px(fx+1,fy-2,4,4,c.hat); px(fx+2,fy-3,2,1,'#f6e7c8'); }
  else if(ht==='crown'){ px(fx+1,fy,4,2,c.hat); px(fx+1,fy-2,1,2,c.hat); px(fx+3,fy-2,1,2,c.hat); px(fx+4,fy-1,1,1,c.hat); px(fx+2,fy,1,1,'#ef4a4a'); }
  else if(ht==='wizard'){ px(fx,fy,6,2,c.hat); px(fx+1,fy-2,4,2,c.hat); px(fx+2,fy-4,2,2,c.hat); px(fx+2,fy-1,1,1,'#f5c451'); }
  else { px(fx+1,fy-1,4,3,c.hair||c.hat); }
  px(fx+1,fy+2,4,3,c.skin); px(fx+(dir>0?4:1),fy+3,1,1,'#2a2148');
  px(fx,fy+5,6,5,c.shirt); px(fx+1,fy+10,2,3-step,c.pants); px(fx+3,fy+10,2,2+step,c.pants);
  if(c.long){ px(fx,fy+1,1,7,c.hair||'#6b4a3a'); px(fx+5,fy+1,1,7,c.hair||'#6b4a3a'); }
}
function drawPerson(el,g){ var saved=ctx; ctx=el.getContext('2d'); ctx.clearRect(0,0,el.width,el.height); person(2,3,0,1,{hatType:'straw',hat:'#e8c36a',hair:'#6b4a3a',skin:'#f2c9a0',shirt:'#d9705a',pants:'#3d4a7a',long:g==='f'}); ctx=saved; }
var AVC={};
function avatar(g){ g=g==='f'?'f':'m'; if(!AVC[g]){ var el=document.createElement('canvas'); el.width=10; el.height=16; drawPerson(el,g); AVC[g]=el.toDataURL(); } return AVC[g]; }
var dynEls=[];
function dynLabel(i,text,x,y){
  var el=dynEls[i]; if(!el){ el=document.createElement('div'); el.className='lbl'; $('labels').appendChild(el); dynEls[i]=el; }
  if(el.textContent!==text) el.textContent=text; el.style.display='block'; el.style.left=x+'px'; el.style.top=y+'px';
}
function updateLabels(){
  var sc=cv.clientWidth/W, di=0;
  LBL.forEach(function(l,i){
    var el=lblEls[i], x=l.x+15-town.cx, y=(l.row?l.y:l.y+28)-town.cy;
    if(scene!=='town'||!SET.labels||x<14||x>W-14||y<10||y>H-10){ el.style.display='none'; return; }
    el.style.display='block'; el.style.left=(cv.offsetLeft+x*sc)+'px'; el.style.top=(cv.offsetTop+y*sc)+'px';
  });
  if(scene==='town'){
    var list=[], hl=LOTMAP[S.home]; if(hl) list.push([hl,'你的農場']);
    if(SET.labels) Object.keys(WORLD.lots).forEach(function(k){ var o=WORLD.lots[k], p=WORLD.prof[o.owner], l=LOTMAP[k]; if(o.kind==='home'&&l&&p&&!(user&&o.owner===user.id)) list.push([l,p.name]); });
    list.forEach(function(it){ var l=it[0], x=l.x+7-town.cx, y=l.y+14-town.cy; if(x<10||x>W-10||y<4||y>H-8) return; dynLabel(di++,it[1],cv.offsetLeft+x*sc,cv.offsetTop+y*sc); });
  }
  for(;di<dynEls.length;di++) dynEls[di].style.display='none';
}
function tree(x,y){ px(x+1,y,4,6,'#2f6b45'); px(x,y+1,6,4,'#2f6b45'); px(x+1,y+1,2,2,'#4f9a62'); }
function outline(X,Y,w,h,c){ px(X,Y,w,1,c); px(X,Y+h-1,w,1,c); px(X,Y,1,h,c); px(X+w-1,Y,1,h,c); }
function drawBig(l,t,ox,oy){
  var X=l.x-ox, Y=l.y-oy, k, ty=l.type;
  if(ty==='shop'||ty==='home'){
    var by=l.row?Y+3:Y+8;
    px(X,Y,30,28,'#c9bfd8'); outline(X,Y,30,28,'#9a8fb8');
    if(l.row) px(X+13,by+17,4,Y+28-by-17,'#f0e8f6'); else px(X+13,Y,4,by-Y,'#f0e8f6');
    ctx.fillStyle='rgba(42,33,72,.35)'; ctx.fillRect(X+5,by+1,22,17);
    px(X+4,by,22,17,l.roof); px(X+4,by,22,1,l.ridge); px(X+4,by+8,22,1,l.ridge); px(X+21,by+2,3,3,'#3a2433');
    if(l.icon){ var ic=BMP[l.icon]; px(X+8,by+2,14,13,'#2a2148'); bmp(ctx,ic,X+15-Math.floor(ic.rows[0].length/2),by+8-Math.floor(ic.rows.length/2)); }
  } else if(ty==='farm'){
    px(X,Y,30,28,'#5c8c66'); outline(X,Y,30,28,Math.floor(t/500)%2?'#f5c451':'#c9a27a');
    px(X+13,Y+24,4,4,'#b08a66'); px(X+3,Y+4,9,8,S.decor.goldroof?'#f5c451':'#b8566a'); px(X+3,Y+7,9,1,'#d97a8a');
    for(k=0;k<9;k++){
      var p=S.plots[k], qx=X+13+(k%3)*5, qy=Y+4+Math.floor(k/3)*6;
      if(!p.u){ px(qx,qy,4,5,'#456a52'); continue; }
      px(qx,qy,4,5,'#7a5644');
      if(p.crop){ var st=SMAP[p.crop]; px(qx+1,qy+1,2,3,p.prog>=st.time?st.color:'#6fbf5f'); }
    }
    tree(X+4,Y+16);
  } else {
    px(X,Y,30,28,'#64996f'); outline(X,Y,30,28,'#4f8a5c'); px(X+13,Y,4,9,'#f0e8f6');
    px(X+9,Y+18,2,6,'#b08a66'); px(X+19,Y+18,2,6,'#b08a66'); px(X+6,Y+9,18,11,'#b08a66'); px(X+7,Y+10,16,9,'#c9a27a'); px(X+8,Y+11,4,6,'#f6e7c8'); px(X+13,Y+11,4,4,'#f5c451'); px(X+18,Y+12,4,6,'#f6e7c8');
    if(S.tasks.length&&Math.floor(t/400)%2) px(X+22,Y+6,4,4,'#ef4a4a');
  }
}
function drawFarmSmall(l,ox,oy,mine,col,landOnly){
  var X=l.x-ox, Y=l.y-oy, k;
  px(X,Y,15,14,'#5c8c66');
  if(landOnly){ px(X+3,Y+3,9,7,'#9a8fb8'); px(X+3,Y+3,9,1,'#c9bfd8'); px(X+6,Y+10,3,3,'#b08a66'); }
  else for(k=0;k<9;k++){
    var qx=X+1+(k%3)*5, qy=Y+1+Math.floor(k/3)*4;
    if(mine){ var p=S.plots[k]; if(!p.u){ px(qx,qy,4,3,'#456a52'); continue; } px(qx,qy,4,3,'#7a5644'); if(p.crop){ var st=SMAP[p.crop]; px(qx+1,qy+1,2,1,p.prog>=st.time?st.color:'#6fbf5f'); } }
    else { px(qx,qy,4,3,'#7a5644'); if((k+l.n)%3) px(qx+1,qy+1,2,1,'#6fbf5f'); }
  }
  outline(X,Y,15,14,col);
}
function drawSmall(l,ox,oy){
  var X=l.x-ox, Y=l.y-oy, ty=l.type, own=S.land[l.n];
  if(own){
    var bd=own.b?BUILDINGS.filter(function(b){return b.id===own.b;})[0]:null;
    px(X,Y,15,14,'#5c8c66');
    if(bd){ ctx.fillStyle='rgba(42,33,72,.35)'; ctx.fillRect(X+3,Y+3,11,9); px(X+2,Y+2,11,9,bd.c); px(X+2,Y+6,11,1,'#ffffff'); }
    else { px(X+7,Y+4,1,7,'#b08a66'); px(X+8,Y+4,4,3,'#f5c451'); }
    outline(X,Y,15,14,'#f5c451');
  } else if(ty==='sale'){
    px(X,Y,15,14,'#7d9a6a');
    px(X,Y,4,1,'#f6e7c8'); px(X+11,Y,4,1,'#f6e7c8'); px(X,Y+13,4,1,'#f6e7c8'); px(X+11,Y+13,4,1,'#f6e7c8'); px(X,Y,1,4,'#f6e7c8'); px(X+14,Y,1,4,'#f6e7c8'); px(X,Y+10,1,4,'#f6e7c8'); px(X+14,Y+10,1,4,'#f6e7c8');
    px(X+7,Y+8,1,3,'#b08a66'); px(X+5,Y+4,5,4,'#f6e7c8'); px(X+6,Y+5,3,1,'#c8647a');
  } else if(ty==='house'){
    px(X,Y,15,14,'#5f9068'); ctx.fillStyle='rgba(42,33,72,.35)'; ctx.fillRect(X+3,Y+3,11,9);
    px(X+2,Y+2,11,9,l.roof); px(X+2,Y+6,11,1,l.ridge); px(X+10,Y+3,2,2,'#3a2433');
  } else if(ty==='woods'){
    px(X,Y,15,14,'#4a7a58'); tree(X+1,Y+1); tree(X+8,Y+6);
  } else {
    px(X,Y,15,14,'#5f9068'); px(X+2,Y+3,11,8,'#5aa0c8'); px(X+2,Y+3,1,1,'#5f9068'); px(X+12,Y+3,1,1,'#5f9068'); px(X+2,Y+10,1,1,'#5f9068'); px(X+12,Y+10,1,1,'#5f9068'); px(X+5,Y+5,4,1,'#bfe4f4');
  }
}
/* 不會變的部分（草地、道路、沒人買的地）先畫到一張大圖上，之後每一格只要貼圖 */
var townBg=null, miniBg=null;
function thick(r,wd,col){
  var x1=r[0],y1=r[1],x2=r[2],y2=r[3], h=wd/2;
  if(x1===x2||y1===y2){ px(Math.min(x1,x2)-h,Math.min(y1,y2)-h,Math.abs(x2-x1)+wd,Math.abs(y2-y1)+wd,col); return; }
  var len=Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
  for(var i=0;i<=len;i++) px(x1+(x2-x1)*i/len-h,y1+(y2-y1)*i/len-h,wd,wd,col);
}
function renderTownBg(){
  var saved=ctx, i, x, y;
  townBg=document.createElement('canvas'); townBg.width=TW; townBg.height=TH; ctx=townBg.getContext('2d');
  px(0,0,TW,TH,'#4d7a5a');
  for(i=0;i<3200;i++) px(Math.floor(rnd(i+0.3)*TW),Math.floor(rnd(i*1.7+9)*TH),1,1,i%13===0?'#f6e7c8':(i%2?'#416b4f':'#5c8c66'));
  for(i=0;i<420;i++){ x=Math.floor(rnd(i*2.3+5)*TW); y=Math.floor(rnd(i*3.1+11)*TH); if(nearestRoad(x+3,y+3).d>48) tree(x,y); }
  for(y=-39;y<=39;y++){ var hw=Math.round(62*Math.sqrt(1-y*y/1521)); px(750-hw,425+y,hw*2,1,'#5aa0c8'); }
  for(y=-33;y<=33;y+=11){ px(730+(y*7)%30,425+y,14,1,'#bfe4f4'); }
  ROADS.forEach(function(r){ thick(r,18,'#b9a8cf'); }); ROADS.forEach(function(r){ thick(r,14,'#4a3f63'); });
  ROADS.forEach(function(r){ var len=Math.sqrt((r[2]-r[0])*(r[2]-r[0])+(r[3]-r[1])*(r[3]-r[1])), ax=(r[0]===r[2]||r[1]===r[3]);
    for(i=10;i<len-10;i+=12){ var qx=r[0]+(r[2]-r[0])*i/len, qy=r[1]+(r[3]-r[1])*i/len, clear=true;
      for(var k=0;k<NODES.length;k++) if(Math.abs(NODES[k][0]-qx)<14&&Math.abs(NODES[k][1]-qy)<14){ clear=false; break; }
      if(clear) px(qx,qy,ax&&r[1]===r[3]?6:(ax?1:2),ax&&r[0]===r[2]?6:(ax?1:2),'#8d7fb0'); } });
  LOTS.forEach(function(l){ if(l.small) drawSmall(l,0,0); else if(l.type!=='farm'&&l.type!=='board') drawBig(l,0,0,0); });
  ctx=saved;
  miniBg=document.createElement('canvas'); miniBg.width=48; miniBg.height=35; var m=miniBg.getContext('2d');
  m.fillStyle='#35284f'; m.fillRect(0,0,48,35); m.fillStyle='#5aa0c8'; m.fillRect(35,20,6,3);
  m.strokeStyle='#8d7fb0'; m.lineWidth=1; ROADS.forEach(function(r){ m.beginPath(); m.moveTo(r[0]/20+0.5,r[1]/20+0.5); m.lineTo(r[2]/20+0.5,r[3]/20+0.5); m.stroke(); });
  m.fillStyle='#f5c451'; FUNC.forEach(function(f){ m.fillRect(Math.round(f.x/20),Math.round(f.y/20),2,1); });
}
function drawTown(t){
  if(!townBg) renderTownBg();
  var cx=Math.round(town.cx), cy=Math.round(town.cy);
  ctx.drawImage(townBg,cx,cy,W,H,0,0,W,H);
  LOTS.forEach(function(l){ if(l.x-cx>W||l.y-cy>H||l.x+l.w-cx<0||l.y+l.h-cy<0) return;
    if(l.type==='board') drawBig(l,t,cx,cy);
    else if(l.small){
      if(l.n===S.home) drawFarmSmall(l,cx,cy,true,Math.floor(t/500)%2?'#f5c451':'#ef7a8a');
      else if(S.land[l.n]) drawSmall(l,cx,cy);
      else { var o=WORLD.lots[l.n]; if(o) drawFarmSmall(l,cx,cy,false,isFriend(o.owner)?'#5aa0f2':'#f6e7c8',o.kind!=='home'); }
    } });
  var catx=((t/140)%(TW+60))-30; bmp(ctx,BMP.cat,Math.round(catx)-cx,CY+1-cy,false);
  NPC.forEach(function(n,k){ person(Math.round(n.x)-3-cx,Math.round(n.y)-10-cy,Math.floor(t/260+k)%2,n.dir,n.c); });
  var mx=W-52, my=H-39;
  ctx.drawImage(miniBg,mx,my); outline(mx-1,my-1,50,37,'#5e4a82');
  Object.keys(S.land).forEach(function(k){ var l=LOTMAP[k]; if(l) px(mx+Math.round(l.x/20),my+Math.round(l.y/20),1,1,'#8fd67a'); });
  FR.mine.forEach(function(id){ var l=LOTMAP[WORLD.home[id]]; if(l) px(mx+Math.round(l.x/20),my+Math.round(l.y/20),2,2,'#5aa0f2'); });
  var hl=LOTMAP[S.home]; if(hl) px(mx+Math.round(hl.x/20),my+Math.round(hl.y/20),2,2,'#ef7a8a');
  outline(mx+Math.round(cx/20),my+Math.round(cy/20),8,10,'#f6e7c8');
  updateLabels();
}
function townStep(dt){
  NPC.forEach(function(n){ n[n.ax]+=n.dir*n.sp*dt; if(n[n.ax]<n.lo) n.dir=1; if(n[n.ax]>n.hi) n.dir=-1; });
  if(!town.drag&&(Math.abs(town.vx)>2||Math.abs(town.vy)>2)){ town.cx+=town.vx*dt; town.cy+=town.vy*dt; var dk=Math.pow(0.02,dt); town.vx*=dk; town.vy*=dk; }
  town.cx=clamp(town.cx,0,TW-W); town.cy=clamp(town.cy,0,TH-H);
}
/* 小鎮：拖曳平移畫面，點一下直接進入或查看；點右下角小地圖可以跳過去 */
function townClick(x,y){
  if(tab){ closePanel(); return; }
  var mx=W-52, my=H-39;
  if(x>=mx&&y>=my&&x<mx+50&&y<my+37){ centerOn((x-mx)*20,(y-my)*20); return; }
  var wx=x+town.cx, wy=y+town.cy, hit=null;
  LOTS.forEach(function(l){ if(wx>=l.x&&wx<=l.x+l.w&&wy>=l.y&&wy<=l.y+l.h) hit=l; });
  if(hit){ sfx('open'); enterLot(hit); }
}
cv.addEventListener('pointerdown',function(e){
  if(scene!=='town'||modalOpen) return;
  town.drag={x:e.clientX,y:e.clientY,cx:town.cx,cy:town.cy,t:performance.now(),lx:e.clientX,ly:e.clientY}; town.moved=false; town.vx=town.vy=0;
  try{ cv.setPointerCapture(e.pointerId); }catch(er){}
});
cv.addEventListener('pointermove',function(e){
  var d=town.drag; if(!d||scene!=='town') return;
  var sc=W/cv.getBoundingClientRect().width, dx=(e.clientX-d.x)*sc, dy=(e.clientY-d.y)*sc, now=performance.now(), dt=Math.max(1,now-d.t)/1000;
  if(!town.moved&&Math.abs(e.clientX-d.x)+Math.abs(e.clientY-d.y)<7) return;
  town.moved=true; if(tab) closePanel();
  town.vx=-(e.clientX-d.lx)*sc/dt*0.6+town.vx*0.4; town.vy=-(e.clientY-d.ly)*sc/dt*0.6+town.vy*0.4; town.vx=clamp(town.vx,-320,320); town.vy=clamp(town.vy,-320,320); d.lx=e.clientX; d.ly=e.clientY; d.t=now;
  town.cx=clamp(d.cx-dx,0,TW-W); town.cy=clamp(d.cy-dy,0,TH-H);
});
function dragEnd(){ if(town.drag&&performance.now()-town.drag.t>120) town.vx=town.vy=0; town.drag=null; }
cv.addEventListener('pointerup',dragEnd); cv.addEventListener('pointercancel',dragEnd);
function enterLot(l){
  if(l.n===S.home) setScene('farm');
  else if(l.tab) showTab(l.tab);
  else { curLot=l; fishReset(); showTab('lot'); }
}
function setScene(sc,keep){
  scene=sc; if(tab) closePanel(); if(sc!=='visit') VISIT=null;
  closePicker(); town.drag=null;
  if(sc==='town'&&keep){ loadWorld(); townStep(0); }
  else if(sc==='town'){ loadWorld(); var hl=homeLot(); centerOn(hl.x+7,hl.y+7); if(!S.townSeen) toast('拖曳可以移動地圖，點一塊地直接進入或查看'); S.townSeen=1; }
  $('stage').style.background=sc==='town'?'#4d7a5a':'';
  updateLabels(); hud();
}

/* ---------- 種植：點空地跳出種子選單 ---------- */
var pickI=-1;
function closePicker(){ if(pickI<0) return; pickI=-1; $('picker').classList.remove('open'); }
function openPicker(i){
  var p=S.plots[i], r=plotRect(i), el=$('picker'), sc=cv.clientWidth/W, st=$('stage');
  var have=STRAINS.filter(function(s){ return S.seeds[s.id]>0; }).sort(function(a,b){ return (b.id===S.seed)-(a.id===S.seed); });
  pickI=i; sfx('open');
  el.innerHTML=have.length?'<div class="pkgrid">'+have.map(function(s){
      return '<button type="button" class="pk" data-seed="'+s.id+'"><img alt="" src="'+ICON[s.id]+'"><b>'+S.seeds[s.id]+'</b><span>'+s.name+'</span>'+(p.prev?(p.prev===s.id?'<i class="down">連種</i>':'<i class="up">輪作</i>'):'')+'</button>'; }).join('')+'</div>'
    :'<div class="pkempty">沒有種子</div><button type="button" class="btn" data-shop="1">去商店買</button>';
  el.classList.add('open');
  var pw=el.offsetWidth, ph=el.offsetHeight, cx=cv.offsetLeft+(r.x+r.w/2)*sc, top=cv.offsetTop+r.y*sc, bot=cv.offsetTop+(r.y+r.h)*sc;
  var left=clamp(cx-pw/2,6,st.clientWidth-pw-6), y=top-ph-8; if(y<6) y=Math.min(bot+8,st.clientHeight-ph-6);
  el.style.left=left+'px'; el.style.top=y+'px';
}
function plant(i,id){
  var p=S.plots[i], s=SMAP[id], r=plotRect(i), now=Date.now();
  if(!p||!p.u||p.crop||!s||!(S.seeds[id]>0)) return;
  S.seeds[id]--; S.seed=id;
  p.crop=s.id; p.prog=0; p.last=now; p.dry=0; p.t0=now; p.stolen=0; p.n=5+Math.floor(Math.random()*6); p.water=S.upg.sprinkler?now+1e9:0;
  if(p.prev===s.id){ p.streak=(p.streak||0)+1; p.rot=Math.max(-0.3,-0.08*p.streak*(has(s,'heirloom')?2:1)); }
  else { p.streak=0; p.rot=p.prev?0.1:0; }
  p.prev=s.id;
  burst(r.x+22,r.y+30,'#7a5644'); sfx('plant');
  toast('種下「'+s.name+'」'+(p.rot>0?'，輪作：品質運氣提高':(p.rot<0?'，連種：品質運氣下降':''))+(S.upg.sprinkler?'':'，再點一下澆水'));
  checkAch(); hud(); refreshPanel(); Store.save(S);
}
$('picker').addEventListener('click',function(e){
  var b=e.target.closest('button'); if(!b) return; var i=pickI;
  if(b.dataset.shop){ closePicker(); shopTab='seed'; showTab('shop'); return; }
  closePicker(); plant(i,b.dataset.seed);
});
function logAdd(m,t){ S.log=S.log||[]; S.log.push({t:t||Date.now(),m:m}); S.log.sort(function(a,b){ return b.t-a.t; }); if(S.log.length>80) S.log.length=80; }

/* ---------- 田地操作：點一下，依狀態做對的事 ---------- */
cv.addEventListener('click',function(e){
  if(modalOpen) return;
  var b=cv.getBoundingClientRect(), x=(e.clientX-b.left)/b.width*W, y=(e.clientY-b.top)/b.height*H, now=Date.now();
  if(scene==='town'){ if(town.moved){ town.moved=false; return; } townClick(x,y); return; }
  if(scene==='visit'){ visitClick(x,y); return; }
  var hitI=-1, hi; for(hi=0;hi<9;hi++){ var hr=plotRect(hi); if(x>=hr.x&&x<=hr.x+hr.w&&y>=hr.y&&y<=hr.y+hr.h) hitI=hi; }
  if(pickI>=0&&(hitI<0||S.plots[hitI].crop||!S.plots[hitI].u)){ closePicker(); return; }
  for(var i=0;i<9;i++){
    var r=plotRect(i); if(x<r.x||x>r.x+r.w||y<r.y||y>r.y+r.h) continue;
    var p=S.plots[i];
    if(!p.u){
      var first=-1; for(var k=0;k<9;k++) if(!S.plots[k].u){ first=k; break; }
      toast('到小鎮的「地政所」買地'+(i===first?'，這塊要 '+PLOT_COST[i]+' 金幣':'')); return;
    } else if(!p.crop){
      if(pickI===i) closePicker(); else openPicker(i);
      return;
    } else {
      grow(p,now);
      var st=SMAP[p.crop];
      if(isRipe(p)){
        var hn=Math.max(0,(p.n||5)-(p.stolen||0)), L=luck(p,st), cnt=[0,0,0,0,0,0], best=-1, hk, kept=false, hbs='';
        for(hk=0;hk<hn;hk++){ var q=rollQ(L); cnt[q]++; S.inv[st.id][q]++; S.dex[st.id+q]=1; if(q>best) best=q; }
        if(hn){
          S.stats.harvest+=hn; if(st.id==='gold') S.stats.gold+=hn; if(best>S.stats.best) S.stats.best=best;
          var di=S.dexInfo[st.id]||(S.dexInfo[st.id]={n:0,first:now}); di.n+=hn;
          kept=st.gen?Math.random()<0.6+0.05*best:Math.random()<petBonus('bunny'); if(kept) S.seeds[st.id]=(S.seeds[st.id]||0)+1;
          addXp(Math.ceil(st.time/100*(1+petBonus('chick'))*(1+0.2*best)*evMul('xp')));
          var hbe=activeEvents(now).filter(function(e){return e.hongbao;})[0]; if(hbe&&S.hbDay!==twDate(now)){ S.hbDay=twDate(now); addCoins(hbe.hongbao); hbs='，春節紅包 +'+hbe.hongbao; }
        }
        if(S.charm>0) S.charm--;
        p.crop=null; p.prog=0; p.n=0; p.stolen=0;
        if(has(st,'spark')) neighbors(i).forEach(function(k){ var o=S.plots[k]; if(o.crop&&!isRipe(o)){ o.prog+=SMAP[o.crop].time*0.15; var rr=plotRect(k); burst(rr.x+22,rr.y+20,'#f2e35c'); } });
        if(hn){ burst(r.x+22,r.y+12,RAR[best].c); sfx('harvest',best);
          toast('收成「'+st.name+'」×'+hn+'：'+cnt.map(function(c,q){ return c?RAR[q].n+' '+c:''; }).filter(Boolean).reverse().join('、')+(kept?'，留下一顆種子':'')+hbs); }
        else { sfx('err'); toast('「'+st.name+'」被偷光了，什麼都沒剩'); logAdd('「'+st.name+'」被偷光，沒有收成'); }
      } else if(now>=p.water){
        p.water=now+waterSpan(st)*(weather(now).id==='heat'?0.6:1); burst(r.x+22,r.y+24,'#7fd8f0'); sfx('water');
      } else {
        toast('「'+st.name+'」還要 '+fmt((st.time-p.prog)/speed()));
      }
    }
    checkAch(); hud(); refreshPanel(); Store.save(S); return;
  }
});

/* ---------- 面板 ---------- */
var tab=null;
var TABGRP={log:'upg',acct:'upg',friends:'upg',settings:'upg',mail:'upg',rank:'upg',admin:'upg',gift:'upg',coopPick:'upg'};
function openTab(t){
  var prev=tab; tab=(tab===t)?null:t; petZoom=false; closePicker();
  $('panel').classList.toggle('open',!!tab);
  var g=TABGRP[tab]||tab;
  Array.prototype.forEach.call(document.querySelectorAll('#tabs button[data-tab]'),function(b){ b.classList.toggle('on',b.dataset.tab===g); });
  if(tab&&tab!==prev){ $('plist').scrollTop=0; sfx('open'); if(tab==='friends'||tab==='gift'){ loadFriends(); loadWorld(); } if(tab==='mail') loadMail(); if(tab==='rank'||tab==='contest') loadRank(); if(tab==='admin') loadAdmin(); if(tab==='visit') loadMsgs(); }
  refreshPanel();
}
/* ---------- 帳號、登入畫面、雲端存檔、其他玩家、好友 ---------- */
var sb=null, user=null, cloudMsg='', authMsg='', lastCloud=0, cloudBusy=false, authBusy=false;
try{ if(window.supabase&&CLOUD&&CLOUD.url) sb=window.supabase.createClient(CLOUD.url,CLOUD.key); }catch(e){ sb=null; }
function esc(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
function authErr(m){
  m=String(m||'');
  if(/Invalid login/i.test(m)) return '信箱或密碼不對';
  if(/not confirmed/i.test(m)) return '信箱還沒確認，請先點確認信裡的連結';
  if(/already registered|already been registered/i.test(m)) return '這個信箱已經註冊過，直接登入就好';
  if(/at least 6|should be at least/i.test(m)) return '密碼至少要 6 個字元';
  if(/rate limit|too many|security purposes/i.test(m)) return '操作太頻繁，請等一下再試';
  if(/valid email|invalid format|invalid.*email|email.*invalid/i.test(m)) return '這個信箱無法使用，請確認有沒有打錯';
  if(/sending.*email|confirmation email/i.test(m)) return '確認信寄不出去，請過幾分鐘再試';
  if(/fetch|network|load failed/i.test(m)) return location.hostname==='06-mtt.github.io'?'連不到伺服器，請檢查網路後再試一次':'這個版本連不到伺服器，請用 06-mtt.github.io/lazy-leaf-farm 開啟遊戲';
  return '發生錯誤：'+m;
}
function validSave(d){ return !!(d&&d.v===1&&d.plots&&d.plots.length===9); }
function newPlayer(home){ var n=fresh(); n.home=home; return n; }
function ensureHome(){ if(!S.home||!LOTMAP[S.home]) S.home=HOMEPOOL[Math.floor(Math.random()*HOMEPOOL.length)].n; }

/* 登入畫面：login 登入／註冊、setup 取名與性別、loading 讀取中 */
var gate={step:'none',gender:'',preName:'',pending:null};
function gateOn(){ return gate.step!=='none'; }
function gmsg(t,bad){ var el=$('gmsg'); if(el){ el.textContent=t||''; el.className='gmsg'+(bad?' down':''); } }
function gateShow(step,msg,bad){
  gate.step=step; $('gate').style.display='flex';
  var b='';
  if(step==='login'){
    if(sb) b='<input class="inp" id="g_email" type="email" autocomplete="email" placeholder="電子信箱">'+
      '<input class="inp" id="g_pass" type="password" autocomplete="current-password" placeholder="密碼（至少 6 個字元）">'+
      '<div class="grow"><button type="button" class="btn" data-g="signin">登入</button><button type="button" class="btn alt" data-g="signup">註冊</button></div>';
    else b='<button type="button" class="btn wide" data-g="reload">重新載入</button>';
    b+='<p id="gmsg" class="gmsg"></p>';
    if(!sb&&!msg){ msg='遊戲沒有載入完整，請重新載入頁面。'; bad=1; }
  } else if(step==='setup'){
    b='<p class="gmsg" style="color:var(--cream)">幫你的角色取名字、選性別</p>'+
      '<input class="inp" id="g_name" type="text" maxlength="12" placeholder="角色名稱（2 到 12 個字）">'+
      '<div class="gpick"><button type="button" class="gchoice" data-g="m"><canvas id="gp_m" width="10" height="16"></canvas><span>男生</span></button>'+
      '<button type="button" class="gchoice" data-g="f"><canvas id="gp_f" width="10" height="16"></canvas><span>女生</span></button></div>'+
      '<p id="gmsg" class="gmsg">名字之後朋友會看到，也是加好友用的。</p><button type="button" class="btn wide" data-g="start">開始遊戲</button>';
  } else b='<p id="gmsg" class="gmsg"></p>';
  $('gbody').innerHTML=b;
  if(step==='setup'){ drawPerson($('gp_m'),'m'); drawPerson($('gp_f'),'f'); pickGender(gate.gender); if(gate.preName) $('g_name').value=gate.preName; }
  if(msg) gmsg(msg,bad);
}
function gateHide(){ gate.step='none'; $('gate').style.display='none'; }
function pickGender(g){ gate.gender=g||''; Array.prototype.forEach.call(document.querySelectorAll('.gchoice'),function(el){ el.classList.toggle('on',el.dataset.g===gate.gender); }); }
$('gate').addEventListener('click',function(e){
  var b=e.target.closest('[data-g]'); if(!b||b.disabled) return; var g=b.dataset.g; sfx('tap');
  if(SET.music&&!musicOn) setMusic(true);
  if(g==='reload') location.reload();
  else if(g==='m'||g==='f') pickGender(g);
  else if(g==='signin'||g==='signup') doAuth(g);
  else if(g==='start') completeSetup();
});
$('gate').addEventListener('keydown',function(e){
  if(e.key!=='Enter') return;
  if(e.target.id==='g_pass') doAuth('signin'); else if(e.target.id==='g_name') completeSetup();
});
function doAuth(kind){
  if(authBusy||!sb) return;
  var em=(($('g_email')||{}).value||'').trim(), pw=($('g_pass')||{}).value||'';
  if(!em||!pw){ gmsg('請輸入信箱和密碼',1); return; }
  if(pw.length<6){ gmsg('密碼至少要 6 個字元',1); return; }
  authBusy=true; gmsg(kind==='signin'?'登入中…':'註冊中…');
  var pr=kind==='signin'?sb.auth.signInWithPassword({email:em,password:pw}):sb.auth.signUp({email:em,password:pw,options:{emailRedirectTo:location.origin+location.pathname}});
  pr.then(function(r){
    authBusy=false;
    if(r.error){ gmsg(authErr(r.error.message),1); return; }
    var se=r.data&&r.data.session;
    if(se){ user=se.user||r.data.user; onSignedIn(); return; }
    if(kind==='signup'&&r.data&&r.data.user&&r.data.user.identities&&r.data.user.identities.length===0){ gmsg('這個信箱已經註冊過，直接登入就好',1); return; }
    gmsg('註冊成功！請到信箱點確認信裡的連結，確認後回來按「登入」。');
  },function(e){ authBusy=false; gmsg(authErr(e&&e.message),1); });
}
function onSignedIn(){
  gateShow('loading','讀取你的農場…');
  var uid=user.id;
  Promise.all([
    sb.from('profiles').select('name,gender').eq('id',uid).maybeSingle(),
    sb.from('lots').select('lot_id').eq('owner',uid).eq('kind','home').maybeSingle(),
    sb.from('saves').select('data').eq('user_id',uid).maybeSingle()
  ]).then(function(rs){
    var bad=rs.filter(function(r){ return r.error; })[0];
    if(bad){ gateShow('login','讀取資料失敗：'+authErr(bad.error.message),1); return; }
    var prof=rs[0].data, home=rs[1].data, cl=rs[2].data&&rs[2].data.data;
    gate.pending=validSave(cl)?cl:null;
    if(!prof||!prof.name||!prof.gender||!home||!LOTMAP[home.lot_id]){ gate.preName=prof&&prof.name||''; gate.gender=prof&&prof.gender||''; gateShow('setup'); return; }
    SAVE_KEY='lazyleaf-acct-'+uid;
    var loc=Store.load(); if(!validSave(loc)||loc.owner!==uid) loc=null;
    var cl0=gate.pending, pick=(cl0&&loc)?(((loc.rev||0)===(cl0.rev||0)&&(loc.seenAt||0)>(cl0.seenAt||0))?loc:cl0):(cl0||loc||newPlayer(home.lot_id));
    startAccount(pick,prof.name,prof.gender,home.lot_id);
  },function(e){ gateShow('login',authErr(e&&e.message),1); });
}
function startAccount(data,name,gender,home){
  var away=data.seenAt?Date.now()-data.seenAt:0;
  S=data; normalize(); S.owner=user.id; S.name=name; S.gender=gender; S.home=home;
  Store.save(S); cloudSave(true); enterGame(away);
}
function claimHome(){
  var tries=0;
  function go(){ tries++; return sb.rpc('claim_home').then(function(r){ if(r.error) throw r.error; if(r.data==null&&tries<4) return go(); return r.data; }); }
  return go();
}
function completeSetup(){
  if(authBusy) return;
  var nm=(($('g_name')||{}).value||'').trim();
  if(nm.length<2||nm.length>12){ gmsg('名稱要 2 到 12 個字',1); return; }
  if(!gate.gender){ gmsg('選一個性別',1); return; }
  authBusy=true; gmsg('建立你的角色…');
  var prow={name:nm,gender:gate.gender,seen_at:new Date().toISOString()};
  sb.from('profiles').update(prow).eq('id',user.id).select('id').then(function(r){
    if(!r.error&&r.data&&r.data.length) return r;
    return sb.from('profiles').insert({id:user.id,name:nm,gender:gate.gender,seen_at:prow.seen_at});
  }).then(function(r){
    if(r.error){ authBusy=false; gmsg(/duplicate|unique/i.test(r.error.message)?'這個名字已經有人用了，換一個':authErr(r.error.message),1); return; }
    gmsg('幫你在小鎮上找一塊地…');
    return claimHome().then(function(lot){
      authBusy=false;
      if(lot==null||!LOTMAP[lot]){ gmsg('暫時找不到空地，請稍後再試',1); return; }
      SAVE_KEY='lazyleaf-acct-'+user.id;
      var isNew=!gate.pending;
      startAccount(gate.pending||newPlayer(lot),nm,gate.gender,lot);
      if(isNew) setTimeout(function(){ modal('star','歡迎來到懶草農場',['你分到了小鎮上的「'+LOTMAP[lot].name+'」，3×3 格。','起手有 100 金幣和 10 顆懶懶綠種子。','點空地就能種。按「去小鎮」可以看到你的地在哪裡。'],[['開始種田']]); },300);
    });
  }).catch(function(e){ authBusy=false; gmsg(authErr(e&&e.message),1); });
}
var bootAway=0;
function enterGuest(){
  var away=bootAway; bootAway=0;
  if(S.owner){ SAVE_KEY=GUEST_KEY; var g=Store.load(); S=validSave(g)?g:fresh(); normalize(); away=0; }
  enterGame(away);
}
function enterGame(away){
  gateHide(); ensureHome(); syncLook(); hud(); refreshPanel();
  if(scene==='town') setScene('town');
  if(user){ loadWorld(true); loadFriends(); heartbeat(); loadMail(); checkAdmin(); loadRank(); }
  if(away) welcome(away);
  if(S.stats.harvest===0&&!planted().length) setTimeout(function(){ toast('點一塊空地種下第一株'); },600);
}
function logout(){
  cloudSave(true);
  sb.auth.signOut().then(function(){},function(){});
  user=null; WORLD={lots:{},prof:{},home:{},at:0}; FR={mine:[],fans:[],msg:''}; cloudMsg=''; authMsg=''; IS_ADMIN=false; INBOX={events:0,mail:0,coop:0}; VISIT=null;
  SAVE_KEY=GUEST_KEY; var g=Store.load(); S=validSave(g)?g:fresh(); normalize(); ensureHome(); syncLook();
  if(tab) closePanel(); if(scene!=='farm') setScene('farm'); hud();
  gateShow('login','已登出');
}
function boot(){
  $('glogo').src=ICON.lazy;
  if(!sb){ gateShow('login'); return; }
  gateShow('loading','連線中…');
  var done=false, to=setTimeout(function(){ if(!done){ done=true; gateShow('login','連線很慢，請檢查網路後再登入',1); } },8000);
  sb.auth.getSession().then(function(r){
    if(done) return; done=true; clearTimeout(to);
    var se=r.data&&r.data.session; if(se){ user=se.user; onSignedIn(); } else gateShow('login');
  },function(){ if(done) return; done=true; clearTimeout(to); gateShow('login'); });
}

/* 雲端存檔：一律經過伺服器檢查。rev 是版本號，伺服器動過存檔（買地、領禮物、被偷）版本就會加一 */
var saving=null, INBOX={events:0,mail:0,coop:0}, IS_ADMIN=false;
function applyServer(d){
  if(!validSave(d)||!user) return;
  S=d; normalize(); S.owner=user.id; syncLook(); Store.save(S); hud(); refreshPanel();
}
function saveNow(){
  if(!sb||!user||S.owner!==user.id) return Promise.resolve(null);
  if(saving) return saving;
  lastCloud=Date.now();
  saving=sb.rpc('save_game',{p:S}).then(function(r){
    saving=null;
    if(r.error){ cloudMsg='雲端存檔失敗，稍後會再試'; return null; }
    var o=r.data||{}, t=new Date();
    if(o.ok){ S.rev=o.rev; Store.save(S); cloudMsg='上次同步 '+t.getHours()+':'+('0'+t.getMinutes()).slice(-2); INBOX=o.inbox||INBOX; if(INBOX.events>0) takeEvents(); }
    else if(o.reason==='stale'){ applyServer(o.data); toast('已載入最新的雲端進度'); }
    else if(o.reason==='reject'){ applyServer(o.data); toast('進度檢查沒通過，已還原到上次的雲端存檔'); }
    else if(o.reason==='banned'){ gateShow('login','這個帳號已被停用',1); }
    if(tab==='acct'||tab==='upg') refreshPanel();
    return o;
  },function(){ saving=null; cloudMsg='雲端存檔失敗，稍後會再試'; return null; });
  return saving;
}
function cloudSave(force){ if(!force&&Date.now()-lastCloud<60000) return; saveNow(); }
/* 伺服器操作：先存檔，再請伺服器處理，最後載入伺服器回傳的存檔 */
function serverOp(name,args){
  return saveNow().then(function(o){ if(!o||!o.ok) throw new Error('save'); return sb.rpc(name,args); }).then(function(r){
    if(r.error) throw r.error; if(r.data&&r.data.data) applyServer(r.data.data); return r.data;
  });
}
function opRun(name,args,ok){
  if(!sb||!user){ toast('要登入才能用'); return; }
  serverOp(name,args).then(function(res){ if(res&&res.ok===false){ sfx('err'); toast(res.msg||'沒有成功'); return; } if(ok) ok(res); refreshPanel(); hud(); },
    function(e){ sfx('err'); toast('連線有問題，請再試一次'); });
}
function takeEvents(){
  sb.rpc('take_events').then(function(r){
    if(r.error||!r.data) return; applyServer(r.data.data); INBOX.events=0;
    var ev=r.data.events||[]; if(!ev.length) return;
    var lines=ev.map(function(e){ var cn=e.crop&&SMAP[e.crop]?SMAP[e.crop].name:'作物', who=e.name||'有人';
      var m=e.kind==='water'?who+' 幫你的「'+cn+'」澆了水':(e.kind==='steal'?who+' 偷走「'+cn+'」×'+(e.n||1):'柴犬阿福趕走了來偷菜的 '+who);
      logAdd(m,e.at); return hm(e.at)+'　'+m; });
    Store.save(S);
    if(gateOn()) return; if(modalOpen) toast(lines[0]); else modal('dog','你的農場有動靜',lines.slice(0,6),[['知道了']]);
  },function(){});
}
function heartbeat(){ if(sb&&user&&S.name) sb.from('profiles').update({seen_at:new Date().toISOString()}).eq('id',user.id).then(function(){},function(){}); }

/* 參觀別人的農場 */
var VISIT=null, MSGS=[];
function visitFarm(owner){
  if(!sb||!user) return;
  if(owner===user.id){ setScene('farm'); return; }
  toast('前往農場…');
  sb.rpc('get_farm',{p_owner:owner}).then(function(r){
    if(r.error||!r.data){ toast('看不到他的農場'); return; }
    var d=r.data, now=Date.now(), fert=(d.upg&&d.upg.fert)||0, plots=JSON.parse(JSON.stringify(d.plots||[]));
    (d.events||[]).forEach(function(e){ var p=plots[e.plot]; if(!p||!p.crop||(p.t0||0)!==e.t0) return;
      if(e.kind==='water'){ var st=SMAP[p.crop]; if(st){ if(e.at>p.last){ p.prog+=Math.max(0,Math.min(e.at,p.water)-p.last)/1000*(1+0.25*fert); p.last=e.at; } p.water=Math.max(p.water,e.at+Math.max(45,st.time*0.5)*1000); } }
      else { if(e.kind==='steal') p.stolen=(p.stolen||0)+(e.n||1); if(e.mine) p.mine=true; } });
    VISIT={owner:owner,name:d.name||'',gender:d.gender,lvl:d.lvl,added:d.added,mutual:d.mutual,fert:fert,fs:{plots:plots,decor:d.decor||{},pets:d.pets||{},me:lookOf(d.look,d.gender)}};
    if(tab) closePanel(); scene='visit'; $('stage').style.background=''; updateLabels(); hud(); vTick(now);
    toast('成熟的作物可以偷，乾掉的田可以澆水，點小屋看留言板'); MSGS=[];
  },function(){ toast('連線有問題，請再試一次'); });
}
function vTick(now){
  if(scene!=='visit'||!VISIT) return;
  VISIT.fs.plots.forEach(function(p){ if(!p.crop) return; if(p.water>p.last){ p.prog+=Math.max(0,Math.min(now,p.water)-p.last)/1000*(1+0.25*VISIT.fert); } p.last=now; });
}
function visitClick(x,y){
  if(tab){ closePanel(); return; }
  if(y<60){ showTab('visit'); return; }
  var V=VISIT; if(!V) return;
  for(var i=0;i<9;i++){
    var r=plotRect(i); if(x<r.x||x>r.x+r.w||y<r.y||y>r.y+r.h) continue;
    var p=V.fs.plots[i], now=Date.now();
    if(!p.u||!p.crop){ toast('這塊田是空的'); return; }
    var st=SMAP[p.crop]; if(!st) return;
    if(p.prog>=st.time){
      if(!V.mutual){ toast('要互相加好友才能偷'); return; }
      if(p.mine){ toast('這株你已經來過了'); return; }
      if((p.n||5)-(p.stolen||0)<=0){ toast('已經被偷光了'); return; }
      farmAct(i,'steal');
    } else if(now<p.water){ toast('「'+st.name+'」還在長，土是濕的'); }
    else if(!V.added){ toast('加他好友之後才能幫忙澆水'); }
    else farmAct(i,'water');
    return;
  }
}
function farmAct(i,kind){
  var V=VISIT, owner=V.owner, r=plotRect(i);
  serverOp('farm_action',{p_owner:owner,p_plot:i,p_kind:kind}).then(function(res){
    if(!VISIT||VISIT.owner!==owner) return; var p=VISIT.fs.plots[i];
    if(!res||!res.ok){ if(res&&res.blocked){ p.mine=true; sfx('err'); logAdd('去「'+V.name+'」的農場偷菜，被柴犬趕走'); modal('dog','被發現了！',[res.msg],[['快跑']]); } else { sfx('err'); toast((res&&res.msg)||'沒有成功'); } return; }
    if(kind==='water'){ p.water=Date.now()+Math.max(45,SMAP[p.crop].time*0.5)*1000; burst(r.x+22,r.y+24,'#7fd8f0'); sfx('water'); S.stats.help=(S.stats.help||0)+1; toast(res.msg); }
    else { p.mine=true; p.stolen=(p.stolen||0)+(res.n||1); burst(r.x+22,r.y+12,'#f5c451'); sfx('harvest',1); toast('偷到「'+SMAP[res.strain].name+'」×'+(res.n||1)+'，快溜'); logAdd('到「'+V.name+'」的農場偷了「'+SMAP[res.strain].name+'」×'+(res.n||1)); Store.save(S); }
  },function(){ sfx('err'); toast('連線有問題，請再試一次'); });
}
function loadMsgs(){
  if(!VISIT) return; var o=VISIT.owner;
  sb.from('messages').select('id,author,text,created_at').eq('owner',o).order('created_at',{ascending:false}).limit(20).then(function(r){ if(!r.error&&VISIT&&VISIT.owner===o){ MSGS=r.data||[]; if(tab==='visit') refreshPanel(); } },function(){});
}
function postMsg(){
  var t=(($('msg_text')||{}).value||'').trim(); if(!t||!VISIT) return;
  sb.from('messages').insert({owner:VISIT.owner,author:user.id,text:t.slice(0,80)}).then(function(r){ if(r.error){ toast('留言失敗'); return; } sfx('coin'); toast('留言送出了'); loadMsgs(); },function(){ toast('留言失敗'); });
}

/* 郵局、送禮、合作配種 */
var MAIL={list:[],coop:[]}, GIFT={to:null}, COOPSEL=null;
function mailText(m){
  var st=m.item&&SMAP[m.item], it=m.item&&IMAP[m.item], parts=[];
  if(m.kind==='crop'&&st) parts.push(st.name+'（'+RAR[m.q].n+'）×'+m.n);
  else if(m.kind==='seed'&&st) parts.push(st.name+' 種子 ×'+m.n);
  else if(m.kind==='item'&&it) parts.push(it.name+' ×'+m.n);
  if(m.coins) parts.push(m.coins+' 金幣'); if(m.rep) parts.push(m.rep+' 聲望');
  return parts.join('、');
}
function loadMail(){
  if(!sb||!user) return;
  Promise.all([sb.from('mail').select('*').eq('to_user',user.id).eq('claimed',false).order('id'),sb.from('coop').select('*').eq('status','open').or('a.eq.'+user.id+',b.eq.'+user.id)]).then(function(rs){
    if(rs[0].error||rs[1].error) return; MAIL.list=rs[0].data||[]; MAIL.coop=rs[1].data||[];
    INBOX.mail=MAIL.list.length; INBOX.coop=MAIL.coop.filter(function(x){ return x.b===user.id; }).length;
    if(tab==='mail'||tab==='upg') refreshPanel();
  },function(){});
}
function claimMail(id){
  opRun('claim_mail',{p_id:id},function(res){
    var got=(res&&res.got)||[]; sfx('coin');
    var lines=got.map(mailText).filter(function(x){ return x; });
    if(lines.length) logAdd('郵局收下：'+lines.slice(0,3).join('、')); toast(lines.length?'收下：'+lines.slice(0,3).join('、')+(lines.length>3?'…':''):'收下了'); loadMail();
  });
}
function sendGift(kind,item,q,n){
  if(!GIFT.to) return;
  var note=(($('gift_note')||{}).value||'').trim(), who=(WORLD.prof[GIFT.to]||{}).name||'';
  opRun('send_gift',{p_to:GIFT.to,p_kind:kind,p_item:item,p_q:q,p_n:n,p_note:note},function(){ sfx('coin'); toast('寄給「'+who+'」了'); });
}
function coopAccept(sid,q){
  if(!COOPSEL) return;
  opRun('coop_accept',{p_id:COOPSEL,p_strain:sid,p_q:q},function(res){
    COOPSEL=null; loadMail();
    if(res.success) modal('star','合作配種成功',['配出了「'+SMAP[res.result].name+'」！','你拿到 '+res.n+' 顆種子，對方也會從郵局收到。'],[['太好了']]);
    else modal('star','這次沒有成功',['兩株作物都用掉了。品質越高越容易成功，下次再試。'],[['好吧']]);
    showTab('mail');
  });
}

/* 排行榜、管理 */
var RANK=null, RANKBY='dex', ADM={};
function loadRank(){ if(!sb||!user) return; sb.rpc('leaderboard').then(function(r){ if(!r.error){ RANK=r.data||[]; if(tab==='rank'||tab==='contest') refreshPanel(); } },function(){}); }
function checkAdmin(){ if(!sb||!user) return; sb.rpc('is_admin').then(function(r){ IS_ADMIN=!r.error&&r.data===true; if(tab==='upg') refreshPanel(); },function(){}); }
function loadAdmin(){
  if(!IS_ADMIN) return;
  Promise.all([sb.rpc('admin_players'),sb.rpc('admin_cheats'),sb.rpc('admin_backups')]).then(function(rs){
    ADM.players=rs[0].data||[]; ADM.cheats=rs[1].data||[]; ADM.backups=rs[2].data||[]; if(tab==='admin') refreshPanel();
  },function(){});
}
function adminSend(){
  var v=function(id){ return (($(id)||{}).value||'').trim(); }, it=v('ad_item').split(':');
  var args={p_to:v('ad_to')||null,p_coins:parseInt(v('ad_coins'),10)||0,p_rep:parseInt(v('ad_rep'),10)||0,p_kind:it[0]||'',p_item:it[1]||'',p_q:0,p_n:it[0]?(parseInt(v('ad_n'),10)||1):0,p_note:v('ad_note')||'管理員的禮物'};
  if(!args.p_coins&&!args.p_rep&&!args.p_kind){ ADM.msg='至少要給一樣東西'; refreshPanel(); return; }
  sb.rpc('admin_send',args).then(function(r){ ADM.msg=r.error?'寄送失敗：'+r.error.message:'寄出了 '+r.data+' 份，玩家會在郵局收到'; refreshPanel(); },function(){ ADM.msg='寄送失敗'; refreshPanel(); });
}
function downloadBackup(id){
  sb.rpc('admin_backup_get',{p_id:id}).then(function(r){
    if(r.error||!r.data){ toast('下載失敗'); return; }
    try{ var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(r.data)],{type:'application/json'})); a.download='lazyleaf-backup-'+id+'.json'; document.body.appendChild(a); a.click(); a.remove(); }catch(e){ toast('這個瀏覽器不能下載'); }
  },function(){ toast('下載失敗'); });
}

/* 推播通知 */
var PUSH_URL=CLOUD.url+'/functions/v1/push', PUSH_ON=false, PUSHMSG='';
function b64u(s){ var p='='.repeat((4-s.length%4)%4), b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/')), o=new Uint8Array(b.length); for(var i=0;i<b.length;i++) o[i]=b.charCodeAt(i); return o; }
function pushSupported(){ return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window; }
function checkPush(){
  if(!pushSupported()||!navigator.serviceWorker.getRegistration) return;
  navigator.serviceWorker.getRegistration().then(function(reg){ if(!reg) return; return reg.pushManager.getSubscription().then(function(sub){ PUSH_ON=!!sub&&Notification.permission==='granted'; }); }).catch(function(){});
}
function togglePush(){
  PUSHMSG='';
  if(!user){ PUSHMSG='要登入才能開通知'; refreshPanel(); return; }
  if(!pushSupported()){ PUSHMSG=/iPhone|iPad/.test(navigator.userAgent)?'iPhone 要先「加入主畫面」，從主畫面的圖示打開遊戲才能開通知':'這個瀏覽器不支援通知'; refreshPanel(); return; }
  if(PUSH_ON){
    navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); }).then(function(sub){
      if(!sub) return; sb.from('push_subs').delete().eq('endpoint',sub.endpoint).then(function(){},function(){}); return sub.unsubscribe();
    }).then(function(){ PUSH_ON=false; refreshPanel(); toast('通知關掉了'); }).catch(function(){ PUSH_ON=false; refreshPanel(); });
    return;
  }
  Notification.requestPermission().then(function(perm){
    if(perm!=='granted'){ PUSHMSG='沒有開啟通知權限，要到系統設定允許'; refreshPanel(); return; }
    return navigator.serviceWorker.ready.then(function(reg){
      return fetch(PUSH_URL+'?pub=1',{headers:{apikey:CLOUD.key}}).then(function(r){ return r.json(); }).then(function(k){
        return reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(k.pub)});
      });
    }).then(function(sub){
      return sb.from('push_subs').upsert({endpoint:sub.endpoint,user_id:user.id,sub:sub.toJSON()}).then(function(r){ if(r.error) throw r.error; PUSH_ON=true; refreshPanel(); toast('通知開好了'); });
    });
  }).catch(function(e){ PUSHMSG='開通知失敗：'+((e&&e.message)||e); refreshPanel(); });
}
try{ if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(function(){ checkPush(); },function(){}); }catch(e){}

/* 其他玩家：誰有哪塊地、名字和等級 */
var WORLD={lots:{},prof:{},home:{},at:0};
function loadWorld(force){
  if(!sb||!user) return;
  var now=Date.now(); if(!force&&now-WORLD.at<60000) return; WORLD.at=now;
  Promise.all([sb.from('lots').select('lot_id,owner,kind'),sb.from('profiles').select('id,name,gender,level,seen_at')]).then(function(rs){
    if(rs[0].error||rs[1].error) return;
    var pr={}, lots={}, home={};
    (rs[1].data||[]).forEach(function(p){ pr[p.id]=p; });
    (rs[0].data||[]).forEach(function(l){ lots[l.lot_id]={owner:l.owner,kind:l.kind}; if(l.kind==='home') home[l.owner]=l.lot_id; });
    WORLD.prof=pr; WORLD.lots=lots; WORLD.home=home;
    if(tab==='friends'||tab==='lot') refreshPanel();
  },function(){});
}
/* 好友：mine 是我加的人，fans 是加了我的人；兩邊都有就是互相好友 */
var FR={mine:[],fans:[],msg:''}, frDelArm=null;
function isFriend(id){ return FR.mine.indexOf(id)>=0; }
function loadFriends(){
  if(!sb||!user) return;
  sb.from('friends').select('user_id,friend_id').or('user_id.eq.'+user.id+',friend_id.eq.'+user.id).then(function(r){
    if(r.error) return; var mine=[], fans=[];
    (r.data||[]).forEach(function(x){ if(x.user_id===user.id) mine.push(x.friend_id); else fans.push(x.user_id); });
    FR.mine=mine; FR.fans=fans;
    if(tab==='friends'||tab==='upg') refreshPanel();
  },function(){});
}
function seenText(ts){
  if(!ts) return ''; var d=(Date.now()-new Date(ts).getTime())/1000;
  if(d<300) return '在線上'; if(d<3600) return Math.floor(d/60)+' 分鐘前上線'; if(d<86400) return Math.floor(d/3600)+' 小時前上線'; return Math.floor(d/86400)+' 天前上線';
}
function addFriendByName(){
  var nm=(($('fr_name')||{}).value||'').trim();
  if(!nm){ FR.msg='輸入朋友的角色名稱'; refreshPanel(); return; }
  if(nm===S.name){ FR.msg='這是你自己的名字'; refreshPanel(); return; }
  FR.msg='搜尋中…'; refreshPanel();
  sb.from('profiles').select('id,name').eq('name',nm).maybeSingle().then(function(r){
    if(r.error||!r.data){ FR.msg=r.error?authErr(r.error.message):'找不到「'+nm+'」，名字要完全一樣'; refreshPanel(); return; }
    addFriendId(r.data.id,r.data.name);
  },function(e){ FR.msg=authErr(e&&e.message); refreshPanel(); });
}
function addFriendId(id,name){
  if(!user||id===user.id) return;
  if(isFriend(id)){ FR.msg='已經是好友了'; refreshPanel(); return; }
  sb.from('friends').insert({user_id:user.id,friend_id:id}).then(function(r){
    if(r.error&&r.error.code!=='23505'){ FR.msg=authErr(r.error.message); refreshPanel(); return; }
    FR.msg=''; if(!isFriend(id)) FR.mine.push(id); sfx('coin');
    toast('加了「'+(name||(WORLD.prof[id]||{}).name||'')+'」好友'); loadFriends(); loadWorld(true); refreshPanel();
  },function(e){ FR.msg=authErr(e&&e.message); refreshPanel(); });
}
function removeFriend(id){ sb.from('friends').delete().eq('user_id',user.id).eq('friend_id',id).then(function(){ FR.mine=FR.mine.filter(function(x){ return x!==id; }); refreshPanel(); },function(){}); }
function visitFriend(id){
  var l=LOTMAP[WORLD.home[id]];
  if(!l){ toast('還找不到他的農場，等一下再試'); loadWorld(true); return; }
  if(tab) closePanel(); visitFarm(id);
}
function showTab(t){ tab=null; openTab(t); }
function closePanel(){ fishReset(); if(tab) openTab(tab); }
function refreshPanel(){
  if(!tab) return;
  var now=Date.now(), h='', title='', sub='';
  if(tab==='shop'){
    title='商店'; sub='你有 '+nf(S.coins)+' 金幣';
    h+='<div class="seg">'+[['seed','種子'],['tool','道具'],['decor','裝飾']].map(function(b){ return '<button type="button" class="'+(shopTab===b[0]?'on':'')+'" data-act="shoptab" data-id="'+b[0]+'">'+b[1]+'</button>'; }).join('')+'</div>';
    if(shopTab==='seed') STRAINS.forEach(function(s){
      if(s.gen) return;
      if(s.ev&&!evOn(s.ev)) return;
      var lock=!s.ev&&S.lvl<s.lvl, have=S.seeds[s.id]||0;
      h+='<div class="row'+(lock?' locked':'')+'"><img class="picon" alt="" style="--rar:var(--line)" src="'+ICON[s.id]+'"><div class="info"><strong>'+s.name+(inSeason(s,now)?'<span class="chip up">當季</span>':'')+(s.ev?'<span class="chip gold">活動</span>':'')+(have?'<span class="chip">持有 '+have+'</span>':'')+'</strong>'+
        '<small>'+(lock?'LV '+s.lvl+' 解鎖':'成長 '+fmt(s.time/speed())+'　行情 '+s.base+'　一次收 5–10 株')+'</small><small>'+s.tname+'：'+s.tdesc+'</small>'+
        (lock?'':'<div class="buys">'+[1,10,50].map(function(n){ return '<button class="btn ghost" data-act="buyseed" data-id="'+s.id+':'+n+'"'+(S.coins>=s.cost*n?'':' disabled')+'>×'+n+'<em>'+nf(s.cost*n)+'</em></button>'; }).join('')+'</div>')+'</div></div>';
    });
    else if(shopTab==='tool') Object.keys(UPG).forEach(function(k){
      var u=UPG[k], l=S.upg[k], max=l>=u.max;
      h+='<div class="row"><div class="info"><strong>'+u.name+(u.max>1?'<span class="chip">'+l+' / '+u.max+'</span>':(max?'<span class="chip up">已裝</span>':''))+'</strong><small>'+u.desc+'</small></div>'+
        '<button class="btn" data-act="upg" data-id="'+k+'"'+(max||S.coins<u.cost[l]?' disabled':'')+'>'+(max?'已買滿':coinTxt(u.cost[l]))+'</button></div>';
    });
    else { h+='<div class="note">農場魅力 '+charmPts()+'：市場售價 +'+charmPts()+'%</div>';
      DECOR.forEach(function(x){
        var own=S.decor[x.id]; if(x.rep&&!own) return; if(x.ev&&!evOn(x.ev)&&!own) return;
        h+='<div class="row"><div class="info"><strong>'+x.name+(x.ev?'<span class="chip gold">活動</span>':'')+'</strong><small>魅力 +'+x.charm+'</small></div><button class="btn" data-act="buydecor" data-id="'+x.id+'"'+(own||S.coins<x.cost?' disabled':'')+'>'+(own?'已擺上':coinTxt(x.cost))+'</button></div>';
      }); }
  } else if(tab==='log'){
    title='農場紀錄'; sub='最近 '+S.log.length+' 筆'; h+='<button type="button" class="btn ghost back" data-act="back">← 更多</button>';
    if(!S.log.length) h+='<div class="empty">還沒有紀錄</div>';
    var lastDay='';
    S.log.forEach(function(e){ var d=new Date(e.t), day=(d.getMonth()+1)+' 月 '+d.getDate()+' 日';
      if(day!==lastDay){ h+='<div class="sec">'+day+'</div>'; lastDay=day; }
      h+='<div class="logrow"><time>'+hm(e.t)+'</time><span>'+esc(e.m)+'</span></div>'; });
  } else if(tab==='bag'){
    title='背包'; sub='作物圖鑑 '+Object.keys(S.dex).length+' / '+STRAINS.length*6;
    var BT=[['seed','種子'],['crop','作物'],['goods','加工品'],['item','雜物'],['fish','漁獲']];
    h+='<div class="seg">'+BT.map(function(b){ return '<button type="button" class="'+(bagTab===b[0]?'on':'')+'" data-act="bagtab" data-id="'+b[0]+'">'+b[1]+'</button>'; }).join('')+'</div>';
    h+='<div class="bagbar"><span class="legend">'+(bagTab==='crop'?RAR.map(function(r){return '<span><i style="background:'+r.c+'"></i>'+r.n+'</span>';}).join(''):'')+'</span><button type="button" class="btn ghost sm" data-act="bagall">'+(bagAll?'顯示：全部':'顯示：有的')+'</button></div>';
    var all=bagList(bagTab), sel=all.filter(function(x){return x.key===bagSel;})[0];
    if(sel) h+=bagDetail(sel);
    h+=all.length?'<div class="grid">'+all.map(function(x){
      return '<button type="button" class="card'+(x.n?'':' none')+(x.using?' using':'')+(x.key===bagSel?' sel':'')+'" style="--rar:'+RAR[x.rar].c+'" data-act="bag" data-id="'+x.key+'"><b>'+(x.n||'')+'</b>'+(x.using?'<u>種植中</u>':'')+'<img alt="" src="'+ICON[x.icon]+'"><span>'+x.name+'</span></button>';
    }).join('')+'</div>':'<div class="empty">沒有東西'+(bagTab==='seed'?'，到小鎮的商店買種子':'')+'</div>';
  } else if(tab==='lab'){
    title='工坊'; sub='已發現新品種 '+Object.keys(S.known).length+' / '+STRAINS.filter(function(x){return x.gen;}).length;
    fixLab(); var A=labStack(labA), B=labStack(labB);
    var slot=function(x,w){ return '<button type="button" class="slot'+(x?' full':'')+'" style="--rar:'+(x?RAR[x.q].c:'')+'" data-act="labclr" data-id="'+w+'">'+(x?x.st.name+'<br><span style="color:'+RAR[x.q].c+'">'+RAR[x.q].n+'</span>':'從下面選一株')+'</button>'; };
    h+='<div class="slots">'+slot(A,'A')+'<span>×</span>'+slot(B,'B')+'</div>';
    if(A&&B){
      var rc=findRecipe(A.id,B.id), ch=breedChance(A,B,rc);
      h+='<div class="row"><div class="info"><strong>'+(rc?((S.known[rc.out]||S.hint[rc.out])?'配種：可能得到「'+SMAP[rc.out].name+'」':'配種：這個組合好像有搞頭'):'配種：沒有配方，只能賭意外突變')+'</strong><small>成功率 '+Math.round(ch*100)+'%，各消耗 1 株，品質越高越容易成功</small></div><button class="btn" data-act="breed">配種</button></div>';
    }
    var busy=!!S.job;
    h+='<div class="row"><div class="info"><strong>榨果汁</strong><small>兩種不同品種各 1 株，1 分鐘，售價是兩株合計的 1.35 倍</small></div><button class="btn alt" data-act="juice"'+(A&&B&&A.id!==B.id&&!busy?'':' disabled')+'>開始</button></div>';
    h+='<div class="row"><div class="info"><strong>熬果醬</strong><small>左邊那格的作物 3 株，2 分鐘，售價是三株合計的 1.15 倍</small></div><button class="btn alt" data-act="jam"'+(A&&A.n>=3&&!busy?'':' disabled')+'>開始</button></div>';
    if(S.job){ var left=(S.job.until-now)/1000;
      h+='<div class="row"><img class="picon" alt="" style="--rar:'+RAR[S.job.q].c+'" src="'+ICON[S.job.t]+'"><div class="info"><strong>'+GOODS[S.job.t].name+(left>0?' 製作中':' 做好了')+'</strong><small>'+(left>0?'還要 '+fmt(left):'價值 '+S.job.v+' 金幣')+'</small></div><button class="btn" data-act="collect"'+(left>0?' disabled':'')+'>領取</button></div>'; }
    var stacks=[]; STRAINS.forEach(function(s){ for(var q=5;q>=0;q--) if(S.inv[s.id][q]) stacks.push({key:s.id+':'+q,st:s,q:q,n:S.inv[s.id][q]}); });
    h+='<div class="sec">手上的作物</div>'+(stacks.length?'<div class="grid">'+stacks.map(function(x){
      return '<button type="button" class="card'+(x.key===labA||x.key===labB?' sel':'')+'" style="--rar:'+RAR[x.q].c+'" data-act="labpick" data-id="'+x.key+'"><b>'+x.n+'</b><img alt="" src="'+ICON[x.st.id]+'"><span>'+x.st.name+'</span></button>';
    }).join('')+'</div>':'<div class="row"><div class="info"><small>先去收成一些作物再來。</small></div></div>');
    if(user){
      var mut=FR.mine.filter(function(id){ return FR.fans.indexOf(id)>=0; });
      h+='<div class="sec">和朋友合作配種</div><div class="row"><div class="info"><small>'+(A?'用左邊那格的「'+A.st.name+'」（'+RAR[A.q].n+'）邀請朋友，他也出一株，成功的話你們都拿到種子。':'先在上面選一株作物放進左邊那格。')+'</small></div></div>';
      if(A) mut.forEach(function(id){ var p=WORLD.prof[id]; h+='<div class="row"><img class="ava" alt="" src="'+avatar(p&&p.gender)+'"><div class="info"><strong>'+esc(p?p.name:'…')+'</strong></div><button class="btn" data-act="coopinv" data-id="'+id+'">邀請</button></div>'; });
      if(A&&!mut.length) h+='<div class="row"><div class="info"><small>要互相加好友才能合作。</small></div></div>';
    }
    var kn=RECIPES.filter(function(r){return S.known[r.out]||S.hint[r.out];});
    h+='<div class="sec">已發現的配方</div>'+(kn.length?kn.map(function(r){ return '<div class="row"><div class="sw" style="background:'+SMAP[r.out].color+'"></div><div class="info"><strong>'+SMAP[r.a].name+' × '+SMAP[r.b].name+' → '+SMAP[r.out].name+'</strong><small>'+(S.known[r.out]?'':'居民給的線索，還沒配成功過。')+'基礎成功率 '+Math.round(r.ch*100)+'%</small></div></div>'; }).join(''):'<div class="row"><div class="info"><small>還沒有</small></div></div>');
  } else if(tab==='lot'&&curLot){
    var L=curLot, own=S.land[L.n], area=(L.sw||3)*(L.sh||3), cells='', ci, zone=L.c>0.75?'市中心':(L.c>0.5?'市區':(L.c>0.25?'近郊':'郊外'));
    title=L.name;
    if(L.small){
      var bdg=own&&own.b?BUILDINGS.filter(function(b){return b.id===own.b;})[0]:null, cc=bdg?bdg.c:(L.type==='house'?L.roof:(L.type==='pond'?'#5aa0c8':(L.type==='woods'?'#2f6b45':'#7d9a6a')));
      for(ci=0;ci<area;ci++) cells+='<i style="width:14px;height:14px;background:'+cc+';display:block"></i>';
      h+='<div class="row"><div style="display:grid;grid-template-columns:repeat('+L.sw+',14px);gap:2px;padding:8px;background:#4d7a5a;border:2px solid '+(own?'#f5c451':'#c9a27a')+'">'+cells+'</div><div class="info"><strong>'+L.sw+'×'+L.sh+' 格，共 '+area+' 格</strong><small>地段：'+zone+'</small></div></div>';
    }
    var lo=WORLD.lots[L.n], other=(lo&&!(user&&lo.owner===user.id))?lo:null, op=other?WORLD.prof[other.owner]:null;
    if(other){
      title=(op?op.name:'某位玩家')+(other.kind==='home'?' 的農場':' 的土地'); sub=other.kind==='home'?'玩家的農場':'玩家的土地';
      h+='<div class="row"><img class="ava" alt="" src="'+avatar(op&&op.gender)+'"><div class="info"><strong>'+esc(op?op.name:'某位玩家')+(op?'　<span style="font-weight:400;font-size:12px;color:var(--muted)">LV '+op.level+'</span>':'')+'</strong><small>'+(op?seenText(op.seen_at):'')+'</small></div>'+
        (isFriend(other.owner)?'<span class="up">好友</span>':'<button class="btn" data-act="fradd2" data-id="'+other.owner+'">加好友</button>')+'</div>';
      h+=other.kind==='home'?'<div class="row"><div class="info"><strong>進去參觀</strong><small>好友可以幫忙澆水，互相是好友可以偷菜</small></div><button class="btn" data-act="visit" data-id="'+other.owner+'">參觀農場</button></div>':'<div class="row"><div class="info"><small>這塊地已經有主人了。</small></div></div>';
    } else if(L.type==='home'){
      sub='居民';
      var fv=S.favor[L.npc]||0, stg=S.story[L.npc]||0, ST=STORIES[L.npc]||[];

      for(var si=0;si<stg;si++) h+='<div class="row"><div class="info"><strong>故事 '+(si+1)+'</strong><small>'+ST[si].t+'</small></div></div>';
      if(stg<ST.length){ var need=(stg+1)*3;
        h+='<div class="row"><div class="info"><strong>'+(fv>=need?'他好像有話想跟你說':'下一段故事')+'</strong><small>'+(fv>=need?'進去坐坐，聽他說。':'再幫他交貨 '+(need-fv)+' 次就會解鎖。')+'</small></div><button class="btn" data-act="story"'+(fv>=need?'':' disabled')+'>聽他說</button></div>'; }
      h+='<div class="row"><div class="info"><strong>好感：已幫忙交貨 '+fv+' 次</strong><small>每交貨 3 次送一份禮物，再 '+(3-fv%3)+' 次</small></div></div>';
    } else if(L.type==='sale'){
      sub=own?'你的土地':'待售土地';
      if(!own){
        h+='<div class="row"><div class="info"><strong>買下這塊地</strong></div><button class="btn" data-act="buylot"'+(S.coins>=L.price?'':' disabled')+'>'+coinTxt(L.price)+'</button></div>';
      } else if(!own.b){
        BUILDINGS.forEach(function(b){ var bc=b.per*area;
          h+='<div class="row"><div class="sw" style="background:'+b.c+'"></div><div class="info"><strong>蓋'+b.name+'</strong><small>'+b.desc+'</small></div><button class="btn" data-act="build" data-id="'+b.id+'"'+(S.coins>=bc?'':' disabled')+'>'+coinTxt(bc)+'</button></div>'; });
        h+='<div class="row"><div class="info"><small>蓋了之後不能換，選好再蓋。</small></div></div>';
      } else if(own.b==='garden'){
        h+='<div class="row"><div class="info"><strong>花園</strong><small>這座花園讓農場魅力 +'+Math.floor(area/5)+'。目前總魅力 '+charmPts()+'，市場售價 +'+charmPts()+'%。</small></div></div>';
      } else {
        var yl=landYield(L,own,now), full=(now-own.t)>=28800000;
        h+='<div class="row"><div class="info"><strong>'+bdg.name+(full?'（已經滿了）':'')+'</strong><small>'+(own.b==='inn'?'累積租金 '+yl+' 金幣':'長出 '+yl+' 株作物')+'，最多累積 8 小時</small></div><button class="btn" data-act="collect2"'+(yl>0?'':' disabled')+'>收取</button></div>';
      }
    } else if(L.type==='house'){
      sub='民宅';
      h+='<div class="row"><div class="info"><strong>居民的家，不能買賣</strong></div></div>';
    } else if(L.type==='pond'){
      sub='可以釣魚';
      h+='<div class="row"><div class="info"><strong>'+(fish.st==='wait'?'浮標在水面上晃…':(fish.st==='bite'?'上鉤了！快拉！':'水很清，看得到魚影'))+'</strong><small>'+(fish.msg||'浮標一沉就拉，太早或太慢魚會跑')+'</small></div>'+
        (fish.st==='idle'?'<button class="btn" data-act="cast">拋竿</button>':'<button class="btn'+(fish.st==='bite'?' alt':' ghost')+'" data-act="pull">拉竿</button>')+'</div>';
      h+='<div class="row"><div class="info"><small>小溪魚 50%・鯉魚 28%・金魚 15%・錦鯉 5.5%・龍魚 1.5%</small></div></div>';
    } else {
      sub='綠地';
      h+='<div class="row"><div class="info"><strong>公共綠地，不能買賣</strong></div></div>';
    }
  } else if(tab==='wear'){
    title='服飾店'; sub='換個造型';
    [['帽子',HATS,'hat'],['上衣',SHIRTS,'shirt']].forEach(function(g){
      h+='<div class="sec">'+g[0]+'</div>';
      g[1].forEach(function(x){
        var own=S.wardrobe[x.id], on=S.look[g[2]]===x.id; if(x.rep&&!own) return;
        h+='<div class="row"><div class="sw" style="background:'+x.c+'"></div><div class="info"><strong>'+x.name+'</strong></div><button class="btn'+(own?' alt':'')+'" data-act="wear" data-id="'+g[2]+':'+x.id+'"'+(on||(!own&&S.coins<x.cost)?' disabled':'')+'>'+(on?'穿著中':(own?'換上':coinTxt(x.cost)))+'</button></div>';
      });
    });
  } else if(tab==='dex'){
    var dn=Object.keys(S.dex).length, dt=STRAINS.length*6;
    title='圖鑑館'; sub='完成度 '+dn+' / '+dt+'（'+Math.round(dn/dt*100)+'%）';
    STRAINS.forEach(function(st){
      var seen=!st.gen||S.known[st.id], info=S.dexInfo[st.id], sq='';
      for(var q=0;q<6;q++) sq+='<i style="display:inline-block;width:11px;height:11px;margin-right:4px;border:1px solid '+RAR[q].c+';background:'+(S.dex[st.id+q]?RAR[q].c:'transparent')+'"></i>';
      h+='<div class="row'+(seen?'':' locked')+'"><img class="picon" alt="" style="--rar:var(--line);width:24px;height:24px;'+(seen?'':'filter:brightness(0)')+'" src="'+ICON[st.id]+'"><div class="info"><strong>'+(seen?st.name:'？？？')+'</strong><small>'+sq+'</small><small>'+
        (seen?(info?'共收成 '+info.n+' 株，第一次在 '+new Date(info.first).toLocaleDateString('zh-TW'):'還沒收成過')+(st.gen?'':'')+'，'+SEASONS[SEASON_OF[st.id]]+'季當季':'要靠配種才能發現')+'</small></div></div>';
    });
  } else if(tab==='contest'){
    var cw=week(now), cs=contestStrain(cw), cc=S.contest;
    title='品評會場'; sub='聲望 '+S.rep;
    if(cc&&cc.week<cw&&!cc.claimed){
      h+='<div class="row"><div class="info"><strong>上週的結果出來了</strong><small>你交出的是「'+contestStrain(cc.week).name+'」'+RAR[cc.q].n+'品質</small></div><button class="btn" data-act="cclaim">看名次</button></div>';
    }
    h+='<div class="sec">本週品評</div>';
    h+='<div class="row"><div class="sw" style="background:'+cs.color+'"></div><div class="info"><strong>指定品種：'+cs.name+'</strong><small>交一株比品質，'+fmt(((cw+1)*604800000-now)/1000)+'後結束，結束後回來領獎</small><small>'+
      (cc&&cc.week===cw?'你目前交出的是：<span style="color:'+RAR[cc.q].c+'">'+RAR[cc.q].n+'</span>，可以換更好的':'你還沒參加')+'</small></div></div>';
    var cur=cc&&cc.week===cw?cc.q:-1, any=false;
    for(var cq=5;cq>cur;cq--) if(S.inv[cs.id][cq]>0){ any=true;
      h+='<div class="row"><div class="info"><strong>交出一株 <span style="color:'+RAR[cq].c+'">'+RAR[cq].n+'</span>品質</strong><small>手上有 '+S.inv[cs.id][cq]+' 株，交出後不會退還</small></div><button class="btn alt" data-act="centry" data-id="'+cq+'">交出</button></div>'; }
    if(!any) h+='<div class="row"><div class="info"><small>'+(cur>=0?'手上沒有比這更好的「'+cs.name+'」了。':'手上沒有「'+cs.name+'」，先去種幾株。')+'</small></div></div>';
    h+='<div class="row"><div class="info"><small>第 1 名聲望 30・第 2 名 18・第 3 名 10・參加 4，另有金幣</small></div></div>';
    h+='<div class="sec">聲望商店</div>';
    REPSHOP.forEach(function(x){
      var own=x.once&&(x.id==='wizard'?S.wardrobe.wizard:S.decor.trophy);
      h+='<div class="row"><div class="info"><strong>'+x.name+'</strong><small>'+x.desc+'</small></div><button class="btn" data-act="repbuy" data-id="'+x.id+'"'+(own||S.rep<x.cost?' disabled':'')+'>'+(own?'已擁有':'聲望 '+x.cost)+'</button></div>';
    });
    h+='<div class="row"><div class="info"><small>聲望來自品評會、完成限時任務、聽居民的故事。</small></div></div>';
  } else if(tab==='land'){
    var own=S.plots.filter(function(p){return p.u;}).length;
    title='地政所'; sub='持有 '+own+' / 9 塊地';
    if(own<9) h+='<div class="row"><div class="info"><strong>農場第 '+(own+1)+' 塊地</strong><small>買下後回農場就能種</small></div><button class="btn" data-act="buyland"'+(S.coins>=PLOT_COST[own]?'':' disabled')+'>'+coinTxt(PLOT_COST[own])+'</button></div>';
    else h+='<div class="row"><div class="info"><strong>農場的地都買齊了</strong></div></div>';
    h+='<div class="row"><div class="info"><strong>小鎮上的土地</strong><small>點有木牌的空地可以買。你有 '+Object.keys(S.land).length+' 塊地</small></div></div>';
  } else if(tab==='pets'){
    title='寵物'; sub='養了 '+Object.keys(S.pets).length+' / '+PETS.length+' 隻';
    if(!PMAP[petSel]) petSel=(PETS.filter(function(x){return S.pets[x.id];})[0]||PETS[0]).id;
    var pt=PMAP[petSel], own=S.pets[pt.id], hs=hearts(pt.id), rq=petReq(pt), cd=own?30-(now-own.last)/1000:0, tl=own&&own.trip?(own.trip.until-now)/1000:0;
    var petBtn=own?(own.trip?'<button class="btn alt" data-act="tripback" data-id="'+pt.id+'"'+(tl>0?' disabled':'')+'>'+(tl>0?'探險中':'領取')+'</button>'
        :'<button class="btn" data-act="pet" data-id="'+pt.id+'"'+(cd>0?' disabled':'')+'>'+(cd>0?Math.ceil(cd)+' 秒':'摸摸')+'</button>')
      :(pt.cost.trip?'':'<button class="btn alt" data-act="adopt" data-id="'+pt.id+'"'+(rq.ok?'':' disabled')+'>'+rq.txt+'</button>');
    var stat=own?['<div><em>效果</em>'+pt.label+' +'+Math.round(pt.base*(1+0.1*hs)*100)+'%'+(own.trip?'（外出中無效）':'')+'</div>',
        '<div><em>親密</em><span class="hearts">'+'♥♥♥♥♥'.slice(0,hs)+'♡♡♡♡♡'.slice(0,5-hs)+'</span>'+(hs<5?'　再摸 '+(4-own.aff%4)+' 次':'')+'</div>',
        '<div><em>狀態</em>'+(own.trip?(tl>0?'探險中，還要 '+fmt(tl):'探險回來了'):'在家')+'</div>'].join('')
      :'<div><em>效果</em>'+pt.label+' +'+Math.round(pt.base*100)+'%</div><div><em>取得</em>'+rq.how+'</div>';
    h+='<div class="grid pets">'+PETS.map(function(x){ var o=S.pets[x.id];
      return '<button type="button" class="card'+(o?'':' none')+(x.id===petSel?' sel':'')+'" style="--rar:'+RAR[x.rar].c+'" data-act="petsel" data-id="'+x.id+'">'+(o&&o.trip?'<u>外出</u>':'')+'<img alt="" src="'+ICON['pet_'+x.id]+'"><span>'+x.name.replace(/^.*?(?=..$)/,'')+'</span></button>'; }).join('')+'</div>';
    h+='<div class="detail" style="--rar:'+RAR[pt.rar].c+'"><button type="button" class="zoomer" data-act="petzoom" aria-label="放大"><img class="picon" alt="" src="'+ICON[(own?'pet_':'sil_')+pt.id]+'"><i>放大</i></button><div class="info"><strong>'+pt.name+'　<span style="color:'+RAR[pt.rar].c+';font-weight:400;font-size:12px">'+RAR[pt.rar].n+'</span></strong><div class="stats">'+stat+'</div></div></div>';
    h+='<div class="petact">'+petBtn+(own&&!own.trip?TRIPS.map(function(tr,ti){ return '<button class="btn ghost sm" data-act="trip" data-id="'+pt.id+':'+ti+'">探險 '+tr.n+'</button>'; }).join(''):'')+'</div>';
    if(petZoom) h+='<div class="pzoom" data-act="petzoomx"><div class="pzbox"><div class="pname">'+pt.name+'<span style="color:'+RAR[pt.rar].c+'">'+RAR[pt.rar].n+'</span></div><div class="petview"><canvas id="petbig" width="64" height="36"></canvas></div><div class="stats">'+stat+'</div><div class="petact">'+petBtn+'<button class="btn ghost" data-act="petzoomx">關閉</button></div></div></div>';
  } else if(tab==='market'){
    title='市場'; sub='行情 '+Math.ceil(60-(now/1000)%60)+' 秒後變動';
    var total=0;
    STRAINS.forEach(function(s){
      if(((s.gen&&!S.known[s.id])||s.ev)&&!invCount(s.id)) return;
      var arr=S.inv[s.id], n=invCount(s.id), pr=price(s,now), base=s.base*(1+0.1*S.upg.speaker), d=Math.round((pr/base-1)*100),
          glut=Math.round((1-satFactor(getSat(s.id,now)))*100), got=sellStrain(s.id,now,false), chips='';
      total+=got;
      for(var q=5;q>=0;q--) if(arr[q]) chips+='<span style="color:'+RAR[q].c+'">■</span>'+arr[q]+' ';
      h+='<div class="row'+(S.lvl<s.lvl?' locked':'')+'"><div class="sw" style="background:'+s.color+'"></div><div class="info"><strong>'+s.name+' ×'+n+'</strong><small>普通品質一株 '+pr+
        ' <span class="'+(d>=0?'up':'down')+'">'+(d>=0?'▲':'▼')+Math.abs(d)+'%</span>'+(glut>=1?' <span class="down">賣太多 -'+glut+'%</span>':'')+'</small>'+(chips?'<small>'+chips+'</small>':'')+'</div>'+
        '<button class="btn alt" data-act="sell" data-id="'+s.id+'"'+(n?'':' disabled')+'>賣　'+coinTxt(got)+'</button></div>';
    });
    var gv=goodsValue(); total+=gv;
    if(S.goods.length) h+='<div class="row"><img class="picon" alt="" style="--rar:var(--line);width:24px;height:24px" src="'+ICON.juice+'"><div class="info"><strong>加工品 ×'+S.goods.length+'</strong><small>果汁和果醬，價格固定</small></div><button class="btn alt" data-act="sellgoods">賣　'+coinTxt(gv)+'</button></div>';
    h+='<button class="btn wide" data-act="sellall"'+(total?'':' disabled')+'>全部賣出　'+coinTxt(total)+'</button>';
    h+='<div class="row"><div class="info"><small>同一種賣越多越便宜，約 8 分鐘回復一半</small></div></div>';
  } else if(tab==='upg'){
    var fanN=FR.fans.filter(function(id){ return !isFriend(id); }).length;
    title='更多'; sub='';
    var tile=function(id,name,small,dot){ return '<button type="button" class="tile" data-act="go" data-id="'+id+'"><b>'+name+(dot?'<i class="dot"></i>':'')+'</b><small>'+small+'</small></button>'; };
    h+='<div class="tiles">'+tile('acct','帳號',user?esc(S.name||''):'點這裡登入')+tile('friends','好友',user?FR.mine.length+' 位好友':'登入後可用',fanN)+
      tile('mail','郵局',(INBOX.mail+INBOX.coop)?(INBOX.mail+INBOX.coop)+' 件待領':'禮物、合作',INBOX.mail+INBOX.coop)+tile('log','農場紀錄',S.log.length?hm(S.log[0].t)+' '+esc(S.log[0].m).slice(0,10):'還沒有紀錄')+tile('rank','排行榜','圖鑑、等級')+tile('settings','設定','聲音、畫面')+(IS_ADMIN?tile('admin','管理','只有你看得到'):'')+'</div>';
  } else if(tab==='visit'&&VISIT){
    var V=VISIT; title=V.name+' 的農場'; sub='LV '+(V.lvl||1);
    h+='<div class="row"><img class="ava" alt="" src="'+avatar(V.gender)+'"><div class="info"><strong>'+esc(V.name)+'</strong><small>'+(V.mutual?'你們互相是好友：可以澆水和偷菜':(V.added?'你加了他：可以幫忙澆水，互相加好友才能偷菜':'加好友後才能幫忙澆水'))+'</small></div>'+
      (V.added?'<button class="btn alt" data-act="giftto" data-id="'+V.owner+'">送禮</button>':'<button class="btn" data-act="fradd2" data-id="'+V.owner+'">加好友</button>')+'</div>';
    h+='<div class="row"><div class="info"><small>成熟的作物每株可以偷 1–3 個；幫忙澆水拿 5 金幣</small></div><button class="btn ghost" data-act="leave">回小鎮</button></div>';
    h+='<div class="sec">留言板</div><div class="row"><div class="info"><input class="inp" id="msg_text" type="text" maxlength="80" placeholder="留句話給他（80 字以內）"></div><button class="btn" data-act="msgpost">留言</button></div>';
    if(!MSGS.length) h+='<div class="row"><div class="info"><small>還沒有人留言。</small></div></div>';
    MSGS.forEach(function(mg){ var ap=WORLD.prof[mg.author]; h+='<div class="row"><div class="info"><strong>'+esc(ap?ap.name:'…')+'</strong><small>'+esc(mg.text)+'</small><small>'+seenText(mg.created_at).replace('上線','').replace('在線上','剛剛')+'</small></div></div>'; });
  } else if(tab==='mail'){
    title='郵局'; sub=user?'禮物、合作配種、留言':''; h+='<button type="button" class="btn ghost back" data-act="back">← 更多</button>';
    if(!user){ h+='<div class="row"><div class="info"><small>登入後才能收發禮物。</small></div></div>'; }
    else {
      h+='<div class="row"><div class="info"><strong>送禮給好友</strong><small>作物、種子、寶物、金幣都能送，每天最多送 10 次。</small></div><button class="btn alt" data-act="giftto" data-id="">送禮</button></div>';
      var coopIn=MAIL.coop.filter(function(x){ return x.b===user.id; }), coopOut=MAIL.coop.filter(function(x){ return x.a===user.id; });
      if(coopIn.length){ h+='<div class="sec">合作配種邀請</div>';
        coopIn.forEach(function(x){ var p=WORLD.prof[x.a], st=SMAP[x.a_strain];
          h+='<div class="row"><div class="sw" style="background:'+(st?st.color:'#999')+'"></div><div class="info"><strong>'+esc(p?p.name:'…')+' 想跟你合作配種</strong><small>他出了 '+(st?st.name:'')+'（'+RAR[x.a_q].n+'），你出一株作物就能開始。兩個配種品種會配出「雙子星雲」，其他組合是「友情草」。</small></div>'+
            '<button class="btn" data-act="coopgo" data-id="'+x.id+'">選作物</button><button class="btn ghost" style="min-width:0;margin-left:6px;padding:10px 8px" data-act="coopno" data-id="'+x.id+'">婉拒</button></div>'; }); }
      if(coopOut.length){ h+='<div class="sec">等待回覆的合作邀請</div>';
        coopOut.forEach(function(x){ var p=WORLD.prof[x.b], st=SMAP[x.a_strain];
          h+='<div class="row"><div class="info"><strong>等 '+esc(p?p.name:'…')+' 回覆</strong><small>你出了 '+(st?st.name:'')+'（'+RAR[x.a_q].n+'）</small></div><button class="btn ghost" data-act="coopno" data-id="'+x.id+'">取消</button></div>'; }); }
      h+='<div class="sec">收件匣</div>';
      if(!MAIL.list.length) h+='<div class="row"><div class="info"><small>沒有新郵件。</small></div></div>';
      else h+='<button class="btn wide" data-act="mailall">全部領取</button>';
      MAIL.list.forEach(function(mg){ var p=mg.from_user?WORLD.prof[mg.from_user]:null;
        h+='<div class="row"><div class="info"><strong>'+(mg.from_user?esc(p?p.name:'…'):'管理員')+(mg.note?'：'+esc(mg.note):'')+'</strong><small>'+esc(mailText(mg)||'一封信')+'</small></div><button class="btn" data-act="mail1" data-id="'+mg.id+'">領取</button></div>'; });
    }
  } else if(tab==='gift'){
    title='送禮'; h+='<button type="button" class="btn ghost back" data-act="back">← 更多</button>';
    var tgt=GIFT.to, tp=tgt?WORLD.prof[tgt]:null;
    if(!tgt){ sub='選一位好友';
      if(!FR.mine.length) h+='<div class="row"><div class="info"><small>先加好友才能送禮。</small></div></div>';
      FR.mine.forEach(function(id){ var p=WORLD.prof[id]; h+='<div class="row"><img class="ava" alt="" src="'+avatar(p&&p.gender)+'"><div class="info"><strong>'+esc(p?p.name:'…')+'</strong></div><button class="btn" data-act="giftto" data-id="'+id+'">送他</button></div>'; });
    } else { sub='送給 '+(tp?tp.name:'');
      h+='<div class="row"><div class="info"><input class="inp" id="gift_note" type="text" maxlength="40" placeholder="附一句話（可以不填）"></div></div>';
      h+='<div class="sec">金幣</div><div class="row"><div class="info"><small>你有 '+S.coins+' 金幣</small></div>'+[100,1000].map(function(v){ return '<button class="btn ghost" style="min-width:0;margin-left:6px;padding:10px 8px" data-act="sendgift" data-id="coins::0:'+v+'"'+(S.coins<v?' disabled':'')+'>'+v+'</button>'; }).join('')+'</div>';
      var cr=''; STRAINS.forEach(function(st){ for(var q=5;q>=0;q--) if(S.inv[st.id][q]>0) cr+='<button type="button" class="card" style="--rar:'+RAR[q].c+'" data-act="sendgift" data-id="crop:'+st.id+':'+q+':1"><b>'+S.inv[st.id][q]+'</b><img alt="" src="'+ICON[st.id]+'"><span>'+st.name+'</span></button>'; });
      h+='<div class="sec">作物（點一下送 1 株）</div>'+(cr?'<div class="grid">'+cr+'</div>':'<div class="row"><div class="info"><small>沒有作物。</small></div></div>');
      var sd=''; STRAINS.forEach(function(st){ if(S.seeds[st.id]>0) sd+='<button type="button" class="card" style="--rar:var(--line)" data-act="sendgift" data-id="seed:'+st.id+':0:1"><b>'+S.seeds[st.id]+'</b><img alt="" src="'+ICON[st.id]+'"><span>'+st.name+'種子</span></button>'; });
      h+='<div class="sec">種子（點一下送 1 顆）</div>'+(sd?'<div class="grid">'+sd+'</div>':'<div class="row"><div class="info"><small>沒有種子。</small></div></div>');
      var it=''; ITEMS.forEach(function(x){ if(S.items[x.id]>0) it+='<button type="button" class="card" style="--rar:'+RAR[x.rar].c+'" data-act="sendgift" data-id="item:'+x.id+':0:1"><b>'+S.items[x.id]+'</b><img alt="" src="'+ICON[x.id]+'"><span>'+x.name+'</span></button>'; });
      h+='<div class="sec">寶物</div>'+(it?'<div class="grid">'+it+'</div>':'<div class="row"><div class="info"><small>沒有寶物。</small></div></div>');
    }
  } else if(tab==='coopPick'){
    title='合作配種'; sub='選一株你要出的作物'; h+='<button type="button" class="btn ghost back" data-act="back">← 更多</button>';
    var cps=''; STRAINS.forEach(function(st){ for(var q=5;q>=0;q--) if(S.inv[st.id][q]>0) cps+='<button type="button" class="card" style="--rar:'+RAR[q].c+'" data-act="coopacc" data-id="'+st.id+':'+q+'"><b>'+S.inv[st.id][q]+'</b><img alt="" src="'+ICON[st.id]+'"><span>'+st.name+'</span></button>'; });
    h+='<div class="row"><div class="info"><small>兩株品質越高越容易成功。兩邊都是配種品種、而且不一樣，會配出「雙子星雲」；其他組合配出「友情草」。成功的話你們兩個都會拿到種子。</small></div></div>';
    h+=cps?'<div class="grid">'+cps+'</div>':'<div class="row"><div class="info"><small>你手上沒有作物，先去收成。</small></div></div>';
  } else if(tab==='rank'){
    title='排行榜'; sub=RANK?RANK.length+' 位玩家':'讀取中…'; h+='<button type="button" class="btn ghost back" data-act="back">← 更多</button>';
    var keys=[['dex','圖鑑'],['lvl','等級'],['rep','聲望'],['ach','成就']];
    h+='<div class="grow" style="margin:10px 0">'+keys.map(function(k){ return '<button type="button" class="btn'+(RANKBY===k[0]?'':' ghost')+'" style="min-width:0;padding:8px 4px" data-act="rankby" data-id="'+k[0]+'">'+k[1]+'</button>'; }).join('')+'</div>';
    (RANK||[]).slice().sort(function(a,b){ return (b[RANKBY]||0)-(a[RANKBY]||0); }).slice(0,30).forEach(function(r,i){
      h+='<div class="row"'+(user&&r.id===user.id?' style="background:var(--panel-2)"':'')+'><b style="width:26px;font-family:var(--pixel);font-size:10px;color:'+(i<3?'var(--coin)':'var(--muted)')+'">'+(i+1)+'</b><img class="ava" alt="" src="'+avatar(r.gender)+'"><div class="info"><strong>'+esc(r.name)+'</strong><small>LV '+r.lvl+'・圖鑑 '+r.dex+'・聲望 '+r.rep+'</small></div><b style="font-family:var(--pixel);font-size:11px">'+(r[RANKBY]||0)+'</b></div>'; });
  } else if(tab==='admin'){
    title='管理'; sub='只有管理員看得到'; h+='<button type="button" class="btn ghost back" data-act="back">← 更多</button>';
    if(!IS_ADMIN){ h+='<div class="row"><div class="info"><small>你沒有管理權限。</small></div></div>'; }
    else {
      var opts='<option value="">所有玩家</option>'+(ADM.players||[]).map(function(p){ return '<option value="'+p.id+'">'+esc(p.name||p.email)+'</option>'; }).join('');
      var iopts='<option value="">不附東西</option>'+STRAINS.map(function(st){ return '<option value="seed:'+st.id+'">'+st.name+' 種子</option>'; }).join('')+ITEMS.map(function(x){ return '<option value="item:'+x.id+'">'+x.name+'</option>'; }).join('');
      h+='<div class="sec">發禮物</div><div class="row"><div class="info"><select class="inp" id="ad_to">'+opts+'</select>'+
        '<input class="inp" id="ad_coins" type="number" inputmode="numeric" placeholder="金幣（可以不填）"><input class="inp" id="ad_rep" type="number" inputmode="numeric" placeholder="聲望（可以不填）">'+
        '<select class="inp" id="ad_item">'+iopts+'</select><input class="inp" id="ad_n" type="number" inputmode="numeric" placeholder="數量"><input class="inp" id="ad_note" type="text" maxlength="40" placeholder="附一句話">'+
        (ADM.msg?'<small class="up">'+esc(ADM.msg)+'</small>':'')+'</div></div><button class="btn wide" data-act="adsend">寄出</button>';
      h+='<div class="sec">玩家</div>';
      (ADM.players||[]).forEach(function(p){
        h+='<div class="row"><div class="info"><strong>'+esc(p.name||'（還沒取名）')+(p.banned?'　<span class="down">已封鎖</span>':'')+'</strong><small>'+esc(p.email||'')+'</small><small>LV '+p.lvl+'・'+p.coins+' 金幣・'+(p.seen?seenText(p.seen):'')+'</small></div>'+
          '<button class="btn ghost" style="min-width:0;padding:10px 8px" data-act="adban" data-id="'+p.id+'">'+(p.banned?'解除':'封鎖')+'</button>'+
          '<button class="btn ghost" style="min-width:0;margin-left:6px;padding:10px 8px" data-act="adreset" data-id="'+p.id+'">'+(ADM.resetArm===p.id?'確定':'重置')+'</button></div>'; });
      h+='<div class="sec">作弊紀錄（存檔檢查沒通過）</div>';
      if(!(ADM.cheats||[]).length) h+='<div class="row"><div class="info"><small>目前沒有。</small></div></div>';
      (ADM.cheats||[]).slice(0,20).forEach(function(c){ var dt=c.detail||{}; h+='<div class="row"><div class="info"><strong>'+esc(c.name||'?')+'：'+esc(c.why)+'</strong><small>'+new Date(c.at).toLocaleString('zh-TW')+'・金幣 '+(dt.coins||[]).join(' → ')+'・距上次存檔 '+(dt.mins||'?')+' 分鐘</small></div></div>'; });
      h+='<div class="sec">備份（每週一凌晨 3 點自動備份，保留 8 份）</div><button class="btn wide" data-act="adbackup">立即備份</button>';
      (ADM.backups||[]).forEach(function(b){ h+='<div class="row"><div class="info"><strong>'+new Date(b.at).toLocaleString('zh-TW')+'</strong><small>'+b.kb+' KB</small></div><button class="btn ghost" data-act="addl" data-id="'+b.id+'">下載</button></div>'; });
    }
  } else if(tab==='acct'){
    title='帳號'; h+='<button type="button" class="btn ghost back" data-act="back">← 更多</button>';
    if(!user){
      sub='';
      h+='<div class="row"><div class="info"><strong>還沒登入</strong><small>登入後進度會存到雲端，換手機也能接著玩。</small></div><button class="btn" data-act="relogin">登入</button></div>';
    } else {
      sub=S.name||'';
      h+='<div class="row"><img class="ava" alt="" src="'+avatar(S.gender)+'"><div class="info"><strong>'+esc(S.name)+'　<span style="font-weight:400;font-size:12px;color:var(--muted)">'+(S.gender==='f'?'女生':'男生')+'</span></strong><small>'+esc(user.email)+'</small><small>你的農場：'+(LOTMAP[S.home]?LOTMAP[S.home].name+'（3×3 格）':'')+'</small></div></div>';
      h+='<div class="row"><div class="info"><strong>雲端存檔</strong><small>'+(cloudMsg||'每分鐘自動同步，切到背景時也會存')+'</small></div><button class="btn" data-act="syncnow">立即同步</button></div>';
      h+='<div class="row"><div class="info"><strong>改名字</strong><input class="inp" id="au_name" type="text" maxlength="12" placeholder="2 到 12 個字">'+(authMsg?'<small class="down">'+esc(authMsg)+'</small>':'')+'</div><button class="btn alt" data-act="setname">儲存</button></div>';
      h+='<div class="row"><div class="info"><small>登出後會回到登入畫面，帳號進度留在雲端。</small></div><button class="btn ghost" data-act="signout">登出</button></div>';
    }
  } else if(tab==='friends'){
    title='好友'; h+='<button type="button" class="btn ghost back" data-act="back">← 更多</button>';
    if(!user){
      sub='';
      h+='<div class="row"><div class="info"><strong>登入後才能加好友</strong><small>登入後朋友才看得到你的農場。</small></div><button class="btn" data-act="relogin">登入</button></div>';
    } else {
      sub=FR.mine.length+' 位好友';
      h+='<div class="row"><div class="info"><strong>你的名字：'+esc(S.name)+'</strong><small>把這個名字告訴朋友，他就能加你。</small><input class="inp" id="fr_name" type="text" maxlength="12" placeholder="輸入朋友的角色名稱">'+(FR.msg?'<small class="down">'+esc(FR.msg)+'</small>':'')+'</div><button class="btn" data-act="fradd">加好友</button></div>';
      var fans=FR.fans.filter(function(id){ return !isFriend(id); });
      if(fans.length){ h+='<div class="sec">想加你好友</div>';
        fans.forEach(function(id){ var p=WORLD.prof[id];
          h+='<div class="row"><img class="ava" alt="" src="'+avatar(p&&p.gender)+'"><div class="info"><strong>'+esc(p?p.name:'…')+'</strong><small>'+(p?'LV '+p.level+'・'+seenText(p.seen_at):'')+'</small></div><button class="btn alt" data-act="fradd2" data-id="'+id+'">加回去</button></div>'; }); }
      h+='<div class="sec">我的好友</div>';
      if(!FR.mine.length) h+='<div class="row"><div class="info"><small>還沒有好友。朋友在小鎮上的農場會用藍色框標出來。</small></div></div>';
      FR.mine.forEach(function(id){ var p=WORLD.prof[id], mutual=FR.fans.indexOf(id)>=0;
        h+='<div class="row"><img class="ava" alt="" src="'+avatar(p&&p.gender)+'"><div class="info"><strong>'+esc(p?p.name:'…')+(p?'　<span style="font-weight:400;font-size:12px;color:var(--muted)">LV '+p.level+'</span>':'')+'</strong><small>'+(p?seenText(p.seen_at)+'・':'')+(mutual?'互相是好友':'等他加你')+'</small></div>'+
          '<button class="btn" data-act="visit" data-id="'+id+'">參觀</button>'+(FR.fans.indexOf(id)>=0?'<button class="btn alt" style="min-width:0;margin-left:6px;padding:10px 8px" data-act="giftto" data-id="'+id+'">送禮</button>':'')+'<button class="btn ghost" style="min-width:0;margin-left:6px;padding:10px 8px" data-act="frdel" data-id="'+id+'">'+(frDelArm===id?'確定':'刪除')+'</button></div>'; });
    }
  } else if(tab==='settings'){
    title='設定'; sub='只影響這台裝置'; h+='<button type="button" class="btn ghost back" data-act="back">← 更多</button>';
    var tg=function(k,name,desc){ return '<div class="row"><div class="info"><strong>'+name+'</strong><small>'+desc+'</small></div><button class="btn'+(SET[k]?'':' ghost')+'" data-act="set" data-id="'+k+'">'+(SET[k]?'開':'關')+'</button></div>'; };
    h+='<div class="sec">聲音</div>'+tg('music','背景音樂','即時合成的 lofi，不佔流量')+
      '<div class="row"><div class="info"><small>音樂音量</small><input class="rng" id="set_mvol" type="range" min="0" max="100" value="'+Math.round(SET.mvol*100)+'"></div></div>'+
      tg('sfx','音效','種植、澆水、收成、賣東西的聲音')+
      '<div class="row"><div class="info"><small>音效音量</small><input class="rng" id="set_svol" type="range" min="0" max="100" value="'+Math.round(SET.svol*100)+'"></div></div>'+
      '<div class="sec">畫面</div>'+tg('fx','天氣特效','下雨、起霧、熱浪、彩虹的畫面效果')+tg('labels','小鎮地名','在小鎮地圖上顯示建築和朋友農場的名字')+'<div class="sec">通知</div><div class="row"><div class="info"><strong>推播通知</strong><small>作物成熟、有人偷菜、收到禮物時通知你。iPhone 要先把遊戲「加入主畫面」，從主畫面打開才能開。</small>'+(PUSHMSG?'<small class="down">'+esc(PUSHMSG)+'</small>':'')+'</div><button class="btn'+(PUSH_ON?'':' ghost')+'" data-act="push">'+(PUSH_ON?'開':'關')+'</button></div>'+
      '<div class="sec">進度</div><div class="row"><div class="info"><strong>重新開始</strong><small>'+'帳號進度會清空（雲端也會覆蓋），買的小鎮土地會釋出，農場位置不變。'+'</small></div><button class="btn ghost" data-act="reset">'+(resetArm?'再按一次確定':'重新開始')+'</button></div>'+
      '<div class="row"><div class="info"><small>懶草農場 v1.0</small></div></div>';
  } else if(tab==='ach'){
    var done=ACH.filter(function(a){return S.ach[a.id];}).length;
    title='任務與成就'; sub='成就 '+done+' / '+ACH.length;
    var evsNow=activeEvents(now), ds0=twDate(now), evsNext=EVENTS_CAL.filter(function(e){ return !e.weekly&&e.from>ds0; }).slice(0,2);
    h+='<div class="sec">限時任務</div>';
    if(!S.tasks.length) h+='<div class="empty">目前沒有限時任務</div>';
    S.tasks.forEach(function(t,ti){
      var st=SMAP[t.strain], have=haveFor(t);
      h+='<div class="row"><div class="sw" style="background:'+st.color+'"></div><div class="info"><strong>'+t.npc+'要 '+t.n+' 株'+st.name+(t.minQ?'（'+RAR[t.minQ].n+'以上）':'')+'</strong><small>剩 '+fmt((t.until-now)/1000)+'，報酬 '+t.reward+' 金幣，手上有 '+Math.min(have,t.n)+'/'+t.n+'</small></div>'+
        '<button class="btn" data-act="task" data-id="'+ti+'"'+(have>=t.n?'':' disabled')+'>交貨</button></div>';
    });
    h+='<div class="sec">限時活動</div>';
    evsNow.forEach(function(e){ h+='<div class="row"><div class="info"><strong style="color:var(--coin)">'+e.name+'　進行中'+(e.to?'（到 '+e.to.slice(5).replace('-','/')+'）':'')+'</strong><small>'+e.desc+'</small></div></div>'; });
    evsNext.forEach(function(e){ h+='<div class="row locked"><div class="info"><strong>'+e.name+'　'+e.from.slice(5).replace('-','/')+' 開始</strong><small>'+e.desc+'</small></div></div>'; });
    h+='<div class="sec">居民好感（每交貨 3 次送一份禮）</div><div class="row"><div class="info"><small>'+NPCS.map(function(n){ return n+' '+(S.favor[n]||0)+' 次'; }).join('　')+'</small></div></div><div class="sec">成就</div>';
    ACH.forEach(function(a){
      h+='<div class="row'+(S.ach[a.id]?'':' locked')+'"><div class="info"><strong>'+a.name+'</strong><small>'+a.desc+'，獎勵 '+a.reward+' 金幣</small></div><span class="'+(S.ach[a.id]?'up':'')+'">'+(S.ach[a.id]?'已達成':'未達成')+'</span></div>';
    });
  }
  $('ptitle').textContent=title; $('psub').textContent=sub; if(h!==lastPanel){ $('plist').innerHTML=h; lastPanel=h; drawPetBig(performance.now()); }
}
var lastPanel='';
var resetArm=false, shopTab='seed', bagSel=null, bagTab='crop', bagAll=false, petSel=null, labA=null, labB=null;
function labStack(key){ if(!key) return null; var k=key.split(':'), st=SMAP[k[0]], q=+k[1]; return st?{key:key,id:st.id,st:st,q:q,n:S.inv[st.id][q]}:null; }
function fixLab(){
  var A=labStack(labA); if(!A||A.n<1) labA=null;
  var B=labStack(labB); if(!B||B.n<(labB===labA?2:1)) labB=null;
  if(!labA&&labB){ labA=labB; labB=null; }
}
function breedChance(A,B,rc){ return Math.min(0.95,(rc?rc.ch+0.04*(A.q+B.q):0.04+0.01*(A.q+B.q))+petBonus('owl')); }
function tripLoot(id,rolls){
  var coins=0, got={}, lines=[], hh=hearts(id), add=function(k){ got[k]=(got[k]||0)+1; }, ex=0, j;
  for(j=0;j<rolls;j++) if(Math.random()<petBonus('hog')) ex++; rolls+=ex;
  if(!S.pets.hog&&Math.random()<1-Math.pow(0.97,rolls)){ S.pets.hog={aff:0,last:0}; lines.push('路上撿到一隻迷路的「刺蝟球球」，牠跟回家了'); }
  for(var i=0;i<rolls;i++){
    var r=Math.random();
    if(r<0.5) coins+=Math.round((15+Math.random()*25)*(1+0.15*S.lvl));
    else if(r<0.7){ var tr=Math.random(), it=tr<0.45?'pickle':(tr<0.8?'hairball':(tr<0.95?'whistle':'meteor')); give(it); add(IMAP[it].name); }
    else if(r<0.85){ var pool=STRAINS.filter(function(x){return isBase(x)&&S.lvl>=x.lvl;}), st=pool[Math.floor(Math.random()*pool.length)], q=rollQ(Math.min(1,0.5+0.05*hh)); S.inv[st.id][q]++; S.dex[st.id+q]=1; add(st.name+'（'+RAR[q].n+'）'); }
    else if(r<0.95){ S.charm++; add('幸運符'); }
    else { var g1=STRAINS.filter(function(x){return x.gen===1&&!x.coop;}), gs=g1[Math.floor(Math.random()*g1.length)]; S.seeds[gs.id]=(S.seeds[gs.id]||0)+1; S.known[gs.id]=1; add(gs.name+'種子'); }
  }
  if(coins){ addCoins(coins); lines.push('金幣 +'+coins); }
  Object.keys(got).forEach(function(k){ lines.push(k+' ×'+got[k]); });
  return lines;
}
function goodsValue(){ return S.goods.reduce(function(a,g){return a+g.v;},0); }
function haveFor(t){ var a=S.inv[t.strain], c=0; for(var q=t.minQ;q<6;q++) c+=a[q]; return c; }
var NPCS=['隔壁阿嬤','警察杯杯','外星觀光客','早餐店老闆','廟口里長'];
function tasksTick(now){
  for(var i=S.tasks.length-1;i>=0;i--) if(now>S.tasks[i].until){ logAdd('「'+S.tasks[i].npc+'」的任務過期了'); toast('「'+S.tasks[i].npc+'」的任務過期了'); S.tasks.splice(i,1); }
  if(S.tasks.length<2&&now>=S.nextTask){
    var pool=STRAINS.filter(function(s){return isBase(s)&&S.lvl>=s.lvl;}), st=pool[Math.floor(Math.random()*pool.length)];
    var n=st.time>=6000?3+Math.floor(Math.random()*4):6+Math.floor(Math.random()*10), minQ=Math.random()<0.3?2:0;
    S.tasks.push({npc:NPCS[Math.floor(Math.random()*NPCS.length)],strain:st.id,n:n,minQ:minQ,until:now+Math.max(7200,st.time*4)*1000,reward:Math.round(st.base*n*(minQ?3.2:1.9))});
    S.nextTask=now+(200+Math.random()*200)*60000;
    toast('公告欄有新的限時任務');
  }
}
var FISHID={}; FISH.forEach(function(f){ FISHID[f.id]=1; });
function bestQ(id,seen){ for(var q=5;q>=0;q--) if(seen?S.dex[id+q]:S.inv[id][q]) return q; return 0; }
function bagList(t){
  var a=[];
  if(t==='seed') STRAINS.forEach(function(s){ var n=S.seeds[s.id]||0, show=n>0||(bagAll&&(isBase(s)||S.known[s.id]||(s.ev&&S.seeds[s.id]!==undefined)));
    if(show) a.push({key:'s:'+s.id,kind:'seed',id:s.id,icon:s.id,name:s.name,rar:Math.min(5,s.gen||0),n:n}); });
  if(t==='crop') STRAINS.forEach(function(s){ var n=invCount(s.id), seen=STRAINS.length&&[0,1,2,3,4,5].some(function(q){return S.dex[s.id+q];});
    if(n>0||(bagAll&&seen)) a.push({key:'c:'+s.id,kind:'crop',id:s.id,icon:s.id,name:s.name,rar:n?bestQ(s.id):bestQ(s.id,1),n:n}); });
  if(t==='goods') Object.keys(GOODS).forEach(function(g){ for(var q=5;q>=0;q--){ var c=S.goods.filter(function(x){return x.t===g&&x.q===q;}).length; if(c) a.push({key:'g:'+g+':'+q,kind:'goods',icon:g,name:GOODS[g].name,rar:q,n:c}); } });
  if(t==='item'||t==='fish') ITEMS.forEach(function(it){ if(!!FISHID[it.id]!==(t==='fish')) return; var n=S.items[it.id]||0;
    if(n>0||(bagAll&&S.items[it.id]!==undefined)) a.push({key:'i:'+it.id,kind:'item',id:it.id,icon:it.id,name:it.name,rar:it.rar,n:n,value:it.value}); });
  return a;
}
function bagDetail(x){
  var h='<div class="detail" style="--rar:'+RAR[x.rar].c+'"><img class="picon" alt="" src="'+ICON[x.icon]+'"><div class="info">';
  if(x.kind==='seed'){ var s=SMAP[x.id];
    h+='<strong>'+s.name+'種子 ×'+x.n+'</strong><small>成長 '+fmt(s.time/speed())+'・行情約 '+s.base+'</small><small>'+s.tname+'：'+s.tdesc+'</small></div>'+
'</div>';
  } else if(x.kind==='crop'){ var st=SMAP[x.id], qs='';
    for(var q=5;q>=0;q--){ var c=S.inv[st.id][q]; if(c||(bagAll&&S.dex[st.id+q])) qs+='<span class="qchip" style="--rar:'+RAR[q].c+'"><i></i>'+RAR[q].n+'<b>'+c+'</b></span>'; }
    h+='<strong>'+st.name+' ×'+x.n+'</strong><small>行情約 '+st.base+'・品質越高越值錢（最高 '+QMULT[5]+' 倍）</small><div class="qchips">'+qs+'</div></div></div>';
  } else if(x.kind==='goods'){
    var gv=S.goods.filter(function(g){return 'g:'+g.t+':'+g.q===x.key;}).reduce(function(a,g){return a+g.v;},0);
    h+='<strong>'+x.name+' ×'+x.n+'</strong><small><span style="color:'+RAR[x.rar].c+'">'+RAR[x.rar].n+'</span>・合計價值 '+gv+'，到市場賣出</small></div></div>';
  } else {
    h+='<strong>'+x.name+' ×'+x.n+'</strong><small><span style="color:'+RAR[x.rar].c+'">'+RAR[x.rar].n+'</span>・每個 '+x.value+' 金幣</small></div>'+
      '<div class="btncol"><button class="btn alt" data-act="sellitem" data-id="'+x.id+'"'+(x.n?'':' disabled')+'>賣 1 個</button>'+(x.n>1?'<button class="btn ghost" data-act="sellitemall" data-id="'+x.id+'">全賣 '+x.n*x.value+'</button>':'')+'</div></div>';
  }
  return h;
}
$('plist').addEventListener('click',function(e){
  var b=e.target.closest('button[data-act]')||(e.target.classList.contains('pzoom')?e.target:null); if(!b||b.disabled) return;
  var act=b.dataset.act, id=b.dataset.id, now=Date.now(), c0=S.coins;
  if(act==='sell'||act==='sellall'){
    var got=0;
    STRAINS.forEach(function(s){ if((act==='sellall'||s.id===id)&&invCount(s.id)) got+=sellStrain(s.id,now,true); });
    if(act==='sellall'){ got+=goodsValue(); S.goods=[]; }
    if(got){ addCoins(got); toast('賣出，進帳 '+got+' 金幣'); }
  }
  else if(act==='task'){
    var t=S.tasks[+id];
    if(t&&haveFor(t)>=t.n){
      var need=t.n, arr=S.inv[t.strain];
      for(var q=t.minQ;q<6&&need>0;q++){ var take=Math.min(arr[q],need); arr[q]-=take; need-=take; }
      logAdd('完成「'+t.npc+'」的任務，收 '+nf(t.reward)+' 金幣'); S.tasks.splice(+id,1); S.stats.tasks++; S.rep+=t.minQ?3:1; addCoins(t.reward); addXp(Math.ceil(SMAP[t.strain].time/100*Math.min(t.n,4)));
      S.favor[t.npc]=(S.favor[t.npc]||0)+1;
      if(S.favor[t.npc]%3===0){ var gifts=Object.keys(S.known); if(gifts.length&&Math.random()<0.5){ var gs=gifts[Math.floor(Math.random()*gifts.length)]; S.seeds[gs]=(S.seeds[gs]||0)+1; toast(t.npc+'跟你變熟了，送你一顆「'+SMAP[gs].name+'」種子'); } else { S.charm+=3; toast(t.npc+'跟你變熟了，送你幸運符 3 次'); } }
      else toast('交貨完成，'+t.npc+'給了 '+t.reward+' 金幣');
    }
  }
  else if(act==='upg'){ var u=UPG[id], l=S.upg[id]; if(l<u.max&&S.coins>=u.cost[l]){ S.coins-=u.cost[l]; S.upg[id]++; toast('買了「'+u.name+'」'); } }
  else if(act==='bag'){ bagSel=(bagSel===id)?null:id; }
  else if(act==='sellitem'){ if(S.items[id]>0){ S.items[id]--; addCoins(IMAP[id].value); toast('賣出「'+IMAP[id].name+'」 +'+IMAP[id].value+' 金幣'); } }
  else if(act==='sellitemall'){ var sn=S.items[id]||0; if(sn>0){ S.items[id]=0; addCoins(sn*IMAP[id].value); toast('賣出 '+sn+' 個「'+IMAP[id].name+'」 +'+sn*IMAP[id].value+' 金幣'); } }
  else if(act==='bagtab'){ bagTab=id; bagSel=null; }
  else if(act==='shoptab'){ shopTab=id; $('plist').scrollTop=0; }
  else if(act==='bagall'){ bagAll=!bagAll; }
  else if(act==='buyseed'){ var bs=id.split(':'), bst=SMAP[bs[0]], bn=+bs[1];
    if(bst&&!bst.gen&&(bst.ev?evOn(bst.ev):S.lvl>=bst.lvl)&&S.coins>=bst.cost*bn){ S.coins-=bst.cost*bn; S.seeds[bst.id]=(S.seeds[bst.id]||0)+bn; sfx('coin'); toast('買了「'+bst.name+'」種子 ×'+bn); } }
  else if(act==='adopt'){
    var pt=PMAP[id], c=pt.cost;
    if(petReq(pt).ok&&!S.pets[id]&&!c.trip){ if(c.coins) S.coins-=c.coins; if(c.item) S.items[c.item]-=c.n; if(c.crop){ var ca=S.inv[c.crop]; for(var cq=0;cq<6;cq++) if(ca[cq]>0){ ca[cq]--; break; } }
      S.pets[id]={aff:0,last:0}; petFx=Date.now(); sfx('harvest',3); toast('「'+pt.name+'」加入農場了'); }
  }
  else if(act==='petsel'){ petSel=id; }
  else if(act==='petzoom'){ petZoom=true; }
  else if(act==='petzoomx'){ petZoom=false; }
  else if(act==='pet'){
    var o=S.pets[id];
    if(o&&now-o.last>=30000){ var before=hearts(id); o.aff++; o.last=now; petFx=now; toast(hearts(id)>before?'「'+PMAP[id].name+'」更喜歡你了，加成提高':'「'+PMAP[id].name+'」很開心'); }
  }
  else if(act==='labpick'){
    var pk=labStack(id);
    if(!labA) labA=id; else if(!labB){ if(id===labA&&pk.n<2) toast('這種只剩 1 株'); else labB=id; } else { labA=id; labB=null; }
  }
  else if(act==='labclr'){ if(id==='A'){ labA=labB; labB=null; } else labB=null; }
  else if(act==='breed'||act==='juice'||act==='jam'){
    fixLab(); var A=labStack(labA), B=labStack(labB);
    if(act==='breed'&&A&&B){
      var rc=findRecipe(A.id,B.id), ch=breedChance(A,B,rc);
      S.inv[A.id][A.q]--; S.inv[B.id][B.q]--;
      if(Math.random()<ch){
        var g1=STRAINS.filter(function(x){return x.gen===1&&!x.coop;}), out=rc?rc.out:g1[Math.floor(Math.random()*g1.length)].id, cnt=A.q+B.q>=6?2:1, isNew=!S.known[out], os=SMAP[out];
        S.seeds[out]=(S.seeds[out]||0)+cnt; S.known[out]=1; S.stats.breed++; addXp(20*os.gen); logAdd('配種成功：「'+os.name+'」種子 ×'+cnt);
        modal('star',isNew?'配出新品種了':'配種成功',['得到「'+os.name+'」種子 ×'+cnt,'【'+os.tname+'】'+os.tdesc,'點空地就能選它來種。'],[['太好了']]);
      } else toast('配種失敗，這次沒有結果');
    } else if(act==='juice'&&A&&B&&A.id!==B.id&&!S.job){
      S.inv[A.id][A.q]--; S.inv[B.id][B.q]--;
      S.job={t:'juice',v:Math.round((A.st.base*QMULT[A.q]+B.st.base*QMULT[B.q])*1.35),q:Math.max(A.q,B.q),until:now+60000}; toast('開始榨果汁');
    } else if(act==='jam'&&A&&A.n>=3&&!S.job){
      S.inv[A.id][A.q]-=3;
      S.job={t:'jam',v:Math.round(A.st.base*QMULT[A.q]*3*1.15),q:A.q,until:now+120000}; toast('開始熬果醬');
    }
    fixLab();
  }
  else if(act==='collect'){ if(S.job&&now>=S.job.until){ S.goods.push({t:S.job.t,v:S.job.v,q:S.job.q}); toast(GOODS[S.job.t].name+'做好了，到市場賣'); S.job=null; } }
  else if(act==='sellgoods'){ var gv=goodsValue(); if(gv){ S.goods=[]; addCoins(gv); toast('賣出加工品，進帳 '+gv+' 金幣'); } }
  else if(act==='music'){ toggleMusic(); }
  else if(act==='signout'){ logout(); }
  else if(act==='syncnow'){ cloudMsg='同步中…'; lastCloud=0; cloudSave(true); }
  else if(act==='relogin'){ closePanel(); gateShow('login'); }
  else if(act==='go'){ showTab(id); }
  else if(act==='back'){ showTab('upg'); }
  else if(act==='set'){ SET[id]=!SET[id]; saveSet(); if(id==='music') setMusic(SET.music); updateLabels(); }
  else if(act==='fradd'){ addFriendByName(); }
  else if(act==='fradd2'){ addFriendId(id); }
  else if(act==='frvisit'||act==='visit'){ visitFarm(id); }
  else if(act==='leave'){ setScene('town',true); }
  else if(act==='msgpost'){ postMsg(); }
  else if(act==='giftto'){ GIFT.to=id||null; showTab('gift'); }
  else if(act==='sendgift'){ var gp=id.split(':'); sendGift(gp[0],gp[1]||null,+gp[2],+gp[3]); }
  else if(act==='mailall'){ claimMail(null); }
  else if(act==='mail1'){ claimMail(+id); }
  else if(act==='coopgo'){ COOPSEL=+id; showTab('coopPick'); }
  else if(act==='coopacc'){ var cp=id.split(':'); coopAccept(cp[0],+cp[1]); }
  else if(act==='coopno'){ opRun('coop_cancel',{p_id:+id},function(){ toast('已取消'); loadMail(); }); }
  else if(act==='coopinv'){ var A0=labStack(labA); if(A0) opRun('coop_start',{p_b:id,p_strain:A0.id,p_q:A0.q},function(){ toast('邀請送出了，等他回覆'); fixLab(); }); }
  else if(act==='rankby'){ RANKBY=id; }
  else if(act==='push'){ togglePush(); }
  else if(act==='adsend'){ adminSend(); }
  else if(act==='adban'){ var bp0=(ADM.players||[]).filter(function(x){return x.id===id;})[0]; sb.rpc('admin_ban',{p_user:id,p_ban:!(bp0&&bp0.banned)}).then(function(){ loadAdmin(); },function(){}); }
  else if(act==='adreset'){ if(ADM.resetArm!==id) ADM.resetArm=id; else { ADM.resetArm=null; sb.rpc('admin_set_save',{p_user:id,p_data:fresh()}).then(function(r){ toast(r.error?'重置失敗':'已重置'); loadAdmin(); if(user&&id===user.id) onSignedIn(); },function(){}); } }
  else if(act==='adbackup'){ sb.rpc('admin_backup_now').then(function(r){ toast(r.error?'備份失敗':'備份好了'); loadAdmin(); },function(){}); }
  else if(act==='addl'){ downloadBackup(+id); }
  else if(act==='frdel'){ if(frDelArm!==id) frDelArm=id; else { frDelArm=null; removeFriend(id); } }
  else if(act==='setname'){
    var nm=(($('au_name')||{}).value||'').trim();
    if(nm.length<2||nm.length>12){ authMsg='名稱要 2 到 12 個字'; }
    else if(sb&&user){ authMsg='儲存中…';
      sb.from('profiles').update({name:nm}).eq('id',user.id).then(function(r){
        if(r.error) authMsg=/duplicate|unique/i.test(r.error.message)?'這個名字已經有人用了':authErr(r.error.message);
        else { S.name=nm; authMsg=''; toast('名字改成「'+nm+'」'); cloudSave(true); loadWorld(true); }
        hud(); refreshPanel();
      },function(e){ authMsg=authErr(e&&e.message); refreshPanel(); }); }
  }
  else if(act==='buylot'){
    var b1=curLot;
    if(b1&&b1.type==='sale'&&!S.land[b1.n]&&b1.n!==S.home&&!WORLD.lots[b1.n]&&S.coins>=b1.price){
      toast('辦理過戶中…');
      opRun('buy_lot',{p_lot:b1.n},function(){ WORLD.lots[b1.n]={owner:user.id,kind:'buy'}; logAdd('買下「'+b1.name+'」（'+nf(b1.price)+' 金幣）'); sfx('coin'); toast('買下「'+b1.name+'」了，可以蓋東西'); });
    }
  }
  else if(act==='build'){
    var b2=curLot, o2=b2&&S.land[b2.n], d2=BUILDINGS.filter(function(x){return x.id===id;})[0];
    if(o2&&!o2.b&&d2&&S.coins>=d2.per*b2.sw*b2.sh){ S.coins-=d2.per*b2.sw*b2.sh; o2.b=id; o2.t=now; toast(d2.name+'蓋好了'); }
  }
  else if(act==='collect2'){
    var b3=curLot, o3=b3&&S.land[b3.n], y3=o3?landYield(b3,o3,now):0;
    if(y3>0){
      if(o3.b==='inn'){ addCoins(y3); toast('收到租金 '+y3+' 金幣'); }
      else { var bp=STRAINS.filter(function(x){return isBase(x)&&S.lvl>=x.lvl;}); for(var yi=0;yi<y3;yi++){ var ys=bp[Math.floor(Math.random()*bp.length)], yq=rollQ(0.45); S.inv[ys.id][yq]++; S.dex[ys.id+yq]=1; } toast('從溫室收了 '+y3+' 株作物'); }
      o3.t=now;
    }
  }
  else if(act==='cast'){
    fishReset(); fish.st='wait';
    fish.t1=setTimeout(function(){ fish.st='bite'; refreshPanel(); fish.t2=setTimeout(function(){ if(fish.st==='bite'){ fish.st='idle'; fish.msg='太慢了，魚跑掉了。'; refreshPanel(); } },1200); },1500+Math.random()*3500);
  }
  else if(act==='pull'){
    if(fish.st==='bite'){
      var fr=Math.random()*100, fi=0; while(fi<FISH.length-1&&fr>=FISH[fi].w){ fr-=FISH[fi].w; fi++; }
      fishReset(); give(FISH[fi].id); S.stats.fish++; fish.msg='釣到一條「'+IMAP[FISH[fi].id].name+'」（'+RAR[IMAP[FISH[fi].id].rar].n+'）。';
    } else { fishReset(); fish.msg='太早了，魚被嚇跑了。'; }
  }
  else if(act==='centry'){
    var ew=week(now), es=contestStrain(ew), eq=+id, ec=S.contest;
    if(ec&&ec.week<ew&&!ec.claimed){ toast('先看上週的名次，領完獎再參加'); }
    else if(S.inv[es.id][eq]>0&&(!ec||ec.week!==ew||eq>ec.q)){ S.inv[es.id][eq]--; S.contest={week:ew,q:eq}; if(sb&&user) sb.rpc('contest_record',{p_strain:es.id,p_q:eq}).then(function(){ loadRank(); },function(){}); toast('交出一株'+RAR[eq].n+'品質的「'+es.name+'」'); }
  }
  else if(act==='cclaim'){
    var lc=S.contest;
    if(lc&&lc.week<week(now)&&!lc.claimed){
      var rk=rankOf(lc.week,lc.q), rw=CONTEST_REWARD[Math.min(rk,4)-1], all=npcEntries(lc.week).concat([{name:'你',q:lc.q,me:1}]);
      all.sort(function(x,y){ return y.q-x.q||(y.me?1:0)-(x.me?1:0); });
      lc.claimed=1; S.rep+=rw.rep; addCoins(rw.coins);
      modal('cup','你得到第 '+rk+' 名',all.map(function(e,i){ return (i+1)+'. '+e.name+'：'+RAR[e.q].n; }).concat(['聲望 +'+rw.rep+'，金幣 +'+rw.coins]),[['收下']]);
    }
  }
  else if(act==='repbuy'){
    var rb=REPSHOP.filter(function(x){return x.id===id;})[0];
    if(rb&&S.rep>=rb.cost&&!(id==='wizard'&&S.wardrobe.wizard)&&!(id==='trophy'&&S.decor.trophy)){
      S.rep-=rb.cost;
      if(id==='charm'){ S.charm+=5; toast('換到幸運符 5 次'); }
      else if(id==='wizard'){ S.wardrobe.wizard=1; toast('換到巫師帽，到服飾店換上'); }
      else if(id==='trophy'){ S.decor.trophy=1; toast('冠軍獎盃擺到農場了'); }
      else { var gg=STRAINS.filter(function(x){return x.gen===(id==='seed1'?1:2)&&!x.coop;}), gx=gg[Math.floor(Math.random()*gg.length)]; S.seeds[gx.id]=(S.seeds[gx.id]||0)+1; S.known[gx.id]=1; toast('換到「'+gx.name+'」種子'); }
    }
  }
  else if(act==='story'){
    var SL=curLot, sg=SL?(S.story[SL.npc]||0):0, sd=SL&&STORIES[SL.npc]?STORIES[SL.npc][sg]:null;
    if(sd&&(S.favor[SL.npc]||0)>=(sg+1)*3){
      var gl=['聲望 +'+sd.rep]; S.story[SL.npc]=sg+1; S.rep+=sd.rep;
      if(sd.hint){ S.hint[sd.hint]=1; var hr=RECIPES.filter(function(r){return r.out===sd.hint;})[0]; gl.push('配方線索：'+SMAP[hr.a].name+' × '+SMAP[hr.b].name); }
      if(sd.item){ give(sd.item,sd.n); gl.push(IMAP[sd.item].name+' ×'+sd.n); }
      if(sd.charm){ S.charm+=sd.charm; gl.push('幸運符 ×'+sd.charm); }
      if(sd.seed){ S.seeds[sd.seed]=(S.seeds[sd.seed]||0)+sd.n; S.known[sd.seed]=1; gl.push('「'+SMAP[sd.seed].name+'」種子 ×'+sd.n); }
      modal(SL.npc==='隔壁阿嬤'?'granny':(SL.npc==='警察杯杯'?'police':(SL.npc==='外星觀光客'?'ufo':'star')),SL.npc,[sd.t].concat(gl),[['謝謝']]);
    }
  }
  else if(act==='buydecor'){
    var dc=DECOR.filter(function(x){return x.id===id;})[0];
    if(dc&&!S.decor[id]&&S.coins>=dc.cost){ S.coins-=dc.cost; S.decor[id]=1; toast('「'+dc.name+'」擺到農場了，回去看看'); }
  }
  else if(act==='wear'){
    var wk=id.split(':'), wl=(wk[0]==='hat'?HATS:SHIRTS).filter(function(x){return x.id===wk[1];})[0];
    if(wl){
      if(!S.wardrobe[wl.id]){ if(S.coins<wl.cost) return; S.coins-=wl.cost; S.wardrobe[wl.id]=1; }
      S.look[wk[0]]=wl.id; syncLook(); toast('換上「'+wl.name+'」');
    }
  }
  else if(act==='trip'){
    var tk=id.split(':'), to=S.pets[tk[0]];
    if(to&&!to.trip){ to.trip={until:now+TRIPS[+tk[1]].ms,rolls:TRIPS[+tk[1]].rolls}; toast('「'+PMAP[tk[0]].name+'」出發探險了'); }
  }
  else if(act==='tripback'){
    var bo=S.pets[id];
    if(bo&&bo.trip&&now>=bo.trip.until){ var loot=tripLoot(id,bo.trip.rolls); bo.trip=null; bo.aff++; logAdd('「'+PMAP[id].name+'」探險回來：'+loot.slice(0,3).join('、')); modal('star','「'+PMAP[id].name+'」回來了',loot,[['收下']]); }
  }
  else if(act==='buyland'){
    var li=-1; S.plots.forEach(function(p,k){ if(li<0&&!p.u) li=k; });
    if(li>=0&&S.coins>=PLOT_COST[li]){ S.coins-=PLOT_COST[li]; S.plots[li].u=true; toast('新的一塊地到手，回農場看看'); }
  }
  else if(act==='reset'){
    if(!resetArm){ resetArm=true; }
    else {
      var keep={home:S.home,name:S.name,gender:S.gender,owner:S.owner,rev:S.rev};
      if(sb&&user) sb.from('lots').delete().eq('owner',user.id).eq('kind','buy').then(function(){ loadWorld(true); },function(){});
      Store.clear(); S=fresh(); normalize(); for(var kk in keep) if(keep[kk]) S[kk]=keep[kk];
      resetArm=false; syncLook(); toast('進度已重置'); cloudSave(true);
    }
  }
  if(act!=='reset') resetArm=false;
  sfx(S.coins>c0?'coin':'tap');
  checkAch(); hud(); refreshPanel(); Store.save(S);
});
$('plist').addEventListener('input',function(e){
  var t=e.target; if(t.id==='set_mvol') SET.mvol=t.value/100; else if(t.id==='set_svol') SET.svol=t.value/100; else return;
  applyVol(); saveSet();
});
$('plist').addEventListener('change',function(e){ if(e.target.id==='set_svol') sfx('coin'); });
$('tabs').addEventListener('click',function(e){ var b=e.target.closest('button[data-tab]'); if(b) openTab(b.dataset.tab); });
$('go').addEventListener('click',function(){ if(scene==='visit') setScene('town',true); else setScene(scene==='farm'?'town':'farm'); });
$('pclose').addEventListener('click',closePanel);

/* ---------- 事件 ---------- */
var modalOpen=false, mctx=$('mart').getContext('2d');
function modal(art,title,lines,btns){
  modalOpen=true; closePicker(); $('modal').classList.add('open');
  var a=$('mart'); mctx.clearRect(0,0,12,10); bmp(mctx,BMP[art],0,0); a.style.width='96px'; a.style.height='80px';
  $('mtitle').textContent=title;
  $('mbody').innerHTML=lines.map(function(l){return '<p>'+l+'</p>';}).join('');
  var box=$('mbtns'); box.innerHTML='';
  btns.forEach(function(b,i){
    var el=document.createElement('button'); el.type='button'; el.className='btn'+(i?' alt':''); el.textContent=b[0];
    el.addEventListener('click',function(){ sfx('tap'); closeModal(); if(b[1]) b[1](); checkAch(); hud(); refreshPanel(); Store.save(S); });
    box.appendChild(el);
  });
}
function closeModal(){ modalOpen=false; $('modal').classList.remove('open'); }
function planted(){ var a=[]; S.plots.forEach(function(p,i){ if(p.crop) a.push(i); }); return a; }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
var EVENTS={
  police:function(){
    var fee=Math.min(S.coins,Math.max(10,Math.round(S.coins*0.05))), chance=Math.min(0.9,0.5+petBonus('dog'));
    modal('police','警察杯杯來巡邏',['「你這種的是什麼？聞起來怪怪的。」'],[
      ['「這是九層塔啦」（成功率 '+Math.round(chance*100)+'%）',function(){
        if(Math.random()<chance){ S.stats.bluff++; var x=10*S.lvl; addXp(x); give('whistle');
          modal('police','過關',['「九層塔炒蛋不錯喔，加油。」','經驗 +'+x+'，他還把哨子忘在你這。'],[['呼']]); }
        else { var fine=Math.round(S.coins*0.15), ps=planted(), lost='';
          if(ps.length){ var p=S.plots[pick(ps)]; lost='，還被拔走一株「'+SMAP[p.crop].name+'」'; p.crop=null; p.prog=0; }
          S.coins-=fine; logAdd('警察巡邏：罰款 '+nf(fine)+' 金幣'+lost); modal('police','被識破了',['「九層塔哪有長這樣。」','罰款 '+fine+' 金幣'+lost],[['下次會更小心']]); }
      }],
      ['請他喝珍奶（-'+fee+' 金幣）',function(){ S.coins-=fee; toast('警察杯杯喝著珍奶走了'); }]
    ]);
  },
  ufo:function(){
    var p=S.plots[pick(planted())], s=SMAP[p.crop], pay=s.base*3;
    p.crop=null; p.prog=0; S.stats.ufo++; addCoins(pay); give('meteor'); logAdd('幽浮吸走「'+s.name+'」，留下 '+nf(pay)+' 金幣和一顆隕石');
    modal('ufo','幽浮路過',['一道光把你的「'+s.name+'」吸走了。','外星人很有禮貌，留下 '+pay+' 金幣和一顆外星隕石。'],[['謝謝惠顧']]);
  },
  cat:function(){
    var pay=5+Math.floor(Math.random()*10*S.lvl);
    modal('cat','流浪貓來討摸',['牠在你的田邊躺下，露出肚子。'],[
      ['摸摸牠',function(){ S.stats.cat++; addCoins(pay); var hb=Math.random()<0.4; if(hb) give('hairball');
        toast(S.stats.cat>=3&&!S.pets.cat?'牠好像想跟你回家，到「寵物」看看':'貓咪叼來 '+pay+' 金幣'+(hb?'和一顆毛球':'')); }],
      ['假裝沒看到']
    ]);
  },
  granny:function(){
    var held=STRAINS.filter(function(s){return invCount(s.id)>0;});
    give('pickle');
    if(!held.length){ var gift=20+10*S.lvl; addCoins(gift);
      modal('granny','隔壁阿嬤來串門子',['「少年欸，種菜辛苦齁。」','阿嬤塞了 '+gift+' 金幣紅包和一罐醃菜給你。'],[['謝謝阿嬤']]); return; }
    var s=held[0], n=invCount(s.id), pay=Math.round(S.inv[s.id].reduce(function(a,c,q){return a+c*s.base*2*QMULT[q];},0));
    modal('granny','隔壁阿嬤來買菜',['「你這地瓜葉看起來很嫩，我全包了。」','「'+s.name+'」 ×'+n+'，阿嬤出 '+pay+' 金幣（行情兩倍），還送你一罐醃菜。'],[
      ['賣給阿嬤',function(){ S.inv[s.id]=[0,0,0,0,0,0]; addCoins(pay); logAdd('阿嬤買走「'+s.name+'」×'+n+'，收 '+nf(pay)+' 金幣'); toast('阿嬤開心地提著菜回家'); }],
      ['「阿嬤這個不能炒啦」']
    ]);
  },
  merchant:function(){
    var cost=60+40*S.lvl;
    modal('merchant','流浪商人路過',['「幸運符要不要？接下來 5 次收成，品質運氣大增。」','他看起來隨時會走。'],[
      ['買一張（-'+cost+' 金幣）',function(){ if(S.coins<cost){ toast('金幣不夠，商人聳聳肩走了'); return; } S.coins-=cost; S.charm+=5; toast('買了幸運符，接下來 5 次收成有效'); }],
      ['下次再說']
    ]);
  }
};
BMP.merchant={rows:['....hhhh....','...hhhhhh...','..hhssssshh.','..hsksskshh.','..hssssssh..','.hhhhhhhhhh.','.hhyhhhhyhh.','.hhhhhhhhhh.','..hh....hh..'],pal:{h:'#5e4a82',s:'#f2c9a0',k:'#2a2148',y:'#f5c451'}};
function welcome(away){
  if(modalOpen||away<300000) return;
  var now=Date.now(), ripe=0, dry=[], lines=['你離開了 '+fmt(away/1000)+'。'];
  S.plots.forEach(function(p){ if(!p.crop) return; if(isRipe(p)) ripe++; else if(now>=p.water) dry.push(p); });
  if(dry.length&&away>600000&&Math.random()<0.35){ dry.forEach(function(p){ p.water=now+waterSpan(SMAP[p.crop]); }); lines.push('剛剛下了一場雨，'+dry.length+' 株作物都澆好了。'); dry=[]; }
  if(ripe) lines.push(ripe+' 株作物成熟了，可以收成。');
  if(dry.length) lines.push(dry.length+' 株作物在等你澆水。');
  if(S.tasks.length) lines.push('公告欄上有 '+S.tasks.length+' 個限時任務。');
  if(lines.length>1) modal('star','歡迎回來',lines,[['開工']]);
}
var nextEvent=Date.now()+2400000+Math.random()*1200000;
function maybeEvent(now){
  if(modalOpen||tab||gateOn()||scene==='visit'||now<nextEvent) return;
  nextEvent=now+4800000+Math.random()*4200000;
  var pool=['cat','cat','cat','cat','cat','granny','granny','granny','granny','merchant','merchant','merchant'];
  if(planted().length){ pool.push('police','police','police','police','police','ufo','ufo','ufo'); }
  EVENTS[pick(pool)]();
}

/* ---------- Lofi 背景音樂（即時合成，不需要音檔） ---------- */
var AC=null, musicOn=false, beat=0, nextBeat=0, master=null, mTimer=0;
var CHORDS=[[174.6,220,261.6,329.6],[164.8,196,246.9,293.7],[146.8,174.6,220,261.6],[130.8,164.8,196,246.9]];
function tone(f,t,d,g,type){ var o=AC.createOscillator(), a=AC.createGain(); o.type=type||'triangle'; o.frequency.value=f;
  a.gain.setValueAtTime(0,t); a.gain.linearRampToValueAtTime(g,t+0.08); a.gain.linearRampToValueAtTime(0,t+d); o.connect(a); a.connect(master); o.start(t); o.stop(t+d+0.05); }
function noise(t,d,g){ var n=AC.sampleRate*d, buf=AC.createBuffer(1,n,AC.sampleRate), ch=buf.getChannelData(0);
  for(var i=0;i<n;i++) ch[i]=(Math.random()*2-1)*(1-i/n); var s=AC.createBufferSource(), a=AC.createGain(); s.buffer=buf; a.gain.value=g; s.connect(a); a.connect(master); s.start(t); }
function kick(t){ var o=AC.createOscillator(), a=AC.createGain(); o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(40,t+0.15);
  a.gain.setValueAtTime(0.5,t); a.gain.exponentialRampToValueAtTime(0.001,t+0.25); o.connect(a); a.connect(master); o.start(t); o.stop(t+0.3); }
function schedule(){
  var spb=60/74/2;
  while(nextBeat<AC.currentTime+0.4){
    var b=beat%8, bar=Math.floor(beat/8)%4;
    if(b===0) CHORDS[bar].forEach(function(f){ tone(f,nextBeat,spb*8,0.045); });
    if(b===0||b===5) kick(nextBeat);
    if(b===2||b===6) noise(nextBeat,0.12,0.09);
    if(b%2===1) noise(nextBeat+(b%4===3?0.03:0),0.03,0.035);
    if(b===3||b===7) tone(CHORDS[bar][(beat>>1)%4]*2,nextBeat,spb*1.6,0.03,'sine');
    nextBeat+=spb; beat++;
  }
}
var sfxBus=null;
function applyVol(){ if(master) master.gain.value=0.9*SET.mvol; if(sfxBus) sfxBus.gain.value=SET.svol; }
function ensureAudio(){
  if(AC) return true;
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    var lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1100;
    master=AC.createGain(); master.connect(lp); lp.connect(AC.destination);
    sfxBus=AC.createGain(); sfxBus.connect(AC.destination); applyVol(); return true;
  }catch(e){ AC=null; return false; }
}
function setMusic(on){
  if(on===musicOn) return;
  if(on&&!ensureAudio()){ toast('這個瀏覽器無法播放音樂'); return; }
  musicOn=on;
  if(on){ AC.resume(); nextBeat=AC.currentTime+0.1; beat=0; mTimer=setInterval(schedule,120); }
  else clearInterval(mTimer);
}
function toggleMusic(){ SET.music=!musicOn; saveSet(); setMusic(SET.music); }
function blip(f,d,g,type,when,slide){
  var t=AC.currentTime+(when||0), o=AC.createOscillator(), a=AC.createGain();
  o.type=type||'square'; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(slide,t+d);
  a.gain.setValueAtTime(g,t); a.gain.exponentialRampToValueAtTime(0.0008,t+d); o.connect(a); a.connect(sfxBus); o.start(t); o.stop(t+d+0.02);
}
function sfx(k,q){
  if(!SET.sfx||!ensureAudio()) return;
  try{
    if(AC.state!=='running') AC.resume();
    if(k==='tap') blip(660,0.05,0.04,'square');
    else if(k==='open') blip(440,0.07,0.04,'triangle',0,660);
    else if(k==='plant') blip(220,0.14,0.12,'triangle',0,110);
    else if(k==='water'){ blip(900,0.09,0.05,'sine',0,500); blip(700,0.09,0.04,'sine',0.06,400); }
    else if(k==='harvest'){ var nt=[523,659,784,1047,1319,1568]; for(var i=0;i<=Math.min(5,1+(q||0));i++) blip(nt[i],0.12,0.06,'square',i*0.07); }
    else if(k==='coin'){ blip(988,0.07,0.05,'square'); blip(1319,0.14,0.05,'square',0.07); }
    else if(k==='err') blip(150,0.16,0.07,'sawtooth',0,110);
  }catch(e){}
}
document.addEventListener('click',function(){ if(SET.music&&!musicOn) setMusic(true); },true);

/* ---------- 主迴圈 ---------- */
function resize(){
  var st=$('stage'), w=st.clientWidth, h=st.clientHeight, sc=Math.min(w/W,h/H);
  cv.style.width=Math.floor(W*sc)+'px'; cv.style.height=Math.floor(H*sc)+'px';
}
window.addEventListener('resize',function(){ resize(); updateLabels(); }); resize();
var lastDraw=0;
function frame(t){ if(t-lastDraw>(scene==='town'?15:60)){ if(scene==='town') townStep(Math.min(0.2,(t-lastDraw)/1000)); lastDraw=t; draw(t); drawPetBig(t); } requestAnimationFrame(frame); }
requestAnimationFrame(frame);
var ticks=0, lastWx='';
function tick(){
  var now=Date.now();
  S.plots.forEach(function(p){ grow(p,now); });
  var wxn=weather(now);
  if(wxn.id==='rain') S.plots.forEach(function(p){ if(p.crop) p.water=Math.max(p.water,now+90000); });
  var evs=activeEvents(now);
  var wxh=scene==='visit'&&VISIT?'<b>參觀中</b><small>'+esc(VISIT.name)+'</small>':'<b>'+SEASONS[season(now)]+'・'+wxn.n+'</b><small>'+(evs.length?'<i></i>'+esc(evs[0].name):esc(wxn.d))+'</small>';
  if(wxh!==lastWx){ $('wx').innerHTML=wxh; lastWx=wxh; }
  var broke=S.coins<STRAINS[0].cost&&!planted().length&&!STRAINS.some(function(s){return invCount(s.id)>0||S.seeds[s.id]>0;});
  tasksTick(now); S.seenAt=now;
  if(broke){ S.coins+=10; toast('阿嬤看你可憐，塞了 10 金幣給你'); }
  checkAch(); hud(); if(tab==='market'||tab==='pets'||tab==='ach'||(tab==='lab'&&S.job)) refreshPanel(); maybeEvent(now);
  if(++ticks%5===0) Store.save(S);
  if(ticks%60===0) cloudSave(false);
  if(user&&ticks%300===0) heartbeat();
  if(user&&scene==='town'&&ticks%120===0) loadWorld();
  if(user&&ticks%90===0) loadMail();
  vTick(now);
}
var hiddenAt=0; bootAway=S.seenAt?Date.now()-S.seenAt:0;
setInterval(tick,1000); tick(); boot();
document.addEventListener('visibilitychange',function(){ if(document.hidden){ hiddenAt=Date.now(); Store.save(S); cloudSave(true); } else { tick(); if(hiddenAt&&!gateOn()) welcome(Date.now()-hiddenAt); } });
})();
