// ================= IMPORTS & CLIENT =================
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!";

// ================= CARGOS =================
const CARGOS = {
  FUNDADOR: "Fundador",
  GERENTE: "Gerente de Comunidade",
  MONITOR: "Monitor",
  POLICIA: "Polícia",
  JUIZ: "Juiz",
};

// ================= FUNÇÕES =================
function load(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  return JSON.parse(fs.readFileSync(file));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function hasCargo(member, ...cargos) {
  return cargos.some((cargo) => member.roles.cache.some((r) => r.name === cargo));
}

function gerarCPF() {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
}

function log(guild, canal, titulo, desc, cor = "Blue") {
  const c = guild.channels.cache.find((ch) => ch.name === canal);
  if (!c) return;
  const e = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(desc)
    .setColor(cor)
    .setTimestamp();
  c.send({ embeds: [e] });
}

// ================= DATABASE =================
let rgs = load("./data/rgs.json");
let processos = load("./data/processos.json");

// ================= READY =================
client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// ================= COMMAND HANDLER =================
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(1).split(" ");
  const cmd = args.shift().toLowerCase();
  const user = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user;

  // ================= RG =================
  if (cmd === "setrg") {
    const text = args.join(" ").split(";");
    if (text.length < 4)
      return message.reply("❌ Use: !setrg Nome;Estado Civil;DD/MM/AAAA;Gênero");

    const idade = new Date().getFullYear() - parseInt(text[2].split("/")[2]);
    rgs[message.author.id] = {
      nome: text[0],
      estado: text[1],
      nascimento: text[2],
      idade,
      genero: text[3],
      cpf: gerarCPF(),
      status: "Válido",
    };
    save("./data/rgs.json", rgs);

    const emb = new EmbedBuilder()
      .setTitle("🪪 RG Criado")
      .setColor("Green")
      .setDescription(
        `👤 Nome: ${text[0]}\n💍 Estado Civil: ${text[1]}\n🎂 Nascimento: ${text[2]}\n⚧ Gênero: ${text[3]}\n📄 CPF: ${rgs[message.author.id].cpf}\n✅ Status: Válido`
      )
      .setTimestamp();
    message.channel.send({ embeds: [emb] });
  }

  if (cmd === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG.");

    const emb = new EmbedBuilder()
      .setTitle("🪪 Seu RG")
      .setColor("Blue")
      .setDescription(
        `👤 Nome: ${rg.nome}\n🆔 RG: ${message.author.id}\n💍 Estado Civil: ${rg.estado}\n🎂 Nascimento: ${rg.nascimento}\n⚧ Gênero: ${rg.genero}\n📄 CPF: ${rg.cpf}\n✅ Status: ${rg.status}`
      )
      .setTimestamp();
    message.channel.send({ embeds: [emb] });
  }

  if (cmd === "consultar") {
    if (!user && !args[0]) return message.reply("❌ Informe um usuário ou CPF");
    if (
      !hasCargo(
        message.member,
        CARGOS.FUNDADOR,
        CARGOS.GERENTE,
        CARGOS.MONITOR,
        CARGOS.POLICIA,
        CARGOS.JUIZ
      )
    )
      return message.reply("❌ Sem permissão");

    let alvo = user ? rgs[user.id] : Object.values(rgs).find((r) => r.cpf === args[0]);
    if (!alvo) return message.reply("❌ RG/CPF não encontrado");

    const emb = new EmbedBuilder()
      .setTitle("🔍 Consulta de RG")
      .setColor("Purple")
      .setDescription(
        `👤 Nome: ${alvo.nome}\n🆔 RG: ${user ? user.id : "Desconhecido"}\n📄 CPF: ${alvo.cpf}\n💍 Estado Civil: ${alvo.estado}\n🎂 Nascimento: ${alvo.nascimento}\n⚧ Gênero: ${alvo.genero}\n✅ Status: ${alvo.status}`
      )
      .setTimestamp();
    message.channel.send({ embeds: [emb] });
  }

  // ================= JUDICIÁRIO =================
  if (cmd === "abrirprocesso") {
    if (!hasCargo(message.member, CARGOS.JUIZ))
      return message.reply("❌ Apenas Juiz pode abrir processos");
    if (!user) return message.reply("❌ Mencione um usuário");

    processos[user.id] = { juiz: message.author.tag, status: "Aberto" };
    save("./data/processos.json", processos);

    log(
      message.guild,
      "logs-judiciario",
      "⚖️ Processo aberto",
      `Usuário: ${user.tag}\nJuiz: ${message.author.tag}`,
      "Yellow"
    );
    message.reply(`⚖️ Processo aberto para ${user.tag}`);
  }

  if (cmd === "encerrarprocesso") {
    if (!hasCargo(message.member, CARGOS.JUIZ))
      return message.reply("❌ Apenas Juiz pode encerrar processos");
    if (!user || !processos[user.id])
      return message.reply("❌ Usuário não possui processo aberto");

    processos[user.id].status = "Encerrado";
    save("./data/processos.json", processos);

    log(
      message.guild,
      "logs-judiciario",
      "⚖️ Processo encerrado",
      `Usuário: ${user.tag}\nJuiz: ${message.author.tag}`,
      "Green"
    );
    message.reply(`✅ Processo de ${user.tag} encerrado`);
  }

  if (cmd === "invalidarrg") {
    if (!hasCargo(message.member, CARGOS.JUIZ))
      return message.reply("❌ Apenas Juiz pode invalidar RG");
    if (!user || !rgs[user.id])
      return message.reply("❌ Usuário não possui RG");

    rgs[user.id].status = "Inválido";
    save("./data/rgs.json", rgs);
    message.reply(`❌ RG de ${user.tag} invalidado`);
  }

  if (cmd === "regularizarrg") {
    if (!hasCargo(message.member, CARGOS.JUIZ))
      return message.reply("❌ Apenas Juiz pode regularizar RG");
    if (!user || !rgs[user.id])
      return message.reply("❌ Usuário não possui RG");

    rgs[user.id].status = "Válido";
    save("./data/rgs.json", rgs);
    message.reply(`✅ RG de ${user.tag} regularizado`);
  }

  // ================= AJUDA =================
  if (cmd === "ajuda") {
    message.reply(`
🪪 RG: !setrg !rg !consultar
⚖️ Judiciário: !abrirprocesso !encerrarprocesso !invalidarrg !regularizarrg
`);
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
