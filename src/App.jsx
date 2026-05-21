import { useState, useEffect, useRef, useCallback } from "react";

const SB_URL = "https://mxqxdlqywarwctljgttt.supabase.co";
const SB_KEY = "sb_publishable_S8dPBgKqN65uSVcNfQnXCw_MSmpKoKX";

async function sb(table, method="GET", body=null, query="") {
  const res = await fetch(`${SB_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method==="POST"?"return=representation":"",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if(!res.ok) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const getToday = () => new Date().toISOString().split("T")[0];
const fmtTime  = (d) => d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
const fmtDate  = (d) => d.toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" });
const fmtDT    = (iso) => new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
const fmtShort = (iso) => new Date(iso+"T12:00").toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"2-digit" });
const t2m = (s) => { const [h,m]=s.split(":").map(Number); return h*60+m; };

const ROUTINE = [
  { id:"r1",  time:"04:50", label:"Despertar",         icon:"🌅", desc:"Agua 500ml · Sem celular · Roupa separada",    cat:"Manha" },
  { id:"r2",  time:"05:00", label:"Academia",           icon:"💪", desc:"90 min treino · Mente livre",                  cat:"Manha" },
  { id:"r3",  time:"06:30", label:"Cafe + Leitura",     icon:"📖", desc:"Banho · 1a refeicao · 10 min leitura",        cat:"Manha" },
  { id:"r4",  time:"07:10", label:"Deslocamento",       icon:"🚗", desc:"Revisar pauta · Chegar 7h25",                  cat:"Trabalho" },
  { id:"r5",  time:"07:30", label:"Abertura CentroMed", icon:"🏥", desc:"Meta Ads · CPL · WhatsApp · Breno",            cat:"Trabalho" },
  { id:"r6",  time:"08:00", label:"Bloco Conteudo",     icon:"🎬", desc:"Maria Eduarda · Aprovacoes · Gravacoes",       cat:"Trabalho" },
  { id:"r7",  time:"09:30", label:"Reuniao Medicos",    icon:"👨‍⚕️", desc:"Joao Paulo · Mardonho · Larissa · CFM",   cat:"Trabalho" },
  { id:"r8",  time:"10:30", label:"Trafego Pago",       icon:"📊", desc:"Frequencia < 2,5x · CPL < R$4 escalar",       cat:"Trabalho" },
  { id:"r9",  time:"12:00", label:"Almoco",             icon:"🍽️", desc:"Refeicao natural · Sem tela · Descanso",      cat:"Nutricao" },
  { id:"r10", time:"13:00", label:"Bloco UPMIND",       icon:"⚡", desc:"Clientes · Entregas · Pipeline",               cat:"UPMIND" },
  { id:"r11", time:"14:30", label:"Estrategia UPMIND",  icon:"🧠", desc:"Mentoria waitlist · Newton · Copa 2026",       cat:"UPMIND" },
  { id:"r12", time:"15:30", label:"Conteudo Pessoal",   icon:"📱", desc:"1 conteudo · Hook Virada Moral CTA",          cat:"Marca" },
  { id:"r13", time:"16:30", label:"Presenca Digital",   icon:"✨", desc:"DMs estrategicos · Story · Metricas",          cat:"Marca" },
  { id:"r14", time:"17:00", label:"Review do Dia",      icon:"✅", desc:"Executado vs planejado · 3 prioridades",       cat:"Encerramento" },
  { id:"r15", time:"17:30", label:"Jantar + Familia",   icon:"🏠", desc:"Refeicao natural · Familia · Descanso",        cat:"Nutricao" },
  { id:"r16", time:"19:30", label:"Wind Down",          icon:"🌙", desc:"Ultima refeicao · Sem tela · Dormir 21h30",   cat:"Encerramento" },
];

const CAT_C = {
  "Manha":"#00d4ff", "Trabalho":"#4488ff", "Nutricao":"#00ffaa",
  "UPMIND":"#aa88ff", "Marca":"#ff88cc", "Encerramento":"#ffcc44",
};

const META_CATS   = ["UPMIND","CentroMed","Marca Pessoal","Saude","Financeiro","Leitura","Pessoal"];
const META_COLORS = { UPMIND:"#aa88ff", CentroMed:"#4488ff", "Marca Pessoal":"#ff88cc", Saude:"#00ffaa", Financeiro:"#ffcc44", Leitura:"#ff9944", Pessoal:"#88ddff" };
const META_ICONS  = { UPMIND:"⚡", CentroMed:"🏥", "Marca Pessoal":"✨", Saude:"💪", Financeiro:"💰", Leitura:"📖", Pessoal:"🌱" };
const TAG_COLORS  = { UPMIND:"#aa88ff", CentroMed:"#4488ff", Marca:"#ff88cc", Corpo:"#00ffaa", Pausa:"#88ddff", Encerramento:"#ffcc44" };

function askNotif() { if("Notification" in window && Notification.permission==="default") Notification.requestPermission(); }
function notify(title,body) { if("Notification" in window && Notification.permission==="granted") new Notification(title,{body}); }

async function askAI(messages, sys) {
  const system = sys || "Voce e J.A.R.V.I.S — assistente pessoal de Wanderson Cruz, Founder UPMIND + Diretor Marketing CentroMed, Crateus-CE. Tom: preciso, inteligente, direto. Sem enrolacao. Portugues brasileiro. Max 3 paragrafos.";
  try {
    const res = await fetch("/api/ai", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ system, messages })
    });
    if(res.ok) { const d=await res.json(); return d.text||"Sem resposta."; }
  } catch {}
  return "J.A.R.V.I.S offline. Verifique a API key.";
}

const NAV = [
  { id:"home",    label:"Base",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:20,height:20}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id:"rotina",  label:"Missoes", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { id:"tarefas", label:"Ops",     icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:20,height:20}}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { id:"metas",   label:"Alvos",   icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  { id:"jarvis",  label:"J.A.R.V.I.S", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:20,height:20}}><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg> },
];

export default function AgendaIA() {
  const today = getToday();
  const [now,setNow]         = useState(new Date());
  const [tab,setTab]         = useState("home");
  const [toast,setToast]     = useState(null);
  const [loading,setLoading] = useState(true);
  const [tarefas,setTarefas] = useState([]);
  const [metas,setMetas]     = useState([]);
  const [submetas,setSubmetas] = useState([]);
  const [notas,setNotas]     = useState([]);
  const [checked,setChecked] = useState({});
  const [chat,setChat]       = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [t,m,sm,n,rc] = await Promise.all([
      sb("tarefas","GET",null,`?date=eq.${today}&order=created_at.desc`),
      sb("metas","GET",null,`?order=created_at.desc`),
      sb("submetas","GET",null,`?order=ordem.asc,created_at.asc`),
      sb("notas","GET",null,`?order=created_at.desc&limit=50`),
      sb("rotina_check","GET",null,`?date=eq.${today}`),
    ]);
    if(t) setTarefas(t);
    if(m) setMetas(m);
    if(sm) setSubmetas(sm);
    if(n) setNotas(n);
    if(rc) { const map={}; rc.forEach(r=>{map[r.item_id]=r.checked;}); setChecked(map); }
    setLoading(false);
  }, [today]);

  useEffect(()=>{ loadAll(); askNotif(); },[]);
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),60000); return()=>clearInterval(t); },[]);
  useEffect(()=>{
    const cur=fmtTime(now);
    ROUTINE.forEach(item=>{ const [h,m]=item.time.split(":").map(Number); const rem=new Date(); rem.setHours(h,m-30,0); if(fmtTime(rem)===cur&&!checked[item.id]) notify(`Em 30min: ${item.label}`,item.desc); });
    tarefas.forEach(t=>{ if(t.reminder_time===cur&&!t.done&&!t.reminded){ notify(`Tarefa: ${t.title}`,t.note||""); upDay({tasks:tarefas.map(x=>x.id===t.id?{...x,reminded:true}:x)}); } });
  },[now]);

  function showToast(msg,type="ok") { setToast({msg,type}); setTimeout(()=>setToast(null),2500); }
  function upDay(p) { /* legacy compat */ }

  async function toggleCheck(id) {
    const val=!checked[id]; setChecked(p=>({...p,[id]:val}));
    const rid=`${today}_${id}`;
    if(val) { await sb("rotina_check","POST",{id:rid,date:today,item_id:id,checked:true}); showToast("Missao concluida"); }
    else await sb(`rotina_check?id=eq.${rid}`,"DELETE");
  }

  async function addTarefa(data) {
    const nova={id:Date.now().toString(),date:today,done:false,reminded:false,...data,created_at:new Date().toISOString()};
    const res=await sb("tarefas","POST",nova);
    if(res){setTarefas(p=>[res[0]||nova,...p]);showToast("Operacao adicionada");}
  }
  async function toggleTarefa(id) {
    const t=tarefas.find(x=>x.id===id);
    const upd={done:!t.done,done_at:!t.done?new Date().toISOString():null};
    await sb(`tarefas?id=eq.${id}`,"PATCH",upd);
    setTarefas(p=>p.map(x=>x.id===id?{...x,...upd}:x));
  }
  async function removeTarefa(id) { await sb(`tarefas?id=eq.${id}`,"DELETE"); setTarefas(p=>p.filter(x=>x.id!==id)); }

  async function addMeta(data) {
    const nova={id:Date.now().toString(),done:false,current_val:0,logs:[],...data,created_at:new Date().toISOString()};
    const res=await sb("metas","POST",nova);
    if(res){setMetas(p=>[res[0]||nova,...p]);showToast("Alvo registrado");}
  }
  async function updateMetaProgress(id,val) {
    const m=metas.find(x=>x.id===id);
    const cur=Math.min(Math.max(0,Number(val)),Number(m.target));
    const done=cur>=Number(m.target);
    const logs=[...(m.logs||[]),{at:new Date().toISOString(),val:cur}];
    const upd={current_val:cur,done,done_at:done?new Date().toISOString():null,logs};
    await sb(`metas?id=eq.${id}`,"PATCH",upd);
    setMetas(p=>p.map(x=>x.id===id?{...x,...upd}:x));
    if(done) showToast("Alvo atingido!");
  }
  async function removeMeta(id) { await sb(`metas?id=eq.${id}`,"DELETE"); setMetas(p=>p.filter(x=>x.id!==id)); }

  async function addSubmeta(metaId,data) {
    const nova={id:Date.now().toString(),meta_id:metaId,done:false,current_val:0,ordem:0,...data,created_at:new Date().toISOString()};
    const res=await sb("submetas","POST",nova);
    if(res){setSubmetas(p=>[...p,res[0]||nova]);showToast("Sub-alvo criado");}
  }
  async function updateSubmeta(id,val) {
    const s=submetas.find(x=>x.id===id);
    const cur=Math.min(Math.max(0,Number(val)),Number(s.target));
    const done=cur>=Number(s.target);
    const upd={current_val:cur,done,done_at:done?new Date().toISOString():null};
    await sb(`submetas?id=eq.${id}`,"PATCH",upd);
    setSubmetas(p=>p.map(x=>x.id===id?{...x,...upd}:x));
  }
  async function toggleSubmeta(id) {
    const s=submetas.find(x=>x.id===id);
    const upd={done:!s.done,done_at:!s.done?new Date().toISOString():null,current_val:!s.done?s.target:0};
    await sb(`submetas?id=eq.${id}`,"PATCH",upd);
    setSubmetas(p=>p.map(x=>x.id===id?{...x,...upd}:x));
  }
  async function removeSubmeta(id) { await sb(`submetas?id=eq.${id}`,"DELETE"); setSubmetas(p=>p.filter(x=>x.id!==id)); }

  async function addNota(text) {
    const nova={id:Date.now().toString(),texto:text,converted:false,created_at:new Date().toISOString()};
    const res=await sb("notas","POST",nova);
    if(res){setNotas(p=>[res[0]||nova,...p]);showToast("Nota registrada");}
  }
  async function convertNota(nota) {
    try {
      const reply=await askAI([{role:"user",content:`Analise e retorne APENAS JSON: {"tipo":"tarefa|meta","title":"...","note":"...","tag":"UPMIND|CentroMed|Marca|Corpo","cat":"UPMIND|CentroMed|Marca Pessoal|Saude|Financeiro|Leitura|Pessoal","target":100,"objetivo":"...","descricao":"..."}\nAnotacao: "${nota.texto}"`}]);
      const parsed=JSON.parse(reply.replace(/```json|```/g,"").trim());
      if(parsed.tipo==="meta") await addMeta({title:parsed.title,descricao:parsed.descricao||"",cat:parsed.cat||"UPMIND",tipo:"Mensal",target:parsed.target||100,objetivo:parsed.objetivo||""});
      else await addTarefa({title:parsed.title,note:parsed.note||"",tag:parsed.tag||"UPMIND",reminder_time:""});
      await sb(`notas?id=eq.${nota.id}`,"PATCH",{converted:true});
      setNotas(p=>p.map(n=>n.id===nota.id?{...n,converted:true}:n));
      showToast("Convertido com sucesso");
    } catch { showToast("Erro ao converter","err"); }
  }
  async function removeNota(id) { await sb(`notas?id=eq.${id}`,"DELETE"); setNotas(p=>p.filter(n=>n.id!==id)); }

  const done     = Object.values(checked).filter(Boolean).length;
  const progress = Math.round((done/ROUTINE.length)*100);
  const nowMins  = now.getHours()*60+now.getMinutes();
  const current  = ROUTINE.slice().reverse().find(r=>t2m(r.time)<=nowMins);
  const nextItem = ROUTINE.find(r=>!checked[r.id]&&t2m(r.time)>nowMins);

  const shared = {today,now,tarefas,metas,submetas,notas,checked,chat,setChat,
    addTarefa,toggleTarefa,removeTarefa,addMeta,updateMetaProgress,removeMeta,
    addSubmeta,updateSubmeta,toggleSubmeta,removeSubmeta,addNota,convertNota,removeNota,
    toggleCheck,showToast,progress,done,current,nextItem,loading};

  return (
    <div style={{
      maxWidth:430,margin:"0 auto",height:"100dvh",
      background:"#0c0c0e",color:"#f0f0f2",
      fontFamily:"'Exo 2',system-ui,sans-serif",
      display:"flex",flexDirection:"column",
      position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",
      width:"100%",overflow:"hidden"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@200;300;400;500;600;700&family=Orbitron:wght@400;500;700&display=swap" rel="stylesheet"/>

      {/* Scanline overlay */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:200,background:"none"}}/>

      {/* Grid bg */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0}}/>

      <div style={{height:"env(safe-area-inset-top,8px)",flexShrink:0,position:"relative",zIndex:10}}/>

      <TopBar now={now} progress={progress} done={done} current={current} nextItem={nextItem}/>

      <div style={{flex:1,overflowY:"scroll",overflowX:"hidden",WebkitOverflowScrolling:"touch",paddingBottom:"calc(72px + env(safe-area-inset-bottom,0px))",minHeight:0,position:"relative",zIndex:10}}>
        {loading&&<LoadingScreen/>}
        {!loading&&tab==="home"    &&<HomeTab    {...shared} setTab={setTab}/>}
        {!loading&&tab==="rotina"  &&<RotinaTab  {...shared}/>}
        {!loading&&tab==="tarefas" &&<TarefasTab {...shared}/>}
        {!loading&&tab==="metas"   &&<MetasTab   {...shared}/>}
        {!loading&&tab==="jarvis"  &&<JarvisTab  {...shared}/>}
      </div>

      <BottomNav tab={tab} setTab={setTab}/>

      {toast&&(
        <div style={{
          position:"fixed",top:64,left:"50%",transform:"translateX(-50%)",
          background:"rgba(0,20,40,.95)",
          border:`1px solid ${toast.type==="err"?"#ff4466":"#00d4ff"}`,
          color:toast.type==="err"?"#ff8899":"#00d4ff",
          borderRadius:4,padding:"8px 18px",fontSize:12,fontWeight:500,
          zIndex:999,whiteSpace:"nowrap",
          boxShadow:`0 0 20px ${toast.type==="err"?"rgba(255,68,102,.3)":"rgba(0,212,255,.3)"}`,
          letterSpacing:".06em",fontFamily:"'Orbitron',monospace",
          animation:"toastIn .2s ease"
        }}>{toast.msg}</div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@200;300;400;500;600;700&family=Orbitron:wght@400;500;700&display=swap');
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanline{from{transform:translateY(-100%)}to{transform:translateY(100vh)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 6px rgba(0,212,255,.4)}50%{box-shadow:0 0 14px rgba(0,212,255,.8)}}
        @keyframes hudIn{from{opacity:0;transform:scaleX(.95)}to{opacity:1;transform:scaleX(1)}}
        html,body{height:100%;overflow:hidden;position:fixed;width:100%;background:#020408}
        body{overscroll-behavior:none}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{display:none}
        input,select,textarea{font-size:16px!important;-webkit-appearance:none}
        input[type=time],input[type=date]{color-scheme:dark}
        ::placeholder{color:rgba(255,255,255,.2)!important}
        button{font-family:'Exo 2',system-ui,sans-serif}
      `}</style>
    </div>
  );
}

