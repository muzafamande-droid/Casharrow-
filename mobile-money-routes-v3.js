const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./database");
const momo = require("./mobile-money-v3");
const router = express.Router();

function auth(req,res,next){
  const h=req.headers.authorization||"";
  if(!h.startsWith("Bearer ")) return res.status(401).json({success:false,message:"Authentication required"});
  try{req.user=jwt.verify(h.slice(7),process.env.JWT_SECRET);next();}catch(_){return res.status(401).json({success:false,message:"Invalid or expired session"});}
}
function deposit(id){const n=Number(id);if(!Number.isInteger(n)||n<=0)return null;return db.prepare("SELECT id,user_id,amount,network,account,status FROM deposits WHERE id=?").get(n);}
function verifyCredit(d,s,reference){
  if(!d)return {error:"Deposit not found",status:404};
  if(d.status==="approved")return {success:true,alreadyProcessed:true};
  if(d.status!=="pending")return {error:"Deposit is not pending",status:409};
  if(String(s.externalId||"")!==`CASHARROW-${reference}`)return {error:"Provider reference does not match this deposit",status:409};
  if(Number(s.amount)!==Number(d.amount))return {error:"Provider amount does not match this deposit",status:409};
  const payer=momo.normalizeMsisdn(s.payer?.partyId), expected=momo.normalizeMsisdn(d.account);
  if(!payer||!expected||payer!==expected)return {error:"Provider payer does not match this deposit",status:409};
  return db.transaction(()=>{
    const current=db.prepare("SELECT status FROM deposits WHERE id=?").get(d.id);
    if(!current||current.status!=="pending")return {success:true,alreadyProcessed:true};
    const u=db.prepare("UPDATE deposits SET status='approved',approved_at=datetime('now') WHERE id=? AND status='pending'").run(d.id);
    if(u.changes!==1)return {success:true,alreadyProcessed:true};
    db.prepare("UPDATE users SET balance=balance+?,wallet=wallet+? WHERE id=?").run(d.amount,d.amount,d.user_id);
    db.prepare("INSERT INTO transactions (user_id,type,amount,date) VALUES (?, 'Deposit', ?, datetime('now'))").run(d.user_id,d.amount);
    return {success:true,depositId:d.id,amount:d.amount};
  })();
}
async function reconcile(d){
  const reference=momo.makeReference(d.id);
  const s=await momo.getPaymentStatus(reference);
  if(s.status==="SUCCESSFUL")return verifyCredit(d,s,reference);
  if(["FAILED","REJECTED","CANCELLED"].includes(s.status))db.prepare("UPDATE deposits SET status='failed' WHERE id=? AND status='pending'").run(d.id);
  return {success:true,status:s.status||"PENDING",depositId:d.id};
}

router.post("/mobile-money/deposit",auth,async(req,res)=>{
  const amount=Number(req.body.amount), network=String(req.body.network||"").trim(), account=momo.normalizeMsisdn(req.body.account);
  if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({success:false,message:"Enter a valid deposit amount"});
  if(network!=="MTN")return res.status(400).json({success:false,message:"Automatic deposits are currently available for MTN Mobile Money only"});
  if(!account)return res.status(400).json({success:false,message:"Enter a valid Ugandan Mobile Money number"});
  if(!momo.configured())return res.status(503).json({success:false,code:"PAYMENT_PROVIDER_NOT_CONFIGURED",message:"Automatic MTN deposits are not enabled yet. No money has been charged."});
  const user=db.prepare("SELECT id,phone FROM users WHERE id=?").get(req.user.id);
  if(!user)return res.status(404).json({success:false,message:"User not found"});
  if(momo.normalizeMsisdn(user.phone)!==account)return res.status(400).json({success:false,message:"Use the Mobile Money number registered on your CashArrow account"});
  const row=db.prepare("INSERT INTO deposits (user_id,amount,network,account,status,date) VALUES (?,?,'MTN',?,'pending',datetime('now'))").run(user.id,amount,account);
  const id=Number(row.lastInsertRowid), reference=momo.makeReference(id);
  const base=process.env.MTN_CALLBACK_URL||`${String(process.env.PUBLIC_BASE_URL||"").replace(/\/$/,"")}/api/mobile-money/mtn/callback`;
  const callback=`${base}${base.includes("?")?"&":"?"}depositId=${id}&reference=${encodeURIComponent(reference)}`;
  if(!callback.startsWith("https://")){db.prepare("UPDATE deposits SET status='failed' WHERE id=? AND status='pending'").run(id);return res.status(503).json({success:false,code:"PAYMENT_CALLBACK_NOT_CONFIGURED",message:"CashArrow payment callback is not configured securely. No money has been charged."});}
  try{await momo.requestPayment({amount,phone:account,reference,callbackUrl:callback,externalId:`CASHARROW-${reference}`});}
  catch(e){console.error("MTN payment initiation failed:",e.message);db.prepare("UPDATE deposits SET status='failed' WHERE id=? AND status='pending'").run(id);return res.status(502).json({success:false,message:"Unable to start the Mobile Money payment. No wallet credit was made."});}
  return res.status(202).json({success:true,depositId:id,status:"pending",message:"Payment request sent. Check your MTN phone and approve the payment with your Mobile Money PIN."});
});

router.all("/mobile-money/mtn/callback",async(req,res)=>{
  const id=Number(req.query.depositId), reference=String(req.query.reference||req.headers["x-reference-id"]||req.body?.referenceId||"");
  const d=deposit(id);
  if(!reference||!d)return res.status(400).json({success:false,message:"Missing or invalid payment reference"});
  try{const result=await reconcile(d);if(result.error)return res.status(result.status).json({success:false,message:result.error});return res.status(200).json({success:true});}
  catch(e){console.error("MTN callback processing failed:",e.message);return res.status(500).json({success:false,message:"Callback processing failed"});}
});

router.get("/mobile-money/deposit/:id/status",auth,async(req,res)=>{
  const d=deposit(req.params.id);
  if(!d||d.user_id!==req.user.id)return res.status(404).json({success:false,message:"Deposit not found"});
  if(d.status!=="pending")return res.json({success:true,depositId:d.id,status:d.status});
  if(!momo.configured())return res.json({success:true,depositId:d.id,status:"pending"});
  try{const result=await reconcile(d);return res.json(result);}catch(e){return res.json({success:true,depositId:d.id,status:"pending"});}
});
module.exports={router};
