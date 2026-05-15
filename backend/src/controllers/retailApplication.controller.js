const prisma = require("../prisma/client");
const { logAudit } = require("../utils/auditLogger");
const { UserRole, LicenseType, LicenseStatus, ApplicationStatus } = require('@prisma/client');

const validateSelectedDistributors = async (distributorIds) => {
  if (distributorIds === undefined) {
    return { ok: true, distributorIds: null };
  }

  if (distributorIds === null) {
    return { ok: true, distributorIds: [] };
  }

  if (!Array.isArray(distributorIds)) {
    return { ok: false, message: "distributorIds must be an array" };
  }

  const normalizedIds = [...new Set(distributorIds.filter(Boolean))];
  if (!normalizedIds.length) {
    return { ok: true, distributorIds: [] };
  }

  const distributors = await prisma.user.findMany({
    where: {
      id: { in: normalizedIds },
      role: UserRole.DISTRIBUTOR,
    },
    include: {
      licenses: {
        where: {
          type: LicenseType.DISTRIBUTION,
          status: LicenseStatus.ACTIVE,
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
        },
        take: 1,
      },
    },
  });

  if (distributors.length !== normalizedIds.length) {
    return { ok: false, message: "One or more selected distributors are invalid" };
  }

  const invalidDistributor = distributors.find((d) => !d.licenses.length);
  if (invalidDistributor) {
    return {
      ok: false,
      message: `Distributor ${invalidDistributor.companyName || invalidDistributor.fullName} has no active distribution license`,
    };
  }

  return { ok: true, distributorIds: normalizedIds };
};


