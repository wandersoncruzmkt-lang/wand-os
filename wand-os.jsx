import { useState, useEffect, useRef } from "react";

// ─── HELPERS ────────────────────────────────────────────────────
const STORAGE_KEY = "wandos_v2";
const getToday = () => new Date().toISOString().split("T")[0];
const fmtTime = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d) => d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtDateShort = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const fmtDateTime = (iso) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const timeToMins = (str) => { const [h, m] = str.split(":").map(Number); return h * 60 + m; };

function loadDB() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; } }
function saveDB(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} }

// ─── ROUTINE ────────────────────────────────────────────────────
const ROUTINE = [
  { id:"r1",  time:"04:50", label:"Despertar e ativação",       desc:"Água 500ml · Sem celular · Roupa separada",                tag:"Corpo" },
  { id:"r2",  time:"05:00", label:"Academia",                   desc:"90 min treino · Mente livre · Nota de voz se vier ideia",  tag:"Corpo" },
  { id:"r3",  time:"06:30", label:"Retorno + café + leitura",   desc:"Banho · 1ª refeição · 10 min leitura estratégica",         tag:"Corpo" },
  { id:"r4",  time:"07:10", label:"Deslocamento → CentroMed",   desc:"Revisar pauta no trajeto · Chegar 7h25",                   tag:"CentroMed" },
  { id:"r5",  time:"07:30", label:"Abertura CentroMed",         desc:"Meta Ads · CPL · WhatsApp corp · Alinhar Breno",           tag:"CentroMed" },
  { id:"r6",  time:"08:00", label:"Bloco conteúdo CentroMed",   desc:"Maria Eduarda · Aprovações · Gravações · Caixa Preta",     tag:"CentroMed" },
  { id:"r7",  time:"09:30", label:"Reunião médicos parceiros",  desc:"João Paulo · Mardônio · Larissa · CFM compliance",         tag:"CentroMed" },
  { id:"r8",  time:"10:30", label:"Tráfego pago — otimização",  desc:"Frequência < 2,5x · CPL < R$4 → escalar",                 tag:"CentroMed" },
  { id:"r9",  time:"12:00", label:"Pausa — 2ª refeição",        desc:"Almoço natural · Sem tela · 20 min descanso",              tag:"Pausa" },
  { id:"r10", time:"13:00", label:"Bloco UPMIND — clientes",    desc:"Dra. Ivna · Portal Minha Viagem · Festas Conceito",        tag:"UPMIND" },
  { id:"r11", time:"14:30", label:"Estratégia UPMIND",          desc:"Mentoria waitlist · Newton governance · Copa 2026",        tag:"UPMIND" },
  { id:"r12", time:"15:30", label:"Conteúdo @wandersoncruz.ce", desc:"1 conteúdo · Editorial do dia · Hook→Virada→Moral→CTA",   tag:"Marca" },
  { id:"r13", time:"16:30", label:"Gestão presença digital",    desc:"DMs estratégicos · Story bastidores · Métricas",           tag:"Marca" },
  { id:"r14", time:"17:00", label:"Review do dia",              desc:"Executado vs planejado · 3 prioridades amanhã",            tag:"Fechamento" },
  { id:"r15", time:"17:30", label:"Refeição + família",         desc:"Refeição natural · Família · Leitura leve",                tag:"Fechamento" },
  { id:"r16", time:"19:30", label:"Wind down",                  desc:"Última refeição leve · Sem tela · Dormir 21h30",           tag:"Fechamento" },
];

const TC = {
  Corpo:      { dot:"#22c55e", dim:"#16532e" },
  CentroMed:  { dot:"#3b82f6", dim:"#1e3a5f" },
  UPMIND:     { dot:"#8b5cf6", dim:"#3b1f6e" },
  Marca:      { dot:"#f97316", dim:"#7c2d12" },
  Pausa:      { dot:"#6b7280", dim:"#374151" },
  Fechamento: { dot:"#eab308", dim:"#713f12" },
};
const META_CATS = ["UPMIND","CentroMed","Marca Pessoal","Saúde","Financeiro","Pessoal"];
const META_CAT_COLORS = {
  "UPMIND":       "#8b5cf6",
  "CentroMed":    "#3b82f6",
  "Marca Pessoal":"#f97316",
  "Saúde":        "#22c55e",
  "Financeiro":   "#eab308",
  "Pessoal":      "#ec4899",
};

// ─── NOTIFICATIONS ───────────────────────────────────────────────
function askNotif() { if("Notification" in window && Notification.permission==="default") Notification.requestPermission(); }
function notify(title, body) { if("Notification" in window && Notification.permission==="granted") new Notification(title,{body}); }

// ─── AI ──────────────────────────────────────────────────────────
async function askAI(messages, systemOverride) {
  const system = systemOverride || `Você é o assistente pessoal de Wanderson Cruz — O Sábio Estrategista do Sertão. Diretor de Marketing CentroMed + Founder UPMIND, Crateús-CE. Tom: direto, calmo, estratégico. Sem hype. Respostas curtas e práticas em português brasileiro informal. Máximo 3 parágrafos.`;
  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system, messages })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Erro de conexão.";
}

