import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import secretKey from "../config/jwtConfig.js";





export const createJWT = (res, userId) => {
  const token = jwt.sign({ userId }, secretKey , {
    expiresIn: "1d",
  });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 1 * 24 * 60 * 60 * 1000, 
  });
};