const createRetailApplication = async (req, res) => {
  try {
    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      businessName,
      businessAddress,
      district,
      province,
      outletType,
      taxIdentificationNo,
      premisesOwnershipType,
      deedOrLeaseReference,
      touristBoardApprovalRef,
      filmCorporationApprovalRef,
      clubApprovalRef,
      tradeLicenseRef,
      liquorSaleMode,
      seatingCapacity,
      distributorIds,
      remarks,
    } = req.body;

    
    if (!applicantName || !applicantEmail || !businessName || !businessAddress || !district || !province || !outletType || !premisesOwnershipType) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const distributorsValidation = await validateSelectedDistributors(distributorIds);
    if (!distributorsValidation.ok) {
      return res.status(400).json({ success: false, message: distributorsValidation.message });
    }

    
    const appCount = await prisma.retailApplication.count();
    const applicationNo = `RTL-APP-${String(appCount + 1).padStart(5, "0")}`;

    const createData = {
      applicationNo,
      applicantName,
      applicantEmail,
      applicantPhone,
      businessName,
      businessAddress,
      district,
      province,
      outletType,
      taxIdentificationNo,
      premisesOwnershipType,
      deedOrLeaseReference,
      touristBoardApprovalRef,
      filmCorporationApprovalRef,
      clubApprovalRef,
      tradeLicenseRef,
      liquorSaleMode,
      seatingCapacity,
      remarks,
      status: ApplicationStatus.DRAFT,
      submittedById: req.user?.id || null,
    };

    if (distributorsValidation.distributorIds?.length) {
      createData.selectedDistributors = {
        createMany: {
          data: distributorsValidation.distributorIds.map((distributorId) => ({ distributorId })),
        },
      };
    }

    const application = await prisma.retailApplication.create({
      data: createData,
    });

    await logAudit({
      userId: req.user?.id ?? null,
      action: 'CREATE',
      entityType: 'RETAIL_APPLICATION',
      entityId: application.id,
      newValues: application,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    res.status(201).json({
      success: true,
      message: "Retail application created successfully",
      data: application,
    });
  } catch (error) {
    console.error("Error creating retail application:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const getRetailApplications = async (req, res) => {
  try {
    const { status, district, outletType, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (district) where.district = district;
    if (outletType) where.outletType = outletType;
    if (search) {
      where.OR = [
        { applicationNo: { contains: search } },
        { applicantName: { contains: search } },
        { businessName: { contains: search } },
        { applicantEmail: { contains: search } },
      ];
    }

    const applications = await prisma.retailApplication.findMany({
      where,
      include: {
        submittedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
        selectedDistributors: {
          include: {
            distributor: {
              select: { id: true, fullName: true, companyName: true, email: true },
            },
          },
        },
        issuedLicense: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error("Error fetching retail applications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const getRetailApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.retailApplication.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
        selectedDistributors: {
          include: {
            distributor: {
              select: { id: true, fullName: true, companyName: true, email: true },
            },
          },
        },
        issuedLicense: true,
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
    console.error("Error fetching retail application:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateRetailApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await prisma.retailApplication.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    
    if (existing.status !== ApplicationStatus.DRAFT && req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ success: false, message: "Cannot update submitted applications" });
    }

    const { distributorIds, ...applicationUpdates } = updates;

    let validatedDistributorIds = null;
    if (distributorIds !== undefined) {
      const distributorsValidation = await validateSelectedDistributors(distributorIds);
      if (!distributorsValidation.ok) {
        return res.status(400).json({ success: false, message: distributorsValidation.message });
      }
      validatedDistributorIds = distributorsValidation.distributorIds;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (validatedDistributorIds !== null) {
        await tx.retailApplicationDistributor.deleteMany({ where: { retailApplicationId: id } });
      }

      const updatedApplication = await tx.retailApplication.update({
        where: { id },
        data: applicationUpdates,
        include: {
          submittedBy: { select: { id: true, fullName: true, email: true } },
          reviewedBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      if (validatedDistributorIds !== null && validatedDistributorIds.length) {
        await tx.retailApplicationDistributor.createMany({
          data: validatedDistributorIds.map((distributorId) => ({ retailApplicationId: id, distributorId })),
        });
      }

      return tx.retailApplication.findUnique({
        where: { id: updatedApplication.id },
        include: {
          submittedBy: { select: { id: true, fullName: true, email: true } },
          reviewedBy: { select: { id: true, fullName: true, email: true } },
          selectedDistributors: {
            include: {
              distributor: {
                select: { id: true, fullName: true, companyName: true, email: true },
              },
            },
          },
        },
      });
    });

    await logAudit({
      userId: req.user?.id ?? null,
      action: 'UPDATE',
      entityType: 'RETAIL_APPLICATION',
      entityId: id,
      oldValues: existing,
      newValues: updated,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    res.status(200).json({
      success: true,
      message: "Retail application updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating retail application:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateRetailApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const validStatuses = Object.values(ApplicationStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const existing = await prisma.retailApplication.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const updated = await prisma.retailApplication.update({
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
      entityType: 'RETAIL_APPLICATION',
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
    console.error("Error updating retail application status:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const issueRetailLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { licenseCategory, remarks } = req.body;

    const application = await prisma.retailApplication.findUnique({
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
    const licenseNumber = `LIC-RTL-${String(licenseCount + 1).padStart(6, "0")}`;

    const rawLicenseType = licenseCategory || application.outletType;
    const resolvedLicenseType = Object.values(LicenseType).includes(rawLicenseType)
      ? rawLicenseType
      : LicenseType.RETAIL;

    const license = await prisma.license.create({
      data: {
        licenseNumber,
        type: resolvedLicenseType,
        status: LicenseStatus.ACTIVE,
        companyName: application.businessName,
        businessAddress: application.businessAddress,
        taxIdentificationNo: application.taxIdentificationNo,
        issueDate: new Date(),
        effectiveFrom: new Date(),
        effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        remarks,
        holderId: user.id,
        retailApplicationId: id,
      },
      include: { holder: true },
    });

    await logAudit({
      userId: req.user?.id ?? null,
      action: 'ISSUE_LICENSE',
      entityType: 'RETAIL_APPLICATION',
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
    console.error("Error issuing retail license:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadRetailApplicationFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { category = "GENERAL" } = req.body;

    const application = await prisma.retailApplication.findUnique({ where: { id } });
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
        retailApplicationId: id,
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
    console.error("Error uploading retail application file:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRetailApplication,
  getRetailApplications,
  getRetailApplicationById,
  updateRetailApplication,
  updateRetailApplicationStatus,
  issueRetailLicense,
  uploadRetailApplicationFile,
};
