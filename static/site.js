function projectFromUrl(){
 const url=new URL(location.href);
 return projects.find(p=>encodeURIComponent(p)===url.hash.slice(1)) || projects.find(p=>p===url.searchParams.get("project"));
}
let remembered;
try {remembered=localStorage.getItem("festival-project")} catch {}
let state,version=0,project=projectFromUrl()||(projects.includes(remembered)?remembered:projects[0]),selected=null;
function rememberProject(){
 const url=new URL(location.href);
 url.searchParams.set("project",project);
 if(url.hash!=="#schedule")url.hash="";
 history.replaceState(history.state,"",url);
 try {localStorage.setItem("festival-project",project)} catch {}
}
rememberProject();
let managing=false;
function editButton(kind,label,id=""){
 return managing?'<button class="edit-control" data-edit="'+kind+'" data-record="'+esc(id)+'">'+label+'</button>':"";
}
function mode(active){
 managing=active;
 el("manage-mode").textContent=active?"退出管理模式":"开启管理模式";
 el("brand-edit").hidden=!active;
 document.body.classList.toggle("editing",active);
 version=-1;
 refresh();
}
function openEditor(kind,id=""){
 const params=new URLSearchParams({editor:kind,project,id});
 el("inline-frame").src="/admin?"+params;
 el("inline-dialog").showModal();
}
el("cancel-editor").onclick=()=>el("inline-dialog").close();
el("inline-dialog").addEventListener("close",()=>el("inline-frame").removeAttribute("src"));
el("manage-mode").onclick=()=>managing?mode(false):openEditor("login");
window.addEventListener("message",async e=>{
 if(e.origin!==location.origin||e.source!==el("inline-frame").contentWindow||e.data?.source!=="festival-editor")return;
 if(e.data.action==="authenticated"){mode(true);el("inline-dialog").close()}
 if(e.data.action==="saved"){el("inline-dialog").close();await refresh()}
});
const slogans={"足球":"很热血，Li刻冲第一","篮球":"很带感，Li刻拼第一","羽毛球":"很轻盈，Li刻争第一","歌王争霸":"很上头，Li刻飙第一","王者荣耀":"很能打，Li刻赢第一"};
const mascotFiles={"足球":"football","篮球":"basketball","羽毛球":"badminton","王者荣耀":"esports","歌王争霸":"singer"};
function brand(){
 const a=state.assets;
 el("group-mark").src=imagePath(a.company)||"./static/festival/brand/group.webp";
 el("festival").innerHTML='<img class="daily-wordmark" src="./static/festival/titles/daily-li.webp" alt="每日赛Li">';
}
const projectIcons={
 "足球":'<circle cx="12" cy="12" r="9.5"/><path d="m12 7 5 3-2 5h-6l-2-5zM12 7V3m5 7 4-1m-6 6 3 4m-9-4-3 4m1-9L3 9"/>',
 "篮球":'<circle cx="12" cy="12" r="9.5"/><path d="m5 5 14 14M5 19 19 5M3 10c5 1 10-2 11-7m-4 18c1-5 6-9 11-8"/>',
 "羽毛球":'<path d="M4 15 3 5l5 2 2-5 4 4 5-1-5 12-5 2zM8 7l2 8m4-9-2 10m-3 3 5-2 2 2a3 3 0 0 1-5 3z"/>',
 "王者荣耀":'<path d="M7 7h10c2 0 3 2 4 5l1 5c.5 3-2 4-4 2l-3-3H9l-3 3c-2 2-4.5 1-4-2l1-5c1-3 2-5 4-5zM6 11v4m-2-2h4"/><circle cx="16" cy="11" r=".7"/><circle cx="18" cy="14" r=".7"/>',
 "歌王争霸":'<rect x="9" y="2" width="7" height="13" rx="3.5"/><path d="M6 11a6.5 6.5 0 0 0 13 0m-6.5 7v4m-4 0h8"/>'
};
function render(){
 document.body.dataset.event=mascotFiles[project];
 const assets=state.assets;
 const desktop=imagePath(assets[project+"-desktop"]);
 for(const screen of ["desktop","mobile"]){
  const url=imagePath(assets[project+"-"+screen]) || desktop || imagePath(assets[screen]) || imagePath(assets.desktop) || new URL("./static/festival/kv/",document.baseURI).href+mascotFiles[project]+"-"+screen+".webp";
  document.body.style.setProperty("--"+screen,'url("'+url+'")');
 }
 const old=el("rail")?.scrollLeft||0;
 document.body.classList.toggle("music",project===projects[4]);
 if(!el("tabs").childElementCount)el("tabs").innerHTML=projects.map(p=>'<button aria-pressed="'+(p===project)+'" data-project="'+p+'" aria-label="'+p+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+projectIcons[p]+'</svg><span class="tab-lettering" aria-hidden="true">'+p+'</span></button>').join("");
 for(const tab of el("tabs").children)tab.setAttribute("aria-pressed",String(tab.dataset.project===project));
 el("project-heading").innerHTML=projectHeading();
 if(project===projects[4])music();else {ladderObserver?.disconnect();portraitObserver?.disconnect();sports()}
 if(el("rail"))el("rail").scrollLeft=old;
 if(el("detail").open)matchDetail(el("detail").dataset.matchId);
}
const sloganHeights={"badminton": 255, "football": 261, "basketball": 238, "singer": 253, "esports": 255};
const mascotWidths={"badminton": 366, "football": 375, "basketball": 366, "singer": 357, "esports": 372};
function projectHeading(){
 const key=mascotFiles[project];
 const prefix="./static/festival/titles/responsive/"+key+"-";
 const sources=[720,960,1200,1550].map(w=>prefix+w+".webp "+w+"w").join(", ");
 return `<h1 class="event-lockup"><img class="event-slogan" width="1550" height="${sloganHeights[key]}" src="${prefix}960.webp" srcset="${sources}" sizes="(max-width:699px) min(60vw,360px), (max-width:1000px) 36vw, min(43vw,520px)" alt="${slogans[project]}"></h1><img class="project-mascot" width="${mascotWidths[key]}" height="400" src="./static/festival/${mascotFiles[project]}.webp" alt="">${editButton("background","编辑项目背景")}`;
}
const statusOrder={"未开始":0,"进行中":1,"已结束":2};
function compareMatches(a,b){
 const group=statusOrder[a.status]-statusOrder[b.status];
 if(group)return group;
 if(a.status==="未开始")return a.date.localeCompare(b.date);
 return (b.finishedAt||b.date).localeCompare(a.finishedAt||a.date);
}
function matchTicket(m){
 const upcoming=m.status==="未开始";
 const [a,b]=m.score.split(":");
 const center=upcoming?esc(m.date.slice(11,16)):esc(a)+'<i>:</i>'+esc(b);
 return `<button class="match" data-match="${esc(m.id)}" data-status="${esc(m.status)}">
  <span class="meta"><span>${esc(m.status)}</span><time>${esc(m.date.slice(5,10).replace("-","/"))}</time></span>
  <strong class="score">${center}</strong>
  <span class="teams"><span>${esc(m.a)}</span><span>${esc(m.b)}</span></span>
  <span class="stage">${esc(m.title)}</span>${managing?'<span class="card-edit">编辑场次</span>':""}</button>`;
}
function sports(){
 const matches=state.matches.filter(m=>m.project===project).sort(compareMatches);
 const stages=state.schedules.filter(s=>s.project===project).sort((a,b)=>a.date.localeCompare(b.date));
 el("main").innerHTML=`<div class="match-toolbar"><h2 class="sports-heading">项目对阵 ${editButton("matches","新增对阵")}</h2></div>
 <section class="rail" id="rail" aria-label="项目对阵">${matches.map(matchTicket).join("")||"<p>对阵待公布</p>"}</section>
 <div class="tools">
 <div><button data-slide="-1" aria-label="上一场">←</button><button data-slide="1" aria-label="下一场">→</button></div></div>
 <section id="schedule"><h2 class="sports-heading">项目赛程 ${editButton("schedules","新增阶段")}</h2><div class="calendar">${stages.map(s=>'<article><time>'+esc(s.date.slice(5).replace("-","/"))+'</time><strong>'+esc(s.title)+'</strong>'+editButton('schedules','编辑阶段',s.id)+'</article>').join("")||"赛程待公布"}</div></section>`;
}
function matchDetail(id){
 const dialog=el("detail");
 const match=state.matches.find(m=>m.id===id);
 if(!match){dialog.close();return}
 const upcoming=match.status==="未开始";
 dialog.dataset.matchId=id;
 el("content").innerHTML=`<div class="detail-meta">${esc(match.project)} · ${esc(match.date.replace("T"," "))}</div>
  <h2 id="match-title">${esc(match.title)}</h2>
  <div class="detail-board"><span class="detail-status">${esc(match.status)}</span>
  <div class="versus"><b>${esc(match.a)}</b><strong>${upcoming?"VS":esc(match.score)}</strong><b>${esc(match.b)}</b></div></div>
  ${match.detail?'<p class="detail-notes">'+esc(match.detail)+'</p>':""}`;
 if(!dialog.open)dialog.showModal();
}
let portraitObserver;
const portrait=(p,defer=false)=>imagePath(p.photo)?'<img alt="" '+(defer?'data-src':'src')+'="'+imagePath(p.photo)+'">':'<span class="initial">'+esc(p.name.slice(0,1))+'</span>';
function music(){
 portraitObserver?.disconnect();
 const defer=innerWidth<700 && 'IntersectionObserver' in window;
 const rs=[...state.rounds].sort((a,b)=>a.order-b.order),people=new Map(state.people.map(p=>[p.id,p]));
 if(!people.has(selected))selected=rs.at(-1)?.entries[0]?.person;

 el("main").innerHTML=(managing?'<div class="music-actions">'+editButton("people","新增选手")+editButton("rounds","新增轮次")+'</div>':'')+'<div class="musicgrid"><div class="ladder">'+rs.map(r=>'<section class="round"><h3>'+esc(r.title)+(managing&&!r.published?" · 草稿":"")+'</h3>'+editButton('rounds','编辑轮次',r.id)+'<div class="roster">'+r.entries.map(e=>{
 const p=people.get(e.person);return p?'<button class="artist '+(p.id===selected?'chosen':'')+'" data-person="'+esc(p.id)+'">'+portrait(p,defer)+'<b>'+esc(p.name)+'</b><span class="artist-dept" title="'+esc(p.department || '部门待补充')+'">'+esc(p.department || '部门待补充')+'</span>'+(e.rank?'<small>'+esc(e.rank)+'</small>':'')+'</button>':""
 }).join("")+'</div></section>').join("")+'</div>'+'<div id="profile-slot"></div></div>';
 if(defer){
  portraitObserver=new IntersectionObserver(entries=>{
   for(const entry of entries){
    if(!entry.isIntersecting)continue;
    const img=entry.target;img.src=img.dataset.src;portraitObserver.unobserve(img);
   }
  },{rootMargin:"64px"});
  el("main").querySelectorAll("img[data-src]").forEach(img=>portraitObserver.observe(img));
 }
 updateProfile();
 observeLadder(el("main").querySelector(".ladder"));

}

