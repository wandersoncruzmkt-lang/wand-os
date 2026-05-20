import { useState, useEffect, useRef, useCallback } from "react";

// ── CONFIG SUPABASE ──────────────────────────────────────────────
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

// ── ROTINA ──────────────────────────────────────────────────────
const ROUTINE = [
  { id:"r1",  time:"04:50", label:"Despertar",          icon:"🌅", desc:"Água 500ml · Sem celular · Roupa separada",    cat:"Manhã" },
  { id:"r2",  time:"05:00", label:"Academia",            icon:"💪", desc:"90 min treino · Mente livre",                  cat:"Manhã" },
  { id:"r3",  time:"06:30", label:"Café + Leitura",      icon:"📖", desc:"Banho · 1ª refeição · 10 min leitura",        cat:"Manhã" },
  { id:"r4",  time:"07:10", label:"Deslocamento",        icon:"🚗", desc:"Revisar pauta · Chegar 7h25",                  cat:"Trabalho" },
  { id:"r5",  time:"07:30", label:"Abertura CentroMed",  icon:"🏥", desc:"Meta Ads · CPL · WhatsApp · Breno",            cat:"Trabalho" },
  { id:"r6",  time:"08:00", label:"Bloco Conteúdo",      icon:"🎬", desc:"Maria Eduarda · Aprovações · Gravações",       cat:"Trabalho" },
  { id:"r7",  time:"09:30", label:"Reunião Médicos",     icon:"👨‍⚕️", desc:"João Paulo · Mardônio · Larissa · CFM",   cat:"Trabalho" },
  { id:"r8",  time:"10:30", label:"Tráfego Pago",        icon:"📊", desc:"Frequência < 2,5x · CPL < R$4 → escalar",     cat:"Trabalho" },
  { id:"r9",  time:"12:00", label:"Almoço",              icon:"🍽️", desc:"Refeição natural · Sem tela · Descanso",      cat:"Alimentação" },
  { id:"r10", time:"13:00", label:"Bloco UPMIND",        icon:"⚡", desc:"Clientes · Entregas · Pipeline",               cat:"UPMIND" },
  { id:"r11", time:"14:30", label:"Estratégia UPMIND",   icon:"🧠", desc:"Mentoria waitlist · Newton · Copa 2026",       cat:"UPMIND" },
  { id:"r12", time:"15:30", label:"Conteúdo Pessoal",    icon:"📱", desc:"1 conteúdo · Hook→Virada→Moral→CTA",          cat:"Marca" },
  { id:"r13", time:"16:30", label:"Presença Digital",    icon:"✨", desc:"DMs estratégicos · Story · Métricas",          cat:"Marca" },
  { id:"r14", time:"17:00", label:"Review do Dia",       icon:"✅", desc:"Executado vs planejado · 3 prioridades amanhã", cat:"Fechamento" },
  { id:"r15", time:"17:30", label:"Jantar + Família",    icon:"👨‍👩‍👧", desc:"Refeição natural · Família · Descanso", cat:"Alimentação" },
  { id:"r16", time:"19:30", label:"Wind Down",           icon:"🌙", desc:"Última refeição · Sem tela · Dormir 21h30",   cat:"Fechamento" },
];

const CATS = {
  "Manhã":       { c:"#34d399", grad:"linear-gradient(135deg,#34d399,#059669)", icon:"🌅" },
  "Trabalho":    { c:"#60a5fa", grad:"linear-gradient(135deg,#60a5fa,#2563eb)", icon:"💼" },
  "Alimentação": { c:"#fb923c", grad:"linear-gradient(135deg,#fb923c,#ea580c)", icon:"🍽️" },
  "UPMIND":      { c:"#c084fc", grad:"linear-gradient(135deg,#c084fc,#7c3aed)", icon:"⚡" },
  "Marca":       { c:"#f472b6", grad:"linear-gradient(135deg,#f472b6,#db2777)", icon:"✨" },
  "Fechamento":  { c:"#fbbf24", grad:"linear-gradient(135deg,#fbbf24,#d97706)", icon:"🌙" },
};

const META_CATS   = ["UPMIND","CentroMed","Marca Pessoal","Saúde","Financeiro","Leitura","Pessoal"];
const META_COLORS = { UPMIND:"#c084fc", CentroMed:"#60a5fa", "Marca Pessoal":"#f472b6", Saúde:"#34d399", Financeiro:"#fbbf24", Leitura:"#fb923c", Pessoal:"#94a3b8" };
const META_ICONS  = { UPMIND:"⚡", CentroMed:"🏥", "Marca Pessoal":"✨", Saúde:"💪", Financeiro:"💰", Leitura:"📖", Pessoal:"🌱" };

function askNotif() { if("Notification" in window && Notification.permission==="default") Notification.requestPermission(); }
function notify(title,body) { if("Notification" in window && Notification.permission==="granted") new Notification(title,{body}); }

async function askAI(messages, sys) {
  const system = sys || `Você é o assistente pessoal de Wanderson Cruz — O Sábio Estrategista do Sertão. Founder UPMIND + Diretor Marketing CentroMed, Crateús-CE. Tom: direto, calmo, estratégico. Sem hype. Respostas curtas e práticas em português brasileiro. Máximo 3 parágrafos.`;
  try {
    const res = await fetch("/api/ai", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ system, messages })
    });
    if(res.ok) { const d=await res.json(); return d.text||"Sem resposta."; }
  } catch {}
  return "IA indisponível. Verifique a API key no Vercel.";
}

