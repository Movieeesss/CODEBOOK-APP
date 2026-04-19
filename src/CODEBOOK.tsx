import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- ENHANCED ENGINEERING DATABASE ---
const IS_CODE_DATA = [
  // IS 456: Concrete
  { id: 1, code: "IS 456", clause: "26.5.1.1", topic: "Tension Steel (Beam)", detail: "Min: 0.85*bd/fy | Max: 0.04*bD", type: "calc_tension" },
  { id: 2, code: "IS 456", clause: "26.5.1.2", topic: "Compression Steel (Beam)", detail: "Max area: 0.04*bD", type: "calc_comp" },
  { id: 3, code: "IS 456", clause: "26.5.2.1", topic: "Min Reinforcement (Slab)", detail: "0.12% for HYSD, 0.15% for Mild", type: "calc_slab" },
  { id: 4, code: "IS 456", clause: "Table 16", topic: "Nominal Cover", detail: "Mild: 20mm, Mod: 30mm, Sev: 45mm", type: "info" },
  { id: 5, code: "IS 456", clause: "23.2.1", topic: "Deflection (Span/Depth)", detail: "SS: 20, Cant: 7, Cont: 26", type: "info" },
  
  // IS 800: Steel
  { id: 6, code: "IS 800", clause: "Table 5", topic: "Safety Factors", detail: "Yielding: 1.10, Buckling: 1.10", type: "info" },
  { id: 7, code: "IS 800", clause: "3.8", topic: "Slenderness Ratio", detail: "Tension: 400, Compression: 180", type: "info" },

  // IS 875: Loads
  { id: 8, code: "IS 875-P3", clause: "6.3", topic: "Wind Speed (Vz)", detail: "Vz = Vb * k1 * k2 * k3 * k4", type: "info" },
  { id: 9, code: "IS 875-P2", clause: "Table 1", topic: "Imposed Load (Residential)", detail: "Rooms: 2.0 kN/m2, Stairs: 3.0 kN/m2", type: "info" }
];

