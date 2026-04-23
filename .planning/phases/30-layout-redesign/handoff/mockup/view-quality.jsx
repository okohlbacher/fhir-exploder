/* global React, Sidebar, PageHeader, Ico */

function MetricTile({ label, pct, value, total, status, trend }) {
  const tone = status==='ok'?'ok':status==='warn'?'warn':status==='bad'?'bad':'neutral';
  const color = status==='ok'?'var(--ok)':status==='warn'?'oklch(58% 0.15 75)':status==='bad'?'var(--bad)':'var(--ink-3)';
  return (
    <div className="panel" style={{padding:14}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
        <span className="uppercase" style={{fontSize:10.5}}>{label}</span>
        {status && <span className="chip" style={{
          background: tone==='ok'?'var(--ok-wash)': tone==='warn'?'var(--warn-wash)': tone==='bad'?'var(--bad-wash)':'var(--panel-2)',
          color, border:'none', height:18, fontSize:10
        }}>{status==='ok'?'within':status==='warn'?'near':status==='bad'?'breach':'—'}</span>}
      </div>
      <div style={{display:'flex',alignItems:'baseline',gap:8}}>
        <span style={{fontSize:26,fontWeight:600,fontFamily:'var(--font-mono)',color}}>{pct}<span style={{fontSize:14,color:'var(--ink-3)'}}>%</span></span>
        {trend && <span style={{fontSize:11,color: trend>0?'var(--ok)':'var(--bad)',display:'inline-flex',alignItems:'center',gap:2}}>
          {trend>0?<Ico.arrowUp/>:<Ico.arrowDn/>}{Math.abs(trend)}pp
        </span>}
      </div>
      <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>
        <span className="mono tnum">{value.toLocaleString()}</span> / <span className="mono tnum">{total.toLocaleString()}</span>
      </div>
      <div style={{height:3,marginTop:8,background:'var(--divider)',borderRadius:2,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:color}}/>
      </div>
    </div>
  );
}

function Tab({ label, count, active }) {
  return (
    <button style={{
      padding:'8px 12px',fontSize:13,fontWeight: active?600:500,
      color: active?'var(--ink)':'var(--ink-3)',
      background: active?'var(--panel)':'transparent',
      border:'1px solid',
      borderColor: active?'var(--border)':'transparent',
      borderRadius:'var(--r-md)',
      cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6
    }}>
      {label}
      {count!=null && <span className="chip" style={{height:16,padding:'0 5px',fontSize:10,background: active?'var(--accent-wash)':'var(--panel-2)',color: active?'var(--accent-2)':'var(--ink-3)',border:'none'}}>{count}</span>}
    </button>
  );
}

const QUAL_ROWS = [
  {type:'Patient', complete:98.2, coverage:100, valid:99.5, dup:2, ref:100, issues:0, sampled:500},
  {type:'Encounter', complete:87.4, coverage:94.1, valid:96.8, dup:0, ref:99.2, issues:18, sampled:500},
  {type:'Condition', complete:72.1, coverage:88.4, valid:91.2, dup:3, ref:98.1, issues:124, sampled:500},
  {type:'Observation', complete:81.9, coverage:79.2, valid:93.0, dup:0, ref:99.8, issues:84, sampled:500},
  {type:'Procedure', complete:68.5, coverage:82.0, valid:94.1, dup:1, ref:99.4, issues:47, sampled:500},
  {type:'MedicationStatement', complete:55.2, coverage:71.4, valid:88.9, dup:4, ref:96.4, issues:220, sampled:500},
];

function pctCell(v, threshold=90) {
  const color = v>=threshold?'var(--ok)': v>=threshold-15?'oklch(58% 0.15 75)':'var(--bad)';
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <span className="mono tnum" style={{minWidth:44,fontWeight:500,color}}>{v.toFixed(1)}%</span>
      <span style={{flex:1,height:3,background:'var(--divider)',borderRadius:2,overflow:'hidden',minWidth:60}}>
        <span style={{display:'block',width:`${v}%`,height:'100%',background:color}}/>
      </span>
    </div>
  );
}

