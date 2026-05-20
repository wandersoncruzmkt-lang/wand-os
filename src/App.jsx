import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "wandos_v4";
const getToday = () => new Date().toISOString().split("T")[0];
const fmtTime  = (d) => d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
const fmtDate  = (d) => d.toLocaleDateString("pt-BR",  { weekday:"long", day:"numeric", month:"long" });
const fmtDT    = (iso) => new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
const fmtShort = (iso) => new Date(iso+"T12:00").toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"2-digit" });
const t2m = (s) => { const [h,m] = s.split(":").map(Number); return h*60+m; };

function loadDB() { try { const r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):{}; } catch { return {}; } }
function saveDB(d) { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(d)); } catch {} }

const ROUTINE = [
  { id:"r1",  time:"04:50", label:"Despertar",          desc:"Água 500ml · Sem celular · Roupa separada",           tag:"Corpo" },
  { id:"r2",  time:"05:00", label:"Academia",            desc:"90 min treino · Mente livre",                         tag:"Corpo" },
  { id:"r3",  time:"06:30", label:"Café + Leitura",      desc:"Banho · 1ª refeição · 10 min leitura",               tag:"Corpo" },
  { id:"r4",  time:"07:10", label:"Deslocamento",        desc:"Revisar pauta · Chegar 7h25",                         tag:"CentroMed" },
  { id:"r5",  time:"07:30", label:"Abertura CentroMed",  desc:"Meta Ads · CPL · WhatsApp · Breno",                   tag:"CentroMed" },
  { id:"r6",  time:"08:00", label:"Bloco Conteúdo",      desc:"Maria Eduarda · Aprovações · Gravações",              tag:"CentroMed" },
  { id:"r7",  time:"09:30", label:"Reunião Médicos",     desc:"João Paulo · Mardônio · Larissa · CFM",               tag:"CentroMed" },
  { id:"r8",  time:"10:30", label:"Tráfego Pago",        desc:"Frequência < 2,5x · CPL < R$4 → escalar",            tag:"CentroMed" },
  { id:"r9",  time:"12:00", label:"Pausa + Almoço",      desc:"Refeição natural · Sem tela · Descanso",              tag:"Pausa" },
  { id:"r10", time:"13:00", label:"Bloco UPMIND",        desc:"Dra. Ivna · Portal Viagem · Festas Conceito",         tag:"UPMIND" },
  { id:"r11", time:"14:30", label:"Estratégia UPMIND",   desc:"Mentoria waitlist · Newton · Copa 2026",              tag:"UPMIND" },
  { id:"r12", time:"15:30", label:"Conteúdo Pessoal",    desc:"1 conteúdo · Hook→Virada→Moral→CTA",                 tag:"Marca" },
  { id:"r13", time:"16:30", label:"Presença Digital",    desc:"DMs estratégicos · Story · Métricas",                 tag:"Marca" },
  { id:"r14", time:"17:00", label:"Review do Dia",       desc:"Executado vs planejado · 3 prioridades amanhã",       tag:"Fechamento" },
  { id:"r15", time:"17:30", label:"Família + Refeição",  desc:"Refeição natural · Família · Leitura leve",           tag:"Fechamento" },
  { id:"r16", time:"19:30", label:"Wind Down",           desc:"Última refeição · Sem tela · Dormir 21h30",           tag:"Fechamento" },
];

const TAG = {
  Corpo:      { c:"#34d399", bg:"rgba(52,211,153,.15)",  grad:"linear-gradient(135deg,#34d399,#059669)" },
  CentroMed:  { c:"#60a5fa", bg:"rgba(96,165,250,.15)",  grad:"linear-gradient(135deg,#60a5fa,#2563eb)" },
  UPMIND:     { c:"#c084fc", bg:"rgba(192,132,252,.15)", grad:"linear-gradient(135deg,#c084fc,#7c3aed)" },
  Marca:      { c:"#fb923c", bg:"rgba(251,146,60,.15)",  grad:"linear-gradient(135deg,#fb923c,#ea580c)" },
  Pausa:      { c:"#94a3b8", bg:"rgba(148,163,184,.15)", grad:"linear-gradient(135deg,#94a3b8,#64748b)" },
  Fechamento: { c:"#fbbf24", bg:"rgba(251,191,36,.15)",  grad:"linear-gradient(135deg,#fbbf24,#d97706)" },
};

const META_CATS   = ["UPMIND","CentroMed","Marca Pessoal","Saúde","Financeiro","Pessoal"];
const META_COLORS = { UPMIND:"#c084fc", CentroMed:"#60a5fa", "Marca Pessoal":"#fb923c", Saúde:"#34d399", Financeiro:"#fbbf24", Pessoal:"#f472b6" };

// ── NOTIFY ──────────────────────────────────────────────────────
function askNotif() { if("Notification" in window && Notification.permission==="default") Notification.requestPermission(); }
function notify(title,body) { if("Notification" in window && Notification.permission==="granted") new Notification(title,{body}); }

// ── AI via Vercel serverless (evita CORS) ────────────────────────
async function askAI(messages, sys) {
  const system = sys || `Você é o assistente pessoal de Wanderson Cruz — O Sábio Estrategista do Sertão. Founder UPMIND + Diretor Marketing CentroMed, Crateús-CE. Tom: direto, calmo, estratégico. Sem hype. Respostas curtas e práticas em português brasileiro. Máximo 3 parágrafos.`;
  try {
    // Tenta rota serverless do Vercel primeiro (evita CORS)
    const res = await fetch("/api/ai", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ system, messages })
    });
    if(res.ok) { const d=await res.json(); return d.text||"Sem resposta."; }
  } catch {}
  // Fallback direto (dev local)
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json","anthropic-dangerous-allow-browser":"true"},
      body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system, messages })
    });
    const d = await res.json();
    return d.content?.[0]?.text || "Configure a variável ANTHROPIC_API_KEY no Vercel.";
  } catch {
    return "IA indisponível. Verifique a API key no Vercel.";
  }
}

