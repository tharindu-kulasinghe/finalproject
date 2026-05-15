const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const prisma = require("../src/prisma/client");
const bcrypt = require("bcrypt");

async function main() {
  console.log("🌱 Seeding started...");

  const password = await bcrypt.hash("123456", 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@excise.lk" }
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        fullName: "System Administrator",
        email: "admin@excise.lk",
        passwordHash: password,
        role: "ADMIN",
        status: "ACTIVE",
        employeeNo: "ADMIN-001",
        position: "COMMISSIONER",
        department: "Head Office",
        officeName: "Department of Excise - Colombo",
        district: "Colombo",
        province: "Western",
        appointmentDate: new Date("2020-01-15"),
        employmentType: "PERMANENT",
        gender: "MALE",
        officialEmail: "admin@excise.gov.lk",
        officialPhone: "+94 11 2345678",
      },
    });
    console.log("✅ Admin user created");
  } else {
    console.log("✅ Admin user already exists");
  }

  const existingOfficer = await prisma.user.findUnique({
    where: { email: "officer@excise.lk" }
  });

  if (!existingOfficer) {
    await prisma.user.create({
      data: {
        fullName: "Kumar Perera",
        email: "officer@excise.lk",
        passwordHash: password,
        role: "ED_OFFICER",
        status: "ACTIVE",
        employeeNo: "EO-1234",
        nic: "921234567V",
        position: "INSPECTOR",
        department: "Licensing Division",
        officeName: "Department of Excise - Colombo",
        district: "Colombo",
        province: "Western",
        appointmentDate: new Date("2022-03-10"),
        employmentType: "PERMANENT",
        gender: "MALE",
        dateOfBirth: new Date("1992-05-15"),
        address: "45, Temple Road, Colombo 07",
        emergencyContactName: "Sunil Perera",
        emergencyContactPhone: "+94 77 1234567",
        officialEmail: "k.perera@excise.gov.lk",
        officialPhone: "+94 11 2345679",
      },
    });
    console.log("✅ Officer user created");
  } else {
    console.log("✅ Officer user already exists");
  }

  const officers = [
    {
      email: "samantha@excise.lk",
      fullName: "Samantha Fernando",
      employeeNo: "EO-1235",
      nic: "931234567V",
      position: "FIELD_OFFICER",
      department: "Field Operations",
      officeName: "Department of Excise - Kandy",
      district: "Kandy",
      province: "Central",
      employmentType: "PERMANENT",
      gender: "MALE",
    },
    {
      email: "nimali@excise.lk",
      fullName: "Nimali Dissanayake",
      employeeNo: "EO-1236",
      nic: "945678901V",
      position: "DATA_ENTRY_OFFICER",
      department: "Data Management Unit",
      officeName: "Department of Excise - Colombo",
      district: "Colombo",
      province: "Western",
      employmentType: "CONTRACT",
      gender: "FEMALE",
    },
  ];

  for (const officerData of officers) {
    const existing = await prisma.user.findUnique({
      where: { email: officerData.email }
    });
    if (!existing) {
      await prisma.user.create({
        data: {
          ...officerData,
          passwordHash: password,
          role: "ED_OFFICER",
          status: "ACTIVE",
          appointmentDate: new Date("2023-01-01"),
          officialEmail: officerData.email,
        },
      });
      console.log(`✅ Officer ${officerData.fullName} created`);
    }
  }

  const existingManufacturer = await prisma.user.findUnique({
    where: { email: "manufacturer@company.lk" }
  });

  if (!existingManufacturer) {
    await prisma.user.create({
      data: {
        fullName: "ABC Distilleries Pvt Ltd",
        email: "manufacturer@company.lk",
        passwordHash: password,
        role: "MANUFACTURER",
        status: "ACTIVE",
        companyName: "ABC Distilleries",
      },
    });
    console.log("✅ Manufacturer user created");
  } else {
    console.log("✅ Manufacturer user already exists");
  }

   const existingDistributor = await prisma.user.findUnique({
      where: { email: "distributor@company.lk" }
    });

    const distributor = existingDistributor || await prisma.user.create({
      data: {
        fullName: "XYZ Distributors Pvt Ltd",
        email: "distributor@company.lk",
        passwordHash: password,
        role: "DISTRIBUTOR",
        status: "ACTIVE",
        companyName: "XYZ Distributors",
      },
    });
    console.log(existingDistributor ? "✅ Distributor user already exists" : "✅ Distributor user created");

    
    const existingDistributorLicense = await prisma.license.findUnique({
      where: { licenseNumber: "LIC-0002" }
    });

    const distributorLicense = existingDistributorLicense || await prisma.license.create({
      data: {
        licenseNumber: "LIC-0002",
        type: "DISTRIBUTION",
        status: "ACTIVE",
        companyName: "XYZ Distributors",
        businessAddress: "Colombo, Sri Lanka",
        issueDate: new Date(),
        effectiveFrom: new Date(),
        effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        holderId: distributor.id,
      },
    });
    console.log(existingDistributorLicense ? "✅ Distributor license already exists" : "✅ Distributor license created");

    const existingRetail = await prisma.user.findUnique({
      where: { email: "retail@shop.lk" }
    });

    const retail = existingRetail || await prisma.user.create({
      data: {
        fullName: "City Liquor Store",
        email: "retail@shop.lk",
        passwordHash: password,
        role: "RETAILER",
        status: "ACTIVE",
        companyName: "City Liquor Store",
      },
    });
    console.log(existingRetail ? "✅ Retail user already exists" : "✅ Retail user created");

    
    const existingRetailLicense = await prisma.license.findUnique({
      where: { licenseNumber: "LIC-0003" }
    });

    const retailLicense = existingRetailLicense || await prisma.license.create({
      data: {
        licenseNumber: "LIC-0003",
        type: "RETAIL",
        status: "ACTIVE",
        companyName: "City Liquor Store",
        businessAddress: "Colombo, Sri Lanka",
        issueDate: new Date(),
        effectiveFrom: new Date(),
        effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        holderId: retail.id,
      },
    });
    console.log(existingRetailLicense ? "✅ Retail license already exists" : "✅ Retail license created");

    const existingRetailTwo = await prisma.user.findUnique({
      where: { email: "retail2@shop.lk" }
    });

    const retailTwo = existingRetailTwo || await prisma.user.create({
      data: {
        fullName: "Downtown Spirits Outlet",
        email: "retail2@shop.lk",
        passwordHash: password,
        role: "RETAILER",
        status: "ACTIVE",
        companyName: "Downtown Spirits",
      },
    });
    console.log(existingRetailTwo ? "✅ Second retail user already exists" : "✅ Second retail user created");

    const existingRetailLicenseTwo = await prisma.license.findUnique({
      where: { licenseNumber: "LIC-0004" }
    });

    const retailLicenseTwo = existingRetailLicenseTwo || await prisma.license.create({
      data: {
        licenseNumber: "LIC-0004",
        type: "RETAIL",
        status: "ACTIVE",
        companyName: "Downtown Spirits",
        businessAddress: "Kandy, Sri Lanka",
        issueDate: new Date(),
        effectiveFrom: new Date(),
        effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        holderId: retailTwo.id,
      },
    });
    console.log(existingRetailLicenseTwo ? "✅ Second retail license already exists" : "✅ Second retail license created");

  console.log("✅ All users created");

  const manufacturer = await prisma.user.findUnique({
    where: { email: "manufacturer@company.lk" }
  });
  const officer = await prisma.user.findUnique({
    where: { email: "officer@excise.lk" }
  });

  const existingDistributionApp1 = await prisma.distributionApplication.findUnique({
    where: { applicationNo: "DIST-APP-0001" }
  });

  const distributionApplication1 = existingDistributionApp1 || await prisma.distributionApplication.create({
    data: {
      applicationNo: "DIST-APP-0001",
      applicantName: "XYZ Distributors",
      applicantEmail: "distributor@company.lk",
      applicantPhone: "+94 77 7654321",
      businessName: "XYZ Distributors",
      businessRegistrationNo: "PVT-DIST-0001",
      taxIdentificationNo: "TIN-DIST-0001",
      warehouseAddress: "No. 12, Main Distribution Road, Colombo",
      district: "Colombo",
      province: "Western",
      premisesOwnershipType: "LEASED",
      deedOrLeaseReference: "LEASE-DIST-2025-01",
      buildingPlanReference: "BP-DIST-001",
      packingListDetails: "Primary and secondary packing supported",
      oicCertificationRef: "OIC-CERT-001",
      warehouseCapacity: "5000 cases",
      transportDetails: "4 medium trucks with temperature monitoring",
      distributionScope: "Island-wide wholesale distribution",
      remarks: "Primary approved distributor application",
      status: "APPROVED",
      submittedById: distributor.id,
      reviewedById: officer?.id,
      submittedAt: new Date(),
      reviewedAt: new Date(),
    },
  });
  console.log(existingDistributionApp1 ? "✅ Distribution application DIST-APP-0001 already exists" : "✅ Distribution application DIST-APP-0001 created");

  const existingDistributionApp2 = await prisma.distributionApplication.findUnique({
    where: { applicationNo: "DIST-APP-0002" }
  });

  const distributionApplication2 = existingDistributionApp2 || await prisma.distributionApplication.create({
    data: {
      applicationNo: "DIST-APP-0002",
      applicantName: "XYZ Distributors",
      applicantEmail: "distributor@company.lk",
      applicantPhone: "+94 77 7654321",
      businessName: "XYZ Distributors - North Hub",
      businessRegistrationNo: "PVT-DIST-0002",
      taxIdentificationNo: "TIN-DIST-0002",
      warehouseAddress: "No. 8, Jaffna Logistics Park, Jaffna",
      district: "Jaffna",
      province: "Northern",
      premisesOwnershipType: "RENTED",
      deedOrLeaseReference: "RENT-DIST-2025-02",
      buildingPlanReference: "BP-DIST-002",
      packingListDetails: "Dedicated bonded packing area",
      oicCertificationRef: "OIC-CERT-002",
      warehouseCapacity: "2000 cases",
      transportDetails: "2 heavy vehicles for regional dispatch",
      distributionScope: "Northern province focused distribution",
      remarks: "Secondary application pending review",
      status: "UNDER_REVIEW",
      submittedById: distributor.id,
      reviewedById: officer?.id,
      submittedAt: new Date(),
      reviewedAt: new Date(),
    },
  });
  console.log(existingDistributionApp2 ? "✅ Distribution application DIST-APP-0002 already exists" : "✅ Distribution application DIST-APP-0002 created");

  const existingDistributionLink1 = await prisma.distributionApplicationManufacturer.findUnique({
    where: {
      distributionApplicationId_manufacturerId: {
        distributionApplicationId: distributionApplication1.id,
        manufacturerId: manufacturer.id,
      }
    }
  });

  if (!existingDistributionLink1) {
    await prisma.distributionApplicationManufacturer.create({
      data: {
        distributionApplicationId: distributionApplication1.id,
        manufacturerId: manufacturer.id,
      }
    });
    console.log("✅ Linked manufacturer to DIST-APP-0001");
  } else {
    console.log("✅ Manufacturer link for DIST-APP-0001 already exists");
  }

  const existingDistributionLink2 = await prisma.distributionApplicationManufacturer.findUnique({
    where: {
      distributionApplicationId_manufacturerId: {
        distributionApplicationId: distributionApplication2.id,
        manufacturerId: manufacturer.id,
      }
    }
  });

  if (!existingDistributionLink2) {
    await prisma.distributionApplicationManufacturer.create({
      data: {
        distributionApplicationId: distributionApplication2.id,
        manufacturerId: manufacturer.id,
      }
    });
    console.log("✅ Linked manufacturer to DIST-APP-0002");
  } else {
    console.log("✅ Manufacturer link for DIST-APP-0002 already exists");
  }

  console.log("✅ Skipped seeding distributor-retailer links as per retail unlink requirement");

  const linkedLicenseForDistributionApp = await prisma.license.findFirst({
    where: { distributionApplicationId: distributionApplication1.id }
  });

  if (!linkedLicenseForDistributionApp && !distributorLicense.distributionApplicationId) {
    await prisma.license.update({
      where: { id: distributorLicense.id },
      data: {
        distributionApplicationId: distributionApplication1.id,
        companyName: distributionApplication1.businessName,
        businessAddress: distributionApplication1.warehouseAddress,
        taxIdentificationNo: distributionApplication1.taxIdentificationNo,
      }
    });
    console.log("✅ Linked distributor license to DIST-APP-0001");
  } else if (linkedLicenseForDistributionApp) {
    console.log("✅ DIST-APP-0001 already linked to a license");
  } else {
    console.log("✅ Distributor license already linked to a distribution application");
  }

  const existingApp = await prisma.manufacturingApplication.findUnique({
    where: { applicationNo: "APP-0001" }
  });

  const application = existingApp || await prisma.manufacturingApplication.create({
    data: {
      applicationNo: "APP-0001",
      applicantName: "ABC Distilleries",
      applicantEmail: "manufacturer@company.lk",
      applicantPhone: "+94 77 1234567",
      companyName: "ABC Distilleries",
      companyRegistrationNo: "PVT-0001",
      taxIdentificationNo: "TIN-0001",
      businessAddress: "123, Industrial Lane, Colombo",
      district: "Colombo",
      province: "Western",
      premisesOwnershipType: "OWNED",
      productType: "ARRACK",
      manufacturingType: "DISTILLERY",
      productionCapacity: "10000 liters/month",
      status: "APPROVED",
      submittedById: manufacturer.id,
      reviewedById: officer.id,
      submittedAt: new Date(),
      reviewedAt: new Date(),
    },
  });
  console.log(existingApp ? "✅ Manufacturing application already exists" : "✅ Manufacturing application created");

  const existingLicense = await prisma.license.findUnique({
    where: { licenseNumber: "LIC-0001" }
  });

  const license = existingLicense || await prisma.license.create({
    data: {
      licenseNumber: "LIC-0001",
      type: "MANUFACTURING",
      status: "ACTIVE",
      companyName: "ABC Distilleries",
      businessAddress: "123, Industrial Lane, Colombo",
      issueDate: new Date(),
      effectiveFrom: new Date(),
      effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      holderId: manufacturer.id,
      manufacturingApplicationId: application.id,
    },
  });
  console.log(existingLicense ? "✅ License already exists" : "✅ License created");

  const existingProduct = await prisma.product.findUnique({
    where: { code: "PROD-ARRACK-001" }
  });

  const product = existingProduct || await prisma.product.create({
    data: {
      code: "PROD-ARRACK-001",
      name: "Premium Arrack",
      category: "SPIRITS",
      packType: "BOTTLE",
      packSizeMl: 750,
      alcoholStrength: 33.5,
      manufacturerId: manufacturer.id,
      licenseId: license.id,
    },
  });
  console.log(existingProduct ? "✅ Product already exists" : "✅ Product created");

  const existingDutyRate = await prisma.dutyRate.findFirst({
    where: { category: "SPIRITS", isActive: true }
  });

  const dutyRate = existingDutyRate || await prisma.dutyRate.create({
    data: {
      category: "SPIRITS",
      ratePerLiter: 1200,
      effectiveFrom: new Date("2025-01-01"),
      isActive: true,
    },
  });
  console.log(existingDutyRate ? "✅ Duty rate already exists" : "✅ Duty rate created");

  const existingBatch = await prisma.productionBatch.findUnique({
    where: { batchNo: "BATCH-0001" }
  });

  const batch = existingBatch || await prisma.productionBatch.create({
    data: {
      batchNo: "BATCH-0001",
      productionDate: new Date(),
      outputLiters: 1000,
      unitsProduced: 1333,
      status: "VERIFIED",
      productId: product.id,
      licenseId: license.id,
      submittedById: manufacturer.id,
      verifiedById: officer.id,
      submittedAt: new Date(),
      verifiedAt: new Date(),
    },
  });
  console.log(existingBatch ? "✅ Batch already exists" : "✅ Batch created");

  const dutyAmount = 1000 * 1200;

  const existingAssessment = await prisma.dutyAssessment.findUnique({
    where: { assessmentNo: "DA-0001" }
  });

  const assessment = existingAssessment || await prisma.dutyAssessment.create({
    data: {
      assessmentNo: "DA-0001",
      assessedAmount: dutyAmount,
      paidAmount: 0,
      balanceAmount: dutyAmount,
      dueDate: new Date(),
      status: "CALCULATED",
      batchId: batch.id,
      licenseId: license.id,
      dutyRateId: dutyRate.id,
      calculatedById: officer.id,
    },
  });
  console.log(existingAssessment ? "✅ Duty assessment already exists" : "✅ Duty assessment created");

  const existingPayment = await prisma.payment.findUnique({
    where: { paymentRef: "PAY-0001" }
  });

  const payment = existingPayment || await prisma.payment.create({
    data: {
      paymentRef: "PAY-0001",
      method: "BANK_TRANSFER",
      status: "VERIFIED",
      declaredAmount: dutyAmount,
      verifiedAmount: dutyAmount,
      licenseId: license.id,
      declaredById: manufacturer.id,
      verifiedById: officer.id,
      declaredAt: new Date(),
      verifiedAt: new Date(),
    },
  });
  console.log(existingPayment ? "✅ Payment already exists" : "✅ Payment created");

  const existingAllocation = await prisma.paymentAllocation.findFirst({
    where: { paymentId: payment.id, dutyAssessmentId: assessment.id }
  });

  if (!existingAllocation) {
    await prisma.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        dutyAssessmentId: assessment.id,
        allocatedAmount: dutyAmount,
      },
    });
    console.log("✅ Payment allocated");
  } else {
    console.log("✅ Payment already allocated");
  }

  const existingStampRequest = await prisma.stampRequest.findUnique({
    where: { requestNo: "SR-0001" }
  });

  const stampRequest = existingStampRequest || await prisma.stampRequest.create({
    data: {
      requestNo: "SR-0001",
      quantityRequested: 1000,
      quantityApproved: 1000,
      quantityIssued: 1000,
      status: "ISSUED",
      requestedById: manufacturer.id,
      reviewedById: officer.id,
      licenseId: license.id,
      productId: product.id,
      batchId: batch.id,
      requestedAt: new Date(),
      reviewedAt: new Date(),
      issuedAt: new Date(),
    },
  });
  console.log(existingStampRequest ? "✅ Stamp request already exists" : "✅ Stamp request created");

  const stampCount = await prisma.taxStamp.count({
    where: { batchId: batch.id }
  });

  if (stampCount === 0) {
    for (let i = 1; i <= 5; i++) {
      await prisma.taxStamp.create({
        data: {
          codeValue: `STAMP-${i}`,
          qrValue: `QR-${i}`,
          cryptoHash: `HASH-${i}-${Date.now()}`,
          status: "ACTIVE",
          productId: product.id,
          batchId: batch.id,
          stampRequestId: stampRequest.id,
        },
      });
    }
    console.log("✅ Tax stamps created");
  } else {
    console.log("✅ Tax stamps already exist");
  }

  if (distributor && manufacturer && batch) {
    
    const manufacturerLicense = await prisma.license.findFirst({
      where: { holderId: manufacturer.id, status: 'ACTIVE' }
    });
    
    const distributorLicense = await prisma.license.findFirst({
      where: { holderId: distributor.id, status: 'ACTIVE' }
    });

    if (manufacturerLicense && distributorLicense) {
      const existingDistribution = await prisma.distributionOrder.findFirst({
        where: { orderNo: "DIST-001" }
      });

      if (!existingDistribution) {
        const distribution = await prisma.distributionOrder.create({
          data: {
            orderNo: "DIST-001",
            quantity: 100,
            unit: "LITERS",
            status: "RECEIVED",
            productId: product.id,
            batchId: batch.id,
            senderId: manufacturer.id,
            receiverId: distributor.id,
            senderLicenseId: manufacturerLicense.id,
            receiverLicenseId: distributorLicense.id,
            dispatchedAt: new Date(),
            receivedAt: new Date(),
          },
        });

        await prisma.distributorStock.upsert({
          where: {
            distributorId_productId: {
              distributorId: distributor.id,
              productId: product.id,
            },
          },
          update: {
            availableQuantity: { increment: 100 },
          },
          create: {
            distributorId: distributor.id,
            productId: product.id,
            availableQuantity: 100,
          },
        });

        console.log("✅ Distribution order created");
      } else {
        console.log("✅ Distribution order already exists");
      }
    } else {
      console.log("⚠️  Skipping distribution order: manufacturer or distributor missing active license");
    }
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });