/* The Ballot Board 2026
   Preserves each phone's local preview in its original storage key.
   Optional private Supabase duo mode uses anonymous account sessions and RLS for live sync.
   The app never claims a result unless one of the players enters it. */
const RACES = window.MIDTERM_RACES || [];
const CANDIDATES = window.MIDTERM_CANDIDATES || {};
const INCUMBENTS = window.MIDTERM_INCUMBENTS || {};
const RACE_IDS = new Set(RACES.map(function (r) { return r.id; }));
const PREVIEW_KEY = "ballot_board_2026_preview_v1";
const ACTIVE_ROOM_KEY = "ballot_board_2026_active_room";
const PARTY = { D:"D", R:"R", O:"Other" };
const POLLS = window.MIDTERM_POLLS || {closeMinutes:function(){return 21*60;},label:function(){return "9:00 PM ET";}};
const el = function (id) { return document.getElementById(id); };
let cachedPreview;
try { cachedPreview = JSON.parse(localStorage.getItem(PREVIEW_KEY) || "null"); } catch (_) { cachedPreview = null; }
const state = {
  demo:true, client:null, session:null, room:null, roomList:[], member:null, members:[],
  preferredRoomId:null, pendingInvite:"", creatingNewRoom:false,
  picks:[], results:[], totals:[], leaderboard:[], channel:null, view:"featured", filter:"all", stateCode:"all", search:"",
  persona:"Parker", managerFilter:"open", preview:cachedPreview || {picks:[],results:[],totals:[],persona:"Parker"}
};
if (state.preview.persona === "Blake") state.persona = "Blake";
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (ch) {
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch];
  });
}
function notify(message) {
  const t = el("toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(function () { t.classList.remove("show"); }, 2800);
}
function fail(error) {
  console.error(error);
  notify(error && error.message ? error.message : "Something went wrong. Please try again.");
}
function savePreview() {
  state.preview.persona = state.persona;
  try { localStorage.setItem(PREVIEW_KEY, JSON.stringify(state.preview)); } catch (_) {}
}
function currentId() {
  return state.demo ? state.persona : (state.session && state.member ? state.session.user.id : null);
}
function allPicks() { return state.demo ? state.preview.picks : state.picks; }
function allResults() { return state.demo ? state.preview.results : state.results; }
function allTotals() { return state.demo ? state.preview.totals : state.totals; }
function participants() {
  return state.demo
    ? [{user_id:"Parker",display_name:"Parker"}, {user_id:"Blake",display_name:"Blake"}]
    : state.members.slice().sort(function(a,b){return a.display_name==="Parker"?-1:b.display_name==="Parker"?1:a.display_name.localeCompare(b.display_name);});
}

function candidatesFor(raceId) { return CANDIDATES[raceId] || []; }
function candidateFor(raceId,choice) {
  const candidates=candidatesFor(raceId);
  const exact=candidates.find(function (c) { return c.id === choice; });
  if (exact) return exact;
  // Old party-only selections are displayed but never mistaken for named picks.
  return null;
}
function displayChoice(raceId,choice) {
  const c=candidateFor(raceId,choice);
  return c ? c.name : (PARTY[choice] ? PARTY[choice]+" (old party pick)" : "—");
}
function rowChoice(row) { return row ? (row.candidate_id || row.party || "") : ""; }
function myPick(raceId,userId) {
  return rowChoice(allPicks().find(function (p) { return p.race_id===raceId && p.user_id===userId; }));
}
function calledParty(raceId) {
  return rowChoice(allResults().find(function (r) { return r.race_id===raceId; }));
}
function canManageResults() {
  return state.demo || (!!state.room && !!state.session &&
    (state.room.mode!=="community" || state.room.owner_id===state.session.user.id));
}
function raceScores(person) {
  const valid=allPicks().filter(function (p) {
    return p.user_id===person.user_id && RACE_IDS.has(p.race_id) && !!candidateFor(p.race_id,rowChoice(p));
  });
  const judged=valid.filter(function (p) { return !!candidateFor(p.race_id,calledParty(p.race_id)); });
  const correct=judged.filter(function (p) { return rowChoice(p)===calledParty(p.race_id); }).length;
  return {correct:correct, picked:valid.length, judged:judged.length,
    accuracy:judged.length?Math.round(correct/judged.length*100):null};
}

function isSet(v) { return typeof v === "number" && Number.isFinite(v); }
function render() {
  const online = !state.demo && !!state.room && !!state.member;
  const status = el("connectionStatus");
  status.className = "status-pill" + (online ? " live" : "");
  status.textContent = state.demo ? "◌ Saved on this phone" : online ? "● Both phones synced" : state.session ? "◌ Connect our phones" : "◌ Saved on this phone";
  const notice = el("notice");
  if (state.demo) {
    notice.className = "notice visible";
    notice.textContent = "💾 Your original picks are still saved on this phone. Connect the phones only when you're ready, then import your picks into the shared board.";
  } else if (state.pendingInvite) {
    notice.className = "notice visible";
    notice.textContent = "📱 You have Parker or Blake's invite code ready. Open Our phones to join the pair.";
  } else if (!online) {
    notice.className = "notice visible";
    notice.textContent = "💾 Your old phone-only picks are untouched. Create or join the private board to sync.";
  } else {
    notice.className = "notice";
    notice.textContent = "";
  }
  renderGuide();
  renderChambers();
  renderGovernors();
  renderPlayers();
  renderLeaderboard();
  renderProgress();
  renderRaces();
  renderManager();
}

function renderGuide() {
  const text=el("communityGuideIntro");
  if (!text) return;
  const p=state.preview.picks||[];
  if (state.demo) {
    const yours=p.filter(function(r){return r.user_id===state.persona;}).length;
    text.textContent="Your original phone-only predictions are safe ("+yours+" saved for "+state.persona+"). You can keep playing here or connect the two phones without erasing this copy.";
  } else if (state.pendingInvite) {
    text.textContent="An invitation is ready. Join the same private board as Parker or Blake, then use Import saved picks in Our phones to bring over your existing predictions.";
  } else if (!state.room) {
    text.textContent="Your phone is connected securely. Open Our phones, create or join the private two-person board, then import your original saved picks.";
  } else {
    text.textContent="Parker and Blake share this board and the same called winners. Your predictions belong to your own profile. You can still export the original phone-only backup at any time.";
  }
}
function openLeaderboard() {
  el("leaderboardSection").scrollIntoView({behavior:"smooth",block:"start"});
}
function incumbentMarkup(race) {
  const inc=INCUMBENTS[race.id];
  if (!inc) return '<div class="incumbent-row">🏛️ <span><strong>Incumbent:</strong> Not yet verified</span></div>';
  let who;
  if (inc.status==="vacant") who="Seat currently vacant";
  else if (inc.name) who=inc.name+(inc.party?" ("+inc.party+")":"");
  else who="Not listed for this district";
  const note=inc.note?"<small>"+escapeHtml(inc.note)+"</small>":"";
  return '<div class="incumbent-row"><span class="incumbent-icon" aria-hidden="true">🏛️</span>'+
    '<span><span class="incumbent-label">INCUMBENT</span><strong>'+escapeHtml(who)+'</strong>'+note+'</span></div>';
}
function renderChambers() {
  [["house",435],["senate",100]].forEach(function (item) {
    const chamber = item[0], max = item[1];
    const t = allTotals().find(function (row) { return row.chamber === chamber; });
    const d = t && isSet(Number(t.dem)) ? Number(t.dem) : null;
    const r = t && isSet(Number(t.rep)) ? Number(t.rep) : null;
    const prefix = chamber;
    el(prefix+"D").textContent = d === null ? "—" : String(d);
    el(prefix+"R").textContent = r === null ? "—" : String(r);
    el(prefix+"DBar").style.width = d === null ? "0%" : (Math.max(0,Math.min(max,d))/max*100)+"%";
    el(prefix+"RBar").style.width = r === null ? "0%" : (Math.max(0,Math.min(max,r))/max*100)+"%";
    const status = el(prefix+"Status");
    if (d === null || r === null) {
      status.textContent = chamber === "house"
        ? "Waiting for manually entered called-seat totals • 435 seats"
        : "Waiting for manually entered chamber totals • 100 seats";
    } else {
      const remaining = max - d - r;
      let outcome = "No majority established by entered totals";
      if (chamber === "house" && d >= 218) outcome = "Democratic majority reached in entered totals";
      if (chamber === "house" && r >= 218) outcome = "Republican majority reached in entered totals";
      if (chamber === "senate" && d >= 51) outcome = "D + caucusing I majority reached in entered totals";
      if (chamber === "senate" && (r >= 51 || (r === 50 && d === 50))) outcome = "Republican control reached in entered totals";
      status.textContent = outcome + " • " + Math.max(0,remaining) + " not yet assigned";
    }
  });
}

function renderGovernors() {
  const races=RACES.filter(function(r) {return r.chamber==="governor";});
  const tally={D:0,R:0,O:0}, max=Math.max(1,races.length);
  for (const race of races) {
    const selected=candidateFor(race.id,calledParty(race.id));
    if (selected) tally[selected.party]=(tally[selected.party]||0)+1;
  }
  const called=tally.D+tally.R+tally.O;
  el("governorCalledCount").textContent=called+" of "+races.length+" called";
  el("governorD").textContent=String(tally.D);
  el("governorR").textContent=String(tally.R);
  el("governorO").textContent=String(tally.O);
  el("governorDBar").style.width=(tally.D/max*100)+"%";
  el("governorRBar").style.width=(tally.R/max*100)+"%";
  el("governorOBar").style.width=(tally.O/max*100)+"%";
}
function renderPlayers() {
  const community=!state.demo && state.room && state.room.mode==="community";
  el("playerShowdown").hidden=!!community;
  if (community) return;
  let people=participants();
  if (!state.demo && people.length===1) people=people.concat([{user_id:"pending",display_name:"Player 2"}]);
  if (!people.length) people=[{user_id:"none",display_name:"Sign in to play"},{user_id:"pending",display_name:"Player 2"}];
  el("playerGrid").innerHTML=people.slice(0,2).map(function (person,index) {
    const score=raceScores(person);
    const own=person.user_id===currentId();
    const isParker=person.display_name.toLowerCase()==="parker";
    return '<article class="player-card '+(isParker?'parker':'blake')+'">'+
      '<div class="player-card-header"><div class="player-avatar" aria-hidden="true">'+(isParker?'🔮':'🦊')+'</div>'+
      '<div><div class="player-name">'+escapeHtml(person.display_name)+(own?' ✦':'')+'</div><div class="player-caption">'+(own?'Your prediction desk':'Prediction desk')+'</div></div></div>'+
      '<div class="player-stats"><div class="player-stat"><strong>'+score.correct+'</strong><small>Correct calls</small></div>'+
      '<div class="player-stat"><strong>'+score.picked+'</strong><small>Races picked</small></div>'+
      '<div class="player-stat"><strong>'+(score.accuracy===null?'—':score.accuracy+'%')+'</strong><small>Accuracy*</small></div></div>'+
      '<div class="progress-track"><span style="width:'+(score.picked/Math.max(1,RACES.length)*100)+'%"></span></div>'+
      '<div class="player-caption" style="margin-top:8px">*Based on picked races with a named result</div></article>';
  }).join("");
}
function renderLeaderboard() {
  const isCommunity=false;
  const section=el("leaderboardSection");
  section.hidden=false;
  el("leaderboardIntro").textContent=state.demo
    ? "Scores on this phone only. Connect Parker and Blake’s phones to see both scores live."
    : "Both phones see the same score. You earn one point for each correctly predicted candidate after a winner is called.";
  const entries=(isCommunity?state.leaderboard.map(function (p) {
    const correct=Number(p.correct)||0,picked=Number(p.picked)||0,judged=Number(p.judged)||0;
    return {user_id:p.user_id,display_name:p.display_name,
      score:{correct:correct,picked:picked,judged:judged,accuracy:judged?Math.round(correct/judged*100):null}};
  }):participants().map(function (p) { return {...p,score:raceScores(p)}; }))
    .sort(function (a,b) {
      return b.score.correct-a.score.correct || b.score.picked-a.score.picked ||
        a.display_name.localeCompare(b.display_name);
    });
  let rank=0,previous=null;
  el("leaderboardList").innerHTML=entries.map(function (p,i) {
    const points=p.score.correct;
    if (points!==previous) rank=i+1;
    previous=points;
    const percent=Math.round(p.score.picked/Math.max(1,RACES.length)*100);
    const own=p.user_id===currentId();
    return '<div class="leaderboard-row">'+
      '<span class="leader-rank">'+rank+'</span>'+
      '<span class="leader-avatar">'+escapeHtml(p.display_name.charAt(0).toUpperCase())+'</span>'+
      '<div class="leader-info"><strong>'+escapeHtml(p.display_name)+(own?' ✦':'')+'</strong>'+
      '<small>'+p.score.picked+'/'+RACES.length+' picks completed • '+(p.score.accuracy===null?'No calls yet':p.score.accuracy+'% correct on calls')+'</small>'+
      '<div class="leader-mini-progress"><span style="width:'+percent+'%"></span></div></div>'+
      '<span class="leader-points">'+points+' <small>pts</small></span></div>';
  }).join("") || '<p class="fine-print">No players yet. Join the challenge to appear here.</p>';
  el("leaderboardCount").textContent=entries.length+" player"+(entries.length===1?"":"s");
}
function renderProgress() {
  const id=currentId(),mine=RACES.filter(function (r) { return id && !!candidateFor(r.id,myPick(r.id,id)); });
  const count=mine.length;
  const unpicked=Math.max(0,RACES.length-count);
  el("progressCount").textContent=count+" of "+RACES.length+" races picked";
  el("progressFill").style.width=(count/Math.max(1,RACES.length)*100)+"%";
  el("unfinishedCount").textContent=unpicked===0
    ? "✓ Your tracked ballot is complete!"
    : unpicked+" left to predict";
  el("nextUnpickedButton").disabled=unpicked===0;
}


function filteredRaces() {
  return RACES.filter(function (race) {
    if (state.view==="featured" && !race.featured) return false;
    if (state.view==="senate" && race.chamber!=="senate") return false;
    if (state.view==="house" && race.chamber!=="house") return false;
    if (state.view==="governor" && race.chamber!=="governor") return false;
    if (state.view==="manager") return false;
    if (state.stateCode!=="all" && race.state!==state.stateCode) return false;
    if (state.filter==="open" && calledParty(race.id)) return false;
    if (state.filter==="called" && !calledParty(race.id)) return false;
    if (state.filter==="unpicked" && (!currentId() || candidateFor(race.id,myPick(race.id,currentId())))) return false;
    if (state.search && !(race.title+" "+race.name+" "+race.id+" "+race.rating+" "+
        candidatesFor(race.id).map(function (c) { return c.name; }).join(" ")).toLowerCase().includes(state.search)) return false;
    return true;
  }).sort(function (a,b) {
    const aw=!!calledParty(a.id),bw=!!calledParty(b.id);
    if (aw!==bw) return Number(aw)-Number(bw);
    if (a.chamber!==b.chamber) return ({senate:0,governor:1,house:2}[a.chamber]||0)-({senate:0,governor:1,house:2}[b.chamber]||0);
    if (a.rating==="Toss Up" && b.rating!=="Toss Up") return -1;
    if (b.rating==="Toss Up" && a.rating!=="Toss Up") return 1;
    return a.title.localeCompare(b.title);
  });
}


function candidateButton(raceId,candidate,selected) {
  const locked=!!calledParty(raceId);
  const initials=candidate.name.split(/\s+/).filter(Boolean).slice(0,2).map(function (w) { return w[0]; }).join("").toUpperCase();
  const partyClass=candidate.party==="D"?"dem":candidate.party==="R"?"rep":"other";
  return '<button type="button" class="candidate-button '+partyClass+(selected===candidate.id?' selected':'')+
    '" data-action="pick" data-race="'+escapeHtml(raceId)+'" data-candidate="'+escapeHtml(candidate.id)+'"'+(locked?' disabled':'')+
    ' aria-pressed="'+String(selected===candidate.id)+'" title="'+escapeHtml(candidate.name+' • '+candidate.partyName)+'">'+
    '<span class="candidate-avatar '+partyClass+'">'+escapeHtml(initials)+'</span>'+
    '<span class="candidate-details"><strong>'+escapeHtml(candidate.name)+'</strong>'+
    '<small>'+escapeHtml(candidate.partyName)+'</small></span>'+
    '<span class="candidate-check" aria-hidden="true">'+(selected===candidate.id?'✓':'○')+'</span></button>';
}
function raceCard(race) {
  const my=myPick(race.id,currentId());
  const result=calledParty(race.id);
  const people=participants().slice(0,2);
  const candidates=candidatesFor(race.id);
  const canCall=canManageResults();
  const personSummaries=people.map(function (p) {
    const picked=myPick(race.id,p.user_id);
    return '<span>'+escapeHtml(p.display_name)+': <strong>'+escapeHtml(displayChoice(race.id,picked))+'</strong></span>';
  }).join("");
  const correct=result && candidateFor(race.id,result) && my===result;
  const badge=result?'<span class="tag called">✓ CALLED</span>':
    race.featured?'<span class="tag featured">★ FEATURED</span>':'<span class="tag pending">UNCALLED</span>';
  const selection='<div class="candidate-options">'+candidates.map(function (cand) {
    return candidateButton(race.id,cand,my);
  }).join("")+'</div>';
  const resultOptions='<select class="result-select" data-result-race="'+escapeHtml(race.id)+'" aria-label="Called winner for '+escapeHtml(race.title)+'"'+(!canCall?' disabled':'')+'>'+
    '<option value="">Not called</option>'+candidates.map(function (cand) {
      return '<option value="'+escapeHtml(cand.id)+'"'+(result===cand.id?' selected':'')+'>'+
      escapeHtml(cand.name+' ('+cand.partyName+')')+'</option>';
    }).join("")+'</select>';
  return '<article class="race-card '+(result?'called':'')+'">'+
    '<div class="race-card-top"><span class="race-type">'+(race.chamber==='senate'?'SENATE':race.chamber==='governor'?'GOVERNOR':'HOUSE')+' • '+race.state+'</span>'+badge+'</div>'+
    '<h4>'+escapeHtml(race.title)+'</h4><p class="race-subtitle">'+escapeHtml(race.rating)+' • '+escapeHtml(race.subtitle)+'</p>'+incumbentMarkup(race)+
    '<div class="mini-label">WHO DO YOU THINK WILL WIN?</div>'+selection+
    '<div class="pick-summary">'+(state.room?.mode==="community"?'Your pick: '+escapeHtml(displayChoice(race.id,my)):personSummaries)+'</div>'+
    '<div class="result-strip"><div class="result-head"><span class="result-text '+(result?'winner':'')+'">'+
      (result?'✓ Called: '+escapeHtml(displayChoice(race.id,result)):'◌ Awaiting a manual call')+'</span>'+
      (correct?'<span class="score-star">★ Point!</span>':'')+'</div>'+
      resultOptions+(canCall?'<div class="call-hint">Enter confirmed results only. This is not a live feed.</div>':
      '<div class="call-hint">Only the community host can enter a result.</div>')+'</div></article>';
}


function renderRaces() {
  document.querySelectorAll(".tab").forEach(function (b) {
    const selected=b.dataset.view===state.view;
    b.classList.toggle("selected",selected);
    b.setAttribute("aria-selected",String(selected));
  });
  el("stateFilter").value=state.stateCode;
  el("raceFilter").value=state.filter;
  const managing=state.view==="manager";
  el("managerPanel").hidden=!managing;
  el("raceGrid").hidden=managing;
  document.querySelector(".race-controls").hidden=managing;
  const races=filteredRaces();
  el("raceCount").textContent=managing?"CALL DESK":races.length+" of "+RACES.length+" tracked races";
  el("raceGrid").innerHTML=races.length?races.map(raceCard).join(""):
    '<div class="empty-state"><span class="big">🔎</span><strong>No races match those filters</strong><p>Try another state, status, or category.</p></div>';
}


function renderManager() {
  const panel=el("managerPanel");
  if(!panel || state.view!=="manager") return;
  const called=RACES.filter(function(r){return !!calledParty(r.id);}).length;
  el("managerCount").textContent=called+" of "+RACES.length+" called";
  el("managerFilter").value=state.managerFilter;
  const visible=RACES.filter(function(r){
    return state.managerFilter==="all" ||
      (state.managerFilter==="called"?!!calledParty(r.id):!calledParty(r.id));
  }).sort(function(a,b){
    return POLLS.closeMinutes(a)-POLLS.closeMinutes(b) ||
      a.state.localeCompare(b.state) ||
      a.title.localeCompare(b.title);
  });
  if(!visible.length){
    el("managerList").innerHTML='<div class="empty-state"><strong>All caught up! 🎉</strong><p>Switch the filter to view called races.</p></div>';
    return;
  }
  let wave=-1,html="";
  for(const race of visible){
    const closing=POLLS.closeMinutes(race);
    if(closing!==wave){
      wave=closing;
      html+='<div class="manager-wave"><span aria-hidden="true">🕒</span><h4>'+escapeHtml(POLLS.label(closing))+'</h4><span>Scheduled final poll close</span></div>';
    }
    const result=calledParty(race.id);
    const choices=candidatesFor(race.id);
    const can=canManageResults();
    const type=race.chamber==="senate"?"Senate":race.chamber==="governor"?"Governor":"House";
    html+='<article class="manager-race'+(result?' manager-called':'')+'">'+
       '<div class="manager-race-title"><strong>'+escapeHtml(race.title)+'</strong>'+
       '<small>'+escapeHtml(type+' · '+race.state)+'</small>'+
       (result?'<span class="manager-done">✓ '+escapeHtml(displayChoice(race.id,result))+'</span>':'<span class="manager-await">Awaiting call</span>')+'</div>'+
       '<div class="manager-candidates">'+choices.map(function(c){
         return '<button type="button" class="manager-choice'+(c.id===result?' current':'')+
          '" data-action="manager-call" data-race="'+escapeHtml(race.id)+'" data-candidate="'+escapeHtml(c.id)+'"'+(!can?' disabled':'')+
          ' aria-pressed="'+(c.id===result?'true':'false')+'"><span class="party-tick '+(c.party==="D"?"dem":c.party==="R"?"rep":"other")+'"></span>'+
          escapeHtml(c.name)+(result===c.id?' ✓':'')+'</button>';
       }).join("")+
       (result?'<button type="button" class="manager-clear" data-action="manager-clear" data-race="'+escapeHtml(race.id)+'"'+(!can?' disabled':'')+'>Undo call</button>':'')+
       '</div></article>';
  }
  el("managerList").innerHTML=html;
}

async function savePick(raceId,candidateId) {
  if (!RACE_IDS.has(raceId)) return;
  if (calledParty(raceId)) return notify("Predictions lock after a race has been called.");
  const candidate=candidateId?candidateFor(raceId,candidateId):null;
  if (candidateId && !candidate) return notify("Candidate not found in this race.");
  const userId=currentId();
  if (!userId) return openAccount();
  if (state.demo) {
    state.preview.picks=state.preview.picks.filter(function (p) { return !(p.race_id===raceId&&p.user_id===userId); });
    if (candidate) state.preview.picks.push({race_id:raceId,user_id:userId,party:candidate.party,candidate_id:candidate.id});
    savePreview(); render(); return;
  }
  try {
    let res;
    if (candidate) res=await state.client.from("midterm_picks").upsert({
      room_id:state.room.id,user_id:userId,race_id:raceId,party:candidate.party,candidate_id:candidate.id
    },{onConflict:"room_id,user_id,race_id"});
    else res=await state.client.from("midterm_picks").delete().eq("room_id",state.room.id).eq("user_id",userId).eq("race_id",raceId);
    if (res.error) throw res.error;
    await loadData(); notify("Candidate prediction saved ✨");
  } catch (error) { fail(error); }
}


async function saveCall(raceId,candidateId) {
  if (!RACE_IDS.has(raceId)) return;
  const candidate=candidateId?candidateFor(raceId,candidateId):null;
  if (candidateId && !candidate) return notify("Candidate not found in this race.");
  if (!state.demo && !currentId()) return openAccount();
  if (!canManageResults()) return notify("Only the Community Challenge host can enter race calls.");
  if (state.demo) {
    state.preview.results=state.preview.results.filter(function (r) { return r.race_id!==raceId; });
    if (candidate) state.preview.results.push({race_id:raceId,party:candidate.party,candidate_id:candidate.id});
    savePreview(); render(); return;
  }
  try {
    let res;
    if (candidate) res=await state.client.from("midterm_results").upsert({
      room_id:state.room.id,race_id:raceId,party:candidate.party,candidate_id:candidate.id,
      updated_by:currentId(),updated_at:new Date().toISOString()
    },{onConflict:"room_id,race_id"});
    else res=await state.client.from("midterm_results").delete().eq("room_id",state.room.id).eq("race_id",raceId);
    if (res.error) throw res.error;
    await loadData(); notify("Shared race call updated");
  } catch (error) { fail(error); }
}

function openTotals() {
  if (!state.demo && !currentId()) return openAccount();
  if (!canManageResults()) return notify("Only the Community Challenge host can update totals.");
  ["house","senate"].forEach(function (chamber) {
    const t = allTotals().find(function (x) { return x.chamber===chamber; });
    el("totalsForm").elements[chamber+"D"].value = t ? t.dem : "";
    el("totalsForm").elements[chamber+"R"].value = t ? t.rep : "";
  });
  el("totalsDialog").showModal();
}
async function saveTotals(event) {
  event.preventDefault();
  if (!canManageResults()) return notify("Only the Community Challenge host can update totals.");
  const form = el("totalsForm");
  const records = [];
  for (const chamber of ["house","senate"]) {
    const rawD = form.elements[chamber+"D"].value.trim();
    const rawR = form.elements[chamber+"R"].value.trim();
    if (!rawD && !rawR) continue;
    const d = rawD === "" ? 0 : Number(rawD);
    const r = rawR === "" ? 0 : Number(rawR);
    const max = chamber==="house" ? 435 : 100;
    if (![d,r].every(function (n) { return Number.isInteger(n) && n >= 0 && n <= max; }) || d+r>max) {
      return notify("Check the "+chamber+" totals: combined seats cannot exceed "+max+".");
    }
    records.push({chamber:chamber,dem:d,rep:r});
  }
  if (!records.length) return notify("Enter at least one chamber total first.");
  if (state.demo) {
    records.forEach(function (rec) {
      state.preview.totals = state.preview.totals.filter(function (row) { return row.chamber!==rec.chamber; });
      state.preview.totals.push(rec);
    });
    savePreview(); render();
    el("totalsDialog").close(); return notify("Preview totals saved on this device");
  }
  try {
    const rows = records.map(function (rec) {
      return {...rec,room_id:state.room.id,updated_by:currentId(),updated_at:new Date().toISOString()};
    });
    const {error} = await state.client.from("midterm_totals").upsert(rows,{onConflict:"room_id,chamber"});
    if (error) throw error;
    await loadData();
    el("totalsDialog").close(); notify("Chamber totals synced");
  } catch (error) { fail(error); }
}
function openAccount() {
  renderAccount();
  el("accountDialog").showModal();
}
function accountContent(markup) { el("accountContent").innerHTML = '<div class="modal-body">'+markup+'</div>'; }

function backupControls() {
  const pv=state.preview||{};
  const n=(pv.picks||[]).length, calls=(pv.results||[]).length;
  return '<div class="backup-panel"><span class="micro">YOUR ORIGINAL PHONE-ONLY SAVE</span>'+
    '<h4>💾 Safe and untouched</h4><p>'+n+' stored predictions • '+calls+' saved race calls. Your original save is never automatically deleted or replaced.</p>'+
    '<button type="button" class="button full backup-button" data-action="backup-local">⬇ Download a backup of this phone</button>'+
    '<button type="button" class="link-button" data-action="copy-backup">Copy backup text instead</button></div>';
}
function importControls() {
  const chosen=state.member?.display_name||"";
  const count=(state.preview.picks||[]).filter(function(p){
    return p.user_id.toLowerCase()===chosen.toLowerCase();
  }).length;
  const extra=(state.preview.results||[]).length;
  return '<div class="import-panel"><span class="micro">BRING YOUR EXISTING PICKS INTO THE SHARED BOARD</span>'+
    '<h4>📲 '+escapeHtml(chosen)+'’s saved predictions</h4>'+
    '<p>Found '+count+' original picks for '+escapeHtml(chosen)+' on this phone. Import adds only missing, uncalled predictions. It never overwrites shared picks or erases the phone copy.</p>'+
    '<button type="button" class="button primary full" data-action="import-local">Import '+escapeHtml(chosen)+'’s '+count+' saved picks</button>'+
    (extra?'<p class="fine-print">This phone also has '+extra+' locally saved winner calls. Wait until both players import their picks before transferring calls.</p>'+
      '<button type="button" class="link-button" data-action="import-calls">Import missing saved calls after both phones finish</button>':'')+
    '</div>';
}
function renderAccount() {
  if (state.demo) {
    const count=(state.preview.picks||[]).filter(function(p){return p.user_id===state.persona;}).length;
    accountContent('<span class="micro">PARKER + BLAKE</span><h3>Connect our two phones 📱</h3>'+
      '<p>Your current phone-only predictions are safe. You have '+count+' picks as '+escapeHtml(state.persona)+'. You can keep using this phone without connecting, or set up a private board.</p>'+
      '<div class="input-pair"><button type="button" data-action="persona" data-persona="Parker" class="button full '+(state.persona==="Parker"?"primary":"")+'">🔮 Parker</button>'+
      '<button type="button" data-action="persona" data-persona="Blake" class="button full '+(state.persona==="Blake"?"primary":"")+'">🦊 Blake</button></div>'+
      backupControls()+
      '<div class="divider-text">READY TO SYNC BOTH PHONES?</div>'+
      '<button type="button" class="button primary full" data-action="guest-login">🔗 Connect without Google or email</button>'+
      '<p class="fine-print">A private, anonymous device session will connect you to the shared board. If Supabase says anonymous sign-ins are disabled, turn on <strong>Anonymous Sign-Ins</strong> in Authentication → Providers. Do not sign out or clear browser data.</p>');
    return;
  }
  if (!state.room || state.creatingNewRoom || state.pendingInvite) {
    const urlRoom=state.pendingInvite||new URLSearchParams(location.search).get("room")||"";
    accountContent('<span class="micro">NO GOOGLE ACCOUNT REQUIRED</span><h3>One private game for both of you</h3>'+
      '<p>One of you creates the board; the other enters its code. Choose the correct name so your previously saved picks can be imported.</p>'+
      '<form id="createRoomForm"><label>Who is creating this board?<select name="display_name" required>'+
      '<option value="Parker"'+(state.persona==="Parker"?" selected":"")+'>🔮 Parker</option>'+
      '<option value="Blake"'+(state.persona==="Blake"?" selected":"")+'>🦊 Blake</option></select></label>'+
      '<button type="submit" class="button primary full">✦ Create our two-person board</button></form>'+
      '<div class="divider-text">OR JOIN THE EXISTING BOARD</div>'+
      '<form id="joinRoomForm"><label>Invitation code<input name="code" value="'+escapeHtml(urlRoom)+'" maxlength="10" placeholder="10-character code" required autocapitalize="characters"></label>'+
      '<label>Who is joining?<select name="display_name" required>'+
      '<option value="Blake"'+(state.persona==="Blake"?" selected":"")+'>🦊 Blake</option>'+
      '<option value="Parker"'+(state.persona==="Parker"?" selected":"")+'>🔮 Parker</option></select></label>'+
      '<button type="submit" class="button primary full">Join the same board</button></form>'+
      (state.room?'<button type="button" class="link-button" data-action="cancel-new-room">Return to our board</button>':'')+
      backupControls()+
      '<p class="fine-print">Don’t sign out of this device: anonymous sessions cannot be recovered after browser data is cleared.</p>');
    return;
  }
  const people=participants().map(function(m){return '<span class="member-chip">'+escapeHtml(m.display_name)+'</span>';}).join("");
  accountContent('<span class="micro">OUR SHARED TWO-PERSON BOARD</span><h3>Connected for election night 🎉</h3>'+
    '<p>Shared calls and your picks sync between phones. Each person can see both scores.</p>'+
    '<div class="member-list">'+people+'</div>'+
    '<div class="mini-label" style="margin-top:18px">OUR INVITE CODE</div><div class="invite-code">'+escapeHtml(state.room.code)+'</div>'+
    '<button type="button" data-action="copy-code" class="button primary full">🔗 Copy link for the other phone</button>'+
    '<p class="fine-print">The invitation grants access to this private game. Share it only with Blake or Parker.</p>'+
    importControls()+backupControls()+
    '<p class="fine-print">Your connection is stored on this device. Please avoid signing out or clearing the website’s storage, especially during election night.</p>');
}


function localBackupPayload() {
  // Read the exact original browser entry. Do not mutate, delete or migrate it automatically.
  const saved=localStorage.getItem(PREVIEW_KEY);
  return JSON.stringify({
    app:"The Ballot Board 2026",
    source:"Original phone-only backup",
    created_at:new Date().toISOString(),
    source_key:PREVIEW_KEY,
    preview:saved ? JSON.parse(saved) : state.preview
  },null,2);
}
function downloadLocalBackup() {
  try {
    const data=localBackupPayload();
    const filename="ballot-board-phone-backup-"+new Date().toISOString().slice(0,10)+".json";
    const blob=new Blob([data],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;link.download=filename;
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},3000);
    notify("Backup downloaded! Keep that file safe 💾");
  }catch(error){fail(error);}
}
async function copyLocalBackup() {
  try {
    await navigator.clipboard.writeText(localBackupPayload());
    notify("Original saved picks copied to clipboard 💾");
  }catch(error){fail(error);}
}
async function importLocalPicks() {
  if(state.demo||!state.room||!state.member)return openAccount();
  const name=state.member.display_name;
  const source=(state.preview.picks||[]).filter(function(p){
    return typeof p.user_id==="string" && p.user_id.toLowerCase()===name.toLowerCase();
  });
  const already=new Set(state.picks.filter(function(p){
    return p.user_id===currentId();
  }).map(function(p){return p.race_id;}));
  const skippedCalled=[];
  const rows=[];
  for(const p of source){
    if(!RACE_IDS.has(p.race_id)||already.has(p.race_id))continue;
    if(calledParty(p.race_id)){skippedCalled.push(p.race_id);continue;}
    const choice=candidateFor(p.race_id,rowChoice(p));
    // Old party-only phone saves are kept, even if they need a candidate selection later.
    const legacyParty=!choice&&["D","R","O"].includes(p.party)?p.party:null;
    if(!choice&&!legacyParty)continue;
    already.add(p.race_id);
    rows.push({room_id:state.room.id,user_id:currentId(),race_id:p.race_id,
      party:choice?choice.party:legacyParty,candidate_id:choice?choice.id:null});
  }
  if(!rows.length){
    return notify(source.length?"No missing, uncalled picks to import. Original phone save is safe.":"No saved picks for "+name+" found on this phone.");
  }
  try{
    // Insert, never update or delete any shared prediction.
    const {error}=await state.client.from("midterm_picks").insert(rows);
    if(error)throw error;
    await loadData();
    renderAccount();
    const partyOnly=rows.filter(function(p){return !p.candidate_id;}).length;
    notify("Imported "+rows.length+" saved predictions! "+(partyOnly?partyOnly+" older party picks need a candidate chosen. ":"")+
      (skippedCalled.length?skippedCalled.length+" called races skipped.":"Original copy untouched. 🎉"));
  }catch(error){fail(error);}
}
async function importLocalCalls() {
  if(state.demo||!state.room||!state.member)return openAccount();
  if(state.members.length<2){
    return notify("Connect both phones and import both sets of picks BEFORE transferring old winner calls.");
  }
  const missing=(state.preview.results||[]).filter(function(r){
    return RACE_IDS.has(r.race_id) && !calledParty(r.race_id) &&
      !!candidateFor(r.race_id,rowChoice(r));
  }).map(function(r){
    const c=candidateFor(r.race_id,rowChoice(r));
    return {room_id:state.room.id,race_id:r.race_id,party:c.party,
      candidate_id:c.id,updated_by:currentId(),updated_at:new Date().toISOString()};
  });
  if(!missing.length)return notify("No additional local calls to bring over.");
  if(!confirm("Import "+missing.length+" previous winner calls? Once called, both players' picks on those races lock. Only continue after both phones imported their predictions."))return;
  try{
    const {error}=await state.client.from("midterm_results").insert(missing);
    if(error)throw error;
    await loadData();
    renderAccount();notify("Imported "+missing.length+" old calls to both phones.");
  }catch(error){fail(error);}
}
async function signInGuest() {
  if (!state.client) return notify("First connect your Supabase project to enable sharing.");
  try {
    const {data,error}=await state.client.auth.signInAnonymously();
    if (error) {
      if (error.code==="anonymous_provider_disabled") throw new Error("Enable Anonymous Sign-Ins in Supabase Authentication first.");
      throw error;
    }
    state.session=data.session;
    state.demo=false;
    await bootUser();
    renderAccount();
    notify("Guest profile ready! Add your nickname to join.");
  } catch (error) { fail(error); }
}
function clearInviteFromAddress() {
  // Once a member switches boards, don't force the old invite on reload.
  if (typeof history!=="undefined" && typeof URL!=="undefined") {
    try {
      const u=new URL(location.href);
      if (u.searchParams.has("room")) {
        u.searchParams.delete("room");
        history.replaceState(null,"",u.pathname+u.search+u.hash);
      }
    } catch (_) {}
  }
}
async function createRoom(form) {
  if (!state.session) throw new Error("Sign in before creating a board.");
  const name = form.elements.display_name.value.trim();
  const mode = "duo";
  if (!name || name.length>30) throw new Error("Please use a name between 1 and 30 characters.");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint8Array(10);
  crypto.getRandomValues(random);
  const code = [...random].map(function (n) { return alphabet[n%alphabet.length]; }).join("");
  const {data:room,error} = await state.client.from("midterm_rooms")
    .insert({code:code,owner_id:state.session.user.id,mode:mode}).select().single();
  if (error) throw error;
  const created = await state.client.from("midterm_members")
    .insert({room_id:room.id,user_id:state.session.user.id,display_name:name});
  if (created.error) throw created.error;
  state.preferredRoomId=room.id;
  clearInviteFromAddress();
  state.creatingNewRoom=false;
  state.pendingInvite="";
  await bootUser();
  el("accountDialog").close();
  notify("Our private board is ready! Send the invite code to the other phone 📱");
  openAccount();
}
async function joinRoom(form) {
  if (!state.session) throw new Error("Sign in before joining.");
  const code = form.elements.code.value.toUpperCase().trim();
  const name = form.elements.display_name.value.trim();
  if (!name || name.length>30) throw new Error("Please use a name between 1 and 30 characters.");
  const {error} = await state.client.rpc("join_midterm_room",{p_code:code,p_name:name});
  if (error) throw error;
  state.preferredRoomId=null;
  state.pendingInvite="";
  state.creatingNewRoom=false;
  // The invite query parameter and freshly joined membership select this board.
  const joined=await state.client.from("midterm_rooms").select("id").eq("code",code).maybeSingle();
  if (joined.data) state.preferredRoomId=joined.data.id;
  await bootUser();
  el("accountDialog").close();
  notify("Connected! Now import saved picks from this phone 📲");
  openAccount();
}
async function copyInvite() {
  if (!state.room) return openAccount();
  const url = new URL(location.origin+location.pathname);
  url.searchParams.set("room",state.room.code);
  try { await navigator.clipboard.writeText(url.toString()); notify("Invitation link copied!"); }
  catch (_) { notify("Invite code: "+state.room.code); }
}
async function signOut() {
  try {
    await state.client.auth.signOut();
    state.session=null; state.room=null; state.roomList=[]; state.member=null; state.members=[];
    state.preferredRoomId=null; state.pendingInvite=''; state.creatingNewRoom=false;
    state.picks=[];state.results=[];state.totals=[];state.leaderboard=[];
    if (state.channel) { await state.client.removeChannel(state.channel);state.channel=null; }
    render();renderAccount();notify("Signed out");
  } catch (error) { fail(error); }
}

