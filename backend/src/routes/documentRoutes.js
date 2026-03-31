const express = require('express');
const router = express.Router();
const {
  saveDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  updateDocument,
  getAllUsers
} = require('../controllers/documentController');

router.post('/', saveDocument);
router.get('/', getDocuments);
router.get('/users', getAllUsers);
router.get('/:id', getDocumentById);
router.delete('/:id', deleteDocument);
router.put('/:id', updateDocument);

module.exports = router;