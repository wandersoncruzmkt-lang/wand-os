import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "wandos_v3";
const getToday = () => new Date().toISOString().split("T")[0];
const fmtTime = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d) => d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const fmtDateShort = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const fmtDT = (iso) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const t2m = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

function loadDB() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; } }
function saveDB(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

const ROUTINE = [
  { id:"r1",  time:"04:50", label:"Despertar",           desc:"Água 500ml · Sem celular · Roupa separada",              tag:"Corpo" },
  { id:"r2",  time:"05:00", label:"Academia",             desc:"90 min · Mente livre · Nota de voz se vier ideia",       tag:"Corpo" },
  { id:"r3",  time:"06:30", label:"Café + Leitura",       desc:"Banho · 1ª refeição · 10 min leitura estratégica",       tag:"Corpo" },
  { id:"r4",  time:"07:10", label:"Deslocamento",         desc:"Revisar pauta · Chegar 7h25",                            tag:"CentroMed" },
  { id:"r5",  time:"07:30", label:"Abertura CentroMed",   desc:"Meta Ads · CPL · WhatsApp · Breno",                      tag:"CentroMed" },
  { id:"r6",  time:"08:00", label:"Bloco Conteúdo",       desc:"Maria Eduarda · Aprovações · Gravações",                 tag:"CentroMed" },
  { id:"r7",  time:"09:30", label:"Reunião Médicos",      desc:"João Paulo · Mardônio · Larissa · CFM",                  tag:"CentroMed" },
  { id:"r8",  time:"10:30", label:"Tráfego Pago",         desc:"Frequência < 2,5x · CPL < R$4 → escalar",               tag:"CentroMed" },
  { id:"r9",  time:"12:00", label:"Pausa + Almoço",       desc:"Refeição natural · Sem tela · 20 min descanso",          tag:"Pausa" },
  { id:"r10", time:"13:00", label:"Bloco UPMIND",         desc:"Dra. Ivna · Portal Viagem · Festas Conceito",            tag:"UPMIND" },
  { id:"r11", time:"14:30", label:"Estratégia UPMIND",    desc:"Mentoria waitlist · Newton · Copa 2026",                 tag:"UPMIND" },
  { id:"r12", time:"15:30", label:"Conteúdo Pessoal",     desc:"1 conteúdo · Hook→Virada→Moral→CTA",                    tag:"Marca" },
  { id:"r13", time:"16:30", label:"Presença Digital",     desc:"DMs estratégicos · Story · Métricas",                    tag:"Marca" },
  { id:"r14", time:"17:00", label:"Review do Dia",        desc:"Executado vs planejado · 3 prioridades amanhã",          tag:"Fechamento" },
  { id:"r15", time:"17:30", label:"Família + Refeição",   desc:"Refeição natural · Família · Leitura leve",              tag:"Fechamento" },
  { id:"r16", time:"19:30", label:"Wind Down",            desc:"Última refeição · Sem tela · Dormir 21h30",              tag:"Fechamento" },
];

const TAG = {
  Corpo:      { color:"#22c55e", bg:"rgba(34,197,94,.12)" },
  CentroMed:  { color:"#3b82f6", bg:"rgba(59,130,246,.12)" },
  UPMIND:     { color:"#a78bfa", bg:"rgba(167,139,250,.12)" },
  Marca:      { color:"#f97316", bg:"rgba(249,115,22,.12)" },
  Pausa:      { color:"#6b7280", bg:"rgba(107,114,128,.12)" },
  Fechamento: { color:"#eab308", bg:"rgba(234,179,8,.12)" },
};

const META_CATS = ["UPMIND","CentroMed","Marca Pessoal","Saúde","Financeiro","Pessoal"];
const META_COLORS = { UPMIND:"#a78bfa", CentroMed:"#3b82f6", "Marca Pessoal":"#f97316", Saúde:"#22c55e", Financeiro:"#eab308", Pessoal:"#ec4899" };

function askNotif() { if("Notification" in window && Notification.permission==="default") Notification.requestPermission(); }
function notify(title, body) { if("Notification" in window && Notification.permission==="granted") new Notification(title,{body}); }

async function askAI(messages, sys) {
  const system = sys || `Você é o assistente pessoal de Wanderson Cruz — O Sábio Estrategista do Sertão. Founder UPMIND + Diretor Marketing CentroMed, Crateús-CE. Tom: direto, calmo, estratégico. Sem hype. Respostas curtas e práticas em português brasileiro. Máximo 3 parágrafos.`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system, messages })
  });
  const d = await res.json();
  return d.content?.[0]?.text || "Erro de conexão.";
}

// ── NAV ITEMS ──
const NAV = [
  { id:"rotina",   icon:"⬡", label:"Rotina" },
  { id:"tarefas",  icon:"✦", label:"Tarefas" },
  { id:"metas",    icon:"◎", label:"Metas" },
  { id:"notas",    icon:"◈", label:"Notas" },
  { id:"graficos", icon:"⋯", label:"Gráficos" },
  { id:"ia",       icon:"✧", label:"IA" },
];