// ════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════
export default function WandOS() {
  const today = getToday();
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState("rotina");
  const [db, setDb] = useState(() => loadDB());

  const dayKey = `day_${today}`;
  const todayData = db[dayKey] || {};
  const checked  = todayData.checked || {};
  const tasks    = todayData.tasks   || [];
  const notes    = db.notes  || [];
  const metas    = db.metas  || [];
  const chat     = db.chat   || [];
  const history  = db.history || {}; // {date: doneCount}

  function upDay(patch) { const n={...db,[dayKey]:{...todayData,...patch}}; setDb(n); saveDB(n); }
  function upRoot(patch){ const n={...db,...patch}; setDb(n); saveDB(n); }

  // clock + history snapshot
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      // snapshot daily progress
      const done = Object.values(db[`day_${today}`]?.checked||{}).filter(Boolean).length;
      const h = { ...(db.history||{}), [today]: done };
      saveDB({...db, history:h});
    }, 60000);
    return () => clearInterval(t);
  }, [db]);

  useEffect(() => { askNotif(); }, []);

  // reminders
  useEffect(() => {
    const cur = fmtTime(now);
    ROUTINE.forEach(item => {
      const [h,m] = item.time.split(":").map(Number);
      const rem = new Date(); rem.setHours(h, m-30, 0);
      if(fmtTime(rem)===cur && !checked[item.id]) notify(`⏰ Em 30 min: ${item.label}`, item.desc);
    });
    tasks.forEach(t => {
      if(t.reminderTime===cur && !t.done && !t.reminded) {
        notify(`📌 ${t.title}`, t.note||"Hora de executar.");
        upDay({tasks: tasks.map(x=>x.id===t.id?{...x,reminded:true}:x)});
      }
    });
  }, [now]);

  const done     = Object.values(checked).filter(Boolean).length;
  const progress = Math.round((done / ROUTINE.length) * 100);
  const nowMins  = now.getHours()*60 + now.getMinutes();
  const current  = ROUTINE.slice().reverse().find(r => timeToMins(r.time) <= nowMins);
  const nextItem = ROUTINE.find(r => !checked[r.id] && timeToMins(r.time) > nowMins);

  const TABS = [
    {id:"rotina",  label:"Rotina"},
    {id:"tarefas", label:"Tarefas"},
    {id:"metas",   label:"Metas"},
    {id:"notas",   label:"Notas"},
    {id:"graficos",label:"Gráficos"},
    {id:"ia",      label:"IA"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#080808",color:"#f0f0f0",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* TOPBAR */}
      <div style={{background:"#101010",borderBottom:"1px solid #1c1c1c",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:7,background:"linear-gradient(135deg,#8b5cf6,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:"#fff"}}>W</div>
          <div>
            <div style={{fontSize:12,fontWeight:600,letterSpacing:".1em",color:"#e0e0e0"}}>WAND OS</div>
            <div style={{fontSize:10,color:"#444",marginTop:-1}}>Gestão Pessoal · Wanderson Cruz</div>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:20,fontWeight:300,fontFamily:"'DM Mono'",color:"#f0f0f0"}}>{fmtTime(now)}</div>
          <div style={{fontSize:10,color:"#555",textTransform:"capitalize"}}>{fmtDate(now)}</div>
        </div>
      </div>

      {/* PROGRESS BANNER */}
      <div style={{background:"#101010",padding:"12px 20px",borderBottom:"1px solid #1c1c1c"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:11,color:"#555"}}>Progresso do dia — {done}/{ROUTINE.length} blocos concluídos</div>
          <div style={{fontSize:18,fontWeight:600,fontFamily:"'DM Mono'",color:progress>=80?"#22c55e":progress>=40?"#eab308":"#f97316"}}>{progress}%</div>
        </div>
        <div style={{height:5,background:"#1c1c1c",borderRadius:99}}>
          <div style={{height:5,borderRadius:99,width:`${progress}%`,background:progress>=80?"#22c55e":progress>=40?"#eab308":"#8b5cf6",transition:"width .6s ease"}}/>
        </div>
        <div style={{display:"flex",gap:16,marginTop:8}}>
          {current && <div style={{fontSize:11,color:"#777"}}>Agora: <span style={{color:TC[current.tag]?.dot||"#aaa",fontWeight:500}}>{current.label}</span></div>}
          {nextItem && <div style={{fontSize:11,color:"#444"}}>Próximo {nextItem.time}: {nextItem.label}</div>}
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",background:"#101010",borderBottom:"1px solid #1c1c1c",padding:"0 12px",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 14px",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:500,color:tab===t.id?"#f0f0f0":"#444",borderBottom:tab===t.id?"2px solid #8b5cf6":"2px solid transparent",whiteSpace:"nowrap",fontFamily:"inherit",transition:"color .2s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{padding:"16px 20px",maxWidth:920,margin:"0 auto"}}>
        {tab==="rotina"   && <RotinaTab   checked={checked} upDay={upDay} />}
        {tab==="tarefas"  && <TarefasTab  tasks={tasks} upDay={upDay} />}
        {tab==="metas"    && <MetasTab    metas={metas} upRoot={upRoot} />}
        {tab==="notas"    && <NotasTab    notes={notes} upRoot={upRoot} tasks={tasks} upDay={upDay} />}
        {tab==="graficos" && <GraficosTab checked={checked} metas={metas} tasks={tasks} history={history} today={today}/>}
        {tab==="ia"       && <IATab       chat={chat} upRoot={upRoot} tasks={tasks} checked={checked} progress={progress} nextItem={nextItem} metas={metas}/>}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:#222;border-radius:2px} *{box-sizing:border-box}`}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROTINA TAB
// ════════════════════════════════════════════════════════════════
function RotinaTab({ checked, upDay }) {
  const toggle = id => upDay({checked:{...checked,[id]:!checked[id]}});

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:15,fontWeight:500}}>Rotina do Dia</div>
        <button onClick={()=>upDay({checked:{}})} style={ghostBtn}>Resetar dia</button>
      </div>
      {ROUTINE.map(item=>{
        const done=!!checked[item.id];
        const tc=TC[item.tag]||TC.Pausa;
        return(
          <div key={item.id} onClick={()=>toggle(item.id)} style={{display:"flex",gap:12,marginBottom:6,cursor:"pointer",alignItems:"flex-start"}}>
            <div style={{paddingTop:3,minWidth:40,textAlign:"right"}}>
              <span style={{fontSize:11,fontFamily:"'DM Mono'",color:done?"#2a2a2a":"#555"}}>{item.time}</span>
            </div>
            <div style={{width:2,background:done?"#1c1c1c":tc.dot,borderRadius:1,alignSelf:"stretch",minHeight:28,flexShrink:0}}/>
            <div style={{flex:1,background:done?"#0e0e0e":"#131313",border:`1px solid ${done?"#181818":"#202020"}`,borderRadius:9,padding:"8px 12px",transition:"all .2s",opacity:done?.45:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${done?"#2a2a2a":tc.dot}`,background:done?tc.dot:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {done&&<span style={{fontSize:9,color:"#fff"}}>✓</span>}
                  </div>
                  <span style={{fontSize:13,fontWeight:500,color:done?"#333":"#e8e8e8",textDecoration:done?"line-through":"none"}}>{item.label}</span>
                </div>
                <span style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:tc.dim+"55",color:tc.dot,border:`1px solid ${tc.dot}33`,flexShrink:0}}>{item.tag}</span>
              </div>
              <div style={{fontSize:11,color:"#444",marginTop:3,marginLeft:24}}>{item.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAREFAS TAB
// ════════════════════════════════════════════════════════════════
function TarefasTab({ tasks, upDay }) {
  const [form,setForm]=useState({title:"",note:"",reminderTime:"",tag:"UPMIND"});
  const add=()=>{
    if(!form.title.trim())return;
    upDay({tasks:[...tasks,{...form,id:Date.now().toString(),done:false,reminded:false,createdAt:new Date().toISOString()}]});
    setForm({title:"",note:"",reminderTime:"",tag:"UPMIND"});
  };
  const toggle = id => upDay({tasks:tasks.map(t=>t.id===id?{...t,done:!t.done,doneAt:!t.done?new Date().toISOString():undefined}:t)});
  const remove = id => upDay({tasks:tasks.filter(t=>t.id!==id)});
  const pending=tasks.filter(t=>!t.done);
  const done=tasks.filter(t=>t.done);

  return(
    <div>
      <div style={{background:"#131313",border:"1px solid #1e1e1e",borderRadius:10,padding:14,marginBottom:16}}>
        <div style={{fontSize:11,color:"#555",fontWeight:500,marginBottom:10,textTransform:"uppercase",letterSpacing:".08em"}}>Nova Tarefa</div>
        <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Título da tarefa..." style={inp}/>
        <input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Observação..." style={{...inp,marginTop:6}}/>
        <div style={{display:"flex",gap:6,marginTop:6}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:"#444",marginBottom:3}}>Lembrete</div>
            <input type="time" value={form.reminderTime} onChange={e=>setForm(f=>({...f,reminderTime:e.target.value}))} style={inp}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:"#444",marginBottom:3}}>Categoria</div>
            <select value={form.tag} onChange={e=>setForm(f=>({...f,tag:e.target.value}))} style={inp}>
              {Object.keys(TC).map(k=><option key={k}>{k}</option>)}
            </select>
          </div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <button onClick={add} style={primaryBtn}>+ Adicionar</button>
          </div>
        </div>
      </div>

      {pending.length===0&&<div style={{textAlign:"center",color:"#333",fontSize:13,padding:28}}>Nenhuma tarefa pendente ✓</div>}
      {pending.map(t=><TaskCard key={t.id} t={t} onToggle={toggle} onRemove={remove}/>)}

      {done.length>0&&(
        <div style={{marginTop:20}}>
          <div style={{fontSize:10,color:"#333",marginBottom:8,fontWeight:500,textTransform:"uppercase",letterSpacing:".08em"}}>Concluídas ({done.length})</div>
          {done.map(t=><TaskCard key={t.id} t={t} onToggle={toggle} onRemove={remove}/>)}
        </div>
      )}
    </div>
  );
}

function TaskCard({t,onToggle,onRemove}){
  const tc=TC[t.tag]||TC.Pausa;
  return(
    <div style={{display:"flex",gap:10,background:"#111",border:"1px solid #1c1c1c",borderRadius:8,padding:"9px 12px",marginBottom:5,opacity:t.done?.4:1,alignItems:"flex-start"}}>
      <div onClick={()=>onToggle(t.id)} style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${t.done?tc.dot:"#333"}`,background:t.done?tc.dot:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,marginTop:2}}>
        {t.done&&<span style={{fontSize:9,color:"#fff"}}>✓</span>}
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:500,color:t.done?"#333":"#e0e0e0",textDecoration:t.done?"line-through":"none"}}>{t.title}</div>
        {t.note&&<div style={{fontSize:11,color:"#444",marginTop:2}}>{t.note}</div>}
        <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
          <span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:tc.dim+"44",color:tc.dot,border:`1px solid ${tc.dot}33`}}>{t.tag}</span>
          {t.reminderTime&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:"#1a1a1a",color:"#666",border:"1px solid #222"}}>⏰ {t.reminderTime}</span>}
          <span style={{fontSize:10,color:"#333"}}>{fmtDateTime(t.createdAt)}</span>
          {t.doneAt&&<span style={{fontSize:10,color:"#22c55e44"}}>✓ {fmtDateTime(t.doneAt)}</span>}
        </div>
      </div>
      <button onClick={()=>onRemove(t.id)} style={{background:"none",border:"none",color:"#2a2a2a",cursor:"pointer",fontSize:15,padding:0}}>×</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// METAS TAB
