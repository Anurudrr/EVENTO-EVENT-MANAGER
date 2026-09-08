import express from 'express';
import multer from 'multer';
import {
  getProfile,
  uploadProfilePicture,
  updateProfile,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  toggleWishlist,
} from '../controllers/userController.ts';
import { protect } from '../middleware/authMiddleware.ts';
import { checkImageFile } from '../utils/upload.ts';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    checkImageFile(file, cb);
  },
});
const profilePictureUpload = upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'profilePicture', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

router.use(protect);

router.get('/profile', getProfile);
router.post('/upload-pfp', profilePictureUpload, uploadProfilePicture);
router.put('/profile', profilePictureUpload, updateProfile);
router.get('/wishlist', getWishlist);
router.put('/wishlist/:serviceId/toggle', toggleWishlist);
router.post('/wishlist/:serviceId', addToWishlist);
router.delete('/wishlist/:serviceId', removeFromWishlist);

export default router;
