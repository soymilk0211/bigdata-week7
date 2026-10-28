// Generated from data.js, party_data.js, engine.js, party_engine.js, sync.js, net.js, audio_system.js, ui_party.js, app.js. Run node build.mjs (or build.ps1) after source edits.
'use strict';
// 派對棋盤資料：企業技能、道具、格子與即時事件。
const SECTORS=['製造業','消費業','金融業','能源與運輸','民生業','科技業'];

const ROLES=[
  {id:'auto',name:'汽車製造商',sector:'製造業',icon:'🚘',skill:{name:'關稅壁壘',icon:'🧱',desc:'接下來 2 回合，其他玩家踩紅格扣款翻倍。',target:'none'}},
  {id:'electronics',name:'電子製造商',sector:'製造業',icon:'💻',skill:{name:'專利訴訟',icon:'⚖️',desc:'指定玩家下回合暫停行動，並轉移 200 總資產給你。',target:'opponent'}},
  {id:'retail',name:'百貨零售商',sector:'消費業',icon:'🛍️',skill:{name:'瘋狂週年慶',icon:'🎊',desc:'本回合其他玩家踩藍格賺的總資產，全部存入你的帳戶。',target:'none'}},
  {id:'bank',name:'銀行',sector:'金融業',icon:'🏦',skill:{name:'緊縮銀根',icon:'🔒',desc:'指定玩家下回合只能前進 1 格，且踩格拿不到獎勵。',target:'opponent'}},
  {id:'investment',name:'投資公司',sector:'金融業',icon:'📈',skill:{name:'惡意做空',icon:'🔻',desc:'竊取指定玩家 25% 總資產（最多 500），壯大自己的總資產池。',target:'opponent'}},
  {id:'energy',name:'能源公司',sector:'能源與運輸',icon:'⚡',skill:{name:'限電危機',icon:'🔌',desc:'指定一個產業：該產業玩家本回合禁用技能，且下次踩格強制視為紅格。',target:'sector'}},
  {id:'logistics',name:'物流運輸公司',sector:'能源與運輸',icon:'🚚',skill:{name:'扣留貨物',icon:'📦',desc:'把罷工幽靈移到指定玩家前方 1–3 格，擋住他的去路。',target:'opponent'}},
  {id:'property',name:'房地產公司',sector:'民生業',icon:'🏙️',skill:{name:'炒地皮',icon:'🏗️',desc:'指定玩家接下來 2 個回合，每回合付你 100 租金。',target:'opponent'}},
  {id:'agriculture',name:'農業食品公司',sector:'民生業',icon:'🌾',skill:{name:'糧食霸權',icon:'🍚',desc:'所有對手損失 150 總資產，其中半數轉給你。',target:'none'}},
  {id:'technology',name:'科技服務公司',sector:'科技業',icon:'🧪',skill:{name:'駭客攻擊',icon:'🕶️',desc:'隨機刪除指定玩家 1 點技能能量，或偷取 300 總資產。',target:'opponent'}}
];

const ITEMS=[
  {id:'shield',name:'買保險',icon:'🛡️',desc:'獲得 1 層護盾，維持到下次自己回合開始，可疊加並抵擋 1 次其他玩家的負面干擾。'},
  {id:'dice123',name:'123 骰子',icon:'🎲',desc:'本回合擲骰必定落在 1、2 或 3，覆蓋先前的變骰效果。'},
  {id:'dice456',name:'456 骰子',icon:'🎲',desc:'本回合擲骰必定落在 4、5 或 6，覆蓋先前的變骰效果。'},
  {id:'swap',name:'移形換位',icon:'🔄',desc:'選擇一位對手互換位置，雙方立刻觸發落地格效果；擲骰前可重複使用。'},
  {id:'leverage',name:'開槓桿',icon:'📈',desc:'本回合踩格效果 ×2，包含獲利、扣款、技能能量與幽靈格扣款。'}
];

const TILE_COLORS={start:'出發',blue:'發財',red:'蕭條',yellow:'技能',green:'事件'};
const TILE_ICONS={start:'🚩',blue:'💰',red:'📉',yellow:'⚡',green:'❓'};
const TILE_VALUES={blue:300,red:150,yellow:1,green:0,start:0};
const TILE_ORDER=['start','blue','red','yellow','green','blue','blue','red','yellow','green','blue','red','yellow','green','blue','red','yellow','green','blue','blue','red','yellow','green','blue'];
const BOARD=TILE_ORDER.map((type,index)=>({
  index,
  type,
  label:TILE_COLORS[type],
  icon:TILE_ICONS[type],
  value:TILE_VALUES[type],
  stay:type==='start'?'在地圖四個角落取得紅、綠、藍、黃四種記號後，經過出發點可領取1000元補助金，領取後記號重置':type==='blue'?'發財格：獲得總資產':type==='red'?'蕭條格：扣除營運費':type==='yellow'?'技能格：補充技能能量':type==='green'?'事件格：抽一張即時事件':'出發格'
}));

const PARTY_EVENTS=[
  {id:'G01',name:'全體股東紅利',icon:'🎉',kind:'allCash',amount:400,text:'景氣大好，全體玩家各獲得 400 總資產。'},
  {id:'G02',name:'市場恐慌拋售',icon:'🌪️',kind:'allCash',amount:-200,text:'市場信心崩跌，全體玩家各損失 200 總資產。'},
  {id:'G03',name:'政府紓困案',icon:'🏛️',kind:'selfCash',amount:500,text:'政府點名補助，你獲得 500 總資產。'},
  {id:'G04',name:'同業搶單',icon:'🥊',kind:'selfCash',amount:-250,text:'競爭對手截走訂單，你損失 250 總資產。'},
  {id:'G05',name:'技術突破',icon:'💡',kind:'selfEnergy',amount:2,text:'研發團隊傳來好消息，你獲得 2 點技能能量。'},
  {id:'G06',name:'幽靈騷動',icon:'👻',kind:'allEnergy',amount:-1,text:'罷工幽靈四處作亂，全體玩家失去 1 點技能能量。'}
];

const DECISION_OPTIONS=[
  {id:'invest',label:'A · 投資研發',icon:'🔬',desc:'支付 300 總資產，立刻獲得 2 點技能能量。',cash:-300,energy:2},
  {id:'squeeze',label:'B · 壓榨勞工',icon:'🏭',desc:'立刻獲得 200 總資產，但失去 1 點技能能量。',cash:200,energy:-1}
];

const ITEM_CHANCE=0.2;
const STAR_COST=1000;
const STAR_GOAL=3;
const ACQUIRE_COST=2000;
const ACQUIRE_DISCOUNT_COST=1000;
const REBEL_COST=1000;
const START_CASH=2000;


// ============================================================================
// 派對擴充資料層（非破壞性新增）
// 所有新模式、神話道具、特殊格、輪盤與決策都集中在這個檔案。
// ============================================================================

const GAME_MODES = {
  star: {
    id: 'star',
    name: '企業之星',
    short: '企業之星',
    icon: '🌟',
    cup: '企業之星盃',
    color: '#ca9451',
    desc: '起步後每次經過或踩到起始格都能購買星星，只有「在起始格買星」會讓星價上漲；達到房間設定的勝利星數後，當季結算星數最高的獲勝！',
    win: '先拿到房間設定的勝利星數；或當季結算時星數最高。',
    defaultRounds: 20,
    defaultTarget: 3,
    starGoal: 3
  },
  tycoon: {
    id: 'tycoon',
    name: '首富競爭',
    short: '首富競爭',
    icon: '💰',
    cup: '首富競爭盃',
    color: '#c55d5d',
    desc: '達到房間設定的總資產目標即獲勝。季數過半通膨 2 倍，倒數兩季通膨 4 倍，總資產瞬間變薄也瞬間暴漲。',
    win: '總資產率先達到房間設定的目標；季末比較總資產。',
    defaultRounds: 30,
    defaultTarget: 8000,
    starGoal: 3
  },
  evil: {
    id: 'evil',
    name: '邪惡企業',
    short: '邪惡企業',
    icon: '💀',
    cup: '邪惡企業盃',
    color: '#7a60ad',
    desc: '生存模式。每 5 季杜芬舒斯大樓發射雷射收保護費，付不出來就變成藍色幽靈，直到只剩唯一的倖存者。',
    win: '成為唯一的倖存者；季末比較生還季數。',
    defaultRounds: 20,
    defaultTarget: 0,
    starGoal: 3
  },
  random: {
    id: 'random',
    name: '隨機模式',
    short: '隨機',
    icon: '🎲',
    cup: '命運隨機盃',
    color: '#5979b0',
    desc: '開局時從企業之星、首富競爭、邪惡企業中隨機抽一種模式，抽到什麼就玩什麼。',
    win: '依隨機抽到的模式決定。',
    defaultRounds: 12,
    defaultTarget: 0,
    starGoal: 3
  }
};

const MODE_IDS = ['star', 'tycoon', 'evil'];

const RANDOM_ROLE_ID = 'random';

// 十大企業翻新：保留原本十個角色欄位與顏色，全面換成派對化技能。
const PARTY_ROLES = [
  {
    id: 'social', name: '社群媒體巨頭', sector: '科技業', icon: '📱',
    skill: {
      id: 'burn', name: '炎上商法', icon: '🔥', target: 'opponent',
      desc: '指定對手下回合套用 123 骰子，且踩紅格扣款翻倍。'
    }
  },
  {
    id: 'hardware', name: '智慧硬體大廠', sector: '製造業', icon: '⌚',
    skill: {
      id: 'obsolete', name: '計畫性報廢', icon: '🧨', target: 'opponent',
      desc: '摧毀對手 1 個道具，並轉化為自己 200 總資產。'
    }
  },
  {
    id: 'ecommerce', name: '電商平台寡頭', sector: '消費業', icon: '🛒',
    skill: {
      id: 'shopping', name: '購物節狂歡', icon: '🎁', target: 'none',
      desc: '立刻吸取全場對手各 80 元，且本回合自己踩格效果無效化（無敵）。'
    }
  },
  {
    id: 'investment', name: '吸血投資集團', sector: '金融業', icon: '🩸',
    skill: {
      id: 'short', name: '惡意做空', icon: '📉', target: 'opponent',
      desc: '偷取 150 元；若對方總資產低於你，額外偷 1 個道具。'
    }
  },
  {
    id: 'fastfood', name: '跨國速食連鎖', sector: '消費業', icon: '🍔',
    skill: {
      id: 'junk', name: '垃圾食物成癮', icon: '🍟', target: 'none',
      desc: '全場對手扣 100 元，每扣成功一人自己回饋 50 元。'
    }
  },
  {
    id: 'delivery', name: '外送平台巨頭', sector: '能源與運輸', icon: '🛵',
    skill: {
      id: 'ghostOrder', name: '幽靈派單', icon: '👻', target: 'tile',
      desc: '將罷工幽靈隨意放置在地圖上任意格（出發格除外）。'
    }
  },
  {
    id: 'bank', name: '傳統金控銀行', sector: '金融業', icon: '🏦',
    skill: {
      id: 'freeze', name: '凍結帳戶', icon: '❄️', target: 'opponent',
      desc: '指定對手下回合經過出發格絕對無法買星，且禁用道具。'
    }
  },
  {
    id: 'property', name: '炒房地產集團', sector: '民生業', icon: '🏗️',
    skill: {
      id: 'seize', name: '強制徵收', icon: '🚜', target: 'opponent',
      desc: '與對手同格或經過時，強制將對方擊退 3 格並搶奪 200 元。'
    }
  },
  {
    id: 'green', name: '綠能生技集團', sector: '能源與運輸', icon: '🌱',
    skill: {
      id: 'carbon', name: '碳稅制裁', icon: '🌫️', target: 'none',
      desc: '自動鎖定全場總資產最高者，強制扣 300 元。'
    }
  },
  {
    id: 'cloud', name: '雲端駭客組織', sector: '科技業', icon: '🕶️',
    skill: {
      id: 'zeroDay', name: '零日漏洞', icon: '💻', target: 'opponent',
      desc: '無視護盾，隨機竊取對方 1 點技能能量或 1 個道具。'
    }
  }
];

const UNDECIDED_ROLE = {
  id: RANDOM_ROLE_ID,
  name: '未定新創集團',
  sector: '尚未決定',
  icon: '🎲',
  skill: {
    id: 'randomize', name: '命運未定', icon: '🎲', target: 'none',
    desc: '進入遊戲後隨機分配一家企業與其專屬技能。'
  }
};

const LOBBY_ROLES = [...PARTY_ROLES, UNDECIDED_ROLE];

const MYTHIC_ITEMS = [
  {
    id: 'totem', name: '不死圖騰', icon: '🗿', mode: 'evil', kind: 'passive',
    desc: '抵禦一次雷射處決，觸發後銷毀。'
  },
  {
    id: 'indulgence', name: '贖罪券', icon: '🎫', kind: 'passive', charges: 5,
    desc: '被動絕對防禦。自動銷毀並抵銷 5 次扣總資產效果（移形換位代價除外）。'
  },
  {
    id: 'vector', name: '矢量操作', icon: '⬆️', kind: 'active',
    desc: '擲骰前在地圖上指定 1 個格子。本回合自己移動時，出發格、沿途與最後停留格上的其他玩家，會立刻被傳送到該格並強制觸發格子效果；使用一次即消耗。'
  },
  {
    id: 'truthGate', name: '真理之門', icon: '🚪', kind: 'active', charges: 3,
    desc: '可使用3次。可將 1,000 總資產變成指定普通道具，或把 1 個道具煉成 1,000 總資產。'
  },
  {
    id: 'starBlade', name: '斬魄刀', icon: '🗡️', mode: 'star', kind: 'passive',
    desc: '基礎型態，沒有特殊效果。持有者獲得星星後自動進化為「卍解」；若星星失去則退化回斬魄刀。'
  },
  {
    id: 'bankai', name: '卍解', icon: '🌀', mode: 'star', kind: 'passive', hidden: true,
    desc: '斬魄刀進化型態：收益 +100、免疫負面效果，但禁止獲取新道具。星星被偷走時退化回斬魄刀。'
  },
  {
    id: 'iceMushroom', name: '寒冰蘑菇', icon: '❄️', kind: 'active',
    desc: '凍結其餘玩家 1 回合，並在 3 回合期間禁用他們的技能與道具。'
  },
  {
    id: 'witchFactor', name: '魔女因子', icon: '🦠', kind: 'passive',
    desc: '被動持有。碰觸幽靈即觸發「死亡回歸」，全場狀態回溯至本次擲骰前。'
  },
  {
    id: 'weakDomain', name: '弱者的領域', icon: '🌐', kind: 'active',
    desc: '展開 3 格藍框領域一回合，進入者扣 100；範圍內他人禁用技能／道具。代價：下回合只能走 1 步且禁用換骰道具。'
  }
];

const MYTHIC_BY_ID = Object.fromEntries(MYTHIC_ITEMS.map(x => [x.id, x]));

// 系統特殊道具：獨立於普通道具與黑市神話道具，不列入遊戲規則說明書。
const SPECIAL_ITEMS = [
  {
    id: 'fateDice', name: '命運骰子', icon: '🎲', kind: 'active', special: true,
    desc: '使用後展開 2×3 骰面，自選 1–6 步強制前進；使用一次後消失。'
  }
];

const SPECIAL_ITEM_BY_ID = Object.fromEntries(SPECIAL_ITEMS.map(x => [x.id, x]));

const FATE_DICE_ID = 'fateDice';
const TYCOON_BLUE_REWARD = 500;
const TYCOON_COMEBACK_SEASONS = 3;

const SPECIAL_TILE_META = {
  market: { label: '黑市', icon: '🛒', color: 'purple', desc: '隱藏神話道具拍賣：起標 1,000，每次抬價 250。' },
  invest: { label: '投資', icon: '📈', color: 'orange', desc: '投入 50% 總資產換取股票憑證，季末結算暴漲或歸零。' },
  tax: { label: '查稅局', icon: '🏛️', color: 'black', desc: '二選一：繳 50% 總資產，或強制羈押 2 回合。' },
  insider: { label: '內線交易', icon: '🌈', color: 'rainbow', desc: '花 100 啟動命運輪盤，用完後轉為普通格並在別處重生。' }
};

const SPECIAL_COUNTS = { market: 3, invest: 2, tax: 1, insider: 1 };

const NORMAL_TILE_TYPES = ['blue', 'red', 'yellow', 'green'];

const WHEEL_EFFECTS = [
  { id: 'stealStar', name: '偷星', icon: '🌟', tone: 'star', mode: 'star', desc: '隨機偷走一位對手 1 顆星。' },
  { id: 'earlyDoom', name: '提早末日', icon: '💀', tone: 'evil', mode: 'evil', desc: '立刻提前觸發一次毀滅日收保護費。' },
  { id: 'windfall', name: '天降橫財', icon: '💸', tone: 'good', desc: '立刻獲得 5,000 總資產。' },
  { id: 'halve', name: '資產腰斬', icon: '✂️', tone: 'bad', desc: '自己的總資產立刻減半。' },
  { id: 'supply', name: '道具補給 x2', icon: '🎒', tone: 'good', desc: '立刻抽 2 個道具。' },
  { id: 'darkweb', name: '暗網走私', icon: '🕶️', tone: 'good', desc: '獲得 1 個隨機隱藏神話道具。' },
  { id: 'overnight', name: '一夜暴富', icon: '🤑', tone: 'good', desc: '立刻獲得 2,000 總資產。' },
  { id: 'haunt', name: '幽靈纏身', icon: '👻', tone: 'bad', desc: '指定一位玩家立刻撞上罷工幽靈。' },
  { id: 'discountStar', name: '特價星', icon: '⭐', tone: 'star', mode: 'star', desc: '立刻以 500 總資產買下 1 顆星。' },
  { id: 'redistribute', name: '財富重分配', icon: '💱', tone: 'special', desc: '與總資產第一名交換總資產；自己第一名則無效。' },
  { id: 'robinHood', name: '劫富濟貧', icon: '🥣', tone: 'special', mode: 'tycoon', desc: '（首富限定）與最後一名交換總資產。' },
  { id: 'sucker', name: '含淚當盤子', icon: '🤡', tone: 'special', mode: 'star', desc: '（企業之星限定）強迫送 1 顆星給星數最少的玩家；自己無星則無效。' }
];

const QUICK_DECISIONS = [
  {
    id: 'labor', name: '勞資關係', icon: '🤝',
    text: '工會代表把一份連署書放在你桌上，要求改善輪班與加班費。',
    options: [
      { id: 'invest', label: 'A · 加薪留才', icon: '🧑‍🏭', desc: '支付 200，換取 1 點技能能量。', cash: -200, energy: 1 },
      { id: 'squeeze', label: 'B · 裁員節流', icon: '📋', desc: '獲得 300，但失去 1 點技能能量。', cash: 300, energy: -1 }
    ]
  },
  {
    id: 'rnd', name: '研發與變現', icon: '🔬',
    text: '實驗室做出一個能改變市場的原型，但量產需要總資產。',
    options: [
      { id: 'invest', label: 'A · 投入研發', icon: '🧪', desc: '支付 400，獲得 2 點技能能量。', cash: -400, energy: 2 },
      { id: 'squeeze', label: 'B · 出售專利', icon: '💼', desc: '獲得 600，但失去 1 點技能能量。', cash: 600, energy: -1 }
    ]
  },
  {
    id: 'supply', name: '供應鏈決策', icon: '🚚',
    text: '關鍵零件突然缺貨，供應商給你兩個方案。',
    options: [
      { id: 'invest', label: 'A · 簽長約鎖價', icon: '📦', desc: '支付 300，獲得 1 點能量與 1 層護盾。', cash: -300, energy: 1, shields: 1 },
      { id: 'squeeze', label: 'B · 現貨掃貨', icon: '🏷️', desc: '獲得 200，但失去 1 點技能能量。', cash: 200, energy: -1 }
    ]
  },
  {
    id: 'pr', name: '公關危機', icon: '📰',
    text: '一篇爆料文在深夜衝上熱搜，董事會等你表態。',
    options: [
      { id: 'invest', label: 'A · 道歉捐款', icon: '🙇', desc: '支付 250，獲得 1 層護盾。', cash: -250, shields: 1 },
      { id: 'squeeze', label: 'B · 硬拗到底', icon: '📢', desc: '獲得 150，但失去 1 點技能能量。', cash: 150, energy: -1 }
    ]
  },
  {
    id: 'spy', name: '商業間諜', icon: '🕵️',
    text: '對手的研究員願意用一個隨身碟換一筆錢。',
    options: [
      { id: 'invest', label: 'A · 買下情報', icon: '💾', desc: '支付 350，獲得 2 點技能能量。', cash: -350, energy: 2 },
      { id: 'squeeze', label: 'B · 反向操作', icon: '📉', desc: '獲得 250，但失去 1 點技能能量。', cash: 250, energy: -1 }
    ]
  },
  {
    id: 'market', name: '市場投資', icon: '📊',
    text: '分析師遞來兩份報告，一份保守、一份激進。',
    options: [
      { id: 'invest', label: 'A · 加碼布局', icon: '🚀', desc: '支付 500，獲得 250 的股票憑證與 1 點技能能量。', cash: -500, energy: 1, certificate: 250 },
      { id: 'squeeze', label: 'B · 落袋為安', icon: '💵', desc: '獲得 200 並保留總資產。', cash: 200 }
    ]
  }
];

const QUICK_DECISION_FALLBACK = {
  id: 'nothing', label: 'C · 什麼都不做', icon: '🚪',
  desc: '不採取任何行動，但扣除 100 總資產（可負債，最低常駐可選）。', cash: -100, allowDebt: true
};

const STAR_PRICE_START = 500;
const STAR_PRICE_STEP = 500;
const FORCED_STAR_PREMIUM = 300;
const TYCOON_TARGET = 8000;
const DOOM_START = 1000;
const DOOM_STEP = 500;
const DOOM_EVERY = 5;
const MAX_PLAYERS = 8;

const SPECIAL_TILE_KEYS = Object.keys(SPECIAL_TILE_META);



// 擴充掛鉤：party_engine.js 會註冊這些回呼，原始規則完全保留。
const engineHooks={};
function boardOf(state){return Array.isArray(state?.board)&&state.board.length?state.board:BOARD}

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round2=n=>Math.round((n+Number.EPSILON)*100)/100;
const roleById=id=>ROLES.find(r=>r.id===id);
const itemById=id=>ITEMS.find(x=>x.id===id);
const eventById=id=>PARTY_EVENTS.find(e=>e.id===id);
const nextRandom=state=>{let x=state.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x|0;return (x>>>0)/4294967296};
const pick=(state,items)=>items[Math.floor(nextRandom(state)*items.length)];
const ghostSeed=seed=>((Number(seed)|0)^0x6d2b79f5)||1;
const nextGhostRandom=state=>{let x=state.ghostRng|0;x^=x<<13;x^=x>>>17;x^=x<<5;state.ghostRng=x|0;return (x>>>0)/4294967296};
const currentPlayer=state=>state.players[state.turnIndex];

function log(state,text){state.log.unshift(`第 ${state.round} 季｜${text}`);if(state.log.length>200)state.log.length=200}

function ensureGhostState(state){
  if(!Number.isInteger(state.ghostRng)||state.ghostRng===0)state.ghostRng=ghostSeed(state.seed);
  if(!Number.isInteger(state.ghostPosition)||state.ghostPosition<0||state.ghostPosition>=BOARD.length)state.ghostPosition=1+Math.floor(nextGhostRandom(state)*(BOARD.length-1));
  if(!Array.isArray(state.ghostTrail))state.ghostTrail=[];
}

const CORNER_MARKS={0:'red',6:'green',12:'yellow',18:'blue'};
const EMPTY_CORNER_MARKS=()=>({red:false,green:false,blue:false,yellow:false});

function applyCornerProgress(state,player,path,{passedStart=false,effects=null}={}){
  if(!player)return null;
  const marks=player.marks&&typeof player.marks==='object'?player.marks:{};
  player.marks={red:marks.red===true,green:marks.green===true,blue:marks.blue===true,yellow:marks.yellow===true};
  const colors=[];
  for(const index of path||[]){
    const color=CORNER_MARKS[index];
    if(color&&!player.marks[color]){
      player.marks[color]=true;
      colors.push(color);
      log(state,`📍 ${player.name} 取得${color==='red'?'紅色':color==='green'?'綠色':color==='blue'?'藍色':'黃色'}角落記號。`);
      effects?.push({icon:'📍',text:`取得${color==='red'?'紅色':color==='green'?'綠色':color==='blue'?'藍色':'黃色'}角落記號`,tone:'good'});
    }
  }
  if(!passedStart||player.position===0||!Object.values(player.marks).every(Boolean))return null;
  const previousNoInflation=state.ext?.noInflation;
  if(state.ext)state.ext.noInflation=true;
  let amount;
  try{amount=addCash(state,player,1000)}finally{if(state.ext)state.ext.noInflation=previousNoInflation}
  player.marks=EMPTY_CORNER_MARKS();
  const event={type:'cornerSubsidy',playerId:player.id,playerName:player.name,amount,at:Date.now()};
  state.cornerSubsidyEvent=event;
  log(state,`🚩 ${player.name} 集齊四角記號，經過出發點領取 1,000 元補助金，記號已清除。`);
  effects?.push({icon:'🚩',text:'集齊四角記號，領取 1,000 元補助金',tone:'good'});
  return event;
}

function ensurePartyState(state){
  state.version=2;
  state.mode='party';
  if(!Array.isArray(state.board)||state.board.length<8)state.board=BOARD.map(t=>({...t}));
  if(!Number.isInteger(state.round)||state.round<1)state.round=1;
  if(!Number.isInteger(state.maxRounds)||state.maxRounds<2)state.maxRounds=10;
  state.starGoal=STAR_GOAL;
  if(!Array.isArray(state.players))throw Error('存檔缺少玩家資料。');
  state.turnIndex=clamp(Number(state.turnIndex)||0,0,state.players.length-1);
  state.rng=Number.isInteger(state.rng)&&state.rng!==0?state.rng:(Number(state.seed)|0)||1;
  state.effects=state.effects&&typeof state.effects==='object'?state.effects:{};
  if(!Array.isArray(state.log))state.log=[];
  if(!state.turnGains||typeof state.turnGains!=='object')state.turnGains={};
  if(!Array.isArray(state.winnerIds))state.winnerIds=[];
  if(!state.status)state.status='playing';
  if(!state.phase)state.phase=state.status==='finished'?'finished':'roll';
  if(state.status==='finished')state.phase='finished';
  if(!state.lastRoll)state.lastRoll=null;
  if(!state.pendingDecision)state.pendingDecision=null;
  if(!state.pendingLanding||typeof state.pendingLanding!=='object')state.pendingLanding=null;
  if(!state.cornerSubsidyEvent||typeof state.cornerSubsidyEvent!=='object')state.cornerSubsidyEvent=null;
  for(const p of state.players){
    p.cash=Number.isFinite(p.cash)?round2(p.cash):START_CASH;
    p.stars=Number.isInteger(p.stars)?p.stars:0;
    p.energy=Number.isInteger(p.energy)?clamp(p.energy,0,9):1;
    p.shields=Number.isInteger(p.shields)?p.shields:0;
    p.items=Array.isArray(p.items)?p.items.filter(id=>itemById(id)).slice(0,3):[];
    const marks=p.marks&&typeof p.marks==='object'?p.marks:{};
    p.marks={red:marks.red===true,green:marks.green===true,blue:marks.blue===true,yellow:marks.yellow===true};
    p.position=Number.isInteger(p.position)?p.position:0;
    p.skipTurns=Number.isInteger(p.skipTurns)?p.skipTurns:0;
    p.rentTurns=Number.isInteger(p.rentTurns)?p.rentTurns:0;
    p.rentTo=p.rentTo||null;
    p.parentId=p.parentId||null;
    p.leverage=Boolean(p.leverage);
    p.bankLock=Boolean(p.bankLock);
    p.noReward=Boolean(p.noReward);
    p.forcedRed=Boolean(p.forcedRed);
    p.forcedSteps=['low','high'].includes(p.forcedSteps)?p.forcedSteps:null;
    if(!Number.isInteger(p.color))p.color=state.players.indexOf(p);
  }
  ensureGhostState(state);
  for(const p of state.players)if(!Number.isFinite(state.turnGains[p.id]))state.turnGains[p.id]=0;
  return state;
}

function createGame({players,seed=Date.now(),maxRounds=10,startingCash=START_CASH}){
  if(!Array.isArray(players)||players.length<2||players.length>8)throw Error('請選擇 2 至 8 位玩家。');
  const validRole=id=>engineHooks.roleExists?engineHooks.roleExists(id):Boolean(roleById(id));
  if(new Set(players.map(p=>p.roleId)).size!==players.length||players.some(p=>!validRole(p.roleId)))throw Error('每位玩家需要不同的企業角色。');
  const names=players.map(p=>String(p.name||'').trim());
  if(names.some(n=>!n)||new Set(names).size!==names.length)throw Error('玩家名稱不得空白或重複。');
  const n=Number(seed),limit=Number(maxRounds),cash=Number(startingCash);
  if(!Number.isInteger(n))throw Error('亂數種子無效。');
  if(!Number.isInteger(limit)||limit<2||limit>30)throw Error('季數上限須為 2–30。');
  if(!Number.isFinite(cash)||cash<0)throw Error('玩家初始總資產須為 0 以上。');
  const state={version:2,mode:'party',board:BOARD.map(t=>({...t})),net:null,round:1,maxRounds:limit,starGoal:STAR_GOAL,turnIndex:0,phase:'roll',rng:n|0||1,seed:n,
    players:players.map((p,i)=>({id:`player-${i+1}`,name:names[i],roleId:p.roleId,position:0,color:i,cash:round2(cash),stars:0,energy:1,items:[],marks:EMPTY_CORNER_MARKS(),shields:0,skipTurns:0,rentTo:null,rentTurns:0,parentId:null,leverage:false,bankLock:false,noReward:false,forcedRed:false,forcedSteps:null})),
    ghostRng:ghostSeed(n),ghostPosition:0,ghostTrail:[],
    effects:{},turnGains:{},lastRoll:null,pendingDecision:null,pendingLanding:null,
    log:[],status:'playing',resultReason:null,winnerIds:[],sync:null,ext:null,cornerSubsidyEvent:null};
  ensureGhostState(state);
  state.ghostPosition=1+Math.floor(nextGhostRandom(state)*(BOARD.length-1));
  state.log.unshift(`第 1 季｜派對開始！率先拿下 ${STAR_GOAL} 顆併購星就獲勝。`);
  startTurn(state);
  return state;
}

function addCash(state,player,amount){
  if(!amount)return 0;
  if(engineHooks.adjustCash)amount=engineHooks.adjustCash(state,player,amount);
  // 全域扣款攔截：贖罪券等被動防禦必須在現金變動前生效，避免先觸發負債淘汰。
  if(amount<0&&engineHooks.beforeCash){
    const adjusted=engineHooks.beforeCash(state,player,amount);
    if(adjusted===false)return 0;
    if(Number.isFinite(adjusted))amount=adjusted;
    if(!amount)return 0;
  }
  player.cash=round2(player.cash+amount);
  if(amount>0&&state.turnGains)state.turnGains[player.id]=round2((state.turnGains[player.id]||0)+amount);
  if(engineHooks.afterCash)engineHooks.afterCash(state,player,amount);
  return amount;
}

function consumeShield(state,target,label){
  if(target.shields>0){
    target.shields--;
    log(state,`🛡️ ${target.name} 的護盾擋下了「${label}」。`);
    return true;
  }
  return false;
}

function drawItem(state,player){
  if(engineHooks.canDrawItem&&!engineHooks.canDrawItem(state,player))return null;
  if(player.items.length>=3)return null;
  const item=pick(state,ITEMS);
  player.items.push(item.id);
  if(engineHooks.itemAcquired)engineHooks.itemAcquired(state,player,item.id);
  log(state,`${player.name} 在回合開始抽到道具「${item.icon} ${item.name}」。`);
  return item;
}

function finish(state,reason,winners){
  if(engineHooks.beforeFinish)engineHooks.beforeFinish(state,reason,winners);
  state.status='finished';
  state.phase='finished';
  state.resultReason=reason;
  state.winnerIds=winners.map(p=>p.id);
  state.pendingDecision=null;
  state.pendingLanding=null;
  log(state,`🏁 對局結束｜${winners.length?winners.map(p=>p.name).join('、'):'無人'}勝出。`);
}

function checkStarWin(state){
  const leaders=state.players.filter(p=>p.stars>=STAR_GOAL);
  if(!leaders.length)return false;
  finish(state,'stars',leaders);
  return true;
}

function moveGhost(state){
  if(engineHooks.moveGhost)return engineHooks.moveGhost(state);
  const steps=1+Math.floor(nextGhostRandom(state)*3),direction=nextGhostRandom(state)<.5?-1:1;
  const from=state.ghostPosition;
  state.ghostTrail=[from,...Array.from({length:steps},(_,i)=>(from+direction*(i+1)+BOARD.length)%BOARD.length)];
  state.ghostPosition=state.ghostTrail.at(-1);
}

function startTurn(state){
  if(state.status!=='playing')return;
  const p=currentPlayer(state);
  state.turnGains[p.id]=0;
  p.leverage=false;
  p.forcedSteps=null;
  state.lastRoll=null;
  state.pendingDecision=null;
  state.pendingLanding=null;
  if(p.shields>0){
    log(state,`🛡️ ${p.name} 的 ${p.shields} 層護盾在回合開始時到期。`);
    p.shields=0;
  }
  if(engineHooks.startTurn)engineHooks.startTurn(state,p);
  drawItem(state,p);
  if(p.rentTo&&p.rentTurns>0){
    const owner=state.players.find(x=>x.id===p.rentTo);
    if(owner&&!consumeShield(state,p,'炒地皮租金')){
      addCash(state,p,-100);
      addCash(state,owner,100);
      log(state,`🏗️ ${p.name} 支付 ${owner.name} 100 租金（剩 ${p.rentTurns-1} 回合）。`);
    }
    p.rentTurns--;
    if(p.rentTurns<=0){p.rentTo=null;p.rentTurns=0}
  }
  if(p.skipTurns>0){
    p.skipTurns--;
    state.phase='skipped';
    log(state,`⏸️ ${p.name} 的企業暫停行動，這回合直接跳過。`);
    return;
  }
  state.phase='roll';
  log(state,`${p.name} 的回合開始，請在擲骰前使用道具或企業技能。`);
}

function currentOf(state){return currentPlayer(state)}
function movementPath(from,steps,length=BOARD.length){
  if(!Number.isInteger(from)||!Number.isInteger(steps)||!Number.isInteger(length)||from<0||from>=length||steps<0||steps>length||length<2)throw Error('棋盤移動參數無效。');
  return Array.from({length:steps},(_,i)=>(from+i+1)%length);
}

function tileEffect(state,player,{leverage=false,noReward=false,forcedRed=false}={}){
  const board=boardOf(state);
  const tile=board[player.position];
  const effects=[];
  const push=(icon,text,tone='neutral')=>effects.push({icon,text,tone});
  // 派對擴充：電商「購物節狂歡」的無敵狀態可讓本回合所有踩格效果失效。
  if(player.ext?.immune){
    push('✨','無敵狀態：本回合所有踩格效果無效化','good');
    return effects;
  }
  let type=forcedRed?'red':tile.type;
  if(forcedRed&&tile.type!=='red')push('🔌','限電危機生效，本次落地強制視為蕭條格','bad');
  if(!['start','blue','red','yellow','green'].includes(type)){
    if(engineHooks.resolveTile)engineHooks.resolveTile(state,player,{leverage,noReward,forcedRed},effects);
    return effects;
  }
  const mult=leverage?2:1;
  if(type==='blue'){
    const base=tile.value||300,amount=base*mult;
    if(noReward){
      push('🚫','銀根緊縮：發財格獎勵被沒收','bad');
    }else{
      const anniversary=state.effects.anniversary;
      if(anniversary&&anniversary.round===state.round&&anniversary.ownerId!==player.id){
        const owner=state.players.find(p=>p.id===anniversary.ownerId);
        if(owner){
          addCash(state,owner,amount);
          push('🎊',`${owner.name} 的瘋狂週年慶截走 ${amount} 總資產`,'good');
        }
      }else{
        addCash(state,player,amount);
        push('💰',`發財格：獲得 ${amount} 總資產`,'good');
      }
    }
  }else if(type==='red'){
    const tariff=state.effects.tariff;
    const doubled=!leverage&&tariff&&tariff.rounds>0&&tariff.sourceId!==player.id;
    const base=tile.type==='red'?(tile.value||150):150;
    let amount=base*mult*(doubled?2:1);
    if(engineHooks.tileDamageMultiplier)amount=Math.round(amount*engineHooks.tileDamageMultiplier(state,player,'red',amount));
    if(engineHooks.tileDamageBlocked&&engineHooks.tileDamageBlocked(state,player,'red')){
      push('✨','無敵／卍解狀態無效化本次扣款','good');
    }else{
      addCash(state,player,-amount);
      push('📉',`蕭條格：扣除 ${amount} 營運費${doubled?'（關稅壁壘加倍）':leverage?'（槓桿加倍）':''}`,'bad');
    }
  }else if(type==='yellow'){
    if(noReward){
      push('🚫','銀根緊縮：技能能量被沒收','bad');
    }else{
      const amount=(tile.value||1)*mult;
      player.energy=clamp(player.energy+amount,0,9);
      push('⚡',`技能格：獲得 ${amount} 點技能能量`,'good');
    }
  }else if(type==='green'){
    const event=eventById(pick(state,PARTY_EVENTS).id);
    push(event.icon,`${event.name}：${event.text}`,'event');
    if(engineHooks.tileEvent)engineHooks.tileEvent(state,player,event,effects);
    if(event.kind==='allCash'){
      for(const target of state.players)addCash(state,target,event.amount);
    }else if(event.kind==='selfCash'){
      addCash(state,player,event.amount);
    }else if(event.kind==='selfEnergy'){
      player.energy=clamp(player.energy+event.amount,0,9);
    }else if(event.kind==='allEnergy'){
      for(const target of state.players)target.energy=clamp(target.energy+event.amount,0,9);
    }
  }else if(type==='start'){
    push('🚩','出發點：集齊四角記號並經過此處可領取 1,000 元補助金','neutral');
  }
  return effects;
}

// 供交換位置、矢量操作等「非目前回合玩家」立即結算所在格效果使用。
// 只處理該格的停留效果，不另外發放通過起點獎金。
function resolveTileFor(state,player,opts={}){
  const effects=[];
  if(!state||!player)return effects;
  if(state.ghostPosition===player.position){
    if(engineHooks.ghostStrike)engineHooks.ghostStrike(state,player,effects);
    else{
      const amount=150;
      addCash(state,player,-amount);
      effects.push({icon:'👻',text:`撞上罷工幽靈，扣除 ${amount} 營運費`,tone:'bad'});
    }
    return effects;
  }
  for(const e of tileEffect(state,player,opts))effects.push(e);
  return effects;
}

function landingForSwap(state,player,other){
  return resolveTileFor(state,player,{leverage:player===other?false:player.leverage})
    .map(e=>({...e,text:`${player.name}：${e.text}`}));
}

function rollDie(state,forced,options={}){
  if(state.status!=='playing')throw Error('遊戲已結束。');
  if(state.phase!=='roll')throw Error('現在無法擲骰。');
  const player=currentPlayer(state);
  // 魔女因子等擲骰前快照：每次擲骰都重新覆蓋，回溯點才會精準落在本次擲骰前。
  if(engineHooks.beforeRoll)engineHooks.beforeRoll(state,player);
  let value;
  if(player.ext?.oneStepLock||player.forcedSteps==='one'){
    value=1;
  }else if(forced!==undefined&&forced!==null){
    if(!Number.isInteger(forced)||forced<1||forced>6)throw Error('骰子只能是 1–6。');
    value=forced;
  }else if(player.forcedSteps==='low'){
    value=1+Math.floor(nextRandom(state)*3);
  }else if(player.forcedSteps==='high'){
    value=4+Math.floor(nextRandom(state)*3);
  }else{
    value=1+Math.floor(nextRandom(state)*6);
  }
  let noReward=player.noReward;
  if(player.bankLock){
    value=1;
    noReward=true;
    player.bankLock=false;
    log(state,`🔒 ${player.name} 受到緊縮銀根影響，本回合只能前進 1 格。`);
  }
  const board=boardOf(state);
  const leverage=Boolean(player.leverage);
  const from=player.position,fullPath=movementPath(from,value,board.length);
  const adjusted=engineHooks.adjustMovePath?.(state,player,fullPath,{from,value});
  const path=Array.isArray(adjusted)?adjusted:(adjusted?.path||fullPath);
  const moveMeta=adjusted?.meta||null;
  player.position=path.at(-1)??from;
  // 先把棋子移到終點；所有格子效果都延後到 resolveLanding()，
  // 確保 UI 播完移動動畫、棋子真正停下後才結算與彈窗。
  state.lastRoll={playerId:player.id,value,from,path,tileIndex:player.position,tileType:board[player.position]?.type,struck:false,passedStart:path.includes(0),effects:[],resolved:false,vector:moveMeta?.vector||null};
  if(options.defer){
    state.pendingLanding={playerId:player.id,from,value,path,leverage,noReward,forcedRed:Boolean(player.forcedRed)};
    state.pendingDecision=null;
    state.phase='moving';
    return state.lastRoll;
  }
  resolveLanding(state);
  return state.lastRoll;
}

// 棋子停止後才發動格子效果（發財／蕭條／技能／事件／幽靈／特殊格）。
function resolveLanding(state,options={}){
  if(!state||state.status!=='playing')return state?.lastRoll||null;
  const roll=state.lastRoll;
  if(!roll||roll.resolved)return roll||null;
  const player=state.players.find(p=>p.id===roll.playerId);
  if(!player)return roll;
  const pending=state.pendingLanding&&state.pendingLanding.playerId===player.id?state.pendingLanding:null;
  const board=boardOf(state);
  const leverage=pending?Boolean(pending.leverage):Boolean(player.leverage);
  const noReward=pending?Boolean(pending.noReward):Boolean(player.noReward);
  const forcedRed=pending?Boolean(pending.forcedRed):Boolean(player.forcedRed);
  const effects=Array.isArray(roll.effects)?roll.effects:[];
  roll.effects=effects;
  applyCornerProgress(state,player,roll.path,{passedStart:roll.passedStart&&player.position!==0,effects});
  // 新版規則：只有「踩在幽靈格」才觸發，路過不算。
  const struck=player.position===state.ghostPosition;
  roll.struck=struck;
  roll.tileIndex=player.position;
  roll.tileType=board[player.position]?.type;
  if(struck){
    if(engineHooks.ghostStrike)engineHooks.ghostStrike(state,player,effects);
    else{
      const penalty=150*(leverage?2:1);
      addCash(state,player,-penalty);
      effects.push({icon:'👻',text:`踩中罷工幽靈，扣除 ${penalty} 營運費`,tone:'bad'});
    }
    log(state,`${player.name} 擲出 ${roll.value}，在第 ${player.position} 格踩中罷工幽靈。`);
  }else{
    for(const e of tileEffect(state,player,{leverage,noReward,forcedRed}))effects.push(e);
    log(state,`${player.name} 擲出 ${roll.value}，停在「${board[player.position].label}」格${effects.length?`：${effects.map(e=>e.text.replace(/。$/,'')).join('；')}`:''}。`);
  }
  player.forcedSteps=null;
  if(player.ext)player.ext.oneStepLock=false;
  player.leverage=false;
  player.forcedRed=false;
  player.noReward=false;
  roll.resolved=true;
  state.pendingLanding=null;
  if(engineHooks.afterRoll)engineHooks.afterRoll(state,player,roll,options);
  if(state.status==='playing'&&state.phase==='roll'){
    if(!struck){
      const decision={playerId:player.id,kind:'landing',options:DECISION_OPTIONS.map(x=>({...x,available:x.id!=='invest'||player.cash>=300}))};
      state.pendingDecision=engineHooks.prepareDecision?engineHooks.prepareDecision(state,decision,player)||decision:decision;
      state.phase='decision';
    }else{
      state.phase='resolve';
    }
  }else if(state.status==='playing'&&state.phase==='moving'){
    state.phase=struck?'resolve':'resolve';
  }
  return roll;
}

function chooseDecision(state,optionId){
  if(state.status!=='playing'||state.phase!=='decision'||!state.pendingDecision)throw Error('目前沒有待決定事項。');
  const p=state.players.find(x=>x.id===state.pendingDecision.playerId);
  const option=(state.pendingDecision.options||[]).find(x=>x.id===optionId)||DECISION_OPTIONS.find(x=>x.id===optionId);
  if(!option||!p)throw Error('決策選項無效。');
  if(option.available===false)throw Error('這個選項目前不可用。');
  const cash=Number(option.cash)||0,energy=Number(option.energy)||0,shields=Number(option.shields)||0;
  if(cash<0&&p.cash< -cash&&!option.allowDebt)throw Error(`總資產不足 ${Math.abs(cash)}，無法執行這個選項。`);
  if(cash)addCash(state,p,cash);
  // 允許負債的決策可能直接觸發破產／終局，不能再把已結束的階段覆寫回 resolve。
  if(state.status!=='playing'||p.ext?.eliminated){state.pendingDecision=null;return option;}
  if(energy)p.energy=clamp(p.energy+energy,0,9);
  if(shields)p.shields+=shields;
  if(option.certificate&&engineHooks.grantCertificate)engineHooks.grantCertificate(state,p,option.certificate);
  log(state,`${option.icon||'🤔'} ${p.name} 做出決策「${option.label||option.name||optionId}」${cash?`：${cash>0?'獲得':'支付'} ${Math.abs(cash)} 總資產`:''}${energy?`、${energy>0?'獲得':'失去'} ${Math.abs(energy)} 能量`:''}。`);
  state.pendingDecision=null;
  state.phase='resolve';
  return option;
}

function useItem(state,itemId,targetId){
  if(state.status!=='playing')throw Error('遊戲已結束。');
  if(state.phase!=='roll')throw Error('道具只能在擲骰前使用。');
  const p=currentPlayer(state),index=p.items.indexOf(itemId);
  if(engineHooks.canUse&&!engineHooks.canUse(state,p,'item',itemId))throw Error(engineHooks.blockedReason?.(state,p,'item',itemId)||'目前無法使用道具。');
  if(index===-1)throw Error('你沒有這個道具。');
  const item=itemById(itemId),target=state.players.find(x=>x.id===targetId);
  if(!item)throw Error('道具不存在。');
  const opponents=state.players.filter(x=>x.id!==p.id);
  if(itemId==='swap'){
    if(!target||target.id===p.id)throw Error('請選擇一位對手交換位置。');
    const from=p.position,to=target.position;
    p.position=to;target.position=from;
    applyCornerProgress(state,p,[to]);
    applyCornerProgress(state,target,[from]);
    log(state,`🔄 ${p.name} 與 ${target.name} 交換位置。`);
    const effects=[...landingForSwap(state,p,target),...landingForSwap(state,target,p)];
    p.items.splice(index,1);
    state.lastRoll={playerId:p.id,value:0,from,path:[to],tileIndex:to,tileType:boardOf(state)[to].type,struck:false,effects,swap:{targetId:target.id,from,to}};
    if(state.phase==='roll')state.phase='roll';
    return {item,effects};
  }
  if(itemId==='shield'){
    p.shields+=1;
    log(state,`🛡️ ${p.name} 使用買保險，獲得 1 層護盾（共 ${p.shields} 層）。`);
  }else if(itemId==='dice123'){
    p.forcedSteps='low';
    log(state,`🎲 ${p.name} 使用 123 骰子，本回合點數必定為 1–3。`);
  }else if(itemId==='dice456'){
    p.forcedSteps='high';
    log(state,`🎲 ${p.name} 使用 456 骰子，本回合點數必定為 4–6。`);
  }else if(itemId==='leverage'){
    p.leverage=true;
    log(state,`📈 ${p.name} 使用開槓桿，本回合踩格效果 ×2。`);
  }
  p.items.splice(index,1);
  return {item,effects:[]};
}

function skillBlocked(state,p){
  const lock=state.effects.lockdown;
  return lock&&lock.round===state.round&&roleById(p.roleId)?.sector===lock.sector;
}

function useSkill(state,targetId,sector){
  if(state.status!=='playing')throw Error('遊戲已結束。');
  if(state.phase!=='roll')throw Error('企業技能只能在擲骰前使用。');
  const p=currentPlayer(state),target=state.players.find(x=>x.id===targetId);
  if(engineHooks.canUse&&!engineHooks.canUse(state,p,'skill'))throw Error(engineHooks.blockedReason?.(state,p,'skill')||'目前無法使用技能。');
  if(skillBlocked(state,p))throw Error('限電危機生效中，本回合無法使用技能。');
  if(p.energy<1)throw Error('技能能量不足，請先踩技能格或使用道具補充。');
  const role=roleById(p.roleId);
  if(!role)throw Error('企業角色無效。');
  const others=state.players.filter(x=>x.id!==p.id);
  const needTarget=role.skill.target==='opponent';
  if(needTarget&&(!target||target.id===p.id))throw Error('請選擇一位對手作為技能目標。');
  if(role.skill.target==='sector'&&!SECTORS.includes(sector))throw Error('請選擇一個產業。');
  const result=[];
  switch(p.roleId){
    case 'investment':{
      if(consumeShield(state,target,role.skill.name))break;
      const amount=Math.min(500,Math.max(0,Math.floor(target.cash*.25)));
      if(!amount)throw Error('目標總資產不足，無法做空。');
      addCash(state,target,-amount);addCash(state,p,amount);
      result.push(`從 ${target.name} 竊取 ${amount} 總資產`);
      break;
    }
    case 'bank':{
      if(consumeShield(state,target,role.skill.name))break;
      target.bankLock=true;target.noReward=true;
      result.push(`${target.name} 下回合只能前進 1 格且沒有踩格獎勵`);
      break;
    }
    case 'electronics':{
      if(consumeShield(state,target,role.skill.name))break;
      target.skipTurns=(target.skipTurns||0)+1;
      addCash(state,target,-200);addCash(state,p,200);
      result.push(`${target.name} 下回合暫停行動，並轉移 200 總資產`);
      break;
    }
    case 'auto':{
      state.effects.tariff={rounds:2,sourceId:p.id};
      result.push('未來 2 回合其他玩家踩紅格扣款翻倍');
      break;
    }
    case 'retail':{
      state.effects.anniversary={round:state.round,ownerId:p.id};
      result.push('本回合其他玩家的藍格總資產全部歸你');
      break;
    }
    case 'agriculture':{
      let collected=0;
      for(const other of others){
        if(consumeShield(state,other,role.skill.name))continue;
        addCash(state,other,-150);
        collected+=150;
      }
      const half=Math.floor(collected/2);
      addCash(state,p,half);
      result.push(`所有對手損失 150，你收到 ${half} 總資產`);
      break;
    }
    case 'energy':{
      state.effects.lockdown={round:state.round,sector};
      let count=0;
      for(const other of state.players){
        if(roleById(other.roleId)?.sector===sector){other.forcedRed=true;count++}
      }
      result.push(`${sector} 共 ${count} 位玩家本回合禁用技能，下次踩格強制紅格`);
      break;
    }
    case 'logistics':{
      if(consumeShield(state,target,role.skill.name))break;
      const offset=1+Math.floor(nextRandom(state)*3);
      const from=target.position;
      state.ghostTrail=[from,...Array.from({length:offset},(_,i)=>(from+i+1)%BOARD.length)];
      state.ghostPosition=(from+offset)%BOARD.length;
      result.push(`罷工幽靈被移到 ${target.name} 前方 ${offset} 格`);
      break;
    }
    case 'property':{
      if(consumeShield(state,target,role.skill.name))break;
      target.rentTo=p.id;target.rentTurns=(target.rentTurns||0)+2;
      result.push(`${target.name} 接下來 2 個回合每回合付你 100 租金`);
      break;
    }
    case 'technology':{
      if(consumeShield(state,target,role.skill.name))break;
      const canSteal=target.cash>0;
      if(target.energy>0&&(!canSteal||nextRandom(state)<.5)){
        target.energy--;
        result.push(`刪除 ${target.name} 1 點技能能量`);
      }else if(canSteal){
        const amount=Math.min(300,Math.max(0,target.cash));
        addCash(state,target,-amount);addCash(state,p,amount);
        result.push(`偷取 ${target.name} ${amount} 總資產`);
      }else{
        target.energy=Math.max(0,target.energy-1);
        result.push(`刪除 ${target.name} 1 點技能能量`);
      }
      break;
    }
    default:throw Error('此企業沒有可用技能。');
  }
  p.energy-=1;
  log(state,`${role.skill.icon} ${p.name} 發動「${role.skill.name}」：${result.join('；')}。`);
  return {skill:role.skill,result};
}

function buyStar(state){
  if(state.status!=='playing')throw Error('遊戲已結束。');
  if(!['roll','resolve'].includes(state.phase))throw Error('現在無法購買星星。');
  const p=currentPlayer(state);
  if(p.stars>=STAR_GOAL)throw Error('已經達成勝利星數。');
  if(p.cash<STAR_COST)throw Error(`購買併購星需要 ${STAR_COST} 總資產。`);
  addCash(state,p,-STAR_COST);
  p.stars+=1;
  log(state,`⭐ ${p.name} 以 ${STAR_COST} 總資產買下第 ${p.stars} 顆併購星。`);
  checkStarWin(state);
  return p.stars;
}

function acquisitionCost(state,acquirer,target){
  if(acquirer.cash<0&&target.cash<0)return 0;
  if(acquirer.cash<ACQUIRE_COST)throw Error(`發動併購需要 ${ACQUIRE_COST} 總資產，或雙方總資產皆為負值。`);
  return target.cash<0?ACQUIRE_DISCOUNT_COST:ACQUIRE_COST;
}

function acquireTarget(state,targetId){
  if(state.status!=='playing')throw Error('遊戲已結束。');
  if(!['roll','resolve'].includes(state.phase))throw Error('現在無法發動併購。');
  const p=currentPlayer(state),target=state.players.find(x=>x.id===targetId);
  if(!target||target.id===p.id)throw Error('請選擇一位對手。');
  if(target.parentId)throw Error('該玩家已是其他公司的子公司。');
  if(state.players.some(x=>x.parentId===p.id))throw Error('你已有一家子公司，無法再併購。');
  if(target.stars>=STAR_GOAL)throw Error('已達勝利星數的玩家無法被併購。');
  const cost=acquisitionCost(state,p,target);
  if(cost>0&&p.cash<cost)throw Error(`併購需要 ${cost} 總資產。`);
  addCash(state,p,-cost);
  if(cost)addCash(state,target,Math.floor(cost*.25));
  target.parentId=p.id;
  log(state,`🤝 ${p.name} 以 ${cost} 總資產併購 ${target.name}，${target.name} 成為子公司（每回合上繳 40% 收益）。`);
  return {cost,target};
}

function rebel(state){
  if(state.status!=='playing')throw Error('遊戲已結束。');
  if(!['roll','resolve'].includes(state.phase))throw Error('現在無法發動獨立反撲。');
  const p=currentPlayer(state);
  if(!p.parentId)throw Error('你不是任何公司的子公司。');
  if(p.cash<REBEL_COST)throw Error(`獨立反撲需要 ${REBEL_COST} 總資產。`);
  const parent=state.players.find(x=>x.id===p.parentId);
  addCash(state,p,-REBEL_COST);
  p.parentId=null;
  log(state,`🕊️ ${p.name} 支付 ${REBEL_COST} 總資產，成功脫離 ${parent?.name||'母公司'} 獨立。`);
  return true;
}

function endTurn(state){
  if(state.status!=='playing')throw Error('遊戲已結束。');
  if(state.phase==='decision'||state.phase==='roll')throw Error('請先完成擲骰與決策。');
  if(!['resolve','skipped'].includes(state.phase))throw Error('現在無法結束回合。');
  const p=currentPlayer(state);
  if(engineHooks.beforeEndTurn)engineHooks.beforeEndTurn(state,p);
  const gain=Math.max(0,state.turnGains[p.id]||0);
  if(p.parentId&&gain>0){
    const parent=state.players.find(x=>x.id===p.parentId);
    if(parent){
      const transfer=Math.round(gain*.4);
      addCash(state,p,-transfer);addCash(state,parent,transfer);
      log(state,`🏢 ${p.name} 上繳 40% 收益 ${transfer} 總資產給母公司 ${parent.name}。`);
    }
  }
  moveGhost(state);
  if(state.turnIndex>=state.players.length-1){
    const result=settleRound(state);
    return result;
  }
  state.turnIndex++;
  state.dice=null;
  startTurn(state);
  return null;
}

function settleRound(state){
  if(state.status!=='playing')throw Error('遊戲已結束。');
  const finishedRound=state.round;
  if(state.effects.tariff){
    state.effects.tariff.rounds-=1;
    if(state.effects.tariff.rounds<=0){
      log(state,`🧱 ${state.players.find(p=>p.id===state.effects.tariff.sourceId)?.name||''} 的關稅壁壘結束。`);
      delete state.effects.tariff;
    }
  }
  delete state.effects.anniversary;
  delete state.effects.lockdown;
  state.ghostTrail=[];
  if(engineHooks.afterRound)engineHooks.afterRound(state,finishedRound,{final:state.round>=state.maxRounds});
  if(state.status!=='playing')return {round:finishedRound,finished:true,reason:state.resultReason||'ext',winners:state.players.filter(p=>state.winnerIds.includes(p.id)).map(p=>p.name)};
  if(state.round>=state.maxRounds){
    const ranked=[...state.players].sort((a,b)=>b.stars-a.stars||b.cash-a.cash);
    const top=ranked[0];
    const winners=ranked.filter(p=>p.stars===top.stars&&p.cash===top.cash);
    const override=engineHooks.beforeFinal?.(state,winners,ranked);
    if(override&&override.continue){
      state.round++;
      state.turnIndex=0;
      log(state,`⚡ 驟死賽開始｜第 ${state.round} 季，憤怒幽靈全面出動。`);
      startTurn(state);
      return {round:finishedRound,finished:false,suddenDeath:true};
    }
    finish(state,'rounds',winners);
    return {round:finishedRound,finished:true,reason:'rounds',winners:winners.map(p=>p.name)};
  }
  state.round++;
  state.turnIndex=0;
  log(state,`第 ${state.round} 季開始｜市場重新洗牌，罷工幽靈繼續遊蕩。`);
  startTurn(state);
  return {round:finishedRound,finished:false};
}

function statusChips(state,player){
  const chips=[];
  if(player.shields>0)chips.push({icon:'🛡️',label:`護盾 ×${player.shields}`,tone:'shield'});
  if(player.leverage)chips.push({icon:'📈',label:'槓桿 ×2',tone:'leverage'});
  if(player.forcedSteps==='low')chips.push({icon:'🎲',label:'123 骰',tone:'dice'});
  if(player.forcedSteps==='high')chips.push({icon:'🎲',label:'456 骰',tone:'dice'});
  if(player.bankLock)chips.push({icon:'🔒',label:'銀根緊縮',tone:'bad'});
  if(player.skipTurns>0)chips.push({icon:'⏸️',label:'下回合暫停',tone:'bad'});
  if(player.forcedRed)chips.push({icon:'📉',label:'下次強制紅格',tone:'bad'});
  if(player.rentTo&&player.rentTurns>0)chips.push({icon:'🏗️',label:`租金 ×${player.rentTurns}`,tone:'bad'});
  if(player.parentId)chips.push({icon:'🏢',label:`子公司 · ${state.players.find(p=>p.id===player.parentId)?.name||'母公司'}`,tone:'subsidiary'});
  if(player.stars>=STAR_GOAL)chips.push({icon:'⭐',label:'已達勝星',tone:'star'});
  const lock=state.effects.lockdown;
  if(lock&&lock.round===state.round&&roleById(player.roleId)?.sector===lock.sector)chips.push({icon:'🔌',label:'限電禁技',tone:'bad'});
  if(engineHooks.extraStatusChips)chips.push(...(engineHooks.extraStatusChips(state,player)||[]));
  return chips;
}

function canAcquire(state,player,target){
  if(!player||!target||player.id===target.id)return false;
  if(target.parentId||state.players.some(x=>x.parentId===player.id))return false;
  if(target.stars>=STAR_GOAL)return false;
  if(player.cash<0&&target.cash<0)return true;
  return player.cash>=ACQUIRE_COST;
}

function canRebel(player){return Boolean(player&&player.parentId&&player.cash>=REBEL_COST)}

function exportGame(state){return JSON.stringify(state,null,2)}

function migrateLegacy(s){
  const players=s.players.map((p,i)=>({
    id:p.id||`player-${i+1}`,name:p.name,roleId:p.roleId,position:Number.isInteger(p.position)?p.position:0,color:Number.isInteger(p.color)?p.color:i,
    cash:Number.isFinite(s.companies?.[p.roleId]?.cash)?s.companies[p.roleId].cash:START_CASH,stars:0,energy:1,items:[],shields:0,skipTurns:0,rentTo:null,rentTurns:0,parentId:null,leverage:false,bankLock:false,noReward:false,forcedRed:false,forcedSteps:null
  }));
  const legacyFinished=s.status&&s.status!=='playing';
  const state={version:2,mode:'party',round:legacyFinished?s.maxRounds||1:s.round||1,maxRounds:s.maxRounds||10,starGoal:STAR_GOAL,turnIndex:legacyFinished?0:clamp(Number(s.turnIndex)||0,0,players.length-1),phase:legacyFinished?'finished':'roll',rng:Number.isInteger(s.rng)&&s.rng!==0?s.rng:(Number(s.seed)|0)||1,seed:Number(s.seed)||Date.now(),players,ghostRng:s.ghostRng||ghostSeed(s.seed||Date.now()),ghostPosition:s.ghostPosition,ghostTrail:[],effects:{},turnGains:{},lastRoll:null,pendingDecision:null,log:Array.isArray(s.log)?s.log.slice(0,160):[],status:legacyFinished?'finished':'playing',resultReason:legacyFinished?'legacy':null,winnerIds:legacyFinished&&Array.isArray(s.winnerIds)?s.winnerIds:[],sync:s.sync||null};
  ensurePartyState(state);
  state.log.unshift('📥 已將第 1 版財務存檔轉換為派對棋盤，總資產與企業角色完整保留。');
  return state;
}

function importGame(json){
  const s=typeof json==='string'?JSON.parse(json):json;
  if(!s||typeof s!=='object')throw Error('存檔格式不正確。');
  if(s.version!==1&&s.version!==2)throw Error('存檔版本不支援。');
  if(s.version===1)return migrateLegacy(s);
  if(!Array.isArray(s.players)||s.players.length<2||s.players.length>8)throw Error('存檔玩家數量必須為 2 至 8 人。');
  const validRole=id=>engineHooks.roleExists?engineHooks.roleExists(id):Boolean(roleById(id));
  for(const p of s.players)if(!p||!validRole(p.roleId)||!String(p.name||'').trim())throw Error('存檔中的玩家或企業資料不正確。');
  if(!Array.isArray(s.log))s.log=[];
  return ensurePartyState(s);
}


// ============================================================================
// 派對擴充引擎（非破壞性掛鉤）
// 原始 engine.js 的經典規則保持不變；這裡透過 engineHooks 擴充新模式。
// ============================================================================

const EXT_VERSION = 4;
const clone = value => JSON.parse(JSON.stringify(value));
const extMoney = n => Math.round(Number(n) || 0).toLocaleString('zh-TW');
const extMode = state => GAME_MODES[state?.ext?.mode] || GAME_MODES.star;
const extNormalizeMode = mode => (!mode || mode === 'classic' || !GAME_MODES[mode]) ? 'star' : mode;
function extNoteItem(player, name) {
  if (!player?.ext) return;
  if (!player.ext.itemGets || typeof player.ext.itemGets !== 'object') player.ext.itemGets = {};
  const key = String(name || '未知道具');
  player.ext.itemGets[key] = (player.ext.itemGets[key] || 0) + 1;
}
function extSyncStarBlade(state, player, reason = '星星被偷走') {
  if (!player) return;
  extPlayerExt(player);
  if (player.stars > 0) extStarBladeEvolve(state, player);
  else extStarBladeRevert(state, player, reason);
}

function extRole(id) {
  return PARTY_ROLES.find(r => r.id === id) || ROLES.find(r => r.id === id) || PARTY_ROLES[0];
}
function extRoleOf(player) { return extRole(player?.roleId); }
function extMythicEntry(player, id) {
  return (player?.mythics || []).find(x => x.id === id) || null;
}
function extHasMythic(player, id) { return Boolean(extMythicEntry(player, id)); }
function extHasSpecial(player, id) { return (player?.specials || []).includes(id); }
function extSpecialEntry(player, id) { return extHasSpecial(player, id) ? SPECIAL_ITEM_BY_ID[id] : null; }
function extItemCount(player) {
  return (player?.items?.length || 0) + (player?.mythics?.length || 0) + (player?.specials?.length || 0);
}
function extHasItemSpace(player, count = 1) {
  return extItemCount(player) + count <= 3;
}
function extStarBladeEvolve(state, player) {
  const entry = extMythicEntry(player, 'starBlade');
  if (!entry) return false;
  entry.id = 'bankai';
  entry.charges = 1;
  player.ext.bankai = true;
  state.ext.lastEvent = { type: 'bankai', playerId: player.id, at: Date.now() };
  log(state, `🗡️→🌀 ${player.name} 的斬魄刀吸收星之力，進化為「卍解」！收益 +100、免疫負面，但無法再獲取新道具。`);
  return true;
}
function extStarBladeRevert(state, player, reason = '星星被偷走') {
  const entry = extMythicEntry(player, 'bankai');
  const wasBankai = Boolean(player.ext?.bankai);
  if (entry) {
    entry.id = 'starBlade';
    entry.charges = 1;
  }
  if (player.ext) player.ext.bankai = false;
  if (entry || wasBankai) {
    log(state, `🌀→🗡️ ${player.name} 的${reason}，卍解退化回斬魄刀。`);
    return true;
  }
  return false;
}

function extPlayerExt(p) {
  if (!p.ext || typeof p.ext !== 'object') {
    p.ext = {
      eliminated: false, ghostRole: false, frozen: 0, iceLock: 0, burn: 0, immune: false,
      bankFreeze: false, bankai: false, itemsAcquired: 0, aliveSeasons: 0,
      forceOneNext: false, noDiceItems: false, oneStepLock: false, domainUsedRound: 0, starsBought: 0,
      itemGets: {}, itemRound: null
    };
  }
  p.ext.eliminated = Boolean(p.ext.eliminated);
  p.ext.ghostRole = Boolean(p.ext.ghostRole);
  p.ext.frozen = Number.isInteger(p.ext.frozen) ? p.ext.frozen : 0;
  p.ext.iceLock = Number.isInteger(p.ext.iceLock) ? p.ext.iceLock : 0;
  p.ext.burn = Number.isInteger(p.ext.burn) ? p.ext.burn : 0;
  p.ext.immune = Boolean(p.ext.immune);
  p.ext.bankFreeze = Boolean(p.ext.bankFreeze);
  p.ext.bankai = Boolean(p.ext.bankai);
  p.ext.itemsAcquired = Number(p.ext.itemsAcquired) || 0;
  p.ext.aliveSeasons = Number(p.ext.aliveSeasons) || 0;
  p.ext.forceOneNext = Boolean(p.ext.forceOneNext);
  p.ext.noDiceItems = Boolean(p.ext.noDiceItems);
  p.ext.oneStepLock = Boolean(p.ext.oneStepLock);
  p.ext.domainUsedRound = Number(p.ext.domainUsedRound) || 0;
  p.ext.starsBought = Number(p.ext.starsBought) || 0;
  if (!p.ext.itemGets || typeof p.ext.itemGets !== 'object') p.ext.itemGets = {};
  if (!Array.isArray(p.mythics)) p.mythics = [];
  if (!Array.isArray(p.items)) p.items = [];
  if (!Array.isArray(p.specials)) p.specials = [];
  // Keep the first copy and never merge charges from duplicate or replayed acquisition packets.
  const seenMythics = new Set();
  p.mythics = p.mythics.filter(entry => {
    if (!entry || !MYTHIC_BY_ID[entry.id]) return false;
    const meta = MYTHIC_BY_ID[entry.id];
    if (meta.charges && seenMythics.has(entry.id)) return false;
    if (meta.charges) seenMythics.add(entry.id);
    const maximum = Number.isInteger(meta.charges) && meta.charges > 0 ? meta.charges : 1;
    entry.charges = Number.isInteger(entry.charges)
      ? Math.max(0, Math.min(maximum, entry.charges))
      : (meta.charges ? 0 : 1);
    return entry.charges > 0;
  });
  p.items = p.items.filter(id => Boolean(itemById(id)));
  p.specials = p.specials.filter(id => Boolean(SPECIAL_ITEM_BY_ID[id]));
  // 普通、神話與特殊道具共用 3 格；舊存檔若超過上限，優先保留特殊與神話道具。
  if (p.specials.length > 3) p.specials.length = 3;
  const mythicRoom = Math.max(0, 3 - p.specials.length);
  if (p.mythics.length > mythicRoom) p.mythics.length = mythicRoom;
  const itemRoom = Math.max(0, mythicRoom - p.mythics.length);
  if (p.items.length > itemRoom) p.items.length = itemRoom;
  // 舊存檔相容：舊版以 ext.bankai 標記進化，將斬魄刀就地替換為卍解。
  if (extMythicEntry(p, 'bankai')) {
    p.ext.bankai = true;
  } else if (p.ext.bankai) {
    const blade = extMythicEntry(p, 'starBlade');
    if (blade) blade.id = 'bankai';
    p.ext.bankai = Boolean(blade);
  }
  return p.ext;
}

function extResolveRoles(players, seed = Date.now()) {
  const available = PARTY_ROLES.map(r => r.id);
  let x = (Number(seed) | 0) || 1;
  const rand = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  const used = new Set(players.filter(p => p.roleId !== RANDOM_ROLE_ID).map(p => p.roleId));
  return players.map(p => {
    if (p.roleId !== RANDOM_ROLE_ID) {
      used.add(p.roleId);
      return { ...p };
    }
    const pool = available.filter(id => !used.has(id));
    const id = pool.length ? pool[Math.floor(rand() * pool.length)] : available[Math.floor(rand() * available.length)];
    used.add(id);
    return { ...p, roleId: id, wasRandomRole: true };
  });
}

function extShuffle(state, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(state) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function extBuildBoard(state, mode) {
  const total = 24;
  const activeMode = mode || state?.ext?.mode || 'star';
  const blueValue = activeMode === 'tycoon' ? TYCOON_BLUE_REWARD : 300;
  const specialSlots = new Array(total).fill(null);
  const allSpecials = [];
  for (const [type, count] of Object.entries(SPECIAL_COUNTS)) {
    for (let i = 0; i < count; i++) allSpecials.push(type);
  }
  const shuffled = extShuffle(state, allSpecials);
  const used = new Set();
  const isAdjacent = i => used.has((i - 1 + total) % total) || used.has((i + 1) % total);
  for (const type of shuffled) {
    let placed = false;
    for (const i of extShuffle(state, Array.from({ length: total - 1 }, (_, k) => k + 1))) {
      if (used.has(i) || isAdjacent(i)) continue;
      used.add(i); specialSlots[i] = type; placed = true; break;
    }
    if (!placed) {
      // 幾乎不會發生；保底找一個不相鄰的位置。
      for (let i = 1; i < total; i++) {
        if (!used.has(i) && !isAdjacent(i)) { used.add(i); specialSlots[i] = type; placed = true; break; }
      }
    }
    if (!placed) {
      for (let i = 1; i < total; i++) {
        if (!used.has(i)) { used.add(i); specialSlots[i] = type; placed = true; break; }
      }
    }
  }
  const weights = ['blue', 'blue', 'blue', 'blue', 'red', 'red', 'red', 'yellow', 'yellow', 'green', 'green', 'green'];
  return Array.from({ length: total }, (_, index) => {
    if (index === 0) return { index, type: 'start', label: '出發', icon: '🚩', value: 0, stay: '在地圖四個角落取得紅、綠、藍、黃四種記號後，經過出發點可領取1000元補助金，領取後記號重置' };
    const special = specialSlots[index];
    if (special) {
      const meta = SPECIAL_TILE_META[special];
      return { index, type: special, special: true, label: meta.label, icon: meta.icon, value: 0, stay: meta.desc };
    }
    const type = weights[Math.floor(nextRandom(state) * weights.length)];
    const labels = { blue: '發財', red: '蕭條', yellow: '技能', green: '事件' };
    const icons = { blue: '💰', red: '📉', yellow: '⚡', green: '❓' };
    const stays = {
      blue: `發財格：獲得 ${blueValue} 總資產`, red: '蕭條格：扣除 150 營運費',
      yellow: '技能格：補充 1 點技能能量', green: '事件格：抽一張即時事件'
    };
    return { index, type, label: labels[type], icon: icons[type], value: type === 'blue' ? blueValue : type === 'red' ? 150 : type === 'yellow' ? 1 : 0, stay: stays[type] };
  });
}

function extInitGame(state, { mode = 'star', debug = false, target, rounds, starGoal, doomEvery, doomPrice, doomStep, startingCash } = {}) {
  const seed = Number(state.seed) || Date.now();
  const requested = extNormalizeMode(mode);
  const actualMode = requested === 'random'
    ? MODE_IDS[Math.abs(seed) % MODE_IDS.length]
    : extNormalizeMode(requested);
  const meta = GAME_MODES[actualMode];
  const randomLocked = requested === 'random';
  const resolvedRounds = randomLocked
    ? (GAME_MODES[actualMode]?.defaultRounds || 20)
    : (Number(rounds) || Number(meta.defaultRounds) || 10);
  const resolvedTarget = randomLocked
    ? (actualMode === 'tycoon' ? TYCOON_TARGET : 0)
    : (Number(target) || Number(meta.defaultTarget) || 0);
  const resolvedStarGoal = randomLocked
    ? 3
    : (Number(starGoal) || Number(meta.starGoal) || STAR_GOAL);
  const resolvedDoomEvery = randomLocked ? DOOM_EVERY : Math.max(1, Number(doomEvery) || DOOM_EVERY);
  const resolvedDoomPrice = randomLocked ? DOOM_START : Math.max(100, Number(doomPrice) || DOOM_START);
  const resolvedDoomStep = randomLocked ? DOOM_STEP : Math.max(100, Number(doomStep) || DOOM_STEP);
  const resolvedStartingCash = Number.isFinite(Number(startingCash)) ? Math.max(0, Math.round(Number(startingCash))) : START_CASH;
  state.board = extBuildBoard(state, actualMode);
  if (Number.isInteger(resolvedRounds)) state.maxRounds = clamp(resolvedRounds, 3, 30);
  state.ext = {
    version: EXT_VERSION,
    mode: actualMode,
    requestedMode: requested,
    debug: Boolean(debug),
    target: resolvedTarget,
    targetAssets: resolvedTarget,
    targetStars: resolvedStarGoal,
    starPrice: STAR_PRICE_START,
    starSold: 0,
    inflation: 1,
    inflationStage: 1,
    doomPrice: resolvedDoomPrice,
    doomStep: resolvedDoomStep,
    doomCount: 0,
    doomEvery: resolvedDoomEvery,
    suddenDeath: false,
    enraged: false,
    auction: null,
    investOffer: null,
    taxChoice: null,
    insiderOffer: null,
    wheelResult: null,
    forcedStarOffer: null,
    vector: null,
    domain: null,
    certificates: [],
    investmentSettlement: null,
    history: [],
    turnSnapshot: null,
    doomEvent: null,
    suddenDeathEvent: null,
    pendingVictory: null,
    finishTitle: null,
    lastEvent: null,
    noInflation: false,
    noRedemption: false,
    confirmed: [],
    lobbyPlayers: null,
    replicas: null,
    starOffer: null,
    replaceOffer: null,
    eventPrompt: null,
    wheelPending: null,
    indulgenceEvent: null,
    totemEvent: null,
    vectorEvent: null,
    vectorPending: null,
    fateDice: null,
    tycoonStreaks: {},
    tycoonComeback: null
  };
  for (const p of state.players) {
    extPlayerExt(p);
    p.items = [];
    p.mythics = [];
    p.specials = [];
    p.energy = 1;
    p.shields = 0;
    p.leverage = false;
    p.forcedSteps = null;
    p.bankLock = false;
    p.noReward = false;
    p.forcedRed = false;
    p.skipTurns = 0;
    p.rentTo = null;
    p.rentTurns = 0;
    p.parentId = null;
    p.stars = 0;
    p.cash = resolvedStartingCash;
    p.ext.itemRound = null;
  }
  state.starGoal = resolvedStarGoal;
  state.phase = 'roll';
  state.lastRoll = null;
  state.pendingDecision = null;
  state.ghostPosition = 1 + Math.floor(nextRandom(state) * (state.board.length - 1));
  state.ghostTrail = [];
  state.effects = {};
  state.log = [];
  state.status = 'playing';
  state.resultReason = null;
  state.winnerIds = [];
  const intro = mode === 'random'
    ? `🎲 隨機模式抽中「${meta.name}」！${meta.win}`
    : `${meta.icon} ${meta.name} 開始！${meta.win}`;
  log(state, intro);
  if (actualMode === 'star') log(state, `⭐ 出發格星價 ${extMoney(state.ext.starPrice)}，每賣出 1 顆全場 +${STAR_PRICE_STEP}。`);
  if (actualMode === 'tycoon') log(state, `💰 總資產目標 ${extMoney(state.ext.target)}；季數過半通膨 2 倍，倒數兩季 4 倍。`);
  if (actualMode === 'evil') log(state, `💀 每 ${state.ext.doomEvery} 季毀滅日收保護費，起步 ${extMoney(state.ext.doomPrice)}，每次收取後調漲 ${extMoney(state.ext.doomStep)}。`);
  if (debug) log(state, '🧪 測試模式啟動：可無限擲骰、自由添加道具與傳送棋子。');
  extRecordRound(state, 0, { initial: true });
  startTurn(state);
  return state;
}

function extEnsureState(state) {
  if (!state || typeof state !== 'object') return state;
  for (const p of state.players || []) extPlayerExt(p);
  if (state.ext && state.ext.version) {
    // 「經典派對」已移除；舊存檔自動升級成企業之星，避免留下幽靈模式。
    if (state.ext.mode === 'classic' || !GAME_MODES[state.ext.mode]) state.ext.mode = extNormalizeMode(state.ext.mode);
    if (state.ext.requestedMode === 'classic') state.ext.requestedMode = 'star';
    state.ext.targetAssets = Number(state.ext.targetAssets ?? state.ext.target) || 0;
    state.ext.targetStars = Number(state.ext.targetStars ?? state.starGoal) || STAR_GOAL;
    if (!('eventPrompt' in state.ext)) state.ext.eventPrompt = null;
    if (!('wheelPending' in state.ext)) state.ext.wheelPending = null;
    if (!('indulgenceEvent' in state.ext)) state.ext.indulgenceEvent = null;
    if (!('totemEvent' in state.ext)) state.ext.totemEvent = null;
    if (!('vectorEvent' in state.ext)) state.ext.vectorEvent = null;
    if (!('vectorPending' in state.ext)) state.ext.vectorPending = null;
    if (!('fateDice' in state.ext)) state.ext.fateDice = null;
    if (!state.ext.tycoonStreaks || typeof state.ext.tycoonStreaks !== 'object') state.ext.tycoonStreaks = {};
    if (!('tycoonComeback' in state.ext)) state.ext.tycoonComeback = null;
    if (!('pendingVictory' in state.ext)) state.ext.pendingVictory = null;
    if (!('noRedemption' in state.ext)) state.ext.noRedemption = false;
    const savedDoomStep = Number(state.ext.doomStep);
    state.ext.doomStep = state.ext.requestedMode === 'random'
      ? DOOM_STEP
      : Math.max(100, Number.isFinite(savedDoomStep) ? savedDoomStep : DOOM_STEP);
    return state;
  }
  state.board = Array.isArray(state.board) && state.board.length ? state.board : extBuildBoard(state);
  state.ext = {
    version: EXT_VERSION, mode: 'star', requestedMode: 'star', debug: false,
    target: 3, targetAssets: 3, targetStars: 3, starPrice: STAR_PRICE_START, starSold: 0, inflation: 1, inflationStage: 1,
    doomPrice: DOOM_START, doomStep: DOOM_STEP, doomCount: 0, doomEvery: DOOM_EVERY, suddenDeath: false, enraged: false,
    auction: null, investOffer: null, taxChoice: null, insiderOffer: null, wheelResult: null,
    forcedStarOffer: null, vector: null, domain: null, certificates: [], history: [],
    turnSnapshot: null, doomEvent: null, suddenDeathEvent: null, pendingVictory: null, finishTitle: null, lastEvent: null,
    noInflation: false, noRedemption: false, confirmed: [], lobbyPlayers: null, replicas: null, migrated: true,
    starOffer: null, replaceOffer: null, eventPrompt: null, wheelPending: null,
    indulgenceEvent: null, totemEvent: null, vectorEvent: null, vectorPending: null,
    fateDice: null, tycoonStreaks: {}, tycoonComeback: null
  };
  if (!state.ghostPosition || state.ghostPosition <= 0) state.ghostPosition = 1;
  extRecordRound(state, state.round || 1, { initial: true });
  log(state, '📦 已將舊存檔升級為派對擴充格式（道具、星數與企業完整保留）。');
  return state;
}

function extModeInfo(state) { return extMode(state); }
function extIsDebug(state) { return Boolean(state?.ext?.debug); }

function extGain(state, player, amount, label = '') {
  if (!amount) return 0;
  addCash(state, player, amount);
  if (label) log(state, `${label}：${player.name} 獲得 ${extMoney(amount)} 總資產。`);
  return amount;
}

// 贖罪券統一入口：所有扣款（含直接 addCash）都必須先經過這裡。
function extTryRedeem(state, player, amount, label = '', { silent = false } = {}) {
  if (!state?.ext || !player || amount <= 0 || state.ext.noRedemption) return false;
  extPlayerExt(player);
  const ticket = extMythicEntry(player, 'indulgence');
  if (!ticket || ticket.charges <= 0) return false;
  ticket.charges -= 1;
  if (ticket.charges <= 0) player.mythics = player.mythics.filter(x => x.id !== 'indulgence');
  if (!silent) log(state, `🎫 ${player.name} 的贖罪券自動抵銷「${label || '扣款'}」（剩 ${Math.max(0, ticket.charges)} 次）。`);
  state.ext.indulgenceEvent = { playerId: player.id, label: label || '扣款', amount, remaining: Math.max(0, ticket.charges), at: Date.now() };
  return true;
}

function extDamage(state, player, amount, { ignoreShield = false, ignoreRedemption = false, ignoreImmune = false, label = '', silent = false } = {}) {
  amount = Math.round(Number(amount) || 0);
  if (amount <= 0 || !player) return 0;
  if (player.ext?.eliminated) return 0;
  if (!ignoreImmune && (player.ext?.immune || player.ext?.bankai)) {
    if (!silent) log(state, `🛡️ ${player.name} 的${player.ext?.bankai ? '卍解' : '無敵'}狀態無效化「${label || '負面效果'}」。`);
    return 0;
  }
  if (!ignoreRedemption) {
    if (extTryRedeem(state, player, amount, label, { silent })) return 0;
  }
  if (!ignoreShield && player.shields > 0) {
    player.shields -= 1;
    if (!silent) log(state, `🛡️ ${player.name} 的護盾擋下「${label || '負面效果'}」。`);
    return 0;
  }
  if (ignoreRedemption && state.ext) {
    state.ext.noRedemption = true;
    try { addCash(state, player, -amount); }
    finally { state.ext.noRedemption = false; }
  } else {
    addCash(state, player, -amount);
  }
  return amount;
}

function extTargets(state, excludeId) {
  return state.players.filter(p => p.id !== excludeId && !p.ext?.eliminated);
}

function extSurvivors(state) {
  return state.players.filter(p => !p.ext?.eliminated);
}

function extStatusChips(state, player) {
  extPlayerExt(player);
  const chips = [];
  if (player.ext.eliminated) chips.push({ icon: '👻', label: '罷工團 · 已幽靈化', tone: 'bad' });
  if (player.ext.frozen > 0) chips.push({ icon: '❄️', label: `凍結 ×${player.ext.frozen}`, tone: 'bad' });
  if (player.ext.iceLock > 0) chips.push({ icon: '🧊', label: `冰封禁用技能／道具 ×${player.ext.iceLock}`, tone: 'bad' });
  if (player.ext.burn > 0) chips.push({ icon: '🔥', label: '炎上：123 骰＋紅格加倍', tone: 'bad' });
  if (player.ext.bankFreeze) chips.push({ icon: '🧊', label: '帳戶凍結', tone: 'bad' });
  if (player.ext.bankai) chips.push({ icon: '🌀', label: '卍解中', tone: 'star' });
  if (player.ext.immune) chips.push({ icon: '✨', label: '本回合無敵', tone: 'good' });
  if (player.ext.forceOneNext) chips.push({ icon: '🌐', label: '下回合只能走 1 步', tone: 'bad' });
  if (player.mythics?.length) chips.push({ icon: '🗿', label: `神話道具 ×${player.mythics.length}`, tone: 'star' });
  if (state.ext?.domain && state.ext.domain.ownerId === player.id) chips.push({ icon: '🌐', label: '弱者領域展開中', tone: 'good' });
  if (state.ext?.suddenDeath) chips.push({ icon: '⚡', label: '驟死賽', tone: 'bad' });
  return chips;
}

// 弱者領域會即時跟隨擁有者位置，永遠覆蓋目前格與左右各一格。
function extDomainTiles(state) {
  const d = state?.ext?.domain;
  if (!d) return [];
  const owner = state.players.find(p => p.id === d.ownerId);
  if (!owner || owner.ext?.eliminated) return [];
  const len = boardOf(state).length;
  const tiles = [-1, 0, 1].map(delta => (owner.position + delta + len) % len);
  d.tiles = tiles;
  return tiles;
}

function extInflationValue(state, amount) {
  const ext = state?.ext;
  if (!ext || ext.mode !== 'tycoon' || ext.noInflation) return amount;
  return Math.round(amount * (ext.inflation || 1));
}

function extInflationStage(state) {
  const ext = state?.ext;
  if (!ext || ext.mode !== 'tycoon') return 0;
  const half = Math.ceil(state.maxRounds / 2);
  if (state.round > state.maxRounds - 2) return 4;
  if (state.round > half) return 2;
  return 1;
}

function extRefreshInflation(state, { announce = true, nextRound } = {}) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'tycoon') return;
  const savedRound = state.round;
  if (Number.isInteger(nextRound)) state.round = nextRound;
  const next = extInflationStage(state);
  state.round = savedRound;
  if (next === ext.inflationStage) return;
  const previous = ext.inflationStage;
  ext.inflationStage = next;
  ext.inflation = next === 1 ? 1 : next;
  if (announce && next > previous && next >= 2) {
    ext.lastEvent = { type: 'inflation', stage: next, text: next === 4 ? '通膨來襲！資產變動 4 倍！' : '通膨來襲！資產變動 2 倍！' };
    log(state, `🚨 第 ${state.round} 季進入通膨第 ${next === 4 ? '二' : '一'}階段，所有賺與扣的錢變 ${next} 倍！`);
  }
}

// ---------------------------------------------------------------------------
// 掛鉤註冊
// ---------------------------------------------------------------------------
engineHooks.roleExists = id => id === RANDOM_ROLE_ID || PARTY_ROLES.some(r => r.id === id) || ROLES.some(r => r.id === id);

engineHooks.adjustCash = (state, player, amount) => {
  const ext = state?.ext;
  if (!ext) return amount;
  let value = Number(amount) || 0;
  if (ext.mode === 'tycoon' && !ext.noInflation && ext.inflation > 1) value *= ext.inflation;
  if (value > 0 && player?.ext?.bankai) value += 100;
  return Math.round(value);
};

engineHooks.canDrawItem = (state, player) => {
  if (player.ext?.eliminated) return false;
  if (player.ext?.bankai) { log(state, `🌀 ${player.name} 的卍解禁止獲取新道具。`); return false; }
  return extItemCount(player) < 3;
};
engineHooks.itemAcquired = (state, player, itemId) => {
  if (!player?.ext) return;
  player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
  if (itemById(itemId)) {
    if (!player.ext.itemRound || player.ext.itemRound.round !== state.round) {
      player.ext.itemRound = { round: state.round, ids: [] };
    }
    player.ext.itemRound.ids.push(itemId);
  }
  extNoteItem(player, itemById(itemId)?.name || itemId);
};

function extCaptureRollSnapshot(state, player) {
  if (!state?.ext) return null;
  state.ext.turnSnapshot = clone({
    playerId: player.id, round: state.round, turnIndex: state.turnIndex,
    ghostPosition: state.ghostPosition, ghostTrail: state.ghostTrail, effects: state.effects,
    cornerSubsidyEvent: state.cornerSubsidyEvent,
    players: state.players.map(p => ({
      id: p.id, cash: p.cash, stars: p.stars, energy: p.energy, shields: p.shields, items: p.items,
      mythics: p.mythics, marks: p.marks, position: p.position, skipTurns: p.skipTurns, parentId: p.parentId, rentTo: p.rentTo,
      rentTurns: p.rentTurns, leverage: p.leverage, bankLock: p.bankLock, noReward: p.noReward,
      forcedRed: p.forcedRed, forcedSteps: p.forcedSteps, ext: p.ext
    }))
  });
  return state.ext.turnSnapshot;
}

engineHooks.beforeRoll = (state, player) => extCaptureRollSnapshot(state, player);

engineHooks.startTurn = (state, player) => {
  const ext = extPlayerExt(player);
  // createGame() 會先建立基礎 state 並呼叫一次 startTurn，此時擴充 state.ext 尚未建立。
  if (!state.ext) return;
  if (state.ext.starOffer) state.ext.starOffer = null;
  if (ext.eliminated) {
    // 罷工幽靈仍可正常擲骰與移動，只是不能使用技能／道具。
    player.skipTurns = 0;
    player.rentTo = null;
    player.rentTurns = 0;
    player.parentId = null;
    ext.oneStepLock = false;
    ext.noDiceItems = false;
    log(state, `👻 ${player.name} 的幽靈回合開始，仍可擲骰移動（無法使用技能）。`);
    return;
  }
  // 弱者的領域持續到擁有者下一次自己的回合開始才收束。
  if (state.ext.domain) {
    const owner = state.players.find(p => p.id === state.ext.domain.ownerId);
    if (!owner || owner.ext?.eliminated || owner.id === player.id) {
      log(state, `🌐 ${owner?.name || '玩家'} 的弱者的領域收束。`);
      state.ext.domain = null;
    }
  }
  player.ext.immune = false;
  if (ext.frozen > 0) {
    player.skipTurns = Math.max(player.skipTurns || 0, 1);
    log(state, `❄️ ${player.name} 被寒冰蘑菇凍結，本回合無法行動（剩 ${ext.frozen} 回合）。`);
  }
  if (ext.iceLock > 0) {
    log(state, `🧊 ${player.name} 被寒冰蘑菇封印，${ext.iceLock} 回合內禁用技能與道具。`);
  }
  if (ext.bankFreeze) {
    log(state, `🧊 ${player.name} 的帳戶被凍結：這回合不能用道具，經過出發格也不能買星。`);
  }
  ext.oneStepLock = false;
  if (ext.burn > 0) {
    player.forcedSteps = 'low';
    log(state, `🔥 ${player.name} 遭到炎上商法：本回合只能擲出 1–3，且踩紅格扣款翻倍。`);
  }
  if (ext.forceOneNext) {
    ext.forceOneNext = false;
    ext.noDiceItems = true;
    ext.oneStepLock = true;
    player.forcedSteps = 'one';
    log(state, `🌐 弱者領域代價：${player.name} 本回合只能走 1 步，且禁用任何換骰道具。`);
  } else if (!ext.burn) {
    ext.noDiceItems = false;
  }
  if (ext.bankai) {
    addCash(state, player, 100);
    log(state, `🌀 ${player.name} 的卍解持續運作，本回合收益 +100。`);
  }
  // 弱者領域只在「進入」時扣款，由 afterRoll 處理；回合開始不重複扣款。
  // 魔女因子快照已改為每次擲骰前由 beforeRoll 覆蓋。
};

engineHooks.canUse = (state, player, kind, itemId) => {
  const ext = extPlayerExt(player);
  if (ext.eliminated) return false;
  if (ext.frozen > 0) return false;
  if (ext.iceLock > 0) return false;
  if (state.ext.domain) {
    const d = state.ext.domain;
    if (d.ownerId !== player.id && extDomainTiles(state).includes(player.position)) return false;
  }
  if (kind === 'item' && ext.oneStepLock && ['dice123', 'dice456', 'swap'].includes(itemId)) return false;
  if (kind === 'item' && ext.noDiceItems && ['dice123', 'dice456'].includes(itemId)) return false;
  if (kind === 'item' && ext.bankFreeze) return false;
  return true;
};
engineHooks.blockedReason = (state, player, kind, itemId) => {
  const ext = extPlayerExt(player);
  if (ext.eliminated) return '罷工團幽靈無法使用技能或道具。';
  if (ext.frozen > 0) return `被凍結中，還剩 ${ext.frozen} 回合。`;
  if (ext.iceLock > 0) return `被寒冰蘑菇封印中，還剩 ${ext.iceLock} 回合無法使用技能與道具。`;
  if (state.ext.domain && state.ext.domain.ownerId !== player.id && extDomainTiles(state).includes(player.position)) return '弱者的領域內禁用技能與道具。';
  if (kind === 'item' && ext.oneStepLock && ['dice123', 'dice456', 'swap'].includes(itemId)) return '弱者領域代價：本回合只能走 1 步，不能改變步數或位置。';
  if (kind === 'item' && ext.noDiceItems && ['dice123', 'dice456'].includes(itemId)) return '弱者領域代價：本回合禁用換骰道具。';
  if (kind === 'item' && ext.bankFreeze) return '帳戶凍結中，本回合禁用道具。';
  return '目前無法使用。';
};

// 矢量操作：使用者自己移動時，掃描出發、沿途與最後停留格。
// 這些格子上的其他玩家會立刻被傳送到指定格，並強制結算該格效果。
engineHooks.adjustMovePath = (state, player, fullPath, { from } = {}) => {
  const ext = state.ext;
  const vector = ext?.vector;
  if (!vector || !vector.active || !Number.isInteger(vector.destination)) return null;
  // 不是使用者本人移動，或使用者已幽靈化，都不能觸發。
  if (vector.ownerId !== player.id || player.ext?.eliminated) return null;
  if (vector.round !== state.round) { ext.vector = null; return null; }
  const start = Number.isInteger(from) ? from : player.position;
  const route = [start, ...fullPath];
  const seen = new Set();
  const candidates = [];
  for (const tile of route) {
    for (const other of state.players) {
      if (other.id === player.id || other.ext?.eliminated || seen.has(other.id)) continue;
      if (other.position !== tile) continue;
      seen.add(other.id);
      candidates.push({ playerId: other.id, name: other.name, from: other.position });
    }
  }
  const destination = vector.destination;
  ext.vector = null;
  if (!candidates.length) {
    log(state, `⬆️ ${player.name} 的矢量操作沒有在移動路徑上遇到其他玩家，能量消散。`);
    return null;
  }
  log(state, `⬆️ ${player.name} 發動矢量操作，掃描移動路徑第 ${route.join('、')} 格。`);
  return { path: fullPath, meta: { vector: { ownerId: player.id, destination, route, candidates } } };
};

// 贖罪券全域防禦：連蕭條格、租金、稅金、拍賣等直接扣款也必須先消耗一次。
engineHooks.beforeCash = (state, player, amount) => {
  if (!state?.ext || amount >= 0) return amount;
  if (extTryRedeem(state, player, -amount, '總資產扣款')) return 0;
  return amount;
};

// 全域負債淘汰：任何模式負債達 1,000 就化為罷工幽靈。
engineHooks.afterCash = (state, player) => {
  if (!state?.ext || state.status !== 'playing') return;
  extCheckBankruptcy(state, player);
};

// 快速決策防呆：技能點不足的選項禁用；選項 C 預設隱藏，只有 A、B 都不可用時才顯示。
function extWithQuickFallback(options) {
  const list = (options || []).filter(o => o.id !== QUICK_DECISION_FALLBACK.id);
  const fallbackVisible = !list.some(o => o.available !== false);
  list.push({ ...QUICK_DECISION_FALLBACK, available: true, hidden: !fallbackVisible });
  return list;
}

engineHooks.prepareDecision = (state, decision, player) => {
  if (!decision?.options) return decision;
  const options = decision.options.map(o => ({
    ...o,
    available: o.available !== false && !(o.cash < 0 && player.cash < -o.cash) && !(o.energy < 0 && player.energy < -o.energy)
  }));
  return { ...decision, options: extWithQuickFallback(options) };
};

engineHooks.resolveTile = (state, player, opts, effects) => {
  const tile = boardOf(state)[player.position];
  const ext = state.ext;
  if (!tile?.special) return;
  if (tile.type === 'market') {
    const pool = MYTHIC_ITEMS.filter(x => !x.hidden && (!x.mode || x.mode === ext.mode));
    const item = pool[Math.floor(nextRandom(state) * pool.length)] || MYTHIC_ITEMS[0];
    const order = state.players.filter(p => !p.ext?.eliminated).map(p => p.id);
    const startIndex = Math.max(0, order.indexOf(player.id));
    ext.auction = {
      tileIndex: tile.index, itemId: item.id, basePrice: 1000, currentPrice: 1000,
      highestBidder: null, highestBid: 0, order, index: startIndex, currentId: order[startIndex] || null,
      initiatorId: player.id, active: [...order], passed: []
    };
    effects.push({ icon: '🛒', text: '黑市拍賣開張：隱藏神話道具起標 1,000，每次抬價 250。', tone: 'event' });
    log(state, `🛒 ${player.name} 停在黑市格，拍賣會開始！`);
    return;
  }
  if (tile.type === 'invest') {
    const cost = Math.floor(Math.max(0, player.cash) * 0.5);
    ext.investOffer = { playerId: player.id, tileIndex: tile.index, cost };
    effects.push({ icon: '📈', text: cost > 0 ? `投資格：可投入 ${extMoney(cost)}（50% 總資產）換取股票憑證。` : '投資格：目前沒有可投入的總資產。', tone: 'event' });
    return;
  }
  if (tile.type === 'tax') {
    ext.taxChoice = { playerId: player.id, tileIndex: tile.index };
    effects.push({ icon: '🏛️', text: '查稅局：繳交 50% 總資產，或接受 2 回合羈押。', tone: 'bad' });
    return;
  }
  if (tile.type === 'insider') {
    ext.insiderOffer = { playerId: player.id, tileIndex: tile.index };
    effects.push({ icon: '🌈', text: '內線交易：花 100 啟動命運輪盤。', tone: 'event' });
    return;
  }
};

// 事件格專屬提示：記下實際抽到的事件，讓 UI 在棋子停下後彈出專屬視窗。
engineHooks.tileEvent = (state, player, event) => {
  if (!state.ext) return;
  state.ext.eventPrompt = {
    playerId: player.id, eventId: event.id, name: event.name, icon: event.icon,
    text: event.text, kind: event.kind, amount: event.amount, at: Date.now()
  };
};

// 真正套用矢量傳送與受害者格子效果。互動流程會在 0.5 秒鎖定預警後才呼叫。
function extApplyVectorResolution(state, vector, ownerId, roll = null) {
  if (!state?.ext || !vector) return null;
  const hits = [];
  if (roll && !Array.isArray(roll.effects)) roll.effects = [];
  for (const candidate of vector.candidates || []) {
    const target = state.players.find(p => p.id === candidate.playerId);
    if (!target || target.ext?.eliminated) continue;
    const from = target.position;
    target.position = vector.destination;
    applyCornerProgress(state,target,[vector.destination]);
    const effects = resolveTileFor(state, target, {});
    const detail = effects.map(e => e.text).filter(Boolean).join('；');
    hits.push({ playerId: target.id, name: target.name, from, to: vector.destination, effects });
    if (roll) {
      roll.effects.push({
        icon: '⬆️',
        text: `矢量操作：${target.name} 從第 ${from} 格被傳送到第 ${vector.destination} 格，強制觸發格子效果${detail ? `：${detail}` : '。'}`,
        tone: 'event'
      });
    }
    log(state, `⬆️ ${target.name} 被矢量操作傳送到第 ${vector.destination} 格並觸發效果${detail ? `：${detail}` : '。'}`);
    // 若受害者觸發破產／終局，或魔女因子回溯全場，立刻停止後續傳送。
    if (state.status !== 'playing' || state.ext.rewound) break;
  }
  if (!hits.length) return null;
  const first = hits[0];
  state.ext.vectorEvent = {
    type: 'vector', ownerId, destination: vector.destination, route: vector.route,
    hits, playerId: first.playerId, from: first.from, to: vector.destination, at: Date.now()
  };
  return state.ext.vectorEvent;
}

function extResolveVector(state, player, roll, { defer = false } = {}) {
  const vector = roll?.vector;
  if (!vector || !Array.isArray(vector.candidates) || !vector.candidates.length) return;
  if (!Array.isArray(roll.effects)) roll.effects = [];
  const ext = state.ext;
  if (defer) {
    if (!ext.vectorPending) {
      const names = vector.candidates.map(c => c.name).filter(Boolean).join('、') || '目標';
      ext.vectorPending = {
        ownerId: player.id,
        ownerName: player.name,
        destination: vector.destination,
        route: vector.route,
        candidates: vector.candidates.map(c => ({ ...c })),
        at: Date.now()
      };
      roll.effects.push({
        icon: '🎯',
        text: `矢量操作鎖定 ${names}，準備傳送到第 ${vector.destination} 格…`,
        tone: 'event'
      });
      log(state, `🎯 ${player.name} 的矢量操作鎖定 ${names}，0.5 秒後執行傳送。`);
    }
    return;
  }
  extApplyVectorResolution(state, vector, player.id, roll);
}

// 由 UI 在鎖定預警結束後呼叫；只會套用一次，重複呼叫不會重複傳送。
function extResolveVectorPending(state) {
  const pending = state?.ext?.vectorPending;
  if (!pending) return null;
  state.ext.vectorPending = null;
  if (state.status !== 'playing') return null;
  const roll = state.lastRoll && state.lastRoll.playerId === pending.ownerId ? state.lastRoll : null;
  const event = extApplyVectorResolution(state, pending, pending.ownerId, roll);
  if (!event) return null;
  // afterRoll 在延後流程中已先跑過一次；受害者被傳送後要重新檢查勝負與強買星。
  extCheckWin(state);
  if (state.status === 'playing') extMaybeForcedStar(state);
  return event;
}

engineHooks.afterRoll = (state, player, roll, options = {}) => {
  const ext = state.ext;
  if (!ext || state.status !== 'playing') return;
  const rewound = Boolean(ext.rewound);
  if (rewound) {
    ext.rewound = false;
    roll.path = [player.position];
    roll.tileIndex = player.position;
    roll.tileType = boardOf(state)[player.position]?.type;
    roll.effects = roll.effects.filter(e => e.icon === '🦠');
    roll.passedStart = false;
    roll.struck = false;
  }
  // 矢量操作在本次移動路徑確定後結算；被傳送的玩家會立即承受指定格效果。
  if (!rewound) {
    extResolveVector(state, player, roll, { defer: Boolean(options.deferVector) });
    if (state.status !== 'playing') return;
  }
  // 弱者的領域即時跟隨擁有者位置；踏入當下才扣款。
  const domainTiles = extDomainTiles(state);
  if (ext.domain && ext.domain.ownerId !== player.id && domainTiles.includes(player.position)) {
    const owner = state.players.find(p => p.id === ext.domain.ownerId);
    const lost = extDamage(state, player, 100, { label: '弱者領域', silent: true });
    const detail = lost > 0 ? `扣除 ${extMoney(lost)} 總資產` : '傷害被無效化';
    roll.effects.push({ icon: '🌐', text: `踏入 ${owner?.name || '對手'} 的弱者的領域，${detail}。`, tone: 'bad' });
    log(state, `🌐 ${player.name} 踏入弱者的領域，${detail}。`);
    ext.lastEvent = { type: 'domainHit', playerId: player.id, ownerId: owner?.id, amount: lost, at: Date.now() };
    if (state.status !== 'playing') return;
  }
  // 罷工幽靈移動後與存活玩家同格：強制該存活玩家觸發罷工。
  if (player.ext?.eliminated) {
    const victims = state.players.filter(p => p.id !== player.id && !p.ext?.eliminated && p.position === player.position);
    for (const victim of victims) {
      const strikeEffects = [];
      engineHooks.ghostStrike(state, victim, strikeEffects);
      const detail = strikeEffects.map(e => e.text).join(' ');
      roll.effects.push({ icon: '👻', text: `${player.name} 的幽靈與 ${victim.name} 同格，強制觸發罷工！${detail ? ` ${detail}` : ''}`, tone: 'bad' });
      log(state, `👻 ${player.name} 的幽靈纏上 ${victim.name}，強制觸發罷工。`);
      if (state.status !== 'playing') return;
    }
  }
  // 起點買星只認「本次移動經過或踩中」；開局站在原地不會建立邀請。
  const touchedStart = Boolean(roll.passedStart) || (Array.isArray(roll.path) && roll.path.includes(0));
  if (ext.mode === 'star' && !rewound && touchedStart && !player.ext?.bankFreeze && !player.ext?.eliminated) {
    ext.starOffer = { playerId: player.id, price: extStarPrice(state), passed: Boolean(roll.passedStart), landed: player.position === 0 };
  } else if (ext.starOffer?.playerId === player.id) {
    ext.starOffer = null;
  }
  const tile = boardOf(state)[roll.tileIndex];
  if (roll.struck || tile?.special) {
    state.pendingDecision = null;
    state.phase = 'resolve';
  } else {
    const scenario = QUICK_DECISIONS[Math.floor(nextRandom(state) * QUICK_DECISIONS.length)];
    const options = scenario.options.map(o => ({
      ...o,
      available: !(o.cash < 0 && player.cash < -o.cash) && !(o.energy < 0 && player.energy < -o.energy)
    }));
    state.pendingDecision = {
      playerId: player.id, kind: 'ext', scenarioId: scenario.id, title: scenario.name, icon: scenario.icon, text: scenario.text,
      options: extWithQuickFallback(options)
    };
    state.phase = 'decision';
  }
  extRefreshInflation(state);
  extCheckWin(state);
  extMaybeForcedStar(state);
};

engineHooks.ghostStrike = (state, player, effects) => {
  const ext = state.ext;
  const penalty = 1000 * (ext?.enraged ? 2 : 1);
  if (extHasMythic(player, 'witchFactor') && state.ext.turnSnapshot?.playerId === player.id) {
    const snap = state.ext.turnSnapshot;
    for (const saved of snap.players) {
      const target = state.players.find(p => p.id === saved.id);
      if (!target) continue;
      Object.assign(target, {
        cash: saved.cash, stars: saved.stars, energy: saved.energy, shields: saved.shields,
        items: clone(saved.items), mythics: clone(saved.mythics), marks: clone(saved.marks), position: saved.position,
        skipTurns: saved.skipTurns, parentId: saved.parentId, rentTo: saved.rentTo, rentTurns: saved.rentTurns,
        leverage: saved.leverage, bankLock: saved.bankLock, noReward: saved.noReward,
        forcedRed: saved.forcedRed, forcedSteps: saved.forcedSteps, ext: clone(saved.ext)
      });
    }
    state.ghostPosition = snap.ghostPosition;
    state.ghostTrail = snap.ghostTrail;
    state.effects = clone(snap.effects);
    state.cornerSubsidyEvent = clone(snap.cornerSubsidyEvent || null);
    state.ext.rewound = true;
    state.ext.lastEvent = { type: 'witch', playerId: player.id, at: Date.now() };
    effects.push({ icon: '🦠', text: '魔女因子發動「死亡回歸」：全場狀態回溯至本次擲骰前！', tone: 'event' });
    log(state, `🦠 ${player.name} 踩中幽靈，觸發死亡回歸，全場回到本次擲骰前。`);
    return;
  }
  let lost = '';
  const protectedByBankai = Boolean(player.ext?.bankai);
  if (!protectedByBankai && player.items?.length) {
    const i = Math.floor(nextRandom(state) * player.items.length);
    const id = player.items.splice(i, 1)[0];
    lost = itemById(id)?.name || id;
  } else if (!protectedByBankai && player.mythics?.length) {
    const i = Math.floor(nextRandom(state) * player.mythics.length);
    const entry = player.mythics.splice(i, 1)[0];
    lost = MYTHIC_BY_ID[entry.id]?.name || entry.id;
  }
  const paid = extDamage(state, player, penalty, { ignoreShield: true, ignoreRedemption: false, label: '罷工幽靈', silent: true });
  const protectedNote = paid === 0
    ? (player.ext?.bankai ? '，卍解完全免疫' : extHasMythic(player, 'indulgence') ? '，贖罪券抵銷扣款' : '，護盾或免疫抵銷扣款')
    : '';
  effects.push({ icon: '👻', text: `踩中罷工幽靈：扣除 ${extMoney(paid)} 總資產${protectedNote}${lost ? `，並沒收道具「${lost}」` : protectedByBankai ? '，卍解的免疫擋下了道具沒收' : '，但沒有道具可沒收'}${ext?.enraged ? '（憤怒狀態 ×2）' : ''}。`, tone: 'bad' });
  log(state, `👻 ${player.name} 踩中罷工幽靈，損失 ${extMoney(paid)} 總資產${lost ? `與「${lost}」` : ''}${protectedNote}。`);
  state.ext.lastEvent = {
    type: 'ghostStrike', playerId: player.id, enraged: Boolean(ext?.enraged),
    amount: paid, lost, at: Date.now()
  };
  extCheckWin(state);
};

engineHooks.grantCertificate = (state, player, amount) => {
  const principal = Math.max(0, Math.round(Number(amount) || 0));
  if (!principal) return null;
  const cert = { id: `cert-${state.round}-${player.id}-${(state.ext.certificates || []).length}`, playerId: player.id, principal, round: state.round, resolved: false };
  state.ext.certificates.push(cert);
  log(state, `📈 ${player.name} 取得 ${extMoney(principal)} 股票憑證，季末結算。`);
  return cert;
};

engineHooks.tileDamageBlocked = (state, player, type) => Boolean(type === 'red' && (player.ext?.immune || player.ext?.bankai));
engineHooks.tileDamageMultiplier = (state, player, type) => (type === 'red' && player.ext?.burn > 0 ? 2 : 1);

engineHooks.beforeEndTurn = (state, player) => {
  const ext = state.ext;
  if (!ext) return;
  ext.forcedStarOffer = null;
  // 矢量操作只屬於使用者自己的移動；若未擲骰就結束回合，直接收束。
  if (ext.vector?.ownerId === player.id) {
    ext.vector = null;
    log(state, `⬆️ ${player.name} 未在移動中觸發矢量操作，能量消散。`);
  }
  // 未處理的起點買星／黑市滿包替換不得跨回合殘留，否則會鎖住下一位玩家。
  if (ext.starOffer?.playerId === player.id) ext.starOffer = null;
  if (ext.replaceOffer?.playerId === player.id) {
    const offer = ext.replaceOffer;
    ext.replaceOffer = null;
    log(state, `🛒 ${player.name} 未處理新道具，系統自動丟棄「${MYTHIC_BY_ID[offer.itemId]?.name || itemById(offer.itemId)?.name || offer.itemId}」。`);
  }
  // 寒冰蘑菇／炎上／帳戶凍結以「完整回合」計算，於回合結束才遞減。
  if (player.ext?.frozen > 0) player.ext.frozen -= 1;
  if (player.ext?.iceLock > 0) player.ext.iceLock -= 1;
  if (player.ext?.burn > 0) player.ext.burn -= 1;
  if (player.ext?.bankFreeze) player.ext.bankFreeze = false;
  if (player.ext?.noDiceItems) player.ext.noDiceItems = false;
  if (player.ext?.oneStepLock) player.ext.oneStepLock = false;
};

engineHooks.moveGhost = state => {
  const ext = state.ext;
  if (ext?.debug) return;
  const len = boardOf(state).length;
  const baseSteps = 1 + Math.floor(nextRandom(state) * 3);
  const steps = ext?.enraged ? Math.max(1, Math.round(baseSteps * 1.5)) : baseSteps;
  const direction = nextRandom(state) < 0.5 ? -1 : 1;
  const from = state.ghostPosition;
  state.ghostTrail = [from, ...Array.from({ length: steps }, (_, i) => (from + direction * (i + 1) + len) % len)];
  state.ghostPosition = state.ghostTrail.at(-1);
  if (ext?.enraged) log(state, '⚡ 憤怒幽靈以 1.5 倍速度移動。');
};

engineHooks.afterRound = (state, finishedRound, { final } = {}) => {
  const ext = state.ext;
  if (!ext) return;
  // 股票憑證季末結算
  const unresolved = (ext.certificates || []).filter(c => !c.resolved);
  const investmentResults = [];
  for (const cert of unresolved) {
    const roll = nextRandom(state);
    let multiplier = 0, label = '龐氏騙局';
    if (roll < 0.10) { multiplier = 3; label = '大牛市'; }
    else if (roll < 0.50) { multiplier = 1.5; label = '平穩期'; }
    const player = state.players.find(p => p.id === cert.playerId);
    if (!player) continue;
    const payout = Math.round(cert.principal * multiplier);
    const prev = ext.noInflation; ext.noInflation = true;
    if (payout > 0) addCash(state, player, payout);
    ext.noInflation = prev;
    cert.resolved = true;
    cert.outcome = label;
    cert.payout = payout;
    investmentResults.push({ playerId: player.id, playerName: player.name, label, principal: cert.principal, payout });
    log(state, `📈 ${player.name} 的股票憑證（本金 ${extMoney(cert.principal)}）季末結果：${label}，回收 ${extMoney(payout)}。`);
    ext.lastEvent = { type: 'investment', playerId: player.id, label, payout, principal: cert.principal };
  }
  ext.investmentSettlement = investmentResults.length
    ? { round: finishedRound, at: Date.now(), results: investmentResults }
    : null;
  ext.certificates = (ext.certificates || []).filter(c => !c.resolved || c.round === finishedRound);
  // 弱者的領域改為持續到擁有者下一次自己的回合開始，由 startTurn 收束。
  // 矢量操作只在本回合有效，若沒有玩家碰到指定格則季末失效。
  if (ext.vector && ext.vector.round <= finishedRound) {
    log(state, `⬆️ 矢量操作的指定格本回合沒有生效，能量消散。`);
    ext.vector = null;
  }
  for (const p of state.players) if (!p.ext?.eliminated) p.ext.aliveSeasons = (p.ext.aliveSeasons || 0) + 1;
  if (ext.mode === 'evil' && finishedRound > 0 && finishedRound % (ext.doomEvery || DOOM_EVERY) === 0) {
    extTriggerDoom(state);
  }
  // 首富競爭專屬落後補償：以「本季結算後」的總資產排名計算連續墊底季數。
  if (ext.mode === 'tycoon') extTycoonComeback(state);
  extRecordRound(state, finishedRound, { final });
  extRefreshInflation(state, { nextRound: Math.min(state.maxRounds, finishedRound + 1) });
  // 企業之星／首富的達標勝利只在季末正式結算。
  extCheckWin(state, { settle: true });
};

engineHooks.beforeFinal = (state, winners, ranked) => {
  const ext = state.ext;
  if (!ext) return null;
  if ((ext.mode === 'star' || ext.mode === 'tycoon') && winners.length > 1 && !ext.suddenDeath) {
    ext.suddenDeath = true;
    ext.enraged = true;
    ext.suddenDeathEvent = { winners: winners.map(p => p.name), round: state.round };
    ext.lastEvent = { type: 'suddenDeath', winners: winners.map(p => p.name), round: state.round, at: Date.now() };
    state.maxRounds += 2;
    log(state, `⚡ 第一名平手，驟死賽啟動！罷工幽靈進入憤怒狀態：紅色圖標、移動 1.5 倍、扣錢 2 倍。`);
    return { continue: true };
  }
  return null;
};

engineHooks.beforeFinish = (state, reason, winners) => {
  const ext = state.ext;
  if (!ext) return;
  const alive = extSurvivors(state);
  if (reason === 'survivor' || alive.length === 1) ext.finishTitle = '唯一的倖存者';
  else if (reason === 'bankrupt' || alive.length === 0) ext.finishTitle = '無人生還';
  else if (ext.mode === 'evil') ext.finishTitle = '邪惡企業結束';
  else if (ext.mode === 'star') ext.finishTitle = '企業之星';
  else if (ext.mode === 'tycoon') ext.finishTitle = '首富競爭';
  else ext.finishTitle = extMode(state).name;
};

// ---------------------------------------------------------------------------
// 模式與特殊格操作
// ---------------------------------------------------------------------------
function extCheckBankruptcy(state, changed) {
  if (!state?.ext || state.status !== 'playing') return [];
  const eliminated = [];
  for (const p of state.players) {
    if (p.ext?.eliminated) continue;
    if (Number(p.cash) > -1000) continue;
    extPlayerExt(p);
    p.ext.eliminated = true;
    p.ext.ghostRole = true;
    p.ext.oneStepLock = false;
    p.ext.forceOneNext = false;
    if (state.ext.domain?.ownerId === p.id) state.ext.domain = null;
    p.stars = 0;
    p.cash = 0;
    p.items = [];
    p.mythics = [];
    p.specials = [];
    eliminated.push(p);
    log(state, `💀 ${p.name} 負債達到 1,000，遭到市場淘汰，化為藍色罷工幽靈。`);
  }
  if (eliminated.length) {
    const last = eliminated.at(-1);
    state.ext.lastEvent = { type: 'bankrupt', playerId: last.id, names: eliminated.map(p => p.name), at: Date.now() };
    extCheckWin(state);
  }
  return eliminated;
}

function extCheckWin(state, { settle = false } = {}) {
  if (!state || state.status !== 'playing' || !state.ext) return false;
  const ext = state.ext;
  const alive = extSurvivors(state);
  if (!alive.length) {
    finish(state, 'bankrupt', []);
    log(state, '🏁 全員負債淘汰，無人倖存。');
    return true;
  }
  // 所有模式共用：只剩一位存活者就直接獲勝，其他人都已化為罷工幽靈。
  if (alive.length === 1) {
    finish(state, 'survivor', alive);
    log(state, `🏁 ${alive[0].name} 是唯一的倖存者！`);
    return true;
  }
  if (ext.mode === 'evil') return false;

  let qualified = [];
  let reason = null;
  let target = 0;
  if (ext.mode === 'star') {
    qualified = state.players.filter(p => !p.ext?.eliminated && p.stars >= (state.starGoal || STAR_GOAL));
    reason = 'stars';
    target = state.starGoal || STAR_GOAL;
  } else if (ext.mode === 'tycoon') {
    target = Number(ext.target) || TYCOON_TARGET;
    qualified = state.players.filter(p => !p.ext?.eliminated && p.cash >= target);
    reason = 'target';
  }
  if (!qualified.length) {
    // 如果在季中曾經達標、但季末前又失去資格，撤銷本季的達標提示。
    if (ext.pendingVictory) ext.pendingVictory = null;
    return false;
  }

  const playerIds = qualified.map(p => p.id);
  const names = qualified.map(p => p.name);
  const now = Date.now();
  const changed = !ext.pendingVictory
    || ext.pendingVictory.reason !== reason
    || ext.pendingVictory.round !== state.round
    || ext.pendingVictory.playerIds.join('|') !== playerIds.join('|');

  // 達標不再立即結束：先記錄「本季將進行結算」，等季末 afterRound 才正式 finish。
  ext.pendingVictory = {
    reason, mode: ext.mode, playerIds, names, target, round: state.round,
    at: changed ? now : (ext.pendingVictory?.at || now)
  };
  if (!settle) {
    if (changed) {
      const text = `${names.join('、')}已達標，本季將進行結算`;
      ext.lastEvent = { type: 'victoryPending', mode: ext.mode, reason, playerIds, names, target, text, at: now };
      log(state, `🏁 ${text}`);
    }
    return false;
  }

  ext.pendingVictory = null;
  finish(state, reason, qualified);
  log(state, reason === 'stars'
    ? `🏁 季末結算：${names.join('、')} 達成 ${target} 顆星，成為企業之星！`
    : `🏁 季末結算：${names.join('、')} 達到 ${extMoney(target)} 總資產，成為世界首富！`);
  return true;
}

function extMaybeForcedStar(state) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'star') return;
  const p = currentOf(state);
  if (p.ext?.eliminated) { ext.forcedStarOffer = null; return; }
  const stars = state.players.find(x => x.id !== p.id && !x.ext?.eliminated && x.position === p.position && x.stars > 0);
  ext.forcedStarOffer = stars ? { playerId: p.id, targetId: stars.id, cost: ext.starPrice + FORCED_STAR_PREMIUM } : null;
}

function extStarPrice(state) { return Number(state.ext?.starPrice) || STAR_PRICE_START; }

function extCanBuyStar(state) {
  if (state.status !== 'playing' || !state.ext) return { ok: false, reason: '對局已結束' };
  const p = currentOf(state);
  const mode = state.ext.mode;
  const offer = mode === 'star' && state.ext.starOffer?.playerId === p.id ? state.ext.starOffer : null;
  // 起點邀請必須先由「經過／踩中出發格」建立；開局原地站立不得直接買星。
  const phases = offer ? ['roll', 'resolve', 'decision'] : ['roll', 'resolve'];
  if (!phases.includes(state.phase)) return { ok: false, reason: '現在無法買星' };
  if (p.ext?.eliminated) return { ok: false, reason: '幽靈無法買星' };
  if (p.ext?.bankFreeze) return { ok: false, reason: '帳戶凍結，這回合不能買星' };
  if (mode === 'star') {
    if (!offer) return { ok: false, reason: '企業之星模式需經過或停在出發格才能買星' };
    if (p.stars >= (state.starGoal || STAR_GOAL)) return { ok: false, reason: '已達勝利星數' };
    if (p.cash < extStarPrice(state)) return { ok: false, reason: `需要 ${extMoney(extStarPrice(state))} 總資產` };
    return { ok: true, price: extStarPrice(state), offer: true };
  }
  if (p.stars >= (state.starGoal || STAR_GOAL)) return { ok: false, reason: '已達勝利星數' };
  if (p.cash < STAR_COST) return { ok: false, reason: `需要 ${extMoney(STAR_COST)} 總資產` };
  return { ok: true, price: STAR_COST };
}

function extBuyStar(state) {
  const check = extCanBuyStar(state);
  if (!check.ok) throw Error(check.reason);
  const p = currentOf(state), ext = state.ext;
  const price = check.price;
  const prev = ext.noInflation; ext.noInflation = true;
  addCash(state, p, -price);
  ext.noInflation = prev;
  p.stars += 1;
  p.ext.starsBought = (p.ext.starsBought || 0) + 1;
  if (ext.mode === 'star') {
    ext.starSold = (ext.starSold || 0) + 1;
    ext.starPrice = extStarPrice(state) + STAR_PRICE_STEP;
    log(state, `⭐ ${p.name} 以 ${extMoney(price)} 買下第 ${p.stars} 顆星；全場星價升至 ${extMoney(ext.starPrice)}。`);
  } else {
    log(state, `⭐ ${p.name} 以 ${extMoney(price)} 買下第 ${p.stars} 顆併購星。`);
  }
  ext.starOffer = null;
  extSyncStarBlade(state, p);
  extCheckWin(state);
  return p.stars;
}

function extSkipStarOffer(state) {
  if (state.ext) state.ext.starOffer = null;
  return true;
}

function extClearEventPrompt(state) {
  if (state.ext) state.ext.eventPrompt = null;
  return true;
}

function extForcedStarInfo(state) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'star') return null;
  if (ext.forcedStarOffer) return ext.forcedStarOffer;
  extMaybeForcedStar(state);
  return ext.forcedStarOffer;
}

function extForcedBuyStar(state, targetId) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'star') throw Error('只有企業之星模式可以強買星星。');
  const p = currentOf(state), target = state.players.find(x => x.id === targetId);
  if (!target || target.id === p.id) throw Error('請選擇持有星星的對手。');
  if (target.position !== p.position || target.stars <= 0) throw Error('必須與持有星星的玩家同格。');
  const cost = extStarPrice(state) + FORCED_STAR_PREMIUM;
  if (p.cash < cost) throw Error(`強買需要 ${extMoney(cost)} 總資產。`);
  const prev = ext.noInflation; ext.noInflation = true;
  addCash(state, p, -cost);
  ext.noInflation = prev;
  target.stars -= 1;
  p.stars += 1;
  extSyncStarBlade(state, target, '星星被強買');
  extSyncStarBlade(state, p);
  ext.forcedStarOffer = null;
  log(state, `🌟 ${p.name} 支付 ${extMoney(cost)}（星價 ${extMoney(extStarPrice(state))} + 溢價 ${FORCED_STAR_PREMIUM}）強制買走 ${target.name} 的 1 顆星！此交易不會讓全場星價上漲。`);
  extCheckWin(state);
  return p.stars;
}

function extExtraStatusChips(state, player) { return extStatusChips(state, player); }

// ---------------------------------------------------------------------------
// 技能
// ---------------------------------------------------------------------------
function extUseSkill(state, targetId, sectorOrTile) {
  if (state.status !== 'playing') throw Error('遊戲已結束。');
  if (state.phase !== 'roll') throw Error('企業技能只能在擲骰前使用。');
  const p = currentOf(state);
  if (engineHooks.canUse && !engineHooks.canUse(state, p, 'skill')) throw Error(engineHooks.blockedReason?.(state, p, 'skill') || '目前無法使用技能。');
  if (p.energy < 1) throw Error('技能能量不足，請先踩技能格或使用道具補充。');
  const role = extRoleOf(p), skill = role.skill;
  const target = state.players.find(x => x.id === targetId);
  const others = extTargets(state, p.id);
  if (skill.target === 'opponent' && !target) throw Error('請選擇一位對手作為技能目標。');
  if (skill.target === 'tile' && !Number.isInteger(Number(sectorOrTile))) throw Error('請選擇一個格子。');
  const result = [];
  const damage = (who, amount, label, opts) => extDamage(state, who, amount, { label, ...(opts || {}) });
  switch (role.id) {
    case 'social': {
      if (!target) throw Error('請選擇一位對手。');
      if (target.ext?.bankai) { result.push(`${target.name} 的卍解無效化炎上效果`); break; }
      target.ext.burn = Math.max(1, target.ext.burn || 0);
      result.push(`${target.name} 下回合被炎上：只能擲 1–3，紅格扣款翻倍`);
      break;
    }
    case 'hardware': {
      if (!target) throw Error('請選擇一位對手。');
      if (target.ext?.bankai) { result.push(`${target.name} 的卍解保護道具，計畫性報廢失效`); break; }
      const normal = target.items || [], mythics = target.mythics || [];
      if (normal.length) {
        const i = Math.floor(nextRandom(state) * normal.length);
        const id = normal.splice(i, 1)[0];
        result.push(`摧毀 ${target.name} 的道具「${itemById(id)?.name || id}」`);
      } else if (mythics.length) {
        const i = Math.floor(nextRandom(state) * mythics.length);
        const entry = mythics.splice(i, 1)[0];
        result.push(`摧毀 ${target.name} 的神話道具「${MYTHIC_BY_ID[entry.id]?.name || entry.id}」`);
      } else result.push(`${target.name} 沒有道具可摧毀`);
      addCash(state, p, 200);
      result.push('並轉化為自己 200 總資產');
      break;
    }
    case 'ecommerce': {
      let total = 0;
      for (const other of others) total += damage(other, 80, skill.name) ? 80 : 0;
      if (total) addCash(state, p, total);
      p.ext.immune = true;
      result.push(`吸取全場共 ${extMoney(total)} 總資產，本回合自己踩格效果無效化`);
      break;
    }
    case 'investment': {
      if (!target) throw Error('請選擇一位對手。');
      const hit = damage(target, 150, skill.name, { ignoreShield: false });
      if (hit) addCash(state, p, 150);
      result.push(hit ? `偷取 ${target.name} 150 總資產` : `${target.name} 擋下了偷取`);
      if (hit && target.cash < p.cash) {
        let stolen = '';
        if (p.ext?.bankai) {
          result.push('對方資產較低，但卍解禁止獲取新道具，無法額外偷取');
          break;
        }
        if (!extHasItemSpace(p)) {
          result.push('對方資產較低，但你的道具欄已滿，無法額外偷取道具');
          break;
        }
        if (target.items?.length) {
          const i = Math.floor(nextRandom(state) * target.items.length);
          const id = target.items.splice(i, 1)[0];
          p.items.push(id);
          stolen = itemById(id)?.name || id;
        } else if (target.mythics?.length) {
          const i = Math.floor(nextRandom(state) * target.mythics.length);
          const entry = target.mythics.splice(i, 1)[0];
          p.mythics.push(entry);
          stolen = MYTHIC_BY_ID[entry.id]?.name || entry.id;
        }
        result.push(stolen ? `對方資產較低，額外偷走「${stolen}」` : '對方沒有道具可偷');
      }
      break;
    }
    case 'fastfood': {
      let success = 0;
      for (const other of others) if (damage(other, 100, skill.name)) success += 1;
      if (success) addCash(state, p, success * 50);
      result.push(`全場對手扣 100，成功 ${success} 人，自己回饋 ${success * 50}`);
      break;
    }
    case 'delivery': {
      const index = Number(sectorOrTile);
      if (!Number.isInteger(index) || index < 1 || index >= boardOf(state).length) throw Error('幽靈不能放在出發格。');
      state.ghostPosition = index;
      state.ghostTrail = [];
      result.push(`把罷工幽靈派到第 ${index} 格`);
      break;
    }
    case 'bank': {
      if (!target) throw Error('請選擇一位對手。');
      if (target.ext?.bankai) { result.push(`${target.name} 的卍解無效化帳戶凍結`); break; }
      target.ext.bankFreeze = true;
      result.push(`${target.name} 下回合經過出發格無法買星，且禁用道具`);
      break;
    }
    case 'property': {
      if (!target) throw Error('請選擇一位對手。');
      if (target.ext?.bankai) { result.push(`${target.name} 的卍解擋下強制徵收`); break; }
      const len = boardOf(state).length;
      const from = target.position;
      const path=Array.from({length:3},(_,i)=>(from-i-1+len)%len);
      target.position = path.at(-1);
      applyCornerProgress(state,target,path,{passedStart:path.includes(0)&&target.position!==0});
      const hit = damage(target, 200, skill.name);
      if (hit) addCash(state, p, 200);
      result.push(`${target.name} 被擊退 3 格${hit ? '，並被搶奪 200 總資產' : '，但護盾擋下了搶奪'}`);
      break;
    }
    case 'green': {
      const richest = [...others].sort((a, b) => b.cash - a.cash)[0];
      if (richest) {
        const hit = damage(richest, 300, skill.name);
        result.push(`鎖定首富 ${richest.name}，${hit ? '扣除 300 總資產' : '但被護盾擋下'}`);
      } else result.push('場上沒有其他對手');
      break;
    }
    case 'cloud': {
      if (!target) throw Error('請選擇一位對手。');
      if (target.ext?.bankai) { result.push(`${target.name} 的卍解讓零日漏洞無功而返`); break; }
      const stealItem = !p.ext?.bankai && (target.items?.length || target.mythics?.length) && extHasItemSpace(p) && nextRandom(state) < 0.5;
      if (stealItem) {
        if (target.items?.length) {
          const i = Math.floor(nextRandom(state) * target.items.length);
          const id = target.items.splice(i, 1)[0];
          p.items.push(id);
          result.push(`無視護盾，竊取 ${target.name} 的道具「${itemById(id)?.name || id}」`);
        } else {
          const i = Math.floor(nextRandom(state) * target.mythics.length);
          const entry = target.mythics.splice(i, 1)[0];
          p.mythics.push(entry);
          result.push(`無視護盾，竊取 ${target.name} 的神話道具「${MYTHIC_BY_ID[entry.id]?.name || entry.id}」`);
        }
      } else if (target.energy > 0) {
        target.energy -= 1;
        result.push(`無視護盾，竊取 ${target.name} 1 點技能能量`);
      } else {
        result.push(`${target.name} 沒有能量或道具可竊取`);
      }
      break;
    }
    default: throw Error('此企業沒有可用技能。');
  }
  p.energy -= 1;
  log(state, `${skill.icon} ${p.name} 發動「${skill.name}」：${result.join('；')}。`);
  extCheckWin(state);
  return { skill, result };
}

// ---------------------------------------------------------------------------
// 神話道具
// ---------------------------------------------------------------------------
function extAddMythic(state, player, id, { silent = false } = {}) {
  const meta = MYTHIC_BY_ID[id];
  if (!meta || meta.hidden) return null;
  if (meta.mode && meta.mode !== state.ext.mode) return null;
  if (player?.ext?.bankai) {
    if (!silent) log(state, `🌀 ${player.name} 的卍解禁止獲取新道具（含神話道具）。`);
    return null;
  }
  extPlayerExt(player);
  const existing = extMythicEntry(player, id);
  if (existing && meta.charges) {
    if (!silent) log(state, `🗿 ${player.name} 已持有「${meta.name}」，重複取得不會增加使用次數。`);
    return meta;
  }
  if (!extHasItemSpace(player)) {
    if (!silent) log(state, `🎒 ${player.name} 的道具欄已滿（3 格），無法取得「${meta.name}」。`);
    return null;
  }
  player.mythics.push({ id, charges: meta.charges || 1 });
  player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
  extNoteItem(player, meta.name);
  if (!silent) log(state, `🗿 ${player.name} 取得神話道具「${meta.icon} ${meta.name}」。`);
  return meta;
}

function extAddItem(state, player, itemId) {
  const item = itemById(itemId);
  if (!item) return false;
  if (player.ext?.bankai) { log(state, `🌀 ${player.name} 的卍解禁止獲取新道具。`); return false; }
  if (!extHasItemSpace(player)) return false;
  player.items.push(itemId);
  player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
  extNoteItem(player, item.name);
  return true;
}

// 系統特殊道具獨立於普通與神話道具，但仍與道具欄共用 3 格。
function extAddSpecial(state, player, id, { silent = false } = {}) {
  const meta = SPECIAL_ITEM_BY_ID[id];
  if (!meta) return null;
  extPlayerExt(player);
  if (player.ext?.bankai) {
    if (!silent) log(state, `🌀 ${player.name} 的卍解禁止獲取新道具（含特殊道具）。`);
    return null;
  }
  if (!extHasItemSpace(player)) {
    if (!silent) log(state, `🎒 ${player.name} 的道具欄已滿（3 格），無法取得「${meta.name}」。`);
    return null;
  }
  player.specials.push(id);
  player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
  extNoteItem(player, meta.name);
  if (!silent) log(state, `✨ ${player.name} 取得特殊道具「${meta.icon} ${meta.name}」。`);
  return meta;
}

// 落後補償：優先替換該玩家本季剛抽到的普通道具，否則在空位放入或替換最後一個普通道具。
function extGrantFateDice(state, player) {
  extPlayerExt(player);
  let replaced = null;
  const roundItems = player.ext?.itemRound?.round === state.round ? player.ext.itemRound.ids : [];
  for (let i = roundItems.length - 1; i >= 0; i -= 1) {
    const index = player.items.lastIndexOf(roundItems[i]);
    if (index >= 0) {
      const id = player.items.splice(index, 1)[0];
      replaced = itemById(id)?.name || id;
      break;
    }
  }
  if (!replaced && !extHasItemSpace(player) && player.items?.length) {
    const id = player.items.pop();
    replaced = itemById(id)?.name || id;
  }
  const meta = extAddSpecial(state, player, FATE_DICE_ID, { silent: true });
  if (!meta) return null;
  if (replaced) {
    log(state, `✨ ${player.name} 的落後補償生效：將本季獲得的「${replaced}」替換為特殊道具「${meta.icon} ${meta.name}」。`);
  } else {
    log(state, `✨ ${player.name} 的落後補償生效：獲得特殊道具「${meta.icon} ${meta.name}」。`);
  }
  return { meta, replaced };
}

function extTycoonComeback(state) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'tycoon') return;
  const alive = state.players.filter(p => !p.ext?.eliminated);
  if (alive.length < 2) return;
  const lowestCash = Math.min(...alive.map(p => Number(p.cash) || 0));
  const lowest = alive.filter(p => (Number(p.cash) || 0) === lowestCash);
  const streaks = ext.tycoonStreaks && typeof ext.tycoonStreaks === 'object' ? ext.tycoonStreaks : (ext.tycoonStreaks = {});
  for (const p of state.players) {
    const previous = Math.max(0, Number(streaks[p.id]) || 0);
    if (p.ext?.eliminated) streaks[p.id] = 0;
    else if (lowest.some(x => x.id === p.id)) streaks[p.id] = previous + 1;
    else streaks[p.id] = 0;
  }
  for (const p of lowest) {
    const streak = Number(streaks[p.id]) || 0;
    if (streak < TYCOON_COMEBACK_SEASONS || streak % TYCOON_COMEBACK_SEASONS !== 0) continue;
    const result = extGrantFateDice(state, p);
    ext.tycoonComeback = {
      playerId: p.id, name: p.name, streak,
      granted: Boolean(result), replaced: result?.replaced || null, at: Date.now()
    };
    ext.lastEvent = { type: 'tycoonComeback', ...ext.tycoonComeback };
    if (!result) {
      log(state, `🎲 ${p.name} 已連續 ${streak} 季總資產墊底，但道具欄沒有可替換的普通道具，命運骰子無法發放。`);
    }
  }
}

// 命運骰子：先展開自選面板，玩家選定 1–6 後才消耗道具並由 UI 觸發擲骰。
function extPrepareFateDice(state) {
  if (state.status !== 'playing') throw Error('遊戲已結束。');
  if (state.phase !== 'roll') throw Error('命運骰子只能在擲骰前使用。');
  const p = currentOf(state);
  if (!extHasSpecial(p, FATE_DICE_ID)) throw Error('你沒有命運骰子。');
  if (engineHooks.canUse && !engineHooks.canUse(state, p, 'item', FATE_DICE_ID)) {
    throw Error(engineHooks.blockedReason?.(state, p, 'item', FATE_DICE_ID) || '目前無法使用。');
  }
  state.ext.fateDice = { playerId: p.id, round: state.round, at: Date.now() };
  log(state, `🎲 ${p.name} 展開命運骰子，自選 1–6 步。`);
  return state.ext.fateDice;
}

function extCancelFateDice(state) {
  if (state?.ext?.fateDice) {
    state.ext.fateDice = null;
    return true;
  }
  return false;
}

function extUseFateDice(state, value) {
  const step = Number(value);
  if (!Number.isInteger(step) || step < 1 || step > 6) throw Error('命運骰子只能選擇 1–6。');
  if (state.status !== 'playing') throw Error('遊戲已結束。');
  if (state.phase !== 'roll') throw Error('命運骰子只能在擲骰前使用。');
  const p = currentOf(state);
  if (state.ext?.fateDice && state.ext.fateDice.playerId !== p.id) throw Error('現在不是你的命運骰子選擇。');
  const index = (p.specials || []).indexOf(FATE_DICE_ID);
  if (index < 0) throw Error('你沒有命運骰子。');
  if (engineHooks.canUse && !engineHooks.canUse(state, p, 'item', FATE_DICE_ID)) {
    throw Error(engineHooks.blockedReason?.(state, p, 'item', FATE_DICE_ID) || '目前無法使用。');
  }
  p.specials.splice(index, 1);
  state.ext.fateDice = null;
  log(state, `🎲 ${p.name} 使用命運骰子，鎖定前進 ${step} 步。`);
  return step;
}

function extDiscard(state, player, kind, index) {
  extPlayerExt(player);
  if (kind === 'normal') {
    if (index < 0 || index >= player.items.length) throw Error('道具不存在。');
    const id = player.items.splice(index, 1)[0];
    log(state, `🗑️ ${player.name} 丟棄道具「${itemById(id)?.name || id}」。`);
  } else if (kind === 'special') {
    if (index < 0 || index >= (player.specials || []).length) throw Error('特殊道具不存在。');
    const id = player.specials.splice(index, 1)[0];
    log(state, `🗑️ ${player.name} 丟棄特殊道具「${SPECIAL_ITEM_BY_ID[id]?.name || id}」。`);
  } else {
    if (index < 0 || index >= (player.mythics || []).length) throw Error('神話道具不存在。');
    const entry = player.mythics.splice(index, 1)[0];
    if (entry.id === 'bankai' && player.ext) player.ext.bankai = false;
    log(state, `🗑️ ${player.name} 丟棄神話道具「${MYTHIC_BY_ID[entry.id]?.name || entry.id}」。`);
  }
}

function extUseMythic(state, itemId, payload = {}) {
  if (state.status !== 'playing') throw Error('遊戲已結束。');
  if (state.phase !== 'roll') throw Error('神話道具只能在擲骰前使用。');
  const p = currentOf(state);
  extPlayerExt(p);
  if (!extMythicEntry(p, itemId)) throw Error('你沒有這個神話道具。');
  const meta = MYTHIC_BY_ID[itemId];
  if (engineHooks.canUse && !engineHooks.canUse(state, p, 'item', itemId)) throw Error(engineHooks.blockedReason?.(state, p, 'item', itemId) || '目前無法使用。');
  // canUse() 會正規化玩家狀態，因此在檢查後重新取得目前的神話道具物件。
  const entry = extMythicEntry(p, itemId);
  if (!entry) throw Error('你沒有這個神話道具。');
  switch (itemId) {
    case 'vector': {
      const index = Number(payload.tileIndex);
      if (!Number.isInteger(index) || index < 0 || index >= boardOf(state).length) throw Error('請選擇一個有效格子。');
      state.ext.vector = { ownerId: p.id, destination: index, round: state.round, active: true };
      p.mythics = p.mythics.filter(x => x.id !== itemId);
      log(state, `⬆️ ${p.name} 在地圖第 ${index} 格佈下矢量操作：本回合自己移動時，路徑上的其他玩家會被傳送到該格並觸發效果。`);
      break;
    }
    case 'truthGate': {
      if (entry.charges <= 0) throw Error('真理之門已耗盡。');
      if (payload.mode === 'sell') {
        if (!(p.items?.length || p.mythics?.length)) throw Error('背包裡沒有道具可以煉成金錢。');
        const kind = payload.kind === 'mythic' ? 'mythic' : 'normal';
        if (kind === 'normal') {
          const idx = Number(payload.index);
          if (idx < 0 || idx >= p.items.length) throw Error('道具不存在。');
          const id = p.items.splice(idx, 1)[0];
          addCash(state, p, 1000);
          log(state, `🚪 ${p.name} 用真理之門把「${itemById(id)?.name || id}」煉成 1,000 總資產。`);
        } else {
          const idx = Number(payload.index);
          if (idx < 0 || idx >= p.mythics.length) throw Error('神話道具不存在。');
          const removed = p.mythics.splice(idx, 1)[0];
          if (removed.id === 'bankai') p.ext.bankai = false;
          addCash(state, p, 1000);
          log(state, `🚪 ${p.name} 用真理之門把「${MYTHIC_BY_ID[removed.id]?.name}」煉成 1,000 總資產。`);
        }
      } else {
        const id = payload.itemId;
        if (payload.mythic || MYTHIC_BY_ID[id] || !itemById(id)) throw Error('金錢轉道具只能煉成普通道具。');
        if (p.cash < 1000) throw Error('需要 1,000 總資產才能煉成道具。');
        if (p.ext?.bankai) throw Error('卍解期間禁止獲取新道具。');
        if (!extHasItemSpace(p)) throw Error('道具欄已滿（3 格）。');
        const prev = state.ext.noInflation; state.ext.noInflation = true;
        addCash(state, p, -1000);
        state.ext.noInflation = prev;
        extAddItem(state, p, id);
        log(state, `🚪 ${p.name} 用真理之門把 1,000 總資產煉成「${itemById(id)?.name || id}」。`);
      }
      entry.charges -= 1;
      if (entry.charges <= 0) p.mythics = p.mythics.filter(x => x.id !== itemId);
      break;
    }
    case 'iceMushroom': {
      const frozen = [], resisted = [];
      for (const other of extTargets(state, p.id)) {
        if (other.ext?.bankai) { resisted.push(other.name); continue; }
        other.ext.frozen = Math.max(other.ext.frozen || 0, 1);
        other.ext.iceLock = Math.max(other.ext.iceLock || 0, 3);
        frozen.push(other.name);
      }
      p.mythics = p.mythics.filter(x => x.id !== itemId);
      state.ext.lastEvent = { type: 'iceMushroom', playerId: p.id, frozen: frozen.slice(), at: Date.now() };
      log(state, `❄️ ${p.name} 使用寒冰蘑菇：${frozen.length} 位玩家被凍結 1 回合，且 3 回合內禁用技能與道具${resisted.length ? `；${resisted.join('、')} 的卍解免疫` : ''}。`);
      break;
    }
    case 'weakDomain': {
      if (p.ext.domainUsedRound === state.round) throw Error('弱者的領域本回合已經展開過。');
      state.ext.domain = { ownerId: p.id, round: state.round, tiles: [] };
      const tiles = extDomainTiles(state);
      p.ext.domainUsedRound = state.round;
      p.ext.forceOneNext = true;
      log(state, `🌐 ${p.name} 展開弱者的領域（目前第 ${tiles.join('、')} 格，會跟隨移動），進入者扣 100；代價是下回合只能走 1 步。`);
      break;
    }
    case 'totem':
    case 'indulgence':
    case 'starBlade':
    case 'bankai':
    case 'witchFactor':
      throw Error('這是被動道具，會自動觸發。');
    default:
      throw Error('此神話道具目前無法使用。');
  }
}

// ---------------------------------------------------------------------------
// 黑市拍賣 / 投資 / 查稅 / 內線交易
// ---------------------------------------------------------------------------
function extAuctionCurrent(state) {
  const a = state.ext?.auction;
  if (!a || !a.currentId) return null;
  return state.players.find(p => p.id === a.currentId) || null;
}

function extAuctionAdvance(state, a) {
  for (let i = 0; i < a.order.length; i++) {
    a.index = (a.index + 1) % a.order.length;
    const id = a.order[a.index];
    if (a.active.includes(id)) { a.currentId = id; return id; }
  }
  a.currentId = null;
  return null;
}

function extAuctionAction(state, action) {
  const a = state.ext?.auction;
  if (!a) throw Error('目前沒有拍賣。');
  const player = extAuctionCurrent(state);
  if (!player) return extAuctionFinish(state);
  if (action === 'bid') {
    a.highestBidder = player.id;
    a.highestBid = a.currentPrice;
    a.currentPrice += 250;
    log(state, `🛒 ${player.name} 出價 ${extMoney(a.highestBid)}。`);
    if (a.active.length === 1) return extAuctionFinish(state);
  } else {
    a.active = a.active.filter(id => id !== player.id);
    a.passed.push(player.id);
    // 踩到黑市的玩家放棄時，整場黑市事件立即結束，不再詢問後續玩家。
    if (player.id === a.initiatorId) {
      log(state, `🛒 ${player.name} 放棄競標，黑市拍賣直接結束。`);
      return extAuctionFinish(state);
    }
    log(state, `🛒 ${player.name} 放棄競標。`);
    if (!a.active.length) return extAuctionFinish(state);
    if (a.active.length === 1 && a.active[0] === a.highestBidder) return extAuctionFinish(state);
  }
  extAuctionAdvance(state, a);
  return { pending: true, player: extAuctionCurrent(state) };
}

function extAuctionFinish(state) {
  const a = state.ext.auction;
  if (!a) return null;
  const winner = state.players.find(p => p.id === a.highestBidder);
  const meta = MYTHIC_BY_ID[a.itemId];
  let gained = false;
  if (winner && a.highestBid > 0) {
    const prev = state.ext.noInflation; state.ext.noInflation = true;
    addCash(state, winner, -a.highestBid);
    state.ext.noInflation = prev;
    if (winner.ext?.bankai) {
      log(state, `🛒 ${winner.name} 以 ${extMoney(a.highestBid)} 得標，但卍解禁止獲取新道具，「${meta?.name}」消散了。`);
    } else if (extHasItemSpace(winner)) {
      gained = Boolean(extAddMythic(state, winner, a.itemId, { silent: true }));
      if (gained) log(state, `🛒 拍賣成交！${winner.name} 以 ${extMoney(a.highestBid)} 標下「${meta?.icon} ${meta?.name}」。`);
    } else {
      state.ext.replaceOffer = { playerId: winner.id, itemId: a.itemId, itemKind: 'mythic', price: a.highestBid, source: 'auction' };
      log(state, `🛒 ${winner.name} 以 ${extMoney(a.highestBid)} 得標，但背包已滿，需選擇替換或丟棄新道具。`);
    }
  } else {
    log(state, `🛒 本場黑市流標，隱藏道具「${meta?.name}」沒有賣出。`);
  }
  state.ext.auction = null;
  extCheckWin(state);
  return { finished: true, winner: gained ? winner?.name : null, pendingReplace: Boolean(state.ext.replaceOffer), failedWinner: gained || state.ext.replaceOffer ? null : winner?.name || null, itemId: a.itemId, price: a.highestBid || 0 };
}

function extResolveReplace(state, { dropNew = false, kind, index } = {}) {
  const offer = state.ext?.replaceOffer;
  if (!offer) throw Error('目前沒有待處理的新道具。');
  const player = state.players.find(p => p.id === offer.playerId);
  const offerKind = offer.itemKind === 'normal' ? 'normal' : 'mythic';
  const meta = offerKind === 'mythic' ? MYTHIC_BY_ID[offer.itemId] : itemById(offer.itemId);
  state.ext.replaceOffer = null;
  if (!player) return false;
  if (offerKind === 'mythic') {
    extPlayerExt(player);
    if (meta?.charges && extMythicEntry(player, offer.itemId)) {
      log(state, `🛒 ${player.name} 已持有「${meta?.name || offer.itemId}」，重複取得不增加使用次數。`);
      return false;
    }
  }
  if (dropNew) {
    log(state, `🛒 ${player.name} 丟棄剛獲得的「${meta?.name || offer.itemId}」。`);
    return false;
  }
  if (kind === 'mythic') {
    if (index < 0 || index >= (player.mythics || []).length) throw Error('要替換的神話道具不存在。');
    const removed = player.mythics.splice(index, 1)[0];
    if (removed.id === 'bankai' && player.ext) player.ext.bankai = false;
    log(state, `🗑️ ${player.name} 捨棄「${MYTHIC_BY_ID[removed.id]?.name || removed.id}」騰出欄位。`);
  } else if (kind === 'special') {
    if (index < 0 || index >= (player.specials || []).length) throw Error('要替換的特殊道具不存在。');
    const removed = player.specials.splice(index, 1)[0];
    log(state, `🗑️ ${player.name} 捨棄特殊道具「${SPECIAL_ITEM_BY_ID[removed]?.name || removed}」騰出欄位。`);
  } else {
    if (index < 0 || index >= player.items.length) throw Error('要替換的道具不存在。');
    const id = player.items.splice(index, 1)[0];
    log(state, `🗑️ ${player.name} 捨棄「${itemById(id)?.name || id}」騰出欄位。`);
  }
  let gained = false;
  if (offerKind === 'normal') {
    player.items.push(offer.itemId);
    player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
    extNoteItem(player, meta?.name || offer.itemId);
    gained = true;
    log(state, `🎒 ${player.name} 將「${meta?.name || offer.itemId}」放入道具欄。`);
  } else if (offer.source === 'debug') {
    player.mythics.push({ id: offer.itemId, charges: meta?.charges || 1 });
    if (offer.itemId === 'bankai') player.ext.bankai = true;
    player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
    extNoteItem(player, meta?.name || offer.itemId);
    gained = true;
    log(state, `🎒 ${player.name} 將神話道具「${meta?.name || offer.itemId}」放入道具欄。`);
  } else {
    gained = Boolean(extAddMythic(state, player, offer.itemId));
  }
  if (!gained) log(state, `🛒 ${player.name} 仍無法放入「${meta?.name}」。`);
  return gained;
}

function extInvest(state, accept) {
  const offer = state.ext?.investOffer;
  if (!offer) throw Error('目前沒有投資機會。');
  const p = state.players.find(x => x.id === offer.playerId);
  state.ext.investOffer = null;
  if (!accept || !p) return false;
  if (offer.cost <= 0 || p.cash < offer.cost) throw Error('總資產不足，無法投資。');
  const prev = state.ext.noInflation; state.ext.noInflation = true;
  addCash(state, p, -offer.cost);
  state.ext.noInflation = prev;
  state.ext.certificates.push({ id: `cert-${state.round}-${p.id}-${state.ext.certificates.length}`, playerId: p.id, principal: offer.cost, round: state.round, resolved: false });
  p.ext.itemsAcquired = (p.ext.itemsAcquired || 0) + 0;
  log(state, `📈 ${p.name} 投入 ${extMoney(offer.cost)} 取得股票憑證，季末結算。`);
  return true;
}

function extTaxPay(state) {
  const offer = state.ext?.taxChoice;
  if (!offer) throw Error('目前沒有查稅。');
  const p = state.players.find(x => x.id === offer.playerId);
  state.ext.taxChoice = null;
  if (!p) return 0;
  const amount = Math.floor(Math.max(0, p.cash) * 0.5);
  const paid = extDamage(state, p, amount, { ignoreShield: true, label: '查稅局 50% 總資產' });
  log(state, `🏛️ ${p.name} 選擇繳稅 ${extMoney(paid || amount)}${paid === 0 && amount > 0 ? '（由贖罪券全額抵銷）' : ''}。`);
  return paid;
}

function extTaxDetain(state) {
  const offer = state.ext?.taxChoice;
  if (!offer) throw Error('目前沒有查稅。');
  const p = state.players.find(x => x.id === offer.playerId);
  state.ext.taxChoice = null;
  if (!p) return;
  p.skipTurns = (p.skipTurns || 0) + 2;
  log(state, `🏛️ ${p.name} 拒絕繳稅，被強制羈押 2 回合。`);
}

function extInsiderPay(state) {
  const offer = state.ext?.insiderOffer;
  if (!offer) throw Error('目前沒有內線交易。');
  const p = state.players.find(x => x.id === offer.playerId);
  state.ext.insiderOffer = null;
  if (!p) return null;
  if (p.cash < 100) { log(state, `🌈 ${p.name} 總資產不足 100，無法啟動輪盤。`); return null; }
  const prev = state.ext.noInflation; state.ext.noInflation = true;
  addCash(state, p, -100);
  state.ext.noInflation = prev;
  const result = extPrepareWheel(state, p);
  // 用完後變回普通格，並在隨機普通格生成新的交易格
  const board = boardOf(state);
  const old = board.find(t => t.index === offer.tileIndex);
  if (old) {
    const types = NORMAL_TILE_TYPES;
    const type = types[Math.floor(nextRandom(state) * types.length)];
    const labels = { blue: '發財', red: '蕭條', yellow: '技能', green: '事件' };
    const icons = { blue: '💰', red: '📉', yellow: '⚡', green: '❓' };
    Object.assign(old, { type, label: labels[type], icon: icons[type], special: false, value: type === 'blue' ? 300 : type === 'red' ? 150 : type === 'yellow' ? 1 : 0, stay: `${labels[type]}格` });
  }
  const len = board.length;
  const specialAt = i => board.some(t => t.special && t.index === ((i % len) + len) % len);
  const candidates = board.filter(t => t.index !== 0 && t.index !== offer.tileIndex && !t.special
    && !specialAt(t.index - 1) && !specialAt(t.index + 1));
  const fallback = board.filter(t => t.index !== 0 && t.index !== offer.tileIndex && !t.special);
  const pool = candidates.length ? candidates : fallback;
  if (pool.length) {
    const target = pool[Math.floor(nextRandom(state) * pool.length)];
    Object.assign(target, { type: 'insider', special: true, label: '內線交易', icon: '🌈', value: 0, stay: SPECIAL_TILE_META.insider.desc });
    log(state, `🌈 新的內線交易格在第 ${target.index} 格生成。`);
  }
  extCheckWin(state);
  return result;
}

// 只抽結果、不立即生效；UI 轉盤停止後必須等待玩家按下確認，才呼叫 extResolveWheel。
function extPrepareWheel(state, player) {
  const ext = state.ext;
  const pool = WHEEL_EFFECTS.filter(e => !e.mode || e.mode === ext.mode);
  const effect = pool[Math.floor(nextRandom(state) * pool.length)];
  const index = Math.max(0, WHEEL_EFFECTS.findIndex(e => e.id === effect.id));
  ext.wheelPending = { playerId: player.id, effect, index, at: Date.now() };
  ext.wheelResult = null;
  log(state, `🌈 ${player.name} 啟動命運輪盤，結果即將揭曉。`);
  return { pending: true, effect, index, playerId: player.id, at: ext.wheelPending.at };
}

function extResolveWheel(state, payload = {}) {
  const ext = state.ext;
  const pending = ext?.wheelPending;
  if (!pending) return null;
  if (payload.at && Number(payload.at) !== Number(pending.at)) return null;
  const player = state.players.find(p => p.id === (payload.playerId || pending.playerId));
  ext.wheelPending = null;
  if (!player) return null;
  const effect = pending.effect;
  const text = extApplyWheel(state, player, effect);
  ext.wheelResult = { effect, text, playerId: player.id, at: Date.now() };
  log(state, `🌈 命運輪盤：${effect.icon} ${effect.name}｜${text}`);
  extCheckBankruptcy(state, player);
  extCheckWin(state);
  return { effect, text, playerId: player.id, at: ext.wheelResult.at };
}

function extSpinWheel(state, player) {
  const prepared = extPrepareWheel(state, player);
  const resolved = extResolveWheel(state, { playerId: prepared.playerId, at: prepared.at });
  return { effect: resolved.effect, text: resolved.text };
}

function extApplyWheel(state, player, effect) {
  const ext = state.ext;
  const others = extTargets(state, player.id);
  switch (effect.id) {
    case 'stealStar': {
      const holders = others.filter(p => p.stars > 0);
      if (!holders.length) return '場上沒有人持有星星，效果落空。';
      const target = holders[Math.floor(nextRandom(state) * holders.length)];
      target.stars -= 1; player.stars += 1;
      extSyncStarBlade(state, target, '星星被偷走');
      extSyncStarBlade(state, player);
      return `從 ${target.name} 偷走 1 顆星。`;
    }
    case 'earlyDoom':
      extTriggerDoom(state, true);
      return '毀滅日提前降臨！';
    case 'windfall':
      addCash(state, player, 5000);
      return '天降 5,000 總資產。';
    case 'halve': {
      const loss = Math.floor(Math.max(0, player.cash) / 2);
      const prev = ext.noInflation; ext.noInflation = true;
      addCash(state, player, -loss);
      ext.noInflation = prev;
      return `總資產腰斬，損失 ${extMoney(loss)}。`;
    }
    case 'supply': {
      let n = 0;
      for (let i = 0; i < 2; i++) if (drawItem(state, player)) n += 1;
      return `抽到 ${n} 個道具${n < 2 ? '（道具欄已滿）' : ''}。`;
    }
    case 'darkweb': {
      const pool = MYTHIC_ITEMS.filter(x => !x.hidden && (!x.mode || x.mode === ext.mode) && !extHasMythic(player, x.id));
      if (!pool.length) return '暗網沒有新的神話道具可賣。';
      const item = pool[Math.floor(nextRandom(state) * pool.length)];
      if (!extAddMythic(state, player, item.id)) return '道具欄已滿（3 格），暗網商品無法帶走。';
      return `取得隱藏神話道具「${item.name}」。`;
    }
    case 'overnight':
      addCash(state, player, 2000);
      return '一夜暴富，獲得 2,000 總資產。';
    case 'haunt': {
      if (!others.length) return '沒有其他玩家可纏身。';
      const target = others[Math.floor(nextRandom(state) * others.length)];
      const effects = [];
      engineHooks.ghostStrike(state, target, effects);
      return `罷工幽靈纏上 ${target.name}。`;
    }
    case 'discountStar': {
      if (player.cash < 500) return '總資產不足 500，特價星失效。';
      const prev = ext.noInflation; ext.noInflation = true;
      addCash(state, player, -500);
      ext.noInflation = prev;
      player.stars += 1;
      extSyncStarBlade(state, player);
      return '以 500 買下 1 顆特價星（非起始格交易，不會讓星價上漲）。';
    }
    case 'redistribute': {
      const richest = [...state.players].filter(p => !p.ext?.eliminated).sort((a, b) => b.cash - a.cash)[0];
      if (!richest || richest.id === player.id) return '自己就是第一名，效果無效。';
      const tmp = player.cash; player.cash = richest.cash; richest.cash = tmp;
      return `與首富 ${richest.name} 交換了總資產。`;
    }
    case 'robinHood': {
      const poorest = [...state.players].filter(p => !p.ext?.eliminated).sort((a, b) => a.cash - b.cash)[0];
      if (!poorest || poorest.id === player.id) return '自己就是最後一名，效果無效。';
      const tmp = player.cash; player.cash = poorest.cash; poorest.cash = tmp;
      return `與最後一名 ${poorest.name} 交換了總資產。`;
    }
    case 'sucker': {
      if (player.stars <= 0) return '自己沒有星星，無法送出。';
      const candidates = state.players.filter(p => p.id !== player.id && !p.ext?.eliminated);
      if (!candidates.length) return '沒有其他玩家。';
      const lowest = Math.min(...candidates.map(p => p.stars));
      const target = candidates.filter(p => p.stars === lowest)[0];
      player.stars -= 1; target.stars += 1;
      extSyncStarBlade(state, player, '把星星送走');
      extSyncStarBlade(state, target);
      return `含淚送給 ${target.name} 1 顆星。`;
    }
    default: return effect.desc;
  }
}

// ---------------------------------------------------------------------------
// 毀滅日
// ---------------------------------------------------------------------------
function extTriggerDoom(state, early = false) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'evil') return;
  const fee = ext.doomPrice;
  // 依實際回合／擲骰順序逐一結算；不再依總資產高低重排。
  const order = [...state.players].filter(p => !p.ext?.eliminated);
  const executed = [], paid = [], resisted = [];
  const executedIds = [], paidIds = [], resistedIds = [];
  const sequence = [];
  for (const p of order) {
    if (p.cash >= fee) {
      const prev = ext.noInflation; ext.noInflation = true;
      addCash(state, p, -fee);
      ext.noInflation = prev;
      paid.push(p.name);
      paidIds.push(p.id);
      sequence.push({ playerId: p.id, name: p.name, outcome: 'paid', amount: fee });
    } else if (extHasMythic(p, 'totem')) {
      p.mythics = p.mythics.filter(x => x.id !== 'totem');
      resisted.push(p.name);
      resistedIds.push(p.id);
      state.ext.totemEvent = { playerId: p.id, at: Date.now() };
      sequence.push({ playerId: p.id, name: p.name, outcome: 'resisted', amount: 0 });
      log(state, `🗿 ${p.name} 的不死圖騰擋下雷射處決！`);
    } else {
      p.ext.eliminated = true;
      p.ext.ghostRole = true;
      p.ext.aliveSeasons = p.ext.aliveSeasons || 0;
      p.ext.oneStepLock = false;
      p.ext.forceOneNext = false;
      if (ext.domain?.ownerId === p.id) ext.domain = null;
      p.stars = 0;
      p.cash = 0;
      p.items = [];
      p.mythics = [];
      p.specials = [];
      executed.push(p.name);
      executedIds.push(p.id);
      sequence.push({ playerId: p.id, name: p.name, outcome: 'executed', amount: fee });
      log(state, `💀 ${p.name} 付不出 ${extMoney(fee)} 保護費，被杜芬舒斯大樓雷射消滅，化為藍色罷工幽靈。`);
    }
  }
  ext.doomPrice += Math.max(100, Number(ext.doomStep) || DOOM_STEP);
  ext.doomCount += 1;
  ext.doomEvent = { fee, paid, executed, resisted, paidIds, executedIds, resistedIds, sequence, early, at: Date.now() };
  ext.lastEvent = { type: 'doom', ...ext.doomEvent };
  log(state, `💀 毀滅日結束：${paid.length} 人付款、${resisted.length} 人抵抗、${executed.length} 人被處決。下次保護費 ${extMoney(ext.doomPrice)}。`);
  extCheckWin(state);
}

// ---------------------------------------------------------------------------
// 除錯工具
// ---------------------------------------------------------------------------
function extDebugGive(state, kind, id) {
  if (!state.ext?.debug) throw Error('只有測試模式可以使用。');
  const p = currentOf(state);
  const isMythic = kind === 'mythic';
  const meta = isMythic ? MYTHIC_BY_ID[id] : itemById(id);
  if (!meta) throw Error(isMythic ? '神話道具不存在。' : '道具不存在。');
  extPlayerExt(p);
  const existing = isMythic ? extMythicEntry(p, id) : null;
  if (existing && meta.charges) {
    log(state, `🧪 測試模式：${p.name} 已持有「${meta.name}」，不補充使用次數。`);
    return { gained: true, itemId: id, itemKind: kind };
  }
  if (!extHasItemSpace(p)) {
    state.ext.replaceOffer = { playerId: p.id, itemId: id, itemKind: kind, price: 0, source: 'debug' };
    log(state, `🧪 測試模式：${p.name} 的道具欄已滿，需選擇替換或丟棄「${meta.name}」。`);
    return { pendingReplace: true, itemId: id, itemKind: kind };
  }
  if (isMythic) {
    p.mythics.push({ id, charges: meta.charges || 1 });
    if (id === 'bankai') p.ext.bankai = true;
  } else {
    p.items.push(id);
  }
  p.ext.itemsAcquired = (p.ext.itemsAcquired || 0) + 1;
  extNoteItem(p, meta.name);
  log(state, `🧪 測試模式：${p.name} 取得${isMythic ? '神話' : ''}道具「${meta.icon} ${meta.name}」。`);
  return { gained: true, itemId: id, itemKind: kind };
}
function extDebugTeleport(state, playerId, tileIndex) {
  if (!state.ext?.debug) throw Error('只有測試模式可以使用。');
  const p = state.players.find(x => x.id === playerId);
  const len = boardOf(state).length;
  if (!p || !Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= len) throw Error('傳送目標無效。');
  p.position = tileIndex;
  applyCornerProgress(state,p,[tileIndex]);
  log(state, `🧪 測試模式：${p.name} 被傳送到第 ${tileIndex} 格。`);
  if (tileIndex === state.ghostPosition) {
    const effects = [];
    engineHooks.ghostStrike(state, p, effects);
    state.lastRoll = { playerId: p.id, value: 0, from: tileIndex, path: [tileIndex], tileIndex, tileType: 'ghost', struck: true, effects };
    state.phase = 'resolve';
    log(state, `🧪 ${p.name} 被丟到幽靈身上，觸發罷工。`);
    extCheckWin(state);
  }
}
function extDebugGhostTo(state, tileIndex) {
  if (!state.ext?.debug) throw Error('只有測試模式可以使用。');
  if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= boardOf(state).length) throw Error('幽靈目標無效。');
  state.ghostPosition = tileIndex;
  state.ghostTrail = [];
  log(state, `🧪 測試模式：幽靈被移動到第 ${tileIndex} 格。`);
}
function extDebugRollAgain(state) {
  if (!state.ext?.debug) throw Error('只有測試模式可以使用。');
  state.phase = 'roll';
  state.pendingDecision = null;
  log(state, '🧪 測試模式：解除回合限制，可以再擲一次。');
}

// 測試模式：不論目前卡在擲骰、決策或特殊格，都能強制結束目前回合。
function extDebugEndTurn(state) {
  if (!state.ext?.debug) throw Error('只有測試模式可以使用。');
  if (!state || state.status !== 'playing') throw Error('遊戲已結束。');
  if (state.phase === 'moving') throw Error('棋子移動中，請稍候再結束回合。');
  const ext = state.ext;
  state.pendingDecision = null;
  state.pendingLanding = null;
  state.lastRoll = null;
  ext.starOffer = null;
  ext.replaceOffer = null;
  ext.forcedStarOffer = null;
  ext.eventPrompt = null;
  ext.auction = null;
  ext.investOffer = null;
  ext.taxChoice = null;
  ext.insiderOffer = null;
  ext.wheelPending = null;
  ext.wheelResult = null;
  state.phase = 'resolve';
  log(state, '🧪 測試模式：強制結束目前玩家的回合。');
  return endTurn(state);
}

// ---------------------------------------------------------------------------
// 歷史與結算
// ---------------------------------------------------------------------------
function extRecordRound(state, round, { initial = false, final = false } = {}) {
  if (!state.ext) return;
  if (!Array.isArray(state.ext.history)) state.ext.history = [];
  if (!initial && state.ext.history.some(h => h.round === round && !h.initial)) {
    const existing = state.ext.history.find(h => h.round === round && !h.initial);
    existing.players = state.players.map(p => ({
      id: p.id, name: p.name, cash: p.cash, stars: p.stars,
      alive: !p.ext?.eliminated, items: p.ext?.itemsAcquired || 0,
      aliveSeasons: p.ext?.aliveSeasons || 0, roleId: p.roleId
    }));
    return;
  }
  state.ext.history.push({
    round, initial, final,
    players: state.players.map(p => ({
      id: p.id, name: p.name, cash: p.cash, stars: p.stars,
      alive: !p.ext?.eliminated, items: p.ext?.itemsAcquired || 0,
      aliveSeasons: p.ext?.aliveSeasons || 0, roleId: p.roleId
    }))
  });
}

function extSettlementData(state) {
  const history = [...(state.ext?.history || [])].sort((a, b) => a.round - b.round);
  // 對局可能在季中結束（毀滅日、達標、連線中斷），補上目前狀態作為最後一個紀錄點，
  // 讓結算圖表與生還名單反映真正的終局，而不是上一個季末快照。
  const snapshot = {
    round: state.round, initial: false, final: state.status !== 'playing',
    players: state.players.map(p => ({
      id: p.id, name: p.name, cash: p.cash, stars: p.stars,
      alive: !p.ext?.eliminated, items: p.ext?.itemsAcquired || 0,
      aliveSeasons: p.ext?.aliveSeasons || 0, roleId: p.roleId
    }))
  };
  const signature = row => row?.players?.map(p => `${p.id}:${p.cash}:${p.stars}:${p.alive ? 1 : 0}:${p.items}:${p.aliveSeasons}`).join('|');
  const last = history.at(-1);
  if (!last || signature(last) !== signature(snapshot) || (snapshot.final && !last.final)) history.push(snapshot);
  const rounds = history.map(h => h.round);
  const players = state.players.map(p => ({ id: p.id, name: p.name, color: p.color, roleId: p.roleId, icon: extRoleOf(p).icon }));
  const metric = key => players.map(p => ({
    ...p,
    values: history.map(h => {
      const row = h.players.find(x => x.id === p.id);
      return row ? Number(row[key]) || 0 : 0;
    })
  }));
  const itemTotals = players.map(p => {
    const live = state.players.find(x => x.id === p.id);
    const gets = live?.ext?.itemGets && typeof live.ext.itemGets === 'object' ? live.ext.itemGets : {};
    const details = Object.entries(gets).map(([name, count]) => ({ name, count: Number(count) || 0 })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hant'));
    const row = [...history].reverse().map(h => h.players.find(x => x.id === p.id)).find(Boolean);
    return { ...p, total: details.reduce((s, d) => s + d.count, 0) || row?.items || 0, details };
  });
  const survival = players.map(p => {
    const last = [...history].reverse().map(h => h.players.find(x => x.id === p.id)).find(Boolean);
    return { ...p, seasons: last?.aliveSeasons || 0, alive: last?.alive ?? true };
  });
  const allEliminated = state.players.length > 0 && state.players.every(p => p.ext?.eliminated);
  return {
    rounds, players,
    cash: metric('cash'), stars: metric('stars'),
    survival, itemTotals,
    allEliminated,
    winners: state.players.filter(p => state.winnerIds.includes(p.id)),
    title: state.ext?.finishTitle || extMode(state).name,
    subtitle: state.ext?.mode === 'evil' && allEliminated ? '無人生還' : '',
    reason: state.resultReason,
    mode: extMode(state)
  };
}

function extReturnToLobbyState(state) {
  if (!state?.ext) return;
  state.ext.confirmed = [];
}

// 初始化時註冊所有掛鉤（檔尾確保已定義）
engineHooks.extraStatusChips = extStatusChips;


// Revision ordering is shared by every tab; page navigation stays local to each tab.
function syncInfo(game){
  if(!game)return null;
  return game.sync||{
    gameId:`legacy:${game.seed}:${game.players?.map(p=>p.name).join('|')}`,
    revision:0,
    updatedAt:0,
    writerId:''
  };
}

function isNewerGame(incoming,current){
  if(!incoming)return false;
  if(!current)return true;
  const a=syncInfo(incoming),b=syncInfo(current);
  if(a.gameId===b.gameId){
    if(a.revision!==b.revision)return a.revision>b.revision;
    if(a.updatedAt!==b.updatedAt)return a.updatedAt>b.updatedAt;
    return a.writerId>b.writerId;
  }
  if(a.updatedAt!==b.updatedAt)return a.updatedAt>b.updatedAt;
  return a.gameId>b.gameId;
}


// 多人房間 / PeerJS P2P 連線層
const PartyNet = (() => {
  const rid = () => (globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  class Net {
    constructor() {
      this.code = '';
      this.peerId = '';
      this.hostId = '';
      this.host = false;
      this.name = '';
      this.lobby = null;
      this.active = false;
      this.connectedPeers = new Set();
      this.peers = new Map();
      this.seen = new Set();
      this._peer = null;
      this.onLobby = null;
      this.onStart = null;
      this.onState = null;
      this.onAction = null;
      this.onEvent = null;
      this.onReturnLobby = null;
      this.onStatus = null;
      this.onError = null;
    }

    get isHost() { return this.host; }
    get isClient() { return this.active && !this.host; }
    get myIndex() { return this.lobby?.players?.findIndex(p => p.peerId === this.peerId) ?? -1; }
    get myPlayerId() { const i = this.myIndex; return i >= 0 ? `player-${i + 1}` : null; }
    get myPlayer() { return this.lobby?.players?.[this.myIndex] || null; }

    status(text) { try { this.onStatus?.(text); } catch { } }
    error(text) { try { this.onError?.(text); } catch { } }

    createRoom({ name, roleId = 'random' } = {}) {
      this.leave(false);
      const PeerConstructor = globalThis.Peer;
      if (typeof PeerConstructor !== 'function') throw Error('PeerJS 尚未載入，請確認網路連線後重新整理。');
      this.host = true;
      this.active = true;
      this.name = name || '房主';
      this.lobby = {
        code: '', hostId: '', status: 'waiting', mode: 'star', rounds: 10, target: 0,
        starGoal: 3, doomEvery: 5, doomPrice: 1000, doomStep: 500, debug: false,
        confirms: [], createdAt: Date.now(),
        players: []
      };
      const peer = new PeerConstructor();
      this._peer = peer;
      peer.on('open', peerId => {
        if (!this.active || this._peer !== peer) return;
        this.peerId = peerId;
        this.hostId = peerId;
        this.code = peerId;
        this.lobby.code = peerId;
        this.lobby.hostId = peerId;
        this.lobby.players = [{ peerId, name: this.name, roleId, host: true, connected: true }];
        this.emitLobby();
        this.broadcastLobby();
        this.status(`房間 ${this.code} 已建立，等待玩家加入。`);
      });
      peer.on('connection', conn => this.wireConnection(conn));
      peer.on('error', error => this.error(error?.message || 'PeerJS 連線錯誤'));
      this.emitLobby();
      this.status('正在建立 PeerJS 房間…');
      return this.lobby;
    }

    joinRoom(code, name) {
      this.leave(false);
      this.code = String(code || '').trim();
      if (!this.code || this.code.length > 128) throw Error('請輸入有效的 Peer ID。');
      const PeerConstructor = globalThis.Peer;
      if (typeof PeerConstructor !== 'function') throw Error('PeerJS 尚未載入，請確認網路連線後重新整理。');
      this.host = false;
      this.hostId = this.code;
      this.active = true;
      this.name = name || '玩家';
      this.lobby = {
        code: this.code, hostId: this.hostId, status: 'waiting', mode: 'star', rounds: 10, target: 0,
        starGoal: 3, doomEvery: 5, doomPrice: 1000, doomStep: 500, debug: false,
        confirms: [], players: [{ peerId: this.peerId, name: this.name, roleId: 'random', connected: true }]
      };
      const peer = new PeerConstructor();
      this._peer = peer;
      peer.on('open', peerId => {
        if (!this.active || this._peer !== peer) return;
        this.peerId = peerId;
        this.lobby.players[0].peerId = peerId;
        this.wireConnection(peer.connect(this.hostId));
      });
      peer.on('error', error => this.error(error?.message || 'PeerJS 連線錯誤'));
      this.emitLobby();
      this.status(`正在加入房間 ${this.code}…`);
      return this.lobby;
    }

    leave(notify = true) {
      this.active = false;
      for (const rec of this.peers.values()) { try { rec.conn?.close(); } catch { } }
      try { this._peer?.destroy(); } catch { }
      this.peers.clear();
      this.connectedPeers.clear();
      this._peer = null;
      this.host = false;
      this.code = '';
      this.hostId = '';
      this.lobby = null;
      this.seen.clear();
      if (notify) this.emitLobby();
    }

    wireConnection(conn) {
        if (!conn?.peer) return;
        const peerId = conn.peer;
        this.peers.set(peerId, { conn });
        conn.on('open', () => {
          if (!this.active) return;
          this.connectedPeers.add(peerId);
          if (this.host) {
            const player = this.lobby?.players.find(entry => entry.peerId === peerId);
            if (player) player.connected = true;
            conn.send({ type: 'SYSTEM', message: '連線成功' });
            this.broadcastLobby();
            this.status(`${peerId} 已連線。`);
          } else {
            this.sendData({ t: 'hello', name: this.name }, this.hostId);
            this.status('PeerJS 已連線。');
          }
        });
        conn.on('data', data => {
          let message = data;
          if (typeof message === 'string') {
            try { message = JSON.parse(message); } catch { return; }
          }
          if (message?.type === 'SYSTEM') {
            console.log(message.message);
            return;
          }
          this.handleData(message, peerId);
        });
        conn.on('close', () => {
          this.connectedPeers.delete(peerId);
          this.peers.delete(peerId);
          const player = this.lobby?.players.find(entry => entry.peerId === peerId);
          if (player) {
            player.connected = false;
            if (this.host) this.broadcastLobby();
          }
        });
        conn.on('error', error => this.error(error?.message || 'PeerJS 資料連線錯誤'));
    }

    addPlayer(peerId, name) {
      if (!this.host || !this.lobby) return;
      let player = this.lobby.players.find(p => p.peerId === peerId);
      if (!player) {
        if (this.lobby.status !== 'waiting') { this.sendData({ t: 'error', text: '對局已開始，暫時無法加入。' }, peerId); return; }
        player = { peerId, name, roleId: 'random', host: false, connected: false };
        this.lobby.players.push(player);
      } else if (name) player.name = name;
      this.emitLobby();
    }

    setMode(mode) {
      if (!this.host || !this.lobby) return;
      this.lobby.mode = mode;
      this.broadcastLobby();
    }
    setRounds(rounds) { if (!this.host || !this.lobby) return; this.lobby.rounds = Number(rounds) || 10; this.broadcastLobby(); }
    setDebug(debug) { if (!this.host || !this.lobby) return; this.lobby.debug = Boolean(debug); this.broadcastLobby(); }
    setTarget(target) { if (!this.host || !this.lobby) return; this.lobby.target = Number(target) || 0; this.broadcastLobby(); }
    setStarGoal(goal) { if (!this.host || !this.lobby) return; this.lobby.starGoal = Math.max(1, Number(goal) || 3); this.broadcastLobby(); }
    setDoomEvery(every) { if (!this.host || !this.lobby) return; this.lobby.doomEvery = Math.max(1, Number(every) || 5); this.broadcastLobby(); }
    setDoomPrice(price) { if (!this.host || !this.lobby) return; this.lobby.doomPrice = Math.max(100, Number(price) || 1000); this.broadcastLobby(); }
    setDoomStep(step) { if (!this.host || !this.lobby) return; this.lobby.doomStep = Math.max(100, Number(step) || 500); this.broadcastLobby(); }

    selectRole(roleId) {
      if (!this.active) return;
      if (this.host) {
        const p = this.myPlayer; if (p) { p.roleId = roleId; }
        this.broadcastLobby();
      } else if (this.hostId) {
        this.sendData({ t: 'role', roleId }, this.hostId);
      }
    }

    renameSelf(name) {
      if (!this.active) return;
      if (this.host) { const p = this.myPlayer; if (p) p.name = name; this.broadcastLobby(); }
      else if (this.hostId) this.sendData({ t: 'rename', name }, this.hostId);
    }

    startGame() {
      if (!this.host || !this.lobby) throw Error('只有房主可以開始對局。');
      if (this.lobby.players.length < 2) throw Error('至少需要 2 位玩家。');
      if (this.lobby.players.length > 8) throw Error('最多 8 位玩家。');
      const fixed = this.lobby.players.filter(p => p.roleId !== 'random').map(p => p.roleId);
      if (new Set(fixed).size !== fixed.length) throw Error('企業角色不可重複（未定新創集團除外）。');
      this.lobby.status = 'playing';
      this.lobby.confirms = [];
      const config = {
        seed: Date.now(),
        players: this.lobby.players.map(p => ({ name: p.name, roleId: p.roleId })),
        mode: this.lobby.mode,
        rounds: this.lobby.rounds,
        target: this.lobby.target,
        starGoal: this.lobby.starGoal,
        doomEvery: this.lobby.doomEvery,
        doomPrice: this.lobby.doomPrice,
        doomStep: this.lobby.doomStep,
        debug: this.lobby.debug,
        net: {
          roomCode: this.code, hostId: this.hostId,
          owners: Object.fromEntries(this.lobby.players.map((p, i) => [`player-${i + 1}`, p.peerId])),
          peerNames: Object.fromEntries(this.lobby.players.map((p, i) => [p.peerId, p.name]))
        }
      };
      this.broadcastData({ t: 'start', config });
      this.broadcastLobby();
      this.onStart?.(config);
    }

    publish(state) {
      if (!this.active || !this.host || !state) return;
      this.broadcastState(state);
    }

    sendAction(action) {
      if (!this.active || this.host || !this.hostId || !action?.type) return false;
      this.sendData({ t: 'action', action }, this.hostId);
      return true;
    }

    broadcastState(game) {
      if (!this.active || !this.host || !game) return;
      this.broadcastData({ t: 'state', game });
    }

    broadcastEvent(event) {
      if (!this.active || !this.host || !event?.type) return;
      this.onEvent?.(event, this.peerId);
      this.broadcastData({ t: 'event', event });
    }

    broadcastData(msg) {
      this.sendData(msg, 'all');
    }

    sendData(msg, target = 'all') {
      if (!this.active) return;
      const packet = { ...msg, mid: rid(), fromPeer: this.peerId, at: Date.now() };
      if (target === 'all') {
        for (const [peerId, rec] of this.peers) {
          if (peerId !== this.peerId && rec.conn?.open) { try { rec.conn.send(packet); } catch { } }
        }
      } else {
        const rec = this.peers.get(target);
        if (rec?.conn?.open) { try { rec.conn.send(packet); } catch { } }
      }
    }

    _markSeen(mid) {
      if (!mid) return false;
      if (this.seen.has(mid)) return true;
      this.seen.add(mid);
      if (this.seen.size > 500) this.seen.delete(this.seen.values().next().value);
      return false;
    }

    handleData(msg, fromPeer) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'SYSTEM') { console.log(msg.message); return; }
      if (msg.fromPeer === this.peerId) return;
      if (this._markSeen(msg.mid)) return;
      if (msg.t === 'lobby' && msg.lobby) {
        this.lobby = msg.lobby;
        if (msg.lobby.hostId) this.hostId = msg.lobby.hostId;
        this.emitLobby();
        return;
      }
      if (msg.t === 'hello') {
        if (this.host) {
          this.addPlayer(fromPeer, msg.name);
          const p = this.lobby.players.find(x => x.peerId === fromPeer);
          if (p) p.connected = true;
          this.connectedPeers.add(fromPeer);
          this.broadcastLobby();
          this.sendData({ t: 'lobby', lobby: this.lobby }, fromPeer);
        }
        return;
      }
      if (msg.t === 'state' && msg.game) {
        if (!this.host && fromPeer === this.hostId) this.onState?.(msg.game, fromPeer);
        return;
      }
      if (msg.t === 'action' && this.host) {
        this.onAction?.(msg.action, fromPeer);
        return;
      }
      if (msg.t === 'event' && !this.host && fromPeer === this.hostId) {
        this.onEvent?.(msg.event, fromPeer);
        return;
      }
      if (msg.t === 'start' && msg.config) {
        if (this.lobby) this.lobby.status = 'playing';
        this.onStart?.(msg.config);
        return;
      }
      if (msg.t === 'role' && this.host) {
        const p = this.lobby.players.find(x => x.peerId === fromPeer);
        if (p) { p.roleId = msg.roleId; this.broadcastLobby(); }
        return;
      }
      if (msg.t === 'rename' && this.host) {
        const p = this.lobby.players.find(x => x.peerId === fromPeer);
        if (p && msg.name) { p.name = String(msg.name).slice(0, 16); this.broadcastLobby(); }
        return;
      }
      if (msg.t === 'confirm' && this.host) {
        this.confirmResult(msg.playerId || '');
        return;
      }
      if (msg.t === 'confirm-update' && msg.lobby) {
        this.lobby = msg.lobby; this.emitLobby(); return;
      }
      if (msg.t === 'return-lobby') {
        if (this.lobby) this.lobby.status = 'waiting';
        this.onReturnLobby?.(this.lobby);
        return;
      }
      if (msg.t === 'error') { this.error(msg.text || '連線錯誤'); return; }
    }

    broadcastLobby() {
      if (!this.lobby) return;
      this.emitLobby();
      this.broadcastData({ t: 'lobby', lobby: this.lobby });
    }

    emitLobby() {
      try { this.onLobby?.(this.lobby); } catch (e) { console.error(e); }
    }

    confirmResult(playerId) {
      if (!this.active) return { confirmed: 0, total: 0 };
      if (!this.host) {
        if (this.hostId) this.sendData({ t: 'confirm', playerId: playerId || this.myPlayerId }, this.hostId);
        return null;
      }
      if (!this.lobby) return null;
      if (playerId && !this.lobby.confirms.includes(playerId)) this.lobby.confirms.push(playerId);
      const total = this.lobby.players.length;
      const confirmed = this.lobby.players.filter((p, i) => this.lobby.confirms.includes(`player-${i + 1}`) || this.lobby.confirms.includes(p.peerId)).length;
      this.lobby.confirmRatio = { confirmed, total };
      if (confirmed >= total) {
        this.lobby.status = 'waiting';
        this.lobby.confirms = [];
        this.lobby.confirmRatio = { confirmed: 0, total };
        this.broadcastLobby();
        this.broadcastData({ t: 'return-lobby' });
        this.onReturnLobby?.(this.lobby);
      } else {
        this.broadcastLobby();
      }
      return this.lobby.confirmRatio;
    }

    // ---- 權限 -----------------------------------------------------------
    canAct(state) {
      if (!this.active || !state) return true;
      const owners = state.net?.owners;
      if (!owners) return true;
      const active = state.players?.[state.turnIndex];
      if (!active) return true;
      const owner = owners[active.id];
      return !owner || owner === this.peerId;
    }

    ownerName(state) {
      const active = state?.players?.[state?.turnIndex];
      const owner = state?.net?.owners?.[active?.id];
      return state?.net?.peerNames?.[owner] || '';
    }
  }

  return new Net();
})();

// ---- 邀請連結（大廳 QR Code 的內容） ------------------------------------
// 目前網址加上 ?room=代碼；file:// 或 localhost 的網址別的裝置打不開，回傳空字串。
function roomInviteLink(href, code) {
  const roomCode = String(code || '').trim();
  if (!roomCode) return '';
  let url;
  try { url = new URL(href); } catch { return ''; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
  if (/^(localhost|127(\.\d+){3}|\[::1\])$/i.test(url.hostname)) return '';
  url.hash = '';
  url.searchParams.set('room', roomCode);
  return url.href;
}

// 從網址讀出 ?room=代碼，沒有時回傳空字串。
function roomCodeFromLink(href) {
  try { return (new URL(href).searchParams.get('room') || '').trim(); } catch { return ''; }
}

globalThis.PartyNet = PartyNet;


// ============================================================================
// 全域音效管理器（非破壞性新增）
// 使用 WebAudio 即時合成，不需外部音檔；所有音效由 Hook 觸發。
// ============================================================================
const SoundManager = (() => {
  let ctx = null;
  let master = null;
  let volume = 0.55;
  let muted = false;
  let unlocked = false;
  const media = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem('party-audio-v1') || '{}');
    if (typeof saved.volume === 'number') volume = Math.max(0, Math.min(1, saved.volume));
    muted = Boolean(saved.muted);
  } catch { }

  function ensure() {
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => { });
    return ctx;
  }

  function save() {
    try { localStorage.setItem('party-audio-v1', JSON.stringify({ volume, muted })); } catch { }
    if (master) master.gain.value = muted ? 0 : volume;
    for (const rec of media.values()) {
      try { rec.el.volume = muted ? 0 : Math.max(0, Math.min(1, volume * (rec.gain || 1))); } catch { }
    }
    const el = document.querySelector('#volume-slider');
    if (el) el.value = String(Math.round(volume * 100));
    const btn = document.querySelector('#mute-btn');
    if (btn) { btn.textContent = muted ? '🔇' : '🔊'; btn.title = muted ? '取消靜音' : '一鍵靜音'; }
  }

  function playMedia(name, src, { gain = 1 } = {}) {
    if (muted) return;
    try {
      let rec = media.get(name);
      if (!rec) {
        const el = new Audio(src);
        el.preload = 'auto';
        rec = { el, gain };
        media.set(name, rec);
      }
      rec.el.pause();
      rec.el.currentTime = 0;
      rec.el.volume = Math.max(0, Math.min(1, volume * gain));
      const task = rec.el.play();
      if (task?.catch) task.catch(() => { });
    } catch { }
  }

  function tone({ freq = 440, endFreq = freq, dur = 0.12, type = 'sine', gain = 0.15, delay = 0, sweep = false }) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (sweep || endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }

  function noise({ dur = 0.25, gain = 0.12, delay = 0, lowpass = 1200 }) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = lowpass;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t0);
  }

  const sounds = {
    click() { tone({ freq: 520, endFreq: 640, dur: 0.05, type: 'triangle', gain: 0.08 }); },
    hover() { tone({ freq: 720, dur: 0.035, type: 'sine', gain: 0.035 }); },
    dice() { for (let i = 0; i < 7; i++) tone({ freq: 220 + Math.random() * 300, dur: 0.055, type: 'square', gain: 0.045, delay: i * 0.07 }); },
    move() { tone({ freq: 380, endFreq: 520, dur: 0.09, type: 'triangle', gain: 0.07 }); },
    coin() { tone({ freq: 880, dur: 0.08, type: 'triangle', gain: 0.1 }); tone({ freq: 1320, dur: 0.12, type: 'triangle', gain: 0.08, delay: 0.07 }); },
    marketBull() { [880, 1100, 1320].forEach((freq, i) => tone({ freq, dur: 0.16, type: 'sine', gain: 0.09, delay: i * 0.07 })); },
    marketStable() { tone({ freq: 560, dur: 0.2, type: 'triangle', gain: 0.08 }); tone({ freq: 700, dur: 0.18, type: 'triangle', gain: 0.06, delay: 0.11 }); },
    marketPonzi() { [360, 280, 190].forEach((freq, i) => tone({ freq, endFreq: freq * 0.82, dur: 0.22, type: 'triangle', gain: 0.09, delay: i * 0.08, sweep: true })); },
    cashGain() { [720, 980, 1240, 1560].forEach((f, i) => tone({ freq: f, dur: 0.13, type: 'triangle', gain: 0.08, delay: i * 0.055 })); },
    cashLoss() { [620, 470, 340, 240].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'sawtooth', gain: 0.055, delay: i * 0.07, sweep: true, endFreq: f * .72 })); noise({ dur: 0.32, gain: 0.03, lowpass: 900 }); },
    magic() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, endFreq: f * 1.02, dur: 0.3, type: 'sine', gain: 0.075, delay: i * 0.045 })); tone({ freq: 1760, dur: 0.5, type: 'sine', gain: 0.035, delay: 0.18 }); noise({ dur: 0.35, gain: 0.025, lowpass: 5200 }); },
    domain() { tone({ freq: 92, endFreq: 68, dur: 0.7, type: 'sawtooth', gain: 0.12, sweep: true }); tone({ freq: 430, endFreq: 260, dur: 0.5, type: 'triangle', gain: 0.07, delay: 0.05, sweep: true }); noise({ dur: 0.45, gain: 0.06, lowpass: 1600 }); },
    witch() { playMedia('witch-factor', new URL('./witch_factor.mp3', document.baseURI).href, { gain: 1 }); tone({ freq: 300, endFreq: 110, dur: 0.9, type: 'sine', gain: 0.1, sweep: true }); noise({ dur: 0.8, gain: 0.05, lowpass: 900 }); },
    endingStar() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone({ freq: f, dur: 0.45, type: 'triangle', gain: 0.1, delay: i * 0.12 })); noise({ dur: 1.2, gain: 0.02, lowpass: 7000 }); },
    endingTycoon() { [262, 330, 392, 523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.4, type: 'square', gain: 0.06, delay: i * 0.1 })); for (let i = 0; i < 8; i++) tone({ freq: 1200 + (i % 3) * 260, dur: 0.1, type: 'triangle', gain: 0.045, delay: 0.35 + i * 0.07 }); },
    star() { [660, 880, 1100, 1320].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'sine', gain: 0.1, delay: i * 0.08 })); },
    ghost() { tone({ freq: 310, endFreq: 90, dur: 0.65, type: 'sine', gain: 0.12, sweep: true }); noise({ dur: 0.5, gain: 0.05, lowpass: 700 }); },
    doom() { tone({ freq: 55, endFreq: 30, dur: 1.4, type: 'sawtooth', gain: 0.18, sweep: true }); noise({ dur: 1.2, gain: 0.1, lowpass: 500 }); },
    laser() { tone({ freq: 1400, endFreq: 80, dur: 1.0, type: 'sawtooth', gain: 0.15, sweep: true }); noise({ dur: 0.8, gain: 0.1, lowpass: 2400 }); },
    explosion() { noise({ dur: 0.9, gain: 0.28, lowpass: 900 }); tone({ freq: 95, endFreq: 28, dur: 0.8, type: 'square', gain: 0.16, sweep: true }); },
    inflation() { for (let i = 0; i < 5; i++) tone({ freq: 420 + i * 110, dur: 0.22, type: 'square', gain: 0.11, delay: i * 0.18 }); },
    alarm() { for (let i = 0; i < 6; i++) tone({ freq: i % 2 ? 620 : 880, dur: 0.16, type: 'square', gain: 0.09, delay: i * 0.2 }); },
    whoosh() { noise({ dur: 0.45, gain: 0.1, lowpass: 1800 }); tone({ freq: 180, endFreq: 700, dur: 0.4, type: 'sine', gain: 0.05, sweep: true }); },
    wheel() { for (let i = 0; i < 16; i++) tone({ freq: 500 + (i % 4) * 70, dur: 0.05, type: 'triangle', gain: 0.05, delay: i * 0.09 }); },
    freeze() { tone({ freq: 1600, endFreq: 2100, dur: 0.4, type: 'sine', gain: 0.08, sweep: true }); noise({ dur: 0.35, gain: 0.04, lowpass: 4000 }); },
    frozen() { playMedia('frozen', new URL('./frozen.mp3', document.baseURI).href, { gain: 1 }); },
    // 矢量傳送與幽靈專屬音效原本偏大，統一壓到約 45%，避免突然爆音。
    swing() { playMedia('swing', new URL('./swing.mp3', document.baseURI).href, { gain: .45 }); },
    totem() { playMedia('totem', new URL('./minecraft-totem-sound.mp3', document.baseURI).href, { gain: 1 }); },
    ghostLaugh() { playMedia('king-boos-laugh', new URL('./king-boos-laugh.mp3', document.baseURI).href, { gain: .45 }); },
    cuff() {
      // 金屬鎖銬扣上：短促高頻金屬聲 + 兩段機械卡榫。
      noise({ dur: 0.08, gain: 0.16, lowpass: 5600 });
      tone({ freq: 2100, endFreq: 1250, dur: 0.07, type: 'square', gain: 0.1, sweep: true });
      tone({ freq: 950, endFreq: 620, dur: 0.09, type: 'triangle', gain: 0.08, delay: 0.055, sweep: true });
      noise({ dur: 0.1, gain: 0.12, lowpass: 3200, delay: 0.1 });
      tone({ freq: 480, endFreq: 340, dur: 0.08, type: 'square', gain: 0.06, delay: 0.11, sweep: true });
    },
    paper() { noise({ dur: 0.36, gain: 0.12, lowpass: 3600 }); noise({ dur: 0.18, gain: 0.08, lowpass: 5200, delay: 0.09 }); tone({ freq: 240, endFreq: 170, dur: 0.22, type: 'triangle', gain: 0.04, sweep: true }); },
    bankai() { noise({ dur: 0.7, gain: 0.16, lowpass: 2600 }); tone({ freq: 70, endFreq: 42, dur: 0.9, type: 'sawtooth', gain: 0.14, sweep: true }); tone({ freq: 1200, endFreq: 180, dur: 0.35, type: 'sawtooth', gain: 0.1, sweep: true, delay: 0.12 }); },
    lightning() { noise({ dur: 0.22, gain: 0.2, lowpass: 5000 }); tone({ freq: 1900, endFreq: 140, dur: 0.25, type: 'sawtooth', gain: 0.12, sweep: true }); },
    victory() { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.4, type: 'triangle', gain: 0.12, delay: i * 0.16 })); },
    error() { tone({ freq: 220, endFreq: 160, dur: 0.2, type: 'square', gain: 0.08, sweep: true }); },
    slide() { tone({ freq: 300, endFreq: 900, dur: 0.35, type: 'sine', gain: 0.06, sweep: true }); }
  };

  function play(name) {
    ensure();
    const fn = sounds[name];
    if (!fn) return;
    try { fn(); } catch { }
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    ensure();
  }

  function injectControls() {
    const actions = document.querySelector('.top-actions');
    if (!actions || document.querySelector('#volume-slider')) return;
    const wrap = document.createElement('span');
    wrap.className = 'audio-controls';
    wrap.innerHTML = `<button id="mute-btn" class="quiet audio-btn" type="button" title="一鍵靜音">${muted ? '🔇' : '🔊'}</button><input id="volume-slider" class="volume-slider" type="range" min="0" max="100" value="${Math.round(volume * 100)}" aria-label="音量">`;
    actions.prepend(wrap);
    wrap.querySelector('#mute-btn').addEventListener('click', () => { muted = !muted; save(); play('click'); });
    wrap.querySelector('#volume-slider').addEventListener('input', e => { volume = Number(e.target.value) / 100; if (volume > 0) muted = false; save(); });
    wrap.querySelector('#volume-slider').addEventListener('change', () => play('click'));
    save();
  }

  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
  document.addEventListener('click', e => {
    if (e.target.closest('button, [data-item-id], [data-tile-index], .tab, .lobby-role')) play('click');
  }, true);
  document.addEventListener('DOMContentLoaded', injectControls);
  if (document.readyState !== 'loading') setTimeout(injectControls, 0);

  return {
    play, unlock, injectControls,
    get volume() { return volume; },
    get muted() { return muted; },
    setVolume(v) { volume = Math.max(0, Math.min(1, Number(v))); save(); },
    toggleMute() { muted = !muted; save(); return muted; }
  };
})();

globalThis.SoundManager = SoundManager;


// ============================================================================
// 派對擴充 UI（動態掛載，不破壞原始 index.html 結構）
// ============================================================================

const PartyUI = (() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => Math.round(Number(n) || 0).toLocaleString('zh-TW');
  const colors = ['#0f9688', '#5979b0', '#ce9460', '#aa6b91', '#c55d5d', '#7e9541', '#348da5', '#7a60ad'];
  const app = () => window.PartyApp;
  const state = () => app()?.state || null;
  const sound = n => { try { window.SoundManager?.play(n); } catch { } };
  const shorten = (name, max = 6) => String(name || '').length > max ? `${String(name).slice(0, max)}...` : String(name || '');
  const esc = h;

  function localPlayerId() {
    const net = window.PartyNet;
    return net?.active ? net.myPlayerId : null;
  }
  function isLocalOwner(p, playerId) {
    if (!p?.net || !window.PartyNet?.active) return true;
    return Boolean(playerId) && localPlayerId() === playerId;
  }
  function specialOwnerId(p) {
    const ext = p?.ext;
    if (!ext) return null;
    if (ext.auction) return ext.auction.currentId || null;
    if (ext.replaceOffer) return ext.replaceOffer.playerId || null;
    if (ext.starOffer) return ext.starOffer.playerId || null;
    if (ext.investOffer) return ext.investOffer.playerId || null;
    if (ext.taxChoice) return ext.taxChoice.playerId || null;
    if (ext.insiderOffer) return ext.insiderOffer.playerId || null;
    if (ext.eventPrompt) return ext.eventPrompt.playerId || null;
    return null;
  }
  function hasSpecialOffer(p) {
    return Boolean(p?.ext?.auction || p?.ext?.replaceOffer || p?.ext?.starOffer || p?.ext?.investOffer || p?.ext?.taxChoice || p?.ext?.insiderOffer || p?.ext?.eventPrompt);
  }
  function canUseLocalAction(p) {
    if (!p?.net || !window.PartyNet?.active) return true;
    if (!window.PartyNet.canAct(p)) return false;
    if (hasSpecialOffer(p)) return isLocalOwner(p, specialOwnerId(p));
    return true;
  }
  function playerName(p, id) {
    return p?.players?.find(x => x.id === id)?.name || '';
  }
  // 房間 QR Code：qrcode-generator 由 index.html 從 unpkg 載入；沒載到時大廳只顯示代碼。
  let qrCache = { text: '', svg: '' };
  function qrSvg(text) {
    if (!text || typeof globalThis.qrcode !== 'function') return '';
    if (qrCache.text === text) return qrCache.svg;
    try {
      const qr = globalThis.qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      qrCache = { text, svg: qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true }) };
      return qrCache.svg;
    } catch { return ''; }
  }

  let modal = null;
  let tilePick = null;
  let debugSelected = null;
  let lastEventKey = '';
  let lastCornerSubsidyKey = '';
  let lastInvestmentSettlementKey = '';
  let investmentSoundTimers = [];
  let lastFinalRound = null;
  let lastFinishKey = '';
  let lastWheelKey = '';
  let lastIndulgenceKey = '';
  let lastVectorKey = '';
  let lastVectorPendingKey = '';
  let vectorLockUntil = 0;
  let vectorLockTimer = null;
  let lastVictoryKey = '';
  let ghostStrikeTimer = null;
  let doomTimers = [];
  let victoryTimer = null;
  let lastBankaiKey = '';
  let lastIceKey = '';
  let lastBankruptKey = '';
  let lastTotemKey = '';
  let wheelTimers = [];
  let openingTimer = [];
  let finishTimer = null;
  let endingTimer = null;
  let replaceDropConfirm = false;
  let settlementLockUntil = 0;
  let eventPromptKey = '';
  let decisionGateKey = '';
  let decisionGateUntil = 0;
  let decisionTimer = null;
  let wheelResolving = false;
  let wheelOpen = false;

  // -------------------------------------------------------------------------
  // 基礎掛載
  // -------------------------------------------------------------------------
  function ensureRoot() {
    let root = $('#party-ext-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'party-ext-root';
      document.body.appendChild(root);
    }
    if (!$('#opening-overlay')) {
      root.insertAdjacentHTML('beforeend', `
        <div id="opening-overlay" class="ext-overlay opening-overlay" hidden></div>
        <div id="event-flash" class="event-flash" hidden></div>
        <div id="ice-overlay" class="fx-layer ice-overlay" hidden></div>
        <div id="bankai-overlay" class="fx-layer bankai-overlay" hidden><div class="bankai-smoke"></div><strong class="bankai-title">卍解</strong></div>
        <div id="totem-overlay" class="fx-layer totem-overlay" hidden><span class="totem-icon">🗿</span></div>
        <div id="indulgence-overlay" class="fx-layer indulgence-overlay" hidden><div class="indulgence-banner">已使用贖罪券抵禦罪惡</div></div>
        <div id="ghost-strike-overlay" class="fx-layer ghost-strike-overlay" hidden><div class="ghost-strike-ghost" aria-hidden="true">👻</div><div class="ghost-strike-copy"><strong>幽靈干擾</strong><small>罷工幽靈正在干擾企業經營</small></div></div>
        <div id="doom-sequence" class="doom-sequence" hidden><div class="doom-sequence-title" role="status"></div><div class="doom-sequence-sub"></div></div>
        <div id="victory-pending-banner" class="victory-pending-banner" hidden></div>
        <div id="wheel-overlay" class="ext-overlay wheel-overlay" hidden></div>
        <div id="ext-modal" class="ext-overlay ext-modal" hidden>
          <div class="ext-modal-backdrop"></div>
          <div class="ext-modal-card" role="dialog" aria-modal="true">
            <button class="ext-modal-close" type="button" aria-label="關閉">×</button>
            <p class="ext-kicker"></p>
            <div class="ext-icon">✦</div>
            <h2 class="ext-title"></h2>
            <p class="ext-text"></p>
            <div class="ext-body"></div>
            <div class="ext-actions"></div>
          </div>
        </div>
        <div id="party-lobby" class="ext-overlay lobby-overlay" hidden></div>
        <div id="party-connect" class="ext-overlay connect-overlay" hidden></div>
        <div id="settlement-overlay" class="ext-overlay settlement-overlay" hidden></div>
        <div id="witch-overlay" class="witch-overlay" hidden><span class="witch-mark">🦠</span><div><strong>魔女因子 · 死亡回歸</strong><small>世界倒轉，全場狀態回溯至本次擲骰前</small></div></div>
        <div id="ending-overlay" class="ending-overlay" hidden></div>
      `);
    }
  }

  // -------------------------------------------------------------------------
  // 模式 / 測試 / 多人入口
  // -------------------------------------------------------------------------
  function setupFieldVisibility(box, mode, reset = false) {
    const { GAME_MODES } = window.__partyData || {};
    const meta = GAME_MODES?.[mode] || {};
    const fields = mode === 'star' ? ['rounds', 'starGoal']
      : mode === 'tycoon' ? ['rounds', 'target']
        : mode === 'evil' ? ['rounds', 'doomEvery', 'doomPrice', 'doomStep']
          : [];
    box.querySelectorAll('[data-setup-field]').forEach(label => {
      const key = label.dataset.setupField;
      const visible = fields.includes(key);
      label.classList.toggle('hidden', !visible);
      const input = label.querySelector('input');
      if (input) input.disabled = mode === 'random' || !visible;
    });
    const note = $('#setup-lock-note');
    if (note) note.hidden = mode !== 'random';
    if (!reset) return;
    const set = (id, value) => { const el = $(id); if (el) el.value = value; };
    set('#rounds-input', meta.defaultRounds || 10);
    set('#star-goal-input', meta.starGoal || 3);
    set('#target-input', meta.defaultTarget || 8000);
    set('#doom-every-input', 5);
    set('#doom-price-input', 1000);
    set('#doom-step-input', 500);
  }
  function renderSetupExtras() {
    const card = $('.setup-card');
    if (!card) return;
    let box = $('#ext-setup');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ext-setup';
      box.className = 'ext-setup';
      const anchor = card.querySelector('.setup-options');
      if (anchor) anchor.insertAdjacentElement('afterend', box);
      else card.appendChild(box);
    }
    const { GAME_MODES } = window.__partyData || {};
    const mode = state()?.ext?.mode || $('#mode-select')?.value || 'star';
    const meta = GAME_MODES?.[mode] || { name: '企業之星', icon: '🌟', desc: '', defaultRounds: 10, defaultTarget: 0 };
    box.innerHTML = `
      <div class="ext-setup-head"><span>🎮 對局模式</span><small>建立對局時可選擇，隨機模式會抽出三種之一</small></div>
      <div class="mode-picker" id="mode-select-wrap">
        ${['star', 'tycoon', 'evil', 'random'].map(id => {
          const m = GAME_MODES?.[id];
          if (!m) return '';
          return `<button type="button" class="mode-card ${id === mode ? 'active' : ''}" data-mode-id="${id}"><span>${m.icon}</span><strong>${h(m.name)}</strong><small>${h(m.desc)}</small></button>`;
        }).join('')}
      </div>
      <input type="hidden" id="mode-select" value="${h(mode)}">
      <div id="mode-desc" class="mode-desc">${h(meta.desc)}</div>
      <div class="ext-option-row">
        <label class="ext-target" data-setup-field="rounds">最多季數<input id="rounds-input" type="number" min="3" max="30" value="${meta.defaultRounds || 10}"></label>
        <label class="ext-target" data-setup-field="starGoal">勝利星數<input id="star-goal-input" type="number" min="1" max="10" value="${meta.starGoal || 3}"></label>
        <label class="ext-target" data-setup-field="target">總資產目標<input id="target-input" type="number" min="2000" step="500" value="${meta.defaultTarget || 8000}"></label>
        <label class="ext-target" data-setup-field="doomEvery">保護費間隔（季）<input id="doom-every-input" type="number" min="1" max="30" value="5"></label>
        <label class="ext-target" data-setup-field="doomPrice">初始保護費<input id="doom-price-input" type="number" min="100" step="100" value="1000"></label>
        <label class="ext-target" data-setup-field="doomStep">保護費抬升價<input id="doom-step-input" type="number" min="100" step="100" value="500"></label>
        <span id="setup-lock-note" class="ext-lock-note" hidden>🎲 隨機模式鎖定數值：企業之星 10 季／3 星；首富競爭 24 季／8,000；邪惡企業 20 季／首期 1,000／抬升 500。</span>
        <label class="ext-check"><input id="debug-mode" type="checkbox"> 🧪 開啟測試（單機沙盒）</label>
      </div>
      <div class="multi-entry">
        <div><strong>🌐 多人房間</strong><small>WebRTC 房間代碼大廳，支援 2–8 人</small></div>
        <div class="multi-buttons"><button type="button" id="create-room-btn" class="secondary">建立房間</button><button type="button" id="join-room-btn" class="quiet">輸入代碼加入</button></div>
      </div>
      <p id="room-brief" class="room-brief"></p>
    `;
    setupFieldVisibility(box, mode, true);
    box.querySelectorAll('[data-mode-id]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.modeId;
      const m = GAME_MODES[id];
      $('#mode-select').value = id;
      box.querySelectorAll('[data-mode-id]').forEach(b => b.classList.toggle('active', b.dataset.modeId === id));
      $('#mode-desc').textContent = m.desc;
      setupFieldVisibility(box, id, true);
      sound('click');
    }));
    $('#create-room-btn').onclick = () => openConnect('create');
    $('#join-room-btn').onclick = () => openConnect('join');
    if (window.PartyNet?.active && window.PartyNet.lobby) {
      $('#room-brief').textContent = `目前房間：${window.PartyNet.code} · ${window.PartyNet.lobby.players.length} 人`;
    }
  }

  function openConnect(kind, presetCode = '') {
    const el = $('#party-connect');
    if (!el) return;
    const roles = window.__partyData?.LOBBY_ROLES || [];
    const selfName = document.querySelector('[data-setup-name="0"]')?.value || '玩家 1';
    const joinCopy = presetCode ? '已從 QR Code 帶入房間代碼，輸入你的名稱後按「加入房間」。' : '向房主取得 6 碼房間代碼，加入後在大廳選擇企業。';
    el.innerHTML = `
      <div class="ext-modal-backdrop"></div>
      <div class="connect-card">
        <button class="ext-modal-close" data-connect-close type="button">×</button>
        <p class="ext-kicker">${kind === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}</p>
        <h2>${kind === 'create' ? '建立連線房間' : presetCode ? '加入房間' : '輸入房間代碼'}</h2>
        <p>${kind === 'create' ? '產生 6 碼房間代碼，邀請 2–8 位玩家加入同一個大廳。' : joinCopy}</p>
        <label>你的名稱<input id="connect-name" maxlength="16" value="${h(selfName)}"></label>
        ${kind === 'create' ? `<label>你的企業<select id="connect-role">${roles.map(r => `<option value="${r.id}">${r.icon} ${h(r.name)}</option>`).join('')}</select></label>` : `<label>房間代碼<input id="connect-code" maxlength="128" placeholder="輸入 Peer ID" value="${h(presetCode)}"></label>`}
        <p class="connect-status" id="connect-status"></p>
        <div class="connect-actions">
          <button class="secondary" data-connect-close type="button">取消</button>
          <button class="primary" id="connect-go" type="button">${kind === 'create' ? '建立房間 →' : '加入房間 →'}</button>
        </div>
      </div>
    `;
    el.hidden = false;
    el.dataset.kind = kind;
    el.querySelectorAll('[data-connect-close]').forEach(b => b.onclick = () => { el.hidden = true; });
    $('#connect-go').onclick = () => {
      const name = $('#connect-name').value.trim() || '玩家';
      try {
        if (kind === 'create') {
          window.PartyNet.createRoom({ name, roleId: $('#connect-role').value || 'random' });
        } else {
          const code = $('#connect-code').value.trim();
          if (!code) throw Error('請輸入房間代碼。');
          window.PartyNet.joinRoom(code, name);
        }
        el.hidden = true;
        if (window.PartyNet.lobby) showLobby(window.PartyNet.lobby);
      } catch (e) { $('#connect-status').textContent = e.message; sound('error'); }
    };
  }

  // -------------------------------------------------------------------------
  // 大廳
  // -------------------------------------------------------------------------
  function showLobby(lobby) {
    ensureRoot();
    const el = $('#party-lobby');
    if (!el) return;
    if (!lobby) { clearTurnLock(); el.hidden = true; return; }
    if (lobby.status === 'playing' && state()?.status === 'playing') { el.hidden = true; return; }
    clearTurnLock();
    const net = window.PartyNet;
    const isHost = net?.isHost;
    const modes = window.__partyData?.GAME_MODES || {};
    const roles = window.__partyData?.LOBBY_ROLES || [];
    const activeMode = lobby.mode || 'star';
    const meta = modes[activeMode] || modes.star || {};
    const allowed = activeMode === 'star' ? ['rounds', 'starGoal']
      : activeMode === 'tycoon' ? ['rounds', 'target']
        : activeMode === 'evil' ? ['rounds', 'doomEvery', 'doomPrice', 'doomStep']
          : [];
    const field = (key, id, label, value, extra = '') => {
      const visible = allowed.includes(key);
      return `<label data-lobby-field="${key}" class="${visible ? '' : 'hidden'}">${label}<input id="${id}" type="number" ${extra} value="${value}" ${isHost && visible ? '' : 'disabled'}></label>`;
    };
    const invite = roomInviteLink(location.href, lobby.code);
    const qr = qrSvg(invite);
    const qrBlock = qr
      ? `<div class="lobby-qr"><div class="lobby-qr-code" id="lobby-qr" role="img" aria-label="加入房間的 QR Code">${qr}</div><small>其他人用手機相機掃描，會打開遊戲並自動帶入房間代碼。</small></div>`
      : lobby.code && !invite ? '<p class="lobby-qr-note">用線上網址開啟遊戲才會顯示 QR Code（本機網址別的裝置打不開）。</p>' : '';
    el.innerHTML = `
      <div class="ext-modal-backdrop"></div>
      <div class="lobby-card">
        <div class="lobby-top">
          <div><p class="ext-kicker">MULTIPLAYER LOBBY · WebRTC</p><h2>派對大廳</h2><p class="lobby-code-line">房間代碼 <strong id="lobby-code">${h(lobby.code)}</strong><button class="quiet" id="copy-code" type="button">複製</button></p>${qrBlock}</div>
          <button class="ext-modal-close" id="lobby-leave" type="button" title="離開">×</button>
        </div>
        <div class="lobby-grid">
          <div class="lobby-players">
            <div class="lobby-section-head"><span>玩家 ${lobby.players.length}/8</span><small>${net?.connectedPeers?.size || 1} 條連線</small></div>
            ${lobby.players.map((p, i) => {
              const isMe = p.peerId === net?.peerId;
              const role = roles.find(r => r.id === p.roleId) || roles[0];
              return `<div class="lobby-player ${p.host ? 'host' : ''} ${isMe ? 'me' : ''}">
                <span class="lobby-avatar">${role?.icon || '🎲'}</span>
                <div class="lobby-player-main"><strong>${h(p.name)}${p.host ? ' 👑' : ''}${isMe ? '（你）' : ''}</strong><small>${h(role?.name || '未定新創集團')}${p.connected === false ? ' · 連線中…' : ' · 已連線'}</small></div>
                ${(isMe || isHost) ? `<select data-lobby-role="${i}" class="lobby-role-select" ${isMe || isHost ? '' : 'disabled'}>${roles.map(r => `<option value="${r.id}" ${r.id === p.roleId ? 'selected' : ''}>${r.icon} ${h(r.name)}</option>`).join('')}</select>` : `<span class="lobby-role">${h(role?.name || '')}</span>`}
              </div>`;
            }).join('')}
          </div>
          <div class="lobby-settings">
            <div class="lobby-section-head"><span>對局設定</span><small>${isHost ? '房主可調整' : '由房主設定'}</small></div>
            <label>模式
              <select id="lobby-mode" ${isHost ? '' : 'disabled'}>${['star', 'tycoon', 'evil', 'random'].map(id => `<option value="${id}" ${lobby.mode === id ? 'selected' : ''}>${modes[id]?.icon || ''} ${h(modes[id]?.name || id)}</option>`).join('')}</select>
            </label>
            <div class="lobby-mode-desc" id="lobby-mode-desc">${h(meta.desc || '')}</div>
            <div class="lobby-row">
              ${field('rounds', 'lobby-rounds', '最多季數', lobby.rounds || meta.defaultRounds || 10, 'min="3" max="30"')}
              ${field('starGoal', 'lobby-star-goal', '勝利星數', lobby.starGoal || meta.starGoal || 3, 'min="1" max="10"')}
              ${field('target', 'lobby-target', '總資產目標', lobby.target || meta.defaultTarget || 8000, 'min="2000" step="500"')}
              ${field('doomEvery', 'lobby-doom-every', '保護費間隔（季）', lobby.doomEvery || 5, 'min="1" max="30"')}
              ${field('doomPrice', 'lobby-doom-price', '初始保護費', lobby.doomPrice || 1000, 'min="100" step="100"')}
              ${field('doomStep', 'lobby-doom-step', '保護費抬升價', lobby.doomStep ?? 500, 'min="100" step="100"')}
            </div>
            <p class="lobby-lock-note" ${activeMode === 'random' ? '' : 'hidden'}>🎲 隨機模式鎖定數值：企業之星 10 季／3 星；首富競爭 24 季／8,000；邪惡企業 20 季／首期 1,000／抬升 500。</p>
            <label class="ext-check"><input id="lobby-debug" type="checkbox" ${lobby.debug ? 'checked' : ''} ${isHost ? '' : 'disabled'}> 🧪 開啟測試</label>
            <div class="lobby-hint">Tips：每人只能操作自己的回合；所有狀態（道具、星數、護盾、通膨）都會同步。</div>
          </div>
        </div>
        <div class="lobby-footer">
          <span id="lobby-status">${isHost ? (lobby.players.length < 2 ? '等待至少 1 位玩家加入…' : '全員到齊，可以開始！') : '等待房主開始對局…'}</span>
          ${isHost ? `<button class="primary" id="lobby-start" type="button" ${lobby.players.length < 2 ? 'disabled' : ''}>開始對局 →</button>` : `<span class="waiting-dot">等待房主</span>`}
        </div>
      </div>
    `;
    el.hidden = false;
    $('#copy-code').onclick = async () => {
      try { await navigator.clipboard.writeText(lobby.code); $('#copy-code').textContent = '已複製'; setTimeout(() => { const b = $('#copy-code'); if (b) b.textContent = '複製'; }, 1500); } catch { }
    };
    $('#lobby-leave').onclick = () => { window.PartyNet.leave(); el.hidden = true; renderSetupExtras(); };
    $('#lobby-mode').onchange = e => {
      const id = e.target.value;
      window.PartyNet.setMode(id);
      const m = modes[id];
      if (!m) return;
      $('#lobby-mode-desc').textContent = m.desc;
      // 切換模式時同步該模式的固定預設值（隨機模式由引擎鎖定）。
      window.PartyNet.setRounds(m.defaultRounds || 10);
      if (id === 'star') window.PartyNet.setStarGoal(m.starGoal || 3);
      if (id === 'tycoon') window.PartyNet.setTarget(m.defaultTarget || 8000);
      if (id === 'evil') { window.PartyNet.setDoomEvery(5); window.PartyNet.setDoomPrice(1000); window.PartyNet.setDoomStep(500); }
    };
    const bind = (id, fn) => { const node = $(id); if (node) node.onchange = e => fn(e.target.value); };
    bind('#lobby-rounds', v => window.PartyNet.setRounds(v));
    bind('#lobby-star-goal', v => window.PartyNet.setStarGoal(v));
    bind('#lobby-target', v => window.PartyNet.setTarget(v));
    bind('#lobby-doom-every', v => window.PartyNet.setDoomEvery(v));
    bind('#lobby-doom-price', v => window.PartyNet.setDoomPrice(v));
    bind('#lobby-doom-step', v => window.PartyNet.setDoomStep(v));
    $('#lobby-debug').onchange = e => window.PartyNet.setDebug(e.target.checked);
    $$('[data-lobby-role]').forEach(sel => sel.onchange = e => {
      const idx = Number(sel.dataset.lobbyRole);
      const p = lobby.players[idx];
      if (!p) return;
      if (isHost && p.peerId !== window.PartyNet.peerId) { p.roleId = e.target.value; window.PartyNet.broadcastLobby(); }
      else window.PartyNet.selectRole(e.target.value);
    });
    const start = $('#lobby-start');
    if (start) start.onclick = () => {
      try { window.PartyNet.startGame(); } catch (e) { $('#lobby-status').textContent = e.message; sound('error'); }
    };
  }

  function hideLobby() { const el = $('#party-lobby'); if (el) el.hidden = true; }

  // -------------------------------------------------------------------------
  // 開場 / 事件動畫
  // -------------------------------------------------------------------------
  function clearOpening() { openingTimer.forEach(t => clearTimeout(t)); openingTimer = []; }
  function onGameStart(game, { fromLobby = false } = {}) {
    hideLobby();
    hideSettlement();
    hideEnding();
    clearTimeout(finishTimer);
    finishTimer = null;
    clearTimeout(endingTimer);
    endingTimer = null;
    wheelTimers.forEach(t => clearTimeout(t));
    wheelTimers = [];
    wheelResolving = false;
    wheelOpen = false;
    clearTimeout(decisionTimer);
    decisionTimer = null;
    decisionGateKey = '';
    decisionGateUntil = 0;
    eventPromptKey = '';
    replaceDropConfirm = false;
    settlementLockUntil = 0;
    lastFinishKey = '';
    lastEventKey = '';
    lastCornerSubsidyKey = '';
    lastInvestmentSettlementKey = '';
    investmentSoundTimers.forEach(t => clearTimeout(t));
    investmentSoundTimers = [];
    lastWheelKey = '';
    lastIndulgenceKey = '';
    lastVectorKey = '';
    lastVectorPendingKey = '';
    vectorLockUntil = 0;
    clearTimeout(vectorLockTimer);
    vectorLockTimer = null;
    document.body.classList.remove('vector-locking');
    lastVictoryKey = '';
    clearTimeout(ghostStrikeTimer);
    ghostStrikeTimer = null;
    clearTimeout(victoryTimer);
    victoryTimer = null;
    doomTimers.forEach(t => clearTimeout(t));
    doomTimers = [];
    lastBankaiKey = '';
    lastIceKey = '';
    lastBankruptKey = '';
    lastTotemKey = '';
    lastFinalRound = null;
    closeExtModal();
    document.body.classList.remove('witch-negative', 'doom-resolving');
    const witch = $('#witch-overlay'); if (witch) witch.hidden = true;
    ['#ice-overlay', '#bankai-overlay', '#totem-overlay', '#indulgence-overlay', '#ghost-strike-overlay', '#wheel-overlay', '#doom-sequence', '#victory-pending-banner'].forEach(sel => {
      const node = $(sel);
      if (node) { node.hidden = true; node.className = node.className.replace(/\s*is-active/g, ''); }
    });
    const ghostFx = $('#ghost-strike-overlay');
    if (ghostFx) ghostFx.className = 'fx-layer ghost-strike-overlay';
    if (!game || game.ext?.debug) return;
    const meta = window.__partyData?.GAME_MODES?.[game.ext?.mode] || { cup: '派對盃', win: '' };
    const modeId = game.ext?.mode || 'star';
    const targetStars = Number(game.ext?.targetStars ?? game.starGoal ?? 3) || 3;
    const targetAssets = Number(game.ext?.targetAssets ?? game.ext?.target ?? 0);
    const doomEvery = Number(game.ext?.doomEvery ?? 5) || 5;
    const winText = modeId === 'star'
      ? `先拿到 ${targetStars} 顆星；或季末星數最高。`
      : modeId === 'tycoon'
        ? `總資產率先達到 ${money(targetAssets)}；季末比較總資產。`
        : modeId === 'evil'
          ? `撐過每 ${doomEvery} 季的毀滅日，成為唯一倖存者。`
          : meta.win;
    const el = $('#opening-overlay');
    if (!el) return;
    clearOpening();
    const players = game.players.map(p => p.name).join(' · ');
    el.hidden = false;
    el.innerHTML = `<div class="opening-scene">
      <div class="opening-cup">${meta.icon || '🏆'}<span>${h(meta.cup || '派對盃')}</span></div>
      <div class="opening-win"><small>勝利條件</small><strong>${h(winText || '')}</strong><em>${h(players)}</em></div>
      <div class="opening-count" hidden><span class="pointer">👉</span><strong>3</strong></div>
      <div class="opening-go" hidden><span>💥</span><strong>開賺吧！</strong></div>
    </div>`;
    sound('slide');
    openingTimer.push(setTimeout(() => sound('star'), 300));
    openingTimer.push(setTimeout(() => {
      const count = el.querySelector('.opening-count'); if (count) count.hidden = false;
      sound('dice');
    }, 1400));
    [3, 2, 1].forEach((n, i) => openingTimer.push(setTimeout(() => {
      const strong = el.querySelector('.opening-count strong'); if (strong) strong.textContent = String(n);
      sound('click');
    }, 1500 + i * 650)));
    openingTimer.push(setTimeout(() => {
      el.querySelector('.opening-count')?.setAttribute('hidden', '');
      const go = el.querySelector('.opening-go'); if (go) go.hidden = false;
      sound('explosion');
    }, 3600));
    openingTimer.push(setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 4900));
  }

  function flashInflation(stage) {
    const el = $('#event-flash');
    if (!el) return;
    el.className = 'event-flash inflation-flash';
    el.hidden = false;
    el.innerHTML = `<div class="flash-band"></div><div class="flash-content"><p>WARNING · 極端通膨</p><h2>通膨來襲！</h2><strong>資產變動 ×${stage}</strong><small>所有賺與扣的錢全面放大</small></div>`;
    sound('inflation'); sound('alarm');
    setTimeout(() => { el.hidden = true; el.className = 'event-flash'; }, 2600);
  }

  function doomSequenceItems(event) {
    if (Array.isArray(event?.sequence) && event.sequence.length) return event.sequence;
    // 舊存檔或舊事件沒有 sequence 時，至少依付款／抵抗／處決名單補回播放順序。
    const players = state()?.players || [];
    const nameOf = id => players.find(p => p.id === id)?.name || '玩家';
    const items = [];
    for (const id of event?.paidIds || []) items.push({ playerId: id, name: nameOf(id), outcome: 'paid', amount: event.fee });
    for (const id of event?.resistedIds || []) items.push({ playerId: id, name: nameOf(id), outcome: 'resisted', amount: 0 });
    for (const id of event?.executedIds || []) items.push({ playerId: id, name: nameOf(id), outcome: 'executed', amount: event.fee });
    return items;
  }

  function doomToken(id) {
    const board = $('#board');
    if (!board) return null;
    return board.querySelector(`.token[data-player-id="${String(id).replace(/"/g, '\\"')}"]`);
  }

  function prepareDoomTokens(seq) {
    for (const item of seq) {
      if (item.outcome !== 'executed') continue;
      const token = doomToken(item.playerId);
      if (!token) continue;
      const player = state()?.players?.find(x => x.id === item.playerId);
      // 先暫時顯示原本的企業棋子，等雷射命中後才轉為藍色罷工幽靈。
      token.textContent = String(player?.name || item.name || '?').slice(0, 1);
      token.style.background = colors[player?.color] || '#5f8ec4';
      token.classList.remove('ghost-player');
    }
  }

  function revealDoomGhost(id) {
    const token = doomToken(id);
    if (!token) return;
    const player = state()?.players?.find(x => x.id === id);
    token.textContent = '👻';
    token.style.background = '#5f8ec4';
    token.classList.add('ghost-player');
    if (player) token.title = `${player.name}（罷工團幽靈）`;
  }

  function fireDoomLaser(id) {
    const board = $('#board');
    if (!board) return false;
    const token = doomToken(id);
    if (!token) return false;
    const rect = board.getBoundingClientRect();
    if (!rect.width) return false;
    const tr = token.getBoundingClientRect();
    const x = tr.left - rect.left + tr.width / 2;
    const y = tr.top - rect.top + tr.height / 2;
    // 雷射必須從邪惡企業圖示發射；找不到圖示時才退回看板上方中央。
    const icon = document.querySelector('.evil-tower .tower-building') || document.querySelector('.evil-tower');
    let ox = rect.width * .5, oy = 0;
    if (icon) {
      const ir = icon.getBoundingClientRect();
      if (ir.width && ir.height) {
        ox = ir.left - rect.left + ir.width / 2;
        oy = ir.top - rect.top + ir.height / 2;
      }
    }
    let layer = board.querySelector('.doom-laser-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'doom-laser-layer';
      board.appendChild(layer);
    }
    layer.innerHTML = `<svg viewBox="0 0 ${rect.width} ${rect.height}" preserveAspectRatio="none" aria-hidden="true"><line class="doom-beam-line" x1="${ox}" y1="${oy}" x2="${x}" y2="${y}"/><circle class="doom-impact" cx="${x}" cy="${y}" r="4"/></svg>`;
    token.classList.add('doom-hit');
    const revealTimer = setTimeout(() => revealDoomGhost(id), 300);
    const hitTimer = setTimeout(() => token.classList.remove('doom-hit'), 620);
    const layerTimer = setTimeout(() => layer.remove(), 500);
    doomTimers.push(revealTimer, hitTimer, layerTimer);
    return true;
  }

  function flashDoom(event) {
    const el = $('#doom-sequence');
    const title = el?.querySelector('.doom-sequence-title');
    const sub = el?.querySelector('.doom-sequence-sub');
    if (!el || !title) return 0;
    doomTimers.forEach(t => clearTimeout(t));
    doomTimers = [];
    el.hidden = false;
    el.className = 'doom-sequence is-active';
    document.body.classList.add('doom-resolving');
    const seq = doomSequenceItems(event);
    prepareDoomTokens(seq);
    const step = 1300; // 標題 1 秒 + 雷射／結果 0.3 秒
    let offset = 0;
    sound('doom');
    if (!seq.length) {
      title.textContent = '毀滅日結算';
      sub.textContent = '全員驚險生還';
      offset = 1200;
    } else {
      seq.forEach(item => {
        const at = offset;
        doomTimers.push(setTimeout(() => {
          title.textContent = `正在向${item.name}收取保護費`;
          sub.textContent = item.outcome === 'paid'
            ? `支付保護費 ${money(event.fee)}...`
            : item.outcome === 'resisted'
              ? '不死圖騰正在抵抗雷射...'
              : '無法支付，準備處決...';
        }, at));
        doomTimers.push(setTimeout(() => {
          if (item.outcome === 'executed') {
            sub.textContent = `${item.name} 被雷射消滅，化為罷工幽靈`;
            if (fireDoomLaser(item.playerId)) {
              sound('laser');
              const boom = setTimeout(() => sound('explosion'), 120);
              doomTimers.push(boom);
            }
          } else if (item.outcome === 'paid') {
            sub.textContent = `${item.name} 已支付 ${money(event.fee)} 保護費`;
            sound('cashLoss');
          } else {
            sub.textContent = `${item.name} 以不死圖騰擋下處決`;
            sound('totem');
          }
        }, at + 1000));
        offset += step;
      });
      doomTimers.push(setTimeout(() => {
        title.textContent = '毀滅日結算完成';
        sub.textContent = (event.executedIds || []).length
          ? `${(event.executed || []).join('、')} 已轉為罷工幽靈`
          : '全員驚險生還';
      }, offset));
      offset += 500;
    }
    const total = Math.max(offset, 1200);
    settlementLockUntil = Date.now() + total + 250;
    doomTimers.push(setTimeout(() => {
      for (const item of seq) {
        if (item.outcome === 'executed') revealDoomGhost(item.playerId);
      }
      el.hidden = true;
      el.className = 'doom-sequence';
      document.body.classList.remove('doom-resolving');
      doomTimers = [];
    }, total));
    return total;
  }

  function flashDomainHit(event) {
    const board = $('#board');
    const token = board?.querySelector(`.token[data-player-id="${String(event.playerId || '').replace(/"/g, '\\"')}"]`);
    if (token) {
      token.classList.add('domain-hit');
      const label = document.createElement('span');
      label.className = 'domain-hit-label';
      label.textContent = `🌐 -${money(event.amount || 100)}`;
      token.closest('.tile')?.appendChild(label);
      setTimeout(() => { token.classList.remove('domain-hit'); label.remove(); }, 1500);
    }
    sound('domain');
  }

  function flashWitch() {
    const overlay = $('#witch-overlay');
    if (overlay) {
      overlay.hidden = false;
      setTimeout(() => { overlay.hidden = true; }, 2600);
    }
    document.body.classList.add('witch-negative');
    sound('witch');
    setTimeout(() => document.body.classList.remove('witch-negative'), 2400);
  }

  function flashGhostInterference(event) {
    const el = $('#ghost-strike-overlay');
    if (!el) return;
    clearTimeout(ghostStrikeTimer);
    el.hidden = true;
    // 強制重排以重新播放「放大 → 左飄 → 右出」的完整動畫。
    void el.offsetWidth;
    el.className = `fx-layer ghost-strike-overlay is-active${event?.enraged ? ' enraged' : ''}`;
    el.hidden = false;
    const strong = el.querySelector('.ghost-strike-copy strong');
    const small = el.querySelector('.ghost-strike-copy small');
    if (strong) strong.textContent = event?.enraged ? '憤怒幽靈干擾' : '幽靈干擾';
    if (small) small.textContent = event?.enraged ? '驟死賽的憤怒幽靈發動罷工效果' : '罷工幽靈正在干擾企業經營';
    sound('ghostLaugh');
    ghostStrikeTimer = setTimeout(() => {
      el.hidden = true;
      el.className = 'fx-layer ghost-strike-overlay';
    }, 2400);
  }

  function flashCornerSubsidy(event) {
    const marker = document.createElement('div');
    marker.className = 'corner-subsidy-pop';
    marker.textContent = `領取補助金${Number(event?.amount) || 1000}`;
    marker.setAttribute('role', 'status');
    const anchor = [...document.querySelectorAll('#board .token[data-player-id], [data-player-card]')]
      .find(node => node.dataset.playerId === event?.playerId || node.dataset.playerCard === event?.playerId);
    const rect = anchor?.getBoundingClientRect();
    const boardRect = $('#board')?.getBoundingClientRect();
    marker.style.left = `${rect ? rect.left + rect.width / 2 : boardRect ? boardRect.left + boardRect.width / 2 : window.innerWidth / 2}px`;
    marker.style.top = `${rect ? rect.top : boardRect ? boardRect.top + boardRect.height / 2 : window.innerHeight * .6}px`;
    document.body.appendChild(marker);
    marker.addEventListener('animationend', () => marker.remove(), { once: true });
    setTimeout(() => marker.remove(), 1900);
  }

  function playSkillCue(event) {
    const marker = document.createElement('div');
    marker.className = 'skill-cue';
    marker.textContent = event?.skillName || '技能發動';
    marker.setAttribute('role', 'status');
    marker.setAttribute('aria-live', 'polite');
    const playerId = String(event?.playerId || '');
    const anchors = [...document.querySelectorAll('#board .token[data-player-id], [data-player-card]')];
    const anchor = anchors.find(node => node.dataset.playerId === playerId || node.dataset.playerCard === playerId);
    const rect = anchor?.getBoundingClientRect();
    const boardRect = $('#board')?.getBoundingClientRect();
    marker.style.left = `${rect?.width ? rect.left + rect.width / 2 : boardRect ? boardRect.left + boardRect.width / 2 : window.innerWidth / 2}px`;
    marker.style.top = `${rect?.height ? rect.top : boardRect ? boardRect.top + boardRect.height / 2 : window.innerHeight * 0.65}px`;
    document.body.appendChild(marker);
    sound('coin');
    const remove = () => marker.remove();
    marker.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 1600);
  }

  function flashVictoryPending(event) {
    const el = $('#victory-pending-banner');
    if (!el) return;
    const text = event?.text || `${(event?.names || []).join('、')}已達標，本季將進行結算`;
    el.hidden = false;
    el.className = 'victory-pending-banner is-active';
    el.innerHTML = `<span>🏁</span><div><strong>${h(text)}</strong><small>本季結束後立即進行最終結算</small></div>`;
    sound('star');
    clearTimeout(victoryTimer);
    victoryTimer = setTimeout(() => {
      el.hidden = true;
      el.className = 'victory-pending-banner';
    }, 3400);
  }

  function hideEnding() {
    const el = $('#ending-overlay');
    if (el) { el.hidden = true; el.className = 'ending-overlay'; el.innerHTML = ''; }
  }

  function playEnding(p) {
    if (!p || p.ext?.debug) return false;
    if (p.resultReason === 'survivor' || p.resultReason === 'bankrupt') return false;
    const mode = p.ext?.mode;
    if (!['star', 'tycoon'].includes(mode)) return false;
    const el = $('#ending-overlay');
    if (!el) return false;
    const winners = p.players.filter(x => p.winnerIds?.includes(x.id));
    const names = winners.map(x => x.name).join('、') || '無人';
    el.className = `ending-overlay ${mode}`;
    el.hidden = false;
    if (mode === 'star') {
      el.innerHTML = `<div class="ending-scene star-scene">
        <div class="ending-stars">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}">★</i>`).join('')}</div>
        <div class="ending-orbit"><span>🌟</span><span>⭐</span><span>✦</span></div>
        <p class="ending-kicker">ENTERPRISE STAR · 星海加冕</p>
        <h2>${h(names)}成為企業之星！</h2>
        <strong>星海加冕 · 本季結算完成</strong>
        <small>${winners.map(x => `${x.stars} 顆星 · ${money(x.cash)} 總資產`).join('　') || '星數最高者獲勝'}</small>
      </div>`;
      sound('endingStar');
    } else {
      el.innerHTML = `<div class="ending-scene tycoon-scene">
        <div class="ending-coins">${Array.from({ length: 22 }, (_, i) => `<i style="--i:${i}">🪙</i>`).join('')}</div>
        <div class="ending-chart">📈</div>
        <p class="ending-kicker">TYCOON · 資產封頂</p>
        <h2>${h(names)}成為世界首富！</h2>
        <strong>資產封頂 · 本季結算完成</strong>
        <small>${winners.map(x => `${money(x.cash)} 總資產`).join('　') || '總資產最高者獲勝'}</small>
      </div>`;
      sound('endingTycoon');
    }
    clearTimeout(endingTimer);
    endingTimer = setTimeout(hideEnding, 3000);
    return true;
  }

  function flashFinalSeason(round, maxRounds) {
    const el = $('#event-flash');
    if (!el) return;
    el.className = 'event-flash final-flash';
    el.hidden = false;
    el.innerHTML = `<div class="final-scene"><span>⏰</span><div><p>FINAL SEASON</p><h2>最終季 · 第 ${round} / ${maxRounds} 季</h2><strong>季數上限後依模式規則排名</strong><small>把握最後一次擲骰與買星機會</small></div><span>🏁</span></div>`;
    sound('alarm');
    setTimeout(() => { el.hidden = true; el.className = 'event-flash'; }, 3200);
  }

  function flashSuddenDeath(event) {
    const el = $('#event-flash');
    if (!el) return;
    el.className = 'event-flash sudden-flash';
    el.hidden = false;
    el.innerHTML = `<div class="sudden-scene"><span>⚡</span><div><p>SUDDEN DEATH</p><h2>驟死賽啟動</h2><strong>${h(event.winners?.join('、') || '')} 平手</strong><small>憤怒幽靈：紅色圖標 · 移動 1.5 倍 · 扣錢 2 倍</small></div><span>👻</span></div>`;
    sound('lightning'); setTimeout(() => sound('ghost'), 300);
    setTimeout(() => { el.hidden = true; el.className = 'event-flash'; }, 3000);
  }

  // -------------------------------------------------------------------------
  // 專屬特效
  // -------------------------------------------------------------------------
  function resetFx(sel, extra = '') {
    const el = $(sel);
    if (!el) return null;
    el.hidden = false;
    el.className = `${extra || el.className.replace(/\s*is-active/g, '')} is-active`;
    return el;
  }
  function hideFx(sel, baseClass) {
    const el = $(sel);
    if (!el) return;
    el.hidden = true;
    el.className = baseClass;
  }

  function flashFrozen(event) {
    const el = resetFx('#ice-overlay', 'fx-layer ice-overlay');
    if (!el) return;
    sound('frozen');
    const names = (event?.frozen || []).join('、');
    if (names) app()?.notify(`❄️ ${names} 被寒冰蘑菇凍結！`);
    setTimeout(() => hideFx('#ice-overlay', 'fx-layer ice-overlay'), 520);
  }

  function flashBankai() {
    const el = resetFx('#bankai-overlay', 'fx-layer bankai-overlay');
    if (!el) return;
    sound('bankai');
    setTimeout(() => sound('lightning'), 120);
    setTimeout(() => hideFx('#bankai-overlay', 'fx-layer bankai-overlay'), 1250);
  }

  function flashTotem() {
    const el = resetFx('#totem-overlay', 'fx-layer totem-overlay');
    if (!el) return;
    sound('totem');
    setTimeout(() => hideFx('#totem-overlay', 'fx-layer totem-overlay'), 1500);
  }

  function flashIndulgence() {
    const el = resetFx('#indulgence-overlay', 'fx-layer indulgence-overlay');
    if (!el) return;
    sound('paper');
    setTimeout(() => hideFx('#indulgence-overlay', 'fx-layer indulgence-overlay'), 1400);
  }

  function flashBankrupt(event) {
    const el = $('#event-flash');
    if (!el) return;
    const names = (event?.names || []).join('、') || '玩家';
    el.className = 'event-flash bankrupt-flash';
    el.hidden = false;
    el.innerHTML = `<div class="bankrupt-scene"><span>👻</span><div><p>MARKET ELIMINATION</p><h2>負債淘汰</h2><strong>${h(names)} 化為罷工幽靈</strong><small>總資產跌破 −1,000，籌碼與道具全數清算。</small></div></div>`;
    sound('ghost');
    setTimeout(() => { el.hidden = true; el.className = 'event-flash'; }, 2600);
  }

  function tilePoint(index) {
    const board = $('#board');
    const tile = board?.querySelector(`[data-tile-index="${index}"]`);
    if (!board || !tile) return null;
    const rect = board.getBoundingClientRect();
    const tr = tile.getBoundingClientRect();
    return { x: tr.left - rect.left + tr.width / 2, y: tr.top - rect.top + tr.height / 2 };
  }

  const VECTOR_LOCK_MS = 520;

  function releaseVectorLock(tokens = []) {
    document.body.classList.remove('vector-locking');
    tokens.forEach(token => {
      token.classList.remove('vector-locked');
      token.removeAttribute('data-vector-lock');
    });
  }

  // 先讓受害者棋子停在原格並顯示鎖定準心，0.5 秒後才真正傳送與觸發格子效果。
  function beginVectorLock(pending) {
    if (!pending) return;
    const ids = new Set((pending.candidates || []).map(c => c.playerId));
    const tokens = $$('#board .token').filter(token => ids.has(token.dataset.playerId));
    const names = (pending.candidates || []).map(c => c.name).filter(Boolean).join('、') || '目標';
    const expectedAt = String(pending.at);
    releaseVectorLock($$('#board .token.vector-locked'));
    clearTimeout(vectorLockTimer);
    vectorLockUntil = Date.now() + VECTOR_LOCK_MS;
    document.body.classList.add('vector-locking');
    tokens.forEach(token => {
      token.classList.add('vector-locked');
      token.dataset.vectorLock = '1';
    });
    app()?.notify?.(`🎯 矢量操作鎖定 ${names}！`);
    vectorLockTimer = setTimeout(() => {
      vectorLockTimer = null;
      const current = state();
      const active = current?.ext?.vectorPending;
      if (!active || String(active.at) !== expectedAt) {
        vectorLockUntil = 0;
        releaseVectorLock(tokens);
        return;
      }
      const before = app()?.cashSnapshot?.();
      let event = null;
      try {
        event = window.__partyEngine?.extResolveVectorPending?.(current) || null;
      } catch (err) {
        console.error(err);
        app()?.notify?.('矢量操作傳送結算失敗。');
      }
      vectorLockUntil = 0;
      releaseVectorLock(tokens);
      app()?.save?.();
      app()?.render?.();
      if (event && before) app()?.animateCashChanges?.(before);
    }, VECTOR_LOCK_MS);
  }

  function flashVector(event) {
    const board = $('#board');
    if (!board || !event) return;
    const hits = Array.isArray(event.hits) && event.hits.length
      ? event.hits
      : [{ playerId: event.playerId, from: event.from, to: event.to }];
    const tiles = [];
    for (const hit of hits) {
      if (Number.isInteger(hit.from)) tiles.push(hit.from);
      if (Number.isInteger(hit.to)) tiles.push(hit.to);
    }
    const points = [...new Set(tiles)].map(tilePoint).filter(Boolean);
    if (!points.length) return;
    board.querySelectorAll('.vector-smoke').forEach(n => n.remove());
    points.forEach((pt, i) => {
      const puff = document.createElement('span');
      puff.className = 'vector-smoke';
      puff.style.left = `${pt.x}px`;
      puff.style.top = `${pt.y}px`;
      puff.style.animationDelay = `${i * .08}s`;
      puff.innerHTML = '<i></i><i></i><i></i>';
      board.appendChild(puff);
      setTimeout(() => puff.remove(), 1000);
    });
    sound('swing');
    const names = hits.map(hit => hit.name || state()?.players?.find(x => x.id === hit.playerId)?.name || '玩家');
    const destination = event.to ?? hits[0]?.to;
    app()?.notify(hits.length > 1
      ? `⬆️ 矢量操作：${names.join('、')} 被傳送到第 ${destination} 格！`
      : `⬆️ ${names[0] || '玩家'} 被矢量操作傳送到第 ${destination} 格！`);
  }

  function eventSound(event) {
    const kind = event?.kind;
    const amount = Number(event?.amount) || 0;
    if (kind === 'selfEnergy') return 'magic';
    if (kind === 'allEnergy') return 'ghost';
    return amount >= 0 ? 'coin' : 'cashLoss';
  }

  function eventPromptKeyOf(p) {
    const ev = p?.ext?.eventPrompt;
    return ev ? `${ev.playerId}:${ev.at}:${ev.eventId}` : '';
  }

  function openEventPrompt(p) {
    const ev = p?.ext?.eventPrompt;
    if (!ev) return;
    if (!isLocalOwner(p, ev.playerId)) return;
    const key = eventPromptKeyOf(p);
    if (modal === 'event' && eventPromptKey === key) return;
    eventPromptKey = key;
    modal = 'event';
    const amount = Number(ev.amount) || 0;
    const energyEvent = ev.kind === 'allEnergy' || ev.kind === 'selfEnergy';
    const amountText = amount ? `${amount > 0 ? '+' : ''}${energyEvent ? `${amount} 技能點` : `${money(amount)} 總資產`}` : '';
    updateExtModal({
      kicker: `EVENT TILE · 第 ${p.round} 季`, icon: ev.icon || '❓', title: ev.name || '突發事件', type: 'event',
      text: ev.text || '市場上突然出現一則消息，影響所有企業。',
      body: `<div class="event-prompt-box">
        <span class="event-prompt-icon">${ev.icon || '❓'}</span>
        <div><small>觸發事件</small><strong>${h(ev.name || '突發事件')}</strong><p>${h(ev.text || '')}</p></div>
        ${amountText ? `<em class="${amount > 0 ? 'good' : 'bad'}">${h(amountText)}</em>` : ''}
      </div>`,
      actions: `<button class="primary" data-event-ok="1" type="button">確認事件</button>`
    });
    sound(eventSound(ev));
  }

  // -------------------------------------------------------------------------
  // 擴充 Modal
  // -------------------------------------------------------------------------
  function openExtModal({ kicker = '', icon = '✦', title = '', text = '', body = '', actions = '', type = 'info' }) {
    ensureRoot();
    const el = $('#ext-modal');
    if (!el) return;
    el.hidden = false;
    el.querySelector('.ext-kicker').textContent = kicker;
    el.querySelector('.ext-icon').textContent = icon;
    el.querySelector('.ext-title').textContent = title;
    el.querySelector('.ext-text').textContent = text;
    el.querySelector('.ext-body').innerHTML = body;
    el.querySelector('.ext-actions').innerHTML = actions;
    el.dataset.type = type;
    sound('slide');
    el.querySelector('.ext-modal-close').onclick = () => { if (['auction', 'decision', 'tax', 'invest', 'insider', 'star', 'replace', 'event'].includes(type)) { app()?.notify('請先完成目前事件。'); return; } closeExtModal(); };
  }
  function closeExtModal() { const el = $('#ext-modal'); if (el) el.hidden = true; modal = null; replaceDropConfirm = false; }
  function updateExtModal(data) { openExtModal(data); }

  function openStarOffer(p) {
    const offer = p?.ext?.starOffer;
    if (!offer) return;
    const player = p.players.find(x => x.id === offer.playerId);
    if (!player) return;
    const price = Number(offer.price) || 0;
    const goal = p.starGoal || 3;
    const check = window.__partyEngine?.extCanBuyStar?.(p);
    const canBuy = Boolean(check?.ok);
    modal = 'star';
    updateExtModal({
      kicker: `STAR OFFER · 第 ${p.round} 季`, icon: '⭐', title: '出發格 · 購買星星', type: 'star',
      text: offer.landed ? `${player.name} 停在出發格，可以購買 1 顆星。` : `${player.name} 經過出發格，可以購買 1 顆星。`,
      body: `<div class="star-offer-box">
        <div class="star-offer-glow">⭐</div>
        <div class="star-offer-info"><span>目前星價</span><strong>${money(price)}</strong><small>${player.name} 目前 ${player.stars} / ${goal} 顆星 · 總資產 ${money(player.cash)}</small></div>
        <p class="star-offer-note">每次有人買星，全場星價就會上漲。${canBuy ? '' : `（${check?.reason || (player.cash < price ? '總資產不足' : '目前無法購買')}）`}</p>
      </div>`,
      actions: `<button class="secondary" data-star-offer="skip" type="button">這次不買</button><button class="primary" data-star-offer="buy" type="button" ${canBuy ? '' : 'disabled'}>⭐ 買下星星 · ${money(price)}</button>`
    });
  }

  function openReplaceOffer(p) {
    const offer = p?.ext?.replaceOffer;
    if (!offer) return;
    const player = p.players.find(x => x.id === offer.playerId);
    if (!player) return;
    const { ITEMS = [], MYTHIC_BY_ID = {} } = window.__partyData || {};
    const offerKind = offer.itemKind === 'normal' ? 'normal' : 'mythic';
    const meta = offerKind === 'normal'
      ? (ITEMS.find(x => x.id === offer.itemId) || { name: offer.itemId, icon: '🎁', desc: '' })
      : (MYTHIC_BY_ID[offer.itemId] || { name: offer.itemId, icon: '❓', desc: '' });
    const sourceText = offer.source === 'debug'
      ? '透過測試工具加入新道具，但道具欄已滿（3/3）。'
      : `以 ${money(offer.price || 0)} 標下新道具，但道具欄已滿（3/3）。`;
    const slots = [
      ...(player.mythics || []).map((entry, index) => {
        const m = MYTHIC_BY_ID[entry.id] || { name: entry.id, icon: '🗿', desc: '' };
        return { kind: 'mythic', index, name: m.name, icon: m.icon, desc: m.desc };
      }),
      ...(player.items || []).map((id, index) => {
        const m = ITEMS.find(x => x.id === id) || { name: id, icon: '🎁', desc: '' };
        return { kind: 'normal', index, name: m.name, icon: m.icon, desc: m.desc };
      })
    ];
    modal = 'replace';
    const confirm = replaceDropConfirm;
    updateExtModal({
      kicker: offer.source === 'debug' ? `DEBUG · 第 ${p.round} 季` : `BLACK MARKET · 第 ${p.round} 季`, icon: '🛒', title: confirm ? '確認丟棄新道具？' : '背包已滿 · 替換或丟棄', type: 'replace',
      text: confirm ? '丟棄後無法復原，這件剛獲得的新道具會直接消失。' : `${player.name} ${sourceText}請選擇替換或丟棄新道具。`,
      body: confirm
        ? `<div class="replace-warning"><span>⚠️</span><div><strong>${h(meta.icon)} ${h(meta.name)}</strong><small>這件新道具將被永久丟棄，已支付的成本不會退還。</small></div></div>`
        : `<div class="replace-box">
            <div class="replace-new"><span class="replace-item-icon">${meta.icon}</span><div><small>剛獲得的新道具</small><strong>${h(meta.name)}</strong><p>${h(meta.desc || '')}</p></div></div>
            <div class="replace-grid">
              ${slots.map(s => `<button type="button" class="replace-slot ${s.kind}" data-replace-kind="${s.kind}" data-replace-index="${s.index}"><span>${s.icon}</span><div><strong>${h(s.name)}</strong><small>${s.kind === 'mythic' ? '神話道具' : '普通道具'} · 點擊替換</small></div></button>`).join('')}
            </div>
            <p class="replace-note">選擇一個現有道具替換，或丟棄剛獲得的新道具（需二次確認）。</p>
          </div>`,
      actions: confirm
        ? `<button class="secondary" data-replace-back type="button">返回</button><button class="danger" data-replace-drop-confirm type="button">確定丟棄新道具</button>`
        : `<button class="danger" data-replace-drop type="button">丟棄新道具</button>`
    });
  }

  function openSpecialModal(s) {
    const p = state();
    if (!p) return;
    const owner = specialOwnerId(p);
    if (owner && !isLocalOwner(p, owner)) return;
    modal = s.type;
    const nameOf = id => p.players.find(x => x.id === id)?.name || '';
    if (s.type === 'auction') {
      const a = p.ext.auction;
      const cur = s.current || window.__partyEngine?.extAuctionCurrent?.(p);
      const myTurn = isLocalOwner(p, cur?.id);
      updateExtModal({
        kicker: `BLACK MARKET · 第 ${p.round} 季`, icon: '🛒', title: '黑市拍賣', type: 'auction',
        text: '隱藏的神話道具正在拍賣。每次抬價 250，最後一位出價者得標。',
        body: `<div class="auction-box"><div class="auction-item">❓<span>隱藏神話道具</span></div><div class="auction-stats"><div><small>目前出價</small><strong>${money(a.highestBid || a.basePrice)}</strong></div><div><small>下次出價</small><strong>${money(a.currentPrice)}</strong></div><div><small>最高出價者</small><strong>${h(nameOf(a.highestBidder) || '尚無')}</strong></div><div><small>目前玩家持有</small><strong class="auction-cash ${Number(cur?.cash) < 0 ? 'negative' : ''}">${money(cur?.cash || 0)}</strong></div></div><p class="auction-turn">輪到 <b>${h(cur?.name || '')}</b> 決定${cur ? ` · 持有 ${money(cur.cash)} 總資產` : ''}</p></div>`,
        actions: `<button class="secondary" data-auction="pass" ${myTurn ? '' : 'disabled'}>放棄</button><button class="primary" data-auction="bid" ${myTurn ? '' : 'disabled'}>出價 ${money(a.currentPrice)} ↑</button>`
      });
    } else if (s.type === 'invest') {
      const offer = p.ext.investOffer;
      const player = p.players.find(x => x.id === offer.playerId);
      updateExtModal({
        kicker: 'INVESTMENT · 股票憑證', icon: '📈', title: '投資機會', type: 'invest',
        text: `${player?.name || ''} 可投入 50% 總資產，季末結算：大牛市 3 倍（10%）、平穩期 1.5 倍（40%）、龐氏騙局歸零（50%）。`,
        body: `<div class="invest-box"><span>投入金額</span><strong>${money(offer.cost)}</strong><small>目前總資產 ${money(player?.cash || 0)}</small><div class="odds"><i>3× · 10%</i><i>1.5× · 40%</i><i>0× · 50%</i></div></div>`,
        actions: `<button class="secondary" data-invest="no">跳過</button><button class="primary" data-invest="yes" ${offer.cost <= 0 ? 'disabled' : ''}>投入 ${money(offer.cost)}</button>`
      });
    } else if (s.type === 'tax') {
      const offer = p.ext.taxChoice;
      const player = p.players.find(x => x.id === offer.playerId);
      const amount = Math.floor(Math.max(0, player?.cash || 0) * 0.5);
      const ticket = player?.mythics?.find(x => x.id === 'indulgence');
      updateExtModal({
        kicker: 'TAX OFFICE · 查稅局', icon: '🏛️', title: '國稅局找上門', type: 'tax',
        text: `${player?.name || ''} 被查出帳目異常。選擇繳交 50% 總資產，或接受 2 回合羈押。`,
        body: `<div class="tax-box"><div><span>應繳稅額</span><strong>${money(amount)}</strong></div>${ticket ? `<p class="ticket-note">🎫 你持有贖罪券（${ticket.charges} 次），可全額抵銷本次稅金。</p>` : ''}</div>`,
        actions: `<button class="secondary" data-tax="detain">接受羈押 2 回合</button><button class="primary" data-tax="pay">繳稅 ${money(amount)}</button>`
      });
    } else if (s.type === 'insider') {
      const offer = p.ext.insiderOffer;
      const player = p.players.find(x => x.id === offer.playerId);
      updateExtModal({
        kicker: 'INSIDER TRADING · 內線交易', icon: '🌈', title: '命運輪盤', type: 'insider',
        text: `${player?.name || ''} 可以花 100 啟動命運輪盤。輪盤停止後需按確認才會套用結果，用過後此格會移位重生。`,
        body: `<div class="wheel-preview">${['🌟', '💀', '💸', '✂️', '🎒', '🕶️', '🤑', '👻', '⭐', '💱', '🥣', '🤡'].map(x => `<span>${x}</span>`).join('')}</div>`,
        actions: `<button class="secondary" data-insider="no">放棄</button><button class="primary" data-insider="yes" ${player?.cash < 100 ? 'disabled' : ''}>支付 100 啟動</button>`
      });
    }
  }

  function openFateDice() {
    const p = state();
    const player = p?.players?.[p.turnIndex];
    if (!p || !player || !isLocalOwner(p, player.id)) return;
    openExtModal({
      kicker: 'SPECIAL ITEM · 命運骰子',
      icon: '🎲',
      title: '選擇前進步數',
      text: '選擇 1–6 步，命運骰子使用後會消失。',
      type: 'fateDice',
      body: `<div class="fate-dice-grid" role="group" aria-label="選擇 1 到 6 步">${[1, 2, 3, 4, 5, 6].map(value => `<button type="button" data-fate-step="${value}" aria-label="前進 ${value} 步">${value}</button>`).join('')}</div>`
    });
  }

  function afterSpecialChange() {
    const p = state();
    if (!p) return;
    if (p.status !== 'playing') {
      if (modal && ['auction', 'invest', 'tax', 'insider', 'star', 'replace', 'event'].includes(modal)) closeExtModal();
      return;
    }
    // 棋子移動／骰子動畫期間絕不彈出互動視窗，避免提前暴雷。
    if (app()?.isAnimating?.()) return;
    // 內線交易輪盤播放期間，先讓輪盤完成演出。
    if (wheelOpen || p.ext?.wheelPending) return;
    // 事件格提示優先於所有決策與特殊格視窗。
    if (p.ext?.eventPrompt) {
      if (modal && ['auction', 'invest', 'tax', 'insider', 'star', 'replace', 'truth', 'tile', 'debug-items'].includes(modal)) closeExtModal();
      openEventPrompt(p);
      return;
    }
    if (modal === 'event') closeExtModal();
    if (p.pendingDecision && modal && ['truth', 'tile', 'debug-items'].includes(modal)) closeExtModal();
    const owner = specialOwnerId(p);
    if (hasSpecialOffer(p)) {
      if (modal && ['truth', 'tile', 'debug-items', 'event'].includes(modal)) closeExtModal();
      if (!isLocalOwner(p, owner)) {
        if (modal && ['auction', 'invest', 'tax', 'insider', 'star', 'replace'].includes(modal)) closeExtModal();
        return;
      }
      if (p.ext?.replaceOffer) { openReplaceOffer(p); return; }
      if (p.ext?.starOffer) { openStarOffer(p); return; }
      if (p.ext?.auction) {
        const cur = window.__partyEngine?.extAuctionCurrent?.(p) || null;
        openSpecialModal({ type: 'auction', current: cur });
        return;
      }
      if (p.ext?.investOffer) { openSpecialModal({ type: 'invest' }); return; }
      if (p.ext?.taxChoice) { openSpecialModal({ type: 'tax' }); return; }
      if (p.ext?.insiderOffer) { openSpecialModal({ type: 'insider' }); return; }
    }
    if (modal && ['auction', 'invest', 'tax', 'insider', 'star', 'replace', 'event'].includes(modal)) closeExtModal();
  }

  // app.js 的快速決策視窗會先詢問這裡，確保事件提示／特殊格／動畫全部結束後才彈出。
  function decisionBlocked(p) {
    if (!p) return false;
    if (app()?.isAnimating?.()) return true;
    if (p.ext?.vectorPending) return true;
    if (Date.now() < vectorLockUntil) return true;
    if (p.ext?.eventPrompt) return true;
    if (wheelOpen || p.ext?.wheelPending) return true;
    if (hasSpecialOffer(p)) return true;
    if (Date.now() < decisionGateUntil) return true;
    return false;
  }

  // -------------------------------------------------------------------------
  // 輪盤
  // -------------------------------------------------------------------------
  function showWheel(data) {
    const p = state();
    if (!p || !data) return;
    if (data.playerId && !isLocalOwner(p, data.playerId)) { lastWheelKey = String(data.at || data.index || ''); return; }
    const el = $('#wheel-overlay');
    if (!el) return;
    const effects = window.__partyData?.WHEEL_EFFECTS || [];
    const symbols = (effects.length ? effects.map(e => e.icon) : ['🌟', '💀', '💸', '✂️', '🎒', '🕶️', '🤑', '👻', '⭐', '💱', '🥣', '🤡']);
    const effect = data.effect || effects[data.index] || null;
    const index = Number.isInteger(data.index) ? data.index : Math.max(0, effects.findIndex(e => e.id === effect?.id));
    wheelTimers.forEach(t => clearTimeout(t));
    wheelTimers = [];
    wheelResolving = false;
    wheelOpen = true;
    el.hidden = false;
    el.innerHTML = `<div class="wheel-card"><p class="ext-kicker">DESTINY WHEEL</p>
      <div class="wheel-stage"><div class="wheel-ring">${symbols.map((s, i) => `<span style="--i:${i}">${s}</span>`).join('')}<div class="wheel-center">🌈</div></div><div class="wheel-pointer">▲</div></div>
      <h3>命運輪盤轉動中…</h3><div class="wheel-result" hidden></div></div>`;
    sound('wheel');
    const ring = el.querySelector('.wheel-ring');
    const rotation = 5 * 360 + ((180 - index * 30) % 360 + 360) % 360;
    requestAnimationFrame(() => {
      if (!ring || !el.isConnected) return;
      ring.style.transition = 'transform 2s cubic-bezier(.12,.7,.16,1)';
      ring.style.transform = `rotate(${rotation}deg)`;
    });
    wheelTimers.push(setTimeout(() => {
      const title = el.querySelector('.wheel-card h3');
      if (title) title.textContent = '命運已定，等待確認…';
      // 輪盤完全靜止 1 秒後只顯示確認提示；效果必須等玩家按下確認才套用。
      wheelTimers.push(setTimeout(() => readyWheel(el, data, effect), 1000));
    }, 2000));
  }

  function readyWheel(el, data, effect) {
    if (!el || el.hidden) return;
    wheelResolving = false;
    const resultNode = el.querySelector('.wheel-result');
    if (!resultNode) return;
    resultNode.hidden = false;
    resultNode.innerHTML = `<strong>${effect?.icon || '🌈'} ${h(effect?.name || '命運結果')}</strong><p>${h(effect?.desc || '按下確認後才會正式套用。')}</p><button class="primary" type="button" data-wheel-confirm>確認並套用</button>`;
    sound('click');
    const button = resultNode.querySelector('[data-wheel-confirm]');
    if (button) button.onclick = () => confirmWheel(el, data);
  }

  function confirmWheel(el, data) {
    if (wheelResolving) return;
    const p = state();
    if (!p || !el) return;
    wheelResolving = true;
    // 先關閉視窗，再正式套用效果與播放對應動畫，避免動畫疊在提示視窗上。
    el.hidden = true;
    wheelOpen = false;
    Promise.resolve(app()?.run?.(() => {
      const result = window.__partyEngine?.extResolveWheel?.(state(), { playerId: data.playerId, at: data.at });
      if (result) app()?.notify?.(`🌈 ${result.effect?.name || '命運輪盤'}：${result.text || ''}`);
      else { lastWheelKey = ''; app()?.notify?.('輪盤結果已失效。'); }
    })).finally(() => {
      wheelResolving = false;
      afterSpecialChange();
    });
  }

  // -------------------------------------------------------------------------
  // 真理之門 / 道具挑選 / 格子挑選
  // -------------------------------------------------------------------------
  function openTruthGate() {
    const p = state();
    if (!p) return;
    if (!canUseLocalAction(p)) { app()?.notify('現在不是你的回合，請等待其他玩家。'); return; }
    if (p.phase !== 'roll') { app()?.notify('神話道具只能在擲骰前使用。'); return; }
    const player = p.players[p.turnIndex];
    const entry = player?.mythics?.find(x => x.id === 'truthGate');
    const normal = (window.__partyData?.ITEMS || []).filter(i => !i.hidden);
    const mythics = (window.__partyData?.MYTHIC_ITEMS || []).filter(i => !i.hidden);
    const inventoryCount = (player?.items?.length || 0) + (player?.mythics?.length || 0);
    const cashOk = (player?.cash || 0) >= 1000;
    const hasSpace = inventoryCount < 3;
    const bankai = Boolean(player?.ext?.bankai);
    const canBuy = cashOk && hasSpace && !bankai;
    const canSell = inventoryCount > 0;
    const buyReason = !cashOk ? '總資產不足 1,000' : bankai ? '卍解期間禁止獲取新道具' : !hasSpace ? '道具欄已滿（3/3）' : '';
    const sellOptions = [
      ...(player?.items || []).map((id, idx) => {
        const it = normal.find(x => x.id === id) || { icon: '🎁', name: id };
        return `<option value="normal:${idx}">${it.icon} ${h(it.name)}</option>`;
      }),
      ...(player?.mythics || []).map((m, idx) => {
        const it = mythics.find(x => x.id === m.id) || { icon: '🗿', name: m.id };
        return `<option value="mythic:${idx}">${it.icon} ${h(it.name)}（神話）</option>`;
      })
    ].join('');
    updateExtModal({
      kicker: 'TRUTH GATE · 真理之門', icon: '🚪', title: `真理之門（${entry?.charges ?? 0} 次）`, type: 'truth',
      text: '將 1,000 總資產煉成指定普通道具，或把 1 個道具煉成 1,000 總資產。',
      body: `<div class="truth-grid">
        <div><h4>💰 1000 → 普通道具</h4><select id="truth-buy" ${canBuy ? '' : 'disabled'}>${normal.map(i => `<option value="${i.id}">${i.icon} ${h(i.name)}</option>`).join('') || '<option value="">沒有可煉成的道具</option>'}</select><button class="secondary" data-truth="buy" ${canBuy ? '' : 'disabled'}>煉成道具</button>${buyReason ? `<small class="truth-lock">${h(buyReason)}</small>` : '<small class="truth-hint">金錢轉道具僅能產出普通道具。</small>'}</div>
        <div><h4>🎒 道具 → 1000</h4><select id="truth-sell" ${canSell ? '' : 'disabled'}>${sellOptions || '<option value="">背包裡沒有道具</option>'}</select><button class="secondary" data-truth="sell" ${canSell ? '' : 'disabled'}>煉成 1000</button><small class="${canSell ? 'truth-hint' : 'truth-lock'}">${canSell ? '普通與神話道具都可煉成 1,000。' : '背包裡沒有道具可以煉成金錢。'}</small></div>
      </div>`,
      actions: `<button class="secondary" data-truth="close">取消</button>`
    });
  }

  function openDebugItemPicker(kind) {
    const p = state();
    if (!p) return;
    if (!canUseLocalAction(p)) { app()?.notify('現在不是你的回合，請等待其他玩家。'); return; }
    const { ITEMS = [], MYTHIC_ITEMS = [] } = window.__partyData || {};
    const normal = ITEMS;
    const mythics = MYTHIC_ITEMS;
    const showNormal = kind !== 'mythic';
    const showMythic = kind !== 'normal';
    const entries = [
      ...(showNormal ? normal.map(i => ({ kind: 'normal', meta: i, hidden: false })) : []),
      ...(showMythic ? mythics.map(i => ({ kind: 'mythic', meta: i, hidden: Boolean(i.hidden) })) : [])
    ];
    updateExtModal({
      kicker: 'DEBUG · 測試模式', icon: '🧪', title: '新增道具', type: 'debug-items',
      text: '點擊即可直接加入目前玩家的道具欄（含一般與隱藏道具）。道具欄已滿時會自動開啟替換視窗。',
      body: `<div class="debug-item-grid">${entries.map(e => `<button type="button" class="debug-item ${e.kind}" data-give-kind="${e.kind}" data-give-id="${e.meta.id}"><span>${e.meta.icon}</span><strong>${h(e.meta.name)}${e.hidden ? '（隱藏）' : ''}</strong><small>${h(e.meta.desc)}</small></button>`).join('') || '<div class="empty-state">目前沒有可新增的道具。</div>'}</div>`,
      actions: `<button class="secondary" data-truth="close">取消</button>`
    });
  }

  function openTilePicker(opts, callback) {
    const p = state();
    if (!p) return;
    if (!canUseLocalAction(p)) { app()?.notify('現在不是你的回合，請等待其他玩家。'); return; }
    tilePick = { opts, callback };
    const tiles = p.board || [];
    updateExtModal({
      kicker: 'TARGET TILE', icon: '🎯', title: opts.title || '選擇格子', type: 'tile',
      text: opts.text || '點擊地圖上的格子。',
      body: `<div class="tile-picker">${tiles.map(t => `<button type="button" class="pick-tile ${t.special ? 'special' : ''} ${t.type}" data-pick-tile="${t.index}" ${opts.excludeStart && t.index === 0 ? 'disabled' : ''}><small>${String(t.index).padStart(2, '0')}</small><span>${t.icon}</span><strong>${h(t.label)}</strong></button>`).join('')}</div>`,
      actions: `<button class="secondary" data-truth="close">取消</button>`
    });
  }

  // -------------------------------------------------------------------------
  // 除錯面板
  // -------------------------------------------------------------------------
  function ensureDebugPanel(p) {
    let panel = $('#debug-panel');
    if (!p?.ext?.debug || !canUseLocalAction(p)) { panel?.remove(); return; }
    const side = $('.side-stack');
    if (!side) return;
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'debug-panel';
      panel.className = 'panel debug-panel';
      side.appendChild(panel);
    }
    panel.innerHTML = `<div class="panel-title"><h3>🧪 測試工具</h3><span class="pill">DEBUG</span></div>
      <p class="debug-hint">點「新增道具」可獲得一般或隱藏道具；先點玩家或幽靈，再點格子即可瞬移。</p>
      <div class="debug-buttons"><button class="quiet" data-debug-action="add">➕ 新增道具</button><button class="quiet" data-debug-action="end-turn" ${app()?.isAnimating?.() || p.status !== 'playing' ? 'disabled' : ''}>⏭️ 結束回合</button></div>
      <p class="debug-selected">${debugSelected ? `已選：${debugSelected.type === 'ghost' ? '👻 幽靈' : h(p.players.find(x => x.id === debugSelected.id)?.name || '玩家')} → 點格子傳送` : '尚未選擇傳送目標'}</p>`;
  }

  // -------------------------------------------------------------------------
  // HUD / 憑證 / 回合鎖
  // -------------------------------------------------------------------------
  function ensureHud(p) {
    if (!p) return;
    const side = $('.side-stack');
    if (!side) return;
    let hud = $('#party-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'party-hud';
      hud.className = 'panel party-hud';
      side.insertBefore(hud, side.firstChild);
    }
    const ext = p.ext || {};
    const mode = window.__partyData?.GAME_MODES?.[ext.mode] || { icon: '🌟', name: '企業之星', win: '' };
    const certs = (ext.certificates || []).filter(c => !c.resolved);
    const domain = ext.domain;
    const domainOwner = domain ? p.players.find(x => x.id === domain.ownerId) : null;
    const domainTiles = domainOwner ? [-1, 0, 1].map(d => (domainOwner.position + d + p.board.length) % p.board.length) : [];
    hud.innerHTML = `<div class="hud-mode ${ext.mode}"><span>${mode.icon} ${h(mode.name)}</span><small>第 ${p.round} / ${p.maxRounds} 季${p.round >= p.maxRounds ? ' · 最終季' : ''}</small></div>
      <div class="hud-pills">
        ${ext.mode === 'star' ? `<span class="hud-pill star">⭐ 星價 ${money(ext.starPrice)}</span><span class="hud-pill">已賣 ${ext.starSold || 0} 顆</span>` : ''}
        ${ext.mode === 'tycoon' ? `<span class="hud-pill ${ext.inflation >= 2 ? 'danger' : ''}">${ext.inflation >= 4 ? '🚨 通膨 ×4' : ext.inflation >= 2 ? '⚠️ 通膨 ×2' : '🌤 平穩期'}</span><span class="hud-pill">目標 ${money(ext.target)}</span>` : ''}
        ${ext.mode === 'evil' ? `<span class="hud-pill danger">💀 保護費 ${money(ext.doomPrice)}</span><span class="hud-pill">毀滅日 ${Math.max(1, ext.doomEvery - ((p.round - 1) % ext.doomEvery))} 季後</span>` : ''}
        ${ext.suddenDeath ? '<span class="hud-pill danger">⚡ 驟死賽</span>' : ''}
        ${p.net ? `<span class="hud-pill">🌐 ${h(p.net.roomCode)}</span>` : ''}
      </div>
      ${certs.length ? `<div class="cert-box"><div class="cert-head"><span>📈 股票憑證</span><small>季末結算</small></div>${certs.map(c => { const pl = p.players.find(x => x.id === c.playerId); return `<div class="cert-row"><span>${h(pl?.name || '')}</span><strong>${money(c.principal)}</strong></div>`; }).join('')}</div>` : ''}
      ${domain ? `<div class="domain-box">🌐 弱者的領域：第 ${domainTiles.join('、')} 格（${h(domainOwner?.name || '')}，跟隨移動）</div>` : ''}
      ${ext.vector ? `<div class="domain-box vector">⬆️ 矢量操作：回合結束拖到第 ${ext.vector.destination ?? '?'} 格</div>` : ''}
    `;
  }

  function clearTurnLock() {
    document.body.classList.remove('spectator-mode');
    const overlay = $('#spectator-note');
    if (overlay) overlay.hidden = true;
  }

  function lockForeignTurn(p) {
    if (!p?.net) return;
    const mine = window.PartyNet?.canAct(p);
    const ownerId = specialOwnerId(p) || p.players[p.turnIndex]?.id || null;
    const ownerLocal = isLocalOwner(p, ownerId);
    const waiting = p.status === 'playing' && (hasSpecialOffer(p) ? !ownerLocal : !mine);
    document.body.classList.toggle('spectator-mode', p.status === 'playing' && (!mine || (hasSpecialOffer(p) && !ownerLocal)));
    $$('#turn-content [data-action]').forEach(btn => {
      if (['open-settlement', 'new-game'].includes(btn.dataset.action)) return;
      if (!mine) btn.disabled = true;
    });
    let overlay = $('#spectator-note');
    if (waiting) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'spectator-note';
        document.body.appendChild(overlay);
      }
      const ownerName = playerName(p, ownerId) || window.PartyNet?.ownerName(p) || '其他玩家';
      overlay.innerHTML = `👀 等待 <strong>${h(ownerName)}</strong> 決定中...`;
      overlay.hidden = false;
    } else if (overlay) {
      overlay.hidden = true;
    }
  }

  // -------------------------------------------------------------------------
  // 結算
  // -------------------------------------------------------------------------
  function hideSettlement() { const el = $('#settlement-overlay'); if (el) el.hidden = true; }
  function chart(series, { width = 660, height = 220, unit = '', rounds = [] } = {}) {
    const all = series.flatMap(s => s.values);
    const max = Math.max(1, ...all), min = Math.min(0, ...all);
    const pad = { l: 52, r: 18, t: 18, b: 30 };
    const w = width - pad.l - pad.r, hgt = height - pad.t - pad.b;
    const n = Math.max(1, series[0]?.values.length - 1);
    const x = i => pad.l + (n === 0 ? w / 2 : (i / n) * w);
    const y = v => pad.t + hgt - ((v - min) / Math.max(1, max - min)) * hgt;
    const grid = [0, 0.25, 0.5, 0.75, 1].map(t => {
      const val = min + (max - min) * t;
      return `<line x1="${pad.l}" y1="${y(val)}" x2="${width - pad.r}" y2="${y(val)}" class="chart-grid"/><text x="${pad.l - 8}" y="${y(val) + 4}" text-anchor="end" class="chart-axis">${Math.round(val).toLocaleString()}</text>`;
    }).join('');
    const lines = series.map((s, si) => {
      const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
      return `<polyline points="${pts}" fill="none" stroke="${s.color || colors[si % colors.length]}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>${s.values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.2" fill="${s.color || colors[si % colors.length]}"><title>${h(s.name)} · 第 ${rounds[i] ?? i} 季：${v.toLocaleString()}${unit}</title></circle>`).join('')}`;
    }).join('');
    const xLabels = (series[0]?.values || []).map((_, i) => `<text x="${x(i)}" y="${height - 8}" text-anchor="middle" class="chart-axis">${rounds[i] ?? i}</text>`).join('');
    return `<svg viewBox="0 0 ${width} ${height}" class="line-chart" role="img"><g>${grid}</g><g>${lines}</g><g>${xLabels}</g></svg>`;
  }
  function legend(series) {
    return `<div class="chart-legend">${series.map((s, i) => `<span><i style="background:${s.color || colors[i % colors.length]}"></i>${h(shorten(s.name))}</span>`).join('')}</div>`;
  }

  function openSettlement(p) {
    ensureRoot();
    const el = $('#settlement-overlay');
    if (!el || !p) return;
    if (Date.now() < settlementLockUntil) { app()?.notify('毀滅日雷射播放中，請稍候…'); return; }
    const data = window.__partyEngine?.extSettlementData?.(p) || null;
    if (!data) return;
    data.cash.forEach((s, i) => s.color = colors[i % colors.length]);
    data.stars.forEach((s, i) => s.color = colors[i % colors.length]);
    const winners = data.winners.map(x => x.name).join('、') || '無人';
    const tabs = [['cash', '總資產']];
    if (data.mode?.id === 'star') tabs.push(['stars', '星數排行']);
    if (data.mode?.id === 'evil') tabs.push(['survival', '生還季數']);
    tabs.push(['items', '道具明細']);
    const tabButtons = tabs.map(([id, label], i) => `<button data-settle-tab="${id}" class="${i === 0 ? 'active' : ''}" type="button">${label}</button>`).join('');
    el.hidden = false;
    el.innerHTML = `<div class="ext-modal-backdrop"></div>
      <div class="settlement-card">
        <button class="ext-modal-close" data-settle-close type="button">×</button>
        <div class="settle-head"><div><p class="ext-kicker">FINAL SETTLEMENT · ${h(data.mode.name)}</p><h2>${h(data.title)}</h2>${data.subtitle ? `<p class="settle-subtitle">${h(data.subtitle)}</p>` : ''}<p>${data.subtitle ? `共 ${data.rounds.length} 個紀錄點` : `${h(winners)} 獲勝 · 共 ${data.rounds.length} 個紀錄點`}</p></div><span class="settle-trophy">🏆</span></div>
        <div class="settle-tabs">${tabButtons}</div>
        <div class="settle-body"></div>
        <div class="settle-footer">
          ${p.net ? `<div id="confirm-ratio" class="confirm-ratio">等待全員確認…</div>` : ''}
          <div class="settle-actions">${p.net ? `<button class="primary" id="confirm-result" type="button">確認結果</button>` : `<button class="primary" data-settle-close type="button">關閉</button>`}</div>
        </div>
      </div>`;
    const body = el.querySelector('.settle-body');
    const itemRows = [...data.itemTotals].sort((a, b) => b.total - a.total).flatMap(s => {
      const list = s.details?.length ? s.details : [{ name: '（未獲得道具）', count: 0 }];
      return list.map((d, i) => `<tr>${i === 0 ? `<td rowspan="${list.length}" class="item-player"><strong>${h(shorten(s.name, 8))}</strong><small>共 ${s.total} 件</small></td>` : ''}<td>${h(d.name)}</td><td>${d.count}</td></tr>`);
    }).join('');
    const renderTab = tab => {
      el.querySelectorAll('[data-settle-tab]').forEach(b => b.classList.toggle('active', b.dataset.settleTab === tab));
      if (tab === 'cash') body.innerHTML = `<div class="chart-wrap">${chart(data.cash, { rounds: data.rounds })}</div>${legend(data.cash)}<p class="chart-note">X 軸：季數　Y 軸：總資產</p>`;
      else if (tab === 'stars') body.innerHTML = `<div class="chart-wrap">${chart(data.stars, { rounds: data.rounds })}</div>${legend(data.stars)}<p class="chart-note">X 軸：季數　Y 軸：星數</p>`;
      else if (tab === 'survival') body.innerHTML = `<div class="rank-list">${[...data.survival].sort((a, b) => Number(b.alive) - Number(a.alive) || b.seasons - a.seasons).map((s, i) => `<div class="rank-row ${s.alive ? 'alive' : 'out'}"><span>${i + 1}</span><strong>${h(shorten(s.name, 8))}</strong><em>${s.seasons} 季</em><small>${s.alive ? '存活' : '👻 罷工團'}</small></div>`).join('')}</div>`;
      else body.innerHTML = `<table class="item-table item-detail-table"><thead><tr><th>玩家</th><th>道具名稱</th><th>獲得次數</th></tr></thead><tbody>${itemRows}</tbody></table><p class="chart-note">依玩家道具獲取總量排序；神話與普通道具合併計算。</p>`;
    };
    renderTab(tabs[0][0]);
    el.querySelectorAll('[data-settle-tab]').forEach(b => b.onclick = () => { renderTab(b.dataset.settleTab); sound('click'); });
    el.querySelectorAll('[data-settle-close]').forEach(b => b.onclick = () => hideSettlement());
    const confirm = el.querySelector('#confirm-result');
    if (confirm) confirm.onclick = () => {
      const res = window.PartyNet.confirmResult(window.PartyNet.myPlayerId);
      confirm.disabled = true;
      confirm.textContent = '已確認';
      if (res) updateConfirm(res);
      else updateConfirm({ confirmed: null, total: p.players.length });
    };
    if (p.net && window.PartyNet.lobby?.confirmRatio) updateConfirm(window.PartyNet.lobby.confirmRatio);
    sound('slide');
  }
  function updateConfirm(ratio) {
    const el = $('#confirm-ratio');
    if (!el || !ratio) return;
    if (ratio.confirmed == null) el.textContent = `已送出確認，等待其他玩家…（共 ${ratio.total} 人）`;
    else el.textContent = `等待確認比例 ${ratio.confirmed}/${ratio.total}`;
  }

  // -------------------------------------------------------------------------
  // 繪製後掛載
  // -------------------------------------------------------------------------
  function afterRender(p) {
    ensureRoot();
    if (!p || !app()) return;
    const recentAt = at => {
      const t = Number(at);
      return Number.isFinite(t) && t > 0 && Date.now() - t <= 8000;
    };
    ensureHud(p);
    ensureDebugPanel(p);
    document.body.classList.toggle('debug-mode', Boolean(p.ext?.debug));
    lockForeignTurn(p);
    const net = window.PartyNet;
    if (net?.active && net.lobby && net.lobby.status !== 'playing') showLobby(net.lobby);
    const subsidy = p.cornerSubsidyEvent;
    const subsidyKey = subsidy?.at ? `${subsidy.playerId}:${subsidy.at}` : '';
    if (subsidyKey && subsidyKey !== lastCornerSubsidyKey) {
      lastCornerSubsidyKey = subsidyKey;
      flashCornerSubsidy(subsidy);
    }
    const investment = app()?.visibleInvestmentSettlement?.(p.ext?.investmentSettlement);
    const investmentKey = investment?.at ? `${investment.round}:${investment.at}` : '';
    if (!investmentKey && lastInvestmentSettlementKey) {
      lastInvestmentSettlementKey = '';
      investmentSoundTimers.forEach(t => clearTimeout(t));
      investmentSoundTimers = [];
    }
    if (investmentKey && investmentKey !== lastInvestmentSettlementKey) {
      lastInvestmentSettlementKey = investmentKey;
      investmentSoundTimers.forEach(t => clearTimeout(t));
      investmentSoundTimers = [];
      const soundByMarket = { '大牛市': 'marketBull', '平穩期': 'marketStable', '龐氏騙局': 'marketPonzi' };
      [...new Set((investment.results || []).map(result => result.label))].forEach((market, index) => {
        const soundName = soundByMarket[market];
        if (soundName) investmentSoundTimers.push(setTimeout(() => sound(soundName), index * 260));
      });
      investmentSoundTimers.push(setTimeout(() => app()?.dismissInvestmentSettlement?.(investmentKey), 12000));
    }
    const ev = p.ext?.lastEvent;
    if (ev?.at && `${ev.type}:${ev.at}` !== lastEventKey) {
      lastEventKey = `${ev.type}:${ev.at}`;
      if (ev.type === 'inflation') flashInflation(ev.stage);
      else if (ev.type === 'doom') flashDoom(ev);
      else if (ev.type === 'suddenDeath') flashSuddenDeath(ev);
      else if (ev.type === 'witch') flashWitch();
      else if (ev.type === 'domainHit') flashDomainHit(ev);
      else if (ev.type === 'iceMushroom') { if (recentAt(ev.at)) flashFrozen(ev); }
      else if (ev.type === 'bankai') { if (recentAt(ev.at)) flashBankai(); }
      else if (ev.type === 'bankrupt') { if (recentAt(ev.at)) flashBankrupt(ev); }
      else if (ev.type === 'ghostStrike' && !net?.active) { if (recentAt(ev.at)) flashGhostInterference(ev); }
    }
    const totem = p.ext?.totemEvent;
    if (totem?.at && String(totem.at) !== lastTotemKey) {
      lastTotemKey = String(totem.at);
      if (recentAt(totem.at)) flashTotem(totem);
    }
    const indulgence = p.ext?.indulgenceEvent;
    if (indulgence?.at && String(indulgence.at) !== lastIndulgenceKey) {
      lastIndulgenceKey = String(indulgence.at);
      if (recentAt(indulgence.at)) flashIndulgence(indulgence);
    }
    const vectorPending = p.ext?.vectorPending;
    if (vectorPending?.at && String(vectorPending.at) !== lastVectorPendingKey) {
      lastVectorPendingKey = String(vectorPending.at);
      beginVectorLock(vectorPending);
    }
    const vector = p.ext?.vectorEvent;
    if (vector?.at && String(vector.at) !== lastVectorKey) {
      lastVectorKey = String(vector.at);
      if (recentAt(vector.at)) flashVector(vector);
    }
    const pendingVictory = p.ext?.pendingVictory;
    if (pendingVictory?.at) {
      const key = `${pendingVictory.round}:${(pendingVictory.playerIds || []).join(',')}:${pendingVictory.at}`;
      if (key !== lastVictoryKey) {
        lastVictoryKey = key;
        if (recentAt(pendingVictory.at)) {
          flashVictoryPending({
            ...pendingVictory,
            text: `${(pendingVictory.names || []).join('、')}已達標，本季將進行結算`
          });
        }
      }
    }
    if (p.pendingDecision) {
      const key = `${p.sync?.gameId || ''}:${p.round}:${p.turnIndex}:${p.pendingDecision.playerId}:${p.pendingDecision.scenarioId || p.pendingDecision.kind}`;
      if (key !== decisionGateKey) {
        decisionGateKey = key;
        decisionGateUntil = Date.now() + 1000;
        clearTimeout(decisionTimer);
        decisionTimer = setTimeout(() => {
          if (state()?.pendingDecision) app()?.render?.();
        }, 1080);
      }
    }
    if (p.status !== 'playing') {
      const key = `${p.sync?.gameId || ''}:${p.round}:${p.winnerIds?.join(',')}`;
      if (key !== lastFinishKey) {
        lastFinishKey = key;
        const ending = playEnding(p);
        // 毀滅日雷射至少完整播放，才允許開啟結算；星／首富結局動畫播放完再進結算。
        const doomDelay = Math.max(0, settlementLockUntil - Date.now());
        const delay = Math.max(ending ? 3200 : 0, doomDelay, 900);
        setTimeout(() => { if (state()?.status !== 'playing') openSettlement(state()); }, delay);
      }
    }
    if (p.round >= p.maxRounds && lastFinalRound !== p.round) {
      lastFinalRound = p.round;
      if (p.status === 'playing') {
        flashFinalSeason(p.round, p.maxRounds);
        document.querySelector('#round-badge')?.classList.add('final-season');
      }
    }
    if (p.ext?.suddenDeathEvent && !p.ext._suddenShown) {
      // 事件只顯示一次；以 lastEventKey 控制即可，這裡保留給舊存檔。
    }
    const settle = $('#settlement-overlay');
    if (settle && !settle.hidden && window.PartyNet?.lobby?.confirmRatio) updateConfirm(window.PartyNet.lobby.confirmRatio);
    afterSpecialChange();
    const wheel = p.ext?.wheelPending;
    if (wheel?.at && String(wheel.at) !== lastWheelKey) {
      lastWheelKey = String(wheel.at);
      showWheel(wheel);
    }
  }

  // -------------------------------------------------------------------------
  // 事件委派
  // -------------------------------------------------------------------------
  function bindEvents() {
    document.addEventListener('click', e => {
      const p = state();
      const fateStep = e.target.closest('[data-fate-step]');
      if (fateStep) {
        const value = Number(fateStep.dataset.fateStep);
        closeExtModal();
        app()?.fateDiceRoll?.(value);
        return;
      }
      const specialBtn = e.target.closest('[data-auction],[data-invest],[data-tax],[data-insider],[data-star-offer],[data-replace-kind],[data-replace-drop],[data-replace-drop-confirm],[data-replace-back]');
      if (specialBtn && p && hasSpecialOffer(p) && !isLocalOwner(p, specialOwnerId(p))) {
        app()?.notify('現在不是你的決策，請等待目前玩家完成。');
        return;
      }

      // 事件格專屬提示
      const eventOk = e.target.closest('[data-event-ok]');
      if (eventOk) {
        try {
          app().runAction({type:'CLEAR_EVENT_PROMPT'}, () => {
            if (window.__partyEngine?.extClearEventPrompt) window.__partyEngine.extClearEventPrompt(p);
            else if (p?.ext) p.ext.eventPrompt = null;
          });
          closeExtModal();
          eventPromptKey = '';
          sound('click');
        } catch (err) { app()?.notify(err.message); sound('error'); }
        return;
      }

      // 起點買星
      const starOffer = e.target.closest('[data-star-offer]');
      if (starOffer) {
        const offer = p?.ext?.starOffer;
        if (!offer) return;
        const buy = starOffer.dataset.starOffer === 'buy';
        try {
          if (buy) {
            app().runAction({type:'STAR_OFFER',buy:true}, () => {
              const stars = window.__partyEngine.extBuyStar(p);
              sound('star');
              app()?.notify(`買到第 ${stars} 顆星！`);
            });
          } else {
            app().runAction({type:'STAR_OFFER',buy:false}, () => { window.__partyEngine.extSkipStarOffer(p); sound('click'); });
          }
          closeExtModal();
        } catch (err) { app()?.notify(err.message); sound('error'); }
        return;
      }

      // 黑市滿包：替換或丟棄新道具
      const replaceSlot = e.target.closest('[data-replace-kind]');
      if (replaceSlot) {
        const kind = replaceSlot.dataset.replaceKind;
        const index = Number(replaceSlot.dataset.replaceIndex);
        try {
          app().runAction({type:'REPLACE_ITEM',kind,index}, () => { window.__partyEngine.extResolveReplace(p, { kind, index }); });
          closeExtModal();
          sound('coin');
        } catch (err) { app()?.notify(err.message); sound('error'); }
        return;
      }
      if (e.target.closest('[data-replace-drop]')) {
        replaceDropConfirm = true;
        openReplaceOffer(p);
        sound('click');
        return;
      }
      if (e.target.closest('[data-replace-back]')) {
        replaceDropConfirm = false;
        openReplaceOffer(p);
        sound('click');
        return;
      }
      if (e.target.closest('[data-replace-drop-confirm]')) {
        try {
          app().runAction({type:'REPLACE_ITEM',dropNew:true}, () => { window.__partyEngine.extResolveReplace(p, { dropNew: true }); });
          closeExtModal();
          sound('ghost');
        } catch (err) { app()?.notify(err.message); sound('error'); }
        return;
      }

      // 擴充 modal 按鈕
      const auction = e.target.closest('[data-auction]');
      if (auction) {
        const a = p?.ext?.auction;
        if (!a) return;
        const action = auction.dataset.auction;
        try {
          // 拍賣採「目前出價者」狀態，僅本人可操作；輪值由引擎推進。
          const current = window.__partyEngine?.extAuctionCurrent?.(p);
          if (current && window.PartyNet?.active && window.PartyNet.myPlayerId && current.id !== window.PartyNet.myPlayerId) {
            app()?.notify(`現在由 ${current.name} 決定，請稍候。`);
            return;
          }
          app().runAction({type:'AUCTION_ACTION',action}, () => { window.__partyEngine.extAuctionAction(p, action); }, { allowAuction: true });
          sound(action === 'bid' ? 'coin' : 'click');
        } catch (err) { app()?.notify(err.message); sound('error'); }
        return;
      }
      const invest = e.target.closest('[data-invest]');
      if (invest) {
        app().runAction({type:'INVEST',yes:invest.dataset.invest === 'yes'}, () => { window.__partyEngine.extInvest(p, invest.dataset.invest === 'yes'); });
        closeExtModal(); sound('slide');
        return;
      }
      const tax = e.target.closest('[data-tax]');
      if (tax) {
        const action = tax.dataset.tax;
        app().runAction({type:'TAX',action}, () => { action === 'pay' ? window.__partyEngine.extTaxPay(p) : window.__partyEngine.extTaxDetain(p); });
        closeExtModal();
        sound(action === 'pay' ? 'coin' : 'cuff');
        return;
      }
      const insider = e.target.closest('[data-insider]');
      if (insider) {
        if (insider.dataset.insider !== 'yes') { app().runAction({type:'INSIDER',yes:false}, () => { p.ext.insiderOffer = null; }); closeExtModal(); return; }
        app().runAction({type:'INSIDER',yes:true}, () => { window.__partyEngine.extInsiderPay(p); });
        closeExtModal();
        sound('wheel');
        return;
      }
      const truth = e.target.closest('[data-truth]');
      if (truth) {
        const act = truth.dataset.truth;
        if (act === 'close') { closeExtModal(); return; }
        if (act === 'buy') {
          const sel = $('#truth-buy');
          const itemId = sel?.value;
          if (!itemId) { app()?.notify('沒有可煉成的道具。'); return; }
          app().runAction({type:'TRUTH_GATE',payload:{mode:'buy',itemId,mythic:false}}, () => { window.__partyEngine.extUseMythic(p, 'truthGate', { mode: 'buy', itemId, mythic: false }); });
        } else if (act === 'sell') {
          const val = $('#truth-sell').value || '';
          const [kind, index] = val.split(':');
          app().runAction({type:'TRUTH_GATE',payload:{mode:'sell',kind,index:Number(index)}}, () => { window.__partyEngine.extUseMythic(p, 'truthGate', { mode: 'sell', kind, index: Number(index) }); });
        }
        closeExtModal(); sound('star');
        return;
      }
      const give = e.target.closest('[data-give-id]');
      if (give) {
        app().debugGive(give.dataset.giveKind, give.dataset.giveId);
        closeExtModal(); sound('coin');
        return;
      }
      const pick = e.target.closest('[data-pick-tile]');
      if (pick) {
        const idx = Number(pick.dataset.pickTile);
        const cb = tilePick?.callback;
        closeExtModal();
        if (cb) cb(idx);
        return;
      }
      const dbg = e.target.closest('[data-debug-action]');
      if (dbg) {
        const act = dbg.dataset.debugAction;
        if (act === 'add') openDebugItemPicker('all');
        else if (act === 'item') openDebugItemPicker('normal');
        else if (act === 'mythic') openDebugItemPicker('mythic');
        else if (act === 'end-turn') { closeExtModal(); app()?.debugEndTurn?.(); }
        return;
      }
      const empty = e.target.closest('[data-empty-slot]');
      if (empty && p?.ext?.debug) {
        openDebugItemPicker('all');
        return;
      }
      const extClose = e.target.closest('.ext-modal-close, [data-ext-close]');
      if (extClose && e.target.closest('#ext-modal')) {
        const el = $('#ext-modal');
        if (['auction', 'decision', 'tax', 'invest', 'insider', 'star', 'replace', 'event'].includes(el?.dataset.type)) { app()?.notify('請先完成目前事件。'); return; }
        closeExtModal(); return;
      }

      // 除錯傳送：先選玩家 / 幽靈，再點格子
      if (p?.ext?.debug && app()?.page === 'game') {
        if (app()?.isMapPicking?.()) return;
        const token = e.target.closest('#board .token[data-player-id]');
        if (token) { debugSelected = { type: 'player', id: token.dataset.playerId }; ensureDebugPanel(state()); app()?.notify('已選取玩家，請點擊目的地格子。'); return; }
        const ghostPiece = e.target.closest('#board .ghost-piece');
        if (ghostPiece) { debugSelected = { type: 'ghost' }; ensureDebugPanel(state()); app()?.notify('已選取幽靈，請點擊目的地格子。'); return; }
        const tile = e.target.closest('#board [data-tile-index]');
        if (tile && debugSelected) {
          const idx = Number(tile.dataset.tileIndex);
          if (debugSelected.type === 'ghost') app().debugGhostTo(idx);
          else app().debugTeleport(debugSelected.id, idx);
          debugSelected = null;
          ensureDebugPanel(state());
          return;
        }
      }
    });

    document.addEventListener('click', e => {
      // 大廳/連線/結算關閉
      if (e.target.closest('[data-settle-close]')) hideSettlement();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const el = $('#ext-modal');
        if (el && !el.hidden && !['auction', 'invest', 'tax', 'insider', 'star', 'replace', 'event'].includes(el.dataset.type)) closeExtModal();
      }
    });
  }

  function init() {
    ensureRoot();
    bindEvents();
    renderSetupExtras();
    // 掃 QR Code 進來的網址帶有 ?room=代碼：直接打開加入視窗並填好代碼，再把網址清乾淨。
    const invited = roomCodeFromLink(location.href);
    if (invited && !window.PartyNet?.active) {
      openConnect('join', invited);
      try { const url = new URL(location.href); url.searchParams.delete('room'); history.replaceState(history.state, '', url.href); } catch { }
    }
    // 將模式資料提供給動態 UI
    window.__partyData = window.__partyData || {
      GAME_MODES: {
        star: { id: 'star', name: '企業之星', icon: '🌟', desc: '出發格買星 500 起，每賣出一顆全場星價 +500，還能溢價強買。', defaultRounds: 10, defaultTarget: 3, win: '先拿 3 星；季末比較星數。', cup: '企業之星盃' },
        tycoon: { id: 'tycoon', name: '首富競爭', icon: '💰', desc: '總資產 8,000 獲勝。季數過半通膨 2 倍，倒數兩季 4 倍。', defaultRounds: 12, defaultTarget: 8000, win: '總資產率先達到 8,000。', cup: '首富競爭盃' },
        evil: { id: 'evil', name: '邪惡企業', icon: '💀', desc: '每 5 季毀滅日收保護費，付不出來就變成藍色幽靈。', defaultRounds: 15, defaultTarget: 0, win: '成為唯一的倖存者。', cup: '邪惡企業盃' },
        random: { id: 'random', name: '隨機模式', icon: '🎲', desc: '開局隨機抽出三種模式之一。', defaultRounds: 12, defaultTarget: 0, win: '依抽到的模式決定。', cup: '命運隨機盃' }
      }
    };
  }

  return {
    init, renderSetupExtras, showLobby, hideLobby, onGameStart, afterRender,
    openSettlement, hideSettlement, openTilePicker, openTruthGate, openWheel: showWheel, openFateDice,
    closeExtModal, openDebugItemPicker, updateConfirm, clearTurnLock,
    playGhostInterference: flashGhostInterference, playSkillCue,
    flashCornerSubsidy,
    decisionBlocked, flashFrozen
  };
})();

globalThis.PartyUI = PartyUI;



// 供動態擴充 UI 使用；匯入後的模組資料在同一頁面共享。
globalThis.__partyData={GAME_MODES,MODE_IDS,PARTY_ROLES,LOBBY_ROLES,MYTHIC_ITEMS,MYTHIC_BY_ID,SPECIAL_ITEM_BY_ID,SPECIAL_TILE_META,QUICK_DECISIONS,RANDOM_ROLE_ID,ITEMS,WHEEL_EFFECTS};
globalThis.__partyEngine={
  extSettlementData,extAuctionCurrent,extAuctionAction,extAuctionFinish,extInvest,extTaxPay,extTaxDetain,
  extInsiderPay,extUseMythic,extDebugRollAgain,extDebugEndTurn,extModeInfo,extStarPrice,extSkipStarOffer,extResolveReplace,extBuyStar,extCanBuyStar,
  extPrepareWheel,extResolveWheel,extClearEventPrompt,extResolveVectorPending
};
globalThis.PartyNet=PartyNet;
globalThis.SoundManager=SoundManager;

const $=s=>document.querySelector(s),h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Math.round(n).toLocaleString('zh-TW'),signed=n=>`${n>=0?'+':'−'}${money(Math.abs(n))}`;
const colors=['#0f9688','#5979b0','#ce9460','#aa6b91','#c55d5d','#7e9541','#348da5','#7a60ad'];
const role=id=>PARTY_ROLES.find(x=>x.id===id)||PARTY_ROLES[0],item=id=>ITEMS.find(x=>x.id===id),mythic=id=>MYTHIC_BY_ID[id],boardTile=(state,i)=>boardOf(state)[i];
const roleStories={
  social:'一支影片讓全城燒起來。你坐在流量儀表板前，準備把對手的公關危機變成自己的紅利。',
  hardware:'新品發表會倒數，你卻已經算好對手的舊機型什麼時候會壞。計畫性報廢，是最優雅的攻擊。',
  ecommerce:'購物節的倒數計時響起。你張開雙手，準備把全場對手的總資產吸進自己的購物車。',
  investment:'螢幕上的報價不停跳動。你盯著對手的資產水位，盤算這一刀做空能割下多少。',
  fastfood:'油鍋滋滋作響，外送單塞滿整條街。你準備用一份套餐，讓所有對手都離不開你的熱量。',
  delivery:'天還沒亮，車隊已排在倉庫門口。你一句話，就能把罷工幽靈派到對手必經的路口。',
  bank:'櫃檯前有人等著貸款，另一邊有人急著提款。你只要按下一個鍵，對手的帳戶就會凍結。',
  property:'接待中心的燈亮著，買方等著下一次看屋。你已經算好，這一鏟要拆掉對手的幾格。',
  green:'碳權價格往上跳，你的綠色工廠卻愈賺愈多。讓排碳最多的對手替你付帳。',
  cloud:'版本上線倒數，工程師還在修最後一個問題。你已經潛進對手的系統，準備帶走能量或道具。'
};
const storageKey='economy-board-v1';
const viewKey='economy-party-view-v1';
const tabId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
let channel=null;
try{if('BroadcastChannel' in globalThis)channel=new BroadcastChannel(storageKey)}catch{}
let state=null,page='home',tab='board',setupPlayers=[{name:'玩家 1',roleId:'social'},{name:'玩家 2',roleId:'hardware'}],toastTimer,resetAt=0,dismissedInvestmentSettlementKey='';
let setupMode='star',setupDebug=false,setupNetConfig=null;
let animation=null,animationSerial=0,modal=null,mapPick=null;
const MOVE_MS=520;
try{const view=JSON.parse(sessionStorage.getItem(viewKey));if(['board','rules'].includes(view?.tab))tab=view.tab}catch{}
function rememberView(){try{sessionStorage.setItem(viewKey,JSON.stringify({tab}))}catch{}}

function notify(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3400)}
function dismissInvestmentSettlement(key=investmentSettlementKey(state?.ext?.investmentSettlement)){
  if(!key||key!==investmentSettlementKey(state?.ext?.investmentSettlement))return;
  dismissedInvestmentSettlementKey=key;
  render();
}
function investmentSettlementKey(settlement){return settlement?.at?`${settlement.round}:${settlement.at}`:''}
function visibleInvestmentSettlement(settlement){
  if(!settlement?.results?.length)return null;
  if(!PartyNet.active)return settlement;
  const playerId=PartyNet.myPlayerId;
  if(!playerId)return null;
  const results=settlement.results.filter(result=>result.playerId===playerId);
  return results.length?{...settlement,results}:null;
}
function beginMapPick(message,callback){
  if(animation){notify('請等待動畫結束。');return;}
  mapPick={callback};
  document.body.classList.add('map-pick-mode');
  notify(message||'請直接點擊地圖上的格子（Esc 取消）。');
}
function cancelMapPick(){
  if(!mapPick)return false;
  mapPick=null;
  document.body.classList.remove('map-pick-mode');
  notify('已取消地圖選取。');
  return true;
}
function newGameId(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`}
function prepareNewSession(game){const previous=syncInfo(state);game.sync={gameId:newGameId(),revision:0,updatedAt:Math.max(Date.now(),(previous?.updatedAt||0)+1,resetAt+1),writerId:tabId}}
function readStored(){try{const raw=localStorage.getItem(storageKey);if(!raw)return null;const game=importGame(raw);return extEnsureState(game)}catch{return undefined}}
function cancelAnimation(){animationSerial++;animation=null}
function save(){
  if(!state)return;
  if(PartyNet.isClient){$('#save-status').textContent='房主狀態同步中';return}
  if(!state.sync)prepareNewSession(state);
  state.sync.revision++;
  state.sync.updatedAt=Math.max(Date.now(),state.sync.updatedAt+1);
  state.sync.writerId=tabId;
  try{localStorage.setItem(storageKey,exportGame(state));$('#save-status').textContent=state.net?'房間即時同步中':'多頁籤已同步'}catch{$('#save-status').textContent=channel?'即時同步中；請匯出備份':'本機儲存不可用，請匯出備份'}
  try{channel?.postMessage({type:'state',writerId:tabId,game:state})}catch{}
  try{PartyNet.publish(state)}catch(e){console.warn('room publish failed',e)}
}
function clearSave(){
  const updatedAt=Math.max(Date.now(),(syncInfo(state)?.updatedAt||0)+1,resetAt+1);
  resetAt=updatedAt;
  try{localStorage.removeItem(storageKey)}catch{}
  try{channel?.postMessage({type:'reset',updatedAt,writerId:tabId})}catch{}
}
function adoptShared(incoming){
  if(PartyNet.active)return false;
  if(!isNewerGame(incoming,state))return false;
  const previous=state;
  const sameGame=previous&&syncInfo(previous).gameId===syncInfo(incoming).gameId&&previous.round===incoming.round&&previous.turnIndex===incoming.turnIndex;
  const sharedRoll=sameGame&&previous.phase==='roll'&&incoming.lastRoll&&incoming.lastRoll.value>0&&['moving','resolve','decision'].includes(incoming.phase);
  const from=sharedRoll?previous.players[previous.turnIndex]?.position:null;
  const before=cashSnapshot();
  cancelAnimation();state=incoming;render();
  if(before)animateCashChanges(before);
  $('#save-status').textContent='已從其他頁籤同步';
  if(sharedRoll)beginRollAnimation(incoming.lastRoll,from,incoming.players[incoming.turnIndex]?.id,false);
  return true;
}
function ensureFresh(){
  if(PartyNet.active)return true;
  const stored=readStored();
  if(stored===null&&state){cancelAnimation();state=null;render();notify('其他頁籤已開始新遊戲，畫面已更新。');return false}
  if(stored&&isNewerGame(stored,state)){adoptShared(stored);notify('對局已由其他頁籤更新，請確認目前回合後再操作。');return false}
  return true;
}
async function withGameLock(work){
  if(globalThis.navigator?.locks?.request)return navigator.locks.request(`${storageKey}-write`,{mode:'exclusive'},work);
  return work();
}
async function run(fn,options={}){
  if(PartyNet.isClient){notify('此操作尚未加入房主指令白名單。');return}
  if(animation){notify('請等待骰子與棋子移動完成。');return}
  if(state?.ext?.vectorPending){notify('矢量操作鎖定中，請稍候。');return}
  const auctionOwner=options.allowAuction&&state?.ext?.auction&&window.__partyEngine?.extAuctionCurrent?.(state)?.id===PartyNet.myPlayerId;
  if(state?.net&&!PartyNet.canAct(state)&&!auctionOwner&&!options.authoritative){notify('現在不是你的回合，請等待其他玩家。');return}
  let before=null;
  try{await withGameLock(()=>{if(!ensureFresh())return;before=cashSnapshot();fn();save();render();options.afterCommit?.()})}
  catch(e){notify(e.message||'操作失敗');SoundManager.play('error');return}
  if(before)animateCashChanges(before);
}

function dispatchSkillCue(playerId){
  const player=state?.players.find(entry=>entry.id===playerId)||activePlayer();
  if(!player)return;
  const event={type:'SKILL_TRIGGERED',playerId:player.id,skillName:role(player.roleId).skill.name};
  if(PartyNet.active)PartyNet.broadcastEvent(event);
  else PartyUI.playSkillCue?.(event);
}

function runAction(action,fn,options={}){
  const playerId=action?.playerId||PartyNet.myPlayerId||activePlayer()?.id;
  const skillAction=action?.type==='USE_SKILL'||(action?.type==='TARGET_ACTION'&&action.action==='skill');
  const runOptions=skillAction?{...options,afterCommit:()=>dispatchSkillCue(playerId)}:options;
  if(PartyNet.isClient){
    PartyNet.sendAction({...action,playerId});
    return;
  }
  return run(fn,runOptions);
}

function cashSnapshot(){
  const map=new Map();
  for(const p of state?.players||[])map.set(p.id,Number(p.cash)||0);
  return map;
}
function animateCashTarget(playerId,delta){
  const card=document.querySelector(`[data-player-card="${playerId}"]`);
  const target=card?.querySelector('.party-money > div:first-child');
  if(!target)return;
  target.querySelector('.cash-burst')?.remove();
  const burst=document.createElement('span');
  burst.className=`cash-burst ${delta>0?'gain':'loss'}`;
  burst.innerHTML=Array.from({length:7},(_,i)=>`<i style="--i:${i}">🪙</i>`).join('');
  target.appendChild(burst);
  setTimeout(()=>burst.remove(),1200);
}
function animateCashChanges(before){
  if(!state||!before)return;
  let gained=false,lost=false;
  for(const p of state.players){
    if(!before.has(p.id))continue;
    const delta=Math.round((Number(p.cash)||0)-before.get(p.id));
    if(!delta)continue;
    animateCashTarget(p.id,delta);
    if(delta>0)gained=true;else lost=true;
  }
  if(gained)SoundManager.play('cashGain');
  if(lost)setTimeout(()=>SoundManager.play('cashLoss'),gained?120:0);
}
function renderHomeRoles(){  $('#home-roles').innerHTML=PARTY_ROLES.map(r=>`<article class="home-role party-role"><div class="home-role-title"><span class="home-role-icon" aria-hidden="true">${r.icon}</span><div><span class="home-role-sector">${h(r.sector)} · 起始總資產 ${money(1200)}</span><h3>${h(r.name)}</h3></div></div><p class="home-role-story">${h(roleStories[r.id])}</p><div class="home-role-skill"><span class="skill-icon" aria-hidden="true">${r.skill.icon}</span><div><small>專屬技能 · 消耗 1 能量</small><strong>${h(r.skill.name)}</strong><p>${h(r.skill.desc)}</p></div></div></article>`).join('');
}
function renderRules(){
  $('#rules-items').innerHTML=ITEMS.map(x=>`<div class="rule-item"><span>${x.icon}</span><div><strong>${h(x.name)}</strong><p>${h(x.desc)}</p></div></div>`).join('');
  $('#rules-skills').innerHTML=PARTY_ROLES.map(r=>`<div class="rule-skill"><span>${r.icon}</span><div><small>${h(r.name)} · ${h(r.sector)}</small><strong>${r.skill.icon} ${h(r.skill.name)}</strong><p>${h(r.skill.desc)}</p></div></div>`).join('');
  const mythics=$('#rules-mythics');
  if(mythics)mythics.innerHTML=MYTHIC_ITEMS.filter(x=>!x.hidden).map(x=>`<div class="rule-item mythic-rule"><span>${x.icon}</span><div><strong>${h(x.name)}${x.mode?`（${h(GAME_MODES[x.mode]?.name||x.mode)}限定）`:''}</strong><p>${h(x.desc)}</p></div></div>`).join('');
  const decisions=$('#rules-decisions');
  if(decisions)decisions.innerHTML=QUICK_DECISIONS.map(x=>`<div class="rule-item decision-rule"><span>${x.icon}</span><div><strong>${h(x.name)}</strong>${x.options.map(o=>`<p>${o.icon} <b>${h(o.label)}</b>：${h(o.desc)}</p>`).join('')}</div></div>`).join('');
}
function renderSetup(){
  $('#setup-players').innerHTML=setupPlayers.map((p,i)=>`<div class="setup-player"><span class="player-numeral">${i+1}</span><input data-setup-name="${i}" aria-label="玩家 ${i+1} 名稱" maxlength="16" value="${h(p.name)}"><select data-setup-role="${i}" aria-label="玩家 ${i+1} 企業">${LOBBY_ROLES.map(r=>`<option value="${r.id}" ${r.id===p.roleId?'selected':''}>${r.icon} ${h(r.name)}</option>`).join('')}</select><button class="remove-player" data-remove-player="${i}" type="button" aria-label="移除玩家 ${i+1}" ${setupPlayers.length<=2?'disabled':''}>×</button></div>`).join('');
  $('#add-player').disabled=setupPlayers.length>=8;
  PartyUI?.renderSetupExtras?.();
}
function activePlayer(){return state?.players[state.turnIndex]||state?.players[0]}
function boardCoords(i){if(i<=6)return [1,i+1];if(i<=12)return [i-5,7];if(i<=18)return [7,19-i];return [25-i,1]}
const tileValueLabel=t=>t.type==='blue'?`+${Number.isFinite(Number(t.value))&&Number(t.value)>0?Number(t.value):300}`:t.type==='red'?'−150':t.type==='yellow'?'+1 ⚡':t.type==='green'?'抽事件':t.type==='start'?'START':t.special?'特殊格':'—';
const CORNER_MARK_LABELS={red:'紅色',green:'綠色',blue:'藍色',yellow:'黃色'};
const CORNER_PLAYER_MARKS=[['red','紅'],['green','綠'],['blue','藍'],['yellow','黃']];

function diceMarkup(value,{rolling=false}={}){
  const faces=[1,2,3,4,5,6].map(n=>`<span class="dice-face face-${n}">${n}</span>`).join('');
  return `<div class="dice-stage ${rolling?'is-rolling':''}" aria-label="${rolling?'骰子翻滾中':'骰子點數 '+value}"><div class="dice3d ${rolling?'tumbling':''} show-${value}">${faces}</div></div>`;
}
function effectsMarkup(effects){
  if(!effects?.length)return '<p class="roll-empty">這一步沒有額外效果。</p>';
  return `<div class="effect-stack">${effects.map(e=>`<div class="roll-effect ${e.tone||'neutral'}"><span>${e.icon}</span><p>${h(e.text)}</p></div>`).join('')}</div>`;
}
function centerBackdropMarkup(){
  const ext=state.ext||{};
  const parts=[];
  if(ext.mode==='tycoon'){
    const stage=ext.inflationStage||1;
    parts.push(`<div class="inflation-backdrop stage-${stage}"><span>${stage>=4?'通膨 ×4':stage>=2?'通膨 ×2':'平穩期'}</span><small>資產變動倍率</small></div>`);
  }
  if(ext.mode==='evil'){
    const remaining=ext.doomEvery-((state.round-1)%ext.doomEvery);
    parts.push(`<div class="evil-tower ${ext.doomEvent?'is-firing':''}"><span class="tower-building">🏢</span><strong>杜芬舒斯大樓</strong><small>距離毀滅日 ${remaining} 季 · 保護費 ${money(ext.doomPrice||1000)}</small></div>`);
  }
  if(ext.mode==='star'){
    parts.push(`<div class="star-price-backdrop"><span>⭐ 全場星價</span><strong>${money(extStarPrice(state))}</strong><small>每賣出 1 顆 +500</small></div>`);
  }
  return `<div class="center-backdrop">${parts.join('')}</div>`;
}
function centerMarkup(){
  const investment=visibleInvestmentSettlement(state.ext?.investmentSettlement);
  const investmentKey=investmentSettlementKey(investment);
  if(investment?.results?.length&&investmentKey!==dismissedInvestmentSettlementKey){
    const rows=investment.results.map(result=>{
      const tone=result.label==='大牛市'?'bull':result.label==='平穩期'?'stable':'ponzi';
      return `<div class="investment-result-row"><strong>${h(result.playerName)}</strong><span class="investment-market-tag ${tone}">${h(result.label)}</span><small>本金 ${money(result.principal)} · 回收 <b>${money(result.payout)}</b></small></div>`;
    }).join('');
    return `<section class="investment-market-panel center-foreground" aria-label="投資季末結算"><header><div><small>第 ${investment.round} 季 · 投資市況</small><h3>股票憑證結算</h3></div><button type="button" data-dismiss-investment aria-label="關閉投資結果">×</button></header><div class="investment-result-list">${rows}</div><footer>市況由房主結算並同步給所有玩家</footer></section>`;
  }
  if(state.status!=='playing'){
    const winners=state.players.filter(p=>state.winnerIds.includes(p.id));
    const causes={
      stars:`率先拿下 ${state.starGoal||STAR_GOAL} 顆星`,
      rounds:'季數上限，依模式規則排名',
      target:`率先達到 ${money(state.ext?.targetAssets??state.ext?.target??0)} 總資產`,
      survivor:'成為最後一位存活者'
    };
    const cause=causes[state.resultReason]||'對局結束';
    const title=state.ext?.finishTitle||'派對結束';
    return `<div class="result-scene"><span class="result-crown">🏆</span><p class="card-hint">${h(title)} · 第 ${state.round} 季</p><h3>${h(winners.map(p=>p.name).join('、')||'無人')} 獲勝</h3><p>${h(cause)}</p><div class="result-stars">${winners.map(p=>`<span style="--winner-color:${colors[p.color]}">${role(p.roleId).icon} ${h(p.name)} · ${p.stars}★ · ${money(p.cash)}</span>`).join('')}</div><button class="primary" data-action="open-settlement">查看遊戲結算</button><button class="secondary" data-action="new-game">創建新遊戲</button></div>`;
  }
  const p=activePlayer();
  if(animation?.stage==='rolling')return `<div class="dice-center center-foreground"><p class="card-hint">骰子翻滾中 · 第 ${state.round} 季</p>${diceMarkup(animation.value,{rolling:true})}<h3>${h(p.name)}</h3><p>骰子停定後，棋子會逐格前進。</p><small>點數 1–6 · 只有踩在幽靈格才會觸發罷工</small></div>`;
  if(animation?.stage==='moving')return `<div class="dice-center center-foreground"><p class="card-hint">棋子前進中 · 第 ${state.round} 季</p><h3>${h(p.name)} 前進 ${animation.value} 格</h3><p>棋子完全停下後，才會發動格子效果。</p><small>正在前往第 ${animation.position ?? p.position} 格</small></div>`;
  if(state.phase==='skipped')return `<div class="skip-center center-foreground"><span>⏸️</span><p class="card-hint">失去行動</p><h3>${h(p.name)} 這回合暫停</h3><p>${p.ext?.eliminated?'已化為罷工團幽靈，仍可擲骰移動。':'企業暫停行動生效中，本回合不能擲骰、使用道具或技能。'}</p><small>按右側「結束回合」交給下一位玩家</small></div>`;
  const roll=state.lastRoll;
  if(roll&&!animation&&roll.playerId===p.id){
    const tile=boardTile(state,roll.tileIndex)||BOARD[roll.tileIndex];
    return `<div class="roll-result center-foreground"><p class="card-hint">${roll.value?`骰子點數 ${roll.value} · `:''}${h(tile.label)}格</p>${roll.value?'':'<div class="swap-badge">🔄</div>'}<h3>${roll.struck?'踩中罷工幽靈！':h(tile.stay)}</h3>${effectsMarkup(roll.effects)}<small>${state.phase==='decision'?'請先完成二選一決策':'確認結果後，按右側結束回合'}</small></div>`;
  }
  const mode=extModeInfo(state);
  const tip=mode.id==='star'?`出發格買星 ${money(extStarPrice(state))} · 先拿 ${state.starGoal||3} 星獲勝`:mode.id==='tycoon'?`目標 ${money(state.ext?.targetAssets??state.ext?.target??0)} 總資產 · 注意通膨倍率` : mode.id==='evil'?`每 ${state.ext?.doomEvery||5} 季毀滅日 · 唯一倖存者獲勝`:`先拿 ${state.starGoal||3} 星獲勝`;
  return `<div class="dice-center center-foreground"><p class="card-hint">輪到 ${h(p.name)} · 第 ${state.round} 季 · ${h(mode.name)}</p><h3>${h(role(p.roleId).name)}</h3><p>擲骰前可先使用道具、神話道具或發動企業技能。</p><small>${h(tip)}</small>${state.ext?.debug?'<em class="debug-chip">🧪 測試模式</em>':''}</div>`;
}
function renderBoard(){
  const boardData=boardOf(state);
  const domain=state.ext?.domain;
  const domainOwner=domain?state.players.find(p=>p.id===domain.ownerId):null;
  const domainPosition=domainOwner?(animation?.playerId===domainOwner.id?animation.position:domainOwner.position):null;
  const domainTiles=new Set(domainOwner?[-1,0,1].map(d=>(domainPosition+d+boardData.length)%boardData.length):[]);
  const pos=state.players.map(p=>({p,index:animation?.playerId===p.id?animation.position:p.position}));
  const tiles=boardData.map((tile,i)=>{
    const [row,col]=boardCoords(i);
    const occupants=pos.filter(x=>x.index===i);
    const inDomain=domainTiles.has(i);
    const tokens=occupants.map(x=>`<span class="token ${animation?.playerId===x.p.id&&animation.stage==='moving'?'moving':''} ${x.p.ext?.eliminated?'ghost-player':''}" data-player-id="${h(x.p.id)}" title="${h(x.p.name)}${x.p.ext?.eliminated?'（罷工團幽靈）':''}" style="background:${x.p.ext?.eliminated?'#5f8ec4':colors[x.p.color]}">${x.p.ext?.eliminated?'👻':h(x.p.name.slice(0,1))}</span>`).join('');
    const ghostHere=state.ghostPosition===i;
    const cornerColor=CORNER_MARKS[i];
    const cornerBadge=cornerColor?`<span class="corner-tile-mark ${cornerColor}" title="${CORNER_MARK_LABELS[cornerColor]}角落記號" aria-label="${CORNER_MARK_LABELS[cornerColor]}角落記號"><i></i><b>${cornerColor==='red'?'紅':cornerColor==='green'?'綠':cornerColor==='blue'?'藍':'黃'}</b></span>`:'';
    return `<div class="tile party-tile ${tile.type} ${tile.special?`special special-${tile.type}`:''} ${occupants.length>2?'crowded':''} ${ghostHere?'ghost-tile':''} ${inDomain?'domain-tile':''} ${animation?.position===i?'tile-active':''} ${animation?.visited?.has(i)?'tile-visited':''}" data-tile-index="${i}" ${inDomain?'data-domain-tile="1"':''} style="grid-row:${row};grid-column:${col}" title="${h(tile.label)}格：${h(tile.stay)}${ghostHere?'｜👻 踩在此格會扣 1,000 總資產並沒收 1 個道具':''}${inDomain?'｜🌐 弱者的領域：進入扣 100 並禁用技能／道具':''}"><span class="tile-number">${String(i).padStart(2,'0')}</span>${cornerBadge}${inDomain?'<span class="tile-domain-badge" aria-hidden="true">🌐</span>':''}<span class="tile-icon">${tile.icon}</span><span class="tile-type">${h(tile.label)}</span><span class="tile-value">${h(tileValueLabel(tile))}</span><div class="tile-tokens">${tokens}</div></div>`;
  }).join('');
  const board=$('#board'),ghost=board.querySelector('.ghost-piece'),oldPosition=ghost?.dataset.position,oldRect=ghost?.getBoundingClientRect();
  ghost?.remove();
  board.innerHTML=tiles+`<div class="board-center party-center ${state.phase==='skipped'?'skip-mode':''}">${centerBackdropMarkup()}${centerMarkup()}</div>`;
  const piece=ghost||document.createElement('span');
  if(!ghost){piece.className='ghost-piece';piece.innerHTML='<span aria-hidden="true">👻</span>';piece.setAttribute('role','img')}
  piece.className=`ghost-piece ${state.ext?.enraged?'enraged':''}`;
  piece.dataset.position=String(state.ghostPosition);
  piece.setAttribute('aria-label',`罷工幽靈位於第 ${state.ghostPosition} 格${state.ext?.enraged?'（憤怒狀態）':''}`);
  board.appendChild(piece);
  const tile=board.querySelector(`[data-tile-index="${state.ghostPosition}"]`);
  if(!tile)return;
  const tileRect=tile.getBoundingClientRect(),boardRect=board.getBoundingClientRect();
  piece.style.left=`${tileRect.left-boardRect.left+tileRect.width*.72}px`;
  piece.style.top=`${tileRect.top-boardRect.top+tileRect.height*.38}px`;
  if(oldRect?.width&&boardRect.width&&oldPosition!==piece.dataset.position&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const trail=state.ghostTrail?.[0]===Number(oldPosition)&&state.ghostTrail.at(-1)===state.ghostPosition?state.ghostTrail:null;
    const frames=trail?.map((position,i)=>{
      const r=board.querySelector(`[data-tile-index="${position}"]`).getBoundingClientRect();
      const dx=r.left-tileRect.left+(r.width-tileRect.width)*.72,dy=r.top-tileRect.top+(r.height-tileRect.height)*.38;
      return {transform:`translate(${dx}px,${dy}px) translate(-50%,-50%)`,offset:i/(trail.length-1)};
    })||[{transform:`translate(${oldRect.left-piece.getBoundingClientRect().left}px,${oldRect.top-piece.getBoundingClientRect().top}px) translate(-50%,-50%)`},{transform:'translate(-50%,-50%)'}];
    piece.animate(frames,{duration:trail?(trail.length-1)*360:850,easing:'ease-in-out'});
  }
}
function starTrack(stars){const goal=state?.starGoal||STAR_GOAL;return `<span class="star-track">${Array.from({length:goal},(_,i)=>`<i class="${i<stars?'on':''}">★</i>`).join('')}</span>`}
function chipMarkup(list){return list.length?`<div class="status-chips">${list.map(c=>`<span class="status-chip ${c.tone||''}">${c.icon} ${h(c.label)}</span>`).join('')}</div>`:''}
function inventorySlots(p){
  const slots=[];
  (p?.specials||[]).forEach((id,index)=>{const meta=SPECIAL_ITEM_BY_ID[id];if(meta)slots.push({kind:'special',index,entry:id,meta})});
  (p?.mythics||[]).forEach((entry,index)=>{const meta=mythic(entry.id);if(meta)slots.push({kind:'mythic',index,entry,meta})});
  (p?.items||[]).forEach((id,index)=>{const meta=item(id);if(meta)slots.push({kind:'normal',index,entry:id,meta})});
  return slots;
}
function itemBarMarkup(p,{interactive=true}={}){
  const chips=statusChips(state,p);
  const blocked=Boolean(p?.ext?.eliminated)||chips.some(c=>['限電禁技','凍結','冰封','弱者的領域','帳戶凍結'].some(x=>c.label.includes(x)));
  const usable=interactive&&state.phase==='roll'&&!animation&&!blocked;
  const inventory=inventorySlots(p);
  const slots=Array.from({length:3},(_,i)=>{
    const slot=inventory[i];
    if(!slot)return `<span class="item-slot empty" data-empty-slot="normal"><span class="item-icon">＋</span><span class="item-name">空欄位</span></span>`;
    const {meta,kind,index,entry}=slot;
    if(kind==='special')return `<span class="item-slot-wrap special-wrap"><button type="button" class="item-slot filled special-slot" data-special-id="${meta.id}" ${usable?'':'disabled'} title="${h(meta.desc)}"><span class="item-icon">${meta.icon}</span><span class="item-name">${h(meta.name)}</span></button><button type="button" class="discard-btn" data-discard-kind="special" data-discard-index="${index}" title="丟棄這個道具">🗑️</button></span>`;
    if(kind==='mythic')return `<span class="item-slot-wrap"><button type="button" class="item-slot filled mythic-slot" data-mythic-id="${meta.id}" ${usable&&meta.kind!=='passive'?'':'disabled'} title="${h(meta.desc)}"><span class="item-icon">${meta.icon}</span><span class="item-name">${h(meta.name)}${entry.charges>1?` ×${entry.charges}`:''}</span></button><button type="button" class="discard-btn" data-discard-kind="mythic" data-discard-index="${index}" title="丟棄這個道具">🗑️</button></span>`;
    return `<span class="item-slot-wrap"><button type="button" class="item-slot filled" data-item-id="${meta.id}" ${usable?'':'disabled'} title="${h(meta.desc)}"><span class="item-icon">${meta.icon}</span><span class="item-name">${h(meta.name)}</span></button><button type="button" class="discard-btn" data-discard-kind="normal" data-discard-index="${index}" title="丟棄這個道具">🗑️</button></span>`;
  }).join('');
  return `<div class="item-bar"><div class="item-bar-head"><span>🎒 道具欄 ${inventory.length}/3</span><small>普通、神話與特殊道具共用 3 格 · 擲骰前使用 · 點🗑️丟棄</small></div><div class="item-slots">${slots}</div>${p.ext?.bankai?'<p class="bankai-note">🌀 卍解中：收益 +100、免疫負面、禁止獲取新道具。</p>':''}</div>`;
}
function renderTurn(){
  const p=activePlayer();
  if(!p)return;
  const r=role(p.roleId),chips=statusChips(state,p),mode=extModeInfo(state);
  if(animation){
    $('#turn-content').innerHTML=`<h2 class="turn-name" style="color:${colors[p.color]}">${h(p.name)}</h2><p class="turn-role">${r.icon} ${h(r.name)} · ${h(r.sector)}</p><div class="dice-mini">${diceMarkup(animation.value,{rolling:animation.stage==='rolling'})}</div><p class="turn-meta">${animation.stage==='rolling'?'骰子正在翻滾…':`骰子停在 <strong>${animation.value}</strong>，棋子逐格前進中。`}</p><button class="primary" disabled>動作進行中…</button>`;
    return;
  }
  if(state.status!=='playing'){
    const winners=state.players.filter(x=>state.winnerIds.includes(x.id)).map(x=>x.name).join('、');
    const reason={stars:`率先拿下 ${state.starGoal||3} 顆星`,rounds:'到達季數上限',target:'率先達到總資產目標',survivor:'成為唯一倖存者'}[state.resultReason]||'對局結束';
    $('#turn-content').innerHTML=`<h2 class="turn-name">${h(state.ext?.finishTitle||'派對結束')}</h2><p class="turn-role">${h(reason)}</p><p class="turn-meta">勝出：<strong>${h(winners||'無')}</strong></p><div class="final-rank">${[...state.players].sort((a,b)=>b.stars-a.stars||b.cash-a.cash).map((x,i)=>`<div><span>${i+1}</span><strong>${h(x.name)}</strong><em>${x.stars}★ · ${money(x.cash)}</em></div>`).join('')}</div><button class="primary" data-action="open-settlement">查看遊戲結算</button><button class="secondary" data-action="new-game">創建新遊戲</button>`;
    return;
  }
  const canRoll=Boolean(state.ext?.debug)||state.phase==='roll',canEnd=['resolve','skipped'].includes(state.phase);
  const skill=r.skill,blocked=chips.some(c=>['限電禁技','凍結','冰封','弱者的領域','帳戶凍結'].some(x=>c.label.includes(x)));
  const acquireTargets=state.players.filter(x=>canAcquire(state,p,x));
  const canAct=['roll','resolve'].includes(state.phase);
  const forced=extForcedStarInfo(state);
  const tile=boardTile(state,p.position)||BOARD[p.position];
  const status=state.phase==='skipped'?'這回合被暫停，無法擲骰。':state.phase==='decision'?'請先完成二選一決策。':state.phase==='resolve'?`本回合已停在「${h(tile.label)}」格。`:'先使用道具、神話道具或技能，再擲骰前進。';
  const netNote=state.net?`<span class="net-turn-note">🌐 房間 ${h(state.net.roomCode)}${PartyNet.canAct(state)?' · 你的回合':' · 等待其他玩家'}</span>`:'';
  $('#turn-content').innerHTML=`<div class="turn-head"><div><h2 class="turn-name" style="color:${colors[p.color]}">${h(p.name)}</h2><p class="turn-role">${r.icon} ${h(r.name)} · ${h(r.sector)}</p></div><span class="position-label">第 ${p.position} 格</span></div><div class="mode-strip ${mode.id}"><span>${mode.icon} ${h(mode.name)}</span><small>${h(mode.win)}</small></div>${netNote}<div class="stat-strip"><div><span>💰 總資產</span><strong class="${p.cash<0?'negative':''}">${money(p.cash)}</strong></div><div><span>⭐ 星數</span><strong>${p.stars} <small>/ ${state.starGoal||3}</small></strong></div><div><span>⚡ 技能能量</span><strong>${p.energy}</strong></div></div>${chipMarkup(chips)}<p class="turn-meta">${h(status)}</p><div class="turn-actions"><button class="primary" data-action="roll" ${canRoll?'':'disabled'}>🎲 擲骰子</button>${forced?`<button class="secondary forced-star-btn" data-action="forced-buy-star" ${canAct?'':'disabled'}>🌟 強買星 · ${money(forced.cost)}</button>`:''}<button class="secondary skill-btn" data-action="skill" ${canRoll&&p.energy>0&&!blocked&&!p.ext?.eliminated?'':'disabled'} title="${h(skill.desc)}">${skill.icon} 發動技能 · ${h(skill.name)}</button>${acquireTargets.length?`<button class="secondary acquire-btn" data-action="acquire" ${canAct?'':'disabled'}>🤝 併購對手</button>`:''}${canRebel(p)?`<button class="secondary rebel-btn" data-action="rebel" ${canAct?'':'disabled'}>🕊️ 獨立反撲 · ${money(REBEL_COST)}</button>`:''}${state.ext?.debug?`<button class="secondary debug-end-turn" data-action="debug-end-turn">⏭️ 結束回合</button>`:''}</div><p class="skill-hint"><strong>${skill.icon} ${h(skill.name)}</strong>${h(skill.desc)}（消耗 1 能量）</p>${itemBarMarkup(p)}${canEnd?`<button class="primary end-turn" data-action="end-turn">${state.turnIndex===state.players.length-1?'結束回合，結算本季 →':'結束回合，交給下一位 →'}</button>`:''}`;
}
function renderPlayers(){
  $('#player-cards').innerHTML=state.players.map((p,index)=>{
    const r=p.ext?.ghostRole?{...role(p.roleId),name:'罷工團',icon:'👻',sector:'幽靈企業'}:role(p.roleId);
    const chips=statusChips(state,p),children=state.players.filter(x=>x.parentId===p.id);
    const turnState=state.status==='playing'?(index===state.turnIndex?'current':index<state.turnIndex?'played':'waiting'):'';
    const inventory=inventorySlots(p);
    const localClass=PartyNet.myPlayerId&&p.id===PartyNet.myPlayerId?'is-local':'';
    const cornerMarks=CORNER_PLAYER_MARKS.map(([color,label])=>`<span class="corner-player-mark ${color} ${p.marks?.[color]?'collected':''}" title="${CORNER_MARK_LABELS[color]}角落記號 ${p.marks?.[color]?'已取得':'未取得'}"><i></i>${label}</span>`).join('');
    return `<article class="player-card party-player-card ${turnState} ${localClass} ${p.ext?.eliminated?'eliminated':''}" style="--player-color:${p.ext?.eliminated?'#5f8ec4':colors[p.color]}" data-player-card="${h(p.id)}"><div class="player-card-head"><div class="player-identity"><span class="role-icon">${r.icon}</span><div><h3>${h(p.name)}</h3><small>${h(r.name)} · ${h(r.sector)}</small></div></div><span class="position-label">第 ${p.position} 格</span></div><div class="party-money"><div><span>💰 總資產</span><strong class="${p.cash<0?'negative':''}">${money(p.cash)}</strong></div><div><span>⭐ 星數</span><strong>${p.stars} / ${state.starGoal||3}</strong>${starTrack(p.stars)}</div><div><span>⚡ 能量</span><strong>${p.energy}</strong></div></div><div class="corner-player-marks" aria-label="四角記號"><small>四角記號</small>${cornerMarks}</div>${chipMarkup(chips)}${p.parentId?`<p class="subsidiary-note">🏢 子公司，每回合收益 40% 上繳 ${h(state.players.find(x=>x.id===p.parentId)?.name||'母公司')}${p.cash>=REBEL_COST?' · 可獨立反撲':''}</p>`:''}${children.length?`<p class="subsidiary-note parent">👑 母公司：${children.map(x=>h(x.name)).join('、')}</p>`:''}<div class="player-items">${Array.from({length:3},(_,i)=>{const slot=inventory[i];return `<span class="mini-item ${slot?(slot.kind==='mythic'?'mythic filled':slot.kind==='special'?'special filled':'filled'):''}" title="${slot?h(slot.meta.desc):'空欄位'}">${slot?slot.meta.icon:'·'}</span>`}).join('')}<small>${inventory.length}/3 道具</small></div></article>`;
  }).join('');
}
function renderGoals(){
  const mode=extModeInfo(state),ext=state.ext||{};
  let copy=mode.win;
  if(mode.id==='star')copy=`出發格買星，初始 ${money(extStarPrice(state))}，每賣出 1 顆全場 +500。率先 ${state.starGoal||3} 星獲勝；季末比較星數 → 總資產。`;
  if(mode.id==='tycoon')copy=`率先達到 ${money(ext.targetAssets??ext.target??0)} 總資產獲勝。第 ${Math.ceil(state.maxRounds/2)+1} 季起通膨 2 倍，倒數兩季通膨 4 倍。`;
  if(mode.id==='evil')copy=`每 ${ext.doomEvery||5} 季毀滅日收保護費，起步 ${money(ext.doomPrice||1000)}。付不出來就變成罷工團幽靈，最後存活者獲勝。`;
  $('#goal-copy').textContent=copy;
  $('#goal-progress').innerHTML=state.players.map(p=>`<div class="goal-person ${p.ext?.eliminated?'eliminated':''}"><span>${p.ext?.eliminated?'👻 ':''}${h(p.name)}</span><span>${starTrack(p.stars)} <em>${money(p.cash)}</em></span></div>`).join('');
}
function renderLog(){
  $('#party-log').innerHTML=state.log.length?state.log.slice(0,12).map((x,i)=>`<div class="log-item ${i===0?'latest':''}">${h(x)}</div>`).join(''):'<div class="log-item">等待玩家擲骰。</div>';
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function moveTokenStep(position){
  animation?.visited.add(position);
  const token=$('#board .token.moving'),destination=$(`#board [data-tile-index="${position}"] .tile-tokens`);
  if(!token||!destination||tab!=='board'||page!=='game')return;
  const from=token.getBoundingClientRect();
  $('#board .tile-active')?.classList.remove('tile-active');
  destination.closest('.tile').classList.add('tile-active','tile-visited');
  destination.appendChild(token);
  const to=token.getBoundingClientRect();
  token.style.transition='none';
  token.style.transform=`translate(${from.left-to.left}px, ${from.top-to.top}px)`;
  token.getBoundingClientRect();
  requestAnimationFrame(()=>{
    if(!token.isConnected)return;
    token.style.transition=`transform ${MOVE_MS-70}ms linear`;
    token.style.transform='translate(0,0)';
  });
}
function beginRollAnimation(roll,from,playerId,interactive=true,onDone=null){
  if(!state||!roll||state.players[state.turnIndex]?.id!==playerId)return false;
  if(document.hidden||tab!=='board'||page!=='game')return false;
  cancelAnimation();
  const serial=animationSerial;
  const path=Array.isArray(roll.path)&&roll.path.length?roll.path:[roll.tileIndex];
  animation={stage:'rolling',playerId,position:Number.isInteger(from)?from:roll.from,value:roll.value,path,visited:new Set(),roll};
  render();
  void (async()=>{
    await pause(1300);
    if(serial!==animationSerial)return;
    // 骰子完全停定後才公布點數，避免右下角提示提前暴雷。
    if(interactive)notify(`擲出 ${animation.value} 點`);
    animation.stage='moving';render();
    for(const position of path){
      if(serial!==animationSerial)return;
      if(position!==animation.position){animation.position=position;moveTokenStep(position);await pause(MOVE_MS)}
    }
    if(serial!==animationSerial)return;
    await pause(260);
    if(serial!==animationSerial)return;
    animation=null;render();
    if(serial!==animationSerial)return;
    try{onDone?.()}catch(e){console.error(e)}
  })();
  return true;
}
function finishLanding(before,interactive=true){
  if(!state)return null;
  let roll=null;
  // 互動流程先只標記矢量鎖定，等 UI 預警 0.5 秒後再真正傳送與結算格子效果。
  try{roll=resolveLanding(state,{deferVector:true})}catch(e){console.error(e);notify(e.message||'落地效果處理失敗。')}
  if(!roll)return null;
  save();render();
  if(roll.struck&&state.ext?.lastEvent?.type==='ghostStrike'){
    PartyNet.broadcastEvent({type:'GHOST_ATTACK',target:roll.playerId,enraged:Boolean(state.ext.lastEvent.enraged)});
  }
  if(before)animateCashChanges(before);
  if(interactive&&state.pendingDecision&&!state.ext?.vectorPending)notify('棋子已停穩，請做出二選一決策。');
  return roll;
}
async function rollWithAnimation(authoritative=false){
  if(PartyNet.isClient){
    PartyNet.sendAction({type:'ROLL_DICE',playerId:PartyNet.myPlayerId});
    return;
  }
  if(PartyNet.isHost&&state?.net&&!authoritative){
    const owner=state.net.owners?.[activePlayer()?.id];
    if(owner!==PartyNet.peerId){notify('現在不是房主的回合，已等待玩家擲骰。');return}
  }
  if(animation)return;
  if(state?.ext?.vectorPending){notify('矢量操作鎖定中，請稍候。');return}
  if(state?.net&&!PartyNet.canAct(state)&&!authoritative){notify('現在不是你的回合。');return}
  if(state?.ext?.debug&&!['roll'].includes(state.phase)){state.phase='roll';state.pendingDecision=null;}
  let result=null,from=null,playerId=null,before=null;
  try{
    await withGameLock(()=>{
      if(!ensureFresh())return;
      const p=activePlayer();from=p.position;playerId=p.id;before=cashSnapshot();
      result=rollDie(state,undefined,{defer:true});save();
    });
    if(!result)return;
    SoundManager.play('dice');
    const started=beginRollAnimation(result,from,playerId,true,()=>finishLanding(before,true));
    if(!started){notify(`擲出 ${result.value} 點`);finishLanding(before,true);}
  }catch(e){SoundManager.play('error');notify(e.message||'無法擲骰')}
}
// 命運骰子：消耗特殊道具後，以玩家自選的 1–6 點強制移動。
async function fateDiceRoll(value,authoritative=false){
  if(PartyNet.isClient){PartyNet.sendAction({type:'FATE_DICE',value,playerId:PartyNet.myPlayerId});return}
  if(animation)return;
  const step=Number(value);
  if(!Number.isInteger(step)||step<1||step>6){notify('請選擇 1–6 的點數。');return}
  if(state?.ext?.vectorPending){notify('矢量操作鎖定中，請稍候。');return}
  if(state?.net&&!PartyNet.canAct(state)&&!authoritative){notify('現在不是你的回合。');return}
  let result=null,from=null,playerId=null,before=null;
  try{
    await withGameLock(()=>{
      if(!ensureFresh())return;
      const p=activePlayer();from=p.position;playerId=p.id;before=cashSnapshot();
      const forced=extUseFateDice(state,step);
      result=rollDie(state,forced,{defer:true});save();
    });
    if(!result)return;
    SoundManager.play('dice');
    const started=beginRollAnimation(result,from,playerId,true,()=>finishLanding(before,true));
    if(!started){notify(`命運骰子強制 ${result.value} 點`);finishLanding(before,true);}
  }catch(e){SoundManager.play('error');notify(e.message||'命運骰子無法使用')}
}

function closeModal(){modal=null;$('#party-modal').hidden=true}
function openTarget(action,itemId=null){
  if(state?.pendingDecision)return;
  if(state?.net&&PartyNet.active&&!PartyNet.canAct(state)){notify('現在不是你的回合，請等待其他玩家。');return}
  modal={kind:'target',action,itemId};renderModal();
}
function targetOptions(){
  const p=activePlayer();
  if(modal.action==='skill'){
    return state.players.filter(x=>x.id!==p.id&&!x.ext?.eliminated).map(x=>{const r=role(x.roleId);return {id:x.id,label:x.name,icon:r.icon,desc:`${r.name} · ${x.stars}★ · ${money(x.cash)} 總資產`}});
  }
  if(modal.action==='item'){
    return state.players.filter(x=>x.id!==p.id).map(x=>({id:x.id,label:x.name,icon:role(x.roleId).icon,desc:`第 ${x.position} 格 · ${x.stars}★ · ${money(x.cash)} 總資產`}));
  }
  if(modal.action==='acquire'){
    return state.players.filter(x=>canAcquire(state,p,x)).map(x=>{const cost=p.cash<0&&x.cash<0?0:x.cash<0?ACQUIRE_DISCOUNT_COST:ACQUIRE_COST;return {id:x.id,label:x.name,icon:role(x.roleId).icon,desc:`併購價 ${money(cost)} · 目標總資產 ${money(x.cash)}`}});
  }
  return [];
}
function renderModal(){
  const el=$('#party-modal');
  if(page!=='game'||!state){el.hidden=true;return}
  if(state.net&&PartyNet.active){
    const decisionOwner=state.pendingDecision?.playerId;
    if(!PartyNet.canAct(state)||(decisionOwner&&decisionOwner!==PartyNet.myPlayerId)){
      modal=null;el.hidden=true;return;
    }
  }
  if(state.pendingDecision&&!animation){
    if(state.ext?.debug||PartyUI.decisionBlocked?.(state)){modal=null;el.hidden=true;return}
    const p=state.players.find(x=>x.id===state.pendingDecision.playerId)||activePlayer();
    el.dataset.locked='true';$('#modal-close').hidden=true;$('#modal-icon').textContent=state.pendingDecision.icon||'🤔';$('#modal-kicker').textContent=`DECISION · 第 ${state.round} 季 · ${p.name}`;$('#modal-title').textContent=state.pendingDecision.title?`快速決策：${state.pendingDecision.title}`:'快速決策：二選一';$('#modal-text').textContent=state.pendingDecision.text||'踩格後的老闆時間。選一個立刻生效，沒有回頭路。';
    $('#modal-body').innerHTML=`<div class="decision-list">${state.pendingDecision.options.filter(o=>!o.hidden).map(o=>`<button type="button" class="decision-option" data-decision="${o.id}" ${o.available===false?'disabled':''}><span class="decision-icon">${o.icon}</span><div><strong>${h(o.label)}</strong><span>${h(o.desc)}</span></div><em>${o.cash>0?'+':''}${o.cash||0} 總資產 · ${o.energy>0?'+':''}${o.energy||0} 能量</em></button>`).join('')}</div>`;
    $('#modal-actions').innerHTML='<p class="modal-note">決策完成後才能結束回合。</p>';
    el.hidden=false;return;
  }
  if(modal?.kind==='target'){
    const p=activePlayer(),options=targetOptions();
    const titles={skill:`發動技能 · ${role(p.roleId).skill.name}`,item:`使用道具 · ${item(modal.itemId)?.name||''}`,acquire:'惡意併購 · 選擇目標'};
    const texts={skill:'選擇要干擾的對象。技能消耗 1 點能量。',item:'選擇要交換位置的對手，雙方會立刻觸發落地格效果。',acquire:'選擇一家公司發動併購。目標會成為你的子公司，每回合上繳 40% 收益。'};
    el.dataset.locked='false';$('#modal-close').hidden=false;$('#modal-icon').textContent=modal.action==='acquire'?'🤝':modal.action==='item'?'🔄':role(p.roleId).skill.icon;$('#modal-kicker').textContent=`TARGET · 第 ${state.round} 季`;$('#modal-title').textContent=titles[modal.action];$('#modal-text').textContent=texts[modal.action];
    $('#modal-body').innerHTML=`<div class="target-list">${options.length?options.map(o=>`<button type="button" class="target-option" data-target-action="${modal.action}" data-target-id="${h(o.id)}" ${o.sector?`data-target-sector="${h(o.sector)}"`:''} data-item-id="${modal.itemId||''}"><span>${o.icon}</span><div><strong>${h(o.label)}</strong><small>${h(o.desc)}</small></div><i>→</i></button>`).join(''):'<div class="empty-state">目前沒有可選目標。</div>'}</div>`;
    $('#modal-actions').innerHTML='<button type="button" class="secondary" data-close-modal>取消</button>';
    el.hidden=false;return;
  }
  el.hidden=true;
}
function render(){
  const onHome=page==='home';
  if(!state||onHome){try{PartyUI.clearTurnLock?.()}catch{}}
  $('#round-badge').hidden=onHome||!state;
  $('#home').hidden=!onHome;
  $('#home-btn').classList.toggle('active',onHome);
  if(onHome){$('#setup').hidden=true;$('#game').hidden=true;closeModal();$('#home-play-btn').textContent=state?'返回對局 →':'設定玩家，開始派對 →';$('#home-status').textContent=state?`已有對局 · 第 ${state.round} 季，返回後可繼續遊玩。`:'一台電腦就能開始，大家輪流操作。';return}
  if(!state){$('#setup').hidden=false;$('#game').hidden=true;closeModal();renderSetup();return}
  $('#setup').hidden=true;$('#game').hidden=false;
  $('#round-number').textContent=String(state.round).padStart(2,'0');$('#round-limit').textContent=`／${state.maxRounds} 季`;
  const finalSeason=state.round>=state.maxRounds;
  $('#round-badge').classList.toggle('final-season',finalSeason);
  $('#round-badge').title=finalSeason?'最終季！':'目前季數';
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.tab-page').forEach(p=>p.classList.toggle('active',p.id===`tab-${tab}`));
  renderBoard();renderTurn();renderGoals();renderPlayers();renderLog();renderModal();
  try{PartyUI.afterRender(state);}catch(e){console.error(e)}
}

$('#add-player').addEventListener('click',()=>{if(setupPlayers.length<8){const used=new Set(setupPlayers.map(x=>x.roleId));let number=1;while(setupPlayers.some(x=>x.name===`玩家 ${number}`))number++;const free=PARTY_ROLES.find(x=>!used.has(x.id));setupPlayers.push({name:`玩家 ${number}`,roleId:free?free.id:'random'});renderSetup()}});
$('#setup-players').addEventListener('input',e=>{if(e.target.dataset.setupName!==undefined)setupPlayers[Number(e.target.dataset.setupName)].name=e.target.value});
$('#setup-players').addEventListener('change',e=>{if(e.target.dataset.setupRole!==undefined)setupPlayers[Number(e.target.dataset.setupRole)].roleId=e.target.value});
$('#setup-players').addEventListener('click',e=>{const i=e.target.dataset.removePlayer;if(i!==undefined&&setupPlayers.length>2){setupPlayers.splice(Number(i),1);renderSetup()}});
async function startGameFromConfig(config){
  const seed=Number(config.seed)||Date.now();
  const resolved=extResolveRoles(config.players,seed);
  const startingCash=Number.isFinite(Number(config.startingCash))&&Number(config.startingCash)>=0?Math.round(Number(config.startingCash)):2000;
  const next=createGame({players:resolved,maxRounds:config.rounds||10,seed,startingCash});
  if(config.net)next.net=config.net;
  extInitGame(next,{mode:config.mode||'star',debug:Boolean(config.debug),target:config.target,rounds:config.rounds,starGoal:config.starGoal,doomEvery:config.doomEvery,doomPrice:config.doomPrice,doomStep:config.doomStep,startingCash});
  prepareNewSession(next);
  state=next;page='game';tab='board';rememberView();
  mapPick=null;document.body.classList.remove('map-pick-mode');
  $('#setup-error').textContent='';
  save();render();
  try{PartyUI.onGameStart(state,{fromLobby:Boolean(config.net)});}catch(e){console.error(e)}
  return next;
}
window.__partyStartGame=startGameFromConfig;
$('#start-btn').addEventListener('click',async()=>{
  try{
    await withGameLock(()=>{
      const saved=readStored();
      if(saved&&PartyNet.active){/* 房間對局由房主統一開始，不採用本機舊存檔 */}
      else if(saved&&state){adoptShared(saved);notify('已加入另一個頁籤的對局。');return}
      else if(saved&&!confirm('偵測到本機舊存檔。按「確定」延續舊對局，按「取消」建立全新對局。')){adoptShared(saved);notify('已載入本機存檔。');return}
      const mode=document.querySelector('#mode-select')?.value||setupMode||'star';
      const debug=Boolean(document.querySelector('#debug-mode')?.checked);
      const config={players:setupPlayers.map(p=>({...p})),mode,debug,
        rounds:Number($('#rounds-input')?.value)||10,
        target:Number($('#target-input')?.value)||0,
        starGoal:Number($('#star-goal-input')?.value)||3,
        doomEvery:Number($('#doom-every-input')?.value)||5,
        doomPrice:Number($('#doom-price-input')?.value)||1000,
        doomStep:Number($('#doom-step-input')?.value)||500,
        startingCash:Number($('#starting-cash-input')?.value)};
      void startGameFromConfig(config);
    });
  }catch(e){$('#setup-error').textContent=e.message;SoundManager.play('error')}
});
$('#game').addEventListener('click',e=>{
  if(e.target.closest('[data-dismiss-investment]')){dismissInvestmentSettlement();return}
  if(state?.net&&PartyNet.active&&!PartyNet.canAct(state)&&!e.target.closest('[data-action="new-game"],[data-action="open-settlement"]')){
    notify('現在不是你的回合，請等待其他玩家。');return;
  }
  const normalItem=e.target.closest('[data-item-id]');
  if(mapPick){
    const mapTile=e.target.closest('#board [data-tile-index]');
    if(mapTile){
      const index=Number(mapTile.dataset.tileIndex);
      const callback=mapPick.callback;
      mapPick=null;
      document.body.classList.remove('map-pick-mode');
      if(callback)callback(index);
      return;
    }
  }
  if(normalItem&&state&&!animation){
    const id=normalItem.dataset.itemId;
    if(id==='swap')openTarget('item',id);else runAction({type:'USE_ITEM',itemId:id},()=>{useItem(state,id);SoundManager.play('coin');notify('道具已使用。')});
    return;
  }
  const specialBtn=e.target.closest('[data-special-id]');
  if(specialBtn&&state&&!animation){
    const id=specialBtn.dataset.specialId;
    if(id==='fateDice'){PartyUI.openFateDice();}
    return;
  }
  const mythicBtn=e.target.closest('[data-mythic-id]');
  if(mythicBtn&&state&&!animation){
    const id=mythicBtn.dataset.mythicId;
    if(id==='vector'){beginMapPick('矢量操作：請直接點擊地圖上要設置的格子（Esc 取消）。',index=>runAction({type:'USE_MYTHIC',id,payload:{tileIndex:index}},()=>{extUseMythic(state,'vector',{tileIndex:index});SoundManager.play('whoosh');notify('矢量操作已鎖定目標格。')}));}
    else if(id==='truthGate'){PartyUI.openTruthGate();}
    else runAction({type:'USE_MYTHIC',id},()=>{extUseMythic(state,id);if(id!=='iceMushroom')SoundManager.play('whoosh');notify('神話道具已發動！')});
    return;
  }
  const discard=e.target.closest('[data-discard-index]');
  if(discard&&state&&!animation){
    const kind=discard.dataset.discardKind,index=Number(discard.dataset.discardIndex);
    const p=activePlayer();
    const entry=kind==='mythic'?p.mythics?.[index]:null;
    const name=kind==='mythic'?(MYTHIC_BY_ID[entry?.id]?.name||'神話道具'):kind==='special'?(SPECIAL_ITEM_BY_ID[p.specials?.[index]]?.name||'特殊道具'):(item(p.items[index])?.name||'道具');
    if(confirm(`確定丟棄「${name}」？`))runAction({type:'DISCARD',kind,index},()=>{extDiscard(state,p,kind,index);notify('已丟棄道具。')});
    return;
  }
  const a=e.target.closest('[data-action]');if(!a||!state)return;
  const action=a.dataset.action,p=activePlayer();
  if(action==='new-game'){
    if(PartyNet.active){const ratio=PartyNet.confirmResult(PartyNet.myPlayerId);if(ratio)PartyUI.updateConfirm?.(ratio);else notify('已送出再玩一局確認，等待其他玩家。');return}
    void resetGame();return;
  }
  if(action==='open-settlement'){PartyUI.openSettlement(state);return}
  if(action==='roll'){void rollWithAnimation();return}
  if(animation)return;
  if(action==='buy-star'){runAction({type:'BUY_STAR'},()=>{const stars=extBuyStar(state);SoundManager.play('star');notify(`買到第 ${stars} 顆星！`)});return}
  if(action==='forced-buy-star'){
    const info=extForcedStarInfo(state);
    if(info&&confirm(`支付 ${money(info.cost)} 強制買走對方 1 顆星？`))runAction({type:'FORCE_BUY_STAR',targetId:info.targetId},()=>{extForcedBuyStar(state,info.targetId);SoundManager.play('star');notify('強買星星成功！')});
    return;
  }
  if(action==='skill'){
    const skill=role(p.roleId).skill;
    if(skill.target==='tile'){
      PartyUI.openTilePicker({title:`${skill.name} · 選擇格子`,text:'出發格除外，選擇要放置罷工幽靈的位置。',excludeStart:true},index=>runAction({type:'USE_SKILL',tileIndex:index},()=>{extUseSkill(state,null,index);notify('幽靈已派單！')}));
    }else if(skill.target==='none')runAction({type:'USE_SKILL'},()=>{extUseSkill(state);notify(`${skill.name} 已發動！`)});
    else openTarget('skill');
    return;
  }
  if(action==='acquire'){openTarget('acquire');return}
  if(action==='rebel'){runAction({type:'REBEL'},()=>{rebel(state);notify('獨立反撲成功，你已脫離母公司！')});return}
  if(action==='end-turn'){
    runAction({type:'END_TURN'},()=>{
      const result=endTurn(state);
      if(result){notify(result.finished?'對局結束，正在播放結算動畫…':result.suddenDeath?'第一名平手，驟死賽啟動！':`第 ${result.round} 季已結算。`);if(!result.finished)SoundManager.play('slide');}
    });
    return;
  }
  if(action==='debug-end-turn'){
    runAction({type:'DEBUG_END_TURN'},()=>{
      const result=extDebugEndTurn(state);
      if(result){notify(result.finished?'對局結束，正在播放結算動畫…':result.suddenDeath?'第一名平手，驟死賽啟動！':`測試模式：已切換到第 ${state.round} 季。`);if(!result.finished)SoundManager.play('slide');}
      else notify('測試模式：已結束目前回合。');
    });
    return;
  }
});
$('#party-modal').addEventListener('click',e=>{
  const decision=e.target.closest('[data-decision]');
  if(decision){runAction({type:'DECISION',optionId:decision.dataset.decision},()=>{chooseDecision(state,decision.dataset.decision);modal=null;notify('決策已生效。')});return}
  const target=e.target.closest('[data-target-action]');
  if(target){
    const action=target.dataset.targetAction,targetId=target.dataset.targetId,sector=target.dataset.targetSector,itemId=modal?.itemId;
    modal=null;renderModal();
    runAction({type:'TARGET_ACTION',action,targetId,sector,itemId},()=>{
      if(action==='skill'){extUseSkill(state,targetId||undefined,sector||undefined);notify('企業技能已發動！')}
      else if(action==='item'){useItem(state,itemId,targetId);notify('移形換位完成，雙方已觸發落地效果！')}
      else if(action==='acquire'){const result=acquireTarget(state,targetId);notify(`併購完成，支付 ${money(result.cost)} 總資產。`)}
    });
    return;
  }
  if(e.target.closest('[data-close-modal]')){
    if(state?.pendingDecision&&!animation){notify('請先完成二選一決策。');return}
    closeModal();renderModal();
  }
});
$('.tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;tab=b.dataset.tab;rememberView();render();window.scrollTo({top:0,behavior:'smooth'})});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(cancelMapPick())return;if(!state?.pendingDecision)closeModal()}});
async function resetGame(){
  if(PartyNet.active){
    if(!confirm('要離開目前房間並開始新遊戲嗎？'))return;
    PartyNet.leave();
    PartyUI.hideLobby?.();
  }
  if(state&&!confirm('確定開始新遊戲？所有已開啟的頁籤都會返回設定畫面，建議先匯出備份。'))return;
  await withGameLock(()=>{const stored=readStored();if(stored&&isNewerGame(stored,state))state=stored;clearSave();cancelAnimation();closeModal();state=null;page='game';tab='board';rememberView();render()});
}
function returnToLobby(lobby){
  cancelAnimation();closeModal();state=null;page='game';tab='board';rememberView();
  try{localStorage.removeItem(storageKey)}catch{}
  render();
  PartyUI.showLobby?.(lobby||PartyNet.lobby);
}
$('#home-btn').addEventListener('click',()=>{page='home';closeModal();render();window.scrollTo({top:0,behavior:'smooth'})});
$('#home-play-btn').addEventListener('click',()=>{page='game';render();window.scrollTo({top:0,behavior:'smooth'})});
$('#new-game-btn').addEventListener('click',()=>{void resetGame()});
$('#open-tab-btn').addEventListener('click',()=>{window.open(location.href,'_blank','noopener')});
$('#export-btn').addEventListener('click',()=>{if(!state){notify('目前沒有可匯出的對局。');return}const blob=new Blob([exportGame(state)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`經濟棋局-派對-第${state.round}季.json`;a.click();URL.revokeObjectURL(url)});
$('#import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(PartyNet.isClient){notify('多人房間由房主管理狀態，客機不能匯入存檔。');e.target.value='';return}try{const imported=extEnsureState(importGame(await file.text()));await withGameLock(()=>{const stored=readStored();if(stored&&isNewerGame(stored,state))state=stored;prepareNewSession(imported);cancelAnimation();state=imported;page='game';tab='board';rememberView();save();render()});notify('存檔已載入，其他頁籤也已更新。')}catch(err){notify(err.message||'無法讀取存檔')}e.target.value=''});
window.addEventListener('storage',e=>{
  if(PartyNet.active)return;
  if(e.key!==storageKey)return;
  if(e.newValue){try{adoptShared(importGame(e.newValue))}catch{}}
  else{const saved=readStored();if(saved)adoptShared(saved);else if(saved===null){resetAt=Math.max(resetAt,Date.now());cancelAnimation();closeModal();state=null;render()}}
});
if(channel)channel.onmessage=e=>{
  if(PartyNet.active)return;
  const message=e.data;if(!message||message.writerId===tabId)return;
  if(message.type==='state'){try{adoptShared(importGame(JSON.stringify(message.game)))}catch{}}
  if(message.type==='reset'&&(!state||message.updatedAt>=syncInfo(state).updatedAt)){resetAt=Math.max(resetAt,message.updatedAt);cancelAnimation();closeModal();state=null;render()}
};
function syncOnFocus(){if(PartyNet.active)return;const saved=readStored();if(saved)adoptShared(saved);else if(saved===null&&state){cancelAnimation();closeModal();state=null;render()}}
window.addEventListener('focus',syncOnFocus);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncOnFocus()});
// ---- 多人房間整合 ---------------------------------------------------------
PartyNet.onLobby = lobby => {
  try{
    PartyUI.showLobby?.(lobby);
    if(lobby?.confirmRatio)PartyUI.updateConfirm?.(lobby.confirmRatio);
    else if(lobby&&!lobby.confirms?.length)PartyUI.updateConfirm?.({confirmed:0,total:lobby.players?.length||0});
  }catch(e){console.error(e)}
};
PartyNet.onStart = config => {
  if(PartyNet.isHost)void startGameFromConfig(config);
  else $('#save-status').textContent='房主正在初始化棋盤…';
};
PartyNet.onState = (game,fromPeer) => {
  try{
    const incoming=extEnsureState(importGame(game));
    const sameRoom=state?.net?.roomCode===PartyNet.code&&state?.net?.hostId===PartyNet.hostId;
    if(incoming.net?.roomCode===PartyNet.code&&incoming.net?.hostId===PartyNet.hostId&&(!sameRoom||isNewerGame(incoming,state))){
      const moving=incoming.status==='playing'&&incoming.phase==='moving'&&incoming.lastRoll?.value>0;
      const from=moving?incoming.lastRoll.from:null;
      const before=cashSnapshot();
      const starting=incoming.status==='playing'&&(!sameRoom||state?.status!=='playing');
      cancelAnimation();
      if(starting){page='game';tab='board';rememberView();PartyUI.hideLobby?.()}
      state=incoming;render();
      if(starting&&!PartyNet.isHost)PartyUI.onGameStart?.(state,{fromLobby:true});
      if(before)animateCashChanges(before);
      if(moving)beginRollAnimation(incoming.lastRoll,from,incoming.lastRoll.playerId,false);
      $('#save-status').textContent='房間狀態已同步';
    }
  }catch(e){console.warn('room state rejected',e)}
};
PartyNet.onAction = (action,fromPeer) => {
  if(!PartyNet.isHost||!state?.net||!action?.type||animation)return;
  const pendingOwners={
    DECISION:state.pendingDecision?.playerId,
    STAR_OFFER:state.ext?.starOffer?.playerId,
    CLEAR_EVENT_PROMPT:state.ext?.eventPrompt?.playerId,
    REPLACE_ITEM:state.ext?.replaceOffer?.playerId,
    AUCTION_ACTION:window.__partyEngine?.extAuctionCurrent?.(state)?.id,
    INVEST:state.ext?.investOffer?.playerId,
    TAX:state.ext?.taxChoice?.playerId,
    INSIDER:state.ext?.insiderOffer?.playerId
  };
  const actorId=pendingOwners[action.type]||activePlayer()?.id;
  if(action.playerId!==actorId||state.net.owners?.[actorId]!==fromPeer)return;
  if(state.ext?.vectorPending&&action.type!=='CLEAR_EVENT_PROMPT')return;
  const execute=(fn,options={})=>{void run(fn,{...options,authoritative:true})};
  switch(action.type){
    case 'ROLL_DICE':
      if(state.phase==='roll')void rollWithAnimation(true);
      return;
    case 'FATE_DICE':
      void fateDiceRoll(action.value,true);return;
    case 'USE_ITEM':
      execute(()=>useItem(state,action.itemId,action.targetId));return;
    case 'USE_MYTHIC':
      execute(()=>extUseMythic(state,action.id,action.payload));return;
    case 'DISCARD':
      execute(()=>extDiscard(state,activePlayer(),action.kind,action.index));return;
    case 'BUY_STAR':
      execute(()=>extBuyStar(state));return;
    case 'FORCE_BUY_STAR':
      execute(()=>extForcedBuyStar(state,action.targetId));return;
    case 'USE_SKILL':
      execute(()=>extUseSkill(state,action.targetId||undefined,action.tileIndex),{afterCommit:()=>dispatchSkillCue(actorId)});return;
    case 'TARGET_ACTION':
      execute(()=>{
        if(action.action==='skill')extUseSkill(state,action.targetId||undefined,action.sector||undefined);
        else if(action.action==='item')useItem(state,action.itemId,action.targetId);
        else if(action.action==='acquire')acquireTarget(state,action.targetId);
      },{afterCommit:action.action==='skill'?()=>dispatchSkillCue(actorId):undefined});return;
    case 'REBEL':
      execute(()=>rebel(state));return;
    case 'END_TURN':
      execute(()=>endTurn(state));return;
    case 'DEBUG_END_TURN':
      execute(()=>extDebugEndTurn(state));return;
    case 'DECISION':
      execute(()=>chooseDecision(state,action.optionId));return;
    case 'CLEAR_EVENT_PROMPT':
      execute(()=>window.__partyEngine?.extClearEventPrompt?.(state));return;
    case 'STAR_OFFER':
      execute(()=>action.buy?extBuyStar(state):extSkipStarOffer(state));return;
    case 'REPLACE_ITEM':
      execute(()=>extResolveReplace(state,action.dropNew?{dropNew:true}:{kind:action.kind,index:action.index}));return;
    case 'AUCTION_ACTION':
      execute(()=>extAuctionAction(state,action.action),{allowAuction:true});return;
    case 'INVEST':
      execute(()=>extInvest(state,Boolean(action.yes)));return;
    case 'TAX':
      execute(()=>action.action==='pay'?extTaxPay(state):extTaxDetain(state));return;
    case 'INSIDER':
      execute(()=>action.yes?extInsiderPay(state):state.ext.insiderOffer=null);return;
    case 'TRUTH_GATE':
      execute(()=>extUseMythic(state,'truthGate',action.payload));return;
    case 'DEBUG_GIVE':
      execute(()=>extDebugGive(state,action.kind,action.id));return;
    case 'DEBUG_TELEPORT':
      execute(()=>extDebugTeleport(state,action.targetId,action.tileIndex));return;
    case 'DEBUG_GHOST':
      execute(()=>extDebugGhostTo(state,action.tileIndex));return;
  }
};
PartyNet.onEvent = event => {
  if(event?.type==='GHOST_ATTACK')PartyUI.playGhostInterference?.(event);
  if(event?.type==='SKILL_TRIGGERED')PartyUI.playSkillCue?.(event);
};
PartyNet.onReturnLobby = lobby => { PartyUI.hideSettlement?.();returnToLobby(lobby); };
PartyNet.onStatus = text => { const el=$('#save-status');if(el)el.textContent=text; };
PartyNet.onError = text => notify(text);

window.PartyApp={
  get state(){return state},
  get page(){return page},
  get tab(){return tab},
  get animation(){return animation},
  isAnimating:()=>Boolean(animation),
  isMapPicking:()=>Boolean(mapPick),
  cancelMapPick,
  run, runAction, render, notify, save, startGameFromConfig, returnToLobby, resetGame, dismissInvestmentSettlement, visibleInvestmentSettlement,
  activePlayer, openTarget, closeModal, PartyNet, SoundManager, resolveLanding,
  cashSnapshot, animateCashChanges,
  buyStar:()=>runAction({type:'BUY_STAR'},()=>extBuyStar(state)),
  useMythic:(id,payload)=>runAction({type:'USE_MYTHIC',id,payload},()=>extUseMythic(state,id,payload)),
  discard:(kind,index)=>runAction({type:'DISCARD',kind,index},()=>extDiscard(state,activePlayer(),kind,index)),
  debugGive:(kind,id)=>runAction({type:'DEBUG_GIVE',kind,id},()=>{const result=extDebugGive(state,kind,id);notify(result?.pendingReplace?'道具欄已滿，請選擇替換或丟棄。':'已獲得道具。')}),
  debugTeleport:(pid,tile)=>runAction({type:'DEBUG_TELEPORT',targetId:pid,tileIndex:tile},()=>{extDebugTeleport(state,pid,tile);notify('已傳送玩家。')}),
  debugGhostTo:(tile)=>runAction({type:'DEBUG_GHOST',tileIndex:tile},()=>{extDebugGhostTo(state,tile);notify('已移動幽靈。')}),
  debugEndTurn:()=>runAction({type:'DEBUG_END_TURN'},()=>{
    const result=extDebugEndTurn(state);
    if(result)notify(result.finished?'對局結束，正在播放結算動畫…':result.suddenDeath?'第一名平手，驟死賽啟動！':`第 ${result.round} 季已結算。`);
    else notify('測試模式：已結束目前回合。');
  }),
  spinWheel:()=>PartyUI.openWheel(),
  fateDiceRoll,
  openSettlement:()=>PartyUI.openSettlement(state)
};

const savedAtStart=readStored();
if(savedAtStart){
  state=savedAtStart;extEnsureState(state);
  if(state.status==='playing'&&state.phase==='moving'){
    // 重新載入或從背景返回時，避免停在「移動中」而卡住整場對局。
    const roll=resolveLanding(state);
    if(!roll){state.phase='resolve';state.pendingLanding=null}
    save();
  }
}
renderHomeRoles();renderRules();render();PartyUI.init?.();
