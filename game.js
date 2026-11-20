(function(){
'use strict';

/* ---------- 遊戲資料（品種皆為虛構） ---------- */

/* 配種表：兩個親代配出新品種，ch 是基礎成功率，親代品質每一級再 +4% */

/* 天氣每 30 分鐘換一次、季節每 3 天換一次，都由時間決定，之後所有玩家會看到同樣的天氣 */

function weather(now){ var r=rnd(Math.floor(now/1800000)*17+3); return WX[r<0.45?0:(r<0.67?1:(r<0.82?2:(r<0.95?3:4)))]; }

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
var SAVE_KEY='lazyleaf-save-v1';
var Store={
  load:function(){ try{ var r=localStorage.getItem(SAVE_KEY); return r?JSON.parse(r):null; }catch(e){ return null; } },
  save:function(s){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(s)); }catch(e){} },
  clear:function(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
};
function fresh(){
  var plots=[]; for(var i=0;i<9;i++) plots.push({u:i<3,crop:null,prog:0,last:0,water:0});
  return {v:1,coins:30,xp:0,lvl:1,seed:'lazy',plots:plots,inv:{},
    upg:{fert:0,sprinkler:0,speaker:0,dog:0},
    stats:{harvest:0,earned:0,bluff:0,cat:0,ufo:0,gold:0},ach:{},items:{},pets:{}};
}
var S=Store.load();
if(!S||S.v!==1||!S.plots||S.plots.length!==9) S=fresh();
function normalize(){
  S.items=S.items||{}; S.pets=S.pets||{}; S.sat=S.sat||{}; S.dex=S.dex||{}; S.tasks=S.tasks||[]; S.charm=S.charm||0;
  if(!S.nextTask) S.nextTask=Date.now()+60000;
  S.stats.tasks=S.stats.tasks||0; S.stats.best=S.stats.best||0;
  S.rep=S.rep||0; S.contest=S.contest||null; S.story=S.story||{}; S.hint=S.hint||{};
  S.decor=S.decor||{}; S.look=S.look||{hat:'straw',shirt:'red'}; S.wardrobe=S.wardrobe||{straw:1,none:1,red:1}; S.dexInfo=S.dexInfo||{};
  S.seeds=S.seeds||{}; S.known=S.known||{}; S.goods=S.goods||[]; S.favor=S.favor||{}; S.job=S.job||null;
  if(S.upg.dog){ S.pets.dog=S.pets.dog||{aff:0,last:0}; S.upg.dog=0; }
  STRAINS.forEach(function(st){ var v=S.inv[st.id]; if(!Array.isArray(v)){ S.inv[st.id]=[v||0,0,0,0,0,0]; if(v) S.dex[st.id+'0']=1; } });
  if(!SMAP[S.seed]) S.seed='lazy';
}
normalize();
function hearts(id){ return S.pets[id]?Math.min(5,Math.floor(S.pets[id].aff/4)):0; }
function petBonus(id){ return S.pets[id]&&!S.pets[id].trip?PMAP[id].base*(1+0.1*hearts(id)):0; }
function give(id,n){ S.items[id]=(S.items[id]||0)+(n||1); }

/* ---------- 規則 ---------- */
function rnd(n){ var x=Math.sin(n*12.9898)*43758.5453; return x-Math.floor(x); }
function price(s,now){
  var bucket=Math.floor(now/60000);
  var mult=0.7+0.8*rnd(bucket*31+s.idx*7+1);
  return Math.max(1,Math.round(s.base*mult*(1+0.1*S.upg.speaker)*(inSeason(s,now)?1.15:1)*(1+0.01*charmPts())));
}
function charmPts(){ return DECOR.reduce(function(a,x){ return a+(S.decor[x.id]?x.charm:0); },0); }
function week(now){ return Math.floor(now/604800000); }
function contestStrain(w){ var b=STRAINS.filter(function(x){return !x.gen;}); return b[Math.floor(rnd(w*5+2)*b.length)]; }
function npcEntries(w){ return NPCS.map(function(n,i){ return {name:n,q:Math.min(5,Math.floor(Math.pow(rnd(w*13+i*7+1),2.2)*5.3))}; }); }
function rankOf(w,q){ return 1+npcEntries(w).filter(function(e){return e.q>q;}).length; }
function xpNeed(l){ return Math.round(12*Math.pow(l,1.8)); }
function speed(){ return (1+0.25*S.upg.fert)*(1+petBonus('alien')); }
function waterSpan(s){ return (has(s,'thirsty')?Math.max(30,s.time*0.34):Math.max(45,s.time*0.5))*1000; }
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
  var L=0.4*care+0.08*S.upg.fert+petBonus('cat')+(p.rot||0)+(S.charm>0?0.25:0);
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
    toast('升到 LV '+S.lvl+(un?'，解鎖新品種「'+un.name+'」':''));
  }
}
function checkAch(){
  ACH.forEach(function(a){
    if(!S.ach[a.id]&&a.ok(S)){ S.ach[a.id]=1; addCoins(a.reward); toast('達成成就「'+a.name+'」 +'+a.reward+' 金幣'); }
  });
}
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
function hud(){
  $('coins').textContent=S.coins.toLocaleString('en-US');
  $('lvl').textContent='LV '+S.lvl;
  $('xpfill').style.width=Math.min(100,S.xp/xpNeed(S.lvl)*100)+'%';
  var s=SMAP[S.seed]; $('seedname').textContent=s.name+(s.gen?' ×'+(S.seeds[s.id]||0):' '+s.cost); $('seedsw').style.background=s.color;
  document.querySelector('#tabs [data-tab=ach]').textContent=S.tasks.length?'任務 '+S.tasks.length:'任務';
  $('go').textContent=scene==='farm'?'去小鎮':'回農場';
  $('repl').textContent='金幣・聲望 '+S.rep;
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
var ICON={};
STRAINS.forEach(function(s){ ICON[s.id]=icon({rows:BUD,pal:{c:s.color,d:shade(s.color,0.7),g:'#6fbf5f',w:'#ffffff',s:'#3f8f4a'}}); });
ITEMS.forEach(function(it){ ICON[it.id]=icon(BMP[it.id]); });
PETS.forEach(function(p){ ICON['pet_'+p.id]=icon(BMP[p.id]); });
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
  px(6,28,30,22,'#7a4a52'); var rc=S.decor.goldroof?'#f5c451':'#b8566a'; px(4,24,34,5,rc); px(8,20,26,4,rc); px(12,17,18,3,rc);
  px(17,37,8,13,'#3a2433'); px(27,33,6,6,Math.floor(t/1500)%7?'#ffd98a':'#f5c451');
  person(42,36+(Math.floor(t/600)%2),0,1,ME);
  drawDecor(t);
  // 圍籬上的貓
  var cx0=((t/110)%520)-20; if(cx0<170) bmp(ctx,BMP.cat,Math.round(cx0),41+(Math.floor(t/300)%2));
  // 自己養的寵物在田邊散步
  var pi=0;
  PETS.forEach(function(pt){
    if(!S.pets[pt.id]||S.pets[pt.id].trip) return;
    var b=BMP[pt.id], wd=b.rows[0].length, span=W-wd-8, ph=(t/pt.pace+pi*97)%(span*2), right=ph<span, xx=right?ph:span*2-ph;
    bmp(ctx,b,4+Math.round(xx),61-b.rows.length-((pt.hop&&Math.floor(t/250+pi)%2)?1:0),right!==pt.faceRight);
    pi++;
  });
  // 田地
  var firstLocked=-1; for(i=0;i<9;i++) if(!S.plots[i].u){ firstLocked=i; break; }
  for(i=0;i<9;i++){
    var p=S.plots[i], r=plotRect(i);
    if(!p.u){
      px(r.x,r.y,r.w,r.h,'#3c5c48'); px(r.x+2,r.y+2,r.w-4,r.h-4,'#456a52');
      px(r.x+18,r.y+12,8,7,'#2a2148'); px(r.x+19,r.y+8,6,5,'#2a2148'); px(r.x+21,r.y+10,2,3,'#456a52');
      if(i===firstLocked){
        ctx.font='8px "Press Start 2P"'; ctx.textAlign='center'; ctx.textBaseline='top';
        ctx.fillStyle=S.coins>=PLOT_COST[i]?'#f5c451':'#b9a8cf'; ctx.fillText(String(PLOT_COST[i]),r.x+22,r.y+24);
      }
      continue;
    }
    var wet=p.crop&&now<p.water;
    px(r.x,r.y,r.w,r.h,'#3b2a2a'); px(r.x+2,r.y+2,r.w-4,r.h-4,wet?'#5a3d33':'#7a5644');
    for(var fyy=r.y+7;fyy<r.y+r.h-6;fyy+=8) px(r.x+4,fyy,r.w-8,1,wet?'#4a3029':'#69483a');
    if(!p.crop&&p.prev){
      var ax=r.x+35, ay=r.y+4;
      if(p.prev===S.seed){ px(ax+2,ay,1,3,'#ef7a8a'); px(ax,ay+3,5,1,'#ef7a8a'); px(ax+1,ay+4,3,1,'#ef7a8a'); px(ax+2,ay+5,1,1,'#ef7a8a'); }
      else { px(ax+2,ay,1,1,'#8fd67a'); px(ax+1,ay+1,3,1,'#8fd67a'); px(ax,ay+2,5,1,'#8fd67a'); px(ax+2,ay+3,1,3,'#8fd67a'); }
    }
    if(p.crop){
      var s=SMAP[p.crop], frac=Math.min(1,p.prog/s.time), ripe=frac>=1, stage=ripe?4:Math.floor(frac*4);
      drawPlant(r.x+22,r.y+33,stage,s,t,i);
      px(r.x+4,r.y+36,36,2,'#2a1f1f'); px(r.x+4,r.y+36,Math.round(36*frac),2,s.color);
      if(ripe){ var bb=Math.floor(t/250)%2; px(r.x+35,r.y+3+bb,5,5,'#f5c451'); px(r.x+37,r.y+4+bb,1,2,'#2a2148'); px(r.x+37,r.y+6+bb,1,1,'#f5c451'); px(r.x+37,r.y+7+bb,1,1,'#2a2148'); px(r.x+37,r.y+6+bb,1,1,'#f5c451'); }
      else if(!wet&&Math.floor(t/400)%2){ px(r.x+37,r.y+3,1,1,'#7fd8f0'); px(r.x+36,r.y+4,3,1,'#7fd8f0'); px(r.x+35,r.y+5,5,3,'#7fd8f0'); px(r.x+36,r.y+8,3,1,'#7fd8f0'); px(r.x+36,r.y+6,1,1,'#eafaff'); }
    }
  }
  var wv=weather(now).id;
  if(wv==='rain'){ for(i=0;i<46;i++){ var rx=(i*41+Math.floor(t/30)*3)%W, ry=(i*67+Math.floor(t/30)*9)%H; px(rx,ry,1,3,'#9fd0f0'); } }
  else if(wv==='heat'){ ctx.fillStyle='rgba(255,170,90,.13)'; ctx.fillRect(0,0,W,H); for(i=0;i<5;i++) px(118+Math.round(Math.cos(i*1.3+t/900)*15),40+Math.round(Math.sin(i*1.3+t/900)*-9),2,2,'#ffd9a0'); }
  else if(wv==='fog'){ ctx.fillStyle='rgba(230,224,240,.22)'; for(i=0;i<5;i++) ctx.fillRect(((t/90+i*70)%260)-60,56+i*30,90,10); }
  else if(wv==='bow'){ var bc=['#ef7a8a','#f5c451','#8fd67a','#7fd8f0','#b48cf2']; for(i=0;i<5;i++) for(var a=0;a<60;a++){ var an=Math.PI*a/59, bx=60+Math.round(Math.cos(an)*(46-i)), by=50-Math.round(Math.sin(an)*(34-i)); if(by<47) px(bx,by,1,1,bc[i]); } }
  for(i=sparks.length-1;i>=0;i--){
    var sp=sparks[i]; sp.x+=sp.vx; sp.y+=sp.vy; sp.vy+=0.12; sp.life--;
    px(sp.x,sp.y,1,1,sp.c); if(sp.life<=0) sparks.splice(i,1);
  }
}

