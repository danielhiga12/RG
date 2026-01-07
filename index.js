const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = "!";
const DATA = "./data";

// ========= UTIL =========
function load(file) {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) fs.writeFileSync(p, "{}");
  const content = fs.readFileSync(p, "utf8");
  if (!content) return {};
  return JSON.parse(content);
}

function save(file, data) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2));
}

function hasRole(member, roles) {
  return member.roles.cache.some(r => roles.includes(r.name));
}

function gerarNumero(d) {
  let n = "";
  for (let i = 0; i < d; i++) n += Math.floor(Math.random() * 10);
  return n;
}

function gerarCPF() {
  const n = gerarNumero(19);
  return `${n[0]}.${n.slice(1,4)}.${n.slice(4,7)}.${n.slice(7,10)}.${n.slice(10,13)}.${n.slice(13,16)}.${n.slice(16,19)}`;
}

function idade(data) {
  const [d,m,a] = data.split("/").map(Number);
  const hoje = new Date();
  let i = hoje.getFullYear() - a;
  if (hoje.getMonth()+1 < m || (hoje.getMonth()+1 === m && hoje.getDate() < d)) i--;
  return i;
}

function logEmbed(guild, canal, titulo, desc) {
  const ch = guild.channels.cache.find(c => c.name === canal);
  if (!ch) return;
  const e = new EmbedBuilder()
    .setColor("#2f3136")
    .setTitle(titulo)
    .setDescription(desc)
    .setTimestamp();
  ch.send({ embeds: [e] });
}

// ========= BOT =========
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(1).split(";");
  const cmd = args.shift().toLowerCase();

  const rgs = load("rgs.json");
  const economia = load("economia.json");
  const governo = load("governo.json");
  const mandados = load("mandados.json");
  const antecedentes = load("antecedentes.json");

  // ===== AJUDA =====
  if (cmd === "ajuda") {
    return message.author.send(
`🪪 RG
!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero
!rg

🚔 POLÍCIA
!addmandado @user Motivo
!mandadosativos

🏛️ GOVERNO
!cofregoverno
!imposto 5

💰 ECONOMIA
!saldo
!trabalhar

⚖️ JUDICIÁRIO
!antecedentes @user`
    );
  }

  // ===== RG =====
  if (cmd === "setrg") {
    if (args.length < 4) return message.reply("❌ Use: `!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero`");
    if (rgs[message.author.id]) return message.reply("❌ Você já tem RG.");

    const nasc = args[2];
    const id = idade(nasc);
    const validade = new Date();
    validade.setFullYear(validade.getFullYear() + 1);

    rgs[message.author.id] = {
      nome: args[0],
      estado: args[1],
      nascimento: nasc,
      idade: id,
      genero: args[3],
      rg: gerarNumero(19),
      cpf: gerarCPF(),
      status: "Válido",
      validade: validade.toLocaleDateString("pt-BR"),
      cnh: "Regular"
    };

    save("rgs.json", rgs);
    logEmbed(message.guild,"logs-rg","🪪 RG CRIADO",`${message.author.tag}`);
    message.reply("✅ RG criado.");
  }

  if (cmd === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Sem RG.");

    const e = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setColor("#1f2c34")
      .setDescription(`━━━━━━━━━━━━━━━━━━━━
👤 Nome: ${rg.nome}
🆔 RG: ${rg.rg}
💍 Estado Civil: ${rg.estado}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
✅ Status: ${rg.status}
📅 Validade: ${rg.validade}
🚔 CNH: ${rg.cnh}
📋 Antecedentes: ${antecedentes[message.author.id] || "Nenhum"}`);

    message.reply({ embeds:[e] });
  }

  // ===== ECONOMIA =====
  if (cmd === "saldo") {
    message.reply(`💰 Saldo: R$ ${economia[message.author.id] || 0}`);
  }

  if (cmd === "trabalhar") {
    const ganho = Math.floor(Math.random()*300)+100;
    economia[message.author.id] = (economia[message.author.id] || 0) + ganho;
    save("economia.json", economia);
    logEmbed(message.guild,"logs-economia","💼 Trabalho",`${message.author.tag} ganhou R$${ganho}`);
    message.reply(`💼 Você ganhou R$${ganho}`);
  }

  // ===== GOVERNO =====
  if (cmd === "cofregoverno") {
    if (!hasRole(message.member, ["Governador","Fundador"])) return;
    message.reply(`🏛️ Cofre: R$ ${governo.cofre || 0}`);
  }

  if (cmd === "imposto") {
    if (!hasRole(message.member, ["Governador"])) return;
    governo.imposto = Number(args[0]);
    save("governo.json", governo);
    message.reply("📊 Imposto atualizado.");
  }

  // ===== POLÍCIA =====
  if (cmd === "addmandado") {
    if (!hasRole(message.member, ["Polícia","Administrador"])) return;
    const user = message.mentions.users.first();
    if (!user) return;
    mandados[user.id] = args.join(" ");
    save("mandados.json", mandados);
    logEmbed(message.guild,"logs-policial","🚨 Mandado criado",`${user.tag}`);
    message.reply("✅ Mandado registrado.");
  }

  if (cmd === "mandadosativos") {
    let txt = Object.entries(mandados).map(([id,m])=>`<@${id}>: ${m}`).join("\n");
    if (!txt) txt = "Nenhum.";
    message.reply(txt);
  }

  // ===== JUDICIÁRIO =====
  if (cmd === "antecedentes") {
    const user = message.mentions.users.first();
    if (!user) return;
    message.reply(`📋 Antecedentes: ${antecedentes[user.id] || "Nenhum"}`);
  }
});

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.login(process.env.TOKEN);
