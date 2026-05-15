const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../utils/auditLogger');
const { UserRole, LicenseType, LicenseStatus, BatchStatus, DistributionOrderStatus } = require('@prisma/client');

const getBatchCapacityByUnit = (batch, unit) => {
  if (!batch) return 0;

  const normalizedUnit = String(unit || 'UNITS').toUpperCase();
  const unitsProduced = Number(batch.unitsProduced || 0);
  const outputLiters = Number(batch.outputLiters || 0);

  if (normalizedUnit === 'LITERS') {
    if (Number.isFinite(outputLiters) && outputLiters > 0) return outputLiters;
    if (Number.isFinite(unitsProduced) && unitsProduced > 0) return unitsProduced;
    return 0;
  }

  if (Number.isFinite(unitsProduced) && unitsProduced > 0) return unitsProduced;
  if (Number.isFinite(outputLiters) && outputLiters > 0) return outputLiters;
  return 0;
};

const createDistribution = async (req, res, next) => {
  try {
    const {
      receiverId,
      receiverLicenseId,
      productId,
      batchId,
      quantity,
      unit,
      notes
    } = req.body;

    const senderId = req.user.id;

    if (!receiverId || !receiverLicenseId || !productId || !quantity || !unit) {
      throw ApiError.badRequest('Receiver, receiver license, product, quantity and unit are required');
    }

    if (isNaN(quantity) || parseFloat(quantity) <= 0) {
      throw ApiError.badRequest('Quantity must be a positive number');
    }

    const numericQuantity = parseFloat(quantity);
    
    const validUnits = ['LITERS', 'BOTTLES', 'CASES', 'KILOGRAMS', 'UNITS'];
    if (!unit || !validUnits.includes(unit.toUpperCase())) {
      throw ApiError.badRequest(`Invalid unit. Valid units are: ${validUnits.join(', ')}`);
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: {
        licenses: {
          where: {
            status: LicenseStatus.ACTIVE,
            type: {
              in: [LicenseType.MANUFACTURING, LicenseType.DISTRIBUTION]
            }
          }
        }
      }
    });

    if (!sender) {
      throw ApiError.notFound('Sender not found');
    }

    if (sender.licenses.length === 0) {
      throw ApiError.badRequest('Sender does not have an active manufacturing or distribution license');
    }

    const senderLicense = sender.licenses[0];

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      include: {
        licenses: {
          where: {
            id: receiverLicenseId,
            status: LicenseStatus.ACTIVE
          }
        }
      }
    });

    if (!receiver) {
      throw ApiError.notFound('Receiver not found');
    }

    if (receiver.licenses.length === 0) {
      throw ApiError.badRequest('Receiver does not have an active license with the specified ID');
    }

    const receiverLicense = receiver.licenses[0];

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    if (sender.role === UserRole.MANUFACTURER && !batchId) {
      throw ApiError.badRequest('Batch is required for manufacturer distributions');
    }

    
    if (sender.role === UserRole.DISTRIBUTOR) {
      const distributorStock = await prisma.distributorStock.findUnique({
        where: {
          distributorId_productId: {
            distributorId: senderId,
            productId
          }
        }
      });

      if (!distributorStock) {
        throw ApiError.badRequest('No stock available for this product');
      }

      if (numericQuantity > distributorStock.availableQuantity) {
        throw ApiError.badRequest(`Insufficient stock quantity. Available: ${distributorStock.availableQuantity} ${unit}, Requested: ${numericQuantity} ${unit}`);
      }
    }

    let batch = null;
    if (batchId) {
      batch = await prisma.productionBatch.findUnique({
        where: { id: batchId },
        select: {
          id: true,
          batchNo: true,
          productId: true,
          status: true,
          outputLiters: true,
          unitsProduced: true,
          submittedById: true,
          product: {
            select: {
              manufacturerId: true
            }
          }
        }
      });
      if (!batch) {
        throw ApiError.notFound('Batch not found');
      }

      if (sender.role === UserRole.MANUFACTURER) {
        if (batch.status !== BatchStatus.VERIFIED) {
          throw ApiError.badRequest('Only VERIFIED batches can be used for distribution');
        }

        if (batch.productId !== productId) {
          throw ApiError.badRequest('Selected batch does not belong to the selected product');
        }

        if (batch.product?.manufacturerId && batch.product.manufacturerId !== senderId) {
          throw ApiError.forbidden('You are not authorized to use this batch for distribution');
        }
      }

      
      if (sender.role === UserRole.MANUFACTURER) {
        
        const distributedOrders = await prisma.distributionOrder.findMany({
          where: {
            batchId: batch.id,
            status: {
              notIn: [DistributionOrderStatus.CANCELLED, DistributionOrderStatus.REJECTED],
            }
          },
          select: {
            quantity: true
          }
        });

        const totalDistributed = distributedOrders.reduce((sum, order) => sum + Number(order.quantity || 0), 0);
        const batchCapacity = getBatchCapacityByUnit(batch, unit);
        const availableQuantity = Math.max(batchCapacity - totalDistributed, 0);

        if (availableQuantity <= 0) {
          throw ApiError.badRequest('Selected batch has no available quantity left for distribution');
        }

        if (numericQuantity > availableQuantity) {
          throw ApiError.badRequest(`Insufficient batch quantity. Available: ${availableQuantity} ${unit}, Requested: ${numericQuantity} ${unit}`);
        }
      }
    }

    const allowedFlows = {
      [UserRole.MANUFACTURER]: [UserRole.DISTRIBUTOR, UserRole.RETAILER],
      [UserRole.DISTRIBUTOR]: [UserRole.RETAILER],
      [UserRole.RETAILER]: []
    };

    const senderRole = sender.role;
    const receiverRole = receiver.role;

    if (!allowedFlows[senderRole] || !allowedFlows[senderRole].includes(receiverRole)) {
      throw ApiError.badRequest(`Distribution from ${senderRole} to ${receiverRole} is not allowed`);
    }

    const orderCount = await prisma.distributionOrder.count();
    const orderNo = `DIST-${Date.now()}-${orderCount + 1}`;

    const distributionData = {
      orderNo,
      senderId,
      receiverId,
      senderLicenseId: senderLicense.id,
      receiverLicenseId: receiverLicense.id,
      productId,
      batchId,
      quantity,
      unit,
      notes,
      status: DistributionOrderStatus.PENDING
    };

    const distributionInclude = {
      sender: {
        select: { id: true, fullName: true, companyName: true, email: true }
      },
      receiver: {
        select: { id: true, fullName: true, companyName: true, email: true }
      },
      senderLicense: {
        select: { id: true, licenseNumber: true, type: true }
      },
      receiverLicense: {
        select: { id: true, licenseNumber: true, type: true }
      },
      product: {
        select: { id: true, code: true, name: true, category: true }
      },
      batch: {
        select: { id: true, batchNo: true, productionDate: true }
      }
    };

    const distributionOrder = sender.role === UserRole.DISTRIBUTOR
      ? await prisma.$transaction(async (tx) => {
        await tx.distributorStock.update({
          where: {
            distributorId_productId: {
              distributorId: senderId,
              productId
            }
          },
          data: {
            availableQuantity: {
              decrement: numericQuantity
            }
          }
        });

        return tx.distributionOrder.create({
          data: distributionData,
          include: distributionInclude
        });
      })
      : await prisma.distributionOrder.create({
        data: distributionData,
        include: distributionInclude
      });

    await logAudit({
      userId: senderId,
      action: 'CREATE',
      entityType: 'DistributionOrder',
      entityId: distributionOrder.id,
      description: `Created distribution order: ${orderNo} from ${sender.companyName || sender.fullName} to ${receiver.companyName || receiver.fullName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.created(res, distributionOrder, 'Distribution order created successfully');
  } catch (error) {
    next(error);
  }
};

const getDistributions = async (req, res, next) => {
  try {
    const { status, senderId, receiverId, productId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let where = {};

    if (status) {
      where.status = status;
    }

    if (senderId) {
      where.senderId = senderId;
    }

    if (receiverId) {
      where.receiverId = receiverId;
    }

    if (productId) {
      where.productId = productId;
    }

    if (userRole === UserRole.ADMIN || userRole === UserRole.ED_OFFICER) {
    } else if (userRole === UserRole.MANUFACTURER) {
      where.senderId = userId;
    } else if (userRole === UserRole.DISTRIBUTOR) {
      where.OR = [
        { senderId: userId },
        { receiverId: userId }
      ];
    } else if (userRole === UserRole.RETAILER) {
      where.receiverId = userId;
    } else {
      throw ApiError.forbidden('Access denied');
    }

    const distributions = await prisma.distributionOrder.findMany({
      where,
      include: {
        sender: {
          select: { id: true, fullName: true, companyName: true, email: true }
        },
        receiver: {
          select: { id: true, fullName: true, companyName: true, email: true }
        },
        product: {
          select: { id: true, code: true, name: true, category: true }
        },
        batch: {
          select: { id: true, batchNo: true, productionDate: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return ApiResponse.success(res, distributions, 'Distributions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getDistributionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const distribution = await prisma.distributionOrder.findUnique({
      where: { id },
      include: {
        sender: {
          select: { id: true, fullName: true, companyName: true, email: true, role: true }
        },
        receiver: {
          select: { id: true, fullName: true, companyName: true, email: true, role: true }
        },
        senderLicense: {
          select: { id: true, licenseNumber: true, type: true, status: true }
        },
        receiverLicense: {
          select: { id: true, licenseNumber: true, type: true, status: true }
        },
        product: {
          select: { id: true, code: true, name: true, category: true, packSizeMl: true, alcoholStrength: true }
        },
        batch: {
          select: { id: true, batchNo: true, productionDate: true, outputLiters: true, unitsProduced: true }
        }
      }
    });

    if (!distribution) {
      throw ApiError.notFound('Distribution order not found');
    }

    const canAccess = 
      userRole === UserRole.ADMIN ||
      userRole === UserRole.ED_OFFICER ||
      distribution.senderId === userId ||
      distribution.receiverId === userId;

    if (!canAccess) {
      throw ApiError.forbidden('Access denied to this distribution order');
    }

    return ApiResponse.success(res, distribution, 'Distribution order retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const updateDistributionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!status) {
      throw ApiError.badRequest('Status is required');
    }

    const validStatuses = Object.values(DistributionOrderStatus);
    if (!validStatuses.includes(status)) {
      throw ApiError.badRequest('Invalid status');
    }

    const distribution = await prisma.distributionOrder.findUnique({
      where: { id },
      include: {
        sender: true,
        receiver: true
      }
    });

    if (!distribution) {
      throw ApiError.notFound('Distribution order not found');
    }

    const canUpdate = 
      req.user.role === UserRole.ADMIN ||
      req.user.role === UserRole.ED_OFFICER ||
      distribution.senderId === userId ||
      distribution.receiverId === userId;

    if (!canUpdate) {
      throw ApiError.forbidden('You are not authorized to update this distribution order');
    }

    const updatedDistribution = await prisma.distributionOrder.update({
      where: { id },
      data: { status },
      include: {
        sender: {
          select: { id: true, fullName: true, companyName: true }
        },
        receiver: {
          select: { id: true, fullName: true, companyName: true }
        },
        product: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'DistributionOrder',
      entityId: distribution.id,
      description: `Updated distribution order ${distribution.orderNo} status to ${status}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedDistribution, 'Distribution order status updated successfully');
  } catch (error) {
    next(error);
  }
};

