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

const ROUTINE = [
  {id:"r1", time:"04:50",label:"Despertar",       icon:"🌅",desc:"Água 500ml · Sem celular · Roupa separada",   cat:"Manhã"},
  {id:"r2", time:"05:00",label:"Academia",         icon:"💪",desc:"90 min treino · Mente livre",                cat:"Manhã"},
  {id:"r3", time:"06:30",label:"Café + Leitura",   icon:"📖",desc:"Banho · 1ª refeição · 10 min leitura",      cat:"Manhã"},
  {id:"r4", time:"07:10",label:"Deslocamento",     icon:"🚗",desc:"Revisar pauta · Chegar 7h25",               cat:"Trabalho"},
  {id:"r5", time:"07:30",label:"Abertura CentroMed",icon:"🏥",desc:"Meta Ads · CPL · WhatsApp · Breno",        cat:"Trabalho"},
  {id:"r6", time:"08:00",label:"Bloco Conteúdo",   icon:"🎬",desc:"Maria Eduarda · Aprovações · Gravações",    cat:"Trabalho"},
  {id:"r7", time:"09:30",label:"Reunião Médicos",  icon:"⚕️",desc:"João Paulo · Mardônio · Larissa · CFM",    cat:"Trabalho"},
  {id:"r8", time:"10:30",label:"Tráfego Pago",     icon:"📊",desc:"Frequência < 2,5x · CPL < R$4 → escalar",  cat:"Trabalho"},
  {id:"r9", time:"12:00",label:"Almoço",           icon:"🍽️",desc:"Refeição natural · Sem tela · Descanso",   cat:"Nutrição"},
  {id:"r10",time:"13:00",label:"Bloco UPMIND",     icon:"⚡",desc:"Clientes · Entregas · Pipeline",            cat:"UPMIND"},
  {id:"r11",time:"14:30",label:"Estratégia UPMIND",icon:"🧠",desc:"Mentoria waitlist · Newton · Copa 2026",    cat:"UPMIND"},
  {id:"r12",time:"15:30",label:"Conteúdo Pessoal", icon:"📱",desc:"1 conteúdo · Hook → Virada → Moral → CTA", cat:"Marca"},
  {id:"r13",time:"16:30",label:"Presença Digital", icon:"✨",desc:"DMs estratégicos · Story · Métricas",       cat:"Marca"},
  {id:"r14",time:"17:00",label:"Review do Dia",    icon:"✅",desc:"Executado vs planejado · 3 prioridades",    cat:"Encerramento"},
  {id:"r15",time:"17:30",label:"Jantar + Família", icon:"🏠",desc:"Refeição natural · Família · Descanso",     cat:"Nutrição"},
  {id:"r16",time:"19:30",label:"Wind Down",        icon:"🌙",desc:"Última refeição · Sem tela · Dormir 21h30", cat:"Encerramento"},
];

const CAT_COLOR = {
  "Manhã":"#4ade80","Trabalho":"#60a5fa","Nutrição":"#fb923c",
  "UPMIND":"#a78bfa","Marca":"#f472b6","Encerramento":"#facc15",
};
const META_CATS   = ["UPMIND","CentroMed","Marca Pessoal","Saúde","Financeiro","Leitura","Pessoal"];
const META_COLORS = {UPMIND:"#a78bfa",CentroMed:"#60a5fa","Marca Pessoal":"#f472b6",Saúde:"#4ade80",Financeiro:"#facc15",Leitura:"#fb923c",Pessoal:"#94a3b8"};
const META_ICONS  = {UPMIND:"⚡",CentroMed:"🏥","Marca Pessoal":"✨",Saúde:"💪",Financeiro:"💰",Leitura:"📖",Pessoal:"🌱"};
const TAG_COLORS  = {UPMIND:"#a78bfa",CentroMed:"#60a5fa",Marca:"#f472b6",Corpo:"#4ade80",Pausa:"#94a3b8",Encerramento:"#facc15"};

function askNotif(){if("Notification" in window&&Notification.permission==="default")Notification.requestPermission();}
function notify(t,b){if("Notification" in window&&Notification.permission==="granted")new Notification(t,{body:b});}

async function askAI(messages,sys){
  const system=sys||"Você é J.A.R.V.I.S, assistente pessoal de Wanderson Cruz. Founder UPMIND + Diretor Marketing CentroMed, Crateús-CE. Direto, inteligente, sem enrolação. Português brasileiro.";
  try{
    const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system,messages})});
    if(res.ok){const d=await res.json();return d.text||"Sem resposta.";}
  }catch{}
  return "J.A.R.V.I.S offline.";
}

const NAV=[
  {id:"home",   label:"Início",  icon:"⌂"},
  {id:"rotina", label:"Rotina",  icon:"◷"},
  {id:"tarefas",label:"Tarefas", icon:"☑"},
  {id:"metas",  label:"Metas",   icon:"◎"},
  {id:"jarvis", label:"IA",      icon:"◈"},
];

