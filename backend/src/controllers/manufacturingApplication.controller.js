const prisma = require("../prisma/client");
const { logAudit } = require("../utils/auditLogger");
const { ApplicationStatus, LicenseType, LicenseStatus, UserRole } = require('@prisma/client');


const createManufacturingApplication = async (req, res) => {
  try {
    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      companyName,
      companyRegistrationNo,
      taxIdentificationNo,
      businessAddress,
      district,
      province,
      premisesOwnershipType,
      deedOrLeaseReference,
      productType,
      proposedProducts,
      manufacturingType,
      rawMaterialDetails,
      productionCapacity,
      environmentalApprovalRef,
      fireSafetyApprovalRef,
      otherGovernmentApprovals,
      remarks,
    } = req.body;

    const normalizedProposedProducts = Array.isArray(proposedProducts) ? proposedProducts : [];
    if (proposedProducts !== undefined && !Array.isArray(proposedProducts)) {
      return res.status(400).json({ success: false, message: "proposedProducts must be an array when provided" });
    }
    if (normalizedProposedProducts.length !== 1) {
      return res.status(400).json({ success: false, message: "Exactly one proposed product is required per license application" });
    }
    if (normalizedProposedProducts.some((item) => !item?.category || !item?.name)) {
      return res.status(400).json({ success: false, message: "Each proposed product must include category and name" });
    }

    const derivedProductType = productType || [...new Set(normalizedProposedProducts.map((item) => item.category))].join(', ');

    
    if (!applicantName || !applicantEmail || !companyName || !businessAddress || !district || !province || !premisesOwnershipType) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    
    const appCount = await prisma.manufacturingApplication.count();
    const applicationNo = `MFG-APP-${String(appCount + 1).padStart(5, "0")}`;

    const application = await prisma.manufacturingApplication.create({
      data: {
        applicationNo,
        applicantName,
        applicantEmail,
        applicantPhone,
        companyName,
        companyRegistrationNo,
        taxIdentificationNo,
        businessAddress,
        district,
        province,
        premisesOwnershipType,
        deedOrLeaseReference,
        productType: derivedProductType,
        proposedProductsJson: normalizedProposedProducts.length ? JSON.stringify(normalizedProposedProducts) : null,
        manufacturingType,
        rawMaterialDetails,
        productionCapacity,
        environmentalApprovalRef,
        fireSafetyApprovalRef,
        otherGovernmentApprovals,
        remarks,
        status: ApplicationStatus.DRAFT,
        submittedById: req.user?.id || null,
      },
    });

    await logAudit({
      userId: req.user?.id ?? null,
      action: 'CREATE',
      entityType: 'MANUFACTURING_APPLICATION',
      entityId: application.id,
      newValues: application,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    res.status(201).json({
      success: true,
      message: "Manufacturing application created successfully",
      data: application,
    });
  } catch (error) {
    console.error("Error creating manufacturing application:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const getManufacturingApplications = async (req, res) => {
  try {
    const { status, district, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (district) where.district = district;
    if (search) {
      where.OR = [
        { applicationNo: { contains: search } },
        { applicantName: { contains: search } },
        { companyName: { contains: search } },
        { applicantEmail: { contains: search } },
      ];
    }

    const applications = await prisma.manufacturingApplication.findMany({
      where,
      include: {
        submittedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
        issuedLicense: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error("Error fetching manufacturing applications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const getManufacturingApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.manufacturingApplication.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
        issuedLicense: true,
        files: {
          orderBy: { createdAt: 'desc' }
        },
      },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error("Error fetching manufacturing application:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateManufacturingApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await prisma.manufacturingApplication.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    
    if (existing.status !== ApplicationStatus.DRAFT && req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ success: false, message: "Cannot update submitted applications" });
    }

    const updated = await prisma.manufacturingApplication.update({
      where: { id },
      data: updates,
      include: {
        submittedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await logAudit({
      userId: req.user?.id ?? null,
      action: 'UPDATE',
      entityType: 'MANUFACTURING_APPLICATION',
      entityId: id,
      oldValues: existing,
      newValues: updated,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    res.status(200).json({
      success: true,
      message: "Manufacturing application updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating manufacturing application:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateManufacturingApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const validStatuses = Object.values(ApplicationStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const existing = await prisma.manufacturingApplication.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const updated = await prisma.manufacturingApplication.update({
      where: { id },
      data: {
        status,
        remarks,
        reviewedById: req.user?.id,
        reviewedAt: new Date(),
      },
      include: {
        submittedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await logAudit({
      userId: req.user?.id ?? null,
      action: 'UPDATE_STATUS',
      entityType: 'MANUFACTURING_APPLICATION',
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: updated.status },
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating manufacturing application status:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const issueManufacturingLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const application = await prisma.manufacturingApplication.findUnique({
      where: { id },
      include: { submittedBy: true, issuedLicense: true },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (application.status !== ApplicationStatus.APPROVED) {
      return res.status(400).json({ success: false, message: "Only approved applications can be issued licenses" });
    }

    if (application.issuedLicense) {
      return res.status(400).json({ success: false, message: "License already issued for this application" });
    }

    
    const user = application.submittedBy;
    if (!user) {
      return res.status(400).json({ success: false, message: "Application submitter not found" });
    }

    
    const licenseCount = await prisma.license.count();
    const licenseNumber = `LIC-MFG-${String(licenseCount + 1).padStart(6, "0")}`;

    const license = await prisma.license.create({
      data: {
        licenseNumber,
        type: LicenseType.MANUFACTURING,
        status: LicenseStatus.ACTIVE,
        companyName: application.companyName,
        businessAddress: application.businessAddress,
        taxIdentificationNo: application.taxIdentificationNo,
        issueDate: new Date(),
        effectiveFrom: new Date(),
        effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        remarks,
        holderId: user.id,
        manufacturingApplicationId: id,
      },
      include: { holder: true },
    });

    await logAudit({
      userId: req.user?.id ?? null,
      action: 'ISSUE_LICENSE',
      entityType: 'MANUFACTURING_APPLICATION',
      entityId: id,
      newValues: license,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    res.status(201).json({
      success: true,
      message: "License issued successfully",
      data: license,
    });
  } catch (error) {
    console.error("Error issuing manufacturing license:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadManufacturingApplicationFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { category = "GENERAL" } = req.body;

    const application = await prisma.manufacturingApplication.findUnique({ where: { id } });
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const supportedFileTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!supportedFileTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: "Unsupported file type" });
    }

    const applicationFile = await prisma.applicationFile.create({
      data: {
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        category,
        manufacturingApplicationId: id,
      },
    });

    return res.status(201).json({
      message: "File uploaded successfully",
      file: {
        id: applicationFile.id,
        fileName: applicationFile.fileName,
        fileUrl: applicationFile.fileUrl,
        category: applicationFile.category,
      },
    });
  } catch (error) {
    console.error("Error uploading manufacturing application file:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createManufacturingApplication,
  getManufacturingApplications,
  getManufacturingApplicationById,
  updateManufacturingApplication,
  updateManufacturingApplicationStatus,
  issueManufacturingLicense,
  uploadManufacturingApplicationFile,
};
