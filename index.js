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
const DATA_DIR = "./data";

// ====== ARQUIVOS ======
const FILES = {
  rgs: "rgs.json",
  economy: "economy.json",
  mandados: "mandados.json",
  processos: "processos.json",
  impostos: "impostos.json"
};

// ====== CARGOS ======
const CARGOS = {
  FUNDADOR: "Fundador",
  GOVERNADOR: "Governador",
  POLICIA: ["Polícia Civil", "Polícia Militar", "Polícia Federal", "PRF", "Polícia do Exército"],
  JUDICIARIO: ["Juiz", "Promotor"],
  STAFF_RG: ["Fundador", "Administrador", "Gerente de Comunidade", "Monitor"],
  MEDICO: ["Medico", "Paramedico"]
};

// ====== LOGS ======
const LOG_CHANNELS = {
  RG: "logs-rg",
  POLICIA: "logs-policia",
  JUDICIARIO: "logs-judiciario",
  ECONOMIA: "logs-economia",
  GOVERNO: "logs-governo"
};

// ====== SETUP ======
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
for (const f of Object.values(FILES)) {
  const p = path.join(DATA_DIR, f);
  if (!fs.existsSync(p)) fs.writeFileSync(p, "{}");
}

const load = f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f)));
const save = (f, d) => fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(d, null, 2));

const hasRole = (m, roles) =>
  m.member.roles.cache.some(r => Array.isArray(roles) ? roles.includes(r.name) : r.name === roles);

const logEmbed = async (guild, type, embed) => {
  const ch = guild.channels.cache.find(c => c.name === LOG_CHANNELS[type]);
  if (ch) ch.send({ embeds: [embed] });
};

// ====== UTIL ======
const gerarNumero = n => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

const gerarCPF = () => {
  const n = gerarNumero(19);
  return `${n.slice(0,1)}.${n.slice(1,4)}.${n.slice(4,7)}.${n.slice(7,10)}.${n.slice(10,13)}.${n.slice(13,16)}.${n.slice(16,19)}`;
};

const idade = data => {
  const [d,m,y] = data.split("/").map(Number);
  const h = new Date();
  let i = h.getFullYear() - y;
  if (h.getMonth()+1 < m || (h.getMonth()+1 === m && h.getDate() < d)) i--;
  return i;
};

const validadeRG = data => {
  const [d,m,y] = data.split("/").map(Number);
  return `${d}/${m}/${y+20}`;
};

// ====== BOT ======
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const [cmd, ...rest] = message.content.slice(1).split(" ");
  const args = rest.join(" ").split(";");

  const rgs = load(FILES.rgs);
  const economy = load(FILES.economy);
  const mandados = load(FILES.mandados);

  // ====== AJUDA ======
  if (cmd === "ajuda") {
    return message.author.send(
      "📜 **Comandos RP Disponíveis**\n" +
      "🪪 RG: !setrg !rg !consultar !rgeditar !rgdeletar\n" +
      "🚔 Polícia: !multa !addmandado !mandosativos !removermandado\n" +
      "⚖️ Judiciário: !cassarcnh !regularcnh !verantecedentes\n" +
      "💰 Economia: !saldo !transferir\n" +
      "🏛️ Governo: !sitio !decretarimposto\n"
    );
  }

  // ====== SET RG ======
  if (cmd === "setrg") {
    if (args.length < 4) return message.reply("❌ Use: `!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero`");
    if (rgs[message.author.id]) return message.reply("❌ Você já possui RG.");

    const id = idade(args[2]);
    if (id < 0 || id > 120) return message.reply("❌ Data inválida.");

    rgs[message.author.id] = {
      nome: args[0],
      estadoCivil: args[1],
      nascimento: args[2],
      idade: id,
      genero: args[3],
      rg: gerarNumero(19),
      cpf: gerarCPF(),
      status: "Válido",
      validade: validadeRG(args[2]),
      cnh: "Regular",
      antecedentes: "Nenhum"
    };

    save(FILES.rgs, rgs);
    message.reply("✅ RG criado com sucesso!");
  }

  // ====== VER RG ======
  if (cmd === "rg" || cmd === "consultar") {
    const user = message.mentions.users.first() || message.author;
    const rg = rgs[user.id];
    if (!rg) return message.reply("❌ RG não encontrado.");

    const completo = hasRole(message, CARGOS.STAFF_RG);

    const embed = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setDescription(
`━━━━━━━━━━━━━━━━━━━━
👤 Nome: ${rg.nome}
🆔 RG: ${rg.rg}
💍 Estado Civil: ${rg.estadoCivil}
🎂 Idade: ${rg.idade}
📄 CPF: ${completo ? rg.cpf : "🔒 Protegido"}
⚧ Gênero: ${rg.genero}
✅ Status: ${rg.status}
📅 Validade: ${rg.validade}
🚔 CNH: ${rg.cnh}
📋 Antecedentes: ${rg.antecedentes}`
      );

    return message.reply({ embeds: [embed] });
  }

  // ====== MULTA ======
  if (cmd === "multa") {
    if (!hasRole(message, CARGOS.POLICIA)) return;
    const user = message.mentions.users.first();
    const valor = Number(rest[1]);
    if (!user || !valor) return;

    economy["governo"] = (economy["governo"] || 0) + valor;
    save(FILES.economy, economy);

    logEmbed(message.guild, "POLICIA",
      new EmbedBuilder().setTitle("🚔 Multa Aplicada")
      .setDescription(`👤 ${user.tag}\n💰 Valor: ${valor}`)
    );

    message.reply("✅ Multa aplicada.");
  }

  // ====== MANDADOS ======
  if (cmd === "addmandado") {
    if (!hasRole(message, CARGOS.POLICIA)) return;
    const user = message.mentions.users.first();
    mandados[user.id] = true;
    save(FILES.mandados, mandados);
    message.reply("📄 Mandado registrado.");
  }

  if (cmd === "mandosativos") {
    return message.reply(`📋 Mandados ativos: ${Object.keys(mandados).length}`);
  }

  if (cmd === "removermandado") {
    if (!hasRole(message, CARGOS.POLICIA)) return;
    const user = message.mentions.users.first();
    delete mandados[user.id];
    save(FILES.mandados, mandados);
    message.reply("🗑️ Mandado removido.");
  }

  // ====== GOVERNO ======
  if (cmd === "sitio") {
    if (!hasRole(message, CARGOS.GOVERNADOR)) return;
    logEmbed(message.guild, "GOVERNO",
      new EmbedBuilder().setTitle("🚨 Estado de Sítio Declarado")
    );
    message.reply("🚨 Estado de sítio ativo.");
  }

});

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.login(process.env.TOKEN);
