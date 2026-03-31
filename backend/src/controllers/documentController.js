const db = require('../services/databaseService');
const { v4: uuidv4 } = require('uuid');

async function saveDocument(req, res) {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'El userId es requerido' 
      });
    }

    const document = {
      id: req.body.id || uuidv4(),
      type: req.body.type,
      title: req.body.title,
      products: req.body.products || [],
      quoteMeta: req.body.quoteMeta || {},
      orientation: req.body.orientation || 'portrait',
      productCount: req.body.productCount || req.body.products?.length || 0,
      customerName: req.body.customerName || req.body.quoteMeta?.customerName,
      pdfUrl: req.body.pdfUrl,
      userId: userId,
      createdAt: req.body.createdAt || new Date().toISOString()
    };

    const saved = await db.saveDocument(document);
    res.json({ success: true, document: saved });
  } catch (error) {
    console.error('❌ Error guardando documento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error guardando documento',
      error: error.message 
    });
  }
}

async function getDocuments(req, res) {
  try {

    
    const { searchTerm, type, sortBy, userId, user } = req.query;
    
    // Aceptar tanto 'userId' como 'user' (por si acaso)
    const effectiveUserId = userId || user;
    
    if (!effectiveUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'El userId es requerido',
        received: req.query  // 👈 Enviar lo que se recibió
      });
    }
    
    const documents = await db.searchDocuments({ 
      searchTerm, 
      type, 
      sortBy, 
      userId: effectiveUserId 
    });
    
    res.json({ success: true, documents });
  } catch (error) {
    console.error('❌ Error obteniendo documentos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo documentos',
      error: error.message 
    });
  }
}

async function getDocumentById(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'El userId es requerido' 
      });
    }
    
    const document = await db.getDocumentById(id, userId);
    
    if (!document) {
      return res.status(404).json({ 
        success: false, 
        message: 'Documento no encontrado' 
      });
    }
    
    res.json({ success: true, document });
  } catch (error) {
    console.error('❌ Error obteniendo documento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo documento',
      error: error.message 
    });
  }
}

async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'El userId es requerido' 
      });
    }
    
    const deleted = await db.deleteDocument(id, userId);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: 'Documento no encontrado' 
      });
    }
    
    res.json({ success: true, message: 'Documento eliminado' });
  } catch (error) {
    console.error('❌ Error eliminando documento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error eliminando documento',
      error: error.message 
    });
  }
}

async function updateDocument(req, res) {
  try {
    const { id } = req.params;
    const { userId, ...updates } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'El userId es requerido' 
      });
    }
    
    const updated = await db.updateDocument(id, userId, updates);
    
    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        message: 'Documento no encontrado' 
      });
    }
    
    res.json({ success: true, document: updated });
  } catch (error) {
    console.error('❌ Error actualizando documento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error actualizando documento',
      error: error.message 
    });
  }
}

async function getAllUsers(req, res) {
  try {
    const users = await db.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo usuarios',
      error: error.message 
    });
  }
}

module.exports = {
  saveDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  updateDocument,
  getAllUsers
};