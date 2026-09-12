const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./database-pg");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not configured");

function auth(req,res,next){
  const h=req.headers.authorization;
  if(!h||!h.startsWith("Bearer ")) return res.status(401).json({success:false,message:"Authentication required"});
  try{req.user=jwt.verify(h.slice(7),JWT_SECRET);next();}catch{res.status(401).json({success:false,message:"Invalid or expired session"});}
}
function admin(req,res,next){if(req.user.role!=="admin")return res.status(403).json({success:false,message:"Admin access required"});next();}

async function getSettings(){
  const r=await db.query("SELECT * FROM payment_settings WHERE id=1");
  if(r.rowCount) return r.rows[0];
  const created=await db.query("INSERT INTO payment_settings (id,enabled,mtn_number,airtel_number,instructions,updated_at) VALUES (1,false,'','', 'Payment instructions will be configured by the administrator.',NOW()) RETURNING *");
  return created.rows[0];
}

// Safe public read: only exposes payment instructions, never secrets or database details.
router.get("/payment-settings", async (req,res)=>{
  try{
    const s=await getSettings();
    res.json({success:true,settings:{enabled:s.enabled,mtnNumber:s.mtn_number,airtelNumber:s.airtel_number,instructions:s.instructions,updatedAt:s.updated_at}});
  }catch(error){console.error("Payment settings read failed:",error);res.status(500).json({success:false,message:"Unable to load payment settings"});}
});

router.get("/admin/payment-settings",auth,admin,async(req,res)=>{
  try{const s=await getSettings();res.json({success:true,settings:s});}catch(error){console.error("Admin payment settings read failed:",error);res.status(500).json({success:false,message:"Unable to load payment settings"});}
});

router.put("/admin/payment-settings",auth,admin,async(req,res)=>{
  const enabled=Boolean(req.body.enabled);
  const mtn=String(req.body.mtnNumber||"").trim();
  const airtel=String(req.body.airtelNumber||"").trim();
  const instructions=String(req.body.instructions||"").trim().slice(0,1000);
  if(mtn.length>40||airtel.length>40) return res.status(400).json({success:false,message:"Payment number is too long"});
  if(enabled && !mtn && !airtel) return res.status(400).json({success:false,message:"Add at least one receiving number before enabling deposits"});
  try{
    const r=await db.query(`INSERT INTO payment_settings (id,enabled,mtn_number,airtel_number,instructions,updated_at) VALUES (1,$1,$2,$3,$4,NOW()) ON CONFLICT (id) DO UPDATE SET enabled=EXCLUDED.enabled,mtn_number=EXCLUDED.mtn_number,airtel_number=EXCLUDED.airtel_number,instructions=EXCLUDED.instructions,updated_at=NOW() RETURNING *`,[enabled,mtn,airtel,instructions]);
    res.json({success:true,message:"Payment receiving settings saved",settings:r.rows[0]});
  }catch(error){console.error("Payment settings save failed:",error);res.status(500).json({success:false,message:"Unable to save payment settings"});}
});

module.exports=router;
