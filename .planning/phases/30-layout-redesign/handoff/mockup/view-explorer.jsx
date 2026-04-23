/* global React, Sidebar, PageHeader, Ico */

const RESOURCE_TYPES = [
  {cat:'Individuals', items:[['Patient',12450],['Practitioner',820],['RelatedPerson',140]]},
  {cat:'Clinical', items:[['Encounter',38100],['Condition',48200],['Procedure',21400],['AllergyIntolerance',4120]]},
  {cat:'Diagnostics', items:[['Observation',284300],['DiagnosticReport',18400],['Specimen',5920]]},
  {cat:'Medications', items:[['MedicationStatement',31400],['MedicationRequest',22100],['Medication',8200]]},
];

const OBS_ROWS = [
  {id:'obs-881234',code:'718-7',label:'Hemoglobin',val:'13.4 g/dL',dt:'2026-04-18 09:14',patient:'Altmann, S.',status:'final'},
  {id:'obs-881235',code:'2345-7',label:'Glucose',val:'118 mg/dL',dt:'2026-04-18 09:14',patient:'Altmann, S.',status:'final'},
  {id:'obs-881240',code:'1558-6',label:'Fasting glucose',val:'102 mg/dL',dt:'2026-04-17 07:40',patient:'Becker, J.',status:'final'},
  {id:'obs-881241',code:'2093-3',label:'Cholesterol total',val:'210 mg/dL',dt:'2026-04-17 07:40',patient:'Becker, J.',status:'amended'},
  {id:'obs-881252',code:'6298-4',label:'Potassium',val:'4.1 mmol/L',dt:'2026-04-16 14:22',patient:'Demir, K.',status:'final'},
  {id:'obs-881260',code:'39156-5',label:'BMI',val:'28.4 kg/m²',dt:'2026-04-15 11:05',patient:'Fischer, L.',status:'preliminary'},
];

