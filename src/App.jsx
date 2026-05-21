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
const fmtTime  = (d) => d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const fmtDate  = (d) => d.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
const fmtDT    = (iso) => new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const fmtShort = (iso) => new Date(iso+"T12:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"});
const t2m = (s) => { const [h,m]=s.split(":").map(Number); return h*60+m; };

// ── PALETTE (from reference) ─────────────────────────────────────
const P = {
  bg:      "#F4F5FB",
  card:    "#FFFFFF",
  accent:  "#6C63FF",
  accent2: "#FF6584",
  accent3: "#43C6AC",
  text:    "#1A1D2E",
  sub:     "#8F92A1",
  border:  "#EBEBF0",
  yellow:  "#FFB830",
  green:   "#4CAF82",
  red:     "#FF6B6B",
  blue:    "#4DA6FF",
};

const ROUTINE = [
  {id:"r1", time:"04:50",label:"Despertar",          icon:"🌅",desc:"Água 500ml · Sem celular · Roupa separada",  cat:"Manhã"},
  {id:"r2", time:"05:00",label:"Academia",            icon:"💪",desc:"90 min treino · Mente livre",               cat:"Manhã"},
  {id:"r3", time:"06:30",label:"Café + Leitura",      icon:"📖",desc:"Banho · 1ª refeição · 10 min leitura",     cat:"Manhã"},
  {id:"r4", time:"07:10",label:"Deslocamento",        icon:"🚗",desc:"Revisar pauta · Chegar 7h25",              cat:"Trabalho"},
  {id:"r5", time:"07:30",label:"Abertura CentroMed",  icon:"🏥",desc:"Meta Ads · CPL · WhatsApp · Breno",       cat:"Trabalho"},
  {id:"r6", time:"08:00",label:"Bloco Conteúdo",      icon:"🎬",desc:"Maria Eduarda · Aprovações · Gravações",   cat:"Trabalho"},
  {id:"r7", time:"09:30",label:"Reunião Médicos",     icon:"⚕️",desc:"João Paulo · Mardônio · Larissa · CFM",   cat:"Trabalho"},
  {id:"r8", time:"10:30",label:"Tráfego Pago",        icon:"📊",desc:"Frequência < 2,5x · CPL < R$4",           cat:"Trabalho"},
  {id:"r9", time:"12:00",label:"Almoço",              icon:"🍽️",desc:"Refeição natural · Sem tela",             cat:"Nutrição"},
  {id:"r10",time:"13:00",label:"Bloco UPMIND",        icon:"⚡",desc:"Clientes · Entregas · Pipeline",           cat:"UPMIND"},
  {id:"r11",time:"14:30",label:"Estratégia UPMIND",   icon:"🧠",desc:"Mentoria · Newton · Copa 2026",            cat:"UPMIND"},
  {id:"r12",time:"15:30",label:"Conteúdo Pessoal",    icon:"📱",desc:"1 conteúdo · Hook → CTA",                  cat:"Marca"},
  {id:"r13",time:"16:30",label:"Presença Digital",    icon:"✨",desc:"DMs estratégicos · Story · Métricas",      cat:"Marca"},
  {id:"r14",time:"17:00",label:"Review do Dia",       icon:"✅",desc:"Executado vs planejado · 3 prioridades",   cat:"Encerramento"},
  {id:"r15",time:"17:30",label:"Jantar + Família",    icon:"🏠",desc:"Refeição natural · Família",               cat:"Nutrição"},
  {id:"r16",time:"19:30",label:"Wind Down",           icon:"🌙",desc:"Última refeição · Dormir 21h30",           cat:"Encerramento"},
];

const CAT_COLOR = {
  "Manhã":       {bg:"#FFF3E0",text:"#FF8C42"},
  "Trabalho":    {bg:"#E8F4FD",text:"#4DA6FF"},
  "Nutrição":    {bg:"#E8F8F1",text:"#4CAF82"},
  "UPMIND":      {bg:"#EDE9FF",text:"#6C63FF"},
  "Marca":       {bg:"#FFE9F0",text:"#FF6584"},
  "Encerramento":{bg:"#FFF9E6",text:"#FFB830"},
};

const META_CATS   = ["UPMIND","CentroMed","Marca Pessoal","Saúde","Financeiro","Leitura","Pessoal"];
const META_COLORS = {
  UPMIND:"#6C63FF",CentroMed:"#4DA6FF","Marca Pessoal":"#FF6584",
  Saúde:"#4CAF82",Financeiro:"#FFB830",Leitura:"#FF8C42",Pessoal:"#8F92A1"
};
const META_ICONS = {UPMIND:"⚡",CentroMed:"🏥","Marca Pessoal":"✨",Saúde:"💪",Financeiro:"💰",Leitura:"📖",Pessoal:"🌱"};
const TAG_COLORS  = {UPMIND:"#6C63FF",CentroMed:"#4DA6FF",Marca:"#FF6584",Corpo:"#4CAF82",Pausa:"#8F92A1",Encerramento:"#FFB830"};

function askNotif(){if("Notification" in window&&Notification.permission==="default")Notification.requestPermission();}
function notify(t,b){if("Notification" in window&&Notification.permission==="granted")new Notification(t,{body:b});}

async function askAI(messages,sys){
  const system=sys||"Você é J.A.R.V.I.S, assistente pessoal de Wanderson Cruz. Founder UPMIND + Diretor Marketing CentroMed, Crateús-CE. Direto, inteligente. Português brasileiro.";
  try{
    const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system,messages})});
    if(res.ok){const d=await res.json();return d.text||"Sem resposta.";}
  }catch{}
  return "J.A.R.V.I.S offline.";
}

const NAV=[
  {id:"home",    label:"Início",
    svg:<svg viewBox="0 0 24 24" fill="currentColor" style={{width:20,height:20}}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>},
  {id:"rotina",  label:"Rotina",
    svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>},
  {id:"tarefas", label:"Tarefas",
    svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:20,height:20}}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>},
  {id:"metas",   label:"Metas",
    svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>},
  {id:"jarvis",  label:"IA",
    svg:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:20,height:20}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>},
];

export default function App(){
  const today=getToday();
  const [now,setNow]=useState(new Date());
  const [tab,setTab]=useState("home");
  const [toast,setToast]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tarefas,setTarefas]=useState([]);
  const [metas,setMetas]=useState([]);
  const [submetas,setSubmetas]=useState([]);
  const [notas,setNotas]=useState([]);
  const [checked,setChecked]=useState({});
  const [chat,setChat]=useState([]);

  const loadAll=useCallback(async()=>{
    setLoading(true);
    const [t,m,sm,n,rc,ch]=await Promise.all([
      sb("tarefas","GET",null,`?date=eq.${today}&order=created_at.desc`),
      sb("metas","GET",null,`?order=created_at.desc`),
      sb("submetas","GET",null,`?order=ordem.asc,created_at.asc`),
      sb("notas","GET",null,`?order=created_at.desc&limit=50`),
      sb("rotina_check","GET",null,`?date=eq.${today}`),
      sb("chat_history","GET",null,`?order=created_at.asc&limit=60`),
    ]);
    if(t)setTarefas(t);
    if(m)setMetas(m);
    if(sm)setSubmetas(sm);
    if(n)setNotas(n);
    if(rc){const map={};rc.forEach(r=>{map[r.item_id]=r.checked;});setChecked(map);}
    if(ch)setChat(ch.map(x=>({role:x.role,content:x.content})));
    setLoading(false);
  },[today]);

  useEffect(()=>{loadAll();askNotif();},[]);
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(t);},[]);

  function toast2(msg,err=false){setToast({msg,err});setTimeout(()=>setToast(null),2500);}

  async function toggleCheck(id){
    const val=!checked[id];setChecked(p=>({...p,[id]:val}));
    const rid=`${today}_${id}`;
    if(val)await sb("rotina_check","POST",{id:rid,date:today,item_id:id,checked:true});
    else await sb(`rotina_check?id=eq.${rid}`,"DELETE");
  }

  async function addTarefa(data){
    const n={id:Date.now().toString(),date:today,done:false,reminded:false,...data,created_at:new Date().toISOString()};
    const r=await sb("tarefas","POST",n);
    if(r){setTarefas(p=>[r[0]||n,...p]);toast2("Tarefa criada ✓");}
  }
  async function toggleTarefa(id){
    const t=tarefas.find(x=>x.id===id);
    const u={done:!t.done,done_at:!t.done?new Date().toISOString():null};
    await sb(`tarefas?id=eq.${id}`,"PATCH",u);
    setTarefas(p=>p.map(x=>x.id===id?{...x,...u}:x));
  }
  async function removeTarefa(id){await sb(`tarefas?id=eq.${id}`,"DELETE");setTarefas(p=>p.filter(x=>x.id!==id));}

  async function addMeta(data){
    const n={id:Date.now().toString(),done:false,current_val:0,logs:[],...data,created_at:new Date().toISOString()};
    const r=await sb("metas","POST",n);
    if(r){setMetas(p=>[r[0]||n,...p]);toast2("Meta criada ✓");}
  }
  async function updateMetaProgress(id,val){
    const m=metas.find(x=>x.id===id);
    const cur=Math.min(Math.max(0,Number(val)),Number(m.target));
    const done=cur>=Number(m.target);
    const logs=[...(m.logs||[]),{at:new Date().toISOString(),val:cur}];
    const u={current_val:cur,done,done_at:done?new Date().toISOString():null,logs};
    await sb(`metas?id=eq.${id}`,"PATCH",u);
    setMetas(p=>p.map(x=>x.id===id?{...x,...u}:x));
    if(done)toast2("Meta concluída! 🎯");
  }
  async function removeMeta(id){await sb(`metas?id=eq.${id}`,"DELETE");setMetas(p=>p.filter(x=>x.id!==id));}

  async function addSubmeta(metaId,data){
    const n={id:Date.now().toString(),meta_id:metaId,done:false,current_val:0,ordem:0,...data,created_at:new Date().toISOString()};
    const r=await sb("submetas","POST",n);
    if(r){setSubmetas(p=>[...p,r[0]||n]);toast2("Submeta criada ✓");}
  }
  async function updateSubmeta(id,val){
    const s=submetas.find(x=>x.id===id);
    const cur=Math.min(Math.max(0,Number(val)),Number(s.target));
    const done=cur>=Number(s.target);
    const u={current_val:cur,done,done_at:done?new Date().toISOString():null};
    await sb(`submetas?id=eq.${id}`,"PATCH",u);
    setSubmetas(p=>p.map(x=>x.id===id?{...x,...u}:x));
  }
  async function toggleSubmeta(id){
    const s=submetas.find(x=>x.id===id);
    const u={done:!s.done,done_at:!s.done?new Date().toISOString():null,current_val:!s.done?s.target:0};
    await sb(`submetas?id=eq.${id}`,"PATCH",u);
    setSubmetas(p=>p.map(x=>x.id===id?{...x,...u}:x));
  }
  async function removeSubmeta(id){await sb(`submetas?id=eq.${id}`,"DELETE");setSubmetas(p=>p.filter(x=>x.id!==id));}

  async function addNota(text){
    const n={id:Date.now().toString(),texto:text,converted:false,created_at:new Date().toISOString()};
    const r=await sb("notas","POST",n);
    if(r){setNotas(p=>[r[0]||n,...p]);toast2("Nota salva ✓");}
  }
  async function convertNota(nota){
    try{
      const reply=await askAI([{role:"user",content:`Analise e retorne APENAS JSON: {"tipo":"tarefa|meta","title":"...","note":"...","tag":"UPMIND","cat":"UPMIND","target":100,"objetivo":"..."}\nAnotação: "${nota.texto}"`}]);
      const d=JSON.parse(reply.replace(/```json|```/g,"").trim());
      if(d.tipo==="meta")await addMeta({title:d.title,descricao:d.note||"",cat:d.cat||"UPMIND",tipo:"Mensal",target:d.target||100,objetivo:d.objetivo||""});
      else await addTarefa({title:d.title,note:d.note||"",tag:d.tag||"UPMIND",reminder_time:""});
      await sb(`notas?id=eq.${nota.id}`,"PATCH",{converted:true});
      setNotas(p=>p.map(n=>n.id===nota.id?{...n,converted:true}:n));
      toast2("Convertido ✓");
    }catch{toast2("Erro ao converter",true);}
  }
  async function removeNota(id){await sb(`notas?id=eq.${id}`,"DELETE");setNotas(p=>p.filter(n=>n.id!==id));}

  const done=Object.values(checked).filter(Boolean).length;
  const progress=Math.round((done/ROUTINE.length)*100);
  const nowMins=now.getHours()*60+now.getMinutes();
  const current=ROUTINE.slice().reverse().find(r=>t2m(r.time)<=nowMins);
  const nextItem=ROUTINE.find(r=>!checked[r.id]&&t2m(r.time)>nowMins);

  const shared={today,now,tarefas,metas,submetas,notas,checked,chat,setChat,
    addTarefa,toggleTarefa,removeTarefa,addMeta,updateMetaProgress,removeMeta,
    addSubmeta,updateSubmeta,toggleSubmeta,removeSubmeta,addNota,convertNota,removeNota,
    toggleCheck,toast2,progress,done,current,nextItem,loading};

  return(
    <div style={{maxWidth:430,margin:"0 auto",height:"100dvh",background:P.bg,color:P.text,fontFamily:"-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",display:"flex",flexDirection:"column",position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",overflow:"hidden"}}>

      {/* HEADER */}
      <div style={{background:"#fff",padding:"env(safe-area-inset-top,10px) 20px 12px",boxShadow:"0 1px 0 rgba(0,0,0,.06)",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:P.sub,marginBottom:1,textTransform:"capitalize"}}>{fmtDate(now)}</div>
            <div style={{fontSize:18,fontWeight:700,color:P.text}}>
              {current?`${current.icon} ${current.label}`:`Olá, Wanderson 👋`}
            </div>
          </div>
          {/* Progress circle */}
          <div style={{position:"relative",width:52,height:52}}>
            <svg width="52" height="52" style={{transform:"rotate(-90deg)"}}>
              <circle cx="26" cy="26" r="22" fill="none" stroke="#F0F0F5" strokeWidth="4"/>
              <circle cx="26" cy="26" r="22" fill="none"
                stroke={progress>=80?P.green:progress>=40?P.accent:P.blue}
                strokeWidth="4" strokeLinecap="round"
                strokeDasharray={2*Math.PI*22}
                strokeDashoffset={2*Math.PI*22-(progress/100)*2*Math.PI*22}
                style={{transition:"stroke-dashoffset .5s ease"}}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:12,fontWeight:700,color:P.text}}>{progress}%</span>
            </div>
          </div>
        </div>
        {nextItem&&(
          <div style={{display:"flex",alignItems:"center",gap:7,marginTop:10,padding:"7px 10px",background:P.bg,borderRadius:10}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:CAT_COLOR[nextItem.cat]?.text||P.accent,flexShrink:0}}/>
            <span style={{fontSize:11,color:P.sub}}>Próximo {nextItem.time}</span>
            <span style={{fontSize:12,fontWeight:600,color:P.text,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nextItem.label}</span>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{flex:1,overflowY:"scroll",overflowX:"hidden",WebkitOverflowScrolling:"touch",paddingBottom:"calc(72px + env(safe-area-inset-bottom,0px))",minHeight:0}}>
        {loading&&<Loader/>}
        {!loading&&tab==="home"    &&<HomeTab    {...shared} setTab={setTab}/>}
        {!loading&&tab==="rotina"  &&<RotinaTab  {...shared}/>}
        {!loading&&tab==="tarefas" &&<TarefasTab {...shared}/>}
        {!loading&&tab==="metas"   &&<MetasTab   {...shared}/>}
        {!loading&&tab==="jarvis"  &&<JarvisTab  {...shared}/>}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#fff",borderTop:`1px solid ${P.border}`,padding:"6px 0 max(8px,env(safe-area-inset-bottom))",display:"flex",zIndex:100,boxShadow:"0 -4px 16px rgba(0,0,0,.06)"}}>
        {NAV.map(n=>{
          const a=tab===n.id;
          return(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"4px 0",transition:"color .2s",color:a?P.accent:P.sub}}>
              <div style={{width:36,height:36,borderRadius:10,background:a?`${P.accent}14`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>
                {n.svg}
              </div>
              <span style={{fontSize:9,fontWeight:a?600:400}}>{n.label}</span>
            </button>
          );
        })}
      </div>

      {toast&&(
        <div style={{position:"fixed",top:60,left:"50%",transform:"translateX(-50%)",background:toast.err?"#FFF1F1":"#F0FFF8",border:`1px solid ${toast.err?P.red:P.green}`,color:toast.err?P.red:P.green,borderRadius:10,padding:"9px 18px",fontSize:12,fontWeight:600,zIndex:999,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,.12)",animation:"tin .2s ease"}}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(-6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes fin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        html,body{height:100%;overflow:hidden;position:fixed;width:100%;background:${P.bg}}
        body{overscroll-behavior:none}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{display:none}
        input,select,textarea{font-size:16px!important;-webkit-appearance:none}
        input[type=time],input[type=date]{color-scheme:light}
        ::placeholder{color:#B0B3C0!important}
      `}</style>
    </div>
  );
}

// ── PRIMITIVES ───────────────────────────────────────────────────
function Loader(){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"50vh"}}>
      <div style={{width:28,height:28,border:`3px solid ${P.border}`,borderTop:`3px solid ${P.accent}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
    </div>
  );
}
function Card({children,style}){
  return <div style={{background:P.card,borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 12px rgba(0,0,0,.06)",...style}}>{children}</div>;
}
function Pill({children,color,bg}){
  return <span style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:20,background:bg||`${color}18`,color:color||P.accent}}>{children}</span>;
}
function ProgBar({pct,color,h=6}){
  const c=color||P.accent;
  return(
    <div style={{height:h,background:`${c}18`,borderRadius:99,overflow:"hidden"}}>
      <div style={{height:h,borderRadius:99,width:`${Math.min(pct,100)}%`,background:c,transition:"width .6s ease"}}/>
    </div>
  );
}
function SLabel({children,action,onAction}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px 8px"}}>
      <span style={{fontSize:13,fontWeight:700,color:P.text}}>{children}</span>
      {action&&<button onClick={onAction} style={{fontSize:12,color:P.accent,background:"none",border:"none",cursor:"pointer",fontWeight:500}}>{action}</button>}
    </div>
  );
}
function Inp({style,...p}){
  return <input style={{width:"100%",background:P.bg,border:`1px solid ${P.border}`,borderRadius:10,padding:"11px 13px",color:P.text,fontSize:16,outline:"none",display:"block",...style}} {...p}/>;
}
function Sel({style,children,...p}){
  return <select style={{width:"100%",background:P.bg,border:`1px solid ${P.border}`,borderRadius:10,padding:"11px 13px",color:P.text,fontSize:16,outline:"none",display:"block",...style}} {...p}>{children}</select>;
}
function Btn({children,onClick,color,outline,small,style,disabled}){
  const c=color||P.accent;
  return(
    <button onClick={onClick} disabled={disabled} style={{
      background:outline?"transparent":c,
      color:outline?c:"#fff",
      border:outline?`1.5px solid ${c}`:"none",
      borderRadius:10,padding:small?"7px 14px":"12px 20px",
      fontSize:small?12:14,fontWeight:600,cursor:disabled?"default":"pointer",
      opacity:disabled?.5:1,transition:"all .2s",
      boxShadow:outline?"none":`0 4px 14px ${c}40`,...style
    }}>{children}</button>
  );
}
function Empty({text,icon="📋"}){
  return(
    <div style={{textAlign:"center",padding:"48px 24px"}}>
      <div style={{fontSize:40,marginBottom:12,opacity:.5}}>{icon}</div>
      <div style={{fontSize:14,color:P.sub}}>{text}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HOME
// ════════════════════════════════════════════════════════════════
function HomeTab({setTab,tarefas,metas,checked,progress,done,current,nextItem,now}){
  const pend=tarefas.filter(t=>!t.done).length;
  const avgM=metas.length?Math.round(metas.reduce((s,m)=>s+(Number(m.current_val)/Math.max(Number(m.target),1))*100,0)/metas.length):0;
  const h=now.getHours();
  const greet=h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";

  return(
    <div style={{animation:"fin .25s ease",paddingBottom:8}}>
      <div style={{padding:"16px 20px 4px"}}>
        <div style={{fontSize:24,fontWeight:800,color:P.text}}>{greet}, Wanderson</div>
        <div style={{fontSize:13,color:P.sub,marginTop:2,textTransform:"capitalize"}}>{fmtDate(now)}</div>
      </div>

      {/* Today's progress card */}
      <div style={{margin:"12px 20px"}}>
        <Card style={{background:`linear-gradient(135deg,${P.accent},#9B8FFF)`,color:"#fff",padding:"18px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:12,opacity:.8,marginBottom:4}}>Progresso do dia</div>
              <div style={{fontSize:32,fontWeight:800,lineHeight:1}}>{progress}%</div>
              <div style={{fontSize:12,opacity:.7,marginTop:4}}>{done} de {ROUTINE.length} blocos</div>
            </div>
            {/* Big ring */}
            <div style={{position:"relative",width:64,height:64}}>
              <svg width="64" height="64" style={{transform:"rotate(-90deg)"}}>
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="5"/>
                <circle cx="32" cy="32" r="28" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={2*Math.PI*28}
                  strokeDashoffset={2*Math.PI*28-(progress/100)*2*Math.PI*28}
                  style={{transition:"stroke-dashoffset .6s"}}/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{progress}%</span>
              </div>
            </div>
          </div>
          {current&&(
            <div style={{marginTop:12,padding:"8px 12px",background:"rgba(255,255,255,.15)",borderRadius:8,display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#fff",animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:12,color:"rgba(255,255,255,.9)",fontWeight:500}}>{current.icon} {current.label}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,margin:"0 20px 8px"}}>
        {[
          {l:"Tarefas",   v:pend,     c:P.yellow,  icon:"✅",tab:"tarefas"},
          {l:"Metas",     v:metas.filter(m=>!m.done).length,  c:P.green,  icon:"🎯",tab:"metas"},
          {l:"Média",     v:avgM+"%", c:P.accent2, icon:"📊",tab:"metas"},
        ].map(s=>(
          <button key={s.l} onClick={()=>setTab(s.tab)} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
            <Card style={{padding:"12px 10px",textAlign:"center"}}>
              <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:P.sub,marginTop:2}}>{s.l}</div>
            </Card>
          </button>
        ))}
      </div>

      {/* Next mission */}
      {nextItem&&(
        <>
          <SLabel>Próxima missão</SLabel>
          <div style={{margin:"0 20px"}} onClick={()=>setTab("rotina")}>
            <Card style={{display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}>
              <div style={{width:46,height:46,borderRadius:12,background:CAT_COLOR[nextItem.cat]?.bg||`${P.accent}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {nextItem.icon}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:600,color:P.text}}>{nextItem.label}</div>
                <div style={{fontSize:11,color:P.sub,marginTop:2}}>{nextItem.time} · {nextItem.desc.substring(0,38)}...</div>
              </div>
              <Pill color={CAT_COLOR[nextItem.cat]?.text||P.accent} bg={CAT_COLOR[nextItem.cat]?.bg}>{nextItem.cat}</Pill>
            </Card>
          </div>
        </>
      )}

      {/* Pending tasks */}
      {pend>0&&(
        <>
          <SLabel action="Ver tudo" onAction={()=>setTab("tarefas")}>Em andamento</SLabel>
          <div style={{display:"flex",flexDirection:"column",gap:8,margin:"0 20px"}}>
            {tarefas.filter(t=>!t.done).slice(0,3).map(t=>(
              <Card key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}>
                <div style={{width:10,height:10,borderRadius:3,background:TAG_COLORS[t.tag]||P.accent,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:P.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div>
                  {t.reminder_time&&<div style={{fontSize:10,color:P.sub,marginTop:1}}>⏰ {t.reminder_time}</div>}
                </div>
                <Pill color={TAG_COLORS[t.tag]||P.accent}>{t.tag}</Pill>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROTINA
// ════════════════════════════════════════════════════════════════
function RotinaTab({checked,toggleCheck}){
  const [selCat,setSelCat]=useState("Todas");
  const cats=["Todas",...Object.keys(CAT_COLOR)];
  const list=selCat==="Todas"?ROUTINE:ROUTINE.filter(r=>r.cat===selCat);

  return(
    <div style={{animation:"fin .25s ease"}}>
      {/* Filter chips */}
      <div style={{display:"flex",gap:7,overflowX:"auto",padding:"12px 20px 8px",scrollbarWidth:"none"}}>
        {cats.map(c=>{
          const a=selCat===c;
          const cc=CAT_COLOR[c]||{bg:`${P.accent}14`,text:P.accent};
          return(
            <button key={c} onClick={()=>setSelCat(c)} style={{
              fontSize:12,fontWeight:a?600:500,padding:"6px 14px",borderRadius:20,
              whiteSpace:"nowrap",flexShrink:0,cursor:"pointer",border:"none",
              background:a?cc.text:`${P.text}08`,
              color:a?"#fff":P.sub,
              transition:"all .2s",
              boxShadow:a?`0 4px 12px ${cc.text}44`:"none"
            }}>{c}</button>
          );
        })}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8,padding:"4px 20px"}}>
        {list.map((item,i)=>{
          const ck=!!checked[item.id];
          const cc=CAT_COLOR[item.cat]||{bg:`${P.accent}14`,text:P.accent};
          const nm=new Date().getHours()*60+new Date().getMinutes();
          const next=ROUTINE[ROUTINE.indexOf(item)+1];
          const isNow=nm>=t2m(item.time)&&(!next||nm<t2m(next.time))&&!ck;

          return(
            <Card key={item.id} style={{
              display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
              cursor:"pointer",opacity:ck?.5:1,transition:"opacity .2s",
              border:isNow?`1.5px solid ${cc.text}44`:`1px solid ${P.border}`,
              boxShadow:isNow?`0 4px 16px ${cc.text}18`:"0 2px 8px rgba(0,0,0,.04)"
            }} onClick={()=>toggleCheck(item.id)}>
              {/* Checkbox */}
              <div style={{width:22,height:22,borderRadius:7,flexShrink:0,background:ck?cc.text:"transparent",border:`2px solid ${ck?cc.text:P.border}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",boxShadow:ck?`0 2px 8px ${cc.text}44`:"none"}}>
                {ck&&<svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" style={{width:12,height:12}}><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              {/* Icon */}
              <div style={{width:38,height:38,borderRadius:10,background:cc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{item.icon}</div>
              {/* Text */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:ck?P.sub:P.text,textDecoration:ck?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</div>
                <div style={{fontSize:10,color:P.sub,marginTop:1}}>{item.time} · {item.desc.substring(0,30)}...</div>
              </div>
              {isNow&&<div style={{width:8,height:8,borderRadius:"50%",background:cc.text,animation:"pulse 2s infinite",flexShrink:0}}/>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAREFAS
// ════════════════════════════════════════════════════════════════
function TarefasTab({tarefas,addTarefa,toggleTarefa,removeTarefa}){
  const [form,setForm]=useState({title:"",note:"",tag:"UPMIND",reminder_time:""});
  const [open,setOpen]=useState(false);

  const add=async()=>{
    if(!form.title.trim())return;
    await addTarefa(form);
    setForm({title:"",note:"",tag:"UPMIND",reminder_time:""});
    setOpen(false);
  };

  const pend=tarefas.filter(t=>!t.done);
  const done=tarefas.filter(t=>t.done);

  return(
    <div style={{animation:"fin .25s ease"}}>
      {/* Header with stats */}
      <div style={{padding:"12px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:P.text}}>Tarefas de hoje</div>
          <div style={{fontSize:12,color:P.sub,marginTop:2}}>{pend.length} pendentes · {done.length} concluídas</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:0,margin:"12px 20px",background:`${P.text}08`,borderRadius:12,padding:3}}>
        {["Todas","Pendentes","Feitas"].map((f,fi)=>(
          <button key={f} style={{flex:1,padding:"7px 6px",borderRadius:10,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:fi===0?"#fff":"transparent",color:fi===0?P.text:P.sub,boxShadow:fi===0?"0 1px 6px rgba(0,0,0,.08)":"none",transition:"all .2s"}}>
            {f}
          </button>
        ))}
      </div>

      {/* Form */}
      {open&&(
        <div style={{margin:"0 20px 12px",animation:"fin .2s ease"}}>
          <Card>
            <div style={{fontSize:14,fontWeight:700,color:P.text,marginBottom:12}}>Nova tarefa</div>
            <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Título da tarefa..." autoFocus/>
            <Inp value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Observação..." style={{marginTop:8}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
              <Sel value={form.tag} onChange={e=>setForm(f=>({...f,tag:e.target.value}))}>{Object.keys(TAG_COLORS).map(k=><option key={k}>{k}</option>)}</Sel>
              <Inp type="time" value={form.reminder_time} onChange={e=>setForm(f=>({...f,reminder_time:e.target.value}))}/>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn onClick={add} style={{flex:1}}>Adicionar</Btn>
              <Btn outline onClick={()=>setOpen(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
          </Card>
        </div>
      )}

      {pend.length===0&&!open&&<Empty text="Nenhuma tarefa pendente" icon="🎉"/>}

      <div style={{display:"flex",flexDirection:"column",gap:8,padding:"4px 20px"}}>
        {pend.map(t=><TCard key={t.id} t={t} onToggle={toggleTarefa} onRemove={removeTarefa}/>)}
      </div>

      {done.length>0&&(
        <>
          <SLabel>Concluídas ({done.length})</SLabel>
          <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 20px"}}>
            {done.map(t=><TCard key={t.id} t={t} onToggle={toggleTarefa} onRemove={removeTarefa}/>)}
          </div>
        </>
      )}

      {/* FAB */}
      {!open&&(
        <button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:"calc(72px + env(safe-area-inset-bottom,0px) + 16px)",right:20,width:48,height:48,borderRadius:14,background:P.accent,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 16px ${P.accent}55`,zIndex:50}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{width:22,height:22}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}
    </div>
  );
}

function TCard({t,onToggle,onRemove}){
  const c=TAG_COLORS[t.tag]||P.accent;
  return(
    <Card style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",opacity:t.done?.55:1}}>
      <div onClick={()=>onToggle(t.id)} style={{width:22,height:22,borderRadius:7,flexShrink:0,marginTop:1,background:t.done?c:"transparent",border:`2px solid ${t.done?c:P.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s",boxShadow:t.done?`0 2px 8px ${c}44`:"none"}}>
        {t.done&&<svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" style={{width:12,height:12}}><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:500,color:t.done?P.sub:P.text,textDecoration:t.done?"line-through":"none"}}>{t.title}</div>
        {t.note&&<div style={{fontSize:11,color:P.sub,marginTop:2}}>{t.note}</div>}
        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
          <Pill color={c}>{t.tag}</Pill>
          {t.reminder_time&&<span style={{fontSize:10,color:P.sub}}>⏰ {t.reminder_time}</span>}
        </div>
      </div>
      <button onClick={()=>onRemove(t.id)} style={{background:"none",border:"none",color:P.border,cursor:"pointer",fontSize:18,padding:0,lineHeight:1,marginTop:-2}}>×</button>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════
// METAS
// ════════════════════════════════════════════════════════════════
function MetasTab({metas,submetas,addMeta,updateMetaProgress,removeMeta,addSubmeta,updateSubmeta,toggleSubmeta,removeSubmeta}){
  const [selCat,setSelCat]=useState("Todas");
  const [detail,setDetail]=useState(null);
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({title:"",descricao:"",cat:"UPMIND",tipo:"Mensal",target:100,prazo:"",objetivo:""});

  const add=async()=>{
    if(!form.title.trim())return;
    await addMeta(form);
    setForm({title:"",descricao:"",cat:"UPMIND",tipo:"Mensal",target:100,prazo:"",objetivo:""});
    setOpen(false);
  };

  const cats=["Todas",...META_CATS];
  const list=selCat==="Todas"?metas:metas.filter(m=>m.cat===selCat);
  const pend=list.filter(m=>!m.done);
  const done=list.filter(m=>m.done);
  const avg=metas.length?Math.round(metas.reduce((s,m)=>s+(Number(m.current_val)/Math.max(Number(m.target),1))*100,0)/metas.length):0;

  if(detail)return(
    <MetaDetail meta={detail} onBack={()=>setDetail(null)}
      onProgress={updateMetaProgress} onRemove={removeMeta}
      submetas={submetas.filter(s=>s.meta_id===detail.id)}
      addSubmeta={addSubmeta} updateSubmeta={updateSubmeta}
      toggleSubmeta={toggleSubmeta} removeSubmeta={removeSubmeta}/>
  );

  return(
    <div style={{animation:"fin .25s ease"}}>
      <div style={{padding:"12px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:P.text}}>Metas</div>
          <div style={{fontSize:12,color:P.sub,marginTop:2}}>{pend.length} ativas · média {avg}%</div>
        </div>
      </div>

      {/* Cat filter */}
      <div style={{display:"flex",gap:7,overflowX:"auto",padding:"12px 20px 8px",scrollbarWidth:"none"}}>
        {cats.map(c=>{
          const a=selCat===c;
          const cc=META_COLORS[c]||P.accent;
          return(
            <button key={c} onClick={()=>setSelCat(c)} style={{fontSize:11,fontWeight:a?600:500,padding:"5px 13px",borderRadius:20,whiteSpace:"nowrap",flexShrink:0,cursor:"pointer",border:"none",background:a?cc:`${P.text}08`,color:a?"#fff":P.sub,transition:"all .2s",boxShadow:a?`0 3px 10px ${cc}44`:"none"}}>
              {META_ICONS[c]||""} {c}
            </button>
          );
        })}
      </div>

      {/* Form */}
      {open&&(
        <div style={{margin:"0 20px 12px",animation:"fin .2s ease"}}>
          <Card>
            <div style={{fontSize:14,fontWeight:700,color:P.text,marginBottom:12}}>Nova meta</div>
            <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Meta (ex: Ler 12 livros em 2026)..." autoFocus/>
            <Inp value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Como vai medir..." style={{marginTop:8}}/>
            <Inp value={form.objetivo} onChange={e=>setForm(f=>({...f,objetivo:e.target.value}))} placeholder="Por que isso importa..." style={{marginTop:8}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
              <Sel value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>{META_CATS.map(c=><option key={c}>{c}</option>)}</Sel>
              <Sel value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>{["Diária","Semanal","Mensal","Trimestral","Anual"].map(t=><option key={t}>{t}</option>)}</Sel>
              <Inp type="number" value={form.target} onChange={e=>setForm(f=>({...f,target:Number(e.target.value)}))} placeholder="Meta número"/>
              <Inp type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))}/>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn onClick={add} color={P.green} style={{flex:1}}>Criar meta</Btn>
              <Btn outline color={P.green} onClick={()=>setOpen(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
          </Card>
        </div>
      )}

      {pend.length===0&&selCat==="Todas"&&!open&&<Empty text="Nenhuma meta registrada" icon="🎯"/>}

      {/* 2-col grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"4px 20px"}}>
        {pend.map(m=>(
          <MCard key={m.id} m={m} onPress={()=>setDetail(m)} onProgress={updateMetaProgress} onRemove={removeMeta}
            subCount={submetas.filter(s=>s.meta_id===m.id).length}
            subDone={submetas.filter(s=>s.meta_id===m.id&&s.done).length}/>
        ))}
      </div>

      {done.length>0&&(
        <>
          <SLabel>Concluídas ({done.length})</SLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 20px"}}>
            {done.map(m=>(
              <MCard key={m.id} m={m} onPress={()=>setDetail(m)} onProgress={updateMetaProgress} onRemove={removeMeta}
                subCount={submetas.filter(s=>s.meta_id===m.id).length}
                subDone={submetas.filter(s=>s.meta_id===m.id&&s.done).length}/>
            ))}
          </div>
        </>
      )}

      {!open&&(
        <button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:"calc(72px + env(safe-area-inset-bottom,0px) + 16px)",right:20,width:48,height:48,borderRadius:14,background:P.green,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 16px ${P.green}55`,zIndex:50}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{width:22,height:22}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}
    </div>
  );
}

function MCard({m,onPress,onProgress,onRemove,subCount,subDone}){
  const c=META_COLORS[m.cat]||P.accent;
  const pct=Math.round((Number(m.current_val)/Math.max(Number(m.target),1))*100);
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(m.current_val);

  return(
    <Card style={{padding:0,overflow:"hidden",opacity:m.done?.6:1}}>
      <div onClick={onPress} style={{cursor:"pointer"}}>
        {/* Color header */}
        <div style={{height:6,background:`linear-gradient(90deg,${c},${c}88)`}}/>
        <div style={{padding:"12px 12px 8px",position:"relative"}}>
          <button onClick={e=>{e.stopPropagation();onRemove(m.id);}} style={{position:"absolute",top:8,right:8,background:"none",border:"none",color:P.border,cursor:"pointer",fontSize:14,padding:0,lineHeight:1}}>×</button>
          <div style={{fontSize:24,marginBottom:6}}>{META_ICONS[m.cat]||"🎯"}</div>
          <div style={{fontSize:12,fontWeight:600,color:m.done?P.sub:P.text,lineHeight:1.3,marginBottom:8,textDecoration:m.done?"line-through":"none",paddingRight:16}}>{m.title}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
            <span style={{fontSize:10,color:P.sub}}>{m.current_val}/{m.target}</span>
            <span style={{fontSize:12,fontWeight:700,color:pct>=100?P.green:c}}>{pct}%</span>
          </div>
          <ProgBar pct={pct} color={pct>=100?P.green:c} h={4}/>
          {subCount>0&&<div style={{fontSize:9,color:P.sub,marginTop:5}}>{subDone}/{subCount} submetas</div>}
        </div>
      </div>
      <div style={{padding:"0 12px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${P.border}`}}>
        <Pill color={c}>{m.cat}</Pill>
        {!m.done&&(
          editing?(
            <div style={{display:"flex",gap:4,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
              <Inp type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:56,padding:"4px 7px",fontSize:12,borderRadius:7}}/>
              <Btn small color={c} onClick={()=>{onProgress(m.id,val);setEditing(false);}}>✓</Btn>
            </div>
          ):(
            <button onClick={e=>{e.stopPropagation();setVal(m.current_val);setEditing(true);}} style={{fontSize:11,background:"none",border:"none",color:P.sub,cursor:"pointer",padding:0,fontWeight:500}}>+ atualizar</button>
          )
        )}
      </div>
    </Card>
  );
}

// ── META DETAIL ──────────────────────────────────────────────────
function MetaDetail({meta,onBack,onProgress,onRemove,submetas,addSubmeta,updateSubmeta,toggleSubmeta,removeSubmeta}){
  const c=META_COLORS[meta.cat]||P.accent;
  const pct=Math.round((Number(meta.current_val)/Math.max(Number(meta.target),1))*100);
  const [val,setVal]=useState(meta.current_val);
  const [editing,setEditing]=useState(false);
  const [openSub,setOpenSub]=useState(false);
  const [sub,setSub]=useState({title:"",descricao:"",target:1,unidade:"un"});
  const addSub=async()=>{if(!sub.title.trim())return;await addSubmeta(meta.id,sub);setSub({title:"",descricao:"",target:1,unidade:"un"});setOpenSub(false);};
  const subDone=submetas.filter(s=>s.done);
  const subPend=submetas.filter(s=>!s.done);

  return(
    <div style={{animation:"fin .25s ease"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",color:P.accent,cursor:"pointer",fontSize:14,padding:"12px 20px 4px",fontWeight:600}}>
        ← Voltar
      </button>

      {/* Header */}
      <div style={{margin:"4px 20px 0"}}>
        <Card style={{background:`linear-gradient(135deg,${c}18,${c}08)`}}>
          <div style={{fontSize:36,marginBottom:8}}>{META_ICONS[meta.cat]||"🎯"}</div>
          <div style={{fontSize:20,fontWeight:800,color:P.text,marginBottom:4}}>{meta.title}</div>
          {meta.descricao&&<div style={{fontSize:13,color:P.sub,marginBottom:10}}>{meta.descricao}</div>}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <Pill color={c}>{meta.cat}</Pill>
            <Pill color={P.sub}>{meta.tipo}</Pill>
            {meta.prazo&&<Pill color={P.sub}>até {fmtShort(meta.prazo)}</Pill>}
          </div>
        </Card>
      </div>

      {/* Progress */}
      <div style={{margin:"10px 20px"}}>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontSize:11,color:P.sub,fontWeight:600,marginBottom:2}}>PROGRESSO GERAL</div>
              <div style={{fontSize:36,fontWeight:800,color:pct>=100?P.green:c,lineHeight:1}}>{pct}%</div>
              <div style={{fontSize:12,color:P.sub,marginTop:2}}>{meta.current_val} de {meta.target}</div>
            </div>
            {!meta.done&&(editing?(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <Inp type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:80}}/>
                <Btn color={c} onClick={()=>{onProgress(meta.id,val);setEditing(false);}}>✓</Btn>
              </div>
            ):(
              <Btn color={c} onClick={()=>{setVal(meta.current_val);setEditing(true);}}>Atualizar</Btn>
            ))}
          </div>
          <ProgBar pct={pct} color={pct>=100?P.green:c} h={10}/>
          {submetas.length>0&&<div style={{fontSize:11,color:P.sub,marginTop:8}}>{subDone.length}/{submetas.length} submetas concluídas</div>}
        </Card>
      </div>

      {/* Objetivo */}
      {meta.objetivo&&(
        <div style={{margin:"0 20px 10px"}}>
          <Card>
            <div style={{fontSize:11,fontWeight:700,color:P.sub,marginBottom:6}}>POR QUE ISSO IMPORTA</div>
            <div style={{fontSize:13,color:P.text,lineHeight:1.6}}>{meta.objetivo}</div>
          </Card>
        </div>
      )}

      {/* Submetas */}
      <div style={{margin:"0 20px 10px"}}>
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:submetas.length>0||openSub?`1px solid ${P.border}`:"none"}}>
            <div style={{fontSize:14,fontWeight:700,color:P.text}}>Submetas {submetas.length>0&&`(${submetas.length})`}</div>
            <button onClick={()=>setOpenSub(o=>!o)} style={{fontSize:13,color:P.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
              {openSub?"Cancelar":"+ Nova"}
            </button>
          </div>
          {openSub&&(
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${P.border}`}}>
              <Inp value={sub.title} onChange={e=>setSub(f=>({...f,title:e.target.value}))} placeholder="Ex: Janeiro — Livro X..." autoFocus/>
              <Inp value={sub.descricao} onChange={e=>setSub(f=>({...f,descricao:e.target.value}))} placeholder="Detalhes..." style={{marginTop:8}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                <Inp type="number" value={sub.target} onChange={e=>setSub(f=>({...f,target:Number(e.target.value)}))} placeholder="Meta número"/>
                <Inp value={sub.unidade} onChange={e=>setSub(f=>({...f,unidade:e.target.value}))} placeholder="livros, R$..."/>
              </div>
              <Btn onClick={addSub} color={c} style={{marginTop:10,width:"100%"}}>Criar submeta</Btn>
            </div>
          )}
          {submetas.length===0&&!openSub&&<div style={{padding:14,fontSize:12,color:P.sub,textAlign:"center"}}>Nenhuma submeta ainda</div>}
          {subPend.map((s,i)=><SubRow key={s.id} s={s} c={c} onToggle={toggleSubmeta} onUpdate={updateSubmeta} onRemove={removeSubmeta} last={i===subPend.length-1&&subDone.length===0}/>)}
          {subDone.length>0&&(
            <>
              <div style={{padding:"8px 14px",fontSize:11,fontWeight:600,color:P.sub,background:P.bg}}>CONCLUÍDAS ({subDone.length})</div>
              {subDone.map((s,i)=><SubRow key={s.id} s={s} c={c} onToggle={toggleSubmeta} onUpdate={updateSubmeta} onRemove={removeSubmeta} last={i===subDone.length-1}/>)}
            </>
          )}
        </Card>
      </div>

      {/* Info */}
      <div style={{margin:"0 20px 10px"}}>
        <Card style={{padding:"12px 14px"}}>
          <div style={{fontSize:11,fontWeight:700,color:P.sub,marginBottom:8}}>DETALHES</div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${P.border}`}}>
            <span style={{fontSize:12,color:P.sub}}>Criada em</span>
            <span style={{fontSize:12,color:P.text,fontWeight:500}}>{fmtDT(meta.created_at)}</span>
          </div>
          {meta.done_at&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
            <span style={{fontSize:12,color:P.sub}}>Concluída</span>
            <span style={{fontSize:12,color:P.green,fontWeight:500}}>{fmtDT(meta.done_at)}</span>
          </div>}
        </Card>
      </div>

      <div style={{padding:"0 20px 24px"}}>
        <button onClick={()=>{onRemove(meta.id);onBack();}} style={{width:"100%",padding:"12px",borderRadius:12,background:"transparent",border:`1.5px solid ${P.red}44`,color:P.red,fontSize:13,cursor:"pointer",fontWeight:500}}>
          Remover meta
        </button>
      </div>
    </div>
  );
}

function SubRow({s,c,onToggle,onUpdate,onRemove,last}){
  const pct=Math.round((Number(s.current_val)/Math.max(Number(s.target),1))*100);
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(s.current_val);
  return(
    <div style={{borderBottom:last?"none":`1px solid ${P.border}`,padding:"11px 14px",opacity:s.done?.5:1}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div onClick={()=>onToggle(s.id)} style={{width:20,height:20,borderRadius:6,flexShrink:0,marginTop:1,background:s.done?c:"transparent",border:`2px solid ${s.done?c:P.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s"}}>
          {s.done&&<svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" style={{width:11,height:11}}><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,color:s.done?P.sub:P.text,textDecoration:s.done?"line-through":"none"}}>{s.title}</div>
          {s.descricao&&<div style={{fontSize:11,color:P.sub,marginTop:1}}>{s.descricao}</div>}
          {Number(s.target)>1&&(
            <div style={{marginTop:6}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:10,color:P.sub}}>{s.current_val}/{s.target} {s.unidade}</span>
                <span style={{fontSize:11,fontWeight:700,color:pct>=100?P.green:c}}>{pct}%</span>
              </div>
              <ProgBar pct={pct} color={pct>=100?P.green:c} h={4}/>
            </div>
          )}
          {!s.done&&Number(s.target)>1&&(
            <div style={{marginTop:7,display:"flex",gap:5,alignItems:"center"}}>
              {editing?(
                <><Inp type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:70,padding:"5px 8px",fontSize:12}}/>
                <Btn small color={c} onClick={()=>{onUpdate(s.id,val);setEditing(false);}}>✓</Btn>
                <Btn small outline color={P.sub} onClick={()=>setEditing(false)}>×</Btn></>
              ):(
                <button onClick={()=>{setVal(s.current_val);setEditing(true);}} style={{fontSize:11,background:"none",border:"none",color:P.sub,cursor:"pointer",padding:0,fontWeight:500}}>+ atualizar</button>
              )}
            </div>
          )}
        </div>
        <button onClick={()=>onRemove(s.id)} style={{background:"none",border:"none",color:P.border,cursor:"pointer",fontSize:16,lineHeight:1,padding:0,flexShrink:0}}>×</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// JARVIS
// ════════════════════════════════════════════════════════════════
function JarvisTab({chat,setChat,addTarefa,addMeta,toast2,tarefas,checked,progress,nextItem,metas,notas,addNota,convertNota,removeNota}){
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [mode,setMode]=useState("chat");
  const [text,setText]=useState("");
  const [rec,setRec]=useState(false);
  const endRef=useRef(null);
  const mediaRef=useRef(null);
  const chunks=useRef([]);
  const pend=tarefas.filter(t=>!t.done).length;
  const doneB=Object.values(checked).filter(Boolean).length;

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[chat]);

  const send=async(text)=>{
    if(!text.trim()||loading)return;
    const uMsg={role:"user",content:text};
    const next=[...chat,uMsg];
    setChat(next);setInput("");setLoading(true);
    await sb("chat_history","POST",{role:"user",content:text,created_at:new Date().toISOString()});

    const ctx=`[CONTEXTO ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}: Rotina ${progress}% (${doneB}/${ROUTINE.length}). Próximo: ${nextItem?nextItem.time+" "+nextItem.label:"concluído"}. Tarefas pendentes: ${pend}. Metas ativas: ${metas.filter(m=>!m.done).length}.

Se o usuário pedir para criar tarefa, meta ou lembrete, inclua ao final EXATAMENTE:
%%CADASTRAR%%{"tipo":"tarefa","title":"...","note":"...","tag":"UPMIND"}%%FIM%%
ou para meta:
%%CADASTRAR%%{"tipo":"meta","title":"...","cat":"UPMIND","target":100,"objetivo":"..."}%%FIM%%

Mensagem: ${text}]`;

    try{
      const reply=await askAI([...chat,{role:"user",content:ctx}]);
      let clean=reply;
      const match=reply.match(/%%CADASTRAR%%([\s\S]*?)%%FIM%%/);
      if(match){
        clean=reply.replace(/%%CADASTRAR%%[\s\S]*?%%FIM%%/g,"").trim();
        try{
          const d=JSON.parse(match[1].trim().replace(/[\r\n]+/g," "));
          if(d.tipo==="meta"){await addMeta({title:d.title||"Meta",cat:d.cat||"UPMIND",tipo:"Mensal",target:Number(d.target)||100,descricao:"",objetivo:d.objetivo||""});toast2("Meta criada por J.A.R.V.I.S ✓");}
          else{await addTarefa({title:d.title||"Tarefa",tag:d.tag||"UPMIND",note:d.note||"",reminder_time:""});toast2("Tarefa criada por J.A.R.V.I.S ✓");}
        }catch{}
      }
      setChat([...next,{role:"assistant",content:clean}]);
      await sb("chat_history","POST",{role:"assistant",content:clean,created_at:new Date().toISOString()});
    }catch{
      const err="Conexão perdida. Tente novamente.";
      setChat([...next,{role:"assistant",content:err}]);
    }
    setLoading(false);
  };

  const startRec=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({audio:true});
      const mr=new MediaRecorder(s);
      chunks.current=[];
      mr.ondataavailable=e=>chunks.current.push(e.data);
      mr.onstop=()=>{s.getTracks().forEach(t=>t.stop());setRec(false);toast2("Áudio registrado");};
      mr.start();mediaRef.current=mr;setRec(true);
    }catch{toast2("Microfone bloqueado",true);}
  };
  const stopRec=()=>{if(mediaRef.current&&rec)mediaRef.current.stop();};

  const quick=["Como está meu dia?","O que ainda preciso fazer?","Analise minhas metas","Qual meu foco agora?"];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100dvh - 130px)"}}>
      {/* Mode tabs */}
      <div style={{display:"flex",gap:0,margin:"10px 20px 0",background:`${P.text}08`,borderRadius:12,padding:3,flexShrink:0}}>
        {[{id:"chat",l:"Chat IA"},{id:"notas",l:"Notas"}].map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)} style={{flex:1,padding:"8px 6px",borderRadius:10,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:mode===m.id?"#fff":"transparent",color:mode===m.id?P.text:P.sub,boxShadow:mode===m.id?"0 1px 6px rgba(0,0,0,.08)":"none",transition:"all .2s"}}>
            {m.l}
          </button>
        ))}
      </div>

      {mode==="notas"?(
        <div style={{flex:1,overflowY:"scroll",WebkitOverflowScrolling:"touch",padding:"12px 20px"}}>
          <Card style={{marginBottom:12}}>
            <button onClick={rec?stopRec:startRec} style={{width:"100%",padding:"10px",borderRadius:10,marginBottom:10,cursor:"pointer",background:rec?`${P.red}10`:"transparent",border:`1.5px solid ${rec?P.red:P.border}`,color:rec?P.red:P.sub,fontSize:13,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {rec?<><div style={{width:7,height:7,borderRadius:"50%",background:P.red,animation:"pulse 1s infinite"}}/> Parar gravação</>:<>🎙 Gravar áudio</>}
            </button>
            <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Escreva uma ideia, tarefa, lembrete... J.A.R.V.I.S converte automaticamente." rows={3} style={{width:"100%",background:P.bg,border:`1px solid ${P.border}`,borderRadius:10,padding:"10px 12px",color:P.text,fontSize:16,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.5}}/>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
              <Btn onClick={async()=>{if(text.trim()){await addNota(text);setText("");}}} color={P.accent}>Salvar nota</Btn>
            </div>
          </Card>

          {notas.length===0&&<Empty text="Nenhuma anotação ainda" icon="📝"/>}
          {notas.map(n=>(
            <Card key={n.id} style={{marginBottom:8,opacity:n.converted?.6:1,borderLeft:`3px solid ${n.converted?P.green:P.accent}`}}>
              <div style={{fontSize:13,color:P.text,lineHeight:1.6,marginBottom:8}}>{n.texto}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:10,color:P.sub}}>{fmtDT(n.created_at)}</span>
                <div style={{display:"flex",gap:6}}>
                  {n.converted?<span style={{fontSize:11,color:P.green,fontWeight:600}}>✓ Convertido</span>
                    :<Btn small outline color={P.accent} onClick={()=>convertNota(n)}>→ Converter</Btn>}
                  <button onClick={()=>removeNota(n.id)} style={{background:"none",border:"none",color:P.border,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ):(
        <>
          <div style={{flex:1,overflowY:"scroll",WebkitOverflowScrolling:"touch",padding:"10px 20px"}}>
            {/* Status */}
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0 10px",borderBottom:`1px solid ${P.border}`,marginBottom:8}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:P.green}}/>
              <span style={{fontSize:11,color:P.sub}}>J.A.R.V.I.S · Claude Sonnet · Online</span>
              <button onClick={async()=>{setChat([]);await sb("chat_history","DELETE","",`?role=eq.user`);await sb("chat_history","DELETE","",`?role=eq.assistant`);}} style={{marginLeft:"auto",fontSize:11,color:P.sub,background:"none",border:"none",cursor:"pointer"}}>Limpar</button>
            </div>

            {chat.length===0&&(
              <div style={{paddingTop:8}}>
                <div style={{fontSize:13,color:P.sub,marginBottom:12,textAlign:"center"}}>Como posso ajudar?</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {quick.map(q=>(
                    <button key={q} onClick={()=>send(q)} style={{background:P.card,border:`1px solid ${P.border}`,color:P.text,borderRadius:12,padding:"12px 14px",cursor:"pointer",fontSize:13,textAlign:"left",fontWeight:500,boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
                      {q} →
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chat.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:10}}>
                {m.role==="assistant"&&(
                  <div style={{width:28,height:28,borderRadius:"50%",background:`${P.accent}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginRight:7,fontSize:14}}>✦</div>
                )}
                <div style={{maxWidth:"78%",background:m.role==="user"?P.accent:P.card,border:m.role==="user"?"none":`1px solid ${P.border}`,borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"10px 13px",fontSize:13,color:m.role==="user"?"#fff":P.text,lineHeight:1.65,whiteSpace:"pre-wrap",boxShadow:m.role==="user"?`0 4px 14px ${P.accent}44`:"0 2px 8px rgba(0,0,0,.05)"}}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${P.accent}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✦</div>
                <div style={{display:"flex",gap:4,padding:"10px 13px",background:P.card,border:`1px solid ${P.border}`,borderRadius:"14px 14px 14px 4px",boxShadow:"0 2px 8px rgba(0,0,0,.05)"}}>
                  {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:P.sub,animation:`pulse 1.4s ${i*.18}s infinite`}}/>)}
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          <div style={{display:"flex",gap:8,padding:"10px 20px max(10px,env(safe-area-inset-bottom)) 20px",borderTop:`1px solid ${P.border}`,flexShrink:0,background:"#fff"}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder="Mensagem para J.A.R.V.I.S..." rows={1} style={{flex:1,background:P.bg,border:`1px solid ${P.border}`,borderRadius:12,padding:"10px 14px",color:P.text,fontSize:16,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.4,maxHeight:100,overflowY:"auto"}}/>
            <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{width:42,height:42,borderRadius:12,flexShrink:0,alignSelf:"flex-end",background:loading||!input.trim()?P.bg:P.accent,border:`1px solid ${loading||!input.trim()?P.border:"transparent"}`,cursor:loading||!input.trim()?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",boxShadow:loading||!input.trim()?"none":`0 4px 12px ${P.accent}44`}}>
              <svg viewBox="0 0 24 24" fill="none" stroke={loading||!input.trim()?P.sub:"#fff"} strokeWidth="2.5" style={{width:17,height:17}}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
