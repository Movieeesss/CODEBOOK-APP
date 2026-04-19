import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- ENHANCED ENGINEERING DATABASE ---
const IS_CODE_DATA = [
  { id: 1, code: "IS 456", clause: "26.5.1.1", topic: "Tension Steel (Beam)", detail: "Min: 0.85*bd/fy | Max: 0.04*bD", type: "calc_tension" },
  { id: 2, code: "IS 456", clause: "26.5.1.2", topic: "Compression Steel (Beam)", detail: "Max area: 0.04*bD", type: "calc_comp" },
  { id: 3, code: "IS 456", clause: "26.5.2.1", topic: "Min Reinforcement (Slab)", detail: "0.12% for HYSD, 0.15% for Mild", type: "calc_slab" },
  { id: 4, code: "IS 456", clause: "Table 16", topic: "Nominal Cover", detail: "Mild: 20mm, Mod: 30mm, Sev: 45mm", type: "info" },
  { id: 5, code: "IS 456", clause: "23.2.1", topic: "Deflection (Span/Depth)", detail: "SS: 20, Cant: 7, Cont: 26", type: "info" },
  { id: 6, code: "IS 800", clause: "Table 5", topic: "Safety Factors", detail: "Yielding: 1.10, Buckling: 1.10", type: "info" },
  { id: 7, code: "IS 875-P3", clause: "6.3", topic: "Wind Speed (Vz)", detail: "Vz = Vb * k1 * k2 * k3 * k4", type: "info" }
];

