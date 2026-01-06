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

// Gera número aleatório de 19 dígitos
function gerarNumero19() {
  let num = "";
  for (let i = 0; i < 19; i++) {
    num += Math.floor(Math.random() * 10);
  }
  return num;
}

// Gera CPF formatado de 19 dígitos
function gerarCPF() {
  let cpf = gerarNumero19();
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{10})$/, "$1.$2.$3.$4");
}

// Carrega os RGs do arquivo JSON
function carregarRGs() {
  if (!fs.existsSync(RG_FILE)) fs.writeFileSync(RG_FILE, "{}");
  return JSON.parse(fs.readFileSync(RG_FILE));
}

// Salva os RGs no arquivo JSON
function salvarRGs(data) {
  fs.writeFileSync(RG_FILE, JSON.stringify(data, null, 2));
}

// Calcula a idade automaticamente a partir da data de nascimento
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

  const args = message.content.slice(PREFIX.length).split(";");
  const comando = args.shift().toLowerCase();
  const rgs = carregarRGs();

  // ------------------------------
  // !setrg - criar RG
  // ------------------------------
  if (comando === "setrg") {
    if (rgs[message.author.id])
      return message.reply("❌ Você já possui um RG registrado.");
    if (args.length < 4)
      return message.reply(
        "❌ Uso correto:\n`!setrg Nome Completo;Estado civil;DD/MM/AAAA;Gênero`"
      );

    const idade = calcularIdade(args[2]);
    if (idade < 0 || idade > 120) return message.reply("❌ Data de nascimento inválida.");

    const rg = {
      rg: gerarNumero19(),
      nome: args[0],
      estadoCivil: args[1],
      nascimento: args[2],
      genero: args[3],
      idade: idade,
      cpf: gerarCPF()
    };

    rgs[message.author.id] = rg;
    salvarRGs(rgs);
    message.reply("✅ **RG criado com sucesso!** Use `!rg` para visualizar.");
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
// LOGIN DO BOT (use variável de ambiente TOKEN)
// ------------------------------
client.login(process.env.TOKEN);
