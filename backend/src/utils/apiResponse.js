class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  static created(res, data, message = 'Created successfully') {
    return this.success(res, data, message, 201);
  }

  static ok(res, data, message = 'Success') {
    return this.success(res, data, message, 200);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static error(message, statusCode = 500) {
    return {
      success: false,
      message,
      statusCode
    };
  }
}

module.exports = ApiResponse;