export default function WandOS() {
  const today = getToday();
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState("rotina");
  const [db, setDb] = useState(() => loadDB());
  const [sideOpen, setSideOpen] = useState(true);

  const dayKey = `day_${today}`;
  const td = db[dayKey] || {};
  const checked  = td.checked  || {};
  const tasks    = td.tasks    || [];
  const notes    = db.notes    || [];
  const metas    = db.metas    || [];
  const chat     = db.chat     || [];
  const history  = db.history  || {};

  function upDay(p)  { const n={...db,[dayKey]:{...td,...p}}; setDb(n); saveDB(n); }
  function upRoot(p) { const n={...db,...p}; setDb(n); saveDB(n); }

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      const done = Object.values(db[`day_${today}`]?.checked||{}).filter(Boolean).length;
      saveDB({...db, history:{...(db.history||{}), [today]:done}});
    }, 60000);
    return () => clearInterval(t);
  }, [db]);

  useEffect(() => { askNotif(); }, []);

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
  const progress = Math.round((done/ROUTINE.length)*100);
  const nowMins  = now.getHours()*60+now.getMinutes();
  const current  = ROUTINE.slice().reverse().find(r=>t2m(r.time)<=nowMins);
  const nextItem = ROUTINE.find(r=>!checked[r.id]&&t2m(r.time)>nowMins);

  const S = styles;

  return (
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* SIDEBAR */}
      <aside style={{...S.sidebar, width: sideOpen?220:64, transition:"width .25s ease"}}>
        {/* Logo */}
        <div style={S.sideTop}>
          <div style={S.logo}>
            <div style={S.logoIcon}>W</div>
            {sideOpen && <div><div style={S.logoTitle}>WAND OS</div><div style={S.logoSub}>Gestão Pessoal</div></div>}
          </div>
          <button onClick={()=>setSideOpen(o=>!o)} style={S.collapseBtn}>{sideOpen?"‹":"›"}</button>
        </div>

        {/* Nav */}
        <nav style={{flex:1, padding:"8px 0"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{
              ...S.navItem,
              background: tab===n.id?"rgba(234,179,8,.1)":"transparent",
              borderLeft: tab===n.id?"3px solid #eab308":"3px solid transparent",
              color: tab===n.id?"#eab308":"#6b7280",
            }}>
              <span style={{fontSize:16, minWidth:20, textAlign:"center"}}>{n.icon}</span>
              {sideOpen && <span style={{fontSize:13, fontWeight:tab===n.id?600:400}}>{n.label}</span>}
            </button>
          ))}
        </nav>

        {/* User */}
        {sideOpen && (
          <div style={S.sideUser}>
            <div style={S.avatar}>WC</div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#e2e8f0"}}>Wanderson Cruz</div>
              <div style={{fontSize:10,color:"#4b5563"}}>Founder · Diretor</div>
            </div>
          </div>
        )}
      </aside>

      {/* MAIN */}
      <main style={S.main}>
        {/* TOPBAR */}
        <div style={S.topbar}>
          <div>
            <div style={S.pageTitle}>{NAV.find(n=>n.id===tab)?.label}</div>
            <div style={S.pageDate}>{fmtDate(now)}</div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:16}}>
            {/* Progress pill */}
            <div style={S.progressPill}>
              <div style={{fontSize:11, color:"#6b7280", marginBottom:4}}>Progresso — {done}/{ROUTINE.length}</div>
              <div style={{height:4, background:"#1f2937", borderRadius:99, width:140}}>
                <div style={{height:4, borderRadius:99, width:`${progress}%`, background: progress>=80?"#22c55e":progress>=40?"#eab308":"#a78bfa", transition:"width .5s"}}/>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={S.clock}>{fmtTime(now)}</div>
              {current && <div style={{fontSize:10, color:TAG[current.tag]?.color||"#6b7280"}}>{current.label}</div>}
            </div>
          </div>
        </div>

        {/* STATUS BAR */}
        {(current||nextItem) && (
          <div style={S.statusBar}>
            {current && (
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:6,height:6,borderRadius:99,background:TAG[current.tag]?.color,animation:"pulse 2s infinite"}}/>
                <span style={{fontSize:12,color:"#9ca3af"}}>Agora:</span>
                <span style={{fontSize:12,fontWeight:600,color:TAG[current.tag]?.color}}>{current.label}</span>
              </div>
            )}
            {nextItem && (
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:"#4b5563"}}>Próximo às {nextItem.time}:</span>
                <span style={{fontSize:12,color:"#6b7280"}}>{nextItem.label}</span>
              </div>
            )}
            <div style={{marginLeft:"auto",fontSize:12,fontWeight:700,color:progress>=80?"#22c55e":progress>=40?"#eab308":"#a78bfa",fontFamily:"'JetBrains Mono'"}}>{progress}%</div>
          </div>
        )}

        {/* CONTENT */}
        <div style={S.content}>
          {tab==="rotina"   && <RotinaTab   checked={checked} upDay={upDay}/>}
          {tab==="tarefas"  && <TarefasTab  tasks={tasks} upDay={upDay}/>}
          {tab==="metas"    && <MetasTab    metas={metas} upRoot={upRoot}/>}
          {tab==="notas"    && <NotasTab    notes={notes} upRoot={upRoot} tasks={tasks} upDay={upDay}/>}
          {tab==="graficos" && <GraficosTab checked={checked} metas={metas} tasks={tasks} history={history} today={today}/>}
          {tab==="ia"       && <IATab       chat={chat} upRoot={upRoot} tasks={tasks} checked={checked} progress={progress} nextItem={nextItem} metas={metas}/>}
        </div>
      </main>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#0d1117}
        ::-webkit-scrollbar-thumb{background:#1f2937;border-radius:2px}
        input,select,textarea{color:#e2e8f0 !important;background:#0d1117 !important}
        input::placeholder,textarea::placeholder{color:#374151 !important}
        button{font-family:'Inter',system-ui,sans-serif}
      `}</style>
    </div>
  );
}

// ── ROTINA ──────────────────────────────────────────────────────
function RotinaTab({ checked, upDay }) {
  const toggle = id => upDay({checked:{...checked,[id]:!checked[id]}});
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:13,color:"#6b7280"}}>{done} de {ROUTINE.length} blocos concluídos hoje</div>
        </div>
        <Btn ghost small onClick={()=>upDay({checked:{}})}>Resetar dia</Btn>
      </div>

      <div style={{display:"grid",gap:6}}>
        {ROUTINE.map(item=>{
          const ck = !!checked[item.id];
          const tc = TAG[item.tag]||TAG.Pausa;
          return(
            <div key={item.id} onClick={()=>toggle(item.id)} style={{
              display:"flex", gap:12, alignItems:"center", cursor:"pointer",
              background: ck?"#0d1117":"#111827",
              border: `1px solid ${ck?"#1f2937":"#1f2937"}`,
              borderLeft: `3px solid ${ck?"#1f2937":tc.color}`,
              borderRadius:10, padding:"10px 14px",
              opacity: ck?.45:1, transition:"all .2s",
            }}>
              <div style={{minWidth:44, textAlign:"right"}}>
                <span style={{fontSize:11,fontFamily:"'JetBrains Mono'",color:ck?"#374151":"#4b5563"}}>{item.time}</span>
              </div>
              <div style={{width:18,height:18,borderRadius:5,border:`1.5px solid ${ck?"#374151":tc.color}`,background:ck?tc.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                {ck&&<span style={{fontSize:9,color:"#000",fontWeight:700}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:ck?"#374151":"#e2e8f0",textDecoration:ck?"line-through":"none"}}>{item.label}</div>
                <div style={{fontSize:11,color:"#4b5563",marginTop:1}}>{item.desc}</div>
              </div>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:tc.bg,color:tc.color,fontWeight:500,flexShrink:0}}>{item.tag}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TAREFAS ─────────────────────────────────────────────────────
function TarefasTab({ tasks, upDay }) {
  const [form, setForm] = useState({title:"",note:"",reminderTime:"",tag:"UPMIND"});
  const add = () => {
    if(!form.title.trim()) return;
    upDay({tasks:[...tasks,{...form,id:Date.now().toString(),done:false,reminded:false,createdAt:new Date().toISOString()}]});
    setForm({title:"",note:"",reminderTime:"",tag:"UPMIND"});
  };
  const toggle = id => upDay({tasks:tasks.map(t=>t.id===id?{...t,done:!t.done,doneAt:!t.done?new Date().toISOString():undefined}:t)});
  const remove = id => upDay({tasks:tasks.filter(t=>t.id!==id)});
  const pending = tasks.filter(t=>!t.done);
  const done    = tasks.filter(t=>t.done);

  return(
    <div>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        <StatCard label="Total" value={tasks.length} sub="tarefas hoje"/>
        <StatCard label="Pendentes" value={pending.length} sub="a executar" color="#eab308"/>
        <StatCard label="Concluídas" value={done.length} sub={`${Math.round((done.length/Math.max(tasks.length,1))*100)}% do total`} color="#22c55e"/>
      </div>

      {/* Form */}
      <div style={cardStyle}>
        <div style={cardLabel}>Nova Tarefa</div>
        <Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Título da tarefa..."/>
        <Input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Observação..." style={{marginTop:8}}/>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <div style={{flex:1}}>
            <div style={fieldLabel}>Lembrete</div>
            <Input type="time" value={form.reminderTime} onChange={e=>setForm(f=>({...f,reminderTime:e.target.value}))}/>
          </div>
          <div style={{flex:1}}>
            <div style={fieldLabel}>Categoria</div>
            <Select value={form.tag} onChange={e=>setForm(f=>({...f,tag:e.target.value}))}>
              {Object.keys(TAG).map(k=><option key={k}>{k}</option>)}
            </Select>
          </div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <Btn onClick={add}>+ Adicionar</Btn>
          </div>
        </div>
      </div>

      {pending.length===0&&<Empty text="Nenhuma tarefa pendente — dia limpo ✓"/>}
      {pending.map(t=><TaskCard key={t.id} t={t} onToggle={toggle} onRemove={remove}/>)}

      {done.length>0&&(
        <div style={{marginTop:24}}>
          <div style={sectionLabel}>Concluídas ({done.length})</div>
          {done.map(t=><TaskCard key={t.id} t={t} onToggle={toggle} onRemove={remove}/>)}
        </div>
      )}
    </div>
  );
}

function TaskCard({t,onToggle,onRemove}) {
  const tc = TAG[t.tag]||TAG.Pausa;
  return(
    <div style={{...cardStyle, display:"flex", gap:12, alignItems:"flex-start", marginBottom:6, opacity:t.done?.4:1, padding:"10px 14px"}}>
      <div onClick={()=>onToggle(t.id)} style={{width:18,height:18,borderRadius:5,border:`1.5px solid ${t.done?tc.color:"#374151"}`,background:t.done?tc.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,marginTop:2}}>
        {t.done&&<span style={{fontSize:9,color:"#000",fontWeight:700}}>✓</span>}
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:500,color:t.done?"#374151":"#e2e8f0",textDecoration:t.done?"line-through":"none"}}>{t.title}</div>
        {t.note&&<div style={{fontSize:11,color:"#4b5563",marginTop:2}}>{t.note}</div>}
        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
          <Tag color={tc.color} bg={tc.bg}>{t.tag}</Tag>
          {t.reminderTime&&<Tag color="#6b7280" bg="rgba(107,114,128,.1)">⏰ {t.reminderTime}</Tag>}
          <span style={{fontSize:10,color:"#374151"}}>{fmtDT(t.createdAt)}</span>
        </div>
      </div>
      <button onClick={()=>onRemove(t.id)} style={{background:"none",border:"none",color:"#374151",cursor:"pointer",fontSize:18,lineHeight:1,padding:0}}>×</button>
    </div>
  );
}

// ── METAS ───────────────────────────────────────────────────────
function MetasTab({ metas, upRoot }) {
  const [form, setForm] = useState({title:"",desc:"",prazo:"",cat:"UPMIND",tipo:"Mensal",target:100,current:0});
  const [selCat, setSelCat] = useState("Todas");

  const add = () => {
    if(!form.title.trim()) return;
    upRoot({metas:[...metas,{...form,id:Date.now().toString(),done:false,createdAt:new Date().toISOString(),logs:[]}]});
    setForm({title:"",desc:"",prazo:"",cat:"UPMIND",tipo:"Mensal",target:100,current:0});
  };
  const setProgress = (id, val) => {
    upRoot({metas:metas.map(m=>{
      if(m.id!==id) return m;
      const cur = Math.min(Math.max(0,Number(val)),m.target);
      return {...m,current:cur,done:cur>=m.target,doneAt:cur>=m.target?new Date().toISOString():undefined,logs:[...(m.logs||[]),{at:new Date().toISOString(),val:cur}]};
    })});
  };
  const remove = id => upRoot({metas:metas.filter(m=>m.id!==id)});

  const cats = ["Todas",...META_CATS];
  const filtered = selCat==="Todas"?metas:metas.filter(m=>m.cat===selCat);
  const pending = filtered.filter(m=>!m.done);
  const done    = filtered.filter(m=>m.done);
  const avgProg = metas.length?Math.round(metas.reduce((s,m)=>s+(m.current/Math.max(m.target,1))*100,0)/metas.length):0;

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        <StatCard label="Total de metas" value={metas.length} sub="registradas"/>
        <StatCard label="Concluídas" value={metas.filter(m=>m.done).length} sub={`${Math.round((metas.filter(m=>m.done).length/Math.max(metas.length,1))*100)}% do total`} color="#22c55e"/>
        <StatCard label="Progresso médio" value={avgProg+"%"} sub="todas as metas" color="#eab308"/>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {cats.map(c=>{
          const active = selCat===c;
          const cc = META_COLORS[c]||"#eab308";
          return(
            <button key={c} onClick={()=>setSelCat(c)} style={{fontSize:11,padding:"5px 12px",borderRadius:20,background:active?cc+"22":"#111827",color:active?cc:"#4b5563",border:`1px solid ${active?cc+"55":"#1f2937"}`,cursor:"pointer",fontWeight:active?600:400,transition:"all .2s"}}>
              {c}
            </button>
          );
        })}
      </div>

      {/* Form */}
      <div style={cardStyle}>
        <div style={cardLabel}>Nova Meta</div>
        <Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Meta (ex: R$15k/mês faturamento UPMIND)..."/>
        <Input value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Como vai medir / desdobramento..." style={{marginTop:8}}/>
        <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:100}}>
            <div style={fieldLabel}>Categoria</div>
            <Select value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
              {META_CATS.map(c=><option key={c}>{c}</option>)}
            </Select>
          </div>
          <div style={{flex:1,minWidth:100}}>
            <div style={fieldLabel}>Tipo</div>
            <Select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
              {["Diária","Semanal","Mensal","Trimestral","Anual"].map(t=><option key={t}>{t}</option>)}
            </Select>
          </div>
          <div style={{flex:1,minWidth:80}}>
            <div style={fieldLabel}>Meta (nº)</div>
            <Input type="number" value={form.target} onChange={e=>setForm(f=>({...f,target:Number(e.target.value)}))}/>
          </div>
          <div style={{flex:1,minWidth:100}}>
            <div style={fieldLabel}>Prazo</div>
            <Input type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))}/>
          </div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <Btn onClick={add}>+ Meta</Btn>
          </div>
        </div>
      </div>

      {pending.length===0&&selCat==="Todas"&&<Empty text="Nenhuma meta ainda — defina a mais importante agora"/>}
      {pending.map(m=><MetaCard key={m.id} m={m} onProgress={setProgress} onRemove={remove}/>)}

      {done.length>0&&(
        <div style={{marginTop:24}}>
          <div style={sectionLabel}>Concluídas ({done.length})</div>
          {done.map(m=><MetaCard key={m.id} m={m} onProgress={setProgress} onRemove={remove}/>)}
        </div>
      )}
    </div>
  );
}

function MetaCard({m,onProgress,onRemove}) {
  const c = META_COLORS[m.cat]||"#a78bfa";
  const pct = Math.round((m.current/Math.max(m.target,1))*100);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(m.current);
  const tipoC = {Diária:"#22c55e",Semanal:"#3b82f6",Mensal:"#a78bfa",Trimestral:"#f97316",Anual:"#eab308"};
  const tc = tipoC[m.tipo]||"#6b7280";

  return(
    <div style={{...cardStyle, borderLeft:`3px solid ${m.done?"#1f2937":c}`, opacity:m.done?.5:1, marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:m.done?"#374151":"#e2e8f0",textDecoration:m.done?"line-through":"none"}}>{m.title}</div>
          {m.desc&&<div style={{fontSize:11,color:"#4b5563",marginTop:3}}>{m.desc}</div>}
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
          <Tag color={c} bg={c+"22"}>{m.cat}</Tag>
          <Tag color={tc} bg={tc+"22"}>{m.tipo}</Tag>
          <button onClick={()=>onRemove(m.id)} style={{background:"none",border:"none",color:"#374151",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={{fontSize:11,color:"#4b5563"}}>{m.current} / {m.target}</span>
          <span style={{fontSize:14,fontWeight:700,fontFamily:"'JetBrains Mono'",color:pct>=100?"#22c55e":pct>=60?c:"#f97316"}}>{pct}%</span>
        </div>
        <div style={{height:8,background:"#1f2937",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:8,borderRadius:99,width:`${Math.min(pct,100)}%`,background:pct>=100?"#22c55e":c,transition:"width .6s ease",boxShadow:pct>=100?"0 0 8px #22c55e55":undefined}}/>
        </div>
      </div>

      {!m.done&&(
        <div style={{marginTop:10,display:"flex",gap:6,alignItems:"center"}}>
          {editing?(
            <>
              <Input type="number" value={val} onChange={e=>setVal(e.target.value)} style={{maxWidth:80}}/>
              <Btn small onClick={()=>{onProgress(m.id,val);setEditing(false);}}>Salvar</Btn>
              <Btn ghost small onClick={()=>setEditing(false)}>Cancelar</Btn>
            </>
          ):(
            <button onClick={()=>{setVal(m.current);setEditing(true);}} style={{fontSize:11,background:"#1f2937",border:"1px solid #374151",color:"#6b7280",borderRadius:6,padding:"4px 12px",cursor:"pointer"}}>↑ Atualizar progresso</button>
          )}
        </div>
      )}

      <div style={{display:"flex",gap:12,marginTop:8}}>
        {m.prazo&&<span style={{fontSize:10,color:"#374151"}}>Prazo: {fmtDateShort(m.prazo+"T12:00")}</span>}
        <span style={{fontSize:10,color:"#374151"}}>Criada: {fmtDT(m.createdAt)}</span>
        {m.doneAt&&<span style={{fontSize:10,color:"#22c55e55"}}>✓ {fmtDT(m.doneAt)}</span>}
      </div>
    </div>
  );
}

// ── NOTAS ───────────────────────────────────────────────────────
function NotasTab({ notes, upRoot, tasks, upDay }) {
  const [text, setText] = useState("");
  const [converting, setConverting] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t=>t.stop());
        setRecording(false);
        setTranscribing(true);
        try {
          setText(prev => prev + `[Áudio gravado às ${fmtTime(new Date())} — transcreva o conteúdo abaixo]`);
        } catch { setText(prev=>prev+`[Áudio ${fmtTime(new Date())}]`); }
        setTranscribing(false);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { alert("Permissão de microfone negada."); }
  };

  const stopRec = () => { if(mediaRef.current && recording) mediaRef.current.stop(); };

  const addNote = () => {
    if(!text.trim()) return;
    upRoot({notes:[{id:Date.now().toString(),text,createdAt:new Date().toISOString(),converted:false},...notes]});
    setText("");
  };

  const convert = async (note) => {
    setConverting(note.id);
    try {
      const reply = await askAI([{role:"user",content:`Transforme em tarefa clara. Retorne APENAS JSON: {"title":"...","note":"...","tag":"UPMIND|CentroMed|Marca|Corpo"}. Anotação: "${note.text}"`}]);
      const parsed = JSON.parse(reply.replace(/```json|```/g,"").trim());
      upDay({tasks:[...tasks,{...parsed,id:Date.now().toString(),done:false,reminderTime:"",reminded:false,createdAt:new Date().toISOString()}]});
      upRoot({notes:notes.map(n=>n.id===note.id?{...n,converted:true}:n)});
    } catch {
      upDay({tasks:[...tasks,{id:Date.now().toString(),title:note.text,note:"",tag:"UPMIND",done:false,reminderTime:"",reminded:false,createdAt:new Date().toISOString()}]});
      upRoot({notes:notes.map(n=>n.id===note.id?{...n,converted:true}:n)});
    }
    setConverting(null);
  };

  const remove = id => upRoot({notes:notes.filter(n=>n.id!==id)});

  return(
    <div>
      <div style={cardStyle}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <button onClick={recording?stopRec:startRec} style={{
            display:"flex",alignItems:"center",gap:7,padding:"8px 16px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:500,
            border:`1px solid ${recording?"#ef444444":"#1f2937"}`,
            background:recording?"rgba(239,68,68,.1)":"#1f2937",
            color:recording?"#ef4444":"#6b7280",transition:"all .2s"
          }}>
            <div style={{width:7,height:7,borderRadius:99,background:recording?"#ef4444":"#374151",animation:recording?"pulse 1s infinite":"none"}}/>
            {recording?"● Parar":"🎙 Gravar áudio"}
          </button>
          {transcribing&&<span style={{fontSize:11,color:"#4b5563"}}>Processando...</span>}
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Escreva uma ideia, insight, lembrete... A IA converte em tarefa automaticamente." style={{...inputBase, minHeight:80, resize:"vertical", width:"100%"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
          <span style={{fontSize:10,color:"#374151"}}>{new Date().toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
          <Btn onClick={addNote}>Salvar nota</Btn>
        </div>
      </div>

      {notes.length===0&&<Empty text="Nenhuma anotação ainda"/>}
      {notes.map(n=>(
        <div key={n.id} style={{...cardStyle, opacity:n.converted?.5:1, marginBottom:6, borderLeft:`3px solid ${n.converted?"#1f2937":"#a78bfa"}`}}>
          <div style={{fontSize:13,color:n.converted?"#374151":"#d1d5db",lineHeight:1.6}}>{n.text}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
            <span style={{fontSize:10,color:"#374151"}}>{fmtDT(n.createdAt)}</span>
            <div style={{display:"flex",gap:6}}>
              {n.converted
                ?<span style={{fontSize:11,color:"#22c55e"}}>✓ Virou tarefa</span>
                :<button onClick={()=>convert(n)} disabled={converting===n.id} style={{fontSize:11,background:"rgba(167,139,250,.1)",color:"#a78bfa",border:"1px solid rgba(167,139,250,.3)",borderRadius:6,padding:"4px 12px",cursor:"pointer"}}>
                  {converting===n.id?"Convertendo...":"→ Converter em tarefa"}
                </button>
              }
              <button onClick={()=>remove(n.id)} style={{background:"none",border:"none",color:"#374151",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── GRÁFICOS ────────────────────────────────────────────────────
function GraficosTab({ checked, metas, tasks, history, today }) {
  const days7 = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().split("T")[0]; });
  const max = ROUTINE.length;

  const catData = META_CATS.map(cat=>{
    const ms = metas.filter(m=>m.cat===cat);
    const avg = ms.length?Math.round(ms.reduce((s,m)=>s+(m.current/Math.max(m.target,1))*100,0)/ms.length):0;
    return {cat, total:ms.length, done:ms.filter(m=>m.done).length, avg};
  }).filter(c=>c.total>0);

  return(
    <div style={{display:"grid",gap:12}}>
      {/* Rotina semanal */}
      <div style={cardStyle}>
        <div style={cardLabel}>Rotina — Progresso 7 dias</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:120,padding:"4px 0"}}>
          {days7.map((d,i)=>{
            const val = d===today?Object.values(checked).filter(Boolean).length:(history[d]||0);
            const pct = Math.round((val/max)*100);
            const isToday = d===today;
            const label = new Date(d+"T12:00").toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","");
            return(
              <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{fontSize:10,color:isToday?"#eab308":"#374151",fontFamily:"'JetBrains Mono'"}}>{pct>0?pct+"%":""}</div>
                <div style={{width:"100%",height:80,background:"#1f2937",borderRadius:6,display:"flex",alignItems:"flex-end",overflow:"hidden",border:isToday?"1px solid rgba(234,179,8,.3)":"1px solid transparent"}}>
                  <div style={{width:"100%",height:`${Math.max(pct,2)}%`,background:isToday?"#eab308":pct>=80?"#22c55e":pct>=40?"#a78bfa":"#374151",transition:"height .5s ease",borderRadius:4}}/>
                </div>
                <div style={{fontSize:10,color:isToday?"#eab308":"#4b5563",textTransform:"capitalize"}}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metas por categoria */}
      {catData.length>0&&(
        <div style={cardStyle}>
          <div style={cardLabel}>Metas por Categoria</div>
          {catData.map(c=>{
            const color = META_COLORS[c.cat]||"#a78bfa";
            return(
              <div key={c.cat} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{width:8,height:8,borderRadius:2,background:color}}/>
                    <span style={{fontSize:12,color:"#9ca3af",fontWeight:500}}>{c.cat}</span>
                    <span style={{fontSize:10,color:"#374151"}}>{c.done}/{c.total} concluídas</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,fontFamily:"'JetBrains Mono'",color:c.avg>=80?"#22c55e":color}}>{c.avg}%</span>
                </div>
                <div style={{height:8,background:"#1f2937",borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:8,borderRadius:99,width:`${c.avg}%`,background:color,transition:"width .6s",boxShadow:`0 0 6px ${color}55`}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rotina por área */}
      <div style={cardStyle}>
        <div style={cardLabel}>Distribuição por Área — Hoje</div>
        {Object.keys(TAG).map(tag=>{
          const total = ROUTINE.filter(r=>r.tag===tag).length;
          const done  = ROUTINE.filter(r=>r.tag===tag&&!!checked[r.id]).length;
          const pct   = Math.round((done/Math.max(total,1))*100);
          const c     = TAG[tag].color;
          return(
            <div key={tag} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <div style={{width:6,height:6,borderRadius:1,background:c}}/>
                  <span style={{fontSize:11,color:"#9ca3af"}}>{tag}</span>
                  <span style={{fontSize:10,color:"#374151"}}>{done}/{total}</span>
                </div>
                <span style={{fontSize:11,fontFamily:"'JetBrains Mono'",fontWeight:600,color:pct===100?"#22c55e":c}}>{pct}%</span>
              </div>
              <div style={{height:6,background:"#1f2937",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:6,borderRadius:99,width:`${pct}%`,background:pct===100?"#22c55e":c,transition:"width .5s"}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── IA ──────────────────────────────────────────────────────────
function IATab({ chat, upRoot, tasks, checked, progress, nextItem, metas }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[chat]);

  const pending = tasks.filter(t=>!t.done);
  const doneBlocks = Object.values(checked).filter(Boolean).length;

  const send = async (text) => {
    if(!text.trim()||loading) return;
    const userMsg = {role:"user",content:text};
    const next = [...chat,userMsg];
    upRoot({chat:next});
    setInput("");
    setLoading(true);
    const ctx = `[CONTEXTO ${new Date().toLocaleDateString("pt-BR")}: Rotina ${progress}% (${doneBlocks}/${ROUTINE.length}). Próximo: ${nextItem?`${nextItem.time} - ${nextItem.label}`:"concluída"}. Tarefas pendentes: ${pending.length>0?pending.map(t=>t.title).join(", "):"nenhuma"}. Metas ativas: ${metas.filter(m=>!m.done).length}.]\n\n${text}`;
    try {
      const reply = await askAI([...chat,{role:"user",content:ctx}]);
      upRoot({chat:[...next,{role:"assistant",content:reply}]});
    } catch {
      upRoot({chat:[...next,{role:"assistant",content:"Erro de conexão. Tente novamente."}]});
    }
    setLoading(false);
  };

  const quick = ["Como está meu dia?","O que ainda falta?","Analisa minhas metas","Pauta CentroMed"];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 260px)",minHeight:400}}>
      <div style={{flex:1,overflowY:"auto",marginBottom:12,padding:"4px 0"}}>
        {chat.length===0&&(
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:36,marginBottom:12}}>✧</div>
            <div style={{fontSize:14,fontWeight:600,color:"#6b7280",marginBottom:4}}>Assistente Pessoal WAND OS</div>
            <div style={{fontSize:12,color:"#374151",marginBottom:24}}>Contexto operacional carregado. Pode perguntar.</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
              {quick.map(q=>(
                <button key={q} onClick={()=>send(q)} style={{background:"#111827",border:"1px solid #1f2937",color:"#6b7280",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,transition:"all .2s"}}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:8}}>
            <div style={{maxWidth:"75%",background:m.role==="user"?"rgba(234,179,8,.08)":"#111827",border:`1px solid ${m.role==="user"?"rgba(234,179,8,.2)":"#1f2937"}`,borderRadius:12,padding:"10px 14px",fontSize:13,color:"#d1d5db",lineHeight:1.65,whiteSpace:"pre-wrap"}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",gap:6,padding:"10px 14px"}}>
            {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:99,background:"#374151",animation:`pulse 1.4s ${i*.2}s infinite`}}/>)}
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send(input)} placeholder="Pergunte, anote ou peça análise..." style={{...inputBase,flex:1}}/>
        <Btn onClick={()=>send(input)} disabled={loading||!input.trim()}>Enviar</Btn>
      </div>
    </div>
  );
}

// ── SHARED COMPONENTS ────────────────────────────────────────────
function StatCard({label,value,sub,color}) {
  return(
    <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:10,padding:"14px 16px"}}>
      <div style={{fontSize:10,color:"#4b5563",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,fontFamily:"'JetBrains Mono'",color:color||"#e2e8f0"}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#374151",marginTop:3}}>{sub}</div>}
    </div>
  );
}

function Tag({children,color,bg}) {
  return <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:bg,color,fontWeight:500,border:`1px solid ${color}33`}}>{children}</span>;
}

function Btn({children,onClick,disabled,ghost,small}) {
  return(
    <button onClick={onClick} disabled={disabled} style={{
      background: ghost?"transparent":"#eab308",
      color: ghost?"#4b5563":"#000",
      border: ghost?"1px solid #1f2937":"1px solid transparent",
      borderRadius:8, padding:small?"5px 12px":"8px 18px",
      cursor:disabled?"not-allowed":"pointer", fontSize:small?11:12, fontWeight:600,
      opacity:disabled?.5:1, transition:"all .2s",
      fontFamily:"'Inter',system-ui,sans-serif"
    }}>{children}</button>
  );
}

function Input({style,...props}) {
  return <input style={{...inputBase,...style}} {...props}/>;
}

function Select({style,children,...props}) {
  return <select style={{...inputBase,...style}} {...props}>{children}</select>;
}

function Empty({text}) {
  return <div style={{textAlign:"center",color:"#374151",fontSize:13,padding:32}}>{text}</div>;
}

// ── STYLES ───────────────────────────────────────────────────────
const inputBase = {
  width:"100%", background:"#0d1117", border:"1px solid #1f2937", borderRadius:8,
  padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", display:"block",
  fontFamily:"'Inter',system-ui,sans-serif",
};
const cardStyle = {
  background:"#111827", border:"1px solid #1f2937", borderRadius:12, padding:"16px",
  marginBottom:0,
};
const cardLabel = {
  fontSize:10, color:"#4b5563", textTransform:"uppercase", letterSpacing:".1em", fontWeight:600, marginBottom:14
};
const fieldLabel = { fontSize:10, color:"#4b5563", marginBottom:4 };
const sectionLabel = { fontSize:10, color:"#374151", marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:".08em" };

const styles = {
  root: { display:"flex", height:"100vh", background:"#0d1117", color:"#e2e8f0", fontFamily:"'Inter',system-ui,sans-serif", overflow:"hidden" },
  sidebar: { background:"#111827", borderRight:"1px solid #1f2937", display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden" },
  sideTop: { padding:"16px 12px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #1f2937" },
  logo: { display:"flex", alignItems:"center", gap:10 },
  logoIcon: { width:30, height:30, borderRadius:7, background:"linear-gradient(135deg,#eab308,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:"#000", flexShrink:0 },
  logoTitle: { fontSize:12, fontWeight:700, letterSpacing:".1em", color:"#e2e8f0" },
  logoSub: { fontSize:9, color:"#374151", marginTop:-1 },
  collapseBtn: { background:"none", border:"1px solid #1f2937", color:"#374151", borderRadius:5, width:22, height:22, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  navItem: { display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 16px", background:"none", cursor:"pointer", transition:"all .2s", textAlign:"left", borderRight:"none" },
  sideUser: { padding:"12px 16px", borderTop:"1px solid #1f2937", display:"flex", alignItems:"center", gap:10 },
  avatar: { width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#eab308,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#000", flexShrink:0 },
  main: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  topbar: { background:"#111827", borderBottom:"1px solid #1f2937", padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  pageTitle: { fontSize:18, fontWeight:700, color:"#e2e8f0" },
  pageDate: { fontSize:11, color:"#374151", textTransform:"capitalize", marginTop:1 },
  progressPill: { background:"#0d1117", border:"1px solid #1f2937", borderRadius:8, padding:"8px 12px" },
  clock: { fontSize:20, fontWeight:300, fontFamily:"'JetBrains Mono'", color:"#e2e8f0" },
  statusBar: { background:"#0d1117", borderBottom:"1px solid #1f2937", padding:"8px 24px", display:"flex", gap:20, alignItems:"center" },
  content: { flex:1, overflowY:"auto", padding:"20px 24px" },
};