// ════════════════════════════════════════════════════════════════
function MetasTab({ metas, upRoot }) {
  const [form,setForm]=useState({title:"",desc:"",prazo:"",cat:"UPMIND",tipo:"Mensal",target:100,current:0});
  const [selCat,setSelCat]=useState("Todas");

  const add=()=>{
    if(!form.title.trim())return;
    upRoot({metas:[...metas,{...form,id:Date.now().toString(),done:false,createdAt:new Date().toISOString(),logs:[]}]});
    setForm({title:"",desc:"",prazo:"",cat:"UPMIND",tipo:"Mensal",target:100,current:0});
  };

  const setProgress=(id,val)=>{
    upRoot({metas:metas.map(m=>{
      if(m.id!==id)return m;
      const cur=Math.min(Math.max(0,Number(val)),m.target);
      const done=cur>=m.target;
      const logs=[...(m.logs||[]),{at:new Date().toISOString(),val:cur}];
      return{...m,current:cur,done,doneAt:done?new Date().toISOString():undefined,logs};
    })});
  };

  const remove=id=>upRoot({metas:metas.filter(m=>m.id!==id)});

  const cats=["Todas",...META_CATS];
  const filtered=selCat==="Todas"?metas:metas.filter(m=>m.cat===selCat);
  const pending=filtered.filter(m=>!m.done);
  const done=filtered.filter(m=>m.done);

  // stats
  const totalAll=metas.length, doneAll=metas.filter(m=>m.done).length;
  const avgProg=metas.length?Math.round(metas.reduce((s,m)=>s+(m.current/Math.max(m.target,1))*100,0)/metas.length):0;

  return(
    <div>
      {/* stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        {[
          {label:"Total de metas",  val:totalAll,  sub:"registradas"},
          {label:"Concluídas",      val:doneAll,   sub:`${Math.round((doneAll/Math.max(totalAll,1))*100)}% do total`},
          {label:"Progresso médio", val:avgProg+"%",sub:"todas as metas"},
        ].map(s=>(
          <div key={s.label} style={{background:"#131313",border:"1px solid #1e1e1e",borderRadius:10,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"#555",marginBottom:4,textTransform:"uppercase",letterSpacing:".08em"}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:500,fontFamily:"'DM Mono'"}}>{s.val}</div>
            <div style={{fontSize:10,color:"#444",marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* filter */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setSelCat(c)} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:selCat===c?(META_CAT_COLORS[c]||"#8b5cf6")+"33":"#131313",color:selCat===c?(META_CAT_COLORS[c]||"#8b5cf6"):"#555",border:`1px solid ${selCat===c?(META_CAT_COLORS[c]||"#8b5cf6")+"55":"#1e1e1e"}`,cursor:"pointer",fontFamily:"inherit"}}>
            {c}
          </button>
        ))}
      </div>

      {/* add form */}
      <div style={{background:"#131313",border:"1px solid #1e1e1e",borderRadius:10,padding:14,marginBottom:16}}>
        <div style={{fontSize:11,color:"#555",fontWeight:500,marginBottom:10,textTransform:"uppercase",letterSpacing:".08em"}}>Nova Meta</div>
        <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Meta (ex: R$15k/mês faturamento UPMIND)..." style={inp}/>
        <input value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Como vai medir / desdobramento..." style={{...inp,marginTop:6}}/>
        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:110}}>
            <div style={{fontSize:10,color:"#444",marginBottom:3}}>Categoria</div>
            <select value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))} style={inp}>
              {META_CATS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{flex:1,minWidth:110}}>
            <div style={{fontSize:10,color:"#444",marginBottom:3}}>Tipo</div>
            <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp}>
              {["Diária","Semanal","Mensal","Trimestral","Anual"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{flex:1,minWidth:100}}>
            <div style={{fontSize:10,color:"#444",marginBottom:3}}>Meta (número)</div>
            <input type="number" value={form.target} onChange={e=>setForm(f=>({...f,target:Number(e.target.value)}))} style={inp}/>
          </div>
          <div style={{flex:1,minWidth:100}}>
            <div style={{fontSize:10,color:"#444",marginBottom:3}}>Prazo</div>
            <input type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))} style={inp}/>
          </div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <button onClick={add} style={primaryBtn}>+ Meta</button>
          </div>
        </div>
      </div>

      {/* pending */}
      {pending.length===0&&selCat==="Todas"&&<div style={{textAlign:"center",color:"#333",fontSize:13,padding:24}}>Nenhuma meta ainda — defina a mais importante agora</div>}
      {pending.map(m=><MetaCard key={m.id} m={m} onProgress={setProgress} onRemove={remove}/>)}

      {/* done */}
      {done.length>0&&(
        <div style={{marginTop:20}}>
          <div style={{fontSize:10,color:"#333",marginBottom:8,textTransform:"uppercase",letterSpacing:".08em",fontWeight:500}}>Concluídas ({done.length})</div>
          {done.map(m=><MetaCard key={m.id} m={m} onProgress={setProgress} onRemove={remove}/>)}
        </div>
      )}
    </div>
  );
}

