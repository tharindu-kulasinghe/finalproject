const calculateDuty = (category, outputLiters, alcoholStrength, packType, packSizeMl) => {
  let ratePerLiter = 0;

  switch (category) {
    case 'SPIRITS':
      ratePerLiter = alcoholStrength > 40 ? 450 : 350;
      break;
    case 'BEER':
      ratePerLiter = alcoholStrength > 5 ? 75 : 50;
      break;
    case 'WINE':
      ratePerLiter = alcoholStrength > 15 ? 200 : 150;
      break;
    case 'TOBACCO':
      ratePerLiter = packType === 'SACHET' ? 2 : 10;
      break;
    default:
      ratePerLiter = 100;
  }

  let assessedAmount = 0;

  if (category === 'TOBACCO' && packSizeMl) {
    const liters = (packSizeMl / 1000) * outputLiters;
    assessedAmount = liters * ratePerLiter;
  } else {
    assessedAmount = outputLiters * ratePerLiter;
  }

  return Math.round(assessedAmount * 100) / 100;
};

const calculateDutyForBatch = async (prisma, batchId) => {
  const batch = await prisma.productionBatch.findUnique({
    where: { id: batchId },
    include: {
      product: {
        include: {
          license: true
        }
      },
      dutyAssessments: true
    }
  });

  if (!batch) {
    throw new Error('Batch not found');
  }

  if (batch.status !== 'VERIFIED') {
    throw new Error('Batch must be verified before calculating duty');
  }

  const dutyRate = await prisma.dutyRate.findFirst({
    where: {
      OR: [
        { productId: batch.productId },
        { category: batch.product.category }
      ],
      isActive: true,
      effectiveFrom: { lte: new Date() }
    },
    orderBy: { effectiveFrom: 'desc' }
  });

  if (!dutyRate) {
    throw new Error('No active duty rate found for this product');
  }

  const assessedAmount = calculateDuty(
    batch.product.category,
    batch.outputLiters,
    batch.product.alcoholStrength,
    batch.product.packType,
    batch.product.packSizeMl
  );

  return {
    assessedAmount,
    batch,
    dutyRate
  };
};

module.exports = {
  calculateDuty,
  calculateDutyForBatch
};
