/* global React, Sidebar, PageHeader, Ico */

const COHORTS = [
  {name:'Diabetes type 2',desc:'E11.* within 2022–2026',n:1284,criteria:3,type:'interactive',updated:'2d ago',active:true},
  {name:'Elderly hypertensives',desc:'Age ≥ 65 AND I10',n:842,criteria:2,type:'interactive',updated:'1w ago',active:false},
  {name:'Oncology FDPG Q2',desc:'MII SQ v3 import',n:318,criteria:5,type:'fdpg',updated:'3w ago',active:false},
  {name:'High-utilizer cohort',desc:'FHIRPath: Patient.where(...)',n:147,criteria:1,type:'fhirpath',updated:'Apr 12',active:false},
];

function CohortsView() {
  return (
    <div style={{display:'flex',height:'100%'}}>
      <Sidebar active="cohorts"/>
      <main style={{flex:1,padding:'28px 32px',overflow:'auto'}}>
        <PageHeader
          title="Cohorts"
          subtitle="Define patient subsets for scoped quality analysis."
          crumb={<><a href="#" onClick={e=>e.preventDefault()} style={{color:'inherit',textDecoration:'none'}}>Quality</a><Ico.chevR size={10}/><span style={{color:'var(--ink)'}}>Cohorts</span></>}
          right={<>
            <button className="btn"><Ico.download size={14}/> Import MII SQ</button>
            <button className="btn primary">+ New cohort</button>
          </>}
        />

        <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:16}}>
          {/* List */}
          <div className="panel" style={{overflow:'hidden'}}>
            <div style={{padding:'10px 14px',background:'var(--panel-2)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
              <Ico.search size={13}/>
              <input className="input" placeholder="Filter cohorts…" style={{flex:1,border:'none',background:'transparent',padding:0,height:20}}/>
              <span style={{fontSize:12,color:'var(--ink-3)'}}>{COHORTS.length} saved</span>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{width:110}}>Type</th>
                  <th style={{width:110}} className="right">Patients</th>
                  <th style={{width:110}}>Updated</th>
                  <th style={{width:40}}></th>
                </tr>
              </thead>
              <tbody>
                {COHORTS.map(c => (
                  <tr key={c.name}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{fontWeight:500}}>{c.name}</div>
                        {c.active && <span className="chip accent" style={{height:18,fontSize:10}}>active</span>}
                      </div>
                      <div style={{fontSize:11.5,color:'var(--ink-3)',fontFamily: c.type==='fhirpath'?'var(--font-mono)':'inherit'}}>{c.desc}</div>
                    </td>
                    <td>
                      <span className="chip" style={{fontSize:11,
                        background: c.type==='fhirpath'?'var(--violet-wash)':c.type==='fdpg'?'var(--info-wash)':'var(--panel-2)',
                        color: c.type==='fhirpath'?'var(--violet)':c.type==='fdpg'?'var(--info)':'var(--ink-2)',
                        border:'none'
                      }}>{c.type==='interactive'?'builder':c.type.toUpperCase()}</span>
                    </td>
                    <td className="right mono tnum" style={{fontWeight:500}}>{c.n.toLocaleString()}</td>
                    <td style={{fontSize:12,color:'var(--ink-3)'}}>{c.updated}</td>
                    <td><button className="ibtn"><Ico.more/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Builder preview */}
          <div className="panel" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'12px 14px',background:'var(--panel-2)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontWeight:600,fontSize:13}}>Builder · Diabetes type 2</div>
              <span className="chip ok"><span className="dot"/>Matches 1,284</span>
            </div>
            <div style={{padding:16,display:'flex',flexDirection:'column',gap:10}}>
              <div className="panel-inset" style={{padding:10}}>
                <div className="uppercase" style={{marginBottom:6}}>Criterion 1 · Date range</div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <input className="input" defaultValue="2022-01-01" style={{flex:1,fontSize:12}}/>
                  <span style={{color:'var(--ink-3)'}}>→</span>
                  <input className="input" defaultValue="2026-04-23" style={{flex:1,fontSize:12}}/>
                </div>
              </div>
              <div className="panel-inset" style={{padding:10}}>
                <div className="uppercase" style={{marginBottom:6}}>Criterion 2 · Condition code</div>
                <input className="input mono" defaultValue="E11*" style={{width:'100%',fontSize:12}}/>
                <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>ICD-10 · includes all E11 subcodes</div>
              </div>
              <div className="panel-inset" style={{padding:10,border:'1px dashed var(--border-2)',background:'transparent',color:'var(--ink-3)',fontSize:12,textAlign:'center',cursor:'pointer'}}>
                + Add criterion
              </div>
              <div style={{display:'flex',gap:6,marginTop:4}}>
                <button className="btn" style={{flex:1}}>Dry-run count</button>
                <button className="btn primary" style={{flex:1}}>Save</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.CohortsView = CohortsView;
