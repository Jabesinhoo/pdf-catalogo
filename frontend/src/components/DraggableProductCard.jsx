import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { GripVertical } from 'lucide-react';
import ProductCard from './ProductCard';

const ItemTypes = {
  PRODUCT: 'product'
};

function DraggableProductCard({
  product,
  index,
  moveProduct,
  ...props
}) {
  const ref = useRef(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.PRODUCT,
    item: () => ({ id: product.id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, dragDirection }, drop] = useDrop({
    accept: ItemTypes.PRODUCT,
    hover: (item, monitor) => {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      if (dragIndex === hoverIndex) return;
      
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      // Obtener las coordenadas del mouse relativas al elemento
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      
      // Umbrales para determinar si mover (50% del elemento)
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Para grids, podemos mover en cualquier dirección
      // Si el drag está antes y el mouse está en la mitad inferior/derecha, mover
      // Si el drag está después y el mouse está en la mitad superior/izquierda, mover
      
      let shouldMove = false;
      
      if (dragIndex < hoverIndex) {
        // Arrastrando hacia abajo/derecha
        if (hoverClientY > hoverMiddleY || hoverClientX > hoverMiddleX) {
          shouldMove = true;
        }
      } else {
        // Arrastrando hacia arriba/izquierda
        if (hoverClientY < hoverMiddleY || hoverClientX < hoverMiddleX) {
          shouldMove = true;
        }
      }
      
      if (shouldMove) {
        moveProduct(dragIndex, hoverIndex);
        item.index = hoverIndex;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      dragDirection: (() => {
        if (!monitor.isOver()) return null;
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset || !ref.current) return null;
        
        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const hoverClientX = clientOffset.x - hoverBoundingRect.left;
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        
        if (hoverClientY < hoverMiddleY && hoverClientX < hoverMiddleX) return 'top-left';
        if (hoverClientY < hoverMiddleY && hoverClientX > hoverMiddleX) return 'top-right';
        if (hoverClientY > hoverMiddleY && hoverClientX < hoverMiddleX) return 'bottom-left';
        if (hoverClientY > hoverMiddleY && hoverClientX > hoverMiddleX) return 'bottom-right';
        return null;
      })(),
    }),
  });

  // Conectar drag y drop al mismo elemento
  drag(drop(ref));

  const opacity = isDragging ? 0.4 : 1;
  
  // Estilos de borde según la dirección de hover
  let borderStyle = 'none';
  let borderGradient = '';
  
  if (isOver) {
    if (dragDirection === 'top-left') {
      borderStyle = '2px solid var(--accent)';
      borderGradient = 'linear-gradient(135deg, var(--accent) 0%, transparent 50%)';
    } else if (dragDirection === 'top-right') {
      borderStyle = '2px solid var(--accent)';
      borderGradient = 'linear-gradient(225deg, var(--accent) 0%, transparent 50%)';
    } else if (dragDirection === 'bottom-left') {
      borderStyle = '2px solid var(--accent)';
      borderGradient = 'linear-gradient(45deg, var(--accent) 0%, transparent 50%)';
    } else if (dragDirection === 'bottom-right') {
      borderStyle = '2px solid var(--accent)';
      borderGradient = 'linear-gradient(315deg, var(--accent) 0%, transparent 50%)';
    } else {
      borderStyle = '2px solid var(--accent)';
    }
  }
  
  const bgStyle = isOver ? 'rgba(138, 166, 70, 0.15)' : 'transparent';
  const transform = isDragging ? 'scale(0.98)' : 'scale(1)';

  return (
    <div
      ref={ref}
      className="draggable-product-card"
      style={{ 
        opacity, 
        border: borderStyle,
        background: bgStyle,
        transform: transform,
        transition: 'all 0.2s ease',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div className="drag-handle" style={{ cursor: 'grab' }}>
        <GripVertical size={18} />
      </div>
      <ProductCard product={product} {...props} />
    </div>
  );
}

export default DraggableProductCard;