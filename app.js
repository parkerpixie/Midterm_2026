/* The Ballot Board 2026
   Local preview works without a server. Cloud mode uses Supabase Auth, Postgres RLS,
   and realtime changes to sync each signed-in player's picks and shared results.
   The app never claims a result unless one of the players enters it. */
const RACES = window.MIDTERM_RACES || [];
const RACE_IDS = new Set(RACES.map(function (r) { return r.id; }));
const PREVIEW_KEY = "ballot_board_2026_preview_v1";
const PARTY = { D:"D", R:"R", O:"Other" };
const el = function (id) { return document.getElementById(id); };
let cachedPreview;
try { cachedPreview = JSON.parse(localStorage.getItem(PREVIEW_KEY) || "null"); } catch (_) { cachedPreview = null; }
const state = {
  demo:true, client:null, session:null, room:null, member:null, members:[],
  picks:[], results:[], totals:[], channel:null, view:"featured", filter:"all", search:"",
  persona:"Parker", preview:cachedPreview || {picks:[],results:[],totals:[],persona:"Parker"}
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
    : state.members;
}
function myPick(raceId, userId) {
  return allPicks().find(function (p) { return p.race_id === raceId && p.user_id === userId; })?.party || "";
}
function calledParty(raceId) {
  return allResults().find(function (r) { return r.race_id === raceId; })?.party || "";
}
function isSet(v) { return typeof v === "number" && Number.isFinite(v); }
function render() {
  const online = !state.demo && !!state.room && !!state.member;
  const status = el("connectionStatus");
  status.className = "status-pill" + (online ? " live" : "");
  status.textContent = state.demo ? "◌ Local preview only" : online ? "● Shared board synced" : state.session ? "◌ Choose a board" : "◌ Sign in to sync";
  const notice = el("notice");
  if (state.demo) {
    notice.className = "notice visible";
    notice.textContent = "🎨 PREVIEW MODE: Picks and results save on this browser only. They will NOT appear on Blake's phone until Supabase is connected.";
  } else if (!online) {
    notice.className = "notice visible";
    notice.textContent = state.session
      ? "👥 You're signed in. Create your shared board or join one using a code in Players."
      : "🔐 Sign in from Players to save picks online and sync across both phones.";
  } else {
    notice.className = "notice";
    notice.textContent = "";
  }
  renderChambers();
  renderPlayers();
  renderRaces();
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
function renderPlayers() {
  let people = participants();
  if (!state.demo && people.length === 1) people = people.concat([{user_id:"pending",display_name:"Player 2"}]);
  if (!people.length) people = [{user_id:"none",display_name:"Sign in to play"},{user_id:"pending",display_name:"Player 2"}];
  el("playerGrid").innerHTML = people.slice(0,2).map(function (person,index) {
    const picks = allPicks().filter(function (p) { return p.user_id === person.user_id && RACE_IDS.has(p.race_id); });
    const judged = picks.filter(function (p) { return !!calledParty(p.race_id); });
    const correct = judged.filter(function (p) { return p.party === calledParty(p.race_id); }).length;
    const progress = picks.length / Math.max(1,RACES.length) * 100;
    const own = person.user_id === currentId();
    const name = escapeHtml(person.display_name);
    return '<article class="player-card '+(index===0?'parker':'blake')+'">'+
      '<div class="player-card-header"><div class="player-avatar" aria-hidden="true">'+(index===0?'🔮':'🦊')+'</div>'+
      '<div><div class="player-name">'+name+(own?' ✦':'')+'</div><div class="player-caption">'+(own?'Your prediction desk':'Prediction desk')+'</div></div></div>'+
      '<div class="player-stats"><div class="player-stat"><strong>'+correct+'</strong><small>Correct calls</small></div>'+
      '<div class="player-stat"><strong>'+picks.length+'</strong><small>Races picked</small></div>'+
      '<div class="player-stat"><strong>'+(judged.length?Math.round(correct/judged.length*100)+'%':'—')+'</strong><small>Accuracy*</small></div></div>'+
      '<div class="progress-track"><span style="width:'+progress+'%"></span></div>'+
      '<div class="player-caption" style="margin-top:8px">*Based only on called races with a prediction</div></article>';
  }).join("");
}
function filteredRaces() {
  return RACES.filter(function (race) {
    if (state.view === "featured" && !race.featured) return false;
    if (state.view === "senate" && race.chamber !== "senate") return false;
    if (state.view === "house" && race.chamber !== "house") return false;
    if (state.filter === "open" && calledParty(race.id)) return false;
    if (state.filter === "called" && !calledParty(race.id)) return false;
    if (state.filter === "unpicked" && (!currentId() || myPick(race.id,currentId()))) return false;
    if (state.search && !(race.title+" "+race.name+" "+race.id+" "+race.rating).toLowerCase().includes(state.search)) return false;
    return true;
  }).sort(function (a,b) {
    const aw = !!calledParty(a.id), bw = !!calledParty(b.id);
    if (aw !== bw) return Number(aw)-Number(bw);
    if (a.chamber !== b.chamber) return a.chamber === "senate" ? -1 : 1;
    if (a.rating === "Toss Up" && b.rating !== "Toss Up") return -1;
    if (b.rating === "Toss Up" && a.rating !== "Toss Up") return 1;
    return a.title.localeCompare(b.title);
  });
}
function choice(raceId, party, selected, action, label) {
  return '<button type="button" class="choice '+(selected===party?'is-'+party.toLowerCase():'')+
    '" data-action="'+action+'" data-race="'+raceId+'" data-party="'+party+'" aria-pressed="'+String(selected===party)+'">'+label+'</button>';
}
function raceCard(race) {
  const my = myPick(race.id, currentId());
  const result = calledParty(race.id);
  const people = participants().slice(0,2);
  const personSummaries = people.map(function (p) {
    const picked = myPick(race.id,p.user_id);
    return '<span>'+escapeHtml(p.display_name)+': <strong>'+(picked ? PARTY[picked] : '—')+'</strong></span>';
  }).join("");
  const correct = result && my && result === my;
  const badge = result ? '<span class="tag called">✓ CALLED</span>'
    : race.featured ? '<span class="tag featured">★ FEATURED</span>'
    : '<span class="tag pending">UNCALLED</span>';
  return '<article class="race-card '+(result?'called':'')+'">'+
    '<div class="race-card-top"><span class="race-type">'+(race.chamber==='senate'?'SENATE':'HOUSE')+' • '+race.state+'</span>'+badge+'</div>'+
    '<h4>'+escapeHtml(race.title)+'</h4><p class="race-subtitle">'+escapeHtml(race.rating)+' • '+escapeHtml(race.subtitle)+'</p>'+
    '<div class="mini-label">YOUR PREDICTION</div><div class="pick-row">'+
      choice(race.id,"D",my,"pick","D")+choice(race.id,"R",my,"pick","R")+
      choice(race.id,"O",my,"pick","Other")+
      '<button class="choice clear" type="button" data-action="clear-pick" data-race="'+race.id+'" aria-label="Clear my prediction">×</button></div>'+
    '<div class="pick-summary">'+personSummaries+'</div>'+
    '<div class="result-strip"><div class="result-head"><span class="result-text '+(result?'winner':'')+'">'+
      (result ? '✓ Called winner: '+PARTY[result] : '◌ Awaiting a verified call')+'</span>'+
      (correct?'<span class="score-star">★ Point!</span>':'')+'</div>'+
      '<div class="pick-row">'+choice(race.id,"D",result,"call","D")+
      choice(race.id,"R",result,"call","R")+choice(race.id,"O",result,"call","Other")+
      '<button class="choice clear" type="button" data-action="clear-call" data-race="'+race.id+'" aria-label="Clear called winner">×</button></div></div></article>';
}
function renderRaces() {
  document.querySelectorAll(".tab").forEach(function (b) {
    const chosen = b.dataset.view === state.view;
    b.classList.toggle("selected",chosen);
    b.setAttribute("aria-selected",String(chosen));
  });
  const races = filteredRaces();
  el("raceCount").textContent = races.length + " of " + RACES.length + " races";
  el("raceGrid").innerHTML = races.length
    ? races.map(raceCard).join("")
    : '<div class="empty-state"><span class="big">🔎</span><strong>No races match those filters</strong><p>Try another search or category.</p></div>';
}
async function savePick(raceId,party) {
  if (!RACE_IDS.has(raceId) || (party && !PARTY[party])) return;
  const userId = currentId();
  if (!userId) return openAccount();
  if (state.demo) {
    state.preview.picks = state.preview.picks.filter(function (p) { return !(p.race_id===raceId && p.user_id===userId); });
    if (party) state.preview.picks.push({race_id:raceId,user_id:userId,party:party});
    savePreview(); render(); return;
  }
  try {
    let res;
    if (party) res = await state.client.from("midterm_picks").upsert({
      room_id:state.room.id,user_id:userId,race_id:raceId,party:party
    },{onConflict:"room_id,user_id,race_id"});
    else res = await state.client.from("midterm_picks").delete().eq("room_id",state.room.id).eq("user_id",userId).eq("race_id",raceId);
    if (res.error) throw res.error;
    await loadData();
    notify("Prediction saved and synced ✨");
  } catch (error) { fail(error); }
}
async function saveCall(raceId,party) {
  if (!RACE_IDS.has(raceId) || (party && !PARTY[party])) return;
  if (!state.demo && !currentId()) return openAccount();
  if (state.demo) {
    state.preview.results = state.preview.results.filter(function (r) { return r.race_id!==raceId; });
    if (party) state.preview.results.push({race_id:raceId,party:party});
    savePreview(); render(); return;
  }
  try {
    let res;
    if (party) res = await state.client.from("midterm_results").upsert({
      room_id:state.room.id,race_id:raceId,party:party,updated_by:currentId(),updated_at:new Date().toISOString()
    },{onConflict:"room_id,race_id"});
    else res = await state.client.from("midterm_results").delete().eq("room_id",state.room.id).eq("race_id",raceId);
    if (res.error) throw res.error;
    await loadData(); notify("Shared race call updated");
  } catch (error) { fail(error); }
}
function openTotals() {
  if (!state.demo && !currentId()) return openAccount();
  ["house","senate"].forEach(function (chamber) {
    const t = allTotals().find(function (x) { return x.chamber===chamber; });
    el("totalsForm").elements[chamber+"D"].value = t ? t.dem : "";
    el("totalsForm").elements[chamber+"R"].value = t ? t.rep : "";
  });
  el("totalsDialog").showModal();
}
async function saveTotals(event) {
  event.preventDefault();
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
function renderAccount() {
  if (state.demo) {
    accountContent('<span class="micro">PREVIEW DESK</span><h3>Who is making picks?</h3>'+
      '<p>You can try both players here, but this preview is saved on this browser only.</p>'+
      '<div class="input-pair"><button type="button" data-action="persona" data-persona="Parker" class="button full '+(state.persona==='Parker'?'primary':'')+'">🔮 Parker</button>'+
      '<button type="button" data-action="persona" data-persona="Blake" class="button full '+(state.persona==='Blake'?'primary':'')+'">🦊 Blake</button></div>'+
      '<div class="modal-note">To sync between phones, configure a Supabase project in <strong>config.js</strong>, run <strong>schema.sql</strong>, and redeploy the site. Then Parker and Blake can each sign in with their own email.</div>');
    return;
  }
  if (!state.session) {
    accountContent('<span class="micro">YOUR OWN PRIVATE PREDICTION DESK</span><h3>Sign in to play ✉️</h3>'+
      '<p>Enter your email to receive a one-time sign-in link. Parker and Blake should use their own email addresses.</p>'+
      '<form id="emailForm"><label>Email address<input type="email" name="email" autocomplete="email" placeholder="you@example.com" required></label>'+
      '<button class="button primary full" type="submit">Send my sign-in link</button></form>'+
      '<div class="modal-note">No password to remember. Sign in once on each phone and your picks will sync automatically.</div>');
    return;
  }
  if (!state.room) {
    const urlRoom = new URLSearchParams(location.search).get("room") || "";
    accountContent('<span class="micro">WELCOME TO THE BOARD</span><h3>Start or join your game</h3>'+
      '<p>Create a private board, then invite the other player with its code. You each keep your own predictions.</p>'+
      '<form id="createRoomForm"><label>Your display name<input name="display_name" maxlength="30" placeholder="Parker" required></label>'+
      '<button type="submit" class="button primary full">✦ Create our board</button></form>'+
      '<div class="divider-text">OR JOIN SOMEONE ELSE</div>'+
      '<form id="joinRoomForm"><label>Invitation code<input name="code" value="'+escapeHtml(urlRoom)+'" maxlength="10" placeholder="10-character code" required autocapitalize="characters"></label>'+
      '<label>Your display name<input name="display_name" maxlength="30" placeholder="Blake" required></label>'+
      '<button type="submit" class="button primary full">Join shared board</button></form>'+
      '<button type="button" class="link-button" data-action="signout">Sign out</button>');
    return;
  }
  const code = escapeHtml(state.room.code);
  const members = participants().map(function (m) {
    return '<span class="member-chip">✦ '+escapeHtml(m.display_name)+'</span>';
  }).join("");
  accountContent('<span class="micro">YOUR SHARED ELECTION NIGHT</span><h3>The prediction party 🎉</h3>'+
    '<p>Both phones see the same calls and seat totals. Your predictions stay under your own account.</p>'+
    '<div>'+members+'</div><div class="mini-label" style="margin-top:18px">INVITE CODE</div><div class="invite-code">'+code+'</div>'+
    '<button type="button" data-action="copy-code" class="button primary full">Copy invitation link</button>'+
    '<div class="modal-note">Have Blake open this link, sign in using his own email, and join your board with the code.</div>'+
    '<button type="button" class="link-button" data-action="signout">Sign out</button>');
}
async function sendEmail(form) {
  const email = form.elements.email.value.trim();
  const redirect = location.origin + location.pathname + location.search;
  const {error} = await state.client.auth.signInWithOtp({email:email,options:{emailRedirectTo:redirect}});
  if (error) throw error;
  notify("Check your inbox for the sign-in link ✉️");
  form.innerHTML = '<p class="modal-note">Sign-in link sent to '+escapeHtml(email)+'. Open the email on this device to sign in.</p>';
}
async function createRoom(form) {
  if (!state.session) throw new Error("Sign in before creating a board.");
  const name = form.elements.display_name.value.trim();
  if (!name || name.length>30) throw new Error("Please use a name between 1 and 30 characters.");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint8Array(10);
  crypto.getRandomValues(random);
  const code = [...random].map(function (n) { return alphabet[n%alphabet.length]; }).join("");
  const {data:room,error} = await state.client.from("midterm_rooms")
    .insert({code:code,owner_id:state.session.user.id}).select().single();
  if (error) throw error;
  const created = await state.client.from("midterm_members")
    .insert({room_id:room.id,user_id:state.session.user.id,display_name:name});
  if (created.error) throw created.error;
  await bootUser();
  el("accountDialog").close();
  notify("Your shared board is ready! Share its code ✨");
}
async function joinRoom(form) {
  if (!state.session) throw new Error("Sign in before joining.");
  const code = form.elements.code.value.toUpperCase().trim();
  const name = form.elements.display_name.value.trim();
  if (!name || name.length>30) throw new Error("Please use a name between 1 and 30 characters.");
  const {error} = await state.client.rpc("join_midterm_room",{p_code:code,p_name:name});
  if (error) throw error;
  await bootUser();
  el("accountDialog").close();
  notify("You're in! Your picks now sync 🎉");
}
async function copyInvite() {
  if (!state.room) return openAccount();
  const url = new URL(location.href);
  url.searchParams.set("room",state.room.code);
  try { await navigator.clipboard.writeText(url.toString()); notify("Invitation link copied!"); }
  catch (_) { notify("Invite code: "+state.room.code); }
}
async function signOut() {
  try {
    await state.client.auth.signOut();
    state.session=null; state.room=null; state.member=null; state.members=[];
    state.picks=[];state.results=[];state.totals=[];
    if (state.channel) { await state.client.removeChannel(state.channel);state.channel=null; }
    render();renderAccount();notify("Signed out");
  } catch (error) { fail(error); }
}
async function bootUser() {
  if (!state.session) { state.room=null;state.member=null;state.members=[]; render();return; }
  const uid = state.session.user.id;
  const {data:member,error} = await state.client.from("midterm_members")
    .select("room_id,user_id,display_name").eq("user_id",uid).limit(1).maybeSingle();
  if (error) throw error;
  if (!member) { state.room=null;state.member=null;state.members=[];state.picks=[];state.results=[];state.totals=[];render();return; }
  const response = await state.client.from("midterm_rooms").select("id,code,owner_id").eq("id",member.room_id).single();
  if (response.error) throw response.error;
  state.room=response.data;state.member=member;
  await loadData();
  subscribeToRoom();
}
async function loadData() {
  if (!state.room || !state.client) {render();return;}
  const roomId=state.room.id;
  const results=await Promise.all([
    state.client.from("midterm_members").select("user_id,display_name").eq("room_id",roomId),
    state.client.from("midterm_picks").select("race_id,user_id,party").eq("room_id",roomId),
    state.client.from("midterm_results").select("race_id,party").eq("room_id",roomId),
    state.client.from("midterm_totals").select("chamber,dem,rep").eq("room_id",roomId)
  ]);
  results.forEach(function (response) { if (response.error) throw response.error; });
  state.members=results[0].data||[];
  state.picks=results[1].data||[];
  state.results=results[2].data||[];
  state.totals=results[3].data||[];
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
    const sdk = await import("https://esm.sh/@supabase/supabase-js@2.49.4");
    state.client=sdk.createClient(cfg.supabaseUrl,cfg.publishableKey);
    state.demo=false;
    state.client.auth.onAuthStateChange(function (_event,session) {
      state.session=session;
      setTimeout(function () { bootUser().catch(fail); },0);
    });
    const {data,error}=await state.client.auth.getSession();
    if (error) throw error;
    state.session=data.session;
    await bootUser();
  } catch (error) {
    state.demo=false;
    console.error("Could not initialize Supabase",error);
    notify("Cloud connection unavailable. Check config.js and your network.");
    render();
  }
}
function bindEvents() {
  el("accountButton").addEventListener("click",openAccount);
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
  document.addEventListener("click",function (event) {
    const target=event.target.closest("[data-action], [data-view]");
    if (!target) return;
    if (target.dataset.view) {state.view=target.dataset.view;renderRaces();return;}
    const action=target.dataset.action, raceId=target.dataset.race, party=target.dataset.party;
    if (action==="pick") savePick(raceId,party);
    if (action==="clear-pick") savePick(raceId,"");
    if (action==="call") saveCall(raceId,party);
    if (action==="clear-call") saveCall(raceId,"");
    if (action==="persona") {
      state.persona=target.dataset.persona==="Blake"?"Blake":"Parker";
      savePreview();render();renderAccount();notify("Now making picks as "+state.persona);
    }
    if (action==="copy-code") copyInvite();
    if (action==="signout") signOut();
  });
  document.addEventListener("submit",function (event) {
    if (!["emailForm","createRoomForm","joinRoomForm"].includes(event.target.id)) return;
    event.preventDefault();
    const form=event.target;
    const submit=form.querySelector('[type="submit"]');
    if (submit) submit.disabled=true;
    let task;
    if (form.id==="emailForm") task=sendEmail(form);
    if (form.id==="createRoomForm") task=createRoom(form);
    if (form.id==="joinRoomForm") task=joinRoom(form);
    Promise.resolve(task).catch(fail).finally(function () { if (submit) submit.disabled=false; });
  });
}
bindEvents();
render();
initializeCloud();
