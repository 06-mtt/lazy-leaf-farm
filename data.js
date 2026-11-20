'use strict';
/* 題材與數值設定：品種、配方、物品、寵物、成就、天氣的名稱和數字都在這個檔案。
   之後要換題材（例如改成外星草藥），改這個檔案和 index.html 的標題就可以。 */
var STRAINS=[
  {id:'lazy',  name:'懶懶綠',   cost:5,   time:300,   base:17,  color:'#8fd67a', lvl:1, trait:'hardy',   tname:'好養',     tdesc:'忘記澆水也不影響品質'},
  {id:'purple',name:'紫雲朵',   cost:15,  time:900,   base:48,  color:'#b48cf2', lvl:2, trait:'thirsty', tname:'愛喝水',   tdesc:'要澆比較多次，全程沒乾過品質運氣大增'},
  {id:'lemon', name:'檸檬電波', cost:40,  time:2400,  base:110, color:'#f2e35c', lvl:4, trait:'spark',   tname:'電波',     tdesc:'收成時讓上下左右的作物瞬間長大一截'},
  {id:'milk',  name:'宇宙奶昔', cost:90,  time:6000,  base:230, color:'#7fd8f0', lvl:6, trait:'night',   tname:'夜行',     tdesc:'晚上 6 點到早上 6 點長得快，白天長得慢'},
  {id:'gold',  name:'黃金阿嬤', cost:200, time:18000, base:540, color:'#f5b942', lvl:9, trait:'heirloom',tname:'慢工細活', tdesc:'品質運氣高，但同一塊地連種會退步得更快'},
  /* 以下是配種才能得到的品種，種子買不到。time 是成長秒數 */
  {id:'clover', name:'四葉懶懶', cost:0,time:450,  base:34,  color:'#5fd08a',lvl:0,gen:1,trait:'hardy lucky',         tname:'幸運',  tdesc:'不怕乾，品質運氣特別高'},
  {id:'mint',   name:'薄荷晚霞', cost:0,time:600,  base:45,  color:'#7fe0c0',lvl:0,gen:1,trait:'hardy',               tname:'清涼',  tdesc:'不怕乾，比懶懶綠值錢'},
  {id:'lime',   name:'青檸懶骨頭',cost:0,time:1200, base:80,  color:'#c6e85c',lvl:0,gen:1,trait:'hardy spark',         tname:'懶電波',tdesc:'不怕乾，收成時帶動相鄰作物'},
  {id:'grape',  name:'葡萄汽水', cost:0,time:1800, base:125, color:'#9a6cf0',lvl:0,gen:1,trait:'thirsty spark',       tname:'氣泡',  tdesc:'愛喝水，收成時帶動相鄰作物'},
  {id:'aurora', name:'極光雪酪', cost:0,time:4200, base:240, color:'#7ff0d8',lvl:0,gen:1,trait:'spark night',         tname:'極光',  tdesc:'夜行，收成時帶動相鄰作物'},
  {id:'moon',   name:'月光金沙', cost:0,time:12000,base:540, color:'#f0e0a0',lvl:0,gen:1,trait:'night heirloom',      tname:'月光',  tdesc:'夜行，品質運氣高，連種退步快'},
  {id:'rainbow',name:'彩虹糖霜', cost:0,time:3000, base:270, color:'#ff9ad5',lvl:0,gen:2,trait:'hardy spark lucky',   tname:'彩虹',  tdesc:'不怕乾、帶動相鄰、品質運氣高'},
  {id:'typhoon',name:'熱帶颱風', cost:0,time:2400, base:220, color:'#4fc3f7',lvl:0,gen:2,trait:'thirsty spark',       tname:'暴風',  tdesc:'愛喝水，收成時帶動相鄰作物'},
  {id:'galaxy', name:'銀河鑽石', cost:0,time:24000,base:1300,color:'#c9d6ff',lvl:0,gen:2,trait:'night heirloom lucky',tname:'星塵',  tdesc:'夜行，品質運氣極高，連種退步快'},
  {id:'phoenix',name:'鳳凰之淚', cost:0,time:36000,base:2800,color:'#ef4a4a',lvl:0,gen:3,trait:'lucky heirloom spark',tname:'不死鳥',tdesc:'品質運氣極高，收成時帶動相鄰作物'},
  /* 第二批配種品種 */
  {id:'cotton', name:'雲朵棉花糖',cost:0,time:1500, base:95,  color:'#f0e6ff',lvl:0,gen:1,trait:'hardy night',         tname:'軟綿',  tdesc:'不怕乾、夜行'},
  {id:'bubble', name:'深海泡泡', cost:0,time:3600, base:190, color:'#4a8fe0',lvl:0,gen:1,trait:'thirsty night',       tname:'深海',  tdesc:'愛喝水、夜行'},
  {id:'honey',  name:'太陽蜂蜜', cost:0,time:9000, base:420, color:'#ffc93c',lvl:0,gen:1,trait:'spark heirloom',      tname:'蜂蜜',  tdesc:'帶動相鄰作物，品質運氣高，連種退步快'},
  {id:'lavender',name:'薰衣草奶茶',cost:0,time:6000,base:300, color:'#c3a6f5',lvl:0,gen:1,trait:'thirsty lucky',       tname:'香氣',  tdesc:'愛喝水，品質運氣高'},
  {id:'cocoa',  name:'午夜可可', cost:0,time:4800, base:250, color:'#8a5a44',lvl:0,gen:1,trait:'night lucky',         tname:'可可',  tdesc:'夜行，品質運氣高'},
  {id:'dream',  name:'夢遊綿羊', cost:0,time:3600, base:330, color:'#fff6d8',lvl:0,gen:2,trait:'hardy night lucky',   tname:'好夢',  tdesc:'不怕乾、夜行、品質運氣高'},
  {id:'coral',  name:'珊瑚汽泡', cost:0,time:7200, base:520, color:'#ff7f7f',lvl:0,gen:2,trait:'thirsty spark',       tname:'珊瑚',  tdesc:'愛喝水，帶動相鄰作物'},
  {id:'eclipse',name:'日蝕金冠', cost:0,time:18000,base:1100,color:'#5a3a8a',lvl:0,gen:2,trait:'night heirloom spark',tname:'日蝕',  tdesc:'夜行，品質運氣高，帶動相鄰作物'},
  {id:'teatime',name:'午後花園', cost:0,time:9000, base:600, color:'#9fe0a0',lvl:0,gen:2,trait:'hardy lucky',         tname:'午茶',  tdesc:'不怕乾，品質運氣高'},
  {id:'abyss',  name:'深淵龍鬚', cost:0,time:30000,base:2400,color:'#2fb8a8',lvl:0,gen:3,trait:'thirsty night lucky', tname:'深淵',  tdesc:'愛喝水、夜行、品質運氣極高'},
  {id:'skygarden',name:'天空樹', cost:0,time:27000,base:2200,color:'#b8f0ff',lvl:0,gen:3,trait:'hardy lucky spark',   tname:'天空',  tdesc:'不怕乾、品質運氣高、帶動相鄰作物'},
  {id:'cosmos', name:'宇宙之心', cost:0,time:54000,base:6000,color:'#ff5ad0',lvl:0,gen:4,trait:'lucky heirloom spark night',tname:'宇宙',tdesc:'夜行，品質運氣極高，帶動相鄰作物'},
  /* 合作配種才拿得到 */
  {id:'friendleaf',name:'友情草',  cost:0,time:1800,base:160,color:'#ffb3c7',lvl:0,gen:1,coop:1,trait:'hardy lucky',      tname:'友情',  tdesc:'和朋友合作配種才拿得到，不怕乾、品質運氣高'},
  {id:'twinstar',  name:'雙子星雲',cost:0,time:9000,base:900,color:'#9fe3ff',lvl:0,gen:2,coop:1,trait:'night spark lucky',tname:'雙子星',tdesc:'兩個配種品種合作才配得出，夜行、帶動相鄰、品質運氣高'},
  /* 限時活動才買得到種子 */
  {id:'maple',  name:'楓糖草',cost:30,time:1200,base:75, color:'#d9822b',lvl:1,ev:'autumn',trait:'lucky',      tname:'秋收',tdesc:'品質運氣高，只有秋收祭期間買得到種子'},
  {id:'snow',   name:'雪花糖',cost:50,time:3000,base:150,color:'#e8f4ff',lvl:1,ev:'xmas',  trait:'night hardy',tname:'雪夜',tdesc:'夜行、不怕乾，只有聖誕節期間買得到種子'},
  {id:'hongbao',name:'紅包草',cost:88,time:6000,base:288,color:'#e83a3a',lvl:1,ev:'lny',   trait:'lucky spark',tname:'好運',tdesc:'品質運氣高、帶動相鄰，只有春節期間買得到種子'}
];
var QMULT=[1,1.3,1.8,2.6,4,8];
var RECIPES=[
  {a:'lazy',b:'lazy',out:'clover',ch:0.12},{a:'lazy',b:'purple',out:'mint',ch:0.55},{a:'lazy',b:'lemon',out:'lime',ch:0.55},
  {a:'purple',b:'lemon',out:'grape',ch:0.55},{a:'lemon',b:'milk',out:'aurora',ch:0.5},{a:'milk',b:'gold',out:'moon',ch:0.45},
  {a:'mint',b:'grape',out:'rainbow',ch:0.4},{a:'lime',b:'grape',out:'typhoon',ch:0.4},{a:'aurora',b:'moon',out:'galaxy',ch:0.3},
  {a:'rainbow',b:'galaxy',out:'phoenix',ch:0.2},
  {a:'lazy',b:'milk',out:'cotton',ch:0.5},{a:'purple',b:'milk',out:'bubble',ch:0.5},{a:'lemon',b:'gold',out:'honey',ch:0.45},
  {a:'purple',b:'gold',out:'lavender',ch:0.45},{a:'milk',b:'milk',out:'cocoa',ch:0.15},
  {a:'clover',b:'cotton',out:'dream',ch:0.35},{a:'bubble',b:'typhoon',out:'coral',ch:0.35},{a:'honey',b:'moon',out:'eclipse',ch:0.3},
  {a:'lavender',b:'cocoa',out:'teatime',ch:0.35},
  {a:'coral',b:'eclipse',out:'abyss',ch:0.2},{a:'dream',b:'teatime',out:'skygarden',ch:0.2},
  {a:'phoenix',b:'abyss',out:'cosmos',ch:0.1}
];
var WX=[{id:'sun',n:'晴天',d:'一切正常'},{id:'rain',n:'雨天',d:'自動澆水'},{id:'heat',n:'熱浪',d:'長得快，水也乾得快'},{id:'fog',n:'起霧',d:'品質運氣提高'},{id:'bow',n:'彩虹',d:'品質運氣大增'}];
var SEASONS=['春','夏','秋','冬'];
var SEASON_OF={lazy:0,clover:0,mint:0,lime:0,lemon:1,grape:1,typhoon:1,purple:2,gold:2,moon:2,rainbow:2,milk:3,aurora:3,galaxy:3,phoenix:3,friendleaf:0,twinstar:3,maple:2,snow:3,hongbao:0,cotton:3,bubble:1,honey:1,lavender:0,cocoa:3,dream:3,coral:1,eclipse:2,teatime:0,abyss:1,skygarden:0,cosmos:3};
var TRIPS=[{n:'30 分',ms:1800000,rolls:1},{n:'2 小時',ms:7200000,rolls:3},{n:'8 小時',ms:28800000,rolls:8}];
var GOODS={juice:{name:'綜合果汁',desc:'兩種作物榨的，價格固定，不受行情和飽和影響。'},jam:{name:'手工果醬',desc:'三株同品種熬的，價格固定，不受行情和飽和影響。'}};
var PLOT_COST=[0,0,0,50,150,400,1000,2500,6000];
var UPG={
  fert:{name:'有機肥料',desc:'成長速度 +25%',max:3,cost:[120,500,2000]},
  sprinkler:{name:'自動灑水器',desc:'再也不用手動澆水',max:1,cost:[800]},
  speaker:{name:'Lofi 音響',desc:'植物聽了心情好，售價 +10%',max:3,cost:[200,900,3500]}
};
var RAR=[{n:'普通',c:'#8d8a99'},{n:'一般',c:'#f4f1ea'},{n:'精良',c:'#5aa0f2'},{n:'稀有',c:'#b06cf0'},{n:'傳說',c:'#f5c451'},{n:'神話',c:'#ef4a4a'}];
var SDESC={lazy:'長得快、不挑土，新手的好朋友。',purple:'聞起來像下雨前的雲。',lemon:'據說半夜會自己發光。',milk:'外星人最愛的口味。',gold:'阿嬤看了都說讚的傳家寶。',friendleaf:'兩個人一起種，才長得出來。',twinstar:'兩顆星星繞著彼此轉。',maple:'甜甜的，像秋天的早餐。',snow:'摸起來涼涼的，不會融化。',hongbao:'打開會掉出一枚金幣，不知道為什麼。',clover:'一千株裡才有一株的四片葉子。',mint:'涼涼的，像傍晚的風。',lime:'酸到會醒，但它自己很懶。',grape:'搖一搖會冒泡。',aurora:'在暗處會微微發光。',moon:'只在夜裡閃著金粉。',rainbow:'每一口顏色都不一樣。',typhoon:'靠近會聽到風聲。',galaxy:'裡面好像有星星在轉。',phoenix:'傳說枯掉了還會再長回來。'};
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
  {id:'alien',name:'外星寶寶咕嚕',rar:3,base:0.15,label:'成長速度', cost:{item:'meteor',n:2},pace:120,hop:1,faceRight:true},
  {id:'frog', name:'青蛙呱呱',  rar:1,base:0.30,label:'澆水撐得更久', cost:{stat:'fish',n:10,how:'釣到魚'},     pace:70, hop:1,faceRight:true},
  {id:'bunny',name:'兔子棉棉',  rar:1,base:0.15,label:'收成退回種子機率',cost:{stat:'harvest',n:750,how:'收成作物'},pace:45,hop:1,faceRight:true},
  {id:'owl',  name:'貓頭鷹咕咕',rar:2,base:0.08,label:'配種成功率', cost:{stat:'breed',n:8,how:'配種成功'},    pace:140,hop:0,faceRight:true},
  {id:'fox',  name:'狐狸小紅',  rar:2,base:0.08,label:'市場售價',   cost:{stat:'help',n:10,how:'幫好友澆水'},  pace:55, hop:0,faceRight:true},
  {id:'hog',  name:'刺蝟球球',  rar:3,base:0.25,label:'探險收穫',   cost:{trip:1},                              pace:150,hop:0,faceRight:true},
  {id:'dragon',name:'小龍阿焰', rar:4,base:0.12,label:'品質運氣',   cost:{item:'fish5',n:1,crop:'phoenix'},     pace:80, hop:1,faceRight:true}
];
var ACH=[
  {id:'first', name:'第一次收成',   desc:'收成 1 次',           reward:20,  ok:function(s){return s.stats.harvest>=1;}},
  {id:'h50',   name:'綠手指',       desc:'收成 250 個',         reward:300, ok:function(s){return s.stats.harvest>=250;}},
  {id:'h300',  name:'農場老手',     desc:'收成 1,500 個',       reward:2000,ok:function(s){return s.stats.harvest>=1500;}},
  {id:'rich',  name:'小有積蓄',     desc:'累積賺到 5,000 金幣', reward:500, ok:function(s){return s.stats.earned>=5000;}},
  {id:'land',  name:'大地主',       desc:'解鎖全部 9 塊地',     reward:1500,ok:function(s){return s.plots.every(function(p){return p.u;});}},
  {id:'gold',  name:'阿嬤的驕傲',   desc:'收成 1 次黃金阿嬤',   reward:800, ok:function(s){return s.stats.gold>=1;}},
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
  {id:'zoo2',  name:'萬獸之王',     desc:'收集全部 10 隻寵物',   reward:6000,ok:function(s){return Object.keys(s.pets||{}).length>=10;}},
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
  {id:'trophy',   name:'冠軍獎盃',cost:0,    charm:6,desc:'品評會的榮耀',rep:1},
  {id:'pumpkin',  name:'南瓜燈',  cost:800,  charm:2,desc:'秋收祭限定',ev:'autumn'},
  {id:'xtree',    name:'聖誕樹',  cost:1500, charm:3,desc:'聖誕節限定',ev:'xmas'},
  {id:'couplet',  name:'春聯',    cost:888,  charm:2,desc:'春節限定，貼在小屋門口',ev:'lny'}
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
/* 小鎮土地上可以蓋的建築：per 是每格的建造費 */
var BUILDINGS=[
  {id:'green', name:'溫室',per:150,c:'#7fd8f0',desc:'自動長出作物，每 10 格每小時 1 株，最多累積 8 小時'},
  {id:'inn',   name:'民宿',per:200,c:'#ee9a72',desc:'收租金，每格每小時 10 金幣，最多累積 8 小時'},
  {id:'garden',name:'花園',per:100,c:'#ef7a8a',desc:'每 5 格讓農場魅力 +1（所有花園合計最多 +30）'}
];
/* 釣魚：w 是上鉤機率的權重 */
/* 魚：w 是上鉤機率的權重；wx 限定天氣、night 限定夜晚(1)或白天(0)、bait 是最低魚餌等級（1 魚餌、2 高級魚餌）；size 是公分範圍 */
var FISH=[
  {id:'fish1', w:50, c:'#9a8fb8',size:[6,15]},
  {id:'fish2', w:28, c:'#f4f1ea',size:[20,60]},
  {id:'fish3', w:15, c:'#5aa0f2',size:[5,20]},
  {id:'fish4', w:5.5,c:'#b06cf0',size:[30,90]},
  {id:'fish5', w:1.5,c:'#f5c451',size:[40,120]},
  {id:'fish6', w:25, c:'#8a7a5a',size:[8,20],  wx:['rain']},
  {id:'fish7', w:18, c:'#6a8a9a',size:[30,100],bait:1},
  {id:'fish8', w:12, c:'#7ff0d8',size:[4,12],  bait:1,night:1},
  {id:'fish9', w:12, c:'#ffb347',size:[10,25], bait:1,night:0,wx:['sun','heat']},
  {id:'fish10',w:6,  c:'#cfd8e8',size:[15,40], bait:1,wx:['fog']},
  {id:'fish11',w:5,  c:'#5a4a9a',size:[40,130],bait:2,night:1},
  {id:'fish12',w:3,  c:'#ff8ad0',size:[25,70], bait:1,wx:['bow']},
  {id:'fish13',w:1.5,c:'#ffd700',size:[60,150],bait:2}
];
/* 釣魚體力：上限 30，每 8 分鐘回 1（約 4 小時回滿） */
var FISH_EN={max:30,regen:480000};
ITEMS.push(
  {id:'fish1', name:'小溪魚',  rar:0,value:20},
  {id:'fish2', name:'鯉魚',    rar:1,value:60},
  {id:'fish3', name:'金魚',    rar:2,value:180},
  {id:'fish4', name:'錦鯉',    rar:3,value:600},
  {id:'fish5', name:'龍魚',    rar:4,value:2500},
  {id:'fish6', name:'泥鰍',    rar:0,value:30},
  {id:'fish7', name:'鯰魚',    rar:1,value:90},
  {id:'fish8', name:'螢光魚',  rar:2,value:220},
  {id:'fish9', name:'太陽魚',  rar:2,value:200},
  {id:'fish10',name:'霧隱魚',  rar:3,value:700},
  {id:'fish11',name:'月光鰻',  rar:3,value:800},
  {id:'fish12',name:'彩虹鱒',  rar:4,value:2200},
  {id:'fish13',name:'黃金鯉王',rar:4,value:3000}
);
/* 寵物成長：餵食累積經驗，達到門檻升一級（最高 5 級）。每隻每天最多餵 10 次 */
var PET_LV=[30,90,200,400,800], PET_FEED_MAX=10, FEED_FISH=[3,6,12,25,60], FEED_CROP=[1,1,2,3,5,8];
ACH.push(
  {id:'land3', name:'包租公',   desc:'在小鎮買下 3 塊地',reward:2000,ok:function(s){return Object.keys(s.land||{}).length>=3;}},
  {id:'dragon',name:'釣魚高手', desc:'釣到一條龍魚',     reward:3000,ok:function(s){return (s.items||{}).fish5!==undefined;}},
  {id:'fishdex',name:'魚類博士', desc:'釣到全部 13 種魚',  reward:6000,ok:function(s){return Object.keys(s.fishRec||{}).length>=13;}},
  {id:'petmax', name:'最佳拍檔', desc:'把一隻寵物養到成長 5 級',reward:5000,ok:function(s){return Object.keys(s.pets||{}).some(function(k){return (s.pets[k].exp||0)>=800;});}}
);
/* 雲端：Supabase 專案的網址和公開金鑰。這把金鑰本來就是給網頁用的，可以公開；
   資料靠資料庫裡的規則保護，每個人只能讀寫自己的存檔 */
var CLOUD={url:'https://jsjjqieyizonghogafrl.supabase.co',key:'sb_publishable_ltN1Rso7c258EKLRZBtUEw_O_SYfwzu'};
/* 限時活動：from/to 是台灣日期（含頭尾），weekly 是星期幾（0 是星期日） */
var EVENTS_CAL=[
  {id:'autumn', name:'秋收祭',  from:'2026-11-15',to:'2026-11-30',desc:'收成經驗 +50%；商店限定「楓糖草」和「南瓜燈」',xp:1.5},
  {id:'xmas',   name:'聖誕節',  from:'2026-12-20',to:'2026-12-31',desc:'市場售價 +20%；限定「雪花糖」和「聖誕樹」',sell:1.2},
  {id:'lny',    name:'春節',    from:'2027-02-05',to:'2027-02-20',desc:'每天第一次收成送 88 金幣紅包；限定「紅包草」和「春聯」',hongbao:88},
  {id:'weekend',name:'週末市集',weekly:[6,0],desc:'週六、週日市場售價 +10%',sell:1.1}
];