export default function UniqCodeBookApp() {
  const [project, setProject] = useState(localStorage.getItem('cb_project') || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedList, setSelectedList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Advanced Logic States
  const [calcInputs, setCalcInputs] = useState({ b: 230, d: 450, fy: 500, D: 500, providedAst: 0 });
  const [designStatus, setDesignStatus] = useState<{ status: string, msg: string } | null>(null);

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
      setSelectedList([...selectedList, { ...item, verification: "Not Checked" }]);
      setSearchTerm('');
    }
  };

  // --- CORE DESIGN VERIFIER LOGIC ---
  const runVerification = (item: any) => {
    const { b, d, fy, D, providedAst } = calcInputs;
    let result = { status: "CHECKED ✅", msg: "Information verified." };

    if (item.type === "calc_tension") {
      const minAst = (0.85 * b * d) / fy;
      const maxAst = 0.04 * b * D;
      if (providedAst < minAst) {
        result = { status: "FAIL ❌", msg: `Min Steel ${minAst.toFixed(0)}mm² venum. Site-la kammiya irukku.` };
      } else if (providedAst > maxAst) {
        result = { status: "FAIL ❌", msg: "Steel Limit thaandiruchu (Max 4%)." };
      } else {
        result = { status: "SAFE ✅", msg: "Reinforcement limits-kulla irukku." };
      }
    } else if (item.type === "calc_slab") {
        const minAstSlab = (0.0012 * b * D);
        result = providedAst >= minAstSlab 
            ? { status: "SAFE ✅", msg: "Slab reinforcement safe." } 
            : { status: "FAIL ❌", msg: `Min ${minAstSlab.toFixed(0)}mm² required.` };
    }

    setDesignStatus(result);
    // Update the specific item in selected list with the result
    setSelectedList(prev => prev.map(s => s.id === item.id ? { ...s, verification: result.status, remark: result.msg } : s));
  };

  const generateReport = async () => {
    if (!project || selectedList.length === 0) return alert("Fill project details!");
    setLoading(true);
    const doc = new jsPDF();
    
    // Professional Header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("UNIQ DESIGNS - STRUCTURAL AUDIT", 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text("Tiruchirappalli, Tamil Nadu | Automated Design Compliance", 105, 28, { align: 'center' });
    doc.text(`Project: ${project.toUpperCase()} | Date: ${new Date().toLocaleDateString()}`, 105, 35, { align: 'center' });

    // Design Audit Table
    autoTable(doc, {
      startY: 45,
      head: [['CODE', 'CLAUSE', 'TOPIC', 'MANDATORY PROVISION', 'SITE STATUS']],
      body: selectedList.map(c => [
        c.code, 
        c.clause, 
        c.topic, 
        c.detail, 
        c.verification || "Not Checked"
      ]),
      headStyles: { fillColor: [44, 62, 80] },
      columnStyles: { 4: { fontStyle: 'bold' } },
      styles: { fontSize: 8 }
    });

    // Add remarks section if failures exist
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(0,0,0);
    doc.setFontSize(10);
    doc.text("ENGINEER'S REMARKS & SITE OBSERVATIONS:", 14, finalY);
    selectedList.forEach((item, index) => {
        if(item.remark) doc.text(`- ${item.clause}: ${item.remark}`, 14, finalY + 7 + (index * 6));
    });

    doc.save(`${project}_Structural_Audit.pdf`);
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>🏗️ UNIQ CODEBOOK AI</header>

      <div style={cardStyle}>
        <div style={inputGroup}>
          <label style={labelStyle}>PROJECT NAME</label>
          <input style={inputStyle} value={project} onChange={e => setProject(e.target.value)} placeholder="e.g., G+1 Building, Trichy" />
        </div>

        <div style={inputGroup}>
          <label style={labelStyle}>SITE SEARCH (IS CODES)</label>
          <input style={inputStyle} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search 'Slab', 'Beam', 'IS 456'..." />
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

        {/* INPUTS FOR CALCULATION */}
        <div style={calcBox}>
            <h5 style={{margin:'0 0 10px 0', fontSize:'13px'}}>SITE DATA (Verification Inputs)</h5>
            <div style={gridInputs}>
                <input type="number" placeholder="b (mm)" style={smallInput} onChange={e => setCalcInputs({...calcInputs, b: +e.target.value})} />
                <input type="number" placeholder="d (mm)" style={smallInput} onChange={e => setCalcInputs({...calcInputs, d: +e.target.value})} />
                <input type="number" placeholder="fy (N/mm2)" style={smallInput} onChange={e => setCalcInputs({...calcInputs, fy: +e.target.value})} />
                <input type="number" placeholder="Provided Ast (mm2)" style={smallInput} onChange={e => setCalcInputs({...calcInputs, providedAst: +e.target.value})} />
            </div>
        </div>

        <div style={{marginTop: '15px'}}>
          <label style={labelStyle}>SELECTED AUDIT LIST</label>
          {selectedList.map(item => (
            <div key={item.id} style={itemCard}>
              <div style={{flex: 1}}>
                <div style={{fontSize:'14px', fontWeight:'bold'}}>{item.clause}: {item.topic}</div>
                <div style={{fontSize:'11px', color:'#666'}}>{item.detail}</div>
                <div style={{marginTop:'5px', fontWeight:'bold', color: item.verification.includes('FAIL') ? 'red' : 'green'}}>
                    Status: {item.verification}
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                {item.type.startsWith('calc') && (
                    <button onClick={() => runVerification(item)} style={verifyBtn}>VERIFY</button>
                )}
                <button onClick={() => setSelectedList(selectedList.filter(s => s.id !== item.id))} style={removeBtn}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={generateReport} disabled={loading} style={mainBtn}>
          {loading ? "GENERATING..." : "DOWNLOAD AUDIT REPORT"}
        </button>
        <p style={{textAlign:'center', fontSize:'11px', color:'#999'}}>Designed for Prakash M | Uniq Designs</p>
      </div>
    </div>
  );
}

// --- STYLING (Optimized for On-Site Use) ---
const containerStyle: React.CSSProperties = { maxWidth: '480px', margin: '0 auto', backgroundColor: '#fcfcfc', minHeight: '100vh', fontFamily: 'sans-serif' };
const headerStyle: React.CSSProperties = { backgroundColor: '#2c3e50', color: '#fff', padding: '18px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' };
const cardStyle: React.CSSProperties = { padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative' };
const labelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 'bold', color: '#555', letterSpacing: '0.5px' };
const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' };
const dropdownStyle: React.CSSProperties = { position: 'absolute', top: '55px', width: '100%', backgroundColor: 'white', zIndex: 10, border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const itemStyle: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px', cursor: 'pointer' };
const itemCard: React.CSSProperties = { display: 'flex', backgroundColor: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' };
const calcBox: React.CSSProperties = { backgroundColor: '#f0f4f7', padding: '15px', borderRadius: '10px', border: '1px solid #d1d9e0' };
const gridInputs: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' };
const smallInput: React.CSSProperties = { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '12px' };
const verifyBtn: React.CSSProperties = { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' };
const removeBtn: React.CSSProperties = { color: '#e74c3c', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer' };
const mainBtn: React.CSSProperties = { backgroundColor: '#2980b9', color: 'white', padding: '16px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' };