export default function AdvancedCodeBook() {
  const [project, setProject] = useState(localStorage.getItem('cb_project') || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedList, setSelectedList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Calculator States
  const [calcInputs, setCalcInputs] = useState({ b: 230, d: 450, fy: 500, D: 500 });
  const [calcResult, setCalcResult] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('cb_project', project); }, [project]);

  const filteredSuggestions = useMemo(() => {
    if (searchTerm.length < 2) return [];
    return IS_CODE_DATA.filter(i => 
      i.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.clause.includes(searchTerm) ||
      i.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const addClause = (item: any) => {
    if (!selectedList.find(c => c.id === item.id)) {
      setSelectedList([...selectedList, item]);
      setSearchTerm('');
    }
  };

  // --- AUTOMATED CALCULATION LOGIC ---
  const runQuickCalc = (type: string) => {
    const { b, d, fy, D } = calcInputs;
    let res = "";
    if (type === "calc_tension") {
      const minAst = (0.85 * b * d) / fy;
      res = `Min Ast required: ${minAst.toFixed(2)} mm²`;
    } else if (type === "calc_slab") {
      const minAstSlab = (0.0012 * b * D); // For HYSD
      res = `Min Ast (HYSD): ${minAstSlab.toFixed(2)} mm² per meter`;
    } else if (type === "calc_comp") {
      const maxAst = 0.04 * b * D;
      res = `Max Steel Limit: ${maxAst.toFixed(2)} mm²`;
    }
    setCalcResult(res);
  };

  const generateReport = async () => {
    if (!project || selectedList.length === 0) return alert("Fill project name and select clauses!");
    setLoading(true);
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("DESIGN COMPLIANCE AUDIT", 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`UNIQ DESIGNS - TRICHY | Date: ${new Date().toLocaleDateString()}`, 105, 28, { align: 'center' });

    // Project Table
    autoTable(doc, {
      startY: 40,
      body: [['PROJECT:', project.toUpperCase()], ['CONSULTANT:', 'UNIQ DESIGNS / PRAKASH M']],
      theme: 'plain',
      styles: { fontStyle: 'bold', fontSize: 12 }
    });

    // Main Clause Table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['CODE', 'CLAUSE', 'TOPIC', 'MANDATORY PROVISION']],
      body: selectedList.map(c => [c.code, c.clause, c.topic, c.detail]),
      headStyles: { fillColor: [44, 62, 80] },
      styles: { fontSize: 9 }
    });

    doc.save(`${project}_Audit_Report.pdf`);
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <span>🏗️ UNIQ CODEBOOK AI</span>
      </header>

      <div style={cardStyle}>
        <label style={labelStyle}>PROJECT NAME</label>
        <input style={inputStyle} value={project} onChange={e => setProject(e.target.value)} placeholder="e.g., G+1 Villa, Trichy" />

        <label style={labelStyle}>SEARCH IS CODE PROVISIONS (Site Search)</label>
        <div style={{position: 'relative'}}>
          <input 
            style={inputStyle} 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Search 'Steel', 'Cover', 'Wind'..." 
          />
          {filteredSuggestions.length > 0 && (
            <div style={dropdownStyle}>
              {filteredSuggestions.map(item => (
                <div key={item.id} style={itemStyle} onClick={() => addClause(item)}>
                  <b>{item.code}:{item.clause}</b> - {item.topic}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SELECTED CLAUSES & CALC INTERFACE */}
        <div style={{marginTop: '20px'}}>
          <h4 style={{fontSize: '14px', color: '#2c3e50'}}>SITE AUDIT LIST:</h4>
          {selectedList.map(item => (
            <div key={item.id} style={badgeStyle}>
              <div>
                <b>{item.clause}</b>: {item.topic}
                {item.type.startsWith('calc') && (
                  <button onClick={() => runQuickCalc(item.type)} style={calcBtn}>Calculate Result</button>
                )}
              </div>
              <button onClick={() => setSelectedList(selectedList.filter(s => s.id !== item.id))} style={{border:'none', background:'none', color:'red'}}>×</button>
            </div>
          ))}
        </div>

        {/* INTERACTIVE CALCULATOR PANEL */}
        <div style={calcPanel}>
           <h5 style={{margin: '0 0 10px 0'}}>QUICK CALCULATOR INPUTS</h5>
           <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
              <input type="number" placeholder="Width (b)" style={smallInput} onChange={e => setCalcInputs({...calcInputs, b: +e.target.value})} />
              <input type="number" placeholder="Eff. Depth (d)" style={smallInput} onChange={e => setCalcInputs({...calcInputs, d: +e.target.value})} />
              <input type="number" placeholder="fy (N/mm2)" style={smallInput} onChange={e => setCalcInputs({...calcInputs, fy: +e.target.value})} />
              <input type="number" placeholder="Total Depth (D)" style={smallInput} onChange={e => setCalcInputs({...calcInputs, D: +e.target.value})} />
           </div>
           {calcResult && <div style={resultBox}>✅ {calcResult}</div>}
        </div>

        <button onClick={generateReport} disabled={loading} style={mainBtn}>
          {loading ? "GENERATING..." : "DOWNLOAD AUDIT REPORT (PDF)"}
        </button>
        
        <button onClick={() => {setSelectedList([]); localStorage.clear(); setCalcResult(null);}} style={resetBtn}>RESET DATA</button>
      </div>
    </div>
  );
}

// --- STYLING (Lag-Free Mobile First) ---
const containerStyle: React.CSSProperties = { maxWidth: '480px', margin: '0 auto', backgroundColor: '#f9f9f9', minHeight: '100vh', fontFamily: 'sans-serif' };
const headerStyle: React.CSSProperties = { backgroundColor: '#2c3e50', color: 'white', padding: '20px', textAlign: 'center', fontWeight: 'bold', fontSize: '20px' };
const cardStyle: React.CSSProperties = { padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' };
const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 'bold', color: '#7f8c8d' };
const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px' };
const dropdownStyle: React.CSSProperties = { position: 'absolute', width: '100%', backgroundColor: 'white', border: '1px solid #ddd', zIndex: 100, maxHeight: '200px', overflowY: 'auto', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
const itemStyle: React.CSSProperties = { padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '13px' };
const badgeStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', backgroundColor: 'white', padding: '12px', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #3498db', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const calcBtn: React.CSSProperties = { marginLeft: '10px', padding: '4px 8px', fontSize: '11px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px' };
const calcPanel: React.CSSProperties = { backgroundColor: '#ecf0f1', padding: '15px', borderRadius: '10px', marginTop: '10px' };
const smallInput: React.CSSProperties = { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' };
const resultBox: React.CSSProperties = { marginTop: '10px', padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' };
const mainBtn: React.CSSProperties = { marginTop: '15px', padding: '16px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' };
const resetBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#95a5a6', textDecoration: 'underline', marginTop: '10px', fontSize: '13px' };
