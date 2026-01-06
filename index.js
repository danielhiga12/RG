const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

/* ================== CLIENT ================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ["CHANNEL"]
});

const PREFIX = "!";

/* ================== ARQUIVOS ================== */
const FILES = {
  rg: "./rgs.json",
  economia: "./economia.json",
  policia: "./policia.json"
};

for (const f of Object.values(FILES)) {
  if (!fs.existsSync(f)) fs.writeFileSync(f, "{}");
}

function load(file) {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    fs.writeFileSync(file, "{}");
    return {};
  }
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ================== PERMISSÕES ================== */
const POLICIA = [
  "POLICIA CIVIL",
  "POLICIA MILITAR",
  "POLICIA FEDERAL",
  "PRF",
  "POLICIA DO EXÉRCITO"
];

function hasRole(member, roles) {
  return member.roles.cache.some(r => roles.includes(r.name));
}

/* ================== UTIL ================== */
function gerarNumero19() {
  let n = "";
  for (let i = 0; i < 19; i++) n += Math.floor(Math.random() * 10);
  return n;
}

function gerarCPF() {
  const n = gerarNumero19();
  return n.replace(/^(\d{3})(\d{3})(\d{3})(\d{10})$/, "$1.$2.$3.$4");
}

function idade(data) {
  const [d, m, a] = data.split("/").map(Number);
  const hoje = new Date();
  let i = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) i--;
  return i;
}

/* ================== READY ================== */
client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

/* ================== COMANDOS ================== */
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(" ");
  const cmd = args.shift().toLowerCase();

  const rgs = load(FILES.rg);
  const economia = load(FILES.economia);
  const policia = load(FILES.policia);

  /* ========== AJUDA (DM) ========== */
  if (cmd === "ajuda") {
    const embed = new EmbedBuilder()
      .setColor("#1f2c34")
      .setTitle("📘 AJUDA – LAGUNA ROLEPLAY")
      .setDescription(`
🪪 **RG**
!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero
!rg

💰 **Economia**
!saldo
!pix @user valor

🚓 **Polícia**
!prender @user tempo motivo
!soltar @user
!multar @user valor motivo
!cassarcnh @user motivo
!antecedentes @user
      `);

    return message.author.send({ embeds: [embed] });
  }

  /* ========== SETRG ========== */
  if (cmd === "setrg") {
    const dados = message.content.slice(7).split(";");
    if (dados.length < 4)
      return message.reply("❌ Use: `!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero`");

    if (rgs[message.author.id])
      return message.reply("❌ Você já possui RG.");

    const idd = idade(dados[2]);
    if (idd < 0 || idd > 120)
      return message.reply("❌ Data inválida.");

    rgs[message.author.id] = {
      nome: dados[0],
      estadoCivil: dados[1],
      nascimento: dados[2],
      genero: dados[3],
      idade: idd,
      rg: gerarNumero19(),
      cpf: gerarCPF(),
      validade: Date.now() + 31536000000,
      cnh: { status: "VÁLIDA" }
    };

    economia[message.author.id] = { saldo: 1000 };

    save(FILES.rg, rgs);
    save(FILES.economia, economia);

    return message.reply("✅ RG criado com sucesso.");
  }

  /* ========== RG ========== */
  if (cmd === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG.");

    const embed = new EmbedBuilder()
      .setTitle("🪪 CARTEIRA DE IDENTIDADE")
      .setColor("#1f2c34")
      .addFields(
        { name: "Nome", value: rg.nome, inline: true },
        { name: "RG", value: rg.rg, inline: true },
        { name: "CPF", value: rg.cpf, inline: true },
        { name: "CNH", value: rg.cnh.status, inline: true },
        { name: "Validade", value: new Date(rg.validade).toLocaleDateString(), inline: true }
      );

    return message.reply({ embeds: [embed] });
  }

  /* ========== SALDO ========== */
  if (cmd === "saldo") {
    if (!economia[message.author.id])
      economia[message.author.id] = { saldo: 0 };

    save(FILES.economia, economia);
    return message.reply(`💰 Seu saldo: **R$ ${economia[message.author.id].saldo}**`);
  }

  /* ========== PIX ========== */
  if (cmd === "pix") {
    const user = message.mentions.users.first();
    const valor = parseInt(args[1]);
    if (!user || isNaN(valor) || valor <= 0)
      return message.reply("❌ Use: `!pix @user valor`");

    if (economia[message.author.id].saldo < valor)
      return message.reply("❌ Saldo insuficiente.");

    economia[message.author.id].saldo -= valor;
    economia[user.id] = economia[user.id] || { saldo: 0 };
    economia[user.id].saldo += valor;

    save(FILES.economia, economia);
    return message.reply("✅ PIX realizado.");
  }

  /* ========== PRISÃO ========== */
  if (cmd === "prender") {
    if (!hasRole(message.member, POLICIA))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    const tempo = args[1];
    const motivo = args.slice(2).join(" ");

    if (!user || !tempo || !motivo)
      return message.reply("❌ Use: `!prender @user tempo motivo`");

    policia[user.id] = policia[user.id] || { historico: [] };
    policia[user.id].historico.push({
      tipo: "PRISÃO",
      motivo,
      tempo,
      data: new Date().toLocaleString()
    });

    save(FILES.policia, policia);
    return message.reply(`🚓 ${user.tag} foi preso.`);
  }

  /* ========== MULTA ========== */
  if (cmd === "multar") {
    if (!hasRole(message.member, POLICIA))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    const valor = parseInt(args[1]);
    const motivo = args.slice(2).join(" ");

    if (!user || isNaN(valor) || !motivo)
      return message.reply("❌ Use: `!multar @user valor motivo`");

    economia[user.id] = economia[user.id] || { saldo: 0 };
    economia[user.id].saldo -= valor;

    save(FILES.economia, economia);
    return message.reply(`💸 Multa aplicada: R$ ${valor}`);
  }

  /* ========== CASSAR CNH ========== */
  if (cmd === "cassarcnh") {
    if (!hasRole(message.member, POLICIA))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    const motivo = args.join(" ");

    if (!user || !rgs[user.id])
      return message.reply("❌ Usuário inválido.");

    rgs[user.id].cnh.status = "CASSADA";
    save(FILES.rg, rgs);

    return message.reply("🚫 CNH cassada.");
  }

  /* ========== ANTECEDENTES ========== */
  if (cmd === "antecedentes") {
    if (!hasRole(message.member, POLICIA))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    if (!user || !policia[user.id])
      return message.reply("✅ Nenhum antecedente.");

    const lista = policia[user.id].historico
      .map(h => `• ${h.tipo} | ${h.motivo}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("📄 ANTECEDENTES")
      .setDescription(lista || "Nenhum");

    return message.reply({ embeds: [embed] });
  }
});

/* ================== LOGIN ================== */
client.login(process.env.TOKEN);
require("./server");