function ExplorerView() {
  const [activeType, setActiveType] = React.useState('Observation');
  const [activeMode, setActiveMode] = React.useState('table');
  return (
    <div style={{display:'flex',height:'100%'}}>
      <Sidebar active="explorer"/>
      {/* type sidebar */}
      <aside style={{width:248,borderRight:'1px solid var(--border)',background:'var(--panel)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'16px 14px 10px'}}>
          <div className="uppercase" style={{marginBottom:8}}>Resource types</div>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:8,top:7,color:'var(--ink-3)'}}><Ico.search size={13}/></span>
            <input className="input" placeholder="Filter types…" style={{width:'100%',paddingLeft:26,fontSize:12}}/>
          </div>
        </div>
        <div style={{overflow:'auto',flex:1,paddingBottom:12}}>
          {RESOURCE_TYPES.map(group => (
            <div key={group.cat} style={{marginBottom:4}}>
              <div style={{padding:'6px 14px',fontSize:10.5,fontWeight:600,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{group.cat}</div>
              {group.items.map(([t,n]) => {
                const on = t===activeType;
                return (
                  <button key={t} onClick={()=>setActiveType(t)} style={{
                    width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'6px 14px',fontSize:13,
                    background: on?'var(--accent-wash)':'transparent',
                    color: on?'var(--accent-2)':'var(--ink-2)',
                    fontWeight: on?600:500,
                    border:'none',cursor:'pointer',textAlign:'left',
                    borderLeft: on?'2px solid var(--accent)':'2px solid transparent'
                  }}>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:12}}>{t}</span>
                    <span className="mono tnum" style={{fontSize:11,color: on?'var(--accent-2)':'var(--ink-3)'}}>{n.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      <main style={{flex:1,padding:'24px 28px',overflow:'auto',minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--ink-3)',marginBottom:6}}>
          <span>Explorer</span><Ico.chevR size={10}/>
          <span>Diagnostics</span><Ico.chevR size={10}/>
          <span style={{color:'var(--ink)'}}>Observation</span>
        </div>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:20,marginBottom:18}}>
          <div>
            <h1 style={{margin:'0 0 4px',fontSize:22,fontWeight:600,letterSpacing:'-0.015em',fontFamily:'var(--font-mono)'}}>{activeType}</h1>
            <div style={{fontSize:13,color:'var(--ink-3)'}}>284,300 resources · 6 shown · supports <span className="mono">_include</span>, <span className="mono">_revinclude</span></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn"><Ico.link size={14}/> _include</button>
            <button className="btn"><Ico.download size={14}/> Export</button>
          </div>
        </div>

        {/* Search bar */}
        <div className="panel" style={{padding:'10px 12px',marginBottom:14,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <span style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginRight:4}}>Search</span>
          <select className="select" style={{width:140,fontSize:12}}>
            <option>code</option><option>patient</option><option>date</option><option>status</option>
          </select>
          <select className="select" style={{width:80,fontSize:12}}>
            <option>=</option><option>contains</option><option>≥</option><option>≤</option>
          </select>
          <input className="input mono" placeholder="718-7" style={{flex:'1 1 220px',fontSize:12}}/>
          <button className="btn sm"><Ico.filter size={12}/> Add filter</button>
          <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
            <span className="chip accent">code = 718-7 <Ico.x size={10}/></span>
            <span className="chip accent">status != entered-in-error <Ico.x size={10}/></span>
          </div>
        </div>

        {/* View mode switch */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{display:'inline-flex',padding:3,background:'var(--panel-2)',border:'1px solid var(--border)',borderRadius:'var(--r-md)'}}>
            {[
              {id:'table',label:'Table'},
              {id:'human',label:'Human-readable'},
              {id:'raw',label:'Clinical + raw'},
              {id:'dev',label:'Developer JSON'},
            ].map(m => (
              <button key={m.id} onClick={()=>setActiveMode(m.id)} style={{
                padding:'5px 12px',fontSize:12,fontWeight: activeMode===m.id?600:500,
                color: activeMode===m.id?'var(--ink)':'var(--ink-3)',
                background: activeMode===m.id?'var(--panel)':'transparent',
                border:'none',borderRadius:4,cursor:'pointer'
              }}>{m.label}</button>
            ))}
          </div>
          <div style={{fontSize:12,color:'var(--ink-3)'}}>Page 1 of 47,384</div>
        </div>

        {/* Results */}
        <div className="panel" style={{overflow:'hidden'}}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{width:28}}><input type="checkbox"/></th>
                <th style={{width:140}}>ID</th>
                <th style={{width:110}}>Code</th>
                <th>Display</th>
                <th>Value</th>
                <th style={{width:150}}>When</th>
                <th style={{width:150}}>Patient</th>
                <th style={{width:110}}>Status</th>
                <th style={{width:40}}></th>
              </tr>
            </thead>
            <tbody>
              {OBS_ROWS.map(r => (
                <tr key={r.id}>
                  <td><input type="checkbox"/></td>
                  <td className="mono" style={{fontSize:11.5,color:'var(--ink-3)'}}>{r.id}</td>
                  <td><span className="chip" style={{background:'var(--panel-2)',fontFamily:'var(--font-mono)',fontSize:11}}>{r.code}</span></td>
                  <td>{r.label}</td>
                  <td className="mono tnum" style={{fontWeight:500}}>{r.val}</td>
                  <td className="mono" style={{fontSize:11.5,color:'var(--ink-3)'}}>{r.dt}</td>
                  <td><a href="#" style={{color:'var(--accent-2)',textDecoration:'none',fontSize:12.5}} onClick={e=>e.preventDefault()}>{r.patient}</a></td>
                  <td>
                    <span className="chip" style={{
                      background: r.status==='final'?'var(--ok-wash)':r.status==='amended'?'var(--warn-wash)':'var(--info-wash)',
                      color: r.status==='final'?'var(--ok)':r.status==='amended'?'oklch(52% 0.14 75)':'var(--info)',
                      border:'none'
                    }}>{r.status}</span>
                  </td>
                  <td><button className="ibtn"><Ico.chevR size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderTop:'1px solid var(--border)',background:'var(--panel-2)'}}>
            <div style={{fontSize:12,color:'var(--ink-3)'}}>1–6 of 47,384 · page size 6</div>
            <div style={{display:'flex',gap:4}}>
              <button className="btn sm" disabled style={{opacity:0.5}}>← Prev</button>
              <button className="btn sm">Next →</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.ExplorerView = ExplorerView;
