import { NextFunction, Request, Response } from "express"

const { CustomAPIError } = require('../errors/custom-error')
const errorHandlerMiddleware = (err:any, req:Request, res:Response, next:NextFunction) => {
  console.log(err)
  if (err instanceof CustomAPIError) {
    return res.status(err.statusCode).json({status:'error', message: err.message })
  }
  return res.status(500).json({ message: 'Internal server error, try again later', status:'error'})
}

export default errorHandlerMiddleware