async function bootUser() {
  if (!state.session) {
    state.room=null;state.roomList=[];state.member=null;state.members=[];
    state.pendingInvite="";render();return;
  }
  const uid=state.session.user.id;
  const {data:memberships,error}=await state.client.from("midterm_members")
    .select("room_id,user_id,display_name").eq("user_id",uid);
  if (error) throw error;
  const joined=memberships||[];
  if (!joined.length) {
    state.room=null;state.roomList=[];state.member=null;state.members=[];
    state.picks=[];state.results=[];state.totals=[];state.leaderboard=[];
    state.pendingInvite=(new URLSearchParams(location.search).get("room")||"").toUpperCase();
    render();return;
  }
  const {data:rooms,error:roomsError}=await state.client.from("midterm_rooms")
    .select("id,code,owner_id,mode").in("id",joined.map(function (m) { return m.room_id; }));
  if (roomsError) throw roomsError;
  state.roomList=rooms||[];
  const invitation=(new URLSearchParams(location.search).get("room")||"").toUpperCase();
  const invitedRoom=state.roomList.find(function (room) { return room.code===invitation; });
  state.pendingInvite=invitation&&!invitedRoom?invitation:"";
  let storedRoomId=null;
  try {storedRoomId=localStorage.getItem(ACTIVE_ROOM_KEY);} catch (_) {}
  const chosen=state.roomList.find(function (r) { return r.id===state.preferredRoomId; }) ||
    invitedRoom ||
    state.roomList.find(function (r) { return r.id===storedRoomId; }) ||
    state.roomList[0];
  if (!chosen) {state.room=null;state.member=null;state.members=[];render();return;}
  state.room=chosen;
  state.member=joined.find(function (m) { return m.room_id===chosen.id; });
  try {localStorage.setItem(ACTIVE_ROOM_KEY,chosen.id);} catch (_) {}
  await loadData();
  subscribeToRoom();
}
async function loadData() {
  if (!state.room || !state.client) {render();return;}
  const roomId=state.room.id;
  const community=state.room.mode==="community";
  let picksQuery=state.client.from("midterm_picks").select("race_id,user_id,party,candidate_id").eq("room_id",roomId);
  if (community) picksQuery=picksQuery.eq("user_id",currentId());
  const requests=[
    state.client.from("midterm_members").select("user_id,display_name").eq("room_id",roomId),
    picksQuery,
    state.client.from("midterm_results").select("race_id,party,candidate_id").eq("room_id",roomId),
    state.client.from("midterm_totals").select("chamber,dem,rep").eq("room_id",roomId)
  ];
  if (community) requests.push(state.client.rpc("midterm_leaderboard",{p_room:roomId}));
  const results=await Promise.all(requests);
  results.forEach(function (response) { if (response.error) throw response.error; });
  state.members=results[0].data||[];
  state.picks=results[1].data||[];
  state.results=results[2].data||[];
  state.totals=results[3].data||[];
  state.leaderboard=community?(results[4].data||[]):[];
  render();
}
function subscribeToRoom() {
  if (!state.room || !state.client) return;
  if (state.channel) state.client.removeChannel(state.channel);
  const roomId=state.room.id;
  let channel=state.client.channel("ballot-board-"+roomId);
  ["midterm_members","midterm_picks","midterm_results","midterm_totals"].forEach(function (table) {
    channel=channel.on("postgres_changes",{event:"*",schema:"public",table:table,filter:"room_id=eq."+roomId},function () {
      loadData().catch(fail);
    });
  });
  state.channel=channel.subscribe();
}
async function initializeCloud() {
  const cfg=window.MIDTERM_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.publishableKey) {state.demo=true;render();return;}
  try {
    const sdk=await import("https://esm.sh/@supabase/supabase-js@2.49.4");
    state.client=sdk.createClient(cfg.supabaseUrl,cfg.publishableKey);
    state.client.auth.onAuthStateChange(function(_event,session){
      state.session=session;
      state.demo=!session;
      setTimeout(function(){bootUser().catch(fail);},0);
    });
    const {data,error}=await state.client.auth.getSession();
    if(error) throw error;
    state.session=data.session;
    state.demo=!data.session; // No account yet: KEEP using original phone-only picks.
    if(data.session)await bootUser();
    else render();
  }catch(error){
    state.demo=true; // Network/auth failure should never hide local saved predictions.
    console.error("Cloud connection unavailable",error);
    notify("Offline phone picks still available. Try syncing again when connected.");
    render();
  }
}

