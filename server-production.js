const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("./database-pg");
const accountPg = require("./account-pg-routes");
const memberPg = require("./member-pg-routes");
const rental = require("./rental-routes");
const withdrawal = require("./withdrawal-routes");
const mobileMoney = require("./mobile-money-sandbox-routes");
const pgFinancial = require("./pg-financial-routes");
const adminProducts = require("./admin-product-routes");

const app = express();
const PORT = Number(process.env.PORT || 3000);

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL environment variable is not configured");
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET environment variable is not configured");

app.disable("x-powered-by");
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

const AVEILOT_BRANDING_SCRIPT = `<script>(function(){function clean(root){const walker=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);const nodes=[];let n;while(n=walker.nextNode())nodes.push(n);nodes.forEach(t=>{if(/CashArrow/i.test(t.nodeValue))t.nodeValue=t.nodeValue.replace(/CashArrow/gi,'AVEILOT')})}function start(){clean(document.body);new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)clean(n)}))).observe(document.body,{childList:true,subtree:true})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()})();</script>`;

app.get("/member.html", (req, res) => { try { const file=path.join(__dirname,"public","member.html"); let html=fs.readFileSync(file,"utf8"); html=html.replaceAll("CashArrow","AVEILOT"); const scripts='<script src="/rental-catalog.js?v=custom-machines-1"></script><script src="/machine-photo-display.js?v=1"></script><script src="/aveilot-machine-catalog-fix.js?v=4"></script><script src="/aveilot-withdrawal-fee.js?v=2"></script><script src="/aveilot-member-polish.js?v=1"></script><script src="/aveilot-rental-earnings-ui.js?v=1"></script>'; html=html.replace("</body>",`${scripts}${AVEILOT_BRANDING_SCRIPT}</body>`); res.set("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");res.set("Pragma","no-cache");res.set("Expires","0");res.type("html").send(html);} catch(error){console.error("AVEILOT member dashboard failed to load:",error);res.status(500).send("Unable to load member dashboard");} });

app.get("/admin.html", (req,res)=>{try{const file=path.join(__dirname,"public","admin.html");let html=fs.readFileSync(file,"utf8");const scripts='<script src="/admin-machine-manager-v2.js?v=2"></script>';html=html.replace("</body>",`${scripts}${AVEILOT_BRANDING_SCRIPT}</body>`);res.set("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");res.set("Pragma","no-cache");res.set("Expires","0");res.type("html").send(html);}catch(error){console.error("AVEILOT admin panel failed to load:",error);res.status(500).send("Unable to load admin panel");}});

app.use(express.static(path.join(__dirname,"public"),{index:false}));
app.get("/api/status",async(req,res)=>{try{await db.query("SELECT 1");res.json({success:true,message:"AVEILOT server is running",database:"connected",environment:process.env.NODE_ENV||"development"});}catch(error){console.error("Health check failed:",error);res.status(503).json({success:false,message:"AVEILOT database is unavailable"});}});

// Daily earnings are now the only rental payout mechanism. The legacy manual
// completion endpoint must never issue the old full return amount.
app.post("/api/rentals/:id/complete", (req, res) => {
  res.status(410).json({
    success: false,
    message: "Manual rental completion is disabled. Rental income is credited automatically each day."
  });
});

app.use("/api",accountPg.router);app.use("/api",memberPg.router);app.use("/api",pgFinancial.router);app.use("/api",rental.router);app.use("/api",withdrawal.router);app.use("/api",mobileMoney.router);app.use("/api",adminProducts.router);

app.get("/",(req,res)=>{const file=path.join(__dirname,"public","index.html");let html=fs.readFileSync(file,"utf8");const scripts='<script src="/guest-home-polish.js?v=1"></script><script src="/aveilot-auth-polish.js?v=1"></script>';html=html.replace("</body>",`${scripts}${AVEILOT_BRANDING_SCRIPT}</body>`);res.set("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");res.set("Pragma","no-cache");res.set("Expires","0");res.type("html").send(html);});
app.use((req,res)=>res.status(404).json({success:false,message:"Endpoint not found"}));

module.exports=app;