// ── NAV ─────────────────────────────────────────────────────────
const NAV = [
  { id:"home",     label:"Home",     svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id:"rotina",   label:"Rotina",   svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { id:"tarefas",  label:"Tarefas",  svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { id:"metas",    label:"Metas",    svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  { id:"ia",       label:"IA",       svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg> },
];

// ════════════════════════════════════════════════════════════════
export default function AgendaIA() {
  const today   = getToday();
  const [now,setNow]     = useState(new Date());
  const [tab,setTab]     = useState("home");
  const [toast,setToast] = useState(null);
  const [loading,setLoading] = useState(true);

  // Dados do Supabase
  const [tarefas,setTarefas]   = useState([]);
  const [metas,setMetas]       = useState([]);
  const [notas,setNotas]       = useState([]);
  const [checked,setChecked]   = useState({});
  const [chat,setChat]         = useState([]);

  // Carregar dados
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [t,m,n,rc] = await Promise.all([
      sb("tarefas","GET",null,`?date=eq.${today}&order=created_at.desc`),
      sb("metas","GET",null,`?order=created_at.desc`),
      sb("notas","GET",null,`?order=created_at.desc&limit=50`),
      sb("rotina_check","GET",null,`?date=eq.${today}`),
    ]);
    if(t) setTarefas(t);
    if(m) setMetas(m);
    if(n) setNotas(n);
    if(rc) {
      const map = {};
      rc.forEach(r => { map[r.item_id] = r.checked; });
      setChecked(map);
    }
    setLoading(false);
  }, [today]);

  useEffect(() => { loadAll(); askNotif(); }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  function showToast(msg, type="success") {
    setToast({msg,type});
    setTimeout(() => setToast(null), 2500);
  }

  // Rotina check/uncheck
  async function toggleCheck(itemId) {
    const val = !checked[itemId];
    setChecked(prev => ({...prev, [itemId]: val}));
    const id = `${today}_${itemId}`;
    if(val) {
      await sb("rotina_check","POST",{ id, date:today, item_id:itemId, checked:true });
      showToast("✓ Bloco concluído");
    } else {
      await sb(`rotina_check?id=eq.${id}`,"DELETE");
    }
  }

  // Tarefas
  async function addTarefa(data) {
    const nova = { id:Date.now().toString(), date:today, done:false, reminded:false, ...data, created_at:new Date().toISOString() };
    const res = await sb("tarefas","POST", nova);
    if(res) { setTarefas(prev => [res[0]||nova, ...prev]); showToast("✓ Tarefa criada"); }
  }
  async function toggleTarefa(id) {
    const t = tarefas.find(x=>x.id===id);
    const upd = { done:!t.done, done_at:!t.done?new Date().toISOString():null };
    await sb(`tarefas?id=eq.${id}`,"PATCH", upd);
    setTarefas(prev => prev.map(x=>x.id===id?{...x,...upd}:x));
  }
  async function removeTarefa(id) {
    await sb(`tarefas?id=eq.${id}`,"DELETE");
    setTarefas(prev => prev.filter(x=>x.id!==id));
    showToast("Removida","error");
  }

  // Metas
  async function addMeta(data) {
    const nova = { id:Date.now().toString(), done:false, current_val:0, logs:[], ...data, created_at:new Date().toISOString() };
    const res = await sb("metas","POST", nova);
    if(res) { setMetas(prev => [res[0]||nova, ...prev]); showToast("✓ Meta criada"); }
  }
  async function updateMetaProgress(id, val) {
    const m = metas.find(x=>x.id===id);
    const cur = Math.min(Math.max(0,Number(val)), Number(m.target));
    const done = cur >= Number(m.target);
    const logs = [...(m.logs||[]), {at:new Date().toISOString(), val:cur}];
    const upd = { current_val:cur, done, done_at:done?new Date().toISOString():null, logs };
    await sb(`metas?id=eq.${id}`,"PATCH", upd);
    setMetas(prev => prev.map(x=>x.id===id?{...x,...upd}:x));
    if(done) showToast("🎯 Meta concluída!");
  }
  async function removeMeta(id) {
    await sb(`metas?id=eq.${id}`,"DELETE");
    setMetas(prev => prev.filter(x=>x.id!==id));
    showToast("Removida","error");
  }

  // Notas
  async function addNota(text) {
    const nova = { id:Date.now().toString(), texto:text, converted:false, created_at:new Date().toISOString() };
    const res = await sb("notas","POST", nova);
    if(res) { setNotas(prev => [res[0]||nova, ...prev]); showToast("✓ Nota salva"); }
  }
  async function convertNota(nota) {
    try {
      const reply = await askAI([{role:"user",content:`Analise essa anotação e retorne APENAS JSON sem markdown:
{"tipo":"tarefa|meta","title":"...","note":"...","tag":"UPMIND|CentroMed|Marca|Corpo","cat":"UPMIND|CentroMed|Marca Pessoal|Saúde|Financeiro|Leitura|Pessoal","target":100,"objetivo":"...","descricao":"..."}
Anotação: "${nota.texto}"`}]);
      const parsed = JSON.parse(reply.replace(/```json|```/g,"").trim());
      if(parsed.tipo==="meta") {
        await addMeta({ title:parsed.title, descricao:parsed.descricao||"", cat:parsed.cat||"UPMIND", tipo:"Mensal", target:parsed.target||100, objetivo:parsed.objetivo||"" });
      } else {
        await addTarefa({ title:parsed.title, note:parsed.note||"", tag:parsed.tag||"UPMIND", reminder_time:"" });
      }
      await sb(`notas?id=eq.${nota.id}`,"PATCH",{converted:true});
      setNotas(prev => prev.map(n=>n.id===nota.id?{...n,converted:true}:n));
      showToast(`✓ Virou ${parsed.tipo}!`);
    } catch {
      showToast("Erro ao converter","error");
    }
  }
  async function removeNota(id) {
    await sb(`notas?id=eq.${id}`,"DELETE");
    setNotas(prev => prev.filter(n=>n.id!==id));
  }

  const done     = Object.values(checked).filter(Boolean).length;
  const progress = Math.round((done/ROUTINE.length)*100);
  const nowMins  = now.getHours()*60+now.getMinutes();
  const current  = ROUTINE.slice().reverse().find(r=>t2m(r.time)<=nowMins);
  const nextItem = ROUTINE.find(r=>!checked[r.id]&&t2m(r.time)>nowMins);

  const shared = { today, now, tarefas, metas, notas, checked, chat, setChat,
    addTarefa, toggleTarefa, removeTarefa, addMeta, updateMetaProgress, removeMeta,
    addNota, convertNota, removeNota, toggleCheck, showToast, progress, done, current, nextItem, loading };

  return (
    <div style={{
      maxWidth:430, margin:"0 auto", height:"100dvh",
      background:"#080810", color:"#f1f5f9",
      fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif",
      display:"flex", flexDirection:"column",
      position:"fixed", top:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", overflow:"hidden"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>

      {/* SAFE AREA TOP */}
      <div style={{height:"env(safe-area-inset-top,8px)",flexShrink:0}}/>

      {/* HEADER */}
      <TopBar now={now} progress={progress} done={done} current={current} nextItem={nextItem} tab={tab}/>

      {/* CONTENT */}
      <div style={{flex:1,overflowY:"scroll",overflowX:"hidden",WebkitOverflowScrolling:"touch",paddingBottom:"calc(80px + env(safe-area-inset-bottom,0px))",minHeight:0}}>
        {loading && <LoadingScreen/>}
        {!loading && tab==="home"    && <HomeTab    {...shared} setTab={setTab}/>}
        {!loading && tab==="rotina"  && <RotinaTab  {...shared}/>}
        {!loading && tab==="tarefas" && <TarefasTab {...shared}/>}
        {!loading && tab==="metas"   && <MetasTab   {...shared}/>}
        {!loading && tab==="ia"      && <IATab      {...shared}/>}
      </div>

      {/* BOTTOM NAV */}
      <BottomNav tab={tab} setTab={setTab}/>

      {/* TOAST */}
      {toast && (
        <div style={{
          position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",
          background:toast.type==="error"?"#1a0a0a":"#0a1a0a",
          border:`1px solid ${toast.type==="error"?"#ef4444":"#22c55e"}`,
          color:toast.type==="error"?"#fca5a5":"#86efac",
          borderRadius:14,padding:"10px 20px",fontSize:13,fontWeight:500,
          zIndex:999,whiteSpace:"nowrap",boxShadow:"0 8px 32px rgba(0,0,0,.6)",
          animation:"slideDown .2s ease"
        }}>{toast.msg}</div>
      )}

      <style>{`
        @keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        html,body{height:100%;overflow:hidden;position:fixed;width:100%;background:#080810}
        body{overscroll-behavior:none}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{display:none}
        input,select,textarea{font-size:16px !important;-webkit-appearance:none}
        input[type=time],input[type=date]{color-scheme:dark}
      `}</style>
    </div>
  );
}

// ── LOADING ─────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:16}}>
      <div style={{width:36,height:36,border:"3px solid #1e1e2e",borderTop:"3px solid #fbbf24",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <div style={{fontSize:13,color:"#475569"}}>Carregando sua agenda...</div>
    </div>
  );
}

// ── TOPBAR ──────────────────────────────────────────────────────
function TopBar({now,progress,done,current,nextItem,tab}) {
  const ringR = 26;
  const circ  = 2*Math.PI*ringR;
  const offset= circ-(progress/100)*circ;
  const tagC  = current ? CATS[current.cat]?.c : "#fbbf24";

  return(
    <div style={{background:"#0d0d1a",borderBottom:"1px solid rgba(255,255,255,.05)",padding:"10px 18px 12px",flexShrink:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
            <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#fbbf24,#f97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#000",flexShrink:0}}>W</div>
            <span style={{fontSize:10,fontWeight:600,letterSpacing:".14em",color:"#475569"}}>AGENDA INTELIGENTE</span>
          </div>
          <div style={{fontSize:17,fontWeight:700,color:"#f1f5f9",lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {current ? `${current.icon} ${current.label}` : "Bom dia, Wanderson 👋"}
          </div>
          <div style={{fontSize:10,color:"#334155",marginTop:2,textTransform:"capitalize"}}>{fmtDate(now)} · {fmtTime(now)}</div>
        </div>

        {/* Ring */}
        <div style={{position:"relative",width:64,height:64,flexShrink:0}}>
          <svg width="64" height="64" style={{transform:"rotate(-90deg)"}}>
            <circle cx="32" cy="32" r={ringR} fill="none" stroke="#1e1e2e" strokeWidth="5"/>
            <circle cx="32" cy="32" r={ringR} fill="none"
              stroke={progress>=80?"#34d399":progress>=40?"#fbbf24":"#c084fc"}
              strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{transition:"stroke-dashoffset .6s ease"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",lineHeight:1}}>{progress}%</div>
            <div style={{fontSize:8,color:"#475569"}}>{done}/{ROUTINE.length}</div>
          </div>
        </div>
      </div>

      {/* Next pill */}
      {nextItem && (
        <div style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.03)",borderRadius:8,padding:"6px 10px",marginTop:8}}>
          <div style={{width:5,height:5,borderRadius:99,background:tagC,flexShrink:0,animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:11,color:"#475569"}}>Próximo {nextItem.time}:</span>
          <span style={{fontSize:11,color:CATS[nextItem.cat]?.c||"#94a3b8",fontWeight:500}}>{nextItem.icon} {nextItem.label}</span>
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
      background:"rgba(8,8,16,.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
      borderTop:"1px solid rgba(255,255,255,.06)",
      padding:"6px 0 max(6px,env(safe-area-inset-bottom))",
      display:"flex",zIndex:100
    }}>
      {NAV.map(n=>{
        const active=tab===n.id;
        return(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{
            flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,
            background:"none",border:"none",cursor:"pointer",padding:"4px 0",transition:"all .2s",
            color:active?"#fbbf24":"#2d3748"
          }}>
            <div style={{
              width:36,height:36,borderRadius:11,
              background:active?"rgba(251,191,36,.12)":"transparent",
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all .25s",transform:active?"scale(1.08)":"scale(1)"
            }}>{n.svg}</div>
            <span style={{fontSize:9,fontWeight:active?700:400,letterSpacing:".02em"}}>{n.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HOME TAB
// ════════════════════════════════════════════════════════════════
function HomeTab({setTab,tarefas,metas,notas,checked,progress,done,current,nextItem,today,now}) {
  const pendTarefas = tarefas.filter(t=>!t.done).length;
  const pendMetas   = metas.filter(m=>!m.done).length;
  const avgMeta     = metas.length ? Math.round(metas.reduce((s,m)=>s+(Number(m.current_val)/Math.max(Number(m.target),1))*100,0)/metas.length) : 0;

  const quickNav = [
    { id:"rotina",   icon:"⏰", label:"Rotina",   sub:`${done}/${ROUTINE.length} blocos`,       color:"#fbbf24" },
    { id:"tarefas",  icon:"✅", label:"Tarefas",  sub:`${pendTarefas} pendentes`,                color:"#34d399" },
    { id:"metas",    icon:"🎯", label:"Metas",    sub:`${avgMeta}% progresso médio`,             color:"#c084fc" },
    { id:"ia",       icon:"🧠", label:"IA",       sub:"Assistente pessoal",                      color:"#60a5fa" },
  ];

  return(
    <div style={{padding:"16px 16px 0",animation:"fadeIn .3s ease"}}>

      {/* Saudação */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:22,fontWeight:700,color:"#f1f5f9",marginBottom:4}}>
          {now.getHours()<12?"Bom dia":now.getHours()<18?"Boa tarde":"Boa noite"} 👋
        </div>
        <div style={{fontSize:13,color:"#475569"}}>Quarta-feira, 20 de maio · Crateús-CE</div>
      </div>

      {/* Progress ring grande */}
      <div style={{background:"linear-gradient(135deg,rgba(251,191,36,.08),rgba(192,132,252,.05))",borderRadius:18,padding:18,marginBottom:16,display:"flex",alignItems:"center",gap:16}}>
        <div style={{position:"relative",width:80,height:80,flexShrink:0}}>
          <svg width="80" height="80" style={{transform:"rotate(-90deg)"}}>
            <circle cx="40" cy="40" r="34" fill="none" stroke="#1e1e2e" strokeWidth="6"/>
            <circle cx="40" cy="40" r="34" fill="none"
              stroke={progress>=80?"#34d399":progress>=40?"#fbbf24":"#c084fc"}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2*Math.PI*34}
              strokeDashoffset={2*Math.PI*34-(progress/100)*2*Math.PI*34}
              style={{transition:"stroke-dashoffset .8s ease"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:"#f1f5f9"}}>{progress}%</div>
          </div>
        </div>
        <div>
          <div style={{fontSize:16,fontWeight:600,color:"#f1f5f9",marginBottom:4}}>Progresso do Dia</div>
          <div style={{fontSize:12,color:"#475569",marginBottom:8}}>{done} de {ROUTINE.length} blocos concluídos</div>
          {current && (
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:6,height:6,borderRadius:99,background:CATS[current.cat]?.c,animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:12,color:CATS[current.cat]?.c,fontWeight:500}}>{current.icon} {current.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick nav grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {quickNav.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{
            background:"#0d0d1a",border:"none",borderRadius:14,padding:"14px 14px",
            textAlign:"left",cursor:"pointer",transition:"all .2s",
            boxShadow:`inset 0 0 0 1px rgba(255,255,255,.05)`
          }}>
            <div style={{fontSize:24,marginBottom:6}}>{n.icon}</div>
            <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:2}}>{n.label}</div>
            <div style={{fontSize:11,color:"#475569"}}>{n.sub}</div>
            <div style={{height:3,background:"rgba(255,255,255,.06)",borderRadius:99,marginTop:10}}>
              <div style={{height:3,borderRadius:99,width:n.id==="rotina"?`${progress}%`:n.id==="metas"?`${avgMeta}%`:"100%",background:n.color,transition:"width .6s"}}/>
            </div>
          </button>
        ))}
      </div>

      {/* Próximos blocos */}
      {nextItem && (
        <div style={{background:"#0d0d1a",borderRadius:14,padding:14,marginBottom:16,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.05)"}}>
          <div style={{fontSize:10,color:"#475569",fontWeight:600,textTransform:"uppercase",letterSpacing:".1em",marginBottom:10}}>Próximo bloco</div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:CATS[nextItem.cat]?.grad||"#1e1e2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{nextItem.icon}</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0"}}>{nextItem.label}</div>
              <div style={{fontSize:11,color:"#475569",marginTop:2}}>{nextItem.time} · {nextItem.desc}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tarefas pendentes preview */}
      {pendTarefas>0 && (
        <div style={{background:"#0d0d1a",borderRadius:14,padding:14,marginBottom:16,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,color:"#475569",fontWeight:600,textTransform:"uppercase",letterSpacing:".1em"}}>Tarefas de hoje</div>
            <button onClick={()=>setTab("tarefas")} style={{fontSize:11,color:"#fbbf24",background:"none",border:"none",cursor:"pointer"}}>Ver todas →</button>
          </div>
          {tarefas.filter(t=>!t.done).slice(0,3).map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,paddingBottom:7,marginBottom:7,borderBottom:"1px solid rgba(255,255,255,.04)"}}>
              <div style={{width:6,height:6,borderRadius:99,background:"#fbbf24",flexShrink:0}}/>
              <div style={{fontSize:13,color:"#cbd5e1",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROTINA TAB
// ════════════════════════════════════════════════════════════════
function RotinaTab({checked,toggleCheck}) {
  const [selCat,setSelCat] = useState("Todas");
  const cats = ["Todas",...Object.keys(CATS)];
  const filtered = selCat==="Todas" ? ROUTINE : ROUTINE.filter(r=>r.cat===selCat);

  return(
    <div style={{padding:"16px 16px 0",animation:"fadeIn .3s ease"}}>

      {/* Cat filter */}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,marginBottom:12,scrollbarWidth:"none"}}>
        {cats.map(c=>{
          const active=selCat===c;
          const cc=CATS[c]?.c||"#fbbf24";
          return(
            <button key={c} onClick={()=>setSelCat(c)} style={{
              fontSize:11,padding:"6px 12px",borderRadius:20,whiteSpace:"nowrap",flexShrink:0,
              background:active?cc+"22":"#0d0d1a",
              color:active?cc:"#334155",
              boxShadow:active?`inset 0 0 0 1px ${cc}55`:`inset 0 0 0 1px rgba(255,255,255,.05)`,
              border:"none",cursor:"pointer",fontWeight:active?600:400,transition:"all .2s",
              display:"flex",alignItems:"center",gap:5
            }}>
              {c!=="Todas"&&<span>{CATS[c]?.icon}</span>}
              {c}
            </button>
          );
        })}
      </div>

      {/* Items */}
      {filtered.map((item,idx)=>{
        const ck  = !!checked[item.id];
        const cc  = CATS[item.cat];
        const nowM= new Date().getHours()*60+new Date().getMinutes();
        const next= ROUTINE[ROUTINE.indexOf(item)+1];
        const isActive = nowM>=t2m(item.time) && (!next||nowM<t2m(next.time)) && !ck;

        return(
          <div key={item.id} onClick={()=>toggleCheck(item.id)} style={{
            display:"flex",gap:12,alignItems:"center",
            background:isActive?"rgba(251,191,36,.06)":ck?"#090910":"#0d0d1a",
            borderLeft:`3px solid ${ck?"#1e1e2e":cc?.c||"#fbbf24"}`,
            borderRadius:14,padding:"11px 13px",marginBottom:7,
            cursor:"pointer",opacity:ck?.45:1,
            boxShadow:isActive?"inset 0 0 0 1px rgba(251,191,36,.2)":"inset 0 0 0 1px rgba(255,255,255,.04)",
            transition:"all .2s",animation:`fadeIn .25s ease ${idx*.025}s both`
          }}>
            {/* Icon */}
            <div style={{
              width:38,height:38,borderRadius:10,flexShrink:0,
              background:ck?"#111":"rgba(255,255,255,.05)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18
            }}>{item.icon}</div>

            {/* Check */}
            <div style={{
              width:20,height:20,borderRadius:6,flexShrink:0,
              background:ck?cc?.c||"#fbbf24":"transparent",
              boxShadow:`inset 0 0 0 2px ${ck?cc?.c||"#fbbf24":"#334155"}`,
              display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"
            }}>
              {ck&&<svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" style={{width:11,height:11}}><polyline points="20 6 9 17 4 12"/></svg>}
            </div>

            {/* Content */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:isActive?600:500,color:ck?"#334155":"#e2e8f0",textDecoration:ck?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</div>
              <div style={{fontSize:10,color:"#334155",marginTop:1}}>{item.time} · {item.desc.substring(0,40)}...</div>
            </div>

            {/* Cat pill */}
            <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:6,background:(cc?.c||"#fbbf24")+"22",color:cc?.c||"#fbbf24",flexShrink:0,whiteSpace:"nowrap"}}>{item.cat}</span>
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
  const [showForm,setShowForm] = useState(false);

  const add = async () => {
    if(!form.title.trim()) return;
    await addTarefa(form);
    setForm({title:"",note:"",tag:"UPMIND",reminder_time:""});
    setShowForm(false);
  };

  const pending = tarefas.filter(t=>!t.done);
  const done    = tarefas.filter(t=>t.done);

  const TAG_COLORS = { UPMIND:"#c084fc", CentroMed:"#60a5fa", Marca:"#f472b6", Corpo:"#34d399", Pausa:"#94a3b8", Fechamento:"#fbbf24" };

  return(
    <div style={{padding:"16px 16px 0",animation:"fadeIn .3s ease"}}>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        {[
          {l:"Total",    v:tarefas.length,   c:"#94a3b8"},
          {l:"Pendentes",v:pending.length,   c:"#fbbf24"},
          {l:"Feitas",   v:done.length,      c:"#34d399"},
        ].map(s=>(
          <div key={s.l} style={{background:"#0d0d1a",borderRadius:12,padding:"10px 12px",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.05)"}}>
            <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,color:"#475569",marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Lista pendentes */}
      {pending.length===0&&!showForm&&(
        <div style={{textAlign:"center",padding:"32px 0"}}>
          <div style={{fontSize:32,marginBottom:8}}>✅</div>
          <div style={{fontSize:14,color:"#475569"}}>Sem tarefas pendentes</div>
        </div>
      )}

      {pending.map((t,i)=>(
        <TCard key={t.id} t={t} onToggle={toggleTarefa} onRemove={removeTarefa} colors={TAG_COLORS} idx={i}/>
      ))}

      {done.length>0&&(
        <div style={{marginTop:20}}>
          <div style={{fontSize:10,color:"#334155",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em"}}>Concluídas ({done.length})</div>
          {done.map((t,i)=><TCard key={t.id} t={t} onToggle={toggleTarefa} onRemove={removeTarefa} colors={TAG_COLORS} idx={i}/>)}
        </div>
      )}

      {/* Form inline */}
      {showForm&&(
        <div style={{background:"#0d0d1a",borderRadius:16,padding:14,marginBottom:12,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.07)",animation:"fadeIn .2s ease"}}>
          <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Título da tarefa..." autoFocus/>
          <Inp value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Observação..." style={{marginTop:8}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <div>
              <div style={fldLbl}>Categoria</div>
              <Sel value={form.tag} onChange={e=>setForm(f=>({...f,tag:e.target.value}))}>
                {Object.keys(TAG_COLORS).map(k=><option key={k}>{k}</option>)}
              </Sel>
            </div>
            <div>
              <div style={fldLbl}>Lembrete</div>
              <Inp type="time" value={form.reminder_time} onChange={e=>setForm(f=>({...f,reminder_time:e.target.value}))}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <PBtn onClick={add} style={{flex:1}}>Adicionar</PBtn>
            <PBtn ghost onClick={()=>setShowForm(false)} style={{flex:1}}>Cancelar</PBtn>
          </div>
        </div>
      )}

      {/* FAB */}
      {!showForm&&(
        <button onClick={()=>setShowForm(true)} style={{
          position:"fixed",bottom:"calc(80px + env(safe-area-inset-bottom,0px) + 16px)",right:20,
          width:52,height:52,borderRadius:16,
          background:"linear-gradient(135deg,#fbbf24,#f97316)",
          border:"none",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 4px 20px rgba(251,191,36,.4)",zIndex:50,transition:"all .2s"
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" style={{width:22,height:22}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}
    </div>
  );
}

function TCard({t,onToggle,onRemove,colors,idx}) {
  const c = colors[t.tag]||"#94a3b8";
  return(
    <div style={{display:"flex",gap:10,alignItems:"flex-start",background:"#0d0d1a",borderLeft:`3px solid ${t.done?"#1e1e2e":c}`,borderRadius:14,padding:"11px 12px",marginBottom:7,opacity:t.done?.4:1,animation:`fadeIn .22s ease ${idx*.03}s both`,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)"}}>
      <div onClick={()=>onToggle(t.id)} style={{width:20,height:20,borderRadius:6,flexShrink:0,marginTop:1,background:t.done?c:"transparent",boxShadow:`inset 0 0 0 2px ${t.done?c:"#334155"}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s"}}>
        {t.done&&<svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" style={{width:11,height:11}}><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:500,color:t.done?"#334155":"#e2e8f0",textDecoration:t.done?"line-through":"none"}}>{t.title}</div>
        {t.note&&<div style={{fontSize:11,color:"#475569",marginTop:2}}>{t.note}</div>}
        <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:6,background:c+"22",color:c}}>{t.tag}</span>
          {t.reminder_time&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:6,background:"rgba(255,255,255,.05)",color:"#94a3b8"}}>⏰ {t.reminder_time}</span>}
          <span style={{fontSize:10,color:"#1e2030"}}>{fmtDT(t.created_at)}</span>
        </div>
      </div>
      <button onClick={()=>onRemove(t.id)} style={{background:"none",border:"none",color:"#2a2a3e",cursor:"pointer",fontSize:18,lineHeight:1,padding:0}}>×</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// METAS TAB
// ════════════════════════════════════════════════════════════════
function MetasTab({metas,addMeta,updateMetaProgress,removeMeta,showToast}) {
  const [selCat,setSelCat]   = useState("Todas");
  const [detail,setDetail]   = useState(null);
  const [showForm,setShowForm] = useState(false);
  const [form,setForm]       = useState({title:"",descricao:"",cat:"UPMIND",tipo:"Mensal",target:100,prazo:"",objetivo:"",notas_meta:""});

  const add = async () => {
    if(!form.title.trim()) return;
    await addMeta(form);
    setForm({title:"",descricao:"",cat:"UPMIND",tipo:"Mensal",target:100,prazo:"",objetivo:"",notas_meta:""});
    setShowForm(false);
  };

  const cats    = ["Todas",...META_CATS];
  const filtered= selCat==="Todas"?metas:metas.filter(m=>m.cat===selCat);
  const pending = filtered.filter(m=>!m.done);
  const done    = filtered.filter(m=>m.done);
  const avg     = metas.length?Math.round(metas.reduce((s,m)=>s+(Number(m.current_val)/Math.max(Number(m.target),1))*100,0)/metas.length):0;

  if(detail) return <MetaDetail meta={detail} onBack={()=>setDetail(null)} onProgress={updateMetaProgress} onRemove={removeMeta}/>;

  return(
    <div style={{padding:"16px 16px 0",animation:"fadeIn .3s ease"}}>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {[
          {l:"Total",   v:metas.length,              c:"#94a3b8"},
          {l:"Ativas",  v:metas.filter(m=>!m.done).length, c:"#c084fc"},
          {l:"Média",   v:avg+"%",                   c:"#fbbf24"},
        ].map(s=>(
          <div key={s.l} style={{background:"#0d0d1a",borderRadius:12,padding:"10px 12px",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.05)"}}>
            <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,color:"#475569",marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Cat filter */}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:12,scrollbarWidth:"none"}}>
        {cats.map(c=>{
          const active=selCat===c;
          const cc=META_COLORS[c]||"#fbbf24";
          return(
            <button key={c} onClick={()=>setSelCat(c)} style={{
              fontSize:11,padding:"5px 12px",borderRadius:20,whiteSpace:"nowrap",flexShrink:0,
              background:active?cc+"22":"#0d0d1a",color:active?cc:"#334155",
              boxShadow:active?`inset 0 0 0 1px ${cc}55`:`inset 0 0 0 1px rgba(255,255,255,.05)`,
              border:"none",cursor:"pointer",fontWeight:active?600:400,transition:"all .2s"
            }}>{META_ICONS[c]||""} {c}</button>
          );
        })}
      </div>

      {pending.length===0&&!showForm&&<EmptyState icon="🎯" text="Nenhuma meta ativa" sub="Adicione sua primeira meta"/>}
      {pending.map((m,i)=><MCard key={m.id} m={m} onPress={()=>setDetail(m)} onProgress={updateMetaProgress} onRemove={removeMeta} idx={i}/>)}

      {done.length>0&&(
        <div style={{marginTop:20}}>
          <div style={{fontSize:10,color:"#334155",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em"}}>Concluídas ({done.length})</div>
          {done.map((m,i)=><MCard key={m.id} m={m} onPress={()=>setDetail(m)} onProgress={updateMetaProgress} onRemove={removeMeta} idx={i}/>)}
        </div>
      )}

      {showForm&&(
        <div style={{background:"#0d0d1a",borderRadius:16,padding:14,marginBottom:12,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.07)",animation:"fadeIn .2s ease"}}>
          <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Meta (ex: Ler 12 livros em 2026)..." autoFocus/>
          <Inp value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descrição / como vai medir..." style={{marginTop:8}}/>
          <Inp value={form.objetivo} onChange={e=>setForm(f=>({...f,objetivo:e.target.value}))} placeholder="Objetivo final / por que isso importa..." style={{marginTop:8}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <div>
              <div style={fldLbl}>Categoria</div>
              <Sel value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
                {META_CATS.map(c=><option key={c}>{c}</option>)}
              </Sel>
            </div>
            <div>
              <div style={fldLbl}>Tipo</div>
              <Sel value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                {["Diária","Semanal","Mensal","Trimestral","Anual"].map(t=><option key={t}>{t}</option>)}
              </Sel>
            </div>
            <div>
              <div style={fldLbl}>Meta (número)</div>
              <Inp type="number" value={form.target} onChange={e=>setForm(f=>({...f,target:Number(e.target.value)}))}/>
            </div>
            <div>
              <div style={fldLbl}>Prazo</div>
              <Inp type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <PBtn onClick={add} color="#c084fc" style={{flex:1}}>Criar Meta</PBtn>
            <PBtn ghost onClick={()=>setShowForm(false)} style={{flex:1}}>Cancelar</PBtn>
          </div>
        </div>
      )}

      {!showForm&&(
        <button onClick={()=>setShowForm(true)} style={{
          position:"fixed",bottom:"calc(80px + env(safe-area-inset-bottom,0px) + 16px)",right:20,
          width:52,height:52,borderRadius:16,
          background:"linear-gradient(135deg,#c084fc,#7c3aed)",
          border:"none",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 4px 20px rgba(192,132,252,.4)",zIndex:50
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" style={{width:22,height:22}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}
    </div>
  );
}

function MCard({m,onPress,onProgress,onRemove,idx}) {
  const c   = META_COLORS[m.cat]||"#c084fc";
  const pct = Math.round((Number(m.current_val)/Math.max(Number(m.target),1))*100);
  const [editing,setEditing] = useState(false);
  const [val,setVal]         = useState(m.current_val);

  return(
    <div style={{background:"#0d0d1a",borderLeft:`3px solid ${m.done?"#1e1e2e":c}`,borderRadius:14,padding:"13px",marginBottom:8,opacity:m.done?.5:1,animation:`fadeIn .22s ease ${idx*.03}s both`,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)"}}>
      <div onClick={onPress} style={{cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
              <span style={{fontSize:16}}>{META_ICONS[m.cat]||"🎯"}</span>
              <span style={{fontSize:14,fontWeight:600,color:m.done?"#334155":"#e2e8f0",textDecoration:m.done?"line-through":"none"}}>{m.title}</span>
            </div>
            {m.descricao&&<div style={{fontSize:11,color:"#475569"}}>{m.descricao}</div>}
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
            <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:6,background:c+"22",color:c}}>{m.cat}</span>
            <button onClick={e=>{e.stopPropagation();onRemove(m.id);}} style={{background:"none",border:"none",color:"#2a2a3e",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
          </div>
        </div>

        {/* Progress */}
        <div style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:11,color:"#475569"}}>{m.current_val} / {m.target}</span>
            <span style={{fontSize:14,fontWeight:700,color:pct>=100?"#34d399":pct>=60?c:"#fb923c"}}>{pct}%</span>
          </div>
          <div style={{height:8,background:"rgba(255,255,255,.06)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:8,borderRadius:99,width:`${Math.min(pct,100)}%`,background:pct>=100?"linear-gradient(90deg,#34d399,#059669)":`linear-gradient(90deg,${c},${c}88)`,transition:"width .6s ease",boxShadow:pct>=100?"0 0 10px #34d39944":undefined}}/>
          </div>
        </div>
      </div>

      {/* Update */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:5}}>
          <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:6,background:"rgba(255,255,255,.05)",color:"#475569"}}>{m.tipo}</span>
          {m.prazo&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:6,background:"rgba(255,255,255,.05)",color:"#475569"}}>até {fmtShort(m.prazo)}</span>}
        </div>
        {!m.done&&(
          editing?(
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <Inp type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:70}}/>
              <PBtn small color="#c084fc" onClick={()=>{onProgress(m.id,val);setEditing(false);}}>✓</PBtn>
            </div>
          ):(
            <button onClick={()=>{setVal(m.current_val);setEditing(true);}} style={{fontSize:11,background:"rgba(255,255,255,.05)",border:"none",color:"#94a3b8",borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>↑ Atualizar</button>
          )
        )}
      </div>
    </div>
  );
}

// ── META DETAIL ─────────────────────────────────────────────────
function MetaDetail({meta,onBack,onProgress,onRemove}) {
  const c   = META_COLORS[meta.cat]||"#c084fc";
  const pct = Math.round((Number(meta.current_val)/Math.max(Number(meta.target),1))*100);
  const [val,setVal]     = useState(meta.current_val);
  const [editing,setEditing] = useState(false);

  return(
    <div style={{padding:"16px 16px 0",animation:"fadeIn .25s ease"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,marginBottom:16,padding:0}}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:16,height:16}}><polyline points="15 18 9 12 15 6"/></svg>
        Voltar
      </button>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${c}22,${c}08)`,borderRadius:18,padding:18,marginBottom:16,boxShadow:`inset 0 0 0 1px ${c}33`}}>
        <div style={{fontSize:32,marginBottom:8}}>{META_ICONS[meta.cat]||"🎯"}</div>
        <div style={{fontSize:20,fontWeight:700,color:"#f1f5f9",marginBottom:4}}>{meta.title}</div>
        {meta.descricao&&<div style={{fontSize:13,color:"#94a3b8",marginBottom:8}}>{meta.descricao}</div>}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:20,background:c+"33",color:c}}>{meta.cat}</span>
          <span style={{fontSize:10,padding:"3px 9px",borderRadius:20,background:"rgba(255,255,255,.08)",color:"#94a3b8"}}>{meta.tipo}</span>
          {meta.prazo&&<span style={{fontSize:10,padding:"3px 9px",borderRadius:20,background:"rgba(255,255,255,.08)",color:"#94a3b8"}}>até {fmtShort(meta.prazo)}</span>}
        </div>
      </div>

      {/* Progress */}
      <div style={{background:"#0d0d1a",borderRadius:16,padding:16,marginBottom:12,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.05)"}}>
        <div style={{fontSize:10,color:"#475569",fontWeight:600,textTransform:"uppercase",letterSpacing:".1em",marginBottom:12}}>Progresso</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <div style={{fontSize:32,fontWeight:800,color:pct>=100?"#34d399":c}}>{pct}%</div>
            <div style={{fontSize:12,color:"#475569"}}>{meta.current_val} de {meta.target}</div>
          </div>
          {!meta.done&&(
            editing?(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <Inp type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:80}}/>
                <PBtn color={c} onClick={()=>{onProgress(meta.id,val);setEditing(false);}}>✓</PBtn>
              </div>
            ):(
              <PBtn color={c} onClick={()=>{setVal(meta.current_val);setEditing(true);}}>Atualizar</PBtn>
            )
          )}
        </div>
        <div style={{height:12,background:"rgba(255,255,255,.06)",borderRadius:99,overflow:"hidden",marginBottom:12}}>
          <div style={{height:12,borderRadius:99,width:`${Math.min(pct,100)}%`,background:pct>=100?"linear-gradient(90deg,#34d399,#059669)":`linear-gradient(90deg,${c},${c}88)`,transition:"width .8s ease",boxShadow:pct>=100?"0 0 16px #34d39955":undefined}}/>
        </div>

        {/* Log histórico */}
        {meta.logs&&meta.logs.length>0&&(
          <div>
            <div style={{fontSize:10,color:"#475569",marginBottom:6}}>Histórico de atualizações</div>
            {meta.logs.slice(-5).reverse().map((l,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                <span style={{fontSize:11,color:"#475569"}}>{fmtDT(l.at)}</span>
                <span style={{fontSize:11,fontWeight:600,color:c}}>{l.val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Objetivo */}
      {meta.objetivo&&(
        <div style={{background:"#0d0d1a",borderRadius:16,padding:16,marginBottom:12,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.05)"}}>
          <div style={{fontSize:10,color:"#475569",fontWeight:600,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>Por que isso importa</div>
          <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>{meta.objetivo}</div>
        </div>
      )}

      {/* Info */}
      <div style={{background:"#0d0d1a",borderRadius:16,padding:16,marginBottom:20,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.05)"}}>
        <div style={{fontSize:10,color:"#475569",fontWeight:600,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>Detalhes</div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
          <span style={{fontSize:12,color:"#475569"}}>Criada em</span>
          <span style={{fontSize:12,color:"#94a3b8"}}>{fmtDT(meta.created_at)}</span>
        </div>
        {meta.done_at&&(
          <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}>
            <span style={{fontSize:12,color:"#475569"}}>Concluída em</span>
            <span style={{fontSize:12,color:"#34d399"}}>{fmtDT(meta.done_at)}</span>
          </div>
        )}
      </div>

      <button onClick={()=>{onRemove(meta.id);onBack();}} style={{width:"100%",padding:12,borderRadius:12,background:"rgba(239,68,68,.08)",border:"none",color:"#ef4444",fontSize:13,cursor:"pointer",boxShadow:"inset 0 0 0 1px rgba(239,68,68,.2)"}}>
        Remover meta
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// IA TAB
// ════════════════════════════════════════════════════════════════
function IATab({chat,setChat,addTarefa,addMeta,showToast,tarefas,checked,progress,nextItem,metas,notas,addNota,convertNota,removeNota}) {
  const [input,setInput]   = useState("");
  const [loading,setLoading] = useState(false);
  const [mode,setMode]     = useState("chat"); // chat | notas
  const [text,setText]     = useState("");
  const [recording,setRecording] = useState(false);
  const endRef  = useRef(null);
  const mediaRef= useRef(null);
  const chunks  = useRef([]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[chat]);

  const pending = tarefas.filter(t=>!t.done).length;
  const doneB   = Object.values(checked).filter(Boolean).length;

  const send = async (text) => {
    if(!text.trim()||loading) return;
    const userMsg = {role:"user",content:text};
    const next = [...chat,userMsg];
    setChat(next);
    setInput("");
    setLoading(true);

    const ctx = `[CONTEXTO ${new Date().toLocaleDateString("pt-BR")}: Rotina ${progress}% (${doneB}/${ROUTINE.length} blocos). Próximo: ${nextItem?`${nextItem.time} - ${nextItem.label}`:"rotina concluída"}. Tarefas pendentes: ${pending}. Metas ativas: ${metas.filter(m=>!m.done).length}. Se o usuário mencionar uma tarefa ou meta, responda normalmente e inclua ao final do JSON uma linha: CADASTRAR:{"tipo":"tarefa|meta","title":"...","tag":"...","cat":"...","target":100}]

${text}`;
    try {
      const reply = await askAI([...chat,{role:"user",content:ctx}]);

      // Detectar se IA quer cadastrar algo
      const cadastrarMatch = reply.match(/CADASTRAR:(\{.*?\})/s);
      let cleanReply = reply;
      if(cadastrarMatch) {
        cleanReply = reply.replace(/CADASTRAR:\{.*?\}/s,"").trim();
        try {
          const data = JSON.parse(cadastrarMatch[1]);
          if(data.tipo==="meta") {
            await addMeta({title:data.title, cat:data.cat||"UPMIND", tipo:"Mensal", target:data.target||100, descricao:"", objetivo:""});
            showToast("✓ Meta cadastrada pela IA");
          } else {
            await addTarefa({title:data.title, tag:data.tag||"UPMIND", note:"", reminder_time:""});
            showToast("✓ Tarefa cadastrada pela IA");
          }
        } catch {}
      }

      setChat([...next,{role:"assistant",content:cleanReply}]);
    } catch {
      setChat([...next,{role:"assistant",content:"Erro de conexão. Verifique a API key."}]);
    }
    setLoading(false);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = e => chunks.current.push(e.data);
      mr.onstop = () => { stream.getTracks().forEach(t=>t.stop()); setRecording(false); showToast("Áudio registrado"); };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { showToast("Microfone bloqueado","error"); }
  };
  const stopRec = () => { if(mediaRef.current&&recording) mediaRef.current.stop(); };

  const quick = ["Como está meu dia?","O que ainda falta?","Analisa minhas metas","Sugestão de foco agora"];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100dvh - 180px)",padding:"0",animation:"fadeIn .3s ease"}}>

      {/* Mode tabs */}
      <div style={{display:"flex",gap:0,background:"#0d0d1a",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
        {[{id:"chat",l:"Chat IA"},{id:"notas",l:"Notas + Áudio"}].map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)} style={{flex:1,padding:"10px",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:mode===m.id?600:400,color:mode===m.id?"#fbbf24":"#334155",borderBottom:mode===m.id?"2px solid #fbbf24":"2px solid transparent",transition:"all .2s"}}>
            {m.l}
          </button>
        ))}
      </div>

      {mode==="notas" ? (
        <div style={{flex:1,overflowY:"scroll",WebkitOverflowScrolling:"touch",padding:"12px 16px"}}>
          {/* Audio + texto */}
          <div style={{background:"#0d0d1a",borderRadius:16,padding:14,marginBottom:12,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.05)"}}>
            <button onClick={recording?stopRec:startRec} style={{
              width:"100%",padding:"10px",borderRadius:10,marginBottom:10,cursor:"pointer",
              background:recording?"rgba(239,68,68,.1)":"rgba(255,255,255,.04)",
              border:`1px solid ${recording?"rgba(239,68,68,.4)":"rgba(255,255,255,.08)"}`,
              color:recording?"#f87171":"#94a3b8",fontSize:13,fontWeight:500,
              display:"flex",alignItems:"center",justifyContent:"center",gap:7
            }}>
              {recording?<><div style={{width:7,height:7,borderRadius:99,background:"#ef4444",animation:"pulse 1s infinite"}}/> Parar gravação</>:<>🎙️ Gravar áudio</>}
            </button>
            <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Escreva ou dite... A IA detecta automaticamente se é tarefa ou meta." rows={3}
              style={{width:"100%",background:"rgba(255,255,255,.04)",border:"none",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:16,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.5}}/>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
              <PBtn onClick={async()=>{if(text.trim()){await addNota(text);setText("");}}} color="#c084fc">Salvar nota</PBtn>
            </div>
          </div>

          {notas.length===0&&<EmptyState icon="📝" text="Nenhuma anotação" sub="Escreva ou grave acima"/>}
          {notas.map((n,i)=>(
            <div key={n.id} style={{background:"#0d0d1a",borderLeft:`3px solid ${n.converted?"#34d399":"#c084fc"}`,borderRadius:14,padding:"12px",marginBottom:8,opacity:n.converted?.6:1,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.04)"}}>
              <div style={{fontSize:13,color:"#cbd5e1",lineHeight:1.6,marginBottom:8}}>{n.texto}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:10,color:"#334155"}}>{fmtDT(n.created_at)}</span>
                <div style={{display:"flex",gap:6}}>
                  {n.converted
                    ?<span style={{fontSize:11,color:"#34d399",fontWeight:500}}>✓ Cadastrado</span>
                    :<button onClick={()=>convertNota(n)} style={{fontSize:11,background:"rgba(192,132,252,.12)",color:"#c084fc",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontWeight:500}}>→ Cadastrar</button>
                  }
                  <button onClick={()=>removeNota(n.id)} style={{background:"none",border:"none",color:"#2a2a3e",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{flex:1,overflowY:"scroll",WebkitOverflowScrolling:"touch",padding:"10px 16px"}}>
            {/* Model badge */}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
              <div style={{width:6,height:6,borderRadius:99,background:"#34d399",animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:10,color:"#334155"}}>Claude Sonnet 4 · Anthropic · Contexto carregado</span>
              <button onClick={()=>setChat([])} style={{marginLeft:"auto",fontSize:10,background:"none",border:"1px solid rgba(255,255,255,.07)",color:"#334155",borderRadius:6,padding:"2px 7px",cursor:"pointer"}}>Limpar</button>
            </div>

            {chat.length===0&&(
              <div style={{textAlign:"center",padding:"24px 0"}}>
                <div style={{fontSize:36,marginBottom:8}}>🧠</div>
                <div style={{fontSize:14,fontWeight:500,color:"#475569",marginBottom:4}}>Assistente Pessoal</div>
                <div style={{fontSize:11,color:"#334155",marginBottom:20}}>Posso criar tarefas e metas automaticamente</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {quick.map(q=>(
                    <button key={q} onClick={()=>send(q)} style={{background:"#0d0d1a",border:"none",color:"#475569",borderRadius:12,padding:"11px 14px",cursor:"pointer",fontSize:13,textAlign:"left",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.05)"}}>
                      {q} →
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chat.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:8}}>
                <div style={{maxWidth:"82%",background:m.role==="user"?"linear-gradient(135deg,rgba(251,191,36,.18),rgba(249,115,22,.12))":"#0d0d1a",boxShadow:m.role==="user"?"inset 0 0 0 1px rgba(251,191,36,.2)":"inset 0 0 0 1px rgba(255,255,255,.06)",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"10px 13px",fontSize:13,color:"#e2e8f0",lineHeight:1.65,whiteSpace:"pre-wrap"}}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading&&(
              <div style={{display:"flex",gap:5,padding:"11px 14px",background:"#0d0d1a",borderRadius:"16px 16px 16px 4px",width:"fit-content",marginBottom:8,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.06)"}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:99,background:"#334155",animation:`pulse 1.4s ${i*.2}s infinite`}}/>)}
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* Input */}
          <div style={{display:"flex",gap:8,padding:"10px 16px max(10px,env(safe-area-inset-bottom)) 16px",borderTop:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}}
              placeholder="Pergunte ou diga o que precisa fazer..." rows={1}
              style={{flex:1,background:"rgba(255,255,255,.05)",border:"none",borderRadius:12,padding:"10px 13px",color:"#e2e8f0",fontSize:16,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.4,maxHeight:100,overflowY:"auto"}}/>
            <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{
              width:42,height:42,borderRadius:12,flexShrink:0,alignSelf:"flex-end",
              background:loading||!input.trim()?"rgba(255,255,255,.05)":"linear-gradient(135deg,#fbbf24,#f97316)",
              border:"none",cursor:loading||!input.trim()?"default":"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={loading||!input.trim()?"#334155":"#000"} strokeWidth="2.5" style={{width:17,height:17}}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── SHARED ──────────────────────────────────────────────────────
function PBtn({children,onClick,color,ghost,small,style,disabled}) {
  const c=color||"#fbbf24";
  return(
    <button onClick={onClick} disabled={disabled} style={{
      background:ghost?"transparent":`linear-gradient(135deg,${c},${c}bb)`,
      color:ghost?"#475569":"#000",
      border:ghost?"1px solid rgba(255,255,255,.08)":"none",
      borderRadius:10,padding:small?"5px 11px":"10px 18px",
      fontSize:small?11:13,fontWeight:700,cursor:disabled?"default":"pointer",
      opacity:disabled?.5:1,transition:"all .2s",
      fontFamily:"inherit",boxShadow:ghost?"none":`0 3px 12px ${c}33`,...style
    }}>{children}</button>
  );
}

function Inp({style,...props}) {
  return <input style={{width:"100%",background:"rgba(255,255,255,.06)",border:"none",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:16,outline:"none",display:"block",fontFamily:"inherit",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.08)",...style}} {...props}/>;
}

function Sel({style,children,...props}) {
  return <select style={{width:"100%",background:"#111",border:"none",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:16,outline:"none",display:"block",fontFamily:"inherit",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.08)",...style}} {...props}>{children}</select>;
}

function EmptyState({icon,text,sub}) {
  return(
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:36,marginBottom:8,opacity:.4}}>{icon}</div>
      <div style={{fontSize:14,fontWeight:500,color:"#334155",marginBottom:4}}>{text}</div>
      {sub&&<div style={{fontSize:12,color:"#1e2030"}}>{sub}</div>}
    </div>
  );
}

const fldLbl = {fontSize:11,color:"#475569",marginBottom:4,fontWeight:500};
