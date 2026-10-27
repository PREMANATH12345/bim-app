// middleware/jwtAuth.js
import jwt from "jsonwebtoken";

export const verifyJWTT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const secret = process.env.JWT_SECRET || process.env.JWT_SECRETT;
  
  if (authHeader && authHeader.startsWith('Bearer ') && secret) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
    } catch (error) {
      console.error('JWT verification failed:', error);
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
};