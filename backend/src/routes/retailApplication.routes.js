const express = require("express");
const authenticate = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");
const {
  createRetailApplication,
  getRetailApplications,
  getRetailApplicationById,
  updateRetailApplication,
  updateRetailApplicationStatus,
  issueRetailLicense,
  uploadRetailApplicationFile,
} = require("../controllers/retailApplication.controller");

const router = express.Router();


router.post("/", createRetailApplication);


router.get("/", authenticate, getRetailApplications);
router.get("/:id", authenticate, getRetailApplicationById);
router.patch("/:id", authenticate, updateRetailApplication);


router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles(["ADMIN", "ED_OFFICER"]),
  updateRetailApplicationStatus
);

router.post(
  "/:id/issue-license",
  authenticate,
  authorizeRoles(["ADMIN"]),
  issueRetailLicense
);

router.post(
  "/:id/upload",
  upload.single("file"),
  uploadRetailApplicationFile
);

module.exports = router;
