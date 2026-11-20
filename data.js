'use strict';
/* 題材與數值設定：品種、配方、物品、寵物、成就、天氣的名稱和數字都在這個檔案。
   之後要換題材（例如改成外星草藥），改這個檔案和 index.html 的標題就可以。 */
var STRAINS=[
  {id:'lazy',  name:'懶懶綠',   cost:5,   time:30,   base:17,  color:'#8fd67a', lvl:1, trait:'hardy',   tname:'好養',     tdesc:'忘記澆水也不影響品質'},
  {id:'purple',name:'紫雲朵',   cost:15,  time:90,   base:48,  color:'#b48cf2', lvl:2, trait:'thirsty', tname:'愛喝水',   tdesc:'要澆比較多次，全程沒乾過品質運氣大增'},
  {id:'lemon', name:'檸檬電波', cost:40,  time:240,  base:110, color:'#f2e35c', lvl:4, trait:'spark',   tname:'電波',     tdesc:'收成時讓上下左右的作物瞬間長大一截'},
  {id:'milk',  name:'宇宙奶昔', cost:90,  time:600,  base:230, color:'#7fd8f0', lvl:6, trait:'night',   tname:'夜行',     tdesc:'晚上 6 點到早上 6 點長得快，白天長得慢'},
  {id:'gold',  name:'黃金阿嬤', cost:200, time:1800, base:540, color:'#f5b942', lvl:9, trait:'heirloom',tname:'慢工細活', tdesc:'品質運氣高，但同一塊地連種會退步得更快'},
  /* 以下是配種才能得到的品種，種子買不到 */
  {id:'clover', name:'四葉懶懶', cost:0,time:45,  base:34,  color:'#5fd08a',lvl:0,gen:1,trait:'hardy lucky',         tname:'幸運',  tdesc:'不怕乾，品質運氣特別高'},
  {id:'mint',   name:'薄荷晚霞', cost:0,time:60,  base:45,  color:'#7fe0c0',lvl:0,gen:1,trait:'hardy',               tname:'清涼',  tdesc:'不怕乾，比懶懶綠值錢'},
  {id:'lime',   name:'青檸懶骨頭',cost:0,time:120, base:80,  color:'#c6e85c',lvl:0,gen:1,trait:'hardy spark',         tname:'懶電波',tdesc:'不怕乾，收成時帶動相鄰作物'},
  {id:'grape',  name:'葡萄汽水', cost:0,time:180, base:125, color:'#9a6cf0',lvl:0,gen:1,trait:'thirsty spark',       tname:'氣泡',  tdesc:'愛喝水，收成時帶動相鄰作物'},
  {id:'aurora', name:'極光雪酪', cost:0,time:420, base:240, color:'#7ff0d8',lvl:0,gen:1,trait:'spark night',         tname:'極光',  tdesc:'夜行，收成時帶動相鄰作物'},
  {id:'moon',   name:'月光金沙', cost:0,time:1200,base:540, color:'#f0e0a0',lvl:0,gen:1,trait:'night heirloom',      tname:'月光',  tdesc:'夜行，品質運氣高，連種退步快'},
  {id:'rainbow',name:'彩虹糖霜', cost:0,time:300, base:270, color:'#ff9ad5',lvl:0,gen:2,trait:'hardy spark lucky',   tname:'彩虹',  tdesc:'不怕乾、帶動相鄰、品質運氣高'},
  {id:'typhoon',name:'熱帶颱風', cost:0,time:240, base:220, color:'#4fc3f7',lvl:0,gen:2,trait:'thirsty spark',       tname:'暴風',  tdesc:'愛喝水，收成時帶動相鄰作物'},
  {id:'galaxy', name:'銀河鑽石', cost:0,time:2400,base:1300,color:'#c9d6ff',lvl:0,gen:2,trait:'night heirloom lucky',tname:'星塵',  tdesc:'夜行，品質運氣極高，連種退步快'},
  {id:'phoenix',name:'鳳凰之淚', cost:0,time:3600,base:2800,color:'#ef4a4a',lvl:0,gen:3,trait:'lucky heirloom spark',tname:'不死鳥',tdesc:'品質運氣極高，收成時帶動相鄰作物'}
];
var QMULT=[1,1.3,1.8,2.6,4,8];
var RECIPES=[
  {a:'lazy',b:'lazy',out:'clover',ch:0.12},{a:'lazy',b:'purple',out:'mint',ch:0.55},{a:'lazy',b:'lemon',out:'lime',ch:0.55},
  {a:'purple',b:'lemon',out:'grape',ch:0.55},{a:'lemon',b:'milk',out:'aurora',ch:0.5},{a:'milk',b:'gold',out:'moon',ch:0.45},
  {a:'mint',b:'grape',out:'rainbow',ch:0.4},{a:'lime',b:'grape',out:'typhoon',ch:0.4},{a:'aurora',b:'moon',out:'galaxy',ch:0.3},
  {a:'rainbow',b:'galaxy',out:'phoenix',ch:0.2}
];
var WX=[{id:'sun',n:'晴天',d:'一切正常'},{id:'rain',n:'雨天',d:'自動澆水'},{id:'heat',n:'熱浪',d:'長得快，水也乾得快'},{id:'fog',n:'起霧',d:'品質運氣提高'},{id:'bow',n:'彩虹',d:'品質運氣大增'}];
var SEASONS=['春','夏','秋','冬'];
var SEASON_OF={lazy:0,clover:0,mint:0,lime:0,lemon:1,grape:1,typhoon:1,purple:2,gold:2,moon:2,rainbow:2,milk:3,aurora:3,galaxy:3,phoenix:3};
var TRIPS=[{n:'30 分',ms:1800000,rolls:1},{n:'2 小時',ms:7200000,rolls:3},{n:'8 小時',ms:28800000,rolls:8}];
var GOODS={juice:{name:'綜合果汁',desc:'兩種作物榨的，價格固定，不受行情和飽和影響。'},jam:{name:'手工果醬',desc:'三株同品種熬的，價格固定，不受行情和飽和影響。'}};
var PLOT_COST=[0,0,0,50,150,400,1000,2500,6000];
var UPG={
  fert:{name:'有機肥料',desc:'成長速度 +25%',max:3,cost:[120,500,2000]},
  sprinkler:{name:'自動灑水器',desc:'再也不用手動澆水',max:1,cost:[800]},
  speaker:{name:'Lofi 音響',desc:'植物聽了心情好，售價 +10%',max:3,cost:[200,900,3500]}
};
var RAR=[{n:'普通',c:'#8d8a99'},{n:'一般',c:'#f4f1ea'},{n:'精良',c:'#5aa0f2'},{n:'稀有',c:'#b06cf0'},{n:'傳說',c:'#f5c451'},{n:'神話',c:'#ef4a4a'}];
var SDESC={lazy:'長得快、不挑土，新手的好朋友。',purple:'聞起來像下雨前的雲。',lemon:'據說半夜會自己發光。',milk:'外星人最愛的口味。',gold:'阿嬤看了都說讚的傳家寶。',clover:'一千株裡才有一株的四片葉子。',mint:'涼涼的，像傍晚的風。',lime:'酸到會醒，但它自己很懶。',grape:'搖一搖會冒泡。',aurora:'在暗處會微微發光。',moon:'只在夜裡閃著金粉。',rainbow:'每一口顏色都不一樣。',typhoon:'靠近會聽到風聲。',galaxy:'裡面好像有星星在轉。',phoenix:'傳說枯掉了還會再長回來。'};
var ITEMS=[
  {id:'pickle',  name:'阿嬤的醃菜', rar:0, value:8,   desc:'阿嬤硬塞給你的，很下飯。'},
  {id:'hairball',name:'貓毛球',     rar:1, value:15,  desc:'摸貓的紀念品，意外地搶手。'},
  {id:'whistle', name:'警察的哨子', rar:2, value:120, desc:'警察杯杯走太急忘了帶走。'},
  {id:'meteor',  name:'外星隕石',   rar:3, value:400, desc:'幽浮掉下來的，摸起來溫溫的。'}
];
var PETS=[
  {id:'chick',name:'小雞啾啾',  rar:0,base:0.20,label:'收成經驗',   cost:{coins:150},        pace:60, hop:1,faceRight:true},
  {id:'cat',  name:'橘貓麻糬',  rar:1,base:0.10,label:'品質運氣', cost:{cat:3},            pace:90, hop:0,faceRight:false},
  {id:'dog',  name:'柴犬阿福',  rar:2,base:0.25,label:'裝傻成功率', cost:{coins:600},        pace:50, hop:0,faceRight:true},
  {id:'alien',name:'外星寶寶咕嚕',rar:3,base:0.15,label:'成長速度', cost:{item:'meteor',n:2},pace:120,hop:1,faceRight:true}
];
var ACH=[
  {id:'first', name:'第一次收成',   desc:'收成 1 株',           reward:20,  ok:function(s){return s.stats.harvest>=1;}},
  {id:'h50',   name:'綠手指',       desc:'收成 50 株',          reward:300, ok:function(s){return s.stats.harvest>=50;}},
  {id:'h300',  name:'農場老手',     desc:'收成 300 株',         reward:2000,ok:function(s){return s.stats.harvest>=300;}},
  {id:'rich',  name:'小有積蓄',     desc:'累積賺到 5,000 金幣', reward:500, ok:function(s){return s.stats.earned>=5000;}},
  {id:'land',  name:'大地主',       desc:'解鎖全部 9 塊地',     reward:1500,ok:function(s){return s.plots.every(function(p){return p.u;});}},
  {id:'gold',  name:'阿嬤的驕傲',   desc:'收成 1 株黃金阿嬤',   reward:800, ok:function(s){return s.stats.gold>=1;}},
  {id:'bluff', name:'九層塔大師',   desc:'對警察裝傻成功 3 次', reward:400, ok:function(s){return s.stats.bluff>=3;}},
  {id:'cat',   name:'貓奴',         desc:'摸流浪貓 5 次',       reward:150, ok:function(s){return s.stats.cat>=5;}},
  {id:'ufo',   name:'第三類接觸',   desc:'被幽浮光顧 1 次',     reward:200, ok:function(s){return s.stats.ufo>=1;}},
  {id:'zoo',   name:'動物園園長',   desc:'收集 4 隻寵物',       reward:1000,ok:function(s){return Object.keys(s.pets||{}).length>=4;}},
  {id:'legend',name:'傳說農夫',     desc:'收成 1 株傳說品質',   reward:500, ok:function(s){return s.stats.best>=4;}},
  {id:'myth',  name:'神話降臨',     desc:'收成 1 株神話品質',   reward:5000,ok:function(s){return s.stats.best>=5;}},
  {id:'task10',name:'使命必達',     desc:'完成 10 個限時任務',  reward:600, ok:function(s){return s.stats.tasks>=10;}},
  {id:'breed1',name:'育種新手',     desc:'配出第 1 個新品種',   reward:200, ok:function(s){return Object.keys(s.known||{}).length>=1;}},
  {id:'breedA',name:'育種大師',     desc:'發現全部 10 個新品種',reward:8000,ok:function(s){return Object.keys(s.known||{}).length>=10;}},
  {id:'decorA',name:'室內設計師',   desc:'買齊全部農場裝飾',     reward:5000,ok:function(s){return Object.keys(s.decor||{}).length>=8;}},
  {id:'dexHalf',name:'圖鑑收藏家',   desc:'圖鑑完成一半',         reward:3000,ok:function(s){return Object.keys(s.dex||{}).length>=45;}}
];
/* 農場裝飾：買了就會出現在農場上，每 1 點魅力讓市場售價 +1% */
var DECOR=[
  {id:'sign',     name:'木頭招牌',cost:300,  charm:1,desc:'寫著農場的名字'},
  {id:'flowers',  name:'圍籬花圃',cost:600,  charm:1,desc:'圍籬下開滿小花'},
  {id:'lamp',     name:'復古路燈',cost:1000, charm:2,desc:'整天亮著暖黃色的光'},
  {id:'birdhouse',name:'鳥屋',    cost:1500, charm:2,desc:'偶爾有小鳥停在上面'},
  {id:'scarecrow',name:'稻草人',  cost:2500, charm:3,desc:'戴著你的舊草帽'},
  {id:'lantern',  name:'石燈籠',  cost:4000, charm:3,desc:'很有禪意'},
  {id:'windmill', name:'風車',    cost:9000, charm:5,desc:'葉片會慢慢轉'},
  {id:'goldroof', name:'金色屋頂',cost:25000,charm:8,desc:'把小屋的屋頂換成金色'},
  {id:'trophy',   name:'冠軍獎盃',cost:0,    charm:6,desc:'品評會的榮耀',rep:1}
];
/* 角色外觀 */
var HATS=[{id:'straw',name:'草帽',cost:0,c:'#e8c36a'},{id:'none',name:'不戴帽子',cost:0,c:'#6b4a3a'},{id:'cap',name:'紅色棒球帽',cost:400,c:'#d9505a'},{id:'beanie',name:'藍色毛帽',cost:800,c:'#5aa0f2'},{id:'crown',name:'金皇冠',cost:20000,c:'#f5c451'},{id:'wizard',name:'巫師帽',cost:0,c:'#7a4fd0',rep:1}];
var SHIRTS=[{id:'red',name:'磚紅上衣',cost:0,c:'#d9705a'},{id:'green',name:'草綠上衣',cost:300,c:'#6fbf5f'},{id:'blue',name:'海藍上衣',cost:300,c:'#5aa0f2'},{id:'purple',name:'葡萄紫上衣',cost:600,c:'#b06cf0'},{id:'black',name:'黑色帽 T',cost:1200,c:'#35284f'},{id:'gold',name:'金色外套',cost:15000,c:'#f5c451'}];
/* 品評會：每週一個指定品種，交出一株比品質。名次獎勵依序是第 1、2、3 名和參加獎 */
var CONTEST_REWARD=[{rep:30,coins:1500},{rep:18,coins:800},{rep:10,coins:400},{rep:4,coins:100}];
/* 聲望商店：只能用聲望換，金幣買不到 */
var REPSHOP=[
  {id:'charm', name:'幸運符 ×5',      cost:10,desc:'接下來 5 次收成品質運氣大增'},
  {id:'seed1', name:'第一代配種種子', cost:15,desc:'隨機一種第一代品種的種子'},
  {id:'seed2', name:'第二代配種種子', cost:60,desc:'隨機一種第二代品種的種子'},
  {id:'wizard',name:'巫師帽',         cost:50,desc:'服飾店買不到的帽子',once:1},
  {id:'trophy',name:'冠軍獎盃',       cost:80,desc:'擺在農場上，魅力 +6',once:1}
];
/* 居民故事：同一位居民每交貨 3 次解鎖一段，到他家聽。hint 是配方線索（填配種結果的 id） */
var STORIES={
  '隔壁阿嬤':[
    {t:'「少年欸，阿嬤跟你說，懶懶綠跟紫雲朵種在一起，以前會長出涼涼的那種。」',hint:'mint',rep:5},
    {t:'「懶懶綠自己跟自己配，十次有一次會多一片葉子，阿嬤年輕時看過。」',hint:'clover',rep:8},
    {t:'「我那個黃金的，要配宇宙奶昔，晚上才會發光。那是你阿公最愛的。」',hint:'moon',item:'pickle',n:3,rep:12}],
  '警察杯杯':[
    {t:'「上次那個九層塔…咳。我是說，懶懶綠配檸檬電波，我老家也有人這樣種。」',hint:'lime',rep:5},
    {t:'「巡邏時看過有人把青檸懶骨頭跟葡萄汽水放一起，那天風特別大。」',hint:'typhoon',rep:8},
    {t:'「這個哨子你留著，我有新的了。以後巡邏我會多幫你看著田。」',item:'whistle',n:2,rep:12}],
  '早餐店老闆':[
    {t:'「紫雲朵加檸檬電波，打成汁會冒泡，我本來想放進菜單。」',hint:'grape',rep:5},
    {t:'「薄荷晚霞配葡萄汽水，顏色會一層一層的，小朋友最愛。」',hint:'rainbow',rep:8},
    {t:'「你種的東西我信得過。以後有好料記得先留給我。」',charm:3,rep:12}],
  '廟口里長':[
    {t:'「檸檬電波跟宇宙奶昔配在一起，會看到極光。土地公託夢說的。」',hint:'aurora',rep:5},
    {t:'「極光雪酪配月光金沙，那個叫銀河。我只聽過，沒看過。」',hint:'galaxy',rep:8},
    {t:'「這張符給你，保平安，也保收成。」',charm:5,rep:12}],
  '外星觀光客':[
    {t:'「你們星球的隕石，在我們那邊是伴手禮。送你一顆。」',item:'meteor',n:1,rep:5},
    {t:'「母星有個傳說：彩虹糖霜遇上銀河鑽石，會生出不死的鳥。」',hint:'phoenix',rep:8},
    {t:'「我要回去了，這個留給你。它在晚上長得特別好。」',seed:'aurora',n:2,rep:12}]
};