/* ---------- 小鎮：俯視地圖。4×4 個街區、96 塊小地，每塊地點了可以進入或查看；待售的地之後留給朋友 ---------- */
var scene='farm', VR=[7,123,239,355,471], HR=[7,91,175,259,343], TW=478, TH=350, curLot=null;
var SPECIAL={
  '1,1,1,1':{id:'farm',  type:'farm', name:'你的農場'},
  '1,1,1,2':{id:'seeds', type:'shop', name:'種子行',tab:'seeds', roof:'#6f9a6a',ridge:'#8fbf8a',icon:'bud'},
  '2,1,1,0':{id:'market',type:'shop', name:'市場',  tab:'market',roof:'#c98a5a',ridge:'#e0a878',icon:'star'},
  '2,1,1,1':{id:'lab',   type:'shop', name:'工坊',  tab:'lab',   roof:'#7a6fa8',ridge:'#9a8fc8',icon:'juice'},
  '1,2,0,1':{id:'pets',  type:'shop', name:'寵物店',tab:'pets',  roof:'#d9a05a',ridge:'#f0c080',icon:'cat'},
  '2,2,0,0':{id:'land',  type:'shop', name:'地政所',tab:'land',  roof:'#8f9ab8',ridge:'#b0bad8',icon:'deed'},
  '1,2,0,2':{id:'board', type:'board',name:'公告欄',tab:'ach'},
  '1,1,0,1':{id:'decor',type:'shop', name:'雜貨店',tab:'decor', roof:'#8a9a5a',ridge:'#b8c88a',icon:'lampi'},
  '2,1,0,1':{id:'wear', type:'shop', name:'服飾店',tab:'wear',  roof:'#d97a9a',ridge:'#f0a8c0',icon:'hat'},
  '2,2,1,1':{id:'dex',  type:'shop', name:'圖鑑館',tab:'dex',   roof:'#5e7a9a',ridge:'#8fb0d0',icon:'book'},
  '1,2,1,1':{id:'contest',type:'shop',name:'品評會場',tab:'contest',roof:'#a8862f',ridge:'#f5c451',icon:'cup'},
  '1,1,1,0':{type:'home',name:'阿嬤家',  npc:'隔壁阿嬤',  roof:'#b48cf2',ridge:'#d9c0ff',desc:'門口曬著一排醃菜。'},
  '2,2,0,1':{type:'home',name:'派出所',  npc:'警察杯杯',  roof:'#4a6fd0',ridge:'#8aa6f0',desc:'門口停著一台腳踏車。'},
  '1,2,0,0':{type:'home',name:'早餐店',  npc:'早餐店老闆',roof:'#ee9a72',ridge:'#ffc8a8',desc:'一大早就飄出蛋餅香。'},
  '2,1,1,2':{type:'home',name:'土地公廟',npc:'廟口里長',  roof:'#c8647a',ridge:'#f5c451',desc:'里長每天在這裡泡茶。'},
  '2,2,0,2':{type:'home',name:'星際民宿',npc:'外星觀光客',roof:'#7fd8f0',ridge:'#c8f2ff',desc:'屋頂上停著一台小飛碟。'}
};
var LOTS=[];
(function(){
  var n=0, ROOFS=['#b8566a','#8f6a4a','#5e7a9a','#7a8a5a','#9a6a8a'];
  for(var by=0;by<4;by++) for(var bx=0;bx<4;bx++) for(var row=0;row<2;row++) for(var col=0;col<3;col++){
    var x=VR[bx]+10+col*33, y=row?HR[by+1]-39:HR[by]+11, l={n:n,x:x,y:y,w:30,h:28,row:row,door:[x+15,row?HR[by+1]:HR[by]]}, sp=SPECIAL[bx+','+by+','+row+','+col], k;
    if(sp){ for(k in sp) l[k]=sp[k]; l.label=1; }
    else {
      var r=rnd(n*7.3+1), edge=(bx===0||bx===3||by===0||by===3);
      if(r<(edge?0.3:0.45)){ l.type='sale'; l.name='待售地 '+(n+1)+' 號'; l.price=1500+Math.round(rnd(n+5)*40)*100; }
      else if(r<(edge?0.55:0.8)){ l.type='house'; l.name='民宅 '+(n+1)+' 號'; l.roof=ROOFS[n%5]; l.ridge='#e6dcf0'; }
      else if(r<0.93){ l.type='woods'; l.name='小樹林'; }
      else { l.type='pond'; l.name='小池塘'; }
    }
    LOTS.push(l); n++;
  }
})();
var FARMLOT=LOTS.filter(function(l){return l.id==='farm';})[0];
var town={x:FARMLOT.door[0],y:FARMLOT.door[1],dir:1,pending:null,path:[],cx:0,cy:0,step:0};
var NPC=[{x:200,y:HR[2]-5,ax:'x',dir:1,sp:9,c:{hair:'#e6e0f0',skin:'#f2c9a0',shirt:'#b48cf2',pants:'#5e4a82'}},{x:VR[2]+5,y:200,ax:'y',dir:-1,sp:12,c:{hat:'#4a6fd0',skin:'#f2c9a0',shirt:'#4a6fd0',pants:'#2a2148'}}];
var ME={};
function syncLook(){
  var h=HATS.filter(function(x){return x.id===S.look.hat;})[0]||HATS[0], sh=SHIRTS.filter(function(x){return x.id===S.look.shirt;})[0]||SHIRTS[0];
  ME={hatType:h.id,hat:h.c,hair:'#6b4a3a',skin:'#f2c9a0',shirt:sh.c,pants:'#3d4a7a'};
}
syncLook();
BMP.lampi={rows:['.....yy.....','....yyyy....','....yyyy....','.....kk.....','.....kk.....','.....kk.....','....kkkk....'],pal:{y:'#ffd98a',k:'#b9a8cf'}};
BMP.hat={rows:['....yyyy....','...yyyyyy...','...yrrrry...','.yyyyyyyyyy.','yyyyyyyyyyyy'],pal:{y:'#e8c36a',r:'#c8647a'}};
BMP.cup={rows:['..yyyyyyyy..','.yyyyyyyyyy.','.y.yyyyyy.y.','..yyyyyyyy..','...yyyyyy...','.....yy.....','....yyyy....'],pal:{y:'#f5c451'}};
BMP.book={rows:['..bbbbbbbb..','..bwwwwwwb..','..bwkkkkwb..','..bwwwwwwb..','..bwkkkwwb..','..bwwwwwwb..','..bbbbbbbb..'],pal:{b:'#c8647a',w:'#f6e7c8',k:'#5e4a82'}};
function drawDecor(t){
  var D=S.decor, k, r;
  if(D.sign){ px(56,44,1,6,'#b08a66'); px(51,38,11,7,'#b08a66'); px(52,39,9,5,'#c9a27a'); px(53,40,6,1,'#5e4a82'); px(53,42,4,1,'#5e4a82'); }
  if(D.lamp){ ctx.fillStyle='rgba(255,217,138,.18)'; ctx.fillRect(66,28,9,9); px(70,34,1,16,'#2a2148'); px(69,31,3,3,'#ffd98a'); px(68,30,5,1,'#2a2148'); }
  if(D.birdhouse){ px(86,38,1,12,'#b08a66'); px(83,32,7,6,'#d9705a'); px(82,31,9,2,'#7a4a52'); px(86,34,1,2,'#2a2148'); if(Math.floor(t/2500)%3===0){ px(84,29,2,2,'#7fd8f0'); px(86,30,1,1,'#f5c451'); } }
  if(D.scarecrow){ px(102,36,1,14,'#b08a66'); px(98,39,9,1,'#b08a66'); px(101,33,3,3,'#f2c9a0'); px(100,32,5,1,'#e8c36a'); px(101,31,3,1,'#e8c36a'); px(100,40,5,5,'#d9705a'); }
  if(D.lantern){ px(119,44,3,6,'#9a8fb8'); px(117,40,7,4,'#b9a8cf'); px(119,41,3,2,'#ffd98a'); px(118,38,5,2,'#9a8fb8'); px(120,37,1,1,'#9a8fb8'); }
  if(D.windmill){ px(141,32,4,18,'#c9bfd8'); px(140,42,6,8,'#c9bfd8'); px(142,44,2,6,'#3a2433');
    for(k=0;k<4;k++){ var an=t/900+k*Math.PI/2; for(r=1;r<=9;r++) px(143+Math.round(Math.cos(an)*r),32+Math.round(Math.sin(an)*r),1,1,'#f6e7c8'); } px(142,31,2,2,'#c8647a'); }
  if(D.trophy){ px(128,47,5,3,'#b08a66'); px(128,40,5,4,'#f5c451'); px(130,44,1,3,'#f5c451'); px(127,41,1,2,'#f5c451'); px(133,41,1,2,'#f5c451'); px(129,41,1,1,'#fff6c8'); }
  if(D.flowers){ var fc=['#ef7a8a','#f5c451','#b48cf2','#f6e7c8']; for(k=4;k<W;k+=9){ px(k,57,1,2,'#6fbf5f'); px(k-1,56,3,1,fc[(k/9|0)%4]); px(k,55,1,1,fc[(k/9|0)%4]); } }
}
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
}
function updateLabels(){
  var sc=cv.clientWidth/W;
  LBL.forEach(function(l,i){
    var el=lblEls[i], x=l.x+15-town.cx, y=(l.row?l.y:l.y+28)-town.cy;
    if(scene!=='town'||x<14||x>W-14||y<10||y>H-10){ el.style.display='none'; return; }
    el.style.display='block'; el.style.left=(cv.offsetLeft+x*sc)+'px'; el.style.top=(cv.offsetTop+y*sc)+'px';
  });
}
function tree(x,y){ px(x+1,y,4,6,'#2f6b45'); px(x,y+1,6,4,'#2f6b45'); px(x+1,y+1,2,2,'#4f9a62'); }
function outline(X,Y,w,h,c){ px(X,Y,w,1,c); px(X,Y+h-1,w,1,c); px(X,Y,1,h,c); px(X+w-1,Y,1,h,c); }
function drawLot(l,t){
  var X=l.x-Math.round(town.cx), Y=l.y-Math.round(town.cy), k, ty=l.type;
  if(X>W||Y>H||X+30<0||Y+28<0) return;
  if(ty==='shop'||ty==='home'||ty==='house'){
    var by=l.row?Y+3:Y+8;
    px(X,Y,30,28,ty==='house'?'#5f9068':'#c9bfd8'); if(ty!=='house') outline(X,Y,30,28,'#9a8fb8');
    if(l.row) px(X+13,by+17,4,Y+28-by-17,'#f0e8f6'); else px(X+13,Y,4,by-Y,'#f0e8f6');
    ctx.fillStyle='rgba(42,33,72,.35)'; ctx.fillRect(X+5,by+1,22,17);
    px(X+4,by,22,17,l.roof); px(X+4,by,22,1,l.ridge); px(X+4,by+8,22,1,l.ridge); px(X+21,by+2,3,3,'#3a2433');
    if(l.icon){ var ic=BMP[l.icon]; px(X+8,by+2,14,13,'#2a2148'); bmp(ctx,ic,X+15-Math.floor(ic.rows[0].length/2),by+8-Math.floor(ic.rows.length/2)); }
  } else if(ty==='farm'){
    px(X,Y,30,28,'#5c8c66'); outline(X,Y,30,28,Math.floor(t/500)%2?'#f5c451':'#c9a27a');
    px(X+13,Y+24,4,4,'#b08a66'); px(X+3,Y+4,9,8,'#b8566a'); px(X+3,Y+7,9,1,'#d97a8a');
    for(k=0;k<9;k++){
      var p=S.plots[k], qx=X+13+(k%3)*5, qy=Y+4+Math.floor(k/3)*6;
      if(!p.u){ px(qx,qy,4,5,'#456a52'); continue; }
      px(qx,qy,4,5,'#7a5644');
      if(p.crop){ var st=SMAP[p.crop], ripe=p.prog>=st.time; px(qx+1,qy+1,2,3,ripe?st.color:'#6fbf5f'); }
    }
    tree(X+4,Y+16);
  } else if(ty==='sale'){
    px(X,Y,30,28,'#7d9a6a');
    for(k=0;k<30;k+=6){ px(X+k,Y,3,1,'#f6e7c8'); px(X+k,Y+27,3,1,'#f6e7c8'); }
    for(k=0;k<28;k+=6){ px(X,Y+k,1,3,'#f6e7c8'); px(X+29,Y+k,1,3,'#f6e7c8'); }
    px(X+14,Y+16,2,6,'#b08a66'); px(X+9,Y+9,12,8,'#f6e7c8'); px(X+11,Y+11,8,1,'#c8647a'); px(X+11,Y+13,5,1,'#c8647a');
  } else if(ty==='woods'){
    px(X,Y,30,28,'#4a7a58'); tree(X+3,Y+3); tree(X+13,Y+2); tree(X+22,Y+5); tree(X+6,Y+13); tree(X+17,Y+12); tree(X+11,Y+20); tree(X+22,Y+19);
  } else if(ty==='pond'){
    px(X,Y,30,28,'#5f9068'); px(X+5,Y+6,20,15,'#5aa0c8'); px(X+5,Y+6,2,2,'#5f9068'); px(X+23,Y+6,2,2,'#5f9068'); px(X+5,Y+19,2,2,'#5f9068'); px(X+23,Y+19,2,2,'#5f9068'); px(X+9,Y+10,6,1,'#bfe4f4'); px(X+15,Y+16,5,1,'#bfe4f4'); tree(X+1,Y+20);
  } else {
    px(X,Y,30,28,'#64996f'); outline(X,Y,30,28,'#4f8a5c'); px(X+13,Y,4,9,'#f0e8f6');
    px(X+9,Y+18,2,6,'#b08a66'); px(X+19,Y+18,2,6,'#b08a66'); px(X+6,Y+9,18,11,'#b08a66'); px(X+7,Y+10,16,9,'#c9a27a'); px(X+8,Y+11,4,6,'#f6e7c8'); px(X+13,Y+11,4,4,'#f5c451'); px(X+18,Y+12,4,6,'#f6e7c8');
    if(S.tasks.length&&Math.floor(t/400)%2) px(X+22,Y+6,4,4,'#ef4a4a');
  }
}
function near(arr,v,d){ for(var i=0;i<arr.length;i++) if(Math.abs(arr[i]-v)<d) return true; return false; }
function drawTown(t){
  var cx=Math.round(town.cx), cy=Math.round(town.cy), i, x, y;
  px(0,0,W,H,'#4d7a5a');
  for(i=0;i<420;i++){ x=(i*53)%TW-cx; y=(i*89)%TH-cy; if(x>=0&&x<W&&y>=0&&y<H) px(x,y,1,1,i%13===0?'#f6e7c8':(i%2?'#416b4f':'#5c8c66')); }
  HR.forEach(function(h){ px(0,h-9-cy,W,18,'#b9a8cf'); }); VR.forEach(function(v){ px(v-9-cx,0,18,H,'#b9a8cf'); });
  HR.forEach(function(h){ px(0,h-7-cy,W,14,'#4a3f63'); }); VR.forEach(function(v){ px(v-7-cx,0,14,H,'#4a3f63'); });
  HR.forEach(function(h){ for(i=-(cx%12);i<W;i+=12) if(!near(VR,i+cx+3,11)) px(i,h-cy,6,1,'#8d7fb0'); });
  VR.forEach(function(v){ for(i=-(cy%12);i<H;i+=12) if(!near(HR,i+cy+3,11)) px(v-cx,i,1,6,'#8d7fb0'); });
  LOTS.forEach(function(l){ drawLot(l,t); });
  var catx=((t/140)%(TW+60))-30; bmp(ctx,BMP.cat,Math.round(catx)-cx,HR[2]+1-cy,false);
  NPC.forEach(function(n,k){ person(Math.round(n.x)-3-cx,Math.round(n.y)-10-cy,Math.floor(t/260+k)%2,n.dir,n.c); });
  person(Math.round(town.x)-3-cx,Math.round(town.y)-10-cy,town.path.length?Math.floor(town.step)%2:0,town.dir,ME);
  /* 右下角小地圖 */
  var mx=W-52, my=H-39;
  ctx.fillStyle='rgba(42,33,72,.85)'; ctx.fillRect(mx-2,my-2,52,39); outline(mx-2,my-2,52,39,'#5e4a82');
  LOTS.forEach(function(l){ var c=l.type==='farm'?'#ef7a8a':(l.type==='shop'||l.type==='board'?'#f5c451':(l.type==='home'?'#b48cf2':(l.type==='sale'?'#f6e7c8':(l.type==='house'?'#8d7fb0':'#4f9a62')))); px(mx+Math.round(l.x/10),my+Math.round(l.y/10),3,2,c); });
  outline(mx+Math.round(cx/10),my+Math.round(cy/10),16,20,'#f6e7c8');
  if(Math.floor(t/300)%2) px(mx+Math.round(town.x/10)-1,my+Math.round(town.y/10)-1,2,2,'#ffffff');
  updateLabels();
}
function townStep(dt){
  if(town.path.length){
    var T=town.path[0], dx=T[0]-town.x, dy=T[1]-town.y, d=Math.sqrt(dx*dx+dy*dy);
    if(d<1){ town.x=T[0]; town.y=T[1]; town.path.shift(); if(!town.path.length&&town.pending){ var l=town.pending; town.pending=null; enterLot(l); } }
    else { var mv=Math.min(d,80*dt); town.x+=dx/d*mv; town.y+=dy/d*mv; if(Math.abs(dx)>0.5) town.dir=dx>0?1:-1; town.step+=dt*8; }
  }
  NPC.forEach(function(n){ n[n.ax]+=n.dir*n.sp*dt; var lim=n.ax==='x'?TW:TH; if(n[n.ax]<20) n.dir=1; if(n[n.ax]>lim-20) n.dir=-1; });
  town.cx=clamp(town.x-80,0,TW-W); town.cy=clamp(town.y-100,0,TH-H);
}
function best(arr,a,b){ var bv=arr[0], bd=1e9; arr.forEach(function(v){ var d=Math.abs(a-v)+Math.abs(v-b); if(d<bd){ bd=d; bv=v; } }); return bv; }
function routeTo(T){
  var px0=town.x, py0=town.y, onH=near(HR,py0,1), tH=near(HR,T[1],1), p=[];
  if(onH&&tH){ if(Math.abs(py0-T[1])>1){ var vx=best(VR,px0,T[0]); p.push([vx,py0],[vx,T[1]]); } }
  else if(onH){ p.push([T[0],py0]); }
  else if(tH){ p.push([px0,T[1]]); }
  else if(Math.abs(px0-T[0])>1){ var hy=best(HR,py0,T[1]); p.push([px0,hy],[T[0],hy]); }
  p.push(T); town.path=p;
}
function townClick(x,y){
  if(tab){ closePanel(); return; }
  var wx=x+town.cx, wy=y+town.cy, hit=null;
  LOTS.forEach(function(l){ if(wx>=l.x&&wx<=l.x+30&&wy>=l.y&&wy<=l.y+28) hit=l; });
  if(hit){ town.pending=hit; routeTo(hit.door); return; }
  town.pending=null;
  var hy=best(HR,wy,wy), vx=best(VR,wx,wx);
  routeTo(Math.abs(wy-hy)<=Math.abs(wx-vx)?[clamp(wx,7,TW-7),hy]:[vx,clamp(wy,7,TH-7)]);
}
function enterLot(l){
  if(l.type==='farm') setScene('farm');
  else if(l.tab) showTab(l.tab);
  else { curLot=l; showTab('lot'); }
}
function setScene(sc){
  scene=sc; if(tab) closePanel();
  if(sc==='town'){ town.x=FARMLOT.door[0]; town.y=FARMLOT.door[1]; town.path=[]; town.pending=null; townStep(0); if(!S.townSeen) toast('點一塊地會走過去，再進入或查看；點馬路可以散步'); S.townSeen=1; }
  $('stage').style.background=sc==='town'?'#4d7a5a':'';
  updateLabels(); hud();
}

