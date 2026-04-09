import { useState } from "react";
import { Percent, RefreshCw } from "lucide-react";

function MassIvaEditor({ 
  batchSelectedIds = [], 
  products = [], 
  onApplyIvaToSelected 
}) {
  const [selectedIvaType, setSelectedIvaType] = useState('gravado');
  const [selectedIvaRate, setSelectedIvaRate] = useState(19);
  
  const selectedCount = batchSelectedIds.length;
  
  if (selectedCount === 0) return null;
  
  const ivaOptions = [
    { type: 'gravado', label: 'Gravado 19%', rate: 19, color: '#8aa646' },
    { type: 'gravado5', label: 'Gravado 5%', rate: 5, color: '#3b82f6' },
    { type: 'exento', label: 'Exento 0%', rate: 0, color: '#22c55e' },
    { type: 'excluido', label: 'Excluido', rate: 0, color: '#2563eb' },
    { type: 'precio_final', label: 'PRECIO FINAL', rate: 0, color: '#6b7280' },
  ];
  
  const handleApply = () => {
    onApplyIvaToSelected(selectedIvaType, selectedIvaRate);
  };
  
  return (
    <div className="massIvaEditor">
      <div className="massIvaEditorHeader">
        <Percent size={18} />
        <span>Edición masiva de IVA</span>
        <span className="massIvaEditorCount">{selectedCount} producto{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="massIvaEditorContent">
        <div className="massIvaEditorOptions">
          {ivaOptions.map((option) => (
            <label 
              key={option.type} 
              className={`massIvaOption ${selectedIvaType === option.type ? 'active' : ''}`}
              style={{ '--option-color': option.color }}
            >
              <input
                type="radio"
                name="ivaType"
                value={option.type}
                checked={selectedIvaType === option.type}
                onChange={() => {
                  setSelectedIvaType(option.type);
                  setSelectedIvaRate(option.rate);
                }}
              />
              <span className="massIvaOptionLabel">{option.label}</span>
            </label>
          ))}
        </div>
        
        {selectedIvaType !== 'excluido' && selectedIvaType !== 'exento' && selectedIvaType !== 'precio_final' && (
          <div className="massIvaRateField">
            <label>Porcentaje de IVA</label>
            <div className="massIvaRateInput">
              <input
                type="number"
                min="0"
                max="100"
                value={selectedIvaRate}
                onChange={(e) => setSelectedIvaRate(Number(e.target.value))}
              />
              <span>%</span>
            </div>
          </div>
        )}
        
        <button className="massIvaApplyBtn" onClick={handleApply}>
          <RefreshCw size={16} />
          <span>Aplicar a {selectedCount} producto{selectedCount !== 1 ? 's' : ''}</span>
        </button>
      </div>
    </div>
  );
}

export default MassIvaEditor;