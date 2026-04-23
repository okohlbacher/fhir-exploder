/* global React, Sidebar, PageHeader, Ico */
// View: Dashboard — redesigned

function KpiTile({ label, value, hint, tone }) {
  const toneStyles = {
    accent: { bg: 'var(--accent-wash)', color: 'var(--accent-2)' },
    ok: { bg: 'var(--ok-wash)', color: 'var(--ok)' },
    neutral: { bg: 'var(--panel-2)', color: 'var(--ink-2)' },
  }[tone||'neutral'];
  return (
    <div className="panel" style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:8,minHeight:110}}>
      <div className="uppercase" style={{fontSize:10.5}}>{label}</div>
      <div style={{fontSize:34,fontWeight:600,letterSpacing:'-0.02em',lineHeight:1,fontFamily:'var(--font-mono)',fontFeatureSettings:'"tnum"'}}>{value}</div>
      {hint && (
        <div style={{fontSize:12,color:'var(--ink-3)',display:'flex',alignItems:'center',gap:6,marginTop:'auto'}}>
          {hint}
        </div>
      )}
    </div>
  );
}

function CategoryBar({ populated, total, color }) {
  const pct = total ? (populated/total)*100 : 0;
  return (
    <div style={{height:3,borderRadius:2,background:'var(--divider)',overflow:'hidden'}}>
      <div style={{width:`${pct}%`,height:'100%',background:color}}/>
    </div>
  );
}

const CATEGORIES = [
  {name:'Individuals', color:'var(--info)',   count:45320, pop:4, total:5,
   top:[{t:'Patient',n:12450},{t:'Practitioner',n:820},{t:'RelatedPerson',n:140},{t:'Group',n:12}]},
  {name:'Clinical',    color:'var(--bad)',    count:128040, pop:6, total:8,
   top:[{t:'Condition',n:48200},{t:'AllergyIntolerance',n:4120},{t:'Procedure',n:21400},{t:'Encounter',n:38100}]},
  {name:'Diagnostics', color:'var(--violet)', count:312005, pop:5, total:7,
   top:[{t:'Observation',n:284300},{t:'DiagnosticReport',n:18400},{t:'Specimen',n:5920},{t:'ImagingStudy',n:1890}]},
  {name:'Medications', color:'var(--ok)',     count:62180, pop:4, total:6,
   top:[{t:'MedicationStatement',n:31400},{t:'MedicationRequest',n:22100},{t:'Medication',n:8200},{t:'MedicationAdministration',n:480}]},
  {name:'Workflow',    color:'oklch(62% 0.14 45)', count:9840, pop:3, total:9,
   top:[{t:'Task',n:5400},{t:'ServiceRequest',n:4100},{t:'Appointment',n:340}]},
  {name:'Conformance', color:'var(--ink-3)',  count:820,   pop:2, total:12,
   top:[{t:'StructureDefinition',n:740},{t:'ValueSet',n:80}]},
];

const MII_MODS = [
  {key:'person',   label:'Person',       sub:'Patient',           count:12450, color:'var(--info)'},
  {key:'fall',     label:'Fall',         sub:'Encounter',         count:38100, color:'var(--violet)'},
  {key:'diag',     label:'Diagnose',     sub:'Condition',         count:48200, color:'var(--bad)'},
  {key:'proz',     label:'Prozedur',     sub:'Procedure',         count:21400, color:'oklch(62% 0.14 45)'},
  {key:'labor',    label:'Laborbefund',  sub:'Observation',       count:284300, color:'oklch(55% 0.14 200)'},
  {key:'med',      label:'Medikation',   sub:'MedicationStatement', count:31400, color:'var(--ok)'},
  {key:'consent',  label:'Consent',      sub:'Consent',           count:0,     color:'var(--ink-3)'},
];

