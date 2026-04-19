import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- THEME & STYLES ---
const COLORS = {
  bg: '#0f172a',
  card: '#1e293b',
  accent: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  text: '#f8fafc',
  border: '#334155'
};

export default function UniqStructuralEnginePro() {
  const [tab, setTab] = useState<'AUDIT' | 'REBAR' | 'VASTU'>('AUDIT');
  const [project, setProject] = useState(localStorage.getItem('cb_project') || '');
  const [inputs, setInputs] = useState({ b: 230, d: 450, fy: 500, ast_provided: 0 });
  
  // Voice & UI States
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-save Project Name
  useEffect(() => {
    localStorage.setItem('cb_project', project);
  }, [project]);

  // --- 1. VOICE LOGIC ---
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voice recognition not supported in this browser.");

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase();
      setTranscript(command);
      processVoiceCommand(command);
    };
    recognition.start();
  };

  const processVoiceCommand = (cmd: string) => {
    const numbers = cmd.match(/\d+/g);
    const val = numbers ? parseInt(numbers[0]) : null;

    if (cmd.includes('width') && val) setInputs(p => ({ ...p, b: val }));
    else if (cmd.includes('depth') && val) setInputs(p => ({ ...p, d: val }));
    else if (cmd.includes('steel') && val) setInputs(p => ({ ...p, ast_provided: val }));
    else if (cmd.includes('generate')) generateReport();
  };

  // --- 2. AUDIT LOGIC ---
  const runAudit = () => {
    const minAst = (0.85 * inputs.b * inputs.d) / inputs.fy;
    const maxAst = 0.04 * inputs.b * inputs.d;
    
    if (inputs.ast_provided === 0) return { status: 'WAITING', msg: 'Enter Data or Say "Steel 500"', color: COLORS.card };
    if (inputs.ast_provided < minAst) return { status: 'FAIL ❌', msg: `Min Steel Need: ${minAst.toFixed(0)}mm²`, color: COLORS.danger };
    if (inputs.ast_provided > maxAst) return { status: 'FAIL ❌', msg: 'Limit Exceeded (4% bD)', color: COLORS.danger };
    return { status: 'SAFE ✅', msg: 'Design is IS 456 Compliant', color: COLORS.success };
  };

  const auditResult = runAudit();

  // --- 3. REBAR CALCULATOR LOGIC ---
  const calculateRebar = (dia: number, nos: number) => {
    const area = (Math.PI / 4) * (dia * dia) * nos;
    setInputs({ ...inputs, ast_provided: Math.round(area) });
    setTab('AUDIT'); // Switch to see result
  };

  // --- 4. REPORT GENERATOR ---
  const generateReport = async () => {
    if (!project || inputs.ast_provided === 0) return alert("Enter project name and site data first!");
    setLoading(true);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("UNIQ DESIGNS - STRUCTURAL AUDIT", pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`TRICHY, TAMIL NADU | Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });

    autoTable(doc, {
      startY: 45,
      head: [['Field', 'Input Value', 'IS 456 Requirement', 'Status']],
      body: [
        ['Project Name', project.toUpperCase(), '-', '-'],
        ['Section b x d', `${inputs.b} x ${inputs.d} mm`, '-', '-'],
        ['Provided Ast', `${inputs.ast_provided} mm²`, `Min: ${((0.85*inputs.b*inputs.d)/inputs.fy).toFixed(0)} mm²`, auditResult.status]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`${project}_Uniq_Audit.pdf`);
    setLoading(false);
  };

  return (
    <div style={appContainer}>
      {/* HEADER */}
      <header style={headerStyle}>
        <div>
          <div style={{fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px'}}>UNIQ <span style={{color: COLORS.accent}}>ENGINE</span></div>
          <div style={{fontSize: '10px', opacity: 0.5}}>TRICHY'S AUTOMATION HUB</div>
        </div>
        <button onClick={startListening} style={{...micBtn, backgroundColor: isListening ? COLORS.danger : COLORS.accent}}>
          {isListening ? '🛑 LISTENING...' : '🎤 VOICE'}
        </button>
      </header>

      {/* NAVIGATION */}
      <div style={tabBar}>
        <button onClick={() => setTab('AUDIT')} style={tab === 'AUDIT' ? activeTab : inactiveTab}>LIVE AUDIT</button>
        <button onClick={() => setTab('REBAR')} style={tab === 'REBAR' ? activeTab : inactiveTab}>REBAR CALC</button>
        <button onClick={() => setTab('VASTU')} style={tab === 'VASTU' ? activeTab : inactiveTab}>VASTU</button>
      </div>

      <div style={{padding: '20px', paddingBottom: '120px'}}>
        
        {/* PROJECT IDENTIFIER */}
        <div style={{marginBottom: '20px'}}>
           <label style={miniLabel}>PROJECT NAME</label>
           <input style={projectInput} value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. G+1 Villa Site" />
        </div>

        {/* --- TAB 1: LIVE AUDIT --- */}
        {tab === 'AUDIT' && (
          <div style={fadeAnim}>
            {transcript && <div style={voiceTranscript}>" {transcript} "</div>}
            
            <div style={{...statusCard, backgroundColor: auditResult.color}}>
               <div style={{fontSize: '12px', opacity: 0.8, letterSpacing: '1px'}}>SITE COMPLIANCE</div>
               <div style={{fontSize: '32px', fontWeight: '900', margin: '10px 0'}}>{auditResult.status}</div>
               <div style={{fontSize: '14px', fontWeight: '500'}}>{auditResult.msg}</div>
            </div>

            <div style={gridInputs}>
               <div style={inputBox}><label>Width b</label><input type="number" value={inputs.b} onChange={e => setInputs({...inputs, b: +e.target.value})} /></div>
               <div style={inputBox}><label>Depth d</label><input type="number" value={inputs.d} onChange={e => setInputs({...inputs, d: +e.target.value})} /></div>
               <div style={{...inputBox, border: `1px solid ${COLORS.accent}`}}><label style={{color: COLORS.accent}}>Site Ast</label><input type="number" value={inputs.ast_provided} onChange={e => setInputs({...inputs, ast_provided: +e.target.value})} /></div>
               <div style={inputBox}><label>Steel fy</label><input type="number" value={inputs.fy} onChange={e => setInputs({...inputs, fy: +e.target.value})} /></div>
            </div>
          </div>
        )}

        {/* --- TAB 2: REBAR CALCULATOR --- */}
        {tab === 'REBAR' && (
          <div style={fadeAnim}>
            <div style={calcHeader}>Instant Rebar $A_{st}$ Combinations</div>
            <div style={rebarGrid}>
               {[12, 16, 20, 25].map(dia => (
                 <div key={dia} style={rebarCard}>
                    <div style={{fontSize: '18px', fontWeight: 'bold', color: COLORS.accent}}>{dia} mm</div>
                    <div style={nosGrid}>
                       {[2, 3, 4, 6, 8].map(nos => (
                         <button key={nos} onClick={() => calculateRebar(dia, nos)} style={nosBtn}>{nos}</button>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* --- TAB 3: VASTU --- */}
        {tab === 'VASTU' && (
          <div style={{textAlign: 'center', marginTop: '50px', opacity: 0.7}}>
             <div style={{fontSize: '60px'}}>☸️</div>
             <h3>Vastu-Structural Hybrid</h3>
             <p>Coming Soon for Uniq Designs Architecture</p>
          </div>
        )}
      </div>

      {/* FOOTER ACTION */}
      <div style={footerAction}>
        <button onClick={generateReport} disabled={loading} style={mainBtn}>
          {loading ? "PROCESSING..." : "GENERATE PROFESSIONAL AUDIT REPORT"}
        </button>
      </div>
    </div>
  );
}

// --- CSS-in-JS STYLES ---
const appContainer: React.CSSProperties = { maxWidth: '500px', margin: '0 auto', backgroundColor: COLORS.bg, minHeight: '100vh', color: COLORS.text, fontFamily: 'system-ui, sans-serif' };
const headerStyle: React.CSSProperties = { padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}` };
const micBtn: React.CSSProperties = { padding: '10px 18px', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' };
const tabBar: React.CSSProperties = { display: 'flex', gap: '5px', background: COLORS.card, margin: '15px', padding: '5px', borderRadius: '15px' };
const activeTab: React.CSSProperties = { flex: 1, padding: '12px', background: COLORS.accent, border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', fontSize: '12px' };
const inactiveTab: React.CSSProperties = { flex: 1, padding: '12px', background: 'none', border: 'none', color: '#64748b', fontSize: '12px' };
const miniLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 'bold', color: COLORS.accent, letterSpacing: '1px' };
const projectInput: React.CSSProperties = { width: '100%', background: 'none', border: 'none', borderBottom: `2px solid ${COLORS.border}`, color: 'white', padding: '10px 0', fontSize: '18px', outline: 'none' };
const statusCard: React.CSSProperties = { padding: '30px', borderRadius: '25px', textAlign: 'center', marginBottom: '25px', transition: '0.4s ease' };
const gridInputs: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const inputBox: React.CSSProperties = { background: COLORS.card, padding: '15px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '5px' };
const voiceTranscript: React.CSSProperties = { textAlign: 'center', fontSize: '13px', color: COLORS.accent, marginBottom: '10px', fontStyle: 'italic' };
const calcHeader: React.CSSProperties = { fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', color: '#94a3b8' };
const rebarGrid: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '15px' };
const rebarCard: React.CSSProperties = { background: COLORS.card, padding: '20px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const nosGrid: React.CSSProperties = { display: 'flex', gap: '8px' };
const nosBtn: React.CSSProperties = { width: '35px', height: '35px', borderRadius: '10px', border: 'none', background: '#334155', color: 'white', fontWeight: 'bold', cursor: 'pointer' };
const footerAction: React.CSSProperties = { position: 'fixed', bottom: '0', width: '100%', maxWidth: '500px', padding: '20px', background: 'linear-gradient(to top, #0f172a 80%, transparent)' };
const mainBtn: React.CSSProperties = { width: '100%', padding: '20px', background: COLORS.accent, color: 'white', border: 'none', borderRadius: '18px', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)', cursor: 'pointer' };
const fadeAnim: React.CSSProperties = { animation: 'fadeIn 0.3s ease' };
