const crypto = require("crypto");
const SANDBOX_BASE_URL = "https://sandbox.momodeveloper.mtn.com";
function normalizeMsisdn(value){const digits=String(value||"").replace(/\D/g,"");if(digits.startsWith("256")&&digits.length===12)return digits;if(digits.startsWith("0")&&digits.length===10)return `256${digits.slice(1)}`;if(digits.startsWith("7")&&digits.length===9)return `256${digits}`;return null;}
function makeReference(id){const d=crypto.createHash("sha256").update(`casharrow-deposit:${id}`).digest("hex");return `${d.slice(0,8)}-${d.slice(8,12)}-4${d.slice(13,16)}-8${d.slice(17,20)}-${d.slice(20,32)}`;}
function configured(){return process.env.MTN_ENVIRONMENT==="sandbox"&&process.env.MTN_AUTOMATIC_DEPOSITS_ENABLED==="true"&&Boolean(process.env.MTN_COLLECTION_SUBSCRIPTION_KEY&&process.env.MTN_API_USER&&process.env.MTN_API_KEY);}
module.exports={SANDBOX_BASE_URL,normalizeMsisdn,makeReference,configured};