function DashboardView() {
  return (
    <div style={{display:'flex',height:'100%'}}>
      <Sidebar active="dashboard"/>
      <main style={{flex:1,padding:'28px 32px',overflow:'auto'}}>
        <PageHeader
          title="Dashboard"
          subtitle="Overview of what's on the connected FHIR server."
          right={<>
            <span className="chip"><span className="dot" style={{background:'var(--ok)'}}/>Blaze 0.35 · R4</span>
            <button className="btn"><Ico.refresh size={14}/> Refresh counts</button>
          </>}
        />

        {/* Hero KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:14,marginBottom:24}}>
          <KpiTile label="Total resources" value="558,205"
            hint={<><span style={{color:'var(--ok)',display:'inline-flex',alignItems:'center',gap:2}}><Ico.arrowUp/>+2.1%</span> <span>past 24h</span></>} tone="accent"/>
          <KpiTile label="Resource types" value="94" hint="from CapabilityStatement"/>
          <KpiTile label="With data" value="48" hint="types containing resources"/>
          <KpiTile label="Patients" value="12,450" hint={<><Ico.users size={12}/> across 7 MII modules</>} tone="ok"/>
        </div>

        {/* Section: by Category */}
        <div style={{marginBottom:12,display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'baseline',gap:10}}>
            <h2 style={{margin:0,fontSize:15,fontWeight:600,letterSpacing:'-0.01em'}}>Data by category</h2>
            <span style={{fontSize:12,color:'var(--ink-3)'}}>6 categories with data · 94 types total</span>
          </div>
          <a href="#" style={{fontSize:12.5,color:'var(--accent-2)',textDecoration:'none'}}>View all categories →</a>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:12,marginBottom:28}}>
          {CATEGORIES.map(cat => (
            <div key={cat.name} className="panel" style={{padding:16,cursor:'pointer',transition:'box-shadow .15s'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:2}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:8,height:8,borderRadius:2,background:cat.color}}/>
                  <span style={{fontWeight:600,fontSize:13.5}}>{cat.name}</span>
                </div>
                <span style={{fontSize:11.5,color:'var(--ink-3)'}}>{cat.pop}/{cat.total}</span>
              </div>
              <div style={{fontSize:22,fontWeight:600,fontFamily:'var(--font-mono)',letterSpacing:'-0.015em',margin:'6px 0 10px'}}>
                {cat.count.toLocaleString()}
              </div>
              <CategoryBar populated={cat.pop} total={cat.total} color={cat.color}/>
              <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:4}}>
                {cat.top.map(t => (
                  <div key={t.t} style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                    <span style={{color:'var(--ink-2)'}}>{t.t}</span>
                    <span className="mono tnum" style={{color:'var(--ink-3)'}}>{t.n.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Section: by MII module */}
        <div style={{marginBottom:12,display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'baseline',gap:10}}>
            <h2 style={{margin:0,fontSize:15,fontWeight:600,letterSpacing:'-0.01em'}}>MII Core Data Set</h2>
            <span style={{fontSize:12,color:'var(--ink-3)'}}>6 of 7 modules populated</span>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:12}}>
          {MII_MODS.map(m => {
            const empty = m.count === 0;
            return (
              <div key={m.key} className="panel" style={{padding:'14px 16px',opacity: empty?0.55:1,cursor: empty?'default':'pointer'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{m.label}</div>
                    <div style={{fontSize:11,color:'var(--ink-3)',fontFamily:'var(--font-mono)'}}>{m.sub}</div>
                  </div>
                  <div style={{fontSize:20,fontWeight:600,fontFamily:'var(--font-mono)',color: empty?'var(--ink-3)':m.color}}>
                    {empty ? '—' : m.count.toLocaleString()}
                  </div>
                </div>
                {!empty && (
                  <div style={{height:2,marginTop:10,background:'var(--divider)',borderRadius:1,overflow:'hidden'}}>
                    <div style={{width: Math.min(100, m.count/3000) + '%', height:'100%', background: m.color}}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

window.DashboardView = DashboardView;