function MetaCard({m,onProgress,onRemove}){
  const c=META_CAT_COLORS[m.cat]||"#8b5cf6";
  const pct=Math.round((m.current/Math.max(m.target,1))*100);
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(m.current);

  const tipoColors={"Diária":"#22c55e","Semanal":"#3b82f6","Mensal":"#8b5cf6","Trimestral":"#f97316","Anual":"#eab308"};
  const tc=tipoColors[m.tipo]||"#888";

  return(
    <div style={{background:"#111",border:`1px solid ${m.done?"#1a2a1a":"#1c1c1c"}`,borderLeft:`3px solid ${m.done?"#1a2a1a":c}`,borderRadius:10,padding:"12px 14px",marginBottom:8,opacity:m.done?.5:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:500,color:m.done?"#333":"#e8e8e8",textDecoration:m.done?"line-through":"none"}}>{m.title}</div>
          {m.desc&&<div style={{fontSize:11,color:"#444",marginTop:2}}>{m.desc}</div>}
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
          <span style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:c+"22",color:c,border:`1px solid ${c}33`}}>{m.cat}</span>
          <span style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:tc+"22",color:tc,border:`1px solid ${tc}33`}}>{m.tipo}</span>
          <button onClick={()=>onRemove(m.id)} style={{background:"none",border:"none",color:"#2a2a2a",cursor:"pointer",fontSize:14,padding:0}}>×</button>
        </div>
      </div>

      {/* progress bar */}
      <div style={{marginTop:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{fontSize:11,color:"#555"}}>{m.current} / {m.target}</div>
          <div style={{fontSize:13,fontWeight:500,fontFamily:"'DM Mono'",color:pct>=100?"#22c55e":pct>=60?c:"#f97316"}}>{pct}%</div>
        </div>
        <div style={{height:6,background:"#1c1c1c",borderRadius:99}}>
          <div style={{height:6,borderRadius:99,width:`${Math.min(pct,100)}%`,background:pct>=100?"#22c55e":c,transition:"width .5s ease"}}/>
        </div>
      </div>

      {/* update progress */}
      {!m.done&&(
        <div style={{marginTop:8,display:"flex",gap:6,alignItems:"center"}}>
          {editing?(
            <>
              <input type="number" value={val} onChange={e=>setVal(e.target.value)} style={{...inp,maxWidth:80,fontSize:12,padding:"4px 8px"}}/>
              <button onClick={()=>{onProgress(m.id,val);setEditing(false);}} style={{...primaryBtn,padding:"4px 10px",fontSize:11}}>Salvar</button>
              <button onClick={()=>setEditing(false)} style={{...ghostBtn,padding:"4px 10px",fontSize:11}}>Cancelar</button>
            </>
          ):(
            <button onClick={()=>{setVal(m.current);setEditing(true);}} style={{fontSize:11,background:"#1a1a1a",border:"1px solid #222",color:"#666",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:"inherit"}}>↑ Atualizar progresso</button>
          )}
        </div>
      )}

      {/* meta info */}
      <div style={{display:"flex",gap:10,marginTop:6}}>
        {m.prazo&&<div style={{fontSize:10,color:"#333"}}>Prazo: {fmtDateShort(m.prazo+"T12:00")}</div>}
        <div style={{fontSize:10,color:"#2a2a2a"}}>Criada: {fmtDateTime(m.createdAt)}</div>
        {m.doneAt&&<div style={{fontSize:10,color:"#22c55e44"}}>Concluída: {fmtDateTime(m.doneAt)}</div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// NOTAS TAB — com gravação de áudio
// ════════════════════════════════════════════════════════════════
function NotasTab({ notes, upRoot, tasks, upDay }) {
  const [text,setText]=useState("");
  const [converting,setConverting]=useState(null);
  const [recording,setRecording]=useState(false);
  const [transcribing,setTranscribing]=useState(false);
  const mediaRef=useRef(null);
  const chunksRef=useRef([]);

  const startRec=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mr=new MediaRecorder(stream);
      chunksRef.current=[];
      mr.ondataavailable=e=>chunksRef.current.push(e.data);
      mr.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        setRecording(false);
        setTranscribing(true);
        // transcribe via Whisper — fallback: prompt user to type
        try{
          const blob=new Blob(chunksRef.current,{type:"audio/webm"});
          const fd=new FormData();
          fd.append("file",blob,"audio.webm");
          fd.append("model","whisper-1");
          // Note: real transcription needs OpenAI Whisper API key
          // Fallback: ask Claude to note that audio was recorded and needs transcription
          const reply=await askAI([{role:"user",content:"O usuário gravou um áudio. Avise que a transcrição automática requer a API da OpenAI Whisper. Por enquanto, por favor escreva o conteúdo do áudio manualmente na caixa de texto."}]);
          setText(prev=>prev+"[Áudio gravado — transcrição: "+reply+"]");
        }catch{
          setText(prev=>prev+"[Áudio gravado às "+fmtTime(new Date())+"]");
        }
        setTranscribing(false);
      };
      mr.start();
      mediaRef.current=mr;
      setRecording(true);
    }catch{
      alert("Permissão de microfone negada ou não suportada.");
    }
  };

  const stopRec=()=>{ if(mediaRef.current&&recording) mediaRef.current.stop(); };

  const addNote=()=>{
    if(!text.trim())return;
    upRoot({notes:[{id:Date.now().toString(),text,createdAt:new Date().toISOString(),converted:false},...notes]});
    setText("");
  };

  const convert=async(note)=>{
    setConverting(note.id);
    try{
      const reply=await askAI([{role:"user",content:`Transforme essa anotação em tarefa clara para Wanderson Cruz. Retorne APENAS JSON: {"title":"...","note":"...","tag":"UPMIND|CentroMed|Marca|Corpo"}. Anotação: "${note.text}"`}]);
      const parsed=JSON.parse(reply.replace(/```json|```/g,"").trim());
      upDay({tasks:[...tasks,{...parsed,id:Date.now().toString(),done:false,reminderTime:"",reminded:false,createdAt:new Date().toISOString()}]});
      upRoot({notes:notes.map(n=>n.id===note.id?{...n,converted:true}:n)});
    }catch{
      upDay({tasks:[...tasks,{id:Date.now().toString(),title:note.text,note:"",tag:"UPMIND",done:false,reminderTime:"",reminded:false,createdAt:new Date().toISOString()}]});
      upRoot({notes:notes.map(n=>n.id===note.id?{...n,converted:true}:n)});
    }
    setConverting(null);
  };

  const remove=id=>upRoot({notes:notes.filter(n=>n.id!==id)});

  return(
    <div>
      <div style={{background:"#131313",border:"1px solid #1e1e1e",borderRadius:10,padding:14,marginBottom:16}}>
        {/* AUDIO ROW */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <button onClick={recording?stopRec:startRec} style={{
            display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,border:`1px solid ${recording?"#ef4444":"#2a2a2a"}`,
            background:recording?"#1a0a0a":"#1a1a1a",color:recording?"#ef4444":"#777",cursor:"pointer",fontSize:12,fontFamily:"inherit",transition:"all .2s"
          }}>
            <div style={{width:8,height:8,borderRadius:99,background:recording?"#ef4444":"#444",animation:recording?"pulse 1s infinite":"none"}}/>
            {recording?"● Parar gravação":"🎙 Gravar áudio"}
          </button>
          {transcribing&&<span style={{fontSize:11,color:"#555"}}>Processando áudio...</span>}
          <div style={{fontSize:11,color:"#333",marginLeft:"auto"}}>ou escreva abaixo</div>
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Ideia, insight, lembrete... A IA converte em tarefa automaticamente." style={{...inp,minHeight:72,resize:"vertical"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
          <div style={{fontSize:10,color:"#333"}}>{new Date().toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
          <button onClick={addNote} style={primaryBtn}>Salvar nota</button>
        </div>
      </div>

      {notes.length===0&&<div style={{textAlign:"center",color:"#333",fontSize:13,padding:24}}>Nenhuma anotação ainda</div>}
      {notes.map(n=>(
        <div key={n.id} style={{background:"#111",border:`1px solid ${n.converted?"#0f1f0f":"#1c1c1c"}`,borderRadius:9,padding:"11px 13px",marginBottom:6,opacity:n.converted?.5:1}}>
          <div style={{fontSize:13,color:n.converted?"#444":"#d8d8d8",lineHeight:1.55}}>{n.text}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:7}}>
            <div style={{fontSize:10,color:"#333"}}>{fmtDateTime(n.createdAt)}</div>
            <div style={{display:"flex",gap:6}}>
              {n.converted
                ?<span style={{fontSize:10,color:"#22c55e"}}>✓ Virou tarefa</span>
                :<button onClick={()=>convert(n)} disabled={converting===n.id} style={{fontSize:11,background:"#1a1a2a",color:"#8b5cf6",border:"1px solid #2a2a4a",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:"inherit"}}>
                  {converting===n.id?"Convertendo...":"→ Tarefa"}
                </button>
              }
              <button onClick={()=>remove(n.id)} style={{background:"none",border:"none",color:"#2a2a2a",cursor:"pointer",fontSize:14}}>×</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// GRÁFICOS TAB
// ════════════════════════════════════════════════════════════════
function GraficosTab({ checked, metas, tasks, history, today }) {
  // last 7 days history
  const days7=Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(6-i));
    return d.toISOString().split("T")[0];
  });

  const maxBlocks=ROUTINE.length;

  // Metas por categoria
  const catData=META_CATS.map(cat=>{
    const ms=metas.filter(m=>m.cat===cat);
    const done=ms.filter(m=>m.done).length;
    const avg=ms.length?Math.round(ms.reduce((s,m)=>s+(m.current/Math.max(m.target,1))*100,0)/ms.length):0;
    return{cat,total:ms.length,done,avg};
  }).filter(c=>c.total>0);

  // tasks this week
  const tasksByDay=days7.map(d=>{
    const dayTasks=(tasks||[]).filter(t=>t.createdAt?.startsWith(d));
    const doneTasks=dayTasks.filter(t=>t.done);
    return{d,total:dayTasks.length,done:doneTasks.length};
  });

  return(
    <div>
      {/* PROGRESSO SEMANAL DA ROTINA */}
      <Section title="Progresso da Rotina — 7 dias">
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:120,padding:"0 4px"}}>
          {days7.map((d,i)=>{
            const val=d===today?Object.values(checked).filter(Boolean).length:(history[d]||0);
            const pct=Math.round((val/maxBlocks)*100);
            const isToday=d===today;
            const label=new Date(d+"T12:00").toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","");
            return(
              <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{fontSize:10,color:"#555",fontFamily:"'DM Mono'",marginBottom:2}}>{pct>0?pct+"%":""}</div>
                <div style={{width:"100%",background:"#1a1a1a",borderRadius:4,height:80,display:"flex",alignItems:"flex-end",overflow:"hidden",border:isToday?"1px solid #8b5cf633":"1px solid transparent"}}>
                  <div style={{width:"100%",height:`${Math.max(pct,2)}%`,background:isToday?"#8b5cf6":pct>=80?"#22c55e":pct>=40?"#eab308":"#333",borderRadius:3,transition:"height .5s ease"}}/>
                </div>
                <div style={{fontSize:10,color:isToday?"#8b5cf6":"#444",textTransform:"capitalize"}}>{label}</div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* METAS POR CATEGORIA */}
      {catData.length>0&&(
        <Section title="Progresso das Metas por Categoria">
          {catData.map(c=>{
            const color=META_CAT_COLORS[c.cat]||"#8b5cf6";
            return(
              <div key={c.cat} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{width:8,height:8,borderRadius:2,background:color,display:"inline-block"}}/>
                    <span style={{fontSize:12,color:"#ccc"}}>{c.cat}</span>
                    <span style={{fontSize:10,color:"#444"}}>{c.done}/{c.total} concluídas</span>
                  </div>
                  <span style={{fontSize:12,fontFamily:"'DM Mono'",color:c.avg>=80?"#22c55e":color}}>{c.avg}%</span>
                </div>
                <div style={{height:8,background:"#1a1a1a",borderRadius:99}}>
                  <div style={{height:8,borderRadius:99,width:`${c.avg}%`,background:color,transition:"width .5s"}}/>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* TAREFAS — concluídas vs criadas */}
      <Section title="Tarefas — Criadas vs Concluídas (7 dias)">
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:100}}>
          {tasksByDay.map((d,i)=>{
            const label=new Date(d.d+"T12:00").toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","");
            const max=Math.max(...tasksByDay.map(x=>x.total),1);
            return(
              <div key={d.d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:72}}>
                  <div style={{flex:1,background:"#1e2a1e",borderRadius:"3px 3px 0 0",height:`${Math.max((d.total/max)*100,d.total>0?10:0)}%`,minHeight:d.total>0?4:0}}/>
                  <div style={{flex:1,background:"#22c55e",borderRadius:"3px 3px 0 0",height:`${Math.max((d.done/max)*100,d.done>0?10:0)}%`,minHeight:d.done>0?4:0}}/>
                </div>
                <div style={{fontSize:10,color:"#444",textTransform:"capitalize"}}>{label}</div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:14,marginTop:10}}>
          <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:8,height:8,borderRadius:2,background:"#1e3a1e"}}/><span style={{fontSize:10,color:"#444"}}>Criadas</span></div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:8,height:8,borderRadius:2,background:"#22c55e"}}/><span style={{fontSize:10,color:"#444"}}>Concluídas</span></div>
        </div>
      </Section>

      {/* DISTRIBUIÇÃO ROTINA POR BLOCO */}
      <Section title="Distribuição da Rotina por Área">
        {Object.keys(TC).map(tag=>{
          const total=ROUTINE.filter(r=>r.tag===tag).length;
          const done=ROUTINE.filter(r=>r.tag===tag&&!!checked[r.id]).length;
          const pct=Math.round((done/Math.max(total,1))*100);
          const c=TC[tag].dot;
          return(
            <div key={tag} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{width:6,height:6,borderRadius:1,background:c,display:"inline-block"}}/>
                  <span style={{fontSize:11,color:"#999"}}>{tag}</span>
                  <span style={{fontSize:10,color:"#444"}}>{done}/{total}</span>
                </div>
                <span style={{fontSize:11,fontFamily:"'DM Mono'",color:pct===100?"#22c55e":c}}>{pct}%</span>
              </div>
              <div style={{height:5,background:"#1a1a1a",borderRadius:99}}>
                <div style={{height:5,borderRadius:99,width:`${pct}%`,background:pct===100?"#22c55e":c,transition:"width .5s"}}/>
              </div>
            </div>
          );
        })}
      </Section>
    </div>
  );
}

