class CustomAPIError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const createCustomError = (msg: string, statusCode: number): CustomAPIError => {
  return new CustomAPIError(msg, statusCode);
};

export { createCustomError, CustomAPIError };