function switchView(view) {
  state.view=view;
  if(view==="manager")renderManager();
  renderRaces();
  const target=document.querySelector(".race-section");
  if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
}
function bindEvents() {
  el("accountButton").addEventListener("click",openAccount);
  el("communityStartButton").addEventListener("click",openAccount);
  el("leaderboardButton").addEventListener("click",openLeaderboard);
  el("communityLeaderboardButton").addEventListener("click",openLeaderboard);
  el("shareButton").addEventListener("click",function () {
    if (state.demo || !state.room) openAccount(); else copyInvite();
  });
  el("featuredButton").addEventListener("click",function () {
    state.view="featured";renderRaces();document.querySelector(".race-section").scrollIntoView({behavior:"smooth"});
  });
  el("totalsButton").addEventListener("click",openTotals);
  el("totalsForm").addEventListener("submit",function (event) {saveTotals(event).catch(fail);});
  el("raceSearch").addEventListener("input",function (event) {
    state.search=event.target.value.toLowerCase().trim();renderRaces();
  });
  el("raceFilter").addEventListener("change",function (event) {
    state.filter=event.target.value;renderRaces();
  });
  el("stateFilter").addEventListener("change",function (event) {
    state.stateCode=event.target.value;renderRaces();
  });
  el("managerFilter").addEventListener("change",function(event){
    state.managerFilter=event.target.value;renderManager();
  });
  el("nextUnpickedButton").addEventListener("click",function () {
    state.view="all"; state.filter="unpicked"; state.stateCode="all";
    el("raceSearch").value="";state.search="";
    renderRaces();
    document.querySelector(".race-section").scrollIntoView({behavior:"smooth"});
  });
  document.addEventListener("change",function (event) {
    const target=event.target;
    if (target.matches("[data-result-race]")) saveCall(target.dataset.resultRace,target.value);
  });
  document.addEventListener("click",function (event) {
    const target=event.target.closest("[data-action],[data-view]");
    if (!target) return;
    if (target.dataset.view) {switchView(target.dataset.view);return;}
    const action=target.dataset.action,raceId=target.dataset.race;
    if(action==="mobile-picks"){switchView("featured");return;}
    if(action==="mobile-scores"){openLeaderboard();return;}
    if(action==="mobile-manager"){switchView("manager");return;}
    if(action==="mobile-sync"){openAccount();return;}
    if(action==="manager-call"){saveCall(raceId,target.dataset.candidate);return;}
    if(action==="manager-clear"){saveCall(raceId,"");return;}
    if(action==="backup-local"){downloadLocalBackup();return;}
    if(action==="copy-backup"){copyLocalBackup();return;}
    if(action==="import-local"){importLocalPicks();return;}
    if(action==="import-calls"){importLocalCalls();return;}
    if (action==="pick") {
      const candidateId=target.dataset.candidate;
      if (myPick(raceId,currentId())===candidateId) savePick(raceId,"");
      else savePick(raceId,candidateId);
    }
    if (action==="persona") {
      state.persona=target.dataset.persona==="Blake"?"Blake":"Parker";
      savePreview();render();renderAccount();notify("Now making picks as "+state.persona);
    }
    if (action==="copy-code") copyInvite();
    if (action==="guest-login") signInGuest();
    if (action==="new-room") {
      state.creatingNewRoom=true;state.pendingInvite="";renderAccount();
    }
    if (action==="cancel-new-room") {
      state.creatingNewRoom=false;state.pendingInvite="";renderAccount();
    }
    if (action==="switch-room") {
      const roomId=target.dataset.room;
      if (!state.roomList.some(function (r) { return r.id===roomId; })) return;
      state.preferredRoomId=roomId;
      clearInviteFromAddress();
      state.pendingInvite="";state.creatingNewRoom=false;
      bootUser().then(function () {renderAccount();notify("Challenge switched");}).catch(fail);
    }
    if (action==="signout") signOut();
  });
  document.addEventListener("submit",function (event) {
    if (!["createRoomForm","joinRoomForm"].includes(event.target.id)) return;
    event.preventDefault();
    const form=event.target,submit=form.querySelector('[type="submit"]');
    if (submit) submit.disabled=true;
    let task;
    if (form.id==="createRoomForm") task=createRoom(form);
    if (form.id==="joinRoomForm") task=joinRoom(form);
    Promise.resolve(task).catch(fail).finally(function () { if (submit) submit.disabled=false; });
  });
}

bindEvents();
render();
initializeCloud();
