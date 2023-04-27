module.exports = (response, status, message, data) => {
  const result = {}
  const isExecutionSuccess = status === 200 || status === 201 || status === 202

  if (isExecutionSuccess) {
    result.meta = {
      code: status,
    };
    result.meta = {
      ...result.meta,
      status: "success",
    };
    result.meta = {
      ...result.meta,
      message: message || "Something went wrong",
    };
    result.data = data;
  } else {
    result.code = status;
    result.status = false;
    result.message = message || "Something went wrong";
  }

  return response.status(status).json(result);
}
