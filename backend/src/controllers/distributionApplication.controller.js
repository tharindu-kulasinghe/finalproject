const prisma = require("../prisma/client");
const { logAudit } = require("../utils/auditLogger");
const { UserRole, LicenseType, LicenseStatus, ApplicationStatus } = require('@prisma/client');

const validateSelectedManufacturers = async (manufacturerIds) => {
  if (!Array.isArray(manufacturerIds) || manufacturerIds.length === 0) {
    return { ok: false, message: "At least one manufacturer is required" };
  }

  const normalizedIds = [...new Set(manufacturerIds.filter(Boolean))];
  if (!normalizedIds.length) {
    return { ok: false, message: "At least one manufacturer is required" };
  }

  const now = new Date();
  const manufacturers = await prisma.user.findMany({
    where: { id: { in: normalizedIds } },
    include: {
      licenses: {
        where: {
          type: LicenseType.MANUFACTURING,
          status: LicenseStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        },
        take: 1,
      },
    },
  });

  if (manufacturers.length !== normalizedIds.length) {
    return { ok: false, message: "One or more selected manufacturers were not found" };
  }

  const invalidRole = manufacturers.find((item) => item.role !== UserRole.MANUFACTURER);
  if (invalidRole) {
    return { ok: false, message: "One or more selected users are not manufacturers" };
  }

  const inactive = manufacturers.find((item) => !item.licenses.length);
  if (inactive) {
    return { ok: false, message: "One or more selected manufacturers do not have an active manufacturing license" };
  }

  return {
    ok: true,
    manufacturerIds: normalizedIds,
  };
};

const RETAIL_LICENSE_TYPES = [
  LicenseType.RETAIL,
  LicenseType.BAR,
  LicenseType.RESTAURANT,
  LicenseType.HOTEL,
  LicenseType.CLUB,
];

const validateSelectedRetailers = async (retailerIds, { required = true } = {}) => {
  if (retailerIds === undefined || retailerIds === null) {
    if (required) {
      return { ok: false, message: "At least one retailer is required" };
    }

    return { ok: true, retailerIds: [] };
  }

  if (!Array.isArray(retailerIds) || retailerIds.length === 0) {
    return { ok: false, message: "At least one retailer is required" };
  }

  const normalizedIds = [...new Set(retailerIds.filter(Boolean))];
  if (!normalizedIds.length) {
    return { ok: false, message: "At least one retailer is required" };
  }

  const now = new Date();
  const retailers = await prisma.user.findMany({
    where: { id: { in: normalizedIds } },
    include: {
      licenses: {
        where: {
          type: { in: RETAIL_LICENSE_TYPES },
          status: LicenseStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        },
        take: 1,
      },
    },
  });

  if (retailers.length !== normalizedIds.length) {
    return { ok: false, message: "One or more selected retailers were not found" };
  }

  const invalidRole = retailers.find((item) => item.role !== UserRole.RETAILER);
  if (invalidRole) {
    return { ok: false, message: "One or more selected users are not retailers" };
  }

  const inactive = retailers.find((item) => !item.licenses.length);
  if (inactive) {
    return { ok: false, message: "One or more selected retailers do not have an active retail license" };
  }

  return {
    ok: true,
    retailerIds: normalizedIds,
  };
};