// ── NAV ─────────────────────────────────────────────────────────
const NAV = [
  { id:"rotina",   label:"Rotina",   svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { id:"tarefas",  label:"Tarefas",  svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { id:"metas",    label:"Metas",    svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  { id:"notas",    label:"Notas",    svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { id:"graficos", label:"Insights", svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { id:"ia",       label:"IA",       svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg> },
];

// ════════════════════════════════════════════════════════════════
export default function WandOS() {
  const today   = getToday();
  const [now,setNow]   = useState(new Date());
  const [tab,setTab]   = useState("rotina");
  const [db,setDb]     = useState(()=>loadDB());
  const [toast,setToast] = useState(null);

  const dayKey = `day_${today}`;
  const td      = db[dayKey]||{};
  const checked = td.checked||{};
  const tasks   = td.tasks||[];
  const notes   = db.notes||[];
  const metas   = db.metas||[];
  const chat    = db.chat||[];
  const history = db.history||{};

  function upDay(p)  { const n={...db,[dayKey]:{...td,...p}};  setDb(n); saveDB(n); }
  function upRoot(p) { const n={...db,...p};                    setDb(n); saveDB(n); }

  function showToast(msg,type="success") {
    setToast({msg,type});
    setTimeout(()=>setToast(null),2400);
  }

  useEffect(()=>{
    const t=setInterval(()=>{
      setNow(new Date());
      const done=Object.values(db[`day_${today}`]?.checked||{}).filter(Boolean).length;
      saveDB({...db,history:{...(db.history||{}),[today]:done}});
    },60000);
    return()=>clearInterval(t);
  },[db]);

  useEffect(()=>{ askNotif(); },[]);

  useEffect(()=>{
    const cur=fmtTime(now);
    ROUTINE.forEach(item=>{
      const [h,m]=item.time.split(":").map(Number);
      const rem=new Date(); rem.setHours(h,m-30,0);
      if(fmtTime(rem)===cur&&!checked[item.id]) notify(`⏰ Em 30min: ${item.label}`,item.desc);
    });
    tasks.forEach(t=>{
      if(t.reminderTime===cur&&!t.done&&!t.reminded){
        notify(`📌 ${t.title}`,t.note||"Hora de executar.");
        upDay({tasks:tasks.map(x=>x.id===t.id?{...x,reminded:true}:x)});
      }
    });
  },[now]);

  const done     = Object.values(checked).filter(Boolean).length;
  const progress = Math.round((done/ROUTINE.length)*100);
  const nowMins  = now.getHours()*60+now.getMinutes();
  const current  = ROUTINE.slice().reverse().find(r=>t2m(r.time)<=nowMins);
  const nextItem = ROUTINE.find(r=>!checked[r.id]&&t2m(r.time)>nowMins);

  return (
    <div style={{
      maxWidth:430, margin:"0 auto", minHeight:"100vh", height:"100%",
      background:"#0a0a0f", color:"#f1f5f9",
      fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif",
      display:"flex", flexDirection:"column", position:"relative", overflow:"hidden"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>

      {/* STATUS BAR AREA */}
      <div style={{height:8,background:"transparent",flexShrink:0}}/>

      {/* HEADER */}
      <Header now={now} progress={progress} done={done} current={current} nextItem={nextItem}/>

      {/* CONTENT */}
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",paddingBottom:90}}>
        {tab==="rotina"   && <RotinaTab   checked={checked} upDay={upDay} toast={showToast}/>}
        {tab==="tarefas"  && <TarefasTab  tasks={tasks} upDay={upDay} toast={showToast}/>}
        {tab==="metas"    && <MetasTab    metas={metas} upRoot={upRoot} toast={showToast}/>}
        {tab==="notas"    && <NotasTab    notes={notes} upRoot={upRoot} tasks={tasks} upDay={upDay} toast={showToast}/>}
        {tab==="graficos" && <GraficosTab checked={checked} metas={metas} tasks={tasks} history={history} today={today}/>}
        {tab==="ia"       && <IATab       chat={chat} upRoot={upRoot} tasks={tasks} checked={checked} progress={progress} nextItem={nextItem} metas={metas}/>}
      </div>

      {/* BOTTOM NAV */}
      <BottomNav tab={tab} setTab={setTab}/>

      {/* TOAST */}
      {toast && (
        <div style={{
          position:"fixed",top:60,left:"50%",transform:"translateX(-50%)",
          background:toast.type==="error"?"#7f1d1d":"#052e16",
          border:`1px solid ${toast.type==="error"?"#ef4444":"#22c55e"}`,
          color:toast.type==="error"?"#fca5a5":"#86efac",
          borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:500,
          zIndex:999,whiteSpace:"nowrap",boxShadow:"0 8px 32px rgba(0,0,0,.5)",
          animation:"slideDown .25s ease"
        }}>{toast.msg}</div>
      )}

      <style>{`
        @keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{display:none}
        input,select,textarea{font-size:16px !important;-webkit-appearance:none}
        input[type=time],input[type=date]{color-scheme:dark}
        button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
      `}</style>
    </div>
  );
}

// ── HEADER ──────────────────────────────────────────────────────
function Header({now,progress,done,current,nextItem}) {
  const ringR   = 28;
  const circ    = 2*Math.PI*ringR;
  const offset  = circ - (progress/100)*circ;
  const tagColor = current ? TAG[current.tag]?.c : "#fbbf24";

  return(
    <div style={{
      padding:"12px 20px 14px",
      background:"linear-gradient(180deg,#13131f 0%,#0a0a0f 100%)",
      flexShrink:0, borderBottom:"1px solid rgba(255,255,255,.05)"
    }}>
      {/* Row 1: brand + clock */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
            <div style={{
              width:28,height:28,borderRadius:8,
              background:"linear-gradient(135deg,#fbbf24,#f97316)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12,fontWeight:800,color:"#000"
            }}>W</div>
            <span style={{fontSize:11,fontWeight:600,letterSpacing:".12em",color:"#94a3b8"}}>WAND OS</span>
          </div>
          <div style={{fontSize:19,fontWeight:700,color:"#f1f5f9",lineHeight:1.2}}>
            {current ? `Agora: ${current.label}` : "Bom dia, Wanderson"}
          </div>
          <div style={{fontSize:11,color:"#475569",marginTop:2,textTransform:"capitalize"}}>{fmtDate(now)}</div>
        </div>

        {/* Ring progress */}
        <div style={{position:"relative",width:72,height:72,flexShrink:0}}>
          <svg width="72" height="72" style={{transform:"rotate(-90deg)"}}>
            <circle cx="36" cy="36" r={ringR} fill="none" stroke="#1e2030" strokeWidth="5"/>
            <circle cx="36" cy="36" r={ringR} fill="none"
              stroke={progress>=80?"#34d399":progress>=40?"#fbbf24":"#c084fc"}
              strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{transition:"stroke-dashoffset .6s ease"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:"#f1f5f9",lineHeight:1}}>{progress}%</div>
            <div style={{fontSize:9,color:"#475569",marginTop:1}}>{done}/{ROUTINE.length}</div>
          </div>
        </div>
      </div>

      {/* Status pill */}
      {(current||nextItem) && (
        <div style={{
          display:"flex",alignItems:"center",gap:8,
          background:"rgba(255,255,255,.03)",
          boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",
          borderRadius:10,padding:"8px 12px"
        }}>
          <div style={{width:7,height:7,borderRadius:99,background:tagColor,flexShrink:0,animation:"pulse 2s infinite"}}/>
          <div style={{flex:1,minWidth:0}}>
            {current && <div style={{fontSize:12,fontWeight:500,color:tagColor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{current.label}</div>}
            {nextItem && <div style={{fontSize:11,color:"#475569",marginTop:1}}>Próximo às {nextItem.time}: {nextItem.label}</div>}
          </div>
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
      background:"rgba(10,10,15,.92)",
      backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
      borderTop:"1px solid rgba(255,255,255,.05)",
      padding:"8px 0 max(8px,env(safe-area-inset-bottom))",
      display:"flex",zIndex:100
    }}>
      {NAV.map(n=>{
        const active = tab===n.id;
        return(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{
            flex:1,display:"flex",flexDirection:"column",alignItems:"center",
            gap:3,background:"none",border:"none",cursor:"pointer",
            padding:"4px 0",transition:"all .2s",
            color: active?"#fbbf24":"#334155"
          }}>
            <div style={{
              width:38,height:38,borderRadius:12,
              background: active?"rgba(251,191,36,.15)":"transparent",
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all .25s",
              transform: active?"scale(1.05)":"scale(1)"
            }}>
              {n.svg}
            </div>
            <span style={{fontSize:9,fontWeight:active?600:400,letterSpacing:".02em"}}>{n.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── ROTINA ──────────────────────────────────────────────────────
function RotinaTab({checked,upDay,toast}) {
  const toggle = id => {
    const val = !checked[id];
    upDay({checked:{...checked,[id]:val}});
    if(val) toast("✓ Bloco concluído");
  };
  const done = Object.values(checked).filter(Boolean).length;

  // Group by tag
  const grouped = Object.keys(TAG).map(tag=>({
    tag, items: ROUTINE.filter(r=>r.tag===tag)
  })).filter(g=>g.items.length);

  return(
    <div style={{padding:"16px 16px 0",animation:"fadeIn .3s ease"}}>
      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        <MiniCard
          label="Concluídos" value={done}
          sub={`de ${ROUTINE.length} blocos`}
          color="#34d399"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:18,height:18}}><polyline points="20 6 9 17 4 12"/></svg>}
        />
        <MiniCard
          label="Progresso" value={Math.round((done/ROUTINE.length)*100)+"%"}
          sub="do dia concluído"
          color="#fbbf24"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:18,height:18}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
      </div>

      {/* Routine list */}
      {ROUTINE.map((item,idx)=>{
        const ck = !!checked[item.id];
        const tc = TAG[item.tag]||TAG.Pausa;
        const isActive = (() => {
          const now = new Date();
          const nm = now.getHours()*60+now.getMinutes();
          const im = t2m(item.time);
          const next = ROUTINE[idx+1];
          const nm2 = next ? t2m(next.time) : 24*60;
          return nm>=im && nm<nm2 && !ck;
        })();

        return(
          <div key={item.id}
            onClick={()=>toggle(item.id)}
            style={{
              display:"flex",gap:12,alignItems:"center",
              background: isActive?"rgba(251,191,36,.07)": ck?"#0f0f18":"#111827",
              borderLeft:`3px solid ${ck?"#1e1e2e":tc.c}`,
              borderTop:"none",borderRight:"none",borderBottom:"none",
              borderRadius:14,padding:"12px 14px",marginBottom:8,
              cursor:"pointer",opacity:ck?.5:1,
              transition:"all .2s",
              boxShadow: isActive?`inset 0 0 0 1px rgba(251,191,36,.18)`:`inset 0 0 0 1px rgba(255,255,255,.03)`,
              animation:`fadeIn .3s ease ${idx*.03}s both`
            }}>
            {/* Time */}
            <div style={{minWidth:38,textAlign:"center"}}>
              <div style={{fontSize:11,fontWeight:600,color:ck?"#334155":tc.c,fontVariantNumeric:"tabular-nums"}}>{item.time}</div>
            </div>

            {/* Check */}
            <div style={{
              width:22,height:22,borderRadius:7,flexShrink:0,
              background:ck?tc.c:"transparent",
              border:`2px solid ${ck?tc.c:"#334155"}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all .2s"
            }}>
              {ck&&<svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" style={{width:12,height:12}}><polyline points="20 6 9 17 4 12"/></svg>}
            </div>

            {/* Content */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{
                fontSize:14,fontWeight:isActive?600:500,
                color:ck?"#475569":"#e2e8f0",
                textDecoration:ck?"line-through":"none",
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"
              }}>{item.label}</div>
              <div style={{fontSize:11,color:"#475569",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.desc}</div>
            </div>

            {/* Tag badge */}
            <div style={{
              fontSize:9,fontWeight:600,padding:"3px 7px",borderRadius:6,
              background:tc.bg,color:tc.c,flexShrink:0,letterSpacing:".03em"
            }}>{item.tag}</div>
          </div>
        );
      })}

      <BtnReset onClick={()=>{ upDay({checked:{}}); toast("Dia resetado"); }}/>
    </div>
  );
}

// ── TAREFAS ─────────────────────────────────────────────────────
function TarefasTab({tasks,upDay,toast}) {
  const [form,setForm] = useState({title:"",note:"",reminderTime:"",tag:"UPMIND"});
  const [open,setOpen] = useState(false);

  const add = () => {
    if(!form.title.trim()) return;
    upDay({tasks:[...tasks,{...form,id:Date.now().toString(),done:false,reminded:false,createdAt:new Date().toISOString()}]});
    setForm({title:"",note:"",reminderTime:"",tag:"UPMIND"});
    setOpen(false);
    toast("✓ Tarefa adicionada");
  };
  const toggle = id => upDay({tasks:tasks.map(t=>t.id===id?{...t,done:!t.done,doneAt:!t.done?new Date().toISOString():undefined}:t)});
  const remove = id => { upDay({tasks:tasks.filter(t=>t.id!==id)}); toast("Tarefa removida","error"); };

  const pending = tasks.filter(t=>!t.done);
  const done    = tasks.filter(t=>t.done);

  return(
    <div style={{padding:"16px 16px 0",animation:"fadeIn .3s ease"}}>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        <MiniCard label="Total"      value={tasks.length}   color="#94a3b8" small/>
        <MiniCard label="Pendentes"  value={pending.length} color="#fbbf24" small/>
        <MiniCard label="Feitas"     value={done.length}    color="#34d399" small/>
      </div>

      {/* Add button */}
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:"100%",padding:"13px",borderRadius:14,marginBottom:12,
        background:"linear-gradient(135deg,rgba(251,191,36,.15),rgba(249,115,22,.1))",
        border:"1px solid rgba(251,191,36,.3)",color:"#fbbf24",
        fontSize:14,fontWeight:600,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",gap:8,
        transition:"all .2s"
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:18,height:18}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        {open?"Cancelar":"Nova Tarefa"}
      </button>

      {/* Form */}
      {open&&(
        <div style={{background:"#111827",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",borderRadius:16,padding:14,marginBottom:14,animation:"fadeIn .2s ease"}}>
          <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Título da tarefa..." autoFocus/>
          <Inp value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Observação (opcional)..." style={{marginTop:8}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <div>
              <div style={fldLabel}>Lembrete</div>
              <Inp type="time" value={form.reminderTime} onChange={e=>setForm(f=>({...f,reminderTime:e.target.value}))}/>
            </div>
            <div>
              <div style={fldLabel}>Categoria</div>
              <Sel value={form.tag} onChange={e=>setForm(f=>({...f,tag:e.target.value}))}>
                {Object.keys(TAG).map(k=><option key={k}>{k}</option>)}
              </Sel>
            </div>
          </div>
          <PrimaryBtn onClick={add} style={{marginTop:12,width:"100%"}}>Adicionar Tarefa</PrimaryBtn>
        </div>
      )}

      {pending.length===0&&!open&&<EmptyState icon="✦" text="Nenhuma tarefa pendente" sub="Toque em Nova Tarefa para adicionar"/>}
      {pending.map((t,i)=><TCard key={t.id} t={t} onToggle={toggle} onRemove={remove} idx={i}/>)}

      {done.length>0&&(
        <div style={{marginTop:20}}>
          <div style={secLabel}>Concluídas ({done.length})</div>
          {done.map((t,i)=><TCard key={t.id} t={t} onToggle={toggle} onRemove={remove} idx={i}/>)}
        </div>
      )}
    </div>
  );
}

function TCard({t,onToggle,onRemove,idx}) {
  const tc = TAG[t.tag]||TAG.Pausa;
  return(
    <div style={{
      display:"flex",gap:11,alignItems:"flex-start",
      background:"#111827",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",
      borderRadius:14,padding:"12px 13px",marginBottom:7,
      opacity:t.done?.45:1,animation:`fadeIn .25s ease ${idx*.04}s both`
    }}>
      <div onClick={()=>onToggle(t.id)} style={{
        width:22,height:22,borderRadius:7,flexShrink:0,marginTop:1,
        background:t.done?tc.c:"transparent",
        border:`2px solid ${t.done?tc.c:"#334155"}`,
        display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s"
      }}>
        {t.done&&<svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" style={{width:12,height:12}}><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:500,color:t.done?"#475569":"#e2e8f0",textDecoration:t.done?"line-through":"none"}}>{t.title}</div>
        {t.note&&<div style={{fontSize:12,color:"#475569",marginTop:2}}>{t.note}</div>}
        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
          <Pill color={tc.c} bg={tc.bg}>{t.tag}</Pill>
          {t.reminderTime&&<Pill color="#94a3b8" bg="rgba(148,163,184,.12)">⏰ {t.reminderTime}</Pill>}
          <span style={{fontSize:10,color:"#334155"}}>{fmtDT(t.createdAt)}</span>
        </div>
      </div>
      <button onClick={()=>onRemove(t.id)} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:20,padding:0,lineHeight:1,marginTop:-1}}>×</button>
    </div>
  );
}

// ── METAS ───────────────────────────────────────────────────────
function MetasTab({metas,upRoot,toast}) {
  const [form,setForm] = useState({title:"",desc:"",prazo:"",cat:"UPMIND",tipo:"Mensal",target:100,current:0});
  const [selCat,setSelCat] = useState("Todas");
  const [open,setOpen] = useState(false);

  const add = () => {
    if(!form.title.trim()) return;
    upRoot({metas:[...metas,{...form,id:Date.now().toString(),done:false,createdAt:new Date().toISOString(),logs:[]}]});
    setForm({title:"",desc:"",prazo:"",cat:"UPMIND",tipo:"Mensal",target:100,current:0});
    setOpen(false);
    toast("✓ Meta adicionada");
  };
  const setProgress=(id,val)=>{
    upRoot({metas:metas.map(m=>{
      if(m.id!==id) return m;
      const cur=Math.min(Math.max(0,Number(val)),m.target);
      return{...m,current:cur,done:cur>=m.target,doneAt:cur>=m.target?new Date().toISOString():undefined,logs:[...(m.logs||[]),{at:new Date().toISOString(),val:cur}]};
    })});
  };
  const remove=id=>{upRoot({metas:metas.filter(m=>m.id!==id)});toast("Meta removida","error");};

  const cats=["Todas",...META_CATS];
  const filtered=selCat==="Todas"?metas:metas.filter(m=>m.cat===selCat);
  const pending=filtered.filter(m=>!m.done);
  const doneM=filtered.filter(m=>m.done);
  const avg=metas.length?Math.round(metas.reduce((s,m)=>s+(m.current/Math.max(m.target,1))*100,0)/metas.length):0;

  return(
    <div style={{padding:"16px 16px 0",animation:"fadeIn .3s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        <MiniCard label="Total"    value={metas.length}                  color="#94a3b8" small/>
        <MiniCard label="Ativas"   value={metas.filter(m=>!m.done).length} color="#c084fc" small/>
        <MiniCard label="Média"    value={avg+"%"}                        color="#fbbf24" small/>
      </div>

      {/* Cat filter */}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:12,scrollbarWidth:"none"}}>
        {cats.map(c=>{
          const active=selCat===c;
          const cc=META_COLORS[c]||"#fbbf24";
          return(
            <button key={c} onClick={()=>setSelCat(c)} style={{
              fontSize:11,padding:"6px 13px",borderRadius:20,whiteSpace:"nowrap",
              background:active?cc+"25":"rgba(255,255,255,.05)",
              color:active?cc:"#475569",
              border:`1px solid ${active?cc+"55":"rgba(255,255,255,.05)"}`,
              cursor:"pointer",fontWeight:active?600:400,flexShrink:0,transition:"all .2s"
            }}>{c}</button>
          );
        })}
      </div>

      <button onClick={()=>setOpen(o=>!o)} style={{
        width:"100%",padding:"13px",borderRadius:14,marginBottom:12,
        background:"linear-gradient(135deg,rgba(192,132,252,.15),rgba(124,58,237,.1))",
        border:"1px solid rgba(192,132,252,.3)",color:"#c084fc",
        fontSize:14,fontWeight:600,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s"
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:18,height:18}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        {open?"Cancelar":"Nova Meta"}
      </button>

      {open&&(
        <div style={{background:"#111827",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",borderRadius:16,padding:14,marginBottom:14,animation:"fadeIn .2s ease"}}>
          <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Meta (ex: R$15k/mês)" autoFocus/>
          <Inp value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Como vai medir..." style={{marginTop:8}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <div>
              <div style={fldLabel}>Categoria</div>
              <Sel value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
                {META_CATS.map(c=><option key={c}>{c}</option>)}
              </Sel>
            </div>
            <div>
              <div style={fldLabel}>Tipo</div>
              <Sel value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                {["Diária","Semanal","Mensal","Trimestral","Anual"].map(t=><option key={t}>{t}</option>)}
              </Sel>
            </div>
            <div>
              <div style={fldLabel}>Meta (número)</div>
              <Inp type="number" value={form.target} onChange={e=>setForm(f=>({...f,target:Number(e.target.value)}))}/>
            </div>
            <div>
              <div style={fldLabel}>Prazo</div>
              <Inp type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))}/>
            </div>
          </div>
          <PrimaryBtn onClick={add} color="#c084fc" style={{marginTop:12,width:"100%"}}>Adicionar Meta</PrimaryBtn>
        </div>
      )}

      {pending.length===0&&selCat==="Todas"&&!open&&<EmptyState icon="◎" text="Nenhuma meta ainda" sub="Defina a mais importante agora"/>}
      {pending.map((m,i)=><MCard key={m.id} m={m} onProgress={setProgress} onRemove={remove} idx={i}/>)}

      {doneM.length>0&&(
        <div style={{marginTop:20}}>
          <div style={secLabel}>Concluídas ({doneM.length})</div>
          {doneM.map((m,i)=><MCard key={m.id} m={m} onProgress={setProgress} onRemove={remove} idx={i}/>)}
        </div>
      )}
    </div>
  );
}

function MCard({m,onProgress,onRemove,idx}) {
  const c=META_COLORS[m.cat]||"#c084fc";
  const pct=Math.round((m.current/Math.max(m.target,1))*100);
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(m.current);
  const tc={Diária:"#34d399",Semanal:"#60a5fa",Mensal:"#c084fc",Trimestral:"#fb923c",Anual:"#fbbf24"}[m.tipo]||"#94a3b8";

  return(
    <div style={{
      background:"#111827",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",
      borderLeft:`3px solid ${m.done?"rgba(255,255,255,.05)":c}`,
      borderRadius:14,padding:"14px",marginBottom:8,
      opacity:m.done?.5:1,animation:`fadeIn .25s ease ${idx*.04}s both`
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:m.done?"#475569":"#e2e8f0",textDecoration:m.done?"line-through":"none"}}>{m.title}</div>
          {m.desc&&<div style={{fontSize:12,color:"#475569",marginTop:2}}>{m.desc}</div>}
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
          <Pill color={c} bg={c+"22"}>{m.cat}</Pill>
          <button onClick={()=>onRemove(m.id)} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:11,color:"#475569"}}>{m.current} / {m.target}</span>
          <span style={{fontSize:16,fontWeight:700,color:pct>=100?"#34d399":pct>=60?c:"#fb923c"}}>{pct}%</span>
        </div>
        <div style={{height:8,background:"rgba(255,255,255,.06)",borderRadius:99,overflow:"hidden"}}>
          <div style={{
            height:8,borderRadius:99,
            width:`${Math.min(pct,100)}%`,
            background:pct>=100?"linear-gradient(90deg,#34d399,#059669)":TAG[Object.keys(TAG).find(k=>META_COLORS[m.cat]===TAG[k]?.c)||"UPMIND"]?.grad||`linear-gradient(90deg,${c},${c}88)`,
            transition:"width .6s ease",
            boxShadow:pct>=100?"0 0 10px #34d39955":undefined
          }}/>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10}}>
        <div style={{display:"flex",gap:6}}>
          <Pill color={tc} bg={tc+"22"}>{m.tipo}</Pill>
          {m.prazo&&<Pill color="#94a3b8" bg="rgba(148,163,184,.1)">até {fmtShort(m.prazo)}</Pill>}
        </div>
        {!m.done&&(
          editing?(
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <Inp type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:70}}/>
              <PrimaryBtn small onClick={()=>{onProgress(m.id,val);setEditing(false);}}>✓</PrimaryBtn>
            </div>
          ):(
            <button onClick={()=>{setVal(m.current);setEditing(true);}} style={{
              fontSize:11,background:"rgba(255,255,255,.06)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",
              color:"#94a3b8",borderRadius:8,padding:"5px 10px",cursor:"pointer"
            }}>↑ Atualizar</button>
          )
        )}
      </div>
    </div>
  );
}

// ── NOTAS ───────────────────────────────────────────────────────
function NotasTab({notes,upRoot,tasks,upDay,toast}) {
  const [text,setText]           = useState("");
  const [converting,setConverting] = useState(null);
  const [recording,setRecording] = useState(false);
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t=>t.stop());
        setRecording(false);
        setText(p=>(p?p+" ":"")+`[Áudio ${fmtTime(new Date())}]`);
        toast("Áudio registrado — edite o texto acima");
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { toast("Microfone bloqueado","error"); }
  };
  const stopRec = () => { if(mediaRef.current&&recording) mediaRef.current.stop(); };

  const addNote = () => {
    if(!text.trim()) return;
    upRoot({notes:[{id:Date.now().toString(),text,createdAt:new Date().toISOString(),converted:false},...notes]});
    setText("");
    toast("✓ Nota salva");
  };

  const convert = async (note) => {
    setConverting(note.id);
    try {
      const reply = await askAI([{role:"user",content:`Transforme em tarefa clara. Retorne APENAS JSON sem markdown: {"title":"...","note":"...","tag":"UPMIND|CentroMed|Marca|Corpo"}. Anotação: "${note.text}"`}]);
      const parsed = JSON.parse(reply.replace(/```json|```/g,"").trim());
      upDay({tasks:[...tasks,{...parsed,id:Date.now().toString(),done:false,reminderTime:"",reminded:false,createdAt:new Date().toISOString()}]});
      upRoot({notes:notes.map(n=>n.id===note.id?{...n,converted:true}:n)});
      toast("✓ Nota convertida em tarefa");
    } catch {
      upDay({tasks:[...tasks,{id:Date.now().toString(),title:note.text,note:"",tag:"UPMIND",done:false,reminderTime:"",reminded:false,createdAt:new Date().toISOString()}]});
      upRoot({notes:notes.map(n=>n.id===note.id?{...n,converted:true}:n)});
      toast("✓ Nota convertida em tarefa");
    }
    setConverting(null);
  };

  const remove = id => { upRoot({notes:notes.filter(n=>n.id!==id)}); toast("Nota removida","error"); };

  return(
    <div style={{padding:"16px 16px 0",animation:"fadeIn .3s ease"}}>
      <div style={{background:"#111827",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",borderRadius:16,padding:14,marginBottom:14}}>
        {/* Audio btn */}
        <button onClick={recording?stopRec:startRec} style={{
          width:"100%",padding:"10px",borderRadius:12,marginBottom:10,cursor:"pointer",
          background:recording?"rgba(239,68,68,.1)":"rgba(255,255,255,.05)",
          border:`1px solid ${recording?"rgba(239,68,68,.4)":"rgba(255,255,255,.06)"}`,
          color:recording?"#f87171":"#94a3b8",fontSize:13,fontWeight:500,
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s"
        }}>
          {recording?(
            <><div style={{width:8,height:8,borderRadius:99,background:"#ef4444",animation:"pulse 1s infinite"}}/> Parar gravação</>
          ):(
            <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16}}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>Gravar áudio</>
          )}
        </button>
        <textarea value={text} onChange={e=>setText(e.target.value)}
          placeholder="Ideia, insight, lembrete... A IA converte em tarefa automaticamente."
          rows={3}
          style={{
            width:"100%",background:"#111827",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",
            borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:16,resize:"vertical",outline:"none",
            fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",lineHeight:1.5
          }}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
          <span style={{fontSize:10,color:"#334155"}}>{new Date().toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
          <PrimaryBtn onClick={addNote}>Salvar</PrimaryBtn>
        </div>
      </div>

      {notes.length===0&&<EmptyState icon="◈" text="Nenhuma anotação" sub="Escreva ou grave um áudio acima"/>}
      {notes.map((n,i)=>(
        <div key={n.id} style={{
          background:"rgba(255,255,255,.03)",
          border:`1px solid ${n.converted?"rgba(52,211,153,.15)":"rgba(255,255,255,.05)"}`,
          borderLeft:`3px solid ${n.converted?"#34d399":"#c084fc"}`,
          borderRadius:14,padding:"12px 13px",marginBottom:8,
          opacity:n.converted?.6:1,animation:`fadeIn .25s ease ${i*.04}s both`
        }}>
          <div style={{fontSize:13,color:"#cbd5e1",lineHeight:1.6}}>{n.text}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
            <span style={{fontSize:10,color:"#334155"}}>{fmtDT(n.createdAt)}</span>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {n.converted
                ?<span style={{fontSize:11,color:"#34d399",fontWeight:500}}>✓ Virou tarefa</span>
                :<button onClick={()=>convert(n)} disabled={converting===n.id} style={{
                  fontSize:11,background:"rgba(192,132,252,.12)",color:"#c084fc",
                  border:"1px solid rgba(192,132,252,.3)",borderRadius:8,
                  padding:"5px 10px",cursor:"pointer",fontWeight:500,transition:"all .2s"
                }}>{converting===n.id?"Convertendo...":"→ Tarefa"}</button>
              }
              <button onClick={()=>remove(n.id)} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── GRÁFICOS ────────────────────────────────────────────────────
function GraficosTab({checked,metas,tasks,history,today}) {
  const days7 = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().split("T")[0]; });
  const maxB   = ROUTINE.length;

  const catData = META_CATS.map(cat=>{
    const ms=metas.filter(m=>m.cat===cat);
    const avg=ms.length?Math.round(ms.reduce((s,m)=>s+(m.current/Math.max(m.target,1))*100,0)/ms.length):0;
    return{cat,total:ms.length,done:ms.filter(m=>m.done).length,avg};
  }).filter(c=>c.total>0);

  return(
    <div style={{padding:"16px 16px 0",animation:"fadeIn .3s ease"}}>

      {/* Rotina 7 dias */}
      <div style={card}>
        <div style={cardTit}>Rotina — Últimos 7 dias</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:100}}>
          {days7.map(d=>{
            const val=d===today?Object.values(checked).filter(Boolean).length:(history[d]||0);
            const pct=Math.round((val/maxB)*100);
            const isToday=d===today;
            const lbl=new Date(d+"T12:00").toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","");
            return(
              <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <span style={{fontSize:9,color:isToday?"#fbbf24":"#334155",fontWeight:isToday?700:400}}>{pct||""}{pct?"%":""}</span>
                <div style={{width:"100%",height:72,background:"rgba(255,255,255,.05)",borderRadius:8,display:"flex",alignItems:"flex-end",overflow:"hidden",border:isToday?"1px solid rgba(251,191,36,.3)":"1px solid transparent"}}>
                  <div style={{width:"100%",height:`${Math.max(pct,3)}%`,background:isToday?"#fbbf24":pct>=80?"#34d399":pct>=40?"#c084fc":"rgba(255,255,255,.06)",borderRadius:6,transition:"height .5s ease"}}/>
                </div>
                <span style={{fontSize:9,color:isToday?"#fbbf24":"#475569",textTransform:"capitalize"}}>{lbl}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metas */}
      {catData.length>0&&(
        <div style={card}>
          <div style={cardTit}>Metas por Categoria</div>
          {catData.map(c=>{
            const color=META_COLORS[c.cat]||"#c084fc";
            return(
              <div key={c.cat} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <div style={{width:8,height:8,borderRadius:3,background:color}}/>
                    <span style={{fontSize:13,color:"#94a3b8",fontWeight:500}}>{c.cat}</span>
                    <span style={{fontSize:10,color:"#334155"}}>{c.done}/{c.total}</span>
                  </div>
                  <span style={{fontSize:15,fontWeight:700,color:c.avg>=80?"#34d399":color}}>{c.avg}%</span>
                </div>
                <div style={{height:8,background:"rgba(255,255,255,.06)",borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:8,borderRadius:99,width:`${c.avg}%`,background:`linear-gradient(90deg,${color},${color}88)`,transition:"width .7s ease",boxShadow:`0 0 8px ${color}44`}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rotina por área */}
      <div style={card}>
        <div style={cardTit}>Rotina por Área — Hoje</div>
        {Object.keys(TAG).map(tag=>{
          const total=ROUTINE.filter(r=>r.tag===tag).length;
          const done=ROUTINE.filter(r=>r.tag===tag&&!!checked[r.id]).length;
          const pct=Math.round((done/Math.max(total,1))*100);
          const c=TAG[tag].c;
          return(
            <div key={tag} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <div style={{width:6,height:6,borderRadius:2,background:c}}/>
                  <span style={{fontSize:12,color:"#94a3b8"}}>{tag}</span>
                  <span style={{fontSize:10,color:"#334155"}}>{done}/{total}</span>
                </div>
                <span style={{fontSize:12,fontWeight:700,color:pct===100?"#34d399":c}}>{pct}%</span>
              </div>
              <div style={{height:6,background:"rgba(255,255,255,.06)",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:6,borderRadius:99,width:`${pct}%`,background:pct===100?"linear-gradient(90deg,#34d399,#059669)":c,transition:"width .5s",boxShadow:pct===100?"0 0 8px #34d39944":undefined}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── IA ──────────────────────────────────────────────────────────
function IATab({chat,upRoot,tasks,checked,progress,nextItem,metas}) {
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[chat]);

  const pending=tasks.filter(t=>!t.done);
  const doneB=Object.values(checked).filter(Boolean).length;

  const send = async (text) => {
    if(!text.trim()||loading) return;
    const userMsg={role:"user",content:text};
    const next=[...chat,userMsg];
    upRoot({chat:next});
    setInput("");
    setLoading(true);
    const ctx=`[CONTEXTO ${new Date().toLocaleDateString("pt-BR")}: Rotina ${progress}% (${doneB}/${ROUTINE.length}). Próximo: ${nextItem?`${nextItem.time} - ${nextItem.label}`:"rotina concluída"}. Tarefas pendentes: ${pending.length>0?pending.map(t=>t.title).join(", "):"nenhuma"}. Metas ativas: ${metas.filter(m=>!m.done).length}.]\n\n${text}`;
    try {
      const reply=await askAI([...chat,{role:"user",content:ctx}]);
      upRoot({chat:[...next,{role:"assistant",content:reply}]});
    } catch {
      upRoot({chat:[...next,{role:"assistant",content:"Erro. Verifique a API key no Vercel."}]});
    }
    setLoading(false);
  };

  const quick=["Como está meu dia?","O que ainda falta?","Analisa minhas metas","Sugestão para hoje"];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 220px)",padding:"0 16px",animation:"fadeIn .3s ease"}}>
      {/* Model badge */}
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.06)",marginBottom:8,flexShrink:0}}>
        <div style={{width:7,height:7,borderRadius:99,background:"#34d399",animation:"pulse 2s infinite"}}/>
        <span style={{fontSize:11,color:"#475569"}}>Claude Sonnet 4 · Anthropic</span>
        <button onClick={()=>upRoot({chat:[]})} style={{marginLeft:"auto",fontSize:10,background:"none",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",color:"#334155",borderRadius:6,padding:"3px 8px",cursor:"pointer"}}>Limpar</button>
      </div>

      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        {chat.length===0&&(
          <div style={{textAlign:"center",padding:"32px 16px"}}>
            <div style={{fontSize:40,marginBottom:12}}>✧</div>
            <div style={{fontSize:15,fontWeight:600,color:"#94a3b8",marginBottom:4}}>Assistente Pessoal</div>
            <div style={{fontSize:12,color:"#334155",marginBottom:24}}>Contexto do dia carregado.</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {quick.map(q=>(
                <button key={q} onClick={()=>send(q)} style={{
                  background:"rgba(255,255,255,.05)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",
                  color:"#94a3b8",borderRadius:12,padding:"12px 16px",cursor:"pointer",
                  fontSize:13,textAlign:"left",transition:"all .2s"
                }}>{q} →</button>
              ))}
            </div>
          </div>
        )}
        {chat.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:10}}>
            <div style={{
              maxWidth:"82%",
              background:m.role==="user"?"linear-gradient(135deg,rgba(251,191,36,.2),rgba(249,115,22,.15))":"rgba(255,255,255,.05)",
              border:`1px solid ${m.role==="user"?"rgba(251,191,36,.25)":"rgba(255,255,255,.05)"}`,
              borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
              padding:"11px 14px",fontSize:14,color:"#e2e8f0",lineHeight:1.65,whiteSpace:"pre-wrap"
            }}>{m.content}</div>
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",gap:5,padding:"12px 14px",background:"rgba(255,255,255,.05)",borderRadius:"16px 16px 16px 4px",width:"fit-content",marginBottom:10}}>
            {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:99,background:"#475569",animation:`pulse 1.4s ${i*.2}s infinite`}}/>)}
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div style={{display:"flex",gap:8,padding:"10px 0 max(10px,env(safe-area-inset-bottom))",flexShrink:0,borderTop:"1px solid rgba(255,255,255,.06)",marginTop:6}}>
        <textarea value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}}
          placeholder="Pergunte, anote ou peça análise..."
          rows={1}
          style={{
            flex:1,background:"rgba(255,255,255,.06)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",
            borderRadius:14,padding:"11px 14px",color:"#e2e8f0",fontSize:16,resize:"none",
            outline:"none",fontFamily:"inherit",lineHeight:1.4,maxHeight:120,overflowY:"auto"
          }}/>
        <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{
          width:44,height:44,borderRadius:12,flexShrink:0,
          background:loading||!input.trim()?"rgba(255,255,255,.06)":"linear-gradient(135deg,#fbbf24,#f97316)",
          border:"none",cursor:loading||!input.trim()?"default":"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",alignSelf:"flex-end"
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={loading||!input.trim()?"#334155":"#000"} strokeWidth="2.5" style={{width:18,height:18}}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── SHARED ──────────────────────────────────────────────────────
function MiniCard({label,value,sub,color,icon,small}) {
  return(
    <div style={{background:"#111827",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",borderRadius:14,padding:small?"12px 10px":"14px 12px"}}>
      {icon&&<div style={{color,marginBottom:6}}>{icon}</div>}
      <div style={{fontSize:small?18:22,fontWeight:700,color:color||"#f1f5f9",lineHeight:1}}>{value}</div>
      <div style={{fontSize:10,color:"#475569",marginTop:4,fontWeight:500}}>{label}</div>
      {sub&&<div style={{fontSize:10,color:"#334155",marginTop:2}}>{sub}</div>}
    </div>
  );
}

function Pill({children,color,bg}) {
  return <span style={{fontSize:10,fontWeight:600,padding:"3px 7px",borderRadius:6,background:bg||color+"22",color,letterSpacing:".02em"}}>{children}</span>;
}

function PrimaryBtn({children,onClick,color,style,small,disabled}) {
  const c = color||"#fbbf24";
  return(
    <button onClick={onClick} disabled={disabled} style={{
      background:`linear-gradient(135deg,${c},${c}bb)`,
      color:"#000",border:"none",borderRadius:10,
      padding:small?"6px 12px":"11px 20px",
      fontSize:small?11:14,fontWeight:700,cursor:disabled?"default":"pointer",
      opacity:disabled?.5:1,transition:"all .2s",
      boxShadow:`0 4px 14px ${c}33`,...style
    }}>{children}</button>
  );
}

function BtnReset({onClick}) {
  return(
    <button onClick={onClick} style={{
      width:"100%",marginTop:16,padding:"12px",borderRadius:12,
      background:"#111827",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",
      color:"#475569",fontSize:13,cursor:"pointer",transition:"all .2s"
    }}>Resetar dia</button>
  );
}

function Inp({style,...props}) {
  return <input style={{
    width:"100%",background:"rgba(255,255,255,.06)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",
    borderRadius:10,padding:"11px 13px",color:"#e2e8f0",fontSize:16,outline:"none",display:"block",
    fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",...style
  }} {...props}/>;
}

function Sel({style,children,...props}) {
  return <select style={{
    width:"100%",background:"rgba(255,255,255,.06)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",
    borderRadius:10,padding:"11px 13px",color:"#e2e8f0",fontSize:16,outline:"none",display:"block",
    fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",...style
  }} {...props}>{children}</select>;
}

function EmptyState({icon,text,sub}) {
  return(
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:36,marginBottom:10,opacity:.3}}>{icon}</div>
      <div style={{fontSize:15,fontWeight:500,color:"#475569",marginBottom:4}}>{text}</div>
      {sub&&<div style={{fontSize:12,color:"#334155"}}>{sub}</div>}
    </div>
  );
}

const card    = {background:"#111827",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)",borderRadius:16,padding:16,marginBottom:12};
const cardTit = {fontSize:11,fontWeight:600,color:"#475569",textTransform:"uppercase",letterSpacing:".1em",marginBottom:14};
const secLabel= {fontSize:10,color:"#334155",marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em"};
const fldLabel= {fontSize:11,color:"#475569",marginBottom:5,fontWeight:500};