function Section({title,children}){
  return(
    <div style={{background:"#111",border:"1px solid #1c1c1c",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:500,color:"#555",textTransform:"uppercase",letterSpacing:".08em",marginBottom:14}}>{title}</div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// IA TAB
// ════════════════════════════════════════════════════════════════
function IATab({ chat, upRoot, tasks, checked, progress, nextItem, metas }) {
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[chat]);

  const pending=tasks.filter(t=>!t.done);
  const pendingMetas=metas.filter(m=>!m.done);
  const doneBlocks=Object.values(checked).filter(Boolean).length;

  const send=async(text)=>{
    if(!text.trim()||loading)return;
    const userMsg={role:"user",content:text};
    const next=[...chat,userMsg];
    upRoot({chat:next});
    setInput("");
    setLoading(true);
    const ctx=`[CONTEXTO DO DIA ${new Date().toLocaleDateString("pt-BR")}: Rotina ${progress}% concluída (${doneBlocks}/${ROUTINE.length}). Próximo bloco: ${nextItem?`${nextItem.time} - ${nextItem.label}`:"rotina concluída"}. Tarefas pendentes: ${pending.length>0?pending.map(t=>t.title).join(", "):"nenhuma"}. Metas ativas: ${pendingMetas.length>0?pendingMetas.map(m=>`${m.title} (${Math.round(m.current/Math.max(m.target,1)*100)}%)`).join(", "):"nenhuma"}.]\n\n${text}`;
    try{
      const reply=await askAI([...chat,{role:"user",content:ctx}]);
      upRoot({chat:[...next,{role:"assistant",content:reply}]});
    }catch{
      upRoot({chat:[...next,{role:"assistant",content:"Erro de conexão. Tente novamente."}]});
    }
    setLoading(false);
  };

  const quick=["Como está meu dia?","O que ainda falta fazer?","Analisa minhas metas","Pauta CentroMed amanhã"];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 280px)",minHeight:420}}>
      <div style={{flex:1,overflowY:"auto",marginBottom:10}}>
        {chat.length===0&&(
          <div style={{textAlign:"center",padding:40}}>
            <div style={{fontSize:28,marginBottom:10}}>🧠</div>
            <div style={{fontSize:13,fontWeight:500,color:"#666",marginBottom:4}}>Assistente Pessoal WAND OS</div>
            <div style={{fontSize:11,color:"#333",marginBottom:20}}>Contexto operacional carregado. Pode perguntar.</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
              {quick.map(q=><button key={q} onClick={()=>send(q)} style={{background:"#181828",border:"1px solid #282838",color:"#8b5cf6",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>{q}</button>)}
            </div>
          </div>
        )}
        {chat.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:8}}>
            <div style={{maxWidth:"75%",background:m.role==="user"?"#181828":"#131313",border:`1px solid ${m.role==="user"?"#282848":"#1e1e1e"}`,borderRadius:10,padding:"9px 13px",fontSize:13,color:"#d8d8d8",lineHeight:1.6,whiteSpace:"pre-wrap"}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:"flex",justifyContent:"flex-start",marginBottom:8}}><div style={{background:"#131313",border:"1px solid #1e1e1e",borderRadius:10,padding:"9px 14px",fontSize:13,color:"#444"}}>pensando...</div></div>}
        <div ref={endRef}/>
      </div>
      <div style={{display:"flex",gap:6}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send(input)} placeholder="Pergunte, anote ou peça análise..." style={{...inp,flex:1}}/>
        <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{...primaryBtn,opacity:loading||!input.trim()?.5:1}}>
          {loading?"...":"Enviar"}
        </button>
      </div>
    </div>
  );
}

// ─── SHARED ─────────────────────────────────────────────────────
const inp = { width:"100%",background:"#0c0c0c",border:"1px solid #1e1e1e",borderRadius:7,padding:"8px 11px",color:"#e0e0e0",fontSize:13,fontFamily:"'DM Sans',system-ui,sans-serif",outline:"none",display:"block" };
const primaryBtn = { background:"#8b5cf6",color:"#fff",border:"none",borderRadius:7,padding:"8px 16px",cursor:"pointer",fontSize:12,fontWeight:500,fontFamily:"'DM Sans',system-ui,sans-serif" };
const ghostBtn   = { background:"none",color:"#555",border:"1px solid #1e1e1e",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',system-ui,sans-serif" };
