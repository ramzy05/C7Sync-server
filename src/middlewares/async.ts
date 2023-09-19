const asyncWrapper = (fn) => {
   /* the goal of the func is to avoid define async function on for controllers
  */
  return async (req, res, next) => {
    try {
      await fn(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}

module.exports = asyncWrapper