/* ---------- 田地操作：點一下，依狀態做對的事 ---------- */
cv.addEventListener('click',function(e){
  if(modalOpen) return;
  var b=cv.getBoundingClientRect(), x=(e.clientX-b.left)/b.width*W, y=(e.clientY-b.top)/b.height*H, now=Date.now();
  if(scene==='town'){ townClick(x,y); return; }
  for(var i=0;i<9;i++){
    var r=plotRect(i); if(x<r.x||x>r.x+r.w||y<r.y||y>r.y+r.h) continue;
    var p=S.plots[i];
    if(!p.u){
      var first=-1; for(var k=0;k<9;k++) if(!S.plots[k].u){ first=k; break; }
      toast('到小鎮的「地政所」買地'+(i===first?'，這塊要 '+PLOT_COST[i]+' 金幣':'')); return;
    } else if(!p.crop){
      var s=SMAP[S.seed];
      if(s.gen){ if(!(S.seeds[s.id]>0)){ toast('「'+s.name+'」種子用完了，到工坊配種'); return; } S.seeds[s.id]--; }
      else if(S.coins<s.cost){ toast('金幣不夠買「'+s.name+'」種子（'+s.cost+'）'); return; }
      S.coins-=s.cost; p.crop=s.id; p.prog=0; p.last=now; p.dry=0; p.water=S.upg.sprinkler?now+1e9:0;
      if(p.prev===s.id){ p.streak=(p.streak||0)+1; p.rot=Math.max(-0.3,-0.08*p.streak*(has(s,'heirloom')?2:1)); }
      else { p.streak=0; p.rot=p.prev?0.1:0; }
      p.prev=s.id;
      burst(r.x+22,r.y+30,'#7a5644');
      toast(p.rot>0?'換種新的，輪作讓品質運氣提高':(p.rot<0?'這塊地連種同一種，品質運氣下降':(S.upg.sprinkler?'種下去了':'種下去了，再點一下澆水')));
    } else {
      grow(p,now);
      var st=SMAP[p.crop];
      if(isRipe(p)){
        var q=rollQ(luck(p,st));
        S.inv[st.id][q]++; S.dex[st.id+q]=1; S.stats.harvest++;
        var di=S.dexInfo[st.id]||(S.dexInfo[st.id]={n:0,first:now}); di.n++; if(st.id==='gold') S.stats.gold++;
        if(q>S.stats.best) S.stats.best=q;
        if(S.charm>0) S.charm--;
        var kept=st.gen&&Math.random()<0.6+0.05*q; if(kept) S.seeds[st.id]=(S.seeds[st.id]||0)+1;
        addXp(Math.ceil(st.time/10*(1+petBonus('chick'))*(1+0.2*q))); p.crop=null; p.prog=0;
        if(has(st,'spark')) neighbors(i).forEach(function(k){ var o=S.plots[k]; if(o.crop&&!isRipe(o)){ o.prog+=SMAP[o.crop].time*0.15; var rr=plotRect(k); burst(rr.x+22,rr.y+20,'#f2e35c'); } });
        burst(r.x+22,r.y+12,RAR[q].c); toast('收成「'+st.name+'」，品質：'+RAR[q].n+(q>=4?'！':'')+(kept?'，還留下一顆種子':'')+(S.townSeen?'':'。按「去小鎮」可以到市場賣'));
      } else if(now>=p.water){
        p.water=now+waterSpan(st)*(weather(now).id==='heat'?0.6:1); burst(r.x+22,r.y+24,'#7fd8f0');
      } else {
        toast('「'+st.name+'」還要 '+fmt((st.time-p.prog)/speed()));
      }
    }
    checkAch(); hud(); refreshPanel(); Store.save(S); return;
  }
});

