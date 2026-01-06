// ------------------------------
// BOT DE RG ROLEPLAY
// ------------------------------

// Imports
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

// Criação do client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Variáveis globais
const PREFIX = "!";
const RG_FILE = "./rgs.json";
const CARGOS_AUTORIZADOS = ["STAFF", "ADMIN", "MOD"]; // cargos autorizados

// ------------------------------
// Funções utilitárias
// ------------------------------

function gerarNumero19() {
  let num = "";
  for (let i = 0; i < 19; i++) {
    num += Math.floor(Math.random() * 10);
  }
  return num;
}

function gerarCPF() {
  let cpf = gerarNumero19();
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{10})$/, "$1.$2.$3.$4");
}

function carregarRGs() {
  if (!fs.existsSync(RG_FILE)) fs.writeFileSync(RG_FILE, "{}");
  return JSON.parse(fs.readFileSync(RG_FILE));
}

function salvarRGs(data) {
  fs.writeFileSync(RG_FILE, JSON.stringify(data, null, 2));
}

function calcularIdade(dataNascimento) {
  const [dia, mes, ano] = dataNascimento.split("/").map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) {
    idade--;
  }
  return idade;
}

// ------------------------------
// Eventos do bot
// ------------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const rgs = carregarRGs();
  const content = message.content.slice(PREFIX.length).trim();
  const split = content.split(" ");
  const comando = split.shift().toLowerCase();

  // ------------------------------
  // !setrg - criar RG
  // ------------------------------
  if (comando === "setrg") {
    if (rgs[message.author.id])
      return message.reply("❌ Você já possui um RG registrado.");

    if (split.length < 4)
      return message.reply(
        "❌ Uso correto:\n`!setrg Nome Completo EstadoCivil DD/MM/AAAA Gênero`"
      );

    // Considera que o nome pode ter várias palavras
    const estadoCivilIndex = split.length - 3; // últimos 3 são: EstadoCivil, Data, Gênero
    const nome = split.slice(0, estadoCivilIndex).join(" ");
    const estadoCivil = split[estadoCivilIndex];
    const nascimento = split[estadoCivilIndex + 1];
    const genero = split[estadoCivilIndex + 2];

    const idade = calcularIdade(nascimento);
    if (idade < 0 || idade > 120) return message.reply("❌ Data de nascimento inválida.");

    const rg = {
      rg: gerarNumero19(),
      nome: nome,
      estadoCivil: estadoCivil,
      nascimento: nascimento,
      genero: genero,
      idade: idade,
      cpf: gerarCPF()
    };

    rgs[message.author.id] = rg;
    salvarRGs(rgs);
    return message.reply("✅ **RG criado com sucesso!** Use `!rg` para visualizar.");
  }

  // ------------------------------
  // !rg - ver RG
  // ------------------------------
  if (comando === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG.");

    const embed = new EmbedBuilder()
      .setColor("#1f2c34")
      .setTitle("🪪 CARTEIRA DE IDENTIDADE")
      .setDescription(
`━━━━━━━━━━━━━━━━━━━━
🆔 **RG Nº:** ${rg.rg}
━━━━━━━━━━━━━━━━━━━━`
      )
      .addFields(
        { name: "👤 Nome", value: rg.nome, inline: true },
        { name: "📄 CPF", value: rg.cpf, inline: true },
        { name: "💍 Estado Civil", value: rg.estadoCivil, inline: true },
        { name: "🎂 Nascimento", value: rg.nascimento, inline: true },
        { name: "⚧ Gênero", value: rg.genero, inline: true },
        { name: "🔢 Idade", value: `${rg.idade} anos`, inline: true }
      )
      .setFooter({ text: "Documento válido apenas para roleplay" })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }

  // ------------------------------
  // !rgdeletar - deletar RG (apenas cargos autorizados)
  // ------------------------------
  if (comando === "rgdeletar") {
    const possuiCargo = message.member.roles.cache.some(r =>
      CARGOS_AUTORIZADOS.includes(r.name)
    );
    if (!possuiCargo) return message.reply("❌ Você não tem permissão para usar este comando.");

    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mencione o usuário.");
    if (!rgs[user.id]) return message.reply("❌ Este usuário não possui RG.");

    delete rgs[user.id];
    salvarRGs(rgs);
    message.reply("🗑️ RG deletado com sucesso.");
  }
});

// ------------------------------
// LOGIN DO BOT (variável de ambiente TOKEN)
// ------------------------------
client.login(process.env.TOKEN);
