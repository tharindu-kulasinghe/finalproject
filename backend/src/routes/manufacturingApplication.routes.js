const express = require("express");
const authenticate = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");
const {
  createManufacturingApplication,
  getManufacturingApplications,
  getManufacturingApplicationById,
  updateManufacturingApplication,
  updateManufacturingApplicationStatus,
  issueManufacturingLicense,
  uploadManufacturingApplicationFile,
} = require("../controllers/manufacturingApplication.controller");

const router = express.Router();


router.post("/", createManufacturingApplication);


router.get("/", authenticate, getManufacturingApplications);
router.get("/:id", authenticate, getManufacturingApplicationById);
router.patch("/:id", authenticate, updateManufacturingApplication);


router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles(["ADMIN", "ED_OFFICER"]),
  updateManufacturingApplicationStatus
);

router.post(
  "/:id/issue-license",
  authenticate,
  authorizeRoles(["ADMIN"]),
  issueManufacturingLicense
);

router.post(
  "/:id/upload",
  upload.single("file"),
  uploadManufacturingApplicationFile
);

module.exports = router;
