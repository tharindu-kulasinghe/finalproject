const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

const MIGRATION_MESSAGE =
  'Legacy LicenseApplication endpoint has been deprecated. Use one of: ' +
  '/api/manufacturing-applications, /api/distribution-applications, /api/retail-applications';

const emptyPagination = {
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
};

const createApplication = async (req, res, next) => {
  try {
    throw ApiError.badRequest(MIGRATION_MESSAGE);
  } catch (error) {
    next(error);
  }
};

const getApplications = async (req, res, next) => {
  try {
    return ApiResponse.success(
      res,
      { applications: [], pagination: emptyPagination },
      MIGRATION_MESSAGE
    );
  } catch (error) {
    next(error);
  }
};

const getApplicationById = async (req, res, next) => {
  try {
    throw ApiError.notFound(MIGRATION_MESSAGE);
  } catch (error) {
    next(error);
  }
};

const reviewApplication = async (req, res, next) => {
  try {
    throw ApiError.badRequest(MIGRATION_MESSAGE);
  } catch (error) {
    next(error);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    throw ApiError.badRequest(MIGRATION_MESSAGE);
  } catch (error) {
    next(error);
  }
};

const getMyApplications = async (req, res, next) => {
  try {
    return ApiResponse.success(
      res,
      { applications: [], pagination: emptyPagination },
      MIGRATION_MESSAGE
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createApplication,
  getApplications,
  getApplicationById,
  reviewApplication,
  updateApplicationStatus,
  getMyApplications,
};
