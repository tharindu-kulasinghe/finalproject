const express = require("express");
const authenticate = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");
const {
  createDistributionApplication,
  getDistributionApplications,
  getDistributionApplicationById,
  updateDistributionApplication,
  updateDistributionApplicationStatus,
  issueDistributionLicense,
  uploadDistributionApplicationFile,
} = require("../controllers/distributionApplication.controller");

const router = express.Router();


router.post("/", createDistributionApplication);


router.get("/", authenticate, getDistributionApplications);
router.get("/:id", authenticate, getDistributionApplicationById);
router.patch("/:id", authenticate, updateDistributionApplication);


router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles(["ADMIN", "ED_OFFICER"]),
  updateDistributionApplicationStatus
);

router.post(
  "/:id/issue-license",
  authenticate,
  authorizeRoles(["ADMIN"]),
  issueDistributionLicense
);

router.post(
  "/:id/upload",
  upload.single("file"),
  uploadDistributionApplicationFile
);

module.exports = router;
