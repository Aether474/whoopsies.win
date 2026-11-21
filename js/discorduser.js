//took insp from belvin (skidded 30% of it)
import LanyardClient from "./lanyardClient.js";
      

const nowplaying = document.getElementById("nowplaying");
const albumimg = document.getElementById("albumimage");
const statusdiv = document.getElementById("statusdiv");
const pfp = document.getElementById("pfp")
let lastStatus = "card-status-offline";
const client = new LanyardClient();
let sock = client.subscribe("713113056346898522");



sock.addEventListener("message", (e) => {
    const data = JSON.parse(e.data);
    if (data.op !== 0) {
        return;
    }
    
    const { d } = data;
    console.log(d);

    if (d.discord_status === "online") {
        statusdiv.classList.remove(lastStatus);
        statusdiv.classList.add("card-status-online");
        lastStatus = "card-status-online";
    } else if (d.discord_status === "idle") {
        statusdiv.classList.remove(lastStatus);
        statusdiv.classList.add("card-status-idle");
        lastStatus = "card-status-idle";
    } else if (d.discord_status === "dnd") {
        statusdiv.classList.remove(lastStatus);
        statusdiv.classList.add("card-status-dnd");
        lastStatus = "card-status-dnd";
    } else {
        statusdiv.classList.remove(lastStatus);
        statusdiv.classList.add("card-status-offline");
        lastStatus = "card-status-offline";
    }
    if (d.discord_user.avatar) { 
        pfp.src = `https://cdn.discordapp.com/avatars/${d.discord_user.id}/${d.discord_user.avatar}.webp?size=1024`
    } else {
        pfp.src = '../media/1256b1e634d7274dd430.png'
    }

});
