const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { LicenseType, UserRole, UserStatus, ApplicationStatus } = require('@prisma/client');

const createPublicLicenseApplication = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      mobile,
      nic,
      businessName,
      businessAddress,
      contactEmail,
      contactPhone,
      taxIdentificationNo,
      district,
      province,
      requestedLicenseType,
      remarks
    } = req.body;

    
    if (!fullName || !email || !mobile || !businessName || !businessAddress || !contactEmail || !requestedLicenseType) {
      throw ApiError.badRequest('Full name, email, mobile, business name, business address, contact email and license type are required');
    }

    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ApiError.badRequest('Invalid applicant email format');
    }
    if (!emailRegex.test(contactEmail)) {
      throw ApiError.badRequest('Invalid contact email format');
    }

    
    const validLicenseTypes = Object.values(LicenseType);
    if (!validLicenseTypes.includes(requestedLicenseType)) {
      throw ApiError.badRequest(`Invalid license type. Must be one of: ${validLicenseTypes.join(', ')}`);
    }

    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    let userId = null;
    
    
    if (!existingUser) {
      
      
      const placeholderUser = await prisma.user.create({
        data: {
          fullName,
          email,
          mobile,
          nic: nic || null,
          passwordHash: 'placeholder_hash_for_public_applications', 
          role: UserRole.RETAILER, 
          status: UserStatus.PENDING,
          companyName: businessName,
          address: businessAddress,
          district: district || null,
          province: province || null
        }
      });
      userId = placeholderUser.id;
    } else {
      userId = existingUser.id;
    }

    
    const applicationCount = await prisma.licenseApplication.count();
    const applicationNo = `PUB-${Date.now().toString().slice(-8)}-${applicationCount + 1}`;

    
    const application = await prisma.licenseApplication.create({
      data: {
        applicationNo,
        businessName,
        businessAddress,
        contactEmail,
        contactPhone: contactPhone || mobile,
        taxIdentificationNo,
        requestedLicenseType,
        submittedById: userId,
        status: ApplicationStatus.SUBMITTED, 
        remarks: remarks || null
      },
      include: {
        submittedBy: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    
    console.log(`Public license application submitted: ${applicationNo} by ${fullName} (${email})`);

    return ApiResponse.created(res, application, 'License application submitted successfully. Your application will be reviewed by the Excise Department.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPublicLicenseApplication
};