// ════════════════════════════════════════════════════════════════
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

  function toast2(msg,err=false){setToast({msg,err});setTimeout(()=>setToast(null),2400);}

  async function toggleCheck(id){
    const val=!checked[id];setChecked(p=>({...p,[id]:val}));
    const rid=`${today}_${id}`;
    if(val)await sb("rotina_check","POST",{id:rid,date:today,item_id:id,checked:true});
    else await sb(`rotina_check?id=eq.${rid}`,"DELETE");
  }

  async function addTarefa(data){
    const n={id:Date.now().toString(),date:today,done:false,reminded:false,...data,created_at:new Date().toISOString()};
    const r=await sb("tarefas","POST",n);
    if(r){setTarefas(p=>[r[0]||n,...p]);toast2("Tarefa criada");}
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
    if(r){setMetas(p=>[r[0]||n,...p]);toast2("Meta criada");}
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
    if(r){setSubmetas(p=>[...p,r[0]||n]);toast2("Submeta criada");}
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
    if(r){setNotas(p=>[r[0]||n,...p]);toast2("Nota salva");}
  }
  async function convertNota(nota){
    try{
      const reply=await askAI([{role:"user",content:`Analise e retorne APENAS JSON: {"tipo":"tarefa|meta","title":"...","note":"...","tag":"UPMIND","cat":"UPMIND","target":100,"objetivo":"..."}\nAnotação: "${nota.texto}"`}]);
      const d=JSON.parse(reply.replace(/```json|```/g,"").trim());
      if(d.tipo==="meta")await addMeta({title:d.title,descricao:d.note||"",cat:d.cat||"UPMIND",tipo:"Mensal",target:d.target||100,objetivo:d.objetivo||""});
      else await addTarefa({title:d.title,note:d.note||"",tag:d.tag||"UPMIND",reminder_time:""});
      await sb(`notas?id=eq.${nota.id}`,"PATCH",{converted:true});
      setNotas(p=>p.map(n=>n.id===nota.id?{...n,converted:true}:n));
      toast2("Convertido com sucesso");
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
    <div style={{maxWidth:430,margin:"0 auto",height:"100dvh",background:"#0f0f10",color:"#f5f5f5",fontFamily:"-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",display:"flex",flexDirection:"column",position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",overflow:"hidden"}}>

      {/* HEADER */}
      <div style={{padding:"12px 16px 10px",borderBottom:"1px solid #1c1c1e",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:"#6b6b6b",marginBottom:2,textTransform:"capitalize"}}>{fmtDate(now)}</div>
            <div style={{fontSize:17,fontWeight:600,color:"#f5f5f5",lineHeight:1.2}}>
              {current?`${current.icon} ${current.label}`:`Olá, Wanderson`}
            </div>
          </div>
          {/* Progress ring */}
          <div style={{position:"relative",width:48,height:48,flexShrink:0}}>
            <svg width="48" height="48" style={{transform:"rotate(-90deg)"}}>
              <circle cx="24" cy="24" r="20" fill="none" stroke="#1c1c1e" strokeWidth="3"/>
              <circle cx="24" cy="24" r="20" fill="none"
                stroke={progress>=80?"#4ade80":progress>=40?"#a78bfa":"#60a5fa"}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={2*Math.PI*20}
                strokeDashoffset={2*Math.PI*20-(progress/100)*2*Math.PI*20}
                style={{transition:"stroke-dashoffset .5s ease"}}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#f5f5f5",lineHeight:1}}>{progress}%</div>
            </div>
          </div>
        </div>
        {nextItem&&(
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,padding:"6px 10px",background:"#1c1c1e",borderRadius:8}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:CAT_COLOR[nextItem.cat]||"#a78bfa",flexShrink:0}}/>
            <span style={{fontSize:11,color:"#9b9b9b"}}>Próximo {nextItem.time}</span>
            <span style={{fontSize:11,color:"#f5f5f5",fontWeight:500}}>{nextItem.label}</span>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{flex:1,overflowY:"scroll",overflowX:"hidden",WebkitOverflowScrolling:"touch",paddingBottom:"calc(70px + env(safe-area-inset-bottom,0px))",minHeight:0}}>
        {loading&&<Loader/>}
        {!loading&&tab==="home"    &&<HomeTab    {...shared} setTab={setTab}/>}
        {!loading&&tab==="rotina"  &&<RotinaTab  {...shared}/>}
        {!loading&&tab==="tarefas" &&<TarefasTab {...shared}/>}
        {!loading&&tab==="metas"   &&<MetasTab   {...shared}/>}
        {!loading&&tab==="jarvis"  &&<JarvisTab  {...shared}/>}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(15,15,16,.97)",backdropFilter:"blur(12px)",borderTop:"1px solid #1c1c1e",padding:"6px 0 max(6px,env(safe-area-inset-bottom))",display:"flex",zIndex:100}}>
        {NAV.map(n=>{
          const a=tab===n.id;
          return(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"4px 0",color:a?"#a78bfa":"#4b4b4b",transition:"color .2s"}}>
              <span style={{fontSize:18,lineHeight:1}}>{n.icon}</span>
              <span style={{fontSize:9,fontWeight:a?600:400}}>{n.label}</span>
            </button>
          );
        })}
      </div>

      {toast&&(
        <div style={{position:"fixed",top:56,left:"50%",transform:"translateX(-50%)",background:toast.err?"#2a1a1a":"#1c1c1e",border:`1px solid ${toast.err?"#7f1d1d":"#2c2c2e"}`,color:toast.err?"#fca5a5":"#f5f5f5",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:500,zIndex:999,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,.4)",animation:"tin .2s ease"}}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(-6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes fin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        html,body{height:100%;overflow:hidden;position:fixed;width:100%;background:#0f0f10}
        body{overscroll-behavior:none}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{display:none}
        input,select,textarea{font-size:16px!important;-webkit-appearance:none}
        input[type=time],input[type=date]{color-scheme:dark}
        ::placeholder{color:#4b4b4b!important}
      `}</style>
    </div>
  );
}

// ── LOADER ──────────────────────────────────────────────────────
function Loader(){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"50vh"}}>
      <div style={{width:24,height:24,border:"2px solid #2c2c2e",borderTop:"2px solid #a78bfa",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
    </div>
  );
}

// ── SHARED PRIMITIVES ───────────────────────────────────────────
function Inp({style,...p}){
  return <input style={{width:"100%",background:"#1c1c1e",border:"none",borderRadius:8,padding:"10px 12px",color:"#f5f5f5",fontSize:16,outline:"none",display:"block",...style}} {...p}/>;
}
function Sel({style,children,...p}){
  return <select style={{width:"100%",background:"#1c1c1e",border:"none",borderRadius:8,padding:"10px 12px",color:"#f5f5f5",fontSize:16,outline:"none",display:"block",...style}} {...p}>{children}</select>;
}
function Btn({children,onClick,color,ghost,small,style,disabled}){
  const c=color||"#a78bfa";
  return(
    <button onClick={onClick} disabled={disabled} style={{background:ghost?"transparent":c,color:ghost?c:"#000",border:ghost?`1px solid ${c}33`:"none",borderRadius:8,padding:small?"6px 12px":"10px 18px",fontSize:small?11:13,fontWeight:600,cursor:disabled?"default":"pointer",opacity:disabled?.4:1,transition:"opacity .2s",...style}}>
      {children}
    </button>
  );
}
function Tag({children,color}){
  return <span style={{fontSize:10,fontWeight:500,padding:"2px 7px",borderRadius:4,background:`${color}18`,color}}>{children}</span>;
}
function Bar({pct,color,h=4}){
  return(
    <div style={{height:h,background:"#2c2c2e",borderRadius:99,overflow:"hidden"}}>
      <div style={{height:h,borderRadius:99,width:`${Math.min(pct,100)}%`,background:color||"#a78bfa",transition:"width .6s ease"}}/>
    </div>
  );
}
function Div(){return <div style={{height:1,background:"#1c1c1e",margin:"4px 0"}}/>;}
function SecLabel({children}){return <div style={{fontSize:11,fontWeight:600,color:"#6b6b6b",textTransform:"uppercase",letterSpacing:".06em",padding:"16px 16px 8px"}}>{children}</div>;}
function Empty({text}){return <div style={{textAlign:"center",padding:"40px 16px",fontSize:13,color:"#4b4b4b"}}>{text}</div>;}

// ════════════════════════════════════════════════════════════════
// HOME
// ════════════════════════════════════════════════════════════════
function HomeTab({setTab,tarefas,metas,checked,progress,done,current,nextItem,now}){
  const pend=tarefas.filter(t=>!t.done).length;
  const avgM=metas.length?Math.round(metas.reduce((s,m)=>s+(Number(m.current_val)/Math.max(Number(m.target),1))*100,0)/metas.length):0;
  const h=now.getHours();
  const greet=h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";

  return(
    <div style={{animation:"fin .25s ease"}}>
      <div style={{padding:"16px 16px 8px"}}>
        <div style={{fontSize:22,fontWeight:700,color:"#f5f5f5",marginBottom:2}}>{greet} 👋</div>
        <div style={{fontSize:13,color:"#6b6b6b"}}>Quarta-feira, 21 de maio</div>
      </div>

      {/* 4 stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:"#1c1c1e",border:"1px solid #1c1c1e",borderRadius:12,margin:"12px 16px",overflow:"hidden"}}>
        {[
          {l:"Rotina",    v:`${done}/${ROUTINE.length}`,sub:`${progress}%`,  c:"#a78bfa",tab:"rotina"},
          {l:"Tarefas",   v:pend,              sub:"pendentes",              c:"#facc15",tab:"tarefas"},
          {l:"Metas",     v:metas.filter(m=>!m.done).length,sub:`${avgM}% médio`,c:"#4ade80",tab:"metas"},
          {l:"J.A.R.V.I.S",v:"Online",         sub:"pronto",                 c:"#60a5fa",tab:"jarvis"},
        ].map((s,i)=>(
          <button key={s.l} onClick={()=>setTab(s.tab)} style={{background:"#0f0f10",border:"none",cursor:"pointer",padding:"14px 14px",textAlign:"left",transition:"background .2s"}}>
            <div style={{fontSize:11,color:"#6b6b6b",marginBottom:4,fontWeight:500}}>{s.l}</div>
            <div style={{fontSize:20,fontWeight:700,color:s.c,lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:11,color:"#4b4b4b",marginTop:3}}>{s.sub}</div>
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{padding:"0 16px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:12,color:"#6b6b6b"}}>Progresso do dia</span>
          <span style={{fontSize:12,fontWeight:600,color:"#f5f5f5"}}>{progress}%</span>
        </div>
        <Bar pct={progress} color={progress>=80?"#4ade80":progress>=40?"#a78bfa":"#60a5fa"} h={6}/>
      </div>

      {/* Next */}
      {nextItem&&(
        <>
          <SecLabel>Próxima missão</SecLabel>
          <div onClick={()=>setTab("rotina")} style={{margin:"0 16px",padding:"12px 14px",background:"#1c1c1e",borderRadius:10,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
            <div style={{width:38,height:38,borderRadius:9,background:`${CAT_COLOR[nextItem.cat]||"#a78bfa"}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{nextItem.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:500,color:"#f5f5f5"}}>{nextItem.label}</div>
              <div style={{fontSize:11,color:"#6b6b6b",marginTop:1}}>{nextItem.time} · {nextItem.desc.substring(0,40)}...</div>
            </div>
            <span style={{fontSize:10,color:CAT_COLOR[nextItem.cat]||"#a78bfa",fontWeight:500}}>{nextItem.cat}</span>
          </div>
        </>
      )}

      {/* Pending tasks preview */}
      {pend>0&&(
        <>
          <SecLabel>Tarefas de hoje</SecLabel>
          <div style={{margin:"0 16px",background:"#1c1c1e",borderRadius:10,overflow:"hidden"}}>
            {tarefas.filter(t=>!t.done).slice(0,4).map((t,i,arr)=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderBottom:i<arr.length-1?"1px solid #2c2c2e":"none"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:TAG_COLORS[t.tag]||"#a78bfa",flexShrink:0}}/>
                <span style={{fontSize:13,color:"#e5e5e5",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</span>
                {t.reminder_time&&<span style={{fontSize:10,color:"#4b4b4b"}}>{t.reminder_time}</span>}
              </div>
            ))}
            {pend>4&&<div onClick={()=>setTab("tarefas")} style={{padding:"10px 14px",fontSize:12,color:"#a78bfa",cursor:"pointer",textAlign:"center"}}>Ver todas ({pend}) →</div>}
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
      {/* Cat filter */}
      <div style={{display:"flex",gap:6,overflowX:"auto",padding:"12px 16px 8px",scrollbarWidth:"none"}}>
        {cats.map(c=>{
          const a=selCat===c;
          const cc=CAT_COLOR[c];
          return(
            <button key={c} onClick={()=>setSelCat(c)} style={{fontSize:11,fontWeight:500,padding:"5px 12px",borderRadius:20,whiteSpace:"nowrap",flexShrink:0,background:a?`${cc}18`:"#1c1c1e",color:a?cc:"#6b6b6b",border:"none",cursor:"pointer",transition:"all .2s"}}>
              {c}
            </button>
          );
        })}
      </div>

      <div style={{margin:"0 16px",background:"#1c1c1e",borderRadius:10,overflow:"hidden"}}>
        {list.map((item,i)=>{
          const ck=!!checked[item.id];
          const cc=CAT_COLOR[item.cat]||"#a78bfa";
          const nm=new Date().getHours()*60+new Date().getMinutes();
          const next=ROUTINE[ROUTINE.indexOf(item)+1];
          const isNow=nm>=t2m(item.time)&&(!next||nm<t2m(next.time))&&!ck;
          return(
            <div key={item.id} onClick={()=>toggleCheck(item.id)} style={{
              display:"flex",alignItems:"center",gap:12,padding:"11px 14px",
              borderBottom:i<list.length-1?"1px solid #2c2c2e":"none",
              cursor:"pointer",background:isNow?"rgba(167,139,250,.06)":"transparent",
              opacity:ck?.4:1,transition:"opacity .2s"
            }}>
              {/* Check */}
              <div style={{width:20,height:20,borderRadius:6,flexShrink:0,background:ck?cc:"transparent",border:`1.5px solid ${ck?cc:"#3c3c3e"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>
                {ck&&<svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" style={{width:11,height:11}}><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span style={{fontSize:16,flexShrink:0}}>{item.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:isNow?600:400,color:ck?"#4b4b4b":"#f5f5f5",textDecoration:ck?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</div>
                <div style={{fontSize:10,color:"#4b4b4b",marginTop:1}}>{item.time} · {item.desc.substring(0,36)}...</div>
              </div>
              {isNow&&<div style={{width:6,height:6,borderRadius:"50%",background:cc,flexShrink:0}}/>}
              <span style={{fontSize:10,color:cc,fontWeight:500,flexShrink:0}}>{item.cat}</span>
            </div>
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
      {/* Stats */}
      <div style={{display:"flex",gap:1,background:"#1c1c1e",margin:"12px 16px",borderRadius:10,overflow:"hidden"}}>
        {[{l:"Total",v:tarefas.length},{l:"Pendentes",v:pend.length},{l:"Feitas",v:done.length}].map(s=>(
          <div key={s.l} style={{flex:1,padding:"10px 12px",background:"#0f0f10",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:700,color:"#f5f5f5"}}>{s.v}</div>
            <div style={{fontSize:10,color:"#6b6b6b",marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {open&&(
        <div style={{margin:"0 16px 12px",background:"#1c1c1e",borderRadius:10,padding:14,animation:"fin .2s ease"}}>
          <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Título da tarefa..." autoFocus/>
          <Inp value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Observação..." style={{marginTop:6}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>
            <Sel value={form.tag} onChange={e=>setForm(f=>({...f,tag:e.target.value}))}>
              {Object.keys(TAG_COLORS).map(k=><option key={k}>{k}</option>)}
            </Sel>
            <Inp type="time" value={form.reminder_time} onChange={e=>setForm(f=>({...f,reminder_time:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:6,marginTop:10}}>
            <Btn onClick={add} style={{flex:1}}>Adicionar</Btn>
            <Btn ghost onClick={()=>setOpen(false)} style={{flex:1}}>Cancelar</Btn>
          </div>
        </div>
      )}

      {/* List */}
      {pend.length===0&&!open&&<Empty text="Nenhuma tarefa pendente"/>}
      {pend.length>0&&(
        <div style={{margin:"0 16px",background:"#1c1c1e",borderRadius:10,overflow:"hidden"}}>
          {pend.map((t,i)=><TRow key={t.id} t={t} onToggle={toggleTarefa} onRemove={removeTarefa} last={i===pend.length-1}/>)}
        </div>
      )}

      {done.length>0&&(
        <>
          <SecLabel>Concluídas ({done.length})</SecLabel>
          <div style={{margin:"0 16px",background:"#1c1c1e",borderRadius:10,overflow:"hidden"}}>
            {done.map((t,i)=><TRow key={t.id} t={t} onToggle={toggleTarefa} onRemove={removeTarefa} last={i===done.length-1}/>)}
          </div>
        </>
      )}

      {/* FAB */}
      {!open&&(
        <button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:"calc(70px + env(safe-area-inset-bottom,0px) + 14px)",right:16,width:44,height:44,borderRadius:13,background:"#a78bfa",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 12px rgba(167,139,250,.4)",zIndex:50}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{width:20,height:20}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}
    </div>
  );
}

function TRow({t,onToggle,onRemove,last}){
  const c=TAG_COLORS[t.tag]||"#a78bfa";
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderBottom:last?"none":"1px solid #2c2c2e",opacity:t.done?.4:1}}>
      <div onClick={()=>onToggle(t.id)} style={{width:20,height:20,borderRadius:6,flexShrink:0,background:t.done?c:"transparent",border:`1.5px solid ${t.done?c:"#3c3c3e"}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s"}}>
        {t.done&&<svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" style={{width:11,height:11}}><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,color:t.done?"#4b4b4b":"#f5f5f5",textDecoration:t.done?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div>
        {t.note&&<div style={{fontSize:11,color:"#6b6b6b",marginTop:1}}>{t.note}</div>}
        <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
          <Tag color={c}>{t.tag}</Tag>
          {t.reminder_time&&<span style={{fontSize:10,color:"#6b6b6b"}}>⏰ {t.reminder_time}</span>}
        </div>
      </div>
      <button onClick={()=>onRemove(t.id)} style={{background:"none",border:"none",color:"#3c3c3e",cursor:"pointer",fontSize:18,padding:0,lineHeight:1}}>×</button>
    </div>
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
      {/* Stats */}
      <div style={{display:"flex",gap:1,background:"#1c1c1e",margin:"12px 16px",borderRadius:10,overflow:"hidden"}}>
        {[{l:"Total",v:metas.length},{l:"Ativas",v:metas.filter(m=>!m.done).length},{l:"Média",v:avg+"%"}].map(s=>(
          <div key={s.l} style={{flex:1,padding:"10px 12px",background:"#0f0f10",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:700,color:"#f5f5f5"}}>{s.v}</div>
            <div style={{fontSize:10,color:"#6b6b6b",marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Cat filter */}
      <div style={{display:"flex",gap:6,overflowX:"auto",padding:"0 16px 10px",scrollbarWidth:"none"}}>
        {cats.map(c=>{
          const a=selCat===c;
          const cc=META_COLORS[c]||"#a78bfa";
          return(
            <button key={c} onClick={()=>setSelCat(c)} style={{fontSize:11,fontWeight:500,padding:"5px 12px",borderRadius:20,whiteSpace:"nowrap",flexShrink:0,background:a?`${cc}18`:"#1c1c1e",color:a?cc:"#6b6b6b",border:"none",cursor:"pointer",transition:"all .2s"}}>
              {META_ICONS[c]||""} {c}
            </button>
          );
        })}
      </div>

      {/* Form */}
      {open&&(
        <div style={{margin:"0 16px 12px",background:"#1c1c1e",borderRadius:10,padding:14,animation:"fin .2s ease"}}>
          <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Meta (ex: Ler 12 livros em 2026)..." autoFocus/>
          <Inp value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Como vai medir..." style={{marginTop:6}}/>
          <Inp value={form.objetivo} onChange={e=>setForm(f=>({...f,objetivo:e.target.value}))} placeholder="Por que isso importa..." style={{marginTop:6}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>
            <Sel value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>{META_CATS.map(c=><option key={c}>{c}</option>)}</Sel>
            <Sel value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>{["Diária","Semanal","Mensal","Trimestral","Anual"].map(t=><option key={t}>{t}</option>)}</Sel>
            <Inp type="number" value={form.target} onChange={e=>setForm(f=>({...f,target:Number(e.target.value)}))} placeholder="Meta (número)"/>
            <Inp type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:6,marginTop:10}}>
            <Btn onClick={add} color="#4ade80" style={{flex:1}}>Criar meta</Btn>
            <Btn ghost color="#4ade80" onClick={()=>setOpen(false)} style={{flex:1}}>Cancelar</Btn>
          </div>
        </div>
      )}

      {/* Grid 2 cols */}
      {pend.length===0&&selCat==="Todas"&&!open&&<Empty text="Nenhuma meta registrada"/>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,margin:"0 16px"}}>
        {pend.map((m,i)=>(
          <MetaCard key={m.id} m={m} onPress={()=>setDetail(m)} onProgress={updateMetaProgress} onRemove={removeMeta}
            subCount={submetas.filter(s=>s.meta_id===m.id).length}
            subDone={submetas.filter(s=>s.meta_id===m.id&&s.done).length}/>
        ))}
      </div>

      {done.length>0&&(
        <>
          <SecLabel>Concluídas ({done.length})</SecLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,margin:"0 16px"}}>
            {done.map((m,i)=>(
              <MetaCard key={m.id} m={m} onPress={()=>setDetail(m)} onProgress={updateMetaProgress} onRemove={removeMeta}
                subCount={submetas.filter(s=>s.meta_id===m.id).length}
                subDone={submetas.filter(s=>s.meta_id===m.id&&s.done).length}/>
            ))}
          </div>
        </>
      )}

      {/* FAB */}
      {!open&&(
        <button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:"calc(70px + env(safe-area-inset-bottom,0px) + 14px)",right:16,width:44,height:44,borderRadius:13,background:"#4ade80",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 12px rgba(74,222,128,.35)",zIndex:50}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" style={{width:20,height:20}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}
    </div>
  );
}

function MetaCard({m,onPress,onProgress,onRemove,subCount,subDone}){
  const c=META_COLORS[m.cat]||"#a78bfa";
  const pct=Math.round((Number(m.current_val)/Math.max(Number(m.target),1))*100);
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(m.current_val);

  return(
    <div style={{background:"#1c1c1e",borderRadius:12,overflow:"hidden",opacity:m.done?.5:1}}>
      <div onClick={onPress} style={{padding:"14px 12px 10px",cursor:"pointer",position:"relative"}}>
        <button onClick={e=>{e.stopPropagation();onRemove(m.id);}} style={{position:"absolute",top:8,right:8,background:"none",border:"none",color:"#3c3c3e",cursor:"pointer",fontSize:14,padding:0,lineHeight:1}}>×</button>
        <div style={{fontSize:28,marginBottom:8,filter:`drop-shadow(0 0 6px ${c}44)`}}>{META_ICONS[m.cat]||"🎯"}</div>
        <div style={{fontSize:12,fontWeight:600,color:m.done?"#4b4b4b":"#f5f5f5",lineHeight:1.3,marginBottom:8,textDecoration:m.done?"line-through":"none",paddingRight:16}}>{m.title}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
          <span style={{fontSize:10,color:"#6b6b6b"}}>{m.current_val}/{m.target}</span>
          <span style={{fontSize:12,fontWeight:700,color:pct>=100?"#4ade80":c}}>{pct}%</span>
        </div>
        <Bar pct={pct} color={pct>=100?"#4ade80":c} h={3}/>
        {subCount>0&&<div style={{fontSize:9,color:"#6b6b6b",marginTop:5}}>{subDone}/{subCount} submetas</div>}
      </div>
      <div style={{padding:"0 12px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Tag color={c}>{m.cat}</Tag>
        {!m.done&&(
          editing?(
            <div style={{display:"flex",gap:4,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
              <Inp type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:56,padding:"4px 8px",fontSize:13}}/>
              <Btn small color={c} onClick={()=>{onProgress(m.id,val);setEditing(false);}}>✓</Btn>
            </div>
          ):(
            <button onClick={e=>{e.stopPropagation();setVal(m.current_val);setEditing(true);}} style={{fontSize:11,background:"none",border:"none",color:"#6b6b6b",cursor:"pointer",padding:0}}>+ atualizar</button>
          )
        )}
      </div>
    </div>
  );
}

// ── META DETAIL ─────────────────────────────────────────────────
function MetaDetail({meta,onBack,onProgress,onRemove,submetas,addSubmeta,updateSubmeta,toggleSubmeta,removeSubmeta}){
  const c=META_COLORS[meta.cat]||"#a78bfa";
  const pct=Math.round((Number(meta.current_val)/Math.max(Number(meta.target),1))*100);
  const [val,setVal]=useState(meta.current_val);
  const [editing,setEditing]=useState(false);
  const [openSub,setOpenSub]=useState(false);
  const [sub,setSub]=useState({title:"",descricao:"",target:1,unidade:"un"});

  const addSub=async()=>{
    if(!sub.title.trim())return;
    await addSubmeta(meta.id,sub);
    setSub({title:"",descricao:"",target:1,unidade:"un"});
    setOpenSub(false);
  };

  const subDone=submetas.filter(s=>s.done);
  const subPend=submetas.filter(s=>!s.done);

  return(
    <div style={{animation:"fin .25s ease"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",color:"#a78bfa",cursor:"pointer",fontSize:13,padding:"12px 16px 0",fontWeight:500}}>
        ← Voltar
      </button>

      {/* Header */}
      <div style={{padding:"12px 16px 0"}}>
        <div style={{fontSize:32,marginBottom:6}}>{META_ICONS[meta.cat]||"🎯"}</div>
        <div style={{fontSize:20,fontWeight:700,color:"#f5f5f5",marginBottom:4}}>{meta.title}</div>
        {meta.descricao&&<div style={{fontSize:13,color:"#6b6b6b",marginBottom:8}}>{meta.descricao}</div>}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <Tag color={c}>{meta.cat}</Tag>
          <Tag color="#6b6b6b">{meta.tipo}</Tag>
          {meta.prazo&&<Tag color="#6b6b6b">até {fmtShort(meta.prazo)}</Tag>}
        </div>
      </div>

      {/* Progress */}
      <div style={{margin:"14px 16px",background:"#1c1c1e",borderRadius:12,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:32,fontWeight:800,color:pct>=100?"#4ade80":c,lineHeight:1}}>{pct}%</div>
            <div style={{fontSize:11,color:"#6b6b6b",marginTop:2}}>{meta.current_val} de {meta.target}</div>
          </div>
          {!meta.done&&(
            editing?(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <Inp type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:80}}/>
                <Btn color={c} onClick={()=>{onProgress(meta.id,val);setEditing(false);}}>✓</Btn>
              </div>
            ):(
              <Btn color={c} onClick={()=>{setVal(meta.current_val);setEditing(true);}}>Atualizar</Btn>
            )
          )}
        </div>
        <Bar pct={pct} color={pct>=100?"#4ade80":c} h={8}/>
        {submetas.length>0&&<div style={{fontSize:11,color:"#6b6b6b",marginTop:8}}>{subDone.length}/{submetas.length} submetas concluídas</div>}
      </div>

      {/* Objetivo */}
      {meta.objetivo&&(
        <div style={{margin:"0 16px 12px",background:"#1c1c1e",borderRadius:12,padding:14}}>
          <div style={{fontSize:11,fontWeight:600,color:"#6b6b6b",marginBottom:6}}>POR QUE ISSO IMPORTA</div>
          <div style={{fontSize:13,color:"#d4d4d4",lineHeight:1.6}}>{meta.objetivo}</div>
        </div>
      )}

      {/* Submetas */}
      <div style={{margin:"0 16px 12px",background:"#1c1c1e",borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:submetas.length>0||openSub?"1px solid #2c2c2e":"none"}}>
          <div style={{fontSize:13,fontWeight:600,color:"#f5f5f5"}}>Submetas {submetas.length>0&&`(${submetas.length})`}</div>
          <button onClick={()=>setOpenSub(o=>!o)} style={{fontSize:12,color:"#a78bfa",background:"none",border:"none",cursor:"pointer",fontWeight:500}}>
            {openSub?"Cancelar":"+ Nova"}
          </button>
        </div>

        {openSub&&(
          <div style={{padding:"12px 14px",borderBottom:"1px solid #2c2c2e"}}>
            <Inp value={sub.title} onChange={e=>setSub(f=>({...f,title:e.target.value}))} placeholder="Ex: Janeiro — Livro X..." autoFocus/>
            <Inp value={sub.descricao} onChange={e=>setSub(f=>({...f,descricao:e.target.value}))} placeholder="Detalhes..." style={{marginTop:6}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>
              <Inp type="number" value={sub.target} onChange={e=>setSub(f=>({...f,target:Number(e.target.value)}))} placeholder="Meta"/>
              <Inp value={sub.unidade} onChange={e=>setSub(f=>({...f,unidade:e.target.value}))} placeholder="livros, R$, km..."/>
            </div>
            <Btn onClick={addSub} color="#a78bfa" style={{marginTop:10,width:"100%"}}>Criar submeta</Btn>
          </div>
        )}

        {submetas.length===0&&!openSub&&(
          <div style={{padding:"14px",fontSize:12,color:"#4b4b4b",textAlign:"center"}}>Nenhuma submeta — quebre em partes menores</div>
        )}

        {subPend.map((s,i)=><SubRow key={s.id} s={s} c={c} onToggle={toggleSubmeta} onUpdate={updateSubmeta} onRemove={removeSubmeta} last={i===subPend.length-1&&subDone.length===0}/>)}

        {subDone.length>0&&(
          <>
            <div style={{padding:"8px 14px",fontSize:10,fontWeight:600,color:"#6b6b6b",background:"transparent"}}>CONCLUÍDAS ({subDone.length})</div>
            {subDone.map((s,i)=><SubRow key={s.id} s={s} c={c} onToggle={toggleSubmeta} onUpdate={updateSubmeta} onRemove={removeSubmeta} last={i===subDone.length-1}/>)}
          </>
        )}
      </div>

      {/* Info */}
      <div style={{margin:"0 16px",background:"#1c1c1e",borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,color:"#6b6b6b",marginBottom:8}}>DETALHES</div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #2c2c2e"}}>
          <span style={{fontSize:12,color:"#6b6b6b"}}>Criada</span>
          <span style={{fontSize:12,color:"#d4d4d4"}}>{fmtDT(meta.created_at)}</span>
        </div>
        {meta.done_at&&(
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
            <span style={{fontSize:12,color:"#6b6b6b"}}>Concluída</span>
            <span style={{fontSize:12,color:"#4ade80"}}>{fmtDT(meta.done_at)}</span>
          </div>
        )}
      </div>

      <button onClick={()=>{onRemove(meta.id);onBack();}} style={{width:"calc(100% - 32px)",margin:"0 16px 20px",padding:12,borderRadius:10,background:"transparent",border:"1px solid #3c1c1c",color:"#f87171",fontSize:13,cursor:"pointer"}}>
        Remover meta
      </button>
    </div>
  );
}

function SubRow({s,c,onToggle,onUpdate,onRemove,last}){
  const pct=Math.round((Number(s.current_val)/Math.max(Number(s.target),1))*100);
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(s.current_val);

  return(
    <div style={{borderBottom:last?"none":"1px solid #2c2c2e",padding:"10px 14px",opacity:s.done?.45:1}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div onClick={()=>onToggle(s.id)} style={{width:18,height:18,borderRadius:5,flexShrink:0,marginTop:1,background:s.done?c:"transparent",border:`1.5px solid ${s.done?c:"#3c3c3e"}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s"}}>
          {s.done&&<svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" style={{width:10,height:10}}><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,color:s.done?"#4b4b4b":"#f5f5f5",textDecoration:s.done?"line-through":"none"}}>{s.title}</div>
          {s.descricao&&<div style={{fontSize:11,color:"#6b6b6b",marginTop:1}}>{s.descricao}</div>}
          {Number(s.target)>1&&(
            <div style={{marginTop:6}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:10,color:"#6b6b6b"}}>{s.current_val}/{s.target} {s.unidade}</span>
                <span style={{fontSize:11,fontWeight:600,color:pct>=100?"#4ade80":c}}>{pct}%</span>
              </div>
              <Bar pct={pct} color={pct>=100?"#4ade80":c} h={3}/>
            </div>
          )}
          {!s.done&&Number(s.target)>1&&(
            <div style={{marginTop:7,display:"flex",gap:5,alignItems:"center"}}>
              {editing?(
                <><Inp type="number" value={val} onChange={e=>setVal(e.target.value)} style={{width:70,padding:"4px 8px",fontSize:13}}/>
                <Btn small color={c} onClick={()=>{onUpdate(s.id,val);setEditing(false);}}>✓</Btn>
                <Btn small ghost color="#6b6b6b" onClick={()=>setEditing(false)}>×</Btn></>
              ):(
                <button onClick={()=>{setVal(s.current_val);setEditing(true);}} style={{fontSize:11,background:"none",border:"none",color:"#6b6b6b",cursor:"pointer",padding:0}}>+ atualizar</button>
              )}
            </div>
          )}
        </div>
        <button onClick={()=>onRemove(s.id)} style={{background:"none",border:"none",color:"#3c3c3e",cursor:"pointer",fontSize:16,lineHeight:1,padding:0,flexShrink:0}}>×</button>
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
          if(d.tipo==="meta"){await addMeta({title:d.title||"Meta",cat:d.cat||"UPMIND",tipo:"Mensal",target:Number(d.target)||100,descricao:"",objetivo:d.objetivo||""});toast2("Meta criada por J.A.R.V.I.S");}
          else{await addTarefa({title:d.title||"Tarefa",tag:d.tag||"UPMIND",note:d.note||"",reminder_time:""});toast2("Tarefa criada por J.A.R.V.I.S");}
        }catch{}
      }
      setChat([...next,{role:"assistant",content:clean}]);
      await sb("chat_history","POST",{role:"assistant",content:clean,created_at:new Date().toISOString()});
    }catch{
      const err={role:"assistant",content:"Conexão perdida. Tente novamente."};
      setChat([...next,err]);
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
      <div style={{display:"flex",borderBottom:"1px solid #1c1c1e",flexShrink:0}}>
        {[{id:"chat",l:"Chat"},{id:"notas",l:"Notas"}].map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)} style={{flex:1,padding:"10px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:mode===m.id?600:400,color:mode===m.id?"#f5f5f5":"#6b6b6b",borderBottom:mode===m.id?"2px solid #a78bfa":"2px solid transparent",transition:"all .2s"}}>
            {m.l}
          </button>
        ))}
      </div>

      {mode==="notas"?(
        <div style={{flex:1,overflowY:"scroll",WebkitOverflowScrolling:"touch",padding:"12px 16px"}}>
          <div style={{background:"#1c1c1e",borderRadius:12,padding:14,marginBottom:12}}>
            <button onClick={rec?stopRec:startRec} style={{width:"100%",padding:"9px",borderRadius:8,marginBottom:10,cursor:"pointer",background:rec?"rgba(248,113,113,.1)":"transparent",border:`1px solid ${rec?"#f87171":"#2c2c2e"}`,color:rec?"#f87171":"#6b6b6b",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
              {rec?<><div style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",animation:"pulse 1s infinite"}}/> Parar gravação</>:<>🎙 Gravar áudio</>}
            </button>
            <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Escreva uma ideia, tarefa, lembrete... J.A.R.V.I.S converte automaticamente." rows={3} style={{width:"100%",background:"#0f0f10",border:"none",borderRadius:8,padding:"10px 12px",color:"#f5f5f5",fontSize:16,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.5}}/>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
              <Btn onClick={async()=>{if(text.trim()){await addNota(text);setText("");}}} color="#a78bfa">Salvar nota</Btn>
            </div>
          </div>

          {notas.length===0&&<Empty text="Nenhuma anotação ainda"/>}
          {notas.map((n,i)=>(
            <div key={n.id} style={{background:"#1c1c1e",borderRadius:10,padding:"11px 13px",marginBottom:6,opacity:n.converted?.5:1,borderLeft:`2px solid ${n.converted?"#4ade80":"#a78bfa"}`}}>
              <div style={{fontSize:13,color:"#d4d4d4",lineHeight:1.6,marginBottom:7}}>{n.texto}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:10,color:"#4b4b4b"}}>{fmtDT(n.created_at)}</span>
                <div style={{display:"flex",gap:6}}>
                  {n.converted?<span style={{fontSize:11,color:"#4ade80",fontWeight:500}}>✓ Convertido</span>
                    :<Btn small ghost color="#a78bfa" onClick={()=>convertNota(n)}>→ Converter</Btn>}
                  <button onClick={()=>removeNota(n.id)} style={{background:"none",border:"none",color:"#3c3c3e",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ):(
        <>
          <div style={{flex:1,overflowY:"scroll",WebkitOverflowScrolling:"touch",padding:"10px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0 10px",borderBottom:"1px solid #1c1c1e",marginBottom:8}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:"#4ade80"}}/>
              <span style={{fontSize:11,color:"#6b6b6b"}}>J.A.R.V.I.S · Claude Sonnet · Online</span>
              <button onClick={async()=>{setChat([]);await sb("chat_history?role=eq.user","DELETE");await sb("chat_history?role=eq.assistant","DELETE");}} style={{marginLeft:"auto",fontSize:11,color:"#6b6b6b",background:"none",border:"none",cursor:"pointer"}}>Limpar</button>
            </div>

            {chat.length===0&&(
              <div style={{padding:"20px 0"}}>
                <div style={{fontSize:13,color:"#6b6b6b",marginBottom:16,textAlign:"center"}}>Como posso ajudar?</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {quick.map(q=>(
                    <button key={q} onClick={()=>send(q)} style={{background:"#1c1c1e",border:"none",color:"#d4d4d4",borderRadius:10,padding:"11px 14px",cursor:"pointer",fontSize:13,textAlign:"left",transition:"background .2s"}}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chat.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:8}}>
                <div style={{maxWidth:"82%",background:m.role==="user"?"#a78bfa1a":"#1c1c1e",border:m.role==="user"?"1px solid #a78bfa33":"none",borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"10px 13px",fontSize:13,color:"#f5f5f5",lineHeight:1.65,whiteSpace:"pre-wrap"}}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading&&(
              <div style={{display:"flex",gap:4,padding:"10px 13px",background:"#1c1c1e",borderRadius:"12px 12px 12px 2px",width:"fit-content",marginBottom:8}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#4b4b4b",animation:`pulse 1.4s ${i*.18}s infinite`}}/>)}
              </div>
            )}
            <div ref={endRef}/>
          </div>

          <div style={{display:"flex",gap:8,padding:"10px 16px max(10px,env(safe-area-inset-bottom)) 16px",borderTop:"1px solid #1c1c1e",flexShrink:0}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder="Mensagem..." rows={1} style={{flex:1,background:"#1c1c1e",border:"none",borderRadius:10,padding:"10px 13px",color:"#f5f5f5",fontSize:16,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.4,maxHeight:100,overflowY:"auto"}}/>
            <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{width:40,height:40,borderRadius:10,flexShrink:0,alignSelf:"flex-end",background:loading||!input.trim()?"#1c1c1e":"#a78bfa",border:"none",cursor:loading||!input.trim()?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s"}}>
              <svg viewBox="0 0 24 24" fill="none" stroke={loading||!input.trim()?"#4b4b4b":"#fff"} strokeWidth="2" style={{width:17,height:17}}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