function updateProfile(){
 const person=state.people.find(p=>p.id===selected);
 const rs=[...state.rounds].sort((a,b)=>a.order-b.order);
 el("profile-slot").innerHTML=person?'<aside id="profile"><div class="cover">'+(person.photo==='/static/photos/0.jpg'?'<img src="./static/photos/hero.jpg" alt="林小满舞台照">':portrait(person))+'</div><h2>'+esc(person.name)+'</h2>'+editButton('people','编辑选手',person.id)+'<div class="department">部门 · '+esc(person.department || '待补充')+'</div><h3>参赛曲目</h3>'+rs.flatMap(r=>r.entries.filter(e=>e.person===selected).map(e=>'<p><small>'+esc(r.title)+'</small><strong>'+esc(e.song?'《'+e.song+'》':'待公布')+'</strong></p>')).join("")+(person.demo?'<small>示例选手与曲目</small>':'')+'</aside>':'<p>晋级名单待公布</p>';
}

// Branches share a spine in the gutter; no line crosses a portrait.
let ladderObserver;
function observeLadder(ladder){
 ladderObserver?.disconnect();
 if(!ladder)return;
 const art=document.createElementNS("http://www.w3.org/2000/svg","svg");
 art.setAttribute("aria-hidden","true");
 art.classList.add("links");
 const path=document.createElementNS(art.namespaceURI,"path");
 art.append(path);
 ladder.append(art);
 function paint(){
  const origin=ladder.getBoundingClientRect();
  const horizontal=matchMedia("(min-width:700px)").matches;
  const rounds=[...ladder.querySelectorAll(".round")];
  const paths=[];
  for(let i=0;i+1<rounds.length;i++){
   const left=rounds[i],right=rounds[i+1];
   const cards=[...(horizontal?left:right).querySelectorAll(".artist")];
   if(!cards.length)continue;
   if(horizontal){
    const edge=left.getBoundingClientRect().right-origin.left+ladder.scrollLeft;
    const end=right.getBoundingClientRect().left-origin.left+ladder.scrollLeft;
    const spine=(edge+end)/2;
    const centerY=card=>card.getBoundingClientRect().top-origin.top+card.firstElementChild.offsetHeight/2;
    const first=centerY(cards[0]),last=centerY(cards.at(-1));
    paths.push(`M ${edge} ${first} H ${spine} V ${last} H ${edge}`,`M ${spine} ${(first+last)/2} H ${end}`);
   }else{
    const row=right.querySelector(".roster").getBoundingClientRect();
    const xs=cards.map(card=>card.getBoundingClientRect()).map(r=>r.left+r.width/2).filter(x=>x>=row.left&&x<=row.right).map(x=>x-origin.left);
    if(!xs.length)continue;
    const top=row.bottom-origin.top, bottom=left.querySelector("h3").getBoundingClientRect().top-origin.top;
    const mid=(top+bottom)/2;
    const first=xs[0],last=xs.at(-1);
    paths.push(`M ${first} ${top} V ${mid} H ${last} V ${top}`,`M ${(first+last)/2} ${mid} V ${bottom}`);
   }
  }
  const d=paths.join(" ");
  if(path.getAttribute("d")!==d)path.setAttribute("d",d);
 }
 let frame=0;
 function schedulePaint(){
  if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(ladder.isConnected)paint()});
 }
 ladderObserver=new ResizeObserver(schedulePaint);
 ladder.querySelectorAll(".roster").forEach(row=>ladderObserver.observe(row));
 ladder.addEventListener("scroll",schedulePaint,true);
 paint();
}