/* ---------- 面板 ---------- */
var tab=null;
function openTab(t){
  tab=(tab===t)?null:t;
  $('panel').classList.toggle('open',!!tab);
  Array.prototype.forEach.call(document.querySelectorAll('#tabs button[data-tab]'),function(b){ b.classList.toggle('on',b.dataset.tab===tab); });
  refreshPanel();
}
function showTab(t){ tab=null; openTab(t); }
function closePanel(){ if(tab) openTab(tab); }
function refreshPanel(){
  if(!tab) return;
  var now=Date.now(), h='', title='', sub='';
  if(tab==='seeds'){
    title='種子'; sub=S.charm>0?'幸運符還有 '+S.charm+' 次':'種下時才扣金幣或種子';
    STRAINS.forEach(function(s){
      var have=S.seeds[s.id]||0;
      if(s.gen&&!S.known[s.id]) return;
      var lock=s.gen?have<1:S.lvl<s.lvl;
      h+='<div class="row'+(lock?' locked':'')+'"><div class="sw" style="background:'+s.color+'"></div><div class="info"><strong>'+s.name+(s.gen?' ×'+have:'')+(inSeason(s,now)?'　<span class="up" style="font-size:12px;font-weight:400">當季：長得快、賣得貴</span>':'')+'</strong><small>'+
        (s.gen?(have?'配種得到的種子':'種子用完了，到工坊配種')+'，成長 '+fmt(s.time/speed())+'，行情約 '+s.base
              :(lock?'LV '+s.lvl+' 解鎖':'種子 '+s.cost+' 金幣，成長 '+fmt(s.time/speed())+'，行情約 '+s.base))+'</small><small>【'+s.tname+'】'+s.tdesc+'</small></div>'+
        '<button class="btn" data-act="seed" data-id="'+s.id+'"'+(lock||S.seed===s.id?' disabled':'')+'>'+(S.seed===s.id?'使用中':'選這個')+'</button></div>';
    });
  } else if(tab==='bag'){
    title='背包'; var all=bagList(), dexN=Object.keys(S.dex).length; sub='作物圖鑑 '+dexN+' / '+STRAINS.length*6;
    h+='<div class="legend">'+RAR.map(function(r){return '<span><i style="background:'+r.c+'"></i>'+r.n+'</span>';}).join('')+'</div>';
    var sel=all.filter(function(x){return x.key===bagSel;})[0];
    if(sel){
      h+='<div class="detail" style="--rar:'+RAR[sel.rar].c+'"><img class="picon" alt="" src="'+ICON[sel.icon]+'"><div class="info"><strong>'+sel.name+' ×'+sel.n+'</strong><small><span style="color:'+RAR[sel.rar].c+'">'+RAR[sel.rar].n+'</span>　'+sel.desc+'</small>'+
        (sel.value?'':'<small>'+(sel.note||'售價是普通品質的 '+QMULT[sel.rar]+' 倍，到「市場」賣出')+'</small>')+'</div>'+
        (sel.value?'<button class="btn alt" data-act="sellitem" data-id="'+sel.key+'"'+(sel.n?'':' disabled')+'>賣 1 個 '+sel.value+'</button>':'')+'</div>';
    }
    h+=all.length?'<div class="grid">'+all.map(function(x){
      return '<button type="button" class="card'+(x.n?'':' none')+(x.key===bagSel?' sel':'')+'" style="--rar:'+RAR[x.rar].c+'" data-act="bag" data-id="'+x.key+'"><b>'+(x.n||'')+'</b><img alt="" src="'+ICON[x.icon]+'"><span>'+x.name+'</span></button>';
    }).join('')+'</div>':'<div class="row"><div class="info"><small>背包是空的，收成後的作物和撿到的寶物會出現在這裡。</small></div></div>';
  } else if(tab==='lab'){
    title='工坊'; sub='已發現新品種 '+Object.keys(S.known).length+' / 10';
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
    var kn=RECIPES.filter(function(r){return S.known[r.out]||S.hint[r.out];});
    h+='<div class="sec">已發現的配方</div>'+(kn.length?kn.map(function(r){ return '<div class="row"><div class="sw" style="background:'+SMAP[r.out].color+'"></div><div class="info"><strong>'+SMAP[r.a].name+' × '+SMAP[r.b].name+' → '+SMAP[r.out].name+'</strong><small>'+(S.known[r.out]?'':'居民給的線索，還沒配成功過。')+'基礎成功率 '+Math.round(r.ch*100)+'%</small></div></div>'; }).join(''):'<div class="row"><div class="info"><small>還沒有。試試把兩種不同的作物放上去配種。</small></div></div>');
  } else if(tab==='lot'&&curLot){
    var L=curLot, kind={sale:'待售土地',home:'居民',house:'民宅',woods:'綠地',pond:'綠地'}[L.type];
    title=L.name; sub=kind+'・3×3 格';
    if(L.type==='sale'){
      h+='<div class="row"><div class="info"><strong>這塊地還沒有主人</strong><small>大小 3×3 格，門口面向大街。接上帳號後，你或朋友可以買下來蓋自己的農場。</small></div><button class="btn" disabled>'+L.price+' 金幣</button></div>';
      h+='<div class="row locked"><div class="info"><small>目前只能看，還不能買。</small></div><span>即將開放</span></div>';
    } else if(L.type==='home'){
      var fv=S.favor[L.npc]||0;
      h+='<div class="row"><div class="info"><strong>'+L.npc+'在這裡</strong><small>'+L.desc+'</small></div></div>';
      var stg=S.story[L.npc]||0, ST=STORIES[L.npc]||[];
      for(var si=0;si<stg;si++) h+='<div class="row"><div class="info"><strong>故事 '+(si+1)+'</strong><small>'+ST[si].t+'</small></div></div>';
      if(stg<ST.length){ var need=(stg+1)*3;
        h+='<div class="row"><div class="info"><strong>'+(fv>=need?'他好像有話想跟你說':'下一段故事')+'</strong><small>'+(fv>=need?'進去坐坐，聽他說。':'再幫他交貨 '+(need-fv)+' 次就會解鎖。')+'</small></div><button class="btn" data-act="story"'+(fv>=need?'':' disabled')+'>聽他說</button></div>'; }
      h+='<div class="row"><div class="info"><strong>好感：已幫忙交貨 '+fv+' 次</strong><small>每交貨 3 次會送你一份禮物，再 '+(3-fv%3)+' 次就有下一份。他的委託會出現在公告欄。</small></div></div>';
    } else if(L.type==='house'){
      h+='<div class="row"><div class="info"><strong>鎮上居民的家</strong><small>窗戶透著暖黃色的燈。主人不在，下次再來。</small></div></div>';
    } else {
      h+='<div class="row"><div class="info"><strong>'+(L.type==='pond'?'水很清，偶爾有魚跳起來。':'風吹過樹葉沙沙響，很適合發呆。')+'</strong><small>公共綠地，不能買賣。</small></div></div>';
    }
  } else if(tab==='decor'){
    title='雜貨店'; sub='農場魅力 '+charmPts()+'，售價 +'+charmPts()+'%';
    DECOR.forEach(function(x){
      var own=S.decor[x.id]; if(x.rep&&!own) return;
      h+='<div class="row"><div class="info"><strong>'+x.name+'</strong><small>'+x.desc+'，魅力 +'+x.charm+'</small></div><button class="btn" data-act="buydecor" data-id="'+x.id+'"'+(own||S.coins<x.cost?' disabled':'')+'>'+(own?'已擺上':x.cost+' 金幣')+'</button></div>';
    });
    h+='<div class="row"><div class="info"><small>買了會直接出現在農場上。每 1 點魅力讓市場售價多 1%。</small></div></div>';
  } else if(tab==='wear'){
    title='服飾店'; sub='換個造型';
    [['帽子',HATS,'hat'],['上衣',SHIRTS,'shirt']].forEach(function(g){
      h+='<div class="sec">'+g[0]+'</div>';
      g[1].forEach(function(x){
        var own=S.wardrobe[x.id], on=S.look[g[2]]===x.id; if(x.rep&&!own) return;
        h+='<div class="row"><div class="sw" style="background:'+x.c+'"></div><div class="info"><strong>'+x.name+'</strong></div><button class="btn'+(own?' alt':'')+'" data-act="wear" data-id="'+g[2]+':'+x.id+'"'+(on||(!own&&S.coins<x.cost)?' disabled':'')+'>'+(on?'穿著中':(own?'換上':x.cost+' 金幣'))+'</button></div>';
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
    h+='<div class="row"><div class="sw" style="background:'+cs.color+'"></div><div class="info"><strong>指定品種：'+cs.name+'</strong><small>交出一株，品質越高名次越好。還有 '+fmt(((cw+1)*604800000-now)/1000)+'結束，結束後回來領獎。</small><small>'+
      (cc&&cc.week===cw?'你目前交出的是：<span style="color:'+RAR[cc.q].c+'">'+RAR[cc.q].n+'</span>，可以換更好的':'你還沒參加')+'</small></div></div>';
    var cur=cc&&cc.week===cw?cc.q:-1, any=false;
    for(var cq=5;cq>cur;cq--) if(S.inv[cs.id][cq]>0){ any=true;
      h+='<div class="row"><div class="info"><strong>交出一株 <span style="color:'+RAR[cq].c+'">'+RAR[cq].n+'</span>品質</strong><small>手上有 '+S.inv[cs.id][cq]+' 株，交出後不會退還</small></div><button class="btn alt" data-act="centry" data-id="'+cq+'">交出</button></div>'; }
    if(!any) h+='<div class="row"><div class="info"><small>'+(cur>=0?'手上沒有比這更好的「'+cs.name+'」了。':'手上沒有「'+cs.name+'」，先去種幾株。')+'</small></div></div>';
    h+='<div class="row"><div class="info"><small>獎勵：第 1 名聲望 30、第 2 名 18、第 3 名 10、參加獎 4，另有金幣。對手是鎮上 5 位居民。</small></div></div>';
    h+='<div class="sec">聲望商店</div>';
    REPSHOP.forEach(function(x){
      var own=x.once&&(x.id==='wizard'?S.wardrobe.wizard:S.decor.trophy);
      h+='<div class="row"><div class="info"><strong>'+x.name+'</strong><small>'+x.desc+'</small></div><button class="btn" data-act="repbuy" data-id="'+x.id+'"'+(own||S.rep<x.cost?' disabled':'')+'>'+(own?'已擁有':'聲望 '+x.cost)+'</button></div>';
    });
    h+='<div class="row"><div class="info"><small>聲望來自品評會、完成限時任務、聽居民的故事。</small></div></div>';
  } else if(tab==='land'){
    var own=S.plots.filter(function(p){return p.u;}).length;
    title='地政所'; sub='持有 '+own+' / 9 塊地';
    if(own<9) h+='<div class="row"><div class="info"><strong>農場第 '+(own+1)+' 塊地</strong><small>買下後回農場就能種</small></div><button class="btn" data-act="buyland"'+(S.coins>=PLOT_COST[own]?'':' disabled')+'>'+PLOT_COST[own]+' 金幣</button></div>';
    else h+='<div class="row"><div class="info"><strong>農場的地都買齊了</strong><small>真正的大地主。</small></div></div>';
    h+='<div class="row locked"><div class="info"><strong>街上的空地</strong><small>之後接上帳號，可以在街上買地、看到朋友的農場。</small></div><span>即將開放</span></div>';
  } else if(tab==='pets'){
    title='寵物'; sub='養了 '+Object.keys(S.pets).length+' / '+PETS.length+' 隻';
    PETS.forEach(function(pt){
      var own=S.pets[pt.id], hs=hearts(pt.id), btn, line;
      if(own){
        var cd=30-(now-own.last)/1000;
        line='<small>'+pt.label+' +'+Math.round(petBonus(pt.id)*100)+'%</small><small class="hearts">'+'♥♥♥♥♥'.slice(0,hs)+'♡♡♡♡♡'.slice(0,5-hs)+'</small>';
        btn='<button class="btn" data-act="pet" data-id="'+pt.id+'"'+(cd>0?' disabled':'')+'>'+(cd>0?'休息 '+Math.ceil(cd)+' 秒':'摸摸')+'</button>';
        if(own.trip){ var tl=(own.trip.until-now)/1000;
          line='<small>'+(tl>0?'外出探險中，還要 '+fmt(tl):'探險回來了，帶了東西')+'</small>';
          btn='<button class="btn alt" data-act="tripback" data-id="'+pt.id+'"'+(tl>0?' disabled':'')+'>'+(tl>0?'探險中':'領取')+'</button>'; }
      } else {
        var c=pt.cost, ok, txt;
        if(c.coins){ ok=S.coins>=c.coins; txt=c.coins+' 金幣'; }
        else if(c.item){ ok=(S.items[c.item]||0)>=c.n; txt=ok?'交換':IMAP[c.item].name+' '+(S.items[c.item]||0)+'/'+c.n; }
        else { ok=S.stats.cat>=c.cat; txt=ok?'帶回家':'摸流浪貓 '+Math.min(S.stats.cat,c.cat)+'/'+c.cat; }
        line='<small>'+pt.label+' +'+Math.round(pt.base*100)+'%，常摸牠還會再提高</small>';
        btn='<button class="btn alt" data-act="adopt" data-id="'+pt.id+'"'+(ok?'':' disabled')+'>'+txt+'</button>';
      }
      h+='<div class="row"><img class="picon" alt="" style="--rar:'+RAR[pt.rar].c+'" src="'+ICON['pet_'+pt.id]+'"><div class="info"><strong>'+pt.name+'　<span style="color:'+RAR[pt.rar].c+';font-weight:400;font-size:12px">'+RAR[pt.rar].n+'</span></strong>'+line+'</div>'+btn+'</div>';
      if(own&&!own.trip) h+='<div class="row" style="padding-top:0"><div class="info"><small>派去探險：越久帶回越多，外出時沒有加成</small></div>'+TRIPS.map(function(tr,ti){ return '<button class="btn ghost" style="min-width:0;padding:8px 8px;margin-left:6px" data-act="trip" data-id="'+pt.id+':'+ti+'">'+tr.n+'</button>'; }).join('')+'</div>';
    });
  } else if(tab==='market'){
    title='市場'; sub='行情 '+fmt(60-(now/1000)%60)+' 後變動';
    var total=0;
    STRAINS.forEach(function(s){
      if(s.gen&&!S.known[s.id]&&!invCount(s.id)) return;
      var arr=S.inv[s.id], n=invCount(s.id), pr=price(s,now), base=s.base*(1+0.1*S.upg.speaker), d=Math.round((pr/base-1)*100),
          glut=Math.round((1-satFactor(getSat(s.id,now)))*100), got=sellStrain(s.id,now,false), chips='';
      total+=got;
      for(var q=5;q>=0;q--) if(arr[q]) chips+='<span style="color:'+RAR[q].c+'">■</span>'+arr[q]+' ';
      h+='<div class="row'+(S.lvl<s.lvl?' locked':'')+'"><div class="sw" style="background:'+s.color+'"></div><div class="info"><strong>'+s.name+' ×'+n+'</strong><small>普通品質一株 '+pr+
        ' <span class="'+(d>=0?'up':'down')+'">'+(d>=0?'▲':'▼')+Math.abs(d)+'%</span>'+(glut>=1?' <span class="down">賣太多 -'+glut+'%</span>':'')+'</small>'+(chips?'<small>'+chips+'</small>':'')+'</div>'+
        '<button class="btn alt" data-act="sell" data-id="'+s.id+'"'+(n?'':' disabled')+'>賣 '+got+'</button></div>';
    });
    var gv=goodsValue(); total+=gv;
    if(S.goods.length) h+='<div class="row"><img class="picon" alt="" style="--rar:var(--line);width:24px;height:24px" src="'+ICON.juice+'"><div class="info"><strong>加工品 ×'+S.goods.length+'</strong><small>果汁和果醬，價格固定</small></div><button class="btn alt" data-act="sellgoods">賣 '+gv+'</button></div>';
    h+='<button class="btn wide" data-act="sellall"'+(total?'':' disabled')+'>全部賣出，收 '+total+' 金幣</button>';
    h+='<div class="row"><div class="info"><small>同一種賣越多價格越低，大約 8 分鐘回復一半。品質越高賣越貴。</small></div></div>';
  } else if(tab==='upg'){
    title='更多'; sub='升級與設定';
    Object.keys(UPG).forEach(function(k){
      var u=UPG[k], l=S.upg[k], max=l>=u.max;
      h+='<div class="row"><div class="info"><strong>'+u.name+(u.max>1?'　'+l+'/'+u.max:'')+'</strong><small>'+u.desc+'</small></div>'+
        '<button class="btn" data-act="upg" data-id="'+k+'"'+(max||S.coins<u.cost[l]?' disabled':'')+'>'+(max?'已買滿':u.cost[l]+' 金幣')+'</button></div>';
    });
    h+='<div class="row"><div class="info"><strong>Lofi 背景音樂</strong><small>即時合成，不佔流量</small></div><button class="btn alt" data-act="music">'+(musicOn?'關掉':'播放')+'</button></div>';
  } else if(tab==='ach'){
    var done=ACH.filter(function(a){return S.ach[a.id];}).length;
    title='任務與成就'; sub='成就 '+done+' / '+ACH.length;
    if(!S.tasks.length) h+='<div class="row"><div class="info"><strong>目前沒有限時任務</strong><small>鎮上的人有需要時會來找你，過一陣子再回來看看。</small></div></div>';
    S.tasks.forEach(function(t,ti){
      var st=SMAP[t.strain], have=haveFor(t);
      h+='<div class="row"><div class="sw" style="background:'+st.color+'"></div><div class="info"><strong>'+t.npc+'要 '+t.n+' 株'+st.name+(t.minQ?'（'+RAR[t.minQ].n+'以上）':'')+'</strong><small>剩 '+fmt((t.until-now)/1000)+'，報酬 '+t.reward+' 金幣，手上有 '+Math.min(have,t.n)+'/'+t.n+'</small></div>'+
        '<button class="btn" data-act="task" data-id="'+ti+'"'+(have>=t.n?'':' disabled')+'>交貨</button></div>';
    });
    h+='<div class="sec">居民好感（每交貨 3 次送一份禮）</div><div class="row"><div class="info"><small>'+NPCS.map(function(n){ return n+' '+(S.favor[n]||0)+' 次'; }).join('　')+'</small></div></div><div class="sec">成就</div>';
    ACH.forEach(function(a){
      h+='<div class="row'+(S.ach[a.id]?'':' locked')+'"><div class="info"><strong>'+a.name+'</strong><small>'+a.desc+'，獎勵 '+a.reward+' 金幣</small></div><span class="'+(S.ach[a.id]?'up':'')+'">'+(S.ach[a.id]?'已達成':'未達成')+'</span></div>';
    });
    h+='<button class="btn wide ghost" data-act="reset">'+(resetArm?'再按一次，確定刪除進度':'重新開始（刪除進度）')+'</button>';
  }
  $('ptitle').textContent=title; $('psub').textContent=sub; $('plist').innerHTML=h;
}
var resetArm=false, bagSel=null, labA=null, labB=null;
function labStack(key){ if(!key) return null; var k=key.split(':'), st=SMAP[k[0]], q=+k[1]; return st?{key:key,id:st.id,st:st,q:q,n:S.inv[st.id][q]}:null; }
function fixLab(){
  var A=labStack(labA); if(!A||A.n<1) labA=null;
  var B=labStack(labB); if(!B||B.n<(labB===labA?2:1)) labB=null;
  if(!labA&&labB){ labA=labB; labB=null; }
}
function breedChance(A,B,rc){ return rc?Math.min(0.95,rc.ch+0.04*(A.q+B.q)):0.04+0.01*(A.q+B.q); }
function tripLoot(id,rolls){
  var coins=0, got={}, lines=[], hh=hearts(id), add=function(k){ got[k]=(got[k]||0)+1; };
  for(var i=0;i<rolls;i++){
    var r=Math.random();
    if(r<0.5) coins+=Math.round((15+Math.random()*25)*(1+0.15*S.lvl));
    else if(r<0.7){ var tr=Math.random(), it=tr<0.45?'pickle':(tr<0.8?'hairball':(tr<0.95?'whistle':'meteor')); give(it); add(IMAP[it].name); }
    else if(r<0.85){ var pool=STRAINS.filter(function(x){return !x.gen&&S.lvl>=x.lvl;}), st=pool[Math.floor(Math.random()*pool.length)], q=rollQ(Math.min(1,0.5+0.05*hh)); S.inv[st.id][q]++; S.dex[st.id+q]=1; add(st.name+'（'+RAR[q].n+'）'); }
    else if(r<0.95){ S.charm++; add('幸運符'); }
    else { var g1=STRAINS.filter(function(x){return x.gen===1;}), gs=g1[Math.floor(Math.random()*g1.length)]; S.seeds[gs.id]=(S.seeds[gs.id]||0)+1; S.known[gs.id]=1; add(gs.name+'種子'); }
  }
  if(coins){ addCoins(coins); lines.push('金幣 +'+coins); }
  Object.keys(got).forEach(function(k){ lines.push(k+' ×'+got[k]); });
  return lines;
}
function goodsValue(){ return S.goods.reduce(function(a,g){return a+g.v;},0); }
function haveFor(t){ var a=S.inv[t.strain], c=0; for(var q=t.minQ;q<6;q++) c+=a[q]; return c; }
var NPCS=['隔壁阿嬤','警察杯杯','外星觀光客','早餐店老闆','廟口里長'];
function tasksTick(now){
  for(var i=S.tasks.length-1;i>=0;i--) if(now>S.tasks[i].until){ toast('「'+S.tasks[i].npc+'」的任務過期了'); S.tasks.splice(i,1); }
  if(S.tasks.length<2&&now>=S.nextTask){
    var pool=STRAINS.filter(function(s){return !s.gen&&S.lvl>=s.lvl;}), st=pool[Math.floor(Math.random()*pool.length)];
    var n=st.time>=600?1+Math.floor(Math.random()*2):2+Math.floor(Math.random()*4), minQ=Math.random()<0.3?2:0;
    S.tasks.push({npc:NPCS[Math.floor(Math.random()*NPCS.length)],strain:st.id,n:n,minQ:minQ,until:now+Math.max(900,st.time*n*4)*1000,reward:Math.round(st.base*n*(minQ?3.2:1.9))});
    S.nextTask=now+(20+Math.random()*20)*60000;
    toast('公告欄有新的限時任務');
  }
}
function bagList(){
  var a=[];
  STRAINS.forEach(function(s){ for(var q=5;q>=0;q--) if(S.dex[s.id+q]) a.push({key:s.id+':'+q,icon:s.id,name:s.name,rar:q,n:S.inv[s.id][q],desc:SDESC[s.id],value:0}); });
  Object.keys(GOODS).forEach(function(t){ for(var q=5;q>=0;q--){ var c=S.goods.filter(function(g){return g.t===t&&g.q===q;}).length; if(c) a.push({key:'g:'+t+':'+q,icon:t,name:GOODS[t].name,rar:q,n:c,desc:GOODS[t].desc,value:0,note:'到「市場」賣出'}); } });
  ITEMS.forEach(function(it){ if(S.items[it.id]!==undefined) a.push({key:it.id,icon:it.id,name:it.name,rar:it.rar,n:S.items[it.id]||0,desc:it.desc,value:it.value}); });
  return a;
}
$('plist').addEventListener('click',function(e){
  var b=e.target.closest('button[data-act]'); if(!b||b.disabled) return;
  var act=b.dataset.act, id=b.dataset.id, now=Date.now();
  if(act==='seed'){ S.seed=id; toast('換成「'+SMAP[id].name+'」種子'); }
  else if(act==='sell'||act==='sellall'){
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
      S.tasks.splice(+id,1); S.stats.tasks++; S.rep+=t.minQ?3:1; addCoins(t.reward); addXp(Math.ceil(SMAP[t.strain].time/10*t.n));
      S.favor[t.npc]=(S.favor[t.npc]||0)+1;
      if(S.favor[t.npc]%3===0){ var gifts=Object.keys(S.known); if(gifts.length&&Math.random()<0.5){ var gs=gifts[Math.floor(Math.random()*gifts.length)]; S.seeds[gs]=(S.seeds[gs]||0)+1; toast(t.npc+'跟你變熟了，送你一顆「'+SMAP[gs].name+'」種子'); } else { S.charm+=3; toast(t.npc+'跟你變熟了，送你幸運符 3 次'); } }
      else toast('交貨完成，'+t.npc+'給了 '+t.reward+' 金幣');
    }
  }
  else if(act==='upg'){ var u=UPG[id], l=S.upg[id]; if(l<u.max&&S.coins>=u.cost[l]){ S.coins-=u.cost[l]; S.upg[id]++; toast('買了「'+u.name+'」'); } }
  else if(act==='bag'){ bagSel=(bagSel===id)?null:id; }
  else if(act==='sellitem'){ if(S.items[id]>0){ S.items[id]--; addCoins(IMAP[id].value); toast('賣出「'+IMAP[id].name+'」 +'+IMAP[id].value+' 金幣'); } }
  else if(act==='adopt'){
    var pt=PMAP[id], c=pt.cost, ok=c.coins?S.coins>=c.coins:(c.item?(S.items[c.item]||0)>=c.n:S.stats.cat>=c.cat);
    if(ok&&!S.pets[id]){ if(c.coins) S.coins-=c.coins; if(c.item) S.items[c.item]-=c.n; S.pets[id]={aff:0,last:0}; toast('「'+pt.name+'」加入農場了'); }
  }
  else if(act==='pet'){
    var o=S.pets[id];
    if(o&&now-o.last>=30000){ var before=hearts(id); o.aff++; o.last=now; toast(hearts(id)>before?'「'+PMAP[id].name+'」更喜歡你了，加成提高':'「'+PMAP[id].name+'」很開心'); }
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
        var g1=STRAINS.filter(function(x){return x.gen===1;}), out=rc?rc.out:g1[Math.floor(Math.random()*g1.length)].id, cnt=A.q+B.q>=6?2:1, isNew=!S.known[out], os=SMAP[out];
        S.seeds[out]=(S.seeds[out]||0)+cnt; S.known[out]=1; addXp(20*os.gen);
        modal('star',isNew?'配出新品種了':'配種成功',['得到「'+os.name+'」種子 ×'+cnt,'【'+os.tname+'】'+os.tdesc,'到「種子」選它就能種。'],[['太好了']]);
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
  else if(act==='centry'){
    var ew=week(now), es=contestStrain(ew), eq=+id, ec=S.contest;
    if(ec&&ec.week<ew&&!ec.claimed){ toast('先看上週的名次，領完獎再參加'); }
    else if(S.inv[es.id][eq]>0&&(!ec||ec.week!==ew||eq>ec.q)){ S.inv[es.id][eq]--; S.contest={week:ew,q:eq}; toast('交出一株'+RAR[eq].n+'品質的「'+es.name+'」'); }
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
      else { var gg=STRAINS.filter(function(x){return x.gen===(id==='seed1'?1:2);}), gx=gg[Math.floor(Math.random()*gg.length)]; S.seeds[gx.id]=(S.seeds[gx.id]||0)+1; S.known[gx.id]=1; toast('換到「'+gx.name+'」種子'); }
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
    if(bo&&bo.trip&&now>=bo.trip.until){ var loot=tripLoot(id,bo.trip.rolls); bo.trip=null; bo.aff++; modal('star','「'+PMAP[id].name+'」回來了',loot,[['收下']]); }
  }
  else if(act==='buyland'){
    var li=-1; S.plots.forEach(function(p,k){ if(li<0&&!p.u) li=k; });
    if(li>=0&&S.coins>=PLOT_COST[li]){ S.coins-=PLOT_COST[li]; S.plots[li].u=true; toast('新的一塊地到手，回農場看看'); }
  }
  else if(act==='reset'){ if(!resetArm){ resetArm=true; } else { Store.clear(); S=fresh(); normalize(); resetArm=false; toast('進度已重置'); } }
  if(act!=='reset') resetArm=false;
  checkAch(); hud(); refreshPanel(); Store.save(S);
});
$('tabs').addEventListener('click',function(e){ var b=e.target.closest('button[data-tab]'); if(b) openTab(b.dataset.tab); });
$('seedchip').addEventListener('click',function(){ openTab('seeds'); });
$('go').addEventListener('click',function(){ setScene(scene==='farm'?'town':'farm'); });
$('pclose').addEventListener('click',closePanel);

/* ---------- 事件 ---------- */
var modalOpen=false, mctx=$('mart').getContext('2d');
function modal(art,title,lines,btns){
  modalOpen=true; $('modal').classList.add('open');
  var a=$('mart'); mctx.clearRect(0,0,12,10); bmp(mctx,BMP[art],0,0); a.style.width='96px'; a.style.height='80px';
  $('mtitle').textContent=title;
  $('mbody').innerHTML=lines.map(function(l){return '<p>'+l+'</p>';}).join('');
  var box=$('mbtns'); box.innerHTML='';
  btns.forEach(function(b,i){
    var el=document.createElement('button'); el.type='button'; el.className='btn'+(i?' alt':''); el.textContent=b[0];
    el.addEventListener('click',function(){ closeModal(); if(b[1]) b[1](); checkAch(); hud(); refreshPanel(); Store.save(S); });
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
          S.coins-=fine; modal('police','被識破了',['「九層塔哪有長這樣。」','罰款 '+fine+' 金幣'+lost],[['下次會更小心']]); }
      }],
      ['請他喝珍奶（-'+fee+' 金幣）',function(){ S.coins-=fee; toast('警察杯杯喝著珍奶走了'); }]
    ]);
  },
  ufo:function(){
    var p=S.plots[pick(planted())], s=SMAP[p.crop], pay=s.base*3;
    p.crop=null; p.prog=0; S.stats.ufo++; addCoins(pay); give('meteor');
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
      ['賣給阿嬤',function(){ S.inv[s.id]=[0,0,0,0,0,0]; addCoins(pay); toast('阿嬤開心地提著菜回家'); }],
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
var nextEvent=Date.now()+240000+Math.random()*120000;
function maybeEvent(now){
  if(modalOpen||tab||now<nextEvent) return;
  nextEvent=now+480000+Math.random()*420000;
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
function toggleMusic(){
  try{
    if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); var lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1100;
      master=AC.createGain(); master.gain.value=0.9; master.connect(lp); lp.connect(AC.destination); }
    musicOn=!musicOn;
    if(musicOn){ AC.resume(); nextBeat=AC.currentTime+0.1; beat=0; mTimer=setInterval(schedule,120); }
    else { clearInterval(mTimer); AC.suspend(); }
  }catch(err){ toast('這個瀏覽器無法播放音樂'); }
}

/* ---------- 主迴圈 ---------- */
function resize(){
  var st=$('stage'), w=st.clientWidth, h=st.clientHeight, sc=Math.min(w/W,h/H);
  cv.style.width=Math.floor(W*sc)+'px'; cv.style.height=Math.floor(H*sc)+'px';
}
window.addEventListener('resize',function(){ resize(); updateLabels(); }); resize();
var lastDraw=0;
function frame(t){ if(t-lastDraw>60){ if(scene==='town') townStep(Math.min(0.2,(t-lastDraw)/1000)); lastDraw=t; draw(t); } requestAnimationFrame(frame); }
requestAnimationFrame(frame);
var ticks=0;
function tick(){
  var now=Date.now();
  S.plots.forEach(function(p){ grow(p,now); });
  var wxn=weather(now);
  if(wxn.id==='rain') S.plots.forEach(function(p){ if(p.crop) p.water=Math.max(p.water,now+90000); });
  $('wx').textContent=SEASONS[season(now)]+'季・'+wxn.n+'：'+wxn.d;
  var broke=S.coins<STRAINS[0].cost&&!planted().length&&!STRAINS.some(function(s){return invCount(s.id)>0;});
  tasksTick(now); S.seenAt=now;
  if(broke){ S.coins+=10; toast('阿嬤看你可憐，塞了 10 金幣給你'); }
  checkAch(); hud(); if(tab==='market'||tab==='pets'||tab==='ach'||(tab==='lab'&&S.job)) refreshPanel(); maybeEvent(now);
  if(++ticks%5===0) Store.save(S);
}
var awayMs=S.seenAt?Date.now()-S.seenAt:0, hiddenAt=0;
setInterval(tick,1000); tick(); welcome(awayMs);
document.addEventListener('visibilitychange',function(){ if(document.hidden){ hiddenAt=Date.now(); Store.save(S); } else { tick(); if(hiddenAt) welcome(Date.now()-hiddenAt); } });
if(S.stats.harvest===0&&!planted().length) setTimeout(function(){ toast('點一塊空地種下第一株'); },600);
})();