function QualityView() {
  return (
    <div style={{display:'flex',height:'100%'}}>
      <Sidebar active="quality"/>
      <main style={{flex:1,padding:'28px 32px',overflow:'auto'}}>
        <PageHeader
          title="Data Quality"
          subtitle="Conformance · Completeness · Plausibility — sampled against live server."
          right={<>
            <span className="chip"><span className="dot" style={{background:'var(--ok)'}}/>Last run 3m ago</span>
            <button className="btn"><Ico.camera size={14}/> Capture</button>
            <button className="btn"><Ico.download size={14}/> Export PDF</button>
            <button className="btn primary"><Ico.refresh size={14}/> Recompute</button>
          </>}
        />

        {/* Scope toolbar (tier 1) */}
        <div className="panel" style={{padding:'12px 14px',marginBottom:14,display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:14,alignItems:'end'}}>
          <div>
            <label className="uppercase" style={{fontSize:10,display:'block',marginBottom:4}}>Resource types</label>
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',minHeight:30,padding:'3px 8px',background:'var(--panel)',border:'1px solid var(--border-2)',borderRadius:'var(--r-md)'}}>
              <span className="chip accent">Patient <Ico.x size={10}/></span>
              <span className="chip accent">Condition <Ico.x size={10}/></span>
              <span className="chip accent">Observation <Ico.x size={10}/></span>
              <span style={{fontSize:12,color:'var(--ink-3)'}}>+3 more</span>
            </div>
          </div>
          <div>
            <label className="uppercase" style={{fontSize:10,display:'block',marginBottom:4}}>Active cohort</label>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <select className="select" style={{flex:1}}>
                <option>Diabetes type 2 (n=1,284)</option>
                <option>All patients (n=12,450)</option>
              </select>
              <button className="btn" style={{fontSize:12}}><Ico.group size={14}/> Manage</button>
            </div>
          </div>
          <div>
            <label className="uppercase" style={{fontSize:10,display:'block',marginBottom:4}}>Sample size</label>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="range" min="10" max="1000" defaultValue="500" style={{flex:1,accentColor:'var(--accent)'}}/>
              <span className="mono tnum" style={{fontSize:13,minWidth:42,textAlign:'right'}}>500</span>
            </div>
          </div>
          <button className="btn ghost"><Ico.adjust size={14}/> Thresholds</button>
        </div>

        {/* KPI strip */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
          <MetricTile label="Completeness" pct={78.2} value={2345} total={3000} status="warn" trend={-1.2}/>
          <MetricTile label="Coding coverage" pct={91.4} value={2742} total={3000} status="ok" trend={0.4}/>
          <MetricTile label="Validation" pct={94.1} value={2823} total={3000} status="ok" trend={2.1}/>
          <MetricTile label="Plausibility" pct={62.0} value={1860} total={3000} status="bad" trend={-3.8}/>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:12,padding:4,background:'var(--panel-2)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',width:'fit-content'}}>
          <Tab label="Counts"/>
          <Tab label="Completeness"/>
          <Tab label="Coverage"/>
          <Tab label="Validation" active count={493}/>
          <Tab label="Plausibility" count={214}/>
          <Tab label="Lab ranges" count={38}/>
          <Tab label="Duplicates" count={10}/>
          <Tab label="References" count={7}/>
          <Tab label="Trends"/>
        </div>

        {/* Per-type quality matrix */}
        <div className="panel" style={{overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--panel-2)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:13,fontWeight:600}}>Per resource type</div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span className="chip" style={{fontSize:11}}>6 types · 3,000 sampled</span>
              <button className="btn ghost sm">Sort ▾</button>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Resource type</th>
                <th style={{width:170}}>Complete</th>
                <th style={{width:170}}>Coverage</th>
                <th style={{width:170}}>Validation</th>
                <th style={{width:170}}>References</th>
                <th style={{width:100}} className="right">Dup</th>
                <th style={{width:110}} className="right">Issues</th>
                <th style={{width:30}}></th>
              </tr>
            </thead>
            <tbody>
              {QUAL_ROWS.map(r => (
                <tr key={r.type}>
                  <td>
                    <div style={{fontWeight:500,fontFamily:'var(--font-mono)',fontSize:12.5}}>{r.type}</div>
                    <div style={{fontSize:10.5,color:'var(--ink-3)'}}>sampled {r.sampled}</div>
                  </td>
                  <td>{pctCell(r.complete, 85)}</td>
                  <td>{pctCell(r.coverage, 85)}</td>
                  <td>{pctCell(r.valid, 90)}</td>
                  <td>{pctCell(r.ref, 95)}</td>
                  <td className="right mono tnum" style={{color: r.dup>0?'var(--bad)':'var(--ink-3)'}}>{r.dup}</td>
                  <td className="right">
                    {r.issues>0
                      ? <span className="chip bad" style={{fontWeight:500}}>{r.issues}</span>
                      : <span style={{color:'var(--ink-3)'}}>—</span>}
                  </td>
                  <td><button className="ibtn"><Ico.chevR size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

window.QualityView = QualityView;
