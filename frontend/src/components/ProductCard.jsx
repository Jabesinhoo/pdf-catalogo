import { ExternalLink, Copy, Square, CheckSquare, Edit2, Trash2, Package } from "lucide-react";
import { formatMoney, parseMoney } from "../utils/quoteMath";
import { useState } from "react";

function ProductCard({
  product,
  checked = false,
  onToggle,
  onEdit,
  onRemove,
  onDuplicate,
  onChange,
  documentType = "catalog",
  userRole = "asesor",
  isSelectedForBatch = false,
  onSelectForBatch = null,
}) {

  // Estado local para la cantidad
  const [localQuantity, setLocalQuantity] = useState(String(product?.quantity ?? 1));
  const [isEditing, setIsEditing] = useState(false);

  // Calcular cantidad actual (local si se está editando, sino la del producto)
  const currentQuantity = isEditing
    ? (parseInt(localQuantity, 10) || 0)
    : (product?.quantity ?? 1);

  function handleCardClick(e) {
    if (
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'SELECT' ||
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('select')
    ) {
      return;
    }

    if (product.productUrl) {
      window.open(product.productUrl, '_blank', 'noopener,noreferrer');
    }
  }

  // Sincronizar cuando el producto cambia externamente
  if (!isEditing && String(product?.quantity ?? 1) !== localQuantity) {
    setLocalQuantity(String(product?.quantity ?? 1));
  }

  // Calcular precio sin IVA (el precio original ya incluye IVA)
  const calculatePriceWithoutIva = () => {
    if (!product?.price) return null;

    const priceWithIva = parseMoney(product.price);
    let ivaRate = 0;

    if (product.ivaType === 'gravado5') ivaRate = 5;
    else if (product.ivaType === 'gravado' || product.ivaType === 'gravado19') ivaRate = 19;
    else ivaRate = product.ivaRate || 0;

    if (ivaRate === 0) return formatMoney(priceWithIva);
    const priceWithoutIva = Math.round(priceWithIva / (1 + ivaRate / 100));
    return formatMoney(priceWithoutIva);
  };

  // Calcular monto del IVA
  const calculateIvaAmount = () => {
    if (!product?.price) return null;

    const priceWithIva = parseMoney(product.price);
    let ivaRate = 0;

    if (product.ivaType === 'gravado5') ivaRate = 5;
    else if (product.ivaType === 'gravado' || product.ivaType === 'gravado19') ivaRate = 19;
    else ivaRate = product.ivaRate || 0;

    if (ivaRate === 0) return null;
    const priceWithoutIva = Math.round(priceWithIva / (1 + ivaRate / 100));
    const ivaAmount = priceWithIva - priceWithoutIva;
    return formatMoney(ivaAmount);
  };

  const priceWithIva = formatMoney(parseMoney(product?.price || 0));
  const priceWithoutIva = calculatePriceWithoutIva();
  const ivaAmount = calculateIvaAmount();
  const isGravado = product.ivaType === 'gravado' || product.ivaType === 'gravado19' || product.ivaType === 'gravado5';
  const isExento = product.ivaType === 'exento';
  const isExcluido = product.ivaType === 'excluido';

  // Calcular total en tiempo real
  const calculateTotal = () => {
    if (!product?.price) return null;
    const priceWithIva = parseMoney(product.price);
    const quantity = Math.max(1, currentQuantity);
    const total = priceWithIva * quantity;
    return formatMoney(total);
  };

  const totalValue = calculateTotal();

  // Obtener el texto del tipo de IVA
  const getIvaTypeText = () => {
    if (isExcluido) return 'Excluido';
    if (isExento) return 'Exento 0%';
    if (product.ivaType === 'gravado5') return `Gravado 5%`;
    return `Gravado ${product.ivaRate || 19}%`;
  };

  // Manejar cambio de cantidad
  const handleQuantityChange = (e) => {
    setLocalQuantity(e.target.value);
    setIsEditing(true);
  };

  // Manejar al perder el foco
  const handleQuantityBlur = () => {
    let newQuantity = parseInt(localQuantity, 10);

    if (isNaN(newQuantity) || localQuantity.trim() === "") {
      newQuantity = 1;
      setLocalQuantity("1");
    }

    newQuantity = Math.max(1, newQuantity);
    setLocalQuantity(String(newQuantity));

    if (newQuantity !== product.quantity) {
      onChange?.({ quantity: newQuantity });
    }
    setIsEditing(false);
  };

  // 👇 OBTENER STOCK DEL PRODUCTO (si existe)
  const stock = product?.stock ?? product?.stock_quantity ?? null;
  const hasStock = stock !== null && stock !== undefined;

  return (
    <article
      className={`product-card ${product.productUrl ? 'clickable' : ''} ${isSelectedForBatch ? 'batch-selected' : ''}`}
      onClick={handleCardClick}
    >
      {/* Checkbox de selección masiva */}
      {onSelectForBatch && (
        <button
          type="button"
          className="product-card__batch-checkbox"
          onClick={(e) => {
            e.stopPropagation();
            onSelectForBatch(product.id);
          }}
          title={isSelectedForBatch ? "Deseleccionar para eliminar" : "Seleccionar para eliminar"}
        >
          {isSelectedForBatch ? <CheckSquare size={20} /> : <Square size={20} />}
        </button>
      )}

      {/* Barra de acciones superior */}
      <div className="product-card__actions-bar">
        <button
          className="product-card__action-btn product-card__action-btn--toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          title={checked ? "Excluir del PDF" : "Incluir en PDF"}
        >
          {checked ? <CheckSquare size={18} /> : <Square size={18} />}
        </button>

        <button
          className="product-card__action-btn product-card__action-btn--edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Editar producto"
        >
          <Edit2 size={18} />
        </button>

        <button
          className="product-card__action-btn product-card__action-btn--duplicate"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate?.();
          }}
          title="Duplicar producto"
        >
          <Copy size={18} />
        </button>

        <button
          className="product-card__action-btn product-card__action-btn--delete"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Eliminar producto"
        >
          <Trash2 size={18} />
        </button>

        {product.productUrl && (
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="product-card__action-btn product-card__action-btn--link"
            onClick={(e) => e.stopPropagation()}
            title="Ver producto en Tecnonacho.com"
          >
            <ExternalLink size={18} />
          </a>
        )}
      </div>

      {/* Imagen */}
      <div className="product-card__image">
        {product?.image ? (
          <img src={product.image} alt={product.name || "Producto"} />
        ) : (
          <div className="product-card__image-placeholder">
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="product-card__content">
        <h3 className="product-card__title">{product?.name || "Sin nombre"}</h3>

        <div className="product-card__details">
          <div className="product-card__detail-row">
            <span className="product-card__detail-label">SKU</span>
            <span className="product-card__detail-value">{product?.sku || "N/D"}</span>
          </div>

          <div className="product-card__detail-row">
            <span className="product-card__detail-label">Precio (IVA incl.)</span>
            <span className="product-card__detail-value price">{priceWithIva}</span>
          </div>

          {product?.stockDisplay && (
            <div className="product-card__detail-row">
              <span className="product-card__detail-label">
                Disponibilidad
              </span>
              <span className={`product-card__stock-value ${product?.stockStatus === 'instock' ? 'stock-in' : product?.stockStatus === 'onbackorder' ? 'stock-backorder' : 'stock-out'}`}>
                {product.stockDisplay}
              </span>
            </div>
          )}

          {/* Mostrar desglose de IVA solo si es gravado */}
          {isGravado && ivaAmount && (
            <>
              <div className="product-card__detail-row">
                <span className="product-card__detail-label">Precio sin IVA</span>
                <span className="product-card__detail-value">{priceWithoutIva}</span>
              </div>
              <div className="product-card__detail-row">
                <span className="product-card__detail-label">IVA</span>
                <span className="product-card__detail-value iva-amount">{ivaAmount}</span>
              </div>
            </>
          )}

          {/* Badge de tipo de IVA */}
          <div className="product-card__detail-row">
            <span className="product-card__detail-label">Tipo IVA</span>
            <span className={`product-card__iva-badge ${isExcluido ? 'excluido' : isExento ? 'exento' : 'gravado'}`}>
              {getIvaTypeText()}
            </span>
          </div>

          {documentType === "quote" && (
            <>
              <div className="product-card__detail-row">
                <span className="product-card__detail-label">Cantidad</span>
                <span className="product-card__detail-value">{currentQuantity}</span>
              </div>
              {totalValue && (
                <div className="product-card__detail-row total">
                  <span className="product-card__detail-label">Total</span>
                  <span className="product-card__detail-value total-value">{totalValue}</span>
                </div>
              )}
            </>
          )}
        </div>

        <p className="product-card__description">
          {product?.shortDescription || "Sin descripción corta"}
        </p>

        {/* Campos de edición */}
        <div className="product-card__edit-fields">
          <div className="product-card__field-group">
            <label>Tipo IVA</label>
            <select
              value={product?.ivaType || 'gravado'}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                onChange?.({
                  ivaType: e.target.value,
                  ivaRate: e.target.value === 'excluido' ? 0 : (e.target.value === 'gravado5' ? 5 : 19)
                })
              }
            >
              <option value="gravado">Gravado 19%</option>
              <option value="gravado5">Gravado 5%</option>
              <option value="exento">Exento 0%</option>
              <option value="excluido">Excluido</option>
            </select>
          </div>

          {product?.ivaType !== 'excluido' && product?.ivaType !== 'exento' && (
            <div className="product-card__field-group">
              <label>IVA %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={product?.ivaRate || 19}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  onChange?.({
                    ivaRate: Number(e.target.value)
                  })
                }
              />
            </div>
          )}

          {documentType === "quote" && (
            <>
              <div className="product-card__field-group">
                <label>Cantidad</label>
                <input
                  type="text"
                  value={localQuantity}
                  onClick={(e) => e.stopPropagation()}
                  onChange={handleQuantityChange}
                  onBlur={handleQuantityBlur}
                />
              </div>

              <div className="product-card__field-group full-width">
                <label>Total manual</label>
                <input
                  type="text"
                  value={product?.totalPrice || ""}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    onChange?.({
                      totalPrice: e.target.value,
                    })
                  }
                  placeholder="Opcional"
                />
              </div>

              {totalValue && !product?.totalPrice && (
                <div className="product-card__calculated-total">
                  Calculado: <strong>{totalValue}</strong>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default ProductCard;