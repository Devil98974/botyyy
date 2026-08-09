const fs=require("fs");
const mineflayer=require("mineflayer");
const config=JSON.parse(fs.readFileSync("./config.json","utf8"));
let bot=null,reconnectTimer=null,movementTimer=null,stopping=false;

function clearTimers(){
  if(reconnectTimer) clearTimeout(reconnectTimer);
  if(movementTimer) clearInterval(movementTimer);
  reconnectTimer=null; movementTimer=null;
}
function reconnect(){
  if(stopping||reconnectTimer)return;
  reconnectTimer=setTimeout(()=>{reconnectTimer=null;connect();},Math.max(5,Number(config.reconnectDelaySeconds||15))*1000);
}
function startMovement(){
  if(movementTimer) clearInterval(movementTimer);
  movementTimer=setInterval(()=>{
    if(!bot||!bot.entity)return;
    bot.setControlState("forward",true);
    setTimeout(()=>{if(bot&&bot.entity)bot.setControlState("forward",false);},1000);
    setTimeout(()=>{if(bot&&bot.entity)bot.look(Math.random()*Math.PI*2,0,true).catch(()=>{});},1200);
  },Math.max(15,Number(config.moveIntervalSeconds||45))*1000);
}
function connect(){
  if(stopping)return;
  clearTimers();
  console.log(`Connecting to ${config.host}:${config.port}...`);
  try{
    bot=mineflayer.createBot({
      host:config.host,port:Number(config.port),username:config.username,
      version:config.version||false,auth:config.auth||"offline",
      checkTimeoutInterval:60000
    });
  }catch(e){console.error("Connection setup error:",e.message);reconnect();return;}
  bot.once("spawn",()=>{console.log("Bot spawned successfully.");startMovement();});
  bot.on("error",e=>console.error("Minecraft error:",e.message));
  bot.on("kicked",r=>console.log("Bot kicked:",String(r)));
  bot.on("end",()=>{console.log("Connection ended.");clearTimers();bot=null;reconnect();});
}
function shutdown(signal){
  if(stopping)return; stopping=true; console.log(`Received ${signal}; shutting down safely...`);
  clearTimers(); try{if(bot)bot.quit("Bot shutting down");}catch(_){}
  setTimeout(()=>process.exit(0),1000);
}
process.on("SIGINT",()=>shutdown("SIGINT"));
process.on("SIGTERM",()=>shutdown("SIGTERM"));
process.on("uncaughtException",e=>{console.error("Unexpected error:",e);clearTimers();bot=null;reconnect();});
process.on("unhandledRejection",e=>console.error("Unhandled promise rejection:",e));
connect();