// ── LOADING ─────────────────────────────────────────────────────
function LoadingScreen() {
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:14}}>
      <div style={{position:"relative",width:48,height:48}}>
        <div style={{position:"absolute",inset:0,border:"1px solid rgba(0,212,255,.2)",borderRadius:"50%"}}/>
        <div style={{position:"absolute",inset:0,border:"1px solid transparent",borderTopColor:"#00d4ff",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
        <div style={{position:"absolute",inset:8,border:"1px solid transparent",borderTopColor:"rgba(0,212,255,.5)",borderRadius:"50%",animation:"spin .7s linear infinite reverse"}}/>
      </div>
      <div style={{fontSize:11,color:"rgba(0,212,255,.5)",letterSpacing:".2em",fontFamily:"'Orbitron',monospace"}}>INICIALIZANDO</div>
    </div>
  );
}

// ── TOPBAR ──────────────────────────────────────────────────────
function TopBar({now,progress,done,current,nextItem}) {
  const catC = current ? CAT_C[current.cat]||"#00d4ff" : "#00d4ff";

  return(
    <div style={{
      padding:"10px 16px 10px",
      background:"rgba(14,14,18,.95)",
      backdropFilter:"blur(16px)",
      borderBottom:"1px solid rgba(255,255,255,.06)",
      flexShrink:0,position:"relative",zIndex:10
    }}>
      {/* Corner decorations */}
      <div style={{position:"absolute",top:0,left:0,width:12,height:12,borderTop:"1px solid #00d4ff",borderLeft:"1px solid #00d4ff"}}/>
      <div style={{position:"absolute",top:0,right:0,width:12,height:12,borderTop:"1px solid #00d4ff",borderRight:"1px solid #00d4ff"}}/>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <span style={{fontSize:10,fontFamily:"'Orbitron',monospace",fontWeight:700,color:"rgba(0,212,255,.6)",letterSpacing:".15em"}}>J.A.R.V.I.S</span>
            <div style={{width:4,height:4,borderRadius:"50%",background:"#00d4ff",animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:9,color:"rgba(180,180,200,.35)",letterSpacing:".1em"}}>ONLINE</span>
          </div>
          <div style={{fontSize:16,fontWeight:600,color:"#f0f0f2",lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {current ? `${current.icon} ${current.label}` : "Bem-vindo, Wanderson"}
          </div>
          <div style={{fontSize:10,color:"rgba(0,212,255,.4)",marginTop:2,letterSpacing:".04em"}}>{fmtDate(now).toUpperCase()} · {fmtTime(now)}</div>
        </div>

        {/* HUD Progress Arc */}
        <div style={{position:"relative",width:60,height:60,flexShrink:0}}>
          <svg width="60" height="60" style={{transform:"rotate(-90deg)"}}>
            <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(0,212,255,.1)" strokeWidth="2"/>
            <circle cx="30" cy="30" r="24" fill="none"
              stroke={progress>=80?"#00ffaa":progress>=40?"#00d4ff":"#aa88ff"}
              strokeWidth="2" strokeLinecap="round"
              strokeDasharray={2*Math.PI*24}
              strokeDashoffset={2*Math.PI*24-(progress/100)*2*Math.PI*24}
              style={{transition:"stroke-dashoffset .6s ease",filter:`drop-shadow(0 0 4px ${progress>=80?"#00ffaa":progress>=40?"#00d4ff":"#aa88ff"})`}}/>
            {/* tick marks */}
            {[0,1,2,3].map(i=>(
              <line key={i}
                x1={30+26*Math.cos((i*90-90)*Math.PI/180)} y1={30+26*Math.sin((i*90-90)*Math.PI/180)}
                x2={30+22*Math.cos((i*90-90)*Math.PI/180)} y2={30+22*Math.sin((i*90-90)*Math.PI/180)}
                stroke="rgba(0,212,255,.3)" strokeWidth="1"/>
            ))}
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:"'Orbitron',monospace",color:"#f0f0f2",lineHeight:1}}>{progress}%</div>
            <div style={{fontSize:8,color:"rgba(0,212,255,.4)",letterSpacing:".06em"}}>{done}/{ROUTINE.length}</div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      {nextItem&&(
        <div style={{
          display:"flex",alignItems:"center",gap:8,
          marginTop:8,padding:"5px 8px",
          background:"rgba(0,212,255,.04)",
          border:"1px solid rgba(0,212,255,.08)",
          borderRadius:3,animation:"hudIn .3s ease"
        }}>
          <div style={{width:5,height:5,borderRadius:1,background:catC,flexShrink:0,animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:10,color:"rgba(0,212,255,.5)",letterSpacing:".06em"}}>PROXIMO</span>
          <span style={{fontSize:10,fontWeight:600,color:catC,letterSpacing:".04em"}}>{nextItem.time} — {nextItem.label.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}

// ── BOTTOM NAV ──────────────────────────────────────────────────
function BottomNav({tab,setTab}) {
  return(
    <div style={{
      position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
      width:"100%",maxWidth:430,
      background:"rgba(10,10,13,.97)",backdropFilter:"blur(20px)",
      borderTop:"1px solid rgba(255,255,255,.07)",
      padding:"6px 0 max(6px,env(safe-area-inset-bottom))",
      display:"flex",zIndex:100
    }}>
      {NAV.map(n=>{
        const active=tab===n.id;
        return(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{
            flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,
            background:"none",border:"none",cursor:"pointer",padding:"4px 2px",transition:"all .2s",
            color:active?"#00d4ff":"rgba(0,180,220,.25)"
          }}>
            <div style={{
              width:34,height:34,borderRadius:6,
              background:active?"rgba(0,212,255,.1)":"transparent",
              border:active?"1px solid rgba(0,212,255,.3)":"1px solid transparent",
              display:"flex",alignItems:"center",justifyContent:"center",transition:"all .25s",
              boxShadow:active?"0 0 12px rgba(0,212,255,.2)":undefined
            }}>{n.svg||n.icon}</div>
            <span style={{fontSize:8,fontWeight:active?700:400,letterSpacing:".08em",fontFamily:"'Orbitron',monospace"}}>{n.label.substring(0,7)}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── SHARED primitives ───────────────────────────────────────────
const C = "#00d4ff";
function HLine() { return <div style={{height:"1px",background:"linear-gradient(90deg,transparent,rgba(0,212,255,.3),transparent)",margin:"10px 0"}}/>; }
function SectionLabel({children}) { return <div style={{fontSize:9,fontFamily:"'Orbitron',monospace",color:"rgba(180,180,200,.35)",letterSpacing:".14em",marginBottom:10}}>{children}</div>; }
function HudBox({children,style,accent}) {
  const ac = accent||C;
  return(
    <div style={{background:"rgba(16,16,20,.9)",border:`1px solid ${ac}22`,borderRadius:4,padding:"12px 14px",position:"relative",...style}}>
      <div style={{position:"absolute",top:0,left:0,width:8,height:8,borderTop:`1px solid ${ac}`,borderLeft:`1px solid ${ac}`}}/>
      <div style={{position:"absolute",bottom:0,right:0,width:8,height:8,borderBottom:`1px solid ${ac}`,borderRight:`1px solid ${ac}`}}/>
      {children}
    </div>
  );
}
function GlowBtn({children,onClick,color,outline,small,style,disabled}) {
  const c=color||C;
  return(
    <button onClick={onClick} disabled={disabled} style={{
      background:outline?"transparent":`${c}18`,
      border:`1px solid ${c}${outline?"66":"44"}`,
      color:c,borderRadius:3,
      padding:small?"4px 10px":"9px 16px",
      fontSize:small?10:12,fontWeight:600,cursor:disabled?"default":"pointer",
      letterSpacing:".06em",fontFamily:"'Exo 2',sans-serif",
      boxShadow:disabled?"none":`0 0 8px ${c}22`,
      transition:"all .2s",opacity:disabled?.4:1,...style
    }}>{children}</button>
  );
}
function DataInput({style,...props}) {
  return <input style={{
    width:"100%",background:"rgba(255,255,255,.05)",
    border:"1px solid rgba(0,212,255,.15)",borderRadius:3,
    padding:"9px 11px",color:"#f0f0f2",fontSize:16,outline:"none",display:"block",
    fontFamily:"'Exo 2',sans-serif",letterSpacing:".02em",...style
  }} {...props}/>;
}
function DataSelect({style,children,...props}) {
  return <select style={{
    width:"100%",background:"rgba(255,255,255,.06)",
    border:"1px solid rgba(0,212,255,.15)",borderRadius:3,
    padding:"9px 11px",color:"#f0f0f2",fontSize:16,outline:"none",display:"block",
    fontFamily:"'Exo 2',sans-serif",...style
  }} {...props}>{children}</select>;
}
function ProgBar({pct,color,height=4}) {
  const c=color||C;
  return(
    <div style={{height,background:"rgba(0,212,255,.06)",borderRadius:99,overflow:"hidden",position:"relative"}}>
      <div style={{height:"100%",borderRadius:99,width:`${Math.min(pct,100)}%`,background:`linear-gradient(90deg,${c}88,${c})`,transition:"width .7s ease",boxShadow:pct>=100?`0 0 8px ${c}`:undefined}}/>
      {pct>=100&&<div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,transparent,${c}22,transparent)`,animation:"scanline 1.5s linear infinite"}}/>}
    </div>
  );
}
function EmptyHud({label}) {
  return(
    <div style={{textAlign:"center",padding:"36px 20px"}}>
      <div style={{fontSize:9,fontFamily:"'Orbitron',monospace",color:"rgba(180,180,200,.25)",letterSpacing:".2em",marginBottom:8}}>SISTEMA VAZIO</div>
      <div style={{fontSize:12,color:"rgba(180,180,200,.4)"}}>{label}</div>
    </div>
  );
}

const fldL = {fontSize:10,color:"rgba(0,212,255,.4)",marginBottom:4,letterSpacing:".08em",fontFamily:"'Orbitron',monospace"};

// ════════════════════════════════════════════════════════════════
// HOME TAB
// ════════════════════════════════════════════════════════════════
function HomeTab({setTab,tarefas,metas,checked,progress,done,current,nextItem,now}) {
  const pend  = tarefas.filter(t=>!t.done).length;
  const aMetA = metas.length?Math.round(metas.reduce((s,m)=>s+(Number(m.current_val)/Math.max(Number(m.target),1))*100,0)/metas.length):0;
  const hour  = now.getHours();
  const saud  = hour<12?"BOAS OPERACOES":hour<18?"BOA TARDE":"BOA NOITE";

  return(
    <div style={{padding:"16px 16px 0",animation:"fadeUp .35s ease"}}>
      {/* Greeting */}
      <div style={{marginBottom:18}}>
        <div style={{fontSize:9,fontFamily:"'Orbitron',monospace",color:"rgba(0,212,255,.4)",letterSpacing:".2em",marginBottom:6}}>{saud}, WANDERSON</div>
        <div style={{fontSize:22,fontWeight:700,color:"#f0f0f2",lineHeight:1.15}}>Central de<br/>Comando</div>
        <div style={{fontSize:10,color:"rgba(180,180,200,.4)",marginTop:4,letterSpacing:".04em"}}>{fmtDate(now).toUpperCase()}</div>
      </div>

      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[
          {l:"MISSOES HOJE",    v:`${done}/${ROUTINE.length}`, c:"#00d4ff", sub:`${progress}% do dia`, tab:"rotina"},
          {l:"OPS PENDENTES",  v:pend,                         c:"#ffcc44", sub:"operacoes ativas",    tab:"tarefas"},
          {l:"ALVOS ATIVOS",   v:metas.filter(m=>!m.done).length, c:"#aa88ff", sub:`media ${aMetA}%`, tab:"metas"},
          {l:"STATUS IA",      v:"ONLINE",                     c:"#00ffaa", sub:"J.A.R.V.I.S pronto",  tab:"jarvis"},
        ].map(s=>(
          <button key={s.l} onClick={()=>setTab(s.tab)} style={{background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}}>
            <HudBox accent={s.c} style={{height:"100%"}}>
              <div style={{fontSize:8,fontFamily:"'Orbitron',monospace",color:`${s.c}88`,letterSpacing:".12em",marginBottom:4}}>{s.l}</div>
              <div style={{fontSize:20,fontWeight:700,color:s.c,lineHeight:1,fontFamily:"'Orbitron',monospace"}}>{s.v}</div>
              <div style={{fontSize:10,color:"rgba(180,180,200,.4)",marginTop:3}}>{s.sub}</div>
            </HudBox>
          </button>
        ))}
      </div>

      {/* Progress visual */}
      <HudBox style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <SectionLabel>PROGRESSO DO DIA</SectionLabel>
          <span style={{fontSize:16,fontWeight:700,fontFamily:"'Orbitron',monospace",color:progress>=80?"#00ffaa":progress>=40?"#00d4ff":"#aa88ff"}}>{progress}%</span>
        </div>
        <ProgBar pct={progress} color={progress>=80?"#00ffaa":progress>=40?"#00d4ff":"#aa88ff"} height={6}/>
        {current&&(
          <div style={{display:"flex",alignItems:"center",gap:7,marginTop:10}}>
            <div style={{width:5,height:5,borderRadius:1,background:CAT_C[current.cat]||C,animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:10,color:CAT_C[current.cat]||C,fontWeight:600}}>{current.icon} {current.label}</span>
          </div>
        )}
      </HudBox>

      {/* Next mission */}
      {nextItem&&(
        <HudBox accent="#ffcc44" style={{marginBottom:12}}>
          <SectionLabel>PROXIMA MISSAO</SectionLabel>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:3,background:"rgba(255,204,68,.1)",border:"1px solid rgba(255,204,68,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{nextItem.icon}</div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#f0f0f2"}}>{nextItem.label}</div>
              <div style={{fontSize:10,color:"rgba(0,212,255,.4)",marginTop:2}}>{nextItem.time} · {nextItem.desc.substring(0,36)}...</div>
            </div>
          </div>
        </HudBox>
      )}

      {/* Pending tasks */}
      {pend>0&&(
        <HudBox style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <SectionLabel>OPS PENDENTES</SectionLabel>
            <button onClick={()=>setTab("tarefas")} style={{fontSize:9,fontFamily:"'Orbitron',monospace",color:"rgba(0,212,255,.5)",background:"none",border:"none",cursor:"pointer",letterSpacing:".08em"}}>VER TUDO</button>
          </div>
          {tarefas.filter(t=>!t.done).slice(0,4).map((t,i)=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid rgba(0,212,255,.05)"}}>
              <div style={{width:4,height:4,borderRadius:1,background:TAG_COLORS[t.tag]||C,flexShrink:0}}/>
              <span style={{fontSize:12,color:"rgba(224,240,255,.7)",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</span>
              {t.reminder_time&&<span style={{fontSize:9,color:"rgba(180,180,200,.4)"}}>{t.reminder_time}</span>}
            </div>
          ))}
        </HudBox>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROTINA TAB
// ════════════════════════════════════════════════════════════════
function RotinaTab({checked,toggleCheck}) {
  const [selCat,setSelCat] = useState("TODOS");
  const cats = ["TODOS",...Object.keys(CAT_C)];
  const filtered = selCat==="TODOS"?ROUTINE:ROUTINE.filter(r=>r.cat===selCat);

  return(
    <div style={{padding:"14px 16px 0",animation:"fadeUp .35s ease"}}>
      <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:10,marginBottom:12,scrollbarWidth:"none"}}>
        {cats.map(c=>{
          const active=selCat===c;
          const cc=CAT_C[c]||C;
          return(
            <button key={c} onClick={()=>setSelCat(c)} style={{
              fontSize:8,fontFamily:"'Orbitron',monospace",letterSpacing:".1em",
              padding:"5px 10px",borderRadius:2,whiteSpace:"nowrap",flexShrink:0,
              background:active?`${cc}18`:"rgba(0,20,40,.6)",
              color:active?cc:"rgba(255,255,255,.25)",
              border:`1px solid ${active?`${cc}55`:"rgba(0,212,255,.1)"}`,
              cursor:"pointer",transition:"all .2s"
            }}>{c}</button>
          );
        })}
      </div>

      {filtered.map((item,idx)=>{
        const ck=!!checked[item.id];
        const cc=CAT_C[item.cat]||C;
        const nm=new Date().getHours()*60+new Date().getMinutes();
        const next=ROUTINE[ROUTINE.indexOf(item)+1];
        const isActive=nm>=t2m(item.time)&&(!next||nm<t2m(next.time))&&!ck;

        return(
          <div key={item.id} onClick={()=>toggleCheck(item.id)}
            style={{
              display:"flex",gap:10,alignItems:"center",
              background:isActive?`${cc}08`:"rgba(0,12,28,.6)",
              borderLeft:`2px solid ${ck?"rgba(0,212,255,.08)":cc}`,
              borderTop:"1px solid rgba(0,212,255,.04)",
              borderRight:"1px solid rgba(0,212,255,.04)",
              borderBottom:"1px solid rgba(0,212,255,.04)",
              borderRadius:"0 3px 3px 0",
              padding:"10px 12px",marginBottom:5,
              cursor:"pointer",opacity:ck?.35:1,transition:"all .2s",
              boxShadow:isActive?`inset 0 0 20px ${cc}08`:undefined,
              animation:`fadeUp .2s ease ${idx*.02}s both`
            }}>
            <div style={{minWidth:36,textAlign:"right"}}>
              <span style={{fontSize:10,fontFamily:"'Orbitron',monospace",color:ck?"rgba(0,212,255,.15)":cc,letterSpacing:".04em"}}>{item.time}</span>
            </div>
            <div style={{
              width:16,height:16,borderRadius:2,flexShrink:0,
              background:ck?`${cc}33`:"transparent",
              border:`1px solid ${ck?cc:"rgba(0,212,255,.2)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",
              boxShadow:ck?`0 0 6px ${cc}44`:undefined
            }}>
              {ck&&<svg viewBox="0 0 24 24" fill="none" stroke={cc} strokeWidth="3" style={{width:9,height:9}}><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <div style={{width:28,height:28,borderRadius:3,background:`${cc}10`,border:`1px solid ${cc}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{item.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:ck?"rgba(0,212,255,.25)":"#e0f0ff",textDecoration:ck?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</div>
              <div style={{fontSize:9,color:"rgba(180,180,200,.3)",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",letterSpacing:".02em"}}>{item.desc}</div>
            </div>
            <span style={{fontSize:8,fontFamily:"'Orbitron',monospace",padding:"2px 5px",borderRadius:2,background:`${cc}18`,color:cc,flexShrink:0,letterSpacing:".06em"}}>{item.cat}</span>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAREFAS TAB
// ════════════════════════════════════════════════════════════════
function TarefasTab({tarefas,addTarefa,toggleTarefa,removeTarefa,showToast}) {
  const [form,setForm]   = useState({title:"",note:"",tag:"UPMIND",reminder_time:""});
  const [open,setOpen]   = useState(false);

  const add = async() => {
    if(!form.title.trim()) return;
    await addTarefa(form);
    setForm({title:"",note:"",tag:"UPMIND",reminder_time:""});
    setOpen(false);
  };

  const pending = tarefas.filter(t=>!t.done);
  const done    = tarefas.filter(t=>t.done);

  return(
    <div style={{padding:"14px 16px 0",animation:"fadeUp .35s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
        {[
          {l:"TOTAL",     v:tarefas.length, c:C},
          {l:"PENDENTE",  v:pending.length, c:"#ffcc44"},
          {l:"CONCLUIDO", v:done.length,    c:"#00ffaa"},
        ].map(s=>(
          <HudBox key={s.l} accent={s.c} style={{padding:"8px 10px"}}>
            <div style={{fontSize:16,fontWeight:700,fontFamily:"'Orbitron',monospace",color:s.c}}>{s.v}</div>
            <div style={{fontSize:8,color:"rgba(180,180,200,.4)",fontFamily:"'Orbitron',monospace",letterSpacing:".1em",marginTop:2}}>{s.l}</div>
          </HudBox>
        ))}
      </div>

      {open&&(
        <HudBox style={{marginBottom:12,animation:"hudIn .2s ease"}}>
          <SectionLabel>NOVA OPERACAO</SectionLabel>
          <DataInput value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Titulo da operacao..." autoFocus/>
          <DataInput value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Observacao..." style={{marginTop:6}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>
            <div><div style={fldL}>CATEGORIA</div><DataSelect value={form.tag} onChange={e=>setForm(f=>({...f,tag:e.target.value}))}>{Object.keys(TAG_COLORS).map(k=><option key={k}>{k}</option>)}</DataSelect></div>
            <div><div style={fldL}>LEMBRETE</div><DataInput type="time" value={form.reminder_time} onChange={e=>setForm(f=>({...f,reminder_time:e.target.value}))}/></div>
          </div>
          <div style={{display:"flex",gap:6,marginTop:10}}>
            <GlowBtn onClick={add} style={{flex:1}}>EXECUTAR</GlowBtn>
            <GlowBtn outline onClick={()=>setOpen(false)} style={{flex:1}}>CANCELAR</GlowBtn>
          </div>
        </HudBox>
      )}

      {pending.length===0&&!open&&<EmptyHud label="Nenhuma operacao pendente"/>}
      {pending.map((t,i)=><OpCard key={t.id} t={t} onToggle={toggleTarefa} onRemove={removeTarefa} idx={i}/>)}

      {done.length>0&&(
        <div style={{marginTop:16}}>
          <SectionLabel>CONCLUIDAS ({done.length})</SectionLabel>
          {done.map((t,i)=><OpCard key={t.id} t={t} onToggle={toggleTarefa} onRemove={removeTarefa} idx={i}/>)}
        </div>
      )}

      {!open&&(
        <button onClick={()=>setOpen(true)} style={{
          position:"fixed",
          bottom:"calc(72px + env(safe-area-inset-bottom,0px) + 14px)",right:16,
          width:44,height:44,borderRadius:6,
          background:"rgba(0,212,255,.12)",
          border:"1px solid rgba(0,212,255,.4)",
          color:"#00d4ff",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 0 16px rgba(0,212,255,.3)",zIndex:50,
          animation:"glow 2s infinite"
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:20,height:20}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}
    </div>
  );
}

function OpCard({t,onToggle,onRemove,idx}) {
  const c=TAG_COLORS[t.tag]||C;
  return(
    <div style={{
      display:"flex",gap:10,alignItems:"flex-start",
      background:"#111115",
      borderLeft:`2px solid ${t.done?"rgba(0,212,255,.08)":c}`,
      border:"1px solid rgba(255,255,255,.05)",
      borderRadius:"0 3px 3px 0",padding:"10px 12px",marginBottom:5,
      opacity:t.done?.3:1,animation:`fadeUp .2s ease ${idx*.03}s both`,transition:"opacity .2s"
    }}>
      <div onClick={()=>onToggle(t.id)} style={{
        width:16,height:16,borderRadius:2,flexShrink:0,marginTop:2,
        background:t.done?`${c}33`:"transparent",
        border:`1px solid ${t.done?c:"rgba(0,212,255,.2)"}`,
        display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s"
      }}>
        {t.done&&<svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" style={{width:9,height:9}}><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:500,color:t.done?"rgba(0,212,255,.2)":"#e0f0ff",textDecoration:t.done?"line-through":"none"}}>{t.title}</div>
        {t.note&&<div style={{fontSize:10,color:"rgba(180,180,200,.4)",marginTop:2}}>{t.note}</div>}
        <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:8,fontFamily:"'Orbitron',monospace",padding:"2px 6px",borderRadius:2,background:`${c}18`,color:c,letterSpacing:".08em"}}>{t.tag}</span>
          {t.reminder_time&&<span style={{fontSize:9,color:"rgba(180,180,200,.4)"}}>⏰ {t.reminder_time}</span>}
          <span style={{fontSize:9,color:"rgba(255,255,255,.12)"}}>{fmtDT(t.created_at)}</span>
        </div>
      </div>
      <button onClick={()=>onRemove(t.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,.12)",cursor:"pointer",fontSize:16,lineHeight:1,padding:0}}>×</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// METAS TAB
// ════════════════════════════════════════════════════════════════
function MetasTab({metas,submetas,addMeta,updateMetaProgress,removeMeta,showToast,addSubmeta,updateSubmeta,toggleSubmeta,removeSubmeta}) {
  const [selCat,setSelCat] = useState("TODOS");
  const [detail,setDetail] = useState(null);
  const [open,setOpen]     = useState(false);
  const [form,setForm]     = useState({title:"",descricao:"",cat:"UPMIND",tipo:"Mensal",target:100,prazo:"",objetivo:""});

  const add = async() => {
    if(!form.title.trim()) return;
    await addMeta(form);
    setForm({title:"",descricao:"",cat:"UPMIND",tipo:"Mensal",target:100,prazo:"",objetivo:""});
    setOpen(false);
  };

  const cats = ["TODOS",...META_CATS];
  const filtered = selCat==="TODOS"?metas:metas.filter(m=>m.cat===selCat);
  const pending  = filtered.filter(m=>!m.done);
  const done     = filtered.filter(m=>m.done);
  const avg      = metas.length?Math.round(metas.reduce((s,m)=>s+(Number(m.current_val)/Math.max(Number(m.target),1))*100,0)/metas.length):0;

  if(detail) return(
    <MetaDetail
      meta={detail} onBack={()=>setDetail(null)}
      onProgress={updateMetaProgress} onRemove={removeMeta}
      submetas={submetas.filter(s=>s.meta_id===detail.id)}
      addSubmeta={addSubmeta} updateSubmeta={updateSubmeta}
      toggleSubmeta={toggleSubmeta} removeSubmeta={removeSubmeta}/>
  );

  return(
    <div style={{padding:"14px 16px 0",animation:"fadeUp .35s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
        {[
          {l:"TOTAL",   v:metas.length,                  c:C},
          {l:"ATIVOS",  v:metas.filter(m=>!m.done).length, c:"#aa88ff"},
          {l:"MEDIA",   v:avg+"%",                        c:"#ffcc44"},
        ].map(s=>(
          <HudBox key={s.l} accent={s.c} style={{padding:"8px 10px"}}>
            <div style={{fontSize:16,fontWeight:700,fontFamily:"'Orbitron',monospace",color:s.c}}>{s.v}</div>
            <div style={{fontSize:8,color:"rgba(180,180,200,.4)",fontFamily:"'Orbitron',monospace",letterSpacing:".1em",marginTop:2}}>{s.l}</div>
          </HudBox>
        ))}
      </div>

      <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:8,marginBottom:12,scrollbarWidth:"none"}}>
        {cats.map(c=>{
          const active=selCat===c;
          const cc=META_COLORS[c]||C;
          return(
            <button key={c} onClick={()=>setSelCat(c)} style={{
              fontSize:8,fontFamily:"'Orbitron',monospace",letterSpacing:".08em",
              padding:"5px 10px",borderRadius:2,whiteSpace:"nowrap",flexShrink:0,
              background:active?`${cc}18`:"rgba(0,20,40,.6)",
              color:active?cc:"rgba(255,255,255,.25)",
              border:`1px solid ${active?`${cc}55`:"rgba(0,212,255,.1)"}`,
              cursor:"pointer",transition:"all .2s"
            }}>{META_ICONS[c]||""} {c}</button>
          );
        })}
      </div>

      {open&&(
        <HudBox style={{marginBottom:12,animation:"hudIn .2s ease"}}>
          <SectionLabel>NOVO ALVO</SectionLabel>
          <DataInput value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Alvo (ex: Ler 12 livros em 2026)..." autoFocus/>
          <DataInput value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Como vai medir..." style={{marginTop:6}}/>
          <DataInput value={form.objetivo} onChange={e=>setForm(f=>({...f,objetivo:e.target.value}))} placeholder="Por que isso importa..." style={{marginTop:6}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>
            <div><div style={fldL}>CATEGORIA</div><DataSelect value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>{META_CATS.map(c=><option key={c}>{c}</option>)}</DataSelect></div>
            <div><div style={fldL}>TIPO</div><DataSelect value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>{["Diaria","Semanal","Mensal","Trimestral","Anual"].map(t=><option key={t}>{t}</option>)}</DataSelect></div>
            <div><div style={fldL}>META (N)</div><DataInput type="number" value={form.target} onChange={e=>setForm(f=>({...f,target:Number(e.target.value)}))}/></div>
            <div><div style={fldL}>PRAZO</div><DataInput type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))}/></div>
          </div>
          <div style={{display:"flex",gap:6,marginTop:10}}>
            <GlowBtn onClick={add} color="#aa88ff" style={{flex:1}}>REGISTRAR</GlowBtn>
            <GlowBtn outline color="#aa88ff" onClick={()=>setOpen(false)} style={{flex:1}}>CANCELAR</GlowBtn>
          </div>
        </HudBox>
      )}

      {pending.length===0&&selCat==="TODOS"&&!open&&<EmptyHud label="Nenhum alvo registrado"/>}
      {pending.map((m,i)=><AlvoCard key={m.id} m={m} onPress={()=>setDetail(m)} onProgress={updateMetaProgress} onRemove={removeMeta} idx={i} subCount={submetas.filter(s=>s.meta_id===m.id).length} subDone={submetas.filter(s=>s.meta_id===m.id&&s.done).length}/>)}

      {done.length>0&&(
        <div style={{marginTop:16}}>
          <SectionLabel>ALVOS ATINGIDOS ({done.length})</SectionLabel>
          {done.map((m,i)=><AlvoCard key={m.id} m={m} onPress={()=>setDetail(m)} onProgress={updateMetaProgress} onRemove={removeMeta} idx={i} subCount={submetas.filter(s=>s.meta_id===m.id).length} subDone={submetas.filter(s=>s.meta_id===m.id&&s.done).length}/>)}
        </div>
      )}

      {!open&&(
        <button onClick={()=>setOpen(true)} style={{
          position:"fixed",bottom:"calc(72px + env(safe-area-inset-bottom,0px) + 14px)",right:16,
          width:44,height:44,borderRadius:6,
          background:"rgba(170,136,255,.12)",border:"1px solid rgba(170,136,255,.4)",
          color:"#aa88ff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 0 16px rgba(170,136,255,.3)",zIndex:50,animation:"glow 2s infinite"
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:20,height:20}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}
    </div>
  );
}

function AlvoCard({m,onPress,onProgress,onRemove,idx,subCount,subDone}) {
  const c=META_COLORS[m.cat]||"#aa88ff";
  const pct=Math.round((Number(m.current_val)/Math.max(Number(m.target),1))*100);
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(m.current_val);

  return(
    <div style={{
      background:"#111115",
      borderLeft:`2px solid ${m.done?"rgba(0,212,255,.08)":c}`,
      border:"1px solid rgba(255,255,255,.05)",
      borderRadius:"0 3px 3px 0",padding:"12px",marginBottom:6,
      opacity:m.done?.4:1,animation:`fadeUp .2s ease ${idx*.03}s both`
    }}>
      <div onClick={onPress} style={{cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
              <span style={{fontSize:14}}>{META_ICONS[m.cat]||"X"}</span>
              <span style={{fontSize:13,fontWeight:600,color:m.done?"rgba(0,212,255,.2)":"#e0f0ff",textDecoration:m.done?"line-through":"none"}}>{m.title}</span>
            </div>
            {m.descricao&&<div style={{fontSize:10,color:"rgba(180,180,200,.4)",marginLeft:20}}>{m.descricao}</div>}
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
            <span style={{fontSize:8,fontFamily:"'Orbitron',monospace",padding:"2px 6px",borderRadius:2,background:`${c}18`,color:c,letterSpacing:".08em"}}>{m.cat}</span>
            <button onClick={e=>{e.stopPropagation();onRemove(m.id);}} style={{background:"none",border:"none",color:"rgba(255,255,255,.12)",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
          </div>
        </div>

        <div style={{marginBottom:6}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:9,color:"rgba(180,180,200,.4)"}}>{m.current_val} / {m.target}</span>
            <span style={{fontSize:13,fontWeight:700,fontFamily:"'Orbitron',monospace",color:pct>=100?"#00ffaa":pct>=60?c:"#ffcc44"}}>{pct}%</span>
          </div>
          <ProgBar pct={pct} color={pct>=100?"#00ffaa":c} height={5}/>
        </div>

        {subCount>0&&(
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
            <span style={{fontSize:9,color:"rgba(180,180,200,.4)"}}>SUB-ALVOS: {subDone}/{subCount}</span>
            <div style={{flex:1,height:3,background:"rgba(0,212,255,.06)",borderRadius:99}}>
              <div style={{height:3,borderRadius:99,width:`${Math.round(subDone/Math.max(subCount,1)*100)}%`,background:`${c}88`,transition:"width .5s"}}/>
            </div>
          </div>
        )}
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:5}}>
          <span style={{fontSize:8,fontFamily:"'Orbitron',monospace",padding:"2px 6px",borderRadius:2,background:"rgba(0,212,255,.06)",color:"rgba(180,180,200,.4)",letterSpacing:".08em"}}>{m.tipo}</span>
          {m.prazo&&<span style={{fontSize:8,fontFamily:"'Orbitron',monospace",padding:"2px 6px",borderRadius:2,background:"rgba(0,212,255,.06)",color:"rgba(180,180,200,.4)",letterSpacing:".06em"}}>ATE {fmtShort(m.prazo)}</span>}
        </div>
        {!m.done&&(
          editing?(
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <DataInput type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:70}}/>
              <GlowBtn small color={c} onClick={()=>{onProgress(m.id,val);setEditing(false);}}>OK</GlowBtn>
            </div>
          ):(
            <button onClick={()=>{setVal(m.current_val);setEditing(true);}} style={{fontSize:9,fontFamily:"'Orbitron',monospace",background:"rgba(0,212,255,.06)",border:"1px solid rgba(0,212,255,.1)",color:"rgba(0,212,255,.4)",borderRadius:2,padding:"3px 8px",cursor:"pointer",letterSpacing:".08em"}}>ATUALIZAR</button>
          )
        )}
      </div>
    </div>
  );
}

// ── META DETAIL ─────────────────────────────────────────────────
function MetaDetail({meta,onBack,onProgress,onRemove,submetas,addSubmeta,updateSubmeta,toggleSubmeta,removeSubmeta}) {
  const c=META_COLORS[meta.cat]||"#aa88ff";
  const pct=Math.round((Number(meta.current_val)/Math.max(Number(meta.target),1))*100);
  const [val,setVal]=useState(meta.current_val);
  const [editing,setEditing]=useState(false);
  const [showSubForm,setShowSubForm]=useState(false);
  const [subForm,setSubForm]=useState({title:"",descricao:"",target:1,unidade:"un"});
  const addSub=async()=>{ if(!subForm.title.trim())return; await addSubmeta(meta.id,subForm); setSubForm({title:"",descricao:"",target:1,unidade:"un"}); setShowSubForm(false); };
  const subDone=submetas.filter(s=>s.done);
  const subPend=submetas.filter(s=>!s.done);
  const subPct=submetas.length?Math.round(subDone.length/submetas.length*100):0;

  return(
    <div style={{padding:"14px 16px 0",animation:"fadeUp .3s ease"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"rgba(0,212,255,.4)",cursor:"pointer",fontSize:10,marginBottom:14,padding:0,fontFamily:"'Orbitron',monospace",letterSpacing:".1em"}}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14}}><polyline points="15 18 9 12 15 6"/></svg>
        VOLTAR
      </button>

      <HudBox accent={c} style={{marginBottom:12}}>
        <div style={{fontSize:24,marginBottom:6}}>{META_ICONS[meta.cat]||"X"}</div>
        <div style={{fontSize:16,fontWeight:700,color:"#f0f0f2",marginBottom:3}}>{meta.title}</div>
        {meta.descricao&&<div style={{fontSize:11,color:"rgba(180,180,200,.45)",marginBottom:8}}>{meta.descricao}</div>}
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          <span style={{fontSize:8,fontFamily:"'Orbitron',monospace",padding:"2px 7px",borderRadius:2,background:`${c}22`,color:c,letterSpacing:".1em"}}>{meta.cat}</span>
          <span style={{fontSize:8,fontFamily:"'Orbitron',monospace",padding:"2px 7px",borderRadius:2,background:"rgba(0,212,255,.08)",color:"rgba(0,212,255,.4)",letterSpacing:".08em"}}>{meta.tipo}</span>
          {meta.prazo&&<span style={{fontSize:8,fontFamily:"'Orbitron',monospace",padding:"2px 7px",borderRadius:2,background:"rgba(0,212,255,.08)",color:"rgba(0,212,255,.4)",letterSpacing:".08em"}}>ATE {fmtShort(meta.prazo)}</span>}
        </div>
      </HudBox>

      <HudBox accent={c} style={{marginBottom:12}}>
        <SectionLabel>PROGRESSO GERAL</SectionLabel>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:32,fontWeight:700,fontFamily:"'Orbitron',monospace",color:pct>=100?"#00ffaa":c,lineHeight:1}}>{pct}%</div>
            <div style={{fontSize:10,color:"rgba(180,180,200,.4)",marginTop:3}}>{meta.current_val} DE {meta.target}</div>
          </div>
          {!meta.done&&(editing?(
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <DataInput type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:80}}/>
              <GlowBtn color={c} onClick={()=>{onProgress(meta.id,val);setEditing(false);}}>OK</GlowBtn>
            </div>
          ):(
            <GlowBtn color={c} onClick={()=>{setVal(meta.current_val);setEditing(true);}}>ATUALIZAR</GlowBtn>
          ))}
        </div>
        <ProgBar pct={pct} color={pct>=100?"#00ffaa":c} height={8}/>
        {submetas.length>0&&<div style={{fontSize:9,color:"rgba(180,180,200,.4)",marginTop:6,fontFamily:"'Orbitron',monospace",letterSpacing:".06em"}}>SUB-ALVOS: {subDone.length}/{submetas.length} · {subPct}%</div>}
      </HudBox>

      {meta.objetivo&&(
        <HudBox style={{marginBottom:12}}>
          <SectionLabel>OBJETIVO</SectionLabel>
          <div style={{fontSize:12,color:"rgba(224,240,255,.6)",lineHeight:1.6}}>{meta.objetivo}</div>
        </HudBox>
      )}

      <HudBox accent={c} style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <SectionLabel>SUB-ALVOS ({submetas.length})</SectionLabel>
          <GlowBtn small color={c} outline={showSubForm} onClick={()=>setShowSubForm(o=>!o)}>
            {showSubForm?"CANCELAR":"+ NOVO"}
          </GlowBtn>
        </div>

        {showSubForm&&(
          <div style={{marginBottom:12,animation:"hudIn .2s ease"}}>
            <HLine/>
            <DataInput value={subForm.title} onChange={e=>setSubForm(f=>({...f,title:e.target.value}))} placeholder="Ex: Janeiro - Livro X / Guardar R$500..." autoFocus/>
            <DataInput value={subForm.descricao} onChange={e=>setSubForm(f=>({...f,descricao:e.target.value}))} placeholder="Detalhes..." style={{marginTop:6}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>
              <div><div style={fldL}>META</div><DataInput type="number" value={subForm.target} onChange={e=>setSubForm(f=>({...f,target:Number(e.target.value)}))}/></div>
              <div><div style={fldL}>UNIDADE</div><DataInput value={subForm.unidade} onChange={e=>setSubForm(f=>({...f,unidade:e.target.value}))} placeholder="livros, R$, km..."/></div>
            </div>
            <GlowBtn color={c} onClick={addSub} style={{marginTop:8,width:"100%"}}>CRIAR SUB-ALVO</GlowBtn>
            <HLine/>
          </div>
        )}

        {submetas.length===0&&!showSubForm&&<div style={{textAlign:"center",padding:"14px 0",fontSize:10,color:"rgba(180,180,200,.25)",fontFamily:"'Orbitron',monospace",letterSpacing:".12em"}}>NENHUM SUB-ALVO</div>}
        {subPend.map((s,i)=><SubAlvo key={s.id} s={s} c={c} onToggle={toggleSubmeta} onUpdate={updateSubmeta} onRemove={removeSubmeta} idx={i}/>)}
        {subDone.length>0&&(
          <div style={{marginTop:10}}>
            <div style={{fontSize:8,fontFamily:"'Orbitron',monospace",color:"rgba(180,180,200,.25)",letterSpacing:".1em",marginBottom:6}}>CONCLUIDOS ({subDone.length})</div>
            {subDone.map((s,i)=><SubAlvo key={s.id} s={s} c={c} onToggle={toggleSubmeta} onUpdate={updateSubmeta} onRemove={removeSubmeta} idx={i}/>)}
          </div>
        )}
      </HudBox>

      <HudBox style={{marginBottom:12}}>
        <SectionLabel>DADOS</SectionLabel>
        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(0,212,255,.05)"}}>
          <span style={{fontSize:10,color:"rgba(180,180,200,.4)"}}>CRIADO</span>
          <span style={{fontSize:10,color:"rgba(224,240,255,.5)"}}>{fmtDT(meta.created_at)}</span>
        </div>
        {meta.done_at&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{fontSize:10,color:"rgba(180,180,200,.4)"}}>CONCLUIDO</span>
          <span style={{fontSize:10,color:"#00ffaa"}}>{fmtDT(meta.done_at)}</span>
        </div>}
      </HudBox>

      <button onClick={()=>{onRemove(meta.id);onBack();}} style={{width:"100%",padding:10,borderRadius:3,background:"rgba(255,68,102,.06)",border:"1px solid rgba(255,68,102,.2)",color:"rgba(255,68,102,.6)",fontSize:10,cursor:"pointer",fontFamily:"'Orbitron',monospace",letterSpacing:".1em",marginBottom:20}}>
        REMOVER ALVO
      </button>
    </div>
  );
}

function SubAlvo({s,c,onToggle,onUpdate,onRemove,idx}) {
  const pct=Math.round((Number(s.current_val)/Math.max(Number(s.target),1))*100);
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(s.current_val);
  return(
    <div style={{borderLeft:`1px solid ${s.done?"rgba(0,212,255,.06)":c}55`,paddingLeft:10,marginBottom:8,opacity:s.done?.4:1,animation:`fadeUp .18s ease ${idx*.025}s both`}}>
      <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
        <div onClick={()=>onToggle(s.id)} style={{width:14,height:14,borderRadius:2,flexShrink:0,marginTop:2,background:s.done?`${c}33`:"transparent",border:`1px solid ${s.done?c:"rgba(0,212,255,.2)"}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s"}}>
          {s.done&&<svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" style={{width:8,height:8}}><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,color:s.done?"rgba(0,212,255,.2)":"#e0f0ff",textDecoration:s.done?"line-through":"none"}}>{s.title}</div>
          {s.descricao&&<div style={{fontSize:9,color:"rgba(180,180,200,.3)",marginTop:1}}>{s.descricao}</div>}
          {Number(s.target)>1&&(
            <div style={{marginTop:5}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:9,color:"rgba(180,180,200,.3)"}}>{s.current_val} / {s.target} {s.unidade}</span>
                <span style={{fontSize:10,fontFamily:"'Orbitron',monospace",fontWeight:700,color:pct>=100?"#00ffaa":c}}>{pct}%</span>
              </div>
              <ProgBar pct={pct} color={pct>=100?"#00ffaa":c} height={3}/>
            </div>
          )}
        </div>
        <button onClick={()=>onRemove(s.id)} style={{background:"none",border:"none",color:"rgba(0,212,255,.1)",cursor:"pointer",fontSize:14,lineHeight:1,padding:0,flexShrink:0}}>×</button>
      </div>
      {!s.done&&Number(s.target)>1&&(
        <div style={{marginTop:6,display:"flex",gap:5,alignItems:"center",paddingLeft:22}}>
          {editing?(<><DataInput type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:70}}/><GlowBtn small color={c} onClick={()=>{onUpdate(s.id,val);setEditing(false);}}>OK</GlowBtn><GlowBtn outline small color="rgba(0,212,255,.3)" onClick={()=>setEditing(false)}>X</GlowBtn></>
          ):(
            <button onClick={()=>{setVal(s.current_val);setEditing(true);}} style={{fontSize:8,fontFamily:"'Orbitron',monospace",background:"rgba(0,212,255,.06)",border:"1px solid rgba(0,212,255,.1)",color:"rgba(180,180,200,.45)",borderRadius:2,padding:"2px 7px",cursor:"pointer",letterSpacing:".08em"}}>UPDATE</button>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// JARVIS TAB
// ════════════════════════════════════════════════════════════════
function JarvisTab({chat,setChat,addTarefa,addMeta,showToast,tarefas,checked,progress,nextItem,metas,notas,addNota,convertNota,removeNota}) {
  const [input,setInput]   = useState("");
  const [loading,setLoading] = useState(false);
  const [mode,setMode]     = useState("chat");
  const [text,setText]     = useState("");
  const [recording,setRecording] = useState(false);
  const endRef  = useRef(null);
  const mediaRef= useRef(null);
  const chunks  = useRef([]);
  const pending = tarefas.filter(t=>!t.done).length;
  const doneB   = Object.values(checked).filter(Boolean).length;

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[chat]);

  const send = async(text) => {
    if(!text.trim()||loading) return;
    const uMsg={role:"user",content:text};
    const next=[...chat,uMsg]; setChat(next); setInput(""); setLoading(true);
    const ctx=`[STATUS ${new Date().toLocaleDateString("pt-BR")}: Rotina ${progress}% (${doneB}/${ROUTINE.length}). Proximo: ${nextItem?`${nextItem.time} - ${nextItem.label}`:"concluido"}. Tarefas pendentes: ${pending}. Metas ativas: ${metas.filter(m=>!m.done).length}. Se identificar tarefa ou meta na mensagem, adicione ao final: CADASTRAR:{"tipo":"tarefa|meta","title":"...","tag":"UPMIND","cat":"UPMIND","target":100}]\n\n${text}`;
    try {
      const reply=await askAI([...chat,{role:"user",content:ctx}]);
      const match=reply.match(/CADASTRAR:(\{.*?\})/s);
      let clean=reply;
      if(match) {
        clean=reply.replace(/CADASTRAR:\{.*?\}/s,"").trim();
        try {
          const d=JSON.parse(match[1]);
          if(d.tipo==="meta") { await addMeta({title:d.title,cat:d.cat||"UPMIND",tipo:"Mensal",target:d.target||100,descricao:"",objetivo:""}); showToast("Meta registrada por J.A.R.V.I.S"); }
          else { await addTarefa({title:d.title,tag:d.tag||"UPMIND",note:"",reminder_time:""}); showToast("Operacao criada por J.A.R.V.I.S"); }
        } catch {}
      }
      setChat([...next,{role:"assistant",content:clean}]);
    } catch { setChat([...next,{role:"assistant",content:"SISTEMA OFFLINE. Verifique a API key."}]); }
    setLoading(false);
  };
  const startRec=async()=>{ try { const stream=await navigator.mediaDevices.getUserMedia({audio:true}); const mr=new MediaRecorder(stream); chunks.current=[]; mr.ondataavailable=e=>chunks.current.push(e.data); mr.onstop=()=>{ stream.getTracks().forEach(t=>t.stop()); setRecording(false); showToast("Audio registrado"); }; mr.start(); mediaRef.current=mr; setRecording(true); } catch { showToast("Microfone bloqueado","err"); } };
  const stopRec=()=>{ if(mediaRef.current&&recording) mediaRef.current.stop(); };
  const quick=["Como esta meu dia?","O que ainda preciso fazer?","Analise minhas metas","Qual meu foco agora?"];
  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100dvh - 140px)",animation:"fadeUp .35s ease"}}>
      <div style={{display:"flex",background:"rgba(0,8,20,.9)",borderBottom:"1px solid rgba(0,212,255,.08)",flexShrink:0}}>
        {[{id:"chat",l:"CHAT"},{id:"notas",l:"NOTAS"}].map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)} style={{flex:1,padding:"9px",background:"none",border:"none",cursor:"pointer",fontSize:9,fontFamily:"'Orbitron',monospace",fontWeight:mode===m.id?700:400,color:mode===m.id?"#00d4ff":"rgba(0,180,220,.2)",borderBottom:mode===m.id?"1px solid #00d4ff":"1px solid transparent",letterSpacing:".12em",transition:"all .2s"}}>{m.l}</button>
        ))}
      </div>
      {mode==="notas"?(
        <div style={{flex:1,overflowY:"scroll",WebkitOverflowScrolling:"touch",padding:"12px 16px"}}>
          <HudBox style={{marginBottom:12}}>
            <button onClick={recording?stopRec:startRec} style={{width:"100%",padding:"9px",borderRadius:3,marginBottom:10,cursor:"pointer",background:recording?"rgba(255,68,102,.1)":"rgba(0,212,255,.06)",border:`1px solid ${recording?"rgba(255,68,102,.4)":"rgba(0,212,255,.15)"}`,color:recording?"#ff8899":"rgba(0,212,255,.5)",fontSize:10,fontFamily:"'Orbitron',monospace",letterSpacing:".1em",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {recording?<><div style={{width:6,height:6,borderRadius:1,background:"#ff4466",animation:"pulse 1s infinite"}}/> PARAR</>:<>MIC GRAVAR</>}
            </button>
            <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Registre ideias, insights, lembretes..." rows={3} style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(0,212,255,.12)",borderRadius:3,padding:"10px 11px",color:"#f0f0f2",fontSize:16,resize:"none",outline:"none",fontFamily:"'Exo 2',sans-serif",lineHeight:1.5}}/>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
              <GlowBtn onClick={async()=>{if(text.trim()){await addNota(text);setText("");}}} color="#aa88ff">REGISTRAR</GlowBtn>
            </div>
          </HudBox>
          {notas.length===0&&<EmptyHud label="Nenhuma nota registrada"/>}
          {notas.map((n,i)=>(
            <div key={n.id} style={{borderLeft:`2px solid ${n.converted?"rgba(0,255,170,.3)":"rgba(0,212,255,.3)"}`,padding:"10px 12px",marginBottom:8,background:"#111115",borderRadius:"0 3px 3px 0",opacity:n.converted?.5:1}}>
              <div style={{fontSize:12,color:"rgba(224,240,255,.7)",lineHeight:1.6,marginBottom:7}}>{n.texto}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:8,fontFamily:"'Orbitron',monospace",color:"rgba(180,180,200,.25)",letterSpacing:".06em"}}>{fmtDT(n.created_at)}</span>
                <div style={{display:"flex",gap:6}}>
                  {n.converted?<span style={{fontSize:8,fontFamily:"'Orbitron',monospace",color:"#00ffaa",letterSpacing:".1em"}}>CONVERTIDO</span>:<GlowBtn small color="#aa88ff" onClick={()=>convertNota(n)}>CONVERTER</GlowBtn>}
                  <button onClick={()=>removeNota(n.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,.12)",cursor:"pointer",fontSize:14,lineHeight:1}}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ):(
        <>
          <div style={{flex:1,overflowY:"scroll",WebkitOverflowScrolling:"touch",padding:"10px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,padding:"6px 0",borderBottom:"1px solid rgba(0,212,255,.06)",marginBottom:10}}>
              <div style={{width:5,height:5,borderRadius:1,background:"#00ffaa",animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:8,fontFamily:"'Orbitron',monospace",color:"rgba(180,180,200,.4)",letterSpacing:".1em"}}>J.A.R.V.I.S v2.1 · CLAUDE · ONLINE</span>
              <button onClick={()=>setChat([])} style={{marginLeft:"auto",fontSize:8,fontFamily:"'Orbitron',monospace",background:"none",border:"1px solid rgba(0,212,255,.1)",color:"rgba(180,180,200,.3)",borderRadius:2,padding:"2px 7px",cursor:"pointer",letterSpacing:".08em"}}>LIMPAR</button>
            </div>
            {chat.length===0&&(
              <div style={{textAlign:"center",padding:"24px 0"}}>
                <div style={{fontSize:9,fontFamily:"'Orbitron',monospace",color:"rgba(180,180,200,.25)",letterSpacing:".2em",marginBottom:20}}>AGUARDANDO INSTRUCOES</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {quick.map(q=><button key={q} onClick={()=>send(q)} style={{background:"rgba(16,16,20,.9)",border:"1px solid rgba(0,212,255,.1)",color:"rgba(0,212,255,.4)",borderRadius:3,padding:"9px 14px",cursor:"pointer",fontSize:12,textAlign:"left",transition:"all .2s",fontFamily:"'Exo 2',sans-serif"}}>{q} →</button>)}
                </div>
              </div>
            )}
            {chat.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:8}}>
                {m.role==="assistant"&&<div style={{fontSize:9,fontFamily:"'Orbitron',monospace",color:"rgba(180,180,200,.4)",marginRight:6,paddingTop:10}}>J</div>}
                <div style={{maxWidth:"80%",background:m.role==="user"?"rgba(0,40,80,.6)":"rgba(0,12,28,.8)",border:`1px solid ${m.role==="user"?"rgba(0,212,255,.25)":"rgba(0,212,255,.1)"}`,borderRadius:m.role==="user"?"3px 3px 0 3px":"3px 3px 3px 0",padding:"10px 12px",fontSize:13,color:"#f0f0f2",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{m.content}</div>
              </div>
            ))}
            {loading&&<div style={{display:"flex",gap:5,padding:"9px 12px",background:"rgba(16,16,20,.9)",border:"1px solid rgba(0,212,255,.08)",borderRadius:"3px 3px 3px 0",width:"fit-content",marginBottom:8}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:1,background:"rgba(0,212,255,.4)",animation:`pulse 1.4s ${i*.2}s infinite`}}/>)}</div>}
            <div ref={endRef}/>
          </div>
          <div style={{display:"flex",gap:7,padding:"10px 16px max(10px,env(safe-area-inset-bottom)) 16px",borderTop:"1px solid rgba(0,212,255,.08)",flexShrink:0,background:"rgba(0,8,20,.9)"}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder="Instrucao para J.A.R.V.I.S..." rows={1} style={{flex:1,background:"rgba(255,255,255,.06)",border:"1px solid rgba(0,212,255,.15)",borderRadius:3,padding:"10px 12px",color:"#f0f0f2",fontSize:16,resize:"none",outline:"none",fontFamily:"'Exo 2',sans-serif",lineHeight:1.4,maxHeight:100,overflowY:"auto"}}/>
            <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{width:40,height:40,borderRadius:3,flexShrink:0,alignSelf:"flex-end",background:loading||!input.trim()?"rgba(0,212,255,.04)":"rgba(0,212,255,.15)",border:`1px solid ${loading||!input.trim()?"rgba(0,212,255,.1)":"rgba(0,212,255,.5)"}`,cursor:loading||!input.trim()?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",boxShadow:loading||!input.trim()?"none":"0 0 10px rgba(0,212,255,.3)"}}>
              <svg viewBox="0 0 24 24" fill="none" stroke={loading||!input.trim()?"rgba(0,212,255,.2)":"#00d4ff"} strokeWidth="2" style={{width:16,height:16}}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
