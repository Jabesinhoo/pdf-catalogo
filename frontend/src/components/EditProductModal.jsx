import { X, Upload, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { formatMoney, getQuoteNumbers } from "../utils/quoteMath";

function EditProductModal({
  isOpen,
  draft,
  onClose,
  onSave,
  onChange,
  onImageChange,
  onAddImage,
  onRemoveImage,
  documentType,
  currency = "COP",
}) {
  if (!isOpen) return null;

  const quote = getQuoteNumbers(draft);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && onImageChange) {
      onImageChange(file);
    }
  };

  const handleMultipleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (onAddImage) {
          onAddImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (field, value) => {
    if (onChange) {
      onChange(field, value);
    }
  };

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-modal__header">
          <div>
            <h2>Editar producto</h2>
            <p>Modifica todos los campos libremente</p>
          </div>
          <button className="edit-modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <div className="edit-modal__body">
          <div className="edit-modal__grid">
            {/* Campos básicos */}
            <div className="edit-modal__field">
              <label>Nombre del producto</label>
              <input
                type="text"
                value={draft.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ej: Laptop Dell Latitude"
              />
            </div>

            <div className="edit-modal__field">
              <label>SKU / Código</label>
              <input
                type="text"
                value={draft.sku || ""}
                onChange={(e) => handleChange("sku", e.target.value)}
                placeholder="Ej: LT-DELL-001"
              />
            </div>

            <div className="edit-modal__field">
              <label>Precio</label>
              <input
                type="text"
                value={draft.price || ""}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="$ 0.00"
              />
            </div>

            {documentType === "quote" && (
              <>
                <div className="edit-modal__field">
                  <label>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={draft.quantity || 1}
                    onChange={(e) => handleChange("quantity", e.target.value)}
                  />
                </div>

                <div className="edit-modal__field">
                  <label>Tipo de IVA</label>
                  <select
                    value={draft.ivaType || 'gravado'}
                    onChange={(e) => {
                      handleChange("ivaType", e.target.value);
                      if (e.target.value === 'excluido' || e.target.value === 'precio_final') handleChange("ivaRate", 0);
                    }}
                  >
                    <option value="gravado">Gravado 19%</option>
                    <option value="gravado5">Gravado 5%</option>
                    <option value="exento">Exento 0%</option>
                    <option value="excluido">Excluido</option>
                    <option value="precio_final">PRECIO FINAL (Sin IVA discriminado)</option>
                  </select>
                </div>

                {draft.ivaType !== 'excluido' && draft.ivaType !== 'precio_final' && (
                  <div className="edit-modal__field">
                    <label>Porcentaje de IVA</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={draft.ivaRate || 0}
                      disabled={draft.ivaType === 'exento'}
                      onChange={(e) => handleChange("ivaRate", e.target.value)}
                    />
                  </div>
                )}

                <div className="edit-modal__field">
                  <label>Total manual (opcional)</label>
                  <input
                    type="text"
                    value={draft.totalPrice || ""}
                    onChange={(e) => handleChange("totalPrice", e.target.value)}
                    placeholder="Dejar vacío para calcular automático"
                  />
                </div>
              </>
            )}

            <div className="edit-modal__field edit-modal__field--full">
              <label>Descripción corta</label>
              <textarea
                rows="4"
                value={draft.shortDescription || ""}
                onChange={(e) => handleChange("shortDescription", e.target.value)}
                placeholder="Breve descripción del producto..."
              />
            </div>

            <div className="edit-modal__field edit-modal__field--full">
              <label>URL del producto (opcional)</label>
              <input
                type="text"
                value={draft.productUrl || ""}
                onChange={(e) => handleChange("productUrl", e.target.value)}
                placeholder="https://tecnonacho.com/producto/..."
              />
            </div>

            {/* IMAGEN PRINCIPAL */}
            <div className="edit-modal__field edit-modal__field--full">
              <label>Imagen principal</label>
              <div className="edit-modal__upload-group">
                <div className="edit-modal__upload">
                  <input
                    type="file"
                    accept="image/*"
                    id="main-image-upload"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="main-image-upload" className="edit-modal__upload-btn">
                    <Upload size={18} />
                    <span>Subir imagen principal</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={draft.image || ""}
                  onChange={(e) => handleChange("image", e.target.value)}
                  placeholder="https://... o data:image/..."
                  className="edit-modal__url-input"
                />
              </div>
            </div>

            {/* VISTA PREVIA IMAGEN PRINCIPAL */}
            {draft.image && (
              <div className="edit-modal__field edit-modal__field--full">
                <label>Vista previa (imagen principal)</label>
                <div className="edit-modal__preview">
                  <img src={draft.image} alt="Vista previa principal" />
                </div>
              </div>
            )}

            {/* ===== IMÁGENES ADICIONALES ===== */}
            <div className="edit-modal__field edit-modal__field--full">
              <div className="edit-modal__section-header">
                <label>Imágenes adicionales</label>
                <span className="edit-modal__section-hint">
                  Estas imágenes aparecerán al final del PDF
                </span>
              </div>
              
              <div className="edit-modal__upload-group">
                <div className="edit-modal__upload">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    id="additional-images-upload"
                    onChange={handleMultipleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="additional-images-upload" className="edit-modal__upload-btn edit-modal__upload-btn--secondary">
                    <Plus size={18} />
                    <span>Añadir imágenes</span>
                  </label>
                </div>
              </div>

              {/* Galería de imágenes adicionales */}
              {draft.images && draft.images.length > 0 && (
                <div className="edit-modal__gallery">
                  <label>Galería ({draft.images.length} imágenes)</label>
                  <div className="edit-modal__gallery-grid">
                    {draft.images.map((img, index) => (
                      <div key={index} className="edit-modal__gallery-item">
                        <img src={img} alt={`Imagen adicional ${index + 1}`} />
                        <button
                          className="edit-modal__gallery-remove"
                          onClick={() => onRemoveImage?.(index)}
                          title="Eliminar imagen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resumen de cotización (si aplica) */}
          {documentType === "quote" && (
            <div className="edit-modal__summary">
              <h4>Resumen de la cotización</h4>
              <div className="edit-modal__summary-grid">
                <div>
                  <span>VR. UNIT</span>
                  <strong>{formatMoney(quote.unitValue, currency)}</strong>
                </div>
                <div>
                  <span>CANTIDAD</span>
                  <strong>{quote.quantity}</strong>
                </div>
                <div>
                  <span>SUBTOTAL</span>
                  <strong>{formatMoney(quote.subtotal, currency)}</strong>
                </div>
                <div>
                  <span>IVA</span>
                  <strong>{quote.ivaRate}%</strong>
                </div>
                <div className="full-width">
                  <span>TOTAL</span>
                  <strong>{formatMoney(quote.total, currency)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="edit-modal__footer">
          <button className="edit-modal__btn edit-modal__btn--cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="edit-modal__btn edit-modal__btn--save" onClick={onSave}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditProductModal;