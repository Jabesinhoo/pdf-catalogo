import { useState } from "react";
import { Calculator, RefreshCw, X } from "lucide-react";

function MassPriceAdjustModal({ 
  isOpen, 
  onClose, 
  selectedCount, 
  onApply 
}) {
  const [selectedOp, setSelectedOp] = useState('');
  const [selectedValue, setSelectedValue] = useState('');

  if (!isOpen) return null;

  const handleApply = () => {
    if (!selectedOp || !selectedValue) {
      alert("Selecciona una operacion y un valor");
      return;
    }
    const value = parseFloat(selectedValue);
    if (isNaN(value) || value <= 0) {
      alert("Ingresa un valor valido mayor a 0");
      return;
    }
    
    onApply(selectedOp, value);
    setSelectedOp('');
    setSelectedValue('');
    onClose();
  };

  return (
    <div className="mass-price-modal-overlay" onClick={onClose}>
      <div className="mass-price-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="mass-price-modal-header">
          <Calculator size={20} />
          <h3>Ajuste masivo de precio</h3>
          <button className="mass-price-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className="mass-price-modal-body">
          <p className="mass-price-modal-info">
            Vas a ajustar el precio de <strong>{selectedCount}</strong> producto(s) seleccionado(s)
          </p>
          
          <div className="mass-price-modal-field">
            <label>Operacion</label>
            <div className="mass-price-modal-field-group">
              <select value={selectedOp} onChange={(e) => setSelectedOp(e.target.value)}>
                <option value="">Seleccionar operacion</option>
                <option value="/">Dividir entre (/)</option>
                <option value="*">Multiplicar por (*)</option>
              </select>
              <input
                type="number"
                step="any"
                placeholder="Valor (ej: 1.19, 0.95)"
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="mass-price-modal-footer">
          <button className="mass-price-modal-btn cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="mass-price-modal-btn apply" onClick={handleApply}>
            <RefreshCw size={14} />
            <span>Aplicar a {selectedCount} producto(s)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MassPriceAdjustModal;