const createDistributionApplication = async (req, res) => {
  try {
    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      businessName,
      businessRegistrationNo,
      taxIdentificationNo,
      warehouseAddress,
      district,
      province,
      premisesOwnershipType,
      deedOrLeaseReference,
      buildingPlanReference,
      packingListDetails,
      oicCertificationRef,
      warehouseCapacity,
      transportDetails,
      distributionScope,
      manufacturerIds,
      retailerIds,
      remarks,
    } = req.body;

    
    if (!applicantName || !applicantEmail || !businessName || !warehouseAddress || !district || !province || !premisesOwnershipType) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const manufacturerValidation = await validateSelectedManufacturers(manufacturerIds);
    if (!manufacturerValidation.ok) {
      return res.status(400).json({ success: false, message: manufacturerValidation.message });
    }

    const retailerValidation = await validateSelectedRetailers(retailerIds, { required: false });
    if (!retailerValidation.ok) {
      return res.status(400).json({ success: false, message: retailerValidation.message });
    }

    
    const appCount = await prisma.distributionApplication.count();
    const applicationNo = `DIST-APP-${String(appCount + 1).padStart(5, "0")}`;

    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.distributionApplication.create({
        data: {
          applicationNo,
          applicantName,
          applicantEmail,
          applicantPhone,
          businessName,
          businessRegistrationNo,
          taxIdentificationNo,
          warehouseAddress,
          district,
          province,
          premisesOwnershipType,
          deedOrLeaseReference,
          buildingPlanReference,
          packingListDetails,
          oicCertificationRef,
          warehouseCapacity,
          transportDetails,
          distributionScope,
          remarks,
          status: ApplicationStatus.DRAFT,
          submittedById: req.user?.id || null,
        },
      });

      await tx.distributionApplicationManufacturer.createMany({
        data: manufacturerValidation.manufacturerIds.map((manufacturerId) => ({
          distributionApplicationId: created.id,
          manufacturerId,
        })),
      });

      if (retailerValidation.retailerIds.length) {
        await tx.distributionApplicationRetailer.createMany({
          data: retailerValidation.retailerIds.map((retailerId) => ({
            distributionApplicationId: created.id,
            retailerId,
          })),
        });
      }

      return tx.distributionApplication.findUnique({
        where: { id: created.id },
        include: {
          selectedManufacturers: {
            include: {
              manufacturer: {
                select: { id: true, fullName: true, companyName: true, email: true },
              },
            },
          },
          selectedRetailers: {
            include: {
              retailer: {
                select: { id: true, fullName: true, companyName: true, email: true, mobile: true },
              },
            },
          },
        },
      });
    });

    await logAudit({
      userId: req.user?.id ?? null,
      action: 'CREATE',
      entityType: 'DISTRIBUTION_APPLICATION',
      entityId: application.id,
      newValues: application,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    res.status(201).json({
      success: true,
      message: "Distribution application created successfully",
      data: application,
    });
  } catch (error) {
    console.error("Error creating distribution application:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const getDistributionApplications = async (req, res) => {
  try {
    const { status, district, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (district) where.district = district;
    if (search) {
      where.OR = [
        { applicationNo: { contains: search } },
        { applicantName: { contains: search } },
        { businessName: { contains: search } },
        { applicantEmail: { contains: search } },
      ];
    }

    const applications = await prisma.distributionApplication.findMany({
      where,
      include: {
        submittedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
        selectedManufacturers: {
          include: {
            manufacturer: { select: { id: true, fullName: true, companyName: true, email: true } },
          },
        },
        selectedRetailers: {
          include: {
            retailer: { select: { id: true, fullName: true, companyName: true, email: true, mobile: true } },
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
    console.error("Error fetching distribution applications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const getDistributionApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.distributionApplication.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
        selectedManufacturers: {
          include: {
            manufacturer: { select: { id: true, fullName: true, companyName: true, email: true } },
          },
        },
        selectedRetailers: {
          include: {
            retailer: { select: { id: true, fullName: true, companyName: true, email: true, mobile: true } },
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
    console.error("Error fetching distribution application:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateDistributionApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await prisma.distributionApplication.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    
    if (existing.status !== ApplicationStatus.DRAFT && req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ success: false, message: "Cannot update submitted applications" });
    }

    if (updates.manufacturerIds !== undefined) {
      const manufacturerValidation = await validateSelectedManufacturers(updates.manufacturerIds);
      if (!manufacturerValidation.ok) {
        return res.status(400).json({ success: false, message: manufacturerValidation.message });
      }

      updates.manufacturerIds = manufacturerValidation.manufacturerIds;
    }

    if (updates.retailerIds !== undefined) {
      const retailerValidation = await validateSelectedRetailers(updates.retailerIds);
      if (!retailerValidation.ok) {
        return res.status(400).json({ success: false, message: retailerValidation.message });
      }

      updates.retailerIds = retailerValidation.retailerIds;
    }

    const { manufacturerIds, retailerIds, ...applicationUpdates } = updates;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.distributionApplication.update({
        where: { id },
        data: applicationUpdates,
      });

      if (manufacturerIds !== undefined) {
        await tx.distributionApplicationManufacturer.deleteMany({
          where: { distributionApplicationId: id },
        });

        await tx.distributionApplicationManufacturer.createMany({
          data: manufacturerIds.map((manufacturerId) => ({
            distributionApplicationId: id,
            manufacturerId,
          })),
        });
      }

      if (retailerIds !== undefined) {
        await tx.distributionApplicationRetailer.deleteMany({
          where: { distributionApplicationId: id },
        });

        await tx.distributionApplicationRetailer.createMany({
          data: retailerIds.map((retailerId) => ({
            distributionApplicationId: id,
            retailerId,
          })),
        });
      }

      return tx.distributionApplication.findUnique({
        where: { id: updatedApplication.id },
        include: {
          submittedBy: { select: { id: true, fullName: true, email: true } },
          reviewedBy: { select: { id: true, fullName: true, email: true } },
          selectedManufacturers: {
            include: {
              manufacturer: { select: { id: true, fullName: true, companyName: true, email: true } },
            },
          },
          selectedRetailers: {
            include: {
              retailer: { select: { id: true, fullName: true, companyName: true, email: true, mobile: true } },
            },
          },
        },
      });
    });

    await logAudit({
      userId: req.user?.id ?? null,
      action: 'UPDATE',
      entityType: 'DISTRIBUTION_APPLICATION',
      entityId: id,
      oldValues: existing,
      newValues: updated,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    res.status(200).json({
      success: true,
      message: "Distribution application updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating distribution application:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateDistributionApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const validStatuses = Object.values(ApplicationStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const existing = await prisma.distributionApplication.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const updated = await prisma.distributionApplication.update({
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
      entityType: 'DISTRIBUTION_APPLICATION',
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
    console.error("Error updating distribution application status:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


const issueDistributionLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const application = await prisma.distributionApplication.findUnique({
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
    const licenseNumber = `LIC-DIST-${String(licenseCount + 1).padStart(6, "0")}`;

    const license = await prisma.license.create({
      data: {
        licenseNumber,
        type: LicenseType.DISTRIBUTION,
        status: LicenseStatus.ACTIVE,
        companyName: application.businessName,
        businessAddress: application.warehouseAddress,
        taxIdentificationNo: application.taxIdentificationNo,
        issueDate: new Date(),
        effectiveFrom: new Date(),
        effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        remarks,
        holderId: user.id,
        distributionApplicationId: id,
      },
      include: { holder: true },
    });

    await logAudit({
      userId: req.user?.id ?? null,
      action: 'ISSUE_LICENSE',
      entityType: 'DISTRIBUTION_APPLICATION',
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
    console.error("Error issuing distribution license:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadDistributionApplicationFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { category = "GENERAL" } = req.body;

    const application = await prisma.distributionApplication.findUnique({ where: { id } });
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
        distributionApplicationId: id,
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
    console.error("Error uploading distribution application file:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDistributionApplication,
  getDistributionApplications,
  getDistributionApplicationById,
  updateDistributionApplication,
  updateDistributionApplicationStatus,
  issueDistributionLicense,
  uploadDistributionApplicationFile,
};
