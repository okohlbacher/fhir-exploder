/* global React, Sidebar, PageHeader, Ico */

const PATIENTS = [
  {id:'P-4820',name:'Altmann, Sabine',dob:'1948-03-14',age:77,gender:'female',range:'2019-04-12 → 2026-04-18',count:412,rangeW:0.95},
  {id:'P-4821',name:'Becker, Johannes',dob:'1962-11-02',age:63,gender:'male',range:'2020-02-10 → 2026-03-22',count:284,rangeW:0.72},
  {id:'P-4822',name:'Chaudhary, Priya',dob:'1989-07-21',age:36,gender:'female',range:'2024-09-01 → 2026-04-20',count:38,rangeW:0.18},
  {id:'P-4823',name:'Demir, Kenan',dob:'1954-01-05',age:72,gender:'male',range:'2018-06-03 → 2026-04-15',count:621,rangeW:1.0},
  {id:'P-4824',name:'Engel, Marie',dob:'1995-05-17',age:30,gender:'female',range:'2023-02-14 → 2026-04-09',count:72,rangeW:0.32},
  {id:'P-4825',name:'Fischer, Lukas',dob:'1971-08-30',age:54,gender:'male',range:'2021-01-08 → 2026-04-01',count:198,rangeW:0.58},
  {id:'P-4826',name:'Garcia-Leon, Ana',dob:'2003-12-11',age:22,gender:'female',range:'2025-10-02 → 2026-04-12',count:14,rangeW:0.08},
  {id:'P-4827',name:'Hoffmann, Werner',dob:'1938-02-26',age:88,gender:'male',range:'2017-11-20 → 2026-04-22',count:1042,rangeW:1.0},
  {id:'P-4828',name:'Ivanova, Olga',dob:'1976-06-09',age:49,gender:'female',range:'2022-05-18 → 2025-12-30',count:156,rangeW:0.42},
];

function Sparkline({ weight, color='var(--accent)' }) {
  const bars = 20;
  return (
    <div style={{display:'inline-flex',alignItems:'flex-end',gap:1.5,height:14,width:72}}>
      {Array.from({length:bars}).map((_,i) => {
        const density = Math.max(0.1, Math.sin(i*0.7)*0.35 + 0.55) * weight;
        return <span key={i} style={{width:2.5,height:`${Math.max(2, density*14)}px`,background:color,opacity: 0.25 + density*0.75, borderRadius:0.5}}/>;
      })}
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="chip accent" style={{gap:4,paddingRight:4}}>
      {label}
      <button className="ibtn" onClick={onRemove} style={{width:16,height:16,color:'inherit'}}>
        <Ico.x size={10}/>
      </button>
    </span>
  );
}

