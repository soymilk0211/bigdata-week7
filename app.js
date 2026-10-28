import {ITEMS,BOARD,SECTORS,STAR_COST,STAR_GOAL,ACQUIRE_COST,ACQUIRE_DISCOUNT_COST,REBEL_COST} from './data.js';
import {PARTY_ROLES,GAME_MODES,MODE_IDS,LOBBY_ROLES,MYTHIC_ITEMS,MYTHIC_BY_ID,QUICK_DECISIONS,SPECIAL_TILE_META,SPECIAL_ITEM_BY_ID,RANDOM_ROLE_ID,WHEEL_EFFECTS} from './party_data.js';
import {createGame,rollDie,resolveLanding,chooseDecision,useItem,acquireTarget,rebel,endTurn,statusChips,canAcquire,canRebel,exportGame,importGame,boardOf,startTurn,CORNER_MARKS} from './engine.js';
import {
  extInitGame,extResolveRoles,extUseSkill,extBuyStar,extCanBuyStar,extForcedStarInfo,extForcedBuyStar,
  extUseMythic,extDiscard,extAddMythic,extAddItem,extModeInfo,extRoleOf,extStatusChips,extStarPrice,
  extSettlementData,extDebugGive,extDebugTeleport,extDebugGhostTo,extDebugRollAgain,extDebugEndTurn,extCheckWin,
  extSkipStarOffer,extResolveReplace,
  extInsiderPay,extAuctionAction,extAuctionCurrent,extAuctionFinish,extInvest,extTaxPay,extTaxDetain,
  extSpinWheel,extTriggerDoom,extRefreshInflation,extRecordRound,extEnsureState,
  extPrepareWheel,extResolveWheel,extClearEventPrompt,extResolveVectorPending,extUseFateDice
} from './party_engine.js';
import {syncInfo,isNewerGame} from './sync.js';
import {PartyNet} from './net.js';
import {PartyUI} from './ui_party.js';
import {SoundManager} from './audio_system.js';

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
  if(PartyNet.isHost)startGameFromConfig(config).catch(e=>{console.error(e);PartyNet.cancelStart(e?.message||'建立棋盤失敗。')});
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
    INSIDER:state.ext?.insiderOffer?.playerId,
    RESOLVE_WHEEL:state.ext?.wheelPending?.playerId
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
    case 'RESOLVE_WHEEL':
      execute(()=>extResolveWheel(state,{playerId:actorId,at:action.at}));return;
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
// 開始前和房主斷線：回到加入畫面，代碼和名字已填好，按一下就能重新加入。
PartyNet.onHostLost = (code,name) => { PartyUI.hideLobby?.(); PartyUI.openJoin?.(code,name); };
// 關閉或離開頁面時先通知房主，讓房主馬上把你移出大廳。
window.addEventListener('pagehide',()=>{if(PartyNet.active)PartyNet.leave(false)});

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