document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.project && b.dataset.project!==project){project=b.dataset.project;rememberProject();render();if(el("rail"))el("rail").scrollLeft=0}
 if(b.dataset.slide){const rail=el("rail");rail.scrollBy({left:Number(b.dataset.slide)*((rail.firstElementChild?.offsetWidth||100)+parseFloat(getComputedStyle(rail).columnGap)),behavior:"smooth"})}
 if(b.dataset.person){selected=b.dataset.person;document.querySelectorAll(".artist").forEach(card=>card.classList.toggle("chosen",card.dataset.person===selected));updateProfile();if(innerWidth<700)el("profile").scrollIntoView({behavior:"smooth",block:"center"})}
 if(b.dataset.edit && managing)openEditor(b.dataset.edit,b.dataset.record);
 if(b.dataset.match){if(managing)openEditor("matches",b.dataset.match);else matchDetail(b.dataset.match)}
 if(b.id==="close")el("detail").close()
});
async function refresh(){
 const editing=managing;
 try{
  const d=await api(editing?"/api/manage":"/api/state");
  if(editing!==managing || d.version===version)return;
  state=d.state;version=d.version;brand();render();
 }catch(error){
  if(editing&&managing&&error.status===401){mode(false);return}
  if(!state)el("main").textContent="赛事暂时无法载入，正在重试…";
 }
}
if(document.body.dataset.preview==="true"){
 api("./preview-data.json").then(data=>{state=data;brand();render()}).catch(()=>{
  el("main").textContent="赛事数据加载失败，请刷新重试";
 });
}else{
 refresh();setInterval(refresh,3000);
}
