/* global React */
// Shared shell components — icons, sidebar, topbar, chips.

const { useState } = React;

// ---------- Minimal inline icon set (stroke-based, 18px default) ----------
const Ico = {
  dashboard: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  db: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="8" ry="2.5"/><path d="M4 5v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5"/><path d="M4 11v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6"/></svg>,
  users: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.2 3.3-5 6.5-5s5.9 1.8 6.5 5"/><circle cx="17" cy="7" r="2.5"/><path d="M21.5 18c-.4-2.2-2-3.5-4.5-3.5"/></svg>,
  group: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="8" r="2.5"/><circle cx="17" cy="8" r="2.5"/><circle cx="12" cy="16" r="2.5"/><path d="M3 14c.4-1.8 1.8-3 4-3M21 14c-.4-1.8-1.8-3-4-3M7 21c.4-1.8 2.2-3 5-3s4.6 1.2 5 3"/></svg>,
  chart: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18"/><rect x="5" y="11" width="3" height="7" rx=".5"/><rect x="10.5" y="7" width="3" height="11" rx=".5"/><rect x="16" y="14" width="3" height="4" rx=".5"/></svg>,
  settings: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2.8"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>,
  search: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>,
  refresh: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>,
  download: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/></svg>,
  camera: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 6l1.5-2h5L16 6"/></svg>,
  adjust: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h10M18 6h2M4 18h2M10 18h10M4 12h6M14 12h6"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="18" r="2"/><circle cx="12" cy="12" r="2"/></svg>,
  more: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="currentColor"><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>,
  chevR: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>,
  chevD: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>,
  arrowUp: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 14l5-5 5 5"/></svg>,
  arrowDn: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10l5 5 5-5"/></svg>,
  check: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-10"/></svg>,
  warn: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L2 20h20L12 3z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".8" fill="currentColor"/></svg>,
  x: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>,
  filter: (p) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>,
  link: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>,
  code: (p) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/></svg>,
  spark: () => null,
};

// ---------- Server status pill ----------
function StatusDot({ color }) {
  return <span style={{display:'inline-block',width:6,height:6,borderRadius:999,background:color}} />;
}

// ---------- Sidebar ----------
function Sidebar({ active = 'dashboard' }) {
  const items = [
    { id:'dashboard', label:'Dashboard', icon: Ico.dashboard, to:'/' },
    { id:'explorer',  label:'Explorer',  icon: Ico.db,        to:'/explorer' },
    { id:'patients',  label:'Patients',  icon: Ico.users,     to:'/patients' },
    { id:'quality',   label:'Quality',   icon: Ico.chart,     to:'/quality' },
  ];
  return (
    <aside style={{
      width: 232, minWidth: 232,
      background: 'var(--panel-2)',
      borderRight: '1px solid var(--border)',
      display:'flex', flexDirection:'column',
      height: '100%'
    }}>
      {/* Brand */}
      <div style={{padding:'18px 16px 12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{
            width:24,height:24,borderRadius:6,
            background:'linear-gradient(135deg,var(--accent),oklch(60% 0.17 285))',
            display:'grid',placeItems:'center',color:'#fff',fontWeight:700,fontSize:12,
            fontFamily:'var(--font-mono)'
          }}>Ex</div>
          <div style={{fontWeight:600,fontSize:14,letterSpacing:'-0.01em'}}>FHIR Exploder</div>
        </div>
      </div>

      {/* Server card */}
      <div style={{margin:'0 10px 14px', padding:'10px 12px',
        background:'var(--panel)', border:'1px solid var(--border)', borderRadius:'var(--r-md)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <span className="uppercase" style={{fontSize:10}}>Server</span>
          <span className="chip ok" style={{height:18,padding:'0 6px',fontSize:10.5}}>
            <span className="dot"/>Connected
          </span>
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:11.5,color:'var(--ink-2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          blaze.local:8080
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6,fontSize:11,color:'var(--ink-3)'}}>
          <StatusDot color="var(--ok)"/>
          <span>Terminology OK</span>
          <span style={{marginLeft:'auto',fontFamily:'var(--font-mono)'}}>MII</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{padding:'0 8px',display:'flex',flexDirection:'column',gap:1,flex:1}}>
        {items.map(it => {
          const isActive = active === it.id || (it.id==='quality' && active==='cohorts');
          return (
            <div key={it.id}>
              <a href="#" onClick={e=>e.preventDefault()}
                 style={{
                   display:'flex',alignItems:'center',gap:10,
                   padding:'7px 10px', borderRadius:'var(--r-md)',
                   textDecoration:'none',color: isActive?'var(--ink)':'var(--ink-2)',
                   fontSize:13, fontWeight: isActive?600:500,
                   background: isActive?'var(--panel)':'transparent',
                   boxShadow: isActive?'inset 0 0 0 1px var(--border)':'none',
                   position:'relative'
                 }}>
                {isActive && <span style={{position:'absolute',left:-8,top:6,bottom:6,width:2,background:'var(--accent)',borderRadius:2}}/>}
                <it.icon size={16}/> {it.label}
              </a>
              {it.id==='quality' && (active==='quality' || active==='cohorts') && (
                <div style={{paddingLeft:28,display:'flex',flexDirection:'column',gap:1,marginTop:1}}>
                  {[
                    {id:'overview',label:'Overview'},
                    {id:'cohorts',label:'Cohorts'},
                    {id:'thresholds',label:'Thresholds'},
                  ].map(s => (
                    <a key={s.id} href="#" onClick={e=>e.preventDefault()} style={{
                      fontSize:12, padding:'4px 10px', borderRadius:4,
                      color: (active===s.id || (active==='quality'&&s.id==='overview')) ? 'var(--ink)' : 'var(--ink-3)',
                      textDecoration:'none',
                      fontWeight: (active===s.id || (active==='quality'&&s.id==='overview')) ? 600 : 400,
                    }}>{s.label}</a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{padding:8,borderTop:'1px solid var(--border)'}}>
        <a href="#" onClick={e=>e.preventDefault()} style={{
          display:'flex',alignItems:'center',gap:10,padding:'7px 10px',
          borderRadius:'var(--r-md)',color:'var(--ink-2)',fontSize:13,textDecoration:'none'
        }}>
          <Ico.settings size={16}/> Settings
        </a>
      </div>
    </aside>
  );
}

// ---------- Topbar (page header) ----------
function PageHeader({ title, crumb, right, subtitle }) {
  return (
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:24,marginBottom:20}}>
      <div>
        {crumb && <div style={{fontSize:12,color:'var(--ink-3)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
          {crumb}
        </div>}
        <h1 style={{margin:0,fontSize:22,fontWeight:600,letterSpacing:'-0.015em'}}>{title}</h1>
        {subtitle && <div style={{marginTop:4,fontSize:13,color:'var(--ink-3)'}}>{subtitle}</div>}
      </div>
      {right && <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>{right}</div>}
    </div>
  );
}

// Export for siblings
Object.assign(window, { Ico, StatusDot, Sidebar, PageHeader });
