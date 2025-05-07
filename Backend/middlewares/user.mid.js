import jwt from "jsonwebtoken";
import config from "../config.js";

function userMiddlewares(req,res,next){
   
    const authHeader= req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({errors: "No token provided"})
    }
    const token=authHeader.split(" ")[1];

    try{
        const decoded=jwt.verify(token, config.JWT_USER_PASSWORD)
        req.userId=decoded.id;
        next();
    }catch(error){
        console.log("Invalid token or expired token: " + error)
        return res.status(401).json({errors: "Invalid token or expired"})
    }
}

export default userMiddlewares;