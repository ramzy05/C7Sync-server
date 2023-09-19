import express, {Application} from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss  from 'xss';
import mongoSanitize from 'express-mongo-sanitize';
import 'dotenv/config';


//

import routes from './routes'
import errorHandlerMiddleware from './middlewares/error-handler';
import notFound from './middlewares/not-found';

const app:Application = express()


const limiter = rateLimit({
  max:3000,
  windowMs:60*60*100, //in one hour
  message:'To many requests from this IP, try again later in an hour'
})
 app.use('/app', limiter)


// middleware
app.use(express.json({limit:'10kb'}))
app.use(express.urlencoded({extended:true}))
app.use(helmet())
app.use(mongoSanitize())
app.use(cors({
  origin:'*',
  methods:['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials:true
}))
// app.use(xss('<script>alert("xss");</script>'))
if(process.env.NODE_ENV==='development'){
  app.use(morgan('dev'))
}



//routes
app.use(routes)
app.use(errorHandlerMiddleware);
app.use(notFound);

export default app;