const dispatchDistribution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const distribution = await prisma.distributionOrder.findUnique({
      where: { id },
      include: {
        sender: true,
        receiver: true
      }
    });

    if (!distribution) {
      throw ApiError.notFound('Distribution order not found');
    }

    if (distribution.senderId !== userId) {
      throw ApiError.forbidden('Only the sender can dispatch this order');
    }

    if (distribution.status !== DistributionOrderStatus.PENDING) {
      throw ApiError.badRequest(`Cannot dispatch order with status: ${distribution.status}`);
    }

    const updatedDistribution = await prisma.distributionOrder.update({
      where: { id },
      data: {
        status: DistributionOrderStatus.DISPATCHED,
        dispatchedAt: new Date()
      },
      include: {
        sender: {
          select: { id: true, fullName: true, companyName: true }
        },
        receiver: {
          select: { id: true, fullName: true, companyName: true }
        },
        product: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'DistributionOrder',
      entityId: distribution.id,
      description: `Dispatched distribution order ${distribution.orderNo}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedDistribution, 'Distribution order dispatched successfully');
  } catch (error) {
    next(error);
  }
};

const receiveDistribution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const distribution = await prisma.distributionOrder.findUnique({
      where: { id },
      include: {
        sender: true,
        receiver: true,
        product: true
      }
    });

    if (!distribution) {
      throw ApiError.notFound('Distribution order not found');
    }

    if (distribution.receiverId !== userId) {
      throw ApiError.forbidden('Only the receiver can receive this order');
    }

    if (![DistributionOrderStatus.PENDING, DistributionOrderStatus.DISPATCHED].includes(distribution.status)) {
      throw ApiError.badRequest(`Cannot receive order with status: ${distribution.status}`);
    }

    const updatedDistribution = await prisma.distributionOrder.update({
      where: { id },
      data: {
        status: DistributionOrderStatus.RECEIVED,
        receivedAt: new Date()
      },
      include: {
        sender: {
          select: { id: true, fullName: true, companyName: true }
        },
        receiver: {
          select: { id: true, fullName: true, companyName: true }
        },
        product: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    if (distribution.receiver.role === UserRole.DISTRIBUTOR) {
      await prisma.distributorStock.upsert({
        where: {
          distributorId_productId: {
            distributorId: distribution.receiverId,
            productId: distribution.productId
          }
        },
        create: {
          distributorId: distribution.receiverId,
          productId: distribution.productId,
          availableQuantity: distribution.quantity
        },
        update: {
          availableQuantity: {
            increment: distribution.quantity
          }
        }
      });
    }

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'DistributionOrder',
      entityId: distribution.id,
      description: `Received distribution order ${distribution.orderNo}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ApiResponse.success(res, updatedDistribution, 'Distribution order received successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDistribution,
  getDistributions,
  getDistributionById,
  updateDistributionStatus,
  dispatchDistribution,
  receiveDistribution
};