function PatientsView() {
  const [sel, setSel] = React.useState(null);
  return (
    <div style={{display:'flex',height:'100%'}}>
      <Sidebar active="patients"/>
      <main style={{flex:1,padding:'28px 32px',overflow:'auto'}}>
        <PageHeader
          title="Patients"
          subtitle="Browse patients by name, identifier, age, or gender."
          right={<>
            <span className="chip"><span className="mono tnum">12,450</span> total</span>
            <button className="btn"><Ico.download size={14}/> Export CSV</button>
          </>}
        />

        {/* Filter bar */}
        <div className="panel" style={{padding:'12px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:'1 1 300px',minWidth:260}}>
            <Ico.search size={14} />
            <input className="input" placeholder="Search by name, identifier, or ID…"
              style={{width:'100%',paddingLeft:30}}/>
            <span style={{position:'absolute',left:10,top:8,color:'var(--ink-3)'}}><Ico.search size={14}/></span>
            <kbd style={{position:'absolute',right:8,top:7}}>⌘K</kbd>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:12,color:'var(--ink-3)'}}>Age</span>
            <input className="input" placeholder="min" style={{width:52}}/>
            <span style={{color:'var(--ink-3)'}}>–</span>
            <input className="input" placeholder="max" style={{width:52}}/>
          </div>
          <select className="select">
            <option>Any gender</option><option>Male</option><option>Female</option><option>Other</option>
          </select>
          <div style={{display:'flex',gap:6,paddingLeft:8,marginLeft:'auto',borderLeft:'1px solid var(--divider)'}}>
            <button className="btn ghost"><Ico.filter size={14}/> More filters</button>
            <button className="btn primary">Search</button>
          </div>
        </div>

        {/* Active filters */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          <span style={{fontSize:12,color:'var(--ink-3)'}}>Active:</span>
          <FilterChip label="name: altmann"/>
          <FilterChip label="age ≥ 50"/>
          <FilterChip label="gender: female"/>
          <button className="btn ghost sm" style={{color:'var(--ink-3)'}}>Clear all</button>
          <span style={{marginLeft:'auto',fontSize:12,color:'var(--ink-3)'}}>
            <span className="mono tnum">9</span> of <span className="mono tnum">312</span> matches
          </span>
        </div>

        {/* Results table */}
        <div className="panel" style={{overflow:'hidden'}}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{width:34}}></th>
                <th>Patient</th>
                <th style={{width:130}}>Birth / age</th>
                <th style={{width:100}}>Gender</th>
                <th style={{width:240}}>Clinical time range</th>
                <th style={{width:130}} className="right">Resources</th>
                <th style={{width:40}}></th>
              </tr>
            </thead>
            <tbody>
              {PATIENTS.map((p,i) => (
                <tr key={p.id} onClick={()=>setSel(p.id)} style={{cursor:'pointer', background: sel===p.id?'var(--accent-wash)':'transparent'}}>
                  <td style={{color:'var(--ink-4)',fontFamily:'var(--font-mono)',fontSize:11}}>{String(i+1).padStart(2,'0')}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{
                        width:28,height:28,borderRadius:6,
                        background:p.gender==='female'?'oklch(95% 0.03 350)':'oklch(95% 0.03 240)',
                        color: p.gender==='female'?'oklch(50% 0.12 350)':'oklch(45% 0.12 240)',
                        display:'grid',placeItems:'center',fontSize:11,fontWeight:600
                      }}>{p.name.split(',')[0][0]}{p.name.split(',')[1].trim()[0]}</div>
                      <div>
                        <div style={{fontWeight:500}}>{p.name}</div>
                        <div style={{fontSize:11,color:'var(--ink-3)',fontFamily:'var(--font-mono)'}}>{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:12}}>{p.dob}</div>
                    <div style={{fontSize:11,color:'var(--ink-3)'}}>{p.age} yrs</div>
                  </td>
                  <td>
                    <span className="chip" style={{
                      background: p.gender==='female'?'oklch(96% 0.025 350)':'oklch(96% 0.025 240)',
                      color: p.gender==='female'?'oklch(50% 0.12 350)':'oklch(45% 0.12 240)',
                      border:'none'
                    }}>{p.gender}</span>
                  </td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <Sparkline weight={p.rangeW}/>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:11.5,color:'var(--ink-3)'}}>{p.range}</span>
                    </div>
                  </td>
                  <td className="right mono tnum" style={{fontWeight:500}}>{p.count.toLocaleString()}</td>
                  <td>
                    <button className="ibtn" title="View raw"><Ico.code/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* pager */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderTop:'1px solid var(--border)',background:'var(--panel-2)'}}>
            <div style={{fontSize:12,color:'var(--ink-3)'}}>Showing 1–9 of 312</div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <button className="btn sm" disabled style={{opacity:0.5}}>← Prev</button>
              <button className="btn sm">Next →</button>
              <select className="select" style={{marginLeft:8,height:26,fontSize:12}}>
                <option>20 / page</option><option>50 / page</option><option>100 / page</option>
              </select>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.PatientsView = PatientsView;
