const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const { UserRole, LicenseType, LicenseStatus } = require('@prisma/client');

const ALLOWED_CATEGORIES = [
  'ARRACK',
  'WHISKY',
  'BRANDY',
  'VODKA',
  'GIN',
  'RUM',
  'BEER',
  'WINE',
  'TODDY',
  'LIQUOR_BASED_PRODUCT',
  'TOBACCO',
  'OTHER'
];

const ALLOWED_PACK_TYPES = ['BOTTLE', 'CAN', 'KEG', 'SACHET', 'OTHER'];

const resolveManufacturerIdForRequest = (req, bodyManufacturerId) => {
  if (req.user.role === UserRole.MANUFACTURER) {
    return req.user.id;
  }

  if ([UserRole.ADMIN, UserRole.ED_OFFICER].includes(req.user.role)) {
    return bodyManufacturerId;
  }

  throw ApiError.forbidden('You are not allowed to manage products');
};

const getValidManufacturingLicense = async (manufacturerId, licenseId) => {
  const now = new Date();
  return prisma.license.findFirst({
    where: {
      id: licenseId,
      holderId: manufacturerId,
      type: LicenseType.MANUFACTURING,
      status: LicenseStatus.ACTIVE,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }]
    }
  });
};

const validateCategoryAndPack = (category, packType) => {
  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw ApiError.badRequest('Invalid product category');
  }

  if (packType && !ALLOWED_PACK_TYPES.includes(packType)) {
    throw ApiError.badRequest('Invalid pack type');
  }
};

const createProduct = async (req, res, next) => {
  try {
    const {
      code,
      name,
      category,
      packType,
      packSizeMl,
      alcoholStrength,
      description,
      licenseId,
      manufacturerId: bodyManufacturerId
    } = req.body;

    if (!code || !name || !category || !licenseId) {
      throw ApiError.badRequest('Code, name, category and license are required');
    }

    validateCategoryAndPack(category, packType);

    const manufacturerId = resolveManufacturerIdForRequest(req, bodyManufacturerId);
    if (!manufacturerId) {
      throw ApiError.badRequest('manufacturerId is required');
    }

    const manufacturer = await prisma.user.findUnique({
      where: { id: manufacturerId }
    });

    if (!manufacturer || manufacturer.role !== UserRole.MANUFACTURER) {
      throw ApiError.badRequest('Invalid manufacturer');
    }

    const license = await getValidManufacturingLicense(manufacturerId, licenseId);

    if (!license) {
      throw ApiError.badRequest('License must be an active manufacturing license owned by the manufacturer');
    }

    const existingProduct = await prisma.product.findUnique({ where: { code } });
    if (existingProduct) {
      throw ApiError.conflict('Product code already exists');
    }

    const existingProductForLicense = await prisma.product.findFirst({
      where: { licenseId }
    });

    if (existingProductForLicense) {
      throw ApiError.conflict('This license already has a product. One license can have only one product.');
    }

    const product = await prisma.product.create({
      data: {
        code,
        name,
        category,
        packType,
        packSizeMl: packSizeMl !== undefined && packSizeMl !== null && packSizeMl !== '' ? Number(packSizeMl) : null,
        alcoholStrength: alcoholStrength !== undefined && alcoholStrength !== null && alcoholStrength !== '' ? Number(alcoholStrength) : null,
        description,
        manufacturerId,
        licenseId
      },
      include: {
        manufacturer: {
          select: { id: true, fullName: true, email: true, companyName: true }
        },
        license: {
          select: { id: true, licenseNumber: true, companyName: true }
        }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      description: `Created product: ${code}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, product, 'Product created successfully');
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const { category, licenseId, manufacturerId, isActive, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (category) where.category = category;
    if (licenseId) where.licenseId = licenseId;
    if (manufacturerId) where.manufacturerId = manufacturerId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (req.user.role === UserRole.MANUFACTURER) {
      where.manufacturerId = req.user.id;
    }

    if (![UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to view products');
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          manufacturer: {
            select: { id: true, fullName: true, companyName: true }
          },
          license: {
            select: { id: true, licenseNumber: true, companyName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.product.count({ where })
    ]);

    return ApiResponse.success(res, {
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        manufacturer: {
          select: { id: true, fullName: true, email: true, companyName: true }
        },
        license: {
          select: { id: true, licenseNumber: true, type: true, companyName: true, status: true }
        },
        batches: {
          select: { id: true, batchNo: true, status: true, productionDate: true, outputLiters: true },
          take: 10,
          orderBy: { productionDate: 'desc' }
        },
        taxStamps: {
          select: { id: true, codeValue: true, status: true, assignedAt: true },
          take: 10
        }
      }
    });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    if (
      req.user.role === UserRole.MANUFACTURER &&
      product.manufacturerId !== req.user.id
    ) {
      throw ApiError.forbidden('You can only view your own products');
    }

    if (![UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER].includes(req.user.role)) {
      throw ApiError.forbidden('You are not allowed to view this product');
    }

    return ApiResponse.success(res, product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, packType, packSizeMl, alcoholStrength, description, isActive } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { license: true }
    });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    if (
      product.license.holderId !== req.user.id &&
      ![UserRole.ADMIN, UserRole.ED_OFFICER].includes(req.user.role)
    ) {
      throw ApiError.forbidden('You can only update your own products');
    }

    if (category || packType) {
      validateCategoryAndPack(category || product.category, packType || product.packType);
    }

    const validLicense = await getValidManufacturingLicense(product.manufacturerId, product.licenseId);
    if (!validLicense) {
      throw ApiError.badRequest('Product must belong to an active manufacturing license');
    }

    const oldValues = { name: product.name, category: product.category };

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(packType && { packType }),
        ...(packSizeMl !== undefined && { packSizeMl: packSizeMl === '' || packSizeMl === null ? null : Number(packSizeMl) }),
        ...(alcoholStrength !== undefined && { alcoholStrength: alcoholStrength === '' || alcoholStrength === null ? null : Number(alcoholStrength) }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        manufacturer: {
          select: { id: true, fullName: true }
        },
        license: {
          select: { id: true, licenseNumber: true }
        }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'Product',
      entityId: id,
      description: `Updated product: ${product.code}`,
      oldValues,
      newValues: { name: updatedProduct.name, category: updatedProduct.category },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedProduct, 'Product updated');
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { license: true }
    });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    if (
      product.license.holderId !== req.user.id &&
      ![UserRole.ADMIN, UserRole.ED_OFFICER].includes(req.user.role)
    ) {
      throw ApiError.forbidden('You can only delete your own products');
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'Product',
      entityId: id,
      description: `Deactivated product: ${product.code}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, null, 'Product deactivated');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
