/* global React, Sidebar, PageHeader, Ico */

const TIMELINE = [
  {date:'2026-04-18',cat:'lab',title:'Lab panel — CBC + metabolic',sub:'6 observations · Final',count:6,color:'var(--violet)'},
  {date:'2026-04-12',cat:'enc',title:'Outpatient visit — Endocrinology',sub:'Dr. Weber · 45 min',count:1,color:'var(--info)'},
  {date:'2026-03-22',cat:'med',title:'Metformin 500mg — refill',sub:'MedicationStatement · active',count:1,color:'var(--ok)'},
  {date:'2026-02-14',cat:'diag',title:'Diagnosis added — Type 2 Diabetes (E11.9)',sub:'Condition · confirmed',count:1,color:'var(--bad)'},
  {date:'2026-01-08',cat:'proc',title:'HbA1c measurement',sub:'Procedure · completed',count:1,color:'oklch(62% 0.14 45)'},
];

function PatientDetailView() {
  return (
    <div style={{display:'flex',height:'100%'}}>
      <Sidebar active="patients"/>
      <main style={{flex:1,padding:'28px 32px',overflow:'auto'}}>
        <div style={{fontSize:12,color:'var(--ink-3)',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
          <a href="#" onClick={e=>e.preventDefault()} style={{color:'var(--ink-3)',textDecoration:'none'}}>Patients</a>
          <Ico.chevR size={10}/>
          <span style={{color:'var(--ink)',fontFamily:'var(--font-mono)'}}>P-4820</span>
        </div>

        {/* Patient header card */}
        <div className="panel" style={{padding:'20px 24px',marginBottom:16,display:'grid',gridTemplateColumns:'auto 1fr auto',gap:24,alignItems:'center'}}>
          <div style={{
            width:64,height:64,borderRadius:12,
            background:'oklch(94% 0.04 350)',color:'oklch(50% 0.12 350)',
            display:'grid',placeItems:'center',fontSize:22,fontWeight:600
          }}>AS</div>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <h1 style={{margin:0,fontSize:22,fontWeight:600,letterSpacing:'-0.015em'}}>Altmann, Sabine</h1>
              <span className="chip" style={{background:'oklch(96% 0.025 350)',color:'oklch(50% 0.12 350)',border:'none'}}>female</span>
              <span className="chip">77 yrs</span>
            </div>
            <div style={{marginTop:6,display:'flex',alignItems:'center',gap:14,fontSize:12.5,color:'var(--ink-3)'}}>
              <span><span className="dim-2">DOB</span> <span className="mono">1948-03-14</span></span>
              <span><span className="dim-2">ID</span> <span className="mono">P-4820</span></span>
              <span><span className="dim-2">Identifier</span> <span className="mono">DE-KV|A248193211</span></span>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn"><Ico.code size={14}/> Raw JSON</button>
            <button className="btn"><Ico.link size={14}/> $everything</button>
          </div>
        </div>

        {/* Vitals strip */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:18}}>
          {[
            {l:'Resources',v:'412',s:'total'},
            {l:'Encounters',v:'28',s:'last 5 yrs'},
            {l:'Conditions',v:'7 active',s:'of 14'},
            {l:'Medications',v:'4 active',s:'of 11'},
            {l:'Time range',v:'2019 → 2026',s:'6.4 years'},
          ].map(t => (
            <div key={t.l} className="panel" style={{padding:'12px 14px'}}>
              <div className="uppercase" style={{fontSize:10}}>{t.l}</div>
              <div style={{fontSize:18,fontWeight:600,fontFamily:'var(--font-mono)',marginTop:4}}>{t.v}</div>
              <div style={{fontSize:11,color:'var(--ink-3)'}}>{t.s}</div>
            </div>
          ))}
        </div>

        {/* Tabs + MII modules */}
        <div style={{display:'flex',gap:4,marginBottom:14,padding:4,background:'var(--panel-2)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',width:'fit-content'}}>
          {['Timeline','Person','Fall','Diagnose','Prozedur','Laborbefund','Medikation','FHIR resources'].map((l,i) => (
            <button key={l} style={{
              padding:'6px 12px',fontSize:12.5,fontWeight: i===0?600:500,
              color: i===0?'var(--ink)':'var(--ink-3)',
              background: i===0?'var(--panel)':'transparent',
              border:'1px solid', borderColor: i===0?'var(--border)':'transparent',
              borderRadius: 'var(--r-sm)',cursor:'pointer'
            }}>{l}</button>
          ))}
        </div>

        {/* Timeline */}
        <div className="panel" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',background:'var(--panel-2)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:13,fontWeight:600}}>Clinical timeline</div>
            <div style={{display:'flex',gap:6}}>
              <span className="chip violet">Labs</span>
              <span className="chip info">Encounters</span>
              <span className="chip bad">Diagnoses</span>
              <span className="chip ok">Medications</span>
              <span className="chip">Procedures</span>
            </div>
          </div>
          <div style={{padding:'16px 20px'}}>
            {TIMELINE.map((e,i) => (
              <div key={i} style={{display:'grid',gridTemplateColumns:'110px 24px 1fr auto',gap:12,padding:'10px 0',borderBottom: i<TIMELINE.length-1?'1px solid var(--divider)':'none',alignItems:'center'}}>
                <div className="mono" style={{fontSize:12,color:'var(--ink-3)'}}>{e.date}</div>
                <div style={{position:'relative',height:24}}>
                  <div style={{position:'absolute',left:11,top:0,bottom:-10,width:2,background:'var(--divider)'}}/>
                  <div style={{position:'relative',width:10,height:10,marginTop:7,borderRadius:999,background:e.color,boxShadow:'0 0 0 3px var(--panel)'}}/>
                </div>
                <div>
                  <div style={{fontSize:13.5,fontWeight:500}}>{e.title}</div>
                  <div style={{fontSize:11.5,color:'var(--ink-3)'}}>{e.sub}</div>
                </div>
                <button className="btn ghost sm">Open <Ico.chevR size={12}/></button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

window.PatientDetailView = PatientDetailView;
